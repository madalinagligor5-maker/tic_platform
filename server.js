'use strict';
// Platforma TIC Gimnaziu – server fără dependențe (doar module Node.js încorporate).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MAP, LESSONS, UNITS } = require('./content/curriculum');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const LESSON_DIR = path.join(__dirname, 'content', 'lectii');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

// ---------- Stocare (fișier JSON, scriere atomică) ----------
function emptyDb() {
  return { teachers: [], classes: [], students: [], progress: {}, sessions: {} };
}
let db = emptyDb();
function load() {
  try {
    db = { ...emptyDb(), ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// ---------- Utilitare criptografice ----------
function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
function checkSecret(secret, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(secret, salt, 32);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}
const id = () => crypto.randomUUID();
// Fără caractere ușor de confundat (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomCode(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return s;
}
function uniqueClassCode() {
  let c;
  do c = randomCode(6); while (db.classes.some((k) => k.code === c));
  return c;
}
const randomPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

// ---------- Sesiuni ----------
function createSession(role, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = { role, userId, expires: Date.now() + SESSION_TTL_MS };
  return token;
}
function getSession(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const s = db.sessions[m[1]];
  if (!s) return null;
  if (s.expires < Date.now()) {
    delete db.sessions[m[1]];
    return null;
  }
  return { ...s, token: m[1] };
}
function pruneSessions() {
  const now = Date.now();
  for (const [t, s] of Object.entries(db.sessions)) if (s.expires < now) delete db.sessions[t];
}

// ---------- HTTP helpers ----------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : headers['Content-Type'] || 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'",
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024) {
        reject(new HttpError(413, 'Cerere prea mare'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSON invalid'));
      }
    });
    req.on('error', reject);
  });
}
function str(v, name, min, max) {
  if (typeof v !== 'string') throw new HttpError(400, `Câmpul „${name}” lipsește`);
  const t = v.trim();
  if (t.length < min || t.length > max) throw new HttpError(400, `Câmpul „${name}” trebuie să aibă ${min}–${max} caractere`);
  return t;
}
function requireRole(req, role) {
  const s = getSession(req);
  if (!s || s.role !== role) throw new HttpError(401, 'Autentificare necesară');
  return s;
}
function ownClass(teacherId, classId) {
  const k = db.classes.find((c) => c.id === classId && c.teacherId === teacherId);
  if (!k) throw new HttpError(404, 'Clasa nu există');
  return k;
}
function isLocked(rec) {
  return rec.lockedUntil && rec.lockedUntil > Date.now();
}
function registerFail(rec) {
  rec.fails = (rec.fails || 0) + 1;
  if (rec.fails >= MAX_FAILS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.fails = 0;
  }
}

// ---------- Vederea elevului asupra hărții ----------
function studentMap(student) {
  const klass = db.classes.find((c) => c.id === student.classId);
  const grade = MAP[klass.grade];
  const prog = db.progress[student.id] || {};
  const unlocked = new Set([...klass.unlockedUnits, ...(student.unlockedUnits || [])]);
  return {
    clasa: { nume: klass.name, grade: klass.grade, titlu: grade.titlu },
    elev: { pseudonim: student.pseudonym },
    unitati: grade.unitati.map((u) => ({
      id: u.id,
      titlu: u.titlu,
      competente: u.competente,
      deblocata: unlocked.has(u.id),
      module: u.module.map((m) => ({
        id: m.id,
        titlu: m.titlu,
        lectii: m.lectii.map((l) => ({ id: l.id, titlu: l.titlu, status: prog[l.id] || 'nou' })),
      })),
    })),
  };
}
function canSeeLesson(student, lesson) {
  const klass = db.classes.find((c) => c.id === student.classId);
  if (lesson.grade !== klass.grade) return false;
  return klass.unlockedUnits.includes(lesson.unitId) || (student.unlockedUnits || []).includes(lesson.unitId);
}
function lessonContent(lessonId) {
  const file = path.join(LESSON_DIR, `${lessonId}.md`);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

// ---------- Rute API ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

route('GET', /^\/api\/curriculum$/, () => MAP);

route('POST', /^\/api\/teacher\/register$/, async (req) => {
  const b = await readJson(req);
  const name = str(b.name, 'nume', 2, 80);
  const username = str(b.username, 'utilizator', 3, 40).toLowerCase();
  const password = str(b.password, 'parolă', 8, 200);
  if (!/^[a-z0-9._-]+$/.test(username)) throw new HttpError(400, 'Utilizatorul poate conține doar litere, cifre, . _ -');
  if (db.teachers.some((t) => t.username === username)) throw new HttpError(409, 'Utilizatorul există deja');
  const t = { id: id(), name, username, passHash: hashSecret(password), createdAt: new Date().toISOString() };
  db.teachers.push(t);
  const token = createSession('teacher', t.id);
  save();
  return { token, profesor: { name, username } };
});

route('POST', /^\/api\/teacher\/login$/, async (req) => {
  const b = await readJson(req);
  const username = str(b.username, 'utilizator', 1, 40).toLowerCase();
  const password = str(b.password, 'parolă', 1, 200);
  const t = db.teachers.find((x) => x.username === username);
  if (t && isLocked(t)) throw new HttpError(429, 'Prea multe încercări. Încearcă peste 15 minute.');
  if (!t || !checkSecret(password, t.passHash)) {
    if (t) registerFail(t), save();
    throw new HttpError(401, 'Utilizator sau parolă greșite');
  }
  t.fails = 0;
  const token = createSession('teacher', t.id);
  save();
  return { token, profesor: { name: t.name, username: t.username } };
});

route('POST', /^\/api\/logout$/, (req) => {
  const s = getSession(req);
  if (s) delete db.sessions[s.token], save();
  return { ok: true };
});

route('GET', /^\/api\/teacher\/classes$/, (req) => {
  const s = requireRole(req, 'teacher');
  return db.classes
    .filter((c) => c.teacherId === s.userId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      code: c.code,
      elevi: db.students.filter((st) => st.classId === c.id).length,
    }));
});

route('POST', /^\/api\/teacher\/classes$/, async (req) => {
  const s = requireRole(req, 'teacher');
  const b = await readJson(req);
  const name = str(b.name, 'nume clasă', 1, 40);
  const grade = Number(b.grade);
  if (!MAP[grade]) throw new HttpError(400, 'Clasa trebuie să fie 5, 6, 7 sau 8');
  const unitCodes = {};
  for (const u of MAP[grade].unitati) unitCodes[u.id] = randomCode(5);
  const k = { id: id(), teacherId: s.userId, name, grade, code: uniqueClassCode(), joinOpen: true, unlockedUnits: [MAP[grade].unitati[0].id], unitCodes, createdAt: new Date().toISOString() };
  db.classes.push(k);
  save();
  return { id: k.id, name, grade, code: k.code };
});

route('GET', /^\/api\/teacher\/classes\/([\w-]+)$/, (req, [, classId]) => {
  const s = requireRole(req, 'teacher');
  const k = ownClass(s.userId, classId);
  const lessonIds = [...LESSONS.values()].filter((l) => l.grade === k.grade).map((l) => l.id);
  return {
    id: k.id,
    name: k.name,
    grade: k.grade,
    code: k.code,
    joinOpen: k.joinOpen,
    unitati: MAP[k.grade].unitati.map((u) => ({ id: u.id, titlu: u.titlu, deblocata: k.unlockedUnits.includes(u.id), cod: k.unitCodes[u.id] })),
    elevi: db.students
      .filter((st) => st.classId === k.id)
      .map((st) => {
        const p = db.progress[st.id] || {};
        return {
          id: st.id,
          pseudonim: st.pseudonym,
          finalizate: lessonIds.filter((l) => p[l] === 'finalizat').length,
          inLucru: lessonIds.filter((l) => p[l] === 'in_lucru').length,
          blocat: isLocked(st),
        };
      }),
    totalLectii: lessonIds.length,
  };
});

route('POST', /^\/api\/teacher\/classes\/([\w-]+)\/unlock$/, async (req, [, classId]) => {
  const s = requireRole(req, 'teacher');
  const k = ownClass(s.userId, classId);
  const b = await readJson(req);
  const u = UNITS.get(b.unitId);
  if (!u || !b.unitId.startsWith(`${k.grade}.`)) throw new HttpError(400, 'Unitate invalidă');
  const set = new Set(k.unlockedUnits);
  b.deblocata ? set.add(u.id) : set.delete(u.id);
  k.unlockedUnits = [...set];
  save();
  return { ok: true, unlockedUnits: k.unlockedUnits };
});

route('POST', /^\/api\/teacher\/classes\/([\w-]+)\/join$/, async (req, [, classId]) => {
  const s = requireRole(req, 'teacher');
  const k = ownClass(s.userId, classId);
  const b = await readJson(req);
  k.joinOpen = Boolean(b.joinOpen);
  save();
  return { ok: true, joinOpen: k.joinOpen };
});

route('POST', /^\/api\/teacher\/students\/([\w-]+)\/reset-pin$/, (req, [, studentId]) => {
  const s = requireRole(req, 'teacher');
  const st = db.students.find((x) => x.id === studentId);
  if (!st) throw new HttpError(404, 'Elevul nu există');
  ownClass(s.userId, st.classId);
  const pin = randomPin();
  st.pinHash = hashSecret(pin);
  st.fails = 0;
  st.lockedUntil = 0;
  // Delogăm sesiunile vechi ale elevului.
  for (const [t, sess] of Object.entries(db.sessions)) if (sess.role === 'student' && sess.userId === st.id) delete db.sessions[t];
  save();
  return { pin };
});

route('DELETE', /^\/api\/teacher\/students\/([\w-]+)$/, (req, [, studentId]) => {
  const s = requireRole(req, 'teacher');
  const st = db.students.find((x) => x.id === studentId);
  if (!st) throw new HttpError(404, 'Elevul nu există');
  ownClass(s.userId, st.classId);
  db.students = db.students.filter((x) => x.id !== studentId);
  delete db.progress[studentId];
  for (const [t, sess] of Object.entries(db.sessions)) if (sess.userId === studentId) delete db.sessions[t];
  save();
  return { ok: true };
});

// Elevul intră cu cod de clasă + pseudonim + PIN. Prima intrare (dacă înscrierea e deschisă) creează contul.
route('POST', /^\/api\/student\/login$/, async (req) => {
  const b = await readJson(req);
  const code = str(b.classCode, 'cod clasă', 4, 10).toUpperCase();
  const pseudonym = str(b.pseudonym, 'pseudonim', 2, 24);
  const pin = str(b.pin, 'PIN', 4, 4);
  if (!/^\d{4}$/.test(pin)) throw new HttpError(400, 'PIN-ul are exact 4 cifre');
  if (!/^[\p{L}\p{N} _-]+$/u.test(pseudonym)) throw new HttpError(400, 'Pseudonimul poate conține doar litere, cifre, spațiu, _ și -');
  const k = db.classes.find((c) => c.code === code);
  if (!k) throw new HttpError(401, 'Cod de clasă, pseudonim sau PIN greșit');
  let st = db.students.find((x) => x.classId === k.id && x.pseudonym.toLowerCase() === pseudonym.toLowerCase());
  let created = false;
  if (!st) {
    if (!k.joinOpen) throw new HttpError(403, 'Înscrierea în această clasă este închisă. Cere ajutorul profesorului.');
    st = { id: id(), classId: k.id, pseudonym, pinHash: hashSecret(pin), unlockedUnits: [], createdAt: new Date().toISOString() };
    db.students.push(st);
    created = true;
  } else {
    if (isLocked(st)) throw new HttpError(429, 'Prea multe încercări greșite. Cere profesorului să-ți reseteze PIN-ul sau așteaptă 15 minute.');
    if (!checkSecret(pin, st.pinHash)) {
      registerFail(st);
      save();
      throw new HttpError(401, 'Cod de clasă, pseudonim sau PIN greșit');
    }
    st.fails = 0;
  }
  const token = createSession('student', st.id);
  save();
  return { token, created, pseudonim: st.pseudonym };
});

function currentStudent(req) {
  const s = requireRole(req, 'student');
  const st = db.students.find((x) => x.id === s.userId);
  if (!st) throw new HttpError(401, 'Autentificare necesară');
  return st;
}

route('GET', /^\/api\/student\/map$/, (req) => studentMap(currentStudent(req)));

// Elevul poate debloca singur o unitate cu codul primit de la profesor.
route('POST', /^\/api\/student\/unlock$/, async (req) => {
  const st = currentStudent(req);
  const b = await readJson(req);
  const code = str(b.code, 'cod unitate', 3, 10).toUpperCase();
  const k = db.classes.find((c) => c.id === st.classId);
  const unitId = Object.keys(k.unitCodes).find((u) => k.unitCodes[u] === code);
  if (!unitId) throw new HttpError(400, 'Cod de unitate invalid');
  st.unlockedUnits = [...new Set([...(st.unlockedUnits || []), unitId])];
  save();
  return { ok: true, unitId, titlu: UNITS.get(unitId).titlu };
});

route('GET', /^\/api\/student\/lesson\/([\d.]+)$/, (req, [, lessonId]) => {
  const st = currentStudent(req);
  const l = LESSONS.get(lessonId);
  if (!l || !canSeeLesson(st, l)) throw new HttpError(404, 'Lecția nu există sau nu este încă deblocată');
  const prog = db.progress[st.id] || {};
  return { ...l, status: prog[l.id] || 'nou', continut: lessonContent(l.id) };
});

route('POST', /^\/api\/student\/progress$/, async (req) => {
  const st = currentStudent(req);
  const b = await readJson(req);
  const l = LESSONS.get(b.lessonId);
  if (!l || !canSeeLesson(st, l)) throw new HttpError(404, 'Lecția nu există sau nu este încă deblocată');
  if (!['nou', 'in_lucru', 'finalizat'].includes(b.status)) throw new HttpError(400, 'Status invalid');
  db.progress[st.id] = { ...(db.progress[st.id] || {}), [l.id]: b.status };
  save();
  return { ok: true };
});

// ---------- Fișiere statice ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Interzis');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Negăsit');
    send(res, 200, buf, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  });
}

// ---------- Server ----------
function handler(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Metodă nepermisă');
    return serveStatic(req, res, pathname);
  }
  const r = routes.find((x) => x.method === req.method && x.pattern.test(pathname));
  if (!r) return send(res, 404, { error: 'Rută inexistentă' });
  Promise.resolve()
    .then(() => r.handler(req, pathname.match(r.pattern)))
    .then((body) => send(res, 200, body))
    .catch((e) => {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'Eroare internă' });
    });
}

function start(port = PORT) {
  load();
  pruneSessions();
  const server = http.createServer(handler);
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  start().then((s) => console.log(`Platforma TIC rulează pe http://localhost:${s.address().port}`));
}

module.exports = { start };

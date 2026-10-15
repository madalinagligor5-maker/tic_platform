'use strict';
// Logica platformei (API + fișiere statice), independentă de locul unde rulează:
// server.js o folosește local, api/index.js o folosește pe Vercel.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MAP, LESSONS, UNITS } = require('../content/curriculum');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const LESSON_DIR = path.join(__dirname, '..', 'content', 'lectii');
const SESSION_TTL_S = 12 * 60 * 60;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

// Schema cheilor:
//   teacher:<id>  teacherByUser:<username> → id  teacherClasses:<id> {classId}
//   class:<id>    classByCode:<cod> → id         classStudents:<id> {studentId}
//   student:<id>  studentByName:<classId>:<pseudonim> → id
//   progress:<studentId> {lessonId → status}
//   session:<token> (cu expirare)  userSessions:<userId> {token}

// ---------- Utilitare ----------
function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(secret, salt, 32).toString('hex')}`;
}
function checkSecret(secret, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.timingSafeEqual(crypto.scryptSync(secret, salt, 32), Buffer.from(hash, 'hex'));
}
const newId = () => crypto.randomUUID();
// Fără caractere ușor de confundat (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomCode(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return s;
}
const randomPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
const nameKey = (classId, pseudonym) => `studentByName:${classId}:${pseudonym.toLowerCase()}`;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'",
};
function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    ...SECURITY_HEADERS,
    ...(isJson ? { 'Cache-Control': 'no-store' } : {}),
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}
function readJson(req) {
  // Unele platforme (ex. Vercel) au citit deja corpul cererii; Vercel aruncă eroare la JSON invalid.
  let preParsed;
  try {
    preParsed = req.body;
  } catch {
    return Promise.reject(new HttpError(400, 'JSON invalid'));
  }
  if (preParsed !== undefined) {
    req = { body: preParsed };
    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    try {
      const s = req.body.toString();
      return Promise.resolve(s ? JSON.parse(s) : {});
    } catch {
      return Promise.reject(new HttpError(400, 'JSON invalid'));
    }
  }
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
const isLocked = (rec) => rec.lockedUntil && rec.lockedUntil > Date.now();
function registerFail(rec) {
  rec.fails = (rec.fails || 0) + 1;
  if (rec.fails >= MAX_FAILS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.fails = 0;
  }
}
function lessonContent(lessonId) {
  try {
    return fs.readFileSync(path.join(LESSON_DIR, `${lessonId}.md`), 'utf8');
  } catch {
    return null;
  }
}

function createHandler(kv) {
  // ---------- Sesiuni ----------
  async function createSession(role, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await kv.set(`session:${token}`, { role, userId }, { ex: SESSION_TTL_S });
    await kv.sadd(`userSessions:${userId}`, token);
    return token;
  }
  async function endSessions(userId) {
    const tokens = await kv.smembers(`userSessions:${userId}`);
    await kv.del(`userSessions:${userId}`, ...tokens.map((t) => `session:${t}`));
  }
  async function requireRole(req, role) {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
    const s = m && (await kv.get(`session:${m[1]}`));
    if (!s || s.role !== role) throw new HttpError(401, 'Autentificare necesară');
    return { ...s, token: m[1] };
  }
  async function ownClass(teacherId, classId) {
    const k = await kv.get(`class:${classId}`);
    if (!k || k.teacherId !== teacherId) throw new HttpError(404, 'Clasa nu există');
    return k;
  }
  async function currentStudent(req) {
    const s = await requireRole(req, 'student');
    const st = await kv.get(`student:${s.userId}`);
    if (!st) throw new HttpError(401, 'Autentificare necesară');
    const klass = await kv.get(`class:${st.classId}`);
    if (!klass) throw new HttpError(401, 'Autentificare necesară');
    return { st, klass };
  }
  const canSee = (st, klass, lesson) =>
    lesson.grade === klass.grade && (klass.unlockedUnits.includes(lesson.unitId) || (st.unlockedUnits || []).includes(lesson.unitId));

  // ---------- Rute ----------
  const routes = [];
  const route = (method, pattern, fn) => routes.push({ method, pattern, fn });

  route('GET', /^\/api\/curriculum$/, async () => MAP);

  route('POST', /^\/api\/teacher\/register$/, async (req) => {
    const b = await readJson(req);
    const name = str(b.name, 'nume', 2, 80);
    const username = str(b.username, 'utilizator', 3, 40).toLowerCase();
    const password = str(b.password, 'parolă', 8, 200);
    if (!/^[a-z0-9._-]+$/.test(username)) throw new HttpError(400, 'Utilizatorul poate conține doar litere, cifre, . _ -');
    const id = newId();
    if (!(await kv.set(`teacherByUser:${username}`, id, { nx: true }))) throw new HttpError(409, 'Utilizatorul există deja');
    await kv.set(`teacher:${id}`, { id, name, username, passHash: hashSecret(password), createdAt: new Date().toISOString() });
    return { token: await createSession('teacher', id), profesor: { name, username } };
  });

  route('POST', /^\/api\/teacher\/login$/, async (req) => {
    const b = await readJson(req);
    const username = str(b.username, 'utilizator', 1, 40).toLowerCase();
    const password = str(b.password, 'parolă', 1, 200);
    const id = await kv.get(`teacherByUser:${username}`);
    const t = id && (await kv.get(`teacher:${id}`));
    if (t && isLocked(t)) throw new HttpError(429, 'Prea multe încercări. Încearcă peste 15 minute.');
    if (!t || !checkSecret(password, t.passHash)) {
      if (t) registerFail(t), await kv.set(`teacher:${t.id}`, t);
      throw new HttpError(401, 'Utilizator sau parolă greșite');
    }
    if (t.fails) (t.fails = 0), await kv.set(`teacher:${t.id}`, t);
    return { token: await createSession('teacher', t.id), profesor: { name: t.name, username: t.username } };
  });

  route('POST', /^\/api\/logout$/, async (req) => {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
    if (m) await kv.del(`session:${m[1]}`);
    return { ok: true };
  });

  route('GET', /^\/api\/teacher\/classes$/, async (req) => {
    const s = await requireRole(req, 'teacher');
    const ids = await kv.smembers(`teacherClasses:${s.userId}`);
    const classes = (await kv.mget(ids.map((i) => `class:${i}`))).filter(Boolean);
    const counts = await Promise.all(classes.map((c) => kv.smembers(`classStudents:${c.id}`)));
    return classes
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => ({ id: c.id, name: c.name, grade: c.grade, code: c.code, elevi: counts[classes.indexOf(c)].length }));
  });

  route('POST', /^\/api\/teacher\/classes$/, async (req) => {
    const s = await requireRole(req, 'teacher');
    const b = await readJson(req);
    const name = str(b.name, 'nume clasă', 1, 40);
    const grade = Number(b.grade);
    if (!MAP[grade]) throw new HttpError(400, 'Clasa trebuie să fie 5, 6, 7 sau 8');
    const id = newId();
    let code;
    do code = randomCode(6);
    while (!(await kv.set(`classByCode:${code}`, id, { nx: true })));
    const unitCodes = {};
    for (const u of MAP[grade].unitati) unitCodes[u.id] = randomCode(5);
    const k = { id, teacherId: s.userId, name, grade, code, joinOpen: true, unlockedUnits: [MAP[grade].unitati[0].id], unitCodes, createdAt: new Date().toISOString() };
    await kv.set(`class:${id}`, k);
    await kv.sadd(`teacherClasses:${s.userId}`, id);
    return { id, name, grade, code };
  });

  route('GET', /^\/api\/teacher\/classes\/([\w-]+)$/, async (req, [, classId]) => {
    const s = await requireRole(req, 'teacher');
    const k = await ownClass(s.userId, classId);
    const lessonIds = [...LESSONS.values()].filter((l) => l.grade === k.grade).map((l) => l.id);
    const sids = await kv.smembers(`classStudents:${k.id}`);
    const students = (await kv.mget(sids.map((i) => `student:${i}`))).filter(Boolean);
    const progs = await Promise.all(students.map((st) => kv.hgetall(`progress:${st.id}`)));
    return {
      id: k.id,
      name: k.name,
      grade: k.grade,
      code: k.code,
      joinOpen: k.joinOpen,
      unitati: MAP[k.grade].unitati.map((u) => ({ id: u.id, titlu: u.titlu, deblocata: k.unlockedUnits.includes(u.id), cod: k.unitCodes[u.id] })),
      elevi: students
        .map((st, i) => ({
          id: st.id,
          pseudonim: st.pseudonym,
          finalizate: lessonIds.filter((l) => progs[i][l] === 'finalizat').length,
          inLucru: lessonIds.filter((l) => progs[i][l] === 'in_lucru').length,
          blocat: Boolean(isLocked(st)),
        }))
        .sort((a, b) => a.pseudonim.localeCompare(b.pseudonim, 'ro')),
      totalLectii: lessonIds.length,
    };
  });

  route('POST', /^\/api\/teacher\/classes\/([\w-]+)\/unlock$/, async (req, [, classId]) => {
    const s = await requireRole(req, 'teacher');
    const k = await ownClass(s.userId, classId);
    const b = await readJson(req);
    const u = typeof b.unitId === 'string' && UNITS.get(b.unitId);
    if (!u || !b.unitId.startsWith(`${k.grade}.`)) throw new HttpError(400, 'Unitate invalidă');
    const set = new Set(k.unlockedUnits);
    b.deblocata ? set.add(u.id) : set.delete(u.id);
    k.unlockedUnits = [...set];
    await kv.set(`class:${k.id}`, k);
    return { ok: true, unlockedUnits: k.unlockedUnits };
  });

  route('POST', /^\/api\/teacher\/classes\/([\w-]+)\/join$/, async (req, [, classId]) => {
    const s = await requireRole(req, 'teacher');
    const k = await ownClass(s.userId, classId);
    const b = await readJson(req);
    k.joinOpen = Boolean(b.joinOpen);
    await kv.set(`class:${k.id}`, k);
    return { ok: true, joinOpen: k.joinOpen };
  });

  async function teacherStudent(req, studentId) {
    const s = await requireRole(req, 'teacher');
    const st = await kv.get(`student:${studentId}`);
    if (!st) throw new HttpError(404, 'Elevul nu există');
    await ownClass(s.userId, st.classId);
    return st;
  }

  route('POST', /^\/api\/teacher\/students\/([\w-]+)\/reset-pin$/, async (req, [, studentId]) => {
    const st = await teacherStudent(req, studentId);
    const pin = randomPin();
    Object.assign(st, { pinHash: hashSecret(pin), fails: 0, lockedUntil: 0 });
    await kv.set(`student:${st.id}`, st);
    await endSessions(st.id);
    return { pin };
  });

  route('DELETE', /^\/api\/teacher\/students\/([\w-]+)$/, async (req, [, studentId]) => {
    const st = await teacherStudent(req, studentId);
    await endSessions(st.id);
    await kv.del(`student:${st.id}`, `progress:${st.id}`, nameKey(st.classId, st.pseudonym));
    await kv.srem(`classStudents:${st.classId}`, st.id);
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
    const classId = await kv.get(`classByCode:${code}`);
    const k = classId && (await kv.get(`class:${classId}`));
    if (!k) throw new HttpError(401, 'Cod de clasă, pseudonim sau PIN greșit');

    const existingId = await kv.get(nameKey(k.id, pseudonym));
    if (!existingId) {
      if (!k.joinOpen) throw new HttpError(403, 'Înscrierea în această clasă este închisă. Cere ajutorul profesorului.');
      const id = newId();
      // NX: dacă doi elevi aleg simultan același pseudonim, doar unul îl primește.
      if (!(await kv.set(nameKey(k.id, pseudonym), id, { nx: true }))) throw new HttpError(409, 'Pseudonimul tocmai a fost ales de altcineva. Alege altul.');
      await kv.set(`student:${id}`, { id, classId: k.id, pseudonym, pinHash: hashSecret(pin), unlockedUnits: [], createdAt: new Date().toISOString() });
      await kv.sadd(`classStudents:${k.id}`, id);
      return { token: await createSession('student', id), created: true, pseudonim: pseudonym };
    }
    const st = await kv.get(`student:${existingId}`);
    if (!st) throw new HttpError(401, 'Cod de clasă, pseudonim sau PIN greșit');
    if (isLocked(st)) throw new HttpError(429, 'Prea multe încercări greșite. Cere profesorului să-ți reseteze PIN-ul sau așteaptă 15 minute.');
    if (!checkSecret(pin, st.pinHash)) {
      registerFail(st);
      await kv.set(`student:${st.id}`, st);
      throw new HttpError(401, 'Cod de clasă, pseudonim sau PIN greșit');
    }
    if (st.fails) (st.fails = 0), await kv.set(`student:${st.id}`, st);
    return { token: await createSession('student', st.id), created: false, pseudonim: st.pseudonym };
  });

  route('GET', /^\/api\/student\/map$/, async (req) => {
    const { st, klass } = await currentStudent(req);
    const grade = MAP[klass.grade];
    const prog = await kv.hgetall(`progress:${st.id}`);
    const unlocked = new Set([...klass.unlockedUnits, ...(st.unlockedUnits || [])]);
    return {
      clasa: { nume: klass.name, grade: klass.grade, titlu: grade.titlu },
      elev: { pseudonim: st.pseudonym },
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
  });

  // Elevul poate debloca singur o unitate cu codul primit de la profesor.
  route('POST', /^\/api\/student\/unlock$/, async (req) => {
    const { st, klass } = await currentStudent(req);
    const b = await readJson(req);
    const code = str(b.code, 'cod unitate', 3, 10).toUpperCase();
    const unitId = Object.keys(klass.unitCodes).find((u) => klass.unitCodes[u] === code);
    if (!unitId) throw new HttpError(400, 'Cod de unitate invalid');
    st.unlockedUnits = [...new Set([...(st.unlockedUnits || []), unitId])];
    await kv.set(`student:${st.id}`, st);
    return { ok: true, unitId, titlu: UNITS.get(unitId).titlu };
  });

  route('GET', /^\/api\/student\/lesson\/([\d.]+)$/, async (req, [, lessonId]) => {
    const { st, klass } = await currentStudent(req);
    const l = LESSONS.get(lessonId);
    if (!l || !canSee(st, klass, l)) throw new HttpError(404, 'Lecția nu există sau nu este încă deblocată');
    const prog = await kv.hgetall(`progress:${st.id}`);
    return { ...l, status: prog[l.id] || 'nou', continut: lessonContent(l.id) };
  });

  route('POST', /^\/api\/student\/progress$/, async (req) => {
    const { st, klass } = await currentStudent(req);
    const b = await readJson(req);
    const l = typeof b.lessonId === 'string' && LESSONS.get(b.lessonId);
    if (!l || !canSee(st, klass, l)) throw new HttpError(404, 'Lecția nu există sau nu este încă deblocată');
    if (!['nou', 'in_lucru', 'finalizat'].includes(b.status)) throw new HttpError(400, 'Status invalid');
    await kv.hset(`progress:${st.id}`, l.id, b.status);
    return { ok: true };
  });

  // ---------- Fișiere statice (doar local; pe Vercel le servește platforma) ----------
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  function serveStatic(res, pathname) {
    let rel;
    try {
      rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    } catch {
      return send(res, 400, 'Cerere invalidă');
    }
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Interzis');
    fs.readFile(file, (err, buf) => {
      if (err) return send(res, 404, 'Negăsit');
      send(res, 200, buf, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    });
  }

  return async function handler(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Metodă nepermisă');
      return serveStatic(res, pathname);
    }
    if (!kv) {
      return send(res, 503, { error: 'Baza de date nu este configurată. În Vercel: proiect → Storage → adaugă „Upstash for Redis”, conecteaz-o la proiect, apoi fă Redeploy.' });
    }
    const r = routes.find((x) => x.method === req.method && x.pattern.test(pathname));
    if (!r) return send(res, 404, { error: 'Rută inexistentă' });
    try {
      send(res, 200, await r.fn(req, pathname.match(r.pattern)));
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'Eroare internă' });
    }
  };
}

module.exports = { createHandler };

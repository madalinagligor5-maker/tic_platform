'use strict';
// API-ul edudigi: conturi de profesor, clase cu cod, elevi (cod clasă + pseudonim + PIN) și progres.
// Folosit de api/index.js (funcția Vercel) și de scripts/serve.js (local).
// Reguli: profesorul vede doar clasele lui; elevul vede și scrie doar propriul progres.
const crypto = require('crypto');
const { query } = require('./db');
const { curata } = require('../public/js/diapozitive');

const SESIUNE_PROFESOR_ORE = 24 * 7;
const SESIUNE_ELEV_ORE = 8; // calculatoarele din laborator sunt folosite de mai mulți elevi
const MAX_ESECURI = 5;
const BLOCARE_MIN = 15;
const MATERIAL_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------- Utilitare ----------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(secret, salt, 32).toString('hex')}`;
}
function checkSecret(secret, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.timingSafeEqual(crypto.scryptSync(secret, salt, 32), Buffer.from(hash, 'hex'));
}
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Fără caractere ușor de confundat (0/O, 1/I/L).
const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const aleator = (n) => Array.from({ length: n }, () => ALFABET[crypto.randomInt(ALFABET.length)]).join('');
const pinNou = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

function text(v, nume, min, max) {
  if (typeof v !== 'string') throw new HttpError(400, `Câmpul „${nume}” lipsește`);
  const t = v.trim();
  if (t.length < min || t.length > max) throw new HttpError(400, `Câmpul „${nume}” trebuie să aibă ${min}–${max} caractere`);
  return t;
}
function intreg(v, min, max) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, 'Valoare numerică invalidă');
  return n;
}
const blocat = (rand) => rand.blocat_pana && new Date(rand.blocat_pana) > new Date();

function readBody(req, max = 32 * 1024) {
  if (req.body !== undefined) {
    let b;
    try {
      b = req.body; // pe Vercel poate arunca la JSON invalid
    } catch {
      return Promise.reject(new HttpError(400, 'JSON invalid'));
    }
    if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return Promise.resolve(b);
    try {
      return Promise.resolve(b ? JSON.parse(b.toString()) : {});
    } catch {
      return Promise.reject(new HttpError(400, 'JSON invalid'));
    }
  }
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(new HttpError(413, 'Cerere prea mare'));
        req.destroy();
      } else parts.push(c);
    });
    req.on('end', () => {
      try {
        resolve(parts.length ? JSON.parse(Buffer.concat(parts).toString('utf8')) : {});
      } catch {
        reject(new HttpError(400, 'JSON invalid'));
      }
    });
    req.on('error', reject);
  });
}

// ---------- Sesiuni ----------
async function creeazaSesiune(rol, id) {
  const token = crypto.randomBytes(32).toString('hex');
  const ore = rol === 'profesor' ? SESIUNE_PROFESOR_ORE : SESIUNE_ELEV_ORE;
  await query(`INSERT INTO sesiuni (token_hash, rol, utilizator_id, expira_la) VALUES ($1, $2, $3, now() + make_interval(hours => $4))`, [sha256(token), rol, id, ore]);
  // Curățenie ocazională a sesiunilor expirate.
  if (crypto.randomInt(20) === 0) await query('DELETE FROM sesiuni WHERE expira_la < now()');
  return token;
}
function tokenDin(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  return m ? m[1] : null;
}
async function cere(req, rol) {
  const token = tokenDin(req);
  if (!token) throw new HttpError(401, 'Autentificare necesară');
  const [s] = await query('SELECT rol, utilizator_id FROM sesiuni WHERE token_hash = $1 AND expira_la > now()', [sha256(token)]);
  if (!s || s.rol !== rol) throw new HttpError(401, 'Autentificare necesară');
  return s.utilizator_id;
}
async function clasaProfesorului(profesorId, clasaId) {
  if (!/^[0-9a-f-]{36}$/.test(clasaId)) throw new HttpError(404, 'Clasa nu există');
  const [c] = await query('SELECT * FROM clase WHERE id = $1 AND profesor_id = $2', [clasaId, profesorId]);
  if (!c) throw new HttpError(404, 'Clasa nu există');
  return c;
}
async function elevulProfesorului(profesorId, elevId) {
  if (!/^[0-9a-f-]{36}$/.test(elevId)) throw new HttpError(404, 'Elevul nu există');
  const [e] = await query('SELECT e.* FROM elevi e JOIN clase c ON c.id = e.clasa_id WHERE e.id = $1 AND c.profesor_id = $2', [elevId, profesorId]);
  if (!e) throw new HttpError(404, 'Elevul nu există');
  return e;
}
async function codUnic(clasa) {
  for (let i = 0; i < 10; i++) {
    const cod = `TIC${clasa}-${aleator(4)}`;
    const [exista] = await query('SELECT 1 FROM clase WHERE cod = $1', [cod]);
    if (!exista) return cod;
  }
  throw new HttpError(500, 'Nu am putut genera un cod unic');
}
async function inregistreazaEsec(tabel, rand) {
  // Numele tabelului vine doar din cod (profesori/elevi), nu de la utilizator.
  const esecuri = rand.esecuri + 1;
  if (esecuri >= MAX_ESECURI) await query(`UPDATE ${tabel} SET esecuri = 0, blocat_pana = now() + make_interval(mins => $2) WHERE id = $1`, [rand.id, BLOCARE_MIN]);
  else await query(`UPDATE ${tabel} SET esecuri = $2 WHERE id = $1`, [rand.id, esecuri]);
}
const clasaPublica = (c, elevi) => ({ id: c.id, nume: c.nume, clasa: c.clasa, cod: c.cod, inscriereDeschisa: c.inscriere_deschisa, ...(elevi !== undefined ? { elevi } : {}) });

// ---------- Rute ----------
const rute = [];
const ruta = (metoda, tipar, fn) => rute.push({ metoda, tipar, fn });

ruta('GET', /^\/api\/stare$/, async () => {
  await query('SELECT 1');
  return { ok: true, bazaDeDate: 'conectată' };
});

ruta('POST', /^\/api\/profesor\/inregistrare$/, async (req) => {
  const b = await readBody(req);
  // Dacă e setat TEACHER_SIGNUP_CODE, doar cine știe codul își poate face cont de profesor.
  if (process.env.TEACHER_SIGNUP_CODE && b.codInvitatie !== process.env.TEACHER_SIGNUP_CODE) throw new HttpError(403, 'Codul de invitație pentru profesori nu este corect');
  const nume = text(b.nume, 'nume', 2, 80);
  const utilizator = text(b.utilizator, 'utilizator', 3, 40).toLowerCase();
  const parola = text(b.parola, 'parolă', 8, 200);
  if (!/^[a-z0-9._-]+$/.test(utilizator)) throw new HttpError(400, 'Utilizatorul poate conține doar litere, cifre, . _ -');
  const rows = await query('INSERT INTO profesori (utilizator, nume, parola_hash) VALUES ($1, $2, $3) ON CONFLICT (utilizator) DO NOTHING RETURNING id', [utilizator, nume, hashSecret(parola)]);
  if (!rows.length) throw new HttpError(409, 'Utilizatorul există deja');
  return { token: await creeazaSesiune('profesor', rows[0].id), rol: 'profesor', nume };
});

ruta('POST', /^\/api\/profesor\/login$/, async (req) => {
  const b = await readBody(req);
  const utilizator = text(b.utilizator, 'utilizator', 1, 40).toLowerCase();
  const parola = text(b.parola, 'parolă', 1, 200);
  const [p] = await query('SELECT * FROM profesori WHERE utilizator = $1', [utilizator]);
  if (p && blocat(p)) throw new HttpError(429, 'Prea multe încercări. Încearcă din nou peste 15 minute.');
  if (!p || !checkSecret(parola, p.parola_hash)) {
    if (p) await inregistreazaEsec('profesori', p);
    throw new HttpError(401, 'Utilizator sau parolă greșite');
  }
  if (p.esecuri) await query('UPDATE profesori SET esecuri = 0 WHERE id = $1', [p.id]);
  return { token: await creeazaSesiune('profesor', p.id), rol: 'profesor', nume: p.nume };
});

ruta('POST', /^\/api\/logout$/, async (req) => {
  const token = tokenDin(req);
  if (token) await query('DELETE FROM sesiuni WHERE token_hash = $1', [sha256(token)]);
  return { ok: true };
});

ruta('GET', /^\/api\/profesor\/clase$/, async (req) => {
  const pid = await cere(req, 'profesor');
  const rows = await query(
    `SELECT c.*, (SELECT count(*) FROM elevi e WHERE e.clasa_id = c.id)::int AS nr_elevi
       FROM clase c WHERE c.profesor_id = $1 ORDER BY c.clasa, c.nume`,
    [pid],
  );
  return rows.map((c) => clasaPublica(c, c.nr_elevi));
});

ruta('POST', /^\/api\/profesor\/clase$/, async (req) => {
  const pid = await cere(req, 'profesor');
  const b = await readBody(req);
  const nume = text(b.nume, 'nume clasă', 1, 40);
  const clasa = intreg(b.clasa, 5, 12);
  const cod = await codUnic(clasa);
  const [c] = await query('INSERT INTO clase (profesor_id, nume, clasa, cod) VALUES ($1, $2, $3, $4) RETURNING *', [pid, nume, clasa, cod]);
  return clasaPublica(c, 0);
});

// Tot ce îi trebuie panoului: clasa, elevii și rândurile de progres (agregarea se face în browser).
ruta('GET', /^\/api\/profesor\/clase\/([\w-]+)$/, async (req, [, id]) => {
  const pid = await cere(req, 'profesor');
  const c = await clasaProfesorului(pid, id);
  const elevi = await query(
    `SELECT id, pseudonim, ultima_logare, creat_la, (blocat_pana IS NOT NULL AND blocat_pana > now()) AS blocat
       FROM elevi WHERE clasa_id = $1 ORDER BY lower(pseudonim)`,
    [c.id],
  );
  const progres = await query(
    `SELECT p.elev_id, p.material_id, p.stare, p.rezolvate, p.din_prima, p.total, p.incercari, p.secunde, p.actualizat_la, p.terminat_la
       FROM progres p JOIN elevi e ON e.id = p.elev_id WHERE e.clasa_id = $1`,
    [c.id],
  );
  return { clasa: clasaPublica(c), elevi, progres };
});

ruta('POST', /^\/api\/profesor\/clase\/([\w-]+)\/cod$/, async (req, [, id]) => {
  const pid = await cere(req, 'profesor');
  const c = await clasaProfesorului(pid, id);
  const cod = await codUnic(c.clasa);
  await query('UPDATE clase SET cod = $2 WHERE id = $1', [c.id, cod]);
  return { cod };
});

ruta('POST', /^\/api\/profesor\/clase\/([\w-]+)\/inscriere$/, async (req, [, id]) => {
  const pid = await cere(req, 'profesor');
  const c = await clasaProfesorului(pid, id);
  const b = await readBody(req);
  await query('UPDATE clase SET inscriere_deschisa = $2 WHERE id = $1', [c.id, Boolean(b.deschisa)]);
  return { inscriereDeschisa: Boolean(b.deschisa) };
});

ruta('POST', /^\/api\/profesor\/elevi\/([\w-]+)\/pin$/, async (req, [, id]) => {
  const pid = await cere(req, 'profesor');
  const e = await elevulProfesorului(pid, id);
  const pin = pinNou();
  await query('UPDATE elevi SET pin_hash = $2, esecuri = 0, blocat_pana = NULL WHERE id = $1', [e.id, hashSecret(pin)]);
  await query('DELETE FROM sesiuni WHERE utilizator_id = $1', [e.id]);
  return { pin };
});

ruta('DELETE', /^\/api\/profesor\/elevi\/([\w-]+)$/, async (req, [, id]) => {
  const pid = await cere(req, 'profesor');
  const e = await elevulProfesorului(pid, id);
  await query('DELETE FROM sesiuni WHERE utilizator_id = $1', [e.id]);
  await query('DELETE FROM elevi WHERE id = $1', [e.id]); // progresul se șterge în cascadă
  return { ok: true };
});

// „Resetarea unei teme”: elevul poate relua materialul de la zero.
ruta('DELETE', /^\/api\/profesor\/elevi\/([\w-]+)\/progres\/([a-z0-9-]+)$/, async (req, [, id, materialId]) => {
  const pid = await cere(req, 'profesor');
  const e = await elevulProfesorului(pid, id);
  await query('DELETE FROM progres WHERE elev_id = $1 AND material_id = $2', [e.id, materialId]);
  return { ok: true };
});

function dateElev(b) {
  const cod = text(b.cod, 'codul clasei', 4, 20).toUpperCase();
  const pseudonim = text(b.pseudonim, 'pseudonim', 2, 24);
  const pin = text(b.pin, 'PIN', 4, 6);
  if (!/^\d{4,6}$/.test(pin)) throw new HttpError(400, 'PIN-ul are 4–6 cifre');
  if (!/^[\p{L}\p{N} ._-]+$/u.test(pseudonim)) throw new HttpError(400, 'Pseudonimul poate conține doar litere, cifre, spațiu, . _ -');
  return { cod, pseudonim, pin };
}

ruta('POST', /^\/api\/elev\/inscriere$/, async (req) => {
  const { cod, pseudonim, pin } = dateElev(await readBody(req));
  const [c] = await query('SELECT * FROM clase WHERE cod = $1', [cod]);
  if (!c) throw new HttpError(404, 'Nu există o clasă cu acest cod');
  if (!c.inscriere_deschisa) throw new HttpError(403, 'Înscrierea în această clasă este închisă. Cere ajutorul profesorului.');
  const rows = await query(
    `INSERT INTO elevi (clasa_id, pseudonim, pin_hash, ultima_logare) VALUES ($1, $2, $3, now())
       ON CONFLICT (clasa_id, lower(pseudonim)) DO NOTHING RETURNING id`,
    [c.id, pseudonim, hashSecret(pin)],
  );
  if (!rows.length) throw new HttpError(409, 'Pseudonimul este deja folosit în această clasă. Alege altul sau intră în cont.');
  return { token: await creeazaSesiune('elev', rows[0].id), rol: 'elev', nume: pseudonim, clasa: c.clasa, numeClasa: c.nume };
});

ruta('POST', /^\/api\/elev\/login$/, async (req) => {
  const { cod, pseudonim, pin } = dateElev(await readBody(req));
  const [e] = await query(
    `SELECT e.*, c.clasa, c.nume AS nume_clasa FROM elevi e JOIN clase c ON c.id = e.clasa_id
      WHERE c.cod = $1 AND lower(e.pseudonim) = lower($2)`,
    [cod, pseudonim],
  );
  if (e && blocat(e)) throw new HttpError(429, 'Prea multe încercări greșite. Cere profesorului să-ți reseteze PIN-ul sau așteaptă 15 minute.');
  if (!e || !checkSecret(pin, e.pin_hash)) {
    if (e) await inregistreazaEsec('elevi', e);
    throw new HttpError(401, 'Codul clasei, pseudonimul sau PIN-ul nu sunt corecte');
  }
  await query('UPDATE elevi SET esecuri = 0, ultima_logare = now() WHERE id = $1', [e.id]);
  return { token: await creeazaSesiune('elev', e.id), rol: 'elev', nume: e.pseudonim, clasa: e.clasa, numeClasa: e.nume_clasa };
});

ruta('GET', /^\/api\/elev\/progres$/, async (req) => {
  const eid = await cere(req, 'elev');
  return query('SELECT material_id, stare, rezolvate, din_prima, total, incercari, secunde, actualizat_la FROM progres WHERE elev_id = $1', [eid]);
});

// Se apelează la deschiderea unui material și la fiecare aplicație rezolvată.
// rezolvate / dinPrima / total sunt valorile din pagina curentă; incercari și secunde sunt diferențe (de adunat).
ruta('POST', /^\/api\/elev\/progres$/, async (req) => {
  const eid = await cere(req, 'elev');
  const b = await readBody(req);
  const materialId = text(b.materialId, 'material', 1, 120);
  if (!MATERIAL_ID.test(materialId)) throw new HttpError(400, 'Material invalid');
  const total = intreg(b.total ?? 0, 0, 50);
  const rezolvate = Math.min(intreg(b.rezolvate ?? 0, 0, 50), total);
  const dinPrima = Math.min(intreg(b.dinPrima ?? 0, 0, 50), rezolvate);
  const incercari = intreg(b.incercari ?? 0, 0, 200);
  const secunde = intreg(b.secunde ?? 0, 0, 900);
  const stare = rezolvate >= total ? 'terminat' : 'inceput';
  // Punctajul (din_prima) se fixează la prima finalizare; profesorul poate reseta materialul.
  const [p] = await query(
    `INSERT INTO progres (elev_id, material_id, stare, rezolvate, din_prima, total, incercari, secunde, terminat_la)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $3 = 'terminat' THEN now() END)
     ON CONFLICT (elev_id, material_id) DO UPDATE SET
       rezolvate     = GREATEST(progres.rezolvate, EXCLUDED.rezolvate),
       din_prima     = CASE WHEN progres.stare = 'terminat' THEN progres.din_prima ELSE GREATEST(progres.din_prima, EXCLUDED.din_prima) END,
       total         = EXCLUDED.total,
       incercari     = progres.incercari + EXCLUDED.incercari,
       secunde       = progres.secunde + EXCLUDED.secunde,
       stare         = CASE WHEN progres.stare = 'terminat' OR EXCLUDED.stare = 'terminat' THEN 'terminat' ELSE 'inceput' END,
       terminat_la   = COALESCE(progres.terminat_la, EXCLUDED.terminat_la),
       actualizat_la = now()
     RETURNING material_id, stare, rezolvate, din_prima, total, incercari, secunde`,
    [eid, materialId, stare, rezolvate, dinPrima, total, incercari, secunde],
  );
  return p;
});

// ---------- Atelierul de prezentări ----------
// Elevul își face prezentări; profesorul le vede pe ale elevilor din clasele lui.
const MAX_PREZENTARI = 30;
const PREZ_ID = /^[0-9a-f-]{36}$/;
async function prezentareDinCerere(req) {
  const b = await readBody(req, 4 * 1024 * 1024);
  const { prezentare, errors } = curata(b.prezentare);
  if (errors.length) throw new HttpError(400, errors[0][0].toUpperCase() + errors[0].slice(1));
  return prezentare;
}
const rezumat = `id, titlu, jsonb_array_length(continut->'diapozitive') AS diapozitive, creat_la, actualizat_la`;

ruta('GET', /^\/api\/elev\/prezentari$/, async (req) => {
  const eid = await cere(req, 'elev');
  return query(`SELECT ${rezumat} FROM prezentari WHERE elev_id = $1 ORDER BY actualizat_la DESC`, [eid]);
});

ruta('POST', /^\/api\/elev\/prezentari$/, async (req) => {
  const eid = await cere(req, 'elev');
  const p = await prezentareDinCerere(req);
  const [{ n }] = await query('SELECT count(*)::int AS n FROM prezentari WHERE elev_id = $1', [eid]);
  if (n >= MAX_PREZENTARI) throw new HttpError(409, `Poți avea cel mult ${MAX_PREZENTARI} de prezentări. Șterge una ca să faci alta.`);
  const [r] = await query(`INSERT INTO prezentari (elev_id, titlu, continut) VALUES ($1, $2, $3) RETURNING ${rezumat}`, [eid, p.titlu, p]);
  return r;
});

ruta('GET', /^\/api\/elev\/prezentari\/([\w-]+)$/, async (req, [, id]) => {
  const eid = await cere(req, 'elev');
  if (!PREZ_ID.test(id)) throw new HttpError(404, 'Prezentarea nu există');
  const [r] = await query('SELECT id, continut AS prezentare, actualizat_la FROM prezentari WHERE id = $1 AND elev_id = $2', [id, eid]);
  if (!r) throw new HttpError(404, 'Prezentarea nu există');
  return r;
});

ruta('PUT', /^\/api\/elev\/prezentari\/([\w-]+)$/, async (req, [, id]) => {
  const eid = await cere(req, 'elev');
  if (!PREZ_ID.test(id)) throw new HttpError(404, 'Prezentarea nu există');
  const p = await prezentareDinCerere(req);
  const [r] = await query(`UPDATE prezentari SET titlu = $3, continut = $4, actualizat_la = now() WHERE id = $1 AND elev_id = $2 RETURNING ${rezumat}`, [id, eid, p.titlu, p]);
  if (!r) throw new HttpError(404, 'Prezentarea nu există');
  return r;
});

ruta('DELETE', /^\/api\/elev\/prezentari\/([\w-]+)$/, async (req, [, id]) => {
  const eid = await cere(req, 'elev');
  if (!PREZ_ID.test(id)) throw new HttpError(404, 'Prezentarea nu există');
  await query('DELETE FROM prezentari WHERE id = $1 AND elev_id = $2', [id, eid]);
  return { ok: true };
});

ruta('GET', /^\/api\/profesor\/elevi\/([\w-]+)\/prezentari$/, async (req, [, id]) => {
  const pid = await cere(req, 'profesor');
  await elevulProfesorului(pid, id);
  return query(`SELECT ${rezumat} FROM prezentari WHERE elev_id = $1 ORDER BY actualizat_la DESC`, [id]);
});

ruta('GET', /^\/api\/profesor\/elevi\/([\w-]+)\/prezentari\/([\w-]+)$/, async (req, [, id, prezId]) => {
  const pid = await cere(req, 'profesor');
  await elevulProfesorului(pid, id);
  if (!PREZ_ID.test(prezId)) throw new HttpError(404, 'Prezentarea nu există');
  const [r] = await query('SELECT id, continut AS prezentare, actualizat_la FROM prezentari WHERE id = $1 AND elev_id = $2', [prezId, id]);
  if (!r) throw new HttpError(404, 'Prezentarea nu există');
  return r;
});

// ---------- Handler ----------
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function handler(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const r = rute.find((x) => x.metoda === req.method && x.tipar.test(pathname));
  if (!r) return send(res, 404, { error: 'Rută inexistentă' });
  try {
    send(res, 200, await r.fn(req, pathname.match(r.tipar)));
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    if (e.code === 'NO_DB') return send(res, 503, { error: 'Baza de date nu este configurată (lipsește DATABASE_URL).' });
    console.error(e);
    send(res, 500, { error: 'Eroare internă' });
  }
}

module.exports = { handler };

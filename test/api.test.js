'use strict';
// Rulare: npm test – testează API-ul cap-coadă pe un Postgres real (PGlite), prin același driver `pg` ca în producție.
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

let server, base, pgServer;

test.before(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  const db = await PGlite.create();
  pgServer = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1', maxConnections: 10 });
  await pgServer.start();
  const conn = pgServer.getServerConn(); // host:port
  process.env.DATABASE_URL = `postgres://postgres:postgres@${conn}/postgres?sslmode=disable`;
  process.env.PG_POOL_MAX = '1';
  delete process.env.TEACHER_SIGNUP_CODE;
  await require('../scripts/migrate').migrate(process.env.DATABASE_URL);
  await require('../scripts/migrate').migrate(process.env.DATABASE_URL); // a doua rulare nu strică nimic
  const { handler } = require('../lib/api');
  server = http.createServer(handler);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.close();
  await require('../lib/db').closePool();
  await pgServer.stop();
});

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

test('baza de date răspunde', async () => {
  const r = await call('GET', '/api/stare');
  assert.deepStrictEqual(r.body, { ok: true, bazaDeDate: 'conectată' });
});

test('flux complet: profesor → clasă → elev → progres → panou', async () => {
  const p = await call('POST', '/api/profesor/inregistrare', { nume: 'Ana Popescu', utilizator: 'ana', parola: 'parola-sigura' });
  assert.strictEqual(p.status, 200);
  const tp = p.body.token;
  assert.strictEqual((await call('POST', '/api/profesor/inregistrare', { nume: 'Alt', utilizator: 'ana', parola: 'parola-sigura' })).status, 409);

  const k = await call('POST', '/api/profesor/clase', { nume: '5B', clasa: 5 }, tp);
  assert.match(k.body.cod, /^TIC5-[A-Z2-9]{4}$/);

  // Elevul se înscrie o dată cu codul, apoi intră cu cod + pseudonim + PIN.
  const e = await call('POST', '/api/elev/inscriere', { cod: k.body.cod.toLowerCase(), pseudonim: 'Ana M.', pin: '1234' });
  assert.strictEqual(e.status, 200);
  assert.strictEqual(e.body.clasa, 5);
  assert.strictEqual((await call('POST', '/api/elev/inscriere', { cod: k.body.cod, pseudonim: 'ana m.', pin: '9999' })).status, 409);
  const login = await call('POST', '/api/elev/login', { cod: k.body.cod, pseudonim: 'ANA M.', pin: '1234' });
  assert.strictEqual(login.status, 200);
  const te = login.body.token;

  // Deschide lecția, rezolvă 2 aplicații (una din prima), apoi pe toate 3.
  await call('POST', '/api/elev/progres', { materialId: 'tic-5-u1-l1-norme-ergonomie-siguranta', total: 3 }, te);
  await call('POST', '/api/elev/progres', { materialId: 'tic-5-u1-l1-norme-ergonomie-siguranta', total: 3, rezolvate: 2, dinPrima: 1, incercari: 3, secunde: 120 }, te);
  const fin = await call('POST', '/api/elev/progres', { materialId: 'tic-5-u1-l1-norme-ergonomie-siguranta', total: 3, rezolvate: 3, dinPrima: 2, incercari: 1, secunde: 60 }, te);
  assert.deepStrictEqual(
    { stare: fin.body.stare, rezolvate: fin.body.rezolvate, din_prima: fin.body.din_prima, incercari: fin.body.incercari, secunde: fin.body.secunde },
    { stare: 'terminat', rezolvate: 3, din_prima: 2, incercari: 4, secunde: 180 },
  );
  // După finalizare, punctajul nu mai poate fi „umflat” refăcând lecția.
  const din2 = await call('POST', '/api/elev/progres', { materialId: 'tic-5-u1-l1-norme-ergonomie-siguranta', total: 3, rezolvate: 3, dinPrima: 3 }, te);
  assert.strictEqual(din2.body.din_prima, 2);
  // Valori imposibile sunt limitate: dinPrima nu poate depăși rezolvate, rezolvate nu poate depăși total.
  const lim = await call('POST', '/api/elev/progres', { materialId: 'info-5-u5-l1-notiunea-de-algoritm', total: 2, rezolvate: 9, dinPrima: 9 }, te);
  assert.strictEqual(lim.body.rezolvate, 2);
  assert.strictEqual((await call('POST', '/api/elev/progres', { materialId: '../hack', total: 1 }, te)).status, 400);

  const mine = await call('GET', '/api/elev/progres', null, te);
  assert.strictEqual(mine.body.length, 2);

  // Panoul profesorului.
  const panou = await call('GET', `/api/profesor/clase/${k.body.id}`, null, tp);
  assert.strictEqual(panou.body.elevi.length, 1);
  assert.strictEqual(panou.body.elevi[0].pseudonim, 'Ana M.');
  const rand = panou.body.progres.find((x) => x.material_id === 'tic-5-u1-l1-norme-ergonomie-siguranta');
  assert.strictEqual(rand.stare, 'terminat');

  // Resetarea unei teme.
  const sid = panou.body.elevi[0].id;
  await call('DELETE', `/api/profesor/elevi/${sid}/progres/tic-5-u1-l1-norme-ergonomie-siguranta`, null, tp);
  assert.strictEqual((await call('GET', '/api/elev/progres', null, te)).body.length, 1);

  // Resetarea PIN-ului închide sesiunile elevului.
  const pin = await call('POST', `/api/profesor/elevi/${sid}/pin`, null, tp);
  assert.match(pin.body.pin, /^\d{4}$/);
  assert.strictEqual((await call('GET', '/api/elev/progres', null, te)).status, 401);
  assert.strictEqual((await call('POST', '/api/elev/login', { cod: k.body.cod, pseudonim: 'Ana M.', pin: pin.body.pin })).status, 200);

  // Cod regenerat și înscriere închisă.
  const cod2 = await call('POST', `/api/profesor/clase/${k.body.id}/cod`, null, tp);
  assert.notStrictEqual(cod2.body.cod, k.body.cod);
  await call('POST', `/api/profesor/clase/${k.body.id}/inscriere`, { deschisa: false }, tp);
  assert.strictEqual((await call('POST', '/api/elev/inscriere', { cod: cod2.body.cod, pseudonim: 'Nou', pin: '1111' })).status, 403);

  // Ștergerea elevului șterge și progresul.
  await call('DELETE', `/api/profesor/elevi/${sid}`, null, tp);
  const gol = await call('GET', `/api/profesor/clase/${k.body.id}`, null, tp);
  assert.strictEqual(gol.body.elevi.length, 0);
  assert.strictEqual(gol.body.progres.length, 0);
});

test('izolare: profesorul nu vede clasa altui profesor; elevul nu poate folosi rute de profesor', async () => {
  const a = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof A', utilizator: 'profa', parola: 'parola-sigura' })).body.token;
  const b = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof B', utilizator: 'profb', parola: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/profesor/clase', { nume: '6A', clasa: 6 }, a)).body;
  assert.strictEqual((await call('GET', `/api/profesor/clase/${k.id}`, null, b)).status, 404);
  const te = (await call('POST', '/api/elev/inscriere', { cod: k.cod, pseudonim: 'Lup', pin: '4321' })).body.token;
  assert.strictEqual((await call('GET', `/api/profesor/clase/${k.id}`, null, te)).status, 401);
  assert.strictEqual((await call('GET', '/api/profesor/clase', null, te)).status, 401);
});

test('ștergerea unui profesor șterge și sesiunile lui și ale elevilor lui', async () => {
  const { query } = require('../lib/db');
  const t = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof E', utilizator: 'profe', parola: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/profesor/clase', { nume: '8E', clasa: 8 }, t)).body;
  await call('POST', '/api/elev/inscriere', { cod: k.cod, pseudonim: 'Vulpe', pin: '1357' });
  const [{ id }] = await query("SELECT id FROM profesori WHERE utilizator = 'profe'");
  const ids = `SELECT $1::uuid UNION SELECT e.id FROM elevi e JOIN clase c ON c.id = e.clasa_id WHERE c.profesor_id = $1`;
  assert.strictEqual((await query(`SELECT count(*)::int n FROM sesiuni WHERE utilizator_id IN (${ids})`, [id]))[0].n, 2);
  await query('DELETE FROM profesori WHERE id = $1', [id]);
  assert.strictEqual((await query('SELECT count(*)::int n FROM sesiuni s WHERE NOT EXISTS (SELECT 1 FROM profesori p WHERE p.id = s.utilizator_id) AND NOT EXISTS (SELECT 1 FROM elevi e WHERE e.id = s.utilizator_id)'))[0].n, 0);
  assert.strictEqual((await call('GET', '/api/profesor/clase', null, t)).status, 401);
});

test('blocare după 5 PIN-uri greșite', async () => {
  const t = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof C', utilizator: 'profc', parola: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/profesor/clase', { nume: '7C', clasa: 7 }, t)).body;
  await call('POST', '/api/elev/inscriere', { cod: k.cod, pseudonim: 'Bufnița', pin: '2468' });
  for (let i = 0; i < 5; i++) assert.strictEqual((await call('POST', '/api/elev/login', { cod: k.cod, pseudonim: 'Bufnița', pin: '0000' })).status, 401);
  assert.strictEqual((await call('POST', '/api/elev/login', { cod: k.cod, pseudonim: 'Bufnița', pin: '2468' })).status, 429);
});

test('cod de invitație pentru profesori, dacă este setat', async () => {
  process.env.TEACHER_SIGNUP_CODE = 'SCOALA2026';
  try {
    assert.strictEqual((await call('POST', '/api/profesor/inregistrare', { nume: 'Intrus', utilizator: 'intrus', parola: 'parola-sigura' })).status, 403);
    assert.strictEqual((await call('POST', '/api/profesor/inregistrare', { nume: 'Prof D', utilizator: 'profd', parola: 'parola-sigura', codInvitatie: 'SCOALA2026' })).status, 200);
  } finally {
    delete process.env.TEACHER_SIGNUP_CODE;
  }
});

test('teste lansate de profesor: lansare → rezolvare → corectare → eseu', async () => {
  const os = require('os');
  const path = require('path');
  const { build } = require('../scripts/build');
  const out = require('fs').mkdtempSync(path.join(os.tmpdir(), 'edudigi-'));
  const { teste } = build({ src: path.join(__dirname, '..', 'materiale'), out });
  require('../lib/api').setTeste(teste);
  const tp = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof Teste', utilizator: 'prof.teste', parola: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/profesor/clase', { nume: '5T', clasa: 5 }, tp)).body;
  const te = (await call('POST', '/api/elev/inscriere', { cod: k.cod, pseudonim: 'Elev T', pin: '4321' })).body.token;

  const lista = await call('GET', '/api/profesor/teste', null, tp);
  assert.ok(lista.body.some((t) => t.id === 'tic-5-evaluare-profesor' && t.puncte === 100));
  assert.strictEqual((await call('GET', '/api/profesor/teste', null, te)).status, 401);
  // Elevul nu vede testele nelansate.
  assert.deepStrictEqual((await call('GET', '/api/elev/teste', null, te)).body, []);

  const l = await call('POST', `/api/profesor/clase/${k.id}/lansari`, { testId: 'tic-5-evaluare-profesor' }, tp);
  assert.strictEqual(l.status, 200);
  assert.strictEqual(l.body.timp, 40);
  const lid = l.body.id;
  const vazut = await call('GET', '/api/elev/teste', null, te);
  assert.strictEqual(vazut.body[0].stare, 'nou');

  const start = await call('POST', `/api/elev/teste/${lid}/start`, {}, te);
  assert.strictEqual(start.status, 200);
  assert.strictEqual(start.body.itemi.length, 8);
  assert.ok(!/"correct"|"answer"|Barem|barem/.test(JSON.stringify(start.body.itemi)));
  assert.ok(new Date(start.body.termen) > new Date());

  // Răspunsuri: itemii 1, 3 corecți; restul parțial; eseul se corectează manual.
  const t = teste['tic-5-evaluare-profesor'].itemi;
  const quiz1 = t[0].data.questions.map((q) => q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0));
  const tf = t[2].data.items.map((x) => x.answer);
  const raspunsuri = [quiz1, [], tf, {}, [], ['hardware', 'software', 'browser'], { verificari: [true, true, false] }, 'Un fișier are date, un folder grupează fișiere.'];
  assert.strictEqual((await call('POST', `/api/elev/teste/${lid}/salvare`, { raspunsuri }, te)).status, 200);
  const pred = await call('POST', `/api/elev/teste/${lid}/predare`, { raspunsuri }, te);
  assert.strictEqual(pred.status, 200);
  assert.strictEqual(pred.body.punctaj, 10 + 10 + 10 + 10);
  assert.strictEqual(pred.body.inAsteptare, 1);
  assert.strictEqual((await call('POST', `/api/elev/teste/${lid}/predare`, { raspunsuri }, te)).status, 409);
  assert.strictEqual((await call('POST', `/api/elev/teste/${lid}/start`, {}, te)).status, 409);

  // Profesorul vede rezultatele și punctează eseul.
  const rez = await call('GET', `/api/profesor/lansari/${lid}`, null, tp);
  const eu = rez.body.elevi.find((e) => e.pseudonim === 'Elev T');
  assert.strictEqual(eu.punctaj, 40);
  assert.strictEqual(eu.raspunsuri[7], raspunsuri[7]);
  assert.strictEqual((await call('POST', `/api/profesor/lansari/${lid}/elevi/${eu.id}/punctaj`, { index: 7, puncte: 25 }, tp)).status, 400);
  const p = await call('POST', `/api/profesor/lansari/${lid}/elevi/${eu.id}/punctaj`, { index: 7, puncte: 15 }, tp);
  assert.strictEqual(p.body.punctaj, 55);
  assert.strictEqual(p.body.nota, 5.95);
  const lans = await call('GET', `/api/profesor/clase/${k.id}/lansari`, null, tp);
  assert.strictEqual(lans.body[0].predate, 1);

  // Alt profesor nu are acces.
  const alt = (await call('POST', '/api/profesor/inregistrare', { nume: 'Alt Prof', utilizator: 'alt.prof', parola: 'parola-sigura' })).body.token;
  assert.strictEqual((await call('GET', `/api/profesor/lansari/${lid}`, null, alt)).status, 404);

  // Oprit: elevul nu mai poate începe; profesorul permite reluarea, apoi redeschide.
  await call('POST', `/api/profesor/lansari/${lid}/stare`, { deschisa: false }, tp);
  assert.strictEqual((await call('DELETE', `/api/profesor/lansari/${lid}/elevi/${eu.id}`, null, tp)).status, 200);
  assert.strictEqual((await call('POST', `/api/elev/teste/${lid}/start`, {}, te)).status, 403);
  await call('POST', `/api/profesor/lansari/${lid}/stare`, { deschisa: true }, tp);
  assert.strictEqual((await call('POST', `/api/elev/teste/${lid}/start`, {}, te)).status, 200);
  assert.strictEqual((await call('DELETE', `/api/profesor/lansari/${lid}`, null, tp)).status, 200);
  assert.deepStrictEqual((await call('GET', '/api/elev/teste', null, te)).body, []);
});

test('atelier: elevul își face prezentări, profesorul lui le vede, alții nu', async () => {
  const tp = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof F', utilizator: 'proff', parola: 'parola-sigura' })).body.token;
  const tAlt = (await call('POST', '/api/profesor/inregistrare', { nume: 'Prof G', utilizator: 'profg', parola: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/profesor/clase', { nume: '6F', clasa: 6 }, tp)).body;
  const te = (await call('POST', '/api/elev/inscriere', { cod: k.cod, pseudonim: 'Pix', pin: '1122' })).body.token;
  const te2 = (await call('POST', '/api/elev/inscriere', { cod: k.cod, pseudonim: 'Radieră', pin: '3344' })).body.token;
  const img = 'data:image/png;base64,iVBORw0KGgo=';
  const prez = { titlu: 'Apa', tema: 'albastru', diapozitive: [
    { aspect: 'titlu', titlu: 'Circuitul apei', text: 'Pix, 6F' },
    { aspect: 'text-imagine', titlu: 'Evaporarea', text: '- soarele\n- vaporii', imagine: img, note: 'încet', extra: 'ignorat' },
  ] };

  const c = await call('POST', '/api/elev/prezentari', { prezentare: prez }, te);
  assert.strictEqual(c.status, 200);
  assert.strictEqual(c.body.diapozitive, 2);
  const id = c.body.id;
  const g = await call('GET', `/api/elev/prezentari/${id}`, null, te);
  assert.strictEqual(g.body.prezentare.diapozitive[1].imagine, img);
  assert.strictEqual(g.body.prezentare.diapozitive[1].extra, undefined);

  prez.diapozitive.push({ aspect: 'text', titlu: 'Mulțumesc!' });
  assert.strictEqual((await call('PUT', `/api/elev/prezentari/${id}`, { prezentare: prez }, te)).body.diapozitive, 3);
  assert.strictEqual((await call('GET', '/api/elev/prezentari', null, te)).body.length, 1);

  // Validare: imagine nepermisă, prezentare goală.
  const rea = await call('POST', '/api/elev/prezentari', { prezentare: { titlu: 'X', diapozitive: [{ imagine: 'javascript:alert(1)' }] } }, te);
  assert.strictEqual(rea.status, 400);
  assert.match(rea.body.error, /Imaginea/);
  assert.strictEqual((await call('POST', '/api/elev/prezentari', { prezentare: { titlu: 'Gol', diapozitive: [] } }, te)).status, 400);

  // Alt elev nu o vede și nu o poate modifica.
  assert.strictEqual((await call('GET', `/api/elev/prezentari/${id}`, null, te2)).status, 404);
  assert.strictEqual((await call('PUT', `/api/elev/prezentari/${id}`, { prezentare: prez }, te2)).status, 404);
  assert.strictEqual((await call('GET', '/api/elev/prezentari', null, te2)).body.length, 0);

  // Profesorul clasei o vede; alt profesor nu.
  const sid = (await call('GET', `/api/profesor/clase/${k.id}`, null, tp)).body.elevi.find((e) => e.pseudonim === 'Pix').id;
  assert.strictEqual((await call('GET', `/api/profesor/elevi/${sid}/prezentari`, null, tp)).body[0].titlu, 'Apa');
  assert.strictEqual((await call('GET', `/api/profesor/elevi/${sid}/prezentari/${id}`, null, tp)).body.prezentare.tema, 'albastru');
  assert.strictEqual((await call('GET', `/api/profesor/elevi/${sid}/prezentari`, null, tAlt)).status, 404);

  // Ștergerea.
  await call('DELETE', `/api/elev/prezentari/${id}`, null, te);
  assert.strictEqual((await call('GET', '/api/elev/prezentari', null, te)).body.length, 0);
});

test('parolă uitată: resetare cu ADMIN_RESET_CODE', async () => {
  const p = await call('POST', '/api/profesor/inregistrare', { nume: 'Prof R', utilizator: 'prof.reset', parola: 'parola-veche-1' });
  const vechi = p.body.token;
  const date = { utilizator: 'prof.reset', codResetare: 'COD-SECRET-2026', parolaNoua: 'parola-noua-2' };
  delete process.env.ADMIN_RESET_CODE;
  assert.strictEqual((await call('POST', '/api/profesor/resetare-parola', date)).status, 403);
  process.env.ADMIN_RESET_CODE = 'COD-SECRET-2026';
  try {
    assert.strictEqual((await call('POST', '/api/profesor/resetare-parola', { ...date, codResetare: 'gresit' })).status, 401);
    const r = await call('POST', '/api/profesor/resetare-parola', date);
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await call('GET', '/api/profesor/clase', null, vechi)).status, 401); // sesiunile vechi s-au închis
    assert.strictEqual((await call('POST', '/api/profesor/login', { utilizator: 'prof.reset', parola: 'parola-veche-1' })).status, 401);
    assert.strictEqual((await call('POST', '/api/profesor/login', { utilizator: 'prof.reset', parola: 'parola-noua-2' })).status, 200);
  } finally {
    delete process.env.ADMIN_RESET_CODE;
  }
});

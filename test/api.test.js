'use strict';
// Rulare: npm test  (folosește doar node:test, fără dependențe)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tic-'));
process.env.DATA_FILE = path.join(tmp, 'db.json');
const { start } = require('../server');

let server, base;
test.before(async () => {
  server = await start(0);
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

test('flux complet profesor → elev → progres → resetare PIN', async () => {
  const reg = await call('POST', '/api/teacher/register', { name: 'Ana P.', username: 'ana', password: 'parola-sigura' });
  assert.strictEqual(reg.status, 200);
  const tt = reg.body.token;

  const dup = await call('POST', '/api/teacher/register', { name: 'Xenia', username: 'ana', password: 'parola-sigura' });
  assert.strictEqual(dup.status, 409);

  const k = await call('POST', '/api/teacher/classes', { name: '5A', grade: 5 }, tt);
  assert.strictEqual(k.status, 200);
  assert.match(k.body.code, /^[A-Z2-9]{6}$/);

  // Elevul intră prima dată → cont nou.
  const s1 = await call('POST', '/api/student/login', { classCode: k.body.code.toLowerCase(), pseudonym: 'Vulpea', pin: '1234' });
  assert.strictEqual(s1.status, 200);
  assert.strictEqual(s1.body.created, true);
  const st = s1.body.token;

  // Harta: prima unitate deblocată, restul blocate.
  const map = await call('GET', '/api/student/map', null, st);
  assert.strictEqual(map.body.unitati[0].deblocata, true);
  assert.strictEqual(map.body.unitati[1].deblocata, false);

  // Lecție din unitate blocată → 404; din unitate deblocată → conținut.
  assert.strictEqual((await call('GET', '/api/student/lesson/5.2.1.1', null, st)).status, 404);
  const les = await call('GET', '/api/student/lesson/5.1.1.1', null, st);
  assert.strictEqual(les.status, 200);
  assert.ok(les.body.continut.includes('hardware'));
  // Lecție de la altă clasă → 404.
  assert.strictEqual((await call('GET', '/api/student/lesson/6.1.1.1', null, st)).status, 404);

  assert.strictEqual((await call('POST', '/api/student/progress', { lessonId: '5.1.1.1', status: 'finalizat' }, st)).status, 200);

  // Profesorul vede progresul și deblochează unitatea 2.
  const det = await call('GET', `/api/teacher/classes/${k.body.id}`, null, tt);
  assert.strictEqual(det.body.elevi[0].finalizate, 1);
  await call('POST', `/api/teacher/classes/${k.body.id}/unlock`, { unitId: '5.2', deblocata: true }, tt);
  assert.strictEqual((await call('GET', '/api/student/lesson/5.2.1.1', null, st)).status, 200);

  // Cod de unitate individual.
  const u3code = det.body.unitati[2].cod;
  assert.strictEqual((await call('POST', '/api/student/unlock', { code: u3code }, st)).status, 200);
  assert.strictEqual((await call('GET', '/api/student/lesson/5.3.1.1', null, st)).status, 200);

  // PIN greșit, apoi resetare.
  assert.strictEqual((await call('POST', '/api/student/login', { classCode: k.body.code, pseudonym: 'vulpea', pin: '0000' })).status, 401);
  const reset = await call('POST', `/api/teacher/students/${det.body.elevi[0].id}/reset-pin`, null, tt);
  assert.match(reset.body.pin, /^\d{4}$/);
  // Sesiunea veche a elevului a fost închisă.
  assert.strictEqual((await call('GET', '/api/student/map', null, st)).status, 401);
  if (reset.body.pin !== '1234') {
    assert.strictEqual((await call('POST', '/api/student/login', { classCode: k.body.code, pseudonym: 'Vulpea', pin: '1234' })).status, 401);
  }
  assert.strictEqual((await call('POST', '/api/student/login', { classCode: k.body.code, pseudonym: 'Vulpea', pin: reset.body.pin })).status, 200);

  // Înscriere închisă → elev nou refuzat.
  await call('POST', `/api/teacher/classes/${k.body.id}/join`, { joinOpen: false }, tt);
  assert.strictEqual((await call('POST', '/api/student/login', { classCode: k.body.code, pseudonym: 'Nou', pin: '1111' })).status, 403);
});

test('blocare după 5 PIN-uri greșite', async () => {
  const tt = (await call('POST', '/api/teacher/register', { name: 'Bogdan', username: 'bogdan', password: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/teacher/classes', { name: '6B', grade: 6 }, tt)).body;
  await call('POST', '/api/student/login', { classCode: k.code, pseudonym: 'Lup', pin: '4321' });
  for (let i = 0; i < 5; i++) await call('POST', '/api/student/login', { classCode: k.code, pseudonym: 'Lup', pin: '0000' });
  assert.strictEqual((await call('POST', '/api/student/login', { classCode: k.code, pseudonym: 'Lup', pin: '4321' })).status, 429);
});

test('profesorul nu poate vedea clasa altui profesor', async () => {
  const a = (await call('POST', '/api/teacher/register', { name: 'Cristi', username: 'cris', password: 'parola-sigura' })).body.token;
  const b = (await call('POST', '/api/teacher/register', { name: 'Dana', username: 'dana', password: 'parola-sigura' })).body.token;
  const k = (await call('POST', '/api/teacher/classes', { name: '7C', grade: 7 }, a)).body;
  assert.strictEqual((await call('GET', `/api/teacher/classes/${k.id}`, null, b)).status, 404);
});

test('fișierele statice și path traversal', async () => {
  assert.strictEqual((await fetch(base + '/')).status, 200);
  assert.strictEqual((await fetch(base + '/app.js')).status, 200);
  const r = await fetch(base + '/..%2fserver.js');
  assert.notStrictEqual(r.status, 200);
});

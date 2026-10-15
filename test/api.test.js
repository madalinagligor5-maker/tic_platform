'use strict';
// Rulare: npm test  (folosește doar node:test, fără dependențe)
// Același set de teste rulează pe stocarea locală (fișier) și pe un Upstash Redis simulat.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { start } = require('../server');
const { fileKv, upstashKv } = require('../lib/kv');
const { createHandler } = require('../lib/app');

// Server minimal care imită API-ul REST Upstash (comenzi Redis trimise ca tablou JSON).
function fakeUpstash() {
  const kv = new Map(), sets = new Map(), hashes = new Map();
  const TOKEN = 'secret-test';
  const run = ([c, ...a]) => {
    switch (c.toUpperCase()) {
      case 'GET': return kv.has(a[0]) ? kv.get(a[0]) : null;
      case 'MGET': return a.map((k) => (kv.has(k) ? kv.get(k) : null));
      case 'SET': {
        const nx = a.includes('NX');
        if (nx && kv.has(a[0])) return null;
        kv.set(a[0], a[1]);
        return 'OK';
      }
      case 'DEL': { let n = 0; for (const k of a) n += kv.delete(k) | sets.delete(k) | hashes.delete(k); return n; }
      case 'SADD': { const s = sets.get(a[0]) || new Set(); s.add(a[1]); sets.set(a[0], s); return 1; }
      case 'SREM': { (sets.get(a[0]) || new Set()).delete(a[1]); return 1; }
      case 'SMEMBERS': return [...(sets.get(a[0]) || [])];
      case 'HSET': { const h = hashes.get(a[0]) || new Map(); h.set(a[1], a[2]); hashes.set(a[0], h); return 1; }
      case 'HGETALL': return [...(hashes.get(a[0]) || new Map())].flat();
      default: throw new Error('comandă necunoscută ' + c);
    }
  };
  const server = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
      const cmd = JSON.parse(b);
      if (!cmd.every((x) => typeof x === 'string')) return res.writeHead(400).end(JSON.stringify({ error: 'args must be strings' }));
      try { res.end(JSON.stringify({ result: run(cmd) })); } catch (e) { res.writeHead(400).end(JSON.stringify({ error: e.message })); }
    });
  });
  return new Promise((r) => server.listen(0, () => r({ server, url: `http://localhost:${server.address().port}`, token: TOKEN })));
}

const backends = {
  'fișier local': async () => ({ kv: fileKv(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tic-')), 'db.json')), stop() {} }),
  'Upstash Redis (simulat)': async () => {
    const f = await fakeUpstash();
    return { kv: upstashKv(f.url, f.token), stop: () => f.server.close() };
  },
};

for (const [label, makeBackend] of Object.entries(backends)) test.describe(label, () => {
  let server, base, backend;
  test.before(async () => {
    backend = await makeBackend();
    server = await start(0, backend.kv);
    base = `http://localhost:${server.address().port}`;
  });
  test.after(() => { server.close(); backend.stop(); });

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
});

test('pe Vercel fără Redis: mesaj clar (503), nu eroare criptică', async () => {
  const handler = createHandler(null);
  const res = await new Promise((resolve) => {
    const out = { headers: {}, writeHead(s, h) { this.status = s; Object.assign(this.headers, h); }, end(b) { this.body = b; resolve(this); } };
    handler({ method: 'GET', url: '/api/student/map', headers: {} }, out);
  });
  assert.strictEqual(res.status, 503);
  assert.match(JSON.parse(res.body).error, /Upstash/);
});

test('corpul cererii deja parsat de Vercel (req.body) este acceptat', async () => {
  const kv = fileKv(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tic-')), 'db.json'));
  const handler = createHandler(kv);
  const call = (req) => new Promise((resolve) => {
    const out = { writeHead(s) { this.status = s; }, end(b) { resolve({ status: this.status, body: JSON.parse(b) }); } };
    if (!req.headers) req.headers = {};
    handler(req, out);
  });
  const r = await call({ method: 'POST', url: '/api/teacher/register', body: { name: 'Vercel', username: 'vercel', password: 'parola-sigura' } });
  assert.strictEqual(r.status, 200);
  const bad = await call({ method: 'POST', url: '/api/teacher/login', get body() { throw new Error('Invalid JSON'); } });
  assert.strictEqual(bad.status, 400);
});

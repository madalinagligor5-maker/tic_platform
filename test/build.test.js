'use strict';
// Rulare: npm test – verifică validarea și generarea datelor din materiale/.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build, parseFrontMatter } = require('../scripts/build');

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'edudigi-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, 'materiale', rel)), { recursive: true });
    fs.writeFileSync(path.join(root, 'materiale', rel), content);
  }
  return { src: path.join(root, 'materiale'), out: path.join(root, 'public') };
}
const md = (meta, body = 'Conținut') => `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${body}\n`;
const ok = { titlu: 'Variabile în Python', disciplina: 'Informatică', clasa: '9, 10', categorie: 'Programare', tip: 'Fișă de lucru', data: '2026-10-01' };

test('materialele din repo trec validarea', () => {
  const root = path.join(__dirname, '..');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'edudigi-out-'));
  const r = build({ src: path.join(root, 'materiale'), out });
  assert.deepStrictEqual(r.errors, []);
  assert.ok(r.materials.length > 0);
});

test('acceptă diacritice și majuscule în antet; generează lista și conținutul', () => {
  const p = project({ 'info-9-variabile.md': md(ok, '## Ce sunt variabilele') });
  const r = build(p);
  assert.deepStrictEqual(r.errors, []);
  const json = JSON.parse(fs.readFileSync(path.join(p.out, 'date', 'materiale.json'), 'utf8'));
  assert.deepStrictEqual(json.materiale[0], {
    id: 'info-9-variabile', titlu: 'Variabile în Python', descriere: '', disciplina: 'informatica',
    clasa: [9, 10], categorie: 'programare', tip: 'fisa', data: '2026-10-01', unitate: '', ordine: null, fisier: null, areContinut: true, aplicatii: 0, diapozitive: 0,
  });
  assert.match(fs.readFileSync(path.join(p.out, 'date', 'm', 'info-9-variabile.md'), 'utf8'), /Ce sunt variabilele/);
});

test('atașamentele se copiază, iar materialul poate fi doar un fișier', () => {
  const p = project({
    'tic-7-word.md': md({ ...ok, disciplina: 'tic', categorie: 'aplicatii', tip: 'prezentare', fisier: 'fisiere/Word – introducere.pdf' }, ''),
    'fisiere/Word – introducere.pdf': '%PDF-1.4 test',
  });
  const r = build(p);
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.materials[0].areContinut, false);
  assert.strictEqual(r.materials[0].fisier.ext, 'pdf');
  assert.strictEqual(r.materials[0].fisier.url, 'fisiere/Word%20%E2%80%93%20introducere.pdf');
  assert.ok(fs.existsSync(path.join(p.out, 'fisiere', 'Word – introducere.pdf')));
});

test('greșelile din antet opresc construirea cu mesaje clare', () => {
  const p = project({
    'Nume Gresit.md': md(ok),
    'b.md': md({ ...ok, clasa: '4', categorie: 'istorie' }),
    'c.md': md({ ...ok, fisier: 'fisiere/lipsa.pdf' }),
    'd.md': 'fără antet',
    'e.md': md({ ...ok }, ''),
  });
  const { errors } = build(p);
  const all = errors.join('\n');
  assert.match(all, /Nume Gresit\.md: numele fișierului/);
  assert.match(all, /b\.md: „clasa” trebuie să fie între 5 și 12/);
  assert.match(all, /b\.md: „categorie”/);
  assert.match(all, /c\.md: atașamentul „fisiere\/lipsa\.pdf” nu există/);
  assert.match(all, /d\.md: lipsește antetul/);
  assert.match(all, /e\.md: materialul nu are nici conținut, nici atașament/);
  assert.ok(!fs.existsSync(path.join(p.out, 'date')), 'nu scrie nimic dacă sunt erori');
});

test('fiecare lecție are cel puțin o aplicație interactivă; erorile din aplicații opresc construirea', () => {
  const quiz = '```quiz\nÎntrebare?\n* da\n- nu\n```';
  const p = project({
    'fara.md': md({ ...ok, tip: 'lectie' }, 'Doar text.'),
    'gresit.md': md({ ...ok, tip: 'lectie' }, '```quiz\nÎntrebare?\n- a\n- b\n```'),
    'bun.md': md({ ...ok, tip: 'lectie' }, quiz),
    'fisa.md': md({ ...ok, tip: 'fisa' }, 'Fișele nu sunt obligate să aibă aplicații.'),
  });
  const all = build(p).errors.join('\n');
  assert.match(all, /fara\.md: fiecare lecție trebuie să aibă cel puțin o aplicație interactivă/);
  assert.match(all, /gresit\.md: aplicația 1 \(Quiz, rândul 1 din conținut\): marchează varianta corectă/);
  assert.doesNotMatch(all, /bun\.md|fisa\.md/);
  const p2 = project({ 'bun.md': md({ ...ok, tip: 'lectie' }, quiz) });
  assert.strictEqual(build(p2).materials[0].aplicatii, 1);
});

test('nu permite ieșirea din folderul de atașamente', () => {
  const p = project({ 'a.md': md({ ...ok, fisier: 'fisiere/../../secret.txt' }) });
  assert.match(build(p).errors.join(), /nu există/);
});

test('parseFrontMatter ignoră comentariile și ghilimelele', () => {
  const r = parseFrontMatter('---\n# comentariu\ntitlu: "Test: cu două puncte"\n---\ncorp');
  assert.strictEqual(r.meta.titlu, 'Test: cu două puncte');
  assert.strictEqual(r.body, 'corp');
});

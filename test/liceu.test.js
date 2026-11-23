'use strict';
// Secțiunea „Informatică IX (liceu)”: soluțiile de referință trebuie să treacă toate testele pe interpretorul din Editorul
// Python, codul de pornire nu trebuie să treacă singur, exemplele trebuie să ruleze, iar fiecare unitate are quiz și îndrumar.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const PY = require('../public/js/aplicatii/python.js');

const dir = path.join(__dirname, '../public/js');
for (const f of fs.readdirSync(dir).filter((x) => /^liceu-date-\d+\.js$/.test(x)).sort()) require(path.join(dir, f));
const { UNITATI } = globalThis.LICEU;
UNITATI.sort((a, b) => a.nr - b.nr);

const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
// Un test: { i, o } sau cu fișiere { f: preîncărcate, fo: fișiere așteptate } sau cu acțiuni tkinter { dupa, o } (se compară doar rândurile @R)
function ruleazaTest(cod, t) {
  const program = t.dupa ? `${cod}\n${t.dupa}\n` : cod;
  const r = PY.ruleazaText(program, t.i || '', { fisiere: t.f });
  if (!(r.rez && r.rez.ok)) return { ok: false, r };
  let iesire = r.iesire;
  if (t.dupa) iesire = r.iesire.split('\n').filter((l) => l.startsWith('@R|')).map((l) => l.slice(3)).join('\n');
  let ok = norm(iesire) === norm(t.o || '');
  if (ok && t.fo) for (const [k, v] of Object.entries(t.fo)) if (norm((r.fisiere || {})[k] || '') !== norm(v)) ok = false;
  return { ok, r, iesire };
}
const trece = (cod, teste) => teste.every((t) => ruleazaTest(cod, t).ok);

test('unitățile au id-uri unice și numere consecutive', () => {
  const ids = UNITATI.map((u) => u.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(UNITATI.length >= 1);
});

for (const u of UNITATI) {
  test(`${u.id}: structura unității`, () => {
    assert.ok(u.obiective.length >= 3 && u.teorie.length >= 5 && u.cs.length >= 1);
    assert.ok(u.quiz.length >= 3, 'cel puțin 3 întrebări');
    for (const q of u.quiz) { assert.ok(q.opt.length === 4 && q.ok >= 0 && q.ok < 4 && q.expl && q.nivel); }
    assert.ok(u.prof.scenariu.length >= 3 && u.prof.greseli.length >= 3 && u.prof.diferentiere.remediere && u.prof.diferentiere.aprofundare && u.prof.diferentiere.ces && u.prof.evaluare.length >= 2 && u.prof.metode.length >= 2);
    assert.ok(u.proiect && u.proiect.length > 40);
  });
  if (u.exemplu) test(`${u.id}: exemplul rulează fără erori`, () => {
    const r = PY.ruleazaText(u.exemplu, (u.intrariExemplu || []).join('\n') + '\n');
    assert.ok(r.rez && r.rez.ok, r.rez && r.rez.eroare && r.rez.eroare.text);
  });
  for (const k of ['rem', 'std', 'apr']) {
    const e = u.exercitii && u.exercitii[k];
    if (!e) continue;
    test(`${u.id}/${k}: soluția trece toate testele`, () => {
      assert.ok(e.teste.length >= 3, 'puține teste');
      for (const t of e.teste) {
        const x = ruleazaTest(e.solutie, t);
        assert.ok(x.ok, `intrare ${JSON.stringify(t.i || t.dupa)}: așteptat ${JSON.stringify(t.o)} primit ${JSON.stringify(x.iesire)} ${x.r.rez && x.r.rez.eroare ? x.r.rez.eroare.text : ''}`);
      }
    });
    test(`${u.id}/${k}: codul de pornire nu trece singur`, () => { if (e.start) assert.ok(!trece(e.start, e.teste)); });
    test(`${u.id}/${k}: soluția respectă cerințele de cod`, () => { for (const [sub] of e.cod || []) { if (sub.startsWith('NU:')) assert.ok(!e.solutie.includes(sub.slice(3)), `soluția conține „${sub.slice(3)}”`); else assert.ok(e.solutie.includes(sub), `lipsește „${sub}”`); } });
  }
}

// ---------- Unitatea C++ (regim intensiv): exemplele și soluțiile rulează în Editorul C++ ----------
const CPP = require('../public/js/aplicatii/cpp.js');
const ruleazaCpp = (cod, intrare) => { const r = CPP.executa(cod, intrare); return { r, iesire: CPP.textIesire(r) }; };
for (const u of UNITATI.filter((x) => x.limbaj === 'cpp')) {
  for (const e of u.exempleCpp || []) test(`${u.id}: exemplul C++ „${e.titlu}”`, () => {
    const { r, iesire } = ruleazaCpp(e.cod, e.intrare);
    assert.strictEqual(r.stare, 'gata', JSON.stringify(r.eroare));
    assert.strictEqual(norm(iesire), norm(e.iesire));
  });
  (u.exercitiiCpp || []).forEach((e, k) => {
    test(`${u.id}: exercițiul C++ ${k + 1}: soluția trece testele`, () => {
      for (const t of e.teste) { const { r, iesire } = ruleazaCpp(e.solutie, t.i); assert.strictEqual(r.stare, 'gata', JSON.stringify(r.eroare)); assert.strictEqual(norm(iesire), norm(t.o), `intrare ${JSON.stringify(t.i)}`); }
    });
    test(`${u.id}: exercițiul C++ ${k + 1}: codul de pornire nu trece singur`, () => {
      const trecut = e.teste.every((t) => { const { r, iesire } = ruleazaCpp(e.start, t.i); return r.stare === 'gata' && norm(iesire) === norm(t.o); });
      assert.ok(!trecut);
    });
  });
}

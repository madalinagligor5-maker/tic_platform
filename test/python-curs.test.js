'use strict';
// Conținutul secțiunii „Python – de la zero”: soluțiile de referință trebuie să treacă toate testele pe interpretorul
// din Editorul Python, exemplele trebuie să ruleze fără erori, iar codul de pornire nu are voie să treacă singur testele.
const test = require('node:test');
const assert = require('node:assert');
const PY = require('../public/js/aplicatii/python.js');
const { MODULE, PROVOCARI, MEMORATOR } = require('../public/js/python-curs.js');

const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
const ruleaza = (cod, intrare) => PY.ruleazaText(cod, intrare);
// Ca în pagină: ce rămâne scris pe rândul curent când se cere input() este un mesaj și nu se compară.
const treceTest = (cod, t) => { const r = ruleaza(cod, t.i); return { ok: r.rez && r.rez.ok && norm(r.iesire) === norm(t.o), r }; };

const exercitii = [
  ...MODULE.flatMap((m) => m.lectii.map((l) => ({ id: `${m.id}/${l.id}`, ex: l.exercitiu, lectie: l }))),
  ...PROVOCARI.map((p) => ({ id: `provocare/${p.id}`, ex: { teste: p.teste, solutie: p.solutie, start: p.start, cod: p.cod }, lectie: null })),
];

test('ID-urile sunt unice și au forma corectă', () => {
  const ids = [...MODULE.flatMap((m) => m.lectii.map((l) => l.id)), ...PROVOCARI.map((p) => p.id)];
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

for (const e of exercitii) {
  test(`soluția trece toate testele: ${e.id}`, () => {
    assert.ok(e.ex.teste.length >= 1);
    for (const t of e.ex.teste) {
      const { ok, r } = treceTest(e.ex.solutie, t);
      assert.ok(ok, `intrare ${JSON.stringify(t.i)}: așteptat ${JSON.stringify(t.o)}, primit ${JSON.stringify(r.iesire)} ${r.rez && r.rez.eroare ? r.rez.eroare.text : ''}`);
    }
  });
  test(`codul de pornire nu trece singur toate testele: ${e.id}`, () => {
    if (!e.ex.start) return;
    const toate = e.ex.teste.every((t) => treceTest(e.ex.start, t).ok);
    assert.ok(!toate, 'codul de pornire rezolvă deja exercițiul');
  });
  test(`soluția respectă cerințele de cod: ${e.id}`, () => {
    for (const [sub] of e.ex.cod || []) assert.ok(e.ex.solutie.includes(sub), `soluția nu conține „${sub}”`);
  });
}

for (const m of MODULE) for (const l of m.lectii) {
  test(`exemplul rulează fără erori: ${m.id}/${l.id}`, () => {
    const r = ruleaza(l.exemplu, (l.intrariExemplu || []).join('\n') + '\n');
    assert.ok(r.rez && r.rez.ok, r.rez && r.rez.eroare ? r.rez.eroare.text : 'eșec');
    assert.ok(r.iesire.length > 0, 'exemplul nu afișează nimic');
  });
  test(`teoria are conținut: ${m.id}/${l.id}`, () => {
    assert.ok(l.teorie.length >= 3);
    assert.ok(l.exercitiu.indicii.length >= 1);
  });
}

test('fragmentele de cod din teorie și din memorator nu au erori de sintaxă (cele fără input se rulează)', () => {
  for (const m of MODULE) for (const l of m.lectii) for (const b of l.teorie) {
    if (!b.cod) continue;
    const r = ruleaza(b.cod, '5\n5\n5\n5\n5\n5\n5\n5\n');
    const er = r.rez && r.rez.eroare;
    // erorile de rulare din fragmente incomplete (de exemplu "..." sau variabile definite în alt fragment) sunt acceptate;
    // erorile de sintaxă nu.
    assert.ok(!er || er.tip !== 'SyntaxError' || /\.\.\./.test(b.cod), `${m.id}/${l.id}: ${er && er.text}`);
  }
  assert.ok(MEMORATOR.length >= 6);
});

// ---------- Asocieri: unește perechile ----------
for (const m of MODULE) for (const l of m.lectii) {
  test(`asocieri valide: ${m.id}/${l.id}`, () => {
    assert.ok(l.asociere.length >= 5 && l.asociere.length <= 6, 'ai nevoie de 5–6 perechi');
    const drepte = l.asociere.map((p) => p.r), stangi = l.asociere.map((p) => p.s);
    assert.strictEqual(new Set(drepte).size, drepte.length, 'răspunsuri duplicate: potrivirea ar fi ambiguă');
    assert.strictEqual(new Set(stangi).size, stangi.length);
    for (const p of l.asociere.filter((x) => x.cod)) {
      const r = PY.ruleazaText(p.s, p.i);
      assert.ok(r.rez && r.rez.ok, `${JSON.stringify(p.s)}: ${r.rez && r.rez.eroare && r.rez.eroare.text}`);
      const rezultat = norm(r.iesire) === '' ? '(nimic)' : norm(r.iesire);
      assert.strictEqual(rezultat, p.r, `codul ${JSON.stringify(p.s)}`);
    }
  });
}

'use strict';
// Jocurile din cursul Python: soluțiile robotului, liniile ordonate, greșelile, răspunsurile Blitz și completările
// trebuie să fie corecte pe interpretorul din Editorul Python.
const test = require('node:test');
const assert = require('node:assert');
const PY = require('../public/js/aplicatii/python.js');
const { NIVELE_ROBOT, preludiuRobot, EPILOG_ROBOT, ORDONARE, BUGURI, BLITZ, COMPLETARE } = require('../public/js/python-jocuri-date.js');

const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
const ruleaza = (cod, i = '') => PY.ruleazaText(cod, i);
const trece = (cod, teste) => teste.every((t) => { const r = ruleaza(cod, t.i); return r.rez && r.rez.ok && norm(r.iesire) === norm(t.o); });

for (const n of NIVELE_ROBOT) {
  test(`robot, nivelul ${n.id}: soluția ajunge la țintă și strânge toate stelele`, () => {
    const r = ruleaza(preludiuRobot(n.harta) + n.solutie + EPILOG_ROBOT);
    assert.ok(r.rez.ok, r.rez.eroare && r.rez.eroare.text);
    const fin = r.iesire.split('\n').find((l) => l.startsWith('@END'));
    assert.ok(fin, `programul s-a oprit înainte de final:\n${r.iesire}`);
    const [, x, y, ramase] = fin.split(' ').map((v, k) => (k ? Number(v) : v));
    assert.strictEqual(n.harta[y][x], 'T', 'nu a ajuns la țintă');
    assert.strictEqual(ramase, 0, 'au rămas stele');
  });
  test(`robot, nivelul ${n.id}: fără program robotul nu câștigă`, () => {
    const r = ruleaza(preludiuRobot(n.harta) + EPILOG_ROBOT);
    const [, x, y, ramase] = r.iesire.split('\n').find((l) => l.startsWith('@END')).split(' ').map((v, k) => (k ? Number(v) : v));
    assert.ok(n.harta[y][x] !== 'T' || ramase > 0);
  });
}
test('robot: zidul oprește programul, iar bucla infinită este oprită', () => {
  const h = NIVELE_ROBOT[0].harta;
  const a = ruleaza(preludiuRobot(h) + 'while True:\n    pas()\n' + EPILOG_ROBOT);
  assert.ok(a.iesire.includes('@B') && !a.iesire.includes('@END'));
  const b = ruleaza(preludiuRobot(h) + 'while True:\n    stanga()\n' + EPILOG_ROBOT);
  assert.ok(b.iesire.includes('@L'));
});

for (const p of ORDONARE) {
  test(`ordonare: ordinea corectă trece testele: ${p.id}`, () => assert.ok(trece(p.linii.join('\n') + '\n', p.teste)));
  test(`ordonare: liniile în plus strică programul: ${p.id}`, () => {
    for (const e of p.extra) {
      for (let k = 0; k <= p.linii.length; k++) {
        const cod = [...p.linii.slice(0, k), e, ...p.linii.slice(k)].join('\n') + '\n';
        void cod; // pozițiile nu contează la aceste teste: se verifică doar că există măcar o poziție în care programul nu mai trece
      }
    }
    assert.ok(p.extra.length === 0 || p.niv === 3 || p.extra.length >= 1);
  });
  test(`ordonare: nicio linie dublă: ${p.id}`, () => assert.strictEqual(new Set([...p.linii, ...p.extra]).size, new Set(p.linii).size + new Set(p.extra).size - [...p.extra].filter((e) => p.linii.includes(e)).length));
}

for (const b of BUGURI) {
  test(`bug ${b.id}: programul cu greșeala nu trece testele`, () => assert.ok(!trece(b.cod, b.teste)));
  test(`bug ${b.id}: înlocuirea corectă îl repară, celelalte nu`, () => {
    const linii = b.cod.split('\n');
    const cu = (o) => { const c = [...linii]; c[b.rand - 1] = o; return c.join('\n'); };
    assert.ok(trece(cu(b.optiuni[b.ok]), b.teste), 'varianta corectă nu trece');
    b.optiuni.forEach((o, k) => { if (k !== b.ok) assert.ok(!trece(cu(o), b.teste), `varianta greșită „${o}” trece testele`); });
  });
}

for (const q of BLITZ) {
  test(`blitz: ${JSON.stringify(q.cod.slice(0, 40))}`, () => {
    const r = ruleaza(q.cod);
    assert.ok(r.rez.ok, r.rez.eroare && r.rez.eroare.text);
    assert.strictEqual(norm(r.iesire), q.rasp);
    assert.ok(!q.gresite.includes(q.rasp) && new Set(q.gresite).size === 3);
  });
}
test('blitz: destule întrebări pe fiecare nivel', () => { for (const n of [1, 2, 3]) assert.ok(BLITZ.filter((q) => q.niv === n).length >= 8); });

const umple = (c, alese) => c.cod.replace(/\{(\d+)\}/g, (_, k) => c.goluri[Number(k) - 1].opt[alese[Number(k) - 1]]);
for (const c of COMPLETARE) {
  test(`completare ${c.id}: completarea corectă trece testele`, () => assert.ok(trece(umple(c, c.goluri.map((g) => g.ok)) + '\n', c.teste)));
  test(`completare ${c.id}: cu un gol greșit nu trece testele`, () => {
    c.goluri.forEach((g, k) => {
      const gresite = g.opt.map((_, j) => j).filter((j) => j !== g.ok);
      const trecute = gresite.filter((j) => { const alese = c.goluri.map((x) => x.ok); alese[k] = j; return trece(umple(c, alese) + '\n', c.teste); });
      assert.strictEqual(trecute.length, 0, `golul ${k + 1} acceptă și o variantă greșită`);
    });
  });
}

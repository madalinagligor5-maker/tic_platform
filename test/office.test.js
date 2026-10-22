'use strict';
const test = require('node:test');
const assert = require('node:assert');
const O = require('../public/js/office');
const T = require('../public/js/teste-core');
const { extract } = require('../public/js/interactive');

test('motorul de formule: operatori, funcții, erori', () => {
  const s = new O.Sheet({ A1: { raw: '2' }, A2: { raw: '3,5' }, A3: { raw: '=SUM(A1:A2)*2' }, B1: { raw: '=A1/0' }, B2: { raw: '=MEDIE(A1:A2)' }, B3: { raw: '=DACA(A3>10;"da";"nu")' }, C1: { raw: '=C2' }, C2: { raw: '=C1' }, C3: { raw: '=FOO(1)' } });
  assert.strictEqual(s.value('A3'), 11);
  assert.strictEqual(s.display('A2'), '3,5');
  assert.strictEqual(s.display('B1'), '#DIV/0!');
  assert.strictEqual(s.value('B2'), 2.75);
  assert.strictEqual(s.value('B3'), 'da');
  assert.strictEqual(s.display('C1'), '#CICLU!');
  assert.strictEqual(s.display('C3'), '#NUME?');
  assert.strictEqual(s.evaluate('2+3*4^2'), 50);
  assert.strictEqual(s.evaluate('-A1+ROUND(10/3,2)'), 1.33);
  assert.strictEqual(s.evaluate('MAX(A1:A2;7)&"!"'), '7!');
  assert.strictEqual(O.shiftFormula('=A1+$B$2+B$3', 2, 1), '=B3+$B$2+C$3');
});

test('sarcina de foaie de calcul: formule copiate, funcții cerute, formatare', () => {
  const t = O.parseSheetTask('Date:\nProdus;Preț;Cantitate;Total\nCaiet;3,5;4\nPix;2;10\nCerințe:\n- D2:D3: =B2*C2 | totalul\n- B5: =SUM(D2:D3)\n- A1:D1: aldin\n- B5: 2 zecimale');
  assert.deepStrictEqual(t.errors, []);
  const cells = O.cellsFromGrid(t.data.grid);
  assert.deepStrictEqual(O.checkSheet(t.data, cells).map((x) => x.ok), [false, false, false, false]);
  Object.assign(cells, { D2: { raw: '=B2*C2' }, D3: { raw: '=C3*B3' }, B5: { raw: '=SUMA(D2:D3)', decimals: 2 } });
  for (const r of ['A1', 'B1', 'C1', 'D1']) cells[r].bold = true;
  assert.deepStrictEqual(O.checkSheet(t.data, cells).map((x) => x.ok), [true, true, true, true]);
  // Valoarea scrisă de mână nu este formulă; suma fără SUM nu respectă cerința.
  Object.assign(cells, { D3: { raw: '20' }, B5: { raw: '=D2+D3', decimals: 2 } });
  assert.deepStrictEqual(O.checkSheet(t.data, cells).map((x) => x.ok), [false, false, true, true]);
  assert.match(O.parseSheetTask('Cerințe:\n- Z99: 5').errors.join(), /în afara foii/);
});

test('sarcina de procesor de text se validează', () => {
  const d = O.parseDocTask('Text:\nTitlu\nUn text cu un cuvânt.\nCerințe:\n- titlul: aldin, centrat, mărime 18\n- „cuvânt”: culoare roșie\n- paragraful 2: justificat, font Arial');
  assert.deepStrictEqual(d.errors, []);
  assert.deepStrictEqual(d.data.cerinte[0].props, [{ k: 'bold' }, { k: 'align', v: 'center' }, { k: 'size', v: 18 }]);
  const bad = O.parseDocTask('Text:\nTitlu\nCerințe:\n- paragraful 5: aldin\n- „lipsă”: strălucitor\n- „Titlu”: centrat');
  assert.strictEqual(bad.errors.length, 4);
});

test('notarea testelor pe tipuri de itemi', () => {
  const md = [
    '```quiz puncte=20', 'Î1?', '- a', '* b', '', 'Î2?', '* x', '* y', '- z', '```',
    '```adevarat-fals', 'A: unu', 'F: doi', '```',
    '```categorii puncte=4', 'C1: a, b', 'C2: c, d', '```',
    '```ordonare', 'p1', 'p2', 'p3', '```',
    '```completare', 'Un [bit] și un [octet|byte].', '```',
    '```calcul-tabelar', 'Date:', '1;2', 'Cerințe:', '- C1: =A1+B1', '```',
    '```procesor-text', 'Text:', 'T', 'Cerințe:', '- titlul: aldin', '- titlul: centrat', '```',
    '```eseu puncte=6', 'Explică.', 'Barem: ceva', '```',
  ].join('\n');
  const blocks = extract(md);
  assert.deepStrictEqual(blocks.map((b) => b.errors), blocks.map(() => []));
  assert.deepStrictEqual(T.infoTest(blocks), { nrItemi: 8, puncte: 20 + 10 + 4 + 10 + 10 + 10 + 10 + 6 });
  const r = T.noteazaTest(blocks, [
    [[1], [0, 1]],
    [true, true],
    { a: 'C1', b: 'C2', c: 'C2', d: 'C2' },
    ['p1', 'p3', 'p2'],
    ['BIT', 'byte'],
    { C1: { raw: '=A1+B1' } },
    { verificari: [true, false] },
    'Răspunsul meu',
  ]);
  assert.deepStrictEqual(r.detalii.map((d) => d.punctaj), [20, 5, 3, 3.33, 10, 10, 5, null]);
  assert.strictEqual(r.inAsteptare, 1);
  const m = T.noteazaTest(blocks, [], { 7: 6 });
  assert.strictEqual(m.punctaj, 6);
  assert.strictEqual(m.inAsteptare, 0);
  assert.strictEqual(T.nota(80, 80), 10);
  assert.strictEqual(T.nota(0, 80), 1);
  // Varianta pentru elev nu conține răspunsurile.
  const elev = JSON.stringify(T.testPentruElev(blocks));
  assert.ok(!/correct|answer|barem|ceva|=A1\+B1/.test(elev), elev);
});

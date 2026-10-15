'use strict';
// Rulare: npm test – verifică parsarea aplicațiilor interactive.
const test = require('node:test');
const assert = require('node:assert');
const { parse, extract, typeOf } = require('../public/js/interactive');

test('quiz: un răspuns, mai multe răspunsuri, explicație și titlu', () => {
  const r = parse('quiz', '# Alege\nCe e de intrare?\n- Monitorul\n* Tastatura\nExplicație: trimite date\n\nCare sunt sisteme de calcul?\n* Telefonul\n* Laptopul\n- Creionul');
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.title, 'Alege');
  assert.strictEqual(r.data.questions.length, 2);
  assert.strictEqual(r.data.questions[0].multi, false);
  assert.strictEqual(r.data.questions[0].explain, 'trimite date');
  assert.strictEqual(r.data.questions[1].multi, true);
});

test('quiz: erori clare', () => {
  assert.match(parse('quiz', 'Întrebare?\n- a\n- b').errors.join(), /marchează varianta corectă/);
  assert.match(parse('quiz', 'Întrebare?\n* a').errors.join(), /cel puțin 2 variante/);
  assert.match(parse('quiz', 'Întrebare?\n* a\n- b\nceva în plus').errors.join(), /nu e nici variantă/);
});

test('adevărat/fals cu explicație', () => {
  const r = parse('adevarat-fals', 'A: Mouse-ul e de intrare.\nF: Jocul e hardware. | E software.\nceva greșit');
  assert.strictEqual(r.data.items.length, 2);
  assert.deepStrictEqual(r.data.items[1], { text: 'Jocul e hardware.', answer: false, explain: 'E software.' });
  assert.match(r.errors.join(), /„A:” sau „F:”/);
});

test('categorii: minim 2 categorii, fără elemente duplicate', () => {
  assert.deepStrictEqual(parse('categorii', 'Intrare: tastatură, mouse\nIeșire: monitor').errors, []);
  assert.match(parse('categorii', 'Intrare: tastatură').errors.join(), /cel puțin 2 categorii/);
  assert.match(parse('categorii', 'A: x, y\nB: X').errors.join(), /apare de două ori/);
});

test('ordonare elimină numerotarea', () => {
  assert.deepStrictEqual(parse('ordonare', '1. Pornești\n2) Deschizi\n- Închizi').data.steps, ['Pornești', 'Deschizi', 'Închizi']);
  assert.match(parse('ordonare', 'Un singur pas').errors.join(), /cel puțin 2 pași/);
});

test('completare: răspunsuri alternative și paragrafe', () => {
  const r = parse('completare', 'Datele [intră] și\n[ies|se afișează].\n\nAl doilea [paragraf].');
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.data.paras.length, 2);
  assert.deepStrictEqual(r.data.paras[0][3], { answers: ['ies', 'se afișează'] });
  assert.match(parse('completare', 'Fără spații.').errors.join(), /paranteze drepte/);
});

test('cartonașe și tipuri cu diacritice', () => {
  assert.strictEqual(parse('cartonase', 'Hardware = partea fizică\nSoftware = programele').data.cards.length, 2);
  assert.strictEqual(typeOf('cartonașe'), 'cartonase');
  assert.strictEqual(typeOf('python'), null);
});

test('extract găsește doar blocurile interactive', () => {
  const md = '# Lecție\n```python\nprint(1)\n```\n\n```quiz\nÎntrebare?\n* da\n- nu\n```\n';
  const blocks = extract(md);
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].type, 'quiz');
  assert.strictEqual(blocks[0].line, 6);
});

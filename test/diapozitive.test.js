'use strict';
// Rulare: npm test – verifică parsarea prezentărilor edudigi (blocuri ```diapozitive).
const test = require('node:test');
const assert = require('node:assert');
const { parse, extract, isDeck } = require('../public/js/diapozitive');

test('diapozitive: titlu, temă, diapozitive și note', () => {
  const d = parse('# Internetul\ntema: Albastru\n## Ce este?\nO rețea de rețele.\nNote: întreabă clasa\n---\n## Servicii\n- e-mail\n- WWW\n\n---\n');
  assert.deepStrictEqual(d.errors, []);
  assert.strictEqual(d.title, 'Internetul');
  assert.strictEqual(d.tema, 'albastru');
  assert.strictEqual(d.slides.length, 2);
  assert.strictEqual(d.slides[0].md, '## Ce este?\nO rețea de rețele.');
  assert.strictEqual(d.slides[0].notes, 'întreabă clasa');
  assert.strictEqual(d.slides[1].notes, '');
});

test('diapozitive: fără antet se folosesc valorile implicite', () => {
  const d = parse('## Unu\n---\n## Doi');
  assert.deepStrictEqual(d.errors, []);
  assert.strictEqual(d.title, '');
  assert.strictEqual(d.tema, 'rosu');
  assert.strictEqual(d.slides.length, 2);
});

test('diapozitive: erori clare', () => {
  assert.match(parse('tema: galben\n## A').errors.join(), /tema „galben” nu există/);
  assert.match(parse('# Doar titlu').errors.join(), /niciun diapozitiv/);
  assert.match(parse('## A\n---\nNote: fără conținut').errors.join(), /doar note/);
});

test('extract găsește doar prezentările', () => {
  const md = 'Text\n\n```quiz\nÎ?\n* a\n- b\n```\n\n```diapozitive\n## A\n---\n## B\n```\n\n```prezentare\n## C\n```';
  const decks = extract(md);
  assert.strictEqual(decks.length, 2);
  assert.strictEqual(decks[0].slides.length, 2);
  assert.strictEqual(decks[0].line, 9);
  assert.ok(isDeck('Diapozitive') && !isDeck('quiz'));
});

test('curata: păstrează doar câmpurile cunoscute și verifică limitele', () => {
  const { curata } = require('../public/js/diapozitive');
  const { prezentare, errors } = curata({ titlu: '  ', tema: 'galben', diapozitive: [{ aspect: 'ciudat', titlu: 'A', x: 1 }] });
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(prezentare.titlu, 'Prezentare fără titlu');
  assert.strictEqual(prezentare.tema, 'rosu');
  assert.deepStrictEqual(prezentare.diapozitive[0], {
    aspect: 'text', titlu: 'A', text: '', imagine: '', note: '', tranzitie: 'niciuna', animatie: 'niciuna',
    stil: { aliniere: 'auto', marime: 'normal', culoare: 'implicit' },
  });
  assert.strictEqual(prezentare.raport, '16:9');
  const s2 = curata({ tema: 'mov', raport: '4:3', diapozitive: [{ tranzitie: 'zoom', animatie: 'zbor', stil: { aliniere: 'centru', marime: 'urias', culoare: 'verde' } }] }).prezentare;
  assert.deepStrictEqual([s2.tema, s2.raport, s2.diapozitive[0].tranzitie, s2.diapozitive[0].animatie], ['mov', '4:3', 'zoom', 'zbor']);
  assert.deepStrictEqual(s2.diapozitive[0].stil, { aliniere: 'centru', marime: 'normal', culoare: 'verde' });
  assert.match(curata({ diapozitive: [{ imagine: 'data:image/svg+xml;base64,AAAA' }] }).errors.join(), /imaginea/);
  assert.match(curata({ diapozitive: Array(41).fill({}) }).errors.join(), /cel mult 40/);
  assert.match(curata({ diapozitive: [{ text: 'x'.repeat(1501) }] }).errors.join(), /textul/);
});

test('randuri: liste și formatare (aldin, cursiv, subliniat)', () => {
  const { randuri } = require('../public/js/diapozitive');
  const r = randuri('- **a** b *c* __d__\ntext simplu');
  assert.strictEqual(r[0].lista, true);
  assert.deepStrictEqual(r[0].bucati, [{ text: 'a', b: true }, { text: ' b ' }, { text: 'c', i: true }, { text: ' ' }, { text: 'd', u: true }]);
  assert.deepStrictEqual(r[1], { lista: false, bucati: [{ text: 'text simplu' }] });
});

test('sfaturi de design', () => {
  const { sfaturi } = require('../public/js/diapozitive');
  const d = (o) => ({ aspect: 'text', titlu: '', text: '', imagine: '', stil: {}, ...o });
  assert.deepStrictEqual(sfaturi(d({ aspect: 'titlu', titlu: 'Apa' }), 0), []);
  assert.match(sfaturi(d({}), 0).join(), /diapozitivul de titlu/);
  assert.match(sfaturi(d({ text: Array(41).fill('apa').join(' ') }), 1).join(), /41 de cuvinte/);
  assert.match(sfaturi(d({ text: '1\n2\n3\n4\n5\n6\n7\n8' }), 1).join(), /8 rânduri/);
  assert.match(sfaturi(d({ aspect: 'imagine' }), 1).join(), /imagine/);
});

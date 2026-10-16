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
  assert.match(parse('tema: mov\n## A').errors.join(), /tema „mov” nu există/);
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
  const { prezentare, errors } = curata({ titlu: '  ', tema: 'mov', diapozitive: [{ aspect: 'ciudat', titlu: 'A', x: 1 }] });
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(prezentare.titlu, 'Prezentare fără titlu');
  assert.strictEqual(prezentare.tema, 'rosu');
  assert.deepStrictEqual(prezentare.diapozitive[0], { aspect: 'text', titlu: 'A', text: '', imagine: '', note: '' });
  assert.match(curata({ diapozitive: [{ imagine: 'data:image/svg+xml;base64,AAAA' }] }).errors.join(), /imaginea/);
  assert.match(curata({ diapozitive: Array(41).fill({}) }).errors.join(), /cel mult 40/);
  assert.match(curata({ diapozitive: [{ text: 'x'.repeat(1501) }] }).errors.join(), /textul/);
});

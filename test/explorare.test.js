'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../public/js/explorare');
const I = require('../public/js/interactive');

test('explorarea păstrează exemplele HTML ca text și este recunoscută în lecție', () => {
  const blocks = I.extract('```explorare\n# HTML\nTitlu | Descrie secțiunea. | <h1>Salut</h1>\nText | Conține o idee. | <p>Bun venit</p>\n```');
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].errors, []);
  assert.equal(blocks[0].data.steps[0][2], '<h1>Salut</h1>');
});

test('explorarea respinge pașii incompleți și numărul nepotrivit de pași', () => {
  assert.ok(parse('Titlu | Explicație').errors.length);
  assert.ok(parse('Titlu | Explicație | Exemplu').errors.length);
  assert.ok(parse(Array(7).fill('Titlu | Explicație | Exemplu').join('\n')).errors.length);
  assert.deepEqual(parse('A | explicație | exemplu\nB | explicație | exemplu').errors, []);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generate } = require('../scripts/seo');

function fixture(t, site) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'edudigi-seo-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  generate({ out, site, materials: [{ id: 'hardware', titlu: 'Hardware', descriere: 'Componentele calculatorului.', disciplina: 'tic', tip: 'lectie', clasa: [5], data: '2026-11-10', imagini: [{ src: 'fisiere/imagini/hardware.jpg', alt: 'Un calculator.' }] }], bodies: { hardware: '## Calculatorul\n\nO lecție.' }, discipline: { tic: 'TIC' }, tipuri: { lectie: 'Lecție' }, interactiv: new Set() });
  return (file) => fs.readFileSync(path.join(out, file), 'utf8');
}

for (const site of ['https://edudigi.ro/', 'https://www.edudigi.ro/', 'http://edudigi.ro']) {
  test(`sitemap și canonical folosesc destinația finală pentru ${site}`, (t) => {
    const read = fixture(t, site);
    const xml = read('sitemap.xml');
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const u of ['/', '/lectii/', '/lectii/clasa-5.html', '/lectii/hardware.html', '/aplicatii/', '/aplicatii/cpp.html', '/resurse/', '/glosar/', '/pentru-profesori.html', '/intrebari-frecvente.html']) {
      assert.ok(urls.includes(`https://www.edudigi.ro${u}`), `lipsește ${u} din sitemap`);
    }
    assert.equal(new Set(urls).size, urls.length, 'adrese duplicate în sitemap');
    for (const url of urls) {
      assert.equal(new URL(url).origin, 'https://www.edudigi.ro');
      assert.equal(new URL(url).hash, '');
      if (url.endsWith('.html')) {
        const page = read(new URL(url).pathname.slice(1));
        assert.ok(page.includes(`rel="canonical" href="${url}"`));
        assert.ok(!page.includes('https://edudigi.ro/'));
      }
    }
    assert.match(xml, /<image:loc>https:\/\/www\.edudigi\.ro\/fisiere\//);
    assert.match(read('robots.txt'), /Sitemap: https:\/\/www\.edudigi\.ro\/sitemap\.xml/);
  });
}

test('generarea păstrează un domeniu personalizat de test', (t) => {
  const read = fixture(t, 'https://exemplu.test/');
  assert.match(read('lectii/hardware.html'), /rel="canonical" href="https:\/\/exemplu\.test\/lectii\/hardware\.html"/);
});

test('pagina principală declară domeniul final, la fel ca lecțiile', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/www\.edudigi\.ro\/"/);
  assert.ok(!html.includes('https://edudigi.ro/'));
});

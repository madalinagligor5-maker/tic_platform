'use strict';
// Laboratorul: procesor de text și foaie de calcul, de folosit liber, direct în browser.
// Lucrul se păstrează pe calculatorul elevului (localStorage) și se poate descărca pentru Word / Excel.
(() => {
  const { h, show, routes } = window.EduApp;
  const O = window.EduOffice;
  const citeste = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const scrie = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* fără stocare */ } };
  function descarca(nume, continut, tip) {
    const a = h('a', { href: URL.createObjectURL(new Blob([continut], { type: tip })), download: nume });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const antet = (kicker, titlu, text) => h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, kicker), h('h1', {}, titlu), text ? h('p', { class: 'muted' }, text) : null);

  routes.push({ pattern: /^\/laborator$/, handler: async () => {
    show(h('div', { class: 'wrap list-page' },
      antet('Laborator', 'Aplicații de birou în browser', 'Exersează fără să instalezi nimic. Ce lucrezi rămâne pe acest calculator și poate fi descărcat pentru Word sau Excel.'),
      h('div', { class: 'lab-grid' },
        h('a', { class: 'lab-card word', href: '#/laborator/text' },
          h('span', { class: 'office-badge word big' }, 'W'),
          h('h2', {}, 'Procesor de text'),
          h('p', {}, 'Scrie și formatează documente: fonturi, mărimi, culori, aldin, cursiv, aliniere, liste.'),
          h('span', { class: 'btn small' }, 'Deschide')),
        h('a', { class: 'lab-card excel', href: '#/laborator/tabel' },
          h('span', { class: 'office-badge excel big' }, 'X'),
          h('h2', {}, 'Foaie de calcul'),
          h('p', {}, 'Tabele cu formule și funcții (SUM, AVERAGE, MIN, MAX, IF), formatare și însumare automată.'),
          h('span', { class: 'btn small' }, 'Deschide'))),
      h('section', { class: 'card-box' },
        h('h2', {}, 'Lecții cu aplicații practice'),
        h('p', {}, 'Sarcinile din lecții se verifică automat: ', h('a', { href: '#/m/tic-7-procesorul-de-text' }, 'Procesorul de text'), ' · ', h('a', { href: '#/m/tic-8-calcul-tabelar' }, 'Calcul tabelar'), '.'))));
  } });

  routes.push({ pattern: /^\/laborator\/text$/, handler: async () => {
    const KEY = 'edudigi_lab_text';
    const doc = O.createDocEditor({ paragrafe: ['Titlul documentului', 'Scrie aici textul tău...'], titlu: 'Documentul meu' });
    const salvat = citeste(KEY);
    if (salvat) doc.editor.replaceChildren(O.docSigur(salvat));
    let t = null;
    doc.editor.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => scrie(KEY, doc.html()), 800); });
    const docx = () => {
      // Word deschide direct un document HTML salvat cu extensia .doc.
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Document</title></head><body style="font-family:Calibri;font-size:11pt">${doc.html()}</body></html>`;
      descarca('document-edudigi.doc', '﻿' + html, 'application/msword');
    };
    show(h('div', { class: 'wrap lab-page' },
      h('p', { class: 'crumbs' }, h('a', { href: '#/laborator' }, '← Laborator')),
      antet('Laborator', 'Procesor de text', 'Selectează textul, apoi alege formatarea din bara de instrumente. Lucrul se salvează automat pe acest calculator.'),
      doc.el,
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', type: 'button', onclick: docx }, '⬇ Descarcă pentru Word (.doc)'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => window.print() }, 'Tipărește'),
        h('button', { class: 'btn ghost danger', type: 'button', onclick: () => {
          if (!confirm('Ștergi tot documentul și începi unul nou?')) return;
          doc.editor.replaceChildren(h('p', {}, h('br')));
          scrie(KEY, null);
        } }, 'Document nou'))));
  } });

  routes.push({ pattern: /^\/laborator\/tabel$/, handler: async () => {
    const KEY = 'edudigi_lab_tabel';
    const sh = O.createSheet({ grid: [], cols: 12, rows: 30, titlu: 'Registrul meu' });
    const salvat = citeste(KEY);
    if (salvat) sh.setCells(salvat);
    sh.onChange(() => scrie(KEY, sh.getCells()));
    show(h('div', { class: 'wrap lab-page' },
      h('p', { class: 'crumbs' }, h('a', { href: '#/laborator' }, '← Laborator')),
      antet('Laborator', 'Foaie de calcul', 'Clic pe o celulă și scrie. Formulele încep cu = (ex. =SUM(B2:B5), =AVERAGE(B2:D2), =B2*C2). Enter confirmă, săgețile mută selecția.'),
      sh.el,
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => descarca('tabel-edudigi.csv', '﻿' + sh.csv(), 'text/csv;charset=utf-8') }, '⬇ Descarcă pentru Excel (.csv)'),
        h('button', { class: 'btn ghost danger', type: 'button', onclick: () => {
          if (!confirm('Ștergi tot tabelul?')) return;
          sh.setCells({});
          scrie(KEY, null);
        } }, 'Tabel nou')),
      h('details', { class: 'card-box help' }, h('summary', {}, 'Funcții disponibile'),
        h('p', {}, 'SUM / SUMA, AVERAGE / MEDIE, MIN, MAX, COUNT, COUNTA, IF / DACA, ROUND, ABS, AND, OR, NOT, CONCAT. Operatori: + − * / ^, comparații (> < >= <= = <>) și & pentru text. Între argumente poți folosi ; sau ,.'))));
  } });
})();

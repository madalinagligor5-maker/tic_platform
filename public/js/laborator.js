'use strict';
// Laboratorul: Document (procesor de text) și Registru (foaie de calcul), ca aplicații complete în browser.
// Fișierele se păstrează în browser (IndexedDB) și se pot descărca pentru Word (.doc) sau Excel (.xlsx).
(() => {
  const { h, show, routes } = window.EduApp;
  const O = window.EduOffice;
  const U = window.EduOfficeUI;
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));

  // ---------- Stocare: IndexedDB (încap și imagini), cu localStorage de rezervă ----------
  const DB = 'edudigi-laborator', ST = 'fisiere';
  let dbP = null;
  function deschideDB() {
    if (!dbP) dbP = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('fără IndexedDB'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbP;
  }
  const LS = 'edudigi_lab_fisiere';
  const lsToate = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
  const lsScrie = (a) => { localStorage.setItem(LS, JSON.stringify(a)); };
  const tx = async (mod, fn) => {
    const db = await deschideDB();
    return new Promise((res, rej) => {
      const t = db.transaction(ST, mod);
      const r = fn(t.objectStore(ST));
      t.oncomplete = () => res(r?.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Spațiul de stocare este plin.'));
    });
  };
  // Fără IndexedDB (de exemplu în unele ferestre private): localStorage, mai mic.
  const areIDB = () => deschideDB().then(() => true, () => false);
  const store = {
    async toate() { return (await areIDB()) ? tx('readonly', (s) => s.getAll()) : lsToate(); },
    async get(id) { return (await areIDB()) ? tx('readonly', (s) => s.get(id)) : lsToate().find((f) => f.id === id); },
    async put(f) { if (await areIDB()) return tx('readwrite', (s) => s.put(f)); const a = lsToate().filter((x) => x.id !== f.id); a.push(f); lsScrie(a); },
    async del(id) { if (await areIDB()) return tx('readwrite', (s) => s.delete(id)); lsScrie(lsToate().filter((f) => f.id !== id)); },
  };
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const TIP = { text: { ruta: 'text', nume: 'Document', badge: 'W', cls: 'word', implicit: 'Document' }, tabel: { ruta: 'tabel', nume: 'Registru', badge: 'X', cls: 'excel', implicit: 'Registru' } };
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: d.getFullYear() === azi.getFullYear() ? undefined : 'numeric' })}, ${ora}`;
  };
  async function numeLiber(tip, baza) {
    const toate = (await store.toate()).filter((f) => f.tip === tip).map((f) => f.titlu);
    if (!toate.includes(baza)) return baza;
    let i = 2;
    while (toate.includes(`${baza} ${i}`)) i++;
    return `${baza} ${i}`;
  }
  async function creeaza(tip, titlu, stare) {
    const f = { id: idNou(), tip, titlu: await numeLiber(tip, titlu), stare, creat: Date.now(), actualizat: Date.now() };
    await store.put(f);
    location.hash = `#/laborator/${TIP[tip].ruta}/${f.id}`;
  }

  // ---------- Șabloane ----------
  const p = (t, st = '') => `<p${st ? ` style="${st}"` : ''}>${t}</p>`;
  const SABLOANE_TEXT = [
    { id: 'gol', nume: 'Document necompletat', desc: 'Pagină albă', mini: [], stare: { html: '<p><br></p>' } },
    { id: 'invitatie', nume: 'Invitație', desc: 'Titlu mare, centrat, culori', mini: ['t', 'poza', 'c', 'c'],
      stare: { culoarePagina: '#FFF8E7', html: `<h1 style="text-align: center;"><span style="color: rgb(194, 24, 91);">Ești invitat!</span></h1>${p('🎉 🎈 🎂', 'text-align: center; font-size: 28pt;')}${p('<b>La petrecerea aniversară a Mariei</b>', 'text-align: center; font-size: 16pt;')}${p('Sâmbătă, 15 noiembrie, ora 16:00', 'text-align: center;')}${p('Str. Florilor nr. 10', 'text-align: center;')}${p('<i>Te așteptăm cu drag!</i>', 'text-align: center;')}` } },
    { id: 'scrisoare', nume: 'Scrisoare', desc: 'Dată, formulă de adresare, semnătură', mini: ['s', '', '', ''],
      stare: { html: `${p(new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }), 'text-align: right;')}${p('Dragă bunico,')}${p('Îți scriu ca să-ți povestesc ce am mai făcut în ultima vreme. La școală am învățat să lucrez cu un procesor de text și acum pot scrie scrisori frumoase pe calculator.', 'text-align: justify;')}${p('Abia aștept să ne vedem în vacanță!', 'text-align: justify;')}${p('Cu drag,', 'text-align: right;')}${p('<b>Nepoțelul tău</b>', 'text-align: right;')}` } },
    { id: 'referat', nume: 'Referat', desc: 'Titlu, capitole, bibliografie', mini: ['t', 's', '', 's'],
      stare: { html: `<h1>Titlul referatului</h1>${p('<i>Autor: Numele elevului, clasa a V-a</i>')}<h2>Introducere</h2>${p('Scrie aici despre ce este vorba în referat și de ce ai ales această temă.', 'text-align: justify;')}<h2>Cuprins</h2>${p('Prezintă informațiile principale. Poți adăuga imagini din fila Inserare → Imagine.', 'text-align: justify;')}<h2>Concluzii</h2>${p('Ce ai aflat? Ce ți s-a părut cel mai interesant?', 'text-align: justify;')}<h2>Bibliografie</h2><ol><li>Manualul de Informatică și TIC</li><li>https://edudigi.ro</li></ol>` } },
    { id: 'afis', nume: 'Afiș', desc: 'Anunț cu text mare', mini: ['t', 'poza', 'l', 'c'],
      stare: { culoarePagina: '#EEF6FF', html: `<h1 style="text-align: center;"><span style="font-size: 48pt; color: rgb(31, 95, 209);"><b>CONCURS</b></span></h1>${p('<span style="font-size: 20pt;">de desene pe calculator</span>', 'text-align: center;')}${p('🎨 🖥️ 🏆', 'text-align: center; font-size: 36pt;')}${p('<b>Când:</b> vineri, ora 12', 'text-align: center; font-size: 14pt;')}${p('<b>Unde:</b> laboratorul de informatică', 'text-align: center; font-size: 14pt;')}${p('Înscrieri la profesorul de TIC', 'text-align: center;')}` } },
    { id: 'orar', nume: 'Orarul meu', desc: 'Tabel cu zilele săptămânii', mini: ['t', '', '', ''],
      stare: { orientare: 'peisaj', html: `<h1 style="text-align: center;">Orarul meu</h1><table class="tb-antet"><tbody><tr><th>Ora</th><th>Luni</th><th>Marți</th><th>Miercuri</th><th>Joi</th><th>Vineri</th></tr>${['8:00', '9:00', '10:00', '11:00', '12:00', '13:00'].map((o) => `<tr><td><b>${o}</b></td><td><br></td><td><br></td><td><br></td><td><br></td><td><br></td></tr>`).join('')}</tbody></table>` } },
  ];
  const cg = (rows) => { const c = {}; rows.forEach((r, i) => r.forEach((v, j) => { if (v !== '' && v != null) c[O.refName(j, i)] = typeof v === 'object' ? v : { raw: String(v) }; })); return c; };
  const B = (raw, extra = {}) => ({ raw, bold: true, ...extra });
  const SABLOANE_TABEL = [
    { id: 'gol', nume: 'Registru necompletat', desc: 'Foaie goală', stare: { cells: {} } },
    { id: 'cumparaturi', nume: 'Listă de cumpărături', desc: 'Preț × cantitate, total', stare: { colW: { A: 150, D: 110 }, cells: cg([
      [B('Produs', { fill: 'verde' }), B('Cantitate', { fill: 'verde', align: 'center' }), B('Preț (lei)', { fill: 'verde', align: 'center' }), B('Total', { fill: 'verde', align: 'center' })],
      ['Caiete', 5, '4,5', { raw: '=B2*C2', fmt: 'lei' }], ['Pixuri', 3, 2, { raw: '=B3*C3', fmt: 'lei' }], ['Creioane colorate', 1, 18, { raw: '=B4*C4', fmt: 'lei' }], ['Rigla', 1, '3,5', { raw: '=B5*C5', fmt: 'lei' }],
      ['', '', B('Total:', { align: 'right' }), { raw: '=SUM(D2:D5)', fmt: 'lei', bold: true, bd: 'tb' }]]) } },
    { id: 'catalog', nume: 'Catalog cu note', desc: 'Medii, maxim, promovat', stare: { colW: { A: 130, E: 80, F: 110 }, cells: cg([
      [B('Elev', { fill: 'albastru' }), B('Nota 1', { fill: 'albastru', align: 'center' }), B('Nota 2', { fill: 'albastru', align: 'center' }), B('Nota 3', { fill: 'albastru', align: 'center' }), B('Media', { fill: 'albastru', align: 'center' }), B('Situația', { fill: 'albastru', align: 'center' })],
      ['Ana', 9, 10, 8, { raw: '=AVERAGE(B2:D2)', decimals: 2 }, '=IF(E2>=5;"promovat";"corigent")'], ['Bogdan', 7, 6, 8, { raw: '=AVERAGE(B3:D3)', decimals: 2 }, '=IF(E3>=5;"promovat";"corigent")'],
      ['Carla', 10, 9, 10, { raw: '=AVERAGE(B4:D4)', decimals: 2 }, '=IF(E4>=5;"promovat";"corigent")'], ['Dan', 4, 3, 5, { raw: '=AVERAGE(B5:D5)', decimals: 2 }, '=IF(E5>=5;"promovat";"corigent")'],
      [], [B('Media clasei'), '', '', '', { raw: '=AVERAGE(E2:E5)', decimals: 2, bold: true }], [B('Cea mai mare medie'), '', '', '', { raw: '=MAX(E2:E5)', decimals: 2, bold: true }]]) } },
    { id: 'buget', nume: 'Bugetul meu', desc: 'Venituri, cheltuieli, economii', stare: { colW: { A: 160, B: 100 }, cells: cg([
      [B('Bugetul lunii', { fill: 'galben' }), B('Suma (lei)', { fill: 'galben', align: 'center' })], [B('Venituri')], ['Bani de buzunar', { raw: '100', fmt: 'lei' }], ['Cadou de la bunici', { raw: '50', fmt: 'lei' }],
      [B('Total venituri'), { raw: '=SUM(B3:B4)', fmt: 'lei', bold: true }], [], [B('Cheltuieli')], ['Dulciuri', { raw: '25', fmt: 'lei' }], ['Rechizite', { raw: '40', fmt: 'lei' }], ['Cinema', { raw: '30', fmt: 'lei' }],
      [B('Total cheltuieli'), { raw: '=SUM(B8:B10)', fmt: 'lei', bold: true }], [], [B('Economii', { fill: 'verde' }), { raw: '=B5-B11', fmt: 'lei', bold: true, fill: 'verde' }]]) } },
    { id: 'temperaturi', nume: 'Temperaturi (cu diagramă)', desc: 'Date și grafic linie', stare: { cells: cg([
      [B('Ziua', { fill: 'portocaliu' }), B('Temperatura (°C)', { fill: 'portocaliu' })], ['Luni', 12], ['Marți', 14], ['Miercuri', 11], ['Joi', 9], ['Vineri', 13], ['Sâmbătă', 16], ['Duminică', 15],
      [], [B('Media'), { raw: '=AVERAGE(B2:B8)', decimals: 1 }], [B('Maxima'), '=MAX(B2:B8)'], [B('Minima'), '=MIN(B2:B8)']]),
      colW: { B: 130 }, obiecte: [{ id: 1, tip: 'grafic', fel: 'linie', zona: 'A1:B8', titlu: 'Temperatura în această săptămână', x: 290, y: 24, w: 420, h: 250 }] } },
  ];
  function miniatura(tip, s) {
    if (tip === 'tabel') {
      const m = h('div', { class: 'lab-mini excel' });
      if (s.id !== 'gol') { m.append(h('div', { class: 'rand h' }, h('i'), h('i'), h('i'), h('i'))); for (let i = 0; i < 4; i++) m.append(h('div', { class: 'rand' }, h('i'), h('i', { class: 'v' }), h('i', { class: 'v' }), h('i'))); }
      if (s.id === 'temperaturi') [30, 46, 26, 54].forEach((v, i) => { const b = h('span', { class: 'bar' }); b.style.height = `${v}px`; b.style.left = `${100 + i * 18}px`; m.append(b); });
      return m;
    }
    const m = h('div', { class: 'lab-mini' });
    for (const l of s.mini) m.append(l === 'poza' ? h('div', { class: 'poza' }) : h('div', { class: `l ${l}` }));
    if (s.id !== 'gol') for (let i = 0; i < 6; i++) m.append(h('div', { class: 'l' }));
    if (s.stare.culoarePagina) m.style.background = s.stare.culoarePagina;
    return m;
  }

  // ---------- Pagina principală a Laboratorului ----------
  routes.push({ pattern: /^\/laborator$/, handler: async () => {
    const recente = (await store.toate()).sort((a, b) => b.actualizat - a.actualizat).slice(0, 8);
    show(h('div', { class: 'wrap lab-start' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Laborator'), h('h1', {}, 'Aplicații de birou'),
        h('p', { class: 'muted' }, 'Scrii documente, faci tabele cu formule și prezentări, direct în browser, fără să instalezi nimic. Poți pune imagini, tabele și diagrame, apoi descarci fișierul pentru Word, Excel sau PowerPoint.')),
      h('div', { class: 'lab-hub' },
        h('a', { class: 'lab-card', href: '#/laborator/text' }, h('span', { class: 'lab-badge word' }, 'W'), h('h2', {}, 'Document'), h('p', {}, 'Procesor de text: fonturi, culori, liste, tabele, imagini, stiluri de titlu.')),
        h('a', { class: 'lab-card', href: '#/laborator/tabel' }, h('span', { class: 'lab-badge excel' }, 'X'), h('h2', {}, 'Registru'), h('p', {}, 'Foaie de calcul: formule, funcții, formatare, imagini și diagrame.')),
        h('a', { class: 'lab-card', href: '#/atelier' }, h('span', { class: 'lab-badge ppt' }, 'P'), h('h2', {}, 'Prezentare'), h('p', {}, 'Atelierul de prezentări: diapozitive, teme, tranziții și animații.'))),
      recente.length ? [h('h2', {}, 'Fișierele mele recente'), listaFisiere(recente, () => render())] : null,
      h('p', { class: 'muted small' }, 'Fișierele se păstrează în acest browser, pe acest calculator. Ca să le iei cu tine, descarcă-le din fila Fișier.')));
    function render() { window.EduApp.render(); }
  } });

  function listaFisiere(lista, laSchimbare) {
    return h('div', { class: 'lab-recente' }, lista.map((f) => h('div', { class: 'lab-fisier' },
      h('span', { class: `tip ${TIP[f.tip].cls}`, 'aria-hidden': 'true' }, TIP[f.tip].badge),
      h('a', { href: `#/laborator/${TIP[f.tip].ruta}/${f.id}` }, f.titlu),
      h('span', { class: 'cand' }, cand(f.actualizat)),
      h('button', { class: 'link-btn', type: 'button', onclick: async () => {
        const t = prompt('Numele nou:', f.titlu);
        if (t && t.trim()) { f.titlu = t.trim().slice(0, 80); await store.put(f); laSchimbare(); }
      } }, 'Redenumește'),
      h('button', { class: 'link-btn', type: 'button', onclick: async () => {
        if (!confirm(`Ștergi „${f.titlu}”? Nu poate fi recuperat.`)) return;
        await store.del(f.id);
        laSchimbare();
      } }, 'Șterge'))));
  }

  // ---------- Ecranul de start: Document / Registru ----------
  function ecranStart(tip) {
    return async () => {
      const t = TIP[tip];
      const sabloane = tip === 'text' ? SABLOANE_TEXT : SABLOANE_TABEL;
      const recente = (await store.toate()).filter((f) => f.tip === tip).sort((a, b) => b.actualizat - a.actualizat);
      const err = h('p', { class: 'error', role: 'alert' });
      show(h('div', { class: 'wrap lab-start' },
        h('p', { class: 'crumbs' }, h('a', { href: '#/laborator' }, '← Laborator')),
        h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Laborator'), h('h1', {}, tip === 'text' ? 'Document' : 'Registru'),
          h('p', { class: 'muted' }, tip === 'text' ? 'Alege un document gol sau un șablon. Poți pune imagini (din calculator, cu Ctrl+V sau trăgându-le în pagină), tabele, liste și titluri.' : 'Alege un registru gol sau un exemplu. Formulele încep cu =, iar diagramele le faci din fila Inserare.')),
        h('h2', {}, 'Nou'),
        h('div', { class: 'lab-nou' }, sabloane.map((s) => h('button', { class: 'lab-sablon', type: 'button', onclick: () => creeaza(tip, s.id === 'gol' ? t.implicit : s.nume, JSON.parse(JSON.stringify(s.stare))).catch((e) => { err.textContent = e.message; }) },
          miniatura(tip, s), h('b', {}, s.nume), h('span', {}, s.desc)))),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => deschideDeLaCalculator(tip, err) }, tip === 'text' ? '📂 Deschide un fișier de pe calculator (.docx, .txt, .html)' : '📂 Deschide un fișier de pe calculator (.xlsx, .csv)')),
        err,
        h('h2', {}, recente.length ? 'Recente' : ''),
        recente.length ? listaFisiere(recente, () => window.EduApp.render()) : h('p', { class: 'muted' }, 'Încă nu ai niciun fișier. Alege un șablon de mai sus.')));
    };
  }
  async function deschideDeLaCalculator(tip, err) {
    const [f] = await U.alegeFisier(tip === 'text' ? '.docx,.doc,.htm,.html,.mht,.mhtml,.txt' : '.xlsx,.csv,.txt');
    if (!f) return;
    try {
      const baza = f.name.replace(/\.[^.]+$/, '').slice(0, 80) || TIP[tip].implicit;
      if (tip === 'text') {
        if (/\.docx$/i.test(f.name)) await creeaza('text', baza, await U.importDocx(await f.arrayBuffer()));
        else {
          const text = await f.text();
          if (/\.doc$/i.test(f.name) && !/^MIME-Version|<html|<body|<p[\s>]/i.test(text.slice(0, 2000))) throw new Error('Fișierele .doc vechi (Word 97–2003) nu pot fi deschise. Salvează-l din Word ca .docx și încearcă din nou.');
          await creeaza('text', baza, U.importDoc(text, f.name));
        }
      } else if (/\.xlsx$/i.test(f.name)) await creeaza('tabel', baza, await U.importXlsx(await f.arrayBuffer()));
      else await creeaza('tabel', baza, U.citesteCSV(await f.text()));
    } catch (e) { err.textContent = e.message || 'Fișierul nu a putut fi deschis.'; }
  }
  routes.push({ pattern: /^\/laborator\/text$/, handler: ecranStart('text') });
  routes.push({ pattern: /^\/laborator\/tabel$/, handler: ecranStart('tabel') });

  // ---------- Editorul ----------
  let laIesire = null;
  window.addEventListener('hashchange', () => { if (laIesire) { const f = laIesire; laIesire = null; f(); } });
  function editor(tip) {
    return async ([, id]) => {
      const f = await store.get(id);
      if (!f || f.tip !== tip) return void (location.hash = `#/laborator/${TIP[tip].ruta}`);
      let app = null, tSalvare = null, salveaza;
      const programeaza = () => { app?.setStareSalvare('Se salvează…'); clearTimeout(tSalvare); tSalvare = setTimeout(() => salveaza(), 900); };
      salveaza = async (anunt = false) => {
        clearTimeout(tSalvare);
        tSalvare = null;
        f.stare = app.getStare();
        f.actualizat = Date.now();
        try {
          await store.put(f);
          app.setStareSalvare('Salvat pe acest calculator');
          if (anunt) app.toast('Salvat. Pentru Word / Excel: Fișier → Descarcă.');
        } catch (e) {
          app.setStareSalvare('Nesalvat!', true);
          app.toast('Nu am putut salva: spațiul din browser e plin. Descarcă fișierul (Fișier → Descarcă) și șterge fișierele vechi.', 'error');
        }
      };
      const opt = {
        titlu: f.titlu, stare: f.stare, mod: 'complet',
        onSchimbare: programeaza,
        onTitlu: (t) => { f.titlu = t; document.title = `${t} – edudigi`; salveaza(); },
        onSalveaza: () => salveaza(true),
        onFisier: () => backstage(tip, f, app, salveaza),
      };
      app = tip === 'text' ? O.createDocEditor(opt) : O.createSheet({ ...opt, grid: [], cols: 26, rows: 100 });
      app.setStareSalvare('Salvat pe acest calculator');
      document.title = `${f.titlu} – edudigi`;
      show(h('div', { class: 'lab-ecran' }, app.el));
      laIesire = () => { if (tSalvare) salveaza(); };
      window.addEventListener('beforeunload', () => { if (tSalvare) salveaza(); }, { once: true });
      if (tip === 'text') app.editor.focus();
    };
  }
  routes.push({ pattern: /^\/laborator\/text\/([\w-]+)$/, handler: editor('text') });
  routes.push({ pattern: /^\/laborator\/tabel\/([\w-]+)$/, handler: editor('tabel') });

  // ---------- Fila Fișier (backstage) ----------
  function backstage(tip, f, app, salveaza) {
    const t = TIP[tip];
    const cont = h('div', { class: 'of-bs-cont' });
    const inchide = () => bs.remove();
    const nume = () => (f.titlu || t.implicit).replace(/[\\/:*?"<>|]/g, '_');
    const btn = (ico, titlu, desc, fn) => h('button', { class: 'of-bs-btn', type: 'button', onclick: fn }, U.svg(ico), h('div', {}, h('b', {}, titlu), h('span', {}, desc)));
    const PANOURI = {
      info: () => [h('h2', {}, 'Informații'),
        h('div', { class: 'of-bs-opt' },
          h('p', {}, h('b', {}, f.titlu)),
          h('p', { class: 'muted' }, `Creat: ${cand(f.creat)} · Ultima modificare: ${cand(f.actualizat)}`),
          h('p', { class: 'muted' }, 'Fișierul se salvează automat în acest browser, pe acest calculator. Ca să-l ai și în altă parte (sau să-l trimiți profesorului), descarcă-l.'),
          btn('salveaza', 'Salvează acum', 'Salvare în browser (Ctrl+S)', async () => { await salveaza(true); inchide(); }))],
      nou: () => [h('h2', {}, 'Nou'), h('div', { class: 'lab-nou' }, (tip === 'text' ? SABLOANE_TEXT : SABLOANE_TABEL).map((s) => h('button', { class: 'lab-sablon', type: 'button', onclick: async () => { await salveaza(); creeaza(tip, s.id === 'gol' ? t.implicit : s.nume, JSON.parse(JSON.stringify(s.stare))); } }, miniatura(tip, s), h('b', {}, s.nume))))],
      deschide: async () => {
        const toate = (await store.toate()).filter((x) => x.tip === tip).sort((a, b) => b.actualizat - a.actualizat);
        const err = h('p', { class: 'error' });
        return [h('h2', {}, 'Deschidere'),
          h('div', { class: 'of-bs-opt' }, btn('deschide', 'De pe calculator', tip === 'text' ? 'Document Word (.docx), .txt sau .html' : 'Fișier Excel (.xlsx) sau .csv', async () => { await salveaza(); deschideDeLaCalculator(tip, err); }), err),
          h('h3', {}, 'Recente'), listaFisiere(toate, () => arata('deschide'))];
      },
      descarca: () => [h('h2', {}, 'Descărcare'), h('div', { class: 'of-bs-opt' },
        tip === 'text'
          ? [btn('descarca', 'Document Word (.docx)', 'Se deschide în Microsoft Word, LibreOffice sau Google Docs, cu tot cu imagini și tabele', async () => { U.descarca(`${nume()}.docx`, await U.exportDocx(app.getStare(), f.titlu)); }),
             btn('tiparire', 'PDF', 'Alege „Salvare ca PDF” în fereastra de tipărire', () => { inchide(); setTimeout(() => window.print(), 100); }),
             btn('cuvinte', 'Text simplu (.txt)', 'Doar textul, fără formatare', () => U.descarca(`${nume()}.txt`, `﻿${app.text()}`, 'text/plain;charset=utf-8'))]
          : [btn('descarca', 'Registru Excel (.xlsx)', 'Se deschide în Microsoft Excel, LibreOffice sau Google Sheets, cu formule și formatare', () => { U.descarca(`${nume()}.xlsx`, U.exportXlsx(app.getStare(), f.titlu)); }),
             btn('tabel', 'Valori separate prin ; (.csv)', 'Doar valorile, fără formule', () => U.descarca(`${nume()}.csv`, `﻿${app.csv()}`, 'text/csv;charset=utf-8')),
             h('p', { class: 'muted small' }, 'Imaginile și diagramele rămân doar aici; în Excel se descarcă datele, formulele și formatarea.')])],
      tiparire: () => [h('h2', {}, 'Imprimare'), h('div', { class: 'of-bs-opt' }, btn('tiparire', 'Tipărește', 'Sau salvează ca PDF', () => { inchide(); setTimeout(() => window.print(), 100); }))],
    };
    const meniuri = [['info', 'Informații'], ['nou', 'Nou'], ['deschide', 'Deschidere'], ['descarca', 'Descărcare'], ['tiparire', 'Imprimare']];
    const meniuEl = h('nav', { class: 'of-bs-meniu' },
      h('button', { class: 'inapoi', type: 'button', onclick: inchide, 'aria-label': 'Înapoi la document' }, '←  Înapoi'),
      meniuri.map(([k, v]) => h('button', { type: 'button', 'data-k': k, onclick: () => arata(k) }, v)),
      h('button', { type: 'button', onclick: async () => { await salveaza(); location.hash = `#/laborator/${t.ruta}`; } }, 'Închidere'));
    async function arata(k) {
      for (const b of meniuEl.querySelectorAll('[data-k]')) b.setAttribute('aria-current', String(b.dataset.k === k));
      umple(cont, await PANOURI[k]());
    }
    const bs = h('div', { class: 'of-backstage' }, meniuEl, cont);
    bs.addEventListener('keydown', (e) => { if (e.key === 'Escape') inchide(); });
    app.el.append(bs);
    arata('descarca');
    meniuEl.querySelector('.inapoi').focus();
  }
})();

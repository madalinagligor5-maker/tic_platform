'use strict';
// Pagina „Aplicații”: programele din browser, grupate pe clase (înlocuiesc Paint, Word, Excel, PowerPoint,
// WavePad, Code::Blocks etc., care nu există pe Chromebook).
(() => {
  const { h, show, routes } = window.EduApp;

  const APLICATII = [
    { id: 'desen', ruta: '#/aplicatii/desen', nume: 'Desen', inlocuieste: 'Paint', clase: [5, 6], culoare: 'c1', desc: 'Editor grafic 2D: creion, pensulă, forme, umplere, text, selecție, rotire și răsturnare.' },
    { id: 'animatie', ruta: '#/aplicatii/animatie', nume: 'Studio de animație', inlocuieste: 'Paint 3D / Toontastic', clase: [6], culoare: 'c9', desc: 'Animație cadru cu cadru și scene cu personaje, efecte, temporizare și cronologie; export GIF și video.' },
    { id: 'text', ruta: '#/laborator/text', nume: 'Document', inlocuieste: 'Word', clase: [5, 6, 7, 8], culoare: 'c2', desc: 'Procesor de text cu formatare, imagini, tabele; se descarcă .docx.' },
    { id: 'atelier', ruta: '#/atelier', nume: 'Prezentare', inlocuieste: 'PowerPoint', clase: [6, 7, 8], culoare: 'c3', desc: 'Diapozitive cu teme, imagini, forme, tranziții; se salvează în contul elevului.' },
    { id: 'posta', ruta: '#/aplicatii/posta', nume: 'Poștă electronică', inlocuieste: 'Gmail / Outlook', clase: [6], culoare: 'c4', desc: 'Simulator sigur: Către, CC, CCI, răspuns, redirecționare, atașamente, spam și phishing, cu misiuni.' },
    { id: 'audio', ruta: '#/aplicatii/audio', nume: 'Editor audio', inlocuieste: 'WavePad / Audacity', clase: [7], culoare: 'c5', desc: 'Înregistrare, tăiere, lipire, efecte (volum, estompare, ecou), mixare și export WAV.' },
    { id: 'cpp', ruta: '#/aplicatii/cpp', nume: 'Editor C++', inlocuieste: 'Code::Blocks', clase: [7, 8], culoare: 'c6', desc: 'Scrii și rulezi programe C++ direct în browser, cu date de intrare și mesaje de eroare în română.' },
    { id: 'tabel', ruta: '#/laborator/tabel', nume: 'Registru de calcul', inlocuieste: 'Excel', clase: [8], culoare: 'c7', desc: 'Foaie de calcul cu formule, funcții, sortare, diagrame; se descarcă .xlsx.' },
    { id: 'html', ruta: '#/aplicatii/html', nume: 'Editor de pagini web', inlocuieste: 'Notepad + browser', clase: [8], culoare: 'c8', desc: 'Cod HTML în stânga, pagina în dreapta, imagini, mai multe pagini, export .zip.' },
  ];
  const ROMAN = { 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  const exista = (a) => !a.ruta.startsWith('#/aplicatii/') || routes.some((r) => r.pattern.test(a.ruta.slice(1)));

  function card(a) {
    return h('a', { class: `app-card ${a.culoare}`, href: a.ruta },
      h('span', { class: 'app-ico', 'aria-hidden': 'true' }, a.nume[0]),
      h('b', {}, a.nume),
      h('span', { class: 'app-in' }, `în loc de ${a.inlocuieste}`),
      h('p', {}, a.desc),
      h('span', { class: 'app-clase' }, a.clase.map((c) => `cl. ${ROMAN[c]}`).join(' · ')));
  }

  routes.push({ pattern: /^\/aplicatii$/, handler: async (m, params) => {
    const c = Number(params.get('c')) || 0;
    const lista = APLICATII.filter(exista).filter((a) => !c || a.clase.includes(c));
    document.title = 'Aplicații – edudigi';
    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Aplicații în browser'), h('h1', {}, 'Lucrează direct pe site'),
        h('p', { class: 'muted' }, 'Merg pe orice calculator, inclusiv pe Chromebook, fără instalare. Lucrările se păstrează în browser și se pot descărca; când profesorul dă o sarcină, se predau cu un clic.')),
      h('div', { class: 'filters compact' }, h('div', { class: 'filter-row' }, h('span', { class: 'kicker' }, 'Clasa'),
        h('a', { class: 'chip small', href: '#/aplicatii', 'aria-pressed': String(!c) }, 'Toate'),
        [5, 6, 7, 8].map((g) => h('a', { class: 'chip small', href: `#/aplicatii?c=${g}`, 'aria-pressed': String(c === g) }, ROMAN[g])))),
      h('div', { class: 'app-grid' }, lista.map(card))));
  } });
})();

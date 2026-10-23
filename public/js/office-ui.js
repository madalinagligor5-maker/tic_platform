'use strict';
// Interfața aplicațiilor de birou (doar browser): procesorul de text și foaia de calcul, cu panglică
// în stilul Office, imagini, tabele, diagrame. Motorul de formule și verificarea sarcinilor sunt în office.js.
// Folosit în Laborator (aplicațiile complete) și în lecții / teste (varianta încorporată).
(function () {
  const O = window.EduOffice;
  const { Sheet, formatValue, parseRef, refName, colName, shiftFormula, FILLS, COLORS, FONTS } = O;

  // =====================================================================
  // Utilitare comune
  // =====================================================================
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));
  const SVGNS = 'http://www.w3.org/2000/svg';
  // Iconițe SVG desenate din cod (nu din conținut): [elemente, ...]
  const I = {
    salveaza: [['path', 'M5 4h11l3 3v13H5z'], ['path', 'M8 4v5h7V4M8 20v-6h8v6']],
    anulare: [['path', 'M9 7L5 11l4 4'], ['path', 'M5 11h9a5 5 0 0 1 0 10h-3']],
    refacere: [['path', 'M15 7l4 4-4 4'], ['path', 'M19 11h-9a5 5 0 0 0 0 10h3']],
    inchide: [['path', 'M6 6l12 12M18 6L6 18']],
    decupare: [['circle', 6, 18, 2.5], ['circle', 18, 18, 2.5], ['path', 'M8 16L17 4M16 16L7 4']],
    copiere: [['rect', 8, 8, 12, 12, 2], ['path', 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3']],
    lipire: [['rect', 5, 5, 14, 16, 2], ['path', 'M9 5V3h6v2M9 11h6M9 15h4']],
    pensula: [['path', 'M4 20c3 0 4-1.5 4-4l9-9a2 2 0 0 0-3-3l-9 9c-2.5 0-4 1-4 4z']],
    marire: [['path', 'M4 18l5-12 5 12M6 14h6'], ['path', 'M17 8h5M19.5 5.5v5']],
    micsorare: [['path', 'M4 18l5-12 5 12M6 14h6'], ['path', 'M17 8h5']],
    culoare: [['path', 'M6 17l6-14 6 14M8.5 12h7']],
    marcator: [['path', 'M14 4l6 6-8 8H6v-6z'], ['path', 'M4 21h8']],
    golire: [['path', 'M6 18l6-14 4 9M8.5 12h5'], ['path', 'M15 15l5 5M20 15l-5 5']],
    marcatori: [['circle', 5, 6, 1.4, 'f'], ['circle', 5, 12, 1.4, 'f'], ['circle', 5, 18, 1.4, 'f'], ['path', 'M10 6h10M10 12h10M10 18h10']],
    numerotare: [['path', 'M4 4h2v5M4 9h3M4 14h3l-3 4h3'], ['path', 'M10 6h10M10 12h10M10 18h10']],
    indentPlus: [['path', 'M10 6h10M10 12h10M10 18h10M4 9l3 3-3 3']],
    indentMinus: [['path', 'M10 6h10M10 12h10M10 18h10M7 9l-3 3 3 3']],
    stanga: [['path', 'M4 6h16M4 10h10M4 14h16M4 18h10']],
    centru: [['path', 'M4 6h16M7 10h10M4 14h16M7 18h10']],
    dreapta: [['path', 'M4 6h16M10 10h10M4 14h16M10 18h10']],
    justificat: [['path', 'M4 6h16M4 10h16M4 14h16M4 18h16']],
    spatiere: [['path', 'M11 6h10M11 12h10M11 18h10M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2']],
    imagine: [['rect', 3, 5, 18, 14, 2], ['circle', 9, 10, 1.8], ['path', 'M3 17l5-5 4 4 3-3 6 6']],
    tabel: [['rect', 3, 4, 18, 16, 1.5], ['path', 'M3 9h18M3 14.5h18M9 4v16M15 4v16']],
    linie: [['path', 'M3 12h18']],
    simbol: [['path', 'M7 19h4v-3a6 6 0 1 1 2 0v3h4']],
    link: [['path', 'M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1'], ['path', 'M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1']],
    data: [['rect', 4, 5, 16, 15, 2], ['path', 'M4 10h16M8 3v4M16 3v4']],
    emoji: [['circle', 12, 12, 9], ['path', 'M8 14a5 5 0 0 0 8 0'], ['circle', 9, 10, 1, 'f'], ['circle', 15, 10, 1, 'f']],
    rupere: [['path', 'M5 4v5h14V4M5 20v-5h14v5'], ['path', 'M3 12h3M9 12h2M14 12h2M19 12h2']],
    margini: [['rect', 5, 3, 14, 18, 1], ['path', 'M8 3v18M16 3v18M5 7h14M5 17h14']],
    orientare: [['rect', 3, 7, 14, 10, 1], ['rect', 9, 3, 12, 18, 1]],
    culoarePagina: [['rect', 5, 3, 14, 18, 1.5], ['path', 'M9 15l3-7 3 7M10.3 12.5h3.4']],
    zoom: [['circle', 11, 11, 6], ['path', 'M20 20l-4.5-4.5M8.5 11h5M11 8.5v5']],
    tiparire: [['path', 'M7 9V3h10v6'], ['rect', 4, 9, 16, 8, 1.5], ['path', 'M7 14h10v7H7z']],
    descarca: [['path', 'M12 4v11M7 10l5 5 5-5M5 20h14']],
    deschide: [['path', 'M3 7h6l2 2h10v10H3z']],
    nou: [['path', 'M6 3h9l4 4v14H6z'], ['path', 'M14 3v5h5M12.5 11v6M9.5 14h6']],
    gasire: [['circle', 11, 11, 6], ['path', 'M20 20l-4.5-4.5']],
    inlocuire: [['path', 'M4 8h11l-3-3M20 16H9l3 3']],
    sterge: [['path', 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13']],
    randSus: [['rect', 3, 12, 18, 8, 1], ['path', 'M12 3v6M9 6h6']],
    randJos: [['rect', 3, 4, 18, 8, 1], ['path', 'M12 15v6M9 18h6']],
    colStanga: [['rect', 12, 3, 8, 18, 1], ['path', 'M3 12h6M6 9v6']],
    colDreapta: [['rect', 4, 3, 8, 18, 1], ['path', 'M15 12h6M18 9v6']],
    stergeRand: [['rect', 3, 8, 18, 8, 1], ['path', 'M9 10l6 4M15 10l-6 4']],
    stergeCol: [['rect', 8, 3, 8, 18, 1], ['path', 'M10 9l4 6M14 9l-4 6']],
    borduri: [['rect', 4, 4, 16, 16, 0], ['path', 'M4 12h16M12 4v16']],
    faraBorduri: [['path', 'M4 4h2M9 4h2M14 4h2M19 4h1v2M20 9v2M20 14v2M20 19v1h-2M15 20h-2M10 20H8M5 20H4v-2M4 15v-2M4 10V8']],
    procent: [['circle', 7, 7, 2.5], ['circle', 17, 17, 2.5], ['path', 'M18 5L6 19']],
    lei: [['rect', 3, 6, 18, 12, 2], ['circle', 12, 12, 2.6], ['path', 'M6 9v.01M18 15v.01']],
    zecPlus: [['path', 'M4 17h1M8 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'], ['path', 'M18 6h4M20 4v4']],
    zecMinus: [['path', 'M4 17h1M8 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'], ['path', 'M18 6h4']],
    incadrare: [['path', 'M4 6h16M4 12h13a3 3 0 0 1 0 6h-4M4 18h5M15 16l-2 2 2 2']],
    sortAZ: [['path', 'M5 4v16M2 17l3 3 3-3'], ['path', 'M12 10l2.5-6 2.5 6M12.8 8h3.4M12 14h5l-5 6h5']],
    sortZA: [['path', 'M5 4v16M2 7l3-3 3 3'], ['path', 'M12 10l2.5-6 2.5 6M12.8 8h3.4M12 14h5l-5 6h5']],
    functie: [['path', 'M14 4h-1a3 3 0 0 0-3 3v13a0 0 0 0 1 0 0M7 10h7'], ['path', 'M15 13l5 6M20 13l-5 6']],
    suma: [['path', 'M17 5H6l6 7-6 7h11']],
    coloane: [['path', 'M4 20h16'], ['rect', 6, 11, 3, 9, 0], ['rect', 11, 6, 3, 14, 0], ['rect', 16, 13, 3, 7, 0]],
    bare: [['path', 'M4 4v16'], ['rect', 4, 6, 9, 3, 0], ['rect', 4, 11, 14, 3, 0], ['rect', 4, 16, 6, 3, 0]],
    grafic: [['path', 'M4 4v16h16'], ['path', 'M7 15l4-5 3 3 5-7']],
    radiala: [['path', 'M12 3a9 9 0 1 0 9 9h-9z'], ['path', 'M15 3.5A9 9 0 0 1 20.5 9H15z']],
    grila: [['rect', 4, 4, 16, 16, 0], ['path', 'M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16']],
    golireCel: [['path', 'M8 20h12M5 15l9-9 5 5-7 7H8z']],
    ecran: [['path', 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5']],
    cuvinte: [['path', 'M4 7h8M4 12h12M4 17h6'], ['path', 'M16 15l2 2 4-4']],
    sus: [['path', 'M12 5v14M6 11l6-6 6 6']],
    jos: [['path', 'M12 19V5M6 13l6 6 6-6']],
    stil: [['path', 'M4 6h16M4 12h10M4 18h7'], ['path', 'M16 14l4 4M20 14l-4 4']],
    ajutor: [['circle', 12, 12, 9], ['path', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17v.5']],
  };
  function svg(name, cls = 'of-ico') {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', cls);
    for (const [tag, ...a] of I[name] || []) {
      const e = document.createElementNS(SVGNS, tag);
      if (tag === 'path') e.setAttribute('d', a[0]);
      if (tag === 'circle') { e.setAttribute('cx', a[0]); e.setAttribute('cy', a[1]); e.setAttribute('r', a[2]); if (a[3] === 'f') e.setAttribute('class', 'fill'); }
      if (tag === 'rect') { e.setAttribute('x', a[0]); e.setAttribute('y', a[1]); e.setAttribute('width', a[2]); e.setAttribute('height', a[3]); e.setAttribute('rx', a[4] || 0); }
      s.append(e);
    }
    return s;
  }

  // Imagini: fișierul elevului devine un data: URL micșorat (max. 1400 px), ca să încapă în document.
  function citesteImagine(file, max = 1400) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/.test(file.type)) return reject(new Error('Alege o imagine (PNG, JPG, GIF, WEBP).'));
      if (file.size > 25 * 1024 * 1024) return reject(new Error('Imaginea este prea mare (peste 25 MB).'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Imaginea nu a putut fi citită.'));
      fr.onload = () => {
        const url = fr.result;
        // GIF-urile mici rămân așa (pot fi animate); SVG se rasterizează.
        if (file.type === 'image/gif' && file.size < 1.5 * 1024 * 1024) return resolve(url);
        const img = new Image();
        img.onerror = () => reject(new Error('Imaginea nu a putut fi deschisă.'));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round((img.naturalWidth || 300) * k));
          c.height = Math.max(1, Math.round((img.naturalHeight || 150) * k));
          const ctx = c.getContext('2d');
          const png = file.type === 'image/png' || file.type === 'image/svg+xml' || file.type === 'image/webp';
          if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          let out = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86);
          if (png && out.length > 900 * 1024) out = c.toDataURL('image/jpeg', 0.86); // PNG uriaș (fotografie) → JPG
          resolve(out);
        };
        img.src = url;
      };
      fr.readAsDataURL(file);
    });
  }
  function alegeFisier(accept, multiple = false) {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept, hidden: true, ...(multiple ? { multiple: true } : {}) });
      inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
      document.body.append(inp);
      inp.click();
    });
  }
  function descarca(nume, continut, tip) {
    const blob = continut instanceof Blob ? continut : new Blob([continut], { type: tip });
    const a = h('a', { href: URL.createObjectURL(blob), download: nume });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  // Mesaj scurt în colțul aplicației.
  function toast(app, text, tip = '') {
    const t = h('div', { class: `of-toast ${tip}`, role: 'status' }, text);
    app.append(t);
    setTimeout(() => t.classList.add('gone'), 2600);
    setTimeout(() => t.remove(), 3200);
  }

  // ---- Panglica (ribbon) ----
  const fara = (e) => e.preventDefault(); // butoanele nu iau focusul: selecția din document rămâne
  const mare = (ico, eticheta, onclick, extra = {}) => h('button', { class: 'of-mare', type: 'button', onmousedown: fara, onclick, ...extra }, svg(ico, 'of-ico mare'), h('span', {}, eticheta));
  const mic = (ico, eticheta, onclick, extra = {}) => h('button', { class: 'of-mic', type: 'button', title: extra.title || eticheta, 'aria-label': eticheta, onmousedown: fara, onclick, ...extra },
    typeof ico === 'string' && I[ico] ? svg(ico) : h('span', { class: 'of-mic-text' }, ico), extra.text ? h('span', { class: 'of-mic-et' }, extra.text) : null);
  const grup = (nume, ...copii) => h('div', { class: 'of-grup', role: 'group', 'aria-label': nume }, h('div', { class: 'of-grup-cont' }, copii), h('span', { class: 'of-grup-nume' }, nume));
  const stiva = (...randuri) => h('div', { class: 'of-stiva' }, randuri.map((r) => h('div', { class: 'of-rand' }, r)));

  // Meniuri derulante ale panglicii (o singură instanță).
  let meniu = null;
  function inchideMeniu() { meniu?.remove(); meniu = null; document.removeEventListener('mousedown', inAfara, true); }
  function inAfara(e) { if (meniu && !meniu.contains(e.target)) inchideMeniu(); }
  function deschideMeniu(ancora, continut, cls = '') {
    inchideMeniu();
    const r = ancora.getBoundingClientRect();
    meniu = h('div', { class: `of-meniu ${cls}`, role: 'menu' }, continut);
    document.body.append(meniu);
    const w = meniu.offsetWidth;
    meniu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
    meniu.style.top = `${Math.min(r.bottom + 4, window.innerHeight - meniu.offsetHeight - 8)}px`;
    document.addEventListener('mousedown', inAfara, true);
    meniu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { inchideMeniu(); ancora.focus(); } });
    return meniu;
  }
  // Paleta de culori, ca în Office: rând de culori de bază + nuanțe.
  const PALETA = [
    ['#000000', '#FFFFFF', '#D0021B', '#E8710A', '#F2C200', '#1E8E3E', '#0E9AA7', '#1F5FD1', '#7B3FB8', '#C2185B'],
    ['#404040', '#F2F2F2', '#F4C7CE', '#FCDDBF', '#FFF2B3', '#C8E6C9', '#B9EBEF', '#C6D8F7', '#E1D0F2', '#F8C8DC'],
    ['#7F7F7F', '#D9D9D9', '#E57383', '#F6A35C', '#FFDB4D', '#7CC48A', '#5CCAD4', '#7FA6EA', '#B48AE0', '#EC7EAA'],
    ['#262626', '#A6A6A6', '#8E0012', '#A34E05', '#B38A00', '#145F2A', '#086A73', '#123F8F', '#512681', '#88103E'],
  ];
  function paleta(onPick, { faraCuloare = null } = {}) {
    return h('div', { class: 'of-paleta' },
      faraCuloare ? h('button', { class: 'of-fara-cul', type: 'button', role: 'menuitem', onmousedown: fara, onclick: () => { inchideMeniu(); onPick(null); } }, faraCuloare) : null,
      h('div', { class: 'of-paleta-grid' }, PALETA.flat().map((c) => {
        const b = h('button', { class: 'of-cul', type: 'button', role: 'menuitem', title: c, 'aria-label': `Culoare ${c}`, onmousedown: fara, onclick: () => { inchideMeniu(); onPick(c); } });
        b.style.background = c;
        return b;
      })));
  }
  const SIMBOLURI = ['©', '®', '™', '€', '°', '±', '×', '÷', '≠', '≤', '≥', '∞', '√', 'π', '½', '¼', '→', '←', '↑', '↓', '✓', '✗', '•', '★', '♥', '☺', '♪', '§', '¶', '„', '”', '«', '»', '–', '—', '…'];
  const EMOJI = ['😀', '😊', '😍', '🤔', '😎', '👍', '👏', '🎉', '⭐', '❤️', '📚', '✏️', '💻', '🖥️', '📱', '🖨️', '🌍', '🌳', '☀️', '🌈', '🐶', '🐱', '⚽', '🎵', '🎨', '🏫', '🍎', '🚀', '💡', '✅'];

  // =====================================================================
  // Procesorul de text
  // =====================================================================
  const MARIMI = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
  const TOATE_FONTURILE = [...new Set([...FONTS, 'Comic Sans MS', 'Trebuchet MS', 'Montserrat'])];
  const STILURI_DOC = [['p', 'Normal'], ['h1', 'Titlu'], ['h2', 'Titlu 1'], ['h3', 'Titlu 2'], ['blockquote', 'Citat']];
  const MARGINI = { normal: 'Normale (2,5 cm)', ingust: 'Înguste (1,27 cm)', lat: 'Late (3,5 cm)' };
  const CULORI_PAGINA = { '': 'Alb', '#FFF8E7': 'Crem', '#EEF6FF': 'Albastru deschis', '#F0FAF0': 'Verde deschis', '#FFF0F5': 'Roz deschis', '#F5F0FF': 'Lavandă' };

  // Documentul editat: { html, margini, orientare, culoarePagina }.
  // mod 'complet' (Laborator): toate filele, bara de titlu, Fișier. mod 'lectie': Pornire, Inserare, Aspect.
  function createDocEditor({ paragrafe = [''], titlu = 'Document1', stare = null, mod = 'lectie', onSchimbare = null, onFisier = null, onTitlu = null, onSalveaza = null } = {}) {
    const editor = h('div', { class: 'doc-page', contenteditable: 'true', spellcheck: 'true', lang: 'ro', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Pagina documentului' });
    const pagina = h('div', { class: 'of-pagina-wrap' }, editor);
    const canvas = h('div', { class: 'of-canvas' }, pagina);
    let setari = { margini: 'normal', orientare: 'portret', culoarePagina: '', zoom: 100 };
    let filaActiva = 'pornire';
    let saved = null, selImg = null;

    // CSP (style-src 'self') blochează atributele style scrise de execCommand; le reaplicăm prin CSSOM, care e permis.
    const aplicate = new WeakMap();
    new MutationObserver(() => {
      for (const el of editor.querySelectorAll('[style]')) {
        const v = el.getAttribute('style');
        if (aplicate.get(el) === v) continue;
        el.style.cssText = v;
        aplicate.set(el, el.getAttribute('style'));
      }
    }).observe(editor, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });

    const initial = () => editor.replaceChildren(...(paragrafe.length ? paragrafe : ['']).map((t) => h('p', {}, t || h('br'))));
    function incarca(st) {
      if (st && st.html != null) {
        editor.replaceChildren(O.docSigur(st.html));
        if (!editor.firstChild) editor.append(h('p', {}, h('br')));
        setari = { ...setari, margini: st.margini || 'normal', orientare: st.orientare || 'portret', culoarePagina: st.culoarePagina || '' };
      } else initial();
      aplicaSetari();
    }
    function aplicaSetari() {
      editor.className = `doc-page m-${setari.margini} o-${setari.orientare}`;
      editor.style.backgroundColor = setari.culoarePagina || '';
      pagina.style.zoom = String(setari.zoom / 100);
      zoomEt.textContent = `${setari.zoom}%`;
      zoomIn.value = String(setari.zoom);
    }
    const getStare = () => ({ html: editor.innerHTML, margini: setari.margini, orientare: setari.orientare, culoarePagina: setari.culoarePagina });

    // ---- Istoric propriu (Anulare / Refacere), cu poziția cursorului ----
    let istoric = [], poz = -1, tIstoric = null;
    function offsetCursor() {
      const s = document.getSelection();
      if (!s.rangeCount || !editor.contains(s.anchorNode)) return null;
      const r = document.createRange();
      r.selectNodeContents(editor);
      r.setEnd(s.anchorNode, s.anchorOffset);
      return r.toString().length;
    }
    function puneCursor(n) {
      if (n == null) return;
      const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let rest = n, nod;
      while ((nod = w.nextNode())) {
        if (rest <= nod.nodeValue.length) {
          const r = document.createRange();
          r.setStart(nod, rest);
          r.collapse(true);
          const s = document.getSelection();
          s.removeAllRanges();
          s.addRange(r);
          return;
        }
        rest -= nod.nodeValue.length;
      }
    }
    function memoreaza() {
      clearTimeout(tIstoric);
      tIstoric = null;
      const html = editor.innerHTML;
      if (istoric[poz]?.html === html) return;
      istoric = istoric.slice(0, poz + 1);
      istoric.push({ html, cursor: offsetCursor() });
      if (istoric.length > 80) istoric.shift();
      poz = istoric.length - 1;
      actualizeazaIstoric();
    }
    const memoreazaCurand = () => { clearTimeout(tIstoric); tIstoric = setTimeout(memoreaza, 500); };
    function sari(d) {
      if (tIstoric) memoreaza();
      const t = poz + d;
      if (t < 0 || t >= istoric.length) return;
      poz = t;
      editor.replaceChildren(O.docSigur(istoric[poz].html));
      editor.focus();
      puneCursor(istoric[poz].cursor);
      deselecteazaImg();
      schimbat(false);
      actualizeazaIstoric();
    }
    let btnAnulare, btnRefacere;
    function actualizeazaIstoric() {
      if (btnAnulare) btnAnulare.disabled = poz <= 0;
      if (btnRefacere) btnRefacere.disabled = poz >= istoric.length - 1;
    }
    function schimbat(cuIstoric = true) {
      if (cuIstoric) memoreazaCurand();
      stareBara();
      onSchimbare && onSchimbare();
    }

    // ---- Selecția ----
    document.addEventListener('selectionchange', () => {
      const s = document.getSelection();
      if (s.rangeCount && editor.contains(s.anchorNode)) { saved = s.getRangeAt(0).cloneRange(); actualizeazaStare(); }
    });
    function restore() {
      editor.focus({ preventScroll: true });
      if (saved && editor.contains(saved.startContainer)) { const s = document.getSelection(); s.removeAllRanges(); s.addRange(saved); }
      else { const r = document.createRange(); r.selectNodeContents(editor); r.collapse(false); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }
    }
    function exec(cmd, val = null, css = false) {
      if (tIstoric) memoreaza();
      restore();
      document.execCommand('styleWithCSS', false, css);
      document.execCommand(cmd, false, val);
      memoreaza();
      schimbat(false);
      actualizeazaStare();
    }
    function marime(pt) {
      if (tIstoric) memoreaza();
      restore();
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      for (const f of editor.querySelectorAll('font[size="7"]')) {
        const span = h('span');
        span.style.fontSize = `${pt}pt`;
        span.append(...f.childNodes);
        f.replaceWith(span);
      }
      memoreaza();
      schimbat(false);
    }
    function marimeCurenta() {
      const s = document.getSelection();
      const n = s.rangeCount && editor.contains(s.anchorNode) ? s.anchorNode : null;
      const el = n ? (n.nodeType === 3 ? n.parentElement : n) : editor.querySelector('p');
      return el ? Math.round((parseFloat(getComputedStyle(el).fontSize) * 3) / 4) : 11;
    }
    const treaptaMarime = (d) => {
      const m = marimeCurenta();
      const urm = d > 0 ? MARIMI.find((x) => x > m) || 72 : [...MARIMI].reverse().find((x) => x < m) || 8;
      marime(urm);
    };
    // Blocurile (paragrafele) din selecție.
    function blocuriSelectate() {
      restore();
      const s = document.getSelection();
      const r = s.getRangeAt(0);
      const toate = [...editor.querySelectorAll('p,h1,h2,h3,h4,li,blockquote,div')].filter((b) => !b.querySelector('p,h1,h2,h3,h4,li,blockquote,div'));
      const alese = toate.filter((b) => r.intersectsNode(b));
      return alese.length ? alese : toate.slice(0, 1);
    }
    function spatiere(v) {
      if (tIstoric) memoreaza();
      for (const b of blocuriSelectate()) b.style.lineHeight = v;
      memoreaza();
      schimbat(false);
    }
    function insereaza(nod) {
      if (tIstoric) memoreaza();
      restore();
      const s = document.getSelection();
      const r = s.getRangeAt(0);
      r.deleteContents();
      r.insertNode(nod);
      r.setStartAfter(nod);
      r.collapse(true);
      s.removeAllRanges();
      s.addRange(r);
      memoreaza();
      schimbat(false);
    }
    // Un element-bloc (tabel, imagine centrată) se pune după paragraful curent.
    function insereazaBloc(nod) {
      if (tIstoric) memoreaza();
      restore();
      const s = document.getSelection();
      let bloc = s.anchorNode;
      while (bloc && bloc.parentNode !== editor) bloc = bloc.parentNode;
      const dupa = h('p', {}, h('br'));
      if (bloc && bloc !== editor) {
        const gol = !bloc.textContent.trim() && !bloc.querySelector('img,table');
        if (gol) bloc.replaceWith(nod); else bloc.after(nod);
      } else editor.append(nod);
      nod.after(dupa);
      const r = document.createRange();
      r.setStart(dupa, 0);
      r.collapse(true);
      s.removeAllRanges();
      s.addRange(r);
      memoreaza();
      schimbat(false);
    }

    // ---- Imagini ----
    async function adaugaImagini(files) {
      for (const f of files) {
        try {
          const src = await citesteImagine(f);
          const img = h('img', { src, alt: f.name.replace(/\.[^.]+$/, '') });
          img.classList.add('img-linie');
          img.addEventListener('load', () => { if (img.naturalWidth > 480) img.style.width = '480px'; pozitioneazaSel(); schimbat(false); }, { once: true });
          insereaza(img);
          selecteazaImg(img);
        } catch (e) { toast(app, e.message, 'error'); }
      }
    }
    const inserareImagine = async () => { const f = await alegeFisier('image/*', true); if (f.length) adaugaImagini(f); };
    const selImgEl = h('div', { class: 'of-img-sel', hidden: true },
      ...['nw', 'ne', 'sw', 'se'].map((c) => h('span', { class: `of-maner ${c}`, 'data-colt': c })));
    pagina.append(selImgEl);
    function selecteazaImg(img) {
      selImg = img;
      selImgEl.hidden = false;
      pozitioneazaSel();
      if (filaActiva !== 'imagine') { filaActiva = 'imagine'; deseneazaFile(); deseneazaPanglica(); }
    }
    function deselecteazaImg() {
      if (!selImg) return;
      selImg = null;
      selImgEl.hidden = true;
      if (filaActiva === 'imagine') { filaActiva = 'pornire'; deseneazaFile(); deseneazaPanglica(); }
    }
    function pozitioneazaSel() {
      if (!selImg || !selImg.isConnected) { if (selImg) deselecteazaImg(); return; }
      selImgEl.style.left = `${selImg.offsetLeft}px`;
      selImgEl.style.top = `${selImg.offsetTop}px`;
      selImgEl.style.width = `${selImg.offsetWidth}px`;
      selImgEl.style.height = `${selImg.offsetHeight}px`;
    }
    editor.addEventListener('click', (e) => { if (e.target.tagName === 'IMG') selecteazaImg(e.target); else deselecteazaImg(); });
    // Redimensionare din colțuri (păstrează proporțiile).
    selImgEl.addEventListener('pointerdown', (e) => {
      const colt = e.target.dataset.colt;
      if (!colt || !selImg) return;
      e.preventDefault();
      const img = selImg, x0 = e.clientX, w0 = img.offsetWidth, z = setari.zoom / 100;
      const maxW = editor.clientWidth - 20;
      const mut = (ev) => {
        const dx = ((ev.clientX - x0) / z) * (colt.includes('w') ? -1 : 1);
        img.style.width = `${Math.round(Math.max(30, Math.min(maxW, w0 + dx)))}px`;
        img.style.height = 'auto';
        pozitioneazaSel();
      };
      const gata = () => { document.removeEventListener('pointermove', mut); document.removeEventListener('pointerup', gata); memoreaza(); schimbat(false); };
      document.addEventListener('pointermove', mut);
      document.addEventListener('pointerup', gata);
    });
    function imgAliniere(kind) {
      if (!selImg) return;
      if (tIstoric) memoreaza();
      selImg.classList.remove('img-linie', 'img-stanga', 'img-dreapta', 'img-centru');
      selImg.classList.add(`img-${kind}`);
      memoreaza();
      schimbat(false);
      deseneazaPanglica();
      requestAnimationFrame(pozitioneazaSel);
    }
    function imgLatime(p) {
      if (!selImg) return;
      selImg.style.width = `${Math.round((editor.clientWidth - 2 * parseFloat(getComputedStyle(editor).paddingLeft)) * p)}px`;
      selImg.style.height = 'auto';
      memoreaza();
      schimbat(false);
      requestAnimationFrame(pozitioneazaSel);
    }
    function imgChenar() {
      if (!selImg) return;
      selImg.classList.toggle('img-chenar');
      selImg.classList.toggle('img-umbra', false);
      memoreaza(); schimbat(false); deseneazaPanglica();
    }
    function imgUmbra() {
      if (!selImg) return;
      selImg.classList.toggle('img-umbra');
      memoreaza(); schimbat(false); deseneazaPanglica();
    }
    function imgRotunjit() {
      if (!selImg) return;
      selImg.classList.toggle('img-rotunjit');
      memoreaza(); schimbat(false); deseneazaPanglica();
    }
    function imgSterge() {
      if (!selImg) return;
      const img = selImg;
      deselecteazaImg();
      img.remove();
      memoreaza();
      schimbat(false);
    }

    // ---- Tabele ----
    function celulaCurenta() {
      const s = document.getSelection();
      let n = s.rangeCount ? s.anchorNode : null;
      if (!n || !editor.contains(n)) n = saved?.startContainer;
      while (n && n !== editor) { if (n.nodeName === 'TD' || n.nodeName === 'TH') return n; n = n.parentNode; }
      return null;
    }
    function insereazaTabel(r, c) {
      const t = h('table', { class: 'tb-simplu' }, h('tbody', {}, Array.from({ length: r }, (_, i) => h('tr', {}, Array.from({ length: c }, () => h(i === 0 ? 'th' : 'td', {}, h('br')))))));
      insereazaBloc(t);
      const prima = t.querySelector('th,td');
      const rg = document.createRange();
      rg.setStart(prima, 0);
      rg.collapse(true);
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(rg);
    }
    function tabelOp(op) {
      const cel = celulaCurenta();
      if (!cel) return toast(app, 'Pune cursorul într-o celulă a tabelului.');
      if (tIstoric) memoreaza();
      const tr = cel.parentNode, tabel = cel.closest('table'), idx = [...tr.children].indexOf(cel);
      const rand = (model) => h('tr', {}, [...model.children].map(() => h('td', {}, h('br'))));
      if (op === 'randSus') tr.before(rand(tr));
      if (op === 'randJos') tr.after(rand(tr));
      if (op === 'colStanga' || op === 'colDreapta') for (const r of tabel.rows) { const ref = r.children[idx]; const nou = h(ref?.tagName === 'TH' ? 'th' : 'td', {}, h('br')); if (ref) (op === 'colStanga' ? ref.before(nou) : ref.after(nou)); }
      if (op === 'stergeRand') { if (tabel.rows.length > 1) tr.remove(); else tabel.remove(); }
      if (op === 'stergeCol') { if (tr.children.length > 1) for (const r of [...tabel.rows]) r.children[idx]?.remove(); else tabel.remove(); }
      if (op === 'stergeTabel') tabel.remove();
      memoreaza();
      schimbat(false);
      deseneazaPanglica();
    }
    function stilTabel(cls) {
      const cel = celulaCurenta();
      if (!cel) return;
      const t = cel.closest('table');
      t.classList.remove('tb-simplu', 'tb-antet', 'tb-dungi', 'tb-fara');
      t.classList.add(cls);
      memoreaza(); schimbat(false);
    }
    const alegeTabel = (ancora) => {
      const info = h('div', { class: 'of-tabel-info' }, 'Tabel 1 × 1');
      const grid = h('div', { class: 'of-tabel-grid' });
      for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) {
        grid.append(h('button', { type: 'button', 'data-r': r, 'data-c': c, 'aria-label': `Tabel ${r} rânduri × ${c} coloane`, onmousedown: fara,
          onmouseenter: () => { info.textContent = `Tabel ${r} × ${c}`; for (const b of grid.children) b.classList.toggle('on', b.dataset.r <= r && b.dataset.c <= c); },
          onclick: () => { inchideMeniu(); insereazaTabel(r, c); } }));
      }
      deschideMeniu(ancora, [info, grid]);
    };

    // ---- Găsire și înlocuire ----
    function inlocuieste(cauta, cu) {
      if (!cauta) return 0;
      if (tIstoric) memoreaza();
      let n = 0;
      const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const noduri = [];
      while (w.nextNode()) noduri.push(w.currentNode);
      const re = new RegExp(cauta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      for (const t of noduri) t.nodeValue = t.nodeValue.replace(re, () => { n++; return cu; });
      memoreaza();
      schimbat(false);
      return n;
    }
    function dialogGasire(cuInlocuire) {
      const c = h('input', { class: 'of-input', placeholder: 'Caută...', 'aria-label': 'Text de căutat' });
      const r = h('input', { class: 'of-input', placeholder: 'Înlocuiește cu...', 'aria-label': 'Text nou' });
      const msg = h('p', { class: 'of-msg', 'aria-live': 'polite' });
      const gaseste = () => {
        if (!c.value) return;
        editor.focus();
        const ok = window.find ? window.find(c.value, false, false, true) : false;
        msg.textContent = ok ? '' : 'Nu am găsit textul.';
      };
      const m = deschideMeniu(btnGasire || editor, h('div', { class: 'of-dialog' },
        h('b', {}, cuInlocuire ? 'Găsire și înlocuire' : 'Găsire'), c, cuInlocuire ? r : null,
        h('div', { class: 'of-rand' },
          h('button', { class: 'of-btn', type: 'button', onclick: gaseste }, 'Găsește următorul'),
          cuInlocuire ? h('button', { class: 'of-btn primar', type: 'button', onclick: () => { const n = inlocuieste(c.value, r.value); msg.textContent = `${n} ${n === 1 ? 'înlocuire' : 'înlocuiri'}.`; } }, 'Înlocuiește tot') : null),
        msg), 'of-meniu-dialog');
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); gaseste(); } });
      c.focus();
      return m;
    }
    let btnGasire = null;

    // ---- Lipire și tragere: imagini și text formatat (curățat) ----
    editor.addEventListener('paste', (e) => {
      const cd = e.clipboardData;
      if (!cd) return;
      const imgs = [...cd.files].filter((f) => f.type.startsWith('image/'));
      e.preventDefault();
      if (imgs.length) return void adaugaImagini(imgs);
      const html = cd.getData('text/html');
      if (html) {
        const frag = O.docSigur(html.replace(/<!--[\s\S]*?-->/g, ''));
        // Fără fonturi uriașe sau culori de fundal ciudate din paginile web: păstrăm aldin/cursiv/liste/tabele.
        for (const el of frag.querySelectorAll('*')) { el.style.removeProperty('font-family'); el.style.removeProperty('font-size'); el.style.removeProperty('background-color'); el.style.removeProperty('color'); }
        if (tIstoric) memoreaza();
        const s = document.getSelection();
        const r = s.getRangeAt(0);
        r.deleteContents();
        const ultim = frag.lastChild;
        r.insertNode(frag);
        if (ultim) { r.setStartAfter(ultim); r.collapse(true); s.removeAllRanges(); s.addRange(r); }
        memoreaza();
        schimbat(false);
        return;
      }
      document.execCommand('insertText', false, cd.getData('text/plain'));
    });
    editor.addEventListener('dragover', (e) => { if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) e.preventDefault(); });
    editor.addEventListener('drop', (e) => {
      const imgs = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) return;
      e.preventDefault();
      const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
      if (r) { const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); }
      adaugaImagini(imgs);
    });
    document.execCommand('defaultParagraphSeparator', false, 'p');
    editor.addEventListener('input', () => { schimbat(); pozitioneazaSel(); });
    editor.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); sari(-1); }
      else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); sari(1); }
      else if (ctrl && k === 's') { e.preventDefault(); onSalveaza && onSalveaza(); }
      else if (ctrl && k === 'f' && mod === 'complet') { e.preventDefault(); dialogGasire(false); }
      else if (ctrl && k === 'h' && mod === 'complet') { e.preventDefault(); dialogGasire(true); }
      else if (ctrl && k === 'e') { e.preventDefault(); exec('justifyCenter'); }
      else if (ctrl && k === 'l') { e.preventDefault(); exec('justifyLeft'); }
      else if (ctrl && k === 'r') { e.preventDefault(); exec('justifyRight'); }
      else if (ctrl && k === 'j') { e.preventDefault(); exec('justifyFull'); }
      else if ((k === 'delete' || k === 'backspace') && selImg) { e.preventDefault(); imgSterge(); }
      else if (k === 'tab' && celulaCurenta()) {
        // Tab mută cursorul în celula următoare (sau adaugă un rând nou la final)
        e.preventDefault();
        const cel = celulaCurenta();
        const toate = [...cel.closest('table').querySelectorAll('td,th')];
        let urm = toate[toate.indexOf(cel) + (e.shiftKey ? -1 : 1)];
        if (!urm && !e.shiftKey) { saved = document.getSelection().getRangeAt(0); tabelOp('randJos'); urm = cel.parentNode.nextElementSibling?.firstElementChild; }
        if (urm) { const r = document.createRange(); r.selectNodeContents(urm); r.collapse(true); document.getSelection().removeAllRanges(); document.getSelection().addRange(r); }
      }
    });
    canvas.addEventListener('scroll', pozitioneazaSel);
    window.addEventListener('resize', pozitioneazaSel);

    // ---- Bara de titlu (doar în Laborator) ----
    const app = h('div', { class: `of-app of-word of-${mod}` });
    const stareEt = h('span', { class: 'of-stare-salvare', 'aria-live': 'polite' });
    btnAnulare = h('button', { class: 'of-qa', type: 'button', title: 'Anulare (Ctrl+Z)', 'aria-label': 'Anulare', onmousedown: fara, onclick: () => sari(-1) }, svg('anulare'));
    btnRefacere = h('button', { class: 'of-qa', type: 'button', title: 'Refacere (Ctrl+Y)', 'aria-label': 'Refacere', onmousedown: fara, onclick: () => sari(1) }, svg('refacere'));
    const titluIn = h('input', { class: 'of-nume', value: titlu, 'aria-label': 'Numele documentului', maxlength: 80 });
    titluIn.addEventListener('change', () => { titluIn.value = titluIn.value.trim() || 'Document'; onTitlu && onTitlu(titluIn.value); });
    const barTitlu = mod === 'complet'
      ? h('div', { class: 'of-titlebar' },
          h('a', { class: 'of-app-link', href: '#/laborator/text', title: 'Înapoi la documentele mele' }, h('span', { class: 'of-logo' }, 'W'), h('span', { class: 'of-app-nume' }, 'Document')),
          h('div', { class: 'of-qa-bar' },
            h('button', { class: 'of-qa', type: 'button', title: 'Salvare (Ctrl+S)', 'aria-label': 'Salvare', onmousedown: fara, onclick: () => onSalveaza && onSalveaza() }, svg('salveaza')),
            btnAnulare, btnRefacere),
          titluIn, stareEt,
          h('a', { class: 'of-qa', href: '#/laborator/text', title: 'Închidere', 'aria-label': 'Închidere' }, svg('inchide')))
      : h('div', { class: 'of-titlebar mic' }, h('span', { class: 'of-logo' }, 'W'), h('span', { class: 'of-app-nume' }, titlu),
          h('div', { class: 'of-qa-bar' }, btnAnulare, btnRefacere));

    // ---- Panglica ----
    const fileEl = h('div', { class: 'of-tabs', role: 'tablist', 'aria-label': 'Panglică' });
    const panglica = h('div', { class: 'of-ribbon', role: 'tabpanel' });
    function file() {
      const f = [['pornire', 'Pornire'], ['inserare', 'Inserare'], ['aspect', 'Aspect']];
      if (mod === 'complet') f.unshift(['fisier', 'Fișier']), f.push(['vizualizare', 'Vizualizare']);
      if (celulaCurenta()) f.push(['tabel', 'Tabel']);
      if (selImg) f.push(['imagine', 'Format imagine']);
      return f;
    }
    function deseneazaFile() {
      umple(fileEl, file().map(([k, v]) => h('button', {
        class: `of-tab${k === 'fisier' ? ' of-tab-fisier' : ''}${k === 'tabel' || k === 'imagine' ? ' of-tab-context' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(filaActiva === k), onmousedown: fara,
        onclick: () => { if (k === 'fisier') return onFisier && onFisier(); filaActiva = k; deseneazaFile(); deseneazaPanglica(); },
      }, v)));
    }
    const fontSel = h('select', { class: 'of-select font', 'aria-label': 'Font', title: 'Font', onchange: (e) => exec('fontName', e.target.value, true) }, TOATE_FONTURILE.map((f) => h('option', { value: f }, f)));
    const sizeSel = h('select', { class: 'of-select marime', 'aria-label': 'Mărimea fontului', title: 'Mărimea fontului', onchange: (e) => marime(Number(e.target.value)) }, MARIMI.map((s) => h('option', { value: s }, String(s))));
    const stilSel = h('div', { class: 'of-stiluri' });
    const comutatoare = {};
    const comutator = (cmd, ico, et, extra = {}) => (comutatoare[cmd] = mic(ico, et, () => exec(cmd), { class: `of-mic ${extra.cls || ''}` }));
    function actualizeazaStare() {
      for (const [cmd, b] of Object.entries(comutatoare)) {
        let v = false;
        try { v = document.queryCommandState(cmd); } catch { /* */ }
        b.setAttribute('aria-pressed', String(v));
      }
      const s = document.getSelection();
      const n = s.rangeCount && editor.contains(s.anchorNode) ? (s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode) : null;
      if (n) {
        const cs = getComputedStyle(n);
        const f = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        if (f && ![...fontSel.options].some((o) => o.value === f)) fontSel.append(h('option', { value: f }, f));
        if (f) fontSel.value = f;
        const pt = Math.round((parseFloat(cs.fontSize) * 3) / 4);
        if (document.activeElement !== sizeSel) { if (!MARIMI.includes(pt)) sizeSel.append(h('option', { value: pt }, String(pt))); sizeSel.value = String(pt); }
        let b = n;
        while (b && b !== editor && !/^(P|H1|H2|H3|BLOCKQUOTE|LI)$/.test(b.tagName)) b = b.parentElement;
        const tag = b && b !== editor ? b.tagName.toLowerCase() : 'p';
        for (const btn of stilSel.children) btn.setAttribute('aria-pressed', String(btn.dataset.tag === tag));
      }
      // fila contextuală Tabel apare / dispare după poziția cursorului
      const areTabel = Boolean(celulaCurenta());
      if (areTabel !== fileEl.textContent.includes('Tabel')) {
        if (!areTabel && filaActiva === 'tabel') filaActiva = 'pornire';
        deseneazaFile();
        if (filaActiva === 'pornire' || !areTabel) deseneazaPanglica();
      }
    }
    const btnCuloare = (ico, et, bara, onPick, faraCul) => {
      const b = h('button', { class: 'of-mic of-cul-btn', type: 'button', title: et, 'aria-label': et, onmousedown: fara, onclick: (e) => deschideMeniu(e.currentTarget, paleta(onPick, { faraCuloare: faraCul })) }, svg(ico), bara);
      return b;
    };
    const baraCuloare = h('span', { class: 'of-cul-bara' });
    baraCuloare.style.background = '#D0021B';
    const baraMarcator = h('span', { class: 'of-cul-bara' });
    baraMarcator.style.background = '#FFF2B3';
    let ultimaCuloare = '#D0021B', ultimMarcator = '#FFF2B3';

    function deseneazaPanglica() {
      inchideMeniu();
      let c = [];
      if (filaActiva === 'pornire') {
        c = [
          mod === 'complet' ? grup('Clipboard',
            h('div', { class: 'of-split' }, mare('lipire', 'Lipire', () => toast(app, 'Pentru lipire folosește Ctrl+V (sau clic dreapta → Lipire).'))),
            stiva([mic('decupare', 'Decupare (Ctrl+X)', () => exec('cut'))], [mic('copiere', 'Copiere (Ctrl+C)', () => exec('copy'))])) : null,
          grup('Font', stiva(
            [fontSel, sizeSel, mic('marire', 'Mărire font', () => treaptaMarime(1)), mic('micsorare', 'Micșorare font', () => treaptaMarime(-1)), mic('golire', 'Golire formatare', () => exec('removeFormat'))],
            [comutator('bold', 'B', 'Aldin (Ctrl+B)', { cls: 'of-b' }), comutator('italic', 'I', 'Cursiv (Ctrl+I)', { cls: 'of-i' }), comutator('underline', 'U', 'Subliniat (Ctrl+U)', { cls: 'of-u' }),
              comutator('strikeThrough', 'ab', 'Tăiere text', { cls: 'of-s' }), comutator('subscript', 'x₂', 'Indice'), comutator('superscript', 'x²', 'Exponent'),
              h('span', { class: 'of-split-mic' },
                mic('marcator', 'Culoare de evidențiere', () => exec('hiliteColor', ultimMarcator, true)),
                h('button', { class: 'of-sageata', type: 'button', 'aria-label': 'Alege culoarea de evidențiere', onmousedown: fara, onclick: (e) => deschideMeniu(e.currentTarget, paleta((cul) => { if (cul) { ultimMarcator = cul; baraMarcator.style.background = cul; } exec('hiliteColor', cul || 'transparent', true); }, { faraCuloare: 'Fără evidențiere' })) }, '▾')),
              h('span', { class: 'of-split-mic' },
                h('button', { class: 'of-mic of-cul-btn', type: 'button', title: 'Culoare font', 'aria-label': 'Culoare font', onmousedown: fara, onclick: () => exec('foreColor', ultimaCuloare, true) }, svg('culoare'), baraCuloare),
                h('button', { class: 'of-sageata', type: 'button', 'aria-label': 'Alege culoarea fontului', onmousedown: fara, onclick: (e) => deschideMeniu(e.currentTarget, paleta((cul) => { const v = cul || '#000000'; ultimaCuloare = v; baraCuloare.style.background = v; exec('foreColor', v, true); }, { faraCuloare: 'Automat (negru)' })) }, '▾'))],
          )),
          grup('Paragraf', stiva(
            [comutator('insertUnorderedList', 'marcatori', 'Listă cu marcatori'), comutator('insertOrderedList', 'numerotare', 'Listă numerotată'),
              mic('indentMinus', 'Micșorare indent', () => exec('outdent', null, true)), mic('indentPlus', 'Mărire indent', () => exec('indent', null, true)),
              mic('spatiere', 'Spațiere între rânduri', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-lista-meniu' }, [['1', '1,0'], ['1.15', '1,15'], ['1.5', '1,5'], ['2', '2,0'], ['2.5', '2,5'], ['3', '3,0']].map(([v, t]) => h('button', { type: 'button', role: 'menuitem', onmousedown: fara, onclick: () => { inchideMeniu(); spatiere(v); } }, t)))))],
            [comutator('justifyLeft', 'stanga', 'Aliniere la stânga (Ctrl+L)'), comutator('justifyCenter', 'centru', 'Centrare (Ctrl+E)'), comutator('justifyRight', 'dreapta', 'Aliniere la dreapta (Ctrl+R)'), comutator('justifyFull', 'justificat', 'Aliniere stânga-dreapta (Ctrl+J)')],
          )),
          grup('Stiluri', (umple(stilSel, STILURI_DOC.map(([tag, et]) => h('button', { class: `of-stil st-${tag}`, type: 'button', 'data-tag': tag, title: `Stil: ${et}`, onmousedown: fara, onclick: () => exec('formatBlock', tag) }, h('span', {}, et)))), stilSel)),
          mod === 'complet' ? grup('Editare', stiva(
            [(btnGasire = mic('gasire', 'Găsire (Ctrl+F)', () => dialogGasire(false), { text: 'Găsire' }))],
            [mic('inlocuire', 'Înlocuire (Ctrl+H)', () => dialogGasire(true), { text: 'Înlocuire' })])) : null,
        ];
      } else if (filaActiva === 'inserare') {
        c = [
          grup('Tabele', mare('tabel', 'Tabel', (e) => alegeTabel(e.currentTarget))),
          grup('Ilustrații', mare('imagine', 'Imagine', inserareImagine, { title: 'Imagine de pe calculator (poți și să lipești cu Ctrl+V sau să tragi imaginea în pagină)' })),
          grup('Simboluri',
            mare('simbol', 'Simbol', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-simboluri' }, SIMBOLURI.map((s) => h('button', { type: 'button', role: 'menuitem', onmousedown: fara, onclick: () => { inchideMeniu(); exec('insertText', s); } }, s))))),
            mare('emoji', 'Emoji', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-simboluri emoji' }, EMOJI.map((s) => h('button', { type: 'button', role: 'menuitem', onmousedown: fara, onclick: () => { inchideMeniu(); exec('insertText', s); } }, s)))))),
          grup('Text',
            mare('linie', 'Linie orizontală', () => exec('insertHorizontalRule')),
            mare('data', 'Data de azi', () => exec('insertText', new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }))),
            mod === 'complet' ? mare('link', 'Link', () => {
              const u = prompt('Adresa paginii web (ex. https://edudigi.ro):', 'https://');
              if (u && /^https?:\/\/\S+$/i.test(u.trim())) exec('createLink', u.trim());
              else if (u) toast(app, 'Adresa trebuie să înceapă cu http:// sau https://', 'error');
            }) : null,
            mod === 'complet' ? mare('rupere', 'Sfârșit de pagină', () => { const hr = h('hr', { class: 'page-break' }); insereazaBloc(hr); }) : null),
        ];
      } else if (filaActiva === 'aspect') {
        c = [
          grup('Inițializare pagină',
            mare('margini', 'Margini', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-lista-meniu' }, Object.entries(MARGINI).map(([k, v]) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(setari.margini === k), onclick: () => { inchideMeniu(); setari.margini = k; aplicaSetari(); schimbat(false); } }, v))))),
            mare('orientare', 'Orientare', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-lista-meniu' }, [['portret', 'Portret'], ['peisaj', 'Peisaj']].map(([k, v]) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(setari.orientare === k), onclick: () => { inchideMeniu(); setari.orientare = k; aplicaSetari(); schimbat(false); pozitioneazaSel(); } }, v)))))),
          grup('Fundal pagină', mare('culoarePagina', 'Culoare pagină', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-lista-meniu' }, Object.entries(CULORI_PAGINA).map(([k, v]) => {
            const b = h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(setari.culoarePagina === k), onclick: () => { inchideMeniu(); setari.culoarePagina = k; aplicaSetari(); schimbat(false); } }, h('span', { class: 'of-mostra' }), v);
            b.firstChild.style.background = k || '#fff';
            return b;
          }))))),
        ];
      } else if (filaActiva === 'vizualizare') {
        c = [
          grup('Zoom',
            mare('zoom', '100%', () => { setari.zoom = 100; aplicaSetari(); pozitioneazaSel(); }),
            stiva([mic('marire', 'Mărire', () => { setari.zoom = Math.min(200, setari.zoom + 10); aplicaSetari(); pozitioneazaSel(); }, { text: 'Mărire' })], [mic('micsorare', 'Micșorare', () => { setari.zoom = Math.max(50, setari.zoom - 10); aplicaSetari(); pozitioneazaSel(); }, { text: 'Micșorare' })])),
          grup('Afișare', mare('ecran', 'Ecran complet', () => { (app.requestFullscreen ? app.requestFullscreen() : Promise.reject()).catch(() => toast(app, 'Ecranul complet nu este disponibil.')); })),
          grup('Statistică', mare('cuvinte', 'Număr de cuvinte', () => {
            const t = editor.innerText || '';
            const cuv = (t.match(/[\p{L}\p{N}]+/gu) || []).length;
            const par = [...editor.querySelectorAll('p,h1,h2,h3,li,blockquote')].filter((p) => p.textContent.trim()).length;
            toast(app, `${cuv} cuvinte · ${t.replace(/\s/g, '').length} caractere · ${par} paragrafe · ${editor.querySelectorAll('img').length} imagini`);
          })),
        ];
      } else if (filaActiva === 'tabel') {
        c = [
          grup('Rânduri și coloane',
            mare('randSus', 'Inserare deasupra', () => tabelOp('randSus')), mare('randJos', 'Inserare dedesubt', () => tabelOp('randJos')),
            mare('colStanga', 'Inserare la stânga', () => tabelOp('colStanga')), mare('colDreapta', 'Inserare la dreapta', () => tabelOp('colDreapta'))),
          grup('Ștergere', stiva([mic('stergeRand', 'Ștergere rând', () => tabelOp('stergeRand'), { text: 'Rând' })], [mic('stergeCol', 'Ștergere coloană', () => tabelOp('stergeCol'), { text: 'Coloană' })], [mic('sterge', 'Ștergere tabel', () => tabelOp('stergeTabel'), { text: 'Tabel' })])),
          grup('Stiluri tabel', h('div', { class: 'of-galerie' }, [['tb-simplu', 'Simplu'], ['tb-antet', 'Antet colorat'], ['tb-dungi', 'Cu dungi'], ['tb-fara', 'Fără chenar']].map(([k, v]) => h('button', { class: `of-tb-opt ${k}`, type: 'button', onmousedown: fara, onclick: () => stilTabel(k) }, h('span', { class: 'of-tb-mini' }, h('i'), h('i'), h('i'), h('i'), h('i'), h('i')), h('span', {}, v))))),
        ];
      } else if (filaActiva === 'imagine') {
        c = [
          grup('Încadrare text', [['linie', 'În linie cu textul'], ['stanga', 'Stânga, text în jur'], ['centru', 'Centrată'], ['dreapta', 'Dreapta, text în jur']].map(([k, v]) => mare(k === 'linie' ? 'imagine' : k === 'centru' ? 'centru' : k, v, () => imgAliniere(k), { 'aria-pressed': String(Boolean(selImg?.classList.contains(`img-${k}`))) }))),
          grup('Dimensiune', stiva(
            [mic('S', 'Mică (25%)', () => imgLatime(0.25), { text: 'Mică' }), mic('M', 'Medie (50%)', () => imgLatime(0.5), { text: 'Medie' })],
            [mic('L', 'Mare (75%)', () => imgLatime(0.75), { text: 'Mare' }), mic('XL', 'Toată lățimea', () => imgLatime(1), { text: 'Toată lățimea' })]),
          h('p', { class: 'of-sfat' }, 'Sau trage de colțurile imaginii.')),
          grup('Stiluri imagine', stiva(
            [mic('▢', 'Chenar', imgChenar, { text: 'Chenar', 'aria-pressed': String(Boolean(selImg?.classList.contains('img-chenar'))) }), mic('◪', 'Umbră', imgUmbra, { text: 'Umbră', 'aria-pressed': String(Boolean(selImg?.classList.contains('img-umbra'))) })],
            [mic('◯', 'Colțuri rotunjite', imgRotunjit, { text: 'Rotunjită', 'aria-pressed': String(Boolean(selImg?.classList.contains('img-rotunjit'))) })])),
          grup('Accesibilitate', mare('cuvinte', 'Text alternativ', () => {
            if (!selImg) return;
            const t = prompt('Descrie imaginea pentru cine nu o poate vedea:', selImg.alt || '');
            if (t != null) { selImg.alt = t.trim(); memoreaza(); schimbat(false); }
          })),
          grup('Ștergere', mare('sterge', 'Șterge imaginea', imgSterge)),
        ];
      }
      umple(panglica, c);
      actualizeazaStare();
    }

    // ---- Bara de stare ----
    const stareCuv = h('span');
    const zoomEt = h('span', { class: 'of-zoom-et' }, '100%');
    const zoomIn = h('input', { type: 'range', min: 50, max: 200, step: 10, value: 100, 'aria-label': 'Zoom' });
    zoomIn.addEventListener('input', () => { setari.zoom = Number(zoomIn.value); aplicaSetari(); pozitioneazaSel(); });
    function stareBara() {
      const t = editor.innerText || '';
      const cuv = (t.match(/[\p{L}\p{N}]+/gu) || []).length;
      const pag = Math.max(1, Math.ceil(editor.scrollHeight / (setari.orientare === 'peisaj' ? 794 : 1123)));
      stareCuv.textContent = `Pagina 1 din ${pag} · ${cuv} ${cuv === 1 ? 'cuvânt' : 'cuvinte'}`;
    }
    const baraStare = h('div', { class: 'of-statusbar' }, stareCuv, h('span', { class: 'of-limba' }, 'Română (România)'), h('span', { class: 'of-flex' }),
      h('button', { class: 'of-zoom-btn', type: 'button', 'aria-label': 'Micșorare', onclick: () => { setari.zoom = Math.max(50, setari.zoom - 10); aplicaSetari(); pozitioneazaSel(); } }, '−'),
      zoomIn,
      h('button', { class: 'of-zoom-btn', type: 'button', 'aria-label': 'Mărire', onclick: () => { setari.zoom = Math.min(200, setari.zoom + 10); aplicaSetari(); pozitioneazaSel(); } }, '+'),
      zoomEt);

    app.append(barTitlu, fileEl, panglica, canvas, baraStare);
    incarca(stare);
    deseneazaFile();
    deseneazaPanglica();
    memoreaza();
    setTimeout(stareBara, 0);

    return {
      el: app, editor,
      reset: () => { initial(); istoric = []; poz = -1; memoreaza(); stareBara(); },
      html: () => editor.innerHTML,
      getStare, setStare: (st) => { incarca(st); istoric = []; poz = -1; memoreaza(); stareBara(); },
      setTitlu: (t) => { titluIn.value = t; },
      setStareSalvare: (t, err = false) => { stareEt.textContent = t; stareEt.classList.toggle('error', err); },
      toast: (t, tip) => toast(app, t, tip),
      text: () => editor.innerText,
    };
  }

  // Export pentru Word: arhivă web (MHTML) salvată ca .doc; Word o deschide cu tot cu imagini.
  function exportDoc(st, titlu) {
    const imagini = [];
    const tmp = document.createElement('div');
    tmp.append(O.docSigur(st.html));
    tmp.querySelectorAll('img').forEach((img, i) => {
      const m = /^data:(image\/[\w+.-]+);base64,(.*)$/.exec(img.getAttribute('src') || '');
      if (!m) return img.remove();
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const nume = `imagine${String(i + 1).padStart(3, '0')}.${ext}`;
      imagini.push({ nume, tip: m[1], date: m[2] });
      img.setAttribute('src', nume);
      const w = parseFloat(img.style.width) || 400;
      img.setAttribute('width', String(Math.round(w)));
    });
    const marg = { normal: '2.5cm', ingust: '1.27cm', lat: '3.5cm' }[st.margini] || '2.5cm';
    const marime = st.orientare === 'peisaj' ? '29.7cm 21cm' : '21cm 29.7cm';
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${titlu.replace(/</g, '')}</title>
<style>@page WordSection1{size:${marime};margin:${marg}}div.WordSection1{page:WordSection1}
body{font-family:Calibri,sans-serif;font-size:11pt}p{margin:0 0 8pt}h1{font-size:26pt;font-weight:normal;color:#17365D}h2{font-size:16pt;color:#2E74B5}h3{font-size:13pt;color:#1F4D78}
blockquote{font-style:italic;color:#595959;border-left:3pt solid #BFBFBF;padding-left:8pt}table{border-collapse:collapse}td,th{border:1pt solid #999;padding:4pt 6pt}th{background:#DCE6F2}
.tb-antet th{background:#2B579A;color:#fff}.tb-fara td,.tb-fara th{border:none}.img-stanga{float:left;margin:0 10pt 6pt 0}.img-dreapta{float:right;margin:0 0 6pt 10pt}.img-centru{display:block;margin:6pt auto}
hr.page-break{page-break-after:always;border:0}</style></head><body${st.culoarePagina ? ` bgcolor="${st.culoarePagina}"` : ''}><div class="WordSection1">${tmp.innerHTML.replace(/<hr class="page-break">/g, '<br clear="all" style="page-break-before:always">')}</div></body></html>`;
    const B = '----=_edudigi_document';
    const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, '$&\r\n');
    let out = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${B}"; type="text/html"\r\n\r\n--${B}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/edudigi/document.htm\r\n\r\n${b64(html)}\r\n`;
    for (const im of imagini) out += `--${B}\r\nContent-Type: ${im.tip}\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/edudigi/${im.nume}\r\n\r\n${im.date.replace(/.{76}/g, '$&\r\n')}\r\n`;
    return `${out}--${B}--\r\n`;
  }
  // Deschide un document salvat de noi (.doc MHTML), un .html sau un .txt.
  function importDoc(text, numeFisier) {
    if (/^MIME-Version:/im.test(text.slice(0, 400)) && /multipart\/related/i.test(text.slice(0, 600))) {
      const bm = /boundary="?([^";\r\n]+)"?/i.exec(text);
      const parti = bm ? text.split(`--${bm[1]}`) : [];
      let html = '';
      const imagini = {};
      for (const p of parti) {
        const i = p.search(/\r?\n\r?\n/);
        if (i < 0) continue;
        const antet = p.slice(0, i), corp = p.slice(i).trim();
        const tip = (/Content-Type:\s*([^;\r\n]+)/i.exec(antet) || [])[1] || '';
        const loc = (/Content-Location:\s*(\S+)/i.exec(antet) || [])[1] || '';
        const b64 = /base64/i.test(antet);
        if (/text\/html/i.test(tip)) html = b64 ? decodeURIComponent(escape(atob(corp.replace(/\s/g, '')))) : corp.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16)));
        else if (/^image\//i.test(tip) && b64) imagini[loc.split('/').pop()] = `data:${tip};base64,${corp.replace(/\s/g, '')}`;
      }
      const corp = (/<div class="WordSection1">([\s\S]*)<\/div>\s*<\/body>/i.exec(html) || /<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [, html])[1];
      return { html: corp.replace(/src="([^"]+)"/g, (m, s) => (imagini[s] ? `src="${imagini[s]}"` : m)) };
    }
    if (/\.html?$/i.test(numeFisier) || /<\/?(p|div|body|h1|table)\b/i.test(text)) {
      const corp = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(text) || [, text])[1];
      return { html: corp };
    }
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return { html: text.split(/\r?\n/).map((l) => `<p>${esc(l) || '<br>'}</p>`).join('') };
  }


  // =====================================================================
  // Foaia de calcul
  // =====================================================================
  const CULORI_GRAFIC = ['#2B579A', '#E8710A', '#1E8E3E', '#C2185B', '#7B3FB8', '#0E9AA7', '#F2C200', '#D0021B'];
  const FELURI_GRAFIC = { coloane: 'Coloane', bare: 'Bare', linie: 'Linie', radiala: 'Radială' };
  const FUNCTII = [
    ['SUM', 'Suma valorilor', 'SUM(B2:B6)'], ['AVERAGE', 'Media aritmetică', 'AVERAGE(B2:B6)'], ['MIN', 'Cea mai mică valoare', 'MIN(B2:B6)'],
    ['MAX', 'Cea mai mare valoare', 'MAX(B2:B6)'], ['COUNT', 'Câte celule conțin numere', 'COUNT(B2:B6)'], ['COUNTA', 'Câte celule sunt completate', 'COUNTA(A2:A6)'],
    ['IF', 'Alege între două rezultate', 'IF(B2>=5;"promovat";"nepromovat")'], ['ROUND', 'Rotunjește la N zecimale', 'ROUND(B2;2)'], ['ABS', 'Valoarea absolută', 'ABS(B2)'],
    ['AND', 'Adevărat dacă toate condițiile sunt adevărate', 'AND(B2>5;C2>5)'], ['OR', 'Adevărat dacă măcar o condiție e adevărată', 'OR(B2>9;C2>9)'],
    ['NOT', 'Negația unei condiții', 'NOT(B2>5)'], ['CONCAT', 'Lipește texte', 'CONCAT(A2;" ";B2)'],
  ];
  const isErr = (v) => v && typeof v === 'object' && 'err' in v;
  const colIdx = (s) => [...s.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const fmtNr = (v, d) => (d == null ? formatValue(v) : v.toLocaleString('ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d }));
  function afiseaza(v, cell = {}) {
    if (isErr(v)) return v.err;
    if (typeof v === 'number') {
      if (cell.fmt === 'pct') return `${fmtNr(v * 100, cell.decimals ?? 0)}%`;
      if (cell.fmt === 'lei') return `${fmtNr(v, cell.decimals ?? 2)} lei`;
      if (cell.fmt === 'num') return fmtNr(v, cell.decimals ?? 2);
      return cell.decimals != null ? fmtNr(v, cell.decimals) : formatValue(v);
    }
    return formatValue(v, cell.decimals);
  }
  // Inserarea / ștergerea unui rând sau a unei coloane mută referințele din formule (ca în Excel).
  function ajusteazaRef(f, axa, idx, delta) {
    return f.replace(/("[^"]*")|(\$?)([A-Z]{1,2})(\$?)(\d{1,4})(?![\w(])/g, (m, str, d1, col, d2, row, off, tot) => {
      if (str) return str;
      if (/[A-Z]/i.test(tot[off - 1] || '')) return m;
      let c = colIdx(col), r = Number(row) - 1;
      const v = axa === 'r' ? r : c;
      if (delta > 0 && v >= idx) axa === 'r' ? (r += delta) : (c += delta);
      if (delta < 0) {
        if (v > idx) axa === 'r' ? (r += delta) : (c += delta);
        else if (v === idx) {
          const inZona = tot[off + m.length] === ':' || tot[off - 1] === ':';
          if (!inZona) return '#REF!';
          if (tot[off - 1] === ':') axa === 'r' ? (r -= 1) : (c -= 1);
        }
      }
      if (r < 0 || c < 0) return '#REF!';
      return `${d1}${colName(c)}${d2}${r + 1}`;
    });
  }

  function createSheet({ grid = [], cols = 8, rows = 15, titlu = 'Registru1', stare = null, mod = 'lectie', onSchimbare = null, onFisier = null, onTitlu = null, onSalveaza = null } = {}) {
    let cells = O.cellsFromGrid(grid);
    let colW = {}, obiecte = [], afisareFormule = false, grila = true, zoom = 100;
    const initialCells = JSON.parse(JSON.stringify(cells));
    let sel = { c: 0, r: 0 }, anchor = { c: 0, r: 0 };
    let editing = null, selObj = null, filaActiva = 'pornire';
    const listeners = [];
    const app = h('div', { class: `of-app of-excel of-${mod}` });

    // ---- Grila ----
    const nameBox = h('input', { class: 'of-namebox', 'aria-label': 'Caseta de nume (celula selectată)', spellcheck: 'false' });
    const fx = h('input', { class: 'of-fx-input', 'aria-label': 'Bara de formule', spellcheck: 'false', placeholder: 'Scrie o valoare sau o formulă, de exemplu =SUM(B2:B5)' });
    const table = h('table', { class: 'of-grid', role: 'grid' });
    const colgroup = h('colgroup');
    const tds = {};
    const ths = [];
    const rhs = [];
    colgroup.append(h('col', { class: 'of-col-hdr' }));
    const colEls = [];
    for (let c = 0; c < cols; c++) { const ce = h('col'); colEls.push(ce); colgroup.append(ce); }
    const head = h('tr', {}, h('th', { class: 'of-corner', title: 'Selectează tot', onmousedown: (e) => { e.preventDefault(); commit(); anchor = { c: 0, r: 0 }; sel = { c: cols - 1, r: rows - 1 }; refresh(); wrap.focus(); } }));
    for (let c = 0; c < cols; c++) {
      const th = h('th', { scope: 'col', 'data-c': c }, colName(c), h('span', { class: 'of-col-resize', 'data-c': c }));
      th.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('of-col-resize')) return;
        e.preventDefault(); commit();
        if (e.shiftKey) sel = { c, r: rows - 1 }; else { anchor = { c, r: 0 }; sel = { c, r: rows - 1 }; }
        refresh(); wrap.focus();
      });
      ths.push(th);
      head.append(th);
    }
    table.append(colgroup, h('thead', {}, head));
    const body = h('tbody');
    for (let r = 0; r < rows; r++) {
      const rh = h('th', { scope: 'row', 'data-r': r }, String(r + 1));
      rh.addEventListener('mousedown', (e) => { e.preventDefault(); commit(); if (e.shiftKey) sel = { c: cols - 1, r }; else { anchor = { c: 0, r }; sel = { c: cols - 1, r }; } refresh(); wrap.focus(); });
      rhs.push(rh);
      const tr = h('tr', {}, rh);
      for (let c = 0; c < cols; c++) {
        const ref = refName(c, r);
        const td = h('td', { 'data-ref': ref, 'data-c': c, 'data-r': r, role: 'gridcell' });
        tds[ref] = td;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    const fillH = h('div', { class: 'of-fill', title: 'Trage pentru a copia (completare automată)' });
    const stratObj = h('div', { class: 'of-obiecte' });
    const zoomBox = h('div', { class: 'of-zoombox' }, table, fillH, stratObj);
    const wrap = h('div', { class: 'of-sheet-wrap sheet-wrap', tabindex: '0', 'aria-label': 'Foaia de calcul. Săgețile mută selecția, scrie pentru a completa, Enter confirmă.' }, zoomBox);

    const rng = () => ({ c1: Math.min(sel.c, anchor.c), c2: Math.max(sel.c, anchor.c), r1: Math.min(sel.r, anchor.r), r2: Math.max(sel.r, anchor.r) });
    const refsZona = (z = rng()) => { const out = []; for (let r = z.r1; r <= z.r2; r++) for (let c = z.c1; c <= z.c2; c++) out.push(refName(c, r)); return out; };
    const zonaText = (z = rng()) => (z.c1 === z.c2 && z.r1 === z.r2 ? refName(z.c1, z.r1) : `${refName(z.c1, z.r1)}:${refName(z.c2, z.r2)}`);

    // ---- Istoric ----
    let istoric = [], poz = -1;
    const instantaneu = () => JSON.stringify({ cells, colW, obiecte });
    function memoreaza() {
      const s = instantaneu();
      if (istoric[poz] === s) return;
      istoric = istoric.slice(0, poz + 1);
      istoric.push(s);
      if (istoric.length > 100) istoric.shift();
      poz = istoric.length - 1;
      actualizeazaIstoric();
    }
    function sari(d) {
      commit();
      const t = poz + d;
      if (t < 0 || t >= istoric.length) return;
      poz = t;
      const st = JSON.parse(istoric[poz]);
      cells = st.cells; colW = st.colW || {}; obiecte = st.obiecte || [];
      selObj = null;
      aplicaLatimi(); refresh(); deseneazaObiecte(); notifica(false);
      actualizeazaIstoric();
    }
    let btnAnulare, btnRefacere;
    function actualizeazaIstoric() {
      if (btnAnulare) btnAnulare.disabled = poz <= 0;
      if (btnRefacere) btnRefacere.disabled = poz >= istoric.length - 1;
    }
    function notifica(cuIstoric = true) {
      if (cuIstoric) memoreaza();
      for (const fn of listeners) fn();
      onSchimbare && onSchimbare();
    }

    // ---- Afișare ----
    function refresh() {
      const sheet = new Sheet(cells);
      const z = rng();
      const activ = refName(sel.c, sel.r);
      for (const [ref, td] of Object.entries(tds)) {
        if (editing && editing.ref === ref) continue;
        const cell = cells[ref];
        const c = Number(td.dataset.c), r = Number(td.dataset.r);
        let txt = '', cls = [];
        if (cell) {
          const v = sheet.value(ref);
          txt = afisareFormule && String(cell.raw).startsWith('=') ? cell.raw : afiseaza(v, cell);
          if (typeof v === 'number' && !(afisareFormule && String(cell.raw).startsWith('='))) cls.push('num');
          if (isErr(v)) cls.push('err');
          if (cell.bold) cls.push('bold');
          if (cell.italic) cls.push('italic');
          if (cell.underline) cls.push('underline');
          if (cell.wrap) cls.push('wrap');
          if (cell.align) cls.push(`a-${cell.align}`);
          if (cell.bd) for (const ch of cell.bd) cls.push(`bd-${ch}`);
        }
        if (c >= z.c1 && c <= z.c2 && r >= z.r1 && r <= z.r2) cls.push('in-range');
        if (ref === activ) cls.push('active');
        if (td.textContent !== txt) td.textContent = txt;
        const cn = cls.join(' ');
        if (td.className !== cn) td.className = cn;
        const bg = cell?.fill ? FILLS[cell.fill] || '' : '';
        if (td.style.backgroundColor !== bg) td.style.backgroundColor = bg;
        const col = cell?.color || '';
        if (td.style.color !== col) td.style.color = col;
      }
      ths.forEach((th, c) => th.classList.toggle('on', c >= z.c1 && c <= z.c2));
      rhs.forEach((rh, r) => rh.classList.toggle('on', r >= z.r1 && r <= z.r2));
      nameBox.value = zonaText(z);
      if (document.activeElement !== fx && !editing) fx.value = cells[activ]?.raw ?? '';
      // mânerul de completare, în colțul din dreapta-jos al selecției
      const last = tds[refName(z.c2, z.r2)];
      fillH.style.left = `${last.offsetLeft + last.offsetWidth - 4}px`;
      fillH.style.top = `${last.offsetTop + last.offsetHeight - 4}px`;
      table.classList.toggle('fara-grila', !grila);
      stareSelectie(sheet, z);
      actualizeazaButoane();
      if (obiecte.some((o) => o.tip === 'grafic')) deseneazaObiecte();
    }
    function aplicaLatimi() {
      colEls.forEach((ce, c) => { ce.style.width = `${colW[colName(c)] || 92}px`; });
      zoomBox.style.zoom = String(zoom / 100);
    }

    function setRaw(ref, raw) {
      const cell = { ...(cells[ref] || {}), raw };
      const areFormat = Object.keys(cell).some((k) => k !== 'raw' && cell[k] != null && cell[k] !== '' && cell[k] !== false);
      if (raw === '' && !areFormat) delete cells[ref]; else cells[ref] = cell;
    }
    // ---- Editare în celulă, cu „modul indicare”: în timpul unei formule, clic pe celule = referințe ----
    function startEdit(replace, firstChar = '') {
      if (editing) return;
      const ref = refName(sel.c, sel.r);
      const td = tds[ref];
      const input = h('input', { class: 'of-cell-input', value: replace ? firstChar : cells[ref]?.raw ?? '', 'aria-label': `Editare ${ref}`, spellcheck: 'false' });
      editing = { ref, input };
      td.textContent = '';
      td.classList.add('editing');
      td.append(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener('input', () => { fx.value = input.value; });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); move(0, e.shiftKey ? -1 : 1); wrap.focus(); }
        else if (e.key === 'Tab') { e.preventDefault(); commit(); move(e.shiftKey ? -1 : 1, 0); wrap.focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); editing = null; td.classList.remove('editing'); refresh(); wrap.focus(); }
        e.stopPropagation();
      });
      input.addEventListener('blur', () => setTimeout(() => { if (editing && editing.input === input && document.activeElement !== fx && !indicare) commit(); }, 0));
    }
    function commit() {
      if (!editing) return;
      const { ref, input } = editing;
      editing = null;
      tds[ref].classList.remove('editing');
      const v = input.value.trim();
      if ((cells[ref]?.raw ?? '') !== v) { setRaw(ref, v); refresh(); notifica(); } else refresh();
    }
    let indicare = null; // { input, start, ancora }
    const asteaptaRef = (inp) => inp.value.startsWith('=') && /[=(,;+\-*/^&<>:]\s*$/.test(inp.value.slice(0, inp.selectionStart ?? inp.value.length));
    function inputActiv() { return editing ? editing.input : document.activeElement === fx ? fx : null; }

    function move(dc, dr, extend = false) {
      sel = { c: Math.min(cols - 1, Math.max(0, sel.c + dc)), r: Math.min(rows - 1, Math.max(0, sel.r + dr)) };
      if (!extend) anchor = { ...sel };
      selObj = null; deseneazaObiecte();
      refresh();
      tds[refName(sel.c, sel.r)].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    // Selecție cu mouse-ul (tragere), indicare în formule
    let tragere = false;
    table.addEventListener('mousedown', (e) => {
      const td = e.target.closest('td');
      if (!td || td.classList.contains('editing')) return;
      const c = Number(td.dataset.c), r = Number(td.dataset.r);
      const inp = inputActiv();
      if (inp && asteaptaRef(inp)) {
        e.preventDefault();
        const start = inp.selectionStart ?? inp.value.length;
        indicare = { input: inp, start, ancora: { c, r } };
        const ref = refName(c, r);
        inp.value = inp.value.slice(0, start) + ref + inp.value.slice(inp.selectionEnd ?? start);
        inp.setSelectionRange(start + ref.length, start + ref.length);
        fx.value = inp.value;
        tragere = true;
        return;
      }
      e.preventDefault();
      commit();
      if (e.shiftKey) sel = { c, r }; else { sel = anchor = { c, r }; }
      selObj = null; deseneazaObiecte();
      refresh();
      wrap.focus();
      tragere = true;
    });
    table.addEventListener('mouseover', (e) => {
      if (!tragere) return;
      const td = e.target.closest('td');
      if (!td) return;
      const c = Number(td.dataset.c), r = Number(td.dataset.r);
      if (indicare) {
        const a = indicare.ancora;
        const z = { c1: Math.min(a.c, c), c2: Math.max(a.c, c), r1: Math.min(a.r, r), r2: Math.max(a.r, r) };
        const txt = zonaText(z);
        const inp = indicare.input;
        const dupa = inp.value.slice(inp.selectionEnd);
        inp.value = inp.value.slice(0, indicare.start) + txt + dupa;
        inp.setSelectionRange(indicare.start + txt.length, indicare.start + txt.length);
        fx.value = inp.value;
        return;
      }
      sel = { c, r };
      refresh();
    });
    document.addEventListener('mouseup', () => {
      tragere = false;
      if (indicare) { const inp = indicare.input; indicare = null; inp.focus(); }
    });
    table.addEventListener('dblclick', (e) => { if (e.target.closest('td')) startEdit(false); });

    // ---- Completare automată (mânerul din colț) ----
    fillH.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      commit();
      const z = rng();
      let tinta = null;
      const mut = (ev) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('td');
        if (!el || !tds[el.dataset.ref]) return;
        const c = Number(el.dataset.c), r = Number(el.dataset.r);
        const jos = r - z.r2, dr = c - z.c2;
        tinta = jos >= dr && jos > 0 ? { r, c: z.c2, dir: 'r' } : dr > 0 ? { c, r: z.r2, dir: 'c' } : null;
        for (const td of Object.values(tds)) td.classList.remove('fill-prev');
        if (tinta) for (let rr = z.r1; rr <= (tinta.dir === 'r' ? tinta.r : z.r2); rr++) for (let cc = z.c1; cc <= (tinta.dir === 'c' ? tinta.c : z.c2); cc++) tds[refName(cc, rr)].classList.add('fill-prev');
      };
      const gata = () => {
        document.removeEventListener('pointermove', mut);
        document.removeEventListener('pointerup', gata);
        for (const td of Object.values(tds)) td.classList.remove('fill-prev');
        if (tinta) completeaza(z, tinta);
      };
      document.addEventListener('pointermove', mut);
      document.addEventListener('pointerup', gata);
    });
    function completeaza(z, t) {
      const sheet = new Sheet(cells);
      if (t.dir === 'r') {
        const n = z.r2 - z.r1 + 1;
        for (let c = z.c1; c <= z.c2; c++) {
          const src = Array.from({ length: n }, (_, i) => cells[refName(c, z.r1 + i)]);
          const nums = src.map((x, i) => (x && !String(x.raw).startsWith('=') ? sheet.value(refName(c, z.r1 + i)) : null));
          const serie = n >= 2 && nums.every((v) => typeof v === 'number');
          const pas = serie ? (nums[n - 1] - nums[0]) / (n - 1) : 0;
          for (let r = z.r2 + 1; r <= t.r; r++) {
            const k = (r - z.r1) % n, s = src[k], ref = refName(c, r);
            if (!s) { delete cells[ref]; continue; }
            let raw = s.raw;
            if (String(raw).startsWith('=')) raw = shiftFormula(raw, r - (z.r1 + k), 0);
            else if (serie) raw = String(+(nums[n - 1] + pas * (r - z.r2)).toFixed(10)).replace('.', ',');
            cells[ref] = { ...s, raw };
          }
        }
        sel = { c: z.c2, r: t.r };
      } else {
        const n = z.c2 - z.c1 + 1;
        for (let r = z.r1; r <= z.r2; r++) {
          const src = Array.from({ length: n }, (_, i) => cells[refName(z.c1 + i, r)]);
          const nums = src.map((x, i) => (x && !String(x.raw).startsWith('=') ? sheet.value(refName(z.c1 + i, r)) : null));
          const serie = n >= 2 && nums.every((v) => typeof v === 'number');
          const pas = serie ? (nums[n - 1] - nums[0]) / (n - 1) : 0;
          for (let c = z.c2 + 1; c <= t.c; c++) {
            const k = (c - z.c1) % n, s = src[k], ref = refName(c, r);
            if (!s) { delete cells[ref]; continue; }
            let raw = s.raw;
            if (String(raw).startsWith('=')) raw = shiftFormula(raw, 0, c - (z.c1 + k));
            else if (serie) raw = String(+(nums[n - 1] + pas * (c - z.c2)).toFixed(10)).replace('.', ',');
            cells[ref] = { ...s, raw };
          }
        }
        sel = { c: t.c, r: z.r2 };
      }
      anchor = { c: z.c1, r: z.r1 };
      refresh();
      notifica();
    }

    // ---- Copiere / decupare / lipire ----
    let clip = null;
    function copiaza(taie = false) {
      commit();
      const z = rng();
      const sheet = new Sheet(cells);
      const date = [];
      for (let r = z.r1; r <= z.r2; r++) { const rand = []; for (let c = z.c1; c <= z.c2; c++) rand.push(cells[refName(c, r)] ? { ...cells[refName(c, r)] } : null); date.push(rand); }
      const tsv = date.map((rand, i) => rand.map((x, j) => (x ? afiseaza(sheet.value(refName(z.c1 + j, z.r1 + i)), x) : '')).join('\t')).join('\n');
      clip = { date, z, taie, tsv };
      navigator.clipboard?.writeText(tsv).catch(() => {});
      for (const td of Object.values(tds)) td.classList.remove('clip');
      for (const ref of refsZona(z)) tds[ref].classList.add('clip');
      toastMic(taie ? 'Decupat. Alege unde lipești și apasă Ctrl+V.' : 'Copiat. Alege unde lipești și apasă Ctrl+V.');
    }
    function lipeste(text) {
      commit();
      const z0 = rng();
      if (clip && (text == null || text.replace(/\r/g, '') === clip.tsv)) {
        const { date, z, taie } = clip;
        for (let i = 0; i < date.length; i++) for (let j = 0; j < date[i].length; j++) {
          const r = z0.r1 + i, c = z0.c1 + j;
          if (r >= rows || c >= cols) continue;
          const s = date[i][j], ref = refName(c, r);
          if (!s) { delete cells[ref]; continue; }
          cells[ref] = { ...s, raw: String(s.raw).startsWith('=') && !taie ? shiftFormula(s.raw, r - (z.r1 + i), c - (z.c1 + j)) : s.raw };
        }
        if (taie) { for (let i = 0; i < date.length; i++) for (let j = 0; j < date[i].length; j++) { const r = z.r1 + i, c = z.c1 + j; if (r < z0.r1 || r >= z0.r1 + date.length || c < z0.c1 || c >= z0.c1 + date[0].length) delete cells[refName(c, r)]; } clip = null; for (const td of Object.values(tds)) td.classList.remove('clip'); }
        anchor = { c: z0.c1, r: z0.r1 }; sel = { c: Math.min(cols - 1, z0.c1 + date[0].length - 1), r: Math.min(rows - 1, z0.r1 + date.length - 1) };
      } else if (text) {
        // Text din altă aplicație (de exemplu un tabel copiat din Excel sau Word): coloane separate prin Tab.
        const randuri = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
        randuri.forEach((rand, i) => rand.forEach((v, j) => { const r = z0.r1 + i, c = z0.c1 + j; if (r < rows && c < cols) setRaw(refName(c, r), v.trim()); }));
        anchor = { c: z0.c1, r: z0.r1 }; sel = { c: Math.min(cols - 1, z0.c1 + Math.max(...randuri.map((x) => x.length)) - 1), r: Math.min(rows - 1, z0.r1 + randuri.length - 1) };
      }
      refresh();
      notifica();
    }
    document.addEventListener('paste', (e) => {
      if (document.activeElement !== wrap || !app.isConnected) return;
      e.preventDefault();
      const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (imgs.length) return void adaugaImagini(imgs);
      lipeste(e.clipboardData?.getData('text/plain') ?? null);
    });
    document.addEventListener('copy', (e) => { if (document.activeElement === wrap && app.isConnected) { e.preventDefault(); copiaza(false); e.clipboardData?.setData('text/plain', clip.tsv); } });
    document.addEventListener('cut', (e) => { if (document.activeElement === wrap && app.isConnected) { e.preventDefault(); copiaza(true); e.clipboardData?.setData('text/plain', clip.tsv); } });

    // ---- Tastatura ----
    wrap.addEventListener('keydown', (e) => {
      if (editing) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (selObj && (k === 'Delete' || k === 'Backspace')) { e.preventDefault(); stergeObiect(); return; }
      if (k === 'ArrowDown') { e.preventDefault(); move(0, ctrl ? rows : 1, e.shiftKey); }
      else if (k === 'ArrowUp') { e.preventDefault(); move(0, ctrl ? -rows : -1, e.shiftKey); }
      else if (k === 'ArrowLeft') { e.preventDefault(); move(ctrl ? -cols : -1, 0, e.shiftKey); }
      else if (k === 'ArrowRight') { e.preventDefault(); move(ctrl ? cols : 1, 0, e.shiftKey); }
      else if (k === 'Tab') { e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); }
      else if (k === 'Enter') { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
      else if (k === 'PageDown') { e.preventDefault(); move(0, 20, e.shiftKey); }
      else if (k === 'PageUp') { e.preventDefault(); move(0, -20, e.shiftKey); }
      else if (k === 'Home') { e.preventDefault(); if (ctrl) { sel = anchor = { c: 0, r: 0 }; refresh(); } else move(-cols, 0, e.shiftKey); }
      else if (k === 'F2') { e.preventDefault(); startEdit(false); }
      else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); for (const ref of refsZona()) if (cells[ref]) setRaw(ref, ''); refresh(); notifica(); }
      else if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); sari(e.shiftKey ? 1 : -1); }
      else if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); sari(1); }
      else if (ctrl && k.toLowerCase() === 'b') { e.preventDefault(); format('bold'); }
      else if (ctrl && k.toLowerCase() === 'i') { e.preventDefault(); format('italic'); }
      else if (ctrl && k.toLowerCase() === 'u') { e.preventDefault(); format('underline'); }
      else if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); anchor = { c: 0, r: 0 }; sel = { c: cols - 1, r: rows - 1 }; refresh(); }
      else if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); onSalveaza && onSalveaza(); }
      else if (k.length === 1 && !ctrl && !e.altKey) { e.preventDefault(); startEdit(true, k); }
    });
    fx.addEventListener('focus', () => { if (editing) { const v = editing.input.value; commit(); fx.value = v; } });
    fx.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const ref = refName(sel.c, sel.r); setRaw(ref, fx.value.trim()); refresh(); notifica(); move(0, 1); wrap.focus(); }
      if (e.key === 'Escape') { fx.value = cells[refName(sel.c, sel.r)]?.raw ?? ''; wrap.focus(); }
    });
    nameBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const [a, b] = nameBox.value.trim().toUpperCase().split(':');
      const pa = parseRef(a || ''), pb = b ? parseRef(b) : pa;
      if (!pa || !pb || pa.c >= cols || pa.r >= rows) { nameBox.value = zonaText(); return; }
      anchor = { c: pa.c, r: pa.r }; sel = { c: Math.min(cols - 1, pb.c), r: Math.min(rows - 1, pb.r) };
      refresh(); wrap.focus(); tds[refName(sel.c, sel.r)].scrollIntoView({ block: 'nearest' });
    });

    // ---- Formatare ----
    function format(kind, value) {
      commit();
      const refs = refsZona();
      const cur = cells[refName(sel.c, sel.r)] || cells[refs[0]] || {};
      const z = rng();
      for (const ref of refs) {
        const cell = { raw: '', ...(cells[ref] || {}) };
        if (kind === 'bold' || kind === 'italic' || kind === 'underline' || kind === 'wrap') cell[kind] = !cur[kind];
        if (kind === 'align') cell.align = cur.align === value ? '' : value;
        if (kind === 'fill') cell.fill = value || '';
        if (kind === 'color') cell.color = value || '';
        if (kind === 'fmt') { cell.fmt = value; if (value === 'general') { delete cell.fmt; delete cell.decimals; } }
        if (kind === 'decimals') cell.decimals = cur.decimals === 2 ? null : 2;
        if (kind === 'zec') { const d = (cur.decimals ?? (cur.fmt === 'lei' || cur.fmt === 'num' ? 2 : cur.fmt === 'pct' ? 0 : zecimaleImplicite(ref))) + value; cell.decimals = Math.max(0, Math.min(6, d)); }
        if (kind === 'bd') {
          const p = parseRef(ref);
          let b = new Set(cell.bd || '');
          if (value === 'toate') b = new Set('tblr');
          if (value === 'fara') b = new Set();
          if (value === 'jos' && p.r === z.r2) b.add('b');
          if (value === 'exterior') { if (p.r === z.r1) b.add('t'); if (p.r === z.r2) b.add('b'); if (p.c === z.c1) b.add('l'); if (p.c === z.c2) b.add('r'); }
          cell.bd = [...b].join('');
        }
        for (const k of Object.keys(cell)) if (k !== 'raw' && (cell[k] === '' || cell[k] === false || cell[k] == null)) delete cell[k];
        if (cell.raw === '' && Object.keys(cell).length === 1) delete cells[ref]; else cells[ref] = cell;
      }
      refresh();
      notifica();
      wrap.focus();
    }
    function zecimaleImplicite(ref) {
      const v = new Sheet(cells).value(ref);
      if (typeof v !== 'number') return 0;
      const s = String(v);
      return s.includes('.') ? Math.min(6, s.split('.')[1].length) : 0;
    }
    // Rânduri și coloane
    function insereazaSterge(axa, delta) {
      commit();
      const z = rng();
      const idx = axa === 'r' ? z.r1 : z.c1;
      const nou = {};
      for (const [ref, cell] of Object.entries(cells)) {
        const p = parseRef(ref);
        let { c, r } = p;
        const v = axa === 'r' ? r : c;
        if (delta < 0 && v === idx) continue;
        if (delta > 0 && v >= idx) axa === 'r' ? (r += 1) : (c += 1);
        if (delta < 0 && v > idx) axa === 'r' ? (r -= 1) : (c -= 1);
        if (r >= rows || c >= cols) continue;
        nou[refName(c, r)] = cell;
      }
      for (const cell of Object.values(nou)) if (String(cell.raw).startsWith('=')) cell.raw = ajusteazaRef(cell.raw, axa, idx, delta);
      for (const o of obiecte) if (o.zona) o.zona = ajusteazaRef(o.zona, axa, idx, delta);
      cells = nou;
      refresh(); deseneazaObiecte(); notifica();
    }
    // Sortare după prima coloană a selecției (zona curentă dacă e selectată o singură celulă).
    function sorteaza(dir) {
      commit();
      let z = rng();
      if (z.r1 === z.r2 && z.c1 === z.c2) z = zonaCurenta(z.c1, z.r1);
      const sheet = new Sheet(cells);
      // Antet: primul rând are doar texte și (e scris aldin sau sub el, într-o coloană, apar numere).
      const prim = Array.from({ length: z.c2 - z.c1 + 1 }, (_, j) => z.c1 + j);
      const doarText = prim.every((c) => { const v = sheet.value(refName(c, z.r1)); return v === '' || typeof v === 'string'; });
      const capAldin = cells[refName(z.c1, z.r1)]?.bold && typeof sheet.value(refName(z.c1, z.r1)) === 'string';
      const areAntet = z.r2 > z.r1 && (capAldin || doarText) && (capAldin || prim.some((c) => cells[refName(c, z.r1)]?.bold) || prim.some((c) => typeof sheet.value(refName(c, z.r1)) === 'string' && typeof sheet.value(refName(c, z.r1 + 1)) === 'number'));
      const r0 = areAntet ? z.r1 + 1 : z.r1;
      const randuri = [];
      for (let r = r0; r <= z.r2; r++) randuri.push({ r, cheie: sheet.value(refName(z.c1, r)), cel: Array.from({ length: z.c2 - z.c1 + 1 }, (_, j) => cells[refName(z.c1 + j, r)]) });
      const cmp = (a, b) => {
        const x = a.cheie, y = b.cheie;
        if (x === '' || x == null) return 1;
        if (y === '' || y == null) return -1;
        const n = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ro', { numeric: true });
        return dir * n;
      };
      randuri.sort(cmp);
      randuri.forEach((rd, i) => rd.cel.forEach((cel, j) => {
        const ref = refName(z.c1 + j, r0 + i);
        if (!cel) delete cells[ref]; else cells[ref] = { ...cel, raw: String(cel.raw).startsWith('=') ? shiftFormula(cel.raw, r0 + i - rd.r, 0) : cel.raw };
      }));
      anchor = { c: z.c1, r: z.r1 }; sel = { c: z.c2, r: z.r2 };
      refresh(); notifica();
      toastMic(`Sortat ${dir > 0 ? 'crescător (A→Z)' : 'descrescător (Z→A)'} după coloana ${colName(z.c1)}${areAntet ? ', fără rândul de antet' : ''}.`);
    }
    // Zona compactă de date din jurul unei celule (ca CurrentRegion din Excel).
    function zonaCurenta(c, r) {
      const plin = (cc, rr) => cc >= 0 && rr >= 0 && cc < cols && rr < rows && cells[refName(cc, rr)] && cells[refName(cc, rr)].raw !== '';
      let z = { c1: c, c2: c, r1: r, r2: r }, schimbat = true;
      while (schimbat) {
        schimbat = false;
        for (let rr = z.r1; rr <= z.r2; rr++) { if (plin(z.c1 - 1, rr)) { z.c1--; schimbat = true; break; } }
        for (let rr = z.r1; rr <= z.r2; rr++) { if (plin(z.c2 + 1, rr)) { z.c2++; schimbat = true; break; } }
        for (let cc = z.c1; cc <= z.c2; cc++) { if (plin(cc, z.r1 - 1)) { z.r1--; schimbat = true; break; } }
        for (let cc = z.c1; cc <= z.c2; cc++) { if (plin(cc, z.r2 + 1)) { z.r2++; schimbat = true; break; } }
      }
      return z;
    }
    // Σ: pune funcția sub zona selectată (pentru fiecare coloană) sau deasupra celulei active.
    function autoFunctie(fn) {
      commit();
      const z = rng();
      const sheet = new Sheet(cells);
      if (z.r2 > z.r1 || z.c2 > z.c1) {
        const r = Math.min(rows - 1, z.r2 + 1);
        for (let c = z.c1; c <= z.c2; c++) setRaw(refName(c, r), `=${fn}(${refName(c, z.r1)}:${refName(c, z.r2)})`);
        sel = anchor = { c: z.c1, r };
      } else {
        let r = sel.r - 1;
        while (r >= 0 && typeof sheet.value(refName(sel.c, r)) !== 'number') r--;
        const end = r;
        while (r >= 0 && typeof sheet.value(refName(sel.c, r)) === 'number') r--;
        if (end >= 0) setRaw(refName(sel.c, sel.r), `=${fn}(${refName(sel.c, r + 1)}:${refName(sel.c, end)})`);
        else {
          let c = sel.c - 1;
          while (c >= 0 && typeof sheet.value(refName(c, sel.r)) !== 'number') c--;
          const e2 = c;
          while (c >= 0 && typeof sheet.value(refName(c, sel.r)) === 'number') c--;
          if (e2 >= 0) setRaw(refName(sel.c, sel.r), `=${fn}(${refName(c + 1, sel.r)}:${refName(e2, sel.r)})`);
          else return startEditCu(`=${fn}(`);
        }
      }
      refresh(); notifica(); wrap.focus();
    }
    function startEditCu(text) {
      startEdit(true, '');
      editing.input.value = text;
      fx.value = text;
      editing.input.setSelectionRange(text.length, text.length);
    }

    // ---- Obiecte: imagini și diagrame, așezate peste grilă ----
    let idObj = 1;
    async function adaugaImagini(files) {
      for (const f of files) {
        try {
          const src = await citesteImagine(f, 1000);
          const img = new Image();
          img.onload = () => {
            const w = Math.min(320, img.naturalWidth), hgt = Math.round((w * img.naturalHeight) / img.naturalWidth);
            const loc = locLiber(rng().r1);
            const o = { id: idObj++, tip: 'imagine', src, x: loc.x, y: loc.y, w, h: hgt };
            obiecte.push(o); selObj = o.id; deseneazaObiecte(); notifica();
          };
          img.src = src;
        } catch (e) { toast(app, e.message, 'error'); }
      }
    }
    function adaugaGrafic(fel) {
      commit();
      let z = rng();
      if (z.r1 === z.r2 && z.c1 === z.c2) z = zonaCurenta(z.c1, z.r1);
      if (z.r1 === z.r2 && z.c1 === z.c2) return toast(app, 'Selectează întâi datele (de exemplu A1:B6), apoi alege diagrama.', 'error');
      const loc = locLiber(z.r1);
      const o = { id: idObj++, tip: 'grafic', fel, zona: zonaText(z), titlu: '', x: loc.x, y: loc.y, w: 440, h: 270 };
      const sheet = new Sheet(cells);
      const t = sheet.value(refName(z.c1 + (z.c2 > z.c1 ? 1 : 0), z.r1));
      if (typeof t === 'string' && t) o.titlu = t;
      obiecte.push(o); selObj = o.id; deseneazaObiecte(); notifica();
      filaActiva = 'grafic'; deseneazaFile(); deseneazaPanglica();
    }
    // Obiectele noi se pun la dreapta ultimei coloane completate, ca să nu acopere datele.
    function locLiber(r) {
      let maxC = -1;
      for (const ref of Object.keys(cells)) if (cells[ref].raw !== '') maxC = Math.max(maxC, parseRef(ref).c);
      const td = tds[refName(Math.min(cols - 1, maxC + 1), Math.max(0, r))];
      const dreapta = obiecte.reduce((m, o) => (o.y < td.offsetTop + 260 ? Math.max(m, o.x + o.w + 16) : m), 0);
      return { x: Math.max(td.offsetLeft + 16, dreapta), y: td.offsetTop };
    }
    const obiectSel = () => obiecte.find((o) => o.id === selObj);
    function stergeObiect() { obiecte = obiecte.filter((o) => o.id !== selObj); selObj = null; deseneazaObiecte(); notifica(); if (filaActiva === 'grafic' || filaActiva === 'imagine') { filaActiva = 'pornire'; deseneazaFile(); deseneazaPanglica(); } }
    function dateGrafic(o) {
      const [a, b] = o.zona.split(':');
      const pa = parseRef(a), pb = parseRef(b || a);
      if (!pa || !pb) return null;
      const z = { c1: Math.min(pa.c, pb.c), c2: Math.max(pa.c, pb.c), r1: Math.min(pa.r, pb.r), r2: Math.max(pa.r, pb.r) };
      const sheet = new Sheet(cells);
      const v = (c, r) => sheet.value(refName(c, r));
      const txt = (x) => (isErr(x) ? '' : x == null ? '' : typeof x === 'number' ? formatValue(x) : String(x));
      const etichetePrimaCol = z.c2 > z.c1 && Array.from({ length: z.r2 - z.r1 + 1 }, (_, i) => v(z.c1, z.r1 + i)).some((x) => typeof x === 'string' && x !== '');
      const c0 = etichetePrimaCol ? z.c1 + 1 : z.c1;
      const antet = Array.from({ length: z.c2 - c0 + 1 }, (_, j) => v(c0 + j, z.r1)).every((x) => typeof x === 'string' && x !== '') && z.r2 > z.r1;
      const r0 = antet ? z.r1 + 1 : z.r1;
      const categorii = Array.from({ length: z.r2 - r0 + 1 }, (_, i) => (etichetePrimaCol ? txt(v(z.c1, r0 + i)) : String(i + 1)));
      const serii = Array.from({ length: z.c2 - c0 + 1 }, (_, j) => ({
        nume: antet ? txt(v(c0 + j, z.r1)) : `Seria ${j + 1}`,
        valori: categorii.map((_, i) => { const x = v(c0 + j, r0 + i); return typeof x === 'number' ? x : 0; }),
      }));
      return { categorii, serii };
    }
    function svgEl(tag, attrs = {}, text) {
      const e = document.createElementNS(SVGNS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (text != null) e.textContent = text;
      return e;
    }
    function deseneazaGrafic(o) {
      const W = o.w, H = o.h;
      const s = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'of-grafic-svg', role: 'img', 'aria-label': `Diagramă ${FELURI_GRAFIC[o.fel]}: ${o.titlu || o.zona}` });
      s.append(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
      const d = dateGrafic(o);
      const titluH = o.titlu ? 30 : 10;
      if (o.titlu) s.append(svgEl('text', { x: W / 2, y: 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, fill: '#333' }, o.titlu));
      if (!d || !d.categorii.length) { s.append(svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'font-size': 13, fill: '#888' }, 'Zona nu conține date')); return s; }
      const legH = d.serii.length > 1 || o.fel === 'radiala' ? 26 : 6;
      const scurt = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
      if (o.fel === 'radiala') {
        const vals = d.serii[0].valori.map((x) => Math.max(0, x));
        const tot = vals.reduce((a, b) => a + b, 0) || 1;
        const R = Math.min(W / 2 - 20, (H - titluH - legH) / 2 - 8), cx = W / 2, cy = titluH + (H - titluH - legH) / 2;
        let a0 = -Math.PI / 2;
        vals.forEach((v, i) => {
          const a1 = a0 + (v / tot) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const p = vals.length === 1 || v / tot > 0.9999
            ? svgEl('circle', { cx, cy, r: R, fill: CULORI_GRAFIC[i % 8] })
            : svgEl('path', { d: `M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} Z`, fill: CULORI_GRAFIC[i % 8], stroke: '#fff', 'stroke-width': 1.5 });
          s.append(p);
          if (v / tot > 0.06) { const am = (a0 + a1) / 2; s.append(svgEl('text', { x: cx + R * 0.62 * Math.cos(am), y: cy + R * 0.62 * Math.sin(am) + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#fff', 'font-weight': 600 }, `${Math.round((v / tot) * 100)}%`)); }
          a0 = a1;
        });
        legenda(s, d.categorii.map((c, i) => [c, CULORI_GRAFIC[i % 8]]), W, H);
        return s;
      }
      const all = d.serii.flatMap((x) => x.valori);
      let max = Math.max(0, ...all), min = Math.min(0, ...all);
      if (max === min) max = min + 1;
      const pasBrut = (max - min) / 5, mag = 10 ** Math.floor(Math.log10(pasBrut));
      const pas = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= pasBrut) || pasBrut;
      max = Math.ceil(max / pas) * pas; min = Math.floor(min / pas) * pas;
      const bare = o.fel === 'bare';
      const L = bare ? Math.min(110, 12 + 7 * Math.max(...d.categorii.map((c) => scurt(c, 14).length))) : 46, Rm = 14, T = titluH + 6, B = legH + (bare ? 22 : 26);
      const pw = W - L - Rm, ph = H - T - B;
      const valPx = (v) => (bare ? L + ((v - min) / (max - min)) * pw : T + ph - ((v - min) / (max - min)) * ph);
      for (let v = min; v <= max + 1e-9; v += pas) {
        const p = valPx(v);
        s.append(bare ? svgEl('line', { x1: p, y1: T, x2: p, y2: T + ph, stroke: '#E3E3E3' }) : svgEl('line', { x1: L, y1: p, x2: L + pw, y2: p, stroke: '#E3E3E3' }));
        s.append(bare ? svgEl('text', { x: p, y: T + ph + 15, 'text-anchor': 'middle', 'font-size': 10, fill: '#666' }, formatValue(+v.toFixed(6))) : svgEl('text', { x: L - 6, y: p + 3.5, 'text-anchor': 'end', 'font-size': 10, fill: '#666' }, formatValue(+v.toFixed(6))));
      }
      const n = d.categorii.length, k = d.serii.length;
      const banda = (bare ? ph : pw) / n;
      d.categorii.forEach((c, i) => {
        const centru = (bare ? T : L) + banda * (i + 0.5);
        s.append(bare ? svgEl('text', { x: L - 6, y: centru + 3.5, 'text-anchor': 'end', 'font-size': 10.5, fill: '#444' }, scurt(c, 14)) : svgEl('text', { x: centru, y: T + ph + 15, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#444' }, scurt(c, Math.max(4, Math.floor(banda / 6.5)))));
      });
      if (o.fel === 'linie') {
        d.serii.forEach((sr, j) => {
          const pts = sr.valori.map((v, i) => `${L + banda * (i + 0.5)},${valPx(v)}`);
          s.append(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: CULORI_GRAFIC[j % 8], 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
          sr.valori.forEach((v, i) => s.append(svgEl('circle', { cx: L + banda * (i + 0.5), cy: valPx(v), r: 3.5, fill: CULORI_GRAFIC[j % 8] })));
        });
      } else {
        const zero = valPx(Math.max(min, 0));
        const gb = (banda * 0.72) / k;
        d.serii.forEach((sr, j) => sr.valori.forEach((v, i) => {
          const start = (bare ? T : L) + banda * i + banda * 0.14 + gb * j;
          const p = valPx(v);
          s.append(bare
            ? svgEl('rect', { x: Math.min(zero, p), y: start, width: Math.abs(p - zero), height: gb - 1, fill: CULORI_GRAFIC[j % 8] })
            : svgEl('rect', { x: start, y: Math.min(zero, p), width: gb - 1, height: Math.abs(p - zero), fill: CULORI_GRAFIC[j % 8] }));
        }));
      }
      s.append(bare ? svgEl('line', { x1: L, y1: T, x2: L, y2: T + ph, stroke: '#999' }) : svgEl('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: '#999' }));
      if (k > 1) legenda(s, d.serii.map((sr, j) => [sr.nume, CULORI_GRAFIC[j % 8]]), W, H);
      return s;
    }
    function legenda(s, items, W, H) {
      const lat = items.map(([t]) => 22 + Math.min(16, t.length) * 6.3);
      let x = Math.max(6, (W - lat.reduce((a, b) => a + b, 0)) / 2);
      items.forEach(([t, cul], i) => {
        s.append(svgEl('rect', { x, y: H - 17, width: 10, height: 10, fill: cul }));
        s.append(svgEl('text', { x: x + 14, y: H - 8, 'font-size': 10.5, fill: '#444' }, t.length > 16 ? `${t.slice(0, 15)}…` : t));
        x += lat[i];
      });
    }
    function deseneazaObiecte() {
      umple(stratObj, obiecte.map((o) => {
        const el = h('div', { class: `of-obiect ${o.tip}${o.id === selObj ? ' sel' : ''}`, 'data-id': o.id, tabindex: '-1' },
          o.tip === 'imagine' ? h('img', { src: o.src, alt: '', draggable: 'false' }) : deseneazaGrafic(o),
          o.id === selObj ? h('span', { class: 'of-maner se', 'data-colt': 'se' }) : null);
        el.style.left = `${o.x}px`; el.style.top = `${o.y}px`; el.style.width = `${o.w}px`; el.style.height = `${o.h}px`;
        return el;
      }));
    }
    stratObj.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.of-obiect');
      if (!el) return;
      e.preventDefault();
      commit();
      const o = obiecte.find((x) => x.id === Number(el.dataset.id));
      const deja = selObj === o.id;
      selObj = o.id;
      if (!deja) { deseneazaObiecte(); filaActiva = o.tip === 'grafic' ? 'grafic' : 'imagine'; deseneazaFile(); deseneazaPanglica(); }
      wrap.focus({ preventScroll: true });
      const resize = e.target.dataset.colt === 'se';
      const x0 = e.clientX, y0 = e.clientY, ox = o.x, oy = o.y, ow = o.w, oh = o.h, z = zoom / 100;
      const elv = stratObj.querySelector(`[data-id="${o.id}"]`);
      let mutat = false;
      const mut = (ev) => {
        const dx = (ev.clientX - x0) / z, dy = (ev.clientY - y0) / z;
        if (Math.abs(dx) + Math.abs(dy) > 2) mutat = true;
        if (resize) {
          o.w = Math.max(60, Math.round(ow + dx));
          o.h = o.tip === 'imagine' ? Math.round((o.w * oh) / ow) : Math.max(60, Math.round(oh + dy));
          elv.style.width = `${o.w}px`; elv.style.height = `${o.h}px`;
          if (o.tip === 'grafic') elv.querySelector('svg').replaceWith(deseneazaGrafic(o));
        } else {
          o.x = Math.max(40, Math.round(ox + dx)); o.y = Math.max(24, Math.round(oy + dy));
          elv.style.left = `${o.x}px`; elv.style.top = `${o.y}px`;
        }
      };
      const gata = () => { document.removeEventListener('pointermove', mut); document.removeEventListener('pointerup', gata); if (mutat) { deseneazaObiecte(); notifica(); } };
      document.addEventListener('pointermove', mut);
      document.addEventListener('pointerup', gata);
    });
    // Lățimea coloanelor (trage de marginea din antet)
    head.addEventListener('pointerdown', (e) => {
      if (!e.target.classList.contains('of-col-resize')) return;
      e.preventDefault();
      const c = Number(e.target.dataset.c), x0 = e.clientX, w0 = colW[colName(c)] || 92, z = zoom / 100;
      const mut = (ev) => { colW[colName(c)] = Math.max(30, Math.round(w0 + (ev.clientX - x0) / z)); aplicaLatimi(); };
      const gata = () => { document.removeEventListener('pointermove', mut); document.removeEventListener('pointerup', gata); refresh(); notifica(); };
      document.addEventListener('pointermove', mut);
      document.addEventListener('pointerup', gata);
    });
    head.addEventListener('dblclick', (e) => {
      if (!e.target.classList.contains('of-col-resize')) return;
      // Potrivire automată la conținut
      const c = Number(e.target.dataset.c);
      let max = 40;
      for (let r = 0; r < rows; r++) { const td = tds[refName(c, r)]; if (td.textContent) max = Math.max(max, td.textContent.length * 7.6 + 14); }
      colW[colName(c)] = Math.min(400, Math.round(max));
      aplicaLatimi(); refresh(); notifica();
    });

    // ---- Bara de titlu ----
    const stareEt = h('span', { class: 'of-stare-salvare', 'aria-live': 'polite' });
    btnAnulare = h('button', { class: 'of-qa', type: 'button', title: 'Anulare (Ctrl+Z)', 'aria-label': 'Anulare', onclick: () => sari(-1) }, svg('anulare'));
    btnRefacere = h('button', { class: 'of-qa', type: 'button', title: 'Refacere (Ctrl+Y)', 'aria-label': 'Refacere', onclick: () => sari(1) }, svg('refacere'));
    const titluIn = h('input', { class: 'of-nume', value: titlu, 'aria-label': 'Numele registrului', maxlength: 80 });
    titluIn.addEventListener('change', () => { titluIn.value = titluIn.value.trim() || 'Registru'; onTitlu && onTitlu(titluIn.value); });
    const barTitlu = mod === 'complet'
      ? h('div', { class: 'of-titlebar' },
          h('a', { class: 'of-app-link', href: '#/laborator/tabel', title: 'Înapoi la registrele mele' }, h('span', { class: 'of-logo' }, 'X'), h('span', { class: 'of-app-nume' }, 'Registru')),
          h('div', { class: 'of-qa-bar' }, h('button', { class: 'of-qa', type: 'button', title: 'Salvare (Ctrl+S)', 'aria-label': 'Salvare', onclick: () => onSalveaza && onSalveaza() }, svg('salveaza')), btnAnulare, btnRefacere),
          titluIn, stareEt,
          h('a', { class: 'of-qa', href: '#/laborator/tabel', title: 'Închidere', 'aria-label': 'Închidere' }, svg('inchide')))
      : h('div', { class: 'of-titlebar mic' }, h('span', { class: 'of-logo' }, 'X'), h('span', { class: 'of-app-nume' }, titlu), h('div', { class: 'of-qa-bar' }, btnAnulare, btnRefacere));

    // ---- Panglica ----
    const fileEl = h('div', { class: 'of-tabs', role: 'tablist', 'aria-label': 'Panglică' });
    const panglica = h('div', { class: 'of-ribbon', role: 'tabpanel' });
    function file() {
      const f = [['pornire', 'Pornire'], ['inserare', 'Inserare'], ['formule', 'Formule'], ['date', 'Date']];
      if (mod === 'complet') f.unshift(['fisier', 'Fișier']), f.push(['vizualizare', 'Vizualizare']);
      const o = obiectSel();
      if (o) f.push([o.tip === 'grafic' ? 'grafic' : 'imagine', o.tip === 'grafic' ? 'Diagramă' : 'Format imagine']);
      return f;
    }
    function deseneazaFile() {
      if (!obiectSel() && (filaActiva === 'grafic' || filaActiva === 'imagine')) filaActiva = 'pornire';
      umple(fileEl, file().map(([k, v]) => h('button', {
        class: `of-tab${k === 'fisier' ? ' of-tab-fisier' : ''}${k === 'grafic' || k === 'imagine' ? ' of-tab-context' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(filaActiva === k),
        onclick: () => { if (k === 'fisier') return onFisier && onFisier(); filaActiva = k; deseneazaFile(); deseneazaPanglica(); },
      }, v)));
    }
    const butoane = {};
    const comut = (k, ico, et, fn, cls = '') => (butoane[k] = mic(ico, et, fn, { class: `of-mic ${cls}` }));
    function actualizeazaButoane() {
      const cur = cells[refName(sel.c, sel.r)] || {};
      const st = { bold: cur.bold, italic: cur.italic, underline: cur.underline, wrap: cur.wrap, 'a-left': cur.align === 'left', 'a-center': cur.align === 'center', 'a-right': cur.align === 'right', formule: afisareFormule, grila };
      for (const [k, b] of Object.entries(butoane)) if (b.isConnected) b.setAttribute('aria-pressed', String(Boolean(st[k])));
      if (fmtSel.isConnected) fmtSel.value = cur.fmt || 'general';
    }
    const fmtSel = h('select', { class: 'of-select', 'aria-label': 'Formatul numărului', title: 'Formatul numărului', onchange: (e) => format('fmt', e.target.value) },
      [['general', 'General'], ['num', 'Număr (0,00)'], ['lei', 'Monedă (lei)'], ['pct', 'Procent (%)']].map(([v, t]) => h('option', { value: v }, t)));
    const NUME_FUNDAL = { galben: 'Galben', verde: 'Verde', albastru: 'Albastru', rosu: 'Roșu', portocaliu: 'Portocaliu', gri: 'Gri', mov: 'Mov', roz: 'Roz', turcoaz: 'Turcoaz', crem: 'Crem' };
    const meniuFundal = (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-paleta' },
      h('button', { class: 'of-fara-cul', type: 'button', role: 'menuitem', onclick: () => { inchideMeniu(); format('fill', ''); } }, 'Fără umplere'),
      h('div', { class: 'of-paleta-grid fundal' }, Object.entries(FILLS).map(([k, v]) => { const b = h('button', { class: 'of-cul', type: 'button', role: 'menuitem', title: NUME_FUNDAL[k] || k, 'aria-label': `Fundal ${NUME_FUNDAL[k] || k}`, onclick: () => { inchideMeniu(); format('fill', k); } }); b.style.background = v; return b; }))));
    const meniuFunctii = (e, cuEditare = true) => deschideMeniu(e.currentTarget, h('div', { class: 'of-functii' },
      h('b', {}, 'Alege o funcție'),
      FUNCTII.map(([n, d, ex]) => h('button', { type: 'button', role: 'menuitem', onclick: () => {
        inchideMeniu();
        if (cuEditare) { startEditCu(`=${n}(`); toastMic(`Exemplu: =${ex}. Poți selecta zona cu mouse-ul, apoi scrie „)” și apasă Enter.`); }
      } }, h('code', {}, n), h('span', {}, d)))), 'of-meniu-lung');
    const meniuSuma = (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-lista-meniu' },
      [['SUM', 'Sumă'], ['AVERAGE', 'Medie'], ['COUNT', 'Numărare'], ['MAX', 'Maxim'], ['MIN', 'Minim']].map(([f, t]) => h('button', { type: 'button', role: 'menuitem', onclick: () => { inchideMeniu(); autoFunctie(f); } }, t))));

    function deseneazaPanglica() {
      inchideMeniu();
      const o = obiectSel();
      let c = [];
      if (filaActiva === 'pornire') {
        c = [
          grup('Clipboard', mare('lipire', 'Lipire', () => lipeste(null)), stiva([mic('decupare', 'Decupare (Ctrl+X)', () => copiaza(true))], [mic('copiere', 'Copiere (Ctrl+C)', () => copiaza(false))])),
          grup('Font', stiva(
            [comut('bold', 'B', 'Aldin (Ctrl+B)', () => format('bold'), 'of-b'), comut('italic', 'I', 'Cursiv (Ctrl+I)', () => format('italic'), 'of-i'), comut('underline', 'U', 'Subliniat (Ctrl+U)', () => format('underline'), 'of-u')],
            [h('button', { class: 'of-mic of-cul-btn', type: 'button', title: 'Culoare de umplere', 'aria-label': 'Culoare de umplere', onclick: meniuFundal }, svg('marcator'), h('span', { class: 'of-cul-bara galben' })),
              h('button', { class: 'of-mic of-cul-btn', type: 'button', title: 'Culoare font', 'aria-label': 'Culoare font', onclick: (e) => deschideMeniu(e.currentTarget, paleta((cul) => format('color', cul), { faraCuloare: 'Automat (negru)' })) }, svg('culoare'), h('span', { class: 'of-cul-bara rosu' })),
              mic('borduri', 'Borduri', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'of-lista-meniu' }, [['toate', 'Toate bordurile'], ['exterior', 'Bordură exterioară'], ['jos', 'Bordură jos'], ['fara', 'Fără borduri']].map(([k, t]) => h('button', { type: 'button', role: 'menuitem', onclick: () => { inchideMeniu(); format('bd', k); } }, t)))))])),
          grup('Aliniere', stiva(
            [comut('a-left', 'stanga', 'Aliniere la stânga', () => format('align', 'left')), comut('a-center', 'centru', 'Centrare', () => format('align', 'center')), comut('a-right', 'dreapta', 'Aliniere la dreapta', () => format('align', 'right'))],
            [comut('wrap', 'incadrare', 'Încadrare text (pe mai multe rânduri)', () => format('wrap'))])),
          grup('Număr', stiva([fmtSel], [mic('lei', 'Monedă (lei)', () => format('fmt', 'lei'), { class: 'of-mic of-lei' }), mic('procent', 'Procent', () => format('fmt', 'pct')), mic('zecPlus', 'Mărire zecimale', () => format('zec', 1)), mic('zecMinus', 'Micșorare zecimale', () => format('zec', -1))])),
          grup('Celule', stiva(
            [mic('randSus', 'Inserare rând deasupra', () => insereazaSterge('r', 1), { text: 'Rând' }), mic('colStanga', 'Inserare coloană la stânga', () => insereazaSterge('c', 1), { text: 'Coloană' })],
            [mic('stergeRand', 'Ștergere rând', () => insereazaSterge('r', -1), { text: 'Șterge rând' }), mic('stergeCol', 'Ștergere coloană', () => insereazaSterge('c', -1), { text: 'Șterge col.' })])),
          grup('Editare', h('div', { class: 'of-split' }, mare('suma', 'Însumare automată', () => autoFunctie('SUM'), { title: 'Σ Însumare automată' }), h('button', { class: 'of-split-sageata', type: 'button', 'aria-label': 'Alte funcții rapide', onclick: meniuSuma }, '▾')),
            stiva([mic('golireCel', 'Golire conținut', () => { for (const ref of refsZona()) if (cells[ref]) setRaw(ref, ''); refresh(); notifica(); }, { text: 'Golire' })], [mic('sortAZ', 'Sortare crescătoare', () => sorteaza(1), { text: 'Sortare' })])),
        ];
      } else if (filaActiva === 'inserare') {
        c = [
          grup('Ilustrații', mare('imagine', 'Imagine', async () => { const f = await alegeFisier('image/*', true); if (f.length) adaugaImagini(f); }, { title: 'Imagine de pe calculator (sau lipește cu Ctrl+V)' })),
          grup('Diagrame', ...Object.entries(FELURI_GRAFIC).map(([k, v]) => mare(k === 'linie' ? 'grafic' : k, v, () => adaugaGrafic(k), { title: `Diagramă ${v.toLowerCase()} din datele selectate` }))),
          h('p', { class: 'of-sfat lat' }, 'Selectează datele (de exemplu numele în coloana A și valorile în coloana B), apoi alege tipul de diagramă.'),
        ];
      } else if (filaActiva === 'formule') {
        c = [
          grup('Bibliotecă de funcții', mare('functie', 'Inserare funcție', (e) => meniuFunctii(e)),
            h('div', { class: 'of-split' }, mare('suma', 'Însumare automată', () => autoFunctie('SUM')), h('button', { class: 'of-split-sageata', type: 'button', 'aria-label': 'Alte funcții rapide', onclick: meniuSuma }, '▾')),
            stiva([mic('Σ', 'Sumă', () => autoFunctie('SUM'), { text: 'SUM' }), mic('x̄', 'Medie', () => autoFunctie('AVERAGE'), { text: 'AVERAGE' })],
              [mic('↓', 'Minim', () => autoFunctie('MIN'), { text: 'MIN' }), mic('↑', 'Maxim', () => autoFunctie('MAX'), { text: 'MAX' })],
              [mic('?', 'Dacă', () => startEditCu('=IF('), { text: 'IF' }), mic('#', 'Numărare', () => autoFunctie('COUNT'), { text: 'COUNT' })])),
          grup('Verificare formule', mare('functie', 'Afișare formule', () => { afisareFormule = !afisareFormule; refresh(); }, { 'aria-pressed': String(afisareFormule), title: 'Arată formulele din celule în loc de rezultate' })),
          h('p', { class: 'of-sfat lat' }, 'Sfat: în timp ce scrii o formulă, fă clic pe o celulă sau trage peste o zonă, ca să-i pui adresa în formulă.'),
        ];
      } else if (filaActiva === 'date') {
        c = [
          grup('Sortare', mare('sortAZ', 'Sortare A→Z', () => sorteaza(1)), mare('sortZA', 'Sortare Z→A', () => sorteaza(-1))),
          grup('Instrumente', mare('golireCel', 'Golire formate', () => { for (const ref of refsZona()) if (cells[ref]) cells[ref] = { raw: cells[ref].raw }; refresh(); notifica(); })),
        ];
      } else if (filaActiva === 'vizualizare') {
        c = [
          grup('Afișare', mare('grila', 'Linii de grilă', () => { grila = !grila; refresh(); deseneazaPanglica(); }, { 'aria-pressed': String(grila) }), mare('functie', 'Afișare formule', () => { afisareFormule = !afisareFormule; refresh(); deseneazaPanglica(); }, { 'aria-pressed': String(afisareFormule) })),
          grup('Zoom', mare('zoom', '100%', () => setZoom(100)), stiva([mic('marire', 'Mărire', () => setZoom(zoom + 10), { text: 'Mărire' })], [mic('micsorare', 'Micșorare', () => setZoom(zoom - 10), { text: 'Micșorare' })])),
          grup('Fereastră', mare('ecran', 'Ecran complet', () => { (app.requestFullscreen ? app.requestFullscreen() : Promise.reject()).catch(() => toast(app, 'Ecranul complet nu este disponibil.')); })),
        ];
      } else if (filaActiva === 'grafic' && o) {
        c = [
          grup('Tip diagramă', ...Object.entries(FELURI_GRAFIC).map(([k, v]) => mare(k === 'linie' ? 'grafic' : k, v, () => { o.fel = k; deseneazaObiecte(); notifica(); deseneazaPanglica(); }, { 'aria-pressed': String(o.fel === k) }))),
          grup('Date', mare('tabel', `Zona: ${o.zona}`, () => { const z = prompt('Zona de date a diagramei (de exemplu A1:B6):', o.zona); if (z && /^\$?[A-Z]{1,2}\$?\d+(:\$?[A-Z]{1,2}\$?\d+)?$/i.test(z.trim())) { o.zona = z.trim().toUpperCase().replace(/\$/g, ''); deseneazaObiecte(); notifica(); deseneazaPanglica(); } })),
          grup('Etichete', mare('stil', 'Titlu diagramă', () => { const t = prompt('Titlul diagramei:', o.titlu || ''); if (t != null) { o.titlu = t.trim().slice(0, 60); deseneazaObiecte(); notifica(); } })),
          grup('Ștergere', mare('sterge', 'Șterge diagrama', stergeObiect)),
        ];
      } else if (filaActiva === 'imagine' && o) {
        c = [
          grup('Dimensiune', mare('zoom', 'Mărime inițială', () => { const im = new Image(); im.onload = () => { o.w = Math.min(320, im.naturalWidth); o.h = Math.round((o.w * im.naturalHeight) / im.naturalWidth); deseneazaObiecte(); notifica(); }; im.src = o.src; }), h('p', { class: 'of-sfat' }, 'Trage imaginea ca s-o muți; trage de colț ca s-o redimensionezi.')),
          grup('Ștergere', mare('sterge', 'Șterge imaginea', stergeObiect)),
        ];
      }
      umple(panglica, c);
      actualizeazaButoane();
    }
    function setZoom(z) { zoom = Math.max(50, Math.min(200, z)); zoomIn.value = String(zoom); zoomEt.textContent = `${zoom}%`; aplicaLatimi(); refresh(); }

    // ---- Bara de stare ----
    const stareSel = h('span', { class: 'of-calc' });
    const zoomEt = h('span', { class: 'of-zoom-et' }, '100%');
    const zoomIn = h('input', { type: 'range', min: 50, max: 200, step: 10, value: 100, 'aria-label': 'Zoom' });
    zoomIn.addEventListener('input', () => setZoom(Number(zoomIn.value)));
    function stareSelectie(sheet, z) {
      if (z.r1 === z.r2 && z.c1 === z.c2) { stareSel.textContent = ''; return; }
      const nums = refsZona(z).map((r) => (cells[r] ? sheet.value(r) : null)).filter((v) => typeof v === 'number');
      const completate = refsZona(z).filter((r) => cells[r] && cells[r].raw !== '').length;
      if (!nums.length) { stareSel.textContent = completate ? `Număr: ${completate}` : ''; return; }
      const sum = nums.reduce((a, b) => a + b, 0);
      stareSel.textContent = `Medie: ${formatValue(+(sum / nums.length).toFixed(4))}   Număr: ${completate}   Sumă: ${formatValue(+sum.toFixed(6))}`;
    }
    let toastT = null;
    const toastLinie = h('span', { class: 'of-stare-msg', 'aria-live': 'polite' }, 'Gata');
    function toastMic(t) { toastLinie.textContent = t; clearTimeout(toastT); toastT = setTimeout(() => { toastLinie.textContent = 'Gata'; }, 6000); }
    const baraStare = h('div', { class: 'of-statusbar' }, toastLinie, h('span', { class: 'of-flex' }), stareSel,
      h('button', { class: 'of-zoom-btn', type: 'button', 'aria-label': 'Micșorare', onclick: () => setZoom(zoom - 10) }, '−'), zoomIn,
      h('button', { class: 'of-zoom-btn', type: 'button', 'aria-label': 'Mărire', onclick: () => setZoom(zoom + 10) }, '+'), zoomEt);
    const foi = h('div', { class: 'of-foi' }, h('span', { class: 'of-foaie activ' }, 'Foaie1'));

    app.append(barTitlu, fileEl, panglica, h('div', { class: 'of-formula-bar' }, nameBox, h('button', { class: 'of-fx', type: 'button', title: 'Inserare funcție', 'aria-label': 'Inserare funcție', onclick: (e) => meniuFunctii(e) }, 'fx'), fx), wrap, foi, baraStare);

    function incarca(st) {
      if (st) {
        cells = JSON.parse(JSON.stringify(st.cells || {}));
        colW = { ...(st.colW || {}) };
        obiecte = JSON.parse(JSON.stringify(st.obiecte || []));
        idObj = Math.max(0, ...obiecte.map((o) => o.id || 0)) + 1;
      }
      aplicaLatimi();
      refresh();
      deseneazaObiecte();
    }
    incarca(stare);
    deseneazaFile();
    deseneazaPanglica();
    memoreaza();
    requestAnimationFrame(refresh);

    return {
      el: app,
      getCells: () => { commit(); return JSON.parse(JSON.stringify(cells)); },
      setCells: (c) => { cells = JSON.parse(JSON.stringify(c)); refresh(); memoreaza(); },
      reset: () => { cells = JSON.parse(JSON.stringify(initialCells)); obiecte = []; colW = {}; aplicaLatimi(); refresh(); deseneazaObiecte(); memoreaza(); },
      onChange: (fn) => listeners.push(fn),
      getStare: () => { commit(); return { cells: JSON.parse(JSON.stringify(cells)), colW: { ...colW }, obiecte: JSON.parse(JSON.stringify(obiecte)) }; },
      setStare: (st) => { incarca(st); istoric = []; poz = -1; memoreaza(); },
      setTitlu: (t) => { titluIn.value = t; },
      setStareSalvare: (t, err = false) => { stareEt.textContent = t; stareEt.classList.toggle('error', err); },
      toast: (t, tip) => toast(app, t, tip),
      blocheaza: () => { app.classList.add('locked'); app.querySelectorAll('input, button, select').forEach((x) => { x.disabled = true; }); wrap.setAttribute('inert', ''); },
      csv: () => csvDin(cells),
    };
  }
  function csvDin(cells) {
    const sheet = new Sheet(cells);
    let lastR = -1, lastC = -1;
    for (const ref of Object.keys(cells)) { const p = parseRef(ref); lastR = Math.max(lastR, p.r); lastC = Math.max(lastC, p.c); }
    return Array.from({ length: lastR + 1 }, (_, r) => Array.from({ length: lastC + 1 }, (_, c) => {
      const ref = refName(c, r);
      const t = cells[ref] ? afiseaza(sheet.value(ref), cells[ref]) : '';
      return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    }).join(';')).join('\r\n');
  }
  function citesteCSV(text) {
    const sep = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : (text.includes('\t') ? '\t' : ',');
    const cells = {};
    let r = 0, c = 0, cur = '', q = false;
    const pune = () => { if (cur.trim() !== '') cells[refName(c, r)] = { raw: cur.trim() }; cur = ''; };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; continue; }
      if (ch === '"') q = true;
      else if (ch === sep) { pune(); c++; }
      else if (ch === '\n') { pune(); r++; c = 0; }
      else if (ch !== '\r') cur += ch;
      if (r > 999 || c > 51) break;
    }
    pune();
    return { cells };
  }

  // ---- Fișiere .xlsx (Office Open XML), scrise și citite direct în browser ----
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(fisiere, tip = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const enc = new TextEncoder();
    const parti = [], central = [];
    let off = 0;
    for (const [nume, cont] of fisiere) {
      const n = enc.encode(nume), d = typeof cont === 'string' ? enc.encode(cont) : cont, crc = crc32(d);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
      parti.push(new Uint8Array(lh.buffer), n, d);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), n);
      off += 30 + n.length + d.length;
    }
    const cl = central.reduce((s, x) => s + x.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, fisiere.length, true); end.setUint16(10, fisiere.length, true); end.setUint32(12, cl, true); end.setUint32(16, off, true);
    return new Blob([...parti, ...central, new Uint8Array(end.buffer)], { type: tip });
  }
  const xesc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ALIAS_FN = { SUMA: 'SUM', MEDIE: 'AVERAGE', MEDIA: 'AVERAGE', NUMARARE: 'COUNT', NUMARA: 'COUNT', DACA: 'IF', ROTUNJIRE: 'ROUND', SI: 'AND', SAU: 'OR', NU: 'NOT', CONCATENARE: 'CONCAT' };
  // Formula pentru Excel: nume englezești și virgulă între argumente.
  const formulaExcel = (f) => f.slice(1).replace(/("[^"]*")|([A-Za-zĂÂÎȘȚăâîșț]+)(?=\s*\()|;/g, (m, str, fn) => (str ? str : fn ? (ALIAS_FN[fn.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] || fn.toUpperCase()) : ','));
  function exportXlsx(st, titlu) {
    const cells = st.cells || {};
    const sheet = new Sheet(cells);
    const fonts = ['<font><sz val="11"/><name val="Calibri"/></font>'], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], numFmts = [], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const idx = (arr, x) => { let i = arr.indexOf(x); if (i < 0) { arr.push(x); i = arr.length - 1; } return i; };
    const fmtId = (cell) => {
      const d = cell.decimals;
      let cod = null;
      if (cell.fmt === 'pct') cod = d ? `0.${'0'.repeat(d)}%` : '0%';
      else if (cell.fmt === 'lei') cod = `#,##0.${'0'.repeat(d ?? 2)} "lei"`.replace('#,##0. "lei"', '#,##0 "lei"');
      else if (cell.fmt === 'num' || d != null) cod = (d ?? 2) ? `0.${'0'.repeat(d ?? 2)}` : '0';
      if (!cod) return 0;
      if (cod === '0') return 1; if (cod === '0.00') return 2; if (cod === '0%') return 9; if (cod === '0.00%') return 10;
      let f = numFmts.find((x) => x.cod === cod);
      if (!f) { f = { id: 164 + numFmts.length, cod }; numFmts.push(f); }
      return f.id;
    };
    const stil = (cell) => {
      if (!cell) return 0;
      const rgb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`;
      const font = `<font>${cell.bold ? '<b/>' : ''}${cell.italic ? '<i/>' : ''}${cell.underline ? '<u/>' : ''}<sz val="11"/>${cell.color ? `<color rgb="${rgb(cell.color)}"/>` : ''}<name val="Calibri"/></font>`;
      const fill = cell.fill && FILLS[cell.fill] ? `<fill><patternFill patternType="solid"><fgColor rgb="${rgb(FILLS[cell.fill])}"/><bgColor indexed="64"/></patternFill></fill>` : fills[0];
      const b = cell.bd || '', side = (k, n) => (b.includes(k) ? `<${n} style="thin"><color auto="1"/></${n}>` : `<${n}/>`);
      const border = `<border>${side('l', 'left')}${side('r', 'right')}${side('t', 'top')}${side('b', 'bottom')}<diagonal/></border>`;
      const nf = fmtId(cell);
      const al = cell.align || cell.wrap ? `<alignment${cell.align ? ` horizontal="${cell.align}"` : ''}${cell.wrap ? ' wrapText="1"' : ''}/>` : '';
      const xf = `<xf numFmtId="${nf}" fontId="${idx(fonts, font)}" fillId="${idx(fills, fill)}" borderId="${idx(borders, border)}" xfId="0"${nf ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"${al ? ' applyAlignment="1">' + al + '</xf>' : '/>'}`;
      return idx(xfs, xf);
    };
    const randuri = {};
    let maxC = 0;
    for (const [ref, cell] of Object.entries(cells)) { const p = parseRef(ref); (randuri[p.r] ||= []).push([p.c, ref, cell]); maxC = Math.max(maxC, p.c); }
    const rows = Object.keys(randuri).map(Number).sort((a, b) => a - b).map((r) => `<row r="${r + 1}">${randuri[r].sort((a, b) => a[0] - b[0]).map(([, ref, cell]) => {
      const s = stil(cell), raw = String(cell.raw ?? ''), v = sheet.value(ref);
      const sAttr = s ? ` s="${s}"` : '';
      if (raw.startsWith('=')) {
        const cache = isErr(v) ? '' : typeof v === 'number' ? `<v>${v}</v>` : typeof v === 'boolean' ? `<v>${v ? 1 : 0}</v>` : `<v>${xesc(v)}</v>`;
        const t = typeof v === 'string' ? ' t="str"' : typeof v === 'boolean' ? ' t="b"' : '';
        return `<c r="${ref}"${sAttr}${isErr(v) ? '' : t}><f>${xesc(formulaExcel(raw))}</f>${cache}</c>`;
      }
      if (raw === '') return `<c r="${ref}"${sAttr}/>`;
      if (typeof v === 'number') return `<c r="${ref}"${sAttr}><v>${v}</v></c>`;
      return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${xesc(raw)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const colsXml = Object.keys(st.colW || {}).length ? `<cols>${Object.entries(st.colW).map(([n, w]) => { const i = colIdx(n) + 1; return `<col min="${i}" max="${i}" width="${(w / 7).toFixed(2)}" customWidth="1"/>`; }).join('')}</cols>` : '';
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${colsXml}<sheetData>${rows}</sheetData></worksheet>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${xesc(f.cod)}"/>`).join('')}</numFmts>` : ''}<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const nume = xesc(String(titlu || 'Foaie1').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)) || 'Foaie1';
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nume}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', stylesXml],
      ['xl/worksheets/sheet1.xml', sheetXml],
    ]);
  }
  async function dezarhiveaza(buf, cuMedia = false) {
    const u = new Uint8Array(buf), dv = new DataView(buf);
    let e = u.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Fișierul nu este un document Office (.docx / .xlsx) valid.');
    const n = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const out = {};
    const dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      const met = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const nume = dec.decode(u.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      const text = /\.(xml|rels)$/.test(nume);
      if (!text && !(cuMedia && /\/media\//.test(nume))) continue;
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      const date = u.subarray(start, start + csize);
      let bin = null;
      if (met === 0) bin = date;
      else if (met === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('Browserul nu poate deschide acest fișier. Actualizează browserul.');
        const s = new Blob([date]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        bin = new Uint8Array(await new Response(s).arrayBuffer());
      }
      if (bin) out[nume] = text ? dec.decode(bin) : bin;
    }
    return out;
  }
  async function importXlsx(buf) {
    const f = await dezarhiveaza(buf);
    const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
    const wb = xml(f['xl/workbook.xml'] || '');
    const primul = wb.getElementsByTagName('sheet')[0];
    let cale = 'xl/worksheets/sheet1.xml';
    if (primul && f['xl/_rels/workbook.xml.rels']) {
      const rid = primul.getAttribute('r:id');
      const rel = [...xml(f['xl/_rels/workbook.xml.rels']).getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid);
      if (rel) cale = `xl/${rel.getAttribute('Target').replace(/^\/?xl\//, '')}`;
    }
    const shared = f['xl/sharedStrings.xml'] ? [...xml(f['xl/sharedStrings.xml']).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
    const ws = xml(f[cale] || '');
    const cells = {};
    for (const c of ws.getElementsByTagName('c')) {
      const ref = c.getAttribute('r');
      const p = parseRef(ref || '');
      if (!p || p.r > 999 || p.c > 51) continue;
      const t = c.getAttribute('t'), fEl = c.getElementsByTagName('f')[0], vEl = c.getElementsByTagName('v')[0];
      let raw = '';
      if (fEl && fEl.textContent) raw = `=${fEl.textContent.replace(/_xlfn\./g, '')}`;
      else if (t === 's') raw = shared[Number(vEl?.textContent)] ?? '';
      else if (t === 'inlineStr') raw = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
      else if (t === 'b') raw = vEl?.textContent === '1' ? 'TRUE' : 'FALSE';
      else if (vEl) raw = String(Number(vEl.textContent)).replace('.', ',');
      if (raw !== '') cells[ref] = { raw };
    }
    return { cells };
  }


  // ---- Fișiere .docx (Word), scrise și citite direct în browser ----
  const pxEmu = (px) => Math.round(px * 9525);
  const ptDin = (v) => { const m = /^([\d.]+)(pt|px)?$/.exec(String(v || '').trim()); if (!m) return null; return m[2] === 'px' ? parseFloat(m[1]) * 0.75 : parseFloat(m[1]); };
  const hexDin = (c) => {
    if (!c) return null;
    const m = /^#([0-9a-f]{6})$/i.exec(c) || /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return m[1].length === 3 ? m[1].split('').map((x) => x + x).join('').toUpperCase() : m[1].toUpperCase();
    const r = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c);
    if (r && (r[4] === undefined || Number(r[4]) > 0)) return [r[1], r[2], r[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('').toUpperCase();
    return null;
  };
  const HL = { FFFF00: 'yellow', '00FF00': 'green', '00FFFF': 'cyan', FF00FF: 'magenta', '0000FF': 'blue', FF0000: 'red' };
  async function exportDocx(st, titlu) {
    const root = document.createElement('div');
    root.append(O.docSigur(st.html));
    const media = [], rels = [], numInst = [];
    let relId = 10, docPr = 1;
    const imgSize = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth || 300, i.naturalHeight || 200]); i.onerror = () => res([300, 200]); i.src = src; });
    const dimensiuni = new Map();
    for (const img of root.querySelectorAll('img')) dimensiuni.set(img, await imgSize(img.getAttribute('src')));
    const latimeMaxPx = (st.orientare === 'peisaj' ? 1123 : 794) - 2 * ({ normal: 96, ingust: 48, lat: 132 }[st.margini] || 96);
    function imagine(img) {
      const m = /^data:image\/(png|jpe?g|gif|webp);base64,(.*)$/.exec(img.getAttribute('src') || '');
      if (!m) return '';
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'webp' ? 'png' : m[1];
      const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      const nume = `imagine${media.length + 1}.${ext}`;
      media.push([`word/media/${nume}`, bin, ext]);
      const id = `rId${relId++}`;
      rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nume}"/>`);
      const [nw, nh] = dimensiuni.get(img) || [300, 200];
      const w = Math.min(latimeMaxPx, parseFloat(img.style.width) || Math.min(nw, latimeMaxPx));
      const hgt = Math.round((w * nh) / nw);
      const cx = pxEmu(w), cy = pxEmu(hgt), n = docPr++;
      const grafic = `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${nume}" descr="${xesc(img.alt || '')}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${img.classList.contains('img-chenar') ? '<a:ln w="28575"><a:solidFill><a:srgbClr val="262626"/></a:solidFill></a:ln>' : ''}</pic:spPr></pic:pic></a:graphicData></a:graphic>`;
      const plutitor = img.classList.contains('img-stanga') ? 'left' : img.classList.contains('img-dreapta') ? 'right' : null;
      if (plutitor) return `<w:r><w:drawing><wp:anchor distT="0" distB="91440" distL="${plutitor === 'right' ? 137160 : 0}" distR="${plutitor === 'left' ? 137160 : 0}" simplePos="0" relativeHeight="${n}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>${plutitor}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${n}" name="Imagine ${n}" descr="${xesc(img.alt || '')}"/><wp:cNvGraphicFramePr/>${grafic}</wp:anchor></w:drawing></w:r>`;
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${n}" name="Imagine ${n}" descr="${xesc(img.alt || '')}"/><wp:cNvGraphicFramePr/>${grafic}</wp:inline></w:drawing></w:r>`;
    }
    // Proprietățile de caracter moștenite de la elementele-părinte.
    function rPr(f) {
      let x = '';
      if (f.font) x += `<w:rFonts w:ascii="${xesc(f.font)}" w:hAnsi="${xesc(f.font)}" w:cs="${xesc(f.font)}"/>`;
      if (f.b) x += '<w:b/>';
      if (f.i) x += '<w:i/>';
      if (f.s) x += '<w:strike/>';
      if (f.color) x += `<w:color w:val="${f.color}"/>`;
      if (f.sz) x += `<w:sz w:val="${Math.round(f.sz * 2)}"/><w:szCs w:val="${Math.round(f.sz * 2)}"/>`;
      // ordinea din schema Word: ... sz, highlight, u, shd, vertAlign
      if (f.bg && HL[f.bg]) x += `<w:highlight w:val="${HL[f.bg]}"/>`;
      if (f.u) x += '<w:u w:val="single"/>';
      if (f.bg && !HL[f.bg]) x += `<w:shd w:val="clear" w:color="auto" w:fill="${f.bg}"/>`;
      if (f.va) x += `<w:vertAlign w:val="${f.va}"/>`;
      return x ? `<w:rPr>${x}</w:rPr>` : '';
    }
    function formatDe(el, f) {
      const n = { ...f };
      const t = el.tagName;
      if (t === 'B' || t === 'STRONG' || t === 'TH') n.b = true;
      if (t === 'I' || t === 'EM') n.i = true;
      if (t === 'U') n.u = true;
      if (t === 'S') n.s = true;
      if (t === 'SUB') n.va = 'subscript';
      if (t === 'SUP') n.va = 'superscript';
      if (t === 'A') { n.color = '0563C1'; n.u = true; }
      const s = el.style;
      if (s.fontWeight === 'bold' || Number(s.fontWeight) >= 600) n.b = true;
      if (s.fontStyle === 'italic') n.i = true;
      if ((s.textDecorationLine || s.textDecoration || '').includes('underline')) n.u = true;
      if ((s.textDecorationLine || s.textDecoration || '').includes('line-through')) n.s = true;
      if (s.color && hexDin(s.color)) n.color = hexDin(s.color);
      if (s.backgroundColor && hexDin(s.backgroundColor) && t !== 'TD' && t !== 'TH') n.bg = hexDin(s.backgroundColor);
      if (s.fontSize && ptDin(s.fontSize)) n.sz = ptDin(s.fontSize);
      if (s.fontFamily) n.font = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      return n;
    }
    function runuri(node, f) {
      let out = '';
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { if (n.nodeValue) out += `<w:r>${rPr(f)}<w:t xml:space="preserve">${xesc(n.nodeValue)}</w:t></w:r>`; continue; }
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'BR') { if (n.nextSibling) out += '<w:r><w:br/></w:r>'; continue; } // <br> final (paragraf gol) nu adaugă rând
        if (n.tagName === 'IMG') { out += imagine(n); continue; }
        if (n.tagName === 'A' && n.getAttribute('href')) {
          const id = `rId${relId++}`;
          rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xesc(n.getAttribute('href'))}" TargetMode="External"/>`);
          out += `<w:hyperlink r:id="${id}">${runuri(n, formatDe(n, f))}</w:hyperlink>`;
          continue;
        }
        out += runuri(n, formatDe(n, f));
      }
      return out;
    }
    const ALINIERI = { left: 'left', center: 'center', right: 'right', justify: 'both', start: 'left', end: 'right' };
    // Ordinea cerută de Word în <w:pPr>: pStyle, numPr, spacing, ind, jc.
    function pPr(el, extra = '', jcImplicit = '') {
      let x = extra;
      const al = ALINIERI[el.style.textAlign] || jcImplicit;
      const lh = parseFloat(el.style.lineHeight);
      const ml = parseFloat(el.style.marginLeft);
      if (lh) x += `<w:spacing w:line="${Math.round(240 * lh)}" w:lineRule="auto"/>`;
      if (ml) x += `<w:ind w:left="${Math.round(ml * 15)}"/>`;
      if (al) x += `<w:jc w:val="${al}"/>`;
      return x ? `<w:pPr>${x}</w:pPr>` : '';
    }
    const STIL = { H1: 'Heading1', H2: 'Heading2', H3: 'Heading3', H4: 'Heading3', BLOCKQUOTE: 'Quote' };
    function blocuri(container, f = {}, nivel = 0) {
      let out = '';
      let inline = [];
      const golesteInline = () => {
        if (!inline.length) return;
        const tmp = document.createElement('p');
        inline.forEach((n) => tmp.append(n.cloneNode(true)));
        if (tmp.textContent.trim() || tmp.querySelector('img')) out += `<w:p>${runuri(tmp, f)}</w:p>`;
        inline = [];
      };
      for (const n of [...container.childNodes]) {
        const t = n.nodeType === 1 ? n.tagName : null;
        if (!t || !/^(P|DIV|H1|H2|H3|H4|BLOCKQUOTE|UL|OL|TABLE|HR)$/.test(t) && !(t === 'IMG' && /img-(centru|stanga|dreapta)/.test(n.className))) { inline.push(n); continue; }
        golesteInline();
        if (t === 'HR') { out += n.classList.contains('page-break') ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="A6A6A6"/></w:pBdr></w:pPr></w:p>'; continue; }
        if (t === 'IMG') { out += `<w:p>${n.classList.contains('img-centru') ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : ''}${imagine(n)}</w:p>`; continue; }
        if (t === 'UL' || t === 'OL') {
          let numId = t === 'UL' ? 1 : null;
          if (t === 'OL') { numInst.push(numInst.length + 3); numId = numInst[numInst.length - 1]; }
          for (const li of n.children) {
            if (li.tagName !== 'LI') continue;
            const sub = [...li.children].filter((c) => c.tagName === 'UL' || c.tagName === 'OL');
            const copie = li.cloneNode(true);
            copie.querySelectorAll(':scope > ul, :scope > ol').forEach((x) => x.remove());
            out += `<w:p>${pPr(li, `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${Math.min(nivel, 8)}"/><w:numId w:val="${numId}"/></w:numPr>`)}${runuri(copie, formatDe(li, f))}</w:p>`;
            for (const s2 of sub) { const w = document.createElement('div'); w.append(s2.cloneNode(true)); out += blocuri(w, f, nivel + 1); }
          }
          continue;
        }
        if (t === 'TABLE') {
          const randuri = [...n.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr')];
          const ncol = Math.max(1, ...randuri.map((r) => [...r.children].reduce((s2, c) => s2 + (Number(c.getAttribute('colspan')) || 1), 0)));
          const fara = n.classList.contains('tb-fara'), antet = n.classList.contains('tb-antet'), dungi = n.classList.contains('tb-dungi');
          const bord = fara ? '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
            : '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="A6A6A6"/><w:left w:val="single" w:sz="4" w:color="A6A6A6"/><w:bottom w:val="single" w:sz="4" w:color="A6A6A6"/><w:right w:val="single" w:sz="4" w:color="A6A6A6"/><w:insideH w:val="single" w:sz="4" w:color="A6A6A6"/><w:insideV w:val="single" w:sz="4" w:color="A6A6A6"/></w:tblBorders>';
          const latCol = Math.round(9638 / ncol);
          out += `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${bord}<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${latCol}"/>`.repeat(ncol)}</w:tblGrid>`;
          randuri.forEach((tr, ri) => {
            out += '<w:tr>';
            for (const c of tr.children) {
              const th = c.tagName === 'TH';
              const fill = th ? (antet ? '2B579A' : 'F2F2F2') : dungi && ri % 2 === 0 && ri > 0 ? 'EAF1FB' : hexDin(c.style.backgroundColor);
              const span = Number(c.getAttribute('colspan')) || 1;
              const fc = th && antet ? { ...f, b: true, color: 'FFFFFF' } : formatDe(c, f);
              let cont = blocuri(c, fc);
              if (!cont.includes('<w:p')) cont = `<w:p>${runuri(c, fc)}</w:p>`;
              out += `<w:tc><w:tcPr><w:tcW w:w="${latCol * span}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:tcPr>${cont}</w:tc>`;
            }
            out += '</w:tr>';
          });
          out += '</w:tbl><w:p/>';
          continue;
        }
        const stil = STIL[t] ? `<w:pStyle w:val="${STIL[t]}"/>` : '';
        const ff = formatDe(n, f);
        const areBloc = [...n.children].some((c) => /^(P|DIV|H1|H2|H3|UL|OL|TABLE|BLOCKQUOTE)$/.test(c.tagName));
        if (areBloc) out += blocuri(n, ff, nivel);
        else {
          // paragraf care conține doar o imagine centrată → paragraf centrat
          const doarImg = n.querySelector('img.img-centru') && !n.textContent.trim() ? 'center' : '';
          out += `<w:p>${pPr(n, stil, doarImg)}${runuri(n, ff)}</w:p>`;
        }
      }
      golesteInline();
      return out;
    }
    const corp = blocuri(root) || '<w:p/>';
    const marg = { normal: 1417, ingust: 720, lat: 1984 }[st.margini] || 1417;
    const peisaj = st.orientare === 'peisaj';
    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const fundal = hexDin(st.culoarePagina);
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}>${fundal ? `<w:background w:color="${fundal}"/>` : ''}<w:body>${corp}<w:sectPr><w:pgSz w:w="${peisaj ? 16838 : 11906}" w:h="${peisaj ? 11906 : 16838}"${peisaj ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${marg}" w:right="${marg}" w:bottom="${marg}" w:left="${marg}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="ro-RO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/><w:color w:val="17365D"/><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4D78"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="BFBFBF"/></w:pBdr><w:ind w:left="480" w:right="480"/></w:pPr><w:rPr><w:i/><w:color w:val="595959"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style></w:styles>`;
    const nivel = (i, fmt, text) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + i * 360}" w:hanging="360"/></w:pPr>${fmt === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>' : ''}</w:lvl>`;
    const bullet = Array.from({ length: 9 }, (_, i) => nivel(i, 'bullet', '')).join('');
    const decimal = Array.from({ length: 9 }, (_, i) => nivel(i, i % 3 === 1 ? 'lowerLetter' : i % 3 === 2 ? 'lowerRoman' : 'decimal', `%${i + 1}.`)).join('');
    const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${bullet}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${decimal}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>${numInst.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
    const tipuri = [...new Set(media.map((m) => m[2]))];
    const MIME = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif' };
    return zip([
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${tipuri.map((t) => `<Default Extension="${t}" ContentType="${MIME[t]}"/>`).join('')}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
      ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xesc(titlu || 'Document')}</dc:title><dc:creator>edudigi</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
      ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${rels.join('')}</Relationships>`],
      ['word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${fundal ? '<w:displayBackgroundShape/>' : ''}<w:defaultTabStop w:val="708"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`],
      ['word/styles.xml', stylesXml],
      ['word/numbering.xml', numberingXml],
      ['word/document.xml', documentXml],
      ...media.map(([n, b]) => [n, b]),
    ], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
  // Deschide un .docx (din Word, LibreOffice, Google Docs): text, formatare, liste, tabele, imagini.
  async function importDocx(buf) {
    const f = await dezarhiveaza(buf, true);
    const xml = (s) => new DOMParser().parseFromString(s || '<x/>', 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const doc = xml(f['word/document.xml']);
    if (!doc.getElementsByTagNameNS(W, 'body')[0]) throw new Error('Fișierul nu pare un document Word (.docx).');
    const rels = {};
    for (const r of xml(f['word/_rels/document.xml.rels']).getElementsByTagName('Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');
    const stiluri = {};
    for (const s of xml(f['word/styles.xml']).getElementsByTagNameNS(W, 'style')) {
      const nume = (s.getElementsByTagNameNS(W, 'name')[0]?.getAttributeNS(W, 'val') || s.getAttribute('w:styleId') || '').toLowerCase();
      stiluri[s.getAttributeNS(W, 'styleId') || s.getAttribute('w:styleId')] = nume;
    }
    const numFmt = {};
    const nb = xml(f['word/numbering.xml']);
    const abs = {};
    for (const a of nb.getElementsByTagNameNS(W, 'abstractNum')) { const l0 = a.getElementsByTagNameNS(W, 'lvl')[0]; abs[a.getAttributeNS(W, 'abstractNumId')] = l0?.getElementsByTagNameNS(W, 'numFmt')[0]?.getAttributeNS(W, 'val') || 'bullet'; }
    for (const n of nb.getElementsByTagNameNS(W, 'num')) numFmt[n.getAttributeNS(W, 'numId')] = abs[n.getElementsByTagNameNS(W, 'abstractNumId')[0]?.getAttributeNS(W, 'val')] || 'bullet';
    const val = (el, tag) => { const x = el?.getElementsByTagNameNS(W, tag)[0]; return x ? (x.getAttributeNS(W, 'val') ?? '') : null; };
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const directe = (el, tag) => [...el.childNodes].filter((c) => c.localName === tag);
    function run(r) {
      const pr = directe(r, 'rPr')[0];
      let html = '';
      for (const c of r.childNodes) {
        if (c.localName === 't') html += esc(c.textContent);
        else if (c.localName === 'tab') html += '&emsp;';
        else if (c.localName === 'br') html += c.getAttributeNS(W, 'type') === 'page' ? '' : '<br>';
        else if (c.localName === 'drawing' || c.localName === 'pict') {
          const blip = c.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')[0];
          const ext = c.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent')[0];
          const id = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
          const tinta = id && rels[id] ? `word/${rels[id].replace(/^\/?word\//, '').replace(/^\.\.\//, '')}` : null;
          if (tinta && f[tinta] instanceof Uint8Array) {
            const e = tinta.split('.').pop().toLowerCase();
            const mime = e === 'png' ? 'image/png' : e === 'gif' ? 'image/gif' : /jpe?g/.test(e) ? 'image/jpeg' : null;
            if (mime) {
              let b = ''; const u = f[tinta]; for (let i = 0; i < u.length; i += 32768) b += String.fromCharCode(...u.subarray(i, i + 32768));
              const w = ext ? Math.round(Number(ext.getAttribute('cx')) / 9525) : 0;
              const anc = c.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'anchor')[0];
              const al = anc ? (anc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'align')[0]?.textContent === 'right' ? 'img-dreapta' : 'img-stanga') : 'img-linie';
              html += `<img class="${al}" src="data:${mime};base64,${btoa(b)}"${w ? ` style="width: ${w}px;"` : ''} alt="">`;
            }
          }
        }
      }
      if (!html) return '';
      const st = [];
      const culoare = val(pr, 'color'); if (culoare && culoare !== 'auto' && /^[0-9A-F]{6}$/i.test(culoare)) st.push(`color: #${culoare}`);
      const sz = val(pr, 'sz'); if (sz) st.push(`font-size: ${Number(sz) / 2}pt`);
      const fnt = pr?.getElementsByTagNameNS(W, 'rFonts')[0]?.getAttributeNS(W, 'ascii'); if (fnt) st.push(`font-family: ${fnt}`);
      const hl = val(pr, 'highlight'); const HLC = { yellow: '#FFFF00', green: '#00FF00', cyan: '#00FFFF', magenta: '#FF00FF', red: '#FF0000', lightGray: '#D9D9D9' };
      if (hl && HLC[hl]) st.push(`background-color: ${HLC[hl]}`);
      if (st.length) html = `<span style="${st.join('; ')}">${html}</span>`;
      const on = (t) => { const v = val(pr, t); return v !== null && v !== '0' && v !== 'false' && v !== 'none'; };
      if (on('b')) html = `<b>${html}</b>`;
      if (on('i')) html = `<i>${html}</i>`;
      if (on('u')) html = `<u>${html}</u>`;
      if (on('strike')) html = `<s>${html}</s>`;
      const va = val(pr, 'vertAlign'); if (va === 'superscript') html = `<sup>${html}</sup>`; if (va === 'subscript') html = `<sub>${html}</sub>`;
      return html;
    }
    const continutP = (p) => [...p.childNodes].map((c) => (c.localName === 'r' ? run(c) : c.localName === 'hyperlink' ? directe(c, 'r').map(run).join('') : c.localName === 'ins' || c.localName === 'smartTag' ? directe(c, 'r').map(run).join('') : '')).join('');
    let html = '', lista = null;
    const inchideLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };
    function paragraf(p) {
      const pr = directe(p, 'pPr')[0];
      const stil = stiluri[val(pr, 'pStyle')] || '';
      const jc = val(pr, 'jc');
      const al = { center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' }[jc];
      const corp = continutP(p) || '<br>';
      const numId = pr?.getElementsByTagNameNS(W, 'numPr')[0] ? val(pr.getElementsByTagNameNS(W, 'numPr')[0], 'numId') : null;
      const pageBreak = [...p.getElementsByTagNameNS(W, 'br')].some((b) => b.getAttributeNS(W, 'type') === 'page');
      const style = al ? ` style="text-align: ${al};"` : '';
      if (numId && numId !== '0') {
        const tip = numFmt[numId] === 'bullet' ? 'ul' : 'ol';
        if (lista !== tip) { inchideLista(); html += `<${tip}>`; lista = tip; }
        html += `<li${style}>${corp}</li>`;
        return;
      }
      inchideLista();
      const tag = /heading 1|^title/.test(stil) ? 'h1' : /heading 2|subtitle/.test(stil) ? 'h2' : /heading [3-9]/.test(stil) ? 'h3' : /quote/.test(stil) ? 'blockquote' : 'p';
      html += `<${tag}${style}>${corp}</${tag}>`;
      if (pageBreak) html += '<hr class="page-break">';
    }
    function tabel(t) {
      inchideLista();
      let x = '<table class="tb-simplu"><tbody>';
      for (const tr of directe(t, 'tr')) {
        x += '<tr>';
        for (const tc of directe(tr, 'tc')) {
          const span = val(directe(tc, 'tcPr')[0], 'gridSpan');
          const vechi = html; html = ''; lista = null;
          for (const c of tc.childNodes) { if (c.localName === 'p') paragraf(c); else if (c.localName === 'tbl') tabel(c); }
          inchideLista();
          x += `<td${span ? ` colspan="${span}"` : ''}>${html.replace(/^<p>([\s\S]*)<\/p>$/, '$1')}</td>`;
          html = vechi;
        }
        x += '</tr>';
      }
      html += `${x}</tbody></table>`;
    }
    const body = doc.getElementsByTagNameNS(W, 'body')[0];
    for (const c of body.childNodes) { if (c.localName === 'p') paragraf(c); else if (c.localName === 'tbl') tabel(c); else if (c.localName === 'sdt') for (const p of c.getElementsByTagNameNS(W, 'p')) paragraf(p); }
    inchideLista();
    const sect = body.getElementsByTagNameNS(W, 'pgSz')[0];
    const bg = doc.getElementsByTagNameNS(W, 'background')[0]?.getAttributeNS(W, 'color');
    return { html, orientare: sect?.getAttributeNS(W, 'orient') === 'landscape' ? 'peisaj' : 'portret', culoarePagina: bg && /^[0-9A-F]{6}$/i.test(bg) ? `#${bg}` : '' };
  }

  window.EduOfficeUI = { h, umple, svg, I, citesteImagine, alegeFisier, descarca, toast, mare, mic, grup, stiva, deschideMeniu, inchideMeniu, paleta, fara, exportDoc, importDoc, exportDocx, importDocx, exportXlsx, importXlsx, citesteCSV, csvDin, ajusteazaRef, formulaExcel, PALETA };
  O.createDocEditor = createDocEditor;
  O.createSheet = createSheet;
})();

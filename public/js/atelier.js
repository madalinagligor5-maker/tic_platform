'use strict';
// Atelierul de prezentări: un editor de diapozitive în stilul PowerPoint, făcut pentru elevi.
// Panglică cu file (Fișier, Pornire, Inserare, Proiectare, Tranziții, Animații, Expunere diapozitive, Revizuire, Vizualizare),
// miniaturi în stânga, diapozitivul editat direct, panoul de note și bara de stare.
// Elevii în cont își salvează prezentările în cont (le vede și profesorul); fără cont, se salvează în acest browser.
(() => {
  const { h, show, markdown, routes } = window.EduApp;
  const { sesiune, api, cand } = window.EduCont;
  const D = window.EduDiapozitive;
  const LOCAL = 'edudigi_atelier';
  const eElev = () => sesiune()?.rol === 'elev';
  const umple = (el, ...copii) => el.replaceChildren(...copii.flat().filter((c) => c != null && c !== false));
  const NUME_TEME = { rosu: 'Edudigi', albastru: 'Ocean', verde: 'Natură', portocaliu: 'Toamnă', mov: 'Lavandă', alb: 'Clasic', intunecat: 'Noapte', noapte: 'Cosmos' };

  // ---------- Pictograme (SVG fix, din cod) ----------
  const P = {
    nou: '<rect x="3" y="5" width="14" height="11" rx="1.5"/><path d="M19 13v6M16 16h6"/>',
    aspect: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M10 9v11"/>',
    sterge: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    dubla: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
    stanga: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    centru: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    dreapta: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    marire: '<path d="M3 19l5-13 5 13M5 14h6M17 5v6M14 8h6"/>',
    micsorare: '<path d="M3 19l5-13 5 13M5 14h6M14 8h6"/>',
    imagine: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    tema: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-1.4-1.2-1.6-1.2-2.9 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    raport: '<rect x="2" y="6" width="20" height="12" rx="1.5"/><path d="M6 10v4h3M18 14v-4h-3"/>',
    tranzitie: '<rect x="2" y="6" width="9" height="12" rx="1"/><rect x="13" y="6" width="9" height="12" rx="1"/><path d="M9 12h6M13 10l2 2-2 2"/>',
    animatie: '<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.5 6.6 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    joc: '<path d="M7 4l13 8-13 8z"/>',
    jocCurent: '<rect x="2" y="5" width="12" height="10" rx="1"/><path d="M14 13l8 4-8 4z"/>',
    previz: '<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>',
    verifica: '<path d="M4 12l5 5L20 6"/>',
    anuleaza: '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2"/>',
    reface: '<path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2"/>',
    salveaza: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    tipareste: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
    descarca: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    deschide: '<path d="M3 7h6l2 2h10v10H3z"/>',
    note: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    normal: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M8 4v16"/>',
    sortare: '<rect x="3" y="4" width="7" height="7"/><rect x="14" y="4" width="7" height="7"/><rect x="3" y="13" width="7" height="7"/><rect x="14" y="13" width="7" height="7"/>',
    expunere: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/>',
    inchide: '<path d="M6 6l12 12M18 6L6 18"/>',
    culoare: '<path d="M6 16L11 4h2l5 12M8 12h8"/>',
  };
  const svg = (name, cls = 'pp-ico') => {
    const s = h('span', { class: cls, 'aria-hidden': 'true' });
    s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name]}</svg>`;
    return s;
  };

  // ---------- Stocare: în cont (elev) sau în browser ----------
  function citesteLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL) || '{}'); } catch { return {}; }
  }
  function scrieLocal(toate) {
    try { localStorage.setItem(LOCAL, JSON.stringify(toate)); } catch {
      throw new Error('Nu mai este loc în browser. Folosește imagini mai puține sau descarcă prezentarea într-un fișier.');
    }
  }
  const store = {
    async lista() {
      if (eElev()) return api('GET', '/api/elev/prezentari');
      return Object.entries(citesteLocal())
        .map(([id, x]) => ({ id, titlu: x.prezentare.titlu, diapozitive: x.prezentare.diapozitive.length, actualizat_la: x.actualizat_la }))
        .sort((a, b) => (b.actualizat_la || '').localeCompare(a.actualizat_la || ''));
    },
    async citeste(id) {
      if (eElev()) return D.curata((await api('GET', `/api/elev/prezentari/${encodeURIComponent(id)}`)).prezentare).prezentare;
      const x = citesteLocal()[id];
      if (!x) throw new Error('Prezentarea nu există în acest browser.');
      return D.curata(x.prezentare).prezentare;
    },
    async salveaza(id, prezentare) {
      if (eElev()) {
        if (id) return (await api('PUT', `/api/elev/prezentari/${encodeURIComponent(id)}`, { prezentare }), id);
        return (await api('POST', '/api/elev/prezentari', { prezentare })).id;
      }
      const toate = citesteLocal();
      const nid = id || `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      toate[nid] = { prezentare, actualizat_la: new Date().toISOString() };
      scrieLocal(toate);
      return nid;
    },
    async sterge(id) {
      if (eElev()) return api('DELETE', `/api/elev/prezentari/${encodeURIComponent(id)}`);
      const toate = citesteLocal();
      delete toate[id];
      scrieLocal(toate);
    },
  };

  const STIL = () => ({ aliniere: 'auto', marime: 'normal', culoare: 'implicit' });
  const diapozitivNou = (aspect = 'text', titlu = '', text = '') => ({ aspect, titlu, text, imagine: '', note: '', tranzitie: 'niciuna', animatie: 'niciuna', stil: STIL() });
  const prezentareNoua = (tema = 'rosu', goala = false) => ({
    titlu: goala ? 'Prezentare1' : 'Prezentarea mea',
    tema,
    raport: '16:9',
    diapozitive: goala ? [diapozitivNou('titlu')] : [
      diapozitivNou('titlu', 'Prezentarea mea', eElev() ? `${sesiune().nume} · ${sesiune().numeClasa || 'clasa'}` : 'Pseudonimul tău · clasa'),
      diapozitivNou('text', 'Prima idee', '- scrie aici o idee\n- câte una pe rând'),
      diapozitivNou('text', 'Mulțumesc!', 'O concluzie sau o întrebare pentru colegi.'),
    ],
  });

  // ---------- Imagini: se micșorează în browser, ca să încapă ușor ----------
  function incarcaImagine(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type)) return reject(new Error('Alege o imagine JPG, PNG, WebP, GIF sau BMP.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let max = 1280;
        for (let pas = 0; pas < 6; pas++) {
          const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * k));
          c.height = Math.max(1, Math.round(img.naturalHeight * k));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; // fundal alb pentru imaginile transparente
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          for (const q of [0.82, 0.68, 0.55]) {
            const data = c.toDataURL('image/jpeg', q);
            if (data.length <= D.LIMITE.imagine) return resolve(data);
          }
          max = Math.round(max * 0.7);
        }
        reject(new Error('Imaginea este prea mare. Încearcă alta.'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imaginea nu a putut fi citită.')); };
      img.src = url;
    });
  }

  // ---------- Fișier .json (descărcare / deschidere) ----------
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'prezentare';
  function descarca(p) {
    const blob = new Blob([JSON.stringify({ format: 'edudigi-prezentare', versiune: 2, prezentare: p })], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${slug(p.titlu)}.edudigi.json` });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function alegeFisier() {
    return new Promise((resolve, reject) => {
      const input = h('input', { type: 'file', accept: '.json,application/json' });
      input.addEventListener('change', async () => {
        const f = input.files[0];
        if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          const { prezentare, errors } = D.curata(j.prezentare || j);
          if (errors.length) throw new Error(errors[0]);
          resolve(prezentare);
        } catch (e) {
          reject(new Error(e instanceof SyntaxError ? 'Fișierul nu este o prezentare edudigi.' : e.message));
        }
      });
      input.click();
    });
  }

  // ---------- Expunerea pe ecran complet ----------
  function prezinta(p, start = 0) {
    const deck = D.render(D.dinAtelier(p), markdown, { start });
    let intrat = false;
    const inchide = () => {
      document.removeEventListener('fullscreenchange', laSchimbare);
      document.removeEventListener('keydown', laEsc);
      if (document.fullscreenElement) document.exitFullscreen?.();
      over.remove();
    };
    const laSchimbare = () => { if (document.fullscreenElement) intrat = true; else if (intrat) inchide(); };
    const laEsc = (e) => { if (e.key === 'Escape') inchide(); };
    const over = h('div', { class: 'atelier-over prose', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Expunere: ${p.titlu}` },
      h('button', { class: 'btn small ghost atelier-close', type: 'button', onclick: inchide }, 'Încheie expunerea (Esc)'), deck);
    document.body.append(over);
    document.addEventListener('fullscreenchange', laSchimbare);
    document.addEventListener('keydown', laEsc);
    deck.focus();
    // Ecran complet pe toată fereastra, ca butonul de închidere să rămână vizibil.
    over.requestFullscreen?.().then(() => deck.focus()).catch(() => {});
  }

  // ---------- Imprimare / PDF: toate diapozitivele, câte unul pe pagină ----------
  function tipareste(p, cuNote) {
    const zona = h('div', { class: 'pp-print' }, p.diapozitive.map((d, i) => h('div', { class: 'pp-print-pagina' },
      D.miniatura(d, p.tema, p.raport),
      h('p', { class: 'pp-print-info' }, `${p.titlu} · diapozitivul ${i + 1} din ${p.diapozitive.length}`),
      cuNote && d.note ? h('p', { class: 'pp-print-note' }, d.note) : null)));
    document.body.append(zona);
    document.body.classList.add('pp-printing');
    const gata = () => { zona.remove(); document.body.classList.remove('pp-printing'); window.removeEventListener('afterprint', gata); };
    window.addEventListener('afterprint', gata);
    setTimeout(() => window.print(), 50);
  }

  // ---------- Ecranul de start (ca la PowerPoint): Nou + Recente ----------
  routes.push({ pattern: /^\/atelier$/, handler: async () => {
    document.title = 'Atelier de prezentări – edudigi';
    const eroare = h('p', { class: 'error', role: 'alert' });
    const lista = await store.lista();
    const s = sesiune();
    const info = s?.rol === 'elev'
      ? h('p', { class: 'banner ok' }, `Ești în cont ca ${s.nume}. Prezentările se salvează în contul tău, iar profesorul le poate vedea.`)
      : h('p', { class: 'banner' }, s?.rol === 'profesor'
        ? 'Ca profesor, prezentările tale se salvează doar în acest browser. Prezentările elevilor le vezi în panoul clasei, la fiecare elev.'
        : 'Prezentările se salvează doar în acest browser. ', s ? null : h('a', { href: '#/intra' }, 'Intră în cont ca elev'), s ? null : ' ca să le păstrezi și să le vadă profesorul.');
    const nou = async (p) => {
      eroare.textContent = '';
      try { location.hash = `#/atelier/${await store.salveaza(null, p)}`; } catch (e) { eroare.textContent = e.message; }
    };
    const exemplu = diapozitivNou('titlu', 'Titlul prezentării', 'Subtitlu');
    const sablon = (tema, eticheta, goala) => h('button', { class: 'pp-sablon', type: 'button', onclick: () => nou(prezentareNoua(tema, goala)) },
      D.miniatura(goala ? diapozitivNou('titlu') : exemplu, tema, '16:9'), h('span', {}, eticheta));
    show(h('div', { class: 'wrap list-page pp-start' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Atelier'), h('h1', {}, 'Atelier de prezentări'),
        h('p', { class: 'muted' }, 'Un PowerPoint al clasei: creezi diapozitive, alegi teme, tranziții și animații, apoi prezinți pe ecran complet.')),
      info,
      h('h2', { class: 'pp-sectiune' }, 'Nou'),
      h('div', { class: 'pp-sabloane' },
        sablon('alb', 'Prezentare necompletată', true),
        Object.entries(NUME_TEME).map(([t, n]) => sablon(t, n, false))),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
          try { await nou(await alegeFisier()); } catch (e) { eroare.textContent = e.message; }
        } }, svg('deschide'), 'Deschide un fișier de pe calculator')),
      eroare,
      h('h2', { class: 'pp-sectiune' }, 'Recente'),
      lista.length
        ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table pp-recente' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Nume'), h('th', {}, 'Diapozitive'), h('th', {}, 'Modificat'), h('th', {}, ''))),
            h('tbody', {}, lista.map((x) => h('tr', {},
              h('td', {}, h('a', { href: `#/atelier/${x.id}`, class: 'pp-recent-nume' }, svg('expunere'), x.titlu)),
              h('td', {}, String(x.diapozitive)),
              h('td', {}, cand(x.actualizat_la)),
              h('td', { class: 'pp-recent-act' },
                h('button', { class: 'link-btn', type: 'button', onclick: async () => {
                  try { prezinta(await store.citeste(x.id)); } catch (e) { eroare.textContent = e.message; }
                } }, 'Prezintă'),
                h('button', { class: 'link-btn danger', type: 'button', onclick: async (ev) => {
                  if (!confirm(`Ștergi prezentarea „${x.titlu}”? Operația nu poate fi anulată.`)) return;
                  try { await store.sterge(x.id); ev.target.closest('tr').remove(); } catch (e) { eroare.textContent = e.message; }
                } }, 'Șterge')))))))
        : h('div', { class: 'empty' }, h('h3', {}, 'Nicio prezentare încă'), h('p', { class: 'muted' }, 'Alege mai sus un șablon și începe cu diapozitivul de titlu.'))));
  } });

  // ---------- Text editabil: din formatul salvat în elemente și înapoi ----------
  // În editor, fiecare rând e un <div> (cu clasa „lista” pentru marcatori); aldin/cursiv/subliniat sunt <b>/<i>/<u>.
  function textInEditor(text) {
    const r = D.randuri(text);
    if (!r.some((x) => x.bucati.some((b) => b.text))) return [h('div', {}, h('br'))];
    return r.map((x) => {
      const copii = x.bucati.map((b) => {
        let el = document.createTextNode(b.text);
        if (b.b) el = h('b', {}, el);
        if (b.i) el = h('i', {}, el);
        if (b.u) el = h('u', {}, el);
        return el;
      });
      return h('div', { class: x.lista ? 'lista' : null }, copii.length ? copii : h('br'));
    });
  }
  function textDinEditor(root) {
    const linii = [];
    let cur = null;
    const inchide = () => { if (cur) linii.push((cur.lista ? '- ' : '') + cur.s.replace(/\s+$/, '')); cur = null; };
    const marcaj = (t, f) => {
      if (!t.trim()) return t;
      const m = f.b ? '**' : f.u ? '__' : f.i ? '*' : '';
      if (!m) return t;
      const [, a, mijloc, z] = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
      return `${a}${m}${mijloc.replace(/[*_]{2,}/g, '')}${m}${z}`;
    };
    const mergi = (node, f, lista) => {
      if (node.nodeType === 3) {
        if (!cur) cur = { lista, s: '' };
        cur.s += marcaj(node.data.replace(/ /g, ' ').replace(/\n/g, ' '), f);
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === 'BR') {
        if (node === node.parentNode.lastChild && node.parentNode !== root) return;
        const l = cur ? cur.lista : lista;
        inchide();
        cur = { lista: l, s: '' };
        return;
      }
      const g = { b: f.b || tag === 'B' || tag === 'STRONG', i: f.i || tag === 'I' || tag === 'EM', u: f.u || tag === 'U' };
      if (tag === 'DIV' || tag === 'P' || tag === 'LI') {
        inchide();
        const l = node.classList.contains('lista') || tag === 'LI';
        cur = { lista: l, s: '' };
        for (const c of node.childNodes) mergi(c, g, l);
        inchide();
        return;
      }
      for (const c of node.childNodes) mergi(c, g, lista);
    };
    for (const c of root.childNodes) mergi(c, {}, false);
    inchide();
    while (linii.length && !linii[linii.length - 1].replace(/^- /, '').trim()) linii.pop();
    return linii.join('\n');
  }
  const editabil = (el, plain) => {
    try { el.contentEditable = plain ? 'plaintext-only' : 'true'; } catch { el.contentEditable = 'true'; }
    el.spellcheck = true;
    el.setAttribute('lang', 'ro');
    return el;
  };

  // ---------- Editorul ----------
  routes.push({ pattern: /^\/atelier\/([\w-]+)$/, handler: async ([, id0]) => {
    let id = id0;
    let p;
    try { p = await store.citeste(id); } catch (e) {
      show(h('div', { class: 'wrap' }, h('div', { class: 'empty' }, h('h3', {}, 'Prezentarea nu a fost găsită'), h('p', { class: 'muted' }, e.message),
        h('p', {}, h('a', { class: 'btn', href: '#/atelier' }, 'Înapoi la Atelier')))));
      return;
    }
    document.title = `${p.titlu} – Atelier edudigi`;
    let sel = 0, vedere = 'normal', zoom = 0, noteVizibile = true, filaActiva = 'pornire';
    const cur = () => p.diapozitive[sel];

    // ---- Anulare / Refacere: instantanee ale prezentării (imaginile se păstrează o singură dată, prin referință) ----
    const imagini = new Map(), cheiImagini = new Map();
    const instantaneu = () => JSON.stringify(p, (k, v) => {
      if (k === 'imagine' && v) {
        if (!cheiImagini.has(v)) { const c = `img${cheiImagini.size}`; cheiImagini.set(v, c); imagini.set(c, v); }
        return cheiImagini.get(v);
      }
      return v;
    });
    const dinInstantaneu = (j) => JSON.parse(j, (k, v) => (k === 'imagine' && v ? imagini.get(v) || '' : v));
    let istoric = [instantaneu()], pozIstoric = 0, timerIstoric = null;
    const memoreaza = (imediat = true) => {
      clearTimeout(timerIstoric);
      const fa = () => {
        const j = instantaneu();
        if (j === istoric[pozIstoric]) return;
        istoric = istoric.slice(0, pozIstoric + 1);
        istoric.push(j);
        if (istoric.length > 80) istoric.shift();
        pozIstoric = istoric.length - 1;
        actualizeazaIstoric();
      };
      if (imediat) fa(); else timerIstoric = setTimeout(fa, 700);
    };
    const mergiIstoric = (d) => {
      clearTimeout(timerIstoric);
      memoreaza();
      const t = pozIstoric + d;
      if (t < 0 || t >= istoric.length) return;
      pozIstoric = t;
      p = dinInstantaneu(istoric[t]);
      sel = Math.min(sel, p.diapozitive.length - 1);
      titluInput.value = p.titlu;
      deseneazaTot();
      schimbat({ istoric: false });
    };

    // ---- Salvare automată ----
    const stare = h('span', { class: 'pp-stare', role: 'status' }, 'Salvat');
    let timer = null, coada = Promise.resolve(), murdar = false;
    const salveazaAcum = () => {
      clearTimeout(timer);
      if (!murdar) return coada;
      murdar = false;
      stare.textContent = 'Se salvează…';
      const copie = JSON.parse(JSON.stringify(p));
      coada = coada.then(async () => {
        try {
          id = await store.salveaza(id, copie);
          stare.textContent = eElev() ? 'Salvat în cont ✓' : 'Salvat în browser ✓';
          stare.classList.remove('error');
        } catch (e) {
          murdar = true;
          stare.textContent = `Nesalvat: ${e.message}`;
          stare.classList.add('error');
        }
      });
      return coada;
    };
    // Orice modificare: salvare automată, istoric, miniaturi, verificări.
    function schimbat({ istoric = true, tastare = false, miniaturi = true } = {}) {
      murdar = true;
      stare.textContent = 'Modificări nesalvate…';
      clearTimeout(timer);
      timer = setTimeout(salveazaAcum, 1000);
      if (istoric) memoreaza(!tastare);
      if (miniaturi) programeazaMiniaturi();
      actualizeazaStatus();
    }
    const plecare = (e) => { if (murdar) { salveazaAcum(); e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', plecare);
    const laTaste = (e) => scurtaturi(e);
    document.addEventListener('keydown', laTaste);
    window.addEventListener('hashchange', () => {
      salveazaAcum();
      window.removeEventListener('beforeunload', plecare);
      document.removeEventListener('keydown', laTaste);
      inchideMeniu();
    }, { once: true });

    // ---- Operații cu diapozitivele ----
    function alege(i, { focus = false } = {}) {
      sel = Math.max(0, Math.min(i, p.diapozitive.length - 1));
      deseneazaMiniaturi();
      deseneazaCanvas();
      deseneazaPanglica();
      actualizeazaStatus();
      if (focus) listaMini.querySelector(`[data-i="${sel}"] .pp-mini-btn`)?.focus();
    }
    function adauga(aspect = 'text') {
      if (p.diapozitive.length >= D.LIMITE.diapozitive) return alert(`O prezentare poate avea cel mult ${D.LIMITE.diapozitive} de diapozitive.`);
      const d = diapozitivNou(aspect);
      d.tranzitie = cur().tranzitie;
      p.diapozitive.splice(sel + 1, 0, d);
      alege(sel + 1);
      schimbat();
      setTimeout(() => canvas.querySelector('.pp-titlu')?.focus(), 0);
    }
    function dubleaza(i = sel) {
      if (p.diapozitive.length >= D.LIMITE.diapozitive) return;
      p.diapozitive.splice(i + 1, 0, JSON.parse(JSON.stringify(p.diapozitive[i])));
      alege(i + 1);
      schimbat();
    }
    function sterge(i = sel) {
      if (p.diapozitive.length === 1) return alert('Prezentarea trebuie să aibă cel puțin un diapozitiv.');
      p.diapozitive.splice(i, 1);
      alege(Math.min(i, p.diapozitive.length - 1));
      schimbat();
    }
    function muta(din, la) {
      if (la < 0 || la >= p.diapozitive.length || din === la) return;
      const [x] = p.diapozitive.splice(din, 1);
      p.diapozitive.splice(la, 0, x);
      alege(la);
      schimbat();
    }
    const imgInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
    let tintaImagine = null;
    imgInput.addEventListener('change', async () => {
      const f = imgInput.files[0];
      imgInput.value = '';
      if (!f) return;
      try {
        const i = tintaImagine ?? sel;
        tintaImagine = null;
        const d = p.diapozitive[i];
        d.imagine = await incarcaImagine(f);
        if (d.aspect === 'text' || d.aspect === 'titlu' || d.aspect === 'antet') d.aspect = 'text-imagine';
        alege(i);
        schimbat();
      } catch (e) { alert(e.message); }
    });
    const insereazaImagine = (i = sel) => { tintaImagine = i; imgInput.click(); };

    // ---- Bara de titlu (ca în PowerPoint) ----
    const titluInput = h('input', { class: 'pp-nume', value: p.titlu, maxlength: D.LIMITE.titlu, 'aria-label': 'Numele prezentării' });
    titluInput.addEventListener('input', () => {
      // Diapozitivul de titlu urmează numele prezentării cât timp elevul nu a scris altceva pe el.
      const d0 = p.diapozitive[0];
      const legat = d0.aspect === 'titlu' && d0.titlu === p.titlu;
      p.titlu = titluInput.value;
      document.title = `${p.titlu} – Atelier edudigi`;
      if (legat) { d0.titlu = p.titlu; if (sel === 0) deseneazaCanvas(); }
      schimbat({ tastare: true });
    });
    const btnAnulare = h('button', { class: 'pp-qa', type: 'button', title: 'Anulare (Ctrl+Z)', 'aria-label': 'Anulare', onclick: () => mergiIstoric(-1) }, svg('anuleaza'));
    const btnRefacere = h('button', { class: 'pp-qa', type: 'button', title: 'Refacere (Ctrl+Y)', 'aria-label': 'Refacere', onclick: () => mergiIstoric(1) }, svg('reface'));
    function actualizeazaIstoric() {
      btnAnulare.disabled = pozIstoric === 0;
      btnRefacere.disabled = pozIstoric >= istoric.length - 1;
    }
    const barTitlu = h('div', { class: 'pp-titlebar' },
      h('a', { class: 'pp-app', href: '#/atelier', title: 'Înapoi la ecranul de start' }, h('span', { class: 'pp-app-logo' }, 'P'), h('span', { class: 'pp-app-nume' }, 'Atelier')),
      h('div', { class: 'pp-qa-bar' },
        h('button', { class: 'pp-qa', type: 'button', title: 'Salvare (Ctrl+S)', 'aria-label': 'Salvare', onclick: () => salveazaAcum() }, svg('salveaza')),
        btnAnulare, btnRefacere,
        h('button', { class: 'pp-qa', type: 'button', title: 'Pornire de la început (F5)', 'aria-label': 'Pornire de la început', onclick: () => porneste(0) }, svg('joc'))),
      titluInput,
      stare,
      h('a', { class: 'pp-qa pp-inchide', href: '#/atelier', title: 'Închidere', 'aria-label': 'Închidere' }, svg('inchide')));

    // ---- Panglica ----
    const FILE = [['fisier', 'Fișier'], ['pornire', 'Pornire'], ['inserare', 'Inserare'], ['proiectare', 'Proiectare'], ['tranzitii', 'Tranziții'], ['animatii', 'Animații'], ['expunere', 'Expunere diapozitive'], ['revizuire', 'Revizuire'], ['vizualizare', 'Vizualizare']];
    const file = h('div', { class: 'pp-tabs', role: 'tablist', 'aria-label': 'Panglică' });
    const panglica = h('div', { class: 'pp-ribbon', role: 'tabpanel' });
    // Butoanele nu iau focusul, ca selecția din text să rămână (Aldin, Cursiv etc.).
    const fara = (e) => e.preventDefault();
    const mare = (ico, eticheta, onclick, extra = {}) => h('button', { class: 'pp-mare', type: 'button', onmousedown: fara, onclick, ...extra }, svg(ico, 'pp-ico mare'), h('span', {}, eticheta));
    const mic = (ico, eticheta, onclick, extra = {}) => h('button', { class: 'pp-mic', type: 'button', title: eticheta, 'aria-label': eticheta, onmousedown: fara, onclick, ...extra }, typeof ico === 'string' && P[ico] ? svg(ico) : h('span', { class: 'pp-mic-text' }, ico));
    const grup = (nume, ...copii) => h('div', { class: 'pp-grup', role: 'group', 'aria-label': nume }, h('div', { class: 'pp-grup-cont' }, copii), h('span', { class: 'pp-grup-nume' }, nume));
    const apasat = (v) => (v ? 'true' : 'false');

    function deseneazaFile() {
      umple(file, FILE.map(([k, v]) => h('button', {
        class: `pp-tab${k === 'fisier' ? ' pp-tab-fisier' : ''}`, type: 'button', role: 'tab', 'aria-selected': apasat(filaActiva === k),
        onclick: () => { if (k === 'fisier') return deschideFisier(); filaActiva = k; deseneazaFile(); deseneazaPanglica(); },
      }, v)));
    }
    // Comenzi de text: execCommand lucrează pe selecția din caseta de text a diapozitivului.
    function comanda(cmd) {
      const corp = canvas.querySelector('.pp-corp');
      if (!corp) return;
      if (!corp.contains(document.getSelection().anchorNode)) {
        corp.focus();
        const r = document.createRange();
        r.selectNodeContents(corp);
        const s = document.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      }
      document.execCommand(cmd);
      corp.dispatchEvent(new Event('input'));
    }
    function comutaLista() {
      const corp = canvas.querySelector('.pp-corp');
      if (!corp) return;
      normalizeazaCorp(corp);
      const s = document.getSelection();
      let blocuri = [...corp.children];
      if (s.rangeCount && corp.contains(s.anchorNode)) {
        const r = s.getRangeAt(0);
        blocuri = blocuri.filter((b) => r.intersectsNode(b));
      }
      const toate = blocuri.every((b) => b.classList.contains('lista'));
      for (const b of blocuri) b.classList.toggle('lista', !toate);
      corp.dispatchEvent(new Event('input'));
    }
    const seteazaStil = (k, v) => { cur().stil[k] = v; deseneazaCanvas(); deseneazaPanglica(); schimbat(); };
    const treptMarime = (d) => {
      const k = Object.keys(D.MARIMI);
      seteazaStil('marime', k[Math.max(0, Math.min(k.length - 1, k.indexOf(cur().stil.marime) + d))]);
    };

    // Meniuri derulante (galerii) ale panglicii.
    let meniu = null;
    function inchideMeniu() { meniu?.remove(); meniu = null; document.removeEventListener('mousedown', inAfara, true); }
    function inAfara(e) { if (meniu && !meniu.contains(e.target)) inchideMeniu(); }
    function deschideMeniu(ancora, continut, cls = '') {
      inchideMeniu();
      const r = ancora.getBoundingClientRect();
      meniu = h('div', { class: `pp-meniu ${cls}`, role: 'menu' }, continut);
      meniu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 340))}px`;
      meniu.style.top = `${r.bottom + 4}px`;
      document.body.append(meniu);
      document.addEventListener('mousedown', inAfara, true);
      meniu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { inchideMeniu(); ancora.focus(); } });
      meniu.querySelector('button')?.focus();
    }
    const galerieAspecte = (aplica) => h('div', { class: 'pp-galerie-aspecte' }, Object.entries(D.ASPECTE).map(([k, v]) => h('button', {
      class: 'pp-aspect-opt', type: 'button', role: 'menuitem', onclick: () => { inchideMeniu(); aplica(k); },
    }, D.miniatura(diapozitivExemplu(k), p.tema, p.raport), h('span', {}, v))));
    const diapozitivExemplu = (aspect) => ({ ...diapozitivNou(aspect, 'Titlu', aspect === 'titlu' || aspect === 'antet' ? 'Subtitlu' : '- Text\n- Text'), imagine: '' });

    function deseneazaPanglica() {
      const d = cur();
      const st = d.stil;
      let continut;
      if (filaActiva === 'pornire') {
        const btnNou = h('div', { class: 'pp-split' },
          mare('nou', 'Diapozitiv nou', () => adauga('text'), { title: 'Diapozitiv nou (Ctrl+M)' }),
          h('button', { class: 'pp-split-sageata', type: 'button', 'aria-label': 'Alege aspectul diapozitivului nou', onclick: (e) => deschideMeniu(e.currentTarget, galerieAspecte((k) => adauga(k))) }, '▾'));
        continut = [
          grup('Diapozitive', btnNou,
            h('div', { class: 'pp-stiva' },
              mic('aspect', 'Aspect', (e) => deschideMeniu(e.currentTarget, galerieAspecte((k) => { cur().aspect = k; alege(sel); schimbat(); }))),
              mic('dubla', 'Dublare diapozitiv (Ctrl+D)', () => dubleaza()),
              mic('sterge', 'Ștergere diapozitiv', () => sterge()))),
          grup('Font',
            h('div', { class: 'pp-stiva' },
              h('div', { class: 'pp-rand' },
                h('select', { class: 'pp-select', 'aria-label': 'Mărimea textului', onchange: (e) => seteazaStil('marime', e.target.value) },
                  Object.entries(D.MARIMI).map(([k, v]) => h('option', { value: k, selected: st.marime === k }, v))),
                mic('marire', 'Mărire font', () => treptMarime(1)),
                mic('micsorare', 'Micșorare font', () => treptMarime(-1))),
              h('div', { class: 'pp-rand' },
                mic('B', 'Aldin (Ctrl+B)', () => comanda('bold'), { class: 'pp-mic pp-b' }),
                mic('I', 'Cursiv (Ctrl+I)', () => comanda('italic'), { class: 'pp-mic pp-i' }),
                mic('U', 'Subliniat (Ctrl+U)', () => comanda('underline'), { class: 'pp-mic pp-u' }),
                h('button', { class: 'pp-mic pp-culoare', type: 'button', title: 'Culoare font', 'aria-label': 'Culoare font', onmousedown: fara,
                  onclick: (e) => deschideMeniu(e.currentTarget, h('div', { class: 'pp-paleta' }, Object.entries(D.CULORI).map(([k, v]) => h('button', {
                    class: `pp-culoare-opt cul-${k}`, type: 'button', role: 'menuitemradio', 'aria-checked': apasat(st.culoare === k), title: v, 'aria-label': v,
                    onclick: () => { inchideMeniu(); seteazaStil('culoare', k); },
                  }, h('span', {}, v))))) }, svg('culoare'), h('span', { class: `pp-culoare-bara cul-${st.culoare}` }))))),
          grup('Paragraf',
            h('div', { class: 'pp-stiva' },
              h('div', { class: 'pp-rand' }, mic('lista', 'Marcatori', comutaLista)),
              h('div', { class: 'pp-rand' },
                ...['stanga', 'centru', 'dreapta'].map((a) => mic(a, `Aliniere ${D.ALINIERI[a].toLowerCase()}`, () => seteazaStil('aliniere', st.aliniere === a ? 'auto' : a), { 'aria-pressed': apasat(st.aliniere === a) }))))),
          grup('Desen', mare('imagine', 'Imagine', () => insereazaImagine())),
        ];
      } else if (filaActiva === 'inserare') {
        continut = [
          grup('Diapozitive', mare('nou', 'Diapozitiv nou', () => adauga('text')), mare('dubla', 'Dublare', () => dubleaza())),
          grup('Imagini', mare('imagine', 'Imagine', () => insereazaImagine()),
            d.imagine ? mare('sterge', 'Elimină imaginea', () => { cur().imagine = ''; deseneazaCanvas(); schimbat(); }) : null),
          grup('Text', mare('lista', 'Listă cu marcatori', comutaLista)),
        ];
      } else if (filaActiva === 'proiectare') {
        continut = [
          grup('Teme', h('div', { class: 'pp-galerie' }, D.TEME.map((t) => h('button', {
            class: 'pp-tema-opt', type: 'button', 'aria-pressed': apasat(p.tema === t), title: NUME_TEME[t], 'aria-label': `Tema ${NUME_TEME[t]}`, onmousedown: fara,
            onclick: () => { p.tema = t; deseneazaTot(); schimbat(); },
          }, D.miniatura({ ...d, imagine: '', text: d.text.split('\n').slice(0, 2).join('\n') }, t, '16:9'), h('span', {}, NUME_TEME[t]))))),
          grup('Particularizare',
            mare('raport', p.raport === '4:3' ? 'Standard (4:3)' : 'Ecran lat (16:9)', (e) => deschideMeniu(e.currentTarget, h('div', { class: 'pp-lista-meniu' },
              D.RAPOARTE.map((r) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': apasat(p.raport === r), onclick: () => { inchideMeniu(); p.raport = r; deseneazaTot(); schimbat(); } },
                r === '16:9' ? 'Ecran lat (16:9)' : 'Standard (4:3)')))))),
        ];
      } else if (filaActiva === 'tranzitii') {
        continut = [
          grup('Previzualizare', mare('previz', 'Previzualizare', () => previzualizeazaTranzitie())),
          grup('Tranziție la acest diapozitiv', h('div', { class: 'pp-galerie pp-efecte' }, Object.entries(D.TRANZITII).map(([k, v]) => h('button', {
            class: 'pp-efect', type: 'button', 'aria-pressed': apasat(d.tranzitie === k), onmousedown: fara,
            onclick: () => { cur().tranzitie = k; deseneazaPanglica(); deseneazaMiniaturi(); schimbat({ miniaturi: false }); if (k !== 'niciuna') previzualizeazaTranzitie(); },
          }, h('span', { class: `pp-efect-ico tr-ico-${k}` }), h('span', {}, v))))),
          grup('Temporizare', mare('verifica', 'Se aplică la toate', () => { const t = d.tranzitie; p.diapozitive.forEach((x) => { x.tranzitie = t; }); deseneazaMiniaturi(); schimbat(); })),
        ];
      } else if (filaActiva === 'animatii') {
        continut = [
          grup('Previzualizare', mare('previz', 'Previzualizare', () => previzualizeazaAnimatie())),
          grup('Animație (textul apare pe rând, la clic)', h('div', { class: 'pp-galerie pp-efecte' }, Object.entries(D.ANIMATII).map(([k, v]) => h('button', {
            class: 'pp-efect', type: 'button', 'aria-pressed': apasat(d.animatie === k), onmousedown: fara,
            onclick: () => { cur().animatie = k; deseneazaPanglica(); deseneazaMiniaturi(); schimbat({ miniaturi: false }); if (k !== 'niciuna') previzualizeazaAnimatie(); },
          }, h('span', { class: `pp-efect-ico an-ico-${k}` }, svg('animatie')), h('span', {}, v))))),
          grup('Animație avansată', mare('verifica', 'Se aplică la toate', () => { const a = d.animatie; p.diapozitive.forEach((x) => { x.animatie = a; }); deseneazaMiniaturi(); schimbat(); })),
        ];
      } else if (filaActiva === 'expunere') {
        continut = [
          grup('Pornire expunere diapozitive',
            mare('joc', 'De la început', () => porneste(0), { title: 'De la început (F5)' }),
            mare('jocCurent', 'De la diapozitivul curent', () => porneste(sel), { title: 'De la diapozitivul curent (Shift+F5)' })),
          grup('Monitoare', h('p', { class: 'pp-sfat' }, 'În timpul expunerii: săgeți, Spațiu sau clic pentru înainte; Esc pentru ieșire. Butonul „Note” arată notele vorbitorului.')),
        ];
      } else if (filaActiva === 'revizuire') {
        const probleme = p.diapozitive.flatMap((x, i) => D.sfaturi(x, i).map((t) => ({ i, t })));
        const total = p.diapozitive.reduce((n, x) => n + D.cuvinte(`${x.titlu} ${x.text.replace(/[*_]/g, '')}`), 0);
        continut = [
          grup('Verificare', h('div', { class: 'pp-verificare' },
            probleme.length
              ? h('ul', {}, probleme.slice(0, 8).map((x) => h('li', {}, h('button', { class: 'link-btn', type: 'button', onclick: () => alege(x.i) }, `Diapozitivul ${x.i + 1}`), ` ${x.t}.`)))
              : h('p', { class: 'pp-ok' }, '✓ Prezentarea respectă regulile de design din lecție.'))),
          grup('Statistici', h('p', { class: 'pp-sfat' }, `${p.diapozitive.length} diapozitive · ${total} de cuvinte în total · diapozitivul curent: ${D.cuvinte(`${d.titlu} ${d.text.replace(/[*_]/g, '')}`)} cuvinte.`)),
        ];
      } else {
        continut = [
          grup('Vizualizări prezentare',
            mare('normal', 'Normal', () => seteazaVedere('normal'), { 'aria-pressed': apasat(vedere === 'normal') }),
            mare('sortare', 'Sortare diapozitive', () => seteazaVedere('sortare'), { 'aria-pressed': apasat(vedere === 'sortare') })),
          grup('Afișare', mare('note', 'Note', () => { noteVizibile = !noteVizibile; deseneazaVedere(); deseneazaPanglica(); }, { 'aria-pressed': apasat(noteVizibile) })),
          grup('Panoramare', mare('expunere', 'Potrivire la fereastră', () => { zoom = 0; aplicaZoom(); })),
        ];
      }
      umple(panglica, continut);
    }

    // ---- Panoul de miniaturi (stânga), cu tragere pentru reordonare și meniu la clic dreapta ----
    const listaMini = h('ol', { class: 'pp-miniaturi', 'aria-label': 'Diapozitive' });
    let timerMini = null;
    const programeazaMiniaturi = () => { clearTimeout(timerMini); timerMini = setTimeout(deseneazaMiniaturi, 250); };
    let tras = null;
    function itemMiniatura(d, i, mareMini = false) {
      const li = h('li', { class: `pp-mini${i === sel ? ' activ' : ''}`, 'data-i': String(i), draggable: 'true' },
        h('span', { class: 'pp-mini-nr' }, String(i + 1), d.tranzitie !== 'niciuna' || d.animatie !== 'niciuna' ? h('span', { class: 'pp-mini-efect', title: 'Are tranziție sau animație' }, '★') : null),
        h('button', { class: 'pp-mini-btn', type: 'button', 'aria-label': `Diapozitivul ${i + 1}: ${d.titlu || D.ASPECTE[d.aspect]}`, 'aria-current': i === sel ? 'true' : null,
          onclick: () => { if (mareMini) { alege(i); } else alege(i, { focus: true }); },
          ondblclick: () => { if (mareMini) seteazaVedere('normal'); },
          onkeydown: (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); alege(i + 1, { focus: true }); }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); alege(i - 1, { focus: true }); }
            else if (e.key === 'Delete') { e.preventDefault(); sterge(i); }
            else if (e.key === 'Enter' && mareMini) seteazaVedere('normal');
          },
          oncontextmenu: (e) => { e.preventDefault(); alege(i); meniuContext(e.clientX, e.clientY, i); },
        }, D.miniatura(d, p.tema, p.raport)));
      li.addEventListener('dragstart', (e) => { tras = i; li.classList.add('tras'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); });
      li.addEventListener('dragend', () => { tras = null; li.classList.remove('tras'); document.querySelectorAll('.pp-mini.peste').forEach((x) => x.classList.remove('peste')); });
      li.addEventListener('dragover', (e) => { if (tras == null) return; e.preventDefault(); li.classList.add('peste'); });
      li.addEventListener('dragleave', () => li.classList.remove('peste'));
      li.addEventListener('drop', (e) => { e.preventDefault(); li.classList.remove('peste'); if (tras != null) muta(tras, i); });
      return li;
    }
    function deseneazaMiniaturi() {
      clearTimeout(timerMini);
      umple(listaMini, p.diapozitive.map((d, i) => itemMiniatura(d, i)));
      if (vedere === 'sortare') umple(sortare, p.diapozitive.map((d, i) => itemMiniatura(d, i, true)));
      listaMini.querySelector('.activ')?.scrollIntoView({ block: 'nearest' });
    }
    function meniuContext(x, y, i) {
      inchideMeniu();
      const item = (t, f, dis) => h('button', { type: 'button', role: 'menuitem', disabled: dis, onclick: () => { inchideMeniu(); f(); } }, t);
      meniu = h('div', { class: 'pp-meniu pp-lista-meniu', role: 'menu' },
        item('Diapozitiv nou', () => adauga('text')),
        item('Dublare diapozitiv', () => dubleaza(i)),
        item('Ștergere diapozitiv', () => sterge(i), p.diapozitive.length === 1),
        h('hr'),
        item('Mută mai sus', () => muta(i, i - 1), i === 0),
        item('Mută mai jos', () => muta(i, i + 1), i === p.diapozitive.length - 1),
        h('hr'),
        item('Prezintă de aici', () => porneste(i)));
      meniu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
      meniu.style.top = `${Math.min(y, window.innerHeight - 260)}px`;
      document.body.append(meniu);
      document.addEventListener('mousedown', inAfara, true);
      meniu.addEventListener('keydown', (e) => { if (e.key === 'Escape') inchideMeniu(); });
      meniu.querySelector('button')?.focus();
    }

    // ---- Diapozitivul editat (centru) ----
    const canvas = h('div', { class: 'pp-canvas' });
    const canvasZona = h('div', { class: 'pp-canvas-zona' }, canvas);
    function normalizeazaCorp(corp) {
      // Textul scris direct în casetă (fără rând) se mută într-un <div>, ca fiecare rând să fie un bloc.
      let bloc = null;
      for (const n of [...corp.childNodes]) {
        if (n.nodeType === 1 && (n.tagName === 'DIV' || n.tagName === 'P')) { bloc = null; continue; }
        if (!bloc) { bloc = h('div'); corp.insertBefore(bloc, n); }
        bloc.append(n);
      }
      if (!corp.children.length) corp.append(h('div', {}, h('br')));
    }
    const marcheazaGol = (el) => el.classList.toggle('gol', !el.textContent.trim());
    function deseneazaCanvas() {
      const d = cur();
      const st = d.stil;
      const titlu = editabil(h('h2', { class: 'pp-titlu pp-ed', 'data-ph': d.aspect === 'titlu' ? 'Faceți clic pentru a adăuga titlul' : 'Faceți clic pentru a adăuga un titlu', 'aria-label': 'Titlu' }, d.titlu), true);
      titlu.addEventListener('input', () => { d.titlu = titlu.textContent.replace(/\n/g, ' '); marcheazaGol(titlu); schimbat({ tastare: true }); });
      titlu.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); corp.focus(); } });
      const corp = editabil(h('div', {
        class: 'pp-corp pp-ed', 'aria-label': 'Text', role: 'textbox', 'aria-multiline': 'true',
        'data-ph': d.aspect === 'titlu' || d.aspect === 'antet' ? 'Faceți clic pentru a adăuga un subtitlu' : 'Faceți clic pentru a adăuga text',
      }, textInEditor(d.text)), false);
      corp.addEventListener('input', () => { d.text = textDinEditor(corp); marcheazaGol(corp); schimbat({ tastare: true }); });
      corp.addEventListener('paste', (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
      });
      for (const el of [titlu, corp]) {
        marcheazaGol(el);
        el.addEventListener('focus', () => el.classList.add('activ'));
        el.addEventListener('blur', () => el.classList.remove('activ'));
      }
      let fig = null;
      if (d.aspect === 'text-imagine' || d.aspect === 'imagine') {
        fig = d.imagine
          ? h('div', { class: `pp-fig${d.aspect === 'imagine' ? ' mare' : ''} pp-fig-ed` },
              h('img', { src: d.imagine, alt: d.titlu || 'Imagine' }),
              h('button', { class: 'pp-fig-schimba', type: 'button', onclick: () => insereazaImagine() }, 'Schimbă imaginea'))
          : h('div', { class: `pp-fig${d.aspect === 'imagine' ? ' mare' : ''}` },
              h('button', { class: 'pp-loc-imagine', type: 'button', onclick: () => insereazaImagine() }, svg('imagine', 'pp-ico mare'), h('span', {}, 'Faceți clic pentru a insera o imagine')));
      }
      const c = h('div', { class: `slide-content pp al-${st.aliniere} mar-${st.marime} cul-${st.culoare}` });
      if (d.aspect === 'text-imagine') c.append(titlu, h('div', { class: 'pp-coloane' }, corp, fig));
      else if (d.aspect === 'imagine') c.append(titlu, fig, corp);
      else c.append(titlu, corp);
      umple(canvas, h('div', { class: `deck tema-${p.tema}${p.raport === '4:3' ? ' raport-43' : ''} pp-editor` },
        h('div', { class: 'deck-stage' }, h('section', { class: `slide ${D.clasaAspect(d)}`, 'aria-label': `Diapozitivul ${sel + 1}` }, c))));
      note.value = d.note;
      aplicaZoom();
    }
    // Previzualizarea efectelor direct pe diapozitivul editat.
    function previzualizeazaTranzitie() {
      const s = canvas.querySelector('.slide');
      const t = cur().tranzitie;
      if (!s || t === 'niciuna') return;
      s.classList.remove(`tr-${t}`);
      void s.offsetWidth;
      s.classList.add(`tr-${t}`);
      setTimeout(() => s.classList.remove(`tr-${t}`), 900);
    }
    function previzualizeazaAnimatie() {
      const a = cur().animatie;
      const el = [...canvas.querySelectorAll('.pp-corp > div')].filter((x) => x.textContent.trim());
      if (a === 'niciuna' || !el.length) return;
      el.forEach((x) => x.classList.add('pas-ascuns'));
      el.forEach((x, j) => setTimeout(() => {
        x.classList.remove('pas-ascuns');
        void x.offsetWidth;
        x.classList.add('pas-intra', `anim-${a}`);
        setTimeout(() => x.classList.remove('pas-intra', `anim-${a}`), 700);
      }, 350 + j * 550));
    }

    // ---- Note (sub diapozitiv) ----
    const note = h('textarea', { class: 'pp-note', placeholder: 'Faceți clic pentru a adăuga note', maxlength: D.LIMITE.note, 'aria-label': 'Note pentru prezentator' });
    note.addEventListener('input', () => { cur().note = note.value; schimbat({ tastare: true, miniaturi: false }); });

    // ---- Zoom ----
    const zoomEticheta = h('span', { class: 'pp-zoom-val' });
    const zoomSlider = h('input', { type: 'range', min: '30', max: '160', step: '10', 'aria-label': 'Panoramare' });
    zoomSlider.addEventListener('input', () => { zoom = Number(zoomSlider.value); aplicaZoom(); });
    function aplicaZoom() {
      const raport = p.raport === '4:3' ? 4 / 3 : 16 / 9;
      const lat = canvasZona.clientWidth - 48, inalt = canvasZona.clientHeight - 48;
      const potrivire = Math.max(200, Math.min(lat, inalt * raport));
      const w = zoom ? Math.round(potrivire * zoom / 100) : potrivire;
      canvas.style.width = `${w}px`;
      zoomSlider.value = String(zoom || 100);
      zoomEticheta.textContent = zoom ? `${zoom}%` : 'Potrivire';
    }
    new ResizeObserver(() => aplicaZoom()).observe(canvasZona);

    // ---- Vederi: Normal / Sortare diapozitive ----
    const sortare = h('ol', { class: 'pp-sortare', 'aria-label': 'Sortare diapozitive' });
    const zonaNote = h('div', { class: 'pp-zona-note' }, note);
    const centru = h('div', { class: 'pp-centru' }, canvasZona, zonaNote);
    const corpEditor = h('div', { class: 'pp-corp-editor' }, h('aside', { class: 'pp-panou' }, listaMini), centru, sortare);
    function seteazaVedere(v) { vedere = v; deseneazaVedere(); deseneazaMiniaturi(); deseneazaPanglica(); actualizeazaStatus(); if (v === 'normal') aplicaZoom(); }
    function deseneazaVedere() {
      corpEditor.classList.toggle('vedere-sortare', vedere === 'sortare');
      zonaNote.hidden = !noteVizibile;
      requestAnimationFrame(aplicaZoom);
    }

    // ---- Bara de stare (jos) ----
    const statusText = h('span', {});
    const statusDesign = h('button', { class: 'pp-status-btn', type: 'button', onclick: () => { filaActiva = 'revizuire'; deseneazaFile(); deseneazaPanglica(); } });
    const btnVedere = (v, ico, t) => h('button', { class: 'pp-status-btn pp-vedere', type: 'button', title: t, 'aria-label': t, 'data-v': v, onclick: () => (v === 'expunere' ? porneste(sel) : seteazaVedere(v)) }, svg(ico));
    const btnNote = h('button', { class: 'pp-status-btn', type: 'button', onclick: () => { noteVizibile = !noteVizibile; deseneazaVedere(); actualizeazaStatus(); } }, svg('note'), 'Note');
    const vederi = [btnVedere('normal', 'normal', 'Normal'), btnVedere('sortare', 'sortare', 'Sortare diapozitive'), btnVedere('expunere', 'expunere', 'Expunere diapozitive')];
    const status = h('div', { class: 'pp-status' },
      statusText, h('span', { class: 'pp-status-sep' }, 'Română (România)'), statusDesign,
      h('span', { class: 'pp-spacer' }),
      btnNote, ...vederi,
      h('button', { class: 'pp-status-btn', type: 'button', 'aria-label': 'Micșorare', onclick: () => { zoom = Math.max(30, (zoom || 100) - 10); aplicaZoom(); } }, '−'),
      zoomSlider,
      h('button', { class: 'pp-status-btn', type: 'button', 'aria-label': 'Mărire', onclick: () => { zoom = Math.min(160, (zoom || 100) + 10); aplicaZoom(); } }, '+'),
      zoomEticheta,
      h('button', { class: 'pp-status-btn', type: 'button', title: 'Potrivire la fereastră', 'aria-label': 'Potrivire la fereastră', onclick: () => { zoom = 0; aplicaZoom(); } }, svg('expunere')));
    function actualizeazaStatus() {
      statusText.textContent = `Diapozitivul ${sel + 1} din ${p.diapozitive.length}`;
      const n = p.diapozitive.reduce((k, x, i) => k + D.sfaturi(x, i).length, 0);
      statusDesign.textContent = n ? `⚠ Design: ${n} ${n === 1 ? 'sfat' : 'sfaturi'}` : '✓ Design: în regulă';
      statusDesign.classList.toggle('atentie', n > 0);
      btnNote.setAttribute('aria-pressed', apasat(noteVizibile));
      for (const b of vederi) b.setAttribute('aria-pressed', apasat(b.dataset.v === vedere));
    }

    // ---- Fișier (ca vizualizarea Backstage din PowerPoint) ----
    function deschideFisier() {
      const inchideB = () => { bs.remove(); document.removeEventListener('keydown', esc); };
      const esc = (e) => { if (e.key === 'Escape') inchideB(); };
      const panou = h('div', { class: 'pp-bs-panou' });
      const sectiuni = {
        info: () => [h('h2', {}, 'Informații'),
          h('p', {}, h('b', {}, p.titlu)),
          h('p', { class: 'muted' }, `${p.diapozitive.length} diapozitive · ${p.raport} · tema ${NUME_TEME[p.tema]}`),
          h('p', { class: 'muted' }, eElev() ? 'Se salvează automat în contul tău. Profesorul o poate vedea.' : 'Se salvează automat în acest browser. Descarc-o ca să o poți deschide și pe alt calculator.')],
        nou: () => [h('h2', {}, 'Nou'), h('p', {}, h('a', { class: 'btn', href: '#/atelier' }, 'Alege un șablon'))],
        deschidere: () => [h('h2', {}, 'Deschidere'),
          h('p', {}, h('a', { class: 'btn ghost', href: '#/atelier' }, 'Prezentările mele (Recente)')),
          h('p', {}, h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
            try { const np = await alegeFisier(); location.hash = `#/atelier/${await store.salveaza(null, np)}`; inchideB(); } catch (e) { alert(e.message); }
          } }, 'Deschide un fișier de pe calculator'))],
        salvare: () => { salveazaAcum(); return [h('h2', {}, 'Salvare'), h('p', {}, eElev() ? 'Prezentarea a fost salvată în contul tău.' : 'Prezentarea a fost salvată în acest browser.'), h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => descarca(p) }, svg('descarca'), 'Salvare ca fișier (.json)'))]; },
        imprimare: () => [h('h2', {}, 'Imprimare'),
          h('p', { class: 'muted' }, 'Fiecare diapozitiv pe o pagină. Din fereastra de imprimare poți alege și „Salvare ca PDF”.'),
          h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => { inchideB(); tipareste(p, false); } }, svg('tipareste'), 'Imprimare diapozitive')),
          h('p', {}, h('button', { class: 'btn ghost', type: 'button', onclick: () => { inchideB(); tipareste(p, true); } }, 'Imprimare cu notele vorbitorului'))],
        export: () => [h('h2', {}, 'Export'), h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => descarca(p) }, svg('descarca'), 'Descarcă prezentarea (.json)')),
          h('p', { class: 'muted' }, 'Fișierul se poate deschide din nou în Atelier, pe orice calculator.')],
      };
      const meniuBs = h('nav', { class: 'pp-bs-meniu' },
        h('button', { class: 'pp-bs-inapoi', type: 'button', onclick: inchideB, 'aria-label': 'Înapoi la prezentare' }, '←'),
        [['info', 'Informații'], ['nou', 'Nou'], ['deschidere', 'Deschidere'], ['salvare', 'Salvare'], ['imprimare', 'Imprimare'], ['export', 'Export']].map(([k, v]) =>
          h('button', { type: 'button', 'data-k': k, onclick: (e) => {
            meniuBs.querySelectorAll('[data-k]').forEach((b) => b.removeAttribute('aria-current'));
            e.currentTarget.setAttribute('aria-current', 'true');
            umple(panou, sectiuni[k]());
          } }, v)),
        h('a', { href: '#/atelier' }, 'Închidere'));
      const bs = h('div', { class: 'pp-backstage', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fișier' }, meniuBs, panou);
      document.body.append(bs);
      document.addEventListener('keydown', esc);
      meniuBs.querySelector('[data-k="info"]').click();
      meniuBs.querySelector('[data-k="info"]').focus();
    }

    // ---- Expunere ----
    function porneste(i) { salveazaAcum(); prezinta(p, i); }

    // ---- Comenzi rapide de la tastatură ----
    function scurtaturi(e) {
      if (document.querySelector('.atelier-over, .pp-backstage')) return;
      const inText = e.target.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (e.key === 'F5') { e.preventDefault(); porneste(e.shiftKey ? sel : 0); }
      else if (ctrl && k === 's') { e.preventDefault(); salveazaAcum(); }
      else if (ctrl && k === 'm') { e.preventDefault(); adauga('text'); }
      else if (ctrl && k === 'p') { e.preventDefault(); tipareste(p, false); }
      else if (ctrl && k === 'd' && !inText) { e.preventDefault(); dubleaza(); }
      else if (ctrl && (k === 'z' || k === 'y') && !inText) { e.preventDefault(); mergiIstoric(k === 'z' && !e.shiftKey ? -1 : 1); }
    }

    function deseneazaTot() { deseneazaFile(); deseneazaPanglica(); deseneazaMiniaturi(); deseneazaCanvas(); deseneazaVedere(); actualizeazaStatus(); actualizeazaIstoric(); }

    show(h('div', { class: 'pp-aplicatie' }, barTitlu, file, panglica, corpEditor, status, imgInput));
    deseneazaTot();
    requestAnimationFrame(aplicaZoom);
  } });

  // ---------- Profesorul vede o prezentare a unui elev ----------
  routes.push({ pattern: /^\/profesor\/clasa\/([\w-]+)\/elev\/([\w-]+)\/prezentare\/([\w-]+)$/, handler: async ([, cid, sid, pid]) => {
    if (sesiune()?.rol !== 'profesor') return void (location.hash = '#/intra');
    const r = await api('GET', `/api/profesor/elevi/${sid}/prezentari/${pid}`);
    const p = D.curata(r.prezentare).prezentare;
    show(h('div', { class: 'wrap narrow-page' },
      h('p', { class: 'crumbs' }, h('a', { href: `#/profesor/clasa/${cid}/elev/${sid}` }, '← Înapoi la elev')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Prezentare din Atelier'), h('h1', {}, p.titlu),
        h('p', { class: 'muted' }, `Modificată ${cand(r.actualizat_la)} · ${p.diapozitive.length} diapozitive`)),
      h('div', { class: 'row-actions' }, h('button', { class: 'btn small', type: 'button', onclick: () => prezinta(p, 0) }, '▶ Prezintă pe ecran complet')),
      h('div', { class: 'prose' }, D.render(D.dinAtelier(p), markdown))));
  } });
})();

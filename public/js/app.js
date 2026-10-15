'use strict';
// edudigi – site static: citește date/materiale.json (generat de scripts/build.js) și afișează paginile.
(() => {
  const main = document.getElementById('continut');
  const ROMAN = { 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
  const GRADES = [5, 6, 7, 8, 9, 10, 11, 12];

  // ---------- Iconițe (SVG static, de încredere) ----------
  const SVG = (inner, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICONS = {
    programare: SVG('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
    tic: SVG('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
    algoritmi: SVG('<path d="M6 20v-6M12 20V9M18 20V4"/>', '0 0 24 24').replace('stroke-width="2"', 'stroke-width="3.2"'),
    aplicatii: SVG('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
    arrow: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    search: SVG('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    menu: SVG('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    download: SVG('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    open: SVG('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    empty: SVG('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 9l2 2 4-4M8 15h8"/>'),
  };
  // Simbolul „d” cu circuit, din identitatea vizuală.
  const SYMBOL = (bg = '#F21F4B', fg = '#FFF7EE') => `<svg viewBox="0 0 100 120" aria-hidden="true">
    <rect x="68" y="4" width="22" height="112" rx="4" fill="${bg}"/><circle cx="50" cy="76" r="40" fill="${bg}"/>
    <g fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 76H49"/><path d="M16 61H31L41 51"/><path d="M16 91H31L41 101"/><circle cx="60" cy="76" r="9"/></g>
    <circle cx="47" cy="49" r="6.5" fill="${fg}"/><circle cx="47" cy="103" r="6.5" fill="${fg}"/></svg>`;
  const HERO_ART = `<svg viewBox="0 0 480 400" class="hero-art" aria-hidden="true">
    <path d="M300 60h120a12 12 0 0 1 12 12v40" fill="none" stroke="#F21F4B" stroke-width="5" stroke-linecap="round"/>
    <circle cx="432" cy="118" r="9" fill="#F21F4B"/>
    <rect x="236" y="96" width="200" height="190" rx="22" fill="#F1E9DF"/>
    <rect x="266" y="76" width="200" height="190" rx="22" fill="#FFFFFF" stroke="#E8DFD3" stroke-width="2"/>
    <rect x="300" y="130" width="130" height="10" rx="5" fill="#E2D8CB"/>
    <rect x="300" y="160" width="110" height="10" rx="5" fill="#E2D8CB"/>
    <rect x="300" y="190" width="80" height="10" rx="5" fill="#E2D8CB"/>
    <rect x="40" y="70" width="190" height="170" rx="24" fill="#3EC6E0"/>
    <text x="135" y="182" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="70" fill="#FFFFFF">{ }</text>
    <path d="M110 240v70a14 14 0 0 0 14 14h70" fill="none" stroke="#3EC6E0" stroke-width="5" stroke-linecap="round"/>
    <circle cx="110" cy="246" r="9" fill="#3EC6E0"/><circle cx="200" cy="324" r="9" fill="#3EC6E0"/>
    <rect x="300" y="250" width="140" height="130" rx="26" fill="#F21F4B"/>
    <g transform="translate(330 263) scale(.86)">
      <rect x="68" y="4" width="22" height="112" rx="4" fill="#FFF7EE"/><circle cx="50" cy="76" r="40" fill="#FFF7EE"/>
      <g fill="none" stroke="#F21F4B" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 76H49"/><path d="M16 61H31L41 51"/><path d="M16 91H31L41 101"/><circle cx="60" cy="76" r="9"/></g>
      <circle cx="47" cy="49" r="7" fill="#F21F4B"/><circle cx="47" cy="103" r="7" fill="#F21F4B"/></g></svg>`;
  // Grila cu linia de progres („direcție imagine”).
  function gridArt() {
    const fills = { '1,0': '#F21F4B', '7,0': '#3EC6E0', '1,1': '#171416', '3,1': '#F1E9DF', '4,1': '#F1E9DF', '9,1': '#F1E9DF', '0,3': '#3EC6E0', '5,3': '#3EC6E0', '8,3': '#F1E9DF', '3,4': '#F21F4B', '6,4': '#F1E9DF', '9,2': '#F1E9DF' };
    let cells = '';
    for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) {
      cells += `<rect x="${x * 48}" y="${y * 48}" width="48" height="48" fill="${fills[`${x},${y}`] || 'none'}" stroke="#E8DFD3"/>`;
    }
    return `<svg viewBox="0 0 480 240" class="tagline-art" aria-hidden="true">${cells}
      <polyline points="0,168 96,168 168,96 240,96 312,48 480,48" fill="none" stroke="#F21F4B" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="168" cy="96" r="9" fill="#fff" stroke="#F21F4B" stroke-width="4"/><circle cx="312" cy="48" r="9" fill="#fff" stroke="#F21F4B" stroke-width="4"/>
      <circle cx="400" cy="210" r="6" fill="#3EC6E0"/></svg>`;
  }

  // ---------- Utilitare DOM ----------
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v; // folosit doar pentru SVG-urile statice de mai sus
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const icon = (name, cls) => h('span', { class: cls, html: ICONS[name] });
  const show = (...nodes) => main.replaceChildren(...nodes.flat().filter((n) => n != null && n !== false));

  const clasaLabel = (arr) => (arr.length === 1 ? `Clasa a ${ROMAN[arr[0]]}-a` : `Clasele ${arr.map((c) => ROMAN[c]).join(', ')}`);
  const fileSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------- Date ----------
  let DATA = null;
  async function data() {
    if (!DATA) {
      const res = await fetch('/date/materiale.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Nu am putut încărca lista de materiale.');
      DATA = await res.json();
    }
    return DATA;
  }

  // ---------- Markdown sigur (totul se inserează ca text) ----------
  function safeUrl(url) {
    if (/^https?:\/\//i.test(url)) return url;
    if (/^[\w./%-]+$/.test(url) && !url.includes('..')) return '/' + url.replace(/^\/+/, '');
    return null;
  }
  function inline(text) {
    const out = [];
    const re = /(!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|(?<![\w*])\*[^*\s][^*]*\*(?![\w*])|(?<!\w)_[^_\s][^_]*_(?!\w))/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      out.push(text.slice(last, m.index));
      const t = m[0];
      let node = t;
      if (t.startsWith('![')) {
        const [, alt, url] = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(t);
        const u = safeUrl(url);
        node = u ? h('img', { src: u, alt, loading: 'lazy' }) : alt;
      } else if (t.startsWith('[')) {
        const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t);
        const u = safeUrl(url);
        node = u ? h('a', { href: u, ...(u.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }, label) : label;
      } else if (t.startsWith('**')) node = h('strong', {}, t.slice(2, -2));
      else if (t.startsWith('`')) node = h('code', {}, t.slice(1, -1));
      else node = h('em', {}, t.slice(1, -1));
      out.push(node);
      last = m.index + t.length;
    }
    out.push(text.slice(last));
    return out;
  }
  function markdown(src) {
    const root = h('div', { class: 'prose' });
    const lines = src.replace(/\r/g, '').split('\n');
    let para = [], list = null;
    const flush = () => {
      if (para.length) root.append(h('p', {}, inline(para.join(' '))));
      para = [];
      list = null;
    };
    const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('```')) {
        flush();
        const code = [];
        while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
        const type = EduInteractiv.typeOf(line.slice(3));
        if (type) root.append(EduInteractiv.render(EduInteractiv.parse(type, code.join('\n')), inline));
        else root.append(h('pre', {}, h('code', {}, code.join('\n'))));
      } else if (/^#{1,4} /.test(line)) {
        flush();
        const level = Math.max(2, Math.min(line.indexOf(' '), 4));
        root.append(h(`h${level}`, {}, inline(line.replace(/^#+ /, ''))));
      } else if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1] || '')) {
        flush();
        const head = cells(line);
        i++;
        const rows = [];
        while (i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1])) rows.push(cells(lines[++i]));
        root.append(h('div', { class: 'table-wrap' }, h('table', {},
          h('thead', {}, h('tr', {}, head.map((c) => h('th', {}, inline(c))))),
          h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, inline(c)))))))));
      } else if (/^>\s?/.test(line)) {
        flush();
        const q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
        i--;
        root.append(h('blockquote', {}, h('p', {}, inline(q.join(' ')))));
      } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
        flush();
        root.append(h('hr'));
      } else if (/^\s*([-*]|\d+\.) /.test(line)) {
        if (para.length) flush();
        const ordered = /^\s*\d+\./.test(line);
        if (!list || list.tagName !== (ordered ? 'OL' : 'UL')) {
          list = h(ordered ? 'ol' : 'ul');
          root.append(list);
        }
        list.append(h('li', {}, inline(line.replace(/^\s*([-*]|\d+\.) /, ''))));
      } else if (!line.trim()) {
        flush();
      } else {
        list = null;
        para.push(line.trim());
      }
    }
    flush();
    return root;
  }

  // ---------- Componente ----------
  function matCard(m, D) {
    return h('a', { class: 'mat-card', href: `#/m/${m.id}` },
      h('span', { class: `ico-box ${m.categorie}`, html: ICONS[m.categorie] }),
      h('div', {},
        h('h3', {}, m.titlu),
        m.descriere ? h('p', {}, m.descriere) : null,
        h('div', { class: 'meta' },
          h('span', { class: `tag ${m.categorie}` }, D.categorii[m.categorie]),
          h('span', { class: 'tag' }, clasaLabel(m.clasa)),
          h('span', { class: 'tag' }, D.tipuri[m.tip]),
          m.fisier ? h('span', { class: 'tag' }, m.fisier.ext.toUpperCase()) : null,
          m.aplicatii ? h('span', { class: 'tag interactiv' }, `${m.aplicatii} ${m.aplicatii === 1 ? 'aplicație' : 'aplicații'}`) : null)));
  }
  const CAT_DESC = { programare: 'Limbaje, proiecte, exerciții', tic: 'Calculatorul, internetul, siguranța', algoritmi: 'Gândire algoritmică, probleme', aplicatii: 'Text, prezentări, calcul tabelar' };
  function catCard(key, D) {
    const n = D.materiale.filter((m) => m.categorie === key).length;
    return h('a', { class: `cat-card ${key}`, href: `#/materiale?cat=${key}` },
      icon(key, 'ico'), icon('arrow', 'arrow'),
      h('h3', {}, D.categorii[key]),
      h('p', {}, CAT_DESC[key]),
      h('span', { class: 'count' }, `${n} ${n === 1 ? 'material' : 'materiale'}`));
  }
  function classGrid(D) {
    return [
      h('div', { class: 'class-grid' }, GRADES.map((g) => {
        const n = D.materiale.filter((m) => m.clasa.includes(g)).length;
        return h('a', { class: `class-card ${g <= 8 ? 'gimnaziu' : 'liceu'}`, href: `#/materiale?c=${g}`, 'aria-label': `Clasa a ${ROMAN[g]}-a, ${n} materiale` },
          h('b', {}, ROMAN[g]), h('span', {}, `${n} ${n === 1 ? 'material' : 'materiale'}`));
      })),
      h('div', { class: 'class-legend' },
        h('span', {}, h('i', { class: 'lg-g' }), 'Gimnaziu (V–VIII)'),
        h('span', {}, h('i', { class: 'lg-l' }), 'Liceu (IX–XII)')),
    ];
  }

  // ---------- Pagini ----------
  async function pageHome() {
    const D = await data();
    const recent = D.materiale.slice(0, 6);
    show(
      h('section', { class: 'hero' }, h('div', { class: 'wrap hero-grid' },
        h('div', {},
          h('p', { class: 'kicker' }, 'Informatică • TIC • Clasele V–XII'),
          h('h1', {}, 'Resurse gratuite pentru Informatică și TIC.'),
          h('p', { class: 'lead' }, 'Lecții, fișe de lucru, teste și prezentări pentru elevi și profesori. Fără cont, gata de folosit la clasă.'),
          h('div', { class: 'chips' },
            h('a', { class: 'chip red', href: '#/materiale?d=informatica' }, 'Informatică'),
            h('a', { class: 'chip', href: '#/materiale?d=tic' }, 'TIC'),
            h('a', { class: 'chip', href: '#/clase' }, 'Clasele V–XII'))),
        h('div', { html: HERO_ART }))),
      h('section', { class: 'tagline-band' }, h('div', { class: 'wrap tagline-grid' },
        h('p', { class: 'tagline' }, h('span', { class: 't1' }, 'Înveți.'), h('span', { class: 't2' }, 'Creezi.'), h('span', { class: 't3' }, 'Progresezi.')),
        h('div', { html: gridArt() }))),
      h('section', {}, h('div', { class: 'wrap' },
        h('div', { class: 'section-head' }, h('div', {}, h('p', { class: 'kicker' }, 'Domenii'), h('h2', {}, 'Ce vrei să înveți azi?'))),
        h('div', { class: 'cat-grid' }, Object.keys(D.categorii).map((k) => catCard(k, D))))),
      h('section', { id: 'clase' }, h('div', { class: 'wrap' },
        h('div', { class: 'section-head' }, h('div', {}, h('p', { class: 'kicker' }, 'Clase'), h('h2', {}, 'Alege clasa'))),
        classGrid(D))),
      h('section', {}, h('div', { class: 'wrap' },
        h('div', { class: 'section-head' },
          h('div', {}, h('p', { class: 'kicker' }, 'Noutăți'), h('h2', {}, 'Materiale recente')),
          h('a', { href: '#/materiale' }, 'Toate materialele →')),
        recent.length ? h('div', { class: 'mat-grid' }, recent.map((m) => matCard(m, D))) : emptyState('Primele materiale vor apărea aici în curând.'))),
    );
  }

  async function pageClase() {
    const D = await data();
    show(h('div', { class: 'wrap' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Clasele V–XII'), h('h1', {}, 'Alege clasa'),
        h('p', { class: 'muted' }, 'Toate materialele, grupate pe clase.')),
      h('section', {}, classGrid(D))));
  }

  function emptyState(text) {
    return h('div', { class: 'empty' }, h('span', { html: ICONS.empty }), h('h3', {}, 'Niciun material deocamdată'), h('p', { class: 'muted' }, text));
  }

  async function pageList(params) {
    const D = await data();
    const f = { d: params.get('d') || '', c: params.get('c') || '', cat: params.get('cat') || '', t: params.get('t') || '', q: params.get('q') || '' };
    const go = (patch) => {
      const next = { ...f, ...patch };
      const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v)).toString();
      location.hash = `#/materiale${qs ? '?' + qs : ''}`;
    };
    const words = norm(f.q).split(/\s+/).filter(Boolean);
    const list = D.materiale.filter((m) =>
      (!f.d || m.disciplina === f.d) &&
      (!f.c || m.clasa.includes(Number(f.c))) &&
      (!f.cat || m.categorie === f.cat) &&
      (!f.t || m.tip === f.t) &&
      words.every((w) => norm(`${m.titlu} ${m.descriere} ${D.categorii[m.categorie]} ${D.tipuri[m.tip]}`).includes(w)));

    const chipRow = (label, key, options) => h('div', { class: 'filter-row' },
      h('span', { class: 'kicker' }, label),
      h('button', { class: 'chip small', type: 'button', 'aria-pressed': String(!f[key]), onclick: () => go({ [key]: '' }) }, 'Toate'),
      options.map(([val, text]) => h('button', { class: 'chip small', type: 'button', 'aria-pressed': String(f[key] === val), onclick: () => go({ [key]: f[key] === val ? '' : val }) }, text)));

    let title = 'Toate materialele';
    if (f.d) title = D.discipline[f.d];
    if (f.cat) title = D.categorii[f.cat];
    if (f.c) title = `${f.d || f.cat ? title + ' · ' : ''}Clasa a ${ROMAN[f.c]}-a`;
    if (f.q) title = `Rezultate pentru „${f.q}”`;

    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Materiale'), h('h1', {}, title)),
      h('div', { class: 'filters' },
        chipRow('Disciplina', 'd', Object.entries(D.discipline)),
        chipRow('Clasa', 'c', GRADES.map((g) => [String(g), ROMAN[g]])),
        chipRow('Domeniu', 'cat', Object.entries(D.categorii)),
        chipRow('Tip', 't', Object.entries(D.tipuri))),
      h('p', { class: 'result-count', 'aria-live': 'polite' }, `${list.length} ${list.length === 1 ? 'material' : 'materiale'}`),
      list.length ? groupedList(list, D, Boolean(f.c))
        : emptyState(D.materiale.length ? 'Încearcă alte filtre sau alt cuvânt de căutare.' : 'Primele materiale vor apărea aici în curând.')));
  }

  // Lecția anterioară / următoare, după „ordine”, în aceeași clasă.
  function prevNext(m, D) {
    if (m.ordine == null) return null;
    const seq = D.materiale.filter((x) => x.ordine != null && x.clasa.includes(m.clasa[0])).sort((a, b) => a.ordine - b.ordine);
    const i = seq.findIndex((x) => x.id === m.id);
    const prev = seq[i - 1], next = seq[i + 1];
    if (!prev && !next) return null;
    return h('nav', { class: 'prev-next', 'aria-label': 'Lecții' },
      prev ? h('a', { class: 'pn prev', href: `#/m/${prev.id}` }, h('span', { class: 'kicker' }, '← Anterior'), h('b', {}, prev.titlu)) : h('span'),
      next ? h('a', { class: 'pn next', href: `#/m/${next.id}` }, h('span', { class: 'kicker' }, 'Următor →'), h('b', {}, next.titlu)) : h('span'));
  }

  // Când e aleasă o clasă, materialele cu „unitate” se grupează pe unități, în ordinea din manual.
  function groupedList(list, D, byUnit) {
    if (!byUnit || !list.some((m) => m.unitate)) return h('div', { class: 'mat-grid' }, list.map((m) => matCard(m, D)));
    const sorted = list.slice().sort((a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9) || a.titlu.localeCompare(b.titlu, 'ro'));
    const groups = new Map();
    for (const m of sorted) {
      const key = m.unitate || 'Alte materiale';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    return h('div', { class: 'unit-groups' }, [...groups].map(([name, items]) => h('section', { class: 'unit-group' },
      h('h2', {}, name, h('span', { class: 'unit-count' }, `${items.length} ${items.length === 1 ? 'material' : 'materiale'}`)),
      h('div', { class: 'mat-grid' }, items.map((m) => matCard(m, D))))));
  }

  async function pageMaterial(id) {
    const D = await data();
    const m = D.materiale.find((x) => x.id === id);
    if (!m) return pageNotFound();
    document.title = `${m.titlu} – edudigi`;
    let body = null;
    if (m.areContinut) {
      const res = await fetch(`/date/m/${encodeURIComponent(m.id)}.md`, { cache: 'no-cache' });
      body = res.ok ? markdown(await res.text()) : h('p', { class: 'muted' }, 'Conținutul nu a putut fi încărcat.');
    }
    const f = m.fisier;
    const fileUrl = f && `/${f.url}`;
    let preview = null;
    if (f && f.ext === 'pdf') preview = h('iframe', { class: 'preview', src: fileUrl, title: `Previzualizare: ${f.nume}` });
    else if (f && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(f.ext)) preview = h('img', { class: 'preview-img', src: fileUrl, alt: m.titlu });

    const related = D.materiale.filter((x) => x.id !== m.id && x.categorie === m.categorie && x.clasa.some((c) => m.clasa.includes(c))).slice(0, 5);
    show(h('div', { class: 'wrap' },
      h('nav', { class: 'crumbs', 'aria-label': 'Navigare' },
        h('a', { href: '#/' }, 'Acasă'), '/',
        h('a', { href: `#/materiale?d=${m.disciplina}` }, D.discipline[m.disciplina]), '/',
        h('a', { href: `#/materiale?c=${m.clasa[0]}` }, clasaLabel(m.clasa)),
        m.unitate ? ['/', h('span', {}, m.unitate)] : null),
      h('div', { class: 'mat-layout' },
        h('article', {},
          h('header', { class: 'mat-head' },
            h('div', { class: 'meta' },
              h('span', { class: `tag ${m.categorie}` }, D.categorii[m.categorie]),
              h('span', { class: 'tag' }, clasaLabel(m.clasa)),
              h('span', { class: 'tag' }, D.tipuri[m.tip])),
            h('h1', {}, m.titlu),
            m.descriere ? h('p', {}, m.descriere) : null),
          body ? h('div', { class: 'paper' }, body) : null,
          preview,
          prevNext(m, D)),
        h('aside', { class: 'aside' },
          m.aplicatii ? progressBox(m.aplicatii) : null,
          f ? h('div', { class: 'box' },
            h('h3', {}, 'Material de descărcat'),
            h('div', { class: 'file-card' }, h('span', { class: 'ext' }, f.ext), h('div', {}, h('b', {}, f.nume), h('span', {}, fileSize(f.marime)))),
            h('div', { class: 'file-actions' },
              h('a', { class: 'btn', href: fileUrl, download: f.nume }, h('span', { html: ICONS.download }), 'Descarcă'),
              h('a', { class: 'btn ghost', href: fileUrl, target: '_blank', rel: 'noopener' }, h('span', { html: ICONS.open }), 'Deschide'))) : null,
          related.length ? h('div', { class: 'box' }, h('h3', {}, 'Din același domeniu'),
            h('div', { class: 'related' }, related.map((r) => h('a', { href: `#/m/${r.id}` }, r.titlu)))) : null,
          h('a', { class: 'btn ghost', href: `#/materiale?c=${m.clasa[0]}` }, `Vezi toată clasa a ${ROMAN[m.clasa[0]]}-a`)))));
  }

  let onSolved = null; // setat de pagina curentă; un singur ascultător pentru tot site-ul
  main.addEventListener('activitate-rezolvata', () => onSolved && onSolved());

  // Caseta „Aplicații interactive”: numără aplicațiile rezolvate în pagina curentă.
  function progressBox(total) {
    let done = 0;
    const fill = h('span');
    const label = h('p', { class: 'muted', 'aria-live': 'polite' }, `0 din ${total} rezolvate`);
    const first = h('a', { class: 'btn small', href: '#', onclick: (e) => {
      e.preventDefault();
      const next = document.querySelector('.activity:not(.solved)') || document.querySelector('.activity');
      next?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      next?.querySelector('button, input')?.focus({ preventScroll: true });
    } }, 'Mergi la aplicații');
    const box = h('div', { class: 'box progress-box' }, h('h3', {}, 'Aplicații interactive'), h('div', { class: 'bar' }, fill), label, first);
    onSolved = () => {
      done = Math.min(total, done + 1);
      fill.style.width = `${(100 * done) / total}%`;
      label.textContent = done === total ? `Bravo! Ai rezolvat toate cele ${total} aplicații.` : `${done} din ${total} rezolvate`;
      first.textContent = done === total ? 'Revezi aplicațiile' : 'Următoarea aplicație';
    };
    fill.style.width = '0%';
    return box;
  }

  function pageNotFound() {
    show(h('div', { class: 'wrap' }, h('div', { class: 'page-head' }, h('h1', {}, 'Pagina nu există')),
      h('p', {}, h('a', { class: 'btn', href: '#/' }, 'Înapoi acasă'))));
  }

  // ---------- Router ----------
  async function render() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [pathPart, query] = raw.split('?');
    const params = new URLSearchParams(query || '');
    document.title = 'edudigi – Informatică și TIC, clasele V–XII';
    onSolved = null;
    for (const a of document.querySelectorAll('.main-nav a')) a.removeAttribute('aria-current');
    const navMatch = pathPart === '/clase' ? '#/clase' : pathPart === '/materiale' && params.get('d') ? `#/materiale?d=${params.get('d')}` : null;
    if (navMatch) document.querySelector(`.main-nav a[href="${navMatch}"]`)?.setAttribute('aria-current', 'page');
    document.getElementById('nav').classList.remove('open');
    document.querySelector('.menu-btn').setAttribute('aria-expanded', 'false');
    const q = document.getElementById('q');
    if (document.activeElement !== q) q.value = params.get('q') || '';
    try {
      let m;
      if (pathPart === '/' || pathPart === '') await pageHome();
      else if (pathPart === '/materiale') await pageList(params);
      else if (pathPart === '/clase') await pageClase();
      else if ((m = /^\/m\/([a-z0-9-]+)$/.exec(pathPart))) await pageMaterial(m[1]);
      else pageNotFound();
    } catch (e) {
      show(h('div', { class: 'wrap' }, h('div', { class: 'empty' }, h('h3', {}, 'Ceva n-a mers'), h('p', { class: 'muted' }, e.message))));
    }
    window.scrollTo(0, 0);
  }

  // ---------- Inițializare ----------
  for (const el of document.querySelectorAll('[data-logo]')) {
    el.replaceChildren('edu', h('span', { html: SYMBOL() }).firstChild, 'igi');
  }
  for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = ICONS[el.dataset.icon];
  document.querySelector('.menu-btn').addEventListener('click', (e) => {
    const nav = document.getElementById('nav');
    const open = nav.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.querySelector('[data-search]').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('q').value.trim();
    location.hash = q ? `#/materiale?q=${encodeURIComponent(q)}` : '#/materiale';
  });
  window.addEventListener('hashchange', render);
  render();
})();

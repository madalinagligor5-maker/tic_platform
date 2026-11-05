'use strict';
// Pagini statice pentru motoarele de căutare (Google nu citește adresele cu #/ ale aplicației):
//   public/lectii/index.html      toate clasele
//   public/lectii/clasa-<N>.html  materialele unei clase, pe unități
//   public/lectii/<id>.html       teoria fiecărui material + legătura spre varianta interactivă
//   public/sitemap.xml, public/robots.txt
// Adresa site-ului vine din SITE_URL (implicit https://edudigi.ro).
const fs = require('fs');
const path = require('path');

const ROMAN = { 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

// Markdown simplu → HTML. Blocurile interactive devin o invitație spre lecția interactivă.
function markdownHTML(src, interactiv, linkApp) {
  const out = [];
  const lines = src.replace(/\r/g, '').split('\n');
  let para = [], list = null, table = null;
  const flush = () => {
    if (para.length) {
      const txt = para.join(' ').trim();
      const fig = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(txt);
      if (fig) out.push(`<figure class="fig"><img src="/${esc(fig[2].replace(/^\/+/, ''))}" alt="${esc(fig[1])}" loading="lazy"><figcaption>${esc(fig[1])}</figcaption></figure>`);
      else out.push(`<p>${inline(txt)}</p>`);
    }
    para = [];
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`), (list = null);
    if (table) {
      const rows = table.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)).map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      out.push('<div class="table-wrap"><table>' + rows.map((r, i) => '<tr>' + r.map((c) => i ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join('') + '</tr>').join('') + '</table></div>');
      table = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^```\s*([\w-]*)/.exec(line);
    if (fence) {
      flush();
      const buf = [];
      for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) buf.push(lines[i]);
      if (interactiv.has(fence[1])) {
        const cer = (buf.find((l) => l.startsWith('# ')) || '').slice(2).trim();
        out.push(`<p class="static-act"><a href="${linkApp}">▶ Exercițiu interactiv${cer ? ': ' + esc(cer) : ''}</a></p>`);
      } else out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    let m;
    if (/^<!-- atlas-vizual:(start|end) -->$/.test(line)) { flush(); continue; }
    if (!line.trim()) { flush(); continue; }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) { flush(); const n = Math.min(m[1].length + 1, 4); out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if (/^\s*\|/.test(line)) { if (!table) flush(), (table = []); table.push(line); continue; }
    if ((m = /^>\s?(.*)$/.exec(line))) { flush(); out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`); continue; }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(line)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (para.length || table || (list && list.tag !== tag)) flush();
      if (!list) list = { tag, items: [] };
      list.items.push(m[1]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    if (list || table) flush();
    para.push(line);
  }
  flush();
  return out.join('\n');
}

function page({ site, url, title, desc, body, crumbs = [] }) {
  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${site}${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${site}${url}">
  <meta property="og:locale" content="ro_RO">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="static-page">
  <header class="site-header"><div class="wrap header-row"><a class="logo-word" href="/">edudigi</a><nav class="static-nav"><a href="/lectii/">Toate lecțiile</a><a href="/">Aplicația</a></nav></div></header>
  <main class="wrap static-main">
    ${crumbs.length ? `<nav class="crumbs" aria-label="Cale">${crumbs.map(([t, u]) => u ? `<a href="${u}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join(' / ')}</nav>` : ''}
    ${body}
  </main>
  <footer class="site-footer"><div class="wrap footer-row"><span class="logo-word small">edudigi</span><p class="kicker">Informatică • TIC • Clasele V–XII</p><p class="muted">Resurse gratuite pentru elevi și profesori.</p></div></footer>
</body>
</html>
`;
}

function generate({ out, materials, bodies, discipline, tipuri, interactiv, site = process.env.SITE_URL || 'https://edudigi.ro' }) {
  site = site.replace(/\/+$/, '');
  const dir = path.join(out, 'lectii');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const urls = [{ loc: '/', pri: '1.0' }, { loc: '/lectii/', pri: '0.9' }];
  const clase = [...new Set(materials.flatMap((m) => m.clasa))].sort((a, b) => a - b);
  const ord = (a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9) || a.titlu.localeCompare(b.titlu, 'ro');

  for (const m of materials) {
    const url = `/lectii/${m.id}.html`;
    const app = `/#/m/${m.id}`;
    const cl = m.clasa[0];
    const body = bodies[m.id] ? markdownHTML(bodies[m.id], interactiv, app) : '';
    const titlu = `${m.titlu} – ${discipline[m.disciplina]}, clasa a ${ROMAN[cl]}-a | edudigi`;
    fs.writeFileSync(path.join(dir, `${m.id}.html`), page({
      site, url, title: titlu, desc: m.descriere || m.titlu,
      crumbs: [['Lecții', '/lectii/'], [`Clasa a ${ROMAN[cl]}-a`, `/lectii/clasa-${cl}.html`], [m.titlu]],
      body: `<article class="paper"><header class="mat-head"><p class="kicker">${esc(discipline[m.disciplina])} · ${esc(tipuri[m.tip])}${m.unitate ? ' · ' + esc(m.unitate) : ''}</p><h1>${esc(m.titlu)}</h1>${m.descriere ? `<p>${esc(m.descriere)}</p>` : ''}
        <p><a class="btn" href="${app}">Deschide varianta interactivă</a></p></header>
        <div class="prose">${body}</div>
        <p class="static-cta"><a class="btn" href="${app}">Rezolvă exercițiile pe edudigi</a></p></article>`,
    }));
    urls.push({ loc: url, mod: m.data, pri: '0.7' });
  }

  for (const c of clase) {
    const list = materials.filter((m) => m.clasa.includes(c)).sort(ord);
    const unit = new Map();
    for (const m of list) { const k = m.unitate || 'Alte materiale'; if (!unit.has(k)) unit.set(k, []); unit.get(k).push(m); }
    const url = `/lectii/clasa-${c}.html`;
    fs.writeFileSync(path.join(dir, `clasa-${c}.html`), page({
      site, url, title: `Informatică și TIC, clasa a ${ROMAN[c]}-a – lecții, exerciții și teste | edudigi`,
      desc: `Lecții gratuite de Informatică și TIC pentru clasa a ${ROMAN[c]}-a, cu exerciții interactive, teste și imagini, conform programei.`,
      crumbs: [['Lecții', '/lectii/'], [`Clasa a ${ROMAN[c]}-a`]],
      body: `<h1>Informatică și TIC – clasa a ${ROMAN[c]}-a</h1>` + [...unit].map(([u, ms]) =>
        `<section class="static-unit"><h2>${esc(u)}</h2><ul>${ms.map((m) => `<li><a href="/lectii/${m.id}.html">${esc(m.titlu)}</a> <span class="muted">· ${esc(tipuri[m.tip])}</span></li>`).join('')}</ul></section>`).join(''),
    }));
    urls.push({ loc: url, pri: '0.8' });
  }

  fs.writeFileSync(path.join(dir, 'index.html'), page({
    site, url: '/lectii/', title: 'Lecții de Informatică și TIC, clasele V–XII | edudigi',
    desc: 'Toate lecțiile gratuite de Informatică și TIC de pe edudigi, grupate pe clase.',
    crumbs: [['Lecții']],
    body: `<h1>Lecții de Informatică și TIC</h1><ul class="static-clase">${clase.map((c) => `<li><a href="/lectii/clasa-${c}.html">Clasa a ${ROMAN[c]}-a</a> <span class="muted">· ${materials.filter((m) => m.clasa.includes(c)).length} materiale</span></li>`).join('')}</ul>`,
  }));

  const azi = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${site}${u.loc}</loc><lastmod>${/^\d{4}-\d{2}-\d{2}$/.test(u.mod || '') ? u.mod : azi}</lastmod><priority>${u.pri}</priority></url>`).join('\n') + '\n</urlset>\n');
  fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);
  return urls.length;
}

module.exports = { generate, markdownHTML };

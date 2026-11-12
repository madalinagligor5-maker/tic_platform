'use strict';
// Pagini statice pentru motoarele de căutare (Google nu citește adresele cu #/ ale aplicației):
//   public/lectii/index.html      toate clasele
//   public/lectii/clasa-<N>.html  materialele unei clase, pe unități
//   public/lectii/<id>.html       teoria fiecărui material + legătura spre varianta interactivă
//   public/sitemap.xml (cu imagini), public/robots.txt (inclusiv roboții AI), public/llms.txt (rezumat pentru asistenții AI)
// Fiecare pagină are date structurate schema.org (JSON-LD), întrebări și răspunsuri și un rezumat la început (AEO).
// Adresa site-ului vine din SITE_URL (implicit https://www.edudigi.ro).
const fs = require('fs');
const { extract } = require('../public/js/interactive');
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

const NUME = 'edudigi';
const OG = '/img/og.png';
const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const plain = (s) => String(s || '').replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();

// Secțiunea „## Pe scurt” a lecției, ca rezumat pus la început.
function peScurt(md) {
  const m = /^##\s+Pe scurt\s*\n([\s\S]*?)(?=\n##\s|\n```|$)/m.exec(md || '');
  return m ? plain(m[1]) : '';
}
const competente = (md) => ((/Competențe specifice \(Anexa 15\):\*\*\s*(.+)$/m.exec(md || '') || [])[1] || '').split(',').map((x) => x.trim()).filter(Boolean);

// Întrebări și răspunsuri din exercițiile grilă și adevărat/fals ale lecției (pentru motoarele de răspuns).
function intrebari(md, max = 6) {
  const out = [];
  let acts = [];
  try { acts = extract(md || ''); } catch { return out; }
  for (const a of acts) {
    if (a.type === 'quiz') for (const q of a.data.questions || []) {
      const ok = (q.options || []).filter((o) => o.correct).map((o) => plain(o.text));
      if (q.q && ok.length) out.push({ q: plain(q.q), a: (ok.length > 1 ? 'Răspunsurile corecte: ' : '') + ok.join('; ') + (q.explain ? '. ' + plain(q.explain) : '') });
    }
    if (a.type === 'adevarat-fals') for (const it of a.data.items || []) {
      if (it.text) out.push({ q: `Adevărat sau fals: ${plain(it.text)}`, a: (it.answer ? 'Adevărat.' : 'Fals.') + (it.explain ? ' ' + plain(it.explain) : '') });
    }
  }
  return out.slice(0, max);
}

function page({ site, url, title, desc, body, crumbs = [], ld = [], type = 'article' }) {
  const bc = crumbs.length ? [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['edudigi', '/'], ...crumbs].map(([t, u], i) => ({ '@type': 'ListItem', position: i + 1, name: t, ...(u || i === crumbs.length ? { item: site + (u || url) } : {}) })) }] : [];
  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${site}${url}">
  <meta property="og:site_name" content="${NUME}">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${site}${url}">
  <meta property="og:image" content="${site}${OG}">
  <meta property="og:locale" content="ro_RO">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/fonts.css">
  <link rel="stylesheet" href="/css/style.css">
  ${[...ld, ...bc].map(jsonld).join('\n  ')}
</head>
<body class="static-page">
  <header class="site-header"><div class="wrap header-row"><a class="logo-word" href="/">edudigi</a><nav class="static-nav"><a href="/lectii/">Toate lecțiile</a><a href="/">Aplicația</a></nav></div></header>
  <main class="wrap static-main">
    ${crumbs.length ? `<nav class="crumbs" aria-label="Cale">${crumbs.map(([t, u]) => u ? `<a href="${u}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join(' / ')}</nav>` : ''}
    ${body}
  </main>
  <footer class="site-footer"><div class="wrap footer-row"><span class="logo-word small">edudigi</span><p class="kicker">Informatică • TIC • Clasele V–VIII</p><p class="muted">Resurse gratuite pentru elevi și profesori, conform programei școlare și standardelor de evaluare. <a href="#" data-cookie-setari>Statistici (cookie-uri)</a></p></div></footer>
  <script src="/js/analytics.js"></script>
</body>
</html>
`;
}

function generate({ out, materials, bodies, discipline, tipuri, interactiv, site = process.env.SITE_URL || 'https://www.edudigi.ro' }) {
  // Domeniul fără www redirecționează permanent: nu îl propunem ca URL canonic,
  // nici dacă o configurare SITE_URL mai veche îl specifică încă.
  site = site.replace(/\/+$/, '').replace(/^https?:\/\/(?:www\.)?edudigi\.ro$/i, 'https://www.edudigi.ro');
  const dir = path.join(out, 'lectii');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const urls = [{ loc: '/', pri: '1.0' }, { loc: '/lectii/', pri: '0.9' }];
  const clase = [...new Set(materials.flatMap((m) => m.clasa))].sort((a, b) => a - b);
  const ord = (a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9) || a.titlu.localeCompare(b.titlu, 'ro');
  const editor = { '@type': 'Organization', name: NUME, url: site + '/' };
  const imgUrl = (src) => site + '/' + String(src).replace(/^\/+/, '');

  for (const m of materials) {
    const url = `/lectii/${m.id}.html`;
    const app = `/#/m/${m.id}`;
    const cl = m.clasa[0];
    const md = bodies[m.id] || '';
    const body = md ? markdownHTML(md, interactiv, app) : '';
    const rez = peScurt(md);
    const cs = competente(md);
    const qa = m.tip === 'test' ? [] : intrebari(md);
    const titlu = `${m.titlu} – ${discipline[m.disciplina]}, clasa a ${ROMAN[cl]}-a | edudigi`;
    const ld = [{
      '@context': 'https://schema.org', '@type': 'LearningResource', name: m.titlu, description: m.descriere || rez || m.titlu,
      url: site + url, inLanguage: 'ro', isAccessibleForFree: true, learningResourceType: tipuri[m.tip],
      educationalLevel: `Clasa a ${ROMAN[cl]}-a (gimnaziu)`, about: discipline[m.disciplina] === 'TIC' ? 'Tehnologia informației și a comunicațiilor' : 'Informatică',
      ...(m.unitate ? { isPartOf: { '@type': 'Course', name: `Informatică și TIC, clasa a ${ROMAN[cl]}-a`, url: `${site}/lectii/clasa-${cl}.html` } } : {}),
      ...(cs.length ? { educationalAlignment: cs.map((c) => ({ '@type': 'AlignmentObject', alignmentType: 'teaches', educationalFramework: 'Programa școlară Informatică și TIC, gimnaziu (OMEN 3393/2017) – standarde de evaluare, Anexa 15', targetName: `${c}, clasa a ${ROMAN[cl]}-a` })) } : {}),
      ...(m.imagini?.length ? { image: m.imagini.slice(0, 5).map((i) => imgUrl(i.src)) } : { image: site + OG }),
      ...(m.data ? { dateModified: m.data } : {}), publisher: editor, provider: editor,
    }];
    if (qa.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });
    fs.writeFileSync(path.join(dir, `${m.id}.html`), page({
      site, url, title: titlu, desc: m.descriere || rez || m.titlu, ld,
      crumbs: [['Lecții', '/lectii/'], [`Clasa a ${ROMAN[cl]}-a`, `/lectii/clasa-${cl}.html`], [m.titlu]],
      body: `<article class="paper"><header class="mat-head"><p class="kicker">${esc(discipline[m.disciplina])} · ${esc(tipuri[m.tip])} · Clasa a ${ROMAN[cl]}-a${m.unitate ? ' · ' + esc(m.unitate) : ''}</p><h1>${esc(m.titlu)}</h1>${m.descriere ? `<p>${esc(m.descriere)}</p>` : ''}
        ${rez ? `<div class="static-tldr"><b>Pe scurt:</b> ${esc(rez)}</div>` : ''}
        <p><a class="btn" href="${app}">Deschide varianta interactivă</a></p></header>
        <div class="prose">${body}</div>
        ${qa.length ? `<section class="static-faq"><h2>Întrebări și răspunsuri</h2>${qa.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</section>` : ''}
        <p class="static-cta"><a class="btn" href="${app}">Rezolvă exercițiile pe edudigi</a></p>
        ${m.data ? `<p class="muted small">Actualizat: <time datetime="${esc(m.data)}">${esc(m.data.split('-').reverse().join('.'))}</time></p>` : ''}</article>`,
    }));
    urls.push({ loc: url, mod: m.data, pri: m.tip === 'lectie' ? '0.8' : '0.6', img: (m.imagini || []).map((i) => ({ loc: imgUrl(i.src), title: i.alt })) });
  }

  const unitati = {};
  for (const c of clase) {
    const list = materials.filter((m) => m.clasa.includes(c)).sort(ord);
    const unit = new Map();
    for (const m of list) { const k = m.unitate || 'Alte materiale'; if (!unit.has(k)) unit.set(k, []); unit.get(k).push(m); }
    unitati[c] = unit;
    const url = `/lectii/clasa-${c}.html`;
    const numeU = [...unit.keys()].filter((u) => /^Unitatea/.test(u)).map((u) => u.replace(/^Unitatea \d+ · /, ''));
    const raspuns = `La Informatică și TIC, în clasa a ${ROMAN[c]}-a, elevii parcurg ${numeU.length} unități de învățare: ${numeU.join('; ')}. Pe edudigi fiecare unitate are lecții cu teorie, imagini și exerciții interactive, plus recapitulare și test.`;
    const ld = [
      { '@context': 'https://schema.org', '@type': 'Course', name: `Informatică și TIC – clasa a ${ROMAN[c]}-a`, description: raspuns, url: site + url, inLanguage: 'ro', isAccessibleForFree: true, educationalLevel: `Clasa a ${ROMAN[c]}-a`, provider: editor,
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'PT1H' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'RON', category: 'Free' } },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: `Lecții – clasa a ${ROMAN[c]}-a`, itemListElement: list.map((m, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site}/lectii/${m.id}.html`, name: m.titlu })) },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: `Ce se învață la Informatică și TIC în clasa a ${ROMAN[c]}-a?`, acceptedAnswer: { '@type': 'Answer', text: raspuns } }] },
    ];
    fs.writeFileSync(path.join(dir, `clasa-${c}.html`), page({
      site, url, ld, title: `Informatică și TIC, clasa a ${ROMAN[c]}-a – lecții, exerciții și teste | edudigi`,
      desc: `Lecții gratuite de Informatică și TIC pentru clasa a ${ROMAN[c]}-a, conform programei: ${numeU.slice(0, 4).join(', ')}. Exerciții interactive, imagini și teste.`,
      crumbs: [['Lecții', '/lectii/'], [`Clasa a ${ROMAN[c]}-a`]],
      body: `<h1>Informatică și TIC – clasa a ${ROMAN[c]}-a</h1><div class="static-tldr"><b>Ce se învață:</b> ${esc(raspuns)}</div>` + [...unit].map(([u, ms]) =>
        `<section class="static-unit"><h2>${esc(u)}</h2><ul>${ms.map((m) => `<li><a href="/lectii/${m.id}.html">${esc(m.titlu)}</a> <span class="muted">· ${esc(tipuri[m.tip])}</span>${m.descriere ? `<br><span class="muted small">${esc(m.descriere)}</span>` : ''}</li>`).join('')}</ul></section>`).join(''),
    }));
    urls.push({ loc: url, pri: '0.9' });
  }

  const despre = 'edudigi este o platformă educațională gratuită, în limba română, pentru disciplina Informatică și TIC la gimnaziu (clasele V–VIII): lecții conforme cu programa școlară și cu standardele naționale de evaluare, imagini explicative, exerciții interactive corectate pe loc, teste pe unități lansate de profesor, un laborator cu procesor de text și foaie de calcul în browser și conturi pentru clase.';
  fs.writeFileSync(path.join(dir, 'index.html'), page({
    site, url: '/lectii/', title: 'Lecții de Informatică și TIC, clasele V–VIII | edudigi',
    desc: 'Toate lecțiile gratuite de Informatică și TIC pentru gimnaziu, grupate pe clase și unități, conform programei școlare.',
    crumbs: [['Lecții']], type: 'website',
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Lecții de Informatică și TIC, clasele V–VIII', url: site + '/lectii/', inLanguage: 'ro', description: despre, publisher: editor }],
    body: `<h1>Lecții de Informatică și TIC</h1><p>${esc(despre)}</p><ul class="static-clase">${clase.map((c) => `<li><a href="/lectii/clasa-${c}.html">Clasa a ${ROMAN[c]}-a</a> <span class="muted">· ${materials.filter((m) => m.clasa.includes(c)).length} materiale</span></li>`).join('')}</ul>`,
  }));

  // Harta site-ului, cu imaginile lecțiilor (Google Imagini).
  const azi = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    urls.map((u) => `  <url><loc>${site}${u.loc}</loc><lastmod>${/^\d{4}-\d{2}-\d{2}$/.test(u.mod || '') ? u.mod : azi}</lastmod><priority>${u.pri}</priority>${(u.img || []).map((i) => `<image:image><image:loc>${esc(i.loc)}</image:loc></image:image>`).join('')}</url>`).join('\n') + '\n</urlset>\n');

  // Roboții motoarelor de căutare și ai asistenților AI sunt bineveniți; API-ul nu se indexează.
  const roboti = ['Googlebot', 'Bingbot', 'Google-Extended', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'Applebot-Extended', 'CCBot', 'meta-externalagent'];
  fs.writeFileSync(path.join(out, 'robots.txt'), roboti.map((r) => `User-agent: ${r}\nAllow: /\nDisallow: /api/\n`).join('\n') + `\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);

  // llms.txt: rezumatul site-ului pentru asistenții AI (https://llmstxt.org).
  const llms = [`# edudigi – Informatică și TIC, clasele V–VIII`, '', `> ${despre}`, '',
    'Toate materialele sunt gratuite și în limba română. Fiecare lecție are o variantă statică (text, imagini, întrebări și răspunsuri) la adresele de mai jos și o variantă interactivă în aplicație (https://www.edudigi.ro/#/m/<id>).', '',
    '## Pagini principale', '', `- [Toate lecțiile](${site}/lectii/): lista pe clase`, ...clase.map((c) => `- [Clasa a ${ROMAN[c]}-a](${site}/lectii/clasa-${c}.html): lecții, recapitulări și teste pe unități`), ''];
  for (const c of clase) {
    llms.push(`## Clasa a ${ROMAN[c]}-a`, '');
    for (const [u, ms] of unitati[c]) {
      llms.push(`### ${u}`, '');
      for (const m of ms) llms.push(`- [${m.titlu}](${site}/lectii/${m.id}.html)${m.descriere ? ': ' + plain(m.descriere) : ''}`);
      llms.push('');
    }
  }
  fs.writeFileSync(path.join(out, 'llms.txt'), llms.join('\n'));
  return urls.length;
}

module.exports = { generate, markdownHTML, intrebari, peScurt };

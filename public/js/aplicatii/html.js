'use strict';
// Editor de pagini web (HTML) pentru clasa a VIII-a: codul în stânga, pagina în dreapta.
// Proiecte cu mai multe pagini și imagini, păstrate în browser (IndexedDB, cu localStorage de rezervă).
// Previzualizarea NU rulează codul elevului: îl citește cu DOMParser, îl curăță și îl copiază într-un
// Shadow DOM; stilurile se aplică prin CSSOM (el.style.cssText, CSSStyleSheet), permise de CSP.
(() => {
  const EA = window.EduApp || {};
  const { h, show, routes } = EA;
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-html', ST = 'proiecte', LS = 'edudigi_html_proiecte', LS_CURENT = 'edudigi_html_curent', LS_PREF = 'edudigi_html_pref';
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
  const lsCiteste = (k, implicit) => { try { const v = localStorage.getItem(k); return v == null ? implicit : JSON.parse(v); } catch { return implicit; } };
  const lsScrie = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* plin sau blocat */ } };
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
  const areIDB = () => deschideDB().then(() => true, () => false);
  const store = {
    async toate() { return (await areIDB()) ? tx('readonly', (s) => s.getAll()) : lsCiteste(LS, []); },
    async get(id) { return (await areIDB()) ? tx('readonly', (s) => s.get(id)) : lsCiteste(LS, []).find((f) => f.id === id); },
    async put(f) {
      if (await areIDB()) return tx('readwrite', (s) => s.put(f));
      const a = lsCiteste(LS, []).filter((x) => x.id !== f.id); a.push(f);
      localStorage.setItem(LS, JSON.stringify(a)); // aruncă eroare dacă e plin
    },
    async del(id) { if (await areIDB()) return tx('readwrite', (s) => s.delete(id)); lsScrie(LS, lsCiteste(LS, []).filter((f) => f.id !== id)); },
  };
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  // ---------- Utilitare ----------
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const marime = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const octetiData = (d) => { const i = d.indexOf(','); return /;base64$/i.test(d.slice(0, i)) ? Math.floor((d.length - i - 1) * 3 / 4) : d.length - i - 1; };
  const LIMITA = 1.5 * 1024 * 1024; // mărimea maximă a lucrării trimise la sarcină
  const IMAGINE_MARE = 350 * 1024;
  const curataNume = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^a-z0-9._/-]/g, '').replace(/\/{2,}/g, '/').replace(/^[./-]+/, '').slice(0, 60);
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}, ${ora}`;
  };
  const VID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif' };
  const eImagine = (nume) => /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)$/i.test(nume);
  const eExtern = (u) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u.trim());
  function bytesLaBase64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function dataLaBytes(d) {
    const i = d.indexOf(',');
    if (/;base64$/i.test(d.slice(0, i))) { const b = atob(d.slice(i + 1)); const u = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return u; }
    return new TextEncoder().encode(decodeURIComponent(d.slice(i + 1)));
  }
  const citesteData = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
  function alegeFisiere(accept, multiple = true) {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept, hidden: true, ...(multiple ? { multiple: true } : {}) });
      inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
      document.body.append(inp);
      inp.click();
    });
  }
  function descarca(nume, blob) {
    const a = h('a', { href: URL.createObjectURL(blob), download: nume });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  // Micșorează o imagine (data: URL) la cel mult `max` pixeli pe latura mare, în același format.
  async function micsoreaza(date, max = 1024, calitate = 0.82) {
    if (/^data:image\/(svg|gif)/i.test(date)) return date;
    const img = new Image();
    img.src = date;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const tip = /^data:image\/png/i.test(date) ? 'image/png' : /^data:image\/webp/i.test(date) ? 'image/webp' : 'image/jpeg';
    const nou = c.toDataURL(tip, calitate);
    return nou.length < date.length ? nou : date;
  }
  async function dimensiuni(date) {
    try { const img = new Image(); img.src = date; await img.decode(); return [img.naturalWidth, img.naturalHeight]; } catch { return [0, 0]; }
  }

  // ---------- ZIP „store” (fără compresie) ----------
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  function scrieZip(fisiere) { // [{ nume, bytes: Uint8Array }]
    const enc = new TextEncoder(), parti = [], central = [];
    const d = new Date();
    const ora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const zi = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    let off = 0;
    for (const f of fisiere) {
      const nume = enc.encode(f.nume), crc = crc32(f.bytes), n = f.bytes.length;
      const loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true);
      loc.setUint16(10, ora, true); loc.setUint16(12, zi, true); loc.setUint32(14, crc, true); loc.setUint32(18, n, true); loc.setUint32(22, n, true);
      loc.setUint16(26, nume.length, true); loc.setUint16(28, 0, true);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true);
      cen.setUint16(12, ora, true); cen.setUint16(14, zi, true); cen.setUint32(16, crc, true); cen.setUint32(20, n, true); cen.setUint32(24, n, true);
      cen.setUint16(28, nume.length, true); cen.setUint32(42, off, true);
      parti.push(loc, nume, f.bytes);
      central.push(cen, nume);
      off += 30 + nume.length + n;
    }
    const lungC = central.reduce((s, x) => s + x.byteLength, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fisiere.length, true); fin.setUint16(10, fisiere.length, true);
    fin.setUint32(12, lungC, true); fin.setUint32(16, off, true);
    return new Blob([...parti, ...central, fin], { type: 'application/zip' });
  }
  async function citesteZip(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
    let e = buf.byteLength - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Fișierul nu este o arhivă .zip.');
    const nr = v.getUint16(e + 10, true);
    let p = v.getUint32(e + 16, true);
    const out = [];
    for (let k = 0; k < nr && v.getUint32(p, true) === 0x02014b50; k++) {
      const metoda = v.getUint16(p + 10, true), cs = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      const nume = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (nume.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(nume)) continue;
      const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
      const date = u8.subarray(start, start + cs);
      let bytes = null;
      if (metoda === 0) bytes = date;
      else if (metoda === 8 && 'DecompressionStream' in window) bytes = new Uint8Array(await new Response(new Blob([date]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      if (bytes) out.push({ nume, bytes });
    }
    return out;
  }

  // ---------- Desene pentru șabloane (SVG) ----------
  const svgData = (s) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  const DESENE = {
    'avatar.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="#E2F6FA"/><path d="M40 200c6-40 34-60 60-60s54 20 60 60z" fill="#F21F4B"/><circle cx="100" cy="86" r="44" fill="#F6C9A0"/><path d="M56 82c2-36 86-36 88 0-12-14-26-20-44-20s-32 6-44 20z" fill="#5A3A22"/><circle cx="84" cy="88" r="5" fill="#171416"/><circle cx="116" cy="88" r="5" fill="#171416"/><path d="M84 106q16 14 32 0" stroke="#171416" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    'oras.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180"><rect width="300" height="180" fill="#BFE8F5"/><circle cx="250" cy="40" r="22" fill="#F9C846"/><rect x="20" y="80" width="50" height="100" fill="#6B6460"/><rect x="80" y="50" width="40" height="130" fill="#14A39A"/><path d="M130 180V90l35-30 35 30v90z" fill="#F21F4B"/><rect x="210" y="100" width="70" height="80" fill="#F29A1F"/><g fill="#FFF7EE"><rect x="30" y="92" width="10" height="12"/><rect x="50" y="92" width="10" height="12"/><rect x="30" y="116" width="10" height="12"/><rect x="50" y="116" width="10" height="12"/><rect x="90" y="62" width="8" height="10"/><rect x="104" y="62" width="8" height="10"/><rect x="90" y="84" width="8" height="10"/><rect x="104" y="84" width="8" height="10"/><rect x="155" y="140" width="20" height="40"/><rect x="222" y="114" width="14" height="14"/><rect x="252" y="114" width="14" height="14"/></g><rect y="172" width="300" height="8" fill="#5B8C3A"/></svg>',
    'pelican.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#CDEFF7"/><rect y="130" width="300" height="70" fill="#3EC6E0"/><path d="M0 150q25-8 50 0t50 0 50 0 50 0 50 0 50 0" stroke="#fff" stroke-width="3" fill="none"/><ellipse cx="150" cy="128" rx="70" ry="30" fill="#fff"/><path d="M95 120q-20-10-30 8 25 4 40 2z" fill="#E8DFD3"/><path d="M185 118q8-60 30-72 20 0 18 18-8 4-18 32z" fill="#fff"/><circle cx="218" cy="58" r="4" fill="#171416"/><path d="M228 58l62 14-62 8z" fill="#F29A1F"/><path d="M228 68q22 28 52 8l-52 6z" fill="#F2B84B"/></svg>',
  };
  const img = (nume) => ({ nume, date: svgData(DESENE[nume]) });

  // ---------- Șabloane de pornire ----------
  const schelet = (titlu, corp, stilBody = '') => `<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="UTF-8">
    <title>${titlu}</title>
  </head>
  <body${stilBody ? ` style="${stilBody}"` : ''}>
${corp.replace(/^\n|\n$/g, '')}
  </body>
</html>
`;
  const SABLOANE = [
    { id: 'gol', nume: 'Pagină goală', desc: 'Doar scheletul: html, head, body', semn: '📄',
      pagini: [{ nume: 'index.html', cod: schelet('Pagina mea', `
    <h1>Pagina mea</h1>
    <p>Bun venit pe pagina mea!</p>`) }], imagini: [] },
    { id: 'despre', nume: 'Despre mine', desc: 'Două pagini legate: listă, imagine, tabel', semn: '🙂',
      pagini: [{ nume: 'index.html', cod: schelet('Despre mine', `
    <h1>Despre mine</h1>
    <p>Mă numesc <strong>Ana</strong> și sunt elevă în clasa a VIII-a.</p>
    <img src="avatar.svg" alt="Desenul unei fete care zâmbește" width="150">
    <h2>Ce îmi place</h2>
    <ul>
      <li>să citesc</li>
      <li>să desenez</li>
      <li>să joc baschet</li>
    </ul>
    <p style="text-align: center;"><a href="pasiuni.html">Vezi pasiunile mele</a></p>`, 'background-color: lightyellow;') },
      { nume: 'pasiuni.html', cod: schelet('Pasiunile mele', `
    <h1>Pasiunile mele</h1>
    <p>În timpul liber îmi place să <em>citesc</em> și să joc <strong>baschet</strong>.</p>
    <h2>Programul meu</h2>
    <table border="1">
      <tr>
        <th>Ziua</th>
        <th>Activitatea</th>
      </tr>
      <tr>
        <td>Luni</td>
        <td>antrenament de baschet</td>
      </tr>
      <tr>
        <td>Miercuri</td>
        <td>cercul de lectură</td>
      </tr>
    </table>
    <p><a href="index.html">Înapoi la prima pagină</a></p>`, 'background-color: lightyellow;') }],
      imagini: [img('avatar.svg')] },
    { id: 'oras', nume: 'Orașul meu', desc: 'Secțiuni cu h2, imagine, pagină cu tabel', semn: '🏙️',
      pagini: [{ nume: 'index.html', cod: schelet('Orașul meu', `
    <h1>Orașul meu</h1>
    <p>Scrie aici numele orașului tău și unde se află: în ce județ, lângă ce râu sau munte.</p>
    <img src="oras.svg" alt="Desen cu clădirile din centrul orașului" width="300">
    <h2>Istoria orașului</h2>
    <p>Când a fost atestat prima dată? Ce s-a întâmplat important aici?</p>
    <h2>Locuri de vizitat</h2>
    <ul>
      <li>un muzeu</li>
      <li>un parc</li>
      <li>o clădire veche</li>
    </ul>
    <h2>Oameni cunoscuți</h2>
    <p>Scrie despre o persoană cunoscută născută în orașul tău.</p>
    <p style="text-align: center;"><a href="obiective.html">Vezi tabelul cu obiective turistice</a></p>`, 'background-color: #EEF6FF;') },
      { nume: 'obiective.html', cod: schelet('Obiective turistice', `
    <h1>Obiective turistice</h1>
    <table border="1">
      <tr>
        <th>Obiectiv</th>
        <th>Ce poți vedea</th>
      </tr>
      <tr>
        <td>Muzeul orașului</td>
        <td>obiecte vechi și fotografii</td>
      </tr>
      <tr>
        <td>Parcul central</td>
        <td>alei, fântâni, un lac</td>
      </tr>
    </table>
    <p><a href="index.html">Înapoi la prima pagină</a></p>`, 'background-color: #EEF6FF;') }],
      imagini: [img('oras.svg')] },
    { id: 'animal', nume: 'Animalul preferat', desc: 'Titlu, paragrafe formatate, imagine de 300 px', semn: '🐦',
      pagini: [{ nume: 'index.html', cod: schelet('Animalul meu preferat', `
    <h1>Pelicanul</h1>
    <p>Animalul meu preferat este <strong>pelicanul</strong>. Trăiește în <em>Delta Dunării</em>, în sud-estul României.</p>
    <img src="pelican.svg" alt="Un pelican care plutește pe apă" width="300">
    <p style="color: green; text-align: center;">Pelicanul are un cioc lung, cu o pungă în care prinde peștii.</p>
    <p>Sursa imaginii: desen realizat de mine</p>`, 'background-color: lightyellow;') }],
      imagini: [img('pelican.svg')] },
  ];

  // ---------- Cititorul de cod (pentru colorare și sfaturi) ----------
  const BRUT = new Set(['script', 'style', 'textarea', 'title']);
  function scaneaza(s) {
    const tok = [], n = s.length;
    let i = 0;
    while (i < n) {
      const lt = s.indexOf('<', i);
      if (lt < 0) { tok.push({ tip: 'text', a: i, b: n }); break; }
      if (lt > i) tok.push({ tip: 'text', a: i, b: lt });
      i = lt;
      if (s.startsWith('<!--', i)) { const e = s.indexOf('-->', i + 4); const b = e < 0 ? n : e + 3; tok.push({ tip: 'com', a: i, b }); i = b; continue; }
      if (s[i + 1] === '!' || s[i + 1] === '?') { const e = s.indexOf('>', i); const b = e < 0 ? n : e + 1; tok.push({ tip: 'decl', a: i, b }); i = b; continue; }
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)/.exec(s.slice(i, i + 64));
      if (!m) { tok.push({ tip: 'text', a: i, b: i + 1 }); i++; continue; }
      const t = { tip: 'tag', a: i, inchis: !!m[1], nume: m[2].toLowerCase(), numeB: i + m[0].length, attrs: [], auto: false, fin: false, ghilimele: false };
      let j = t.numeB;
      while (j < n) {
        const c = s[j];
        if (c === '>') { j++; t.fin = true; break; }
        if (c === '<') break;
        if (/\s/.test(c)) { j++; continue; }
        if (c === '/') { j++; if (s[j] === '>') t.auto = true; continue; }
        const ma = /^[^\s=>/<]+/.exec(s.slice(j, j + 200));
        if (!ma) { j++; continue; }
        const at = { nume: ma[0].toLowerCase(), na: j, nb: j + ma[0].length, va: null, vb: null, val: '' };
        j = at.nb;
        let k = j;
        while (k < n && /\s/.test(s[k])) k++;
        if (s[k] === '=') {
          k++;
          while (k < n && /\s/.test(s[k])) k++;
          const q = s[k];
          at.va = k;
          if (q === '"' || q === "'") {
            const e = s.indexOf(q, k + 1);
            at.vb = e < 0 ? n : e + 1;
            at.val = s.slice(k + 1, e < 0 ? n : e);
            if (e < 0 || /[<>\n]/.test(at.val)) t.ghilimele = true;
          } else { const mv = /^[^\s>]*/.exec(s.slice(k, k + 2000)); at.vb = k + mv[0].length; at.val = mv[0]; }
          j = at.vb;
        }
        t.attrs.push(at);
      }
      t.b = j;
      tok.push(t);
      i = j;
      if (!t.inchis && t.fin && BRUT.has(t.nume)) {
        const re = new RegExp(`</${t.nume}(?=[\\s>/]|$)`, 'ig');
        re.lastIndex = i;
        const mm = re.exec(s);
        const e = mm ? mm.index : n;
        if (e > i) tok.push({ tip: 'raw', lang: t.nume, a: i, b: e });
        i = e;
      }
    }
    return tok;
  }
  const atr = (t, nume) => t.attrs.find((a) => a.nume === nume);

  // ---------- Colorarea sintaxei ----------
  const sp = (c, t) => (t ? `<span class="${c}">${esc(t)}</span>` : '');
  function evidDecl(t) {
    let o = '', last = 0, m;
    const re = /([a-zA-Z-]+)(\s*:\s*)([^;"'{}]*)/g;
    while ((m = re.exec(t))) { o += esc(t.slice(last, m.index)) + sp('c-pr', m[1]) + esc(m[2]) + sp('c-vl', m[3]); last = re.lastIndex; }
    return o + esc(t.slice(last));
  }
  function evidCss(t) {
    let o = '', i = 0, adanc = 0;
    const n = t.length;
    while (i < n) {
      if (t.startsWith('/*', i)) { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; o += sp('c-com', t.slice(i, e)); i = e; continue; }
      let e = t.slice(i).search(/[{}]|\/\*/);
      e = e < 0 ? n : i + e;
      o += adanc === 0 ? sp('c-sel', t.slice(i, e)) : evidDecl(t.slice(i, e));
      if (e < n && t[e] === '{') { o += '{'; adanc++; e++; } else if (e < n && t[e] === '}') { o += '}'; adanc = Math.max(0, adanc - 1); e++; }
      i = e;
    }
    return o;
  }
  function evidentiaza(s, tok) {
    let o = '';
    for (const t of tok) {
      const txt = s.slice(t.a, t.b);
      if (t.tip === 'text') o += esc(txt).replace(/&amp;(#?[a-zA-Z0-9]+;)/g, '<span class="c-ent">&amp;$1</span>');
      else if (t.tip === 'com') o += sp('c-com', txt);
      else if (t.tip === 'decl') o += sp('c-dt', txt);
      else if (t.tip === 'raw') o += t.lang === 'style' ? evidCss(txt) : esc(txt);
      else {
        let c = t.a + (t.inchis ? 2 : 1);
        o += sp('c-p', s.slice(t.a, c)) + sp('c-tag', s.slice(c, t.numeB));
        c = t.numeB;
        for (const at of t.attrs) {
          o += esc(s.slice(c, at.na)) + sp('c-at', s.slice(at.na, at.nb));
          c = at.nb;
          if (at.va != null) {
            o += sp('c-p', s.slice(c, at.va));
            const v = s.slice(at.va, at.vb);
            o += at.nume === 'style' ? `<span class="c-val">${evidDecl(v)}</span>` : sp('c-val', v);
            c = at.vb;
          }
        }
        o += sp('c-p', s.slice(c, t.b));
      }
    }
    return o;
  }

  // ---------- Sfaturi (validare simplă) ----------
  const CUNOSCUTE = new Set(('html head body title meta link style script noscript base h1 h2 h3 h4 h5 h6 p br hr img a ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col strong b em i u s small mark sub sup span div section article header footer nav main aside figure figcaption blockquote q cite code pre kbd abbr address time del ins label input button select option optgroup textarea form fieldset legend iframe video audio source track canvas svg math picture details summary dialog center font marquee big tt strike wbr map area object embed param data output progress meter template bdi bdo ruby rt rp dfn samp var search menu hgroup').split(' '));
  function distanta(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  const randuri = (s) => { const r = [0]; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) r.push(i + 1); return r; };
  function randDin(starts, p) { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= p) lo = mid; else hi = mid - 1; } return lo + 1; }
  function valideaza(s, tok, P) {
    const L = [], starts = randuri(s);
    const add = (nivel, poz, text) => { if (L.length < 40) L.push({ nivel, poz, rand: poz == null ? null : randDin(starts, poz), text }); };
    const stiva = [], necunoscute = new Set();
    let doctype = false, areHead = false, areBody = false, titlu = null, h1 = 0, corpDeschis = false, corpInchis = false, textAfara = false, script = false;
    const imagini = P.imagini || [], pagini = P.pagini || [];
    for (let k = 0; k < tok.length; k++) {
      const t = tok[k];
      if (t.tip === 'decl' && /^<!doctype\s+html/i.test(s.slice(t.a, t.b))) doctype = true;
      if (t.tip === 'text' && !textAfara && /\S/.test(s.slice(t.a, t.b)) && (!corpDeschis || corpInchis) && !stiva.some((x) => x.nume === 'head')) {
        textAfara = true;
        add('atentie', t.a + s.slice(t.a, t.b).search(/\S/), corpInchis ? 'Textul acesta este după </body>. Tot ce se vede pe pagină se scrie între <body> și </body>.' : 'Textul acesta este înainte de <body>. Tot ce se vede pe pagină se scrie între <body> și </body>.');
      }
      if (t.tip !== 'tag') continue;
      const r = (x) => randDin(starts, x);
      const inSvg = stiva.some((x) => x.nume === 'svg' || x.nume === 'math');
      if (!t.fin) add('eroare', t.a, `Eticheta <${t.nume}> nu se termină cu „>”.`);
      if (t.ghilimele) add('eroare', t.a, `Verifică ghilimelele din eticheta <${t.nume}>: o valoare începe cu " dar nu se închide pe același rând.`);
      if (!inSvg && !CUNOSCUTE.has(t.nume) && !necunoscute.has(t.nume)) {
        necunoscute.add(t.nume);
        const apropiat = [...CUNOSCUTE].map((x) => [x, distanta(t.nume, x)]).sort((a, b) => a[1] - b[1])[0];
        add('eroare', t.a, `<${t.nume}> nu este o etichetă HTML.${apropiat && apropiat[1] <= 2 ? ` Poate ai vrut să scrii <${apropiat[0]}>?` : ' Verifică dacă ai scris-o corect.'}`);
      }
      if (t.inchis) {
        if (VID.has(t.nume)) { add('eroare', t.a, `<${t.nume}> nu are etichetă de închidere: șterge </${t.nume}>.`); continue; }
        if (t.nume === 'body') corpInchis = true;
        let idx = -1;
        for (let q = stiva.length - 1; q >= 0; q--) if (stiva[q].nume === t.nume) { idx = q; break; }
        if (idx < 0) { add('eroare', t.a, `</${t.nume}> nu are pereche: înainte nu există niciun <${t.nume}> deschis.`); continue; }
        for (let q = stiva.length - 1; q > idx; q--) add('eroare', stiva[q].a, `<${stiva[q].nume}> (rândul ${r(stiva[q].a)}) nu este închisă înainte de </${t.nume}> (rândul ${r(t.a)}). Etichetele se închid în ordinea inversă deschiderii.`);
        stiva.length = idx;
        continue;
      }
      // eticheta de deschidere
      if (t.nume === 'head') areHead = true;
      if (t.nume === 'body') { areBody = true; corpDeschis = true; }
      if (t.nume === 'h1') h1++;
      if (t.nume === 'script') { script = true; add('sfat', t.a, 'Scripturile (<script>) nu rulează în acest editor: aici lucrăm doar cu HTML și CSS.'); }
      if (t.nume === 'title') titlu = tok[k + 1]?.tip === 'raw' ? s.slice(tok[k + 1].a, tok[k + 1].b).trim() : '';
      if (t.nume === 'img') {
        const src = atr(t, 'src'), alt = atr(t, 'alt');
        if (!src || !src.val.trim()) add('eroare', t.a, 'Imaginea nu are atributul src (numele fișierului imagine).');
        else {
          const v = src.val.trim().replace(/^\.\//, '');
          if (/^https?:|^\/\//i.test(v)) add('sfat', t.a, 'Imaginile de pe alte site-uri nu se afișează aici. Descarcă imaginea, încarc-o în proiect (panoul Imagini) și scrie doar numele ei.');
          else if (!/^data:/i.test(v) && !imagini.some((x) => x.nume === v)) {
            const aproape = imagini.find((x) => x.nume.toLowerCase() === v.toLowerCase());
            add('eroare', src.va, aproape ? `Fișierul se numește „${aproape.nume}”, nu „${v}”: contează literele mari și mici.` : `Fișierul „${v}” nu există în proiect. Verifică numele și extensia (.jpg, .png) sau încarcă imaginea în panoul Imagini.`);
          }
        }
        if (!alt) add('atentie', t.a, 'Imaginea nu are atributul alt (textul alternativ). Descrie imaginea: alt="…".');
        else if (!alt.val.trim()) add('sfat', t.a, 'Atributul alt este gol. Scrie o scurtă descriere a imaginii.');
      }
      if (t.nume === 'a') {
        const hr = atr(t, 'href');
        if (!hr) add('sfat', t.a, 'Linkul nu are atributul href (adresa spre care duce).');
        else {
          const v = hr.val.trim();
          if (v && !v.startsWith('#') && !eExtern(v)) {
            const f = decodeURIComponent(v.split('#')[0].replace(/^\.\//, ''));
            if (f && !pagini.some((x) => x.nume === f) && !imagini.some((x) => x.nume === f)) add('atentie', hr.va, `Linkul duce spre „${f}”, dar pagina aceasta nu există în proiect.`);
          }
        }
      }
      const st = atr(t, 'style');
      if (st && st.val.trim()) {
        const decl = st.val.split(';').map((x) => x.trim()).filter(Boolean);
        if (decl.some((d) => !d.includes(':'))) add('eroare', st.va, 'În style, proprietatea și valoarea se despart prin două puncte: style="color: blue;".');
        else if (decl.some((d) => (d.match(/:/g) || []).length > 1 && !/url\(|data:/i.test(d))) add('eroare', st.va, 'În style, proprietățile se despart prin punct și virgulă: style="color: green; text-align: center;".');
      }
      if (!VID.has(t.nume) && !t.auto && t.fin) stiva.push({ nume: t.nume, a: t.a });
    }
    for (const x of stiva) add('eroare', x.a, `<${x.nume}> (rândul ${randDin(starts, x.a)}) nu este închisă: lipsește </${x.nume}>.`);
    if (!areBody) add('eroare', null, 'Lipsește <body>: tot ce se vede pe pagină se scrie între <body> și </body>.');
    if (titlu == null) add('atentie', null, `Lipsește <title> din ${areHead ? '<head>' : 'antet (<head>)'}: titlul apare în fila browserului.`);
    else if (!titlu) add('atentie', null, 'Eticheta <title> este goală: scrie titlul care apare în fila browserului.');
    if (!doctype) add('sfat', null, 'Prima linie a paginii ar trebui să fie <!DOCTYPE html>.');
    if (h1 > 1) add('sfat', null, `Pagina are ${h1} titluri <h1>. Folosește un singur <h1>, apoi subtitluri <h2>.`);
    if (!h1 && areBody) add('sfat', null, 'Pagina nu are un titlu principal <h1>.');
    void script;
    const ordine = { eroare: 0, atentie: 1, sfat: 2 };
    return L.sort((a, b) => ordine[a.nivel] - ordine[b.nivel] || (a.rand || 0) - (b.rand || 0));
  }

  // ---------- Previzualizarea sigură (Shadow DOM + CSSOM) ----------
  const FARA = new Set(['ap-css', 'ap-js', 'script', 'noscript', 'template', 'link', 'meta', 'base', 'title', 'head', 'style', 'param', 'frameset', 'frame', 'portal', 'applet']);
  const EXTERNE = { iframe: 'Pagină externă (iframe)', video: 'Video', audio: 'Sunet', object: 'Obiect extern', embed: 'Obiect extern' };
  const RESURSE = new Set(['src', 'srcset', 'poster', 'background', 'data', 'action', 'formaction', 'ping', 'manifest', 'lowsrc', 'dynsrc', 'codebase', 'archive', 'longdesc', 'imagesrcset', 'srcdoc']);
  let BAZA = null;
  function foaieBaza() {
    if (BAZA) return BAZA;
    BAZA = new CSSStyleSheet();
    // Simulează stilurile implicite ale browserului pentru <html> și <body> (restul vin din stilul browserului).
    BAZA.replaceSync(`
      [data-ap-html] { all: initial; display: block; flex: 1 0 auto; color-scheme: light; font-family: 'Times New Roman', Times, serif; font-size: 16px; line-height: normal; color: #000; container-type: inline-size; }
      [data-ap-body] { display: block; margin: 8px; }
      :where(a[data-ap-href]) { color: #0000EE; text-decoration: underline; cursor: pointer; }
      :where(a[data-ap-href]:active) { color: #EE0000; }
      .ap-x-lipsa { display: inline-block; vertical-align: bottom; min-width: 16px; min-height: 16px; padding: 2px 4px 2px 20px; border: 1px dashed #b9b2aa; color: #555; font: 13px system-ui, sans-serif; position: relative; overflow: hidden; }
      .ap-x-lipsa::before { content: ''; position: absolute; left: 4px; top: 4px; width: 10px; height: 10px; border: 1.5px solid #999; border-radius: 2px; }
      .ap-x-ext { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; vertical-align: bottom; box-sizing: border-box; max-width: 100%; padding: 8px; background: repeating-linear-gradient(45deg, #f1ece6 0 10px, #e8e1d9 10px 20px); border: 1px solid #c9c0b6; color: #5b544f; font: 600 13px system-ui, sans-serif; text-align: center; }
      .ap-x-ext small { font-weight: 400; }
    `);
    return BAZA;
  }
  const normNume = (u) => { try { return decodeURIComponent(u.trim().replace(/^\.\//, '')); } catch { return u.trim(); } };
  function curataCss(css, gaseste) {
    return css.replace(/@import[^;]*;?/gi, '').replace(/@font-face\s*\{[^}]*\}/gi, '')
      .replace(/(-webkit-)?image-set\([^)]*\)/gi, 'none')
      .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, q, u) => {
        if (u.startsWith('#')) return m;
        const d = gaseste(u) || (/^data:image\//i.test(u) ? u : null);
        return d ? `url("${d.replace(/"/g, '%22')}")` : 'none';
      });
  }
  // @media (max-width…) devine @container, ca modul „telefon” să se comporte ca pe un ecran îngust.
  const mediaLaContainer = (css) => css.replace(/@media([^{;]*)\{/gi, (m, cond) => {
    const c = cond.trim().replace(/^only\s+/i, '').replace(/^(screen|all)\s+and\s+/i, '');
    return /^\(\s*(min-|max-)?width\s*:/i.test(c) && !/screen|print/i.test(c) ? `@container ${c} {` : m;
  });
  const RE_SEL = /(^|[\s>+~,(])(html|body|:root)(?![\w-])/gi;
  function rescrieSelectori(reguli) {
    for (const r of reguli) {
      if (r.selectorText != null) {
        const nou = r.selectorText.replace(RE_SEL, (m, p, x) => `${p}[data-ap-${x.toLowerCase() === 'body' ? 'body' : 'html'}]`);
        if (nou !== r.selectorText) r.selectorText = nou;
      }
      if (r.cssRules) rescrieSelectori(r.cssRules);
    }
  }

  // Documentele create cu DOMParser moștenesc CSP-ul paginii: atributele style și <style> ar fi raportate ca încălcări.
  // De aceea, înainte de parsare, style="…" devine data-ap-style="…", on…="…" se neutralizează,
  // iar conținutul <style> se scoate (îl aplicăm separat, prin CSSOM) și <script> se golește.
  function preproceseaza(cod) {
    const tk = scaneaza(cod), css = [];
    let out = '', c = 0;
    for (const t of tk) {
      if (t.tip === 'raw' && (t.lang === 'style' || t.lang === 'script')) {
        if (t.lang === 'style') css.push(cod.slice(t.a, t.b));
        out += cod.slice(c, t.a); c = t.b;
        continue;
      }
      if (t.tip !== 'tag') continue;
      if (t.nume === 'style' || t.nume === 'script') {
        out += `${cod.slice(c, t.a)}<${t.inchis ? '/' : ''}${t.nume === 'style' ? 'ap-css' : 'ap-js'}`;
        c = t.numeB;
      }
      for (const at of t.attrs) {
        const nou = at.nume === 'style' ? 'data-ap-style' : at.nume.startsWith('on') ? 'data-ap-x' : null;
        if (nou) { out += cod.slice(c, at.na) + nou; c = at.nb; }
      }
    }
    return { cod: out + cod.slice(c), css };
  }

  // Motorul de previzualizare: desenează codul unei pagini în `scroller`, fără să-l execute.
  function motorPreviz(scroller, { imagini, laLink }) {
    const gazda = h('div', { class: 'ap-html-gazda' });
    scroller.append(gazda);
    const root = gazda.attachShadow({ mode: 'open' });
    const gaseste = (u) => { const n = normNume(u); return imagini().find((x) => x.nume === n)?.date || null; };
    const valJs = (v) => /^(javascript|vbscript|livescript|data:text\/html)/.test(v.replace(/[\s\u0000-\u001f]/g, '').toLowerCase());
    const setAt = (el, at, v) => { try { if (at.namespaceURI) el.setAttributeNS(at.namespaceURI, at.name, v); else el.setAttribute(at.name, v); } catch { /* nume invalid */ } };

    function atribute(src, el, corp = false) {
      const tag = src.localName;
      for (const at of [...src.attributes]) {
        const nume = at.name.toLowerCase(), v = at.value;
        if (nume.startsWith('on') || nume === 'autofocus' || nume === 'is' || nume === 'nonce' || nume === 'target') continue;
        if (nume === 'data-ap-style') { el.style.cssText = curataCss(v, gaseste); continue; }
        if (nume.startsWith('data-ap-')) continue;
        if (valJs(v) && /href|src|action|data/.test(nume)) continue;
        if (nume === 'href' || nume === 'xlink:href') {
          if (tag === 'a' || tag === 'area') el.setAttribute('data-ap-href', v);
          else if (v.trim().startsWith('#')) setAt(el, at, v);
          else { const d = gaseste(v); if (d) setAt(el, at, d); }
          continue;
        }
        if (RESURSE.has(nume)) {
          if (nume === 'background') { const d = gaseste(v); if (d) el.style.backgroundImage = `url("${d}")`; }
          continue;
        }
        if (/url\(/i.test(v) && !/url\(\s*['"]?#/i.test(v)) continue;
        if (corp && nume === 'bgcolor') { el.style.backgroundColor = v; continue; }
        if (corp && nume === 'text') { el.style.color = v; continue; }
        setAt(el, at, v);
      }
    }
    function substituent(text, w, hgt, alt) {
      const el = h('span', { class: 'ap-x-ext', role: 'img', 'aria-label': alt || text }, text, alt ? h('small', {}, alt) : null);
      el.style.width = `${w}px`;
      el.style.height = `${hgt}px`;
      return el;
    }
    function imagine(n) {
      const src = (n.getAttribute('src') || '').trim(), alt = n.getAttribute('alt') || '';
      const w = parseInt(n.getAttribute('width'), 10), hg = parseInt(n.getAttribute('height'), 10);
      const d = gaseste(src) || (/^data:image\//i.test(src) ? src : null);
      if (d) { const el = document.createElement('img'); atribute(n, el); el.src = d; return el; }
      if (/^(https?:)?\/\//i.test(src)) return substituent('🌐 Imagine externă', w || 240, hg || Math.round((w || 240) * 0.62), alt);
      const el = h('span', { class: 'ap-x-lipsa', title: src ? `Nu găsesc fișierul „${src}” în proiect` : 'Imaginea nu are src' }, alt);
      if (w) el.style.width = `${w}px`;
      if (hg) el.style.height = `${hg}px`;
      return el;
    }
    function nod(n) {
      if (n.nodeType === 3) return document.createTextNode(n.data);
      if (n.nodeType !== 1) return null;
      const tag = n.localName, ns = n.namespaceURI;
      if (FARA.has(tag)) return null;
      if (ns === 'http://www.w3.org/1999/xhtml') {
        if (tag === 'img') return imagine(n);
        if (EXTERNE[tag]) { const w = parseInt(n.getAttribute('width'), 10) || 320; return substituent(`▶ ${EXTERNE[tag]}`, w, parseInt(n.getAttribute('height'), 10) || Math.round(w * 0.56), 'nu se afișează în previzualizare'); }
      }
      if (tag === 'foreignobject') return null;
      let el;
      try { el = ns === 'http://www.w3.org/1999/xhtml' ? document.createElement(tag) : document.createElementNS(ns, tag); } catch { el = document.createElement('span'); }
      atribute(n, el);
      for (const c of n.childNodes) { const x = nod(c); if (x) el.append(x); }
      return el;
    }

    root.addEventListener('click', (e) => {
      const a = e.target.closest?.('[data-ap-href]');
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute('data-ap-href').trim();
      if (!href) return;
      if (href.startsWith('#')) { root.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ block: 'start' }); return; }
      laLink(href);
    });
    root.addEventListener('submit', (e) => e.preventDefault());

    return {
      gazda, root,
      randeaza(cod, pastreazaScroll = false) {
        const sus = scroller.scrollTop;
        const pr = preproceseaza(cod);
        const doc = new DOMParser().parseFromString(pr.cod, 'text/html');
        const css = pr.css.join('\n');
        const htmlSim = document.createElement('div');
        htmlSim.setAttribute('data-ap-html', '');
        const corp = document.createElement('div');
        corp.setAttribute('data-ap-body', '');
        atribute(doc.documentElement, htmlSim, true);
        if (doc.body) { atribute(doc.body, corp, true); for (const c of doc.body.childNodes) { const x = nod(c); if (x) corp.append(x); } }
        htmlSim.append(corp);
        const foi = [foaieBaza()];
        if (css.trim()) {
          try {
            const sh = new CSSStyleSheet();
            sh.replaceSync(mediaLaContainer(curataCss(css, gaseste)));
            rescrieSelectori(sh.cssRules);
            foi.push(sh);
          } catch { /* CSS greșit: îl ignorăm */ }
        }
        root.adoptedStyleSheets = foi;
        root.replaceChildren(htmlSim);
        // Ca în browser: fundalul lui <body> acoperă toată fereastra, dacă <html> nu are fundal propriu.
        const hs = getComputedStyle(htmlSim), cs = getComputedStyle(corp);
        if (hs.backgroundColor === 'rgba(0, 0, 0, 0)' && hs.backgroundImage === 'none') {
          for (const p of ['backgroundColor', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize']) htmlSim.style[p] = cs[p];
        }
        scroller.scrollTop = pastreazaScroll ? sus : 0;
        return { titlu: doc.title };
      },
      sari(id) { root.getElementById(id)?.scrollIntoView({ block: 'start' }); },
    };
  }
  // Separă „despre.html#sus” în pagină și ancoră.
  function tintaLink(href, pagini) {
    const [f, ancora] = href.split('#');
    const nume = normNume(f);
    return { nume, ancora: ancora ? decodeURIComponent(ancora) : '', pagina: pagini.find((p) => p.nume === nume) };
  }

  // ---------- Previzualizare pentru profesor (pagina predată de elev) ----------
  window.EduHtmlPreview = (container, { pagini = [], imagini = [] } = {}, paginaInitiala = 'index.html') => {
    let curenta = pagini.find((p) => p.nume === paginaInitiala) || pagini[0];
    const file = h('div', { class: 'ap-html-file', role: 'tablist', 'aria-label': 'Paginile lucrării' });
    const titlu = h('span', { class: 'ap-html-filatitlu' });
    const mesaj = h('div', { class: 'ap-html-mesaj', role: 'status' });
    const scroller = h('div', { class: 'ap-html-scroll' });
    const motor = motorPreviz(scroller, {
      imagini: () => imagini,
      laLink: (href) => {
        if (eExtern(href)) return arataMesaj(`Linkul duce spre ${href} (alt site).`);
        const t = tintaLink(href, pagini);
        if (!t.pagina) return arataMesaj(`Pagina „${t.nume}” nu există în lucrare.`);
        deschide(t.pagina, t.ancora);
      },
    });
    let tm = null;
    function arataMesaj(t) { mesaj.textContent = t; mesaj.classList.add('vizibil'); clearTimeout(tm); tm = setTimeout(() => mesaj.classList.remove('vizibil'), 3000); }
    function deschide(p, ancora) {
      curenta = p;
      if (!p) { umple(scroller); scroller.append(h('p', { class: 'muted' }, 'Lucrarea nu are nicio pagină.')); return; }
      const r = motor.randeaza(p.cod || '');
      titlu.textContent = r.titlu || p.nume;
      for (const b of file.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.nume === p.nume));
      if (ancora) motor.sari(ancora);
    }
    umple(file, pagini.map((p) => h('button', { type: 'button', role: 'tab', 'data-nume': p.nume, onclick: () => deschide(p) }, p.nume)));
    umple(container, h('div', { class: 'ap-html-vizualizator' }, h('div', { class: 'ap-html-vbar' }, file, titlu), h('div', { class: 'ap-html-vcorp' }, scroller, mesaj)));
    deschide(curenta);
  };

  if (!routes) return;

  // ---------- Iconițe (SVG static) ----------
  const ic = (d) => h('span', { class: 'ap-html-ic', 'aria-hidden': 'true', html: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>` });
  const ICO = {
    st: '<path d="M3 5h14M3 9h9M3 13h14M3 17h9"/>', ce: '<path d="M3 5h14M6 9h8M3 13h14M6 17h8"/>', dr: '<path d="M3 5h14M8 9h9M3 13h14M8 17h9"/>', ju: '<path d="M3 5h14M3 9h14M3 13h14M3 17h14"/>',
    img: '<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/><path d="M3 15l4.5-4.5 3 3 2.5-2.5 4.5 4.5"/>',
    link: '<path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L10 5"/><path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1"/>',
    ul: '<circle cx="4" cy="5" r="1"/><circle cx="4" cy="10" r="1"/><circle cx="4" cy="15" r="1"/><path d="M8 5h9M8 10h9M8 15h9"/>',
    ol: '<path d="M3 3.5h1.5v4M3 7.5h3M3 12.5c0-1 3-1 3 .5S3 15 3 16.5h3"/><path d="M9 5h8M9 10h8M9 15h8"/>',
    tab: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><path d="M2.5 8h15M2.5 12.5h15M8 3.5v13"/>',
    culoare: '<path d="M6 15l4-11 4 11M7.5 11h5"/>', fundal: '<path d="M4 10l6-6 6 6-6 6z"/><path d="M16.5 13.5s1.5 1.8 1.5 2.8a1.5 1.5 0 0 1-3 0c0-1 1.5-2.8 1.5-2.8z"/>',
    br: '<path d="M16 4v6a3 3 0 0 1-3 3H4M7 10l-3 3 3 3"/>', hr: '<path d="M3 10h14"/>',
    cod: '<path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/>', ambele: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><path d="M10 3.5v13"/>', pagina: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><path d="M2.5 7.5h15"/>',
    desktop: '<rect x="2.5" y="3.5" width="15" height="10" rx="1.5"/><path d="M7 17h6M10 13.5V17"/>', telefon: '<rect x="6" y="2.5" width="8" height="15" rx="2"/><path d="M9 15h2"/>',
    fisiere: '<path d="M3 5.5a1.5 1.5 0 0 1 1.5-1.5h3l2 2h6a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>',
    verifica: '<path d="M4 10.5l4 4 8-9"/>', inapoi: '<path d="M12 5l-5 5 5 5"/>', reincarca: '<path d="M16 10a6 6 0 1 1-2-4.5M16 4v3.5h-3.5"/>',
    plus: '<path d="M10 4v12M4 10h12"/>', creion: '<path d="M4 16l1-4 8-8 3 3-8 8z"/>', sterge: '<path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/>',
    insereaza: '<path d="M10 3v10M6 9l4 4 4-4M4 17h12"/>', micsoreaza: '<path d="M4 4l5 5M9 5v4H5M16 16l-5-5M11 15v-4h4"/>', descarca: '<path d="M10 3v10M6 9l4 4 4-4M4 17h12"/>',
  };
  const CULORI = [['black', '#000000'], ['white', '#FFFFFF'], ['gray', '#808080'], ['red', '#FF0000'], ['crimson', '#DC143C'], ['orange', '#FFA500'], ['gold', '#FFD700'], ['green', '#008000'], ['teal', '#008080'], ['blue', '#0000FF'], ['navy', '#000080'], ['purple', '#800080'], ['brown', '#A52A2A'], ['pink', '#FFC0CB'], ['lightyellow', '#FFFFE0'], ['lightblue', '#ADD8E6'], ['lightgreen', '#90EE90'], ['lavender', '#E6E6FA'], ['beige', '#F5F5DC'], ['#EEF6FF', '#EEF6FF']];
  const BLOC = new Set('p h1 h2 h3 h4 h5 h6 li td th div body header footer section article main nav aside blockquote figure figcaption caption dt dd address pre'.split(' '));

  // ---------- Aplicația ----------
  routes.push({ pattern: /^\/aplicatii\/html$/, handler: async (m, params) => pornire(params) });

  async function pornire(params) {
    const ac = new AbortController();
    const pref = { vedere: 'ambele', disp: 'desktop', auto: true, lateral: true, fs: 14, ...lsCiteste(LS_PREF, {}) };
    const salvPref = () => lsScrie(LS_PREF, pref);
    let P = null, pag = null, tSalv = null, tPreviz = null, tSfat = null, sfaturi = [], istoric = [], escTab = false, tok = [];
    const pozitii = new Map(); // cursorul și derularea pentru fiecare pagină

    // --- elemente ---
    const numeProiect = h('input', { class: 'ap-html-numep', type: 'text', 'aria-label': 'Numele proiectului', maxlength: '80' });
    const stareSalv = h('span', { class: 'ap-html-salv', role: 'status' });
    const segVedere = h('div', { class: 'ap-html-seg', role: 'group', 'aria-label': 'Ce se vede' },
      [['cod', 'Cod'], ['ambele', 'Ambele'], ['pagina', 'Pagina']].map(([k, t]) => h('button', { type: 'button', 'data-v': k, title: k === 'ambele' ? 'Codul și pagina, una lângă alta' : t, onclick: () => seteazaVedere(k) }, ic(ICO[k]), h('span', {}, t))));
    const segDisp = h('div', { class: 'ap-html-seg', role: 'group', 'aria-label': 'Ecranul previzualizării' },
      [['desktop', 'Calculator'], ['telefon', 'Telefon']].map(([k, t]) => h('button', { type: 'button', 'data-d': k, title: `Previzualizare pe ${t.toLowerCase()}`, 'aria-label': t, onclick: () => seteazaDisp(k) }, ic(ICO[k]))));
    const btnFisier = h('button', { class: 'ap-html-fisier', type: 'button', onclick: () => panouFisier('descarca') }, 'Fișier');
    const bara = h('div', { class: 'ap-html-bara' },
      h('a', { class: 'ap-html-inapoi', href: '#/aplicatii' }, '← Aplicații'),
      h('span', { class: 'ap-html-sigla', 'aria-hidden': 'true' }, '</>'),
      h('b', { class: 'ap-html-numeapp' }, 'Editor de pagini web'),
      numeProiect, stareSalv, h('span', { class: 'ap-html-spatiu' }), segVedere, segDisp, btnFisier);

    // editorul de cod
    const nrRand = h('div', { class: 'ap-html-nr' });
    const gutter = h('div', { class: 'ap-html-gutter', 'aria-hidden': 'true' }, nrRand);
    const codEl = h('code', {});
    const pre = h('pre', { class: 'ap-html-pre', 'aria-hidden': 'true' }, codEl);
    const ta = h('textarea', { class: 'ap-html-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'Codul HTML al paginii. Esc, apoi Tab, ca să ieși din editor.' });
    const zona = h('div', { class: 'ap-html-zona' }, pre, ta);
    const fisierCurent = h('span', { class: 'ap-html-numef' });
    const listaSfaturi = h('ul', { class: 'ap-html-sfaturi-lista' });
    const panouSfaturi = h('div', { class: 'ap-html-sfaturi', hidden: !pref.sfaturi }, h('div', { class: 'ap-html-sfaturi-cap' }, h('b', {}, 'Sfaturi pentru codul tău'), h('button', { type: 'button', class: 'ap-html-x', 'aria-label': 'Închide sfaturile', onclick: () => comutaSfaturi(false) }, '×')), listaSfaturi);
    const colCod = h('div', { class: 'ap-html-col cod', role: 'region', 'aria-label': 'Codul HTML' },
      h('div', { class: 'ap-html-colcap' }, ic(ICO.cod), fisierCurent, h('span', { class: 'ap-html-spatiu' }), h('span', { class: 'muted small' }, 'HTML')),
      h('div', { class: 'ap-html-editor' }, gutter, zona), panouSfaturi);

    // previzualizarea
    const tabTitlu = h('span', { class: 'ap-html-tabtitlu' });
    const adresa = h('span', { class: 'ap-html-adresa' });
    const btnInapoi = h('button', { type: 'button', class: 'ap-html-nav', 'aria-label': 'Înapoi la pagina anterioară', title: 'Înapoi', disabled: true, onclick: () => { const x = istoric.pop(); if (x) deschidePagina(x, { faraIstoric: true }); } }, ic(ICO.inapoi));
    const scroller = h('div', { class: 'ap-html-scroll' });
    const ecran = h('div', { class: 'ap-html-ecran' }, scroller);
    const colPreviz = h('div', { class: 'ap-html-col previz', role: 'region', 'aria-label': 'Previzualizarea paginii' },
      h('div', { class: 'ap-html-browser' }, h('div', { class: 'ap-html-tab' }, h('span', { class: 'ap-html-favicon', 'aria-hidden': 'true' }), tabTitlu)),
      h('div', { class: 'ap-html-adr' }, btnInapoi, h('button', { type: 'button', class: 'ap-html-nav', title: 'Reîmprospătează (F5)', 'aria-label': 'Reîmprospătează', onclick: () => randeazaPreviz(true) }, ic(ICO.reincarca)), adresa),
      h('div', { class: 'ap-html-fundal' }, ecran));
    const motor = motorPreviz(scroller, { imagini: () => P?.imagini || [], laLink: urmeazaLink });

    // panoul lateral
    const listaPagini = h('ul', { class: 'ap-html-lista' });
    const listaImagini = h('ul', { class: 'ap-html-lista img' });
    const infoImagini = h('div', { class: 'ap-html-infoimg' });
    const lateral = h('aside', { class: 'ap-html-lateral', 'aria-label': 'Fișierele proiectului' },
      h('div', { class: 'ap-html-latcap' }, h('b', {}, 'Pagini'), h('button', { type: 'button', class: 'ap-html-mic', title: 'Pagină nouă', 'aria-label': 'Pagină nouă', onclick: () => paginaNoua() }, ic(ICO.plus))),
      listaPagini,
      h('div', { class: 'ap-html-latcap' }, h('b', {}, 'Imagini'), h('button', { type: 'button', class: 'ap-html-mic', title: 'Încarcă imagini de pe calculator', 'aria-label': 'Încarcă imagini', onclick: async () => incarcaImagini(await alegeFisiere('image/*')) }, ic(ICO.plus))),
      listaImagini, infoImagini);

    // bara de unelte
    const unealta = (eticheta, titlu, fn, extra = {}) => h('button', { type: 'button', class: 'ap-html-u', title: titlu, 'aria-label': titlu, onmousedown: (e) => e.preventDefault(), onclick: fn, ...extra }, eticheta);
    const sep = () => h('span', { class: 'ap-html-sep', 'aria-hidden': 'true' });
    const chkAuto = h('input', { type: 'checkbox', checked: pref.auto, onchange: () => { pref.auto = chkAuto.checked; salvPref(); } });
    const btnSfaturi = h('button', { type: 'button', class: 'ap-html-btnsfat', onclick: () => comutaSfaturi() });
    let btnCuloare, btnFundal;
    const unelte = h('div', { class: 'ap-html-unelte', role: 'toolbar', 'aria-label': 'Inserare rapidă' },
      unealta(ic(ICO.fisiere), 'Arată sau ascunde panoul cu pagini și imagini', () => { pref.lateral = !pref.lateral; salvPref(); aplicaPref(); }),
      sep(),
      unealta('H1', 'Titlu principal <h1>', () => bloc('h1', 'Titlul principal')),
      unealta('H2', 'Subtitlu <h2>', () => bloc('h2', 'Subtitlu')),
      unealta('H3', 'Subtitlu mic <h3>', () => bloc('h3', 'Subtitlu mic')),
      unealta('¶', 'Paragraf <p>', () => bloc('p', 'Scrie aici un paragraf.')),
      unealta(ic(ICO.br), 'Rând nou în același paragraf <br>', () => insereazaLaCursor('<br>')),
      unealta(ic(ICO.hr), 'Linie orizontală <hr>', () => bloc('hr')),
      sep(),
      unealta(h('b', {}, 'B'), 'Aldin <strong> (Ctrl+B)', () => inline('strong')),
      unealta(h('i', {}, 'I'), 'Cursiv <em> (Ctrl+I)', () => inline('em')),
      unealta(h('u', {}, 'U'), 'Subliniat <u> (Ctrl+U)', () => inline('u')),
      sep(),
      unealta(ic(ICO.img), 'Imagine <img>', () => dialogImagine()),
      unealta(ic(ICO.link), 'Link <a href>', () => dialogLink()),
      unealta(ic(ICO.ul), 'Listă cu buline <ul>', () => lista('ul')),
      unealta(ic(ICO.ol), 'Listă numerotată <ol>', () => lista('ol')),
      unealta(ic(ICO.tab), 'Tabel <table>', () => dialogTabel()),
      sep(),
      (btnCuloare = unealta(ic(ICO.culoare), 'Culoarea textului (style="color: …")', () => alegeCuloare(btnCuloare, 'color'))),
      (btnFundal = unealta(ic(ICO.fundal), 'Culoarea fundalului (style="background-color: …")', () => alegeCuloare(btnFundal, 'background-color'))),
      unealta(ic(ICO.st), 'Aliniere la stânga', () => stilBloc('text-align', 'left')),
      unealta(ic(ICO.ce), 'Centrat', () => stilBloc('text-align', 'center')),
      unealta(ic(ICO.dr), 'Aliniere la dreapta', () => stilBloc('text-align', 'right')),
      unealta(ic(ICO.ju), 'Aliniere stânga-dreapta (justify)', () => stilBloc('text-align', 'justify')),
      sep(),
      h('label', { class: 'ap-html-chk', title: 'Când scrii <p> apare singur </p>' }, chkAuto, h('span', { class: 'lung' }, 'Închide etichetele'), h('span', { class: 'scurt', 'aria-hidden': 'true' }, '</…>')),
      h('span', { class: 'ap-html-spatiu' }),
      btnSfaturi);

    const stPoz = h('span', {});
    const stFis = h('span', {});
    const status = h('div', { class: 'ap-html-status' }, stFis, stPoz, h('span', { class: 'ap-html-spatiu' }),
      h('span', { class: 'muted' }, 'Mărime text:'),
      h('button', { type: 'button', class: 'ap-html-mic', 'aria-label': 'Micșorează textul codului', onclick: () => zoom(-1) }, 'A−'),
      h('button', { type: 'button', class: 'ap-html-mic', 'aria-label': 'Mărește textul codului', onclick: () => zoom(1) }, 'A+'));
    const corp = h('div', { class: 'ap-html-corp' }, lateral, colCod, colPreviz);
    const app = h('div', { class: 'ap-html' }, bara, unelte, corp, status);

    // bara pentru predarea la sarcină
    if (params?.get('sarcina') && window.EduSarcini?.bara) {
      try {
        const b = await window.EduSarcini.bara('html', async () => lucrare());
        if (b instanceof Node) bara.after(b);
      } catch { /* fără bară */ }
    }
    show(h('div', { class: 'lab-ecran' }, app));
    document.title = 'Editor de pagini web – edudigi';

    // ---------- Mesaje și dialoguri ----------
    function toast(text, tip = '') {
      const t = h('div', { class: `ap-html-toast ${tip}`, role: 'status' }, text);
      app.append(t);
      setTimeout(() => t.classList.add('gone'), 3200);
      setTimeout(() => t.remove(), 3800);
    }
    function dialog(titlu, continut, butoane = [['OK', 'ok']], cls = '') {
      const d = h('dialog', { class: `ap-html-dlg ${cls}` },
        h('form', { method: 'dialog' }, h('h2', {}, titlu), continut,
          butoane.length ? h('div', { class: 'ap-html-dlgbtn' }, butoane.map(([t, v, c], i) => h('button', { value: v, class: `btn small ${c || (i ? 'ghost' : '')}` }, t))) : null));
      const [sa, sb, sus] = [ta.selectionStart, ta.selectionEnd, ta.scrollTop];
      app.append(d);
      d.showModal();
      // La închidere, browserul mută focusul înapoi și poate pierde selecția din editor: o refacem.
      return new Promise((res) => d.addEventListener('close', () => {
        d.remove();
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(sa, sb);
        ta.scrollTop = sus;
        res(d.returnValue);
      }, { once: true }));
    }
    const camp = (eticheta, input, ajutor) => h('label', { class: 'ap-html-camp' }, h('span', {}, eticheta), input, ajutor ? h('small', {}, ajutor) : null);
    async function intreaba(titlu, eticheta, valoare, ajutor) {
      const inp = h('input', { type: 'text', value: valoare || '' });
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
      return (await dialog(titlu, camp(eticheta, inp, ajutor), [['OK', 'ok'], ['Anulează', '']])) === 'ok' ? inp.value.trim() : null;
    }
    const confirma = async (titlu, text, da = 'Da') => (await dialog(titlu, h('p', {}, text), [[da, 'ok', 'danger ghost'], ['Anulează', '']])) === 'ok';

    // ---------- Proiect: încărcare și salvare ----------
    async function numeLiber(baza) {
      const toate = (await store.toate().catch(() => [])).map((f) => f.titlu);
      if (!toate.includes(baza)) return baza;
      let i = 2;
      while (toate.includes(`${baza} ${i}`)) i++;
      return `${baza} ${i}`;
    }
    async function proiectNou(titlu, pagini, imagini) {
      const p = { id: idNou(), titlu: await numeLiber(titlu), pagini, imagini, curenta: pagini[0]?.nume || 'index.html', creat: Date.now(), actualizat: Date.now() };
      await store.put(p).catch(() => toast('Nu am putut salva proiectul în browser.', 'error'));
      await incarca(p);
      return p;
    }
    async function incarca(p) {
      if (P && tSalv) await salveaza();
      P = p;
      pozitii.clear();
      istoric = [];
      lsScrie(LS_CURENT, p.id);
      numeProiect.value = p.titlu;
      deschidePagina(p.pagini.find((x) => x.nume === p.curenta) || p.pagini[0], { faraIstoric: true });
      randeazaLateral();
      stareSalv.textContent = 'Salvat pe acest calculator';
    }
    function programeazaSalvare() {
      stareSalv.textContent = 'Se salvează…';
      stareSalv.classList.remove('err');
      clearTimeout(tSalv);
      tSalv = setTimeout(() => salveaza(), 800);
    }
    async function salveaza(anunt = false) {
      clearTimeout(tSalv);
      tSalv = null;
      if (!P) return;
      P.actualizat = Date.now();
      P.curenta = pag?.nume;
      try {
        await store.put(P);
        stareSalv.textContent = 'Salvat pe acest calculator';
        if (anunt) toast('Salvat. Ca să-l iei cu tine: Fișier → Descarcă.');
      } catch {
        stareSalv.textContent = 'Nesalvat!';
        stareSalv.classList.add('err');
        toast('Nu am putut salva: spațiul din browser e plin. Micșorează imaginile sau descarcă proiectul.', 'error');
      }
    }
    async function lucrare() {
      await salveaza();
      const l = {
        titlu: P.titlu, tip: 'html',
        pagini: P.pagini.map(({ nume, cod }) => ({ nume, cod })),
        imagini: P.imagini.map(({ nume, date }) => ({ nume, date })),
        date: (P.pagini.find((x) => x.nume === 'index.html') || P.pagini[0]).cod,
      };
      const n = JSON.stringify(l).length;
      if (n > LIMITA) {
        avertismentMarime();
        throw new Error(`Proiectul are ${marime(n)}, iar la sarcină poți trimite cel mult 1,5 MB. Micșorează imaginile (panoul Imagini).`);
      }
      return l;
    }
    numeProiect.addEventListener('change', () => { const t = numeProiect.value.trim().slice(0, 80); if (t && P) { P.titlu = t; salveaza(); } else numeProiect.value = P?.titlu || ''; });

    // ---------- Pagini ----------
    function deschidePagina(p, { faraIstoric = false, ancora = '' } = {}) {
      if (!p) return;
      if (pag && pag !== p) {
        pozitii.set(pag.nume, { a: ta.selectionStart, b: ta.selectionEnd, sus: ta.scrollTop });
        if (!faraIstoric) istoric.push(pag);
      }
      pag = p;
      if (P) P.curenta = p.nume;
      ta.value = p.cod;
      const poz = pozitii.get(p.nume);
      if (poz) { ta.setSelectionRange(poz.a, poz.b); ta.scrollTop = poz.sus; } else { ta.setSelectionRange(0, 0); ta.scrollTop = 0; }
      fisierCurent.textContent = p.nume;
      adresa.textContent = p.nume;
      btnInapoi.disabled = !istoric.length;
      laSchimbareCod(true);
      randeazaPreviz(false);
      if (ancora) motor.sari(ancora);
      for (const li of listaPagini.children) li.classList.toggle('activ', li.dataset.nume === p.nume);
      sincronizeazaScroll();
    }
    function urmeazaLink(href) {
      if (eExtern(href)) return toast(`Linkul duce spre ${href}. În previzualizare nu se deschid alte site-uri; după publicare, linkul va funcționa.`);
      const t = tintaLink(href, P.pagini);
      if (t.pagina) return deschidePagina(t.pagina, { ancora: t.ancora });
      const im = P.imagini.find((x) => x.nume === t.nume);
      if (im) return toast(`Linkul deschide imaginea „${im.nume}”.`);
      toast(`Pagina „${t.nume}” nu există în proiect. Creeaz-o din panoul Pagini (+) sau corectează linkul.`, 'error');
    }
    async function paginaNoua() {
      let nume = await intreaba('Pagină nouă', 'Numele paginii', 'despre.html', 'Fără spații și diacritice. Se termină cu .html');
      if (!nume) return;
      nume = curataNume(nume.replace(/\.html?$/i, '')) + '.html';
      if (nume === '.html') return;
      if (P.pagini.some((x) => x.nume === nume)) return toast(`Există deja pagina „${nume}”.`, 'error');
      const titlu = nume.replace(/\.html$/, '').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
      const p = { nume, cod: schelet(titlu, `    <h1>${titlu}</h1>\n    <p>Scrie aici conținutul paginii.</p>\n    <p><a href="index.html">Înapoi la prima pagină</a></p>`) };
      P.pagini.push(p);
      randeazaLateral();
      deschidePagina(p);
      programeazaSalvare();
      toast(`Am creat „${nume}”. Ca să ajungi la ea, pune un link: <a href="${nume}">…</a>`);
    }
    async function redenumestePagina(p) {
      if (p.nume === 'index.html') return toast('index.html este prima pagină a site-ului și nu se redenumește.');
      let nume = await intreaba('Redenumește pagina', 'Numele nou', p.nume);
      if (!nume) return;
      nume = curataNume(nume.replace(/\.html?$/i, '')) + '.html';
      if (nume === p.nume || nume === '.html') return;
      if (P.pagini.some((x) => x.nume === nume)) return toast(`Există deja pagina „${nume}”.`, 'error');
      const vechi = p.nume;
      p.nume = nume;
      const re = new RegExp(`(href\\s*=\\s*["']?)(\\./)?${vechi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=["'#\\s>])`, 'g');
      let n = 0;
      for (const x of P.pagini) x.cod = x.cod.replace(re, (m0, a) => { n++; return a + nume; });
      ta.value = pag.cod;
      randeazaLateral();
      deschidePagina(pag, { faraIstoric: true });
      programeazaSalvare();
      toast(n ? `Am redenumit pagina și am actualizat ${n} ${n === 1 ? 'link' : 'linkuri'}.` : 'Am redenumit pagina.');
    }
    async function stergePagina(p) {
      if (p.nume === 'index.html') return toast('index.html este prima pagină a site-ului și nu se poate șterge.');
      if (!(await confirma('Ștergi pagina?', `Pagina „${p.nume}” se șterge din proiect.`, 'Șterge'))) return;
      P.pagini = P.pagini.filter((x) => x !== p);
      istoric = istoric.filter((x) => x !== p);
      if (pag === p) deschidePagina(P.pagini[0], { faraIstoric: true });
      randeazaLateral();
      programeazaSalvare();
    }
    function randeazaLateral() {
      umple(listaPagini, P.pagini.map((p) => h('li', { class: p === pag ? 'activ' : '', 'data-nume': p.nume },
        h('button', { type: 'button', class: 'ap-html-item', onclick: () => deschidePagina(p) }, h('span', { class: 'ap-html-tipf', 'aria-hidden': 'true' }, '<>'), h('span', { class: 'n' }, p.nume)),
        p.nume !== 'index.html' ? [
          h('button', { type: 'button', class: 'ap-html-mic', title: 'Redenumește', 'aria-label': `Redenumește ${p.nume}`, onclick: () => redenumestePagina(p) }, ic(ICO.creion)),
          h('button', { type: 'button', class: 'ap-html-mic', title: 'Șterge', 'aria-label': `Șterge ${p.nume}`, onclick: () => stergePagina(p) }, ic(ICO.sterge))] : null)));
      umple(listaImagini, P.imagini.length ? P.imagini.map((im) => {
        const oct = octetiData(im.date);
        const mini = h('img', { alt: '', src: im.date });
        return h('li', { class: oct > IMAGINE_MARE ? 'mare' : '' },
          h('button', { type: 'button', class: 'ap-html-item', title: `Inserează <img src="${im.nume}">`, onclick: () => dialogImagine(im) }, mini, h('span', { class: 'n' }, im.nume, h('small', {}, marime(oct)))),
          oct > IMAGINE_MARE && !/^data:image\/(svg|gif)/.test(im.date) ? h('button', { type: 'button', class: 'ap-html-mic', title: 'Micșorează imaginea', 'aria-label': `Micșorează ${im.nume}`, onclick: () => micsoreazaImagini([im]) }, ic(ICO.micsoreaza)) : null,
          h('button', { type: 'button', class: 'ap-html-mic', title: 'Redenumește', 'aria-label': `Redenumește ${im.nume}`, onclick: () => redenumesteImagine(im) }, ic(ICO.creion)),
          h('button', { type: 'button', class: 'ap-html-mic', title: 'Șterge', 'aria-label': `Șterge ${im.nume}`, onclick: () => stergeImagine(im) }, ic(ICO.sterge)));
      }) : h('li', { class: 'gol' }, 'Nicio imagine. Apasă + sau trage o imagine aici.'));
      const total = JSON.stringify({ p: P.pagini, i: P.imagini }).length;
      const bara2 = h('div', { class: 'ap-html-progres' }, h('i', {}));
      bara2.firstChild.style.width = `${Math.min(100, (total / LIMITA) * 100)}%`;
      bara2.classList.toggle('peste', total > LIMITA);
      const mari = P.imagini.filter((x) => octetiData(x.date) > IMAGINE_MARE && !/^data:image\/(svg|gif)/.test(x.date));
      umple(infoImagini, bara2, h('small', {}, `Proiectul: ${marime(total)} din 1,5 MB`),
        total > LIMITA ? h('p', { class: 'ap-html-avert' }, 'Proiectul e prea mare pentru a fi trimis la sarcină.') : null,
        mari.length ? h('button', { type: 'button', class: 'link-btn', onclick: () => micsoreazaImagini(mari) }, `Micșorează imaginile mari (${mari.length})`) : null);
    }

    // ---------- Imagini ----------
    function numeImagineLiber(nume) {
      if (!P.imagini.some((x) => x.nume === nume)) return nume;
      const [, baza, ext] = /^(.*?)(\.[^.]*)?$/.exec(nume);
      let i = 2;
      while (P.imagini.some((x) => x.nume === `${baza}-${i}${ext || ''}`)) i++;
      return `${baza}-${i}${ext || ''}`;
    }
    async function incarcaImagini(fisiere, insereaza = false) {
      const adaugate = [];
      for (const f of fisiere) {
        if (!f.type.startsWith('image/')) continue;
        let date = await citesteData(f);
        let nume = curataNume(f.name) || 'imagine.png';
        if (!/\.[a-z0-9]+$/.test(nume)) nume += `.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg')}`;
        nume = numeImagineLiber(nume);
        const [w, hg] = await dimensiuni(date);
        if ((octetiData(date) > IMAGINE_MARE || Math.max(w, hg) > 1600) && !/^data:image\/(svg|gif)/.test(date)) {
          const r = await dialog('Imaginea este mare', h('div', {},
            h('p', {}, `„${nume}” are ${marime(octetiData(date))}${w ? ` și ${w} × ${hg} pixeli` : ''}.`),
            h('p', {}, 'Imaginile mari încarcă greu pagina, iar proiectul trimis profesorului poate avea cel mult 1,5 MB. Pentru o pagină web ajung 1024 de pixeli lățime.')),
          [['Micșorează (recomandat)', 'da'], ['Păstrează așa', 'nu']]);
          if (r === 'da') date = await micsoreaza(date).catch(() => date);
        }
        const im = { nume, date };
        P.imagini.push(im);
        adaugate.push(im);
      }
      if (!adaugate.length) return;
      randeazaLateral();
      programeazaSalvare();
      randeazaPreviz(true);
      if (insereaza && adaugate.length === 1) insereazaImagine(adaugate[0].nume, '', '300');
      else toast(adaugate.length === 1 ? `Am adăugat „${adaugate[0].nume}”. În cod scrii: <img src="${adaugate[0].nume}" alt="…">` : `Am adăugat ${adaugate.length} imagini.`);
    }
    async function micsoreazaImagini(lista) {
      let castig = 0;
      for (const im of lista) { const inainte = im.date.length; im.date = await micsoreaza(im.date).catch(() => im.date); castig += inainte - im.date.length; }
      randeazaLateral();
      randeazaPreviz(true);
      programeazaSalvare();
      toast(castig > 0 ? `Gata: am câștigat ${marime(castig * 0.75)}.` : 'Imaginile sunt deja cât se poate de mici.');
    }
    async function redenumesteImagine(im) {
      let nume = await intreaba('Redenumește imaginea', 'Numele nou', im.nume, 'Păstrează extensia (.jpg, .png…). Fără spații și diacritice.');
      if (!nume) return;
      nume = curataNume(nume);
      if (!nume || nume === im.nume) return;
      if (P.imagini.some((x) => x.nume === nume)) return toast(`Există deja „${nume}”.`, 'error');
      const vechi = im.nume;
      im.nume = nume;
      const re = new RegExp(`((?:src|href)\\s*=\\s*["']?)(\\./)?${vechi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=["'\\s>])`, 'g');
      let n = 0;
      for (const x of P.pagini) x.cod = x.cod.replace(re, (m0, a) => { n++; return a + nume; });
      const sel = [ta.selectionStart, ta.selectionEnd];
      ta.value = pag.cod;
      ta.setSelectionRange(...sel);
      laSchimbareCod(true);
      randeazaLateral();
      randeazaPreviz(true);
      programeazaSalvare();
      toast(`Am redenumit imaginea${n ? ` și am actualizat codul în ${n} ${n === 1 ? 'loc' : 'locuri'}` : ''}.`);
    }
    async function stergeImagine(im) {
      if (!(await confirma('Ștergi imaginea?', `„${im.nume}” se șterge din proiect. Etichetele <img> care o folosesc vor arăta doar textul alternativ.`, 'Șterge'))) return;
      P.imagini = P.imagini.filter((x) => x !== im);
      randeazaLateral();
      randeazaPreviz(true);
      laSchimbareCod(true);
      programeazaSalvare();
    }
    function avertismentMarime() {
      const mari = P.imagini.filter((x) => !/^data:image\/(svg|gif)/.test(x.date)).sort((a, b) => b.date.length - a.date.length);
      dialog('Proiectul este prea mare', h('div', {},
        h('p', {}, 'La sarcină poți trimite cel mult 1,5 MB. Cele mai mari imagini:'),
        h('ul', {}, mari.slice(0, 5).map((x) => h('li', {}, `${x.nume} – ${marime(octetiData(x.date))}`)))),
      mari.length ? [['Micșorează imaginile', 'da'], ['Închide', '']] : [['Închide', '']]).then((r) => { if (r === 'da') micsoreazaImagini(mari.map((x) => x)); });
    }

    // ---------- Editorul: scriere, colorare, sfaturi ----------
    function inlocuieste(a, b, text, selA = a + text.length, selB = selA) {
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(a, b);
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch { ok = false; }
      if (!ok || ta.value.slice(a, a + text.length) !== text) { ta.setRangeText(text, a, b, 'end'); laSchimbareCod(); }
      ta.setSelectionRange(selA, selB);
    }
    function laSchimbareCod(faraSalvare = false) {
      if (pag) pag.cod = ta.value;
      tok = scaneaza(ta.value);
      codEl.innerHTML = `${evidentiaza(ta.value, tok)}\n `;
      const n = (ta.value.match(/\n/g) || []).length + 1;
      if (nrRand.childElementCount !== n) nrRand.innerHTML = Array.from({ length: n }, (_, i) => `<div>${i + 1}</div>`).join('');
      clearTimeout(tSfat);
      tSfat = setTimeout(actualizeazaSfaturi, faraSalvare ? 0 : 400);
      if (!faraSalvare) {
        programeazaSalvare();
        clearTimeout(tPreviz);
        tPreviz = setTimeout(() => randeazaPreviz(true), 150);
      }
      sincronizeazaScroll();
      pozitie();
    }
    function actualizeazaSfaturi() {
      if (!P || !pag) return;
      sfaturi = valideaza(ta.value, tok, P);
      const erori = sfaturi.filter((x) => x.nivel === 'eroare').length;
      btnSfaturi.className = `ap-html-btnsfat ${erori ? 'eroare' : sfaturi.length ? 'sfat' : 'ok'}`;
      umple(btnSfaturi, ic(ICO.verifica), h('span', {}, sfaturi.length ? `${sfaturi.length} ${sfaturi.length === 1 ? 'sfat' : 'sfaturi'}` : 'Cod corect'));
      btnSfaturi.setAttribute('aria-label', sfaturi.length ? `${sfaturi.length} sfaturi pentru cod. Arată lista.` : 'Codul nu are probleme');
      const marcate = new Map();
      for (const s of sfaturi) if (s.rand && !marcate.has(s.rand)) marcate.set(s.rand, s.nivel);
      [...nrRand.children].forEach((d, i) => { const nv = marcate.get(i + 1); d.className = nv || ''; });
      umple(listaSfaturi, sfaturi.length ? sfaturi.map((s) => h('li', { class: s.nivel },
        h('button', { type: 'button', onclick: () => { if (s.poz != null) mergiLa(s.poz); } },
          h('span', { class: 'ap-html-niv' }, s.nivel === 'eroare' ? 'Greșeală' : s.nivel === 'atentie' ? 'Atenție' : 'Sfat'),
          s.rand ? h('span', { class: 'ap-html-rand' }, `rândul ${s.rand}`) : null,
          h('span', {}, s.text))))
        : h('li', { class: 'ok' }, 'Nu am găsit probleme. Bravo!'));
    }
    function comutaSfaturi(v = panouSfaturi.hidden) { panouSfaturi.hidden = !v; pref.sfaturi = v; salvPref(); }
    function mergiLa(poz) {
      ta.focus();
      const capat = ta.value.indexOf('>', poz);
      ta.setSelectionRange(poz, capat >= 0 && capat - poz < 200 ? capat + 1 : poz);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 21;
      const r = ta.value.slice(0, poz).split('\n').length;
      ta.scrollTop = Math.max(0, (r - 1) * lh - ta.clientHeight / 3);
      sincronizeazaScroll();
    }
    function sincronizeazaScroll() {
      codEl.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      nrRand.style.transform = `translateY(${-ta.scrollTop}px)`;
    }
    function pozitie() {
      const p = ta.selectionStart, inainte = ta.value.slice(0, p);
      const r = (inainte.match(/\n/g) || []).length + 1, c = p - inainte.lastIndexOf('\n');
      stPoz.textContent = `Rândul ${r}, coloana ${c}`;
    }
    function randeazaPreviz(pastreaza) {
      clearTimeout(tPreviz);
      if (!pag) return;
      const r = motor.randeaza(pag.cod, pastreaza);
      tabTitlu.textContent = r.titlu || '(fără <title>)';
      tabTitlu.classList.toggle('lipsa', !r.titlu);
      stFis.textContent = `${pag.nume} · ${P.pagini.length} ${P.pagini.length === 1 ? 'pagină' : 'pagini'}`;
    }
    ta.addEventListener('scroll', sincronizeazaScroll);
    ta.addEventListener('input', (e) => {
      laSchimbareCod();
      // închiderea automată: după <p> apare </p>
      if (pref.auto && e.inputType === 'insertText' && e.data === '>') {
        const p = ta.selectionStart, inainte = ta.value.slice(Math.max(0, p - 300), p);
        const m = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s(?:[^<>"']|"[^"]*"|'[^']*')*)?>$/.exec(inainte);
        if (m && !VID.has(m[1].toLowerCase()) && !/\/>$/.test(inainte)) {
          const inc = `</${m[1]}>`;
          if (!ta.value.slice(p).startsWith(inc)) inlocuieste(p, p, inc, p, p);
        }
      }
    });
    for (const ev of ['keyup', 'click', 'select']) ta.addEventListener(ev, pozitie);
    const liniaCurenta = (p) => { const a = ta.value.lastIndexOf('\n', p - 1) + 1; let b = ta.value.indexOf('\n', p); if (b < 0) b = ta.value.length; return [a, b]; };
    ta.addEventListener('keydown', (e) => {
      const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
      if (e.key === 'Escape') { escTab = true; return; }
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        if (escTab) { escTab = false; return; } // Esc, apoi Tab: ieșire din editor
        e.preventDefault();
        if (a === b && !e.shiftKey) return inlocuieste(a, b, '  ');
        const [la] = liniaCurenta(a), [, lb] = liniaCurenta(b > a && v[b - 1] === '\n' ? b - 1 : b);
        const linii = v.slice(la, lb).split('\n');
        const noi = linii.map((l) => (e.shiftKey ? l.replace(/^ {1,2}|^\t/, '') : `  ${l}`));
        const txt = noi.join('\n');
        const d0 = noi[0].length - linii[0].length;
        return inlocuieste(la, lb, txt, a === b ? Math.max(la, a + d0) : la, a === b ? Math.max(la, a + d0) : la + txt.length);
      }
      escTab = false;
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.isComposing) {
        e.preventDefault();
        const [la] = liniaCurenta(a);
        const indent = /^[ \t]*/.exec(v.slice(la, a))[0];
        const intre = /<([a-zA-Z][a-zA-Z0-9]*)[^<>]*>$/.exec(v.slice(Math.max(0, a - 200), a)) && /^<\//.test(v.slice(b));
        if (intre) return inlocuieste(a, b, `\n${indent}  \n${indent}`, a + indent.length + 3);
        return inlocuieste(a, b, `\n${indent}`);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') { e.preventDefault(); inline('strong'); } else if (k === 'i') { e.preventDefault(); inline('em'); } else if (k === 'u') { e.preventDefault(); inline('u'); }
      }
    });
    ta.addEventListener('paste', (e) => {
      const f = [...(e.clipboardData?.files || [])].filter((x) => x.type.startsWith('image/'));
      if (f.length) { e.preventDefault(); incarcaImagini(f, true); }
    });
    for (const el of [zona, lateral]) {
      el.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('peste'); } });
      el.addEventListener('dragleave', () => el.classList.remove('peste'));
      el.addEventListener('drop', (e) => {
        el.classList.remove('peste');
        const f = [...e.dataTransfer.files];
        if (!f.length) return;
        e.preventDefault();
        adaugaFisiere(f, el === zona);
      });
    }
    function zoom(d) { pref.fs = Math.max(11, Math.min(22, pref.fs + d)); salvPref(); aplicaPref(); sincronizeazaScroll(); }

    // ---------- Inserare rapidă ----------
    function insereazaLaCursor(text, selIn, selLen) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      inlocuieste(a, b, text, selIn != null ? a + selIn : a + text.length, selIn != null ? a + selIn + selLen : a + text.length);
    }
    function inline(tag) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const txt = ta.value.slice(a, b) || 'text';
      inlocuieste(a, b, `<${tag}>${txt}</${tag}>`, a + tag.length + 2, a + tag.length + 2 + txt.length);
    }
    // Inserează un element pe un rând nou (după rândul curent), cu aceeași indentare.
    function insereazaBloc(text, selIn, selLen) {
      const v = ta.value;
      const [la, lb] = liniaCurenta(ta.selectionStart);
      const linie = v.slice(la, lb), indent = /^[ \t]*/.exec(linie)[0];
      const cuIndent = (ind) => text.split('\n').map((l) => ind + l).join('\n');
      let start, ins, off;
      if (!linie.trim()) { // rând gol: scriem pe el
        const ind = linie || '    ';
        ins = cuIndent(ind); off = ind.length;
        return inlocuieste(la, lb, ins, selIn != null ? la + off + selIn : la + ins.length, selIn != null ? la + off + selIn + selLen : undefined);
      }
      const laInceput = !v.slice(la, ta.selectionStart).trim();
      if (laInceput && !/^\s*<\/(body|html)\b/i.test(linie) && !/^\s*<(body|html|head)\b/i.test(linie)) { // cursorul la începutul rândului: inserăm deasupra
        ins = `${cuIndent(indent)}\n`; start = la; off = indent.length;
      } else if (/^\s*<\/(body|html)\b/i.test(linie)) { // înainte de </body>
        ins = `${cuIndent(`${indent}  `)}\n`; start = la; off = indent.length + 2;
      } else {
        const ind = /^\s*<(body|html)\b/i.test(linie) ? `${indent}  ` : indent;
        ins = `\n${cuIndent(ind)}`; start = lb; off = 1 + ind.length;
      }
      inlocuieste(start, start, ins, selIn != null ? start + off + selIn : start + ins.length - (start === la ? 1 : 0), selIn != null ? start + off + selIn + selLen : undefined);
    }
    function bloc(tag, placeholder) {
      if (tag === 'hr') return insereazaBloc('<hr>');
      const a = ta.selectionStart, b = ta.selectionEnd;
      if (a !== b) { const txt = ta.value.slice(a, b); return inlocuieste(a, b, `<${tag}>${txt}</${tag}>`, a + tag.length + 2, a + tag.length + 2 + txt.length); }
      insereazaBloc(`<${tag}>${placeholder}</${tag}>`, tag.length + 2, placeholder.length);
    }
    function lista(tag) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const linii = a !== b ? ta.value.slice(a, b).split('\n').map((x) => x.trim()).filter(Boolean) : [];
      const elemente = linii.length ? linii : ['primul element', 'al doilea element', 'al treilea element'];
      const txt = `<${tag}>\n${elemente.map((x) => `  <li>${x}</li>`).join('\n')}\n</${tag}>`;
      if (a !== b) return inlocuieste(a, b, txt);
      insereazaBloc(txt, tag.length + 9, elemente[0].length);
    }
    function insereazaImagine(src, alt, width) {
      insereazaBloc(`<img src="${src}" alt="${alt.replace(/"/g, '&quot;')}"${width ? ` width="${width}"` : ''}>`, 10 + src.length + 7, alt.length);
      if (!alt) toast('Completează atributul alt cu o descriere a imaginii.');
    }
    async function dialogImagine(preselectata) {
      let ales = preselectata?.nume || P.imagini[0]?.nume || '';
      const alt = h('input', { type: 'text', placeholder: 'ex. Un pelican care plutește pe apă' });
      const width = h('input', { type: 'number', min: '10', max: '2000', value: '300' });
      const galerie = h('div', { class: 'ap-html-galerie', role: 'radiogroup', 'aria-label': 'Alege imaginea' });
      const deseneaza = () => umple(galerie, P.imagini.map((im) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(im.nume === ales), class: im.nume === ales ? 'ales' : '', onclick: () => { ales = im.nume; deseneaza(); } }, h('img', { src: im.date, alt: '' }), h('span', {}, im.nume))),
        h('button', { type: 'button', class: 'ap-html-incarca', onclick: async () => {
          const f = await alegeFisiere('image/*', false);
          const n0 = P.imagini.length;
          await incarcaImagini(f);
          if (P.imagini.length > n0) { ales = P.imagini[P.imagini.length - 1].nume; deseneaza(); }
        } }, ic(ICO.plus), h('span', {}, 'Încarcă de pe calculator')));
      deseneaza();
      setTimeout(() => alt.focus(), 0);
      const r = await dialog('Inserează o imagine', h('div', {}, galerie,
        camp('Descrierea imaginii (alt)', alt, 'Citită de cititoarele de ecran și afișată dacă imaginea nu se încarcă.'),
        camp('Lățimea în pixeli (width)', width, 'Înălțimea se calculează singură, fără deformare.')), [['Inserează', 'ok'], ['Anulează', '']], 'lat');
      if (r !== 'ok') return;
      if (!ales) return toast('Încarcă mai întâi o imagine.', 'error');
      insereazaImagine(ales, alt.value.trim(), width.value.trim());
    }
    async function dialogLink() {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const text = h('input', { type: 'text', value: ta.value.slice(a, b).trim() || 'Vezi pagina' });
      const extern = h('input', { type: 'url', placeholder: 'https://ro.wikipedia.org' });
      const sel = h('select', {}, P.pagini.filter((p) => p !== pag).map((p) => h('option', { value: p.nume }, p.nume)),
        P.pagini.length === 1 ? h('option', { value: '' }, '(proiectul are o singură pagină)') : null,
        h('option', { value: '__ext' }, 'Alt site (adresă web)…'));
      const campExt = camp('Adresa site-ului', extern);
      campExt.hidden = sel.value !== '__ext';
      sel.addEventListener('change', () => { campExt.hidden = sel.value !== '__ext'; });
      const r = await dialog('Inserează un link', h('div', {}, camp('Textul pe care se dă clic', text), camp('Duce la', sel, 'Paginile din proiect sau alt site.'), campExt), [['Inserează', 'ok'], ['Anulează', '']]);
      if (r !== 'ok') return;
      let href = sel.value === '__ext' ? extern.value.trim() : sel.value;
      if (sel.value === '__ext' && href && !/^https?:\/\//i.test(href)) href = `https://${href}`;
      if (!href) return toast('Alege unde duce linkul.', 'error');
      const t = text.value.trim() || href;
      inlocuieste(a, b, `<a href="${href.replace(/"/g, '%22')}">${t}</a>`);
    }
    async function dialogTabel() {
      const randuri2 = h('input', { type: 'number', min: '1', max: '20', value: '3' });
      const coloane = h('input', { type: 'number', min: '1', max: '8', value: '3' });
      const antet = h('input', { type: 'checkbox', checked: true });
      const r = await dialog('Inserează un tabel', h('div', { class: 'ap-html-doi' }, camp('Rânduri', randuri2), camp('Coloane', coloane), h('label', { class: 'ap-html-chk' }, antet, h('span', {}, 'Primul rând este antet (<th>)'))), [['Inserează', 'ok'], ['Anulează', '']]);
      if (r !== 'ok') return;
      const R = Math.max(1, Math.min(20, +randuri2.value || 3)), C = Math.max(1, Math.min(8, +coloane.value || 3));
      const linii = ['<table border="1">'];
      for (let i = 0; i < R; i++) {
        const th = antet.checked && i === 0;
        linii.push('  <tr>', ...Array.from({ length: C }, (_, j) => `    <${th ? 'th' : 'td'}>${th ? `Coloana ${j + 1}` : '…'}</${th ? 'th' : 'td'}>`), '  </tr>');
      }
      linii.push('</table>');
      insereazaBloc(linii.join('\n'));
    }
    // Găsește eticheta de deschidere a elementului în care se află cursorul.
    function elementLaCursor(poz, filtru) {
      const s = ta.value, tk = scaneaza(s), stiva = [];
      for (const t of tk) {
        if (t.a >= poz) break;
        if (t.tip !== 'tag') continue;
        if (t.inchis) { const i = stiva.map((x) => x.nume).lastIndexOf(t.nume); if (i >= 0 && t.b <= poz) stiva.length = i; continue; }
        if (!VID.has(t.nume) && !t.auto && t.fin) stiva.push(t);
      }
      for (let i = stiva.length - 1; i >= 0; i--) if (filtru(stiva[i].nume)) return stiva[i];
      return null;
    }
    function seteazaStil(t, prop, val) {
      const st = atr(t, 'style');
      const decl = (st ? st.val : '').split(';').map((x) => x.trim()).filter(Boolean).filter((d) => d.split(':')[0].trim().toLowerCase() !== prop);
      decl.push(`${prop}: ${val}`);
      const nou = `style="${decl.join('; ')};"`;
      const [ia, ib] = st ? [st.na, st.vb ?? st.nb] : [t.numeB, t.numeB];
      const text = st ? nou : ` ${nou}`;
      const a = ta.selectionStart, b = ta.selectionEnd, d = text.length - (ib - ia);
      inlocuieste(ia, ib, text, a >= ib ? a + d : a, b >= ib ? b + d : b);
    }
    function stilBloc(prop, val, pagina = false) {
      const t = pagina ? scaneaza(ta.value).find((x) => x.tip === 'tag' && !x.inchis && x.nume === 'body' && x.fin) : elementLaCursor(ta.selectionStart, (n) => BLOC.has(n));
      if (!t) return toast(pagina ? 'Nu găsesc eticheta <body>.' : 'Pune cursorul în textul unui paragraf sau al unui titlu.', 'error');
      seteazaStil(t, prop, val);
      toast(`Am pus style="${prop}: ${val};" pe <${t.nume}>.`);
    }
    function alegeCuloare(ancora, prop) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const tinta = h('select', {}, a !== b ? h('option', { value: 'sel' }, 'textul selectat (<span>)') : null,
        h('option', { value: 'bloc' }, 'paragraful / titlul curent'), h('option', { value: 'pagina' }, 'toată pagina (<body>)'));
      if (a === b && prop === 'background-color' && !elementLaCursor(a, (n) => BLOC.has(n) && n !== 'body')) tinta.value = 'pagina';
      const custom = h('input', { type: 'color', value: '#1e8e3e', 'aria-label': 'Altă culoare' });
      const aplica = (val) => {
        inchide();
        ta.setSelectionRange(a, b);
        if (tinta.value === 'sel') { const txt = ta.value.slice(a, b); return inlocuieste(a, b, `<span style="${prop}: ${val};">${txt}</span>`); }
        stilBloc(prop, val, tinta.value === 'pagina');
      };
      const pop = h('div', { class: 'ap-html-pop', role: 'dialog', 'aria-label': prop === 'color' ? 'Culoarea textului' : 'Culoarea fundalului' },
        h('b', {}, prop === 'color' ? 'Culoarea textului' : 'Culoarea fundalului'),
        camp('Pentru', tinta),
        h('div', { class: 'ap-html-culori' }, CULORI.map(([nume, hex]) => { const bt = h('button', { type: 'button', title: nume, 'aria-label': nume, onclick: () => aplica(nume) }); bt.style.background = hex; return bt; })),
        h('div', { class: 'ap-html-alta' }, custom, h('button', { type: 'button', class: 'btn small ghost', onclick: () => aplica(custom.value.toUpperCase()) }, 'Altă culoare')),
        h('small', { class: 'muted' }, 'Culorile se scriu cu numele în engleză (red, blue) sau cu un cod (#1E8E3E).'));
      const ra = app.getBoundingClientRect(), r = ancora.getBoundingClientRect();
      pop.style.left = `${Math.max(8, Math.min(r.left - ra.left, ra.width - 290))}px`;
      pop.style.top = `${r.bottom - ra.top + 4}px`;
      const afara = (e) => { if (!pop.contains(e.target) && e.target !== ancora) inchide(); };
      const tasta = (e) => { if (e.key === 'Escape') { inchide(); ta.focus(); } };
      function inchide() { pop.remove(); document.removeEventListener('mousedown', afara, true); document.removeEventListener('keydown', tasta, true); }
      document.querySelectorAll('.ap-html-pop').forEach((x) => x.remove());
      app.append(pop);
      document.addEventListener('mousedown', afara, true);
      document.addEventListener('keydown', tasta, true);
      pop.querySelector('.ap-html-culori button').focus();
    }

    // ---------- Fișier: proiecte, șabloane, descărcare ----------
    async function adaugaFisiere(fisiere, insereaza = false) {
      const zipuri = fisiere.filter((f) => /\.zip$/i.test(f.name));
      for (const z of zipuri) await deschideZip(z);
      const html = fisiere.filter((f) => /\.html?$/i.test(f.name));
      for (const f of html) {
        const nume = `${curataNume(f.name.replace(/\.html?$/i, '')) || 'pagina'}.html`;
        const cod = await f.text();
        const ex = P.pagini.find((x) => x.nume === nume);
        if (ex) { if (!(await confirma('Pagina există deja', `Înlocuiești „${nume}” cu fișierul de pe calculator?`, 'Înlocuiește'))) continue; ex.cod = cod; } else P.pagini.push({ nume, cod });
        deschidePagina(P.pagini.find((x) => x.nume === nume));
      }
      const imagini = fisiere.filter((f) => f.type.startsWith('image/'));
      if (imagini.length) await incarcaImagini(imagini, insereaza);
      if (html.length) { randeazaLateral(); programeazaSalvare(); toast(`Am adăugat ${html.length === 1 ? 'pagina' : `${html.length} pagini`}.`); }
    }
    async function deschideZip(f) {
      try {
        const intrari = (await citesteZip(await f.arrayBuffer())).filter((x) => /\.html?$/i.test(x.nume) || eImagine(x.nume));
        if (!intrari.some((x) => /\.html?$/i.test(x.nume))) throw new Error('Arhiva nu conține nicio pagină .html.');
        const primul = intrari[0].nume.split('/');
        const comun = primul.length > 1 && intrari.every((x) => x.nume.startsWith(`${primul[0]}/`)) ? `${primul[0]}/` : '';
        const rel = (n) => n.slice(comun.length);
        const pagini = intrari.filter((x) => /\.html?$/i.test(x.nume)).map((x) => ({ nume: rel(x.nume), cod: new TextDecoder().decode(x.bytes) }));
        pagini.sort((a, b) => (b.nume === 'index.html') - (a.nume === 'index.html'));
        const imagini = intrari.filter((x) => eImagine(x.nume)).map((x) => ({ nume: rel(x.nume), date: `data:${MIME[x.nume.split('.').pop().toLowerCase()]};base64,${bytesLaBase64(x.bytes)}` }));
        await proiectNou(f.name.replace(/\.zip$/i, '').slice(0, 80) || 'Proiect', pagini, imagini);
        toast(`Am deschis proiectul: ${pagini.length} ${pagini.length === 1 ? 'pagină' : 'pagini'}, ${imagini.length} imagini.`);
      } catch (e) { toast(e.message || 'Nu am putut deschide arhiva.', 'error'); }
    }
    const numeDescarcare = () => (P.titlu || 'site').replace(/[\\/:*?"<>|]/g, '_');
    function descarcaPagina() {
      descarca(pag.nume.split('/').pop(), new Blob([pag.cod], { type: 'text/html;charset=utf-8' }));
      if (/<img\b/i.test(pag.cod) && P.imagini.length) toast('Pagina folosește imagini: pune-le în același folder cu pagina sau descarcă tot proiectul (.zip).');
    }
    function descarcaZip() {
      const enc = new TextEncoder();
      const fis = [...P.pagini.map((p) => ({ nume: p.nume, bytes: enc.encode(p.cod) })), ...P.imagini.map((im) => ({ nume: im.nume, bytes: dataLaBytes(im.date) }))];
      descarca(`${numeDescarcare()}.zip`, scrieZip(fis));
    }
    async function panouFisier(fila = 'nou', primaData = false) {
      await salveaza();
      const cont = h('div', { class: 'ap-html-bscont' });
      const btn = (ico, titlu, desc, fn) => h('button', { type: 'button', class: 'ap-html-bsbtn', onclick: fn }, ic(ICO[ico]), h('div', {}, h('b', {}, titlu), h('span', {}, desc)));
      let d;
      const inchide = () => d.close();
      const FILE = {
        nou: () => [h('h3', {}, primaData ? 'Bun venit! Cu ce începi?' : 'Proiect nou'),
          h('p', { class: 'muted' }, 'Alege un șablon. Îl poți schimba oricum vrei: e doar un punct de plecare.'),
          h('div', { class: 'ap-html-sabloane' }, SABLOANE.map((s) => h('button', { type: 'button', class: 'ap-html-sablon', onclick: async () => {
            await proiectNou(s.id === 'gol' ? 'Site nou' : s.nume, JSON.parse(JSON.stringify(s.pagini)), JSON.parse(JSON.stringify(s.imagini)));
            inchide();
          } }, h('span', { class: 'semn', 'aria-hidden': 'true' }, s.semn), h('b', {}, s.nume), h('span', {}, s.desc), h('small', {}, s.pagini.map((p) => p.nume).join(', ')))))],
        proiecte: async () => {
          const toate = (await store.toate().catch(() => [])).sort((a, b) => b.actualizat - a.actualizat);
          return [h('h3', {}, 'Proiectele mele'),
            toate.length ? h('ul', { class: 'ap-html-proiecte' }, toate.map((p) => h('li', { class: p.id === P?.id ? 'activ' : '' },
              h('button', { type: 'button', class: 'ap-html-item', onclick: async () => { inchide(); await incarca(await store.get(p.id)); } },
                h('b', {}, p.titlu), h('span', { class: 'muted small' }, `${p.pagini.length} ${p.pagini.length === 1 ? 'pagină' : 'pagini'}, ${p.imagini.length} imagini · ${cand(p.actualizat)}`)),
              h('button', { type: 'button', class: 'link-btn', onclick: async () => {
                const t = await intreaba('Redenumește proiectul', 'Numele nou', p.titlu);
                if (!t) return;
                const x = p.id === P?.id ? P : await store.get(p.id);
                x.titlu = t.slice(0, 80);
                await store.put(x);
                if (x === P) numeProiect.value = x.titlu;
                arata('proiecte');
              } }, 'Redenumește'),
              h('button', { type: 'button', class: 'link-btn', onclick: async () => {
                if (!(await confirma('Ștergi proiectul?', `„${p.titlu}” se șterge definitiv din acest browser.`, 'Șterge'))) return;
                await store.del(p.id);
                if (p.id === P?.id) {
                  const rest = (await store.toate()).sort((x, y) => y.actualizat - x.actualizat);
                  if (rest[0]) await incarca(rest[0]); else { P = null; inchide(); panouFisier('nou', true); return; }
                }
                arata('proiecte');
              } }, 'Șterge')))) : h('p', { class: 'muted' }, 'Încă nu ai niciun proiect.'),
            h('p', { class: 'muted small' }, 'Proiectele se păstrează în acest browser, pe acest calculator. Ca să le iei cu tine, descarcă-le ca .zip.')];
        },
        descarca: () => [h('h3', {}, 'Descărcare'),
          btn('descarca', `Pagina curentă (${pag?.nume})`, 'Un singur fișier .html, deschis cu dublu clic în browser', () => { descarcaPagina(); }),
          btn('fisiere', 'Tot proiectul (.zip)', `Toate paginile și imaginile (${P.pagini.length + P.imagini.length} fișiere), în același folder`, () => { descarcaZip(); }),
          h('p', { class: 'muted small' }, 'După ce dezarhivezi .zip-ul, deschide index.html: linkurile și imaginile funcționează ca aici.')],
        deschide: () => [h('h3', {}, 'Deschide de pe calculator'),
          btn('fisiere', 'Un proiect salvat ca .zip', 'Se deschide ca proiect nou', async () => { const [f] = await alegeFisiere('.zip,application/zip', false); if (f) { inchide(); deschideZip(f); } }),
          btn('plus', 'Adaugă pagini sau imagini în proiectul curent', 'Fișiere .html, .jpg, .png, .gif, .svg', async () => { const f = await alegeFisiere('.html,.htm,image/*'); if (f.length) { inchide(); adaugaFisiere(f); } })],
      };
      const meniu = h('nav', { class: 'ap-html-bsmeniu' }, [['nou', 'Nou'], ['proiecte', 'Proiectele mele'], ['descarca', 'Descărcare'], ['deschide', 'Deschide']]
        .filter(([k]) => P || k === 'nou' || k === 'proiecte' || k === 'deschide')
        .map(([k, t]) => h('button', { type: 'button', 'data-k': k, onclick: () => arata(k) }, t)));
      async function arata(k) {
        for (const b of meniu.querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.k === k));
        umple(cont, await FILE[k]());
      }
      d = h('dialog', { class: 'ap-html-dlg mare' }, h('div', { class: 'ap-html-bs' }, meniu, cont),
        h('button', { type: 'button', class: 'ap-html-x', 'aria-label': 'Închide', onclick: () => inchide() }, '×'));
      app.append(d);
      d.addEventListener('close', async () => {
        d.remove();
        if (!P) await proiectNou('Site nou', JSON.parse(JSON.stringify(SABLOANE[0].pagini)), []);
        ta.focus({ preventScroll: true });
      }, { once: true });
      d.showModal();
      arata(fila);
    }

    // ---------- Vederi ----------
    function aplicaPref() {
      app.dataset.vedere = pref.vedere;
      app.dataset.disp = pref.disp;
      app.dataset.lateral = String(pref.lateral);
      app.style.setProperty('--ap-fs', `${pref.fs}px`);
      for (const b of segVedere.children) b.setAttribute('aria-pressed', String(b.dataset.v === pref.vedere));
      for (const b of segDisp.children) b.setAttribute('aria-pressed', String(b.dataset.d === pref.disp));
    }
    function seteazaVedere(v) { pref.vedere = v; salvPref(); aplicaPref(); if (v !== 'pagina') ta.focus({ preventScroll: true }); sincronizeazaScroll(); }
    function seteazaDisp(d) { pref.disp = d; salvPref(); aplicaPref(); }
    aplicaPref();

    // scurtături și ieșire
    app.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salveaza(true); }
      if (e.key === 'F5' && !e.ctrlKey) { e.preventDefault(); randeazaPreviz(true); toast('Pagina s-a reîmprospătat. (Aici se actualizează oricum singură.)'); }
    });
    window.addEventListener('hashchange', () => {
      if (!/^#\/aplicatii\/html(\?|$)/.test(location.hash)) { if (tSalv) salveaza(); ac.abort(); }
    }, { signal: ac.signal });
    window.addEventListener('beforeunload', () => { if (tSalv) salveaza(); }, { signal: ac.signal });

    // ---------- Pornire ----------
    let p0 = null;
    const idC = lsCiteste(LS_CURENT, null);
    try {
      if (idC) p0 = await store.get(idC);
      if (!p0) p0 = (await store.toate()).sort((a, b) => b.actualizat - a.actualizat)[0] || null;
    } catch { p0 = null; }
    if (p0) { await incarca(p0); ta.focus({ preventScroll: true }); } else panouFisier('nou', true);
  }
})();

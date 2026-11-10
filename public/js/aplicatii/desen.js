'use strict';
// Desen: editor grafic 2D, ca Paint, pentru clasa a V-a (Unitatea 4 · Editare grafică).
// Pânza este un <canvas>; deasupra ei stă un strat de previzualizare (forme în lucru, selecție, marker).
// Desenele se păstrează în browser (IndexedDB, cu localStorage de rezervă) și se descarcă PNG/JPG.
// Funcționează cu mouse-ul (clic stânga = Culoarea 1, clic dreapta = Culoarea 2) și cu degetul (pointer events).
(() => {
  const { h, show, routes } = window.EduApp;

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-desen', ST = 'desene', LS = 'edudigi_desen_fisiere', LS_CULORI = 'edudigi_desen_culori', CIORNA = '__ciorna';
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
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}, ${ora}`;
  };

  // ---------- Pictograme (SVG 20×20, desenate cu linie) ----------
  const P = {
    creion: '<path d="M3.5 16.5l1-4 9-9a2 2 0 0 1 3 3l-9 9z"/><path d="M12 5l3 3"/>',
    pensula: '<path d="M17 3l-7 8"/><path d="M9 10.5l1.5 1.5c0 3-2 5-6.5 4.5 1.3-1 1-2.5 1.5-3.8.6-1.6 2-2.6 3.5-2.2z"/>',
    umplere: '<path d="M3.8 9.2L9.5 3.5l6.2 6.2-5.7 5.7a1.6 1.6 0 0 1-2.2 0l-4-4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4 10h11.5"/><path d="M17.5 13s1.5 1.8 1.5 3a1.5 1.5 0 0 1-3 0c0-1.2 1.5-3 1.5-3z"/>',
    radiera: '<path d="M7 17h10"/><path d="M3.6 12.4l8-8a1.4 1.4 0 0 1 2 0l3 3a1.4 1.4 0 0 1 0 2L10 16H7.2z"/><path d="M7.5 8.5l5 5"/>',
    pipeta: '<path d="M11 6l3 3"/><path d="M13.5 3.5a2.1 2.1 0 0 1 3 3L14.8 8.2 11.8 5.2z"/><path d="M12.3 7.7L5 15l-1.2 3.2L7 17l7.3-7.3"/>',
    text: '<path d="M4 5V3.5h12V5"/><path d="M10 3.5v13"/><path d="M7.5 16.5h5"/>',
    lupa: '<circle cx="8.5" cy="8.5" r="5"/><path d="M12.2 12.2L17 17"/><path d="M6.5 8.5h4M8.5 6.5v4"/>',
    selectare: '<path d="M3 6V3h3M9 3h2M14 3h3v3M17 9v2M17 14v3h-3M11 17H9M6 17H3v-3M3 11V9"/>',
    trunchiere: '<path d="M5.5 2v12.5H18"/><path d="M2 5.5h12.5V18"/>',
    redim: '<rect x="2.5" y="8.5" width="9" height="9"/><path d="M11 2.5h6.5V9"/><path d="M17.5 2.5L12 8"/>',
    rotire: '<path d="M16 10.5a6 6 0 1 1-1.8-4.3"/><path d="M15 2.5v4h-4"/>',
    lipire: '<rect x="4" y="3.5" width="12" height="14" rx="1.5"/><path d="M7.5 3.5V2.5h5v1"/><path d="M7 9h6M7 12h6"/>',
    copiere: '<rect x="6.5" y="6.5" width="10" height="11" rx="1.5"/><path d="M13.5 6.5V4a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 4v8.5A1.5 1.5 0 0 0 5 14h1.5"/>',
    decupare: '<circle cx="5.5" cy="14.5" r="2.5"/><circle cx="14.5" cy="14.5" r="2.5"/><path d="M7.3 12.7L15 3M12.7 12.7L5 3"/>',
    anulare: '<path d="M7.5 4.5L3.5 8.5l4 4"/><path d="M3.5 8.5h8.5a4.5 4.5 0 0 1 0 9H9"/>',
    refacere: '<path d="M12.5 4.5l4 4-4 4"/><path d="M16.5 8.5H8a4.5 4.5 0 0 0 0 9h3"/>',
    salvare: '<path d="M4 3h10l3 3v11H4z"/><path d="M7 3v4.5h6V3M7 17v-5h7v5"/>',
    sageataJos: '<path d="M6 8l4 4 4-4"/>',
    schimba: '<path d="M5 8h10l-3-3M15 12H5l3 3"/>',
    culori: '<path d="M10 2.5a7.5 7.5 0 1 0 0 15c1.2 0 1.6-1 1-1.9-.6-.9 0-2.1 1.1-2.1H14a3.5 3.5 0 0 0 3.5-3.5C17.5 5.6 14.1 2.5 10 2.5z"/><circle cx="6.5" cy="9" r="1"/><circle cx="9" cy="6" r="1"/><circle cx="13" cy="6.5" r="1"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    minus: '<path d="M4 10h12"/>',
  };
  const svg = (inner, cls = 'ap-desen-ico') => h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>` });
  const ico = (k) => svg(P[k]);

  // ---------- Constante ----------
  const PALETA = ['#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
    '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'];
  const GROSIMI = [1, 2, 3, 5, 8, 12, 20, 30];
  const ZOOM = [0.125, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
  const FONTURI = { 'Arial': 'Arial, Helvetica, sans-serif', 'Verdana': 'Verdana, sans-serif', 'Times New Roman': '"Times New Roman", Times, serif', 'Georgia': 'Georgia, serif',
    'Courier New': '"Courier New", Courier, monospace', 'Comic Sans MS': '"Comic Sans MS", "Comic Neue", cursive', 'Trebuchet MS': '"Trebuchet MS", sans-serif', 'Impact': 'Impact, "Arial Black", sans-serif', 'Montserrat': 'Montserrat, sans-serif' };
  const MARIMI = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96];
  const PENSULE = [['normala', 'Pensulă'], ['caligrafie', 'Pensulă de caligrafie'], ['aerograf', 'Aerograf'], ['marker', 'Marker (transparent)']];
  const MAX_LATURA = 4000; // pânza cea mai mare permisă
  const LUCRARE_MAX = 1600; // latura maximă a imaginii predate la sarcină

  // Forme: puncte în pătratul unitate [0,1]×[0,1]
  const normalizeaza = (p) => {
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, hh = Math.max(...ys) - y0;
    return p.map(([x, y]) => [(x - x0) / w, (y - y0) / hh]);
  };
  const poligon = (n, r1 = 0) => {
    const k = r1 ? n * 2 : n, p = [];
    for (let i = 0; i < k; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / k, r = r1 && i % 2 ? r1 : 1; p.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return normalizeaza(p);
  };
  const UNIT = {
    triunghi: [[0.5, 0], [1, 1], [0, 1]], triunghiDr: [[0, 0], [0, 1], [1, 1]], romb: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
    pentagon: poligon(5), hexagon: poligon(6), stea: poligon(5, 0.4),
    sageata: [[0, 0.3], [0.6, 0.3], [0.6, 0], [1, 0.5], [0.6, 1], [0.6, 0.7], [0, 0.7]],
    fulger: [[0.55, 0], [0.12, 0.56], [0.45, 0.56], [0.3, 1], [0.88, 0.4], [0.56, 0.4], [0.78, 0]],
  };
  const FORME = [['linie', 'Linie'], ['dreptunghi', 'Dreptunghi'], ['rotunjit', 'Dreptunghi rotunjit'], ['elipsa', 'Elipsă'], ['triunghi', 'Triunghi'], ['triunghiDr', 'Triunghi dreptunghic'],
    ['romb', 'Romb'], ['pentagon', 'Pentagon'], ['hexagon', 'Hexagon'], ['sageata', 'Săgeată'], ['stea', 'Stea'], ['inima', 'Inimă'], ['fulger', 'Fulger']];
  function caleForma(tip, x, y, w, hh) {
    const p = new Path2D();
    if (tip === 'dreptunghi') p.rect(x, y, w, hh);
    else if (tip === 'rotunjit') {
      const r = Math.min(w, hh) * 0.2;
      p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + hh, r); p.arcTo(x + w, y + hh, x, y + hh, r); p.arcTo(x, y + hh, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
    } else if (tip === 'elipsa') p.ellipse(x + w / 2, y + hh / 2, Math.max(w / 2, 0.5), Math.max(hh / 2, 0.5), 0, 0, Math.PI * 2);
    else if (tip === 'inima') {
      const X = (u) => x + u * w, Y = (v) => y + v * hh;
      p.moveTo(X(0.5), Y(0.28));
      p.bezierCurveTo(X(0.5), Y(0.04), X(0), Y(0), X(0), Y(0.33));
      p.bezierCurveTo(X(0), Y(0.6), X(0.35), Y(0.75), X(0.5), Y(1));
      p.bezierCurveTo(X(0.65), Y(0.75), X(1), Y(0.6), X(1), Y(0.33));
      p.bezierCurveTo(X(1), Y(0), X(0.5), Y(0.04), X(0.5), Y(0.28));
      p.closePath();
    } else {
      UNIT[tip].forEach(([u, v], i) => (i ? p.lineTo(x + u * w, y + v * hh) : p.moveTo(x + u * w, y + v * hh)));
      p.closePath();
    }
    return p;
  }
  // Pictograma unei forme, desenată din aceleași date
  function icoForma(tip) {
    const s = (u) => (2.5 + u * 15).toFixed(1);
    let d;
    if (tip === 'linie') d = '<path d="M3 17L17 3"/>';
    else if (tip === 'dreptunghi') d = '<rect x="2.5" y="4.5" width="15" height="11"/>';
    else if (tip === 'rotunjit') d = '<rect x="2.5" y="4.5" width="15" height="11" rx="3"/>';
    else if (tip === 'elipsa') d = '<ellipse cx="10" cy="10" rx="7.5" ry="5.5"/>';
    else if (tip === 'inima') d = '<path d="M10 6.7C10 3 2.5 2.5 2.5 7.5c0 4 5 5.6 7.5 9.5 2.5-3.9 7.5-5.5 7.5-9.5C17.5 2.5 10 3 10 6.7z"/>';
    else d = `<path d="M${UNIT[tip].map(([u, v]) => `${s(u)} ${s(v)}`).join('L')}z"/>`;
    return svg(d);
  }

  // ---------- Culori ----------
  const hexRgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const rgbHex = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
  const NUME_CULORI = { '#000000': 'negru', '#7f7f7f': 'gri', '#880015': 'vișiniu', '#ed1c24': 'roșu', '#ff7f27': 'portocaliu', '#fff200': 'galben', '#22b14c': 'verde', '#00a2e8': 'albastru deschis', '#3f48cc': 'albastru', '#a349a4': 'mov',
    '#ffffff': 'alb', '#c3c3c3': 'gri deschis', '#b97a57': 'maro', '#ffaec9': 'roz', '#ffc90e': 'auriu', '#efe4b0': 'bej', '#b5e61d': 'verde lime', '#99d9ea': 'bleu', '#7092be': 'albastru-gri', '#c8bfe7': 'lila' };
  const numeCuloare = (c) => { const [r, g, b] = hexRgb(c); return `${NUME_CULORI[c] ? `${NUME_CULORI[c]} · ` : ''}R ${r}, G ${g}, B ${b}`; };

  // ---------- Utilitare canvas ----------
  const canvasNou = (w, hh) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, hh); return c; };
  const copie = (src) => { const c = canvasNou(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function transforma(src, fel) {
    const sw = src.width, sh = src.height, rot = fel === 'r90' || fel === 'r270';
    const c = canvasNou(rot ? sh : sw, rot ? sw : sh), g = c.getContext('2d');
    if (fel === 'r90') { g.translate(sh, 0); g.rotate(Math.PI / 2); }
    else if (fel === 'r270') { g.translate(0, sw); g.rotate(-Math.PI / 2); }
    else if (fel === 'r180') { g.translate(sw, sh); g.rotate(Math.PI); }
    else if (fel === 'fh') { g.translate(sw, 0); g.scale(-1, 1); }
    else { g.translate(0, sh); g.scale(1, -1); }
    g.drawImage(src, 0, 0);
    return c;
  }
  // Redimensionare + înclinare (grade); fundal = culoarea de umplere a colțurilor goi (sau transparent)
  function scaleaza(src, W, H, inclX = 0, inclY = 0, fundal = null) {
    let c = canvasNou(W, H), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (fundal) { g.fillStyle = fundal; g.fillRect(0, 0, W, H); }
    g.drawImage(src, 0, 0, W, H);
    if (inclX) {
      const t = Math.tan(inclX * Math.PI / 180), d = Math.round(Math.abs(t) * H);
      const n = canvasNou(W + d, H), gn = n.getContext('2d');
      if (fundal) { gn.fillStyle = fundal; gn.fillRect(0, 0, n.width, n.height); }
      gn.setTransform(1, 0, -t, 1, t > 0 ? d : 0, 0); gn.drawImage(c, 0, 0); c = n;
    }
    if (inclY) {
      const t = Math.tan(inclY * Math.PI / 180), d = Math.round(Math.abs(t) * c.width);
      const n = canvasNou(c.width, c.height + d), gn = n.getContext('2d');
      if (fundal) { gn.fillStyle = fundal; gn.fillRect(0, 0, n.width, n.height); }
      gn.setTransform(1, -t, 0, 1, 0, t > 0 ? d : 0); gn.drawImage(c, 0, 0); c = n;
    }
    return c;
  }
  const citesteFisier = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
  const incarcaImagine = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Fișierul nu este o imagine pe care o pot deschide.')); i.src = src; });
  function alegeFisier(accept) {
    return new Promise((res) => {
      const inp = h('input', { type: 'file', accept });
      inp.addEventListener('change', () => res(inp.files[0] || null));
      inp.click();
    });
  }
  function descarca(nume, blob) {
    const a = h('a', { href: URL.createObjectURL(blob), download: nume });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const numeFisierSigur = (s) => (s || 'desen').replace(/[\\/:*?"<>|]/g, '_').trim() || 'desen';

  // Umplere cu culoare (flood fill), cu o mică toleranță pentru marginile netezite
  function umple(c, x0, y0, culoare, tol = 32) {
    const W = c.width, H = c.height, g = c.getContext('2d', { willReadFrequently: true });
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return false;
    const img = g.getImageData(0, 0, W, H), d = img.data, [R, G, B] = hexRgb(culoare);
    const i0 = (y0 * W + x0) * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3];
    if (r0 === R && g0 === G && b0 === B && a0 === 255) return false;
    const vazut = new Uint8Array(W * H);
    const potrivit = (p) => { const i = p * 4; return !vazut[p] && Math.abs(d[i] - r0) <= tol && Math.abs(d[i + 1] - g0) <= tol && Math.abs(d[i + 2] - b0) <= tol && Math.abs(d[i + 3] - a0) <= tol; };
    const stiva = [y0 * W + x0];
    while (stiva.length) {
      let p = stiva.pop();
      const y = Math.floor(p / W);
      let x = p - y * W;
      while (x > 0 && potrivit(p - 1)) { p--; x--; }
      let susSus = false, josJos = false;
      while (x < W && potrivit(p)) {
        vazut[p] = 1;
        const i = p * 4; d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
        if (y > 0) { const q = p - W; if (potrivit(q)) { if (!susSus) { stiva.push(q); susSus = true; } } else susSus = false; }
        if (y < H - 1) { const q = p + W; if (potrivit(q)) { if (!josJos) { stiva.push(q); josJos = true; } } else josJos = false; }
        p++; x++;
      }
    }
    g.putImageData(img, 0, 0);
    return true;
  }

  // ---------- Ruta ----------
  routes.push({ pattern: /^\/aplicatii\/desen$/, handler: async (m, params) => editor(params) });

  async function editor() {
    const ac = new AbortController(), sig = { signal: ac.signal };
    const S = {
      unealta: 'creion', unealtaAnt: 'creion', pensula: 'normala', forma: 'dreptunghi',
      contur: 'unic', umplere: 'fara', grosime: 3, c1: '#000000', c2: '#ffffff', activa: 1,
      zoom: 1, grila: false, transparenta: false,
      font: 'Arial', marime: 24, aldin: false, cursiv: false, subliniat: false, opac: false,
      fisierId: null, titlu: 'Fără titlu', creat: null, modificat: false,
    };
    let particularizate = lsCiteste(LS_CULORI, []).filter((c) => /^#[0-9a-f]{6}$/.test(c)).slice(0, 10);

    // ----- Pânza -----
    const cv = h('canvas', { class: 'ap-desen-cv' });
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const ov = h('canvas', { class: 'ap-desen-ov', 'aria-label': 'Suprafața de desenare', role: 'img' });
    const octx = ov.getContext('2d');
    const grila = h('div', { class: 'ap-desen-grila', hidden: true });
    const selCv = h('canvas');
    const selManer = h('div', { class: 'ap-desen-sel-maner', title: 'Trage ca să redimensionezi selecția (cu Shift păstrezi proporțiile)' });
    const selEl = h('div', { class: 'ap-desen-sel', hidden: true, title: 'Trage ca să muți selecția. Cu Ctrl apăsat lași o copie în urmă.' }, selCv, selManer);
    const pzContur = h('div', { class: 'ap-desen-pz-contur', hidden: true });
    const manere = ['e', 's', 'se'].map((d) => h('div', { class: `ap-desen-pz-maner ${d}`, 'data-d': d, title: 'Trage ca să schimbi dimensiunea pânzei' }));
    const pagina = h('div', { class: 'ap-desen-pagina' }, cv, grila, ov, selEl, pzContur, ...manere);
    const scena = h('div', { class: 'ap-desen-scena' }, pagina);

    function panzaNoua(w, hh, fundal = '#ffffff') {
      cv.width = w; cv.height = hh; ov.width = w; ov.height = hh;
      ctx.fillStyle = fundal; ctx.fillRect(0, 0, w, hh);
    }
    function restaurare(src) {
      cv.width = src.width; cv.height = src.height; ov.width = src.width; ov.height = src.height;
      ctx.drawImage(src, 0, 0);
      aplicaZoom(); stare();
    }

    // ----- Anulare / Refacere: copii ale pânzei -----
    const anulari = [], refaceri = [];
    function pas() {
      anulari.push(copie(cv));
      let px = anulari.reduce((s, c) => s + c.width * c.height, 0);
      while (anulari.length > 40 || (px > 60e6 && anulari.length > 2)) { const c = anulari.shift(); px -= c.width * c.height; }
      refaceri.length = 0;
      schimbat();
    }
    function anuleaza() {
      fixeazaText(); fixeazaFlotant();
      if (!anulari.length) return;
      refaceri.push(copie(cv)); restaurare(anulari.pop()); schimbat();
    }
    function reface() {
      fixeazaText(); fixeazaFlotant();
      if (!refaceri.length) return;
      anulari.push(copie(cv)); restaurare(refaceri.pop()); schimbat();
    }

    // ----- Ciorna (lucrul curent se păstrează automat) -----
    let tCiorna = null;
    function schimbat() {
      S.modificat = true;
      actualizeazaTitlu(); actualizeazaUI();
      clearTimeout(tCiorna); tCiorna = setTimeout(salveazaCiorna, 1500);
    }
    async function salveazaCiorna() {
      clearTimeout(tCiorna); tCiorna = null;
      try {
        await store.put({ id: CIORNA, fisierId: S.fisierId, titlu: S.titlu, creat: S.creat, modificat: S.modificat, imagine: imagineCompleta().toDataURL('image/png'), actualizat: Date.now() });
      } catch { /* spațiu plin: ciorna e doar o rezervă */ }
    }
    // Pânza cu tot cu selecția plutitoare și textul nefixat (fără să le fixeze)
    function imagineCompleta() {
      if (!fl && !tx) return cv;
      const c = copie(cv);
      if (fl) c.getContext('2d').drawImage(selCv, fl.x, fl.y, fl.w, fl.h);
      if (tx) deseneazaText(c.getContext('2d'), tx.el.value, tx.x, tx.y);
      return c;
    }

    // ----- Zoom -----
    function aplicaZoom() {
      const W = cv.width * S.zoom, H = cv.height * S.zoom;
      for (const el of [cv, ov, pagina]) { el.style.width = `${W}px`; el.style.height = `${H}px`; }
      pagina.classList.toggle('pixeli', S.zoom >= 2);
      let pasG = 10 * S.zoom; while (pasG < 8) pasG *= 5;
      grila.style.backgroundSize = `${pasG}px ${pasG}px`;
      pozFlotant(); stilText();
      if (zoomEl) { zoomEl.textContent = `${Math.round(S.zoom * 100)}%`; zoomSlider.value = String(Math.round(S.zoom * 100)); }
    }
    function setZoom(z, ancora) {
      z = clamp(z, 0.1, 8);
      const sr = scena.getBoundingClientRect();
      const ax = ancora ? ancora.x : sr.left + sr.width / 2, ay = ancora ? ancora.y : sr.top + sr.height / 2;
      const pr = pagina.getBoundingClientRect();
      const ix = (ax - pr.left) / S.zoom, iy = (ay - pr.top) / S.zoom;
      S.zoom = z; aplicaZoom();
      const pr2 = pagina.getBoundingClientRect();
      scena.scrollLeft += pr2.left + ix * z - ax;
      scena.scrollTop += pr2.top + iy * z - ay;
    }
    const mareste = (a) => setZoom(ZOOM.find((v) => v > S.zoom + 1e-6) ?? 8, a);
    const micsoreaza = (a) => setZoom([...ZOOM].reverse().find((v) => v < S.zoom - 1e-6) ?? 0.1, a);
    function potriveste() {
      const w = scena.clientWidth - 48, hh = scena.clientHeight - 48;
      if (w <= 0 || hh <= 0) return;
      S.zoom = clamp(Math.min(1, w / cv.width, hh / cv.height), 0.1, 1); aplicaZoom();
      scena.scrollLeft = 0; scena.scrollTop = 0;
    }

    // ----- Selecția plutitoare -----
    let fl = null; // { cv, x, y, w, h }
    function randeazaFlotant() {
      selCv.width = fl.cv.width; selCv.height = fl.cv.height;
      const g = selCv.getContext('2d');
      g.drawImage(fl.cv, 0, 0);
      if (S.transparenta) { // Selecție transparentă: Culoarea 2 devine transparentă
        const img = g.getImageData(0, 0, selCv.width, selCv.height), d = img.data, [R, G, B] = hexRgb(S.c2);
        for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - R) < 12 && Math.abs(d[i + 1] - G) < 12 && Math.abs(d[i + 2] - B) < 12) d[i + 3] = 0;
        g.putImageData(img, 0, 0);
      }
      pozFlotant();
    }
    function pozFlotant() {
      if (!fl) { selEl.hidden = true; stare(); return; }
      selEl.hidden = false;
      Object.assign(selEl.style, { left: `${fl.x * S.zoom}px`, top: `${fl.y * S.zoom}px`, width: `${Math.max(1, fl.w * S.zoom)}px`, height: `${Math.max(1, fl.h * S.zoom)}px` });
      stare();
    }
    function creeazaFlotant(c, x, y) {
      fl = { cv: c, x: Math.round(x), y: Math.round(y), w: c.width, h: c.height };
      randeazaFlotant(); actualizeazaUI();
    }
    function fixeazaFlotant() {
      if (!fl) return;
      ctx.drawImage(selCv, fl.x, fl.y, fl.w, fl.h);
      fl = null; pozFlotant(); schimbat();
    }
    // Aduce conținutul selecției la dimensiunea afișată (după o redimensionare din colț)
    function coaceFlotant() {
      if (fl.cv.width !== fl.w || fl.cv.height !== fl.h) fl.cv = scaleaza(fl.cv, fl.w, fl.h);
    }
    function ridica(x, y, w, hh) { // decupează zona în selecție; locul rămâne cu Culoarea 2
      x = clamp(Math.round(x), 0, cv.width); y = clamp(Math.round(y), 0, cv.height);
      w = clamp(Math.round(w), 0, cv.width - x); hh = clamp(Math.round(hh), 0, cv.height - y);
      if (w < 1 || hh < 1) return;
      pas();
      const c = canvasNou(w, hh); c.getContext('2d').drawImage(cv, x, y, w, hh, 0, 0, w, hh);
      ctx.fillStyle = S.c2; ctx.fillRect(x, y, w, hh);
      creeazaFlotant(c, x, y);
    }
    const selecteazaTot = () => { fixeazaText(); fixeazaFlotant(); setUnealta('selectare'); ridica(0, 0, cv.width, cv.height); };

    // Clipboard: intern, plus clipboard-ul sistemului când browserul permite
    let clip = null, clipSistem = false;
    function copiaza() {
      if (!fl) return toast('Selectează mai întâi o parte din desen (unealta Selectare).');
      coaceFlotant(); randeazaFlotant();
      clip = copie(selCv); clipSistem = false;
      try {
        if (navigator.clipboard?.write && window.ClipboardItem) clip.toBlob((b) => { if (b) navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(() => { clipSistem = true; }, () => {}); });
      } catch { /* doar intern */ }
      return true;
    }
    function decupeaza() { if (copiaza() === true) { fl = null; pozFlotant(); schimbat(); } }
    function stergeSelectia() { if (fl) { fl = null; pozFlotant(); schimbat(); } }
    function lipesteCanvas(c, mesaj = true) {
      fixeazaText(); fixeazaFlotant();
      setUnealta('selectare');
      pas();
      if (c.width > cv.width || c.height > cv.height) { // ca Paint: pânza se mărește ca să încapă
        const vechi = copie(cv);
        panzaNoua(Math.max(cv.width, c.width), Math.max(cv.height, c.height));
        ctx.drawImage(vechi, 0, 0); aplicaZoom();
        if (mesaj) toast('Pânza s-a mărit ca să încapă imaginea lipită.');
      }
      // în colțul din stânga-sus al zonei vizibile
      const pr = pagina.getBoundingClientRect(), sr = scena.getBoundingClientRect();
      const x = clamp(Math.round((sr.left - pr.left) / S.zoom) + 4, 0, Math.max(0, cv.width - c.width));
      const y = clamp(Math.round((sr.top - pr.top) / S.zoom) + 4, 0, Math.max(0, cv.height - c.height));
      creeazaFlotant(c, x, y);
    }
    function lipeste() {
      if (!clip) return toast('Nu ai copiat nimic încă. Selectează ceva și apasă Copiere (Ctrl+C).');
      lipesteCanvas(copie(clip));
    }
    async function insereazaImagine(f) {
      if (!f) return;
      if (!/^image\//.test(f.type)) return toast('Alege un fișier imagine (PNG, JPG, GIF, BMP, WEBP).', 'eroare');
      try {
        const img = await incarcaImagine(await citesteFisier(f));
        let w = img.naturalWidth, hh = img.naturalHeight;
        const k = Math.min(1, cv.width / w, cv.height / hh);
        if (k < 1) { w = Math.max(1, Math.round(w * k)); hh = Math.max(1, Math.round(hh * k)); toast('Imaginea a fost micșorată ca să încapă pe pânză. O poți redimensiona trăgând de colț.'); }
        const c = canvasNou(w, hh), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, hh);
        lipesteCanvas(c, false);
      } catch (e) { toast(e.message, 'eroare'); }
    }

    // ----- Transformări: ale selecției sau ale întregii imagini -----
    function roteste(fel) {
      fixeazaText();
      if (fl) {
        coaceFlotant();
        const cx = fl.x + fl.w / 2, cy = fl.y + fl.h / 2;
        fl.cv = transforma(fl.cv, fel); fl.w = fl.cv.width; fl.h = fl.cv.height;
        fl.x = Math.round(cx - fl.w / 2); fl.y = Math.round(cy - fl.h / 2);
        randeazaFlotant(); schimbat();
      } else { pas(); restaurare(transforma(cv, fel)); schimbat(); }
    }
    function trunchiaza() {
      fixeazaText();
      if (!fl) return toast('Trunchiere: selectează mai întâi zona care trebuie să rămână.');
      coaceFlotant(); randeazaFlotant();
      const c = canvasNou(fl.w, fl.h), g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, fl.w, fl.h); g.drawImage(selCv, 0, 0);
      fl = null; pozFlotant();
      pas(); restaurare(c); schimbat();
    }
    function redimPanza(w, hh) {
      w = clamp(Math.round(w), 1, MAX_LATURA); hh = clamp(Math.round(hh), 1, MAX_LATURA);
      if (w === cv.width && hh === cv.height) return;
      fixeazaText(); fixeazaFlotant(); pas();
      const vechi = copie(cv);
      panzaNoua(w, hh); ctx.drawImage(vechi, 0, 0);
      aplicaZoom(); stare(); schimbat();
    }

    // ----- Text -----
    let tx = null; // { el, x, y }
    const fontCss = (z = 1) => `${S.cursiv ? 'italic ' : ''}${S.aldin ? 'bold ' : ''}${S.marime * z}px ${FONTURI[S.font] || 'sans-serif'}`;
    function deseneazaText(g, text, x, y) {
      if (!text.trim()) return;
      g.save(); g.font = fontCss(1); g.textBaseline = 'middle';
      const lh = S.marime * 1.2;
      text.split('\n').forEach((l, i) => {
        const yy = y + i * lh, w = g.measureText(l).width;
        if (S.opac) { g.fillStyle = S.c2; g.fillRect(x, yy, Math.ceil(w) + 2, Math.ceil(lh)); }
        g.fillStyle = S.c1; g.fillText(l, x + 1, yy + lh / 2);
        if (S.subliniat && w) g.fillRect(x + 1, yy + lh / 2 + S.marime * 0.42, w, Math.max(1, S.marime / 14));
      });
      g.restore();
    }
    function creeazaText(p) {
      const el = h('textarea', { class: 'ap-desen-text', spellcheck: 'false', 'aria-label': 'Scrie textul; clic în afara casetei ca să-l fixezi' });
      tx = { el, x: Math.round(p.x), y: Math.round(p.y) };
      el.addEventListener('input', potrivesteText);
      el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fixeazaText(); } });
      pagina.append(el); stilText();
      el.focus({ preventScroll: true });
      setTimeout(() => { if (tx?.el === el) el.focus({ preventScroll: true }); }, 0);
    }
    function stilText() {
      if (!tx) return;
      Object.assign(tx.el.style, { left: `${tx.x * S.zoom}px`, top: `${tx.y * S.zoom}px`, font: fontCss(S.zoom), lineHeight: '1.2', color: S.c1, background: S.opac ? S.c2 : 'transparent', textDecoration: S.subliniat ? 'underline' : 'none' });
      potrivesteText();
    }
    function potrivesteText() {
      if (!tx) return;
      ctx.save(); ctx.font = fontCss(1);
      const linii = tx.el.value.split('\n');
      const w = Math.max(S.marime * 3, ...linii.map((l) => ctx.measureText(l).width + S.marime));
      ctx.restore();
      tx.el.style.width = `${Math.ceil(w * S.zoom) + 4}px`;
      tx.el.style.height = `${Math.ceil(linii.length * S.marime * 1.2 * S.zoom) + 4}px`;
    }
    function fixeazaText() {
      if (!tx) return;
      const { el, x, y } = tx; tx = null;
      el.remove();
      if (!el.value.trim()) return;
      pas(); deseneazaText(ctx, el.value, x, y); schimbat();
    }

    // ----- Unelte de desen -----
    const pozitie = (e) => { const r = ov.getBoundingClientRect(); return { x: (e.clientX - r.left) / S.zoom, y: (e.clientY - r.top) / S.zoom }; };
    function linieCreion(g, x0, y0, x1, y1, s) { // linie fără netezire, pixel cu pixel (Bresenham)
      x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = Math.floor(s / 2);
      let err = dx + dy;
      for (;;) {
        g.fillRect(x0 - o, y0 - o, s, s);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    const marimeRadiera = () => Math.max(4, S.grosime * 2 + 4);
    function linieRadiera(a, b) {
      const s = marimeRadiera(), d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / (s / 3)));
      ctx.fillStyle = S.c2;
      for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
    }
    function segmentPensula(g, a, b, col) {
      const s = S.grosime;
      g.fillStyle = col; g.strokeStyle = col;
      if (S.pensula === 'caligrafie') {
        const w = Math.max(2, s * 1.5), dx = w * 0.7, dy = -w * 0.7;
        g.beginPath(); g.moveTo(a.x + dx, a.y + dy); g.lineTo(a.x - dx, a.y - dy); g.lineTo(b.x - dx, b.y - dy); g.lineTo(b.x + dx, b.y + dy); g.closePath(); g.fill();
        g.lineWidth = 1.2; g.beginPath(); g.moveTo(b.x + dx, b.y + dy); g.lineTo(b.x - dx, b.y - dy); g.stroke();
      } else {
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.lineWidth = S.pensula === 'marker' ? s * 2 + 4 : s;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x + 0.01, b.y); g.stroke();
      }
    }
    function pulverizeaza(p, col) {
      const r = Math.max(5, S.grosime * 2.5), n = Math.ceil(r * 0.9);
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d), 1, 1);
      }
    }
    function deseneazaForma(g, a, b, shift, sec) {
      let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
      const [prim, fundal] = sec ? [S.c2, S.c1] : [S.c1, S.c2];
      g.save(); g.lineWidth = S.grosime; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = prim;
      if (S.forma === 'linie') {
        if (shift) { // linie dreaptă: orizontală, verticală sau la 45°
          const ang = Math.round(Math.atan2(y1 - y0, x1 - x0) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(x1 - x0, y1 - y0);
          x1 = x0 + Math.cos(ang) * d; y1 = y0 + Math.sin(ang) * d;
        }
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
        return;
      }
      if (shift) { const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + Math.sign(x1 - x0 || 1) * m; y1 = y0 + Math.sign(y1 - y0 || 1) * m; }
      const x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), hh = Math.abs(y1 - y0);
      const cale = caleForma(S.forma, x, y, w, hh);
      const faraContur = S.contur === 'fara' && S.umplere !== 'fara';
      if (S.umplere === 'unic') { g.fillStyle = fundal; g.fill(cale); }
      if (!faraContur) g.stroke(cale);
      g.restore();
    }

    // Operația în curs (o tragere cu mouse-ul sau cu degetul)
    let op = null;
    function incepe(p, sec, e) {
      const u = S.unealta, col = sec ? S.c2 : S.c1;
      if (u !== 'text' && tx) { fixeazaText(); }
      if (u === 'creion' || u === 'radiera' || u === 'pensula') {
        pas();
        let ultim = p;
        const marker = u === 'pensula' && S.pensula === 'marker';
        const deseneaza = (a, b) => {
          if (u === 'creion') { ctx.fillStyle = col; linieCreion(ctx, a.x, a.y, b.x, b.y, S.grosime); }
          else if (u === 'radiera') linieRadiera(a, b);
          else if (S.pensula === 'aerograf') pulverizeaza(b, col);
          else segmentPensula(marker ? octx : ctx, a, b, col);
        };
        if (marker) { octx.clearRect(0, 0, ov.width, ov.height); ov.style.opacity = '0.4'; }
        deseneaza(p, p);
        let raf = 0;
        if (u === 'pensula' && S.pensula === 'aerograf') { const bucla = () => { pulverizeaza(ultim, col); raf = requestAnimationFrame(bucla); }; raf = requestAnimationFrame(bucla); }
        op = {
          muta(q) { deseneaza(ultim, q); ultim = q; },
          gata() {
            cancelAnimationFrame(raf);
            if (marker) { ctx.save(); ctx.globalAlpha = 0.4; ctx.drawImage(ov, 0, 0); ctx.restore(); octx.clearRect(0, 0, ov.width, ov.height); ov.style.opacity = ''; }
            schimbat();
          },
          anuleaza() { cancelAnimationFrame(raf); octx.clearRect(0, 0, ov.width, ov.height); ov.style.opacity = ''; restaurare(anulari.pop()); },
        };
      } else if (u === 'forma') {
        let ultim = p, shift = e.shiftKey;
        const previz = () => { octx.clearRect(0, 0, ov.width, ov.height); deseneazaForma(octx, p, ultim, shift, sec); };
        op = {
          muta(q, ev) { ultim = q; shift = ev.shiftKey; previz(); },
          gata() {
            octx.clearRect(0, 0, ov.width, ov.height);
            if (Math.hypot(ultim.x - p.x, ultim.y - p.y) < 2) return;
            pas(); deseneazaForma(ctx, p, ultim, shift, sec); schimbat();
          },
          anuleaza() { octx.clearRect(0, 0, ov.width, ov.height); },
        };
      } else if (u === 'selectare') {
        fixeazaFlotant();
        let ultim = p;
        const dr = () => {
          const x = clamp(Math.min(p.x, ultim.x), 0, cv.width), y = clamp(Math.min(p.y, ultim.y), 0, cv.height);
          return { x, y, w: clamp(Math.max(p.x, ultim.x), 0, cv.width) - x, h: clamp(Math.max(p.y, ultim.y), 0, cv.height) - y };
        };
        op = {
          muta(q) {
            ultim = q; const r = dr();
            octx.clearRect(0, 0, ov.width, ov.height);
            octx.save(); octx.lineWidth = 1 / S.zoom; octx.setLineDash([4 / S.zoom, 3 / S.zoom]);
            octx.strokeStyle = '#000'; octx.strokeRect(Math.round(r.x) + 0.5 / S.zoom, Math.round(r.y) + 0.5 / S.zoom, Math.round(r.w), Math.round(r.h));
            octx.strokeStyle = '#fff'; octx.lineDashOffset = 3.5 / S.zoom; octx.strokeRect(Math.round(r.x) + 0.5 / S.zoom, Math.round(r.y) + 0.5 / S.zoom, Math.round(r.w), Math.round(r.h));
            octx.restore();
            stareSel.textContent = `${Math.round(r.w)} × ${Math.round(r.h)} px`;
          },
          gata() { octx.clearRect(0, 0, ov.width, ov.height); const r = dr(); if (r.w >= 1 && r.h >= 1) ridica(r.x, r.y, r.w, r.h); stare(); },
          anuleaza() { octx.clearRect(0, 0, ov.width, ov.height); },
        };
      } else if (u === 'umplere') {
        pas();
        if (umple(cv, p.x, p.y, col)) schimbat(); else anulari.pop();
      } else if (u === 'pipeta') {
        const x = Math.floor(p.x), y = Math.floor(p.y);
        if (x >= 0 && y >= 0 && x < cv.width && y < cv.height) {
          const d = ctx.getImageData(x, y, 1, 1).data, c = rgbHex(d[0], d[1], d[2]);
          if (sec) S.c2 = c; else S.c1 = c;
          setUnealta(S.unealtaAnt);
        }
      } else if (u === 'text') {
        if (tx) fixeazaText(); else creeazaText(p);
      } else if (u === 'lupa') {
        if (sec) micsoreaza({ x: e.clientX, y: e.clientY }); else mareste({ x: e.clientX, y: e.clientY });
      }
      actualizeazaUI();
    }

    // ----- Evenimentele pointerului pe pânză (mouse, creion, deget) -----
    const atingeri = new Map();
    let gest = null, opId = null, faraDesen = false;
    const mijloc = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
    const distanta = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    ov.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        atingeri.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        if (atingeri.size === 2) { // două degete: mărire/micșorare și deplasare, nu desen
          if (op) { op.anuleaza(); op = null; opId = null; }
          const [a, b] = [...atingeri.values()];
          gest = { d0: distanta(a, b), z0: S.zoom, m: mijloc(a, b) };
          faraDesen = true;
          return;
        }
        if (atingeri.size > 2 || faraDesen) return;
      }
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      try { ov.setPointerCapture(e.pointerId); } catch { /* */ }
      opId = e.pointerId;
      incepe(pozitie(e), e.button === 2, e);
    });
    ov.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && atingeri.has(e.pointerId)) {
        atingeri.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        if (gest && atingeri.size >= 2) {
          const [a, b] = [...atingeri.values()], m = mijloc(a, b);
          setZoom(gest.z0 * distanta(a, b) / gest.d0, m);
          scena.scrollLeft -= m.x - gest.m.x; scena.scrollTop -= m.y - gest.m.y;
          gest.m = m;
          return;
        }
      }
      const p = pozitie(e);
      stareCursor.textContent = p.x >= 0 && p.y >= 0 && p.x < cv.width && p.y < cv.height ? `${Math.floor(p.x)}, ${Math.floor(p.y)} px` : '';
      if (op && e.pointerId === opId) {
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) op.muta(pozitie(ev), ev);
      } else if (!op && S.unealta === 'radiera' && e.pointerType === 'mouse') { // conturul radierei
        const s = marimeRadiera();
        octx.clearRect(0, 0, ov.width, ov.height);
        octx.strokeStyle = '#555'; octx.lineWidth = 1 / S.zoom;
        octx.strokeRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
    });
    const termina = (e, anulat) => {
      if (e.pointerType === 'touch') {
        atingeri.delete(e.pointerId);
        if (atingeri.size < 2) gest = null;
        if (!atingeri.size) faraDesen = false;
      }
      if (op && e.pointerId === opId) { const o = op; op = null; opId = null; if (anulat) o.anuleaza(); else o.gata(); actualizeazaUI(); }
    };
    ov.addEventListener('pointerup', (e) => termina(e, false));
    ov.addEventListener('pointercancel', (e) => termina(e, true));
    ov.addEventListener('pointerleave', () => { if (!op && S.unealta === 'radiera') octx.clearRect(0, 0, ov.width, ov.height); stareCursor.textContent = ''; });
    for (const el of [ov, selEl]) el.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mutarea și redimensionarea selecției
    selEl.addEventListener('pointerdown', (e) => {
      if (!fl || (e.button !== 0 && e.pointerType === 'mouse')) return;
      e.preventDefault(); e.stopPropagation();
      selEl.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY, fx: fl.x, fy: fl.y, fw: fl.w, fh: fl.h };
      const redim = e.target === selManer;
      if (!redim && (e.ctrlKey || e.metaKey)) { ctx.drawImage(selCv, fl.x, fl.y, fl.w, fl.h); schimbat(); } // lasă o copie
      const muta = (ev) => {
        const dx = (ev.clientX - start.x) / S.zoom, dy = (ev.clientY - start.y) / S.zoom;
        if (redim) {
          let w = Math.max(1, Math.round(start.fw + dx)), hh = Math.max(1, Math.round(start.fh + dy));
          if (ev.shiftKey) { const k = Math.max(w / start.fw, hh / start.fh); w = Math.max(1, Math.round(start.fw * k)); hh = Math.max(1, Math.round(start.fh * k)); }
          fl.w = w; fl.h = hh;
        } else { fl.x = Math.round(start.fx + dx); fl.y = Math.round(start.fy + dy); }
        pozFlotant();
      };
      const gata = () => { selEl.removeEventListener('pointermove', muta); selEl.removeEventListener('pointerup', gata); selEl.removeEventListener('pointercancel', gata); if (redim) { coaceFlotant(); randeazaFlotant(); } schimbat(); };
      selEl.addEventListener('pointermove', muta);
      selEl.addEventListener('pointerup', gata);
      selEl.addEventListener('pointercancel', gata);
    });

    // Mânerele pânzei: trage ca s-o faci mai mare sau mai mică
    for (const m of manere) m.addEventListener('pointerdown', (e) => {
      e.preventDefault(); m.setPointerCapture(e.pointerId);
      const d = m.dataset.d, sx = e.clientX, sy = e.clientY, w0 = cv.width, h0 = cv.height;
      let w = w0, hh = h0;
      pzContur.hidden = false;
      const muta = (ev) => {
        if (d !== 's') w = clamp(Math.round(w0 + (ev.clientX - sx) / S.zoom), 1, MAX_LATURA);
        if (d !== 'e') hh = clamp(Math.round(h0 + (ev.clientY - sy) / S.zoom), 1, MAX_LATURA);
        pzContur.style.width = `${w * S.zoom}px`; pzContur.style.height = `${hh * S.zoom}px`;
        stareDim.textContent = `${w} × ${hh} px`;
      };
      muta(e);
      const gata = () => { m.removeEventListener('pointermove', muta); m.removeEventListener('pointerup', gata); m.removeEventListener('pointercancel', gata); pzContur.hidden = true; redimPanza(w, hh); stare(); };
      m.addEventListener('pointermove', muta); m.addEventListener('pointerup', gata); m.addEventListener('pointercancel', gata);
    });

    scena.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(S.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX, y: e.clientY });
    }, { passive: false, signal: ac.signal });
    scena.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); scena.classList.add('peste'); } });
    scena.addEventListener('dragleave', () => scena.classList.remove('peste'));
    scena.addEventListener('drop', (e) => { e.preventDefault(); scena.classList.remove('peste'); insereazaImagine(e.dataTransfer.files[0]); });

    // ---------- Interfața ----------
    const radacina = h('div', { class: 'ap-desen' });
    const toasturi = h('div', { class: 'ap-desen-toasturi' });
    const toast = (text, tip = '') => {
      const t = h('div', { class: `ap-desen-toast ${tip}`, role: 'status' }, text);
      toasturi.append(t);
      setTimeout(() => t.classList.add('dispare'), 3200);
      setTimeout(() => t.remove(), 3800);
    };

    // Meniuri derulante (poziționate fix, ca să nu fie tăiate de bara de unelte)
    let meniuDeschis = null;
    function inchideMeniu() { if (meniuDeschis) { meniuDeschis.el.remove(); meniuDeschis.btn.setAttribute('aria-expanded', 'false'); meniuDeschis = null; } }
    function deschideMeniu(btn, continut) {
      const era = meniuDeschis?.btn === btn;
      inchideMeniu();
      if (era) return;
      const el = h('div', { class: 'ap-desen-meniu', role: 'menu' }, continut());
      radacina.append(el);
      const r = btn.getBoundingClientRect(), rr = el.getBoundingClientRect();
      el.style.left = `${clamp(r.left, 4, window.innerWidth - rr.width - 4)}px`;
      el.style.top = `${r.bottom + rr.height + 4 > window.innerHeight ? Math.max(4, r.top - rr.height - 4) : r.bottom + 4}px`;
      btn.setAttribute('aria-expanded', 'true');
      meniuDeschis = { el, btn };
      el.querySelector('button')?.focus({ preventScroll: true });
    }
    const articol = (text, fn, { kbd, bifat, icoana, dezactivat } = {}) => h('button', { type: 'button', role: bifat == null ? 'menuitem' : 'menuitemcheckbox', 'aria-checked': bifat == null ? null : String(!!bifat), disabled: dezactivat || null, onclick: () => { inchideMeniu(); fn(); } },
      h('span', { class: 'bif' }, bifat ? '✓' : ''), icoana || null, h('span', { class: 'txt' }, text), kbd ? h('kbd', {}, kbd) : null);
    const sep = () => h('hr');
    document.addEventListener('pointerdown', (e) => { if (meniuDeschis && !meniuDeschis.el.contains(e.target) && !meniuDeschis.btn.contains(e.target)) inchideMeniu(); }, sig);

    // Ferestre de dialog
    let modal = null;
    function dialog(titlu, corp, butoane) {
      return new Promise((res) => {
        const inchide = (v) => { fundal.remove(); modal = null; res(v); };
        const btns = butoane.map(([text, val, cls]) => h('button', { type: 'button', class: `ap-desen-btn ${cls || ''}`, onclick: () => { const r = typeof val === 'function' ? val() : val; if (r !== false) inchide(r); } }, text));
        const fundal = h('div', { class: 'ap-desen-modal' },
          h('div', { class: 'ap-desen-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu }, h('h2', {}, titlu), corp, h('div', { class: 'ap-desen-dlg-btn' }, btns)));
        fundal.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Escape') inchide(null);
          else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); btns.find((b) => b.classList.contains('prim'))?.click(); }
        });
        fundal.addEventListener('pointerdown', (e) => { if (e.target === fundal) inchide(null); });
        radacina.append(fundal); modal = fundal;
        (fundal.querySelector('input:not([type=range]):not([type=checkbox]), select') || btns.find((b) => b.classList.contains('prim')) || btns[0])?.focus();
        fundal.querySelector('input[type=text]')?.select();
      });
    }
    const camp = (eticheta, input) => h('label', { class: 'ap-desen-camp' }, h('span', {}, eticheta), input);
    const nr = (v, min, max) => h('input', { type: 'number', min, max, value: String(v), inputmode: 'numeric' });

    // --- Bara de titlu ---
    const numeEl = h('span', { class: 'ap-desen-nume' });
    function actualizeazaTitlu() {
      numeEl.textContent = `${S.modificat ? '• ' : ''}${S.titlu}`;
      numeEl.title = S.modificat ? 'Are modificări nesalvate (Ctrl+S)' : 'Salvat';
      document.title = `${S.titlu} – Desen – edudigi`;
    }
    const btnAnul = h('button', { type: 'button', class: 'ap-desen-tb', title: 'Anulare (Ctrl+Z)', 'aria-label': 'Anulare', onclick: anuleaza }, ico('anulare'));
    const btnRef = h('button', { type: 'button', class: 'ap-desen-tb', title: 'Refacere (Ctrl+Y)', 'aria-label': 'Refacere', onclick: reface }, ico('refacere'));
    const btnFisier = h('button', { type: 'button', class: 'ap-desen-meniubtn', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, 'Fișier');
    btnFisier.addEventListener('click', () => deschideMeniu(btnFisier, () => [
      articol('Nou', nou, { kbd: 'Ctrl+Alt+N' }),
      articol('Deschidere…', deschide, { kbd: 'Ctrl+O' }),
      articol('Salvare', () => salveaza(false), { kbd: 'Ctrl+S' }),
      articol('Salvare ca…', () => salveaza(true), { kbd: 'F12' }),
      sep(),
      articol('Inserare imagine din fișier…', async () => insereazaImagine(await alegeFisier('image/*'))),
      sep(),
      articol('Descărcare ca PNG', () => descarcaImagine('png')),
      articol('Descărcare ca JPG', () => descarcaImagine('jpg')),
      articol('Tipărire…', tipareste, { kbd: 'Ctrl+P' }),
      sep(),
      articol('Proprietăți imagine…', proprietati, { kbd: 'Ctrl+E' }),
    ]));
    const btnVedere = h('button', { type: 'button', class: 'ap-desen-meniubtn', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, 'Vizualizare');
    btnVedere.addEventListener('click', () => deschideMeniu(btnVedere, () => [
      articol('Mărire', () => mareste(), { kbd: 'Ctrl++' }),
      articol('Micșorare', () => micsoreaza(), { kbd: 'Ctrl+−' }),
      articol('100%', () => setZoom(1), { kbd: 'Ctrl+0' }),
      articol('Potrivire în fereastră', potriveste),
      sep(),
      articol('Liniatură cu pătrățele', comutaGrila, { bifat: S.grila, kbd: 'Ctrl+G' }),
      articol('Ecran complet', ecranComplet, { kbd: 'F11' }),
    ]));
    const btnSalv = h('button', { type: 'button', class: 'ap-desen-salv', title: 'Salvare (Ctrl+S)', onclick: () => salveaza(false) }, ico('salvare'), h('span', {}, 'Salvează'));
    const bara = h('div', { class: 'ap-desen-bara' },
      h('a', { class: 'ap-desen-inapoi', href: '#/aplicatii' }, '← Aplicații'),
      h('span', { class: 'ap-desen-sigla', 'aria-hidden': 'true' }, svg(P.pensula)),
      h('b', { class: 'ap-desen-numeapp' }, 'Desen'),
      btnFisier, btnVedere, btnAnul, btnRef,
      numeEl, h('span', { class: 'ap-desen-spatiu' }), btnSalv);

    // --- Panglica (bara de unelte) ---
    const grup = (eticheta, ...c) => h('div', { class: 'ap-desen-grup', role: 'group', 'aria-label': eticheta }, h('div', { class: 'ap-desen-grup-c' }, c), h('div', { class: 'ap-desen-grup-e' }, eticheta));
    const butoaneUnelte = {};
    const btnUnealta = (u, titlu, k) => (butoaneUnelte[u] = h('button', { type: 'button', class: 'ap-desen-u', title: titlu, 'aria-label': titlu, 'aria-pressed': 'false', onclick: () => setUnealta(u) }, ico(k)));
    const mic = (k, titlu, fn) => h('button', { type: 'button', class: 'ap-desen-mic', title: titlu, onclick: fn }, ico(k), h('span', {}, titlu.replace(/ \(.*/, '')));

    const gClip = grup('Clipboard', h('div', { class: 'ap-desen-stiva' }, mic('lipire', 'Lipire (Ctrl+V)', () => lipeste()), mic('decupare', 'Decupare (Ctrl+X)', decupeaza), mic('copiere', 'Copiere (Ctrl+C)', copiaza)));
    gClip.classList.add('clip');

    const btnSel = h('button', { type: 'button', class: 'ap-desen-mare', title: 'Selectare dreptunghiulară', 'aria-pressed': 'false', onclick: () => setUnealta('selectare') }, svg(P.selectare, 'ap-desen-ico mare'), h('span', {}, 'Selectare'));
    butoaneUnelte.selectare = btnSel;
    const btnSelMeniu = h('button', { type: 'button', class: 'ap-desen-sageata', title: 'Opțiuni de selectare', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, ico('sageataJos'));
    btnSelMeniu.addEventListener('click', () => deschideMeniu(btnSelMeniu, () => [
      articol('Selecție dreptunghiulară', () => setUnealta('selectare')),
      articol('Selectare totală', selecteazaTot, { kbd: 'Ctrl+A' }),
      sep(),
      articol('Decupare', decupeaza, { kbd: 'Ctrl+X', dezactivat: !fl }),
      articol('Copiere', copiaza, { kbd: 'Ctrl+C', dezactivat: !fl }),
      articol('Lipire', () => lipeste(), { kbd: 'Ctrl+V', dezactivat: !clip }),
      articol('Inserare imagine din fișier…', async () => insereazaImagine(await alegeFisier('image/*'))),
      sep(),
      articol('Selecție transparentă', () => { S.transparenta = !S.transparenta; if (fl) randeazaFlotant(); toast(S.transparenta ? 'Selecție transparentă: Culoarea 2 din selecție nu se mai vede.' : 'Selecție opacă.'); }, { bifat: S.transparenta }),
      sep(),
      articol('Ștergere selecție', stergeSelectia, { kbd: 'Delete', dezactivat: !fl }),
    ]));
    const btnRot = h('button', { type: 'button', class: 'ap-desen-mic', title: 'Rotire și răsturnare (a selecției sau a întregii imagini)', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, ico('rotire'), h('span', {}, 'Rotire ▾'));
    btnRot.addEventListener('click', () => deschideMeniu(btnRot, () => [
      h('p', { class: 'ap-desen-meniu-nota' }, fl ? 'Se aplică selecției' : 'Se aplică întregii imagini'),
      articol('Rotire la dreapta 90°', () => roteste('r90')),
      articol('Rotire la stânga 90°', () => roteste('r270')),
      articol('Rotire 180°', () => roteste('r180')),
      sep(),
      articol('Răsturnare verticală', () => roteste('fv')),
      articol('Răsturnare orizontală (în oglindă)', () => roteste('fh')),
    ]));
    const gImagine = grup('Imagine', h('div', { class: 'ap-desen-cu-sageata' }, btnSel, btnSelMeniu),
      h('div', { class: 'ap-desen-stiva' }, mic('trunchiere', 'Trunchiere', trunchiaza), mic('redim', 'Redimensionare', redimensionare), btnRot));

    const gUnelte = grup('Instrumente', h('div', { class: 'ap-desen-grila3' },
      btnUnealta('creion', 'Creion', 'creion'), btnUnealta('umplere', 'Umplere cu culoare', 'umplere'), btnUnealta('text', 'Text', 'text'),
      btnUnealta('radiera', 'Radieră (urma are Culoarea 2)', 'radiera'), btnUnealta('pipeta', 'Selector de culoare (pipetă)', 'pipeta'), btnUnealta('lupa', 'Lupă (clic dreapta: micșorare)', 'lupa')));

    const btnPensula = h('button', { type: 'button', class: 'ap-desen-mare', title: 'Pensule', 'aria-pressed': 'false', onclick: () => setUnealta('pensula') }, svg(P.pensula, 'ap-desen-ico mare'), h('span', {}, 'Pensule'));
    butoaneUnelte.pensula = btnPensula;
    const btnPensMeniu = h('button', { type: 'button', class: 'ap-desen-sageata', title: 'Alege pensula', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, ico('sageataJos'));
    btnPensMeniu.addEventListener('click', () => deschideMeniu(btnPensMeniu, () => PENSULE.map(([k, t]) => articol(t, () => { S.pensula = k; setUnealta('pensula'); }, { bifat: S.pensula === k }))));
    const gPensule = grup('Pensule', h('div', { class: 'ap-desen-cu-sageata' }, btnPensula, btnPensMeniu));

    const butoaneForme = {};
    const formeEl = h('div', { class: 'ap-desen-forme' }, FORME.map(([k, t]) => (butoaneForme[k] = h('button', { type: 'button', class: 'ap-desen-forma', title: `${t}${k === 'linie' ? ' (Shift: linie dreaptă)' : k === 'dreptunghi' ? ' (Shift: pătrat)' : k === 'elipsa' ? ' (Shift: cerc)' : ''}`, 'aria-label': t, 'aria-pressed': 'false', onclick: () => { S.forma = k; setUnealta('forma'); } }, icoForma(k)))));
    const btnContur = h('button', { type: 'button', class: 'ap-desen-mic', title: 'Conturul formei (Culoarea 1)', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    const btnUmplere = h('button', { type: 'button', class: 'ap-desen-mic', title: 'Umplerea formei (Culoarea 2)', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    btnContur.addEventListener('click', () => deschideMeniu(btnContur, () => [['unic', 'Culoare unică'], ['fara', 'Fără contur']].map(([k, t]) => articol(t, () => { S.contur = k; if (k === 'fara' && S.umplere === 'fara') S.umplere = 'unic'; actualizeazaUI(); }, { bifat: S.contur === k }))));
    btnUmplere.addEventListener('click', () => deschideMeniu(btnUmplere, () => [['fara', 'Fără umplere'], ['unic', 'Culoare unică (Culoarea 2)']].map(([k, t]) => articol(t, () => { S.umplere = k; if (k === 'fara') S.contur = 'unic'; actualizeazaUI(); }, { bifat: S.umplere === k }))));
    const gForme = grup('Forme', formeEl, h('div', { class: 'ap-desen-stiva' }, btnContur, btnUmplere));

    const btnGrosime = h('button', { type: 'button', class: 'ap-desen-mare', title: 'Dimensiune (grosimea liniei)', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    btnGrosime.addEventListener('click', () => deschideMeniu(btnGrosime, () => GROSIMI.map((g) => {
      const l = h('span', { class: 'ap-desen-linie' }); l.style.height = `${Math.min(g, 24)}px`;
      return articol(`${g} px`, () => { S.grosime = g; actualizeazaUI(); }, { bifat: S.grosime === g, icoana: l });
    })));
    const gDim = grup('Dimensiune', btnGrosime);

    // Culori
    const c1El = h('button', { type: 'button', class: 'ap-desen-culoare-act', onclick: () => { S.activa = 1; actualizeazaUI(); } }, h('span', { class: 'mostra' }), h('span', {}, 'Culoarea 1'));
    const c2El = h('button', { type: 'button', class: 'ap-desen-culoare-act', onclick: () => { S.activa = 2; actualizeazaUI(); } }, h('span', { class: 'mostra' }), h('span', {}, 'Culoarea 2'));
    const btnSchimba = h('button', { type: 'button', class: 'ap-desen-schimba', title: 'Schimbă între ele Culoarea 1 și Culoarea 2 (X)', 'aria-label': 'Schimbă culorile', onclick: () => { [S.c1, S.c2] = [S.c2, S.c1]; actualizeazaUI(); } }, ico('schimba'));
    const alegeCuloare = (c, sec) => { if (sec || S.activa === 2) S.c2 = c; else S.c1 = c; actualizeazaUI(); };
    const casuta = (c) => {
      const b = h('button', { type: 'button', class: 'ap-desen-pal', title: `${numeCuloare(c)} — clic: Culoarea ${S.activa}; clic dreapta: Culoarea 2`, 'aria-label': numeCuloare(c) });
      b.style.background = c;
      b.addEventListener('click', () => alegeCuloare(c, false));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); alegeCuloare(c, true); });
      return b;
    };
    const paletaEl = h('div', { class: 'ap-desen-paleta' });
    function deseneazaPaleta() {
      paletaEl.replaceChildren(...PALETA.map(casuta),
        ...Array.from({ length: 10 }, (_, i) => (particularizate[i] ? casuta(particularizate[i]) : h('span', { class: 'ap-desen-pal gol', title: 'Culoare particularizată (din Editare culori)' }))));
    }
    deseneazaPaleta();
    const btnEditCul = h('button', { type: 'button', class: 'ap-desen-mare ec', title: 'Editare culori (RGB)', onclick: () => editareCulori() }, svg(P.culori, 'ap-desen-ico mare'), h('span', {}, 'Editare culori'));
    const gCulori = grup('Culori', h('div', { class: 'ap-desen-active' }, c1El, c2El, btnSchimba), paletaEl, btnEditCul);

    const panglica = h('div', { class: 'ap-desen-panglica', role: 'toolbar', 'aria-label': 'Unelte de desen' }, gClip, gImagine, gUnelte, gPensule, gForme, gDim, gCulori);

    // Bara contextuală „Instrumente text”
    const selFont = h('select', { 'aria-label': 'Font', onchange: () => { S.font = selFont.value; stilText(); } }, Object.keys(FONTURI).map((f) => h('option', { value: f }, f)));
    const inMarime = h('input', { type: 'number', min: '6', max: '200', 'aria-label': 'Mărimea fontului', list: 'ap-desen-marimi', onchange: () => { S.marime = clamp(Number(inMarime.value) || 24, 6, 200); inMarime.value = String(S.marime); stilText(); } });
    const lista = h('datalist', { id: 'ap-desen-marimi' }, MARIMI.map((m) => h('option', { value: String(m) })));
    const comutator = (text, cheie, titlu, cls) => h('button', { type: 'button', class: `ap-desen-u text ${cls}`, title: titlu, 'aria-pressed': 'false', 'data-k': cheie, onclick: () => { S[cheie] = !S[cheie]; stilText(); actualizeazaUI(); tx?.el.focus(); } }, text);
    const btnB = comutator('B', 'aldin', 'Aldin (Bold)', 'b'), btnI = comutator('I', 'cursiv', 'Cursiv (Italic)', 'i'), btnU = comutator('S', 'subliniat', 'Subliniat (Underline)', 'u');
    const btnOpac = h('button', { type: 'button', class: 'ap-desen-mic', title: 'Fundalul textului', onclick: () => { S.opac = !S.opac; stilText(); actualizeazaUI(); tx?.el.focus(); } });
    const baraText = h('div', { class: 'ap-desen-ctx', hidden: true, role: 'toolbar', 'aria-label': 'Instrumente text' },
      h('b', {}, 'Instrumente text'), selFont, inMarime, lista, btnB, btnI, btnU, btnOpac,
      h('span', { class: 'ap-desen-nota' }, 'Clic pe desen, scrie, apoi clic în afara casetei ca să fixezi textul. Textul are Culoarea 1.'));

    // Bara de stare
    const stareCursor = h('span', { class: 'ap-desen-st-poz' });
    const stareSel = h('span', { class: 'ap-desen-st-sel' });
    const stareDim = h('span', { class: 'ap-desen-st-dim', title: 'Dimensiunea imaginii (Fișier → Proprietăți)' });
    const zoomEl = h('button', { type: 'button', class: 'ap-desen-zoomtxt', title: '100%', onclick: () => setZoom(1) });
    const zoomSlider = h('input', { type: 'range', min: '10', max: '800', step: '1', 'aria-label': 'Panoramare (zoom)', oninput: () => setZoom(Number(zoomSlider.value) / 100) });
    const baraStare = h('div', { class: 'ap-desen-stare' },
      h('span', { class: 'ap-desen-st-i' }, '✛'), stareCursor, h('span', { class: 'ap-desen-st-i' }, '⬚'), stareSel, h('span', { class: 'ap-desen-st-i' }, '▣'), stareDim,
      h('span', { class: 'ap-desen-spatiu' }),
      h('button', { type: 'button', class: 'ap-desen-zb', title: 'Micșorare', 'aria-label': 'Micșorare', onclick: () => micsoreaza() }, ico('minus')),
      zoomSlider,
      h('button', { type: 'button', class: 'ap-desen-zb', title: 'Mărire', 'aria-label': 'Mărire', onclick: () => mareste() }, ico('plus')),
      zoomEl,
      h('button', { type: 'button', class: 'ap-desen-zb lat', title: 'Potrivire în fereastră', onclick: potriveste }, 'Potrivire'));
    function stare() {
      stareDim.textContent = `${cv.width} × ${cv.height} px`;
      stareSel.textContent = fl ? `${fl.w} × ${fl.h} px` : '';
    }

    const tipar = h('div', { class: 'ap-desen-tipar' });
    const sarcina = window.EduSarcini?.bara ? window.EduSarcini.bara('desen', async () => lucrare()) : null;
    radacina.append(...[bara, sarcina, panglica, baraText, scena, baraStare, tipar, toasturi].filter(Boolean));

    // ----- Starea interfeței -----
    function setUnealta(u) {
      if (u !== S.unealta) {
        fixeazaText();
        if (u !== 'selectare') fixeazaFlotant();
        if (u === 'pipeta') S.unealtaAnt = S.unealta;
        S.unealta = u;
        octx.clearRect(0, 0, ov.width, ov.height);
      }
      actualizeazaUI();
    }
    function actualizeazaUI() {
      for (const [u, b] of Object.entries(butoaneUnelte)) b.setAttribute('aria-pressed', String(S.unealta === u));
      for (const [k, b] of Object.entries(butoaneForme)) b.setAttribute('aria-pressed', String(S.unealta === 'forma' && S.forma === k));
      pagina.dataset.unealta = S.unealta;
      c1El.querySelector('.mostra').style.background = S.c1; c2El.querySelector('.mostra').style.background = S.c2;
      c1El.setAttribute('aria-pressed', String(S.activa === 1)); c2El.setAttribute('aria-pressed', String(S.activa === 2));
      c1El.title = `Culoarea 1 (prim-plan): ${numeCuloare(S.c1)}`; c2El.title = `Culoarea 2 (fundal): ${numeCuloare(S.c2)}`;
      const l = h('span', { class: 'ap-desen-grosimi' }, [1, 3, 6].map((g) => { const x = h('i'); x.style.height = `${Math.min(S.grosime, 14) * g / 6 + 1}px`; return x; }));
      btnGrosime.replaceChildren(l, h('span', {}, `${S.grosime} px ▾`));
      btnContur.replaceChildren(svg(S.contur === 'fara' ? '<rect x="3.5" y="4.5" width="13" height="11" stroke-dasharray="2 2.5"/>' : '<rect x="3.5" y="4.5" width="13" height="11" stroke-width="2.4"/>'), h('span', { class: 'txt' }, `Contur: ${S.contur === 'fara' ? 'fără' : 'da'} ▾`));
      btnUmplere.replaceChildren(svg(S.umplere === 'fara' ? '<rect x="3.5" y="4.5" width="13" height="11"/>' : '<rect x="3.5" y="4.5" width="13" height="11" fill="currentColor"/>'), h('span', { class: 'txt' }, `Umplere: ${S.umplere === 'fara' ? 'fără' : 'da'} ▾`));
      btnPensula.title = `Pensule: ${PENSULE.find((p) => p[0] === S.pensula)[1]}`;
      btnAnul.disabled = !anulari.length && !fl && !tx; btnRef.disabled = !refaceri.length;
      baraText.hidden = S.unealta !== 'text';
      selFont.value = S.font; inMarime.value = String(S.marime);
      for (const b of [btnB, btnI, btnU]) b.setAttribute('aria-pressed', String(!!S[b.dataset.k]));
      btnOpac.replaceChildren(h('span', {}, S.opac ? 'Fundal: opac (Culoarea 2)' : 'Fundal: transparent'));
      grila.hidden = !S.grila;
      stilText();
    }
    function comutaGrila() { S.grila = !S.grila; actualizeazaUI(); }

    // ----- Fișiere -----
    async function intreabaSalvare() { // true = putem continua
      fixeazaText(); fixeazaFlotant();
      if (!S.modificat) return true;
      const r = await dialog('Desen', h('p', {}, `Salvezi modificările din „${S.titlu}”?`), [['Salvează', 'da', 'prim'], ['Nu salva', 'nu'], ['Anulare', null]]);
      if (r === 'da') return salveaza(false);
      return r === 'nu';
    }
    function incarca(c, titlu, fisierId, creat) {
      fixeazaText(); fl = null; pozFlotant();
      anulari.length = 0; refaceri.length = 0;
      restaurare(c);
      Object.assign(S, { titlu, fisierId, creat, modificat: false });
      potriveste(); actualizeazaTitlu(); actualizeazaUI(); stare();
      salveazaCiorna();
    }
    async function nou() {
      if (!(await intreabaSalvare())) return;
      const c = canvasNou(800, 500), g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 800, 500);
      incarca(c, 'Fără titlu', null, null);
    }
    function miniatura() {
      const k = Math.min(1, 220 / cv.width, 160 / cv.height), c = canvasNou(Math.round(cv.width * k), Math.round(cv.height * k));
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.8);
    }
    async function salveaza(ca) {
      fixeazaText(); fixeazaFlotant();
      const toate = (await store.toate().catch(() => [])).filter((f) => f.id !== CIORNA);
      let id = S.fisierId, titlu = S.titlu;
      if (!id || ca) {
        const inp = h('input', { type: 'text', maxlength: '80', value: S.titlu === 'Fără titlu' ? 'Desenul meu' : ca ? `${S.titlu} (copie)` : S.titlu });
        const err = h('p', { class: 'ap-desen-err', role: 'alert' });
        const nume = await dialog(ca ? 'Salvare ca' : 'Salvare', h('div', {}, camp('Numele desenului', inp), err,
          h('p', { class: 'ap-desen-nota' }, 'Desenul se păstrează în acest browser, pe acest calculator. Ca să-l iei cu tine, folosește Fișier → Descărcare ca PNG.')),
        [['Salvează', () => { const v = inp.value.trim(); if (!v) { err.textContent = 'Scrie un nume.'; return false; } return v; }, 'prim'], ['Anulare', null]]);
        if (!nume) return false;
        const exista = toate.find((f) => f.titlu.toLowerCase() === nume.toLowerCase());
        if (exista && exista.id !== S.fisierId) {
          const r = await dialog('Salvare', h('p', {}, `Există deja un desen cu numele „${exista.titlu}”. Îl înlocuiești?`), [['Înlocuiește', true, 'prim'], ['Anulare', null]]);
          if (!r) return false;
          id = exista.id;
        } else id = ca || !id ? idNou() : id;
        titlu = nume;
        if (ca || !S.fisierId) S.creat = Date.now();
      }
      const rec = { id, titlu, imagine: cv.toDataURL('image/png'), mini: miniatura(), w: cv.width, h: cv.height, creat: S.creat || Date.now(), actualizat: Date.now() };
      try {
        await store.put(rec);
        Object.assign(S, { fisierId: id, titlu, creat: rec.creat, modificat: false });
        actualizeazaTitlu(); actualizeazaUI(); salveazaCiorna();
        toast(`Salvat: „${titlu}”`);
        return true;
      } catch {
        toast('Nu am putut salva: spațiul din browser e plin. Descarcă desenul ca PNG și șterge desenele vechi.', 'eroare');
        return false;
      }
    }
    async function deschide() {
      fixeazaText(); fixeazaFlotant();
      const lista = h('div', { class: 'ap-desen-lista' });
      let inchideDlg = null;
      const deschideRec = async (f) => {
        if (!(await intreabaSalvare())) return;
        const img = await incarcaImagine(f.imagine);
        const c = canvasNou(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0);
        incarca(c, f.titlu, f.id, f.creat);
        toast(`Deschis: „${f.titlu}”`);
      };
      async function umpleLista() {
        const toate = (await store.toate().catch(() => [])).filter((f) => f.id !== CIORNA).sort((a, b) => b.actualizat - a.actualizat);
        lista.replaceChildren(...(toate.length ? toate.map((f) => {
          const img = h('img', { src: f.mini || f.imagine, alt: '' });
          return h('div', { class: 'ap-desen-fis' },
            h('button', { type: 'button', class: 'ap-desen-fis-desch', onclick: () => { inchideDlg(); deschideRec(f); } }, h('span', { class: 'mini' }, img), h('b', {}, f.titlu), h('span', {}, `${f.w} × ${f.h} px · ${cand(f.actualizat)}`)),
            h('div', { class: 'ap-desen-fis-act' },
              h('button', { type: 'button', class: 'ap-desen-link', onclick: async () => { const t = prompt('Numele nou:', f.titlu); if (t && t.trim()) { f.titlu = t.trim().slice(0, 80); await store.put(f); if (S.fisierId === f.id) { S.titlu = f.titlu; actualizeazaTitlu(); } umpleLista(); } } }, 'Redenumește'),
              h('button', { type: 'button', class: 'ap-desen-link', onclick: async () => { if (!confirm(`Ștergi desenul „${f.titlu}”? Nu poate fi recuperat.`)) return; await store.del(f.id); if (S.fisierId === f.id) { S.fisierId = null; S.modificat = true; actualizeazaTitlu(); } umpleLista(); } }, 'Șterge')));
        }) : [h('p', { class: 'ap-desen-nota' }, 'Nu ai încă desene salvate. Salvează cu Ctrl+S.')]));
      }
      await umpleLista();
      const dePeCalc = h('button', { type: 'button', class: 'ap-desen-btn', onclick: async () => {
        const f = await alegeFisier('image/*');
        if (!f) return;
        try {
          const img = await incarcaImagine(await citesteFisier(f));
          if (!(await intreabaSalvare())) return;
          const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
          const c = canvasNou(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k)), g = c.getContext('2d');
          g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
          inchideDlg();
          incarca(c, f.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Imagine', null, null);
          S.modificat = true; actualizeazaTitlu();
          if (k < 1) toast('Imaginea era foarte mare, așa că am micșorat-o.');
        } catch (e) { toast(e.message, 'eroare'); }
      } }, '📂 Deschide o imagine de pe calculator');
      const p = dialog('Deschidere', h('div', {}, dePeCalc, h('h3', {}, 'Desenele mele (în acest browser)'), lista), [['Închide', null]]);
      inchideDlg = () => modal?.querySelector('.ap-desen-dlg-btn button')?.click();
      await p;
    }
    function descarcaImagine(tip) {
      const c = imagineCompleta();
      const fin = tip === 'jpg' ? (() => { const j = canvasNou(c.width, c.height), g = j.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, j.width, j.height); g.drawImage(c, 0, 0); return j; })() : c;
      fin.toBlob((b) => { if (b) { descarca(`${numeFisierSigur(S.titlu === 'Fără titlu' ? 'desen' : S.titlu)}.${tip}`, b); toast(`Am descărcat desenul ca ${tip.toUpperCase()}.`); } }, tip === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
    }
    function tipareste() {
      tipar.replaceChildren(h('img', { src: imagineCompleta().toDataURL('image/png'), alt: S.titlu }));
      setTimeout(() => window.print(), 50);
    }
    async function lucrare() {
      fixeazaText(); fixeazaFlotant();
      let c = cv;
      const k = Math.min(1, LUCRARE_MAX / Math.max(cv.width, cv.height));
      if (k < 1) c = scaleaza(cv, Math.round(cv.width * k), Math.round(cv.height * k));
      return { titlu: S.titlu === 'Fără titlu' ? 'Desen' : S.titlu, tip: 'imagine', date: c.toDataURL('image/png'), latime: c.width, inaltime: c.height };
    }

    // ----- Dialoguri: Proprietăți, Redimensionare, Editare culori -----
    async function proprietati() {
      const w = nr(cv.width, 1, MAX_LATURA), hh = nr(cv.height, 1, MAX_LATURA);
      const preset = (a, b) => h('button', { type: 'button', class: 'ap-desen-chip', onclick: () => { w.value = String(a); hh.value = String(b); } }, `${a} × ${b}`);
      const r = await dialog('Proprietăți imagine', h('div', {},
        h('div', { class: 'ap-desen-rand' }, camp('Lățime (pixeli)', w), camp('Înălțime (pixeli)', hh)),
        h('div', { class: 'ap-desen-chips' }, preset(640, 480), preset(800, 500), preset(800, 600), preset(1024, 768), preset(1280, 720)),
        h('p', { class: 'ap-desen-nota' }, `Schimbă dimensiunea foii (pânzei), fără să micșoreze desenul. Zonele noi sunt albe. Maximum ${MAX_LATURA} px.`)),
      [['OK', () => [Number(w.value), Number(hh.value)], 'prim'], ['Anulare', null]]);
      if (r && r[0] > 0 && r[1] > 0) redimPanza(r[0], r[1]);
    }
    async function redimensionare() {
      fixeazaText();
      const tinta = fl ? 'selecția' : 'întreaga imagine';
      const W0 = fl ? fl.w : cv.width, H0 = fl ? fl.h : cv.height;
      let mod = 'procente';
      const oriz = nr(100, 1, 1000), vert = nr(100, 1, 1000), raport = h('input', { type: 'checkbox', checked: true });
      const inclX = nr(0, -89, 89), inclY = nr(0, -89, 89);
      const rezultat = h('p', { class: 'ap-desen-nota' });
      const calc = () => {
        const a = Number(oriz.value) || 0, b = Number(vert.value) || 0;
        return mod === 'procente' ? [Math.round(W0 * a / 100), Math.round(H0 * b / 100)] : [Math.round(a), Math.round(b)];
      };
      const arata = () => { const [a, b] = calc(); rezultat.textContent = `Dimensiune nouă: ${a} × ${b} px (acum: ${W0} × ${H0} px)`; };
      const leaga = (src, dst, vertical) => src.addEventListener('input', () => {
        if (raport.checked) { const v = Number(src.value) || 0; dst.value = String(mod === 'procente' ? v : Math.round(vertical ? v * W0 / H0 : v * H0 / W0)); }
        arata();
      });
      leaga(oriz, vert, false); leaga(vert, oriz, true);
      const btnMod = (m, t) => h('label', { class: 'ap-desen-radio' }, h('input', { type: 'radio', name: 'ap-desen-mod', checked: m === mod, onchange: () => {
        mod = m;
        if (m === 'procente') { oriz.value = '100'; vert.value = '100'; } else { oriz.value = String(W0); vert.value = String(H0); }
        arata();
      } }), t);
      arata();
      const r = await dialog('Redimensionare și înclinare', h('div', {},
        h('p', { class: 'ap-desen-nota' }, `Se aplică pentru ${tinta}.`),
        h('div', { class: 'ap-desen-rand' }, btnMod('procente', 'Procente'), btnMod('pixeli', 'Pixeli')),
        h('div', { class: 'ap-desen-rand' }, camp('Orizontal', oriz), camp('Vertical', vert)),
        h('label', { class: 'ap-desen-radio' }, raport, 'Menținere raport aspect'), rezultat,
        h('h3', {}, 'Înclinare (grade)'),
        h('div', { class: 'ap-desen-rand' }, camp('Orizontal', inclX), camp('Vertical', inclY))),
      [['OK', () => [...calc(), Number(inclX.value) || 0, Number(inclY.value) || 0], 'prim'], ['Anulare', null]]);
      if (!r) return;
      const [w, hh, ix, iy] = [clamp(r[0], 1, MAX_LATURA), clamp(r[1], 1, MAX_LATURA), clamp(r[2], -89, 89), clamp(r[3], -89, 89)];
      if (fl) {
        coaceFlotant();
        fl.cv = scaleaza(fl.cv, w, hh, ix, iy); fl.w = fl.cv.width; fl.h = fl.cv.height;
        randeazaFlotant(); schimbat();
      } else {
        const c = scaleaza(cv, w, hh, ix, iy, S.c2);
        if (c.width > MAX_LATURA || c.height > MAX_LATURA) return toast('Imaginea ar fi prea mare.', 'eroare');
        pas(); restaurare(c); schimbat();
      }
    }
    async function editareCulori() {
      let [r, g, b] = hexRgb(S.activa === 2 ? S.c2 : S.c1);
      const mostra = h('div', { class: 'ap-desen-mostra' });
      const nativ = h('input', { type: 'color', 'aria-label': 'Alege culoarea' });
      const hex = h('input', { type: 'text', maxlength: '7', class: 'ap-desen-hex', 'aria-label': 'Cod hexazecimal' });
      const canale = [['R', 'Roșu (Red)'], ['G', 'Verde (Green)'], ['B', 'Albastru (Blue)']].map(([k, t], i) => {
        const range = h('input', { type: 'range', min: '0', max: '255', 'aria-label': t, class: `c${k}` });
        const n = nr(0, 0, 255);
        n.setAttribute('aria-label', `${t}, valoare`);
        const set = (v) => { const x = clamp(Math.round(Number(v) || 0), 0, 255); if (i === 0) r = x; else if (i === 1) g = x; else b = x; actualizare(); };
        range.addEventListener('input', () => set(range.value)); n.addEventListener('input', () => set(n.value));
        return { range, n, el: h('div', { class: 'ap-desen-canal' }, h('b', {}, k), h('span', {}, t), range, n) };
      });
      function actualizare(dinHex = false) {
        const c = rgbHex(r, g, b);
        mostra.style.background = c; nativ.value = c; if (!dinHex) hex.value = c;
        [r, g, b].forEach((v, i) => { canale[i].range.value = String(v); canale[i].n.value = String(v); });
      }
      nativ.addEventListener('input', () => { [r, g, b] = hexRgb(nativ.value); actualizare(); });
      hex.addEventListener('input', () => { const v = hex.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) { [r, g, b] = hexRgb(`#${v.replace('#', '').toLowerCase()}`); actualizare(true); } });
      actualizare();
      const adauga = h('button', { type: 'button', class: 'ap-desen-btn', onclick: () => {
        const c = rgbHex(r, g, b);
        particularizate = [c, ...particularizate.filter((x) => x !== c)].slice(0, 10);
        lsScrie(LS_CULORI, particularizate); deseneazaPaleta();
        toast('Culoarea a fost adăugată la culorile particularizate (al treilea rând din paletă).');
      } }, 'Adăugare la culori particularizate');
      const rez = await dialog('Editare culori', h('div', {},
        h('div', { class: 'ap-desen-rand' }, mostra, h('div', {}, camp('Alege', nativ), camp('Cod', hex))),
        canale.map((c) => c.el),
        h('p', { class: 'ap-desen-nota' }, `Orice culoare se obține din Roșu, Verde și Albastru (RGB), fiecare de la 0 la 255. Culoarea se aplică pentru Culoarea ${S.activa}.`),
        adauga),
      [['OK', () => rgbHex(r, g, b), 'prim'], ['Anulare', null]]);
      if (rez) { if (S.activa === 2) S.c2 = rez; else S.c1 = rez; actualizeazaUI(); }
    }
    function ecranComplet() {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else radacina.requestFullscreen?.().catch(() => toast('Browserul nu permite ecranul complet aici.'));
    }

    // ----- Tastatura -----
    let pastaTratata = false;
    window.addEventListener('keydown', (e) => {
      if (!radacina.isConnected || modal) return;
      const t = e.target, inCamp = t.closest?.('input, textarea, select, [contenteditable]');
      const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (ctrl && k === 's') { e.preventDefault(); salveaza(e.shiftKey); return; }
      if (e.key === 'F12') { e.preventDefault(); salveaza(true); return; }
      if (inCamp) return;
      if (e.key === 'Escape' && meniuDeschis) { inchideMeniu(); return; }
      if (ctrl && e.altKey && k === 'n') { e.preventDefault(); nou(); return; }
      const sc = {
        z: () => (e.shiftKey ? reface() : anuleaza()), y: reface, o: deschide, p: tipareste, e: proprietati, a: selecteazaTot,
        c: copiaza, x: decupeaza, g: comutaGrila, '+': () => mareste(), '=': () => mareste(), '-': () => micsoreaza(), '0': () => setZoom(1),
      };
      if (ctrl && k === 'v') { // lipire: imagine din clipboard-ul sistemului (evenimentul paste) sau din cel intern
        pastaTratata = false;
        setTimeout(() => { if (!pastaTratata) lipeste(); }, 80);
        return;
      }
      if (ctrl && sc[k]) { e.preventDefault(); sc[k](); return; }
      if (ctrl) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { if (fl) { e.preventDefault(); stergeSelectia(); } return; }
      if (e.key === 'Escape') { fixeazaFlotant(); return; }
      if (fl && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') fl.x -= d; else if (e.key === 'ArrowRight') fl.x += d; else if (e.key === 'ArrowUp') fl.y -= d; else fl.y += d;
        pozFlotant(); return;
      }
      if (k === 'x' && !e.altKey) { [S.c1, S.c2] = [S.c2, S.c1]; actualizeazaUI(); }
    }, sig);
    window.addEventListener('paste', (e) => {
      if (!radacina.isConnected || modal || e.target.closest?.('input, textarea')) return;
      const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
      if (f && (!clip || clipSistem)) { e.preventDefault(); pastaTratata = true; insereazaImagine(f); }
      else { pastaTratata = true; e.preventDefault(); lipeste(); }
    }, sig);
    window.addEventListener('resize', () => inchideMeniu(), sig);

    // Ieșirea din aplicație: oprim ascultătorii și păstrăm ciorna
    window.addEventListener('hashchange', () => {
      if (tCiorna || tx || fl) salveazaCiorna();
      ac.abort();
      document.title = 'edudigi';
    }, { once: true });
    window.addEventListener('beforeunload', () => { if (tCiorna) salveazaCiorna(); }, sig);

    // ----- Pornire: continuăm ciorna, dacă există -----
    panzaNoua(800, 500);
    show(h('div', { class: 'lab-ecran' }, radacina));
    actualizeazaTitlu(); actualizeazaUI(); stare();
    potriveste();
    try {
      const c = await store.get(CIORNA);
      if (c?.imagine && radacina.isConnected) {
        const img = await incarcaImagine(c.imagine);
        const cc = canvasNou(img.naturalWidth, img.naturalHeight); cc.getContext('2d').drawImage(img, 0, 0);
        restaurare(cc);
        Object.assign(S, { titlu: c.titlu || 'Fără titlu', fisierId: c.fisierId || null, creat: c.creat || null, modificat: !!c.modificat });
        potriveste(); actualizeazaTitlu(); actualizeazaUI(); stare();
      }
    } catch { /* pornim cu o pânză goală */ }
  }
})();

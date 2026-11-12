'use strict';
// Studio de animație: pentru clasa a VI-a (Unitatea 2 · Animații grafice și modele 3D).
// Două moduri în aceeași aplicație:
//  1) Animație cadru cu cadru (ca un flipbook): desenezi fiecare cadru, cu foaie de ceapă și FPS reglabil;
//  2) Animație cu personaje și cronologie (ca Toontastic / animațiile din PowerPoint): decoruri, personaje,
//     efecte de intrare, mișcare, transformare, ieșire și sunet, cu temporizare (start, durată, întârziere).
// Proiectele se păstrează în browser (IndexedDB, cu localStorage de rezervă); se exportă GIF, WebM și PNG.
(() => {
  const { h, show, routes } = window.EduApp;

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-animatie', ST = 'proiecte', LS = 'edudigi_animatie_proiecte', LS_PREF = 'edudigi_animatie_pref';
  const CIORNA = { cadre: '__ciorna_cadre', scene: '__ciorna_scene' };
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

  // ---------- Utilitare ----------
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const r1 = (v) => Math.round(v * 10) / 10;
  const sec = (v) => `${(Math.round(v * 100) / 100).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} s`;
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}, ${ora}`;
  };
  const canvasNou = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; };
  const copie = (src) => { const c = canvasNou(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; };
  const incarcaImagine = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Imagine invalidă')); i.src = src; });
  const numeFisierSigur = (s) => (s || 'animatie').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'animatie';
  function descarca(nume, blob) {
    const a = h('a', { href: URL.createObjectURL(blob), download: nume });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const blobDinCanvas = (c, tip = 'image/png') => new Promise((res) => c.toBlob(res, tip));
  const pauza = (ms = 0) => new Promise((r) => setTimeout(r, ms));
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
  const easeOut = (p) => 1 - (1 - p) ** 3;
  const easeBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2; };
  const bounce = (p) => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  };
  // Numere pseudo-aleatoare cu sămânță (decorurile arată la fel de fiecare dată)
  const aleator = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ---------- Pictograme (SVG 20×20, desenate cu linie) ----------
  const P = {
    film: '<rect x="2.5" y="4" width="15" height="12" rx="2"/><path d="M2.5 7.5h15M2.5 12.5h15M6 4v3.5M10 4v3.5M14 4v3.5M6 12.5V16M10 12.5V16M14 12.5V16"/>',
    masca: '<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17.5c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/>',
    salvare: '<path d="M4 3h10l3 3v11H4z"/><path d="M7 3v4.5h6V3M7 17v-5h7v5"/>',
    anulare: '<path d="M7.5 4.5L3.5 8.5l4 4"/><path d="M3.5 8.5h8.5a4.5 4.5 0 0 1 0 9H9"/>',
    refacere: '<path d="M12.5 4.5l4 4-4 4"/><path d="M16.5 8.5H8a4.5 4.5 0 0 0 0 9h3"/>',
    play: '<path d="M6 3.8v12.4L16 10z" fill="currentColor"/>',
    pauza: '<path d="M6.5 4v12M13.5 4v12" stroke-width="3"/>',
    stop: '<rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor"/>',
    ecran: '<path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5"/>',
    creion: '<path d="M3.5 16.5l1-4 9-9a2 2 0 0 1 3 3l-9 9z"/><path d="M12 5l3 3"/>',
    pensula: '<path d="M17 3l-7 8"/><path d="M9 10.5l1.5 1.5c0 3-2 5-6.5 4.5 1.3-1 1-2.5 1.5-3.8.6-1.6 2-2.6 3.5-2.2z"/>',
    radiera: '<path d="M7 17h10"/><path d="M3.6 12.4l8-8a1.4 1.4 0 0 1 2 0l3 3a1.4 1.4 0 0 1 0 2L10 16H7.2z"/><path d="M7.5 8.5l5 5"/>',
    umplere: '<path d="M3.8 9.2L9.5 3.5l6.2 6.2-5.7 5.7a1.6 1.6 0 0 1-2.2 0l-4-4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4 10h11.5"/><path d="M17.5 13s1.5 1.8 1.5 3a1.5 1.5 0 0 1-3 0c0-1.2 1.5-3 1.5-3z"/>',
    linie: '<path d="M3.5 16.5l13-13"/>',
    dreptunghi: '<rect x="3" y="5" width="14" height="10" rx="1"/>',
    elipsa: '<ellipse cx="10" cy="10" rx="7.5" ry="5.5"/>',
    mutare: '<path d="M10 2.5v15M2.5 10h15"/><path d="M7.5 5L10 2.5 12.5 5M7.5 15l2.5 2.5 2.5-2.5M5 7.5L2.5 10 5 12.5M15 7.5l2.5 2.5-2.5 2.5"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    minus: '<path d="M4 10h12"/>',
    duplica: '<rect x="6.5" y="6.5" width="10" height="10" rx="1.5"/><path d="M13.5 6.5V4.5a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 4.5V12a1.5 1.5 0 0 0 1.5 1.5h2"/>',
    sterge: '<path d="M4 5.5h12M8 5.5V3.5h4v2M5.5 5.5l.8 11h7.4l.8-11"/><path d="M8.5 8.5v5M11.5 8.5v5"/>',
    stanga: '<path d="M12 4l-6 6 6 6"/>',
    dreapta: '<path d="M8 4l6 6-6 6"/>',
    sus: '<path d="M4 12l6-6 6 6"/>',
    jos: '<path d="M4 8l6 6 6-6"/>',
    ceapa: '<rect x="2.5" y="2.5" width="10" height="10" rx="1.5" stroke-dasharray="2 2"/><rect x="7.5" y="7.5" width="10" height="10" rx="1.5"/>',
    grila: '<path d="M3 3h14v14H3zM3 7.7h14M3 12.3h14M7.7 3v14M12.3 3v14"/>',
    viteza: '<path d="M3 14a7 7 0 1 1 14 0"/><path d="M10 14l3.5-4.5"/><circle cx="10" cy="14" r="1.2" fill="currentColor"/>',
    bucla: '<path d="M4 9a5 5 0 0 1 5-5h4.5"/><path d="M11.5 1.8L14 4l-2.5 2.2"/><path d="M16 11a5 5 0 0 1-5 5H6.5"/><path d="M8.5 18.2L6 16l2.5-2.2"/>',
    primul: '<path d="M5 4v12M15 4l-7 6 7 6"/>',
    ultimul: '<path d="M15 4v12M5 4l7 6-7 6"/>',
    pasInainte: '<path d="M5 4l7 6-7 6z" fill="currentColor"/><path d="M15 4v12"/>',
    pasInapoi: '<path d="M15 4l-7 6 7 6z" fill="currentColor"/><path d="M5 4v12"/>',
    gif: '<rect x="2" y="4.5" width="16" height="11" rx="2"/><path d="M8 8.3H6.2v3.4H8V10.3H7M10.5 8.3v3.4M13 11.7V8.3h2M13 10h1.6"/>',
    video: '<rect x="2.5" y="5" width="11" height="10" rx="1.5"/><path d="M13.5 9l4-2.5v7l-4-2.5"/>',
    imagine: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><circle cx="7" cy="8" r="1.5"/><path d="M2.5 14l4.5-4 3.5 3 2.5-2 4.5 4"/>',
    deschide: '<path d="M2.5 15.5V4.5h5l2 2h6v2"/><path d="M2.5 15.5l2.5-7h13l-2.5 7z"/>',
    nou: '<path d="M5 2.5h6.5L15 6v11.5H5z"/><path d="M11.5 2.5V6H15"/><path d="M10 9v5M7.5 11.5h5"/>',
    descarca: '<path d="M10 3v10M6 9.5l4 4 4-4"/><path d="M3.5 14.5v2h13v-2"/>',
    incarca: '<path d="M10 14V4M6 7.5l4-4 4 4"/><path d="M3.5 14.5v2h13v-2"/>',
    decor: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><path d="M2.5 13l4-5 3 3.5 2.5-2.5 5 4.5"/><circle cx="13.5" cy="7" r="1.3"/>',
    personaj: '<circle cx="10" cy="10" r="7.5"/><circle cx="7.5" cy="8.5" r=".8" fill="currentColor"/><circle cx="12.5" cy="8.5" r=".8" fill="currentColor"/><path d="M6.8 12a3.8 3.8 0 0 0 6.4 0"/>',
    text: '<path d="M4 5V3.5h12V5"/><path d="M10 3.5v13"/><path d="M7.5 16.5h5"/>',
    balon: '<path d="M3 4.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3.5v-3.5a2 2 0 0 1-2-2z"/>',
    scena: '<rect x="2.5" y="4" width="15" height="10" rx="1.5"/><path d="M6 17.5h8"/><path d="M10 7v4M8 9h4"/>',
    microfon: '<rect x="7" y="2.5" width="6" height="10" rx="3"/><path d="M4.5 10a5.5 5.5 0 0 0 11 0M10 15.5v2.5"/>',
    muzica: '<path d="M7.5 15V4.5l9-2V13"/><circle cx="5.5" cy="15" r="2"/><circle cx="14.5" cy="13" r="2"/>',
    sunet: '<path d="M3 8h3l4-3.5v11L6 12H3z"/><path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5a7 7 0 0 1 0 10"/>',
    intrare: '<path d="M2.5 10h8M7.5 6.5l3.5 3.5-3.5 3.5"/><path d="M12 3.5h4.5v13H12"/>',
    miscare: '<path d="M3 15c2-7 5 0 7-5s4-5 6.5-5" stroke-dasharray="2 2"/><circle cx="16.5" cy="5" r="1.8" fill="currentColor"/><circle cx="3" cy="15" r="1.4"/>',
    transf: '<rect x="3" y="7" width="8" height="8" rx="1"/><path d="M11 4.5h4.5V9"/><path d="M15.5 4.5l-4 4"/>',
    iesire: '<path d="M8 3.5H3.5v13H8"/><path d="M8.5 10h9M14.5 6.5L18 10l-3.5 3.5"/>',
    stea: '<path d="M10 2.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L10 14.3l-4.6 2.5.9-5.2L2.5 8l5.2-.7z"/>',
    ceas: '<circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/>',
    clic: '<path d="M6 3l9 6.5-4 1 2.5 4.5-2 1-2.5-4.5L6 14z"/>',
    simultan: '<path d="M4 6h12M4 10h12M4 14h12"/>',
    dupa: '<path d="M3 7h7M10 13h7"/><path d="M10 7v6"/>',
    verifica: '<path d="M3.5 10.5l4 4 9-9"/>',
    fata: '<rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor"/><rect x="3" y="3" width="10" height="10" rx="1"/>',
    spate: '<rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
    oglinda: '<path d="M10 2.5v15"/><path d="M8 5L3 15h5zM12 5l5 10h-5z"/>',
    carte: '<path d="M10 5c-2-1.5-4.5-2-7-1.5v12c2.5-.5 5 0 7 1.5 2-1.5 4.5-2 7-1.5v-12c-2.5-.5-5 0-7 1.5zM10 5v12"/>',
    lupa: '<circle cx="8.5" cy="8.5" r="5"/><path d="M12.2 12.2L17 17"/>',
    depanare: '<ellipse cx="10" cy="11.5" rx="4" ry="5"/><path d="M10 6.5v10M6 10H3M17 10h-3M6.2 14.5L3.5 16.5M13.8 14.5l2.7 2M7.5 6.8L6 4.5M12.5 6.8L14 4.5"/>',
    x: '<path d="M5 5l10 10M15 5L5 15"/>',
    sageataJos: '<path d="M6 8l4 4 4-4"/>',
    info: '<circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.3v.2"/>',
    atentie: '<path d="M10 3l8 14H2z"/><path d="M10 8v4M10 14.3v.2"/>',
  };
  const svg = (inner, cls = 'ap-animatie-ico') => h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>` });
  const ico = (k, cls) => svg(P[k], cls);

  // ---------- Desen: ajutoare pentru personaje și decoruri (canvas) ----------
  const CONTUR = '#2a2230';
  const PIELE = '#f5c9a5';
  function umple(c, f, lw) {
    if (f) { c.fillStyle = f; c.fill(); }
    if (lw) { c.lineWidth = lw; c.strokeStyle = CONTUR; c.lineJoin = 'round'; c.stroke(); }
  }
  const cerc = (c, x, y, r, f, lw = 3) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); umple(c, f, lw); };
  const elip = (c, x, y, rx, ry, f, lw = 3, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); umple(c, f, lw); };
  const drept = (c, x, y, w, hh, r, f, lw = 3) => { c.beginPath(); c.roundRect(x, y, w, hh, r); umple(c, f, lw); };
  const poli = (c, pts, f, lw = 3, inchis = true) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (inchis) c.closePath(); umple(c, f, lw); };
  // Membru (braț/picior): linie groasă cu contur
  function membru(c, pts, w, col) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lw, st] of [[w + 6, CONTUR], [w, col]]) {
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.lineWidth = lw; c.strokeStyle = st; c.stroke();
    }
  }
  function ochi(c, x, y, r = 6) {
    cerc(c, x, y, r, '#fff', 2);
    cerc(c, x + r * 0.15, y + r * 0.1, r * 0.55, CONTUR, 0);
    cerc(c, x + r * 0.35, y - r * 0.2, r * 0.18, '#fff', 0);
  }
  function zambet(c, x, y, w, lw = 3) { c.beginPath(); c.arc(x, y - w * 0.4, w, Math.PI * 0.2, Math.PI * 0.8); c.lineWidth = lw; c.strokeStyle = CONTUR; c.lineCap = 'round'; c.stroke(); }
  const obraji = (c, x, y, d) => { c.globalAlpha *= 0.45; cerc(c, x - d, y, 5, '#ff7b9c', 0); cerc(c, x + d, y, 5, '#ff7b9c', 0); c.globalAlpha /= 0.45; };
  // Nuanță mai închisă/deschisă a unei culori #rrggbb
  function nuanta(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = (v) => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  // ---------- Personaje și obiecte (desenate în jurul originii) ----------
  // w, h: cutia pentru selecție; culoare: culoarea principală (se poate schimba)
  const PERSONAJE = {
    fata: { nume: 'Fată', w: 96, h: 180, culoare: '#F21F4B', draw(c, col) {
      membru(c, [[-14, 40], [-15, 80]], 9, PIELE); membru(c, [[14, 40], [15, 80]], 9, PIELE);
      elip(c, -17, 84, 12, 6, '#3b2a4a'); elip(c, 17, 84, 12, 6, '#3b2a4a');
      membru(c, [[-20, -14], [-36, 10], [-40, 30]], 8, PIELE); membru(c, [[20, -14], [36, 10], [40, 30]], 8, PIELE);
      poli(c, [[-18, -22], [18, -22], [34, 46], [-34, 46]], col);
      poli(c, [[-10, -22], [0, -10], [10, -22]], '#fff', 2);
      cerc(c, -30, -58, 11, '#6b3b22'); cerc(c, 30, -58, 11, '#6b3b22');
      cerc(c, 0, -52, 28, PIELE);
      c.beginPath(); c.arc(0, -56, 29, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(10, -66, -4, -62); c.quadraticCurveTo(-18, -60, -27, -64); umple(c, '#7a4428', 3);
      cerc(c, -30, -60, 4, col, 2); cerc(c, 30, -60, 4, col, 2);
      ochi(c, -10, -52); ochi(c, 10, -52); obraji(c, 0, -42, 16); zambet(c, 0, -38, 8);
    } },
    baiat: { nume: 'Băiat', w: 96, h: 180, culoare: '#1F7FD1', draw(c, col) {
      membru(c, [[-12, 36], [-13, 80]], 11, '#33415c'); membru(c, [[12, 36], [13, 80]], 11, '#33415c');
      elip(c, -16, 84, 13, 6, '#222'); elip(c, 16, 84, 13, 6, '#222');
      membru(c, [[-22, -14], [-38, 8], [-40, 28]], 9, col); membru(c, [[22, -14], [38, 8], [40, 28]], 9, col);
      cerc(c, -40, 32, 6, PIELE, 2); cerc(c, 40, 32, 6, PIELE, 2);
      drept(c, -24, -22, 48, 62, 12, col);
      poli(c, [[-8, -22], [0, -12], [8, -22]], PIELE, 2);
      c.font = 'bold 22px Arial, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('6', 0, 10);
      cerc(c, 0, -52, 28, PIELE);
      c.beginPath(); c.arc(0, -56, 29, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(22, -66); c.lineTo(12, -70); c.lineTo(4, -64); c.lineTo(-6, -70); c.lineTo(-16, -64); c.lineTo(-26, -66); umple(c, '#2b2b2b', 3);
      ochi(c, -10, -50); ochi(c, 10, -50); obraji(c, 0, -40, 16); zambet(c, 0, -36, 9);
    } },
    robot: { nume: 'Robot', w: 110, h: 170, culoare: '#9aa6b8', draw(c, col) {
      drept(c, -26, 44, 18, 36, 4, nuanta(col, -0.25)); drept(c, 8, 44, 18, 36, 4, nuanta(col, -0.25));
      drept(c, -32, 76, 28, 10, 4, '#555'); drept(c, 4, 76, 28, 10, 4, '#555');
      membru(c, [[-34, -8], [-50, 18], [-46, 38]], 10, nuanta(col, -0.25)); membru(c, [[34, -8], [50, 18], [46, 38]], 10, nuanta(col, -0.25));
      cerc(c, -46, 42, 8, '#555'); cerc(c, 46, 42, 8, '#555');
      drept(c, -36, -18, 72, 66, 10, col);
      drept(c, -20, -4, 40, 26, 6, '#2e3b4e', 2);
      cerc(c, -10, 9, 4, '#3EC6E0', 0); cerc(c, 2, 9, 4, '#F29A1F', 0); cerc(c, 13, 9, 4, '#22c55e', 0);
      drept(c, -8, -26, 16, 10, 2, '#777');
      drept(c, -32, -82, 64, 56, 12, col);
      membru(c, [[0, -82], [0, -96]], 3, '#555'); cerc(c, 0, -99, 6, '#F21F4B');
      drept(c, -22, -70, 44, 22, 8, '#2e3b4e', 2);
      cerc(c, -10, -59, 6, '#7ff3ff', 0); cerc(c, 10, -59, 6, '#7ff3ff', 0);
      drept(c, -12, -42, 24, 6, 3, '#2e3b4e', 0);
      cerc(c, -36, -56, 6, '#777'); cerc(c, 36, -56, 6, '#777');
    } },
    pisica: { nume: 'Pisică', w: 130, h: 120, culoare: '#F29A1F', draw(c, col) {
      c.beginPath(); c.moveTo(42, 18); c.bezierCurveTo(78, 10, 72, -40, 56, -30); c.lineWidth = 15; c.strokeStyle = CONTUR; c.lineCap = 'round'; c.stroke(); c.lineWidth = 9; c.strokeStyle = col; c.stroke();
      elip(c, 6, 22, 44, 28, col);
      membru(c, [[-20, 36], [-20, 50]], 10, col); membru(c, [[-4, 38], [-4, 50]], 10, col); membru(c, [[22, 38], [22, 50]], 10, col); membru(c, [[36, 34], [36, 50]], 10, col);
      poli(c, [[-52, -36], [-46, -62], [-28, -44]], col); poli(c, [[-10, -44], [6, -62], [10, -34]], col);
      poli(c, [[-47, -42], [-45, -54], [-36, -46]], '#ffb3c1', 0); poli(c, [[-4, -44], [4, -54], [6, -40]], '#ffb3c1', 0);
      elip(c, -22, -22, 34, 28, col);
      ochi(c, -34, -26, 6); ochi(c, -12, -26, 6);
      poli(c, [[-26, -14], [-20, -14], [-23, -10]], '#ff7b9c', 1.5);
      c.beginPath(); c.moveTo(-23, -10); c.quadraticCurveTo(-27, -4, -31, -7); c.moveTo(-23, -10); c.quadraticCurveTo(-19, -4, -15, -7); c.lineWidth = 2; c.strokeStyle = CONTUR; c.stroke();
      c.beginPath(); for (const s of [-1, 1]) { c.moveTo(-23 + s * 12, -12); c.lineTo(-23 + s * 30, -16); c.moveTo(-23 + s * 12, -9); c.lineTo(-23 + s * 30, -8); } c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(-6, 8); c.lineTo(4, 26); c.moveTo(14, 4); c.lineTo(22, 22); c.lineWidth = 4; c.strokeStyle = nuanta(col, -0.2); c.stroke();
    } },
    caine: { nume: 'Câine', w: 140, h: 120, culoare: '#b07a4f', draw(c, col) {
      c.beginPath(); c.moveTo(46, 6); c.quadraticCurveTo(66, -6, 62, -26); c.lineWidth = 14; c.strokeStyle = CONTUR; c.lineCap = 'round'; c.stroke(); c.lineWidth = 8; c.strokeStyle = col; c.stroke();
      elip(c, 10, 18, 46, 26, col);
      elip(c, 20, 16, 16, 12, nuanta(col, 0.45), 0);
      for (const x of [-22, -6, 26, 40]) membru(c, [[x, 34], [x, 52]], 11, col);
      elip(c, -34, -18, 30, 28, col);
      elip(c, -58, -8, 18, 14, nuanta(col, 0.45));
      elip(c, -14, -24, 10, 22, nuanta(col, -0.35), 3, -0.4);
      cerc(c, -70, -12, 6, CONTUR, 0);
      ochi(c, -40, -26, 6);
      c.beginPath(); c.moveTo(-66, 0); c.quadraticCurveTo(-58, 6, -50, 0); c.lineWidth = 2.5; c.strokeStyle = CONTUR; c.stroke();
      drept(c, -26, -2, 30, 7, 3, '#F21F4B', 2); cerc(c, -10, 8, 5, '#ffd34d', 2);
    } },
    pasare: { nume: 'Pasăre', w: 100, h: 80, culoare: '#3EC6E0', draw(c, col) {
      poli(c, [[30, 0], [50, -12], [48, 10]], nuanta(col, -0.2));
      elip(c, 0, 4, 34, 26, col);
      elip(c, 4, 12, 18, 12, nuanta(col, 0.5), 0);
      c.beginPath(); c.moveTo(-2, -2); c.quadraticCurveTo(18, -40, 32, -14); c.quadraticCurveTo(16, -8, -2, -2); umple(c, nuanta(col, -0.2));
      cerc(c, -22, -10, 18, col);
      ochi(c, -26, -14, 5);
      poli(c, [[-38, -8], [-52, -3], [-38, 0]], '#F29A1F', 2);
      membru(c, [[-6, 28], [-8, 38]], 2, '#F29A1F'); membru(c, [[8, 28], [8, 38]], 2, '#F29A1F');
    } },
    peste: { nume: 'Pește', w: 120, h: 80, culoare: '#ff8a3d', draw(c, col) {
      poli(c, [[34, 0], [58, -24], [54, 0], [58, 24]], nuanta(col, -0.15));
      poli(c, [[-4, -22], [14, -38], [20, -20]], nuanta(col, -0.15));
      elip(c, -4, 0, 44, 28, col);
      c.save(); c.beginPath(); c.ellipse(-4, 0, 44, 28, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#fff'; c.fillRect(-14, -30, 10, 60); c.fillRect(12, -30, 8, 60); c.restore();
      elip(c, -4, 0, 44, 28, null);
      ochi(c, -28, -6, 7);
      c.beginPath(); c.arc(-40, 8, 5, 0.2, Math.PI * 0.8); c.lineWidth = 2.5; c.strokeStyle = CONTUR; c.stroke();
      cerc(c, -60, -18, 4, 'rgba(255,255,255,.7)', 1.5); cerc(c, -66, -30, 3, 'rgba(255,255,255,.7)', 1.5);
    } },
    soare: { nume: 'Soare', w: 140, h: 140, culoare: '#ffcc33', draw(c, col) {
      c.save();
      for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); poli(c, [[-9, -44], [0, -66], [9, -44]], nuanta(col, -0.1), 2.5); }
      c.restore();
      cerc(c, 0, 0, 44, col);
      ochi(c, -14, -8, 7); ochi(c, 14, -8, 7); obraji(c, 0, 8, 24); zambet(c, 0, 12, 14, 3.5);
    } },
    nor: { nume: 'Nor', w: 170, h: 100, culoare: '#ffffff', draw(c, col) {
      c.beginPath(); c.arc(-46, 12, 28, Math.PI * 0.5, Math.PI * 1.5); c.arc(-14, -16, 36, Math.PI * 1.05, Math.PI * 1.85); c.arc(28, -10, 30, Math.PI * 1.25, Math.PI * 1.95); c.arc(52, 14, 26, Math.PI * 1.5, Math.PI * 0.5); c.closePath(); umple(c, col);
      ochi(c, -14, 0, 5); ochi(c, 12, 0, 5); obraji(c, -1, 12, 20); zambet(c, -1, 14, 7, 2.5);
    } },
    masina: { nume: 'Mașină', w: 190, h: 100, culoare: '#F21F4B', draw(c, col) {
      c.beginPath(); c.moveTo(-86, 20); c.lineTo(-86, -6); c.quadraticCurveTo(-84, -16, -66, -18); c.lineTo(-44, -20); c.lineTo(-24, -46); c.lineTo(34, -46); c.lineTo(56, -18); c.lineTo(80, -14); c.quadraticCurveTo(90, -10, 90, 4); c.lineTo(90, 20); c.closePath(); umple(c, col);
      poli(c, [[-18, -40], [2, -40], [2, -20], [-34, -20]], '#bfeefd', 2.5); poli(c, [[8, -40], [30, -40], [46, -20], [8, -20]], '#bfeefd', 2.5);
      drept(c, 74, -8, 12, 8, 3, '#ffe27a', 2); drept(c, -86, -6, 8, 8, 2, '#ff9b9b', 2);
      c.beginPath(); c.moveTo(-10, -12); c.lineTo(-2, -12); c.lineWidth = 3; c.strokeStyle = CONTUR; c.stroke();
      for (const x of [-50, 52]) { cerc(c, x, 22, 20, '#2b2b2b'); cerc(c, x, 22, 9, '#cfd5dd', 2); }
    } },
    racheta: { nume: 'Rachetă', w: 100, h: 190, culoare: '#e8edf5', draw(c, col) {
      poli(c, [[-10, 66], [0, 96], [10, 66]], '#ffb020', 0); poli(c, [[-5, 66], [0, 84], [5, 66]], '#fff3a0', 0);
      poli(c, [[-24, 30], [-46, 70], [-20, 62]], '#F21F4B'); poli(c, [[24, 30], [46, 70], [20, 62]], '#F21F4B');
      c.beginPath(); c.moveTo(0, -90); c.bezierCurveTo(34, -60, 30, 20, 22, 66); c.lineTo(-22, 66); c.bezierCurveTo(-30, 20, -34, -60, 0, -90); umple(c, col);
      c.save(); c.beginPath(); c.moveTo(0, -90); c.bezierCurveTo(34, -60, 30, 20, 22, 66); c.lineTo(-22, 66); c.bezierCurveTo(-30, 20, -34, -60, 0, -90); c.clip();
      c.fillStyle = '#F21F4B'; c.fillRect(-40, -96, 80, 34); c.restore();
      c.beginPath(); c.moveTo(0, -90); c.bezierCurveTo(34, -60, 30, 20, 22, 66); c.lineTo(-22, 66); c.bezierCurveTo(-30, 20, -34, -60, 0, -90); umple(c, null);
      cerc(c, 0, -24, 14, '#9ae6ff', 3); cerc(c, 4, -28, 4, '#fff', 0);
      drept(c, -3, 30, 6, 30, 3, '#F21F4B', 2);
    } },
    minge: { nume: 'Minge', w: 70, h: 70, culoare: '#F21F4B', draw(c, col) {
      cerc(c, 0, 0, 32, col);
      c.save(); c.beginPath(); c.arc(0, 0, 32, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, 9, 34, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd34d'; c.fillRect(-34, -5, 68, 10); c.restore();
      cerc(c, 0, 0, 32, null);
      cerc(c, -12, -14, 6, 'rgba(255,255,255,.55)', 0);
    } },
    copac: { nume: 'Copac', w: 170, h: 230, culoare: '#3fae5a', draw(c, col) {
      poli(c, [[-14, 112], [-10, 20], [-30, -6], [-20, -8], [-4, 10], [0, -10], [8, 10], [22, -6], [30, -4], [10, 22], [14, 112]], '#8a5a34');
      cerc(c, -42, -28, 38, nuanta(col, -0.15)); cerc(c, 42, -28, 38, nuanta(col, -0.15));
      cerc(c, 0, -62, 50, col); cerc(c, -36, -4, 30, col); cerc(c, 36, -4, 30, col);
      for (const [x, y] of [[-20, -70], [18, -40], [-40, -20], [34, -70], [4, -10]]) cerc(c, x, y, 6, '#F21F4B', 2);
    } },
    floare: { nume: 'Floare', w: 70, h: 130, culoare: '#ff6fa8', draw(c, col) {
      membru(c, [[0, 60], [0, -16]], 4, '#3fae5a');
      c.beginPath(); c.ellipse(14, 26, 14, 6, -0.5, 0, Math.PI * 2); umple(c, '#56c26c', 2.5);
      c.beginPath(); c.ellipse(-14, 38, 14, 6, 0.5, 0, Math.PI * 2); umple(c, '#56c26c', 2.5);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; elip(c, Math.cos(a) * 17, -36 + Math.sin(a) * 17, 13, 9, col, 2.5, a); }
      cerc(c, 0, -36, 11, '#ffd34d', 2.5);
      ochi(c, -4, -38, 3); ochi(c, 4, -38, 3);
    } },
    extraterestru: { nume: 'Extraterestru', w: 110, h: 170, culoare: '#7bd85c', draw(c, col) {
      membru(c, [[-12, 44], [-16, 80]], 9, col); membru(c, [[12, 44], [16, 80]], 9, col);
      elip(c, -20, 84, 11, 5, '#6c4ab6'); elip(c, 20, 84, 11, 5, '#6c4ab6');
      membru(c, [[-20, 0], [-42, 20]], 7, col); membru(c, [[20, 0], [42, -16]], 7, col);
      elip(c, 0, 18, 26, 32, '#6c4ab6');
      membru(c, [[-14, -64], [-26, -96]], 3, col); membru(c, [[14, -64], [26, -96]], 3, col);
      cerc(c, -26, -98, 6, '#ffd34d'); cerc(c, 26, -98, 6, '#ffd34d');
      elip(c, 0, -46, 38, 32, col);
      ochi(c, -14, -52, 10); ochi(c, 14, -52, 10); cerc(c, 0, -66, 6, '#fff', 2); cerc(c, 0, -66, 3, CONTUR, 0);
      zambet(c, 0, -30, 9);
    } },
  };

  // ---------- Decoruri (desenate pe 960 × 540) ----------
  const LAT = 960, INA = 540;
  function cer(c, sus, jos, y1 = INA) { const g = c.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, sus); g.addColorStop(1, jos); c.fillStyle = g; c.fillRect(0, 0, LAT, y1); }
  function deal(c, y, amp, culoare, faza = 0, per = 420) {
    c.beginPath(); c.moveTo(0, INA);
    for (let x = 0; x <= LAT; x += 10) c.lineTo(x, y + Math.sin((x + faza) / per * Math.PI * 2) * amp);
    c.lineTo(LAT, INA); c.closePath(); c.fillStyle = culoare; c.fill();
  }
  function norFundal(c, x, y, s) {
    c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath();
    for (const [dx, dy, r] of [[0, 0, 22], [24, -12, 28], [52, 0, 22], [26, 6, 20]]) { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); }
    c.fill();
  }
  function bradut(c, x, y, s, col = '#2f7d4a') {
    c.fillStyle = '#6b4426'; c.fillRect(x - 5 * s, y - 10 * s, 10 * s, 18 * s);
    c.fillStyle = col;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x, y - (70 - i * 18) * s - 12 * s); c.lineTo(x - (22 + i * 8) * s, y - (34 - i * 18) * s + 10 * s); c.lineTo(x + (22 + i * 8) * s, y - (34 - i * 18) * s + 10 * s); c.closePath(); c.fill(); }
  }
  function copacRotund(c, x, y, s) {
    c.fillStyle = '#7a5032'; c.fillRect(x - 6 * s, y - 40 * s, 12 * s, 42 * s);
    c.fillStyle = '#4caf50'; c.beginPath(); c.arc(x, y - 58 * s, 34 * s, 0, Math.PI * 2); c.arc(x - 26 * s, y - 40 * s, 22 * s, 0, Math.PI * 2); c.arc(x + 26 * s, y - 40 * s, 22 * s, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(x - 10 * s, y - 70 * s, 14 * s, 0, Math.PI * 2); c.fill();
  }
  const DECORURI = {
    parc: { nume: 'Parc', draw(c) {
      cer(c, '#7cc8f4', '#d8f1ff', 380);
      norFundal(c, 120, 90, 1.2); norFundal(c, 620, 60, 1); norFundal(c, 800, 130, 0.8);
      deal(c, 320, 20, '#9fd88a', 0, 600); deal(c, 370, 14, '#7cc96b', 200, 500);
      copacRotund(c, 110, 380, 1.3); copacRotund(c, 860, 370, 1.5); copacRotund(c, 700, 360, 0.9);
      c.fillStyle = '#e9d8b4'; c.beginPath(); c.moveTo(380, INA); c.bezierCurveTo(430, 470, 520, 430, 600, 380); c.lineTo(650, 380); c.bezierCurveTo(600, 440, 560, 480, 560, INA); c.fill();
      c.fillStyle = '#a0683c'; c.fillRect(220, 410, 120, 10); c.fillRect(220, 392, 120, 8); c.fillRect(230, 420, 8, 26); c.fillRect(322, 420, 8, 26);
      c.fillStyle = '#ffffff'; for (let x = 0; x < LAT; x += 28) { c.fillRect(x, 456, 6, 30); } c.fillRect(0, 462, LAT, 5);
      const r = aleator(7); for (let i = 0; i < 40; i++) { c.fillStyle = ['#ff6fa8', '#ffd34d', '#fff'][i % 3]; c.beginPath(); c.arc(r() * LAT, 490 + r() * 45, 3, 0, Math.PI * 2); c.fill(); }
    } },
    clasa: { nume: 'Clasă', draw(c) {
      c.fillStyle = '#f6e7c8'; c.fillRect(0, 0, LAT, 400);
      c.fillStyle = '#e8d3a8'; c.fillRect(0, 300, LAT, 100);
      c.fillStyle = '#b07a4f'; c.fillRect(0, 400, LAT, 140);
      c.strokeStyle = '#9a6840'; c.lineWidth = 2; for (let y = 420; y < INA; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(LAT, y); c.stroke(); }
      c.fillStyle = '#7a5032'; c.fillRect(250, 60, 460, 230); c.fillStyle = '#2f6b4f'; c.fillRect(262, 72, 436, 206);
      c.fillStyle = '#fff'; c.font = '36px "Comic Sans MS", cursive'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('2 + 2 = 4', 300, 140); c.font = '26px "Comic Sans MS", cursive'; c.fillText('Animația = cadre + FPS', 300, 200);
      c.fillStyle = '#ddd'; c.fillRect(300, 282, 40, 6);
      c.fillStyle = '#fff'; c.fillRect(40, 70, 160, 150); c.fillStyle = '#9fdcff'; c.fillRect(50, 80, 140, 130);
      c.fillStyle = '#fff'; c.fillRect(117, 80, 6, 130); c.fillRect(50, 142, 140, 6);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(840, 120, 46, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 6; c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(840, 120); c.lineTo(840, 88); c.moveTo(840, 120); c.lineTo(864, 128); c.stroke();
      for (const x of [90, 700]) { c.fillStyle = '#c98b52'; c.fillRect(x, 430, 170, 18); c.fillStyle = '#8a5a34'; c.fillRect(x + 10, 448, 10, 60); c.fillRect(x + 150, 448, 10, 60); }
    } },
    spatiu: { nume: 'Spațiu', draw(c) {
      cer(c, '#0b1030', '#26135a');
      const r = aleator(3); for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; const s = r() * 2.2 + 0.4; c.beginPath(); c.arc(r() * LAT, r() * 420, s, 0, Math.PI * 2); c.fill(); }
      const g = c.createRadialGradient(740, 130, 10, 760, 140, 80); g.addColorStop(0, '#ffb86b'); g.addColorStop(1, '#d9534f'); c.fillStyle = g; c.beginPath(); c.arc(760, 140, 70, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffe1a8'; c.lineWidth = 7; c.beginPath(); c.ellipse(760, 140, 120, 24, -0.3, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#9ad1ff'; c.beginPath(); c.arc(160, 110, 26, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8f8fa8'; c.beginPath(); c.moveTo(0, INA); c.lineTo(0, 440); c.bezierCurveTo(200, 400, 420, 450, 620, 420); c.bezierCurveTo(780, 400, 900, 430, LAT, 420); c.lineTo(LAT, INA); c.fill();
      for (const [x, y, rr] of [[120, 480, 28], [420, 500, 18], [700, 470, 34], [860, 510, 16]]) { c.fillStyle = '#76768e'; c.beginPath(); c.ellipse(x, y, rr, rr * 0.4, 0, 0, Math.PI * 2); c.fill(); }
    } },
    subacvatic: { nume: 'Subacvatic', draw(c) {
      cer(c, '#3ab3e6', '#0d4f8b');
      c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(80 + i * 160, 0); c.lineTo(140 + i * 160, 0); c.lineTo(40 + i * 160 + 120, INA); c.lineTo(i * 160 - 20, INA); c.fill(); }
      c.fillStyle = '#f3dca0'; c.beginPath(); c.moveTo(0, INA); c.lineTo(0, 460); c.bezierCurveTo(300, 430, 600, 480, LAT, 450); c.lineTo(LAT, INA); c.fill();
      const alga = (x, hh, col) => { c.strokeStyle = col; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, 480); for (let y = 0; y < hh; y += 20) c.quadraticCurveTo(x + (y % 40 ? 16 : -16), 470 - y, x, 460 - y - 10); c.stroke(); };
      alga(60, 180, '#2e9e5b'); alga(90, 120, '#3cc070'); alga(840, 200, '#2e9e5b'); alga(880, 140, '#3cc070'); alga(520, 100, '#3cc070');
      c.fillStyle = '#7d7f8c'; c.beginPath(); c.ellipse(700, 480, 60, 30, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(260, 490, 40, 22, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff7f6e'; c.beginPath(); for (const a of [-0.6, 0, 0.6]) { c.ellipse(400 + Math.sin(a) * 30, 450 - Math.cos(a) * 30, 8, 30, a, 0, Math.PI * 2); } c.fill();
      const r = aleator(11); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; for (let i = 0; i < 25; i++) { c.beginPath(); c.arc(r() * LAT, r() * 420, 3 + r() * 6, 0, Math.PI * 2); c.stroke(); }
    } },
    oras: { nume: 'Oraș', draw(c) {
      cer(c, '#ffb27a', '#ffe3b8', 400);
      c.fillStyle = '#ffdf6e'; c.beginPath(); c.arc(760, 150, 50, 0, Math.PI * 2); c.fill();
      const r = aleator(5);
      for (const [x, w, hh, col] of [[0, 120, 220, '#8d7bb5'], [110, 90, 290, '#6c5c9a'], [200, 140, 200, '#a08fc6'], [330, 100, 310, '#5d4e8a'], [430, 130, 240, '#8d7bb5'], [560, 90, 330, '#6c5c9a'], [650, 150, 210, '#a08fc6'], [800, 160, 270, '#5d4e8a']]) {
        c.fillStyle = col; c.fillRect(x, 400 - hh, w, hh);
        for (let yy = 400 - hh + 16; yy < 380; yy += 32) for (let xx = x + 14; xx < x + w - 20; xx += 28) { c.fillStyle = r() < 0.45 ? '#ffe68a' : 'rgba(255,255,255,.25)'; c.fillRect(xx, yy, 14, 18); }
      }
      c.fillStyle = '#c9c3bb'; c.fillRect(0, 400, LAT, 40);
      c.fillStyle = '#4b4b55'; c.fillRect(0, 440, LAT, 100);
      c.fillStyle = '#fff'; for (let x = 20; x < LAT; x += 90) c.fillRect(x, 486, 50, 8);
      c.fillStyle = '#3a3a3a'; c.fillRect(150, 300, 8, 100); c.fillStyle = '#ffe68a'; c.beginPath(); c.arc(154, 298, 12, 0, Math.PI * 2); c.fill();
    } },
    munte: { nume: 'Munte', draw(c) {
      cer(c, '#8fd3ff', '#e8f7ff', 360);
      const munte = (pts, col, zapada) => {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, 400); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(LAT, 400); c.closePath(); c.fill();
        if (zapada) { c.fillStyle = '#fff'; for (const [x, y] of pts.filter((p) => p[1] < 220)) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 36, y + 46); c.lineTo(x - 14, y + 38); c.lineTo(x, y + 52); c.lineTo(x + 14, y + 38); c.lineTo(x + 36, y + 46); c.closePath(); c.fill(); } }
      };
      munte([[0, 260], [140, 130], [300, 280], [470, 90], [650, 270], [800, 150], [LAT, 260]], '#8a9bb8', true);
      munte([[0, 330], [180, 230], [360, 330], [560, 220], [760, 320], [LAT, 250]], '#6f8a74', false);
      c.fillStyle = '#7cc96b'; c.fillRect(0, 380, LAT, 160);
      c.fillStyle = '#5fb3e8'; c.beginPath(); c.ellipse(640, 470, 200, 40, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(560, 462, 60, 4); c.fillRect(670, 476, 80, 4);
      for (const [x, s] of [[60, 1.4], [130, 1.1], [300, 1.6], [880, 1.3], [930, 1]]) bradut(c, x, 420 + s * 20, s);
    } },
    plaja: { nume: 'Plajă', draw(c) {
      cer(c, '#5ec8f2', '#c9f0ff', 300);
      norFundal(c, 200, 80, 1); norFundal(c, 650, 110, 1.3);
      c.fillStyle = '#1e8fd0'; c.fillRect(0, 280, LAT, 120);
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; for (let y = 300; y < 390; y += 26) { c.beginPath(); for (let x = 0; x <= LAT; x += 20) c.lineTo(x, y + Math.sin(x / 30 + y) * 4); c.stroke(); }
      c.fillStyle = '#f6dc9c'; c.beginPath(); c.moveTo(0, INA); c.lineTo(0, 390); c.bezierCurveTo(300, 370, 600, 410, LAT, 380); c.lineTo(LAT, INA); c.fill();
      c.strokeStyle = '#8a5a34'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(840, 520); c.quadraticCurveTo(830, 360, 870, 250); c.stroke();
      c.fillStyle = '#3fae5a'; for (const a of [-2.6, -2, -1.2, -0.5, 0.1]) { c.beginPath(); c.ellipse(870 + Math.cos(a) * 60, 250 + Math.sin(a) * 30 + 20, 70, 16, a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#F21F4B'; c.beginPath(); c.moveTo(160, 330); c.arc(220, 330, 80, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(220, 330); c.arc(220, 330, 80, Math.PI * 1.33, Math.PI * 1.66); c.closePath(); c.fill();
      c.strokeStyle = '#555'; c.lineWidth = 5; c.beginPath(); c.moveTo(220, 250); c.lineTo(220, 470); c.stroke();
    } },
    padure: { nume: 'Pădure noaptea', draw(c) {
      cer(c, '#0f1a3d', '#2e3f7a', 420);
      const r = aleator(9); for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; c.fillRect(r() * LAT, r() * 260, 2, 2); }
      c.fillStyle = '#fff8d6'; c.beginPath(); c.arc(780, 100, 44, 0, Math.PI * 2); c.fill(); c.fillStyle = '#0f1a3d'; c.beginPath(); c.arc(800, 88, 40, 0, Math.PI * 2); c.fill();
      deal(c, 380, 20, '#1d3b2e', 50, 500);
      for (let i = 0; i < 12; i++) bradut(c, 30 + i * 85 + (r() * 30), 420 + r() * 20, 1.2 + r() * 0.8, i % 2 ? '#174a33' : '#1f5c3f');
      c.fillStyle = '#244a35'; c.fillRect(0, 460, LAT, 80);
      for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,240,120,.9)'; c.beginPath(); c.arc(r() * LAT, 300 + r() * 220, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,240,120,.25)'; c.beginPath(); c.arc(r() * LAT, 300 + r() * 220, 8, 0, Math.PI * 2); c.fill(); }
    } },
  };
  const decorCache = new Map();
  function imagineDecor(cheie) {
    if (!decorCache.has(cheie)) {
      const cv = canvasNou(LAT, INA), c = cv.getContext('2d');
      if (DECORURI[cheie]) DECORURI[cheie].draw(c);
      else { c.fillStyle = /^#[0-9a-f]{6}$/i.test(cheie) ? cheie : '#ffffff'; c.fillRect(0, 0, LAT, INA); }
      decorCache.set(cheie, cv);
    }
    return decorCache.get(cheie);
  }

  // ---------- Sunete generate cu Web Audio (fără fișiere) ----------
  const SUNETE = {
    pasi: { nume: 'Pași', dur: 1.4 }, salt: { nume: 'Săritură (boing)', dur: 0.5 }, aplauze: { nume: 'Aplauze', dur: 2 },
    whoosh: { nume: 'Fâșâit (whoosh)', dur: 0.6 }, pop: { nume: 'Pop', dur: 0.3 }, clopotel: { nume: 'Clopoțel', dur: 1.2 },
    motor: { nume: 'Motor', dur: 1.6 }, laser: { nume: 'Laser', dur: 0.4 }, fanfara: { nume: 'Fanfară', dur: 1.6 },
    muzica: { nume: 'Melodie veselă', dur: 4 }, mister: { nume: 'Melodie misterioasă', dur: 4 },
  };
  const MUZICI = { '': 'Fără muzică', vesela: 'Veselă', linistita: 'Liniștită', spatiu: 'Misterioasă (spațiu)' };
  const nota = (n) => 440 * 2 ** ((n - 69) / 12);
  let zgomotBuf = null;
  function zgomot(ac) {
    if (!zgomotBuf || zgomotBuf.sampleRate !== ac.sampleRate) {
      zgomotBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = zgomotBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return zgomotBuf;
  }
  function anvelopa(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function ton(ac, out, t, f, dur, tip = 'sine', vol = 0.3, f2 = 0) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = tip;
    o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    anvelopa(g, t, 0.01, dur, vol); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function fsas(ac, out, t, dur, f, q, vol, f2 = 0) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = zgomot(ac); fl.type = 'bandpass'; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    anvelopa(g, t, Math.min(0.01, dur / 3), dur, vol); s.connect(fl).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function melodie(ac, out, t, dur, note, pas, tip, vol, bas) {
    for (let i = 0, x = 0; x < dur - 0.05; i++, x += pas) {
      const n = note[i % note.length]; if (n) ton(ac, out, t + x, nota(n), pas * 0.95, tip, vol);
      if (bas && i % 4 === 0) ton(ac, out, t + x, nota(bas[(i / 4) % bas.length]), pas * 3.5, 'sine', vol * 0.9);
    }
  }
  function cantaSunet(ac, out, cheie, t, dur) {
    dur = dur || SUNETE[cheie]?.dur || 1;
    switch (cheie) {
      case 'pasi': for (let x = 0; x < dur - 0.1; x += 0.32) fsas(ac, out, t + x, 0.08, 500, 1.2, 0.7); break;
      case 'salt': ton(ac, out, t, 180, 0.35, 'sine', 0.4, 720); ton(ac, out, t + 0.02, 360, 0.3, 'triangle', 0.12, 1100); break;
      case 'aplauze': for (let i = 0; i < 90; i++) fsas(ac, out, t + Math.random() * (dur - 0.3) * (0.4 + 0.6 * Math.random()), 0.04, 1200 + Math.random() * 2200, 1.5, 0.25 + Math.random() * 0.2); break;
      case 'whoosh': fsas(ac, out, t, dur, 300, 1.4, 0.6, 3200); break;
      case 'pop': ton(ac, out, t, 700, 0.1, 'sine', 0.5, 160); break;
      case 'clopotel': for (const [f, v] of [[1320, 0.25], [2640, 0.1], [1980, 0.08]]) ton(ac, out, t, f, dur, 'sine', v); break;
      case 'motor': { const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t); o.frequency.linearRampToValueAtTime(90, t + dur); fl.type = 'lowpass'; fl.frequency.value = 500;
        lfo.frequency.value = 18; lg.gain.value = 0.12; lfo.connect(lg).connect(g.gain);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(fl).connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05); break; }
      case 'laser': ton(ac, out, t, 1600, 0.3, 'square', 0.12, 180); break;
      case 'fanfara': [[60, 0], [64, 0.16], [67, 0.32], [72, 0.48]].forEach(([n, x]) => ton(ac, out, t + x, nota(n), x < 0.4 ? 0.18 : 1, 'triangle', 0.25)); ton(ac, out, t + 0.48, nota(76), 1, 'triangle', 0.15); break;
      case 'muzica': melodie(ac, out, t, dur, [72, 76, 79, 76, 77, 81, 79, 0, 74, 77, 81, 77, 76, 79, 84, 0], 0.2, 'triangle', 0.16, [48, 53, 55, 48]); break;
      case 'mister': melodie(ac, out, t, dur, [57, 60, 64, 63, 57, 60, 65, 64], 0.5, 'sine', 0.2, [45, 41]); break;
      default: break;
    }
  }
  function cantaMuzica(ac, out, cheie, t, dur) {
    if (cheie === 'vesela') melodie(ac, out, t, dur, [72, 0, 76, 79, 77, 0, 74, 76, 72, 0, 76, 79, 81, 79, 77, 76], 0.22, 'triangle', 0.07, [48, 53, 55, 48]);
    else if (cheie === 'linistita') melodie(ac, out, t, dur, [60, 64, 67, 72, 67, 64, 57, 60, 64, 69, 64, 60], 0.38, 'sine', 0.08, [48, 45]);
    else if (cheie === 'spatiu') melodie(ac, out, t, dur, [57, 0, 64, 63, 0, 60, 65, 0], 0.55, 'sine', 0.09, [45, 41, 43]);
  }

  // ---------- Codor GIF (paletă de 256 de culori, compresie LZW) ----------
  function paletaGIF(cadre) {
    const hist = new Uint32Array(32768);
    const total = cadre.reduce((s, c) => s + c.data.length / 4, 0), pas = Math.max(1, Math.floor(total / 4e6));
    for (const c of cadre) { const d = c.data; for (let i = 0; i < d.length; i += 4 * pas) hist[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)]++; }
    const culori = []; for (let i = 0; i < 32768; i++) if (hist[i]) culori.push(i);
    const can = (c, k) => (k === 0 ? c >> 10 : k === 1 ? (c >> 5) & 31 : c & 31);
    let cutii = [culori];
    // Tăietura mediană: împărțim mereu cutia cu cele mai multe pixeli × cea mai mare întindere
    while (cutii.length < 256) {
      let best = -1, bi = -1, bk = 0;
      cutii.forEach((b, i) => {
        if (b.length < 2) return;
        let n = 0; const mn = [31, 31, 31], mx = [0, 0, 0];
        for (const c of b) { n += hist[c]; for (let k = 0; k < 3; k++) { const v = can(c, k); if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; } }
        const ks = [0, 1, 2].map((k) => mx[k] - mn[k]), k = ks.indexOf(Math.max(...ks)), scor = ks[k] * Math.sqrt(n);
        if (scor > best) { best = scor; bi = i; bk = k; }
      });
      if (bi < 0 || best <= 0) break;
      const b = cutii[bi].sort((x, y) => can(x, bk) - can(y, bk));
      let n = 0; const jum = b.reduce((s, c) => s + hist[c], 0) / 2; let m = 1;
      for (let i = 0; i < b.length - 1; i++) { n += hist[b[i]]; if (n >= jum) { m = i + 1; break; } m = i + 1; }
      cutii.splice(bi, 1, b.slice(0, m), b.slice(m));
    }
    const pal = new Uint8Array(768), lut = new Int16Array(32768).fill(-1);
    cutii.forEach((b, i) => {
      let n = 0, r = 0, g = 0, bl = 0;
      for (const c of b) { const w = hist[c]; n += w; r += can(c, 0) * w; g += can(c, 1) * w; bl += can(c, 2) * w; lut[c] = i; }
      pal[i * 3] = Math.round(r / n) * 8 + 4; pal[i * 3 + 1] = Math.round(g / n) * 8 + 4; pal[i * 3 + 2] = Math.round(bl / n) * 8 + 4;
    });
    return { pal, lut, n: cutii.length };
  }
  function indiciGIF(img, { pal, lut, n }) {
    const d = img.data, out = new Uint8Array(d.length / 4);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      let v = lut[k];
      if (v < 0) { // culoare neeșantionată: căutăm cea mai apropiată culoare din paletă
        let bd = 1e9; const r = (k >> 10) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
        for (let p = 0; p < n; p++) { const dr = pal[p * 3] - r, dg = pal[p * 3 + 1] - g, db = pal[p * 3 + 2] - b, dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; v = p; } }
        lut[k] = v;
      }
      out[j] = v;
    }
    return out;
  }
  class Octeti {
    constructor() { this.b = new Uint8Array(1 << 16); this.n = 0; }
    pune(v) { if (this.n >= this.b.length) { const nb = new Uint8Array(this.b.length * 2); nb.set(this.b); this.b = nb; } this.b[this.n++] = v; }
    cuvant(v) { this.pune(v & 255); this.pune((v >> 8) & 255); }
    sir(s) { for (const ch of s) this.pune(ch.charCodeAt(0)); }
    rezultat() { return this.b.slice(0, this.n); }
  }
  function lzw(o, idx, minCod = 8) {
    o.pune(minCod);
    const clear = 1 << minCod, eoi = clear + 1;
    let marime = minCod + 1, urm = eoi + 1, tabel = new Map();
    let acc = 0, biti = 0; const bloc = [];
    const scrie = (cod) => {
      acc |= cod << biti; biti += marime;
      while (biti >= 8) { bloc.push(acc & 255); acc >>>= 8; biti -= 8; if (bloc.length === 255) { o.pune(255); for (const x of bloc) o.pune(x); bloc.length = 0; } }
    };
    scrie(clear);
    let pref = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], cheie = (pref << 8) | k, cod = tabel.get(cheie);
      if (cod !== undefined) { pref = cod; continue; }
      scrie(pref);
      if (urm === 4096) { scrie(clear); urm = eoi + 1; marime = minCod + 1; tabel = new Map(); }
      else { if (urm >= (1 << marime)) marime++; tabel.set(cheie, urm++); }
      pref = k;
    }
    scrie(pref); scrie(eoi);
    if (biti > 0) { bloc.push(acc & 255); }
    if (bloc.length) { o.pune(bloc.length); for (const x of bloc) o.pune(x); }
    o.pune(0);
  }
  async function codeazaGIF(cadre, w, hh, intarziereCs, progres) {
    const paleta = paletaGIF(cadre), o = new Octeti();
    o.sir('GIF89a'); o.cuvant(w); o.cuvant(hh); o.pune(0xF7); o.pune(0); o.pune(0);
    for (let i = 0; i < 768; i++) o.pune(paleta.pal[i]);
    o.pune(0x21); o.pune(0xFF); o.pune(11); o.sir('NETSCAPE2.0'); o.pune(3); o.pune(1); o.cuvant(0); o.pune(0); // buclă infinită
    for (let f = 0; f < cadre.length; f++) {
      o.pune(0x21); o.pune(0xF9); o.pune(4); o.pune(0x04); o.cuvant(intarziereCs); o.pune(0); o.pune(0);
      o.pune(0x2C); o.cuvant(0); o.cuvant(0); o.cuvant(w); o.cuvant(hh); o.pune(0);
      lzw(o, indiciGIF(cadre[f], paleta));
      progres?.((f + 1) / cadre.length);
      await pauza(0);
    }
    o.pune(0x3B);
    return new Blob([o.rezultat()], { type: 'image/gif' });
  }

  // ---------- Efecte și temporizare ----------
  const CATEGORII = {
    intrare: { nume: 'Intrare', culoare: '#12968d', ico: 'intrare', tipuri: { apare: 'Apare', estompare: 'Estompare', glisare: 'Glisare', crestere: 'Creștere', rotire: 'Rotire', cadere: 'Cădere cu săritură' } },
    miscare: { nume: 'Mișcare', culoare: '#1f6fd1', ico: 'miscare', tipuri: { traseu: 'Traseu desenat', linie: 'Linie dreaptă', arc: 'Arc', cerc: 'Cerc', topait: 'Țopăit' } },
    transf: { nume: 'Transformare', culoare: '#d97d00', ico: 'transf', tipuri: { rotire: 'Rotire', marire: 'Mărire / micșorare', culoare: 'Schimbare de culoare', transparenta: 'Transparență', clipire: 'Clipire', tremur: 'Tremurat', intoarcere: 'Întoarcere (oglindire)' } },
    iesire: { nume: 'Ieșire', culoare: '#d9173e', ico: 'iesire', tipuri: { dispare: 'Dispare', estompare: 'Estompare', glisare: 'Glisare', micsorare: 'Micșorare', rotire: 'Rotire' } },
    sunet: { nume: 'Sunet', culoare: '#7c4ddb', ico: 'sunet', tipuri: Object.fromEntries(Object.entries(SUNETE).map(([k, v]) => [k, v.nume])) },
  };
  const STARTURI = { clic: 'La clic', cu: 'Cu anteriorul', dupa: 'După anteriorul' };
  const DIRECTII = { stanga: 'stânga', dreapta: 'dreapta', sus: 'sus', jos: 'jos' };
  function efectNou(cat, tip, obj) {
    const e = { id: idNou(), obj, cat, tip, start: 'dupa', dur: 1, delay: 0, sunet: '', p: {} };
    if (tip === 'glisare') e.p.dir = 'stanga';
    if (tip === 'apare' || tip === 'dispare') e.dur = 0.5;
    if (cat === 'miscare') { e.dur = 2; Object.assign(e.p, { linie: { dx: 300, dy: 0 }, arc: { dx: 300, dy: 0, h: 140 }, cerc: { r: 80 }, topait: { dx: 240, h: 70, n: 3 } }[tip] || {}); }
    if (cat === 'transf') Object.assign(e.p, { rotire: { grade: 360 }, marire: { factor: 1.5 }, culoare: { nuanta: 180 }, transparenta: { tinta: 0.3 }, clipire: { n: 3 }, tremur: { amp: 10 } }[tip] || {});
    if (cat === 'sunet') e.dur = SUNETE[tip].dur;
    return e;
  }
  function offsetMiscare(e, p) {
    const q = e.tip === 'traseu' || e.tip === 'cerc' || e.tip === 'topait' ? p : ease(p), P2 = e.p;
    if (e.tip === 'linie') return [P2.dx * q, P2.dy * q];
    if (e.tip === 'arc') {
      const L = Math.hypot(P2.dx, P2.dy) || 1, cx = P2.dx / 2 + (P2.dy / L) * P2.h * 2, cy = P2.dy / 2 - (P2.dx / L) * P2.h * 2;
      return [2 * (1 - q) * q * cx + q * q * P2.dx, 2 * (1 - q) * q * cy + q * q * P2.dy];
    }
    if (e.tip === 'cerc') { const a = q * Math.PI * 2; return [P2.r * Math.sin(a), -(P2.r - P2.r * Math.cos(a))]; }
    if (e.tip === 'topait') return [P2.dx * q, -Math.abs(Math.sin(q * Math.PI * P2.n)) * P2.h];
    if (e.tip === 'traseu') {
      const pts = P2.pts || [[0, 0]], f = q * (pts.length - 1), i = Math.min(Math.floor(f), pts.length - 1), j = Math.min(i + 1, pts.length - 1), u = f - i;
      return [lerp(pts[i][0], pts[j][0], u), lerp(pts[i][1], pts[j][1], u)];
    }
    return [0, 0];
  }
  // Momentul de început și de sfârșit al fiecărui efect (ca în panoul de animații din PowerPoint)
  function temporizare(scena, durVoce = 0) {
    let prevStart = 0, prevEnd = 0, tMax = 0;
    const clicuri = [];
    const ef = scena.efecte.map((e, i) => {
      let baza;
      if (e.start === 'clic') { baza = tMax; clicuri.push(tMax); }
      else if (e.start === 'cu') baza = i ? prevStart : 0;
      else baza = i ? prevEnd : 0;
      const t0 = baza + (e.delay || 0), t1 = t0 + e.dur;
      prevStart = t0; prevEnd = t1; tMax = Math.max(tMax, t1);
      return { e, t0, t1 };
    });
    return { ef, clicuri, tMax, durata: Math.max(tMax + 1, 2, durVoce + 0.3) };
  }
  const stareBaza = (o) => ({ x: o.x, y: o.y, sc: o.sc, rot: o.rot, alpha: 1, hue: 0, fx: 1, vis: true });
  function stari(scena, tim, t) {
    const rez = new Map();
    for (const o of scena.obiecte) {
      const s = stareBaza(o);
      const ale = tim.ef.filter((x) => x.e.obj === o.id).sort((a, b) => a.t0 - b.t0);
      if (ale.some((x) => x.e.cat === 'intrare')) s.vis = false;
      for (const { e, t0 } of ale) {
        if (t < t0) break;
        const p = clamp((t - t0) / Math.max(e.dur, 0.001), 0, 1), q = ease(p);
        if (e.cat === 'intrare') {
          s.vis = true;
          if (p < 1) {
            if (e.tip === 'estompare') s.alpha *= p;
            else if (e.tip === 'glisare') { const d = e.p.dir; if (d === 'stanga') s.x = lerp(-160, s.x, easeOut(p)); else if (d === 'dreapta') s.x = lerp(LAT + 160, s.x, easeOut(p)); else if (d === 'sus') s.y = lerp(-180, s.y, easeOut(p)); else s.y = lerp(INA + 180, s.y, easeOut(p)); }
            else if (e.tip === 'crestere') s.sc *= Math.max(0, easeBack(p));
            else if (e.tip === 'rotire') { s.rot -= (1 - easeOut(p)) * 360; s.sc *= easeOut(p); }
            else if (e.tip === 'cadere') s.y = lerp(-200, s.y, bounce(p));
          }
        } else if (e.cat === 'iesire') {
          if (p >= 1 || e.tip === 'dispare') { s.vis = false; continue; }
          if (e.tip === 'estompare') s.alpha *= 1 - p;
          else if (e.tip === 'glisare') { const d = e.p.dir, k = p * p; if (d === 'stanga') s.x = lerp(s.x, -160, k); else if (d === 'dreapta') s.x = lerp(s.x, LAT + 160, k); else if (d === 'sus') s.y = lerp(s.y, -180, k); else s.y = lerp(s.y, INA + 180, k); }
          else if (e.tip === 'micsorare') s.sc *= 1 - q;
          else if (e.tip === 'rotire') { s.rot += p * p * 360; s.sc *= 1 - p * p; }
        } else if (e.cat === 'miscare') {
          const [dx, dy] = offsetMiscare(e, p); s.x += dx; s.y += dy;
        } else if (e.cat === 'transf') {
          const P2 = e.p;
          if (e.tip === 'rotire') s.rot += P2.grade * q;
          else if (e.tip === 'marire') s.sc *= 1 + (P2.factor - 1) * q;
          else if (e.tip === 'culoare') s.hue += P2.nuanta * q;
          else if (e.tip === 'transparenta') s.alpha *= 1 + (P2.tinta - 1) * q;
          else if (e.tip === 'clipire') { if (p < 1 && Math.floor(p * P2.n * 2) % 2 === 0) s.alpha *= 0.12; }
          else if (e.tip === 'tremur') { if (p < 1) { s.x += Math.sin(p * Math.PI * 24) * P2.amp * (1 - p * 0.5); s.rot += Math.sin(p * Math.PI * 18) * 4; } }
          else if (e.tip === 'intoarcere') s.fx *= Math.cos(Math.PI * q) || 0.02;
        }
      }
      rez.set(o.id, s);
    }
    return rez;
  }

  // ---------- Desenarea obiectelor din scenă ----------
  const FONT_TEXT = '"Comic Sans MS", "Comic Neue", "Trebuchet MS", sans-serif';
  const masura = canvasNou(4, 4).getContext('2d');
  function randuri(c, text, maxW) {
    const out = [];
    for (const par of String(text || '').split('\n')) {
      let linie = '';
      for (const cuv of par.split(/\s+/)) {
        const inc = linie ? `${linie} ${cuv}` : cuv;
        if (linie && c.measureText(inc).width > maxW) { out.push(linie); linie = cuv; } else linie = inc;
      }
      out.push(linie);
    }
    return out;
  }
  function dimObiect(o) {
    if (o.tip === 'personaj') { const d = PERSONAJE[o.fel] || PERSONAJE.minge; return { w: d.w, h: d.h }; }
    const mar = o.marime || (o.tip === 'balon' ? 24 : 44);
    masura.font = `bold ${mar}px ${FONT_TEXT}`;
    const rs = randuri(masura, o.text || ' ', o.tip === 'balon' ? 240 : 800);
    const w = Math.max(...rs.map((r) => masura.measureText(r).width), mar);
    return o.tip === 'balon' ? { w: w + 36, h: rs.length * mar * 1.2 + 28 + 26, rs, mar } : { w: w + 8, h: rs.length * mar * 1.2, rs, mar };
  }
  function deseneazaObiect(c, o, s) {
    if (!s.vis || s.alpha <= 0.01) return;
    c.save();
    c.translate(s.x, s.y); c.rotate(s.rot * Math.PI / 180); c.scale(s.sc * s.fx * (o.flip ? -1 : 1), s.sc);
    c.globalAlpha *= clamp(s.alpha, 0, 1);
    if (s.hue) c.filter = `hue-rotate(${Math.round(s.hue)}deg)`;
    if (o.tip === 'personaj') { const d = PERSONAJE[o.fel] || PERSONAJE.minge; d.draw(c, o.culoare || d.culoare); }
    else {
      const d = dimObiect(o);
      if (o.flip) c.scale(-1, 1); // textul nu se oglindește
      c.font = `bold ${d.mar}px ${FONT_TEXT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (o.tip === 'balon') {
        const bw = d.w, bh = d.h - 26, x0 = -bw / 2, y0 = -d.h / 2, coada = o.flip ? 1 : -1;
        c.beginPath(); c.roundRect(x0, y0, bw, bh, 18);
        c.moveTo(coada * bw * 0.18 - 12, y0 + bh - 1); c.lineTo(coada * bw * 0.32, y0 + bh + 24); c.lineTo(coada * bw * 0.18 + 12, y0 + bh - 1);
        c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = CONTUR; c.lineJoin = 'round'; c.stroke();
        c.fillStyle = '#fff'; c.fillRect(coada * bw * 0.18 - 10, y0 + bh - 4, 20, 6);
        c.fillStyle = o.culoare || CONTUR;
        d.rs.forEach((r, i) => c.fillText(r, 0, y0 + 14 + d.mar * 0.6 + i * d.mar * 1.2));
      } else {
        c.lineWidth = Math.max(4, d.mar / 7); c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.fillStyle = o.culoare || CONTUR;
        d.rs.forEach((r, i) => { const y = -d.h / 2 + d.mar * 0.6 + i * d.mar * 1.2; c.strokeText(r, 0, y); c.fillText(r, 0, y); });
      }
    }
    c.restore();
  }
  // Scena la momentul t (t = null: vederea de proiectare, cu toate obiectele vizibile)
  function randeazaScena(c, scena, t, tim) {
    c.drawImage(imagineDecor(scena.decor || '#ffffff'), 0, 0, LAT, INA);
    const st = t == null ? null : stari(scena, tim || temporizare(scena), t);
    for (const o of scena.obiecte) deseneazaObiect(c, o, st ? st.get(o.id) : stareBaza(o));
  }
  function miniaturaPersonaj(fel, culoare, lat = 56) {
    const d = PERSONAJE[fel], cv = canvasNou(lat * 2, lat * 2), c = cv.getContext('2d');
    const k = (lat * 2 * 0.86) / Math.max(d.w, d.h + 20);
    c.translate(lat, lat); c.scale(k, k); d.draw(c, culoare || d.culoare);
    cv.className = 'ap-animatie-mini'; return cv;
  }
  function miniaturaDecor(cheie, lat = 120) {
    const cv = canvasNou(lat * 2, Math.round(lat * 2 * 9 / 16)); cv.getContext('2d').drawImage(imagineDecor(cheie), 0, 0, cv.width, cv.height);
    cv.className = 'ap-animatie-mini'; return cv;
  }

  // ---------- Șabloane de poveste (ca în Toontastic) ----------
  const POVESTI = {
    scurta: { nume: 'Poveste scurtă', en: 'Short Story', parti: [['Început', 'Prezintă personajele și locul în care se petrece povestea.'], ['Mijloc', 'Apare o problemă sau o aventură.'], ['Sfârșit', 'Cum se termină povestea?']] },
    clasica: { nume: 'Poveste clasică', en: 'Classic Story', parti: [['Configurare', 'Personajele și introducerea în poveste.'], ['Conflict', 'Apare o problemă.'], ['Încercare', 'Problema se complică.'], ['Punct culminant', 'Personajele rezolvă problema.'], ['Rezoluție', 'Arăți că problema s-a rezolvat.']] },
    stiintific: { nume: 'Raport științific', en: 'Science Report', parti: [['Întrebare', 'Ce vrei să afli?'], ['Ipoteză', 'Ce crezi că se va întâmpla?'], ['Experiment', 'Ce faci ca să verifici?'], ['Rezultate', 'Ce ai observat?'], ['Concluzie', 'Ce ai aflat?']] },
    libera: { nume: 'Animație liberă', en: '', parti: [['Scena 1', 'Scrie aici ce se întâmplă în scenă.']] },
  };
  const DECOR_IMPLICIT = { 0: 'parc', 1: 'clasa', 2: 'munte', 3: 'oras', 4: 'plaja' };
  function scenaNoua(nume, indiciu, decor = 'parc') { return { id: idNou(), nume, indiciu, scenariu: '', decor, muzica: '', voce: null, obiecte: [], efecte: [] }; }
  function proiectScene(poveste = 'scurta') {
    const pv = POVESTI[poveste];
    return { mod: 'scene', titlu: 'Povestea mea', poveste, voci: {}, scene: pv.parti.map(([n, ind], i) => scenaNoua(n, ind, DECOR_IMPLICIT[i] || 'parc')) };
  }

  // ---------- Aplicația ----------
  routes.push({ pattern: /^\/aplicatii\/animatie$/, handler: async (m, params) => aplicatie(params) });

  const PALETA = ['#1b1b1b', '#7f7f7f', '#ffffff', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc',
    '#a349a4', '#b97a57', '#ffaec9', '#ffc90e', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7', '#f5c9a5', '#5c3a1e'];
  const GROSIMI = [2, 4, 6, 10, 16, 24, 40];
  const WA = 800, HA = 450; // pânza unui cadru
  const MAX_CADRE = 200;
  const dataUrlCache = new WeakMap(); // cadrele nu se modifică pe loc (copiere la scriere), deci le putem memora
  const dataUrl = (cv) => { let u = dataUrlCache.get(cv); if (!u) { u = cv.toDataURL('image/png'); dataUrlCache.set(cv, u); } return u; };

  async function aplicatie() {
    const ac = new AbortController(), sig = { signal: ac.signal };
    const pref = lsCiteste(LS_PREF, {});
    const S = { mod: pref.mod === 'scene' ? 'scene' : 'cadre', fila: 'pornire', testare: false };
    const A = { titlu: 'Animația mea', id: null, creat: null, modificat: false, fps: 8, bucla: true, fundal: '#ffffff', ceapa: true, ceapaAlfa: 0.3, ceapaUrm: false, grila: false,
      cadre: [canvasNou(WA, HA)], idx: 0, unealta: 'creion', culoare: '#1b1b1b', grosime: 6, plin: false };
    const B = { doc: proiectScene('scurta'), id: null, creat: null, modificat: false, scIdx: 0, sel: null, efSel: null, viz: null, trasee: true, grila: false, panou: 'animatii', inreg: false, pps: 70 };
    let actx = null;
    const audio = () => { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; };

    // ----- Elemente comune -----
    const radacina = h('div', { class: 'ap-animatie' });
    const toasturi = h('div', { class: 'ap-animatie-toasturi', role: 'status', 'aria-live': 'polite' });
    function toast(msg, ms = 2600) {
      const t = h('div', { class: 'ap-animatie-toast' }, msg); toasturi.append(t); while (toasturi.children.length > 2) toasturi.firstChild.remove();
      setTimeout(() => t.classList.add('pleaca'), ms); setTimeout(() => t.remove(), ms + 400);
    }
    let modal = null;
    function dialog(titlu, continut, butoane = [], o = {}) {
      inchideDialog();
      const fereastra = h('div', { class: `ap-animatie-dialog${o.lat ? ' lat' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
        h('div', { class: 'ap-animatie-dialog-cap' }, h('h2', {}, titlu), h('button', { type: 'button', class: 'ap-animatie-x', 'aria-label': 'Închide', title: 'Închide (Esc)', onclick: () => { o.laInchidere?.(); inchideDialog(); } }, ico('x'))),
        h('div', { class: 'ap-animatie-dialog-corp' }, continut),
        butoane.length ? h('div', { class: 'ap-animatie-dialog-but' }, butoane) : null);
      modal = h('div', { class: 'ap-animatie-fundal', onpointerdown: (e) => { if (e.target === modal && !o.fix) { o.laInchidere?.(); inchideDialog(); } } }, fereastra);
      modal._laInchidere = o.laInchidere;
      radacina.append(modal);
      setTimeout(() => (fereastra.querySelector('[autofocus], input, select, textarea') || fereastra.querySelector('.ap-animatie-dialog-but button:last-child'))?.focus(), 30);
      return fereastra;
    }
    function inchideDialog() { if (modal) { modal.remove(); modal = null; } }
    const buton = (text, fn, cls = '') => h('button', { type: 'button', class: `ap-animatie-btn ${cls}`, onclick: fn }, text);
    function intreaba(titlu, eticheta, valoare) {
      return new Promise((res) => {
        const inp = h('input', { type: 'text', value: valoare || '', maxlength: '60', class: 'ap-animatie-camp', autofocus: true });
        const ok = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } inchideDialog(); res(v); };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
        dialog(titlu, h('label', { class: 'ap-animatie-et' }, eticheta, inp), [buton('Renunță', () => { inchideDialog(); res(null); }), buton('OK', ok, 'principal')], { laInchidere: () => res(null) });
        setTimeout(() => inp.select(), 40);
      });
    }
    function confirma(titlu, mesaj, da = 'Da') {
      return new Promise((res) => dialog(titlu, h('p', {}, mesaj), [buton('Nu', () => { inchideDialog(); res(false); }), buton(da, () => { inchideDialog(); res(true); }, 'principal')], { laInchidere: () => res(false) }));
    }
    // Meniu derulant
    let meniuEl = null;
    function inchideMeniu() { if (meniuEl) { meniuEl._ancora?.setAttribute('aria-expanded', 'false'); meniuEl.remove(); meniuEl = null; } }
    function meniu(ancora, articole, cls = '') {
      const era = meniuEl?._ancora === ancora; inchideMeniu(); if (era) return;
      meniuEl = h('div', { class: `ap-animatie-meniu ${cls}`, role: 'menu' }, articole.map((a) => {
        if (a === '-') return h('div', { class: 'ap-animatie-meniu-sep' });
        if (a instanceof Node) return a;
        if (a.titlu) return h('div', { class: 'ap-animatie-meniu-titlu' }, a.titlu);
        return h('button', { type: 'button', role: 'menuitem', class: 'ap-animatie-meniu-art', disabled: a.dez || null, onclick: () => { inchideMeniu(); a.fn(); } },
          a.el || (a.ico ? ico(a.ico) : h('span', { class: 'ap-animatie-ico' })), h('span', { class: 'txt' }, a.text), a.scurt ? h('kbd', {}, a.scurt) : null);
      }));
      meniuEl._ancora = ancora; ancora.setAttribute('aria-expanded', 'true');
      radacina.append(meniuEl);
      const r = ancora.getBoundingClientRect(), rr = radacina.getBoundingClientRect();
      meniuEl.style.left = `${Math.max(4, Math.min(r.left - rr.left, rr.width - meniuEl.offsetWidth - 6))}px`;
      meniuEl.style.top = `${r.bottom - rr.top + 2}px`;
      meniuEl.style.maxHeight = `${rr.height - (r.bottom - rr.top) - 12}px`;
    }
    window.addEventListener('pointerdown', (e) => { if (meniuEl && !meniuEl.contains(e.target) && !meniuEl._ancora.contains(e.target)) inchideMeniu(); }, sig);

    // ----- Butoane de panglică -----
    let legP = [], legC = [];
    const leaga = (arr, b, o) => {
      if (o.apasat) arr.push(() => b.setAttribute('aria-pressed', String(!!o.apasat())));
      if (o.dez) arr.push(() => { b.disabled = !!o.dez(); });
    };
    function bMare(k, text, fn, o = {}) {
      const b = h('button', { type: 'button', class: `ap-animatie-mare ${o.cls || ''}`, title: o.titlu || text, 'aria-haspopup': o.meniu ? 'menu' : null, onclick: (e) => fn(b, e) }, ico(k, 'ap-animatie-ico mare'), h('span', {}, text, o.meniu ? ' ▾' : ''));
      leaga(o.corp ? legC : legP, b, o); return b;
    }
    function bMic(k, text, fn, o = {}) {
      const b = h('button', { type: 'button', class: `ap-animatie-mic ${o.cls || ''}`, title: o.titlu || text, 'aria-label': o.titlu || text, 'aria-haspopup': o.meniu ? 'menu' : null, onclick: (e) => fn(b, e) }, ico(k), text ? h('span', { class: 'txt' }, text) : null);
      leaga(o.corp ? legC : legP, b, o); return b;
    }
    const grup = (et, ...c) => h('div', { class: 'ap-animatie-grup' }, h('div', { class: 'ap-animatie-grup-c' }, ...c), h('div', { class: 'ap-animatie-grup-e' }, et));
    const stiva = (...c) => h('div', { class: 'ap-animatie-stiva' }, ...c);

    // ----- Bara de titlu -----
    const numeEl = h('button', { type: 'button', class: 'ap-animatie-nume', title: 'Redenumește proiectul', onclick: () => redenumeste() });
    const btnModA = h('button', { type: 'button', class: 'ap-animatie-mod', onclick: () => seteazaMod('cadre'), title: 'Animație cadru cu cadru (ca un flipbook)' }, ico('film'), h('span', {}, 'Cadru cu cadru'));
    const btnModB = h('button', { type: 'button', class: 'ap-animatie-mod', onclick: () => seteazaMod('scene'), title: 'Animație cu personaje și cronologie (ca Toontastic)' }, ico('masca'), h('span', {}, 'Personaje', h('span', { class: 'lung' }, ' și cronologie')));
    const btnAnul = h('button', { type: 'button', class: 'ap-animatie-tb', title: 'Anulează (Ctrl+Z)', 'aria-label': 'Anulează', onclick: () => anuleaza() }, ico('anulare'));
    const btnRef = h('button', { type: 'button', class: 'ap-animatie-tb', title: 'Refă (Ctrl+Y)', 'aria-label': 'Refă', onclick: () => reface() }, ico('refacere'));
    const bara = h('div', { class: 'ap-animatie-bara' },
      h('a', { href: '#/aplicatii', class: 'ap-animatie-inapoi', title: 'Înapoi la aplicații' }, '← Aplicații'),
      h('span', { class: 'ap-animatie-sigla', 'aria-hidden': 'true' }, ico('film')),
      h('strong', { class: 'ap-animatie-numeapp' }, 'Studio de animație'),
      h('div', { class: 'ap-animatie-moduri', role: 'group', 'aria-label': 'Tipul animației' }, btnModA, btnModB),
      numeEl, h('span', { class: 'ap-animatie-spatiu' }), btnAnul, btnRef,
      h('button', { type: 'button', class: 'ap-animatie-salv', title: 'Salvează (Ctrl+S)', onclick: () => salveaza() }, ico('salvare'), h('span', { class: 'lung' }, 'Salvează')),
      h('button', { type: 'button', class: 'ap-animatie-previz-btn', title: 'Previzualizare pe tot ecranul (F5)', onclick: () => previzualizare(true) }, ico('play'), h('span', { class: 'lung' }, 'Redare')));

    // ----- File (taburi) -----
    const FILE = [['pornire', 'Pornire'], ['inserare', 'Inserare'], ['animatii', 'Animații'], ['vizualizare', 'Vizualizare']];
    const btnFisier = h('button', { type: 'button', class: 'ap-animatie-fila fisier', 'aria-haspopup': 'menu', onclick: () => meniuFisier(btnFisier) }, 'Fișier');
    const fileBtn = FILE.map(([k, t]) => h('button', { type: 'button', role: 'tab', class: 'ap-animatie-fila', 'data-k': k, onclick: () => { S.fila = k; construiestePanglica(); ui(); } }, t));
    const file = h('div', { class: 'ap-animatie-file', role: 'tablist' }, btnFisier, ...fileBtn);
    const panglica = h('div', { class: 'ap-animatie-panglica', role: 'toolbar' });
    const corp = h('div', { class: 'ap-animatie-corp' });
    const stareSt = h('span', { class: 'ap-animatie-stare-st' }), stareDr = h('span', { class: 'ap-animatie-stare-dr' });
    const stareEl = h('div', { class: 'ap-animatie-stare' }, stareSt, h('span', { class: 'ap-animatie-spatiu' }), stareDr);

    const titluCurent = () => (S.mod === 'cadre' ? A.titlu : B.doc.titlu) || 'Fără titlu';
    const seteazaTitlu = (t) => { if (S.mod === 'cadre') A.titlu = t; else B.doc.titlu = t; };
    function ui() {
      for (const b of fileBtn) b.setAttribute('aria-selected', String(b.dataset.k === S.fila));
      btnModA.setAttribute('aria-pressed', String(S.mod === 'cadre')); btnModB.setAttribute('aria-pressed', String(S.mod === 'scene'));
      const D = S.mod === 'cadre' ? A : B;
      numeEl.textContent = `${titluCurent()}${D.modificat ? ' •' : ''}`;
      document.title = `${titluCurent()} – Studio de animație`;
      if (S.mod === 'cadre') { btnAnul.disabled = !istA.length; btnRef.disabled = !refA.length; }
      else { btnAnul.disabled = !istB.length; btnRef.disabled = !refB.length; }
      legP.forEach((f) => f()); legC.forEach((f) => f());
      if (S.mod === 'cadre') {
        const n = A.cadre.length;
        stareSt.textContent = `Cadrul ${A.idx + 1} din ${n} · ${A.fps} FPS · durata ${sec(n / A.fps)} · un cadru stă ${sec(1 / A.fps)} pe ecran`;
        stareDr.textContent = { creion: 'Creion: trage pe pânză', pensula: 'Pensulă: trage pe pânză', radiera: 'Radieră: șterge din cadrul curent', umplere: 'Umplere: atinge o zonă închisă', mutare: 'Mutare: trage ca să muți tot desenul din cadru', linie: 'Linie: trage de la un capăt la altul', dreptunghi: 'Dreptunghi: trage pe diagonală', elipsa: 'Elipsă: trage pe diagonală' }[A.unealta] || '';
      } else {
        const sc = scena(), tim = timScena(sc), total = B.doc.scene.reduce((s, x) => s + timScena(x).durata, 0);
        stareSt.textContent = `Scena ${B.scIdx + 1} din ${B.doc.scene.length}: ${sc.nume} · ${sc.efecte.length} efecte · scena durează ${sec(tim.durata)} · toată povestea ${sec(total)}`;
        stareDr.textContent = B.inreg ? 'Înregistrare traseu: trage personajul pe drumul dorit' : B.sel ? 'Trage ca să muți · colțul: mărime · cercul de sus: rotire' : 'Atinge un personaj ca să-l selectezi';
      }
    }

    // ----- Comutarea modului -----
    function seteazaMod(m) {
      if (m === S.mod) return;
      opresteRedari(); inchideMeniu();
      if (tCiorna) salveazaCiorna();
      S.mod = m; S.testare = false; lsScrie(LS_PREF, { mod: m });
      construiesteCorp(); construiestePanglica(); ui();
    }
    function construiesteCorp() {
      legC = [];
      corp.className = `ap-animatie-corp ${S.mod}`;
      corp.replaceChildren(...(S.mod === 'cadre' ? corpA() : corpB()));
      requestAnimationFrame(() => { potrivesteTot(); });
    }
    function construiestePanglica() {
      legP = []; inchideMeniu();
      panglica.replaceChildren(...(S.mod === 'cadre' ? panglicaA(S.fila) : panglicaB(S.fila)));
    }
    function potriveste(zona, el, w, hh) {
      const aw = zona.clientWidth - 24, ah = zona.clientHeight - 24;
      if (aw < 20 || ah < 20) return;
      const k = Math.min(aw / w, ah / hh);
      el.style.width = `${Math.floor(w * k)}px`; el.style.height = `${Math.floor(hh * k)}px`;
    }
    function potrivesteTot() { if (S.mod === 'cadre') potriveste(UA.zona, UA.pagina, WA, HA); else { potriveste(UB.zona, UB.pagina, LAT, INA); } }
    const ro = new ResizeObserver(() => potrivesteTot());

    // ----- Meniul Fișier -----
    function meniuFisier(anc) {
      meniu(anc, [
        { ico: 'nou', text: 'Animație nouă cadru cu cadru', fn: () => nouA() },
        { ico: 'carte', text: 'Poveste nouă cu personaje…', fn: () => dialogPoveste() },
        { ico: 'deschide', text: 'Deschide…', fn: () => dialogDeschide(), scurt: 'Ctrl+O' },
        { ico: 'salvare', text: 'Salvează', fn: () => salveaza(), scurt: 'Ctrl+S' },
        { ico: 'salvare', text: 'Salvează ca…', fn: () => salveaza(true) },
        { ico: 'text', text: 'Redenumește…', fn: () => redenumeste() },
        '-',
        { ico: 'gif', text: 'Exportă GIF animat…', fn: () => exportGIF() },
        { ico: 'video', text: 'Exportă video WebM…', fn: () => exportWebM() },
        { ico: 'imagine', text: S.mod === 'cadre' ? 'Exportă cadrul curent ca PNG' : 'Exportă scena ca imagine PNG', fn: () => exportPNG() },
        '-',
        { ico: 'descarca', text: 'Descarcă proiectul (fișier .json)', fn: () => descarcaProiect() },
        { ico: 'incarca', text: 'Deschide un proiect din fișier…', fn: () => incarcaProiect() },
      ], 'fisier');
    }

    // ======================================================================
    // MODUL 1: ANIMAȚIE CADRU CU CADRU
    // ======================================================================
    let UA = null;
    const istA = [], refA = [];
    function pasA() {
      istA.push({ cadre: A.cadre.slice(), idx: A.idx }); if (istA.length > 40) istA.shift();
      refA.length = 0;
    }
    function schimbatA() { A.modificat = true; ciornaMaiTarziu(); ui(); }
    function anuleazaA() { if (!istA.length) return; refA.push({ cadre: A.cadre.slice(), idx: A.idx }); Object.assign(A, istA.pop()); A.idx = clamp(A.idx, 0, A.cadre.length - 1); dupaStructuraA(); schimbatA(); }
    function refaceA() { if (!refA.length) return; istA.push({ cadre: A.cadre.slice(), idx: A.idx }); Object.assign(A, refA.pop()); A.idx = clamp(A.idx, 0, A.cadre.length - 1); dupaStructuraA(); schimbatA(); }

    function corpA() {
      if (!UA) {
        const vcv = canvasNou(WA, HA), ov = canvasNou(WA, HA);
        vcv.className = 'ap-animatie-cv'; ov.className = 'ap-animatie-ov'; ov.setAttribute('aria-label', 'Pânza cadrului curent'); ov.setAttribute('role', 'img');
        const pagina = h('div', { class: 'ap-animatie-pagina' }, vcv, ov);
        const zona = h('div', { class: 'ap-animatie-zona' }, pagina);
        const lista = h('div', { class: 'ap-animatie-cadre', role: 'listbox', 'aria-label': 'Banda de cadre' });
        const btnPlay = h('button', { type: 'button', class: 'ap-animatie-play', title: 'Redare / Pauză (Spațiu)', onclick: () => redaA() });
        const fpsVal = h('strong', {});
        const fpsIn = h('input', { type: 'range', min: '1', max: '24', step: '1', 'aria-label': 'Cadre pe secundă (FPS)', oninput: () => { A.fps = Number(fpsIn.value); fpsVal.textContent = `${A.fps} FPS`; schimbatA(); } });
        const banda = h('div', { class: 'ap-animatie-banda' },
          h('div', { class: 'ap-animatie-banda-cmd' }, btnPlay, h('label', { class: 'ap-animatie-fps' }, fpsVal, fpsIn)),
          lista,
          h('div', { class: 'ap-animatie-banda-cmd col' },
            h('button', { type: 'button', class: 'ap-animatie-adauga', title: 'Cadru nou (gol) după cel curent', onclick: () => cadruNou(false) }, ico('plus'), h('span', {}, 'Cadru nou')),
            h('button', { type: 'button', class: 'ap-animatie-adauga dup', title: 'Duplică cadrul curent (Ctrl+D) – apoi schimbă puțin desenul', onclick: () => cadruNou(true) }, ico('duplica'), h('span', {}, 'Duplică'))));
        const testare = h('div', { class: 'ap-animatie-testare', hidden: true });
        UA = { vcv, vctx: vcv.getContext('2d'), ov, octx: ov.getContext('2d'), pagina, zona, lista, btnPlay, fpsIn, fpsVal, banda, testare, miniaturi: [] };
        zona.append(testare);
        initDesenA();
        ro.observe(zona);
      }
      UA.fpsIn.value = String(A.fps); UA.fpsVal.textContent = `${A.fps} FPS`;
      legC.push(() => {
        UA.btnPlay.replaceChildren(ico(redA ? 'pauza' : 'play'), h('span', {}, redA ? 'Pauză' : 'Redare'));
        UA.btnPlay.setAttribute('aria-pressed', String(!!redA));
        UA.fpsIn.value = String(A.fps); UA.fpsVal.textContent = `${A.fps} FPS`;
        UA.testare.hidden = !S.testare; if (S.testare) testareA();
        [...UA.lista.children].forEach((el, i) => { el.setAttribute('aria-selected', String(i === A.idx)); });
        UA.pagina.dataset.unealta = A.unealta;
      });
      dupaStructuraA();
      return [UA.zona, UA.banda];
    }
    // Compunerea imaginii afișate: fundal + foaia de ceapă + cadrul curent
    const ceapaCv = canvasNou(WA, HA), ceapaCtx = ceapaCv.getContext('2d');
    function ceapa(c, src, culoare, alfa) {
      ceapaCtx.globalCompositeOperation = 'copy'; ceapaCtx.drawImage(src, 0, 0);
      ceapaCtx.globalCompositeOperation = 'source-atop'; ceapaCtx.fillStyle = culoare; ceapaCtx.globalAlpha = 0.55; ceapaCtx.fillRect(0, 0, WA, HA); ceapaCtx.globalAlpha = 1;
      c.globalAlpha = alfa; c.drawImage(ceapaCv, 0, 0); c.globalAlpha = 1;
    }
    function compuneA(c, i, cuCeapa) {
      c.fillStyle = A.fundal; c.fillRect(0, 0, WA, HA);
      if (cuCeapa && A.ceapa) {
        if (i > 0) ceapa(c, A.cadre[i - 1], '#e0193f', A.ceapaAlfa);
        if (A.ceapaUrm && i < A.cadre.length - 1) ceapa(c, A.cadre[i + 1], '#1f6fd1', A.ceapaAlfa * 0.8);
      }
      c.drawImage(A.cadre[i], 0, 0);
    }
    function afiseazaA() {
      if (!UA) return;
      compuneA(UA.vctx, A.idx, !redA);
      if (A.grila && !redA) {
        const c = UA.vctx; c.strokeStyle = 'rgba(31,111,209,.25)'; c.lineWidth = 1; c.beginPath();
        for (let x = 50; x < WA; x += 50) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, HA); }
        for (let y = 50; y < HA; y += 50) { c.moveTo(0, y + 0.5); c.lineTo(WA, y + 0.5); }
        c.stroke();
      }
    }
    function miniaturaA(i) {
      const el = UA.lista.children[i]; if (!el) return;
      const c = el.querySelector('canvas').getContext('2d');
      c.fillStyle = A.fundal; c.fillRect(0, 0, 128, 72); c.drawImage(A.cadre[i], 0, 0, 128, 72);
    }
    function dupaStructuraA() {
      if (!UA) return;
      UA.lista.replaceChildren(...A.cadre.map((_, i) => h('div', { class: 'ap-animatie-cadru', role: 'option', 'aria-selected': String(i === A.idx), title: `Cadrul ${i + 1} – trage ca să-l muți` },
        canvasNou(128, 72), h('span', { class: 'nr' }, String(i + 1)),
        h('button', { type: 'button', class: 'ap-animatie-cadru-x', title: 'Șterge cadrul', 'aria-label': `Șterge cadrul ${i + 1}`, onclick: (e) => { e.stopPropagation(); stergeCadru(i); } }, ico('x')))));
      A.cadre.forEach((_, i) => miniaturaA(i));
      afiseazaA(); ui();
      UA.lista.children[A.idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function mergiLaCadru(i) {
      A.idx = clamp(i, 0, A.cadre.length - 1); afiseazaA(); ui();
      UA?.lista.children[A.idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function cadruNou(duplica) {
      if (A.cadre.length >= MAX_CADRE) { toast(`Poți avea cel mult ${MAX_CADRE} de cadre.`); return; }
      opresteA(); pasA();
      A.cadre.splice(A.idx + 1, 0, duplica ? copie(A.cadre[A.idx]) : canvasNou(WA, HA));
      A.idx++; dupaStructuraA(); schimbatA();
      toast(duplica ? `Am duplicat cadrul. Acum ești pe cadrul ${A.idx + 1}: schimbă puțin desenul.` : `Cadrul ${A.idx + 1} e gol. Cadrul anterior se vede transparent (foaia de ceapă).`);
    }
    function stergeCadru(i = A.idx) {
      opresteA(); pasA();
      if (A.cadre.length === 1) { A.cadre[0] = canvasNou(WA, HA); toast('Am golit singurul cadru.'); }
      else { A.cadre.splice(i, 1); if (A.idx >= i && A.idx > 0) A.idx--; }
      A.idx = clamp(A.idx, 0, A.cadre.length - 1); dupaStructuraA(); schimbatA();
    }
    function mutaCadru(din, la) {
      la = clamp(la, 0, A.cadre.length - 1); if (din === la) return;
      pasA(); const [c] = A.cadre.splice(din, 1); A.cadre.splice(la, 0, c); A.idx = la; dupaStructuraA(); schimbatA();
    }
    function golesteCadru() { pasA(); A.cadre[A.idx] = canvasNou(WA, HA); miniaturaA(A.idx); afiseazaA(); schimbatA(); }

    // Reordonare prin tragere (merge și cu degetul)
    function reordonabil(lista, axa, laMutare, laClic) {
      lista.addEventListener('pointerdown', (e) => {
        const el = [...lista.children].find((x) => x.contains(e.target)); if (!el || e.target.closest('button, input, select') || e.button > 0) return;
        const elemente = [...lista.children], din = elemente.indexOf(el); if (din < 0) return;
        const x0 = e.clientX, y0 = e.clientY; let tras = false, tinta = din;
        const muta = (ev) => {
          const d = axa === 'x' ? ev.clientX - x0 : ev.clientY - y0;
          if (!tras && Math.abs(d) > 8) { tras = true; el.classList.add('trase'); lista.classList.add('reordonare'); }
          if (!tras) return;
          ev.preventDefault();
          tinta = elemente.length - 1;
          for (let i = 0; i < elemente.length; i++) { const r = elemente[i].getBoundingClientRect(); const mij = axa === 'x' ? r.left + r.width / 2 : r.top + r.height / 2; if ((axa === 'x' ? ev.clientX : ev.clientY) < mij) { tinta = i > din ? i - 1 : i; break; } }
          elemente.forEach((x, i) => x.classList.toggle('inainte', i === tinta && tinta < din));
          elemente.forEach((x, i) => x.classList.toggle('dupa', i === tinta && tinta > din));
        };
        const sus = () => {
          window.removeEventListener('pointermove', muta); window.removeEventListener('pointerup', sus); window.removeEventListener('pointercancel', sus);
          elemente.forEach((x) => x.classList.remove('trase', 'inainte', 'dupa')); lista.classList.remove('reordonare');
          if (tras) { if (tinta !== din) laMutare(din, tinta); } else laClic(din);
        };
        window.addEventListener('pointermove', muta, { passive: false }); window.addEventListener('pointerup', sus); window.addEventListener('pointercancel', sus);
      }, sig);
    }

    // ----- Desenarea pe cadru -----
    let trasare = null;
    const hexRgb = (hx) => { const n = parseInt(hx.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    function umplereA(cv, x, y, hex) {
      const c = cv.getContext('2d'), img = c.getImageData(0, 0, WA, HA), d = img.data;
      x = clamp(Math.floor(x), 0, WA - 1); y = clamp(Math.floor(y), 0, HA - 1);
      const i0 = (y * WA + x) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], [r, g, b] = hexRgb(hex);
      if (t[3] === 255 && t[0] === r && t[1] === g && t[2] === b) return false;
      const potriv = (i) => (t[3] === 0 ? d[i + 3] < 60 : Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) + Math.abs(d[i + 3] - t[3]) < 90);
      const vazut = new Uint8Array(WA * HA), stiva2 = [x, y];
      while (stiva2.length) {
        const yy = stiva2.pop(); let xx = stiva2.pop();
        while (xx >= 0 && !vazut[yy * WA + xx] && potriv((yy * WA + xx) * 4)) xx--;
        xx++; let susA = false, josA = false;
        while (xx < WA && !vazut[yy * WA + xx] && potriv((yy * WA + xx) * 4)) {
          const p = yy * WA + xx, i = p * 4; vazut[p] = 1; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
          if (yy > 0) { const ok = !vazut[p - WA] && potriv(i - WA * 4); if (ok && !susA) { stiva2.push(xx, yy - 1); susA = true; } else if (!ok) susA = false; }
          if (yy < HA - 1) { const ok = !vazut[p + WA] && potriv(i + WA * 4); if (ok && !josA) { stiva2.push(xx, yy + 1); josA = true; } else if (!ok) josA = false; }
          xx++;
        }
      }
      // marginile netezite ale liniilor: acoperim și pixelii vecini parțial transparenți
      for (let p = 0; p < WA * HA; p++) {
        if (vazut[p]) continue;
        const i = p * 4; if (d[i + 3] === 255) continue;
        if ((p % WA > 0 && vazut[p - 1]) || (p % WA < WA - 1 && vazut[p + 1]) || (p >= WA && vazut[p - WA]) || (p < WA * (HA - 1) && vazut[p + WA])) {
          const a = d[i + 3] / 255; d[i] = Math.round(d[i] * a + r * (1 - a)); d[i + 1] = Math.round(d[i + 1] * a + g * (1 - a)); d[i + 2] = Math.round(d[i + 2] * a + b * (1 - a)); d[i + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0); return true;
    }
    function forma(c, tip, a, b2) {
      c.beginPath();
      if (tip === 'linie') { c.moveTo(a.x, a.y); c.lineTo(b2.x, b2.y); c.stroke(); return; }
      if (tip === 'dreptunghi') c.rect(Math.min(a.x, b2.x), Math.min(a.y, b2.y), Math.abs(b2.x - a.x), Math.abs(b2.y - a.y));
      else c.ellipse((a.x + b2.x) / 2, (a.y + b2.y) / 2, Math.max(Math.abs(b2.x - a.x) / 2, 0.5), Math.max(Math.abs(b2.y - a.y) / 2, 0.5), 0, 0, Math.PI * 2);
      if (A.plin) { c.fillStyle = A.culoare; c.fill(); } c.stroke();
    }
    const stilLinie = (c) => { c.strokeStyle = A.culoare; c.lineWidth = A.grosime; c.lineCap = 'round'; c.lineJoin = 'round'; };
    function initDesenA() {
      const { ov, octx } = UA;
      const punct = (e) => { const r = ov.getBoundingClientRect(); return { x: (e.clientX - r.left) * WA / r.width, y: (e.clientY - r.top) * HA / r.height }; };
      ov.addEventListener('pointerdown', (e) => {
        if (e.button > 0 && e.pointerType === 'mouse') return;
        e.preventDefault(); inchideMeniu();
        if (redA) opresteA();
        ov.setPointerCapture(e.pointerId);
        const p = punct(e), u = A.unealta;
        pasA(); A.cadre[A.idx] = copie(A.cadre[A.idx]);
        const cv = A.cadre[A.idx], c = cv.getContext('2d');
        if (u === 'umplere') { if (!umplereA(cv, p.x, p.y, A.culoare)) istA.pop(); finalizeazaA(); return; }
        trasare = { u, a: p, ultim: p, cv, c, sursa: u === 'mutare' ? copie(cv) : null };
        if (u === 'creion' || u === 'pensula' || u === 'radiera') {
          c.save(); stilLinie(c);
          if (u === 'pensula') c.lineWidth = A.grosime * 2.2;
          if (u === 'radiera') { c.globalCompositeOperation = 'destination-out'; c.lineWidth = A.grosime * 2.5; }
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.01, p.y); c.stroke();
          afiseazaA();
        }
      }, sig);
      ov.addEventListener('pointermove', (e) => {
        if (!trasare) {
          if (A.unealta === 'radiera' && e.pointerType === 'mouse') { const p = punct(e); octx.clearRect(0, 0, WA, HA); octx.strokeStyle = '#555'; octx.lineWidth = 1; octx.beginPath(); octx.arc(p.x, p.y, A.grosime * 1.25, 0, Math.PI * 2); octx.stroke(); }
          return;
        }
        const T = trasare, evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        if (T.u === 'creion' || T.u === 'pensula' || T.u === 'radiera') {
          for (const ev of evs.length ? evs : [e]) { const p = punct(ev); T.c.beginPath(); T.c.moveTo(T.ultim.x, T.ultim.y); T.c.lineTo(p.x, p.y); T.c.stroke(); T.ultim = p; }
          afiseazaA();
          if (T.u === 'radiera') { const p = T.ultim; octx.clearRect(0, 0, WA, HA); octx.strokeStyle = '#555'; octx.lineWidth = 1; octx.beginPath(); octx.arc(p.x, p.y, A.grosime * 1.25, 0, Math.PI * 2); octx.stroke(); }
        } else if (T.u === 'mutare') {
          const p = punct(e); T.c.clearRect(0, 0, WA, HA); T.c.drawImage(T.sursa, Math.round(p.x - T.a.x), Math.round(p.y - T.a.y)); afiseazaA();
        } else {
          let p = punct(e);
          if (e.shiftKey && T.u !== 'linie') { const s = Math.max(Math.abs(p.x - T.a.x), Math.abs(p.y - T.a.y)); p = { x: T.a.x + Math.sign(p.x - T.a.x) * s, y: T.a.y + Math.sign(p.y - T.a.y) * s }; }
          T.ultim = p; octx.clearRect(0, 0, WA, HA); octx.save(); stilLinie(octx); forma(octx, T.u, T.a, p); octx.restore();
        }
      }, sig);
      const sus = () => {
        if (!trasare) return;
        const T = trasare; trasare = null;
        if (['linie', 'dreptunghi', 'elipsa'].includes(T.u)) { T.c.save(); stilLinie(T.c); forma(T.c, T.u, T.a, T.ultim); T.c.restore(); octx.clearRect(0, 0, WA, HA); }
        if (T.u === 'creion' || T.u === 'pensula' || T.u === 'radiera') T.c.restore();
        finalizeazaA();
      };
      ov.addEventListener('pointerup', sus, sig); ov.addEventListener('pointercancel', sus, sig);
      ov.addEventListener('pointerleave', () => { if (!trasare) octx.clearRect(0, 0, WA, HA); }, sig);
      reordonabil(UA.lista, 'x', (din, la) => mutaCadru(din, la), (i) => { opresteA(); mergiLaCadru(i); });
    }
    function finalizeazaA() { miniaturaA(A.idx); afiseazaA(); schimbatA(); }

    // ----- Redarea cadrelor -----
    let redA = null;
    function redaA() {
      if (redA) { opresteA(); return; }
      const start = A.idx >= A.cadre.length - 1 ? 0 : A.idx;
      redA = { t0: performance.now(), start, raf: 0 };
      const pas = (now) => {
        if (!redA) return;
        const k = Math.floor((now - redA.t0) / 1000 * A.fps); let i = redA.start + k;
        if (i >= A.cadre.length) { if (A.bucla) i %= A.cadre.length; else { A.idx = A.cadre.length - 1; opresteA(); return; } }
        if (i !== A.idx || k === 0) { A.idx = i; afiseazaA(); ui(); }
        redA.raf = requestAnimationFrame(pas);
      };
      redA.raf = requestAnimationFrame(pas);
      afiseazaA(); ui();
    }
    function opresteA() { if (!redA) return; cancelAnimationFrame(redA.raf); redA = null; afiseazaA(); ui(); UA?.lista.children[A.idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }

    // ----- Testare și depanare (cadru cu cadru) -----
    const mostraCtx = canvasNou(160, 90).getContext('2d', { willReadFrequently: true });
    function testareA() {
      const n = A.cadre.length, i = A.idx;
      const gol = (() => { mostraCtx.clearRect(0, 0, 160, 90); mostraCtx.drawImage(A.cadre[i], 0, 0, 160, 90); const d = mostraCtx.getImageData(0, 0, 160, 90).data; for (let k = 3; k < d.length; k += 4) if (d[k]) return false; return true; })();
      const identic = i > 0 && dataUrl(A.cadre[i]) === dataUrl(A.cadre[i - 1]);
      UA.testare.replaceChildren(
        h('strong', { class: 'tit' }, ico('depanare'), 'Testare pas cu pas'),
        bMic('primul', '', () => { opresteA(); mergiLaCadru(0); }, { titlu: 'Primul cadru' }),
        bMic('pasInapoi', '', () => { opresteA(); mergiLaCadru(i - 1); }, { titlu: 'Cadrul anterior (←)' }),
        bMic('pasInainte', '', () => { opresteA(); mergiLaCadru(i + 1); }, { titlu: 'Cadrul următor (→)' }),
        bMic('ultimul', '', () => { opresteA(); mergiLaCadru(n - 1); }, { titlu: 'Ultimul cadru' }),
        h('span', { class: 'info' }, `Cadrul ${i + 1} din ${n} · apare la ${sec(i / A.fps)} · stă ${sec(1 / A.fps)}`),
        gol ? h('span', { class: 'avert' }, ico('atentie'), 'Cadrul este gol') : identic ? h('span', { class: 'avert' }, ico('atentie'), 'La fel ca cadrul anterior: aici mișcarea se oprește') : h('span', { class: 'ok' }, ico('verifica'), 'Cadrul diferă de cel anterior'));
    }

    // ----- Panglica (cadru cu cadru) -----
    function panglicaA(fila) {
      const unealta = (k, text, titlu) => bMare(k, text, () => { A.unealta = k; UA.octx.clearRect(0, 0, WA, HA); ui(); }, { apasat: () => A.unealta === k, titlu });
      const culori = h('div', { class: 'ap-animatie-paleta' }, PALETA.map((c) => {
        const b = h('button', { type: 'button', class: 'ap-animatie-culoare', title: c, 'aria-label': `Culoarea ${c}`, onclick: () => { A.culoare = c; if (A.unealta === 'radiera' || A.unealta === 'mutare') A.unealta = 'creion'; ui(); } });
        b.style.background = c; legP.push(() => b.setAttribute('aria-pressed', String(A.culoare === c))); return b;
      }));
      const alege = h('input', { type: 'color', class: 'ap-animatie-alege', title: 'Altă culoare', 'aria-label': 'Altă culoare', oninput: () => { A.culoare = alege.value; ui(); } });
      const curenta = h('span', { class: 'ap-animatie-curenta', title: 'Culoarea curentă' });
      legP.push(() => { curenta.style.background = A.culoare; alege.value = A.culoare; });
      const grosimi = h('div', { class: 'ap-animatie-grosimi' }, GROSIMI.map((g) => {
        const b = h('button', { type: 'button', class: 'ap-animatie-gros', title: `Grosime ${g} px`, 'aria-label': `Grosime ${g} px`, onclick: () => { A.grosime = g; ui(); } }, h('i'));
        b.firstChild.style.width = b.firstChild.style.height = `${Math.min(g, 22) + 2}px`;
        legP.push(() => b.setAttribute('aria-pressed', String(A.grosime === g))); return b;
      }));
      if (fila === 'pornire') return [
        grup('Unelte', unealta('creion', 'Creion'), unealta('pensula', 'Pensulă', 'Pensulă groasă'), unealta('radiera', 'Radieră'), unealta('umplere', 'Umplere', 'Umple o zonă închisă cu culoarea curentă'), unealta('mutare', 'Mutare', 'Mută tot desenul din cadru (util pentru animație)')),
        grup('Forme', stiva(...[['linie', 'Linie'], ['dreptunghi', 'Dreptunghi'], ['elipsa', 'Elipsă']].map(([k, t]) => bMic(k, t, () => { A.unealta = k; UA.octx.clearRect(0, 0, WA, HA); ui(); }, { apasat: () => A.unealta === k }))),
          stiva(bMic('umplere', 'Forme pline', () => { A.plin = !A.plin; ui(); }, { apasat: () => A.plin, titlu: 'Formele se umplu cu culoarea curentă' }))),
        grup('Grosime', grosimi),
        grup('Culori', curenta, culori, alege),
        grup('Cadru', stiva(bMic('plus', 'Cadru nou', () => cadruNou(false)), bMic('duplica', 'Duplică', () => cadruNou(true)), bMic('sterge', 'Golește', () => golesteCadru(), { titlu: 'Șterge tot desenul din cadrul curent' }))),
      ];
      if (fila === 'inserare') {
        const fundal = h('input', { type: 'color', class: 'ap-animatie-alege mare', title: 'Culoarea de fundal a animației', 'aria-label': 'Culoarea de fundal', oninput: () => { A.fundal = fundal.value; A.cadre.forEach((_, i) => miniaturaA(i)); afiseazaA(); schimbatA(); } });
        legP.push(() => { fundal.value = A.fundal; });
        return [
          grup('Cadre', bMare('plus', 'Cadru nou', () => cadruNou(false), { titlu: 'Adaugă un cadru gol după cel curent' }), bMare('duplica', 'Duplică cadrul', () => cadruNou(true), { titlu: 'Copie a cadrului curent (Ctrl+D)' }), bMare('sterge', 'Șterge cadrul', () => stergeCadru())),
          grup('Ordine', stiva(bMic('stanga', 'Mută mai devreme', () => mutaCadru(A.idx, A.idx - 1), { dez: () => A.idx === 0 }), bMic('dreapta', 'Mută mai târziu', () => mutaCadru(A.idx, A.idx + 1), { dez: () => A.idx >= A.cadre.length - 1 }))),
          grup('Imagine', bMare('imagine', 'Imagine pe cadru', () => imagineInCadru(), { titlu: 'Pune o imagine de pe calculator în cadrul curent' })),
          grup('Fundal', h('label', { class: 'ap-animatie-et-col' }, fundal, h('span', {}, 'Culoare fundal'))),
        ];
      }
      if (fila === 'animatii') {
        const fps = h('input', { type: 'range', min: '1', max: '24', step: '1', class: 'ap-animatie-fps-pg', 'aria-label': 'Cadre pe secundă', oninput: () => { A.fps = Number(fps.value); schimbatA(); } });
        const fpsTxt = h('strong', {});
        legP.push(() => { fps.value = String(A.fps); fpsTxt.textContent = `${A.fps} FPS`; });
        const durata = h('span', { class: 'ap-animatie-mic-info' }); legP.push(() => { durata.textContent = `${A.cadre.length} cadre : ${A.fps} FPS = ${sec(A.cadre.length / A.fps)}`; });
        return [
          grup('Redare', bMare('play', 'Redare', () => redaA(), { apasat: () => !!redA, titlu: 'Redare / Pauză (Spațiu)' }), bMare('ecran', 'Ecran complet', () => previzualizare(true))),
          grup('Viteză (FPS)', stiva(h('div', { class: 'ap-animatie-rand' }, fpsTxt, h('span', { class: 'ap-animatie-mic-info' }, '1 = lent · 24 = fluent')), fps, durata)),
          grup('Repetare', bMare('bucla', 'Buclă', () => { A.bucla = !A.bucla; schimbatA(); }, { apasat: () => A.bucla, titlu: 'Redarea reia de la primul cadru' })),
          grup('Verificare', bMare('depanare', 'Testare și depanare', () => { S.testare = !S.testare; if (S.testare) opresteA(); ui(); }, { apasat: () => S.testare, titlu: 'Treci prin animație cadru cu cadru' })),
        ];
      }
      const alfa = h('input', { type: 'range', min: '0.1', max: '0.7', step: '0.05', 'aria-label': 'Opacitatea foii de ceapă', oninput: () => { A.ceapaAlfa = Number(alfa.value); afiseazaA(); } });
      legP.push(() => { alfa.value = String(A.ceapaAlfa); });
      return [
        grup('Previzualizare', bMare('ecran', 'Ecran complet', () => previzualizare(true), { titlu: 'Redare pe tot ecranul (F5)' })),
        grup('Foaie de ceapă', bMare('ceapa', 'Foaie de ceapă', () => { A.ceapa = !A.ceapa; afiseazaA(); ui(); }, { apasat: () => A.ceapa, titlu: 'Arată transparent cadrul anterior' }),
          stiva(bMic('dreapta', 'Și cadrul următor', () => { A.ceapaUrm = !A.ceapaUrm; afiseazaA(); ui(); }, { apasat: () => A.ceapaUrm }), h('label', { class: 'ap-animatie-et-mic' }, 'Opacitate', alfa))),
        grup('Ajutor', bMare('grila', 'Grilă', () => { A.grila = !A.grila; afiseazaA(); ui(); }, { apasat: () => A.grila })),
        grup('Verificare', bMare('depanare', 'Testare și depanare', () => { S.testare = !S.testare; if (S.testare) opresteA(); ui(); }, { apasat: () => S.testare })),
      ];
    }
    function imagineInCadru() {
      const inp = h('input', { type: 'file', accept: 'image/*' });
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const fr = new FileReader();
        fr.onload = async () => {
          try {
            const img = await incarcaImagine(fr.result), k = Math.min(WA / img.naturalWidth, HA / img.naturalHeight, 1);
            pasA(); A.cadre[A.idx] = copie(A.cadre[A.idx]);
            const w = img.naturalWidth * k, hh = img.naturalHeight * k;
            A.cadre[A.idx].getContext('2d').drawImage(img, (WA - w) / 2, (HA - hh) / 2, w, hh); finalizeazaA();
          } catch { toast('Nu am putut deschide imaginea.'); }
        };
        fr.readAsDataURL(f);
      };
      inp.click();
    }
    function nouA() {
      opresteRedari();
      const fa = async () => {
        Object.assign(A, { titlu: 'Animația mea', id: null, creat: null, modificat: false, fps: 8, bucla: true, fundal: '#ffffff', cadre: [canvasNou(WA, HA)], idx: 0 });
        istA.length = 0; refA.length = 0;
        if (S.mod !== 'cadre') seteazaMod('cadre'); else dupaStructuraA();
        ui(); salveazaCiorna();
      };
      if (A.modificat && S.mod === 'cadre') confirma('Animație nouă', 'Începi o animație nouă? Ce nu ai salvat din animația curentă se pierde.', 'Începe').then((d) => d && fa()); else fa();
    }

    // ======================================================================
    // MODUL 2: PERSONAJE ȘI CRONOLOGIE
    // ======================================================================
    let UB = null, redB = null, recVoce = null, inreg = null, tras = null;
    const istB = [], refB = [];
    const pune = (el, ...k) => el.replaceChildren(...k.filter((x) => x != null && x !== false));
    const ET = 172; // lățimea coloanei cu etichete din cronologie
    const scena = () => B.doc.scene[B.scIdx];
    const durVoce = (sc) => (sc.voce && B.doc.voci?.[sc.voce]?.dur) || 0;
    const timScena = (sc) => temporizare(sc, durVoce(sc));
    const obiect = (id, sc = scena()) => sc.obiecte.find((o) => o.id === id);
    const efect = (id, sc = scena()) => sc.efecte.find((e) => e.id === id);
    const instantaneu = () => JSON.stringify({ ...B.doc, voci: undefined });
    function pasB(inst) { istB.push(inst || instantaneu()); if (istB.length > 60) istB.shift(); refB.length = 0; }
    function restaurareB(json) {
      const voci = B.doc.voci; B.doc = { ...JSON.parse(json), voci };
      B.scIdx = clamp(B.scIdx, 0, B.doc.scene.length - 1);
      if (B.sel && !obiect(B.sel)) B.sel = null;
      if (B.efSel && !efect(B.efSel)) B.efSel = null;
    }
    function anuleazaB() { if (!istB.length) return; refB.push(instantaneu()); restaurareB(istB.pop()); totulB(); schimbatB(); }
    function refaceB() { if (!refB.length) return; istB.push(instantaneu()); restaurareB(refB.pop()); totulB(); schimbatB(); }
    function schimbatB() { B.modificat = true; ciornaMaiTarziu(); ui(); clearTimeout(schimbatB.t); schimbatB.t = setTimeout(() => miniaturaScena(B.scIdx), 200); }
    function totulB() { if (!UB) return; listaSceneB(); deseneazaB(); cronologieB(); panouB(); ui(); }
    const numeEfect = (e, sc = scena()) => `${e.cat === 'sunet' ? 'Scenă' : (obiect(e.obj, sc)?.nume || '?')}: ${CATEGORII[e.cat].tipuri[e.tip]}`;

    function corpB() {
      if (!UB) {
        const cv = canvasNou(LAT, INA); cv.className = 'ap-animatie-cv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Scena animației');
        const pagina = h('div', { class: 'ap-animatie-pagina scena' }, cv);
        const banner = h('div', { class: 'ap-animatie-banner', hidden: true });
        const testare = h('div', { class: 'ap-animatie-testare', hidden: true });
        const zona = h('div', { class: 'ap-animatie-zona' }, pagina, banner, testare);
        const scene = h('div', { class: 'ap-animatie-scene-lista', role: 'listbox', 'aria-label': 'Scenele poveștii' });
        const coloana = h('div', { class: 'ap-animatie-col-scene' }, h('div', { class: 'ap-animatie-col-cap' }, h('strong', {}, 'Scene'), h('span', { class: 'pv' })), scene,
          h('button', { type: 'button', class: 'ap-animatie-adauga mic', onclick: () => scenaNouaB() }, ico('plus'), h('span', {}, 'Scenă')));
        const panouTab = h('div', { class: 'ap-animatie-panou-tab', role: 'tablist' }, [['animatii', 'Animații'], ['obiect', 'Obiect'], ['scena', 'Scenă']].map(([k, t]) =>
          h('button', { type: 'button', role: 'tab', 'data-k': k, onclick: () => { B.panou = k; panouB(); } }, t)));
        const panouCorp = h('div', { class: 'ap-animatie-panou-corp' });
        const panou = h('aside', { class: 'ap-animatie-panou' }, panouTab, panouCorp);
        const crono = h('div', { class: 'ap-animatie-crono' });
        const mijloc = h('div', { class: 'ap-animatie-mijloc' }, coloana, zona, panou);
        UB = { cv, ctx: cv.getContext('2d'), pagina, zona, banner, testare, scene, coloana, panou, panouTab, panouCorp, crono, mijloc, miniaturi: [] };
        initScenaB();
        reordonabil(scene, 'y', (din, la) => mutaScena(din, la), (i) => selecteazaScena(i));
        ro.observe(zona);
      }
      legC.push(() => {
        UB.testare.hidden = !S.testare; if (S.testare) testareB();
        UB.banner.hidden = !B.inreg && !recVoce;
        UB.banner.replaceChildren(...(recVoce ? [h('span', { class: 'rec' }), 'Se înregistrează vocea… Povestește! ', buton('Oprește', () => inregistreazaVoce(), 'mic')]
          : [ico('miscare'), `Trage „${obiect(B.sel)?.nume || 'personajul'}” pe drumul dorit. Se înregistrează și viteza. `, buton('Renunță', () => { B.inreg = false; ui(); deseneazaB(); }, 'mic')]));
        butoaneRedare();
        UB.coloana.querySelector('.pv').textContent = POVESTI[B.doc.poveste]?.en || '';
        UB.pagina.classList.toggle('inreg', B.inreg);
      });
      totulB();
      return [UB.mijloc, UB.crono];
    }

    // ----- Lista de scene -----
    function miniaturaScena(i) {
      const cv = UB?.scene.children[i]?.querySelector('canvas'); if (!cv) return;
      const c = cv.getContext('2d'); c.setTransform(cv.width / LAT, 0, 0, cv.height / INA, 0, 0); randeazaScena(c, B.doc.scene[i], null); c.setTransform(1, 0, 0, 1, 0, 0);
    }
    function listaSceneB() {
      UB.scene.replaceChildren(...B.doc.scene.map((sc, i) => h('div', { class: 'ap-animatie-scena-el', role: 'option', 'aria-selected': String(i === B.scIdx), title: `${sc.nume}${sc.indiciu ? ` – ${sc.indiciu}` : ''} (trage ca să muți)` },
        canvasNou(192, 108), h('span', { class: 'nume' }, h('b', {}, `${i + 1}`), ` ${sc.nume}`))));
      B.doc.scene.forEach((_, i) => miniaturaScena(i));
    }
    function selecteazaScena(i) {
      opresteB(); B.scIdx = clamp(i, 0, B.doc.scene.length - 1); B.sel = null; B.efSel = null; B.viz = null; B.inreg = false;
      [...UB.scene.children].forEach((el, k) => el.setAttribute('aria-selected', String(k === B.scIdx)));
      deseneazaB(); cronologieB(); panouB(); ui();
    }
    function scenaNouaB() {
      opresteB(); pasB();
      const n = B.doc.scene.length;
      B.doc.scene.splice(B.scIdx + 1, 0, scenaNoua(`Scena ${n + 1}`, 'Ce se întâmplă în această scenă?', scena()?.decor || 'parc'));
      B.scIdx++; listaSceneB(); selecteazaScena(B.scIdx); schimbatB();
    }
    function dupScena() {
      opresteB(); pasB();
      const c = JSON.parse(JSON.stringify(scena())); c.id = idNou(); c.nume += ' (copie)';
      const harta = {}; c.obiecte.forEach((o) => { const v = o.id; o.id = idNou(); harta[v] = o.id; });
      c.efecte.forEach((e) => { e.id = idNou(); if (e.obj) e.obj = harta[e.obj]; });
      B.doc.scene.splice(B.scIdx + 1, 0, c); B.scIdx++; listaSceneB(); selecteazaScena(B.scIdx); schimbatB();
    }
    async function stergeScena() {
      if (B.doc.scene.length === 1) { toast('Povestea trebuie să aibă cel puțin o scenă.'); return; }
      if (scena().obiecte.length && !(await confirma('Șterge scena', `Ștergi scena „${scena().nume}” cu tot ce are în ea?`, 'Șterge'))) return;
      opresteB(); pasB(); B.doc.scene.splice(B.scIdx, 1); B.scIdx = Math.min(B.scIdx, B.doc.scene.length - 1); listaSceneB(); selecteazaScena(B.scIdx); schimbatB();
    }
    function mutaScena(din, la) { pasB(); const [s] = B.doc.scene.splice(din, 1); B.doc.scene.splice(la, 0, s); B.scIdx = la; listaSceneB(); selecteazaScena(la); schimbatB(); }

    // ----- Desenarea scenei în editor -----
    const kAfis = () => (UB.pagina.clientWidth || LAT) / LAT;
    const spreGlobal = (o, lx, ly) => { const a = o.rot * Math.PI / 180, x = lx * o.sc, y = ly * o.sc; return { x: o.x + x * Math.cos(a) - y * Math.sin(a), y: o.y + x * Math.sin(a) + y * Math.cos(a) }; };
    const spreLocal = (o, p) => { const a = -o.rot * Math.PI / 180, dx = p.x - o.x, dy = p.y - o.y; return { x: (dx * Math.cos(a) - dy * Math.sin(a)) / o.sc, y: (dx * Math.sin(a) + dy * Math.cos(a)) / o.sc }; };
    const loveste = (o, p) => { const d = dimObiect(o), l = spreLocal(o, p); return Math.abs(l.x) <= d.w / 2 + 4 && Math.abs(l.y) <= d.h / 2 + 4; };
    let manere = [];
    function deseneazaB() {
      if (!UB) return;
      const c = UB.ctx, sc = scena(), tim = timScena(sc);
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (B.viz != null) { randeazaScena(c, sc, B.viz, tim); return; }
      c.drawImage(imagineDecor(sc.decor || '#ffffff'), 0, 0);
      for (const o of sc.obiecte) {
        const s = stareBaza(o);
        if (inreg && o.id === B.sel) { s.x += inreg.dx; s.y += inreg.dy; }
        deseneazaObiect(c, o, s);
      }
      const k = kAfis(), r = 7 / k;
      manere = [];
      if (B.grila) {
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath();
        for (let x = 60; x < LAT; x += 60) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, INA); } for (let y = 60; y < INA; y += 60) { c.moveTo(0, y + 0.5); c.lineTo(LAT, y + 0.5); }
        c.stroke();
      }
      // Etichete cu numerele efectelor fiecărui obiect (ca în PowerPoint)
      c.font = `bold ${Math.round(13 / k)}px Arial, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'center';
      for (const o of sc.obiecte) {
        const nr = sc.efecte.map((e, i) => (e.obj === o.id ? i + 1 : 0)).filter(Boolean); if (!nr.length) continue;
        const d = dimObiect(o), txt = nr.slice(0, 6).join(','), w = c.measureText(txt).width + 10 / k, x = o.x - d.w * o.sc / 2, y = o.y - d.h * o.sc / 2;
        c.fillStyle = 'rgba(23,20,22,.75)'; c.beginPath(); c.roundRect(x - w, y - 9 / k, w, 18 / k, 4 / k); c.fill();
        c.fillStyle = '#fff'; c.fillText(txt, x - w / 2, y);
      }
      const o = obiect(B.sel); if (!o) return;
      // Traseele efectelor de mișcare ale obiectului selectat
      if (B.trasee) {
        const ale = tim.ef.filter((x) => x.e.obj === o.id && x.e.cat === 'miscare');
        for (const { e, t0 } of ale) {
          const st = stari(sc, tim, t0 - 1e-6).get(o.id) || stareBaza(o), sx = st.x, sy = st.y, sel = e.id === B.efSel;
          c.save(); c.setLineDash([8 / k, 6 / k]); c.lineWidth = (sel ? 3.5 : 2.5) / k; c.strokeStyle = sel ? '#1f6fd1' : 'rgba(31,111,209,.7)';
          c.beginPath(); for (let i = 0; i <= 60; i++) { const [dx, dy] = offsetMiscare(e, i / 60); i ? c.lineTo(sx + dx, sy + dy) : c.moveTo(sx + dx, sy + dy); } c.stroke(); c.restore();
          const [ex, ey] = offsetMiscare(e, 1);
          c.fillStyle = '#12968d'; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#d9173e'; c.strokeStyle = '#fff'; c.lineWidth = 2 / k; c.beginPath(); c.arc(sx + ex, sy + ey, r * 1.2, 0, Math.PI * 2); c.fill(); c.stroke();
          if (['linie', 'arc', 'topait'].includes(e.tip)) manere.push({ tip: 'traseu', e, x: sx + ex, y: sy + ey, sx, sy });
        }
      }
      // Chenarul de selecție, cu mânere pentru mărime și rotire
      const d = dimObiect(o), colt = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b2]) => spreGlobal(o, a * d.w / 2, b2 * d.h / 2));
      const rot = spreGlobal(o, 0, -d.h / 2 - 30 / k / o.sc), sus = spreGlobal(o, 0, -d.h / 2);
      c.save(); c.strokeStyle = '#1f6fd1'; c.lineWidth = 2 / k; c.setLineDash([6 / k, 4 / k]);
      c.beginPath(); colt.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.stroke();
      c.setLineDash([]); c.beginPath(); c.moveTo(sus.x, sus.y); c.lineTo(rot.x, rot.y); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(rot.x, rot.y, r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#1f6fd1'; c.fillRect(colt[2].x - r, colt[2].y - r, r * 2, r * 2);
      c.restore();
      manere.push({ tip: 'rotire', x: rot.x, y: rot.y }, { tip: 'marime', x: colt[2].x, y: colt[2].y });
    }

    // ----- Interacțiunea cu scena: selectare, mutare, mărime, rotire, înregistrare traseu -----
    function initScenaB() {
      const { cv } = UB;
      const punct = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * LAT / r.width, y: (e.clientY - r.top) * INA / r.height }; };
      cv.addEventListener('pointerdown', (e) => {
        if (e.button > 0 && e.pointerType === 'mouse') return;
        e.preventDefault(); inchideMeniu();
        if (redB) opresteB();
        const p = punct(e), sc = scena();
        cv.setPointerCapture(e.pointerId);
        if (B.inreg) {
          const o = obiect(B.sel); if (!o) { B.inreg = false; ui(); return; }
          inreg = { x0: p.x, y0: p.y, t0: performance.now(), pts: [[0, 0, 0]], dx: 0, dy: 0 };
          deseneazaB(); return;
        }
        if (B.viz != null) { B.viz = null; pozCap(); if (S.testare) testareB(); }
        const k = kAfis(), raza = 16 / k;
        const m = manere.find((x) => Math.hypot(x.x - p.x, x.y - p.y) <= raza);
        const o = obiect(B.sel);
        if (m && o) {
          tras = { tip: m.tip, p0: p, o, inst: instantaneu(), sc0: o.sc, rot0: o.rot, d0: Math.hypot(p.x - o.x, p.y - o.y) || 1, m, e0: m.e ? JSON.parse(JSON.stringify(m.e.p)) : null, mutat: false };
          return;
        }
        const tinta = [...sc.obiecte].reverse().find((x) => loveste(x, p));
        if (tinta) {
          if (B.sel !== tinta.id) { B.sel = tinta.id; const ef = sc.efecte.find((x) => x.obj === tinta.id); if (B.efSel && efect(B.efSel)?.obj !== tinta.id) B.efSel = ef?.id || null; }
          tras = { tip: 'muta', p0: p, o: tinta, x0: tinta.x, y0: tinta.y, inst: instantaneu(), mutat: false };
        } else { B.sel = null; B.efSel = null; }
        deseneazaB(); panouB(); cronologieB(); ui();
      }, sig);
      cv.addEventListener('pointermove', (e) => {
        const p = punct(e);
        if (inreg) {
          inreg.dx = p.x - inreg.x0; inreg.dy = p.y - inreg.y0;
          inreg.pts.push([inreg.dx, inreg.dy, (performance.now() - inreg.t0) / 1000]);
          deseneazaB();
          const c = UB.ctx, o = obiect(B.sel), k = kAfis();
          c.save(); c.strokeStyle = '#d9173e'; c.lineWidth = 3 / k; c.setLineDash([6 / k, 5 / k]); c.beginPath();
          inreg.pts.forEach(([x, y], i) => (i ? c.lineTo(o.x + x, o.y + y) : c.moveTo(o.x + x, o.y + y))); c.stroke(); c.restore();
          return;
        }
        if (!tras) { cv.style.cursor = manere.some((x) => Math.hypot(x.x - p.x, x.y - p.y) <= 16 / kAfis()) ? 'pointer' : scena().obiecte.some((x) => loveste(x, p)) ? 'move' : 'default'; return; }
        const T = tras, o = T.o;
        if (!T.mutat && Math.hypot(p.x - T.p0.x, p.y - T.p0.y) < 2) return;
        if (!T.mutat) { T.mutat = true; pasB(T.inst); }
        if (T.tip === 'muta') { o.x = Math.round(T.x0 + p.x - T.p0.x); o.y = Math.round(T.y0 + p.y - T.p0.y); }
        else if (T.tip === 'marime') o.sc = r1(clamp(T.sc0 * Math.hypot(p.x - o.x, p.y - o.y) / T.d0, 0.2, 5) * 10) / 10;
        else if (T.tip === 'rotire') { let a = Math.atan2(p.y - o.y, p.x - o.x) * 180 / Math.PI + 90; if (a > 180) a -= 360; if (!e.altKey) a = Math.round(a / 5) * 5; if (e.shiftKey) a = Math.round(a / 15) * 15; o.rot = a; }
        else if (T.tip === 'traseu') {
          const ef = T.m.e, ex = Math.round(p.x - T.m.sx), ey = Math.round(p.y - T.m.sy);
          ef.p.dx = ex; if (ef.tip !== 'topait') ef.p.dy = ey;
        }
        deseneazaB();
      }, sig);
      const sus = () => {
        if (inreg) { termInregistrare(); return; }
        if (!tras) return;
        const T = tras; tras = null;
        if (T.mutat) { schimbatB(); cronologieB(); panouB(); }
        deseneazaB(); ui();
      };
      cv.addEventListener('pointerup', sus, sig); cv.addEventListener('pointercancel', sus, sig);
      cv.addEventListener('dblclick', (e) => { const p = punct(e), t = [...scena().obiecte].reverse().find((x) => loveste(x, p)); if (t) { B.sel = t.id; B.panou = 'obiect'; panouB(); setTimeout(() => UB.panouCorp.querySelector('textarea, input')?.focus(), 30); } }, sig);
    }
    function pornesteInregistrare() {
      if (!obiect(B.sel)) { toast('Atinge mai întâi un personaj din scenă, apoi înregistrează traseul.'); return; }
      opresteB(); B.viz = null; B.inreg = !B.inreg; deseneazaB(); ui();
      if (B.inreg) toast('Acum trage personajul pe scenă, pe drumul dorit.');
    }
    function termInregistrare() {
      const R = inreg; inreg = null; B.inreg = false;
      const dur = R.pts[R.pts.length - 1][2];
      if (R.pts.length < 3 || dur < 0.15 || Math.hypot(R.dx, R.dy) < 5) { toast('Traseul e prea scurt. Încearcă din nou: trage personajul mai mult.'); B.inreg = true; deseneazaB(); ui(); return; }
      // Reeșantionăm traseul la 30 de puncte pe secundă, ca să păstrăm viteza înregistrată
      const n = clamp(Math.round(dur * 30), 2, 900), pts = [];
      for (let i = 0, j = 0; i <= n; i++) {
        const t = dur * i / n; while (j < R.pts.length - 2 && R.pts[j + 1][2] < t) j++;
        const a = R.pts[j], b2 = R.pts[j + 1] || a, u = b2[2] > a[2] ? clamp((t - a[2]) / (b2[2] - a[2]), 0, 1) : 0;
        pts.push([Math.round(lerp(a[0], b2[0], u)), Math.round(lerp(a[1], b2[1], u))]);
      }
      const e = efectNou('miscare', 'traseu', B.sel); e.p.pts = pts; e.dur = clamp(r1(dur), 0.3, 30);
      insereazaEfect(e);
      toast(`Am înregistrat traseul (${sec(e.dur)}). Îl vezi punctat pe scenă.`);
    }

    // ----- Obiecte -----
    function numeUnic(baza) { const sc = scena(); let n = baza, i = 2; while (sc.obiecte.some((o) => o.nume === n)) n = `${baza} ${i++}`; return n; }
    function adaugaObiect(o) {
      opresteB(); pasB();
      const n = scena().obiecte.length;
      Object.assign(o, { id: idNou(), x: 300 + (n % 5) * 90, y: o.y ?? 330 - (n % 3) * 20, sc: 1, rot: 0, flip: false });
      scena().obiecte.push(o); B.sel = o.id; B.efSel = null; B.viz = null;
      deseneazaB(); panouB(); cronologieB(); schimbatB();
    }
    function adaugaPersonaj(fel) {
      const d = PERSONAJE[fel];
      adaugaObiect({ tip: 'personaj', fel, nume: numeUnic(d.nume), culoare: d.culoare, y: fel === 'soare' || fel === 'nor' || fel === 'pasare' ? 120 : fel === 'copac' ? 300 : 360 });
      toast(`Am adăugat „${obiect(B.sel).nume}”. Trage-l unde vrei, apoi alege un efect din fila Animații.`);
    }
    function adaugaText(tip) {
      adaugaObiect({ tip, nume: numeUnic(tip === 'balon' ? 'Balon' : 'Text'), text: tip === 'balon' ? 'Bună! Ce faci?' : 'Titlul poveștii', marime: tip === 'balon' ? 24 : 48, culoare: '#2a2230', y: tip === 'balon' ? 180 : 80 });
      B.panou = 'obiect'; panouB();
      setTimeout(() => { const t = UB.panouCorp.querySelector('textarea'); t?.focus(); t?.select(); }, 40);
    }
    function dupObiect() {
      const o = obiect(B.sel); if (!o) return;
      opresteB(); pasB();
      const c = { ...JSON.parse(JSON.stringify(o)), id: idNou(), nume: numeUnic(o.nume.replace(/ \d+$/, '')), x: o.x + 40, y: o.y + 20 };
      scena().obiecte.push(c); B.sel = c.id; deseneazaB(); panouB(); schimbatB();
    }
    function stergeObiect() {
      const o = obiect(B.sel); if (!o) return;
      opresteB(); pasB(); const sc = scena();
      sc.obiecte = sc.obiecte.filter((x) => x.id !== o.id); sc.efecte = sc.efecte.filter((e) => e.obj !== o.id);
      B.sel = null; B.efSel = null; deseneazaB(); panouB(); cronologieB(); schimbatB();
    }
    function ordineObiect(fata) {
      const o = obiect(B.sel); if (!o) return;
      pasB(); const sc = scena(); sc.obiecte = sc.obiecte.filter((x) => x !== o); if (fata) sc.obiecte.push(o); else sc.obiecte.unshift(o);
      deseneazaB(); schimbatB();
    }
    function oglindeste() { const o = obiect(B.sel); if (!o) return; pasB(); o.flip = !o.flip; deseneazaB(); panouB(); schimbatB(); }
    function seteazaDecor(k) { opresteB(); pasB(); scena().decor = k; B.viz = null; deseneazaB(); panouB(); schimbatB(); }

    // ----- Efecte -----
    function insereazaEfect(e) {
      opresteB(); pasB();
      const sc = scena(), i = B.efSel ? sc.efecte.findIndex((x) => x.id === B.efSel) : -1;
      if (i >= 0) sc.efecte.splice(i + 1, 0, e); else sc.efecte.push(e);
      if (sc.efecte.length === 1 && e.start === 'dupa') e.start = 'dupa';
      B.efSel = e.id; B.panou = 'animatii'; B.viz = null;
      deseneazaB(); panouB(); cronologieB(); schimbatB();
      previzEfect(e);
    }
    function adaugaEfect(cat, tip) {
      if (cat !== 'sunet' && !obiect(B.sel)) { toast('Atinge mai întâi un personaj sau un text din scenă, apoi alege efectul.'); return; }
      if (tip === 'traseu') { B.inreg = false; pornesteInregistrare(); return; }
      insereazaEfect(efectNou(cat, tip, cat === 'sunet' ? null : B.sel));
    }
    function stergeEfect(id = B.efSel) {
      const sc = scena(), i = sc.efecte.findIndex((e) => e.id === id); if (i < 0) return;
      opresteB(); pasB(); sc.efecte.splice(i, 1); B.efSel = sc.efecte[Math.min(i, sc.efecte.length - 1)]?.id || null;
      deseneazaB(); panouB(); cronologieB(); schimbatB();
    }
    function mutaEfectLa(din, la) {
      const sc = scena(); la = clamp(la, 0, sc.efecte.length - 1); if (din === la || din < 0) return;
      pasB(); const [e] = sc.efecte.splice(din, 1); sc.efecte.splice(la, 0, e); B.efSel = e.id;
      deseneazaB(); panouB(); cronologieB(); schimbatB();
    }
    const mutaEfect = (d) => { const i = scena().efecte.findIndex((e) => e.id === B.efSel); if (i >= 0) mutaEfectLa(i, i + d); };
    function selecteazaEfect(id) {
      const e = efect(id); if (!e) return;
      B.efSel = id; if (e.obj) B.sel = e.obj; B.viz = null;
      deseneazaB(); panouB(); cronologieB(); ui();
    }

    // ----- Panoul din dreapta: Animații / Obiect / Scenă -----
    function legaCamp(el, set, laSfarsit) {
      let inst = null;
      el.addEventListener('focus', () => { inst = instantaneu(); });
      el.addEventListener('input', () => { if (inst == null) inst = instantaneu(); set(el); B.modificat = true; deseneazaB(); cronologieB(); if (UB.listaEf) listaEfB(); });
      el.addEventListener('change', () => { set(el); if (inst && inst !== instantaneu()) { pasB(inst); schimbatB(); } inst = instantaneu(); laSfarsit?.(); deseneazaB(); cronologieB(); ui(); });
      return el;
    }
    const rand = (et, ...c) => h('label', { class: 'ap-animatie-prop' }, h('span', { class: 'et' }, et), ...c);
    function campNum(val, min, max, pas, set, laSf) { return legaCamp(h('input', { type: 'number', value: String(val), min: String(min), max: String(max), step: String(pas), inputmode: 'decimal' }), (el) => { const v = Number(el.value); if (Number.isFinite(v) && el.value !== '') set(clamp(v, min, max)); }, laSf); }
    function campSelect(val, optiuni, set, laSf) { const s = h('select', {}, Object.entries(optiuni).map(([k, t]) => h('option', { value: k, selected: k === val || null }, t))); s.value = val; return legaCamp(s, (el) => set(el.value), laSf); }
    const OPTIUNI = {
      'intrare.glisare': [['dir', 'Intră din', 'select', DIRECTII]], 'iesire.glisare': [['dir', 'Iese spre', 'select', DIRECTII]],
      'miscare.linie': [['dx', 'Orizontal (px)', 'num', -1500, 1500, 10], ['dy', 'Vertical (px)', 'num', -900, 900, 10]],
      'miscare.arc': [['dx', 'Orizontal (px)', 'num', -1500, 1500, 10], ['dy', 'Vertical (px)', 'num', -900, 900, 10], ['h', 'Înălțimea arcului', 'num', -500, 500, 10]],
      'miscare.cerc': [['r', 'Raza (px)', 'num', 10, 300, 5]],
      'miscare.topait': [['dx', 'Distanța (px)', 'num', -1500, 1500, 10], ['h', 'Înălțimea (px)', 'num', 0, 400, 5], ['n', 'Nr. sărituri', 'num', 1, 12, 1]],
      'transf.rotire': [['grade', 'Unghi (grade)', 'num', -1440, 1440, 15]], 'transf.marire': [['factor', 'De câte ori (×)', 'num', 0.1, 5, 0.1]],
      'transf.culoare': [['nuanta', 'Nuanța (grade)', 'range', 0, 360, 5]], 'transf.transparenta': [['tinta', 'Opacitate finală', 'range', 0, 1, 0.05]],
      'transf.clipire': [['n', 'De câte ori', 'num', 1, 20, 1]], 'transf.tremur': [['amp', 'Cât de tare (px)', 'num', 1, 60, 1]],
    };
    function panouB() {
      if (!UB) return;
      [...UB.panouTab.children].forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === B.panou)));
      UB.listaEf = null;
      const c = UB.panouCorp, sc = scena();
      if (B.panou === 'animatii') {
        const lista = h('div', { class: 'ap-animatie-efecte', role: 'listbox', 'aria-label': 'Lista efectelor, în ordine' });
        UB.listaEf = lista; listaEfB();
        reordonabil(lista, 'y', (din, la) => mutaEfectLa(din, la), (i) => selecteazaEfect(scena().efecte[i]?.id));
        const e = efect(B.efSel);
        pune(c,
          h('div', { class: 'ap-animatie-panou-cap' }, h('strong', {}, 'Panou animații'), UB.btnRedP = buton('', () => redareB(), 'mic')),
          sc.efecte.length ? lista : h('p', { class: 'ap-animatie-gol' }, '1. Atinge un personaj din scenă.', h('br'), '2. Alege un efect din fila ', h('b', {}, 'Animații'), ': Intrare, Mișcare, Transformare, Ieșire sau Sunet.'),
          e ? panouTemporizare(e) : sc.efecte.length ? h('p', { class: 'ap-animatie-gol' }, 'Atinge un efect din listă ca să-i reglezi temporizarea: start, durată, întârziere.') : null);
        butoaneRedare();
      } else if (B.panou === 'obiect') {
        const o = obiect(B.sel);
        if (!o) { c.replaceChildren(h('p', { class: 'ap-animatie-gol' }, 'Niciun obiect selectat. Atinge un personaj sau un text din scenă.')); return; }
        const culoare = legaCamp(h('input', { type: 'color', value: o.culoare || '#2a2230' }), (el) => { o.culoare = el.value; });
        const ale = sc.efecte.filter((x) => x.obj === o.id).length;
        pune(c,
          o.tip === 'personaj' ? h('div', { class: 'ap-animatie-obj-cap' }, miniaturaPersonaj(o.fel, o.culoare, 28), h('strong', {}, PERSONAJE[o.fel].nume)) : null,
          rand('Nume', legaCamp(h('input', { type: 'text', value: o.nume, maxlength: '30' }), (el) => { o.nume = el.value.trim() || o.nume; })),
          o.tip !== 'personaj' ? rand('Text', legaCamp(h('textarea', { rows: '3', maxlength: '200' }, o.text), (el) => { o.text = el.value; })) : null,
          o.tip !== 'personaj' ? rand('Mărimea literelor', campNum(o.marime, 10, 120, 2, (v) => { o.marime = v; })) : null,
          rand(o.tip === 'personaj' ? 'Culoare principală' : 'Culoarea textului', culoare),
          rand('Mărime (×)', campNum(o.sc, 0.2, 5, 0.1, (v) => { o.sc = v; })),
          rand('Rotire (grade)', campNum(o.rot, -180, 180, 5, (v) => { o.rot = v; })),
          h('div', { class: 'ap-animatie-rand-but' }, buton('Oglindește', () => oglindeste(), 'mic'), buton('Duplică', () => dupObiect(), 'mic'), buton('Șterge', () => stergeObiect(), 'mic pericol')),
          h('div', { class: 'ap-animatie-rand-but' }, buton('Adu în față', () => ordineObiect(true), 'mic'), buton('Trimite în spate', () => ordineObiect(false), 'mic')),
          h('p', { class: 'ap-animatie-gol' }, ale ? `„${o.nume}” are ${ale} ${ale === 1 ? 'efect' : 'efecte'}.` : `„${o.nume}” nu are încă efecte. Alege unul din fila Animații.`));
      } else {
        const muzica = campSelect(sc.muzica || '', MUZICI, (v) => { sc.muzica = v; });
        const v = sc.voce && B.doc.voci[sc.voce];
        pune(c,
          rand('Numele scenei', legaCamp(h('input', { type: 'text', value: sc.nume, maxlength: '40' }), (el) => { sc.nume = el.value.trim() || sc.nume; }, () => listaSceneB())),
          rand('Scenariu: ce se întâmplă', legaCamp(h('textarea', { rows: '4', maxlength: '600', placeholder: sc.indiciu || 'Scrie scenariul scenei: personaje, mișcări, replici.' }, sc.scenariu || ''), (el) => { sc.scenariu = el.value; })),
          sc.indiciu ? h('p', { class: 'ap-animatie-indiciu' }, ico('info'), sc.indiciu) : null,
          h('div', { class: 'ap-animatie-prop' }, h('span', { class: 'et' }, 'Decor'), h('div', { class: 'ap-animatie-decor-rand' }, miniaturaDecor(sc.decor || '#ffffff', 60), buton('Schimbă decorul ▾', (ev) => meniuDecor(ev.currentTarget), 'mic'))),
          rand('Muzică de fundal', muzica),
          h('div', { class: 'ap-animatie-prop' }, h('span', { class: 'et' }, 'Voce (microfon)'),
            h('div', { class: 'ap-animatie-rand-but' }, buton(recVoce ? '■ Oprește înregistrarea' : '● Înregistrează vocea', () => inregistreazaVoce(), `mic ${recVoce ? 'pericol' : ''}`),
              v ? buton(`▶ Ascultă (${sec(v.dur)})`, () => asculta(sc.voce), 'mic') : null, v ? buton('Șterge vocea', () => { pasB(); sc.voce = null; panouB(); schimbatB(); }, 'mic') : null)),
          h('p', { class: 'ap-animatie-gol' }, `Scena durează ${sec(timScena(sc).durata)} (se calculează din efecte${v ? ' și din voce' : ''}).`));
      }
    }
    function listaEfB() {
      const sc = scena(), tim = timScena(sc);
      UB.listaEf.replaceChildren(...sc.efecte.map((e, i) => {
        const cat = CATEGORII[e.cat], x = tim.ef[i];
        const el = h('div', { class: `ap-animatie-ef${e.obj && e.obj === B.sel ? ' al-sel' : ''}`, role: 'option', 'aria-selected': String(e.id === B.efSel), title: `${numeEfect(e)} · ${STARTURI[e.start]} · începe la ${sec(x.t0)} · durează ${sec(e.dur)} (trage ca să schimbi ordinea)` },
          h('span', { class: 'nr' }, String(i + 1)), h('span', { class: 'start', title: STARTURI[e.start] }, ico(e.start === 'clic' ? 'clic' : e.start === 'cu' ? 'simultan' : 'dupa')),
          h('span', { class: 'cat' }, ico(cat.ico)), h('span', { class: 'txt' }, numeEfect(e)), h('span', { class: 'dur' }, sec(e.dur)));
        el.querySelector('.cat').style.color = cat.culoare; return el;
      }));
    }
    function panouTemporizare(e) {
      const cat = CATEGORII[e.cat], opt = OPTIUNI[`${e.cat}.${e.tip}`] || [];
      const optEl = opt.map(([k, et, tip, a, b2, pas]) => {
        if (tip === 'select') return rand(et, campSelect(e.p[k], a, (v) => { e.p[k] = v; }));
        if (tip === 'range') { const val = h('b', {}, String(e.p[k])); const r = legaCamp(h('input', { type: 'range', min: String(a), max: String(b2), step: String(pas), value: String(e.p[k]) }), (el) => { e.p[k] = Number(el.value); val.textContent = el.value; }); return rand(et, r, val); }
        return rand(et, campNum(e.p[k], a, b2, pas, (v) => { e.p[k] = v; }));
      });
      const capT = h('div', { class: 'ap-animatie-temp-cap' }, ico(cat.ico), h('span', {}, h('b', {}, numeEfect(e)), h('small', {}, ` (${cat.nume})`)));
      capT.firstChild.style.color = cat.culoare;
      return h('div', { class: 'ap-animatie-temp' }, capT,
        h('div', { class: 'ap-animatie-temp-tit' }, ico('ceas'), 'Temporizare'),
        rand('Start', campSelect(e.start, STARTURI, (v) => { e.start = v; })),
        rand('Durată (s)', campNum(e.dur, 0.1, 60, 0.1, (v) => { e.dur = v; })),
        rand('Întârziere (s)', campNum(e.delay || 0, 0, 60, 0.1, (v) => { e.delay = v; })),
        e.cat !== 'sunet' ? rand('Sunet', campSelect(e.sunet || '', { '': 'Fără sunet', ...Object.fromEntries(Object.entries(SUNETE).map(([k, v]) => [k, v.nume])) }, (v) => { e.sunet = v; })) : null,
        ...optEl,
        e.tip === 'traseu' ? h('p', { class: 'ap-animatie-gol' }, `Traseu înregistrat: ${e.p.pts?.length || 0} puncte.`, ' ', buton('Reînregistrează', () => { pasB(); const sc = scena(); sc.efecte = sc.efecte.filter((x) => x !== e); B.efSel = null; pornesteInregistrare(); cronologieB(); panouB(); }, 'mic')) : null,
        h('div', { class: 'ap-animatie-rand-but' },
          buton('▲', () => mutaEfect(-1), 'mic'), buton('▼', () => mutaEfect(1), 'mic'),
          buton('▶ Încearcă', () => previzEfect(e), 'mic'), buton('Șterge', () => stergeEfect(e.id), 'mic pericol')));
    }

    // ----- Cronologia (timeline) -----
    function butoaneRedare() {
      if (!UB) return;
      if (UB.btnRedC) { UB.btnRedC.replaceChildren(ico(redB ? 'stop' : 'play'), h('span', { class: 'txt' }, redB ? 'Oprește' : 'Redă scena')); UB.btnRedC.setAttribute('aria-pressed', String(!!redB)); }
      if (UB.btnRedP?.isConnected) UB.btnRedP.textContent = redB ? '■ Oprește' : '▶ Redă';
    }
    function pozCap() {
      if (!UB?.cap) return;
      const t = B.viz ?? 0; UB.cap.style.left = `${ET + t * B.pps}px`;
      if (UB.timp) UB.timp.textContent = `${sec(t)} / ${sec(timScena(scena()).durata)}`;
    }
    function cronologieB() {
      if (!UB) return;
      const sc = scena(), tim = timScena(sc), total = Math.max(tim.durata, 6) + 2, W = Math.ceil(total * B.pps);
      const rigla = h('div', { class: 'pista' }); rigla.style.width = `${W}px`;
      for (let t = 0; t <= total; t += 0.5) {
        const tk = h('span', { class: `tick${t % 1 === 0 ? ' mare' : ''}` }, t % 1 === 0 ? `${t}s` : ''); tk.style.left = `${t * B.pps}px`; rigla.append(tk);
      }
      for (const t of tim.clicuri) { const m = h('span', { class: 'clic', title: 'Aici așteaptă un clic (în previzualizare)' }, ico('clic')); m.style.left = `${t * B.pps}px`; rigla.append(m); }
      const fin = h('span', { class: 'final', title: 'Sfârșitul scenei' }); fin.style.left = `${tim.durata * B.pps}px`; rigla.append(fin);
      const randuri2 = tim.ef.map(({ e, t0, t1 }, i) => {
        const cat = CATEGORII[e.cat];
        const bara2 = h('div', { class: 'bara', 'data-id': e.id, title: `${numeEfect(e)}: de la ${sec(t0)} la ${sec(t1)}. Trage ca să schimbi întârzierea; trage de capătul din dreapta ca să schimbi durata.` }, h('span', {}, CATEGORII[e.cat].tipuri[e.tip]), h('i', { class: 'capat' }));
        bara2.style.left = `${t0 * B.pps}px`; bara2.style.width = `${Math.max(e.dur * B.pps, 6)}px`; bara2.style.background = cat.culoare;
        const pista = h('div', { class: 'pista' }, bara2); pista.style.width = `${W}px`;
        if (e.delay > 0) { const d = h('div', { class: 'intarziere', title: `Întârziere ${sec(e.delay)}` }); d.style.left = `${(t0 - e.delay) * B.pps}px`; d.style.width = `${e.delay * B.pps}px`; pista.append(d); }
        const et = h('div', { class: 'et', title: numeEfect(e) }, h('span', { class: 'nr' }, String(i + 1)), ico(e.start === 'clic' ? 'clic' : e.start === 'cu' ? 'simultan' : 'dupa'), h('span', { class: 'txt' }, numeEfect(e)));
        return h('div', { class: `rand${e.id === B.efSel ? ' sel' : ''}`, 'data-id': e.id }, et, pista);
      });
      const cap = h('div', { class: 'cap-red' }); UB.cap = cap;
      const interior = h('div', { class: 'ap-animatie-crono-in' }, h('div', { class: 'rand rigla' }, h('div', { class: 'et' }, 'Efecte'), rigla), ...randuri2,
        sc.efecte.length ? null : h('div', { class: 'rand gol' }, h('div', { class: 'et' }), h('div', { class: 'pista' }, 'Cronologia arată, secundă cu secundă, când începe și cât durează fiecare efect.')), cap);
      interior.style.width = `${ET + W}px`;
      const vechi = UB.crono.querySelector('.ap-animatie-crono-scroll'), sl = vechi?.scrollLeft || 0, st = vechi?.scrollTop || 0;
      const scroll = h('div', { class: 'ap-animatie-crono-scroll' }, interior);
      UB.timp = h('span', { class: 'timp' });
      UB.crono.replaceChildren(h('div', { class: 'ap-animatie-crono-cap' },
        h('strong', {}, ico('ceas'), 'Cronologie'),
        UB.btnRedC = h('button', { type: 'button', class: 'ap-animatie-mic', onclick: () => redareB() }), UB.timp,
        h('span', { class: 'ap-animatie-spatiu' }),
        bMic('minus', '', () => { B.pps = Math.max(20, B.pps / 1.4); cronologieB(); }, { titlu: 'Micșorează cronologia', corp: true }),
        bMic('plus', '', () => { B.pps = Math.min(240, B.pps * 1.4); cronologieB(); }, { titlu: 'Mărește cronologia', corp: true })), scroll);
      scroll.scrollLeft = sl; scroll.scrollTop = st;
      pozCap(); butoaneRedare();
      initCrono(scroll, interior);
    }
    function initCrono(scroll, interior) {
      interior.addEventListener('pointerdown', (ev) => {
        if (ev.button > 0 && ev.pointerType === 'mouse') return;
        const bara2 = ev.target.closest('.bara'), et = ev.target.closest('.et'), randEl = ev.target.closest('.rand[data-id]');
        if (et && randEl) { selecteazaEfect(randEl.dataset.id); return; }
        const rx = () => interior.getBoundingClientRect().left;
        if (bara2) {
          ev.preventDefault();
          const e = efect(bara2.dataset.id), r = bara2.getBoundingClientRect(), capat = ev.clientX > r.right - 10, x0 = ev.clientX, d0 = e.delay || 0, dur0 = e.dur, inst = instantaneu();
          let mutat = false;
          if (B.efSel !== e.id) { B.efSel = e.id; if (e.obj) B.sel = e.obj; }
          const muta = (m) => {
            const dt = (m.clientX - x0) / B.pps; if (!mutat && Math.abs(m.clientX - x0) < 3) return; mutat = true;
            if (capat) e.dur = clamp(r1(dur0 + dt), 0.1, 60); else e.delay = clamp(r1(d0 + dt), 0, 60);
            const tim = timScena(scena());
            tim.ef.forEach(({ e: x, t0 }) => { const b = interior.querySelector(`.bara[data-id="${x.id}"]`); if (b) { b.style.left = `${t0 * B.pps}px`; b.style.width = `${Math.max(x.dur * B.pps, 6)}px`; } });
            stareSt.textContent = capat ? `Durată: ${sec(e.dur)}` : `Întârziere: ${sec(e.delay)}`;
          };
          const sus = () => {
            window.removeEventListener('pointermove', muta); window.removeEventListener('pointerup', sus); window.removeEventListener('pointercancel', sus);
            if (mutat) { pasB(inst); schimbatB(); }
            B.viz = null; deseneazaB(); cronologieB(); panouB(); ui();
          };
          window.addEventListener('pointermove', muta); window.addEventListener('pointerup', sus); window.addEventListener('pointercancel', sus);
          return;
        }
        // Clic pe riglă sau pe o pistă goală: mutăm capul de redare (vezi scena la acel moment)
        ev.preventDefault(); opresteB();
        const tMax = timScena(scena()).durata;
        const seteaza = (m) => { B.viz = clamp((m.clientX - rx() - ET) / B.pps, 0, tMax); deseneazaB(); pozCap(); if (S.testare) testareB(); };
        seteaza(ev);
        const sus = () => { window.removeEventListener('pointermove', seteaza); window.removeEventListener('pointerup', sus); };
        window.addEventListener('pointermove', seteaza); window.addEventListener('pointerup', sus);
      });
    }

    // ----- Motorul de redare (editor, ecran complet, export video) -----
    const bufVoci = new Map();
    async function pregatesteVoci(scene) {
      for (const sc of scene) {
        const v = sc.voce && B.doc.voci[sc.voce]; if (!v || bufVoci.has(sc.voce)) continue;
        try {
          const bin = atob(v.data.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          bufVoci.set(sc.voce, await audio().decodeAudioData(u8.buffer));
        } catch { /* vocea nu se poate decoda: redăm fără ea */ }
      }
    }
    async function asculta(id) { await pregatesteVoci([scena()]); const b = bufVoci.get(id); if (!b) { toast('Nu pot reda vocea.'); return; } const a = audio(), s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start(); }
    function motorB({ cv, scene, deLa = 0, clicuri = false, dest = null, laCadru, laFinal, laAsteptare, panaLa = Infinity }) {
      const a = audio(), out = a.createGain(); out.connect(a.destination); if (dest) out.connect(dest);
      const seg = []; let off = 0;
      for (const sc of scene) { const tim = timScena(sc); seg.push({ sc, tim, off }); off += tim.durata; }
      const total = Math.min(off, panaLa), ev = [], clic = [];
      for (const s of seg) {
        if (s.sc.muzica) ev.push({ t: s.off, f: () => cantaMuzica(a, out, s.sc.muzica, a.currentTime + 0.02, s.tim.durata) });
        const vb = s.sc.voce && bufVoci.get(s.sc.voce);
        if (vb) ev.push({ t: s.off, f: () => { const src = a.createBufferSource(); src.buffer = vb; src.connect(out); src.start(); } });
        for (const x of s.tim.ef) {
          if (x.e.cat === 'sunet') ev.push({ t: s.off + x.t0, f: () => cantaSunet(a, out, x.e.tip, a.currentTime + 0.01, x.e.dur) });
          else if (x.e.sunet) ev.push({ t: s.off + x.t0, f: () => cantaSunet(a, out, x.e.sunet, a.currentTime + 0.01) });
        }
        if (clicuri) for (const t of s.tim.clicuri) clic.push(s.off + t);
      }
      const c = cv.getContext('2d');
      const M = { t: deLa, ultim: deLa - 1e-4, baza: performance.now(), tBaza: deLa, pauza: false, asteapta: false, total, seg, gata: false, raf: 0, ci: 0 };
      const primulClic = (t) => { const i = clic.findIndex((x) => x >= t - 1e-6); return i < 0 ? clic.length : i; };
      M.ci = primulClic(deLa);
      const segLa = (t) => { for (let i = seg.length - 1; i >= 0; i--) if (t >= seg[i].off - 1e-9) return i; return 0; };
      function cadru(now) {
        if (M.gata) return;
        if (!M.pauza && !M.asteapta) M.t = M.tBaza + (now - M.baza) / 1000;
        if (M.ci < clic.length && M.t >= clic[M.ci]) { M.t = clic[M.ci]; if (!M.asteapta) { M.asteapta = true; laAsteptare?.(true); } }
        for (const e of ev) if (e.t > M.ultim && e.t <= M.t && e.t < total) e.f();
        M.ultim = M.t;
        const t = Math.min(M.t, off - 1e-6), i = segLa(t), s = seg[i];
        c.setTransform(cv.width / LAT, 0, 0, cv.height / INA, 0, 0); randeazaScena(c, s.sc, t - s.off, s.tim); c.setTransform(1, 0, 0, 1, 0, 0);
        laCadru?.(M.t, i, t - s.off);
        if (M.t >= total) { M.gata = true; inchide(); laFinal?.(); return; }
        M.raf = requestAnimationFrame(cadru);
      }
      function inchide() { cancelAnimationFrame(M.raf); try { out.gain.setValueAtTime(0, a.currentTime); } catch { /* */ } setTimeout(() => { try { out.disconnect(); } catch { /* */ } }, 80); }
      M.opreste = () => { if (!M.gata) { M.gata = true; inchide(); } };
      M.comutaPauza = () => { if (M.pauza) { M.pauza = false; M.baza = performance.now(); M.tBaza = M.t; a.resume(); } else { M.pauza = true; a.suspend(); } };
      M.clic = () => { if (!M.asteapta) return false; M.asteapta = false; M.ci++; M.baza = performance.now(); M.tBaza = M.t; laAsteptare?.(false); return true; };
      M.salt = (t) => { M.t = M.tBaza = clamp(t, 0, total); M.baza = performance.now(); M.ultim = M.t - 1e-4; M.ci = primulClic(M.t); M.asteapta = false; laAsteptare?.(false); if (M.pauza) M.comutaPauza(); };
      M.raf = requestAnimationFrame(cadru);
      return M;
    }
    async function redareB(deLa) {
      if (redB) { opresteB(); return; }
      B.inreg = false;
      const sc = scena(), tim = timScena(sc);
      if (deLa == null) deLa = B.viz != null && B.viz < tim.durata - 0.05 ? B.viz : 0;
      redB = { opreste() {} };
      await pregatesteVoci([sc]);
      if (!redB) return;
      redB = motorB({ cv: UB.cv, scene: [sc], deLa, laCadru: (t) => { B.viz = t; pozCap(); }, laFinal: () => { redB = null; B.viz = null; deseneazaB(); pozCap(); cronologieB(); panouB(); ui(); } });
      cronologieB(); panouB(); ui();
    }
    function previzEfect(e) {
      if (!UB || S.mod !== 'scene') return;
      opresteB();
      const x = timScena(scena()).ef.find((y) => y.e.id === e.id); if (!x) return;
      redB = motorB({ cv: UB.cv, scene: [scena()], deLa: Math.max(0, x.t0 - 0.15), panaLa: x.t1 + 0.35, laCadru: (t) => { B.viz = t; pozCap(); }, laFinal: () => { redB = null; B.viz = null; deseneazaB(); pozCap(); ui(); } });
      ui();
    }
    function opresteB() {
      if (!redB) return;
      const r = redB; redB = null; r.opreste();
      B.viz = null;
      if (UB) { deseneazaB(); pozCap(); cronologieB(); if (B.panou === 'animatii') panouB(); }
      ui();
    }

    // ----- Testare și depanare (personaje) -----
    let pasTest = 'eveniment';
    function testareB() {
      const sc = scena(), tim = timScena(sc), t = B.viz ?? 0;
      const momente = [...new Set([0, ...tim.ef.flatMap((x) => [x.t0, x.t1]), tim.durata].map((x) => Math.round(x * 1000) / 1000))].sort((a, b2) => a - b2);
      const mergi = (d) => {
        opresteB();
        let n;
        if (pasTest === 'eveniment') n = d > 0 ? momente.find((x) => x > t + 1e-3) ?? tim.durata : [...momente].reverse().find((x) => x < t - 1e-3) ?? 0;
        else n = clamp(t + d * Number(pasTest), 0, tim.durata);
        B.viz = n; deseneazaB(); pozCap(); testareB();
      };
      const active = tim.ef.filter((x) => x.t0 <= t + 1e-6 && t < x.t1 - 1e-6);
      const asteapta = tim.clicuri.some((x) => Math.abs(x - t) < 1e-3);
      const pas = h('select', { 'aria-label': 'Mărimea pasului', onchange: () => { pasTest = pas.value; } },
        [['eveniment', 'Pas: următorul eveniment'], ['0.1', 'Pas: 0,1 s'], ['0.25', 'Pas: 0,25 s'], ['0.5', 'Pas: 0,5 s'], ['1', 'Pas: 1 s']].map(([k, tx2]) => h('option', { value: k, selected: k === pasTest || null }, tx2)));
      UB.testare.replaceChildren(
        h('strong', { class: 'tit' }, ico('depanare'), 'Testare'),
        bMic('primul', '', () => { opresteB(); B.viz = 0; deseneazaB(); pozCap(); testareB(); }, { titlu: 'La început' }),
        bMic('pasInapoi', '', () => mergi(-1), { titlu: 'Un pas înapoi' }),
        bMic('pasInainte', '', () => mergi(1), { titlu: 'Un pas înainte' }),
        bMic('ultimul', '', () => { opresteB(); B.viz = tim.durata; deseneazaB(); pozCap(); testareB(); }, { titlu: 'La sfârșit' }),
        pas,
        h('span', { class: 'info' }, h('b', {}, `t = ${sec(t)}`), ' · Acum: ',
          active.length ? active.map((x) => `${sc.efecte.indexOf(x.e) + 1}. ${numeEfect(x.e)} (${Math.round((t - x.t0) / x.e.dur * 100)}%)`).join('; ') : 'niciun efect',
          asteapta ? ' · așteaptă un clic' : ''),
        bMic('verifica', 'Verifică', () => dialogVerificare(), { titlu: 'Caută greșeli în animație' }));
    }
    function verifica() {
      const prob = [];
      B.doc.scene.forEach((sc, si) => {
        const tim = timScena(sc), pune = (nivel, text, ef) => prob.push({ nivel, text, si, ef });
        if (!sc.obiecte.length) pune('atentie', `Scena „${sc.nume}” nu are niciun personaj sau text.`);
        else if (!sc.efecte.length) pune('info', `Scena „${sc.nume}” nu are efecte: personajele stau pe loc.`);
        if (!(sc.scenariu || '').trim()) pune('info', `Nu ai scris scenariul pentru scena „${sc.nume}”.`);
        if (tim.durata > 40) pune('info', `Scena „${sc.nume}” durează ${sec(tim.durata)}: e cam lungă.`);
        for (const o of sc.obiecte) {
          const ale = tim.ef.filter((x) => x.e.obj === o.id), nr = (x) => sc.efecte.indexOf(x.e) + 1;
          const intr = ale.filter((x) => x.e.cat === 'intrare'), ies = ale.filter((x) => x.e.cat === 'iesire');
          if (intr.length > 1) pune('info', `„${o.nume}” are ${intr.length} efecte de intrare (efectele ${intr.map(nr).join(', ')}).`, intr[1].e.id);
          const i0 = intr.length ? Math.min(...intr.map((x) => x.t0)) : -1, e0 = ies.length ? Math.min(...ies.map((x) => x.t0)) : Infinity;
          if (intr.length && ies.length && e0 < i0) pune('atentie', `„${o.nume}” iese din scenă înainte să intre (efectul ${nr(ies[0])} începe înaintea intrării).`, ies[0].e.id);
          for (const x of ale) {
            if (x.e.cat === 'intrare' || x.e.cat === 'iesire') continue;
            if (intr.length && x.t1 <= i0 + 1e-6) pune('atentie', `Efectul ${nr(x)} („${numeEfect(x.e, sc)}”) are loc înainte ca „${o.nume}” să intre în scenă, deci nu se vede.`, x.e.id);
            if (ies.length && x.t0 >= Math.min(...ies.map((y) => y.t1)) - 1e-6) pune('atentie', `Efectul ${nr(x)} („${numeEfect(x.e, sc)}”) are loc după ce „${o.nume}” a ieșit din scenă, deci nu se vede.`, x.e.id);
          }
          const misc = ale.filter((x) => x.e.cat === 'miscare');
          for (let i = 0; i < misc.length; i++) for (let j = i + 1; j < misc.length; j++) if (misc[i].t0 < misc[j].t1 - 1e-6 && misc[j].t0 < misc[i].t1 - 1e-6) pune('atentie', `Două mișcări ale „${o.nume}” se suprapun în timp (efectele ${nr(misc[i])} și ${nr(misc[j])}): traseele se adună.`, misc[j].e.id);
          const fin = stari(sc, tim, tim.tMax + 0.01).get(o.id);
          if (fin?.vis && (fin.x < -30 || fin.x > LAT + 30 || fin.y < -30 || fin.y > INA + 30)) pune('atentie', `La sfârșitul scenei „${sc.nume}”, „${o.nume}” a rămas în afara scenei.`, (misc[misc.length - 1] || ale[ale.length - 1])?.e.id);
        }
      });
      return prob;
    }
    function dialogVerificare() {
      const prob = verifica();
      dialog('Testare și depanare: verificarea animației', h('div', {},
        h('p', { class: 'ap-animatie-gol' }, 'Testarea: redai animația și verifici, pas cu pas, dacă urmează scenariul. Depanarea: rezolvi problemele găsite. Le repeți până nu mai ai nicio observație.'),
        prob.length ? h('ul', { class: 'ap-animatie-probleme' }, prob.map((p) => h('li', { class: p.nivel },
          ico(p.nivel === 'atentie' ? 'atentie' : 'info'),
          h('button', { type: 'button', onclick: () => { inchideDialog(); selecteazaScena(p.si); if (p.ef) selecteazaEfect(p.ef); } }, p.text))))
          : h('p', { class: 'ap-animatie-bravo' }, ico('verifica'), 'Nu am găsit nicio problemă. Bravo! Redă animația încă o dată ca să verifici și scenariul.')),
      [buton('Închide', () => inchideDialog(), 'principal')], { lat: true });
    }

    // ----- Voce înregistrată cu microfonul -----
    async function inregistreazaVoce() {
      if (recVoce) { recVoce.mr.stop(); return; }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast('Browserul nu poate înregistra sunet.'); return; }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast('Nu am acces la microfon. Permite accesul din bara browserului.'); return; }
      const mr = new MediaRecorder(stream), bucati = [], sc = scena(), t0 = performance.now();
      mr.ondataavailable = (e) => { if (e.data.size) bucati.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); clearTimeout(recVoce?.lim); recVoce = null;
        const blob = new Blob(bucati, { type: mr.mimeType || 'audio/webm' }), fr = new FileReader();
        fr.onload = async () => {
          let dur = (performance.now() - t0) / 1000;
          const id = idNou(); B.doc.voci[id] = { data: fr.result, dur };
          await pregatesteVoci([{ voce: id }]); if (bufVoci.get(id)) { dur = bufVoci.get(id).duration; B.doc.voci[id].dur = dur; }
          pasB(); sc.voce = id; opresteB(); B.panou = 'scena'; panouB(); cronologieB(); schimbatB();
          toast(`Am înregistrat vocea (${sec(dur)}). Se aude când redai scena.`);
        };
        fr.readAsDataURL(blob);
        ui(); if (B.panou === 'scena') panouB();
      };
      mr.start(); recVoce = { mr, lim: setTimeout(() => recVoce?.mr.stop(), 60000) };
      B.panou = 'scena'; panouB(); ui();
      redareB(0); // povestești în timp ce vezi animația (ca în Toontastic)
    }

    // ----- Meniuri: personaje, decoruri, efecte, muzică -----
    function meniuPersonaje(anc) {
      const grila = h('div', { class: 'ap-animatie-galerie' }, Object.entries(PERSONAJE).map(([k, d]) =>
        h('button', { type: 'button', class: 'ap-animatie-gal-el', title: `Adaugă: ${d.nume}`, onclick: () => { inchideMeniu(); adaugaPersonaj(k); } }, miniaturaPersonaj(k), h('span', {}, d.nume))));
      meniu(anc, [{ titlu: 'Personaje și obiecte' }, grila], 'galerie');
    }
    function meniuDecor(anc) {
      const culoare = h('input', { type: 'color', value: /^#/.test(scena().decor) ? scena().decor : '#bde3ff', 'aria-label': 'Culoare simplă', onchange: () => { inchideMeniu(); seteazaDecor(culoare.value); } });
      const grila = h('div', { class: 'ap-animatie-galerie decor' }, Object.entries(DECORURI).map(([k, d]) =>
        h('button', { type: 'button', class: `ap-animatie-gal-el${scena().decor === k ? ' activ' : ''}`, title: d.nume, onclick: () => { inchideMeniu(); seteazaDecor(k); } }, miniaturaDecor(k, 70), h('span', {}, d.nume))),
      h('button', { type: 'button', class: 'ap-animatie-gal-el', onclick: () => { inchideMeniu(); seteazaDecor('#ffffff'); } }, miniaturaDecor('#ffffff', 70), h('span', {}, 'Fără decor')),
      h('label', { class: 'ap-animatie-gal-el' }, culoare, h('span', {}, 'Culoare simplă')));
      meniu(anc, [{ titlu: 'Decoruri' }, grila], 'galerie');
    }
    function meniuEfecte(anc, cat) {
      const C = CATEGORII[cat];
      meniu(anc, [{ titlu: `${C.nume}${cat === 'sunet' ? ' (pentru toată scena)' : ''}` }, ...Object.entries(C.tipuri).map(([k, t]) => {
        const i = ico(k === 'traseu' ? 'creion' : C.ico); i.style.color = C.culoare;
        return { el: i, text: t, fn: () => (cat === 'sunet' ? (cantaSunet(audio(), audio().destination, k, audio().currentTime + 0.02), adaugaEfect(cat, k)) : adaugaEfect(cat, k)) };
      })]);
    }

    // ----- Panglica (personaje) -----
    function panglicaB(fila) {
      const areSel = () => !obiect(B.sel);
      const tbRedare = bMare('play', 'Redă scena', () => redareB(), { apasat: () => !!redB, titlu: 'Redă scena curentă (Spațiu)' });
      if (fila === 'pornire') return [
        grup('Scene', bMare('scena', 'Scenă nouă', () => scenaNouaB()), stiva(bMic('duplica', 'Duplică scena', () => dupScena()), bMic('sterge', 'Șterge scena', () => stergeScena()))),
        grup('Obiect', stiva(bMic('duplica', 'Duplică', () => dupObiect(), { dez: areSel }), bMic('sterge', 'Șterge', () => stergeObiect(), { dez: areSel }), bMic('oglinda', 'Oglindește', () => oglindeste(), { dez: areSel })),
          stiva(bMic('fata', 'Adu în față', () => ordineObiect(true), { dez: areSel }), bMic('spate', 'Trimite în spate', () => ordineObiect(false), { dez: areSel }))),
        grup('Inserare rapidă', bMare('personaj', 'Personaj', (b) => meniuPersonaje(b), { meniu: true }), bMare('decor', 'Decor', (b) => meniuDecor(b), { meniu: true })),
        grup('Redare', tbRedare, bMare('ecran', 'Ecran complet', () => previzualizare(false), { titlu: 'Previzualizare pe tot ecranul, din scena curentă' })),
      ];
      if (fila === 'inserare') return [
        grup('Scenă', bMare('decor', 'Decor', (b) => meniuDecor(b), { meniu: true, titlu: 'Alege decorul scenei' }), bMare('scena', 'Scenă nouă', () => scenaNouaB())),
        grup('Personaje', bMare('personaj', 'Personaj', (b) => meniuPersonaje(b), { meniu: true, titlu: 'Adaugă un personaj sau un obiect' })),
        grup('Text', bMare('text', 'Text', () => adaugaText('text')), bMare('balon', 'Balon de vorbire', () => adaugaText('balon'))),
        grup('Sunet', bMare('muzica', 'Muzică', (b) => meniu(b, Object.entries(MUZICI).map(([k, t]) => ({ ico: k ? 'muzica' : 'x', text: t, fn: () => { pasB(); scena().muzica = k; panouB(); schimbatB(); if (k) cantaMuzica(audio(), audio().destination, k, audio().currentTime + 0.02, 2.5); } }))), { meniu: true, titlu: 'Muzică de fundal pentru scenă' }),
          bMare('microfon', 'Voce', () => inregistreazaVoce(), { apasat: () => !!recVoce, titlu: 'Înregistrează-ți vocea cu microfonul, în timp ce se redă scena' })),
        grup('Poveste', bMare('carte', 'Poveste nouă', () => dialogPoveste(), { titlu: 'Short Story, Classic Story sau Science Report' })),
      ];
      if (fila === 'animatii') return [
        grup('Previzualizare', tbRedare),
        grup('Adaugă un efect', ...['intrare', 'miscare', 'transf', 'iesire', 'sunet'].map((k) => {
          const b = bMare(CATEGORII[k].ico, CATEGORII[k].nume, (bb) => meniuEfecte(bb, k), { meniu: true, cls: `cat-${k}` });
          b.querySelector('.ap-animatie-ico').style.color = CATEGORII[k].culoare; return b;
        })),
        grup('Traseu', bMare('creion', 'Înregistrează traseu', () => pornesteInregistrare(), { apasat: () => B.inreg, titlu: 'Trage personajul pe drumul dorit; mișcarea și viteza se înregistrează (ca în Toontastic)' })),
        grup('Ordinea efectelor', stiva(bMic('sus', 'Mai devreme', () => mutaEfect(-1), { dez: () => !efect(B.efSel) }), bMic('jos', 'Mai târziu', () => mutaEfect(1), { dez: () => !efect(B.efSel) }), bMic('sterge', 'Șterge efectul', () => stergeEfect(), { dez: () => !efect(B.efSel) }))),
        grup('Temporizare', bMare('ceas', 'Panou animații', () => { B.panou = 'animatii'; panouB(); }, { apasat: () => B.panou === 'animatii', titlu: 'Start, durată, întârziere pentru efectul selectat' })),
      ];
      return [
        grup('Previzualizare', bMare('ecran', 'De la început', () => previzualizare(true), { titlu: 'Toată povestea, pe tot ecranul (F5)' }), bMare('play', 'Din scena curentă', () => previzualizare(false))),
        grup('Verificare', bMare('depanare', 'Testare și depanare', () => { S.testare = !S.testare; if (S.testare) { opresteB(); B.viz = B.viz ?? 0; deseneazaB(); pozCap(); } else { B.viz = null; deseneazaB(); pozCap(); } ui(); }, { apasat: () => S.testare, titlu: 'Treci prin animație pas cu pas' }),
          bMare('verifica', 'Verifică animația', () => dialogVerificare(), { titlu: 'Caută automat greșelile de temporizare' })),
        grup('Afișare', bMare('miscare', 'Trasee', () => { B.trasee = !B.trasee; deseneazaB(); ui(); }, { apasat: () => B.trasee, titlu: 'Arată traseele de mișcare ale obiectului selectat' }), bMare('grila', 'Grilă', () => { B.grila = !B.grila; deseneazaB(); ui(); }, { apasat: () => B.grila })),
      ];
    }
    function dialogPoveste() {
      const alege = (k) => {
        inchideDialog(); opresteRedari();
        B.doc = proiectScene(k); B.doc.titlu = k === 'libera' ? 'Animația mea' : `${POVESTI[k].nume}`;
        Object.assign(B, { id: null, creat: null, modificat: false, scIdx: 0, sel: null, efSel: null, viz: null, inreg: false }); istB.length = 0; refB.length = 0;
        if (S.mod !== 'scene') seteazaMod('scene'); else totulB();
        ui(); salveazaCiorna();
        toast(`Povestea are ${B.doc.scene.length} ${B.doc.scene.length === 1 ? 'scenă' : 'scene'}. Scrie întâi scenariul fiecărei scene (fila Scenă din dreapta).`, 4000);
      };
      dialog('Poveste nouă: alege tipul', h('div', {},
        h('p', { class: 'ap-animatie-gol' }, 'Ca în Toontastic, fiecare tip de poveste are „harta” lui: fiecare parte devine o scenă.'),
        h('div', { class: 'ap-animatie-povesti' }, Object.entries(POVESTI).map(([k, p]) => h('button', { type: 'button', class: 'ap-animatie-poveste', onclick: () => alege(k) },
          h('strong', {}, p.nume), p.en ? h('small', {}, p.en) : null, h('ol', {}, p.parti.map(([n]) => h('li', {}, n))))))),
      [buton('Renunță', () => inchideDialog())], { lat: true });
    }

    // ======================================================================
    // COMUNE: anulare, salvare, deschidere, previzualizare, export
    // ======================================================================
    const anuleaza = () => (S.mod === 'cadre' ? anuleazaA() : anuleazaB());
    const reface = () => (S.mod === 'cadre' ? refaceA() : refaceB());
    function opresteRedari() { opresteA(); opresteB(); }
    const D = () => (S.mod === 'cadre' ? A : B);
    async function redenumeste() {
      const n = await intreaba('Redenumește proiectul', 'Numele proiectului', titluCurent());
      if (!n) return; seteazaTitlu(n); D().modificat = true; ciornaMaiTarziu(); ui();
    }
    function dateProiect(mod = S.mod) {
      if (mod === 'cadre') return { fps: A.fps, bucla: A.bucla, fundal: A.fundal, cadre: A.cadre.map(dataUrl) };
      return B.doc;
    }
    function miniaturaProiect() {
      const cv = canvasNou(192, 108), c = cv.getContext('2d');
      if (S.mod === 'cadre') { const t = canvasNou(WA, HA); compuneA(t.getContext('2d'), A.idx, false); c.drawImage(t, 0, 0, 192, 108); }
      else { c.setTransform(192 / LAT, 0, 0, 108 / INA, 0, 0); randeazaScena(c, B.doc.scene[0], null); }
      return cv.toDataURL('image/jpeg', 0.8);
    }
    async function salveaza(ca = false) {
      opresteRedari();
      const d = D();
      if (!d.id || ca) {
        const n = await intreaba(ca ? 'Salvează ca' : 'Salvează proiectul', 'Numele proiectului', titluCurent());
        if (!n) return;
        seteazaTitlu(n); d.id = idNou(); d.creat = Date.now();
      }
      try {
        await store.put({ id: d.id, titlu: titluCurent(), mod: S.mod, creat: d.creat || Date.now(), actualizat: Date.now(), miniatura: miniaturaProiect(), date: dateProiect() });
        d.modificat = false; ui(); salveazaCiorna();
        toast(`Am salvat „${titluCurent()}” în browser.`);
      } catch { toast('Nu am putut salva: spațiul de stocare din browser este plin. Șterge proiecte vechi sau descarcă proiectul ca fișier.', 5000); }
    }
    let tCiorna = null;
    function ciornaMaiTarziu() { clearTimeout(tCiorna); tCiorna = setTimeout(salveazaCiorna, 2500); }
    async function salveazaCiorna() {
      clearTimeout(tCiorna); tCiorna = null;
      const d = D();
      try { await store.put({ id: CIORNA[S.mod], mod: S.mod, fisierId: d.id, titlu: titluCurent(), creat: d.creat, modificat: d.modificat, date: dateProiect(), actualizat: Date.now() }); } catch { /* ciorna e doar o rezervă */ }
    }
    async function incarcaA(rec) {
      const dt = rec.date || {};
      const cadre = await Promise.all((dt.cadre || []).slice(0, MAX_CADRE).map(async (u) => {
        const c = canvasNou(WA, HA);
        try { const img = await incarcaImagine(u); c.getContext('2d').drawImage(img, 0, 0, WA, HA); dataUrlCache.set(c, u); } catch { /* cadru stricat: gol */ }
        return c;
      }));
      Object.assign(A, { titlu: rec.titlu || 'Animația mea', id: rec.fisierId !== undefined ? rec.fisierId : rec.id, creat: rec.creat || null, modificat: !!rec.modificat,
        fps: clamp(Number(dt.fps) || 8, 1, 24), bucla: dt.bucla !== false, fundal: dt.fundal || '#ffffff', cadre: cadre.length ? cadre : [canvasNou(WA, HA)], idx: 0 });
      istA.length = 0; refA.length = 0;
    }
    function incarcaB(rec) {
      const doc = rec.date;
      if (!doc?.scene?.length) throw new Error('proiect invalid');
      doc.voci = doc.voci || {}; doc.titlu = rec.titlu || doc.titlu || 'Povestea mea';
      for (const sc of doc.scene) { sc.obiecte = sc.obiecte || []; sc.efecte = (sc.efecte || []).filter((e) => CATEGORII[e.cat]?.tipuri[e.tip]); }
      Object.assign(B, { doc, id: rec.fisierId !== undefined ? rec.fisierId : rec.id, creat: rec.creat || null, modificat: !!rec.modificat, scIdx: 0, sel: null, efSel: null, viz: null, inreg: false });
      istB.length = 0; refB.length = 0; bufVoci.clear();
    }
    async function deschide(rec) {
      opresteRedari();
      try {
        if (rec.mod === 'cadre') { await incarcaA(rec); if (S.mod !== 'cadre') seteazaMod('cadre'); else dupaStructuraA(); }
        else { incarcaB(rec); if (S.mod !== 'scene') seteazaMod('scene'); else totulB(); }
        ui(); salveazaCiorna(); toast(`Am deschis „${titluCurent()}”.`);
      } catch { toast('Nu am putut deschide proiectul.'); }
    }
    async function dialogDeschide() {
      opresteRedari();
      let toate = [];
      try { toate = (await store.toate()).filter((p) => !p.id.startsWith('__')).sort((a, b2) => b2.actualizat - a.actualizat); } catch { /* */ }
      const lista = h('div', { class: 'ap-animatie-proiecte' });
      const deseneaza = () => lista.replaceChildren(...(toate.length ? toate.map((p) => h('div', { class: 'ap-animatie-proiect' },
        h('button', { type: 'button', class: 'deschide', onclick: async () => { inchideDialog(); const r = await store.get(p.id); if (r) deschide(r); } },
          p.miniatura ? h('img', { src: p.miniatura, alt: '' }) : h('span', { class: 'fara' }),
          h('strong', {}, p.titlu), h('small', {}, `${p.mod === 'cadre' ? 'Cadru cu cadru' : 'Personaje'} · ${cand(p.actualizat)}`)),
        h('button', { type: 'button', class: 'ap-animatie-x', title: 'Șterge proiectul', 'aria-label': `Șterge ${p.titlu}`, onclick: async () => {
          if (!(await confirma('Șterge proiectul', `Ștergi definitiv „${p.titlu}”?`, 'Șterge'))) { dialogDeschide(); return; }
          await store.del(p.id); dialogDeschide();
        } }, ico('sterge')))) : [h('p', { class: 'ap-animatie-gol' }, 'Nu ai încă proiecte salvate. Apasă Salvează (Ctrl+S) ca să păstrezi animația în acest browser.')]));
      deseneaza();
      dialog('Deschide un proiect', lista, [buton('Din fișier…', () => { inchideDialog(); incarcaProiect(); }), buton('Închide', () => inchideDialog(), 'principal')], { lat: true });
    }
    function descarcaProiect() {
      const json = JSON.stringify({ format: 'edudigi-animatie', versiune: 1, titlu: titluCurent(), mod: S.mod, date: dateProiect() });
      descarca(`${numeFisierSigur(titluCurent())}.animatie.json`, new Blob([json], { type: 'application/json' }));
      toast('Am descărcat proiectul. Îl poți deschide mai târziu cu „Deschide un proiect din fișier”.');
    }
    function incarcaProiect() {
      const inp = h('input', { type: 'file', accept: '.json,application/json' });
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        try { const r = JSON.parse(await f.text()); if (r.format !== 'edudigi-animatie') throw new Error(); await deschide({ titlu: r.titlu, mod: r.mod, date: r.date, id: null, modificat: true }); }
        catch { toast('Fișierul nu este un proiect Studio de animație.'); }
      };
      inp.click();
    }

    // ----- Previzualizare pe tot ecranul -----
    let previz = null;
    function previzualizare(deLaInceput) {
      opresteRedari(); inchideMeniu(); inchidePreviz();
      const mod = S.mod, cv = mod === 'cadre' ? canvasNou(WA, HA) : canvasNou(LAT, INA);
      cv.className = 'ap-animatie-previz-cv';
      const indiciu = h('div', { class: 'ap-animatie-previz-clic', hidden: true }, ico('clic'), 'Clic (sau Spațiu) ca să continui');
      const info = h('span', { class: 'info' });
      const btnP = h('button', { type: 'button', title: 'Pauză / Continuă' });
      const final = h('div', { class: 'ap-animatie-previz-final', hidden: true }, h('strong', {}, 'Sfârșit'), h('div', {}, buton('↻ Din nou', () => porneste(), 'principal'), buton('Închide', () => inchidePreviz())));
      const el = h('div', { class: 'ap-animatie-previz', role: 'dialog', 'aria-label': 'Previzualizare' },
        h('div', { class: 'ap-animatie-previz-scena' }, cv, indiciu, final),
        h('div', { class: 'ap-animatie-previz-cmd' },
          h('button', { type: 'button', title: 'De la început', onclick: () => porneste() }, ico('primul')), btnP,
          mod === 'scene' ? h('button', { type: 'button', title: 'Scena următoare', onclick: () => urmatoarea() }, ico('ultimul')) : null,
          info, h('span', { class: 'ap-animatie-spatiu' }),
          h('button', { type: 'button', title: 'Închide (Esc)', onclick: () => inchidePreviz() }, ico('x'), h('span', {}, 'Închide'))));
      const potrivestePv = () => { const w = el.clientWidth, hh = el.clientHeight - 56, k = Math.min(w / cv.width, hh / cv.height); cv.style.width = `${Math.floor(cv.width * k)}px`; cv.style.height = `${Math.floor(cv.height * k)}px`; };
      let M = null, rafA = 0, pauzaA = false, tA = 0, bazaA = 0;
      const scene = mod === 'scene' ? (deLaInceput ? B.doc.scene : B.doc.scene.slice(B.scIdx)) : null;
      const pBtn = (p) => btnP.replaceChildren(ico(p ? 'play' : 'pauza'));
      async function porneste() {
        final.hidden = true; M?.opreste(); cancelAnimationFrame(rafA);
        if (mod === 'cadre') {
          pauzaA = false; pBtn(false); bazaA = performance.now(); tA = 0;
          const c = cv.getContext('2d');
          const pas = (now) => {
            if (!pauzaA) tA = (now - bazaA) / 1000;
            let i = Math.floor(tA * A.fps);
            if (i >= A.cadre.length && !A.bucla) { compuneA(c, A.cadre.length - 1, false); final.hidden = false; return; }
            i %= A.cadre.length; compuneA(c, i, false); info.textContent = `Cadrul ${i + 1} din ${A.cadre.length} · ${A.fps} FPS`;
            rafA = requestAnimationFrame(pas);
          };
          rafA = requestAnimationFrame(pas);
        } else {
          await pregatesteVoci(scene); if (!previz) return; pBtn(false);
          M = motorB({ cv, scene, clicuri: true,
            laCadru: (t, i) => { info.textContent = `${scene[i].nume} · ${sec(t)} din ${sec(M?.total ?? 0)}`; },
            laAsteptare: (a) => { indiciu.hidden = !a; },
            laFinal: () => { indiciu.hidden = true; final.hidden = false; } });
        }
      }
      function comuta() {
        if (mod === 'cadre') { if (pauzaA) { bazaA = performance.now() - tA * 1000; } pauzaA = !pauzaA; pBtn(pauzaA); return; }
        if (M && !M.gata) { if (M.clic()) return; M.comutaPauza(); pBtn(M.pauza); }
      }
      function urmatoarea() { if (!M || M.gata) return; const t = M.t, s = M.seg.find((x) => x.off > t + 1e-3); if (s) M.salt(s.off); else M.salt(M.total); }
      btnP.onclick = comuta; pBtn(false);
      cv.addEventListener('click', () => { if (mod === 'scene' && M?.clic()) return; if (mod === 'cadre') comuta(); });
      previz = { el, inchide: () => { M?.opreste(); cancelAnimationFrame(rafA); if (M?.pauza) audio().resume(); }, taste: (e) => {
        if (e.key === 'Escape') { e.preventDefault(); inchidePreviz(); }
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); comuta(); }
        else if (e.key === 'ArrowRight' && mod === 'scene') urmatoarea();
      } };
      radacina.append(el);
      potrivestePv(); previz.ro = new ResizeObserver(potrivestePv); previz.ro.observe(el);
      try { el.requestFullscreen?.().catch(() => {}); } catch { /* fără ecran complet: rămâne peste aplicație */ }
      porneste();
    }
    function inchidePreviz() {
      if (!previz) return;
      const p = previz; previz = null; p.inchide(); p.ro?.disconnect(); p.el.remove();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && previz) inchidePreviz(); }, sig);

    // ----- Randarea cadrelor pentru export (GIF, lucrare) -----
    function totalPoveste() { return B.doc.scene.reduce((s, x) => s + timScena(x).durata, 0); }
    function cadruPovesteLa(c, w, hh, t) {
      let off = 0;
      for (const sc of B.doc.scene) {
        const tim = timScena(sc);
        if (t < off + tim.durata || sc === B.doc.scene[B.doc.scene.length - 1]) { c.setTransform(w / LAT, 0, 0, hh / INA, 0, 0); randeazaScena(c, sc, Math.min(t - off, tim.durata), tim); c.setTransform(1, 0, 0, 1, 0, 0); return; }
        off += tim.durata;
      }
    }
    function cadruA(c, w, hh, i) { const t = canvasNou(WA, HA); compuneA(t.getContext('2d'), i, false); c.drawImage(t, 0, 0, w, hh); }
    function bareProgres() { const b = h('div', { class: 'ap-animatie-progres' }, h('i')); return { el: b, set: (p) => { b.firstChild.style.width = `${Math.round(clamp(p, 0, 1) * 100)}%`; } }; }

    async function exportGIF() {
      opresteRedari();
      const lat = h('select', {}, [[320, 'Mică (320 px)'], [480, 'Medie (480 px)'], [640, 'Mare (640 px)']].map(([v, t]) => h('option', { value: String(v), selected: v === 480 || null }, t)));
      const fps = h('select', {}, [6, 8, 10, 12].map((v) => h('option', { value: String(v), selected: v === 10 || null }, `${v} FPS`)));
      const pr = bareProgres(), stare2 = h('p', { class: 'ap-animatie-gol' }), rez = h('div', { class: 'ap-animatie-rezultat' });
      let anulat = false;
      const start = buton('Creează GIF', async () => {
        start.disabled = true;
        const w = Number(lat.value), hh = Math.round(w * 9 / 16), cv = canvasNou(w, hh), c = cv.getContext('2d', { willReadFrequently: true }), imgs = [];
        let intarziere;
        if (S.mod === 'cadre') {
          intarziere = Math.max(2, Math.round(100 / A.fps));
          for (let i = 0; i < A.cadre.length; i++) { cadruA(c, w, hh, i); imgs.push(c.getImageData(0, 0, w, hh)); }
        } else {
          const f = Number(fps.value), total = totalPoveste(), n = Math.min(Math.ceil(total * f), 900);
          intarziere = Math.round(100 / f);
          for (let k = 0; k < n; k++) { if (anulat) return; cadruPovesteLa(c, w, hh, k / f); imgs.push(c.getImageData(0, 0, w, hh)); pr.set(k / n * 0.4); stare2.textContent = `Desenez cadrele: ${k + 1} din ${n}`; if (k % 10 === 0) await pauza(0); }
        }
        stare2.textContent = `Codez ${imgs.length} cadre (paletă de 256 de culori, compresie LZW)…`;
        const blob = await codeazaGIF(imgs, w, hh, intarziere, (p) => { pr.set((S.mod === 'cadre' ? 0 : 0.4) + p * (S.mod === 'cadre' ? 1 : 0.6)); });
        if (anulat) return;
        pr.set(1); stare2.textContent = `Gata: ${imgs.length} cadre, ${Math.max(1, Math.round(blob.size / 1024))} KB.`;
        descarca(`${numeFisierSigur(titluCurent())}.gif`, blob);
        const fr = new FileReader(); fr.onload = () => rez.replaceChildren(h('img', { src: fr.result, alt: 'GIF-ul creat' })); fr.readAsDataURL(blob);
        toast('Am descărcat GIF-ul animat.');
      }, 'principal');
      dialog('Exportă GIF animat', h('div', {},
        h('p', { class: 'ap-animatie-gol' }, S.mod === 'cadre' ? `${A.cadre.length} cadre la ${A.fps} FPS (${sec(A.cadre.length / A.fps)}). GIF-ul se repetă la nesfârșit.` : `Povestea durează ${sec(totalPoveste())}. Aplicația generează singură cadrele. GIF-ul nu are sunet.`),
        rand('Lățime', lat), S.mod === 'scene' ? rand('Cadre pe secundă', fps) : null, pr.el, stare2, rez),
      [buton('Închide', () => { anulat = true; inchideDialog(); }), start], { laInchidere: () => { anulat = true; } });
    }

    async function exportWebM() {
      opresteRedari();
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('Browserul nu poate înregistra video.'); return; }
      const rep = h('select', {}, [1, 2, 3, 5].map((v) => h('option', { value: String(v), selected: v === (A.cadre.length / A.fps < 3 ? 3 : 1) || null }, `${v} ${v === 1 ? 'dată' : 'ori'}`)));
      const pr = bareProgres(), stare2 = h('p', { class: 'ap-animatie-gol' });
      const cv = S.mod === 'cadre' ? canvasNou(WA, HA) : canvasNou(LAT, INA); cv.className = 'ap-animatie-export-cv';
      let M = null, raf = 0, mr = null, anulat = false;
      const opreste = () => { anulat = true; M?.opreste(); cancelAnimationFrame(raf); if (mr?.state === 'recording') mr.stop(); };
      const start = buton('Înregistrează video', async () => {
        start.disabled = true;
        const c = cv.getContext('2d');
        if (S.mod === 'cadre') compuneA(c, 0, false); else cadruPovesteLa(c, LAT, INA, 0);
        const areSunet = S.mod === 'scene' && B.doc.scene.some((sc) => sc.muzica || sc.voce || sc.efecte.some((e) => e.cat === 'sunet' || e.sunet));
        const pista = [...cv.captureStream(30).getVideoTracks()];
        let dest = null;
        if (areSunet) { try { dest = audio().createMediaStreamDestination(); pista.push(...dest.stream.getAudioTracks()); } catch { dest = null; } }
        const tipuri = dest ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        const mime = tipuri.find((t) => MediaRecorder.isTypeSupported(t)) || '';
        const bucati = [];
        try { mr = new MediaRecorder(new MediaStream(pista), { mimeType: mime || undefined, videoBitsPerSecond: 4e6 }); } catch { toast('Nu pot porni înregistrarea video.'); return; }
        mr.ondataavailable = (e) => { if (e.data.size) bucati.push(e.data); };
        mr.onstop = () => {
          if (anulat && !bucati.length) return;
          const blob = new Blob(bucati, { type: 'video/webm' });
          pr.set(1); stare2.textContent = `Gata: ${Math.max(1, Math.round(blob.size / 1024))} KB${dest ? ', cu sunet' : ''}.`;
          descarca(`${numeFisierSigur(titluCurent())}.webm`, blob); toast('Am descărcat video-ul WebM.');
        };
        mr.start(250);
        stare2.textContent = 'Se înregistrează în timp real… Așteaptă până la sfârșit.';
        if (S.mod === 'cadre') {
          const n = A.cadre.length * Number(rep.value), t0 = performance.now();
          const pas = (now) => {
            if (anulat) return;
            const k = Math.floor((now - t0) / 1000 * A.fps);
            if (k >= n) { compuneA(c, A.cadre.length - 1, false); setTimeout(() => mr.state === 'recording' && mr.stop(), 200); return; }
            compuneA(c, k % A.cadre.length, false); pr.set(k / n); raf = requestAnimationFrame(pas);
          };
          raf = requestAnimationFrame(pas);
        } else {
          await pregatesteVoci(B.doc.scene);
          M = motorB({ cv, scene: B.doc.scene, dest, laCadru: (t) => pr.set(t / (M?.total || 1)), laFinal: () => setTimeout(() => mr.state === 'recording' && mr.stop(), 200) });
        }
      }, 'principal');
      dialog('Exportă video WebM', h('div', {},
        h('p', { class: 'ap-animatie-gol' }, S.mod === 'cadre' ? `Animația (${sec(A.cadre.length / A.fps)}) se înregistrează ca video. Alege de câte ori se repetă.` : `Povestea (${sec(totalPoveste())}) se înregistrează în timp real, cu muzica, sunetele și vocea.`),
        S.mod === 'cadre' ? rand('Repetări', rep) : null, h('div', { class: 'ap-animatie-export-prev' }, cv), pr.el, stare2),
      [buton('Închide', () => { opreste(); inchideDialog(); }), start], { laInchidere: opreste, fix: true });
    }
    async function exportPNG() {
      opresteRedari();
      let cv;
      if (S.mod === 'cadre') { cv = canvasNou(WA, HA); compuneA(cv.getContext('2d'), A.idx, false); }
      else { cv = canvasNou(LAT, INA); randeazaScena(cv.getContext('2d'), scena(), B.viz); }
      const b = await blobDinCanvas(cv);
      descarca(`${numeFisierSigur(titluCurent())}-${S.mod === 'cadre' ? `cadrul-${A.idx + 1}` : `scena-${B.scIdx + 1}`}.png`, b);
      toast('Am descărcat imaginea PNG.');
    }

    // ----- Lucrarea predată la sarcină -----
    async function lucrare() {
      opresteRedari();
      let durata, idx, deseneaza;
      if (S.mod === 'cadre') {
        const n = A.cadre.length; durata = n / A.fps;
        idx = n <= 60 ? [...Array(n).keys()] : [...Array(60).keys()].map((k) => Math.floor(k * n / 60));
        deseneaza = (c, w, hh, i) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, hh); cadruA(c, w, hh, i); };
      } else {
        durata = totalPoveste();
        const n = Math.max(1, Math.ceil(durata * 8)); // aplicația generează cadrele la 8 FPS
        idx = n <= 60 ? [...Array(n).keys()] : [...Array(60).keys()].map((k) => Math.floor(k * n / 60));
        deseneaza = (c, w, hh, k) => cadruPovesteLa(c, w, hh, k / 8);
      }
      // PNG la 480 px; dacă lucrarea ar trece de limita serverului (3 MB), trecem la JPG și micșorăm
      let cadre = [];
      for (const [w, tip, q] of [[480, 'image/png'], [480, 'image/jpeg', 0.85], [400, 'image/jpeg', 0.75], [320, 'image/jpeg', 0.7]]) {
        const hh = Math.round(w * 9 / 16), cv = canvasNou(w, hh), c = cv.getContext('2d');
        cadre = idx.map((i) => { deseneaza(c, w, hh, i); return cv.toDataURL(tip, q); });
        if (cadre.reduce((s, x) => s + x.length, 0) < 2.6e6) break;
      }
      return { titlu: titluCurent(), tip: 'animatie', cadre, fps: Math.round(cadre.length / durata * 100) / 100, durata: Math.round(durata * 100) / 100 };
    }

    // ----- Tastatura -----
    window.addEventListener('keydown', (e) => {
      if (!radacina.isConnected) return;
      if (previz) { previz.taste(e); return; }
      if (modal) { if (e.key === 'Escape') { modal._laInchidere?.(); inchideDialog(); } return; }
      if (e.key === 'Escape') { inchideMeniu(); if (S.mod === 'scene') { if (B.inreg) { B.inreg = false; inreg = null; } else { B.sel = null; B.efSel = null; } deseneazaB(); panouB(); cronologieB(); ui(); } return; }
      const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (ctrl && k === 's') { e.preventDefault(); salveaza(e.shiftKey); return; }
      if (ctrl && k === 'o') { e.preventDefault(); dialogDeschide(); return; }
      if (e.key === 'F5') { e.preventDefault(); previzualizare(!e.shiftKey); return; }
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); anuleaza(); return; }
      if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); reface(); return; }
      if (ctrl && k === 'd') { e.preventDefault(); if (S.mod === 'cadre') cadruNou(true); else dupObiect(); return; }
      if (ctrl) return;
      if (e.key === ' ') { e.preventDefault(); if (S.mod === 'cadre') redaA(); else redareB(); return; }
      if (S.mod === 'cadre') {
        if (e.key === 'ArrowLeft' || e.key === ',') { e.preventDefault(); opresteA(); mergiLaCadru(A.idx - 1); }
        else if (e.key === 'ArrowRight' || e.key === '.') { e.preventDefault(); opresteA(); mergiLaCadru(A.idx + 1); }
        else if (e.key === 'Delete') stergeCadru();
        else { const u = { b: 'creion', p: 'pensula', e: 'radiera', g: 'umplere', m: 'mutare', l: 'linie', r: 'dreptunghi', o: 'elipsa' }[k]; if (u) { A.unealta = u; ui(); } }
      } else {
        const o = obiect(B.sel);
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (document.activeElement?.closest?.('.ap-animatie-efecte') && B.efSel) stergeEfect(); else if (o) stergeObiect(); else if (B.efSel) stergeEfect(); }
        else if (o && e.key.startsWith('Arrow')) {
          e.preventDefault(); const d = e.shiftKey ? 10 : 2;
          if (!e.repeat) pasB();
          if (e.key === 'ArrowLeft') o.x -= d; else if (e.key === 'ArrowRight') o.x += d; else if (e.key === 'ArrowUp') o.y -= d; else o.y += d;
          deseneazaB(); schimbatB();
        }
      }
    }, sig);

    // ----- Ieșirea din aplicație -----
    window.addEventListener('hashchange', () => {
      if (tCiorna) salveazaCiorna();
      inchidePreviz(); opresteRedari(); recVoce?.mr.stop();
      ac.abort(); ro.disconnect();
      setTimeout(() => { try { actx?.close(); } catch { /* */ } }, 300);
      document.title = 'edudigi';
    }, { once: true });
    window.addEventListener('beforeunload', () => { if (tCiorna) salveazaCiorna(); }, sig);

    // ----- Pornire: continuăm ciornele, dacă există -----
    const sarcina = window.EduSarcini?.bara ? window.EduSarcini.bara('animatie', async () => lucrare()) : null;
    radacina.append(...[bara, sarcina, file, panglica, corp, stareEl, toasturi].filter(Boolean));
    show(h('div', { class: 'lab-ecran ap-animatie-ecran' }, radacina));
    try {
      const [ca, cb] = await Promise.all([store.get(CIORNA.cadre).catch(() => null), store.get(CIORNA.scene).catch(() => null)]);
      if (ca?.date) await incarcaA(ca);
      if (cb?.date) { try { incarcaB(cb); } catch { B.doc = proiectScene('scurta'); } }
    } catch { /* pornim cu proiecte goale */ }
    if (!radacina.isConnected) return;
    construiesteCorp(); construiestePanglica(); ui();
  }
})();

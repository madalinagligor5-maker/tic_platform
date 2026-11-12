'use strict';
// Desen: simulator al programului Paint din Windows, pentru clasa a V-a (Unitatea 4 · Editare grafică).
// Aspectul implicit este cel din manual (Paint din Windows 10: panglica cu filele Fișier, Pornire, Vizualizare);
// din Vizualizare se poate trece la aspectul nou din Windows 11 (bara compactă, straturi, eliminarea fundalului).
// Imaginea este formată din unul sau mai multe straturi <canvas>; deasupra lor stă un strat de previzualizare
// (forme în lucru, selecție, conturul radierei). Desenele se păstrează în browser (IndexedDB, cu localStorage de rezervă)
// și se pot descărca PNG/JPEG/BMP/GIF. Clic stânga = Culoarea 1, clic dreapta = Culoarea 2; merge și cu degetul.
(() => {
  const { h, show, routes } = window.EduApp;

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-desen', ST = 'desene', LS = 'edudigi_desen_fisiere', LS_CULORI = 'edudigi_desen_culori', LS_PREF = 'edudigi_desen_pref', CIORNA = '__ciorna';
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
  const dataOra = (t) => new Date(t).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const octeti = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const marimeDataUrl = (u) => Math.round(((u || '').length - (u || '').indexOf(',') - 1) * 0.75);

  // ---------- Pictograme (SVG 20×20; unele colorate, ca în Paint) ----------
  const P = {
    paint: '<path d="M10 2.2a7.8 7.8 0 1 0 0 15.6c1.3 0 1.7-1.1 1.1-2-.6-.9 0-2.1 1.1-2.1h1.9a3.7 3.7 0 0 0 3.7-3.7C17.8 5.4 14.3 2.2 10 2.2z" fill="#fff" stroke="#2b5797"/><circle cx="6" cy="8.6" r="1.5" fill="#e81123" stroke="none"/><circle cx="8.8" cy="5.4" r="1.5" fill="#ffb900" stroke="none"/><circle cx="12.9" cy="5.8" r="1.5" fill="#107c10" stroke="none"/><circle cx="6.4" cy="12.6" r="1.5" fill="#0078d7" stroke="none"/>',
    creion: '<path d="M3.5 16.5l1-4 9-9a2 2 0 0 1 3 3l-9 9z" fill="#f7c948"/><path d="M3.5 16.5l1-4 3 3z" fill="#f3d9b1"/><path d="M12 5l3 3"/>',
    pensula: '<path d="M17 3l-7 8" stroke-width="2.2" stroke="#8a5a2b"/><path d="M9 10.5l1.5 1.5c0 3-2 5-6.5 4.5 1.3-1 1-2.5 1.5-3.8.6-1.6 2-2.6 3.5-2.2z" fill="#0078d7" stroke="#0b4f8a"/>',
    umplere: '<path d="M3.8 9.2L9.5 3.5l6.2 6.2-5.7 5.7a1.6 1.6 0 0 1-2.2 0l-4-4a1.6 1.6 0 0 1 0-2.2z" fill="#fff"/><path d="M4 10h11.5"/><path d="M17.5 13s1.5 1.8 1.5 3a1.5 1.5 0 0 1-3 0c0-1.2 1.5-3 1.5-3z" fill="#0078d7" stroke="#0b4f8a"/>',
    radiera: '<path d="M7 17h10"/><path d="M3.6 12.4l8-8a1.4 1.4 0 0 1 2 0l3 3a1.4 1.4 0 0 1 0 2L10 16H7.2z" fill="#f6b6c8"/><path d="M7.5 8.5l5 5"/><path d="M3.6 12.4L7.2 16H10l-4.5-4.5z" fill="#fff"/>',
    pipeta: '<path d="M11 6l3 3"/><path d="M13.5 3.5a2.1 2.1 0 0 1 3 3L14.8 8.2 11.8 5.2z" fill="#555"/><path d="M12.3 7.7L5 15l-1.2 3.2L7 17l7.3-7.3" fill="#e6f2fb"/>',
    text: '<path d="M4 17L10 3l6 14" stroke-width="2"/><path d="M6.4 11.6h7.2" stroke-width="2"/>',
    lupa: '<circle cx="8.5" cy="8.5" r="5" fill="#e6f2fb"/><path d="M12.2 12.2L17 17" stroke-width="2.4"/>',
    selectare: '<path d="M3 6V3h3M9 3h2M14 3h3v3M17 9v2M17 14v3h-3M11 17H9M6 17H3v-3M3 11V9"/>',
    selLiber: '<path d="M5 4c3-2 9-2 11 1s-1 5 0 8-3 5-6 4-7-2-7-6 0-5 2-7z" stroke-dasharray="2 2"/>',
    trunchiere: '<path d="M5.5 2v12.5H18"/><path d="M2 5.5h12.5V18"/>',
    redim: '<rect x="2.5" y="8.5" width="9" height="9" fill="#e6f2fb"/><path d="M11 2.5h6.5V9"/><path d="M17.5 2.5L12 8"/>',
    rotire: '<path d="M16 10.5a6 6 0 1 1-1.8-4.3"/><path d="M15 2.5v4h-4"/>',
    lipire: '<rect x="3.5" y="3.5" width="11" height="14" rx="1.2" fill="#c8a165" stroke="#7a5a2a"/><rect x="7.5" y="7.5" width="9.5" height="10.5" fill="#fff"/><path d="M6.5 3.5V2.5h5v1"/><path d="M9.5 11h5M9.5 14h5"/>',
    copiere: '<rect x="6.5" y="6.5" width="10" height="11" rx="1" fill="#fff"/><path d="M13.5 6.5V3.5h-10v11h3"/>',
    decupare: '<circle cx="5.5" cy="14.5" r="2.5"/><circle cx="14.5" cy="14.5" r="2.5"/><path d="M7.3 12.7L15 3M12.7 12.7L5 3"/>',
    anulare: '<path d="M7.5 4.5L3.5 8.5l4 4"/><path d="M3.5 8.5h8.5a4.5 4.5 0 0 1 0 9H9"/>',
    refacere: '<path d="M12.5 4.5l4 4-4 4"/><path d="M16.5 8.5H8a4.5 4.5 0 0 0 0 9h3"/>',
    salvare: '<path d="M3.5 3h11l2.5 2.5V17h-13.5z" fill="#3c7fc4" stroke="#1f4e85"/><path d="M6 3v4.5h7V3" fill="#fff" stroke="#1f4e85"/><rect x="6" y="11" width="8" height="6" fill="#fff" stroke="#1f4e85"/>',
    sageataJos: '<path d="M6 8l4 4 4-4"/>',
    sageataDr: '<path d="M8 6l4 4-4 4"/>',
    schimba: '<path d="M5 8h10l-3-3M15 12H5l3 3"/>',
    culori: '<circle cx="10" cy="10" r="7.5" fill="#fff"/><path d="M10 2.5v7.5L3.5 6.3" fill="#e81123" stroke="none"/><path d="M10 2.5a7.5 7.5 0 0 1 6.5 3.8L10 10z" fill="#ffb900" stroke="none"/><path d="M16.5 6.3a7.5 7.5 0 0 1 0 7.4L10 10z" fill="#107c10" stroke="none"/><path d="M16.5 13.7A7.5 7.5 0 0 1 10 17.5V10z" fill="#00b7c3" stroke="none"/><path d="M10 17.5a7.5 7.5 0 0 1-6.5-3.8L10 10z" fill="#0078d7" stroke="none"/><path d="M3.5 13.7a7.5 7.5 0 0 1 0-7.4L10 10z" fill="#881798" stroke="none"/><circle cx="10" cy="10" r="7.5"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    minus: '<path d="M4 10h12"/>',
    marire: '<circle cx="8.5" cy="8.5" r="5.5" fill="#e6f2fb"/><path d="M12.5 12.5L17.5 17.5" stroke-width="2.2"/><path d="M6 8.5h5M8.5 6v5"/>',
    micsorare: '<circle cx="8.5" cy="8.5" r="5.5" fill="#e6f2fb"/><path d="M12.5 12.5L17.5 17.5" stroke-width="2.2"/><path d="M6 8.5h5"/>',
    suta: '<rect x="2.5" y="4" width="15" height="12" rx="1" fill="#fff"/><path d="M6 8l1.5-1v6M11 8l1.5-1v6M9.3 9v.1M9.3 12v.1"/>',
    rigle: '<path d="M2.5 6.5h15v7h-15z" fill="#f6e3a1"/><path d="M5 6.5v3M8 6.5v2M11 6.5v3M14 6.5v2"/>',
    liniatura: '<rect x="3" y="3" width="14" height="14" fill="#fff"/><path d="M3 7.7h14M3 12.3h14M7.7 3v14M12.3 3v14" stroke-width="1"/>',
    baraStare: '<rect x="2.5" y="3.5" width="15" height="13" rx="1" fill="#fff"/><path d="M2.5 13h15" /><path d="M4.5 15h4" stroke-width="1.2"/>',
    ecranComplet: '<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/>',
    aspect: '<rect x="2.5" y="3.5" width="15" height="13" rx="2" fill="#fff"/><path d="M2.5 7.5h15"/><path d="M5 5.5h4" stroke="#0078d7"/>',
    straturi: '<path d="M10 3l7.5 4-7.5 4-7.5-4z" fill="#e6f2fb"/><path d="M2.5 10.5l7.5 4 7.5-4"/><path d="M2.5 13.5l7.5 4 7.5-4"/>',
    fundal: '<rect x="2.5" y="2.5" width="15" height="15" stroke-dasharray="2 2"/><circle cx="10" cy="7.5" r="2.6" fill="#fff"/><path d="M5 17c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5" fill="#fff"/>',
    ochi: '<path d="M1.8 10S5 4.5 10 4.5 18.2 10 18.2 10 15 15.5 10 15.5 1.8 10 1.8 10z"/><circle cx="10" cy="10" r="2.6"/>',
    ochiTaiat: '<path d="M1.8 10S5 4.5 10 4.5 18.2 10 18.2 10 15 15.5 10 15.5 1.8 10 1.8 10z"/><path d="M3.5 3.5l13 13"/>',
    puncte: '<circle cx="4.5" cy="10" r="1.1" fill="currentColor"/><circle cx="10" cy="10" r="1.1" fill="currentColor"/><circle cx="15.5" cy="10" r="1.1" fill="currentColor"/>',
    stCursor: '<path d="M10 2v5M10 13v5M2 10h5M13 10h5"/><circle cx="10" cy="10" r="1"/>',
    stSel: '<path d="M3 6V3h3M9 3h2M14 3h3v3M17 9v2M17 14v3h-3M11 17H9M6 17H3v-3M3 11V9"/>',
    stImg: '<rect x="2.5" y="4" width="15" height="12" rx="1"/><path d="M2.5 13l4-4 3 3 2-2 6 6"/>',
    stDisc: '<path d="M3.5 3h11l2.5 2.5V17h-13.5z"/><path d="M6 3v4.5h7V3"/>',
    nou: '<path d="M4.5 2.5h7.5l3.5 3.5v11.5h-11z" fill="#fff"/><path d="M12 2.5V6h3.5"/>',
    deschidere: '<path d="M2.5 5.5v11h13l2-7h-13l-2 7" fill="#f8d775" stroke="#b08a1e"/><path d="M2.5 5.5V3.5h5l1.5 2h6v4" fill="none" stroke="#b08a1e"/>',
    salvareCa: '<path d="M3.5 3h11l2.5 2.5V17h-13.5z" fill="#3c7fc4" stroke="#1f4e85"/><path d="M6 3v4.5h7V3" fill="#fff" stroke="#1f4e85"/><path d="M9 16.5l1-3 5.5-5.5 2 2-5.5 5.5z" fill="#f7c948" stroke="#000"/>',
    tiparire: '<rect x="5" y="2.5" width="10" height="5" fill="#fff"/><rect x="2.5" y="7.5" width="15" height="7" rx="1" fill="#c8c8c8"/><rect x="5" y="12" width="10" height="5.5" fill="#fff"/>',
    proprietati: '<rect x="3" y="2.5" width="14" height="15" rx="1" fill="#fff"/><path d="M6 6.5h8M6 10h8M6 13.5h5"/>',
    despre: '<circle cx="10" cy="10" r="7.5" fill="#fff"/><path d="M10 9v5" stroke-width="2"/><circle cx="10" cy="6.2" r=".6" fill="currentColor"/>',
    iesire: '<path d="M5 5l10 10M15 5L5 15"/>',
    import: '<rect x="2.5" y="4" width="15" height="12" rx="1" fill="#fff"/><path d="M2.5 13l4-4 3 3 2-2 6 6"/><circle cx="13.5" cy="7.5" r="1.3"/>',
    recente: '<circle cx="10" cy="10" r="7.5" fill="#fff"/><path d="M10 5.5V10l3 2"/>',
  };
  const svg = (inner, cls = 'ap-desen-ico') => h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>` });
  const ico = (k, cls) => svg(P[k], cls);

  // ---------- Cursoarele uneltelor (SVG 32×32, cu punctul activ ca în Paint) ----------
  const cursorSvg = (inner, x, y, rezerva) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke-linejoin="round" stroke-linecap="round">${inner}</svg>`)}") ${x} ${y}, ${rezerva}`;
  const CRUCE = '<path d="M16 2v11M16 19v11M2 16h11M19 16h11" stroke="#fff" stroke-width="3"/><path d="M16 2v11M16 19v11M2 16h11M19 16h11" stroke="#000" stroke-width="1"/>';
  const CURSOARE = {
    creion: cursorSvg('<path d="M2 30l2-7L21 6l5 5L9 28z" fill="#f7c948" stroke="#000"/><path d="M2 30l2-7 5 5z" fill="#f3d9b1" stroke="#000"/><path d="M2 30l1-3 2 2z" fill="#000" stroke="#000"/><path d="M18 9l5 5" stroke="#000"/>', 2, 30, 'crosshair'),
    umplere: cursorSvg('<path d="M8 13l8-8 10 10-8 8a2 2 0 0 1-3 0l-7-7a2 2 0 0 1 0-3z" fill="#fff" stroke="#000" stroke-width="1.4"/><path d="M8 14.5h18" stroke="#000" stroke-width="1.2"/><path d="M5 20c-2.5 3.5-2.5 6.2 0 9 2.5-2.8 2.5-5.5 0-9z" fill="#000" stroke="#fff" stroke-width="1"/>', 5, 29, 'cell'),
    pipeta: cursorSvg('<path d="M3 29l1.2-4.2L17 12l3 3L7.2 27.8z" fill="#fff" stroke="#000" stroke-width="1.3"/><path d="M17.5 9.5l5-5a2.6 2.6 0 0 1 3.7 3.7l-5 5z" fill="#333" stroke="#000"/><path d="M15.5 9.5l7 7" stroke="#000" stroke-width="2.2"/>', 3, 29, 'cell'),
    lupa: cursorSvg('<circle cx="13" cy="13" r="9" fill="rgba(255,255,255,.55)" stroke="#fff" stroke-width="4"/><circle cx="13" cy="13" r="9" stroke="#000" stroke-width="2"/><path d="M20 20l9 9" stroke="#000" stroke-width="4"/><path d="M9 13h8M13 9v8" stroke="#000" stroke-width="1.8"/>', 13, 13, 'zoom-in'),
    cruce: cursorSvg(CRUCE, 16, 16, 'crosshair'),
  };

  // ---------- Constante ----------
  const PALETA = ['#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
    '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'];
  // Culorile de bază din fereastra Windows „Editare culori”
  const CULORI_BAZA = ['#ff8080', '#ffff80', '#80ff80', '#00ff80', '#80ffff', '#0080ff', '#ff80c0', '#ff80ff',
    '#ff0000', '#ffff00', '#80ff00', '#00ff40', '#00ffff', '#0080c0', '#8080c0', '#ff00ff',
    '#804040', '#ff8040', '#00ff00', '#008080', '#004080', '#8080ff', '#800040', '#ff0080',
    '#800000', '#ff8000', '#008000', '#008040', '#0000ff', '#0000a0', '#800080', '#8000ff',
    '#400000', '#804000', '#004000', '#004040', '#000080', '#000040', '#400040', '#400080',
    '#000000', '#808000', '#808040', '#808080', '#408080', '#c0c0c0', '#400040', '#ffffff'];
  const GROSIMI = [1, 2, 3, 5, 8, 12, 20, 30];
  const ZOOM = [0.125, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
  const FONTURI = { 'Arial': 'Arial, Helvetica, sans-serif', 'Calibri': 'Calibri, Carlito, "Segoe UI", sans-serif', 'Comic Sans MS': '"Comic Sans MS", "Comic Neue", cursive', 'Courier New': '"Courier New", Courier, monospace', 'Georgia': 'Georgia, serif',
    'Impact': 'Impact, "Arial Black", sans-serif', 'Segoe UI': '"Segoe UI", system-ui, sans-serif', 'Times New Roman': '"Times New Roman", Times, serif', 'Trebuchet MS': '"Trebuchet MS", sans-serif', 'Verdana': 'Verdana, sans-serif', 'Montserrat': 'Montserrat, sans-serif' };
  const MARIMI = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
  const PENSULE = [['normala', 'Pensulă'], ['caligrafie', 'Pensulă de caligrafie 1'], ['caligrafie2', 'Pensulă de caligrafie 2'], ['aerograf', 'Aerograf'], ['ulei', 'Pensulă de ulei'],
    ['cerat', 'Creion cerat'], ['marker', 'Marker'], ['natural', 'Creion natural'], ['acuarela', 'Pensulă de acuarelă']];
  const STILURI = [['unic', 'Culoare unică'], ['cerat', 'Creion cerat'], ['marker', 'Marker'], ['ulei', 'Ulei'], ['natural', 'Creion natural'], ['acuarela', 'Acuarelă']];
  const FORMATE = { png: ['PNG', 'Imagine PNG', 'PNG (*.png)', 'image/png', 'Salvați o fotografie sau un desen de calitate superioară, pentru calculator sau pentru web.'],
    jpg: ['JPEG', 'Imagine JPEG', 'JPEG (*.jpg;*.jpeg)', 'image/jpeg', 'Salvați o fotografie de calitate bună, ca fișier mic, pentru web sau e-mail.'],
    bmp: ['BMP', 'Imagine BMP', 'Imagine bitmap pe 24 de biți (*.bmp)', 'image/bmp', 'Salvați orice tip de imagine, de calitate foarte bună, într-un fișier mare.'],
    gif: ['GIF', 'Imagine GIF', 'GIF (*.gif)', 'image/gif', 'Salvați un desen simplu, cu puține culori, pentru web.'] };
  const MAX_LATURA = 4000; // pânza cea mai mare permisă
  const LUCRARE_MAX = 1600; // latura maximă a imaginii predate la sarcină
  const DPI = 96;

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
  const SAGEATA = [[0, 0.3], [0.6, 0.3], [0.6, 0], [1, 0.5], [0.6, 1], [0.6, 0.7], [0, 0.7]];
  const UNIT = {
    triunghi: [[0.5, 0], [1, 1], [0, 1]], triunghiDr: [[0, 0], [0, 1], [1, 1]], romb: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
    pentagon: poligon(5), hexagon: poligon(6), stea4: poligon(4, 0.38), stea: poligon(5, 0.4), stea6: poligon(6, 0.55),
    sageata: SAGEATA, sageataSt: SAGEATA.map(([x, y]) => [1 - x, y]), sageataSus: SAGEATA.map(([x, y]) => [y, 1 - x]), sageataJos: SAGEATA.map(([x, y]) => [y, x]),
    fulger: [[0.55, 0], [0.12, 0.56], [0.45, 0.56], [0.3, 1], [0.88, 0.4], [0.56, 0.4], [0.78, 0]],
  };
  const FORME = [['linie', 'Linie'], ['elipsa', 'Oval'], ['dreptunghi', 'Dreptunghi'], ['rotunjit', 'Dreptunghi rotunjit'], ['triunghi', 'Triunghi'], ['triunghiDr', 'Triunghi dreptunghic'], ['romb', 'Romb'],
    ['pentagon', 'Pentagon'], ['hexagon', 'Hexagon'], ['sageata', 'Săgeată la dreapta'], ['sageataSt', 'Săgeată la stânga'], ['sageataSus', 'Săgeată în sus'], ['sageataJos', 'Săgeată în jos'], ['stea4', 'Stea cu patru colțuri'],
    ['stea', 'Stea cu cinci colțuri'], ['stea6', 'Stea cu șase colțuri'], ['balon', 'Balon text dreptunghiular rotunjit'], ['inima', 'Inimă'], ['fulger', 'Fulger']];
  function caleForma(tip, x, y, w, hh) {
    const p = new Path2D();
    if (tip === 'dreptunghi') p.rect(x, y, w, hh);
    else if (tip === 'rotunjit') {
      const r = Math.min(w, hh) * 0.2;
      p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + hh, r); p.arcTo(x + w, y + hh, x, y + hh, r); p.arcTo(x, y + hh, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
    } else if (tip === 'balon') {
      const b = y + hh * 0.75, r = Math.min(w, hh * 0.75) * 0.2;
      p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, b, r); p.arcTo(x + w, b, x, b, r);
      p.lineTo(x + w * 0.42, b); p.lineTo(x + w * 0.2, y + hh); p.lineTo(x + w * 0.27, b);
      p.arcTo(x, b, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
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
    else if (tip === 'balon') d = '<path d="M5 3.5h10a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5 1-3.5H5A2.5 2.5 0 0 1 2.5 11V6A2.5 2.5 0 0 1 5 3.5z"/>';
    else if (tip === 'inima') d = '<path d="M10 6.7C10 3 2.5 2.5 2.5 7.5c0 4 5 5.6 7.5 9.5 2.5-3.9 7.5-5.5 7.5-9.5C17.5 2.5 10 3 10 6.7z"/>';
    else d = `<path d="M${UNIT[tip].map(([u, v]) => `${s(u)} ${s(v)}`).join('L')}z"/>`;
    return svg(d);
  }

  // ---------- Culori ----------
  const hexRgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const rgbHex = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
  const NUME_CULORI = { '#000000': 'Negru', '#7f7f7f': 'Gri-50%', '#880015': 'Roșu închis', '#ed1c24': 'Roșu', '#ff7f27': 'Portocaliu', '#fff200': 'Galben', '#22b14c': 'Verde', '#00a2e8': 'Turcoaz', '#3f48cc': 'Indigo', '#a349a4': 'Violet',
    '#ffffff': 'Alb', '#c3c3c3': 'Gri-25%', '#b97a57': 'Maro', '#ffaec9': 'Trandafiriu', '#ffc90e': 'Auriu', '#efe4b0': 'Galben deschis', '#b5e61d': 'Verde lămâie', '#99d9ea': 'Turcoaz deschis', '#7092be': 'Gri albăstrui', '#c8bfe7': 'Lavandă' };
  const numeCuloare = (c) => { const [r, g, b] = hexRgb(c); return NUME_CULORI[c] ? `${NUME_CULORI[c]}` : `Roșu: ${r}, Verde: ${g}, Albastru: ${b}`; };
  // Nuanță, saturație, luminozitate pe scara Windows (0–240)
  function rgbHsl240(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let hh = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh /= 6;
    }
    return [Math.round(hh * 240) % 240, Math.round(s * 240), Math.round(l * 240)];
  }
  function hsl240Rgb(H, Sa, L) {
    const hh = H / 240, s = Sa / 240, l = L / 240;
    if (!s) return [l * 255, l * 255, l * 255].map(Math.round);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)].map((v) => Math.round(v * 255));
  }

  // Texturi pentru pensule și pentru conturul/umplerea formelor (creion cerat, ulei, acuarelă...)
  const texturi = new Map();
  function textura(culoare, fel) {
    const k = `${culoare}|${fel}`;
    if (texturi.has(k)) return texturi.get(k);
    if (texturi.size > 60) texturi.clear();
    const n = 48, c = canvasNou(n, n), g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data, [R, G, B] = hexRgb(culoare);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      let a;
      if (fel === 'cerat') { const gx = x >> 1, gy = y >> 1; seed = (gx * 73856093 ^ gy * 19349663) >>> 0 || 1; a = rnd() < 0.3 ? 0 : 0.65 + rnd() * 0.35; }
      else if (fel === 'natural') a = rnd() < 0.25 ? 0.1 : 0.35 + rnd() * 0.45;
      else if (fel === 'ulei') { const banda = Math.sin(y * 1.3) * 0.5 + 0.5; a = 0.78 + banda * 0.22 * rnd(); }
      else a = 0.35 + rnd() * 0.25; // acuarelă
      const umbra = fel === 'ulei' ? 0.85 + 0.15 * rnd() : 1;
      d[i] = R * umbra; d[i + 1] = G * umbra; d[i + 2] = B * umbra; d[i + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    texturi.set(k, c);
    return c;
  }
  // Stilul de desen pentru o culoare și un efect: { stil, alfa }
  function stilEfect(g, culoare, fel) {
    if (fel === 'marker') return { stil: culoare, alfa: 0.5 };
    if (fel === 'unic' || !fel) return { stil: culoare, alfa: 1 };
    return { stil: g.createPattern(textura(culoare, fel), 'repeat'), alfa: fel === 'acuarela' ? 0.85 : 1 };
  }

  // ---------- Utilitare canvas ----------
  function canvasNou(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); c.getContext('2d', { willReadFrequently: true }); return c; }
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
  // Redimensionare + înclinare (grade); fundal = culoarea colțurilor goi (sau transparent)
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
  const pePanzaAlba = (c) => { const j = canvasNou(c.width, c.height), g = j.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, j.width, j.height); g.drawImage(c, 0, 0); return j; };
  const citesteFisier = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
  const incarcaImagine = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Paint nu poate citi acest fișier. Acesta nu este un fișier imagine valid sau formatul său nu este acceptat.')); i.src = src; });
  const imagineInCanvas = async (src) => { const img = await incarcaImagine(src); const c = canvasNou(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0); return c; };
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

  // Codificare BMP pe 24 de biți (browserul nu știe să salveze BMP)
  function codBMP(c) {
    const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data, rand = (W * 3 + 3) & ~3, n = 54 + rand * H;
    const buf = new ArrayBuffer(n), v = new DataView(buf), u = new Uint8Array(buf);
    u[0] = 0x42; u[1] = 0x4d; v.setUint32(2, n, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true);
    v.setInt32(18, W, true); v.setInt32(22, H, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, rand * H, true); v.setInt32(38, 3780, true); v.setInt32(42, 3780, true);
    for (let y = 0; y < H; y++) { let o = 54 + (H - 1 - y) * rand; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; u[o++] = d[i + 2]; u[o++] = d[i + 1]; u[o++] = d[i]; } }
    return new Blob([buf], { type: 'image/bmp' });
  }
  // Codificare GIF (paletă fixă de 252 de culori + transparent, compresie LZW)
  function codGIF(c) {
    const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data, TR = 252;
    const pal = new Uint8Array(768);
    for (let r = 0; r < 6; r++) for (let g = 0; g < 7; g++) for (let b = 0; b < 6; b++) { const i = (r * 42 + g * 6 + b) * 3; pal[i] = r * 51; pal[i + 1] = Math.round(g * 42.5); pal[i + 2] = b * 51; }
    const idx = new Uint8Array(W * H); let areTr = false;
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      if (d[i + 3] < 128) { idx[p] = TR; areTr = true; } else idx[p] = Math.round(d[i] / 51) * 42 + Math.round(d[i + 1] / 42.5) * 6 + Math.round(d[i + 2] / 51);
    }
    const out = [], b8 = (x) => out.push(x & 255), b16 = (x) => { b8(x); b8(x >> 8); };
    for (const ch of 'GIF89a') b8(ch.charCodeAt(0));
    b16(W); b16(H); b8(0xf7); b8(0); b8(0);
    for (let i = 0; i < 768; i++) b8(pal[i]);
    if (areTr) { b8(0x21); b8(0xf9); b8(4); b8(1); b16(0); b8(TR); b8(0); }
    b8(0x2c); b16(0); b16(0); b16(W); b16(H); b8(0);
    b8(8);
    const CLEAR = 256, EOI = 257, bytes = [];
    let size = 9, next = 258, buf = 0, nb = 0, dict = new Map();
    const emit = (code) => { buf |= code << nb; nb += size; while (nb >= 8) { bytes.push(buf & 255); buf >>>= 8; nb -= 8; } };
    emit(CLEAR);
    let pre = idx[0];
    for (let p = 1; p < idx.length; p++) {
      const k = idx[p], cheie = pre * 256 + k, v = dict.get(cheie);
      if (v !== undefined) { pre = v; continue; }
      emit(pre);
      if (next === 4096) { emit(CLEAR); dict = new Map(); next = 258; size = 9; }
      else { if (next >= (1 << size)) size++; dict.set(cheie, next++); }
      pre = k;
    }
    emit(pre); emit(EOI);
    if (nb > 0) bytes.push(buf & 255);
    for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); b8(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); }
    b8(0); b8(0x3b);
    return new Blob([new Uint8Array(out)], { type: 'image/gif' });
  }
  const blobDin = (c, fmt) => new Promise((res) => {
    if (fmt === 'bmp') return res(codBMP(pePanzaAlba(c)));
    if (fmt === 'gif') return res(codGIF(c));
    (fmt === 'jpg' ? pePanzaAlba(c) : c).toBlob((b) => res(b), FORMATE[fmt][3], 0.92);
  });

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

  // Eliminare fundal (simplă): culoarea cea mai des întâlnită pe margini devine transparentă,
  // pornind de la margini (zonele închise din interiorul subiectului rămân neatinse)
  function eliminaFundal(c, tol = 48) {
    const W = c.width, H = c.height, g = c.getContext('2d', { willReadFrequently: true });
    const img = g.getImageData(0, 0, W, H), d = img.data, numar = new Map();
    const margine = [];
    for (let x = 0; x < W; x++) margine.push(x, (H - 1) * W + x);
    for (let y = 1; y < H - 1; y++) margine.push(y * W, y * W + W - 1);
    for (const p of margine) { const i = p * 4; if (d[i + 3] < 20) continue; const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); numar.set(k, (numar.get(k) || 0) + 1); }
    if (!numar.size) return 0;
    const k = [...numar.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const R = ((k >> 8) & 15) * 16 + 8, G = ((k >> 4) & 15) * 16 + 8, B = (k & 15) * 16 + 8;
    const vazut = new Uint8Array(W * H), stiva = [];
    const fund = (p) => { const i = p * 4; return d[i + 3] < 20 || (Math.abs(d[i] - R) <= tol && Math.abs(d[i + 1] - G) <= tol && Math.abs(d[i + 2] - B) <= tol); };
    for (const p of margine) if (!vazut[p] && fund(p)) { vazut[p] = 1; stiva.push(p); }
    let n = 0;
    while (stiva.length) {
      const p = stiva.pop(), x = p % W;
      d[p * 4 + 3] = 0; n++;
      const vec = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W];
      for (const q of vec) if (q >= 0 && q < W * H && !vazut[q] && fund(q)) { vazut[q] = 1; stiva.push(q); }
    }
    // margine moale: pixelii opaci lipiți de fundal devin pe jumătate transparenți
    for (let p = 0; p < W * H; p++) {
      if (!d[p * 4 + 3] || vazut[p]) continue;
      const x = p % W;
      if ((x > 0 && vazut[p - 1]) || (x < W - 1 && vazut[p + 1]) || (p >= W && vazut[p - W]) || (p + W < W * H && vazut[p + W])) d[p * 4 + 3] = Math.min(d[p * 4 + 3], 170);
    }
    g.putImageData(img, 0, 0);
    return n;
  }

  // ---------- Ruta ----------
  routes.push({ pattern: /^\/aplicatii\/desen$/, handler: async (m, params) => editor(params) });

  async function editor() {
    const ac = new AbortController(), sig = { signal: ac.signal };
    const pref = lsCiteste(LS_PREF, {}) || {};
    const S = {
      unealta: 'creion', unealtaAnt: 'creion', pensula: 'normala', forma: 'dreptunghi', selFel: 'drept',
      contur: 'unic', umplere: 'fara', grosime: 3, c1: '#000000', c2: '#ffffff', activa: 1,
      zoom: 1, grila: !!pref.grila, rigle: !!pref.rigle, stareVizibila: pref.stare !== false, transparenta: false,
      aspect: pref.aspect === 'win11' ? 'win11' : 'clasic', panouStraturi: pref.straturi !== false, fila: 'pornire',
      font: 'Arial', marime: 24, aldin: false, cursiv: false, subliniat: false, taiat: false, opac: false,
      fisierId: null, titlu: 'Fără titlu', format: 'png', creat: null, modificat: false, salvatLa: null, peDisc: null,
    };
    const salveazaPref = () => lsScrie(LS_PREF, { grila: S.grila, rigle: S.rigle, stare: S.stareVizibila, aspect: S.aspect, straturi: S.panouStraturi });
    let particularizate = (lsCiteste(LS_CULORI, []) || []).filter((c) => /^#[0-9a-f]{6}$/.test(c)).slice(0, 16);
    const numeAfisat = () => (S.fisierId || S.extern ? `${S.titlu}.${S.format}` : S.titlu);

    // ----- Pânza: straturile, stratul de previzualizare, selecția, forma în lucru -----
    const stivaEl = h('div', { class: 'ap-desen-stiva-cv' });
    const ov = h('canvas', { class: 'ap-desen-ov', 'aria-label': 'Suprafața de desenare', role: 'img' });
    const octx = ov.getContext('2d');
    const grila = h('div', { class: 'ap-desen-grila', hidden: true });
    const DIRECTII = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const manereCutie = () => DIRECTII.map((d) => h('div', { class: `ap-desen-m m-${d}`, 'data-d': d }));
    const selCv = h('canvas');
    const selEl = h('div', { class: 'ap-desen-sel', hidden: true }, selCv, manereCutie());
    const foEl = h('div', { class: 'ap-desen-fo', hidden: true }, manereCutie(), h('div', { class: 'ap-desen-m m-p1', 'data-d': 'p1' }), h('div', { class: 'ap-desen-m m-p2', 'data-d': 'p2' }));
    const pzContur = h('div', { class: 'ap-desen-pz-contur', hidden: true });
    const manere = ['e', 's', 'se'].map((d) => h('div', { class: `ap-desen-pz-maner ${d}`, 'data-d': d, 'data-tip': 'Trageți pentru a redimensiona pânza' }));
    const pagina = h('div', { class: 'ap-desen-pagina' }, stivaEl, grila, ov, foEl, selEl, pzContur, ...manere);
    const scena = h('div', { class: 'ap-desen-scena' }, pagina);
    const riglaSus = h('canvas', { class: 'ap-desen-rigla sus' }), riglaStg = h('canvas', { class: 'ap-desen-rigla stg' });
    const zona = h('div', { class: 'ap-desen-zona' }, h('div', { class: 'ap-desen-rigla-colt' }), riglaSus, riglaStg, scena);

    // ----- Straturi -----
    let straturi = [], activ = 0, cv = null, ctx = null, nrStrat = 1;
    function stratNou(w, hh, alb) {
      const c = canvasNou(w, hh);
      if (alb) { const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
      return { c, nume: `Strat ${nrStrat++}`, vizibil: true };
    }
    function legaStrat() { activ = clamp(activ, 0, straturi.length - 1); cv = straturi[activ].c; ctx = cv.getContext('2d', { willReadFrequently: true }); }
    function afiseazaStraturi() {
      stivaEl.replaceChildren(...straturi.map((s) => { s.c.className = 'ap-desen-cv'; s.c.style.visibility = s.vizibil ? '' : 'hidden'; return s.c; }));
      if (ov.width !== cv.width || ov.height !== cv.height) { ov.width = cv.width; ov.height = cv.height; }
      aplicaZoom(); stare(); listaStraturi();
    }
    function panzaNoua(w, hh) { nrStrat = 1; straturi = [stratNou(w, hh, true)]; activ = 0; legaStrat(); afiseazaStraturi(); }
    // Imaginea așa cum se vede (straturile vizibile, plus ce e încă nefixat pe stratul activ)
    function compozit(cuNefixate = true) {
      const c = canvasNou(cv.width, cv.height), g = c.getContext('2d');
      straturi.forEach((l, i) => {
        if (!l.vizibil) return;
        g.drawImage(l.c, 0, 0);
        if (cuNefixate && i === activ) { if (fl) g.drawImage(selCv, fl.x, fl.y, fl.w, fl.h); if (fo) deseneazaFormaObj(g, fo); if (tx) deseneazaText(g, tx); }
      });
      return c;
    }

    // ----- Anulare / Refacere: copii ale tuturor straturilor -----
    const anulari = [], refaceri = [];
    const instantaneu = () => ({ s: straturi.map((l) => ({ c: copie(l.c), nume: l.nume, vizibil: l.vizibil })), activ });
    const pxStare = (st) => st.s.reduce((s, l) => s + l.c.width * l.c.height, 0);
    function restaurareStare(st) { straturi = st.s; activ = st.activ; legaStrat(); afiseazaStraturi(); }
    function pas() {
      anulari.push(instantaneu());
      let px = anulari.reduce((s, st) => s + pxStare(st), 0);
      while (anulari.length > 40 || (px > 60e6 && anulari.length > 2)) px -= pxStare(anulari.shift());
      refaceri.length = 0;
      schimbat();
    }
    function anuleaza() {
      if (fo) { fo = null; randeazaForma(); actualizeazaUI(); return; } // ca în Paint: forma încă selectată dispare
      fixeazaText(); fixeazaFlotant();
      if (!anulari.length) return;
      refaceri.push(instantaneu()); restaurareStare(anulari.pop()); schimbat();
    }
    function reface() {
      comite();
      if (!refaceri.length) return;
      anulari.push(instantaneu()); restaurareStare(refaceri.pop()); schimbat();
    }
    // Aplică o transformare fiecărui strat (rotire, trunchiere, redimensionare...)
    function inlocuiesteTot(fn) {
      pas();
      straturi.forEach((l, i) => { l.c = fn(l.c, i); });
      legaStrat(); afiseazaStraturi(); schimbat();
    }
    const comite = () => { fixeazaText(); fixeazaForma(); fixeazaFlotant(); };

    // ----- Ciorna (lucrul curent se păstrează automat) -----
    let tCiorna = null, tMini = 0, renuntat = false;
    function schimbat() {
      S.modificat = true; renuntat = false;
      actualizeazaTitlu(); actualizeazaUI();
      clearTimeout(tCiorna); tCiorna = setTimeout(salveazaCiorna, 1500);
      if (!tMini) tMini = requestAnimationFrame(() => { tMini = 0; miniStraturi(); });
    }
    const straturiRec = () => (straturi.length > 1 ? { straturi: straturi.map((l) => ({ nume: l.nume, vizibil: l.vizibil, imagine: l.c.toDataURL('image/png') })), activ } : {});
    async function salveazaCiorna() {
      clearTimeout(tCiorna); tCiorna = null;
      if (renuntat) return;
      try {
        await store.put({ id: CIORNA, fisierId: S.fisierId, titlu: S.titlu, format: S.format, creat: S.creat, modificat: S.modificat, imagine: compozit(true).toDataURL('image/png'), ...straturiRec(), actualizat: Date.now() });
      } catch { /* spațiu plin: ciorna e doar o rezervă */ }
    }

    // ----- Panoramare (zoom) și rigle -----
    function aplicaZoom() {
      const W = cv.width * S.zoom, H = cv.height * S.zoom;
      pagina.style.width = `${W}px`; pagina.style.height = `${H}px`;
      pagina.classList.toggle('pixeli', S.zoom >= 2);
      let pasG = 10 * S.zoom; while (pasG < 8) pasG *= 5;
      grila.style.backgroundSize = `${pasG}px ${pasG}px`;
      pozFlotant(); randeazaForma(false); stilText();
      if (zoomEl) { zoomEl.textContent = `${Math.round(S.zoom * 100)}%`; zoomSlider.value = String(Math.round(S.zoom * 100)); }
      requestAnimationFrame(deseneazaRigle);
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
      deseneazaRigle();
    }
    const mareste = (a) => setZoom(ZOOM.find((v) => v > S.zoom + 1e-6) ?? 8, a);
    const micsoreaza = (a) => setZoom([...ZOOM].reverse().find((v) => v < S.zoom - 1e-6) ?? 0.1, a);
    function potriveste() {
      const w = scena.clientWidth - 48, hh = scena.clientHeight - 48;
      if (w <= 0 || hh <= 0) return;
      S.zoom = clamp(Math.min(1, w / cv.width, hh / cv.height), 0.1, 1); aplicaZoom();
      scena.scrollLeft = 0; scena.scrollTop = 0;
    }
    let cursorImg = null; // poziția cursorului pe imagine, pentru rigle
    function deseneazaRigle() {
      zona.classList.toggle('cu-rigle', S.rigle);
      if (!S.rigle || !radacina.isConnected) return;
      const dpr = window.devicePixelRatio || 1, sr = scena.getBoundingClientRect(), pr = pagina.getBoundingClientRect(), T = 18;
      for (const [rc, oriz] of [[riglaSus, true], [riglaStg, false]]) {
        const L = Math.max(1, oriz ? sr.width : sr.height), cw = Math.round((oriz ? L : T) * dpr), chh = Math.round((oriz ? T : L) * dpr);
        if (rc.width !== cw) rc.width = cw;
        if (rc.height !== chh) rc.height = chh;
        rc.style.width = `${oriz ? L : T}px`; rc.style.height = `${oriz ? T : L}px`;
        const g = rc.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = S.aspect === 'win11' ? '#f3f3f3' : '#e9ecf1'; g.fillRect(0, 0, oriz ? L : T, oriz ? T : L);
        const o = oriz ? pr.left - sr.left : pr.top - sr.top, lung = (oriz ? cv.width : cv.height) * S.zoom;
        g.fillStyle = '#ffffff';
        if (oriz) g.fillRect(o, 0, lung, T); else g.fillRect(0, o, T, lung);
        const pasi = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
        const mare = pasi.find((p) => p * S.zoom >= 56) || 2000;
        const mic = (mare / 10) * S.zoom >= 4 && mare >= 10 ? mare / 10 : (mare / 5) * S.zoom >= 4 && mare >= 5 ? mare / 5 : mare / 2 >= 1 ? mare / 2 : mare;
        const v0 = Math.floor(-o / S.zoom / mic) * mic, v1 = (L - o) / S.zoom;
        g.strokeStyle = '#6d6d6d'; g.fillStyle = '#3b3b3b'; g.lineWidth = 1; g.font = '9px "Segoe UI", system-ui, sans-serif';
        g.beginPath();
        for (let v = v0; v <= v1; v += mic) {
          const p = Math.round(o + v * S.zoom) + 0.5, esteMare = Math.abs(v / mare - Math.round(v / mare)) < 1e-6, lt = esteMare ? T : (Math.abs((v * 2) / mare - Math.round((v * 2) / mare)) < 1e-6 ? 7 : 4);
          if (oriz) { g.moveTo(p, T); g.lineTo(p, T - lt); } else { g.moveTo(T, p); g.lineTo(T - lt, p); }
          if (esteMare) {
            const t = String(Math.round(v));
            if (oriz) g.fillText(t, p + 2, 9);
            else { g.save(); g.translate(9, p + 2); g.rotate(-Math.PI / 2); g.textAlign = 'right'; g.fillText(t, 0, 0); g.restore(); }
          }
        }
        g.stroke();
        if (cursorImg) { // semnul cursorului
          const p = Math.round(o + (oriz ? cursorImg.x : cursorImg.y) * S.zoom) + 0.5;
          g.strokeStyle = '#0078d7'; g.beginPath();
          if (oriz) { g.moveTo(p, 0); g.lineTo(p, T); } else { g.moveTo(0, p); g.lineTo(T, p); }
          g.stroke();
        }
        g.strokeStyle = '#c8c8c8'; g.beginPath();
        if (oriz) { g.moveTo(0, T - 0.5); g.lineTo(L, T - 0.5); } else { g.moveTo(T - 0.5, 0); g.lineTo(T - 0.5, L); }
        g.stroke();
      }
    }
    scena.addEventListener('scroll', () => deseneazaRigle(), { passive: true });

    // ----- Mânere de redimensionare (selecție, forme, text) -----
    function redimRect(r0, d, dx, dy, prop) {
      let { x, y, w, h: hh } = r0;
      if (d.includes('e')) w = r0.w + dx;
      if (d.includes('s')) hh = r0.h + dy;
      if (d.includes('w')) { x = r0.x + dx; w = r0.w - dx; }
      if (d.includes('n')) { y = r0.y + dy; hh = r0.h - dy; }
      if (prop && d.length === 2 && r0.w > 0 && r0.h > 0) {
        const k = Math.max(w / r0.w, hh / r0.h), nw = r0.w * k, nh = r0.h * k;
        if (d.includes('w')) x = r0.x + r0.w - nw;
        if (d.includes('n')) y = r0.y + r0.h - nh;
        w = nw; hh = nh;
      }
      if (w < 1) { if (d.includes('w')) x = r0.x + r0.w - 1; w = 1; }
      if (hh < 1) { if (d.includes('n')) y = r0.y + r0.h - 1; hh = 1; }
      return { x, y, w, h: hh };
    }
    // Tragere cu pointerul: fn(dx, dy, ev) în pixeli de imagine; gata(ev) la final
    function trage(el, e, fn, gata) {
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch { /* */ }
      const sx = e.clientX, sy = e.clientY;
      const muta = (ev) => fn((ev.clientX - sx) / S.zoom, (ev.clientY - sy) / S.zoom, ev);
      const stop = (ev) => { el.removeEventListener('pointermove', muta); el.removeEventListener('pointerup', stop); el.removeEventListener('pointercancel', stop); gata?.(ev); };
      el.addEventListener('pointermove', muta); el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
    }

    // ----- Selecția plutitoare -----
    let fl = null; // { cv, x, y, w, h }
    function randeazaFlotant() {
      selCv.width = fl.cv.width; selCv.height = fl.cv.height;
      const g = selCv.getContext('2d', { willReadFrequently: true });
      g.clearRect(0, 0, selCv.width, selCv.height);
      g.drawImage(fl.cv, 0, 0);
      if (S.transparenta) { // Selecție transparentă: pixelii cu Culoarea 2 nu acoperă ce e dedesubt
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
    function coaceFlotant() { if (fl.cv.width !== Math.round(fl.w) || fl.cv.height !== Math.round(fl.h)) fl.cv = scaleaza(fl.cv, Math.max(1, Math.round(fl.w)), Math.max(1, Math.round(fl.h))); fl.w = fl.cv.width; fl.h = fl.cv.height; }
    // Golește zona de unde a fost luată selecția: pe fundal rămâne Culoarea 2, pe celelalte straturi rămâne transparent
    function golesteZona(cale, regula = 'nonzero') {
      ctx.save();
      if (activ === 0) { ctx.fillStyle = S.c2; ctx.fill(cale, regula); } else { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fill(cale, regula); }
      ctx.restore();
    }
    function ridica(x, y, w, hh, cale = null, regula = 'nonzero') {
      x = clamp(Math.floor(x), 0, cv.width); y = clamp(Math.floor(y), 0, cv.height);
      w = clamp(Math.ceil(w), 0, cv.width - x); hh = clamp(Math.ceil(hh), 0, cv.height - y);
      if (w < 1 || hh < 1) return;
      pas();
      const c = canvasNou(w, hh), g = c.getContext('2d');
      if (cale) { g.save(); g.translate(-x, -y); g.clip(cale, regula); g.drawImage(cv, 0, 0); g.restore(); }
      else g.drawImage(cv, x, y, w, hh, 0, 0, w, hh);
      if (!cale) { cale = new Path2D(); cale.rect(x, y, w, hh); }
      golesteZona(cale, regula);
      creeazaFlotant(c, x, y);
    }
    function selecteazaTot() { fixeazaText(); fixeazaForma(); fixeazaFlotant(); setUnealta('selectare'); ridica(0, 0, cv.width, cv.height); }
    function inverseazaSelectia() {
      fixeazaText(); fixeazaForma();
      if (!fl) return selecteazaTot();
      coaceFlotant();
      const r = { x: fl.x, y: fl.y, w: fl.w, h: fl.h };
      fixeazaFlotant();
      const cale = new Path2D(); cale.rect(0, 0, cv.width, cv.height); cale.rect(r.x, r.y, r.w, r.h);
      setUnealta('selectare'); ridica(0, 0, cv.width, cv.height, cale, 'evenodd');
    }

    // Clipboard: intern, plus clipboard-ul sistemului când browserul permite
    let clip = null, clipSistem = false;
    function copiaza() {
      if (!fl) { toast('Selectați mai întâi o parte din desen (Selectare).'); return false; }
      coaceFlotant(); randeazaFlotant();
      clip = copie(selCv); clipSistem = false;
      try {
        if (navigator.clipboard?.write && window.ClipboardItem) clip.toBlob((b) => { if (b) navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(() => { clipSistem = true; }, () => {}); });
      } catch { /* doar intern */ }
      actualizeazaUI();
      return true;
    }
    function decupeaza() { if (copiaza() === true) { fl = null; pozFlotant(); schimbat(); } }
    function stergeSelectia() { if (fl) { fl = null; pozFlotant(); schimbat(); } }
    function lipesteCanvas(c) {
      comite();
      setUnealta('selectare');
      if (c.width > cv.width || c.height > cv.height) { // ca în Paint: pânza se mărește ca să încapă
        const W = Math.max(cv.width, c.width), H = Math.max(cv.height, c.height);
        inlocuiesteTot((v, i) => { const n = canvasNou(W, H), g = n.getContext('2d'); if (i === 0) { g.fillStyle = S.c2; g.fillRect(0, 0, W, H); } g.drawImage(v, 0, 0); return n; });
      } else pas();
      const pr = pagina.getBoundingClientRect(), sr = scena.getBoundingClientRect();
      const x = clamp(Math.round((sr.left - pr.left) / S.zoom) + 4, 0, Math.max(0, cv.width - c.width));
      const y = clamp(Math.round((sr.top - pr.top) / S.zoom) + 4, 0, Math.max(0, cv.height - c.height));
      creeazaFlotant(c, x, y);
    }
    function lipeste() {
      if (!clip) return toast('Clipboardul este gol. Selectați ceva și apăsați Copiere (Ctrl+C).');
      lipesteCanvas(copie(clip));
    }
    async function insereazaImagine(f) {
      if (!f) return;
      if (!/^image\//.test(f.type)) return mesaj('Paint', 'Paint nu poate citi acest fișier.\nAcesta nu este un fișier imagine valid sau formatul său nu este acceptat.', [['OK', true, 'prim']], 'eroare');
      try {
        const img = await incarcaImagine(await citesteFisier(f));
        let w = img.naturalWidth, hh = img.naturalHeight;
        const k = Math.min(1, MAX_LATURA / w, MAX_LATURA / hh);
        if (k < 1) { w = Math.max(1, Math.round(w * k)); hh = Math.max(1, Math.round(hh * k)); }
        const c = canvasNou(w, hh), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, hh);
        lipesteCanvas(c);
      } catch (e) { mesaj('Paint', e.message, [['OK', true, 'prim']], 'eroare'); }
    }

    // ----- Transformări: ale selecției sau ale întregii imagini -----
    function roteste(fel) {
      fixeazaText(); fixeazaForma();
      if (fl) {
        coaceFlotant();
        const cx = fl.x + fl.w / 2, cy = fl.y + fl.h / 2;
        fl.cv = transforma(fl.cv, fel); fl.w = fl.cv.width; fl.h = fl.cv.height;
        fl.x = Math.round(cx - fl.w / 2); fl.y = Math.round(cy - fl.h / 2);
        randeazaFlotant(); schimbat();
      } else inlocuiesteTot((c) => transforma(c, fel));
    }
    function trunchiaza() {
      fixeazaText(); fixeazaForma();
      if (!fl) return toast('Trunchiere: selectați mai întâi zona care trebuie să rămână.');
      coaceFlotant(); randeazaFlotant();
      const r = { x: fl.x, y: fl.y, w: fl.w, h: fl.h };
      fixeazaFlotant();
      inlocuiesteTot((c, i) => { const n = canvasNou(r.w, r.h), g = n.getContext('2d'); if (i === 0) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, r.w, r.h); } g.drawImage(c, -r.x, -r.y); return n; });
    }
    function redimPanza(w, hh) {
      w = clamp(Math.round(w), 1, MAX_LATURA); hh = clamp(Math.round(hh), 1, MAX_LATURA);
      if (w === cv.width && hh === cv.height) return;
      comite();
      inlocuiesteTot((c, i) => { const n = canvasNou(w, hh), g = n.getContext('2d'); if (i === 0) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, hh); } g.drawImage(c, 0, 0); return n; });
    }
    function eliminareFundal() {
      fixeazaText(); fixeazaForma();
      if (fl) {
        coaceFlotant(); pas();
        const n = eliminaFundal(fl.cv);
        randeazaFlotant();
        if (!n) { anulari.pop(); return toast('Nu am găsit un fundal de eliminat în selecție.'); }
        return toast('Fundalul selecției a fost eliminat.');
      }
      pas();
      if (!eliminaFundal(cv)) { anulari.pop(); return toast('Nu am găsit un fundal de eliminat.'); }
      ctx.getImageData(0, 0, 1, 1); // forțează actualizarea pânzei
      schimbat();
      toast('Fundalul a fost eliminat. Zonele transparente apar în carouri.');
    }

    // ----- Forma în lucru (rămâne editabilă până la un clic în afara ei) -----
    let fo = null; // { tip, a, b, c1, c2, grosime, contur, umplere }
    const rectForma = (f) => ({ x: Math.min(f.a.x, f.b.x), y: Math.min(f.a.y, f.b.y), w: Math.abs(f.b.x - f.a.x), h: Math.abs(f.b.y - f.a.y) });
    function deseneazaFormaObj(g, f) {
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = f.grosime;
      const contur = stilEfect(g, f.c1, f.contur === 'fara' ? 'unic' : f.contur);
      if (f.tip === 'linie') {
        g.globalAlpha = contur.alfa; g.strokeStyle = contur.stil;
        g.beginPath(); g.moveTo(f.a.x, f.a.y); g.lineTo(f.b.x, f.b.y); g.stroke(); g.restore();
        return;
      }
      const r = rectForma(f), cale = caleForma(f.tip, r.x, r.y, r.w, r.h);
      if (f.umplere !== 'fara') { const u = stilEfect(g, f.c2, f.umplere); g.globalAlpha = u.alfa; g.fillStyle = u.stil; g.fill(cale); }
      if (f.contur !== 'fara') { g.globalAlpha = contur.alfa; g.strokeStyle = contur.stil; g.stroke(cale); }
      g.restore();
    }
    function randeazaForma(curata = true) {
      if (!fo) { if (!foEl.hidden) { foEl.hidden = true; if (curata) octx.clearRect(0, 0, ov.width, ov.height); } return; }
      octx.clearRect(0, 0, ov.width, ov.height);
      deseneazaFormaObj(octx, fo);
      const r = rectForma(fo), lin = fo.tip === 'linie', z = S.zoom;
      foEl.hidden = false; foEl.classList.toggle('linie', lin);
      Object.assign(foEl.style, { left: `${r.x * z}px`, top: `${r.y * z}px`, width: `${Math.max(1, r.w * z)}px`, height: `${Math.max(1, r.h * z)}px` });
      if (lin) {
        const [p1, p2] = foEl.querySelectorAll('.m-p1, .m-p2');
        Object.assign(p1.style, { left: `${(fo.a.x - r.x) * z}px`, top: `${(fo.a.y - r.y) * z}px` });
        Object.assign(p2.style, { left: `${(fo.b.x - r.x) * z}px`, top: `${(fo.b.y - r.y) * z}px` });
      }
      stareSel.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}px`;
    }
    function fixeazaForma() {
      if (!fo) return;
      const f = fo; fo = null; randeazaForma();
      pas(); deseneazaFormaObj(ctx, f); schimbat();
    }
    // Când se schimbă culorile, grosimea sau stilul, se actualizează forma și textul încă nefixate
    function stilModificat() {
      if (fo) { Object.assign(fo, { c1: S.c1, c2: S.c2, grosime: S.grosime, contur: S.contur, umplere: S.umplere }); randeazaForma(); }
      stilText();
      actualizeazaUI();
    }
    foEl.addEventListener('pointerdown', (e) => {
      if (!fo || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const d = e.target.dataset.d, a0 = { ...fo.a }, b0 = { ...fo.b }, r0 = rectForma(fo);
      trage(foEl, e, (dx, dy, ev) => {
        if (d === 'p1') fo.a = { x: a0.x + dx, y: a0.y + dy };
        else if (d === 'p2') fo.b = { x: b0.x + dx, y: b0.y + dy };
        else if (d) { const r = redimRect(r0, d, dx, dy, ev.shiftKey); fo.a = { x: r.x, y: r.y }; fo.b = { x: r.x + r.w, y: r.y + r.h }; }
        else { fo.a = { x: a0.x + dx, y: a0.y + dy }; fo.b = { x: b0.x + dx, y: b0.y + dy }; }
        randeazaForma();
      }, () => { S.modificat = true; actualizeazaTitlu(); });
    });

    // ----- Text (caseta rămâne editabilă până la un clic în afara ei) -----
    let tx = null; // { el, box, x, y, w, h }
    const fontCss = (z = 1) => `${S.cursiv ? 'italic ' : ''}${S.aldin ? 'bold ' : ''}${S.marime * z}px ${FONTURI[S.font] || 'sans-serif'}`;
    // Rândurile textului exact cum le împarte caseta (măsurate cu o copie ascunsă a casetei)
    function liniiText(t) {
      const val = t.el.value, m = h('div');
      m.style.cssText = `position:absolute;left:-10000px;top:0;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;word-break:break-word;padding:0;margin:0;border:0;width:${t.w}px;font:${fontCss(1)};line-height:${S.marime * 1.2}px`;
      const tn = document.createTextNode(val); m.append(tn); document.body.append(m);
      const r = document.createRange(), linii = [];
      let cur = '', sus = null;
      for (let i = 0; i < val.length; i++) {
        const ch = val[i];
        if (ch === '\n') { linii.push(cur); cur = ''; sus = null; continue; }
        r.setStart(tn, i); r.setEnd(tn, i + 1);
        const rc = r.getClientRects(), t0 = rc.length ? rc[rc.length - 1].top : sus;
        if (sus !== null && t0 !== null && t0 > sus + 1) { linii.push(cur); cur = ''; }
        sus = t0; cur += ch;
      }
      linii.push(cur); m.remove();
      return linii;
    }
    function deseneazaText(g, t) {
      const text = t.el.value, lh = S.marime * 1.2;
      if (!text.trim() && !S.opac) return;
      const linii = liniiText(t);
      g.save(); g.font = fontCss(1); g.textBaseline = 'middle';
      if (S.opac) { g.fillStyle = S.c2; g.fillRect(t.x, t.y, t.w, Math.max(t.h, linii.length * lh)); }
      g.fillStyle = S.c1;
      linii.forEach((l, i) => {
        const yy = t.y + i * lh, w = g.measureText(l.replace(/\s+$/, '')).width;
        g.fillText(l, t.x, yy + lh / 2);
        const gr = Math.max(1, S.marime / 14);
        if (S.subliniat && w) g.fillRect(t.x, yy + lh / 2 + S.marime * 0.42, w, gr);
        if (S.taiat && w) g.fillRect(t.x, yy + lh / 2 + S.marime * 0.02, w, gr);
      });
      g.restore();
    }
    function creeazaText(x, y, w, hh) {
      const el = h('textarea', { class: 'ap-desen-text', spellcheck: 'false', 'aria-label': 'Scrieți textul; faceți clic în afara casetei ca să-l fixați' });
      const box = h('div', { class: 'ap-desen-txbox' }, el, manereCutie());
      w = Math.max(20, Math.min(w ?? Math.max(160, S.marime * 7), cv.width - x));
      tx = { el, box, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(Math.max(hh ?? 0, S.marime * 1.2)) };
      el.addEventListener('input', () => { potrivesteText(); S.modificat = true; actualizeazaTitlu(); });
      el.addEventListener('keydown', (e) => {
        const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fixeazaText(); return; }
        if (ctrl && ['b', 'i', 'u'].includes(k)) { e.preventDefault(); e.stopPropagation(); const c = { b: 'aldin', i: 'cursiv', u: 'subliniat' }[k]; S[c] = !S[c]; stilModificat(); }
      });
      box.addEventListener('pointerdown', (e) => {
        if (!tx || e.target === el) return;
        const d = e.target.dataset.d, r0 = { x: tx.x, y: tx.y, w: tx.w, h: tx.h };
        trage(box, e, (dx, dy) => {
          if (d) { const r = redimRect(r0, d, dx, dy, false); Object.assign(tx, { x: Math.round(r.x), y: Math.round(r.y), w: Math.max(20, Math.round(r.w)), h: Math.round(r.h) }); }
          else { tx.x = Math.round(r0.x + dx); tx.y = Math.round(r0.y + dy); }
          stilText();
        }, () => el.focus({ preventScroll: true }));
      });
      pagina.append(box); stilText();
      if (S.aspect === 'clasic') { S.fila = 'text'; asezaGrupuri(); }
      actualizeazaUI();
      el.focus({ preventScroll: true });
      setTimeout(() => { if (tx?.el === el) el.focus({ preventScroll: true }); }, 0);
    }
    function stilText() {
      if (!tx) return;
      const z = S.zoom;
      Object.assign(tx.el.style, { font: fontCss(z), lineHeight: `${S.marime * 1.2 * z}px`, color: S.c1, background: S.opac ? S.c2 : 'transparent', textDecoration: [S.subliniat && 'underline', S.taiat && 'line-through'].filter(Boolean).join(' ') || 'none', width: `${tx.w * z}px` });
      Object.assign(tx.box.style, { left: `${tx.x * z}px`, top: `${tx.y * z}px` });
      potrivesteText();
    }
    function potrivesteText() {
      if (!tx) return;
      tx.el.style.height = '0px';
      const hh = Math.max(tx.h * S.zoom, tx.el.scrollHeight);
      tx.el.style.height = `${hh}px`;
    }
    function fixeazaText() {
      if (!tx) return;
      const t = tx;
      if (t.el.value.trim() || (S.opac && t.el.value)) { pas(); deseneazaText(ctx, t); }
      tx = null; t.box.remove();
      if (S.fila === 'text') { S.fila = 'pornire'; asezaGrupuri(); }
      schimbatUsor();
    }
    const schimbatUsor = () => { actualizeazaUI(); if (S.modificat) { clearTimeout(tCiorna); tCiorna = setTimeout(salveazaCiorna, 1500); } };

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
      ctx.save();
      if (activ > 0) ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = S.c2;
      for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
      ctx.restore();
    }
    const PE_STRAT = { marker: 0.5, acuarela: 0.35 }; // pensule transparente: urma se adună pe stratul de previzualizare
    function segmentPensula(g, a, b, col) {
      const s = S.grosime, p = S.pensula;
      if (p === 'caligrafie' || p === 'caligrafie2') {
        const w = Math.max(2, s * 1.5), dx = w * 0.7, dy = p === 'caligrafie' ? -w * 0.7 : w * 0.7;
        g.fillStyle = col; g.strokeStyle = col;
        g.beginPath(); g.moveTo(a.x + dx, a.y + dy); g.lineTo(a.x - dx, a.y - dy); g.lineTo(b.x - dx, b.y - dy); g.lineTo(b.x + dx, b.y + dy); g.closePath(); g.fill();
        g.lineWidth = 1.2; g.beginPath(); g.moveTo(b.x + dx, b.y + dy); g.lineTo(b.x - dx, b.y - dy); g.stroke();
        return;
      }
      g.lineCap = 'round'; g.lineJoin = 'round';
      const lat = { marker: s * 2 + 4, acuarela: s * 2.5 + 4, ulei: s * 1.6 + 1, cerat: s * 1.4 + 1, natural: Math.max(1, s * 0.6) }[p] || s;
      g.lineWidth = lat;
      g.strokeStyle = ['ulei', 'cerat', 'natural'].includes(p) ? g.createPattern(textura(col, p), 'repeat') : col;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x + 0.01, b.y); g.stroke();
    }
    function pulverizeaza(p, col) {
      const r = Math.max(5, S.grosime * 2.5), n = Math.ceil(r * 0.9);
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d), 1, 1);
      }
    }
    // Shift: linie orizontală/verticală/la 45°, pătrat, cerc
    function constrange(tip, a, b, shift) {
      if (!shift) return b;
      if (tip === 'linie') {
        const ang = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(b.x - a.x, b.y - a.y);
        return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d };
      }
      const m = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      return { x: a.x + Math.sign(b.x - a.x || 1) * m, y: a.y + Math.sign(b.y - a.y || 1) * m };
    }
    const furnicute = (g, desen) => { // conturul punctat alb-negru al selecției
      g.save(); g.lineWidth = 1 / S.zoom; g.setLineDash([4 / S.zoom, 3 / S.zoom]);
      g.strokeStyle = '#000'; desen(g); g.strokeStyle = '#fff'; g.lineDashOffset = 3.5 / S.zoom; desen(g);
      g.restore();
    };

    // Operația în curs (o tragere cu mouse-ul sau cu degetul)
    let op = null;
    function incepe(p, sec, e) {
      const u = S.unealta, col = sec ? S.c2 : S.c1;
      if (tx) { fixeazaText(); if (u === 'text') return; }
      if (fo) fixeazaForma();
      if (fl && u !== 'selectare') fixeazaFlotant();
      if (u === 'creion' || u === 'radiera' || u === 'pensula') {
        pas();
        let ultim = p;
        const peStrat = u === 'pensula' && PE_STRAT[S.pensula];
        const deseneaza = (a, b) => {
          if (u === 'creion') { ctx.fillStyle = col; linieCreion(ctx, a.x, a.y, b.x, b.y, S.grosime); }
          else if (u === 'radiera') linieRadiera(a, b);
          else if (S.pensula === 'aerograf') pulverizeaza(b, col);
          else segmentPensula(peStrat ? octx : ctx, a, b, col);
        };
        if (peStrat) { octx.clearRect(0, 0, ov.width, ov.height); ov.style.opacity = String(peStrat); }
        deseneaza(p, p);
        let raf = 0;
        if (u === 'pensula' && S.pensula === 'aerograf') { const bucla = () => { pulverizeaza(ultim, col); raf = requestAnimationFrame(bucla); }; raf = requestAnimationFrame(bucla); }
        op = {
          muta(q) { deseneaza(ultim, q); ultim = q; },
          gata() {
            cancelAnimationFrame(raf);
            if (peStrat) { ctx.save(); ctx.globalAlpha = peStrat; ctx.drawImage(ov, 0, 0); ctx.restore(); octx.clearRect(0, 0, ov.width, ov.height); ov.style.opacity = ''; }
            schimbat();
          },
          anuleaza() { cancelAnimationFrame(raf); octx.clearRect(0, 0, ov.width, ov.height); ov.style.opacity = ''; restaurareStare(anulari.pop()); },
        };
      } else if (u === 'forma') {
        let ultim = p, shift = e.shiftKey;
        const obj = () => ({ tip: S.forma, a: { ...p }, b: constrange(S.forma, p, ultim, shift), c1: sec ? S.c2 : S.c1, c2: sec ? S.c1 : S.c2, grosime: S.grosime, contur: S.contur, umplere: S.umplere });
        op = {
          muta(q, ev) { ultim = q; shift = ev.shiftKey; octx.clearRect(0, 0, ov.width, ov.height); deseneazaFormaObj(octx, obj()); const r = rectForma(obj()); stareSel.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}px`; },
          gata() {
            octx.clearRect(0, 0, ov.width, ov.height);
            if (Math.hypot(ultim.x - p.x, ultim.y - p.y) < 2) return;
            fo = obj(); randeazaForma(); S.modificat = true; actualizeazaTitlu(); actualizeazaUI();
          },
          anuleaza() { octx.clearRect(0, 0, ov.width, ov.height); },
        };
      } else if (u === 'selectare' && S.selFel === 'liber') {
        fixeazaFlotant();
        const pct = [p];
        const cale = () => { const c = new Path2D(); pct.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); return c; };
        op = {
          muta(q) {
            pct.push({ x: clamp(q.x, 0, cv.width), y: clamp(q.y, 0, cv.height) });
            octx.clearRect(0, 0, ov.width, ov.height);
            furnicute(octx, (g) => { g.beginPath(); pct.forEach((t, i) => (i ? g.lineTo(t.x, t.y) : g.moveTo(t.x, t.y))); g.stroke(); });
          },
          gata() {
            octx.clearRect(0, 0, ov.width, ov.height);
            if (pct.length < 3) return;
            const xs = pct.map((t) => t.x), ys = pct.map((t) => t.y), x = Math.min(...xs), y = Math.min(...ys);
            ridica(x, y, Math.max(...xs) - x + 1, Math.max(...ys) - y + 1, cale());
          },
          anuleaza() { octx.clearRect(0, 0, ov.width, ov.height); },
        };
      } else if (u === 'selectare') {
        fixeazaFlotant();
        let ultim = p;
        const dr = () => {
          const x = clamp(Math.min(p.x, ultim.x), 0, cv.width), y = clamp(Math.min(p.y, ultim.y), 0, cv.height);
          return { x: Math.round(x), y: Math.round(y), w: Math.round(clamp(Math.max(p.x, ultim.x), 0, cv.width) - x), h: Math.round(clamp(Math.max(p.y, ultim.y), 0, cv.height) - y) };
        };
        op = {
          muta(q) {
            ultim = q; const r = dr();
            octx.clearRect(0, 0, ov.width, ov.height);
            furnicute(octx, (g) => g.strokeRect(r.x + 0.5 / S.zoom, r.y + 0.5 / S.zoom, r.w, r.h));
            stareSel.textContent = `${r.w} × ${r.h}px`;
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
          const d = compozit(false).getContext('2d').getImageData(x, y, 1, 1).data, c = rgbHex(d[0], d[1], d[2]);
          if (sec) S.c2 = c; else S.c1 = c;
          setUnealta(S.unealtaAnt);
        }
      } else if (u === 'text') {
        let ultim = p;
        op = {
          muta(q) { ultim = q; octx.clearRect(0, 0, ov.width, ov.height); furnicute(octx, (g) => g.strokeRect(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.abs(q.x - p.x), Math.abs(q.y - p.y))); },
          gata() {
            octx.clearRect(0, 0, ov.width, ov.height);
            const w = Math.abs(ultim.x - p.x), hh = Math.abs(ultim.y - p.y);
            if (w > 12 && hh > 8) creeazaText(Math.min(p.x, ultim.x), Math.min(p.y, ultim.y), w, hh); else creeazaText(p.x, p.y);
          },
          anuleaza() { octx.clearRect(0, 0, ov.width, ov.height); },
        };
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
      inchideMeniu();
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
      const inauntru = p.x >= 0 && p.y >= 0 && p.x < cv.width && p.y < cv.height;
      stareCursor.textContent = inauntru ? `${Math.floor(p.x)}, ${Math.floor(p.y)}px` : '';
      cursorImg = inauntru ? p : null;
      if (S.rigle) deseneazaRigle();
      if (op && e.pointerId === opId) {
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) op.muta(pozitie(ev), ev);
      } else if (!op && S.unealta === 'radiera' && e.pointerType === 'mouse') { // conturul radierei
        const s = marimeRadiera();
        octx.clearRect(0, 0, ov.width, ov.height);
        octx.strokeStyle = '#000'; octx.lineWidth = 1 / S.zoom; octx.fillStyle = 'rgba(255,255,255,.35)';
        octx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
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
    ov.addEventListener('pointerleave', () => {
      if (!op && S.unealta === 'radiera') octx.clearRect(0, 0, ov.width, ov.height);
      stareCursor.textContent = ''; cursorImg = null; if (S.rigle) deseneazaRigle();
    });
    for (const el of [ov, selEl, foEl]) el.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mutarea și redimensionarea selecției
    selEl.addEventListener('pointerdown', (e) => {
      if (!fl || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const d = e.target.dataset.d, r0 = { x: fl.x, y: fl.y, w: fl.w, h: fl.h };
      if (!d && (e.ctrlKey || e.metaKey)) { ctx.drawImage(selCv, fl.x, fl.y, fl.w, fl.h); schimbat(); } // lasă o copie în urmă
      trage(selEl, e, (dx, dy, ev) => {
        if (d) { const r = redimRect(r0, d, dx, dy, ev.shiftKey); Object.assign(fl, { x: Math.round(r.x), y: Math.round(r.y), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) }); }
        else { fl.x = Math.round(r0.x + dx); fl.y = Math.round(r0.y + dy); }
        pozFlotant();
      }, () => { if (d) { coaceFlotant(); randeazaFlotant(); } schimbat(); });
    });

    // Mânerele pânzei: trage ca s-o faci mai mare sau mai mică
    for (const m of manere) m.addEventListener('pointerdown', (e) => {
      const d = m.dataset.d, w0 = cv.width, h0 = cv.height;
      let w = w0, hh = h0;
      pzContur.hidden = false;
      const muta = (dx, dy) => {
        if (d !== 's') w = clamp(Math.round(w0 + dx), 1, MAX_LATURA);
        if (d !== 'e') hh = clamp(Math.round(h0 + dy), 1, MAX_LATURA);
        pzContur.style.width = `${w * S.zoom}px`; pzContur.style.height = `${hh * S.zoom}px`;
        stareDim.textContent = `${w} × ${hh}px`;
      };
      muta(0, 0);
      trage(m, e, muta, () => { pzContur.hidden = true; redimPanza(w, hh); stare(); });
    });

    scena.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(S.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX, y: e.clientY });
    }, { passive: false, signal: ac.signal });
    scena.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); scena.classList.add('peste'); } });
    scena.addEventListener('dragleave', () => scena.classList.remove('peste'));
    scena.addEventListener('drop', (e) => { e.preventDefault(); scena.classList.remove('peste'); insereazaImagine(e.dataTransfer.files[0]); });
    scena.addEventListener('pointerdown', (e) => { // clic pe zona gri din jurul foii: fixează ce era în lucru
      if (e.target !== scena) return;
      inchideMeniu(); comite();
    });

    // ---------- Interfața ----------
    const radacina = h('div', { class: 'ap-desen clasic' });
    const toasturi = h('div', { class: 'ap-desen-toasturi' });
    const toast = (text, tip = '') => {
      const t = h('div', { class: `ap-desen-toast ${tip}`, role: 'status' }, text);
      toasturi.append(t);
      setTimeout(() => t.classList.add('dispare'), 3200);
      setTimeout(() => t.remove(), 3800);
    };
    // Sfaturile (tooltip) ca în Paint: titlul cu tastele, apoi ce face comanda
    const tipAttr = (tip, desc) => ({ 'data-tip': tip, 'data-desc': desc || null, 'aria-label': tip.replace(/ \([^)]*\)$/, '') });
    const sfat = h('div', { class: 'ap-desen-sfat', role: 'tooltip', hidden: true });
    let tSfat = 0, tintaSfat = null;
    const ascundeSfat = () => { clearTimeout(tSfat); sfat.hidden = true; };
    radacina.addEventListener('pointerover', (e) => {
      const t = e.target.closest?.('[data-tip]');
      if (t === tintaSfat) return;
      tintaSfat = t; ascundeSfat();
      if (!t || e.pointerType === 'touch') return;
      tSfat = setTimeout(() => {
        if (!t.isConnected || meniuri.length || modale.length || op) return;
        sfat.replaceChildren(h('b', {}, t.dataset.tip), t.dataset.desc ? h('p', {}, t.dataset.desc) : null);
        sfat.hidden = false;
        const r = t.getBoundingClientRect(), sr = sfat.getBoundingClientRect();
        sfat.style.left = `${clamp(r.left, 4, window.innerWidth - sr.width - 4)}px`;
        sfat.style.top = `${r.bottom + sr.height + 10 > window.innerHeight ? r.top - sr.height - 6 : r.bottom + 6}px`;
      }, 650);
    });
    radacina.addEventListener('pointerdown', ascundeSfat, true);
    radacina.addEventListener('pointerleave', () => { tintaSfat = null; ascundeSfat(); });

    // ----- Meniuri derulante (cu submeniuri), poziționate fix -----
    const meniuri = [];
    function inchideMeniu(nivel = 0) {
      while (meniuri.length > nivel) { const m = meniuri.pop(); m.el.remove(); m.btn?.setAttribute('aria-expanded', 'false'); m.btn?.classList.remove('deschis'); }
    }
    function deschideMeniu(btn, continut, { nivel = 0, cls = '' } = {}) {
      const era = meniuri[nivel]?.btn === btn;
      inchideMeniu(nivel);
      if (era) return;
      ascundeSfat();
      const el = h('div', { class: `ap-desen-meniu ${cls}`, role: 'menu' }, continut());
      radacina.append(el);
      const r = btn.getBoundingClientRect(), rr = el.getBoundingClientRect();
      if (nivel > 0) {
        el.style.left = `${r.right + rr.width > window.innerWidth - 4 ? Math.max(4, r.left - rr.width + 2) : r.right - 2}px`;
        el.style.top = `${clamp(r.top - 4, 4, window.innerHeight - rr.height - 4)}px`;
      } else {
        el.style.left = `${clamp(r.left, 4, window.innerWidth - rr.width - 4)}px`;
        el.style.top = `${r.bottom + rr.height + 4 > window.innerHeight ? Math.max(4, r.top - rr.height - 2) : r.bottom + 1}px`;
      }
      btn.setAttribute('aria-expanded', 'true'); btn.classList.add('deschis');
      meniuri.push({ el, btn });
      if (nivel === 0) el.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    }
    const articol = (text, fn, { kbd, bifat, icoana, dezactivat, sub } = {}) => {
      const b = h('button', { type: 'button', role: bifat == null ? 'menuitem' : 'menuitemcheckbox', 'aria-checked': bifat == null ? null : String(!!bifat), disabled: dezactivat || null, class: sub ? 'are-sub' : null },
        h('span', { class: 'bif' }, bifat ? '✓' : ''), icoana ? (typeof icoana === 'string' ? ico(icoana) : icoana) : h('span', { class: 'ap-desen-ico' }),
        h('span', { class: 'txt' }, text), kbd ? h('kbd', {}, kbd) : sub ? ico('sageataDr') : null);
      const nivelMeu = () => meniuri.findIndex((m) => m.el.contains(b));
      const deschideSub = () => { const n = nivelMeu(); if (meniuri[n + 1]?.btn !== b) deschideMeniu(b, sub, { nivel: n + 1 }); };
      b.addEventListener('pointerenter', () => { if (sub) deschideSub(); else { const n = nivelMeu(); if (n >= 0) inchideMeniu(n + 1); } });
      b.addEventListener('click', () => { if (sub) { deschideSub(); meniuri[meniuri.length - 1]?.el.querySelector('button:not(:disabled)')?.focus(); } else { inchideMeniu(); fn(); } });
      return b;
    };
    const sep = () => h('hr');
    const antet = (t) => h('div', { class: 'ap-desen-meniu-antet' }, t);
    document.addEventListener('pointerdown', (e) => {
      if (meniuri.length && !meniuri.some((m) => m.el.contains(e.target)) && !meniuri[0].btn?.contains(e.target)) inchideMeniu();
    }, sig);

    // ----- Ferestre de dialog (ca în Windows: bară de titlu, butoane jos, se pot muta) -----
    const modale = [];
    function dialog(titlu, corp, butoane, { cls = '', laDeschidere } = {}) {
      return new Promise((res) => {
        let gata = false;
        const inchide = (v) => { if (gata) return; gata = true; fundal.remove(); modale.splice(modale.indexOf(fundal), 1); res(v); };
        const btns = butoane.map(([text, val, c]) => h('button', { type: 'button', class: `ap-desen-btn ${c || ''}`, onclick: async () => { const r = typeof val === 'function' ? await val() : val; if (r !== false) inchide(r); } }, text));
        const bara = h('div', { class: 'ap-desen-dlg-titlu' }, h('span', {}, titlu), h('button', { type: 'button', class: 'ap-desen-dlg-x', 'aria-label': 'Închidere', onclick: () => inchide(null) }, ico('iesire')));
        const dlg = h('div', { class: `ap-desen-dlg ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu }, bara, h('div', { class: 'ap-desen-dlg-corp' }, corp), btns.length ? h('div', { class: 'ap-desen-dlg-btn' }, btns) : null);
        const fundal = h('div', { class: 'ap-desen-modal' }, dlg);
        let dx = 0, dy = 0;
        bara.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button')) return;
          e.preventDefault(); bara.setPointerCapture(e.pointerId);
          const sx = e.clientX - dx, sy = e.clientY - dy;
          const muta = (ev) => { dx = ev.clientX - sx; dy = ev.clientY - sy; dlg.style.transform = `translate(${dx}px, ${dy}px)`; };
          const stop = () => { bara.removeEventListener('pointermove', muta); bara.removeEventListener('pointerup', stop); };
          bara.addEventListener('pointermove', muta); bara.addEventListener('pointerup', stop);
        });
        fundal.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Escape') inchide(null);
          else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); btns.find((b) => b.classList.contains('prim'))?.click(); }
        });
        fundal.addEventListener('pointerdown', (e) => { if (e.target === fundal) { dlg.classList.remove('clipeste'); void dlg.offsetWidth; dlg.classList.add('clipeste'); } });
        radacina.append(fundal); modale.push(fundal);
        inchideMeniu(); ascundeSfat();
        laDeschidere?.(inchide);
        const f = fundal.querySelector('.ap-desen-dlg-corp input:not([type=range]):not([type=checkbox]):not([type=radio]), .ap-desen-dlg-corp select') || btns.find((b) => b.classList.contains('prim')) || btns[0];
        f?.focus();
        if (f?.tagName === 'INPUT' && f.type === 'text') f.select();
      });
    }
    const ICO_MESAJ = {
      intrebare: '<circle cx="16" cy="16" r="14" fill="#1e73d2"/><path d="M12 12.5a4 4 0 1 1 5.6 3.7c-1 .5-1.6 1.2-1.6 2.3v1" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="16" cy="24" r="1.7" fill="#fff"/>',
      avert: '<path d="M16 3L30 28H2z" fill="#ffc83d" stroke="#c78c00" stroke-width="1"/><path d="M16 11v9" stroke="#222" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="24" r="1.7" fill="#222"/>',
      eroare: '<circle cx="16" cy="16" r="14" fill="#e81123"/><path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>',
      info: '<circle cx="16" cy="16" r="14" fill="#1e73d2"/><path d="M16 14v9" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="9.5" r="1.8" fill="#fff"/>',
    };
    const mesaj = (titlu, text, butoane, tip = 'info') => dialog(titlu, h('div', { class: 'ap-desen-msg' },
      h('span', { class: 'ap-desen-msg-ico', 'aria-hidden': 'true', html: `<svg viewBox="0 0 32 32">${ICO_MESAJ[tip]}</svg>` }), h('p', {}, text)), butoane, { cls: 'msg' });
    const nr = (v, min, max, pas_ = '1') => h('input', { type: 'number', min, max, step: pas_, value: String(v), inputmode: 'decimal' });
    const etc = (eticheta, input, ico_) => h('label', { class: 'ap-desen-camp' }, ico_ || null, h('span', {}, eticheta), input);
    const radio = (nume, val, text, bifat, fn) => h('label', { class: 'ap-desen-radio' }, h('input', { type: 'radio', name: nume, value: val, checked: bifat || null, onchange: fn }), h('span', {}, text));
    const fieldset = (legenda, ...c) => h('fieldset', { class: 'ap-desen-fs' }, h('legend', {}, legenda), c);

    // ----- Bara de titlu (ca fereastra Paint) -----
    const titluEl = h('span', { class: 'ap-desen-titlu-text' });
    function actualizeazaTitlu() {
      titluEl.textContent = `${numeAfisat()} – Paint`;
      document.title = `${numeAfisat()} – Paint – edudigi`;
    }
    const butoaneAnul = [], butoaneRef = [];
    const qat = (k, tip, fn, lista) => { const b = h('button', { type: 'button', class: 'ap-desen-qat', ...tipAttr(tip), onclick: fn }, ico(k)); lista?.push(b); return b; };
    const linkInapoi = h('a', { class: 'ap-desen-inapoi', href: '#/aplicatii', ...tipAttr('Înapoi la Aplicații', 'Închide Paint și revine la lista de aplicații.'), onclick: (e) => { e.preventDefault(); iesire(); } }, '← Aplicații');
    const fb = (cls, tip, cale, fn) => h('button', { type: 'button', class: `ap-desen-fb ${cls}`, 'aria-label': tip, 'data-tip': tip, onclick: fn }, h('span', { class: 'ap-desen-ico', 'aria-hidden': 'true', html: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1">${cale}</svg>` }));
    const baraTitlu = h('div', { class: 'ap-desen-titlu' },
      linkInapoi, h('span', { class: 'ap-desen-sigla' }, ico('paint')),
      h('div', { class: 'ap-desen-qatbar' }, qat('salvare', 'Salvare (Ctrl+S)', () => salveaza(false)), qat('anulare', 'Anulare (Ctrl+Z)', () => anuleaza(), butoaneAnul), qat('refacere', 'Refacere (Ctrl+Y)', () => reface(), butoaneRef)),
      titluEl,
      h('div', { class: 'ap-desen-fereastra' },
        fb('min', 'Minimizare', '<path d="M5 10.5h10"/>', () => toast('Paint rulează în browser, așa că fereastra lui nu se poate minimiza.')),
        fb('max', 'Maximizare (ecran complet)', '<rect x="5.5" y="5.5" width="9" height="9"/>', ecranComplet),
        fb('x', 'Închidere', '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>', iesire)));

    // ----- Elemente comune ale panglicii (aceleași grupuri apar în ambele aspecte) -----
    const grup = (eticheta, cls, ...c) => h('div', { class: `ap-desen-grup ${cls || ''}`, role: 'group', 'aria-label': eticheta }, h('div', { class: 'ap-desen-grup-c' }, c), h('div', { class: 'ap-desen-grup-e' }, eticheta));
    const mare = (k, text, tip, desc, fn) => h('button', { type: 'button', class: 'ap-desen-mare', ...tipAttr(tip, desc), onclick: fn }, ico(k, 'ap-desen-ico mare'), h('span', {}, text));
    const mic = (k, text, tip, desc, fn) => h('button', { type: 'button', class: 'ap-desen-mic', ...tipAttr(tip, desc), onclick: fn }, ico(k), h('span', { class: 'et' }, text));
    // Buton mare împărțit: sus comanda, jos eticheta cu săgeată (deschide meniul)
    function despartit(k, text, tip, desc, fn, meniu, apasat) {
      const sus = h('button', { type: 'button', class: 'ap-desen-sp-sus', ...tipAttr(tip, desc), onclick: fn, 'aria-pressed': apasat ? 'false' : null }, ico(k, 'ap-desen-ico mare'));
      const jos = h('button', { type: 'button', class: 'ap-desen-sp-jos', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-tip': tip, 'data-desc': desc }, h('span', {}, text), ico('sageataJos'));
      jos.addEventListener('click', () => deschideMeniu(jos, meniu));
      return { el: h('div', { class: 'ap-desen-sp' }, sus, jos), sus, jos };
    }

    // Clipboard
    const lipireDin = async () => insereazaImagine(await alegeFisier('image/*'));
    const meniuLipire = () => [articol('Lipire', lipeste, { kbd: 'Ctrl+V', icoana: 'lipire' }), articol('Lipire din', lipireDin, { icoana: 'import' })];
    const spLipire = despartit('lipire', 'Lipire', 'Lipire (Ctrl+V)', 'Lipiți conținutul din Clipboard.', () => lipeste(), meniuLipire);
    const btnDecupare = mic('decupare', 'Decupare', 'Decupare (Ctrl+X)', 'Decupați selecția de pe pânză și puneți-o în Clipboard.', decupeaza);
    const btnCopiere = mic('copiere', 'Copiere', 'Copiere (Ctrl+C)', 'Copiați selecția de pe pânză și puneți-o în Clipboard.', copiaza);
    const btnClipColaps = h('button', { type: 'button', class: 'ap-desen-mare colaps', ...tipAttr('Clipboard'), 'aria-haspopup': 'menu' }, ico('lipire', 'ap-desen-ico mare'), h('span', {}, 'Clipboard ▾'));
    btnClipColaps.addEventListener('click', () => deschideMeniu(btnClipColaps, () => [...meniuLipire(), sep(), articol('Decupare', decupeaza, { kbd: 'Ctrl+X', icoana: 'decupare', dezactivat: !fl }), articol('Copiere', copiaza, { kbd: 'Ctrl+C', icoana: 'copiere', dezactivat: !fl })]));
    const gClip = grup('Clipboard', 'clip', btnClipColaps, h('div', { class: 'ap-desen-clip-plin' }, spLipire.el, h('div', { class: 'ap-desen-stiva' }, btnDecupare, btnCopiere)));

    // Imagine
    const meniuSelectare = () => [
      antet('Forme de selecție'),
      articol('Selecție dreptunghiulară', () => { S.selFel = 'drept'; setUnealta('selectare'); }, { icoana: 'selectare', bifat: S.selFel === 'drept' }),
      articol('Selecție formă liberă', () => { S.selFel = 'liber'; setUnealta('selectare'); }, { icoana: 'selLiber', bifat: S.selFel === 'liber' }),
      antet('Opțiuni de selecție'),
      articol('Selectare totală', selecteazaTot, { kbd: 'Ctrl+A' }),
      articol('Inversare selecție', inverseazaSelectia),
      articol('Ștergere', stergeSelectia, { kbd: 'Delete', dezactivat: !fl }),
      articol('Selecție transparentă', () => { S.transparenta = !S.transparenta; if (fl) randeazaFlotant(); actualizeazaUI(); }, { bifat: S.transparenta }),
    ];
    const spSelectare = despartit('selectare', 'Selectare', 'Selectare', 'Selectați o parte din imagine, ca s-o mutați, s-o copiați sau s-o modificați.', () => setUnealta('selectare'), meniuSelectare, true);
    const btnTrunchiere = mic('trunchiere', 'Trunchiere', 'Trunchiere (Ctrl+Shift+X)', 'Trunchiați imaginea, astfel încât să conțină numai selecția curentă.', trunchiaza);
    const btnRedim = mic('redim', 'Redimensionare', 'Redimensionare și înclinare', 'Redimensionați și înclinați imaginea sau selecția.', () => redimensionare());
    const btnRotire = mic('rotire', 'Rotire', 'Rotire', 'Rotiți sau răsturnați imaginea sau selecția.', null);
    btnRotire.setAttribute('aria-haspopup', 'menu'); btnRotire.querySelector('.et').append(' ▾');
    btnRotire.addEventListener('click', () => deschideMeniu(btnRotire, () => [
      articol('Rotire la dreapta cu 90°', () => roteste('r90'), { icoana: svg('<path d="M15 9.5a5.5 5.5 0 1 1-1.6-3.9"/><path d="M14.5 2.5v3.6h-3.6"/>') }),
      articol('Rotire la stânga cu 90°', () => roteste('r270'), { icoana: svg('<path d="M5 9.5a5.5 5.5 0 1 0 1.6-3.9"/><path d="M5.5 2.5v3.6h3.6"/>') }),
      articol('Rotire cu 180°', () => roteste('r180'), { icoana: 'rotire' }),
      articol('Răsturnare pe verticală', () => roteste('fv'), { icoana: svg('<path d="M3 9h14"/><path d="M6 6l4-3.5L14 6zM6 12l4 3.5 4-3.5z" fill="#e6f2fb"/>') }),
      articol('Răsturnare pe orizontală', () => roteste('fh'), { icoana: svg('<path d="M10 3v14"/><path d="M7 6L3.5 10 7 14zM13 6l3.5 4-3.5 4z" fill="#e6f2fb"/>') }),
    ]));
    const btnFundal = h('button', { type: 'button', class: 'ap-desen-mic w11-doar', ...tipAttr('Eliminare fundal', 'Eliminați fundalul imaginii sau al selecției (devine transparent).'), onclick: eliminareFundal }, ico('fundal'), h('span', { class: 'et' }, 'Eliminare fundal'));
    const gImagine = grup('Imagine', 'imagine', spSelectare.el, h('div', { class: 'ap-desen-stiva' }, btnTrunchiere, btnRedim, btnRotire), h('div', { class: 'ap-desen-stiva w11-doar' }, btnFundal));

    // Instrumente
    const butoaneUnelte = { selectare: spSelectare.sus };
    const btnUnealta = (u, tip, desc, k) => (butoaneUnelte[u] = h('button', { type: 'button', class: 'ap-desen-u', ...tipAttr(tip, desc), 'aria-pressed': 'false', onclick: () => setUnealta(u) }, ico(k)));
    const gUnelte = grup('Instrumente', 'unelte', h('div', { class: 'ap-desen-grila3' },
      btnUnealta('creion', 'Creion', 'Desenați o linie de formă liberă, cu grosimea de linie selectată.', 'creion'),
      btnUnealta('umplere', 'Umplere cu culoare', 'Faceți clic pe o zonă a pânzei, ca s-o umpleți cu Culoarea 1 (clic dreapta: cu Culoarea 2).', 'umplere'),
      btnUnealta('text', 'Text', 'Inserați text în imagine.', 'text'),
      btnUnealta('radiera', 'Radieră', 'Ștergeți o parte a imaginii și înlocuiți-o cu culoarea de fundal (Culoarea 2).', 'radiera'),
      btnUnealta('pipeta', 'Selector de culoare', 'Preluați o culoare din imagine și folosiți-o pentru desen.', 'pipeta'),
      btnUnealta('lupa', 'Lupă', 'Măriți o parte a imaginii (clic dreapta: micșorare).', 'lupa')));

    // Pensule
    const spPensule = despartit('pensula', 'Pensule', 'Pensule', 'Desenați cu diferite pensule.', () => setUnealta('pensula'),
      () => PENSULE.map(([k, t]) => articol(t, () => { S.pensula = k; setUnealta('pensula'); actualizeazaUI(); }, { bifat: S.pensula === k, icoana: icoPensula(k) })), true);
    butoaneUnelte.pensula = spPensule.sus;
    function icoPensula(k) {
      const c = canvasNou(40, 20), g = c.getContext('2d'), old = { p: S.pensula, s: S.grosime };
      S.pensula = k; S.grosime = 3;
      for (let i = 0; i < 12; i++) {
        const a = { x: 4 + i * 2.7, y: 10 + Math.sin(i / 2) * 5 }, b = { x: 4 + (i + 1) * 2.7, y: 10 + Math.sin((i + 1) / 2) * 5 };
        if (k === 'aerograf') { for (let j = 0; j < 6; j++) g.fillRect(b.x + (Math.random() - 0.5) * 7, b.y + (Math.random() - 0.5) * 7, 1, 1); }
        else { g.save(); g.globalAlpha = PE_STRAT[k] || 1; segmentPensula(g, a, b, '#222222'); g.restore(); }
      }
      S.pensula = old.p; S.grosime = old.s;
      const sp = h('span', { class: 'ap-desen-ico pensula-prev', 'aria-hidden': 'true' }, h('img', { src: c.toDataURL(), alt: '' }));
      return sp;
    }
    const gPensule = grup('Pensule', 'pensule', spPensule.el);

    // Forme
    const butoaneForme = {};
    const formeEl = h('div', { class: 'ap-desen-forme', role: 'listbox', 'aria-label': 'Forme' }, FORME.map(([k, t]) => (butoaneForme[k] = h('button', { type: 'button', class: 'ap-desen-forma', ...tipAttr(t, k === 'linie' ? 'Cu Shift apăsat: linie dreaptă.' : k === 'dreptunghi' ? 'Cu Shift apăsat: pătrat.' : k === 'elipsa' ? 'Cu Shift apăsat: cerc.' : null), 'aria-pressed': 'false', onclick: () => alegeForma(k) }, icoForma(k)))));
    function alegeForma(k) {
      if (fo && fo.tip !== 'linie' && k !== 'linie') { S.forma = k; fo.tip = k; randeazaForma(); actualizeazaUI(); return; } // forma selectată își schimbă tipul
      S.forma = k; setUnealta('forma');
    }
    const icoStil = (k, umplere) => svg(k === 'fara' ? '<rect x="3.5" y="4.5" width="13" height="11" stroke-dasharray="2 2.5"/>' : `<rect x="3.5" y="4.5" width="13" height="11" ${umplere ? `fill="currentColor" fill-opacity="${k === 'unic' ? 1 : 0.5}"` : `stroke-width="${k === 'unic' ? 2.4 : 1.6}"`} ${k === 'unic' ? '' : 'stroke-dasharray="1 1.4"'}/>`);
    const btnContur = h('button', { type: 'button', class: 'ap-desen-mic', ...tipAttr('Contur formă', 'Selectați materialul pentru conturul formei (Culoarea 1).'), 'aria-haspopup': 'menu' });
    const btnUmplere = h('button', { type: 'button', class: 'ap-desen-mic', ...tipAttr('Umplere formă', 'Selectați materialul pentru umplerea formei (Culoarea 2).'), 'aria-haspopup': 'menu' });
    btnContur.addEventListener('click', () => deschideMeniu(btnContur, () => [['fara', 'Fără contur'], ...STILURI].map(([k, t]) => articol(t, () => { S.contur = k; if (k === 'fara' && S.umplere === 'fara') S.umplere = 'unic'; stilModificat(); }, { bifat: S.contur === k, icoana: icoStil(k, false) }))));
    btnUmplere.addEventListener('click', () => deschideMeniu(btnUmplere, () => [['fara', 'Fără umplere'], ...STILURI].map(([k, t]) => articol(t, () => { S.umplere = k; if (k === 'fara' && S.contur === 'fara') S.contur = 'unic'; stilModificat(); }, { bifat: S.umplere === k, icoana: icoStil(k, true) }))));
    const gForme = grup('Forme', 'forme', formeEl, h('div', { class: 'ap-desen-stiva' }, btnContur, btnUmplere));

    // Dimensiune
    const btnGrosime = h('button', { type: 'button', class: 'ap-desen-mare', ...tipAttr('Dimensiune', 'Selectați grosimea liniei pentru instrumentul selectat.'), 'aria-haspopup': 'menu' });
    btnGrosime.addEventListener('click', () => deschideMeniu(btnGrosime, () => GROSIMI.map((g) => {
      const l = h('span', { class: 'ap-desen-linie' }); l.style.height = `${Math.min(g, 24)}px`;
      return articol(`${g}px`, () => { S.grosime = g; stilModificat(); }, { bifat: S.grosime === g, icoana: l });
    }), { cls: 'grosimi' }));
    const gDim = grup('Dimensiune', 'dim', btnGrosime);

    // Culori
    const culoareAct = (n) => h('button', { type: 'button', class: 'ap-desen-culoare-act', ...tipAttr(`Culoarea ${n}`, n === 1 ? 'Culoarea de prim-plan: pentru creion, contururi și text. Faceți clic aici, apoi selectați o culoare din paletă.' : 'Culoarea de fundal: pentru umplerea formelor și urma radierei. Faceți clic aici, apoi selectați o culoare din paletă.'), onclick: () => { S.activa = n; actualizeazaUI(); } }, h('span', { class: 'mostra' }), h('span', { class: 'et' }, `Culoarea ${n}`));
    const c1El = culoareAct(1), c2El = culoareAct(2);
    function setCuloare(n, c) { if (n === 2) S.c2 = c; else S.c1 = c; if (fl && S.transparenta) randeazaFlotant(); stilModificat(); }
    const casuta = (c) => {
      const b = h('button', { type: 'button', class: 'ap-desen-pal', 'data-tip': numeCuloare(c), 'aria-label': numeCuloare(c) });
      b.style.background = c;
      b.addEventListener('click', () => setCuloare(S.activa, c));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); setCuloare(2, c); });
      return b;
    };
    const paletaEl = h('div', { class: 'ap-desen-paleta' });
    function deseneazaPaleta() {
      paletaEl.replaceChildren(...PALETA.map(casuta),
        ...Array.from({ length: 10 }, (_, i) => (particularizate[i] ? casuta(particularizate[i]) : h('span', { class: 'ap-desen-pal gol' }))));
    }
    deseneazaPaleta();
    const btnEditCul = mare('culori', 'Editare culori', 'Editare culori', 'Selectați o culoare din paleta de culori sau creați o culoare nouă din Roșu, Verde și Albastru.', () => editareCulori());
    btnEditCul.classList.add('ec');
    const gCulori = grup('Culori', 'culori', c1El, c2El, paletaEl, btnEditCul);

    // Instrumente text: Font și Fundal
    const selFont = h('select', { 'aria-label': 'Familie de fonturi', 'data-tip': 'Familie de fonturi', onchange: () => { S.font = selFont.value; stilModificat(); tx?.el.focus(); } }, Object.keys(FONTURI).map((f) => h('option', { value: f }, f)));
    const inMarime = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'Dimensiune font', 'data-tip': 'Dimensiune font', list: 'ap-desen-marimi', class: 'marime', onchange: () => { S.marime = clamp(Math.round(Number(String(inMarime.value).replace(',', '.')) || 24), 6, 400); stilModificat(); tx?.el.focus(); } });
    const listaMarimi = h('datalist', { id: 'ap-desen-marimi' }, MARIMI.map((m) => h('option', { value: String(m) })));
    const comutator = (text, cheie, tip, cls) => h('button', { type: 'button', class: `ap-desen-u text ${cls}`, ...tipAttr(tip), 'aria-pressed': 'false', 'data-k': cheie, onclick: () => { S[cheie] = !S[cheie]; stilModificat(); tx?.el.focus(); } }, text);
    const btnB = comutator('B', 'aldin', 'Aldin (Ctrl+B)', 'b'), btnI = comutator('I', 'cursiv', 'Cursiv (Ctrl+I)', 'i'), btnU = comutator('S', 'subliniat', 'Subliniere (Ctrl+U)', 'u'), btnT = comutator('abc', 'taiat', 'Tăiere cu o linie', 't');
    const gFont = grup('Font', 'font', h('div', { class: 'ap-desen-font' }, h('div', {}, selFont, inMarime, listaMarimi), h('div', {}, btnB, btnI, btnU, btnT)));
    const btnOpac = h('button', { type: 'button', class: 'ap-desen-mic', ...tipAttr('Opac', 'Fundalul textului are Culoarea 2.'), onclick: () => { S.opac = true; stilModificat(); tx?.el.focus(); } }, svg('<rect x="3" y="4" width="14" height="12" fill="currentColor" fill-opacity=".25"/><path d="M7 13l3-7 3 7M8.2 11h3.6"/>'), h('span', { class: 'et' }, 'Opac'));
    const btnTransp = h('button', { type: 'button', class: 'ap-desen-mic', ...tipAttr('Transparent', 'Fundalul textului este transparent.'), onclick: () => { S.opac = false; stilModificat(); tx?.el.focus(); } }, svg('<rect x="3" y="4" width="14" height="12" stroke-dasharray="2 2"/><path d="M7 13l3-7 3 7M8.2 11h3.6"/>'), h('span', { class: 'et' }, 'Transparent'));
    const gFundal = grup('Fundal', 'fundal', h('div', { class: 'ap-desen-stiva' }, btnOpac, btnTransp));

    // Vizualizare
    const bife = [];
    const bifa = (text, tip, desc, get, set) => {
      const inp = h('input', { type: 'checkbox', onchange: () => set(inp.checked) });
      bife.push([inp, get]);
      return h('label', { class: 'ap-desen-bifa', ...tipAttr(tip, desc) }, inp, h('span', {}, text));
    };
    const setRigle = (v) => { S.rigle = v; salveazaPref(); actualizeazaUI(); deseneazaRigle(); };
    const setGrila = (v) => { S.grila = v; salveazaPref(); actualizeazaUI(); };
    const setStare = (v) => { S.stareVizibila = v; salveazaPref(); actualizeazaUI(); };
    const gZoom = grup('Panoramare', 'zoom',
      mare('marire', 'Mărire', 'Mărire (Ctrl+PgUp)', 'Măriți imaginea.', () => mareste()),
      mare('micsorare', 'Micșorare', 'Micșorare (Ctrl+PgDn)', 'Micșorați imaginea.', () => micsoreaza()),
      mare('suta', '100%', '100% (Ctrl+0)', 'Afișați imaginea la 100%.', () => setZoom(1)));
    const gAfis = grup('Afișare sau ascundere', 'afis', h('div', { class: 'ap-desen-stiva' },
      bifa('Rigle', 'Rigle (Ctrl+R)', 'Afișați riglele, ca să măsurați și să aliniați obiectele din imagine.', () => S.rigle, setRigle),
      bifa('Liniatură', 'Liniatură (Ctrl+G)', 'Afișați liniile de grilă (pătrățele), ca să aliniați obiectele.', () => S.grila, setGrila),
      bifa('Bară de stare', 'Bară de stare', 'Afișați bara de stare din partea de jos a ferestrei.', () => S.stareVizibila, setStare)));
    const gEcran = grup('Afișare', 'ecran', mare('ecranComplet', 'Ecran complet', 'Ecran complet (F11)', 'Vizualizați imaginea pe tot ecranul.', ecranComplet));
    const gAspect = grup('Aspect', 'aspect', mare('aspect', 'Aspect Windows 11', 'Aspect Windows 11', 'Treceți la aspectul nou din Paint pentru Windows 11: bara compactă, straturi și eliminarea fundalului. Revenire: Vizualizare → Aspect clasic.', () => setAspect('win11')));

    // ----- Aspectul clasic (Windows 10): filele panglicii -----
    const btnFisier = h('button', { type: 'button', class: 'ap-desen-fila fisier', 'aria-haspopup': 'menu', 'aria-expanded': 'false', ...tipAttr('Fișier', 'Creați, deschideți, salvați, tipăriți imaginea și vedeți proprietățile ei.') }, 'Fișier');
    btnFisier.addEventListener('click', meniuFisierClasic);
    const butoaneFile = {};
    const fila = (k, text) => (butoaneFile[k] = h('button', { type: 'button', class: 'ap-desen-fila', role: 'tab', 'aria-selected': 'false', onclick: () => { inchideMeniu(); S.fila = k; asezaGrupuri(); actualizeazaUI(); } }, text));
    const filaText = h('div', { class: 'ap-desen-fila-ctx', hidden: true }, h('span', { class: 'ap-desen-ctx-titlu' }, 'Instrumente text'), fila('text', 'Text'));
    const randFile = h('div', { class: 'ap-desen-file', role: 'tablist' }, btnFisier, fila('pornire', 'Pornire'), fila('vizualizare', 'Vizualizare'), filaText,
      h('span', { class: 'ap-desen-spatiu' }), h('button', { type: 'button', class: 'ap-desen-ajutor', ...tipAttr('Despre Paint'), onclick: () => despre() }, '?'));
    const panglica = h('div', { class: 'ap-desen-panglica', role: 'toolbar', 'aria-label': 'Panglică' });

    // ----- Aspectul Windows 11: meniuri sus și bara compactă -----
    const articoleFisier = () => [
      articol('Nou', nou, { kbd: 'Ctrl+N', icoana: 'nou' }),
      articol('Deschidere', deschide, { kbd: 'Ctrl+O', icoana: 'deschidere' }),
      articol('Import în pânză', null, { icoana: 'import', sub: () => [articol('Din fișier', lipireDin, { icoana: 'deschidere' })] }),
      articol('Imagini recente', null, { icoana: 'recente', sub: () => (recente.length ? recente.slice(0, 9).map((f) => articol(`${f.titlu}.${f.format || 'png'}`, () => deschideRec(f))) : [articol('Nu există imagini recente', () => {}, { dezactivat: true })]) }),
      sep(),
      articol('Salvare', () => salveaza(false), { kbd: 'Ctrl+S', icoana: 'salvare' }),
      articol('Salvare ca', null, { icoana: 'salvareCa', sub: () => Object.keys(FORMATE).map((f) => articol(FORMATE[f][1], () => salvareCa(f))) }),
      sep(),
      articol('Tipărire', null, { icoana: 'tiparire', sub: () => [articol('Tipărire', tipareste, { kbd: 'Ctrl+P' }), articol('Examinare înaintea imprimării', examinare)] }),
      sep(),
      articol('Proprietăți imagine', proprietati, { kbd: 'Ctrl+E', icoana: 'proprietati' }),
      articol('Despre Paint', despre, { icoana: 'despre' }),
      sep(),
      articol('Ieșire', iesire, { icoana: 'iesire' }),
    ];
    const articoleEditare = () => [
      articol('Anulare', anuleaza, { kbd: 'Ctrl+Z', icoana: 'anulare', dezactivat: !anulari.length && !fo }),
      articol('Refacere', reface, { kbd: 'Ctrl+Y', icoana: 'refacere', dezactivat: !refaceri.length }),
      sep(),
      articol('Decupare', decupeaza, { kbd: 'Ctrl+X', icoana: 'decupare', dezactivat: !fl }),
      articol('Copiere', copiaza, { kbd: 'Ctrl+C', icoana: 'copiere', dezactivat: !fl }),
      articol('Lipire', lipeste, { kbd: 'Ctrl+V', icoana: 'lipire' }),
      sep(),
      articol('Selectare totală', selecteazaTot, { kbd: 'Ctrl+A', icoana: 'selectare' }),
      articol('Ștergere selecție', stergeSelectia, { kbd: 'Delete', dezactivat: !fl }),
    ];
    const articoleVizualizare = () => [
      articol('Mărire', () => mareste(), { kbd: 'Ctrl+PgUp', icoana: 'marire' }),
      articol('Micșorare', () => micsoreaza(), { kbd: 'Ctrl+PgDn', icoana: 'micsorare' }),
      articol('Panoramare 100%', () => setZoom(1), { kbd: 'Ctrl+0', icoana: 'suta' }),
      articol('Potrivire în fereastră', potriveste),
      sep(),
      articol('Rigle', () => setRigle(!S.rigle), { kbd: 'Ctrl+R', bifat: S.rigle }),
      articol('Linii de grilă', () => setGrila(!S.grila), { kbd: 'Ctrl+G', bifat: S.grila }),
      articol('Bara de stare', () => setStare(!S.stareVizibila), { bifat: S.stareVizibila }),
      sep(),
      articol('Ecran complet', ecranComplet, { kbd: 'F11', icoana: 'ecranComplet' }),
      sep(),
      articol(S.aspect === 'win11' ? 'Aspect clasic (Windows 10, ca în manual)' : 'Aspect Windows 11 (bara compactă)', () => setAspect(S.aspect === 'win11' ? 'clasic' : 'win11'), { icoana: 'aspect' }),
    ];
    const meniuW11 = (text, articole) => {
      const b = h('button', { type: 'button', class: 'ap-desen-w11-mb', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, text);
      b.addEventListener('click', () => deschideMeniu(b, articole, { cls: 'w11' }));
      b.addEventListener('pointerenter', () => { if (meniuri.length && meniuri[0].btn !== b && meniuri[0].btn?.classList.contains('ap-desen-w11-mb')) deschideMeniu(b, articole, { cls: 'w11' }); });
      return b;
    };
    const w11Meniu = h('div', { class: 'ap-desen-w11-meniu' },
      meniuW11('Fișier', articoleFisier), meniuW11('Editare', articoleEditare), meniuW11('Vizualizare', articoleVizualizare),
      h('span', { class: 'ap-desen-w11-sep' }),
      qat('salvare', 'Salvare (Ctrl+S)', () => salveaza(false)), qat('anulare', 'Anulare (Ctrl+Z)', () => anuleaza(), butoaneAnul), qat('refacere', 'Refacere (Ctrl+Y)', () => reface(), butoaneRef));
    const btnStraturi = h('button', { type: 'button', class: 'ap-desen-mare straturi', ...tipAttr('Straturi', 'Afișați sau ascundeți panoul Straturi.'), 'aria-pressed': 'false', onclick: () => { S.panouStraturi = !S.panouStraturi; salveazaPref(); actualizeazaUI(); } }, ico('straturi', 'ap-desen-ico mare'), h('span', {}, 'Straturi'));
    const w11Bara = h('div', { class: 'ap-desen-w11-bara', role: 'toolbar', 'aria-label': 'Instrumente' });
    const w11Text = h('div', { class: 'ap-desen-w11-text', hidden: true, role: 'toolbar', 'aria-label': 'Instrumente text' });
    zona.append(w11Text);

    function asezaGrupuri() {
      radacina.classList.toggle('win11', S.aspect === 'win11'); radacina.classList.toggle('clasic', S.aspect !== 'win11');
      if (S.aspect === 'win11') {
        S.fila = 'pornire';
        w11Bara.replaceChildren(gImagine, gUnelte, gPensule, gForme, gDim, gCulori, h('span', { class: 'ap-desen-spatiu' }), btnStraturi);
        w11Text.replaceChildren(gFont, gFundal);
      } else {
        if (S.fila === 'text' && !tx) S.fila = 'pornire';
        panglica.replaceChildren(...(S.fila === 'vizualizare' ? [gZoom, gAfis, gEcran, gAspect] : S.fila === 'text' ? [gClip, gFont, gFundal, gCulori] : [gClip, gImagine, gUnelte, gPensule, gForme, gDim, gCulori]));
      }
    }
    function setAspect(a) {
      comite();
      S.aspect = a; salveazaPref(); asezaGrupuri(); actualizeazaUI();
      requestAnimationFrame(() => { deseneazaRigle(); });
      toast(a === 'win11' ? 'Aspect Windows 11: meniurile Fișier, Editare și Vizualizare sunt sus; panoul Straturi este în dreapta.' : 'Aspect clasic (Windows 10), ca în manual: panglica cu filele Fișier, Pornire și Vizualizare.');
    }

    // ----- Meniul Fișier din aspectul clasic: comenzile în stânga, imaginile recente sau opțiunile în dreapta -----
    let recente = [];
    async function actualizeazaRecente() { recente = (await store.toate().catch(() => [])).filter((f) => f.id !== CIORNA).sort((a, b) => b.actualizat - a.actualizat); }
    function meniuFisierClasic() {
      deschideMeniu(btnFisier, () => {
        const dreapta = h('div', { class: 'ap-desen-fp-dr' });
        const arataRecente = () => dreapta.replaceChildren(h('h4', {}, 'Imagini recente'), ...(recente.length ? recente.slice(0, 9).map((f, i) => h('button', { type: 'button', class: 'ap-desen-fp-rec', role: 'menuitem', title: `${f.titlu}.${f.format || 'png'}`, onclick: () => { inchideMeniu(); deschideRec(f); } }, h('u', {}, String(i + 1)), h('span', {}, `${f.titlu}.${f.format || 'png'}`))) : [h('p', { class: 'ap-desen-fp-gol' }, 'Nu există imagini recente.')]));
        const optiune = (k, titlu, desc, fn) => h('button', { type: 'button', class: 'ap-desen-fp-opt', role: 'menuitem', onclick: () => { inchideMeniu(); fn(); } }, ico(k, 'ap-desen-ico mare'), h('span', {}, h('b', {}, titlu), h('small', {}, desc)));
        const subSalvare = () => ['Salvați o copie a documentului', Object.keys(FORMATE).map((f) => optiune('import', FORMATE[f][1], FORMATE[f][4], () => salvareCa(f)))];
        const subTiparire = () => ['Examinați și tipăriți documentul', [optiune('tiparire', 'Tipărire', 'Selectați o imprimantă, numărul de exemplare și alte opțiuni de tipărire.', tipareste), optiune('proprietati', 'Examinare înaintea imprimării', 'Vedeți cum va arăta imaginea pe hârtie, înainte de a o tipări.', examinare)]];
        const art = (k, text, fn, sub, kbd) => {
          const b = h('button', { type: 'button', class: 'ap-desen-fp-art', role: 'menuitem', 'data-tip': kbd ? `${text} (${kbd})` : null }, ico(k, 'ap-desen-ico mare'), h('span', {}, text), sub ? ico('sageataDr') : null);
          const arata = () => { if (sub) { const [t, opt] = sub(); dreapta.replaceChildren(h('h4', {}, t), ...opt); } else arataRecente(); };
          b.addEventListener('pointerenter', arata); b.addEventListener('focus', arata);
          b.addEventListener('click', () => { if (sub) { arata(); dreapta.querySelector('button')?.focus(); } else { inchideMeniu(); fn(); } });
          return b;
        };
        arataRecente();
        return h('div', { class: 'ap-desen-fp' }, h('div', { class: 'ap-desen-fp-stg' },
          art('nou', 'Nou', nou, null, 'Ctrl+N'), art('deschidere', 'Deschidere', deschide, null, 'Ctrl+O'), art('salvare', 'Salvare', () => salveaza(false), null, 'Ctrl+S'),
          art('salvareCa', 'Salvare ca', null, subSalvare), art('tiparire', 'Tipărire', null, subTiparire), h('hr'),
          art('import', 'Lipire din fișier', lipireDin), art('proprietati', 'Proprietăți', proprietati, null, 'Ctrl+E'), art('despre', 'Despre Paint', despre), h('hr'), art('iesire', 'Ieșire', iesire)), dreapta);
      }, { cls: 'fisier-clasic' });
    }

    // ----- Panoul Straturi (Windows 11) -----
    const listaEl = h('div', { class: 'ap-desen-lst', role: 'list' });
    const panouStr = h('aside', { class: 'ap-desen-panou', 'aria-label': 'Straturi' },
      h('div', { class: 'ap-desen-panou-cap' }, h('b', {}, 'Straturi'), h('button', { type: 'button', class: 'ap-desen-panou-plus', ...tipAttr('Adăugare strat', 'Adăugați un strat nou, transparent, deasupra stratului curent.'), onclick: () => adaugaStrat() }, ico('plus'))),
      listaEl);
    function meniuStrat(btn, i) {
      const l = straturi[i];
      deschideMeniu(btn, () => [
        articol('Adăugare strat', adaugaStrat, { icoana: 'plus' }),
        articol('Duplicare strat', () => duplicaStrat(i), { icoana: 'copiere' }),
        articol('Îmbinare în jos', () => imbinaJos(i), { dezactivat: i === 0 }),
        sep(),
        articol('Mutare în sus', () => mutaStrat(i, i + 1), { dezactivat: i === straturi.length - 1 }),
        articol('Mutare în jos', () => mutaStrat(i, i - 1), { dezactivat: i === 0 }),
        articol(l.vizibil ? 'Ascundere strat' : 'Afișare strat', () => comutaVizibil(i), { icoana: l.vizibil ? 'ochiTaiat' : 'ochi' }),
        sep(),
        articol('Ștergere strat', () => stergeStrat(i), { dezactivat: straturi.length < 2, icoana: 'iesire' }),
      ], { cls: 'w11' });
    }
    function listaStraturi() {
      listaEl.replaceChildren(...straturi.map((l, i) => {
        l.mini = canvasNou(60, 40); l.mini.className = 'mini';
        const ochi = h('button', { type: 'button', class: 'ap-desen-lst-btn', ...tipAttr(l.vizibil ? 'Ascundere strat' : 'Afișare strat'), onclick: (e) => { e.stopPropagation(); comutaVizibil(i); } }, ico(l.vizibil ? 'ochi' : 'ochiTaiat'));
        const mai = h('button', { type: 'button', class: 'ap-desen-lst-btn', ...tipAttr('Mai multe opțiuni'), 'aria-haspopup': 'menu', onclick: (e) => { e.stopPropagation(); meniuStrat(mai, i); } }, ico('puncte'));
        const el = h('div', { class: `ap-desen-lst-art${i === activ ? ' activ' : ''}${l.vizibil ? '' : ' ascuns'}`, role: 'listitem', tabindex: '0', 'aria-label': `${l.nume}${i === activ ? ', strat curent' : ''}`, 'data-i': String(i) }, l.mini, h('span', { class: 'nume' }, l.nume), ochi, mai);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activeazaStrat(i); } });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); meniuStrat(mai, i); });
        el.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button') || e.button !== 0) return;
          const sy = e.clientY; let mutat = false, tinta = i;
          el.setPointerCapture(e.pointerId);
          const muta = (ev) => {
            if (!mutat && Math.abs(ev.clientY - sy) < 5) return;
            mutat = true; el.classList.add('trage');
            el.style.transform = `translateY(${ev.clientY - sy}px)`;
            const art = [...listaEl.children];
            tinta = i;
            art.forEach((a) => { if (a === el) return; const r = a.getBoundingClientRect(), j = Number(a.dataset.i); if (ev.clientY > r.top && ev.clientY < r.bottom) tinta = j; });
            art.forEach((a) => a.classList.toggle('tinta', Number(a.dataset.i) === tinta && a !== el));
          };
          const stop = () => {
            el.removeEventListener('pointermove', muta); el.removeEventListener('pointerup', stop); el.removeEventListener('pointercancel', stop);
            if (mutat) mutaStrat(i, tinta); else activeazaStrat(i);
          };
          el.addEventListener('pointermove', muta); el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
        });
        return el;
      }).reverse());
      miniStraturi();
    }
    function miniStraturi() {
      for (const l of straturi) {
        if (!l.mini) continue;
        const g = l.mini.getContext('2d'), k = Math.min(60 / cv.width, 40 / cv.height), w = cv.width * k, hh = cv.height * k;
        g.clearRect(0, 0, 60, 40);
        g.drawImage(l.c, (60 - w) / 2, (40 - hh) / 2, w, hh);
      }
    }
    function activeazaStrat(i) { if (i === activ) return; comite(); activ = i; legaStrat(); listaStraturi(); stare(); }
    function adaugaStrat() { comite(); pas(); straturi.splice(activ + 1, 0, stratNou(cv.width, cv.height, false)); activ++; legaStrat(); afiseazaStraturi(); }
    function duplicaStrat(i) { comite(); pas(); const l = straturi[i]; straturi.splice(i + 1, 0, { c: copie(l.c), nume: `${l.nume} (copie)`, vizibil: l.vizibil }); activ = i + 1; legaStrat(); afiseazaStraturi(); }
    function stergeStrat(i) {
      if (straturi.length < 2) return toast('Imaginea trebuie să aibă cel puțin un strat.');
      comite(); pas(); straturi.splice(i, 1); if (activ >= i && activ > 0) activ--; legaStrat(); afiseazaStraturi();
    }
    function imbinaJos(i) {
      if (i < 1) return;
      comite(); pas();
      if (straturi[i].vizibil) straturi[i - 1].c.getContext('2d').drawImage(straturi[i].c, 0, 0);
      straturi.splice(i, 1); activ = i - 1; legaStrat(); afiseazaStraturi();
    }
    function mutaStrat(i, j) {
      j = clamp(j, 0, straturi.length - 1);
      if (i === j) { listaStraturi(); return; }
      comite(); pas(); const [l] = straturi.splice(i, 1); straturi.splice(j, 0, l); activ = j; legaStrat(); afiseazaStraturi();
    }
    function comutaVizibil(i) { comite(); straturi[i].vizibil = !straturi[i].vizibil; afiseazaStraturi(); schimbat(); }

    // ----- Bara de stare -----
    const stareCursor = h('span'), stareSel = h('span'), stareDim = h('span'), stareDisc = h('span');
    const campStare = (k, el, tip) => h('div', { class: 'ap-desen-st-c', 'data-tip': tip }, ico(k), el);
    const zoomEl = h('span', { class: 'ap-desen-zoomtxt' });
    const zoomSlider = h('input', { type: 'range', min: '10', max: '800', step: '1', 'aria-label': 'Panoramare', 'data-tip': 'Panoramare', oninput: () => setZoom(Number(zoomSlider.value) / 100) });
    const baraStare = h('div', { class: 'ap-desen-stare' },
      campStare('stCursor', stareCursor, 'Poziția cursorului pe imagine (în pixeli)'), campStare('stSel', stareSel, 'Dimensiunea selecției'), campStare('stImg', stareDim, 'Dimensiunea imaginii (Fișier → Proprietăți)'), campStare('stDisc', stareDisc, 'Dimensiunea fișierului salvat'),
      h('span', { class: 'ap-desen-spatiu' }),
      h('div', { class: 'ap-desen-st-zoom' }, zoomEl,
        h('button', { type: 'button', class: 'ap-desen-zb', ...tipAttr('Micșorare'), onclick: () => micsoreaza() }, ico('minus')),
        zoomSlider,
        h('button', { type: 'button', class: 'ap-desen-zb', ...tipAttr('Mărire'), onclick: () => mareste() }, ico('plus'))));
    function stare() {
      stareDim.textContent = `${cv.width} × ${cv.height}px`;
      stareSel.textContent = fl ? `${fl.w} × ${fl.h}px` : fo ? stareSel.textContent : '';
      stareDisc.textContent = S.peDisc ? `Dimensiune: ${octeti(S.peDisc)}` : '';
    }

    const corp = h('div', { class: 'ap-desen-corp' }, zona, panouStr);
    const tipar = h('div', { class: 'ap-desen-tipar' });
    const sarcina = window.EduSarcini?.bara ? window.EduSarcini.bara('desen', async () => lucrare()) : null;
    radacina.append(...[baraTitlu, sarcina, randFile, panglica, w11Meniu, w11Bara, corp, baraStare, tipar, toasturi, sfat].filter(Boolean));

    // ----- Starea interfeței -----
    function setUnealta(u) {
      if (u !== S.unealta) {
        fixeazaText(); fixeazaForma();
        if (u !== 'selectare') fixeazaFlotant();
        if (u === 'pipeta' && S.unealta !== 'pipeta') S.unealtaAnt = S.unealta;
        S.unealta = u;
        octx.clearRect(0, 0, ov.width, ov.height);
      }
      actualizeazaUI();
    }
    const CURSOR = { creion: CURSOARE.creion, umplere: CURSOARE.umplere, pipeta: CURSOARE.pipeta, lupa: CURSOARE.lupa, text: 'text', radiera: 'none', pensula: CURSOARE.cruce, forma: CURSOARE.cruce, selectare: CURSOARE.cruce };
    function actualizeazaUI() {
      for (const [u, b] of Object.entries(butoaneUnelte)) b.setAttribute('aria-pressed', String(S.unealta === u));
      for (const [k, b] of Object.entries(butoaneForme)) b.setAttribute('aria-pressed', String((S.unealta === 'forma' || fo) && (fo ? fo.tip : S.forma) === k));
      pagina.dataset.unealta = S.unealta;
      ov.style.cursor = CURSOR[S.unealta] || 'default';
      c1El.querySelector('.mostra').style.background = S.c1; c2El.querySelector('.mostra').style.background = S.c2;
      c1El.setAttribute('aria-pressed', String(S.activa === 1)); c2El.setAttribute('aria-pressed', String(S.activa === 2));
      c1El.dataset.desc = `Culoarea de prim-plan (${numeCuloare(S.c1)}): pentru creion, contururi și text.`;
      c2El.dataset.desc = `Culoarea de fundal (${numeCuloare(S.c2)}): pentru umplerea formelor și urma radierei.`;
      const l = h('span', { class: 'ap-desen-grosimi' }, [1, 3, 6].map((g) => { const x = h('i'); x.style.height = `${Math.min(S.grosime, 14) * g / 6 + 1}px`; return x; }));
      btnGrosime.replaceChildren(l, h('span', {}, 'Dimensiune ▾'));
      btnContur.replaceChildren(icoStil(S.contur, false), h('span', { class: 'et' }, 'Contur ▾'));
      btnUmplere.replaceChildren(icoStil(S.umplere, true), h('span', { class: 'et' }, 'Umplere ▾'));
      const areSel = !!fl;
      for (const b of [btnDecupare, btnCopiere, btnTrunchiere]) b.disabled = !areSel;
      for (const b of butoaneAnul) b.disabled = !anulari.length && !fo;
      for (const b of butoaneRef) b.disabled = !refaceri.length;
      // file și bare
      filaText.hidden = !tx || S.aspect !== 'clasic';
      for (const [k, b] of Object.entries(butoaneFile)) b.setAttribute('aria-selected', String(S.fila === k));
      w11Text.hidden = !tx || S.aspect !== 'win11';
      selFont.value = S.font; if (document.activeElement !== inMarime) inMarime.value = String(S.marime);
      for (const b of [btnB, btnI, btnU, btnT]) b.setAttribute('aria-pressed', String(!!S[b.dataset.k]));
      btnOpac.setAttribute('aria-pressed', String(S.opac)); btnTransp.setAttribute('aria-pressed', String(!S.opac));
      for (const [inp, get] of bife) inp.checked = !!get();
      grila.hidden = !S.grila;
      baraStare.hidden = !S.stareVizibila;
      panouStr.hidden = !(S.aspect === 'win11' && S.panouStraturi);
      btnStraturi.setAttribute('aria-pressed', String(S.panouStraturi));
      zona.classList.toggle('cu-rigle', S.rigle);
      stilText();
    }

    // ----- Fișiere -----
    async function intreabaSalvare() { // 'ok' / 'nu' = putem continua; null = anulat
      comite();
      if (!S.modificat) return 'ok';
      const r = await mesaj('Paint', `Doriți să salvați modificările la ${numeAfisat()}?`, [['Salvare', 'da', 'prim'], ['Nu salvați', 'nu'], ['Anulare', null]], 'intrebare');
      if (r === 'da') return (await salveaza(false)) ? 'ok' : null;
      return r;
    }
    async function incarcaRec(rec) {
      const s = Array.isArray(rec.straturi) && rec.straturi.length
        ? await Promise.all(rec.straturi.map(async (l, i) => ({ c: await imagineInCanvas(l.imagine), nume: l.nume || `Strat ${i + 1}`, vizibil: l.vizibil !== false })))
        : [{ c: await imagineInCanvas(rec.imagine), nume: 'Strat 1', vizibil: true }];
      const W = s[0].c.width, H = s[0].c.height;
      for (const l of s) if (l.c.width !== W || l.c.height !== H) { const n = canvasNou(W, H); n.getContext('2d').drawImage(l.c, 0, 0); l.c = n; }
      return { s, activ: clamp(Number(rec.activ) || 0, 0, s.length - 1) };
    }
    function incarca(st, meta) {
      fixeazaText(); fo = null; randeazaForma(); fl = null; pozFlotant();
      anulari.length = 0; refaceri.length = 0;
      nrStrat = st.s.length + 1;
      restaurareStare(st);
      Object.assign(S, { titlu: 'Fără titlu', fisierId: null, format: 'png', creat: null, modificat: false, salvatLa: null, peDisc: null, extern: false }, meta);
      renuntat = false;
      potriveste(); actualizeazaTitlu(); actualizeazaUI(); stare();
      salveazaCiorna();
    }
    async function nou() {
      if (!(await intreabaSalvare())) return;
      const l = stratNou(800, 500, true); l.nume = 'Strat 1';
      incarca({ s: [l], activ: 0 }, {});
    }
    async function deschideRec(f) {
      if (!(await intreabaSalvare())) return;
      try {
        const st = await incarcaRec(f);
        incarca(st, { titlu: f.titlu, fisierId: f.id, format: f.format || 'png', creat: f.creat, salvatLa: f.actualizat, peDisc: marimeDataUrl(f.imagine) });
      } catch (e) { mesaj('Paint', e.message, [['OK', true, 'prim']], 'eroare'); }
    }
    async function deschideDeLaCalculator(f) {
      if (!f) return;
      try {
        const src = await citesteFisier(f), img = await incarcaImagine(src);
        if (!(await intreabaSalvare())) return;
        const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
        const l = stratNou(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k), true); l.nume = 'Strat 1';
        const g = l.c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, l.c.width, l.c.height);
        const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
        incarca({ s: [l], activ: 0 }, { titlu: f.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Imagine', format: FORMATE[ext] ? ext : 'png', extern: true, peDisc: f.size });
        if (k < 1) toast('Imaginea era foarte mare, așa că a fost micșorată.');
      } catch (e) { mesaj('Paint', e.message, [['OK', true, 'prim']], 'eroare'); }
    }
    function miniatura(c) {
      const k = Math.min(1, 220 / c.width, 160 / c.height), m = canvasNou(Math.round(c.width * k), Math.round(c.height * k));
      const g = m.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, m.width, m.height); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, m.width, m.height);
      return m.toDataURL('image/jpeg', 0.8);
    }
    async function salveaza(ca) {
      if (ca || !S.fisierId) return salvareCa(S.format);
      comite();
      return scrieRec(S.fisierId, S.titlu, S.format);
    }
    async function scrieRec(id, titlu, format) {
      let img = compozit(false);
      if (format === 'jpg' || format === 'bmp') img = pePanzaAlba(img);
      const imagine = img.toDataURL('image/png');
      const vechi = id === S.fisierId ? S.creat : null;
      const rec = { id, titlu, format, imagine, mini: miniatura(img), w: cv.width, h: cv.height, creat: vechi || Date.now(), actualizat: Date.now(), ...straturiRec() };
      try {
        await store.put(rec);
        Object.assign(S, { fisierId: id, titlu, format, creat: rec.creat, modificat: false, extern: false, salvatLa: rec.actualizat, peDisc: marimeDataUrl(imagine) });
        actualizeazaTitlu(); actualizeazaUI(); stare(); salveazaCiorna(); actualizeazaRecente();
        return true;
      } catch {
        await mesaj('Paint', 'Nu se poate salva fișierul: spațiul de stocare din browser este plin.\nSalvați desenul pe calculator (Salvare ca → Descărcări) și ștergeți desenele vechi.', [['OK', true, 'prim']], 'eroare');
        return false;
      }
    }
    // Fereastra „Salvare ca”: locul (desenele din browser sau descărcare pe calculator), numele și tipul fișierului
    async function salvareCa(fmt = S.format) {
      comite();
      await actualizeazaRecente();
      const toate = recente;
      let loc = 'browser';
      const inpNume = h('input', { type: 'text', maxlength: '80', value: S.titlu === 'Fără titlu' ? 'Desenul meu' : S.titlu, 'aria-label': 'Nume fișier' });
      const selTip = h('select', { 'aria-label': 'Salvare cu tipul' }, Object.entries(FORMATE).map(([k, v]) => h('option', { value: k }, v[2])));
      selTip.value = FORMATE[fmt] ? fmt : 'png';
      const lista = h('div', { class: 'ap-desen-fx-lista' }), cale = h('div', { class: 'ap-desen-fx-cale' });
      const nav = (k, text, i) => h('button', { type: 'button', class: 'ap-desen-fx-nav', 'data-loc': k, onclick: () => { loc = k; umpleFx(); } }, ico(i), h('span', {}, text));
      const navEl = h('div', { class: 'ap-desen-fx-stg' }, h('small', {}, 'Acces rapid'), nav('browser', 'Desenele mele', 'stImg'), nav('calc', 'Descărcări', 'deschidere'));
      function umpleFx() {
        navEl.querySelectorAll('button').forEach((b) => b.classList.toggle('activ', b.dataset.loc === loc));
        cale.replaceChildren(ico('stImg'), h('span', {}, loc === 'browser' ? 'Acest PC › Desenele mele (în acest browser)' : 'Acest PC › Descărcări'));
        if (loc === 'calc') lista.replaceChildren(h('p', { class: 'ap-desen-fx-gol' }, 'Fișierul va fi descărcat pe calculator, în folderul Descărcări. De acolo îl poți copia pe stick sau îl poți trimite profesorului.'));
        else lista.replaceChildren(h('div', { class: 'ap-desen-fx-rand cap' }, h('span', {}, 'Nume'), h('span', {}, 'Data modificării'), h('span', {}, 'Tip')),
          ...(toate.length ? toate.map((f) => h('button', { type: 'button', class: 'ap-desen-fx-rand', onclick: () => { inpNume.value = f.titlu; selTip.value = f.format || 'png'; }, ondblclick: () => { inpNume.value = f.titlu; inchideFx?.(); } },
            h('span', { class: 'n' }, ico('stImg'), `${f.titlu}.${f.format || 'png'}`), h('span', {}, dataOra(f.actualizat)), h('span', {}, `Fișier ${(FORMATE[f.format] || FORMATE.png)[0]}`)))
            : [h('p', { class: 'ap-desen-fx-gol' }, 'Acest folder este gol.')]));
      }
      umpleFx();
      let inchideFx = null;
      const valid = async () => {
        let v = inpNume.value.trim();
        const m = v.match(/\.(png|jpe?g|bmp|gif)$/i);
        if (m) { selTip.value = m[1].toLowerCase().replace('jpeg', 'jpg'); v = v.slice(0, -m[0].length).trim(); }
        if (!v || /[\\/:*?"<>|]/.test(v)) { await mesaj('Salvare ca', `Numele de fișier nu este valid.${v ? '\nUn nume de fișier nu poate conține caracterele: \\ / : * ? " < > |' : ''}`, [['OK', true, 'prim']], 'eroare'); return false; }
        const fmt2 = selTip.value;
        const exista = loc === 'browser' ? toate.find((f) => f.titlu.toLowerCase() === v.toLowerCase()) : null;
        if (exista && !(await mesaj('Confirmare Salvare ca', `${exista.titlu}.${exista.format || 'png'} există deja.\nDoriți să îl înlocuiți?`, [['Da', true, 'prim'], ['Nu', null]], 'avert'))) return false;
        if (fmt2 === 'gif' && !(await mesaj('Paint', 'Dacă salvați imaginea în acest format, calitatea culorilor ar putea scădea.\nDoriți să continuați?', [['OK', true, 'prim'], ['Anulare', null]], 'avert'))) return false;
        return { nume: v, fmt: fmt2, loc, exista };
      };
      const r = await dialog('Salvare ca', h('div', { class: 'ap-desen-fx' }, cale, h('div', { class: 'ap-desen-fx-mijloc' }, navEl, lista),
        h('div', { class: 'ap-desen-fx-jos' }, h('label', {}, 'Nume fișier:'), inpNume, h('label', {}, 'Salvare cu tipul:'), selTip)),
      [['Salvare', valid, 'prim'], ['Anulare', null]], { cls: 'fx', laDeschidere: (inc) => { inchideFx = async () => { const v = await valid(); if (v) inc(v); }; } });
      if (!r) return false;
      if (r.loc === 'calc') {
        const blob = await blobDin(compozit(false), r.fmt);
        if (!blob) return false;
        descarca(`${numeFisierSigur(r.nume)}.${r.fmt}`, blob);
        Object.assign(S, { titlu: r.nume, format: r.fmt, modificat: false, extern: true, fisierId: null, peDisc: blob.size, salvatLa: Date.now() });
        actualizeazaTitlu(); actualizeazaUI(); stare(); salveazaCiorna();
        toast(`Fișierul „${r.nume}.${r.fmt}” a fost descărcat pe calculator.`);
        return true;
      }
      const { exista } = r;
      if (!exista || exista.id !== S.fisierId) S.creat = null;
      return scrieRec(exista ? exista.id : idNou(), r.nume, r.fmt);
    }
    // Fereastra „Deschidere”
    async function deschide() {
      comite();
      await actualizeazaRecente();
      let ales = null, inchideDlg = null;
      const inpNume = h('input', { type: 'text', 'aria-label': 'Nume fișier' });
      const lista = h('div', { class: 'ap-desen-fx-icoane' });
      const btnRed = h('button', { type: 'button', class: 'ap-desen-fx-unealta', disabled: true, onclick: () => redenumeste() }, 'Redenumire');
      const btnSt = h('button', { type: 'button', class: 'ap-desen-fx-unealta', disabled: true, onclick: () => sterge() }, 'Ștergere');
      const alege = (f, el) => { ales = f; inpNume.value = `${f.titlu}.${f.format || 'png'}`; lista.querySelectorAll('.ales').forEach((x) => x.classList.remove('ales')); el?.classList.add('ales'); btnRed.disabled = btnSt.disabled = false; };
      function umpleLista() {
        lista.replaceChildren(...(recente.length ? recente.map((f) => {
          const b = h('button', { type: 'button', class: 'ap-desen-fx-icon', title: `${f.titlu}.${f.format || 'png'}\nDimensiuni: ${f.w} × ${f.h}\nData modificării: ${dataOra(f.actualizat)}` },
            h('span', { class: 'mini' }, h('img', { src: f.mini || f.imagine, alt: '' })), h('span', { class: 'n' }, `${f.titlu}.${f.format || 'png'}`));
          b.addEventListener('click', () => alege(f, b));
          b.addEventListener('dblclick', () => { alege(f, b); inchideDlg?.(f); });
          return b;
        }) : [h('p', { class: 'ap-desen-fx-gol' }, 'Nu aveți încă desene salvate în acest browser. Salvați cu Ctrl+S.')]));
      }
      async function redenumeste() {
        if (!ales) return;
        const inp = h('input', { type: 'text', maxlength: '80', value: ales.titlu });
        const t = await dialog('Redenumire', etc('Nume nou:', inp), [['OK', () => inp.value.trim() || false, 'prim'], ['Anulare', null]]);
        if (!t) return;
        ales.titlu = t.slice(0, 80); await store.put(ales);
        if (S.fisierId === ales.id) { S.titlu = ales.titlu; actualizeazaTitlu(); }
        await actualizeazaRecente(); umpleLista(); inpNume.value = ''; ales = null; btnRed.disabled = btnSt.disabled = true;
      }
      async function sterge() {
        if (!ales) return;
        const da = await mesaj('Ștergere fișier', `Sigur doriți să ștergeți definitiv „${ales.titlu}.${ales.format || 'png'}”?`, [['Da', true, 'prim'], ['Nu', null]], 'avert');
        if (!da) return;
        await store.del(ales.id);
        if (S.fisierId === ales.id) { S.fisierId = null; S.modificat = true; actualizeazaTitlu(); }
        await actualizeazaRecente(); umpleLista(); inpNume.value = ''; ales = null; btnRed.disabled = btnSt.disabled = true;
      }
      umpleLista();
      const navEl = h('div', { class: 'ap-desen-fx-stg' }, h('small', {}, 'Acces rapid'),
        h('button', { type: 'button', class: 'ap-desen-fx-nav activ' }, ico('stImg'), h('span', {}, 'Desenele mele')),
        h('button', { type: 'button', class: 'ap-desen-fx-nav', onclick: async () => { const f = await alegeFisier('image/*'); if (f) inchideDlg?.({ fisier: f }); } }, ico('deschidere'), h('span', {}, 'Acest PC (calculator)…')));
      const gaseste = async () => {
        const v = inpNume.value.trim().replace(/\.(png|jpe?g|bmp|gif)$/i, '').toLowerCase();
        const f = (ales && `${ales.titlu}.${ales.format || 'png'}`.toLowerCase().startsWith(v) && ales) || recente.find((x) => x.titlu.toLowerCase() === v);
        if (!f) { await mesaj('Deschidere', `${inpNume.value.trim() || '(fără nume)'}\nNu se găsește fișierul.\nVerificați numele fișierului și încercați din nou.`, [['OK', true, 'prim']], 'avert'); return false; }
        return f;
      };
      const r = await dialog('Deschidere', h('div', { class: 'ap-desen-fx' },
        h('div', { class: 'ap-desen-fx-cale' }, ico('stImg'), h('span', {}, 'Acest PC › Desenele mele (în acest browser)')),
        h('div', { class: 'ap-desen-fx-bara' }, btnRed, btnSt),
        h('div', { class: 'ap-desen-fx-mijloc' }, navEl, lista),
        h('div', { class: 'ap-desen-fx-jos' }, h('label', {}, 'Nume fișier:'), inpNume, h('label', {}, 'Tip:'), h('select', { 'aria-label': 'Tip fișier' }, h('option', {}, 'Toate fișierele imagine (*.png;*.jpg;*.bmp;*.gif)')))),
      [['Deschidere', gaseste, 'prim'], ['Anulare', null]], { cls: 'fx', laDeschidere: (inc) => { inchideDlg = inc; } });
      if (!r) return;
      if (r.fisier) return deschideDeLaCalculator(r.fisier);
      deschideRec(r);
    }
    function tipareste() {
      tipar.replaceChildren(h('img', { src: compozit(true).toDataURL('image/png'), alt: numeAfisat() }));
      setTimeout(() => window.print(), 50);
    }
    async function examinare() {
      const c = compozit(true), pag = h('div', { class: 'ap-desen-pag' });
      const img = h('img', { src: c.toDataURL('image/png'), alt: '' });
      pag.append(img);
      const r = await dialog('Examinare înaintea imprimării', h('div', { class: 'ap-desen-exam' }, pag, h('p', { class: 'ap-desen-nota' }, `Pagina 1 din 1 · ${c.width} × ${c.height}px, ajustată la pagină`)), [['Tipărire', true, 'prim'], ['Închidere examinare', null]], { cls: 'exam' });
      if (r) tipareste();
    }
    async function lucrare() {
      comite();
      let c = compozit(false);
      const k = Math.min(1, LUCRARE_MAX / Math.max(c.width, c.height));
      if (k < 1) c = scaleaza(c, Math.round(c.width * k), Math.round(c.height * k));
      return { titlu: S.titlu === 'Fără titlu' ? 'Desen' : S.titlu, tip: 'imagine', date: c.toDataURL('image/png'), latime: c.width, inaltime: c.height };
    }
    async function iesire() {
      const r = await intreabaSalvare();
      if (!r) return;
      if (r === 'nu') { renuntat = true; clearTimeout(tCiorna); tCiorna = null; await store.del(CIORNA).catch(() => {}); }
      location.hash = '#/aplicatii';
    }

    // ----- Proprietăți imagine -----
    async function proprietati() {
      comite();
      let unit = 'px', W = cv.width, H = cv.height, culori = 'culoare';
      const conv = (px) => (unit === 'px' ? px : unit === 'cm' ? Math.round(px / DPI * 2.54 * 100) / 100 : Math.round(px / DPI * 100) / 100);
      const inPx = (v) => { v = Number(String(v).replace(',', '.')) || 0; return Math.round(unit === 'px' ? v : unit === 'cm' ? v / 2.54 * DPI : v * DPI); };
      const w = nr(W, 0.01, MAX_LATURA, 'any'), hh = nr(H, 0.01, MAX_LATURA, 'any');
      const citeste = () => { W = inPx(w.value); H = inPx(hh.value); };
      const scrie = () => { w.value = String(conv(W)); hh.value = String(conv(H)); };
      const setUnit = (u) => { citeste(); unit = u; scrie(); };
      const rand = (a, b) => h('div', { class: 'ap-desen-pr-rand' }, h('span', {}, a), h('b', {}, b));
      const r = await dialog('Proprietăți imagine', h('div', { class: 'ap-desen-pr' },
        fieldset('Atribute fișier', rand('Ultima salvare:', S.salvatLa ? dataOra(S.salvatLa) : 'Indisponibil'), rand('Dimensiune pe disc:', S.peDisc ? octeti(S.peDisc) : 'Indisponibil'), rand('Rezoluție:', `${DPI} DPI`)),
        h('div', { class: 'ap-desen-pr-2' },
          fieldset('Unități', radio('ap-desen-unit', 'in', 'Inci', false, () => setUnit('in')), radio('ap-desen-unit', 'cm', 'Centimetri', false, () => setUnit('cm')), radio('ap-desen-unit', 'px', 'Pixeli', true, () => setUnit('px'))),
          fieldset('Culori', radio('ap-desen-cul', 'bn', 'Alb-negru', false, () => { culori = 'bn'; }), radio('ap-desen-cul', 'c', 'Culoare', true, () => { culori = 'culoare'; }))),
        h('div', { class: 'ap-desen-pr-dim' }, etc('Lățime:', w), etc('Înălțime:', hh))),
      [['OK', () => { citeste(); if (W < 1 || H < 1 || W > MAX_LATURA || H > MAX_LATURA) { mesaj('Paint', `Introduceți dimensiuni între 1 și ${MAX_LATURA} pixeli.`, [['OK', true, 'prim']], 'avert'); return false; } return [W, H, culori]; }, 'prim'],
        ['Anulare', null], ['Implicit', () => { W = 800; H = 500; scrie(); return false; }]], { cls: 'prop' });
      if (!r) return;
      redimPanza(r[0], r[1]);
      if (r[2] === 'bn') {
        const ok = await mesaj('Paint', 'Dacă transformați imaginea în alb-negru, culorile se pierd definitiv (se poate reveni doar cu Anulare).\nDoriți să continuați?', [['OK', true, 'prim'], ['Anulare', null]], 'avert');
        if (ok) inlocuiesteTot((c) => {
          const n = copie(c), g = n.getContext('2d'), img = g.getImageData(0, 0, n.width, n.height), d = img.data;
          for (let i = 0; i < d.length; i += 4) { const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 128 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; }
          g.putImageData(img, 0, 0); return n;
        });
      }
    }

    // ----- Redimensionare și înclinare -----
    async function redimensionare() {
      fixeazaText(); fixeazaForma();
      const W0 = fl ? fl.w : cv.width, H0 = fl ? fl.h : cv.height;
      let mod = 'procent';
      const oriz = nr(100, 1, 9999), vert = nr(100, 1, 9999), raport = h('input', { type: 'checkbox', checked: true });
      const inclX = nr(0, -89, 89), inclY = nr(0, -89, 89);
      const calc = () => { const a = Number(oriz.value) || 0, b = Number(vert.value) || 0; return mod === 'procent' ? [Math.round(W0 * a / 100), Math.round(H0 * b / 100)] : [Math.round(a), Math.round(b)]; };
      const leaga = (src, dst, vertical) => src.addEventListener('input', () => {
        if (raport.checked) { const v = Number(src.value) || 0; dst.value = String(mod === 'procent' ? v : Math.round(vertical ? v * W0 / H0 : v * H0 / W0)); }
      });
      leaga(oriz, vert, false); leaga(vert, oriz, true);
      raport.addEventListener('change', () => { if (raport.checked) vert.value = String(mod === 'procent' ? oriz.value : Math.round((Number(oriz.value) || 0) * H0 / W0)); });
      const setMod = (m) => { mod = m; if (m === 'procent') { oriz.value = '100'; vert.value = '100'; } else { oriz.value = String(W0); vert.value = String(H0); } };
      const icoR = (vertical) => svg(vertical ? '<rect x="6" y="3" width="8" height="14" fill="#e6f2fb"/><path d="M10 5v10M8 7l2-2 2 2M8 13l2 2 2-2"/>' : '<rect x="3" y="6" width="14" height="8" fill="#e6f2fb"/><path d="M5 10h10M7 8l-2 2 2 2M13 8l2 2-2 2"/>');
      const icoI = (vertical) => svg(vertical ? '<path d="M6 5l8 3v9l-8-3z" fill="#e6f2fb"/>' : '<path d="M6 6h9l-3 8H3z" fill="#e6f2fb"/>');
      const r = await dialog('Redimensionare și înclinare', h('div', { class: 'ap-desen-rz' },
        fieldset('Redimensionare',
          h('div', { class: 'ap-desen-rz-dupa' }, h('span', {}, 'După:'), radio('ap-desen-rz', 'procent', 'Procent', true, () => setMod('procent')), radio('ap-desen-rz', 'pixeli', 'Pixeli', false, () => setMod('pixeli'))),
          etc('Pe orizontală:', oriz, icoR(false)), etc('Pe verticală:', vert, icoR(true)),
          h('label', { class: 'ap-desen-radio' }, raport, h('span', {}, 'Se mențin proporțiile'))),
        fieldset('Înclinare (grade)', etc('Pe orizontală:', inclX, icoI(false)), etc('Pe verticală:', inclY, icoI(true))),
        h('p', { class: 'ap-desen-nota' }, fl ? `Se aplică selecției (${W0} × ${H0}px).` : `Se aplică întregii imagini (${W0} × ${H0}px).`)),
      [['OK', () => {
        const [w, hh] = calc(), ix = Number(inclX.value) || 0, iy = Number(inclY.value) || 0;
        if (w < 1 || hh < 1 || w > MAX_LATURA || hh > MAX_LATURA) { mesaj('Paint', mod === 'procent' ? 'Introduceți un număr întreg între 1 și 500.' : `Introduceți un număr întreg între 1 și ${MAX_LATURA}.`, [['OK', true, 'prim']], 'avert'); return false; }
        if (Math.abs(ix) > 89 || Math.abs(iy) > 89) { mesaj('Paint', 'Introduceți un număr întreg între -89 și 89.', [['OK', true, 'prim']], 'avert'); return false; }
        return [w, hh, ix, iy];
      }, 'prim'], ['Anulare', null]], { cls: 'rz' });
      if (!r) return;
      const [w, hh, ix, iy] = r;
      if (fl) {
        coaceFlotant(); pas();
        fl.cv = scaleaza(fl.cv, w, hh, ix, iy); fl.w = fl.cv.width; fl.h = fl.cv.height;
        randeazaFlotant(); schimbat();
      } else {
        const c0 = scaleaza(cv, w, hh, ix, iy);
        if (c0.width > MAX_LATURA || c0.height > MAX_LATURA) return mesaj('Paint', 'Imaginea rezultată ar fi prea mare.', [['OK', true, 'prim']], 'avert');
        inlocuiesteTot((c, i) => scaleaza(c, w, hh, ix, iy, i === 0 ? S.c2 : null));
      }
    }

    // ----- Editare culori (ca fereastra Windows: culori de bază, spectru, luminozitate, RGB) -----
    let pozPart = 0;
    async function editareCulori() {
      let [r, g, b] = hexRgb(S.activa === 2 ? S.c2 : S.c1), [H, Sa, L] = rgbHsl240(r, g, b);
      const SW = 176, SH = 150;
      const spectru = canvasNou(SW, SH); spectru.className = 'ap-desen-ec-spectru';
      { const gs = spectru.getContext('2d'), img = gs.createImageData(SW, SH);
        for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const [R, G, B] = hsl240Rgb(x / (SW - 1) * 239, 240 - y / (SH - 1) * 240, 120), i = (y * SW + x) * 4; img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255; }
        gs.putImageData(img, 0, 0); }
      const cruce = h('div', { class: 'ap-desen-ec-cruce' });
      const lum = canvasNou(12, SH); lum.className = 'ap-desen-ec-lum';
      const sageata = h('div', { class: 'ap-desen-ec-sag' });
      const mostra = h('div', { class: 'ap-desen-ec-mostra' });
      const campuri = {};
      const f = (k, et, max) => { const i = nr(0, 0, max); campuri[k] = i; i.addEventListener('input', () => dinCamp(k)); return etc(et, i); };
      const zonaSp = h('div', { class: 'ap-desen-ec-sp' }, spectru, cruce);
      const zonaLum = h('div', { class: 'ap-desen-ec-l' }, lum, sageata);
      function deseneazaLum() {
        const gl = lum.getContext('2d');
        for (let y = 0; y < SH; y++) { const [R, G, B] = hsl240Rgb(H, Sa, 240 - y / (SH - 1) * 240); gl.fillStyle = rgbHex(R, G, B); gl.fillRect(0, y, 12, 1); }
      }
      function arata(dinRgb) {
        if (dinRgb) [H, Sa, L] = rgbHsl240(r, g, b); else [r, g, b] = hsl240Rgb(H, Sa, L);
        const c = rgbHex(r, g, b);
        mostra.style.background = c;
        cruce.style.left = `${H / 239 * (SW - 1)}px`; cruce.style.top = `${(240 - Sa) / 240 * (SH - 1)}px`;
        sageata.style.top = `${(240 - L) / 240 * (SH - 1)}px`;
        deseneazaLum();
        for (const [k, v] of Object.entries({ H, Sa, L, r, g, b })) if (document.activeElement !== campuri[k]) campuri[k].value = String(Math.round(v));
      }
      function dinCamp(k) {
        const v = Math.round(Number(campuri[k].value) || 0);
        if (k === 'H') H = clamp(v, 0, 239); else if (k === 'Sa') Sa = clamp(v, 0, 240); else if (k === 'L') L = clamp(v, 0, 240);
        else { if (k === 'r') r = clamp(v, 0, 255); else if (k === 'g') g = clamp(v, 0, 255); else b = clamp(v, 0, 255); return arata(true); }
        arata(false);
      }
      const trageIn = (el, fn) => el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); el.setPointerCapture(e.pointerId);
        const muta = (ev) => { const rc = el.getBoundingClientRect(); fn(clamp(ev.clientX - rc.left, 0, SW - 1), clamp(ev.clientY - rc.top, 0, SH - 1)); };
        muta(e);
        const stop = () => { el.removeEventListener('pointermove', muta); el.removeEventListener('pointerup', stop); };
        el.addEventListener('pointermove', muta); el.addEventListener('pointerup', stop);
      });
      trageIn(zonaSp, (x, y) => { H = Math.round(x / (SW - 1) * 239); Sa = Math.round(240 - y / (SH - 1) * 240); if (L === 0 || L === 240) L = 120; arata(false); });
      trageIn(zonaLum, (x, y) => { L = Math.round(240 - y / (SH - 1) * 240); arata(false); });
      const caseta = (c, fn) => { const x = h('button', { type: 'button', class: 'ap-desen-ec-c', 'aria-label': c || 'Gol', onclick: fn }); if (c) x.style.background = c; return x; };
      const bazaEl = h('div', { class: 'ap-desen-ec-grila' }, CULORI_BAZA.map((c) => caseta(c, () => { [r, g, b] = hexRgb(c); arata(true); })));
      const partEl = h('div', { class: 'ap-desen-ec-grila' });
      const umplePart = () => partEl.replaceChildren(...Array.from({ length: 16 }, (_, i) => {
        const x = caseta(particularizate[i], () => { pozPart = i; if (particularizate[i]) { [r, g, b] = hexRgb(particularizate[i]); arata(true); } umplePart(); });
        if (i === pozPart) x.classList.add('ales');
        return x;
      }));
      umplePart();
      const adauga = h('button', { type: 'button', class: 'ap-desen-btn lat', onclick: () => {
        const c = rgbHex(r, g, b);
        particularizate[pozPart] = c; particularizate = particularizate.map((x) => x || '#ffffff').slice(0, 16);
        pozPart = (pozPart + 1) % 16;
        lsScrie(LS_CULORI, particularizate); deseneazaPaleta(); umplePart();
      } }, 'Adăugare la culori particularizate');
      const stanga = h('div', { class: 'ap-desen-ec-stg' }, h('p', {}, 'Culori de bază:'), bazaEl, h('p', {}, 'Culori particularizate:'), partEl,
        h('button', { type: 'button', class: 'ap-desen-btn lat', disabled: true }, 'Definire culori particularizate >>'));
      const dreapta = h('div', { class: 'ap-desen-ec-dr' }, h('div', { class: 'ap-desen-ec-sus' }, zonaSp, zonaLum),
        h('div', { class: 'ap-desen-ec-jos' }, h('div', {}, mostra, h('small', {}, 'Culoare|Solid')),
          h('div', { class: 'ap-desen-ec-campuri' }, f('H', 'Nuanță:', 239), f('r', 'Roșu:', 255), f('Sa', 'Sat:', 240), f('g', 'Verde:', 255), f('L', 'Lum:', 240), f('b', 'Albastru:', 255))),
        adauga);
      arata(true);
      const rez = await dialog('Editare culori', h('div', { class: 'ap-desen-ec' }, stanga, dreapta), [['OK', () => rgbHex(r, g, b), 'prim'], ['Anulare', null]], { cls: 'ec' });
      if (!rez) return;
      if (!particularizate.includes(rez) && !PALETA.includes(rez)) { particularizate = [rez, ...particularizate].slice(0, 16); lsScrie(LS_CULORI, particularizate); deseneazaPaleta(); }
      setCuloare(S.activa, rez);
    }
    function despre() {
      return dialog('Despre Paint', h('div', { class: 'ap-desen-despre' }, h('span', { class: 'sigla' }, ico('paint', 'ap-desen-ico')),
        h('div', {}, h('h3', {}, 'Paint'), h('p', {}, 'Simulator educațional edudigi pentru ora de TIC.'),
          h('p', {}, 'Arată și funcționează ca programul Paint din Windows: aspectul clasic (Windows 10, ca în manual) și aspectul nou din Windows 11 (Vizualizare → Aspect).'),
          h('p', { class: 'ap-desen-nota' }, 'Desenele se păstrează în acest browser, pe acest calculator. Nu este un produs Microsoft.'))), [['OK', true, 'prim']], { cls: 'despre' });
    }
    function ecranComplet() {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else radacina.requestFullscreen?.().catch(() => toast('Browserul nu permite ecranul complet aici.'));
    }

    // ----- Tastatura -----
    let pastaTratata = false;
    window.addEventListener('keydown', (e) => {
      if (!radacina.isConnected || modale.length) return;
      const t = e.target, inCamp = t.closest?.('input, textarea, select, [contenteditable]');
      const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (meniuri.length) { // navigare în meniu cu săgețile
        const m = meniuri[meniuri.length - 1].el, art = [...m.querySelectorAll('button:not(:disabled)')], i = art.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); const btn = meniuri[meniuri.length - 1].btn; inchideMeniu(meniuri.length - 1); btn?.focus(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); art[(i + (e.key === 'ArrowDown' ? 1 : -1) + art.length) % art.length]?.focus(); return; }
        if (e.key === 'ArrowRight' && document.activeElement?.classList.contains('are-sub')) { e.preventDefault(); document.activeElement.click(); return; }
        if (e.key === 'ArrowLeft' && meniuri.length > 1) { e.preventDefault(); const btn = meniuri[meniuri.length - 1].btn; inchideMeniu(meniuri.length - 1); btn?.focus(); return; }
      }
      if (ctrl && k === 's') { e.preventDefault(); salveaza(e.shiftKey); return; }
      if (e.key === 'F12') { e.preventDefault(); salvareCa(S.format); return; }
      if (e.key === 'F11') { e.preventDefault(); ecranComplet(); return; }
      if (inCamp) return;
      if (ctrl && (k === 'n' || (e.altKey && k === 'n'))) { e.preventDefault(); nou(); return; }
      if (ctrl && e.shiftKey && k === 'x') { e.preventDefault(); trunchiaza(); return; }
      const sc = {
        z: () => (e.shiftKey ? reface() : anuleaza()), y: reface, o: deschide, p: tipareste, e: proprietati, a: selecteazaTot,
        c: copiaza, x: decupeaza, g: () => setGrila(!S.grila), r: () => setRigle(!S.rigle), '+': () => mareste(), '=': () => mareste(), '-': () => micsoreaza(), '0': () => setZoom(1),
        pageup: () => mareste(), pagedown: () => micsoreaza(),
      };
      if (ctrl && k === 'v') { // lipire: imagine din clipboard-ul sistemului (evenimentul paste) sau din cel intern
        pastaTratata = false;
        setTimeout(() => { if (!pastaTratata) lipeste(); }, 80);
        return;
      }
      if (ctrl && sc[k]) { e.preventDefault(); sc[k](); return; }
      if (ctrl) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { if (fl) { e.preventDefault(); stergeSelectia(); } else if (fo) { e.preventDefault(); fo = null; randeazaForma(); actualizeazaUI(); } return; }
      if (e.key === 'Escape') { if (fo) { fixeazaForma(); } else fixeazaFlotant(); return; }
      if ((fl || fo) && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1, dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        if (fl) { fl.x += dx; fl.y += dy; pozFlotant(); } else { fo.a.x += dx; fo.a.y += dy; fo.b.x += dx; fo.b.y += dy; randeazaForma(); }
      }
    }, sig);
    window.addEventListener('paste', (e) => {
      if (!radacina.isConnected || modale.length || e.target.closest?.('input, textarea')) return;
      const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
      if (f && (!clip || clipSistem)) { e.preventDefault(); pastaTratata = true; insereazaImagine(f); }
      else { pastaTratata = true; e.preventDefault(); lipeste(); }
    }, sig);
    window.addEventListener('resize', () => { inchideMeniu(); deseneazaRigle(); }, sig);

    // Ieșirea din aplicație: oprim ascultătorii și păstrăm ciorna
    window.addEventListener('hashchange', () => {
      if (!renuntat && (tCiorna || tx || fl || fo)) salveazaCiorna();
      ac.abort();
      document.title = 'edudigi';
    }, { once: true });
    window.addEventListener('beforeunload', () => { if (tCiorna) salveazaCiorna(); }, sig);

    // ----- Pornire: continuăm ciorna, dacă există -----
    panzaNoua(800, 500);
    asezaGrupuri();
    show(h('div', { class: 'lab-ecran' }, radacina));
    actualizeazaTitlu(); actualizeazaUI(); stare();
    potriveste();
    actualizeazaRecente();
    try {
      const c = await store.get(CIORNA);
      if (c?.imagine && radacina.isConnected) {
        const st = await incarcaRec(c);
        nrStrat = st.s.length + 1;
        restaurareStare(st);
        Object.assign(S, { titlu: c.titlu || 'Fără titlu', fisierId: c.fisierId || null, format: c.format || 'png', creat: c.creat || null, modificat: !!c.modificat });
        if (S.fisierId) { const f = await store.get(S.fisierId).catch(() => null); if (f) { S.salvatLa = f.actualizat; S.peDisc = marimeDataUrl(f.imagine); } }
        potriveste(); actualizeazaTitlu(); actualizeazaUI(); stare();
      }
    } catch { /* pornim cu o pânză goală */ }
  }
})();

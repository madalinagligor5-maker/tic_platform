'use strict';
// Editor audio (ca WavePad / Audacity, simplificat): înregistrare cu microfonul, deschidere MP3/WAV/OGG,
// forma de undă cu cronologie, selecție, decupare/copiere/lipire, efecte, mixare și export WAV.
// Sunetul se ține în memorie ca Float32Array pe canale; proiectele se păstrează în IndexedDB.
(() => {
  const { h, show, routes } = window.EduApp;

  const MAX_SEC = 15 * 60;      // cel mai lung sunet acceptat într-un proiect
  const MAX_UNDO = 30;          // pași de anulare
  const MAX_UNDO_ESANT = 60e6;  // memoria ocupată de istoric (eșantioane)
  const SARCINA_SEC = 60, SARCINA_RATA = 16000;
  const RIGLA = 26;             // înălțimea cronologiei (px)

  // ---------- Utilitare ----------
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const nr = (x, z = 1) => x.toFixed(z).replace('.', ',');
  // 65.5 s → „1:05,50”
  function fmtTimp(sec, z = 2) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return `${m}:${s.toFixed(z).padStart(z ? 3 + z : 2, '0')}`.replace('.', ',');
  }
  const marime = (b) => (b >= 1048576 ? `${nr(b / 1048576)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}, ${ora}`;
  };
  function alegeFisier(accept) {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept, hidden: true });
      inp.addEventListener('change', () => { resolve(inp.files[0] || null); inp.remove(); });
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
  const SVG = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ic = (nume) => h('span', { class: 'ap-audio-ic', html: SVG(ICO[nume] || '') });
  const ICO = {
    deschide: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    salveaza: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 3v5h7V3M8 21v-7h8v7"/>',
    exporta: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    nou: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6M9 15h6"/>',
    inregistreaza: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
    decupare: '<circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M8.5 7.5 20 18M8.5 16.5 20 6"/>',
    copiere: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    lipire: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/>',
    lipireMix: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM8 13c1.3-2.5 2.7-2.5 4 0s2.7 2.5 4 0"/>',
    stergere: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    trunchiere: '<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',
    selTot: '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 3"/>',
    liniste: '<path d="M3 12h18M7 8v8M17 8v8"/>',
    ton: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>',
    inserareFisier: '<path d="M4 12h9M10 8l4 4-4 4"/><path d="M16 5h3v14h-3"/>',
    mixareFisier: '<path d="M2 9c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
    anulare: '<path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/>',
    refacere: '<path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3"/>',
    amplificare: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
    normalizare: '<path d="M3 4h18" stroke-dasharray="2 2"/><path d="M6 20V8M10 20V5M14 20V9M18 20V6"/>',
    fadeIn: '<path d="M3 19 21 5v14z"/>',
    fadeOut: '<path d="M3 5l18 14H3z"/>',
    inversare: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    ecou: '<circle cx="6" cy="12" r="2"/><path d="M10 8a5 5 0 0 1 0 8M14 5a9 9 0 0 1 0 14M18 3a12 12 0 0 1 0 18"/>',
    viteza: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
    redare: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    redareSel: '<path d="M8 6v12l9-6z" fill="currentColor"/><path d="M3 4v16M21 4v16"/>',
    pauza: '<path d="M8 5v14M16 5v14" stroke-width="3.5"/>',
    oprire: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>',
    inceput: '<path d="M6 5v14M19 5 9 12l10 7z"/>',
    sfarsit: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
    zoomPlus: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/>',
    zoomMinus: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    potrivire: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    zoomSel: '<rect x="7" y="7" width="10" height="10" stroke-dasharray="2 2"/><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    microfon: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  };

  // ---------- Prelucrarea sunetului (funcții pure pe Float32Array) ----------
  function lipeste(parti) {
    const n = parti.reduce((s, p) => s + p.length, 0);
    const o = new Float32Array(n);
    let k = 0;
    for (const p of parti) { o.set(p, k); k += p.length; }
    return o;
  }
  // Schimbă numărul de canale (stereo → mono: media; mono → stereo: dublare).
  function potrivesteCanale(canale, nc) {
    if (canale.length === nc) return canale;
    if (nc === 1) {
      const o = new Float32Array(canale[0].length);
      for (const c of canale) for (let i = 0; i < o.length; i++) o[i] += c[i] / canale.length;
      return [o];
    }
    return Array.from({ length: nc }, (_, i) => (canale[i] || canale[0]).slice());
  }
  // Reeșantionare liniară (pentru schimbarea vitezei și ca rezervă).
  function liniar(c, factor) { // factor = lungimea nouă / lungimea veche
    const n = Math.max(1, Math.round(c.length * factor));
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / factor, j = Math.floor(x), f = x - j;
      const a = c[Math.min(j, c.length - 1)] || 0, b = c[Math.min(j + 1, c.length - 1)] || 0;
      o[i] = a + (b - a) * f;
    }
    return o;
  }
  // Schimbă rata de eșantionare (cu filtrul browserului, prin OfflineAudioContext) și numărul de canale.
  async function reesantioneaza(canale, rataDin, rataIn, nc) {
    let out = canale;
    const n = canale[0]?.length || 0;
    if (n && rataDin !== rataIn) {
      try {
        const len = Math.max(1, Math.round(n * rataIn / rataDin));
        const oc = new OfflineAudioContext(canale.length, len, rataIn);
        const b = oc.createBuffer(canale.length, n, rataDin);
        canale.forEach((c, i) => b.copyToChannel(c, i));
        const s = oc.createBufferSource();
        s.buffer = b;
        s.connect(oc.destination);
        s.start();
        const r = await oc.startRendering();
        out = Array.from({ length: r.numberOfChannels }, (_, i) => r.getChannelData(i).slice(0, len));
      } catch {
        out = canale.map((c) => liniar(c, rataIn / rataDin));
      }
    }
    return potrivesteCanale(out, nc || out.length);
  }
  // Codare WAV PCM 16 biți.
  function codWav(canale, rata) {
    const nc = canale.length, n = canale[0].length;
    const buf = new ArrayBuffer(44 + n * nc * 2);
    const v = new DataView(buf);
    const scrie = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    scrie(0, 'RIFF'); v.setUint32(4, 36 + n * nc * 2, true); scrie(8, 'WAVE');
    scrie(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true);
    v.setUint32(24, rata, true); v.setUint32(28, rata * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true);
    scrie(36, 'data'); v.setUint32(40, n * nc * 2, true);
    const d = new Int16Array(buf, 44);
    for (let i = 0, k = 0; i < n; i++) {
      for (let c = 0; c < nc; c++) {
        const s = Math.max(-1, Math.min(1, canale[c][i]));
        d[k++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }
    return buf;
  }
  // Citește un WAV PCM 16 biți (cel scris de noi, folosit la stocarea de rezervă).
  function citesteWav16(buf) {
    const v = new DataView(buf);
    const nc = v.getUint16(22, true), rata = v.getUint32(24, true);
    const d = new Int16Array(buf, 44, (buf.byteLength - 44) >> 1);
    const n = Math.floor(d.length / nc);
    const canale = Array.from({ length: nc }, () => new Float32Array(n));
    for (let i = 0, k = 0; i < n; i++) for (let c = 0; c < nc; c++) canale[c][i] = d[k++] / 0x8000;
    return { rata, canale };
  }
  function base64(buf) {
    const u = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const dinBase64 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
  const varf = (canale, a, b) => { let m = 0; for (const c of canale) for (let i = a; i < b; i++) { const x = Math.abs(c[i]); if (x > m) m = x; } return m; };

  // ---------- Contextul audio (unul singur, pornit la prima acțiune) ----------
  let actx = null;
  function ctxAudio() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  async function decodeaza(arrayBuf) {
    const c = ctxAudio();
    const b = await new Promise((res, rej) => {
      const p = c.decodeAudioData(arrayBuf, res, rej);
      if (p && p.then) p.then(res, rej);
    });
    return { rata: b.sampleRate, canale: Array.from({ length: Math.min(2, b.numberOfChannels) }, (_, i) => b.getChannelData(i).slice()) };
  }

  // ---------- Stocare: IndexedDB (meta + sunet separat), cu localStorage de rezervă ----------
  const DB = 'edudigi-audio';
  let dbP = null;
  function deschideDB() {
    if (!dbP) dbP = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('fără IndexedDB'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('proiecte', { keyPath: 'id' }); r.result.createObjectStore('sunete', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbP;
  }
  const areIDB = () => deschideDB().then(() => true, () => false);
  const tx = async (magazine, mod, fn) => {
    const db = await deschideDB();
    return new Promise((res, rej) => {
      const t = db.transaction(magazine, mod);
      const r = fn(...magazine.map((m) => t.objectStore(m)));
      t.oncomplete = () => res(r?.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Spațiul de stocare este plin.'));
    });
  };
  const LS = 'edudigi_audio_proiecte';
  const lsToate = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
  const lsScrie = (a) => localStorage.setItem(LS, JSON.stringify(a));
  const fara = ({ wav, ...m }) => m;
  const store = {
    async lista() { return (await areIDB()) ? tx(['proiecte'], 'readonly', (s) => s.getAll()) : lsToate().map(fara); },
    async incarca(id) {
      if (await areIDB()) {
        const [m, s] = await Promise.all([tx(['proiecte'], 'readonly', (p) => p.get(id)), tx(['sunete'], 'readonly', (p) => p.get(id))]);
        return m && s ? { ...m, canale: s.canale } : null;
      }
      const m = lsToate().find((x) => x.id === id);
      if (!m) return null;
      const w = citesteWav16(dinBase64(m.wav));
      return { ...fara(m), rata: w.rata, canale: w.canale };
    },
    async salveaza(meta, canale, rata) {
      if (await areIDB()) return tx(['proiecte', 'sunete'], 'readwrite', (p, s) => { p.put(meta); s.put({ id: meta.id, canale }); });
      // Rezervă: mono 22 050 Hz, ca să încapă în localStorage.
      const [m] = await reesantioneaza(canale, rata, 22050, 1);
      const a = lsToate().filter((x) => x.id !== meta.id);
      a.push({ ...meta, wav: base64(codWav([m], 22050)) });
      lsScrie(a);
    },
    async redenumeste(id, titlu) {
      if (await areIDB()) return tx(['proiecte'], 'readwrite', (p) => { const r = p.get(id); r.onsuccess = () => { if (r.result) p.put({ ...r.result, titlu }); }; });
      lsScrie(lsToate().map((x) => (x.id === id ? { ...x, titlu } : x)));
    },
    async sterge(id) {
      if (await areIDB()) return tx(['proiecte', 'sunete'], 'readwrite', (p, s) => { p.delete(id); s.delete(id); });
      lsScrie(lsToate().filter((x) => x.id !== id));
    },
  };
  async function numeLiber(baza, exceptId) {
    const toate = (await store.lista()).filter((p) => p.id !== exceptId).map((p) => p.titlu);
    if (!toate.includes(baza)) return baza;
    let i = 2;
    while (toate.includes(`${baza} ${i}`)) i++;
    return `${baza} ${i}`;
  }

  // ---------- Curățenie la ieșirea din aplicație ----------
  let laIesire = null;
  window.addEventListener('hashchange', () => {
    if (laIesire && !/^#\/aplicatii\/audio(\?|$)/.test(location.hash)) { const f = laIesire; laIesire = null; f(); }
  });

  routes.push({ pattern: /^\/aplicatii\/audio$/, handler: async (m, params) => pornire(params) });

  async function pornire(params) {
    if (laIesire) { const f = laIesire; laIesire = null; f(); }
    const ac = new AbortController();
    // Starea editorului
    const S = {
      id: null, titlu: 'Sunet nou', creat: Date.now(),
      rata: 44100, canale: [],
      sel: null, cursor: 0,          // selecția {a, b} și cursorul, în eșantioane
      vs: 0, spp: 1,                 // începutul vederii și eșantioane pe pixel (zoom)
      istoric: [], refacere: [], clip: null,
      redare: null, inregistrare: null,
      fila: 'acasa', salvat: true,
    };
    const n = () => S.canale[0]?.length || 0;
    const sec = () => n() / S.rata;
    let tSalv = null;

    // ---------- Elemente ----------
    const inTitlu = h('input', { class: 'ap-audio-numep', type: 'text', maxlength: '80', 'aria-label': 'Numele proiectului' });
    const stareSalv = h('span', { class: 'ap-audio-salv', role: 'status' });
    const bara = h('div', { class: 'ap-audio-bara' },
      h('a', { class: 'ap-audio-inapoi', href: '#/aplicatii' }, '← Aplicații'),
      h('span', { class: 'ap-audio-sigla', 'aria-hidden': 'true', html: SVG(ICO.mixareFisier) }),
      h('b', { class: 'ap-audio-numeapp' }, 'Editor audio'),
      inTitlu, stareSalv);
    const file = h('div', { class: 'ap-audio-file', role: 'tablist', 'aria-label': 'File cu instrumente' });
    const panglica = h('div', { class: 'ap-audio-panglica', role: 'toolbar' });
    const cv = h('canvas', { class: 'ap-audio-cv', 'aria-hidden': 'true' });
    const ov = h('canvas', { class: 'ap-audio-ov', role: 'img', 'aria-label': 'Forma de undă. Trage ca să selectezi, apasă ca să muți cursorul.' });
    const gol = h('div', { class: 'ap-audio-gol' });
    const zona = h('div', { class: 'ap-audio-zona' }, cv, ov, gol);
    const derulare = h('input', { class: 'ap-audio-derulare', type: 'range', min: '0', max: '0', value: '0', step: '1', 'aria-label': 'Derulare în timp' });
    const infoZoom = h('span', { class: 'ap-audio-infozoom' });
    const timpMare = h('span', { class: 'ap-audio-timp', 'aria-live': 'off' });
    const infoSel = h('span', { class: 'ap-audio-infosel' });
    const stare = h('div', { class: 'ap-audio-stare' });
    const app = h('div', { class: 'ap-audio' });

    // ---------- Acțiuni ----------
    const A = {
      nou: { t: 'Nou', ico: 'nou', d: 'Proiect nou, gol', fn: () => proiectNou() },
      deschide: { t: 'Deschide', ico: 'deschide', d: 'Deschide un fișier audio de pe calculator: MP3, WAV, OGG (Ctrl+O)', fn: () => deschideFisier() },
      proiecte: { t: 'Proiectele mele', ico: 'deschide', d: 'Proiectele salvate în acest browser', fn: () => panouFisier() },
      salveaza: { t: 'Salvează', ico: 'salveaza', d: 'Salvează proiectul în acest browser (Ctrl+S)', cere: 'sunet', fn: () => salveaza(true) },
      exporta: { t: 'Export WAV', ico: 'exporta', d: 'Salvează sunetul ca fișier WAV pe calculator', cere: 'sunet', fn: () => dialogExport() },
      inregistreaza: { t: 'Înregistrare', ico: 'inregistreaza', d: 'Înregistrează cu microfonul', cls: 'rosu', fn: () => inregistreaza() },
      decupare: { t: 'Decupare', ico: 'decupare', d: 'Taie selecția și o păstrează pentru lipire (Ctrl+X)', cere: 'sel', fn: () => decupare() },
      copiere: { t: 'Copiere', ico: 'copiere', d: 'Copiază selecția (Ctrl+C)', cere: 'sel', fn: () => copiere() },
      lipire: { t: 'Lipire', ico: 'lipire', d: 'Lipește la cursor; dacă ai o selecție, o înlocuiește (Ctrl+V)', cere: 'clip', fn: () => lipire() },
      lipireMix: { t: 'Lipire combinată', ico: 'lipireMix', d: 'Suprapune sunetul copiat peste cel existent, de la cursor (Ctrl+Shift+V)', cere: 'clip', fn: () => lipireCombinata() },
      stergere: { t: 'Ștergere', ico: 'stergere', d: 'Șterge selecția (Delete)', cere: 'sel', fn: () => stergere() },
      trunchiere: { t: 'Trunchiere', ico: 'trunchiere', d: 'Păstrează doar selecția (Ctrl+T)', cere: 'sel', fn: () => trunchiere() },
      selTot: { t: 'Selectează tot', ico: 'selTot', d: 'Selectează tot sunetul (Ctrl+A)', cere: 'sunet', fn: () => selecteaza(0, n()) },
      liniste: { t: 'Liniște', ico: 'liniste', d: 'Inserează liniște la cursor', fn: () => dialogLiniste() },
      ton: { t: 'Ton', ico: 'ton', d: 'Generează un ton (o notă) la cursor', fn: () => dialogTon() },
      inserareFisier: { t: 'Inserare fișier', ico: 'inserareFisier', d: 'Pune alt fișier audio la cursor, după sunetul existent (unul după altul)', fn: () => adaugaFisier('inserare') },
      mixareFisier: { t: 'Mixare fișier', ico: 'mixareFisier', d: 'Suprapune alt fișier audio peste pista curentă, de la cursor (unul peste altul)', fn: () => adaugaFisier('mixare') },
      anulare: { t: 'Anulare', ico: 'anulare', d: 'Anulează ultima modificare (Ctrl+Z)', cere: 'undo', fn: () => anulare() },
      refacere: { t: 'Refacere', ico: 'refacere', d: 'Reface modificarea anulată (Ctrl+Y)', cere: 'redo', fn: () => refacere() },
      amplificare: { t: 'Amplificare', ico: 'amplificare', d: 'Sunet mai tare sau mai încet, în decibeli (dB)', cere: 'sunet', fn: () => dialogAmplificare() },
      normalizare: { t: 'Normalizare', ico: 'normalizare', d: 'Partea cea mai tare ajunge la nivelul maxim ales', cere: 'sunet', fn: () => dialogNormalizare() },
      fadeIn: { t: 'Estompare la intrare', ico: 'fadeIn', d: 'Fade In: sunetul pornește încet și crește treptat', cere: 'sunet', fn: () => efect('Estompare la intrare', (c) => { const L = c.length; for (let i = 0; i < L; i++) c[i] *= i / L; return c; }) },
      fadeOut: { t: 'Estompare la ieșire', ico: 'fadeOut', d: 'Fade Out: sunetul scade treptat până la liniște', cere: 'sunet', fn: () => efect('Estompare la ieșire', (c) => { const L = c.length; for (let i = 0; i < L; i++) c[i] *= 1 - i / L; return c; }) },
      inversare: { t: 'Inversare', ico: 'inversare', d: 'Sunetul de-a-ndoaselea (de la sfârșit la început)', cere: 'sunet', fn: () => efect('Inversare', (c) => c.reverse()) },
      ecou: { t: 'Ecou', ico: 'ecou', d: 'Sunetul se repetă, tot mai încet', cere: 'sunet', fn: () => dialogEcou() },
      viteza: { t: 'Viteză', ico: 'viteza', d: 'Schimbarea vitezei (ca la o casetă: și tonul se schimbă)', cere: 'sunet', fn: () => dialogViteza() },
    };
    const FILE = {
      acasa: { t: 'Acasă', grupe: [['Fișier', ['nou', 'deschide', 'salveaza', 'exporta']], ['Înregistrare', ['inregistreaza']], ['Editare', ['decupare', 'copiere', 'lipire', 'stergere']], ['Istoric', ['anulare', 'refacere']]] },
      editare: { t: 'Editare', grupe: [['Clipboard', ['decupare', 'copiere', 'lipire', 'lipireMix']], ['Selecție', ['stergere', 'trunchiere', 'selTot']], ['Inserare', ['liniste', 'ton']], ['Istoric', ['anulare', 'refacere']]] },
      nivel: { t: 'Nivel', grupe: [['Volum', ['amplificare', 'normalizare']], ['Estompare', ['fadeIn', 'fadeOut']]], tinta: true },
      efecte: { t: 'Efecte', grupe: [['Efecte', ['ecou', 'viteza', 'inversare']]], tinta: true },
      surse: { t: 'Surse', grupe: [['Alt sunet', ['inserareFisier', 'mixareFisier', 'inregistreaza']], ['Din clipboard', ['lipire', 'lipireMix']]], sfat: 'Unul după altul: Inserare. Unul peste altul (muzică sub voce): Mixare. Micșorează volumul muzicii la 20–30%.' },
    };
    const butoane = []; // [buton, cheie acțiune]
    function buton(k, mic = false) {
      const a = A[k];
      const b = h('button', { type: 'button', class: `ap-audio-b${mic ? ' mic' : ''}${a.cls ? ` ${a.cls}` : ''}`, title: a.d, 'aria-label': a.t, onmousedown: (e) => e.preventDefault(), onclick: () => a.fn() }, ic(a.ico), mic ? null : h('span', {}, a.t));
      butoane.push([b, k]);
      return b;
    }
    const tinta = h('span', { class: 'ap-audio-tinta' });
    function deseneazaPanglica() {
      for (let i = butoane.length - 1; i >= 0; i--) if (!butoane[i][0].isConnected || panglica.contains(butoane[i][0])) butoane.splice(i, 1);
      const f = FILE[S.fila];
      umple(panglica, f.grupe.map(([t, ks]) => h('div', { class: 'ap-audio-grupa' }, h('div', { class: 'ap-audio-gbut' }, ks.map((k) => buton(k))), h('span', { class: 'ap-audio-geticheta' }, t))),
        f.tinta ? tinta : null, f.sfat ? h('span', { class: 'ap-audio-sfat' }, f.sfat) : null);
      for (const b of file.querySelectorAll('[data-f]')) b.setAttribute('aria-selected', String(b.dataset.f === S.fila));
      actualizeaza();
    }
    umple(file,
      h('button', { type: 'button', class: 'ap-audio-fila fisier', onclick: () => panouFisier() }, 'Fișier'),
      Object.entries(FILE).map(([k, f]) => h('button', { type: 'button', role: 'tab', class: 'ap-audio-fila', 'data-f': k, onclick: () => { S.fila = k; deseneazaPanglica(); } }, f.t)));

    // Bara de redare
    const tr = (ico, t, fn, cls = '') => h('button', { type: 'button', class: `ap-audio-t ${cls}`, title: t, 'aria-label': t, onmousedown: (e) => e.preventDefault(), onclick: fn }, ic(ico));
    const bRedare = tr('redare', 'Redare / Pauză (Spațiu)', () => comutaRedare(), 'mare');
    const bRedareSel = tr('redareSel', 'Redă doar selecția', () => reda(true));
    const bInreg = tr('inregistreaza', 'Înregistrare cu microfonul', () => inregistreaza(), 'rosu');
    const redareEl = h('div', { class: 'ap-audio-redare' },
      h('div', { class: 'ap-audio-tgrup' },
        tr('inceput', 'La început (Home)', () => mutaCursor(0)),
        bRedare, bRedareSel,
        tr('oprire', 'Oprire', () => oprire()),
        tr('sfarsit', 'La sfârșit (End)', () => mutaCursor(n())),
        bInreg),
      timpMare, infoSel,
      h('div', { class: 'ap-audio-tgrup zoom' },
        tr('zoomMinus', 'Micșorare', () => zoom(2)),
        tr('zoomPlus', 'Mărire (vezi detaliile undei)', () => zoom(0.5)),
        tr('zoomSel', 'Mărește selecția', () => zoomSel()),
        tr('potrivire', 'Tot sunetul pe ecran', () => potriveste()),
        infoZoom));
    umple(app, bara, file, panglica, h('div', { class: 'ap-audio-pista' }, zona, derulare), redareEl, stare);

    // Bara de predare la sarcină (apare doar pentru elevi, când există o sarcină activă)
    if (window.EduSarcini?.bara) {
      try {
        const b = await window.EduSarcini.bara('audio', async () => lucrare());
        if (b instanceof Node) bara.after(b);
      } catch { /* fără bară */ }
    }
    show(h('div', { class: 'lab-ecran' }, app));
    document.title = 'Editor audio – edudigi';

    // ---------- Mesaje și dialoguri ----------
    function toast(text, tip = '') {
      app.querySelector('.ap-audio-toast')?.remove();
      const t = h('div', { class: `ap-audio-toast ${tip}`, role: 'status' }, text);
      app.append(t);
      setTimeout(() => t.classList.add('gone'), tip === 'error' ? 5000 : 2800);
      setTimeout(() => t.remove(), tip === 'error' ? 5600 : 3400);
    }
    let dlgDeschis = 0;
    // Dialog modal: rezolvă cu valoarea butonului apăsat (null la Esc / Renunță).
    function dialog(titlu, corp, btns = [{ t: 'OK', v: true, p: true }], { lat = false, laDeschidere } = {}) {
      return new Promise((resolve) => {
        dlgDeschis++;
        const inchide = (v) => { fundal.remove(); dlgDeschis--; resolve(v); };
        const bs = btns.map((b) => h('button', { type: 'button', class: `ap-audio-db${b.p ? ' p' : ''}`, onclick: async () => {
          if (b.verifica && !(await b.verifica())) return;
          inchide(typeof b.v === 'function' ? b.v() : b.v);
        } }, b.t));
        const cutie = h('div', { class: `ap-audio-dlg${lat ? ' lat' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
          h('div', { class: 'ap-audio-dcap' }, h('b', {}, titlu), h('button', { type: 'button', class: 'ap-audio-x', 'aria-label': 'Închide', onclick: () => inchide(null) }, '✕')),
          h('div', { class: 'ap-audio-dcorp' }, corp),
          bs.length ? h('div', { class: 'ap-audio-dbut' }, bs) : null);
        const fundal = h('div', { class: 'ap-audio-fundal' }, cutie);
        fundal.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Escape') inchide(null);
          else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const p = btns.findIndex((b) => b.p); if (p >= 0) bs[p].click(); }
        });
        fundal.addEventListener('mousedown', (e) => { if (e.target === fundal) inchide(null); });
        app.append(fundal);
        laDeschidere?.(inchide);
        (cutie.querySelector('input:not([type=radio]), select') || cutie.querySelector('.ap-audio-db.p') || cutie.querySelector('button')).focus();
      });
    }
    // Un rând cu glisor și câmp numeric legate între ele.
    function glisor(eticheta, min, max, pas, val, unit, laSchimbare) {
      const r = h('input', { type: 'range', min, max, step: pas, value: val });
      const t = h('input', { type: 'number', min, max, step: pas, value: val, class: 'ap-audio-nr' });
      const sincr = (din, spre) => { spre.value = din.value; laSchimbare?.(Number(din.value)); };
      r.addEventListener('input', () => sincr(r, t));
      t.addEventListener('input', () => { if (t.value !== '') sincr(t, r); });
      const el = h('label', { class: 'ap-audio-gl' }, h('span', {}, eticheta), r, t, h('span', { class: 'u' }, unit));
      el.valoare = () => Math.min(max, Math.max(min, Number(t.value) || 0));
      laSchimbare?.(val);
      return el;
    }
    const tintaText = () => (S.sel ? `selecția (${nr((S.sel.b - S.sel.a) / S.rata, 2)} s)` : 'tot sunetul');

    // ---------- Istoric (Anulare / Refacere) ----------
    // Fiecare operație creează tablouri noi, așa că istoricul păstrează doar referințe.
    const instantaneu = (et) => ({ canale: S.canale, rata: S.rata, sel: S.sel, cursor: S.cursor, et });
    function seteaza(canale, { sel = null, cursor = S.cursor, et = 'Modificare', rata = S.rata } = {}) {
      S.istoric.push(instantaneu(et));
      S.refacere = [];
      let total = 0;
      for (let i = S.istoric.length - 1; i >= 0; i--) {
        total += S.istoric[i].canale.length * (S.istoric[i].canale[0]?.length || 0);
        if (total > MAX_UNDO_ESANT || S.istoric.length - i > MAX_UNDO) { S.istoric.splice(0, i + 1); break; }
      }
      S.canale = canale;
      S.rata = rata;
      S.sel = sel;
      S.cursor = Math.min(cursor, canale[0]?.length || 0);
      dupaModificare();
    }
    function restaureaza(din, spre) {
      const x = din.pop();
      if (!x) return;
      oprireRedare();
      spre.push(instantaneu(x.et));
      Object.assign(S, { canale: x.canale, rata: x.rata, sel: x.sel, cursor: x.cursor });
      dupaModificare();
      return x.et;
    }
    function anulare() { const et = restaureaza(S.istoric, S.refacere); if (et) toast(`Anulat: ${et}`); }
    function refacere() { const et = restaureaza(S.refacere, S.istoric); if (et) toast(`Refăcut: ${et}`); }
    function dupaModificare() {
      oprireRedare();
      limiteazaVedere();
      if (S.potrivit || S.spp * latime() > n() * 1.05 + 10) potriveste(false); // dacă se vedea tot sunetul, rămâne tot pe ecran
      deseneaza();
      programeazaSalvare();
    }

    // ---------- Editare ----------
    const zonaLucru = () => (S.sel ? [S.sel.a, S.sel.b] : [0, n()]);
    const faraSunet = () => { if (!n()) { toast('Încă nu ai niciun sunet. Înregistrează sau deschide un fișier.'); return true; } return false; };
    const faraSel = () => { if (!S.sel) { toast('Selectează mai întâi o porțiune: trage cu mouse-ul (sau cu degetul) pe forma de undă.'); return true; } return false; };
    function copiere() {
      if (faraSel()) return;
      S.clip = { canale: S.canale.map((c) => c.slice(S.sel.a, S.sel.b)), rata: S.rata };
      actualizeaza();
      toast(`Copiat: ${nr((S.sel.b - S.sel.a) / S.rata, 2)} s`);
    }
    function decupare() {
      if (faraSel()) return;
      const { a, b } = S.sel;
      S.clip = { canale: S.canale.map((c) => c.slice(a, b)), rata: S.rata };
      seteaza(S.canale.map((c) => lipeste([c.subarray(0, a), c.subarray(b)])), { cursor: a, et: 'Decupare' });
    }
    function stergere() {
      if (faraSel()) return;
      const { a, b } = S.sel;
      seteaza(S.canale.map((c) => lipeste([c.subarray(0, a), c.subarray(b)])), { cursor: a, et: 'Ștergere' });
    }
    function trunchiere() {
      if (faraSel()) return;
      const { a, b } = S.sel;
      seteaza(S.canale.map((c) => c.slice(a, b)), { cursor: 0, et: 'Trunchiere' });
      potriveste();
    }
    function selecteaza(a, b) {
      if (!n()) return;
      S.sel = b - a > 0 ? { a, b } : null;
      S.cursor = a;
      deseneazaOv();
      actualizeaza();
    }
    // Aduce un sunet la rata și canalele proiectului.
    async function potrivesteSursa(src) {
      const nc = n() ? S.canale.length : src.canale.length;
      const rata = n() ? S.rata : src.rata;
      return { rata, canale: await reesantioneaza(src.canale, src.rata, rata, nc) };
    }
    // Inserează (unul după altul) la cursor; dacă există selecție, o înlocuiește.
    async function insereaza(src, et, inlocuieste = false) {
      const s = await potrivesteSursa(src);
      if (!n()) { seteaza(s.canale.map((c) => c.slice()), { rata: s.rata, cursor: 0, et }); potriveste(); return; }
      const [a, b] = S.sel ? (inlocuieste ? [S.sel.a, S.sel.b] : [S.sel.a, S.sel.a]) : [S.cursor, S.cursor];
      if ((n() - (b - a) + s.canale[0].length) / S.rata > MAX_SEC) return toast(`Sunetul ar depăși ${MAX_SEC / 60} minute. Scurtează-l mai întâi.`, 'error');
      const L = s.canale[0].length;
      seteaza(S.canale.map((c, i) => lipeste([c.subarray(0, a), s.canale[i], c.subarray(b)])), { sel: { a, b: a + L }, cursor: a, et });
    }
    // Suprapune (unul peste altul) de la cursor, cu volumul ales.
    async function mixeaza(src, volum, et) {
      const s = await potrivesteSursa(src);
      if (!n()) return insereaza(src, et);
      const a = S.sel ? S.sel.a : S.cursor;
      const L = s.canale[0].length;
      const total = Math.max(n(), a + L);
      if (total / S.rata > MAX_SEC) return toast(`Sunetul ar depăși ${MAX_SEC / 60} minute.`, 'error');
      const noi = S.canale.map((c, i) => {
        const o = new Float32Array(total);
        o.set(c);
        const x = s.canale[i];
        for (let k = 0; k < L; k++) o[a + k] += x[k] * volum;
        return o;
      });
      seteaza(noi, { sel: { a, b: a + L }, cursor: a, et });
      if (varf(noi, a, a + L) > 1) toast('Atenție: în unele locuri sunetul depășește 100% (apare cu roșu). Micșorează volumul cu Amplificare.', 'warn');
    }
    function lipire() {
      if (!S.clip) return toast('Copiază sau decupează mai întâi o porțiune (Ctrl+C sau Ctrl+X).');
      insereaza(S.clip, 'Lipire', true);
    }
    async function lipireCombinata() {
      if (!S.clip) return toast('Copiază mai întâi sunetul pe care vrei să-l suprapui (Ctrl+C).');
      const v = await dialogVolumMix('Lipire combinată');
      if (v != null) mixeaza(S.clip, v, 'Lipire combinată');
    }
    function dialogVolumMix(titlu, nume) {
      const g = glisor('Volumul sunetului adăugat', 5, 150, 5, 100, '%');
      return dialog(titlu, [
        nume ? h('p', {}, 'Sunet adăugat: ', h('b', {}, nume)) : null,
        h('p', { class: 'ap-audio-expl' }, `Sunetul se suprapune peste pista ta, începând de la ${S.sel ? 'începutul selecției' : 'cursor'} (${fmtTimp((S.sel ? S.sel.a : S.cursor) / S.rata)}). Pentru muzică de fond sub voce, alege 20–30%.`),
        g], [{ t: 'Renunță', v: null }, { t: 'Mixează', v: () => g.valoare() / 100, p: true }]);
    }
    // Aplică o funcție pe porțiunea de lucru (selecția sau tot), pe fiecare canal.
    function efect(et, fn) {
      if (faraSunet()) return;
      const [a, b] = zonaLucru();
      if (b - a < 2) return;
      let L = 0;
      const noi = S.canale.map((c) => {
        const mij = fn(c.slice(a, b), c, a, b);
        L = mij.length;
        return a === 0 && b === c.length ? mij : lipeste([c.subarray(0, a), mij, c.subarray(b)]);
      });
      seteaza(noi, { sel: S.sel ? { a, b: a + L } : null, cursor: S.sel ? a : S.cursor, et });
      toast(`${et}: aplicat pe ${S.sel ? 'selecție' : 'tot sunetul'}.`);
    }
    async function dialogAmplificare() {
      if (faraSunet()) return;
      const [a, b] = zonaLucru();
      const v = varf(S.canale, a, b);
      const info = h('p', { class: 'ap-audio-expl' });
      const g = glisor('Amplificare', -24, 24, 0.5, 6, 'dB', (db) => {
        const f = 10 ** (db / 20);
        info.textContent = `${db > 0 ? 'Mai tare' : db < 0 ? 'Mai încet' : 'La fel'}: volumul devine ${Math.round(f * 100)}% din cel de acum.${v * f > 1 ? ' Atenție: partea cea mai tare va depăși 100% și se va distorsiona!' : ''}`;
        info.classList.toggle('rau', v * f > 1);
      });
      const db = await dialog('Amplificare', [h('p', {}, 'Se aplică pe ', h('b', {}, tintaText()), '.'), g, info,
        h('p', { class: 'ap-audio-expl mic' }, '+6 dB ≈ de două ori mai tare (200%), −6 dB ≈ la jumătate (50%).')], [{ t: 'Renunță', v: null }, { t: 'Aplică', v: () => g.valoare(), p: true }]);
      if (db == null) return;
      const f = 10 ** (db / 20);
      efect(`Amplificare ${db > 0 ? '+' : ''}${nr(db)} dB`, (c) => { for (let i = 0; i < c.length; i++) c[i] *= f; return c; });
    }
    async function dialogNormalizare() {
      if (faraSunet()) return;
      const [a, b] = zonaLucru();
      const v = varf(S.canale, a, b);
      if (v < 1e-5) return toast('Aici e doar liniște: nu am ce normaliza.');
      const g = glisor('Nivelul maxim', 10, 100, 1, 98, '%');
      const p = await dialog('Normalizare', [h('p', {}, 'Se aplică pe ', h('b', {}, tintaText()), '.'),
        h('p', { class: 'ap-audio-expl' }, `Acum, partea cea mai tare este la ${Math.round(v * 100)}%. Normalizarea mărește (sau micșorează) la fel tot sunetul, până când partea cea mai tare ajunge la nivelul ales, fără distorsiuni.`), g],
      [{ t: 'Renunță', v: null }, { t: 'Normalizează', v: () => g.valoare(), p: true }]);
      if (p == null) return;
      const f = p / 100 / v;
      efect('Normalizare', (c) => { for (let i = 0; i < c.length; i++) c[i] *= f; return c; });
    }
    async function dialogEcou() {
      if (faraSunet()) return;
      const gi = glisor('Întârziere', 50, 1000, 10, 300, 'ms');
      const gd = glisor('Intensitate', 10, 80, 5, 45, '%');
      const r = await dialog('Ecou', [h('p', {}, 'Se aplică pe ', h('b', {}, tintaText()), '.'),
        h('p', { class: 'ap-audio-expl' }, 'Sunetul se repetă după „întârziere”, de fiecare dată mai încet. Întârziere mare = sală foarte mare sau munte.'), gi, gd],
      [{ t: 'Renunță', v: null }, { t: 'Aplică', v: () => [gi.valoare(), gd.valoare()], p: true }]);
      if (!r) return;
      const d = Math.max(1, Math.round(r[0] / 1000 * S.rata)), g = r[1] / 100;
      efect('Ecou', (c) => { for (let i = d; i < c.length; i++) c[i] += g * c[i - d]; return c; });
    }
    async function dialogViteza() {
      if (faraSunet()) return;
      const [a, b] = zonaLucru();
      const info = h('p', { class: 'ap-audio-expl' });
      const g = glisor('Viteza', 50, 200, 5, 150, '%', (p) => {
        info.textContent = `Durata devine ${nr((b - a) / S.rata / (p / 100), 2)} s (acum ${nr((b - a) / S.rata, 2)} s). ${p > 100 ? 'Mai repede: vocea devine mai subțire.' : p < 100 ? 'Mai încet: vocea devine mai groasă.' : ''}`;
      });
      const p = await dialog('Schimbarea vitezei', [h('p', {}, 'Se aplică pe ', h('b', {}, tintaText()), '.'), g, info],
        [{ t: 'Renunță', v: null }, { t: 'Aplică', v: () => g.valoare(), p: true }]);
      if (p == null || p === 100) return;
      if ((n() - (b - a) + (b - a) * 100 / p) / S.rata > MAX_SEC) return toast('Sunetul ar deveni prea lung.', 'error');
      efect(`Viteză ${p}%`, (c) => liniar(c, 100 / p));
    }
    async function dialogLiniste() {
      const g = glisor('Durata', 0.1, 30, 0.1, 1, 's');
      const d = await dialog('Inserare liniște', [h('p', { class: 'ap-audio-expl' }, `Liniștea se pune la ${S.sel ? 'începutul selecției' : 'cursor'} (${fmtTimp((S.sel ? S.sel.a : S.cursor) / S.rata)}). Pe forma de undă apare ca o linie dreaptă.`), g],
        [{ t: 'Renunță', v: null }, { t: 'Inserează', v: () => g.valoare(), p: true }]);
      if (d == null) return;
      const rata = n() ? S.rata : ctxAudio().sampleRate;
      const L = Math.round(d * rata);
      if (S.sel) { S.cursor = S.sel.a; S.sel = null; } // liniștea se inserează, nu înlocuiește selecția
      insereaza({ rata, canale: (n() ? S.canale : [0]).map(() => new Float32Array(L)) }, 'Inserare liniște');
    }
    async function dialogTon() {
      const gf = glisor('Frecvența', 50, 2000, 10, 440, 'Hz');
      const gd = glisor('Durata', 0.1, 10, 0.1, 1, 's');
      const gv = glisor('Volumul', 5, 100, 5, 50, '%');
      const r = await dialog('Generare ton', [h('p', { class: 'ap-audio-expl' }, 'Un ton este o undă sinusoidală: frecvența mare = sunet subțire (înalt), frecvența mică = sunet gros (jos). Nota La are 440 Hz.'), gf, gd, gv],
        [{ t: 'Renunță', v: null }, { t: 'Generează', v: () => [gf.valoare(), gd.valoare(), gv.valoare()], p: true }]);
      if (!r) return;
      const rata = n() ? S.rata : ctxAudio().sampleRate;
      const L = Math.round(r[1] * rata), c = new Float32Array(L), fade = Math.min(L / 2, rata * 0.01);
      for (let i = 0; i < L; i++) c[i] = Math.sin(2 * Math.PI * r[0] * i / rata) * r[2] / 100 * Math.min(1, i / fade, (L - i) / fade);
      if (S.sel) { S.cursor = S.sel.a; S.sel = null; }
      insereaza({ rata, canale: [c] }, 'Ton');
    }

    // ---------- Deschidere fișiere ----------
    const ACCEPT = 'audio/*,.mp3,.wav,.ogg,.oga,.m4a,.webm,.flac';
    async function citesteFisier(f) {
      if (!f) return null;
      if (f.size > 200 * 1048576) { toast('Fișierul e prea mare (peste 200 MB).', 'error'); return null; }
      stareSalv.textContent = 'Se citește fișierul…';
      try {
        const s = await decodeaza(await f.arrayBuffer());
        if (!s.canale[0]?.length) throw new Error('gol');
        if (s.canale[0].length / s.rata > MAX_SEC) {
          toast(`Fișierul durează ${fmtTimp(s.canale[0].length / s.rata, 0)}. Păstrez doar primele ${MAX_SEC / 60} minute.`, 'warn');
          s.canale = s.canale.map((c) => c.slice(0, MAX_SEC * s.rata));
        }
        return s;
      } catch {
        toast(`Nu am putut citi „${f.name}”. Folosește un fișier audio MP3, WAV sau OGG.`, 'error');
        return null;
      } finally { afiseazaSalvare(); }
    }
    const numeFara = (f) => f.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Sunet';
    async function deschideFisier(f) {
      f = f || await alegeFisier(ACCEPT);
      const s = await citesteFisier(f);
      if (!s) return;
      await inchideProiect();
      S.titlu = await numeLiber(numeFara(f));
      S.istoric = []; S.refacere = [];
      S.rata = s.rata; S.canale = s.canale; S.sel = null; S.cursor = 0;
      potriveste(false);
      dupaModificare();
      afiseazaTitlu();
      toast(`Deschis: ${f.name} (${fmtTimp(sec(), 1)}, ${s.canale.length === 2 ? 'stereo' : 'mono'})`);
    }
    async function adaugaFisier(mod, f) {
      f = f || await alegeFisier(ACCEPT);
      if (!f) return;
      const s = await citesteFisier(f);
      if (!s) return;
      if (mod === 'inserare') return insereaza(s, `Inserare „${numeFara(f)}”`);
      const v = await dialogVolumMix('Mixare fișier', f.name);
      if (v != null) mixeaza(s, v, `Mixare „${numeFara(f)}”`);
    }
    // Când există deja sunet, întreabă unde se pune sunetul nou (fișier tras în fereastră sau înregistrare).
    async function aseaza(s, eticheta, numeSursa) {
      if (!n()) return insereaza(s, eticheta);
      const r = await dialog('Unde pun sunetul nou?', [
        h('p', {}, `Sunetul nou durează ${nr(s.canale[0].length / s.rata, 1)} s. Pista ta are deja ${nr(sec(), 1)} s.`),
        h('p', { class: 'ap-audio-expl' }, `Cursorul este la ${fmtTimp((S.sel ? S.sel.a : S.cursor) / S.rata)}.`)],
      [{ t: 'Renunță', v: null }, { t: 'Înlocuiește tot', v: 'tot' }, { t: 'Mixează la cursor', v: 'mix' }, { t: 'Inserează la cursor', v: 'ins', p: true }]);
      if (r === 'ins') return insereaza(s, eticheta);
      if (r === 'mix') { const v = await dialogVolumMix('Mixare', numeSursa); if (v != null) mixeaza(s, v, eticheta); }
      if (r === 'tot') { const c = await reesantioneaza(s.canale, s.rata, S.rata, S.canale.length); seteaza(c, { cursor: 0, et: eticheta }); potriveste(); }
    }
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('peste'); }, { signal: ac.signal });
    zona.addEventListener('dragleave', () => zona.classList.remove('peste'), { signal: ac.signal });
    zona.addEventListener('drop', async (e) => {
      e.preventDefault();
      zona.classList.remove('peste');
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      if (!n()) return deschideFisier(f);
      const s = await citesteFisier(f);
      if (s) aseaza(s, `Adăugare „${numeFara(f)}”`, f.name);
    }, { signal: ac.signal });

    // ---------- Înregistrare cu microfonul ----------
    async function inregistreaza() {
      if (S.inregistrare) return;
      oprireRedare();
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        return dialog('Înregistrarea nu merge aici', h('p', {}, 'Browserul nu permite înregistrarea pe această pagină. Deschide site-ul prin https:// într-un browser actual (Chrome, Edge, Firefox).'));
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        const refuz = e.name === 'NotAllowedError' || e.name === 'SecurityError';
        return dialog(refuz ? 'Nu am voie să folosesc microfonul' : 'Nu găsesc microfonul', refuz
          ? [h('p', {}, 'Accesul la microfon a fost refuzat.'),
            h('ol', {}, h('li', {}, 'Apasă pe iconița din stânga adresei (lacătul sau reglajele) din bara browserului.'),
              h('li', {}, 'La „Microfon”, alege „Permite”.'), h('li', {}, 'Apasă din nou butonul roșu Înregistrare.')),
            h('p', { class: 'ap-audio-expl' }, 'Poți lucra și fără microfon: deschide un fișier audio sau generează un ton (fila Editare).')]
          : [h('p', {}, e.name === 'NotReadableError' ? 'Microfonul este folosit de altă aplicație. Închide-o și încearcă din nou.' : 'Nu am găsit niciun microfon conectat. Conectează unul (sau căștile cu microfon) și încearcă din nou.')]);
      }
      const c = ctxAudio();
      const rec = new MediaRecorder(stream);
      const bucati = [];
      rec.ondataavailable = (e) => { if (e.data.size) bucati.push(e.data); };
      const an = c.createAnalyser();
      an.fftSize = 1024;
      const sursa = c.createMediaStreamSource(stream);
      sursa.connect(an);
      const date = new Float32Array(an.fftSize);
      const nivel = h('i', {});
      const ceas = h('b', { class: 'ap-audio-ceas' }, '0:00,0');
      const t0 = performance.now();
      let raf = 0, inchideDlg = null;
      S.inregistrare = { rec };
      actualizeaza();
      const bucla = () => {
        an.getFloatTimeDomainData(date);
        let m = 0;
        for (const x of date) m = Math.max(m, Math.abs(x));
        nivel.style.width = `${Math.min(100, m * 100)}%`;
        nivel.classList.toggle('tare', m > 0.95);
        const t = (performance.now() - t0) / 1000;
        ceas.textContent = fmtTimp(t, 1);
        if (t > MAX_SEC - 1 && inchideDlg) inchideDlg('stop');
        raf = requestAnimationFrame(bucla);
      };
      rec.start(250);
      raf = requestAnimationFrame(bucla);
      const gata = new Promise((res) => { rec.onstop = res; });
      const r = await dialog('Înregistrare', [
        h('div', { class: 'ap-audio-rec' }, h('span', { class: 'ap-audio-punct', 'aria-hidden': 'true' }), ceas),
        h('div', { class: 'ap-audio-nivel', 'aria-hidden': 'true' }, nivel),
        h('p', { class: 'ap-audio-expl' }, 'Vorbește în microfon. Bara arată cât de tare se aude; dacă devine roșie, vorbește mai încet sau mai departe de microfon.')],
      [{ t: 'Renunță', v: null }, { t: '■ Oprește', v: 'stop', p: true }], { laDeschidere: (f) => { inchideDlg = f; } });
      cancelAnimationFrame(raf);
      try { rec.stop(); } catch { /* deja oprit */ }
      await gata;
      stream.getTracks().forEach((t) => t.stop());
      sursa.disconnect();
      S.inregistrare = null;
      actualizeaza();
      if (r !== 'stop') return;
      const blob = new Blob(bucati, { type: rec.mimeType || 'audio/webm' });
      try {
        const s = await decodeaza(await blob.arrayBuffer());
        if (!s.canale[0]?.length) throw new Error('gol');
        await aseaza({ rata: s.rata, canale: potrivesteCanale(s.canale, 1) }, 'Înregistrare', 'înregistrarea ta');
      } catch {
        toast('Înregistrarea nu a putut fi citită. Încearcă din nou.', 'error');
      }
    }

    // ---------- Redare (AudioBufferSourceNode) ----------
    let bufCache = null;
    function audioBuffer() {
      if (bufCache && bufCache.canale === S.canale) return bufCache.b;
      const b = ctxAudio().createBuffer(S.canale.length, n(), S.rata);
      S.canale.forEach((c, i) => b.copyToChannel(c, i));
      bufCache = { canale: S.canale, b };
      return b;
    }
    const pozitie = () => (S.redare ? Math.min(S.redare.b, S.redare.a + (ctxAudio().currentTime - S.redare.t0) * S.rata) : S.cursor);
    function reda(doarSel, de) {
      if (faraSunet() || S.inregistrare) return;
      if (doarSel && faraSel()) return;
      oprireRedare();
      let a = de ?? S.cursor, b = n();
      if (doarSel) { a = S.sel.a; b = S.sel.b; } else if (a >= n() - 1) a = 0;
      const c = ctxAudio();
      const src = c.createBufferSource();
      src.buffer = audioBuffer();
      src.connect(c.destination);
      const t0 = c.currentTime + 0.02;
      src.start(t0, a / S.rata, (b - a) / S.rata);
      S.redare = { src, a, b, t0, pornire: a };
      src.onended = () => { if (S.redare?.src === src) { S.redare = null; actualizeaza(); deseneazaOv(); } };
      actualizeaza();
      animatie();
    }
    function oprireRedare() {
      if (!S.redare) return;
      const r = S.redare;
      S.redare = null;
      try { r.src.stop(); } catch { /* deja oprit */ }
      r.src.disconnect();
      actualizeaza();
      deseneazaOv();
    }
    function pauza() { if (!S.redare) return; S.cursor = Math.round(pozitie()); oprireRedare(); }
    function oprire() { if (S.redare) { S.cursor = S.redare.pornire; oprireRedare(); } }
    const comutaRedare = () => (S.redare ? pauza() : reda(false));
    function mutaCursor(p) {
      S.cursor = Math.max(0, Math.min(n(), p));
      S.sel = null;
      if (S.redare) reda(false, S.cursor);
      asiguraVizibil(S.cursor);
      deseneazaOv();
      actualizeaza();
    }
    let rafAnim = 0;
    function animatie() {
      cancelAnimationFrame(rafAnim);
      const pas = () => {
        if (!S.redare || !app.isConnected) return;
        const p = pozitie();
        const w = latime();
        if (p > S.vs + w * S.spp || p < S.vs) { S.vs = p - w * S.spp * 0.05; limiteazaVedere(); deseneaza(); } else deseneazaOv();
        timpMare.textContent = `${fmtTimp(p / S.rata)} / ${fmtTimp(sec())}`;
        rafAnim = requestAnimationFrame(pas);
      };
      rafAnim = requestAnimationFrame(pas);
    }

    // ---------- Forma de undă ----------
    const latime = () => Math.max(50, zona.clientWidth);
    function limiteazaVedere() {
      const w = latime();
      S.spp = Math.max(1 / 32, S.spp);
      S.vs = Math.max(0, Math.min(S.vs, n() - w * S.spp));
    }
    function potriveste(desen = true) {
      S.spp = Math.max(1 / 32, (n() || S.rata * 10) / latime());
      S.vs = 0;
      S.potrivit = true;
      if (desen) deseneaza();
    }
    function zoom(f, centru) {
      if (!n()) return;
      const w = latime();
      const c = centru ?? (S.redare ? pozitie() : S.sel ? (S.sel.a + S.sel.b) / 2 : S.cursor);
      const xc = (c - S.vs) / S.spp;
      const max = Math.max(1 / 32, n() / w);
      S.spp = Math.min(max, Math.max(1 / 32, S.spp * f));
      S.potrivit = S.spp >= max;
      S.vs = c - (xc >= 0 && xc <= w ? xc : w / 2) * S.spp;
      limiteazaVedere();
      deseneaza();
    }
    function zoomSel() {
      if (faraSel()) return;
      const L = S.sel.b - S.sel.a;
      S.spp = Math.max(1 / 32, L * 1.1 / latime());
      S.potrivit = false;
      S.vs = S.sel.a - L * 0.05;
      limiteazaVedere();
      deseneaza();
    }
    function asiguraVizibil(p) {
      const w = latime();
      if (p < S.vs || p > S.vs + w * S.spp) { S.vs = p - w * S.spp / 2; limiteazaVedere(); deseneaza(); }
    }
    // Pași pentru cronologie: cel puțin ~80 px între etichete.
    const PASI = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    function dimensiuni(c) {
      const dpr = window.devicePixelRatio || 1, w = zona.clientWidth, ht = zona.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(ht * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(ht * dpr); }
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { g, w, ht };
    }
    function deseneaza() {
      if (!app.isConnected) return;
      const { g, w, ht } = dimensiuni(cv);
      g.clearRect(0, 0, w, ht);
      const N = n(), nc = Math.max(1, S.canale.length);
      // cronologia
      g.fillStyle = '#FBF5EE';
      g.fillRect(0, 0, w, RIGLA);
      g.fillStyle = '#E8DFD3';
      g.fillRect(0, RIGLA - 1, w, 1);
      const pxSec = S.rata / S.spp;
      const pas = PASI.find((p) => p * pxSec >= 80) || 1200;
      const z = pas >= 1 ? 0 : pas >= 0.1 ? 1 : pas >= 0.01 ? 2 : 3;
      const t0 = S.vs / S.rata, t1 = t0 + w / pxSec;
      g.font = '600 11px Montserrat, system-ui, sans-serif';
      g.textBaseline = 'top';
      for (let t = Math.floor(t0 / pas) * pas; t <= t1; t += pas) {
        const x = Math.round((t - t0) * pxSec) + 0.5;
        g.fillStyle = '#B9AEA2';
        g.fillRect(x, RIGLA - 9, 1, 8);
        for (let k = 1; k < 5; k++) g.fillRect(Math.round(x + k * pas * pxSec / 5), RIGLA - 4, 1, 3);
        g.fillStyle = '#4A4440';
        if (t >= 0 && t <= N / S.rata + pas) g.fillText(fmtTimp(t + 1e-9, z), x + 3, 4);
      }
      // pistele (un canal sau două: stânga / dreapta)
      const lh = (ht - RIGLA) / nc;
      for (let ci = 0; ci < nc; ci++) {
        const y0 = RIGLA + ci * lh, mij = y0 + lh / 2, amp = lh / 2 - 3;
        g.fillStyle = ci % 2 ? '#F7FBFC' : '#FFFFFF';
        g.fillRect(0, y0, w, lh);
        g.fillStyle = 'rgba(14,127,150,.18)';
        g.fillRect(0, Math.round(y0 + 3), w, 1);
        g.fillRect(0, Math.round(y0 + lh - 3), w, 1);
        g.fillStyle = '#C9DDE2';
        g.fillRect(0, Math.round(mij), w, 1);
        if (ci) { g.fillStyle = '#E8DFD3'; g.fillRect(0, Math.round(y0), w, 1); }
        const c = S.canale[ci];
        if (c && N) {
          const xMax = Math.min(w, (N - S.vs) / S.spp);
          if (S.spp >= 1) {
            const normal = new Path2D(), rosu = new Path2D();
            for (let x = 0; x < xMax; x++) {
              const s0 = Math.floor(S.vs + x * S.spp), s1 = Math.min(N, Math.max(s0 + 1, Math.floor(S.vs + (x + 1) * S.spp)));
              let mn = Infinity, mx = -Infinity;
              for (let i = s0; i < s1; i++) { const v = c[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
              const ya = mij - Math.min(1, mx) * amp, yb = mij - Math.max(-1, mn) * amp;
              (mx > 1 || mn < -1 ? rosu : normal).rect(x, ya, 1, Math.max(1, yb - ya));
            }
            g.fillStyle = '#0E7F96';
            g.fill(normal);
            g.fillStyle = '#F21F4B';
            g.fill(rosu);
          } else {
            // zoom mare: se văd eșantioanele, unite printr-o linie
            const i0 = Math.max(0, Math.floor(S.vs)), i1 = Math.min(N - 1, Math.ceil(S.vs + w * S.spp));
            g.strokeStyle = '#0E7F96';
            g.lineWidth = 1.5;
            g.beginPath();
            for (let i = i0; i <= i1; i++) { const x = (i - S.vs) / S.spp, y = mij - Math.max(-1, Math.min(1, c[i])) * amp; if (i === i0) g.moveTo(x, y); else g.lineTo(x, y); }
            g.stroke();
            if (S.spp < 1 / 6) { g.fillStyle = '#0E7F96'; for (let i = i0; i <= i1; i++) { g.beginPath(); g.arc((i - S.vs) / S.spp, mij - Math.max(-1, Math.min(1, c[i])) * amp, 2.5, 0, 7); g.fill(); } }
          }
          if (xMax < w) { g.fillStyle = '#F4EFE9'; g.fillRect(Math.max(0, xMax), y0, w - xMax, lh); }
        }
        if (nc === 2) { g.fillStyle = '#6B6460'; g.fillText(ci ? 'Dreapta' : 'Stânga', 6, y0 + 6); }
      }
      derulare.max = String(Math.max(0, Math.round(N - w * S.spp)));
      derulare.value = String(Math.round(S.vs));
      derulare.hidden = N <= w * S.spp + 1;
      const pxs = S.rata / S.spp;
      const pe = w / pxs;
      infoZoom.textContent = N ? `pe ecran: ${pe >= 10 ? `${nr(pe, 0)} s` : pe >= 1 ? `${nr(pe, 1)} s` : `${nr(pe * 1000, pe < 0.01 ? 1 : 0)} ms`}` : '';
      deseneazaOv();
      actualizeaza();
    }
    function deseneazaOv() {
      if (!app.isConnected) return;
      const { g, w, ht } = dimensiuni(ov);
      g.clearRect(0, 0, w, ht);
      if (!n()) return;
      const X = (s) => (s - S.vs) / S.spp;
      if (S.sel) {
        const xa = Math.max(-2, X(S.sel.a)), xb = Math.min(w + 2, X(S.sel.b));
        if (xb > 0 && xa < w) {
          g.fillStyle = 'rgba(242,31,75,.16)';
          g.fillRect(xa, RIGLA, Math.max(1, xb - xa), ht - RIGLA);
          g.fillStyle = 'rgba(242,31,75,.55)';
          g.fillRect(xa, 0, Math.max(1, xb - xa), 4);
          g.fillStyle = '#C8133A';
          g.fillRect(Math.round(xa), RIGLA, 1, ht - RIGLA);
          g.fillRect(Math.round(xb), RIGLA, 1, ht - RIGLA);
        }
      }
      // cursorul de editare
      const xc = Math.round(X(S.cursor)) + 0.5;
      if (xc >= 0 && xc <= w) {
        g.strokeStyle = '#171416';
        g.setLineDash([4, 3]);
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(xc, RIGLA); g.lineTo(xc, ht); g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#171416';
        g.beginPath(); g.moveTo(xc - 5, RIGLA - 8); g.lineTo(xc + 5, RIGLA - 8); g.lineTo(xc, RIGLA - 1); g.fill();
      }
      // cursorul de redare
      if (S.redare) {
        const xp = Math.round(X(pozitie())) + 0.5;
        g.fillStyle = '#F21F4B';
        g.fillRect(xp - 1, 0, 2, ht);
        g.beginPath(); g.moveTo(xp - 6, 0); g.lineTo(xp + 6, 0); g.lineTo(xp, 9); g.fill();
      }
    }
    new ResizeObserver(() => { if (app.isConnected) { limiteazaVedere(); deseneaza(); } }).observe(zona);
    derulare.addEventListener('input', () => { S.vs = Number(derulare.value); S.potrivit = false; deseneaza(); }, { signal: ac.signal });

    // Selecția cu mouse-ul sau cu degetul
    let trag = null;
    const esantion = (e) => { const r = ov.getBoundingClientRect(); return Math.max(0, Math.min(n(), Math.round(S.vs + (e.clientX - r.left) * S.spp))); };
    ov.addEventListener('pointerdown', (e) => {
      if (!n() || e.button > 0) return;
      ov.setPointerCapture(e.pointerId);
      const s = esantion(e);
      const ancora = e.shiftKey ? (S.sel ? (Math.abs(s - S.sel.a) < Math.abs(s - S.sel.b) ? S.sel.b : S.sel.a) : S.cursor) : s;
      trag = { x: e.clientX, ancora, mutat: e.shiftKey, rigla: e.clientY - ov.getBoundingClientRect().top < RIGLA };
      if (e.shiftKey) { S.sel = { a: Math.min(ancora, s), b: Math.max(ancora, s) }; deseneazaOv(); actualizeaza(); }
    }, { signal: ac.signal });
    ov.addEventListener('pointermove', (e) => {
      if (!trag) return;
      if (!trag.mutat && Math.abs(e.clientX - trag.x) < 4) return;
      trag.mutat = true;
      const r = ov.getBoundingClientRect();
      if (e.clientX < r.left) { S.vs -= 10 * S.spp; limiteazaVedere(); deseneaza(); } else if (e.clientX > r.right) { S.vs += 10 * S.spp; limiteazaVedere(); deseneaza(); }
      const s = esantion(e);
      S.sel = s === trag.ancora ? null : { a: Math.min(trag.ancora, s), b: Math.max(trag.ancora, s) };
      S.cursor = S.sel ? S.sel.a : s;
      deseneazaOv();
      actualizeaza();
    }, { signal: ac.signal });
    const gataTrag = (e) => {
      if (!trag) return;
      const t = trag;
      trag = null;
      if (!t.mutat) {
        const s = esantion(e);
        S.sel = null;
        S.cursor = s;
        if (S.redare) reda(false, s);
        deseneazaOv();
        actualizeaza();
      } else if (S.redare && S.sel) reda(true);
    };
    ov.addEventListener('pointerup', gataTrag, { signal: ac.signal });
    ov.addEventListener('pointercancel', () => { trag = null; }, { signal: ac.signal });
    ov.addEventListener('dblclick', () => selecteaza(0, n()), { signal: ac.signal });
    ov.addEventListener('wheel', (e) => {
      if (!n()) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoom(e.deltaY > 0 ? 1.25 : 0.8, S.vs + (e.clientX - ov.getBoundingClientRect().left) * S.spp);
      else { S.vs += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * S.spp; limiteazaVedere(); deseneaza(); }
    }, { passive: false, signal: ac.signal });

    // ---------- Starea butoanelor și a barelor ----------
    function actualizeaza() {
      const are = { sunet: n() > 0, sel: !!S.sel, clip: !!S.clip, undo: S.istoric.length > 0, redo: S.refacere.length > 0 };
      for (const [b, k] of butoane) {
        const c = A[k].cere;
        b.disabled = (!!c && !are[c]) || (!!S.inregistrare && k !== 'inregistreaza');
        if (k === 'anulare') b.title = S.istoric.length ? `Anulare: ${S.istoric[S.istoric.length - 1].et} (Ctrl+Z)` : A[k].d;
        if (k === 'refacere') b.title = S.refacere.length ? `Refacere: ${S.refacere[S.refacere.length - 1].et} (Ctrl+Y)` : A[k].d;
      }
      umple(bRedare, ic(S.redare ? 'pauza' : 'redare'));
      bRedare.setAttribute('aria-label', S.redare ? 'Pauză (Spațiu)' : 'Redare (Spațiu)');
      bRedare.title = S.redare ? 'Pauză (Spațiu)' : 'Redare de la cursor (Spațiu)';
      bRedare.disabled = !are.sunet;
      bRedareSel.disabled = !are.sel;
      bInreg.disabled = !!S.inregistrare;
      timpMare.textContent = `${fmtTimp(pozitie() / S.rata)} / ${fmtTimp(sec())}`;
      infoSel.textContent = S.sel ? `Selecție: ${fmtTimp(S.sel.a / S.rata)} → ${fmtTimp(S.sel.b / S.rata)} (${nr((S.sel.b - S.sel.a) / S.rata, 2)} s)` : are.sunet ? 'Fără selecție: trage pe undă ca să selectezi' : '';
      tinta.textContent = `Se aplică pe: ${tintaText()}`;
      umple(stare,
        h('span', {}, n() ? `${S.canale.length === 2 ? 'Stereo' : 'Mono'} · ${S.rata.toLocaleString('ro-RO')} Hz · 16 biți` : 'Niciun sunet'),
        n() ? h('span', {}, `Durata: ${fmtTimp(sec())}`) : null,
        n() ? h('span', {}, `Ca WAV: ≈ ${marime(44 + n() * S.canale.length * 2)}`) : null,
        h('span', { class: 'ap-audio-spatiu' }),
        h('span', { class: 'ap-audio-taste' }, 'Spațiu: redare/pauză · Ctrl+Z: anulare · Ctrl+wheel: zoom'));
      // ecranul gol
      gol.hidden = n() > 0;
      if (!n() && !gol.firstChild) {
        umple(gol, h('div', { class: 'ap-audio-golcutie' },
          h('span', { class: 'ap-audio-golic', html: SVG(ICO.microfon) }),
          h('b', {}, 'Încă nu ai niciun sunet'),
          h('p', {}, 'Înregistrează-ți vocea, deschide un fișier audio (MP3, WAV, OGG) sau trage-l aici.'),
          h('div', { class: 'ap-audio-golbut' },
            h('button', { type: 'button', class: 'ap-audio-db p rosu', onclick: () => inregistreaza() }, '● Înregistrează'),
            h('button', { type: 'button', class: 'ap-audio-db', onclick: () => deschideFisier() }, 'Deschide un fișier audio'),
            h('button', { type: 'button', class: 'ap-audio-db', onclick: () => dialogTon() }, 'Generează un ton'))));
      }
    }

    // ---------- Proiecte: salvare, deschidere ----------
    function afiseazaTitlu() { inTitlu.value = S.titlu; afiseazaSalvare(); }
    function afiseazaSalvare(text, err = false) {
      stareSalv.textContent = text ?? (!n() ? '' : S.salvat ? 'Salvat pe acest calculator' : 'Nesalvat');
      stareSalv.classList.toggle('err', err);
    }
    function programeazaSalvare() {
      if (!n()) return;
      S.salvat = false;
      afiseazaSalvare('Se salvează…');
      clearTimeout(tSalv);
      tSalv = setTimeout(() => salveaza(), 1500);
    }
    async function salveaza(anunt = false) {
      clearTimeout(tSalv);
      tSalv = null;
      if (!n()) return;
      if (!S.id) S.id = idNou();
      const meta = { id: S.id, titlu: S.titlu, durata: sec(), rata: S.rata, nc: S.canale.length, creat: S.creat, actualizat: Date.now() };
      try {
        await store.salveaza(meta, S.canale, S.rata);
        S.salvat = true;
        afiseazaSalvare();
        if (anunt) toast('Salvat în acest browser. Ca să-l ai ca fișier: Export WAV.');
      } catch {
        afiseazaSalvare('Nesalvat!', true);
        toast('Nu am putut salva: spațiul din browser e plin. Exportă sunetul (Export WAV) și șterge proiectele vechi.', 'error');
      }
    }
    async function inchideProiect() {
      oprireRedare();
      if (tSalv) await salveaza();
      Object.assign(S, { id: null, titlu: 'Sunet nou', creat: Date.now(), canale: [], sel: null, cursor: 0, istoric: [], refacere: [], salvat: true });
    }
    async function proiectNou() {
      await inchideProiect();
      S.titlu = await numeLiber('Sunet nou');
      S.rata = actx ? actx.sampleRate : 44100;
      potriveste(false);
      afiseazaTitlu();
      deseneaza();
    }
    async function deschideProiect(id) {
      const p = await store.incarca(id);
      if (!p) return toast('Proiectul nu mai există.', 'error');
      await inchideProiect();
      Object.assign(S, { id: p.id, titlu: p.titlu, creat: p.creat, rata: p.rata, canale: p.canale, salvat: true });
      potriveste(false);
      afiseazaTitlu();
      deseneaza();
    }
    inTitlu.addEventListener('change', async () => {
      const t = inTitlu.value.trim().slice(0, 80) || 'Sunet nou';
      S.titlu = await numeLiber(t, S.id);
      inTitlu.value = S.titlu;
      if (n()) salveaza();
    }, { signal: ac.signal });
    inTitlu.addEventListener('keydown', (e) => { if (e.key === 'Enter') inTitlu.blur(); });

    async function panouFisier() {
      const lista = h('div', { class: 'ap-audio-lista' });
      let inchide = null;
      const reface = async () => {
        const toate = (await store.lista()).sort((a, b) => b.actualizat - a.actualizat);
        umple(lista, toate.length ? toate.map((p) => h('div', { class: `ap-audio-proiect${p.id === S.id ? ' curent' : ''}` },
          h('button', { type: 'button', class: 'ap-audio-pdeschide', onclick: async () => { inchide(null); if (p.id !== S.id) deschideProiect(p.id); } },
            h('b', {}, p.titlu), h('span', {}, `${fmtTimp(p.durata || 0, 1)} · ${p.nc === 2 ? 'stereo' : 'mono'} · ${cand(p.actualizat)}${p.id === S.id ? ' · deschis acum' : ''}`)),
          h('button', { type: 'button', class: 'ap-audio-link', onclick: async () => {
            const t = prompt('Numele nou:', p.titlu);
            if (!t || !t.trim()) return;
            const nou = await numeLiber(t.trim().slice(0, 80), p.id);
            await store.redenumeste(p.id, nou);
            if (p.id === S.id) { S.titlu = nou; afiseazaTitlu(); }
            reface();
          } }, 'Redenumește'),
          h('button', { type: 'button', class: 'ap-audio-link', onclick: async () => {
            if (!confirm(`Ștergi „${p.titlu}”? Nu poate fi recuperat.`)) return;
            await store.sterge(p.id);
            if (p.id === S.id) { S.id = null; S.salvat = false; afiseazaSalvare('Nesalvat'); }
            reface();
          } }, 'Șterge')))
          : h('p', { class: 'ap-audio-expl' }, 'Încă nu ai proiecte salvate. Proiectul se salvează singur după ce ai un sunet.'));
      };
      await reface();
      const act = (k, fn) => h('button', { type: 'button', class: 'ap-audio-fact', disabled: A[k].cere === 'sunet' && !n(), onclick: () => { inchide(null); (fn || A[k].fn)(); } }, ic(A[k].ico), h('span', {}, h('b', {}, A[k].t), h('small', {}, A[k].d)));
      await dialog('Fișier', h('div', { class: 'ap-audio-panou' },
        h('div', { class: 'ap-audio-pact' }, act('nou'), act('deschide'), act('salveaza'), act('exporta'), act('inserareFisier'), act('mixareFisier')),
        h('div', {}, h('h3', {}, 'Proiectele mele'), lista,
          h('p', { class: 'ap-audio-expl mic' }, 'Proiectele se păstrează în acest browser, pe acest calculator. Ca să iei sunetul cu tine sau să-l trimiți, folosește Export WAV.'))),
      [], { lat: true, laDeschidere: (f) => { inchide = f; } });
    }

    // ---------- Export WAV ----------
    async function dialogExport() {
      if (faraSunet()) return;
      oprireRedare();
      const nc = S.canale.length, L = sec();
      const opt = [
        { k: 'orig', t: `Ca în proiect: ${nc === 2 ? 'stereo' : 'mono'}, ${S.rata.toLocaleString('ro-RO')} Hz`, rata: S.rata, nc },
        nc === 2 ? { k: 'mono', t: `Mono, ${S.rata.toLocaleString('ro-RO')} Hz`, rata: S.rata, nc: 1 } : null,
        S.rata > 22050 ? { k: 'mic', t: 'Mono, 22 050 Hz: fișier mai mic (bun pentru voce)', rata: 22050, nc: 1 } : null,
      ].filter(Boolean);
      const mare = 44 + L * S.rata * nc * 2 > 25 * 1048576;
      let ales = mare && opt.length > 1 ? opt[opt.length - 1].k : 'orig';
      const radios = opt.map((o) => h('label', { class: 'ap-audio-opt' },
        h('input', { type: 'radio', name: 'ap-audio-exp', value: o.k, checked: o.k === ales, onchange: () => { ales = o.k; } }),
        h('span', {}, o.t), h('small', {}, `≈ ${marime(44 + Math.round(L * o.rata) * o.nc * 2)}`)));
      const nume = h('input', { type: 'text', value: S.titlu.replace(/[\\/:*?"<>|]/g, '_'), class: 'ap-audio-txt', 'aria-label': 'Numele fișierului' });
      const asculta = h('div', { class: 'ap-audio-asculta' });
      let url = null;
      const exporta = async () => {
        const o = opt.find((x) => x.k === ales);
        const can = await reesantioneaza(S.canale, S.rata, o.rata, o.nc);
        const blob = new Blob([codWav(can, o.rata)], { type: 'audio/wav' });
        const fis = `${(nume.value.trim() || 'sunet').replace(/[\\/:*?"<>|]/g, '_')}.wav`;
        descarca(fis, blob);
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        umple(asculta, h('p', {}, `✓ Am salvat „${fis}” (${marime(blob.size)}) în Descărcări. Ascultă fișierul exportat:`), h('audio', { controls: true, src: url }));
        return false;
      };
      await dialog('Export WAV', [
        h('p', { class: 'ap-audio-expl' }, 'WAV păstrează sunetul necomprimat (16 biți): calitate foarte bună, dar fișier mare. Mono și o rată mai mică fac fișierul mai mic.'),
        h('label', { class: 'ap-audio-gl' }, h('span', {}, 'Nume'), nume, h('span', { class: 'u' }, '.wav')),
        h('div', { class: 'ap-audio-opts', role: 'radiogroup', 'aria-label': 'Calitatea' }, radios),
        mare ? h('p', { class: 'ap-audio-expl rau' }, 'Sunetul e lung: am ales varianta mai mică.') : null,
        asculta],
      [{ t: 'Închide', v: null }, { t: 'Descarcă WAV', p: true, verifica: exporta }]);
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ---------- Lucrarea pentru sarcină: WAV mono 16 kHz, cel mult 60 s ----------
    async function lucrare() {
      if (!n()) throw new Error('Încă nu ai niciun sunet. Înregistrează sau deschide un fișier.');
      oprireRedare();
      let [m] = await reesantioneaza(S.canale, S.rata, SARCINA_RATA, 1);
      const max = SARCINA_SEC * SARCINA_RATA;
      if (m.length > max) {
        const ok = await dialog('Sunetul e prea lung', h('p', {}, `Sunetul tău are ${nr(m.length / SARCINA_RATA, 1)} s. La sarcină se pot preda cel mult ${SARCINA_SEC} de secunde, așa că se vor trimite doar primele ${SARCINA_SEC} s. Continui?`),
          [{ t: 'Nu, îl scurtez eu', v: false }, { t: 'Predă primele 60 s', v: true, p: true }]);
        if (!ok) throw new Error(`Predare anulată. Scurtează sunetul la cel mult ${SARCINA_SEC} s (selectează și apasă Trunchiere).`);
        m = m.slice(0, max);
      }
      return { titlu: S.titlu, tip: 'audio', date: `data:audio/wav;base64,${base64(codWav([m], SARCINA_RATA))}`, durata: Math.round(m.length / SARCINA_RATA * 10) / 10 };
    }

    // ---------- Scurtături de tastatură ----------
    document.addEventListener('keydown', (e) => {
      if (!app.isConnected || dlgDeschis || S.inregistrare) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      let fn = null;
      if (k === ' ' && !ctrl) fn = comutaRedare;
      else if (ctrl && k === 'x') fn = decupare;
      else if (ctrl && k === 'c') fn = copiere;
      else if (ctrl && k === 'v') fn = e.shiftKey ? lipireCombinata : lipire;
      else if (ctrl && k === 'z') fn = e.shiftKey ? refacere : anulare;
      else if (ctrl && k === 'y') fn = refacere;
      else if (ctrl && k === 'a') fn = () => selecteaza(0, n());
      else if (ctrl && k === 's') fn = () => salveaza(true);
      else if (ctrl && k === 'o') fn = () => deschideFisier();
      else if (ctrl && k === 't') fn = trunchiere;
      else if (!ctrl && (k === 'delete' || k === 'backspace')) fn = stergere;
      else if (!ctrl && k === 'home') fn = () => mutaCursor(0);
      else if (!ctrl && k === 'end') fn = () => mutaCursor(n());
      else if (!ctrl && k === 'escape') fn = () => { S.sel = null; deseneazaOv(); actualizeaza(); };
      else if (!ctrl && (k === 'arrowleft' || k === 'arrowright')) fn = () => mutaCursor(S.cursor + (k === 'arrowleft' ? -1 : 1) * Math.max(1, S.spp * (e.shiftKey ? 50 : 10)));
      if (!fn) return;
      e.preventDefault();
      if (t && t.tagName === 'BUTTON') t.blur();
      fn();
    }, { signal: ac.signal });

    // ---------- Pornire ----------
    laIesire = () => {
      ac.abort();
      oprireRedare();
      cancelAnimationFrame(rafAnim);
      if (S.inregistrare) try { S.inregistrare.rec.stop(); } catch { /* */ }
      if (tSalv) salveaza();
    };
    window.addEventListener('beforeunload', () => { if (tSalv) salveaza(); }, { signal: ac.signal });
    S.titlu = await numeLiber('Sunet nou');
    afiseazaTitlu();
    deseneazaPanglica();
    potriveste();
  }
})();

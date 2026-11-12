'use strict';
// Editor audio în stilul WavePad (cu multipistă ca în Audacity / MixPad): mai multe fișiere deschise,
// panglică cu filele din manual (Acasă, Editare, Nivel, Efecte, Curățare, Instrumente), bara de redare
// cu contor de timp și contoare de nivel, efecte cu previzualizare, generare de sunete, marcaje și regiuni,
// istoric de anulare vizibil, spectrogramă, proiecte multipistă și export WAV / MP3 / OGG-WebM.
// Sunetul se ține în memorie ca Float32Array pe canale; proiectele se păstrează în IndexedDB.
(() => {
  const { h, show, routes } = window.EduApp;

  const MAX_SEC = 15 * 60;      // cel mai lung sunet acceptat într-un fișier
  const MAX_UNDO = 30;          // pași de anulare
  const MAX_UNDO_ESANT = 60e6;  // memoria ocupată de istoric (eșantioane)
  const MAX_DOC = 8;            // fișiere deschise în același timp
  const SARCINA_SEC = 60, SARCINA_RATA = 16000;
  const RIGLA = 24;             // înălțimea cronologiei (px)
  const PIC = 256;              // eșantioane pe „vârf” în rezumatul formei de undă

  // ---------- Utilitare ----------
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const nr = (x, z = 1) => x.toFixed(z).replace('.', ',');
  const lim = (x, a, b) => Math.max(a, Math.min(b, x));
  const pauzaUI = () => new Promise((r) => setTimeout(r, 0));
  // 65.5 s → „1:05,50”
  function fmtTimp(sec, z = 2) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return `${m}:${s.toFixed(z).padStart(z ? 3 + z : 2, '0')}`.replace('.', ',');
  }
  // contorul mare, ca în WavePad: 0:01:05.500
  function fmtContor(sec) {
    sec = Math.max(0, sec);
    const o = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = Math.floor(sec) % 60, ms = Math.floor((sec % 1) * 1000);
    return `${o}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
  const marime = (b) => (b >= 1048576 ? `${nr(b / 1048576)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}, ${ora}`;
  };
  function alegeFisier(accept, multe = false) {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept, hidden: true, multiple: multe });
      inp.addEventListener('change', () => { resolve(multe ? [...inp.files] : inp.files[0] || null); inp.remove(); });
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

  // ---------- Pictograme (SVG desenate de mână, colorate ca în WavePad) ----------
  const SVG = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ic = (nume) => h('span', { class: 'ap-audio-ic', html: SVG(ICO[nume] || ICO.unda) });
  const kU = '#1F9D3A', kA = '#2A6FC9', kR = '#E0302B', kP = '#F08C00', kV = '#7A4CC2', kG = '#5E6670'; // verde, albastru, roșu, portocaliu, violet, gri
  const und = (c = kU) => `<path d="M3 12h1.5l1.5-5 2 10 2-13 2 15 2-11 2 7 1.5-4 1 3H21" stroke="${c}"/>`;
  const ICO = {
    unda: und(),
    nou: `<path d="M6 2.5h8l4.5 4.5v14.5H6z" fill="#fff" stroke="${kG}"/><path d="M14 2.5V7h4.5" stroke="${kG}"/><path d="M8 15h1l1-3 1.5 6 1.5-8 1.5 6 1-2H16" stroke="${kU}" stroke-width="1.5"/>`,
    multipista: `<rect x="2.5" y="4" width="19" height="4.5" rx="1" fill="#D6E6FA" stroke="${kA}"/><rect x="6" y="10" width="12" height="4.5" rx="1" fill="#D8F2DD" stroke="${kU}"/><rect x="4" y="16" width="9" height="4.5" rx="1" fill="#FFE7C2" stroke="${kP}"/>`,
    deschide: `<path d="M2.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.5l2 2H19a1.5 1.5 0 0 1 1.5 1.5V10H6.5l-4 9z" fill="#FFD66B" stroke="#C78A00"/><path d="M6.5 10H22l-4 9.5H2.5z" fill="#FFE596" stroke="#C78A00"/>`,
    proiecte: `<rect x="3" y="4" width="18" height="16" rx="2" fill="#EAF1FB" stroke="${kA}"/><path d="M7 9h10M7 13h10M7 17h6" stroke="${kA}"/>`,
    salveaza: `<path d="M4 3.5h12.5l3.5 3.5v13.5H4z" fill="#3B82D6" stroke="#1F5BA6"/><rect x="7" y="3.5" width="9" height="5.5" fill="#fff" stroke="#1F5BA6"/><rect x="7" y="13" width="10" height="7.5" fill="#E8F0FB" stroke="#1F5BA6"/>`,
    salveazaCa: `<path d="M4 3.5h12.5l3.5 3.5v13.5H4z" fill="#3B82D6" stroke="#1F5BA6"/><rect x="7" y="3.5" width="9" height="5.5" fill="#fff" stroke="#1F5BA6"/><path d="M9 17.5l7-7 2 2-7 7H9z" fill="#FFD66B" stroke="#8A5300"/>`,
    inchide: `<path d="M6 2.5h8l4.5 4.5v14.5H6z" fill="#fff" stroke="${kG}"/><path d="M9.5 11.5l5 5M14.5 11.5l-5 5" stroke="${kR}" stroke-width="2.2"/>`,
    inregistreaza: `<circle cx="12" cy="12" r="8" fill="${kR}" stroke="#A3191A"/><circle cx="9.5" cy="9.5" r="2.5" fill="#fff" fill-opacity=".35" stroke="none"/>`,
    decupare: `<circle cx="6" cy="18" r="3" stroke="${kR}"/><circle cx="6" cy="6" r="3" stroke="${kR}"/><path d="M8.5 7.5 20 18M8.5 16.5 20 6" stroke="${kG}"/>`,
    copiere: `<rect x="8" y="8" width="12" height="13" rx="1.5" fill="#fff" stroke="${kA}"/><path d="M16 8V4.5A1.5 1.5 0 0 0 14.5 3h-9A1.5 1.5 0 0 0 4 4.5v11A1.5 1.5 0 0 0 5.5 17H8" fill="#EAF1FB" stroke="${kA}"/>`,
    lipire: `<rect x="4.5" y="4" width="15" height="17.5" rx="1.5" fill="#E9C58F" stroke="#8A5A1C"/><rect x="8.5" y="2.5" width="7" height="3.5" rx="1" fill="#C9CED6" stroke="${kG}"/><rect x="8" y="9" width="8" height="10" fill="#fff" stroke="${kG}" stroke-width="1"/>`,
    lipireMix: `<rect x="4.5" y="4" width="15" height="17.5" rx="1.5" fill="#E9C58F" stroke="#8A5A1C"/><rect x="8.5" y="2.5" width="7" height="3.5" rx="1" fill="#C9CED6" stroke="${kG}"/><path d="M7.5 12.5c1.5-3 3-3 4.5 0s3 3 4.5 0M7.5 16.5c1.5-2 3-2 4.5 0s3 2 4.5 0" stroke="${kU}"/>`,
    stergere: `<path d="M5 7h14l-1.2 13.5H6.2z" fill="#F4D3D2" stroke="${kR}"/><path d="M3.5 7h17M9 7V4h6v3M10 11v6M14 11v6" stroke="${kR}"/>`,
    trunchiere: `<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" stroke="${kA}" stroke-width="2"/><rect x="8" y="8" width="8" height="8" fill="#D6E6FA" stroke="none"/>`,
    selTot: `<rect x="3.5" y="4.5" width="17" height="15" rx="1" fill="#D6E6FA" stroke="${kA}" stroke-dasharray="3 2"/>${und(kA)}`,
    liniste: `<path d="M3 12h18" stroke="${kU}" stroke-width="2.2"/><path d="M7 7v10M17 7v10" stroke="${kG}"/>`,
    amutire: `<path d="M3 12h4M17 12h4" stroke="${kU}" stroke-width="2"/><path d="M7 12h10" stroke="${kG}" stroke-width="2.4"/><path d="M5 8l-1 8M19 8l1 8" stroke="${kU}"/>`,
    inserareFisier: `<path d="M5 3.5h8l4 4V20.5H5z" fill="#fff" stroke="${kG}"/><path d="M2 13h9M8 10l3 3-3 3" stroke="${kA}" stroke-width="2"/>`,
    mixareFisier: `<path d="M2 9c2-4 4-4 6 0s4 4 6 0 4-4 6 0" stroke="${kU}" stroke-width="2"/><path d="M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="${kP}" stroke-width="2"/>`,
    anulare: `<path d="M9 14 4 9l5-5" stroke="${kA}" stroke-width="2.2"/><path d="M4 9h11a5 5 0 0 1 0 10h-3" stroke="${kA}" stroke-width="2.2"/>`,
    refacere: `<path d="M15 14l5-5-5-5" stroke="${kA}" stroke-width="2.2"/><path d="M20 9H9a5 5 0 0 0 0 10h3" stroke="${kA}" stroke-width="2.2"/>`,
    istoric: `<circle cx="12" cy="12" r="8.5" fill="#EAF1FB" stroke="${kA}"/><path d="M12 7v5l3.5 2" stroke="${kA}" stroke-width="2"/>`,
    amplificare: `<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="#D6E6FA" stroke="${kA}"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12" stroke="${kU}" stroke-width="2"/>`,
    normalizare: `<path d="M3 4h18" stroke="${kR}" stroke-dasharray="2 2"/><path d="M6 20V8M10 20V5M14 20V9M18 20V6" stroke="${kU}" stroke-width="2.6"/>`,
    fadeIn: `<path d="M3 19 21 5v14z" fill="#D8F2DD" stroke="${kU}"/><path d="M6 17v-1M10 17v-4M14 17V10M18 17V7" stroke="${kU}"/>`,
    fadeOut: `<path d="M3 5l18 14H3z" fill="#D8F2DD" stroke="${kU}"/><path d="M6 17V7M10 17v-7M14 17v-4M18 17v-1" stroke="${kU}"/>`,
    inversare: `<path d="M4 8h14l-3-3M20 16H6l3 3" stroke="${kV}" stroke-width="2.2"/>`,
    ecou: `<circle cx="5" cy="12" r="2.2" fill="${kV}" stroke="${kV}"/><path d="M9.5 8a5 5 0 0 1 0 8M13.5 5a9 9 0 0 1 0 14M17.5 3a12 12 0 0 1 0 18" stroke="${kV}"/>`,
    reverb: `<path d="M3 20V9l9-5 9 5v11" fill="#EFE7FA" stroke="${kV}"/><path d="M8 20v-6h8v6M7 11c2 1.5 8 1.5 10 0" stroke="${kV}"/>`,
    egalizator: `<path d="M5 3v18M10 3v18M15 3v18M20 3v18" stroke="${kG}" stroke-width="1.2"/><rect x="3" y="13" width="4" height="3" rx="1" fill="${kU}" stroke="none"/><rect x="8" y="6" width="4" height="3" rx="1" fill="${kP}" stroke="none"/><rect x="13" y="10" width="4" height="3" rx="1" fill="${kA}" stroke="none"/><rect x="18" y="15" width="4" height="3" rx="1" fill="${kV}" stroke="none"/>`,
    tonInalt: `<path d="M9 18V5l10-2v13" stroke="${kV}" stroke-width="2"/><circle cx="6.5" cy="18" r="2.5" fill="${kV}" stroke="${kV}"/><circle cx="16.5" cy="16" r="2.5" fill="${kV}" stroke="${kV}"/>`,
    tempo: `<path d="M8 3h8l3 18H5z" fill="#FFE7C2" stroke="${kP}"/><path d="M12 17l4-9" stroke="#8A5300" stroke-width="2"/><circle cx="12" cy="17" r="1.4" fill="#8A5300" stroke="none"/>`,
    viteza: `<path d="M3.5 17a8.5 8.5 0 1 1 17 0" fill="#FFE7C2" stroke="${kP}"/><path d="M12 17l4.5-5" stroke="${kR}" stroke-width="2.2"/>`,
    zgomot: `<path d="M3 12l1-4 1 7 1-9 1 10 1-6 1 4 1-8 1 9 1-5 1 3 1-7 1 9 1-6 1 5 1-3 1 2" stroke="${kG}" stroke-width="1.3"/>`,
    reducereZgomot: `<path d="M2.5 12l1-4 1 7 1-9 1 10 1-6" stroke="${kG}" stroke-width="1.3"/><path d="M9 12h12" stroke="${kU}" stroke-width="2.2"/><path d="M12 6l3 3-3 3" stroke="${kA}" stroke-width="2" transform="translate(-1 3)"/>`,
    eliminareLiniste: `<path d="M2 12h3l1-5 1.5 10L9 12" stroke="${kU}"/><path d="M10 12h4" stroke="${kR}" stroke-dasharray="1.5 2" stroke-width="2"/><path d="M15 12l1.5-5 1.5 10 1.5-5H22" stroke="${kU}"/>`,
    profilZgomot: `<rect x="3" y="6" width="18" height="12" rx="1.5" fill="#EEF0F2" stroke="${kG}"/><path d="M5 12l1-3 1 5 1-6 1 7 1-4 1 2 1-5 1 6 1-3 1 2 1-4 1 5 1-2" stroke="${kG}" stroke-width="1.1"/>`,
    treceSus: `<path d="M3 19c3 0 4-12 8-12h10" stroke="${kA}" stroke-width="2.2"/><path d="M3 21h18" stroke="${kG}"/>`,
    treceJos: `<path d="M3 7h10c4 0 5 12 8 12" stroke="${kA}" stroke-width="2.2"/><path d="M3 21h18" stroke="${kG}"/>`,
    ton: `<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" stroke="${kA}" stroke-width="2.2"/>`,
    dtmf: `<rect x="5" y="2.5" width="14" height="19" rx="2.5" fill="#EEF0F2" stroke="${kG}"/>${[7.5, 12, 16.5].map((x) => [7, 11, 15].map((y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${kA}" stroke="none"/>`).join('')).join('')}<path d="M10 18.5h4" stroke="${kG}"/>`,
    stereoMono: `<circle cx="7" cy="12" r="4.5" fill="#D6E6FA" stroke="${kA}"/><circle cx="17" cy="12" r="4.5" fill="#D8F2DD" stroke="${kU}" fill-opacity=".8"/>`,
    marcaj: `<path d="M6 21V3" stroke="${kG}" stroke-width="2"/><path d="M6 3.5h12l-3 4 3 4H6z" fill="#FFC93C" stroke="#B07F00"/>`,
    regiune: `<rect x="3" y="5" width="18" height="14" rx="1.5" fill="#FFF0C2" stroke="#B07F00"/><path d="M7 5v14M17 5v14" stroke="#B07F00" stroke-width="2"/>`,
    marcaje: `<path d="M5 21V3" stroke="${kG}" stroke-width="1.6"/><path d="M5 3.5h8l-2 3 2 3H5z" fill="#FFC93C" stroke="#B07F00"/><path d="M14 21V11" stroke="${kG}" stroke-width="1.6"/><path d="M14 11.5h7l-2 2.5 2 2.5h-7z" fill="#FFC93C" stroke="#B07F00"/>`,
    redare: `<path d="M7 4.5v15l12.5-7.5z" fill="${kU}" stroke="#167A2C"/>`,
    redareSel: `<path d="M8 7v10l8-5z" fill="${kU}" stroke="#167A2C"/><path d="M3.5 4v16M20.5 4v16" stroke="${kA}" stroke-width="2"/>`,
    pauza: `<path d="M8.5 5v14M15.5 5v14" stroke="${kA}" stroke-width="3.6"/>`,
    oprire: `<rect x="6" y="6" width="12" height="12" rx="1.5" fill="#3D4248" stroke="#24272B"/>`,
    inceput: `<path d="M5.5 5v14" stroke="#3D4248" stroke-width="2.4"/><path d="M19 5 9 12l10 7z" fill="#3D4248" stroke="#3D4248"/>`,
    sfarsit: `<path d="M18.5 5v14" stroke="#3D4248" stroke-width="2.4"/><path d="M5 5l10 7-10 7z" fill="#3D4248" stroke="#3D4248"/>`,
    inapoi: `<path d="M12 6 4 12l8 6zM20 6l-8 6 8 6z" fill="#3D4248" stroke="#3D4248" stroke-width="1.2"/>`,
    inainte: `<path d="M12 6l8 6-8 6zM4 6l8 6-8 6z" fill="#3D4248" stroke="#3D4248" stroke-width="1.2"/>`,
    bucla: `<path d="M17 4l3 3-3 3" stroke="${kA}" stroke-width="2"/><path d="M4 12V9.5A2.5 2.5 0 0 1 6.5 7H20M7 20l-3-3 3-3" stroke="${kA}" stroke-width="2"/><path d="M20 12v2.5a2.5 2.5 0 0 1-2.5 2.5H4" stroke="${kA}" stroke-width="2"/>`,
    zoomPlus: `<circle cx="10.5" cy="10.5" r="6.5" fill="#EAF1FB" stroke="${kA}"/><path d="M20 20l-4.5-4.5" stroke="${kG}" stroke-width="2.6"/><path d="M7.5 10.5h6M10.5 7.5v6" stroke="${kA}" stroke-width="2"/>`,
    zoomMinus: `<circle cx="10.5" cy="10.5" r="6.5" fill="#EAF1FB" stroke="${kA}"/><path d="M20 20l-4.5-4.5" stroke="${kG}" stroke-width="2.6"/><path d="M7.5 10.5h6" stroke="${kA}" stroke-width="2"/>`,
    potrivire: `<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="${kA}" stroke-width="2"/>${und()}`,
    zoomSel: `<rect x="7" y="7" width="10" height="10" fill="#D6E6FA" stroke="${kA}" stroke-dasharray="2 2"/><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="${kA}" stroke-width="2"/>`,
    spectru: `<rect x="3" y="4" width="18" height="16" rx="1" fill="#0B1030" stroke="${kG}"/><path d="M5 17l2-3 2 1 2-6 2 4 2-7 2 6 2-2" stroke="#FFC93C" stroke-width="1.6"/><path d="M5 18h14" stroke="#E0302B" stroke-width="1.4"/>`,
    panou: `<rect x="3" y="4" width="18" height="16" rx="1.5" fill="#fff" stroke="${kG}"/><rect x="3" y="4" width="6" height="16" fill="#D6E6FA" stroke="${kG}"/>`,
    prezentare: `<rect x="3" y="5" width="18" height="6" rx="1" fill="#0B1A0E" stroke="${kG}"/><path d="M4 8h2l1-2 1 4 1-3 1 2h11" stroke="${kU}" stroke-width="1.1"/><rect x="9" y="4.5" width="5" height="7" fill="none" stroke="${kR}" stroke-width="1.3"/><path d="M3 15h18M3 19h12" stroke="${kG}"/>`,
    pistaNoua: `<rect x="2.5" y="6" width="15" height="5" rx="1" fill="#D6E6FA" stroke="${kA}"/><rect x="2.5" y="13" width="10" height="5" rx="1" fill="#D8F2DD" stroke="${kU}"/><path d="M19 13v6M16 16h6" stroke="${kU}" stroke-width="2.2"/>`,
    importPista: `<rect x="2.5" y="13" width="19" height="6" rx="1" fill="#FFE7C2" stroke="${kP}"/><path d="M12 2.5v8M8.5 7l3.5 3.5L15.5 7" stroke="${kA}" stroke-width="2.2"/>`,
    trimiteMix: `<path d="M4 3.5h9l4 4V12" stroke="${kG}" fill="#fff"/><path d="M4 3.5V12" stroke="${kG}"/><rect x="3" y="14" width="18" height="6.5" rx="1" fill="#D8F2DD" stroke="${kU}"/><path d="M10 8h6M13.5 5.5 16 8l-2.5 2.5" stroke="${kA}" stroke-width="2"/>`,
    imparte: `<rect x="2.5" y="8" width="8" height="8" rx="1" fill="#D6E6FA" stroke="${kA}"/><rect x="13.5" y="8" width="8" height="8" rx="1" fill="#D6E6FA" stroke="${kA}"/><path d="M12 3v18" stroke="${kR}" stroke-width="2" stroke-dasharray="2 2"/>`,
    stergeClip: `<rect x="3" y="8" width="18" height="8" rx="1.5" fill="#F4D3D2" stroke="${kR}"/><path d="M9 10l6 4M15 10l-6 4" stroke="${kR}" stroke-width="2"/>`,
    mixdown: `<path d="M3 5h8M3 9h12M3 13h6" stroke="${kG}" stroke-width="2"/><path d="M15 12v8M11.5 16.5 15 20l3.5-3.5" stroke="${kU}" stroke-width="2.2"/>`,
    exporta: `<path d="M12 3v11M7 9.5l5 5 5-5" stroke="${kU}" stroke-width="2.2"/><path d="M4 16v4h16v-4" stroke="${kG}" stroke-width="2"/>`,
    microfon: `<rect x="9" y="3" width="6" height="11" rx="3" fill="#EEF0F2" stroke="${kG}"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="${kG}"/>`,
    meniu: `<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.2"/>`,
    sageata: '<path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2"/>',
    ajutor: `<circle cx="12" cy="12" r="9" fill="#EAF1FB" stroke="${kA}"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7v.5M12 17.2v.3" stroke="${kA}" stroke-width="2"/>`,
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

  // Rezumatul formei de undă: minim/maxim pe blocuri de PIC eșantioane (desenare rapidă la zoom mic).
  const rezumate = new WeakMap();
  function rezumat(c) {
    let r = rezumate.get(c);
    if (!r) {
      const nb = Math.ceil(c.length / PIC), mn = new Float32Array(nb), mx = new Float32Array(nb);
      for (let b = 0; b < nb; b++) {
        let a = Infinity, z = -Infinity;
        for (let i = b * PIC, e = Math.min(c.length, i + PIC); i < e; i++) { const v = c[i]; if (v < a) a = v; if (v > z) z = v; }
        mn[b] = a; mx[b] = z;
      }
      r = { mn, mx };
      rezumate.set(c, r);
    }
    return r;
  }
  // Minimul și maximul pe intervalul [s0, s1) – folosește rezumatul când intervalul e lung.
  function minMax(c, s0, s1) {
    let mn = Infinity, mx = -Infinity;
    if (s1 - s0 > PIC * 3) {
      const r = rezumat(c), b0 = Math.ceil(s0 / PIC), b1 = Math.floor(s1 / PIC);
      for (let i = s0; i < b0 * PIC; i++) { const v = c[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      for (let b = b0; b < b1; b++) { if (r.mn[b] < mn) mn = r.mn[b]; if (r.mx[b] > mx) mx = r.mx[b]; }
      for (let i = b1 * PIC; i < s1; i++) { const v = c[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    } else {
      for (let i = s0; i < s1; i++) { const v = c[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    }
    return [mn, mx];
  }

  // FFT radix-2 pe loc (re, im au lungimea o putere a lui 2).
  function fft(re, im, inversa = false) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (inversa ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const a = i + j, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inversa) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  const hann = (n) => Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));

  // Profilul zgomotului: spectrul mediu (2048 de puncte) al unei porțiuni cu „doar zgomot”.
  const NZ = 2048, HZ = 512;
  function profilZgomot(c, cadreLiniste = false) {
    const w = hann(NZ), re = new Float32Array(NZ), im = new Float32Array(NZ);
    const cadre = [];
    for (let p = 0; p + NZ <= Math.max(NZ, c.length); p += HZ) {
      let e = 0;
      for (let i = 0; i < NZ; i++) { const v = c[p + i] || 0; re[i] = v * w[i]; im[i] = 0; e += v * v; }
      fft(re, im);
      const mag = new Float32Array(NZ / 2 + 1);
      for (let k = 0; k <= NZ / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
      cadre.push({ e, mag });
    }
    let alese = cadre;
    if (cadreLiniste) { // automat: cele mai liniștite 10% dintre cadre
      alese = cadre.slice().sort((a, b) => a.e - b.e).slice(0, Math.max(1, Math.round(cadre.length * 0.1)));
    }
    const p = new Float32Array(NZ / 2 + 1);
    for (const f of alese) for (let k = 0; k < p.length; k++) p[k] += f.mag[k] / alese.length;
    return p;
  }
  // Reducerea zgomotului prin scădere spectrală (suprapunere 75%, ferestre Hann).
  async function reducereZgomot(c, profil, dB) {
    const w = hann(NZ), re = new Float32Array(NZ), im = new Float32Array(NZ);
    const out = new Float32Array(c.length + NZ), podea = 10 ** (-dB / 20), cast = new Float32Array(NZ / 2 + 1).fill(1);
    let k0 = 0;
    for (let p = -NZ + HZ; p < c.length; p += HZ) {
      for (let i = 0; i < NZ; i++) { re[i] = (c[p + i] || 0) * w[i]; im[i] = 0; }
      fft(re, im);
      for (let k = 0; k <= NZ / 2; k++) {
        const m = Math.hypot(re[k], im[k]) + 1e-12;
        let g = Math.max(podea, 1 - 2 * profil[k] / m);
        g = 0.6 * g + 0.4 * cast[k]; // netezire în timp (mai puține „bule”)
        cast[k] = g;
        re[k] *= g; im[k] *= g;
        if (k && k < NZ / 2) { re[NZ - k] = re[k]; im[NZ - k] = -im[k]; }
      }
      fft(re, im, true);
      for (let i = 0; i < NZ; i++) { const j = p + i; if (j >= 0 && j < out.length) out[j] += re[i] * w[i] / 1.5; }
      if (++k0 % 200 === 0) await pauzaUI();
    }
    return out.slice(0, c.length);
  }
  // Întinderea în timp fără schimbarea tonului (WSOLA). factor = durata nouă / durata veche.
  async function intinde(x, factor, rata) {
    const W = 2 * Math.round(rata * 0.02), Hs = W / 2, Ha = Hs / factor, tol = Math.round(W / 4);
    const w = hann(W), n = Math.max(1, Math.round(x.length * factor));
    const out = new Float32Array(n + W);
    let prec = 0, k = 0;
    for (let o = 0; o < n; o += Hs, k++) {
      const nominal = Math.round(o / factor);
      let best = nominal;
      if (o > 0) {
        // căutăm poziția care continuă cel mai bine fragmentul anterior (corelație, din 4 în 4 eșantioane)
        const tinta = prec + Hs;
        let bc = -Infinity;
        for (let d = -tol; d <= tol; d += 2) {
          const p = nominal + d;
          if (p < 0 || p + W > x.length) continue;
          let s = 0;
          for (let i = 0; i < Hs; i += 4) s += x[p + i] * (x[tinta + i] || 0);
          if (s > bc) { bc = s; best = p; }
        }
      }
      best = lim(best, 0, Math.max(0, x.length - 1));
      for (let i = 0; i < W; i++) out[o + i] += (x[best + i] || 0) * w[i];
      prec = best;
      if (k % 400 === 399) await pauzaUI();
    }
    return out.slice(0, n);
  }
  // Schimbarea tonului fără schimbarea duratei: întindere, apoi reeșantionare.
  async function schimbaTon(x, semitone, rata) {
    const r = 2 ** (semitone / 12);
    const y = liniar(await intinde(x, r, rata), 1 / r);
    const o = new Float32Array(x.length);
    o.set(y.subarray(0, x.length));
    return o;
  }

  // Generatoare
  function genTon(forma, f, dur, vol, rata) {
    const L = Math.max(1, Math.round(dur * rata)), c = new Float32Array(L), fade = Math.min(L / 2, rata * 0.01);
    for (let i = 0; i < L; i++) {
      const faza = (f * i / rata) % 1;
      let v;
      if (forma === 'patrat') v = faza < 0.5 ? 0.8 : -0.8;
      else if (forma === 'triunghi') v = 1 - 4 * Math.abs(faza - 0.5);
      else if (forma === 'dinte') v = 2 * faza - 1;
      else v = Math.sin(2 * Math.PI * faza);
      c[i] = v * vol * Math.min(1, i / fade, (L - i) / fade);
    }
    return c;
  }
  function genZgomot(tip, dur, vol, rata) {
    const L = Math.max(1, Math.round(dur * rata)), c = new Float32Array(L);
    let b0 = 0, b1 = 0, b2 = 0, br = 0;
    for (let i = 0; i < L; i++) {
      const alb = Math.random() * 2 - 1;
      let v = alb;
      if (tip === 'roz') { b0 = 0.99765 * b0 + alb * 0.099046; b1 = 0.963 * b1 + alb * 0.2965164; b2 = 0.57 * b2 + alb * 1.0526913; v = (b0 + b1 + b2 + alb * 0.1848) * 0.2; }
      else if (tip === 'maro') { br = (br + 0.02 * alb) / 1.02; v = br * 3.5; }
      c[i] = lim(v, -1, 1) * vol;
    }
    return c;
  }
  const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], A: [697, 1633], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], B: [770, 1633], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], C: [852, 1633], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477], D: [941, 1633] };
  function genDtmf(sir, durTon, durPauza, vol, rata) {
    const parti = [];
    for (const ch of sir.toUpperCase()) {
      const fr = DTMF[ch];
      if (!fr) { if (ch === ',' || ch === ' ') parti.push(new Float32Array(Math.round(durPauza * 2 * rata))); continue; }
      const a = genTon('sinus', fr[0], durTon, vol / 2, rata), b = genTon('sinus', fr[1], durTon, vol / 2, rata);
      for (let i = 0; i < a.length; i++) a[i] += b[i];
      parti.push(a, new Float32Array(Math.round(durPauza * rata)));
    }
    return lipeste(parti);
  }
  // Scurtează pauzele: porțiunile sub prag mai lungi decât minPauza rămân de lungimea „pastreaza”.
  function eliminaLiniste(canale, rata, pragDb, minPauza, pastreaza) {
    const B = Math.max(1, Math.round(rata * 0.01)), n = canale[0].length, nb = Math.ceil(n / B), prag = 10 ** (pragDb / 20);
    const linistit = new Uint8Array(nb);
    for (let b = 0; b < nb; b++) {
      let m = 0;
      for (const c of canale) for (let i = b * B, e = Math.min(n, i + B); i < e; i++) { const v = Math.abs(c[i]); if (v > m) m = v; }
      linistit[b] = m < prag ? 1 : 0;
    }
    const taieri = []; // [a, b) de eliminat
    for (let b = 0; b < nb;) {
      if (!linistit[b]) { b++; continue; }
      let e = b;
      while (e < nb && linistit[e]) e++;
      const lung = (e - b) * B;
      if (lung > minPauza * rata) {
        const p = Math.round(pastreaza * rata / 2);
        taieri.push([b * B + p, Math.min(n, e * B) - p]);
      }
      b = e;
    }
    if (!taieri.length) return { canale, taiat: 0 };
    let taiat = 0;
    const noi = canale.map((c) => {
      const parti = [];
      let k = 0;
      for (const [a, b] of taieri) { if (b > a) { parti.push(c.subarray(k, a)); k = b; } }
      parti.push(c.subarray(k));
      return lipeste(parti);
    });
    for (const [a, b] of taieri) taiat += Math.max(0, b - a);
    return { canale: noi, taiat: taiat / rata };
  }
  // Prelucrare prin noduri Web Audio, într-un OfflineAudioContext (filtre, egalizator, reverberație).
  async function prinNoduri(canale, rata, construieste) {
    const n = canale[0].length;
    const oc = new OfflineAudioContext(canale.length, n, rata);
    const b = oc.createBuffer(canale.length, n, rata);
    canale.forEach((c, i) => b.copyToChannel(c, i));
    const s = oc.createBufferSource();
    s.buffer = b;
    construieste(oc, s).connect(oc.destination);
    s.start();
    const r = await oc.startRendering();
    return canale.map((_, i) => r.getChannelData(i).slice(0, n));
  }
  function raspunsSala(oc, marime) {
    const dur = [0.6, 1.4, 2.8][marime] || 1.4, L = Math.round(oc.sampleRate * dur);
    const ir = oc.createBuffer(2, L, oc.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / L) ** (2.5 + marime);
    }
    return ir;
  }
  const BENZI = [60, 250, 1000, 4000, 12000];
  // Hartă de culori pentru spectrogramă (negru → albastru → roșu → galben → alb)
  const CULORI_SP = (() => {
    const p = [[0, 0, 0, 0], [0.25, 20, 10, 120], [0.5, 200, 20, 60], [0.75, 255, 190, 0], [1, 255, 255, 255]];
    const t = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      let k = 0;
      while (k < p.length - 2 && x > p[k + 1][0]) k++;
      const [x0, ...c0] = p[k], [x1, ...c1] = p[k + 1], f = (x - x0) / (x1 - x0);
      for (let j = 0; j < 3; j++) t[i * 3 + j] = Math.round(c0[j] + (c1[j] - c0[j]) * f);
    }
    return t;
  })();

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
  // Fișier audio: meta { id, titlu, durata, rata, nc, creat, actualizat, marcaje? } + sunete { id, canale }.
  // Proiect multipistă: meta { id, tip: 'mix', titlu, ..., piste: [{ ..., clipuri: [{ id, start, nume, rata, len }] }] }
  //   + sunete { id, clipuri: { idClip: canale } }. Proiectele vechi (fără „tip”) sunt fișiere audio.
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
  const fara = ({ wav, wavs, ...m }) => m;
  const mono22 = async (canale, rata) => base64(codWav(await reesantioneaza(canale, rata, 22050, 1), 22050));
  const store = {
    async lista() { return (await areIDB()) ? tx(['proiecte'], 'readonly', (s) => s.getAll()) : lsToate().map(fara); },
    async incarca(id) {
      if (await areIDB()) {
        const [m, s] = await Promise.all([tx(['proiecte'], 'readonly', (p) => p.get(id)), tx(['sunete'], 'readonly', (p) => p.get(id))]);
        if (!m || !s) return null;
        return m.tip === 'mix' ? { ...m, clipuri: s.clipuri || {} } : { ...m, canale: s.canale };
      }
      const m = lsToate().find((x) => x.id === id);
      if (!m) return null;
      if (m.tip === 'mix') {
        const clipuri = {};
        for (const [k, b] of Object.entries(m.wavs || {})) clipuri[k] = citesteWav16(dinBase64(b)).canale;
        return { ...fara(m), clipuri };
      }
      const w = citesteWav16(dinBase64(m.wav));
      return { ...fara(m), rata: w.rata, canale: w.canale };
    },
    // date: canalele (fișier audio) sau { idClip: canale } (multipistă)
    async salveaza(meta, date, rata) {
      const mix = meta.tip === 'mix';
      if (await areIDB()) return tx(['proiecte', 'sunete'], 'readwrite', (p, s) => { p.put(meta); s.put(mix ? { id: meta.id, clipuri: date } : { id: meta.id, canale: date }); });
      // Rezervă: mono 22 050 Hz, ca să încapă în localStorage.
      const a = lsToate().filter((x) => x.id !== meta.id);
      if (mix) {
        const wavs = {};
        for (const pista of meta.piste) for (const c of pista.clipuri) wavs[c.id] = await mono22(date[c.id], c.rata);
        meta = { ...meta, piste: meta.piste.map((p) => ({ ...p, clipuri: p.clipuri.map((c) => ({ ...c, rata: 22050, len: Math.round(c.len * 22050 / c.rata) })) })) };
        a.push({ ...meta, wavs });
      } else a.push({ ...meta, wav: await mono22(date, rata) });
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
  async function numeLiber(baza, exceptId, ocupate = []) {
    const toate = (await store.lista()).filter((p) => p.id !== exceptId).map((p) => p.titlu).concat(ocupate);
    if (!toate.includes(baza)) return baza;
    let i = 2;
    while (toate.includes(`${baza} ${i}`)) i++;
    return `${baza} ${i}`;
  }

  // ---------- Codor MP3 (MPEG-1 Layer III, CBR, simplificat: fără model psihoacustic și fără rezervor de biți) ----------
  // Fereastra de analiză (ISO 11172-3, ×1e9) și tabelele Huffman (lungimi + coduri, în biți), compacte.
  const codMp3 = (() => {
    const MP3_C = '0,-d9,-d9,-d9,-d9,-d9,-d9,-qi,-qi,-qi,-qi,-13r,-13r,-1gz,-1gz,-1u8,-1u8,-27h,-2kq,-2kq,-2xz,-3b8,-3og,-41p,-4s7,-55g,-5vx,-696,-6zo,-7q6,-8tw,-9ke,-ao4,-bem,-cvl,-dzc,-f32,-gk2,-i11,-ji0,-lc9,-n6h,-p0p,-qux,-t2e,-v9v,-xhc,-zot,-129j,-14u9,-171q,-19zp,-1ckf,-1f54,-1i33,-1knt,-1n8j,-1q6h,-1sr7,-1vbx,-1xwn,-2044,-22bl,-24j2,26da,287j,29oi,2as8,2biq,2bvz,2bvz,2biq,2af0,29b9,273s,24j2,21l3,1xje,1t4g,1nz0,1hpu,1aq6,1301,ujd,kz0,ao4,-qi,-d8u,-qho,-14u9,-1kak,-20hd,-2hrw,-3066,-3jo6,-43jg,-4ovo,-5aye,-5xrm,-6lbc,-79lj,-7ym8,-8o06,-9e4l,-a4ma,-avh7,-bmc4,-cd71,-d41y,-duwv,-elej,-fb5q,-g0jo,-gp74,-hcqt,-hz6t,-ikj1,-j411,-jm23,-k1vn,-kg87,-krmt,-l0ty,-l7gd,-lb4t,-lbvb,-l9al,-l31f,kth1,kfuy,jy76,jchp,imd9,hrtw,gsvk,fort,eg94,d2y8,bk4n,9ww4,844x,66li,43wp,1w2f,-gk2,-2xyp,-5kis,-8bht,-b6vt,-e6oq,-hajc,-ki2f,-nt9z,-r7sp,-up9f,-y8xl,-11v6i,-15iwd,-19838,-1cxnc,-1gnxy,-1kdvb,-1o326,-1rqs1,-1vcag,-1yvle,-22b7v,-25n5w,-28ubq,-2bwc4,-2es3c,-2hh85,-2jymt,-2m7y2,-2o8ff,-2pylw,-2reur,-2sjp0,-2tce5,-2ts7p,-2tusf,-2tjdt,-2ssw5,-2rnbe,-2q16m,-2nyhs,-2leif,-2ici0,-2esgl,-2apae,-262zg,-20wt8,1v6rr,1owht,1i1m3,1am4m,12lax,tzvh,kth1,b23m,pr7,-a76z,-loqw,-xq63,-1abtr,-1ngm7,-21465,-2fa4d,-2ty3n,-392my,-3onqa,-44on7,-4l3wo,-51ws9,-5j2je,-60k2f,-6ic9j,-70dnt,-7iniq,-814da,-8jr3t,-92i99,-9lcpw,-a490s,-an5bo,-b60w2,-botvr,-c7j6z,-cq2zi,-d8fse,-dqk4m,-e8ewh,-epy9p,-f74rc,-fnxmx,-g4abo,-gk6ge,-gzk6u,-hee21,-hsnbg,-i6ai6,-ija56,-ivl4q,-j76qc,-ji1ua,-js4zk,-k1g67,-k9xjy,-khl4t,-koe6a,-kubko,-kzcyp,-l3hz4,-l6qlx,-l91re,-lafss,lawq3,lafss,l91re,l6qlx,l3hz4,kzcyp,kubko,koe6a,khl4t,k9xjy,k1g67,js4zk,ji1ua,j76qc,ivl4q,ija56,i6ai6,hsnbg,hee21,gzk6u,gk6ge,g4abo,fnxmx,f74rc,epy9p,e8ewh,dqk4m,d8fse,cq2zi,c7j6z,botvr,b60w2,an5bo,a490s,9lcpw,92i99,8jr3t,814da,7iniq,70dnt,6ic9j,60k2f,5j2je,51ws9,4l3wo,44on7,3onqa,392my,2ty3n,2fa4d,21465,1ngm7,1abtr,xq63,loqw,a76z,-pr7,-b23m,-kth1,-tzvh,-12lax,-1am4m,-1i1m3,-1owht,1v6rr,20wt8,262zg,2apae,2esgl,2ici0,2leif,2nyhs,2q16m,2rnbe,2ssw5,2tjdt,2tusf,2ts7p,2tce5,2sjp0,2reur,2pylw,2o8ff,2m7y2,2jymt,2hh85,2es3c,2bwc4,28ubq,25n5w,22b7v,1yvle,1vcag,1rqs1,1o326,1kdvb,1gnxy,1cxnc,19838,15iwd,11v6i,y8xl,up9f,r7sp,nt9z,ki2f,hajc,e6oq,b6vt,8bht,5kis,2xyp,gk2,-1w2f,-43wp,-66li,-844x,-9ww4,-bk4n,-d2y8,-eg94,-fort,-gsvk,-hrtw,-imd9,-jchp,-jy76,-kfuy,kth1,l31f,l9al,lbvb,lb4t,l7gd,l0ty,krmt,kg87,k1vn,jm23,j411,ikj1,hz6t,hcqt,gp74,g0jo,fb5q,elej,duwv,d41y,cd71,bmc4,avh7,a4ma,9e4l,8o06,7ym8,79lj,6lbc,5xrm,5aye,4ovo,43jg,3jo6,3066,2hrw,20hd,1kak,14u9,qho,d8u,qi,-ao4,-kz0,-ujd,-1301,-1aq6,-1hpu,-1nz0,-1t4g,-1xje,-21l3,-24j2,-273s,-29b9,-2af0,-2biq,-2bvz,-2bvz,-2biq,-2as8,-29oi,-287j,26da,24j2,22bl,2044,1xwn,1vbx,1sr7,1q6h,1n8j,1knt,1i33,1f54,1ckf,19zp,171q,14u9,129j,zot,xhc,v9v,t2e,qux,p0p,n6h,lc9,ji0,i11,gk2,f32,dzc,cvl,bem,ao4,9ke,8tw,7q6,6zo,696,5vx,55g,4s7,41p,3og,3b8,2xz,2kq,2kq,27h,1u8,1u8,1gz,1gz,13r,13r,qi,qi,qi,qi,d9,d9,d9,d9,d9,d9';
    const MP3_HT = {
        1: ['1323', 'lAA='],
        2: ['136335556', 'oFkIxAA='],
        3: ['226325556', '4EoRiAA='],
        5: ['1367336766787678', 'oYKyIEHFDgIYECAA'],
        6: ['3357324544566567', '7KB0YlQgIYwgAA=='],
        7: ['13688934677865788977899977899a889aaa', 'ooTEAUzHFBQMsg0RCAIMFiQPBYCDhgkHAMAQYEAoBgEAAA=='],
        8: ['23688932488864688988899a8789aa9899bb', '4MJBgFqQgEgY5ihwOAxMRDwaCgEDQoQCwFAEGAgEAIAQAA=='],
        9: ['335689334568445678656778767789878899', '9ScHgfRSjA7sggQCnmJFBQEWOJDAgBDggMBAYAA='],
        10: ['1368999a3467898866789a997789aa9a889aaaaa99aabbab889aaabb989aabbb', 'ooXEYeBgIsyBgkFQwHLJHiogCgJgYcNFhEFwLhIBxQTEIXg2CwEgGHwsFINAVAoAoAw4NBQFggAwBQAgkIA4EAIAQAQAAA=='],
        11: ['23578989334688785567898876798a8988899a9a889aabab87789aaa8789aaaa', '4owRCEVB9aFEAiLClnNJDwfFAUyWTHY2CQYBSMhHx0HgQA4Cjg0IATBEB4EAODhgkNBwEgIAIWEBgMAwBgEAAA=='],
        12: ['4357899933457788545678786566788876778889878889898778899a9889999a', 'nQQlInEwa9ZJcgNBcXWcVHhQOio8wkOBwKgNLExIQCQKUER8dEQaCAIbGCw8KA4EAENhgQDAMAwCAAA='],
        13: ['1467899a9abbccdd3467889999aabccc667899aa9aabbcdd77899aaaabbbbcdd8799aabbabbccdde989aaabbbbcbddee99aabbbbbcccddeea9abbbccccdddegg989aabbccccddeffa9aabbbdcddeeegfaaabbccdcdedefghbaabccccdddefffgbbbccdcdeefffgggcbcdddeeeeefgfggdccdddfeehfffhggccdeeefeffggjijg', 'qcVIhmLhHFQaBEBoCGBYArAJtDCY+NCwQh8MBADAHwIwFgDjzS5IOxiJogh0KAeBQBsCEBUAQLFCUejgTxJEAKwmA4BKBoB8AyAOIyA8HIwiWHILYbBJBuBSBgA1ALgDA6GxkMAmCMF0KgTQdAngdAlAMQCkARF4tE4Sg5heC0E8IoKYI4GQDsBMASAB4kCIOAvhcCqC2C0CsCSBNAggMwCwAKwAqFYoHgsDcJwSAVwTgPQLgGwCUAeACgAQDUMhSEoLAdg2AoghATAHIBsASgCQATgAsIwhB8HIKgUgSAKAF4DoA3AKgCwAaACYACwNQZBcEwIwHgGYEgDcA0AiAFwA2ADgASAA4IgQAcAnAxAlgPANADAAoAGgAcACQAIgASAAoFoFQIgIADgBkAYgFoA+AJgBgAPAAoADgAMAAYDABcBQBOAkARgDUAVAEAALgA0AFAAYAAIACAAEAgAeARAGwBkAUADoAWAEQAYACAAEAAAQAAQAAAAAgA=='],
        15: ['345778999aabbbcd43567788899aaabb55567788899aabbb6667788999aaabbb7677889999aaabbb8778889999aabbbc978889999aaabbcc9889999aaaaabbbc9889999aaaabbccc989999aaabbbbccca999aaaaabbbbcdca999aaaabbbbcccdba9aaabbbbbbccddbaaaabbbbcccccddcbbbbbbbccccddcdcbbbbbbcccccdddd', '+Sar0w+Gwsj2Ngdw1hRB6Af7YNrkh6ZlRGGgpiCFIOwSTi9hSiOzAoIAyE4PgoA4BC64yrTn5uXSYOxdEgNglgyA60WVKEM5L5PJA5FkRQxCEC4DaalRoR0aFslD4YCeH4WgfAoAmPqA8ODIuE4gjcVxHDMJIMwRgHjaamJeLBLIQ9C2JIcBUEAFgFQGS0VlJNJI/HAuCaIQXhDBgBqBIAoRyIhjwdDEWBMEMNQRwbAmAnAXAPG0ajMXi0KQdByGASAcgpAuA2A+AJFYVCgSiMIAaBWEYG4KgMgOgJAFgCw7CIHg3DILglBBBiCcDAEAFgDQBwAcLYWBOEwRA/BoC0D4GgDgCYBwBAAkAGD2DwHQNQXgrBABYCUBgBEAwAeAKACAAgjglBEB4DgFAIgNAKgIAFADACAAwAIAAA=='],
        16: ['146899aabbbcccd934678999aaabcbc8667899aababbbcc987899aaabbcccdda9899aabbbcccddd99899abbcbccdddeaa99abbbbccccddeaa9aabbbccddddffaaaabbbccddddeeeabaabbccddddededbbbabccccdeeeffeacbbbccdeeeeeedebcccccddddfeeeegbecccddeeegfffhfbddbceedeefgfhfeb98899aaabbbbbbb8', 'qcWEofjcLorBKiKDyDhDDC8BFoYUIx8NReKYliIHcMkNYZ4SeaXJiGOhnFoUIkB/DqG4NEM4IFpUnIpAHIYxXE8IwPwNQMcMGFtBolkhEII5jKLMUgmxCA9g4gxYX4LUCSEPDscDMLkVohIjg/Q6AyAYQL0DeggN42GgyC4FkKAQogIegcgbIYELcFlgUMQwFsWBSidEoIKHwGXDGhdAvgN5BugECqKgoifE4I8QQPkNWGRDEBfwtcLJCxAHE0JgkiNEGIAHqGqDLBigwAW+FnCxgsACxFiBEMPoe4dIcobYYkLnC4QtAG6g3IG3AQPMPAdg5hxhvhjAuoLmC4AtELICwgb4NoAYMoOAN4NoNgMKGCC+hbAbwDdhYYNwDag2AAQLrDTDSDQC5Bewt4LTCygbHBuYNtBtgNgwbCAILyFxDMF2FrBaQWYLHCxQbEDYwNnBsEDZgbIAAMCgcFgoEQLAkBoDAFAHAKAMAIGA'],
        24: ['4467899aabbbbbc94456788999aaaaa865677889999aaab776778889999aaaa78778888999aaaab79788889999aaaaa7988889999aaaaab7a8889999aaaaabb8a99999999aaaabb8a999999aaaaabbb8b9999aaaaaabbbb8ba999aaaaaabbbb8baaaaaaaaabbbbb8baaaaaaabbbbbbb8caaaaaabbbbbbbb88777777777788884', '/bqElBnw2TVKdUaolNqBUCCx2VmjwT02GixlHVlP0pRcqvtTKiQDw3WewlsqidpOh0lRnlxoZ9dG4zF8slFTdJUPISciLDv7s4NJkLxYFDTJHUODoPCgX53cmsymAtFVT1LUZQYY+Xt5dXFrs5hrlW1KTRI0QQQKbNzb21pstiLtYVMTlKkbQmX0RatqNBmslgrpYqlQEvR5DEBF5EFPY7FX69WquU1QUxSFE0El7LmFqcXC3WavVhS06TBIkVQkX8upbgpRitKtUKRPk1StH0UQdAJdy4FqBlEKEnicJmlySI4hqCoALwXIthZwRNiWJQkyQI0iKFIDL4XYuJbS0llAkCUYRZEkLQhAy/F6LoW8tZaCzFkACsoTIjxosSHDBAcFAwEw'],
        32: ['1445465645565666', 'qhWFII4zAHCDBA=='],
        33: ['4444444444444444', '/ty6mHZUMhA=']
      };
    const C = MP3_C.split(',').map((x) => parseInt(x, 36) / 1e9);
    const SFB = {
      44100: [0, 4, 8, 12, 16, 20, 24, 30, 36, 44, 52, 62, 74, 90, 110, 134, 162, 196, 238, 288, 342, 418, 576],
      48000: [0, 4, 8, 12, 16, 20, 24, 30, 36, 42, 50, 60, 72, 88, 106, 128, 156, 190, 230, 276, 330, 384, 576],
      32000: [0, 4, 8, 12, 16, 20, 24, 30, 36, 44, 54, 66, 82, 102, 126, 156, 194, 240, 296, 364, 448, 550, 576],
    };
    const RATE_IDX = { 44100: 0, 48000: 1, 32000: 2 };
    const KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    // Tabelele Huffman: { dim (xlen), lin (linbits), linmax, len: Uint8Array, cod: Uint32Array }
    const HT = [];
    let gata = false;
    function initTabele() {
      if (gata) return;
      gata = true;
      const fac = (k, linbits = 0, din = k) => {
        const [lens, b64] = MP3_HT[din];
        const s = atob(b64);
        const len = Uint8Array.from(lens, (c) => parseInt(c, 36));
        const cod = new Uint32Array(len.length);
        let p = 0;
        const bit = () => (s.charCodeAt(p >> 3) >> (7 - (p++ & 7))) & 1;
        for (let i = 0; i < len.length; i++) { let v = 0; for (let j = 0; j < len[i]; j++) v = (v << 1) | bit(); cod[i] = v; }
        HT[k] = { dim: Math.round(Math.sqrt(len.length)), lin: linbits, linmax: (1 << linbits) - 1, len, cod };
      };
      for (const k of [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15]) fac(k);
      [1, 2, 3, 4, 6, 8, 10, 13].forEach((lb, i) => fac(16 + i, lb, 16));
      [4, 5, 6, 7, 8, 9, 11, 13].forEach((lb, i) => fac(24 + i, lb, 24));
      for (const k of [32, 33]) { fac(k); HT[k].dim = 16; }
    }
    // Matricea filtrului polifazic și MDCT (blocuri lungi).
    const M = new Float64Array(32 * 64);
    for (let k = 0; k < 32; k++) for (let i = 0; i < 64; i++) M[k * 64 + i] = Math.cos((2 * k + 1) * (i - 16) * Math.PI / 64);
    const MD = new Float64Array(18 * 36);
    for (let m = 0; m < 18; m++) for (let k = 0; k < 36; k++) MD[m * 36 + k] = Math.sin(Math.PI / 36 * (k + 0.5)) * Math.cos(Math.PI / 72 * (2 * k + 19) * (2 * m + 1));
    const CA = [-0.6, -0.535, -0.33, -0.185, -0.095, -0.041, -0.0142, -0.0037];
    const CS = CA.map((c) => 1 / Math.sqrt(1 + c * c)), CAA = CA.map((c) => c / Math.sqrt(1 + c * c));

    // Scriere pe biți
    function scriitor(n) {
      const u = new Uint8Array(n);
      let p = 0;
      return {
        u,
        get poz() { return p; },
        set poz(v) { p = v; },
        b(v, nb) { for (let i = nb - 1; i >= 0; i--) { if ((v >>> i) & 1) u[p >> 3] |= 0x80 >> (p & 7); p++; } },
      };
    }
    // Biții necesari pentru o regiune [a, b) cu tabelul t.
    function bitiRegiune(ix, a, b, t) {
      if (!t) return 0;
      const T = HT[t], d = T.dim;
      let s = 0;
      for (let i = a; i < b; i += 2) {
        let x = ix[i], y = ix[i + 1];
        if (T.lin) { if (x > 14) { s += T.lin; x = 15; } if (y > 14) { s += T.lin; y = 15; } }
        s += T.len[x * d + y] + (x ? 1 : 0) + (y ? 1 : 0);
      }
      return s;
    }
    function maxim(ix, a, b) { let m = 0; for (let i = a; i < b; i++) if (ix[i] > m) m = ix[i]; return m; }
    // Alege tabelul cu cei mai puțini biți pentru regiune.
    function alegeTabel(ix, a, b) {
      if (b <= a) return [0, 0];
      const m = maxim(ix, a, b);
      if (!m) return [0, 0];
      let cand;
      if (m <= 1) cand = [1]; else if (m <= 2) cand = [2, 3]; else if (m <= 3) cand = [5, 6]; else if (m <= 5) cand = [7, 8, 9];
      else if (m <= 7) cand = [10, 11, 12]; else if (m <= 15) cand = [13, 15];
      else {
        cand = [];
        for (let t = 16; t < 24; t++) if (HT[t].linmax >= m - 15) { cand.push(t); break; }
        for (let t = 24; t < 32; t++) if (HT[t].linmax >= m - 15) { cand.push(t); break; }
      }
      let best = cand[0], bb = Infinity;
      for (const t of cand) { const s = bitiRegiune(ix, a, b, t); if (s < bb) { bb = s; best = t; } }
      return [best, bb];
    }
    // Împarte valorile cuantizate în regiuni și calculează biții (fără scalefactori).
    function analizeaza(ix, sfb) {
      let i = 576;
      while (i > 1 && !ix[i - 1] && !ix[i - 2]) i -= 2;
      let c1 = 0;
      while (i > 3 && ix[i - 1] <= 1 && ix[i - 2] <= 1 && ix[i - 3] <= 1 && ix[i - 4] <= 1) { i -= 4; c1++; }
      const bv = i >> 1, bv2 = i;
      // biții pentru zona count1 (tabelul A sau B)
      let sA = 0, sB = 0;
      for (let k = bv2; k < bv2 + c1 * 4; k += 4) {
        const v = ix[k], w = ix[k + 1], x = ix[k + 2], y = ix[k + 3], q = v * 8 + w * 4 + x * 2 + y, nz = v + w + x + y;
        sA += HT[32].len[q] + nz; sB += 4 + nz;
      }
      // regiunile 0, 1, 2
      let r0 = 0, r1 = 0;
      if (bv2) {
        while (r0 < 15 && sfb[r0 + 2] <= bv2 / 3) r0++;
        while (r1 < 7 && sfb[r0 + r1 + 3] <= bv2 * 2 / 3) r1++;
      }
      const a1 = Math.min(sfb[r0 + 1], bv2), a2 = Math.min(sfb[r0 + r1 + 2], bv2);
      const t0 = alegeTabel(ix, 0, a1), t1 = alegeTabel(ix, a1, a2), t2 = alegeTabel(ix, a2, bv2);
      return { bv, c1, r0, r1, a1, a2, tab: [t0[0], t1[0], t2[0]], c1t: sB < sA ? 1 : 0, biti: t0[1] + t1[1] + t2[1] + Math.min(sA, sB) };
    }
    function cuantizeaza(x34, semn, gg, ix) {
      const f = 2 ** (-0.1875 * (gg - 210));
      let m = 0;
      for (let i = 0; i < 576; i++) { const v = Math.floor(x34[i] * f + 0.4054); ix[i] = v; if (v > m) m = v; }
      return m;
    }
    function scrieHuffman(w, ix, semn, info) {
      const pereche = (t, a, b) => {
        if (!t) return;
        const T = HT[t], d = T.dim;
        for (let i = a; i < b; i += 2) {
          const x0 = ix[i], y0 = ix[i + 1];
          const x = T.lin && x0 > 14 ? 15 : x0, y = T.lin && y0 > 14 ? 15 : y0;
          w.b(T.cod[x * d + y], T.len[x * d + y]);
          if (x0) { if (T.lin && x === 15) w.b(x0 - 15, T.lin); w.b(semn[i], 1); }
          if (y0) { if (T.lin && y === 15) w.b(y0 - 15, T.lin); w.b(semn[i + 1], 1); }
        }
      };
      pereche(info.tab[0], 0, info.a1);
      pereche(info.tab[1], info.a1, info.a2);
      pereche(info.tab[2], info.a2, info.bv * 2);
      const T = HT[info.c1t ? 33 : 32];
      for (let k = info.bv * 2, e = k + info.c1 * 4; k < e; k += 4) {
        const q = ix[k] * 8 + ix[k + 1] * 4 + ix[k + 2] * 2 + ix[k + 3];
        w.b(T.cod[q], T.len[q]);
        for (let j = 0; j < 4; j++) if (ix[k + j]) w.b(semn[k + j], 1);
      }
    }

    // canale: Float32Array[] (1 sau 2), rata: 32000/44100/48000, kbps: 32…320. Întoarce Uint8Array.
    return async function codMp3(canale, rata, kbps = 128, progres) {
      initTabele();
      const nc = Math.min(2, canale.length), sfb = SFB[rata];
      if (!sfb) throw new Error('rată nesuportată');
      const bi = KBPS.indexOf(kbps);
      if (bi < 1) throw new Error('debit nesuportat');
      const N = canale[0].length;
      const nFr = Math.ceil((N + 1152) / 1152) + 1;
      const fr = 144000 * kbps / rata;
      const out = new Uint8Array(Math.ceil(fr + 1) * nFr + 16);
      let pos = 0, rest = 0;
      const sideBiti = nc === 1 ? 136 : 256;
      // stare per canal
      const st = Array.from({ length: nc }, () => ({ X: new Float64Array(512), off: 0, prev: new Float64Array(576) }));
      const Y = new Float64Array(64), xr = new Float64Array(576), x34 = new Float64Array(576), ix = new Int32Array(576), semn = new Uint8Array(576);
      const sb = new Float64Array(576);
      const K = 1 / 9; // câștig: MDCT-ul de mai sus dă de 9 ori valorile așteptate de decodor
      const gr = [[], []];
      for (let f = 0; f < nFr; f++) {
        // dimensiunea cadrului (cu bit de umplere când e nevoie)
        let lung = Math.floor(fr);
        rest += fr - lung;
        let pad = 0;
        if (rest >= 1 - 1e-9) { pad = 1; rest -= 1; lung++; }
        const mainBiti = lung * 8 - 32 - sideBiti;
        const buget = Math.min(4095, Math.floor(mainBiti / (2 * nc)));
        for (let g = 0; g < 2; g++) {
          for (let ch = 0; ch < nc; ch++) {
            const S = st[ch], src = canale[ch];
            const baza = (f * 2 + g) * 576;
            // filtrul polifazic: 18 seturi × 32 de subbenzi
            for (let t = 0; t < 18; t++) {
              S.off = (S.off + 480) & 511; // inserăm 32 de eșantioane noi (cel mai nou la indicele off)
              for (let i = 0; i < 32; i++) { const k = baza + t * 32 + (31 - i); S.X[(S.off + i) & 511] = k < N ? src[k] * K : 0; }
              for (let i = 0; i < 64; i++) {
                let s = 0;
                for (let j = 0; j < 8; j++) s += C[i + 64 * j] * S.X[(S.off + i + 64 * j) & 511];
                Y[i] = s;
              }
              for (let k = 0; k < 32; k++) {
                let s = 0;
                const r = k * 64;
                for (let i = 0; i < 64; i++) s += M[r + i] * Y[i];
                // compensarea inversării de frecvență (benzi impare, eșantioane impare)
                sb[k * 18 + t] = (k & 1) && (t & 1) ? -s : s;
              }
            }
            // MDCT (blocuri lungi) cu granula anterioară
            for (let k = 0; k < 32; k++) {
              for (let m = 0; m < 18; m++) {
                let s = 0;
                const r = m * 36;
                for (let j = 0; j < 18; j++) s += MD[r + j] * S.prev[k * 18 + j] + MD[r + j + 18] * sb[k * 18 + j];
                xr[k * 18 + m] = s;
              }
            }
            S.prev.set(sb);
            // reducerea aliasului
            for (let k = 0; k < 31; k++) {
              for (let i = 0; i < 8; i++) {
                const a = k * 18 + 17 - i, b = (k + 1) * 18 + i, bu = xr[a], bd = xr[b];
                xr[a] = bu * CS[i] + bd * CAA[i];
                xr[b] = bd * CS[i] - bu * CAA[i];
              }
            }
            let mx = 0;
            for (let i = 0; i < 576; i++) { const a = Math.abs(xr[i]); semn[i] = xr[i] < 0 ? 1 : 0; x34[i] = a ** 0.75; if (a > mx) mx = a; }
            // căutare binară a câștigului global: cel mai mic care încape în buget
            let lo = 0, hi = 255, ggBun = 255;
            if (mx < 1e-9) { ggBun = 0; } else {
              while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                const m = cuantizeaza(x34, semn, mid, ix);
                if (m > 8206 || analizeaza(ix, sfb).biti > buget) lo = mid + 1; else { ggBun = mid; hi = mid - 1; }
              }
            }
            if (mx < 1e-9) ix.fill(0); else cuantizeaza(x34, semn, ggBun, ix);
            const info = analizeaza(ix, sfb);
            gr[g][ch] = { info, gg: mx < 1e-9 ? 0 : ggBun, ix: ix.slice(), semn: semn.slice() };
          }
        }
        // scrierea cadrului
        const w = scriitor(lung);
        w.b(0xFFF, 12); w.b(1, 1); w.b(1, 2); w.b(1, 1); // MPEG-1, Layer III, fără CRC
        w.b(bi, 4); w.b(RATE_IDX[rata], 2); w.b(pad, 1); w.b(0, 1);
        w.b(nc === 1 ? 3 : 0, 2); w.b(0, 2); w.b(0, 1); w.b(1, 1); w.b(0, 2);
        w.b(0, 9); w.b(0, nc === 1 ? 5 : 3); // main_data_begin, biți privați
        for (let ch = 0; ch < nc; ch++) w.b(0, 4); // scfsi
        // biții Huffman ai fiecărei granule (part2_3_length)
        const lungimi = gr.map((G) => G.slice(0, nc).map((x) => { const t = scriitor(600); scrieHuffman(t, x.ix, x.semn, x.info); return t.poz; }));
        for (let g = 0; g < 2; g++) {
          for (let ch = 0; ch < nc; ch++) {
            const { info, gg } = gr[g][ch];
            w.b(lungimi[g][ch], 12); w.b(info.bv, 9); w.b(gg, 8); w.b(0, 4); w.b(0, 1);
            for (let r = 0; r < 3; r++) w.b(info.tab[r], 5);
            w.b(info.r0, 4); w.b(info.r1, 3); w.b(0, 1); w.b(0, 1); w.b(info.c1t, 1);
          }
        }
        for (let g = 0; g < 2; g++) for (let ch = 0; ch < nc; ch++) { const x = gr[g][ch]; scrieHuffman(w, x.ix, x.semn, x.info); }
        out.set(w.u, pos);
        pos += lung;
        if (f % 40 === 39) { progres?.(f / nFr); await new Promise((r) => setTimeout(r, 0)); } // nu blocăm pagina
      }
      return out.slice(0, pos);
    };
  })();

  // ---------- Curățenie la ieșirea din aplicație ----------
  let laIesire = null;
  window.addEventListener('hashchange', () => {
    if (laIesire && !/^#\/aplicatii\/audio(\?|$)/.test(location.hash)) { const f = laIesire; laIesire = null; f(); }
  });

  routes.push({ pattern: /^\/aplicatii\/audio$/, handler: async () => pornire() });

  async function pornire() {
    if (laIesire) { const f = laIesire; laIesire = null; f(); }
    const ac = new AbortController();
    const sig = { signal: ac.signal };
    // Starea aplicației: mai multe documente deschise (fișiere audio și proiecte multipistă)
    const S = {
      docs: [], fila: 'acasa', clip: null, redare: null, inreg: null, previz: null,
      panou: 'fisiere', arataPanou: window.innerWidth > 900, spectru: false, prezentare: true, bucla: false, profil: null,
    };
    let D = null; // documentul activ
    const eSunet = () => D?.tip === 'sunet';
    const eMix = () => D?.tip === 'mix';
    const n = () => (eSunet() ? D.canale[0]?.length || 0 : 0);
    const lungClip = (c) => c.canale[0].length / c.rata;
    const durataMix = (d) => Math.max(0, ...d.piste.flatMap((p) => p.clipuri.map((c) => c.start + lungClip(c))));
    const sec = () => (eSunet() ? n() / D.rata : eMix() ? durataMix(D) : 0);
    const areContinut = () => (eSunet() ? n() > 0 : eMix() ? D.piste.some((p) => p.clipuri.length) : false);

    function docSunet(o = {}) {
      return { tip: 'sunet', id: null, titlu: 'Sunet nou', creat: Date.now(), rata: actx ? actx.sampleRate : 44100, canale: [], sel: null, cursor: 0, vs: 0, spp: 1, potrivit: true, istoric: [], refacere: [], marcaje: [], salvat: true, tSalv: null, ...o };
    }
    const CULORI_PISTE = ['#3D8BE0', '#2FB35A', '#F08C00', '#B65BD6', '#E0485C', '#13A6A0', '#C9A400', '#7C8796'];
    let nrPista = 0;
    const pistaNoua = (nume) => ({ id: idNou(), nume, vol: 1, pan: 0, mute: false, solo: false, culoare: CULORI_PISTE[nrPista++ % CULORI_PISTE.length], clipuri: [] });
    function docMix(o = {}) {
      return { tip: 'mix', id: null, titlu: 'Proiect multipistă', creat: Date.now(), rata: 44100, piste: [pistaNoua('Voce'), pistaNoua('Muzică'), pistaNoua('Efecte')], cursor: 0, vs: 0, pxs: 40, potrivit: true, selClip: null, pistaSel: 0, istoric: [], refacere: [], salvat: true, tSalv: null, ...o };
    }

    // ---------- Elemente principale ----------
    const titluFer = h('span', { class: 'ap-audio-titlufer' });
    const stareSalv = h('span', { class: 'ap-audio-salv', role: 'status' });
    const bara = h('div', { class: 'ap-audio-bara' },
      h('a', { class: 'ap-audio-inapoi', href: '#/aplicatii' }, '← Aplicații'),
      h('span', { class: 'ap-audio-sigla', 'aria-hidden': 'true', html: SVG(`<path d="M2 12h2l2-6 2.5 12 3-15 3 17 2.5-12 2 6H22" stroke="#7CF07C" stroke-width="2.2"/>`) }),
      titluFer, h('span', { class: 'ap-audio-spatiu' }), stareSalv);
    const file = h('div', { class: 'ap-audio-file', role: 'tablist', 'aria-label': 'File cu instrumente' });
    const panglica = h('div', { class: 'ap-audio-panglica', role: 'toolbar', 'aria-label': 'Instrumente' });
    const listaPanou = h('div', { class: 'ap-audio-plista' });
    const capPanou = h('div', { class: 'ap-audio-pcap', role: 'tablist' });
    const panouSt = h('aside', { class: 'ap-audio-panouSt', 'aria-label': 'Panoul de fișiere' }, capPanou, listaPanou);
    const tabDoc = h('div', { class: 'ap-audio-tdoc', role: 'tablist', 'aria-label': 'Fișierele deschise' });
    // vederea fișierului audio
    const ovw = h('canvas', { class: 'ap-audio-ovw', role: 'img', 'aria-label': 'Prezentare generală: tot sunetul. Apasă ca să sari acolo.' });
    const cv = h('canvas', { class: 'ap-audio-cv', 'aria-hidden': 'true' });
    const ov = h('canvas', { class: 'ap-audio-ov', role: 'img', 'aria-label': 'Forma de undă. Trage ca să selectezi, apasă ca să muți cursorul, clic dreapta pentru meniu.' });
    const gol = h('div', { class: 'ap-audio-gol' });
    const recPanou = h('div', { class: 'ap-audio-recpanou', hidden: true });
    const zona = h('div', { class: 'ap-audio-zona' }, cv, ov, gol, recPanou);
    const derulare = h('input', { class: 'ap-audio-derulare', type: 'range', min: '0', max: '0', value: '0', step: '1', 'aria-label': 'Derulare în timp' });
    const vizSunet = h('div', { class: 'ap-audio-vs' }, ovw, zona, derulare);
    // vederea multipistă
    const riglaMix = h('canvas', { class: 'ap-audio-mrigla', role: 'img', 'aria-label': 'Cronologia proiectului multipistă' });
    const capete = h('div', { class: 'ap-audio-capete' });
    const pisteCv = h('canvas', { class: 'ap-audio-mcv', role: 'img', 'aria-label': 'Pistele: trage clipurile ca să le muți în timp sau pe altă pistă.' });
    const scrollPiste = h('div', { class: 'ap-audio-mscroll' }, h('div', { class: 'ap-audio-mint' }, capete, h('div', { class: 'ap-audio-mlane' }, pisteCv)));
    const derulareMix = h('input', { class: 'ap-audio-derulare', type: 'range', min: '0', max: '0', value: '0', step: '0.01', 'aria-label': 'Derulare în timp' });
    const btnPistaNoua = h('button', { type: 'button', class: 'ap-audio-pnoua', 'data-tip': 'Pistă nouă', 'data-tipd': 'Adaugă o pistă goală sub celelalte.', onclick: () => ACT.pistaNoua.fn() }, '+ Pistă nouă');
    const vizMix = h('div', { class: 'ap-audio-vm', hidden: true },
      h('div', { class: 'ap-audio-mtop' }, h('div', { class: 'ap-audio-mtopst' }, btnPistaNoua), riglaMix),
      scrollPiste, derulareMix);
    const zonaDoc = h('div', { class: 'ap-audio-zdoc' }, tabDoc, vizSunet, vizMix);
    const corp = h('div', { class: 'ap-audio-corp' }, panouSt, zonaDoc);
    const tip = h('div', { class: 'ap-audio-tip', role: 'tooltip', hidden: true });
    const stare = h('div', { class: 'ap-audio-stare' });
    const app = h('div', { class: 'ap-audio' });

    // ---------- Sfaturi (tooltip-uri ca în program: titlu, explicație, scurtătură) ----------
    let tTip = 0, elTip = null;
    const ascundeTip = () => { clearTimeout(tTip); tip.hidden = true; elTip = null; };
    app.addEventListener('mouseover', (e) => {
      const el = e.target.closest?.('[data-tip]');
      if (el === elTip) return;
      ascundeTip();
      if (!el || !app.contains(el)) return;
      elTip = el;
      tTip = setTimeout(() => {
        if (!el.isConnected) return;
        umple(tip, h('b', {}, el.dataset.tip), el.dataset.tipk ? h('kbd', {}, el.dataset.tipk) : null, el.dataset.tipd ? h('span', {}, el.dataset.tipd) : null);
        tip.hidden = false;
        const r = el.getBoundingClientRect(), ra = app.getBoundingClientRect();
        const w = tip.offsetWidth, ht = tip.offsetHeight;
        let x = r.left - ra.left, y = r.bottom - ra.top + 6;
        if (y + ht > ra.height - 4) y = r.top - ra.top - ht - 6;
        tip.style.left = `${lim(x, 4, ra.width - w - 4)}px`;
        tip.style.top = `${Math.max(4, y)}px`;
      }, 550);
    }, sig);
    app.addEventListener('mouseout', (e) => { if (elTip && !elTip.contains(e.relatedTarget)) ascundeTip(); }, sig);
    app.addEventListener('pointerdown', ascundeTip, { capture: true, signal: ac.signal });

    // ---------- Mesaje și dialoguri ----------
    function toast(text, tipM = '') {
      app.querySelector('.ap-audio-toast')?.remove();
      const t = h('div', { class: `ap-audio-toast ${tipM}`, role: 'status' }, text);
      app.append(t);
      setTimeout(() => t.classList.add('gone'), tipM === 'error' ? 5000 : 2800);
      setTimeout(() => t.remove(), tipM === 'error' ? 5600 : 3400);
    }
    let dlgDeschis = 0;
    // Dialog modal: rezolvă cu valoarea butonului apăsat (null la Esc / Anulare).
    // Un buton cu „verifica” rămâne în dialog când funcția întoarce false (de ex. Previzualizare).
    function dialog(titlu, corpD, btns = [{ t: 'OK', v: true, p: true }], { lat = false, laDeschidere, laInchidere, ico } = {}) {
      return new Promise((resolve) => {
        dlgDeschis++;
        ascundeTip();
        const inchide = (v) => { if (!fundal.isConnected) return; laInchidere?.(); fundal.remove(); dlgDeschis--; resolve(v); };
        const bs = btns.map((b) => {
          const el = h('button', { type: 'button', class: `ap-audio-db${b.p ? ' p' : ''}${b.st ? ' st' : ''}`, onclick: async () => {
            if (b.verifica && !(await b.verifica(el))) return;
            inchide(typeof b.v === 'function' ? b.v() : b.v);
          } }, b.t);
          return el;
        });
        const cutie = h('div', { class: `ap-audio-dlg${lat ? ' lat' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
          h('div', { class: 'ap-audio-dcap' }, ico ? ic(ico) : null, h('b', {}, titlu), h('button', { type: 'button', class: 'ap-audio-x', 'aria-label': 'Închide', onclick: () => inchide(null) }, '✕')),
          h('div', { class: 'ap-audio-dcorp' }, [corpD].flat(Infinity)),
          bs.length ? h('div', { class: 'ap-audio-dbut' }, bs) : null);
        const fundal = h('div', { class: 'ap-audio-fundal' }, cutie);
        fundal.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Escape') inchide(null);
          else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'range') { const p = btns.findIndex((b) => b.p); if (p >= 0) bs[p].click(); }
        });
        fundal.addEventListener('mousedown', (e) => { if (e.target === fundal) cutie.classList.add('scutura'); setTimeout(() => cutie.classList.remove('scutura'), 300); });
        app.append(fundal);
        laDeschidere?.(inchide);
        (cutie.querySelector('input:not([type=radio]):not([type=range]), select') || cutie.querySelector('.ap-audio-db.p') || cutie.querySelector('button')).focus();
      });
    }
    // Fereastră „Se prelucrează…” pentru operațiile lungi
    async function ocupat(text, fn) {
      const bar = h('i', {});
      const f = h('div', { class: 'ap-audio-fundal ocupat' }, h('div', { class: 'ap-audio-dlg mic' }, h('div', { class: 'ap-audio-dcorp' },
        h('p', {}, h('b', {}, text)), h('div', { class: 'ap-audio-progres' }, bar))));
      app.append(f);
      app.classList.add('asteapta');
      await pauzaUI();
      try { return await fn((p) => { bar.style.width = `${Math.round(p * 100)}%`; bar.classList.add('det'); }); } finally { f.remove(); app.classList.remove('asteapta'); }
    }
    // Un rând cu glisor și câmp numeric legate între ele.
    function glisor(eticheta, min, max, pas, val, unit, laSchimbare) {
      const r = h('input', { type: 'range', min, max, step: pas, value: val, 'aria-label': eticheta });
      const t = h('input', { type: 'number', min, max, step: pas, value: val, class: 'ap-audio-nr', 'aria-label': eticheta });
      const sincr = (din, spre) => { spre.value = din.value; laSchimbare?.(Number(din.value)); };
      r.addEventListener('input', () => sincr(r, t));
      t.addEventListener('input', () => { if (t.value !== '') sincr(t, r); });
      const el = h('label', { class: 'ap-audio-gl' }, h('span', {}, eticheta), r, t, h('span', { class: 'u' }, unit));
      el.valoare = () => Math.min(max, Math.max(min, Number(t.value) || 0));
      el.seteaza = (v) => { r.value = v; t.value = v; laSchimbare?.(Number(v)); };
      laSchimbare?.(val);
      return el;
    }
    function lista(eticheta, optiuni, val) {
      const s = h('select', { class: 'ap-audio-sel', 'aria-label': eticheta }, optiuni.map(([v, t]) => h('option', { value: v, selected: v === val }, t)));
      const el = h('label', { class: 'ap-audio-gl' }, h('span', {}, eticheta), s);
      el.valoare = () => s.value;
      el.sel = s;
      return el;
    }
    function intrebaText(titlu, eticheta, val) {
      const inp = h('input', { type: 'text', class: 'ap-audio-txt', value: val, maxlength: '80', 'aria-label': eticheta });
      return dialog(titlu, h('label', { class: 'ap-audio-gl' }, h('span', {}, eticheta), inp), [{ t: 'Anulare', v: null }, { t: 'OK', v: () => inp.value.trim(), p: true }])
        .then((v) => v || null);
    }
    const confirma = (titlu, text, da = 'Da') => dialog(titlu, h('p', {}, text), [{ t: 'Nu', v: false }, { t: da, v: true, p: true }], { ico: 'ajutor' });

    // ---------- Meniuri derulante și meniul contextual ----------
    let meniuDeschis = null;
    function inchideMeniu() { meniuDeschis?.remove(); meniuDeschis = null; }
    function meniu(x, y, items) {
      inchideMeniu();
      ascundeTip();
      const m = h('div', { class: 'ap-audio-meniu', role: 'menu' }, items.map((it) => (it.sep ? h('div', { class: 'ap-audio-msep', role: 'separator' })
        : h('button', { type: 'button', role: 'menuitem', class: 'ap-audio-mi', disabled: !!it.dez, onclick: () => { inchideMeniu(); it.fn(); } },
          it.ico ? ic(it.ico) : h('span', { class: 'ap-audio-ic' }), h('span', { class: 'ap-audio-mt' }, it.t), it.k ? h('kbd', {}, it.k) : null))));
      app.append(m);
      const ra = app.getBoundingClientRect();
      m.style.left = `${lim(x - ra.left, 2, ra.width - m.offsetWidth - 2)}px`;
      m.style.top = `${lim(y - ra.top, 2, ra.height - m.offsetHeight - 2)}px`;
      meniuDeschis = m;
      m.addEventListener('keydown', (e) => {
        const bs = [...m.querySelectorAll('button:not(:disabled)')], i = bs.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.stopPropagation(); inchideMeniu(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length]?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length]?.focus(); }
      });
      m.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    }
    document.addEventListener('pointerdown', (e) => { if (meniuDeschis && !meniuDeschis.contains(e.target)) inchideMeniu(); }, { capture: true, signal: ac.signal });

    // ---------- Acțiuni (butoanele panglicii, meniurile și scurtăturile folosesc aceeași listă) ----------
    // cere: docSunet | sunet | sel | clip | mix | clipSel | undo | redo | continut | gen
    const ACT = {
      nou: { t: 'Fișier nou', ico: 'nou', d: 'Deschide un fișier audio gol, într-o filă nouă.', fn: () => fisierNou() },
      mixNou: { t: 'Proiect multipistă', ico: 'multipista', d: 'Proiect nou cu mai multe piste (voce, muzică, efecte), ca în Audacity sau MixPad.', fn: () => mixNou() },
      deschide: { t: 'Deschidere fișier', ico: 'deschide', k: 'Ctrl+O', d: 'Deschide unul sau mai multe fișiere audio de pe calculator (MP3, WAV, OGG). Fiecare apare într-o filă.', fn: () => deschideFisiere() },
      proiecte: { t: 'Proiectele mele', ico: 'proiecte', d: 'Fișierele și proiectele salvate în acest browser.', fn: () => panouProiecte() },
      salveaza: { t: 'Salvare', ico: 'salveaza', k: 'Ctrl+S', d: 'Salvează fișierul în acest browser (se salvează și singur).', cere: 'continut', fn: () => salveazaDoc(D, true) },
      salveazaCa: { t: 'Salvare fișier ca', ico: 'salveazaCa', d: 'Salvează sunetul pe calculator ca MP3, WAV sau OGG/WebM.', cere: 'continut', fn: () => dialogExport() },
      inchide: { t: 'Închidere fișier', ico: 'inchide', d: 'Închide fila fișierului curent (rămâne în Proiectele mele).', fn: () => inchideDoc(D) },
      inregistreaza: { t: 'Înregistrare', ico: 'inregistreaza', d: 'Înregistrează cu microfonul la cursor. Apasă Oprire (sau Spațiu) ca să termini.', cere: 'gen', fn: () => inregistreaza() },
      decupare: { t: 'Decupare', ico: 'decupare', k: 'Ctrl+X', d: 'Taie selecția și o păstrează pentru lipire.', cere: 'sel', fn: () => decupare() },
      copiere: { t: 'Copiere', ico: 'copiere', k: 'Ctrl+C', d: 'Copiază selecția (poți lipi și în alt fișier deschis).', cere: 'sel', fn: () => copiere() },
      lipire: { t: 'Lipire', ico: 'lipire', k: 'Ctrl+V', d: 'Lipește la cursor; dacă ai o selecție, o înlocuiește.', cere: 'clip', fn: () => lipire() },
      lipireMix: { t: 'Lipire combinată', ico: 'lipireMix', k: 'Ctrl+Shift+V', d: 'Suprapune sunetul copiat peste cel existent, de la cursor (de exemplu muzică sub voce).', cere: 'clip', fn: () => lipireCombinata() },
      stergere: { t: 'Ștergere', ico: 'stergere', k: 'Delete', d: 'Șterge selecția (o tuse, un „ăăă”, o pauză).', cere: 'sel', fn: () => stergere() },
      trunchiere: { t: 'Trunchiere', ico: 'trunchiere', k: 'Ctrl+T', d: 'Păstrează doar selecția și șterge restul.', cere: 'sel', fn: () => trunchiere() },
      selTot: { t: 'Selectare totală', ico: 'selTot', k: 'Ctrl+A', d: 'Selectează tot sunetul.', cere: 'sunet', fn: () => selecteaza(0, n()) },
      liniste: { t: 'Inserare liniște', ico: 'liniste', d: 'Inserează o pauză (liniște) la cursor.', cere: 'gen', fn: () => dialogGenerare('liniste') },
      inserareFisier: { t: 'Inserare fișier', ico: 'inserareFisier', d: 'Pune alt fișier audio la cursor (unul după altul).', cere: 'docSunet', fn: () => adaugaFisier('inserare') },
      mixareFisier: { t: 'Mixare cu fișier', ico: 'mixareFisier', d: 'Suprapune alt fișier audio peste sunet, de la cursor (unul peste altul).', cere: 'docSunet', fn: () => adaugaFisier('mixare') },
      marcaj: { t: 'Marcaj', ico: 'marcaj', k: 'M', d: 'Pune un marcaj cu nume la cursor (de exemplu „Începe vocea”).', cere: 'sunet', fn: () => adaugaMarcaj(false) },
      regiune: { t: 'Regiune', ico: 'regiune', d: 'Transformă selecția într-o regiune cu nume, ca s-o găsești ușor.', cere: 'sel', fn: () => adaugaMarcaj(true) },
      anulare: { t: 'Anulare', ico: 'anulare', k: 'Ctrl+Z', d: 'Anulează ultima modificare. Vezi tot istoricul în panoul Istoric.', cere: 'undo', fn: () => anulare() },
      refacere: { t: 'Refacere', ico: 'refacere', k: 'Ctrl+Y', d: 'Reface modificarea anulată.', cere: 'redo', fn: () => refacere() },
      amplificare: { t: 'Amplificare', ico: 'amplificare', d: 'Sunet mai tare sau mai încet, în decibeli (dB) sau procente.', cere: 'sunet', fn: () => efectDialog('amplificare') },
      normalizare: { t: 'Normalizare', ico: 'normalizare', d: 'Partea cea mai tare ajunge la nivelul maxim ales, fără distorsiuni.', cere: 'sunet', fn: () => efectDialog('normalizare') },
      amutire: { t: 'Amuțire', ico: 'amutire', d: 'Înlocuiește selecția cu liniște (durata rămâne aceeași).', cere: 'sel', fn: () => efectDirect('Amuțire', (c) => c.fill(0)) },
      fadeIn: { t: 'Estompare la intrare', ico: 'fadeIn', d: 'Fade In: sunetul pornește încet și crește treptat.', cere: 'sunet', fn: () => efectDirect('Estompare la intrare', (c) => { const L = c.length; for (let i = 0; i < L; i++) c[i] *= i / L; return c; }) },
      fadeOut: { t: 'Estompare la ieșire', ico: 'fadeOut', d: 'Fade Out: sunetul scade treptat până la liniște.', cere: 'sunet', fn: () => efectDirect('Estompare la ieșire', (c) => { const L = c.length; for (let i = 0; i < L; i++) c[i] *= 1 - i / L; return c; }) },
      ecou: { t: 'Ecou', ico: 'ecou', d: 'Sunetul se repetă, tot mai încet.', cere: 'sunet', fn: () => efectDialog('ecou') },
      reverb: { t: 'Reverberație', ico: 'reverb', d: 'Sunet ca într-o sală mare sau într-o biserică.', cere: 'sunet', fn: () => efectDialog('reverb') },
      egalizator: { t: 'Egalizator', ico: 'egalizator', d: 'Mai multe sunete joase (bas) sau înalte, pe 5 benzi de frecvență.', cere: 'sunet', fn: () => efectDialog('egalizator') },
      tonInalt: { t: 'Schimbare ton', ico: 'tonInalt', d: 'Vocea mai groasă sau mai subțire, fără să se schimbe durata.', cere: 'sunet', fn: () => efectDialog('ton') },
      tempo: { t: 'Tempo', ico: 'tempo', d: 'Mai repede sau mai încet, fără să se schimbe tonul.', cere: 'sunet', fn: () => efectDialog('tempo') },
      viteza: { t: 'Viteză', ico: 'viteza', d: 'Ca la o casetă: mai repede și mai subțire, sau mai încet și mai gros.', cere: 'sunet', fn: () => efectDialog('viteza') },
      inversare: { t: 'Inversare', ico: 'inversare', d: 'Sunetul de-a-ndoaselea (de la sfârșit la început).', cere: 'sunet', fn: () => efectDirect('Inversare', (c) => c.reverse()) },
      profilZgomot: { t: 'Preia profilul zgomotului', ico: 'profilZgomot', d: 'Selectează o porțiune cu DOAR zgomot (fără voce), apoi apasă aici. Reducerea zgomotului va ști ce să scoată.', cere: 'sel', fn: () => preiaProfil() },
      reducereZgomot: { t: 'Reducerea zgomotului', ico: 'reducereZgomot', d: 'Scoate zumzetul de fond (ventilator, trafic, fâșâit).', cere: 'sunet', fn: () => efectDialog('zgomot') },
      eliminareLiniste: { t: 'Eliminarea liniștii', ico: 'eliminareLiniste', d: 'Scurtează automat pauzele prea lungi dintre cuvinte.', cere: 'sunet', fn: () => efectDialog('liniste') },
      treceSus: { t: 'Filtru trece-sus', ico: 'treceSus', d: 'Taie sunetele foarte joase (bubuit, zumzet de rețea, vânt).', cere: 'sunet', fn: () => efectDialog('treceSus') },
      treceJos: { t: 'Filtru trece-jos', ico: 'treceJos', d: 'Taie sunetele foarte înalte (fâșâit, șuierat).', cere: 'sunet', fn: () => efectDialog('treceJos') },
      ton: { t: 'Ton', ico: 'ton', d: 'Generează un ton (o notă) la cursor.', cere: 'gen', fn: () => dialogGenerare('ton') },
      zgomot: { t: 'Zgomot', ico: 'zgomot', d: 'Generează zgomot alb, roz sau maro (ploaie, vânt, cascadă).', cere: 'gen', fn: () => dialogGenerare('zgomot') },
      genLiniste: { t: 'Liniște', ico: 'liniste', d: 'Generează o pauză de liniște la cursor.', cere: 'gen', fn: () => dialogGenerare('liniste') },
      dtmf: { t: 'Tonuri DTMF', ico: 'dtmf', d: 'Tonurile tastelor de telefon (0–9, *, #).', cere: 'gen', fn: () => dialogGenerare('dtmf') },
      stereoMono: { t: 'Stereo / Mono', ico: 'stereoMono', d: 'Transformă sunetul stereo în mono sau invers.', cere: 'sunet', fn: () => conversieCanale() },
      spectru: { t: 'Spectrogramă', ico: 'spectru', d: 'Arată frecvențele sunetului în timp (jos = sunete groase, sus = subțiri).', cere: 'docSunet', comuta: () => S.spectru, fn: () => { S.spectru = !S.spectru; deseneaza(); actualizeaza(); } },
      prezentare: { t: 'Prezentare generală', ico: 'prezentare', d: 'Banda de sus cu tot sunetul și porțiunea care se vede pe ecran.', cere: 'docSunet', comuta: () => S.prezentare, fn: () => { S.prezentare = !S.prezentare; ovw.hidden = !S.prezentare; deseneaza(); actualizeaza(); } },
      panou: { t: 'Panoul Fișiere', ico: 'panou', d: 'Arată sau ascunde panoul din stânga (Fișiere, Marcaje, Istoric).', comuta: () => S.arataPanou, fn: () => { S.arataPanou = !S.arataPanou; panouSt.hidden = !S.arataPanou; actualizeaza(); } },
      zoomPlus: { t: 'Mărire', ico: 'zoomPlus', k: 'Ctrl+rotiță', d: 'Mărește forma de undă ca să vezi detaliile.', cere: 'continut', fn: () => zoomGen(0.5) },
      zoomMinus: { t: 'Micșorare', ico: 'zoomMinus', k: 'Ctrl+rotiță', d: 'Micșorează forma de undă.', cere: 'continut', fn: () => zoomGen(2) },
      zoomSel: { t: 'Zoom pe selecție', ico: 'zoomSel', d: 'Selecția umple tot ecranul.', cere: 'sel', fn: () => zoomSel() },
      potrivire: { t: 'Tot sunetul', ico: 'potrivire', d: 'Tot sunetul pe ecran.', cere: 'continut', fn: () => potrivireGen() },
      trimiteMix: { t: 'Trimite la multipistă', ico: 'trimiteMix', d: 'Pune fișierul curent (sau selecția) pe o pistă nouă într-un proiect multipistă.', cere: 'sunet', fn: () => trimiteLaMix() },
      pistaNoua: { t: 'Pistă nouă', ico: 'pistaNoua', d: 'Adaugă o pistă goală.', cere: 'mix', fn: () => adaugaPista() },
      importPista: { t: 'Import audio', ico: 'importPista', d: 'Fișier → Import → Audio: fiecare fișier ales vine pe o pistă nouă, la cursor.', cere: 'mix', fn: () => importPeste() },
      imparte: { t: 'Împărțire clip', ico: 'imparte', k: 'S', d: 'Taie clipul selectat în două, în dreptul cursorului.', cere: 'clipSel', fn: () => imparteClip() },
      stergeClip: { t: 'Ștergere clip', ico: 'stergeClip', k: 'Delete', d: 'Șterge clipul selectat de pe pistă.', cere: 'clipSel', fn: () => stergeClip() },
      mixdown: { t: 'Mixare în fișier nou', ico: 'mixdown', d: 'Amestecă toate pistele (cele neamuțite) într-un singur fișier audio, deschis într-o filă nouă.', cere: 'mixPlin', fn: () => mixInFisier() },
    };
    const FILE = {
      acasa: { t: 'Acasă', grupe: [['Fișier', ['nou', 'deschide', 'salveaza', 'salveazaCa']], ['Înregistrare', ['inregistreaza']], ['Editare', ['decupare', 'copiere', 'lipire', 'stergere']], ['Istoric', ['anulare', 'refacere']], ['Efecte uzuale', ['amplificare', 'normalizare', 'fadeIn', 'fadeOut']]] },
      editare: { t: 'Editare', grupe: [['Clipboard', ['decupare', 'copiere', 'lipire', 'lipireMix']], ['Selecție', ['stergere', 'trunchiere', 'selTot']], ['Inserare', ['liniste', 'inserareFisier', 'mixareFisier']], ['Marcaje', ['marcaj', 'regiune']], ['Istoric', ['anulare', 'refacere']]] },
      nivel: { t: 'Nivel', grupe: [['Volum', ['amplificare', 'normalizare', 'amutire']], ['Estompare', ['fadeIn', 'fadeOut']]], tinta: true },
      efecte: { t: 'Efecte', grupe: [['Efecte', ['ecou', 'reverb', 'egalizator']], ['Ton și viteză', ['tonInalt', 'tempo', 'viteza']], ['Altele', ['inversare']]], tinta: true },
      curatare: { t: 'Curățare', grupe: [['Zgomot', ['profilZgomot', 'reducereZgomot']], ['Liniște', ['eliminareLiniste']], ['Filtre', ['treceSus', 'treceJos']]], tinta: true },
      instrumente: { t: 'Instrumente', grupe: [['Generare', ['ton', 'zgomot', 'genLiniste', 'dtmf']], ['Conversie', ['stereoMono']], ['Analiză', ['spectru']]] },
      multipista: { t: 'Multipistă', grupe: [['Proiect', ['mixNou', 'trimiteMix']], ['Piste', ['pistaNoua', 'importPista']], ['Clipuri', ['imparte', 'stergeClip']], ['Mixare', ['mixdown', 'salveazaCa']]], sfat: 'Fiecare sursă pe pista ei: trage clipurile în timp, reglează Vol și Bal, folosește M (Mute) și S (Solo). La salvare, pistele se amestecă într-un singur fișier.' },
      vizualizare: { t: 'Vizualizare', grupe: [['Zoom', ['zoomPlus', 'zoomMinus', 'zoomSel', 'potrivire']], ['Afișare', ['spectru', 'prezentare', 'panou']]] },
    };
    const butoane = []; // [buton, cheie acțiune]
    function buton(k, cls = 'ap-audio-b') {
      const a = ACT[k];
      const b = h('button', { type: 'button', class: cls, 'aria-label': a.t, 'data-tip': a.t, 'data-tipd': a.d, 'data-tipk': a.k || null, onmousedown: (e) => e.preventDefault(), onclick: () => a.fn() },
        ic(a.ico), cls === 'ap-audio-b' ? h('span', {}, a.t) : null);
      butoane.push([b, k]);
      return b;
    }
    const tinta = h('span', { class: 'ap-audio-tinta' });
    function deseneazaPanglica() {
      for (let i = butoane.length - 1; i >= 0; i--) if (!butoane[i][0].isConnected || panglica.contains(butoane[i][0])) butoane.splice(i, 1);
      const f = FILE[S.fila];
      umple(panglica, f.grupe.map(([t, ks]) => h('div', { class: 'ap-audio-grupa', role: 'group', 'aria-label': t }, h('div', { class: 'ap-audio-gbut' }, ks.map((k) => buton(k))), h('span', { class: 'ap-audio-geticheta' }, t))),
        f.tinta ? tinta : null, f.sfat ? h('span', { class: 'ap-audio-sfat' }, f.sfat) : null);
      for (const b of file.querySelectorAll('[data-f]')) b.setAttribute('aria-selected', String(b.dataset.f === S.fila));
      actualizeaza();
    }
    let tMeniuInchis = 0;
    const btnFisier = h('button', { type: 'button', class: 'ap-audio-fila fisier', 'aria-haspopup': 'menu', onclick: (e) => {
      if (Date.now() - tMeniuInchis < 250) return;
      const r = e.currentTarget.getBoundingClientRect();
      meniuFisier(r.left, r.bottom + 2);
    }, onpointerdown: () => { if (meniuDeschis) tMeniuInchis = Date.now(); } }, ic('meniu'), 'Fișier', ic('sageata'));
    function meniuFisier(x, y) {
      const m = (k) => ({ t: ACT[k].t, ico: ACT[k].ico, k: ACT[k].k, fn: ACT[k].fn, dez: !poate(k) });
      meniu(x, y, [m('nou'), m('mixNou'), m('deschide'), m('proiecte'), { sep: 1 }, m('salveaza'), m('salveazaCa'), { sep: 1 },
        { t: 'Redenumire…', fn: () => redenumesteDoc(D) }, m('inchide'), { sep: 1 }, { t: 'Ieșire din editor', fn: () => { location.hash = '#/aplicatii'; } }]);
    }
    umple(file, btnFisier,
      Object.entries(FILE).map(([k, f]) => h('button', { type: 'button', role: 'tab', class: 'ap-audio-fila', 'data-f': k, onclick: () => { S.fila = k; deseneazaPanglica(); } }, f.t)),
      h('span', { class: 'ap-audio-spatiu' }),
      h('button', { type: 'button', class: 'ap-audio-fila ajutor', 'data-tip': 'Ajutor', 'data-tipd': 'Scurtăturile de la tastatură și pașii de bază.', onclick: () => ajutor() }, ic('ajutor'), 'Ajutor'));

    // ---------- Bara de redare (transport), contorul de timp și contoarele de nivel ----------
    const tr = (ico, t, fn, cls = '', k = '') => h('button', { type: 'button', class: `ap-audio-t ${cls}`, 'aria-label': t, 'data-tip': t, 'data-tipk': k || null, onmousedown: (e) => e.preventDefault(), onclick: fn }, ic(ico));
    const bRedare = tr('redare', 'Redare', () => comutaRedare(), 'mare', 'Spațiu');
    const bOprire = tr('oprire', 'Oprire', () => oprire(), '', 'Spațiu');
    const bInreg = tr('inregistreaza', 'Înregistrare', () => inregistreaza(), 'rosu');
    const bBucla = tr('bucla', 'Redare în buclă', () => { S.bucla = !S.bucla; actualizeaza(); });
    const bRedareSel = tr('redareSel', 'Redă doar selecția', () => reda(true));
    const contorTimp = h('b', {}, '0:00:00.000');
    const contorEt = h('small', {}, 'Poziție');
    const contor = h('div', { class: 'ap-audio-contor', 'aria-live': 'off', role: 'timer' }, contorEt, contorTimp);
    const camp = (et) => { const v = h('output', {}, '—'); return [h('label', { class: 'ap-audio-camp' }, h('span', {}, et), v), v]; };
    const [cInc, vInc] = camp('Început sel.'), [cSf, vSf] = camp('Sfârșit sel.'), [cLg, vLg] = camp('Lungime');
    const metru = (et) => {
      const masca = h('i', { class: 'ap-audio-mmasca' }), vrf = h('b', { class: 'ap-audio-mvarf' });
      const el = h('div', { class: 'ap-audio-metru' }, h('span', {}, et), h('div', { class: 'ap-audio-mbar' }, masca, vrf));
      el.seteaza = (p, pv) => { masca.style.width = `${100 - p * 100}%`; vrf.style.left = `calc(${pv * 100}% - 2px)`; vrf.style.opacity = pv > 0.01 ? '1' : '0'; vrf.classList.toggle('rosu', pv > 0.985); };
      return el;
    };
    const mS = metru('S'), mD = metru('D');
    const metre = h('div', { class: 'ap-audio-metre', 'aria-hidden': 'true', 'data-tip': 'Contoare de nivel', 'data-tipd': 'Cât de tare se aude, pe canalul stâng (S) și drept (D). Verde = bine, galben = tare, roșu = prea tare (distorsionat).' },
      mS, mD, h('div', { class: 'ap-audio-mscara' }, ['-60', '-40', '-20', '-12', '-6', '-3', '0'].map((t) => h('span', { 'data-db': t }, t))));
    const transport = h('div', { class: 'ap-audio-transport' },
      h('div', { class: 'ap-audio-tgrup' },
        tr('inceput', 'La început', () => mutaCursorGen(0), '', 'Home'),
        tr('inapoi', 'Înapoi 5 secunde', () => salt(-5)),
        bRedare, bOprire, bInreg,
        tr('inainte', 'Înainte 5 secunde', () => salt(5)),
        tr('sfarsit', 'La sfârșit', () => mutaCursorGen(Infinity), '', 'End'),
        bBucla, bRedareSel),
      contor,
      h('div', { class: 'ap-audio-campuri' }, cInc, cSf, cLg),
      metre,
      h('div', { class: 'ap-audio-tgrup zoom' }, buton('zoomMinus', 'ap-audio-t mic'), buton('zoomPlus', 'ap-audio-t mic'), buton('zoomSel', 'ap-audio-t mic'), buton('potrivire', 'ap-audio-t mic')));
    umple(app, bara, file, panglica, corp, transport, stare, tip);
    panouSt.hidden = !S.arataPanou;

    // Bara de predare la sarcină (apare doar pentru elevi, când există o sarcină activă)
    if (window.EduSarcini?.bara) {
      try {
        const b = await window.EduSarcini.bara('audio', async () => lucrare());
        if (b instanceof Node) bara.after(b);
      } catch { /* fără bară */ }
    }
    show(h('div', { class: 'lab-ecran' }, app));
    document.title = 'Editor audio – edudigi';

    // ---------- Istoric (Anulare / Refacere), pentru fiecare fișier ----------
    // Fiecare operație creează tablouri noi, așa că istoricul păstrează doar referințe la sunet.
    const copiePiste = (piste) => piste.map((p) => ({ ...p, clipuri: p.clipuri.map((c) => ({ ...c })) }));
    const instantaneu = (et) => (eSunet()
      ? { et, canale: D.canale, rata: D.rata, sel: D.sel, cursor: D.cursor, marcaje: D.marcaje.map((m) => ({ ...m })) }
      : { et, piste: copiePiste(D.piste), selClip: D.selClip });
    function pastreazaIstoric(et) {
      D.istoric.push(instantaneu(et));
      D.refacere = [];
      let total = 0;
      for (let i = D.istoric.length - 1; i >= 0; i--) {
        const x = D.istoric[i];
        total += x.canale ? x.canale.length * (x.canale[0]?.length || 0) : 0;
        if (total > MAX_UNDO_ESANT || D.istoric.length - i > MAX_UNDO) { D.istoric.splice(0, i + 1); break; }
      }
    }
    // Mută marcajele după o modificare: porțiunea [a, b) a devenit lungă de L eșantioane.
    function mutaMarcaje(a, b, L) {
      const d = L - (b - a);
      for (const m of D.marcaje) for (const k of ['t', 't2']) {
        if (m[k] == null) continue;
        if (m[k] >= b) m[k] += d; else if (m[k] > a) m[k] = Math.min(m[k], a + L);
      }
      D.marcaje = D.marcaje.filter((m) => m.t2 == null || m.t2 > m.t);
    }
    function seteaza(canale, { sel = null, cursor = D.cursor, et = 'Modificare', rata = D.rata, schimb } = {}) {
      pastreazaIstoric(et);
      if (schimb) mutaMarcaje(...schimb);
      D.canale = canale;
      D.rata = rata;
      D.sel = sel;
      D.cursor = Math.min(cursor, canale[0]?.length || 0);
      const N = canale[0]?.length || 0;
      for (const m of D.marcaje) { m.t = Math.min(m.t, N); if (m.t2 != null) m.t2 = Math.min(m.t2, N); }
      dupaModificare();
    }
    function restaureaza(din, spre) {
      const x = din.pop();
      if (!x) return null;
      oprireRedare();
      spre.push(instantaneu(x.et));
      if (x.canale) Object.assign(D, { canale: x.canale, rata: x.rata, sel: x.sel, cursor: x.cursor, marcaje: x.marcaje.map((m) => ({ ...m })) });
      else Object.assign(D, { piste: copiePiste(x.piste), selClip: x.selClip });
      return x.et;
    }
    function anulare(pasi = 1, tacut = false) {
      let et = null;
      for (let i = 0; i < pasi; i++) et = restaureaza(D.istoric, D.refacere) || et;
      if (et) { dupaModificare(); if (!tacut) toast(`Anulat: ${et}`); }
    }
    function refacere(pasi = 1, tacut = false) {
      let et = null;
      for (let i = 0; i < pasi; i++) et = restaureaza(D.refacere, D.istoric) || et;
      if (et) { dupaModificare(); if (!tacut) toast(`Refăcut: ${et}`); }
    }
    function dupaModificare() {
      oprireRedare();
      if (eSunet()) {
        limiteazaVedere();
        if (D.potrivit || D.spp * latime() > n() * 1.05 + 10) potriveste(false); // dacă se vedea tot sunetul, rămâne tot pe ecran
      }
      programeazaSalvare(D);
      redeseneazaTot();
    }

    // ---------- Editare (fișier audio) ----------
    const zonaLucru = () => (D.sel ? [D.sel.a, D.sel.b] : [0, n()]);
    const tintaText = () => (D.sel ? `selecția (${nr((D.sel.b - D.sel.a) / D.rata, 2)} s)` : 'tot sunetul');
    const faraSunet = () => { if (!eSunet()) { toast('Comanda merge pe un fișier audio. Alege fila unui fișier.'); return true; } if (!n()) { toast('Încă nu ai niciun sunet. Înregistrează sau deschide un fișier.'); return true; } return false; };
    const faraSel = () => { if (faraSunet()) return true; if (!D.sel) { toast('Selectează mai întâi o porțiune: trage cu mouse-ul (sau cu degetul) pe forma de undă.'); return true; } return false; };
    function copiere() {
      if (faraSel()) return;
      S.clip = { canale: D.canale.map((c) => c.slice(D.sel.a, D.sel.b)), rata: D.rata };
      actualizeaza();
      toast(`Copiat: ${nr((D.sel.b - D.sel.a) / D.rata, 2)} s. Poți lipi și în alt fișier deschis.`);
    }
    function decupare() {
      if (faraSel()) return;
      const { a, b } = D.sel;
      S.clip = { canale: D.canale.map((c) => c.slice(a, b)), rata: D.rata };
      seteaza(D.canale.map((c) => lipeste([c.subarray(0, a), c.subarray(b)])), { cursor: a, et: 'Decupare', schimb: [a, b, 0] });
    }
    function stergere() {
      if (faraSel()) return;
      const { a, b } = D.sel;
      seteaza(D.canale.map((c) => lipeste([c.subarray(0, a), c.subarray(b)])), { cursor: a, et: 'Ștergere', schimb: [a, b, 0] });
    }
    function trunchiere() {
      if (faraSel()) return;
      const { a, b } = D.sel;
      seteaza(D.canale.map((c) => c.slice(a, b)), { cursor: 0, et: 'Trunchiere', schimb: [0, a, 0] });
      potriveste();
    }
    function selecteaza(a, b) {
      if (!eSunet() || !n()) return;
      D.sel = b - a > 0 ? { a, b } : null;
      D.cursor = a;
      deseneazaOv();
      actualizeaza();
    }
    // Aduce un sunet la rata și canalele fișierului.
    async function potrivesteSursa(src) {
      const nc = n() ? D.canale.length : src.canale.length;
      const rata = n() ? D.rata : src.rata;
      return { rata, canale: await reesantioneaza(src.canale, src.rata, rata, nc) };
    }
    // Inserează (unul după altul) la cursor; dacă există selecție și „inlocuieste”, o înlocuiește.
    async function insereaza(src, et, inlocuieste = false) {
      const s = await potrivesteSursa(src);
      if (!n()) { seteaza(s.canale.map((c) => c.slice()), { rata: s.rata, cursor: 0, et }); potriveste(); return; }
      const [a, b] = D.sel ? (inlocuieste ? [D.sel.a, D.sel.b] : [D.sel.a, D.sel.a]) : [D.cursor, D.cursor];
      if ((n() - (b - a) + s.canale[0].length) / D.rata > MAX_SEC) return toast(`Sunetul ar depăși ${MAX_SEC / 60} minute. Scurtează-l mai întâi.`, 'error');
      const L = s.canale[0].length;
      seteaza(D.canale.map((c, i) => lipeste([c.subarray(0, a), s.canale[i], c.subarray(b)])), { sel: { a, b: a + L }, cursor: a, et, schimb: [a, b, L] });
    }
    // Suprapune (unul peste altul) de la cursor, cu volumul ales.
    async function mixeaza(src, volum, et) {
      const s = await potrivesteSursa(src);
      if (!n()) return insereaza(src, et);
      const a = D.sel ? D.sel.a : D.cursor;
      const L = s.canale[0].length;
      const total = Math.max(n(), a + L);
      if (total / D.rata > MAX_SEC) return toast(`Sunetul ar depăși ${MAX_SEC / 60} minute.`, 'error');
      const noi = D.canale.map((c, i) => {
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
      if (!eSunet()) return toast('Lipirea merge într-un fișier audio. În multipistă folosește Import audio.');
      insereaza(S.clip, 'Lipire', true);
    }
    async function lipireCombinata() {
      if (!S.clip) return toast('Copiază mai întâi sunetul pe care vrei să-l suprapui (Ctrl+C).');
      if (!eSunet()) return;
      const v = await dialogVolumMix('Lipire combinată');
      if (v != null) mixeaza(S.clip, v, 'Lipire combinată');
    }
    function dialogVolumMix(titlu, nume) {
      const g = glisor('Volumul sunetului adăugat', 5, 150, 5, 100, '%');
      return dialog(titlu, [
        nume ? h('p', {}, 'Sunet adăugat: ', h('b', {}, nume)) : null,
        h('p', { class: 'ap-audio-expl' }, `Sunetul se suprapune peste fișierul tău, începând de la ${D.sel ? 'începutul selecției' : 'cursor'} (${fmtTimp((D.sel ? D.sel.a : D.cursor) / D.rata)}). Pentru muzică de fond sub voce, alege 20–30%.`),
        g], [{ t: 'Anulare', v: null }, { t: 'OK', v: () => g.valoare() / 100, p: true }], { ico: 'lipireMix' });
    }
    // Aplică o funcție (sincronă) pe porțiunea de lucru, pe fiecare canal.
    function efectDirect(et, fn) {
      if (faraSunet()) return;
      const [a, b] = zonaLucru();
      if (b - a < 2) return;
      const noi = D.canale.map((c) => {
        const mij = fn(c.slice(a, b));
        return a === 0 && b === c.length ? mij : lipeste([c.subarray(0, a), mij, c.subarray(b)]);
      });
      seteaza(noi, { sel: D.sel ? { a, b } : null, cursor: D.cursor, et });
      toast(`${et}: aplicat pe ${D.sel ? 'selecție' : 'tot sunetul'}.`);
    }
    // Aplică o prelucrare (asincronă, pe toate canalele odată) pe porțiunea de lucru; lungimea se poate schimba.
    async function aplicaZona(et, calc) {
      const [a, b] = zonaLucru();
      const parti = D.canale.map((c) => c.slice(a, b));
      let rez;
      try { rez = await ocupat(`${et}…`, () => calc(parti, D.rata)); } catch (e) { console.warn(e); return toast(`Nu am putut aplica efectul ${et}.`, 'error'); }
      const L = rez[0].length;
      if ((n() - (b - a) + L) / D.rata > MAX_SEC) return toast('Sunetul ar deveni prea lung.', 'error');
      const noi = D.canale.map((c, i) => (a === 0 && b === c.length ? rez[i] : lipeste([c.subarray(0, a), rez[i], c.subarray(b)])));
      seteaza(noi, { sel: D.sel ? { a, b: a + L } : null, cursor: D.sel ? a : Math.min(D.cursor, noi[0].length), et, schimb: [a, b, L] });
      toast(`${et}: aplicat pe ${D.sel ? 'selecție' : 'tot sunetul'}.`);
    }

    // ---------- Efecte cu dialog și Previzualizare ----------
    const PREVIZ_SEC = 8;
    function definitieEfect(tipE) {
      const [a, b] = zonaLucru();
      const vz = varf(D.canale, a, b);
      const durZ = (b - a) / D.rata;
      switch (tipE) {
        case 'amplificare': {
          const info = h('p', { class: 'ap-audio-expl' });
          const g = glisor('Amplificare', -24, 24, 0.5, 6, 'dB', (db) => {
            const f = 10 ** (db / 20);
            info.textContent = `${db > 0 ? 'Mai tare' : db < 0 ? 'Mai încet' : 'La fel'}: volumul devine ${Math.round(f * 100)}% din cel de acum.${vz * f > 1 ? ' Atenție: partea cea mai tare va depăși 100% și se va distorsiona!' : ''}`;
            info.classList.toggle('rau', vz * f > 1);
          });
          return { titlu: 'Amplificare', ico: 'amplificare', et: () => `Amplificare ${g.valoare() > 0 ? '+' : ''}${nr(g.valoare())} dB`, corp: [g, info, h('p', { class: 'ap-audio-expl mic' }, '+6 dB ≈ de două ori mai tare (200%), −6 dB ≈ la jumătate (50%).')],
            calc: async (cs) => { const f = 10 ** (g.valoare() / 20); return cs.map((c) => c.map((x) => x * f)); } };
        }
        case 'normalizare': {
          const g = glisor('Nivelul maxim', 10, 100, 1, 98, '%');
          return { titlu: 'Normalizare', ico: 'normalizare', et: () => 'Normalizare', corp: [h('p', { class: 'ap-audio-expl' }, `Acum, partea cea mai tare este la ${Math.round(vz * 100)}%. Normalizarea mărește (sau micșorează) la fel tot sunetul, până când partea cea mai tare ajunge la nivelul ales, fără distorsiuni.`), g],
            verifica: () => (vz < 1e-5 ? 'Aici e doar liniște: nu am ce normaliza.' : ''),
            calc: async (cs) => { const v = varf(cs, 0, cs[0].length) || 1, f = g.valoare() / 100 / v; return cs.map((c) => c.map((x) => x * f)); } };
        }
        case 'ecou': {
          const gi = glisor('Întârziere', 50, 1000, 10, 300, 'ms'), gd = glisor('Intensitate', 10, 80, 5, 45, '%');
          return { titlu: 'Ecou', ico: 'ecou', et: () => 'Ecou', corp: [h('p', { class: 'ap-audio-expl' }, 'Sunetul se repetă după „întârziere”, de fiecare dată mai încet. Întârziere mare = sală foarte mare sau munte.'), gi, gd],
            calc: async (cs, rata) => { const d = Math.max(1, Math.round(gi.valoare() / 1000 * rata)), k = gd.valoare() / 100; return cs.map((c0) => { const c = c0.slice(); for (let i = d; i < c.length; i++) c[i] += k * c[i - d]; return c; }); } };
        }
        case 'reverb': {
          const gs = lista('Încăperea', [['0', 'Cameră mică'], ['1', 'Sală de concert'], ['2', 'Catedrală']], '1'), gm = glisor('Amestec (efect)', 5, 90, 5, 35, '%');
          return { titlu: 'Reverberație', ico: 'reverb', et: () => 'Reverberație', corp: [h('p', { class: 'ap-audio-expl' }, 'Reverberația imită reflexiile sunetului de pereți: sună ca într-o sală mare.'), gs, gm],
            calc: (cs, rata) => prinNoduri(cs, rata, (oc, s) => {
              const conv = oc.createConvolver(), ud = oc.createGain(), sec = oc.createGain(), m = oc.createGain();
              conv.buffer = raspunsSala(oc, Number(gs.valoare()));
              ud.gain.value = gm.valoare() / 100 * 0.6; sec.gain.value = 1 - gm.valoare() / 100 * 0.5;
              s.connect(conv); conv.connect(ud); ud.connect(m); s.connect(sec); sec.connect(m);
              return m;
            }) };
        }
        case 'egalizator': {
          const nume = ['60 Hz (bas)', '250 Hz', '1 kHz (voce)', '4 kHz', '12 kHz (înalte)'];
          const gs = BENZI.map((f, i) => glisor(nume[i], -12, 12, 1, 0, 'dB'));
          const PRES = { plat: [0, 0, 0, 0, 0], bas: [8, 4, 0, 0, 0], voce: [-6, -2, 3, 4, 1], telefon: [-12, -6, 4, 2, -12], inalte: [0, 0, 0, 4, 8] };
          const pres = lista('Presetare', [['plat', 'Plat (fără schimbare)'], ['bas', 'Mai mult bas'], ['voce', 'Voce clară'], ['telefon', 'Sunet de telefon'], ['inalte', 'Mai multe înalte']], 'plat');
          pres.sel.addEventListener('change', () => PRES[pres.valoare()].forEach((v, i) => gs[i].seteaza(v)));
          return { titlu: 'Egalizator', ico: 'egalizator', et: () => 'Egalizator', lat: true, corp: [h('p', { class: 'ap-audio-expl' }, 'Ridică (+) sau coboară (−) fiecare bandă de frecvență: stânga = sunete joase, dreapta = sunete înalte.'), pres, h('div', { class: 'ap-audio-eq' }, gs)],
            calc: (cs, rata) => prinNoduri(cs, rata, (oc, s) => {
              let ultim = s;
              BENZI.forEach((f, i) => {
                const q = oc.createBiquadFilter();
                q.type = i === 0 ? 'lowshelf' : i === BENZI.length - 1 ? 'highshelf' : 'peaking';
                q.frequency.value = Math.min(f, rata / 2 - 100); q.Q.value = 1; q.gain.value = gs[i].valoare();
                ultim.connect(q); ultim = q;
              });
              return ultim;
            }) };
        }
        case 'ton': {
          const g = glisor('Schimbare ton', -12, 12, 0.5, 4, 'semitonuri');
          return { titlu: 'Schimbare ton', ico: 'tonInalt', et: () => `Schimbare ton ${g.valoare() > 0 ? '+' : ''}${nr(g.valoare())}`, corp: [h('p', { class: 'ap-audio-expl' }, 'Plus = voce mai subțire (ca de veveriță), minus = voce mai groasă. Durata rămâne aceeași. 12 semitonuri = o octavă.'), g],
            calc: async (cs, rata) => { const o = []; for (const c of cs) o.push(await schimbaTon(c, g.valoare(), rata)); return o; } };
        }
        case 'tempo': {
          const info = h('p', { class: 'ap-audio-expl' });
          const g = glisor('Tempo', 50, 200, 5, 125, '%', (p) => { info.textContent = `Durata devine ${nr(durZ / (p / 100), 2)} s (acum ${nr(durZ, 2)} s). Tonul nu se schimbă.`; });
          return { titlu: 'Schimbarea tempoului', ico: 'tempo', et: () => `Tempo ${g.valoare()}%`, corp: [g, info],
            calc: async (cs, rata) => { const o = []; for (const c of cs) o.push(await intinde(c, 100 / g.valoare(), rata)); return o; } };
        }
        case 'viteza': {
          const info = h('p', { class: 'ap-audio-expl' });
          const g = glisor('Viteză', 50, 200, 5, 150, '%', (p) => { info.textContent = `Durata devine ${nr(durZ / (p / 100), 2)} s (acum ${nr(durZ, 2)} s). ${p > 100 ? 'Mai repede: vocea devine mai subțire.' : p < 100 ? 'Mai încet: vocea devine mai groasă.' : ''}`; });
          return { titlu: 'Schimbarea vitezei', ico: 'viteza', et: () => `Viteză ${g.valoare()}%`, corp: [g, info],
            calc: async (cs) => cs.map((c) => liniar(c, 100 / g.valoare())) };
        }
        case 'zgomot': {
          const g = glisor('Reducere', 6, 36, 1, 18, 'dB');
          const sursa = lista('Profilul zgomotului', [['auto', 'Automat (din porțiunile cele mai liniștite)'], ...(S.profil ? [['preluat', 'Preluat din selecția ta']] : [])], S.profil ? 'preluat' : 'auto');
          return { titlu: 'Reducerea zgomotului', ico: 'reducereZgomot', et: () => 'Reducerea zgomotului', corp: [h('p', { class: 'ap-audio-expl' }, 'Scoate zumzetul constant de fond. Cel mai bine: selectezi o porțiune cu DOAR zgomot, apeși „Preia profilul zgomotului”, apoi aplici aici pe tot sunetul.'), sursa, g,
            h('p', { class: 'ap-audio-expl mic' }, 'Reducere prea mare = voce „metalică”. Ascultă cu Previzualizare.')],
            calc: async (cs) => { const o = []; for (const c of cs) o.push(await reducereZgomot(c, sursa.valoare() === 'preluat' && S.profil ? S.profil : profilZgomot(c, true), g.valoare())); return o; } };
        }
        case 'liniste': {
          const gp = glisor('Prag liniște', -60, -20, 1, -40, 'dB'), gm = glisor('Pauze mai lungi de', 0.2, 3, 0.1, 0.6, 's'), gk = glisor('Păstrează din pauză', 0, 1, 0.05, 0.25, 's');
          return { titlu: 'Eliminarea liniștii', ico: 'eliminareLiniste', et: () => 'Eliminarea liniștii', corp: [h('p', { class: 'ap-audio-expl' }, 'Pauzele mai lungi decât valoarea aleasă se scurtează. Sunetele mai încete decât pragul sunt considerate liniște.'), gp, gm, gk],
            calc: async (cs, rata) => { const r = eliminaLiniste(cs, rata, gp.valoare(), gm.valoare(), gk.valoare()); setTimeout(() => toast(r.taiat ? `Am scos ${nr(r.taiat, 1)} s de liniște.` : 'Nu am găsit pauze atât de lungi.'), 50); return r.canale; } };
        }
        case 'treceSus': case 'treceJos': {
          const sus = tipE === 'treceSus';
          const g = sus ? glisor('Frecvența de tăiere', 20, 1000, 10, 120, 'Hz') : glisor('Frecvența de tăiere', 1000, 16000, 100, 6000, 'Hz');
          return { titlu: sus ? 'Filtru trece-sus' : 'Filtru trece-jos', ico: tipE, et: () => (sus ? 'Filtru trece-sus' : 'Filtru trece-jos'), corp: [h('p', { class: 'ap-audio-expl' }, sus ? 'Sunetele mai joase decât frecvența aleasă dispar (bun pentru zumzetul rețelei electrice sau vânt în microfon).' : 'Sunetele mai înalte decât frecvența aleasă dispar (bun pentru fâșâit).'), g],
            calc: (cs, rata) => prinNoduri(cs, rata, (oc, s) => { const q = oc.createBiquadFilter(); q.type = sus ? 'highpass' : 'lowpass'; q.frequency.value = Math.min(g.valoare(), rata / 2 - 100); q.Q.value = 0.707; s.connect(q); return q; }) };
        }
        default: return null;
      }
    }
    async function efectDialog(tipE) {
      if (faraSunet()) return;
      oprireRedare();
      const def = definitieEfect(tipE);
      const motiv = def.verifica?.();
      if (motiv) return toast(motiv);
      const bPrev = { t: '▶ Previzualizare', st: true, verifica: async (el) => { await previzualizeaza(el, def.calc); return false; } };
      const ok = await dialog(def.titlu, [h('p', { class: 'ap-audio-tintad' }, 'Se aplică pe: ', h('b', {}, tintaText())), def.corp],
        [bPrev, { t: 'Anulare', v: null }, { t: 'OK', v: true, p: true }], { ico: def.ico, lat: def.lat, laInchidere: () => oprestePreviz() });
      if (!ok) return;
      await aplicaZona(def.et(), def.calc);
    }
    // Previzualizare: prelucrează primele secunde din zona de lucru și le redă (fără să schimbe fișierul).
    async function previzualizeaza(el, calc) {
      if (S.previz) { oprestePreviz(); return; }
      const [a, b] = zonaLucru();
      const parti = D.canale.map((c) => c.slice(a, Math.min(b, a + PREVIZ_SEC * D.rata)));
      el.disabled = true;
      el.textContent = 'Se pregătește…';
      let rez;
      try { rez = await calc(parti, D.rata); } catch { el.disabled = false; el.textContent = '▶ Previzualizare'; return toast('Previzualizarea nu a reușit.', 'error'); }
      el.disabled = false;
      if (!el.isConnected) return;
      el.textContent = '■ Oprește';
      redaCanale(rez, D.rata, () => { el.textContent = '▶ Previzualizare'; });
    }
    async function preiaProfil() {
      if (faraSel()) return;
      const { a, b } = D.sel;
      if ((b - a) < NZ) return toast('Selecția e prea scurtă: alege cel puțin o zecime de secundă de zgomot.');
      S.profil = profilZgomot(D.canale[0].subarray(a, b));
      toast('Am preluat profilul zgomotului. Acum selectează tot (Ctrl+A) și alege Reducerea zgomotului.');
    }
    async function conversieCanale() {
      if (faraSunet()) return;
      const mono = D.canale.length === 1;
      const ok = await confirma(mono ? 'Conversie în stereo' : 'Conversie în mono', mono ? 'Sunetul mono devine stereo: același sunet pe canalul stâng și pe cel drept.' : 'Cele două canale (stânga și dreapta) se amestecă într-unul singur. Fișierul va fi de două ori mai mic.', 'Convertește');
      if (!ok) return;
      seteaza(potrivesteCanale(D.canale, mono ? 2 : 1), { sel: D.sel, et: mono ? 'Conversie în stereo' : 'Conversie în mono' });
    }

    // ---------- Generare (ton, zgomot, liniște, DTMF) ----------
    async function dialogGenerare(fel) {
      if (!D) return;
      const rata = eSunet() && n() ? D.rata : eMix() ? D.rata : ctxAudio().sampleRate;
      let corpD, gen, et, titlu, ico;
      const gd = glisor('Durata', 0.1, 30, 0.1, fel === 'liniste' ? 1 : 2, 's');
      const gv = glisor('Volumul', 5, 100, 5, 50, '%');
      if (fel === 'ton') {
        const gf = glisor('Frecvența', 50, 4000, 10, 440, 'Hz'), gfo = lista('Forma undei', [['sinus', 'Sinusoidală (curată)'], ['patrat', 'Pătrată (ca la jocuri vechi)'], ['triunghi', 'Triunghiulară'], ['dinte', 'Dinte de fierăstrău']], 'sinus');
        titlu = 'Generare ton'; ico = 'ton'; et = 'Generare ton';
        corpD = [h('p', { class: 'ap-audio-expl' }, 'Frecvența mare = sunet subțire (înalt), frecvența mică = sunet gros (jos). Nota La are 440 Hz.'), gfo, gf, gd, gv];
        gen = () => genTon(gfo.valoare(), gf.valoare(), gd.valoare(), gv.valoare() / 100, rata);
      } else if (fel === 'zgomot') {
        const gt = lista('Tipul', [['alb', 'Zgomot alb (fâșâit)'], ['roz', 'Zgomot roz (ploaie, cascadă)'], ['maro', 'Zgomot maro (vânt, valuri)']], 'roz');
        titlu = 'Generare zgomot'; ico = 'zgomot'; et = 'Generare zgomot';
        corpD = [h('p', { class: 'ap-audio-expl' }, 'Zgomotul conține toate frecvențele amestecate. Poate imita ploaia, vântul sau marea.'), gt, gd, gv];
        gen = () => genZgomot(gt.valoare(), gd.valoare(), gv.valoare() / 100, rata);
      } else if (fel === 'dtmf') {
        const sir = h('input', { type: 'text', class: 'ap-audio-txt', value: '0721 123 456', maxlength: '40', 'aria-label': 'Cifrele' });
        const gt = glisor('Durata unui ton', 0.05, 1, 0.05, 0.2, 's'), gp = glisor('Pauza între tonuri', 0.05, 1, 0.05, 0.1, 's');
        titlu = 'Generare tonuri DTMF'; ico = 'dtmf'; et = 'Tonuri DTMF';
        corpD = [h('p', { class: 'ap-audio-expl' }, 'DTMF = sunetele tastelor de telefon: fiecare tastă are două note care sună împreună. Spațiul face o pauză mai lungă.'),
          h('label', { class: 'ap-audio-gl' }, h('span', {}, 'Cifre (0–9, *, #)'), sir), gt, gp, gv];
        gen = () => genDtmf(sir.value, gt.valoare(), gp.valoare(), gv.valoare() / 100, rata);
      } else {
        titlu = 'Generare liniște'; ico = 'liniste'; et = 'Inserare liniște';
        corpD = [h('p', { class: 'ap-audio-expl' }, `Liniștea se pune la ${eSunet() && D.sel ? 'începutul selecției' : 'cursor'}. Pe forma de undă apare ca o linie dreaptă.`), gd];
        gen = () => new Float32Array(Math.round(gd.valoare() * rata));
      }
      const bPrev = fel === 'liniste' ? null : { t: '▶ Previzualizare', st: true, verifica: async (el) => {
        if (S.previz) { oprestePreviz(); return false; }
        el.textContent = '■ Oprește';
        redaCanale([gen()], rata, () => { el.textContent = '▶ Previzualizare'; });
        return false;
      } };
      const ok = await dialog(titlu, corpD, [bPrev, { t: 'Anulare', v: null }, { t: 'OK', v: true, p: true }].filter(Boolean), { ico, laInchidere: () => oprestePreviz() });
      if (!ok) return;
      const c = gen();
      if (!c.length) return;
      if (eMix()) return adaugaClip({ canale: [c], rata }, et, D.pistaSel, D.cursor);
      if (D.sel) { D.cursor = D.sel.a; D.sel = null; } // se inserează, nu înlocuiește selecția
      insereaza({ rata, canale: [c] }, et);
    }

    // ---------- Marcaje și regiuni ----------
    async function adaugaMarcaj(regiune) {
      if (faraSunet()) return;
      if (regiune && faraSel()) return;
      const implicit = regiune ? `Regiunea ${D.marcaje.filter((m) => m.t2 != null).length + 1}` : `Marcaj ${D.marcaje.filter((m) => m.t2 == null).length + 1}`;
      const nume = await intrebaText(regiune ? 'Regiune nouă' : 'Marcaj nou', 'Numele', implicit);
      if (!nume) return;
      pastreazaIstoric(regiune ? 'Regiune nouă' : 'Marcaj nou');
      D.marcaje.push(regiune ? { id: idNou(), nume, t: D.sel.a, t2: D.sel.b } : { id: idNou(), nume, t: D.cursor });
      D.marcaje.sort((x, y) => x.t - y.t);
      programeazaSalvare(D);
      if (!S.arataPanou || S.panou !== 'marcaje') { S.panou = 'marcaje'; S.arataPanou = true; panouSt.hidden = false; }
      redeseneazaTot();
    }

    // ---------- Redare, cu contoare de nivel ----------
    // Lanțul de ieșire: master (stereo) → difuzoare și → 2 analizoare (stânga / dreapta) pentru contoare.
    function lantIesire(c) {
      const m = c.createGain();
      m.channelCount = 2; m.channelCountMode = 'explicit'; m.channelInterpretation = 'speakers';
      m.connect(c.destination);
      const sp = c.createChannelSplitter(2);
      m.connect(sp);
      const an = [0, 1].map((i) => { const a = c.createAnalyser(); a.fftSize = 1024; sp.connect(a, i); return a; });
      return { m, an };
    }
    const bufCache = new WeakMap();
    function bufferDin(canale, rata) {
      let b = bufCache.get(canale[0]);
      if (b && b.numberOfChannels === canale.length && b.sampleRate === rata) return b;
      b = ctxAudio().createBuffer(canale.length, canale[0].length, rata);
      canale.forEach((c, i) => b.copyToChannel(c, i));
      bufCache.set(canale[0], b);
      return b;
    }
    const pozitie = () => (S.redare?.tip === 'sunet' ? Math.min(S.redare.b, S.redare.a + (ctxAudio().currentTime - S.redare.t0) * S.redare.rata) : D?.cursor || 0);
    const pozMix = () => (S.redare?.tip === 'mix' ? S.redare.de + Math.max(0, ctxAudio().currentTime - S.redare.t0) : D?.cursor || 0);
    function reda(doarSel, de) {
      if (S.inreg) return;
      if (eMix()) return redaMix(de ?? D.cursor);
      if (faraSunet()) return;
      if (doarSel && faraSel()) return;
      oprireRedare();
      oprestePreviz();
      let a = de ?? D.cursor, b = n();
      if (doarSel) { a = D.sel.a; b = D.sel.b; } else if (D.sel && de == null && D.cursor === D.sel.a) { b = D.sel.b; } else if (a >= n() - 1) a = 0;
      const c = ctxAudio();
      const iesire = lantIesire(c);
      const src = c.createBufferSource();
      src.buffer = bufferDin(D.canale, D.rata);
      src.connect(iesire.m);
      const t0 = c.currentTime + 0.03;
      src.start(t0, a / D.rata, (b - a) / D.rata);
      const doc = D;
      S.redare = { tip: 'sunet', doc, src, a, b, t0, rata: D.rata, pornire: a, iesire, doarSel: doarSel || b < n() };
      src.onended = () => {
        if (S.redare?.src !== src) return;
        const r = S.redare;
        S.redare = null;
        iesire.m.disconnect();
        if (S.bucla && D === doc) { reda(r.doarSel && D.sel ? true : false, r.doarSel ? undefined : r.a); return; }
        actualizeaza(); deseneazaOv();
      };
      actualizeaza();
      pornesteBucla();
    }
    function redaMix(de = 0) {
      if (!areContinut()) return toast('Proiectul nu are încă niciun clip. Folosește Import audio sau Trimite la multipistă.');
      oprireRedare();
      oprestePreviz();
      const total = durataMix(D);
      if (de >= total - 0.01) de = 0;
      const c = ctxAudio();
      const iesire = lantIesire(c);
      const t0 = c.currentTime + 0.05;
      const solo = D.piste.some((p) => p.solo);
      const surse = [], noduri = new Map();
      for (const p of D.piste) {
        const g = c.createGain();
        g.gain.value = p.mute || (solo && !p.solo) ? 0 : p.vol;
        let ult = g;
        if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = p.pan; g.connect(pn); ult = pn; noduri.set(p.id, { g, pn }); } else noduri.set(p.id, { g });
        ult.connect(iesire.m);
        for (const cl of p.clipuri) {
          const fin = cl.start + lungClip(cl);
          if (fin <= de) continue;
          const s = c.createBufferSource();
          s.buffer = bufferDin(cl.canale, cl.rata);
          s.connect(g);
          s.start(t0 + Math.max(0, cl.start - de), Math.max(0, de - cl.start));
          surse.push(s);
        }
      }
      S.redare = { tip: 'mix', doc: D, t0, de, total, surse, noduri, iesire, pornire: de };
      actualizeaza();
      pornesteBucla();
    }
    // Volumul / balansul / Mute / Solo se aud imediat, chiar în timpul redării.
    function actualizeazaMixerViu() {
      if (S.redare?.tip !== 'mix') return;
      const solo = D.piste.some((p) => p.solo);
      for (const p of D.piste) {
        const x = S.redare.noduri.get(p.id);
        if (!x) continue;
        x.g.gain.setTargetAtTime(p.mute || (solo && !p.solo) ? 0 : p.vol, ctxAudio().currentTime, 0.02);
        x.pn?.pan.setTargetAtTime(p.pan, ctxAudio().currentTime, 0.02);
      }
    }
    function oprireRedare() {
      if (!S.redare) return;
      const r = S.redare;
      S.redare = null;
      for (const s of r.surse || [r.src]) { try { s.stop(); } catch { /* deja oprit */ } s.disconnect(); }
      r.iesire.m.disconnect();
      actualizeaza();
      deseneazaOvGen();
    }
    // Redă niște canale independente (Previzualizare la efecte și generare).
    function redaCanale(canale, rata, laFinal) {
      oprireRedare();
      oprestePreviz();
      const c = ctxAudio();
      const iesire = lantIesire(c);
      const b = c.createBuffer(canale.length, Math.max(1, canale[0].length), rata);
      canale.forEach((x, i) => b.copyToChannel(x, i));
      const src = c.createBufferSource();
      src.buffer = b;
      src.connect(iesire.m);
      src.start();
      S.previz = { src, iesire, laFinal };
      src.onended = () => { if (S.previz?.src === src) oprestePreviz(); };
      pornesteBucla();
    }
    function oprestePreviz() {
      if (!S.previz) return;
      const p = S.previz;
      S.previz = null;
      try { p.src.stop(); } catch { /* */ }
      p.iesire.m.disconnect();
      p.laFinal?.();
    }
    function pauza() {
      if (!S.redare) return;
      if (S.redare.tip === 'mix') D.cursor = pozMix(); else D.cursor = Math.round(pozitie());
      oprireRedare();
    }
    function oprire() {
      if (S.inreg) return opresteInreg(true);
      if (S.redare) { D.cursor = S.redare.pornire; oprireRedare(); }
    }
    const comutaRedare = () => (S.inreg ? opresteInreg(true) : S.redare ? pauza() : reda(false));
    function mutaCursor(p) {
      D.cursor = Math.max(0, Math.min(n(), p));
      D.sel = null;
      if (S.redare) reda(false, D.cursor);
      asiguraVizibil(D.cursor);
      deseneazaOv();
      actualizeaza();
    }
    function mutaCursorGen(x) {
      if (eMix()) { D.cursor = lim(x, 0, durataMix(D)); if (S.redare) redaMix(D.cursor); asiguraVizibilMix(D.cursor); deseneazaMix(); actualizeaza(); return; }
      if (eSunet()) mutaCursor(x === Infinity ? n() : x);
    }
    function salt(s) {
      if (eMix()) return mutaCursorGen((S.redare ? pozMix() : D.cursor) + s);
      if (!eSunet()) return;
      mutaCursor((S.redare ? pozitie() : D.cursor) + s * D.rata);
    }

    // Bucla de animație: cursorul de redare, contorul și contoarele de nivel.
    let rafAnim = 0;
    const tampon = new Float32Array(1024);
    const nivel = [0, 0], varfN = [0, 0], tVarf = [0, 0];
    function citesteNivel(an, i) {
      let m = 0;
      if (an) { an.getFloatTimeDomainData(tampon); for (let k = 0; k < tampon.length; k++) { const v = Math.abs(tampon[k]); if (v > m) m = v; } }
      const p = m > 1e-4 ? lim((20 * Math.log10(m) + 60) / 60, 0, 1) : 0;
      nivel[i] = p > nivel[i] ? p : Math.max(p, nivel[i] - 0.025);
      const t = performance.now();
      if (nivel[i] >= varfN[i]) { varfN[i] = nivel[i]; tVarf[i] = t; } else if (t - tVarf[i] > 1200) varfN[i] = Math.max(nivel[i], varfN[i] - 0.02);
    }
    function pornesteBucla() {
      cancelAnimationFrame(rafAnim);
      const pas = () => {
        if (!app.isConnected) return;
        const sursa = S.inreg ? S.inreg.an : S.previz ? S.previz.iesire.an : S.redare ? S.redare.iesire.an : null;
        citesteNivel(sursa?.[0], 0);
        citesteNivel(sursa ? sursa[1] || sursa[0] : null, 1);
        mS.seteaza(nivel[0], varfN[0]);
        mD.seteaza(nivel[1], varfN[1]);
        if (S.redare?.tip === 'sunet' && S.redare.doc === D) {
          const p = pozitie(), w = latime();
          if (p > D.vs + w * D.spp || p < D.vs) { D.vs = p - w * D.spp * 0.02; limiteazaVedere(); deseneaza(); } else deseneazaOv();
          contorTimp.textContent = fmtContor(p / D.rata);
        } else if (S.redare?.tip === 'mix' && S.redare.doc === D) {
          const p = pozMix(), w = latimeMix();
          if (p >= S.redare.total) {
            const de = S.redare.pornire;
            oprireRedare();
            if (S.bucla) redaMix(de);
          } else {
            if (p > D.vs + w / D.pxs || p < D.vs) { D.vs = Math.max(0, p - w / D.pxs * 0.02); deseneazaMix(); } else deseneazaMix(true);
            contorTimp.textContent = fmtContor(p);
          }
        } else if (S.inreg) {
          const t = S.inreg.lung / S.inreg.rata;
          contorTimp.textContent = fmtContor(t);
          deseneazaInreg();
          if (t > MAX_SEC - 1) opresteInreg(true);
        }
        const activ = S.redare || S.inreg || S.previz || nivel[0] > 0 || nivel[1] > 0 || varfN[0] > 0 || varfN[1] > 0;
        if (!S.redare && !S.inreg && !S.previz) { varfN[0] = Math.max(0, varfN[0] - 0.03); varfN[1] = Math.max(0, varfN[1] - 0.03); }
        if (activ) rafAnim = requestAnimationFrame(pas);
      };
      rafAnim = requestAnimationFrame(pas);
    }

    // ---------- Înregistrare cu microfonul (fără fereastră: se vede în timp real) ----------
    async function inregistreaza() {
      if (S.inreg) return opresteInreg(true);
      if (!D) return;
      oprireRedare();
      oprestePreviz();
      if (!navigator.mediaDevices?.getUserMedia) {
        return dialog('Înregistrarea nu merge aici', h('p', {}, 'Browserul nu permite înregistrarea pe această pagină. Deschide site-ul prin https:// într-un browser actual (Chrome, Edge, Firefox).'), undefined, { ico: 'microfon' });
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (e) {
        const refuz = e.name === 'NotAllowedError' || e.name === 'SecurityError';
        return dialog(refuz ? 'Nu am voie să folosesc microfonul' : 'Nu găsesc microfonul', refuz
          ? [h('p', {}, 'Accesul la microfon a fost refuzat.'),
            h('ol', {}, h('li', {}, 'Apasă pe iconița din stânga adresei (lacătul sau reglajele) din bara browserului.'),
              h('li', {}, 'La „Microfon”, alege „Permite”.'), h('li', {}, 'Apasă din nou butonul roșu Înregistrare.')),
            h('p', { class: 'ap-audio-expl' }, 'Poți lucra și fără microfon: deschide un fișier audio sau generează un ton (fila Instrumente).')]
          : [h('p', {}, e.name === 'NotReadableError' ? 'Microfonul este folosit de altă aplicație. Închide-o și încearcă din nou.' : 'Nu am găsit niciun microfon conectat. Conectează unul (sau căștile cu microfon) și încearcă din nou.')], undefined, { ico: 'microfon' });
      }
      const c = ctxAudio();
      const sursa = c.createMediaStreamSource(stream);
      const an = c.createAnalyser();
      an.fftSize = 1024;
      sursa.connect(an);
      const R = { stream, sursa, an: [an], bucati: [], lung: 0, rata: c.sampleRate, doc: D, varfuri: [] };
      if (c.createScriptProcessor) {
        const sp = c.createScriptProcessor(4096, 1, 1), zero = c.createGain();
        zero.gain.value = 0;
        sp.onaudioprocess = (e) => {
          if (S.inreg !== R) return;
          const d = e.inputBuffer.getChannelData(0).slice();
          R.bucati.push(d);
          R.lung += d.length;
          for (let i = 0; i < d.length; i += 512) { let m = 0; for (let k = i; k < i + 512 && k < d.length; k++) m = Math.max(m, Math.abs(d[k])); R.varfuri.push(m); }
        };
        sursa.connect(sp); sp.connect(zero); zero.connect(c.destination);
        Object.assign(R, { sp, zero });
      } else {
        stream.getTracks().forEach((t) => t.stop());
        return dialog('Înregistrarea nu merge aici', h('p', {}, 'Browserul acesta nu poate înregistra sunet în pagină. Folosește Chrome, Edge sau Firefox.'));
      }
      S.inreg = R;
      contorEt.textContent = '● Înregistrare';
      recPanou.hidden = !eSunet();
      if (eSunet()) umple(recPanou, h('div', { class: 'ap-audio-reccap' }, h('span', { class: 'ap-audio-punct' }), h('b', {}, 'Se înregistrează…'),
        h('span', {}, n() ? `Sunetul se va pune la ${fmtTimp((D.sel ? D.sel.a : D.cursor) / D.rata)}` : 'Vorbește în microfon'),
        h('button', { type: 'button', class: 'ap-audio-db p', onclick: () => opresteInreg(true) }, '■ Oprire'),
        h('button', { type: 'button', class: 'ap-audio-db', onclick: () => opresteInreg(false) }, 'Renunță')), h('canvas', { class: 'ap-audio-reccv' }));
      actualizeaza();
      deseneazaMix();
      pornesteBucla();
    }
    function deseneazaInreg() {
      const R = S.inreg;
      if (eMix()) { deseneazaMix(true); return; }
      const c = recPanou.querySelector('canvas');
      if (!c || !R) return;
      const { g, w, ht } = dimensiuni(c);
      g.fillStyle = '#0B140D'; g.fillRect(0, 0, w, ht);
      const v = R.varfuri, k0 = Math.max(0, v.length - Math.floor(w / 2));
      g.fillStyle = '#E0302B';
      for (let k = k0, x = 0; k < v.length; k++, x += 2) { const a = Math.min(1, v[k]) * (ht / 2 - 2); g.fillRect(x, ht / 2 - a, 1.5, Math.max(1, 2 * a)); }
    }
    async function opresteInreg(pastreaza) {
      const R = S.inreg;
      if (!R) return;
      S.inreg = null;
      R.stream.getTracks().forEach((t) => t.stop());
      try { R.sursa.disconnect(); R.sp?.disconnect(); R.zero?.disconnect(); } catch { /* */ }
      recPanou.hidden = true;
      contorEt.textContent = 'Poziție';
      actualizeaza();
      if (!pastreaza) { deseneazaMix(); return; }
      if (!R.lung) return toast('Nu s-a înregistrat nimic. Verifică microfonul.', 'error');
      const sunet = { rata: R.rata, canale: [lipeste(R.bucati)] };
      if (!S.docs.includes(R.doc)) return;
      if (D !== R.doc) activeaza(R.doc);
      if (eMix()) return adaugaClip(sunet, 'Înregistrare', D.pistaSel, D.cursor, 'Înregistrare');
      await aseaza(sunet, 'Înregistrare', 'înregistrarea ta');
    }

    // ---------- Forma de undă (fișier audio) ----------
    const latime = () => Math.max(50, zona.clientWidth);
    function limiteazaVedere() {
      if (!eSunet()) return;
      const w = latime();
      D.spp = Math.max(1 / 32, D.spp);
      D.vs = Math.max(0, Math.min(D.vs, n() - w * D.spp));
    }
    function potriveste(desen = true) {
      if (!eSunet()) return;
      D.spp = Math.max(1 / 32, (n() || D.rata * 10) / latime());
      D.vs = 0;
      D.potrivit = true;
      if (desen) deseneaza();
    }
    function zoom(f, centru) {
      if (!n()) return;
      const w = latime();
      const c = centru ?? (S.redare ? pozitie() : D.sel ? (D.sel.a + D.sel.b) / 2 : D.cursor);
      const xc = (c - D.vs) / D.spp;
      const max = Math.max(1 / 32, n() / w);
      D.spp = Math.min(max, Math.max(1 / 32, D.spp * f));
      D.potrivit = D.spp >= max;
      D.vs = c - (xc >= 0 && xc <= w ? xc : w / 2) * D.spp;
      limiteazaVedere();
      deseneaza();
    }
    const zoomGen = (f) => (eMix() ? zoomMix(f) : zoom(f));
    const potrivireGen = () => (eMix() ? potrivesteMix() : potriveste());
    function zoomSel() {
      if (faraSel()) return;
      const L = D.sel.b - D.sel.a;
      D.spp = Math.max(1 / 32, L * 1.1 / latime());
      D.potrivit = false;
      D.vs = D.sel.a - L * 0.05;
      limiteazaVedere();
      deseneaza();
    }
    function asiguraVizibil(p) {
      const w = latime();
      if (p < D.vs || p > D.vs + w * D.spp) { D.vs = p - w * D.spp / 2; limiteazaVedere(); deseneaza(); }
    }
    // Pași pentru cronologie: cel puțin ~80 px între etichete.
    const PASI = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    function dimensiuni(c) {
      const dpr = window.devicePixelRatio || 1, w = c.clientWidth, ht = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(ht * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(ht * dpr); }
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { g, w, ht };
    }
    // Cronologia (rigla): fundal gri deschis, gradații și timpi, ca în WavePad.
    function deseneazaRigla(g, w, t0, pxSec, maxT) {
      const gr = g.createLinearGradient(0, 0, 0, RIGLA);
      gr.addColorStop(0, '#F2F3F5'); gr.addColorStop(1, '#D9DCE0');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, RIGLA);
      g.fillStyle = '#A9AEB5';
      g.fillRect(0, RIGLA - 1, w, 1);
      const pas = PASI.find((p) => p * pxSec >= 80) || 1200;
      const z = pas >= 1 ? 0 : pas >= 0.1 ? 1 : pas >= 0.01 ? 2 : 3;
      const t1 = t0 + w / pxSec;
      g.font = '600 10.5px system-ui, sans-serif';
      g.textBaseline = 'top';
      for (let t = Math.floor(t0 / pas) * pas; t <= t1; t += pas) {
        const x = Math.round((t - t0) * pxSec) + 0.5;
        g.fillStyle = '#6B7079';
        g.fillRect(x, RIGLA - 10, 1, 9);
        for (let k = 1; k < 5; k++) g.fillRect(Math.round(x + k * pas * pxSec / 5), RIGLA - 5, 1, 4);
        g.fillStyle = '#2B2F35';
        if (t >= 0 && t <= maxT + pas) g.fillText(fmtTimp(t + 1e-9, z), x + 3, 3);
      }
    }
    let cacheSp = null;
    function deseneaza() {
      if (!app.isConnected || !eSunet()) return;
      const { g, w, ht } = dimensiuni(cv);
      g.clearRect(0, 0, w, ht);
      const N = n(), nc = Math.max(1, D.canale.length);
      const pxSec = D.rata / D.spp, t0 = D.vs / D.rata;
      deseneazaRigla(g, w, t0, pxSec, N / D.rata);
      const hSp = S.spectru ? Math.round((ht - RIGLA) * 0.45) : 0;
      const hUnda = ht - RIGLA - hSp;
      const lh = hUnda / nc;
      const xMax = N ? Math.min(w, (N - D.vs) / D.spp) : 0;
      for (let ci = 0; ci < nc; ci++) {
        const y0 = RIGLA + ci * lh, mij = y0 + lh / 2, amp = lh / 2 - 4;
        g.fillStyle = '#000';
        g.fillRect(0, y0, w, lh);
        g.fillStyle = '#123018';
        g.fillRect(0, Math.round(mij - amp / 2), w, 1);
        g.fillRect(0, Math.round(mij + amp / 2), w, 1);
        g.fillStyle = '#2F7A3C';
        g.fillRect(0, Math.round(mij), w, 1);
        if (ci) { g.fillStyle = '#3A3F45'; g.fillRect(0, Math.round(y0), w, 1); }
        const c = D.canale[ci];
        if (c && N) {
          if (D.spp >= 1) {
            const normal = new Path2D(), rosu = new Path2D();
            for (let x = 0; x < xMax; x++) {
              const s0 = Math.floor(D.vs + x * D.spp), s1 = Math.min(N, Math.max(s0 + 1, Math.floor(D.vs + (x + 1) * D.spp)));
              const [mn, mx] = minMax(c, s0, s1);
              const ya = mij - Math.min(1, mx) * amp, yb = mij - Math.max(-1, mn) * amp;
              (mx > 1 || mn < -1 ? rosu : normal).rect(x, ya, 1, Math.max(1, yb - ya));
            }
            g.fillStyle = '#35E05A';
            g.fill(normal);
            g.fillStyle = '#FF3B3B';
            g.fill(rosu);
          } else {
            // zoom mare: se văd eșantioanele, unite printr-o linie
            const i0 = Math.max(0, Math.floor(D.vs)), i1 = Math.min(N - 1, Math.ceil(D.vs + w * D.spp));
            g.strokeStyle = '#35E05A';
            g.lineWidth = 1.5;
            g.beginPath();
            for (let i = i0; i <= i1; i++) { const x = (i - D.vs) / D.spp, y = mij - Math.max(-1, Math.min(1, c[i])) * amp; if (i === i0) g.moveTo(x, y); else g.lineTo(x, y); }
            g.stroke();
            if (D.spp < 1 / 6) { g.fillStyle = '#B9FFC6'; for (let i = i0; i <= i1; i++) { g.beginPath(); g.arc((i - D.vs) / D.spp, mij - Math.max(-1, Math.min(1, c[i])) * amp, 2.5, 0, 7); g.fill(); } }
          }
          if (xMax < w) { g.fillStyle = '#16191C'; g.fillRect(Math.max(0, xMax), y0, w - xMax, lh); }
        }
        if (nc === 2) { g.fillStyle = '#8FA796'; g.font = '700 10px system-ui, sans-serif'; g.fillText(ci ? 'D' : 'S', 5, y0 + 5); }
      }
      if (hSp) deseneazaSpectru(g, w, RIGLA + hUnda, hSp, xMax);
      // marcaje și regiuni
      for (const m of D.marcaje) {
        const xa = (m.t - D.vs) / D.spp;
        if (m.t2 != null) {
          const xb = (m.t2 - D.vs) / D.spp;
          if (xb < 0 || xa > w) continue;
          g.fillStyle = 'rgba(255,201,60,.10)';
          g.fillRect(xa, RIGLA, xb - xa, ht - RIGLA);
          g.fillStyle = 'rgba(255,201,60,.55)';
          g.fillRect(xa, RIGLA - 6, xb - xa, 5);
        }
        if (xa < -60 || xa > w) continue;
        g.strokeStyle = '#FFC93C';
        g.setLineDash([3, 3]);
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(Math.round(xa) + 0.5, RIGLA); g.lineTo(Math.round(xa) + 0.5, ht); g.stroke();
        g.setLineDash([]);
        g.font = '700 10px system-ui, sans-serif';
        const tw = Math.min(110, g.measureText(m.nume).width + 8);
        g.fillStyle = '#FFC93C';
        g.beginPath(); g.moveTo(xa, RIGLA + 1); g.lineTo(xa + tw, RIGLA + 1); g.lineTo(xa + tw - 4, RIGLA + 8); g.lineTo(xa + tw, RIGLA + 15); g.lineTo(xa, RIGLA + 15); g.fill();
        g.fillStyle = '#3B2A00';
        g.save(); g.beginPath(); g.rect(xa, RIGLA, tw - 4, 16); g.clip(); g.fillText(m.nume, xa + 3, RIGLA + 3); g.restore();
      }
      derulare.max = String(Math.max(0, Math.round(N - w * D.spp)));
      derulare.value = String(Math.round(D.vs));
      derulare.hidden = N <= w * D.spp + 1;
      deseneazaPrezentare();
      deseneazaOv();
      actualizeaza();
    }
    // Spectrograma: FFT de 512 puncte pentru fiecare 2 px din fereastră.
    function deseneazaSpectru(g, w, y0, hs, xMax) {
      const cheie = `${w}|${hs}|${D.vs}|${D.spp}|${D.rata}`;
      if (!cacheSp || cacheSp.cheie !== cheie || cacheSp.canale !== D.canale) {
        const NF = 512, win = hann(NF), re = new Float32Array(NF), im = new Float32Array(NF);
        const cols = Math.max(1, Math.ceil(w / 2)), img = new ImageData(cols, hs), N = n();
        for (let x = 0; x < cols; x++) {
          const s = Math.round(D.vs + x * 2 * D.spp) - NF / 2;
          for (let i = 0; i < NF; i++) {
            let v = 0;
            const k = s + i;
            if (k >= 0 && k < N) for (const c of D.canale) v += c[k];
            re[i] = v / D.canale.length * win[i]; im[i] = 0;
          }
          fft(re, im);
          for (let y = 0; y < hs; y++) {
            const k = Math.max(1, Math.round((1 - y / hs) * (NF / 2 - 1)));
            const db = 20 * Math.log10(Math.hypot(re[k], im[k]) / (NF / 4) + 1e-9);
            const ci = lim(Math.round((db + 90) / 90 * 255), 0, 255) * 3, o = (y * cols + x) * 4;
            img.data[o] = CULORI_SP[ci]; img.data[o + 1] = CULORI_SP[ci + 1]; img.data[o + 2] = CULORI_SP[ci + 2]; img.data[o + 3] = 255;
          }
        }
        const off = document.createElement('canvas');
        off.width = cols; off.height = hs;
        off.getContext('2d').putImageData(img, 0, 0);
        cacheSp = { cheie, canale: D.canale, off };
      }
      g.imageSmoothingEnabled = false;
      g.drawImage(cacheSp.off, 0, y0, cacheSp.off.width * 2, hs);
      if (xMax < w) { g.fillStyle = '#16191C'; g.fillRect(Math.max(0, xMax), y0, w - xMax, hs); }
      g.fillStyle = '#3A3F45'; g.fillRect(0, y0, w, 1);
      g.font = '600 10px system-ui, sans-serif';
      g.fillStyle = 'rgba(255,255,255,.75)';
      const fmax = D.rata / 2;
      for (const f of [1000, 5000, 10000, 15000, 20000]) {
        if (f >= fmax) continue;
        const y = y0 + hs * (1 - f / fmax);
        g.fillRect(0, Math.round(y), 6, 1);
        g.fillText(`${f / 1000} kHz`, 8, y - 5);
      }
    }
    // Banda de prezentare generală (tot sunetul + dreptunghiul vizibil)
    function deseneazaPrezentare() {
      if (!S.prezentare || ovw.hidden || !eSunet()) return;
      const { g, w, ht } = dimensiuni(ovw);
      g.fillStyle = '#05080A';
      g.fillRect(0, 0, w, ht);
      const N = n();
      if (!N) return;
      const spp = N / w, mij = ht / 2;
      g.fillStyle = '#1FA33C';
      for (let x = 0; x < w; x++) {
        const s0 = Math.floor(x * spp), s1 = Math.max(s0 + 1, Math.floor((x + 1) * spp));
        let mn = 0, mx = 0;
        for (const c of D.canale) { const [a, b] = minMax(c, s0, Math.min(N, s1)); if (a < mn) mn = a; if (b > mx) mx = b; }
        g.fillRect(x, mij - Math.min(1, mx) * (mij - 2), 1, Math.max(1, (Math.min(1, mx) - Math.max(-1, mn)) * (mij - 2)));
      }
      if (D.sel) { g.fillStyle = 'rgba(90,150,255,.35)'; g.fillRect(D.sel.a / spp, 0, Math.max(1, (D.sel.b - D.sel.a) / spp), ht); }
      const xa = D.vs / spp, lw = Math.max(3, latime() * D.spp / spp);
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(xa, 0, lw, ht);
      g.strokeStyle = '#F5F7FA';
      g.lineWidth = 1;
      g.strokeRect(Math.round(xa) + 0.5, 0.5, Math.round(lw) - 1, ht - 1);
      const xc = (S.redare?.doc === D ? pozitie() : D.cursor) / spp;
      g.fillStyle = S.redare ? '#FF3B3B' : '#FFFFFF';
      g.fillRect(Math.round(xc), 0, 1, ht);
    }
    function deseneazaOv() {
      if (!app.isConnected || !eSunet()) return;
      const { g, w, ht } = dimensiuni(ov);
      g.clearRect(0, 0, w, ht);
      if (!n()) return;
      const X = (s) => (s - D.vs) / D.spp;
      if (D.sel) {
        const xa = Math.max(-2, X(D.sel.a)), xb = Math.min(w + 2, X(D.sel.b));
        if (xb > 0 && xa < w) {
          g.fillStyle = 'rgba(110,160,255,.30)';
          g.fillRect(xa, RIGLA, Math.max(1, xb - xa), ht - RIGLA);
          g.fillStyle = 'rgba(42,111,201,.85)';
          g.fillRect(xa, 0, Math.max(1, xb - xa), 4);
          g.fillStyle = '#9CC2FF';
          g.fillRect(Math.round(xa), RIGLA, 1, ht - RIGLA);
          g.fillRect(Math.round(xb), RIGLA, 1, ht - RIGLA);
        }
      }
      // cursorul de editare
      const xc = Math.round(X(D.cursor)) + 0.5;
      if (xc >= 0 && xc <= w) {
        g.strokeStyle = '#FFFFFF';
        g.setLineDash([4, 3]);
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(xc, RIGLA); g.lineTo(xc, ht); g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#1B1E22';
        g.beginPath(); g.moveTo(xc - 5, RIGLA - 9); g.lineTo(xc + 5, RIGLA - 9); g.lineTo(xc, RIGLA - 1); g.fill();
      }
      // cursorul de redare
      if (S.redare?.doc === D) {
        const xp = Math.round(X(pozitie())) + 0.5;
        g.fillStyle = '#FF3B3B';
        g.fillRect(xp - 1, 0, 2, ht);
        g.beginPath(); g.moveTo(xp - 6, 0); g.lineTo(xp + 6, 0); g.lineTo(xp, 9); g.fill();
      }
      deseneazaPrezentare();
    }
    const deseneazaOvGen = () => (eMix() ? deseneazaMix(true) : deseneazaOv());
    new ResizeObserver(() => { if (app.isConnected) { if (eSunet()) { limiteazaVedere(); deseneaza(); } else if (eMix()) deseneazaMix(); } }).observe(zonaDoc);
    derulare.addEventListener('input', () => { D.vs = Number(derulare.value); D.potrivit = false; deseneaza(); }, sig);

    // Prezentarea generală: apeși sau tragi ca să muți fereastra vizibilă.
    let tragOvw = false;
    const laOvw = (e) => { const r = ovw.getBoundingClientRect(); D.vs = (e.clientX - r.left) / r.width * n() - latime() * D.spp / 2; D.potrivit = false; limiteazaVedere(); deseneaza(); };
    ovw.addEventListener('pointerdown', (e) => { if (!n()) return; tragOvw = true; ovw.setPointerCapture(e.pointerId); laOvw(e); }, sig);
    ovw.addEventListener('pointermove', (e) => { if (tragOvw) laOvw(e); }, sig);
    ovw.addEventListener('pointerup', () => { tragOvw = false; }, sig);

    // Selecția cu mouse-ul sau cu degetul
    let trag = null;
    const esantion = (e) => { const r = ov.getBoundingClientRect(); return Math.max(0, Math.min(n(), Math.round(D.vs + (e.clientX - r.left) * D.spp))); };
    const marcajLa = (e) => {
      const r = ov.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (y > RIGLA + 16) return null;
      return D.marcaje.find((m) => { const xa = (m.t - D.vs) / D.spp; return x >= xa - 3 && x <= xa + 60 && (y >= RIGLA || m.t2 != null); }) || null;
    };
    ov.addEventListener('pointerdown', (e) => {
      if (!n() || e.button > 0) return;
      const m = marcajLa(e);
      if (m) { // apăsare pe un marcaj: muți cursorul sau selectezi regiunea
        if (m.t2 != null) selecteaza(m.t, m.t2); else mutaCursor(m.t);
        return;
      }
      ov.setPointerCapture(e.pointerId);
      const s = esantion(e);
      const ancora = e.shiftKey ? (D.sel ? (Math.abs(s - D.sel.a) < Math.abs(s - D.sel.b) ? D.sel.b : D.sel.a) : D.cursor) : s;
      trag = { x: e.clientX, ancora, mutat: e.shiftKey };
      if (e.shiftKey) { D.sel = { a: Math.min(ancora, s), b: Math.max(ancora, s) }; deseneazaOv(); actualizeaza(); }
    }, sig);
    ov.addEventListener('pointermove', (e) => {
      ov.style.cursor = marcajLa(e) ? 'pointer' : '';
      if (!trag) return;
      if (!trag.mutat && Math.abs(e.clientX - trag.x) < 4) return;
      trag.mutat = true;
      const r = ov.getBoundingClientRect();
      if (e.clientX < r.left) { D.vs -= 10 * D.spp; limiteazaVedere(); deseneaza(); } else if (e.clientX > r.right) { D.vs += 10 * D.spp; limiteazaVedere(); deseneaza(); }
      const s = esantion(e);
      D.sel = s === trag.ancora ? null : { a: Math.min(trag.ancora, s), b: Math.max(trag.ancora, s) };
      D.cursor = D.sel ? D.sel.a : s;
      deseneazaOv();
      actualizeaza();
    }, sig);
    const gataTrag = (e) => {
      if (!trag) return;
      const t = trag;
      trag = null;
      if (!t.mutat) {
        const s = esantion(e);
        D.sel = null;
        D.cursor = s;
        if (S.redare) reda(false, s);
        deseneazaOv();
        actualizeaza();
      } else if (S.redare && D.sel) reda(true);
    };
    ov.addEventListener('pointerup', gataTrag, sig);
    ov.addEventListener('pointercancel', () => { trag = null; }, sig);
    ov.addEventListener('dblclick', () => selecteaza(0, n()), sig);
    ov.addEventListener('wheel', (e) => {
      if (!n()) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoom(e.deltaY > 0 ? 1.25 : 0.8, D.vs + (e.clientX - ov.getBoundingClientRect().left) * D.spp);
      else { D.vs += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * D.spp; D.potrivit = false; limiteazaVedere(); deseneaza(); }
    }, { passive: false, signal: ac.signal });
    // Meniul contextual (clic dreapta), ca în program
    ov.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!n()) return;
      const s = esantion(e);
      if (!D.sel || s < D.sel.a || s > D.sel.b) { D.sel = null; D.cursor = s; deseneazaOv(); actualizeaza(); }
      const m = (k) => ({ t: ACT[k].t, ico: ACT[k].ico, k: ACT[k].k, fn: ACT[k].fn, dez: !poate(k) });
      meniu(e.clientX, e.clientY, [
        { t: 'Redă selecția', ico: 'redareSel', fn: () => reda(true), dez: !D.sel },
        { t: 'Redă de aici', ico: 'redare', fn: () => reda(false, s) }, { sep: 1 },
        m('decupare'), m('copiere'), m('lipire'), m('lipireMix'), m('stergere'), m('trunchiere'), { sep: 1 },
        m('selTot'), m('zoomSel'), { sep: 1 },
        { t: 'Adaugă marcaj aici', ico: 'marcaj', k: 'M', fn: () => adaugaMarcaj(false) }, m('regiune'), { sep: 1 },
        m('amplificare'), m('fadeIn'), m('fadeOut'),
      ]);
    }, sig);

    // ---------- Multipistă: piste una sub alta, clipuri mutate prin tragere ----------
    const inaltPista = () => (window.innerHeight < 700 ? 66 : 84);
    const latimeMix = () => Math.max(50, pisteCv.parentElement.clientWidth || 600);
    function potrivesteMix(desen = true) {
      if (!eMix()) return;
      const d = Math.max(10, durataMix(D) * 1.1);
      D.pxs = latimeMix() / d;
      D.vs = 0;
      D.potrivit = true;
      if (desen) deseneazaMix();
    }
    function zoomMix(f, centru) {
      if (!eMix()) return;
      const w = latimeMix();
      const c = centru ?? (S.redare?.tip === 'mix' ? pozMix() : D.cursor);
      const xc = (c - D.vs) * D.pxs;
      D.pxs = lim(D.pxs / f, 2, 2000);
      D.potrivit = false;
      D.vs = Math.max(0, c - (xc >= 0 && xc <= w ? xc : w / 2) / D.pxs);
      deseneazaMix();
    }
    function asiguraVizibilMix(t) {
      const w = latimeMix();
      if (t < D.vs || t > D.vs + w / D.pxs) { D.vs = Math.max(0, t - w / D.pxs / 2); deseneazaMix(); }
    }
    let trgClip = null; // clipul tras cu mouse-ul
    const xDinT = (t) => (t - D.vs) * D.pxs;
    // Capetele pistelor (nume, Mute, Solo, volum, balans) – elemente HTML reale
    function deseneazaCapete() {
      if (!eMix()) return;
      const TH = inaltPista();
      umple(capete, D.piste.map((p, i) => {
        const nume = h('input', { type: 'text', class: 'ap-audio-cnume', value: p.nume, maxlength: '30', 'aria-label': 'Numele pistei' });
        nume.addEventListener('change', () => { p.nume = nume.value.trim() || `Pista ${i + 1}`; programeazaSalvare(D); });
        const btn = (et, cls, cheie, tipT, tipD) => h('button', { type: 'button', class: `ap-audio-cbtn ${cls}`, 'aria-pressed': String(p[cheie]), 'data-tip': tipT, 'data-tipd': tipD, onclick: () => {
          p[cheie] = !p[cheie]; actualizeazaMixerViu(); programeazaSalvare(D); deseneazaCapete(); deseneazaMix();
        } }, et);
        const vol = h('input', { type: 'range', min: '0', max: '150', step: '1', value: String(Math.round(p.vol * 100)), 'aria-label': `Volumul pistei ${p.nume}` });
        const volT = h('output', {}, `${Math.round(p.vol * 100)}%`);
        vol.addEventListener('input', () => { p.vol = Number(vol.value) / 100; volT.textContent = `${vol.value}%`; actualizeazaMixerViu(); programeazaSalvare(D); });
        const pan = h('input', { type: 'range', min: '-100', max: '100', step: '5', value: String(Math.round(p.pan * 100)), 'aria-label': `Balansul pistei ${p.nume}` });
        const panTxt = (v) => (v === 0 ? 'C' : v < 0 ? `S${-v}` : `D${v}`);
        const panT = h('output', {}, panTxt(Math.round(p.pan * 100)));
        pan.addEventListener('input', () => { p.pan = Number(pan.value) / 100; panT.textContent = panTxt(Number(pan.value)); actualizeazaMixerViu(); programeazaSalvare(D); });
        pan.addEventListener('dblclick', () => { pan.value = '0'; pan.dispatchEvent(new Event('input')); });
        const el = h('div', { class: `ap-audio-cap${i === D.pistaSel ? ' sel' : ''}` },
          h('div', { class: 'ap-audio-crand' }, h('i', { class: 'ap-audio-cculoare' }), nume,
            btn('M', 'mute', 'mute', 'Mute (amuțire)', 'Pista nu se mai aude.'),
            btn('S', 'solo', 'solo', 'Solo', 'Se aude doar această pistă (și celelalte cu Solo).'),
            h('button', { type: 'button', class: 'ap-audio-cbtn x', 'aria-label': 'Șterge pista', 'data-tip': 'Șterge pista', onclick: () => stergePista(i) }, '✕')),
          h('label', { class: 'ap-audio-crand mic' }, h('span', {}, 'Vol'), vol, volT),
          h('label', { class: 'ap-audio-crand mic' }, h('span', {}, 'Bal'), pan, panT));
        el.style.height = `${TH}px`;
        el.querySelector('.ap-audio-cculoare').style.background = p.culoare;
        el.addEventListener('pointerdown', () => { if (D.pistaSel !== i) { D.pistaSel = i; for (const [k, c] of [...capete.children].entries()) c.classList.toggle('sel', k === i); deseneazaMix(); } });
        return el;
      }));
    }
    function deseneazaMix() {
      if (!app.isConnected || !eMix()) return;
      const TH = inaltPista(), w = latimeMix(), np = D.piste.length;
      pisteCv.style.height = `${np * TH}px`;
      // rigla
      {
        const { g, w: wr } = dimensiuni(riglaMix);
        deseneazaRigla(g, wr, D.vs, D.pxs, Math.max(durataMix(D), D.vs + wr / D.pxs));
        const xc = xDinT(S.redare?.doc === D ? pozMix() : D.cursor);
        g.fillStyle = S.redare?.doc === D ? '#E0302B' : '#1B1E22';
        g.beginPath(); g.moveTo(xc - 5, RIGLA - 9); g.lineTo(xc + 5, RIGLA - 9); g.lineTo(xc, RIGLA - 1); g.fill();
      }
      const { g, ht } = dimensiuni(pisteCv);
      g.fillStyle = '#121518';
      g.fillRect(0, 0, w, ht);
      const pxSec = D.pxs, pas = PASI.find((p) => p * pxSec >= 80) || 1200;
      g.fillStyle = 'rgba(255,255,255,.05)';
      for (let t = Math.floor(D.vs / pas) * pas; t <= D.vs + w / pxSec; t += pas) g.fillRect(Math.round(xDinT(t)), 0, 1, ht);
      const solo = D.piste.some((p) => p.solo);
      D.piste.forEach((p, i) => {
        const y0 = i * TH;
        if (i === D.pistaSel) { g.fillStyle = 'rgba(80,140,255,.10)'; g.fillRect(0, y0, w, TH); }
        g.fillStyle = '#2A2F35'; g.fillRect(0, y0 + TH - 1, w, 1);
        const stins = p.mute || (solo && !p.solo);
        for (const cl of p.clipuri) {
          if (trgClip?.clip === cl && trgClip.pista !== i) continue;
          deseneazaClip(g, cl, p, y0, TH, w, stins);
        }
        if (trgClip && trgClip.pista === i && !p.clipuri.includes(trgClip.clip)) deseneazaClip(g, trgClip.clip, p, y0, TH, w, stins);
      });
      // înregistrarea în curs, pe pista selectată
      if (S.inreg?.doc === D) {
        const R = S.inreg, x0 = xDinT(R.start ?? (R.start = D.cursor)), y0 = D.pistaSel * TH + 3, lw = R.lung / R.rata * D.pxs;
        g.fillStyle = 'rgba(224,48,43,.35)'; g.fillRect(x0, y0, lw, TH - 6);
        g.fillStyle = '#FF6B66';
        const pv = 512 / R.rata * D.pxs;
        R.varfuri.forEach((v, k) => { const a = Math.min(1, v) * (TH / 2 - 8); g.fillRect(x0 + k * pv, y0 + (TH - 6) / 2 - a, Math.max(1, pv), 2 * a + 1); });
      }
      const xc = Math.round(xDinT(D.cursor)) + 0.5;
      g.strokeStyle = '#FFFFFF'; g.setLineDash([4, 3]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(xc, 0); g.lineTo(xc, ht); g.stroke(); g.setLineDash([]);
      if (S.redare?.doc === D) { g.fillStyle = '#FF3B3B'; g.fillRect(Math.round(xDinT(pozMix())) - 1, 0, 2, ht); }
      const total = Math.max(durataMix(D), 1);
      derulareMix.max = String(Math.max(0, total + 5 - w / D.pxs));
      derulareMix.value = String(D.vs);
      derulareMix.hidden = total + 5 <= w / D.pxs;
      actualizeaza();
    }
    function deseneazaClip(g, cl, p, y0, TH, w, stins) {
      const xa = xDinT(cl.start), lw = lungClip(cl) * D.pxs;
      if (xa > w || xa + lw < 0) return;
      const y = y0 + 3, hh = TH - 6;
      g.globalAlpha = stins ? 0.35 : 1;
      g.fillStyle = p.culoare;
      g.beginPath(); g.roundRect ? g.roundRect(xa, y, lw, hh, 5) : g.rect(xa, y, lw, hh); g.fill();
      g.fillStyle = 'rgba(0,0,0,.28)';
      g.fillRect(xa + 1, y + 15, lw - 2, hh - 16);
      // forma de undă a clipului
      g.fillStyle = 'rgba(255,255,255,.85)';
      const c = cl.canale[0], N = c.length, spp = cl.rata / D.pxs, mij = y + 15 + (hh - 16) / 2, amp = (hh - 18) / 2;
      for (let x = Math.max(0, Math.floor(xa)); x < Math.min(w, xa + lw); x++) {
        const s0 = Math.floor((x - xa) * spp), s1 = Math.min(N, Math.max(s0 + 1, Math.floor((x + 1 - xa) * spp)));
        if (s0 >= N) break;
        const [mn, mx] = minMax(c, Math.max(0, s0), s1);
        g.fillRect(x, mij - Math.min(1, mx) * amp, 1, Math.max(1, (Math.min(1, mx) - Math.max(-1, mn)) * amp));
      }
      g.font = '700 11px system-ui, sans-serif';
      g.fillStyle = '#fff';
      g.save(); g.beginPath(); g.rect(xa, y, lw, 15); g.clip(); g.fillText(cl.nume || 'Clip', Math.max(xa, 0) + 5, y + 11); g.restore();
      if (D.selClip === cl.id) { g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.strokeRect(xa + 1, y + 1, lw - 2, hh - 2); }
      g.globalAlpha = 1;
    }
    derulareMix.addEventListener('input', () => { D.vs = Number(derulareMix.value); D.potrivit = false; deseneazaMix(); }, sig);

    // Interacțiuni: clic = cursor și pistă; tragerea unui clip îl mută (și pe altă pistă).
    const gasesteClip = (e) => {
      const r = pisteCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, TH = inaltPista();
      const i = Math.floor(y / TH), t = D.vs + x / D.pxs;
      const p = D.piste[i];
      if (!p) return { i: -1, t };
      const cl = [...p.clipuri].reverse().find((c) => t >= c.start && t <= c.start + lungClip(c));
      return { i, t, cl };
    };
    pisteCv.addEventListener('pointerdown', (e) => {
      if (!eMix() || e.button > 0) return;
      const { i, t, cl } = gasesteClip(e);
      if (i < 0) return;
      D.pistaSel = i;
      if (cl) {
        D.selClip = cl.id;
        pisteCv.setPointerCapture(e.pointerId);
        trgClip = { clip: cl, din: i, pista: i, dt: t - cl.start, x: e.clientX, mutat: false, start0: cl.start };
        pisteCv.style.cursor = 'grabbing';
      } else {
        D.selClip = null;
        D.cursor = Math.max(0, t);
        if (S.redare) redaMix(D.cursor);
      }
      deseneazaCapete();
      deseneazaMix();
    }, sig);
    pisteCv.addEventListener('pointermove', (e) => {
      if (!eMix()) return;
      if (!trgClip) { pisteCv.style.cursor = gasesteClip(e).cl ? 'grab' : 'text'; return; }
      if (!trgClip.mutat && Math.abs(e.clientX - trgClip.x) < 3 && gasesteClip(e).i === trgClip.din) return;
      if (!trgClip.mutat) { trgClip.mutat = true; oprireRedare(); }
      const { i, t } = gasesteClip(e);
      let st = Math.max(0, t - trgClip.dt);
      // lipire magnetică de cursor și de capetele altor clipuri (la 6 px)
      const prag = 6 / D.pxs, L = lungClip(trgClip.clip);
      for (const r of [D.cursor, 0, ...D.piste.flatMap((p) => p.clipuri.filter((c) => c !== trgClip.clip).flatMap((c) => [c.start, c.start + lungClip(c)]))]) {
        if (Math.abs(st - r) < prag) { st = r; break; }
        if (Math.abs(st + L - r) < prag) { st = r - L; break; }
      }
      trgClip.clip.start = Math.max(0, st);
      trgClip.pista = lim(i < 0 ? D.piste.length - 1 : i, 0, D.piste.length - 1);
      deseneazaMix();
    }, sig);
    pisteCv.addEventListener('pointerup', () => {
      if (!trgClip) return;
      const tc = trgClip;
      trgClip = null;
      pisteCv.style.cursor = 'grab';
      if (!tc.mutat) return;
      const st = tc.clip.start;
      tc.clip.start = tc.start0; // istoricul păstrează poziția de dinainte
      pastreazaIstoric('Mutare clip');
      const din = D.piste[tc.din], spre = D.piste[tc.pista];
      const cl = din.clipuri.find((c) => c.id === tc.clip.id);
      cl.start = st;
      if (din !== spre) { din.clipuri = din.clipuri.filter((c) => c !== cl); spre.clipuri.push(cl); D.pistaSel = tc.pista; }
      programeazaSalvare(D);
      redeseneazaTot();
    }, sig);
    pisteCv.addEventListener('pointercancel', () => { if (trgClip) { trgClip.clip.start = trgClip.start0; trgClip = null; deseneazaMix(); } }, sig);
    pisteCv.addEventListener('wheel', (e) => {
      if (!eMix()) return;
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomMix(e.deltaY > 0 ? 1.25 : 0.8, D.vs + (e.clientX - pisteCv.getBoundingClientRect().left) / D.pxs); }
      else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); D.vs = Math.max(0, D.vs + (e.deltaX || e.deltaY) / D.pxs); D.potrivit = false; deseneazaMix(); }
    }, { passive: false, signal: ac.signal });
    riglaMix.addEventListener('pointerdown', (e) => { if (!eMix()) return; mutaCursorGen(D.vs + (e.clientX - riglaMix.getBoundingClientRect().left) / D.pxs); }, sig);
    riglaMix.addEventListener('wheel', (e) => { if (eMix() && (e.ctrlKey || e.metaKey)) { e.preventDefault(); zoomMix(e.deltaY > 0 ? 1.25 : 0.8); } }, { passive: false, signal: ac.signal });
    pisteCv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!eMix()) return;
      const { i, t, cl } = gasesteClip(e);
      if (i < 0) return;
      D.pistaSel = i;
      if (cl) D.selClip = cl.id; else D.cursor = Math.max(0, t);
      deseneazaCapete(); deseneazaMix();
      meniu(e.clientX, e.clientY, cl ? [
        { t: 'Împărțire la cursor', ico: 'imparte', k: 'S', fn: () => imparteClip(), dez: !(D.cursor > cl.start && D.cursor < cl.start + lungClip(cl)) },
        { t: 'Mută clipul la cursor', ico: 'inserareFisier', fn: () => { pastreazaIstoric('Mutare clip'); D.piste[i].clipuri.find((c) => c.id === cl.id).start = D.cursor; programeazaSalvare(D); redeseneazaTot(); } },
        { t: 'Deschide clipul ca fișier separat', ico: 'deschide', fn: () => deschideCaDoc({ canale: cl.canale.map((c) => c.slice()), rata: cl.rata }, cl.nume || 'Clip') },
        { sep: 1 }, { t: 'Ștergere clip', ico: 'stergeClip', k: 'Delete', fn: () => stergeClip() },
      ] : [
        { t: 'Redă de aici', ico: 'redare', fn: () => redaMix(D.cursor) },
        { t: 'Import audio pe pistă nouă…', ico: 'importPista', fn: () => importPeste() },
        { t: 'Pistă nouă', ico: 'pistaNoua', fn: () => adaugaPista() },
      ]);
    }, sig);

    // Operații multipistă
    const clipSelectat = () => { for (const [i, p] of D.piste.entries()) { const c = p.clipuri.find((x) => x.id === D.selClip); if (c) return { p, i, c }; } return null; };
    function adaugaClip(src, et, iPista, start, nume) {
      if (!eMix()) return;
      pastreazaIstoric(et);
      if (!D.piste[iPista]) D.piste.push(pistaNoua(`Pista ${D.piste.length + 1}`));
      const p = D.piste[lim(iPista, 0, D.piste.length - 1)];
      const cl = { id: idNou(), nume: nume || et, start: Math.max(0, start), rata: src.rata, canale: src.canale.map((c) => c.slice()) };
      p.clipuri.push(cl);
      D.selClip = cl.id;
      programeazaSalvare(D);
      redeseneazaTot();
      asiguraVizibilMix(cl.start);
    }
    function adaugaPista() {
      if (!eMix()) return;
      if (D.piste.length >= 12) return toast('Ai deja 12 piste: destul pentru un proiect de școală!');
      pastreazaIstoric('Pistă nouă');
      D.piste.push(pistaNoua(`Pista ${D.piste.length + 1}`));
      D.pistaSel = D.piste.length - 1;
      programeazaSalvare(D);
      redeseneazaTot();
    }
    async function stergePista(i) {
      const p = D.piste[i];
      if (p.clipuri.length && !(await confirma('Ștergere pistă', `Ștergi pista „${p.nume}” împreună cu ${p.clipuri.length} ${p.clipuri.length === 1 ? 'clip' : 'clipuri'}?`, 'Șterge'))) return;
      oprireRedare();
      pastreazaIstoric('Ștergere pistă');
      D.piste.splice(i, 1);
      if (!D.piste.length) D.piste.push(pistaNoua('Pista 1'));
      D.pistaSel = Math.min(D.pistaSel, D.piste.length - 1);
      programeazaSalvare(D);
      redeseneazaTot();
    }
    async function importPeste() {
      if (!eMix()) return;
      const fs = await alegeFisier(ACCEPT, true);
      let k = 0;
      for (const f of fs || []) {
        const s = await citesteFisier(f);
        if (!s) continue;
        // fiecare fișier pe o pistă nouă (sau pe prima pistă goală)
        let i = D.piste.findIndex((p) => !p.clipuri.length);
        if (i < 0) { D.piste.push(pistaNoua(numeFara(f).slice(0, 30))); i = D.piste.length - 1; } else if (/^Pista \d+$/.test(D.piste[i].nume)) D.piste[i].nume = numeFara(f).slice(0, 30);
        adaugaClip(s, `Import „${numeFara(f)}”`, i, D.cursor, numeFara(f));
        k++;
      }
      if (k) { if (D.potrivit) potrivesteMix(); toast(k === 1 ? 'Fișierul a fost pus pe o pistă. Trage clipul ca să-l muți în timp.' : `${k} fișiere, fiecare pe pista lui.`); }
    }
    function imparteClip() {
      const x = clipSelectat();
      if (!x) return toast('Apasă mai întâi pe un clip ca să-l selectezi.');
      const { p, c } = x, t = D.cursor - c.start, k = Math.round(t * c.rata);
      if (k <= 0 || k >= c.canale[0].length) return toast('Pune cursorul în interiorul clipului (apasă pe pistă, pe locul unde vrei tăietura).');
      pastreazaIstoric('Împărțire clip');
      const cl = p.clipuri.find((q) => q.id === c.id);
      const nou = { id: idNou(), nume: cl.nume, start: D.cursor, rata: cl.rata, canale: cl.canale.map((q) => q.slice(k)) };
      cl.canale = cl.canale.map((q) => q.slice(0, k));
      p.clipuri.push(nou);
      D.selClip = nou.id;
      programeazaSalvare(D);
      redeseneazaTot();
    }
    function stergeClip() {
      const x = clipSelectat();
      if (!x) return;
      oprireRedare();
      pastreazaIstoric('Ștergere clip');
      x.p.clipuri = x.p.clipuri.filter((c) => c.id !== x.c.id);
      D.piste[x.i] = x.p;
      D.selClip = null;
      programeazaSalvare(D);
      redeseneazaTot();
    }
    // Amestecarea pistelor (fără cele amuțite) într-un singur sunet stereo.
    async function mixeazaPiste(d) {
      const total = durataMix(d);
      if (!total) throw new Error('Proiectul nu are clipuri.');
      const rata = d.rata, len = Math.ceil(total * rata);
      const oc = new OfflineAudioContext(2, len, rata);
      const solo = d.piste.some((p) => p.solo);
      for (const p of d.piste) {
        if (p.mute || (solo && !p.solo) || !p.clipuri.length) continue;
        const g = oc.createGain();
        g.gain.value = p.vol;
        let ult = g;
        if (oc.createStereoPanner) { const pn = oc.createStereoPanner(); pn.pan.value = p.pan; g.connect(pn); ult = pn; }
        ult.connect(oc.destination);
        for (const cl of p.clipuri) {
          const b = oc.createBuffer(cl.canale.length, cl.canale[0].length, cl.rata);
          cl.canale.forEach((c, i) => b.copyToChannel(c, i));
          const s = oc.createBufferSource();
          s.buffer = b;
          s.connect(g);
          s.start(cl.start);
        }
      }
      const r = await oc.startRendering();
      return { rata, canale: [r.getChannelData(0).slice(), r.getChannelData(1).slice()] };
    }
    async function mixInFisier() {
      if (!eMix() || !areContinut()) return;
      let s;
      try { s = await ocupat('Se amestecă pistele…', () => mixeazaPiste(D)); } catch { return toast('Nu am putut amesteca pistele.', 'error'); }
      if (varf(s.canale, 0, s.canale[0].length) > 1) toast('Atenție: amestecul depășește 100% în unele locuri. Micșorează volumul unor piste.', 'warn');
      await deschideCaDoc(s, `${D.titlu} (mixaj)`);
    }
    async function trimiteLaMix() {
      if (faraSunet()) return;
      const [a, b] = zonaLucru();
      const src = { rata: D.rata, canale: D.canale.map((c) => c.slice(a, b)) }, nume = D.titlu;
      let tinta = [...S.docs].reverse().find((d) => d.tip === 'mix');
      if (!tinta) { if (!(await mixNou(true))) return; tinta = D; } else activeaza(tinta);
      let i = D.piste.findIndex((p) => !p.clipuri.length);
      if (i < 0) { D.piste.push(pistaNoua(nume.slice(0, 30))); i = D.piste.length - 1; } else if (/^Pista \d+$/.test(D.piste[i].nume)) D.piste[i].nume = nume.slice(0, 30);
      adaugaClip(src, `Adăugare „${nume}”`, i, 0, nume);
      if (D.potrivit) potrivesteMix();
      toast(`„${nume}” a fost pus pe pista „${D.piste[i].nume}” din „${D.titlu}”.`);
    }

    // ---------- Deschiderea fișierelor ----------
    const ACCEPT = 'audio/*,.mp3,.wav,.ogg,.oga,.m4a,.webm,.flac';
    const numeFara = (f) => f.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Sunet';
    async function citesteFisier(f) {
      if (!f) return null;
      if (f.size > 200 * 1048576) { toast('Fișierul e prea mare (peste 200 MB).', 'error'); return null; }
      stareSalv.textContent = `Se citește „${f.name}”…`;
      try {
        const s = await decodeaza(await f.arrayBuffer());
        if (!s.canale[0]?.length) throw new Error('gol');
        if (s.canale[0].length / s.rata > MAX_SEC) {
          toast(`Fișierul durează ${fmtTimp(s.canale[0].length / s.rata, 0)}. Păstrez doar primele ${MAX_SEC / 60} minute.`, 'warn');
          s.canale = s.canale.map((c) => c.slice(0, MAX_SEC * s.rata));
        }
        return s;
      } catch {
        dialog('Eroare la deschidere', [h('p', {}, `Fișierul „${f.name}” nu a putut fi deschis.`), h('p', { class: 'ap-audio-expl' }, 'Poate nu este un fișier audio sau formatul nu e cunoscut. Folosește MP3, WAV sau OGG.')], undefined, { ico: 'inchide' });
        return null;
      } finally { afiseazaSalvare(); }
    }
    // Un document gol, nesalvat și nemodificat poate fi înlocuit de fișierul deschis (ca în WavePad).
    const eGol = (d) => d && d.tip === 'sunet' && !d.canale[0]?.length && !d.id && !d.istoric.length;
    async function locNou() {
      if (eGol(D)) { const vechi = D; S.docs.splice(S.docs.indexOf(vechi), 1); return true; }
      if (S.docs.length >= MAX_DOC) { toast(`Ai deja ${MAX_DOC} fișiere deschise. Închide unul (Fișier → Închidere fișier).`, 'error'); return false; }
      return true;
    }
    async function deschideCaDoc(s, titlu, extra = {}) {
      if (!(await locNou())) return null;
      const d = docSunet({ titlu: await numeLiber(titlu, null, S.docs.map((x) => x.titlu)), rata: s.rata, canale: s.canale, salvat: false, ...extra });
      S.docs.push(d);
      activeaza(d);
      potriveste();
      programeazaSalvare(d);
      return d;
    }
    async function deschideFisiere(lista) {
      const fs = lista || await alegeFisier(ACCEPT, true);
      for (const f of fs || []) {
        const s = await citesteFisier(f);
        if (!s) continue;
        const d = await deschideCaDoc(s, numeFara(f));
        if (!d) break;
        toast(`Deschis: ${f.name} (${fmtTimp(s.canale[0].length / s.rata, 1)}, ${s.canale.length === 2 ? 'stereo' : 'mono'})`);
      }
    }
    async function fisierNou() {
      if (!(await locNou())) return;
      const d = docSunet({ titlu: await numeLiber('Sunet nou', null, S.docs.map((x) => x.titlu)) });
      S.docs.push(d);
      activeaza(d);
    }
    async function mixNou() {
      if (!(await locNou())) return false;
      const d = docMix({ titlu: await numeLiber('Proiect multipistă', null, S.docs.map((x) => x.titlu)), rata: 44100 });
      S.docs.push(d);
      activeaza(d);
      if (S.fila !== 'multipista') { S.fila = 'multipista'; deseneazaPanglica(); }
      return true;
    }
    async function adaugaFisier(mod, f) {
      if (!eSunet()) return;
      f = f || await alegeFisier(ACCEPT);
      if (!f) return;
      const s = await citesteFisier(f);
      if (!s) return;
      if (mod === 'inserare') return insereaza(s, `Inserare „${numeFara(f)}”`);
      const v = await dialogVolumMix('Mixare cu fișier', f.name);
      if (v != null) mixeaza(s, v, `Mixare „${numeFara(f)}”`);
    }
    // Când există deja sunet, întreabă unde se pune sunetul nou (fișier tras în fereastră sau înregistrare).
    async function aseaza(s, eticheta, numeSursa) {
      if (!n()) return insereaza(s, eticheta);
      const r = await dialog('Unde pun sunetul nou?', [
        h('p', {}, `Sunetul nou durează ${nr(s.canale[0].length / s.rata, 1)} s. Fișierul are deja ${nr(sec(), 1)} s.`),
        h('p', { class: 'ap-audio-expl' }, `Cursorul este la ${fmtTimp((D.sel ? D.sel.a : D.cursor) / D.rata)}.`)],
      [{ t: 'Anulare', v: null }, { t: 'Înlocuiește tot', v: 'tot' }, { t: 'Mixează la cursor', v: 'mix' }, { t: 'Inserează la cursor', v: 'ins', p: true }], { ico: 'inserareFisier' });
      if (r === 'ins') return insereaza(s, eticheta);
      if (r === 'mix') { const v = await dialogVolumMix('Mixare', numeSursa); if (v != null) mixeaza(s, v, eticheta); }
      if (r === 'tot') { const c = await reesantioneaza(s.canale, s.rata, D.rata, D.canale.length); seteaza(c, { cursor: 0, et: eticheta }); potriveste(); }
    }
    zonaDoc.addEventListener('dragover', (e) => { e.preventDefault(); zonaDoc.classList.add('peste'); }, sig);
    zonaDoc.addEventListener('dragleave', (e) => { if (!zonaDoc.contains(e.relatedTarget)) zonaDoc.classList.remove('peste'); }, sig);
    zonaDoc.addEventListener('drop', async (e) => {
      e.preventDefault();
      zonaDoc.classList.remove('peste');
      const fs = [...(e.dataTransfer?.files || [])];
      if (!fs.length) return;
      if (eMix()) {
        for (const f of fs) { const s = await citesteFisier(f); if (s) adaugaClip(s, `Import „${numeFara(f)}”`, D.pistaSel, D.cursor, numeFara(f)); }
        return;
      }
      if (!n() || fs.length > 1) return deschideFisiere(fs);
      const s = await citesteFisier(fs[0]);
      if (s) aseaza(s, `Adăugare „${numeFara(fs[0])}”`, fs[0].name);
    }, sig);

    // ---------- Documentele deschise (file) ----------
    function activeaza(d) {
      if (D === d) { redeseneazaTot(); return; }
      oprireRedare();
      oprestePreviz();
      D = d;
      cacheSp = null;
      vizSunet.hidden = d.tip !== 'sunet';
      vizMix.hidden = d.tip !== 'mix';
      redeseneazaTot();
      if (d.tip === 'mix' && d.potrivit) potrivesteMix();
      if (d.tip === 'sunet') { limiteazaVedere(); if (d.potrivit) potriveste(); }
    }
    async function inchideDoc(d) {
      if (!d) return;
      if (S.inreg?.doc === d) await opresteInreg(false);
      if (S.redare?.doc === d) oprireRedare();
      if (d.tSalv) await salveazaDoc(d);
      const i = S.docs.indexOf(d);
      S.docs.splice(i, 1);
      if (!S.docs.length) S.docs.push(docSunet({ titlu: await numeLiber('Sunet nou') }));
      if (D === d) { D = null; activeaza(S.docs[Math.min(i, S.docs.length - 1)]); } else redeseneazaTot();
    }
    async function redenumesteDoc(d) {
      if (!d) return;
      const t = await intrebaText('Redenumire', 'Numele nou', d.titlu);
      if (!t) return;
      d.titlu = await numeLiber(t.slice(0, 80), d.id, S.docs.filter((x) => x !== d).map((x) => x.titlu));
      if (d.id) await store.redenumeste(d.id, d.titlu);
      redeseneazaTot();
    }
    const durataDoc = (d) => (d.tip === 'sunet' ? (d.canale[0]?.length || 0) / d.rata : durataMix(d));
    function deseneazaTaburi() {
      umple(tabDoc, S.docs.map((d) => h('div', { class: `ap-audio-tab${d === D ? ' activ' : ''}`, role: 'tab', 'aria-selected': String(d === D), tabindex: '0',
        'data-tip': d.titlu, 'data-tipd': `${d.tip === 'mix' ? 'Proiect multipistă' : 'Fișier audio'} · ${fmtTimp(durataDoc(d), 1)}. Dublu clic: redenumire.`,
        onclick: () => activeaza(d), ondblclick: () => redenumesteDoc(d), onkeydown: (e) => { if (e.key === 'Enter') activeaza(d); },
        onauxclick: (e) => { if (e.button === 1) inchideDoc(d); } },
      ic(d.tip === 'mix' ? 'multipista' : 'unda'), h('span', { class: 'ap-audio-tabt' }, d.titlu), d.salvat ? null : h('i', { class: 'ap-audio-tabmod', 'aria-label': 'nesalvat' }, '•'),
      h('button', { type: 'button', class: 'ap-audio-tabx', 'aria-label': `Închide ${d.titlu}`, onclick: (e) => { e.stopPropagation(); inchideDoc(d); } }, '✕'))),
      h('button', { type: 'button', class: 'ap-audio-tabplus', 'aria-label': 'Fișier nou', 'data-tip': 'Filă nouă', 'data-tipd': 'Fișier nou, proiect multipistă sau deschidere fișier.', onclick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        meniu(r.left, r.bottom + 2, ['nou', 'mixNou', 'deschide', 'proiecte'].map((k) => ({ t: ACT[k].t, ico: ACT[k].ico, k: ACT[k].k, fn: ACT[k].fn })));
      } }, '+'));
    }

    // ---------- Panoul din stânga: Fișiere, Marcaje, Istoric ----------
    function deseneazaPanou() {
      if (!S.arataPanou) return;
      umple(capPanou, [['fisiere', 'Fișiere'], ['marcaje', 'Marcaje'], ['istoric', 'Istoric']].map(([k, t]) => h('button', { type: 'button', role: 'tab', class: 'ap-audio-ptab', 'aria-selected': String(S.panou === k), onclick: () => { S.panou = k; deseneazaPanou(); } }, t)));
      if (S.panou === 'fisiere') {
        umple(listaPanou, S.docs.map((d) => h('button', { type: 'button', class: `ap-audio-pfis${d === D ? ' activ' : ''}`, onclick: () => activeaza(d), ondblclick: () => redenumesteDoc(d) },
          ic(d.tip === 'mix' ? 'multipista' : 'unda'),
          h('span', {}, h('b', {}, d.titlu), h('small', {}, d.tip === 'mix' ? `${d.piste.length} piste · ${fmtTimp(durataMix(d), 1)}` : d.canale[0]?.length ? `${fmtTimp(durataDoc(d), 1)} · ${d.canale.length === 2 ? 'stereo' : 'mono'} · ${Math.round(d.rata / 100) / 10} kHz` : 'gol')))),
        h('button', { type: 'button', class: 'ap-audio-plink', onclick: () => panouProiecte() }, ic('proiecte'), 'Proiectele mele…'));
      } else if (S.panou === 'marcaje') {
        const ms = eSunet() ? D.marcaje : [];
        umple(listaPanou, !eSunet() ? h('p', { class: 'ap-audio-pgol' }, 'Marcajele se pun pe un fișier audio.')
          : ms.length ? ms.map((m) => h('div', { class: 'ap-audio-pmarc' },
            h('button', { type: 'button', class: 'ap-audio-pmb', onclick: () => (m.t2 != null ? (selecteaza(m.t, m.t2), asiguraVizibil(m.t)) : mutaCursor(m.t)), ondblclick: async () => {
              const t = await intrebaText('Redenumire marcaj', 'Numele', m.nume);
              if (t) { pastreazaIstoric('Redenumire marcaj'); m.nume = t; programeazaSalvare(D); redeseneazaTot(); }
            } }, ic(m.t2 != null ? 'regiune' : 'marcaj'), h('span', {}, h('b', {}, m.nume), h('small', {}, m.t2 != null ? `${fmtTimp(m.t / D.rata)} → ${fmtTimp(m.t2 / D.rata)}` : fmtTimp(m.t / D.rata)))),
            h('button', { type: 'button', class: 'ap-audio-px', 'aria-label': `Șterge ${m.nume}`, onclick: () => { pastreazaIstoric('Ștergere marcaj'); D.marcaje = D.marcaje.filter((x) => x !== m); programeazaSalvare(D); redeseneazaTot(); } }, '✕')))
            : h('p', { class: 'ap-audio-pgol' }, 'Niciun marcaj. Apasă M (sau Editare → Marcaj) ca să pui unul la cursor, ori selectează și alege Regiune.'),
        eSunet() ? h('div', { class: 'ap-audio-pact' }, buton('marcaj', 'ap-audio-pbtn'), buton('regiune', 'ap-audio-pbtn')) : null);
        actualizeaza(false);
      } else {
        const ist = D.istoric, red = D.refacere;
        const rand = (t, cls, fn, ico) => h('button', { type: 'button', class: `ap-audio-pist ${cls}`, onclick: fn }, ic(ico), h('span', {}, t));
        umple(listaPanou, h('div', { class: 'ap-audio-pistl' },
          rand(ist.length ? 'Stare inițială' : 'Stare inițială (curentă)', ist.length ? '' : 'curent', () => anulare(ist.length, true), 'nou'),
          ist.map((x, i) => rand(x.et, i === ist.length - 1 ? 'curent' : '', () => anulare(ist.length - 1 - i, true), 'istoric')),
          [...red].reverse().map((x, i) => rand(x.et, 'anulat', () => refacere(i + 1, true), 'refacere'))),
        h('p', { class: 'ap-audio-pgol' }, 'Apasă pe un pas ca să te întorci la el. Pașii gri au fost anulați: îi poți reface.'));
      }
    }

    // ---------- Starea butoanelor și a barelor ----------
    function poate(k) {
      const c = ACT[k].cere;
      if (S.inreg && k !== 'inregistreaza') return false;
      switch (c) {
        case 'docSunet': return eSunet();
        case 'sunet': return eSunet() && n() > 0;
        case 'sel': return eSunet() && !!D.sel;
        case 'clip': return eSunet() && !!S.clip;
        case 'mix': return eMix();
        case 'mixPlin': return eMix() && areContinut();
        case 'clipSel': return eMix() && !!D.selClip;
        case 'undo': return !!D?.istoric.length;
        case 'redo': return !!D?.refacere.length;
        case 'continut': return areContinut();
        case 'gen': return !!D;
        default: return true;
      }
    }
    function actualizeaza(cuPanou = true) {
      if (!D) return;
      for (const [b, k] of butoane) {
        b.disabled = !poate(k);
        if (ACT[k].comuta) { const on = ACT[k].comuta(); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('apasat', on); }
        if (k === 'anulare') b.dataset.tip = D.istoric.length ? `Anulare: ${D.istoric[D.istoric.length - 1].et}` : 'Anulare';
        if (k === 'refacere') b.dataset.tip = D.refacere.length ? `Refacere: ${D.refacere[D.refacere.length - 1].et}` : 'Refacere';
      }
      const reda_ = !!S.redare;
      umple(bRedare, ic(reda_ ? 'pauza' : 'redare'));
      bRedare.setAttribute('aria-label', reda_ ? 'Pauză' : 'Redare');
      bRedare.dataset.tip = reda_ ? 'Pauză' : 'Redare';
      bRedare.disabled = !areContinut() || !!S.inreg;
      bRedare.classList.toggle('activ', reda_);
      bOprire.disabled = !reda_ && !S.inreg;
      bRedareSel.disabled = !(eSunet() && D.sel) || !!S.inreg;
      bInreg.classList.toggle('inregistreaza', !!S.inreg);
      bInreg.dataset.tip = S.inreg ? 'Oprește înregistrarea' : 'Înregistrare';
      bBucla.classList.toggle('apasat', S.bucla);
      bBucla.setAttribute('aria-pressed', String(S.bucla));
      app.classList.toggle('inreg', !!S.inreg);
      if (!S.redare && !S.inreg) contorTimp.textContent = fmtContor(eSunet() ? D.cursor / D.rata : eMix() ? D.cursor : 0);
      if (eSunet() && D.sel) { vInc.textContent = fmtTimp(D.sel.a / D.rata, 3); vSf.textContent = fmtTimp(D.sel.b / D.rata, 3); vLg.textContent = fmtTimp((D.sel.b - D.sel.a) / D.rata, 3); }
      else { vInc.textContent = '—'; vSf.textContent = '—'; vLg.textContent = fmtTimp(sec(), 3); }
      tinta.textContent = eSunet() ? `Se aplică pe: ${n() ? tintaText() : '—'}` : 'Efectele merg pe un fișier audio';
      titluFer.textContent = `${D.titlu}${D.salvat ? '' : ' *'} – Editor audio`;
      const nc = eSunet() ? D.canale.length : 2;
      umple(stare,
        h('span', {}, eMix() ? `Multipistă · ${D.piste.length} piste · ${D.rata.toLocaleString('ro-RO')} Hz` : n() ? `${nc === 2 ? 'Stereo' : 'Mono'} · ${D.rata.toLocaleString('ro-RO')} Hz · 16 biți` : 'Niciun sunet'),
        areContinut() ? h('span', {}, `Durata: ${fmtTimp(sec())}`) : null,
        areContinut() ? h('span', {}, `Ca WAV: ≈ ${marime(44 + Math.round(sec() * D.rata) * nc * 2)} · ca MP3 128 kbps: ≈ ${marime(sec() * 16000)}`) : null,
        h('span', { class: 'ap-audio-spatiu' }),
        h('span', { class: 'ap-audio-taste' }, S.inreg ? '● Se înregistrează… Spațiu = oprire' : eMix() ? 'Trage clipurile · Ctrl+rotiță: zoom · clic dreapta: meniu' : 'Spațiu: redare/pauză · Ctrl+Z: anulare · Ctrl+rotiță: zoom · clic dreapta: meniu'));
      // ecranul gol al unui fișier audio
      gol.hidden = !eSunet() || n() > 0;
      if (!gol.hidden && !gol.firstChild) {
        umple(gol, h('div', { class: 'ap-audio-golcutie' },
          h('span', { class: 'ap-audio-golic', html: SVG(ICO.microfon) }),
          h('b', {}, 'Fișier gol'),
          h('p', {}, 'Apasă butonul roșu ca să înregistrezi, deschide un fișier audio (MP3, WAV, OGG) sau trage-l aici.'),
          h('div', { class: 'ap-audio-golbut' },
            h('button', { type: 'button', class: 'ap-audio-db p rosu', onclick: () => inregistreaza() }, '● Înregistrare'),
            h('button', { type: 'button', class: 'ap-audio-db', onclick: () => deschideFisiere() }, 'Deschidere fișier…'),
            h('button', { type: 'button', class: 'ap-audio-db', onclick: () => dialogGenerare('ton') }, 'Generare ton…'),
            h('button', { type: 'button', class: 'ap-audio-db', onclick: () => mixNou() }, 'Proiect multipistă'))));
      }
      afiseazaSalvare();
      if (cuPanou && S.arataPanou && S.panou !== 'marcaje') deseneazaPanou();
    }
    function redeseneazaTot() {
      if (!D) return;
      deseneazaTaburi();
      if (eSunet()) deseneaza(); else { deseneazaCapete(); deseneazaMix(); }
      actualizeaza(false);
      deseneazaPanou();
    }

    // ---------- Salvare (automată), deschidere proiecte ----------
    function afiseazaSalvare(text, err = false) {
      if (!D) return;
      stareSalv.textContent = text ?? (!areContinut() ? '' : D.salvat ? '✓ Salvat în acest browser' : 'Nesalvat');
      stareSalv.classList.toggle('err', err);
    }
    function programeazaSalvare(d) {
      d.salvat = false;
      if (d === D) { afiseazaSalvare('Se salvează…'); titluFer.textContent = `${d.titlu} * – Editor audio`; }
      clearTimeout(d.tSalv);
      d.tSalv = setTimeout(() => salveazaDoc(d), 1500);
    }
    async function salveazaDoc(d, anunt = false) {
      if (!d) return;
      clearTimeout(d.tSalv);
      d.tSalv = null;
      const continut = d.tip === 'sunet' ? d.canale[0]?.length : d.piste.some((p) => p.clipuri.length);
      if (!continut) { if (anunt) toast('Nu am ce salva: fișierul e gol.'); return; }
      if (!d.id) d.id = idNou();
      let meta, date;
      if (d.tip === 'sunet') {
        meta = { id: d.id, titlu: d.titlu, durata: durataDoc(d), rata: d.rata, nc: d.canale.length, creat: d.creat, actualizat: Date.now(), marcaje: d.marcaje.map((m) => ({ ...m })) };
        date = d.canale;
      } else {
        date = {};
        meta = { id: d.id, tip: 'mix', titlu: d.titlu, durata: durataMix(d), rata: d.rata, nc: 2, creat: d.creat, actualizat: Date.now(),
          piste: d.piste.map((p) => ({ id: p.id, nume: p.nume, vol: p.vol, pan: p.pan, mute: p.mute, solo: p.solo, culoare: p.culoare,
            clipuri: p.clipuri.map((c) => { date[c.id] = c.canale; return { id: c.id, nume: c.nume, start: c.start, rata: c.rata, len: c.canale[0].length }; }) })) };
      }
      try {
        await store.salveaza(meta, date, d.rata);
        d.salvat = !d.tSalv;
        if (d === D) { afiseazaSalvare(); actualizeaza(false); deseneazaTaburi(); }
        if (anunt) toast('Salvat în acest browser. Ca să ai fișierul pe calculator: Salvare fișier ca (MP3 sau WAV).');
      } catch {
        if (d === D) afiseazaSalvare('Nesalvat!', true);
        toast('Nu am putut salva: spațiul din browser e plin. Salvează sunetul ca fișier (Salvare fișier ca) și șterge proiectele vechi.', 'error');
      }
    }
    async function deschideProiect(id) {
      const deja = S.docs.find((d) => d.id === id);
      if (deja) return activeaza(deja);
      const p = await store.incarca(id);
      if (!p) return toast('Proiectul nu mai există.', 'error');
      if (!(await locNou())) return;
      let d;
      if (p.tip === 'mix') {
        d = docMix({ id: p.id, titlu: p.titlu, creat: p.creat, rata: p.rata || 44100,
          piste: (p.piste || []).map((x) => ({ ...x, culoare: x.culoare || CULORI_PISTE[nrPista++ % CULORI_PISTE.length],
            clipuri: x.clipuri.filter((c) => p.clipuri[c.id]).map((c) => ({ id: c.id, nume: c.nume, start: c.start, rata: c.rata, canale: p.clipuri[c.id] })) })) });
        if (!d.piste.length) d.piste.push(pistaNoua('Pista 1'));
      } else {
        d = docSunet({ id: p.id, titlu: p.titlu, creat: p.creat, rata: p.rata, canale: p.canale, marcaje: Array.isArray(p.marcaje) ? p.marcaje : [] });
      }
      S.docs.push(d);
      D = null;
      activeaza(d);
      if (d.tip === 'sunet') potriveste(); else potrivesteMix();
    }
    async function panouProiecte() {
      const listaP = h('div', { class: 'ap-audio-lista' });
      let inchide = null;
      const reface = async () => {
        const toate = (await store.lista()).sort((a, b) => b.actualizat - a.actualizat);
        umple(listaP, toate.length ? toate.map((p) => {
          const deschis = S.docs.some((d) => d.id === p.id);
          return h('div', { class: `ap-audio-proiect${deschis ? ' curent' : ''}` },
            ic(p.tip === 'mix' ? 'multipista' : 'unda'),
            h('button', { type: 'button', class: 'ap-audio-pdeschide', onclick: () => { inchide(null); deschideProiect(p.id); } },
              h('b', {}, p.titlu), h('span', {}, `${p.tip === 'mix' ? `multipistă, ${p.piste?.length || 0} piste` : p.nc === 2 ? 'stereo' : 'mono'} · ${fmtTimp(p.durata || 0, 1)} · ${cand(p.actualizat)}${deschis ? ' · deschis' : ''}`)),
            h('button', { type: 'button', class: 'ap-audio-link', onclick: async () => {
              const t = await intrebaText('Redenumire', 'Numele nou', p.titlu);
              if (!t) return;
              const nou = await numeLiber(t.slice(0, 80), p.id);
              await store.redenumeste(p.id, nou);
              const d = S.docs.find((x) => x.id === p.id);
              if (d) { d.titlu = nou; redeseneazaTot(); }
              reface();
            } }, 'Redenumește'),
            h('button', { type: 'button', class: 'ap-audio-link', onclick: async () => {
              if (!(await confirma('Ștergere', `Ștergi „${p.titlu}”? Nu poate fi recuperat.`, 'Șterge'))) return;
              await store.sterge(p.id);
              const d = S.docs.find((x) => x.id === p.id);
              if (d) { d.id = null; d.salvat = false; redeseneazaTot(); }
              reface();
            } }, 'Șterge'));
        }) : h('p', { class: 'ap-audio-expl' }, 'Încă nu ai proiecte salvate. Fișierele se salvează singure după ce au sunet.'));
      };
      await reface();
      const act = (k) => h('button', { type: 'button', class: 'ap-audio-fact', disabled: !poate(k), onclick: () => { inchide(null); ACT[k].fn(); } }, ic(ACT[k].ico), h('span', {}, h('b', {}, ACT[k].t), h('small', {}, ACT[k].d)));
      await dialog('Proiectele mele', h('div', { class: 'ap-audio-panou' },
        h('div', { class: 'ap-audio-pact2' }, act('nou'), act('mixNou'), act('deschide'), act('salveazaCa')),
        h('div', {}, h('h3', {}, 'Salvate în acest browser'), listaP,
          h('p', { class: 'ap-audio-expl mic' }, 'Proiectele se păstrează în acest browser, pe acest calculator. Ca să iei sunetul cu tine sau să-l trimiți, folosește Salvare fișier ca (MP3 sau WAV).'))),
      [{ t: 'Închide', v: null }], { lat: true, ico: 'proiecte', laDeschidere: (f) => { inchide = f; } });
    }

    // ---------- Salvare fișier ca: MP3, WAV, OGG/WebM ----------
    const tipWebm = () => (window.MediaRecorder ? ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) : null);
    async function canaleActive() {
      if (eSunet()) return { rata: D.rata, canale: D.canale };
      return mixeazaPiste(D);
    }
    async function dialogExport() {
      if (!areContinut()) return toast('Nu am ce salva: fișierul e gol.');
      oprireRedare();
      const L = sec(), ncP = eSunet() ? D.canale.length : 2;
      const webm = tipWebm();
      let format = 'mp3';
      const nume = h('input', { type: 'text', value: D.titlu.replace(/[\\/:*?"<>|]/g, '_'), class: 'ap-audio-txt', 'aria-label': 'Numele fișierului' });
      const ext = h('span', { class: 'u' }, '.mp3');
      const kbps = lista('Calitate (debit)', [['64', '64 kbps – voce, fișier mic'], ['96', '96 kbps'], ['128', '128 kbps – obișnuit'], ['192', '192 kbps – muzică'], ['256', '256 kbps'], ['320', '320 kbps – cea mai bună']], ncP === 2 ? '192' : '128');
      const canale = lista('Canale', [['orig', ncP === 2 ? 'Stereo (ca în proiect)' : 'Mono (ca în proiect)'], ...(ncP === 2 ? [['mono', 'Mono (fișier mai mic)']] : [])], 'orig');
      const rataW = lista('Rata de eșantionare', [['orig', `${D.rata.toLocaleString('ro-RO')} Hz (ca în proiect)`], ...(D.rata !== 44100 ? [['44100', '44 100 Hz (CD)']] : []), ['22050', '22 050 Hz (voce, fișier mai mic)']], 'orig');
      const estimare = h('p', { class: 'ap-audio-expl' });
      const calc = () => {
        const nc = canale.valoare() === 'mono' ? 1 : ncP;
        ext.textContent = format === 'mp3' ? '.mp3' : format === 'wav' ? '.wav' : webm?.includes('ogg') ? '.ogg' : '.webm';
        kbps.hidden = format !== 'mp3';
        rataW.hidden = format !== 'wav';
        const b = format === 'mp3' ? L * Number(kbps.valoare()) * 125 : format === 'wav' ? 44 + L * (rataW.valoare() === 'orig' ? D.rata : Number(rataW.valoare())) * nc * 2 : L * 16000;
        estimare.textContent = `Mărimea estimată: ≈ ${marime(b)}. ${format === 'mp3' ? 'MP3 comprimă sunetul: fișier mic, calitate bună.' : format === 'wav' ? 'WAV păstrează sunetul necomprimat: calitate maximă, fișier mare.' : `Salvarea durează cât sunetul (${nr(L, 0)} s), pentru că browserul îl codează în timp real.`}`;
      };
      [kbps.sel, canale.sel, rataW.sel].forEach((s) => s.addEventListener('change', calc));
      const formate = [['mp3', 'MP3', 'fișier mic, merge peste tot'], ['wav', 'WAV', 'calitate maximă, fișier mare'], ...(webm ? [['webm', webm.includes('ogg') ? 'OGG (Opus)' : 'WebM (Opus)', 'foarte mic, pentru web']] : [])];
      const radios = formate.map(([k, t, d]) => h('label', { class: 'ap-audio-opt' },
        h('input', { type: 'radio', name: 'ap-audio-fmt', value: k, checked: k === format, onchange: () => { format = k; calc(); } }), h('span', {}, t), h('small', {}, d)));
      const asculta = h('div', { class: 'ap-audio-asculta' });
      let url = null;
      const exporta = async (el) => {
        el.disabled = true;
        try {
          let s = await ocupat(eMix() ? 'Se amestecă pistele…' : 'Se pregătește sunetul…', () => canaleActive());
          let can = s.canale, rata = s.rata;
          if (canale.valoare() === 'mono') can = potrivesteCanale(can, 1);
          let blob;
          if (format === 'mp3') {
            if (![32000, 44100, 48000].includes(rata)) { can = await reesantioneaza(can, rata, 44100, can.length); rata = 44100; }
            const k = Number(kbps.valoare());
            const date = await ocupat(`Se codează MP3 (${k} kbps)…`, (pr) => codMp3(can, rata, k, pr));
            blob = new Blob([date], { type: 'audio/mpeg' });
          } else if (format === 'wav') {
            const r2 = rataW.valoare() === 'orig' ? rata : Number(rataW.valoare());
            can = await reesantioneaza(can, rata, r2, can.length);
            blob = new Blob([codWav(can, r2)], { type: 'audio/wav' });
          } else {
            blob = await ocupat('Se codează OGG/WebM (în timp real)…', (pr) => codWebm(can, rata, webm, pr));
          }
          const fis = `${(nume.value.trim() || 'sunet').replace(/[\\/:*?"<>|]/g, '_')}${ext.textContent}`;
          descarca(fis, blob);
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(blob);
          umple(asculta, h('p', {}, `✓ Am salvat „${fis}” (${marime(blob.size)}) în Descărcări. Ascultă fișierul salvat:`), h('audio', { controls: true, src: url }));
        } catch (e) {
          console.warn(e);
          toast('Salvarea nu a reușit. Încearcă alt format.', 'error');
        } finally { el.disabled = false; }
        return false;
      };
      calc();
      await dialog('Salvare fișier ca', [
        h('label', { class: 'ap-audio-gl' }, h('span', {}, 'Numele fișierului'), nume, ext),
        h('div', { class: 'ap-audio-opts trei', role: 'radiogroup', 'aria-label': 'Formatul' }, radios),
        kbps, canale, rataW, estimare,
        eMix() ? h('p', { class: 'ap-audio-expl mic' }, 'Toate pistele care se aud (fără Mute) se amestecă într-un singur fișier.') : null,
        asculta],
      [{ t: 'Închide', v: null }, { t: 'Salvează', p: true, verifica: exporta }], { ico: 'salveazaCa' });
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    // OGG/WebM: browserul codează sunetul redat (în tăcere) printr-un MediaRecorder.
    function codWebm(canale, rata, mime, pr) {
      return new Promise((res, rej) => {
        const c = ctxAudio();
        const dest = c.createMediaStreamDestination();
        const b = c.createBuffer(canale.length, canale[0].length, rata);
        canale.forEach((x, i) => b.copyToChannel(x, i));
        const src = c.createBufferSource();
        src.buffer = b;
        src.connect(dest);
        const rec = new MediaRecorder(dest.stream, { mimeType: mime });
        const bucati = [];
        rec.ondataavailable = (e) => { if (e.data.size) bucati.push(e.data); };
        rec.onstop = () => res(new Blob(bucati, { type: mime.split(';')[0] }));
        rec.onerror = rej;
        const t0 = c.currentTime, dur = b.duration;
        const ti = setInterval(() => pr((c.currentTime - t0) / dur), 250);
        src.onended = () => { clearInterval(ti); setTimeout(() => rec.stop(), 150); };
        rec.start();
        src.start();
      });
    }

    // ---------- Lucrarea pentru sarcină: WAV mono 16 kHz, cel mult 60 s ----------
    async function lucrare() {
      if (!areContinut()) throw new Error('Încă nu ai niciun sunet. Înregistrează sau deschide un fișier.');
      oprireRedare();
      const s = await canaleActive();
      let [m] = await reesantioneaza(s.canale, s.rata, SARCINA_RATA, 1);
      const max = SARCINA_SEC * SARCINA_RATA;
      if (m.length > max) {
        const ok = await dialog('Sunetul e prea lung', h('p', {}, `Sunetul tău are ${nr(m.length / SARCINA_RATA, 1)} s. La sarcină se pot preda cel mult ${SARCINA_SEC} de secunde, așa că se vor trimite doar primele ${SARCINA_SEC} s. Continui?`),
          [{ t: 'Nu, îl scurtez eu', v: false }, { t: 'Predă primele 60 s', v: true, p: true }]);
        if (!ok) throw new Error(`Predare anulată. Scurtează sunetul la cel mult ${SARCINA_SEC} s (selectează și apasă Trunchiere).`);
        m = m.slice(0, max);
      }
      return { titlu: D.titlu, tip: 'audio', date: `data:audio/wav;base64,${base64(codWav([m], SARCINA_RATA))}`, durata: Math.round(m.length / SARCINA_RATA * 10) / 10 };
    }

    function ajutor() {
      const r = (k, t) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, t));
      dialog('Ajutor – Editor audio', [
        h('p', {}, 'Ca în WavePad: alegi o filă (Acasă, Editare, Nivel, Efecte, Curățare, Instrumente), selectezi pe forma de undă și apeși butonul dorit. Pentru mai multe surse (voce, muzică, efecte) folosește fila Multipistă.'),
        h('table', { class: 'ap-audio-taste-t' }, r('Spațiu', 'Redare / Pauză (și oprirea înregistrării)'), r('Ctrl+X / C / V', 'Decupare / Copiere / Lipire'), r('Ctrl+Shift+V', 'Lipire combinată'),
          r('Delete', 'Ștergere selecție (sau clip, în multipistă)'), r('Ctrl+T', 'Trunchiere'), r('Ctrl+A', 'Selectare totală'), r('Ctrl+Z / Ctrl+Y', 'Anulare / Refacere'),
          r('M', 'Marcaj la cursor'), r('S', 'Împărțire clip (multipistă)'), r('Home / End', 'La început / la sfârșit'), r('← →', 'Mută cursorul (Shift = mai mult)'),
          r('Ctrl+rotiță', 'Mărire / micșorare'), r('Shift+clic', 'Extinde selecția'), r('Ctrl+S / Ctrl+O', 'Salvare / Deschidere')),
      ], undefined, { lat: true, ico: 'ajutor' });
    }

    // ---------- Scurtături de tastatură ----------
    document.addEventListener('keydown', (e) => {
      if (!app.isConnected || dlgDeschis || meniuDeschis || !D) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      let fn = null;
      if (k === ' ' && !ctrl) fn = comutaRedare;
      else if (S.inreg) return;
      else if (ctrl && k === 'z') fn = e.shiftKey ? refacere : anulare;
      else if (ctrl && k === 'y') fn = refacere;
      else if (ctrl && k === 's') fn = () => salveazaDoc(D, true);
      else if (ctrl && k === 'o') fn = () => deschideFisiere();
      else if (!ctrl && k === 'home') fn = () => mutaCursorGen(0);
      else if (!ctrl && k === 'end') fn = () => mutaCursorGen(Infinity);
      else if (!ctrl && (k === '+' || k === '=')) fn = () => zoomGen(0.5);
      else if (!ctrl && k === '-') fn = () => zoomGen(2);
      else if (eMix()) {
        if (!ctrl && (k === 'delete' || k === 'backspace')) fn = stergeClip;
        else if (!ctrl && k === 's') fn = imparteClip;
        else if (!ctrl && (k === 'arrowleft' || k === 'arrowright')) fn = () => mutaCursorGen(D.cursor + (k === 'arrowleft' ? -1 : 1) * (e.shiftKey ? 5 : 0.5));
      } else if (eSunet()) {
        if (ctrl && k === 'x') fn = decupare;
        else if (ctrl && k === 'c') fn = copiere;
        else if (ctrl && k === 'v') fn = e.shiftKey ? lipireCombinata : lipire;
        else if (ctrl && k === 'a') fn = () => selecteaza(0, n());
        else if (ctrl && k === 't') fn = trunchiere;
        else if (!ctrl && (k === 'delete' || k === 'backspace')) fn = stergere;
        else if (!ctrl && k === 'm') fn = () => adaugaMarcaj(false);
        else if (!ctrl && k === 'escape') fn = () => { D.sel = null; deseneazaOv(); actualizeaza(); };
        else if (!ctrl && (k === 'arrowleft' || k === 'arrowright')) fn = () => mutaCursor(D.cursor + (k === 'arrowleft' ? -1 : 1) * Math.max(1, D.spp * (e.shiftKey ? 50 : 10)));
      }
      if (!fn) return;
      e.preventDefault();
      if (t && t.tagName === 'BUTTON') t.blur();
      fn();
    }, sig);

    // ---------- Pornire ----------
    laIesire = () => {
      ac.abort();
      oprireRedare();
      oprestePreviz();
      cancelAnimationFrame(rafAnim);
      if (S.inreg) opresteInreg(false);
      for (const d of S.docs) if (d.tSalv) salveazaDoc(d);
    };
    window.addEventListener('beforeunload', () => { for (const d of S.docs) if (d.tSalv) salveazaDoc(d); }, sig);
    const primul = docSunet({ titlu: await numeLiber('Sunet nou') });
    S.docs.push(primul);
    deseneazaPanglica();
    activeaza(primul);
    potriveste();
  }
})();

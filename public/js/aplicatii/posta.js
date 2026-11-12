'use strict';
// Poștă electronică (simulator) pentru clasa a VI-a: o căsuță care arată și se poartă ca Gmail
// (interfața în română), cu aspect „Outlook” la alegere din Setări. Elevul își alege o adresă fictivă;
// mesajele, contactele, etichetele, setările și misiunile se păstrează în browser
// (IndexedDB, cu localStorage de rezervă). Nimic nu pleacă din calculator.
(() => {
  const { show, routes } = window.EduApp;
  const h = (tag, attrs, ...c) => window.EduApp.h(tag, attrs, ...c.flat(Infinity));
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-posta', ST = 'cutii', LS = 'edudigi_posta_cutie', CHEIE = 'cutie';
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
    async get() {
      if (await areIDB()) return tx('readonly', (s) => s.get(CHEIE));
      try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; }
    },
    async put(c) { if (await areIDB()) return tx('readwrite', (s) => s.put({ ...c, id: CHEIE })); localStorage.setItem(LS, JSON.stringify(c)); },
    async del() { if (await areIDB()) return tx('readwrite', (s) => s.delete(CHEIE)); localStorage.removeItem(LS); },
  };

  // ---------- Utilitare ----------
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const MB = 1024 * 1024;
  const marime = (b) => (b >= MB ? `${(b / MB).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  // Numerale ca în română: 1 minut, 5 minute, 20 de minute
  const nr = (n, unu, multe) => (n === 1 ? `1 ${unu}` : `${n} ${n % 100 === 0 || n % 100 >= 20 ? 'de ' : ''}${multe}`);
  const oraScurta = (t) => {
    const d = new Date(t), azi = new Date();
    if (d.toDateString() === azi.toDateString()) return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    if (d.getFullYear() === azi.getFullYear()) return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('ro-RO');
  };
  const dataLunga = (t) => new Date(t).toLocaleString('ro-RO', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const relativ = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'acum câteva secunde';
    if (s < 3600) return `acum ${nr(Math.floor(s / 60), 'minut', 'minute')}`;
    if (s < 86400) return `acum ${nr(Math.floor(s / 3600), 'oră', 'ore')}`;
    return `acum ${nr(Math.floor(s / 86400), 'zi', 'zile')}`;
  };
  const dataMesaj = (t) => `${new Date(t).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${relativ(t)})`;
  const unice = (a) => [...new Set(a.map((x) => x.toLowerCase()))];
  const svg = (d, cls = 'ap-posta-ico') => h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>` });
  const I = {
    primite: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    stea: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    ceas: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M5 3L2 6M22 6l-3-3"/>',
    important: '<path d="M3 6h12l5 6-5 6H3l4-6z"/>',
    trimise: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    ciorne: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
    spam: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16v.5"/>',
    sterse: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    toate: '<path d="M4 9h16v11H4z"/><path d="M4 9l8 6 8-6M7 5h10"/>',
    arhiveaza: '<path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8"/><path d="M12 11v6M9 14l3 3 3-3"/>',
    dosar: '<path d="M3 6h7l2 2h9v11H3z"/>',
    eticheta: '<path d="M4 6h11l5 6-5 6H4z"/>',
    scrie: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    cauta: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    filtru: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    agrafa: '<path d="M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L14 7"/>',
    raspunde: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 016 6v1"/>',
    toti: '<path d="M8 7l-5 5 5 5"/><path d="M12 7l-5 5 5 5"/><path d="M7 12h8a6 6 0 016 6v1"/>',
    redir: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 00-6 6v1"/>',
    restaureaza: '<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>',
    necitit: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    citit: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M3 10l9 6 9-6"/>',
    actualizeaza: '<path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 4v5h-5"/>',
    agenda: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 016 5"/>',
    promo: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    misiuni: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    salveaza: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    inchide: '<path d="M6 6l12 12M18 6L6 18"/>',
    inapoi: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    stanga: '<path d="M15 6l-6 6 6 6"/>',
    dreapta: '<path d="M9 6l6 6-6 6"/>',
    jos: '<path d="M7 10l5 5 5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    bifa: '<path d="M5 12l5 5 9-10"/>',
    pericol: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    listaNum: '<path d="M10 6h11M10 12h11M10 18h11M4 4h1v5M3.5 14h2.5l-2.5 4h2.5"/>',
    citat: '<path d="M5 18l2-6H5V6h6v6l-2 6zM14 18l2-6h-2V6h6v6l-2 6z"/>',
    faraFormat: '<path d="M6 5h12M12 5l-3 14M4 20L20 4"/>',
    culoare: '<path d="M6 16l6-12 6 12M8.3 12h7.4"/><path d="M4 20.5h16" stroke-width="3"/>',
    anuleaza: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    refa: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    emoji: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 008 0M9 9.5v.5M15 9.5v.5"/>',
    semnatura: '<path d="M3 21c2.5-.8 3.5-3.5 6-3.5s2 2.5 4.5 2.5 3.5-1.5 7.5-2.5"/><path d="M14 3.5l3.5 3.5L10 14.5H6.5V11z"/>',
    puncte: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    meniu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    setari: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    ajutor: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 4M12 17v.5"/>',
    mareste: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    micsoreaza: '<path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7"/>',
    linie: '<path d="M6 17h12"/>',
    fisier: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
    imprima: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    imagine: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
    lacat: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    iesire: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  };
  function descarca(nume, continut, tip) {
    const url = URL.createObjectURL(new Blob([continut], { type: tip }));
    const a = h('a', { href: url, download: nume });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- Text formatat: doar etichete sigure (CSP blochează style="") ----------
  const PERMISE = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'BLOCKQUOTE', 'A', 'SPAN', 'FONT']);
  const FONTURI = ['sans-serif', 'serif', 'monospace', 'arial', 'georgia', 'verdana', 'comic sans ms'];
  function curataNoduri(src) {
    const out = [];
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { out.push(document.createTextNode(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(tag)) continue;
      const copii = curataNoduri(n);
      if (!PERMISE.has(tag)) { out.push(...copii); continue; }
      const el = document.createElement(tag.toLowerCase());
      if (tag === 'A') { const href = n.getAttribute('href') || n.getAttribute('data-href') || ''; if (/^https?:\/\//i.test(href)) el.setAttribute('href', href); }
      if (tag === 'FONT') {
        const sz = n.getAttribute('size'), cl = n.getAttribute('color'), fa = (n.getAttribute('face') || '').toLowerCase();
        if (/^[1-7]$/.test(sz || '')) el.setAttribute('size', sz);
        if (/^#[0-9a-f]{3,6}$/i.test(cl || '')) el.setAttribute('color', cl);
        if (FONTURI.includes(fa)) el.setAttribute('face', fa);
      }
      el.append(...copii);
      out.push(el);
    }
    return out;
  }
  const parseaza = (html) => curataNoduri(new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html').body);
  const curataHTML = (html) => { const d = document.createElement('div'); d.append(...parseaza(html)); return d.innerHTML; };
  function htmlLaText(html) {
    let t = '';
    const mers = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { t += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        const tag = c.tagName;
        if (tag === 'BR') { t += '\n'; continue; }
        const bloc = ['P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE'].includes(tag);
        if (bloc && t && !t.endsWith('\n')) t += '\n';
        if (tag === 'LI') t += '• ';
        if (tag === 'BLOCKQUOTE') { const vechi = t; t = ''; mers(c); t = vechi + t.split('\n').map((r) => `> ${r}`).join('\n'); }
        else mers(c);
        if (bloc && !t.endsWith('\n')) t += '\n';
      }
    };
    mers(new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html').body);
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Textul scurt din listă (fără citatul răspunsului)
  const fragment = (x) => htmlLaText((x.html || '').split(/<blockquote|---------- Mesaj redirecționat/)[0]).replace(/\s+/g, ' ').slice(0, 140);

  // ---------- Adrese ----------
  const DOMENIU = 'edumail.ro';
  const RE_ADRESA = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
  const imparte = (s) => (s || '').split(/[;,]/).map((x) => { const m = /<([^>]+)>/.exec(x); return (m ? m[1] : x).trim(); }).filter(Boolean);
  function deCeGresita(a) {
    if (/\s/.test(a)) return 'are un spațiu';
    const n = (a.match(/@/g) || []).length;
    if (n === 0) return 'lipsește caracterul @';
    if (n > 1) return 'are mai multe caractere @';
    if (/[^\x00-\x7F]/.test(a)) return 'are diacritice (ă, î, ș…), care nu se folosesc în adrese';
    const [nume, gazda] = a.split('@');
    if (!nume) return 'lipsește numele dinaintea lui @';
    if (!gazda || !gazda.includes('.')) return 'lipsește domeniul după @ (de exemplu .ro sau .com)';
    if (a.includes('..')) return 'are două puncte unul după altul';
    return 'nu are forma nume@gazdă.domeniu';
  }
  const eValida = (a) => RE_ADRESA.test(a) && !a.includes('..');

  // ---------- Lumea simulată: persoane, mesaje pregătite ----------
  const P = {
    tic: { nume: 'Elena Marinescu (Profesoara de TIC)', adresa: 'elena.marinescu@scoala-edu.ro', grup: 'Profesori' },
    dir: { nume: 'Maria Ionescu (Diriginta)', adresa: 'maria.ionescu@scoala-edu.ro', grup: 'Profesori' },
    muz: { nume: 'Doru Vasilescu (Profesorul de muzică)', adresa: 'doru.vasilescu@scoala-edu.ro', grup: 'Profesori' },
    bunica: { nume: 'Bunica Ileana', adresa: 'bunica.ileana@edumail.ro', grup: 'Familie' },
    mama: { nume: 'Mama', adresa: 'mama.acasa@edumail.ro', grup: 'Familie' },
    andrei: { nume: 'Andrei Matei', adresa: 'andrei.matei@edumail.ro', grup: 'Colegi' },
    ioana: { nume: 'Ioana Radu', adresa: 'ioana.radu@edumail.ro', grup: 'Colegi' },
    mihai: { nume: 'Mihai Stan', adresa: 'mihai.stan@edumail.ro', grup: 'Colegi' },
    sara: { nume: 'Sara Dinu', adresa: 'sara.dinu@edumail.ro', grup: 'Colegi' },
    robotica: { nume: 'Clubul de robotică', adresa: 'club.robotica@scoala-edu.ro', grup: 'Școală' },
  };
  const ALTE_NUME = {
    'secretariat@scoala-edu.ro': 'Secretariatul școlii', 'parinti.clasa6@edumail.ro': 'Comitetul de părinți',
    'echipa@edumail.ro': 'Echipa EduMail', 'newsletter@biblioteca-judeteana.ro': 'Biblioteca Județeană', 'mailer-daemon@edumail.ro': 'Sistemul de e-mail',
    'notificari@platforma-scolii.ro': 'Platforma școlii', 'oferte@libraria-paginilor.ro': 'Librăria Paginilor', 'noutati@jocuri-logice.ro': 'Jocuri Logice',
  };
  const PHISHING = ['securitate@edumai1-suport.com', 'castigator@premii-gratis-ro.top', 'andrei.matei.poze@mail-rapid.click'];
  const COLEGI = [P.andrei, P.ioana, P.mihai, P.sara].map((p) => p.adresa);
  const DOMENII_CUNOSCUTE = ['edumail.ro', 'scoala-edu.ro'];
  // Categoriile din Mesaje primite și mesajele marcate „Important” de la început
  const CATEGORII = { 'm-newsletter': 'promotii', 'm-promo-jocuri': 'promotii', 'm-social-foto': 'sociale' };
  const IMPORTANTE = ['m-tema', 'm-excursie', 'm-bunica', 'm-phishing1'];

  function mesajePregatite(eu, prenume) {
    const acum = Date.now(), min = 60e3, ora = 60 * min, zi = 24 * ora;
    const m = (id, de, inainte, subiect, html, extra = {}) => ({ id, dosar: 'primite', de, catre: [eu], cc: [], cci: [], subiect, html, atasamente: [], data: acum - inainte, citit: false, important: false, ...extra });
    return [
      m('m-bun-venit', { nume: 'Echipa EduMail', adresa: 'echipa@edumail.ro' }, 4 * min, 'Bun venit în căsuța ta EduMail!',
        `<p>Bună, ${esc(prenume)}!</p><p>Aceasta este căsuța ta de <b>poștă electronică</b>. Este un <b>simulator</b>: mesajele nu pleacă pe internet, dar totul funcționează ca în Gmail (iar din <b>Setări</b> o poți face să arate ca Outlook).</p><p>Ce poți face aici:</p><ul><li>citești mesajele din <b>Mesaje primite</b>, împărțite în <b>Principale</b>, <b>Promoții</b> și <b>Rețele sociale</b>;</li><li>scrii mesaje noi cu <b>Scrie</b>, cu <b>Către</b>, <b>Cc</b>, <b>Cci</b> și <b>Subiect</b>;</li><li>folosești <b>Răspunde</b>, <b>Răspunde tuturor</b> și <b>Redirecționează</b>;</li><li>arhivezi, amâni și pui <b>etichete</b> pe mesaje;</li><li>rezolvi <b>Misiunile</b> (butonul din dreapta sus).</li></ul><p>Atenție: printre mesaje s-au strecurat și câteva <b>înșelătorii</b>. Le găsești?</p><p>Spor la treabă!<br>Echipa EduMail</p>`, { citit: true }),
      m('m-phishing3', { nume: 'Andrei Matei', adresa: 'andrei.matei.poze@mail-rapid.click' }, 32 * min, 'uite pozele de la excursie!!!',
        '<p>salut, uite pozele de la excursie</p><p>deschide repede fisierul ca sa le vezi pe toate, sunt super tari!!!</p>',
        { atasamente: [{ nume: 'poze_excursie.exe', marime: 2.3 * MB }], phishing: true,
          indicii: ['Numele afișat este „Andrei Matei”, dar adresa reală este andrei.matei.poze@mail-rapid.click, nu adresa lui Andrei din agendă.', 'Pozele nu vin niciodată ca fișier .exe: un .exe este un program, care poate fi un virus.', 'Te grăbește („deschide repede”) și nu spune nimic personal.'] }),
      m('m-tema', P.tic, 2 * ora, 'Tema la TIC: reguli de siguranță pe internet',
        `<p>Dragă ${esc(prenume)},</p><p>Îți trimit în <b>atașament</b> fișa de lucru pentru tema de săptămâna aceasta. O poți deschide direct aici, cu un clic pe ea.</p><ol><li>Citește fișa și rezolv-o.</li><li>Apasă <b>Răspunde</b> la acest mesaj (nu scrie un mesaj nou).</li><li>Atașează tema rezolvată cu butonul cu <b>agrafa</b>.</li></ol><p>Termen: <b>vineri</b>. Nu uita de o formulă de salut și de semnătură!</p><p>Cu drag,<br>prof. Elena Marinescu</p>`,
        { atasamente: [{ nume: 'Fisa-de-lucru-siguranta.pdf', marime: 312 * 1024 }], important: true }),
      m('m-phishing1', { nume: 'Echipa de securitate EduMail', adresa: 'securitate@edumai1-suport.com' }, 3 * ora, 'URGENT: Contul tău va fi închis în 24 de ore!',
        '<p>Stimate utilizator,</p><p>Am detectat o <b>activitate neobișnuită</b> în contul tău. Dacă nu îți confirmi parola în următoarele <b>24 de ore</b>, contul va fi <b>închis definitiv</b> și vei pierde toate mesajele.</p><p>Apasă aici pentru verificare: <a href="http://edumail-verificare-cont.xyz/login">www.edumail.ro/verificare-cont</a></p><p>Vă mulțumim,<br>Departamentul de Securitate</p>',
        { phishing: true, indicii: ['Adresa expeditorului este edumai1-suport.com: cu cifra 1 în loc de litera l. Nu este edumail.ro.', 'Linkul arată „www.edumail.ro”, dar duce de fapt la edumail-verificare-cont.xyz (ține mouse-ul deasupra și citește jos).', 'Te sperie și te grăbește („24 de ore”, „închis definitiv”).', 'Nicio firmă serioasă nu îți cere parola pe e-mail.'] }),
      m('m-excursie', P.dir, 5 * ora, 'Excursie la Muzeul Satului – cine vine?',
        `<p>Dragi elevi,</p><p>Sâmbătă, <b>22 noiembrie</b>, mergem în excursie la <b>Muzeul Satului</b>. Plecăm la ora 9:00 din fața școlii.</p><p>Vă rog să răspundeți la acest mesaj cu <b>Răspunde tuturor</b> până miercuri, ca să știe și colegii, și comitetul de părinți cine vine.</p><p>Doamna secretară și părinții sunt în Cc, ca să afle și ei.</p><p>Diriginta,<br>Maria Ionescu</p>`,
        { catre: [eu, P.andrei.adresa, P.ioana.adresa, P.mihai.adresa, P.sara.adresa], cc: ['secretariat@scoala-edu.ro', 'parinti.clasa6@edumail.ro'] }),
      m('m-phishing2', { nume: 'Premii Gratuite', adresa: 'castigator@premii-gratis-ro.top' }, 8 * ora, '🎁 FELICITĂRI!!! Ai câștigat o tabletă nouă!',
        '<p><b>FELICITĂRI!!!</b> Adresa ta a fost aleasă câștigătoare la marea tombolă!</p><p>Ca să primești <b>TABLETA GRATUITĂ</b>, completează <b>numele, adresa de acasă și parola</b> contului tău pe pagina noastră. Oferta expiră în <b>10 minute</b>!</p><p><a href="http://premiu-tableta-gratis.top/revendica">REVENDICĂ PREMIUL ACUM</a></p>',
        { phishing: true, indicii: ['Nu te-ai înscris la nicio tombolă: nu ai cum să câștigi.', 'Adresa expeditorului (premii-gratis-ro.top) este a unui site necunoscut.', 'Îți cere date personale și parola.', 'Îți dă doar 10 minute ca să nu ai timp să te gândești sau să întrebi un adult.'] }),
      m('m-bunica', P.bunica, 26 * ora, 'Te invit la ziua mea! 🎂',
        `<p>Dragă ${esc(prenume)},</p><p>Duminică, la ora 13, fac 70 de ani și vreau să sărbătorim împreună, la mine acasă. Îți trimit invitația în atașament.</p><p>Dacă vrei, <b>trimite-i invitația și prietenului tău cel mai bun</b> de la școală: e și el binevenit! Fac plăcintă cu mere.</p><p>Te pup,<br>Bunica</p>`,
        { atasamente: [{ nume: 'invitatie-ziua-bunicii.jpg', marime: 1.8 * MB }] }),
      m('m-newsletter', { nume: 'Biblioteca Județeană', adresa: 'newsletter@biblioteca-judeteana.ro' }, 27 * ora, 'Noutăți în noiembrie: atelier de benzi desenate',
        '<p><b>Noutăți la Biblioteca Județeană</b></p><ul><li>Sâmbătă, ora 11: <b>atelier de benzi desenate</b> pentru copii de 10–14 ani;</li><li>50 de cărți noi la secția pentru copii;</li><li>Club de lectură: „Micul Prinț”.</li></ul><p>Programul complet: <a href="https://www.biblioteca-judeteana.ro/program">www.biblioteca-judeteana.ro/program</a></p><p>Primești acest mesaj pentru că te-ai abonat la noutățile bibliotecii. Te poți dezabona oricând.</p>',
        { citit: true, atasamente: [{ nume: 'Program-atelier-BD.pdf', marime: 184 * 1024 }] }),
      m('m-andrei', P.andrei, 29 * ora, 'Proiectul la Geografie',
        '<p>Salut!</p><p>Am terminat partea mea din proiect (râurile Europei). Îmi trimiți și tu harta până joi, ca s-o pun în prezentare?</p><p>Mersi!<br>Andrei</p>', { citit: true }),
      m('m-ioana', P.ioana, 2 * zi, 'Ai notițele de la Română?',
        '<p>Bună!</p><p>Ieri am lipsit de la ora de română. Poți să-mi scrii ce am avut de citit pentru data viitoare?</p><p>Mulțumesc mult,<br>Ioana</p>', { citit: true }),
      m('m-robotica', P.robotica, 2 * zi + 4 * ora, 'Clubul de robotică: întâlnire joi, ora 15',
        '<p>Salutare, roboticieni!</p><p>Ne vedem <b>joi, la ora 15</b>, în laboratorul de informatică. Construim primul robot care ocolește obstacole.</p><p>Aduceți: caiet, pix și multă curiozitate.</p>', { catre: [], cci: [eu], citit: true }),
      m('m-serbare', P.muz, 3 * zi, 'Repetiție pentru serbarea de Crăciun',
        '<p>Dragi copii,</p><p>Repetiția pentru <b>serbarea de Crăciun</b> este marți, după ore, în sala festivă. Învățați versurile colindului „O, brad frumos”.</p><p>Prof. Doru Vasilescu</p>', { citit: true }),
      m('m-spam1', { nume: 'Super Reduceri', adresa: 'oferte@super-reduceri.biz' }, 2 * zi + 9 * ora, 'Slăbește 10 kg în 3 zile cu ceaiul minune!!!',
        '<p>OFERTĂ UNICĂ!!! Ceaiul minune care te face să slăbești 10 kg în 3 zile! Comandă acum cu 90% reducere!!!</p>', { dosar: 'spam', citit: true }),
      ...mesajeV2(eu),
    ];
  }
  // Mesaje adăugate în versiunea a doua (și în căsuțele vechi, la migrare)
  function mesajeV2(eu) {
    const acum = Date.now(), ora = 3600e3;
    const m = (id, de, inainte, subiect, html, extra = {}) => ({ id, dosar: 'primite', de, catre: [eu], cc: [], cci: [], subiect, html, atasamente: [], data: acum - inainte, citit: false, important: false, ...extra });
    return [
      m('m-promo-jocuri', { nume: 'Jocuri Logice', adresa: 'noutati@jocuri-logice.ro' }, 20 * ora, 'Puzzle-ul săptămânii: turnurile din Hanoi 🧩',
        '<p><b>Puzzle-ul săptămânii</b></p><p>Mută toate discurile pe a treia tijă, fără să pui un disc mare peste unul mic. Câte mutări îți trebuie pentru 4 discuri?</p><p>Joacă gratuit pe <a href="https://www.jocuri-logice.ro/hanoi">www.jocuri-logice.ro/hanoi</a></p><p>Ai primit acest mesaj pentru că te-ai abonat la noutăți. <a href="https://www.jocuri-logice.ro/dezabonare">Dezabonează-te</a></p>', { citit: true }),
      m('m-social-foto', { nume: 'Platforma școlii', adresa: 'notificari@platforma-scolii.ro' }, 30 * ora, 'Clubul de robotică a publicat 3 fotografii noi',
        '<p>Clubul de robotică a publicat <b>3 fotografii noi</b> în albumul „Primul nostru robot”.</p><p><a href="https://www.platforma-scolii.ro/albume/robotica">Vezi albumul</a></p><p>Primești acest mesaj pentru că ești membru al grupului „Clubul de robotică”.</p>', { citit: true }),
    ];
  }
  // Mesaje care sosesc în timp ce elevul lucrează (o singură dată pe căsuță)
  const SOSIRI = [
    { id: 's-sara', dupa: 40e3, mesaj: (eu, pr) => ({ de: P.sara, subiect: 'Afișul pentru serbare 🎄', html: `<p>Bună, ${esc(pr)}!</p><p>Am terminat afișul pentru <b>serbare</b>. Ți l-am pus în atașament: îl poți deschide direct aici, fără să-l descarci.</p><p>Îți place? Spune-mi sincer! 😊</p><p>Sara</p>`, atasamente: [{ nume: 'afis-serbare.png', marime: 1.1 * MB }] }) },
    { id: 's-social', dupa: 80e3, mesaj: () => ({ de: { nume: 'Platforma școlii', adresa: 'notificari@platforma-scolii.ro' }, subiect: 'Mihai Stan a comentat la fotografia clasei', html: '<p><b>Mihai Stan</b> a comentat la fotografia „Clasa a VI-a la Ziua Școlii”:</p><blockquote>Ce frumos a ieșit! 📸</blockquote><p><a href="https://www.platforma-scolii.ro/foto/ziua-scolii">Vezi comentariul</a></p>', categorie: 'sociale' }) },
    { id: 's-promo', dupa: 125e3, mesaj: () => ({ de: { nume: 'Librăria Paginilor', adresa: 'oferte@libraria-paginilor.ro' }, subiect: '-20% la cărțile de aventuri, doar weekendul acesta 📚', html: '<p><b>Weekendul aventurii la Librăria Paginilor!</b></p><p>Toate cărțile de aventuri au <b>20% reducere</b> până duminică.</p><p><a href="https://www.libraria-paginilor.ro/aventura">Vezi cărțile</a></p><p>Nu mai vrei aceste mesaje? <a href="https://www.libraria-paginilor.ro/dezabonare">Dezabonează-te</a></p>', categorie: 'promotii' }) },
    { id: 's-tic2', dupa: 180e3, mesaj: (eu, pr) => ({ de: P.tic, subiect: 'Fă ordine în căsuța ta de e-mail', html: `<p>Dragă ${esc(pr)},</p><p>O căsuță ordonată te ajută să găsești repede mesajele. Încearcă:</p><ul><li><b>Arhivează</b> mesajele citite de care nu mai ai nevoie în Mesaje primite;</li><li>creează o <b>etichetă</b> (de exemplu <b>Școală</b>) și pune-o pe mesajele de la profesori;</li><li>din <b>Setări</b> → <b>Vezi toate setările</b>, scrie-ți o <b>semnătură</b>.</li></ul><p>Prof. Elena Marinescu</p>`, importantMarcaj: true }) },
  ];

  const MISIUNI = [
    { id: 'tema', titlu: 'Răspunde profesoarei de TIC și atașează tema', cum: 'Deschide mesajul „Tema la TIC”, apasă Răspunde, scrie câteva rânduri și atașează un fișier cu agrafa.', dece: 'Cu Răspunde, adresa expeditorului și subiectul (cu Re: în față) se completează singure. Atașamentul primit nu se trimite înapoi: îl adaugi tu pe al tău.' },
    { id: 'excursie', titlu: 'Răspunde tuturor la mesajul dirigintei', cum: 'Deschide „Excursie la Muzeul Satului” și apasă Răspunde tuturor.', dece: 'Răspunsul pleacă la expeditor și la toți cei din Către și Cc. Folosește-l doar când chiar trebuie să afle toți.' },
    { id: 'invitatie', titlu: 'Redirecționează invitația bunicii unui coleg', cum: 'Deschide invitația bunicii, apasă Redirecționează și scrie la Către adresa unui coleg (sau alege-l din sugestii).', dece: 'La redirecționare câmpul Către e gol, subiectul primește Fwd:, iar atașamentele merg mai departe. Bunica ți-a dat voie; altfel, întreabă înainte să redirecționezi un mesaj personal.' },
    { id: 'cci', titlu: 'Trimite un mesaj cu o adresă în Cci', cum: 'În fereastra Mesaj nou apasă Cci (în dreapta câmpului Către) și scrie acolo o adresă.', dece: 'Cei din Cci (copie invizibilă) primesc mesajul, dar ceilalți destinatari nu le văd adresele. E util când scrii multor oameni care nu se cunosc între ei.' },
    { id: 'phishing', titlu: 'Raportează toate cele 3 mesaje înșelătoare', cum: 'Caută mesajele suspecte (adresă ciudată, grabă, premii, fișier .exe), deschide-le și apasă Raportează spam sau ⋮ → Raportează phishing.', dece: 'Phishingul („pescuitul” de date) încearcă să-ți fure parola sau datele. Verifică adresa reală a expeditorului, nu doar numele afișat.', total: 3 },
    { id: 'contact', titlu: 'Adaugă un contact nou în agendă', cum: 'Deschide Agenda (pictograma cu persoane din dreapta) → Contact nou, sau apasă „Adaugă la contacte” lângă expeditorul unui mesaj.', dece: 'Din agendă alegi destinatarul fără greșeli de tastare.' },
    { id: 'restaurare', titlu: 'Șterge un mesaj și recuperează-l din Coș de gunoi', cum: 'Șterge un mesaj, deschide Coș de gunoi (sub „Mai multe”), deschide mesajul și apasă „Mută în Mesaje primite”.', dece: 'Mesajele șterse nu dispar imediat: stau în Coș de gunoi până golești coșul.' },
    { id: 'cautare', titlu: 'Găsește cu Căutarea mesajul despre „serbare”', cum: 'Scrie serbare în caseta de căutare, apasă Enter și deschide mesajul profesorului de muzică.', dece: 'Căutarea găsește mesaje după expeditor, subiect sau cuvinte din text: mult mai repede decât derulând lista. Încearcă și operatori, ca from: sau has:attachment.' },
    { id: 'arhivare', titlu: 'Arhivează un mesaj din Mesaje primite', cum: 'Treci cu mouse-ul peste un mesaj din listă și apasă pictograma Arhivează (cutia cu săgeată), sau deschide-l și apasă Arhivează.', dece: 'Arhivarea scoate mesajul din Mesaje primite fără să-l șteargă: îl găsești oricând în Toate mesajele sau cu Căutarea.' },
    { id: 'eticheta', titlu: 'Creează o etichetă și pune-o pe un mesaj', cum: 'Apasă + lângă Etichete (Creează o etichetă nouă), apoi deschide un mesaj și alege eticheta din butonul Etichetează.', dece: 'Etichetele sunt ca niște dosare, dar un mesaj poate avea mai multe etichete deodată. În Outlook se folosesc dosare (foldere).' },
    { id: 'atasament', titlu: 'Deschide un atașament în previzualizare', cum: 'Deschide un mesaj cu un atașament PDF sau imagine (de exemplu tema la TIC) și dă clic pe cardul atașamentului.', dece: 'Previzualizarea îți arată fișierul fără să-l descarci. Atenție: programele (.exe) nu se deschid niciodată așa!' },
    { id: 'semnatura', titlu: 'Creează-ți o semnătură și trimite un mesaj cu ea', cum: 'Setări (rotița) → Vezi toate setările → Semnătură. Scrie-ți numele, salvează, apoi trimite un mesaj nou.', dece: 'Semnătura se adaugă singură la sfârșitul mesajelor: numele tău, clasa, școala. Nu pune în ea date personale ca adresa de acasă sau numărul de telefon.' },
  ];
  const FISIERE_EXEMPLU = [
    { nume: 'Tema-siguranta-internet.docx', marime: 245 * 1024 },
    { nume: 'Harta-Europei.png', marime: 1.6 * MB },
    { nume: 'Prezentare-proiect.pptx', marime: 8.4 * MB },
    { nume: 'Poze-excursie.zip', marime: 14.2 * MB },
    { nume: 'Film-serbare.mp4', marime: 48 * MB },
  ];
  // Culorile etichetelor (ca paleta din Gmail)
  const CULORI = ['#FB4C2F', '#FFAD47', '#FAD165', '#16A766', '#43D692', '#4A86E8', '#A479E2', '#F691B3', '#2DA2BB', '#B99AFF'];
  const TXT = {
    gmail: { primite: 'Mesaje primite', stea: 'Cu stea', amanate: 'Amânate', importante: 'Importante', trimise: 'Trimise', ciorne: 'Mesaje nefinalizate', spam: 'Spam', sterse: 'Coș de gunoi', arhiva: 'Toate mesajele',
      scrie: 'Scrie', trimite: 'Trimite', raspuns: 'Răspunde', toti: 'Răspunde tuturor', redir: 'Redirecționează', arhiveaza: 'Arhivează', sterge: 'Șterge', etichete: 'Etichete', etichetaNoua: 'Creează o etichetă nouă',
      mutaIn: 'Mută în', eticheteaza: 'Etichetează', necitit: 'Marchează ca necitit', citit: 'Marchează ca citit', amana: 'Amână', spamBtn: 'Raportează spam', restaurare: 'Mută în Mesaje primite', stergeDef: 'Șterge definitiv', nuSpam: 'Nu este spam', golire: 'Golește coșul de gunoi acum' },
    outlook: { primite: 'Inbox', stea: 'Semnalizate', amanate: 'Amânate', importante: 'Importante', trimise: 'Elemente trimise', ciorne: 'Schițe', spam: 'E-mail nedorit', sterse: 'Elemente șterse', arhiva: 'Arhivă',
      scrie: 'Mesaj nou', trimite: 'Trimitere', raspuns: 'Răspundeți', toti: 'Răspundeți tuturor', redir: 'Redirecționați', arhiveaza: 'Arhivare', sterge: 'Ștergere', etichete: 'Foldere', etichetaNoua: 'Folder nou',
      mutaIn: 'Mutare în', eticheteaza: 'Clasificare', necitit: 'Marcare ca necitit', citit: 'Marcare ca citit', amana: 'Amânare', spamBtn: 'Raportare ca nedorit', restaurare: 'Restaurare', stergeDef: 'Ștergere definitivă', nuSpam: 'Nu este nedorit', golire: 'Golire folder' },
  };
  const DOSARE = [['primite', I.primite], ['stea', I.stea], ['amanate', I.ceas], ['importante', I.important], ['trimise', I.trimise], ['ciorne', I.ciorne]];
  const DOSARE_MAI_MULTE = [['spam', I.spam], ['sterse', I.sterse], ['arhiva', I.toate]];
  const DOSARE_REALE = ['primite', 'trimise', 'ciorne', 'spam', 'sterse', 'arhiva', 'amanate'];
  const SETARI_IMPLICITE = { densitate: 'prestabilita', tema: 'luminoasa', aspect: 'gmail', panou: 'fara', semnatura: '', semnaturaActiva: true, raspInteligente: true, anulare: 5, categorii: true,
    vacanta: { activ: false, subiect: 'Sunt în vacanță', mesaj: 'Bună! Sunt în vacanță și citesc mesajele când mă întorc. Mulțumesc!', doarAgenda: true, raspunsLa: [] } };

  function cutieNoua(prenume, nume, adresa) {
    const contacte = Object.values(P).map((p) => ({ id: idNou(), nume: p.nume, adresa: p.adresa, grup: p.grup }));
    return migreaza({ v: 1, prenume, nume, adresa, creat: Date.now(), mesaje: mesajePregatite(adresa, prenume), contacte, dosare: [], misiuni: {}, asteptare: [] });
  }
  // Căsuțele salvate de versiunea 1 se aduc la versiunea 2 fără să se piardă nimic.
  function migreaza(S) {
    S.setari = { ...SETARI_IMPLICITE, ...(S.setari || {}) };
    S.setari.vacanta = { ...SETARI_IMPLICITE.vacanta, ...(S.setari.vacanta || {}) };
    S.dosare = S.dosare || []; S.contacte = S.contacte || []; S.misiuni = S.misiuni || {}; S.asteptare = S.asteptare || []; S.sosite = S.sosite || {};
    S.dosare.forEach((d, i) => { if (!d.culoare) d.culoare = CULORI[(i + 5) % CULORI.length]; });
    const eticheta = (id) => S.dosare.some((d) => d.id === id);
    if ((S.v || 1) < 2) {
      const ids = new Set(S.mesaje.map((x) => x.id));
      if (ids.has('m-bun-venit')) for (const x of mesajeV2(S.adresa)) if (!ids.has(x.id)) S.mesaje.push(x);
      const nl = S.mesaje.find((x) => x.id === 'm-newsletter');
      if (nl && !nl.atasamente.length) nl.atasamente.push({ nume: 'Program-atelier-BD.pdf', marime: 184 * 1024 });
    }
    for (const x of S.mesaje) {
      x.etichete = x.etichete || []; x.cc = x.cc || []; x.cci = x.cci || []; x.catre = x.catre || []; x.atasamente = x.atasamente || [];
      // Dosarele create de elev devin etichete (mesajul „mutat” este arhivat și etichetat)
      if (eticheta(x.dosar)) { if (!x.etichete.includes(x.dosar)) x.etichete.push(x.dosar); x.dosar = 'arhiva'; }
      if (x.categorie == null) x.categorie = CATEGORII[x.id] || 'principale';
      if (x.importantMarcaj == null) x.importantMarcaj = IMPORTANTE.includes(x.id);
    }
    S.v = 2;
    return S;
  }

  // ---------- Conținutul atașamentelor (pentru previzualizare) ----------
  const svgImg = (s) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  const IMAGINI = {
    'invitatie-ziua-bunicii.jpg': svgImg(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560" font-family="Georgia, serif"><rect width="800" height="560" fill="#FFF3E0"/><rect x="24" y="24" width="752" height="512" rx="18" fill="none" stroke="#E2711D" stroke-width="6" stroke-dasharray="18 10"/><g fill="#F6C026"><circle cx="90" cy="90" r="10"/><circle cx="710" cy="100" r="12"/><circle cx="120" cy="470" r="8"/><circle cx="690" cy="460" r="10"/></g><text x="400" y="110" text-anchor="middle" font-size="46" fill="#A8326E" font-weight="bold">Te invit la ziua mea!</text><text x="400" y="160" text-anchor="middle" font-size="26" fill="#5B4B8A">Bunica Ileana împlinește 70 de ani</text><rect x="300" y="300" width="200" height="110" rx="12" fill="#F691B3"/><rect x="300" y="300" width="200" height="30" rx="10" fill="#fff"/><rect x="330" y="250" width="140" height="56" rx="10" fill="#FFAD47"/><g stroke="#4A86E8" stroke-width="8"><path d="M360 250v-34M400 250v-34M440 250v-34"/></g><g fill="#FB4C2F"><ellipse cx="360" cy="206" rx="7" ry="12"/><ellipse cx="400" cy="206" rx="7" ry="12"/><ellipse cx="440" cy="206" rx="7" ry="12"/></g><text x="400" y="460" text-anchor="middle" font-size="30" fill="#3E3A38">Duminică, ora 13:00 · la mine acasă</text><text x="400" y="500" text-anchor="middle" font-size="22" fill="#6B6460">Te aștept cu plăcintă cu mere!</text></svg>`),
    'afis-serbare.png': svgImg(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" font-family="Arial, sans-serif"><rect width="600" height="800" fill="#123A63"/><g fill="#fff" opacity=".8"><circle cx="60" cy="80" r="4"/><circle cx="520" cy="60" r="5"/><circle cx="300" cy="40" r="3"/><circle cx="140" cy="300" r="3"/><circle cx="480" cy="260" r="4"/><circle cx="80" cy="520" r="5"/><circle cx="540" cy="560" r="3"/></g><path d="M300 150l120 200h-60l100 160H140l100-160h-60z" fill="#16A766"/><rect x="275" y="510" width="50" height="60" fill="#8B5A2B"/><path d="M300 120l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="#FAD165"/><g fill="#FB4C2F"><circle cx="260" cy="300" r="10"/><circle cx="350" cy="400" r="10"/><circle cx="230" cy="460" r="10"/></g><g fill="#43D3FF"><circle cx="330" cy="250" r="9"/><circle cx="270" cy="400" r="9"/><circle cx="380" cy="470" r="9"/></g><text x="300" y="640" text-anchor="middle" font-size="44" font-weight="bold" fill="#fff">SERBAREA DE CRĂCIUN</text><text x="300" y="690" text-anchor="middle" font-size="26" fill="#FAD165">Marți, după ore · Sala festivă</text><text x="300" y="735" text-anchor="middle" font-size="22" fill="#cfe3ff">Colindul „O, brad frumos” · Clasa a VI-a</text></svg>`),
  };
  const PDFURI = {
    'Fisa-de-lucru-siguranta.pdf': [
      { titlu: 'Fișă de lucru – Siguranța pe internet', sub: 'Clasa a VI-a · Tehnologia informației și a comunicațiilor', randuri: ['Nume și prenume: ______________________   Data: ___________',
        '1. Scrie trei reguli pentru o parolă sigură.', '   a) ____________________________________', '   b) ____________________________________', '   c) ____________________________________',
        '2. Primești un mesaj care îți cere parola „ca să nu-ți fie închis contul”. Ce faci? Bifează:', '   ☐ răspund cu parola   ☐ raportez mesajul ca spam / phishing   ☐ spun unui adult',
        '3. Găsește greșeala din adresa: suport@edumai1.ro ____________________',
        '4. Adevărat sau fals?', '   ___ Un fișier .exe primit de la un necunoscut poate fi un virus.', '   ___ Pe un calculator al școlii bifez „Ține-mă minte”.', '   ___ Mă deconectez din cont când termin.'] },
      { titlu: 'Mini-dicționar', randuri: ['Phishing – mesaj înșelător care încearcă să-ți fure parola sau datele.', 'Spam – mesaje nedorite, trimise la foarte mulți oameni.', 'Antivirus – program care caută și oprește virușii.', 'Verificare în doi pași – pe lângă parolă, primești un cod pe telefon.', '', 'Termen de predare: vineri. Trimite fișa rezolvată cu Răspunde, ca atașament.'] },
    ],
    'Program-atelier-BD.pdf': [
      { titlu: 'Atelier de benzi desenate', sub: 'Biblioteca Județeană · sâmbătă, ora 11:00', randuri: ['11:00 – Cum se naște un personaj', '11:30 – Cadre, baloane și onomatopee', '12:00 – Pauză', '12:15 – Desenăm prima noastră bandă', '13:00 – Expoziția lucrărilor', '', 'Participarea este gratuită. Aduceți creioane colorate!'] },
    ],
  };

  // ---------- Aplicația ----------
  let curent = null; // { opreste() } pentru ecranul afișat
  window.addEventListener('hashchange', () => { if (curent && !location.hash.startsWith('#/aplicatii/posta')) { curent.opreste(); curent = null; } });

  async function porneste(m, params) {
    curent?.opreste();
    let S = null;
    try { S = await store.get(); } catch { S = null; }
    if (S) { try { migreaza(S); } catch { /* datele vechi rămân cum sunt */ } }
    const radacina = h('div', { class: 'ap-posta' });
    let bara = null;
    if (params?.get('sarcina') && window.EduSarcini?.bara) {
      try { bara = await window.EduSarcini.bara('posta', async () => lucrare()); } catch { bara = null; }
    }
    show(h('div', { class: 'lab-ecran ap-posta-ecran' }, bara, radacina));
    document.title = 'EduMail – Poștă electronică';

    function lucrare() {
      if (!S) return null;
      const trimise = S.mesaje.filter((x) => x.trimisDeElev).sort((a, b) => a.data - b.data);
      return {
        titlu: 'Mesajele mele', tip: 'mesaje', adresa: S.adresa,
        date: trimise.map((x) => ({ catre: x.catre.join('; '), cc: x.cc.join('; '), cci: x.cci.join('; '), subiect: x.subiect, text: htmlLaText(x.html), atasamente: x.atasamente.map((a) => a.nume), trimisLa: new Date(x.data).toISOString(), tipActiune: x.actiune || 'nou' })),
        misiuni: { realizate: MISIUNI.filter((mi) => S.misiuni[mi.id]).length, total: MISIUNI.length },
      };
    }

    const logo = (mare) => h('div', { class: `ap-posta-logo${mare ? ' mare' : ''}` },
      h('span', { class: 'ap-posta-logo-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 48 36"><rect x="3" y="4" width="42" height="28" rx="4" fill="#fff" stroke="#C5221F" stroke-width="3"/><path d="M5 7l19 14L43 7" fill="none" stroke="#C5221F" stroke-width="3.5" stroke-linejoin="round"/><circle cx="40" cy="8" r="6" fill="#1A73E8"/><path d="M37.5 8l2 2 3-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>' }),
      h('b', {}, 'EduMail'));

    // ---------- Prima pornire: alegerea adresei ----------
    function ecranBunVenit() {
      const fPrenume = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', placeholder: ' ', id: 'ap-posta-f1' });
      const fNume = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', placeholder: ' ', id: 'ap-posta-f2' });
      const fUser = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', spellcheck: 'false', placeholder: ' ', id: 'ap-posta-f3' });
      const err = h('p', { class: 'ap-posta-eroare', role: 'alert' });
      let atins = false;
      const sugereaza = () => { if (!atins) fUser.value = [fPrenume.value, fNume.value].map((x) => norm(x).replace(/[^a-z0-9]/g, '')).filter(Boolean).join('.'); };
      fPrenume.addEventListener('input', sugereaza); fNume.addEventListener('input', sugereaza);
      fUser.addEventListener('input', () => { atins = true; });
      const creeaza = async (e) => {
        e.preventDefault();
        const u = fUser.value.trim().toLowerCase();
        if (!fPrenume.value.trim()) return void (err.textContent = 'Introdu prenumele.');
        if (!/^[a-z][a-z0-9._-]{2,29}$/.test(u) || /[._-]$/.test(u) || u.includes('..')) return void (err.textContent = 'Numele de utilizator: 3–30 caractere, începe cu o literă; doar litere fără diacritice, cifre, punct, - și _.');
        S = cutieNoua(fPrenume.value.trim(), fNume.value.trim(), `${u}@${DOMENIU}`);
        await salveazaAcum();
        aplicatie();
      };
      const camp = (inp, eticheta, sufix) => h('div', { class: 'ap-posta-camp-contur' }, inp, h('label', { for: inp.id }, eticheta), sufix ? h('span', { class: 'sufix' }, sufix) : null);
      umple(radacina, h('div', { class: 'ap-posta-bunvenit' },
        h('a', { class: 'ap-posta-inapoi', href: '#/aplicatii' }, '← Aplicații'),
        h('form', { class: 'ap-posta-card', onsubmit: creeaza },
          logo(true),
          h('h1', {}, 'Creează un cont EduMail'),
          h('p', {}, 'Simulator de poștă electronică: exersezi lucrul cu e-mailul fără un cont adevărat. Adresa este fictivă, iar mesajele rămân doar pe acest calculator.'),
          camp(fPrenume, 'Prenume'), camp(fNume, 'Nume (opțional)'), camp(fUser, 'Nume de utilizator', `@${DOMENIU}`),
          h('p', { class: 'ap-posta-mic' }, 'Știai că? În România, un cont Google îl faci singur abia de la 16 ani. Până atunci, contul îl fac părinții sau îl primești de la școală.'),
          err, h('div', { class: 'ap-posta-card-btn' }, h('button', { class: 'ap-posta-b principal plin', type: 'submit' }, 'Înainte')))));
      fPrenume.focus();
    }

    // ---------- Salvare ----------
    let tSalv = null;
    async function salveazaAcum() {
      clearTimeout(tSalv); tSalv = null;
      try { await store.put(S); } catch { window.alert?.('Nu am putut salva: spațiul din browser e plin.'); }
    }
    function salveaza() { clearTimeout(tSalv); tSalv = setTimeout(salveazaAcum, 300); }

    if (!S) return ecranBunVenit();
    return aplicatie();

    // ---------- Ecranul principal ----------
    function aplicatie() {
      const pornit = Date.now();
      const UI = { dosar: 'primite', categorie: 'principale', fir: null, cautare: '', bifate: new Set(), compunere: null, vedere: 'lista', fila: 'general', navMic: false, navDeschis: false, maiMulte: false, extinse: new Set(), trimitere: null };
      const ST_ = () => S.setari;
      const T = (k) => TXT[ST_().aspect === 'outlook' ? 'outlook' : 'gmail'][k] || k;
      const outlook = () => ST_().aspect === 'outlook';
      const eu = () => S.adresa;
      const numeleMeu = () => `${S.prenume} ${S.nume}`.trim();
      const gaseste = (id) => S.mesaje.find((x) => x.id === id);
      const contactDupa = (a) => S.contacte.find((c) => c.adresa.toLowerCase() === (a || '').toLowerCase());
      const numeDupa = (a) => (a?.toLowerCase() === eu() ? 'eu' : contactDupa(a)?.nume || ALTE_NUME[a] || a);
      const scurt = (a) => { const n = numeDupa(a); return n === a ? a.split('@')[0] : n.replace(/\s*\(.*\)$/, '').split(' ')[0] === 'Bunica' ? 'Bunica' : n.replace(/\s*\(.*\)$/, '').split(' ')[0]; };
      const culoare = (a) => { let s = 0; for (const c of a || '') s = (s * 31 + c.charCodeAt(0)) >>> 0; return s % 8; };
      const initiala = (nume, a) => (nume || a || '?').replace(/^(prof\.|bunica)\s*/i, '').charAt(0).toUpperCase();
      const avatar = (nume, a, cls = '') => h('span', { class: `ap-posta-avatar c${culoare(a)} ${cls}`, 'aria-hidden': 'true' }, initiala(nume, a));
      const eticheta = (id) => S.dosare.find((d) => d.id === id);
      const cand = (x) => x.revenit || x.data;

      // Buton cu pictogramă și tooltip
      const ib = (ico, tip, fn, extra = {}) => h('button', { type: 'button', class: `ap-posta-ib ${extra.cls || ''}`, 'data-tip': tip, 'aria-label': tip, onclick: fn, ...(extra.attr || {}) }, svg(ico));

      // ---------- Scheletul interfeței ----------
      const cautare = h('input', { type: 'text', placeholder: 'Caută în e-mailuri', 'aria-label': 'Caută în e-mailuri', autocomplete: 'off', spellcheck: 'false' });
      const sugCautare = h('div', { class: 'ap-posta-sug-cautare', hidden: true });
      const formCautare = h('form', { class: 'ap-posta-cauta', role: 'search', onsubmit: (e) => { e.preventDefault(); sugCautare.hidden = true; cauta(cautare.value); cautare.blur(); } },
        ib(I.cauta, 'Caută', () => { sugCautare.hidden = true; cauta(cautare.value); }, { cls: 'lupa' }), cautare,
        ib(I.inchide, 'Șterge căutarea', () => { cautare.value = ''; cauta(''); }, { cls: 'x-cautare' }),
        ib(I.filtru, 'Afișează opțiunile de căutare', () => { cautare.focus(); arataSugestii(true); }, { cls: 'optiuni' }), sugCautare);
      const btnMisiuni = h('button', { class: 'ap-posta-btn-misiuni', type: 'button', 'data-tip': 'Misiunile tale', onclick: () => panouMisiuni() });
      const sus = h('header', { class: 'ap-posta-sus' },
        h('a', { class: 'ap-posta-inapoi', href: '#/aplicatii', 'data-tip': 'Înapoi la aplicații' }, '← Aplicații'),
        ib(I.meniu, 'Meniu principal', () => comutaNav(), { cls: 'hamburger' }),
        logo(false),
        formCautare,
        h('div', { class: 'ap-posta-sus-dreapta' },
          btnMisiuni,
          ib(I.ajutor, 'Asistență', (e) => meniuAjutor(e.currentTarget)),
          ib(I.setari, 'Setări', () => panouSetariRapide()),
          h('button', { class: 'ap-posta-cont', type: 'button', 'data-tip': `Cont EduMail\n${numeleMeu()}\n${S.adresa}`, 'aria-label': 'Contul meu', onclick: (e) => meniuCont(e.currentTarget) }, avatar(S.prenume, S.adresa))));
      cautare.addEventListener('input', () => { arataSugestii(); if (!cautare.value && UI.cautare) cauta(''); });
      cautare.addEventListener('focus', () => arataSugestii());
      cautare.addEventListener('blur', () => setTimeout(() => { sugCautare.hidden = true; }, 180));
      cautare.addEventListener('keydown', (e) => { if (e.key === 'Escape') { sugCautare.hidden = true; cautare.blur(); } if (e.key === 'ArrowDown') { e.preventDefault(); sugCautare.querySelector('button')?.focus(); } });

      const bandaEl = h('div', { class: 'ap-posta-banda' });
      const ribbonEl = h('div', { class: 'ap-posta-ribbon' });
      const navEl = h('nav', { class: 'ap-posta-nav', 'aria-label': 'Dosare și etichete' });
      const listaEl = h('section', { class: 'ap-posta-lista', 'aria-label': 'Lista de conversații' });
      const citireEl = h('section', { class: 'ap-posta-citire', 'aria-label': 'Conversația' });
      const setariEl = h('section', { class: 'ap-posta-setari-pag', 'aria-label': 'Setări' });
      const principal = h('div', { class: 'ap-posta-principal' }, listaEl, citireEl, setariEl);
      const rail = h('aside', { class: 'ap-posta-rail', 'aria-label': 'Panou lateral' },
        ib(I.agenda, 'Agendă (Contacte)', () => panouAgenda(), { cls: 'rail-agenda' }),
        ib(I.misiuni, 'Misiuni', () => panouMisiuni(), { cls: 'rail-misiuni' }));
      const corp = h('div', { class: 'ap-posta-corp' }, navEl, principal, rail);
      const stareLink = h('div', { class: 'ap-posta-statuslink', 'aria-hidden': 'true' });
      const toasturi = h('div', { class: 'ap-posta-toasturi', 'aria-live': 'polite' });
      const tooltip = h('div', { class: 'ap-posta-tooltip', role: 'tooltip', hidden: true });
      umple(radacina, sus, bandaEl, ribbonEl, corp, stareLink, toasturi, tooltip);

      // Tooltip-uri ca în Gmail (gri închis, cu o mică întârziere)
      let tTip = null, tipEl = null;
      radacina.addEventListener('mouseover', (e) => {
        const t = e.target.closest?.('[data-tip]');
        if (t === tipEl) return;
        tipEl = t; clearTimeout(tTip); tooltip.hidden = true;
        if (!t) return;
        tTip = setTimeout(() => {
          if (!t.isConnected) return;
          tooltip.textContent = t.dataset.tip; tooltip.hidden = false;
          const r = t.getBoundingClientRect(), R = radacina.getBoundingClientRect();
          let x = r.left - R.left + r.width / 2 - tooltip.offsetWidth / 2;
          x = Math.max(4, Math.min(R.width - tooltip.offsetWidth - 4, x));
          let y = r.bottom - R.top + 6;
          if (y + tooltip.offsetHeight > R.height - 4) y = r.top - R.top - tooltip.offsetHeight - 6;
          tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
        }, 450);
      });
      radacina.addEventListener('mouseleave', () => { clearTimeout(tTip); tooltip.hidden = true; tipEl = null; });
      radacina.addEventListener('pointerdown', () => { clearTimeout(tTip); tooltip.hidden = true; });

      // ---------- Meniuri derulante (unul singur deschis) ----------
      let meniuDeschis = null;
      function meniu(ancora, continut, o = {}) {
        inchideMeniu();
        const el = h('div', { class: `ap-posta-meniu ${o.cls || ''}`, role: 'menu' }, continut);
        radacina.append(el);
        const r = ancora.getBoundingClientRect(), R = radacina.getBoundingClientRect();
        let x = o.dreapta ? r.right - R.left - el.offsetWidth : r.left - R.left;
        x = Math.max(6, Math.min(R.width - el.offsetWidth - 6, x));
        let y = r.bottom - R.top + 4;
        if (y + el.offsetHeight > R.height - 6) y = Math.max(6, r.top - R.top - el.offsetHeight - 4);
        el.style.left = `${x}px`; el.style.top = `${y}px`;
        const afara = (e) => { if (!el.contains(e.target) && !ancora.contains(e.target)) inchideMeniu(); };
        document.addEventListener('pointerdown', afara, true);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.stopPropagation(); inchideMeniu(); ancora.focus?.(); }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const b = [...el.querySelectorAll('button:not([disabled]), input')]; const i = b.indexOf(document.activeElement);
            b[(i + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length]?.focus(); e.preventDefault();
          }
        });
        meniuDeschis = { el, inchide: () => { el.remove(); document.removeEventListener('pointerdown', afara, true); } };
        (el.querySelector('input') || el.querySelector('button:not([disabled])'))?.focus();
        return el;
      }
      function inchideMeniu() { meniuDeschis?.inchide(); meniuDeschis = null; }
      const optiune = (text, fn, o = {}) => h('button', { type: 'button', role: 'menuitem', class: o.cls || '', disabled: o.disabled, onclick: () => { inchideMeniu(); fn(); } }, o.ico ? svg(o.ico) : null, h('span', {}, text), o.dreapta ? h('small', {}, o.dreapta) : null);

      // ---------- Randare ----------
      function randeaza() {
        radacina.classList.toggle('aspect-outlook', outlook());
        radacina.classList.toggle('tema-intunecata', ST_().tema === 'intunecata');
        radacina.classList.remove('dens-prestabilita', 'dens-confortabila', 'dens-compacta');
        radacina.classList.add(`dens-${ST_().densitate}`);
        const imparte2 = outlook() || ST_().panou === 'dreapta';
        corp.classList.toggle('impartit', imparte2 && UI.vedere === 'lista');
        corp.classList.toggle('nav-mic', UI.navMic);
        corp.classList.toggle('nav-deschis', UI.navDeschis);
        corp.classList.toggle('vede-fir', !!UI.fir && UI.vedere === 'lista');
        corp.classList.toggle('vede-setari', UI.vedere === 'setari');
        cautare.placeholder = outlook() ? 'Căutare' : 'Caută în e-mailuri';
        randeazaNav(); randeazaBanda(); randeazaRibbon();
        if (UI.vedere === 'setari') { if (setariEl.dataset.desenat !== UI.fila || UI.fila === 'etichete') randeazaSetari(); listaEl.hidden = true; citireEl.hidden = true; setariEl.hidden = false; }
        else {
          setariEl.hidden = true;
          if (UI.fir && !firMesaje().length) UI.fir = null;
          listaEl.hidden = !imparte2 && !!UI.fir;
          citireEl.hidden = !imparte2 && !UI.fir;
          if (!listaEl.hidden) randeazaLista();
          if (!citireEl.hidden) randeazaCitire();
        }
        randeazaMisiuniBtn(); actualizeazaTitlu();
      }
      function necititePrimite() { return S.mesaje.filter((x) => x.dosar === 'primite' && !x.citit && (!ST_().categorii || x.categorie === 'principale' || outlook())).length; }
      function actualizeazaTitlu() {
        const n = necititePrimite();
        const loc = UI.cautare ? 'Rezultatele căutării' : numeDosar(UI.dosar);
        document.title = `${loc}${n && UI.dosar === 'primite' && !UI.cautare ? ` (${n})` : ''} - ${S.adresa} - EduMail`;
      }
      function randeazaMisiuniBtn() {
        const n = MISIUNI.filter((mi) => S.misiuni[mi.id]).length;
        umple(btnMisiuni, svg(I.misiuni), h('span', {}, 'Misiuni'), h('b', { class: n === MISIUNI.length ? 'gata' : '' }, `${n}/${MISIUNI.length}`));
      }

      // ---------- Dosare, etichete, conversații ----------
      const inafara = (x) => ['sterse', 'spam'].includes(x.dosar);
      function inDosar(d) {
        if (d === 'stea') return S.mesaje.filter((x) => x.important && !inafara(x));
        if (d === 'importante') return S.mesaje.filter((x) => x.importantMarcaj && !inafara(x) && x.dosar !== 'ciorne');
        if (d === 'arhiva') return S.mesaje.filter((x) => !inafara(x) && x.dosar !== 'ciorne');
        if (eticheta(d)) return S.mesaje.filter((x) => (x.dosar === d || x.etichete.includes(d)) && !inafara(x));
        return S.mesaje.filter((x) => x.dosar === d);
      }
      function numeDosar(d) { return TXT.gmail[d] ? T(d) : eticheta(d)?.nume || d; }
      const subNorm = (s) => norm(s || '').replace(/^((re|fwd?|fw|raspuns automat)\s*:\s*)+/g, '').trim();
      function firKey(x, adanc = 0) {
        if (x.fir) return x.fir;
        if (x.refId && adanc < 12) { const r = gaseste(x.refId); if (r) return firKey(r, adanc + 1); }
        const s = subNorm(x.subiect);
        return s ? `s:${s}` : `i:${x.id}`;
      }
      // Mesajele unei conversații, în ordine cronologică (fără ciorne; coșul și spamul separat)
      function firMesaje(f = UI.fir) {
        if (!f) return [];
        return S.mesaje.filter((x) => x.dosar !== 'ciorne' && firKey(x) === f.cheie && (f.zona === 'normal' ? !inafara(x) : x.dosar === f.zona)).sort((a, b) => a.data - b.data);
      }
      const zonaDe = (x) => (inafara(x) ? x.dosar : 'normal');

      // Căutarea, cu operatori ca în Gmail (from:, to:, subject:, has:attachment, is:unread, in:trash, label:…)
      function filtruCautare(q) {
        const tok = q.match(/[\w-]+:"[^"]*"|[\w-]+:\S+|"[^"]*"|\S+/g) || [];
        const teste = []; let zona = null;
        for (const t0 of tok) {
          const m = /^([\w-]+):(.*)$/.exec(t0);
          const op = m && ['from', 'to', 'cc', 'subject', 'has', 'is', 'in', 'label', 'filename', 'category'].includes(m[1].toLowerCase()) ? m[1].toLowerCase() : null;
          const v = norm((op ? m[2] : t0).replace(/^"|"$/g, ''));
          if (!op) { teste.push((x) => norm([x.de.nume, x.de.adresa, x.subiect, htmlLaText(x.html), ...x.catre, ...x.cc, ...x.atasamente.map((y) => y.nume), ...x.etichete.map((e) => eticheta(e)?.nume || '')].join(' ')).includes(v)); continue; }
          if (op === 'from') teste.push((x) => norm(`${x.de.nume} ${x.de.adresa}`).includes(v) || (v === 'me' && x.de.adresa === eu()));
          if (op === 'to') teste.push((x) => norm([...x.catre, ...x.cc, ...x.cci, ...x.catre.map(numeDupa)].join(' ')).includes(v) || (v === 'me' && [...x.catre, ...x.cc, ...x.cci].includes(eu())));
          if (op === 'cc') teste.push((x) => norm(x.cc.join(' ')).includes(v));
          if (op === 'subject') teste.push((x) => norm(x.subiect).includes(v));
          if (op === 'filename') teste.push((x) => x.atasamente.some((a) => norm(a.nume).includes(v)));
          if (op === 'has') teste.push((x) => (v.startsWith('attach') ? x.atasamente.length > 0 : v === 'userlabels' ? x.etichete.length > 0 : true));
          if (op === 'is') teste.push((x) => ({ unread: !x.citit, read: x.citit, starred: !!x.important, important: !!x.importantMarcaj, snoozed: x.dosar === 'amanate' }[v] ?? true));
          if (op === 'label') teste.push((x) => x.etichete.some((e) => norm(eticheta(e)?.nume).replace(/\s+/g, '-') === v.replace(/\s+/g, '-')));
          if (op === 'category') teste.push((x) => x.dosar === 'primite' && x.categorie === ({ primary: 'principale', promotions: 'promotii', social: 'sociale' }[v] || v));
          if (op === 'in') zona = v;
        }
        return (x) => {
          if (x.dosar === 'ciorne' && zona !== 'drafts') return false;
          if (zona === 'trash') { if (x.dosar !== 'sterse') return false; }
          else if (zona === 'spam') { if (x.dosar !== 'spam') return false; }
          else if (zona !== 'anywhere' && inafara(x)) return false;
          if (zona === 'inbox' && x.dosar !== 'primite') return false;
          if (zona === 'sent' && x.dosar !== 'trimise') return false;
          if (zona === 'drafts' && x.dosar !== 'ciorne') return false;
          if (zona === 'snoozed' && x.dosar !== 'amanate') return false;
          if (zona === 'starred' && !x.important) return false;
          return teste.every((t) => t(x));
        };
      }
      function mesajeAfisate() {
        let a;
        if (UI.cautare) a = S.mesaje.filter(filtruCautare(UI.cautare));
        else {
          a = inDosar(UI.dosar);
          if (UI.dosar === 'primite' && ST_().categorii) {
            const cat = UI.categorie;
            a = a.filter((x) => (outlook() ? (cat === 'principale' ? x.categorie === 'principale' : x.categorie !== 'principale') : x.categorie === cat));
          }
        }
        return a;
      }
      // Grupează mesajele în conversații: un rând pe conversație
      function conversatii() {
        const a = mesajeAfisate();
        const grup = new Map();
        for (const x of a) {
          const k = x.dosar === 'ciorne' ? `c:${x.id}` : `${firKey(x)}|${zonaDe(x)}`;
          if (!grup.has(k)) grup.set(k, []);
          grup.get(k).push(x);
        }
        return [...grup.entries()].map(([k, m]) => {
          m.sort((p, q) => cand(p) - cand(q));
          const rep = m[m.length - 1];
          const f = rep.dosar === 'ciorne' ? null : { cheie: firKey(rep), zona: zonaDe(rep) };
          const toate = f ? firMesaje(f) : [rep];
          return { k, m, rep, f, toate: toate.length ? toate : m };
        }).sort((p, q) => cand(q.rep) - cand(p.rep));
      }
      const idsDin = (chei) => { const c = conversatii(); return c.filter((v) => chei.includes(v.k)).flatMap((v) => v.m.map((x) => x.id)); };
      const idsFir = () => firMesaje().map((x) => x.id);

      function randeazaNav() {
        const btnDosar = (id, ico) => {
          const lst = inDosar(id);
          const n = id === 'ciorne' ? lst.length : ['trimise', 'arhiva', 'stea', 'importante', 'amanate', 'sterse'].includes(id) ? 0 : lst.filter((x) => !x.citit && (id !== 'primite' || !ST_().categorii || outlook() || x.categorie === 'principale')).length;
          const activ = !UI.cautare && UI.dosar === id && UI.vedere === 'lista';
          return h('li', {}, h('button', { type: 'button', class: `ap-posta-dosar${activ ? ' activ' : ''}${n && id !== 'ciorne' ? ' are-necitite' : ''}`, 'aria-current': String(activ), 'data-tip': UI.navMic ? T(id) : null,
            onclick: () => mergiLa(id) }, svg(ico), h('span', { class: 'nume' }, T(id)), n ? h('b', {}, String(n)) : null));
        };
        const mai = UI.maiMulte || DOSARE_MAI_MULTE.some(([id]) => id === UI.dosar);
        umple(navEl,
          h('button', { class: 'ap-posta-scrie', type: 'button', 'data-tip': UI.navMic ? T('scrie') : null, onclick: () => compune({ mod: 'nou' }) }, svg(I.scrie), h('span', {}, T('scrie'))),
          outlook() ? h('div', { class: 'ap-posta-nav-titlu' }, svg(I.jos, 'ap-posta-ico mic'), h('span', {}, 'Foldere')) : null,
          h('ul', {}, DOSARE.filter(([id]) => !outlook() || !['amanate', 'importante'].includes(id)).map(([id, ico]) => btnDosar(id, ico)),
            outlook() ? DOSARE_MAI_MULTE.map(([id, ico]) => btnDosar(id, ico)) : [
              h('li', {}, h('button', { type: 'button', class: 'ap-posta-dosar mai', 'aria-expanded': String(mai), onclick: () => { UI.maiMulte = !mai; randeazaNav(); } }, svg(mai ? '<path d="M7 14l5-5 5 5"/>' : I.jos), h('span', { class: 'nume' }, mai ? 'Mai puține' : 'Mai multe'))),
              mai ? DOSARE_MAI_MULTE.map(([id, ico]) => btnDosar(id, ico)) : null]),
          h('div', { class: 'ap-posta-nav-etichete' },
            h('div', { class: 'ap-posta-nav-titlu' }, h('span', {}, outlook() ? 'Dosarele mele' : T('etichete')), ib(I.plus, T('etichetaNoua'), () => etichetaNoua())),
            h('ul', {}, S.dosare.map((d) => {
              const n = inDosar(d.id).filter((x) => !x.citit).length;
              const activ = !UI.cautare && UI.dosar === d.id && UI.vedere === 'lista';
              const b = h('button', { type: 'button', class: `ap-posta-dosar et${activ ? ' activ' : ''}${n ? ' are-necitite' : ''}`, 'aria-current': String(activ), 'data-tip': UI.navMic ? d.nume : null, onclick: () => mergiLa(d.id),
                oncontextmenu: (e) => { e.preventDefault(); meniuEticheta(d, e.currentTarget); } },
              outlook() ? svg(I.dosar) : h('span', { class: 'ap-posta-ico eticheta-ico', 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24"><path d="M4 6h11l5 6-5 6H4z" fill="${d.culoare}" stroke="${d.culoare}" stroke-width="2" stroke-linejoin="round"/></svg>` }),
              h('span', { class: 'nume' }, d.nume), n ? h('b', {}, String(n)) : null);
              return h('li', { class: 'cu-puncte' }, b, ib(I.puncte, outlook() ? 'Opțiuni folder' : 'Opțiuni pentru etichetă', (e) => meniuEticheta(d, e.currentTarget), { cls: 'puncte' }));
            }))),
          h('p', { class: 'ap-posta-spatiu' }, h('span', { class: 'bara' }, h('span', {})), 'Spațiu folosit: 0,01 GB din 15 GB'));
        const spatiu = navEl.querySelector('.ap-posta-spatiu .bara span');
        if (spatiu) spatiu.style.width = '2%';
      }
      function mergiLa(id) {
        UI.dosar = id; UI.fir = null; UI.bifate.clear(); UI.vedere = 'lista'; UI.navDeschis = false;
        if (id === 'primite') UI.categorie = 'principale';
        if (UI.cautare) { UI.cautare = ''; cautare.value = ''; }
        randeaza();
      }
      function comutaNav() {
        if (window.innerWidth < 760) UI.navDeschis = !UI.navDeschis; else UI.navMic = !UI.navMic;
        randeaza();
      }
      function randeazaBanda() {
        const v = ST_().vacanta;
        umple(bandaEl, v.activ ? h('div', { class: 'ap-posta-banda-vac' },
          h('span', {}, h('b', {}, 'Răspunsul automat de vacanță este activat. '), `Subiect: ${v.subiect}`),
          h('button', { type: 'button', class: 'ap-posta-link', onclick: () => { v.activ = false; salveaza(); randeaza(); toast('Răspunsul automat de vacanță a fost dezactivat.'); } }, 'Încheie acum'),
          h('button', { type: 'button', class: 'ap-posta-link', onclick: () => deschideSetari('general', 'vacanta') }, 'Setări de vacanță')) : null);
      }

      // Bara de comenzi din aspectul Outlook (fila Pornire)
      function randeazaRibbon() {
        if (!outlook()) return umple(ribbonEl);
        const tinta = () => (UI.bifate.size ? idsDin([...UI.bifate]) : idsFir());
        const are = UI.bifate.size > 0 || !!UI.fir;
        const x = UI.fir ? firMesaje().filter((y) => y.de.adresa !== eu()).pop() || firMesaje().pop() : null;
        const cmd = (ico, text, fn, dis) => h('button', { type: 'button', class: 'ap-posta-cmd', disabled: dis, 'data-tip': text, onclick: fn }, svg(ico), h('span', {}, text));
        umple(ribbonEl,
          h('div', { class: 'ap-posta-ribbon-file' }, h('span', { class: 'activ' }, 'Pornire'), h('span', {}, 'Vizualizare'), h('span', {}, 'Ajutor')),
          h('div', { class: 'ap-posta-ribbon-cmd' },
            h('button', { type: 'button', class: 'ap-posta-cmd nou', onclick: () => compune({ mod: 'nou' }) }, svg(I.scrie), h('span', {}, 'Mesaj nou')),
            h('span', { class: 'sep' }),
            UI.dosar === 'sterse' && !UI.cautare ? cmd(I.restaureaza, 'Restaurare', () => muta(tinta(), 'primite'), !are) : null,
            cmd(I.sterse, UI.dosar === 'sterse' ? 'Ștergere definitivă' : 'Ștergere', () => sterge(tinta()), !are),
            cmd(I.arhiveaza, 'Arhivare', () => arhiveaza(tinta()), !are),
            cmd(I.spam, 'Raportare', (e) => meniu(e.currentTarget, [optiune('Raportați phishingul', () => raporteazaPhishing(tinta()), { ico: I.pericol }), optiune('Raportați ca nedorit', () => raporteazaSpam(tinta()), { ico: I.spam })]), !are),
            cmd(I.dosar, 'Mutare în', (e) => meniuMuta(e.currentTarget, tinta()), !are),
            h('span', { class: 'sep' }),
            cmd(I.raspunde, 'Răspundeți', () => compune({ mod: 'raspuns', ref: x }), !x),
            cmd(I.toti, 'Răspundeți tuturor', () => compune({ mod: 'raspuns-tuturor', ref: x }), !x),
            cmd(I.redir, 'Redirecționați', () => compune({ mod: 'redirectionare', ref: x }), !x),
            h('span', { class: 'sep' }),
            cmd(I.necitit, 'Necitit/Citit', () => { const ids = tinta(); marcheaza(ids, !ids.every((id) => gaseste(id)?.citit)); }, !are),
            cmd(I.misiuni, 'Semnalizare', () => { const ids = tinta(); const v = !ids.every((id) => gaseste(id)?.important); ids.forEach((id) => { gaseste(id).important = v; }); salveaza(); randeaza(); }, !are),
            cmd(I.eticheta, 'Clasificare', (e) => meniuEtichetare(e.currentTarget, tinta()), !are),
            cmd(I.ceas, 'Amânare', (e) => meniuAmanare(e.currentTarget, tinta()), !are)));
      }

      // ---------- Lista de conversații ----------
      function randeazaLista() {
        const lista = conversatii();
        const chei = lista.map((v) => v.k);
        for (const k of [...UI.bifate]) if (!chei.includes(k)) UI.bifate.delete(k);
        const nBif = UI.bifate.size;
        const bif = h('input', { type: 'checkbox', 'aria-label': 'Selectează' });
        bif.checked = nBif > 0 && nBif === lista.length; bif.indeterminate = nBif > 0 && nBif < lista.length;
        bif.addEventListener('change', () => { if (bif.checked) chei.forEach((k) => UI.bifate.add(k)); else UI.bifate.clear(); randeazaLista(); randeazaRibbon(); });
        const selecteaza = (fn) => { UI.bifate.clear(); lista.filter(fn).forEach((v) => UI.bifate.add(v.k)); randeazaLista(); randeazaRibbon(); };
        const ids = () => idsDin([...UI.bifate]);
        const inCos = UI.dosar === 'sterse' && !UI.cautare, inSpam = UI.dosar === 'spam' && !UI.cautare;
        const sep = () => h('span', { class: 'ap-posta-sep' });
        const toateCitite = nBif && ids().every((id) => gaseste(id)?.citit);
        const unelte = nBif
          ? [inCos ? null : ib(I.arhiveaza, T('arhiveaza'), () => arhiveaza(ids())),
            inSpam ? h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => nuESpam(ids()) }, T('nuSpam')) : inCos ? null : ib(I.spam, T('spamBtn'), () => raporteazaSpam(ids())),
            inCos || inSpam ? h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => sterge(ids()) }, T('stergeDef')) : ib(I.sterse, T('sterge'), () => sterge(ids())),
            inCos ? h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => muta(ids(), 'primite') }, T('restaurare')) : null,
            sep(),
            toateCitite ? ib(I.necitit, T('necitit'), () => marcheaza(ids(), false)) : ib(I.citit, T('citit'), () => marcheaza(ids(), true)),
            inCos || inSpam ? null : ib(I.ceas, T('amana'), (e) => meniuAmanare(e.currentTarget, ids())),
            sep(),
            ib(I.dosar, T('mutaIn'), (e) => meniuMuta(e.currentTarget, ids())),
            inCos || inSpam ? null : ib(I.eticheta, T('eticheteaza'), (e) => meniuEtichetare(e.currentTarget, ids())),
            ib(I.puncte, 'Mai multe', (e) => meniu(e.currentTarget, [optiune('Marchează ca important', () => { ids().forEach((id) => { gaseste(id).importantMarcaj = true; }); salveaza(); randeaza(); }, { ico: I.important }),
              optiune('Marchează ca neimportant', () => { ids().forEach((id) => { gaseste(id).importantMarcaj = false; }); salveaza(); randeaza(); }, { ico: I.important }),
              optiune('Adaugă stea', () => { ids().forEach((id) => { gaseste(id).important = true; }); salveaza(); randeaza(); }, { ico: I.stea }),
              optiune('Raportează phishing', () => raporteazaPhishing(ids()), { ico: I.pericol })]))]
          : [ib(I.actualizeaza, 'Actualizează', () => { livreazaRestante(true); }),
            ib(I.puncte, 'Mai multe', (e) => meniu(e.currentTarget, [optiune('Marchează toate ca citite', () => marcheaza(lista.flatMap((v) => v.m.map((x) => x.id)), true), { ico: I.citit, disabled: !lista.length })])),
            (inCos || inSpam) && lista.length ? h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => golește() }, inCos ? T('golire') : 'Șterge acum toate mesajele spam') : null];
        const tabs = UI.dosar === 'primite' && !UI.cautare && ST_().categorii ? randeazaCategorii() : null;
        const titlu = UI.cautare ? h('div', { class: 'ap-posta-filtre' }, chipFiltru('has:attachment', 'Are atașament', I.agrafa), chipFiltru('is:unread', 'Necitite', I.necitit), chipFiltru('is:starred', 'Cu stea', I.stea),
          h('button', { type: 'button', class: 'ap-posta-link', onclick: () => { cautare.value = ''; cauta(''); } }, 'Șterge filtrele')) : null;
        const n = lista.length;
        umple(listaEl,
          h('div', { class: 'ap-posta-unelte' },
            h('div', { class: 'ap-posta-bif-grup', 'data-tip': 'Selectează' }, bif,
              h('button', { type: 'button', class: 'ap-posta-ib mic', 'aria-label': 'Opțiuni de selectare', onclick: (e) => meniu(e.currentTarget, [
                optiune('Toate', () => selecteaza(() => true)), optiune('Niciunul', () => selecteaza(() => false)),
                optiune('Citite', () => selecteaza((v) => v.m.every((x) => x.citit))), optiune('Necitite', () => selecteaza((v) => v.m.some((x) => !x.citit))),
                optiune('Cu stea', () => selecteaza((v) => v.m.some((x) => x.important))), optiune('Fără stea', () => selecteaza((v) => !v.m.some((x) => x.important)))]) }, svg(I.jos))),
            unelte,
            h('span', { class: 'ap-posta-umple' }),
            h('span', { class: 'ap-posta-pag' }, n ? `1–${n} din ${n}` : '0 din 0'),
            ib(I.stanga, 'Mai noi', null, { attr: { disabled: true } }), ib(I.dreapta, 'Mai vechi', null, { attr: { disabled: true } })),
          outlook() ? h('div', { class: 'ap-posta-ol-titlu' }, h('b', {}, UI.cautare ? 'Rezultate' : numeDosar(UI.dosar))) : null,
          tabs, titlu,
          inSpam ? h('p', { class: 'ap-posta-nota' }, 'Mesajele care stau în Spam mai mult de 30 de zile se vor șterge automat. Nu da clic pe linkurile din ele și nu deschide atașamentele.') : null,
          inCos ? h('p', { class: 'ap-posta-nota' }, 'Mesajele care stau în Coș de gunoi mai mult de 30 de zile se vor șterge automat. Până atunci, le poți recupera.') : null,
          n ? h('ul', { class: 'ap-posta-randuri', role: 'list' }, lista.map(randConversatie))
            : h('div', { class: 'ap-posta-gol' }, UI.cautare ? h('p', {}, 'Niciun mesaj nu se potrivește căutării. ', h('span', { class: 'ap-posta-mic' }, 'Încearcă alte cuvinte sau operatori ca from:, subject:, has:attachment, in:trash.'))
              : UI.dosar === 'primite' && ST_().categorii && UI.categorie !== 'principale' ? h('p', {}, 'Fila este goală.') : h('p', {}, UI.dosar === 'sterse' ? 'Nicio conversație în Coș de gunoi.' : UI.dosar === 'spam' ? 'Ura, nu ai niciun mesaj spam!' : UI.dosar === 'primite' ? 'Nu ai niciun mesaj nou!' : 'Nicio conversație aici.')));
      }
      function chipFiltru(op, text, ico) {
        const on = UI.cautare.split(/\s+/).includes(op);
        return h('button', { type: 'button', class: `ap-posta-chip-filtru${on ? ' on' : ''}`, onclick: () => { const q = on ? UI.cautare.split(/\s+/).filter((t) => t !== op).join(' ') : `${UI.cautare} ${op}`.trim(); cautare.value = q; cauta(q); } }, svg(on ? I.bifa : ico), text);
      }
      function randeazaCategorii() {
        const cats = outlook() ? [['principale', 'Prioritare', null], ['altele', 'Altele', null]] : [['principale', 'Principale', I.primite], ['promotii', 'Promoții', I.promo], ['sociale', 'Rețele sociale', I.agenda]];
        if (outlook() && !['principale', 'altele'].includes(UI.categorie)) UI.categorie = 'principale';
        if (!outlook() && UI.categorie === 'altele') UI.categorie = 'principale';
        return h('div', { class: 'ap-posta-categorii', role: 'tablist' }, cats.map(([id, nume, ico]) => {
          const noi = S.mesaje.filter((x) => x.dosar === 'primite' && !x.citit && (id === 'altele' ? x.categorie !== 'principale' : x.categorie === id)).length;
          const ultim = id !== 'principale' && noi ? S.mesaje.filter((x) => x.dosar === 'primite' && !x.citit && x.categorie === id).sort((a, b) => b.data - a.data)[0] : null;
          return h('button', { type: 'button', role: 'tab', class: `ap-posta-cat c-${id}${UI.categorie === id ? ' activ' : ''}`, 'aria-selected': String(UI.categorie === id), onclick: () => { UI.categorie = id; UI.bifate.clear(); randeaza(); } },
            ico ? svg(ico) : null, h('span', { class: 'cat-text' }, h('span', { class: 'cat-nume' }, nume, id !== 'principale' && noi && !outlook() ? h('b', { class: 'noi' }, `${noi} ${noi === 1 ? 'nou' : 'noi'}`) : null),
              ultim && !outlook() ? h('small', {}, ultim.de.nume) : null));
        }));
      }
      function participanti(v) {
        const toate = v.toate;
        const vazut = [];
        for (const x of toate) { const a = x.de.adresa; if (!vazut.includes(a)) vazut.push(a); }
        const nume = vazut.map((a) => (a === eu() ? 'eu' : toate.length > 1 ? scurt(a) : (toate.find((x) => x.de.adresa === a)?.de.nume || a)));
        return nume.slice(-3).join(', ');
      }
      function randConversatie(v) {
        const x = v.rep;
        const necitit = v.m.some((y) => !y.citit);
        const stea = v.m.some((y) => y.important);
        const imp = v.m.some((y) => y.importantMarcaj);
        const ciorna = x.dosar === 'ciorne';
        const trimiseView = UI.dosar === 'trimise' && !UI.cautare;
        const cine = ciorna ? h('span', { class: 'ciorna' }, 'Mesaj nefinalizat')
          : trimiseView ? `Către: ${[...x.catre, ...x.cc, ...x.cci].map(scurt).join(', ') || '(fără destinatar)'}` : participanti(v);
        const nr2 = v.toate.length > 1 ? h('span', { class: 'nr' }, String(v.toate.length)) : null;
        const ids = v.m.map((y) => y.id);
        const bif = h('input', { type: 'checkbox', 'aria-label': `Selectează conversația: ${x.subiect}` });
        bif.checked = UI.bifate.has(v.k);
        bif.addEventListener('click', (e) => e.stopPropagation());
        bif.addEventListener('change', () => { if (bif.checked) UI.bifate.add(v.k); else UI.bifate.delete(v.k); randeazaLista(); randeazaRibbon(); });
        const btnStea = h('button', { type: 'button', class: `ap-posta-stea${stea ? ' on' : ''}`, 'data-tip': stea ? 'Cu stea' : 'Fără stea', 'aria-label': stea ? 'Elimină steaua' : 'Adaugă stea', 'aria-pressed': String(stea),
          onclick: (e) => { e.stopPropagation(); if (stea) v.m.forEach((y) => { y.important = false; }); else x.important = true; salveaza(); randeaza(); } }, svg(outlook() ? I.misiuni : I.stea));
        const btnImp = h('button', { type: 'button', class: `ap-posta-imp${imp ? ' on' : ''}`, 'data-tip': imp ? 'Important, după părerea ta. Apasă ca să-l marchezi ca neimportant.' : 'Apasă ca să marchezi conversația ca importantă.', 'aria-label': 'Important', 'aria-pressed': String(imp),
          onclick: (e) => { e.stopPropagation(); v.m.forEach((y) => { y.importantMarcaj = !imp; }); salveaza(); randeaza(); } }, svg(I.important));
        const chipuri = [];
        if ((UI.cautare || ['arhiva', 'stea', 'importante'].includes(UI.dosar) || eticheta(UI.dosar)) && x.dosar === 'primite') chipuri.push(h('span', { class: 'ap-posta-et' }, T('primite')));
        if (UI.cautare && ['spam', 'sterse', 'trimise', 'amanate'].includes(x.dosar)) chipuri.push(h('span', { class: 'ap-posta-et' }, numeDosar(x.dosar)));
        const ets = [...new Set(v.m.flatMap((y) => y.etichete))].filter((id) => id !== UI.dosar).map(eticheta).filter(Boolean);
        for (const e of ets) { const c = h('span', { class: 'ap-posta-et col' }, e.nume); c.style.background = e.culoare; chipuri.push(c); }
        const hover = h('div', { class: 'ap-posta-hover' },
          x.dosar === 'sterse' ? ib(I.restaureaza, T('restaurare'), (e) => { e.stopPropagation(); muta(ids, 'primite'); })
            : x.dosar === 'primite' || x.dosar === 'amanate' ? ib(I.arhiveaza, T('arhiveaza'), (e) => { e.stopPropagation(); arhiveaza(ids); }) : null,
          ib(I.sterse, x.dosar === 'sterse' ? T('stergeDef') : ciorna ? 'Renunță la ciorne' : T('sterge'), (e) => { e.stopPropagation(); sterge(ids); }),
          ciorna ? null : necitit ? ib(I.citit, T('citit'), (e) => { e.stopPropagation(); marcheaza(ids, true); }) : ib(I.necitit, T('necitit'), (e) => { e.stopPropagation(); marcheaza(ids, false); }),
          ciorna || inafara(x) ? null : ib(I.ceas, T('amana'), (e) => { e.stopPropagation(); meniuAmanare(e.currentTarget, ids); }));
        const ataseaza = v.m.flatMap((y) => y.atasamente);
        const timp = h('time', { 'data-tip': dataLunga(cand(x)) }, x.dosar === 'amanate' && x.amanatPana ? `Amânat: ${oraScurta(x.amanatPana)}` : oraScurta(cand(x)));
        const deschideRand = () => (ciorna ? compuneDinCiorna(x) : deschideFir(v.f, x.id));
        const cls = `ap-posta-rand${necitit ? ' necitit' : ''}${UI.bifate.has(v.k) ? ' bifat' : ''}${UI.fir && v.f && UI.fir.cheie === v.f.cheie && UI.fir.zona === v.f.zona ? ' sel' : ''}`;
        if (outlook()) {
          return h('li', { class: `${cls} ol`, tabindex: '0', 'data-k': v.k, onclick: deschideRand, onkeydown: (e) => { if (e.key === 'Enter') deschideRand(); } },
            h('div', { class: 'ol-av' }, avatar(x.de.nume, x.de.adresa), bif),
            h('div', { class: 'ol-text' },
              h('div', { class: 'ol-r1' }, h('span', { class: 'cine' }, cine), nr2, hover),
              h('div', { class: 'ol-r2' }, h('span', { class: 'subiect' }, x.subiect || '(fără subiect)'), ataseaza.length ? svg(I.agrafa, 'ap-posta-ico mic') : null, timp),
              h('div', { class: 'ol-r3' }, chipuri, h('span', { class: 'fragment' }, fragment(x) || 'Nu există previzualizare disponibilă.'))),
            btnStea);
        }
        return h('li', { class: cls, tabindex: '0', 'data-k': v.k, onclick: deschideRand, onkeydown: (e) => { if (e.key === 'Enter') deschideRand(); } },
          h('div', { class: 'r-stanga' }, bif, btnStea, btnImp),
          h('div', { class: 'r-cine' }, h('span', { class: 'cine-t' }, cine), nr2),
          h('div', { class: 'r-mijloc' },
            h('div', { class: 'r-linie' }, chipuri, h('span', { class: 'subiect' }, x.subiect || '(fără subiect)'), h('span', { class: 'fragment' }, ` - ${fragment(x)}`)),
            ataseaza.length && ST_().densitate === 'prestabilita' ? h('div', { class: 'r-atas' }, ataseaza.slice(0, 3).map((a) => h('button', { type: 'button', class: `ap-posta-atas-mic t-${tipFisier(a.nume)}`, onclick: (e) => { e.stopPropagation(); const m2 = v.m.find((y) => y.atasamente.includes(a)); if (m2) { deschideFir(v.f, m2.id); previzualizeaza(a, m2); } } }, iconFisier(a.nume), h('span', {}, a.nume))), ataseaza.length > 3 ? h('span', { class: 'ap-posta-mic' }, `+${ataseaza.length - 3}`) : null) : null),
          h('div', { class: 'r-dreapta' }, ataseaza.length && ST_().densitate !== 'prestabilita' ? svg(I.agrafa, 'ap-posta-ico mic') : null, timp, hover));
      }

      // ---------- Conversația deschisă ----------
      function deschideFir(f, idClic) {
        if (!f) return;
        UI.fir = f; UI.extinse = new Set();
        const msj = firMesaje(f);
        for (const x of msj) if (!x.citit) { UI.extinse.add(x.id); x.citit = true; }
        if (idClic) UI.extinse.add(idClic);
        if (msj.length) UI.extinse.add(msj[msj.length - 1].id);
        if (UI.cautare && msj.some((x) => x.id === 'm-serbare') && norm(UI.cautare).includes('serbare')) bifeaza('cautare');
        salveaza(); randeaza();
        citireEl.scrollTop = 0;
      }
      function deschide(id) {
        const x = gaseste(id);
        if (!x) return;
        if (x.dosar === 'ciorne') return compuneDinCiorna(x);
        UI.vedere = 'lista';
        deschideFir({ cheie: firKey(x), zona: zonaDe(x) }, id);
        setTimeout(() => citireEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }), 0);
      }
      function inapoiLaLista() { UI.fir = null; randeaza(); }
      function vecin(dir) {
        const l = conversatii().filter((v) => v.f);
        const i = l.findIndex((v) => UI.fir && v.f.cheie === UI.fir.cheie && v.f.zona === UI.fir.zona);
        return l[i + dir] || null;
      }

      function randeazaCitire() {
        const msj = firMesaje();
        if (!msj.length) {
          return umple(citireEl, h('div', { class: 'ap-posta-gol mare' }, svg(I.necitit, 'ap-posta-ico urias'),
            h('p', {}, outlook() ? 'Selectați un element pentru a-l citi' : 'Nicio conversație selectată'),
            h('p', { class: 'ap-posta-mic' }, 'Scurtături: C – mesaj nou · R – răspunde · A – răspunde tuturor · F – redirecționează · E – arhivează · # – șterge · / – căutare · ? – toate scurtăturile')));
        }
        const ids = msj.map((x) => x.id);
        const ultim = msj[msj.length - 1];
        const primit = [...msj].reverse().find((x) => x.de.adresa !== eu()) || ultim;
        const zona = UI.fir.zona;
        const l = conversatii().filter((v) => v.f);
        const poz = l.findIndex((v) => v.f.cheie === UI.fir.cheie && v.f.zona === zona);
        const sep = () => h('span', { class: 'ap-posta-sep' });
        const unelte = outlook() ? null : h('div', { class: 'ap-posta-unelte citire' },
          corp.classList.contains('impartit') ? null : ib(I.inapoi, `Înapoi la ${UI.cautare ? 'Rezultatele căutării' : numeDosar(UI.dosar)}`, inapoiLaLista),
          zona === 'sterse' ? [h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => restaureaza(msj) }, T('restaurare')), h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => sterge(ids) }, T('stergeDef'))]
            : zona === 'spam' ? [h('button', { type: 'button', class: 'ap-posta-btn-text', onclick: () => nuESpam(ids) }, T('nuSpam')), ib(I.sterse, T('stergeDef'), () => sterge(ids))]
              : [msj.some((x) => x.dosar === 'primite' || x.dosar === 'amanate') ? ib(I.arhiveaza, T('arhiveaza'), () => arhiveaza(ids)) : msj.some((x) => x.dosar === 'arhiva') ? ib(I.primite, 'Mută în Mesaje primite', () => muta(ids, 'primite')) : null,
                primit.de.adresa !== eu() ? ib(I.spam, T('spamBtn'), () => raporteazaSpam(ids)) : null, ib(I.sterse, T('sterge'), () => sterge(ids))],
          sep(),
          ib(I.necitit, T('necitit'), () => { marcheaza(ids, false); inapoiLaLista(); }),
          zona === 'normal' ? ib(I.ceas, T('amana'), (e) => meniuAmanare(e.currentTarget, ids)) : null,
          sep(),
          ib(I.dosar, T('mutaIn'), (e) => meniuMuta(e.currentTarget, ids)),
          zona === 'normal' ? ib(I.eticheta, T('eticheteaza'), (e) => meniuEtichetare(e.currentTarget, ids)) : null,
          ib(I.puncte, 'Mai multe', (e) => meniu(e.currentTarget, meniuMesaj(primit, ids, true))),
          h('span', { class: 'ap-posta-umple' }),
          h('span', { class: 'ap-posta-pag' }, `${poz + 1} din ${l.length}`),
          ib(I.stanga, 'Mai noi', () => { const v = vecin(-1); if (v) deschideFir(v.f); }, { attr: { disabled: poz <= 0 } }),
          ib(I.dreapta, 'Mai vechi', () => { const v = vecin(1); if (v) deschideFir(v.f); }, { attr: { disabled: poz >= l.length - 1 } }));
        const ets = [...new Set(msj.flatMap((x) => x.etichete))].map(eticheta).filter(Boolean);
        const chipuri = [
          msj.some((x) => x.dosar === 'primite') ? h('span', { class: 'ap-posta-et mare' }, T('primite'), h('button', { type: 'button', 'aria-label': 'Elimină eticheta Mesaje primite (arhivează)', 'data-tip': 'Elimină eticheta', onclick: () => arhiveaza(ids) }, svg(I.inchide))) : null,
          zona !== 'normal' ? h('span', { class: 'ap-posta-et mare' }, numeDosar(zona)) : null,
          ets.map((e) => { const c = h('span', { class: 'ap-posta-et mare col' }, e.nume, h('button', { type: 'button', 'aria-label': `Elimină eticheta ${e.nume}`, 'data-tip': 'Elimină eticheta', onclick: () => { msj.forEach((x) => { x.etichete = x.etichete.filter((y) => y !== e.id); if (x.dosar === e.id) x.dosar = 'arhiva'; }); salveaza(); randeaza(); } }, svg(I.inchide))); c.style.background = e.culoare; return c; })];
        const ph = msj.find((x) => x.phishing);
        const banner = ph && ph.raportat ? h('div', { class: 'ap-posta-avert rosu' }, svg(I.pericol),
          h('div', {}, h('b', {}, 'Acest mesaj pare periculos'),
            h('p', {}, 'Mesaje similare au fost folosite pentru a fura informațiile personale ale utilizatorilor. Nu da clic pe linkuri, nu descărca atașamentele și nu răspunde cu informații personale.'),
            h('details', {}, h('summary', {}, 'De ce? Vezi indiciile'), h('ul', {}, (ph.indicii || []).map((t) => h('li', {}, t)))),
            h('div', { class: 'btns' }, h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => nuESpam(ids) }, 'Nu pare periculos'))))
          : ph && ph.atasamente.some((a) => tipFisier(a.nume) === 'exe') && zona === 'normal' ? h('div', { class: 'ap-posta-avert galben' }, svg(I.pericol),
            h('div', {}, h('b', {}, 'Fii atent la acest mesaj'),
              h('p', {}, 'Conține un atașament de tip program (.exe), care ar putea fi dăunător. Nu-l deschide dacă nu ai încredere în expeditor.'),
              h('div', { class: 'btns' }, h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => raporteazaPhishing(ids) }, 'Raportează phishing'), h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => { toast('Bine. Dar verifică totuși adresa reală a expeditorului!'); } }, 'Pare sigur'))))
            : zona === 'spam' ? h('div', { class: 'ap-posta-avert gri' }, svg(I.info), h('div', {}, h('b', {}, 'De ce este acest mesaj în Spam? '), 'Este similar cu mesajele identificate de filtrele noastre pentru spam.', h('div', { class: 'btns' }, h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => nuESpam(ids) }, 'Raportează ca nefiind spam'))))
              : null;
        const intelig = ST_().raspInteligente && zona === 'normal' && primit.de.adresa !== eu() && !primit.phishing && !primit.sistem && !ALTE_NUME[primit.de.adresa] ? raspunsuriInteligente(primit) : [];
        umple(citireEl,
          unelte,
          h('div', { class: 'ap-posta-fir' },
            h('div', { class: 'ap-posta-fir-cap' }, h('h2', {}, ultim.subiect ? subiectFaraPrefix(msj) : '(fără subiect)'), h('span', { class: 'chipuri' }, chipuri),
              h('span', { class: 'ap-posta-umple' }), ib(I.imprima, 'Printează tot', () => window.print?.())),
            banner,
            msj.length > 3 && msj.slice(1, -2).every((x) => !UI.extinse.has(x.id)) ? [cardMesaj(msj[0], false), h('button', { type: 'button', class: 'ap-posta-mai-vechi', onclick: () => { msj.forEach((x) => UI.extinse.add(x.id)); randeazaCitire(); } }, h('span', {}, String(msj.length - 3)), 'mesaje mai vechi'), msj.slice(-2).map((x, i) => cardMesaj(x, i === 1))]
              : msj.map((x, i) => cardMesaj(x, i === msj.length - 1)),
            intelig.length ? h('div', { class: 'ap-posta-intelig' }, intelig.map((t) => h('button', { type: 'button', onclick: () => compune({ mod: 'raspuns', ref: primit, text: t }) }, t))) : null,
            zona === 'normal' || zona === 'spam' ? h('div', { class: 'ap-posta-actiuni' },
              h('button', { type: 'button', class: 'ap-posta-act', onclick: () => compune({ mod: 'raspuns', ref: primit }) }, svg(I.raspunde), T('raspuns')),
              [...primit.catre, ...primit.cc].filter((a) => a !== eu()).length + (primit.de.adresa !== eu() ? 1 : 0) > 1 ? h('button', { type: 'button', class: 'ap-posta-act', onclick: () => compune({ mod: 'raspuns-tuturor', ref: primit }) }, svg(I.toti), T('toti')) : null,
              h('button', { type: 'button', class: 'ap-posta-act', onclick: () => compune({ mod: 'redirectionare', ref: ultim }) }, svg(I.redir), T('redir'))) : null));
      }
      const subiectFaraPrefix = (msj) => { const s = msj[0].subiect || msj[msj.length - 1].subiect; return s; };
      function raspunsuriInteligente(x) {
        const R = { 'm-tema': ['Mulțumesc, am primit!', 'Mă apuc de ea azi.', 'Am o întrebare.'], 'm-excursie': ['Da, vin!', 'Din păcate, nu pot veni.', 'Mulțumesc pentru anunț!'],
          'm-bunica': ['La mulți ani, bunico!', 'Sigur vin!', 'Abia aștept!'], 'm-andrei': ['Da, ți-o trimit până joi.', 'Ok, mă ocup!', 'Mersi, Andrei!'], 'm-ioana': ['Sigur, îți scriu imediat.', 'Da, uite ce am avut:', 'Te sun diseară.'],
          'm-robotica': ['Vin sigur!', 'Mulțumesc pentru anunț!', 'Ce trebuie să aduc?'], 'm-serbare': ['Am înțeles, mulțumesc!', 'Vin la repetiție.', 'Învăț versurile!'], 's-sara': ['Îmi place mult!', 'Arată super!', 'Bravo, Sara!'] };
        return R[x.id] || (/\?/.test(htmlLaText(x.html)) ? ['Da, sigur!', 'Nu, mulțumesc.', 'Mă mai gândesc.'] : ['Mulțumesc!', 'Am primit, mersi!', 'Super!']);
      }
      function meniuMesaj(x, ids, tot) {
        const trimisDeMine = x.de.adresa === eu();
        return [
          optiune(T('raspuns'), () => compune({ mod: 'raspuns', ref: x }), { ico: I.raspunde }),
          optiune(T('toti'), () => compune({ mod: 'raspuns-tuturor', ref: x }), { ico: I.toti }),
          optiune(T('redir'), () => compune({ mod: 'redirectionare', ref: x }), { ico: I.redir }),
          h('hr'),
          tot ? optiune(x.importantMarcaj ? 'Marchează ca neimportant' : 'Marchează ca important', () => { const v = !x.importantMarcaj; ids.forEach((id) => { gaseste(id).importantMarcaj = v; }); salveaza(); randeaza(); }, { ico: I.important }) : null,
          !trimisDeMine && !inafara(x) ? optiune('Raportează spam', () => raporteazaSpam(ids), { ico: I.spam }) : null,
          !trimisDeMine && x.dosar !== 'sterse' ? optiune('Raportează phishing', () => raporteazaPhishing(ids), { ico: I.pericol, cls: 'pericol' }) : null,
          !trimisDeMine && !contactDupa(x.de.adresa) && !x.sistem ? optiune(`Adaugă pe ${x.de.nume || x.de.adresa} în agendă`, () => adaugaContact(x.de.nume, x.de.adresa), { ico: I.agenda }) : null,
          !tot ? optiune('Șterge acest mesaj', () => sterge([x.id]), { ico: I.sterse }) : null,
          !tot ? optiune(T('necitit'), () => { marcheaza([x.id], false); }, { ico: I.necitit }) : null,
          optiune('Descarcă mesajul (.eml)', () => salveazaEml(x), { ico: I.salveaza }),
          optiune('Afișează originalul', () => afiseazaOriginal(x), { ico: I.fisier }),
        ];
      }
      function cardMesaj(x, ultimul) {
        const trimisDeMine = x.de.adresa === eu();
        const extins = UI.extinse.has(x.id) || ultimul;
        const catreScurt = () => {
          const lista = [...x.catre, ...x.cc, ...(trimisDeMine ? x.cci : x.cci.filter((y) => y === eu()))];
          return lista.length ? lista.map((a) => (a === eu() ? 'mine' : scurt(a))).join(', ') : 'destinatari nedezvăluiți';
        };
        if (!extins) {
          return h('div', { class: 'ap-posta-msg restrans', 'data-id': x.id, tabindex: '0', onclick: () => { UI.extinse.add(x.id); randeazaCitire(); }, onkeydown: (e) => { if (e.key === 'Enter') { UI.extinse.add(x.id); randeazaCitire(); } } },
            avatar(x.de.nume, x.de.adresa), h('b', { class: 'nume' }, trimisDeMine ? 'eu' : x.de.nume || x.de.adresa),
            h('span', { class: 'fragment' }, fragment(x)), x.atasamente.length ? svg(I.agrafa, 'ap-posta-ico mic') : null, h('time', {}, oraScurta(x.data)));
        }
        const corpMesaj = h('div', { class: 'ap-posta-text' }, parseaza(x.html));
        corpMesaj.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) { e.preventDefault(); clicLink(a.getAttribute('href') || '', x); } });
        corpMesaj.addEventListener('mouseover', (e) => { const a = e.target.closest('a'); stareLink.textContent = a ? a.getAttribute('href') || '' : ''; stareLink.classList.toggle('vizibil', !!a); });
        corpMesaj.addEventListener('mouseleave', () => stareLink.classList.remove('vizibil'));
        const btnDetalii = h('button', { type: 'button', class: 'ap-posta-catre', 'aria-label': 'Afișează detaliile', onclick: (e) => { e.stopPropagation(); detaliiMesaj(x, e.currentTarget); } }, `către ${catreScurt()} `, svg(I.jos, 'ap-posta-ico mic'));
        const cap = h('div', { class: 'ap-posta-msg-cap', onclick: (e) => { if (e.target.closest('button')) return; if (!ultimul) { UI.extinse.delete(x.id); randeazaCitire(); } } },
          h('div', { class: 'cine' },
            h('div', { class: 'linie1' }, h('b', {}, trimisDeMine ? numeleMeu() : x.de.nume || x.de.adresa), ' ', h('span', { class: 'ap-posta-adresa' }, `<${x.de.adresa}>`),
              !trimisDeMine && !contactDupa(x.de.adresa) && !x.sistem ? h('button', { type: 'button', class: 'ap-posta-link mic', onclick: () => adaugaContact(x.de.nume, x.de.adresa) }, 'Adaugă la contacte') : null),
            h('div', { class: 'linie2' }, btnDetalii)),
          h('div', { class: 'dreapta' },
            x.atasamente.length ? svg(I.agrafa, 'ap-posta-ico mic') : null,
            h('time', { 'data-tip': dataLunga(x.data) }, dataMesaj(x.data)),
            h('button', { type: 'button', class: `ap-posta-stea${x.important ? ' on' : ''}`, 'data-tip': x.important ? 'Cu stea' : 'Fără stea', 'aria-label': 'Stea', onclick: () => { x.important = !x.important; salveaza(); randeazaCitire(); randeazaNav(); } }, svg(I.stea)),
            ib(I.raspunde, T('raspuns'), () => compune({ mod: 'raspuns', ref: x })),
            ib(I.puncte, 'Mai multe', (e) => meniu(e.currentTarget, meniuMesaj(x, [x.id], false), { dreapta: true }))));
        return h('div', { class: 'ap-posta-msg', 'data-id': x.id },
          avatar(trimisDeMine ? S.prenume : x.de.nume, x.de.adresa, 'mare'),
          h('div', { class: 'ap-posta-msg-corp' }, cap, corpMesaj,
            x.atasamente.length ? h('div', { class: 'ap-posta-atasamente' },
              h('div', { class: 'ap-posta-atas-cap' }, h('b', {}, `${x.atasamente.length} ${x.atasamente.length === 1 ? 'atașament' : 'atașamente'}`), ' • Scanate de EduMail ', svg(I.lacat, 'ap-posta-ico mic')),
              h('div', { class: 'ap-posta-carduri' }, x.atasamente.map((a) => cardAtasament(a, x)))) : null));
      }
      function detaliiMesaj(x, ancora) {
        const trimisDeMine = x.de.adresa === eu();
        const rand = (lbl, val) => (val ? h('tr', {}, h('th', {}, lbl), h('td', {}, val)) : null);
        const adr = (a) => a.map((y) => (numeDupa(y) === y || numeDupa(y) === 'eu' ? y : `${numeDupa(y)} <${y}>`)).join(', ');
        meniu(ancora, h('table', { class: 'ap-posta-detalii' }, h('tbody', {},
          rand('de la:', `${x.de.nume || ''} <${x.de.adresa}>`), rand('către:', adr(x.catre) || 'destinatari nedezvăluiți'), rand('cc:', x.cc.length ? adr(x.cc) : ''),
          rand('cci:', trimisDeMine && x.cci.length ? adr(x.cci) : x.cci.includes(eu()) ? eu() : ''),
          rand('data:', dataLunga(x.data)), rand('subiect:', x.subiect || '(fără subiect)'),
          rand('trimis prin:', x.de.adresa.split('@')[1]),
          rand('securitate:', x.phishing ? '⚠ Expeditor neverificat' : 'Criptare standard (TLS)'))), { cls: 'detalii' });
      }
      function afiseazaOriginal(x) {
        const linii = [`De la: ${x.de.nume} <${x.de.adresa}>`, `Către: ${x.catre.join(', ') || 'undisclosed-recipients:;'}`, x.cc.length ? `Cc: ${x.cc.join(', ')}` : null, `Subiect: ${x.subiect}`, `Data: ${new Date(x.data).toUTCString()}`,
          `Message-ID: <${x.id}@${x.de.adresa.split('@')[1]}>`, `SPF: ${x.phishing ? 'FAIL (domeniul nu este cel pretins)' : 'PASS'}`, '', htmlLaText(x.html)].filter((y) => y != null);
        dialog('Mesajul original', [h('pre', { class: 'ap-posta-original' }, linii.join('\n'))], [{ text: 'Închide', cls: 'principal' }]);
      }

      // ---------- Atașamente: carduri, pictograme, previzualizare ----------
      const tipFisier = (n) => (/\.(exe|bat|scr|msi|com)$/i.test(n) ? 'exe' : /\.(jpe?g|png|gif|webp)$/i.test(n) ? 'img' : /\.pdf$/i.test(n) ? 'pdf' : /\.(docx?|odt)$/i.test(n) ? 'doc' : /\.(pptx?)$/i.test(n) ? 'ppt' : /\.zip$/i.test(n) ? 'zip' : /\.(mp4|avi|mov)$/i.test(n) ? 'vid' : /\.(xlsx?|ods)$/i.test(n) ? 'xls' : 'alt');
      const TIP_FISIER = { pdf: ['#EA4335', 'PDF'], img: ['#D93025', '▲'], doc: ['#4285F4', 'W'], ppt: ['#F29900', 'P'], xls: ['#188038', 'X'], zip: ['#5F6368', 'ZIP'], vid: ['#C5221F', '▶'], exe: ['#5F6368', 'EXE'], alt: ['#5F6368', '…'] };
      const iconFisier = (n) => { const [c, t] = TIP_FISIER[tipFisier(n)]; return h('span', { class: 'ap-posta-tipf', 'aria-hidden': 'true', html: `<svg viewBox="0 0 20 20"><rect width="20" height="20" rx="3" fill="${c}"/><text x="10" y="14" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${t.length > 2 ? 6.5 : 10}" fill="#fff">${t}</text></svg>` }); };
      function cardAtasament(a, x) {
        const t = tipFisier(a.nume);
        const imagine = IMAGINI[a.nume];
        const pdf = PDFURI[a.nume];
        const prev = h('div', { class: `previz t-${t}` });
        if (imagine) { const im = h('img', { src: imagine, alt: '' }); prev.append(im); }
        else if (pdf) prev.append(h('div', { class: 'foaie-mica' }, h('b', {}, pdf[0].titlu), pdf[0].randuri.slice(0, 6).map((r) => h('span', {}, r))));
        else prev.append(h('span', { class: 'mare-ico' }, iconFisier(a.nume)));
        return h('div', { class: `ap-posta-card-atas t-${t}`, tabindex: '0', role: 'button', 'aria-label': `Previzualizează atașamentul ${a.nume}`, onclick: () => previzualizeaza(a, x), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); previzualizeaza(a, x); } } },
          prev,
          h('div', { class: 'jos' }, iconFisier(a.nume), h('span', { class: 'nume' }, a.nume)),
          h('div', { class: 'acoperire' }, h('div', { class: 'sus-nume' }, h('b', {}, a.nume), h('small', {}, marime(a.marime))),
            h('div', { class: 'btns' }, ib(I.salveaza, `Descarcă atașamentul ${a.nume}`, (e) => { e.stopPropagation(); descarcaAtasament(a, x); }))));
      }
      function descarcaAtasament(a, x) {
        if (tipFisier(a.nume) === 'exe') return previzualizeaza(a, x);
        toast(`„${a.nume}” (${marime(a.marime)}): în simulator, atașamentele nu se descarcă pe calculator.`);
      }
      function previzualizeaza(a, x) {
        if (tipFisier(a.nume) === 'exe') {
          dialog('Atașament blocat', [
            h('p', {}, h('b', {}, a.nume), ' este un program (.exe), nu o poză. EduMail l-a blocat deoarece ar putea răspândi viruși.'),
            h('p', {}, 'Nu deschide atașamente neașteptate, mai ales .exe sau .zip de la necunoscuți. Scanează-le cu antivirusul și raportează mesajul.')],
          [x.dosar !== 'spam' ? { text: 'Raportează phishing', fn: () => raporteazaPhishing([x.id]) } : null, { text: 'Nu-l deschid', cls: 'principal' }].filter(Boolean));
          return;
        }
        radacina.querySelectorAll('.ap-posta-viz').forEach((y) => y.remove());
        const imagine = IMAGINI[a.nume], pdf = PDFURI[a.nume];
        if (imagine || pdf) bifeaza('atasament');
        let zoom = 1;
        const zona = h('div', { class: 'ap-posta-viz-zona' });
        const continut = h('div', { class: 'ap-posta-viz-continut' });
        if (imagine) continut.append(h('img', { src: imagine, alt: a.nume, class: 'ap-posta-viz-img' }));
        else if (pdf) continut.append(...pdf.map((p, i) => h('div', { class: 'ap-posta-viz-pagina' }, h('h1', {}, p.titlu), p.sub ? h('p', { class: 'sub' }, p.sub) : null, p.randuri.map((r) => h('p', {}, r || ' ')), h('footer', {}, `Pagina ${i + 1} din ${pdf.length}`))));
        else continut.append(h('div', { class: 'ap-posta-viz-fara' }, iconFisier(a.nume), h('p', {}, 'Nu există o previzualizare disponibilă.'), h('p', { class: 'ap-posta-mic' }, `${a.nume} · ${marime(a.marime)}`),
          h('button', { type: 'button', class: 'ap-posta-b plin', onclick: () => descarcaAtasament(a, x) }, svg(I.salveaza), 'Descarcă')));
        zona.append(continut);
        const aplicaZoom = () => { continut.style.transform = `scale(${zoom})`; eticZoom.textContent = `${Math.round(zoom * 100)}%`; };
        const eticZoom = h('span', {}, '100%');
        const lista = x.atasamente;
        let idx = lista.indexOf(a);
        const v = h('div', { class: 'ap-posta-viz', role: 'dialog', 'aria-label': `Previzualizare: ${a.nume}`, tabindex: '-1' },
          h('div', { class: 'ap-posta-viz-sus' },
            ib(I.inapoi, 'Închide', () => inchide()), iconFisier(a.nume), h('span', { class: 'nume' }, a.nume),
            h('span', { class: 'ap-posta-umple' }),
            ib(I.imprima, 'Printează', () => toast('Printarea nu este disponibilă în simulator.')),
            ib(I.salveaza, 'Descarcă', () => descarcaAtasament(a, x)),
            ib(I.inchide, 'Închide (Esc)', () => inchide())),
          zona,
          lista.length > 1 ? [ib(I.stanga, 'Anterior', () => { inchide(); previzualizeaza(lista[(idx - 1 + lista.length) % lista.length], x); }, { cls: 'viz-nav st' }),
            ib(I.dreapta, 'Următorul', () => { inchide(); previzualizeaza(lista[(idx + 1) % lista.length], x); }, { cls: 'viz-nav dr' })] : null,
          imagine || pdf ? h('div', { class: 'ap-posta-viz-zoom' }, ib(I.minus, 'Micșorează', () => { zoom = Math.max(.5, zoom - .25); aplicaZoom(); }), eticZoom, ib(I.plus, 'Mărește', () => { zoom = Math.min(2.5, zoom + .25); aplicaZoom(); })) : null);
        const inchide = () => v.remove();
        v.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); inchide(); } });
        zona.addEventListener('click', (e) => { if (e.target === zona) inchide(); });
        radacina.append(v); v.focus();
      }

      // ---------- Acțiuni pe mesaje ----------
      function muta(ids, dosar) {
        let restaurat = false, etichetat = false;
        for (const id of ids) {
          const x = gaseste(id); if (!x) continue;
          if (x.dosar === 'sterse' && dosar !== 'sterse') restaurat = true;
          if (dosar === 'sterse' && x.dosar !== 'sterse') x.dosarInainte = x.dosar;
          if (dosar === 'spam' && x.phishing) x.raportat = true;
          if (eticheta(dosar)) {
            if (!x.etichete.includes(dosar)) { x.etichete.push(dosar); etichetat = true; }
            if (['primite', 'amanate', 'sterse', 'spam'].includes(x.dosar)) x.dosar = x.de.adresa === eu() && x.dosar !== 'primite' ? 'trimise' : 'arhiva';
          } else if (dosar === 'primite' && x.de.adresa === eu() && x.dosar !== 'primite') x.dosar = x.dosarInainte === 'ciorne' ? 'ciorne' : 'trimise';
          else x.dosar = dosar;
        }
        UI.bifate.clear();
        if (UI.fir && !firMesaje().length) UI.fir = null;
        if (UI.fir && (dosar === 'sterse' || dosar === 'spam' || eticheta(dosar))) UI.fir = null;
        salveaza(); verificaPhishing();
        if (restaurat) bifeaza('restaurare');
        if (etichetat) bifeaza('eticheta');
        randeaza();
        toast(`${ids.length === 1 ? 'Conversația a fost mutată' : `${ids.length} conversații au fost mutate`} în „${numeDosar(dosar)}”.`);
      }
      function arhiveaza(ids) {
        const vechi = [];
        for (const id of ids) { const x = gaseste(id); if (x && (x.dosar === 'primite' || x.dosar === 'amanate')) { vechi.push([x, x.dosar]); x.dosar = 'arhiva'; } }
        if (!vechi.length) return toast('Conversația nu se află în Mesaje primite.');
        UI.bifate.clear(); UI.fir = null; salveaza(); bifeaza('arhivare'); randeaza();
        toast(vechi.length === 1 ? 'Conversația a fost arhivată.' : `${vechi.length} conversații au fost arhivate.`, { actiune: { text: 'Anulează', fn: () => { vechi.forEach(([x, d]) => { x.dosar = d; }); salveaza(); randeaza(); toast('Acțiune anulată.'); } } });
      }
      function sterge(ids) {
        const inCos = ids.filter((id) => ['sterse', 'spam'].includes(gaseste(id)?.dosar));
        if (inCos.length) {
          return dialog('Ștergi definitiv?', [h('p', {}, `${inCos.length === 1 ? 'Mesajul va dispărea' : `${inCos.length} mesaje vor dispărea`} pentru totdeauna, împreună cu atașamentele. Nu le mai poți recupera.`)],
            [{ text: 'Anulează' }, { text: 'OK', cls: 'principal', fn: () => { S.mesaje = S.mesaje.filter((x) => !inCos.includes(x.id)); UI.bifate.clear(); UI.fir = null; salveaza(); randeaza(); toast(inCos.length === 1 ? 'Conversația a fost ștearsă definitiv.' : `${inCos.length} conversații au fost șterse definitiv.`); } }]);
        }
        const ciorne = ids.filter((id) => gaseste(id)?.dosar === 'ciorne');
        const vechi = ids.map((id) => [id, gaseste(id)?.dosar]);
        for (const id of ids) { const x = gaseste(id); if (x) { x.dosarInainte = x.dosar; x.dosar = 'sterse'; } }
        UI.fir = null; UI.bifate.clear(); salveaza(); randeaza();
        toast(ciorne.length && ciorne.length === ids.length ? 'Ciornele au fost eliminate.' : `${ids.length === 1 ? 'Conversația a fost mutată' : `${ids.length} conversații au fost mutate`} în ${T('sterse')}.`, {
          actiune: { text: 'Anulează', fn: () => { for (const [id, d] of vechi) { const x = gaseste(id); if (x) x.dosar = d; } salveaza(); randeaza(); toast('Acțiune anulată.'); } } });
      }
      function restaureaza(msj) {
        for (const x of msj) {
          const d = x.dosarInainte;
          x.dosar = DOSARE_REALE.includes(d) && d !== 'sterse' ? d : eticheta(d) ? 'arhiva' : (x.de.adresa === eu() ? 'trimise' : 'primite');
          if (eticheta(d) && !x.etichete.includes(d)) x.etichete.push(d);
        }
        salveaza(); bifeaza('restaurare');
        toast(`Conversația a fost mutată în „${numeDosar(msj[0].dosar)}”.`);
        UI.fir = null; randeaza();
      }
      function golește() {
        const d = UI.dosar;
        dialog(d === 'sterse' ? 'Confirmă ștergerea mesajelor' : 'Confirmă ștergerea mesajelor spam', [h('p', {}, `Această acțiune va afecta toate conversațiile din ${numeDosar(d)}. Sigur vrei să continui?`)], [{ text: 'Anulează' },
          { text: 'OK', cls: 'principal', fn: () => { S.mesaje = S.mesaje.filter((x) => x.dosar !== d); UI.fir = null; salveaza(); randeaza(); } }]);
      }
      function marcheaza(ids, citit) { for (const id of ids) { const x = gaseste(id); if (x) x.citit = citit; } UI.bifate.clear(); salveaza(); randeaza(); }
      function raporteazaSpam(ids) {
        const fis = ids.map(gaseste).filter((x) => x?.phishing);
        muta(ids, 'spam');
        if (fis.length === 1 && fis[0].indicii) arataIndicii(fis[0]);
      }
      function raporteazaPhishing(ids) {
        dialog('Raportează un mesaj de phishing', [h('p', {}, 'Acest mesaj va fi trimis echipei EduMail pentru analiză și va fi mutat în Spam. Raportezi mesajul dacă îți cere parola sau date personale, sau dacă se dă drept altcineva.')],
          [{ text: 'Anulează' }, { text: 'Raportează mesajul de phishing', cls: 'principal', fn: () => {
            const msj = ids.map(gaseste).filter(Boolean);
            const fis = msj.filter((x) => x.phishing);
            msj.forEach((x) => { x.raportatPhishing = true; });
            muta(ids, 'spam');
            if (fis.length === 1 && fis[0].indicii) setTimeout(() => arataIndicii(fis[0]), 50);
            else if (!fis.length) setTimeout(() => toast('Mulțumim. Totuși, mesajul nu pare înșelător: verifică încă o dată expeditorul.', { tip: 'avert', durata: 6500 }), 50);
          } }]);
      }
      function arataIndicii(x) {
        dialog('Bine ai observat! Era un mesaj înșelător', [h('p', {}, 'Iată indiciile care l-au dat de gol:'), h('ul', {}, x.indicii.map((t) => h('li', {}, t))),
          h('p', { class: 'ap-posta-mic' }, 'Într-o căsuță reală, spune-i și unui adult când primești un astfel de mesaj.')], [{ text: 'Am înțeles', cls: 'principal' }]);
      }
      function nuESpam(ids) {
        ids.forEach((id) => { const x = gaseste(id); if (x) { x.raportat = false; } });
        muta(ids, 'primite');
      }
      function verificaPhishing() {
        const n = S.mesaje.filter((x) => x.phishing && x.raportat).length;
        if (n >= 3) bifeaza('phishing');
        else if (n !== S.phishingAnunt && n > 0) { S.phishingAnunt = n; toast(`Misiune: ${n} din 3 mesaje înșelătoare raportate.`); }
      }
      function amana(ids, pana) {
        let n = 0;
        for (const id of ids) { const x = gaseste(id); if (x && !inafara(x) && x.dosar !== 'ciorne') { x.dosarAmanat = x.dosar; x.dosar = 'amanate'; x.amanatPana = pana; x.citit = true; n++; } }
        UI.bifate.clear(); UI.fir = null; salveaza(); randeaza();
        if (n) toast(`Conversația a fost amânată până la ${new Date(pana).toLocaleString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`, { actiune: { text: 'Anulează', fn: () => { ids.forEach((id) => { const x = gaseste(id); if (x?.dosar === 'amanate') { x.dosar = x.dosarAmanat || 'primite'; delete x.amanatPana; } }); salveaza(); randeaza(); } } });
      }
      function meniuAmanare(ancora, ids) {
        const d = new Date();
        const la = (zile, ora) => { const t = new Date(d); t.setDate(t.getDate() + zile); t.setHours(ora, 0, 0, 0); return t.getTime(); };
        const pana18 = d.getHours() < 17 ? la(0, 18) : Date.now() + 3 * 3600e3;
        const sambata = la(((6 - d.getDay()) + 7) % 7 || 7, 8);
        const luni = la(((8 - d.getDay()) % 7) || 7, 8);
        const f = (t) => new Date(t).toLocaleString('ro-RO', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        meniu(ancora, [h('div', { class: 'ap-posta-meniu-titlu' }, 'Amână până la...'),
          optiune('Peste 1 minut (pentru exersare)', () => amana(ids, Date.now() + 60e3), { dreapta: new Date(Date.now() + 60e3).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) }),
          optiune('Mai târziu azi', () => amana(ids, pana18), { dreapta: f(pana18) }),
          optiune('Mâine', () => amana(ids, la(1, 8)), { dreapta: f(la(1, 8)) }),
          optiune('Weekendul acesta', () => amana(ids, sambata), { dreapta: f(sambata) }),
          optiune('Săptămâna viitoare', () => amana(ids, luni), { dreapta: f(luni) })], { cls: 'amanare' });
      }
      function meniuMuta(ancora, ids) {
        const f = h('input', { type: 'text', placeholder: 'Caută', 'aria-label': 'Caută dosarul' });
        const lista = h('div', { class: 'ap-posta-meniu-lista' });
        const opt = [['primite', T('primite')], ...S.dosare.map((d) => [d.id, d.nume]), ['spam', T('spam')], ['sterse', T('sterse')]];
        const des = () => umple(lista, opt.filter(([, n]) => norm(n).includes(norm(f.value))).map(([id, n]) => optiune(n, () => (id === 'sterse' ? sterge(ids) : id === 'spam' ? raporteazaSpam(ids) : muta(ids, id)))),
          h('hr'), optiune(T('etichetaNoua'), () => etichetaNoua((d) => muta(ids, d.id))));
        f.addEventListener('input', des); des();
        meniu(ancora, [h('div', { class: 'ap-posta-meniu-titlu' }, `${T('mutaIn')}:`), f, lista], { cls: 'cu-cautare' });
      }
      function meniuEtichetare(ancora, ids) {
        const msj = ids.map(gaseste).filter(Boolean);
        const stare = new Map(S.dosare.map((d) => [d.id, msj.every((x) => x.etichete.includes(d.id)) ? true : msj.some((x) => x.etichete.includes(d.id)) ? null : false]));
        const f = h('input', { type: 'text', placeholder: 'Caută', 'aria-label': 'Caută eticheta' });
        const lista = h('div', { class: 'ap-posta-meniu-lista' });
        const btnAplica = h('button', { type: 'button', class: 'ap-posta-b principal', hidden: true, onclick: () => {
          let adaug = false;
          for (const [id, v] of stare) { if (v == null) continue; for (const x of msj) { const are = x.etichete.includes(id); if (v && !are) { x.etichete.push(id); adaug = true; } if (!v && are) { x.etichete = x.etichete.filter((y) => y !== id); if (x.dosar === id) x.dosar = 'arhiva'; } } }
          inchideMeniu(); salveaza(); if (adaug) bifeaza('eticheta'); randeaza(); toast('Etichetele au fost actualizate.');
        } }, 'Aplică');
        const des = () => umple(lista, S.dosare.filter((d) => norm(d.nume).includes(norm(f.value))).map((d) => {
          const c = h('input', { type: 'checkbox', 'aria-label': d.nume });
          c.checked = stare.get(d.id) === true; c.indeterminate = stare.get(d.id) == null;
          c.addEventListener('change', () => { stare.set(d.id, c.checked); btnAplica.hidden = false; });
          const pt = h('span', { class: 'punct' }); pt.style.background = d.culoare;
          return h('label', { class: 'ap-posta-meniu-bif' }, c, pt, d.nume);
        }), S.dosare.length ? null : h('p', { class: 'ap-posta-mic gol' }, 'Nu ai nicio etichetă încă.'),
        h('hr'), optiune(T('etichetaNoua'), () => etichetaNoua((d) => { msj.forEach((x) => { if (!x.etichete.includes(d.id)) x.etichete.push(d.id); }); salveaza(); bifeaza('eticheta'); randeaza(); })), btnAplica);
        f.addEventListener('input', des); des();
        meniu(ancora, [h('div', { class: 'ap-posta-meniu-titlu' }, outlook() ? 'Clasificare:' : 'Etichetează ca:'), f, lista], { cls: 'cu-cautare' });
      }
      function meniuEticheta(d, ancora) {
        const culori = h('div', { class: 'ap-posta-culori' }, CULORI.map((c) => { const b = h('button', { type: 'button', 'aria-label': `Culoarea ${c}`, class: c === d.culoare ? 'on' : '', onclick: () => { d.culoare = c; inchideMeniu(); salveaza(); randeaza(); } }); b.style.background = c; return b; }));
        meniu(ancora, [
          h('div', { class: 'ap-posta-meniu-titlu' }, d.nume),
          outlook() ? optiune('Folder nou', () => etichetaNoua(), { ico: I.plus }) : null,
          outlook() ? null : h('div', { class: 'ap-posta-meniu-sub' }, h('span', {}, 'Culoarea etichetei'), culori),
          optiune(outlook() ? 'Redenumire folder' : 'Editează', () => redenumesteEticheta(d), { ico: I.scrie }),
          optiune(outlook() ? 'Ștergere folder' : 'Șterge eticheta', () => stergeEticheta(d), { ico: I.sterse }),
        ]);
      }
      function etichetaNoua(dupa) {
        const f = h('input', { type: 'text', maxlength: 40, 'aria-label': 'Numele etichetei' });
        const err = h('p', { class: 'ap-posta-eroare' });
        const ok = () => {
          const n = f.value.trim();
          if (!n) { err.textContent = 'Introdu un nume.'; return false; }
          const toateNumele = [...Object.values(TXT.gmail).slice(0, 9), ...Object.values(TXT.outlook).slice(0, 9), ...S.dosare.map((d) => d.nume)];
          if (toateNumele.some((x) => norm(x) === norm(n))) { err.textContent = `Numele „${n}” există deja. Alege alt nume.`; return false; }
          const d = { id: `d-${idNou()}`, nume: n, culoare: CULORI[S.dosare.length % CULORI.length] };
          S.dosare.push(d); salveaza();
          toast(outlook() ? `Folderul „${n}” a fost creat.` : `Eticheta „${n}” a fost creată.`);
          if (dupa) dupa(d); else randeaza();
          return true;
        };
        dialog(outlook() ? 'Folder nou' : 'Etichetă nouă', [h('label', { class: 'ap-posta-camp-dialog' }, outlook() ? 'Numele folderului:' : 'Introdu un nume nou pentru etichetă:', f), err], [{ text: 'Anulează' }, { text: 'Creează', cls: 'principal', fn: ok }], f);
      }
      function redenumesteEticheta(d) {
        const f = h('input', { type: 'text', maxlength: 40, value: d.nume, 'aria-label': 'Numele etichetei' });
        const err = h('p', { class: 'ap-posta-eroare' });
        dialog(outlook() ? 'Redenumire folder' : 'Editează eticheta', [h('label', { class: 'ap-posta-camp-dialog' }, 'Numele etichetei:', f), err], [{ text: 'Anulează' }, { text: 'Salvează', cls: 'principal', fn: () => {
          const n = f.value.trim(); if (!n) { err.textContent = 'Introdu un nume.'; return false; }
          if (S.dosare.some((y) => y !== d && norm(y.nume) === norm(n))) { err.textContent = 'Există deja o etichetă cu acest nume.'; return false; }
          d.nume = n; salveaza(); randeaza(); return true;
        } }], f);
      }
      function stergeEticheta(d) {
        dialog(outlook() ? `Ștergeți folderul „${d.nume}”?` : 'Șterge eticheta', [h('p', {}, outlook() ? 'Mesajele din el se mută în Inbox.' : `Ștergi eticheta „${d.nume}”? Mesajele nu se șterg: îi pierd doar eticheta și rămân în Toate mesajele.`)], [{ text: 'Anulează' }, { text: 'Șterge', cls: 'principal', fn: () => {
          S.mesaje.forEach((x) => { const avea = x.etichete.includes(d.id); x.etichete = x.etichete.filter((y) => y !== d.id); if (outlook() && avea && x.dosar === 'arhiva' && !x.etichete.length) x.dosar = x.de.adresa === eu() ? 'trimise' : 'primite'; });
          S.dosare = S.dosare.filter((y) => y !== d); if (UI.dosar === d.id) UI.dosar = 'primite'; salveaza(); randeaza();
          toast(outlook() ? `Folderul „${d.nume}” a fost șters.` : `Eticheta „${d.nume}” a fost ștearsă.`);
        } }]);
      }

      // ---------- Căutare ----------
      function cauta(q) {
        UI.cautare = q.trim(); UI.fir = null; UI.bifate.clear(); UI.vedere = 'lista';
        randeaza();
      }
      function arataSugestii(optiuni) {
        const q = cautare.value.trim();
        const sug = (ico, text, fn, extra) => h('button', { type: 'button', class: 'ap-posta-sug', onmousedown: (e) => e.preventDefault(), onclick: () => { sugCautare.hidden = true; fn(); },
          onkeydown: (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const b = [...sugCautare.querySelectorAll('button')]; const i = b.indexOf(e.currentTarget); (b[i + (e.key === 'ArrowDown' ? 1 : -1)] || cautare).focus(); } if (e.key === 'Escape') { sugCautare.hidden = true; cautare.focus(); } } }, ico, h('span', { class: 't' }, text), extra);
        const inser = (op) => { cautare.value = `${cautare.value.trim()} ${op}`.trim(); cautare.focus(); if (!op.endsWith(':')) cauta(cautare.value); else arataSugestii(); };
        if (!q || optiuni) {
          const ops = [['from:', 'De la (expeditor), de exemplu from:andrei'], ['to:', 'Către (destinatar)'], ['subject:', 'Cuvinte din subiect'], ['has:attachment', 'Are atașament'], ['is:unread', 'Necitite'], ['is:starred', 'Cu stea'], ['label:', 'Cu eticheta…'], ['in:trash', 'Din Coș de gunoi'], ['in:anywhere', 'Oriunde, inclusiv Spam și Coș']];
          umple(sugCautare, h('div', { class: 'ap-posta-sug-titlu' }, 'Operatori de căutare'), ops.map(([op, t]) => sug(h('code', {}, op), t, () => inser(op))));
          sugCautare.hidden = false; return;
        }
        const ultim = q.split(/\s+/).pop();
        const mOp = /^(from|to):(.*)$/i.exec(ultim);
        const termen = norm(mOp ? mOp[2] : ultim);
        const contacte = termen ? S.contacte.filter((c) => norm(`${c.nume} ${c.adresa}`).includes(termen)).slice(0, 4) : [];
        const mesaje = termen.length > 1 && !mOp ? conversatiiCautare(q).slice(0, 5) : [];
        umple(sugCautare,
          contacte.map((c) => sug(avatar(c.nume, c.adresa, 'mic'), h('span', {}, h('b', {}, c.nume), ' ', h('small', {}, c.adresa)), () => { const op = `${mOp ? mOp[1].toLowerCase() : 'from'}:${c.adresa}`; const rest = q.split(/\s+/).slice(0, -1).join(' '); cautare.value = `${rest} ${op}`.trim(); cauta(cautare.value); })),
          mesaje.map((x) => sug(svg(I.necitit), h('span', {}, h('b', {}, x.subiect || '(fără subiect)'), ' ', h('small', {}, x.de.nume)), () => { cautare.value = q; UI.cautare = q; deschide(x.id); }, h('small', { class: 'cand' }, oraScurta(x.data)))),
          sug(svg(I.cauta), `Toate rezultatele căutării „${q}”`, () => cauta(q)));
        sugCautare.hidden = false;
      }
      function conversatiiCautare(q) {
        const f = filtruCautare(q); const vazut = new Set();
        return S.mesaje.filter(f).sort((a, b) => b.data - a.data).filter((x) => { const k = firKey(x); if (vazut.has(k)) return false; vazut.add(k); return true; });
      }

      function clicLink(href, x) {
        if (x.phishing || /\.(xyz|top|click)\b/.test(href)) {
          dialog('Stop! Acesta este un link periculos', [
            h('p', {}, 'Linkul te-ar fi dus la:'), h('p', {}, h('code', {}, href)),
            h('p', {}, 'Este un site fals, făcut să semene cu unul adevărat, ca să-ți fure parola sau datele. În viața reală: nu da clic, nu completa nimic, raportează mesajul ca phishing și spune unui adult.'),
            h('p', { class: 'ap-posta-mic' }, 'Sfat: înainte de clic, ține mouse-ul deasupra linkului și citește adresa reală (apare jos, în stânga).')], [{ text: 'Am înțeles', cls: 'principal' }]);
        } else {
          dialog('Părăsești EduMail', [h('p', {}, 'Linkul duce la:'), h('p', {}, h('code', {}, href)), h('p', {}, 'În simulator, linkurile din mesaje nu se deschid. Acesta pare un site cunoscut, dar verifică mereu adresa înainte de clic.')], [{ text: 'Închide', cls: 'principal' }]);
        }
      }
      function salveazaEml(x) {
        const b64 = (s) => `=?UTF-8?B?${btoa(unescape(encodeURIComponent(s)))}?=`;
        const linie = (a) => a.map((y) => (numeDupa(y) !== y && numeDupa(y) !== 'eu' ? `${b64(numeDupa(y))} <${y}>` : y)).join(', ');
        const corpHtml = `<html><body>${x.html}${x.atasamente.length ? `<hr><p>Atașamente (simulate): ${x.atasamente.map((a) => esc(`${a.nume} (${marime(a.marime)})`)).join(', ')}</p>` : ''}</body></html>`;
        const eml = [`From: ${b64(x.de.nume || x.de.adresa)} <${x.de.adresa}>`, x.catre.length ? `To: ${linie(x.catre)}` : 'To: undisclosed-recipients:;', x.cc.length ? `Cc: ${linie(x.cc)}` : null,
          x.de.adresa === eu() && x.cci.length ? `Bcc: ${linie(x.cci)}` : null, `Subject: ${b64(x.subiect || '')}`, `Date: ${new Date(x.data).toUTCString()}`, 'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', btoa(unescape(encodeURIComponent(corpHtml))).replace(/.{76}/g, '$&\r\n')].filter((l) => l != null).join('\r\n');
        descarca(`${(x.subiect || 'mesaj').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)}.eml`, eml, 'message/rfc822');
        toast('Mesajul a fost descărcat ca fișier .eml (se deschide cu Outlook sau Thunderbird).');
      }
      function adaugaContact(nume = '', adresa = '') {
        const fN = h('input', { type: 'text', maxlength: 60, value: nume, 'aria-label': 'Nume' });
        const fA = h('input', { type: 'email', maxlength: 80, value: adresa, 'aria-label': 'Adresa de e-mail' });
        const fG = h('select', { 'aria-label': 'Grup' }, ['Colegi', 'Familie', 'Profesori', 'Școală', 'Alții'].map((g) => h('option', {}, g)));
        fG.value = 'Alții';
        const err = h('p', { class: 'ap-posta-eroare' });
        const ok = () => {
          const a = fA.value.trim().toLowerCase();
          if (!fN.value.trim()) { err.textContent = 'Introdu numele.'; return false; }
          if (!eValida(a)) { err.textContent = `Adresa nu este corectă: ${deCeGresita(a)}.`; return false; }
          if (contactDupa(a)) { err.textContent = 'Această adresă este deja în agendă.'; return false; }
          S.contacte.push({ id: idNou(), nume: fN.value.trim(), adresa: a, grup: fG.value, adaugat: true });
          salveaza(); bifeaza('contact'); randeaza();
          if (radacina.querySelector('.ap-posta-panou.agenda')) panouAgenda();
          toast(`${fN.value.trim()} a fost adăugat în agendă.`);
          return true;
        };
        dialog('Creează contact', [h('label', { class: 'ap-posta-camp-dialog' }, 'Nume', fN), h('label', { class: 'ap-posta-camp-dialog' }, 'E-mail', fA), h('label', { class: 'ap-posta-camp-dialog' }, 'Grup', fG), err],
          [{ text: 'Anulează' }, { text: 'Salvează', cls: 'principal', fn: ok }], nume ? fA : fN);
      }

      // ---------- Misiuni ----------
      function bifeaza(id) {
        if (S.misiuni[id]) return;
        S.misiuni[id] = Date.now();
        salveaza(); randeazaMisiuniBtn();
        const mi = MISIUNI.find((y) => y.id === id);
        const n = MISIUNI.filter((y) => S.misiuni[y.id]).length;
        toast(`✔ Misiune îndeplinită: ${mi.titlu}${n === MISIUNI.length ? ' – Le-ai făcut pe toate! Bravo!' : ''}`, { tip: 'ok', durata: 6000, actiune: { text: 'De ce?', fn: () => panouMisiuni() } });
        if (radacina.querySelector('.ap-posta-panou.misiuni')) panouMisiuni();
      }
      function panou(cls, titlu, ...continut) {
        radacina.querySelector('.ap-posta-panou')?.remove();
        const p = h('aside', { class: `ap-posta-panou ${cls}`, role: 'dialog', 'aria-label': titlu },
          h('div', { class: 'ap-posta-panou-cap' }, h('h2', {}, titlu), ib(I.inchide, 'Închide', () => p.remove())),
          h('div', { class: 'ap-posta-panou-corp' }, continut));
        p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); p.remove(); } });
        corp.append(p);
        return p;
      }
      function panouMisiuni() {
        const n = MISIUNI.filter((y) => S.misiuni[y.id]).length;
        const nPh = S.mesaje.filter((x) => x.phishing && x.raportat).length;
        const p = panou('misiuni', 'Misiuni',
          h('p', { class: 'ap-posta-mic' }, `Ai îndeplinit ${n} din ${MISIUNI.length}. Misiunile se bifează singure când le faci.`),
          h('div', { class: 'ap-posta-progres' }, h('span', {})),
          h('ol', { class: 'ap-posta-misiuni' }, MISIUNI.map((mi) => h('li', { class: S.misiuni[mi.id] ? 'gata' : '' },
            h('span', { class: 'bifa' }, S.misiuni[mi.id] ? svg(I.bifa) : null),
            h('div', {}, h('b', {}, mi.titlu, mi.total && !S.misiuni[mi.id] ? ` (${Math.min(nPh, 3)}/3)` : ''),
              h('p', {}, S.misiuni[mi.id] ? mi.dece : mi.cum))))));
        p.querySelector('.ap-posta-progres span').style.width = `${(n / MISIUNI.length) * 100}%`;
        p.querySelector('.ap-posta-ib').focus();
      }
      function panouAgenda() {
        const f = h('input', { type: 'search', placeholder: 'Caută în agendă', 'aria-label': 'Caută în agendă' });
        const lista = h('div', { class: 'ap-posta-agenda' });
        const deseneaza = () => {
          const q = norm(f.value);
          const c = S.contacte.filter((y) => norm(`${y.nume} ${y.adresa}`).includes(q)).sort((a, b) => a.nume.localeCompare(b.nume, 'ro'));
          const grupuri = [...new Set(c.map((y) => y.grup || 'Alții'))].sort((a, b) => a.localeCompare(b, 'ro'));
          umple(lista, c.length ? grupuri.map((g) => [h('h3', {}, g), h('ul', {}, c.filter((y) => (y.grup || 'Alții') === g).map((y) => h('li', {},
            avatar(y.nume, y.adresa), h('div', {}, h('b', {}, y.nume), h('span', {}, y.adresa)),
            ib(I.scrie, `Trimite un e-mail către ${y.nume}`, () => { radacina.querySelector('.ap-posta-panou')?.remove(); compune({ mod: 'nou', catre: [y.adresa] }); }),
            ib(I.sterse, `Șterge contactul ${y.nume}`, () => { S.contacte = S.contacte.filter((z) => z !== y); salveaza(); deseneaza(); }))))])
            : h('p', { class: 'ap-posta-mic' }, 'Niciun contact găsit.'));
        };
        f.addEventListener('input', deseneaza);
        panou('agenda', 'Contacte', h('div', { class: 'ap-posta-agenda-cap' }, f, h('button', { type: 'button', class: 'ap-posta-b plin', onclick: () => adaugaContact() }, svg(I.plus), 'Creează contact')), lista);
        deseneaza(); f.focus();
      }
      function meniuCont(btn) {
        meniu(btn, [
          h('div', { class: 'ap-posta-cont-card' },
            h('small', {}, S.adresa), avatar(S.prenume, S.adresa, 'urias'), h('b', {}, `Bună, ${S.prenume}!`),
            h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => { inchideMeniu(); toast('Contul este simulat: nu are setări de securitate reale.'); } }, 'Gestionează-ți contul EduMail')),
          optiune('Descarcă mesajele trimise (.txt)', () => exportTrimise(), { ico: I.salveaza }),
          optiune('Scurtături de la tastatură', () => scurtaturi(), { ico: I.lista }),
          optiune('Ia-o de la capăt (cont nou)', () => deLaCapat(), { ico: I.restaureaza }),
          h('hr'),
          optiune('Deconectează-te', () => deconecteaza(), { ico: I.iesire })], { cls: 'cont', dreapta: true });
      }
      function meniuAjutor(btn) {
        meniu(btn, [optiune('Scurtături de la tastatură', () => scurtaturi(), { ico: I.lista }), optiune('Misiuni', () => panouMisiuni(), { ico: I.misiuni }),
          optiune('Cum recunosc un mesaj de phishing?', () => dialog('Cum recunosc phishingul?', [h('ul', {}, ['Verifică adresa reală a expeditorului, nu doar numele afișat.', 'Ține mouse-ul deasupra linkului și citește adresa reală (jos, în stânga).', 'Atenție la grabă, amenințări, premii și cereri de parolă.', 'Nu deschide fișiere .exe sau .zip neașteptate.', 'Raportează mesajul și spune unui adult.'].map((t) => h('li', {}, t)))], [{ text: 'Am înțeles', cls: 'principal' }]), { ico: I.pericol })], { dreapta: true });
      }
      function deconecteaza() {
        opreste(); curent = null;
        document.title = 'EduMail – Conectare';
        umple(radacina, h('div', { class: 'ap-posta-bunvenit' },
          h('a', { class: 'ap-posta-inapoi', href: '#/aplicatii' }, '← Aplicații'),
          h('div', { class: 'ap-posta-card' }, logo(true), h('h1', {}, 'Alege un cont'), h('p', {}, 'Ai ieșit din cont. Bravo! Pe un calculator al școlii sau al altcuiva, deconectează-te mereu când termini.'),
            h('button', { type: 'button', class: 'ap-posta-cont-ales', onclick: () => { aplicatie(); } }, avatar(S.prenume, S.adresa), h('span', {}, h('b', {}, numeleMeu()), h('small', {}, S.adresa)), h('em', {}, 'Deconectat')))));
      }
      function exportTrimise() {
        const l = lucrare();
        if (!l.date.length) return toast('Nu ai trimis încă niciun mesaj.');
        const ACT = { nou: 'mesaj nou', raspuns: 'răspuns', 'raspuns-tuturor': 'răspuns tuturor', redirectionare: 'redirecționare' };
        const txt = [`Mesajele trimise de ${S.adresa}`, `Misiuni îndeplinite: ${l.misiuni.realizate} din ${l.misiuni.total}`, '',
          ...l.date.map((d, i) => [`===== Mesajul ${i + 1} (${ACT[d.tipActiune] || d.tipActiune}) =====`, `Data: ${dataLunga(d.trimisLa)}`, `Către: ${d.catre}`, d.cc ? `Cc: ${d.cc}` : null, d.cci ? `Cci: ${d.cci}` : null,
            `Subiect: ${d.subiect}`, d.atasamente.length ? `Atașamente: ${d.atasamente.join(', ')}` : null, '', d.text, ''].filter((x) => x != null).join('\r\n'))].join('\r\n');
        descarca('mesaje-trimise.txt', `﻿${txt}`, 'text/plain;charset=utf-8');
      }
      function deLaCapat() {
        dialog('Iei totul de la capăt?', [h('p', {}, 'Se șterg toate mesajele, contactele adăugate, etichetele și misiunile. Poți alege apoi o adresă nouă.')], [{ text: 'Anulează' },
          { text: 'Ia-o de la capăt', cls: 'principal pericol', fn: async () => { opreste(); try { await store.del(); } catch { /* */ } S = null; ecranBunVenit(); } }]);
      }
      function scurtaturi() {
        const r = [['C', 'Scrie un mesaj nou'], ['/', 'Caută'], ['J / K', 'Conversația mai veche / mai nouă'], ['O sau Enter', 'Deschide conversația'], ['U', 'Înapoi la listă'], ['E', 'Arhivează'], ['#', 'Șterge'], ['!', 'Raportează spam'],
          ['R', 'Răspunde'], ['A', 'Răspunde tuturor'], ['F', 'Redirecționează'], ['S', 'Adaugă / elimină steaua'], ['Shift + U', 'Marchează ca necitit'], ['Shift + I', 'Marchează ca citit'], ['B', 'Amână'],
          ['Ctrl + Enter', 'Trimite (în fereastra de mesaj)'], ['Ctrl + B / I / U', 'Aldin / Cursiv / Subliniat'], ['Esc', 'Închide fereastra']];
        dialog('Comenzi rapide de la tastatură', [h('table', { class: 'ap-posta-detalii taste' }, h('tbody', {}, r.map(([k, v]) => h('tr', {}, h('th', {}, h('kbd', {}, k)), h('td', {}, v)))))], [{ text: 'Închide', cls: 'principal' }]);
      }

      // ---------- Setări rapide și pagina Setări ----------
      function panouSetariRapide() {
        const st = ST_();
        const radio = (nume, val, text, curent2, fn, prev) => {
          const r = h('input', { type: 'radio', name: nume, value: val });
          r.checked = curent2 === val;
          r.addEventListener('change', () => { fn(val); salveaza(); randeaza(); });
          return h('label', { class: 'ap-posta-radio' }, r, h('span', {}, text), prev || null);
        };
        const prevDens = (n) => h('span', { class: `prev-dens d-${n}` }, h('i', {}), h('i', {}), h('i', {}));
        panou('setari', 'Setări rapide',
          h('button', { type: 'button', class: 'ap-posta-b contur lat', onclick: () => { radacina.querySelector('.ap-posta-panou')?.remove(); deschideSetari('general'); } }, 'Vezi toate setările'),
          h('h3', {}, 'Aspect'),
          radio('asp', 'gmail', 'Gmail (etichete, Scrie, conversații)', st.aspect, (v) => { st.aspect = v; }),
          radio('asp', 'outlook', 'Outlook (foldere, Mesaj nou, panou de citire)', st.aspect, (v) => { st.aspect = v; }),
          h('h3', {}, 'Densitate'),
          radio('dens', 'prestabilita', 'Prestabilită', st.densitate, (v) => { st.densitate = v; }, prevDens('p')),
          radio('dens', 'confortabila', 'Confortabilă', st.densitate, (v) => { st.densitate = v; }, prevDens('c')),
          radio('dens', 'compacta', 'Compactă', st.densitate, (v) => { st.densitate = v; }, prevDens('k')),
          h('h3', {}, 'Temă'),
          radio('tema', 'luminoasa', 'Luminoasă', st.tema, (v) => { st.tema = v; }),
          radio('tema', 'intunecata', 'Întunecată', st.tema, (v) => { st.tema = v; }),
          h('h3', {}, 'Tip de căsuță de mesaje primite'),
          radio('cat', 'da', 'Cu file (Principale, Promoții, Rețele sociale)', st.categorii ? 'da' : 'nu', (v) => { st.categorii = v === 'da'; UI.categorie = 'principale'; }),
          radio('cat', 'nu', 'Fără file (toate mesajele împreună)', st.categorii ? 'da' : 'nu', (v) => { st.categorii = v === 'da'; }),
          st.aspect === 'outlook' ? null : [h('h3', {}, 'Panou de citire'),
            radio('panou', 'fara', 'Fără împărțire', st.panou, (v) => { st.panou = v; }),
            radio('panou', 'dreapta', 'În dreapta mesajelor primite', st.panou, (v) => { st.panou = v; })]);
      }
      function deschideSetari(fila, sectiune) {
        UI.vedere = 'setari'; UI.fila = fila || 'general'; UI.fir = null; inchideMeniu(); setariEl.dataset.desenat = '';
        radacina.querySelector('.ap-posta-panou')?.remove();
        randeaza();
        if (sectiune) setTimeout(() => setariEl.querySelector(`[data-sect="${sectiune}"]`)?.scrollIntoView({ block: 'center' }), 0);
      }
      function randeazaSetari() {
        const st = ST_();
        const fila = (id, t) => h('button', { type: 'button', role: 'tab', class: UI.fila === id ? 'activ' : '', 'aria-selected': String(UI.fila === id), onclick: () => { UI.fila = id; randeazaSetari(); } }, t);
        const rand = (sect, titlu, desc, ...c) => h('div', { class: 'ap-posta-set-rand', 'data-sect': sect }, h('div', { class: 'eticheta' }, h('b', {}, titlu), desc ? h('small', {}, desc) : null), h('div', { class: 'valoare' }, c));
        let corpSetari;
        if (UI.fila === 'general') {
          const fAnulare = h('select', { 'aria-label': 'Perioada de anulare a trimiterii' }, [5, 10, 20, 30].map((s) => h('option', { value: s }, String(s))));
          fAnulare.value = String(st.anulare);
          const radio = (nume, val, text, v0) => { const r = h('input', { type: 'radio', name: nume, value: val }); r.checked = v0; return h('label', { class: 'ap-posta-radio' }, r, h('span', {}, text)); };
          const fSem = h('div', { class: 'ap-posta-sem-editor', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Textul semnăturii' });
          fSem.textContent = st.semnatura;
          if (!st.semnatura) fSem.dataset.gol = 'Ex.: Ana Pop, clasa a VI-a B';
          fSem.addEventListener('input', () => { if (fSem.textContent) delete fSem.dataset.gol; });
          fSem.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
          const cSem = h('input', { type: 'checkbox' }); cSem.checked = st.semnaturaActiva;
          const v = st.vacanta;
          const fSubV = h('input', { type: 'text', maxlength: 120, value: v.subiect, 'aria-label': 'Subiectul răspunsului automat' });
          const fMsgV = h('textarea', { rows: 4, maxlength: 1000, 'aria-label': 'Mesajul răspunsului automat' }); fMsgV.value = v.mesaj;
          const cAg = h('input', { type: 'checkbox' }); cAg.checked = v.doarAgenda;
          corpSetari = h('div', { class: 'ap-posta-set-corp' },
            rand('limba', 'Limbă:', null, h('span', {}, 'Limba de afișare EduMail: ', h('b', {}, 'română'))),
            rand('anulare', 'Anulează trimiterea:', null, h('span', {}, 'Perioada de anulare a trimiterii: ', fAnulare, ' secunde')),
            rand('intelig', 'Răspunsuri inteligente:', 'Afișează sugestii scurte de răspuns, când sunt disponibile.',
              radio('ri', 'da', 'Răspunsurile inteligente sunt activate', st.raspInteligente), radio('ri', 'nu', 'Răspunsurile inteligente sunt dezactivate', !st.raspInteligente)),
            rand('aspect', 'Aspect:', 'Cum arată căsuța ta.', radio('asp2', 'gmail', 'Gmail', st.aspect === 'gmail'), radio('asp2', 'outlook', 'Outlook', st.aspect === 'outlook')),
            rand('tema', 'Temă:', null, radio('tema2', 'luminoasa', 'Luminoasă', st.tema === 'luminoasa'), radio('tema2', 'intunecata', 'Întunecată', st.tema === 'intunecata')),
            rand('semnatura', 'Semnătură:', '(se adaugă la sfârșitul tuturor mesajelor trimise)',
              h('div', { class: 'ap-posta-sem' }, fSem, h('label', { class: 'ap-posta-radio' }, cSem, h('span', {}, 'Inserează semnătura în mesajele noi și în răspunsuri')),
                h('p', { class: 'ap-posta-mic' }, 'Sfat: scrie numele, clasa și școala. Nu pune adresa de acasă sau numărul de telefon.'))),
            rand('vacanta', 'Răspuns automat de vacanță:', '(trimite un răspuns automat la mesajele primite)',
              radio('vac', 'nu', 'Răspuns automat de vacanță dezactivat', !v.activ), radio('vac', 'da', 'Răspuns automat de vacanță activat', v.activ),
              h('label', { class: 'ap-posta-camp-dialog' }, 'Subiect:', fSubV), h('label', { class: 'ap-posta-camp-dialog' }, 'Mesaj:', fMsgV),
              h('label', { class: 'ap-posta-radio' }, cAg, h('span', {}, 'Trimite un răspuns doar persoanelor din Agendă'))),
            h('div', { class: 'ap-posta-set-btn' },
              h('button', { type: 'button', class: 'ap-posta-b plin', onclick: () => {
                const val = (n) => setariEl.querySelector(`input[name="${n}"]:checked`)?.value;
                st.anulare = Number(fAnulare.value) || 5;
                st.raspInteligente = val('ri') === 'da';
                st.aspect = val('asp2') || 'gmail'; st.tema = val('tema2') || 'luminoasa';
                st.semnatura = (fSem.innerText || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 500);
                st.semnaturaActiva = cSem.checked;
                const eraActiv = v.activ;
                v.activ = val('vac') === 'da'; v.subiect = fSubV.value.trim() || 'Sunt în vacanță'; v.mesaj = fMsgV.value.trim() || SETARI_IMPLICITE.vacanta.mesaj; v.doarAgenda = cAg.checked;
                if (v.activ && !eraActiv) v.raspunsLa = [];
                UI.vedere = 'lista'; salveaza(); randeaza(); toast('Setările au fost salvate.');
              } }, 'Salvează modificările'),
              h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => { UI.vedere = 'lista'; randeaza(); } }, 'Anulează')));
        } else {
          corpSetari = h('div', { class: 'ap-posta-set-corp' },
            h('table', { class: 'ap-posta-set-tabel' }, h('thead', {}, h('tr', {}, h('th', {}, 'Etichete de sistem'), h('th', {}, 'Mesaje'), h('th', {}))),
              h('tbody', {}, [...DOSARE, ...DOSARE_MAI_MULTE].map(([id]) => h('tr', {}, h('td', {}, T(id)), h('td', {}, String(inDosar(id).length)), h('td', {}, h('span', { class: 'ap-posta-mic' }, 'afișează')))))),
            h('table', { class: 'ap-posta-set-tabel' }, h('thead', {}, h('tr', {}, h('th', {}, outlook() ? 'Folderele mele' : 'Etichete'), h('th', {}, 'Mesaje'), h('th', {}, 'Acțiuni'))),
              h('tbody', {}, S.dosare.length ? S.dosare.map((d) => { const pt = h('span', { class: 'punct' }); pt.style.background = d.culoare; return h('tr', {}, h('td', {}, pt, d.nume), h('td', {}, String(inDosar(d.id).length)),
                h('td', {}, h('button', { type: 'button', class: 'ap-posta-link', onclick: () => redenumesteEticheta(d) }, 'editează'), ' ', h('button', { type: 'button', class: 'ap-posta-link', onclick: () => stergeEticheta(d) }, 'elimină'))); })
                : h('tr', {}, h('td', { colspan: '3', class: 'ap-posta-mic' }, 'Nu ai creat încă nicio etichetă.')))),
            h('button', { type: 'button', class: 'ap-posta-b contur', onclick: () => etichetaNoua() }, T('etichetaNoua')));
        }
        setariEl.dataset.desenat = UI.fila;
        umple(setariEl, h('div', { class: 'ap-posta-set-cap' }, ib(I.inapoi, 'Înapoi', () => { UI.vedere = 'lista'; randeaza(); }), h('h2', {}, 'Setări')),
          h('div', { class: 'ap-posta-set-file', role: 'tablist' }, fila('general', 'General'), fila('etichete', outlook() ? 'Foldere' : 'Etichete')),
          corpSetari);
      }

      // ---------- Dialoguri și notificări ----------
      function dialog(titlu, continut, butoane, focus) {
        const fundal = h('div', { class: 'ap-posta-modal' });
        const inchide = () => fundal.remove();
        const box = h('div', { class: 'ap-posta-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
          h('h2', {}, titlu), h('div', { class: 'ap-posta-dialog-corp' }, continut),
          h('div', { class: 'ap-posta-dialog-btn' }, butoane.map((b) => h('button', { type: 'button', class: `ap-posta-b ${b.cls || ''}`, onclick: async () => { if (b.fn && (await b.fn()) === false) return; inchide(); } }, b.text))));
        fundal.append(box);
        fundal.addEventListener('pointerdown', (e) => { if (e.target === fundal) inchide(); });
        box.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.stopPropagation(); inchide(); }
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); box.querySelector('.principal')?.click(); }
          if (e.key === 'Tab') { const f = [...box.querySelectorAll('button, input, select, textarea')]; const i = f.indexOf(document.activeElement); if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
        });
        radacina.append(fundal);
        (focus || box.querySelector('.principal') || box.querySelector('button')).focus();
        return inchide;
      }
      function toast(text, o = {}) {
        const t = h('div', { class: `ap-posta-toast ${o.tip || ''}`, role: 'status' }, h('span', {}, text),
          o.actiune ? h('button', { type: 'button', class: 'act', onclick: () => { o.actiune.fn(); t.remove(); } }, o.actiune.text) : null,
          o.actiune2 ? h('button', { type: 'button', class: 'act', onclick: () => { o.actiune2.fn(); t.remove(); } }, o.actiune2.text) : null,
          h('button', { type: 'button', class: 'x', 'aria-label': 'Închide', onclick: () => { o.laInchidere?.(); t.remove(); } }, svg(I.inchide)));
        toasturi.append(t);
        while (toasturi.children.length > 2) toasturi.firstChild.remove();
        const tm = setTimeout(() => { o.laExpirare?.(); t.remove(); }, o.durata || 4500);
        t.anuleazaTimer = () => clearTimeout(tm);
        return t;
      }

      // ---------- Compunerea unui mesaj (fereastra „Mesaj nou”, jos în dreapta) ----------
      function compuneDinCiorna(x) {
        compune({ mod: x.actiune || 'nou', refId: x.refId, ciorna: x, catre: x.catre, cc: x.cc, cci: x.cci, subiect: x.subiect, html: x.html, atasamente: x.atasamente, pastreaza: true });
      }
      const semnaturaEl = () => (ST_().semnatura && ST_().semnaturaActiva ? h('div', { class: 'ap-posta-semn' }, '-- ', h('br'), ST_().semnatura.split('\n').map((l, i) => [i ? h('br') : null, l])) : null);
      function compune(o) {
        if (UI.compunere) UI.compunere.inchide(true, true);
        const ref = o.ref || (o.refId && gaseste(o.refId));
        let catre = o.catre || [], cc = o.cc || [], subiect = o.subiect || '', citatHtml = '', atas = (o.atasamente || []).map((a) => ({ ...a }));
        if (ref && !o.pastreaza) {
          const deLaMine = ref.de.adresa === eu();
          const fara = (a) => a.filter((y) => y.toLowerCase() !== eu());
          const pref = (p, s) => (new RegExp(`^${p}:`, 'i').test(s) ? s : `${p}: ${s}`);
          const fara2 = (s) => (s || '').replace(/^(re|fwd?):\s*/i, '');
          const citat = `<p>Pe ${esc(dataLunga(ref.data))}, ${esc(ref.de.nume || ref.de.adresa)} &lt;${esc(ref.de.adresa)}&gt; a scris:</p><blockquote>${ref.html}</blockquote>`;
          if (o.mod === 'raspuns') { catre = deLaMine ? ref.catre.slice() : [ref.de.adresa]; subiect = pref('Re', /^re:/i.test(ref.subiect) ? ref.subiect : fara2(ref.subiect)); citatHtml = citat; }
          if (o.mod === 'raspuns-tuturor') { catre = unice(deLaMine ? ref.catre : fara([ref.de.adresa, ...ref.catre])); cc = unice(fara(ref.cc)); subiect = pref('Re', /^re:/i.test(ref.subiect) ? ref.subiect : fara2(ref.subiect)); citatHtml = citat; }
          if (o.mod === 'redirectionare') {
            catre = []; subiect = pref('Fwd', ref.subiect); atas = ref.atasamente.map((a) => ({ ...a }));
            citatHtml = `<p>---------- Mesaj redirecționat ----------<br>De la: ${esc(ref.de.nume)} &lt;${esc(ref.de.adresa)}&gt;<br>Data: ${esc(dataLunga(ref.data))}<br>Subiect: ${esc(ref.subiect)}<br>Către: ${esc(ref.catre.join('; '))}${ref.cc.length ? `<br>Cc: ${esc(ref.cc.join('; '))}` : ''}</p>${ref.html}`;
          }
        }
        const C = { mod: o.mod, refId: ref?.id || null, ciornaId: o.ciorna?.id || null };
        const campuri = {};
        // Câmp de adrese cu „chip-uri” și sugestii din agendă
        const campAdrese = (cheie, eticheta2, val) => {
          const lista = [...val];
          const inp = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': eticheta2 });
          const chips = h('span', { class: 'ap-posta-chips' });
          const sug = h('ul', { class: 'ap-posta-sugestii', role: 'listbox' });
          const err = h('div', { class: 'ap-posta-eroare mic' });
          let idx = -1, potriviri = [];
          const deseneazaChips = () => umple(chips, lista.map((a, i) => {
            const ok = eValida(a);
            const n = numeDupa(a);
            return h('span', { class: `ap-posta-chip${ok ? '' : ' gresit'}`, 'data-tip': ok ? (n !== a ? `${n} <${a}>` : a) : `Adresa „${a}” nu este corectă: ${deCeGresita(a)}.` },
              avatar(n === a ? a : n, a, 'mic'), h('span', {}, n !== a && n !== 'eu' ? n.replace(/\s*\(.*\)$/, '') : a),
              h('button', { type: 'button', 'aria-label': `Elimină ${a}`, onclick: (e) => { e.stopPropagation(); lista.splice(i, 1); deseneazaChips(); verifica(false); salvareAuto(); inp.focus(); } }, svg(I.inchide)));
          }));
          const adaugaText = () => {
            const parti = imparte(inp.value);
            inp.value = '';
            for (const p of parti) if (!lista.some((y) => y.toLowerCase() === p.toLowerCase())) lista.push(p);
            if (parti.length) { deseneazaChips(); verifica(false); salvareAuto(); }
          };
          const alege = (c) => {
            inp.value = '';
            if (!lista.some((y) => y.toLowerCase() === c.adresa.toLowerCase())) lista.push(c.adresa);
            sug.replaceChildren(); potriviri = []; deseneazaChips(); inp.focus(); verifica(false); salvareAuto();
          };
          const cunoscute = () => {
            const adr = new Map(S.contacte.map((c) => [c.adresa.toLowerCase(), c]));
            for (const x of S.mesaje) for (const a of [x.de.adresa, ...x.catre, ...x.cc]) if (a && !adr.has(a.toLowerCase()) && a !== eu() && !PHISHING.includes(a) && !x.phishing) adr.set(a.toLowerCase(), { nume: ALTE_NUME[a] || a, adresa: a });
            return [...adr.values()];
          };
          const deseneaza = () => {
            const q = norm(inp.value.trim());
            potriviri = q ? cunoscute().filter((c) => norm(`${c.nume} ${c.adresa}`).includes(q) && !lista.includes(c.adresa)).slice(0, 6) : [];
            idx = potriviri.length ? 0 : -1;
            umple(sug, potriviri.map((c, i) => h('li', { role: 'option', class: i === idx ? 'activ' : '', onpointerdown: (e) => { e.preventDefault(); alege(c); } }, avatar(c.nume, c.adresa), h('div', {}, h('b', {}, c.nume), h('span', {}, c.adresa)))));
          };
          const verifica = (arata = true) => {
            const gresite = lista.filter((a) => !eValida(a));
            err.textContent = arata && gresite.length ? `„${gresite[0]}” nu este o adresă corectă: ${deCeGresita(gresite[0])}.` : '';
            return gresite;
          };
          inp.addEventListener('input', () => { if (/[;,]/.test(inp.value)) { adaugaText(); sug.replaceChildren(); potriviri = []; } else deseneaza(); });
          inp.addEventListener('blur', () => { setTimeout(() => { sug.replaceChildren(); potriviri = []; if (inp.value.trim()) { adaugaText(); verifica(); } }, 150); });
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && lista.length) { lista.pop(); deseneazaChips(); verifica(false); return; }
            if (potriviri.length) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + potriviri.length) % potriviri.length; [...sug.children].forEach((li, i) => li.classList.toggle('activ', i === idx)); return; }
              if ((e.key === 'Enter' || e.key === 'Tab') && idx >= 0) { e.preventDefault(); alege(potriviri[idx]); return; }
              if (e.key === 'Escape') { e.stopPropagation(); sug.replaceChildren(); potriviri = []; return; }
            }
            if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); adaugaText(); verifica(); }
          });
          deseneazaChips();
          const rand = h('div', { class: 'ap-posta-rand-c', onclick: (e) => { if (e.target === rand || e.target.classList.contains('ap-posta-intrare')) inp.focus(); } },
            h('button', { type: 'button', class: 'ap-posta-eticheta-camp', 'data-tip': 'Selectează contacte', onclick: () => alegeDinAgenda(alege) }, eticheta2),
            h('div', { class: 'ap-posta-intrare' }, chips, inp, sug), err);
          campuri[cheie] = { inp, rand, verifica, valori: () => { if (inp.value.trim()) adaugaText(); return unice(lista); } };
          return rand;
        };
        const rCatre = campAdrese('catre', 'Către', catre);
        const rCc = campAdrese('cc', 'Cc', cc);
        const rCci = campAdrese('cci', 'Cci', o.cci || []);
        const aratCc = cc.length > 0, aratCci = (o.cci || []).length > 0;
        rCc.hidden = !aratCc; rCci.hidden = !aratCci;
        const btnCc = h('button', { type: 'button', class: 'ap-posta-link', hidden: aratCc, 'data-tip': 'Adaugă destinatari Cc', onclick: () => { rCc.hidden = false; btnCc.hidden = true; campuri.cc.inp.focus(); } }, 'Cc');
        const btnCci = h('button', { type: 'button', class: 'ap-posta-link', hidden: aratCci, 'data-tip': 'Adaugă destinatari Cci (copie invizibilă)', onclick: () => { rCci.hidden = false; btnCci.hidden = true; campuri.cci.inp.focus(); } }, 'Cci');
        rCatre.querySelector('.ap-posta-intrare').after(h('span', { class: 'ap-posta-cc-btn' }, btnCc, btnCci));
        const fSubiect = h('input', { type: 'text', maxlength: 150, value: subiect, 'aria-label': 'Subiect', placeholder: 'Subiect' });
        const editor = h('div', { class: 'ap-posta-editor', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Corpul mesajului', spellcheck: 'true' });
        if (o.pastreaza) editor.replaceChildren(...parseaza(o.html));
        else {
          const cont = [];
          cont.push(o.text ? h('p', {}, o.text) : h('p', {}, h('br')));
          if (!o.text && ref) cont.push(h('p', {}, h('br')));
          const sem = semnaturaEl();
          if (sem) { cont.push(h('p', {}, h('br')), sem); }
          if (citatHtml) { const q = h('div', { class: 'ap-posta-citat' }); q.append(...parseaza(citatHtml)); cont.push(h('p', {}, h('br')), q); }
          editor.replaceChildren(...cont);
        }
        editor.addEventListener('paste', (e) => { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, t); });
        editor.addEventListener('drop', (e) => e.preventDefault());
        const cmd = (c, v = null) => { editor.focus(); try { document.execCommand('styleWithCSS', false, false); } catch { /* */ } document.execCommand(c, false, v); actualizeazaFormat(); salvareAuto(); };
        const fmt = (c, eticheta2, cont, tasta) => h('button', { type: 'button', class: 'ap-posta-fmt', 'data-cmd': c, 'data-tip': `${eticheta2}${tasta ? ` (${tasta})` : ''}`, 'aria-label': eticheta2, onmousedown: (e) => e.preventDefault(), onclick: () => cmd(c) }, cont);
        const btnFmt = [fmt('bold', 'Aldin', h('b', {}, 'B'), 'Ctrl+B'), fmt('italic', 'Cursiv', h('i', {}, 'I'), 'Ctrl+I'), fmt('underline', 'Subliniat', h('u', {}, 'U'), 'Ctrl+U')];
        const selFont = h('select', { class: 'ap-posta-sel-fmt', 'aria-label': 'Font', 'data-tip': 'Font' }, [['sans-serif', 'Sans Serif'], ['serif', 'Serif'], ['monospace', 'Lățime fixă'], ['comic sans ms', 'Comic Sans MS'], ['georgia', 'Georgia'], ['verdana', 'Verdana']].map(([v, t]) => h('option', { value: v }, t)));
        selFont.addEventListener('change', () => cmd('fontName', selFont.value));
        const selMar = h('select', { class: 'ap-posta-sel-fmt', 'aria-label': 'Dimensiune', 'data-tip': 'Dimensiune' }, [['2', 'Mică'], ['3', 'Normală'], ['5', 'Mare'], ['6', 'Uriașă']].map(([v, t]) => h('option', { value: v }, t)));
        selMar.value = '3';
        selMar.addEventListener('change', () => cmd('fontSize', selMar.value));
        const btnCuloare = h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Culoarea textului', 'aria-label': 'Culoarea textului', onmousedown: (e) => e.preventDefault(), onclick: (e) => {
          const pal = ['#000000', '#444444', '#999999', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#3C78D8', '#674EA7', '#A64D79'];
          meniu(e.currentTarget, h('div', { class: 'ap-posta-culori' }, pal.map((c) => { const b = h('button', { type: 'button', 'aria-label': `Culoarea ${c}`, onmousedown: (ev) => ev.preventDefault(), onclick: () => { inchideMeniu(); cmd('foreColor', c); } }); b.style.background = c; return b; })));
        } }, svg(I.culoare));
        const baraFormat = h('div', { class: 'ap-posta-bara-format', hidden: true },
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Anulează (Ctrl+Z)', 'aria-label': 'Anulează', onmousedown: (e) => e.preventDefault(), onclick: () => cmd('undo') }, svg(I.anuleaza)),
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Refă (Ctrl+Y)', 'aria-label': 'Refă', onmousedown: (e) => e.preventDefault(), onclick: () => cmd('redo') }, svg(I.refa)),
          h('span', { class: 'ap-posta-sep' }), selFont, h('span', { class: 'ap-posta-sep' }), selMar, h('span', { class: 'ap-posta-sep' }),
          btnFmt, btnCuloare, h('span', { class: 'ap-posta-sep' }),
          fmt('insertOrderedList', 'Listă numerotată', svg(I.listaNum)), fmt('insertUnorderedList', 'Listă cu marcatori', svg(I.lista)),
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Citat', 'aria-label': 'Citat', onmousedown: (e) => e.preventDefault(), onclick: () => cmd('formatBlock', 'blockquote') }, svg(I.citat)),
          fmt('removeFormat', 'Elimină formatarea', svg(I.faraFormat)));
        function actualizeazaFormat() { for (const b of [...btnFmt, ...baraFormat.querySelectorAll('[data-cmd^="insert"]')]) { let v = false; try { v = document.queryCommandState(b.dataset.cmd); } catch { /* */ } b.setAttribute('aria-pressed', String(v)); } }
        editor.addEventListener('keyup', actualizeazaFormat); editor.addEventListener('mouseup', actualizeazaFormat);
        editor.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); cmd('underline'); } });
        const atasEl = h('div', { class: 'ap-posta-atas-compune' });
        const total = () => atas.reduce((s, a) => s + a.marime, 0);
        const desenAtas = (nou) => umple(atasEl, atas.map((a, i) => {
          const r = h('div', { class: `ap-posta-atas-rand${a === nou ? ' incarca' : ''}` }, iconFisier(a.nume), h('span', { class: 'nume' }, a.nume), h('small', {}, `(${marime(a.marime)})`), h('span', { class: 'progres' }, h('i', {})),
            ib(I.inchide, 'Elimină', () => { atas.splice(i, 1); desenAtas(); salvareAuto(); }));
          if (a === nou) setTimeout(() => r.classList.remove('incarca'), 900);
          return r;
        }), atas.length > 1 ? h('span', { class: `ap-posta-mic${total() > 10 * MB ? ' avert' : ''}` }, `Total: ${marime(total())}`) : null);
        desenAtas();
        const ataseaza = (f) => {
          if (f.marime > 25 * MB || total() + f.marime > 25 * MB) {
            dialog('Fișierul este prea mare', [h('p', {}, `„${f.nume}” are ${marime(f.marime)}${f.marime <= 25 * MB ? `, iar împreună cu celelalte atașamente mesajul ar avea ${marime(total() + f.marime)}` : ''}.`),
              h('p', {}, 'Gmail și Outlook trimit atașamente de cel mult 20–25 MB pe mesaj. Pentru fișiere mari, pune fișierul în Google Drive sau OneDrive și trimite un link.')], [{ text: 'OK', cls: 'principal' }]);
            return;
          }
          const a = { nume: f.nume, marime: f.marime };
          atas.push(a); desenAtas(a); salvareAuto();
          if (total() > 10 * MB) toast(`Mesajul are acum ${marime(total())}. Atenție: multe căsuțe (de exemplu, cele ale școlilor) primesc doar mesaje de până la 10 MB.`, { tip: 'avert', durata: 6500 });
        };
        const inpFisier = h('input', { type: 'file', multiple: true, hidden: true });
        inpFisier.addEventListener('change', () => { for (const f of inpFisier.files) ataseaza({ nume: f.name, marime: f.size }); inpFisier.value = ''; });
        const meniuAtas = (e) => meniu(e.currentTarget, [
          optiune('De pe calculator…', () => inpFisier.click(), { ico: I.fisier }),
          h('div', { class: 'ap-posta-meniu-titlu' }, 'Fișiere de exemplu (simulate):'),
          FISIERE_EXEMPLU.map((f) => h('button', { type: 'button', role: 'menuitem', onclick: () => { inchideMeniu(); ataseaza(f); } }, iconFisier(f.nume), h('span', {}, f.nume), h('small', {}, marime(f.marime)))),
          h('p', { class: 'ap-posta-mic gol' }, 'Se păstrează doar numele și mărimea fișierului.')], { cls: 'atas' });
        const meniuLink = () => {
          const sel = getSelection(); const r = sel.rangeCount && editor.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
          const fT = h('input', { type: 'text', value: r ? r.toString() : '', 'aria-label': 'Text de afișat' });
          const fU = h('input', { type: 'text', placeholder: 'https://', 'aria-label': 'Adresa web' });
          const err = h('p', { class: 'ap-posta-eroare' });
          dialog('Editează linkul', [h('label', { class: 'ap-posta-camp-dialog' }, 'Text de afișat:', fT), h('label', { class: 'ap-posta-camp-dialog' }, 'La ce adresă web trimite acest link?', fU), err],
            [{ text: 'Anulează' }, { text: 'OK', cls: 'principal', fn: () => {
              let u = fU.value.trim(); if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
              if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u)) { err.textContent = 'Scrie o adresă web corectă, de exemplu www.scoala.ro.'; return false; }
              editor.focus(); const s = getSelection(); s.removeAllRanges(); if (r) s.addRange(r); else { const rr = document.createRange(); rr.selectNodeContents(editor); rr.collapse(false); s.addRange(rr); }
              const a = h('a', { href: u }, fT.value.trim() || u);
              const rg = s.getRangeAt(0); rg.deleteContents(); rg.insertNode(a); rg.setStartAfter(a); rg.collapse(true); s.removeAllRanges(); s.addRange(rg);
              salvareAuto();
            } }], fU);
        };
        const meniuEmoji = (e) => meniu(e.currentTarget, h('div', { class: 'ap-posta-emoji' }, ['😊', '😂', '👍', '🙏', '🎉', '❤️', '😢', '😮', '🤔', '👋', '📚', '✏️', '🎂', '🎄', '⚽', '🤖', '🌟', '✅'].map((em) => h('button', { type: 'button', onmousedown: (ev) => ev.preventDefault(), onclick: () => { inchideMeniu(); editor.focus(); document.execCommand('insertText', false, em); salvareAuto(); } }, em))), { cls: 'emoji' });
        const meniuSemn = (e) => meniu(e.currentTarget, [
          optiune('Nicio semnătură', () => { editor.querySelector('.ap-posta-semn')?.remove(); salvareAuto(); }),
          optiune(ST_().semnatura ? `Semnătura mea: ${ST_().semnatura.split('\n')[0].slice(0, 30)}` : 'Semnătura mea (nu ai creat-o încă)', () => {
            if (!ST_().semnatura) return toast('Nu ai încă o semnătură. Creeaz-o din Setări → Semnătură.', { actiune: { text: 'Gestionează semnăturile', fn: () => { inchide(true); deschideSetari('general', 'semnatura'); } } });
            editor.querySelector('.ap-posta-semn')?.remove();
            const sem = h('div', { class: 'ap-posta-semn' }, '-- ', h('br'), ST_().semnatura.split('\n').map((l, i) => [i ? h('br') : null, l]));
            const q = editor.querySelector('.ap-posta-citat'); if (q) q.before(sem); else editor.append(sem); salvareAuto();
          }, { disabled: false }),
          h('hr'), optiune('Gestionează semnăturile', () => { inchide(true); deschideSetari('general', 'semnatura'); })]);
        const titluF = h('span', { class: 'titlu' }, subiect || T('mesajNou'));
        fSubiect.addEventListener('input', () => { titluF.textContent = fSubiect.value.trim() || T('mesajNou'); salvareAuto(); });
        editor.addEventListener('input', () => salvareAuto());
        const stareCiorna = h('span', { class: 'ap-posta-stare-ciorna' });
        const btnAa = h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Opțiuni de formatare', 'aria-label': 'Opțiuni de formatare', 'aria-pressed': 'false', onclick: () => { baraFormat.hidden = !baraFormat.hidden; btnAa.setAttribute('aria-pressed', String(!baraFormat.hidden)); } }, h('span', { class: 'aa' }, 'A', h('small', {}, 'a')));
        const subsol = h('div', { class: 'ap-posta-compune-subsol' },
          h('div', { class: 'ap-posta-trimite-grup' }, h('button', { type: 'button', class: 'ap-posta-trimite', 'data-tip': 'Trimite (Ctrl+Enter)', onclick: () => trimite() }, T('trimite')),
            h('button', { type: 'button', class: 'ap-posta-trimite sageata', 'aria-label': 'Mai multe opțiuni de trimitere', 'data-tip': 'Mai multe opțiuni de trimitere', onclick: (e) => meniu(e.currentTarget, [optiune('Programează trimiterea', () => toast('Programarea trimiterii nu este disponibilă în simulator.'), { ico: I.ceas })]) }, svg(I.jos))),
          btnAa,
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Atașează fișiere', 'aria-label': 'Atașează fișiere', onclick: meniuAtas }, svg(I.agrafa)),
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Inserează linkul (Ctrl+K)', 'aria-label': 'Inserează linkul', onmousedown: (e) => e.preventDefault(), onclick: meniuLink }, svg(I.link)),
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Inserează emoji', 'aria-label': 'Inserează emoji', onmousedown: (e) => e.preventDefault(), onclick: meniuEmoji }, svg(I.emoji)),
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Inserează semnătura', 'aria-label': 'Inserează semnătura', onmousedown: (e) => e.preventDefault(), onclick: meniuSemn }, svg(I.semnatura)),
          inpFisier,
          h('span', { class: 'ap-posta-umple' }), stareCiorna,
          h('button', { type: 'button', class: 'ap-posta-fmt', 'data-tip': 'Renunță la ciornă', 'aria-label': 'Renunță la ciornă', onclick: () => renunta() }, svg(I.sterse)));
        const fereastra = h('div', { class: 'ap-posta-compune', role: 'dialog', 'aria-label': T('mesajNou') },
          h('div', { class: 'ap-posta-compune-cap', onclick: (e) => { if (!e.target.closest('button')) comutaMin(); } }, titluF,
            ib(I.linie, 'Minimizează', () => comutaMin(), { cls: 'cap-btn' }),
            ib(I.mareste, 'Ecran complet', () => comutaMare(), { cls: 'cap-btn mareste' }),
            ib(I.inchide, 'Salvează și închide', () => inchide(true), { cls: 'cap-btn' })),
          h('div', { class: 'ap-posta-compune-corp' },
            outlook() ? h('div', { class: 'ap-posta-rand-c de' }, h('span', { class: 'ap-posta-eticheta-camp' }, 'De la'), h('span', {}, numeleMeu(), ' ', h('span', { class: 'ap-posta-adresa' }, `<${S.adresa}>`))) : null,
            rCatre, rCc, rCci,
            h('div', { class: 'ap-posta-rand-c subiect' }, fSubiect),
            h('div', { class: 'ap-posta-editor-zona' }, editor), atasEl,
            baraFormat),
          subsol);
        const fundalMare = h('div', { class: 'ap-posta-compune-fundal', onclick: () => comutaMare() });
        function comutaMin() { fereastra.classList.toggle('min'); fereastra.classList.remove('mare'); fundalMare.remove(); }
        function comutaMare() {
          const m = !fereastra.classList.contains('mare');
          fereastra.classList.toggle('mare', m); fereastra.classList.remove('min');
          const b = fereastra.querySelector('.mareste'); b.dataset.tip = m ? 'Ieși din ecranul complet' : 'Ecran complet'; b.replaceChildren(svg(m ? I.micsoreaza : I.mareste));
          if (m) radacina.insertBefore(fundalMare, fereastra); else fundalMare.remove();
        }
        fereastra.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); trimite(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); meniuLink(); }
          if (e.key === 'Escape') { e.stopPropagation(); if (meniuDeschis) inchideMeniu(); else inchide(true); }
        });
        radacina.append(fereastra);
        (catre.length || o.mod === 'raspuns' || o.mod === 'raspuns-tuturor' ? editor : campuri.catre.inp).focus();
        if (document.activeElement === editor) { const r = document.createRange(); const p0 = editor.firstChild; if (o.text && p0) { r.selectNodeContents(p0); r.collapse(false); } else r.setStart(p0 || editor, 0); r.collapse(!o.text); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

        const colecteaza = () => ({ catre: campuri.catre.valori(), cc: campuri.cc.valori(), cci: campuri.cci.valori(), subiect: fSubiect.value.trim(), html: curataHTML(editor.innerHTML), atasamente: atas.map((a) => ({ ...a })) });
        const eGol = (d) => !d.catre.length && !d.cc.length && !d.cci.length && !d.subiect && !htmlLaText(d.html).replace(/^--\s*/, '').trim() && !d.atasamente.length;
        let tCiorna = null;
        function salvareAuto() { clearTimeout(tCiorna); stareCiorna.textContent = ''; tCiorna = setTimeout(() => { if (fereastra.isConnected && salveazaCiorna()) { stareCiorna.textContent = 'Ciornă salvată'; } }, 2000); }
        function salveazaCiorna() {
          const d = colecteaza();
          let x = C.ciornaId && gaseste(C.ciornaId);
          if (eGol(d)) { if (x) { S.mesaje = S.mesaje.filter((y) => y !== x); C.ciornaId = null; salveaza(); randeazaNav(); } return false; }
          if (!x) { x = { id: `c-${idNou()}`, de: { nume: numeleMeu(), adresa: eu() }, citit: true, important: false, etichete: [], categorie: 'principale' }; S.mesaje.push(x); C.ciornaId = x.id; }
          Object.assign(x, d, { dosar: 'ciorne', data: Date.now(), actiune: C.mod, refId: C.refId });
          salveaza(); randeazaNav();
          if (UI.dosar === 'ciorne' && UI.vedere === 'lista' && !listaEl.hidden) randeazaLista();
          return true;
        }
        function inchide(pastreaza, tacut) {
          clearTimeout(tCiorna);
          if (pastreaza && salveazaCiorna() && !tacut) toast(`Mesajul a fost salvat în ${T('ciorne')}.`);
          fereastra.remove(); fundalMare.remove();
          if (UI.compunere?.fereastra === fereastra) UI.compunere = null;
          randeaza();
        }
        function renunta() {
          clearTimeout(tCiorna);
          if (C.ciornaId) S.mesaje = S.mesaje.filter((x) => x.id !== C.ciornaId);
          C.ciornaId = null; salveaza(); fereastra.remove(); fundalMare.remove(); UI.compunere = null; randeaza();
          toast('Ciorna a fost eliminată.');
        }
        async function trimite() {
          const NUME_C = { catre: 'Către', cc: 'Cc', cci: 'Cci' };
          const gresite = ['catre', 'cc', 'cci'].flatMap((k) => { campuri[k].valori(); return campuri[k].verifica().map((a) => [a, NUME_C[k]]); });
          if (gresite.length) { const [a, c] = gresite[0]; dialog('Eroare', [h('p', {}, `Adresa „${a}” din câmpul „${c}” nu este recunoscută: ${deCeGresita(a)}. Verifică toate adresele și încearcă din nou.`)], [{ text: 'OK', cls: 'principal' }]); return; }
          const d = colecteaza();
          if (!d.catre.length && !d.cc.length && !d.cci.length) { dialog('Eroare', [h('p', {}, 'Specifică cel puțin un destinatar.')], [{ text: 'OK', cls: 'principal' }]); return; }
          const intreaba = (titlu, text, da) => new Promise((res) => dialog(titlu, [h('p', {}, text)], [{ text: 'Anulează', fn: () => res(false) }, { text: da, cls: 'principal', fn: () => res(true) }]));
          if (!d.catre.length && !d.cci.length && d.cc.length && !(await intreaba('Câmpul Către este gol', 'Ai pus adrese doar la Cc. De obicei, destinatarul principal se scrie la Către. Trimiți așa?', 'Trimite așa'))) return;
          if (!d.subiect && !(await intreaba('Trimiți acest mesaj fără subiect?', 'Subiectul spune în câteva cuvinte despre ce este mesajul. Trimiți fără subiect?', 'OK'))) return fSubiect.focus();
          const text = htmlLaText(d.html);
          const textNou = text.split(/\nPe .* a scris:|---------- Mesaj redirecționat/)[0];
          if (/ata[sș]/i.test(textNou) && !d.atasamente.length && !(await intreaba('Ai uitat să atașezi fișierul?', 'Ai scris „atașat” sau „atașament” în mesaj, dar nu există fișiere atașate. Trimiți oricum?', 'Trimite oricum'))) return;
          const toti = [...d.catre, ...d.cc, ...d.cci];
          if (toti.some((a) => PHISHING.includes(a)) && !(await intreaba('Stai puțin!', 'Scrii unei adrese dintr-un mesaj înșelător (phishing). Nu răspunde la astfel de mesaje: le raportezi și spui unui adult.', 'Trimite oricum'))) return;
          clearTimeout(tCiorna);
          if (C.ciornaId) S.mesaje = S.mesaje.filter((x) => x.id !== C.ciornaId);
          const x = { id: `t-${idNou()}`, dosar: 'trimise', de: { nume: numeleMeu(), adresa: eu() }, ...d, data: Date.now(), citit: true, important: false, etichete: [], categorie: 'principale', actiune: C.mod, refId: C.refId, trimisDeElev: true };
          if (ref) x.fir = firKey(ref);
          fereastra.remove(); fundalMare.remove(); UI.compunere = null;
          salveaza(); randeaza();
          programeazaTrimiterea(x, { mod: C.mod, refId: C.refId, catre: d.catre, cc: d.cc, cci: d.cci, subiect: d.subiect, html: d.html, atasamente: d.atasamente, pastreaza: true });
        }
        UI.compunere = { fereastra, inchide };
      }
      // „Anulează trimiterea”: mesajul pleacă abia după câteva secunde
      function programeazaTrimiterea(x, refacere) {
        if (UI.trimitere) UI.trimitere.gata();
        const sec = ST_().anulare || 5;
        let terminat = false;
        const tSe = toast('Se trimite...', { durata: 700 });
        const gata = () => {
          if (terminat) return; terminat = true; clearTimeout(timer); UI.trimitere = null;
          S.mesaje.push(x);
          verificaMisiuni(x); programeazaRaspunsuri(x);
          salveaza(); randeaza();
        };
        const timer = setTimeout(gata, sec * 1000);
        UI.trimitere = { gata };
        setTimeout(() => {
          tSe.remove();
          if (terminat) return;
          toast('Mesaj trimis.', { durata: Math.max(1000, sec * 1000 - 700),
            actiune: { text: 'Anulează', fn: () => { if (terminat) return toast('Mesajul a fost deja trimis.'); terminat = true; clearTimeout(timer); UI.trimitere = null; toast('Trimiterea a fost anulată.'); compune(refacere); } },
            actiune2: { text: 'Vezi mesajul', fn: () => { gata(); UI.dosar = 'trimise'; UI.cautare = ''; cautare.value = ''; UI.vedere = 'lista'; deschide(x.id); } } });
        }, 700);
      }
      function alegeDinAgenda(alege) {
        const f = h('input', { type: 'search', placeholder: 'Caută', 'aria-label': 'Caută în agendă' });
        const lista = h('ul', { class: 'ap-posta-agenda-mini' });
        const des = () => umple(lista, S.contacte.filter((c) => norm(`${c.nume} ${c.adresa}`).includes(norm(f.value))).sort((a, b) => a.nume.localeCompare(b.nume, 'ro')).map((c) =>
          h('li', {}, h('button', { type: 'button', onclick: () => { inchide(); alege(c); } }, avatar(c.nume, c.adresa), h('div', {}, h('b', {}, c.nume), h('span', {}, c.adresa))))));
        f.addEventListener('input', des); des();
        const inchide = dialog('Selectează contacte', [f, lista], [{ text: 'Anulează' }], f);
      }

      // ---------- Misiunile verificate la trimitere ----------
      function verificaMisiuni(x) {
        const toti = [...x.catre, ...x.cc, ...x.cci];
        if (x.cci.length) bifeaza('cci');
        if (ST_().semnatura && htmlLaText(x.html).includes(ST_().semnatura.split('\n')[0].trim())) bifeaza('semnatura');
        if (x.refId === 'm-tema' && (x.actiune === 'raspuns' || x.actiune === 'raspuns-tuturor') && toti.includes(P.tic.adresa)) {
          if (x.atasamente.length) bifeaza('tema'); else toast('Profesoara a primit răspunsul, dar fără temă. Pentru misiune, atașează un fișier.', { tip: 'avert' });
        }
        if (x.refId === 'm-excursie' && x.actiune === 'raspuns-tuturor') bifeaza('excursie');
        if (x.refId === 'm-excursie' && x.actiune === 'raspuns' && !S.misiuni.excursie) toast('Răspunsul a ajuns doar la dirigintă. Pentru misiune, folosește Răspunde tuturor.', { tip: 'avert' });
        if (x.refId === 'm-bunica' && x.actiune === 'redirectionare') {
          if (!x.atasamente.some((a) => a.nume.startsWith('invitatie'))) toast('Ai scos invitația din atașamente! Redirecționeaz-o cu tot cu atașament.', { tip: 'avert' });
          else if (toti.some((a) => a !== P.bunica.adresa && a !== eu())) bifeaza('invitatie');
        }
      }

      // ---------- Răspunsuri automate și livrare ----------
      function programeazaRaspunsuri(x) {
        const toti = unice([...x.catre, ...x.cc, ...x.cci]);
        const prenume = esc(S.prenume);
        let intarziere = 3000 + Math.random() * 2000;
        const fir = firKey(x);
        const pune = (de, subiect, html, extra = {}) => { S.asteptare.push({ la: Date.now() + intarziere, mesaj: { id: `r-${idNou()}`, dosar: 'primite', de, catre: [eu()], cc: [], cci: [], subiect, html, atasamente: [], citit: false, important: false, etichete: [], categorie: 'principale', fir, ...extra } }); intarziere += 2500 + Math.random() * 2500; };
        const re = `Re: ${x.subiect.replace(/^(re|fwd?):\s*/i, '')}`;
        for (const a of toti) {
          if (a === eu()) { pune(x.de, x.subiect, x.html, { atasamente: x.atasamente, catre: x.catre, cc: x.cc }); continue; }
          if (PHISHING.includes(a)) continue;
          const c = Object.values(P).find((p) => p.adresa === a);
          const domeniu = a.split('@')[1];
          if (!c) {
            if (DOMENII_CUNOSCUTE.includes(domeniu) && !contactDupa(a) && !ALTE_NUME[a]) {
              pune({ nume: 'Mail Delivery Subsystem', adresa: 'mailer-daemon@edumail.ro' }, `Mesaj nelivrat: ${x.subiect || '(fără subiect)'}`,
                `<p><b>Adresa nu a fost găsită</b></p><p>Mesajul tău nu a fost livrat către <b>${esc(a)}</b> deoarece adresa nu a putut fi găsită sau nu poate primi e-mailuri.</p><p>Verifică dacă ai scris-o corect (o literă greșită ajunge la altcineva sau nicăieri). Sfat: alege destinatarii din <b>sugestii</b> sau din <b>agendă</b>.</p>`, { sistem: true, fir: undefined });
            }
            continue;
          }
          const atas = x.atasamente.map((y) => esc(y.nume)).join(', ');
          if (c === P.tic) {
            if (x.refId === 'm-tema' && x.atasamente.length) pune(c, re, `<p>Bună, ${prenume}!</p><p>Am primit tema (<b>${atas}</b>). Mulțumesc că ai trimis-o la timp și că ai folosit <b>Răspunde</b>! O corectez până vineri.</p><p>Prof. Elena Marinescu</p>`);
            else if (x.refId === 'm-tema') pune(c, re, `<p>Bună, ${prenume}!</p><p>Am primit mesajul, dar <b>nu văd niciun atașament</b>. Nu uita să atașezi tema cu butonul cu agrafa.</p><p>Prof. Elena Marinescu</p>`);
            else pune(c, re, `<p>Bună, ${prenume}!</p><p>Mulțumesc pentru mesaj. Ne vedem la ora de TIC!</p><p>Prof. Elena Marinescu</p>`);
          } else if (c === P.dir) {
            pune(c, re, x.refId === 'm-excursie' ? `<p>Mulțumesc, ${prenume}! Te-am trecut pe lista pentru excursie. Nu uita: sâmbătă, ora 9:00, în fața școlii.</p><p>Diriginta</p>` : `<p>Mulțumesc pentru mesaj, ${prenume}. Vorbim mâine la ora de dirigenție.</p><p>Maria Ionescu</p>`);
          } else if (c === P.bunica) {
            pune(c, re, '<p>Ce bucurie să primesc mesaj de la tine, puiule! Abia aștept să te văd duminică.</p><p>Te pup,<br>Bunica</p>');
          } else if (c === P.mama) {
            pune(c, re, '<p>Am primit mesajul, puiule. Ne vedem diseară! ❤</p>');
          } else if (c === P.robotica) {
            pune(c, re, '<p>Mulțumim! Te așteptăm joi la ora 15, în laboratorul de informatică.</p><p>Clubul de robotică</p>');
          } else if (c === P.muz) {
            pune(c, re, '<p>Mulțumesc! Ne vedem marți la repetiție.</p><p>Prof. Doru Vasilescu</p>');
          } else if (COLEGI.includes(a)) {
            const nume = c.nume.split(' ')[0];
            if (x.actiune === 'redirectionare' && x.refId === 'm-bunica') pune(c, `Re: ${x.subiect}`, `<p>Mersi că mi-ai trimis invitația! Am deschis-o: vin sigur duminică 🎂</p><p>${nume}</p>`);
            else if (x.actiune !== 'raspuns-tuturor' && Math.random() < 0.75) {
              const v = ['Salut! Am primit mesajul, mersi! 😊', 'Ok, ne vedem mâine la școală!', 'Mersi mult! Exact de asta aveam nevoie.', 'Super! Vorbim în pauză.'];
              pune(c, re, `<p>${v[Math.floor(Math.random() * v.length)]}</p><p>${nume}</p>`);
            }
          }
        }
      }
      // Răspunsul automat de vacanță trimis de căsuța elevului
      function raspunsVacanta(m2) {
        const v = ST_().vacanta;
        const a = m2.de.adresa;
        if (!v.activ || m2.sistem || m2.phishing || a === eu() || PHISHING.includes(a) || ALTE_NUME[a] || v.raspunsLa.includes(a)) return;
        if (v.doarAgenda && !contactDupa(a)) return;
        v.raspunsLa.push(a);
        S.mesaje.push({ id: `v-${idNou()}`, dosar: 'trimise', de: { nume: numeleMeu(), adresa: eu() }, catre: [a], cc: [], cci: [], subiect: v.subiect, html: `<p>${esc(v.mesaj).replace(/\n/g, '<br>')}</p>`, atasamente: [], data: Date.now() + 1, citit: true, important: false, etichete: [], categorie: 'principale', automat: true, fir: firKey(m2) });
        toast(`Răspunsul automat de vacanță a fost trimis către ${m2.de.nume || a}.`);
      }
      let primaLivrare = true;
      function livreazaRestante(manual) {
        const acum = Date.now();
        let nou = 0, schimbat = false;
        const gata = S.asteptare.filter((y) => y.la <= acum);
        if (gata.length) S.asteptare = S.asteptare.filter((y) => y.la > acum);
        const sosiri = SOSIRI.filter((s) => !S.sosite[s.id] && acum - pornit >= s.dupa && !primaLivrare).map((s) => {
          S.sosite[s.id] = acum;
          return { mesaj: { id: s.id, dosar: 'primite', catre: [eu()], cc: [], cci: [], atasamente: [], citit: false, important: false, etichete: [], categorie: 'principale', importantMarcaj: false, ...s.mesaj(eu(), S.prenume) } };
        });
        for (const { mesaj } of [...gata, ...sosiri]) {
          mesaj.data = Date.now();
          if (mesaj.categorie == null) mesaj.categorie = 'principale';
          if (!mesaj.etichete) mesaj.etichete = [];
          S.mesaje.push(mesaj); nou++;
          const principal2 = mesaj.categorie === 'principale';
          if (principal2 || outlook()) toast(`Mesaj nou de la ${mesaj.de.nume}: ${mesaj.subiect}`, { tip: mesaj.sistem ? 'err' : 'nou', durata: 6000, actiune: { text: 'Deschide', fn: () => { UI.cautare = ''; cautare.value = ''; UI.dosar = 'primite'; UI.categorie = 'principale'; deschide(mesaj.id); } } });
          raspunsVacanta(mesaj);
        }
        // Mesajele amânate se întorc în Mesaje primite
        for (const x of S.mesaje) if (x.dosar === 'amanate' && x.amanatPana && x.amanatPana <= acum) { x.dosar = 'primite'; x.citit = false; x.revenit = acum; delete x.amanatPana; schimbat = true; toast(`Conversația amânată „${x.subiect}” a revenit în Mesaje primite.`); }
        primaLivrare = false;
        if (nou || schimbat) { salveaza(); randeazaPastrand(); }
        else if (manual) toast(outlook() ? 'Sunteți la zi.' : 'Nu ai mesaje noi.');
        else if (Date.now() - ultimaActualizare > 30e3) { ultimaActualizare = Date.now(); if (!listaEl.hidden && !radacina.querySelector('.ap-posta-meniu')) randeazaLista(); }
      }
      let ultimaActualizare = Date.now();
      // Re-randează fără să strice ce scrie elevul (fereastra de compunere rămâne separată)
      function randeazaPastrand() {
        const ae = document.activeElement;
        if (radacina.querySelector('.ap-posta-meniu') && !ae?.closest?.('.ap-posta-compune')) { randeazaNav(); actualizeazaTitlu(); return; }
        randeaza();
        if (ae && ae.isConnected) ae.focus?.();
      }
      const ceas = setInterval(() => livreazaRestante(false), 1000);

      // ---------- Tastatura (scurtături ca în Gmail) ----------
      function tasta(e) {
        if (!radacina.isConnected) return;
        const t = e.target;
        if (e.key === 'Escape') { if (meniuDeschis) { inchideMeniu(); return; } const vz = radacina.querySelector('.ap-posta-viz'); if (vz) { vz.remove(); return; } radacina.querySelector('.ap-posta-panou')?.remove(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || radacina.querySelector('.ap-posta-modal, .ap-posta-viz')) return;
        const msj = firMesaje();
        const ids = msj.map((x) => x.id);
        const x = [...msj].reverse().find((y) => y.de.adresa !== eu()) || msj[msj.length - 1];
        const k = e.key;
        const fol = () => { e.preventDefault(); };
        if (k === 'c') { fol(); compune({ mod: 'nou' }); }
        else if (k === '/') { fol(); cautare.focus(); }
        else if (k === '?') scurtaturi();
        else if (x && k === 'r') { fol(); compune({ mod: 'raspuns', ref: x }); }
        else if (x && k === 'a') { fol(); compune({ mod: 'raspuns-tuturor', ref: x }); }
        else if (x && k === 'f') { fol(); compune({ mod: 'redirectionare', ref: msj[msj.length - 1] }); }
        else if (ids.length && (k === 'Delete' || k === '#')) sterge(ids);
        else if (ids.length && k === 'e') arhiveaza(ids);
        else if (ids.length && k === '!') raporteazaSpam(ids);
        else if (ids.length && k === 's') { msj[msj.length - 1].important = !msj[msj.length - 1].important; salveaza(); randeaza(); }
        else if (ids.length && k === 'U') { marcheaza(ids, false); inapoiLaLista(); }
        else if (ids.length && k === 'I') marcheaza(ids, true);
        else if (ids.length && k === 'b') { const b = citireEl.querySelector('[aria-label="Amână"]'); if (b) meniuAmanare(b, ids); }
        else if (UI.fir && k === 'u') inapoiLaLista();
        else if (k === 'j' || k === 'k') {
          const l = conversatii().filter((v) => v.f);
          if (!l.length) return;
          const i = l.findIndex((v) => UI.fir && v.f.cheie === UI.fir.cheie && v.f.zona === UI.fir.zona);
          const n = UI.fir ? l[Math.max(0, Math.min(l.length - 1, i + (k === 'j' ? 1 : -1)))] : l[0];
          if (UI.fir || corp.classList.contains('impartit')) { if (n) deschideFir(n.f); }
          else listaEl.querySelector(`[data-k="${CSS.escape(n.k)}"]`)?.focus();
        } else if (k === 'o' && !UI.fir) { const li = t.closest?.('.ap-posta-rand'); li?.click(); }
      }
      document.addEventListener('keydown', tasta);
      function opreste() { clearInterval(ceas); document.removeEventListener('keydown', tasta); UI.trimitere?.gata(); if (tSalv) salveazaAcum(); }
      curent = { opreste };
      window.addEventListener('resize', () => { if (window.innerWidth >= 760 && UI.navDeschis) { UI.navDeschis = false; randeaza(); } }, { passive: true });

      livreazaRestante();
      randeaza();
      if (!S.vazutBunVenit) { S.vazutBunVenit = true; salveaza(); setTimeout(() => toast('Bun venit! Deschide „Misiuni” (sus, în dreapta) ca să vezi provocările.', { durata: 6000 }), 400); }
      else if (!S.vazutV2) setTimeout(() => toast('Căsuța ta arată acum ca Gmail. Din Setări (rotița) o poți face să arate ca Outlook. Ai și 4 misiuni noi!', { durata: 8000, actiune: { text: 'Misiuni', fn: () => panouMisiuni() } }), 400);
      S.vazutV2 = true;
    }
  }

  routes.push({ pattern: /^\/aplicatii\/posta$/, handler: porneste });
})();

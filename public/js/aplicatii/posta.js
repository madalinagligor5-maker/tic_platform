'use strict';
// Poștă electronică (simulator) pentru clasa a VI-a: o căsuță ca Gmail/Outlook, complet locală.
// Elevul își alege o adresă fictivă; mesajele, contactele și misiunile se păstrează în browser
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
  const oraScurta = (t) => {
    const d = new Date(t), azi = new Date();
    if (d.toDateString() === azi.toDateString()) return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
  };
  const dataLunga = (t) => new Date(t).toLocaleString('ro-RO', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const unice = (a) => [...new Set(a.map((x) => x.toLowerCase()))];
  const svg = (d, cls = 'ap-posta-ico') => h('span', { class: cls, 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>` });
  const I = {
    primite: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    stea: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    trimise: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    ciorne: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
    spam: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16v.5"/>',
    sterse: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    dosar: '<path d="M3 6h7l2 2h9v11H3z"/>',
    scrie: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    cauta: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    agrafa: '<path d="M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L14 7"/>',
    raspunde: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 016 6v1"/>',
    toti: '<path d="M8 7l-5 5 5 5"/><path d="M12 7l-5 5 5 5"/><path d="M7 12h8a6 6 0 016 6v1"/>',
    redir: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 00-6 6v1"/>',
    restaureaza: '<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>',
    necitit: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    actualizeaza: '<path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 4v5h-5"/>',
    agenda: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 016 5"/>',
    misiuni: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    salveaza: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    inchide: '<path d="M6 6l12 12M18 6L6 18"/>',
    inapoi: '<path d="M15 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bifa: '<path d="M5 12l5 5 9-10"/>',
    pericol: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    mareste: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    fisier: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
  };
  function descarca(nume, continut, tip) {
    const url = URL.createObjectURL(new Blob([continut], { type: tip }));
    const a = h('a', { href: url, download: nume });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- Text formatat: doar etichete sigure, fără atribute (CSP blochează style="") ----------
  const PERMISE = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'BLOCKQUOTE', 'A', 'SPAN']);
  function curataNoduri(src) {
    const out = [];
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { out.push(document.createTextNode(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(tag)) continue;
      const copii = curataNoduri(n);
      if (!PERMISE.has(tag)) { out.push(...copii); continue; }
      const el = document.createElement(tag === 'SPAN' ? 'span' : tag.toLowerCase());
      if (tag === 'A') { const href = n.getAttribute('href') || n.getAttribute('data-href') || ''; if (/^https?:\/\//i.test(href)) el.setAttribute('href', href); }
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
  };
  const PHISHING = ['securitate@edumai1-suport.com', 'castigator@premii-gratis-ro.top', 'andrei.matei.poze@mail-rapid.click'];
  const COLEGI = [P.andrei, P.ioana, P.mihai, P.sara].map((p) => p.adresa);
  const DOMENII_CUNOSCUTE = ['edumail.ro', 'scoala-edu.ro'];

  function mesajePregatite(eu, prenume) {
    const acum = Date.now(), min = 60e3, ora = 60 * min, zi = 24 * ora;
    const m = (id, de, inainte, subiect, html, extra = {}) => ({ id, dosar: 'primite', de, catre: [eu], cc: [], cci: [], subiect, html, atasamente: [], data: acum - inainte, citit: false, important: false, ...extra });
    return [
      m('m-bun-venit', { nume: 'Echipa EduMail', adresa: 'echipa@edumail.ro' }, 4 * min, 'Bun venit în căsuța ta EduMail!',
        `<p>Bună, ${esc(prenume)}!</p><p>Aceasta este căsuța ta de <b>poștă electronică</b>. Este un <b>simulator</b>: mesajele nu pleacă pe internet, dar totul funcționează ca în Gmail sau Outlook.</p><p>Ce poți face aici:</p><ul><li>citești mesajele din <b>Mesaje primite</b>;</li><li>scrii mesaje noi cu <b>Scrie</b>, cu <b>Către</b>, <b>CC</b>, <b>CCI</b> și <b>Subiect</b>;</li><li>folosești <b>Răspunde</b>, <b>Răspunde tuturor</b> și <b>Redirecționează</b>;</li><li>rezolvi <b>Misiunile</b> (butonul din dreapta sus).</li></ul><p>Atenție: printre mesaje s-au strecurat și câteva <b>înșelătorii</b>. Le găsești?</p><p>Spor la treabă!<br>Echipa EduMail</p>`, { citit: true }),
      m('m-phishing3', { nume: 'Andrei Matei', adresa: 'andrei.matei.poze@mail-rapid.click' }, 32 * min, 'uite pozele de la excursie!!!',
        '<p>salut, uite pozele de la excursie</p><p>deschide repede fisierul ca sa le vezi pe toate, sunt super tari!!!</p>',
        { atasamente: [{ nume: 'poze_excursie.exe', marime: 2.3 * MB }], phishing: true,
          indicii: ['Numele afișat este „Andrei Matei”, dar adresa reală este andrei.matei.poze@mail-rapid.click, nu adresa lui Andrei din agendă.', 'Pozele nu vin niciodată ca fișier .exe: un .exe este un program, care poate fi un virus.', 'Te grăbește („deschide repede”) și nu spune nimic personal.'] }),
      m('m-tema', P.tic, 2 * ora, 'Tema la TIC: reguli de siguranță pe internet',
        `<p>Dragă ${esc(prenume)},</p><p>Îți trimit în <b>atașament</b> fișa de lucru pentru tema de săptămâna aceasta.</p><ol><li>Descarcă fișa și completează-o.</li><li>Apasă <b>Răspunde</b> la acest mesaj (nu scrie un mesaj nou).</li><li>Atașează tema rezolvată cu butonul cu <b>agrafa</b>.</li></ol><p>Termen: <b>vineri</b>. Nu uita de o formulă de salut și de semnătură!</p><p>Cu drag,<br>prof. Elena Marinescu</p>`,
        { atasamente: [{ nume: 'Fisa-de-lucru-siguranta.pdf', marime: 312 * 1024 }], important: true }),
      m('m-phishing1', { nume: 'Echipa de securitate EduMail', adresa: 'securitate@edumai1-suport.com' }, 3 * ora, 'URGENT: Contul tău va fi închis în 24 de ore!',
        '<p>Stimate utilizator,</p><p>Am detectat o <b>activitate neobișnuită</b> în contul tău. Dacă nu îți confirmi parola în următoarele <b>24 de ore</b>, contul va fi <b>închis definitiv</b> și vei pierde toate mesajele.</p><p>Apasă aici pentru verificare: <a href="http://edumail-verificare-cont.xyz/login">www.edumail.ro/verificare-cont</a></p><p>Vă mulțumim,<br>Departamentul de Securitate</p>',
        { phishing: true, indicii: ['Adresa expeditorului este edumai1-suport.com: cu cifra 1 în loc de litera l. Nu este edumail.ro.', 'Linkul arată „www.edumail.ro”, dar duce de fapt la edumail-verificare-cont.xyz (ține mouse-ul deasupra și citește jos).', 'Te sperie și te grăbește („24 de ore”, „închis definitiv”).', 'Nicio firmă serioasă nu îți cere parola pe e-mail.'] }),
      m('m-excursie', P.dir, 5 * ora, 'Excursie la Muzeul Satului – cine vine?',
        `<p>Dragi elevi,</p><p>Sâmbătă, <b>22 noiembrie</b>, mergem în excursie la <b>Muzeul Satului</b>. Plecăm la ora 9:00 din fața școlii.</p><p>Vă rog să răspundeți la acest mesaj cu <b>Răspunde tuturor</b> până miercuri, ca să știe și colegii, și comitetul de părinți cine vine.</p><p>Doamna secretară și părinții sunt în CC, ca să afle și ei.</p><p>Diriginta,<br>Maria Ionescu</p>`,
        { catre: [eu, P.andrei.adresa, P.ioana.adresa, P.mihai.adresa, P.sara.adresa], cc: ['secretariat@scoala-edu.ro', 'parinti.clasa6@edumail.ro'] }),
      m('m-phishing2', { nume: 'Premii Gratuite', adresa: 'castigator@premii-gratis-ro.top' }, 8 * ora, '🎁 FELICITĂRI!!! Ai câștigat o tabletă nouă!',
        '<p><b>FELICITĂRI!!!</b> Adresa ta a fost aleasă câștigătoare la marea tombolă!</p><p>Ca să primești <b>TABLETA GRATUITĂ</b>, completează <b>numele, adresa de acasă și parola</b> contului tău pe pagina noastră. Oferta expiră în <b>10 minute</b>!</p><p><a href="http://premiu-tableta-gratis.top/revendica">REVENDICĂ PREMIUL ACUM</a></p>',
        { phishing: true, indicii: ['Nu te-ai înscris la nicio tombolă: nu ai cum să câștigi.', 'Adresa expeditorului (premii-gratis-ro.top) este a unui site necunoscut.', 'Îți cere date personale și parola.', 'Îți dă doar 10 minute ca să nu ai timp să te gândești sau să întrebi un adult.'] }),
      m('m-bunica', P.bunica, 26 * ora, 'Te invit la ziua mea! 🎂',
        `<p>Dragă ${esc(prenume)},</p><p>Duminică, la ora 13, fac 70 de ani și vreau să sărbătorim împreună, la mine acasă. Îți trimit invitația în atașament.</p><p>Dacă vrei, <b>trimite-i invitația și prietenului tău cel mai bun</b> de la școală: e și el binevenit! Fac plăcintă cu mere.</p><p>Te pup,<br>Bunica</p>`,
        { atasamente: [{ nume: 'invitatie-ziua-bunicii.jpg', marime: 1.8 * MB }] }),
      m('m-newsletter', { nume: 'Biblioteca Județeană', adresa: 'newsletter@biblioteca-judeteana.ro' }, 27 * ora, 'Noutăți în noiembrie: atelier de benzi desenate',
        '<p><b>Noutăți la Biblioteca Județeană</b></p><ul><li>Sâmbătă, ora 11: <b>atelier de benzi desenate</b> pentru copii de 10–14 ani;</li><li>50 de cărți noi la secția pentru copii;</li><li>Club de lectură: „Micul Prinț”.</li></ul><p>Programul complet: <a href="https://www.biblioteca-judeteana.ro/program">www.biblioteca-judeteana.ro/program</a></p><p>Primești acest mesaj pentru că te-ai abonat la noutățile bibliotecii. Te poți dezabona oricând.</p>', { citit: true }),
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
    ];
  }

  const MISIUNI = [
    { id: 'tema', titlu: 'Răspunde profesoarei de TIC și atașează tema', cum: 'Deschide mesajul „Tema la TIC”, apasă Răspunde, scrie câteva rânduri și atașează un fișier cu agrafa.', dece: 'Cu Răspunde, adresa expeditorului și subiectul (cu Re: în față) se completează singure. Atașamentul primit nu se trimite înapoi: îl adaugi tu pe al tău.' },
    { id: 'excursie', titlu: 'Răspunde tuturor la mesajul dirigintei', cum: 'Deschide „Excursie la Muzeul Satului” și apasă Răspunde tuturor.', dece: 'Răspunsul pleacă la expeditor și la toți cei din Către și CC. Folosește-l doar când chiar trebuie să afle toți.' },
    { id: 'invitatie', titlu: 'Redirecționează invitația bunicii unui coleg', cum: 'Deschide invitația bunicii, apasă Redirecționează și scrie la Către adresa unui coleg (sau alege-l din agendă).', dece: 'La redirecționare câmpul Către e gol, subiectul primește Fwd:, iar atașamentele merg mai departe. Bunica ți-a dat voie; altfel, întreabă înainte să redirecționezi un mesaj personal.' },
    { id: 'cci', titlu: 'Trimite un mesaj cu o adresă în CCI', cum: 'În fereastra de mesaj nou apasă CCI și scrie acolo o adresă.', dece: 'Cei din CCI primesc mesajul, dar ceilalți destinatari nu le văd adresele. E util când scrii multor oameni care nu se cunosc între ei.' },
    { id: 'phishing', titlu: 'Raportează ca spam toate cele 3 mesaje înșelătoare', cum: 'Caută mesajele suspecte (adresă ciudată, grabă, premii, fișier .exe), deschide-le și apasă Raportează spam.', dece: 'Phishingul („pescuitul” de date) încearcă să-ți fure parola sau datele. Verifică adresa reală a expeditorului, nu doar numele afișat.', total: 3 },
    { id: 'contact', titlu: 'Adaugă un contact nou în agendă', cum: 'Deschide Agenda → Contact nou, sau apasă „Adaugă la contacte” lângă expeditorul unui mesaj.', dece: 'Din agendă alegi destinatarul fără greșeli de tastare.' },
    { id: 'restaurare', titlu: 'Șterge un mesaj și recuperează-l din Elemente șterse', cum: 'Șterge un mesaj, deschide dosarul Elemente șterse, deschide mesajul și apasă Restaurează.', dece: 'Mesajele șterse nu dispar imediat: stau în Elemente șterse până golești dosarul.' },
    { id: 'cautare', titlu: 'Găsește cu Căutarea mesajul despre „serbare”', cum: 'Scrie serbare în caseta de căutare, apasă Enter și deschide mesajul găsit.', dece: 'Căutarea găsește mesaje după expeditor, subiect sau cuvinte din text: mult mai repede decât derulând lista.' },
  ];
  const FISIERE_EXEMPLU = [
    { nume: 'Tema-siguranta-internet.docx', marime: 245 * 1024 },
    { nume: 'Harta-Europei.png', marime: 1.6 * MB },
    { nume: 'Prezentare-proiect.pptx', marime: 8.4 * MB },
    { nume: 'Poze-excursie.zip', marime: 14.2 * MB },
    { nume: 'Film-serbare.mp4', marime: 48 * MB },
  ];
  const DOSARE = [
    ['primite', 'Mesaje primite', I.primite], ['importante', 'Importante', I.stea], ['trimise', 'Trimise', I.trimise],
    ['ciorne', 'Ciorne', I.ciorne], ['spam', 'Spam', I.spam], ['sterse', 'Elemente șterse', I.sterse],
  ];

  function cutieNoua(prenume, nume, adresa) {
    const contacte = Object.values(P).map((p) => ({ id: idNou(), nume: p.nume, adresa: p.adresa, grup: p.grup }));
    return { v: 1, prenume, nume, adresa, creat: Date.now(), mesaje: mesajePregatite(adresa, prenume), contacte, dosare: [], misiuni: {}, asteptare: [] };
  }

  // ---------- Aplicația ----------
  let curent = null; // { opreste() } pentru ecranul afișat
  window.addEventListener('hashchange', () => { if (curent && !location.hash.startsWith('#/aplicatii/posta')) { curent.opreste(); curent = null; } });

  async function porneste(m, params) {
    curent?.opreste();
    let S = null;
    try { S = await store.get(); } catch { S = null; }
    const radacina = h('div', { class: 'ap-posta' });
    let bara = null;
    if (params?.get('sarcina') && window.EduSarcini?.bara) {
      try { bara = await window.EduSarcini.bara('posta', async () => lucrare()); } catch { bara = null; }
    }
    show(h('div', { class: 'lab-ecran ap-posta-ecran' }, bara, radacina));
    document.title = 'Poștă electronică – edudigi';

    function lucrare() {
      if (!S) return null;
      const trimise = S.mesaje.filter((x) => x.trimisDeElev).sort((a, b) => a.data - b.data);
      return {
        titlu: 'Mesajele mele', tip: 'mesaje', adresa: S.adresa,
        date: trimise.map((x) => ({ catre: x.catre.join('; '), cc: x.cc.join('; '), cci: x.cci.join('; '), subiect: x.subiect, text: htmlLaText(x.html), atasamente: x.atasamente.map((a) => a.nume), trimisLa: new Date(x.data).toISOString(), tipActiune: x.actiune || 'nou' })),
        misiuni: { realizate: MISIUNI.filter((mi) => S.misiuni[mi.id]).length, total: MISIUNI.length },
      };
    }

    // ---------- Prima pornire: alegerea adresei ----------
    function ecranBunVenit() {
      const fPrenume = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', placeholder: 'de exemplu, Ana' });
      const fNume = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', placeholder: 'de exemplu, Pop' });
      const fUser = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Numele de utilizator' });
      const err = h('p', { class: 'ap-posta-eroare', role: 'alert' });
      let atins = false;
      const sugereaza = () => { if (!atins) fUser.value = [fPrenume.value, fNume.value].map((x) => norm(x).replace(/[^a-z0-9]/g, '')).filter(Boolean).join('.'); };
      fPrenume.addEventListener('input', sugereaza); fNume.addEventListener('input', sugereaza);
      fUser.addEventListener('input', () => { atins = true; });
      const creeaza = async (e) => {
        e.preventDefault();
        const u = fUser.value.trim().toLowerCase();
        if (!fPrenume.value.trim()) return void (err.textContent = 'Scrie-ți prenumele.');
        if (!/^[a-z][a-z0-9._-]{2,29}$/.test(u) || /[._-]$/.test(u) || u.includes('..')) return void (err.textContent = 'Numele de utilizator: 3–30 caractere, începe cu o literă; doar litere fără diacritice, cifre, punct, - și _.');
        S = cutieNoua(fPrenume.value.trim(), fNume.value.trim(), `${u}@${DOMENIU}`);
        await salveazaAcum();
        aplicatie();
      };
      umple(radacina, h('div', { class: 'ap-posta-bunvenit' },
        h('a', { class: 'ap-posta-inapoi', href: '#/aplicatii' }, '← Aplicații'),
        h('form', { class: 'ap-posta-card', onsubmit: creeaza },
          h('div', { class: 'ap-posta-logo mare' }, svg(I.necitit), h('b', {}, 'EduMail')),
          h('h1', {}, 'Poștă electronică (simulator)'),
          h('p', {}, 'Aici exersezi lucrul cu e-mailul fără un cont adevărat. Alege-ți o adresă fictivă: mesajele rămân doar pe acest calculator.'),
          h('p', { class: 'ap-posta-mic' }, 'Știai că? În România, un cont Google îl faci singur abia de la 16 ani. Până atunci, contul îl fac părinții sau îl primești de la școală.'),
          h('label', {}, 'Prenume', fPrenume), h('label', {}, 'Nume', fNume),
          h('label', {}, 'Adresa ta de e-mail', h('span', { class: 'ap-posta-adresa-camp' }, fUser, h('span', {}, `@${DOMENIU}`))),
          err, h('button', { class: 'btn', type: 'submit' }, 'Creează căsuța poștală'))));
      fPrenume.focus();
    }

    // ---------- Salvare ----------
    let tSalv = null;
    async function salveazaAcum() {
      clearTimeout(tSalv); tSalv = null;
      try { await store.put(S); } catch { toast('Nu am putut salva: spațiul din browser e plin.', { tip: 'err' }); }
    }
    function salveaza() { clearTimeout(tSalv); tSalv = setTimeout(salveazaAcum, 300); }

    if (!S) return ecranBunVenit();
    return aplicatie();

    // ---------- Ecranul principal ----------
    function aplicatie() {
      const UI = { dosar: 'primite', sel: null, cautare: '', bifate: new Set(), detalii: false, compunere: null };
      const eu = () => S.adresa;
      const gaseste = (id) => S.mesaje.find((x) => x.id === id);
      const contactDupa = (a) => S.contacte.find((c) => c.adresa.toLowerCase() === (a || '').toLowerCase());
      const numeDupa = (a) => (a?.toLowerCase() === eu() ? 'eu' : contactDupa(a)?.nume || ALTE_NUME[a] || a);
      const culoare = (a) => { let s = 0; for (const c of a || '') s = (s * 31 + c.charCodeAt(0)) >>> 0; return s % 8; };
      const avatar = (nume, a) => h('span', { class: `ap-posta-avatar c${culoare(a)}`, 'aria-hidden': 'true' }, (nume || a || '?').replace(/^(prof\.|bunica)\s*/i, '').charAt(0).toUpperCase());

      // Elementele fixe ale interfeței
      const cautare = h('input', { type: 'search', placeholder: 'Caută în mesaje', 'aria-label': 'Caută în mesaje', autocomplete: 'off' });
      const btnMisiuni = h('button', { class: 'ap-posta-btn-sus', type: 'button', onclick: () => panouMisiuni() });
      const sus = h('header', { class: 'ap-posta-sus' },
        h('a', { class: 'ap-posta-inapoi', href: '#/aplicatii' }, '← Aplicații'),
        h('div', { class: 'ap-posta-logo' }, svg(I.necitit), h('b', {}, 'EduMail'), h('span', {}, 'Poștă electronică (simulator)')),
        h('form', { class: 'ap-posta-cauta', role: 'search', onsubmit: (e) => { e.preventDefault(); cauta(cautare.value); } }, svg(I.cauta), cautare,
          h('button', { type: 'button', class: 'ap-posta-x', title: 'Șterge căutarea', onclick: () => { cautare.value = ''; cauta(''); } }, svg(I.inchide))),
        btnMisiuni,
        h('button', { class: 'ap-posta-btn-sus', type: 'button', onclick: () => panouAgenda() }, svg(I.agenda), h('span', {}, 'Agendă')),
        h('button', { class: 'ap-posta-cont', type: 'button', title: S.adresa, 'aria-label': 'Contul meu', onclick: (e) => meniuCont(e.currentTarget) }, avatar(S.prenume, S.adresa)));
      cautare.addEventListener('input', () => { if (!cautare.value) cauta(''); });
      const dosareEl = h('nav', { class: 'ap-posta-dosare', 'aria-label': 'Dosare' });
      const listaEl = h('section', { class: 'ap-posta-lista', 'aria-label': 'Lista de mesaje' });
      const citireEl = h('section', { class: 'ap-posta-citire', 'aria-label': 'Panoul de citire' });
      const corp = h('div', { class: 'ap-posta-corp' }, dosareEl, listaEl, citireEl);
      const stareLink = h('div', { class: 'ap-posta-statuslink', 'aria-hidden': 'true' });
      const toasturi = h('div', { class: 'ap-posta-toasturi', 'aria-live': 'polite' });
      umple(radacina, sus, corp, stareLink, toasturi);

      // ---------- Randare ----------
      function randeaza() { randeazaDosare(); randeazaLista(); randeazaCitire(); randeazaMisiuniBtn(); actualizeazaTitlu(); }
      function actualizeazaTitlu() {
        const n = S.mesaje.filter((x) => x.dosar === 'primite' && !x.citit).length;
        document.title = `${n ? `(${n}) ` : ''}Poștă electronică – edudigi`;
      }
      function randeazaMisiuniBtn() {
        const n = MISIUNI.filter((mi) => S.misiuni[mi.id]).length;
        umple(btnMisiuni, svg(I.misiuni), h('span', {}, 'Misiuni'), h('b', { class: n === MISIUNI.length ? 'gata' : '' }, `${n}/${MISIUNI.length}`));
      }
      function inDosar(d) {
        if (d === 'importante') return S.mesaje.filter((x) => x.important && !['sterse', 'spam'].includes(x.dosar));
        return S.mesaje.filter((x) => x.dosar === d);
      }
      function numeDosar(d) { return DOSARE.find((x) => x[0] === d)?.[1] || S.dosare.find((x) => x.id === d)?.nume || d; }
      function randeazaDosare() {
        const btnDosar = (id, nume, ico, extra) => {
          const n = id === 'ciorne' ? inDosar(id).length : inDosar(id).filter((x) => !x.citit).length;
          return h('li', {}, h('button', { type: 'button', class: 'ap-posta-dosar', 'aria-current': String(!UI.cautare && UI.dosar === id),
            onclick: () => { UI.dosar = id; UI.sel = null; UI.bifate.clear(); if (UI.cautare) { UI.cautare = ''; cautare.value = ''; } randeaza(); } },
          svg(ico), h('span', {}, nume), n ? h('b', {}, String(n)) : null), extra);
        };
        umple(dosareEl,
          h('button', { class: 'ap-posta-scrie', type: 'button', onclick: () => compune({ mod: 'nou' }) }, svg(I.scrie), h('span', {}, 'Scrie')),
          h('ul', {}, DOSARE.map(([id, nume, ico]) => btnDosar(id, nume, ico)),
            S.dosare.map((d) => btnDosar(d.id, d.nume, I.dosar, h('button', { type: 'button', class: 'ap-posta-x mic', title: `Șterge dosarul ${d.nume}`, onclick: () => stergeDosar(d) }, svg(I.inchide))))),
          h('button', { class: 'ap-posta-dosar-nou', type: 'button', onclick: () => dosarNou() }, svg(I.plus), 'Dosar nou'));
      }
      function mesajeAfisate() {
        let a;
        if (UI.cautare) {
          const q = norm(UI.cautare);
          a = S.mesaje.filter((x) => x.dosar !== 'sterse' && norm([x.de.nume, x.de.adresa, x.subiect, htmlLaText(x.html), ...x.catre, ...x.cc, ...x.atasamente.map((y) => y.nume)].join(' ')).includes(q));
        } else a = inDosar(UI.dosar);
        return a.sort((x, y) => y.data - x.data);
      }
      function randeazaLista() {
        const lista = mesajeAfisate();
        const titlu = UI.cautare ? `Rezultate pentru „${UI.cautare}”` : numeDosar(UI.dosar);
        const toateBifate = lista.length && lista.every((x) => UI.bifate.has(x.id));
        const bif = h('input', { type: 'checkbox', 'aria-label': 'Selectează toate', title: 'Selectează toate' });
        bif.checked = !!toateBifate;
        bif.addEventListener('change', () => { if (bif.checked) lista.forEach((x) => UI.bifate.add(x.id)); else UI.bifate.clear(); randeazaLista(); });
        const ids = () => [...UI.bifate];
        const unelte = UI.bifate.size
          ? [unealta(I.sterse, UI.dosar === 'sterse' ? 'Șterge definitiv' : 'Șterge', () => sterge(ids())),
             UI.dosar === 'spam' ? unealta(I.primite, 'Nu este spam', () => nuESpam(ids())) : unealta(I.spam, 'Raportează spam', () => raporteazaSpam(ids())),
             unealta(I.necitit, 'Citit', () => marcheaza(ids(), true)), unealta(I.necitit, 'Necitit', () => marcheaza(ids(), false)), selectMuta(ids())]
          : [unealta(I.actualizeaza, 'Actualizează', () => { livreazaRestante(); toast('Căsuța este la zi.'); }),
             ['spam', 'sterse'].includes(UI.dosar) && lista.length && !UI.cautare ? unealta(I.sterse, 'Golește dosarul', () => golește()) : null];
        umple(listaEl,
          h('div', { class: 'ap-posta-lista-cap' }, bif, h('h2', {}, titlu), h('span', { class: 'ap-posta-mic' }, `${lista.length} ${lista.length === 1 ? 'mesaj' : 'mesaje'}`)),
          h('div', { class: 'ap-posta-unelte' }, unelte),
          UI.dosar === 'spam' && !UI.cautare ? h('p', { class: 'ap-posta-nota' }, 'Mesajele nedorite și înșelătoare. Nu da clic pe linkurile din ele și nu deschide atașamentele.') : null,
          UI.dosar === 'sterse' && !UI.cautare ? h('p', { class: 'ap-posta-nota' }, 'Mesajele șterse stau aici până golești dosarul. De aici le poți restaura.') : null,
          lista.length ? h('ul', { class: 'ap-posta-mesaje', role: 'list' }, lista.map(randMesaj))
            : h('div', { class: 'ap-posta-gol' }, UI.cautare ? 'Niciun mesaj nu se potrivește căutării.' : 'Niciun mesaj în acest dosar.'));
      }
      function randMesaj(x) {
        const trimis = x.de.adresa === eu() && ['trimise', 'ciorne'].includes(x.dosar);
        const cine = trimis ? `Către: ${[...x.catre, ...x.cc, ...x.cci].map(numeDupa).join(', ') || '(fără destinatar)'}` : x.de.nume || x.de.adresa;
        const bif = h('input', { type: 'checkbox', 'aria-label': `Selectează: ${x.subiect}` });
        bif.checked = UI.bifate.has(x.id);
        bif.addEventListener('click', (e) => e.stopPropagation());
        bif.addEventListener('change', () => { if (bif.checked) UI.bifate.add(x.id); else UI.bifate.delete(x.id); randeazaLista(); });
        const stea = h('button', { type: 'button', class: `ap-posta-stea${x.important ? ' on' : ''}`, title: x.important ? 'Important (apasă ca să scoți)' : 'Marchează ca important', 'aria-pressed': String(!!x.important),
          onclick: (e) => { e.stopPropagation(); x.important = !x.important; salveaza(); randeaza(); } }, svg(I.stea));
        return h('li', { class: `ap-posta-mesaj${x.citit ? '' : ' necitit'}${UI.sel === x.id ? ' sel' : ''}`, tabindex: '0', 'data-id': x.id,
          onclick: () => deschide(x.id), onkeydown: (e) => { if (e.key === 'Enter') deschide(x.id); } },
        bif, stea,
        h('div', { class: 'ap-posta-mesaj-text' },
          h('div', { class: 'r1' }, h('span', { class: 'cine' }, x.dosar === 'ciorne' ? h('em', {}, 'Ciornă ') : null, cine),
            x.atasamente.length ? svg(I.agrafa, 'ap-posta-ico mic') : null, h('time', {}, oraScurta(x.data))),
          h('div', { class: 'r2' }, UI.cautare && x.dosar !== 'primite' ? h('span', { class: 'ap-posta-eticheta' }, numeDosar(x.dosar)) : null,
            h('span', { class: 'subiect' }, x.subiect || '(fără subiect)'), h('span', { class: 'fragment' }, ` – ${htmlLaText(x.html).replace(/\s+/g, ' ').slice(0, 90)}`))));
      }
      const unealta = (ico, text, fn, extra = {}) => h('button', { type: 'button', class: 'ap-posta-unealta', title: extra.title || text, onclick: fn, ...extra.attr }, svg(ico), h('span', {}, text));
      function selectMuta(ids) {
        const s = h('select', { class: 'ap-posta-muta', 'aria-label': 'Mută în dosarul' },
          h('option', { value: '' }, 'Mută în…'),
          [['primite', 'Mesaje primite'], ...S.dosare.map((d) => [d.id, d.nume]), ['spam', 'Spam'], ['sterse', 'Elemente șterse']].map(([v, t]) => h('option', { value: v }, t)));
        s.addEventListener('change', () => { if (s.value) muta(ids, s.value); });
        return s;
      }

      function randeazaCitire() {
        const x = UI.sel && gaseste(UI.sel);
        corp.classList.toggle('citeste', !!x);
        if (!x) {
          return umple(citireEl, h('div', { class: 'ap-posta-gol mare' }, svg(I.necitit, 'ap-posta-ico urias'),
            h('p', {}, 'Selectează un mesaj ca să-l citești.'),
            h('p', { class: 'ap-posta-mic' }, 'Scurtături: C – mesaj nou · R – răspunde · A – răspunde tuturor · F – redirecționează · Delete – șterge · / – căutare · ? – toate scurtăturile')));
        }
        const trimisDeMine = x.de.adresa === eu();
        const ids = [x.id];
        const unelte = [
          h('button', { type: 'button', class: 'ap-posta-unealta doar-ingust', onclick: () => { UI.sel = null; randeaza(); } }, svg(I.inapoi), h('span', {}, 'Înapoi')),
          x.dosar === 'sterse'
            ? [unealta(I.restaureaza, 'Restaurează', () => restaureaza(x)), unealta(I.sterse, 'Șterge definitiv', () => sterge(ids))]
            : unealta(I.sterse, 'Șterge', () => sterge(ids)),
          x.dosar === 'spam' ? unealta(I.primite, 'Nu este spam', () => nuESpam(ids)) : !trimisDeMine ? unealta(I.spam, 'Raportează spam', () => raporteazaSpam(ids)) : null,
          unealta(I.necitit, 'Marchează ca necitit', () => { marcheaza(ids, false); UI.sel = null; randeaza(); }),
          unealta(I.stea, x.important ? 'Important' : 'Marchează important', () => { x.important = !x.important; salveaza(); randeaza(); }, { attr: { class: `ap-posta-unealta${x.important ? ' on' : ''}`, 'aria-pressed': String(!!x.important) } }),
          selectMuta(ids),
          unealta(I.salveaza, 'Salvează pe calculator', () => salveazaEml(x), { title: 'Descarcă mesajul ca fișier .eml' }),
        ];
        const destinatari = (lbl, a) => (a.length ? h('tr', {}, h('th', {}, lbl), h('td', {}, a.map((y) => (numeDupa(y) === y ? y : `${numeDupa(y)} <${y}>`)).join('; '))) : null);
        const detalii = UI.detalii ? h('table', { class: 'ap-posta-detalii' }, h('tbody', {},
          h('tr', {}, h('th', {}, 'De la:'), h('td', {}, `${x.de.nume} <${x.de.adresa}>`)),
          destinatari('Către:', x.catre), destinatari('CC:', x.cc), trimisDeMine ? destinatari('CCI:', x.cci) : (x.cci.includes(eu()) ? destinatari('CCI:', [eu()]) : null),
          h('tr', {}, h('th', {}, 'Data:'), h('td', {}, dataLunga(x.data))), h('tr', {}, h('th', {}, 'Subiect:'), h('td', {}, x.subiect)))) : null;
        const catreScurt = [...x.catre, ...x.cc, ...(trimisDeMine ? x.cci : x.cci.filter((y) => y === eu()))].map(numeDupa).join(', ') || 'destinatari nedezvăluiți';
        const corpMesaj = h('div', { class: 'ap-posta-text' }, parseaza(x.html));
        corpMesaj.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) { e.preventDefault(); clicLink(a.getAttribute('href') || '', x); } });
        corpMesaj.addEventListener('mouseover', (e) => { const a = e.target.closest('a'); stareLink.textContent = a ? a.getAttribute('href') || '' : ''; stareLink.classList.toggle('vizibil', !!a); });
        corpMesaj.addEventListener('mouseleave', () => stareLink.classList.remove('vizibil'));
        umple(citireEl,
          h('div', { class: 'ap-posta-unelte citire' }, unelte),
          h('article', { class: 'ap-posta-articol' },
            h('h2', {}, x.subiect || '(fără subiect)', h('span', { class: 'ap-posta-eticheta' }, numeDosar(x.dosar))),
            x.raportat && x.phishing ? h('div', { class: 'ap-posta-avert' }, svg(I.pericol), h('div', {}, h('b', {}, 'Mesaj înșelător (phishing). '), 'Indicii: ', h('ul', {}, (x.indicii || []).map((t) => h('li', {}, t))))) : null,
            h('div', { class: 'ap-posta-antet' }, avatar(x.de.nume, x.de.adresa),
              h('div', { class: 'ap-posta-de' },
                h('div', {}, h('b', {}, x.de.nume || x.de.adresa), ' ', h('span', { class: 'ap-posta-adresa' }, `<${x.de.adresa}>`),
                  !trimisDeMine && !contactDupa(x.de.adresa) && !x.sistem ? h('button', { type: 'button', class: 'ap-posta-link', onclick: () => adaugaContact(x.de.nume, x.de.adresa) }, '+ Adaugă la contacte') : null),
                h('div', { class: 'ap-posta-mic' }, `către ${catreScurt} `, h('button', { type: 'button', class: 'ap-posta-link', 'aria-expanded': String(UI.detalii), onclick: () => { UI.detalii = !UI.detalii; randeazaCitire(); } }, UI.detalii ? 'ascunde detaliile ▴' : 'detalii ▾'))),
              h('time', { class: 'ap-posta-mic' }, dataLunga(x.data))),
            detalii, corpMesaj,
            x.atasamente.length ? h('div', { class: 'ap-posta-atasamente' },
              h('p', { class: 'ap-posta-mic' }, `${x.atasamente.length} ${x.atasamente.length === 1 ? 'atașament' : 'atașamente'}`),
              x.atasamente.map((a) => cipAtasament(a, () => deschideAtasament(a, x)))) : null,
            x.dosar === 'ciorne' ? h('div', { class: 'ap-posta-actiuni' }, h('button', { type: 'button', class: 'btn small', onclick: () => compuneDinCiorna(x) }, 'Continuă ciorna'))
              : h('div', { class: 'ap-posta-actiuni' },
                h('button', { type: 'button', class: 'ap-posta-act', onclick: () => compune({ mod: 'raspuns', ref: x }) }, svg(I.raspunde), 'Răspunde'),
                h('button', { type: 'button', class: 'ap-posta-act', onclick: () => compune({ mod: 'raspuns-tuturor', ref: x }) }, svg(I.toti), 'Răspunde tuturor'),
                h('button', { type: 'button', class: 'ap-posta-act', onclick: () => compune({ mod: 'redirectionare', ref: x }) }, svg(I.redir), 'Redirecționează'))));
        citireEl.scrollTop = 0;
      }
      const tipFisier = (n) => (/\.(exe|bat|scr|msi|com)$/i.test(n) ? 'exe' : /\.(jpe?g|png|gif)$/i.test(n) ? 'img' : /\.pdf$/i.test(n) ? 'pdf' : /\.(docx?|odt)$/i.test(n) ? 'doc' : /\.(pptx?)$/i.test(n) ? 'ppt' : /\.zip$/i.test(n) ? 'zip' : 'alt');
      function cipAtasament(a, onclick, onsterge) {
        return h('div', { class: `ap-posta-cip t-${tipFisier(a.nume)}` },
          h('button', { type: 'button', class: 'nume', onclick, title: onclick ? 'Deschide / descarcă' : a.nume }, svg(I.fisier), h('span', {}, a.nume), h('small', {}, marime(a.marime))),
          onsterge ? h('button', { type: 'button', class: 'ap-posta-x mic', title: `Elimină ${a.nume}`, onclick: onsterge }, svg(I.inchide)) : null);
      }

      // ---------- Acțiuni pe mesaje ----------
      function deschide(id) {
        const x = gaseste(id);
        if (!x) return;
        if (x.dosar === 'ciorne') { compuneDinCiorna(x); return; }
        UI.sel = id; UI.detalii = false;
        if (!x.citit) { x.citit = true; salveaza(); }
        if (UI.cautare && id === 'm-serbare' && norm(UI.cautare).includes('serbare')) bifeaza('cautare');
        randeaza();
      }
      function muta(ids, dosar) {
        for (const id of ids) {
          const x = gaseste(id); if (!x) continue;
          if (dosar === 'sterse' && x.dosar !== 'sterse') x.dosarInainte = x.dosar;
          if (dosar === 'spam' && x.phishing) x.raportat = true;
          x.dosar = dosar;
        }
        UI.bifate.clear();
        if (UI.sel && ids.includes(UI.sel) && !UI.cautare && UI.dosar !== 'importante') UI.sel = null;
        salveaza(); verificaPhishing(); randeaza();
        toast(`${ids.length === 1 ? 'Mesajul a fost mutat' : `${ids.length} mesaje au fost mutate`} în „${numeDosar(dosar)}”.`);
      }
      function sterge(ids) {
        const inCos = ids.filter((id) => gaseste(id)?.dosar === 'sterse');
        if (inCos.length) {
          return dialog('Ștergi definitiv?', [h('p', {}, `${inCos.length === 1 ? 'Mesajul va dispărea' : `${inCos.length} mesaje vor dispărea`} pentru totdeauna, împreună cu atașamentele. Nu le mai poți recupera.`)],
            [{ text: 'Renunță' }, { text: 'Șterge definitiv', cls: 'pericol', fn: () => { S.mesaje = S.mesaje.filter((x) => !inCos.includes(x.id)); UI.bifate.clear(); if (inCos.includes(UI.sel)) UI.sel = null; salveaza(); randeaza(); } }]);
        }
        const ciorne = ids.filter((id) => gaseste(id)?.dosar === 'ciorne');
        const vechi = ids.map((id) => [id, gaseste(id)?.dosar]);
        for (const id of ids) { const x = gaseste(id); if (x) { x.dosarInainte = x.dosar; x.dosar = 'sterse'; } }
        if (ids.includes(UI.sel)) UI.sel = null;
        UI.bifate.clear(); salveaza(); randeaza();
        toast(`${ids.length === 1 ? (ciorne.length ? 'Ciorna a fost mutată' : 'Mesajul a fost mutat') : `${ids.length} mesaje au fost mutate`} în Elemente șterse.`, {
          actiune: { text: 'Anulează', fn: () => { for (const [id, d] of vechi) { const x = gaseste(id); if (x) x.dosar = d; } salveaza(); randeaza(); } } });
      }
      function restaureaza(x) {
        x.dosar = x.dosarInainte && x.dosarInainte !== 'sterse' ? x.dosarInainte : (x.de.adresa === eu() ? 'trimise' : 'primite');
        salveaza(); bifeaza('restaurare');
        toast(`Mesajul a fost restaurat în „${numeDosar(x.dosar)}”.`);
        UI.sel = null; randeaza();
      }
      function golește() {
        const d = UI.dosar;
        dialog(`Golești dosarul „${numeDosar(d)}”?`, [h('p', {}, 'Toate mesajele din dosar vor fi șterse definitiv.')], [{ text: 'Renunță' },
          { text: 'Golește', cls: 'pericol', fn: () => { S.mesaje = S.mesaje.filter((x) => x.dosar !== d); UI.sel = null; salveaza(); randeaza(); } }]);
      }
      function marcheaza(ids, citit) { for (const id of ids) { const x = gaseste(id); if (x) x.citit = citit; } UI.bifate.clear(); salveaza(); randeaza(); }
      function raporteazaSpam(ids) {
        const fis = ids.map(gaseste).filter((x) => x?.phishing);
        muta(ids, 'spam');
        if (fis.length === 1 && fis[0].indicii) {
          dialog('Bine ai observat! Era un mesaj înșelător', [h('p', {}, 'Iată indiciile care l-au dat de gol:'), h('ul', {}, fis[0].indicii.map((t) => h('li', {}, t))),
            h('p', { class: 'ap-posta-mic' }, 'Într-o căsuță reală, spune-i și unui adult când primești un astfel de mesaj.')], [{ text: 'Am înțeles', cls: 'principal' }]);
        }
      }
      function nuESpam(ids) { muta(ids, 'primite'); }
      function verificaPhishing() {
        const n = S.mesaje.filter((x) => x.phishing && x.raportat).length;
        if (n >= 3) bifeaza('phishing');
        else if (n !== S.phishingAnunt && n > 0) { S.phishingAnunt = n; toast(`Misiune: ${n} din 3 mesaje înșelătoare raportate.`); }
      }
      function dosarNou() {
        const f = h('input', { type: 'text', maxlength: 30, placeholder: 'de exemplu, Școală', 'aria-label': 'Numele dosarului' });
        const err = h('p', { class: 'ap-posta-eroare' });
        const ok = () => {
          const n = f.value.trim();
          if (!n) { err.textContent = 'Scrie un nume.'; return false; }
          if ([...DOSARE.map((d) => d[1]), ...S.dosare.map((d) => d.nume)].some((x) => norm(x) === norm(n))) { err.textContent = 'Există deja un dosar cu acest nume.'; return false; }
          const d = { id: `d-${idNou()}`, nume: n };
          S.dosare.push(d); UI.dosar = d.id; UI.sel = null; salveaza(); randeaza();
          toast(`Dosarul „${n}” a fost creat. Mută mesaje în el cu „Mută în…”.`);
          return true;
        };
        dialog('Dosar nou', [h('label', { class: 'ap-posta-camp-dialog' }, 'Numele dosarului', f), err], [{ text: 'Renunță' }, { text: 'Creează', cls: 'principal', fn: ok }], f);
      }
      function stergeDosar(d) {
        dialog(`Ștergi dosarul „${d.nume}”?`, [h('p', {}, 'Mesajele din el se mută înapoi în Mesaje primite.')], [{ text: 'Renunță' }, { text: 'Șterge dosarul', cls: 'pericol', fn: () => {
          S.mesaje.forEach((x) => { if (x.dosar === d.id) x.dosar = x.de.adresa === eu() ? 'trimise' : 'primite'; });
          S.dosare = S.dosare.filter((y) => y !== d); if (UI.dosar === d.id) UI.dosar = 'primite'; salveaza(); randeaza();
        } }]);
      }
      function cauta(q) {
        UI.cautare = q.trim(); UI.sel = null; UI.bifate.clear();
        randeaza();
      }
      function clicLink(href, x) {
        if (x.phishing || /\.(xyz|top|click)\b/.test(href)) {
          dialog('Stop! Acesta este un link periculos', [
            h('p', {}, 'Linkul te-ar fi dus la:'), h('p', {}, h('code', {}, href)),
            h('p', {}, 'Este un site fals, făcut să semene cu unul adevărat, ca să-ți fure parola sau datele. În viața reală: nu da clic, nu completa nimic, raportează mesajul ca spam și spune unui adult.'),
            h('p', { class: 'ap-posta-mic' }, 'Sfat: înainte de clic, ține mouse-ul deasupra linkului și citește adresa reală (apare jos, în stânga).')], [{ text: 'Am înțeles', cls: 'principal' }]);
        } else {
          dialog('Link extern', [h('p', {}, 'Linkul duce la:'), h('p', {}, h('code', {}, href)), h('p', {}, 'În simulator, linkurile din mesaje nu se deschid. Acesta pare un site cunoscut, dar verifică mereu adresa înainte de clic.')], [{ text: 'Închide', cls: 'principal' }]);
        }
      }
      function deschideAtasament(a, x) {
        if (tipFisier(a.nume) === 'exe') {
          dialog('Atenție: fișier periculos!', [
            h('p', {}, h('b', {}, a.nume), ' este un program (.exe), nu o poză. Dacă l-ai deschide, ar putea instala un virus pe calculator.'),
            h('p', {}, 'Nu deschide atașamente neașteptate, mai ales .exe sau .zip de la necunoscuți. Scanează-le cu antivirusul și raportează mesajul ca spam.')],
          [{ text: 'Nu-l deschid', cls: 'principal' }, x.dosar !== 'spam' ? { text: 'Raportează spam', fn: () => raporteazaSpam([x.id]) } : null].filter(Boolean));
          return;
        }
        toast(`„${a.nume}” (${marime(a.marime)}): în simulator, atașamentele nu se descarcă. Într-o căsuță reală apeși Descărcare.`);
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
          if (!fN.value.trim()) { err.textContent = 'Scrie numele.'; return false; }
          if (!eValida(a)) { err.textContent = `Adresa nu este corectă: ${deCeGresita(a)}.`; return false; }
          if (contactDupa(a)) { err.textContent = 'Această adresă este deja în agendă.'; return false; }
          S.contacte.push({ id: idNou(), nume: fN.value.trim(), adresa: a, grup: fG.value, adaugat: true });
          salveaza(); bifeaza('contact'); randeaza();
          if (document.querySelector('.ap-posta-panou.agenda')) panouAgenda();
          toast(`${fN.value.trim()} a fost adăugat în agendă.`);
          return true;
        };
        dialog('Contact nou', [h('label', { class: 'ap-posta-camp-dialog' }, 'Nume', fN), h('label', { class: 'ap-posta-camp-dialog' }, 'Adresa de e-mail', fA), h('label', { class: 'ap-posta-camp-dialog' }, 'Grup', fG), err],
          [{ text: 'Renunță' }, { text: 'Salvează', cls: 'principal', fn: ok }], nume ? fA : fN);
      }

      // ---------- Misiuni ----------
      function bifeaza(id) {
        if (S.misiuni[id]) return;
        S.misiuni[id] = Date.now();
        salveaza(); randeazaMisiuniBtn();
        const mi = MISIUNI.find((y) => y.id === id);
        const n = MISIUNI.filter((y) => S.misiuni[y.id]).length;
        toast(`✔ Misiune îndeplinită: ${mi.titlu}${n === MISIUNI.length ? ' – Le-ai făcut pe toate! Bravo!' : ''}`, { tip: 'ok', durata: 6000, actiune: { text: 'De ce?', fn: () => panouMisiuni() } });
        if (document.querySelector('.ap-posta-panou.misiuni')) panouMisiuni();
      }
      function panou(cls, titlu, ...continut) {
        radacina.querySelector('.ap-posta-panou')?.remove();
        const p = h('aside', { class: `ap-posta-panou ${cls}`, role: 'dialog', 'aria-label': titlu },
          h('div', { class: 'ap-posta-panou-cap' }, h('h2', {}, titlu), h('button', { type: 'button', class: 'ap-posta-x', title: 'Închide', onclick: () => p.remove() }, svg(I.inchide))),
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
        p.querySelector('.ap-posta-x').focus();
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
            h('button', { type: 'button', class: 'ap-posta-unealta', title: `Scrie un mesaj către ${y.nume}`, onclick: () => { radacina.querySelector('.ap-posta-panou')?.remove(); compune({ mod: 'nou', catre: [y.adresa] }); } }, svg(I.scrie), h('span', {}, 'Scrie')),
            h('button', { type: 'button', class: 'ap-posta-x mic', title: `Șterge contactul ${y.nume}`, onclick: () => { S.contacte = S.contacte.filter((z) => z !== y); salveaza(); deseneaza(); } }, svg(I.inchide)))))])
            : h('p', { class: 'ap-posta-mic' }, 'Niciun contact găsit.'));
        };
        f.addEventListener('input', deseneaza);
        panou('agenda', 'Agenda de contacte', h('div', { class: 'ap-posta-agenda-cap' }, f, h('button', { type: 'button', class: 'btn small', onclick: () => adaugaContact() }, '+ Contact nou')), lista);
        deseneaza(); f.focus();
      }
      function meniuCont(btn) {
        const exista = radacina.querySelector('.ap-posta-meniu');
        if (exista) { exista.remove(); return; }
        const m = h('div', { class: 'ap-posta-meniu', role: 'menu' },
          h('div', { class: 'ap-posta-meniu-cap' }, avatar(S.prenume, S.adresa), h('div', {}, h('b', {}, `${S.prenume} ${S.nume}`.trim()), h('span', {}, S.adresa))),
          h('button', { type: 'button', role: 'menuitem', onclick: () => { m.remove(); exportTrimise(); } }, svg(I.salveaza), 'Descarcă mesajele trimise (.txt)'),
          h('button', { type: 'button', role: 'menuitem', onclick: () => { m.remove(); scurtaturi(); } }, svg(I.lista), 'Scurtături de la tastatură'),
          h('button', { type: 'button', role: 'menuitem', class: 'pericol', onclick: () => { m.remove(); deLaCapat(); } }, svg(I.restaureaza), 'Ia-o de la capăt'));
        radacina.append(m);
        const inchide = (e) => { if (!m.contains(e.target) && !btn.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', inchide, true); } };
        document.addEventListener('pointerdown', inchide, true);
        m.querySelector('button').focus();
      }
      function exportTrimise() {
        const l = lucrare();
        if (!l.date.length) return toast('Nu ai trimis încă niciun mesaj.');
        const ACT = { nou: 'mesaj nou', raspuns: 'răspuns', 'raspuns-tuturor': 'răspuns tuturor', redirectionare: 'redirecționare' };
        const txt = [`Mesajele trimise de ${S.adresa}`, `Misiuni îndeplinite: ${l.misiuni.realizate} din ${l.misiuni.total}`, '',
          ...l.date.map((d, i) => [`===== Mesajul ${i + 1} (${ACT[d.tipActiune]}) =====`, `Data: ${dataLunga(d.trimisLa)}`, `Către: ${d.catre}`, d.cc ? `CC: ${d.cc}` : null, d.cci ? `CCI: ${d.cci}` : null,
            `Subiect: ${d.subiect}`, d.atasamente.length ? `Atașamente: ${d.atasamente.join(', ')}` : null, '', d.text, ''].filter((x) => x != null).join('\r\n'))].join('\r\n');
        descarca('mesaje-trimise.txt', `﻿${txt}`, 'text/plain;charset=utf-8');
      }
      function deLaCapat() {
        dialog('Iei totul de la capăt?', [h('p', {}, 'Se șterg toate mesajele, contactele adăugate și misiunile. Poți alege apoi o adresă nouă.')], [{ text: 'Renunță' },
          { text: 'Ia-o de la capăt', cls: 'pericol', fn: async () => { opreste(); try { await store.del(); } catch { /* */ } S = null; ecranBunVenit(); } }]);
      }
      function scurtaturi() {
        const r = [['C', 'mesaj nou'], ['R', 'răspunde'], ['A', 'răspunde tuturor'], ['F', 'redirecționează'], ['Delete', 'șterge mesajul deschis'], ['/', 'căutare'], ['J / K', 'mesajul următor / anterior'], ['Ctrl + Enter', 'trimite (în fereastra de mesaj)'], ['Ctrl + B / I', 'aldin / cursiv'], ['Esc', 'închide fereastra']];
        dialog('Scurtături de la tastatură', [h('table', { class: 'ap-posta-detalii' }, h('tbody', {}, r.map(([k, v]) => h('tr', {}, h('th', {}, h('kbd', {}, k)), h('td', {}, v)))))], [{ text: 'Închide', cls: 'principal' }]);
      }

      // ---------- Dialoguri și notificări ----------
      function dialog(titlu, continut, butoane, focus) {
        const fundal = h('div', { class: 'ap-posta-modal' });
        const inchide = () => fundal.remove();
        const box = h('div', { class: 'ap-posta-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
          h('h2', {}, titlu), h('div', {}, continut),
          h('div', { class: 'ap-posta-dialog-btn' }, butoane.map((b) => h('button', { type: 'button', class: `ap-posta-b ${b.cls || ''}`, onclick: async () => { if (b.fn && (await b.fn()) === false) return; inchide(); } }, b.text))));
        fundal.append(box);
        fundal.addEventListener('pointerdown', (e) => { if (e.target === fundal) inchide(); });
        box.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.stopPropagation(); inchide(); }
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); box.querySelector('.principal')?.click(); }
        });
        radacina.append(fundal);
        (focus || box.querySelector('.principal') || box.querySelector('button')).focus();
        return inchide;
      }
      function toast(text, o = {}) {
        const t = h('div', { class: `ap-posta-toast ${o.tip || ''}`, role: 'status' }, h('span', {}, text),
          o.actiune ? h('button', { type: 'button', onclick: () => { o.actiune.fn(); t.remove(); } }, o.actiune.text) : null,
          h('button', { type: 'button', class: 'ap-posta-x mic', 'aria-label': 'Închide', onclick: () => t.remove() }, svg(I.inchide)));
        toasturi.append(t);
        while (toasturi.children.length > 3) toasturi.firstChild.remove();
        setTimeout(() => t.remove(), o.durata || 4500);
      }

      // ---------- Compunerea unui mesaj ----------
      function compuneDinCiorna(x) {
        compune({ mod: x.actiune || 'nou', refId: x.refId, ciorna: x, catre: x.catre, cc: x.cc, cci: x.cci, subiect: x.subiect, html: x.html, atasamente: x.atasamente });
      }
      function compune(o) {
        if (UI.compunere) { UI.compunere.inchide(true); }
        const ref = o.ref || (o.refId && gaseste(o.refId));
        let catre = o.catre || [], cc = o.cc || [], subiect = o.subiect || '', html = o.html || '', atas = (o.atasamente || []).map((a) => ({ ...a }));
        if (ref && !o.ciorna) {
          const deLaMine = ref.de.adresa === eu();
          const fara = (a) => a.filter((y) => y.toLowerCase() !== eu());
          const pref = (p, s) => (new RegExp(`^${p}:`, 'i').test(s) ? s : `${p}: ${s}`);
          const citat = `<p><br></p><p><br></p><p>Pe ${esc(dataLunga(ref.data))}, ${esc(ref.de.nume || ref.de.adresa)} &lt;${esc(ref.de.adresa)}&gt; a scris:</p><blockquote>${ref.html}</blockquote>`;
          if (o.mod === 'raspuns') { catre = deLaMine ? ref.catre.slice() : [ref.de.adresa]; subiect = pref('Re', ref.subiect.replace(/^(re|fwd?):\s*/i, (m) => (/^re/i.test(m) ? m : m))); html = citat; }
          if (o.mod === 'raspuns-tuturor') { catre = unice(deLaMine ? ref.catre : fara([ref.de.adresa, ...ref.catre])); cc = unice(fara(ref.cc)); subiect = pref('Re', ref.subiect); html = citat; }
          if (o.mod === 'redirectionare') {
            catre = []; subiect = pref('Fwd', ref.subiect.replace(/^re:\s*/i, (m) => m)); atas = ref.atasamente.map((a) => ({ ...a }));
            html = `<p><br></p><p>---------- Mesaj redirecționat ----------<br>De la: ${esc(ref.de.nume)} &lt;${esc(ref.de.adresa)}&gt;<br>Data: ${esc(dataLunga(ref.data))}<br>Subiect: ${esc(ref.subiect)}<br>Către: ${esc(ref.catre.join('; '))}${ref.cc.length ? `<br>CC: ${esc(ref.cc.join('; '))}` : ''}</p>${ref.html}`;
          }
        }
        const C = { mod: o.mod, refId: ref?.id || null, ciornaId: o.ciorna?.id || null };
        const campuri = {};
        const campAdrese = (cheie, eticheta, val) => {
          const inp = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': eticheta, value: val.length ? `${val.join('; ')}; ` : '' });
          const sug = h('ul', { class: 'ap-posta-sugestii', role: 'listbox' });
          const err = h('div', { class: 'ap-posta-eroare mic' });
          let idx = -1, potriviri = [];
          const ultimul = () => inp.value.split(';').pop().trim();
          const alege = (c) => {
            const parti = inp.value.split(';'); parti.pop();
            inp.value = `${[...parti.map((x) => x.trim()).filter(Boolean), c.adresa].join('; ')}; `;
            sug.replaceChildren(); potriviri = []; inp.focus(); verifica(false);
          };
          const deseneaza = () => {
            const q = norm(ultimul());
            potriviri = q ? S.contacte.filter((c) => norm(`${c.nume} ${c.adresa}`).includes(q)).slice(0, 5) : [];
            idx = potriviri.length ? 0 : -1;
            umple(sug, potriviri.map((c, i) => h('li', { role: 'option', class: i === idx ? 'activ' : '', onpointerdown: (e) => { e.preventDefault(); alege(c); } }, avatar(c.nume, c.adresa), h('div', {}, h('b', {}, c.nume), h('span', {}, c.adresa)))));
          };
          const verifica = (arata = true) => {
            const gresite = imparte(inp.value).filter((a) => !eValida(a));
            err.textContent = arata && gresite.length ? `„${gresite[0]}” nu este o adresă corectă: ${deCeGresita(gresite[0])}.` : '';
            inp.classList.toggle('gresit', arata && gresite.length > 0);
            return gresite;
          };
          inp.addEventListener('input', () => { deseneaza(); if (err.textContent) verifica(); });
          inp.addEventListener('blur', () => { setTimeout(() => sug.replaceChildren(), 150); if (inp.value.trim()) verifica(); });
          inp.addEventListener('keydown', (e) => {
            if (!potriviri.length) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + potriviri.length) % potriviri.length; [...sug.children].forEach((li, i) => li.classList.toggle('activ', i === idx)); }
            if ((e.key === 'Enter' || e.key === 'Tab') && idx >= 0) { e.preventDefault(); alege(potriviri[idx]); }
            if (e.key === 'Escape') { e.stopPropagation(); sug.replaceChildren(); potriviri = []; }
          });
          const rand = h('div', { class: 'ap-posta-rand' },
            h('button', { type: 'button', class: 'ap-posta-eticheta-camp', title: 'Alege din agendă', onclick: () => alegeDinAgenda(alege) }, eticheta), h('div', { class: 'ap-posta-intrare' }, inp, sug), err);
          campuri[cheie] = { inp, rand, verifica, valori: () => unice(imparte(inp.value)) };
          return rand;
        };
        const rCatre = campAdrese('catre', 'Către', catre);
        const rCc = campAdrese('cc', 'CC', cc);
        const rCci = campAdrese('cci', 'CCI', o.cci || []);
        const aratCc = cc.length > 0, aratCci = (o.cci || []).length > 0;
        rCc.hidden = !aratCc; rCci.hidden = !aratCci;
        const btnCc = h('button', { type: 'button', class: 'ap-posta-link', hidden: aratCc, onclick: () => { rCc.hidden = false; btnCc.hidden = true; campuri.cc.inp.focus(); } }, 'CC');
        const btnCci = h('button', { type: 'button', class: 'ap-posta-link', hidden: aratCci, title: 'Copie invizibilă', onclick: () => { rCci.hidden = false; btnCci.hidden = true; campuri.cci.inp.focus(); } }, 'CCI');
        rCatre.querySelector('.ap-posta-intrare').after(h('span', { class: 'ap-posta-cc-btn' }, btnCc, btnCci));
        const fSubiect = h('input', { type: 'text', maxlength: 150, value: subiect, 'aria-label': 'Subiect', placeholder: 'Subiect' });
        const editor = h('div', { class: 'ap-posta-editor', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Textul mesajului', spellcheck: 'true' });
        editor.replaceChildren(...parseaza(html));
        editor.addEventListener('paste', (e) => { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, t); });
        editor.addEventListener('drop', (e) => e.preventDefault());
        const cmd = (c) => { editor.focus(); try { document.execCommand('styleWithCSS', false, false); } catch { /* */ } document.execCommand(c, false, null); actualizeazaFormat(); };
        const fmt = (c, eticheta, cont, tasta) => h('button', { type: 'button', class: 'ap-posta-fmt', 'data-cmd': c, title: `${eticheta}${tasta ? ` (${tasta})` : ''}`, 'aria-label': eticheta, onmousedown: (e) => e.preventDefault(), onclick: () => cmd(c) }, cont);
        const btnFmt = [fmt('bold', 'Aldin', h('b', {}, 'B'), 'Ctrl+B'), fmt('italic', 'Cursiv', h('i', {}, 'I'), 'Ctrl+I'), fmt('insertUnorderedList', 'Listă cu marcatori', svg(I.lista))];
        function actualizeazaFormat() { for (const b of btnFmt) { let v = false; try { v = document.queryCommandState(b.dataset.cmd); } catch { /* */ } b.setAttribute('aria-pressed', String(v)); } }
        editor.addEventListener('keyup', actualizeazaFormat); editor.addEventListener('mouseup', actualizeazaFormat);
        const atasEl = h('div', { class: 'ap-posta-atasamente compune' });
        const total = () => atas.reduce((s, a) => s + a.marime, 0);
        const desenAtas = () => umple(atasEl, atas.map((a, i) => cipAtasament(a, null, () => { atas.splice(i, 1); desenAtas(); })),
          atas.length ? h('span', { class: `ap-posta-mic${total() > 10 * MB ? ' avert' : ''}` }, `Total: ${marime(total())}`) : null);
        desenAtas();
        const ataseaza = (f) => {
          if (f.marime > 25 * MB || total() + f.marime > 25 * MB) {
            dialog('Fișierul este prea mare', [h('p', {}, `„${f.nume}” are ${marime(f.marime)}${f.marime <= 25 * MB ? `, iar împreună cu celelalte atașamente mesajul ar avea ${marime(total() + f.marime)}` : ''}.`),
              h('p', {}, 'Gmail și Outlook trimit atașamente de cel mult 20–25 MB pe mesaj. Pentru fișiere mari, pune fișierul în Google Drive sau OneDrive și trimite un link.')], [{ text: 'Am înțeles', cls: 'principal' }]);
            return;
          }
          atas.push({ nume: f.nume, marime: f.marime }); desenAtas();
          if (total() > 10 * MB) toast(`Mesajul are acum ${marime(total())}. Atenție: multe căsuțe (de exemplu, cele ale școlilor) primesc doar mesaje de până la 10 MB.`, { tip: 'avert', durata: 6500 });
        };
        const inpFisier = h('input', { type: 'file', multiple: true, hidden: true });
        inpFisier.addEventListener('change', () => { for (const f of inpFisier.files) ataseaza({ nume: f.name, marime: f.size }); inpFisier.value = ''; });
        const meniuAtas = () => {
          const m = fereastra.querySelector('.ap-posta-meniu-atas');
          if (m) { m.remove(); return; }
          const mm = h('div', { class: 'ap-posta-meniu-atas', role: 'menu' },
            h('button', { type: 'button', role: 'menuitem', onclick: () => { mm.remove(); inpFisier.click(); } }, svg(I.fisier), 'De pe calculator…'),
            h('p', { class: 'ap-posta-mic' }, 'Fișiere de exemplu (simulate):'),
            FISIERE_EXEMPLU.map((f) => h('button', { type: 'button', role: 'menuitem', onclick: () => { mm.remove(); ataseaza(f); } }, svg(I.fisier), h('span', {}, f.nume), h('small', {}, marime(f.marime)))),
            h('p', { class: 'ap-posta-mic' }, 'Se păstrează doar numele și mărimea fișierului.'));
          subsol.append(mm);
          mm.querySelector('button').focus();
        };
        const titluF = h('span', {}, { nou: 'Mesaj nou', raspuns: 'Răspuns', 'raspuns-tuturor': 'Răspuns tuturor', redirectionare: 'Redirecționare' }[o.mod] || 'Mesaj nou');
        const subsol = h('div', { class: 'ap-posta-compune-subsol' },
          h('button', { type: 'button', class: 'btn small', onclick: () => trimite() }, svg(I.trimise), 'Trimite'),
          btnFmt,
          h('button', { type: 'button', class: 'ap-posta-fmt', title: 'Atașează fișier', 'aria-label': 'Atașează fișier', onclick: meniuAtas }, svg(I.agrafa)),
          inpFisier,
          h('span', { class: 'ap-posta-umple' }),
          h('button', { type: 'button', class: 'ap-posta-fmt', title: 'Renunță (șterge ciorna)', 'aria-label': 'Renunță la mesaj', onclick: () => renunta() }, svg(I.sterse)));
        const fereastra = h('div', { class: 'ap-posta-compune', role: 'dialog', 'aria-label': titluF.textContent },
          h('div', { class: 'ap-posta-compune-cap' }, titluF,
            h('button', { type: 'button', class: 'ap-posta-x', title: 'Mărește / micșorează', onclick: () => fereastra.classList.toggle('mare') }, svg(I.mareste)),
            h('button', { type: 'button', class: 'ap-posta-x', title: 'Salvează ciorna și închide', onclick: () => inchide(true) }, svg(I.inchide))),
          h('div', { class: 'ap-posta-compune-corp' },
            h('div', { class: 'ap-posta-rand de' }, h('span', { class: 'ap-posta-eticheta-camp' }, 'De la'), h('span', {}, `${S.prenume} ${S.nume}`.trim(), ' ', h('span', { class: 'ap-posta-adresa' }, `<${S.adresa}>`))),
            rCatre, rCc, rCci,
            h('div', { class: 'ap-posta-rand' }, h('span', { class: 'ap-posta-eticheta-camp' }, 'Subiect'), fSubiect),
            editor, atasEl),
          subsol);
        fereastra.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); trimite(); }
          if (e.key === 'Escape') { e.stopPropagation(); const m = fereastra.querySelector('.ap-posta-meniu-atas'); if (m) m.remove(); else inchide(true); }
        });
        corp.append(fereastra);
        (catre.length || o.mod === 'raspuns' || o.mod === 'raspuns-tuturor' ? editor : campuri.catre.inp).focus();
        if (document.activeElement === editor) { const r = document.createRange(); r.setStart(editor, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

        const colecteaza = () => ({ catre: campuri.catre.valori(), cc: campuri.cc.valori(), cci: campuri.cci.valori(), subiect: fSubiect.value.trim(), html: curataHTML(editor.innerHTML), atasamente: atas.map((a) => ({ ...a })) });
        const eGol = (d) => !d.catre.length && !d.cc.length && !d.cci.length && !d.subiect && !htmlLaText(d.html) && !d.atasamente.length;
        function inchide(pastreaza) {
          if (pastreaza) {
            const d = colecteaza();
            if (!eGol(d)) {
              let x = C.ciornaId && gaseste(C.ciornaId);
              if (!x) { x = { id: `c-${idNou()}`, de: { nume: `${S.prenume} ${S.nume}`.trim(), adresa: eu() }, citit: true, important: false }; S.mesaje.push(x); C.ciornaId = x.id; }
              Object.assign(x, d, { dosar: 'ciorne', data: Date.now(), actiune: C.mod, refId: C.refId });
              salveaza(); toast('Mesajul a fost salvat în Ciorne.');
            }
          }
          fereastra.remove();
          if (UI.compunere?.fereastra === fereastra) UI.compunere = null;
          randeaza();
        }
        function renunta() {
          if (C.ciornaId) S.mesaje = S.mesaje.filter((x) => x.id !== C.ciornaId);
          C.ciornaId = null; salveaza(); fereastra.remove(); UI.compunere = null; randeaza();
          toast('Mesajul a fost abandonat.');
        }
        async function trimite() {
          const gresite = ['catre', 'cc', 'cci'].flatMap((k) => campuri[k].verifica());
          if (gresite.length) { toast(`Verifică adresa „${gresite[0]}”: ${deCeGresita(gresite[0])}.`, { tip: 'err' }); return; }
          const d = colecteaza();
          if (!d.catre.length && !d.cc.length && !d.cci.length) { campuri.catre.inp.focus(); toast('Scrie cel puțin un destinatar la Către.', { tip: 'err' }); return; }
          const intreaba = (titlu, text, da) => new Promise((res) => dialog(titlu, [h('p', {}, text)], [{ text: 'Înapoi la mesaj', fn: () => res(false) }, { text: da, cls: 'principal', fn: () => res(true) }]));
          if (!d.catre.length && !d.cci.length && d.cc.length && !(await intreaba('Câmpul Către este gol', 'Ai pus adrese doar la CC. De obicei, destinatarul principal se scrie la Către. Trimiți așa?', 'Trimite așa'))) return;
          if (!d.subiect && !(await intreaba('Mesaj fără subiect', 'Subiectul spune în câteva cuvinte despre ce este mesajul. Trimiți fără subiect?', 'Trimite fără subiect'))) return fSubiect.focus();
          const text = htmlLaText(d.html);
          const textNou = C.mod === 'nou' ? text : text.split(/\nPe .* a scris:|---------- Mesaj redirecționat/)[0];
          if (/ata[sș]/i.test(textNou) && !d.atasamente.length && !(await intreaba('Ai uitat atașamentul?', 'În mesaj scrie despre un atașament, dar nu ai atașat niciun fișier. Trimiți oricum?', 'Trimite oricum'))) return;
          const toti = [...d.catre, ...d.cc, ...d.cci];
          if (toti.some((a) => PHISHING.includes(a)) && !(await intreaba('Stai puțin!', 'Scrii unei adrese dintr-un mesaj înșelător (phishing). Nu răspunde la astfel de mesaje: le raportezi ca spam și spui unui adult.', 'Trimite oricum'))) return;
          if (C.ciornaId) S.mesaje = S.mesaje.filter((x) => x.id !== C.ciornaId);
          const x = { id: `t-${idNou()}`, dosar: 'trimise', de: { nume: `${S.prenume} ${S.nume}`.trim(), adresa: eu() }, ...d, data: Date.now(), citit: true, important: false, actiune: C.mod, refId: C.refId, trimisDeElev: true };
          S.mesaje.push(x);
          fereastra.remove(); UI.compunere = null;
          verificaMisiuni(x);
          programeazaRaspunsuri(x);
          salveaza(); randeaza();
          toast('Mesaj trimis.', { actiune: { text: 'Vezi mesajul', fn: () => { UI.dosar = 'trimise'; UI.cautare = ''; cautare.value = ''; deschide(x.id); } } });
        }
        UI.compunere = { fereastra, inchide };
      }
      function alegeDinAgenda(alege) {
        const lista = h('ul', { class: 'ap-posta-agenda-mini' }, S.contacte.slice().sort((a, b) => a.nume.localeCompare(b.nume, 'ro')).map((c) =>
          h('li', {}, h('button', { type: 'button', onclick: () => { inchide(); alege(c); } }, avatar(c.nume, c.adresa), h('div', {}, h('b', {}, c.nume), h('span', {}, c.adresa))))));
        const inchide = dialog('Alege din agendă', [lista], [{ text: 'Închide' }]);
      }

      // ---------- Misiunile verificate la trimitere ----------
      function verificaMisiuni(x) {
        const toti = [...x.catre, ...x.cc, ...x.cci];
        if (x.cci.length) bifeaza('cci');
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
        const pune = (de, subiect, html, extra = {}) => { S.asteptare.push({ la: Date.now() + intarziere, mesaj: { id: `r-${idNou()}`, dosar: 'primite', de, catre: [eu()], cc: [], cci: [], subiect, html, atasamente: [], citit: false, important: false, ...extra } }); intarziere += 2500 + Math.random() * 2500; };
        const re = `Re: ${x.subiect.replace(/^(re|fwd?):\s*/i, '')}`;
        for (const a of toti) {
          if (a === eu()) { pune(x.de, x.subiect, x.html, { atasamente: x.atasamente, catre: x.catre, cc: x.cc }); continue; }
          if (PHISHING.includes(a)) continue;
          const c = Object.values(P).find((p) => p.adresa === a);
          const domeniu = a.split('@')[1];
          if (!c) {
            if (DOMENII_CUNOSCUTE.includes(domeniu) && !contactDupa(a) && !ALTE_NUME[a]) {
              pune({ nume: 'Sistemul de e-mail', adresa: 'mailer-daemon@edumail.ro' }, `Mesaj nelivrat: ${x.subiect || '(fără subiect)'}`,
                `<p>Mesajul tău <b>nu a putut fi livrat</b> către:</p><p><b>${esc(a)}</b></p><p>Adresa nu există. Verifică dacă ai scris-o corect (o literă greșită ajunge la altcineva sau nicăieri). Sfat: alege destinatarii din <b>agendă</b>.</p>`, { sistem: true });
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
            const nume = c.nume.split(' ')[1];
            if (x.actiune === 'redirectionare' && x.refId === 'm-bunica') pune(c, `Re: ${x.subiect}`, `<p>Mersi că mi-ai trimis invitația! Am deschis-o: vin sigur duminică 🎂</p><p>${nume}</p>`);
            else if (x.actiune !== 'raspuns-tuturor' && Math.random() < 0.75) {
              const v = ['Salut! Am primit mesajul, mersi! 😊', 'Ok, ne vedem mâine la școală!', 'Mersi mult! Exact de asta aveam nevoie.', 'Super! Vorbim în pauză.'];
              pune(c, re, `<p>${v[Math.floor(Math.random() * v.length)]}</p><p>${nume}</p>`);
            }
          }
        }
      }
      function livreazaRestante() {
        const acum = Date.now();
        const gata = S.asteptare.filter((y) => y.la <= acum);
        if (!gata.length) return;
        S.asteptare = S.asteptare.filter((y) => y.la > acum);
        for (const { mesaj } of gata) {
          mesaj.data = Date.now();
          S.mesaje.push(mesaj);
          toast(`Mesaj nou de la ${mesaj.de.nume}: ${mesaj.subiect}`, { tip: mesaj.sistem ? 'err' : 'nou', durata: 6000, actiune: { text: 'Deschide', fn: () => { UI.cautare = ''; cautare.value = ''; UI.dosar = 'primite'; deschide(mesaj.id); } } });
        }
        salveaza(); randeaza();
      }
      const ceas = setInterval(livreazaRestante, 1000);

      // ---------- Tastatura ----------
      function tasta(e) {
        if (!radacina.isConnected) return;
        const t = e.target;
        if (e.key === 'Escape') { radacina.querySelector('.ap-posta-panou')?.remove(); radacina.querySelector('.ap-posta-meniu')?.remove(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || radacina.querySelector('.ap-posta-modal')) return;
        const x = UI.sel && gaseste(UI.sel);
        const k = e.key.toLowerCase();
        if (k === 'c') { e.preventDefault(); compune({ mod: 'nou' }); }
        else if (k === '/') { e.preventDefault(); cautare.focus(); }
        else if (k === '?') scurtaturi();
        else if (x && x.dosar !== 'ciorne' && k === 'r') { e.preventDefault(); compune({ mod: 'raspuns', ref: x }); }
        else if (x && x.dosar !== 'ciorne' && k === 'a') { e.preventDefault(); compune({ mod: 'raspuns-tuturor', ref: x }); }
        else if (x && x.dosar !== 'ciorne' && k === 'f') { e.preventDefault(); compune({ mod: 'redirectionare', ref: x }); }
        else if (x && (e.key === 'Delete' || e.key === '#')) sterge([x.id]);
        else if (k === 'j' || k === 'k') {
          const l = mesajeAfisate().filter((y) => y.dosar !== 'ciorne');
          const i = l.findIndex((y) => y.id === UI.sel);
          const n = l[Math.max(0, Math.min(l.length - 1, i + (k === 'j' ? 1 : -1)))];
          if (n) { deschide(n.id); listaEl.querySelector(`[data-id="${n.id}"]`)?.focus(); }
        }
      }
      document.addEventListener('keydown', tasta);
      function opreste() { clearInterval(ceas); document.removeEventListener('keydown', tasta); if (tSalv) salveazaAcum(); }
      curent = { opreste };

      livreazaRestante();
      randeaza();
      if (!S.vazutBunVenit) { S.vazutBunVenit = true; salveaza(); setTimeout(() => toast('Bun venit! Deschide „Misiuni” (sus, în dreapta) ca să vezi provocările.', { durata: 6000 }), 400); }
    }
  }

  routes.push({ pattern: /^\/aplicatii\/posta$/, handler: porneste });
})();

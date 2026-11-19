'use strict';
// „Micii informaticieni”: jocuri despre calculator pentru clasele 0–IV (#/mici), separate de restul platformei.
// Nu cer cont: stelele câștigate se păstrează doar în browserul copilului (localStorage).
// Acest fișier conține nucleul (interfața, progresul, sunetele); jocurile sunt în mici-jocuri-1.js și mici-jocuri-2.js.
(() => {
  const { h, show, routes } = window.EduApp;
  const CHEIE = 'edudigi_mici';
  const jocuri = [];

  // ---------- Progres (stele) ----------
  let stare = { stele: {}, sunet: true };
  try { Object.assign(stare, JSON.parse(localStorage.getItem(CHEIE) || '{}')); } catch { /* fără stocare */ }
  const salveaza = () => { try { localStorage.setItem(CHEIE, JSON.stringify(stare)); } catch { /* ignorat */ } };
  const NIV = ['🌱', '🌿', '🌳'];
  const niveluri = (j) => j.niveluri || 1;
  const steleNiv = (id, n) => stare.stele[`${id}:${n}`] || 0;
  const maxJoc = (j) => niveluri(j) * 3;
  const steleJoc = (id) => { const j = jocuri.find((x) => x.id === id); return Array.from({ length: niveluri(j || {}) }, (_, i) => steleNiv(id, i + 1)).reduce((a, b) => a + b, 0); };
  const deblocat = (j, n) => n <= 1 || steleNiv(j.id, n - 1) >= 1;

  // ---------- Utilitare ----------
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const alege = (arr, n) => shuffle(arr).slice(0, n);
  const steleDin = (greseli, n) => (greseli === 0 ? 3 : greseli <= Math.ceil(n / 4) ? 2 : 1);
  const randStele = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  // ---------- Sunete și voce ----------
  let ac = null;
  function ton(f, d, t = 0, tip = 'sine') {
    if (!stare.sunet) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + t;
      o.type = tip; o.frequency.value = f;
      g.gain.setValueAtTime(0.14, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.02);
    } catch { /* fără sunet */ }
  }
  const sunet = (tip) => {
    if (tip === 'ok') { ton(660, 0.12); ton(880, 0.18, 0.1); }
    else if (tip === 'rau') ton(190, 0.28, 0, 'triangle');
    else if (tip === 'click') ton(520, 0.06);
    else if (tip === 'gata') [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.2, i * 0.12));
  };
  const areVoce = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  function vorbeste(text) {
    if (!areVoce() || !stare.sunet) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ro-RO'; u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch { /* ignorat */ }
  }

  // ---------- Curățare între jocuri ----------
  let curata = [];
  const ruleazaCuratarea = () => { const f = curata; curata = []; f.forEach((fn) => { try { fn(); } catch { /* ignorat */ } }); if (areVoce()) { try { speechSynthesis.cancel(); } catch { /* ignorat */ } } };
  // La plecarea din #/mici oprim cronometrele și ascultătorii; în interiorul modulului curăță fiecare rută la pornire.
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/mici')) ruleazaCuratarea(); });

  // ---------- Elemente reutilizabile ----------
  const bAscultă = (text) => (areVoce() ? h('button', { class: 'mj-ascult', type: 'button', 'aria-label': 'Ascultă', title: 'Ascultă', onclick: () => vorbeste(text) }, '🔊') : null);

  // Grilă de butoane mari cu răspunsuri. items: [{ c: conținut (text/nod), ok: bool, eticheta }]
  function grila(items, rasp, clasa = '') {
    const g = h('div', { class: `mj-grila ${clasa}`.trim() });
    for (const it of items) {
      const b = h('button', { type: 'button', class: 'mj-opt', 'aria-label': it.eticheta || null }, it.c);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (it.ok) {
          b.classList.add('ok');
          for (const x of g.querySelectorAll('button')) x.disabled = true;
          rasp.corect();
        } else {
          b.classList.add('rau'); b.disabled = true; rasp.gresit();
        }
      });
      g.append(b);
    }
    return g;
  }

  // ---------- Rulare jocuri pe runde ----------
  // faRunda(i, el, rasp): construiește runda i în el; rasp.corect(explicație?) / rasp.gresit(mesaj?)
  function runde(ctx, n, faRunda, optiuni = {}) {
    let i = 0, greseli = 0;
    const pas = () => {
      if (i >= n) return ctx.gata(steleDin(greseli, n));
      ctx.progres(i, n);
      const el = h('div', { class: 'mj-runda' });
      const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' });
      const jos = h('div', { class: 'mj-jos' });
      ctx.zona.replaceChildren(el, mesaj, jos);
      let gresitDeja = false, gata = false, timer = null;
      const mai = () => { clearTimeout(timer); i++; pas(); };
      curata.push(() => clearTimeout(timer));
      faRunda(i, el, {
        gresit(txt) {
          if (gata) return;
          if (!gresitDeja) { gresitDeja = true; greseli++; }
          sunet('rau'); mesaj.className = 'mj-mesaj rau'; mesaj.textContent = txt || 'Mai încearcă!'; vorbeste(txt || 'Mai încearcă!');
        },
        corect(expl) {
          if (gata) return;
          gata = true; sunet('ok');
          mesaj.className = 'mj-mesaj ok'; mesaj.textContent = `✔ ${expl || 'Bravo!'}`; vorbeste(expl || 'Bravo!');
          if (optiuni.auto) timer = setTimeout(mai, optiuni.auto);
          else jos.append(h('button', { class: 'mj-btn mare', type: 'button', onclick: mai }, i + 1 >= n ? 'Gata! ➜' : 'Mai departe ➜'));
        },
      });
    };
    pas();
  }

  // ---------- Cadrul unui joc ----------
  function deschideJoc(joc, n = 1) {
    ruleazaCuratarea();
    if (niveluri(joc) > 1) { try { history.replaceState(null, '', `#/mici/${joc.id}/${n}`); } catch { /* ignorat */ } }
    document.title = `${joc.nume} – Micii informaticieni – edudigi`;
    const bara = h('div', { class: 'mj-progres-in' });
    const zona = h('div', { class: 'mj-zona' });
    const ctx = {
      zona, nivel: n,
      curata: (fn) => curata.push(fn),
      progres(i, n) { bara.style.width = `${Math.round((i / n) * 100)}%`; },
      vorbeste, sunet,
      gata(stele, mesaj) {
        ruleazaCuratarea();
        bara.style.width = '100%';
        stare.stele[`${joc.id}:${n}`] = Math.max(steleNiv(joc.id, n), stele); salveaza();
        sunet('gata');
        const txt = mesaj || (stele === 3 ? 'Excelent! Ești un adevărat informatician!' : stele === 2 ? 'Foarte bine! Mai încearcă o dată pentru toate stelele.' : 'Bravo că ai terminat! Mai joacă o dată și vei câștiga mai multe stele.');
        zona.replaceChildren(h('div', { class: 'mj-final' },
          h('div', { class: 'mj-trofeu', 'aria-hidden': 'true' }, stele === 3 ? '🏆' : '🎉'),
          h('h2', {}, stele === 3 ? 'Felicitări!' : 'Bravo!'),
          h('p', { class: 'mj-stele-mari', 'aria-label': `${stele} din 3 stele` }, randStele(stele)),
          h('p', {}, txt),
          h('div', { class: 'mj-actiuni' },
            h('button', { class: 'mj-btn mare', type: 'button', onclick: () => deschideJoc(joc, n) }, '🔁 Mai joc'),
            n < niveluri(joc) && stele >= 1 ? h('button', { class: 'mj-btn mare', type: 'button', onclick: () => deschideJoc(joc, n + 1) }, `${NIV[n]} Nivelul ${n + 1} ➜`) : null,
            niveluri(joc) > 1 ? h('a', { class: 'mj-btn mare alb', href: `#/mici/${joc.id}` }, '🪜 Niveluri') : null,
            h('a', { class: 'mj-btn mare alb', href: '#/mici' }, '🏠 Alte jocuri'))));
        vorbeste(stele === 3 ? 'Felicitări!' : 'Bravo!');
      },
    };
    show(h('div', { class: `mici mj-joc ${joc.culoare}` },
      h('div', { class: 'wrap' },
        h('div', { class: 'mj-bara' },
          h('a', { class: 'mj-btn mic alb', href: '#/mici', 'aria-label': 'Înapoi la jocuri' }, '← Jocuri'),
          h('h1', {}, h('span', { 'aria-hidden': 'true' }, `${joc.emoji} `), joc.nume, niveluri(joc) > 1 ? h('span', { class: 'mj-nivel-eticheta' }, ` ${NIV[n - 1]} ${n}`) : null),
          comutatorSunet()),
        h('div', { class: 'mj-progres', 'aria-hidden': 'true' }, bara),
        zona)));
    joc.start(ctx);
  }

  function alegeNivel(joc) {
    ruleazaCuratarea();
    document.title = `${joc.nume} – Micii informaticieni – edudigi`;
    const intreb = 'Alege nivelul. Pe măsură ce câștigi stele, se deschid nivelurile următoare.';
    show(h('div', { class: `mici mj-joc ${joc.culoare}` }, h('div', { class: 'wrap' },
      h('div', { class: 'mj-bara' },
        h('a', { class: 'mj-btn mic alb', href: '#/mici', 'aria-label': 'Înapoi la jocuri' }, '← Jocuri'),
        h('h1', {}, h('span', { 'aria-hidden': 'true' }, `${joc.emoji} `), joc.nume), comutatorSunet()),
      h('div', { class: 'mj-zona' },
        h('div', { class: 'mj-intrebare' }, h('p', { class: 'mj-mare' }, 'Alege nivelul'), bAscultă(intreb)),
        h('div', { class: 'mj-niveluri' }, Array.from({ length: niveluri(joc) }, (_, i) => {
          const n = i + 1, ok = deblocat(joc, n);
          const cont = [h('span', { class: 'mj-niv-e', 'aria-hidden': 'true' }, ok ? NIV[i] : '🔒'), h('b', {}, `Nivelul ${n}`), h('span', { class: 'mj-card-desc' }, (joc.niv || [])[i] || ''), h('span', { class: 'mj-card-stele', 'aria-label': `${steleNiv(joc.id, n)} din 3 stele` }, randStele(steleNiv(joc.id, n)))];
          return ok ? h('a', { class: 'mj-nivel', href: `#/mici/${joc.id}/${n}` }, cont) : h('div', { class: 'mj-nivel blocat', 'aria-disabled': 'true' }, cont);
        }))))));
    vorbeste(intreb);
  }

  function comutatorSunet() {
    const b = h('button', { class: 'mj-btn mic alb', type: 'button', 'aria-pressed': String(stare.sunet), title: 'Sunet pornit / oprit' }, stare.sunet ? '🔊 Sunet' : '🔇 Fără sunet');
    b.addEventListener('click', () => {
      stare.sunet = !stare.sunet; salveaza();
      b.textContent = stare.sunet ? '🔊 Sunet' : '🔇 Fără sunet';
      b.setAttribute('aria-pressed', String(stare.sunet));
      if (!stare.sunet && areVoce()) { try { speechSynthesis.cancel(); } catch { /* ignorat */ } }
    });
    return b;
  }

  // ---------- Pagina principală ----------
  const BIT_SVG = `<svg viewBox="0 0 220 244" class="bit-svg" aria-hidden="true" focusable="false">
    <ellipse cx="110" cy="236" rx="62" ry="7" fill="#2A2250" opacity=".14"/>
    <line x1="110" y1="36" x2="110" y2="14" stroke="#5B4FCF" stroke-width="6" stroke-linecap="round"/>
    <g class="bit-antena"><circle cx="110" cy="11" r="10" fill="#F21F4B"/><circle cx="106" cy="7" r="3" fill="#fff" opacity=".8"/></g>
    <rect x="24" y="72" width="20" height="34" rx="9" fill="#F29A1F"/><rect x="176" y="72" width="20" height="34" rx="9" fill="#F29A1F"/>
    <rect x="40" y="34" width="140" height="106" rx="38" fill="#3EC6E0" stroke="#1B9BB8" stroke-width="4"/>
    <rect x="58" y="52" width="104" height="72" rx="28" fill="#1F2A5A"/>
    <g class="bit-ochi"><circle cx="89" cy="84" r="14" fill="#fff"/><circle cx="131" cy="84" r="14" fill="#fff"/>
      <circle cx="92" cy="86" r="7" fill="#1F2A5A"/><circle cx="134" cy="86" r="7" fill="#1F2A5A"/>
      <circle cx="94.5" cy="83" r="2.6" fill="#fff"/><circle cx="136.5" cy="83" r="2.6" fill="#fff"/></g>
    <path d="M92 106 Q110 124 128 106" fill="none" stroke="#FFD23F" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="71" cy="106" r="6" fill="#F8A5C2" opacity=".85"/><circle cx="149" cy="106" r="6" fill="#F8A5C2" opacity=".85"/>
    <rect x="96" y="138" width="28" height="12" rx="4" fill="#1B9BB8"/>
    <rect x="60" y="148" width="100" height="76" rx="28" fill="#F21F4B"/>
    <rect x="81" y="162" width="58" height="36" rx="13" fill="#FFF7EE"/>
    <path d="M110 190 C96 180 98 168 105 168 C108.500 168 110 170.500 110 172 C110 170.500 111.500 168 115 168 C122 168 124 180 110 190 Z" fill="#F21F4B"/>
    <circle cx="91" cy="210" r="4.500" fill="#FFD23F"/><circle cx="110" cy="210" r="4.500" fill="#3EC6E0"/><circle cx="129" cy="210" r="4.500" fill="#2FBF71"/>
    <g class="bit-mana"><path d="M62 166 Q34 164 28 134" fill="none" stroke="#F29A1F" stroke-width="13" stroke-linecap="round"/><circle cx="28" cy="128" r="11" fill="#FFD23F"/></g>
    <path d="M158 166 Q184 178 188 202" fill="none" stroke="#F29A1F" stroke-width="13" stroke-linecap="round"/><circle cx="188" cy="206" r="11" fill="#FFD23F"/>
    <rect x="72" y="222" width="30" height="13" rx="6.500" fill="#171416"/><rect x="118" y="222" width="30" height="13" rx="6.500" fill="#171416"/>
  </svg>`;
  const pips = (j) => h('span', { class: 'mj-pips', role: 'img', 'aria-label': `${steleJoc(j.id)} din ${maxJoc(j)} stele` },
    ...Array.from({ length: niveluri(j) }, (_, i) => h('span', { class: `mj-pip${steleNiv(j.id, i + 1) ? ' on' : ''}${steleNiv(j.id, i + 1) === 3 ? ' max' : ''}` }, NIV[i])),
    h('span', { class: 'mj-pip-txt' }, `⭐ ${steleJoc(j.id)}/${maxJoc(j)}`));
  const card = (j, k) => h('div', { class: `mj-card-loc mj-c${(k % 8) + 1}` },
    h('a', { class: 'mj-card', href: `#/mici/${j.id}` },
      h('span', { class: 'mj-card-top', 'aria-hidden': 'true' }, h('span', { class: 'mj-card-emoji' }, j.emoji)),
      h('span', { class: 'mj-card-body' },
        h('b', {}, j.nume),
        h('span', { class: 'mj-card-desc' }, j.desc),
        pips(j),
        h('span', { class: 'mj-joaca' }, 'Joacă ▶'))),
    areVoce() ? h('button', { class: 'mj-ascult mj-card-voce', type: 'button', 'aria-label': `Ascultă: ${j.nume}`, onclick: () => vorbeste(`${j.nume}. ${j.desc}`) }, '🔊') : null);
  const grup = (ico, titlu, sub, cod, de) => {
    const lista = jocuri.filter((j) => j.grup === cod);
    return h('section', { class: 'mj-sectiune' },
      h('div', { class: 'mj-sect-cap' }, h('span', { class: 'mj-sect-ico', 'aria-hidden': 'true' }, ico), h('div', {}, h('h2', {}, titlu), h('p', { class: 'mj-sub' }, sub))),
      h('div', { class: 'mj-lista' }, lista.map((j, k) => card(j, k + de))));
  };
  function pagina() {
    ruleazaCuratarea();
    document.title = 'Micii informaticieni – jocuri despre calculator, clasele 0–IV – edudigi';
    const total = jocuri.reduce((s, j) => s + steleJoc(j.id), 0), maxim = jocuri.reduce((a, j) => a + maxJoc(j), 0);
    const bara = h('span', { class: 'mj-meter-in' });
    bara.style.width = `${Math.max(4, Math.round((total / maxim) * 100))}%`;
    const salut = 'Salut! Eu sunt Bit. Hai să aflăm împreună cum funcționează calculatorul, jucându-ne!';
    show(h('div', { class: 'mici mj-acasa' },
      h('div', { class: 'mj-cer', 'aria-hidden': 'true' }, h('span', { class: 'nor n1' }, '☁️'), h('span', { class: 'nor n2' }, '☁️'), h('span', { class: 'nor n3' }, '☁️'), h('span', { class: 'ster s1' }, '⭐'), h('span', { class: 'ster s2' }, '✨'), h('span', { class: 'ster s3' }, '⭐'), h('span', { class: 'ster s4' }, '✨')),
      h('div', { class: 'wrap' },
        h('section', { class: 'mj-hero' },
          h('div', { class: 'mj-hero-text' },
            h('p', { class: 'mj-kicker' }, h('span', { 'aria-hidden': 'true' }, '🎒 '), 'Clasele pregătitoare – a IV-a'),
            h('h1', {}, 'Micii ', h('span', { class: 'mj-gradient' }, 'informaticieni')),
            h('div', { class: 'mj-balon' }, h('p', {}, salut), bAscultă(salut)),
            h('div', { class: 'mj-chips' }, ['🎮 12 jocuri', '🌱🌿🌳 3 niveluri', '🔊 Cu voce', '🆓 Fără cont'].map((t) => h('span', { class: 'mj-chip' }, t))),
            h('div', { class: 'mj-meter', role: 'img', 'aria-label': `${total} din ${maxim} stele` }, h('span', { class: 'mj-meter-cap' }, `⭐ ${total} din ${maxim} stele`), h('span', { class: 'mj-meter-bara' }, bara)),
            h('a', { class: 'mj-btn mare mj-start', href: '#mj-jocuri', onclick: (e) => { e.preventDefault(); document.getElementById('mj-jocuri')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Hai să ne jucăm! ▼')),
          h('div', { class: 'mj-hero-art', html: BIT_SVG })),
        h('div', { id: 'mj-jocuri' },
          grup('🎈', 'Fără citit: imagini și voce', 'Pentru cei mici, care încă nu citesc. Fiecare joc îți spune cu voce ce ai de făcut.', 'mici', 0),
          grup('📖', 'Pentru cei care citesc', 'Întrebări cu răspunsuri scrise, citite și cu voce.', 'citesc', 5)),
        h('p', { class: 'mj-subsol' }, 'Jocurile se joacă direct în browser, fără cont și fără reclame. Stelele rămân pe acest calculator. Pentru elevii de gimnaziu, ',
          h('a', { href: '#/' }, 'mergi la lecțiile pentru clasele V–VIII'), '.'))));
  }

  routes.push({
    pattern: /^\/mici(?:\/([a-z-]+)(?:\/(\d))?)?$/,
    handler: async (m) => {
      const joc = m[1] && jocuri.find((j) => j.id === m[1]);
      if (!joc) return pagina();
      const n = Number(m[2]) || 0;
      if (niveluri(joc) > 1 && !(n >= 1 && n <= niveluri(joc) && deblocat(joc, n))) return alegeNivel(joc);
      deschideJoc(joc, n || 1);
    },
  });

  window.Mici = { h, jocuri, shuffle, rand, alege, steleDin, grila, runde, sunet, vorbeste, bAscultă, areVoce, ton };
})();

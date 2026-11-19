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
  const steleJoc = (id) => stare.stele[id] || 0;

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
          sunet('rau'); mesaj.className = 'mj-mesaj rau'; mesaj.textContent = txt || 'Mai încearcă!';
        },
        corect(expl) {
          if (gata) return;
          gata = true; sunet('ok');
          mesaj.className = 'mj-mesaj ok'; mesaj.textContent = `✔ ${expl || 'Bravo!'}`;
          if (optiuni.auto) timer = setTimeout(mai, optiuni.auto);
          else jos.append(h('button', { class: 'mj-btn mare', type: 'button', onclick: mai }, i + 1 >= n ? 'Gata! ➜' : 'Mai departe ➜'));
        },
      });
    };
    pas();
  }

  // ---------- Cadrul unui joc ----------
  function deschideJoc(joc) {
    ruleazaCuratarea();
    document.title = `${joc.nume} – Micii informaticieni – edudigi`;
    const bara = h('div', { class: 'mj-progres-in' });
    const zona = h('div', { class: 'mj-zona' });
    const ctx = {
      zona,
      curata: (fn) => curata.push(fn),
      progres(i, n) { bara.style.width = `${Math.round((i / n) * 100)}%`; },
      vorbeste, sunet,
      gata(stele, mesaj) {
        ruleazaCuratarea();
        bara.style.width = '100%';
        stare.stele[joc.id] = Math.max(steleJoc(joc.id), stele); salveaza();
        sunet('gata');
        const txt = mesaj || (stele === 3 ? 'Excelent! Ești un adevărat informatician!' : stele === 2 ? 'Foarte bine! Mai încearcă o dată pentru toate stelele.' : 'Bravo că ai terminat! Mai joacă o dată și vei câștiga mai multe stele.');
        zona.replaceChildren(h('div', { class: 'mj-final' },
          h('div', { class: 'mj-trofeu', 'aria-hidden': 'true' }, stele === 3 ? '🏆' : '🎉'),
          h('h2', {}, stele === 3 ? 'Felicitări!' : 'Bravo!'),
          h('p', { class: 'mj-stele-mari', 'aria-label': `${stele} din 3 stele` }, randStele(stele)),
          h('p', {}, txt),
          h('div', { class: 'mj-actiuni' },
            h('button', { class: 'mj-btn mare', type: 'button', onclick: () => deschideJoc(joc) }, '🔁 Mai joc'),
            h('a', { class: 'mj-btn mare alb', href: '#/mici' }, '🏠 Alte jocuri'))));
        vorbeste(stele === 3 ? 'Felicitări!' : 'Bravo!');
      },
    };
    show(h('div', { class: `mici mj-joc ${joc.culoare}` },
      h('div', { class: 'wrap' },
        h('div', { class: 'mj-bara' },
          h('a', { class: 'mj-btn mic alb', href: '#/mici', 'aria-label': 'Înapoi la jocuri' }, '← Jocuri'),
          h('h1', {}, h('span', { 'aria-hidden': 'true' }, `${joc.emoji} `), joc.nume),
          comutatorSunet()),
        h('div', { class: 'mj-progres', 'aria-hidden': 'true' }, bara),
        zona)));
    joc.start(ctx);
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
  function pagina() {
    ruleazaCuratarea();
    document.title = 'Micii informaticieni – jocuri despre calculator, clasele 0–IV – edudigi';
    const total = jocuri.reduce((s, j) => s + steleJoc(j.id), 0);
    show(h('div', { class: 'mici mj-acasa' },
      h('div', { class: 'wrap' },
        h('section', { class: 'mj-hero' },
          h('div', { class: 'mj-bit', 'aria-hidden': 'true' }, '🤖'),
          h('div', { class: 'mj-hero-text' },
            h('p', { class: 'mj-kicker' }, 'Clasele pregătitoare – a IV-a'),
            h('h1', {}, 'Micii informaticieni'),
            h('p', { class: 'mj-balon' }, 'Salut! Eu sunt Bit. Hai să aflăm împreună cum funcționează calculatorul, jucându-ne!'),
            h('p', { class: 'mj-total' }, h('span', { 'aria-hidden': 'true' }, '⭐ '), `${total} din ${jocuri.length * 3} stele`))),
        h('div', { class: 'mj-lista' }, jocuri.map((j, k) => h('a', { class: `mj-card mj-c${(k % 8) + 1}`, href: `#/mici/${j.id}` },
          h('span', { class: 'mj-card-emoji', 'aria-hidden': 'true' }, j.emoji),
          h('b', {}, j.nume),
          h('span', { class: 'mj-card-desc' }, j.desc),
          h('span', { class: 'mj-card-stele', 'aria-label': `${steleJoc(j.id)} din 3 stele` }, randStele(steleJoc(j.id)))))),
        h('p', { class: 'mj-nota' }, 'Jocurile se joacă direct în browser, fără cont și fără reclame. Stelele rămân pe acest calculator. Pentru elevii de gimnaziu, ',
          h('a', { href: '#/' }, 'mergi la lecțiile pentru clasele V–VIII'), '.'))));
  }

  routes.push({
    pattern: /^\/mici(?:\/([a-z-]+))?$/,
    handler: async (m) => {
      const joc = m[1] && jocuri.find((j) => j.id === m[1]);
      if (joc) deschideJoc(joc); else pagina();
    },
  });

  window.Mici = { h, jocuri, shuffle, rand, alege, steleDin, grila, runde, sunet, vorbeste, bAscultă, areVoce, ton };
})();

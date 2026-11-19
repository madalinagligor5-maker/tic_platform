'use strict';
// Micii informaticieni – jocurile 1–5: părțile calculatorului, perechi, mouse, tastatură, intrare/ieșire.
(() => {
  if (!window.Mici) return;
  const { h, jocuri, shuffle, rand, alege, grila, runde, sunet, vorbeste, bAscultă } = window.Mici;

  const PARTI = [
    { e: '🖥️', n: 'monitorul', nm: 'Monitor', d: 'Monitorul ne arată imaginile și scrisul.' },
    { e: '⌨️', n: 'tastatura', nm: 'Tastatură', d: 'Cu tastatura scriem litere și cifre.' },
    { e: '🖱️', n: 'mouse-ul', nm: 'Mouse', d: 'Cu mouse-ul arătăm și apăsăm pe ecran.' },
    { e: '🖨️', n: 'imprimanta', nm: 'Imprimantă', d: 'Imprimanta scoate desene și texte pe hârtie.' },
    { e: '🎧', n: 'căștile', nm: 'Căști', d: 'Cu căștile ascultăm doar noi sunetul.' },
    { e: '🎤', n: 'microfonul', nm: 'Microfon', d: 'Microfonul prinde vocea noastră.' },
    { e: '📷', n: 'camera web', nm: 'Cameră web', d: 'Camera web ne arată în convorbirile video.' },
    { e: '🔊', n: 'boxele', nm: 'Boxe', d: 'Boxele dau sunetul mai tare, ca să audă toți.' },
    { e: '💻', n: 'laptopul', nm: 'Laptop', d: 'Laptopul este un calculator pe care îl poți căra cu tine.' },
    { e: '🕹️', n: 'joystick-ul', nm: 'Joystick', d: 'Joystick-ul se folosește la jocuri.' },
  ];

  // ---------- 1. Părțile calculatorului ----------
  jocuri.push({
    id: 'parti', nume: 'Părțile calculatorului', emoji: '🖥️', culoare: 'mj-t1',
    desc: 'Recunoaște monitorul, tastatura, mouse-ul și celelalte.',
    start(ctx) {
      const seturi = alege(PARTI, 8);
      runde(ctx, 8, (i, el, rasp) => {
        const corect = seturi[i];
        const altele = alege(PARTI.filter((p) => p !== corect), 2);
        const optiuni = shuffle([corect, ...altele]);
        if (i % 2 === 0) {
          const intreb = 'Cum se numește?';
          el.append(h('div', { class: 'mj-intrebare' }, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, corect.e), h('p', {}, intreb), bAscultă(intreb)));
          el.append(grila(optiuni.map((p) => ({ c: p.nm, ok: p === corect })), { corect: () => rasp.corect(corect.d), gresit: () => rasp.gresit() }, 'text'));
        } else {
          const intreb = `Unde este ${corect.n}?`;
          el.append(h('div', { class: 'mj-intrebare' }, h('p', { class: 'mj-mare' }, intreb), bAscultă(intreb)));
          el.append(grila(optiuni.map((p) => ({ c: h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, p.e), ok: p === corect, eticheta: p.nm })), { corect: () => rasp.corect(corect.d), gresit: () => rasp.gresit() }));
        }
        vorbeste(i % 2 === 0 ? 'Cum se numește?' : `Unde este ${corect.n}?`);
      }, { auto: 1700 });
    },
  });

  // ---------- 2. Perechi (memorie) ----------
  const PERECHI = [
    { a: '🖨️', b: '📄', t: 'Imprimanta tipărește pe hârtie.' },
    { a: '🎧', b: '🎵', t: 'Cu căștile ascultăm muzică.' },
    { a: '🎤', b: '🗣️', t: 'Microfonul prinde vocea.' },
    { a: '⌨️', b: '🔤', t: 'Tastatura scrie literele.' },
    { a: '🖱️', b: '👆', t: 'Mouse-ul arată și apasă.' },
    { a: '🖥️', b: '🖼️', t: 'Monitorul arată imaginile.' },
    { a: '📷', b: '🤳', t: 'Camera web ne arată pe ecran.' },
    { a: '🕹️', b: '🎮', t: 'Joystick-ul se folosește la jocuri.' },
  ];
  jocuri.push({
    id: 'perechi', nume: 'Perechi', emoji: '🃏', culoare: 'mj-t2',
    desc: 'Găsește perechea: aparatul și ce face el.',
    start(ctx) {
      const alese = alege(PERECHI, 6);
      const carti = shuffle(alese.flatMap((p, k) => [{ k, e: p.a }, { k, e: p.b }]));
      let deschise = [], gasite = 0, miscari = 0, blocat = false;
      const info = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' }, 'Întoarce două cărți și găsește perechea.');
      const contor = h('p', { class: 'mj-contor' }, 'Mutări: 0');
      const tabla = h('div', { class: 'mj-memorie' });
      for (const c of carti) {
        const b = h('button', { type: 'button', class: 'mj-carte', 'aria-label': 'Carte întoarsă' }, h('span', { class: 'fata' }, c.e), h('span', { class: 'spate', 'aria-hidden': 'true' }, '❓'));
        b.addEventListener('click', () => {
          if (blocat || b.classList.contains('desc') || b.classList.contains('gasit')) return;
          b.classList.add('desc'); sunet('click'); b.setAttribute('aria-label', c.e);
          deschise.push({ b, c });
          if (deschise.length < 2) return;
          miscari++; contor.textContent = `Mutări: ${miscari}`;
          const [x, y] = deschise; deschise = [];
          if (x.c.k === y.c.k) {
            x.b.classList.add('gasit'); y.b.classList.add('gasit'); gasite++; sunet('ok');
            info.className = 'mj-mesaj ok'; info.textContent = `✔ ${alese[x.c.k].t}`;
            if (gasite === alese.length) setTimeout(() => ctx.gata(miscari <= 10 ? 3 : miscari <= 15 ? 2 : 1), 1400);
          } else {
            blocat = true; sunet('rau'); info.className = 'mj-mesaj'; info.textContent = 'Nu sunt o pereche. Mai încearcă!';
            const t = setTimeout(() => { x.b.classList.remove('desc'); y.b.classList.remove('desc'); blocat = false; }, 900);
            ctx.curata(() => clearTimeout(t));
          }
        });
        tabla.append(b);
      }
      ctx.zona.replaceChildren(h('p', { class: 'mj-mare' }, 'Potrivește aparatul cu ce face el.'), contor, tabla, info);
    },
  });

  // ---------- 3. Mouse: clic, dublu clic, tragere ----------
  jocuri.push({
    id: 'mouse', nume: 'Antrenament cu mouse-ul', emoji: '🖱️', culoare: 'mj-t3',
    desc: 'Apasă stelele, sparge baloanele și trage șoricelul la brânză.',
    start(ctx) {
      const PASI = [{ tip: 'clic', n: 8, txt: 'Apasă pe stele cu un clic!' }, { tip: 'dublu', n: 4, txt: 'Sparge baloanele cu două clicuri repezi!' }, { tip: 'trage', n: 3, txt: 'Ține apăsat pe șoricel și trage-l la brânză!' }];
      const total = PASI.reduce((s, p) => s + p.n, 0);
      const arena = h('div', { class: 'mj-arena' });
      const titlu = h('p', { class: 'mj-mare' });
      const info = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' });
      ctx.zona.replaceChildren(titlu, arena, info);
      let faza = 0, inFaza = 0, facut = 0, greseli = 0, timer = null, termen = null;
      const curat = () => { clearTimeout(timer); clearTimeout(termen); arena.replaceChildren(); };
      ctx.curata(curat);
      const poz = (el, x, y) => { el.style.left = `${x}%`; el.style.top = `${y}%`; };
      const urmatorul = () => {
        curat();
        if (faza >= PASI.length) return ctx.gata(greseli <= 1 ? 3 : greseli <= 4 ? 2 : 1);
        ctx.progres(facut, total);
        const cum = PASI[faza];
        titlu.textContent = cum.txt; info.textContent = '';
        if (cum.tip === 'trage') return trage();
        const t = h('button', { type: 'button', class: `mj-tinta ${cum.tip}`, 'aria-label': cum.tip === 'clic' ? 'Stea' : 'Balon' }, cum.tip === 'clic' ? '⭐' : '🎈');
        poz(t, rand(4, 86), rand(6, 76));
        const reusit = () => { sunet('ok'); facut++; inFaza++; if (inFaza >= cum.n) { faza++; inFaza = 0; } timer = setTimeout(urmatorul, 250); };
        if (cum.tip === 'clic') t.addEventListener('click', (e) => { e.stopPropagation(); t.disabled = true; t.classList.add('spart'); reusit(); });
        else {
          t.addEventListener('click', (e) => { e.stopPropagation(); info.textContent = 'Apasă de două ori, repede!'; });
          t.addEventListener('dblclick', (e) => { e.stopPropagation(); t.classList.add('spart'); t.textContent = '💥'; reusit(); });
        }
        arena.append(t);
        termen = setTimeout(() => { greseli++; sunet('rau'); info.textContent = 'Ai fost prea lent. Mai încearcă!'; timer = setTimeout(urmatorul, 500); }, cum.tip === 'clic' ? 3200 : 6500);
      };
      const trage = () => {
        const sob = h('div', { class: 'mj-tinta sob', role: 'img', 'aria-label': 'Șoricel' }, '🐭');
        const br = h('div', { class: 'mj-tinta branza', role: 'img', 'aria-label': 'Brânză' }, '🧀');
        poz(sob, rand(3, 15), rand(15, 70)); poz(br, rand(75, 88), rand(15, 70));
        arena.append(br, sob);
        let ia = null;
        sob.addEventListener('pointerdown', (e) => { sob.setPointerCapture(e.pointerId); ia = true; sob.classList.add('ia'); });
        sob.addEventListener('pointermove', (e) => {
          if (!ia) return;
          const r = arena.getBoundingClientRect();
          sob.style.left = `${Math.min(r.width - 52, Math.max(0, e.clientX - r.left - 26))}px`;
          sob.style.top = `${Math.min(r.height - 52, Math.max(0, e.clientY - r.top - 26))}px`;
        });
        const lasa = () => {
          if (!ia) return; ia = false; sob.classList.remove('ia');
          const a = sob.getBoundingClientRect(), b = br.getBoundingClientRect();
          if (Math.hypot(a.left - b.left, a.top - b.top) < 55) { sob.textContent = '😋'; facut++; inFaza++; if (inFaza >= PASI[faza].n) { faza++; inFaza = 0; } sunet('ok'); timer = setTimeout(urmatorul, 600); }
          else { greseli++; sunet('rau'); info.textContent = 'Du-l până la brânză, apoi dă drumul!'; }
        };
        sob.addEventListener('click', (e) => e.stopPropagation());
        sob.addEventListener('pointerup', lasa); sob.addEventListener('pointercancel', lasa);
      };
      arena.addEventListener('click', () => { greseli++; sunet('rau'); info.textContent = 'Țintește bine!'; });
      urmatorul();
    },
  });

  // ---------- 4. Tastatura ----------
  const RANDURI = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const LITERE = 'AEIOUMSTRLCNPDBF'.split('');
  const CUVINTE = ['MAMA', 'TATA', 'CASA', 'LUNA', 'SOARE', 'PISICA', 'MINGE', 'CARTE', 'FLOARE', 'MASINA'];
  jocuri.push({
    id: 'tastatura', nume: 'Tastatura', emoji: '⌨️', culoare: 'mj-t4',
    desc: 'Apasă litera potrivită, apoi scrie cuvinte.',
    start(ctx) {
      const tinte = [...alege(LITERE, 5), ...alege(CUVINTE.filter((c) => c.length <= 4), 2), ...alege(CUVINTE.filter((c) => c.length > 4), 2)];
      runde(ctx, tinte.length, (i, el, rasp) => {
        const tinta = tinte[i];
        let poz = 0;
        const tiles = [...tinta].map((l) => h('span', { class: 'mj-litera' }, l));
        const taste = {};
        const tastatura = h('div', { class: 'mj-tastatura' }, RANDURI.map((r) => h('div', { class: 'mj-rand' }, [...r].map((l) => {
          const b = h('button', { type: 'button', class: 'mj-tasta', 'data-k': l, tabindex: '-1' }, l);
          b.addEventListener('click', () => apasa(l)); taste[l] = b; return b;
        }))));
        const marcheaza = () => {
          for (const t of Object.values(taste)) t.classList.remove('urm');
          tiles.forEach((t, k) => { t.classList.toggle('ok', k < poz); t.classList.toggle('cur', k === poz); });
          if (poz < tinta.length) taste[tinta[poz]]?.classList.add('urm');
        };
        function apasa(l) {
          if (poz >= tinta.length) return;
          if (l === tinta[poz]) { poz++; sunet('click'); marcheaza(); if (poz === tinta.length) rasp.corect(tinta.length > 1 ? `Ai scris „${tinta}”!` : 'Așa!'); }
          else { taste[l]?.classList.add('rau'); setTimeout(() => taste[l]?.classList.remove('rau'), 350); rasp.gresit(`Cauți litera ${tinta[poz]}.`); }
        }
        const eveniment = (e) => {
          if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
          const l = e.key.toUpperCase();
          if (/[A-Z]/.test(l)) { e.preventDefault(); apasa(l); }
        };
        document.addEventListener('keydown', eveniment);
        ctx.curata(() => document.removeEventListener('keydown', eveniment));
        el.append(h('p', { class: 'mj-mare' }, tinta.length === 1 ? 'Apasă litera de pe ecran:' : 'Scrie cuvântul:'), h('div', { class: 'mj-litere' }, tiles), tastatura);
        marcheaza();
        vorbeste(tinta.length === 1 ? `Apasă litera ${tinta}` : `Scrie cuvântul ${tinta.toLowerCase()}`);
      }, { auto: 1000 });
    },
  });

  // ---------- 5. Intrare sau ieșire ----------
  const IO = [
    { e: '⌨️', nm: 'Tastatura', intrare: true, t: 'Eu scriu cu tastatura, deci îi dau informații calculatorului: este de intrare.' },
    { e: '🖱️', nm: 'Mouse-ul', intrare: true, t: 'Cu mouse-ul dau comenzi calculatorului: este de intrare.' },
    { e: '🎤', nm: 'Microfonul', intrare: true, t: 'Microfonul duce vocea mea în calculator: este de intrare.' },
    { e: '📷', nm: 'Camera web', intrare: true, t: 'Camera web duce imaginea mea în calculator: este de intrare.' },
    { e: '🕹️', nm: 'Joystick-ul', intrare: true, t: 'Cu joystick-ul dau comenzi jocului: este de intrare.' },
    { e: '🖥️', nm: 'Monitorul', intrare: false, t: 'Monitorul îmi arată ce face calculatorul: este de ieșire.' },
    { e: '🖨️', nm: 'Imprimanta', intrare: false, t: 'Imprimanta scoate hârtia scrisă de calculator: este de ieșire.' },
    { e: '🔊', nm: 'Boxele', intrare: false, t: 'Boxele scot sunetul din calculator: sunt de ieșire.' },
    { e: '🎧', nm: 'Căștile', intrare: false, t: 'Căștile îmi dau sunetul din calculator: sunt de ieșire.' },
  ];
  jocuri.push({
    id: 'intrare-iesire', nume: 'Intrare sau ieșire?', emoji: '🔀', culoare: 'mj-t5',
    desc: 'Aparatul dă ceva calculatorului sau primește de la el?',
    start(ctx) {
      const ordine = shuffle(IO);
      runde(ctx, ordine.length, (i, el, rasp) => {
        const a = ordine[i];
        const intreb = `${a.nm}: intrare sau ieșire?`;
        el.append(
          h('div', { class: 'mj-intrebare' }, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, a.e), h('p', { class: 'mj-mare' }, a.nm), bAscultă(intreb)),
          h('p', { class: 'mj-ajutor' }, 'Intrare = eu dau calculatorului. Ieșire = calculatorul îmi arată mie.'),
          grila([
            { c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '📥'), h('br'), 'Intrare'), ok: a.intrare, eticheta: 'Intrare' },
            { c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '📤'), h('br'), 'Ieșire'), ok: !a.intrare, eticheta: 'Ieșire' },
          ], { corect: () => rasp.corect(a.t), gresit: () => rasp.gresit('Nu chiar. Gândește-te: cine dă și cine primește?') }, 'doua'));
        vorbeste(intreb);
      });
    },
  });
})();

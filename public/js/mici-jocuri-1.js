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

  const QUESTII = { '🖥️': 'Care ne arată imaginile?', '⌨️': 'Cu care scriem litere?', '🖱️': 'Cu care apăsăm pe ecran?', '🖨️': 'Care scoate hârtie scrisă?', '🎧': 'Cu care ascultăm doar noi?', '🎤': 'Care prinde vocea?', '📷': 'Care ne arată în convorbirile video?', '🔊': 'Care dau sunetul mai tare?', '💻': 'Care este un calculator de cărat?', '🕹️': 'Care se folosește la jocuri?' };
  // ---------- 1. Părțile calculatorului ----------
  jocuri.push({
    id: 'parti', grup: 'citesc', nume: 'Părțile calculatorului', emoji: '🖥️', culoare: 'mj-t1',
    niveluri: 3, niv: ['6 aparate: arată imaginea potrivită', '8 întrebări: nume și imagini', '10 întrebări: ghicește după ce face'],
    desc: 'Recunoaște monitorul, tastatura, mouse-ul și celelalte.',
    start(ctx) {
      const n = ctx.nivel, nr = [6, 8, 10][n - 1];
      const pool = n === 1 ? PARTI.slice(0, 6) : PARTI;
      const seturi = alege(pool, nr);
      runde(ctx, nr, (i, el, rasp) => {
        const corect = seturi[i];
        const altele = alege(pool.filter((p) => p !== corect), n === 3 ? 3 : 2);
        const optiuni = shuffle([corect, ...altele]);
        const tip = n === 1 ? 'unde' : n === 2 ? (i % 2 === 0 ? 'nume' : 'unde') : ['nume', 'unde', 'ce'][i % 3];
        if (tip === 'ce') {
          const intreb = QUESTII[corect.e];
          el.append(h('div', { class: 'mj-intrebare' }, h('p', { class: 'mj-mare' }, intreb), bAscultă(intreb)));
          el.append(grila(optiuni.map((p) => ({ c: h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, p.e), ok: p === corect, eticheta: p.nm })), { corect: () => rasp.corect(corect.d), gresit: () => rasp.gresit() }));
          vorbeste(intreb);
        } else if (tip === 'nume') {
          const intreb = 'Cum se numește?';
          el.append(h('div', { class: 'mj-intrebare' }, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, corect.e), h('p', {}, intreb), bAscultă(intreb)));
          el.append(grila(optiuni.map((p) => ({ c: p.nm, ok: p === corect })), { corect: () => rasp.corect(corect.d), gresit: () => rasp.gresit() }, 'text'));
        } else {
          const intreb = `Unde este ${corect.n}?`;
          el.append(h('div', { class: 'mj-intrebare' }, h('p', { class: 'mj-mare' }, intreb), bAscultă(intreb)));
          el.append(grila(optiuni.map((p) => ({ c: h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, p.e), ok: p === corect, eticheta: p.nm })), { corect: () => rasp.corect(corect.d), gresit: () => rasp.gresit() }));
        }
        if (tip !== 'ce') vorbeste(tip === 'nume' ? 'Cum se numește?' : `Unde este ${corect.n}?`);
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
    id: 'perechi', grup: 'mici', nume: 'Perechi', emoji: '🃏', culoare: 'mj-t2',
    niveluri: 3, niv: ['4 perechi', '6 perechi', '8 perechi'],
    desc: 'Găsește perechea: aparatul și ce face el.',
    start(ctx) {
      const nrP = [4, 6, 8][ctx.nivel - 1];
      const alese = alege(PERECHI, nrP);
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
            if (gasite === alese.length) setTimeout(() => ctx.gata(miscari <= Math.round(nrP * 1.7) ? 3 : miscari <= Math.round(nrP * 2.6) ? 2 : 1), 1400);
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
    id: 'mouse', grup: 'mici', nume: 'Antrenament cu mouse-ul', emoji: '🖱️', culoare: 'mj-t3',
    niveluri: 3, niv: ['ținte mari, timp mult', 'ținte mai mici, mai repede', 'ținte mici care se mișcă'],
    desc: 'Apasă stelele, sparge baloanele și trage șoricelul la brânză.',
    start(ctx) {
      const NV = ctx.nivel, N = [[8, 4, 3], [12, 6, 4], [14, 8, 5]][NV - 1], TIMP = [[3200, 6500], [2400, 5000], [2000, 4200]][NV - 1];
      const PASI = [{ tip: 'clic', n: N[0], txt: 'Apasă pe stele cu un clic!' }, { tip: 'dublu', n: N[1], txt: 'Sparge baloanele cu două clicuri repezi!' }, { tip: 'trage', n: N[2], txt: 'Ține apăsat pe șoricel și trage-l la brânză!' }];
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
        const t = h('button', { type: 'button', class: `mj-tinta ${cum.tip}${NV > 1 ? ' mic' : ''}`, 'aria-label': cum.tip === 'clic' ? 'Stea' : 'Balon' }, cum.tip === 'clic' ? '⭐' : '🎈');
        poz(t, rand(4, 86), rand(6, 76));
        if (NV === 3) setTimeout(() => { t.style.transition = 'left 1.8s linear, top 1.8s linear'; poz(t, rand(4, 86), rand(6, 76)); }, 60);
        const reusit = () => { sunet('ok'); facut++; inFaza++; if (inFaza >= cum.n) { faza++; inFaza = 0; } timer = setTimeout(urmatorul, 250); };
        if (cum.tip === 'clic') t.addEventListener('click', (e) => { e.stopPropagation(); t.disabled = true; t.classList.add('spart'); reusit(); });
        else {
          t.addEventListener('click', (e) => { e.stopPropagation(); info.textContent = 'Apasă de două ori, repede!'; });
          t.addEventListener('dblclick', (e) => { e.stopPropagation(); t.classList.add('spart'); t.textContent = '💥'; reusit(); });
        }
        arena.append(t);
        termen = setTimeout(() => { greseli++; sunet('rau'); info.textContent = 'Ai fost prea lent. Mai încearcă!'; timer = setTimeout(urmatorul, 500); }, cum.tip === 'clic' ? TIMP[0] : TIMP[1]);
      };
      const trage = () => {
        const sob = h('div', { class: 'mj-tinta sob', role: 'img', 'aria-label': 'Șoricel' }, '🐭');
        const br = h('div', { class: 'mj-tinta branza', role: 'img', 'aria-label': 'Brânză' }, '🧀');
        poz(sob, rand(3, 15), rand(15, 70)); poz(br, rand(75, 88), rand(15, 70));
        if (NV === 3) br.classList.add('mic');
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
  const CUVINTE_LUNGI = ['CALCULATOR', 'TASTATURA', 'MONITOR', 'INTERNET', 'IMPRIMANTA', 'PROGRAM'];
  const CUVINTE = ['MAMA', 'TATA', 'CASA', 'LUNA', 'SOARE', 'PISICA', 'MINGE', 'CARTE', 'FLOARE', 'MASINA'];
  jocuri.push({
    id: 'tastatura', grup: 'mici', nume: 'Tastatura', emoji: '⌨️', culoare: 'mj-t4',
    niveluri: 3, niv: ['6 litere', 'litere și cuvinte', 'cuvinte lungi, fără ajutor'],
    desc: 'Apasă litera potrivită, apoi scrie cuvinte.',
    start(ctx) {
      const NV = ctx.nivel;
      const tinte = NV === 1 ? alege('AEIOUMSTRL'.split(''), 6)
        : NV === 2 ? [...alege(LITERE, 5), ...alege(CUVINTE.filter((c) => c.length <= 4), 2), ...alege(CUVINTE.filter((c) => c.length > 4), 2)]
          : [...alege(LITERE, 3), ...alege(CUVINTE.filter((c) => c.length <= 5), 3), ...alege(CUVINTE_LUNGI, 4)];
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
          if (NV < 3 && poz < tinta.length) taste[tinta[poz]]?.classList.add('urm');
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
    id: 'intrare-iesire', grup: 'citesc', nume: 'Intrare sau ieșire?', emoji: '🔀', culoare: 'mj-t5',
    niveluri: 3, niv: ['6 aparate', '9 aparate', 'apare și „amândouă”'],
    desc: 'Aparatul dă ceva calculatorului sau primește de la el?',
    start(ctx) {
      const NV = ctx.nivel;
      const AMBELE = [
        { e: '📱', nm: 'Ecranul tactil', ambele: true, t: 'Ecranul tactil arată imaginile și primește atingerea ta: este și de intrare, și de ieșire.' },
        { e: '🎧', nm: 'Căștile cu microfon', ambele: true, t: 'Căștile ne dau sunetul, iar microfonul prinde vocea: sunt și de ieșire, și de intrare.' },
        { e: '💾', nm: 'Stick-ul de memorie', ambele: true, t: 'Pe stick punem fișiere și tot de pe el le citim: este și de intrare, și de ieșire.' },
      ];
      const ordine = NV === 1 ? shuffle([...alege(IO.filter((x) => x.intrare), 3), ...alege(IO.filter((x) => !x.intrare), 3)]) : NV === 2 ? shuffle(IO) : shuffle([...IO, ...AMBELE]);
      runde(ctx, ordine.length, (i, el, rasp) => {
        const a = ordine[i];
        const intreb = `${a.nm}: intrare sau ieșire?`;
        el.append(
          h('div', { class: 'mj-intrebare' }, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, a.e), h('p', { class: 'mj-mare' }, a.nm), bAscultă(intreb)),
          h('p', { class: 'mj-ajutor' }, 'Intrare = eu dau calculatorului. Ieșire = calculatorul îmi arată mie.'),
          grila([
            { c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '📥'), h('br'), 'Intrare'), ok: !a.ambele && a.intrare, eticheta: 'Intrare' },
            { c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '📤'), h('br'), 'Ieșire'), ok: !a.ambele && !a.intrare, eticheta: 'Ieșire' },
            ...(NV === 3 ? [{ c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '🔁'), h('br'), 'Amândouă'), ok: !!a.ambele, eticheta: 'Amândouă' }] : []),
          ], { corect: () => rasp.corect(a.t), gresit: () => rasp.gresit('Nu chiar. Gândește-te: cine dă și cine primește?') }, 'doua'));
        vorbeste(intreb);
      });
    },
  });
})();

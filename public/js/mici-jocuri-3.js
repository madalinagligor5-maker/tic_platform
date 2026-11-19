'use strict';
// Micii informaticieni – activități mai ample, fără citit (doar imagini și voce):
// calculatorul lui Bit (desktop de jucărie), programare cu imagini, studio de muzică.
(() => {
  if (!window.Mici) return;
  const { h, jocuri, shuffle, alege, steleDin, sunet, vorbeste, ton, bAscultă } = window.Mici;
  const ESTE = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  // Misiune afișată doar prin imagini + voce (cu buton de reascultare)
  function misiune(box, pictograme, voce) {
    box.replaceChildren(h('div', { class: 'mj-picto', 'aria-hidden': 'true' }, pictograme.map((p) => h('span', {}, p))), bAscultă(voce), h('span', { class: 'sr-only' }, voce));
    vorbeste(voce);
  }

  // ---------- A. Calculatorul lui Bit ----------
  jocuri.push({
    id: 'desktop', nume: 'Calculatorul lui Bit', emoji: '💻', culoare: 'mj-t1', grup: 'mici',
    niveluri: 3, niv: ['foldere, poze și gunoi', 'foldere în foldere (2 straturi)', '3 straturi, folder nou și multe poze'],
    desc: 'Deschide foldere, mută pozele la locul lor și aruncă gunoiul. Cu voce și imagini.',
    start(ctx) {
      const NV = ctx.nivel;
      const scena = h('div', { class: 'mj-desktop' });
      const box = h('div', { class: 'mj-misiune' });
      const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' });
      ctx.zona.replaceChildren(box, scena, mesaj);
      let m = 0, greseli = 0, timer = null;
      ctx.curata(() => clearTimeout(timer));
      const MISIUNI = NV === 1 ? [m1, m2, () => m3(false), m4, m5] : NV === 2 ? [m1, () => m6(2, 2), () => m3(false), m4, m5] : [() => m6(3, 3), () => m3(true), m4, m7, m5];
      const spune = (txt, tip) => { mesaj.className = `mj-mesaj ${tip || ''}`.trim(); mesaj.textContent = txt; };
      const rau = (txt) => { greseli++; sunet('rau'); spune(txt, 'rau'); vorbeste(txt); };
      const reusit = (txt) => { sunet('ok'); spune(`✔ ${txt}`, 'ok'); vorbeste(txt); m++; timer = setTimeout(urmatoarea, 1500); };
      const urmatoarea = () => { if (m >= MISIUNI.length) return ctx.gata(steleDin(greseli, 8)); ctx.progres(m, MISIUNI.length); scena.replaceChildren(); spune(''); MISIUNI[m](); };
      const poz = (el, x, y) => { el.style.left = `${x}%`; el.style.top = `${y}%`; return el; };
      const icoana = (e, clasa = '') => h('div', { class: `mj-ic ${clasa}`.trim(), role: 'img' }, h('span', { class: 'mj-ic-e' }, e));
      const folder = (badge, clasa = '') => h('div', { class: `mj-ic mj-folder ${clasa}`.trim(), role: 'img' }, h('span', { class: 'mj-ic-e' }, '📁'), h('span', { class: 'mj-badge' }, badge));
      const cos = () => poz(h('div', { class: 'mj-ic mj-cos', role: 'img', 'aria-label': 'Coș de gunoi' }, h('span', { class: 'mj-ic-e' }, '🗑️')), 84, 62);

      // Două atingeri repezi
      function dublu(el, cand, indiciu) {
        let ultima = 0, mutat = false;
        el.addEventListener('pointerdown', () => { mutat = false; });
        el.addEventListener('pointerup', () => {
          const t = Date.now();
          if (t - ultima < 600) { ultima = 0; cand(); } else { ultima = t; spune(indiciu); }
        });
      }
      // Tragere + lăsare peste o țintă
      function trage(el, tinte, cand) {
        let ia = false, ox = 0, oy = 0, orig = [];
        el.classList.add('mj-trag');
        el.addEventListener('pointerdown', (e) => {
          el.setPointerCapture(e.pointerId);
          const r = el.getBoundingClientRect();
          ox = e.clientX - r.left; oy = e.clientY - r.top; orig = [el.style.left, el.style.top]; ia = true; el.classList.add('ia');
        });
        el.addEventListener('pointermove', (e) => {
          if (!ia) return;
          const s = scena.getBoundingClientRect(), r = el.getBoundingClientRect();
          el.style.left = `${Math.min(s.width - r.width, Math.max(0, e.clientX - s.left - ox))}px`;
          el.style.top = `${Math.min(s.height - r.height, Math.max(0, e.clientY - s.top - oy))}px`;
        });
        const lasa = () => {
          if (!ia) return; ia = false; el.classList.remove('ia');
          const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const t = tinte().find((x) => ESTE(cx, cy, x.getBoundingClientRect()));
          if (!cand(t || null)) { el.style.left = orig[0]; el.style.top = orig[1]; }
        };
        el.addEventListener('pointerup', lasa); el.addEventListener('pointercancel', lasa);
      }

      // 1. Deschide folderul (două atingeri)
      function m1() {
        misiune(box, ['👆👆', '➜', '📁'], 'Atinge de două ori repede folderul, ca să-l deschizi.');
        const f = poz(folder('🐾'), 40, 30); scena.append(f);
        dublu(f, () => { f.classList.add('deschis'); reusit('Bravo! Ai deschis folderul.'); }, 'Atinge de două ori, repede!');
      }
      // 2. Închide fereastra
      function m2() {
        misiune(box, ['👆', '➜', '❌'], 'Atinge iksul roșu, ca să închizi fereastra.');
        const x = h('button', { type: 'button', class: 'mj-x', 'aria-label': 'Închide fereastra' }, '✕');
        const fer = poz(h('div', { class: 'mj-fereastra' }, h('div', { class: 'mj-fer-bara' }, x), h('div', { class: 'mj-fer-corp', 'aria-hidden': 'true' }, '🐶 🐱 🐰 🐦')), 20, 14);
        x.addEventListener('click', () => { fer.classList.add('inchis'); reusit('Bravo! Fereastra s-a închis.'); });
        scena.append(fer);
      }
      // 3. Sortează pozele în foldere
      function m3(mare) {
        misiune(box, ['✋', '🌷', '➜', '📁🌸'], 'Trage fiecare poză în folderul care se potrivește: flori la flori, animale la animale, fructe la fructe.');
        const grupe = [{ b: '🌸', e: ['🌷', '🌹', '🌻'] }, { b: '🐾', e: ['🐶', '🐱', '🐰'] }, { b: '🍎', e: ['🍎', '🍌', '🍇'] }].map((g) => ({ ...g, e: g.e.slice(0, mare ? 3 : 2) }));
        const dosare = grupe.map((g, k) => { const f = poz(folder(g.b), 14 + k * 32, 6); f.dataset.b = g.b; scena.append(f); return f; });
        let ramase = mare ? 9 : 6;
        shuffle(grupe.flatMap((g) => g.e.map((e) => ({ e, b: g.b })))).forEach((p, k) => {
          const el = mare ? poz(h('div', { class: 'mj-ic mj-poza', role: 'img', 'aria-label': p.e }, h('span', { class: 'mj-ic-e' }, p.e)), 6 + (k % 5) * 18, 46 + Math.floor(k / 5) * 24)
            : poz(h('div', { class: 'mj-ic mj-poza', role: 'img', 'aria-label': p.e }, h('span', { class: 'mj-ic-e' }, p.e)), 6 + k * 15, 62 + (k % 2) * 14);
          scena.append(el);
          trage(el, () => dosare, (t) => {
            if (!t) return false;
            if (t.dataset.b !== p.b) { rau('Nu e folderul potrivit. Încearcă altul.'); return false; }
            el.remove(); t.classList.add('plin'); sunet('ok'); ramase--;
            if (!ramase) reusit('Foarte bine! Toate pozele sunt la locul lor.'); else spune('✔', 'ok');
            return true;
          });
        });
      }
      // 4. Aruncă gunoiul
      function m4() {
        misiune(box, ['✋', '💥', '➜', '🗑️'], 'Trage fișierele stricate la coșul de gunoi.');
        const c = cos(); scena.append(c);
        let ramase = 3;
        for (let k = 0; k < 4; k++) {
          const strica = k !== 1;
          const el = poz(h('div', { class: 'mj-ic mj-poza', role: 'img', 'aria-label': strica ? 'Fișier stricat' : 'Poză bună' }, h('span', { class: 'mj-ic-e' }, strica ? '💥' : '🖼️')), 10 + k * 18, 20 + (k % 2) * 28);
          scena.append(el);
          trage(el, () => [c], (t) => {
            if (!t) return false;
            if (!strica) { rau('Poza aceasta este bună! O păstrăm.'); return false; }
            el.remove(); sunet('ok'); ramase--;
            if (!ramase) reusit('Gata! Coșul a luat gunoiul.'); else spune('✔', 'ok');
            return true;
          });
        }
      }
      // 6. Foldere în foldere: urmează drumul din imagine până la comoară
      function m6(adanc, nrDecor) {
        const badge = ['🌸', '🐾', '🍎', '⭐', '🚗', '🌙'];
        const cale = alege(badge, adanc);
        const pict = cale.flatMap((b, k) => [k ? '➜' : '', `📁${b}`]).filter(Boolean).concat(['➜', '🎁']);
        misiune(box, pict, 'Deschide folderele în ordinea din imagine, ca să găsești comoara. Fiecare folder are în el alte foldere.');
        let nivel = 0;
        const bara = h('div', { class: 'mj-fer-bara' });
        const continut = h('div', { class: 'mj-fer-continut' });
        const fer = h('div', { class: 'mj-fer-mare' }, bara, continut);
        const afiseaza = () => {
          const cr = h('div', { class: 'mj-cale', 'aria-hidden': 'true' }, ['🖥️', ...cale.slice(0, nivel).map((b) => `› 📁${b}`)].map((x) => h('span', {}, x)));
          const sus = h('button', { type: 'button', class: 'mj-x sus', 'aria-label': 'Înapoi, un strat mai sus', onclick: () => { if (nivel > 0) { nivel--; afiseaza(); sunet('click'); } } }, '⬆️');
          sus.disabled = nivel === 0;
          bara.replaceChildren(cr, sus);
          continut.replaceChildren();
          if (nivel === adanc) {
            const cm = h('button', { type: 'button', class: 'mj-comoara', 'aria-label': 'Comoara' }, '🎁');
            cm.addEventListener('click', () => { cm.classList.add('spart'); reusit('Ai găsit comoara!'); });
            continut.append(cm); return;
          }
          const alt = alege(badge.filter((b) => b !== cale[nivel]), Math.min(nrDecor, badge.length - 1));
          for (const b of shuffle([cale[nivel], ...alt.slice(0, nrDecor - 1)])) {
            const f = folder(b, 'rel');
            dublu(f, () => { if (b === cale[nivel]) { nivel++; sunet('ok'); afiseaza(); } else rau('Nu este folderul din imagine. Încearcă altul.'); }, 'Atinge de două ori, repede!');
            continut.append(f);
          }
        };
        afiseaza(); scena.append(fer);
      }
      // 7. Folder nou
      function m7() {
        misiune(box, ['👆', '➕📁', '➜', '✋', '🐶🐱', '➜', '📁'], 'Atinge butonul cu plus, ca să faci un folder nou. Apoi mută câinele și pisica în folderul nou.');
        const plus = h('button', { type: 'button', class: 'mj-btn mare mj-plus', 'aria-label': 'Folder nou' }, '➕📁');
        let nou = null, ramase = 2;
        const fisiere = [];
        ['🐶', '🐱'].forEach((e, k) => {
          const el = poz(h('div', { class: 'mj-ic mj-poza', role: 'img', 'aria-label': e }, h('span', { class: 'mj-ic-e' }, e)), 30 + k * 20, 62);
          scena.append(el); fisiere.push(el);
          trage(el, () => (nou ? [nou] : []), (t) => {
            if (!t) { if (!nou) rau('Mai întâi fă un folder nou, cu butonul plus.'); return false; }
            el.remove(); nou.classList.add('plin'); sunet('ok'); ramase--;
            if (!ramase) reusit('Ai făcut un folder nou și ai pus fișierele în el!'); else spune('✔', 'ok');
            return true;
          });
        });
        plus.addEventListener('click', () => {
          if (nou) return; sunet('ok');
          nou = poz(folder('✨'), 40, 10); scena.append(nou); plus.disabled = true; spune('Ai făcut un folder nou! Acum trage pozele în el.', 'ok'); vorbeste('Ai făcut un folder nou. Acum trage pozele în el.');
        });
        scena.append(plus);
      }
      // 5. Pornește o aplicație
      function m5() {
        misiune(box, ['👆👆', '➜', '🎨'], 'Atinge de două ori repede pictograma, ca să pornești programul de desen.');
        const a = poz(icoana('🎨'), 42, 30); scena.append(a);
        dublu(a, () => { a.classList.add('deschis'); reusit('Ai pornit programul de desen. Acum știi să folosești un calculator!'); }, 'Atinge de două ori, repede!');
      }
      urmatoarea();
    },
  });

  // ---------- B. Programează cu imagini ----------
  const NIVELE = [
    ['......', '......', 'S....H', '......', '......'],
    ['SAAAA.', '......', '......', '......', '.....H'],
    ['S.#...', '..#.A.', '.A#...', '..#...', '.....H'],
    ['SA.A..', '.#.#..', '.#A#..', '.#.#..', '...#.H'],
    ['S.A...', '.##.#.', 'A.#...', '.#..A.', '...#.H'],
  ];
  const DIR = [{ s: '⬆️', dx: 0, dy: -1, n: 'sus' }, { s: '➡️', dx: 1, dy: 0, n: 'dreapta' }, { s: '⬇️', dx: 0, dy: 1, n: 'jos' }, { s: '⬅️', dx: -1, dy: 0, n: 'stânga' }];
  const NIVELE_3 = [['S.#.A.', 'A.#.#.', '..#.#.', '.##.#A', 'A....H'], ['S..#.A', '.#.#..', '.#.A#.', '.#.#..', '.A...H'], ['SA#A..', '.##.#.', 'A..A.#', '.#.#..', '..#.AH'], ['S.#...', '..#.A.', '.A#...', '..#...', '.....H'], ['SA.#..', '.#.#A.', '.#.#..', '.#A..#', '.#.#.H']];
  const MAX_3 = [7, 11, 11, 8, 8];
  jocuri.push({
    id: 'program', nume: 'Programează pisica', emoji: '🐱', culoare: 'mj-t6', grup: 'mici',
    niveluri: 3, niv: ['3 hărți', '5 hărți cu ziduri', '5 hărți grele, cu puține blocuri'],
    desc: 'Pune blocuri cu săgeți și numere: pisica adună merele și ajunge acasă.',
    start(ctx) {
      const NV = ctx.nivel;
      const HARTI = NV === 3 ? NIVELE_3 : NV === 1 ? NIVELE.slice(0, 3) : NIVELE;
      let nivel = 0, esecuri = 0, timer = null;
      ctx.curata(() => clearTimeout(timer));
      const incarca = () => {
        clearTimeout(timer);
        if (nivel >= HARTI.length) return ctx.gata(esecuri <= 2 ? 3 : esecuri <= 6 ? 2 : 1);
        ctx.progres(nivel, HARTI.length);
        const harta = HARTI[nivel], MAXB = NV === 3 ? MAX_3[nivel] : 9;
        let start = [0, 0], mere = new Set();
        harta.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'S') start = [x, y]; if (c === 'A') mere.add(`${x},${y}`); }));
        const total = mere.size;
        let program = [], sel = -1, ruleaza = false;
        const celule = harta.map((r, y) => [...r].map((c, x) => h('div', { class: `mj-celula${c === '#' ? ' zid' : ''}` }, c === '#' ? '🧱' : c === 'H' ? '🏠' : '')));
        const tabla = h('div', { class: 'mj-prog-tabla', role: 'img', 'aria-label': 'Hartă: pisica trebuie să adune merele și să ajungă acasă' }, celule.flat());
        const pisica = h('span', { class: 'mj-robot', 'aria-hidden': 'true' }, '🐱');
        const afisareMere = () => harta.forEach((r, y) => [...r].forEach((c, x) => {
          const cel = celule[y][x]; for (const e of cel.querySelectorAll('.mar')) e.remove();
          if (mere.has(`${x},${y}`)) cel.append(h('span', { class: 'mar' }, '🍎'));
        }));
        let poz = [...start];
        const puneTot = () => { celule[poz[1]][poz[0]].append(pisica); afisareMere(); };
        const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' });
        const cerinta = h('div', { class: 'mj-misiune' });
        misiune(cerinta, ['🐱', '➜', total ? '🍎'.repeat(Math.min(total, 4)) : '', '➜', '🏠'].filter(Boolean), total ? 'Pune blocuri cu săgeți. Pisica trebuie să adune toate merele, apoi să ajungă acasă.' : 'Pune blocuri cu săgeți. Pisica trebuie să ajungă acasă.');

        const lant = h('div', { class: 'mj-lant', 'aria-label': 'Programul tău' });
        const nrBtns = h('div', { class: 'mj-numere' });
        const redesenez = (activ = -1) => {
          lant.replaceChildren(...program.map((b, k) => {
            const c = h('button', { type: 'button', class: `mj-bloc${k === sel ? ' sel' : ''}${k === activ ? ' activ' : ''}`, 'aria-label': `Pas ${DIR[b.d].n}, de ${b.n} ori` }, h('span', {}, DIR[b.d].s), h('i', {}, `×${b.n}`));
            c.addEventListener('click', () => { if (ruleaza) return; sel = k; redesenez(); });
            return c;
          }), ...(program.length ? [] : [h('span', { class: 'mj-gol', 'aria-hidden': 'true' }, '👇')]));
          for (const b of nrBtns.children) b.classList.toggle('sel', sel >= 0 && program[sel] && Number(b.dataset.n) === program[sel].n);
        };
        for (let n = 1; n <= 6; n++) {
          const b = h('button', { type: 'button', class: 'mj-nr', 'data-n': String(n), 'aria-label': `De ${n} ori` }, String(n));
          b.addEventListener('click', () => { if (ruleaza || sel < 0) return; program[sel].n = n; sunet('click'); redesenez(); });
          nrBtns.append(b);
        }
        const sageti = h('div', { class: 'mj-sageti' }, DIR.map((d, i) => h('button', { type: 'button', class: 'mj-sageata', 'aria-label': `Adaugă pas ${d.n}`, onclick: () => {
          if (ruleaza || program.length >= MAXB) return;
          program.push({ d: i, n: 1 }); sel = program.length - 1; sunet('click'); redesenez();
        } }, d.s)));
        const sterge = h('button', { type: 'button', class: 'mj-btn alb', 'aria-label': 'Șterge blocul ales', onclick: () => { if (ruleaza || sel < 0) return; program.splice(sel, 1); sel = program.length - 1; redesenez(); } }, '🗑️');
        const reset = h('button', { type: 'button', class: 'mj-btn alb', 'aria-label': 'Șterge tot', onclick: () => { if (ruleaza) return; program = []; sel = -1; redesenez(); } }, '↺');
        const porneste = h('button', { type: 'button', class: 'mj-btn mare', 'aria-label': 'Pornește programul', onclick: () => ruleazaProg() }, '▶');
        const jos = h('div', { class: 'mj-jos' });
        const blocheaza = (b) => { for (const x of [...sageti.children, sterge, reset, porneste, ...nrBtns.children]) x.disabled = b; };
        const spune = (t, tip) => { mesaj.className = `mj-mesaj ${tip || ''}`.trim(); mesaj.textContent = t; vorbeste(t); };

        function resetare(txt) {
          ruleaza = false; blocheaza(false); poz = [...start];
          mere = new Set(); harta.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'A') mere.add(`${x},${y}`); }));
          pisica.classList.remove('lovit'); puneTot(); redesenez(); if (txt) spune(txt, 'rau');
        }
        function ruleazaProg() {
          if (!program.length) return spune('Pune întâi câteva blocuri.', 'rau');
          resetare(); ruleaza = true; blocheaza(true); mesaj.textContent = '';
          const pasi = program.flatMap((b, k) => Array(b.n).fill({ d: b.d, k }));
          let i = 0;
          const pas = () => {
            if (i >= pasi.length) {
              const acasa = harta[poz[1]][poz[0]] === 'H';
              if (acasa && !mere.size) return reusit();
              esecuri++; sunet('rau');
              return timer = setTimeout(() => resetare(!acasa ? 'Pisica nu a ajuns acasă. Încearcă din nou!' : 'Au rămas mere neadunate. Încearcă din nou!'), 600);
            }
            const p = pasi[i], d = DIR[p.d], nx = poz[0] + d.dx, ny = poz[1] + d.dy;
            redesenez(p.k);
            if (nx < 0 || ny < 0 || nx > 5 || ny > 4 || harta[ny][nx] === '#') {
              pisica.classList.add('lovit'); esecuri++; sunet('rau');
              return timer = setTimeout(() => resetare('Boing! Pisica a dat de un zid. Schimbă programul!'), 800);
            }
            poz = [nx, ny]; if (mere.delete(`${nx},${ny}`)) sunet('ok'); else sunet('click');
            puneTot(); i++; timer = setTimeout(pas, 420);
          };
          timer = setTimeout(pas, 300);
        }
        function reusit() {
          sunet('ok'); pisica.classList.add('sare');
          spune('Bravo! Pisica a ajuns acasă!', 'ok');
          const mai = h('button', { class: 'mj-btn mare', type: 'button', 'aria-label': 'Nivelul următor', onclick: () => { nivel++; incarca(); } }, '➜');
          jos.replaceChildren(mai); mai.focus();
        }
        ctx.zona.replaceChildren(cerinta, h('p', { class: 'mj-ajutor' }, `Harta ${nivel + 1} din ${HARTI.length} · cel mult ${MAXB} blocuri`),
          h('div', { class: 'mj-robot-zona' }, tabla,
            h('div', { class: 'mj-robot-comenzi' }, lant, h('p', { class: 'mj-ajutor' }, 'Alege cât de multe pași: ➜'), nrBtns, sageti, h('div', { class: 'mj-actiuni' }, sterge, reset, porneste))),
          mesaj, jos);
        puneTot(); redesenez();
      };
      incarca();
    },
  });

  // ---------- C. Studio de muzică ----------
  const NOTE = [880, 784, 659, 587, 523]; // sus → jos: la, sol, mi, re, do
  const CULORI = ['#7A3FB8', '#2F6FC4', '#1E9E5A', '#F29A1F', '#F21F4B'];
  const INSTR = [['🎹', 'sine'], ['🎻', 'triangle'], ['🎺', 'square'], ['🎸', 'sawtooth']];
  const EXEMPLU = [[4], [4], [1], [1], [0], [0], [1], []];
  const EXEMPLU_3 = [[2], [1], [0], [1], [2], [2], [2], []];
  jocuri.push({
    id: 'muzica', nume: 'Studio de muzică', emoji: '🎵', culoare: 'mj-t3', grup: 'mici',
    niveluri: 3, niv: ['3 note, compui liber', '5 note, compui liber', 'ascultă și copiază melodia'],
    desc: 'Atinge pătrățelele colorate și compune o melodie. Apoi ascult-o!',
    start(ctx) {
      const NV = ctx.nivel, PASI = 8, R = NV === 1 ? 3 : 5, OFF = 5 - R, PROVOCARE = NV === 3;
      const sel = Array.from({ length: PASI }, () => new Set());
      let instr = 0, tempo = 480, cant = false, pas = -1, timer = null, notePuse = 0, incercari = 0;
      const tinta = Array.from({ length: PASI }, (_, c) => (c < 6 ? [Math.floor(Math.random() * R)] : []));
      const cele = [];
      const frecv = (r) => NOTE[r + OFF];
      const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' }, PROVOCARE ? '' : 'Atinge pătrățelele ca să pui note.');
      const tabla = h('div', { class: 'mj-muzica', role: 'group', 'aria-label': 'Note muzicale' });
      for (let r = 0; r < R; r++) for (let c = 0; c < PASI; c++) {
        const b = h('button', { type: 'button', class: 'mj-nota', 'aria-label': `Nota ${r + 1}, pasul ${c + 1}`, 'aria-pressed': 'false' });
        b.style.setProperty('--n', CULORI[r + OFF]);
        b.addEventListener('click', () => {
          if (sel[c].has(r)) { sel[c].delete(r); b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
          else { sel[c].add(r); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); ton(frecv(r), 0.35, 0, INSTR[instr][1]); }
          notePuse = sel.reduce((s, x) => s + x.size, 0);
        });
        tabla.append(b); cele.push(b);
      }
      tabla.style.maxWidth = '640px';
      const coloana = (c) => Array.from({ length: R }, (_, r) => cele[r * PASI + c]);
      const opreste = () => { clearInterval(timer); cant = false; pas = -1; cele.forEach((b) => b.classList.remove('cur')); buton.textContent = '▶'; buton.setAttribute('aria-label', 'Ascultă melodia'); };
      const ruleaza = () => {
        if (cant) return opreste();
        cant = true; buton.textContent = '⏹'; buton.setAttribute('aria-label', 'Oprește'); let rulari = 0;
        const tic = () => {
          coloana(pas < 0 ? PASI - 1 : pas).forEach((b) => b.classList.remove('cur'));
          pas = (pas + 1) % PASI; if (pas === 0 && ++rulari > 3) return opreste();
          coloana(pas).forEach((b) => b.classList.add('cur'));
          for (const r of sel[pas]) ton(frecv(r), tempo / 1000 * 0.9, 0, INSTR[instr][1]);
          if (!PROVOCARE && notePuse >= 5 && !gata.isConnected) jos.replaceChildren(gata);
        };
        tic(); timer = setInterval(tic, tempo);
      };
      ctx.curata(() => clearInterval(timer));
      const buton = h('button', { type: 'button', class: 'mj-btn mare', 'aria-label': 'Ascultă melodia', onclick: ruleaza }, '▶');
      const gata = h('button', { type: 'button', class: 'mj-btn mare', 'aria-label': 'Am terminat melodia', onclick: () => { opreste(); ctx.gata(3, 'Ai compus o melodie! Muzica de pe calculator este făcută tot din note, pe care calculatorul le cântă în ordine.'); } }, '⭐ Gata!');
      const jos = h('div', { class: 'mj-jos' });
      const curataTabla = () => { sel.forEach((s) => s.clear()); cele.forEach((b) => { b.classList.remove('on', 'gresit'); b.setAttribute('aria-pressed', 'false'); }); notePuse = 0; };
      const instrBtns = INSTR.map(([e], k) => h('button', { type: 'button', class: `mj-nr${k === 0 ? ' sel' : ''}`, 'aria-label': 'Alege instrumentul', 'aria-pressed': String(k === 0), onclick: (ev) => { instr = k; for (const b of instrBtns) { b.classList.remove('sel'); b.setAttribute('aria-pressed', 'false'); } ev.currentTarget.classList.add('sel'); ev.currentTarget.setAttribute('aria-pressed', 'true'); ton(frecv(R - 1), 0.4, 0, INSTR[k][1]); } }, e));
      const tempoBtns = [['🐢', 600], ['🐇', 260]].map(([e, t], k) => h('button', { type: 'button', class: `mj-nr${k === 0 ? ' sel' : ''}`, 'aria-label': k ? 'Repede' : 'Încet', onclick: (ev) => { tempo = t; for (const b of tempoBtns) b.classList.remove('sel'); ev.currentTarget.classList.add('sel'); if (cant) { opreste(); ruleaza(); } } }, e));
      const sterge = h('button', { type: 'button', class: 'mj-btn alb', 'aria-label': 'Șterge tot', onclick: () => { opreste(); curataTabla(); } }, '🗑️');
      const cer = h('div', { class: 'mj-misiune' });
      let comenzi;
      if (!PROVOCARE) {
        const exemplu = h('button', { type: 'button', class: 'mj-btn alb', 'aria-label': 'Pune o melodie de exemplu', onclick: () => {
          opreste(); curataTabla();
          (NV === 1 ? EXEMPLU_3 : EXEMPLU).forEach((rows, c) => rows.forEach((r) => { sel[c].add(r); cele[r * PASI + c].classList.add('on'); cele[r * PASI + c].setAttribute('aria-pressed', 'true'); }));
          notePuse = sel.reduce((s, x) => s + x.size, 0);
        } }, '🎵 Exemplu');
        misiune(cer, ['👆', '🟪🟦🟩', '➜', '🎵'], 'Atinge pătrățelele colorate ca să faci o melodie. Apoi apasă butonul verde și ascult-o.');
        comenzi = h('div', { class: 'mj-actiuni' }, buton, h('div', { class: 'mj-numere' }, instrBtns), h('div', { class: 'mj-numere' }, tempoBtns), exemplu, sterge);
      } else {
        // Provocare: ascultă o melodie și o copiază pe tablă
        let ascultaTinta = null;
        const cantaTinta = () => {
          opreste(); let c = 0; clearInterval(ascultaTinta);
          ascultaTinta = setInterval(() => { if (c >= PASI) return clearInterval(ascultaTinta); for (const r of tinta[c]) ton(frecv(r), 0.5, 0, 'sine'); c++; }, 520);
        };
        ctx.curata(() => clearInterval(ascultaTinta));
        const asculta = h('button', { type: 'button', class: 'mj-btn mare', 'aria-label': 'Ascultă melodia de copiat', onclick: cantaTinta }, '🎧');
        const verifica = h('button', { type: 'button', class: 'mj-btn mare', 'aria-label': 'Verifică', onclick: () => {
          incercari++; opreste();
          let gresite = 0;
          for (let c = 0; c < PASI; c++) for (let r = 0; r < R; r++) {
            const trebuie = tinta[c].includes(r), are = sel[c].has(r);
            cele[r * PASI + c].classList.toggle('gresit', trebuie !== are); if (trebuie !== are) gresite++;
          }
          if (!gresite) return ctx.gata(incercari === 1 ? 3 : incercari === 2 ? 2 : 1, 'Ai copiat melodia exact! Calculatorul poate repeta sunetele la fel, de fiecare dată.');
          sunet('rau'); mesaj.className = 'mj-mesaj rau'; mesaj.textContent = `Mai sunt ${gresite} pătrățele greșite (cu margine roșie). Ascultă din nou!`; vorbeste('Mai ascultă o dată și corectează.');
        } }, '✔');
        misiune(cer, ['🎧', '➜', '👆', '🟪🟦🟩'], 'Ascultă melodia cu butonul cu căști, apoi pune notele pe tablă la fel. La final apasă bifa.');
        comenzi = h('div', { class: 'mj-actiuni' }, asculta, buton, verifica, sterge);
        setTimeout(cantaTinta, 1800);
      }
      ctx.zona.replaceChildren(cer, tabla, comenzi, mesaj, jos);
    },
  });
})();

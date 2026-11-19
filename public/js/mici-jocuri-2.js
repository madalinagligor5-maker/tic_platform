'use strict';
// Micii informaticieni – jocurile 6–9: robotelul Bit (algoritmi), modele, siguranță pe internet, pixeli.
(() => {
  if (!window.Mici) return;
  const { h, jocuri, shuffle, rand, alege, grila, runde, sunet, vorbeste, bAscultă } = window.Mici;

  // ---------- 6. Robotelul Bit: primul program ----------
  const NIVELE = [
    ['.....', '.....', 'R...*', '.....', '.....'],
    ['R....', '.....', '.....', '.....', '....*'],
    ['R.#.*', '..#..', '..#..', '..#..', '.....'],
    ['R....', '.###.', '.....', '.###.', '....*'],
    ['R#...', '.#.#.', '.#.#.', '.#.#.', '...#*'],
  ];
  const MIN = [4, 8, 12, 8, 16];
  const SAGETI = [{ s: '⬆️', dx: 0, dy: -1, n: 'sus' }, { s: '➡️', dx: 1, dy: 0, n: 'dreapta' }, { s: '⬇️', dx: 0, dy: 1, n: 'jos' }, { s: '⬅️', dx: -1, dy: 0, n: 'stânga' }];
  jocuri.push({
    id: 'robot', grup: 'mici', nume: 'Robotelul Bit', emoji: '🤖', culoare: 'mj-t6',
    desc: 'Scrie un program cu săgeți și du robotul la stea.',
    start(ctx) {
      let nivel = 0, esecuri = 0;
      let timer = null;
      ctx.curata(() => clearTimeout(timer));
      const incarca = () => {
        clearTimeout(timer);
        if (nivel >= NIVELE.length) return ctx.gata(esecuri <= 2 ? 3 : esecuri <= 6 ? 2 : 1);
        ctx.progres(nivel, NIVELE.length);
        const harta = NIVELE[nivel], limita = MIN[nivel] + 4;
        let start = [0, 0], tinta = [0, 0];
        harta.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'R') start = [x, y]; if (c === '*') tinta = [x, y]; }));
        let pozitie = [...start], program = [], ruleaza = false;
        const celule = harta.map((r, y) => [...r].map((c, x) => h('div', { class: `mj-celula${c === '#' ? ' zid' : ''}` }, c === '#' ? '🪨' : (x === tinta[0] && y === tinta[1] ? '⭐' : ''))));
        const tabla = h('div', { class: 'mj-robot-tabla', role: 'img', 'aria-label': `Harta nivelului ${nivel + 1}: robotul 🤖 trebuie să ajungă la stea ⭐` }, celule.flat());
        const robot = h('span', { class: 'mj-robot', 'aria-hidden': 'true' }, '🤖');
        const puneRobot = () => celule[pozitie[1]][pozitie[0]].append(robot);
        const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' }, 'Apasă săgețile ca să scrii programul, apoi apasă ▶ Pornește.');
        const strip = h('div', { class: 'mj-program', 'aria-label': 'Programul tău' });
        const deseneazaProgram = (activ = -1) => {
          strip.replaceChildren(...Array.from({ length: limita }, (_, k) => h('span', { class: `mj-slot${k === activ ? ' activ' : ''}${program[k] != null ? ' plin' : ''}` }, program[k] != null ? SAGETI[program[k]].s : '')));
        };
        const butoane = [];
        const blocheaza = (b) => butoane.forEach((x) => { x.disabled = b; });
        const adauga = (d) => { if (ruleaza || program.length >= limita) return; program.push(d); sunet('click'); deseneazaProgram(); };
        const taste = SAGETI.map((sg, d) => { const b = h('button', { type: 'button', class: 'mj-sageata', 'aria-label': `Pas ${sg.n}`, onclick: () => adauga(d) }, sg.s); butoane.push(b); return b; });
        const sterge1 = h('button', { type: 'button', class: 'mj-btn alb', onclick: () => { if (!ruleaza) { program.pop(); deseneazaProgram(); } } }, '⌫ Șterge ultimul');
        const stergeTot = h('button', { type: 'button', class: 'mj-btn alb', onclick: () => { if (!ruleaza) { program = []; deseneazaProgram(); } } }, '🗑️ Șterge tot');
        const porneste = h('button', { type: 'button', class: 'mj-btn mare', onclick: () => ruleazaProgram() }, '▶ Pornește');
        butoane.push(sterge1, stergeTot, porneste);

        function resetare(txt) {
          ruleaza = false; blocheaza(false);
          pozitie = [...start]; puneRobot(); robot.classList.remove('lovit'); deseneazaProgram();
          if (txt) { mesaj.className = 'mj-mesaj rau'; mesaj.textContent = txt; }
        }
        function ruleazaProgram() {
          if (ruleaza) return;
          if (!program.length) { mesaj.className = 'mj-mesaj rau'; mesaj.textContent = 'Mai întâi scrie programul cu săgeți!'; return; }
          ruleaza = true; blocheaza(true); pozitie = [...start]; puneRobot();
          mesaj.className = 'mj-mesaj'; mesaj.textContent = 'Robotul execută programul…';
          let k = 0;
          const pas = () => {
            if (k >= program.length) {
              if (pozitie[0] === tinta[0] && pozitie[1] === tinta[1]) return reusit();
              esecuri++; sunet('rau');
              return timer = setTimeout(() => resetare('Robotul nu a ajuns la stea. Corectează programul și încearcă din nou!'), 700);
            }
            deseneazaProgram(k);
            const sg = SAGETI[program[k]], nx = pozitie[0] + sg.dx, ny = pozitie[1] + sg.dy;
            if (nx < 0 || ny < 0 || nx > 4 || ny > 4 || harta[ny][nx] === '#') {
              robot.classList.add('lovit'); esecuri++; sunet('rau');
              return timer = setTimeout(() => resetare('Boing! Robotul a dat de un zid. Schimbă programul și încearcă din nou!'), 900);
            }
            pozitie = [nx, ny]; puneRobot(); sunet('click'); k++;
            timer = setTimeout(pas, 480);
          };
          timer = setTimeout(pas, 300);
        }
        function reusit() {
          sunet('ok'); ruleaza = true; robot.classList.add('sare');
          mesaj.className = 'mj-mesaj ok'; mesaj.textContent = `✔ Bravo! Programul tău are ${program.length} ${program.length === 1 ? 'pas' : 'pași'}. Un program este un șir de pași pe care calculatorul îi urmează exact.`;
          const mai = h('button', { class: 'mj-btn mare', type: 'button', onclick: () => { nivel++; incarca(); } }, nivel + 1 >= NIVELE.length ? 'Gata! ➜' : 'Nivelul următor ➜');
          jos.replaceChildren(mai); mai.focus();
        }
        const jos = h('div', { class: 'mj-jos' });
        ctx.zona.replaceChildren(
          h('p', { class: 'mj-mare' }, `Nivelul ${nivel + 1} din ${NIVELE.length}: du robotul 🤖 la stea ⭐`),
          h('div', { class: 'mj-robot-zona' }, tabla,
            h('div', { class: 'mj-robot-comenzi' }, h('p', { class: 'mj-ajutor' }, `Program (cel mult ${limita} pași):`), strip,
              h('div', { class: 'mj-sageti' }, taste), h('div', { class: 'mj-actiuni' }, sterge1, stergeTot), porneste)),
          mesaj, jos);
        puneRobot(); deseneazaProgram();
        vorbeste('Du robotul la stea. Scrie programul cu săgeți.');
      };
      incarca();
    },
  });

  // ---------- 7. Ce urmează? (modele) ----------
  const GRUPE = [['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'], ['⭐', '❤️', '🍎', '🐱', '🚗', '🌸'], ['🔺', '🟦', '⚪', '🔶', '⬛', '🟩']];
  const SABLOANE = ['AB', 'AB', 'ABC', 'AAB', 'ABB', 'ABC'];
  function rundaModel(i) {
    if (i >= 6) {
      const d = [1, 2, 5, 10, 3][rand(0, 4)], s = rand(1, 12), arata = [0, 1, 2, 3].map((k) => s + d * k), ras = s + d * 4;
      const opt = new Set([ras]);
      for (const x of shuffle([ras + d, ras - d, ras + 1, ras - 1, ras + 2])) if (opt.size < 4 && x > 0) opt.add(x);
      return { seq: arata.map(String), ras: String(ras), opt: [...opt].map(String), num: true, d };
    }
    const grup = GRUPE[rand(0, GRUPE.length - 1)], sablon = SABLOANE[i];
    const simb = alege(grup, [...new Set(sablon)].length + 1), map = {};
    [...new Set(sablon)].forEach((l, k) => { map[l] = simb[k]; });
    const afisate = sablon.length * 2 + rand(0, sablon.length - 1);
    const seq = Array.from({ length: afisate }, (_, k) => map[sablon[k % sablon.length]]);
    const ras = map[sablon[afisate % sablon.length]];
    const opt = new Set([ras, ...Object.values(map), simb[simb.length - 1]]);
    return { seq, ras, opt: [...opt].slice(0, 4) };
  }
  jocuri.push({
    id: 'modele', grup: 'mici', nume: 'Ce urmează?', emoji: '🧩', culoare: 'mj-t7',
    desc: 'Descoperă regula șirului și continuă-l, ca un program.',
    start(ctx) {
      const date = Array.from({ length: 9 }, (_, i) => rundaModel(i));
      runde(ctx, 9, (i, el, rasp) => {
        const r = date[i];
        const intreb = r.num ? 'Ce număr urmează?' : 'Ce urmează?';
        el.append(
          h('div', { class: 'mj-intrebare' }, h('p', { class: 'mj-mare' }, intreb), bAscultă(intreb)),
          h('div', { class: 'mj-sir' }, [...r.seq.map((x) => h('span', { class: 'mj-elem' }, x)), h('span', { class: 'mj-elem gol' }, '❓')]),
          grila(shuffle(r.opt).map((x) => ({ c: h('span', { class: 'mj-elem mic' }, x), ok: x === r.ras, eticheta: x })), { corect: () => rasp.corect(r.num ? `Regula: de fiecare dată adaugi ${r.d}.` : 'Ai găsit regula șirului!'), gresit: () => rasp.gresit('Privește bine: ce se repetă?') }));
        vorbeste(intreb);
      }, { auto: 1500 });
    },
  });

  // ---------- 8. Semaforul siguranței ----------
  const SIT = [
    { e: '🔑', t: 'Un prieten nou de pe internet îți cere parola.', ok: false, ex: 'Parola este secretă. Nu o spunem nimănui, doar părinților.' },
    { e: '👨‍👩‍👧', t: 'Ceri voie unui adult înainte să te joci online.', ok: true, ex: 'Corect! Adultul te ajută să alegi jocuri potrivite.' },
    { e: '🎁', t: 'Un străin îți scrie: „Ai câștigat un premiu! Dă-mi adresa ta.”', ok: false, ex: 'Nu dăm adresa străinilor. Spune imediat unui adult.' },
    { e: '📺', t: 'Te uiți la desene potrivite vârstei tale.', ok: true, ex: 'Corect! Alegem doar ce este pentru vârsta noastră.' },
    { e: '🪟', t: 'Pe ecran apare o reclamă care sare și te cheamă să apeși.', ok: false, ex: 'Nu apăsăm pe reclame necunoscute. Poate fi o capcană.' },
    { e: '🗣️', t: 'Spui unui adult când ceva te sperie pe internet.', ok: true, ex: 'Corect! Adulții te pot proteja.' },
    { e: '🏠', t: 'Pui pe internet o poză cu adresa casei tale.', ok: false, ex: 'Adresa este o informație personală. O ținem pentru noi.' },
    { e: '⚽', t: 'Faci pauze de la ecran și te joci și afară.', ok: true, ex: 'Corect! Ochii și corpul au nevoie de pauze.' },
    { e: '🙂', t: 'Ești politicos cu ceilalți când scrii mesaje.', ok: true, ex: 'Corect! Scrim frumos, la fel cum vorbim.' },
    { e: '📧', t: 'Deschizi un fișier trimis de cineva pe care nu-l cunoști.', ok: false, ex: 'Fișierele de la necunoscuți pot ascunde viruși. Nu le deschidem.' },
  ];
  jocuri.push({
    id: 'siguranta', grup: 'citesc', nume: 'Semaforul siguranței', emoji: '🚦', culoare: 'mj-t8',
    desc: 'Este în siguranță sau trebuie să te oprești?',
    start(ctx) {
      const lista = alege(SIT, 8);
      runde(ctx, lista.length, (i, el, rasp) => {
        const s = lista[i];
        el.append(
          h('div', { class: 'mj-intrebare' }, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, s.e), h('p', { class: 'mj-mare' }, s.t), bAscultă(s.t)),
          grila([
            { c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '🟢'), h('br'), 'Da, este în siguranță'), ok: s.ok, eticheta: 'Da, este în siguranță' },
            { c: h('span', {}, h('span', { class: 'mj-imens', 'aria-hidden': 'true' }, '🔴'), h('br'), 'Nu, mă opresc!'), ok: !s.ok, eticheta: 'Nu, mă opresc' },
          ], { corect: () => rasp.corect(s.ex), gresit: () => rasp.gresit('Gândește-te din nou: este sigur?') }, 'doua'));
        vorbeste(s.t);
      });
    },
  });

  // ---------- 9. Pixeli ----------
  const CULORI = ['#FFFFFF', '#171416', '#F21F4B', '#F29A1F', '#FFD23F', '#2FBF71', '#3EC6E0', '#7A3FB8'];
  const NUME_CULORI = ['alb', 'negru', 'roșu', 'portocaliu', 'galben', 'verde', 'albastru', 'mov'];
  const MODELE = [
    { nume: 'Inimă', g: ['00000000', '02200220', '22222222', '22222222', '02222220', '00222200', '00022000', '00000000'] },
    { nume: 'Față zâmbitoare', g: ['00444400', '04444440', '44144144', '44444444', '41444414', '44111144', '04444440', '00444400'] },
    { nume: 'Căsuță', g: ['00022000', '00222200', '02222220', '22222222', '03333330', '03633630', '03633330', '03633330'] },
    { nume: 'Pom', g: ['00055000', '00555500', '05555550', '55555555', '05555550', '00033000', '00033000', '00033000'] },
  ];
  jocuri.push({
    id: 'pixeli', grup: 'mici', nume: 'Desenează cu pixeli', emoji: '🎨', culoare: 'mj-t9',
    desc: 'Imaginile de pe ecran sunt făcute din pătrățele. Copiază modelul!',
    start(ctx) {
      const model = MODELE[rand(0, MODELE.length - 1)];
      let culoare = 2, atingeri = 0, liber = false, apasat = false;
      const val = Array(64).fill(0);
      const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' }, 'Pătrățelele de pe ecran se numesc pixeli. Alege o culoare și colorează.');
      const celule = val.map((_, k) => h('button', { type: 'button', class: 'mj-px', 'data-i': String(k), 'aria-label': `Pătrățelul ${Math.floor(k / 8) + 1}, ${(k % 8) + 1}` }));
      const coloreaza = (k) => { val[k] = culoare; celule[k].style.backgroundColor = CULORI[culoare]; celule[k].classList.remove('gresit'); };
      const grila8 = h('div', { class: 'mj-px-grila' }, celule);
      celule.forEach((c) => { c.style.backgroundColor = CULORI[0]; });
      const pe = (e) => { const t = document.elementFromPoint(e.clientX, e.clientY); const k = t?.dataset?.i; if (k != null) coloreaza(Number(k)); };
      grila8.addEventListener('pointerdown', (e) => { apasat = true; pe(e); });
      grila8.addEventListener('pointermove', (e) => { if (apasat) pe(e); });
      const lasa = () => { apasat = false; };
      document.addEventListener('pointerup', lasa); ctx.curata(() => document.removeEventListener('pointerup', lasa));
      grila8.addEventListener('click', (e) => { if (e.detail === 0 && e.target.dataset?.i != null) coloreaza(Number(e.target.dataset.i)); });
      const paleta = h('div', { class: 'mj-paleta', role: 'group', 'aria-label': 'Culori' }, CULORI.map((c, k) => {
        const b = h('button', { type: 'button', class: `mj-culoare${k === culoare ? ' sel' : ''}`, 'aria-label': NUME_CULORI[k], 'aria-pressed': String(k === culoare) });
        b.style.backgroundColor = c;
        b.addEventListener('click', () => { culoare = k; for (const x of paleta.children) { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); } b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); });
        return b;
      }));
      const modelEl = h('div', { class: 'mj-px-grila mic', role: 'img', 'aria-label': `Modelul: ${model.nume}` }, model.g.join('').split('').map((c) => { const d = h('span', { class: 'mj-px' }); d.style.backgroundColor = CULORI[Number(c)]; return d; }));
      const verifica = h('button', { type: 'button', class: 'mj-btn mare', onclick: () => {
        atingeri++;
        const tinta = model.g.join('').split('').map(Number);
        const gresite = tinta.map((t, k) => (t === val[k] ? -1 : k)).filter((k) => k >= 0);
        celule.forEach((c) => c.classList.remove('gresit'));
        if (!gresite.length) return ctx.gata(atingeri === 1 ? 3 : atingeri === 2 ? 2 : 1, 'Desenul tău este la fel ca modelul! Așa se fac imaginile pe calculator: din pixeli colorați.');
        gresite.forEach((k) => celule[k].classList.add('gresit')); sunet('rau');
        mesaj.className = 'mj-mesaj rau'; mesaj.textContent = `Mai ai ${gresite.length} ${gresite.length === 1 ? 'pătrățel greșit' : 'pătrățele greșite'} (marcate cu roșu).`;
      } }, '✔ Verifică');
      const sterge = h('button', { type: 'button', class: 'mj-btn alb', onclick: () => { val.fill(0); celule.forEach((c) => { c.style.backgroundColor = CULORI[0]; c.classList.remove('gresit'); }); } }, '🗑️ Șterge tot');
      const salveaza = h('button', { type: 'button', class: 'mj-btn alb', onclick: () => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 320;
        const g = cv.getContext('2d');
        val.forEach((c, k) => { g.fillStyle = CULORI[c]; g.fillRect((k % 8) * 40, Math.floor(k / 8) * 40, 40, 40); });
        const a = h('a', { href: cv.toDataURL('image/png'), download: 'desenul-meu.png' }); a.click();
      } }, '💾 Salvează desenul');
      const mod = h('button', { type: 'button', class: 'mj-btn alb', 'aria-pressed': 'false' }, '✏️ Desen liber');
      mod.addEventListener('click', () => {
        liber = !liber; mod.setAttribute('aria-pressed', String(liber));
        mod.textContent = liber ? '🎯 Copiază modelul' : '✏️ Desen liber';
        modelBloc.hidden = liber; verifica.hidden = liber; salveaza.hidden = !liber;
        mesaj.className = 'mj-mesaj'; mesaj.textContent = liber ? 'Desenează ce vrei tu! Apoi salvează desenul.' : 'Copiază modelul cât mai exact.';
      });
      const modelBloc = h('div', { class: 'mj-model' }, h('p', { class: 'mj-ajutor' }, `Model: ${model.nume}`), modelEl);
      salveaza.hidden = true;
      ctx.zona.replaceChildren(
        h('p', { class: 'mj-mare' }, 'Copiază modelul, pătrățel cu pătrățel!'),
        h('div', { class: 'mj-px-zona' }, modelBloc, h('div', {}, h('p', { class: 'mj-ajutor' }, 'Desenul tău:'), grila8)),
        paleta, h('div', { class: 'mj-actiuni' }, verifica, salveaza, sterge, mod), mesaj);
      vorbeste('Copiază modelul, pătrățel cu pătrățel.');
    },
  });
})();

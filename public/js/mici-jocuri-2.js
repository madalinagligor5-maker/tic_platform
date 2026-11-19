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
  const NIVELE_3 = [['R..#.', '.#.#.', '.#...', '.####', '....*'], ['R.#..', '..#..', '.##..', '....#', '#.*..'], ['R#...', '.#.#.', '...#.', '.###.', '....*'], ['R...#', '###.#', '.....', '.####', '*....'], ['R.#.*', '.##.#', '.....', '.#.#.', '.#...']];
  const MIN_3 = [8, 6, 8, 10, 8];
  const SAGETI = [{ s: '⬆️', dx: 0, dy: -1, n: 'sus' }, { s: '➡️', dx: 1, dy: 0, n: 'dreapta' }, { s: '⬇️', dx: 0, dy: 1, n: 'jos' }, { s: '⬅️', dx: -1, dy: 0, n: 'stânga' }];
  jocuri.push({
    id: 'robot', grup: 'mici', nume: 'Robotelul Bit', emoji: '🤖', culoare: 'mj-t6',
    niveluri: 3, niv: ['3 hărți ușoare', '5 hărți cu ziduri', '5 labirinturi, cu pași puțini'],
    desc: 'Scrie un program cu săgeți și du robotul la stea.',
    start(ctx) {
      const NV = ctx.nivel;
      const HARTI = NV === 3 ? NIVELE_3 : NV === 1 ? NIVELE.slice(0, 3) : NIVELE, MINIME = NV === 3 ? MIN_3 : MIN;
      let nivel = 0, esecuri = 0;
      let timer = null;
      ctx.curata(() => clearTimeout(timer));
      const incarca = () => {
        clearTimeout(timer);
        if (nivel >= HARTI.length) return ctx.gata(esecuri <= 2 ? 3 : esecuri <= 6 ? 2 : 1);
        ctx.progres(nivel, HARTI.length);
        const harta = HARTI[nivel], limita = MINIME[nivel] + (NV === 3 ? 2 : 4);
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
          const mai = h('button', { class: 'mj-btn mare', type: 'button', onclick: () => { nivel++; incarca(); } }, nivel + 1 >= HARTI.length ? 'Gata! ➜' : 'Nivelul următor ➜');
          jos.replaceChildren(mai); mai.focus();
        }
        const jos = h('div', { class: 'mj-jos' });
        ctx.zona.replaceChildren(
          h('p', { class: 'mj-mare' }, `Harta ${nivel + 1} din ${HARTI.length}: du robotul 🤖 la stea ⭐`),
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
  const SABLOANE_N = [['AB', 'AB', 'AAB', 'ABB'], ['AB', 'AB', 'ABC', 'AAB', 'ABB', 'ABC'], ['ABC', 'AABB', 'ABAC', 'ABCD', 'AABC', 'ABCB']];
  const NUMERE_N = [['plus', 'plus'], ['plus', 'plus', 'plus'], ['plus', 'minus', 'dublu', 'plus']];
  function rundaModel(i, nv) {
    const sab = SABLOANE_N[nv - 1], nums = NUMERE_N[nv - 1];
    if (i >= sab.length) {
      const tip = nums[i - sab.length];
      let seq, ras, d = 1, opt;
      if (tip === 'minus') { d = [2, 3, 5][rand(0, 2)]; const st = rand(30, 60); seq = [0, 1, 2, 3].map((k) => st - d * k); ras = st - d * 4; opt = [ras, ras + d, ras - d, ras + 1]; }
      else if (tip === 'dublu') { const st = rand(1, 3); seq = [0, 1, 2, 3].map((k) => st * 2 ** k); ras = st * 16; opt = [ras, ras / 2, ras * 2, ras + st]; }
      else { d = nv === 3 ? [3, 5, 10, 4][rand(0, 3)] : nv === 1 ? [1, 2][rand(0, 1)] : [1, 2, 5, 10, 3][rand(0, 4)]; const st = rand(1, nv === 1 ? 5 : 12); seq = [0, 1, 2, 3].map((k) => st + d * k); ras = st + d * 4; opt = [ras, ras + d, ras - d, ras + 1]; }
      const uniq = [...new Set(opt.filter((x) => x > 0))];
      return { seq: seq.map(String), ras: String(ras), opt: uniq.slice(0, 4).map(String), num: true, d, tip };
    }
    const grup = GRUPE[rand(0, GRUPE.length - 1)], sablon = sab[i];
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
    niveluri: 3, niv: ['șiruri simple', 'șiruri cu 3 elemente și numere', 'reguli ascunse, numere care scad și se dublează'],
    desc: 'Descoperă regula șirului și continuă-l, ca un program.',
    start(ctx) {
      const NV = ctx.nivel, NR = SABLOANE_N[NV - 1].length + NUMERE_N[NV - 1].length;
      const date = Array.from({ length: NR }, (_, i) => rundaModel(i, NV));
      runde(ctx, NR, (i, el, rasp) => {
        const r = date[i];
        const intreb = r.num ? 'Ce număr urmează?' : 'Ce urmează?';
        el.append(
          h('div', { class: 'mj-intrebare' }, h('p', { class: 'mj-mare' }, intreb), bAscultă(intreb)),
          h('div', { class: 'mj-sir' }, [...r.seq.map((x) => h('span', { class: 'mj-elem' }, x)), h('span', { class: 'mj-elem gol' }, '❓')]),
          grila(shuffle(r.opt).map((x) => ({ c: h('span', { class: 'mj-elem mic' }, x), ok: x === r.ras, eticheta: x })), { corect: () => rasp.corect(r.num ? (r.tip === 'minus' ? `Regula: de fiecare dată scazi ${r.d}.` : r.tip === 'dublu' ? 'Regula: de fiecare dată numărul se dublează.' : `Regula: de fiecare dată adaugi ${r.d}.`) : 'Ai găsit regula șirului!'), gresit: () => rasp.gresit('Privește bine: ce se repetă?') }));
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
    { e: '🔒', t: 'Alegi o parolă lungă, cu litere, cifre și semne.', ok: true, ex: 'Corect! Parola lungă este mai greu de ghicit.' },
    { e: '🤝', t: 'Un coleg te roagă să-i împrumuți contul tău de joc.', ok: false, ex: 'Contul tău este doar al tău. Nu îl împrumuți.' },
    { e: '📍', t: 'Un joc îți cere să-i spui mereu unde ești chiar acum.', ok: false, ex: 'Locul unde ești este informație personală. Întreabă un adult.' },
    { e: '🛑', t: 'Te oprești și întrebi un adult când nu știi ce să faci.', ok: true, ex: 'Corect! Întrebarea este o idee bună.' },
    { e: '📧', t: 'Deschizi un fișier trimis de cineva pe care nu-l cunoști.', ok: false, ex: 'Fișierele de la necunoscuți pot ascunde viruși. Nu le deschidem.' },
  ];
  jocuri.push({
    id: 'siguranta', grup: 'citesc', nume: 'Semaforul siguranței', emoji: '🚦', culoare: 'mj-t8',
    niveluri: 3, niv: ['6 situații', '8 situații', '12 situații'],
    desc: 'Este în siguranță sau trebuie să te oprești?',
    start(ctx) {
      const lista = alege(SIT, [6, 8, 12][ctx.nivel - 1]);
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
  const MODELE_5 = [
    { nume: 'Inimă', g: ['02020', '22222', '22222', '02220', '00200'] },
    { nume: 'Soare', g: ['40404', '04440', '44444', '04440', '40404'] },
    { nume: 'Căsuță', g: ['00200', '02220', '22222', '03633', '03633'] },
  ];
  jocuri.push({
    id: 'pixeli', grup: 'mici', nume: 'Desenează cu pixeli', emoji: '🎨', culoare: 'mj-t9',
    niveluri: 3, niv: ['5 × 5 pătrățele', '8 × 8 pătrățele', '8 × 8 și modelul dispare'],
    desc: 'Imaginile de pe ecran sunt făcute din pătrățele. Copiază modelul!',
    start(ctx) {
      const NV = ctx.nivel, S = NV === 1 ? 5 : 8;
      const lista = NV === 1 ? MODELE_5 : MODELE;
      const model = lista[rand(0, lista.length - 1)];
      let culoare = 2, atingeri = 0, liber = false, apasat = false;
      const val = Array(S * S).fill(0);
      const mesaj = h('p', { class: 'mj-mesaj', role: 'status', 'aria-live': 'polite' }, 'Pătrățelele de pe ecran se numesc pixeli. Alege o culoare și colorează.');
      const celule = val.map((_, k) => h('button', { type: 'button', class: 'mj-px', 'data-i': String(k), 'aria-label': `Pătrățelul ${Math.floor(k / S) + 1}, ${(k % S) + 1}` }));
      const coloreaza = (k) => { val[k] = culoare; celule[k].style.backgroundColor = CULORI[culoare]; celule[k].classList.remove('gresit'); };
      const grila8 = h('div', { class: 'mj-px-grila' }, celule);
      grila8.style.gridTemplateColumns = `repeat(${S}, 1fr)`;
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
      modelEl.style.gridTemplateColumns = `repeat(${S}, 1fr)`;
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
        const cv = document.createElement('canvas'); cv.width = cv.height = 320; const pas = 320 / S;
        const g = cv.getContext('2d');
        val.forEach((c, k) => { g.fillStyle = CULORI[c]; g.fillRect((k % S) * pas, Math.floor(k / S) * pas, pas, pas); });
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
      if (NV === 3) {
        let t = null, ochi = null;
        const arata = (ms, cost) => { clearTimeout(t); modelEl.classList.remove('ascuns'); atingeri += cost; t = setTimeout(() => modelEl.classList.add('ascuns'), ms); };
        ctx.curata(() => clearTimeout(t));
        ochi = h('button', { type: 'button', class: 'mj-btn mic alb', 'aria-label': 'Arată modelul încă o dată', onclick: () => arata(3000, 1) }, '👁️ Arată din nou');
        modelBloc.append(ochi);
        arata(9000, 0);
        mesaj.textContent = 'Memorează modelul: dispare în câteva secunde!';
      }
      salveaza.hidden = true;
      ctx.zona.replaceChildren(
        h('p', { class: 'mj-mare' }, 'Copiază modelul, pătrățel cu pătrățel!'),
        h('div', { class: 'mj-px-zona' }, modelBloc, h('div', {}, h('p', { class: 'mj-ajutor' }, 'Desenul tău:'), grila8)),
        paleta, h('div', { class: 'mj-actiuni' }, verifica, salveaza, sterge, mod), mesaj);
      vorbeste('Copiază modelul, pătrățel cu pătrățel.');
    },
  });
})();

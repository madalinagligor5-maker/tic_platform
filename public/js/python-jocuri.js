'use strict';
// Sala de jocuri Python (#/python/jocuri): robot programat în Python, ordonează liniile, găsește greșeala,
// „Ce afișează?” (Blitz) și completează codul. Programele rulează în interpretorul din Editorul Python.
(() => {
  if (!window.EduApp || !window.PyAcad || !window.PyJocuri) return;
  const { h, routes } = window.EduApp;
  const { ruleaza, verifica, evid, codBloc, inl, antet, pagina, editor, P, salveaza, norm } = window.PyAcad;
  const { NIVELE_ROBOT, preludiuRobot, EPILOG_ROBOT, RANDURI_PRELUDIU, ORDONARE, BUGURI, BLITZ, COMPLETARE } = window.PyJocuri;
  P.jocuri = P.jocuri || {}; P.blitz = P.blitz || {};

  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const NIV = ['🌱', '🌿', '🌳'], NUME_NIV = ['Ușor', 'Mediu', 'Greu'];
  const stele = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const steleDe = (c) => P.jocuri[c] || 0;
  // Salvează stelele unui nivel; la prima reușită se primesc puncte XP.
  function dauStele(cheie, n, xp) {
    const veche = steleDe(cheie);
    if (n > veche) { P.jocuri[cheie] = n; if (!veche) P.xp += xp; salveaza(); }
  }

  // ---------- Curățare la plecare (cronometre, ascultători) ----------
  let curata = [];
  const ruleazaCuratarea = () => { const f = curata; curata = []; f.forEach((fn) => { try { fn(); } catch { /* ignorat */ } }); };
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/python/jocuri')) ruleazaCuratarea(); });

  // ---------- Pagina cu jocurile ----------
  const JOCURI = [
    { id: 'robot', nume: 'Robotul Python', emoji: '🤖', culoare: '#3776AB', niveluri: NIVELE_ROBOT.length, tip: 'hărți', xp: 8, desc: 'Programezi un robot în Python adevărat: for, while, if și funcții, ca să culeagă stele și să ajungă la țintă.' },
    { id: 'ordonare', nume: 'Ordonează liniile', emoji: '🧩', culoare: '#7A3FB8', niveluri: 3, tip: 'niveluri', xp: 10, desc: 'Liniile unui program sunt amestecate. Pune-le în ordine, ca programul să funcționeze. Atenție la liniile în plus!' },
    { id: 'greseala', nume: 'Găsește greșeala', emoji: '🐞', culoare: '#D6334A', niveluri: 3, tip: 'niveluri', xp: 10, desc: 'Programul are un bug. Găsește rândul greșit și alege reparația corectă.' },
    { id: 'blitz', nume: 'Blitz: ce afișează?', emoji: '⚡', culoare: '#E2711D', niveluri: 3, tip: 'niveluri', xp: 10, desc: 'Citește codul și alege repede ce afișează. Ai timp limitat și 3 vieți!' },
    { id: 'completare', nume: 'Completează codul', emoji: '✍️', culoare: '#1E9E5A', niveluri: 3, tip: 'niveluri', xp: 10, desc: 'Din program lipsesc bucăți. Alege din liste ce se potrivește, apoi vezi dacă merge.' },
  ];
  const steleJoc = (j) => Array.from({ length: j.niveluri }, (_, i) => steleDe(`${j.id}:${i + 1}`)).reduce((a, b) => a + b, 0);

  function hub() {
    document.title = 'Jocuri Python – edudigi';
    pagina(
      antet('Sala de jocuri Python', 'Jocuri mai complexe, în care scrii, citești și repari cod adevărat. Fiecare nivel dă stele și puncte de experiență.', [{ t: 'Jocuri' }]),
      h('div', { class: 'pyj-hub' }, JOCURI.map((j) => {
        const c = h('a', { class: 'pyj-card', href: `#/python/jocuri/${j.id}` },
          h('span', { class: 'pyj-card-top', 'aria-hidden': 'true' }, h('span', { class: 'pyj-card-e' }, j.emoji)),
          h('span', { class: 'pyj-card-body' }, h('b', {}, j.nume), h('span', { class: 'pyj-card-d' }, j.desc),
            h('span', { class: 'pyj-card-s', 'aria-label': `${steleJoc(j)} din ${j.niveluri * 3} stele` }, `⭐ ${steleJoc(j)} / ${j.niveluri * 3}`),
            h('span', { class: 'pyj-joaca' }, 'Joacă ▶')));
        c.style.setProperty('--c', j.culoare); return c;
      })));
  }

  // ---------- Alegerea nivelului ----------
  function alegeNivel(j) {
    ruleazaCuratarea();
    document.title = `${j.nume} – Python – edudigi`;
    const lista = j.id === 'robot'
      ? NIVELE_ROBOT.map((n) => ({ n: n.id, titlu: n.titlu, sub: n.concept, emoji: String(n.id) }))
      : [1, 2, 3].map((n) => ({ n, titlu: `Nivelul ${n}`, sub: NUME_NIV[n - 1], emoji: NIV[n - 1] }));
    pagina(
      antet(`${j.emoji} ${j.nume}`, j.desc, [{ t: 'Jocuri', href: '#/python/jocuri' }, { t: j.nume }]),
      h('div', { class: 'pyj-niveluri' }, lista.map((x) => {
        const deblocat = x.n === 1 || steleDe(`${j.id}:${x.n - 1}`) >= 1;
        const cont = [h('span', { class: 'pyj-niv-e', 'aria-hidden': 'true' }, deblocat ? x.emoji : '🔒'), h('b', {}, x.titlu), h('span', { class: 'pyj-niv-sub' }, x.sub), h('span', { class: 'pyj-niv-st', 'aria-label': `${steleDe(`${j.id}:${x.n}`)} din 3 stele` }, stele(steleDe(`${j.id}:${x.n}`)))];
        const el = deblocat ? h('a', { class: 'pyj-niv', href: `#/python/jocuri/${j.id}/${x.n}` }, cont) : h('div', { class: 'pyj-niv blocat', 'aria-disabled': 'true' }, cont);
        el.style.setProperty('--c', j.culoare); return el;
      })),
      h('p', { class: 'pya-subsol' }, 'Un nivel se deschide după ce câștigi cel puțin o stea la cel dinainte.'));
  }

  // ---------- Final de nivel (comun) ----------
  function final(j, n, st, mesaj) {
    dauStele(`${j.id}:${n}`, st, j.xp);
    const urm = n < j.niveluri;
    return h('div', { class: 'pyj-final' },
      h('div', { class: 'pyj-trofeu', 'aria-hidden': 'true' }, st === 3 ? '🏆' : '🎉'),
      h('h2', {}, st === 3 ? 'Excelent!' : 'Bravo!'),
      h('p', { class: 'pyj-stele-mari', 'aria-label': `${st} din 3 stele` }, stele(st)),
      h('p', {}, mesaj),
      h('div', { class: 'pya-actiuni' },
        urm && st >= 1 ? h('a', { class: 'pya-btn verde mare', href: `#/python/jocuri/${j.id}/${n + 1}` }, `Nivelul următor ▶`) : null,
        h('a', { class: 'pya-btn alb', href: `#/python/jocuri/${j.id}/${n}`, onclick: () => setTimeout(() => window.dispatchEvent(new Event('hashchange')), 0) }, '↺ Mai joc'),
        h('a', { class: 'pya-btn alb', href: `#/python/jocuri/${j.id}` }, 'Niveluri')));
  }

  // ---------- Comparație intrare / așteptat / primit ----------
  const compara = (g) => h('div', { class: 'pya-comp' },
    h('div', {}, h('b', {}, 'Date de intrare'), h('pre', {}, g.i.trim() === '' ? '(nu se citește nimic)' : g.i.replace(/\n$/, ''))),
    h('div', {}, h('b', {}, 'Ar trebui să afișeze'), h('pre', {}, g.o.replace(/\n$/, ''))),
    h('div', {}, h('b', {}, 'Programul a afișat'), h('pre', {}, g.primit.replace(/\n$/, '') || '(nimic)')));
  function raportEsec(r, buni, total) {
    const g = r.rez.find((x) => !x.ok), out = [h('b', {}, `Încă nu merge: ${buni} din ${total} teste trecute.`)];
    if (g.eroare) { out.push(h('pre', { class: 'pya-e' }, g.eroare.text)); if (g.eroare.expl) out.push(h('div', { class: 'pya-expl' }, h('b', {}, '💡 '), g.eroare.expl)); }
    else if (g.vizibil) out.push(compara(g)); else out.push(h('p', {}, 'Merge pe exemple, dar nu și pe un test ascuns. Gândește-te la cazuri speciale.'));
    return out;
  }

  // ---------- Joc pe puzzle-uri succesive (ordonare, greșeală, completare) ----------
  function sesiune(j, n, puzzle, deseneaza) {
    ruleazaCuratarea();
    document.title = `${j.nume}, nivelul ${n} – Python – edudigi`;
    let k = 0, incercari = 0;
    const loc = h('div', { class: 'pyj-loc' });
    const puncte = h('div', { class: 'pyj-puncte', 'aria-hidden': 'true' });
    const arataPuncte = () => puncte.replaceChildren(...puzzle.map((_, i) => h('span', { class: `pyj-punct${i < k ? ' gata' : i === k ? ' acum' : ''}` })));
    const urmator = () => {
      if (k >= puzzle.length) {
        const st = incercari <= puzzle.length ? 3 : incercari <= puzzle.length * 2 ? 2 : 1;
        arataPuncte();
        loc.replaceChildren(final(j, n, st, st === 3 ? 'Ai rezolvat totul din prima. Ești gata pentru nivelul următor!' : 'Ai terminat nivelul. Mai încearcă o dată ca să strângi toate stelele.'));
        return;
      }
      arataPuncte();
      loc.replaceChildren();
      deseneaza(puzzle[k], loc, { incercare: () => { incercari++; }, reusit: () => { k++; setTimeout(urmator, 1400); } });
    };
    pagina(antet(`${j.emoji} ${j.nume}: nivelul ${n}`, null, [{ t: 'Jocuri', href: '#/python/jocuri' }, { t: j.nume, href: `#/python/jocuri/${j.id}` }, { t: `Nivelul ${n}` }]), puncte, loc);
    urmator();
  }

  // ===================== ORDONARE =====================
  function ordonare(n) {
    const j = JOCURI[1], puzzle = ORDONARE.filter((p) => p.niv === n);
    sesiune(j, n, puzzle, (p, loc, api) => {
      const pool = shuffle([...p.linii.map((s, i) => ({ s, id: `a${i}` })), ...p.extra.map((s, i) => ({ s, id: `x${i}` }))]);
      let puse = [];
      const rezultat = h('div', { class: 'pya-rezultat', role: 'status', 'aria-live': 'polite' });
      const colP = h('div', { class: 'pyj-col' }), colA = h('div', { class: 'pyj-col' });
      let ocupat = false;
      const linie = (it, actiuni) => {
        const r = h('div', { class: 'pyj-linie' }, h('pre', { class: 'pyj-cod', html: evid(it.s) }), actiuni);
        return r;
      };
      function arata() {
        colP.replaceChildren(...(puse.length ? puse.map((it, i) => linie(it, h('span', { class: 'pyj-act' },
          h('button', { class: 'pyj-mic', type: 'button', 'aria-label': 'Mută în sus', disabled: i === 0, onclick: () => { [puse[i - 1], puse[i]] = [puse[i], puse[i - 1]]; arata(); } }, '↑'),
          h('button', { class: 'pyj-mic', type: 'button', 'aria-label': 'Mută în jos', disabled: i === puse.length - 1, onclick: () => { [puse[i + 1], puse[i]] = [puse[i], puse[i + 1]]; arata(); } }, '↓'),
          h('button', { class: 'pyj-mic x', type: 'button', 'aria-label': 'Scoate linia', onclick: () => { puse.splice(i, 1); arata(); } }, '✕')))) : [h('p', { class: 'pyj-gol' }, 'Atinge liniile din dreapta ca să le adaugi aici, în ordine.')]));
        const ramase = pool.filter((x) => !puse.includes(x));
        colA.replaceChildren(...ramase.map((it) => { const b = h('button', { class: 'pyj-linie dispo', type: 'button', onclick: () => { puse.push(it); arata(); } }, h('pre', { class: 'pyj-cod', html: evid(it.s) })); return b; }), ...(ramase.length ? [] : [h('p', { class: 'pyj-gol' }, 'Ai folosit toate liniile.')]));
      }
      async function verif() {
        if (ocupat || !puse.length) return; ocupat = true; verifBtn.disabled = true; api.incercare();
        rezultat.className = 'pya-rezultat lucru'; rezultat.replaceChildren('⏳ Se verifică programul…');
        let r; try { r = await verifica(puse.map((x) => x.s).join('\n') + '\n', p.teste); } finally { ocupat = false; verifBtn.disabled = false; }
        const buni = r.rez.filter((x) => x.ok).length;
        if (r.ok) { rezultat.className = 'pya-rezultat bun'; rezultat.replaceChildren(h('div', { class: 'pya-bravo' }, h('span', { class: 'pya-bravo-e', 'aria-hidden': 'true' }, '🎉'), h('div', {}, h('b', {}, `Corect! ${buni} din ${p.teste.length} teste trecute.`)))); verifBtn.disabled = true; api.reusit(); }
        else { rezultat.className = 'pya-rezultat rau'; rezultat.replaceChildren(...raportEsec(r, buni, p.teste.length)); }
      }
      const verifBtn = h('button', { class: 'pya-btn verde mare', type: 'button', onclick: verif }, '▶ Rulează și verifică');
      loc.append(h('h2', { class: 'pyj-titlu' }, p.titlu), h('p', { class: 'pya-cer', html: inl(p.cer) }),
        h('div', { class: 'pyj-dublu' }, h('section', {}, h('h3', {}, '✍️ Programul tău'), colP), h('section', {}, h('h3', {}, '🧱 Liniile disponibile'), colA)),
        h('div', { class: 'pya-bara' }, verifBtn, h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { puse = []; arata(); } }, '↺ Șterge tot'), h('span', { class: 'pya-sfat' }, p.extra.length ? '⚠️ Unele linii nu trebuie folosite.' : 'Indentarea este deja pusă.')), rezultat);
      arata();
    });
  }

  // ===================== GĂSEȘTE GREȘEALA =====================
  function greseala(n) {
    const j = JOCURI[2], puzzle = BUGURI.filter((b) => b.niv === n);
    sesiune(j, n, puzzle, (b, loc, api) => {
      const linii = b.cod.split('\n');
      let faza = 1, alese = false;
      const mesaj = h('p', { class: 'pya-asoc-info', role: 'status', 'aria-live': 'polite' }, 'Pasul 1: atinge rândul în care crezi că este greșeala.');
      const optiuni = h('div', { class: 'pyj-optiuni', hidden: true });
      const consolaOut = h('pre', { class: 'pya-consola', hidden: true });
      const rand = linii.map((t, i) => {
        const el = h('button', { type: 'button', class: 'pyj-rand' }, h('span', { class: 'pyj-nr' }, String(i + 1)), h('code', { class: 'pyj-rcod', html: evid(t).replace(/\n$/, '') || '&nbsp;' }));
        el.addEventListener('click', () => {
          if (faza !== 1) return;
          if (i + 1 === b.rand) {
            faza = 2; el.classList.add('gasit'); mesaj.className = 'pya-asoc-info ok'; mesaj.textContent = '✔ Aici este greșeala! Pasul 2: alege cum se repară rândul.';
            optiuni.hidden = false;
          } else { api.incercare(); el.classList.add('rau'); setTimeout(() => el.classList.remove('rau'), 600); mesaj.className = 'pya-asoc-info rau'; mesaj.textContent = 'Nu aici. Citește programul pas cu pas și vezi ce face fiecare rând.'; }
        });
        return el;
      });
      b.optiuni.forEach((o, k) => {
        const bt = h('button', { type: 'button', class: 'pyj-opt' }, h('code', { html: evid(o).replace(/\n$/, '') }));
        bt.addEventListener('click', async () => {
          if (faza !== 2 || bt.disabled) return;
          if (k !== b.ok) { api.incercare(); bt.disabled = true; bt.classList.add('rau'); mesaj.className = 'pya-asoc-info rau'; mesaj.textContent = 'Cu această variantă programul tot nu merge. Încearcă alta.'; return; }
          faza = 3; bt.classList.add('ok'); for (const x of optiuni.children) x.disabled = true;
          mesaj.className = 'pya-asoc-info ok'; mesaj.replaceChildren(h('b', {}, '🎉 Reparat! '), b.expl);
          const reparat = linii.map((t, i) => (i + 1 === b.rand ? o : t)).join('\n') + '\n';
          const r = await ruleaza(reparat, { intrari: b.teste[0].i.split('\n').slice(0, -1), timp: 4000 }).promisiune;
          consolaOut.hidden = false; consolaOut.textContent = `Programul reparat afișează:\n${r.iesire || '(nimic)'}`;
          api.reusit();
        });
        optiuni.append(bt);
      });
      loc.append(h('h2', { class: 'pyj-titlu' }, b.titlu), h('p', { class: 'pya-cer', html: inl(b.cer) }), h('div', { class: 'pyj-codul' }, rand), mesaj, optiuni, consolaOut);
    });
  }

  // ===================== COMPLETARE =====================
  function completare(n) {
    const j = JOCURI[4], puzzle = COMPLETARE.filter((c) => c.niv === n);
    sesiune(j, n, puzzle, (c, loc, api) => {
      const selecturi = c.goluri.map((g, k) => { const s = h('select', { class: 'pyj-gol-sel', 'aria-label': `Golul ${k + 1}` }, h('option', { value: '' }, '▾ alege'), ...shuffle(g.opt.map((o, i) => ({ o, i }))).map((x) => h('option', { value: String(x.i) }, x.o))); return s; });
      const bucati = c.cod.split(/\{\d+\}/), pre = h('pre', { class: 'pyj-completare' });
      bucati.forEach((t, i) => { if (t) pre.append(h('span', { html: evid(t).replace(/\n$/, '') })); if (i < selecturi.length) pre.append(selecturi[i]); });
      const rezultat = h('div', { class: 'pya-rezultat', role: 'status', 'aria-live': 'polite' });
      let ocupat = false;
      const btn = h('button', { class: 'pya-btn verde mare', type: 'button', onclick: async () => {
        if (ocupat) return;
        if (selecturi.some((s) => s.value === '')) { rezultat.className = 'pya-rezultat rau'; rezultat.replaceChildren('Alege câte o variantă pentru toate golurile.'); return; }
        ocupat = true; btn.disabled = true; api.incercare();
        const cod = c.cod.replace(/\{(\d+)\}/g, (_, k) => c.goluri[Number(k) - 1].opt[Number(selecturi[Number(k) - 1].value)]) + '\n';
        rezultat.className = 'pya-rezultat lucru'; rezultat.replaceChildren('⏳ Se verifică programul…');
        let r; try { r = await verifica(cod, c.teste); } finally { ocupat = false; btn.disabled = false; }
        const buni = r.rez.filter((x) => x.ok).length;
        if (r.ok) { rezultat.className = 'pya-rezultat bun'; rezultat.replaceChildren(h('div', { class: 'pya-bravo' }, h('span', { class: 'pya-bravo-e', 'aria-hidden': 'true' }, '🎉'), h('div', {}, h('b', {}, `Corect! ${buni} din ${c.teste.length} teste trecute.`)))); btn.disabled = true; selecturi.forEach((s) => { s.disabled = true; }); api.reusit(); }
        else { rezultat.className = 'pya-rezultat rau'; rezultat.replaceChildren(...raportEsec(r, buni, c.teste.length)); }
      } }, '▶ Rulează și verifică');
      loc.append(h('h2', { class: 'pyj-titlu' }, c.titlu), h('p', { class: 'pya-cer', html: inl(c.cer) }), pre, h('div', { class: 'pya-bara' }, btn), rezultat);
    });
  }

  // ===================== BLITZ =====================
  function blitz(n) {
    const j = JOCURI[3];
    ruleazaCuratarea();
    document.title = `Blitz, nivelul ${n} – Python – edudigi`;
    const intrebari = shuffle(BLITZ.filter((q) => q.niv === n)).slice(0, 10);
    const TIMP = [22, 18, 15][n - 1];
    let k = 0, vieti = 3, corecte = 0, scor = 0, serie = 0, rest = TIMP, timer = null, blocat = false;
    ruleazaCuratarea(); curata.push(() => clearInterval(timer));
    const loc = h('div', { class: 'pyj-loc' });
    const stare = h('div', { class: 'pyj-stare' });
    const bara = h('div', { class: 'pyj-timp-in' });
    const arataStare = () => stare.replaceChildren(h('span', {}, `Întrebarea ${Math.min(k + 1, intrebari.length)} / ${intrebari.length}`), h('span', { class: 'vieti', 'aria-label': `${vieti} vieți` }, '❤️'.repeat(vieti) + '🖤'.repeat(3 - vieti)), h('span', {}, `Scor: ${scor}`), ...(serie >= 2 ? [h('span', { class: 'serie' }, `🔥 serie ×${serie}`)] : []));
    function intreaba() {
      clearInterval(timer);
      if (k >= intrebari.length || vieti <= 0) return sfarsit();
      blocat = false; rest = TIMP; arataStare();
      const q = intrebari[k], opt = shuffle([q.rasp, ...q.gresite]);
      const mesaj = h('p', { class: 'pya-asoc-info', role: 'status', 'aria-live': 'polite' }, 'Ce afișează programul?');
      const butoane = opt.map((o) => h('button', { type: 'button', class: 'pyj-opt mare' }, h('code', {}, o)));
      const raspuns = (bun, expira) => {
        if (blocat) return; blocat = true; clearInterval(timer);
        butoane.forEach((b, i) => { b.disabled = true; if (opt[i] === q.rasp) b.classList.add('ok'); });
        if (bun) { serie++; corecte++; const bonus = Math.round(rest * 2); scor += 100 + bonus + (serie >= 3 ? 20 * (serie - 2) : 0); mesaj.className = 'pya-asoc-info ok'; mesaj.textContent = `✔ Corect! +${100 + bonus}`; }
        else { serie = 0; vieti--; mesaj.className = 'pya-asoc-info rau'; mesaj.textContent = expira ? `⏰ Timpul a expirat. Răspunsul era ${q.rasp}.` : `✘ Nu. Programul afișează ${q.rasp}.`; }
        arataStare(); k++; setTimeout(intreaba, bun ? 900 : 1700);
      };
      butoane.forEach((b, i) => b.addEventListener('click', () => { if (!blocat) { if (opt[i] !== q.rasp) b.classList.add('rau'); raspuns(opt[i] === q.rasp, false); } }));
      loc.replaceChildren(stare, h('div', { class: 'pyj-timp', 'aria-hidden': 'true' }, bara), codBloc(q.cod), h('div', { class: 'pyj-opt-grila' }, butoane), mesaj);
      bara.style.width = '100%';
      timer = setInterval(() => { rest -= 0.1; bara.style.width = `${Math.max(0, (rest / TIMP) * 100)}%`; bara.classList.toggle('putin', rest < 5); if (rest <= 0) raspuns(false, true); }, 100);
    }
    function sfarsit() {
      const st = corecte >= 8 && vieti === 3 ? 3 : corecte >= 7 ? 2 : corecte >= 5 ? 1 : 0;
      const record = scor > (P.blitz[n] || 0); if (record) { P.blitz[n] = scor; salveaza(); }
      if (st === 0) {
        loc.replaceChildren(h('div', { class: 'pyj-final' }, h('div', { class: 'pyj-trofeu', 'aria-hidden': 'true' }, '💪'), h('h2', {}, 'Mai încearcă!'), h('p', {}, `Ai răspuns corect la ${corecte} din ${intrebari.length} întrebări. Pentru o stea ai nevoie de cel puțin 5 răspunsuri corecte.`), h('p', { class: 'pyj-scor' }, `Scor: ${scor}`),
          h('div', { class: 'pya-actiuni' }, h('button', { class: 'pya-btn verde mare', type: 'button', onclick: () => blitz(n) }, '↺ Încă o dată'), h('a', { class: 'pya-btn alb', href: '#/python/jocuri/blitz' }, 'Niveluri'))));
        return;
      }
      const f = final(j, n, st, `Ai răspuns corect la ${corecte} din ${intrebari.length} întrebări.`);
      f.querySelector('p:nth-of-type(2)')?.after(h('p', { class: 'pyj-scor' }, `Scor: ${scor}${record ? ' · 🏅 record nou!' : ` · record: ${P.blitz[n]}`}`));
      for (const a of f.querySelectorAll('a')) if (a.textContent.includes('Mai joc')) { const b = h('button', { class: a.className, type: 'button', onclick: () => blitz(n) }, '↺ Mai joc'); a.replaceWith(b); }
      loc.replaceChildren(f);
    }
    pagina(antet(`⚡ Blitz: nivelul ${n}`, `Alege răspunsul înainte să expire timpul (${TIMP} secunde). Răspunsurile rapide și seriile de răspunsuri corecte dau puncte în plus.`, [{ t: 'Jocuri', href: '#/python/jocuri' }, { t: 'Blitz', href: '#/python/jocuri/blitz' }, { t: `Nivelul ${n}` }]), loc);
    intreaba();
  }

  // ===================== ROBOT =====================
  const SAGETI = ['▲', '▶', '▼', '◀'];
  function robot(nr) {
    ruleazaCuratarea();
    const j = JOCURI[0], nivel = NIVELE_ROBOT.find((x) => x.id === nr), harta = nivel.harta, W = harta[0].length;
    document.title = `Robotul Python, nivelul ${nr} – edudigi`;
    const offset = RANDURI_PRELUDIU(harta);
    let esecuri = 0, rulare = null, timer = null, ocupat = false, indiciuNr = 0, solVazuta = false;
    curata.push(() => { clearTimeout(timer); rulare?.oprire(); });

    // ----- tabla -----
    const celule = harta.map((r, y) => [...r].map((c, x) => h('div', { class: `pyj-celula${c === '#' ? ' zid' : ''}`, 'data-x': String(x), 'data-y': String(y) }, c === '#' ? '🧱' : c === 'T' ? h('span', { class: 'tinta' }, '🎯') : '')));
    const tabla = h('div', { class: 'pyj-harta', role: 'img', 'aria-label': `Harta nivelului ${nr}: robotul 🤖 trebuie să ajungă la țintă 🎯` }, celule.flat());
    tabla.style.gridTemplateColumns = `repeat(${W}, 1fr)`; tabla.style.maxWidth = `${Math.min(W * 62, 540)}px`;
    const rob = h('span', { class: 'pyj-robot', 'aria-hidden': 'true' }, '🤖'), sageata = h('span', { class: 'pyj-dir', 'aria-hidden': 'true' }, SAGETI[1]);
    rob.append(sageata);
    let start = [0, 0], stele0 = [];
    harta.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'R') start = [x, y]; if (c === '*') stele0.push(`${x},${y}`); }));
    let pos = [...start], dir = 1, steleRamase = new Set(stele0);
    const deseneaza = () => {
      for (const row of celule) for (const c of row) { c.querySelectorAll('.stea').forEach((e) => e.remove()); }
      for (const s of steleRamase) { const [x, y] = s.split(',').map(Number); celule[y][x].append(h('span', { class: 'stea' }, '⭐')); }
      celule[pos[1]][pos[0]].append(rob); sageata.textContent = SAGETI[dir]; rob.classList.remove('lovit', 'sare');
    };
    const reseteaza = () => { clearTimeout(timer); pos = [...start]; dir = 1; steleRamase = new Set(stele0); deseneaza(); };

    // ----- editor, consolă -----
    const ed = editor('# scrie aici programul robotului\n', { min: 9, laRulare: () => porneste() });
    const iesire = h('pre', { class: 'pyj-iesire', 'aria-live': 'polite' });
    const mesaj = h('p', { class: 'pya-asoc-info', role: 'status', 'aria-live': 'polite' }, 'Scrie programul și apasă ▶ Rulează.');
    const jos = h('div', { class: 'pya-actiuni' });
    const indiciiEl = h('div', { class: 'pya-indicii' });
    const run = h('button', { class: 'pya-btn verde mare', type: 'button', onclick: () => porneste() }, '▶ Rulează');
    const ajutor = h('button', { class: 'pya-btn alb', type: 'button', onclick: () => {
      if (indiciuNr < nivel.indicii.length) { indiciiEl.append(h('div', { class: 'pya-indiciu' }, h('b', {}, `💡 Indiciul ${indiciuNr + 1}: `), h('span', { html: inl(nivel.indicii[indiciuNr]) }))); indiciuNr++; }
      if (indiciuNr >= nivel.indicii.length) ajutor.disabled = true; sol.hidden = false;
    } }, '💡 Indiciu');
    const sol = h('button', { class: 'pya-btn alb', type: 'button', hidden: true, onclick: () => {
      if (!solVazuta && !confirm('Sigur vrei să vezi soluția? Este mai bine să mai încerci puțin.')) return; solVazuta = true;
      indiciiEl.append(h('div', { class: 'pya-indiciu sol' }, h('b', {}, '👀 O soluție:'), codBloc(nivel.solutie), h('button', { class: 'pya-btn alb mic', type: 'button', onclick: () => ed.set(nivel.solutie) }, 'Pune soluția în editor'))); sol.disabled = true;
    } }, '👀 Soluția');
    const rst = h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { reseteaza(); iesire.textContent = ''; mesaj.className = 'pya-asoc-info'; mesaj.textContent = 'Robotul a revenit la start.'; } }, '↺ Robotul la start');

    // Transformă numerele de rând din erori (programul rulează după preludiu)
    const ajusteaza = (t) => (t || '').replace(/line (\d+)/g, (m, d) => (Number(d) > offset ? `line ${Number(d) - offset}` : m)).replace(/rândul (\d+)/g, (m, d) => (Number(d) > offset ? `rândul ${Number(d) - offset}` : m));

    async function porneste() {
      if (ocupat) return; ocupat = true; run.disabled = true; reseteaza(); iesire.textContent = ''; jos.replaceChildren();
      mesaj.className = 'pya-asoc-info'; mesaj.textContent = '⏳ Se execută programul…';
      rulare = ruleaza(preludiuRobot(harta) + ed.get() + EPILOG_ROBOT, { timp: 12000 });
      const r = await rulare.promisiune;
      const linii = r.iesire.split('\n'), evenimente = [], proprii = [];
      for (const l of linii) { if (l.startsWith('@')) { const p = l.split(' '); evenimente.push({ t: p[0].slice(1), a: p.slice(1).map(Number) }); } else if (l !== '') proprii.push(l); }
      iesire.textContent = proprii.join('\n');
      let k = 0; const viteza = evenimente.length > 60 ? 90 : 280;
      const pas = () => {
        if (k >= evenimente.length) return incheie(r, evenimente);
        const e = evenimente[k++];
        if (e.t === 'M') { pos = [e.a[0], e.a[1]]; deseneaza(); }
        else if (e.t === 'D') { dir = e.a[0]; sageata.textContent = SAGETI[dir]; }
        else if (e.t === 'S') { steleRamase.delete(`${e.a[0]},${e.a[1]}`); deseneaza(); }
        else if (e.t === 'B') { rob.classList.add('lovit'); }
        timer = setTimeout(pas, viteza);
      };
      pas();
    }
    function incheie(r, ev) {
      ocupat = false; run.disabled = false;
      const fin = ev.find((e) => e.t === 'END'), bump = ev.find((e) => e.t === 'B'), lim = ev.find((e) => e.t === 'L');
      if (r.eroare && !r.ok) {
        esecuri++; mesaj.className = 'pya-asoc-info rau'; mesaj.replaceChildren(h('b', {}, 'Programul s-a oprit cu o eroare. '), r.eroare.expl ? ajusteaza(r.eroare.expl) : ajusteaza(r.eroare.text)); return;
      }
      if (bump) { esecuri++; mesaj.className = 'pya-asoc-info rau'; mesaj.textContent = '💥 Boing! Robotul a lovit un zid (sau marginea hărții) și programul s-a oprit.'; return; }
      if (lim) { esecuri++; mesaj.className = 'pya-asoc-info rau'; mesaj.textContent = '🔁 Robotul a făcut prea multe mișcări: poate ai o buclă care nu se mai oprește.'; return; }
      if (!fin) { esecuri++; mesaj.className = 'pya-asoc-info rau'; mesaj.textContent = 'Programul nu a ajuns până la capăt.'; return; }
      const [x, y, ramase] = fin.a;
      if (harta[y][x] === 'T' && ramase === 0) {
        const st = esecuri === 0 ? 3 : esecuri <= 2 ? 2 : 1;
        dauStele(`robot:${nr}`, st, j.xp); rob.classList.add('sare');
        mesaj.className = 'pya-asoc-info ok'; mesaj.replaceChildren(h('b', {}, `🎉 Robotul a ajuns la țintă! ${stele(st)} `), `Programul tău are ${ed.get().split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length} linii de cod.`);
        jos.replaceChildren(...[nr < NIVELE_ROBOT.length ? h('a', { class: 'pya-btn verde mare', href: `#/python/jocuri/robot/${nr + 1}` }, 'Nivelul următor ▶') : null, h('a', { class: 'pya-btn alb', href: '#/python/jocuri/robot' }, 'Toate hărțile')].filter(Boolean));
        return;
      }
      esecuri++; mesaj.className = 'pya-asoc-info rau';
      mesaj.textContent = harta[y][x] !== 'T' ? 'Robotul nu a ajuns la țintă 🎯. Verifică numărul de pași și întoarcerile.' : `Robotul a ajuns la țintă, dar au rămas ${ramase} ${ramase === 1 ? 'stea' : 'stele'} ⭐ pe hartă. Trebuie să le culegi pe toate.`;
      if (esecuri >= 3) sol.hidden = false;
    }

    const comenzi = h('details', { class: 'pyj-comenzi' }, h('summary', {}, '📖 Comenzile robotului'), h('ul', {},
      [['pas()', 'mută robotul o căsuță înainte (dacă dă de zid, programul se oprește)'], ['dreapta()', 'se întoarce la dreapta, pe loc'], ['stanga()', 'se întoarce la stânga, pe loc'], ['ia_stea()', 'ia steaua din căsuța curentă, dacă există'], ['perete()', 'True dacă în față este un zid sau marginea hărții'], ['la_tinta()', 'True dacă robotul se află pe țintă'], ['stea_aici()', 'True dacă în căsuța curentă este o stea']].map(([c, d]) => h('li', {}, h('code', {}, c), ` – ${d}`))));
    pagina(
      antet(`🤖 Harta ${nr}: ${nivel.titlu}`, null, [{ t: 'Jocuri', href: '#/python/jocuri' }, { t: 'Robotul Python', href: '#/python/jocuri/robot' }, { t: `Harta ${nr}` }]),
      h('p', { class: 'pya-cer', html: inl(nivel.cer) }),
      h('div', { class: 'pyj-robot-zona' },
        h('div', { class: 'pyj-robot-st' }, tabla, h('p', { class: 'pyj-concept' }, `Ce exersezi: ${nivel.concept}`), comenzi),
        h('div', { class: 'pyj-robot-dr' }, ed.el, h('div', { class: 'pya-bara' }, run, rst, ajutor, sol, h('span', { class: 'pya-sfat' }, 'Ctrl + Enter')), mesaj, iesire, jos, indiciiEl)));
    deseneaza();
  }

  // ---------- Rutele ----------
  routes.push({
    pattern: /^\/python\/jocuri(?:\/([a-z]+)(?:\/(\d))?)?$/,
    handler: async (m) => {
      ruleazaCuratarea();
      const j = JOCURI.find((x) => x.id === m[1]);
      if (!j) return hub();
      const n = Number(m[2]) || 0;
      if (!n || n > j.niveluri || (n > 1 && steleDe(`${j.id}:${n - 1}`) < 1)) return alegeNivel(j);
      if (j.id === 'robot') return robot(n);
      if (j.id === 'ordonare') return ordonare(n);
      if (j.id === 'greseala') return greseala(n);
      if (j.id === 'blitz') return blitz(n);
      return completare(n);
    },
  });
})();

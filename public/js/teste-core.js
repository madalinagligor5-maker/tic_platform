'use strict';
// Testele edudigi: notarea itemilor și varianta „fără răspunsuri” trimisă elevilor.
// Același fișier rulează la construire și pe server (Node), unde se face corectarea testelor lansate
// de profesor, și în browser, unde se corectează testele de antrenament.
//
// Un test este un material cu `tip: test` și `mod: antrenament` (oricine îl poate rezolva) sau
// `mod: profesor` (nu se publică; doar profesorul îl poate lansa clasei). Itemii sunt aplicațiile
// interactive obișnuite, plus `eseu` (răspuns deschis, corectat de profesor). Punctajul unui item
// se scrie în antet: ```quiz puncte=10
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const I = isNode ? require('./interactive') : root.EduInteractiv;
  const O = isNode ? require('./office') : root.EduOffice;
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  const PUNCTE_IMPLICIT = 10;
  const NOTABILE = ['quiz', 'adevarat-fals', 'categorii', 'ordonare', 'completare', 'calcul-tabelar', 'procesor-text', 'eseu'];

  // ---------- Itemul „eseu” (răspuns deschis) ----------
  //   ```eseu puncte=10
  //   Explică diferența dintre hardware și software.
  //   Cuvinte: 30-80
  //   Barem: 5p hardware = partea fizică; 5p software = programele.
  //   ```
  function parseEseu(text) {
    const errors = [];
    const intrebare = [], barem = [];
    let cuvinte = null, inBarem = false;
    for (const raw of text.replace(/\r/g, '').split('\n')) {
      const l = raw.trim();
      let m;
      if ((m = /^barem\s*:\s*(.*)$/i.exec(l))) { inBarem = true; if (m[1]) barem.push(m[1]); continue; }
      if ((m = /^cuvinte\s*:\s*(\d+)\s*[-–]\s*(\d+)$/i.exec(l))) { cuvinte = [Number(m[1]), Number(m[2])]; continue; }
      if (!l) continue;
      (inBarem ? barem : intrebare).push(l);
    }
    if (!intrebare.length) errors.push('lipsește cerința eseului');
    return { data: { intrebare: intrebare.join(' '), barem: barem.join('\n'), cuvinte }, errors };
  }
  const nrCuvinte = (s) => (String(s || '').match(/[\p{L}\p{N}]+/gu) || []).length;

  if (I && I.register) {
    I.register('eseu', {
      label: 'Răspuns deschis',
      aliases: ['raspuns-deschis'],
      parse: parseEseu,
      // În lecții: elevul scrie, apoi compară cu baremul (nu se notează automat).
      render(block, inline, { frame, h }) {
        const d = block.data;
        const ta = h('textarea', { class: 'eseu-text', rows: 6, 'aria-label': 'Răspunsul tău' });
        const count = h('p', { class: 'muted small' });
        const upd = () => { count.textContent = `${nrCuvinte(ta.value)} cuvinte${d.cuvinte ? ` (recomandat ${d.cuvinte[0]}–${d.cuvinte[1]})` : ''}`; };
        ta.addEventListener('input', upd);
        upd();
        const barem = h('div', { class: 'task-box', hidden: true }, h('b', {}, 'Ce ar trebui să conțină răspunsul:'), h('p', {}, inline(d.barem || 'Discută răspunsul cu profesorul.')));
        const api = frame(block, h('div', { class: 'act-body' }, h('p', { class: 'eseu-q' }, inline(d.intrebare)), ta, count, barem), {
          checkLabel: 'Vezi baremul',
          onCheck(a) {
            if (nrCuvinte(ta.value) < 3) return a.status('Scrie mai întâi răspunsul tău.', 'bad');
            barem.hidden = false;
            a.status('Compară răspunsul tău cu baremul.', 'ok');
            a.solve();
          },
        });
        return api.box;
      },
    });
  }

  // ---------- Itemii unui test ----------
  const puncteItem = (block) => {
    const p = Number(String(block.attrs?.puncte ?? '').replace(',', '.'));
    return Number.isFinite(p) && p > 0 ? p : PUNCTE_IMPLICIT;
  };
  const itemi = (blocks) => blocks.filter((b) => NOTABILE.includes(b.type));
  function infoTest(blocks) {
    const its = itemi(blocks);
    return { nrItemi: its.length, puncte: its.reduce((s, b) => s + puncteItem(b), 0) };
  }
  // 1 + 9 × fracțiune (1 punct din oficiu), cu două zecimale.
  const nota = (punctaj, total) => (total > 0 ? Math.round((1 + (9 * punctaj) / total) * 100) / 100 : null);
  const rot = (x) => Math.round(x * 100) / 100;

  // Răspunsurile acceptate la completare (fără diacritice, fără majuscule).
  const golurile = (data) => data.paras.flat().filter((x) => typeof x === 'object');

  // Corectează un item. Returnează { scor: 0..1 sau null (corectare manuală), detalii: [true/false...] }.
  //   quiz           [[indici bifați], ...] pentru fiecare întrebare
  //   adevarat-fals  [true/false/null, ...]
  //   categorii      { element: categorie }
  //   ordonare       [textele pașilor, în ordinea aleasă]
  //   completare     [textele scrise, în ordinea golurilor]
  //   calcul-tabelar { A1: { raw, bold, ... }, ... }
  //   procesor-text  { verificari: [true/false...], html } (verificarea se face în browser)
  //   eseu           text
  function noteazaItem(block, raspuns) {
    const d = block.data;
    const frac = (arr) => ({ scor: arr.length ? arr.filter(Boolean).length / arr.length : 0, detalii: arr });
    switch (block.type) {
      case 'quiz': {
        const r = Array.isArray(raspuns) ? raspuns : [];
        return frac(d.questions.map((q, i) => {
          const ales = new Set((Array.isArray(r[i]) ? r[i] : []).map(Number));
          return q.options.every((o, j) => o.correct === ales.has(j));
        }));
      }
      case 'adevarat-fals': {
        const r = Array.isArray(raspuns) ? raspuns : [];
        return frac(d.items.map((it, i) => r[i] === it.answer));
      }
      case 'categorii': {
        const r = raspuns && typeof raspuns === 'object' ? raspuns : {};
        return frac(d.cats.flatMap((c) => c.items.map((it) => r[it] === c.name)));
      }
      case 'ordonare': {
        const r = Array.isArray(raspuns) ? raspuns : [];
        return frac(d.steps.map((s, i) => r[i] === s));
      }
      case 'completare': {
        const r = Array.isArray(raspuns) ? raspuns : [];
        return frac(golurile(d).map((g, i) => g.answers.some((a) => norm(a) === norm(r[i]))));
      }
      case 'calcul-tabelar': {
        const cells = raspuns && typeof raspuns === 'object' && !Array.isArray(raspuns) ? curataCelule(raspuns) : {};
        return frac(O.checkSheet(d, cells).map((x) => x.ok));
      }
      case 'procesor-text': {
        const v = Array.isArray(raspuns?.verificari) ? raspuns.verificari : [];
        return frac(d.cerinte.map((c, i) => v[i] === true));
      }
      case 'eseu':
        return { scor: null, detalii: [] };
      default:
        return { scor: 0, detalii: [] };
    }
  }
  // Celulele trimise de elev: doar câmpurile cunoscute, ca serverul să nu primească orice.
  function curataCelule(cells) {
    const out = {};
    for (const [ref, c] of Object.entries(cells).slice(0, 2000)) {
      if (!/^[A-Z]{1,2}\d{1,4}$/.test(ref) || !c || typeof c !== 'object') continue;
      out[ref] = {
        raw: String(c.raw ?? '').slice(0, 500),
        bold: Boolean(c.bold),
        align: c.align === 'center' ? 'center' : undefined,
        fill: typeof c.fill === 'string' && O.FILLS[c.fill] ? c.fill : undefined,
        decimals: Number.isInteger(c.decimals) && c.decimals >= 0 && c.decimals <= 6 ? c.decimals : undefined,
      };
    }
    return out;
  }

  // Corectează tot testul. raspunsuri[i] = răspunsul la itemul i (în ordinea din test).
  // manual[i] = punctajul dat de profesor la itemii cu corectare manuală (eseu).
  function noteazaTest(blocks, raspunsuri = [], manual = {}) {
    const its = itemi(blocks);
    let punctaj = 0, total = 0, inAsteptare = 0;
    const detalii = its.map((b, i) => {
      const max = puncteItem(b);
      total += max;
      const r = noteazaItem(b, raspunsuri[i]);
      let p = r.scor == null ? null : rot(r.scor * max);
      if (r.scor == null) {
        const m = manual[i];
        if (m != null && Number.isFinite(Number(m))) p = Math.max(0, Math.min(max, rot(Number(m))));
        else inAsteptare++;
      }
      punctaj += p || 0;
      return { tip: b.type, titlu: b.title || I.TYPES[b.type], max, punctaj: p, manual: r.scor == null, detalii: r.detalii };
    });
    punctaj = rot(punctaj);
    return { punctaj, total, nota: nota(punctaj, total), inAsteptare, detalii };
  }

  // ---------- Varianta trimisă elevului (fără răspunsuri) ----------
  function amesteca(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function amestecaAltfel(arr) {
    if (new Set(arr).size < 2) return arr.slice();
    let a;
    do a = amesteca(arr); while (a.every((x, i) => x === arr[i]));
    return a;
  }
  function faraRaspunsuri(block) {
    const d = block.data;
    const baza = { tip: block.type, titlu: block.title, puncte: puncteItem(block) };
    switch (block.type) {
      case 'quiz':
        return { ...baza, intrebari: d.questions.map((q) => ({ q: q.q, multi: q.multi, variante: q.options.map((o) => o.text) })) };
      case 'adevarat-fals':
        return { ...baza, afirmatii: d.items.map((it) => it.text) };
      case 'categorii':
        return { ...baza, categorii: d.cats.map((c) => c.name), elemente: amesteca(d.cats.flatMap((c) => c.items)) };
      case 'ordonare':
        return { ...baza, pasi: amestecaAltfel(d.steps) };
      case 'completare':
        return { ...baza, paragrafe: d.paras.map((p) => p.map((x) => (typeof x === 'object' ? { gol: Math.max(6, ...x.answers.map((a) => a.length)) } : x))) };
      case 'calcul-tabelar':
        return {
          ...baza,
          foaie: {
            grid: d.grid, cols: d.cols, rows: d.rows,
            // Formula-model nu se arată: doar descrierea cerinței (sau o formulare generală).
            cerinte: d.cerinte.map((c) => ({ text: c.kind === 'formula' && !c.explicit ? `${c.ref}: scrie formula potrivită` : c.text })),
          },
        };
      case 'procesor-text':
        // Cerințele de formatare sunt chiar enunțul, iar verificarea se face în browser.
        return { ...baza, document: d };
      case 'eseu':
        return { ...baza, intrebare: d.intrebare, cuvinte: d.cuvinte };
      default:
        return baza;
    }
  }
  const testPentruElev = (blocks) => itemi(blocks).map(faraRaspunsuri);

  const api = { NOTABILE, PUNCTE_IMPLICIT, parseEseu, nrCuvinte, puncteItem, itemi, infoTest, nota, noteazaItem, noteazaTest, faraRaspunsuri, testPentruElev, amesteca, golurile };
  if (isNode) module.exports = api;
  else root.EduTeste = api;
})(typeof window !== 'undefined' ? window : globalThis);

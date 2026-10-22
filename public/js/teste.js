'use strict';
// Testele: afișarea itemilor, testul de antrenament (corectat în browser), testele lansate de profesor
// (elevul le rezolvă cu cronometru, serverul le corectează) și rezultatele din panoul profesorului.
(() => {
  const { h, show, data, markdown, inline, clasaLabel, hooks, routes, render } = window.EduApp;
  const C = window.EduConturi;
  const T = window.EduTeste;
  const O = window.EduOffice;
  const I = window.EduInteractiv;
  const umple = (el, ...copii) => el.replaceChildren(...copii.flat().filter((c) => c != null && c !== false));
  const fmtPuncte = (p) => String(Math.round(p * 100) / 100).replace('.', ',');
  const fmtNota = (n) => (n == null ? '—' : n.toFixed(2).replace('.', ','));
  const plural = (n, unu, multe) => `${n} ${n === 1 ? unu : multe}`;
  let uid = 0;

  // =====================================================================
  // Itemii unui test (varianta fără răspunsuri, primită de la server sau făcută local)
  // Fiecare item: { el, get() → răspunsul, marcheaza(detalii) după corectare, blocheaza() }
  // =====================================================================
  function itemWidget(it, nr, initial, laSchimbare) {
    const antet = h('div', { class: 'item-head' },
      h('span', { class: 'item-nr' }, `Itemul ${nr}`),
      h('span', { class: 'act-type' }, I.TYPES[it.tip]),
      h('span', { class: 'item-pts' }, plural(it.puncte, 'punct', 'puncte')));
    const titlu = it.titlu ? h('h3', { class: 'item-title' }, inline(it.titlu.replace(/^Item(ul)?\s*\d+\.\s*/i, ''))) : null;
    const corp = h('div', { class: 'item-body' });
    const el = h('section', { class: `test-item item-${it.tip}`, 'aria-label': `Itemul ${nr}` }, antet, titlu, corp);
    const w = { el, get: () => null, marcheaza: () => {}, blocheaza: () => el.querySelectorAll('input, select, textarea, button').forEach((x) => { x.disabled = true; }) };
    el.addEventListener('input', laSchimbare);
    el.addEventListener('change', laSchimbare);
    const marcaj = (nod, ok) => { nod.classList.remove('ok', 'bad'); nod.classList.add(ok ? 'ok' : 'bad'); };

    if (it.tip === 'quiz') {
      const grupuri = it.intrebari.map((q, qi) => {
        const name = `ti${++uid}`;
        const inputs = q.variante.map((v, vi) => h('input', { type: q.multi ? 'checkbox' : 'radio', name, value: vi, checked: Array.isArray(initial?.[qi]) && initial[qi].includes(vi) }));
        const fs = h('fieldset', { class: 't-q' },
          h('legend', {}, it.intrebari.length > 1 ? `${qi + 1}. ` : '', inline(q.q), q.multi ? h('span', { class: 'muted small' }, ' (alege toate răspunsurile corecte)') : null),
          q.variante.map((v, vi) => h('label', { class: 'opt' }, inputs[vi], h('span', {}, inline(v)))));
        return { fs, inputs };
      });
      corp.append(...grupuri.map((g) => g.fs));
      w.get = () => grupuri.map((g) => g.inputs.filter((x) => x.checked).map((x) => Number(x.value)));
      w.marcheaza = (d) => grupuri.forEach((g, i) => marcaj(g.fs, d[i]));
    } else if (it.tip === 'adevarat-fals') {
      const randuri = it.afirmatii.map((a, i) => {
        const name = `ti${++uid}`;
        const da = h('input', { type: 'radio', name, value: 'A', checked: initial?.[i] === true });
        const nu = h('input', { type: 'radio', name, value: 'F', checked: initial?.[i] === false });
        const rand = h('div', { class: 'tf-row', role: 'group', 'aria-label': a },
          h('span', { class: 'tf-text' }, inline(a)),
          h('label', { class: 'tf-opt' }, da, h('span', {}, 'A')),
          h('label', { class: 'tf-opt' }, nu, h('span', {}, 'F')));
        return { rand, da, nu };
      });
      corp.append(h('p', { class: 'muted small' }, 'A = adevărat, F = fals'), ...randuri.map((r) => r.rand));
      w.get = () => randuri.map((r) => (r.da.checked ? true : r.nu.checked ? false : null));
      w.marcheaza = (d) => randuri.forEach((r, i) => marcaj(r.rand, d[i]));
    } else if (it.tip === 'categorii') {
      const randuri = it.elemente.map((e) => {
        const sel = h('select', { 'aria-label': `Categoria pentru ${e}` }, h('option', { value: '' }, '— alege —'), it.categorii.map((c) => h('option', { value: c, selected: initial?.[e] === c }, c)));
        return { e, sel, rand: h('label', { class: 'cat-row' }, h('span', {}, inline(e)), sel) };
      });
      corp.append(...randuri.map((r) => r.rand));
      w.get = () => Object.fromEntries(randuri.filter((r) => r.sel.value).map((r) => [r.e, r.sel.value]));
      w.marcheaza = (d, block) => {
        // detaliile sunt în ordinea din test (categorie cu categorie); le potrivim după text
        const ordine = block ? block.data.cats.flatMap((c) => c.items) : [];
        randuri.forEach((r) => { const i = ordine.indexOf(r.e); if (i >= 0) marcaj(r.rand, d[i]); });
      };
    } else if (it.tip === 'ordonare') {
      let pasi = Array.isArray(initial) && initial.length === it.pasi.length ? initial.slice() : it.pasi.slice();
      const lista = h('ol', { class: 'order-list' });
      const deseneaza = (focus) => {
        umple(lista, pasi.map((p, i) => h('li', {},
          h('span', {}, inline(p)),
          h('span', { class: 'order-btns' },
            h('button', { class: 'tb-btn', type: 'button', 'aria-label': `Mută „${p}” mai sus`, disabled: i === 0, onclick: () => muta(i, -1) }, '↑'),
            h('button', { class: 'tb-btn', type: 'button', 'aria-label': `Mută „${p}” mai jos`, disabled: i === pasi.length - 1, onclick: () => muta(i, 1) }, '↓')))));
        if (focus != null) lista.children[focus]?.querySelectorAll('button')[focus > 0 ? 0 : 1]?.focus();
      };
      const muta = (i, d) => { [pasi[i], pasi[i + d]] = [pasi[i + d], pasi[i]]; deseneaza(i + d); laSchimbare(); };
      deseneaza();
      corp.append(lista);
      w.get = () => pasi.slice();
      w.marcheaza = (d) => [...lista.children].forEach((li, i) => marcaj(li, d[i]));
    } else if (it.tip === 'completare') {
      const inputs = [];
      for (const p of it.paragrafe) {
        corp.append(h('p', { class: 'fill-p' }, p.map((x) => {
          if (typeof x === 'string') return inline(x);
          const inp = h('input', { class: 'blank', type: 'text', size: Math.min(24, x.gol + 2), autocomplete: 'off', spellcheck: 'false', 'aria-label': `Spațiul ${inputs.length + 1}`, value: initial?.[inputs.length] ?? '' });
          inputs.push(inp);
          return inp;
        })));
      }
      w.get = () => inputs.map((x) => x.value.trim());
      w.marcheaza = (d) => inputs.forEach((x, i) => marcaj(x, d[i]));
    } else if (it.tip === 'calcul-tabelar') {
      const sh = O.createSheet(it.foaie);
      if (initial && typeof initial === 'object' && !Array.isArray(initial)) sh.setCells(initial);
      sh.onChange(laSchimbare);
      const cer = h('div', { class: 'task-box' }, h('b', {}, 'Cerințe:'), h('ol', { class: 'task-list' }, it.foaie.cerinte.map((c) => h('li', {}, c.text))));
      corp.append(cer, sh.el);
      w.get = () => sh.getCells();
      w.blocheaza = () => { sh.el.classList.add('locked'); sh.el.querySelectorAll('input, button').forEach((x) => { x.disabled = true; }); sh.el.querySelector('.sheet-wrap')?.setAttribute('inert', ''); };
      w.verificari = (block) => O.checkSheet(block.data, sh.getCells());
    } else if (it.tip === 'procesor-text') {
      const doc = O.createDocEditor({ paragrafe: it.document.paragrafe });
      if (initial?.html) doc.editor.replaceChildren(O.docSigur(initial.html));
      doc.editor.addEventListener('input', laSchimbare);
      const cer = h('div', { class: 'task-box' }, h('b', {}, 'Cerințe:'), O.cerinteInitiale(it.document.cerinte));
      corp.append(cer, doc.el);
      w.get = () => ({ verificari: O.checkDoc(doc.editor, it.document).map((r) => r.ok), html: doc.html() });
      w.blocheaza = () => { doc.editor.setAttribute('contenteditable', 'false'); doc.el.querySelectorAll('button, select').forEach((x) => { x.disabled = true; }); };
      w.verificari = () => O.checkDoc(doc.editor, it.document);
    } else if (it.tip === 'eseu') {
      const ta = h('textarea', { class: 'eseu-text', rows: 7, 'aria-label': 'Răspunsul tău' });
      ta.value = typeof initial === 'string' ? initial : '';
      const count = h('p', { class: 'muted small' });
      const upd = () => { count.textContent = `${T.nrCuvinte(ta.value)} cuvinte${it.cuvinte ? ` (recomandat ${it.cuvinte[0]}–${it.cuvinte[1]})` : ''}`; };
      ta.addEventListener('input', upd);
      upd();
      corp.append(h('p', { class: 'eseu-q' }, inline(it.intrebare)), ta, count);
      w.get = () => ta.value;
    }
    return w;
  }

  // Câți itemi au măcar un răspuns (pentru „Ai răspuns la X din Y itemi”).
  function areRaspuns(it, r) {
    if (r == null) return false;
    if (it.tip === 'quiz') return r.some((q) => q.length);
    if (it.tip === 'adevarat-fals') return r.some((x) => x != null);
    if (it.tip === 'categorii') return Object.keys(r).length > 0;
    if (it.tip === 'completare') return r.some(Boolean);
    if (it.tip === 'eseu') return T.nrCuvinte(r) > 0;
    return true; // ordonare, foaie de calcul, document: au mereu o stare
  }

  // Corectura unui item (doar la antrenament și pentru profesor: aici avem testul complet).
  function corectura(block, raspuns, detalii, w) {
    const d = block.data;
    const li = (ok, ...txt) => h('li', { class: ok ? 'ok' : 'bad' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'), h('span', {}, ...txt));
    const lista = (items) => h('ul', { class: 'check-list' }, items);
    switch (block.type) {
      case 'quiz':
        return lista(d.questions.map((q, i) => li(detalii[i], d.questions.length > 1 ? `${i + 1}. ` : '', detalii[i] ? 'Corect. ' : `Răspuns corect: ${q.options.filter((o) => o.correct).map((o) => o.text).join('; ')}. `, q.explain ? h('span', { class: 'muted' }, q.explain) : null)));
      case 'adevarat-fals':
        return lista(d.items.map((x, i) => li(detalii[i], inline(x.text), ` – ${x.answer ? 'Adevărat' : 'Fals'}. `, x.explain ? h('span', { class: 'muted' }, x.explain) : null)));
      case 'categorii': {
        const r = raspuns || {};
        let k = 0;
        return lista(d.cats.flatMap((c) => c.items.map((x) => { const ok = detalii[k++]; return li(ok, `${x} → ${c.name}`, ok || !r[x] ? '' : ` (ai ales: ${r[x]})`); })));
      }
      case 'ordonare':
        return h('div', {}, h('b', {}, 'Ordinea corectă:'), h('ol', { class: 'correct-order' }, d.steps.map((s, i) => h('li', { class: detalii[i] ? 'ok' : 'bad' }, inline(s)))));
      case 'completare':
        return lista(T.golurile(d).map((g, i) => li(detalii[i], `Spațiul ${i + 1}: ${g.answers.join(' / ')}`, !detalii[i] && raspuns?.[i] ? ` (ai scris: „${raspuns[i]}”)` : '')));
      case 'calcul-tabelar':
        return O.listaVerificari(w?.verificari ? w.verificari(block) : O.checkSheet(d, raspuns || {}));
      case 'procesor-text':
        return O.listaVerificari(w?.verificari ? w.verificari(block) : d.cerinte.map((c, i) => ({ text: c.text, ok: Boolean(raspuns?.verificari?.[i]) })));
      case 'eseu':
        return h('div', { class: 'task-box' }, h('b', {}, 'Barem: '), d.barem ? inline(d.barem) : 'se corectează de profesor.');
      default:
        return null;
    }
  }

  function scorTotal(res, extra = '') {
    return h('div', { class: 'score-card' },
      h('div', { class: 'score-big' }, h('span', { class: 'kicker' }, 'Nota'), h('b', {}, fmtNota(res.nota))),
      h('div', {},
        h('p', {}, h('b', {}, `${fmtPuncte(res.punctaj)} din ${fmtPuncte(res.total)} puncte`)),
        res.inAsteptare ? h('p', { class: 'muted small' }, `${plural(res.inAsteptare, 'item se corectează', 'itemi se corectează')} de profesor; nota poate crește.`) : null,
        h('p', { class: 'muted small' }, 'Nota = 1 punct din oficiu + punctajul obținut, pe o scară de la 1 la 10.', extra)));
  }

  // Cronometru: numără invers până la termen (Date) și apelează laFinal o singură dată.
  function cronometru(termen, laFinal) {
    const el = h('span', { class: 'timer', role: 'timer', 'aria-live': 'off' });
    let gata = false;
    const tic = () => {
      const ramas = Math.max(0, termen - Date.now());
      const min = Math.floor(ramas / 60000), sec = Math.floor((ramas % 60000) / 1000);
      el.textContent = `⏱ ${min}:${String(sec).padStart(2, '0')}`;
      el.classList.toggle('low', ramas < 5 * 60000);
      if (ramas <= 0 && !gata) { gata = true; laFinal(); }
    };
    tic();
    const id = setInterval(tic, 1000);
    window.addEventListener('hashchange', () => clearInterval(id), { once: true });
    return el;
  }

  // =====================================================================
  // Test de antrenament (și previzualizarea profesorului): corectat în browser
  // =====================================================================
  function testLocal(m, blocks, intro, { previzualizare = false } = {}) {
    const zona = h('div', { class: 'test-zone' });
    const sesiune = C?.sesiune();
    function porneste() {
      const itemi = blocks.map((b) => T.faraRaspunsuri(b));
      const widgets = itemi.map((it, i) => itemWidget(it, i + 1, null, () => {}));
      const total = T.infoTest(blocks).puncte;
      const stare = h('p', { class: 'muted small', 'aria-live': 'polite' });
      const preda = h('button', { class: 'btn', type: 'button' }, 'Predă testul');
      const sus = h('div', { class: 'test-bar' },
        h('span', {}, h('b', {}, plural(itemi.length, 'item', 'itemi')), ` · ${fmtPuncte(total)} puncte`),
        m.timp ? cronometru(Date.now() + m.timp * 60000, () => { stare.textContent = 'Timpul recomandat a expirat. Poți preda testul când termini.'; }) : null);
      preda.addEventListener('click', () => {
        const raspunsuri = widgets.map((w) => w.get());
        const fara = itemi.filter((it, i) => !areRaspuns(it, raspunsuri[i])).length;
        if (fara && !confirm(`Nu ai răspuns la ${plural(fara, 'item', 'itemi')}. Predai totuși testul?`)) return;
        const res = T.noteazaTest(blocks, raspunsuri);
        widgets.forEach((w, i) => {
          w.blocheaza();
          w.marcheaza(res.detalii[i].detalii, blocks[i]);
          w.el.append(h('div', { class: 'item-result' },
            h('p', { class: 'item-score' }, res.detalii[i].manual ? 'Răspuns deschis – compară cu baremul:' : `${fmtPuncte(res.detalii[i].punctaj)} / ${fmtPuncte(res.detalii[i].max)} puncte`),
            corectura(blocks[i], raspunsuri[i], res.detalii[i].detalii, w)));
        });
        const reia = h('button', { class: 'btn ghost', type: 'button', onclick: () => { porneste(); zona.scrollIntoView({ behavior: 'smooth' }); } }, 'Reia testul');
        umple(jos, scorTotal(res), h('div', { class: 'row-actions' }, reia));
        jos.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!previzualizare && sesiune?.rol === 'elev') salveazaProgres(m, res);
      });
      const jos = h('div', { class: 'test-submit' }, preda, stare);
      umple(zona, sus, widgets.map((w) => w.el), jos);
    }
    porneste();
    return h('div', {}, intro, zona);
  }
  async function salveazaProgres(m, res) {
    // Testul de antrenament intră în progres ca un material terminat; punctajul (din prima) = procentul din puncte.
    const total = m.aplicatii;
    try {
      await C.api('POST', '/api/elev/progres', { materialId: m.id, total, rezolvate: total, dinPrima: Math.round((total * res.punctaj) / res.total), incercari: 1 });
    } catch { /* progresul nu e esențial aici */ }
  }

  // Textul din material fără blocurile itemilor (pentru introducerea testului).
  function faraItemi(src) {
    const out = [];
    const lines = src.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const mm = /^```\s*(\S+)/.exec(lines[i]);
      if (mm && I.typeOf(mm[1])) { while (++i < lines.length && !lines[i].startsWith('```')); continue; }
      out.push(lines[i]);
    }
    return out.join('\n');
  }

  hooks.renderTest = (m, src) => {
    const blocks = T.itemi(I.extract(src));
    return h('div', { class: 'prose' }, testLocal(m, blocks, markdown(faraItemi(src))));
  };
  hooks.testAside = (m) => h('div', { class: 'box' },
    h('h3', {}, 'Test de antrenament'),
    h('p', { class: 'muted' }, `${plural(m.nrItemi, 'item', 'itemi')} · ${fmtPuncte(m.puncte)} puncte${m.timp ? ` · ${m.timp} minute` : ''}`),
    h('p', { class: 'muted small' }, 'Poți relua testul de câte ori vrei. Corectura apare după ce predai.'));

  // =====================================================================
  // Elev: testele lansate de profesor
  // =====================================================================
  const STARE = { nou: ['nou', 'lucru'], inceput: ['în lucru', 'lucru'], predat: ['✓ predat', 'gata'] };
  routes.push({ pattern: /^\/teste$/, handler: async () => {
    const s = C?.sesiune();
    if (!s || s.rol !== 'elev') return void (location.hash = '#/intra');
    const lista = await C.api('GET', '/api/elev/teste');
    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, s.numeClasa || 'Teste'), h('h1', {}, 'Testele mele'),
        h('p', { class: 'muted' }, 'Aici apar testele lansate de profesor. Pentru exersare, încearcă testele de antrenament din lista de materiale.')),
      lista.length
        ? h('div', { class: 'mat-grid' }, lista.map((t) => h('div', { class: 'mat-card test-card' },
            h('div', {},
              h('h3', {}, t.titlu),
              h('div', { class: 'meta' },
                C.tag(...STARE[t.stare]),
                t.nrItemi ? C.tag(plural(t.nrItemi, 'item', 'itemi')) : null,
                C.tag(t.timp ? `${t.timp} minute` : 'fără limită de timp'),
                !t.deschisa && t.stare !== 'predat' ? C.tag('oprit de profesor') : null),
              t.rezultat && t.rezultat.nota != null
                ? h('p', { class: 'test-mark' }, `Nota ${fmtNota(t.rezultat.nota)} · ${fmtPuncte(t.rezultat.punctaj)} din ${fmtPuncte(t.rezultat.total)} puncte`, t.rezultat.inAsteptare ? ' (provizoriu)' : '')
                : t.stare === 'predat' ? h('p', { class: 'muted small' }, 'Predat. Profesorul îți va comunica rezultatul.') : null,
              t.stare !== 'predat' && t.deschisa ? h('a', { class: 'btn small', href: `#/test/${t.id}` }, t.stare === 'nou' ? 'Începe testul' : 'Continuă testul') : null))))
        : h('div', { class: 'empty' }, h('h3', {}, 'Niciun test deocamdată'), h('p', { class: 'muted' }, 'Când profesorul lansează un test, îl vei găsi aici.'))));
  } });

  routes.push({ pattern: /^\/test\/([\w-]+)$/, handler: async ([, lid]) => {
    const s = C?.sesiune();
    if (!s || s.rol !== 'elev') return void (location.hash = '#/intra');
    let t;
    try {
      t = await C.api('POST', `/api/elev/teste/${lid}/start`);
    } catch (e) {
      return show(h('div', { class: 'wrap narrow-page' }, h('div', { class: 'empty' }, h('h3', {}, 'Testul nu poate fi deschis'), h('p', { class: 'muted' }, e.message), h('a', { class: 'btn', href: '#/teste' }, 'Înapoi la teste'))));
    }
    const cheie = `edudigi_test_${lid}`;
    let salvat = t.raspunsuri || null;
    try { salvat = JSON.parse(localStorage.getItem(cheie) || 'null') || salvat; } catch { /* fără stocare */ }
    const stare = h('span', { class: 'muted small save-state', 'aria-live': 'polite' });
    let widgets = [];
    let timerSalvare = null, predat = false;
    const raspunsuri = () => widgets.map((w) => w.get());
    async function salveaza() {
      clearTimeout(timerSalvare);
      timerSalvare = null;
      if (predat) return;
      const r = raspunsuri();
      try { localStorage.setItem(cheie, JSON.stringify(r)); } catch { /* fără stocare */ }
      try {
        await C.api('POST', `/api/elev/teste/${lid}/salvare`, { raspunsuri: r });
        stare.textContent = `Salvat ${new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`;
      } catch (e) {
        stare.textContent = `Nesalvat pe server (${e.message}). Răspunsurile sunt păstrate pe acest calculator.`;
      }
    }
    const laSchimbare = () => {
      stare.textContent = 'Modificări nesalvate…';
      clearTimeout(timerSalvare);
      timerSalvare = setTimeout(salveaza, 2500);
    };
    widgets = t.itemi.map((it, i) => itemWidget(it, i + 1, Array.isArray(salvat) ? salvat[i] : null, laSchimbare));
    const zona = h('div', { class: 'test-zone' });
    async function preda(automat = false) {
      if (predat) return;
      const r = raspunsuri();
      if (!automat) {
        const fara = t.itemi.filter((it, i) => !areRaspuns(it, r[i])).length;
        if (!confirm(fara ? `Nu ai răspuns la ${plural(fara, 'item', 'itemi')}. Predai totuși testul? După predare nu mai poți modifica nimic.` : 'Predai testul? După predare nu mai poți modifica nimic.')) return;
      }
      predat = true;
      clearTimeout(timerSalvare);
      btn.disabled = true;
      let rez;
      try {
        rez = await C.api('POST', `/api/elev/teste/${lid}/predare`, { raspunsuri: r });
      } catch (e) {
        predat = false;
        btn.disabled = false;
        return alert(`Testul nu a putut fi predat: ${e.message}. Încearcă din nou.`);
      }
      try { localStorage.removeItem(cheie); } catch { /* fără stocare */ }
      afiseazaRezultat(rez);
    }
    function afiseazaRezultat(rez) {
      show(h('div', { class: 'wrap narrow-page' },
        h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Test predat'), h('h1', {}, t.titlu)),
        rez.intarziat ? h('p', { class: 'banner' }, 'Timpul expirase, așa că s-au notat ultimele răspunsuri salvate automat.') : null,
        rez.nota != null
          ? [scorTotal(rez), h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Punctaj'))),
              h('tbody', {}, rez.detalii.map((d, i) => h('tr', {}, h('td', {}, `${i + 1}. ${d.titlu.replace(/^Item(ul)?\s*\d+\.\s*/i, '')}`), h('td', {}, d.punctaj == null ? 'se corectează' : `${fmtPuncte(d.punctaj)} / ${fmtPuncte(d.max)}`))))))]
          : h('div', { class: 'empty' }, h('h3', {}, 'Testul a fost predat'), h('p', { class: 'muted' }, 'Profesorul îți va comunica rezultatul.')),
        h('p', {}, h('a', { class: 'btn ghost', href: '#/teste' }, 'Înapoi la teste'))));
    }
    const btn = h('button', { class: 'btn', type: 'button', onclick: () => preda(false) }, 'Predă testul');
    const decalaj = Date.now() - new Date(t.acum).getTime();
    const termen = t.termen ? new Date(t.termen).getTime() + decalaj : null;
    const sus = h('div', { class: 'test-bar sticky' },
      h('span', {}, h('b', {}, t.titlu), ` · ${plural(t.itemi.length, 'item', 'itemi')} · ${fmtPuncte(t.puncte)} puncte`),
      stare,
      termen ? cronometru(termen, () => { alert('Timpul a expirat. Testul se predă automat.'); preda(true); }) : h('span', { class: 'muted small' }, 'fără limită de timp'));
    umple(zona, sus, widgets.map((w) => w.el), h('div', { class: 'test-submit' }, btn, h('p', { class: 'muted small' }, 'Răspunsurile se salvează automat. Poți închide pagina și reveni, cât timp testul e deschis.')));
    show(h('div', { class: 'wrap test-page' }, h('p', { class: 'crumbs' }, h('a', { href: '#/teste' }, '← Testele mele')), zona));
    // Salvare la părăsirea paginii.
    const laAscundere = () => { if (document.hidden && timerSalvare) salveaza(); };
    document.addEventListener('visibilitychange', laAscundere);
    window.addEventListener('hashchange', () => { document.removeEventListener('visibilitychange', laAscundere); if (timerSalvare && !predat) salveaza(); }, { once: true });
  } });

  // =====================================================================
  // Profesor: secțiunea „Teste” din pagina clasei
  // =====================================================================
  hooks.panouClasa = (k, id) => {
    const sec = h('section', { class: 'card-box tests-box' }, h('h2', {}, 'Teste'), h('p', { class: 'muted' }, 'Se încarcă...'));
    (async () => {
      const [lansari, teste] = await Promise.all([C.api('GET', `/api/profesor/clase/${id}/lansari`), C.api('GET', '/api/profesor/teste')]);
      const potrivite = teste.filter((t) => t.clasa.includes(k.clasa.clasa));
      const altele = teste.filter((t) => !t.clasa.includes(k.clasa.clasa));
      const sel = h('select', { name: 'testId', required: true },
        potrivite.length ? h('optgroup', { label: clasaLabel([k.clasa.clasa]) }, potrivite.map((t) => h('option', { value: t.id }, t.titlu))) : null,
        altele.length ? h('optgroup', { label: 'Alte clase' }, altele.map((t) => h('option', { value: t.id }, `${t.titlu} (${clasaLabel(t.clasa)})`))) : null);
      const timp = h('input', { name: 'timp', type: 'number', min: 0, max: 240, inputmode: 'numeric' });
      const info = h('p', { class: 'muted small' });
      const prev = h('a', { class: 'link-btn' }, 'Previzualizează testul');
      const actualizeaza = () => {
        const t = teste.find((x) => x.id === sel.value);
        if (!t) return;
        timp.value = t.timp || '';
        info.textContent = `${plural(t.nrItemi, 'item', 'itemi')} · ${fmtPuncte(t.puncte)} puncte. ${t.descriere || ''}`;
        prev.href = `#/profesor/test/${t.id}`;
      };
      sel.addEventListener('change', actualizeaza);
      actualizeaza();
      const formLansare = teste.length ? C.formular([
        h('label', { class: 'field' }, h('span', {}, 'Test'), sel),
        info,
        h('label', { class: 'field' }, h('span', {}, 'Timp de lucru (minute; 0 = fără limită)'), timp),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'arata', checked: true }), h('span', {}, 'Elevii își văd nota imediat după predare')),
        prev,
      ], 'Lansează testul', async (d) => {
        const l = await C.api('POST', `/api/profesor/clase/${id}/lansari`, { testId: d.testId, timp: d.timp === '' ? null : Number(d.timp), arataRezultate: Boolean(d.arata) });
        location.hash = `#/profesor/lansare/${l.id}`;
      }) : h('p', { class: 'muted' }, 'Nu există încă teste pentru profesor (fișiere cu „mod: profesor” în materiale/).');
      umple(sec,
        h('h2', {}, 'Teste'),
        h('p', { class: 'muted small' }, 'Testul lansat apare elevilor clasei în „Testele mele”. Corectarea se face automat; răspunsurile deschise le punctezi tu.'),
        lansari.length ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {}, ['Test', 'Lansat', 'Stare', 'Predate', 'Media notelor'].map((x) => h('th', {}, x)))),
          h('tbody', {}, lansari.map((l) => h('tr', {},
            h('td', {}, h('a', { href: `#/profesor/lansare/${l.id}` }, l.titlu)),
            h('td', {}, C.cand(l.creatLa)),
            h('td', {}, l.deschisa ? C.tag('deschis', 'gata') : C.tag('oprit')),
            h('td', {}, `${l.predate} (${l.incepute} începute)`),
            h('td', {}, fmtNota(l.mediaNota))))))) : null,
        h('details', { class: 'launch', open: !lansari.length }, h('summary', {}, 'Lansează un test nou'), formLansare));
    })().catch((e) => umple(sec, h('h2', {}, 'Teste'), h('p', { class: 'error' }, e.message)));
    return sec;
  };

  // Previzualizare: profesorul rezolvă testul ca un elev și vede corectura.
  routes.push({ pattern: /^\/profesor\/test\/([a-z0-9-]+)$/, handler: async ([, tid]) => {
    const s = C?.sesiune();
    if (!s || s.rol !== 'profesor') return void (location.hash = '#/intra');
    const t = await C.api('GET', `/api/profesor/teste/${tid}`);
    show(h('div', { class: 'wrap test-page' },
      h('p', { class: 'crumbs' }, h('button', { class: 'link-btn', type: 'button', onclick: () => history.back() }, '← Înapoi')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `Previzualizare · ${clasaLabel(t.clasa)}`), h('h1', {}, t.titlu),
        h('p', { class: 'muted' }, `${plural(t.nrItemi, 'item', 'itemi')} · ${fmtPuncte(t.puncte)} puncte${t.timp ? ` · ${t.timp} minute` : ''}. Elevii văd testul fără răspunsuri; aici îl poți încerca și vedea corectura.`)),
      h('div', { class: 'prose' }, testLocal({ ...t, aplicatii: t.nrItemi }, t.itemi, null, { previzualizare: true }))));
  } });

  // Rezultatele unei lansări.
  routes.push({ pattern: /^\/profesor\/lansare\/([\w-]+)$/, handler: async ([, lid]) => {
    const s = C?.sesiune();
    if (!s || s.rol !== 'profesor') return void (location.hash = '#/intra');
    const r = await C.api('GET', `/api/profesor/lansari/${lid}`);
    const { lansare: l, test } = r;
    const predate = r.elevi.filter((e) => e.predat_la);
    const note = predate.map((e) => e.nota).filter((n) => n != null);
    const media = note.length ? note.reduce((a, b) => a + b, 0) / note.length : null;
    const detaliu = h('div');
    const stareBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
      if (l.deschisa && !confirm('Oprești testul? Elevii care lucrează mai au 2 minute să predea; cei care nu l-au început nu-l mai pot începe.')) return;
      await C.api('POST', `/api/profesor/lansari/${lid}/stare`, { deschisa: !l.deschisa });
      render();
    } }, l.deschisa ? 'Oprește testul' : 'Redeschide testul');
    const arataBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
      await C.api('POST', `/api/profesor/lansari/${lid}/stare`, { deschisa: l.deschisa, arataRezultate: !l.arataRezultate });
      render();
    } }, l.arataRezultate ? 'Ascunde notele de elevi' : 'Arată notele elevilor');
    const exportCsv = () => {
      const cap = ['Elev', 'Stare', 'Început', 'Predat', ...(test ? test.itemi.map((it, i) => `Item ${i + 1} (${T.puncteItem(it)}p)`) : []), 'Punctaj', 'Total', 'Nota'];
      const randuri = r.elevi.map((e) => [e.pseudonim, e.predat_la ? 'predat' : e.inceput_la ? 'în lucru' : 'neînceput',
        e.inceput_la ? new Date(e.inceput_la).toLocaleString('ro-RO') : '', e.predat_la ? new Date(e.predat_la).toLocaleString('ro-RO') : '',
        ...(test ? test.itemi.map((it, i) => (e.detalii?.[i]?.punctaj == null ? '' : String(e.detalii[i].punctaj).replace('.', ','))) : []),
        e.punctaj == null ? '' : String(e.punctaj).replace('.', ','), e.total ?? '', e.nota == null ? '' : String(e.nota).replace('.', ',')]);
      C.descarcaCSV(`${l.titlu.replace(/\W+/g, '_').slice(0, 40)}.csv`, [cap, ...randuri]);
    };
    function arataElev(e, derulare = true) {
      if (!test) return umple(detaliu, h('p', { class: 'error' }, 'Testul nu mai există pe platformă; nu se pot afișa răspunsurile.'));
      const raspunsuri = e.raspunsuri || [];
      const res = T.noteazaTest(test.itemi, raspunsuri, e.manual || {});
      umple(detaliu, h('section', { class: 'card-box student-answers', id: 'raspunsuri' },
        h('div', { class: 'row-actions spread' },
          h('h2', {}, `Răspunsurile lui ${e.pseudonim}`),
          h('button', { class: 'btn ghost small danger', type: 'button', onclick: async () => {
            if (!confirm(`Ștergi rezultatul lui ${e.pseudonim}? Elevul va putea relua testul (cât timp e deschis).`)) return;
            await C.api('DELETE', `/api/profesor/lansari/${lid}/elevi/${e.id}`);
            render();
          } }, 'Permite reluarea')),
        e.predat_la ? scorTotal(res) : h('p', { class: 'banner' }, 'Testul nu a fost predat încă; mai jos sunt ultimele răspunsuri salvate automat.'),
        test.itemi.map((b, i) => {
          const d = res.detalii[i];
          const item = h('div', { class: 'answer-item' },
            h('div', { class: 'item-head' }, h('span', { class: 'item-nr' }, `Itemul ${i + 1}`), h('span', { class: 'act-type' }, I.TYPES[b.type]),
              h('span', { class: 'item-pts' }, d.punctaj == null ? `— / ${fmtPuncte(d.max)}` : `${fmtPuncte(d.punctaj)} / ${fmtPuncte(d.max)}`)),
            b.title ? h('h3', { class: 'item-title' }, inline(b.title.replace(/^Item(ul)?\s*\d+\.\s*/i, ''))) : null);
          if (b.type === 'eseu') {
            const inp = h('input', { type: 'number', min: 0, max: d.max, step: '0.5', value: d.punctaj ?? '', 'aria-label': 'Punctaj' });
            const msg = h('span', { class: 'muted small', 'aria-live': 'polite' });
            item.append(h('p', { class: 'eseu-q' }, inline(b.data.intrebare)),
              h('blockquote', { class: 'student-text' }, raspunsuri[i] ? String(raspunsuri[i]) : h('em', {}, '(fără răspuns)')),
              corectura(b, raspunsuri[i], d.detalii),
              e.predat_la ? h('div', { class: 'row-actions' }, h('label', { class: 'field inline' }, h('span', {}, `Punctaj (0–${fmtPuncte(d.max)})`), inp),
                h('button', { class: 'btn small', type: 'button', onclick: async () => {
                  try {
                    const n = await C.api('POST', `/api/profesor/lansari/${lid}/elevi/${e.id}/punctaj`, { index: i, puncte: inp.value === '' ? null : inp.value });
                    Object.assign(e, { manual: n.manual, punctaj: n.punctaj, nota: n.nota, detalii: n.detalii });
                    tabelEl.replaceWith((tabelEl = tabel()));
                    arataElev(e, false);
                  } catch (ex) { msg.textContent = ex.message; }
                } }, 'Salvează punctajul'), msg) : null);
          } else {
            if (b.type === 'procesor-text' && raspunsuri[i]?.html) item.append(h('div', { class: 'doc-preview' }, h('div', { class: 'doc-page' }, O.docSigur(raspunsuri[i].html))));
            item.append(corectura(b, raspunsuri[i], d.detalii));
          }
          return item;
        })));
      if (derulare) detaliu.scrollIntoView({ behavior: 'smooth' });
    }
    let tabelEl;
    const tabel = () => h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
      h('thead', {}, h('tr', {}, ['Elev', 'Stare', 'Predat', 'Punctaj', 'Nota', ''].map((x) => h('th', {}, x)))),
      h('tbody', {}, r.elevi.map((e) => h('tr', {},
        h('td', {}, e.pseudonim),
        h('td', {}, e.predat_la ? C.tag('✓ predat', 'gata') : e.inceput_la ? C.tag('în lucru', 'lucru') : C.tag('neînceput', 'urma')),
        h('td', {}, e.predat_la ? C.cand(e.predat_la) : '—'),
        h('td', {}, e.punctaj == null || !e.predat_la ? '—' : `${fmtPuncte(e.punctaj)} / ${fmtPuncte(e.total)}`, e.predat_la && e.detalii?.some((d) => d.manual && d.punctaj == null) ? C.tag('de corectat', 'lucru') : null),
        h('td', {}, h('b', {}, fmtNota(e.nota))),
        h('td', {}, e.inceput_la ? h('button', { class: 'link-btn', type: 'button', onclick: () => arataElev(e) }, 'Vezi răspunsurile') : null))))));
    tabelEl = tabel();
    show(h('div', { class: 'wrap list-page' },
      h('p', { class: 'crumbs' }, h('a', { href: `#/profesor/clasa/${l.clasaId}` }, '← Clasa')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `Test lansat ${C.cand(l.creatLa)}`), h('h1', {}, l.titlu)),
      h('div', { class: 'stat-grid' },
        C.stat(`${predate.length}/${r.elevi.length}`, 'au predat'),
        C.stat(String(r.elevi.filter((e) => e.inceput_la && !e.predat_la).length), 'în lucru'),
        C.stat(fmtNota(media), 'media notelor'),
        C.stat(l.timp ? `${l.timp} min` : 'fără limită', 'timp de lucru')),
      h('div', { class: 'row-actions' },
        l.deschisa ? C.tag('deschis', 'gata') : C.tag('oprit'), stareBtn, arataBtn,
        h('button', { class: 'btn ghost small', type: 'button', onclick: exportCsv }, '⬇ Export CSV (Excel)'),
        test ? h('a', { class: 'btn ghost small', href: `#/profesor/test/${test.id}` }, 'Vezi testul') : null,
        h('button', { class: 'btn ghost small danger', type: 'button', onclick: async () => {
          if (!confirm('Ștergi această lansare și toate rezultatele ei?')) return;
          await C.api('DELETE', `/api/profesor/lansari/${lid}`);
          location.hash = `#/profesor/clasa/${l.clasaId}`;
        } }, 'Șterge lansarea')),
      r.elevi.length ? tabelEl : h('p', { class: 'muted' }, 'Clasa nu are elevi înscriși.'),
      detaliu));
  } });
})();

'use strict';
// „Python – de la zero” (#/python): secțiune separată, doar despre Python. Lecții cu teorie, exemple care se rulează pe loc
// și exerciții verificate automat; provocări și un memorator. Programele rulează în interpretorul din Editorul Python
// (Web Worker creat din /js/aplicatii/python.js), deci nu se instalează nimic. Progresul rămâne în browser.
(() => {
  if (!window.EduApp || !window.PyCurs) return;
  const { h, show, routes } = window.EduApp;
  const { MODULE, PROVOCARI, MEMORATOR, EROARI } = window.PyCurs;
  const SCRIPT = '/js/aplicatii/python.js';
  const CHEIE = 'edudigi_python_academie';
  const TOATE = MODULE.flatMap((m) => m.lectii.map((l) => ({ ...l, mod: m })));

  // ---------- Progres ----------
  let P = { lectii: {}, prov: {}, asoc: {}, runde: 0, xp: 0 };
  try { Object.assign(P, JSON.parse(localStorage.getItem(CHEIE) || '{}')); } catch { /* fără stocare */ }
  const salveaza = () => { try { localStorage.setItem(CHEIE, JSON.stringify(P)); } catch { /* ignorat */ } };
  const GRADE = [[0, '🥚', 'Ou de piton'], [40, '🐣', 'Pui de piton'], [120, '🐍', 'Piton începător'], [250, '🐉', 'Programator'], [450, '🏆', 'Maestru Python']];
  const grad = (xp) => [...GRADE].reverse().find((g) => xp >= g[0]);
  const urmGrad = (xp) => GRADE.find((g) => g[0] > xp);
  const xpMax = TOATE.length * 25 + PROVOCARI.reduce((s, p) => s + 15 * p.niv, 0);
  const faceLectie = (id) => !!P.lectii[id];

  // ---------- Text și cod ----------
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inl = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const KW = new Set(['False', 'None', 'True', 'and', 'as', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'for', 'from', 'if', 'import', 'in', 'is', 'lambda', 'not', 'or', 'pass', 'return', 'while', 'with']);
  const BI = new Set(['print', 'input', 'int', 'float', 'str', 'bool', 'list', 'dict', 'range', 'len', 'abs', 'min', 'max', 'sum', 'round', 'sorted', 'type', 'enumerate']);
  function evid(src) {
    let o = '', i = 0, dupaDef = false;
    const n = src.length, sp = (c, s) => `<span class="${c}">${esc(s)}</span>`;
    while (i < n) {
      const c = src[i];
      if (c === '#') { let j = src.indexOf('\n', i); if (j < 0) j = n; o += sp('c', src.slice(i, j)); i = j; continue; }
      const mq = /^([fFrRbB]?)('''|"""|'|")/.exec(src.slice(i, i + 4));
      if (mq && !(mq[1] && /\w/.test(src[i - 1] || ''))) {
        const q = mq[2]; let j = i + mq[0].length;
        while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (src.startsWith(q, j)) { j += q.length; break; } if (q.length === 1 && src[j] === '\n') break; j++; }
        o += sp('s', src.slice(i, Math.min(j, n))); i = Math.min(j, n); continue;
      }
      if (/[0-9]/.test(c) && !/\w/.test(src[i - 1] || '')) { const m = /^\d[\d_]*\.?\d*/.exec(src.slice(i)); o += sp('n', m[0]); i += m[0].length; continue; }
      if (/[\p{L}_]/u.test(c)) {
        let j = i + 1; while (j < n && /[\p{L}\p{N}_]/u.test(src[j])) j++;
        const w = src.slice(i, j);
        if (dupaDef) { o += sp('d', w); dupaDef = false; } else if (KW.has(w)) { o += sp('k', w); dupaDef = w === 'def'; } else if (BI.has(w) && src[i - 1] !== '.') o += sp('b', w); else o += esc(w);
        i = j; continue;
      }
      o += esc(c); i++;
    }
    return `${o}\n`;
  }
  const codBloc = (src) => h('div', { class: 'pya-codbloc' }, h('pre', { html: evid(src.replace(/\n$/, '')) }));

  // ---------- Rularea unui program într-un Web Worker ----------
  // opt: intrari (listă: se dau automat și se ignoră mesajele input()), laInput(cb) pentru mod interactiv,
  // laOut(text, tip), timp (ms). Returnează { oprire(), promisiune → { ok, iesire, eroare } }.
  function ruleaza(cod, opt = {}) {
    let worker = null, timer = null, gata = false, iesire = '', k = 0;
    const promisiune = new Promise((res) => {
      const termina = (r) => { if (gata) return; gata = true; clearTimeout(timer); try { worker?.terminate(); } catch { /* ignorat */ } res({ iesire, ...r }); };
      try { worker = new Worker(SCRIPT); } catch { return termina({ ok: false, eroare: { text: 'Acest browser nu permite rularea programelor Python.\n', expl: '' } }); }
      worker.onerror = (e) => { e.preventDefault?.(); termina({ ok: false, eroare: { text: 'Motorul Python nu a putut porni.\n', expl: '' } }); };
      worker.onmessage = (e) => {
        const m = e.data;
        if (m.t === 'lot') { for (const x of m.l) if (x.t === 'out') { iesire += x.s; opt.laOut?.(x.s, x.k === 'e' ? 'e' : 'o'); } return; }
        if (m.t === 'input') {
          if (opt.intrari) {
            iesire = iesire.slice(0, iesire.lastIndexOf('\n') + 1); // textul rămas pe rând este mesajul din input("…")
            worker.postMessage({ c: 'input', text: k < opt.intrari.length ? opt.intrari[k++] : null });
          } else opt.laInput?.((t) => { if (!gata) worker.postMessage({ c: 'input', text: t }); });
          return;
        }
        if (m.t === 'gata') termina({ ok: !!(m.rez && m.rez.ok), eroare: m.rez && m.rez.eroare, fisiere: m.fisiere || {} });
      };
      if (opt.timp) timer = setTimeout(() => termina({ ok: false, timp: true, eroare: { text: 'Programul rulează prea mult (poate o buclă infinită?).\n', expl: '' } }), opt.timp);
      worker.postMessage({ c: 'run', cod, fisier: 'program.py', fisiere: opt.fisiere });
    });
    return { oprire: () => { if (!gata) { gata = true; clearTimeout(timer); try { worker?.terminate(); } catch { /* ignorat */ } opt.laOprire?.(); } }, promisiune };
  }
  const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
  // Un test: { i, o } sau cu fișiere { f: fișiere puse la dispoziție, fo: fișiere așteptate la final } sau cu acțiuni tkinter
  // { dupa: cod adăugat după program, o } (se compară doar rândurile „@R|…”). Cerințe de cod: ['text', mesaj] (trebuie să apară)
  // sau ['NU:text', mesaj] (nu are voie să apară).
  async function verifica(cod, teste, cerinte) {
    for (const [sub, mesaj] of cerinte || []) {
      if (sub.startsWith('NU:')) { if (cod.includes(sub.slice(3))) return { ok: false, cerinta: mesaj, rez: [] }; }
      else if (!cod.includes(sub)) return { ok: false, cerinta: mesaj, rez: [] };
    }
    const rez = [];
    for (let i = 0; i < teste.length; i++) {
      const t = teste[i];
      const program = t.dupa ? `${cod}\n${t.dupa}\n` : cod;
      const r = await ruleaza(program, { intrari: (t.i || '').split('\n').filter((_, j, a) => j < a.length - 1 || a[j] !== ''), fisiere: t.f, timp: 5000 }).promisiune;
      const iesire = t.dupa ? r.iesire.split('\n').filter((l) => l.startsWith('@R|')).map((l) => l.slice(3)).join('\n') : r.iesire;
      let ok = r.ok && norm(iesire) === norm(t.o || '');
      if (ok && t.fo) for (const [k, v] of Object.entries(t.fo)) if (norm((r.fisiere || {})[k] || '') !== norm(v)) ok = false;
      rez.push({ ok, i: t.i || '', o: t.o || '', f: t.f, fo: t.fo, dupa: t.dupa, primit: iesire, fisiere: r.fisiere, eroare: !r.ok ? r.eroare : null, vizibil: i < 2 });
      if (r.timp) break; // o buclă infinită nu mai este încercată și pe celelalte teste
    }
    return { ok: rez.length === teste.length && rez.every((x) => x.ok), rez };
  }

  // ---------- Consola ----------
  function consola() {
    const el = h('div', { class: 'pya-consola', role: 'log', 'aria-live': 'polite', tabindex: '0', 'aria-label': 'Ieșirea programului' });
    let formular = null;
    const gol = () => h('span', { class: 'pya-gol' }, 'Ieșirea programului apare aici.');
    el.append(gol());
    const curat = () => { if (el.firstChild?.classList?.contains('pya-gol')) el.replaceChildren(); };
    const api = {
      el,
      sterge() { formular = null; el.replaceChildren(gol()); },
      scrie(txt, tip = 'o') { curat(); formular?.remove(); formular = null; const u = el.lastChild; if (u && u.dataset?.tip === tip && u.tagName === 'SPAN') u.append(txt); else { const s = h('span', { class: `pya-${tip}` }, txt); s.dataset.tip = tip; el.append(s); } el.scrollTop = el.scrollHeight; },
      info(txt) { curat(); el.append(h('div', { class: 'pya-info' }, txt)); },
      eroare(er) {
        if (!er) return; curat();
        el.append(h('pre', { class: 'pya-e' }, er.text));
        if (er.expl) el.append(h('div', { class: 'pya-expl' }, h('b', {}, '💡 '), er.expl));
        el.scrollTop = el.scrollHeight;
      },
      cere(cb) {
        curat();
        const inp = h('input', { class: 'pya-in', type: 'text', 'aria-label': 'Scrie datele cerute și apasă Enter', autocomplete: 'off', spellcheck: 'false' });
        formular = h('form', { class: 'pya-inform' }, h('span', { class: 'pya-cursor', 'aria-hidden': 'true' }, '›'), inp, h('button', { class: 'pya-btn mic', type: 'submit' }, 'Enter'));
        formular.addEventListener('submit', (e) => { e.preventDefault(); const t = inp.value; formular.remove(); formular = null; const s = h('span', { class: 'pya-citit' }, `${t}\n`); s.dataset.tip = 'citit'; el.append(s); cb(t); });
        el.append(formular); el.scrollTop = el.scrollHeight; inp.focus({ preventScroll: true });
      },
    };
    return api;
  }

  // ---------- Editorul de cod (cu colorare) ----------
  function editor(cod, { min = 5, laRulare } = {}) {
    const LH = 22, PAD = 12;
    const hl = h('pre', { class: 'pya-hl', 'aria-hidden': 'true' });
    const ta = h('textarea', { class: 'pya-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': 'Cod Python (Ctrl+Enter rulează)' });
    const nr = h('div', { class: 'pya-nr', 'aria-hidden': 'true' });
    const caseta = h('div', { class: 'pya-ed' }, hl, ta);
    const el = h('div', { class: 'pya-edwrap' }, nr, caseta);
    const redau = () => {
      const v = ta.value, n = Math.max(min, v.split('\n').length + 1);
      hl.innerHTML = evid(v);
      nr.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
      ta.style.height = `${n * LH + PAD * 2}px`;
    };
    const insereaza = (t) => { const a = ta.selectionStart; ta.setRangeText(t, a, ta.selectionEnd, 'end'); redau(); };
    ta.addEventListener('input', redau);
    ta.addEventListener('scroll', () => { hl.style.transform = `translateX(${-ta.scrollLeft}px)`; });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); insereaza('    '); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); laRulare?.(); }
      else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        const v = ta.value, a = ta.selectionStart, inc = v.lastIndexOf('\n', a - 1) + 1;
        const linie = v.slice(inc, a), sp = /^ */.exec(linie)[0];
        e.preventDefault(); insereaza(`\n${sp}${/:\s*$/.test(linie) ? '    ' : ''}`);
      } else if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
        const v = ta.value, a = ta.selectionStart, inc = v.lastIndexOf('\n', a - 1) + 1;
        if (a > inc && /^ +$/.test(v.slice(inc, a)) && (a - inc) % 4 === 0) { e.preventDefault(); ta.setRangeText('', a - 4, a, 'end'); redau(); }
      }
    });
    ta.value = cod; redau();
    return { el, ta, get: () => ta.value, set: (c) => { ta.value = c; redau(); } };
  }

  // ---------- Teoria ----------
  function teorie(blocuri) {
    return blocuri.map((b) => {
      if (b.p) return h('p', { class: 'pya-p', html: inl(b.p) });
      if (b.cod) return codBloc(b.cod);
      if (b.lista) return h('ul', { class: 'pya-lista' }, b.lista.map((x) => h('li', { html: inl(x) })));
      if (b.nota) return h('div', { class: 'pya-caseta nota' }, h('span', { class: 'pya-caseta-i', 'aria-hidden': 'true' }, '💡'), h('div', { html: inl(b.nota) }));
      if (b.atentie) return h('div', { class: 'pya-caseta atentie' }, h('span', { class: 'pya-caseta-i', 'aria-hidden': 'true' }, '⚠️'), h('div', { html: inl(b.atentie) }));
      if (b.tabel) return h('div', { class: 'pya-tabel-w' }, h('table', { class: 'pya-tabel' }, h('thead', {}, h('tr', {}, b.tabel.cap.map((c) => h('th', {}, c)))), h('tbody', {}, b.tabel.rows.map((r) => h('tr', {}, r.map((c) => h('td', { html: inl(c) })))))));
      return null;
    });
  }

  // ---------- Panoul „Încearcă” (rulare liberă) ----------
  function panouIncearca(cod, intrari) {
    const ed = editor(cod, { min: 6, laRulare: () => porneste() });
    const con = consola();
    let cur = null;
    const run = h('button', { class: 'pya-btn verde', type: 'button', onclick: () => porneste() }, '▶ Rulează');
    const stop = h('button', { class: 'pya-btn rosu', type: 'button', hidden: true, onclick: () => cur?.oprire() }, '■ Oprește');
    const reset = h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { cur?.oprire(); ed.set(cod); con.sterge(); } }, '↺ Revino la exemplu');
    function porneste() {
      cur?.oprire(); con.sterge(); run.disabled = true; stop.hidden = false;
      const rest = [...(intrari || [])];
      con.info('Rulează…');
      let primul = true;
      const lucru = ruleaza(ed.get(), {
        timp: 0,
        laOut: (t, tip) => { if (primul) { con.sterge(); primul = false; } con.scrie(t, tip); },
        laInput: (cb) => { if (primul) { con.sterge(); primul = false; } con.cere(cb); },
        laOprire: () => { run.disabled = false; stop.hidden = true; con.info('Programul a fost oprit.'); },
      });
      cur = lucru;
      lucru.promisiune.then((r) => { if (cur !== lucru) return; run.disabled = false; stop.hidden = true; if (primul) { con.sterge(); } if (r.eroare) con.eroare(r.eroare); else if (primul) con.info('Programul s-a terminat fără să afișeze nimic.'); });
      void rest;
    }
    return h('div', { class: 'pya-incearca' }, ed.el, h('div', { class: 'pya-bara' }, run, stop, reset, h('span', { class: 'pya-sfat' }, 'Modifică codul și rulează din nou. Scurtătură: Ctrl + Enter')), con.el);
  }

  // ---------- Asociere: unește perechile ----------
  const CULORI_A = ['#2F6FC4', '#E2711D', '#1E9E5A', '#D6336C', '#7A3FB8', '#0E9F94'];
  function panouAsociere(perechi, { laGata, mesajFinal }) {
    const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    const radacina = h('div', { class: 'pya-asoc' });
    function porneste() {
      const stanga = shuffle(perechi.map((p, k) => ({ ...p, k }))), dreapta = shuffle(perechi.map((p, k) => ({ ...p, k })));
      let sel = null, selD = null, perechiGasite = 0, greseli = 0, blocat = false;
      const info = h('p', { class: 'pya-asoc-info', role: 'status', 'aria-live': 'polite' }, 'Atinge un element din stânga, apoi pe cel care i se potrivește din dreapta.');
      const contor = h('span', { class: 'pya-asoc-contor' }, `0 / ${perechi.length} perechi`);
      const mk = (it, parte) => {
        const b = h('button', { type: 'button', class: `pya-ac ${parte === 's' ? 'lft' : 'rgt'}${parte === 'd' && it.cod ? ' ecran' : ''}`, 'aria-pressed': 'false' });
        if (parte === 's') b.append(h('pre', { html: evid(it.s.replace(/\n$/, '')) })); else b.append(h('span', { class: 'pya-ac-txt' }, it.r));
        b.dataset.k = String(it.k);
        b.addEventListener('click', () => click(b, parte, it));
        return b;
      };
      const bs = stanga.map((it) => mk(it, 's')), bd = dreapta.map((it) => mk(it, 'd'));
      function click(b, parte, it) {
        if (blocat || b.classList.contains('potrivit')) return;
        const curent = parte === 's' ? sel : selD;
        if (curent) { curent.b.classList.remove('sel'); curent.b.setAttribute('aria-pressed', 'false'); }
        if (curent && curent.b === b) { if (parte === 's') sel = null; else selD = null; return; }
        b.classList.add('sel'); b.setAttribute('aria-pressed', 'true');
        if (parte === 's') sel = { b, it }; else selD = { b, it };
        if (!(sel && selD)) return;
        const bun = sel.it.k === selD.it.k, a = sel.b, c = selD.b;
        sel = null; selD = null;
        if (bun) {
          const col = CULORI_A[perechiGasite % CULORI_A.length]; perechiGasite++;
          for (const x of [a, c]) { x.classList.remove('sel'); x.classList.add('potrivit'); x.setAttribute('aria-pressed', 'true'); x.disabled = true; x.style.setProperty('--c', col); x.append(h('span', { class: 'pya-ac-nr', 'aria-hidden': 'true' }, String(perechiGasite))); }
          contor.textContent = `${perechiGasite} / ${perechi.length} perechi`;
          info.className = 'pya-asoc-info ok'; info.textContent = '✔ Perfect, se potrivesc!';
          if (perechiGasite === perechi.length) sfarsit();
        } else {
          greseli++; blocat = true;
          for (const x of [a, c]) { x.classList.add('rau'); }
          info.className = 'pya-asoc-info rau'; info.textContent = 'Nu se potrivesc. Gândește-te ce afișează sau ce înseamnă și încearcă din nou.';
          setTimeout(() => { for (const x of [a, c]) { x.classList.remove('rau', 'sel'); x.setAttribute('aria-pressed', 'false'); } blocat = false; }, 650);
        }
      }
      function sfarsit() {
        const stele = greseli === 0 ? 3 : greseli <= 2 ? 2 : 1;
        info.className = 'pya-asoc-info ok';
        info.replaceChildren(h('b', {}, `🎉 Ai unit toate perechile! ${'★'.repeat(stele)}${'☆'.repeat(3 - stele)}`), ` ${greseli ? `Ai greșit de ${greseli} ${greseli === 1 ? 'dată' : 'ori'}.` : 'Fără nicio greșeală!'} `, laGata ? laGata(stele) : null, h('button', { class: 'pya-btn alb mic', type: 'button', onclick: porneste }, '↺ Încă o dată'));
      }
      radacina.replaceChildren(
        h('div', { class: 'pya-asoc-cap' }, contor, h('span', { class: 'pya-sfat' }, mesajFinal || 'Un element din stânga ↔ unul din dreapta')),
        h('div', { class: 'pya-asoc-grila' }, h('div', { class: 'pya-asoc-col' }, bs), h('div', { class: 'pya-asoc-col' }, bd)), info);
    }
    porneste();
    return radacina;
  }

  // ---------- Panoul exercițiului (verificare automată) ----------
  function panouExercitiu(ex, { id, cheie, xp, laReusit, deja, extra }) {
    const ed = editor(ex.start || '', { min: 8, laRulare: () => verif() });
    const rezultat = h('div', { class: 'pya-rezultat', role: 'status', 'aria-live': 'polite' });
    const indiciiEl = h('div', { class: 'pya-indicii' });
    let nrIndicii = 0, esecuri = 0, ocupat = false, solVazuta = false;
    const verifBtn = h('button', { class: 'pya-btn verde mare', type: 'button', onclick: () => verif() }, '✔ Verifică');
    const indBtn = h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { if (nrIndicii < ex.indicii.length) { indiciiEl.append(h('div', { class: 'pya-indiciu' }, h('b', {}, `💡 Indiciul ${nrIndicii + 1}: `), h('span', { html: inl(ex.indicii[nrIndicii]) }))); nrIndicii++; } if (nrIndicii >= ex.indicii.length) indBtn.disabled = true; solBtn.hidden = false; } }, '💡 Indiciu');
    const solBtn = h('button', { class: 'pya-btn alb', type: 'button', hidden: true, onclick: () => {
      if (!solVazuta && !confirm('Sigur vrei să vezi soluția? Este mai bine să mai încerci puțin.')) return;
      solVazuta = true;
      indiciiEl.append(h('div', { class: 'pya-indiciu sol' }, h('b', {}, '👀 Soluția de referință:'), codBloc(ex.solutie), h('button', { class: 'pya-btn alb mic', type: 'button', onclick: () => ed.set(ex.solutie) }, 'Pune soluția în editor')));
      solBtn.disabled = true;
    } }, '👀 Soluția');
    const rezet = h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { ed.set(ex.start || ''); rezultat.replaceChildren(); } }, '↺ Reia');
    async function verif() {
      if (ocupat) return; ocupat = true; verifBtn.disabled = true;
      rezultat.className = 'pya-rezultat lucru'; rezultat.replaceChildren('⏳ Se verifică programul pe ' + ex.teste.length + ' teste…');
      let r;
      try { r = await verifica(ed.get(), ex.teste, ex.cod); } finally { ocupat = false; verifBtn.disabled = false; }
      if (r.cerinta) { esecuri++; rezultat.className = 'pya-rezultat rau'; rezultat.replaceChildren(h('b', {}, 'Mai ai de lucrat: '), r.cerinta); if (esecuri >= 2) solBtn.hidden = false; return; }
      const buni = r.rez.filter((x) => x.ok).length, totalT = ex.teste.length;
      if (r.ok) {
        const nou = !deja();
        rezultat.className = 'pya-rezultat bun';
        rezultat.replaceChildren(h('div', { class: 'pya-bravo' }, h('span', { class: 'pya-bravo-e', 'aria-hidden': 'true' }, '🎉'), h('div', {}, h('b', {}, `Corect! ${buni} din ${totalT} teste trecute.`), h('p', {}, nou ? `Ai câștigat ${xp} puncte de experiență (XP).` : 'Ai mai rezolvat o dată acest exercițiu.'))), laReusit(nou));
        return;
      }
      esecuri++;
      const gresit = r.rez.find((x) => !x.ok);
      rezultat.className = 'pya-rezultat rau';
      const detalii = [h('b', {}, `Încă nu e bine: ${buni} din ${totalT} teste trecute.`)];
      if (gresit.eroare) { detalii.push(h('p', {}, 'Programul s-a oprit cu o eroare:'), h('pre', { class: 'pya-e' }, gresit.eroare.text)); if (gresit.eroare.expl) detalii.push(h('div', { class: 'pya-expl' }, h('b', {}, '💡 '), gresit.eroare.expl)); }
      else if (gresit.vizibil) {
        const fisString = (o) => Object.entries(o || {}).map(([k, v]) => `${k}:\n${String(v).replace(/\n$/, '')}`).join('\n\n');
        const intrare = gresit.dupa ? `(se simulează: ${gresit.dupa.split('\n').filter((l) => !l.startsWith('import') && !l.startsWith('print')).map((l) => l.replace(/_t\./g, '').replace(/_gaseste\("(\w+)", (\d)\)/g, '$1 #$2')).join('; ')})` : gresit.f ? `Fișiere date:\n${fisString(gresit.f)}` : gresit.i.trim() === '' ? '(nu se citește nimic)' : gresit.i.replace(/\n$/, '');
        const col = [
          h('div', {}, h('b', {}, gresit.dupa ? 'Acțiuni simulate' : 'Date de intrare'), h('pre', {}, intrare)),
          h('div', {}, h('b', {}, gresit.dupa ? 'Textul etichetei ar trebui să fie' : 'Ar trebui să afișeze'), h('pre', {}, gresit.o.replace(/\n$/, '') || '(nimic)')),
          h('div', {}, h('b', {}, gresit.dupa ? 'Textul etichetei în programul tău' : 'Programul tău a afișat'), h('pre', {}, gresit.primit.replace(/\n$/, '') || '(nimic)'))];
        if (gresit.fo) col.push(h('div', {}, h('b', {}, 'Fișiere așteptate'), h('pre', {}, fisString(gresit.fo))), h('div', {}, h('b', {}, 'Fișierele tale'), h('pre', {}, fisString(Object.fromEntries(Object.keys(gresit.fo).map((k) => [k, (gresit.fisiere || {})[k] ?? '(lipsește)']))))));
        detalii.push(h('div', { class: 'pya-comp' }, col));
      } else detalii.push(h('p', {}, 'Programul tău nu merge pe unul dintre testele ascunse. Încearcă și valori speciale: 0, 1, numere negative sau foarte mari.'));
      rezultat.replaceChildren(...detalii);
      if (esecuri >= 2) solBtn.hidden = false;
    }
    return h('div', { class: 'pya-exercitiu' }, ed.el, h('div', { class: 'pya-bara' }, verifBtn, indBtn, solBtn, rezet, ...(extra ? extra(ed) : []), h('span', { class: 'pya-sfat' }, 'Scurtătură: Ctrl + Enter')), rezultat, indiciiEl);
  }

  // ---------- Elemente comune ----------
  const SIGLA = `<svg viewBox="0 0 240 240" class="pya-sarpe" aria-hidden="true" focusable="false">
    <ellipse cx="116" cy="226" rx="86" ry="9" fill="#10243B" opacity=".18"/>
    <path d="M52 206 C14 190 22 148 78 148 C136 148 154 118 122 96 C98 78 112 52 146 54" fill="none" stroke="#2C5E8F" stroke-width="34" stroke-linecap="round"/>
    <path d="M52 206 C14 190 22 148 78 148 C136 148 154 118 122 96 C98 78 112 52 146 54" fill="none" stroke="#3776AB" stroke-width="28" stroke-linecap="round"/>
    <path d="M52 206 C14 190 22 148 78 148 C136 148 154 118 122 96 C98 78 112 52 146 54" fill="none" stroke="#FFD43B" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 17"/>
    <ellipse cx="168" cy="54" rx="34" ry="29" fill="#3776AB" stroke="#2C5E8F" stroke-width="4"/>
    <g class="pya-ochi"><circle cx="160" cy="44" r="11" fill="#fff"/><circle cx="184" cy="44" r="11" fill="#fff"/><circle cx="163" cy="46" r="5.500" fill="#10243B"/><circle cx="187" cy="46" r="5.500" fill="#10243B"/><circle cx="165" cy="44" r="2" fill="#fff"/><circle cx="189" cy="44" r="2" fill="#fff"/></g>
    <path d="M156 66 Q172 78 190 66" fill="none" stroke="#FFD43B" stroke-width="5" stroke-linecap="round"/>
    <path class="pya-limba" d="M200 62 L218 60 M218 60 L226 54 M218 60 L226 66" fill="none" stroke="#F21F4B" stroke-width="4" stroke-linecap="round"/>
    <circle cx="150" cy="62" r="5" fill="#F8A5C2" opacity=".8"/>
  </svg>`;
  const antet = (titlu, sub, crumbs) => h('header', { class: 'pya-antet' },
    h('nav', { class: 'pya-crumbs', 'aria-label': 'Navigare' }, h('a', { href: '#/python' }, '🐍 Python'), ...crumbs.flatMap((c) => ['›', c.href ? h('a', { href: c.href }, c.t) : h('span', {}, c.t)])),
    h('h1', {}, titlu), sub ? h('p', {}, sub) : null);
  const pagina = (...c) => show(h('div', { class: 'pya' }, h('div', { class: 'wrap' }, c)));
  const barXP = () => {
    const g = grad(P.xp), u = urmGrad(P.xp);
    const in_ = h('span', { class: 'pya-xp-in' }); in_.style.width = `${Math.min(100, Math.round(((P.xp - g[0]) / ((u ? u[0] : g[0] + 1) - g[0])) * 100))}%`;
    return h('div', { class: 'pya-xp' }, h('div', { class: 'pya-xp-cap' }, h('span', {}, `${g[1]} ${g[2]}`), h('span', {}, `${P.xp} XP${u ? ` · încă ${u[0] - P.xp} până la ${u[1]} ${u[2]}` : ' · nivel maxim!'}`)), h('span', { class: 'pya-xp-bara' }, in_));
  };

  // ---------- Pagina principală ----------
  function acasa() {
    document.title = 'Python – de la zero, pentru gimnaziu – edudigi';
    const urmatoarea = TOATE.find((l) => !faceLectie(l.id));
    const facute = TOATE.filter((l) => faceLectie(l.id)).length;
    const provFacute = PROVOCARI.filter((p) => P.prov[p.id]).length;
    pagina(
      h('section', { class: 'pya-hero' },
        h('div', { class: 'pya-hero-text' },
          h('p', { class: 'pya-kicker' }, '🐍 Curs separat · doar Python'),
          h('h1', {}, 'Învață ', h('span', { class: 'pya-galben' }, 'Python'), ' de la zero'),
          h('p', { class: 'pya-lead' }, 'Lecții scurte, exemple pe care le rulezi pe loc și exerciții pe care calculatorul ți le corectează imediat. Fără instalări: totul merge în browser.'),
          h('div', { class: 'pya-hero-act' },
            urmatoarea ? h('a', { class: 'pya-btn galben mare', href: `#/python/l/${urmatoarea.id}` }, facute ? `Continuă: ${urmatoarea.titlu} ▶` : 'Începe prima lecție ▶') : h('a', { class: 'pya-btn galben mare', href: '#/python/provocari' }, 'Ai terminat cursul! Mergi la provocări ▶'),
            h('a', { class: 'pya-btn contur mare', href: '#/aplicatii/python' }, '⌨️ Editor liber')),
          h('div', { class: 'pya-chips' }, [`📚 ${TOATE.length} lecții`, `🏁 ${PROVOCARI.length} provocări`, '🎮 5 jocuri', '✅ Verificare automată', '🆓 Fără cont'].map((t) => h('span', { class: 'pya-chip' }, t)))),
        h('div', { class: 'pya-hero-art', html: SIGLA })),
      h('section', { class: 'pya-stare' }, barXP(), h('div', { class: 'pya-numere' }, h('div', {}, h('b', {}, `${facute}/${TOATE.length}`), h('span', {}, 'lecții terminate')), h('div', {}, h('b', {}, `${provFacute}/${PROVOCARI.length}`), h('span', {}, 'provocări rezolvate')))),
      h('section', { class: 'pya-sectiune' }, h('h2', {}, 'Drumul tău'),
        h('div', { class: 'pya-module' }, MODULE.map((m, k) => {
          const nrf = m.lectii.filter((l) => faceLectie(l.id)).length;
          const c = h('article', { class: `pya-modul${nrf === m.lectii.length ? ' gata' : ''}` },
            h('div', { class: 'pya-modul-cap' }, h('span', { class: 'pya-modul-e', 'aria-hidden': 'true' }, m.emoji), h('div', {}, h('p', { class: 'pya-modul-n' }, `Modulul ${k + 1}`), h('h3', {}, m.titlu), h('p', { class: 'pya-modul-d' }, m.desc))),
            h('ol', { class: 'pya-lectii' }, m.lectii.map((l) => h('li', {}, h('a', { class: faceLectie(l.id) ? 'gata' : '', href: `#/python/l/${l.id}` }, h('span', { class: 'pya-bulina', 'aria-hidden': 'true' }, faceLectie(l.id) ? '✓' : ''), h('span', { class: 'pya-lectie-t' }, l.titlu), h('span', { class: 'pya-timp' }, `${l.timp} min`))))),
            h('p', { class: 'pya-modul-p' }, `${nrf} din ${m.lectii.length} lecții`));
          c.style.setProperty('--m', m.culoare); return c;
        }))),
      h('section', { class: 'pya-sectiune' }, h('h2', {}, 'Mai multe'),
        h('div', { class: 'pya-extra' },
          h('a', { class: 'pya-extra-c', href: '#/python/provocari' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '🏁'), h('b', {}, 'Provocări'), h('span', {}, `${PROVOCARI.length} probleme ca la concursuri, de la ușor la greu, cu teste ascunse.`)),
          h('a', { class: 'pya-extra-c', href: '#/python/jocuri' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '🎮'), h('b', {}, 'Sala de jocuri'), h('span', {}, 'Robot programat în Python, ordonează liniile, găsește greșeala, Blitz și completează codul.')),
          h('a', { class: 'pya-extra-c', href: '#/python/asociere' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '🧲'), h('b', {}, 'Unește perechile'), h('span', {}, 'Asociază codul cu ce afișează și noțiunile cu explicația lor, ca la cartonașe.')),
          h('a', { class: 'pya-extra-c', href: '#/python/memorator' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '📒'), h('b', {}, 'Memorator'), h('span', {}, 'Sintaxa într-o singură pagină și erorile frecvente, explicate.')),
          h('a', { class: 'pya-extra-c', href: '#/aplicatii/python' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '⌨️'), h('b', {}, 'Editor Python'), h('span', {}, 'Un Thonny în browser: Shell, depanare pas cu pas, țestoasă (turtle).')))),
      h('p', { class: 'pya-subsol' }, 'Cursul urmărește programa de Informatică din gimnaziu (clasele VII–VIII), iar exercițiile le poți face și acasă. Progresul se păstrează doar în acest browser. ', h('a', { href: '#/' }, '← Înapoi la platformă')));
  }

  // ---------- Lecția ----------
  function lectie(id) {
    const k = TOATE.findIndex((l) => l.id === id);
    if (k < 0) return acasa();
    const l = TOATE[k], m = l.mod, prec = TOATE[k - 1], urm = TOATE[k + 1];
    document.title = `${l.titlu} – Python de la zero – edudigi`;
    const clasa = h('span', { class: `pya-stare-l${faceLectie(l.id) ? ' gata' : ''}` }, faceLectie(l.id) ? '✓ Lecție terminată' : `~ ${l.timp} minute`);
    const raspuns = h('div', { class: 'pya-urmator' });
    const ex = panouExercitiu(l.exercitiu, {
      id: l.id, xp: 20, deja: () => faceLectie(l.id),
      laReusit: (nou) => {
        if (nou) { P.lectii[l.id] = 1; P.xp += 20; salveaza(); clasa.className = 'pya-stare-l gata'; clasa.textContent = '✓ Lecție terminată'; }
        return h('div', { class: 'pya-actiuni' }, urm ? h('a', { class: 'pya-btn verde mare', href: `#/python/l/${urm.id}` }, `Lecția următoare: ${urm.titlu} ▶`) : h('a', { class: 'pya-btn verde mare', href: '#/python/provocari' }, 'Ai terminat cursul! Încearcă provocările ▶'), h('a', { class: 'pya-btn alb', href: '#/python' }, 'Toate lecțiile'));
      },
    });
    const sectiune = (n, titlu, sub, ...c) => h('section', { class: 'pya-pas' }, h('div', { class: 'pya-pas-cap' }, h('span', { class: 'pya-pas-n' }, n), h('div', {}, h('h2', {}, titlu), sub ? h('p', {}, sub) : null)), ...c);
    const pg = h('div', { class: 'pya' }, h('div', { class: 'wrap' },
      antet(l.titlu, null, [{ t: m.titlu }, { t: l.titlu }]),
      h('div', { class: 'pya-lectie-meta' }, clasa, h('span', {}, `${m.emoji} Modulul ${MODULE.indexOf(m) + 1} · ${m.titlu}`)),
      sectiune(1, 'Teorie', 'Citește cu atenție, apoi mergi la exemplu.', h('div', { class: 'pya-teorie' }, teorie(l.teorie))),
      sectiune(2, 'Încearcă singur', 'Rulează programul, apoi schimbă ceva în el și rulează din nou. Așa se învață cel mai repede.', panouIncearca(l.exemplu, l.intrariExemplu)),
      sectiune(3, 'Unește perechile', 'Ce afișează fiecare program? Ce înseamnă fiecare noțiune? Asociază elementele din cele două coloane.', panouAsociere(l.asociere, { laGata: () => { if (!P.asoc[l.id]) { P.asoc[l.id] = 1; P.xp += 5; salveaza(); return '+5 XP. '; } return ''; } })),
      sectiune(4, 'Exercițiu', null, h('p', { class: 'pya-cer', html: inl(l.exercitiu.cer) }), ex),
      raspuns,
      h('nav', { class: 'pya-pn', 'aria-label': 'Lecții' }, prec ? h('a', { href: `#/python/l/${prec.id}` }, `◀ ${prec.titlu}`) : h('span'), urm ? h('a', { href: `#/python/l/${urm.id}` }, `${urm.titlu} ▶`) : h('span'))));
    pg.style.setProperty('--m', m.culoare);
    show(pg);
  }

  // ---------- Provocări ----------
  const STELE = ['', '⭐', '⭐⭐', '⭐⭐⭐'], NUME_NIV = ['', 'Ușor', 'Mediu', 'Greu'];
  function provocari(params) {
    document.title = 'Provocări Python – edudigi';
    const f = Number(params?.get('n')) || 0;
    const lista = PROVOCARI.filter((p) => !f || p.niv === f);
    pagina(
      antet('Provocări Python', 'Probleme ca la concursuri: citești datele, afișezi rezultatul. Programul tău este testat pe mai multe seturi de date, unele ascunse.', [{ t: 'Provocări' }]),
      h('div', { class: 'pya-filtre' }, [['Toate', 0], ['⭐ Ușor', 1], ['⭐⭐ Mediu', 2], ['⭐⭐⭐ Greu', 3]].map(([t, v]) => h('a', { class: `pya-chip-f${f === v ? ' act' : ''}`, href: v ? `#/python/provocari?n=${v}` : '#/python/provocari', 'aria-pressed': String(f === v) }, t))),
      h('div', { class: 'pya-prov' }, lista.map((p) => h('a', { class: `pya-prov-c${P.prov[p.id] ? ' gata' : ''}`, href: `#/python/p/${p.id}` },
        h('span', { class: 'pya-prov-stare', 'aria-hidden': 'true' }, P.prov[p.id] ? '✓' : STELE[p.niv].length / 1 ? '' : ''),
        h('b', {}, p.titlu), h('span', { class: 'pya-prov-niv' }, `${STELE[p.niv]} ${NUME_NIV[p.niv]}`), h('span', { class: 'pya-prov-xp' }, `+${15 * p.niv} XP`)))));
  }
  function provocare(id) {
    const k = PROVOCARI.findIndex((p) => p.id === id);
    if (k < 0) return provocari();
    const p = PROVOCARI[k], urm = PROVOCARI[k + 1];
    document.title = `${p.titlu} – Provocări Python – edudigi`;
    const ex = panouExercitiu(p, {
      id: p.id, xp: 15 * p.niv, deja: () => !!P.prov[p.id],
      laReusit: (nou) => {
        if (nou) { P.prov[p.id] = 1; P.xp += 15 * p.niv; salveaza(); }
        return h('div', { class: 'pya-actiuni' }, urm ? h('a', { class: 'pya-btn verde mare', href: `#/python/p/${urm.id}` }, `Următoarea: ${urm.titlu} ▶`) : null, h('a', { class: 'pya-btn alb', href: '#/python/provocari' }, 'Toate provocările'));
      },
    });
    const ex1 = p.teste[0];
    pagina(
      antet(p.titlu, `${STELE[p.niv]} ${NUME_NIV[p.niv]} · +${15 * p.niv} XP`, [{ t: 'Provocări', href: '#/python/provocari' }, { t: p.titlu }]),
      h('section', { class: 'pya-pas' }, h('div', { class: 'pya-enunt' }, h('h2', {}, 'Enunț'), h('p', { class: 'pya-cer', html: inl(p.cer) }),
        h('div', { class: 'pya-comp' }, h('div', {}, h('b', {}, 'Exemplu: date de intrare'), h('pre', {}, ex1.i.trim() === '' ? '(nu se citește nimic)' : ex1.i.replace(/\n$/, ''))), h('div', {}, h('b', {}, 'Exemplu: rezultat'), h('pre', {}, ex1.o.replace(/\n$/, '')))))),
      h('section', { class: 'pya-pas' }, h('div', { class: 'pya-pas-cap' }, h('span', { class: 'pya-pas-n' }, '✍'), h('div', {}, h('h2', {}, 'Programul tău'))), ex));
  }

  // ---------- Joc de asociere (perechi din toate lecțiile) ----------
  function asociere(params) {
    document.title = 'Unește perechile – Python – edudigi';
    const f = params?.get('m') || '';
    const mods = f ? MODULE.filter((m) => m.id === f) : MODULE;
    const toate = mods.flatMap((m) => m.lectii.flatMap((l) => l.asociere.map((p) => ({ ...p, lec: l.id }))));
    const alege = () => {
      const amestecat = [...toate].sort(() => Math.random() - 0.5), luate = [], lefts = new Set(), rights = new Set();
      for (const p of amestecat) { if (lefts.has(p.s) || rights.has(p.r)) continue; luate.push(p); lefts.add(p.s); rights.add(p.r); if (luate.length === 6) break; }
      return luate;
    };
    const loc = h('div', { class: 'pya-asoc-loc' });
    const nou = () => loc.replaceChildren(panouAsociere(alege(), { mesajFinal: 'Perechi amestecate din lecțiile alese', laGata: () => { P.runde = (P.runde || 0) + 1; salveaza(); return `Runde terminate: ${P.runde}. `; } }));
    nou();
    pagina(
      antet('Unește perechile', 'Ca la orele cu cartonașe: asociezi codul cu ce afișează și noțiunile cu explicația lor. De fiecare dată apar perechi amestecate.', [{ t: 'Unește perechile' }]),
      h('div', { class: 'pya-filtre' }, [['Toate lecțiile', ''], ...MODULE.map((m) => [`${m.emoji} ${m.titlu}`, m.id])].map(([t, v]) => h('a', { class: `pya-chip-f${f === v ? ' act' : ''}`, href: v ? `#/python/asociere?m=${v}` : '#/python/asociere', 'aria-pressed': String(f === v) }, t))),
      h('section', { class: 'pya-pas' }, loc, h('p', { class: 'pya-subsol' }, h('button', { class: 'pya-btn verde', type: 'button', onclick: nou }, '🎲 Alte perechi'))));
  }

  // ---------- Memorator ----------
  function memorator() {
    document.title = 'Memorator Python – edudigi';
    pagina(
      antet('Memorator Python', 'Sintaxa de care ai nevoie, pe o singură pagină. Poți să o printezi sau să o ții deschisă lângă editor.', [{ t: 'Memorator' }]),
      h('div', { class: 'pya-mem' }, MEMORATOR.map((x) => h('article', { class: 'pya-mem-c' }, h('h3', {}, h('span', { 'aria-hidden': 'true' }, `${x.emoji} `), x.titlu), codBloc(x.cod)))),
      h('section', { class: 'pya-sectiune' }, h('h2', {}, 'Erori frecvente'), h('p', { class: 'pya-lead2' }, 'Când programul se oprește cu o eroare, Python îți spune tipul ei. Iată ce înseamnă cele mai întâlnite:'),
        h('div', { class: 'pya-tabel-w' }, h('table', { class: 'pya-tabel' }, h('thead', {}, h('tr', {}, ['Eroarea', 'De ce apare', 'Cum o repari'].map((c) => h('th', {}, c)))),
          h('tbody', {}, EROARI.map((e) => h('tr', {}, h('td', {}, h('code', {}, e.tip)), h('td', { html: inl(e.cand) }), h('td', { html: inl(e.fix) }))))))));
  }

  // Funcții folosite și de jocurile din python-jocuri.js
  window.PyAcad = { ruleaza, verifica, evid, codBloc, inl, antet, pagina, editor, P, salveaza, norm, xpMax: () => xpMax, panouExercitiu, panouIncearca, teorie, consola, grad, urmGrad };
  routes.push({ pattern: /^\/python$/, handler: async () => acasa() });
  routes.push({ pattern: /^\/python\/l\/([a-z0-9-]+)$/, handler: async (m) => lectie(m[1]) });
  routes.push({ pattern: /^\/python\/p\/([a-z0-9-]+)$/, handler: async (m) => provocare(m[1]) });
  routes.push({ pattern: /^\/python\/provocari$/, handler: async (m, params) => provocari(params) });
  routes.push({ pattern: /^\/python\/asociere$/, handler: async (m, params) => asociere(params) });
  routes.push({ pattern: /^\/python\/memorator$/, handler: async () => memorator() });
})();

'use strict';
// Aplicații interactive pentru lecții. Se scriu în Markdown ca blocuri de cod cu un tip:
//
//   ```quiz                      ```adevarat-fals             ```categorii
//   # Instrucțiune (opțional)    A: Mouse-ul e de intrare.    Intrare: tastatură, mouse
//   Care e de intrare?           F: Jocul e hardware. | De ce Ieșire: monitor, boxe
//   - Monitorul                  ```                          ```
//   * Tastatura   (* = corect)
//   Explicație: ...
//   ```
//
//   ```ordonare                  ```completare                ```cartonase
//   Pornești calculatorul        Datele [intră] și [ies|se    Hardware = partea fizică
//   Deschizi browserul           afișează].                   Software = programele
//   ```  (în ordinea corectă)    ```                          ```
//
// Același fișier e folosit și la construire (Node), pentru validare, și în browser, pentru afișare.
(function (root) {
  const TYPES = {
    quiz: 'Quiz',
    'adevarat-fals': 'Adevărat sau fals',
    categorii: 'Sortează pe categorii',
    ordonare: 'Pune în ordine',
    completare: 'Completează',
    cartonase: 'Cartonașe',
  };
  const ALIASES = { 'adevărat-fals': 'adevarat-fals', 'cartonașe': 'cartonase', 'ordine': 'ordonare' };
  // Tipuri adăugate din alte fișiere (office.js, teste-core.js): { label, parse(text), render(block, inline) }.
  const EXTRA = {};
  function register(type, def) {
    TYPES[type] = def.label;
    EXTRA[type] = def;
    for (const a of def.aliases || []) ALIASES[a] = type;
  }
  // Primul cuvânt din antetul blocului (```quiz puncte=10 → quiz).
  const typeOf = (lang) => {
    const t = (lang || '').trim().split(/\s+/)[0].toLowerCase();
    return TYPES[t] ? t : ALIASES[t] || null;
  };
  // Atributele din antetul blocului: ```quiz puncte=10 → { puncte: '10' }.
  function parseAttrs(lang) {
    const attrs = {};
    for (const m of (lang || '').matchAll(/([\p{L}\w-]+)=("[^"]*"|\S+)/gu)) attrs[m[1].toLowerCase()] = m[2].replace(/^"|"$/g, '');
    return attrs;
  }

  // ---------- Parsare (comună Node + browser) ----------
  function parse(type, text) {
    const errors = [];
    let lines = text.replace(/\r/g, '').split('\n');
    let title = '';
    const first = lines.findIndex((l) => l.trim());
    if (first >= 0 && /^#\s+/.test(lines[first].trim())) {
      title = lines[first].trim().replace(/^#\s+/, '');
      lines = lines.slice(first + 1);
    }
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    let data;
    if (EXTRA[type]) {
      const r = EXTRA[type].parse(lines.join('\n'));
      return { type, title, data: r.data, errors: r.errors };
    }

    if (type === 'quiz') {
      const groups = [];
      let cur = null;
      const push = () => cur && groups.push(cur);
      for (const raw of lines) {
        const l = raw.trim();
        if (!l) { push(); cur = null; continue; }
        if (!cur) cur = { q: '', options: [], explain: '' };
        if (/^[-*]\s+/.test(l)) cur.options.push({ text: l.replace(/^[-*]\s+/, ''), correct: l[0] === '*' });
        else if (/^explica[tț]ie\s*:/i.test(l)) cur.explain = l.replace(/^explica[tț]ie\s*:\s*/i, '');
        else if (!cur.options.length) cur.q = (cur.q ? cur.q + ' ' : '') + l.replace(/^(Î|I|\?)\s*[:.]?\s*/, '');
        else errors.push(`rândul „${l}” nu e nici variantă (- sau *), nici „Explicație:”`);
      }
      push();
      groups.forEach((g, i) => {
        const n = groups.length > 1 ? ` (întrebarea ${i + 1})` : '';
        if (!g.q) errors.push(`lipsește textul întrebării${n}`);
        if (g.options.length < 2) errors.push(`trebuie cel puțin 2 variante${n}`);
        if (!g.options.some((o) => o.correct)) errors.push(`marchează varianta corectă cu *${n}`);
        g.multi = g.options.filter((o) => o.correct).length > 1;
      });
      if (!groups.length) errors.push('nu conține nicio întrebare');
      data = { questions: groups };
    } else if (type === 'adevarat-fals') {
      const items = [];
      for (const l of nonEmpty) {
        const m = /^(A|F|adevărat|adevarat|fals)\s*:\s*(.+)$/i.exec(l);
        if (!m) { errors.push(`rândul „${l}” trebuie să înceapă cu „A:” sau „F:”`); continue; }
        const [stmt, ...rest] = m[2].split(' | ');
        items.push({ text: stmt.trim(), answer: /^a/i.test(m[1]), explain: rest.join(' | ').trim() });
      }
      if (!items.length) errors.push('nu conține nicio afirmație');
      data = { items };
    } else if (type === 'categorii') {
      const cats = [];
      const seen = new Set();
      for (const l of nonEmpty) {
        const i = l.indexOf(':');
        if (i < 1) { errors.push(`rândul „${l}” trebuie să fie „Categorie: element, element”`); continue; }
        const items = l.slice(i + 1).split(',').map((s) => s.trim()).filter(Boolean);
        if (!items.length) errors.push(`categoria „${l.slice(0, i).trim()}” nu are elemente`);
        for (const it of items) {
          if (seen.has(it.toLowerCase())) errors.push(`elementul „${it}” apare de două ori`);
          seen.add(it.toLowerCase());
        }
        cats.push({ name: l.slice(0, i).trim(), items });
      }
      if (cats.length < 2) errors.push('trebuie cel puțin 2 categorii');
      data = { cats };
    } else if (type === 'ordonare') {
      const steps = nonEmpty.map((l) => l.replace(/^(\d+[.)]|[-*])\s+/, ''));
      if (steps.length < 2) errors.push('trebuie cel puțin 2 pași');
      data = { steps };
    } else if (type === 'completare') {
      const paras = lines.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
      const parts = paras.map((p) => {
        const out = [];
        let last = 0, m;
        const re = /\[([^\]]+)\]/g;
        while ((m = re.exec(p))) {
          out.push(p.slice(last, m.index));
          out.push({ answers: m[1].split('|').map((s) => s.trim()).filter(Boolean) });
          last = m.index + m[0].length;
        }
        out.push(p.slice(last));
        return out;
      });
      if (!parts.flat().some((x) => typeof x === 'object')) errors.push('pune răspunsurile între paranteze drepte, ex. [prelucrează]');
      data = { paras: parts };
    } else if (type === 'cartonase') {
      const cards = [];
      for (const l of nonEmpty) {
        const i = l.indexOf(' = ');
        if (i < 1) { errors.push(`rândul „${l}” trebuie să fie „față = spate”`); continue; }
        cards.push({ front: l.slice(0, i).trim(), back: l.slice(i + 3).trim() });
      }
      if (!cards.length) errors.push('nu conține niciun cartonaș');
      data = { cards };
    } else {
      errors.push(`tip necunoscut „${type}”`);
    }
    return { type, title, data, errors };
  }

  // Găsește toate blocurile interactive dintr-un text Markdown.
  function extract(markdown) {
    const blocks = [];
    const lines = markdown.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = /^```\s*(\S+)(.*)$/.exec(lines[i]);
      if (!m) continue;
      const body = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) body.push(lines[j++]);
      const type = typeOf(m[1]);
      if (type) blocks.push({ ...parse(type, body.join('\n')), attrs: parseAttrs(m[2]), line: i + 1 });
      i = j;
    }
    return blocks;
  }

  // ---------- Afișare (doar browser) ----------
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  let uid = 0;

  function frame(block, body, { onCheck, onReset, checkLabel = 'Verifică' } = {}) {
    const status = h('p', { class: 'act-status', role: 'status', 'aria-live': 'polite' });
    const box = h('div', { class: `activity act-${block.type}` });
    let solved = false;
    // „Din prima” = rezolvată la prima verificare, fără „Încearcă din nou”. Folosit pentru punctaj.
    let checks = 0, resetUsed = false;
    const api = {
      box,
      status(text, kind) {
        status.textContent = text;
        status.className = `act-status ${kind || ''}`;
      },
      // O încercare (o verificare); evenimentul e folosit pentru salvarea progresului.
      attempt() {
        if (!solved) box.dispatchEvent(new CustomEvent('activitate-incercare', { bubbles: true }));
      },
      solve() {
        if (solved) return;
        solved = true;
        box.classList.add('solved');
        box.dispatchEvent(new CustomEvent('activitate-rezolvata', { bubbles: true, detail: { dinPrima: !resetUsed && checks <= 1, tip: block.type } }));
      },
    };
    const actions = h('div', { class: 'act-actions' },
      onCheck ? h('button', { class: 'btn small', type: 'button', onclick: () => { if (!solved) checks++; api.attempt(); onCheck(api); } }, checkLabel) : null,
      onReset ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => { if (!solved) resetUsed = true; api.status(''); onReset(api); } }, 'Încearcă din nou') : null);
    box.append(
      h('div', { class: 'act-head' }, h('span', { class: 'act-type' }, TYPES[block.type]), block.title ? h('h4', {}, block.title) : null),
      body, actions, status);
    return api;
  }

  function renderQuiz(block, inline) {
    const qs = block.data.questions;
    const body = h('div', { class: 'act-body' });
    const fields = qs.map((q) => {
      const name = `q${++uid}`;
      const fb = h('p', { class: 'act-feedback', hidden: true });
      const opts = q.options.map((o) => {
        const input = h('input', { type: q.multi ? 'checkbox' : 'radio', name });
        return { o, input, label: h('label', { class: 'opt' }, input, h('span', {}, inline(o.text))) };
      });
      const fs = h('fieldset', { class: 'quiz-q' }, h('legend', {}, inline(q.q), q.multi ? h('small', {}, ' (mai multe răspunsuri corecte)') : null), opts.map((x) => x.label), fb);
      body.append(fs);
      return { q, opts, fb, fs };
    });
    const api = frame(block, body, {
      onCheck(a) {
        let good = 0;
        for (const f of fields) {
          const ok = f.opts.every(({ o, input }) => input.checked === o.correct);
          if (ok) good++;
          f.fs.classList.toggle('ok', ok);
          f.fs.classList.toggle('bad', !ok);
          for (const { o, input, label } of f.opts) {
            label.classList.toggle('right', ok && o.correct);
            label.classList.toggle('wrong', input.checked && !o.correct);
          }
          f.fb.hidden = false;
          f.fb.replaceChildren(ok ? '✓ Corect! ' : '✗ Nu chiar. ', f.q.explain ? inline(f.q.explain) : ok ? '' : 'Mai încearcă.');
        }
        if (good === fields.length) a.status(fields.length > 1 ? `Excelent! Toate ${fields.length} răspunsurile sunt corecte.` : 'Excelent!', 'ok'), a.solve();
        else a.status(`${good} din ${fields.length} corecte. Corectează și verifică din nou.`, 'bad');
      },
      onReset() {
        for (const f of fields) {
          f.fs.classList.remove('ok', 'bad');
          f.fb.hidden = true;
          for (const { input, label } of f.opts) (input.checked = false), label.classList.remove('right', 'wrong');
        }
      },
    });
    return api.box;
  }

  function renderTF(block, inline) {
    const items = block.data.items;
    let answered = 0, good = 0;
    const body = h('div', { class: 'act-body tf-list' });
    let api;
    const rows = items.map((it) => {
      const fb = h('p', { class: 'act-feedback', hidden: true });
      const choose = (val) => {
        if (row.dataset.done) return;
        row.dataset.done = '1';
        const ok = val === it.answer;
        answered++;
        if (ok) good++;
        row.classList.add(ok ? 'ok' : 'bad');
        btnA.setAttribute('aria-pressed', String(val === true));
        btnF.setAttribute('aria-pressed', String(val === false));
        btnA.disabled = btnF.disabled = true;
        fb.hidden = false;
        fb.replaceChildren(ok ? '✓ Corect! ' : `✗ Afirmația este ${it.answer ? 'adevărată' : 'falsă'}. `, it.explain ? inline(it.explain) : '');
        if (answered === items.length) {
          api.attempt();
          if (good === items.length) api.status('Excelent! Ai răspuns corect la toate.', 'ok'), api.solve();
          else api.status(`${good} din ${items.length} corecte. Poți încerca din nou.`, 'bad');
        }
      };
      const btnA = h('button', { class: 'chip small', type: 'button', onclick: () => choose(true) }, 'Adevărat');
      const btnF = h('button', { class: 'chip small', type: 'button', onclick: () => choose(false) }, 'Fals');
      const row = h('div', { class: 'tf-row' }, h('p', {}, inline(it.text)), h('div', { class: 'tf-btns' }, btnA, btnF), fb);
      body.append(row);
      return { row, btnA, btnF, fb };
    });
    api = frame(block, body, {
      onReset() {
        answered = good = 0;
        for (const r of rows) {
          delete r.row.dataset.done;
          r.row.classList.remove('ok', 'bad');
          r.btnA.disabled = r.btnF.disabled = false;
          r.btnA.removeAttribute('aria-pressed');
          r.btnF.removeAttribute('aria-pressed');
          r.fb.hidden = true;
        }
      },
    });
    return api.box;
  }

  function renderCategories(block, inline) {
    const all = block.data.cats.flatMap((c, ci) => c.items.map((text) => ({ text, ci })));
    let selected = null;
    const pool = h('div', { class: 'cat-pool', 'aria-label': 'Elemente de sortat' });
    const chips = new Map();
    const select = (chip) => {
      if (selected) selected.setAttribute('aria-pressed', 'false');
      selected = selected === chip ? null : chip;
      if (selected) selected.setAttribute('aria-pressed', 'true');
      hint.textContent = selected ? `Acum alege categoria pentru „${selected.textContent}”.` : 'Alege un element, apoi categoria lui.';
    };
    const buckets = block.data.cats.map((c, ci) => {
      const list = h('div', { class: 'bucket-items' });
      const b = h('div', { class: 'bucket' },
        h('button', { class: 'bucket-head', type: 'button', onclick: () => place(ci) }, c.name, h('span', { class: 'sr-only' }, ' – pune aici elementul ales')),
        list);
      b.addEventListener('click', (e) => { if (e.target === b || e.target === list) place(ci); });
      return { b, list };
    });
    function place(ci) {
      if (!selected) return;
      selected.classList.remove('right', 'wrong');
      buckets[ci].list.append(selected);
      chips.get(selected).placed = ci;
      select(selected);
    }
    function fill() {
      pool.replaceChildren();
      for (const bk of buckets) bk.list.replaceChildren();
      chips.clear();
      for (const it of shuffle(all)) {
        const chip = h('button', { class: 'chip small item', type: 'button', 'aria-pressed': 'false' }, inline(it.text));
        chip.addEventListener('click', () => select(chip));
        chips.set(chip, { ...it, placed: null });
        pool.append(chip);
      }
    }
    const hint = h('p', { class: 'muted act-hint' }, 'Alege un element, apoi categoria lui.');
    fill();
    const body = h('div', { class: 'act-body' }, hint, pool, h('div', { class: 'buckets' }, buckets.map((x) => x.b)));
    const api = frame(block, body, {
      onCheck(a) {
        let good = 0, placed = 0;
        for (const [chip, it] of chips) {
          if (it.placed == null) continue;
          placed++;
          const ok = it.placed === it.ci;
          if (ok) good++;
          chip.classList.toggle('right', ok);
          chip.classList.toggle('wrong', !ok);
        }
        if (good === all.length) a.status('Excelent! Totul e la locul lui.', 'ok'), a.solve();
        else if (placed < all.length) a.status(`${good} corecte din ${placed} sortate. Mai ai ${all.length - placed} de sortat.`, 'bad');
        else a.status(`${good} din ${all.length} corecte. Mută elementele marcate cu roșu.`, 'bad');
      },
      onReset() {
        selected = null;
        fill();
        hint.textContent = 'Alege un element, apoi categoria lui.';
      },
    });
    return api.box;
  }

  function renderOrder(block, inline) {
    const steps = block.data.steps.map((text, i) => ({ text, i }));
    const list = h('ol', { class: 'order-list' });
    let order;
    const draw = (focusIdx) => {
      list.replaceChildren(...order.map((s, pos) => {
        const up = h('button', { class: 'icon-btn small', type: 'button', 'aria-label': `Mută „${s.text}” mai sus`, disabled: pos === 0, onclick: () => move(pos, -1) }, '↑');
        const down = h('button', { class: 'icon-btn small', type: 'button', 'aria-label': `Mută „${s.text}” mai jos`, disabled: pos === order.length - 1, onclick: () => move(pos, 1) }, '↓');
        return h('li', { class: 'order-item' }, h('span', { class: 'order-text' }, inline(s.text)), h('span', { class: 'order-btns' }, up, down));
      }));
      if (focusIdx != null) list.children[focusIdx]?.querySelectorAll('button')[focusIdx === 0 ? 1 : 0]?.focus();
    };
    const move = (pos, d) => {
      [order[pos], order[pos + d]] = [order[pos + d], order[pos]];
      draw(pos + d);
    };
    const reset = () => {
      do order = shuffle(steps); while (steps.length > 1 && order.every((s, i) => s.i === i));
      draw();
    };
    reset();
    const api = frame(block, h('div', { class: 'act-body' }, h('p', { class: 'muted act-hint' }, 'Folosește săgețile ca să pui pașii în ordinea corectă.'), list), {
      onCheck(a) {
        let good = 0;
        order.forEach((s, pos) => {
          const ok = s.i === pos;
          if (ok) good++;
          list.children[pos].classList.toggle('right', ok);
          list.children[pos].classList.toggle('wrong', !ok);
        });
        if (good === order.length) a.status('Excelent! Ordinea este corectă.', 'ok'), a.solve();
        else a.status(`${good} din ${order.length} pași sunt la locul lor.`, 'bad');
      },
      onReset: reset,
    });
    return api.box;
  }

  function renderFill(block, inline) {
    const inputs = [];
    const body = h('div', { class: 'act-body fill' }, block.data.paras.map((parts) => h('p', {}, parts.map((p) => {
      if (typeof p === 'string') return inline(p);
      const longest = Math.max(...p.answers.map((x) => x.length));
      const input = h('input', { type: 'text', class: 'blank', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Spațiu de completat', size: Math.max(4, longest + 1) });
      inputs.push({ input, answers: p.answers });
      return input;
    }))));
    let showBtn = null;
    const api = frame(block, body, {
      onCheck(a) {
        let good = 0;
        for (const { input, answers } of inputs) {
          const ok = answers.some((x) => norm(x) === norm(input.value));
          if (ok) good++;
          input.classList.toggle('right', ok);
          input.classList.toggle('wrong', !ok);
        }
        if (good === inputs.length) {
          a.status('Excelent! Toate completările sunt corecte.', 'ok');
          a.solve();
        } else {
          a.status(`${good} din ${inputs.length} corecte.`, 'bad');
          if (!showBtn) {
            showBtn = h('button', { class: 'btn small ghost', type: 'button', onclick: () => {
              for (const x of inputs) if (!x.input.classList.contains('right')) (x.input.value = x.answers[0]), x.input.classList.remove('wrong'), x.input.classList.add('shown');
              a.status('Acestea sunt răspunsurile corecte. Citește-le cu atenție, apoi încearcă din nou.', '');
            } }, 'Arată răspunsurile');
            a.box.querySelector('.act-actions').append(showBtn);
          }
        }
      },
      onReset() {
        for (const { input } of inputs) (input.value = ''), input.classList.remove('right', 'wrong', 'shown');
        showBtn?.remove();
        showBtn = null;
      },
    });
    // Enter într-un spațiu = Verifică.
    const checkBtn = api.box.querySelector('.act-actions .btn');
    for (const { input } of inputs) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkBtn.click(); });
    return api.box;
  }

  function renderCards(block, inline) {
    const seen = new Set();
    let api;
    const grid = h('div', { class: 'card-grid' }, block.data.cards.map((c, i) => {
      const btn = h('button', { class: 'flip', type: 'button', 'aria-pressed': 'false' },
        h('span', { class: 'flip-front' }, inline(c.front)), h('span', { class: 'flip-back' }, inline(c.back)));
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));
        if (on) seen.add(i);
        if (seen.size === block.data.cards.length) api.status('Ai parcurs toate cartonașele!', 'ok'), api.solve();
        else api.status(`Ai întors ${seen.size} din ${block.data.cards.length} cartonașe.`, '');
      });
      return btn;
    }));
    api = frame(block, h('div', { class: 'act-body' }, h('p', { class: 'muted act-hint' }, 'Atinge un cartonaș ca să-l întorci.'), grid));
    return api.box;
  }

  const RENDER = { quiz: renderQuiz, 'adevarat-fals': renderTF, categorii: renderCategories, ordonare: renderOrder, completare: renderFill, cartonase: renderCards };
  // inline: funcția din app.js care formatează textul (bold, cod...) în siguranță.
  function render(block, inline = (t) => t) {
    if (block.errors.length) return h('div', { class: 'activity act-error' }, h('b', {}, 'Aplicația nu poate fi afișată: '), block.errors.join('; '));
    if (EXTRA[block.type]) return EXTRA[block.type].render(block, inline, { frame, h });
    return RENDER[block.type](block, inline);
  }

  const api = { TYPES, typeOf, parse, parseAttrs, extract, render, register, isExtra: (t) => Boolean(EXTRA[t]) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EduInteractiv = api;
})(typeof window !== 'undefined' ? window : globalThis);

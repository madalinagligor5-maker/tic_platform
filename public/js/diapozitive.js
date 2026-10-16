'use strict';
// Prezentări edudigi („diapozitive”), scrise direct în Markdown, fără PowerPoint:
//
//   ```diapozitive
//   # Titlul prezentării          (opțional)
//   tema: albastru                (opțional: rosu, albastru, verde, portocaliu, intunecat)
//   ## Primul diapozitiv
//   Text, liste, **bold**, imagini...
//   Note: ce spune prezentatorul (se vede doar la „Note”)
//   ---
//   ## Al doilea diapozitiv
//   - o idee
//   - altă idee
//   ```
//
// Diapozitivele se despart printr-un rând cu „---”. Primul diapozitiv se afișează ca pagină de titlu.
// Același fișier e folosit la construire (Node), pentru validare, și în browser, pentru afișare.
(function (root) {
  const TEME = ['rosu', 'albastru', 'verde', 'portocaliu', 'intunecat'];
  const LANGS = ['diapozitive', 'prezentare'];
  const isDeck = (lang) => LANGS.includes((lang || '').trim().toLowerCase());

  // ---------- Parsare (comună Node + browser) ----------
  function parse(text) {
    const errors = [];
    let lines = text.replace(/\r/g, '').split('\n');
    let title = '', tema = 'rosu';
    // Antetul: „# Titlu” și „tema: ...”, în orice ordine, înaintea primului diapozitiv.
    for (;;) {
      const i = lines.findIndex((l) => l.trim());
      if (i < 0) break;
      const l = lines[i].trim();
      if (/^#\s+/.test(l) && !title) title = l.replace(/^#\s+/, '');
      else if (/^tem[aă]\s*:/i.test(l)) {
        const t = l.replace(/^tem[aă]\s*:\s*/i, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (TEME.includes(t)) tema = t;
        else errors.push(`tema „${t}” nu există; alege una din: ${TEME.join(', ')}`);
      } else break;
      lines = lines.slice(i + 1);
    }
    const slides = [];
    let cur = [];
    const push = () => {
      const body = [], notes = [];
      for (const l of cur) {
        if (/^note\s*:/i.test(l.trim())) notes.push(l.trim().replace(/^note\s*:\s*/i, ''));
        else body.push(l);
      }
      const md = body.join('\n').trim();
      if (md || notes.length) slides.push({ md, notes: notes.join(' ') });
      if (!md && notes.length) errors.push(`diapozitivul ${slides.length} are doar note, fără conținut`);
      cur = [];
    };
    for (const l of lines) {
      if (/^\s*-{3,}\s*$/.test(l)) push();
      else cur.push(l);
    }
    push();
    if (!slides.length) errors.push('prezentarea nu are niciun diapozitiv');
    return { title, tema, slides, errors };
  }

  // Găsește toate prezentările dintr-un text Markdown (pentru validarea la construire).
  function extract(markdown) {
    const decks = [];
    const lines = markdown.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = /^```\s*(\S+)\s*$/.exec(lines[i]);
      if (!m) continue;
      const body = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) body.push(lines[j++]);
      if (isDeck(m[1])) decks.push({ ...parse(body.join('\n')), line: i + 1 });
      i = j;
    }
    return decks;
  }

  // ---------- Prezentările făcute de elevi în Atelier (comun browser + server) ----------
  // Forma unei prezentări: { titlu, tema, diapozitive: [{ aspect, titlu, text, imagine, note }] }.
  // curata() păstrează doar câmpurile cunoscute și verifică limitele, ca nimic periculos să nu fie salvat.
  const ASPECTE = { titlu: 'Pagină de titlu', text: 'Titlu și text', 'text-imagine': 'Text și imagine', imagine: 'Imagine mare' };
  const LIMITE = { titlu: 120, text: 1500, note: 1000, diapozitive: 40, imagine: 700 * 1024, total: 3 * 1024 * 1024 };
  const IMAGINE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  function curata(p) {
    const errors = [];
    if (!p || typeof p !== 'object') return { prezentare: null, errors: ['prezentarea lipsește'] };
    const str = (v, max, ce) => {
      const s = typeof v === 'string' ? v.replace(/\r/g, '') : '';
      if (s.length > max) errors.push(`${ce} are mai mult de ${max} de caractere`);
      return s.slice(0, max);
    };
    const lista = Array.isArray(p.diapozitive) ? p.diapozitive : [];
    if (!lista.length) errors.push('prezentarea nu are niciun diapozitiv');
    if (lista.length > LIMITE.diapozitive) errors.push(`o prezentare poate avea cel mult ${LIMITE.diapozitive} de diapozitive`);
    let total = 0;
    const diapozitive = lista.slice(0, LIMITE.diapozitive).map((d, i) => {
      const x = d && typeof d === 'object' ? d : {};
      const n = `diapozitivul ${i + 1}`;
      let imagine = typeof x.imagine === 'string' ? x.imagine : '';
      if (imagine && (!IMAGINE.test(imagine) || imagine.length > LIMITE.imagine)) {
        errors.push(`imaginea de pe ${n} nu este acceptată (doar JPG, PNG sau WebP, cel mult 700 KB)`);
        imagine = '';
      }
      total += imagine.length;
      return {
        aspect: ASPECTE[x.aspect] ? x.aspect : 'text',
        titlu: str(x.titlu, LIMITE.titlu, `titlul de pe ${n}`),
        text: str(x.text, LIMITE.text, `textul de pe ${n}`),
        imagine,
        note: str(x.note, LIMITE.note, `notele de pe ${n}`),
      };
    });
    if (total > LIMITE.total) errors.push('imaginile din prezentare sunt prea mari în total (cel mult 3 MB)');
    const prezentare = {
      titlu: str(p.titlu, LIMITE.titlu, 'titlul prezentării').trim() || 'Prezentare fără titlu',
      tema: TEME.includes(p.tema) ? p.tema : 'rosu',
      diapozitive,
    };
    return { prezentare, errors };
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
  const ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  };
  const icon = (name) => {
    const s = h('span', { class: 'deck-ico', 'aria-hidden': 'true' });
    s.innerHTML = ICON[name]; // SVG fix, din cod, nu din conținut
    return s;
  };

  // markdown: funcția din app.js care transformă Markdown în elemente, în siguranță.
  // opts.start: diapozitivul de la care se pornește; opts.onChange(i): anunță diapozitivul curent (pentru Atelier).
  function render(deck, markdown, opts = {}) {
    if (deck.errors.length) return h('div', { class: 'activity act-error' }, h('b', {}, 'Prezentarea nu poate fi afișată: '), deck.errors.join('; '));
    const n = deck.slides.length;
    let idx = Math.max(0, Math.min(opts.start || 0, n - 1)), notesOn = false;

    const slides = deck.slides.map((s, i) => {
      const content = s.build ? s.build() : markdown(s.md);
      content.classList.add('slide-content');
      const cls = s.cls ?? (i === 0 ? 'slide-cover' : '');
      return h('section', {
        class: `slide ${cls}`, role: 'group', 'aria-roledescription': 'diapozitiv',
        'aria-label': `Diapozitivul ${i + 1} din ${n}`, hidden: i !== 0,
      }, content);
    });
    const stage = h('div', { class: 'deck-stage' }, slides);
    const bar = h('div', { class: 'deck-progress', 'aria-hidden': 'true' }, h('span'));
    const counter = h('span', { class: 'deck-count', 'aria-live': 'polite' });
    const prevBtn = h('button', { class: 'deck-btn', type: 'button', 'aria-label': 'Diapozitivul anterior', onclick: () => go(idx - 1) }, icon('prev'));
    const nextBtn = h('button', { class: 'deck-btn', type: 'button', 'aria-label': 'Diapozitivul următor', onclick: () => go(idx + 1) }, icon('next'));
    const hasNotes = deck.slides.some((s) => s.notes);
    const notesBox = h('div', { class: 'deck-notes', hidden: true });
    const notesBtn = hasNotes ? h('button', { class: 'chip small', type: 'button', 'aria-pressed': 'false', onclick: () => {
      notesOn = !notesOn;
      notesBtn.setAttribute('aria-pressed', String(notesOn));
      draw();
    } }, 'Note') : null;
    const fullBtn = h('button', { class: 'deck-btn', type: 'button', 'aria-label': 'Ecran complet', title: 'Ecran complet (F)', onclick: () => toggleFull() }, icon('full'));

    const box = h('div', {
      class: `deck tema-${deck.tema}`, tabindex: '0', role: 'region', 'aria-roledescription': 'prezentare',
      'aria-label': deck.title ? `Prezentare: ${deck.title}` : 'Prezentare',
    },
      h('div', { class: 'deck-head' },
        h('span', { class: 'act-type' }, 'Prezentare'),
        deck.title ? h('h4', {}, deck.title) : null,
        h('span', { class: 'deck-hint muted' }, 'Folosește săgețile ← → sau glisează.')),
      h('div', { class: 'deck-frame' }, stage, bar),
      h('div', { class: 'deck-controls' }, prevBtn, counter, nextBtn, h('span', { class: 'deck-spacer' }), notesBtn, fullBtn),
      notesBox);

    function draw(dir) {
      slides.forEach((s, i) => {
        s.hidden = i !== idx;
        s.classList.remove('in-next', 'in-prev');
      });
      if (dir) {
        const s = slides[idx];
        void s.offsetWidth; // repornește animația
        s.classList.add(dir > 0 ? 'in-next' : 'in-prev');
      }
      counter.textContent = `${idx + 1} / ${n}`;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === n - 1;
      bar.firstChild.style.width = `${((idx + 1) / n) * 100}%`;
      const note = deck.slides[idx].notes;
      notesBox.hidden = !notesOn;
      notesBox.replaceChildren(h('b', {}, 'Note: '), note || 'Acest diapozitiv nu are note.');
      opts.onChange?.(idx);
      if (idx === n - 1) box.dispatchEvent(new CustomEvent('prezentare-parcursa', { bubbles: true }));
    }
    function go(i) {
      if (i < 0 || i >= n || i === idx) return;
      const dir = i > idx ? 1 : -1;
      idx = i;
      draw(dir);
    }
    function toggleFull() {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else box.requestFullscreen?.().then(() => box.focus()).catch(() => {});
    }

    box.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && e.target === box)) go(idx + 1);
      else if (k === 'ArrowLeft' || k === 'PageUp') go(idx - 1);
      else if (k === 'Home') go(0);
      else if (k === 'End') go(n - 1);
      else if (k === 'f' || k === 'F') toggleFull();
      else return;
      e.preventDefault();
    });
    // Glisare pe telefon / tabletă.
    let x0 = null;
    stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    });
    // Clic pe diapozitiv = următorul (în afară de linkuri).
    stage.addEventListener('click', (e) => { if (!e.target.closest('a, button')) go(idx + 1); });

    draw();
    box.ecranComplet = toggleFull;
    return box;
  }

  // Transformă o prezentare din Atelier în diapozitive pentru render().
  function dinAtelier(p, markdown) {
    const slides = p.diapozitive.map((d) => ({
      notes: d.note,
      cls: d.aspect === 'titlu' ? 'slide-cover' : `aspect-${d.aspect}`,
      build() {
        const c = h('div', { class: 'prose' });
        if (d.titlu.trim()) c.append(h('h2', {}, d.titlu));
        const text = d.text.trim() ? [...markdown(d.text).childNodes] : [];
        const img = d.imagine && IMAGINE.test(d.imagine) ? h('img', { src: d.imagine, alt: d.titlu || 'Imagine' }) : null;
        if (d.aspect === 'text-imagine') c.append(h('div', { class: 'slide-cols' }, h('div', {}, text), img ? h('div', { class: 'slide-fig' }, img) : null));
        else {
          c.append(...text);
          if (img) c.append(img);
        }
        if (!c.childNodes.length) c.append(h('p', { class: 'slide-empty' }, 'Diapozitiv gol'));
        return c;
      },
    }));
    return { title: p.titlu, tema: p.tema, slides, errors: slides.length ? [] : ['prezentarea nu are niciun diapozitiv'] };
  }

  const api = { TEME, ASPECTE, LIMITE, isDeck, parse, extract, curata, dinAtelier, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EduDiapozitive = api;
})(typeof window !== 'undefined' ? window : globalThis);

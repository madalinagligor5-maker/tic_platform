'use strict';
// Prezentări edudigi („diapozitive”), scrise direct în Markdown, fără PowerPoint:
//
//   ```diapozitive
//   # Titlul prezentării          (opțional)
//   tema: albastru                (opțional: rosu, albastru, verde, portocaliu, mov, alb, intunecat, noapte)
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
  const TEME = ['rosu', 'albastru', 'verde', 'portocaliu', 'mov', 'alb', 'intunecat', 'noapte'];
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
  // Forma unei prezentări:
  //   { titlu, tema, raport: '16:9' | '4:3',
  //     diapozitive: [{ aspect, titlu, text, imagine, note, tranzitie, animatie, stil: { aliniere, marime, culoare } }] }
  // Textul are o formatare simplă: rânduri; „- ” la început = listă cu marcatori; **aldin**, *cursiv*, __subliniat__.
  // curata() păstrează doar câmpurile și valorile cunoscute și verifică limitele, ca nimic periculos să nu fie salvat.
  const ASPECTE = {
    titlu: 'Diapozitiv titlu',
    text: 'Titlu și conținut',
    'text-imagine': 'Conținut și imagine',
    imagine: 'Imagine cu legendă',
    antet: 'Antet de secțiune',
  };
  const TRANZITII = { niciuna: 'Niciuna', estompare: 'Estompare', impingere: 'Împingere', stergere: 'Ștergere', zoom: 'Zoom', rasucire: 'Răsucire' };
  const ANIMATII = { niciuna: 'Niciuna', aparitie: 'Apariție', estompare: 'Estompare', zbor: 'Zbor spre interior', zoom: 'Zoom', saritura: 'Săritură' };
  const ALINIERI = { auto: 'Automat', stanga: 'Stânga', centru: 'Centru', dreapta: 'Dreapta' };
  const MARIMI = { mic: 'Mic', normal: 'Normal', mare: 'Mare', 'foarte-mare': 'Foarte mare' };
  const CULORI = { implicit: 'Automată', negru: 'Negru', alb: 'Alb', rosu: 'Roșu', albastru: 'Albastru', verde: 'Verde', portocaliu: 'Portocaliu', mov: 'Mov' };
  const RAPOARTE = ['16:9', '4:3'];
  const LIMITE = { titlu: 120, text: 1500, note: 1000, diapozitive: 40, imagine: 700 * 1024, total: 3 * 1024 * 1024 };
  const IMAGINE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const dinLista = (v, lista, implicit) => (Object.prototype.hasOwnProperty.call(lista, v) ? v : implicit);
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
      const st = x.stil && typeof x.stil === 'object' ? x.stil : {};
      const n = `diapozitivul ${i + 1}`;
      let imagine = typeof x.imagine === 'string' ? x.imagine : '';
      if (imagine && (!IMAGINE.test(imagine) || imagine.length > LIMITE.imagine)) {
        errors.push(`imaginea de pe ${n} nu este acceptată (doar JPG, PNG sau WebP, cel mult 700 KB)`);
        imagine = '';
      }
      total += imagine.length;
      return {
        aspect: dinLista(x.aspect, ASPECTE, 'text'),
        titlu: str(x.titlu, LIMITE.titlu, `titlul de pe ${n}`),
        text: str(x.text, LIMITE.text, `textul de pe ${n}`),
        imagine,
        note: str(x.note, LIMITE.note, `notele de pe ${n}`),
        tranzitie: dinLista(x.tranzitie, TRANZITII, 'niciuna'),
        animatie: dinLista(x.animatie, ANIMATII, 'niciuna'),
        stil: {
          aliniere: dinLista(st.aliniere, ALINIERI, 'auto'),
          marime: dinLista(st.marime, MARIMI, 'normal'),
          culoare: dinLista(st.culoare, CULORI, 'implicit'),
        },
      };
    });
    if (total > LIMITE.total) errors.push('imaginile din prezentare sunt prea mari în total (cel mult 3 MB)');
    const prezentare = {
      titlu: str(p.titlu, LIMITE.titlu, 'titlul prezentării').trim() || 'Prezentare fără titlu',
      tema: TEME.includes(p.tema) ? p.tema : 'rosu',
      raport: RAPOARTE.includes(p.raport) ? p.raport : '16:9',
      diapozitive,
    };
    return { prezentare, errors };
  }

  // Textul unui diapozitiv, împărțit în rânduri: { lista: bool, bucati: [{ text, b, i, u }] }.
  function randuri(text) {
    return text.split('\n').map((l) => {
      const lista = /^\s*[-•]\s+/.test(l);
      const t = lista ? l.replace(/^\s*[-•]\s+/, '') : l;
      const bucati = [];
      const re = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*/g;
      let last = 0, m;
      while ((m = re.exec(t))) {
        if (m.index > last) bucati.push({ text: t.slice(last, m.index) });
        bucati.push(m[1] != null ? { text: m[1], b: true } : m[2] != null ? { text: m[2], u: true } : { text: m[3], i: true });
        last = m.index + m[0].length;
      }
      if (last < t.length) bucati.push({ text: t.slice(last) });
      return { lista, bucati };
    });
  }
  const cuvinte = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  // Sfaturile de design din lecție, pentru un diapozitiv (folosite în Atelier).
  function sfaturi(d, i) {
    const s = [];
    const n = cuvinte(`${d.titlu} ${d.text.replace(/\*|_/g, '')}`);
    const r = d.text.split('\n').filter((l) => l.trim()).length;
    if (n > 40) s.push(`are ${n} de cuvinte (cel mult 40)`);
    if (r > 7) s.push(`are ${r} rânduri (cel mult 6–7)`);
    if (/[A-ZĂÂÎȘȚ]{12,}/.test(d.text.replace(/[\s*_-]/g, ''))) s.push('are text scris doar cu majuscule');
    if (i === 0 && d.aspect !== 'titlu') s.push('primul diapozitiv ar trebui să fie diapozitivul de titlu');
    if ((d.aspect === 'imagine' || d.aspect === 'text-imagine') && !d.imagine) s.push('așteaptă o imagine');
    if (d.stil?.marime === 'mic' && n > 0) s.push('textul mic se vede greu din spatele clasei');
    return s;
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

  // Textul formatat al unui diapozitiv din Atelier, ca elemente (totul inserat ca text, în siguranță).
  // pas = true marchează paragrafele / punctele care apar pe rând, când diapozitivul are o animație.
  function textFormatat(text, pas = false) {
    const out = [];
    let ul = null;
    for (const r of randuri(text)) {
      const gol = !r.bucati.some((b) => b.text.trim());
      if (gol) { ul = null; continue; }
      const continut = r.bucati.map((b) => {
        let el = document.createTextNode(b.text);
        if (b.b) el = h('strong', {}, el);
        if (b.i) el = h('em', {}, el);
        if (b.u) el = h('u', {}, el);
        return el;
      });
      if (r.lista) {
        if (!ul) out.push((ul = h('ul')));
        ul.append(h('li', { class: pas ? 'pas' : null }, continut));
      } else {
        ul = null;
        out.push(h('p', { class: pas ? 'pas' : null }, continut));
      }
    }
    return out;
  }

  // Conținutul unui diapozitiv din Atelier. Folosit de vizualizator, de miniaturi și de imprimare.
  function continutDiapozitiv(d, { pasi = false } = {}) {
    const st = d.stil || {};
    const c = h('div', { class: `slide-content pp al-${st.aliniere || 'auto'} mar-${st.marime || 'normal'} cul-${st.culoare || 'implicit'}` });
    const titlu = d.titlu.trim() ? h('h2', { class: 'pp-titlu' }, d.titlu) : null;
    const corp = h('div', { class: 'pp-corp' }, textFormatat(d.text, pasi && d.animatie && d.animatie !== 'niciuna'));
    const img = d.imagine && IMAGINE.test(d.imagine) ? h('img', { src: d.imagine, alt: d.titlu || 'Imagine' }) : null;
    if (d.aspect === 'text-imagine') c.append(titlu || '', h('div', { class: 'pp-coloane' }, corp, h('div', { class: 'pp-fig' }, img)));
    else if (d.aspect === 'imagine') c.append(titlu || '', h('div', { class: 'pp-fig mare' }, img), corp);
    else c.append(titlu || '', corp);
    if (!titlu && !d.text.trim() && !img) c.append(h('p', { class: 'slide-empty' }, 'Diapozitiv gol'));
    return c;
  }
  const clasaAspect = (d) => `pp-slide aspect-${d.aspect}${d.aspect === 'titlu' ? ' slide-cover' : ''}`;

  // Un diapozitiv mic (miniatură), cu aceeași temă. Textul se micșorează singur (unități cqi).
  function miniatura(d, tema, raport) {
    return h('div', { class: `deck tema-${tema} mini${raport === '4:3' ? ' raport-43' : ''}`, 'aria-hidden': 'true' },
      h('div', { class: 'deck-stage' }, h('section', { class: `slide ${clasaAspect(d)}` }, continutDiapozitiv(d))));
  }

  // markdown: funcția din app.js care transformă Markdown în elemente, în siguranță.
  // opts.start: diapozitivul de la care se pornește; opts.onChange(i): anunță diapozitivul curent (pentru Atelier).
  function render(deck, markdown, opts = {}) {
    if (deck.errors.length) return h('div', { class: 'activity act-error' }, h('b', {}, 'Prezentarea nu poate fi afișată: '), deck.errors.join('; '));
    const n = deck.slides.length;
    let idx = Math.max(0, Math.min(opts.start || 0, n - 1)), notesOn = false, aratate = 0;

    const slides = deck.slides.map((s, i) => {
      const content = s.build ? s.build() : markdown(s.md);
      content.classList.add('slide-content');
      const cls = s.cls ?? (i === 0 ? 'slide-cover' : '');
      return h('section', {
        class: `slide ${cls}`, role: 'group', 'aria-roledescription': 'diapozitiv',
        'aria-label': `Diapozitivul ${i + 1} din ${n}`, hidden: i !== idx,
      }, content);
    });
    // Elementele care apar pe rând (animații „la clic”), pentru fiecare diapozitiv.
    const pasi = slides.map((s) => [...s.querySelectorAll('.pas')]);
    const stage = h('div', { class: 'deck-stage' }, slides);
    const bar = h('div', { class: 'deck-progress', 'aria-hidden': 'true' }, h('span'));
    const counter = h('span', { class: 'deck-count', 'aria-live': 'polite' });
    const prevBtn = h('button', { class: 'deck-btn', type: 'button', 'aria-label': 'Înapoi', onclick: () => inapoi() }, icon('prev'));
    const nextBtn = h('button', { class: 'deck-btn', type: 'button', 'aria-label': 'Înainte', onclick: () => inainte() }, icon('next'));
    const hasNotes = deck.slides.some((s) => s.notes);
    const notesBox = h('div', { class: 'deck-notes', hidden: true });
    const notesBtn = hasNotes ? h('button', { class: 'chip small', type: 'button', 'aria-pressed': 'false', onclick: () => {
      notesOn = !notesOn;
      notesBtn.setAttribute('aria-pressed', String(notesOn));
      draw();
    } }, 'Note') : null;
    const fullBtn = h('button', { class: 'deck-btn', type: 'button', 'aria-label': 'Ecran complet', title: 'Ecran complet (F)', onclick: () => toggleFull() }, icon('full'));

    const box = h('div', {
      class: `deck tema-${deck.tema}${deck.raport === '4:3' ? ' raport-43' : ''}`, tabindex: '0', role: 'region', 'aria-roledescription': 'prezentare',
      'aria-label': deck.title ? `Prezentare: ${deck.title}` : 'Prezentare',
    },
      h('div', { class: 'deck-head' },
        h('span', { class: 'act-type' }, 'Prezentare'),
        deck.title ? h('h4', {}, deck.title) : null,
        h('span', { class: 'deck-hint muted' }, 'Folosește săgețile ← → sau glisează.')),
      h('div', { class: 'deck-frame' }, stage, bar),
      h('div', { class: 'deck-controls' }, prevBtn, counter, nextBtn, h('span', { class: 'deck-spacer' }), notesBtn, fullBtn),
      notesBox);

    const TR = ['in-next', 'in-prev', ...Object.keys(TRANZITII).map((t) => `tr-${t}`)];
    function draw(dir) {
      slides.forEach((s, i) => {
        s.hidden = i !== idx;
        s.classList.remove(...TR);
      });
      const s = slides[idx];
      // La pornire și înainte: elementele animate pornesc ascunse; înapoi: diapozitivul apare întreg.
      aratate = dir < 0 ? pasi[idx].length : 0;
      pasi[idx].forEach((el, j) => {
        el.classList.toggle('pas-ascuns', j >= aratate);
        el.classList.remove('pas-intra');
      });
      if (dir) {
        void s.offsetWidth; // repornește animația
        const tr = deck.slides[idx].tranzitie;
        if (tr === 'niciuna') { /* fără efect */ } else if (tr) s.classList.add(`tr-${tr}`);
        else s.classList.add(dir > 0 ? 'in-next' : 'in-prev');
      }
      counter.textContent = `${idx + 1} / ${n}`;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === n - 1 && aratate >= pasi[idx].length;
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
    // Înainte: întâi apar, pe rând, elementele animate; apoi se trece la diapozitivul următor.
    function inainte() {
      const p = pasi[idx];
      if (aratate < p.length) {
        const el = p[aratate++];
        el.classList.remove('pas-ascuns');
        void el.offsetWidth;
        el.classList.add('pas-intra', `anim-${deck.slides[idx].animatie}`);
        nextBtn.disabled = idx === n - 1 && aratate >= p.length;
        return;
      }
      go(idx + 1);
    }
    const inapoi = () => go(idx - 1);
    function toggleFull() {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else box.requestFullscreen?.().then(() => box.focus()).catch(() => {});
    }

    box.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter' || (k === ' ' && e.target === box)) inainte();
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') inapoi();
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
      if (Math.abs(dx) > 50) (dx < 0 ? inainte : inapoi)();
    });
    // Clic pe diapozitiv = înainte (în afară de linkuri).
    stage.addEventListener('click', (e) => { if (!e.target.closest('a, button')) inainte(); });

    draw();
    box.ecranComplet = toggleFull;
    return box;
  }

  // Transformă o prezentare din Atelier în diapozitive pentru render().
  function dinAtelier(p) {
    const slides = p.diapozitive.map((d) => ({
      notes: d.note,
      tranzitie: d.tranzitie || 'niciuna',
      animatie: d.animatie || 'niciuna',
      cls: clasaAspect(d),
      build: () => continutDiapozitiv(d, { pasi: true }),
    }));
    return { title: p.titlu, tema: p.tema, raport: p.raport, slides, errors: slides.length ? [] : ['prezentarea nu are niciun diapozitiv'] };
  }

  const api = {
    TEME, ASPECTE, TRANZITII, ANIMATII, ALINIERI, MARIMI, CULORI, RAPOARTE, LIMITE,
    isDeck, parse, extract, curata, randuri, sfaturi, cuvinte,
    textFormatat, continutDiapozitiv, clasaAspect, miniatura, dinAtelier, render,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EduDiapozitive = api;
})(typeof window !== 'undefined' ? window : globalThis);

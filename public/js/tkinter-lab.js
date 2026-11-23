'use strict';
// Laborator tkinter: programul Python rulează în interpretorul din Editorul Python (modulul tkinter este simulat),
// iar fereastra descrisă de program (rânduri „@T|…”) se desenează aici, cu butoane, casete de text, liste, desen și meniuri.
// Clicurile și tastele se întorc în program ca apeluri tkinter._ev(...), deci funcțiile (command=, bind) rulează cu adevărat.
(() => {
  if (!window.EduApp) return;
  const { h } = window.EduApp;
  const SCRIPT = '/js/aplicatii/python.js';

  const deseaca = (t) => t.replace(/\\(\\|p|n)/g, (m, c) => (c === 'p' ? '|' : c === 'n' ? '\n' : '\\'));
  const pyStr = (s) => JSON.stringify(String(s)); // șir valid și în Python (pentru caracterele folosite aici)
  const culoare = (c) => { if (!c) return ''; const t = String(c).trim(); if (/^#[0-9a-f]{3,8}$/i.test(t) || /^[a-z]+$/i.test(t)) return t; return ''; };

  // Creează un laborator: { el (DOM), ruleaza(cod), opreste(), onConsola }
  function creeaza(opt = {}) {
    const consola = h('pre', { class: 'tkl-consola', role: 'log', 'aria-live': 'polite', 'aria-label': 'Ieșirea programului' });
    const zona = h('div', { class: 'tkl-zona' });
    const goala = () => zona.replaceChildren(h('p', { class: 'tkl-gol' }, 'Rulează programul și fereastra apare aici.'));
    goala();
    const el = h('div', { class: 'tkl' }, zona, consola);
    let worker = null, W = null, timere = new Map(), ocupat = false, inchisa = false, esteGata = false;

    const stare = () => ({ w: new Map(), radacina: null });
    let st = stare();
    const wd = (id) => st.w.get(id);
    const scrieConsola = (t, c = '') => { const s = h('span', { class: c }, t); consola.append(s); consola.scrollTop = consola.scrollHeight; };

    // ----- procesarea rândurilor @T -----
    function aplica(parti) {
      const [op, ...a] = parti;
      const id = Number(a[0]);
      switch (op) {
        case 'new': {
          const w = { id, tip: a[1], parinte: Number(a[2]) || 0, opt: {}, copii: [], geom: null, cb: false, bind: new Set(), val: '', valMod: false, items: [], sel: '', forme: [], ascuns: false, meniuri: [] };
          st.w.set(id, w);
          if (w.tip === 'Tk') st.radacina = w;
          else { const p = wd(w.parinte) || st.radacina; if (p) { w.parinte = p.id; p.copii.push(w); } }
          break;
        }
        case 'cfg': { const w = wd(id); if (w) w.opt[a[1]] = a[2]; break; }
        case 'cb': { const w = wd(id); if (w) w.cb = true; break; }
        case 'title': { const w = wd(id); if (w) w.opt.__titlu = a[1]; break; }
        case 'geom': { const w = wd(id); if (w) w.opt.__geom = a[1]; break; }
        case 'pack': { const w = wd(id); if (w) { w.geom = { t: 'pack', side: a[1], fill: a[2], expand: a[3] === '1', padx: Number(a[4]) || 0, pady: Number(a[5]) || 0, anchor: a[6] }; w.ascuns = false; } break; }
        case 'grid': { const w = wd(id); if (w) { w.geom = { t: 'grid', row: Number(a[1]) || 0, col: Number(a[2]) || 0, rs: Number(a[3]) || 1, cs: Number(a[4]) || 1, sticky: a[5] || '', padx: Number(a[6]) || 0, pady: Number(a[7]) || 0 }; w.ascuns = false; } break; }
        case 'place': { const w = wd(id); if (w) { w.geom = { t: 'place', x: Number(a[1]) || 0, y: Number(a[2]) || 0, rx: Number(a[3]) || 0, ry: Number(a[4]) || 0, wd: Number(a[5]) || 0, ht: Number(a[6]) || 0 }; w.ascuns = false; } break; }
        case 'hide': { const w = wd(id); if (w) w.ascuns = true; break; }
        case 'destroy': { const w = wd(id); if (w) { const p = wd(w.parinte); if (p) p.copii = p.copii.filter((x) => x.id !== id); st.w.delete(id); } break; }
        case 'val': { const w = wd(id); if (w) { w.val = a[1] ?? ''; w.valMod = false; } break; }
        case 'lst': { const w = wd(id); if (w) w.items = (a[1] ?? '') === '' ? [] : deseaca(a[1]).split('\n'); break; }
        case 'bind': { const w = wd(id); if (w) w.bind.add(a[1]); break; }
        case 'cv': { const w = wd(id); if (w) w.forme.push({ k: a[1], c: (a[2] || '').split(',').map(Number), fill: culoare(a[3]), outline: culoare(a[4]), lat: Number(a[5]) || 1, text: a[6] || '', font: a[7] || '' }); break; }
        case 'cvdel': { const w = wd(id); if (w) w.forme = []; break; }
        case 'mi': { const w = wd(id); if (w) w.meniuri.push({ tip: a[1], eticheta: a[2], x: a[3] }); break; }
        case 'colcfg': case 'rowcfg': break;
        case 'after': { const n = Number(a[0]), ms = Number(a[1]) || 0; timere.set(n, setTimeout(() => { timere.delete(n); trimite(`import tkinter as _t\n_t._after(${n})`); }, ms)); break; }
        case 'acancel': { const n = Number(a[0]); clearTimeout(timere.get(n)); timere.delete(n); break; }
        case 'msg': mesaje.push({ tip: a[0], titlu: a[1], text: a[2] }); break;
        case 'quit': inchisa = true; break;
        case 'main': break;
        default:
      }
    }
    let mesaje = [];

    // ----- desenarea ferestrei -----
    const dim = (v, implicit) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : implicit; };
    const stilul = (e, w) => {
      const o = w.opt;
      const fg = culoare(o.fg || o.foreground), bg = culoare(o.bg || o.background);
      if (fg) e.style.color = fg; if (bg) e.style.backgroundColor = bg;
      const f = o.font;
      if (f) {
        const m = /\(?\s*['"]?([^,'")]+)['"]?\s*(?:,\s*(\d+))?\s*(?:,\s*['"]?([a-z ]+)['"]?)?\s*\)?/i.exec(String(f));
        if (m) { if (m[1] && !/^\d+$/.test(m[1].trim())) e.style.fontFamily = `${m[1].trim()}, sans-serif`; if (m[2]) e.style.fontSize = `${Math.round(Number(m[2]) * 1.33)}px`; if (m[3]) { if (/bold/.test(m[3])) e.style.fontWeight = '800'; if (/italic/.test(m[3])) e.style.fontStyle = 'italic'; if (/underline/.test(m[3])) e.style.textDecoration = 'underline'; } }
      }
      const rel = o.relief; if (rel === 'sunken' || rel === 'groove') e.classList.add('tkl-sunken'); else if (rel === 'raised' || rel === 'ridge') e.classList.add('tkl-raised'); else if (rel === 'solid') e.classList.add('tkl-solid');
      const bd = Number(o.bd ?? o.borderwidth); if (Number.isFinite(bd) && bd > 0 && !rel) { e.style.border = `${bd}px solid #888`; }
      if (o.padx) e.style.paddingInline = `${Number(o.padx)}px`; if (o.pady) e.style.paddingBlock = `${Number(o.pady)}px`;
      if (o.state === 'disabled') { e.disabled = true; e.classList.add('tkl-dez'); }
    };
    function construieste(w) {
      const o = w.opt;
      let e;
      switch (w.tip) {
        case 'Label': {
          e = h('span', { class: 'tkl-label' }, String(o.text ?? ''));
          if (o.width) e.style.minWidth = `${dim(o.width, 5)}ch`; if (o.wraplength) e.style.maxWidth = `${o.wraplength}px`;
          if (o.justify === 'left' || o.anchor === 'w') e.style.textAlign = 'left'; else if (o.justify === 'right' || o.anchor === 'e') e.style.textAlign = 'right';
          stilul(e, w); break;
        }
        case 'Button': {
          e = h('button', { type: 'button', class: 'tkl-buton' }, String(o.text ?? ''));
          if (o.width) e.style.minWidth = `${dim(o.width, 5)}ch`;
          stilul(e, w);
          e.addEventListener('click', () => { if (w.cb && !e.disabled) eveniment(`_t._ev(${w.id})`); });
          break;
        }
        case 'Entry': {
          e = h('input', { type: o.show ? 'password' : 'text', class: 'tkl-intrare', 'aria-label': 'Casetă de text' }); e.value = w.val;
          if (o.width) e.style.width = `${dim(o.width, 20)}ch`; else e.style.width = '20ch';
          stilul(e, w);
          e.addEventListener('input', () => { w.val = e.value; w.valMod = true; });
          for (const q of w.bind) legaTaste(e, w, q);
          break;
        }
        case 'Text': {
          e = h('textarea', { class: 'tkl-text', 'aria-label': 'Zonă de text' }); e.value = w.val;
          e.rows = dim(o.height, 6); e.cols = dim(o.width, 40); stilul(e, w);
          e.addEventListener('input', () => { w.val = e.value; w.valMod = true; });
          break;
        }
        case 'Listbox': {
          e = h('div', { class: 'tkl-lista', role: 'listbox', 'aria-label': 'Listă' });
          e.style.minHeight = `${dim(o.height, 6) * 1.5}em`; e.style.minWidth = `${dim(o.width, 20)}ch`;
          const sel = new Set(w.sel === '' ? [] : String(w.sel).split(',').map(Number));
          w.items.forEach((t, i) => { const r = h('div', { class: `tkl-elem${sel.has(i) ? ' sel' : ''}`, role: 'option', 'aria-selected': String(sel.has(i)) }, t); r.addEventListener('click', () => { w.sel = String(i); for (const x of e.children) x.classList.remove('sel'); r.classList.add('sel'); }); e.append(r); });
          stilul(e, w); break;
        }
        case 'Canvas': {
          e = h('canvas', { class: 'tkl-panza', role: 'img', 'aria-label': 'Desen' }); e.width = dim(o.width, 300); e.height = dim(o.height, 200);
          if (culoare(o.bg || o.background)) e.style.backgroundColor = culoare(o.bg || o.background);
          deseneaza(e, w);
          break;
        }
        case 'Frame': case 'LabelFrame': {
          e = h('div', { class: `tkl-frame${w.tip === 'LabelFrame' ? ' cu-titlu' : ''}` });
          if (w.tip === 'LabelFrame') e.append(h('div', { class: 'tkl-legenda' }, String(o.text ?? '')));
          if (o.width) e.style.minWidth = `${dim(o.width, 0)}px`; if (o.height) e.style.minHeight = `${dim(o.height, 0)}px`;
          stilul(e, w); aranjeaza(e, w); break;
        }
        default: e = h('span', {}, `(${w.tip})`);
      }
      return e;
    }
    function legaTaste(e, w, seq) {
      const m = /^<(?:Key-)?(.+?)>$/.exec(seq); if (!m) return;
      const nume = m[1];
      e.addEventListener('keydown', (ev) => {
        const ks = ev.key === 'Enter' ? 'Return' : ev.key === ' ' ? 'space' : ev.key;
        if (nume === 'Key' || nume === ks || (nume === 'Return' && ks === 'Return') || (nume.length === 1 && ev.key === nume)) eveniment(`_t._evb(${w.id}, ${pyStr(seq)}, ${pyStr(ev.key.length === 1 ? ev.key : '')}, ${pyStr(ks)}, 0, 0)`);
      });
    }
    function deseneaza(cv, w) {
      const g = cv.getContext('2d');
      for (const f of w.forme) {
        g.lineWidth = f.lat; g.strokeStyle = f.outline || '#000'; g.fillStyle = f.fill || 'transparent';
        const [x1, y1, x2, y2] = f.c;
        if (f.k === 'rect') { if (f.fill) g.fillRect(x1, y1, x2 - x1, y2 - y1); g.strokeRect(x1, y1, x2 - x1, y2 - y1); }
        else if (f.k === 'oval') { g.beginPath(); g.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2); if (f.fill) g.fill(); g.stroke(); }
        else if (f.k === 'line') { g.strokeStyle = f.fill || '#000'; g.beginPath(); g.moveTo(f.c[0], f.c[1]); for (let i = 2; i + 1 < f.c.length; i += 2) g.lineTo(f.c[i], f.c[i + 1]); g.stroke(); }
        else if (f.k === 'text') { g.fillStyle = f.fill || '#000'; g.font = '14px sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(f.text, x1, y1); }
      }
    }
    // Aranjarea copiilor unui container (pack, grid sau place)
    function aranjeaza(cont, w) {
      const vizibili = w.copii.filter((c) => c.geom && !c.ascuns);
      if (!vizibili.length) return;
      const grila = vizibili.filter((c) => c.geom.t === 'grid'), pack = vizibili.filter((c) => c.geom.t === 'pack'), plasat = vizibili.filter((c) => c.geom.t === 'place');
      if (grila.length) {
        cont.classList.add('tkl-g');
        for (const c of grila) {
          const e = construieste(c), g = c.geom;
          e.style.gridRow = `${g.row + 1} / span ${g.rs}`; e.style.gridColumn = `${g.col + 1} / span ${g.cs}`;
          e.style.margin = `${g.pady}px ${g.padx}px`;
          const sk = g.sticky.toLowerCase();
          e.style.justifySelf = sk.includes('e') && sk.includes('w') ? 'stretch' : sk.includes('e') ? 'end' : sk.includes('w') ? 'start' : 'center';
          e.style.alignSelf = sk.includes('n') && sk.includes('s') ? 'stretch' : sk.includes('s') ? 'end' : sk.includes('n') ? 'start' : 'center';
          cont.append(e);
        }
      }
      if (pack.length) {
        cont.classList.add('tkl-p');
        let rand = null, dir = '';
        for (const c of pack) {
          const e = construieste(c), g = c.geom, orizontal = g.side === 'left' || g.side === 'right';
          e.style.margin = `${g.pady}px ${g.padx}px`;
          if (g.fill === 'x' || g.fill === 'both') e.style.flex = '1 1 auto';
          if (g.expand) e.style.flex = '1 1 auto';
          if (orizontal) {
            if (!rand || dir !== 'h') { rand = h('div', { class: 'tkl-rand' }); dir = 'h'; cont.append(rand); }
            if (g.side === 'right') rand.style.justifyContent = 'flex-end';
            rand.append(e);
          } else {
            rand = h('div', { class: 'tkl-rand' }); dir = 'v';
            if (g.fill === 'x' || g.fill === 'both') rand.classList.add('plin');
            rand.append(e); cont.append(rand);
          }
        }
      }
      if (plasat.length) {
        cont.classList.add('tkl-pl');
        for (const c of plasat) { const e = construieste(c), g = c.geom; e.style.position = 'absolute'; e.style.left = g.rx ? `${g.rx * 100}%` : `${g.x}px`; e.style.top = g.ry ? `${g.ry * 100}%` : `${g.y}px`; if (g.wd) e.style.width = `${g.wd}px`; if (g.ht) e.style.height = `${g.ht}px`; cont.append(e); }
      }
    }
    function bara(rad) {
      const m = rad.opt.menu ? wd(Number(rad.opt.menu)) : null;
      if (!m) return null;
      const b = h('div', { class: 'tkl-meniu', role: 'menubar' });
      for (const it of m.meniuri.filter((x) => x.tip === 'casc')) {
        const sub = wd(Number(it.x));
        const buton = h('button', { type: 'button', class: 'tkl-mbuton', 'aria-haspopup': 'true' }, it.eticheta);
        const lista = h('div', { class: 'tkl-mlista', role: 'menu', hidden: true });
        for (const x of sub ? sub.meniuri : []) {
          if (x.tip === 'sep') { lista.append(h('hr', {})); continue; }
          const i = h('button', { type: 'button', class: 'tkl-mitem', role: 'menuitem' }, x.eticheta);
          i.addEventListener('click', () => { lista.hidden = true; eveniment(`_t._evm(${sub.id}, ${Number(x.x)})`); });
          lista.append(i);
        }
        buton.addEventListener('click', (ev) => { ev.stopPropagation(); const deschis = !lista.hidden; for (const l of b.querySelectorAll('.tkl-mlista')) l.hidden = true; lista.hidden = deschis; });
        b.append(h('div', { class: 'tkl-mgrup' }, buton, lista));
      }
      return b;
    }
    function reda() {
      const rad = st.radacina;
      if (!rad) { goala(); return; }
      const geo = /^(\d+)x(\d+)/.exec(rad.opt.__geom || '');
      const client = h('div', { class: 'tkl-client' });
      if (culoare(rad.opt.bg || rad.opt.background)) client.style.backgroundColor = culoare(rad.opt.bg || rad.opt.background);
      if (geo) { client.style.width = `${Math.min(Number(geo[1]), 900)}px`; client.style.height = `${Math.min(Number(geo[2]), 700)}px`; } else client.style.minWidth = '260px';
      aranjeaza(client, rad);
      if (!rad.copii.some((c) => c.geom && !c.ascuns)) client.append(h('p', { class: 'tkl-gol' }, 'Fereastra este goală: adaugă widget-uri și așază-le cu pack(), grid() sau place().'));
      const fereastra = h('div', { class: `tkl-fereastra${inchisa ? ' inchisa' : ''}`, role: 'application', 'aria-label': `Fereastra „${rad.opt.__titlu || 'tk'}”` },
        h('div', { class: 'tkl-titlu' }, h('span', { class: 'tkl-ic', 'aria-hidden': 'true' }, '🪟'), h('span', {}, rad.opt.__titlu || 'tk'), h('span', { class: 'tkl-x', 'aria-hidden': 'true' }, '✕')),
        bara(rad), client);
      zona.replaceChildren(fereastra);
      if (inchisa) zona.append(h('p', { class: 'tkl-info' }, 'Fereastra a fost închisă de program (destroy / quit).'));
      for (const m of mesaje) zona.append(dialog(m));
      mesaje = [];
    }
    function dialog(m) {
      const ic = { info: 'ℹ️', warning: '⚠️', error: '⛔', question: '❓' }[m.tip] || 'ℹ️';
      const d = h('div', { class: 'tkl-dialog', role: 'alertdialog', 'aria-label': m.titlu },
        h('div', { class: 'tkl-dtitlu' }, m.titlu || 'Mesaj'), h('div', { class: 'tkl-dcorp' }, h('span', { class: 'tkl-dic', 'aria-hidden': 'true' }, ic), h('p', {}, m.text)),
        h('button', { type: 'button', class: 'tkl-buton', onclick: () => d.remove() }, 'OK'));
      return d;
    }

    // ----- comunicarea cu programul -----
    function procesare(linii) {
      let neprocesat = false;
      for (const l of linii) {
        if (l.startsWith('@T|')) { aplica(l.slice(3).split('|').map(deseaca)); neprocesat = true; }
      }
      return neprocesat;
    }
    function eveniment(cod) {
      if (!W || !esteGata || ocupat) return;
      // trimite întâi valorile modificate de elev în casete
      let sync = 'import tkinter as _t\n';
      for (const w of st.w.values()) {
        if ((w.tip === 'Entry' || w.tip === 'Text') && w.valMod) { sync += `_t._val(${w.id}, ${pyStr(w.val)})\n`; w.valMod = false; }
        if (w.tip === 'Listbox' && w.sel !== '') sync += `_t._sel(${w.id}, ${pyStr(w.sel)})\n`;
      }
      trimite(sync + cod.replace(/^import tkinter as _t\n/, ''));
    }
    function trimite(cod) { if (!W) return; esteGata = false; ocupat = true; W.postMessage({ c: 'repl', cod }); }
    function ruleaza(cod) {
      opreste(); consola.replaceChildren(); st = stare(); mesaje = []; inchisa = false; esteGata = false;
      zona.replaceChildren(h('p', { class: 'tkl-gol' }, '⏳ Se pornește programul…'));
      try { W = new Worker(SCRIPT); } catch { scrieConsola('Acest browser nu permite rularea programelor.\n', 'e'); return; }
      ocupat = true;
      W.onerror = (e) => { e.preventDefault?.(); scrieConsola('Motorul Python nu a putut porni.\n', 'e'); };
      W.onmessage = (ev) => {
        const m = ev.data;
        if (m.t === 'lot') {
          const ops = [], afis = [];
          for (const x of m.l) {
            if (x.t !== 'out') continue;
            const pastrate = [];
            for (const l of x.s.split('\n')) { if (l.startsWith('@T|')) ops.push(l); else pastrate.push(l); }
            const t = pastrate.join('\n'); if (t) afis.push([t, x.k]);
          }
          procesare(ops);
          for (const [t, k] of afis) scrieConsola(t, k === 'e' ? 'e' : '');
        } else if (m.t === 'input') W.postMessage({ c: 'input', text: null });
        else if (m.t === 'gata') {
          ocupat = false; esteGata = true;
          if (m.rez && m.rez.eroare && !m.rez.ok) { scrieConsola(m.rez.eroare.text, 'e'); if (m.rez.eroare.expl) scrieConsola(`💡 ${m.rez.eroare.expl}\n`, 'ex'); }
          reda();
          if (opt.laGata) opt.laGata(st);
        }
      };
      W.postMessage({ c: 'run', cod, fisier: 'program.py' });
    }
    function opreste() { for (const t of timere.values()) clearTimeout(t); timere.clear(); try { W?.terminate(); } catch { /* ignorat */ } W = null; ocupat = false; esteGata = false; }
    // Pentru verificări (teme): arborele de widget-uri creat de ultima rulare
    const inventar = () => { const r = {}; for (const w of st.w.values()) r[w.tip] = (r[w.tip] || 0) + 1; return r; };
    return { el, ruleaza, opreste, inventar };
  }

  window.TkLab = { creeaza };
})();

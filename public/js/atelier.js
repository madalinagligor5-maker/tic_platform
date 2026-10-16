'use strict';
// Atelierul de prezentări: elevii își fac singuri prezentări, diapozitiv cu diapozitiv, și le prezintă pe ecran complet.
// Elevii în cont își salvează prezentările în cont (le vede și profesorul); fără cont, se salvează în acest browser.
// Prezentarea se poate descărca într-un fișier .json și deschide din nou, pe orice calculator.
(() => {
  const { h, show, markdown, routes } = window.EduApp;
  const { sesiune, api, cand } = window.EduCont;
  const D = window.EduDiapozitive;
  const LOCAL = 'edudigi_atelier';
  const eElev = () => sesiune()?.rol === 'elev';
  const umple = (el, ...copii) => el.replaceChildren(...copii.flat().filter((c) => c != null && c !== false));
  const TEME = { rosu: 'Roșu', albastru: 'Albastru', verde: 'Verde', portocaliu: 'Portocaliu', intunecat: 'Întunecat' };

  // ---------- Stocare: în cont (elev) sau în browser ----------
  function citesteLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL) || '{}'); } catch { return {}; }
  }
  function scrieLocal(toate) {
    try { localStorage.setItem(LOCAL, JSON.stringify(toate)); } catch {
      throw new Error('Nu mai este loc în browser. Folosește imagini mai puține sau descarcă prezentarea într-un fișier.');
    }
  }
  const store = {
    async lista() {
      if (eElev()) return api('GET', '/api/elev/prezentari');
      return Object.entries(citesteLocal())
        .map(([id, x]) => ({ id, titlu: x.prezentare.titlu, diapozitive: x.prezentare.diapozitive.length, actualizat_la: x.actualizat_la }))
        .sort((a, b) => (b.actualizat_la || '').localeCompare(a.actualizat_la || ''));
    },
    async citeste(id) {
      if (eElev()) return (await api('GET', `/api/elev/prezentari/${encodeURIComponent(id)}`)).prezentare;
      const x = citesteLocal()[id];
      if (!x) throw new Error('Prezentarea nu există în acest browser.');
      return D.curata(x.prezentare).prezentare;
    },
    async salveaza(id, prezentare) {
      if (eElev()) {
        if (id) return (await api('PUT', `/api/elev/prezentari/${encodeURIComponent(id)}`, { prezentare }), id);
        return (await api('POST', '/api/elev/prezentari', { prezentare })).id;
      }
      const toate = citesteLocal();
      const nid = id || `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      toate[nid] = { prezentare, actualizat_la: new Date().toISOString() };
      scrieLocal(toate);
      return nid;
    },
    async sterge(id) {
      if (eElev()) return api('DELETE', `/api/elev/prezentari/${encodeURIComponent(id)}`);
      const toate = citesteLocal();
      delete toate[id];
      scrieLocal(toate);
    },
  };

  const diapozitivNou = (aspect = 'text', titlu = '', text = '') => ({ aspect, titlu, text, imagine: '', note: '' });
  const prezentareNoua = () => ({
    titlu: 'Prezentarea mea',
    tema: 'rosu',
    diapozitive: [
      diapozitivNou('titlu', 'Prezentarea mea', eElev() ? `${sesiune().nume} · ${sesiune().numeClasa || 'clasa'}` : 'Pseudonimul tău · clasa'),
      diapozitivNou('text', 'Prima idee', '- scrie aici o idee\n- câte una pe rând'),
      diapozitivNou('text', 'Mulțumesc!', 'O concluzie sau o întrebare pentru colegi.'),
    ],
  });

  // ---------- Imagini: se micșorează în browser, ca să încapă ușor ----------
  function incarcaImagine(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type)) return reject(new Error('Alege o imagine JPG, PNG, WebP, GIF sau BMP.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let max = 1280;
        for (let pas = 0; pas < 6; pas++) {
          const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * k));
          c.height = Math.max(1, Math.round(img.naturalHeight * k));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; // fundal alb pentru imaginile transparente
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          for (const q of [0.82, 0.68, 0.55]) {
            const data = c.toDataURL('image/jpeg', q);
            if (data.length <= D.LIMITE.imagine) return resolve(data);
          }
          max = Math.round(max * 0.7);
        }
        reject(new Error('Imaginea este prea mare. Încearcă alta.'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imaginea nu a putut fi citită.')); };
      img.src = url;
    });
  }

  // ---------- Fișier .json (descărcare / deschidere) ----------
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'prezentare';
  function descarca(p) {
    const blob = new Blob([JSON.stringify({ format: 'edudigi-prezentare', versiune: 1, prezentare: p })], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${slug(p.titlu)}.edudigi.json` });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function alegeFisier() {
    return new Promise((resolve, reject) => {
      const input = h('input', { type: 'file', accept: '.json,application/json' });
      input.addEventListener('change', async () => {
        const f = input.files[0];
        if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          const { prezentare, errors } = D.curata(j.prezentare || j);
          if (errors.length) throw new Error(errors[0]);
          resolve(prezentare);
        } catch (e) {
          reject(new Error(e instanceof SyntaxError ? 'Fișierul nu este o prezentare edudigi.' : e.message));
        }
      });
      input.click();
    });
  }

  // ---------- Prezentarea pe ecran complet ----------
  function prezinta(p, start = 0) {
    const deck = D.render(D.dinAtelier(p, markdown), markdown, { start });
    let intrat = false;
    const inchide = () => {
      document.removeEventListener('fullscreenchange', laSchimbare);
      document.removeEventListener('keydown', laEsc);
      if (document.fullscreenElement) document.exitFullscreen?.();
      over.remove();
    };
    const laSchimbare = () => { if (document.fullscreenElement) intrat = true; else if (intrat) inchide(); };
    const laEsc = (e) => { if (e.key === 'Escape') inchide(); };
    const over = h('div', { class: 'atelier-over prose', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Prezentare: ${p.titlu}` },
      h('button', { class: 'btn small ghost atelier-close', type: 'button', onclick: inchide }, 'Închide'), deck);
    document.body.append(over);
    document.addEventListener('fullscreenchange', laSchimbare);
    document.addEventListener('keydown', laEsc);
    deck.focus();
    // Ecran complet pe toată fereastra, ca butonul „Închide” să rămână vizibil.
    over.requestFullscreen?.().then(() => deck.focus()).catch(() => {});
  }

  // ---------- Pagina „Atelier”: lista prezentărilor ----------
  routes.push({ pattern: /^\/atelier$/, handler: async () => {
    document.title = 'Atelier de prezentări – edudigi';
    const eroare = h('p', { class: 'error', role: 'alert' });
    const lista = await store.lista();
    const s = sesiune();
    const info = s?.rol === 'elev'
      ? h('p', { class: 'banner ok' }, `Ești în cont ca ${s.nume}. Prezentările se salvează în contul tău, iar profesorul le poate vedea.`)
      : h('p', { class: 'banner' }, s?.rol === 'profesor'
        ? 'Ca profesor, prezentările tale se salvează doar în acest browser. Prezentările elevilor le vezi în panoul clasei, la fiecare elev.'
        : 'Prezentările se salvează doar în acest browser. ', s ? null : h('a', { href: '#/intra' }, 'Intră în cont ca elev'), s ? null : ' ca să le păstrezi și să le vadă profesorul.');
    const nou = async (p) => {
      eroare.textContent = '';
      try { location.hash = `#/atelier/${await store.salveaza(null, p)}`; } catch (e) { eroare.textContent = e.message; }
    };
    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Atelier'), h('h1', {}, 'Atelier de prezentări'),
        h('p', { class: 'muted' }, 'Fă-ți propria prezentare, diapozitiv cu diapozitiv, apoi prezint-o pe ecran complet, ca la videoproiector.')),
      info,
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => nou(prezentareNoua()) }, '+ Prezentare nouă'),
        h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
          try { await nou(await alegeFisier()); } catch (e) { eroare.textContent = e.message; }
        } }, 'Deschide un fișier')),
      eroare,
      lista.length
        ? h('div', { class: 'mat-grid atelier-list' }, lista.map((x) => h('div', { class: 'mat-card atelier-card' },
            h('div', {},
              h('h3', {}, h('a', { href: `#/atelier/${x.id}` }, x.titlu)),
              h('p', { class: 'muted' }, `${x.diapozitive} ${x.diapozitive === 1 ? 'diapozitiv' : 'diapozitive'} · modificată ${cand(x.actualizat_la)}`),
              h('div', { class: 'row-actions' },
                h('a', { class: 'btn small', href: `#/atelier/${x.id}` }, 'Editează'),
                h('button', { class: 'btn small ghost', type: 'button', onclick: async () => {
                  try { prezinta(await store.citeste(x.id)); } catch (e) { eroare.textContent = e.message; }
                } }, 'Prezintă'),
                h('button', { class: 'link-btn danger', type: 'button', onclick: async (ev) => {
                  if (!confirm(`Ștergi prezentarea „${x.titlu}”? Operația nu poate fi anulată.`)) return;
                  try { await store.sterge(x.id); ev.target.closest('.atelier-card').remove(); } catch (e) { eroare.textContent = e.message; }
                } }, 'Șterge'))))))
        : h('div', { class: 'empty' }, h('h3', {}, 'Nicio prezentare încă'), h('p', { class: 'muted' }, 'Apasă „Prezentare nouă” și începe cu pagina de titlu.'))));
  } });

  // ---------- Editorul ----------
  routes.push({ pattern: /^\/atelier\/([\w-]+)$/, handler: async ([, id0]) => {
    let id = id0;
    let p;
    try { p = await store.citeste(id); } catch (e) {
      show(h('div', { class: 'wrap' }, h('div', { class: 'empty' }, h('h3', {}, 'Prezentarea nu a fost găsită'), h('p', { class: 'muted' }, e.message),
        h('p', {}, h('a', { class: 'btn', href: '#/atelier' }, 'Înapoi la Atelier')))));
      return;
    }
    document.title = `${p.titlu} – Atelier edudigi`;
    let sel = 0;

    // Salvare automată, la o secundă după ultima modificare; salvările se fac una după alta.
    const stare = h('span', { class: 'atelier-stare muted', role: 'status' }, 'Salvat');
    let timer = null, coada = Promise.resolve(), murdar = false;
    const salveazaAcum = () => {
      clearTimeout(timer);
      if (!murdar) return coada;
      murdar = false;
      stare.textContent = 'Se salvează…';
      const copie = JSON.parse(JSON.stringify(p));
      coada = coada.then(async () => {
        try {
          id = await store.salveaza(id, copie);
          stare.textContent = 'Salvat ✓';
          stare.classList.remove('error');
        } catch (e) {
          murdar = true;
          stare.textContent = `Nu s-a salvat: ${e.message}`;
          stare.classList.add('error');
        }
      });
      return coada;
    };
    const schimbat = (previz = true) => {
      murdar = true;
      stare.textContent = 'Modificări nesalvate';
      clearTimeout(timer);
      timer = setTimeout(salveazaAcum, 1000);
      if (previz) previzualizeaza();
    };
    const plecare = (e) => { if (murdar) { salveazaAcum(); e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', plecare);
    window.addEventListener('hashchange', () => { salveazaAcum(); window.removeEventListener('beforeunload', plecare); }, { once: true });

    // Antet: titlu, temă, acțiuni.
    const titluInput = h('input', { class: 'atelier-titlu', value: p.titlu, maxlength: D.LIMITE.titlu, 'aria-label': 'Titlul prezentării' });
    titluInput.addEventListener('input', () => {
      // Pagina de titlu urmează titlul prezentării cât timp elevul nu a scris altceva pe ea.
      const d0 = p.diapozitive[0];
      const legat = d0.aspect === 'titlu' && d0.titlu === p.titlu;
      p.titlu = titluInput.value;
      if (legat) {
        d0.titlu = p.titlu;
        deseneazaMiniaturi();
        if (sel === 0) campTitlu.value = d0.titlu;
      }
      schimbat(legat);
    });
    const temaSel = h('div', { class: 'atelier-teme', role: 'radiogroup', 'aria-label': 'Tema' }, Object.entries(TEME).map(([k, v]) =>
      h('button', { class: `tema-buton tema-${k}`, type: 'button', role: 'radio', 'aria-checked': String(p.tema === k), title: v, 'aria-label': `Tema ${v}`, onclick: (e) => {
        p.tema = k;
        for (const b of temaSel.children) b.setAttribute('aria-checked', String(b === e.currentTarget));
        schimbat();
      } })));

    // Coloana din stânga: miniaturile diapozitivelor.
    const miniaturi = h('ol', { class: 'atelier-miniaturi' });
    const actiuniDiap = h('div', { class: 'atelier-actiuni-diap' });
    function deseneazaMiniaturi() {
      umple(miniaturi, p.diapozitive.map((d, i) => h('li', {},
        h('button', { class: 'miniatura', type: 'button', 'aria-current': i === sel ? 'true' : null, onclick: () => alege(i) },
          h('span', { class: 'mini-nr' }, String(i + 1)),
          h('span', { class: 'mini-titlu' }, d.titlu.trim() || D.ASPECTE[d.aspect]),
          d.imagine ? h('span', { class: 'mini-img', 'aria-label': 'are imagine' }, '🖼') : null))));
      const n = p.diapozitive.length;
      umple(actiuniDiap,
        h('button', { class: 'icon-btn small', type: 'button', 'aria-label': 'Mută diapozitivul mai sus', disabled: sel === 0, onclick: () => muta(-1) }, '↑'),
        h('button', { class: 'icon-btn small', type: 'button', 'aria-label': 'Mută diapozitivul mai jos', disabled: sel === n - 1, onclick: () => muta(1) }, '↓'),
        h('button', { class: 'link-btn', type: 'button', disabled: n >= D.LIMITE.diapozitive, onclick: dubleaza }, 'Dublează'),
        h('button', { class: 'link-btn danger', type: 'button', disabled: n === 1, onclick: sterge }, 'Șterge'));
    }
    const adauga = h('button', { class: 'btn small ghost atelier-adauga', type: 'button', onclick: () => {
      if (p.diapozitive.length >= D.LIMITE.diapozitive) return;
      p.diapozitive.splice(sel + 1, 0, diapozitivNou('text'));
      alege(sel + 1);
      schimbat();
      campTitlu.focus();
    } }, '+ Diapozitiv nou');
    function muta(d) {
      const [x] = p.diapozitive.splice(sel, 1);
      p.diapozitive.splice(sel + d, 0, x);
      alege(sel + d);
      schimbat();
    }
    function dubleaza() {
      p.diapozitive.splice(sel + 1, 0, JSON.parse(JSON.stringify(p.diapozitive[sel])));
      alege(sel + 1);
      schimbat();
    }
    function sterge() {
      if (p.diapozitive.length === 1 || !confirm(`Ștergi diapozitivul ${sel + 1}?`)) return;
      p.diapozitive.splice(sel, 1);
      alege(Math.min(sel, p.diapozitive.length - 1));
      schimbat();
    }

    // Formularul diapozitivului selectat.
    const aspectSel = h('div', { class: 'atelier-aspecte', role: 'radiogroup', 'aria-label': 'Aspectul diapozitivului' });
    const campTitlu = h('input', { maxlength: D.LIMITE.titlu });
    const campText = h('textarea', { rows: 6, maxlength: D.LIMITE.text });
    const campNote = h('textarea', { rows: 2, maxlength: D.LIMITE.note, placeholder: 'Ce vrei să spui la acest diapozitiv (nu se vede pe ecran)' });
    const sfaturi = h('div', { class: 'atelier-sfaturi', 'aria-live': 'polite' });
    const imgPrev = h('div', { class: 'atelier-img' });
    const imgEroare = h('p', { class: 'error', role: 'alert' });
    const imgInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const blocImagine = h('div', { class: 'field' }, h('span', {}, 'Imagine'), imgPrev, imgEroare,
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => imgInput.click() }, 'Alege o imagine'),
        h('button', { class: 'link-btn danger', type: 'button', onclick: () => { p.diapozitive[sel].imagine = ''; deseneazaFormular(); deseneazaMiniaturi(); schimbat(); } }, 'Scoate imaginea')),
      h('small', { class: 'muted' }, 'Folosește imagini proprii sau gratuite (de exemplu, de pe pixabay.com) și scrie sursa pe ultimul diapozitiv.'),
      imgInput);
    imgInput.addEventListener('change', async () => {
      const f = imgInput.files[0];
      imgInput.value = '';
      if (!f) return;
      imgEroare.textContent = '';
      try {
        p.diapozitive[sel].imagine = await incarcaImagine(f);
        if (p.diapozitive[sel].aspect === 'text' || p.diapozitive[sel].aspect === 'titlu') p.diapozitive[sel].aspect = 'text-imagine';
        deseneazaFormular();
        deseneazaMiniaturi();
        schimbat();
      } catch (e) { imgEroare.textContent = e.message; }
    });
    campTitlu.addEventListener('input', () => { p.diapozitive[sel].titlu = campTitlu.value; deseneazaMiniaturi(); verificaDesign(); schimbat(); });
    campText.addEventListener('input', () => { p.diapozitive[sel].text = campText.value; verificaDesign(); schimbat(); });
    campNote.addEventListener('input', () => { p.diapozitive[sel].note = campNote.value; schimbat(false); });

    // Sfaturi după regulile de design din lecție.
    function verificaDesign() {
      const d = p.diapozitive[sel];
      const cuvinte = `${d.titlu} ${d.text}`.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      const randuri = d.text.split('\n').filter((l) => l.trim()).length;
      const s = [];
      if (cuvinte > 40) s.push(`Ai ${cuvinte} de cuvinte. Regula: cel mult 40 pe un diapozitiv.`);
      if (randuri > 7) s.push(`Ai ${randuri} rânduri. Regula: cel mult 6–7.`);
      if (/[A-ZĂÂÎȘȚ]{12,}/.test(d.text.replace(/\s/g, ''))) s.push('Evită textul scris doar cu majuscule.');
      if (sel === 0 && d.aspect !== 'titlu') s.push('Primul diapozitiv ar trebui să fie pagina de titlu.');
      umple(sfaturi, s.length ? s.map((t) => h('p', {}, '⚠ ', t)) : h('p', { class: 'ok' }, `✓ ${cuvinte} ${cuvinte === 1 ? 'cuvânt' : 'cuvinte'}: diapozitivul respectă regulile de design.`));
    }

    function deseneazaFormular() {
      const d = p.diapozitive[sel];
      umple(aspectSel, Object.entries(D.ASPECTE).map(([k, v]) => h('button', { class: 'chip small', type: 'button', role: 'radio', 'aria-checked': String(d.aspect === k), onclick: () => {
        d.aspect = k;
        deseneazaFormular();
        schimbat();
      } }, v)));
      campTitlu.value = d.titlu;
      campText.value = d.text;
      campNote.value = d.note;
      campText.placeholder = d.aspect === 'titlu' ? 'De exemplu: numele tău, clasa, data' : 'Scrie câte o idee pe rând. Un rând care începe cu „- ” devine listă; **text** îngroșat.';
      blocImagine.hidden = d.aspect === 'titlu' || d.aspect === 'text';
      umple(imgPrev, d.imagine ? h('img', { src: d.imagine, alt: 'Imaginea diapozitivului' }) : h('p', { class: 'muted' }, 'Nicio imagine.'));
      verificaDesign();
    }

    // Previzualizarea, cu același vizualizator ca pe site.
    const previz = h('div', { class: 'atelier-previz prose' });
    let previzTimer = null;
    function previzualizeaza(imediat = false) {
      clearTimeout(previzTimer);
      const fa = () => umple(previz, D.render(D.dinAtelier(p, markdown), markdown, { start: sel, onChange: (i) => {
        if (i !== sel) { sel = i; deseneazaMiniaturi(); deseneazaFormular(); }
      } }));
      if (imediat) fa(); else previzTimer = setTimeout(fa, 250);
    }
    function alege(i) {
      sel = i;
      deseneazaMiniaturi();
      deseneazaFormular();
      previzualizeaza(true);
    }

    show(h('div', { class: 'wrap atelier' },
      h('p', { class: 'crumbs' }, h('a', { href: '#/atelier' }, '← Atelier de prezentări')),
      h('div', { class: 'atelier-bara' },
        titluInput,
        h('div', { class: 'atelier-bara-dreapta' },
          stare,
          h('button', { class: 'btn small ghost', type: 'button', onclick: () => descarca(p) }, 'Descarcă'),
          h('button', { class: 'btn small', type: 'button', onclick: () => { salveazaAcum(); prezinta(p, 0); } }, '▶ Prezintă'))),
      h('div', { class: 'atelier-tema' }, h('span', { class: 'kicker' }, 'Tema'), temaSel),
      h('div', { class: 'atelier-grid' },
        h('aside', { class: 'atelier-stanga', 'aria-label': 'Diapozitive' }, miniaturi, actiuniDiap, adauga),
        h('section', { class: 'atelier-form card-box', 'aria-label': 'Diapozitivul selectat' },
          h('div', { class: 'field' }, h('span', {}, 'Aspect'), aspectSel),
          h('label', { class: 'field' }, h('span', {}, 'Titlu'), campTitlu),
          h('label', { class: 'field' }, h('span', {}, 'Text'), campText),
          sfaturi,
          blocImagine,
          h('label', { class: 'field' }, h('span', {}, 'Note pentru prezentator'), campNote)),
        h('section', { class: 'atelier-dreapta', 'aria-label': 'Previzualizare' }, previz))));
    alege(0);
  } });

  // ---------- Profesorul vede o prezentare a unui elev ----------
  routes.push({ pattern: /^\/profesor\/clasa\/([\w-]+)\/elev\/([\w-]+)\/prezentare\/([\w-]+)$/, handler: async ([, cid, sid, pid]) => {
    if (sesiune()?.rol !== 'profesor') return void (location.hash = '#/intra');
    const r = await api('GET', `/api/profesor/elevi/${sid}/prezentari/${pid}`);
    const p = D.curata(r.prezentare).prezentare;
    show(h('div', { class: 'wrap narrow-page' },
      h('p', { class: 'crumbs' }, h('a', { href: `#/profesor/clasa/${cid}/elev/${sid}` }, '← Înapoi la elev')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Prezentare din Atelier'), h('h1', {}, p.titlu),
        h('p', { class: 'muted' }, `Modificată ${cand(r.actualizat_la)} · ${p.diapozitive.length} diapozitive`)),
      h('div', { class: 'prose' }, D.render(D.dinAtelier(p, markdown), markdown))));
  } });
})();

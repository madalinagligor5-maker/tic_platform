'use strict';
// Conturi și progres: intrarea elevilor (cod clasă + pseudonim + PIN) și a profesorilor,
// salvarea automată a progresului în lecții și panoul profesorului.
// Site-ul rămâne folosibil fără cont; contul doar salvează progresul.
(() => {
  const { h, show, data, ROMAN, clasaLabel, hooks, routes, render } = window.EduApp;
  const KEY = 'edudigi_cont';
  // replaceChildren afișează „null” pentru elementele lipsă; le filtrăm.
  const umple = (el, ...copii) => el.replaceChildren(...copii.flat().filter((c) => c != null && c !== false));

  // ---------- Sesiune ----------
  let sesiune = null;
  try { sesiune = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* fără stocare */ }
  function seteazaSesiune(s) {
    sesiune = s;
    try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* fără stocare */ }
    progresCache = null;
    zonaCont();
  }

  async function api(method, url, body, { keepalive = false } = {}) {
    const res = await fetch(url, {
      method,
      keepalive,
      headers: { 'Content-Type': 'application/json', ...(sesiune ? { Authorization: `Bearer ${sesiune.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await res.json().catch(() => ({}));
    if (res.status === 401 && sesiune && !url.endsWith('/login')) {
      seteazaSesiune(null);
      location.hash = '#/intra';
    }
    if (!res.ok) throw new Error(d.error || 'Eroare de rețea');
    return d;
  }

  // ---------- Utilitare de afișare ----------
  const fmtData = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' });
  const fmtOra = new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' });
  function cand(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const azi = new Date(); azi.setHours(0, 0, 0, 0);
    const zile = Math.round((azi - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (zile === 0) return `azi, ${fmtOra.format(d)}`;
    if (zile === 1) return `ieri, ${fmtOra.format(d)}`;
    return fmtData.format(d);
  }
  function durata(sec) {
    if (!sec) return '—';
    const min = Math.round(sec / 60);
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  }
  const procent = (a, b) => (b ? Math.round((100 * a) / b) : null);
  function formular(campuri, eticheta, onSubmit) {
    const err = h('p', { class: 'error', role: 'alert' });
    const f = h('form', { class: 'form' }, ...campuri, h('button', { class: 'btn', type: 'submit' }, eticheta), err);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      try { await onSubmit(Object.fromEntries(new FormData(f))); } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
    });
    return f;
  }
  const camp = (eticheta, name, attrs = {}) => h('label', { class: 'field' }, h('span', {}, eticheta), h('input', { name, required: true, ...attrs }));
  const tag = (text, cls = '') => h('span', { class: `tag ${cls}` }, text);
  function descarcaCSV(nume, randuri) {
    const csv = '﻿' + randuri.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: nume });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- Zona contului din antet ----------
  function zonaCont() {
    const z = document.getElementById('cont');
    if (!z) return;
    const iesire = h('button', { class: 'link-btn', type: 'button', onclick: async () => {
      await api('POST', '/api/logout').catch(() => {});
      seteazaSesiune(null);
      location.hash = '#/';
      render();
    } }, 'Ieșire');
    if (!sesiune) z.replaceChildren(h('a', { class: 'chip small red', href: '#/intra' }, 'Intră în cont'));
    else if (sesiune.rol === 'profesor') z.replaceChildren(h('a', { class: 'chip small', href: '#/profesor' }, 'Panoul profesorului'), iesire);
    else z.replaceChildren(h('a', { class: 'chip small', href: '#/teste' }, 'Testele mele'), h('a', { class: 'chip small', href: '#/elev', title: 'Progresul meu' }, `👤 ${sesiune.nume}`), iesire);
  }

  // ---------- Progresul elevului (cache pentru carduri) ----------
  let progresCache = null;
  async function progresElev(fortat = false) {
    if (!sesiune || sesiune.rol !== 'elev') return new Map();
    if (!progresCache || fortat) progresCache = new Map((await api('GET', '/api/elev/progres')).map((r) => [r.material_id, r]));
    return progresCache;
  }
  hooks.cardTag = (m) => {
    const r = progresCache && progresCache.get(m.id);
    if (!r) return null;
    return r.stare === 'terminat' ? tag('✓ terminat', 'gata') : tag(`în lucru ${r.rezolvate}/${r.total}`, 'lucru');
  };

  // ---------- Salvarea progresului într-o lecție ----------
  let urmarire = null;
  function opresteUrmarirea() {
    if (urmarire) urmarire.stop();
    urmarire = null;
  }
  hooks.material = (m) => {
    opresteUrmarirea();
    const head = document.querySelector('.mat-head');
    if (!head) return;
    if (!sesiune) {
      head.append(h('p', { class: 'banner' }, 'Vrei să-ți salvezi progresul? ', h('a', { href: '#/intra' }, 'Intră în cont'), ' cu codul clasei primit de la profesor.'));
      return;
    }
    if (sesiune.rol === 'profesor') {
      head.append(h('p', { class: 'banner' }, 'Ești conectat ca profesor. Progresul elevilor îl vezi în ', h('a', { href: '#/profesor' }, 'panoul profesorului'), '.'));
      return;
    }
    const stare = h('span', { class: 'banner-status' }, 'Se salvează...');
    head.append(h('p', { class: 'banner ok' }, `Progresul tău se salvează automat, ${sesiune.nume}. `, stare));
    urmarire = urmaresteLectia(m, stare);
  };

  function urmaresteLectia(m, eticheta) {
    const st = { rezolvate: 0, dinPrima: 0, incercari: 0, ultim: Date.now(), vizibil: !document.hidden };
    const ctl = new AbortController();
    const secundeNoi = () => {
      const acum = Date.now();
      // Doar timpul cu pagina vizibilă; maximum 5 minute între două salvări (ca să nu numărăm pauzele lungi).
      const s = st.vizibil ? Math.min(300, Math.round((acum - st.ultim) / 1000)) : 0;
      st.ultim = acum;
      return s;
    };
    async function trimite({ keepalive = false } = {}) {
      const corp = { materialId: m.id, total: m.aplicatii, rezolvate: st.rezolvate, dinPrima: st.dinPrima, incercari: st.incercari, secunde: secundeNoi() };
      st.incercari = 0;
      try {
        const r = await api('POST', '/api/elev/progres', corp, { keepalive });
        if (progresCache) progresCache.set(m.id, r);
        eticheta.textContent = r.stare === 'terminat' ? `✓ Lecție terminată · punctaj ${procent(r.din_prima, r.total) ?? 100}%` : `Salvat: ${r.rezolvate} din ${r.total} aplicații`;
      } catch (e) {
        eticheta.textContent = `Nu s-a putut salva (${e.message}).`;
      }
    }
    document.addEventListener('activitate-rezolvata', (e) => {
      st.rezolvate++;
      if (e.detail && e.detail.dinPrima) st.dinPrima++;
      trimite();
    }, { signal: ctl.signal });
    document.addEventListener('activitate-incercare', () => { st.incercari++; }, { signal: ctl.signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { trimite({ keepalive: true }); st.vizibil = false; } else { st.vizibil = true; st.ultim = Date.now(); }
    }, { signal: ctl.signal });
    trimite(); // „a început lecția”
    return { stop() { trimite({ keepalive: true }); ctl.abort(); } };
  }
  window.addEventListener('hashchange', () => { if (!/^#\/m\//.test(location.hash)) opresteUrmarirea(); zonaCont(); });

  // ---------- Pagina „Intră în cont” ----------
  routes.push({ pattern: /^\/intra$/, handler: async () => {
    if (sesiune) return void (location.hash = sesiune.rol === 'profesor' ? '#/profesor' : '#/elev');
    let modElev = 'login';
    let modProf = 'login';
    const cutieElev = h('div');
    const cutieProf = h('div');
    const dupaIntrare = (r) => {
      seteazaSesiune({ rol: r.rol, token: r.token, nume: r.nume, clasa: r.clasa, numeClasa: r.numeClasa });
      location.hash = r.rol === 'profesor' ? '#/profesor' : '#/elev';
    };
    const comutator = (mod, set, optiuni) => h('div', { class: 'tabs', role: 'tablist' }, optiuni.map(([val, text]) =>
      h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(mod === val), onclick: () => set(val) }, text)));
    function desenElev() {
      const campuri = [
        camp('Codul clasei (de la profesor)', 'cod', { autocomplete: 'off', placeholder: 'ex. TIC5-X4K9', maxlength: 20 }),
        camp('Pseudonim (nu numele complet)', 'pseudonim', { autocomplete: 'username', maxlength: 24, placeholder: 'ex. Ana M.' }),
        camp(modElev === 'login' ? 'PIN' : 'Alege un PIN (4–6 cifre)', 'pin', { type: 'password', inputmode: 'numeric', pattern: '\\d{4,6}', maxlength: 6, autocomplete: modElev === 'login' ? 'current-password' : 'new-password' }),
      ];
      umple(cutieElev, 
        comutator(modElev, (v) => { modElev = v; desenElev(); }, [['login', 'Am deja cont'], ['inscriere', 'Prima dată (înscriere)']]),
        modElev === 'inscriere' ? h('p', { class: 'muted small' }, 'Codul clasei îl folosești o singură dată, la înscriere. Ține minte pseudonimul și PIN-ul: cu ele intri data viitoare.') : null,
        formular(campuri, modElev === 'login' ? 'Intră' : 'Înscrie-mă', async (d) => dupaIntrare(await api('POST', modElev === 'login' ? '/api/elev/login' : '/api/elev/inscriere', d))),
      );
    }
    function desenProf() {
      const campuri = modProf === 'login'
        ? [camp('Utilizator', 'utilizator', { autocomplete: 'username' }), camp('Parolă', 'parola', { type: 'password', autocomplete: 'current-password' })]
        : [
            camp('Nume afișat', 'nume', { maxlength: 80 }),
            camp('Utilizator', 'utilizator', { autocomplete: 'username', maxlength: 40 }),
            camp('Parolă (minimum 8 caractere)', 'parola', { type: 'password', minlength: 8, autocomplete: 'new-password' }),
            h('label', { class: 'field' }, h('span', {}, 'Cod de invitație (dacă școala a stabilit unul)'), h('input', { name: 'codInvitatie', autocomplete: 'off' })),
          ];
      umple(cutieProf, 
        comutator(modProf, (v) => { modProf = v; desenProf(); }, [['login', 'Intră'], ['inregistrare', 'Cont nou']]),
        formular(campuri, modProf === 'login' ? 'Intră' : 'Creează contul', async (d) => dupaIntrare(await api('POST', modProf === 'login' ? '/api/profesor/login' : '/api/profesor/inregistrare', d))),
      );
    }
    desenElev();
    desenProf();
    show(h('div', { class: 'wrap narrow-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, 'Cont'), h('h1', {}, 'Intră în cont'),
        h('p', { class: 'muted' }, 'Lecțiile se pot citi și fără cont. Contul îți salvează progresul, iar profesorul vede cât ai lucrat.')),
      h('div', { class: 'grid-2' },
        h('section', { class: 'card-box' }, h('h2', {}, 'Sunt elev'), cutieElev),
        h('section', { class: 'card-box' }, h('h2', {}, 'Sunt profesor'), cutieProf))));
  } });

  // ---------- „Progresul meu” (elev) ----------
  routes.push({ pattern: /^\/elev$/, handler: async () => {
    if (!sesiune || sesiune.rol !== 'elev') return void (location.hash = '#/intra');
    const [D, prog] = await Promise.all([data(), progresElev(true)]);
    const mats = D.materiale.filter((m) => m.clasa.includes(sesiune.clasa)).sort((a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9));
    const lectii = mats.filter((m) => m.tip === 'lectie');
    const term = lectii.filter((m) => prog.get(m.id)?.stare === 'terminat').length;
    const grupuri = new Map();
    for (const m of mats) {
      const k = m.unitate || 'Alte materiale';
      if (!grupuri.has(k)) grupuri.set(k, []);
      grupuri.get(k).push(m);
    }
    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `${sesiune.numeClasa || ''} · ${clasaLabel([sesiune.clasa])}`), h('h1', {}, 'Progresul meu')),
      h('div', { class: 'stat-grid' },
        stat(`${term}/${lectii.length}`, 'lecții terminate'),
        stat(`${procent(term, lectii.length) ?? 0}%`, 'din lecțiile clasei'),
        stat(durata([...prog.values()].reduce((s, r) => s + r.secunde, 0)), 'timp de lucru')),
      [...grupuri].map(([nume, items]) => h('section', { class: 'unit-group' },
        h('h2', {}, nume),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Material'), h('th', {}, 'Stare'), h('th', {}, 'Aplicații'), h('th', {}, 'Punctaj'))),
          h('tbody', {}, items.map((m) => {
            const r = prog.get(m.id);
            return h('tr', {},
              h('td', {}, h('a', { href: `#/m/${m.id}` }, m.titlu)),
              h('td', {}, !r ? tag('neînceput') : r.stare === 'terminat' ? tag('✓ terminat', 'gata') : tag('în lucru', 'lucru')),
              h('td', {}, r ? `${r.rezolvate}/${r.total}` : `0/${m.aplicatii}`),
              h('td', {}, r && r.stare === 'terminat' ? `${procent(r.din_prima, r.total) ?? 100}%` : '—'));
          }))))))));
  } });
  const stat = (val, et, cls = '') => h('div', { class: `stat ${cls}` }, h('b', {}, val), h('span', {}, et));

  // ---------- Panoul profesorului: lista claselor ----------
  routes.push({ pattern: /^\/profesor$/, handler: async () => {
    if (!sesiune || sesiune.rol !== 'profesor') return void (location.hash = '#/intra');
    const clase = await api('GET', '/api/profesor/clase');
    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `Prof. ${sesiune.nume}`), h('h1', {}, 'Clasele mele')),
      clase.length
        ? h('div', { class: 'mat-grid' }, clase.map((c) => h('a', { class: 'mat-card class-tile', href: `#/profesor/clasa/${c.id}` },
            h('span', { class: 'ico-box programare roman' }, ROMAN[c.clasa]),
            h('div', {}, h('h3', {}, c.nume), h('p', {}, `${clasaLabel([c.clasa])} · ${c.elevi} ${c.elevi === 1 ? 'elev' : 'elevi'}`),
              h('div', { class: 'meta' }, tag(`Cod: ${c.cod}`), c.inscriereDeschisa ? tag('înscriere deschisă', 'gata') : tag('înscriere închisă'))))))
        : h('div', { class: 'empty' }, h('h3', {}, 'Nicio clasă încă'), h('p', { class: 'muted' }, 'Creează prima clasă mai jos și dă-le elevilor codul ei.')),
      h('section', { class: 'card-box create-class' },
        h('h2', {}, 'Clasă nouă'),
        formular([
          camp('Nume (ex. „5B 2026”)', 'nume', { maxlength: 40 }),
          h('label', { class: 'field' }, h('span', {}, 'Nivel'), h('select', { name: 'clasa' }, [5, 6, 7, 8, 9, 10, 11, 12].map((g) => h('option', { value: g }, clasaLabel([g]))))),
        ], 'Creează clasa', async (d) => {
          const c = await api('POST', '/api/profesor/clase', d);
          location.hash = `#/profesor/clasa/${c.id}`;
        }))));
  } });

  // ---------- Panoul unei clase ----------
  function agregare(mats, elevi, progres) {
    const pe = new Map(elevi.map((e) => [e.id, new Map()]));
    for (const r of progres) pe.get(r.elev_id)?.set(r.material_id, r);
    const lectii = mats.filter((m) => m.tip === 'lectie');
    const aplTot = mats.reduce((s, m) => s + m.aplicatii, 0);
    const randuri = elevi.map((e) => {
      const p = pe.get(e.id);
      let aplRez = 0, dinPrima = 0, totalTerm = 0, secunde = 0, ultima = null;
      for (const m of mats) {
        const r = p.get(m.id);
        if (!r) continue;
        aplRez += Math.min(r.rezolvate, m.aplicatii);
        secunde += r.secunde;
        if (r.stare === 'terminat') { dinPrima += r.din_prima; totalTerm += r.total; }
        if (!ultima || r.actualizat_la > ultima) ultima = r.actualizat_la;
      }
      const lectiiTerm = lectii.filter((m) => p.get(m.id)?.stare === 'terminat').length;
      return { e, p, lectiiTerm, aplRez, punctaj: procent(dinPrima, totalTerm), secunde, ultima: ultima || null };
    });
    // „Rămas în urmă”: inactiv de peste 7 zile sau sub jumătate din progresul median al clasei.
    const sortate = randuri.map((r) => r.aplRez).sort((a, b) => a - b);
    const mediana = sortate.length ? sortate[Math.floor(sortate.length / 2)] : 0;
    const prag = Date.now() - 7 * 864e5;
    for (const r of randuri) r.inUrma = !r.ultima || new Date(r.ultima) < prag || (mediana > 0 && r.aplRez < mediana / 2);
    return { randuri, lectiiTot: lectii.length, aplTot };
  }

  const stareVedere = { unitate: '', material: '', sort: 'pseudonim', desc: false };

  routes.push({ pattern: /^\/profesor\/clasa\/([\w-]+)$/, handler: async ([, id]) => {
    if (!sesiune || sesiune.rol !== 'profesor') return void (location.hash = '#/intra');
    const [D, k] = await Promise.all([data(), api('GET', `/api/profesor/clase/${id}`)]);
    const toate = D.materiale.filter((m) => m.clasa.includes(k.clasa.clasa)).sort((a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9));
    const unitati = [...new Set(toate.map((m) => m.unitate || 'Alte materiale'))];
    if (stareVedere.clasa !== id) Object.assign(stareVedere, { clasa: id, unitate: '', material: '', sort: 'pseudonim', desc: false });
    const zona = h('div');

    function deseneaza() {
      const mats = stareVedere.unitate ? toate.filter((m) => (m.unitate || 'Alte materiale') === stareVedere.unitate) : toate;
      const { randuri, lectiiTot, aplTot } = agregare(mats, k.elevi, k.progres);
      const activi = randuri.filter((r) => r.ultima && new Date(r.ultima) > Date.now() - 7 * 864e5).length;
      const mediu = randuri.length ? Math.round(randuri.reduce((s, r) => s + (procent(r.aplRez, aplTot) || 0), 0) / randuri.length) : 0;

      const filtre = h('div', { class: 'filters compact' },
        h('label', { class: 'field inline' }, h('span', {}, 'Unitate'),
          h('select', { onchange: (e) => { stareVedere.unitate = e.target.value; stareVedere.material = ''; deseneaza(); } },
            h('option', { value: '' }, 'Toate unitățile'), unitati.map((u) => h('option', { value: u, selected: stareVedere.unitate === u }, u)))),
        h('label', { class: 'field inline' }, h('span', {}, 'Vezi o lecție'),
          h('select', { onchange: (e) => { stareVedere.material = e.target.value; deseneaza(); } },
            h('option', { value: '' }, '— rezumat pe elevi —'), mats.map((m) => h('option', { value: m.id, selected: stareVedere.material === m.id }, m.titlu)))));

      let tabel, exportRanduri;
      if (stareVedere.material) {
        const m = mats.find((x) => x.id === stareVedere.material) || toate.find((x) => x.id === stareVedere.material);
        exportRanduri = [['Elev', 'Stare', 'Aplicații rezolvate', 'Punctaj %', 'Încercări', 'Timp (min)', 'Ultima activitate']];
        tabel = h('table', { class: 'data-table' },
          h('caption', {}, m.titlu),
          h('thead', {}, h('tr', {}, ['Elev', 'Stare', 'Aplicații', 'Punctaj', 'Încercări', 'Timp', 'Ultima activitate'].map((t) => h('th', {}, t)))),
          h('tbody', {}, k.elevi.map((e) => {
            const r = k.progres.find((x) => x.elev_id === e.id && x.material_id === m.id);
            const p = r && r.stare === 'terminat' ? procent(r.din_prima, r.total) ?? 100 : null;
            exportRanduri.push([e.pseudonim, r ? r.stare : 'neînceput', r ? `${r.rezolvate}/${r.total}` : `0/${m.aplicatii}`, p ?? '', r ? r.incercari : 0, r ? Math.round(r.secunde / 60) : 0, r ? new Date(r.actualizat_la).toLocaleString('ro-RO') : '']);
            return h('tr', {},
              h('td', {}, h('a', { href: `#/profesor/clasa/${id}/elev/${e.id}` }, e.pseudonim)),
              h('td', {}, !r ? tag('neînceput', 'urma') : r.stare === 'terminat' ? tag('✓ terminat', 'gata') : tag('în lucru', 'lucru')),
              h('td', {}, r ? `${r.rezolvate}/${r.total}` : `0/${m.aplicatii}`),
              h('td', {}, p != null ? `${p}%` : '—'),
              h('td', {}, r ? String(r.incercari) : '—'),
              h('td', {}, r ? durata(r.secunde) : '—'),
              h('td', {}, r ? cand(r.actualizat_la) : '—'));
          })));
      } else {
        const chei = {
          pseudonim: (r) => r.e.pseudonim.toLowerCase(), lectii: (r) => r.lectiiTerm, aplicatii: (r) => r.aplRez,
          punctaj: (r) => r.punctaj ?? -1, timp: (r) => r.secunde, ultima: (r) => r.ultima || '',
        };
        const f = chei[stareVedere.sort];
        randuri.sort((a, b) => (f(a) > f(b) ? 1 : f(a) < f(b) ? -1 : 0) * (stareVedere.desc ? -1 : 1));
        const th = (cheie, text) => h('th', { 'aria-sort': stareVedere.sort === cheie ? (stareVedere.desc ? 'descending' : 'ascending') : 'none' },
          h('button', { class: 'sort', type: 'button', onclick: () => {
            stareVedere.desc = stareVedere.sort === cheie ? !stareVedere.desc : cheie !== 'pseudonim';
            stareVedere.sort = cheie;
            deseneaza();
          } }, text, stareVedere.sort === cheie ? (stareVedere.desc ? ' ▼' : ' ▲') : ''));
        exportRanduri = [['Elev', `Lecții terminate (din ${lectiiTot})`, `Aplicații rezolvate (din ${aplTot})`, 'Punctaj %', 'Timp (min)', 'Ultima activitate', 'Rămas în urmă']];
        tabel = h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {}, th('pseudonim', 'Elev'), th('lectii', 'Lecții terminate'), th('aplicatii', 'Aplicații'), th('punctaj', 'Punctaj'), th('timp', 'Timp'), th('ultima', 'Ultima activitate'))),
          h('tbody', {}, randuri.map((r) => {
            exportRanduri.push([r.e.pseudonim, r.lectiiTerm, r.aplRez, r.punctaj ?? '', Math.round(r.secunde / 60), r.ultima ? new Date(r.ultima).toLocaleString('ro-RO') : '', r.inUrma ? 'da' : 'nu']);
            return h('tr', { class: r.inUrma ? 'behind' : '' },
              h('td', {}, h('a', { href: `#/profesor/clasa/${id}/elev/${r.e.id}` }, r.e.pseudonim), r.inUrma ? tag('în urmă', 'urma') : null, r.e.blocat ? tag('blocat', 'urma') : null),
              h('td', {}, h('div', { class: 'cell-bar' }, h('span', {}, `${r.lectiiTerm}/${lectiiTot}`), bara(procent(r.lectiiTerm, lectiiTot)))),
              h('td', {}, `${r.aplRez}/${aplTot}`),
              h('td', {}, r.punctaj != null ? `${r.punctaj}%` : '—'),
              h('td', {}, durata(r.secunde)),
              h('td', {}, cand(r.ultima || r.e.ultima_logare)));
          })));
      }

      umple(zona, 
        h('div', { class: 'stat-grid' },
          stat(String(k.elevi.length), 'elevi înscriși'),
          stat(String(activi), 'activi în ultimele 7 zile'),
          stat(`${mediu}%`, 'progres mediu (aplicații)'),
          stat(String(randuri.filter((r) => r.inUrma).length), 'rămași în urmă', 'warn')),
        filtre,
        k.elevi.length
          ? [h('div', { class: 'table-scroll' }, tabel),
             h('div', { class: 'row-actions' },
               h('button', { class: 'btn ghost small', type: 'button', onclick: () => descarcaCSV(`${k.clasa.nume.replace(/\W+/g, '_')}_${stareVedere.material || 'rezumat'}.csv`, exportRanduri) }, '⬇ Export CSV (Excel)'),
               h('span', { class: 'muted small' }, 'Punctaj = aplicații rezolvate din prima încercare, în lecțiile terminate.'))]
          : h('div', { class: 'empty' }, h('h3', {}, 'Niciun elev înscris încă'), h('p', { class: 'muted' }, `Dă-le elevilor codul ${k.clasa.cod}. Ei intră pe edudigi → „Intră în cont” → „Prima dată (înscriere)”.`)));
    }

    const codEl = h('b', { class: 'code-big' }, k.clasa.cod);
    const inscriereEl = h('span');
    const btnInscriere = h('button', { class: 'btn ghost small', type: 'button' });
    const actualizeazaInscriere = () => {
      inscriereEl.replaceChildren(k.clasa.inscriereDeschisa ? tag('înscriere deschisă', 'gata') : tag('înscriere închisă'));
      btnInscriere.textContent = k.clasa.inscriereDeschisa ? 'Închide înscrierea' : 'Redeschide înscrierea';
    };
    btnInscriere.addEventListener('click', async () => {
      k.clasa.inscriereDeschisa = (await api('POST', `/api/profesor/clase/${id}/inscriere`, { deschisa: !k.clasa.inscriereDeschisa })).inscriereDeschisa;
      actualizeazaInscriere();
    });
    actualizeazaInscriere();
    deseneaza();
    show(h('div', { class: 'wrap list-page' },
      h('p', { class: 'crumbs' }, h('a', { href: '#/profesor' }, '← Clasele mele')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, clasaLabel([k.clasa.clasa])), h('h1', {}, k.clasa.nume)),
      h('section', { class: 'card-box code-box' },
        h('div', {}, h('span', { class: 'kicker' }, 'Codul clasei'), codEl, inscriereEl),
        h('p', { class: 'muted small' }, 'Elevii folosesc codul la înscriere, apoi intră cu codul, pseudonimul și PIN-ul lor. După ce s-au înscris toți, închide înscrierea.'),
        h('div', { class: 'row-actions' },
          btnInscriere,
          h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
            if (!confirm('Generezi un cod nou? Codul vechi nu va mai funcționa, nici pentru înscriere, nici pentru intrarea elevilor.')) return;
            k.clasa.cod = (await api('POST', `/api/profesor/clase/${id}/cod`)).cod;
            codEl.textContent = k.clasa.cod;
          } }, 'Generează alt cod'))),
      hooks.panouClasa ? hooks.panouClasa(k, id) : null,
      zona));
  } });
  const bara = (p) => h('span', { class: 'mini-bar' }, h('i', { style: null, 'data-w': p ?? 0 }));
  // Lățimea barelor se setează din JS (CSP nu permite stiluri inline în HTML).
  new MutationObserver(() => document.querySelectorAll('.mini-bar i[data-w]').forEach((i) => { i.style.width = `${i.dataset.w}%`; i.removeAttribute('data-w'); }))
    .observe(document.getElementById('continut'), { childList: true, subtree: true });

  // ---------- Detaliile unui elev ----------
  routes.push({ pattern: /^\/profesor\/clasa\/([\w-]+)\/elev\/([\w-]+)$/, handler: async ([, id, sid]) => {
    if (!sesiune || sesiune.rol !== 'profesor') return void (location.hash = '#/intra');
    const [D, k] = await Promise.all([data(), api('GET', `/api/profesor/clase/${id}`)]);
    const e = k.elevi.find((x) => x.id === sid);
    if (!e) return void (location.hash = `#/profesor/clasa/${id}`);
    const prog = new Map(k.progres.filter((r) => r.elev_id === sid).map((r) => [r.material_id, r]));
    const mats = D.materiale.filter((m) => m.clasa.includes(k.clasa.clasa)).sort((a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9));
    const nota = h('p', { class: 'banner', hidden: true });
    const { randuri, lectiiTot } = agregare(mats, [e], k.progres);
    const r0 = randuri[0];
    const grupuri = new Map();
    for (const m of mats) {
      const key = m.unitate || 'Alte materiale';
      if (!grupuri.has(key)) grupuri.set(key, []);
      grupuri.get(key).push(m);
    }
    show(h('div', { class: 'wrap list-page' },
      h('p', { class: 'crumbs' }, h('a', { href: `#/profesor/clasa/${id}` }, `← ${k.clasa.nume}`)),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `Elev · ${k.clasa.nume}`), h('h1', {}, e.pseudonim)),
      h('div', { class: 'stat-grid' },
        stat(`${r0.lectiiTerm}/${lectiiTot}`, 'lecții terminate'),
        stat(r0.punctaj != null ? `${r0.punctaj}%` : '—', 'punctaj'),
        stat(durata(r0.secunde), 'timp de lucru'),
        stat(cand(r0.ultima || e.ultima_logare), 'ultima activitate')),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
          const { pin } = await api('POST', `/api/profesor/elevi/${sid}/pin`);
          nota.hidden = false;
          nota.textContent = `PIN nou pentru ${e.pseudonim}: ${pin}. Comunică-i-l elevului; nu va mai fi afișat.`;
        } }, 'Resetează PIN-ul'),
        h('button', { class: 'btn ghost small danger', type: 'button', onclick: async () => {
          if (!confirm(`Ștergi elevul „${e.pseudonim}” și tot progresul lui? Operația nu poate fi anulată.`)) return;
          await api('DELETE', `/api/profesor/elevi/${sid}`);
          location.hash = `#/profesor/clasa/${id}`;
        } }, 'Șterge elevul')),
      nota,
      [...grupuri].map(([nume, items]) => h('section', { class: 'unit-group' },
        h('h2', {}, nume),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {}, ['Material', 'Stare', 'Aplicații', 'Punctaj', 'Încercări', 'Timp', 'Ultima activitate', ''].map((t) => h('th', {}, t)))),
          h('tbody', {}, items.map((m) => {
            const r = prog.get(m.id);
            return h('tr', {},
              h('td', {}, h('a', { href: `#/m/${m.id}` }, m.titlu)),
              h('td', {}, !r ? tag('neînceput') : r.stare === 'terminat' ? tag('✓ terminat', 'gata') : tag('în lucru', 'lucru')),
              h('td', {}, r ? `${r.rezolvate}/${r.total}` : `0/${m.aplicatii}`),
              h('td', {}, r && r.stare === 'terminat' ? `${procent(r.din_prima, r.total) ?? 100}%` : '—'),
              h('td', {}, r ? String(r.incercari) : '—'),
              h('td', {}, r ? durata(r.secunde) : '—'),
              h('td', {}, r ? cand(r.actualizat_la) : '—'),
              h('td', {}, r ? h('button', { class: 'link-btn', type: 'button', onclick: async () => {
                if (!confirm(`Resetezi „${m.titlu}” pentru ${e.pseudonim}? Elevul o va putea relua de la zero.`)) return;
                await api('DELETE', `/api/profesor/elevi/${sid}/progres/${m.id}`);
                render();
              } }, 'Resetează') : null));
          }))))))));
  } });

  // Pentru teste.js: aceleași cereri autentificate și aceleași componente.
  window.EduConturi = { api, sesiune: () => sesiune, umple, tag, stat, cand, durata, descarcaCSV, formular, camp };

  // ---------- Pornire ----------
  zonaCont();
  if (sesiune && sesiune.rol === 'elev') progresElev().then(() => { if (/^#\/(materiale|clase)?(\?|$)|^$|^#\/$/.test(location.hash)) render(); }).catch(() => {});
})();

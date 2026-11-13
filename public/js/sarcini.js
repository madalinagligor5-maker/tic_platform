'use strict';
// Sarcini de lucru: profesorul dă clasei o lecție de parcurs și/sau o lucrare într-o aplicație;
// elevul o vede în „Sarcinile mele”, predă răspunsul sau lucrarea, iar profesorul o evaluează.
(() => {
  const { h, show, routes, hooks, data, clasaLabel } = window.EduApp;
  const C = window.EduConturi;
  if (!C) return;
  const { api, tag, umple, cand } = C;

  // Aplicațiile în care se poate lucra o sarcină (ruta lor și cum se numesc pentru elevi).
  const APLICATII = {
    blocuri: { nume: 'Programare cu blocuri (ca Scratch)', ruta: '#/aplicatii/blocuri' },
    desen: { nume: 'Desen (editor grafic)', ruta: '#/aplicatii/desen' },
    animatie: { nume: 'Studio de animație', ruta: '#/aplicatii/animatie' },
    posta: { nume: 'Poștă electronică (simulator)', ruta: '#/aplicatii/posta' },
    audio: { nume: 'Editor audio', ruta: '#/aplicatii/audio' },
    cpp: { nume: 'Editor C++', ruta: '#/aplicatii/cpp' },
    python: { nume: 'Editor Python', ruta: '#/aplicatii/python' },
    html: { nume: 'Editor de pagini web', ruta: '#/aplicatii/html' },
    text: { nume: 'Laborator – Document (Word)', ruta: '#/laborator/text' },
    tabel: { nume: 'Laborator – Registru (Excel)', ruta: '#/laborator/tabel' },
    atelier: { nume: 'Atelier – Prezentare (PowerPoint)', ruta: '#/atelier' },
  };
  const disponibila = (k) => k === 'text' || k === 'tabel' || k === 'atelier' || Boolean(routes.find((r) => r.pattern.test(`/aplicatii/${k}`)));
  const fmtData = (iso) => (iso ? new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '');
  const fmtNota = (n) => (n == null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','));
  const intarziat = (s, predatLa) => Boolean(s.termen && new Date(predatLa || Date.now()) > new Date(s.termen));
  const linkAplicatie = (s) => {
    const a = APLICATII[s.aplicatie];
    if (!a) return null;
    return a.ruta + (a.ruta.includes('?') ? '&' : '?') + `sarcina=${s.id}`;
  };

  // ---------- Bara „Predă la sarcină” din aplicații ----------
  // Aplicațiile o cer cu window.EduSarcini.bara(nume, async () => lucrare); apare doar pentru elevi, când adresa are ?sarcina=<id>.
  // Sarcina rămâne „activă” în aplicația ei și după ce elevul creează sau deschide un fișier (adresa pierde ?sarcina=).
  const CHEIE = 'edudigi-sarcina-activa';
  const aplicatiaDin = (hash) => {
    const p = hash.replace(/^#/, '').split('?')[0];
    const m = /^\/aplicatii\/(\w+)/.exec(p) || /^\/laborator\/(text|tabel)/.exec(p) || (/^\/atelier/.test(p) ? [0, 'atelier'] : null);
    return m ? m[1] : null;
  };
  function retine() {
    const q = location.hash.split('?')[1] || '';
    const id = new URLSearchParams(q).get('sarcina');
    const ap = aplicatiaDin(location.hash);
    if (id && /^[0-9a-f-]{36}$/.test(id) && ap) try { sessionStorage.setItem(CHEIE, JSON.stringify({ id, ap })); } catch { /* fără stocare */ }
  }
  window.addEventListener('hashchange', retine);
  retine();
  function sarcinaActiva(aplicatie) {
    retine();
    try {
      const x = JSON.parse(sessionStorage.getItem(CHEIE) || 'null');
      return x && x.ap === aplicatie ? x.id : null;
    } catch { return null; }
  }
  function bara(aplicatie, getLucrare) {
    const sid = sarcinaActiva(aplicatie);
    const s = C.sesiune();
    if (!sid || !s || s.rol !== 'elev') return null;
    const titlu = h('b', {}, 'Sarcină');
    const stare = h('span', { class: 'sb-stare' });
    const btn = h('button', { class: 'btn small', type: 'button' }, 'Predă lucrarea');
    const el = h('div', { class: 'sarcina-bara', role: 'region', 'aria-label': 'Sarcina de lucru' },
      h('span', { class: 'sb-eticheta' }, '📌'), titlu, stare, btn,
      h('a', { class: 'link-btn', href: `#/sarcini/${sid}` }, 'Vezi sarcina'),
      h('button', { class: 'link-btn', type: 'button', title: 'Lucrez fără sarcină', onclick: () => { try { sessionStorage.removeItem(CHEIE); } catch { /* */ } el.remove(); } }, '✕'));
    api('GET', `/api/elev/sarcini/${sid}`).then((r) => {
      titlu.textContent = `Sarcină: ${r.sarcina.titlu}`;
      if (r.predare?.evaluatLa) { stare.textContent = 'Evaluată – nu se mai poate preda'; btn.disabled = true; }
      else if (r.predare) stare.textContent = `Predată ${cand(r.predare.predatLa)}. Poți preda din nou până o evaluează profesorul.`;
      if (!r.sarcina.deschisa) { stare.textContent = 'Sarcina a fost închisă'; btn.disabled = true; }
    }).catch(() => { el.remove(); });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const vechi = btn.textContent;
      btn.textContent = 'Se predă…';
      try {
        const lucrare = await getLucrare();
        if (!lucrare) throw new Error('Nu există încă nimic de predat.');
        const r = await api('POST', `/api/elev/sarcini/${sid}/predare`, { lucrare: { aplicatie, ...lucrare } });
        stare.textContent = `✓ Predată ${cand(r.predatLa)}${r.intarziat ? ' (după termen)' : ''}.`;
        el.classList.add('ok');
      } catch (e) {
        stare.textContent = e.message || 'Nu am putut preda lucrarea.';
        el.classList.add('err');
      } finally {
        btn.disabled = false;
        btn.textContent = vechi;
      }
    });
    return el;
  }
  window.EduSarcini = { bara, APLICATII };

  // ---------- Afișarea unei lucrări (pentru profesor și pentru elev) ----------
  function descarca(nume, continut, tip) {
    const a = h('a', { href: URL.createObjectURL(new Blob([continut], { type: tip })), download: nume });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function lucrareEl(l, ctx = {}) {
    if (!l) return null;
    const cap = h('p', { class: 'lucrare-cap' }, h('b', {}, l.titlu || 'Lucrare'), APLICATII[l.aplicatie] ? h('span', { class: 'muted' }, ` · ${APLICATII[l.aplicatie].nume}`) : null);
    let corp = null;
    if (l.tip === 'imagine' && /^data:image\/(png|jpeg);/.test(l.date || '')) {
      corp = h('div', {}, h('img', { class: 'lucrare-img', src: l.date, alt: l.titlu || 'Desenul elevului' }),
        h('p', {}, h('a', { class: 'chip small', href: l.date, download: `${l.titlu || 'desen'}.png` }, 'Descarcă imaginea')));
    } else if (l.tip === 'animatie' && Array.isArray(l.cadre) && l.cadre.length) {
      // Redăm cadrele unul după altul, cu viteza aleasă de elev (FPS).
      const img = h('img', { class: 'lucrare-img', src: l.cadre[0], alt: l.titlu || 'Animația elevului' });
      let i = 0, t = null;
      const btn = h('button', { class: 'chip small', type: 'button' }, '▶ Redă');
      const opreste = () => { clearInterval(t); t = null; btn.textContent = '▶ Redă'; };
      btn.addEventListener('click', () => {
        if (t) return opreste();
        btn.textContent = '⏸ Pauză';
        t = setInterval(() => { if (!img.isConnected) return opreste(); i = (i + 1) % l.cadre.length; img.src = l.cadre[i]; }, 1000 / (l.fps || 8));
      });
      corp = h('div', {}, img, h('p', {}, btn, h('span', { class: 'muted small' }, ` ${l.cadre.length} cadre · ${l.fps || 8} cadre pe secundă`)));
    } else if (l.tip === 'audio' && /^data:audio\//.test(l.date || '')) {
      corp = h('div', {}, h('audio', { controls: true, src: l.date, preload: 'metadata' }), l.durata ? h('p', { class: 'muted small' }, `Durata: ${Math.round(l.durata)} s`) : null);
    } else if (l.tip === 'blocuri') {
      const json = JSON.stringify(l.proiect || {}, null, 1);
      corp = h('div', {},
        /^data:image\/(png|jpeg);/.test(l.imagine || '') ? h('img', { class: 'lucrare-img', src: l.imagine, alt: 'Scena proiectului' }) : null,
        h('p', {}, h('button', { class: 'chip small', type: 'button', onclick: () => descarca(`${(l.titlu || 'proiect').replace(/[^\w.-]+/g, '_')}.json`, json, 'application/json') }, 'Descarcă proiectul (.json)'),
          h('span', { class: 'muted small' }, ' – se deschide în Aplicații → Programare cu blocuri → Fișier → Încarcă')));
    } else if (l.tip === 'cod') {
      corp = h('div', { class: 'lucrare-cod' },
        h('pre', {}, h('code', {}, l.date || '')),
        l.intrare ? h('div', {}, h('b', {}, 'Date de intrare'), h('pre', {}, l.intrare)) : null,
        h('div', {}, h('b', {}, 'Ieșire (ultima rulare)'), h('pre', {}, l.iesire || '—')),
        /^data:image\/(png|jpeg);/.test(l.imagine || '') ? h('img', { class: 'lucrare-img', src: l.imagine, alt: 'Desenul făcut de program' }) : null,
        h('p', {}, h('button', { class: 'chip small', type: 'button', onclick: () => { const ext = l.limbaj === 'python' ? 'py' : 'cpp'; descarca(`${(l.titlu || 'program').replace(/[^\w.-]+/g, '_')}.${ext}`, l.date || '', 'text/plain'); } }, l.limbaj === 'python' ? 'Descarcă .py' : 'Descarcă .cpp')));
    } else if (l.tip === 'html') {
      const zona = h('div', { class: 'lucrare-html' });
      corp = h('div', {}, zona);
      if (window.EduHtmlPreview) setTimeout(() => window.EduHtmlPreview(zona, { pagini: l.pagini || [], imagini: l.imagini || [] }), 0);
      corp.append(h('details', {}, h('summary', {}, 'Codul paginilor'), (l.pagini || []).map((p) => h('div', {}, h('b', {}, p.nume), h('pre', {}, h('code', {}, p.cod))))));
    } else if (l.tip === 'mesaje') {
      const m = l.date || [];
      corp = h('div', { class: 'lucrare-mesaje' },
        l.misiuni ? h('p', {}, tag(`Misiuni: ${l.misiuni.realizate}/${l.misiuni.total}`, l.misiuni.realizate >= l.misiuni.total ? 'gata' : 'lucru')) : null,
        m.length ? m.map((x) => h('div', { class: 'mesaj' },
          h('p', { class: 'small' }, h('b', {}, 'Către: '), x.catre || '—', x.cc ? [h('b', {}, '  CC: '), x.cc] : null, x.cci ? [h('b', {}, '  CCI: '), x.cci] : null),
          h('p', {}, h('b', {}, x.subiect || '(fără subiect)'), x.tipActiune && x.tipActiune !== 'nou' ? h('span', { class: 'muted small' }, ` · ${x.tipActiune}`) : null),
          h('p', { class: 'mesaj-text' }, x.text || ''),
          x.atasamente?.length ? h('p', { class: 'muted small' }, `📎 ${x.atasamente.join(', ')}`) : null)) : h('p', { class: 'muted' }, 'Niciun mesaj trimis.'));
    } else if (l.tip === 'document') {
      const doc = h('div', { class: 'lucrare-doc prose' });
      try { doc.append(window.EduOffice.docSigur(l.date || '')); } catch { doc.textContent = 'Documentul nu poate fi afișat.'; }
      corp = doc;
    } else if (l.tip === 'tabel') {
      corp = h('div', { class: 'table-scroll' }, h('table', { class: 'data-table lucrare-tabel' }, h('tbody', {}, (l.date || []).map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
    } else if (l.tip === 'prezentare') {
      corp = ctx.cid && ctx.eid ? h('p', {}, h('a', { class: 'btn ghost small', href: `#/profesor/clasa/${ctx.cid}/elev/${ctx.eid}/prezentare/${l.id}` }, 'Deschide prezentarea')) : h('p', {}, h('a', { class: 'btn ghost small', href: `#/atelier/${l.id}` }, 'Deschide prezentarea'));
    }
    return h('div', { class: 'lucrare' }, cap, corp || h('p', { class: 'muted' }, 'Lucrare de tip necunoscut.'));
  }

  // ---------- Profesor: panoul „Sarcini” din pagina clasei ----------
  (hooks.panouriClasa = hooks.panouriClasa || []).push((k, id) => {
    const sec = h('section', { class: 'card-box' }, h('h2', {}, 'Sarcini de lucru'), h('p', { class: 'muted' }, 'Se încarcă…'));
    (async () => {
      const [lista, D] = await Promise.all([api('GET', `/api/profesor/clase/${id}/sarcini`), data()]);
      const lectii = D.materiale.filter((m) => m.clasa.includes(k.clasa.clasa) && m.tip !== 'test').sort((a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9));
      const grupuri = new Map();
      for (const m of lectii) { const u = m.unitate || 'Alte materiale'; if (!grupuri.has(u)) grupuri.set(u, []); grupuri.get(u).push(m); }
      const selLectie = h('select', { name: 'materialId' }, h('option', { value: '' }, '— fără lecție —'),
        [...grupuri].map(([u, ms]) => h('optgroup', { label: u }, ms.map((m) => h('option', { value: m.id }, m.titlu)))));
      const selApp = h('select', { name: 'aplicatie' }, h('option', { value: '' }, '— fără aplicație (doar răspuns scris) —'),
        Object.entries(APLICATII).filter(([k2]) => disponibila(k2)).map(([k2, a]) => h('option', { value: k2 }, a.nume)));
      const titlu = h('input', { name: 'titlu', required: true, maxlength: 160, placeholder: 'ex. Desenează mascota clasei' });
      selLectie.addEventListener('change', () => { if (!titlu.value && selLectie.value) titlu.value = selLectie.selectedOptions[0].textContent; });
      const form = C.formular([
        h('label', { class: 'field' }, h('span', {}, 'Lecția de parcurs (opțional)'), selLectie),
        h('label', { class: 'field' }, h('span', {}, 'Titlul sarcinii'), titlu),
        h('label', { class: 'field' }, h('span', {}, 'Ce au de făcut elevii'), h('textarea', { name: 'instructiuni', rows: 4, maxlength: 4000, placeholder: 'ex. Parcurge lecția și rezolvă exercițiile. Apoi desenează în aplicația Desen o mascotă din cel puțin 3 forme și predă desenul.' })),
        h('label', { class: 'field' }, h('span', {}, 'Lucrează în aplicația (opțional)'), selApp),
        h('label', { class: 'field' }, h('span', {}, 'Termen (opțional)'), h('input', { name: 'termen', type: 'datetime-local' })),
      ], 'Dă sarcina clasei', async (d) => {
        const s = await api('POST', `/api/profesor/clase/${id}/sarcini`, { ...d, termen: d.termen ? new Date(d.termen).toISOString() : null });
        location.hash = `#/profesor/sarcina/${s.id}`;
      });
      umple(sec,
        h('h2', {}, 'Sarcini de lucru'),
        h('p', { class: 'muted small' }, 'Sarcina apare elevilor în „Sarcinile mele”: lecția de parcurs, instrucțiunile și, dacă alegi, aplicația în care lucrează și din care predau lucrarea.'),
        lista.length ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {}, ['Sarcina', 'Dată', 'Termen', 'Predate', 'Evaluate', 'Stare'].map((x) => h('th', {}, x)))),
          h('tbody', {}, lista.map((s) => h('tr', {},
            h('td', {}, h('a', { href: `#/profesor/sarcina/${s.id}` }, s.titlu), s.aplicatie ? h('span', { class: 'muted small' }, ` · ${APLICATII[s.aplicatie]?.nume || s.aplicatie}`) : null),
            h('td', {}, cand(s.creatLa)),
            h('td', {}, s.termen ? fmtData(s.termen) : '—'),
            h('td', {}, `${s.predate}/${s.elevi}`),
            h('td', {}, String(s.evaluate)),
            h('td', {}, s.deschisa ? tag('deschisă', 'gata') : tag('închisă'))))))) : null,
        h('details', { class: 'launch', open: !lista.length }, h('summary', {}, 'Dă o sarcină nouă'), form));
    })().catch((e) => umple(sec, h('h2', {}, 'Sarcini de lucru'), h('p', { class: 'error' }, e.message)));
    return sec;
  });

  // ---------- Profesor: pagina unei sarcini ----------
  routes.push({ pattern: /^\/profesor\/sarcina\/([\w-]+)$/, handler: async ([, sid]) => {
    const s0 = C.sesiune();
    if (!s0 || s0.rol !== 'profesor') return void (location.hash = '#/intra');
    const [r, D] = await Promise.all([api('GET', `/api/profesor/sarcini/${sid}`), data()]);
    const s = r.sarcina;
    const m = s.materialId ? D.materiale.find((x) => x.id === s.materialId) : null;
    const detaliu = h('div', { id: 'sarcina-detaliu' });
    const predate = r.elevi.filter((e) => e.predat_la);

    async function arataElev(e) {
      umple(detaliu, h('p', { class: 'muted' }, 'Se încarcă…'));
      const x = await api('GET', `/api/profesor/sarcini/${sid}/elevi/${e.id}`);
      const p = x.predare;
      if (!p) return umple(detaliu, h('section', { class: 'card-box' }, h('h2', {}, e.pseudonim), h('p', { class: 'muted' }, 'Nu a predat încă.')));
      const nota = h('input', { type: 'number', min: 1, max: 10, step: 0.5, value: p.nota ?? '', inputmode: 'decimal' });
      const fb = h('textarea', { rows: 3, maxlength: 2000, placeholder: 'Un comentariu pentru elev (opțional)' });
      fb.value = p.feedback || '';
      const mesaj = h('span', { class: 'muted small' });
      umple(detaliu, h('section', { class: 'card-box' },
        h('h2', {}, e.pseudonim),
        h('p', { class: 'muted small' }, `Predat ${fmtData(p.predatLa)}`, intarziat(s, p.predatLa) ? [' ', tag('după termen', 'urma')] : null),
        p.raspuns ? h('div', { class: 'raspuns-elev' }, h('b', {}, 'Răspunsul elevului'), h('p', {}, p.raspuns)) : null,
        lucrareEl(p.lucrare, { cid: s.clasaId, eid: e.id }),
        h('div', { class: 'evaluare-box' },
          h('label', { class: 'field' }, h('span', {}, 'Nota (1–10, opțional)'), nota),
          h('label', { class: 'field' }, h('span', {}, 'Comentariu'), fb),
          h('div', { class: 'row-actions' },
            h('button', { class: 'btn small', type: 'button', onclick: async () => {
              try {
                await api('POST', `/api/profesor/sarcini/${sid}/elevi/${e.id}/evaluare`, { nota: nota.value === '' ? null : Number(nota.value), feedback: fb.value });
                mesaj.textContent = '✓ Salvat. Elevul vede nota și comentariul în „Sarcinile mele”.';
              } catch (err) { mesaj.textContent = err.message; }
            } }, 'Salvează evaluarea'),
            h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
              await api('POST', `/api/profesor/sarcini/${sid}/elevi/${e.id}/redeschide`, {});
              mesaj.textContent = 'Lucrarea a fost redeschisă: elevul o poate preda din nou.';
              nota.value = ''; fb.value = '';
            } }, 'Cere refacerea'),
            mesaj))));
      detaliu.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const stareEl = (e) => !e.predat_la ? tag('nepredat') : e.evaluat_la ? tag('evaluat', 'gata') : intarziat(s, e.predat_la) ? tag('predat după termen', 'urma') : tag('predat', 'lucru');
    show(h('div', { class: 'wrap list-page' },
      h('p', { class: 'crumbs' }, h('a', { href: `#/profesor/clasa/${s.clasaId}` }, '← Clasa')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `Sarcină dată ${cand(s.creatLa)}${s.termen ? ` · termen ${fmtData(s.termen)}` : ''}`), h('h1', {}, s.titlu)),
      s.instructiuni ? h('p', { class: 'sarcina-instr' }, s.instructiuni) : null,
      h('div', { class: 'row-actions' },
        m ? h('a', { class: 'chip small', href: `#/m/${m.id}` }, `Lecția: ${m.titlu}`) : null,
        s.aplicatie ? h('span', { class: 'chip small' }, `Aplicația: ${APLICATII[s.aplicatie]?.nume || s.aplicatie}`) : null),
      h('div', { class: 'stat-grid' },
        C.stat(`${predate.length}/${r.elevi.length}`, 'au predat'),
        C.stat(String(r.elevi.filter((e) => e.evaluat_la).length), 'evaluate'),
        m ? C.stat(String(r.elevi.filter((e) => e.stare_lectie === 'terminat').length), 'au terminat lecția') : null),
      h('div', { class: 'row-actions' },
        s.deschisa ? tag('deschisă', 'gata') : tag('închisă'),
        h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
          await api('POST', `/api/profesor/sarcini/${sid}/stare`, { deschisa: !s.deschisa });
          window.EduApp.render();
        } }, s.deschisa ? 'Închide sarcina (nu se mai predă)' : 'Redeschide sarcina'),
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => C.descarcaCSV(`sarcina-${s.titlu}.csv`, [['Elev', 'Stare', 'Predat', 'Lecția', 'Nota', 'Comentariu'],
          ...r.elevi.map((e) => [e.pseudonim, e.evaluat_la ? 'evaluat' : e.predat_la ? 'predat' : 'nepredat', e.predat_la ? new Date(e.predat_la).toLocaleString('ro-RO') : '',
            e.stare_lectie ? `${e.rezolvate}/${e.total}${e.stare_lectie === 'terminat' ? ' terminat' : ''}` : '', e.nota == null ? '' : String(e.nota).replace('.', ','), e.feedback || ''])]) }, '⬇ Export CSV (Excel)'),
        h('button', { class: 'btn ghost small danger', type: 'button', onclick: async () => {
          if (!confirm('Ștergi sarcina și toate lucrările predate?')) return;
          await api('DELETE', `/api/profesor/sarcini/${sid}`);
          location.hash = `#/profesor/clasa/${s.clasaId}`;
        } }, 'Șterge sarcina')),
      h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
        h('thead', {}, h('tr', {}, ['Elev', 'Stare', m ? 'Lecția' : null, 'Lucrare', 'Nota', ''].filter(Boolean).map((x) => h('th', {}, x)))),
        h('tbody', {}, r.elevi.map((e) => h('tr', {},
          h('td', {}, e.pseudonim),
          h('td', {}, stareEl(e)),
          m ? h('td', {}, e.stare_lectie ? `${e.rezolvate}/${e.total}${e.stare_lectie === 'terminat' ? ' ✓' : ''}` : '—') : null,
          h('td', {}, e.titlu_lucrare || (e.raspuns ? 'răspuns scris' : '—')),
          h('td', {}, fmtNota(e.nota)),
          h('td', {}, e.predat_la ? h('button', { class: 'link-btn', type: 'button', onclick: () => arataElev(e) }, 'Vezi și evaluează') : null)))))),
      detaliu));
  } });

  // ---------- Elev: „Sarcinile mele” ----------
  function cardSarcina(s, D) {
    const m = s.materialId ? D.materiale.find((x) => x.id === s.materialId) : null;
    const p = s.predare;
    return h('article', { class: `sarcina-card ${p?.evaluatLa ? 'evaluata' : p ? 'predata' : ''}` },
      h('div', { class: 'sc-cap' },
        h('h3', {}, h('a', { href: `#/sarcini/${s.id}` }, s.titlu)),
        p?.evaluatLa ? tag(p.nota != null ? `Nota ${fmtNota(p.nota)}` : 'evaluată', 'gata') : p ? tag('predată', 'lucru') : s.termen && intarziat(s) ? tag('termen depășit', 'urma') : tag('de făcut')),
      s.termen ? h('p', { class: 'muted small' }, `Termen: ${fmtData(s.termen)}`) : null,
      h('div', { class: 'row-actions' },
        m ? h('a', { class: 'chip small', href: `#/m/${m.id}` }, `📖 ${m.titlu}`) : null,
        s.aplicatie && linkAplicatie(s) ? h('a', { class: 'chip small red', href: linkAplicatie(s) }, `🛠 ${APLICATII[s.aplicatie]?.nume || s.aplicatie}`) : null,
        h('a', { class: 'chip small', href: `#/sarcini/${s.id}` }, 'Deschide')));
  }
  routes.push({ pattern: /^\/sarcini$/, handler: async () => {
    const s0 = C.sesiune();
    if (!s0 || s0.rol !== 'elev') return void (location.hash = '#/intra');
    const [lista, D] = await Promise.all([api('GET', '/api/elev/sarcini'), data()]);
    const deFacut = lista.filter((s) => !s.predare), predate = lista.filter((s) => s.predare);
    show(h('div', { class: 'wrap list-page' },
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, `${s0.numeClasa || ''} · ${clasaLabel([s0.clasa])}`), h('h1', {}, 'Sarcinile mele')),
      lista.length ? [
        h('h2', {}, `De făcut (${deFacut.length})`),
        deFacut.length ? h('div', { class: 'sarcini-grid' }, deFacut.map((s) => cardSarcina(s, D))) : h('p', { class: 'muted' }, 'Bravo, nu ai nimic de făcut acum! 🎉'),
        predate.length ? [h('h2', {}, `Predate (${predate.length})`), h('div', { class: 'sarcini-grid' }, predate.map((s) => cardSarcina(s, D)))] : null,
      ] : h('div', { class: 'empty' }, h('h3', {}, 'Nicio sarcină deocamdată'), h('p', { class: 'muted' }, 'Când profesorul îți dă o sarcină, apare aici.'))));
  } });

  routes.push({ pattern: /^\/sarcini\/([\w-]+)$/, handler: async ([, sid]) => {
    const s0 = C.sesiune();
    if (!s0 || s0.rol !== 'elev') return void (location.hash = '#/intra');
    const [r, D] = await Promise.all([api('GET', `/api/elev/sarcini/${sid}`), data()]);
    const s = r.sarcina, p = r.predare;
    const m = s.materialId ? D.materiale.find((x) => x.id === s.materialId) : null;
    const raspuns = h('textarea', { rows: 6, maxlength: 10000, placeholder: 'Scrie aici răspunsul tău (opțional dacă predai o lucrare din aplicație).' });
    raspuns.value = p?.raspuns || '';
    const mesaj = h('p', { class: 'muted small' });
    const poatePreda = s.deschisa && !p?.evaluatLa;
    show(h('div', { class: 'wrap test-page' },
      h('p', { class: 'crumbs' }, h('a', { href: '#/sarcini' }, '← Sarcinile mele')),
      h('div', { class: 'page-head' }, h('p', { class: 'kicker' }, s.termen ? `Termen: ${fmtData(s.termen)}` : 'Fără termen'), h('h1', {}, s.titlu)),
      s.instructiuni ? h('div', { class: 'sarcina-instr' }, s.instructiuni) : null,
      h('ol', { class: 'pasi-sarcina' },
        m ? h('li', {}, 'Parcurge lecția și rezolvă exercițiile: ', h('a', { href: `#/m/${m.id}` }, m.titlu), '.') : null,
        s.aplicatie ? h('li', {}, 'Lucrează în aplicație și apasă „Predă lucrarea” din bara de sus: ', h('a', { class: 'btn small', href: linkAplicatie(s) }, `Deschide ${APLICATII[s.aplicatie]?.nume || 'aplicația'}`)) : null,
        h('li', {}, s.aplicatie ? 'Dacă vrei, scrie și un mesaj pentru profesor mai jos.' : 'Scrie răspunsul și apasă „Predă”.')),
      p?.evaluatLa ? h('section', { class: 'card-box evaluare-elev' }, h('h2', {}, p.nota != null ? `Nota ${fmtNota(p.nota)}` : 'Evaluată'), p.feedback ? h('p', {}, `💬 ${p.feedback}`) : null) : null,
      p?.lucrare ? h('section', { class: 'card-box' }, h('h2', {}, 'Lucrarea predată'), lucrareEl(p.lucrare)) : null,
      h('section', { class: 'card-box' },
        h('label', { class: 'field' }, h('span', {}, 'Răspunsul meu'), raspuns),
        poatePreda ? h('button', { class: 'btn', type: 'button', onclick: async (ev) => {
          ev.currentTarget.disabled = true;
          try {
            const x = await api('POST', `/api/elev/sarcini/${sid}/predare`, { raspuns: raspuns.value });
            mesaj.textContent = `✓ Predat ${cand(x.predatLa)}${x.intarziat ? ' (după termen)' : ''}.`;
          } catch (e) { mesaj.textContent = e.message; }
          ev.currentTarget.disabled = false;
        } }, p ? 'Predă din nou' : 'Predă') : h('p', { class: 'muted' }, s.deschisa ? 'Profesorul a evaluat lucrarea.' : 'Sarcina a fost închisă.'),
        p ? h('p', { class: 'muted small' }, `Ultima predare: ${fmtData(p.predatLa)}`) : null,
        mesaj)));
  } });
})();

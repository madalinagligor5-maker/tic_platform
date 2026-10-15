'use strict';
(() => {
  const app = document.getElementById('app');
  const who = document.getElementById('who');
  const logoutBtn = document.getElementById('logout');

  // ---------- Stare locală ----------
  const store = {
    get() {
      try { return JSON.parse(localStorage.getItem('tic_session') || 'null'); } catch { return null; }
    },
    set(v) {
      try { v ? localStorage.setItem('tic_session', JSON.stringify(v)) : localStorage.removeItem('tic_session'); } catch { /* fără stocare */ }
      memSession = v;
    },
  };
  let memSession = store.get();
  const session = () => memSession;

  // ---------- Utilitare ----------
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
  async function api(method, url, body) {
    const s = session();
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && s && !url.endsWith('/login')) {
      store.set(null);
      location.hash = '#/';
    }
    if (!res.ok) throw new Error(data.error || 'Eroare');
    return data;
  }
  function form(fields, submitLabel, onSubmit) {
    const err = h('p', { class: 'error', role: 'alert' });
    const f = h('form', {}, ...fields, h('button', { type: 'submit' }, submitLabel), err);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      try { await onSubmit(Object.fromEntries(new FormData(f))); } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
    });
    return f;
  }
  const show = (...nodes) => app.replaceChildren(...nodes.flat().filter((n) => n != null && n !== false));
  const field = (label, name, attrs = {}) => [h('label', { for: name }, label), h('input', { id: name, name, required: true, ...attrs })];
  const STATUS = { nou: 'nou', in_lucru: 'în lucru', finalizat: 'finalizat' };
  const badge = (s) => h('span', { class: `badge ${s}` }, STATUS[s] || s);

  // Markdown minimal și sigur: totul se inserează ca text, nu ca HTML.
  function markdown(src) {
    const root = h('div', { class: 'lesson-body' });
    const inline = (text) => {
      const out = [];
      const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      let last = 0, m;
      while ((m = re.exec(text))) {
        out.push(text.slice(last, m.index));
        out.push(m[0].startsWith('**') ? h('strong', {}, m[0].slice(2, -2)) : h('code', {}, m[0].slice(1, -1)));
        last = m.index + m[0].length;
      }
      out.push(text.slice(last));
      return out;
    };
    const lines = src.replace(/\r/g, '').split('\n');
    let list = null, para = [];
    const flush = () => {
      if (para.length) root.append(h('p', {}, inline(para.join(' '))));
      para = [];
      list = null;
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('```')) {
        flush();
        const code = [];
        while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
        root.append(h('pre', {}, h('code', {}, code.join('\n'))));
      } else if (/^#{1,4} /.test(line)) {
        flush();
        const level = Math.min(line.indexOf(' '), 4);
        root.append(h(`h${level}`, {}, inline(line.replace(/^#+ /, ''))));
      } else if (/^\s*([-*]|\d+\.) /.test(line)) {
        if (para.length) flush();
        const ordered = /^\s*\d+\./.test(line);
        if (!list || list.tagName !== (ordered ? 'OL' : 'UL')) {
          list = h(ordered ? 'ol' : 'ul');
          root.append(list);
        }
        list.append(h('li', {}, inline(line.replace(/^\s*([-*]|\d+\.) /, ''))));
      } else if (!line.trim()) {
        flush();
      } else {
        list = null;
        para.push(line.trim());
      }
    }
    flush();
    return root;
  }

  // ---------- Vederi ----------
  function viewHome() {
    const s = session();
    if (s) return (location.hash = s.role === 'teacher' ? '#/profesor' : '#/elev');
    let teacherMode = 'login';
    const teacherBox = h('div');
    const renderTeacher = () => {
      teacherBox.replaceChildren(
        teacherMode === 'login'
          ? form([...field('Utilizator', 't_user', { autocomplete: 'username', name: 'username' }), ...field('Parolă', 't_pass', { type: 'password', autocomplete: 'current-password', name: 'password' })], 'Intră', async (d) => {
              const r = await api('POST', '/api/teacher/login', d);
              store.set({ role: 'teacher', token: r.token, name: r.profesor.name });
              location.hash = '#/profesor';
            })
          : form([...field('Nume afișat', 't_name', { name: 'name' }), ...field('Utilizator', 't_user2', { name: 'username', autocomplete: 'username' }), ...field('Parolă (min. 8 caractere)', 't_pass2', { type: 'password', name: 'password', minlength: 8, autocomplete: 'new-password' })], 'Creează cont', async (d) => {
              const r = await api('POST', '/api/teacher/register', d);
              store.set({ role: 'teacher', token: r.token, name: r.profesor.name });
              location.hash = '#/profesor';
            }),
        h('button', { class: 'link', type: 'button', onclick: () => { teacherMode = teacherMode === 'login' ? 'register' : 'login'; renderTeacher(); } },
          teacherMode === 'login' ? 'Nu ai cont? Creează unul' : 'Ai deja cont? Intră'),
      );
    };
    renderTeacher();
    show(
      h('h1', {}, 'Bine ai venit!'),
      h('div', { class: 'grid' },
        h('section', { class: 'card' },
          h('h2', {}, 'Sunt elev'),
          h('p', { class: 'muted' }, 'Fără e-mail: folosește codul clasei primit de la profesor, un pseudonim (nu numele real) și un PIN de 4 cifre. Prima dată îți alegi PIN-ul.'),
          form([
            ...field('Codul clasei', 's_code', { name: 'classCode', autocomplete: 'off', maxlength: 10 }),
            ...field('Pseudonim', 's_pseudo', { name: 'pseudonym', autocomplete: 'username', maxlength: 24 }),
            ...field('PIN (4 cifre)', 's_pin', { name: 'pin', type: 'password', inputmode: 'numeric', pattern: '\\d{4}', maxlength: 4, autocomplete: 'current-password' }),
          ], 'Intră', async (d) => {
            const r = await api('POST', '/api/student/login', d);
            store.set({ role: 'student', token: r.token, name: r.pseudonim, created: r.created });
            location.hash = '#/elev';
          })),
        h('section', { class: 'card' }, h('h2', {}, 'Sunt profesor'), teacherBox),
      ),
    );
  }

  async function viewStudent() {
    const m = await api('GET', '/api/student/map');
    const s = session();
    const all = m.unitati.flatMap((u) => u.module.flatMap((mo) => mo.lectii));
    const done = all.filter((l) => l.status === 'finalizat').length;
    const unlockForm = form([...field('Ai primit un cod de unitate?', 'u_code', { name: 'code', autocomplete: 'off', maxlength: 10 })], 'Deblochează', async (d) => {
      await api('POST', '/api/student/unlock', d);
      render();
    });
    show(
      h('h1', {}, `${m.clasa.titlu} · ${m.clasa.nume}`),
      s.created ? h('p', { class: 'notice' }, 'Contul tău a fost creat. Ține minte pseudonimul și PIN-ul – le folosești la fiecare intrare.') : null,
      h('section', { class: 'card' },
        h('h2', {}, 'Progresul meu'),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': done, 'aria-valuemax': all.length }, h('span', { style: null })),
        h('p', { class: 'muted' }, `${done} din ${all.length} lecții finalizate`),
      ),
      ...m.unitati.map((u) =>
        h('section', { class: `card unit${u.deblocata ? '' : ' locked'}` },
          h('h2', {}, `${u.id}. ${u.titlu}`, u.deblocata ? '' : ' 🔒'),
          h('details', {}, h('summary', {}, 'Competențe specifice'), h('ul', {}, u.competente.map((c) => h('li', {}, c)))),
          ...u.module.map((mo) => [
            h('h3', {}, `Modulul ${mo.id} – ${mo.titlu}`),
            h('ul', { class: 'lessons' }, mo.lectii.map((l) => h('li', {},
              u.deblocata ? h('a', { href: `#/elev/lectie/${l.id}` }, `${l.id} ${l.titlu}`) : h('span', { class: 'muted' }, `${l.id} ${l.titlu}`),
              badge(l.status)))),
          ]),
        )),
      h('section', { class: 'card' }, unlockForm),
    );
    if (s.created) store.set({ ...s, created: false });
    // Lățimea barei se setează din JS (CSP nu permite stiluri inline în HTML).
    app.querySelector('.bar > span').style.width = `${all.length ? (100 * done) / all.length : 0}%`;
  }

  async function viewLesson(lessonId) {
    const l = await api('GET', `/api/student/lesson/${encodeURIComponent(lessonId)}`);
    const setStatus = async (status) => {
      await api('POST', '/api/student/progress', { lessonId: l.id, status });
      render();
    };
    show(
      h('p', {}, h('a', { href: '#/elev' }, '← Înapoi la hartă')),
      h('p', { class: 'muted' }, `Unitatea ${l.unitId} – ${l.unitTitlu} · Modulul ${l.modulId} – ${l.modulTitlu}`),
      h('h1', {}, `${l.id} ${l.titlu}`),
      h('section', { class: 'card' },
        l.continut ? markdown(l.continut) : h('p', { class: 'muted' }, 'Conținutul acestei lecții va fi adăugat în curând de profesor.')),
      h('div', { class: 'row' },
        badge(l.status),
        l.status !== 'in_lucru' ? h('button', { class: 'secondary', onclick: () => setStatus('in_lucru') }, 'Marchează „în lucru”') : null,
        l.status !== 'finalizat' ? h('button', { onclick: () => setStatus('finalizat') }, 'Am terminat lecția ✓') : null,
      ),
    );
  }

  async function viewTeacher() {
    const classes = await api('GET', '/api/teacher/classes');
    show(
      h('h1', {}, 'Clasele mele'),
      classes.length
        ? h('div', { class: 'grid' }, classes.map((c) => h('a', { href: `#/profesor/clasa/${c.id}`, class: 'card' },
            h('h2', {}, c.name), h('p', { class: 'muted' }, `Clasa a ${['', '', '', '', '', 'V', 'VI', 'VII', 'VIII'][c.grade]}-a · ${c.elevi} elevi`),
            h('p', {}, 'Cod: ', h('span', { class: 'code' }, c.code)))))
        : h('p', { class: 'muted' }, 'Nu ai încă nicio clasă. Creează una mai jos.'),
      h('section', { class: 'card' },
        h('h2', {}, 'Clasă nouă'),
        form([
          ...field('Nume (ex. „5A 2026”)', 'c_name', { name: 'name', maxlength: 40 }),
          h('label', { for: 'c_grade' }, 'Nivel'),
          h('select', { id: 'c_grade', name: 'grade' }, ['5', '6', '7', '8'].map((g) => h('option', { value: g }, `Clasa a ${{ 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' }[g]}-a`))),
        ], 'Creează clasa', async (d) => {
          const k = await api('POST', '/api/teacher/classes', d);
          location.hash = `#/profesor/clasa/${k.id}`;
        })),
    );
  }

  async function viewClass(classId) {
    const k = await api('GET', `/api/teacher/classes/${encodeURIComponent(classId)}`);
    const pinNote = h('p', { class: 'notice', hidden: true });
    show(
      h('p', {}, h('a', { href: '#/profesor' }, '← Clasele mele')),
      h('h1', {}, k.name),
      h('section', { class: 'card' },
        h('p', {}, 'Codul clasei: ', h('span', { class: 'code' }, k.code)),
        h('p', { class: 'muted' }, 'Elevii intră cu acest cod, un pseudonim și un PIN ales de ei la prima intrare.'),
        h('div', { class: 'row' },
          h('span', {}, k.joinOpen ? 'Înscrierea elevilor noi: deschisă' : 'Înscrierea elevilor noi: închisă'),
          h('button', { class: 'small secondary', onclick: async () => { await api('POST', `/api/teacher/classes/${k.id}/join`, { joinOpen: !k.joinOpen }); render(); } },
            k.joinOpen ? 'Închide înscrierea' : 'Redeschide înscrierea'))),
      h('section', { class: 'card' },
        h('h2', {}, 'Unități'),
        h('p', { class: 'muted' }, 'Deblochează unitățile pe rând pentru toată clasa, sau dă codul unei unități doar anumitor elevi.'),
        h('table', {}, h('tbody', {}, k.unitati.map((u) => h('tr', {},
          h('td', {}, `${u.id}. ${u.titlu}`),
          h('td', {}, h('span', { class: 'code' }, u.cod)),
          h('td', {}, u.deblocata ? 'deblocată' : 'blocată'),
          h('td', {}, h('button', { class: `small${u.deblocata ? ' secondary' : ''}`, onclick: async () => { await api('POST', `/api/teacher/classes/${k.id}/unlock`, { unitId: u.id, deblocata: !u.deblocata }); render(); } },
            u.deblocata ? 'Blochează' : 'Deblochează'))))))),
      h('section', { class: 'card' },
        h('h2', {}, `Elevi (${k.elevi.length})`),
        pinNote,
        k.elevi.length
          ? h('table', {},
              h('thead', {}, h('tr', {}, h('th', {}, 'Pseudonim'), h('th', {}, 'Progres'), h('th', {}, 'În lucru'), h('th', {}, ''))),
              h('tbody', {}, k.elevi.map((e) => h('tr', {},
                h('td', {}, e.pseudonim, e.blocat ? ' 🔒' : ''),
                h('td', {}, `${e.finalizate}/${k.totalLectii}`),
                h('td', {}, String(e.inLucru)),
                h('td', {}, h('div', { class: 'row' },
                  h('button', { class: 'small secondary', onclick: async () => {
                    const r = await api('POST', `/api/teacher/students/${e.id}/reset-pin`);
                    pinNote.hidden = false;
                    pinNote.textContent = `PIN nou pentru ${e.pseudonim}: ${r.pin} (comunică-l elevului; nu va mai fi afișat).`;
                  } }, 'Resetează PIN'),
                  h('button', { class: 'small secondary', onclick: async () => {
                    if (!confirm(`Ștergi elevul „${e.pseudonim}” și tot progresul lui?`)) return;
                    await api('DELETE', `/api/teacher/students/${e.id}`);
                    render();
                  } }, 'Șterge')))))))
          : h('p', { class: 'muted' }, 'Niciun elev încă. Dă-le codul clasei.')),
    );
  }

  // ---------- Router ----------
  async function render() {
    const s = session();
    who.textContent = s ? (s.role === 'teacher' ? `Prof. ${s.name}` : s.name) : '';
    logoutBtn.hidden = !s;
    const hash = location.hash || '#/';
    try {
      let m;
      if ((m = /^#\/elev\/lectie\/([\d.]+)$/.exec(hash)) && s?.role === 'student') await viewLesson(m[1]);
      else if (hash === '#/elev' && s?.role === 'student') await viewStudent();
      else if ((m = /^#\/profesor\/clasa\/([\w-]+)$/.exec(hash)) && s?.role === 'teacher') await viewClass(m[1]);
      else if (hash === '#/profesor' && s?.role === 'teacher') await viewTeacher();
      else if (hash !== '#/' && hash !== '') location.hash = '#/';
      else viewHome();
    } catch (e) {
      show(h('p', { class: 'error' }, e.message), h('a', { href: '#/' }, 'Pagina principală'));
    }
  }
  logoutBtn.addEventListener('click', async () => {
    await api('POST', '/api/logout').catch(() => {});
    store.set(null);
    location.hash = '#/';
    render();
  });
  window.addEventListener('hashchange', render);
  render();
})();

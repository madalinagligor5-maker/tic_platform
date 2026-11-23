'use strict';
// „Informatică IX (liceu)” (#/liceu): parcurs pe profiluri (științe ale naturii, matematică-informatică, militar, intensiv)
// după programele școlare 2025. Fiecare unitate: obiective cu autoevaluare, teorie, exemplu executabil, exerciții pe trei
// trepte cu verificare automată, quiz pe niveluri Bloom, proiect și plan „analiză – proiectare – teste” (portofoliu).
(() => {
  if (!window.EduApp || !window.PyAcad || !globalThis.LICEU) return;
  const { h, show, routes } = window.EduApp;
  const A = window.PyAcad;
  const { P, salveaza, antet, pagina, inl, teorie, codBloc, panouExercitiu, editor } = A;
  const LI = globalThis.LICEU;
  const { PROFILE, UNITATI, BLOOM } = LI;
  P.liceu = P.liceu || {};
  const CHEIE_NOTE = 'edudigi_liceu_note';
  let NOTE = {};
  try { NOTE = JSON.parse(localStorage.getItem(CHEIE_NOTE) || '{}'); } catch { /* fără stocare */ }
  const salveazaNote = () => { try { localStorage.setItem(CHEIE_NOTE, JSON.stringify(NOTE)); } catch { /* ignorat */ } };
  UNITATI.sort((a, b) => a.nr - b.nr);

  // ---------- Profil ----------
  const profilDe = (id) => PROFILE.find((p) => p.id === id);
  const profilImplicit = () => (profilDe(P.profil) ? P.profil : 'mi');
  const vizibila = (u, pid) => !u.profile || u.profile.includes(pid) || (u.bonus || []).includes(pid);
  const bonus = (u, pid) => (u.bonus || []).includes(pid);
  const unitatiProfil = (pid) => UNITATI.filter((u) => vizibila(u, pid));
  const TREPTE = [['rem', '🌱', 'Remediere', 10], ['std', '🌿', 'Standard', 15], ['apr', '🌳', 'Aprofundare', 20]];
  const exercitiu = (u, k, pid) => {
    const e = u.exercitii || {};
    if (k === 'apr' && !['mi', 'mil', 'int'].includes(pid) && e.apr_sn) return e.apr_sn;
    return e[k];
  };
  const facut = (u, k) => !!P.liceu[`${u.id}:${k}`];
  const progresUnitate = (u, pid) => {
    const trepte = TREPTE.filter(([k]) => exercitiu(u, k, pid));
    const gata = trepte.filter(([k]) => facut(u, k)).length;
    return { gata, total: trepte.length, quiz: P.liceu[`${u.id}:quiz`] || 0 };
  };
  const acordaXP = (cheie, xp) => { if (!P.liceu[cheie]) { P.liceu[cheie] = 1; P.xp += xp; salveaza(); return true; } return false; };

  // ---------- Pagina principală: alegerea profilului și parcursul ----------
  function hub(pid) {
    const p = profilDe(pid) || profilDe(profilImplicit());
    P.profil = p.id; salveaza();
    document.title = `Informatică clasa a IX-a – ${p.nume} – edudigi`;
    const lista = unitatiProfil(p.id);
    const total = lista.reduce((s, u) => s + progresUnitate(u, p.id).total, 0), gata = lista.reduce((s, u) => s + progresUnitate(u, p.id).gata, 0);
    pagina(
      h('section', { class: 'lic-hero' },
        h('p', { class: 'pya-kicker lic' }, '🎓 Liceu · clasa a IX-a'),
        h('h1', {}, 'Informatică la liceu, cu ', h('span', { class: 'pya-galben' }, 'Python')),
        h('p', { class: 'pya-lead' }, 'Parcurs după programele școlare 2025: unități pe care le poți lucra în ordinea din programă, cu teorie, exemple executabile, exerciții pe trei trepte și verificare automată.')),
      h('div', { class: 'lic-profile', role: 'tablist', 'aria-label': 'Profilul tău' }, [...PROFILE, { id: 'tic', nume: 'TIC (Tehnologia informației)', emoji: '💻', ore: null }].map((x) => {
        const a = h('a', { class: `lic-profil${x.id === p.id ? ' act' : ''}`, href: `#/liceu/${x.id}`, role: 'tab', 'aria-selected': String(x.id === p.id) }, h('span', { class: 'lic-profil-e', 'aria-hidden': 'true' }, x.emoji), h('b', {}, x.nume), x.ore ? h('span', {}, `${x.ore} ${x.ore === 1 ? 'oră' : 'ore'}/săpt.`) : h('span', {}, 'competențe digitale'));
        if (x.culoare) a.style.setProperty('--pc', x.culoare); return a;
      })),
      h('section', { class: 'pya-pas lic-info' },
        h('div', { class: 'pya-pas-cap' }, h('span', { class: 'pya-pas-n' }, p.emoji), h('div', {}, h('h2', {}, p.nume), h('p', {}, p.lung))),
        h('div', { class: 'lic-fapte' }, [['🕒', `${p.ore} ${p.ore === 1 ? 'oră' : 'ore'} pe săptămână`, p.orePrac], ['💬', p.limbaje.join(' + '), p.limbaje.length > 1 ? 'două limbaje de programare în paralel' : 'limbajul de programare de bază'], ['📅', p.ani, 'ani de studiu']].map(([e, t, s]) => h('div', { class: 'lic-fapt' }, h('span', { 'aria-hidden': 'true' }, e), h('div', {}, h('b', {}, t), h('small', {}, s))))),
        h('h3', { class: 'lic-sub' }, 'Ce este specific profilului tău'), h('ul', { class: 'pya-lista' }, p.specific.map((x) => h('li', {}, x))),
        h('div', { class: 'pya-stare lic-stare' }, h('div', { class: 'pya-xp' }, h('div', { class: 'pya-xp-cap' }, h('span', {}, '📈 Progresul tău în clasa a IX-a'), h('span', {}, `${gata} din ${total} trepte rezolvate`)), h('span', { class: 'pya-xp-bara' }, (() => { const b = h('span', { class: 'pya-xp-in' }); b.style.width = `${total ? Math.max(3, Math.round((gata / total) * 100)) : 0}%`; return b; })())))),
      h('section', { class: 'pya-sectiune' }, h('h2', {}, 'Unitățile de învățare'), h('p', { class: 'lic-ordine' }, 'Ordinea este cea orientativă din programă. Poți lucra și într-o altă ordine, în funcție de clasă.'),
        h('div', { class: 'lic-unitati' }, lista.map((u) => {
          const pr = progresUnitate(u, p.id);
          const el = h('a', { class: `lic-unit${pr.gata === pr.total && pr.total ? ' gata' : ''}`, href: `#/liceu/u/${u.id}?p=${p.id}` },
            h('span', { class: 'lic-unit-nr' }, String(u.nr > 10 ? '+' : u.nr)), h('span', { class: 'lic-unit-e', 'aria-hidden': 'true' }, u.emoji),
            h('span', { class: 'lic-unit-t' }, h('b', {}, u.titlu), h('small', {}, u.domeniu), bonus(u, p.id) ? h('em', { class: 'lic-bonus' }, 'bonus') : null),
            h('span', { class: 'lic-unit-p', 'aria-label': `${pr.gata} din ${pr.total} trepte` }, ...Array.from({ length: pr.total }, (_, i) => h('i', { class: i < pr.gata ? 'on' : '' }))));
          return el;
        }))),
      h('section', { class: 'pya-sectiune' }, h('div', { class: 'pya-extra' },
        h('a', { class: 'pya-extra-c', href: '#/liceu/tkinter' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '🪟'), h('b', {}, 'Laborator tkinter'), h('span', {}, 'Scrie programe cu ferestre, butoane și casete de text și vezi fereastra direct în pagină.')),
        h('a', { class: 'pya-extra-c', href: '#/python' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '🐍'), h('b', {}, 'Curs Python'), h('span', {}, 'Recapitulare de la zero și module de nivel liceal: șiruri, mulțimi, dicționare, recursivitate, căutare binară.')),
        h('a', { class: 'pya-extra-c', href: '#/python/jocuri' }, h('span', { class: 'pya-extra-e', 'aria-hidden': 'true' }, '🎮'), h('b', {}, 'Jocuri Python'), h('span', {}, 'Robot programat în Python, ordonarea liniilor, găsește greșeala, Blitz.')))));
  }

  // ---------- Quiz pe niveluri Bloom ----------
  function quiz(u) {
    const loc = h('div', { class: 'lic-quiz' });
    let corecte = 0, raspunse = 0;
    const final = h('p', { class: 'pya-asoc-info lic-quiz-final', role: 'status', 'aria-live': 'polite' }, `Răspunde la cele ${u.quiz.length} întrebări. Fiecare are un nivel cognitiv.`);
    u.quiz.forEach((q, qi) => {
      const mesaj = h('p', { class: 'lic-expl', role: 'status', 'aria-live': 'polite' });
      const opt = q.opt.map((o, i) => {
        const b = h('button', { type: 'button', class: 'lic-opt' }, h('span', { html: inl(String(o)) }));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const bine = i === q.ok;
          for (const x of opt) x.disabled = true;
          b.classList.add(bine ? 'ok' : 'rau'); if (!bine) opt[q.ok].classList.add('ok');
          mesaj.className = `lic-expl ${bine ? 'ok' : 'rau'}`; mesaj.textContent = `${bine ? '✔ Corect. ' : '✘ Nu chiar. '}${q.expl}`;
          raspunse++; if (bine) corecte++;
          if (raspunse === u.quiz.length) {
            const nou = corecte >= 2 && acordaXP(`${u.id}:quiz-xp`, 10);
            P.liceu[`${u.id}:quiz`] = Math.max(P.liceu[`${u.id}:quiz`] || 0, corecte); salveaza();
            final.className = `pya-asoc-info lic-quiz-final ${corecte >= 2 ? 'ok' : 'rau'}`;
            final.textContent = `Ai răspuns corect la ${corecte} din ${u.quiz.length} întrebări.${nou ? ' +10 XP.' : ''}${corecte < u.quiz.length ? ' Recitește teoria pentru întrebările greșite și încearcă din nou.' : ' Excelent!'}`;
          }
        });
        return b;
      });
      const enunt = q.q.split('```');
      loc.append(h('article', { class: 'lic-intrebare' }, h('div', { class: 'lic-intrebare-cap' }, h('span', { class: 'lic-nr' }, String(qi + 1)), h('span', { class: 'lic-bloom' }, q.nivel)),
        ...enunt.map((t, i) => (i % 2 ? codBloc(t.replace(/^\n/, '')) : h('p', { class: 'lic-q', html: inl(t) }))), h('div', { class: 'lic-opts' }, opt), mesaj));
    });
    loc.append(final);
    return loc;
  }

  // ---------- Plan de lucru și reflecție (portofoliu) ----------
  function plan(u) {
    const n = (NOTE[u.id] = NOTE[u.id] || {});
    const camp = (k, titlu, sugestie) => {
      const ta = h('textarea', { class: 'lic-ta', rows: 3, placeholder: sugestie, 'aria-label': titlu });
      ta.value = n[k] || '';
      let t = null; ta.addEventListener('input', () => { n[k] = ta.value; clearTimeout(t); t = setTimeout(salveazaNote, 400); });
      return h('label', { class: 'lic-camp' }, h('span', {}, titlu), ta);
    };
    return h('div', { class: 'lic-plan' },
      camp('analiza', '1. Analiză', 'Date de intrare, date de ieșire, subprobleme, ce știu deja…'),
      camp('proiectare', '2. Proiectare', 'Pseudocod sau schemă logică, module (funcții) …'),
      camp('teste', '3. Teste', 'Cel puțin 5 teste: tipice, la limită, nevalide. Ce rezultat aștept la fiecare?'),
      camp('reflectie', '4. Reflecția mea', 'Ce am înțeles bine? Ce a fost greu? Ce întrebare mi-a rămas?'),
      h('p', { class: 'lic-notita' }, 'Notițele se păstrează doar în acest browser. Folosește „Tipărește portofoliul” ca să le salvezi ca PDF sau să le dai profesorului.'));
  }

  // ---------- Autoevaluare pe obiective ----------
  function obiective(u) {
    const n = (NOTE[u.id] = NOTE[u.id] || {}); n.obj = n.obj || {};
    const nivele = [['🌱', 'încă nu'], ['🌿', 'aproape'], ['🌳', 'pot']];
    return h('ul', { class: 'lic-obj' }, u.obiective.map((o, i) => {
      const grup = h('span', { class: 'lic-auto', role: 'radiogroup', 'aria-label': 'Cât de bine poți acest lucru?' });
      nivele.forEach(([e, t], k) => {
        const b = h('button', { type: 'button', class: `lic-auto-b${n.obj[i] === k ? ' sel' : ''}`, role: 'radio', 'aria-checked': String(n.obj[i] === k), title: t, 'aria-label': t }, e);
        b.addEventListener('click', () => { n.obj[i] = k; salveazaNote(); for (const x of grup.children) { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); } b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); });
        grup.append(b);
      });
      return h('li', {}, h('span', { class: 'lic-obj-t', html: inl(o) }), grup);
    }));
  }

  // ---------- Încearcă: executabil Python (sau laborator tkinter) ----------
  function incearca(u) {
    if (u.lab && window.TkLab) {
      const ed = editor(u.exemplu, { min: 10, laRulare: () => lab.ruleaza(ed.get()) });
      const lab = window.TkLab.creeaza();
      return h('div', { class: 'lic-lab' }, ed.el, h('div', { class: 'pya-bara' }, h('button', { class: 'pya-btn verde', type: 'button', onclick: () => lab.ruleaza(ed.get()) }, '▶ Rulează și arată fereastra'), h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { lab.opreste(); ed.set(u.exemplu); } }, '↺ Exemplul inițial'), h('span', { class: 'pya-sfat' }, 'Ctrl + Enter')), lab.el);
    }
    return A.panouIncearca(u.exemplu, u.intrariExemplu);
  }

  // ---------- Pagina unei unități ----------
  function pagUnitate(id, pid0) {
    const u = UNITATI.find((x) => x.id === id);
    if (!u) return hub(profilImplicit());
    const pid = profilDe(pid0) ? pid0 : profilImplicit();
    P.profil = pid; salveaza();
    const p = profilDe(pid);
    document.title = `${u.titlu} – Informatică IX – edudigi`;
    const lista = unitatiProfil(pid), k = lista.findIndex((x) => x.id === u.id), prec = lista[k - 1], urm = lista[k + 1];
    const sectiune = (n, titlu, sub, ...c) => h('section', { class: 'pya-pas' }, h('div', { class: 'pya-pas-cap' }, h('span', { class: 'pya-pas-n' }, n), h('div', {}, h('h2', {}, titlu), sub ? h('p', {}, sub) : null)), ...c);
    const blocuri = u.teorie.filter((b) => !b.doar || b.doar.includes(pid));
    const pagina_ = h('div', { class: 'pya lic' }, h('div', { class: 'wrap' },
      antet(`${u.emoji} ${u.titlu}`, null, [{ t: 'Liceu', href: `#/liceu/${pid}` }, { t: `Unitatea ${u.nr > 10 ? '(extra)' : u.nr}` }]),
      h('div', { class: 'lic-meta' }, h('span', { class: 'lic-chip' }, `${p.emoji} ${p.nume}`), h('span', { class: 'lic-chip' }, u.domeniu), h('span', { class: 'lic-chip cs' }, `CS ${u.cs.join(', ')}`), bonus(u, pid) ? h('span', { class: 'lic-chip bon' }, 'temă bonus pentru profilul tău') : null,
        h('button', { class: 'pya-btn alb mic lic-print', type: 'button', onclick: () => window.print() }, '🖨️ Tipărește portofoliul')),
      sectiune('🎯', 'Ce vei învăța', 'Înainte de lecție, apoi după ea, alege cât de bine poți fiecare lucru: 🌱 încă nu · 🌿 aproape · 🌳 pot.', obiective(u)),
      sectiune(1, 'Teorie', null, h('div', { class: 'pya-teorie' }, teorie(blocuri))),
      u.limbaj === 'cpp' ? sectiuneCpp(u, sectiune) : sectiune(2, u.lab ? 'Laborator: scrie și vezi fereastra' : 'Încearcă singur', u.lab ? 'Rulează exemplul, schimbă culori, texte și aranjarea, apoi rulează din nou. Butoanele și casetele funcționează.' : 'Rulează programul, schimbă ceva în el și rulează din nou.', incearca(u)),
      u.limbaj === 'cpp' ? null : sectiune(3, 'Exerciții pe trei trepte', 'Începe de unde te simți sigur. Fiecare treaptă pregătește următoarea și corespunde altui nivel cognitiv.', trepte(u, pid)),
      sectiune(u.limbaj === 'cpp' ? 3 : 4, 'Verifică-te', 'Întrebări pe niveluri cognitive: înțelegere, aplicare, analiză, evaluare.', quiz(u)),
      sectiune(u.limbaj === 'cpp' ? 4 : 5, 'Proiect (creare)', null, h('p', { class: 'pya-cer', html: inl(u.proiect) }), h('h3', { class: 'lic-sub' }, 'Planul meu de lucru'), plan(u)),
      sectiune('🏁', 'După lecție', 'Revino la obiectivele de mai sus și actualizează-ți autoevaluarea.', h('div', { class: 'pya-actiuni' }, h('a', { class: 'pya-btn alb', href: `#/liceu/${pid}` }, 'Toate unitățile'))),
      h('nav', { class: 'pya-pn', 'aria-label': 'Unități' }, prec ? h('a', { href: `#/liceu/u/${prec.id}?p=${pid}` }, `◀ ${prec.titlu}`) : h('span'), urm ? h('a', { href: `#/liceu/u/${urm.id}?p=${pid}` }, `${urm.titlu} ▶`) : h('span'))));
    show(pagina_);
  }

  function sectiuneCpp(u, sectiune) {
    const link = h('a', { class: 'pya-btn verde', href: '#/aplicatii/cpp' }, '⚙️ Deschide Editorul C++');
    return sectiune(2, 'Exemple C++', 'Copiază exemplul în Editorul C++ și rulează-l. Compară-l cu varianta în Python.', h('div', { class: 'lic-cpp' }, u.exempleCpp.map((e) => {
      const copie = h('button', { class: 'pya-btn alb mic', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(e.cod); copie.textContent = '✔ Copiat'; } catch { copie.textContent = 'Selectează și copiază manual'; } } }, '📋 Copiază codul');
      return h('div', { class: 'lic-cpp-ex' }, h('h3', {}, e.titlu), codBloc(e.cod), h('p', { class: 'lic-notita' }, e.intrare ? `Date de intrare: ${e.intrare.replace(/\n/g, ' ⏎ ')}` : 'Fără date de intrare.', ` Rezultat așteptat: ${e.iesire}`), copie);
    })), h('div', { class: 'pya-bara' }, link), h('h3', { class: 'lic-sub' }, 'Exerciții în C++'), ...u.exercitiiCpp.map((e, i) => {
      const sol = h('div', { hidden: true }, codBloc(e.solutie));
      return h('div', { class: 'lic-cpp-ex' }, h('p', { class: 'lic-bloom' }, e.nivel), h('p', { class: 'pya-cer', html: inl(`${i + 1}. ${e.cer}`) }), codBloc(e.start), h('p', { class: 'lic-notita' }, `Teste: ${e.teste.map((t) => `${JSON.stringify(t.i)} → ${JSON.stringify(t.o)}`).join(' · ')}`),
        h('button', { class: 'pya-btn alb mic', type: 'button', onclick: (ev) => { sol.hidden = !sol.hidden; ev.currentTarget.textContent = sol.hidden ? '👀 Arată soluția' : 'Ascunde soluția'; } }, '👀 Arată soluția'), sol);
    }));
  }

  function trepte(u, pid) {
    const taburi = h('div', { class: 'lic-taburi', role: 'tablist' }), panouri = [];
    const disp = TREPTE.filter(([k]) => exercitiu(u, k, pid));
    disp.forEach(([k, em, nume, xp], i) => {
      const ex = exercitiu(u, k, pid);
      const stare = h('span', { class: 'lic-tab-st' }, facut(u, k) ? '✓' : '');
      const tab = h('button', { type: 'button', class: `lic-tab${i === 0 ? ' act' : ''}`, role: 'tab', 'aria-selected': String(i === 0) }, h('span', { 'aria-hidden': 'true' }, em), ` ${nume} `, stare);
      let lab = null, labEl = null;
      const extra = u.lab && window.TkLab ? (ed) => [h('button', { class: 'pya-btn alb', type: 'button', onclick: () => { if (!lab) { lab = window.TkLab.creeaza(); labEl = lab.el; panou.append(labEl); } lab.ruleaza(ed.get()); } }, '👁️ Vezi fereastra')] : null;
      const ep = panouExercitiu(ex, { id: `${u.id}:${k}`, xp, deja: () => facut(u, k), extra, laReusit: (nou) => { if (nou) acordaXP(`${u.id}:${k}`, xp); stare.textContent = '✓'; return h('div', { class: 'pya-actiuni' }, i + 1 < disp.length ? h('button', { class: 'pya-btn verde', type: 'button', onclick: () => taburi.children[i + 1].click() }, `Treapta următoare ▶`) : h('span', {}, 'Ai terminat treptele! Continuă cu „Verifică-te”.')); } });
      const panou = h('div', { class: 'lic-panou', role: 'tabpanel', hidden: i !== 0 }, h('div', { class: 'lic-treapta-cap' }, h('span', { class: 'lic-bloom' }, ex.nivel), h('span', { class: 'lic-xp' }, `+${xp} XP`)), h('p', { class: 'pya-cer', html: inl(ex.cer) }), ep);
      tab.addEventListener('click', () => { taburi.querySelectorAll('.lic-tab').forEach((x, j) => { x.classList.toggle('act', j === i); x.setAttribute('aria-selected', String(j === i)); panouri[j].hidden = j !== i; }); });
      taburi.append(tab); panouri.push(panou);
    });
    return h('div', {}, taburi, ...panouri);
  }

  // ---------- Laboratorul tkinter (liber) ----------
  const EXEMPLE_TK = [
    { nume: 'Salut', cod: 'from tkinter import *\n\ndef saluta():\n    eticheta.config(text="Salut, " + caseta.get() + "!")\n\nroot = Tk()\nroot.title("Salut")\nLabel(root, text="Cum te cheamă?").pack(pady=4)\ncaseta = Entry(root)\ncaseta.pack()\nButton(root, text="Salută", command=saluta).pack(pady=4)\neticheta = Label(root, text="", fg="blue")\neticheta.pack()\nroot.mainloop()\n' },
    { nume: 'Contor', cod: 'from tkinter import *\n\ncontor = 0\n\ndef creste():\n    global contor\n    contor += 1\n    eticheta.config(text=str(contor))\n\nroot = Tk()\nroot.title("Contor")\neticheta = Label(root, text="0", font=("Arial", 32))\neticheta.pack(padx=40, pady=10)\nButton(root, text="+1", command=creste).pack(pady=6)\nroot.mainloop()\n' },
    { nume: 'Calculator (grid)', cod: 'from tkinter import *\nfrom tkinter import messagebox\n\ndef aduna():\n    try:\n        s = int(a.get()) + int(b.get())\n        rezultat.config(text="Suma: " + str(s))\n    except ValueError:\n        messagebox.showerror("Eroare", "Scrie două numere întregi!")\n\nroot = Tk()\nroot.title("Calculator")\nLabel(root, text="a:").grid(row=0, column=0)\nLabel(root, text="b:").grid(row=1, column=0)\na = Entry(root, width=10)\na.grid(row=0, column=1)\nb = Entry(root, width=10)\nb.grid(row=1, column=1)\nButton(root, text="Adună", command=aduna).grid(row=2, column=0, columnspan=2, pady=4)\nrezultat = Label(root, text="", fg="blue")\nrezultat.grid(row=3, column=0, columnspan=2)\nroot.mainloop()\n' },
    { nume: 'Listă de sarcini', cod: 'from tkinter import *\n\ndef adauga():\n    if caseta.get() != "":\n        lista.insert(END, caseta.get())\n        caseta.delete(0, END)\n\nroot = Tk()\nroot.title("Sarcini")\ncaseta = Entry(root, width=24)\ncaseta.pack(side=LEFT, padx=4, pady=6)\nButton(root, text="Adaugă", command=adauga).pack(side=LEFT, padx=4)\nlista = Listbox(root, height=6)\nlista.pack(padx=4, pady=6)\nroot.mainloop()\n' },
    { nume: 'Desen (Canvas)', cod: 'from tkinter import *\n\nroot = Tk()\nroot.title("Desen")\ndesen = Canvas(root, width=300, height=200, bg="white")\ndesen.pack()\ndesen.create_rectangle(40, 80, 140, 170, fill="orange", outline="black")\ndesen.create_oval(170, 40, 260, 130, fill="skyblue")\ndesen.create_line(0, 180, 300, 180, fill="green", width=3)\ndesen.create_text(150, 20, text="Lumea mea")\nroot.mainloop()\n' },
    { nume: 'Meniu și taste', cod: 'from tkinter import *\n\nroot = Tk()\nroot.title("Meniu")\netichetaz = Label(root, text="Apasă o tastă în caseta de mai jos", width=40)\netichetaz.pack(pady=6)\ncaseta = Entry(root)\ncaseta.pack()\ndef tasta(ev):\n    etichetaz.config(text="Ai apăsat: " + ev.keysym)\ncaseta.bind("<Key>", tasta)\nmeniu = Menu(root)\nfisier = Menu(meniu)\nfisier.add_command(label="Ieșire", command=root.destroy)\nmeniu.add_cascade(label="Fișier", menu=fisier)\nroot.config(menu=meniu)\nroot.mainloop()\n' },
  ];
  function pagTk() {
    document.title = 'Laborator tkinter – edudigi';
    const ed = editor(EXEMPLE_TK[0].cod, { min: 14, laRulare: () => lab.ruleaza(ed.get()) });
    const lab = window.TkLab.creeaza();
    pagina(
      antet('Laborator tkinter', 'Scrie un program cu interfață grafică și vezi fereastra lui în pagină. Programul rulează în același interpretor Python ca în Editorul Python.', [{ t: 'Liceu', href: '#/liceu' }, { t: 'Laborator tkinter' }]),
      h('div', { class: 'pya-filtre' }, EXEMPLE_TK.map((x) => h('button', { type: 'button', class: 'pya-chip-f', onclick: () => { lab.opreste(); ed.set(x.cod); } }, x.nume))),
      h('div', { class: 'lic-lab dublu' }, h('section', { class: 'pya-pas' }, ed.el, h('div', { class: 'pya-bara' }, h('button', { class: 'pya-btn verde mare', type: 'button', onclick: () => lab.ruleaza(ed.get()) }, '▶ Rulează'), h('span', { class: 'pya-sfat' }, 'Ctrl + Enter'))), h('section', { class: 'pya-pas' }, lab.el)),
      h('p', { class: 'pya-subsol' }, 'Simulatorul acceptă: Tk, Frame, LabelFrame, Label, Button, Entry, Text, Listbox, Canvas, Menu, StringVar/IntVar, messagebox, bind, after și aranjarea cu pack, grid și place.'));
  }

  routes.push({ pattern: /^\/liceu(?:\/(sn|mi|mil|int))?$/, handler: async (m) => hub(m[1] || profilImplicit()) });
  routes.push({ pattern: /^\/liceu\/u\/([a-z-]+)$/, handler: async (m, params) => pagUnitate(m[1], params.get('p')) });
  routes.push({ pattern: /^\/liceu\/tkinter$/, handler: async () => pagTk() });
  window.LiceuUI = { hub, pagUnitate, unitatiProfil, progresUnitate, profilDe, vizibila };
})();

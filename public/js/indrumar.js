'use strict';
// Îndrumar de predare pentru profesori (#/profesor/indrumar): principiile pedagogice din programe și cum sunt aplicate,
// fișe de lecție cu scenarii de oră, greșeli frecvente, diferențiere, evaluare (rubrici, generator de test cu barem),
// planificare model cu rezervă de 25% din timp și un catalog de metode de predare a programării. Doar pentru profesori.
(() => {
  if (!window.EduApp || !globalThis.LICEU) return;
  const { h, show, routes } = window.EduApp;
  const A = window.PyAcad || {};
  const LI = globalThis.LICEU;
  const { PROFILE, UNITATI, BLOOM, PRINCIPII, NIVELURI_ACTIVITATI } = LI;
  const MODULE_PY = (window.PyCurs && window.PyCurs.MODULE) || [];
  const CHEIE = 'edudigi_indrumar';
  let ST = {};
  try { ST = JSON.parse(localStorage.getItem(CHEIE) || '{}'); } catch { /* fără stocare */ }
  const salveaza = () => { try { localStorage.setItem(CHEIE, JSON.stringify(ST)); } catch { /* ignorat */ } };
  const inl = A.inl || ((x) => x);
  const codBloc = A.codBloc || ((c) => h('pre', {}, c));
  UNITATI.sort((a, b) => a.nr - b.nr);

  const TABURI = [['principii', '⚖️ Principii pedagogice'], ['fise', '📋 Fișe de lecție (IX)'], ['tic', '💻 TIC IX'], ['plan', '📅 Planificare model'], ['metode', '🧰 Metode de predare'], ['evaluare', '📝 Evaluare și generator de test'], ['python', '🐍 Cursul Python']];

  // ---------- Pagina ----------
  function pagina(tab) {
    const sesiune = window.EduCont && window.EduCont.sesiune();
    if (!sesiune || sesiune.rol !== 'profesor') { location.hash = '#/intra'; return; }
    document.title = 'Îndrumar de predare – edudigi';
    const corp = { principii, fise, tic, plan, metode, evaluare, python }[tab] || principii;
    show(h('div', { class: 'pya ind' }, h('div', { class: 'wrap' },
      h('header', { class: 'pya-antet' }, h('nav', { class: 'pya-crumbs', 'aria-label': 'Navigare' }, h('a', { href: '#/profesor' }, '👩‍🏫 Panoul profesorului'), '›', h('span', {}, 'Îndrumar de predare')),
        h('h1', {}, 'Îndrumar de predare'), h('p', {}, 'Scenarii de oră, soluții de predare, diferențiere și evaluare, construite pe programele școlare din 2025 și pe principiile lor pedagogice. Folosește-le ca punct de plecare: programa îți lasă libertatea de a alege metodele.')),
      h('div', { class: 'pya-filtre ind-taburi', role: 'tablist' }, TABURI.map(([id, t]) => h('a', { class: `pya-chip-f${tab === id ? ' act' : ''}`, href: `#/profesor/indrumar?t=${id}`, role: 'tab', 'aria-selected': String(tab === id) }, t))),
      corp())));
  }
  const sectiune = (titlu, sub, ...c) => h('section', { class: 'pya-pas ind-sec' }, h('div', { class: 'pya-pas-cap' }, h('div', {}, h('h2', {}, titlu), sub ? h('p', {}, sub) : null)), ...c);
  const lista = (arr) => h('ul', { class: 'pya-lista' }, arr.map((x) => h('li', { html: inl(x) })));
  const tabel = (cap, randuri) => h('div', { class: 'pya-tabel-w' }, h('table', { class: 'pya-tabel' }, h('thead', {}, h('tr', {}, cap.map((c) => h('th', {}, c)))), h('tbody', {}, randuri.map((r) => h('tr', {}, r.map((c) => h('td', { html: inl(String(c)) })))))));

  // ---------- 1. Principii ----------
  function principii() {
    ST.bifate = ST.bifate || {};
    return h('div', {},
      sectiune('Principiile din programă', 'Principiile generale care trebuie să guverneze predarea-învățarea-evaluarea la informatică (Sugestii metodologice, clasa a IX-a), cu felul în care le respectă platforma și ce poți face tu.',
        h('div', { class: 'ind-principii' }, PRINCIPII.map((p) => {
          const cb = (grup, i) => { const id = `${p.id}-${grup}-${i}`; const c = h('input', { type: 'checkbox', id }); c.checked = !!ST.bifate[id]; c.addEventListener('change', () => { ST.bifate[id] = c.checked; salveaza(); }); return c; };
          return h('article', { class: 'ind-principiu' }, h('h3', {}, p.titlu), h('p', { class: 'ind-text' }, p.text),
            h('div', { class: 'ind-doua' }, h('div', {}, h('h4', {}, '✅ Cum o aplică platforma'), lista(p.platforma)), h('div', {}, h('h4', {}, '🙋 Ce poți face tu (bifează ce aplici)'), h('ul', { class: 'lic-crit' }, p.profesor.map((x, i) => h('li', {}, cb('p', i), h('label', { for: `${p.id}-p-${i}` }, x)))))));
        }))),
      sectiune('Competențele generale și taxonomia Bloom', 'Programa construiește competențele generale pe taxonomia Bloom revizuită. Fiecare nivel cere alt tip de activitate.',
        tabel(['CG', 'Verb', 'Nivel cognitiv', 'Activități recomandate', 'Unde o găsești în platformă'], BLOOM.map((b) => [`**CG${b.cg}**`, b.verb, b.nivel, b.activitati, b.cum]))),
      sectiune('Activități de învățare după nivelul cognitiv', null, tabel(['Nivelul', 'Activități recomandate'], NIVELURI_ACTIVITATI)),
      sectiune('Rezerva de 25% din timp', 'Programa lasă 25% din timpul alocat la dispoziția profesorului pentru remediere, consolidare, aprofundare sau extindere. Cum o folosești:',
        lista(['**După evaluarea formativă** a fiecărei unități: elevii care nu au atins treapta „Standard” primesc remediere; ceilalți lucrează la „Aprofundare” sau la jocurile din Sala de jocuri Python.', '**Înainte de evaluarea sumativă:** o oră de recapitulare cu probleme mixte.', '**Pentru proiecte:** timp de prezentare și feedback între colegi.', 'Planificarea model din tabul „Planificare” păstrează explicit această rezervă.'])));
  }

  // ---------- 2. Fișe de lecție ----------
  function fisaUnitate(u, pid) {
    const e = u.exercitii || {};
    const solutii = [['rem', '🌱 Remediere'], ['std', '🌿 Standard'], ['apr', '🌳 Aprofundare'], ['apr_sn', '🌳 Aprofundare (științe ale naturii)']].filter(([k]) => e[k]);
    const sc = u.prof.scenariu;
    return h('details', { class: 'ind-fisa', open: false },
      h('summary', {}, h('span', { 'aria-hidden': 'true' }, `${u.emoji} `), `Unitatea ${u.nr > 10 ? '(extra)' : u.nr}: ${u.titlu}`, h('small', {}, ` · ${u.prof.durata}`)),
      h('div', { class: 'ind-fisa-corp' },
        h('div', { class: 'ind-chips' }, h('span', { class: 'lic-chip cs' }, `CS ${u.cs.join(', ')}`), h('span', { class: 'lic-chip' }, u.domeniu), (u.profile ? h('span', { class: 'lic-chip bon' }, `doar: ${u.profile.join(', ')}`) : null), (u.bonus ? h('span', { class: 'lic-chip bon' }, `bonus: ${u.bonus.join(', ')}`) : null)),
        h('h4', {}, '🎯 Obiective operaționale'), lista(u.obiective),
        h('h4', {}, '⏱️ Scenariu de oră'), tabel(['Timp', 'Etapa', 'Activitate'], sc),
        h('div', { class: 'ind-doua' }, h('div', {}, h('h4', {}, '⚠️ Greșeli frecvente'), lista(u.prof.greseli)), h('div', {}, h('h4', {}, '🧭 Metode recomandate'), lista(u.prof.metode), h('h4', {}, '🔗 Legături interdisciplinare'), lista(u.prof.legaturi))),
        h('h4', {}, '🧩 Diferențiere'), tabel(['Remediere', 'Aprofundare', 'Elevi cu CES'], [[u.prof.diferentiere.remediere, u.prof.diferentiere.aprofundare, u.prof.diferentiere.ces]]),
        h('h4', {}, '📏 Evaluare'), lista(u.prof.evaluare),
        h('h4', {}, '✅ Soluții de referință'), ...solutii.map(([k, n]) => h('details', { class: 'ind-sol' }, h('summary', {}, `${n}: ${e[k].nivel}`), h('p', { class: 'pya-cer', html: inl(e[k].cer) }), codBloc(e[k].solutie), h('p', { class: 'lic-notita' }, `Teste: ${e[k].teste.length} (primele două vizibile elevului, restul ascunse).`))),
        ...(u.exercitiiCpp ? u.exercitiiCpp.map((x, i) => h('details', { class: 'ind-sol' }, h('summary', {}, `⚙️ C++ ${i + 1}: ${x.nivel}`), h('p', { class: 'pya-cer', html: inl(x.cer) }), codBloc(x.solutie))) : []),
        h('h4', {}, '🎓 Proiect'), h('p', { html: inl(u.proiect) }),
        h('h4', {}, '❓ Itemi de evaluare (quiz)'), tabel(['Nivel', 'Întrebare', 'Răspuns corect', 'Explicație'], u.quiz.map((q) => [q.nivel, q.q.replace(/```[\s\S]*?```/g, '(cod)'), q.opt[q.ok], q.expl]))));
  }
  function fise() {
    return h('div', {}, h('div', { class: 'pya-caseta nota' }, h('span', { class: 'pya-caseta-i', 'aria-hidden': 'true' }, '💡'), h('div', {}, 'Fiecare fișă se deschide cu un clic. Scenariile sunt schelete orientative; adaptează-le la clasă. Poți tipări pagina (Ctrl + P) ca să ai fișele pe hârtie.')),
      h('div', { class: 'ind-print' }, h('button', { class: 'pya-btn alb mic', type: 'button', onclick: () => { document.querySelectorAll('.ind-fisa').forEach((d) => { d.open = true; }); window.print(); } }, '🖨️ Tipărește toate fișele')),
      ...UNITATI.map((u) => fisaUnitate(u)));
  }

  // ---------- 3. TIC ----------
  function tic() {
    const TIC = LI.TIC || [];
    return h('div', {}, h('div', { class: 'pya-caseta atentie' }, h('span', { class: 'pya-caseta-i', 'aria-hidden': 'true' }, '⚠️'), h('div', {}, h('b', {}, 'Aliniere la programa oficială. '), 'Unitățile de TIC pentru clasa a IX-a sunt construite pe DigComp 2.2 (citat în programele de informatică din 2025). Programa oficială de TIC nu a fost încărcată în platformă, deci verifică competențele specifice înainte de a le folosi la clasă. Dacă mi-o trimiți, o pun în corespondență punct cu punct.')),
      ...TIC.map((u) => h('details', { class: 'ind-fisa' }, h('summary', {}, `${u.emoji} Unitatea ${u.nr}: ${u.titlu}`, h('small', {}, ` · ${u.prof.durata} · ${u.digcomp}`)),
        h('div', { class: 'ind-fisa-corp' }, h('h4', {}, '🎯 Obiective'), lista(u.obiective), h('h4', {}, '⏱️ Scenariu de oră'), tabel(['Timp', 'Etapa', 'Activitate'], u.prof.scenariu),
          h('div', { class: 'ind-doua' }, h('div', {}, h('h4', {}, '⚠️ Greșeli frecvente'), lista(u.prof.greseli)), h('div', {}, h('h4', {}, '🧭 Metode'), lista(u.prof.metode), h('h4', {}, '🔗 Legături'), lista(u.prof.legaturi))),
          h('h4', {}, '🧩 Diferențiere'), tabel(['Remediere', 'Aprofundare', 'Elevi cu CES'], [[u.prof.diferentiere.remediere, u.prof.diferentiere.aprofundare, u.prof.diferentiere.ces]]),
          h('h4', {}, '🛠️ Activitate practică și rubrică'), h('p', { html: inl(`**${u.activitate.titlu}**`) }), h('ol', { class: 'pya-lista' }, u.activitate.pasi.map((x) => h('li', { html: inl(x) }))), tabel(['Criteriu de succes'], u.activitate.criterii.map((c) => [c])),
          h('h4', {}, '❓ Itemi de evaluare'), tabel(['Nivel', 'Întrebare', 'Răspuns corect'], u.quiz.map((q) => [q.nivel, q.q, q.opt[q.ok]]))))));
  }

  // ---------- 4. Planificare model ----------
  const GREUTATI = { principii: 1, numere: 1.5, subprograme: 1.2, poo: 1.2, tkinter: 1.5, fisiere: 1.2, lista: 1, 'clasa-list': 1.2, generare: 0.9, sortare: 1.5, exponentiere: 0.6, 'cpp-paralel': 2.2 };
  function plan() {
    const sapt = 35;
    return h('div', {}, h('div', { class: 'pya-caseta nota' }, h('span', { class: 'pya-caseta-i', 'aria-hidden': 'true' }, '💡'), h('div', {}, `Model de planificare pentru ${sapt} de săptămâni de curs, cu **25% din timp păstrat ca rezervă** (programa). Orele pe unitate sunt proporționale cu complexitatea; ajustează-le după clasă. Alocarea orară pe săptămână este cea din programa fiecărui profil.`.replace(/\*\*(.+?)\*\*/, '$1'))),
      ...PROFILE.map((p) => {
        const total = p.ore * sapt, rezerva = Math.round(total * 0.25), util = total - rezerva;
        const lista_ = UNITATI.filter((u) => (!u.profile || u.profile.includes(p.id)));
        const suma = lista_.reduce((s, u) => s + (GREUTATI[u.id] || 1), 0);
        let acum = 0;
        const randuri = lista_.map((u) => { const ore = Math.max(1, Math.round(((GREUTATI[u.id] || 1) / suma) * util)); const de = acum + 1; acum += ore; return [u.nr > 10 ? '+' : u.nr, u.titlu, `${ore} ${ore === 1 ? 'oră' : 'ore'}`, `orele ${de}–${acum}`, u.cs.join(', ')]; });
        return sectiune(`${p.emoji} ${p.nume}`, `${p.ore} ${p.ore === 1 ? 'oră' : 'ore'}/săptămână (${p.orePrac}) → ${total} ore pe an, din care ${util} planificate și ${rezerva} de rezervă (25%).`,
          tabel(['Nr.', 'Unitatea', 'Ore', 'Interval', 'CS'], [...randuri, ['', '**Rezervă (remediere, consolidare, aprofundare, evaluări)**', `${rezerva} ore`, `orele ${acum + 1}–${total}`, '']]),
          h('ul', { class: 'pya-lista' }, p.specific.map((x) => h('li', {}, x))));
      }));
  }

  // ---------- 5. Metode ----------
  const METODE = [
    { n: 'PRIMM (Predict – Run – Investigate – Modify – Make)', c: 'Predai, rulezi, investighezi, modifici, creezi: o secvență care duce elevul de la citirea codului la scrierea lui.', cum: ['**Predict:** elevii prezic ce afișează un cod (jocul „Blitz: ce afișează?”).', '**Run:** rulează exemplul din lecție și compară cu predicția.', '**Investigate:** explică fiecare linie, completează un tabel de urmărire.', '**Modify:** schimbă codul (alt exemplu, altă condiție).', '**Make:** exercițiile pe trei trepte și proiectul.'], timp: '45–50 min', unde: 'Orice unitate de programare' },
    { n: 'Pair programming (pilot și navigator)', c: 'Doi elevi lucrează la un singur calculator: pilotul scrie, navigatorul gândește, verifică și întreabă; rolurile se schimbă la 10 minute.', cum: ['Dă o regulă: pilotul nu are voie să scrie ce nu a explicat navigatorul.', 'Pune în pereche un elev puternic și unul care are nevoie de sprijin doar când scopul este mentoratul; altfel, perechi echilibrate.', 'Cere la final: „Ce a învățat fiecare de la celălalt?”'], timp: '20–30 min', unde: 'Subprograme, fișiere, tkinter' },
    { n: 'Probleme Parsons (ordonează liniile)', c: 'Elevii primesc liniile unui program amestecate și le ordonează; reduce povara scrierii și evidențiază structura.', cum: ['Jocul „Ordonează liniile” din Sala de jocuri.', 'Variantă: linii în plus (distractori) pentru nivelurile avansate.', 'Discută de ce două ordini diferite pot fi ambele corecte.'], timp: '10–15 min', unde: 'Începutul unei lecții noi, remediere' },
    { n: 'Programare live (live coding)', c: 'Scrii codul în fața clasei, gândind cu voce tare, inclusiv greșelile.', cum: ['Greșește voit o dată și lasă elevii să găsească eroarea.', 'Cere elevilor să prezică următoarea linie înainte să o scrii.', 'Folosește mesajele de eroare explicate în română ca punct de discuție.'], timp: '10–20 min', unde: 'Introducerea oricărui concept nou' },
    { n: 'Sparge programul colegului (testare adversarială)', c: 'Elevii caută teste pentru care programul altuia greșește; transformă testarea într-un joc.', cum: ['Fiecare scrie programul și lista lui de teste; apoi schimbă calculatoarele.', 'Se acordă puncte pentru fiecare test care descoperă o greșeală reală.', 'Se discută categoriile de teste: tipice, la limită, nevalide.'], timp: '15 min', unde: 'Principii de elaborare, numere, liste' },
    { n: 'Tabelul de urmărire (trace table)', c: 'Elevii simulează manual programul și notează valoarea fiecărei variabile la fiecare pas.', cum: ['Desenează tabelul pe tablă pentru un ciclu scurt.', 'Elevii îl completează în perechi pentru un al doilea exemplu.', 'Compară cu rularea reală (sau cu depanarea pas cu pas din Editorul Python).'], timp: '10–15 min', unde: 'Cicluri, cifre, sortări, recursivitate' },
    { n: 'Think – Pair – Share', c: 'Gândești singur, discuți în pereche, apoi împărtășești clasei.', cum: ['Pune o întrebare de analiză („De ce nu merge `w = v` ca să copiezi o listă?”).', '1 minut individual, 2 minute în pereche, apoi 2–3 răspunsuri în clasă.'], timp: '5–8 min', unde: 'Clasa list, subprograme, complexitate' },
    { n: 'Bilet de ieșire (exit ticket)', c: 'La finalul orei, fiecare elev scrie pe un bilet: ce a înțeles, ce întrebare i-a rămas.', cum: ['Folosește rubrica „Reflecția mea” din platformă sau un bilet pe hârtie.', 'Citește biletele înainte de ora următoare și începe cu 2–3 răspunsuri.'], timp: '3 min', unde: 'Finalul oricărei ore' },
    { n: 'Revizuire de cod între colegi (code review)', c: 'Elevii citesc codul unui coleg și dau feedback după o listă: nume sugestive, structură, teste, eficiență.', cum: ['Dă o listă de 4 criterii; feedback „2 stele și o dorință”.', 'Cere ca fiecare comentariu să fie formulat ca o sugestie, nu ca o critică.'], timp: '15 min', unde: 'După proiecte' },
    { n: 'Învățare prin proiect', c: 'Un produs real (aplicație, analiză de date, joc) construit pe mai multe ore, cu etape și criterii.', cum: ['Folosește proiectul de la finalul fiecărei unități și planul „analiză – proiectare – teste”.', 'Stabilește etape intermediare cu feedback; evaluează procesul, nu doar produsul.'], timp: '2–4 ore', unde: 'Finalul unităților' },
  ];
  function metode() {
    return h('div', {}, sectiune('Catalog de metode pentru predarea programării', 'Fiecare metodă are o descriere, pași de aplicare și unde se potrivește. Sunt „soluții de predare” gata de folosit; alege 2–3 pentru fiecare unitate.',
      h('div', { class: 'ind-metode' }, METODE.map((m) => h('article', { class: 'ind-metoda' }, h('h3', {}, m.n), h('p', { class: 'ind-text' }, m.c), h('ul', { class: 'pya-lista' }, m.cum.map((x) => h('li', { html: inl(x) }))), h('p', { class: 'ind-meta' }, h('span', { class: 'lic-chip' }, `⏱️ ${m.timp}`), h('span', { class: 'lic-chip cs' }, `📍 ${m.unde}`)))))),
      sectiune('Cum folosești platforma la oră', 'Un tipar de oră care îmbină explicația cu lucrul practic:',
        tabel(['Minut', 'Ce se întâmplă', 'Resursa din platformă'], [['0–5', 'Captare, întrebare-problemă', 'Întrebarea din fișa lecției'], ['5–15', 'Predare dialogată, programare live', 'Teoria unității, afișată pe tablă'], ['15–35', 'Lucru pe niveluri (diferențiat)', 'Exerciții pe trei trepte; indicii în trepte'], ['35–45', 'Verificare, discuție de greșeli, testare între colegi', 'Rezultatele verificării automate'], ['45–50', 'Bilet de ieșire', 'Autoevaluarea și „Reflecția mea”']])));
  }

  // ---------- 6. Evaluare și generator de test ----------
  const RUBRICA = [
    ['Corectitudine', 'Programul rezolvă corect problema pe toate cazurile (inclusiv cele speciale).', 'Merge pe exemplul din enunț și pe majoritatea cazurilor.', 'Merge doar pe unele cazuri simple.', 'Nu rulează sau nu rezolvă problema.'],
    ['Algoritm', 'Algoritm potrivit, justificat, cu complexitate acceptabilă.', 'Algoritm corect, dar mai lent sau greu de justificat.', 'Algoritm parțial corect.', 'Algoritm lipsă sau greșit.'],
    ['Claritate și structură', 'Nume sugestive, subprograme, cod ușor de citit.', 'Nume bune, dar structură slabă.', 'Cod greu de urmărit.', 'Cod de neînțeles.'],
    ['Testare și depanare', 'Teste tipice, la limită și nevalide; erori găsite și corectate.', 'Teste tipice și unele la limită.', 'Doar un test.', 'Fără teste.'],
    ['Comunicare / reflecție', 'Explică alegerile și învățămintele cu vocabular de specialitate.', 'Explică alegerile principale.', 'Explicație vagă.', 'Fără explicație.'],
  ];
  function evaluare() {
    const unitatiProg = UNITATI.filter((u) => u.limbaj !== 'cpp');
    const sel = new Set(ST.testUnitati || [unitatiProg[0].id]);
    let nrQ = ST.testNrQ || 5;
    const iesire = h('div', { class: 'ind-test-iesire' });
    const cbs = unitatiProg.map((u) => { const c = h('input', { type: 'checkbox', id: `tu-${u.id}` }); c.checked = sel.has(u.id); c.addEventListener('change', () => { if (c.checked) sel.add(u.id); else sel.delete(u.id); ST.testUnitati = [...sel]; salveaza(); }); return h('label', { class: 'ind-cb', for: `tu-${u.id}` }, c, ` ${u.nr > 10 ? '+' : u.nr}. ${u.titlu}`); });
    const nrSel = h('select', { 'aria-label': 'Numărul de întrebări grilă' }, [4, 5, 8].map((n) => h('option', { value: String(n), selected: n === nrQ }, `${n} întrebări grilă`)));
    nrSel.addEventListener('change', () => { nrQ = Number(nrSel.value); ST.testNrQ = nrQ; salveaza(); });
    const alege = (arr, n) => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b.slice(0, n); };
    function genereaza() {
      const us = unitatiProg.filter((u) => sel.has(u.id));
      if (!us.length) { iesire.replaceChildren(h('p', { class: 'pya-asoc-info rau' }, 'Alege cel puțin o unitate.')); return; }
      const itemi = alege(us.flatMap((u) => u.quiz.map((q) => ({ ...q, unitate: u.titlu }))), nrQ);
      const puncteQ = 40 / nrQ;
      const std = alege(us.filter((u) => u.exercitii && u.exercitii.std), 1)[0], apr = alege(us.filter((u) => u.exercitii && (u.exercitii.apr || u.exercitii.apr_sn)), 1)[0];
      const litere = ['A', 'B', 'C', 'D'];
      const test = h('div', { class: 'ind-test' },
        h('h3', {}, 'Test de evaluare – Informatică, clasa a IX-a'), h('p', { class: 'ind-meta' }, `Unități: ${us.map((u) => u.titlu).join('; ')}`),
        h('p', {}, 'Nume și prenume: ____________________   Clasa: ______   Data: __________   Punctaj: ______'),
        h('p', { class: 'ind-meta' }, 'Se acordă 10 puncte din oficiu. Timp de lucru: 50 de minute.'),
        h('h4', {}, `A. Întrebări grilă (${nrQ} × ${puncteQ} p = 40 p). Încercuiește litera răspunsului corect.`),
        ...itei(itemi, litere),
        h('h4', {}, 'B. Probleme'),
        std ? h('div', { class: 'ind-problema' }, h('p', { html: inl(`**Problema 1 (30 p).** ${std.exercitii.std.cer}`) }), h('div', { class: 'ind-spatiu' })) : null,
        apr ? h('div', { class: 'ind-problema' }, h('p', { html: inl(`**Problema 2 (20 p).** ${(apr.exercitii.apr || apr.exercitii.apr_sn).cer}`) }), h('div', { class: 'ind-spatiu' })) : null);
      const barem = h('div', { class: 'ind-test barem' },
        h('h3', {}, 'Barem de evaluare și notare'), h('p', {}, `Oficiu: 10 p. Grila: ${nrQ} × ${puncteQ} p = 40 p. Problema 1: 30 p. Problema 2: 20 p. Total: 100 p. Nota = punctaj / 10.`),
        h('h4', {}, 'A. Răspunsuri'), h('ol', { class: 'pya-lista' }, itemi.map((q) => h('li', { html: inl(`**${litere[q.ok]}** – ${q.opt[q.ok]}. ${q.expl}`) }))),
        std ? sol('Problema 1 (30 p)', std.exercitii.std, [['corectitudinea soluției pe teste', 20], ['alegerea și justificarea algoritmului / structura', 5], ['claritatea codului și tratarea cazurilor speciale', 5]]) : null,
        apr ? sol('Problema 2 (20 p)', apr.exercitii.apr || apr.exercitii.apr_sn, [['corectitudinea soluției pe teste', 12], ['eficiența (complexitatea cerută)', 5], ['claritatea codului', 3]]) : null);
      iesire.replaceChildren(h('div', { class: 'pya-bara' }, h('button', { class: 'pya-btn alb', type: 'button', onclick: () => window.print() }, '🖨️ Tipărește testul și baremul')), test, barem);
    }
    function itei(itemi, litere) {
      return itemi.map((q, i) => h('div', { class: 'ind-item' }, h('p', { class: 'ind-q' }, `${i + 1}. `, ...q.q.split('```').map((t, k) => (k % 2 ? codBloc(t.replace(/^\n/, '')) : h('span', { html: inl(t) })))), h('ul', { class: 'ind-opt' }, q.opt.map((o, k) => h('li', {}, `${litere[k]}) `, h('span', { html: inl(String(o)) }))))));
    }
    function sol(titlu, ex, criterii) {
      return h('div', { class: 'ind-problema' }, h('h4', {}, titlu), h('p', { html: inl(ex.cer) }), codBloc(ex.solutie), h('p', { class: 'ind-meta' }, 'Teste pentru verificare: ', ex.teste.slice(0, 3).map((t) => JSON.stringify(t.i || '') + ' → ' + JSON.stringify(t.o || t.dupa || '')).join(' · ')), tabel(['Criteriu', 'Puncte'], criterii.map(([c, p]) => [c, `${p} p`])));
    }
    return h('div', {},
      sectiune('Rubrica pentru evaluarea unui program', 'Un instrument pentru evaluarea formativă și sumativă a lucrărilor de programare, pe 4 niveluri. Programa recomandă evaluarea gândirii algoritmice, a strategiilor și a corectării propriilor erori, nu doar a rezultatului.',
        tabel(['Criteriu', '4 – Excelent', '3 – Bine', '2 – În curs', '1 – Început'], RUBRICA.map((r) => [`**${r[0]}**`, ...r.slice(1)]))),
      sectiune('Întrebările evaluării', 'Înainte de a evalua, răspunde (din programă): De ce evaluez? Ce evaluez? Cum evaluez? Cât de bine măsor? Ce feedback dau? Ce decizii iau?', lista(['**Formativă** (pe parcurs): verificarea automată din platformă, tabloul de progres, bilete de ieșire, observarea lucrului în perechi.', '**Sumativă** (după fiecare unitate): generatorul de test de mai jos sau proiectul cu rubrica.', '**Feedback:** specific, imediat, orientat spre pasul următor („încearcă să testezi și cu `0`”), nu doar „corect/greșit”.', '**Decizii:** rezultatele orientează folosirea celor 25% rezervă (remediere / aprofundare).'])),
      sectiune('Generator de test cu barem', 'Alege unitățile; platforma alcătuiește un test (întrebări grilă pe niveluri Bloom și două probleme) și baremul cu soluțiile. Tipărește-l sau salvează-l ca PDF.',
        h('div', { class: 'ind-cbs' }, cbs), h('div', { class: 'pya-bara' }, nrSel, h('button', { class: 'pya-btn verde', type: 'button', onclick: genereaza }, '🎲 Generează testul')), iesire));
  }

  // ---------- 7. Cursul Python ----------
  const GRESELI_PY = {
    m1: ['Confundă `=` (atribuire) cu `==` (comparație).', 'Uită conversia `int(input())` și lipește texte.', 'Scrie `print` cu ghilimele lipsă sau neînchise.'],
    m2: ['Indentare greșită sub `if`.', 'Folosește `if` repetat în loc de `elif`.', 'Uită `:` după condiție.'],
    m3: ['Buclă infinită (uită să modifice variabila din `while`).', 'Limita `range` neinclusivă (`range(1, n)` omite `n`).', 'Confundă `break` cu `continue`.'],
    m4: ['Alias în loc de copie la liste.', 'IndexError: indice în afara listei.', 'Modifică lista în timp ce o parcurge.'],
    m5: ['`print` în loc de `return`.', 'Apelează funcția fără să păstreze rezultatul.', 'Variabile locale vs. globale.'],
    m6: ['Nu tratează cazuri speciale (împărțire la 0).', 'Verifică în ordine greșită cazurile `if/elif`.'],
    m7: ['`[[0] * n] * n` pentru matrice (același obiect repetat).', 'Încearcă `a[0]` pe o mulțime.', 'Compară șiruri fără a ține seama de majuscule.'],
    m8: ['Recursie fără caz de bază (RecursionError).', 'Căutare binară pe listă nesortată.', 'Modifică lista în pasul recursiv și pierde datele.'],
    m9: ['Ciclul lui Cezar: nu tratează literele de la sfârșitul alfabetului (uită `% 26`).', 'Greedy aplicat unde nu este corect (monede arbitrare).', 'Flood fill fără marcarea celulelor vizitate (recursie infinită).'],
  };
  function python() {
    return h('div', {}, sectiune('Cursul Python: cum îl folosești la clasă', 'Cursul „Python – de la zero” (module 1–6) este potrivit pentru clasele VII–VIII și pentru recapitularea din clasa a IX-a; modulele 7–9 (nivel liceu) merg la clasele IX–X.',
      lista(['**Predare:** proiectează teoria și exemplul executabil, apoi lasă elevii să lucreze exercițiul. Indiciile sunt în trepte, iar soluția apare după mai multe încercări.', '**Verificare:** exercițiile au teste vizibile și ascunse; elevul vede un exemplu de intrare, ce era de așteptat și ce a afișat.', '**Consolidare:** „Unește perechile” (asociere cod ↔ rezultat), Sala de jocuri (robot, ordonare, greșeală, Blitz, completare) și provocările.', '**Diferențiere:** elevii avansați merg la provocări și la modulele de nivel liceu; elevii care au nevoie de sprijin repetă asocierile și jocurile pe niveluri ușoare.'])),
      sectiune('Module, greșeli frecvente și recomandări', null, tabel(['Modul', 'Lecții', 'Greșeli frecvente de urmărit'], MODULE_PY.map((m) => [`${m.emoji} **${m.titlu}**${m.liceu ? ' (nivel liceu)' : ''}`, m.lectii.map((l) => l.titlu).join('; '), (GRESELI_PY[m.id] || []).join(' ')]))),
      sectiune('Legătura cu PRIMM', null, tabel(['Etapa', 'În platformă'], [['Predict', 'Blitz: ce afișează?; întrebările de anticipare'], ['Run', 'Încearcă singur (exemplul executabil)'], ['Investigate', 'Unește perechile; tabelul de urmărire; Editorul Python cu depanare pas cu pas'], ['Modify', 'Completează codul; Găsește greșeala'], ['Make', 'Exercițiile, provocările, proiectele']])));
  }

  routes.push({ pattern: /^\/profesor\/indrumar$/, handler: async (m, params) => pagina(params.get('t') || 'principii') });
  window.Indrumar = { pagina };
})();

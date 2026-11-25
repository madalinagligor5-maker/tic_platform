'use strict';
// Profesorul creează conturi pentru elevi (pseudonim + PIN) și tipărește etichete cu
// codul clasei, pseudonimul și parola (PIN), de lipit pe caiet.
(() => {
  const { h, hooks } = window.EduApp;
  const C = window.EduConturi;
  if (!C) return;
  const { api, descarcaCSV } = C;

  function etichete(r) {
    return h('div', { class: 'et-foaie' }, r.conturi.map((c) => h('div', { class: 'et-card' },
      h('div', { class: 'et-site' }, 'edudigi.ro → Intră în cont → Elev'),
      h('div', { class: 'et-rand' }, h('span', {}, 'Clasa'), h('b', {}, r.cod)),
      h('div', { class: 'et-rand' }, h('span', {}, 'Pseudonim'), h('b', {}, c.pseudonim)),
      h('div', { class: 'et-rand' }, h('span', {}, 'Parola (PIN)'), h('b', { class: 'et-pin' }, c.pin)))));
  }

  (hooks.panouriClasa = hooks.panouriClasa || []).push((k, id) => {
    const rezultat = h('div', { class: 'et-rezultat' });
    const eroare = h('p', { class: 'error', role: 'alert' });
    const nr = h('input', { type: 'number', min: 1, max: 60, value: 25, 'aria-label': 'Număr de conturi' });
    const lista = h('textarea', { rows: 5, placeholder: 'Opțional: un pseudonim pe rând (ex. Ana M.). Dacă lași gol, se aleg singure, ca „Vulpe 17”.', 'aria-label': 'Pseudonime' });

    function arata(r) {
      eroare.textContent = '';
      const nota = r.omise.length ? h('p', { class: 'error' }, `Omise (pseudonim deja folosit în clasă): ${r.omise.join(', ')}`) : null;
      rezultat.replaceChildren(
        h('p', { class: 'muted' }, `${r.conturi.length} ${r.conturi.length === 1 ? 'cont' : 'conturi'}. PIN-urile se văd doar acum: tipărește etichetele sau descarcă lista înainte să închizi pagina.`),
        nota,
        h('div', { class: 'row-actions et-nu-print' },
          h('button', { class: 'btn', type: 'button', onclick: () => {
            document.body.classList.add('et-tipareste');
            window.print();
            setTimeout(() => document.body.classList.remove('et-tipareste'), 500);
          } }, '🖨️ Tipărește etichetele (sau salvează PDF)'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => descarcaCSV(`conturi_${k.clasa.nume.replace(/\W+/g, '_')}.csv`, [['Clasa (cod)', 'Pseudonim', 'Parola (PIN)'], ...r.conturi.map((c) => [r.cod, c.pseudonim, c.pin])]) }, '⬇ Lista (Excel)')),
        etichete(r));
      rezultat.scrollIntoView?.({ block: 'nearest' });
    }
    async function ruleaza(corp, cale) {
      eroare.textContent = '';
      try { arata(await api('POST', `/api/profesor/clase/${id}/${cale}`, corp)); } catch (ex) { eroare.textContent = ex.message; }
    }
    const btnGen = h('button', { class: 'btn', type: 'button', onclick: async () => {
      const nume = lista.value.split('\n').map((x) => x.trim()).filter(Boolean);
      btnGen.disabled = true;
      await ruleaza(nume.length ? { pseudonime: nume } : { nr: Number(nr.value) }, 'elevi-generare');
      btnGen.disabled = false;
    } }, 'Generează conturile');
    const btnPin = h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
      if (!confirm('Generezi PIN-uri noi pentru TOȚI elevii clasei? PIN-urile vechi nu vor mai funcționa, iar elevii conectați vor fi deconectați.')) return;
      await ruleaza({}, 'elevi-pin-nou');
    } }, 'PIN-uri noi pentru elevii existenți + etichete');

    return h('section', { class: 'card-box et-panou' },
      h('h2', {}, 'Conturi elevi și etichete pentru caiet'),
      h('p', { class: 'muted small' }, 'Creezi conturile dinainte, iar fiecare elev primește o etichetă cu codul clasei, pseudonimul și parola (PIN). Folosește pseudonime, nu numele complet. Pentru elevii deja înscriși, PIN-urile nu pot fi afișate (se păstrează doar criptat): poți genera PIN-uri noi și tipări etichetele.'),
      h('div', { class: 'et-form et-nu-print' },
        h('label', { class: 'field' }, h('span', {}, 'Câte conturi'), nr),
        h('label', { class: 'field' }, h('span', {}, 'Sau pseudonimele tale'), lista)),
      h('div', { class: 'row-actions et-nu-print' }, btnGen, btnPin),
      eroare, rezultat);
  });
})();

'use strict';
// Același format este validat la construire și afișat în browser.
(function (root) {
  const I = typeof module !== 'undefined' && module.exports ? require('./interactive') : root.EduInteractiv;
  function parse(text) {
    const steps = text.split(/\r?\n/).filter((s) => s.trim()).map((s) => s.split('|').map((v) => v.trim()));
    const errors = [];
    if (steps.length < 2 || steps.length > 6) errors.push('Explorarea trebuie să aibă între 2 și 6 pași.');
    if (steps.some((s) => s.length !== 3 || s.some((v) => !v))) errors.push('Fiecare pas: titlu | explicație | exemplu.');
    return { data: { steps }, errors };
  }
  I.register('explorare', {
    label: 'Explorează vizual', parse,
    render(block, inline, { frame, h }) {
      let current = 0;
      const seen = new Set([0]);
      const stage = h('div', { class: 'explore-stage', 'aria-live': 'polite', 'aria-atomic': 'true' });
      const counter = h('p', { class: 'explore-count' });
      let api;
      const buttons = block.data.steps.map((s, i) => h('button', {
        type: 'button', class: 'explore-step', onclick: () => select(i),
      }, h('span', { class: 'explore-number' }, String(i + 1).padStart(2, '0')), s[0]));
      const previous = h('button', { type: 'button', class: 'chip', onclick: () => select(current - 1) }, '← Înapoi');
      const next = h('button', { type: 'button', class: 'chip red', onclick: () => select(current + 1) }, 'Mai departe →');
      function select(index) {
        if (index < 0 || index >= buttons.length) return;
        current = index; seen.add(index);
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === current)));
        const s = block.data.steps[current];
        stage.replaceChildren(h('span', { class: 'explore-big', 'aria-hidden': 'true' }, String(current + 1).padStart(2, '0')),
          h('div', {}, h('h3', {}, s[0]), h('p', {}, s[1]), h('p', { class: 'explore-example' }, h('b', {}, 'În practică: '), s[2])));
        counter.textContent = `${seen.size} din ${buttons.length} idei explorate`;
        previous.disabled = current === 0;
        next.disabled = current === buttons.length - 1;
        if (api && seen.size === buttons.length) { api.status('Ai explorat toate ideile. Continuă cu exercițiile lecției.', 'ok'); api.solve(); }
      }
      api = frame(block, h('div', { class: 'act-body' },
        h('p', { class: 'muted' }, 'Alege o idee sau parcurge explicațiile pe rând.'),
        h('div', { class: 'explore-steps', role: 'group', 'aria-label': 'Idei de explorat' }, buttons), stage,
        h('div', { class: 'explore-controls' }, previous, counter, next)));
      select(0);
      return api.box;
    },
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { parse };
})(typeof window !== 'undefined' ? window : globalThis);

'use strict';
// Regenerează docs/Harta_Continut_TIC_Gimnaziu_V-VIII.md din content/curriculum.js
// și din docs/note-tehnice.md. Rulare: npm run harta
const fs = require('fs');
const path = require('path');
const { MAP } = require('../content/curriculum');

const root = path.join(__dirname, '..');
const lessonDir = path.join(root, 'content', 'lectii');
const hasContent = (id) => fs.existsSync(path.join(lessonDir, `${id}.md`));

const out = [];
out.push('# Harta conținutului – TIC, gimnaziu (clasele V–VIII)');
out.push('');
out.push('> Generat automat din `content/curriculum.js` cu `npm run harta`. Nu edita manual: modifică `curriculum.js` și regenerează.');
out.push('');
out.push('Bază: programa școlară pentru disciplina *Informatică și TIC*, clasele V–VIII (OMEN nr. 3393/2017). Buget: 1 oră/săptămână, 34 ore/an. Orele rămase după lecțiile de mai jos sunt rezervă pentru evaluări, recuperare și activități de proiect.');
out.push('');
out.push('**Structură:** Clasă → Unitate (domeniu de conținut din programă) → Modul → Lecție (1 lecție = 1 oră). ID-urile sunt stabile (`clasă.unitate.modul.lecție`) și sunt folosite de platformă și de promptul generator.');
out.push('');
out.push('**Legenda:** ✅ = lecția are conținut în `content/lectii/`; ⬜ = de generat.');
out.push('');

for (const g of Object.values(MAP)) {
  const total = g.unitati.reduce((a, u) => a + u.module.reduce((b, m) => b + m.lectii.length, 0), 0);
  out.push(`## ${g.titlu} (${total} lecții + ${34 - total} ore de rezervă)`);
  out.push('');
  for (const u of g.unitati) {
    const n = u.module.reduce((b, m) => b + m.lectii.length, 0);
    out.push(`### Unitatea ${u.id} – ${u.titlu} (${n} ore)`);
    out.push('');
    out.push('**Competențe specifice:**');
    for (const c of u.competente) out.push(`- ${c}`);
    out.push('');
    for (const m of u.module) {
      out.push(`**Modulul ${m.id} – ${m.titlu}**`);
      out.push('');
      for (const l of m.lectii) out.push(`- ${hasContent(l.id) ? '✅' : '⬜'} \`${l.id}\` ${l.titlu}`);
      out.push('');
    }
  }
}

out.push(fs.readFileSync(path.join(root, 'docs', 'note-tehnice.md'), 'utf8').trim());
out.push('');

fs.writeFileSync(path.join(root, 'docs', 'Harta_Continut_TIC_Gimnaziu_V-VIII.md'), out.join('\n'));
console.log('Harta a fost regenerată.');

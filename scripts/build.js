'use strict';
// Construiește datele site-ului din folderul materiale/:
//   materiale/<id>.md          un material (antet + conținut opțional)
//   materiale/fisiere/<fișier> atașamente (PDF, PPTX, DOCX, imagini...)
// Rezultat (generat, nu se urcă pe GitHub):
//   public/date/materiale.json  lista materialelor (fără conținut)
//   public/date/m/<id>.md       conținutul fiecărui material
//   public/fisiere/             copia atașamentelor
// Rulare: npm run build. La orice greșeală în antet, oprește construirea și spune ce e de corectat.
const fs = require('fs');
const path = require('path');

const DISCIPLINE = { informatica: 'Informatică', tic: 'TIC' };
const CATEGORII = { programare: 'Programare', tic: 'TIC', algoritmi: 'Algoritmi', aplicatii: 'Aplicații' };
const TIPURI = { lectie: 'Lecție', fisa: 'Fișă de lucru', test: 'Test', prezentare: 'Prezentare', proiect: 'Proiect', resursa: 'Resursă' };

function parseFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2].trim() };
}

// Acceptă și forme cu diacritice sau majuscule: „Informatică”, „Fișă de lucru”, „Lecție”.
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+de\s+lucru$/, '').trim();

function readMaterial(dir, file) {
  const id = file.replace(/\.md$/, '');
  const errors = [];
  const fm = parseFrontMatter(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (!fm) return { errors: [`${file}: lipsește antetul (blocul dintre liniile ---)`] };
  const { meta, body } = fm;
  const err = (msg) => errors.push(`${file}: ${msg}`);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) err('numele fișierului poate conține doar litere mici fără diacritice, cifre și cratime (ex. tic-5-internet.md)');
  if (!meta.titlu) err('lipsește „titlu”');
  const disciplina = norm(meta.disciplina);
  if (!DISCIPLINE[disciplina]) err(`„disciplina” trebuie să fie una din: ${Object.keys(DISCIPLINE).join(', ')}`);
  const clasa = (meta.clasa || '').split(/[,\s]+/).filter(Boolean).map(Number);
  if (!clasa.length || clasa.some((c) => !Number.isInteger(c) || c < 5 || c > 12)) err('„clasa” trebuie să fie între 5 și 12 (mai multe: 5, 6)');
  const categorie = norm(meta.categorie);
  if (!CATEGORII[categorie]) err(`„categorie” trebuie să fie una din: ${Object.keys(CATEGORII).join(', ')}`);
  const tip = norm(meta.tip);
  if (!TIPURI[tip]) err(`„tip” trebuie să fie unul din: ${Object.keys(TIPURI).join(', ')}`);
  if (meta.data && !/^\d{4}-\d{2}-\d{2}$/.test(meta.data)) err('„data” se scrie AAAA-LL-ZZ (ex. 2026-10-15)');

  let fisier = null;
  if (meta.fisier) {
    const rel = meta.fisier.replace(/^fisiere\//, '');
    const abs = path.join(dir, 'fisiere', rel);
    if (rel.includes('..') || !fs.existsSync(abs)) err(`atașamentul „${meta.fisier}” nu există în materiale/fisiere/`);
    else fisier = { url: `fisiere/${rel.split('/').map(encodeURIComponent).join('/')}`, nume: path.basename(rel), ext: path.extname(rel).slice(1).toLowerCase(), marime: fs.statSync(abs).size };
  }
  if (!body && !meta.fisier) err('materialul nu are nici conținut, nici atașament („fisier”)');

  return {
    errors,
    material: {
      id,
      titlu: meta.titlu,
      descriere: meta.descriere || '',
      disciplina,
      clasa: [...new Set(clasa)].sort((a, b) => a - b),
      categorie,
      tip,
      data: meta.data || '',
      fisier,
      areContinut: Boolean(body),
    },
    body,
  };
}

function build({ src, out }) {
  const files = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => f.endsWith('.md')).sort() : [];
  const errors = [];
  const materials = [];
  const bodies = {};
  for (const f of files) {
    const r = readMaterial(src, f);
    errors.push(...r.errors);
    if (!r.errors.length) materials.push(r.material), (bodies[r.material.id] = r.body);
  }
  if (errors.length) return { errors, materials: [] };

  materials.sort((a, b) => b.data.localeCompare(a.data) || a.titlu.localeCompare(b.titlu, 'ro'));
  const dateDir = path.join(out, 'date');
  const fisDir = path.join(out, 'fisiere');
  fs.rmSync(dateDir, { recursive: true, force: true });
  fs.rmSync(fisDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dateDir, 'm'), { recursive: true });
  fs.writeFileSync(path.join(dateDir, 'materiale.json'), JSON.stringify({ discipline: DISCIPLINE, categorii: CATEGORII, tipuri: TIPURI, materiale: materials }));
  for (const [id, body] of Object.entries(bodies)) if (body) fs.writeFileSync(path.join(dateDir, 'm', `${id}.md`), body);
  if (fs.existsSync(path.join(src, 'fisiere'))) fs.cpSync(path.join(src, 'fisiere'), fisDir, { recursive: true, filter: (p) => !path.basename(p).startsWith('.') });
  return { errors: [], materials };
}

module.exports = { build, parseFrontMatter };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const { errors, materials } = build({ src: path.join(root, 'materiale'), out: path.join(root, 'public') });
  if (errors.length) {
    console.error('Construirea a eșuat. De corectat:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`Gata: ${materials.length} materiale.`);
}

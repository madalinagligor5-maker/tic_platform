'use strict';
// Planșe originale SVG, în aceeași identitate cu imaginile existente.
// Rulare explicită, idempotentă: node scripts/generate-visuals.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const lessons = [
  ['tic-5-u1-l3-hardware', 'Cum circulă informația', [
    ['Intrare', 'Dispozitivele de intrare trimit date către calculator.', 'Tastatura trimite litera A.'],
    ['Prelucrare', 'Procesorul execută instrucțiuni folosind memoria de lucru.', 'Programul pregătește litera pentru afișare.'],
    ['Ieșire', 'Dispozitivele de ieșire prezintă rezultatul.', 'Monitorul afișează litera A.']]],
  ['tic-5-u1-l4-dispozitive-de-stocare', 'Unde păstrăm datele?', [
    ['SSD', 'Stocare rapidă, fără piese în mișcare.', 'Sistemul de operare și aplicațiile.'],
    ['Stick USB', 'Stocare portabilă, conectată prin USB.', 'Transporți o prezentare la școală.'],
    ['Copie de siguranță', 'Păstrezi încă o copie pe un mediu separat.', 'Salvezi proiectul și pe un disc extern.']]],
  ['tic-5-u2-l2-memorarea-organizarea-datelor', 'De la folder la fișier', [
    ['Folder', 'Grupează documente și alte foldere.', 'Școală → TIC → Proiecte.'],
    ['Nume', 'Un nume clar te ajută să regăsești fișierul.', 'proiect-energie-v2.pptx'],
    ['Extensie', 'Sugerează tipul fișierului și aplicația potrivită.', '.png pentru imagini; .docx pentru documente.']]],
  ['tic-5-u3-l3-motoare-de-cautare', 'O căutare mai bună', [
    ['Formulează', 'Alege cuvinte care descriu exact întrebarea.', 'reciclare plastic copii'],
    ['Compară', 'Consultă mai multe surse și verifică autorul.', 'Cine a publicat? Când? Cu ce dovezi?'],
    ['Folosește corect', 'Notează sursa și respectă drepturile de autor.', 'Menționezi autorul imaginii în proiect.']]],
  ['tic-5-u4-l2-operatii-grafica-2d', 'Construiește o imagine 2D', [
    ['Formă', 'Pornește de la forme geometrice simple.', 'Un cerc și două triunghiuri devin o pisică.'],
    ['Culoare', 'Folosește contrast pentru a evidenția subiectul.', 'Un personaj turcoaz pe un fundal deschis.'],
    ['Export', 'Salvează o copie în formatul potrivit.', 'PNG păstrează transparența, dacă imaginea o are.']]],
  ['info-5-u5-l1-notiunea-de-algoritm', 'Algoritmul unei dimineți', [
    ['Date inițiale', 'Identifică ce ai la început.', 'Ai ghiozdanul și orarul zilei.'],
    ['Pași preciși', 'Ordonează acțiuni clare și realizabile.', 'Citești orarul, alegi cărțile, le pui în ghiozdan.'],
    ['Rezultat', 'Verifică dacă ai atins scopul.', 'Ghiozdanul conține materialele pentru ziua respectivă.']]],
  ['info-5-u5-l3-algoritmi-bazati-pe-decizii', 'O condiție, două drumuri', [
    ['Întreabă', 'O condiție are valoarea adevărat sau fals.', 'Plouă afară?'],
    ['Dacă DA', 'Execută ramura pentru condiția adevărată.', 'Iei umbrela.'],
    ['Dacă NU', 'Execută alternativa, apoi continui algoritmul.', 'Pleci fără umbrelă.']]],
  ['info-5-u5-l4-date-constante-variabile', 'O variabilă își schimbă valoarea', [
    ['Inițializare', 'Variabila are un nume și o valoare.', 'punctaj ← 0'],
    ['Actualizare', 'O atribuire înlocuiește valoarea anterioară.', 'punctaj ← punctaj + 10'],
    ['Utilizare', 'Citești valoarea curentă când ai nevoie.', 'Acum afișezi 10, nu 0.']]],
  ['info-5-u6-l2-structura-liniara', 'Instrucțiuni una după alta', [
    ['Pornește', 'Evenimentul declanșează secvența în Scratch.', 'Când se apasă steagul verde.'],
    ['Execută', 'Blocurile se execută în ordinea așezării.', 'Mergi 10 pași, apoi rotește-te 15 grade.'],
    ['Observă', 'Schimbarea ordinii poate schimba rezultatul.', 'Compară rotirea înainte și după deplasare.']]],
  ['tic-6-u1-l4-design-prezentare', 'Un diapozitiv ușor de citit', [
    ['Ierarhie', 'Titlul anunță ideea principală.', 'Un titlu mare și câteva idei scurte.'],
    ['Contrast', 'Textul trebuie să se distingă de fundal.', 'Text închis pe un fundal luminos.'],
    ['Spațiu', 'Lasă loc între text și elementele vizuale.', 'O imagine relevantă, fără aglomerare.']]],
  ['tic-6-u2-l3-animatie-grafica', 'Cum apare mișcarea?', [
    ['Cadru inițial', 'Stabilește poziția de început a obiectului.', 'Mingea este în stânga scenei.'],
    ['Cadre intermediare', 'Schimbă poziția treptat, între cadre.', 'Mingea avansează puțin în fiecare cadru.'],
    ['Redare', 'Succesiunea cadrelor creează impresia de mișcare.', 'Compară o redare lentă cu una rapidă.']]],
  ['tic-6-u3-l1-siguranta-pe-internet', 'Oprește-te înainte de clic', [
    ['Observă', 'Mesajele urgente pot încerca să te păcălească.', 'Ai câștigat! Introdu parola acum.'],
    ['Verifică', 'Controlează expeditorul și adresa destinației.', 'Un nume familiar nu dovedește autenticitatea.'],
    ['Cere ajutor', 'Nu trimite parola; discută cu un adult de încredere.', 'Raportezi mesajul și îl ștergi.']]],
  ['tic-6-u3-l4-operatii-cu-mesaje', 'Trimite un mesaj clar', [
    ['Destinatar', 'Verifică adresa și persoanele din Cc.', 'Profesorul primește mesajul la adresa corectă.'],
    ['Conținut', 'Scrie un subiect precis și un mesaj politicos.', 'Subiect: Proiect TIC – clasa a VI-a.'],
    ['Atașament', 'Verifică fișierul înainte de trimitere.', 'Deschizi prezentarea atașată și verifici versiunea.']]],
  ['info-6-u4-l5-repetitiva-cu-contor', 'Urmărește contorul', [
    ['Start', 'Contorul primește valoarea inițială.', 'i ← 1'],
    ['Repetă', 'Execută corpul pentru fiecare valoare admisă.', 'Pentru i de la 1 la 3: afișează i.'],
    ['Stop', 'După ultima iterație, continui după buclă.', 'Rezultatul afișat este 1, 2, 3.']]],
  ['tic-7-u1-l4-editarea-documentului', 'Mută textul fără să îl rescrii', [
    ['Selectează', 'Marchează exact fragmentul pe care îl muți.', 'Selectezi un paragraf, fără titlul următor.'],
    ['Decupează', 'Comanda Decupare pregătește mutarea.', 'Ctrl + X'],
    ['Lipește', 'Poziționează cursorul și inserează fragmentul.', 'Ctrl + V la noua poziție.']]],
  ['tic-7-u1-l5-formatare-aspectul-paginii', 'De la text la document', [
    ['Caractere', 'Formatează literele pentru accent și lizibilitate.', 'Font, mărime, aldin.'],
    ['Paragrafe', 'Organizează ideile și distanțele dintre ele.', 'Aliniere, spațiere, liste.'],
    ['Pagină', 'Stabilește spațiul în care apare conținutul.', 'Margini, orientare, dimensiune.']]],
  ['tic-7-u2-l3-prelucrarea-sunetelor', 'Trei etape de editare audio', [
    ['Selectează', 'Ascultă și identifică intervalul de prelucrat.', 'Marchezi pauza de la început.'],
    ['Prelucrează', 'Aplică operația doar pe selecția potrivită.', 'Elimini pauza sau reglezi volumul.'],
    ['Exportă', 'Păstrează proiectul și exportă o copie audio.', 'Un fișier WAV sau MP3 pentru ascultare.']]],
  ['tic-7-u3-l1-aplicatii-colaborative', 'Lucrăm împreună în siguranță', [
    ['Partajează', 'Acordă doar permisiunile necesare.', 'Cititor pentru consultare; editor pentru lucru.'],
    ['Colaborează', 'Folosește comentarii pentru feedback clar.', 'Indici paragraful și propui o corectură.'],
    ['Verifică', 'Consultă istoricul pentru a urmări modificările.', 'Identifici o versiune anterioară utilă.']]],
  ['info-7-u4-l6-repetitiva-while', 'Bucla while verifică înainte', [
    ['Condiție', 'Verificarea are loc înainte de corpul buclei.', 'Cât timp n > 0.'],
    ['Corp', 'Dacă este adevărată, se execută instrucțiunile.', 'Afișezi n, apoi scazi 1 din n.'],
    ['Revenire', 'Verifici din nou; o condiție falsă oprește bucla.', 'Pentru n = 3 afișezi 3, 2, 1.']]],
  ['tic-8-u1-l4-formatare-tipuri-date-formule', 'Din celule în rezultat', [
    ['Date', 'Introdu valori numerice în celule.', 'A1 conține 12; B1 conține 8.'],
    ['Formulă', 'O formulă începe cu semnul egal.', 'În C1 scrii =A1+B1.'],
    ['Recalculare', 'Rezultatul se actualizează când datele se schimbă.', 'C1 este 20; dacă A1 devine 15, C1 este 23.']]],
  ['tic-8-u1-l6-diagrame', 'Alege reprezentarea potrivită', [
    ['Coloane', 'Compară valori din categorii diferite.', 'Numărul de cărți citite de fiecare clasă.'],
    ['Linii', 'Urmărește evoluția în timp.', 'Temperatura măsurată în fiecare zi.'],
    ['Sectoare', 'Arată părți din același întreg.', 'Repartizarea bugetului; totalul reprezintă 100%.']]],
  ['tic-8-u2-l5-html-corp-paragrafe-imagini', 'Trei elemente dintr-o pagină', [
    ['Titlu', 'Un titlu descrie secțiunea paginii.', '<h1>Clubul de lectură</h1>'],
    ['Paragraf', 'Un paragraf grupează textul unei idei.', '<p>Ne întâlnim în fiecare joi.</p>'],
    ['Imagine', 'Imaginea are o sursă și o descriere alternativă.', '<img src="carti.png" alt="Trei cărți deschise">']]],
  ['info-8-u3-l11-siruri-cautare', 'Caută un element pas cu pas', [
    ['Țintă', 'Stabilește valoarea căutată în șir.', 'Cauți 7 în șirul [4, 7, 2].'],
    ['Compară', 'Parcurge șirul și compară elementul curent.', '4 ≠ 7; apoi 7 = 7.'],
    ['Raportează', 'Precizează convenția de numerotare a pozițiilor.', 'De la 0: indicele 1; de la 1: poziția 2.']]],
  ['info-8-u3-l12-siruri-minim-maxim', 'Găsește maximul din șir', [
    ['Inițializează', 'Pornește cu primul element, pentru un șir nevid.', 'În [4, 9, 2], maximul inițial este 4.'],
    ['Compară', 'Înlocuiește maximul doar cu o valoare mai mare.', '9 > 4, deci maximul devine 9.'],
    ['Finalizează', 'După parcurgere ai maximul tuturor elementelor.', '2 < 9; rezultatul rămâne 9.']]],
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function lines(text, width = 29) {
  const out = []; let line = '';
  for (const word of text.split(' ')) { if ((line + ' ' + word).trim().length > width && line) { out.push(line); line = word; } else line += (line ? ' ' : '') + word; }
  if (line) out.push(line); return out;
}
function label(text, x, y, size, color, width, weight = 400) {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${lines(text, width).map((s, i) => `<tspan x="${x}" dy="${i ? size * 1.4 : 0}">${esc(s)}</tspan>`).join('')}</text>`;
}
function svg(title, steps, number) {
  const colors = ['#C8133A', '#0E7F96', '#0B6F68'];
  const fills = ['#FDE7EC', '#E2F6FA', '#E0F4F2'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 640" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(steps.map((s) => s.join('. ')).join(' '))}</desc><rect width="1080" height="640" rx="24" fill="#FFF7EE"/><g font-family="Arial, sans-serif"><text x="42" y="42" fill="#6B6460" font-size="14" letter-spacing="3">EDUDIGI / ATLAS VIZUAL / ${String(number).padStart(2, '0')}</text>${label(title, 42, 89, 32, '#171416', 50, 700)}<path d="M42 120H1038" stroke="#E8DFD3"/>${steps.map((s, i) => {
    const x = 42 + i * 340;
    return `<rect x="${x}" y="150" width="316" height="438" rx="18" fill="${fills[i]}"/><circle cx="${x + 48}" cy="202" r="25" fill="${colors[i]}"/><text x="${x + 48}" y="210" text-anchor="middle" fill="white" font-size="23" font-weight="700">${i + 1}</text>${i < 2 ? `<path d="M${x + 284} 202h42m-8-7 8 7-8 7" stroke="${colors[i]}" stroke-width="2" fill="none"/>` : ''}${label(s[0], x + 24, 270, 25, colors[i], 20, 700)}${label(s[1], x + 24, 337, 21, '#171416', 25)}<path d="M${x + 24} 438h268" stroke="${colors[i]}" opacity=".3"/><text x="${x + 24}" y="466" font-size="13" fill="${colors[i]}" letter-spacing="2">ÎN PRACTICĂ</text>${label(s[2], x + 24, 498, 19, '#171416', 27)}`;
  }).join('')}<text x="42" y="620" fill="#6B6460" font-size="14">Observă. Înțelege. Aplică.</text></g></svg>`;
}
for (const [index, [id, title, steps]] of lessons.entries()) {
  const name = `${id}-atlas.svg`;
  fs.writeFileSync(path.join(root, 'materiale/fisiere/imagini', name), svg(title, steps, index + 1));
  const file = path.join(root, 'materiale', `${id}.md`);
  let source = fs.readFileSync(file, 'utf8');
  const start = '<!-- atlas-vizual:start -->', end = '<!-- atlas-vizual:end -->';
  const block = `${start}\n## Explorează vizual: ${title}\n\n![${title}: ${steps.map((s) => s[0].toLowerCase()).join(', ')}.](fisiere/imagini/${name})\n\n\`\`\`explorare\n# ${title}\n${steps.map((s) => s.join(' | ')).join('\n')}\n\`\`\`\n${end}\n\n`;
  if (source.includes(start)) source = source.slice(0, source.indexOf(start)) + block + source.slice(source.indexOf(end) + end.length).trimStart();
  else {
    const point = source.search(/^## /m);
    if (point < 0) throw new Error(`Lipsește secțiunea în ${id}`);
    source = source.slice(0, point) + block + source.slice(point);
  }
  fs.writeFileSync(file, source);
}
console.log(`${lessons.length} planșe și explorări actualizate.`);

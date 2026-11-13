'use strict';
// Pagini statice care aduc trafic organic, generate la build (vezi scripts/seo.js):
//   /aplicatii/            lista aplicațiilor din browser, câte o pagină pentru fiecare (/aplicatii/<id>.html)
//   /glosar/               glosar de informatică și TIC, cu o pagină pe termen (/glosar/<termen>.html), din cartonașele lecțiilor
//   /resurse/              planificări, fișe de lucru și bareme descărcabile
//   /pentru-profesori.html funcțiile pentru profesori
//   /intrebari-frecvente.html
const fs = require('fs');
const path = require('path');
const { extract } = require('../public/js/interactive');

const SITE_NUME = 'edudigi';
const CTA_COMUN = [
  ['Este gratuită?', 'Da. Aplicația și toate lecțiile sunt gratuite, fără reclame și fără cont. Contul de elev sau de profesor este opțional și folosește doar pentru salvarea progresului și pentru sarcini.'],
  ['Trebuie să instalez ceva?', 'Nu. Aplicația rulează direct în browser (Chrome, Edge, Firefox, Safari), deci merge și pe Chromebook, unde programele clasice de pe calculator nu se pot instala.'],
  ['Unde se salvează lucrările?', 'În browserul calculatorului pe care lucrezi. Pentru a nu le pierde, elevul le predă la sarcina primită de la profesor sau le descarcă pe calculator.'],
];

// Aplicațiile: textele paginilor de prezentare. „lectii” sunt id-uri de materiale legate din pagină.
const APLICATII = [
  {
    id: 'blocuri', ruta: '#/aplicatii/blocuri', nume: 'Programare cu blocuri', clase: [5, 6], inlocuieste: 'Scratch și Blockly',
    titlu: 'Programare cu blocuri online, în română – ca Scratch, cu blocuri proprii',
    desc: 'Editor de programare cu blocuri în română, ca Scratch 3 și Blockly: blocuri gata făcute, scenă cu personaje, creion, blocuri create de elev, cod în pseudocod și Python. Gratuit, pentru clasele V–VI.',
    intro: 'Programare cu blocuri este un editor în stil Scratch, făcut pentru ora de informatică: elevii trag blocuri colorate, le îmbină și vor vedea imediat cum se mișcă personajele pe scenă. La început folosesc blocurile gata făcute, apoi își creează propriile blocuri.',
    ce: ['Blocuri pe categorii, cu aceleași culori ca în Scratch: Mișcare, Aspect, Sunet, Evenimente, Control, Detectare, Operatori, Variabile și Creion.', 'Scenă de 480×360 cu personaje cu costume, decoruri și sunete; mai multe scripturi rulează în paralel, ca în Scratch.', '„Blocurile mele”: butonul „Creează un bloc” îi lasă pe elevi să-și definească propriile blocuri, cu intrări (de exemplu „desenează pătrat (latura)”).', 'Panoul „Cod” arată programul ca pseudocod în română și ca Python, ca elevii să facă trecerea de la blocuri la text.', 'Exemple din lecții (plimbarea pisicii, labirint, „Prinde mărul”, desen cu creionul) și provocări verificate automat.', 'Proiectele se salvează în browser și se pot preda profesorului la o sarcină.'],
    pasi: ['Deschide aplicația și alege un exemplu sau pornește de la un proiect gol.', 'Trage blocuri din paletă în zona de scripturi și îmbină-le unul sub altul.', 'Apasă steagul verde ca să rulezi programul.', 'Creează-ți un bloc propriu din „Blocurile mele” și folosește-l de mai multe ori.', 'Deschide panoul „Cod” ca să vezi programul în pseudocod și în Python.'],
    faq: [['Este același lucru cu Scratch?', 'Este un editor în stil Scratch, cu aceleași culori de categorii și forme de blocuri, dar în limba română și făcut special pentru lecțiile de pe edudigi. Nu necesită cont și nu este legat de site-ul Scratch.'], ['Pot elevii să-și facă propriile blocuri?', 'Da. În categoria „Blocurile mele” există butonul „Creează un bloc”, unde elevul alege numele, adaugă intrări (număr, text sau condiție) și definește ce face blocul.'], ['Se poate vedea programul ca text?', 'Da, din butonul „Cod”: programul apare ca pseudocod în română și ca Python, doar pentru citire și copiere.'], ['Pentru ce clase este potrivită?', 'Pentru clasele V–VI, la lecțiile despre algoritmi, structura liniară, alternativă și repetitivă.']],
    lectii: ['info-5-u6-l1-scratch-interfata', 'info-5-u6-l2-structura-liniara', 'info-5-u7-l1-joc-digital-scratch', 'info-6-u4-l3-repetitiva-conditionata-anterior', 'info-6-u4-l5-repetitiva-cu-contor'],
  },
  {
    id: 'python', ruta: '#/aplicatii/python', nume: 'Editor Python', clase: [7, 8], inlocuieste: 'Thonny și IDLE',
    titlu: 'Editor Python online în română pentru elevi – ca Thonny, cu turtle',
    desc: 'Scrie și rulează programe Python direct în browser, fără instalare: Shell interactiv, variabile, rulare pas cu pas, desen cu turtle și erori explicate în română. Pentru clasele VII–VIII.',
    intro: 'Editor Python este un mediu de programare în stil Thonny care rulează în browser. Elevii scriu programul, îl rulează cu F5 și văd rezultatul în Shell, iar erorile sunt explicate în română, pe înțelesul lor.',
    ce: ['Shell interactiv cu „>>>”, unde se pot încerca expresii și comenzi rând cu rând.', 'Panou „Variabile” care arată valorile după rulare și în timpul rulării pas cu pas.', 'Rulare pas cu pas (F6, F7), cu rândul curent evidențiat, pentru a înțelege cum merge un algoritm.', 'Modulul turtle, cu desen animat: pătrate, stele, spirale colorate.', 'Mesaje de eroare în română, de exemplu pentru indentare sau nume necunoscute.', 'Programele din lecțiile de informatică de la clasele VII–VIII, scrise în Python, rulează cu același rezultat ca în Python-ul oficial.'],
    pasi: ['Deschide aplicația și scrie programul în editor (sau alege un exemplu din „Exemple”).', 'Apasă butonul verde sau F5 ca să rulezi programul.', 'Dacă programul cere date, scrie-le direct în Shell.', 'Folosește rularea pas cu pas ca să urmărești valorile variabilelor.', 'Descarcă programul ca fișier .py sau predă-l profesorului la o sarcină.'],
    faq: [['Se poate rula Python pe Chromebook?', 'Da. Editorul rulează în browser, deci nu trebuie instalat nimic. Este un interpretor scris pentru limbajul predat la gimnaziu.'], ['Ce acoperă interpretorul?', 'Tipurile int, float, str, bool, list, tuple și dict, instrucțiunile if, while și for, funcțiile, f-string-urile, input și print, modulele math, random și turtle. Programele din lecțiile claselor VII–VIII au fost verificate și dau aceeași ieșire ca Python-ul oficial.'], ['Pot folosi biblioteci ca numpy sau pygame?', 'Nu. Editorul acoperă materia de gimnaziu; bibliotecile externe nu sunt disponibile.'], ['Cum se potrivește cu C++ din manual?', 'Fiecare lecție de informatică din clasele VII–VIII are o secțiune „Același program în Python”, cu programul din lecție în Python și un tabel de comparație C++ ↔ Python.']],
    lectii: ['info-7-u4-l3-structura-liniara', 'info-7-u4-l4-structura-alternativa-if', 'info-7-u4-l8-repetitiva-for', 'info-8-u3-l7-siruri-citire-parcurgere', 'info-8-u3-l13-siruri-suma-produs'],
  },
  {
    id: 'cpp', ruta: '#/aplicatii/cpp', nume: 'Editor C++', clase: [7, 8], inlocuieste: 'Code::Blocks',
    titlu: 'Editor C++ online în română – compilează și rulează în browser, ca Code::Blocks',
    desc: 'Scrie și rulează programe C++ direct în browser, cu aspect de Code::Blocks: meniuri, Build log, consolă, depanare pas cu pas și mesaje de eroare în română. Gratuit, pentru clasele VII–VIII.',
    intro: 'Editor C++ arată și se comportă ca Code::Blocks, programul din manualele de gimnaziu, dar rulează în browser. E util mai ales pe Chromebook, unde nu se poate instala un compilator.',
    ce: ['Meniuri, bare de instrumente și arborele proiectului ca în Code::Blocks (File, Edit, Build, Debug), cu F9 pentru „Build and run”.', 'Fereastră de consolă separată, ca în Windows, cu „Process returned 0” la final și citire interactivă de la tastatură.', 'Build log și Build messages, cu erori de compilare în română și salt direct la rândul greșit.', 'Depanare pas cu pas (F7), puncte de oprire și fereastra „Watches” cu valorile variabilelor și ale tablourilor.', 'Completare automată și formatare automată a codului.', 'Interpretor verificat pe 71 de programe din lecții: ieșirea este identică cu a unui compilator real (g++).'],
    pasi: ['Deschide aplicația: apare un proiect cu „Hello world”.', 'Scrie programul în editor.', 'Apasă F9 (Build and run): consola se deschide și programul rulează.', 'Dacă apare o eroare, apasă pe rând în „Build messages” ca să ajungi la ea.', 'Pune un punct de oprire și apasă F7 ca să urmărești programul pas cu pas.'],
    faq: [['Este un compilator adevărat?', 'Este un interpretor scris pentru subsetul de C++ de gimnaziu. Rezultatele programelor din lecții sunt identice cu cele date de compilatorul g++.'], ['Ce nu merge?', 'Nu sunt disponibile string, vector, structuri, pointeri și fișiere. Dacă un elev le folosește, primește un mesaj clar în română.'], ['Pot depana programele?', 'Da: puncte de oprire, pas cu pas (F7), fereastra Watches și stiva de apeluri, ca în Code::Blocks.'], ['Pentru ce clase?', 'Pentru clasele VII–VIII, la lecțiile despre structuri liniare, alternative și repetitive și despre șiruri de valori.']],
    lectii: ['info-7-u4-l1-mediul-codeblocks', 'info-7-u4-l2-cpp-elemente-de-baza', 'info-7-u4-l6-repetitiva-while', 'info-7-u4-l8-repetitiva-for', 'info-8-u3-l9-siruri-numarare'],
  },
  {
    id: 'html', ruta: '#/aplicatii/html', nume: 'Editor de pagini web', clase: [8], inlocuieste: 'Notepad și browserul',
    titlu: 'Editor HTML online pentru elevi – cod și pagină web una lângă alta',
    desc: 'Scrie cod HTML și vezi pagina pe loc: mai multe pagini, imagini, șabloane, sfaturi în română când greșești o etichetă, export .zip. Gratuit, pentru clasa a VIII-a.',
    intro: 'Editorul de pagini web arată codul HTML în stânga și pagina în dreapta, așa că elevul vede imediat ce face fiecare etichetă. E gândit pentru lecțiile despre corpul paginii, paragrafe, imagini și formatări.',
    ce: ['Cod cu numere de rând și colorare de sintaxă, cu închiderea automată a etichetelor.', 'Previzualizare care se actualizează pe loc, pe calculator sau în mod telefon.', 'Mai multe pagini într-un proiect, cu linkuri între ele, și imagini încărcate de elev.', 'Șabloane: pagină goală, „Despre mine”, „Orașul meu”, „Animalul preferat”.', 'Sfaturi în română: etichetă neînchisă, imagine fără text alternativ, lipsă <title>.', 'Export al paginii (.html) sau al întregului proiect (.zip).'],
    pasi: ['Alege un șablon sau o pagină goală.', 'Scrie sau modifică eticheta în editor: pagina din dreapta se schimbă pe loc.', 'Adaugă o imagine din „Imagini” și scrie-o în pagină cu <img>.', 'Citește sfaturile când apare un semn de atenție.', 'Descarcă proiectul .zip sau predă-l profesorului.'],
    faq: [['Se pot scrie și scripturi?', 'Nu. Previzualizarea este sigură: scripturile și resursele externe sunt eliminate, iar elevii lucrează cu HTML și stiluri de bază.'], ['Pot publica pagina pe internet?', 'Editorul exportă fișierele; publicarea unui site se învață la lecțiile despre Google Sites.'], ['Pentru ce clasă?', 'Pentru clasa a VIII-a, unitatea „Pagini web”.']],
    lectii: ['tic-8-u2-l1-pagini-web-structura', 'tic-8-u2-l3-creare-publicare-pagina', 'tic-8-u2-l5-html-corp-paragrafe-imagini'],
  },
  {
    id: 'desen', ruta: '#/aplicatii/desen', nume: 'Desen', clase: [5, 6], inlocuieste: 'Paint',
    titlu: 'Desen online – editor grafic gratuit ca Paint, în română (clasa a V-a)',
    desc: 'Editor grafic ca Paint din Windows, în browser: creion, pensule, forme editabile, umplere, text, selecție, rotire și răsturnare, straturi. Gratuit, pentru clasa a V-a, merge și pe Chromebook.',
    intro: 'Desen este un editor grafic în stil Paint, cu panglica și denumirile din manual, pentru elevii care nu au Paint pe calculator. Se poate folosi cu mouse-ul, cu touchpadul sau cu degetul.',
    ce: ['Panglică cu grupurile Clipboard, Imagine, Instrumente, Pensule, Forme, Dimensiune și Culori, cu aspect clasic sau Windows 11.', 'Creion, 9 pensule, radieră, umplere cu culoare, pipetă, lupă și text.', 'Forme care rămân editabile până dai clic în afara lor, cu contur și umplere.', 'Selecție dreptunghiulară sau liberă, transparentă, cu mutare, copiere, rotire și răsturnare.', 'Ferestre ca în Windows: Redimensionare și înclinare, Proprietăți, Editare culori.', 'Salvare în browser sau ca PNG, JPEG, BMP sau GIF.'],
    pasi: ['Alege un instrument din grupul „Instrumente” sau o formă din „Forme”.', 'Alege Culoarea 1 pentru contur și Culoarea 2 pentru umplere.', 'Desenează pe pânză; folosește Anulare dacă greșești.', 'Selectează o parte din desen și rotește-o sau răstoarn-o.', 'Salvează desenul sau predă-l profesorului.'],
    faq: [['Seamănă cu Paint?', 'Da, are aceeași structură și aceleași denumiri ca în manual, deci elevii pot trece ușor la Paint-ul de pe calculator.'], ['Merge pe tabletă sau pe ecran tactil?', 'Da. Un deget desenează, iar două degete măresc și mută pânza.'], ['Ce formate poate salva?', 'PNG, JPEG, BMP și GIF.']],
    lectii: ['tic-5-u4-l1-editor-grafic-interfata', 'tic-5-u4-l2-operatii-grafica-2d', 'tic-5-u4-proiect-mascota-clasei'],
  },
  {
    id: 'animatie', ruta: '#/aplicatii/animatie', nume: 'Studio de animație', clase: [6], inlocuieste: 'Paint 3D și Toontastic',
    titlu: 'Studio de animație online pentru elevi – cadru cu cadru și povești cu personaje',
    desc: 'Fă animații în browser: cadru cu cadru, cu foaie de ceapă, sau povești cu personaje, decoruri, efecte, temporizare și cronologie. Export GIF și video. Gratuit, pentru clasa a VI-a.',
    intro: 'Studio de animație are două moduri: animație cadru cu cadru, ca un flipbook, și povești cu personaje și decoruri, în stilul aplicației Toontastic. Aici se învață scenariul, cadrele, FPS-ul și temporizarea efectelor din lecțiile clasei a VI-a.',
    ce: ['Cadru cu cadru: desen, bandă de cadre, foaie de ceapă (cadrul anterior în transparență), FPS de la 1 la 24.', 'Povești cu 9 decoruri și 15 personaje, în scene după șabloanele Toontastic (început, mijloc, sfârșit).', 'Efecte de intrare, mișcare pe un traseu tras cu mouse-ul, transformare, ieșire și sunet.', 'Temporizare: Start (La clic, Cu anteriorul, După anteriorul), durată, întârziere, cronologie cu bare.', 'Înregistrare de voce, verificarea automată a animației și testare pas cu pas.', 'Export GIF, video WebM și PNG.'],
    pasi: ['Alege modul „Cadru cu cadru” sau „Personaje și cronologie”.', 'Desenează cadrele sau pune personaje pe scenă.', 'Adaugă efecte și reglează Start, durata și întârzierea.', 'Apasă Redare ca să vezi animația.', 'Descarcă GIF-ul sau videoclipul, sau predă animația profesorului.'],
    faq: [['Ce este foaia de ceapă?', 'Este afișarea cadrului anterior în transparență, ca elevul să știe unde să deseneze cadrul următor.'], ['Se poate descărca animația?', 'Da, ca GIF animat sau ca video WebM; cadrele se pot salva și ca PNG.'], ['Poate fi folosită fără microfon?', 'Da. Vocea este opțională.']],
    lectii: ['tic-6-u2-l3-animatie-grafica', 'tic-6-u2-l4-aplicatii-vr-cospaces'],
  },
  {
    id: 'posta', ruta: '#/aplicatii/posta', nume: 'Poștă electronică (simulator)', clase: [6], inlocuieste: 'Gmail și Outlook',
    titlu: 'Simulator de e-mail pentru elevi – Gmail fictiv, sigur, cu phishing de recunoscut',
    desc: 'Simulator de poștă electronică în română, ca Gmail sau Outlook: Către, CC, CCI, răspuns, redirecționare, atașamente, spam și mesaje de phishing. Elevii nu au nevoie de cont real. Pentru clasa a VI-a.',
    intro: 'Elevii de gimnaziu nu au (și nu trebuie să aibă, sub 16 ani) un cont Google propriu. Simulatorul le dă o căsuță de e-mail fictivă, cu mesaje pregătite și cu pericole de recunoscut, ca să exerseze în siguranță tot ce se învață la lecțiile despre poșta electronică.',
    ce: ['Interfață ca Gmail, cu opțiune de aspect Outlook: dosare, categorii, conversații grupate, fereastra „Mesaj nou”.', 'Către, CC și CCI, Răspunde, Răspunde tuturor, Redirecționează, atașamente și „Anulează trimiterea”.', 'Mesaje pregătite de la profesoară, dirigintă și bunică, plus trei mesaje de phishing de recunoscut și de raportat.', 'Răspunsuri automate și mesaje noi care sosesc pe parcurs, ca într-o căsuță reală.', '12 misiuni care se bifează singure (răspuns cu atașament, CCI, raportare phishing, etichetă, arhivare).', 'Nimic nu pleacă pe internet: toate mesajele rămân în browser.'],
    pasi: ['Alege-ți o adresă fictivă la prima pornire.', 'Citește mesajele primite și răspunde-le.', 'Compune un mesaj cu Către, CC și CCI și atașează un fișier.', 'Raportează mesajele care par phishing.', 'Urmărește misiunile și predă profesorului mesajele trimise.'],
    faq: [['Trimite mesaje reale?', 'Nu. Este un simulator: mesajele rămân în browser și nu pleacă nicăieri.'], ['Care este vârsta minimă pentru un cont Google?', 'În România, 16 ani pentru un cont Google personal; de aceea simulatorul e util la clasa a VI-a.'], ['Ce învață elevii despre phishing?', 'Să verifice adresa expeditorului, să nu deschidă atașamente suspecte (de exemplu .exe) și să raporteze mesajele periculoase.']],
    lectii: ['tic-6-u3-l1-siguranta-pe-internet', 'tic-6-u3-l2-posta-electronica', 'tic-6-u3-l3-outlook-gmail-interfata', 'tic-6-u3-l4-operatii-cu-mesaje', 'tic-6-u3-l5-reguli-comunicare-online'],
  },
  {
    id: 'audio', ruta: '#/aplicatii/audio', nume: 'Editor audio', clase: [7], inlocuieste: 'WavePad și Audacity',
    titlu: 'Editor audio online gratuit – ca WavePad, cu multipistă și export MP3',
    desc: 'Înregistrează și editează sunet în browser: formă de undă, tăiere și lipire, efecte, mixare, multipistă și export MP3, WAV și WebM. Gratuit, în română, pentru clasa a VII-a.',
    intro: 'Editorul audio reproduce aspectul programului WavePad din manual și adaugă multipista din Audacity. Elevii înregistrează sau încarcă un sunet, îl taie, îl combină cu alte surse și îl exportă.',
    ce: ['Înregistrare de la microfon, cu contoare de nivel în timp real.', 'Formă de undă cu selecție, zoom și spectrogramă; tăiere, copiere, lipire, lipire combinată și ștergere.', 'Efecte cu previzualizare: amplificare, normalizare, estompare, ecou, reverberație, egalizator, reducerea zgomotului, schimbare de ton și de tempo.', 'Multipistă: piste cu Mute, Solo, volum și balans, clipuri mutate prin tragere.', 'Marcaje și regiuni cu nume, istoric vizibil al modificărilor.', 'Export în MP3, WAV și WebM.'],
    pasi: ['Înregistrează un sunet sau deschide un fișier audio.', 'Selectează o porțiune cu mouse-ul și aplică o comandă (de exemplu Decupare).', 'Aplică un efect și ascult-o cu „Previzualizare”.', 'Adaugă muzică de fundal pe o pistă separată în Multipistă.', 'Exportă fișierul în MP3 sau predă-l profesorului.'],
    faq: [['Este nevoie de microfon?', 'Doar pentru înregistrare. Se poate lucra și cu fișiere audio încărcate sau cu sunete generate (ton, zgomot, liniște).'], ['Ce formate de export are?', 'MP3, WAV și WebM.'], ['Este la fel ca WavePad?', 'Are aceeași structură de file și aceleași comenzi ca în manual, deci elevii pot trece ușor la WavePad.']],
    lectii: ['tic-7-u2-l1-aplicatii-audio-video', 'tic-7-u2-l2-wavepad-interfata', 'tic-7-u2-l3-prelucrarea-sunetelor'],
  },
  {
    id: 'text', ruta: '#/laborator/text', nume: 'Document', clase: [5, 6, 7, 8], inlocuieste: 'Microsoft Word',
    titlu: 'Procesor de text online gratuit – ca Word, în română, cu export .docx',
    desc: 'Procesor de text în browser: formatare de caractere și paragrafe, liste, tabele, imagini, aspectul paginii și export .docx pentru Word. Gratuit, în română, pentru clasele V–VIII.',
    intro: 'Documentul este un procesor de text în stil Word, cu filele Fișier, Pornire, Inserare și Aspect. Elevii exersează tehnoredactarea fără să aibă Word instalat, iar documentele se descarcă și se deschid în Word.',
    ce: ['Formatare de caractere (aldin, cursiv, subliniat, font, mărime, culoare) și de paragrafe (aliniere, liste, spațiere).', 'Stiluri de titlu, tabele, imagini și forme.', 'Șabloane: invitație, scrisoare, referat, afiș, orar.', 'Salvare în browser și descărcare ca .docx sau .html.', 'Exerciții cu verificare automată direct în lecții (formatează textul după cerințe).'],
    pasi: ['Alege un document gol sau un șablon.', 'Scrie textul, apoi selectează-l și formatează-l din fila Pornire.', 'Inserează o imagine sau un tabel din fila Inserare.', 'Descarcă documentul ca .docx.'],
    faq: [['Se poate deschide documentul în Word?', 'Da, se exportă ca .docx real.'], ['Pot importa documente Word?', 'Da, fișierele .docx și .html se pot deschide pentru editare.'], ['Pentru ce clase?', 'Pentru toate clasele V–VIII; lecțiile despre Word sunt la clasa a VII-a.']],
    lectii: ['tic-7-u1-l2-word-interfata', 'tic-7-u1-l4-editarea-documentului', 'tic-7-u1-l5-formatare-aspectul-paginii'],
  },
  {
    id: 'tabel', ruta: '#/laborator/tabel', nume: 'Registru de calcul', clase: [8], inlocuieste: 'Microsoft Excel',
    titlu: 'Foaie de calcul online gratuită – ca Excel, cu formule și diagrame (.xlsx)',
    desc: 'Foaie de calcul în browser: formule, funcții (SUM, AVERAGE, IF), sortare, formatare, diagrame și export .xlsx pentru Excel. Gratuit, în română, pentru clasa a VIII-a.',
    intro: 'Registrul de calcul este o foaie de calcul în stil Excel, cu celule, formule și diagrame, pentru lecțiile de calcul tabelar. Elevii scriu formule, le copiază pe rânduri, sortează datele și fac diagrame.',
    ce: ['Celule, zone și adrese (A1, B2:B6), formule cu operatori aritmetici și funcții precum SUM, AVERAGE, MIN, MAX, COUNT și IF.', 'Copiere de formule cu adrese relative și absolute ($B$1).', 'Formatare (aldin, culori, zecimale, procent, lei) și sortare crescătoare sau descrescătoare.', 'Diagrame: coloane, bare, linii și structură circulară.', 'Șabloane: listă de cumpărături, catalog cu note, buget, temperaturi.', 'Salvare în browser și export .xlsx sau CSV.'],
    pasi: ['Alege un registru gol sau un șablon.', 'Scrie datele și o formulă care începe cu „=”.', 'Copiază formula pe celelalte rânduri.', 'Sortează datele și formatează tabelul.', 'Inserează o diagramă și descarcă fișierul .xlsx.'],
    faq: [['Funcționează ca Excel?', 'Are formulele, funcțiile și diagramele predate la gimnaziu, cu aceleași denumiri; fișierele se exportă ca .xlsx.'], ['Pot importa un fișier Excel?', 'Da, fișierele .xlsx și CSV se pot deschide.'], ['Pentru ce clasă?', 'Pentru clasa a VIII-a, unitatea „Calcul tabelar”.']],
    lectii: ['tic-8-u1-l2-excel-interfata', 'tic-8-u1-l4-formatare-tipuri-date-formule', 'tic-8-u1-l5-calcule-functii', 'tic-8-u1-l6-diagrame'],
  },
  {
    id: 'atelier', ruta: '#/atelier', nume: 'Prezentare', clase: [6, 7, 8], inlocuieste: 'Microsoft PowerPoint',
    titlu: 'Atelier de prezentări online – ca PowerPoint, gratuit, pentru elevi',
    desc: 'Fă prezentări în browser: diapozitive cu teme, imagini, forme, tranziții și animații, expunere pe tot ecranul, salvate în contul elevului. Gratuit, în română, pentru clasele VI–VIII.',
    intro: 'Atelierul de prezentări reproduce structura PowerPoint: file, diapozitive, teme, imagini și forme. Prezentările elevilor se salvează în contul lor, iar profesorul le vede și le poate evalua.',
    ce: ['Diapozitive cu teme de culoare, aspecte (titlu, conținut, imagine) și text formatat.', 'Imagini, forme, tranziții și efecte; panou de note.', 'Expunere pe tot ecranul și tipărire.', 'Salvare automată în contul de elev; profesorul vede prezentările din panoul clasei.', 'Predare la sarcină cu un clic.'],
    pasi: ['Alege o temă și un diapozitiv de titlu.', 'Adaugă diapozitive și organizează conținutul.', 'Inserează imagini și aplică tranziții.', 'Apasă F5 ca să expui prezentarea.', 'Predă prezentarea profesorului.'],
    faq: [['Se poate exporta în PowerPoint?', 'Prezentările se salvează în contul de elev și se pot expune sau tipări direct din aplicație.'], ['Merge fără cont?', 'Da, prezentările se salvează în browser; cu cont de elev se salvează în cont.'], ['Pentru ce clase?', 'Pentru clasele VI–VIII; lecțiile despre prezentări sunt la clasa a VI-a.']],
    lectii: ['tic-6-u1-l1-prezentarea-aplicatii-de-prezentare', 'tic-6-u1-l3-realizarea-unei-prezentari', 'tic-6-u1-l4-design-prezentare', 'tic-6-u1-l5-sustinerea-prezentarii'],
  },
];

const FAQ_GENERAL = [
  ['Ce este edudigi?', 'edudigi este o platformă gratuită, în limba română, pentru Informatică și TIC la gimnaziu (clasele V–VIII): lecții conforme cu programa școlară, exerciții interactive, teste pe unități, aplicații în browser și instrumente pentru profesori.'],
  ['Este gratuită?', 'Da, tot ce găsești pe edudigi este gratuit, fără reclame. Conturile de elev și de profesor sunt opționale.'],
  ['Pentru ce clase este?', 'Pentru clasele a V-a, a VI-a, a VII-a și a VIII-a, la disciplina Informatică și TIC.'],
  ['Respectă programa școlară?', 'Da. Lecțiile urmează programa școlară pentru Informatică și TIC (OMEN 3393/2017) și standardele naționale de evaluare din Anexa 15.'],
  ['Funcționează pe Chromebook?', 'Da. Aplicațiile (editor de desen, programare cu blocuri, editor C++, editor Python, procesor de text, foaie de calcul și altele) rulează în browser, fără instalare, deci merg și pe Chromebook.'],
  ['Trebuie să am cont ca să învăț?', 'Nu. Lecțiile, exercițiile și aplicațiile se pot folosi fără cont. Cu un cont de elev se salvează progresul și se primesc sarcini de la profesor.'],
  ['Cum intră elevii într-un cont fără e-mail?', 'Profesorul creează o clasă și primește un cod. Elevii se înscriu cu codul clasei, un pseudonim și un PIN de 4 cifre; nu li se cere adresă de e-mail sau alte date personale.'],
  ['Cum primesc elevii o sarcină?', 'Profesorul alege o lecție și, opțional, o aplicație și un termen. Sarcina apare elevilor în „Sarcinile mele”, iar lucrarea se predă cu un clic din aplicație.'],
  ['Ce sunt testele pe unități?', 'Teste de evaluare în principal tip grilă, câte unul pentru fiecare unitate de învățare. Le lansează profesorul, se corectează automat, iar notele rămân ascunse elevilor până le publică profesorul.'],
  ['Pot descărca planificări și fișe de lucru?', 'Da, în pagina Resurse: planificări calendaristice 2026–2027 (PDF și Word) și fișe de lucru cu barem, gratuit.'],
];

const cap = (s) => { s = String(s).trim(); if (!s) return s; s = s[0].toLocaleUpperCase('ro') + s.slice(1); return /[.!?…]$/.test(s) ? s : s + '.'; };
const esteScurtatura = (f) => /^(ctrl|alt|shift|f\d{1,2}|windows|win|tab|esc|enter|delete|del|backspace)\b/i.test(f);
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function generate(ctx) {
  const { site, out, materials, bodies, tipuri, urls, H } = ctx;
  const { page, esc, plain, ROMAN, editor } = H;
  const mat = new Map(materials.map((m) => [m.id, m]));
  const link = (m) => `<li><a href="/lectii/${m.id}.html">${esc(m.titlu)}</a> <span class="muted">· clasa a ${ROMAN[m.clasa[0]]}-a</span></li>`;
  const claseTxt = (c) => (c.length === 1 ? `clasa a ${ROMAN[c[0]]}-a` : `clasele ${c.map((x) => ROMAN[x]).join(', ')}`);
  const llms = [];
  const scrie = (rel, html) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
  const faqLd = (qa) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  const faqHtml = (qa) => `<section class="static-faq"><h2>Întrebări frecvente</h2>${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  fs.rmSync(path.join(out, 'aplicatii'), { recursive: true, force: true });
  fs.rmSync(path.join(out, 'glosar'), { recursive: true, force: true });
  fs.rmSync(path.join(out, 'resurse'), { recursive: true, force: true });

  // ---------- Aplicații ----------
  const imgApp = (a) => `${site}/fisiere/imagini/aplicatii/${a.id}.jpg`;
  for (const a of APLICATII) {
    const url = `/aplicatii/${a.id}.html`;
    const faq = [...a.faq, ...CTA_COMUN];
    const lectii = a.lectii.map((id) => mat.get(id)).filter(Boolean);
    const ld = [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: `${a.nume} – edudigi`, url: site + url, description: a.desc, applicationCategory: 'EducationalApplication', operatingSystem: 'Orice browser (Chromebook, Windows, macOS, Linux, Android, iOS)', inLanguage: 'ro', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'RON' }, screenshot: imgApp(a), audience: { '@type': 'EducationalAudience', educationalRole: ['student', 'teacher'] }, educationalLevel: `Gimnaziu, ${claseTxt(a.clase)}`, publisher: editor },
      faqLd(faq),
    ];
    scrie(`aplicatii/${a.id}.html`, page({
      site, url, title: `${a.titlu} | edudigi`, desc: a.desc, ld,
      crumbs: [['Aplicații', '/aplicatii/'], [a.nume]],
      body: `<article class="paper static-app">
        <p class="kicker">Aplicație în browser · ${esc(claseTxt(a.clase))} · în loc de ${esc(a.inlocuieste)}</p>
        <h1>${esc(a.titlu)}</h1>
        <div class="static-tldr">${esc(a.intro)}</div>
        <p><a class="btn" href="/${a.ruta}">Deschide ${esc(a.nume)}</a> <span class="muted small">gratuit, fără instalare și fără cont</span></p>
        <img class="static-shot" src="/fisiere/imagini/aplicatii/${a.id}.jpg" alt="Captură de ecran din aplicația ${esc(a.nume)}" width="1200" height="750" loading="lazy">
        <h2>Ce poți face</h2><ul>${a.ce.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h2>Cum se folosește</h2><ol>${a.pasi.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        ${lectii.length ? `<h2>Lecții care folosesc această aplicație</h2><ul>${lectii.map(link).join('')}</ul>` : ''}
        ${faqHtml(faq)}
        <p class="static-cta"><a class="btn" href="/${a.ruta}">Deschide ${esc(a.nume)}</a> <a class="btn ghost" href="/aplicatii/">Toate aplicațiile</a></p></article>`,
    }));
    urls.push({ loc: url, pri: '0.8', img: [{ loc: imgApp(a), title: `Captură din ${a.nume}` }] });
    llms.push(`- [${a.nume}](${site}${url}): ${plain(a.desc)}`);
  }
  scrie('aplicatii/index.html', page({
    site, url: '/aplicatii/', title: 'Aplicații educaționale în browser pentru informatică și TIC, clasele V–VIII | edudigi',
    desc: 'Editor de desen, programare cu blocuri, editor C++ și Python, simulator de e-mail, editor audio, procesor de text, foaie de calcul și altele: aplicații gratuite în română, care rulează în browser, inclusiv pe Chromebook.',
    crumbs: [['Aplicații']], type: 'website',
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Aplicații educaționale edudigi', url: site + '/aplicatii/', inLanguage: 'ro', hasPart: APLICATII.map((a) => ({ '@type': 'SoftwareApplication', name: a.nume, url: `${site}/aplicatii/${a.id}.html` })) }, faqLd(CTA_COMUN)],
    body: `<h1>Aplicații pentru ora de informatică și TIC</h1>
      <div class="static-tldr">Programele din manualele de gimnaziu (Paint, Word, Excel, PowerPoint, WavePad, Code::Blocks, Thonny, Gmail) nu se pot instala pe un Chromebook. Pe edudigi ai variante în browser, în română, cu aceleași denumiri și butoane ca în manual, gratuite și fără instalare.</div>
      <div class="static-apps">${APLICATII.map((a) => `<a class="static-app-card" href="/aplicatii/${a.id}.html"><img src="/fisiere/imagini/aplicatii/${a.id}.jpg" alt="${esc(a.nume)}" width="600" height="375" loading="lazy"><b>${esc(a.nume)}</b><span class="muted small">în loc de ${esc(a.inlocuieste)} · ${esc(claseTxt(a.clase))}</span></a>`).join('')}</div>
      ${faqHtml(CTA_COMUN)}`,
  }));
  urls.push({ loc: '/aplicatii/', pri: '0.9' });

  // ---------- Glosar (din cartonașele lecțiilor) ----------
  const termeni = new Map();
  for (const m of materials) {
    let acts = [];
    try { acts = extract(bodies[m.id] || ''); } catch { continue; }
    for (const a of acts) {
      if (a.type !== 'cartonase') continue;
      const cards = a.data.cards || [];
      for (const c of cards) {
        const front = plain(c.front), back = plain(c.back);
        if (!front || !back || front.length > 60 || back.length < 8) continue;
        const k = slug(front) || `simbol-${[...front].map((ch) => ch.codePointAt(0).toString(16)).join('-')}`;
        if (!termeni.has(k)) termeni.set(k, { k, termen: front, defs: [], lectii: new Map(), vecini: new Set() });
        const t = termeni.get(k);
        if (!t.defs.some((d) => d.text === back)) t.defs.push({ text: back, clasa: m.clasa[0] });
        t.lectii.set(m.id, m);
        for (const o of cards) { const f = plain(o.front); if (f && f !== front) t.vecini.add(f); }
      }
    }
  }
  const lista = [...termeni.values()].sort((x, y) => x.termen.localeCompare(y.termen, 'ro'));
  // Scurtăturile de tastatură merg pe o pagină a lor; definițiile prea scurte rămân doar în indexul glosarului.
  for (const t of lista) t.tip = esteScurtatura(t.termen) ? 'scurtatura' : t.defs.map((d) => d.text).join(' ').length >= 30 ? 'pagina' : 'index';
  const cuPagina = lista.filter((t) => t.tip === 'pagina');
  const scurtaturi = lista.filter((t) => t.tip === 'scurtatura');
  const glosarId = `${site}/glosar/`;
  for (const t of cuPagina) {
    const url = `/glosar/${t.k}.html`;
    const prima = cap(t.defs[0].text);
    const faq = [[`Ce este „${t.termen}”?`, t.defs.map((d) => cap(d.text)).join(' ')]];
    const lectii = [...t.lectii.values()].sort((a, b) => a.clasa[0] - b.clasa[0]);
    const vecini = [...t.vecini].map((f) => cuPagina.find((x) => x.termen === f)).filter((x) => x && x.k !== t.k).slice(0, 8);
    scrie(`glosar/${t.k}.html`, page({
      site, url, title: `${t.termen} – ce înseamnă (Informatică și TIC) | Glosar edudigi`,
      desc: `${t.termen}: ${prima} Explicații, exemple și lecții pe edudigi.`.slice(0, 158),
      ld: [{ '@context': 'https://schema.org', '@type': 'DefinedTerm', name: t.termen, description: t.defs.map((d) => cap(d.text)).join(' '), inLanguage: 'ro', url: site + url, inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Glosar de Informatică și TIC – edudigi', url: glosarId } }, faqLd(faq)],
      crumbs: [['Glosar', '/glosar/'], [t.termen]],
      body: `<article class="paper"><p class="kicker">Glosar de informatică și TIC</p><h1>${esc(t.termen)} – ce înseamnă</h1>
        <div class="static-tldr">${esc(prima)}</div>
        ${t.defs.length > 1 ? `<h2>Alte sensuri</h2><ul>${t.defs.slice(1).map((d) => `<li>${esc(cap(d.text))} <span class="muted small">· clasa a ${ROMAN[d.clasa]}-a</span></li>`).join('')}</ul>` : ''}
        <h2>Unde înveți despre asta</h2><ul>${lectii.map(link).join('')}</ul>
        ${vecini.length ? `<h2>Termeni înrudiți</h2><p>${vecini.map((v) => `<a href="/glosar/${v.k}.html">${esc(v.termen)}</a>`).join(' · ')}</p>` : ''}
        <p class="static-cta"><a class="btn" href="/lectii/${lectii[0].id}.html">Citește lecția și rezolvă exercițiile</a> <a class="btn ghost" href="/glosar/">Tot glosarul</a></p></article>`,
    }));
    urls.push({ loc: url, pri: '0.5' });
  }
  // Pagina scurtăturilor de tastatură.
  if (scurtaturi.length >= 5) {
    const urlS = '/glosar/scurtaturi-de-tastatura.html';
    scrie('glosar/scurtaturi-de-tastatura.html', page({
      site, url: urlS, title: 'Scurtături de tastatură: Ctrl+C, Ctrl+V, Ctrl+Z și altele – ce fac | edudigi',
      desc: `${scurtaturi.length} de scurtături de tastatură folosite în Windows, Word și Excel, explicate pe scurt, pentru elevi: copiere, lipire, salvare, anulare și altele.`,
      ld: [faqLd(scurtaturi.slice(0, 12).map((t) => [`Ce face ${t.termen}?`, cap(t.defs[0].text)]))],
      crumbs: [['Glosar', '/glosar/'], ['Scurtături de tastatură']],
      body: `<article class="paper"><p class="kicker">Glosar de informatică și TIC</p><h1>Scurtături de tastatură</h1><div class="static-tldr">Combinațiile de taste care fac munca la calculator mai rapidă: copiere, lipire, salvare, anulare și altele, explicate pe scurt.</div><table><tr><th>Scurtătură</th><th>Ce face</th></tr>${scurtaturi.map((t) => `<tr><td><b>${esc(t.termen)}</b></td><td>${esc(cap(t.defs[0].text))}</td></tr>`).join('')}</table><p class="static-cta"><a class="btn ghost" href="/glosar/">Tot glosarul</a></p></article>`,
    }));
    urls.push({ loc: urlS, pri: '0.6' });
  }
  const litera = (s) => { const c = slug(s)[0] || '#'; return /[a-z]/.test(c) ? c.toUpperCase() : '#'; };
  const grup = new Map();
  for (const t of lista) { const l = litera(t.termen); if (!grup.has(l)) grup.set(l, []); grup.get(l).push(t); }
  scrie('glosar/index.html', page({
    site, url: '/glosar/', title: 'Glosar de informatică și TIC – termeni explicați pentru elevi | edudigi',
    desc: `Glosar cu ${lista.length} de termeni de informatică și TIC, explicați pe înțelesul elevilor de gimnaziu: hardware, algoritmi, Scratch, internet, Word, Excel, programare.`,
    crumbs: [['Glosar']], type: 'website',
    ld: [{ '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'Glosar de Informatică și TIC – edudigi', url: glosarId, inLanguage: 'ro', hasDefinedTerm: cuPagina.slice(0, 200).map((t) => ({ '@type': 'DefinedTerm', name: t.termen, url: `${site}/glosar/${t.k}.html` })) }],
    body: `<h1>Glosar de informatică și TIC</h1><div class="static-tldr">${lista.length} de termeni din lecțiile claselor V–VIII, explicați scurt, cu linkuri spre lecțiile în care îi înveți.</div>
      <p class="glosar-litere">${[...grup.keys()].map((l) => `<a href="#l-${l}">${l}</a>`).join(' ')}</p>
      ${[...grup].map(([l, ts]) => `<section id="l-${l}"><h2>${l}</h2><ul class="glosar-lista">${ts.map((t) => { const d = cap(t.defs[0].text); const dd = d.length > 110 ? d.slice(0, 107) + '…' : d; const href = t.tip === 'pagina' ? `/glosar/${t.k}.html` : t.tip === 'scurtatura' && scurtaturi.length >= 5 ? '/glosar/scurtaturi-de-tastatura.html' : null; return `<li>${href ? `<a href="${href}"><b>${esc(t.termen)}</b></a>` : `<b>${esc(t.termen)}</b>`} – <span class="muted">${esc(dd)}</span></li>`; }).join('')}</ul></section>`).join('')}`,
  }));
  urls.push({ loc: '/glosar/', pri: '0.7' });
  llms.push(`- [Glosar de informatică și TIC](${site}/glosar/): ${lista.length} de termeni explicați, cu pagină pe termen`);

  // ---------- Resurse descărcabile ----------
  const resurse = materials.filter((m) => m.fisier && (m.tip === 'fisa' || m.tip === 'resursa')).sort((a, b) => a.clasa[0] - b.clasa[0] || (a.ordine ?? 0) - (b.ordine ?? 0));
  const dl = (m) => {
    const w = m.fisier.url.endsWith('.pdf') && /planificare/.test(m.fisier.nume) ? m.fisier.url.replace(/\.pdf$/, '.docx') : null;
    const barem = /^fisa-de-lucru/.test(m.fisier.nume) ? m.fisier.url.replace('fisa-de-lucru', 'barem-fisa') : null;
    return `<a class="btn small" href="/${m.fisier.url}" download>Descarcă PDF</a>${w ? ` <a class="btn ghost small" href="/${w}" download>Descarcă Word</a>` : ''}${barem ? ` <a class="btn ghost small" href="/${barem}" download>Barem (PDF)</a>` : ''}`;
  };
  scrie('resurse/index.html', page({
    site, url: '/resurse/', title: 'Planificări, fișe de lucru și bareme la informatică și TIC, clasele V–VIII | edudigi',
    desc: 'Resurse gratuite pentru profesori: planificări calendaristice 2026–2027 (PDF și Word) și fișe de lucru cu barem la Informatică și TIC, clasele V–VIII, conform programei.',
    crumbs: [['Resurse']], type: 'website',
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Resurse pentru profesori – edudigi', url: site + '/resurse/', inLanguage: 'ro', hasPart: resurse.map((m) => ({ '@type': 'LearningResource', name: m.titlu, url: `${site}/lectii/${m.id}.html`, isAccessibleForFree: true })) }],
    body: `<h1>Resurse gratuite pentru profesori</h1>
      <div class="static-tldr">Planificări calendaristice pentru 2026–2027, gata de completat, și fișe de lucru cu barem, pentru Informatică și TIC la clasele V–VIII. Se descarcă gratuit, fără cont.</div>
      ${[5, 6, 7, 8].map((c) => { const rs = resurse.filter((m) => m.clasa.includes(c)); return rs.length ? `<section class="static-unit"><h2>Clasa a ${ROMAN[c]}-a</h2><ul class="static-res">${rs.map((m) => `<li><a href="/lectii/${m.id}.html"><b>${esc(m.titlu)}</b></a><br><span class="muted small">${esc(m.descriere)}</span><br>${dl(m)}</li>`).join('')}</ul></section>` : ''; }).join('')}
      <p>Mai mult pentru profesori: <a href="/pentru-profesori.html">teste pe unități, sarcini de lucru și clase fără e-mail</a>.</p>`,
  }));
  urls.push({ loc: '/resurse/', pri: '0.8' });
  llms.push(`- [Resurse pentru profesori](${site}/resurse/): planificări calendaristice 2026–2027 (PDF/Word) și fișe de lucru cu barem`);

  // ---------- Pentru profesori + Întrebări frecvente ----------
  const faqProf = [
    ['Cât costă?', 'Nimic. Toate funcțiile pentru profesori sunt gratuite.'],
    ['Cum creez o clasă?', 'Îți faci un cont de profesor, apeși „Clasă nouă”, alegi clasa și primești un cod. Dai codul elevilor, care se înscriu singuri cu un pseudonim și un PIN.'],
    ['Elevii au nevoie de e-mail?', 'Nu. Elevii intră cu codul clasei, un pseudonim și un PIN de 4 cifre, fără adresă de e-mail și fără alte date personale.'],
    ['Cine vede notele la teste?', 'Tu. Notele rămân ascunse elevilor până apeși „Publică notele elevilor”, ca să poți verifica întâi răspunsurile și să punctezi răspunsurile deschise.'],
    ['Ce teste există?', 'Teste de evaluare pe fiecare unitate de învățare, în principal tip grilă, cu 90 de puncte plus 10 din oficiu, corectate automat.'],
    ['Pot da sarcini care folosesc aplicațiile?', 'Da. Alegi lecția, opțional o aplicație (desen, blocuri, C++, Python, pagini web, Word, Excel, prezentare etc.) și un termen. Elevul predă lucrarea din aplicație, iar tu o vezi, pui nota și comentariul sau ceri refacerea.'],
  ];
  scrie('pentru-profesori.html', page({
    site, url: '/pentru-profesori.html', title: 'Platformă pentru profesorii de informatică și TIC: teste, sarcini, clase | edudigi',
    desc: 'Teste grilă pe unități cu note ascunse până la aprobare, sarcini de lucru predate din aplicații, clase fără e-mail, planificări și fișe gratuite. Pentru profesorii de informatică și TIC din gimnaziu.',
    crumbs: [['Pentru profesori']], type: 'website',
    ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'edudigi pentru profesori', url: site + '/pentru-profesori.html', inLanguage: 'ro', audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' } }, faqLd(faqProf)],
    body: `<article class="paper"><h1>edudigi pentru profesorii de informatică și TIC</h1>
      <div class="static-tldr">Lecții conforme cu programa, teste pe unități, sarcini de lucru și aplicații în browser, ca să poți preda și evalua informatica și TIC la gimnaziu chiar și când elevii au doar Chromebook-uri.</div>
      <div class="feature-grid">
        <div class="feature f1"><b>Teste pe fiecare unitate</b><p>Teste de evaluare în principal tip grilă, corectate automat. Notele rămân ascunse elevilor până le publici tu.</p></div>
        <div class="feature f2"><b>Sarcini de lucru</b><p>Dai o lecție și o aplicație, cu termen. Elevii predau din aplicație, iar tu vezi desenul, programul, pagina web sau mesajele și pui nota și comentariul.</p></div>
        <div class="feature f3"><b>Clase fără e-mail</b><p>Cod de clasă, pseudonim și PIN: nicio adresă de e-mail și nicio dată personală a elevilor.</p></div>
      </div>
      <h2>Ce primești</h2><ul>
        <li><a href="/resurse/">Planificări calendaristice 2026–2027 și fișe de lucru cu barem</a>, gratuite, în PDF și Word.</li>
        <li><a href="/lectii/">Lecții pentru clasele V–VIII</a>, cu imagini, exerciții interactive și competențele specifice din Anexa 15.</li>
        <li><a href="/aplicatii/">Aplicații în browser</a> care înlocuiesc programele din manual: Paint, Scratch, Code::Blocks, Python, Gmail, WavePad, Word, Excel, PowerPoint.</li>
        <li>Panou al clasei: progresul fiecărui elev, rezultatele la teste, prezentările din Atelier, export în Excel.</li></ul>
      <p class="static-cta"><a class="btn" href="/#/intra">Creează cont de profesor</a> <a class="btn ghost" href="/intrebari-frecvente.html">Întrebări frecvente</a></p>
      ${faqHtml(faqProf)}</article>`,
  }));
  urls.push({ loc: '/pentru-profesori.html', pri: '0.8' });
  scrie('intrebari-frecvente.html', page({
    site, url: '/intrebari-frecvente.html', title: 'Întrebări frecvente despre edudigi – informatică și TIC pentru gimnaziu',
    desc: 'Răspunsuri despre edudigi: este gratuită, funcționează pe Chromebook, cum primesc elevii sarcini, ce sunt testele pe unități și unde descarc planificări și fișe.',
    crumbs: [['Întrebări frecvente']], type: 'website', ld: [faqLd(FAQ_GENERAL)],
    body: `<h1>Întrebări frecvente</h1>${FAQ_GENERAL.map(([q, a]) => `<section><h2>${esc(q)}</h2><p>${esc(a)}</p></section>`).join('')}`,
  }));
  urls.push({ loc: '/intrebari-frecvente.html', pri: '0.6' });
  llms.push(`- [Pentru profesori](${site}/pentru-profesori.html): teste pe unități, sarcini de lucru, clase fără e-mail`, `- [Întrebări frecvente](${site}/intrebari-frecvente.html)`);
  return { llms, nrTermeni: lista.length };
}

module.exports = { generate, APLICATII };

# edudigi

Resurse gratuite pentru **Informatică** și **TIC**, clasele **V–XII**: lecții, fișe de lucru, teste, prezentări și proiecte. Oricine deschide site-ul vede materialele; cu un cont, progresul elevilor se salvează, iar profesorul îl vede într-un panou.

**Înveți. Creezi. Progresezi.**

## Cum funcționează

Site-ul este static; doar conturile și testele lansate folosesc API-ul și baza de date. Fiecare material e un fișier în folderul `materiale/`. La fiecare push pe GitHub, Vercel rulează `npm run build`, care verifică materialele și generează site-ul.

```
materiale/
  tic-5-sistemul-de-calcul.md     un material (antet + conținut)
  fisiere/                        atașamente: PDF, PPTX, DOCX, imagini
public/                           interfața (HTML, CSS, JS, fonturi, logo)
scripts/build.js                  verifică materialele și generează public/date/ (și lib/generated/teste.json)
scripts/serve.js                  server local (site + API)
scripts/migrate.js                aplică db/schema.sql pe Neon
lib/api.js, lib/db.js             API-ul (conturi, clase, progres, teste) și conexiunea Postgres (pg)
public/js/office.js               procesorul de text și foaia de calcul (cu motorul de formule)
public/js/teste-core.js           notarea testelor (aceeași în browser și pe server)
api/index.js                      funcția Vercel pentru /api/*
neon.ts                           configurația Neon
docs/                             harta conținutului și promptul generator
```

## Adăugarea unui material

Creează în `materiale/` un fișier `.md`. Numele lui devine adresa materialului, așa că folosește doar litere mici fără diacritice, cifre și cratime (ex. `info-9-variabile-python.md`).

```markdown
---
titlu: Variabile în Python
disciplina: informatica        # informatica | tic
clasa: 9                       # 5–12; mai multe: 9, 10
categorie: programare          # programare | tic | algoritmi | aplicatii
tip: lectie                    # lectie | fisa | test | prezentare | proiect | resursa
descriere: O frază care apare pe card.
fisier: fisiere/variabile.pdf  # opțional: atașament din materiale/fisiere/
data: 2026-10-15               # opțional: materialele noi apar primele
---

## Ce vei învăța azi

Conținutul lecției, în Markdown: titluri, liste, **bold**, `cod`, blocuri de cod,
tabele, citate, linkuri și imagini (![descriere](fisiere/imagine.png)).

## Aplicații interactive

(vezi mai jos: quiz, adevărat/fals, categorii, ordonare, completare, cartonașe)
```

- Un material poate avea doar conținut, doar atașament, sau ambele.
- Diacriticele și majusculele sunt acceptate în antet („Informatică”, „Fișă de lucru”).
- PDF-urile se văd direct în pagină; celelalte fișiere au butoane **Descarcă** / **Deschide**.
- Dacă antetul are o greșeală, construirea se oprește și spune exact ce fișier și ce câmp trebuie corectat. Site-ul publicat rămâne cel de dinainte.

## Aplicații interactive

**Fiecare lecție (`tip: lectie`) trebuie să aibă cel puțin o aplicație interactivă**; altfel construirea se oprește și spune ce lecție o lipsește. Aplicațiile se scriu direct în textul lecției, ca blocuri de cod cu numele tipului. Prima linie `# ...` este instrucțiunea (opțională).

| Tip | Ce face elevul | Cum se scrie |
|---|---|---|
| `quiz` | alege răspunsul (sau răspunsurile) corecte | `- greșit`, `* corect`, `Explicație: ...`; întrebările se separă cu un rând gol |
| `adevarat-fals` | apasă Adevărat / Fals, primește explicația imediat | `A: afirmație` sau `F: afirmație \| explicație` |
| `categorii` | sortează elementele în categorii | `Categorie: element, element` (cel puțin 2 categorii) |
| `ordonare` | pune pașii în ordine cu săgeți | pașii în ordinea **corectă**, câte unul pe rând |
| `completare` | completează spațiile libere | `Text cu [răspuns] sau [variantă\|altă variantă]` |
| `cartonase` | întoarce cartonașe | `Termen = Definiție` |
| `procesor-text` | formatează un document într-un editor tip Word; butonul **Verifică** controlează formatarea | secțiunile `Text:` și `Cerințe:` (vezi mai jos) |
| `calcul-tabelar` | completează o foaie de calcul tip Excel, cu formule și funcții | secțiunile `Date:` și `Cerințe:` (vezi mai jos) |
| `eseu` | scrie un răspuns deschis, apoi îl compară cu baremul | cerința, opțional `Cuvinte: 30-80` și `Barem: ...` |

Exemplu:

````markdown
```quiz
# Alege răspunsul corect.
Ce fel de dispozitiv este ecranul tactil?
- Doar de intrare
* Și de intrare, și de ieșire
Explicație: Îl atingi (intrare) și îți arată imaginea (ieșire).
```
````

### Procesor de text și calcul tabelar

````markdown
```procesor-text
# Formatează invitația.
Text:
Invitație la Ziua Școlii
Dragi colegi, vă invităm vineri, la ora 12.
Cerințe:
- titlul: aldin, centrat, mărime 18 | Titlul este aldin, centrat, mărimea 18
- „vineri, la ora 12”: subliniat, culoare roșie
- paragraful 2: stânga-dreapta, font Arial
- tot textul: font Verdana
```

```calcul-tabelar
# Calculează totalul.
Date:
Produs;Preț;Cantitate;Total
Caiet;4,5;6
Pix;3;4
Cerințe:
- D2:D3: =B2*C2 | În D2:D3, totalul fiecărui produs, cu formulă
- D4: =SUM(D2:D3) | În D4, suma, cu funcția SUM
- A1:D1: aldin
- A1:D1: fundal galben
```
````

- **Procesor de text** – ținte: `titlul` (primul paragraf), `paragraful N`, `tot textul` sau un text între ghilimele („...”). Formatări: aldin, cursiv, subliniat, centrat, la stânga, la dreapta, stânga-dreapta, `mărime N`, `culoare` (negru, roșu, albastru, verde, portocaliu, mov), `font` (Arial, Times New Roman, Courier New, Verdana, Georgia, Calibri), listă cu buline, listă numerotată.
- **Calcul tabelar** – rândurile din `Date:` au celulele separate prin `;` (zecimale cu virgulă). O cerință `=formulă` verifică dacă în celulă există o formulă, cu aceleași funcții, și cu rezultatul corect (pentru o zonă, formula se „copiază” pe fiecare rând). Altele: `aldin`, `centrat`, `fundal galben|verde|albastru|rosu|portocaliu|gri`, `2 zecimale` sau o valoare. Funcții: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, ROUND, ABS, AND, OR, NOT, CONCAT (și SUMA, MEDIE, DACA...).
- Textul de după ` | ` este cerința afișată elevului.
- **Laboratorul** (`Laborator` din meniu) are aplicații de birou complete, cu panglică (ribbon) ca în Office:
  - **Document** (procesor de text): fonturi, mărimi, culori, evidențiere, liste, aliniere, spațiere, stiluri de titlu, **tabele**, **imagini** (din calculator, lipite cu Ctrl+V sau trase în pagină; se redimensionează din colțuri, se aliniază cu text în jur, chenar/umbră), simboluri, emoji, link-uri, margini, orientare, culoarea paginii, găsire și înlocuire, anulare/refacere.
  - **Registru** (foaie de calcul): formule cu indicarea celulelor prin clic, funcții, completare automată prin tragere, copiere/lipire, formatare (aldin, culori, borduri, lei, procent, zecimale), inserare/ștergere de rânduri și coloane, sortare, **diagrame** (coloane, bare, linie, radială) și **imagini**.
  - Șabloane gata făcute (invitație, scrisoare, referat, afiș, orar; listă de cumpărături, catalog, buget, temperaturi cu diagramă).
  - Fișierele se salvează automat în browser (IndexedDB) și se descarcă în format **.docx** (Word, LibreOffice, Google Docs) și **.xlsx** (Excel), sau PDF/CSV/TXT. Se pot deschide și fișiere .docx, .xlsx și .csv aduse de pe calculator.
  - Aceleași aplicații apar, în variantă compactă, în sarcinile din lecții și în teste.

- Răspunsurile de la `completare` sunt acceptate și fără diacritice sau cu majuscule.
- În pagina lecției, caseta **Aplicații interactive** arată câte aplicații a rezolvat elevul.
- Totul funcționează prin atingere și de la tastatură, inclusiv pe telefon.
- Exemple complete sunt în lecțiile din `materiale/`. Promptul din `docs/` generează lecții care includ deja aplicațiile.

## Teste cu notă

Un test este un material cu `tip: test` și un `mod`:

| `mod` | Cine îl vede | Corectare |
|---|---|---|
| `antrenament` | oricine, în lista de materiale | în browser: elevul apasă **Predă testul** și primește nota, punctajul pe itemi și corectura; îl poate relua oricând |
| `profesor` | **nimeni**, până când profesorul îl lansează unei clase | pe server; elevul nu primește niciodată răspunsurile corecte |

````markdown
---
titlu: Evaluare – Sisteme de calcul
disciplina: tic
clasa: 5
categorie: tic
tip: test
mod: profesor        # sau antrenament
timp: 40             # minute (opțional)
---

```quiz puncte=10
...
```
````

- Itemii sunt aplicațiile de mai sus (fără `cartonase`), fiecare cu `puncte=N` în antet (implicit 10). Nota = 1 + 9 × punctaj / total.
- Corectarea e parțială: de exemplu, 3 din 5 afirmații corecte = 60% din punctajul itemului. Itemii `eseu` îi punctează profesorul.
- **Lansarea**: în pagina clasei, secțiunea **Teste** → alegi testul, timpul și dacă elevii își văd nota → **Lansează testul**. Elevii îl găsesc în **Testele mele**. Răspunsurile se salvează automat; la expirarea timpului, testul se predă singur. Profesorul vede cine a predat, punctajele pe itemi, răspunsurile fiecărui elev (inclusiv documentul formatat), punctează eseurile, poate permite reluarea, oprește testul și exportă CSV.
- Testele `mod: profesor` nu ajung în site: la construire sunt copiate în `lib/generated/teste.json`, folosit doar de API. **Atenție:** fișierele din `materiale/` sunt vizibile pe GitHub dacă depozitul este public; pentru teste secrete, fă depozitul privat.

## Prezentări edudigi (fără PowerPoint)

Orice material poate conține o **prezentare** care se parcurge direct pe site: diapozitive 16:9, butoane înainte/înapoi, săgețile de la tastatură, glisare pe telefon, **ecran complet** (tasta F) pentru videoproiector și **note ale vorbitorului**. Se scrie ca un bloc `diapozitive`; diapozitivele se despart printr-un rând cu `---`:

````markdown
```diapozitive
# Tipuri de prezentări          (opțional: titlul prezentării)
tema: albastru                  (opțional: rosu, albastru, verde, portocaliu, intunecat)
## Tipuri de prezentări
Clasa a VI-a · Unitatea 1
Note: ce spune prezentatorul (se vede doar la butonul „Note”)
---
## Electronice
- **diapozitive** cu text, imagini, video
- se proiectează cu videoproiectorul
---
## Mulțumesc!
```
````

- Primul diapozitiv se afișează ca **pagină de titlu**, centrat.
- Pe diapozitive merg titluri, liste, **bold**, `cod`, tabele, citate și imagini (`![descriere](fisiere/imagine.png)`).
- Pentru un material care este doar o prezentare, folosește `tip: prezentare`. O prezentare poate fi pusă și în mijlocul unei lecții.
- Prezentările nu se numără la aplicațiile interactive. Greșelile (o temă inexistentă, un diapozitiv gol) opresc construirea, cu mesaj clar.

## Atelierul de prezentări (pentru elevi)

Din meniul **Atelier** (sau la adresa scurtă `/atelier`), elevii își fac prezentări într-un editor care arată și se folosește ca PowerPoint:

- **Ecranul de start:** „Nou” cu șabloane pe teme (Edudigi, Ocean, Natură, Toamnă, Lavandă, Clasic, Noapte, Cosmos, plus prezentare necompletată) și „Recente”.
- **Bara de titlu:** Salvare, Anulare/Refacere (Ctrl+Z / Ctrl+Y), pornirea expunerii, numele prezentării și starea salvării.
- **Panglica cu file:**
  - **Fișier:** Informații, Nou, Deschidere, Salvare, Imprimare (și PDF, cu sau fără note), Export `.json`, Închidere.
  - **Pornire:** Diapozitiv nou (cu galerie de aspecte), Aspect, Dublare, Ștergere; mărimea fontului, Aldin/Cursiv/Subliniat, culoarea textului; marcatori și aliniere; Imagine.
  - **Inserare:** diapozitiv, imagine, listă.
  - **Proiectare:** teme și dimensiunea diapozitivului (16:9 sau 4:3).
  - **Tranziții:** Estompare, Împingere, Ștergere, Zoom, Răsucire, cu previzualizare și „Se aplică la toate”.
  - **Animații:** textul apare pe rând, la clic (Apariție, Estompare, Zbor spre interior, Zoom, Săritură).
  - **Expunere diapozitive:** de la început (F5) sau de la diapozitivul curent (Shift+F5).
  - **Revizuire:** verifică regulile de design din lecție (cel mult 40 de cuvinte și 6–7 rânduri, fără majuscule peste tot, diapozitiv de titlu la început, imagini lipsă).
  - **Vizualizare:** Normal, Sortare diapozitive, note și panoramare.
- **Diapozitivul se editează direct**, în casete punctate („Faceți clic pentru a adăuga un titlu”). Miniaturile din stânga se mută prin tragere și au meniu la clic dreapta. Sub diapozitiv sunt **notele**, iar jos **bara de stare** (diapozitivul curent, design, vizualizări, zoom).
- **Comenzi rapide:** Ctrl+M (diapozitiv nou), Ctrl+D (dublare), Ctrl+S, Ctrl+P, Delete (pe miniatură), F5.

Elevii intrați în cont își salvează prezentările **în cont** (cel mult 30, fiecare cu cel mult 40 de diapozitive și 3 MB de imagini), iar profesorul le vede în panou, pe pagina fiecărui elev. Fără cont, prezentările se salvează doar în browserul respectiv. Tabelul `prezentari` se creează automat la migrare.

## Conturi și panoul profesorului

Conturile sunt opționale: lecțiile se citesc și fără cont.

- **Profesorul** își face cont (utilizator + parolă), creează o clasă și primește un **cod** (ex. `TIC5-X4K9`). Poate regenera codul sau închide înscrierea.
- **Elevul** se înscrie **o singură dată** cu codul clasei, un **pseudonim** (nu numele complet) și un **PIN** de 4–6 cifre. Data viitoare intră cu codul, pseudonimul și PIN-ul. Nu se cere e-mail. După 5 PIN-uri greșite, contul se blochează 15 minute.
- **Progresul se salvează automat** când elevul deschide o lecție și când rezolvă o aplicație: stare (început/terminat), aplicații rezolvate, **punctaj** (aplicații rezolvate din prima încercare, fixat la terminarea lecției), încercări, timp aproximativ, ultima activitate. Se păstrează **un singur rând pe elev și lecție**, nu fiecare clic.
- **Panoul profesorului** (`Panoul profesorului` din antet): tabel cu lecții terminate, aplicații, punctaj, timp și ultima activitate; elevii **rămași în urmă** sunt evidențiați (inactivi de 7 zile sau sub jumătate din progresul median); filtrare pe unitate; vedere pe o singură lecție; pagina fiecărui elev; **resetarea unei teme**; resetarea PIN-ului; ștergerea elevului; **export CSV** pentru Excel.
- Profesorul vede doar clasele lui; elevul vede doar propriul progres. Nu există clasament între elevi.
- Opțional: variabila `TEACHER_SIGNUP_CODE` cere un cod de invitație la crearea conturilor de profesor.
- **Parolă uitată (profesor):** adaugă în Vercel variabila `ADMIN_RESET_CODE` (un cod secret, minimum 8 caractere) și fă Redeploy. Pe pagina „Intră în cont” → „Am uitat parola”, introduci utilizatorul, acest cod și parola nouă. Fără variabilă, resetarea este dezactivată. Elevilor, PIN-ul îl resetează profesorul din panou.

### Baza de date: Neon Postgres

Proiectul este legat de Neon (`neon.ts`, proiectul `crimson-silence-80901741`, ramura `production`). Pe calculatorul tău:

```bash
npm i -g neon@latest
neon login                # se deschide browserul pentru autentificare
neon init -y --org-id org-sparkling-sun-56816132 --project-id crimson-silence-80901741 --branch production --services postgres
neon deploy               # scrie DATABASE_URL în .env.local
npm install
npm run db:migrate        # creează tabelele (db/schema.sql)
npm start                 # http://localhost:3000, cu conturi
```

Pe **Vercel**: în proiect → **Settings → Environment Variables** adaugă `DATABASE_URL` (conexiunea *pooled* de la Neon) și, opțional, `DATABASE_URL_UNPOOLED` (conexiunea directă, folosită la migrare). Sau instalează integrarea Neon din Vercel Marketplace, care le adaugă singură. Apoi fă **Redeploy**: la build, tabelele se creează automat. Fără `DATABASE_URL`, site-ul merge în continuare, doar fără conturi.

Tabele: `profesori`, `clase` (cu codul de înscriere), `elevi`, `sesiuni`, `progres`, `lansari` (testele lansate), `rezultate` (răspunsurile și punctajele) și `prezentari` (Atelierul). Lecțiile și aplicațiile rămân fișiere în `materiale/`.

**Protecția datelor (GDPR):** se păstrează doar pseudonimul, hash-ul PIN-ului și progresul agregat. Nu se cer nume complete, e-mail, CNP sau adresă. Stabiliți cu școala perioada de păstrare a datelor; la final de an poți șterge elevii (progresul se șterge odată cu ei).

## Pornire locală

Ai nevoie de [Node.js](https://nodejs.org) 18 sau mai nou și de `npm install`.

```bash
npm start     # construiește și pornește pe http://localhost:3000
npm test      # testele construirii, ale aplicațiilor și ale API-ului (pe un Postgres local, PGlite)
```

## Publicare pe Vercel

Proiectul e gata configurat (`vercel.json`): `public/` este servit static, iar `/api/*` rulează ca funcție Vercel (`api/index.js`). Pentru conturi adaugă `DATABASE_URL` (vezi mai sus). Fiecare push pe ramura `main` republică automat site-ul.

## Identitate vizuală

Culori: roșu edudigi `#F21F4B`, charcoal `#171416`, warm white `#FFF7EE`, learning blue `#3EC6E0`. Fonturi: Montserrat (titluri și text) și JetBrains Mono (cod), găzduite local în `public/fonts/` (licență SIL OFL), ca vizitatorii să nu fie urmăriți de servicii externe.

## Prima versiune

Prima variantă a platformei (server propriu, cu Upstash Redis pe Vercel) este păstrată pe ramura [`platforma-cu-conturi`](https://github.com/madalinagligor5-maker/tic_platform/tree/platforma-cu-conturi). Versiunea actuală o înlocuiește, cu Neon Postgres.

# edudigi

Resurse gratuite pentru **Informatică** și **TIC**, clasele **V–XII**: lecții, fișe de lucru, teste, prezentări și proiecte. Oricine deschide site-ul vede materialele; cu un cont, progresul elevilor se salvează, iar profesorul îl vede într-un panou.

**Înveți. Creezi. Progresezi.**

## Cum funcționează

Site-ul este static: nu are bază de date și nici server. Fiecare material e un fișier în folderul `materiale/`. La fiecare push pe GitHub, Vercel rulează `npm run build`, care verifică materialele și generează site-ul.

```
materiale/
  tic-5-sistemul-de-calcul.md     un material (antet + conținut)
  fisiere/                        atașamente: PDF, PPTX, DOCX, imagini
public/                           interfața (HTML, CSS, JS, fonturi, logo)
scripts/build.js                  verifică materialele și generează public/date/
scripts/serve.js                  server local (site + API)
scripts/migrate.js                aplică db/schema.sql pe Neon
lib/api.js, lib/db.js             API-ul (conturi, clase, progres) și conexiunea Postgres (pg)
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

- Răspunsurile de la `completare` sunt acceptate și fără diacritice sau cu majuscule.
- În pagina lecției, caseta **Aplicații interactive** arată câte aplicații a rezolvat elevul.
- Totul funcționează prin atingere și de la tastatură, inclusiv pe telefon.
- Exemple complete sunt în lecțiile din `materiale/`. Promptul din `docs/` generează lecții care includ deja aplicațiile.

## Conturi și panoul profesorului

Conturile sunt opționale: lecțiile se citesc și fără cont.

- **Profesorul** își face cont (utilizator + parolă), creează o clasă și primește un **cod** (ex. `TIC5-X4K9`). Poate regenera codul sau închide înscrierea.
- **Elevul** se înscrie **o singură dată** cu codul clasei, un **pseudonim** (nu numele complet) și un **PIN** de 4–6 cifre. Data viitoare intră cu codul, pseudonimul și PIN-ul. Nu se cere e-mail. După 5 PIN-uri greșite, contul se blochează 15 minute.
- **Progresul se salvează automat** când elevul deschide o lecție și când rezolvă o aplicație: stare (început/terminat), aplicații rezolvate, **punctaj** (aplicații rezolvate din prima încercare, fixat la terminarea lecției), încercări, timp aproximativ, ultima activitate. Se păstrează **un singur rând pe elev și lecție**, nu fiecare clic.
- **Panoul profesorului** (`Panoul profesorului` din antet): tabel cu lecții terminate, aplicații, punctaj, timp și ultima activitate; elevii **rămași în urmă** sunt evidențiați (inactivi de 7 zile sau sub jumătate din progresul median); filtrare pe unitate; vedere pe o singură lecție; pagina fiecărui elev; **resetarea unei teme**; resetarea PIN-ului; ștergerea elevului; **export CSV** pentru Excel.
- Profesorul vede doar clasele lui; elevul vede doar propriul progres. Nu există clasament între elevi.
- Opțional: variabila `TEACHER_SIGNUP_CODE` cere un cod de invitație la crearea conturilor de profesor.

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

Tabele: `profesori`, `clase` (cu codul de înscriere), `elevi`, `sesiuni`, `progres`. Lecțiile și aplicațiile rămân fișiere în `materiale/`.

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

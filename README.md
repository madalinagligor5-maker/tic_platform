# edudigi

Resurse gratuite pentru **Informatică** și **TIC**, clasele **V–XII**: lecții, fișe de lucru, teste, prezentări și proiecte. Fără conturi: oricine deschide site-ul vede materialele.

**Înveți. Creezi. Progresezi.**

## Cum funcționează

Site-ul este static: nu are bază de date și nici server. Fiecare material e un fișier în folderul `materiale/`. La fiecare push pe GitHub, Vercel rulează `npm run build`, care verifică materialele și generează site-ul.

```
materiale/
  tic-5-sistemul-de-calcul.md     un material (antet + conținut)
  fisiere/                        atașamente: PDF, PPTX, DOCX, imagini
public/                           interfața (HTML, CSS, JS, fonturi, logo)
scripts/build.js                  verifică materialele și generează public/date/
scripts/serve.js                  server local pentru previzualizare
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

## Pornire locală

Ai nevoie de [Node.js](https://nodejs.org) 18 sau mai nou. Nu e nevoie de `npm install`.

```bash
npm start     # construiește și pornește pe http://localhost:3000
npm test      # testele construirii și ale aplicațiilor interactive
```

## Publicare pe Vercel

Proiectul e gata configurat (`vercel.json`). Importă repository-ul în Vercel și apasă **Deploy**: nu trebuie setat nimic altceva și nu e nevoie de bază de date. După aceea, fiecare push pe ramura `main` republică automat site-ul.

## Identitate vizuală

Culori: roșu edudigi `#F21F4B`, charcoal `#171416`, warm white `#FFF7EE`, learning blue `#3EC6E0`. Fonturi: Montserrat (titluri și text) și JetBrains Mono (cod), găzduite local în `public/fonts/` (licență SIL OFL), ca vizitatorii să nu fie urmăriți de servicii externe.

## Versiunea cu conturi

Prima versiune a platformei (conturi de profesor, clase cu cod, logare elevi cu pseudonim + PIN, progres) este păstrată pe ramura [`platforma-cu-conturi`](https://github.com/madalinagligor5-maker/tic_platform/tree/platforma-cu-conturi), pentru când va fi nevoie de ea.

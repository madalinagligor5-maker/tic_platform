---
titlu: Recapitulare și evaluare finală – Informatică și TIC, clasa a VII-a
disciplina: informatica
clasa: 7
categorie: algoritmi
tip: test
unitate: Proiect și evaluare finală
ordine: 801
descriere: Recapitularea și evaluarea finală a anului: documente Word, audio și video, aplicații colaborative și GIS, programe C++ cu structuri liniare, alternative și repetitive.
data: 2026-10-16
---

## Recapitulare finală

1. Realizează în **Word** o fișă de două pagini despre un om de știință român (de exemplu, Henri Coandă sau Ana Aslan), cu titlu, imagine, listă, tabel, antet cu numele tău și numere de pagină. Salvează ca DOCX și PDF.
2. Fă în echipă, în **Google Slides**, o prezentare despre același om de știință, apoi un clip de 30 de secunde în **VideoPad**, cu narațiunea înregistrată și curățată în **WavePad**.
3. Marchează în **Google My Maps** locul nașterii lui și trei locuri legate de activitatea lui.
4. Scrie un program C++ care citește un număr natural n și afișează **suma divizorilor** lui și dacă este **prim**.
5. Scrie un program C++ care citește numere până la 0 și afișează **media** celor **pozitive**, cu două zecimale.
6. Scrie un program C++ care afișează, pentru n citit, triunghiul de numere:

```text
1
1 2
1 2 3
…
1 2 3 … n
```

```quiz
# Ce afișează programul?
Programul: int n, s = 0; cin >> n; while (n > 9) { s = s + n % 10; n = n / 10; } cout << s + n; Ce afișează pentru n = 4705?
- 4705
* 16
- 12
Explicație: se adună 5, 0, 7, apoi bucla se oprește la n = 4, care se adaugă la final: 5 + 0 + 7 + 4 = 16.

Același program, pentru n = 8?
* 8
- 0
- nimic
Explicație: 8 nu este mai mare decât 9, deci bucla nu se execută, iar s + n = 0 + 8.

Ce afișează? int x = 1; for (int i = 1; i <= 5; i++) x = x * 2; cout << x;
- 10
* 32
- 16
Explicație: x se dublează de 5 ori: 2, 4, 8, 16, 32.
```

```categorii
# Ce aplicație folosești?
Word: o cerere tipărită cu antet și numere de pagină
WavePad: curățarea zgomotului dintr-o înregistrare
VideoPad: montajul unui film cu tranziții
Google Docs: un referat scris de patru colegi în același timp
Google My Maps: harta traseului unei excursii
Code::Blocks: un program C++
```

```adevarat-fals
A: În C++, 25 % 7 este 4.
F: Un fișier .vpj se deschide pe orice telefon ca film. | E proiectul VideoPad; filmul se exportă ca MP4.
A: La partajare, un comentator poate lăsa observații, dar nu modifică direct textul.
A: do … while execută instrucțiunile cel puțin o dată.
```

## Evaluare finală

Punctaj maxim: 100 de puncte (10 puncte din oficiu). Insuficient 0–49 · Suficient 50–69 · Bine 70–89 · Foarte bine 90–100.

```completare
# 1. Completează (15 puncte).
Fișierul audio comprimat cel mai folosit are formatul [MP3]. Stocarea fișierelor pe servere, pe internet, se numește [cloud]. În C++, citirea se face cu [cin], iar afișarea cu [cout]. Pentru n = 925, n % 100 este [25].
```

```quiz
# 2. Alege răspunsul corect (25 de puncte).
Ce orientare are o pagină culcată?
- portret
* peisaj
- vedere

Ce efect face fundalul verde transparent?
* chroma key
- estompare
- normalizare

Cum desenezi un parc într-un GIS?
- punct
- linie
* poligon

Ce afișează? int a = 3, b = 8; if (a > b) cout << a; else cout << b - a;
- 3
* 5
- 8

Câte numere afișează? for (int i = 5; i <= 20; i = i + 5) cout << i;
- 3
* 4
- 5
```

## Itemi practici

3. **(25 de puncte)** Scrie un program C++ care citește n numere naturale și afișează câte dintre ele au **ultima cifră egală cu 7** și care este cel mai mare dintre ele.

4. **(25 de puncte)** Scrie un program C++ care citește un număr natural și afișează **oglinditul** lui și dacă este **palindrom**.

**Barem pe scurt:** pentru fiecare program – declarații și citire 5 p, structura repetitivă corectă 8 p, condiția corectă 7 p, afișare 5 p.

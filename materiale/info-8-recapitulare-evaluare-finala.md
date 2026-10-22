---
titlu: Recapitulare și evaluare finală – Informatică și TIC, clasa a VIII-a
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: test
unitate: Proiect și evaluare finală
ordine: 801
descriere: Recapitularea și evaluarea finală a anului: calcul tabelar în Excel, pagini web și Google Sites, algoritmi și prelucrarea șirurilor de valori în C++.
data: 2026-10-16
---

## Recapitulare finală

1. Realizează în **Excel** un tabel cu notele a 8 elevi la 3 materii: media fiecărui elev (rotunjită la două zecimale), situația (IF), media clasei, cea mai mare medie, câți elevi au media peste 9 și o diagramă cu coloane.
2. Construiește în **Google Sites** un site de trei pagini, „Clasa a VIII-a – amintiri”, cu foaia de calcul încorporată, o galerie de imagini libere de drepturi și un formular. Publică-l.
3. Scrie un program C++ care citește n numere și afișează câte sunt **prime** și **suma** lor.
4. Scrie un program C++ care citește numere până la 0 și afișează **minimul**, **maximul** și **poziția primului număr par**.
5. Scrie un program C++ care afișează primii n termeni ai progresiei geometrice cu primul termen 3 și rația 2.

```quiz
# Ce afișează programul?
Programul: cin >> n; k = 0; for (i = 1; i <= n; i++) { cin >> x; if (x % 10 == x / 10 % 10) k++; } cout << k; Ce afișează pentru 5 și șirul 11 23 455 99 1?
- 1
* 3
- 4
Explicație: se numără numerele cu ultimele două cifre egale: 11, 455 și 99. Pentru 1, cifra zecilor este 0, diferită de 1.

Programul: s = 0; for (i = 1; i <= n; i++) { cin >> x; if (i % 2 == 1) s = s + x; else s = s - x; } cout << s; Ce afișează pentru 4 și șirul 10 3 8 6?
* 9
- 27
- 1
Explicație: 10 - 3 + 8 - 6 = 9.

Programul: cin >> n >> x; m = x; p = 1; for (i = 2; i <= n; i++) { cin >> x; if (x <= m) { m = x; p = i; } } cout << m << " " << p; Ce afișează pentru 5 și șirul 4 2 7 2 9?
- 2 2
* 2 4
- 9 5
Explicație: cu <= se reține ultima poziție a minimului.
```

```categorii
# Ce folosești?
Excel: calculul mediilor și diagrama rezultatelor
Google Sites: un site al clasei, publicat
C++: un program care află maximul unui șir de valori
```

```adevarat-fals
A: Formula =AVERAGE(B2:D2) calculează media celulelor B2, C2 și D2.
F: Un site Google se actualizează online imediat ce modifici o pagină, fără publicare. | Trebuie apăsat din nou Publicați.
A: Contorul unei numărări pornește de la 0.
A: La căutarea primei apariții, poziția se reține doar dacă nu a fost găsită anterior.
```

## Evaluare finală

Punctaj maxim: 100 de puncte (10 puncte din oficiu). Insuficient 0–49 · Suficient 50–69 · Bine 70–89 · Foarte bine 90–100.

```completare
# 1. Completează (15 puncte).
Fișierul Excel se numește registru de calcul și are extensia [.xlsx|xlsx]. Orice formulă Excel începe cu semnul [=|egal]. Paginile web sunt scrise în limbajul [HTML]. În C++, suma elementelor unui șir se inițializează cu [0], iar produsul cu [1].
```

```quiz
# 2. Alege răspunsul corect (25 de puncte).
În A1:A4 sunt 2, 8, 5 și 9. Ce dă =MAX(A1:A4)-MIN(A1:A4)?
- 9
* 7
- 24

Ce diagramă arată cel mai bine evoluția numărului de elevi în 10 ani?
* linie
- radială
- niciuna

Ce parte a adresei https://www.liceu.ro/admitere este domeniul?
- https://
* www.liceu.ro
- /admitere

Câte elemente impare are șirul 4 7 9 12 15?
- 2
* 3
- 5

Ce afișează programul care verifică dacă toate elementele sunt pozitive, pentru șirul 3 5 -1 8?
- DA
* NU
- 3
```

## Itemi practici

3. **(25 de puncte)** Realizează în Excel un tabel cu temperaturile maxime din 7 zile: media săptămânii, temperatura maximă, câte zile au avut peste 20 de grade (COUNTIF) și o diagramă linie.

4. **(25 de puncte)** Scrie un program C++ care citește n numere naturale și afișează câte dintre ele sunt **pătrate perfecte**, care este **cel mai mare** dintre acestea și pe ce **poziție** apare prima dată. Dacă nu există pătrate perfecte, afișează un mesaj.

**Barem pe scurt:** item 3 – date 5 p, formule 10 p, diagramă 10 p; item 4 – citire 5 p, verificarea pătratului perfect 8 p, numărare și maxim 7 p, poziție și mesaj 5 p.

---
titlu: Test de evaluare – Unitatea 3: Algoritmi. Șiruri de valori
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: test
mod: profesor
timp: 40
unitate: Unitatea 3 · Algoritmi
ordine: 315
descriere: Test grilă pentru Unitatea 3: structuri alternative și repetitive, algoritmi în robotică, generarea și parcurgerea șirurilor, numărare, verificare, căutare, minim, maxim, sumă și produs, cu secvențe C++ de evaluat, 6 itemi (17 întrebări grilă), 40 de minute.
data: 2026-11-10
---

Testul are 6 itemi: patru itemi grilă (17 întrebări, multe cu secvențe C++ de evaluat), un item adevărat/fals și un item de completare. În secvențe, toate variabilele sunt de tip `int`. Se acordă 10 puncte din oficiu. Timp de lucru: 40 de minute.

```quiz puncte=20
# Item 1. Alege un singur răspuns corect pentru fiecare întrebare.
Care condiție C++ verifică dacă numărul natural n are exact două cifre?
- `n >= 10 || n <= 99`
- `10 <= n <= 99`
* `n >= 10 && n <= 99`
- `n > 10 && n < 99`

Care structură repetitivă execută instrucțiunile din corpul ei cel puțin o dată, chiar dacă la prima verificare condiția este falsă?
- `while`
- `if … else`
- `for`
* `do … while`

Ce valoare are expresia C++ `17 % 5 + 17 / 5`?
- 3
- 6,4
- 2
* 5
Explicație: `17 % 5` este restul împărțirii, 2, iar `17 / 5` este câtul întreg, 3; 2 + 3 = 5.

Cu ce valoare se inițializează variabila p în care calculezi produsul elementelor unui șir?
- 0
* 1
- n
- primul număr par din șir
Explicație: 1 nu schimbă rezultatul înmulțirii; cu p = 0, produsul ar rămâne 0 până la final.

Ce ciclu repetă, de obicei, programul unui robot autonom?
* percepe (citește senzorii) – decide – acționează (comandă motoarele)
- acționează – oprește – se închide
- citește toate comenzile – le sortează – le afișează
- decide o singură dată – merge până la final
```

```quiz puncte=20
# Item 2. Ce afișează secvența? Alege un singur răspuns corect.
Ce afișează secvența `s = 0; for (i = 1; i <= 5; i++) if (i % 2 == 1) s = s + i; cout << s;`?
* 9
- 15
- 6
- 3
Explicație: se adună doar valorile impare ale lui i: 1 + 3 + 5 = 9.

Se citesc n = 6 și apoi numerele 12 7 30 5 18 9. Ce afișează secvența `cin >> n; k = 0; for (i = 1; i <= n; i++) { cin >> x; if (x % 3 == 0) k++; } cout << k;`?
- 3
- 2
* 4
- 6
Explicație: sunt multipli de 3 numerele 12, 30, 18 și 9.

Se citesc n = 5 și apoi numerele 4 9 2 9 7. Ce afișează secvența `cin >> n >> x; maxim = x; poz = 1; for (i = 2; i <= n; i++) { cin >> x; if (x >= maxim) { maxim = x; poz = i; } } cout << maxim << " " << poz;`?
- 9 2
* 9 4
- 4 1
- 7 5
Explicație: cu `>=`, poziția se actualizează și la valorile egale cu maximul, deci rămâne ultima apariție a lui 9.

Ce afișează secvența `t = 2; for (i = 1; i <= 5; i++) { cout << t << " "; t = t * 3; }`?
- 2 5 8 11 14
- 6 18 54 162 486
- 2 6 18 54
* 2 6 18 54 162
Explicație: este o progresie geometrică cu primul termen 2 și rația 3; se afișează 5 termeni.

Ce afișează secvența `n = 5; k = 0; while (n != 1) { if (n % 2 == 0) n = n / 2; else n = 3 * n + 1; k++; } cout << k;`?
- 6
- 4
* 5
- 16
Explicație: n trece prin valorile 16, 8, 4, 2, 1, deci se fac 5 pași.
```

```quiz puncte=15
# Item 3. Rezolvă situațiile și alege un singur răspuns corect.
Un robot pornește din punctul (0, 0) al unei grile și primește comenzile 2 2 1 4 1 1, unde 1 = nord (y crește), 2 = est (x crește), 3 = sud (y scade), 4 = vest (x scade). Unde ajunge robotul?
- (3, 1)
* (1, 3)
- (2, 3)
- (1, 2)

Vrei să verifici dacă TOATE cele n numere citite sunt pare: `ok = 1; for (i = 1; i <= n; i++) { cin >> x; if (CONDIȚIE) ok = 0; }`. Ce scrii în locul lui CONDIȚIE?
- `x % 2 == 0`
- `ok == 1`
- `x / 2 == 0`
* `x % 2 != 0`
Explicație: ok devine 0 când găsești un contraexemplu, adică un număr impar.

Variabila s conține suma celor n numere citite (s și n sunt de tip `int`). Care expresie calculează corect media aritmetică, cu zecimale?
- `s / n`
- `s % n`
* `(double)s / n`
- `(double)(s / n)`
Explicație: la `(double)(s / n)` împărțirea se face întâi între numere întregi, deci zecimalele se pierd.

Se citesc n = 6, v = 4 și apoi numerele 7 4 1 4 9 4. Ce afișează secvența `poz = 0; for (i = 1; i <= n; i++) { cin >> x; if (x == v && poz == 0) poz = i; } cout << poz;`?
* 2
- 6
- 3
- 4
Explicație: condiția `poz == 0` face ca poziția să fie reținută doar la prima apariție a lui 4.
```

```quiz puncte=15
# Item 4. Alege TOATE răspunsurile corecte (fiecare întrebare are mai multe răspunsuri corecte).
Care secvențe afișează primele n numere pare nenule (2 4 6 … 2·n)?
* `for (i = 1; i <= n; i++) cout << 2 * i << " ";`
* `for (x = 2; x <= 2 * n; x = x + 2) cout << x << " ";`
- `for (i = 1; i <= n; i++) cout << i + 2 << " ";`
* `for (i = 1; i <= 2 * n; i++) if (i % 2 == 0) cout << i << " ";`

Care afirmații despre algoritmul de numărare cu un contor k sunt corecte?
* Contorul k se inițializează cu 0 înainte de buclă
* Contorul crește cu 1 doar când elementul curent respectă condiția
- Contorul se afișează în interiorul buclei, după fiecare element citit
* Valoarea finală a contorului se afișează după buclă

Pentru care dintre șirurile de 4 numere de mai jos secvența `cin >> n >> ant; ok = 1; for (i = 2; i <= n; i++) { cin >> x; if (x <= ant) ok = 0; ant = x; } if (ok == 1) cout << "DA"; else cout << "NU";` afișează DA (n = 4)?
* 1 3 7 9
- 2 2 5 8
* -5 0 4 10
- 4 6 6 9
```

```adevarat-fals puncte=10
# Item 5. Stabilește dacă afirmațiile sunt adevărate (A) sau false (F).
A: Un termen al șirului lui Fibonacci se obține adunând cei doi termeni dinaintea lui.
F: La citirea unui șir care se termină cu valoarea-santinelă 0, valoarea 0 se prelucrează ca ultim element al șirului. | Santinela marchează sfârșitul și nu face parte din șir.
A: Dacă unul dintre elementele unui șir este 0, produsul elementelor șirului este 0.
F: Condiția `x % 10 == 5` verifică dacă x este divizibil cu 5. | Ea verifică dacă ultima cifră a lui x este 5; divizibilitatea cu 5 se verifică cu `x % 5 == 0`.
A: Pentru a afla dacă o valoare apare într-un șir, variabila gasit pornește de la 0 și devine 1 când valoarea este întâlnită.
```

```completare puncte=10
# Item 6. Completează spațiile libere pentru șirul cu n = 5 elemente: 8 3 10 3 6.
Suma elementelor este [30], iar minimul este [3].

Numărul elementelor pare este [3], iar poziția ultimei apariții a valorii 3 este [4].
```

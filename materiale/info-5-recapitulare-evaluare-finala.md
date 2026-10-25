---
titlu: Recapitulare și evaluare finală – Informatică și TIC, clasa a V-a
disciplina: informatica
clasa: 5
categorie: algoritmi
tip: test
unitate: Recapitulare și evaluare finală
ordine: 801
descriere: Recapitularea și evaluarea finală a anului: algoritmi, date, expresii, structuri și Scratch.
data: 2026-10-15
---

## Recapitulare finală

```quiz
# Alege răspunsul corect.
Care este diferența dintre o structură liniară și una alternativă?
* în cea liniară pașii se execută pe rând, în cea alternativă se alege o ramură în funcție de o condiție
- nu este nicio diferență
- structura alternativă nu are condiție

La calcularea mediei a trei note a, b, c, expresia corectă este:
- Media = a + b + c / 3
- Media = (a + b) + c / 3
* Media = (a + b + c) / 3
Explicație: Fără paranteze, împărțirea se face înaintea adunării.

Care sunt opțiuni din meniul Fișier din Scratch?
* Nou
* Salvează pe calculatorul tău
* Încarcă de pe calculator
- Adaugă o extensie
```

```adevarat-fals
F: Expresia (a + b) * (a / 10) < 10 este adevărată pentru a = 10 și b = 2. | (10 + 2) * (10 / 10) = 12, iar 12 < 10 este Fals.
A: „și”, „sau” și „nu” sunt operatori logici.
F: Un algoritm poate avea o singură structură decizională. | Poate avea oricâte, inclusiv una în alta.
```

```completare
# Reducerea de preț: o pereche de pantofi costă p lei și primește o reducere fixă de 5 lei.
Noul preț se calculează cu formula [p - 5|p-5]. Dacă p = 120, noul preț este [115]. Reducerea de 5 lei este o [constantă], iar prețul p este o [variabilă].
```

```ordonare
# Algoritm: afișează „Par” sau „Impar” pentru un număr n.
citește n
dacă n % 2 = 0
atunci scrie „Par”
altfel scrie „Impar”
```

## Exersează

1. Scrie în limbaj natural algoritmul pentru planificarea unei excursii: cine poate merge și când, distanța, costul față de bugetul tău.
2. Dă exemplu de o expresie aritmetică cu doi operatori care are rezultatul 23. Exemplu: 4 * 5 + 3.
3. Dă exemplu de o propoziție cu doi operatori logici.
4. În Scratch: un personaj pornește de la (20, 20) și, la fiecare apăsare a tastei 1, merge 10 px la dreapta. Când ajunge la (100, 20), spune un mesaj și scoate un sunet.
5. În Scratch: cântă o melodie la tastatură (tasta 1 = Do, tasta 2 = Re etc.).
6. Desenează în Paint o rozetă colorată, încarc-o ca personaj și, la tasta Spațiu, încearcă blocul de efecte. Ce efect împarte imaginea în pătrățele mici? (Indiciu: „pixelare”.)

## Evaluare finală

Fiecare dintre cei 9 itemi valorează 10 puncte, plus 10 puncte din oficiu (total 100 de puncte).

```quiz
# Itemii 1, 6, 8
1. Ce înseamnă proprietatea de unicitate a unui algoritm?
* dă mereu același rezultat dacă pornește de la aceleași date
- rezolvă sarcina în cât mai puțini pași
- are un număr finit de pași

6. Ce dimensiune are scena în Scratch?
* 480 × 360
- 360 × 240
- 640 × 480
- 360 × 480

8. Ce face blocul „( ) mod ( )”?
- returnează câtul împărțirii
* returnează restul împărțirii
- modifică valoarea unei variabile
```

```completare
# Itemul 2: a = 123, b = 2346.
citește a, b; dacă a >= b atunci mx ← (a % 10) + (b % 10), altfel mx ← (a % 100) * (b % 100); scrie mx.

Condiția a >= b este [Fals|falsă]. a % 100 = [23], b % 100 = [46]. Se afișează mx = [1058].
```

```quiz
# Itemul 3: regula de prelucrare
Un algoritm dă: (1, 2) → 4; (2, 3) → 7; (2, 2) → 6; (4, 3) → 11; (3, 0) → 6. Care este regula?
- primul + al doilea
* primul × 2 + al doilea
- primul × al doilea + 2
Explicație: 1 × 2 + 2 = 4, 2 × 2 + 3 = 7, 4 × 2 + 3 = 11, 3 × 2 + 0 = 6.
```

```completare
# Itemii 4, 5 și 9
4. Suma ultimelor cifre ale numerelor 23 și 44 este [7] (folosind a % 10 + b % 10).

5. Un algoritm afișează „da” dacă suma a două numere naturale este pară și „nu” dacă este impară. Pentru a = 2 și b = 4 se afișează „[da]”, iar pentru a = 2 și b = 3 se afișează „[nu]”.

9. Variabila a are valoarea 200. După blocul „modifică [a] cu 1”, a are valoarea [201].
```

```quiz
# Itemul 7
Care bloc este o structură alternativă?
- „când se dă clic pe steagul verde”
* „dacă < > atunci … altfel …”
- „mergi la x: 0 y: 0”
- „spune Bună!”
```

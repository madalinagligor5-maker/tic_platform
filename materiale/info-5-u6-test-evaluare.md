---
titlu: Test de evaluare – Unitatea 6: Primii pași în programare
disciplina: informatica
clasa: 5
categorie: programare
tip: test
mod: profesor
timp: 40
unitate: Unitatea 6 · Primii pași în programare
ordine: 608
descriere: Test grilă pentru Unitatea 6: interfața Scratch, structura liniară, variabile și expresii, decizii, jocuri și muzică în Scratch, 5 itemi (15 întrebări grilă), 40 de minute.
data: 2026-11-10
---

Testul are 5 itemi, în total 90 de puncte. Se acordă 10 puncte din oficiu. Timp de lucru: 40 de minute.

```quiz puncte=24
# Item 1. Alege un singur răspuns corect.
Scratch este:
- un sistem de operare
* un limbaj de programare vizual, în care programele se fac îmbinând blocuri
- un editor grafic
- un motor de căutare

Ce dimensiuni are scena din Scratch?
- 640 × 480 pixeli
- 800 × 600 pixeli
* 480 × 360 pixeli
- 1024 × 768 pixeli

În ce categorie se găsește blocul „spune … timp de 2 secunde”?
- Mișcare
- Sunet
- Evenimente
* Aspect

În ce categorie se găsesc blocurile de decizie „dacă… atunci” și „dacă… atunci… altfel”?
* Control
- Operatori
- Detectare
- Evenimente

Ce face blocul „modifică [scor] cu 1”?
- dă variabilei scor valoarea 1
* adună 1 la valoarea variabilei scor
- șterge variabila scor
- afișează numărul 1 pe scenă
Explicație: Valoarea 1 o dă blocul „setează [scor] la 1”; „modifică” adaugă la valoarea existentă.

Ce extensie au proiectele Scratch salvate pe calculator?
- .png
- .txt
* .sb3
- .mp3
```

```quiz puncte=24
# Item 2. Rezolvă situațiile. Alege un singur răspuns corect.
Pisoiul se află la x: 0, y: 0. Jucătorul apasă de 3 ori săgeata dreapta (`modifică x cu 10`) și o dată săgeata jos (`modifică y cu -10`). Unde ajunge pisoiul?
- x: 10, y: 10
- x: 30, y: 10
- x: -10, y: 30
* x: 30, y: -10

Variabilele au valorile a = 20 și b = 6. Ce spune personajul la blocul `spune (alătură „a mod b=” (a mod b))`?
* a mod b=2
- a mod b=3
- a mod b=26
- a mod b=3,33
Explicație: mod dă restul împărțirii: 20 = 6 × 3 + 2.

În Scratch nu există blocul `>=`. Cum construiești condiția a >= b?
- `(a > b) și (a = b)`
* `(a > b) sau (a = b)`
- `nu (a > b)`
- `(a < b) sau (a = b)`
Explicație: Ajunge ca una dintre condiții să fie adevărată, deci se folosește „sau”. La fel de bine merge și `nu (a < b)`.

În jocul „Învățăm tabla înmulțirii”, programul alege x = 6 și y = 8, iar jucătorul răspunde 46. Ce se întâmplă?
- personajul spune „Bravo! Ești tare!”, iar scorul crește cu 1
- jocul se oprește fără niciun mesaj
* personajul spune „Fii mai atent! Știu că poți!” și arată răspunsul corect, 48
- personajul arată numărul 46 timp de 3 secunde
Explicație: Condiția prod = răspuns este falsă (48 ≠ 46), deci se execută ramura „altfel”.

Ce notă cântă blocul „cântă nota (67) pentru (0.25) bătăi” din extensia Muzică?
- Do
- Mi
- La
* Sol

În jocul „Vânătoarea de stele”, la început scor = 0 și vieți = 3. Pisoiul prinde 3 stele și atinge crabul de 2 ori. Ce valori au acum variabilele?
* scor = 3, vieți = 1
- scor = 3, vieți = 2
- scor = 1, vieți = 3
- scor = 5, vieți = 1
Explicație: Fiecare stea adaugă 1 la scor, iar fiecare atingere a crabului scade 1 din vieți: 3 – 2 = 1.
```

```quiz puncte=12
# Item 3. Alege TOATE răspunsurile corecte (fiecare întrebare are mai multe răspunsuri corecte).
Care dintre următoarele sunt evenimente care pot porni un script?
* clic pe steagul verde
* apăsarea unei taste
- blocul „spune … timp de 2 secunde”
* clic pe un personaj
- blocul „setează instrumentul la (1) Pian”

Pentru x = 7, care condiții sunt adevărate în Scratch?
* `(x > 5) și (x < 10)`
- `x = 5`
* `nu (x < 5)`
* `(x mod 2) = 1`
- `(x > 10) sau (x < 3)`

Care blocuri fac parte din extensia Muzică?
* „cântă nota (60) pentru (0.25) bătăi”
* „pauză (0.25) bătăi”
- „pune creionul jos”
* „setează instrumentul la (1) Pian”
- „pornește sunetul Miau”
```

```adevarat-fals puncte=15
# Item 4. Stabilește dacă afirmațiile sunt adevărate (A) sau false (F).
A: Blocurile dintr-un script se execută unul după altul, de sus în jos.
F: În Scratch, blocul `/` dă câtul fără zecimale, de exemplu 20 / 6 = 3. | Blocul / dă rezultatul cu zecimale (3,333...); restul îl afli cu mod.
A: Ce scrie utilizatorul după blocul „întreabă și așteaptă” ajunge în blocul „răspuns”.
F: După blocul „ridică creionul”, personajul desenează când se mișcă. | Personajul desenează după blocul „pune creionul jos”.
A: Blocul „oprește tot” din categoria Control oprește toate scripturile programului.
```

```completare puncte=15
# Item 5. Completează spațiile libere.
Mai multe blocuri lipite între ele formează un [script].

Programul pornește la clic pe steagul [verde] și se oprește la clic pe bulina [roșie].

Ca să deseneze când se mișcă, personajul are nevoie de extensia [Creion|Stilou] și de blocul „pune creionul [jos]”.
```

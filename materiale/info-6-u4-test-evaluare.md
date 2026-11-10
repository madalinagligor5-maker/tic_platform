---
titlu: Test de evaluare – Unitatea 4: Algoritmi și programare
disciplina: informatica
clasa: 6
categorie: algoritmi
tip: test
mod: profesor
timp: 40
unitate: Unitatea 4 · Algoritmi și programare
ordine: 408
descriere: Test grilă pentru Unitatea 4: structuri repetitive (cât timp, repetă… până când, pentru), operatori relaționali, algoritmi cu cifre, sume și produse, programe Scratch, 6 itemi (16 întrebări grilă), 40 de minute.
data: 2026-11-10
---

Testul are 6 itemi (90 de puncte). Se acordă 10 puncte din oficiu. Timp de lucru: 40 de minute.

În algoritmi, `%` înseamnă restul împărțirii (de exemplu, 17 % 5 = 2), iar `←` înseamnă „primește valoarea”.

```quiz puncte=15
# Item 1. Alege un singur răspuns corect.
Cum se numește o repetare a secvenței dintr-o structură repetitivă?
- instrucțiune
* iterație
- condiție
- decizie

În ce categorie Scratch găsești blocurile „repetă (10)”, „repetă până când” și „la infinit”?
- Evenimente
- Operatori
* Control
- Detectare

Ce structură repetitivă folosești când știi dinainte de câte ori se repetă pașii?
- condiționată anterior (cu test inițial)
- condiționată posterior (cu test final)
- structura de decizie
* structura cu contor („pentru”)

Ce extensie are un proiect Scratch salvat pe calculator?
* .sb3
- .pptx
- .glb
- .exe
```

```quiz puncte=15
# Item 2. Alege un singur răspuns corect.
Ce se întâmplă la structura „cât timp (C) execută A” dacă, de la început, condiția C este falsă?
- A se execută o dată, apoi se iese din structură
- A se execută la nesfârșit
* A nu se execută niciodată
- A se execută de două ori

Prin ce se deosebește structura condiționată posterior de structura condiționată anterior?
* testul se face la final, deci secvența se execută cel puțin o dată
- testul se face la început, deci poate avea zero iterații
- are întotdeauna un număr cunoscut de iterații
- nu are nevoie de nicio condiție

Cum scrii în Scratch structura din pseudocod „cât timp (a > 0)”?
- repetă până când < (a) > (0) >
- repetă (a)
- la infinit
* repetă până când < nu < (a) > (0) > >
Explicație: „Repetă până când” se oprește când condiția devine adevărată, deci folosești negația lui a > 0.

Cu ce valoare pornește variabila P când calculezi produsul P = 1 × 2 × … × n?
- 0
* 1
- n
- 10
Explicație: Dacă P ar porni de la 0, orice înmulțire ar da 0.
```

```quiz puncte=15
# Item 3. Alege TOATE răspunsurile corecte. Fiecare întrebare are mai multe răspunsuri corecte.
Care dintre situațiile următoare se rezolvă cu o structură repetitivă cu contor?
* desenezi un hexagon regulat cu „repetă (6)”
- ceri parola până când utilizatorul o scrie corect
* calculezi suma 1 + 2 + … + n, pentru un n citit
- prințesa merge până atinge ursul

Care dintre condițiile următoare sunt adevărate pentru a = 8?
* a ≥ 8
- a > 8
* a ≠ 0
- a % 3 = 0

Care sunt caracteristici ale structurii repetitive „cât timp” (condiționată anterior)?
* condiția se verifică înainte de fiecare iterație
* poate avea zero iterații
- are întotdeauna cel puțin o iterație
* în secvență trebuie să se schimbe ceva din condiție, ca bucla să se oprească
```

```quiz puncte=25
# Item 4. Urmărește algoritmii și alege un singur răspuns corect.
Ce afișează algoritmul următor pentru a = 406? `cât timp (a > 0) execută: scrie a % 10; a ← a – a % 10; a ← a / 10`
- 4, 0, 6
* 6, 0, 4
- 6, 4
- 10
Explicație: Se afișează pe rând ultima cifră: 6 (a devine 40), 0 (a devine 4), 4 (a devine 0).

Ce valoare are S la finalul algoritmului? `S ← 0; pentru i ← 1, 6 execută S ← S + i`
- 6
- 15
- 36
* 21
Explicație: S = 1 + 2 + 3 + 4 + 5 + 6 = 21.

Ce afișează algoritmul următor? `i ← 1; cât timp (i ≤ 7) execută: scrie i; i ← i + 2`
* 1, 3, 5, 7
- 1, 3, 5
- 1, 2, 3, 4, 5, 6, 7
- 3, 5, 7, 9
Explicație: Pentru i = 7 condiția 7 ≤ 7 este adevărată, deci se afișează și 7; pentru i = 9 se iese.

Ce afișează algoritmul următor pentru a = 2507? `S ← 0; repetă: S ← S + a % 10; a ← a – a % 10; a ← a / 10; cât timp (a ≠ 0); scrie S`
- 2507
- 7
* 14
- 13
Explicație: Algoritmul calculează suma cifrelor: 7 + 0 + 5 + 2 = 14.

Ce figură desenează scriptul Scratch următor? `stilou jos; repetă (5): mergi 80 de pași, rotește-te stânga 72 de grade; stilou sus`
- un pătrat
* un pentagon regulat
- un hexagon regulat
- un triunghi echilateral
Explicație: Unghiul de rotire este 360° : numărul de laturi, iar 360° : 5 = 72°.
```

```adevarat-fals puncte=10
# Item 5. Stabilește dacă afirmațiile sunt adevărate (A) sau false (F).
A: Structura repetitivă condiționată posterior are cel puțin o iterație.
F: În Scratch există un bloc separat pentru operatorul ≥. | Scratch are doar <, > și =; a ≥ b se scrie nu < (a) < (b) >.
A: Expresia 783 % 10 are valoarea 3.
F: La structura cu contor, pasul este întotdeauna egal cu 1. | Pasul poate fi diferit de 1, chiar negativ.
A: Dacă secvența unei bucle „cât timp” nu schimbă nimic din condiția adevărată, bucla nu se mai oprește.
```

```completare puncte=10
# Item 6. Completează spațiile libere.
Negația condiției a > 0 este a [≤|<=] 0. Pentru a desena un hexagon regulat folosești „repetă ([6])” și te rotești cu [60] de grade.

Expresia 5274 % 10 are valoarea [4]. Pentru i = 10, algoritmul „repetă: scrie i; i ← i + 1; până când (i > 5)” afișează numărul [10].
```

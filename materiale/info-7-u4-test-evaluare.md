---
titlu: Test de evaluare – Unitatea 4: Limbajul de programare
disciplina: informatica
clasa: 7
categorie: algoritmi
tip: test
mod: profesor
timp: 40
unitate: Unitatea 4 · Limbajul de programare
ordine: 414
descriere: Test grilă pentru Unitatea 4: Code::Blocks, elementele limbajului C++, structurile liniară, alternativă și repetitive, cu secvențe de cod de evaluat, 17 întrebări grilă, 5 afirmații și o completare, 40 de minute.
data: 2026-11-10
---

Testul are 5 itemi, cu 90 de puncte. Se acordă 10 puncte din oficiu. Timp de lucru: 40 de minute. În toate secvențele de cod, variabilele sunt de tip `int`, dacă nu se precizează altfel.

```quiz puncte=20
# Item 1. Alege un singur răspuns corect pentru fiecare întrebare.
Ce face compilatorul?
- execută programul pas cu pas și afișează valorile variabilelor
* traduce codul sursă în cod mașină și semnalează erorile
- desenează schema logică a algoritmului
- salvează programul cu extensia .docx

Ce tastă compilează și rulează programul în Code::Blocks (Build and run)?
- F1
- F5
* F9
- Esc

Un program se compilează și pornește, dar pentru numerele 2 și 3 afișează suma 6 în loc de 5. Ce fel de greșeală are?
- eroare de compilare
- avertisment (warning)
- nu are nicio greșeală
* eroare de logică
Explicație: Compilatorul nu poate găsi o eroare de logică; o descoperi testând programul cu date pentru care știi rezultatul.

Care dintre următorii identificatori este scris corect în C++?
- `2nota`
* `nota_finala`
- `nota finala`
- `int`

Ce tip de date alegi pentru o variabilă care păstrează media generală a unui elev (de exemplu 9.45)?
* `double`
- `int`
- `char`
- `bool`

Care structură repetitivă execută instrucțiunile cel puțin o dată, deoarece verifică condiția după fiecare pas?
- `while`
- `for`
* `do … while`
- `if … else`

Ce componentă a unui robot culege informații din mediu, de exemplu distanța până la un obstacol?
- motorul
* senzorul
- controlerul
- bateria
```

```quiz puncte=30
# Item 2. Ce afișează fiecare secvență de cod? Alege un singur răspuns corect.
`int a = 23, b = 4; cout << a / b << " " << a % b;`
- `5.75 3`
- `3 5`
* `5 3`
- `5 0`
Explicație: Între întregi, `/` dă câtul (5), iar `%` dă restul (23 = 4 · 5 + 3).

`int n = 472; cout << n / 10 % 10;`
- `4`
* `7`
- `2`
- `47`
Explicație: `n / 10` este 47, iar `47 % 10` este 7, adică cifra din mijloc.

`int a = 5, b = 3; a = a + b; b = a - b; a = a - b; cout << a << " " << b;`
* `3 5`
- `5 3`
- `8 5`
- `8 3`
Explicație: a devine 8, b devine 8 - 3 = 5, apoi a devine 8 - 5 = 3: valorile s-au interschimbat.

`int x = 7; if (x > 5 && x % 2 == 0) cout << "A"; else cout << "B";`
- `A`
- `AB`
- nu afișează nimic
* `B`
Explicație: 7 > 5 este adevărat, dar 7 nu este par, deci condiția compusă cu `&&` este falsă.

`int n = 2035, s = 0; while (n != 0) { s = s + n % 10; n = n / 10; } cout << s;`
- `4`
* `10`
- `5302`
- `2035`
Explicație: Bucla adună cifrele: 5 + 3 + 0 + 2 = 10.

`for (int i = 2; i <= 10; i = i + 3) cout << i << " ";`
- `2 3 4 5 6 7 8 9 10`
- `3 6 9`
- `2 5 8 11`
* `2 5 8`
Explicație: După 8, i devine 11, iar condiția 11 <= 10 este falsă.

`int n = 0, nr = 0; do { nr++; n = n / 10; } while (n != 0); cout << nr;`
- `0`
* `1`
- `10`
- programul nu se oprește (buclă infinită)
Explicație: La `do … while`, instrucțiunile se execută o dată înainte de verificarea condiției.
```

```quiz puncte=15
# Item 3. Alege TOATE răspunsurile corecte (fiecare întrebare are mai multe răspunsuri corecte).
Care dintre următoarele condiții sunt adevărate pentru `x = 14`?
* `x % 2 == 0`
- `x > 20 && x < 30`
* `x >= 10 && x <= 99`
- `x % 3 == 0`

Care dintre următoarele secvențe interschimbă corect valorile variabilelor a și b?
* `aux = a; a = b; b = aux;`
- `a = b; b = a;`
* `aux = b; b = a; a = aux;`
- `aux = a; b = aux; a = b;`

Care dintre următoarele secvențe afișează exact `1 2 3`?
* `for (int i = 1; i <= 3; i++) cout << i << " ";`
- `for (int i = 1; i < 3; i++) cout << i << " ";`
- `int i = 3; while (i >= 1) { cout << i << " "; i--; }`
* `int i = 1; while (i <= 3) { cout << i << " "; i++; }`
```

```adevarat-fals puncte=10
# Item 4. Stabilește dacă afirmațiile sunt adevărate (A) sau false (F).
F: Instrucțiunea `if (a = 5)` verifică dacă a este egal cu 5. | `=` atribuie o valoare; comparația se scrie cu `==`.
A: La `while`, dacă la început condiția este falsă, instrucțiunile din buclă nu se execută deloc.
F: Un caracter se scrie în C++ între ghilimele, de exemplu `"M"`. | Un `char` se scrie între apostrofuri: `'M'`.
A: Bucla `for (int i = 1; i <= n; i++)` face exact n pași.
A: Dacă ambele numere sunt de tip `int`, expresia `7 / 2` are valoarea 3.
```

```completare puncte=15
# Item 5. Completează valorile expresiilor, pentru `int a = 17, b = 5;`.
Expresia `a / b` are valoarea [3], expresia `a % b` are valoarea [2], iar expresia `a + b * 2` are valoarea [27].
```

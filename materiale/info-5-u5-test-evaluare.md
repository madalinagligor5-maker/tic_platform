---
titlu: Test de evaluare – Unitatea 5: Algoritmi
disciplina: informatica
clasa: 5
categorie: algoritmi
tip: test
mod: profesor
timp: 40
unitate: Unitatea 5 · Algoritmi
ordine: 508
descriere: Test grilă pentru Unitatea 5: algoritmi și proprietățile lor, structura secvențială și alternativă, date, operatori, expresii și traseul datelor, 5 itemi (15 întrebări grilă), 40 de minute.
data: 2026-11-10
---

Testul are 5 itemi, în total 90 de puncte. Se acordă 10 puncte din oficiu. Timp de lucru: 40 de minute.

Amintește-ți: `/` este împărțirea întreagă (câtul), `%` este restul împărțirii întregi, iar `←` înseamnă „primește valoarea”.

```quiz puncte=24
# Item 1. Alege un singur răspuns corect.
Un algoritm este:
- o listă cu datele de intrare ale unei probleme
* o succesiune de operații, într-o ordine bine precizată, prin care rezolvi o problemă
- un dispozitiv care execută programe
- o expresie cu operatori logici

Enunțul „Scrieți numerele naturale pare.” nu poate fi un algoritm. Ce proprietate lipsește?
- claritatea
- unicitatea
* finitudinea
- generalitatea
Explicație: Numerele pare nu se termină niciodată; corect ar fi, de exemplu, „mai mici decât 1000”.

O rețetă spune: „Adaugă un vârf de cuțit de sare.” Ce proprietate a algoritmilor nu este respectată?
- eficiența
- finitudinea
- succesiunea determinată a pașilor
* unicitatea
Explicație: Fiecare pune altă cantitate, deci rezultatul nu este mereu același.

Ca să afli media a trei note, calculezi întâi suma notelor. Suma notelor este o dată de:
* manevră
- intrare
- ieșire
- tip text

Ce valori poate avea o dată logică?
- orice număr natural
* Adevărat sau Fals
- orice text
- doar numărul 0

Ce bloc al schemei logice are forma unui romb și două ieșiri, Da și Nu?
- blocul terminator
- blocul de citire
* blocul de decizie
- blocul de calcul
```

```quiz puncte=24
# Item 2. Evaluează și urmărește traseul datelor. Alege un singur răspuns corect.
Care este valoarea expresiei `17 % 5 + 3 * 2`?
- 10
- 3
- 6
* 8
Explicație: 17 % 5 = 2 și 3 * 2 = 6, apoi 2 + 6 = 8.

Pentru a = 10 și b = 30, care este valoarea expresiei `(a + b) / 4 - b % a`?
* 10
- 7
- 0
- 40
Explicație: (10 + 30) / 4 = 10, b % a = 30 % 10 = 0, iar 10 - 0 = 10.

Pentru x = 7, care expresie are valoarea Adevărat?
- `x % 2 = 0`
* `(x > 5) și (x < 10)`
- `x <> 7`
- `nu (x >= 7)`

Ce afișează algoritmul pentru a = 15 și b = 21? `citește a, b; dacă a >= b atunci mx ← a altfel mx ← b; scrie mx`
- 15
- 36
* 21
- 6
Explicație: 15 >= 21 este Fals, deci se execută ramura „altfel”: mx ← 21.

Ce afișează algoritmul pentru a = 12? `citește a; dacă a = 0 atunci scrie „Număr incorect” altfel P ← 4 * a, scrie P`
- 12
- 144
- Număr incorect
* 48

Paharul A are suc, paharul B are apă, iar paharul C este gol. Care este ordinea corectă a pașilor pentru a schimba între ele conținuturile paharelor A și B?
- torni A în B, torni B în A, torni C în A
* torni A în C, torni B în A, torni C în B
- torni B în C, torni C în A, torni A în B
- torni A în C, torni C în B, torni B în A
Explicație: Este regula celor 3 pahare: paharul gol C păstrează temporar sucul.
```

```quiz puncte=12
# Item 3. Alege TOATE răspunsurile corecte (fiecare întrebare are mai multe răspunsuri corecte).
Care dintre următoarele sunt proprietăți ale algoritmilor?
* claritatea
* generalitatea
- ambiguitatea
* finitudinea
- aleatorietatea

La bancomat se calculează suma rămasă cu formula `sr = si – e – c`, unde si este suma inițială de pe card, e este suma retrasă, iar c este comisionul, mereu 5 lei. Care dintre aceste date sunt variabile?
* si
* e
- c
* sr
Explicație: Comisionul c nu își schimbă valoarea, deci este o constantă.

P este o propoziție adevărată, iar Q este o propoziție falsă. Care expresii au valoarea Adevărat?
* `P sau Q`
- `P și Q`
* `nu Q`
- `nu P`
* `(P sau Q) și P`
```

```adevarat-fals puncte=15
# Item 4. Stabilește dacă afirmațiile sunt adevărate (A) sau false (F).
A: Într-un algoritm secvențial, pașii se execută unul după altul, în ordinea în care sunt scriși.
F: La structura „Dacă… Atunci” fără „Altfel”, dacă condiția este falsă se execută totuși acțiunea de după „Atunci”. | Dacă condiția este falsă, nu se face nimic.
A: În pseudocod, `x ← 5` înseamnă că variabila x primește valoarea 5.
F: Numele unei variabile se poate schimba pe parcursul algoritmului. | Numele rămâne același; se schimbă doar valoarea.
A: Condiția „vârsta este cel puțin 12 ani” se scrie `vârsta >= 12`.
```

```completare puncte=15
# Item 5. Completează spațiile libere.
Se dă algoritmul: `citește x; dacă x > 10 atunci y ← x / 2 altfel y ← x * 3; scrie y`. Pentru x = 20 se afișează [10]. Pentru x = 4 se afișează [12]. Pentru x = 10 se afișează [30].

Reprezentarea unui algoritm prin blocuri grafice legate prin săgeți se numește [schemă logică|schema logică]. Datele care nu își schimbă valoarea în timpul algoritmului se numesc [constante].
```

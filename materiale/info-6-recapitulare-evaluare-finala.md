---
titlu: Recapitulare și evaluare finală – Informatică și TIC, clasa a VI-a
disciplina: informatica
clasa: 6
categorie: algoritmi
tip: test
unitate: Proiect și evaluare finală
ordine: 801
descriere: Recapitularea și evaluarea finală a anului: prezentări, grafică 3D, e-mail și netichetă, structuri repetitive și programe Scratch.
data: 2026-10-15
---

## Recapitulare finală

1. Fă o prezentare de cel puțin **patru diapozitive** cu tema „Soluții pentru o învățare eficientă”. Apoi scrie un **e-mail** politicos prin care ceri înscrierea prezentării într-un concurs de idei.
2. Citește un număr natural **x > 45**. Afișează „Cifre în ordine crescătoare”, „Cifre în ordine descrescătoare”, „Cifrele sunt egale” sau „Cifre neordonate”. Exemple: 79 → crescătoare, 88 → egale.
3. Simulează în Scratch **împărțirea** lui a la b prin **scăderi repetate**: afișează câtul și restul.
4. Alege și rezolvă în Scratch: suma **7 + 15 + 23 + … + 863** cu structura condiționată anterior, sau **înmulțirea** lui a cu b prin **adunări repetate**.
5. Creează în Paint 3D un **decor de 480 × 360 px** și folosește-l într-un program Scratch.
6. Fă o animație și trimite-o pe e-mail prietenului A, cu adresa prietenului B la **CCI**. Vede A că ai trimis-o și lui B?

```quiz
# Ce afișează algoritmul?
Algoritmul: s ← 0, i ← 1, p ← 1; repetă (p ← p × i; s ← s + p; i ← i + 2) cât timp i < n; scrie s. Ce afișează pentru n = 6?
- 1
- 4
* 19
Explicație: i = 1: p = 1, s = 1. i = 3: p = 3, s = 4. i = 5: p = 15, s = 19. Apoi i = 7, iar 7 < 6 este fals, deci se oprește.

Ce afișează același algoritm pentru n = 0?
* 1
- 0
- nimic
Explicație: Structura are test final, deci pașii se execută o dată: p = 1, s = 1. Apoi i = 3, iar 3 < 0 este fals.
```

```completare
# Completează.
O structură [repetitivă|repetitiva] condiționată [anterior] se folosește când avem un număr necunoscut de repetări ale unor [instrucțiuni|instructiuni]. Ea repetă o secvență de instrucțiuni cât timp este îndeplinită o [condiție|conditie].
```

## Evaluare finală

Punctaj maxim: 100 de puncte, din care 10 din oficiu. Insuficient 0–49 · Suficient 50–69 · Bine 70–89 · Foarte bine 90–100.

```quiz
# Itemii 1, 2 și 7 (câte 10 puncte)
1. Ce valoare are NrPasi la final? Scriptul: setează NrPasi la 0; repetă (5): modifică NrPasi cu 2.
- 5
* 10
- 7

2. Care sunt medii grafice pentru modelare 3D sau animații?
* Paint 3D
* Toontastic
* Scratch
- Outlook

7. Care afirmație este adevărată?
- Nu îți poți trimite ție însuți un e-mail.
* Un program troian este dăunător calculatorului.
* Prietenii tăi pot vedea online un proiect CoSpaces distribuit de tine.
```

### Itemi scriși și practici

3. **(10 puncte)** Transformă structura condiționată anterior în structură condiționată posterior, astfel încât algoritmul să dea aceleași rezultate:

```
citește a, b   (numere naturale nenule)
c ← a + b
cât timp (c < 1000) execută
   a ← b
   b ← c
   c ← a + b
```

4. **(20 de puncte)** Un personaj rulează scriptul: „modifică x cu 50”, „modifică y cu -15”, „modifică x cu 25”. De la ce coordonate (x, y) trebuie să pornească, ca să ajungă la **(125, 105)**?

5. **(20 de puncte)** Scrie în Scratch un program care citește un număr natural **mai mare decât 234** și **mai mic decât 1 000 000** și afișează **produsul cifrelor lui pare**. Validează tipul și valoarea. Exemple: 1432 → **8**; 200 → „Valoare eronată!”; 3.5 → „Numărul nu este natural nenul!”.

6. **(10 puncte)** Un script setează **a = 1**, **b = 1**, apoi **repetă până când (condiție)**: „setează c la a + b”, „setează a la b”, „setează b la c”. Ce condiție pui ca la final **b** să fie **34**?

## Autoevaluarea activității

Notează în caiet, de la **1** (într-o foarte mare măsură) la **5** (deloc):

- Am participat cu plăcere la rezolvarea sarcinilor.
- Am participat cu plăcere la discuții și dezbateri.
- Am fost atent la activitățile din timpul orelor.
- Mi-a plăcut să lucrez în echipă.
- Am cerut ajutor când am avut nevoie.
- Am dus la bun sfârșit sarcinile de la Informatică și TIC.
- Am împărtășit colegilor rezultatele proiectelor mele.

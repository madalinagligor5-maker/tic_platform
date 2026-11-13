---
titlu: Recapitulare – Algoritmi și șiruri de valori
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: test
unitate: Unitatea 3 · Algoritmi
ordine: 314
descriere: Exerciții recapitulative și autoevaluare pentru Unitatea 3: structuri alternative și repetitive, algoritmi în robotică, generarea și parcurgerea șirurilor, verificare, numărare, căutare, minim, maxim, sumă și produs.
data: 2026-10-16
---

## Recapitulare

```cartonase
# Algoritmii cu șiruri de valori
Parcurgere = citești și prelucrezi elementele unul câte unul
Numărare = contor pornit de la 0, crește când elementul respectă condiția
Toate elementele = ok pornit de la 1, devine 0 la primul contraexemplu
Căutare = gasit pornit de la 0, devine 1 când găsești elementul
Maxim = pornești de la primul element și îl compari pe fiecare cu el
Sumă = pornește de la 0; produs = pornește de la 1
Media = suma împărțită la numărul elementelor, cu împărțire reală
```

```categorii
# Ce algoritm folosești?
Numărare: câți elevi au luat 10
Căutare: a participat Ana la concurs?
Toate elementele: au trecut toți elevii testul?
Maxim: cel mai bun punctaj
Sumă: totalul cheltuielilor
```

```quiz
# Ce afișează?
Programul numără elementele pare: șirul 5 2 8 3 6 1.
- 2
* 3
- 6

Programul afișează maximul și prima lui poziție (if x > maxim): șirul 4 11 7 11.
* 11 2
- 11 4
- 4 1

Programul afișează media elementelor: șirul 3 8 4.
- 15
* 5
- 4
```

```adevarat-fals
A: Șirul lui Fibonacci se generează din cei doi termeni anteriori.
F: Pentru „toate elementele sunt pozitive”, ok devine 1 la fiecare element pozitiv. | ok pornește de la 1 și devine 0 la primul element nepozitiv.
A: Un robot autonom repetă ciclul percepe – decide – acționează.
A: Produsul unui șir care conține 0 este 0.
```

## Același program în Python

Algoritmii cu șiruri de valori arată la fel și în **Python**. Un singur program care, într-o singură parcurgere, numără elementele pare, află maximul cu prima lui poziție și calculează media (exact cazurile din quiz):

```python
n = int(input())
x = int(input())
pare = 0
if x % 2 == 0:
    pare = 1
maxim = x
poz = 1
s = x
for i in range(2, n + 1):
    x = int(input())
    if x % 2 == 0:
        pare += 1
    if x > maxim:
        maxim = x
        poz = i
    s = s + x
print("Pare:", pare)
print("Maxim:", maxim, "pe pozitia", poz)
print(f"Media: {s / n:.2f}")
```

Același lucru, cu elementele păstrate într-o **listă**:

```python
sir = [4, 11, 7, 11]
pare = 0
for x in sir:                      # x ia pe rând fiecare element
    if x % 2 == 0:
        pare += 1
print("Pare:", pare)
print("Maxim:", max(sir), "pe pozitia", sir.index(max(sir)) + 1)
print(f"Media: {sum(sir) / len(sir):.2f}")
```

| Algoritm | C++ | Python |
|---|---|---|
| citirea unui element | `cin >> x;` | `x = int(input())` |
| parcurgere cu n dat | `for (int i = 1; i <= n; i++)` | `for i in range(1, n + 1):` |
| parcurgerea unei liste | `for (int i = 0; i < n; i++) … v[i]` | `for x in sir:` |
| numărare | `if (c) k++;` | `if c: k += 1` |
| toate elementele | `ok = 1;` … `ok = 0;` | `ok = True` … `ok = False` |
| căutare | `gasit = 0;` … `gasit = 1;` | `gasit = False` … `gasit = True` (sau `v in sir`) |
| maxim, minim | `if (x > maxim) maxim = x;` | la fel, sau `max(sir)`, `min(sir)` |
| sumă, produs | `s = 0; p = 1;` (`long long`) | `s = 0`, `p = 1` (fără limită), sau `sum(sir)` |
| media | `(double)s / n` | `s / n` |
| repetă … până când | `do { … } while (c);` | `while True:` … `if not c: break` |

```quiz
# Python
Ce afișează: sir = [5, 2, 8, 3, 6, 1], apoi print(sum(sir) / len(sir))?
- 4
* 4.166666666666667
- 25
Explicație: Suma este 25, lungimea 6; în Python, / dă rezultat real.

Ce face bucla for x in sir: din Python?
* ia pe rând fiecare element al listei sir
- citește n numere de la tastatură
- afișează lista
```

Încearcă programul în [Aplicații → Editor Python](#/aplicatii/python).

## Exersează

1. Citește n numere și afișează câte sunt palindroame și care este cel mai mare palindrom.
2. Citește numere până la 0 și afișează media celor pozitive și poziția primului număr negativ.
3. Citește n numere și verifică dacă șirul este o progresie aritmetică (diferența dintre vecini e mereu aceeași).
4. Afișează primii n termeni ai șirului 2, 5, 11, 23, … (fiecare termen este dublul celui anterior plus 1).

## Autoevaluare

Timp: 15 minute. Fiecare aplicație valorează 30 de puncte, plus 10 puncte din oficiu.

```ordonare
# 1. Ordonează programul care afișează câte elemente sunt mai mari decât primul
int n, x, prim, k = 0;
cin >> n >> prim;
for (int i = 2; i <= n; i++)
{
cin >> x;
if (x > prim) k++;
}
cout << k;
```

```quiz
# 2. Alege răspunsul corect.
Ce afișează pentru n = 4 și șirul 3 9 9 2? cin >> n >> ant; ok = 1; for (i = 2; i <= n; i++) { cin >> x; if (x < ant) ok = 0; ant = x; } cout << ok;
* 0
- 1
- 9

Cu ce valoare pornește variabila gasit la căutarea unui element?
* 0
- 1
- n
```

```completare
# 3. Completează.
Pentru șirul 6 2 9 2 5: suma este [24], minimul este [2], prima lui apariție este pe poziția [2], iar numărul de apariții ale lui 2 este [2].
```

**Cum te apreciezi?** 40 p · 70 p · 100 p. Scrie în caiet cum te simți: nemulțumit, mulțumit sau încântat.

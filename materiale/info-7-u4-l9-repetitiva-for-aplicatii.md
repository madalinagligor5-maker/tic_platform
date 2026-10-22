---
titlu: Structura repetitivă cu contor (II). Aplicații
disciplina: informatica
clasa: 7
categorie: algoritmi
tip: lectie
unitate: Unitatea 4 · Limbajul de programare
ordine: 409
descriere: Aplicații cu for: divizorii unui număr, numărul prim, maximul și minimul a n numere, numărarea după o condiție, for în for (desene din caractere, tabla înmulțirii) și șirul lui Fibonacci.
data: 2026-10-16
---

## Ce vei învăța azi

- să afli **divizorii** unui număr și să verifici dacă e **prim**;
- să afli **maximul** și **minimul** a n numere;
- să **numeri** valorile care respectă o condiție;
- să pui un **for în alt for**.

## Să ne amintim

`for (int i = 1; i <= n; i++)` face **n** pași. Suma pornește de la 0, produsul de la 1. Cu `cin >> x;` în buclă citești **n numere**.

## Lecția pe scurt

### Divizorii unui număr

`d` este divizor al lui `n` dacă `n % d == 0`:

```cpp
for (int d = 1; d <= n; d++)
    if (n % d == 0)
        cout << d << " ";
```

Pentru 12: `1 2 3 4 6 12`.

### Număr prim

Un număr este **prim** dacă are **exact doi divizori**: 1 și el însuși (2, 3, 5, 7, 11…). 1 nu este prim.

```cpp
int n, nrDiv = 0;
cin >> n;
for (int d = 1; d <= n; d++)
    if (n % d == 0)
        nrDiv++;
if (nrDiv == 2) cout << "prim";
else cout << "nu este prim";
```

### Numărarea după o condiție

Un **contor** pornește de la 0 și crește cu 1 de fiecare dată când condiția e îndeplinită:

```cpp
int n, x, pare = 0;
cin >> n;
for (int i = 1; i <= n; i++)
{
    cin >> x;
    if (x % 2 == 0) pare++;
}
cout << pare;
```

### Maximul a n numere

Primul număr citit devine „campionul”, apoi îl compari pe fiecare cu el:

```cpp
int n, x, maxim;
cin >> n >> x;
maxim = x;
for (int i = 2; i <= n; i++)
{
    cin >> x;
    if (x > maxim) maxim = x;
}
cout << maxim;
```

Pentru **minim**, schimbi `>` în `<`.

### for în for

Bucla din interior se execută **complet** la fiecare pas al buclei din exterior:

```cpp
for (int i = 1; i <= 4; i++)
{
    for (int j = 1; j <= i; j++)
        cout << "*";
    cout << endl;
}
```

Afișează un triunghi:

```text
*
**
***
****
```

## Exemplu rezolvat: șirul lui Fibonacci

Primii doi termeni sunt 1 și 1; fiecare termen următor este **suma celor doi dinaintea lui**: 1, 1, 2, 3, 5, 8, 13, 21… Afișează primii n termeni (n ≥ 2).

```cpp
#include <iostream>
using namespace std;

int main()
{
    int n, a = 1, b = 1, c;
    cin >> n;
    cout << a << " " << b << " ";
    for (int i = 3; i <= n; i++)
    {
        c = a + b;
        cout << c << " ";
        a = b;
        b = c;
    }
    return 0;
}
```

Pentru n = 8: `1 1 2 3 5 8 13 21`. Șirul apare în natură: la petalele florilor, la semințele de floarea-soarelui, la cochiliile melcilor.

## Aplicații interactive

```quiz
# Alege răspunsul corect.
Câți divizori are 18?
- 4
* 6
- 9

Ce afișează for-ul cu divizori pentru n = 7?
* 1 7
- 1 2 3 4 5 6 7
- 7

Câte steluțe afișează în total? for (i = 1; i <= 3; i++) for (j = 1; j <= 4; j++) cout << "*";
- 7
* 12
- 4
```

```categorii
# Prim sau nu?
Prim: 2, 13, 29, 41
Nu este prim: 1, 9, 21, 51
```

```ordonare
# Ordonează programul care află minimul a n numere
cin >> n >> x;
minim = x;
for (int i = 2; i <= n; i++)
{
cin >> x;
if (x < minim) minim = x;
}
cout << minim;
```

```adevarat-fals
A: Un număr prim are exact doi divizori.
F: Numărul 1 este prim. | 1 are un singur divizor.
A: La for în for, bucla interioară se execută complet la fiecare pas al buclei exterioare.
F: Al optulea termen din șirul lui Fibonacci este 34. | Este 21; 34 este al nouălea.
```

```completare
# Completează.
Divizorii lui 20 sunt 1, 2, 4, 5, 10 și [20]. Numărul 20 are [6] divizori. După 8 și 13, în șirul lui Fibonacci urmează [21].
```

## Exersează

1. Afișează divizorii **proprii** ai lui n (fără 1 și n).
2. Afișează toate numerele prime mai mici decât 50 (for în for).
3. Citește n numere și afișează **maximul** și **de câte ori** apare.
4. Citește n numere și afișează câte sunt **pozitive** și suma lor.
5. Desenează cu for în for un **pătrat** de n × n steluțe și apoi un **triunghi răsturnat**.
6. **Portofoliu:** un program care afișează **tabla înmulțirii** de la 1 la 10, sub formă de tabel, cu for în for.

## Verifică-te

- Cum verifici dacă un număr este prim?
- De ce, la maxim, for-ul pornește de la 2?

## Pe scurt

Cu for parcurgem posibilii **divizori** (`n % d == 0`); un număr **prim** are exact doi. Un **contor** numără valorile care respectă o condiție. **Maximul** și **minimul** se află comparând cu primul număr citit. Într-un **for în for**, bucla interioară rulează complet la fiecare pas al celei exterioare.

---
titlu: Verificarea unor proprietăți ale elementelor șirului de valori
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: lectie
unitate: Unitatea 3 · Algoritmi
ordine: 308
descriere: Verificarea, pentru fiecare element al unui șir, a unor proprietăți (par, divizibil, cifre, palindrom, prim, pătrat perfect) și afișarea elementelor care le respectă, cu poziția lor; proprietăți care folosesc elementul anterior.
data: 2026-10-16
---

## Ce vei învăța azi

- să verifici o **proprietate** pentru **fiecare element** al unui șir;
- să afișezi doar elementele care o **respectă**, împreună cu **poziția**;
- să folosești proprietăți mai complicate: **palindrom**, **prim**, **pătrat perfect**;
- să verifici proprietăți care leagă elementul de cel **anterior**.

## Să ne amintim

**Parcurgem** un șir citind elementele unul câte unul: `for (i = 1; i <= n; i++) { cin >> x; … }` sau până la o santinelă. Știi să afli **cifrele** unui număr, **oglinditul** lui și dacă e **prim**.

## Lecția pe scurt

### Schema generală

```cpp
for (int i = 1; i <= n; i++)
{
    cin >> x;
    if (proprietate(x))
        cout << x << " ";
}
```

**Proprietatea** este o condiție care poate fi **adevărată** sau **falsă** pentru fiecare element.

### Proprietăți simple (o condiție)

| Proprietate | Condiție C++ |
|---|---|
| par | `x % 2 == 0` |
| divizibil cu k | `x % k == 0` |
| ultima cifră este 5 | `x % 10 == 5` |
| are două cifre | `x >= 10 && x <= 99` |
| în intervalul a…b | `x >= a && x <= b` |

### Proprietăți care cer un calcul

Când proprietatea nu se poate scrie într-o singură condiție, faci întâi un **calcul** pentru elementul curent, cu o **copie** a lui (ca să nu-l strici):

- **palindrom**: calculezi oglinditul copiei și îl compari cu x;
- **prim**: numeri divizorii lui x;
- **suma cifrelor pară**: aduni cifrele copiei;
- **pătrat perfect**: cauți un k cu k · k == x.

```cpp
cin >> x;
int c = x, ogl = 0;           // copia lui x
while (c > 0) { ogl = ogl * 10 + c % 10; c = c / 10; }
if (ogl == x) cout << x << " ";
```

Atenție: variabilele de calcul (`ogl`, numărul de divizori) se **reinițializează pentru fiecare element**, în interiorul buclei!

### Proprietăți legate de elementul anterior

- „elementul este **mai mare decât cel dinainte**”;
- „elementul are **aceeași paritate** cu cel dinainte”: `x % 2 == ant % 2`;
- „suma cu elementul anterior este 10”.

## Exemplu rezolvat: numerele prime din șir, cu poziția lor

Se citesc n numere naturale. Afișează numerele prime și pozițiile lor.

```cpp
#include <iostream>
using namespace std;

int main()
{
    int n, x;
    cin >> n;
    for (int i = 1; i <= n; i++)
    {
        cin >> x;
        int nrDiv = 0;                      // se reinițializează pentru fiecare x
        for (int d = 1; d <= x; d++)
            if (x % d == 0) nrDiv++;
        if (nrDiv == 2)
            cout << x << " (pozitia " << i << ")" << endl;
    }
    return 0;
}
```

Pentru `6` și `4 7 9 13 1 2`: afișează **7 (pozitia 2)**, **13 (pozitia 4)**, **2 (pozitia 6)**.

## Aplicații interactive

```categorii
# Care numere au proprietatea?
Palindrom: 121, 7, 4554
Prim: 2, 17, 31
Pătrat perfect: 1, 49, 100
```

```quiz
# Alege răspunsul corect.
Ce afișează pentru șirul 15 22 35 40 dacă proprietatea este x % 10 == 5?
* 15 35
- 22 40
- 15 22 35 40

Unde trebuie inițializată variabila ogl, la verificarea palindroamelor dintr-un șir?
- o singură dată, înainte de for
* în interiorul for-ului, pentru fiecare element
- nu trebuie inițializată

De ce lucrăm cu o copie a lui x când îi calculăm oglinditul?
* ca după calcul să mai avem valoarea lui x, pentru comparare și afișare
- pentru că x nu poate fi împărțit
- ca programul să fie mai rapid
```

```ordonare
# Ordonează programul care afișează elementele cu două cifre
int n, x;
cin >> n;
for (int i = 1; i <= n; i++)
{
cin >> x;
if (x >= 10 && x <= 99) cout << x << " ";
}
```

```adevarat-fals
A: O proprietate este o condiție adevărată sau falsă pentru fiecare element.
F: Numărul 1 este prim. | 1 are un singur divizor.
A: Condiția x % 2 == ant % 2 verifică dacă x are aceeași paritate cu elementul anterior.
F: Variabila cu numărul de divizori se inițializează o singură dată, la începutul programului. | Se inițializează pentru fiecare element.
```

```completare
# Completează.
Din șirul 12 33 45 121 8, palindroamele sunt 33, [121] și [8]. Din șirul 6 9 16 20, pătratele perfecte sunt 9 și [16].
```

## Exersează

1. Citește n numere și afișează-le pe cele divizibile cu 3, dar nu cu 9.
2. Citește numere până la 0 și afișează-le pe cele cu **suma cifrelor pară**.
3. Citește n numere și afișează pătratele perfecte și pozițiile lor.
4. Citește n numere și afișează elementele **mai mari decât elementul anterior**.
5. Citește n numere și afișează-le pe cele care au **prima cifră egală cu ultima**.
6. **Portofoliu:** „Numerele norocoase”: un număr e norocos dacă are toate cifrele 4 sau 7 (de exemplu 47, 744). Citește n numere și afișează-le pe cele norocoase.

## Verifică-te

- Ce înseamnă să verifici o proprietate pentru elementele unui șir?
- De ce reinițializezi variabilele de calcul pentru fiecare element?

## Pe scurt

Pentru fiecare element al șirului verificăm o **proprietate** și îl afișăm (cu **poziția**) doar dacă o respectă. Proprietățile simple sunt o singură condiție; cele complexe (**palindrom**, **prim**, **pătrat perfect**) cer un calcul pe o **copie** a elementului, cu variabile **reinițializate** la fiecare element. Unele proprietăți folosesc elementul **anterior**.

---
titlu: Căutarea unui element în șir de valori. Verificarea existenței unui anume element
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: lectie
unitate: Unitatea 3 · Algoritmi
ordine: 311
descriere: Căutarea secvențială a unei valori într-un șir: indicatorul gasit, poziția primei și a ultimei apariții, numărul de apariții, căutarea primului element cu o proprietate și oprirea căutării la găsire.
data: 2026-10-16
---

## Ce vei învăța azi

- să verifici dacă o valoare **există** într-un șir;
- să afli **poziția** primei și a ultimei **apariții**;
- să afli **de câte ori** apare o valoare;
- să cauți **primul element** cu o proprietate.

## Să ne amintim

Pentru „**cel puțin un** element are proprietatea” folosim un indicator care pornește de la **0** și devine **1** când găsim un element bun. Poziția elementului citit este contorul `i` din `for`.

## Lecția pe scurt

### Căutarea secvențială

Se dă un șir și o valoare **v**. Vrem să știm dacă v apare în șir. Luăm elementele **pe rând**, de la primul, și le comparăm cu v. Așa se caută și numele tău într-o listă nesortată: citești numele unul câte unul.

```cpp
int n, v, x, gasit = 0;
cin >> n >> v;
for (int i = 1; i <= n; i++)
{
    cin >> x;
    if (x == v)
        gasit = 1;
}
if (gasit) cout << "DA";
else cout << "NU";
```

### Poziția primei apariții

Ținem minte poziția **doar prima dată** când găsim valoarea:

```cpp
int poz = 0;                       // 0 = nu a fost găsită
for (int i = 1; i <= n; i++)
{
    cin >> x;
    if (x == v && poz == 0)
        poz = i;
}
if (poz != 0) cout << "Prima aparitie: " << poz;
else cout << "Nu apare";
```

### Poziția ultimei apariții

Actualizăm poziția **de fiecare dată** când găsim valoarea; la final rămâne ultima:

```cpp
if (x == v) poz = i;
```

### Numărul de apariții

Este o **numărare**: `if (x == v) k++;`. Valoarea există dacă `k > 0`.

### Primul element cu o proprietate

În loc de `x == v`, poți căuta orice proprietate: primul număr par, primul număr prim, primul număr mai mare decât 100.

### Oprirea căutării

Când nu mai trebuie citite celelalte valori (de exemplu, șirul vine pe rând și ne interesează doar prima apariție), putem **opri bucla** imediat ce găsim elementul, cu `while`:

```cpp
int i = 1, gasit = 0;
while (i <= n && gasit == 0)
{
    cin >> x;
    if (x == v) gasit = 1;
    else i++;
}
if (gasit) cout << "Gasit pe pozitia " << i;
```

## Exemplu rezolvat: unde apare numărul norocos?

Se citesc n și v, apoi n numere. Afișează de câte ori apare v, pozițiile primei și ultimei apariții, sau „Nu apare”.

```cpp
#include <iostream>
using namespace std;

int main()
{
    int n, v, x, k = 0, prima = 0, ultima = 0;
    cin >> n >> v;
    for (int i = 1; i <= n; i++)
    {
        cin >> x;
        if (x == v)
        {
            k++;
            if (prima == 0) prima = i;
            ultima = i;
        }
    }
    if (k == 0) cout << "Nu apare";
    else cout << k << " aparitii, prima pe pozitia " << prima << ", ultima pe pozitia " << ultima;
    return 0;
}
```

Pentru n = 7, v = 4 și șirul `3 4 8 4 1 4 9`: **3 aparitii, prima pe pozitia 2, ultima pe pozitia 6**.

## Aplicații interactive

```quiz
# Alege răspunsul corect.
Pe ce poziție apare prima dată 5 în șirul 2 9 5 7 5?
- 2
* 3
- 5

Ce valoare are poz la final, dacă folosim if (x == v) poz = i; pentru v = 5 și șirul 2 9 5 7 5?
- 3
* 5
- 2

Cum știi la final că valoarea nu a fost găsită?
* poz a rămas 0 (sau gasit a rămas 0)
- poz este n
- programul se oprește singur
```

```categorii
# Ce instrucțiune folosești?
Prima apariție: if (x == v && poz == 0) poz = i;
Ultima apariție: if (x == v) poz = i;
Numărul de apariții: if (x == v) k++;
```

```ordonare
# Ordonează programul care afișează poziția primului număr par
int n, x, poz = 0;
cin >> n;
for (int i = 1; i <= n; i++)
{
cin >> x;
if (x % 2 == 0 && poz == 0) poz = i;
}
cout << poz;
```

```adevarat-fals
A: Căutarea secvențială compară valoarea căutată cu fiecare element, pe rând.
F: Pentru ultima apariție, poziția se reține doar prima dată când găsim valoarea. | Pentru ultima apariție se actualizează la fiecare găsire.
A: O valoare există în șir dacă numărul aparițiilor ei este mai mare decât 0.
A: Căutarea se poate opri cu while imediat ce elementul a fost găsit.
```

```completare
# Completează.
În șirul 6 1 6 3 6, valoarea 6 apare de [3] ori; prima apariție este pe poziția [1], iar ultima pe poziția [5].
```

## Exersează

1. Citește n numere și o valoare v; afișează „DA” dacă v apare în șir.
2. Citește n numere și afișează poziția **primului** număr negativ (sau 0 dacă nu există).
3. Citește n numere și afișează poziția **ultimului** număr prim.
4. Citește numere până la 0 și afișează dacă a apărut numărul 13 și de câte ori.
5. Citește n numere și afișează dacă există **două elemente vecine egale** și pe ce poziții sunt primele.
6. **Portofoliu:** „Biletul câștigător”: se citesc codurile a n bilete vândute și codul câștigător. Afișează al câtelea bilet vândut a câștigat sau „Niciun bilet câștigător”.

## Verifică-te

- Cum afli poziția primei apariții? Dar a ultimei?
- Ce valoare are poz dacă elementul nu a fost găsit?

## Pe scurt

**Căutarea secvențială** compară pe rând fiecare element cu valoarea căutată. Un indicator (`gasit`) spune dacă elementul **există**. Pentru **prima apariție** reținem poziția doar când `poz == 0`; pentru **ultima**, o actualizăm la fiecare găsire. **Numărul de apariții** se află cu un contor. Cu `while` putem **opri** căutarea când am găsit elementul.

---
titlu: Structura repetitivă – recapitulare
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: lectie
unitate: Unitatea 3 · Algoritmi
ordine: 302
descriere: Recapitularea structurilor repetitive while, do … while și for, alegerea structurii potrivite, transformarea dintr-una în alta și algoritmi clasici: cifrele unui număr, divizori, număr prim, cmmdc.
data: 2026-10-16
---

## Ce vei învăța azi

- să reamintești cele trei **structuri repetitive** din C++;
- să alegi structura **potrivită** pentru o problemă;
- să **transformi** o structură în alta;
- să aplici **algoritmii clasici**: cifre, divizori, prim, cmmdc.

## Să ne amintim

O structură repetitivă execută aceiași pași de mai multe ori. Fiecare execuție este o **iterație**. Bucla trebuie să se oprească: în ea se modifică ceva din condiție.

## Lecția pe scurt

### Cele trei structuri

| Pseudocod | C++ | Particularitate |
|---|---|---|
| `cât timp c execută` | `while (c) { … }` | verifică **înainte**; poate executa de 0 ori |
| `execută … cât timp c` | `do { … } while (c);` | verifică **după**; execută cel puțin o dată |
| `pentru i ← a, b execută` | `for (i = a; i <= b; i++) { … }` | număr **cunoscut** de pași |

### Care se potrivește?

- **for**: știi de câte ori repeți (de la 1 la n, n numere citite, divizorii de la 1 la n);
- **while**: repeți cât timp e îndeplinită o condiție, fără să știi de câte ori (cifrele unui număr, citire până la 0);
- **do … while**: pașii trebuie executați măcar o dată (validarea datelor, meniuri).

### Transformarea for ↔ while

```cpp
for (int i = 1; i <= n; i++)       int i = 1;
    cout << i;                      while (i <= n) { cout << i; i++; }
```

Orice for se poate scrie cu while; un while se poate scrie cu for doar dacă îi cunoaștem numărul de pași.

### Algoritmi clasici

| Problemă | Idee |
|---|---|
| cifrele lui n | `while (n != 0) { c = n % 10; …; n = n / 10; }` |
| divizorii lui n | `for (d = 1; d <= n; d++) if (n % d == 0) …` |
| n este prim | are exact 2 divizori |
| cmmdc(a, b) | Euclid: `while (b != 0) { r = a % b; a = b; b = r; }` → a |
| suma 1 + 2 + … + n | `s = 0; for (i = 1; i <= n; i++) s = s + i;` |

## Exemplu rezolvat: cel mai mare divizor comun (Euclid prin împărțiri)

```cpp
#include <iostream>
using namespace std;

int main()
{
    int a, b, r;
    cin >> a >> b;
    while (b != 0)
    {
        r = a % b;
        a = b;
        b = r;
    }
    cout << "cmmdc = " << a;
    return 0;
}
```

Pentru 84 și 36:

| a | b | r = a % b |
|---|---|---|
| 84 | 36 | 12 |
| 36 | 12 | 0 |
| 12 | 0 | – |

**cmmdc = 12**. Varianta cu împărțiri face mult mai puțini pași decât cea cu scăderi.

## Aplicații interactive

```categorii
# Ce structură repetitivă alegi?
for: afișarea numerelor de la 1 la 100
while: suma cifrelor unui număr
do … while: citirea unei note până e între 1 și 10
```

```quiz
# Alege răspunsul corect.
Ce afișează? int s = 0; for (int i = 2; i <= 8; i = i + 2) s = s + i; cout << s;
- 8
* 20
- 36

Ce afișează pentru n = 2508? int k = 0; while (n > 0) { if (n % 10 == 0) k++; n = n / 10; } cout << k;
* 1
- 2
- 4

Cât este cmmdc(48, 18)?
- 3
* 6
- 9
```

```ordonare
# Ordonează programul care afișează suma cifrelor lui n
int n, s = 0;
cin >> n;
while (n != 0)
{
s = s + n % 10;
n = n / 10;
}
cout << s;
```

```adevarat-fals
A: Orice for se poate rescrie cu while.
F: Bucla do … while poate să nu se execute niciodată. | Se execută cel puțin o dată.
A: La algoritmul lui Euclid prin împărțiri, rezultatul este ultimul rest nenul.
A: Un număr prim are exact doi divizori.
```

```completare
# Completează.
Bucla for (int i = 5; i <= 15; i++) face [11] pași. Pentru a = 20 și b = 8, cmmdc este [4]. Numărul 2508 are [4] cifre.
```

## Exersează

1. Afișează numerele de la n la 1, o dată cu for și o dată cu while.
2. Citește n și afișează cea mai mare cifră a lui.
3. Citește n și afișează suma divizorilor lui.
4. Citește două numere și afișează cmmdc și cmmmc (cmmmc = a · b / cmmdc).
5. Citește n și afișează toate numerele prime mai mici sau egale cu n.
6. **Portofoliu:** un program cu meniu (do … while) care, pentru un număr citit, afișează la alegere: numărul de cifre, suma divizorilor sau dacă e prim.

## Verifică-te

- Ce diferență este între while și do … while?
- Cum afli cmmdc a două numere?

## Pe scurt

Structurile repetitive sunt **while** (verifică înainte), **do … while** (execută cel puțin o dată) și **for** (număr cunoscut de pași). Alegi structura după problemă. Algoritmi clasici: prelucrarea **cifrelor** (`% 10`, `/ 10`), **divizorii**, numărul **prim** și **cmmdc** prin algoritmul lui **Euclid**.

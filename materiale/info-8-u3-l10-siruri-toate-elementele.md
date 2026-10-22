---
titlu: Verificarea îndeplinirii unor proprietăți de către toate elementele unui șir
disciplina: informatica
clasa: 8
categorie: algoritmi
tip: lectie
unitate: Unitatea 3 · Algoritmi
ordine: 310
descriere: Verificarea dacă toate elementele unui șir au o proprietate, cu o variabilă-indicator (ok) sau prin numărare, șiruri crescătoare și constante, plus diferența dintre „toate” și „cel puțin unul”.
data: 2026-10-16
---

## Ce vei învăța azi

- să verifici dacă **toate** elementele unui șir au o proprietate;
- să folosești o **variabilă-indicator** (`ok`);
- să verifici dacă un șir e **crescător** sau **constant**;
- diferența dintre „**toate**” și „**cel puțin unul**”.

## Să ne amintim

Știi să verifici o proprietate pentru fiecare element și să **numeri** elementele care o respectă, cu un contor inițializat cu 0.

## Lecția pe scurt

### Ideea: un singur contraexemplu ajunge

Ca să spui că „**toate** numerele sunt pare”, trebuie să verifici fiecare element. Ca să spui că **nu** sunt toate pare, ajunge **un singur** element impar (un **contraexemplu**).

### Metoda 1: variabila-indicator (ok)

Presupunem la început că proprietatea e **adevărată** (`ok = 1`). Dacă găsim un element care **nu** o respectă, schimbăm `ok = 0`. La final, `ok` ne spune răspunsul.

```cpp
int n, x, ok = 1;            // presupunem că toate sunt pare
cin >> n;
for (int i = 1; i <= n; i++)
{
    cin >> x;
    if (x % 2 != 0)          // contraexemplu: element impar
        ok = 0;
}
if (ok == 1) cout << "DA";
else cout << "NU";
```

Atenție:

- condiția din if este **negația** proprietății (căutăm elementul „rău”);
- `ok` **nu** se pune înapoi pe 1: odată găsit un contraexemplu, răspunsul rămâne NU;
- citim **toate** elementele până la capăt, chiar dacă am aflat deja răspunsul (ca să nu rămână valori necitite).

Se poate folosi și tipul `bool`: `bool ok = true;` … `ok = false;`.

### Metoda 2: prin numărare

Numeri elementele care **au** proprietatea; toate o au dacă **k == n**.

### Șir crescător, șir constant

Proprietăți care leagă elementul de cel **anterior**:

- **strict crescător**: fiecare element e mai mare decât cel dinainte; contraexemplu: `x <= ant`;
- **constant** (toate egale): contraexemplu: `x != ant`.

```cpp
cin >> n >> ant;
int ok = 1;
for (int i = 2; i <= n; i++)
{
    cin >> x;
    if (x <= ant) ok = 0;
    ant = x;
}
```

### „Toate” sau „cel puțin unul”?

| Întrebare | Pornești cu | Schimbi când |
|---|---|---|
| Toate au proprietatea? | `ok = 1` | găsești un element care **nu** o are → `ok = 0` |
| Cel puțin unul o are? | `gasit = 0` | găsești un element care **o are** → `gasit = 1` |

## Exemplu rezolvat: toate notele sunt de trecere?

Se citesc n note. Afișează „Promovat la toate” dacă toate notele sunt cel puțin 5; altfel, afișează câte note sub 5 sunt.

```cpp
#include <iostream>
using namespace std;

int main()
{
    int n, nota, ok = 1, sub5 = 0;
    cin >> n;
    for (int i = 1; i <= n; i++)
    {
        cin >> nota;
        if (nota < 5)
        {
            ok = 0;
            sub5++;
        }
    }
    if (ok) cout << "Promovat la toate";
    else cout << "Note sub 5: " << sub5;
    return 0;
}
```

Pentru `5` și `7 9 4 10 3`: **Note sub 5: 2**. Pentru `3` și `6 8 5`: **Promovat la toate**.

## Aplicații interactive

```quiz
# Alege răspunsul corect.
Cu ce valoare pornești ok, când verifici dacă toate elementele au o proprietate?
* 1 (presupui că da)
- 0
- n

Pentru proprietatea „toate sunt pozitive”, ce condiție schimbă ok în 0?
- x > 0
* x <= 0
- x == 0

Șirul 2 5 5 9 este strict crescător?
- da
* nu, pentru că 5 nu este mai mare decât 5
- nu se poate ști
```

```categorii
# Este adevărat pentru șirul 12 18 24 30?
Adevărat: toate sunt pare, toate sunt de două cifre, șirul este strict crescător
Fals: toate sunt divizibile cu 4, șirul este constant
```

```ordonare
# Ordonează programul care verifică dacă toate elementele au ultima cifră 0
int n, x, ok = 1;
cin >> n;
for (int i = 1; i <= n; i++)
{
cin >> x;
if (x % 10 != 0) ok = 0;
}
if (ok == 1) cout << "DA"; else cout << "NU";
```

```adevarat-fals
A: Un singur contraexemplu arată că nu toate elementele au proprietatea.
F: După ce ok a devenit 0, la următorul element bun ok se face din nou 1. | ok rămâne 0 până la final.
A: Toate elementele au proprietatea dacă numărul celor care o au este egal cu n.
A: Pentru „cel puțin unul”, indicatorul pornește de la 0.
```

```completare
# Completează.
Pentru șirul 3 3 3 3, proprietatea „șir constant” este [adevărată|adevarata], iar „strict crescător” este [falsă|falsa]. Ca să verifici dacă toate elementele sunt pare, ok devine 0 când x % 2 [!=] 0.
```

## Exersează

1. Citește n numere și verifică dacă toate sunt de trei cifre.
2. Citește numere până la 0 și verifică dacă toate sunt prime.
3. Citește n numere și verifică dacă șirul e **descrescător** (nu neapărat strict).
4. Citește n numere și verifică dacă **cel puțin unul** este pătrat perfect.
5. Citește n numere și verifică dacă toate au **aceeași paritate** cu primul element.
6. **Portofoliu:** „Parola sigură”: o parolă numerică e sigură dacă are cel puțin 6 cifre și **toate cifrele sunt diferite de cifra anterioară**. Citește un număr și afișează dacă e o parolă sigură.

## Verifică-te

- Cum folosești variabila ok?
- Prin ce diferă verificarea „toate” de verificarea „cel puțin unul”?

## Pe scurt

Ca să verificăm dacă **toate** elementele au o proprietate, presupunem că da (`ok = 1`) și căutăm un **contraexemplu**; dacă îl găsim, `ok = 0` și rămâne așa. Altă metodă: numărăm elementele bune și comparăm cu **n**. Pentru **șir crescător** sau **constant** comparăm cu elementul **anterior**. La „**cel puțin unul**”, indicatorul pornește de la 0.

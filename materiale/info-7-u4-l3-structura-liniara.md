---
titlu: Structura liniară
disciplina: informatica
clasa: 7
categorie: algoritmi
tip: lectie
unitate: Unitatea 4 · Limbajul de programare
ordine: 403
descriere: Citirea cu cin, afișarea cu cout și endl, atribuirea, ordinea instrucțiunilor, interschimbarea a două variabile, plus programe liniare cu calcule: perimetre, medii, cifrele unui număr.
data: 2026-10-16
---

## Ce vei învăța azi

- să **citești** date cu `cin` și să **afișezi** cu `cout`;
- să folosești **atribuirea**;
- să scrii programe în care instrucțiunile se execută **una după alta**;
- să **interschimbi** valorile a două variabile.

## Să ne amintim

**Structura liniară** (secvențială) execută pașii **în ordine**, fiecare o singură dată. În pseudocod: `citește a, b`, `s ← a + b`, `scrie s`.

## Lecția pe scurt

### Citirea: cin

```cpp
int a, b;
cin >> a >> b;     // citește două numere de la tastatură
```

Săgețile `>>` arată spre variabilă: valoarea **intră** în ea. Când rulezi, scrii numerele în consolă, separate prin spațiu sau Enter.

### Afișarea: cout

```cpp
cout << "Suma este " << a + b << endl;
```

- textul între **ghilimele** se afișează exact cum e scris;
- o **expresie** fără ghilimele se calculează și se afișează valoarea ei;
- `endl` (sau `"\n"`) trece la **rând nou**;
- săgețile `<<` arată spre `cout`: valorile **ies** spre ecran.

Pune un mesaj înainte de citire, ca utilizatorul să știe ce să scrie: `cout << "Dati latura: ";`.

### Atribuirea

`variabila = expresie;` calculează întâi expresia din dreapta, apoi pune rezultatul în variabila din stânga. `x = x + 1;` înseamnă „mărește x cu 1” (se poate scrie și `x++;`). Alte scurtături: `s += 5;` înseamnă `s = s + 5;`.

### Pseudocod și C++

| Pseudocod | C++ |
|---|---|
| `citește a` | `cin >> a;` |
| `scrie a` | `cout << a;` |
| `a ← b + 1` | `a = b + 1;` |
| `a div b` | `a / b` (întregi) |
| `a mod b` | `a % b` |

### Interschimbarea a două variabile

Ca să schimbi conținutul a două pahare, ai nevoie de un **al treilea pahar gol**. La fel, folosim o variabilă auxiliară `aux`:

```cpp
aux = a;
a = b;
b = aux;
```

Dacă ai scrie doar `a = b; b = a;`, ambele ar ajunge să aibă valoarea lui b!

## Exemplu rezolvat: dreptunghiul

Se citesc lungimea și lățimea unui dreptunghi (numere naturale). Afișează perimetrul și aria.

```cpp
#include <iostream>
using namespace std;

int main()
{
    int L, l, P, A;
    cout << "Lungimea: ";
    cin >> L;
    cout << "Latimea: ";
    cin >> l;
    P = 2 * (L + l);
    A = L * l;
    cout << "Perimetrul = " << P << endl;
    cout << "Aria = " << A << endl;
    return 0;
}
```

Pentru L = 8 și l = 5: **Perimetrul = 26**, **Aria = 40**.

### Al doilea exemplu: suma cifrelor unui număr de trei cifre

```cpp
int n, s;
cin >> n;
s = n / 100 + n / 10 % 10 + n % 10;
cout << s;
```

Pentru 472: 4 + 7 + 2 = **13**.

## Aplicații interactive

```ordonare
# Ordonează instrucțiunile programului care afișează media a două note
int main()
{
double n1, n2, m;
cin >> n1 >> n2;
m = (n1 + n2) / 2;
cout << m;
return 0;
}
```

```quiz
# Alege răspunsul corect.
Ce afișează: a = 5; b = 3; a = a + b; b = a - b; cout << a << " " << b;
* 8 5
- 5 3
- 8 3

Ce afișează: cout << "3 + 4" << " = " << 3 + 4;
- 7 = 7
* 3 + 4 = 7
- 3 + 4 = 3 + 4

Ce instrucțiuni interschimbă corect valorile lui a și b?
- a = b; b = a;
* aux = a; a = b; b = aux;
- aux = a; b = aux; a = b;
```

```adevarat-fals
A: Instrucțiunea cin >> x; pune în x valoarea scrisă la tastatură.
F: Instrucțiunea x = x + 1; este o greșeală, pentru că x nu poate fi egal cu x + 1. | E o atribuire: x primește valoarea veche plus 1.
A: Textul scris între ghilimele se afișează exact cum este scris.
F: endl citește un număr nou. | endl trece la rând nou la afișare.
```

```categorii
# Citire, atribuire sau afișare?
Citire: cin >> a;
Atribuire: s = a + b;
Afișare: cout << s;
```

```completare
# Completează programul care afișează dublul unui număr.
int x; cin [>>] x; cout [<<] 2 * x;
```

## Exersează

1. Citește latura unui pătrat și afișează perimetrul și aria.
2. Citește vârsta ta și afișează în ce an vei împlini 18 ani (folosește anul curent).
3. Citește un număr de minute și afișează câte ore și câte minute sunt (de exemplu, 135 → 2 ore și 15 minute).
4. Citește un număr de trei cifre și afișează numărul **răsturnat** (472 → 274).
5. Citește două numere, interschimbă-le și afișează-le.
6. **Portofoliu:** un program care citește prețul unui produs și cantitatea, apoi afișează totul ca pe un **bon**: produs, cantitate, preț, total.

## Verifică-te

- Ce face `cin`? Dar `cout`?
- De ce ai nevoie de `aux` la interschimbare?

## Pe scurt

În **structura liniară**, instrucțiunile se execută **în ordine**. Citim cu `cin >>`, afișăm cu `cout <<` (iar `endl` trece la rând nou) și calculăm cu **atribuirea** `variabila = expresie;`. Pentru **interschimbare** folosim o variabilă **auxiliară**.

---
titlu: Limbajul C++. Elemente de bază
disciplina: informatica
clasa: 7
categorie: programare
tip: lectie
unitate: Unitatea 4 · Limbajul de programare
ordine: 402
descriere: Structura unui program C++, identificatori, tipuri de date (int, double, char, bool), declararea variabilelor și constantelor, operatori aritmetici (inclusiv / și %), relaționali și logici, expresii și comentarii.
data: 2026-10-16
---

> **Competențe specifice (Anexa 15):** CS 1.4, CS 2.1, CS 2.2

## Ce vei învăța azi

- să explici fiecare rând al unui **program C++**;
- să **declari** variabile de tipurile **int**, **double**, **float**, **char**, **bool** și să cunoști **domeniul** fiecăruia;
- să folosești **operatorii** aritmetici, relaționali și logici;
- să calculezi **expresii**, inclusiv cu **/** și **%**.

## Să ne amintim

În pseudocod ai lucrat cu **variabile** (o „cutie” cu nume, în care se pune o valoare), cu **constante** și cu **expresii**: `a ← 5`, `s ← a + b`. Ai folosit **div** (câtul) și **mod** (restul).

## Lecția pe scurt

### Structura unui program

```cpp
#include <iostream>      // biblioteca pentru citire și afișare
using namespace std;     // ca să scriem cout în loc de std::cout

int main()               // aici începe programul
{
    // instrucțiunile programului
    return 0;            // programul s-a încheiat fără probleme
}
```

- `#include <iostream>` aduce instrucțiunile **cin** (citire) și **cout** (afișare);
- **main** este **funcția principală**; execuția începe cu prima ei instrucțiune;
- textul de după `//` este un **comentariu**: compilatorul îl ignoră, dar pe tine te ajută să înțelegi codul;
- C++ face diferența între **litere mari și mici**: `Main` nu este `main`.

### Identificatori

Numele variabilelor se numesc **identificatori**. Reguli: conțin **litere**, **cifre** și **_**, **nu încep cu o cifră**, nu au spații sau diacritice și nu sunt cuvinte rezervate (`int`, `return`…). Corecte: `suma`, `nr_elevi`, `x1`. Greșite: `1x`, `nr elevi`, `int`.

### Tipuri de date

| Tip | Ce păstrează | Exemple |
|---|---|---|
| `int` | numere întregi | 7, -150, 2024 |
| `double` | numere reale (cu virgulă) | 3.14, -0.5 |
| `char` | un singur caracter | 'A', '7', '?' |
| `bool` | adevărat sau fals | true, false |

În C++ virgula zecimală se scrie cu **punct**: `3.14`.

### Domeniul de valori al tipurilor

Fiecare tip ocupă un anumit loc în memorie (măsurat în **octeți**) și, de aceea, poate păstra doar valori dintr-un anumit **domeniu**. Valorile de mai jos sunt cele obișnuite în Code::Blocks (compilatorul GCC):

| Tip | Memorie | Domeniu (aproximativ) | Când îl folosești |
|---|---|---|---|
| `int` | 4 octeți | de la −2 147 483 648 la 2 147 483 647 (circa ±2 miliarde) | numere întregi obișnuite: vârste, note întregi, ani, punctaje |
| `long long` | 8 octeți | circa ±9,2 · 10¹⁸ | întregi foarte mari: factoriale, populația lumii în secunde |
| `float` | 4 octeți | circa ±3,4 · 10³⁸, cu **6–7 cifre** exacte | numere reale, când precizia mică ajunge |
| `double` | 8 octeți | circa ±1,7 · 10³⁰⁸, cu **15–16 cifre** exacte | numere reale: medii, măsurători de fizică (alegerea obișnuită) |
| `char` | 1 octet | un caracter; intern, un cod între −128 și 127 (codul **ASCII**: 'A' = 65, 'a' = 97, '0' = 48) | o literă, o cifră scrisă ca semn, un simbol |
| `bool` | 1 octet | doar `true` (1) sau `false` (0) | răspunsuri da/nu: „e par?”, „a ghicit?” |

Ce trebuie să reții:

- dacă un calcul cu `int` depășește domeniul (de exemplu `2000000000 + 2000000000`), apare **depășirea** (*overflow*): rezultatul este greșit, fără niciun mesaj de eroare. Atunci folosești `long long`;
- `float` și `double` păstrează numerele reale **aproximativ**: `0.1 + 0.2` nu dă exact `0.3`, ci `0.30000000000000004`. De aceea preferăm `double`, care e mai precis;
- un caracter se scrie între **apostrofuri**: `'A'`; textul între ghilimele (`"A"`) este un **șir de caractere**, nu un `char`;
- `cout` afișează o variabilă `bool` ca **1** (true) sau **0** (false).

### Declararea variabilelor și a constantelor

```cpp
int a, b;              // două variabile întregi
double medie = 9.50;   // declarare cu valoare inițială
char litera = 'M';
const double PI = 3.14159;   // constantă: nu se mai poate schimba
```

**Atribuirea** se scrie cu `=` (în pseudocod era `←`): `a = 5;` înseamnă „pune 5 în a”.

### Operatori aritmetici

`+` adunare, `-` scădere, `*` înmulțire, `/` împărțire, `%` restul împărțirii.

- dacă ambii operanzi sunt **int**, `/` dă **câtul întreg**: `17 / 5` este `3`;
- `17 % 5` este `2` (restul); `%` merge doar cu **întregi**;
- dacă măcar un operand e real, rezultatul e real: `17.0 / 5` este `3.4`.

Ordinea: întâi `*`, `/`, `%`, apoi `+`, `-`; parantezele schimbă ordinea.

### Operatori relaționali și logici

- relaționali: `<`, `<=`, `>`, `>=`, `==` (egal), `!=` (diferit). Atenție: `==` compară, `=` atribuie!
- logici: `&&` (**și**), `||` (**sau**), `!` (**negație**).

Exemplu: `x >= 1 && x <= 10` este adevărat dacă x e între 1 și 10.

### Trucuri cu / și %

Pentru un număr `n` de trei cifre, de exemplu 472:

- ultima cifră: `n % 10` → 2;
- fără ultima cifră: `n / 10` → 47;
- prima cifră: `n / 100` → 4;
- cifra din mijloc: `n / 10 % 10` → 7;
- `n` este par dacă `n % 2 == 0`.

![Între numere întregi, 17 / 5 dă câtul 3, iar 17 % 5 dă restul 2; tot cu / și % obții cifrele numărului 472.](fisiere/imagini/info-7-u4-l2-cpp-elemente-de-baza.svg)

## Exemplu rezolvat: calculează expresiile

Fie `int a = 23, b = 4;`

| Expresie | Valoare | De ce |
|---|---|---|
| `a / b` | 5 | câtul întreg |
| `a % b` | 3 | 23 = 4 · 5 + 3 |
| `a + b * 2` | 31 | întâi înmulțirea |
| `(a + b) * 2` | 54 | întâi paranteza |
| `a % 2 == 1` | true | 23 este impar |
| `a > 20 && b > 5` | false | b > 5 este fals |

## Aplicații interactive

```categorii
# Ce tip de date folosești?
int: numărul de elevi, anul nașterii
double: media generală, temperatura de 21.5 grade
char: inițiala numelui
bool: dacă un număr e par sau nu
```

```quiz
# Alege răspunsul corect.
Cât este 29 / 4, dacă ambele numere sunt int?
- 7.25
* 7
- 1

Cât este 29 % 4?
* 1
- 7
- 4

Care identificator este corect?
- 2nota
- nota finala
* nota_finala
```

```quiz
# Domeniul tipurilor.
Vrei să păstrezi populația României (aproximativ 19 000 000). Ce tip alegi?
* int, pentru că valoarea încape în domeniul lui (circa ±2 miliarde)
- char
- bool
Explicație: 19 milioane este un număr întreg mai mic de 2 147 483 647, deci încape într-un int.

Vrei să calculezi 20! (aproximativ 2,4 · 10¹⁸). Ce tip alegi?
- int
* long long
- char
Explicație: 20! depășește domeniul lui int; long long ajunge până la circa 9,2 · 10¹⁸.

Ce afișează: bool par = (10 % 2 == 0); cout << par;
- true
* 1
- 0
Explicație: cout afișează valoarea true ca 1 și false ca 0.

Care este scrierea corectă a unui caracter în C++?
* 'M'
- "M"
- M
Explicație: Un char se scrie între apostrofuri; între ghilimele este un șir de caractere.
```

```adevarat-fals
A: Tipul double păstrează numere reale cu mai multe cifre exacte decât float.
F: Dacă un calcul cu int depășește domeniul, compilatorul afișează o eroare. | Nu apare nicio eroare, dar rezultatul este greșit (depășire).
A: Variabilele de tip bool pot avea doar două valori: true și false.
F: Tipul char poate păstra un cuvânt întreg, de exemplu "școala". | char păstrează un singur caracter.
```

```categorii
# Corect sau greșit ca identificator?
Corect: suma, x1, nr_elevi, Medie
Greșit: 1x, nr elevi, int, mărime
```

```adevarat-fals
A: Textul de după // este un comentariu, ignorat de compilator.
F: În C++ scriem numerele reale cu virgulă, de exemplu 3,14. | Se scriu cu punct: 3.14.
A: Operatorul == compară două valori, iar = atribuie o valoare.
F: Variabilele Suma și suma sunt aceeași variabilă. | C++ face diferența între literele mari și mici.
```

```completare
# Completează.
Pentru n = 538, ultima cifră se obține cu n % 10, adică [8]. Prima cifră se obține cu n / 100, adică [5]. Cifra din mijloc este n / 10 % 10, adică [3].
```

## Exersează

1. Calculează pentru `int x = 47, y = 6;`: `x / y`, `x % y`, `x - y * 3`, `(x - y) % 10`, `x % 2 == 0`.
2. Scrie declarațiile pentru: vârsta ta, înălțimea în metri, prima literă a orașului, dacă ai frați.
3. Scrie expresia C++ care e adevărată dacă `n` este număr de două cifre.
4. Scrie expresia care e adevărată dacă `n` se divide cu 3 **sau** cu 5.
5. **Portofoliu:** în caiet, un tabel cu 10 expresii C++ inventate de tine și valorile lor, verificate apoi cu un coleg.

## Verifică-te

- Care e diferența dintre `17 / 5` și `17.0 / 5`?
- Ce tip alegi pentru o medie, pentru numărul de elevi ai școlii și pentru inițiala numelui? De ce?
- Ce face operatorul `%` și când îl folosești?

## Pe scurt

Un program C++ are **#include**, **using namespace std;** și funcția **main**. Variabilele se **declară** cu un **tip** (`int`, `long long`, `float`, `double`, `char`, `bool`) și un **identificator** corect; fiecare tip are un **domeniu** de valori, iar depășirea lui dă rezultate greșite. Operatorii aritmetici sunt `+ - * / %`; între întregi, `/` dă **câtul**, iar `%` dă **restul**. Comparăm cu `== != < <= > >=` și legăm condiții cu `&&`, `||`, `!`.

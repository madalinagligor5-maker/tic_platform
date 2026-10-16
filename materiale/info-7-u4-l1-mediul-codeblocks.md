---
titlu: Mediul de dezvoltare Code::Blocks
disciplina: informatica
clasa: 7
categorie: programare
tip: lectie
unitate: Unitatea 4 · Limbajul de programare
ordine: 401
descriere: De la algoritm la program, limbaje de programare și compilatoare, mediul Code::Blocks (proiect nou, editor, Build and run, fereastra de mesaje, consola), primul program în C++ și greșelile de compilare.
data: 2026-10-16
---

## Ce vei învăța azi

- ce este un **limbaj de programare** și ce face un **compilator**;
- ce este un **mediu de dezvoltare** (IDE);
- să creezi, să **compilezi** și să **rulezi** un program în **Code::Blocks**;
- să citești **mesajele de eroare**.

## Să ne amintim

Un **algoritm** este o succesiune finită de pași care rezolvă o problemă. În clasele a V-a și a VI-a ai scris algoritmi în **pseudocod** și i-ai construit din blocuri în **Scratch**. Acum îi vei scrie într-un limbaj „adevărat”, folosit de programatori: **C++**.

## Lecția pe scurt

### De la algoritm la program

Un **program** este un algoritm scris într-un **limbaj de programare**, pe care calculatorul îl poate executa. Exemple de limbaje: **C++**, **Python**, **Java**, **JavaScript**, **Pascal**.

Calculatorul înțelege doar **cod mașină** (0 și 1). De aceea, un program special, **compilatorul**, traduce **codul sursă** scris de tine (fișierul `.cpp`) într-un **program executabil** (`.exe`).

```text
cod sursă (.cpp)  →  compilator  →  program executabil (.exe)  →  rulare
```

Dacă ai greșit regulile limbajului, compilatorul **nu** face executabilul și îți arată **erorile**.

### Mediul de dezvoltare Code::Blocks

Un **mediu de dezvoltare integrat** (IDE) adună la un loc tot ce îți trebuie: **editorul** în care scrii, **compilatorul** și **depanatorul**. **Code::Blocks** este gratuit; la instalare alegi varianta care conține și compilatorul (**mingw-setup**).

Fereastra Code::Blocks:

1. **Bara de meniuri** și **bara de instrumente** (cu butoanele **Build**, **Run**, **Build and run**);
2. **Managementul** (*Management*, stânga): proiectele și fișierele;
3. **Editorul** (centru): scrii codul; cuvintele limbajului apar **colorate**, iar liniile sunt **numerotate**;
4. **Fereastra de mesaje** (*Logs & others*, jos): aici apar **erorile** și avertismentele;
5. **Consola** (fereastra neagră): apare când rulezi programul; aici **introduci** datele și vezi **rezultatele**.

### Un program nou

1. **File → New → Project → Console application → Go**.
2. Alegi limbajul **C++**, dai un **nume** proiectului (fără spații, de exemplu `Salut`) și un **folder**.
3. Apeși **Finish**. În **Sources** găsești fișierul `main.cpp`, cu un program gata scris.
4. Apeși **Build and run** (**F9**). Se deschide consola cu mesajul programului.

> Poți lucra și fără proiect: **File → New → Empty file**, apoi îl salvezi cu extensia `.cpp`.

### Primul program

```cpp
#include <iostream>
using namespace std;

int main()
{
    cout << "Salut, clasa a VII-a!";
    return 0;
}
```

Deocamdată reține: programul începe la **main**, instrucțiunile stau între **acolade** și fiecare se termină cu **punct și virgulă**. Lecția următoare explică fiecare rând.

### Erorile

Dacă uiți un **;**, o ghilimea sau o acoladă, apare în fereastra de mesaje o linie **roșie**, cu **numărul rândului** și o explicație, de exemplu: `error: expected ';' before 'return'`. Mergi la acel rând (sau la cel **de dinainte**), corectezi și apeși din nou **F9**.

## Exemplu rezolvat: programul „Carte de vizită”

1. Creezi proiectul `Vizita` (Console application, C++).
2. În `main.cpp` scrii:

```cpp
#include <iostream>
using namespace std;

int main()
{
    cout << "Nume: Popescu Ana" << endl;
    cout << "Clasa: a VII-a B" << endl;
    cout << "Hobby: robotica";
    return 0;
}
```

3. Apeși **F9**. Consola afișează trei rânduri (`endl` trece la rând nou).
4. Ștergi intenționat un `;` și apeși F9: citești eroarea, apoi o corectezi.

## Aplicații interactive

```ordonare
# Drumul unui program
Scrii algoritmul
Scrii codul sursă în editor
Compilatorul îl traduce în cod mașină
Se obține programul executabil
Rulezi programul și vezi rezultatul în consolă
```

```categorii
# Ce parte a mediului Code::Blocks este?
Editorul: aici scrii codul sursă
Fereastra de mesaje: aici apar erorile
Consola: introduci date și vezi rezultatele
Managementul: lista proiectelor și a fișierelor
```

```quiz
# Alege răspunsul corect.
Ce face compilatorul?
* traduce codul sursă în cod mașină și semnalează erorile
- desenează schema logică
- trimite programul pe e-mail

Ce tastă compilează și rulează programul în Code::Blocks?
- F1
* F9
- Esc

Ce extensie are fișierul cu codul sursă C++?
- .exe
- .docx
* .cpp
```

```adevarat-fals
A: Code::Blocks este un mediu de dezvoltare gratuit.
F: Calculatorul înțelege direct textul scris în C++. | Codul trebuie tradus de compilator în cod mașină.
A: Fiecare instrucțiune C++ se termină cu punct și virgulă.
F: Dacă programul are erori, compilatorul face oricum executabilul. | Întâi trebuie corectate erorile.
```

```completare
# Completează.
Programul care traduce codul sursă în cod mașină se numește [compilator]. Un mediu care conține editorul și compilatorul se numește [IDE|mediu de dezvoltare]. Rezultatele programului apar în [consolă|consola].
```

## Exersează

1. Deschide Code::Blocks și găsește toate elementele ferestrei.
2. Creează proiectul `Salut` și rulează programul care afișează „Hello world!”.
3. Modifică mesajul astfel încât să afișeze numele tău.
4. Șterge pe rând un `;`, o ghilimea și o acoladă. Notează în caiet ce eroare apare de fiecare dată.
5. **Portofoliu:** programul „Carte de vizită”, cu cel puțin cinci rânduri despre tine, salvat în folderul `Portofoliu_Info_7`.

## Verifică-te

- Care e diferența dintre codul sursă și programul executabil?
- Unde cauți când programul nu se compilează?

## Pe scurt

Un **program** este un algoritm scris într-un **limbaj de programare**. **Compilatorul** traduce **codul sursă** (`.cpp`) în **program executabil**. **Code::Blocks** este un **IDE**: are **editor**, **compilator** și **fereastră de mesaje**. **F9** (Build and run) compilează și rulează, iar rezultatele apar în **consolă**.

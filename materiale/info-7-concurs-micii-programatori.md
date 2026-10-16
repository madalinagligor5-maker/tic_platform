---
titlu: Concurs „Micii programatori”
disciplina: informatica
clasa: 7
categorie: programare
tip: proiect
unitate: Proiect și evaluare finală
ordine: 701
descriere: Concurs pe echipe: trei probe de programare în C++ (încălzire, problema de logică și programul-surpriză), rezolvate în Code::Blocks, cu documentarea soluției într-un document Google comun și prezentarea ei.
data: 2026-10-16
---

## Ce vei face

Clasa se împarte în **echipe de câte 3–4 elevi**. Fiecare echipă rezolvă în **C++**, în **Code::Blocks**, trei probe de dificultate crescătoare. Soluțiile se documentează într-un **Document Google** comun al echipei și se prezintă la final colegilor.

**Timp de lucru:** o oră (aproximativ 10 + 15 + 20 de minute pentru probe, restul pentru prezentare).

## Probele

### Proba 1 – Încălzirea (20 de puncte)

Se citește un număr natural **n** de cel mult 9 cifre. Afișează **câte cifre impare** are și **cea mai mare cifră**.

Exemplu: pentru `572381` se afișează `4 8` (cifrele impare sunt 5, 7, 3, 1).

### Proba 2 – Logică (30 de puncte)

Un melc urcă pe un stâlp înalt de **H** metri. Ziua urcă **U** metri, iar noaptea alunecă **A** metri (A < U). În câte zile ajunge în vârf?

Exemplu: H = 10, U = 3, A = 2 → **8 zile** (în ziua a 8-a pornește de la 7 m și ajunge la 10 m, deci nu mai alunecă).

### Proba 3 – Programul-surpriză (40 de puncte)

Alegeți **una** dintre probleme:

- **a) Numere perfecte.** Afișează toate numerele **perfecte** mai mici decât n: numere egale cu suma divizorilor lor, fără el însuși (6 = 1 + 2 + 3, 28 = 1 + 2 + 4 + 7 + 14).
- **b) Banii de buzunar.** Se citesc cheltuielile din fiecare zi a unei luni de **30 de zile**. Afișează totalul, ziua cu cea mai mare cheltuială și câte zile au fost fără cheltuieli.
- **c) Robotul pe grilă.** Un robot pornește din (0, 0). Se citesc n comenzi: 1 = nord, 2 = est, 3 = sud, 4 = vest; fiecare îl mută cu o căsuță. Afișează poziția finală.

**10 puncte** se acordă pentru **documentare și prezentare**.

## Cum lucrați

1. Alegeți un **căpitan**, un **programator principal**, un **testor** și un **documentarist** (în echipele de trei, cineva are două roluri).
2. Citiți problema și scrieți pe hârtie **datele de intrare**, **datele de ieșire** și **algoritmul** în pseudocod.
3. Scrieți programul în **Code::Blocks**; compilați des (**F9**).
4. Testorul încearcă **exemplul** din enunț și cel puțin **două teste ale lui** (inclusiv cazuri-limită, ca n = 0).
5. Documentaristul copiază în **Documentul Google** al echipei codul, testele și explicația pe scurt.
6. La final, căpitanul prezintă cea mai frumoasă soluție.

## Cum se notează

| Criteriu | Punctaj |
|---|---|
| Programul se compilează | 20% din punctajul probei |
| Rezultatul e corect pe exemplu | 40% din punctajul probei |
| Rezultatul e corect pe testele profesorului | 40% din punctajul probei |

La egalitate câștigă echipa care a terminat prima.

## Verifică-te înainte să predai

```quiz
# Lista de verificare
Ce verifici prima dată după ce ai scris programul?
* că se compilează fără erori și dă rezultatul corect pe exemplul din enunț
- că fontul arată bine
- că programul e cât mai lung

Ce structură se potrivește la melc?
- doar structura liniară
* o structură repetitivă: cât timp nu a ajuns în vârf, mai trece o zi
- switch

Cum afli ultima cifră a lui n?
* n % 10
- n / 10
- n * 10
```

```ordonare
# Etapele rezolvării unei probleme în concurs
Citiți atent enunțul
Stabiliți datele de intrare și de ieșire
Scrieți algoritmul în pseudocod
Scrieți programul în Code::Blocks
Testați pe exemplu și pe teste proprii
Documentați soluția în Documentul Google
```

## Autoevaluare (bifează în caiet)

1. Am rezolvat: trei probe / două probe / o probă.
2. Rolul meu în echipă a fost îndeplinit: în întregime / parțial.
3. Comunicarea în echipă a fost: foarte bună / bună / slabă.
4. Am testat programele: cu multe teste / doar cu exemplul / deloc.
5. Ce aș face altfel data viitoare: scriu în caiet o propoziție.

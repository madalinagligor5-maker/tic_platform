---
titlu: Concurs „Programatorii săptămânii”
disciplina: informatica
clasa: 5
categorie: programare
tip: proiect
unitate: Jocuri și povești în Scratch
ordine: 702
descriere: Concurs pe echipe: realizați în Scratch un joc cu două personaje, după modelul „Prinde peștișorul”, evaluat de un juriu.
data: 2026-10-15
---

## Organizare

- Alegeți un **juriu** de cinci membri (ei nu concurează).
- Formați **echipe de 4–5 elevi**. Fiecare echipă își alege prin vot un **manager de proiect** și un **nume**.

## Tema

Realizați în Scratch un **joc cu două personaje**. Exemplu: **„Prinde peștișorul”**.

- Pisoiul Scratch este scufundător, iar al doilea personaj este un pește.
- La **steagul verde**, peștele **alunecă la o poziție aleatoare**.
- Jucătorul îl conduce pe pisoi cu **săgețile** până la pește, din **cât mai puțini pași**.
- Câștigă cine face **cei mai puțini pași**.

Idee de script pentru pește:

```
când se dă clic pe steagul verde
setează [pași] la 0
alunecă în 1 secunde la (poziție aleatoare)
```

Idee de script pentru pisoi (la fel pentru fiecare săgeată):

```
când tasta săgeată dreapta este apăsată
modifică x cu 10
modifică [pași] cu 1
dacă < atinge Fish? > atunci
   spune (alătură „Prins! Pași: ” (pași))
```

## Cum lucrați

1. Analizați jocul propus și alte jocuri asemănătoare din comunitatea Scratch.
2. Faceți un **plan de lucru**: ordinea în care faceți lucrurile.
3. Împărțiți **sarcinile** între membrii echipei.
4. **Desenați** personajele sau alegeți-le din bibliotecă și modificați-le.
5. Scrieți **scripturile** pentru fiecare personaj și decor.

## Evaluarea

Fiecare echipă prezintă desenele și scripturile, explică soluțiile alese și face o **demonstrație** a jocului. Juriul dă note pentru:

- originalitatea și calitatea **desenelor**;
- **claritatea scripturilor** fiecărui personaj;
- **funcționarea** jocului.

Echipa cu cel mai mare punctaj devine **„Programatorii săptămânii”**! 🏆

## Hour of Code (Ora de programare)

**Hour of Code** este o inițiativă mondială care îi încurajează pe copii să programeze; în România se organizează din 2014. Organizați și voi o oră de programare cu tutorialele gratuite de pe `code.org`, de exemplu **Flappy Bird** (`hourofcode.com/flap`) sau **Artist** (`hourofcode.com/art`).

## Verifică-te

```quiz
# Înainte de concurs
Ce face peștele la steagul verde, în „Prinde peștișorul”?
* alunecă la o poziție aleatoare
- urmărește pisoiul
- dispare

Cum numeri pașii jucătorului?
- cu un sunet
* cu o variabilă „pași”, mărită cu 1 la fiecare apăsare de săgeată
- cu blocul „spune”

Ce criterii folosește juriul?
* desenele, claritatea scripturilor și funcționarea jocului
- doar numărul de personaje
- doar culorile
```

```ordonare
# Etapele lucrului în echipă
Analizați jocul model
Faceți planul de lucru
Împărțiți sarcinile
Desenați sau alegeți personajele
Scrieți scripturile
Prezentați jocul juriului
```

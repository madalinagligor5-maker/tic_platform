---
titlu: Scratch. Elemente recapitulative
disciplina: informatica
clasa: 6
categorie: programare
tip: lectie
unitate: Unitatea 4 · Algoritmi și programare
ordine: 401
descriere: Recapitularea interfeței Scratch și a categoriilor de blocuri, cu jocul „Îmbracă pinguinul”: personaje, costume, clic pe personaj și alegere aleatoare.
data: 2026-10-15
---

## Ce vei învăța azi

- să-ți amintești **interfața Scratch** și **categoriile de blocuri**;
- să lucrezi cu **personaje**, **costume** și **decoruri**;
- să folosești evenimentul **„când se dă clic pe acest personaj”**;
- să alegi un costum **la întâmplare**, cu **„alege aleator între”**;
- să **salvezi**, să **remixezi** și să **partajezi** un proiect.

## Să ne amintim

**Scratch** este un mediu de programare **grafic** și **interactiv**: programele se fac din blocuri colorate, îmbinate ca piesele de puzzle. Lucrezi **online**, pe `scratch.mit.edu` → **Creează**, sau **offline**, după ce instalezi aplicația de la `scratch.mit.edu/download`. Interfața se poate pune în **limba română**.

Ca să-ți **partajezi** proiectele în comunitatea Scratch, ai nevoie de un **cont**. Pentru elevi, contul îl poate crea **profesorul** (cont de clasă) sau îl faci cu **acordul părinților**.

## Lecția pe scurt

### Interfața Scratch

- **fila Cod**: **paleta de blocuri** și **zona de program**;
- **fila Costume**: aspectele unui personaj, cu un editor grafic;
- **fila Sunete**;
- **Scena**: unde rulează programul;
- **zona Personaje** și **zona Decoruri**;
- **Rucsacul**: păstrezi scripturi și personaje ca să le folosești în alte proiecte.

### Categoriile de blocuri

**Mișcare**, **Aspect**, **Sunet**, **Evenimente**, **Control**, **Detectare**, **Operatori**, **Variabile**, **Blocurile mele** și **Extensii** (de exemplu, **Stilou**, pentru desen).

### Jocul „Îmbracă pinguinul”

**Enunțul:** un pinguin plutește pe un ghețar. Ai câte **patru modele** din patru articole de îmbrăcăminte: haină, căciulă, mănuși, fular. La fiecare **clic** pe un articol, acesta își schimbă modelul **la întâmplare**.

**Ce imagini îți trebuie:** un fundal, pinguinul și câte patru modele din fiecare articol (`haina1`…`haina4`, `fes1`…`fes4`, `fular1`…`fular4`, `manusi1`…`manusi4`).

**Pașii:**

1. Deschizi un proiect nou și îl numești **Pinguin la Polul Sud**.
2. În zona **Decoruri** încarci fundalul.
3. În zona **Personaje** încarci pinguinul și câte un model din fiecare articol: `haina1`, `fes1`, `fular1`, `manusi1`.
4. Așezi articolele pe pinguin, ca să-l îmbrace.
5. La fiecare articol adaugi în fila **Costume** celelalte trei modele (în total, patru costume).
6. La fiecare articol construiești scriptul:

```
când se dă clic pe acest personaj
schimbă costumul la (alege aleator între (1) și (4))
```

- **„când se dă clic pe acest personaj”** este în **Evenimente**;
- **„schimbă costumul la ()”** este în **Aspect**;
- **„alege aleator între () și ()”** este în **Operatori**; îl tragi în căsuța goală a blocului de mai sus.

7. Salvezi programul ca `Pinguin la Polul Sud.sb3`.

### Salvare, remixare, partajare

- **Fișier → Salvează pe computerul tău**: fișier **.sb3**;
- **Remixează**: salvezi o versiune modificată a proiectului altcuiva;
- **Partajează**: proiectul tău devine vizibil în comunitatea Scratch.

## Exemplu rezolvat

**Sarcina:** vrei ca haina să nu se mai schimbe la întâmplare, ci **în ordine**: 1, 2, 3, 4, apoi iar 1.

1. Te uiți în **Aspect**: există blocul **„costumul următor”**.
2. După ultimul costum, **„costumul următor”** trece singur la **primul**.
3. Scriptul devine:

```
când se dă clic pe acest personaj
costumul următor
```

4. Apeși **steagul verde**, dai clic pe haină de cinci ori și verifici că după modelul 4 vine modelul 1.

## Aplicații interactive

```categorii
# În ce categorie este blocul?
Evenimente: când se dă clic pe steagul verde, când se dă clic pe acest personaj, când tasta spațiu este apăsată
Aspect: schimbă costumul la, costumul următor, spune
Operatori: alege aleator între, alătură
Mișcare: mergi 10 pași, rotește-te 15 grade, du-te la x y
```

```quiz
# Alege răspunsul corect.
Ce extensie are un proiect Scratch salvat pe calculator?
- .pptx
* .sb3
- .glb

Unde adaugi modelele unui articol de îmbrăcăminte?
- în zona Decoruri
* în fila Costume a personajului
- în Rucsac

Cu ce bloc alegi un model la întâmplare dintre 4?
* alege aleator între 1 și 4
- costumul următor
- așteaptă 1 secunde

Ce face butonul Remixează?
- șterge proiectul
* salvează o versiune modificată a unui proiect existent
- trimite proiectul pe e-mail
```

```ordonare
# Scriptul unui articol de îmbrăcăminte: pune pașii în ordine.
Selectezi personajul haina1
Tragi blocul „când se dă clic pe acest personaj”
Adaugi blocul „schimbă costumul la”
Pui în el „alege aleator între 1 și 4”
Testezi cu clic pe haină
```

```adevarat-fals
A: Interfața Scratch poate fi afișată în limba română.
F: Rucsacul este o categorie de blocuri. | Rucsacul păstrează scripturi și personaje pentru alte proiecte.
A: Extensia Stilou adaugă blocuri pentru desen.
F: Ca să lucrezi în Scratch, ai nevoie obligatoriu de internet. | Poți instala Scratch și lucra offline.
```

## Exersează

1. Deschide proiectul pinguinului, dublează un model de haină și modifică-l cu editorul grafic. Schimbă apoi intervalul în **„alege aleator între (1) și (5)”**.
2. Adaugă un **sunet** gratuit, care să se audă la fiecare schimbare de model.
3. La apăsarea **steagului verde**, pinguinul să te **salute** cu un mesaj.
4. Dă exemple de trei blocuri din categoria **Mișcare**.
5. Adaugă extensia **Stilou** și găsește blocurile **„stilou jos”** și **„stilou sus”**.
6. **Portofoliu:** fă un program care **aprinde** și **stinge** becul unei lămpi la clic (două costume: bec aprins, bec stins).

## Verifică-te

- Poți numi cel puțin șase categorii de blocuri?
- Care e diferența dintre **„schimbă costumul la”** și **„costumul următor”**?

## Pe scurt

Scratch are **fila Cod**, **Costume**, **Sunete**, **Scena**, zonele **Personaje** și **Decoruri** și **Rucsacul**. Blocurile sunt pe categorii (**Mișcare**, **Aspect**, **Evenimente**, **Control**, **Operatori** etc.). Cu **„când se dă clic pe acest personaj”**, **„schimbă costumul la”** și **„alege aleator între”** faci jocul pinguinului. Proiectul se salvează ca **.sb3**.

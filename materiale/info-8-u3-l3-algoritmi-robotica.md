---
titlu: Utilizarea algoritmilor în robotică (I). Senzori și decizii
disciplina: informatica
clasa: 8
categorie: programare
tip: lectie
unitate: Unitatea 3 · Algoritmi
ordine: 303
descriere: Ciclul percepe – decide – acționează, algoritmi pentru roboți: ocolirea obstacolelor, urmărirea unei linii cu unul sau doi senzori, oprirea la o culoare și ieșirea din labirint, programați în VEXcode VR.
data: 2026-10-16
---

## Ce vei învăța azi

- cum funcționează un robot după ciclul **percepe – decide – acționează**;
- să scrii algoritmi care folosesc **senzorii**;
- algoritmi clasici: **ocolirea obstacolelor**, **urmărirea liniei**, **labirintul**;
- să îi testezi pe un **robot virtual**.

## Să ne amintim

În clasa a VII-a ai programat robotul virtual din **VEXcode VR** (vr.vex.com): deplasări, rotiri și senzori de **distanță**, **atingere** și **culoare**. Un robot folosește aceleași structuri ca orice program: **liniară**, **alternativă** și **repetitivă**.

## Lecția pe scurt

### Ciclul percepe – decide – acționează

Programul unui robot autonom este, de obicei, o **buclă infinită**:

```text
repetă la nesfârșit
    citește senzorii           (percepe)
    alege ce trebuie făcut     (decide)
    comandă motoarele          (acționează)
```

Bucla se repetă de zeci de ori pe secundă, așa că robotul reacționează aproape imediat.

### Algoritmul 1: ocolirea obstacolelor

```text
repetă la nesfârșit
    dacă distanța din față < 100 mm atunci
        oprește
        rotește dreapta 90°
    altfel
        mergi înainte
```

Așa funcționează, în mare, un **robot aspirator**: merge până întâlnește ceva, apoi își schimbă direcția.

### Algoritmul 2: urmărirea unei linii (un senzor)

Robotul merge pe **marginea** unei linii negre. Senzorul de culoare (sau de lumină) de sub el vede **negru** sau **alb**:

```text
repetă la nesfârșit
    dacă senzorul vede negru atunci
        mergi înainte virând puțin la dreapta
    altfel
        mergi înainte virând puțin la stânga
```

Robotul merge în **zigzag** de-a lungul marginii liniei. Cu **doi senzori** (stânga și dreapta liniei) mersul e mai lin: dacă senzorul stâng vede negru, virezi la stânga; dacă cel drept vede negru, virezi la dreapta; altfel mergi drept.

### Algoritmul 3: oprirea la o culoare

```text
mergi înainte
repetă până când senzorul vede roșu
    (nimic, aștepți)
oprește
```

Așa se oprește un robot de depozit la raftul marcat cu o anumită culoare.

### Algoritmul 4: labirintul (regula mâinii drepte)

Dacă ții mereu **mâna dreaptă pe perete**, ieși din orice labirint ai cărui pereți sunt legați între ei:

```text
repetă până la ieșire
    dacă dreapta e liber atunci rotește dreapta și mergi o căsuță
    altfel dacă înainte e liber atunci mergi o căsuță
    altfel rotește stânga
```

### Testarea și ajustarea

Un robot real nu e perfect: roțile alunecă, senzorii au mici erori. De aceea se **testează** mult și se ajustează valorile (distanța de oprire, viteza, unghiul de virare). Folosește **monitorul** din VEXcode VR ca să vezi valorile senzorilor în timp ce robotul merge.

## Exemplu rezolvat: robotul de pază

Pe terenul **Wall Maze**, robotul patrulează: merge înainte, iar la fiecare perete se întoarce și numără câte ture a făcut. După 4 întoarceri se oprește și afișează mesajul.

```text
ture ← 0
repetă până când ture = 4
    mergi înainte
    așteaptă până când distanța din față < 80 mm
    oprește
    rotește dreapta 180°
    ture ← ture + 1
scrie „Patrulare terminată”
```

Se folosesc: o **variabilă-contor**, o **structură repetitivă** cu condiție și o **așteptare** după un senzor.

## Aplicații interactive

```ordonare
# Ciclul de funcționare al unui robot autonom
Senzorii citesc mediul
Programul compară valorile cu limitele stabilite
Programul alege acțiunea
Motoarele execută acțiunea
Ciclul se reia
```

```categorii
# Ce algoritm folosește robotul?
Ocolirea obstacolelor: robotul aspirator
Urmărirea liniei: robotul care transportă piese pe o linie din fabrică
Oprirea la o culoare: robotul care se oprește la raftul roșu
Regula mâinii drepte: ieșirea din labirint
```

```quiz
# Alege răspunsul corect.
De ce programul unui robot autonom este, de obicei, o buclă infinită?
* ca robotul să citească senzorii și să reacționeze tot timpul
- ca să consume mai multă baterie
- pentru că nu se poate altfel în C++

Cu un singur senzor de culoare, cum merge robotul de-a lungul liniei?
- perfect drept
* în zigzag, pe marginea liniei
- în cerc

Robotul se lovește de pereți deși programul pare corect. Ce faci întâi?
- schimbi robotul
* urmărești valorile senzorului în monitor și mărești distanța de oprire
- ștergi programul
```

```adevarat-fals
A: Doi senzori de linie permit un mers mai lin decât unul singur.
F: Un robot real execută comenzile perfect, fără erori. | Roțile alunecă, senzorii au erori; de aceea testăm și ajustăm.
A: Regula mâinii drepte folosește structura alternativă în interiorul unei structuri repetitive.
```

```completare
# Completează.
Un robot autonom funcționează după ciclul percepe – [decide] – acționează. Pentru a ocoli obstacolele, robotul folosește senzorul de [distanță|distanta]. Pentru a urmări o linie neagră, folosește senzorul de [culoare|lumină|lumina].
```

## Exersează

1. Pe terenul **Castle Crasher** din VEXcode VR, programează robotul să împingă blocurile de pe masă fără să cadă (senzorul de jos vede marginea).
2. Pe terenul **Line Detect**, programează urmărirea liniei cu un singur senzor, apoi încearcă să mărești viteza.
3. Programează robotul să meargă înainte și să se oprească la prima linie roșie.
4. Scrie în pseudocod algoritmul unui robot care udă florile: merge pe un rând de ghivece și se oprește 3 secunde la fiecare ghiveci verde.
5. **Portofoliu:** algoritmul pentru labirint, în pseudocod și testat pe terenul **Wall Maze**, cu o captură de ecran și timpul în care iese robotul.

## Verifică-te

- Ce face fiecare etapă a ciclului percepe – decide – acționează?
- De ce trebuie testat mult un program pentru robot?

## Pe scurt

Un robot autonom repetă la nesfârșit ciclul **percepe – decide – acționează**. Algoritmii clasici sunt **ocolirea obstacolelor** (senzor de distanță), **urmărirea liniei** (senzor de culoare), **oprirea la o culoare** și **regula mâinii drepte** în labirint. Toți folosesc **decizii** în interiorul unor **bucle**. Programele se **testează** și se **ajustează**.

---
titlu: Programarea roboților virtuali. Utilizarea senzorilor
disciplina: informatica
clasa: 7
categorie: programare
tip: lectie
unitate: Unitatea 4 · Limbajul de programare
ordine: 412
descriere: Ce este un robot, senzori și motoare, robotul virtual din VEXcode VR, programe cu blocuri sau C++ cu deplasări, rotiri, senzori de distanță, culoare și atingere, plus structurile învățate aplicate la roboți.
data: 2026-10-16
---

## Ce vei învăța azi

- ce este un **robot** și din ce e format;
- ce sunt **senzorii** și **motoarele**;
- să programezi un **robot virtual** în **VEXcode VR**;
- să folosești **decizia** și **repetiția** ca să reacționeze la senzori.

## Să ne amintim

Ai învățat **structura liniară**, **alternativă** (if) și **repetitivă** (while, for). Un robot folosește exact aceleași structuri: execută pași, ia decizii și repetă acțiuni.

## Lecția pe scurt

### Ce este un robot

Un **robot** este o mașină programabilă care **percepe** mediul, **decide** și **acționează**:

- **senzorii** culeg informații (ca simțurile noastre);
- **controlerul** (un mic calculator) rulează **programul** și ia decizii;
- **motoarele** și **actuatorii** pun robotul în mișcare.

Exemple: robotul aspirator, brațele robotice din fabrici, roverele de pe Marte, dronele.

### Senzori

| Senzor | Ce măsoară | Exemplu |
|---|---|---|
| de **distanță** | cât de departe e un obstacol | robotul se oprește înaintea peretelui |
| de **atingere** (bumper) | dacă s-a lovit de ceva | robotul dă înapoi |
| de **culoare** / **lumină** | culoarea sau luminozitatea de sub el | urmărește o linie neagră |
| **giroscop** | unghiul de rotire | se rotește exact 90° |
| **GPS** | poziția pe teren | merge la un punct |

### VEXcode VR

**VEXcode VR** (vr.vex.com) este un mediu **gratuit, online**, în care programezi un **robot virtual** pe diferite **terenuri** (*playgrounds*): labirint, grilă cu numere, teren cu linii, cu discuri colorate.

- În stânga: **blocurile** (ca în Scratch) sau editorul de text (**Python** sau **C++** în VEXcode V5).
- În dreapta: **fereastra terenului**, cu butonul **Start**.
- **Monitorul** arată valorile senzorilor în timp ce robotul merge.

Comenzi des folosite:

| Blocuri | Ce face |
|---|---|
| `drive forward 200 mm` | merge înainte 200 mm |
| `turn right 90 degrees` | se rotește la dreapta 90° |
| `drive forward` (fără distanță) | pornește și merge până îl oprești |
| `stop driving` | se oprește |
| `front distance in mm` | valoarea senzorului de distanță |
| `left bumper pressed?` | dacă bumperul stâng e apăsat |

### Structurile, la robot

- **liniară**: înainte 500 mm, dreapta 90°, înainte 300 mm;
- **repetitivă cu contor**: `repeat 4` (înainte, dreapta 90°) = un **pătrat**;
- **repetitivă condiționată**: `repeat until` (distanța < 50 mm) mergi înainte;
- **decizie**: `if` (culoarea e roșie) atunci întoarce-te, altfel continuă.

Același program, scris ca în C++ (VEXcode V5):

```cpp
while (true)                                  // repetă la nesfârșit
{
    if (FrontDistance.objectDistance(mm) < 100)   // obstacol aproape?
    {
        Drivetrain.stop();
        Drivetrain.turnFor(right, 90, degrees);
    }
    else
        Drivetrain.drive(forward);
}
```

## Exemplu rezolvat: ieșirea din labirint (regula mâinii drepte)

Pe terenul **Wall Maze**, robotul iese dacă **ține mereu peretele în dreapta**. Algoritmul cu blocuri:

```text
repetă până când robotul ajunge la ieșire
    dacă distanța din față < 50 mm atunci
        rotește stânga 90°
    altfel
        mergi înainte 250 mm (o căsuță)
        rotește dreapta 90°
        dacă distanța din față < 50 mm atunci
            rotește stânga 90°
```

Pornești, privești monitorul senzorului și ajustezi distanțele dacă robotul se lovește.

## Aplicații interactive

```categorii
# Ce senzor folosește robotul?
Distanță: se oprește înaintea unui perete
Atingere: dă înapoi când se lovește
Culoare: urmărește o linie neagră pe podea
Giroscop: se rotește exact 90 de grade
```

```quiz
# Alege răspunsul corect.
Ce face robotul cu programul: repetă de 4 ori (înainte 300 mm, dreapta 90°)?
* desenează un pătrat și ajunge în punctul de plecare
- merge în linie dreaptă 1200 mm
- se rotește pe loc

Ce structură folosești ca robotul să meargă până întâlnește un obstacol?
- liniară
* repetitivă condiționată
- nicio structură

Ce parte a robotului ia deciziile?
- motorul
- roțile
* controlerul, care rulează programul
```

```ordonare
# Ordonează: robotul percepe, decide, acționează
Senzorul de distanță măsoară 40 mm
Controlerul compară 40 cu limita de 50
Condiția este adevărată
Programul comandă oprirea și rotirea
Motoarele întorc robotul
```

```adevarat-fals
A: VEXcode VR se poate folosi gratuit, din browser.
F: Un robot poate funcționa fără program. | Controlerul are nevoie de un program care îi spune ce să facă.
A: Roverele de pe Marte sunt roboți.
A: Monitorul din VEXcode VR arată valorile senzorilor.
```

```completare
# Completează.
Robotul culege informații prin [senzori], le prelucrează cu [controlerul|controler] și se mișcă cu ajutorul [motoarelor|motoarele].
```

## Exersează

1. Pe terenul **Grid Map**, programează robotul să deseneze un **dreptunghi** de 600 × 300 mm.
2. Fă robotul să meargă înainte până la perete, să se întoarcă și să revină la start.
3. Pe terenul **Line Detect**, folosește senzorul de culoare ca robotul să urmărească linia.
4. Pe terenul **Wall Maze**, aplică regula mâinii drepte și ieși din labirint.
5. Numără, cu o variabilă, câte obstacole întâlnește robotul și afișează numărul în **Print Console**.
6. **Portofoliu:** fă o captură de ecran cu programul tău care iese din labirint și scrie în caiet, în pseudocod, algoritmul folosit.

## Verifică-te

- Care sunt cele trei părți principale ale unui robot?
- Ce structuri de programare ai folosit pentru labirint?

## Pe scurt

Un **robot** **percepe** cu **senzori** (distanță, atingere, culoare, giroscop), **decide** cu **controlerul** și **acționează** cu **motoarele**. În **VEXcode VR** programezi un robot virtual cu blocuri sau cu cod, folosind structurile **liniară**, **alternativă** și **repetitivă**.

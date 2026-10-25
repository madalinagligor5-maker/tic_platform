---
titlu: Proiect „Liceul preferat”
disciplina: informatica
clasa: 8
categorie: programare
tip: proiect
unitate: Proiect și evaluare finală
ordine: 701
descriere: Proiect de final de an: fiecare echipă prezintă un liceu printr-un registru Excel cu date și diagrame, un site Google cu mai multe pagini și un program C++ care prelucrează mediile de admitere ca șir de valori.
data: 2026-10-16
---

## Ce vei face

Peste câteva luni vei alege **liceul**. În acest proiect, în echipe de câte 3–4 elevi, prezentați un **liceu** din oraș sau din județ, folosind tot ce ați învățat în clasa a VIII-a:

- un **registru Excel** cu date despre liceu și **diagrame**;
- un **site Google** cu mai multe pagini, publicat;
- un **program C++** care prelucrează **mediile de admitere** ca **șir de valori**.

**Timp de lucru:** două ore la clasă, plus lucru acasă, apoi prezentarea.

## Cum lucrați

### 1. Documentarea

Căutați pe site-ul liceului și pe site-urile oficiale (inspectoratul școlar, admitere.edu.ro): profilurile și specializările, numărul de locuri, ultimele medii de admitere, activitățile, olimpiadele, cluburile. Notați **sursele**.

### 2. Registrul Excel `Liceul_nostru.xlsx`

- Foaia **„Specializări”**: specializarea, numărul de locuri, ultima medie de admitere din fiecare dintre ultimii 3 ani.
- Formule și funcții: totalul locurilor (SUM), media ultimelor medii (AVERAGE), cea mai mare și cea mai mică medie (MAX, MIN), câte specializări au media peste 9 (COUNTIF), o coloană cu IF: „Foarte căutată” sau „Accesibilă”.
- Formatare: titlu îmbinat, borduri, formatare condiționată.
- Două **diagrame**: locurile pe specializări (coloane) și evoluția mediei la o specializare în 3 ani (linie).

### 3. Site-ul Google

Harta site-ului: **Acasă**, **Specializări**, **Viața de licean**, **Admitere**, **Echipa noastră**.

- tema și antetele unitare; fotografii libere de drepturi sau făcute de voi, cu acordul celor fotografiați;
- pe pagina „Specializări” încorporați foaia de calcul și diagramele;
- pe pagina „Admitere” o **hartă** cu locul liceului și un **formular** „Ți-ar plăcea să urmezi acest liceu?”;
- fiecare membru al echipei construiește o pagină; la final, verificați legăturile și **publicați**.

### 4. Programul C++

Se citește n, numărul de specializări, apoi pentru fiecare **ultima medie de admitere** (număr real). Programul afișează:

- cea mai mare și cea mai mică medie și pozițiile lor;
- media acestor medii, cu două zecimale;
- la câte specializări ai fi admis, adică media de admitere este cel mult egală cu media ta (citită la început);
- dacă **toate** specializările au media peste 8.

```cpp
#include <iostream>
#include <iomanip>
using namespace std;

int main()
{
    int n, k = 0, pozMax = 1, pozMin = 1, toatePeste8 = 1;
    double mea, x, maxim, minim, s = 0;
    cout << "Media ta: "; cin >> mea;
    cout << "Numar de specializari: "; cin >> n;
    for (int i = 1; i <= n; i++)
    {
        cin >> x;
        s = s + x;
        if (i == 1) { maxim = minim = x; }
        if (x > maxim) { maxim = x; pozMax = i; }
        if (x < minim) { minim = x; pozMin = i; }
        if (x <= mea) k++;
        if (x <= 8) toatePeste8 = 0;
    }
    // completați afișarea rezultatelor
    return 0;
}
```

Completați afișarea și testați programul cu datele reale ale liceului.

### 5. Prezentarea

În 5–7 minute: prezentați site-ul (pe proiector), diagramele și rulați programul. Fiecare membru vorbește despre partea lui. Răspundeți la întrebările colegilor.

## Cum se notează

| Criteriu | Puncte |
|---|---|
| Registrul Excel: date corecte, formule și funcții, diagrame | 25 |
| Site-ul: structură, conținut, aspect unitar, publicare | 30 |
| Programul C++: corect, testat, ușor de citit | 25 |
| Prezentarea și lucrul în echipă | 10 |
| Din oficiu | 10 |

## Verifică-te înainte să predai

```quiz
# Lista de verificare
Ce funcție Excel numără specializările cu media peste 9?
- SUM
* COUNTIF
- MAX

Ce faci după ultima modificare a site-ului?
* apeși din nou Publicați și verifici linkul
- nimic, se publică singur
- trimiți fișierul Excel

În program, condiția x <= mea numără specializările la care...
* media de admitere este cel mult egală cu media ta
- media ta este mai mică
- s-au ocupat toate locurile
```

```ordonare
# Etapele proiectului
Vă documentați și notați sursele
Realizați registrul Excel cu diagrame
Construiți paginile site-ului și încorporați foaia de calcul
Verificați legăturile dintre pagini
Publicați site-ul
Prezentați proiectul colegilor
```

## Autoevaluare (bifează în caiet)

1. Am respectat cerințele: în întregime / parțial.
2. Am terminat la timp: da / cu întârziere.
3. Documentarea a fost: foarte bună / bună / slabă.
4. Comunicarea în echipă a fost: foarte bună / bună / slabă.
5. Partea mea din proiect: o scriu în caiet, într-o propoziție.
6. Proiectul m-a ajutat să aleg liceul: în mare măsură / puțin / deloc.

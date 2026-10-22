---
titlu: Evaluare – Procesorul de text și calculul tabelar
disciplina: tic
clasa: 7, 8
categorie: aplicatii
tip: test
mod: profesor
timp: 45
unitate: Evaluare
descriere: Test practic: formatare în procesorul de text, formule și funcții în foaia de calcul, plus itemi de teorie și un răspuns deschis.
data: 2026-10-22
---

```quiz puncte=10
# Item 1. Alege răspunsul corect.
Ce se întâmplă cu formula =B2*C2 din D2 dacă o copiezi în D5?
- Rămâne =B2*C2
* Devine =B5*C5
- Devine =E2*F2

Care formulă calculează media valorilor din zona B2:B10?
- =SUM(B2:B10)
* =AVERAGE(B2:B10)
- =MAX(B2:B10)

Ce formatare se aplică întregului paragraf, nu doar textului selectat?
- Aldin
- Culoarea textului
* Alinierea centrată
```

```adevarat-fals puncte=10
# Item 2. Adevărat sau fals?
A: În adresa $A$1, semnul $ fixează coloana și rândul la copiere.
F: O formulă se poate scrie fără semnul egal la început.
A: Ctrl + Z anulează ultima acțiune.
F: Zona A1:B3 conține 4 celule.
```

```categorii puncte=10
# Item 3. Ce aplicație folosești pentru fiecare sarcină?
Procesor de text: o compunere, o invitație, o scrisoare
Calcul tabelar: un buget lunar, un catalog cu medii, un clasament cu punctaje
```

```completare puncte=10
# Item 4. Completează.
Intersecția dintre o coloană și un rând se numește [celulă|celula].

Funcția care găsește cea mai mare valoare dintr-o zonă este [MAX], iar cea care adună valorile este [SUM|SUMA].
```

```procesor-text puncte=20
# Item 5. Formatează anunțul după cerințe.
Text:
Târg de carte
În perioada 10–14 noiembrie, biblioteca școlii organizează un târg de carte.
Puteți aduce cărți pe care le-ați citit, pentru a le schimba cu colegii.
Banii strânși din vânzări vor fi folosiți pentru cărți noi.
Cerințe:
- titlul: aldin, centrat, mărime 20 | Titlul: aldin, centrat, mărime 20
- titlul: culoare verde | Titlul este verde
- „10–14 noiembrie”: aldin, subliniat | Perioada este aldin și subliniată
- paragraful 2: stânga-dreapta | Paragraful 2 este aliniat stânga-dreapta
- paragraful 3: stânga-dreapta | Paragraful 3 este aliniat stânga-dreapta
- tot textul: font Georgia | Tot textul folosește fontul Georgia
```

```calcul-tabelar puncte=30
# Item 6. Rezultatele concursului de matematică. Completează tabelul.
Date:
Elev;Proba 1;Proba 2;Proba 3;Total;Media
Ana;8;9;10
Bogdan;7;6;9
Carla;10;10;9
Dan;6;8;7
Cerințe:
- E2:E5: =SUM(B2:D2) | În E2:E5, totalul punctelor fiecărui elev, cu funcția SUM
- F2:F5: =AVERAGE(B2:D2) | În F2:F5, media fiecărui elev, cu funcția AVERAGE
- F2:F5: 2 zecimale | Mediile au 2 zecimale
- B7: =MAX(E2:E5) | În B7, cel mai mare total, cu funcția MAX
- A1:F1: aldin | Capul de tabel este aldin
- A1:F1: centrat | Capul de tabel este centrat
```

```eseu puncte=10
# Item 7. Răspuns deschis.
Explică de ce este mai bine să calculezi totalul cu o formulă decât să scrii rezultatul de mână în celulă.
Cuvinte: 20-80
Barem: 5p formula se recalculează automat când se schimbă datele; 3p se evită greșelile de calcul; 2p formula se poate copia pe alte rânduri.
```

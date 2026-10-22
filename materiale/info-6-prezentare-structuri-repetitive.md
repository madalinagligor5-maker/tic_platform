---
titlu: Prezentare – Structurile repetitive
disciplina: informatica
clasa: 6
categorie: algoritmi
tip: prezentare
unitate: Unitatea 4 · Algoritmi și programare
ordine: 409
descriere: Prezentare de recapitulare despre cele trei structuri repetitive: cât timp, repetă… până când și pentru, cu exemple în pseudocod și în Scratch.
data: 2026-10-16
---

Parcurge diapozitivele cu săgețile sau glisând. Apasă **Ecran complet** ca să o proiectezi în clasă, iar profesorul poate deschide **Note**.

```diapozitive
# Structurile repetitive
tema: portocaliu
## Structurile repetitive
Informatică și TIC · clasa a VI-a

Recapitulare pentru Unitatea 4
Note: Întreabă clasa ce lucruri repetă în fiecare zi: se spală pe dinți, urcă scările, numără până la 10.
---
## De ce repetăm?
- Unele sarcini au **aceiași pași**, de mai multe ori.
- În loc să scriem pașii de 100 de ori, îi scriem **o dată** și spunem **de câte ori** sau **până când**.
- O repetare se numește **iterație**.
Note: Exemplu de la desenul scării: fiecare treaptă are aceiași doi pași.
---
## Trei tipuri
| Structura | Testul | Pași |
|---|---|---|
| **cât timp** | la început | necunoscut |
| **repetă… până când** | la final | necunoscut |
| **pentru** | contor | cunoscut |
---
## Cât timp (test inițial)
- Verifici **întâi** condiția.
- Dacă e **adevărată**, execuți pașii și revii.
- Poate avea **zero** iterații.

`cât timp (a > 0) execută …`
Note: Exemplul cu prințesa: dacă atinge ursul de la început, nu face niciun pas.
---
## Repetă… până când (test final)
- Execuți pașii, **apoi** verifici condiția.
- Are **cel puțin o** iterație.
- Exemplu: ceri parola **până când** e corectă.
Note: Subliniază diferența: la test final, pașii se fac sigur o dată.
---
## Pentru (cu contor)
- Știi **de la început** de câte ori repeți.
- Contorul crește (sau scade) cu un **pas**.

`pentru i ← 1, n execută S ← S + i`
Note: Suma lui Gauss: pentru n = 5, S = 15.
---
## În Scratch
- **repetă (10)**: număr cunoscut de pași
- **repetă până când < >**: până devine adevărată condiția
- **la infinit**: fără oprire (animații, muzică)

Toate sunt în categoria **Control**.
---
## Atenție la bucle infinite!
Dacă nimic din interiorul buclei nu schimbă condiția, programul **nu se mai oprește**.

Schimbă mereu o variabilă din condiție.
---
## Verifică-te
1. Ce structură alegi pentru un hexagon?
2. Ce structură alegi ca un personaj să meargă până la margine?
3. Câte iterații are „cât timp (a > 0)” pentru a = 0?
Note: Răspunsuri: 1 – pentru / repetă (6); 2 – cât timp / repetă până când; 3 – zero.
---
## Mulțumesc!
Acum rezolvă recapitularea unității.
```

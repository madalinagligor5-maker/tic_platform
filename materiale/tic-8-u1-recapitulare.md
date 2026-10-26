---
titlu: Recapitulare – Calcul tabelar
disciplina: tic
clasa: 8
categorie: aplicatii
tip: test
unitate: Unitatea 1 · Calcul tabelar
ordine: 108
descriere: Exerciții recapitulative și autoevaluare pentru Unitatea 1: registre, celule și zone, formatare, formule, adrese absolute, funcții, sortare, filtrare și diagrame în Excel.
data: 2026-10-16
---

## Recapitulare

```cartonase
# Cuvinte-cheie
Registru de calcul = fișierul Excel (.xlsx), cu una sau mai multe foi
Celulă = intersecția unei coloane cu un rând; adresa ei este de tipul B3
Zonă = grup de celule alăturate, de exemplu A1:C4
Formulă = calcul care începe cu semnul egal
Adresă absolută = adresă cu $, care nu se schimbă la copiere
Funcție = formulă gata făcută, de exemplu SUM sau AVERAGE
Diagramă = reprezentarea grafică a datelor dintr-un tabel
```

```quiz
# Alege răspunsul corect.
Ce dă =MIN(A1:A3), dacă A1:A3 conține 7, 2 și 9?
* 2
- 7
- 18

Ce formulă calculează media celulelor B2, C2 și D2?
- =SUM(B2:D2)
* =AVERAGE(B2:D2)
- =B2+C2+D2/3

Ce diagramă arată cel mai bine evoluția prețului pâinii în 10 ani?
- radială
* linie
- niciuna
```

```adevarat-fals
A: Mânerul de umplere poate continua seria Luni, Marți, Miercuri.
F: Formula =B2+C2+D2/3 calculează media celor trei celule. | Împărțirea se face prima; corect este =(B2+C2+D2)/3.
A: Filtrarea ascunde rândurile, nu le șterge.
```

## Exersează: „Magazinul clasei”

Realizează registrul `Magazin.xlsx`:

1. Tabelul cu 8 produse: denumire, preț, cantitate vândută luni, marți și miercuri.
2. Coloana **Total bucăți** (SUM) și coloana **Încasări** (preț × total bucăți), formatată ca monedă.
3. Sub tabel: încasările totale, cel mai mare număr de bucăți vândute dintr-un produs (MAX), câte produse au vândut peste 20 de bucăți (COUNTIF).
4. O coloană „Stoc” cu IF: „Comandă” dacă s-au vândut peste 30 de bucăți, altfel „OK”.
5. Formatare: titlu îmbinat, borduri, culori, formatare condiționată pe încasări.
6. O diagramă cu coloane cu încasările pe produse.

## Autoevaluare

Timp: 15 minute. Fiecare aplicație valorează 30 de puncte, plus 10 puncte din oficiu.

```categorii
# 1. Ce scrii în celulă?
Formulă doar cu operatori: =B2*C2, =(A1+A2)/2
Formulă cu funcție: =SUM(B2:B9), =MAX(E2:E9)
Valoare: 125, Popescu Ana
```

```ordonare
# 2. Pașii pentru o diagramă cu titlu
Selectezi datele cu etichete
Deschizi fila Inserare
Alegi tipul diagramei
Scrii titlul diagramei
```

```completare
# 3. Completează.
În A1:A4 sunt 10, 20, 30 și 40. =SUM(A1:A4) dă [100], =AVERAGE(A1:A4) dă [25], iar =COUNTIF(A1:A4;">15") dă [3].
```

**Cum te apreciezi?** 40 p · 70 p · 100 p. Scrie în caiet cum te simți: nemulțumit, mulțumit sau încântat.

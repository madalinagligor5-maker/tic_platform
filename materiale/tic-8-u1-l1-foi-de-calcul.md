---
titlu: Utilizarea foilor de calcul tabelar
disciplina: tic
clasa: 8
categorie: aplicatii
tip: lectie
unitate: Unitatea 1 · Calcul tabelar
ordine: 101
descriere: Ce este o foaie de calcul tabelar, la ce folosește, aplicații (Excel, Google Sheets, LibreOffice Calc), registru, foaie, rânduri, coloane, celule și adrese, plus avantajele calculului automat.
data: 2026-10-16
---

## Ce vei învăța azi

- ce este o **foaie de calcul tabelar** și la ce folosește;
- ce aplicații de calcul tabelar există;
- ce sunt **registrul**, **foaia**, **rândul**, **coloana** și **celula**;
- cum se scrie **adresa** unei celule.

## Să ne amintim

În clasa a VII-a ai făcut **tabele** în Word. Un tabel din Word doar **afișează** date. Dacă schimbi un număr, totalul nu se recalculează singur. O foaie de calcul face asta automat.

## Lecția pe scurt

### Ce este o foaie de calcul

O **foaie de calcul tabelar** este un tabel foarte mare, în care poți scrie **date** (numere, texte, date calendaristice) și **formule** care fac **calcule automat**. Când schimbi o valoare, toate rezultatele care depind de ea se **recalculează** imediat.

La ce folosește:

- **școală**: mediile, un orar, rezultatele unui experiment;
- **familie**: bugetul lunar, cheltuielile unei excursii;
- **firme**: salarii, stocuri, facturi, vânzări;
- **știință**: măsurători, statistici, **grafice**.

### Aplicații

- **Microsoft Excel** (în Microsoft 365, și online);
- **Google Sheets** (Foi de calcul Google), colaborativ, în browser;
- **LibreOffice Calc** (gratuit);
- **Numbers** (pe Mac și iPad).

### Registru, foi, rânduri, coloane, celule

- Un fișier Excel se numește **registru de calcul** (*workbook*), cu extensia **.xlsx**.
- Un registru conține una sau mai multe **foi de calcul** (*worksheets*): Foaie1, Foaie2…
- **Coloanele** sunt notate cu **litere**: A, B, C, …, Z, AA, AB…
- **Rândurile** sunt notate cu **numere**: 1, 2, 3…
- La intersecția unei coloane cu un rând este o **celulă**.

### Adresa unei celule

Adresa se scrie **litera coloanei** urmată de **numărul rândului**: **B3** este celula din coloana B, rândul 3. Celula selectată se numește **celulă activă** și are un chenar verde.

Un grup de celule alăturate formează o **zonă** (*range*), scrisă cu **două puncte** între colțuri: **A1:C4** înseamnă dreptunghiul de la A1 la C4 (3 coloane × 4 rânduri = 12 celule).

## Exemplu rezolvat: cheltuielile excursiei

| | A | B | C |
|---|---|---|---|
| **1** | Produs | Preț (lei) | Cantitate |
| **2** | Bilet tren | 45 | 1 |
| **3** | Sandviș | 12 | 2 |
| **4** | Apă | 4 | 3 |

- Textul „Sandviș” este în celula **A3**.
- Prețul biletului este în **B2**.
- Zona cu toate prețurile este **B2:B4**.
- În lecțiile următoare, Excel va calcula singur totalul: 45 · 1 + 12 · 2 + 4 · 3 = **81 lei**. Dacă apa se scumpește, totalul se schimbă automat.

## Aplicații interactive

```categorii
# Ce element al foii de calcul este?
Coloană: A, B, AA
Rând: 1, 7, 250
Celulă: C5, A1, AB12
Zonă: A1:C4, B2:B10
```

```quiz
# Alege răspunsul corect.
Ce este celula D7?
* celula din coloana D, rândul 7
- celula din rândul D, coloana 7
- a șaptea foaie a registrului

Câte celule are zona A1:B5?
- 5
- 7
* 10

Care este avantajul principal al unei foi de calcul față de un tabel din Word?
* rezultatele formulelor se recalculează automat când schimbi datele
- textul poate fi îngroșat
- poate avea mai multe rânduri
```

```adevarat-fals
A: Un fișier Excel se numește registru de calcul.
F: Coloanele sunt notate cu numere, iar rândurile cu litere. | Coloanele au litere, rândurile au numere.
A: Google Sheets este o aplicație de calcul tabelar colaborativă.
A: Un registru poate avea mai multe foi de calcul.
```

```categorii
# Aplicație de calcul tabelar sau nu?
Calcul tabelar: Excel, Google Sheets, LibreOffice Calc
Altă aplicație: Word, VideoPad, Code::Blocks
```

```completare
# Completează.
Fișierele Excel au extensia [.xlsx|xlsx]. Celula aflată în coloana C și pe rândul 4 are adresa [C4]. Zona de la A1 la A10 se scrie A1[:]A10.
```

## Exersează

1. Scrie trei situații din viața ta în care ai folosi o foaie de calcul.
2. Câte celule are zona B2:D6? Dar zona A1:A100?
3. Desenează în caiet un tabel cu notele tale la trei materii și scrie adresa fiecărei note, ca în Excel.
4. Deschide Excel sau Google Sheets și găsește celula **Z100**. Ce coloană urmează după Z?
5. **Portofoliu:** creează folderul `Portofoliu_TIC_8` și în el registrul `Prima_foaie.xlsx`, cu tabelul cheltuielilor unei excursii.

## Verifică-te

- Ce este o celulă și cum îi scrii adresa?
- Prin ce diferă un registru de o foaie de calcul?

## Pe scurt

O **foaie de calcul tabelar** păstrează date și face **calcule automate**. Fișierul este un **registru** (`.xlsx`), cu mai multe **foi**. Foaia are **coloane** (litere) și **rânduri** (numere); la intersecție se află **celula**, cu adresa de tipul **B3**. Mai multe celule formează o **zonă**, de exemplu **A1:C4**.

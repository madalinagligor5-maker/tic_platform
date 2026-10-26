---
titlu: Modalități de utilizare a registrelor de calcul. Calcule tabelare, funcții
disciplina: tic
clasa: 8
categorie: aplicatii
tip: lectie
unitate: Unitatea 1 · Calcul tabelar
ordine: 105
descriere: Funcții în Excel (SUM, AVERAGE, MIN, MAX, COUNT, COUNTIF, IF, ROUND), butonul AutoSum, inserarea unei funcții, sortarea și filtrarea datelor, plus un catalog cu medii și situația școlară.
data: 2026-10-16
---

> **Competențe specifice (Anexa 15):** CS 1.1, CS 3.1

## Ce vei învăța azi

- ce este o **funcție** și cum se scrie;
- să folosești funcțiile **SUM**, **AVERAGE**, **MIN**, **MAX**, **COUNT**, **COUNTIF**, **IF** și **ROUND**;
- să folosești butonul **AutoSum**;
- să **sortezi** și să **filtrezi** datele.

## Să ne amintim

Formulele încep cu **=** și folosesc adrese de celule: `=B2+C2+D2`. O zonă se scrie cu două puncte: **B2:D2**. Adresele **absolute** au semnul **$**.

## Lecția pe scurt

### Ce este o funcție

O **funcție** este o formulă gata făcută, cu un **nume** și **argumente** între paranteze:

`=NUME(argumente)`

În loc de `=B2+B3+B4+B5+B6+B7+B8+B9+B10` scrii `=SUM(B2:B10)`.

> În Excel cu setări românești, argumentele se despart prin **punct și virgulă**: `=IF(B2>=5;"Promovat";"Corigent")`. În Google Sheets sau Excel în engleză se folosește virgula.

### Funcții de bază

| Funcție | Ce calculează | Exemplu |
|---|---|---|
| **SUM** | suma | `=SUM(B2:B10)` |
| **AVERAGE** | media aritmetică | `=AVERAGE(B2:D2)` |
| **MIN** | cea mai mică valoare | `=MIN(B2:B10)` |
| **MAX** | cea mai mare valoare | `=MAX(B2:B10)` |
| **COUNT** | câte celule conțin numere | `=COUNT(B2:B10)` |
| **COUNTIF** | câte celule respectă o condiție | `=COUNTIF(B2:B10;">=9")` |
| **ROUND** | rotunjirea la un număr de zecimale | `=ROUND(E2;2)` |

### Funcția IF (dacă)

`=IF(condiție; valoare_dacă_adevărat; valoare_dacă_fals)`

Exemplu: `=IF(E2>=5;"Promovat";"Corigent")`. Textele se scriu între **ghilimele**. Condiția folosește `=`, `<>` (diferit), `<`, `<=`, `>`, `>=`.

![O funcție are nume și argumente între paranteze: SUM primește o zonă, iar IF primește o condiție și două valori, despărțite prin punct și virgulă.](fisiere/imagini/tic-8-u1-l5-calcule-functii.svg)

### Cum inserezi o funcție

- butonul **AutoSum** (Σ, **Însumare automată**, din **Pornire** sau **Formule**): Excel propune singur zona; săgeata de lângă el oferă **Medie**, **Contorizare numere**, **Max**, **Min**;
- butonul **fx** de lângă bara de formule: cauți funcția și completezi argumentele într-o fereastră;
- scrii direct `=` și primele litere: Excel îți arată o **listă** de funcții.

### Sortarea datelor (fila Date)

**Sortarea** așază rândurile unui tabel într-o anumită ordine, după valorile dintr-o **coloană** (coloana-cheie).

| Tipul datelor | Crescător | Descrescător |
|---|---|---|
| text | alfabetic, **A → Z** | **Z → A** |
| numere | de la cel **mai mic** la cel **mai mare** | de la cel mai mare la cel mai mic |
| date calendaristice | de la cea mai **veche** la cea mai **nouă** | de la cea mai nouă la cea mai veche |

Cum sortezi:

1. dai clic **într-o celulă din coloana** după care sortezi (sau selectezi **tot tabelul**, cu capul de tabel);
2. **Date → Sortare A → Z** (crescător) sau **Sortare Z → A** (descrescător);
3. pentru mai multe opțiuni: **Date → Sortare**: alegi coloana (**Sortare după**), ordinea și bifezi **Datele mele au anteturi**, ca rândul cu capul de tabel să **rămână sus** și să nu fie amestecat cu datele; cu **Adăugare nivel** sortezi după o a doua coloană când valorile din prima sunt egale (de exemplu, după medie, apoi alfabetic).

Reguli importante:

- **rândurile rămân întregi**: fiecare nume își păstrează notele. Dacă selectezi o **singură coloană** și alegi „Continuare cu selecția curentă”, doar ea se reordonează și datele se amestecă;
- tabelul nu trebuie să aibă **rânduri goale** în interior: Excel sortează doar zona continuă de date;
- **formulele** de pe fiecare rând se mută odată cu rândul lor;
- numerele scrise ca **text** (aliniate la stânga) se sortează greșit: „10” ajunge înaintea lui „9”.

> În foaia de calcul din platformă: selectezi tabelul (cu capul de tabel), apoi **Date → Sortare A→Z** sau **Sortare Z→A**. Sortarea se face după **prima coloană a selecției**, iar capul de tabel este recunoscut și rămâne pe primul rând.

### Filtrarea (fila Date)

- **Filtrare**: **Date → Filtru**; în capul de tabel apar săgeți. Alegi ce să se vadă (de exemplu, doar elevii cu media peste 9). Celelalte rânduri sunt **ascunse**, nu șterse.

## Exemplu rezolvat: catalogul clasei

| | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| **1** | Elev | Nota 1 | Nota 2 | Nota 3 | Media | Situația |
| **2** | Ana | 9 | 10 | 8 | 9 | Promovat |
| **3** | Bogdan | 4 | 6 | 3 | … | … |
| **4** | Carla | 7 | 8 | 10 | … | … |

1. În **E2** scrii `=ROUND(AVERAGE(B2:D2);2)`, media rotunjită la două zecimale: **9** (Ana); tragi formula până la E4: Bogdan **4,33**, Carla **8,33**.
2. În **F2** scrii `=IF(E2>=5;"Promovat";"Corigent")` și tragi în jos: Bogdan apare **Corigent**.
3. Sub tabel: media clasei `=AVERAGE(E2:E4)`, cea mai mare medie `=MAX(E2:E4)`, numărul elevilor cu media cel puțin 8: `=COUNTIF(E2:E4;">=8")` → **2**.
4. **Date → Sortare** după Media, descrescător: Ana, Carla, Bogdan.

## Aplicații interactive

```categorii
# Ce funcție folosești?
SUM: totalul cheltuielilor
AVERAGE: media notelor
MAX: cea mai mare temperatură
COUNTIF: câți elevi au nota 10
IF: afișează Promovat sau Corigent
```

```quiz
# Alege răspunsul corect.
În B2:B5 sunt valorile 4, 8, 6, 2. Cât dă =AVERAGE(B2:B5)?
- 20
* 5
- 8

Ce afișează =IF(A1>10;"mare";"mic"), dacă A1 conține 10?
- mare
* mic
- 10

Sortezi crescător numerele 25, 9, 100, 47. Ce ordine obții?
* 9, 25, 47, 100
- 100, 47, 25, 9
- 100, 25, 47, 9

Sortezi alfabetic Z → A numele Ana, Matei, Dan. Ce ordine obții?
- Ana, Dan, Matei
* Matei, Dan, Ana
- Dan, Matei, Ana

Ce face filtrarea?
* ascunde temporar rândurile care nu respectă condiția
- șterge definitiv rândurile
- sortează alfabetic
```

```ordonare
# Cum calculezi media lui Ana cu butonul fx
Selectezi celula E2
Apeși butonul fx de lângă bara de formule
Alegi funcția AVERAGE
Selectezi zona B2:D2
Apeși OK
```

```calcul-tabelar
# Catalogul. Calculează media fiecărui elev, apoi sortează tabelul alfabetic (A→Z) după nume, păstrând capul de tabel pe primul rând.
Date:
Elev;Nota 1;Nota 2;Media
Radu;8;10
Ana;9;9
Mihai;6;7
Bianca;10;9
Cerințe:
- D2:D5: =AVERAGE(B2:C2) | În D2:D5, media fiecărui elev, cu funcția AVERAGE
- A1: Elev | Capul de tabel a rămas pe rândul 1
- A2: Ana | Pe rândul 2 este Ana
- A3: Bianca | Pe rândul 3 este Bianca
- A4: Mihai | Pe rândul 4 este Mihai
- A5: Radu | Pe rândul 5 este Radu
- C5: 10 | Rândurile au rămas întregi: Radu are tot nota 10 la Nota 2
```

```calcul-tabelar
# Crosul școlii. Sortează echipele descrescător (Z→A) după punctaj, ca prima să fie câștigătoarea. Capul de tabel rămâne sus.
Date:
Punctaj;Echipa;Clasa
75;Vulturii;8A
92;Fulgerele;8B
68;Delfinii;8C
88;Lupii;8D
Cerințe:
- A1:C1: aldin | Capul de tabel este aldin
- A2: 92 | Pe primul loc (rândul 2) este punctajul cel mai mare, 92
- B2: Fulgerele | Câștigătoarea este echipa Fulgerele
- B3: Lupii | Pe locul 2 sunt Lupii (88)
- B4: Vulturii | Pe locul 3 sunt Vulturii (75)
- B5: Delfinii | Pe locul 4 sunt Delfinii (68)
- C5: 8C | Rândurile au rămas întregi: Delfinii sunt tot din 8C
```

```ordonare
# Cum sortezi un tabel cu cap de tabel, descrescător după medie (Excel)
Selectezi tot tabelul, împreună cu capul de tabel
Alegi Date → Sortare
Bifezi Datele mele au anteturi
La Sortare după alegi coloana Media
La Ordine alegi De la cel mai mare la cel mai mic
Apeși OK
```

```adevarat-fals
A: Funcția COUNT numără celulele care conțin numere.
F: Sortarea unei singure coloane din tabel păstrează legătura dintre nume și note. | Trebuie selectat tot tabelul, ca rândurile să rămână întregi.
A: În Excel cu setări românești, argumentele se despart prin punct și virgulă.
A: Textele dintr-o funcție IF se scriu între ghilimele.
A: Sortarea crescătoare a unor date calendaristice le așază de la cea mai veche la cea mai nouă.
F: La sortare, rândul cu capul de tabel trebuie să fie amestecat cu datele. | Bifezi „Datele mele au anteturi”, ca el să rămână sus.
A: Sortarea descrescătoare a numerelor 5, 12, 9 dă 12, 9, 5.
```

```completare
# Completează.
În A1:A4 sunt 3, 9, 5 și 7. =SUM(A1:A4) dă [24], =MAX(A1:A4) dă [9], iar =COUNTIF(A1:A4;">5") dă [2].
```

## Exersează

1. Scrie temperaturile dintr-o săptămână și calculează media, minima, maxima și amplitudinea (`=MAX(...)-MIN(...)`).
2. Completează catalogul cu 10 elevi și 4 note și calculează mediile, situația și media clasei.
3. Numără câți elevi au media peste 9 și câți sunt corigenți, cu COUNTIF.
4. Sortează catalogul alfabetic (A → Z), apoi descrescător după medie (cu **Datele mele au anteturi**); adaugă un al doilea nivel, ca elevii cu aceeași medie să apară alfabetic; filtrează doar elevii promovați.
5. Într-un buget lunar, afișează cu IF „Economie” dacă veniturile sunt mai mari decât cheltuielile, altfel „Deficit”.
6. **Portofoliu:** `Catalog_8.xlsx`, cu cel puțin 10 elevi, medii rotunjite, situația, statistici sub tabel și clasament.

## Verifică-te

- Ce argumente are funcția IF?
- Care e diferența dintre COUNT și COUNTIF?
- De ce trebuie selectat tot tabelul (cu antet) când sortezi?

## Pe scurt

**Funcțiile** sunt formule gata făcute: **SUM**, **AVERAGE**, **MIN**, **MAX**, **COUNT**, **COUNTIF**, **ROUND** și **IF** (care alege între două rezultate). Le inserezi cu **AutoSum**, cu **fx** sau scriindu-le. În Excel românesc, argumentele se despart prin **;**. Din fila **Date** poți **sorta** tabelul crescător sau descrescător după o coloană (păstrând capul de tabel sus și rândurile întregi) și îl poți **filtra**.

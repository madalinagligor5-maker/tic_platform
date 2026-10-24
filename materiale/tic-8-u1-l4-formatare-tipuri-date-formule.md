---
titlu: Formatarea unui registru de calcul. Tipuri de date. Formule
disciplina: tic
clasa: 8
categorie: aplicatii
tip: lectie
unitate: Unitatea 1 · Calcul tabelar
ordine: 104
descriere: Tipuri de date (număr, text, dată, procent, monedă), formatarea celulelor (font, aliniere, îmbinare, borduri, umplere, format numeric), formule cu operatori, ordinea operațiilor, adrese relative și absolute ($) și mesaje de eroare.
data: 2026-10-16
---

## Ce vei învăța azi

- ce **tipuri de date** poate conține o celulă;
- să **formatezi** celulele: font, aliniere, borduri, culori, format numeric;
- să scrii **formule** cu operatori;
- diferența dintre adresele **relative** și **absolute** ($);
- ce înseamnă **mesajele de eroare**.

## Să ne amintim

Bara de formule arată **conținutul real** al celulei. Mânerul de umplere copiază o formulă în celulele vecine. În Word ai formatat textul cu fila **Pornire**.

## Lecția pe scurt

### Tipuri de date

| Tip | Exemplu | Aliniere implicită |
|---|---|---|
| **Număr** | 125, 3,75 | dreapta |
| **Text** | Popescu Ana, Clasa 8A | stânga |
| **Dată / oră** | 16.10.2026, 08:30 | dreapta |
| **Procent** | 25% | dreapta |
| **Monedă** | 12,50 lei | dreapta |

În setările românești, virgula zecimală este **virgula**: 3,75. Dacă un număr apare aliniat la **stânga**, Excel l-a luat drept text (de exemplu, ai scris 3.75 cu punct).

### Formatarea celulelor (fila Pornire)

- **Font**: tipul, mărimea, **B** *I* <u>S</u>, culoarea textului;
- **Aliniere**: stânga, centru, dreapta, sus/mijloc/jos, **Încadrare text** (textul trece pe mai multe rânduri), **Îmbinare și centrare** (unește celule, de exemplu pentru titlu);
- **Borduri** (chenare) și **culoare de umplere** (fundal);
- **Formatul numerelor**: General, Număr (câte zecimale), **Monedă**, **Dată**, **Procent**; butoanele **Mărire / Micșorare zecimale**;
- **Stiluri de celule** și **Formatare ca tabel**: aspect gata făcut;
- **Descriptor de formate** (pensula): copiază formatarea de la o celulă la alta.

Formatarea schimbă doar **aspectul**, nu valoarea: 0,25 formatat ca procent apare **25%**.

### Formule

O formulă începe **întotdeauna** cu **=**. Poate conține numere, **adrese de celule**, **operatori** și **funcții**.

- operatori: `+` `-` `*` (înmulțire) `/` (împărțire) `^` (putere);
- ordinea: întâi `^`, apoi `*` și `/`, apoi `+` și `-`; parantezele schimbă ordinea;
- exemple: `=B2*C2`, `=(B2+C2+D2)/3`, `=A1^2`.

Când scrii formula, poți **da clic** pe celule în loc să scrii adresele. Folosind adrese (nu numere), formula se **recalculează** dacă schimbi datele.

### Adrese relative și absolute

Când copiezi formula `=B2*C2` din D2 în D3, Excel o **adaptează**: devine `=B3*C3`. Acestea sunt adrese **relative**.

Uneori vrei ca o adresă să rămână **fixă** (de exemplu, cursul euro dintr-o singură celulă). Pui **$**: `$F$1` este o adresă **absolută**. Tasta **F4** adaugă semnele $ automat.

![La copierea în jos, adresele relative (B2, C2, D2) se adaptează rândului, iar adresa absolută $F$1, cu cota de TVA, rămâne fixă.](fisiere/imagini/tic-8-u1-l4-formatare-tipuri-date-formule.svg)

### Mesaje de eroare

| Eroare | Ce înseamnă |
|---|---|
| `#####` | coloana e prea îngustă pentru număr; o lărgești |
| `#DIV/0!` | împărțire la zero (sau la o celulă goală) |
| `#NAME?` | ai scris greșit numele unei funcții |
| `#VALUE!` | ai făcut un calcul cu un text |
| `#REF!` | formula se referă la o celulă ștearsă |

## Exemplu rezolvat: factura de la librărie

| | A | B | C | D |
|---|---|---|---|---|
| **1** | Produs | Preț | Cantitate | Valoare |
| **2** | Caiet | 4,50 | 10 | `=B2*C2` |
| **3** | Pix | 2,00 | 5 | `=B3*C3` |
| **4** | Rucsac | 120,00 | 1 | `=B4*C4` |

1. Scrii în D2 formula `=B2*C2` și o tragi cu mânerul până la D4: rezultatele sunt **45**, **10**, **120**.
2. Formatezi coloanele B și D ca **Monedă** (lei), cu 2 zecimale.
3. Titlul: inserezi un rând deasupra, scrii „Factura” în A1, selectezi A1:D1 și apeși **Îmbinare și centrare**.
4. Pui **Toate bordurile** pe tabel și o culoare de umplere pe capul de tabel.
5. TVA-ul (21%) e scris în **F1**. În E2 scrii `=D2*$F$1` și tragi în jos: adresa F1 rămâne fixă.

## Aplicații interactive

```quiz
# Alege răspunsul corect.
Cu ce caracter începe orice formulă?
- +
* =
- $

Ce rezultat dă formula =2+3*4?
- 20
* 14
- 24

Copiezi formula =B2*$F$1 din E2 în E3. Ce formulă obții?
* =B3*$F$1
- =B3*$F$2
- =B2*$F$1
```

```categorii
# Ce eroare apare?
Eroarea DIV/0!: împărțire la zero
Eroarea NAME?: funcția =SUMA scrisă greșit
Eroarea #####: coloana e prea îngustă
Eroarea VALUE!: adunarea unui număr cu un text
```

```categorii
# Ce tip de date este?
Număr: 125, 48, -7
Text: Popescu Ana, Clasa 8A
Dată: 16.10.2026
Procent: 25%
```

```adevarat-fals
A: Formatarea ca procent schimbă doar aspectul: 0,25 apare ca 25%.
F: O formulă cu numere scrise direct se recalculează când schimbi datele din tabel. | Doar formulele cu adrese de celule se recalculează.
A: Tasta F4 adaugă semnele $ într-o adresă.
A: Îmbinare și centrare unește mai multe celule într-una singură.
```

```completare
# Completează.
Formula =(10+20)/2 are rezultatul [15]. Formula =3^2 are rezultatul [9]. O adresă care nu se schimbă la copiere se numește adresă [absolută|absoluta].
```

## Exersează

1. Scrie în celule un număr, un text, o dată și un procent; observă alinierea fiecăruia.
2. Calculează în Excel: `=15+5*2`, `=(15+5)*2`, `=2^10`, `=100/8`.
3. Refă factura de la librărie, cu cinci produse, formatare monedă, borduri și titlu îmbinat.
4. Fă un convertor lei – euro: cursul în F1, o listă de prețuri în lei în A2:A6 și, în B2:B6, prețurile în euro, cu adresă absolută.
5. Provoacă intenționat erorile `#DIV/0!` și `#####` și repară-le.
6. **Portofoliu:** `Buget_excursie.xlsx`, cu cheltuielile pe persoană și totalul pentru 25 de elevi (numărul elevilor într-o singură celulă, folosită cu adresă absolută).

## Verifică-te

- De ce e mai bine să scrii `=B2*C2` decât `=4,5*10`?
- Când folosești semnul $ într-o formulă?

## Pe scurt

O celulă poate conține **numere**, **text**, **date**, **procente** sau **monede**. **Formatarea** (font, aliniere, îmbinare, borduri, format numeric) schimbă doar aspectul. **Formulele** încep cu **=** și folosesc operatorii `+ - * / ^` și adrese de celule. La copiere, adresele **relative** se adaptează, iar cele **absolute** (`$F$1`) rămân fixe. Erorile `#` arată ce trebuie reparat.

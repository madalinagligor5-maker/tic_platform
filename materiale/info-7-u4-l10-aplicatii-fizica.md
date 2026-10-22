---
titlu: Aplicații de fizică în C++
disciplina: informatica
clasa: 7
categorie: programare
tip: lectie
unitate: Unitatea 4 · Limbajul de programare
ordine: 410
descriere: Probleme de fizică rezolvate în C++: viteza medie, transformări de unități (km/h și m/s), densitatea, greutatea pe alte planete, mișcarea uniformă pas cu pas și căderea liberă.
data: 2026-10-16
---

## Ce vei învăța azi

- să transformi o **formulă de fizică** într-un program;
- să lucrezi cu numere **reale** (`double`) și cu **unități de măsură**;
- să folosești **if** și **for** în probleme de fizică;
- să afișezi rezultatele cu un număr fix de **zecimale**.

## Să ne amintim

La fizică ai învățat **viteza medie**: v = d / t, **densitatea**: ρ = m / V, **greutatea**: G = m · g, unde g ≈ 9,8 N/kg pe Pământ. În C++, numerele reale se scriu cu **punct**, iar două zecimale se afișează cu `fixed << setprecision(2)` (biblioteca `iomanip`).

## Lecția pe scurt

### Pașii unei probleme de fizică

1. Afli **ce se dă** (datele de intrare) și **ce se cere** (datele de ieșire).
2. Scrii **formula**.
3. Verifici **unitățile**: toate în același sistem (de exemplu, metri și secunde).
4. Alegi **tipul** variabilelor: de obicei `double`.
5. Scrii programul: **citire → calcul → afișare**, cu unitatea de măsură.
6. **Testezi** cu valori pentru care știi rezultatul.

### Transformări de unități

- din km/h în m/s: împarți la **3,6** (72 km/h = 20 m/s);
- din m/s în km/h: înmulțești cu **3,6**;
- 1 h = 3600 s, 1 km = 1000 m, 1 kg = 1000 g.

### Atenție la împărțire

Dacă scrii `int d = 7, t = 2; cout << d / t;` obții **3**, nu 3.5. La fizică folosește `double` sau scrie `7.0 / 2`.

## Exemplu rezolvat: viteza medie

Un biciclist parcurge d kilometri în t minute. Afișează viteza medie în km/h și în m/s.

```cpp
#include <iostream>
#include <iomanip>
using namespace std;

int main()
{
    double d, t, v;
    cout << "Distanta (km): ";
    cin >> d;
    cout << "Timpul (minute): ";
    cin >> t;
    v = d / (t / 60);              // timpul transformat în ore
    cout << fixed << setprecision(2);
    cout << "v = " << v << " km/h" << endl;
    cout << "v = " << v / 3.6 << " m/s";
    return 0;
}
```

Pentru 15 km în 45 de minute: **v = 20.00 km/h** și **v = 5.56 m/s**.

### Al doilea exemplu: greutatea pe planete

```cpp
double m;
cin >> m;
cout << "Pamant: " << m * 9.8 << " N" << endl;
cout << "Luna: " << m * 1.6 << " N" << endl;
cout << "Marte: " << m * 3.7 << " N" << endl;
cout << "Jupiter: " << m * 24.8 << " N";
```

Un elev de 50 kg are pe Pământ greutatea de **490 N**, iar pe Lună doar **80 N**.

### Al treilea exemplu: mișcarea pas cu pas (for)

Un tren merge uniform cu v = 25 m/s. Afișează distanța parcursă după fiecare secundă, timp de 6 secunde:

```cpp
double v = 25;
for (int t = 1; t <= 6; t++)
    cout << "t = " << t << " s, d = " << v * t << " m" << endl;
```

### Al patrulea exemplu: ce plutește? (if)

Un corp plutește în apă dacă densitatea lui e **mai mică** decât a apei (1000 kg/m³):

```cpp
double m, V, ro;
cin >> m >> V;
ro = m / V;
if (ro < 1000) cout << "Pluteste";
else cout << "Se scufunda";
```

## Aplicații interactive

```quiz
# Alege răspunsul corect.
Cât este 54 km/h în m/s?
- 194,4
* 15
- 5,4

Ce afișează? int d = 9, t = 2; cout << d / t;
* 4
- 4.5
- 5

Un cub de lemn are m = 3 kg și V = 0,005 metri cubi. Ce afișează programul de plutire?
* Pluteste, pentru că densitatea e 600 kg pe metru cub
- Se scufunda, pentru că densitatea e 1600 kg pe metru cub
- nimic
```

```categorii
# Ce formulă folosești?
v = d / t: viteza medie
ro = m / V: densitatea
G = m * g: greutatea
d = v * t: distanța în mișcare uniformă
```

```ordonare
# Pașii unei probleme de fizică în C++
Afli ce se dă și ce se cere
Scrii formula
Aduci unitățile în același sistem
Declari variabilele double
Citești, calculezi și afișezi cu unitatea de măsură
Testezi cu valori cunoscute
```

```adevarat-fals
A: Ca să transformi km/h în m/s, împarți la 3,6.
F: Pentru calcule de fizică cu zecimale este bine să folosești tipul int. | Folosești double, ca să nu pierzi zecimalele.
A: Pe Lună greutatea unui corp este mai mică decât pe Pământ.
```

```completare
# Completează.
Un automobil merge cu 90 km/h, adică [25] m/s. În 4 secunde parcurge [100] m. Un om de 60 kg are pe Pământ greutatea de [588] N (g = 9,8 N/kg).
```

## Exersează

1. Citește viteza în m/s și afișeaz-o în km/h.
2. Citește masa și volumul unui corp și afișează densitatea și dacă plutește în apă.
3. **Căderea liberă:** un corp cade fără viteză inițială; după t secunde, viteza e v = g · t, iar distanța d = g · t² / 2. Afișează v și d pentru fiecare secundă de la 1 la 5.
4. Citește temperatura în grade Celsius și afișeaz-o în Fahrenheit: F = C · 1,8 + 32.
5. Doi colegi pleacă unul spre altul, cu vitezele v1 și v2 (m/s), de la distanța d (m). Afișează după câte secunde se întâlnesc.
6. **Portofoliu:** „Calculatorul de fizică”: un meniu (do … while) cu opțiunile viteză, densitate, greutate și ieșire.

## Verifică-te

- De ce trebuie aduse unitățile în același sistem înainte de calcul?
- Ce tip de date folosești pentru mărimile fizice și de ce?

## Pe scurt

O problemă de fizică devine program în pașii: **date → formulă → unități → tip double → citire, calcul, afișare → testare**. Atenție la împărțirea între întregi! Cu **if** iei decizii (plutește sau nu), iar cu **for** urmărești o mișcare **pas cu pas**.

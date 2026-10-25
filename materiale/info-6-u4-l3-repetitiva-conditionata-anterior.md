---
titlu: Structura repetitivă condiționată anterior
disciplina: informatica
clasa: 6
categorie: algoritmi
tip: lectie
unitate: Unitatea 4 · Algoritmi și programare
ordine: 403
descriere: Ce este o structură repetitivă, cele trei tipuri, structura „cât timp” (cu test inițial), blocul „repetă până când” din Scratch, cifrele unui număr în ordine inversă și jocul prințesei care numără pașii.
data: 2026-10-15
---

## Ce vei învăța azi

- ce este o **structură repetitivă** și ce înseamnă **iterație**;
- care sunt cele **trei tipuri** de structuri repetitive;
- cum funcționează structura **„cât timp”** (condiționată anterior, cu **test inițial**);
- cum o scrii în Scratch cu **„repetă până când”**;
- să afișezi **cifrele unui număr** în ordine inversă.

## Să ne amintim

Până acum ai folosit structura **secvențială** și structura **de decizie**. Uneori însă trebuie să repeți aceiași pași de mai multe ori.

## Lecția pe scurt

### Structura repetitivă

O **structură repetitivă** (ciclică) execută o secvență de pași **de mai multe ori**: **cât timp** o condiție este adevărată sau **până când** devine adevărată. O repetare se numește **iterație**.

**Trei tipuri:**

1. **condiționată anterior**: cu **test inițial**, număr **necunoscut** de pași;
2. **condiționată posterior**: cu **test final**, număr **necunoscut** de pași;
3. **cu contor**: număr **cunoscut** de pași.

### Structura „cât timp”

![La „cât timp” condiția se verifică înainte de fiecare iterație; în Scratch scrii „repetă până când” cu condiția negată.](fisiere/imagini/info-6-u4-l3-repetitiva-conditionata-anterior.svg)

```
cât timp (condiția C) execută
   secvența A
```

**Cum funcționează:**

1. Se verifică **condiția C**.
2. Dacă C este **adevărată**, se execută **secvența A** și se revine la pasul 1.
3. Dacă C este **falsă**, se iese din structură.

**De reținut:**

- Testul se face **înainte**: dacă C este **falsă de la început**, secvența A **nu se execută niciodată**.
- În secvența A trebuie să se **schimbe** ceva din condiție, altfel bucla nu se oprește niciodată și programul **se blochează**.

### În Scratch: „repetă până când”

În categoria **Control** găsești blocul **„repetă până când < >”**. El repetă blocurile din interior **până când** condiția devine **adevărată**, adică **cât timp e falsă**. Testul se face tot **la început**.

De aceea, **„cât timp C”** din pseudocod devine în Scratch **„repetă până când < nu C >”**.

### A. Cifrele unui număr, în ordine inversă

**Enunț:** se citește un număr natural nenul. Afișează-i cifrele începând cu cifra unităților.

**Date de intrare:** **a**, natural nenul. **Date de ieșire:** **c**, cifra afișată.

Folosim operatorul **%** pentru **restul împărțirii**: 8 % 3 = 2, 33 % 3 = 0, 783 % 10 = 3.

**Ideea:** cât timp numărul are cifre (**a > 0**):

- iei **ultima cifră**: c ← a % 10;
- o **afișezi**;
- o **elimini**: scazi cifra și împarți la 10.

```
citește a  (cu validare: natural nenul)
cât timp (a > 0) execută
   c ← a % 10
   scrie c
   a ← a – a % 10
   a ← a / 10
```

**Traseul datelor** pentru a = 783:

| Iterația | a | a > 0 | c | se afișează | a – a%10 | a / 10 |
|---|---|---|---|---|---|---|
| 1 | 783 | Adevărat | 3 | 3 | 780 | 78 |
| 2 | 78 | Adevărat | 8 | 8 | 70 | 7 |
| 3 | 7 | Adevărat | 7 | 7 | 0 | 0 |
| 4 | 0 | Fals | | | | |

Pașii se repetă de atâtea ori câte **cifre** are numărul.

### B. Câți pași face prințesa până la urs?

**Enunț:** o prințesă înaintează spre dreapta, cu pași de **15** pixeli, până **atinge** ursul. Câți pași face?

- **Date de intrare:** dimPas = 15.
- **Date de ieșire:** nrPasi.

Nu știm de la început câți pași sunt: depinde de distanță. Iar dacă prințesa atinge ursul **de la început**, nu face niciun pas. Deci folosim structura cu **test inițial**.

Scriptul, pus la personajul **Prințesa**:

```
când se dă clic pe steagul verde
setează dimPas la 15
setează nrPasi la 0
repetă până când < atinge Urs? >
   mergi (dimPas) pași
   modifică nrPasi cu 1
spune (alătură „Am făcut ” nrPasi)
```

Blocul **„atinge ( )?”** din **Detectare** devine adevărat când personajul atinge alt personaj, marginea scenei sau cursorul.

## Exemplu rezolvat

Ce afișează algoritmul A pentru **a = 50**?

1. a = 50 > 0: c = 0, se afișează **0**; a devine 5.
2. a = 5 > 0: c = 5, se afișează **5**; a devine 0.
3. a = 0: condiția e falsă, se oprește.

Se afișează **0**, apoi **5**.

## Aplicații interactive

```ordonare
# Cum funcționează „cât timp”? Pune pașii în ordine.
Se verifică condiția
Dacă e adevărată, se execută secvența
Se revine la verificarea condiției
Când condiția devine falsă, se iese din structură
```

```quiz
# Alege răspunsul corect.
Cât este 457 % 10?
- 45
* 7
- 4

De câte ori se execută secvența din „cât timp (a > 0)” pentru a = 0?
* niciodată
- o dată
- la infinit

Ce trebuie să se întâmple în interiorul unei structuri repetitive?
- nimic special
* să se schimbe o variabilă din condiție, ca bucla să se oprească
- să se șteargă toate variabilele

În ce categorie Scratch este blocul „repetă până când”?
- Evenimente
* Control
- Operatori
```

```categorii
# Ce tip de structură repetitivă este?
Condiționată anterior: test inițial, poate avea zero iterații
Condiționată posterior: test final, cel puțin o iterație
Cu contor: număr cunoscut de pași
```

```adevarat-fals
A: Structura repetitivă condiționată anterior are un număr necunoscut de iterații.
F: Structura repetitivă condiționată anterior are minimum o iterație. | Dacă condiția e falsă de la început, nu are nicio iterație.
A: Dacă prințesa atinge ursul de la început, nrPasi rămâne 0.
A: O repetare a secvenței se numește iterație.
```

## Exersează

1. Care sunt cele trei tipuri de structuri repetitive?
2. Urmărește algoritmul A pentru **a = 76**. Ce se afișează?
3. Scrie în Scratch un program care afișează **câte cifre pare** are un număr natural nenul.
4. Scrie un program care afișează **câte cifre de 0** are un număr natural nenul.
5. Scrie un program care afișează **a cincea cifră** a unui număr de șapte cifre.
6. Mută personajele din jocul prințesei. Cum se schimbă **nrPasi**?
7. **Portofoliu:** modifică jocul prințesei astfel încât lungimea pasului să fie **citită de la tastatură**.

## Verifică-te

- Ce se întâmplă dacă condiția nu devine niciodată falsă?
- Cum scrii în Scratch „cât timp a > 0”?

## Pe scurt

O **structură repetitivă** repetă pași; o repetare este o **iterație**. Structura **„cât timp”** verifică condiția **înainte** de fiecare iterație, deci poate avea **zero** iterații. În Scratch folosești **„repetă până când”**, cu condiția **negată**. Cu **% 10** iei ultima cifră a unui număr.

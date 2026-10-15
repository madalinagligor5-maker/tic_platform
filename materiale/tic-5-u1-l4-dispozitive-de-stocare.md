---
titlu: Dispozitive de stocare a datelor
disciplina: tic
clasa: 5
categorie: tic
tip: lectie
unitate: Unitatea 1 · Sisteme de calcul și comunicații
ordine: 104
descriere: HDD, SSD, stickul de memorie, cardurile și discurile optice; bitul, byte-ul și multiplii lui, cu transformări.
data: 2026-10-15
---

## Ce vei învăța azi

- care sunt dispozitivele de **stocare permanentă** a datelor și prin ce se deosebesc;
- ce sunt **bitul** și **byte-ul**;
- să transformi între multiplii byte-ului (KB, MB, GB, TB...).

## Să ne amintim

În lecția trecută ai aflat că **HDD-ul** și **SSD-ul** formează memoria permanentă a calculatorului, adică datele rămân acolo și după ce îl oprești.

## Lecția pe scurt

### Tipuri de dispozitive de stocare

Dispozitivele de stocare diferă prin felul în care memorează datele, prin **capacitate** (cât încape), prin **timpul de acces** și prin **viteza de transfer**.

1. **HDD (Hard-Disk Drive, „discul dur”)**: dispozitiv **magnetic**; datele sunt pe discuri care se rotesc foarte repede și sunt citite de niște capete de citire. Poate fi intern sau extern.
2. **SSD (Solid-State Drive)**: bazat pe **semiconductori** (memorii Flash), **fără piese în mișcare**. E mai rezistent la șocuri și la variații de temperatură decât HDD-ul și mai rapid. Poate fi intern sau extern.
3. **Stickul de memorie**: tot pe semiconductori, mic și ușor de purtat; se conectează la **portul USB**. Îl folosim pentru **copii de siguranță** și pentru a muta date.
4. **Cardurile de memorie** (SD, mini SD, micro SD, Compact Flash, MMC): pe semiconductori; le folosim la telefoane, tablete, aparate foto și laptopuri.
5. **Discurile optice**: **CD**, **DVD**, **Blu-ray (BD)**. Datele se scriu și se citesc cu o **rază laser** în unitatea optică. Informația este codificată prin 0 și 1, ca „găuri” și „plinuri” pe suprafața discului.

### Unitățile de măsură pentru stocare

- **Bitul (b)** este cea mai mică unitate de măsură a informației. Un bit poate fi doar **0** sau **1**.
- **8 biți = 1 byte (B)**, numit și **octet**. Byte-ul este cea mai mică unitate de stocare pe care calculatorul o poate adresa separat. De exemplu, o literă ocupă 1 byte.

Calculatorul folosește doar cifrele 0 și 1, de aceea multiplii byte-ului se obțin **înmulțind cu 1024** (adică 2¹⁰), nu cu 1000:

| Unitate | Valoare |
|---|---|
| 1 KB (kilobyte) | 1024 B |
| 1 MB (megabyte) | 1024 KB |
| 1 GB (gigabyte) | 1024 MB |
| 1 TB (terabyte) | 1024 GB |
| 1 PB (petabyte) | 1024 TB |
| 1 EB (exabyte) | 1024 PB |
| 1 ZB (zettabyte) | 1024 EB |
| 1 YB (yottabyte) | 1024 ZB |

> Atenție: 1 km = **1000** m, dar 1 KB = **1024** B.

### Capacități obișnuite

- **CD**: 700 MB
- **DVD**: 4,7 GB
- **Blu-ray**: 25 GB
- **HDD**: de la 120 GB până la 8 TB
- **SSD**: de la 32 GB până la 4 TB
- **stickuri și carduri**: de obicei de la câțiva GB până la 1–2 TB

## Exemplu rezolvat

**1. 3 072 MB = … GB?** Trecem la o unitate **mai mare**, deci **împărțim** la 1024: 3 072 : 1024 = **3 GB**.

**2. 2 TB = … MB?** Trecem la unități **mai mici**, deci **înmulțim** cu 1024 la fiecare pas: 2 TB = 2 × 1024 GB = 2 048 GB = 2 048 × 1024 MB = **2 097 152 MB**.

**3. Un calculator are un HDD de 1 TB și un SSD de 512 GB. Câtă memorie are în total, în MB?** 1 TB = 1024 GB, iar 1024 GB + 512 GB = 1 536 GB = 1 536 × 1024 MB = **1 572 864 MB**.

## Aplicații interactive

```ordonare
# Ordonează crescător, după capacitatea de stocare.
CD (700 MB)
DVD (4,7 GB)
Blu-ray (25 GB)
HDD (până la câțiva TB)
```

```categorii
# Cum memorează datele?
Magnetic: HDD-ul
Semiconductori (memorie Flash): SSD-ul, stickul de memorie, cardul micro SD
Optic (laser): CD-ul, DVD-ul, discul Blu-ray
```

```completare
# Fă transformările.
1 byte = [8] biți. 1 KB = [1024] B. 3 072 MB = [3] GB. 2 GB = [2048|2 048] MB. 5 YB = [5120|5 120] ZB.
```

```quiz
# Alege răspunsul corect.
Ce este bitul?
* cea mai mică unitate de măsură a informației, care poate fi 0 sau 1
- un dispozitiv de stocare
- 8 byți
Explicație: Un bit are o singură valoare: 0 sau 1. 8 biți formează un byte.

Care dispozitiv de stocare este magnetic?
- stickul de memorie
* HDD-ul
- DVD-ul
- cardul SD
Explicație: HDD-ul memorează datele pe discuri magnetice care se rotesc.

De ce este SSD-ul mai rezistent la șocuri decât HDD-ul?
- pentru că e mai mare
* pentru că nu are piese în mișcare
- pentru că folosește laser
```

```adevarat-fals
A: Stickul de memorie se conectează la calculator printr-un port USB.
F: 1 KB este egal cu 1000 de byți. | 1 KB = 1024 B, pentru că multiplii byte-ului sunt puteri ale lui 2.
A: Pe discurile optice datele se scriu și se citesc cu o rază laser.
F: Un DVD are 700 MB. | Un CD are 700 MB; un DVD are 4,7 GB.
```

## Exersează

1. Ce este un bit? Dar un byte?
2. Fă transformările: 2 TB = … KB; 1 PB = … MB; 3 072 MB = … GB; 5 YB = … ZB.
3. Investigație: caută acasă CD-uri sau DVD-uri vechi. Sunt zgâriate? Mai funcționează? Ce legătură observi între zgârieturi și funcționare?
4. **Portofoliu:** scrie pe o foaie toți multiplii byte-ului și dă un exemplu de transformare.

## Pe scurt

Datele se păstrează pe HDD (magnetic), SSD, stickuri și carduri (semiconductori) sau pe discuri optice (CD, DVD, Blu-ray). **8 biți = 1 byte**, iar fiecare multiplu al byte-ului este de **1024** de ori mai mare decât cel dinainte.

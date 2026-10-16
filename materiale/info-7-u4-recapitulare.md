---
titlu: Recapitulare – Limbajul de programare C++
disciplina: informatica
clasa: 7
categorie: algoritmi
tip: test
unitate: Unitatea 4 · Limbajul de programare
ordine: 413
descriere: Exerciții recapitulative și autoevaluare pentru Unitatea 4: Code::Blocks, elementele limbajului C++, structurile liniară, alternativă și repetitive (while, do … while, for), aplicații și roboți virtuali.
data: 2026-10-16
---

## Recapitulare

```cartonase
# C++ pe scurt
cin >> a; = citește valoarea lui a
cout << a; = afișează valoarea lui a
a / b între întregi = câtul împărțirii
a % b = restul împărțirii
if (c) A; else B; = execută A dacă c e adevărată, altfel B
while (c) { … } = repetă cât timp c e adevărată; verifică înainte
do { … } while (c); = repetă cât timp c e adevărată; execută cel puțin o dată
Bucla for cu i de la 1 la n = repetă de n ori
```

```categorii
# Ce structură folosești?
Liniară: aria unui dreptunghi
Alternativă: dacă un număr e par sau impar
Repetitivă: suma cifrelor unui număr
```

```quiz
# Ce afișează?
int a = 17, b = 5; cout << a / b << " " << a % b;
* 3 2
- 3.4 2
- 2 3

int s = 0; for (int i = 1; i <= 4; i++) s = s + i; cout << s;
- 4
* 10
- 24

int n = 0; do { n = n + 3; } while (n < 10); cout << n;
- 9
* 12
- 10
```

```adevarat-fals
A: Bucla for (i = 1; i <= n; i++) face n pași.
F: Instrucțiunile din while se execută cel puțin o dată. | Asta e valabil la do … while.
A: Pentru a interschimba două variabile ai nevoie de o variabilă auxiliară.
F: if (x = 3) verifică dacă x este egal cu 3. | Comparația se scrie cu ==.
```

## Exersează

1. Citește un număr natural n și afișează: câte cifre are, suma cifrelor și dacă este palindrom.
2. Citește n numere și afișează câte sunt prime.
3. Citește trei note, validate între 1 și 10, și afișează media cu două zecimale și calificativul.
4. Afișează primele n numere din șirul 1, 4, 9, 16, 25, … (pătratele perfecte).

## Autoevaluare

Timp: 15 minute. Fiecare aplicație valorează 30 de puncte, plus 10 puncte din oficiu.

```ordonare
# 1. Ordonează programul care afișează suma numerelor pare de la 1 la n
int n, s = 0;
cin >> n;
for (int i = 2; i <= n; i = i + 2)
s = s + i;
cout << s;
```

```quiz
# 2. Alege răspunsul corect.
Ce afișează pentru n = 2023? while (n > 0) { cout << n % 10; n = n / 10; }
* 3202
- 2023
- 7

Ce afișează? for (int i = 1; i <= 3; i++) for (int j = 1; j <= 2; j++) cout << i;
- 123123
* 112233
- 1212
```

```completare
# 3. Completează.
Pentru n = 360: n % 10 este [0], n / 10 este [36], iar n / 100 este [3].
```

**Cum te apreciezi?** 40 p · 70 p · 100 p. Scrie în caiet cum te simți: nemulțumit, mulțumit sau încântat.

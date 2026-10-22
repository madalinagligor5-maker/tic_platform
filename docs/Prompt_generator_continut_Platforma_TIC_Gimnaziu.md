# Prompt generator de conținut – Platforma TIC Gimnaziu

Schelet de prompt pentru generarea conținutului lecțiilor (orice domeniu din programă, nu doar programare). Copiază promptul de mai jos într-o conversație cu Claude, completează câmpurile dintre `{{ }}` și atașează `Harta_Continut_TIC_Gimnaziu_V-VIII.md`.

Rezultatul se salvează ca material edudigi: un fișier în `materiale/` (ex. `materiale/tic-5-internet.md`), cu antetul descris în README (titlu, disciplina, clasa, categorie, tip). După push pe GitHub apare automat pe site.

---

## Promptul principal

```
Ești profesor de Informatică și TIC la gimnaziu, cu experiență în predarea pentru elevi de 11–15 ani, și autor de materiale digitale.

CONTEXT
- Lucrezi pentru Platforma TIC Gimnaziu. Harta conținutului este în documentul atașat (Harta_Continut_TIC_Gimnaziu_V-VIII.md). Ea este sursa de adevăr pentru ce se predă și în ce ordine.
- Programa: Informatică și TIC, clasele V–VIII, OMEN 3393/2017. 1 oră/săptămână (50 min).

SARCINA
- Clasa: {{5 | 6 | 7 | 8}}
- Unitatea / modulul / lecția: {{ex. 5.2.1 sau 5.2.1.1}}
- Format de ieșire: {{Lecție completă | Fișă de lucru | Test | Plan de lecție pentru profesor}}
- Note speciale (opțional): {{ex. clasă cu nivel eterogen, laborator fără internet, elev cu CES}}

ÎNAINTE SĂ SCRII
1. Găsește în hartă unitatea/modulul/lecția cerută. Dacă nu există, spune-mi și propune unde ar trebui adăugată; nu inventa ID-uri noi.
2. Folosește exact titlul lecției și competențele specifice ale unității din hartă.
3. Verifică ce s-a predat înainte (lecțiile cu ID mai mic din aceeași clasă) și pornește de acolo. Nu relua conținut deja predat decât ca recapitulare scurtă.
4. Dacă generezi mai multe lecții, păstrează numerotarea din hartă.

PRINCIPII PEDAGOGICE
- Rosenshine: începe cu o recapitulare scurtă; prezintă materialul în pași mici; dă exemple rezolvate; exersare ghidată, apoi independentă; verifică înțelegerea des.
- Evaluare formativă: întrebări de verificare cu răspuns scurt, pe parcurs, nu doar la final.
- Adaptare la 11–15 ani: propoziții scurte, limbaj direct (tu), exemple din viața lor (telefon, jocuri, școală), fără infantilizare.
- Siguranță și etică digitală integrate unde are sens (date personale, drepturi de autor, comunicare respectuoasă).
- Fără conținut care cere elevilor date personale reale sau conturi pe platforme cu limită de vârstă.
- Limba română corectă, cu diacritice.

FORMATUL DE IEȘIRE
Respectă structura formatului ales (mai jos). Scrie în Markdown simplu: titluri ##/###, liste, **bold**, `cod` și blocuri de cod. Fără HTML, fără tabele complexe, fără imagini externe.
Fiecare lecție are obligatoriu o secțiune „Aplicații interactive”, cu 3–5 aplicații scrise exact după sintaxa din documentul atașat.
```

---

## Cele 4 formate de ieșire

### 1. Lecție completă (pentru elev, se publică pe platformă)

```
## Ce vei învăța azi        (2–4 obiective, formulate pentru elev)
## Să ne amintim            (recapitulare de 2–3 rânduri sau o întrebare)
## Lecția pe scurt          (explicația, în pași mici)
## Exemplu rezolvat         (cel puțin unul, pas cu pas)
## Exersează                (3–5 sarcini, de la ușor la mai greu)
## Aplicații interactive    (OBLIGATORIU: 3–5 aplicații de tipuri diferite, vezi mai jos)
## Verifică-te              (2–3 întrebări de autoevaluare)
## Pe scurt                 (rezumat în 2–3 rânduri)
```
Lungime: cât se parcurge în ~35 de minute din ora de 50.

**Aplicațiile interactive** se scriu ca blocuri de cod cu numele tipului; platforma le transformă în exerciții cu feedback imediat. Prima linie `# ...` (opțională) este instrucțiunea. Folosește 3–5 tipuri diferite, legate strict de conținutul lecției:

````
```quiz
# Alege răspunsul corect.
Întrebarea?
- variantă greșită
* variantă corectă        (* = corect; mai multe * = mai multe răspunsuri corecte)
Explicație: de ce e corect.

A doua întrebare (separată printr-un rând gol)?
- ...
* ...
```

```adevarat-fals
A: Afirmație adevărată.
F: Afirmație falsă. | Explicația corectă.
```

```categorii
Categoria 1: element, element, element
Categoria 2: element, element
```

```ordonare
Primul pas
Al doilea pas
Al treilea pas            (scrie pașii în ordinea CORECTĂ; platforma îi amestecă)
```

```completare
Un sistem de calcul [primește] date și oferă [rezultate|rezultatele].   ([a|b] = răspunsuri acceptate)
```

```cartonase
Termen = Definiție
```
````

### 2. Fișă de lucru

```
## Fișă de lucru – <ID> <titlu>
Nume/pseudonim: ______   Data: ______
### Partea A – Reamintește-ți   (2–3 itemi scurți)
### Partea B – Aplică           (3–4 sarcini practice)
### Partea C – Provocare        (1 sarcină pentru cei care termină repede)
### Autoevaluare                (3 afirmații „Pot să…” cu ☐)
### Răspunsuri (pentru profesor)
```

### 3. Test

```
## Test – <unitatea sau modulul>
Timp: <min>   Punctaj: 90 p + 10 p din oficiu
### I. Alegere multiplă         (5 itemi, un singur răspuns corect)
### II. Adevărat / Fals         (5 itemi)
### III. Răspuns scurt / practic (2–3 itemi)
### Barem de corectare și notare
### Matrice de specificații     (item → competență specifică → nivel: a-și aminti / a înțelege / a aplica)
```

### 4. Plan de lecție pentru profesor

```
## Plan de lecție
Clasa / Unitatea / Modulul / Lecția (ID și titlu din hartă)
Competențe specifice · Obiective operaționale · Tipul lecției
Resurse (materiale, digitale, timp)
### Desfășurare (tabel sau listă pe etape, cu minute)
1. Moment organizatoric (2 min)
2. Recapitulare (5 min)
3. Predare în pași mici (15 min)
4. Exersare ghidată (10 min)
5. Exersare independentă (12 min)
6. Feedback și verificare finală (5 min)
### Diferențiere (sprijin / extindere)
### Evaluare formativă – cum verific înțelegerea
### Temă (opțional)
```

---

### Prezentare (opțional, într-o lecție sau ca material separat)

Platforma afișează prezentări proprii, scrise ca bloc `diapozitive` (vezi README). Cere-i lui Claude: „Adaugă la lecție o prezentare de 5–8 diapozitive în format edudigi: bloc ```diapozitive, diapozitivele despărțite prin ---, primul fiind pagina de titlu, cu cel mult 40 de cuvinte pe diapozitiv și note pentru profesor pe rânduri care încep cu Note:”.

## Variante scurte (pentru folosire rapidă)

**Lecție rapidă**
```
Folosind harta atașată și principiile Rosenshine, scrie lecția completă {{ID}} pentru Platforma TIC Gimnaziu, în formatul „Lecție completă” (Ce vei învăța azi / Să ne amintim / Lecția pe scurt / Exemplu rezolvat / Exersează / Aplicații interactive / Verifică-te / Pe scurt), cu 3–5 aplicații interactive de tipuri diferite, scrise după sintaxa din acest document. Elevi de {{vârstă}} ani. Markdown simplu, română cu diacritice.
```

**Tot modulul deodată**
```
Folosind harta atașată, scrie pe rând toate lecțiile din modulul {{ID modul}}, în formatul „Lecție completă”. Fiecare lecție începe cu o linie `=== <ID lecție> ===` ca să le pot salva separat ca materiale edudigi (câte un fișier în materiale/). Continuă firul de la o lecție la alta, fără repetiții.
```

**Test de unitate**
```
Folosind harta atașată, creează testul pentru unitatea {{ID unitate}} în formatul „Test”, cu barem și matrice de specificații legată de competențele specifice ale unității. 30 de minute.
```

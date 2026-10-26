---
titlu: Realizarea unei animații grafice
disciplina: tic
clasa: 6
categorie: aplicatii
tip: lectie
unitate: Unitatea 2 · Animații grafice și modele 3D
ordine: 203
descriere: Scenariul, cadrele (frame-urile) și FPS, cum se face o animație din imagini succesive, aplicația Toontastic (tipuri de povești, personaje, înregistrare, export), testarea și depanarea.
data: 2026-10-15
---

> **Competențe specifice (Anexa 15):** CS 1.2, CS 3.2

## Ce vei învăța azi

- de ce începi orice animație cu un **scenariu**;
- ce sunt **cadrele** (*frame-urile*) și ce înseamnă **FPS**;
- ce **efecte** poți aplica și cum le **temporizezi**: durată, întârziere, ordine;
- cum faci o animație în **Toontastic**: povești, decoruri, personaje, înregistrare;
- ce înseamnă **testarea** și **depanarea** unei animații.

## Să ne amintim

În Paint 3D ai salvat o animație cu mișcări **predefinite** (placă turnantă, legănare). Azi vei face animații cu mișcări alese de **tine**.

## Lecția pe scurt

### Scenariul

Orice animație începe cu un **scenariu**: ce se întâmplă, în ce ordine, ce **cadre** are, ce **decoruri** și **personaje** apar în fiecare cadru și ce își spun personajele.

### Cadre și FPS

![Șase cadre cu capul unui personaj rotit cu câte 30°; derulate repede, la 24 de cadre pe secundă, ele par o mișcare fluentă.](fisiere/imagini/tic-6-u2-l3-animatie-grafica.svg)

O animație este o derulare rapidă a mai multor **cadre** (*frame-uri*): imagini statice, fiecare puțin diferită de cea dinainte. Împreună refac mișcarea.

**FPS** (*frames per second*, cadre pe secundă) arată câte cadre se succed într-o secundă. De el depind **viteza** și **calitatea** animației. La **24 de cadre pe secundă**, ochiul vede o mișcare **fluentă**.

**Exemplu:** rotirea capului unui personaj desenat în Paint 3D. Salvezi o imagine cu el din față, îl rotești cu **30°** și salvezi altă imagine, și tot așa, până ajunge iar cu fața la tine. Derulate repede, imaginile arată capul cum se rotește.

Unele programe lucrează cu **cadrele pregătite de tine** (de exemplu, **Scratch**). Altele **generează singure** cadrele (Paint 3D, Toontastic): tu vezi doar mișcarea finală.

### Efectele unei animații

Un **efect** este o schimbare pe care o aplici unui obiect sau unui personaj în timpul animației:

- **de intrare și de ieșire**: personajul **apare** sau **dispare** (brusc, prin **estompare**, intrând dintr-o parte);
- **de mișcare**: se **deplasează**, se **rotește**, **sare**;
- **de transformare**: își schimbă **mărimea**, **culoarea**, **transparența** sau **costumul**;
- **de sunet**: o replică, un zgomot, o melodie de fundal.

În **Paint 3D** efectele sunt **predefinite** (Placă turnantă, Legănare, Salt și rotire). În **Scratch** le construiești singur din blocuri: **„alunecă în 1 secunde la x: y:”** (mișcare), **„modifică efectul fantomă cu 10”** (estompare), **„modifică efectul culoare”**, **„costumul următor”**.

### Temporizarea

**Temporizarea** înseamnă să stabilești **momentul** și **durata** fiecărui efect, astfel încât animația să respecte **scenariul**. Ai trei lucruri de reglat:

1. **Durata**: cât ține un efect. În Scratch, „alunecă în **3** secunde” durează 3 secunde; în Paint 3D, **Multiplicatorul de viteză** face animația mai rapidă sau mai lentă.
2. **Întârzierea** (pauza): cât **aștepți** până pornește un efect. În Scratch, blocul **„așteaptă 2 secunde”** pus **înaintea** unui efect îl întârzie cu 2 secunde.
3. **Ordinea**: efectele pot fi
   - **succesive**: unul **după** altul (blocuri puse unul sub altul, în același script);
   - **simultane**: **în același timp** (scripturi separate care pornesc la același eveniment, de exemplu la steagul verde).

Și **viteza cadrelor** ține de temporizare: la **24 FPS** un cadru stă pe ecran 1/24 dintr-o secundă (aproape 0,04 s). În Scratch, „**așteaptă 0.2 secunde**” între două costume înseamnă **5 cadre pe secundă** (1 : 0,2 = 5): o mișcare mai sacadată, ca într-un desen animat simplu.

**Cronologia** (*timeline*) este planul temporizării: un tabel care arată, secundă cu secundă, ce se întâmplă. O scrii în **scenariu**, înainte să deschizi aplicația.

| Secunda | Ce se întâmplă | Efect | Durată |
|---|---|---|---|
| 0 | apare decorul cu pădurea | intrare | brusc |
| 0–3 | iepurele aleargă spre copac | mișcare (alunecă) | 3 s |
| 1 | se aude cântecul păsărilor | sunet (simultan cu alergarea) | 5 s |
| 3 | iepurele spune „Am ajuns!” | replică | 2 s |
| 5–6 | iepurele dispare | ieșire (fantomă) | 1 s |

În Scratch, cronologia de mai sus devine două scripturi care pornesc **simultan** la steagul verde:

```
Iepurele:
când se dă clic pe steagul verde
arată
setează efectul fantomă la 0
alunecă în 3 secunde la x: 150 y: -100     (durată 3 s)
spune „Am ajuns!” pentru 2 secunde
repetă (10)                                 (dispare în 1 s)
   modifică efectul fantomă cu 10
   așteaptă 0.1 secunde

Scena:
când se dă clic pe steagul verde
așteaptă 1 secunde                          (întârziere 1 s)
pornește sunetul „păsări”
```

### Toontastic

**Toontastic 3D** este o aplicație ușoară pentru animații 3D, pentru tablete și telefoane **Android** sau **iOS** și pentru **Chromebook**. Mișcarea o generează aplicația: tu doar **tragi personajele** pe drumul dorit și **povestești**.

> Dacă nu ai Toontastic, poți face aceleași etape (scenariu, decor, personaje, înregistrare) în **Scratch**, cu personaje și costume.

**Trei tipuri de povești**, fiecare cu „harta” ei:

| Poveste | Părți |
|---|---|
| **Short Story** (poveste scurtă) | Început, Mijloc, Sfârșit |
| **Classic Story** (poveste clasică) | Configurare, Conflict, Încercare, Punct culminant, Rezoluție |
| **Science Report** (raport științific) | Întrebare, Ipoteză, Experiment, Rezultate, Concluzie |

Fiecare parte este un **cadru** (scenă) cu animația ei. Raportul științific este o alternativă amuzantă la o prezentare PowerPoint.

### Pașii unei animații în Toontastic

1. Apeși **+** și alegi tipul de poveste (de exemplu, **Short Story**). Cu **+** de jos poți **insera**, **muta** sau **șterge** cadre.
2. Alegi cadrul **Început** și un **decor** (sau îl desenezi cu **Draw your own**).
3. **Desenezi un personaj** cu paleta de culori, grosimea liniei, găletușa și guma. Personajul devine **3D**; îi reglezi **grosimea**, apeși **FINISH** și îi dai un nume.
4. Adaugi un personaj din **galerie**.
5. Editezi personajele: le **mărești/micșorezi** cu două degete, le **rotești**, le **poziționezi** trăgându-le.
6. Apeși **START**: muți personajele și povestești. Apeși **STOP**. Aplicația înregistrează **mișcarea** și **vocea**.
7. Alegi o **melodie** de fundal și volumul.
8. Dai un **nume** poveștii și o **exporți** ca fișier **.mp4** în galeria dispozitivului.

Animațiile făcute se pot **edita**, **exporta**, **șterge** sau **reda**. Un personaj din galerie îl poți colora altfel sau îi poți pune **fața ta**, cu camera dispozitivului (aplicația îți cere întâi **permisiunea**).

### Testare și depanare

- **Testarea**: rulezi animația și verifici, pas cu pas, dacă urmează scenariul.
- **Depanarea**: rezolvi problemele găsite la testare.

Le repeți până nu mai ai nicio observație.

## Exemplu rezolvat: scenariu pentru o poveste scurtă

**Tema:** doi colegi în clasă; unul, în scaun cu rotile, este ajutat de prietenul lui să ajungă la tablă.

- **Început**: decorul este sala de clasă; apar cei doi colegi, care se salută.
- **Mijloc**: profesorul îl cheamă la tablă pe colegul în scaunul cu rotile; o bancă îi blochează drumul, iar prietenul o mută.
- **Sfârșit**: colegul rezolvă exercițiul, iar clasa aplaudă.

Pentru fiecare parte notezi: decorul, personajele, mișcările și replicile. Abia apoi deschizi aplicația.

## Aplicații interactive

```ordonare
# Pune în ordine părțile unei povești clasice (Classic Story).
Configurare: personajele și introducerea în poveste
Conflict: apare o problemă
Încercare: problema se complică
Punct culminant: personajele rezolvă problema
Rezoluție: arăți că problema s-a rezolvat
```

```quiz
# Alege răspunsul corect.
Ce înseamnă FPS?
- fișiere pe secundă
* cadre pe secundă (frames per second)
- forme pe scenă

Câte cadre pe secundă asigură o mișcare fluentă pentru ochiul omului?
- 2
* 24
- 1000

Ce faci înainte să deschizi aplicația de animație?
* scrii scenariul: acțiunea, cadrele, decorurile, personajele și replicile
- exporți animația
- alegi melodia de fundal

Câte părți are o poveste de tip Science Report?
- trei
* cinci
- șapte
```

```categorii
# Ce tip de poveste are aceste părți?
Short Story: Început, Mijloc, Sfârșit
Classic Story: Conflict, Punct culminant, Rezoluție
Science Report: Ipoteză, Experiment, Concluzie
```

```categorii
# Ce reglezi: durata, întârzierea sau ordinea?
Durată: iepurele aleargă 3 secunde, rotirea ține o jumătate de secundă
Întârziere: muzica pornește abia după 1 secundă, personajul așteaptă 2 secunde înainte să vorbească
Ordine: întâi apare decorul, apoi personajul; sunetul pornește în același timp cu mișcarea
```

```quiz
# Temporizarea animației
În Scratch, între două costume pui „așteaptă 0.5 secunde”. Câte cadre pe secundă are animația?
- 5
* 2
- 50
Explicație: 1 : 0,5 = 2 cadre pe secundă.

Cum faci în Scratch ca un sunet să pornească în același timp cu mișcarea personajului?
* pui sunetul într-un script separat care pornește tot la steagul verde
- pui sunetul după mișcare, în același script
- nu se poate

Ce face blocul „așteaptă 2 secunde” pus înaintea blocului „spune Bună!”?
- replica ține 2 secunde
* replica pornește cu o întârziere de 2 secunde
- personajul spune de două ori „Bună!”

Ce este cronologia (timeline) unei animații?
- lista personajelor
* planul care arată, secundă cu secundă, ce efect apare și cât durează
- numele fișierului exportat
```

```ordonare
# Pune efectele în ordinea din cronologie.
Apare decorul cu pădurea
Iepurele începe să alerge spre copac
Iepurele spune „Am ajuns!”
Iepurele dispare treptat
```

```adevarat-fals
A: Două scripturi care pornesc la același eveniment rulează simultan.
F: Durata și întârzierea unui efect sunt același lucru. | Durata arată cât ține efectul, întârzierea cât aștepți până pornește.
A: Scratch lucrează cu cadrele pregătite de tine, sub formă de costume.
F: O animație generată automat nu folosește cadre. | Aplicația creează singură cadrele, dar tu vezi doar mișcarea finală.
A: Testarea și depanarea se repetă până nu mai există nicio problemă.
A: Toontastic exportă animațiile ca fișiere .mp4.
```

```eseu
Sarcină de creație: scrie scenariul unei animații de 10–15 secunde, „Ghiocelul vestește primăvara”, cu cel puțin două personaje sau obiecte. Include o cronologie: pentru fiecare moment, spune ce efect apare (intrare, mișcare, transformare, sunet, ieșire), cât durează, dacă are întârziere și ce efecte rulează simultan.
Cuvinte: 60-200
Barem: 3p scenariu coerent (început, mijloc, sfârșit) cu cel puțin două personaje/obiecte; 3p cel puțin patru efecte de tipuri diferite; 3p durate și întârzieri precizate, care se încadrează în 10–15 secunde; 1p cel puțin o pereche de efecte simultane.
```

## Exersează

1. Fă după pașii de mai sus o poveste scurtă în Toontastic (sau în Scratch).
2. Creează o **poveste clasică**. Adaugă-i încă un cadru de tip **Încercare**, cu un scenariu al tău. Schimbă melodia unui cadru.
3. Adaugă două personaje „spectatori”. Mută unul în alt loc al scenei și șterge-l pe celălalt.
4. Fă un personaj 3D numit **Gogu**, cu o gură zâmbitoare și păr negru.
5. Realizează o **felicitare animată** pentru ziua bunicii.
6. În Scratch, fă după cronologia din lecție animația cu iepurele. Apoi schimbă temporizarea: iepurele să alerge **5 secunde**, iar muzica să pornească după **2 secunde**. Ce s-a schimbat?
7. La găina sau la alt personaj cu mai multe costume, încearcă pauzele **0.5**, **0.2** și **0.05** secunde între costume. Câte cadre pe secundă are fiecare variantă? Care arată mai fluent?
8. **Portofoliu:** caută informații despre **Jules Verne** și fă o animație cu trei personaje (unul fiind Gogu), cu tema „Pe urmele lui Jules Verne”. Scrie întâi **scenariul** cu **cronologia** (ce se întâmplă în fiecare secundă) și respect-o în animație.

## Verifică-te

- Ce este un cadru (frame)?
- Care sunt cele trei tipuri de povești din Toontastic?
- Ce diferență este între testare și depanare?
- Ce diferență este între **durata** și **întârzierea** unui efect? Cum faci două efecte **simultane** în Scratch?

## Pe scurt

O animație începe cu un **scenariu** și este o derulare rapidă de **cadre**. La **24 FPS** mișcarea pare fluentă. **Efectele** (intrare, mișcare, transformare, sunet, ieșire) se **temporizează**: fiecare are o **durată**, eventual o **întârziere**, și un loc în **ordine** (succesiv sau simultan), după **cronologia** din scenariu. În **Toontastic** alegi tipul de poveste (**Short Story**, **Classic Story**, **Science Report**), decorul și personajele, apoi înregistrezi mișcarea și vocea și exporți **.mp4**. La final **testezi** și **depanezi**.

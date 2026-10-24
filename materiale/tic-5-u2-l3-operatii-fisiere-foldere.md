---
titlu: Operații cu fișiere și foldere
disciplina: tic
clasa: 5
categorie: tic
tip: lectie
unitate: Unitatea 2 · Sistemul de operare
ordine: 203
descriere: Lucrul în File Explorer: creare, deschidere, redenumire, copiere, mutare, ștergere și restaurare, selecție multiplă și căutare.
data: 2026-10-15
---

## Ce vei învăța azi

- să folosești **File Explorer** ca să navighezi printre foldere;
- să **creezi, deschizi, redenumești, copiezi, muți și ștergi** fișiere și foldere;
- să **recuperezi** un fișier din Coșul de reciclare, să selectezi mai multe fișiere deodată și să **cauți** un fișier.

## Să ne amintim

Datele sunt păstrate în **structuri arborescente** de foldere și fișiere, care pornesc de la o rădăcină, de exemplu `C:`.

## Lecția pe scurt

### Programe pentru fișiere

Pentru lucrul cu fișiere și foldere, Windows are programul **File Explorer**. Îl pornești din meniul Start sau cu combinația **tasta Windows + E**. Există și alte programe asemănătoare: Total Commander și FreeCommander (Windows), Nautilus (Linux), Finder (macOS).

### Navigarea

- În **stânga** ferestrei vezi **structura arborescentă** de foldere. Un clic pe `>` (sau `+`) sau un dublu clic pe folder îi arată subfolderele; operația se numește **expandare**.
- Un clic pe un folder din stânga îi arată **conținutul în dreapta**.
- În dreapta, **dublu clic** pe un folder îl deschide, iar **un clic** pe un fișier îl **selectează**.
- Din meniul **Vizualizare (View)** alegi cum vezi fișierele: pictograme mari sau mici, listă, detalii.

### Proprietăți

Selectezi fișierul sau folderul → **clic dreapta** → **Proprietăți (Properties)**. Vezi detalii, inclusiv **dimensiunea (Size)**.

### Operațiile principale

| Operație | Cum o faci |
|---|---|
| **Creare folder** | clic dreapta → **Nou (New)** → **Folder** → scrii numele → **Enter** |
| **Creare fișier** | clic dreapta → **Nou** → alegi tipul (de exemplu, *Text document*) |
| **Deschidere** | **dublu clic** pe fișier; se deschide în aplicația cu care a fost creat |
| **Redenumire** | selectezi → clic pe nume → scrii numele nou → **Enter** |
| **Copiere** | **Ctrl + C**, apoi în folderul destinație **Ctrl + V**; sau tragi fișierul ținând apăsat **Ctrl**; sau clic dreapta → **Copiere** / **Lipire** |
| **Mutare** | **Ctrl + X**, apoi **Ctrl + V**; sau tragi fișierul în alt folder (drag and drop); sau clic dreapta → **Decupare** / **Lipire** |
| **Ștergere** | tasta **Delete**, sau clic dreapta → **Ștergere (Delete)** |

> **Copiere** = fișierul rămâne și în locul vechi, și apare în cel nou. **Mutare** = fișierul pleacă din locul vechi.

![La copiere fișierul rămâne și în folderul vechi, la mutare pleacă de acolo; un fișier șters ajunge în Coșul de reciclare, de unde poate fi restaurat.](fisiere/imagini/tic-5-u2-l3-operatii-fisiere-foldere.svg)

### Coșul de reciclare

Un fișier șters ajunge în **Coșul de reciclare (Recycle Bin)**, de unde îl poți **recupera**: deschizi Coșul de reciclare → clic dreapta pe fișier → **Restaurare (Restore)**. Dacă îl ștergi și din Coșul de reciclare, este **șters definitiv**.

### Selecția multiplă

- fișiere **unul după altul**: clic pe primul, ții apăsat **Shift**, clic pe ultimul;
- fișiere **răzlețe**: clic pe primul, ții apăsat **Ctrl**, clic pe fiecare dintre celelalte;
- **toate** fișierele din folder: **Ctrl + A**.

### Căutarea

Selectezi folderul în care cauți → scrii în caseta **Căutare (Search)** → **Enter** → clic dreapta pe rezultat → **Deschidere locație fișier**.

## Exemplu rezolvat

**Sarcină:** în folderul `Lucru` creează subfolderele `Aplic1` și `Aplic2`. În `Aplic1` creează `test1.txt`, fă o copie numită `test2.txt`, apoi mută `test2.txt` în `Aplic2`.

1. În `Lucru`: clic dreapta → Nou → Folder → `Aplic1` → Enter. La fel pentru `Aplic2`.
2. În `Aplic1`: clic dreapta → Nou → Text document → `test1.txt`.
3. Selectezi `test1.txt` → **Ctrl + C** → **Ctrl + V** → redenumești copia în `test2.txt`.
4. Selectezi `test2.txt` → **Ctrl + X** → deschizi `Aplic2` → **Ctrl + V**.

## Aplicații interactive

```cartonase
# Combinații de taste
Ctrl + C = Copiere
Ctrl + X = Tăiere (decupare), pentru mutare
Ctrl + V = Lipire
Ctrl + A = Selectarea tuturor fișierelor din folder
Tasta Windows + E = Pornește File Explorer
Alt + F4 = Închide fereastra
```

```ordonare
# Cum muți un fișier cu tastatura? Pune pașii în ordine.
Selectezi fișierul
Apeși Ctrl + X
Deschizi folderul destinație
Apeși Ctrl + V
```

```quiz
# Alege răspunsul corect.
Dacă dai clic dreapta pe un folder și alegi Proprietăți, vezi:
- toate fișierele din folder
* proprietățile folderului, inclusiv dimensiunea lui
- toate folderele din calculator

Un fișier șters mai poate fi recuperat?
* Da, din Coșul de reciclare, cu Restaurare
- Nu, niciodată
- Doar dacă repornești calculatorul
Explicație: Fișierul e șters definitiv doar dacă îl ștergi și din Coșul de reciclare.

Cum selectezi mai multe fișiere care NU sunt unul după altul?
- ții apăsat Shift și dai clic pe ultimul
* ții apăsat Ctrl și dai clic pe fiecare
- apeși Ctrl + V
```

```categorii
# Copiere sau mutare?
Copiere: Ctrl + C apoi Ctrl + V, tragi fișierul ținând Ctrl, fișierul rămâne și în locul vechi
Mutare: Ctrl + X apoi Ctrl + V, tragi fișierul fără Ctrl, fișierul pleacă din locul vechi
```

```adevarat-fals
A: File Explorer este programul din Windows pentru lucrul cu fișiere și foldere.
F: Un fișier se deschide cu un singur clic în partea dreaptă a File Explorer. | Un clic îl selectează; dublu clic îl deschide.
A: Ctrl + A selectează toate fișierele din folderul curent.
```

## Exersează

1. Fă pe calculator sarcina din exemplul rezolvat. Apoi șterge `test1.txt` și restaurează-l din Coșul de reciclare.
2. Exersează selecția multiplă pe cele două fișiere.
3. Alege trei foldere de pe calculator și scrie-le în ordinea crescătoare a dimensiunii (folosește Proprietăți).
4. Investigație: câștigi timp dacă folosești combinațiile de taste în loc de meniuri?
5. **Portofoliu:** creează folderul `Portofoliu`, iar în el un fișier text `PrimulMeuFisier.txt` și un folder `Documente`.

## Pe scurt

În **File Explorer** creezi, deschizi, redenumești, copiezi (**Ctrl + C / Ctrl + V**), muți (**Ctrl + X / Ctrl + V**) și ștergi (**Delete**) fișiere și foldere. Ce ștergi ajunge în **Coșul de reciclare**, de unde poți restaura. Cu **Ctrl** și **Shift** selectezi mai multe fișiere deodată.

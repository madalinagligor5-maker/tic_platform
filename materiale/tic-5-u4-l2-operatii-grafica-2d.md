---
titlu: Operații pentru realizarea graficii 2D
disciplina: tic
clasa: 5
categorie: aplicatii
tip: lectie
unitate: Unitatea 4 · Editare grafică
ordine: 402
descriere: Lucrul cu fișiere grafice, culori RGB, forme, selecție, copiere, redimensionare, rotire și text în Paint, cu desenul „Copacii gemeni” pas cu pas.
data: 2026-10-15
---

## Ce vei învăța azi

- să creezi, să deschizi, să salvezi și să tipărești un **fișier grafic**;
- ce este modelul de culori **RGB** și cum creezi o culoare nouă;
- să desenezi **forme**, să **selectezi**, să **copiezi**, să **redimensionezi** și să **rotești** părți din desen;
- să adaugi **text** și să folosești celelalte instrumente din Paint.

## Să ne amintim

În Paint, comenzile pentru fișier sunt în fila **Fișier**, iar cele pentru desen în fila **Pornire**.

## Lecția pe scurt

### Fișierul grafic

| Operație | Comandă | Taste |
|---|---|---|
| fișier nou | **Fișier → Nou** | **Ctrl + N** |
| deschidere | **Fișier → Deschidere** | **Ctrl + O** |
| salvare în același fișier | **Fișier → Salvare** | **Ctrl + S** |
| salvare în alt fișier | **Fișier → Salvare ca** | |
| tipărire | **Fișier → Tipărire** | **Ctrl + P** |

La prima salvare alegi **numele** fișierului și **locul** unde îl păstrezi. **Salvare ca** creează un fișier nou și îl lasă neschimbat pe cel vechi.

Dimensiunea desenului se stabilește din **Fișier → Proprietăți** (de exemplu, 640 × 480 pixeli).

### Culorile

- **Culoarea 1**: culoarea de **prim-plan** (linii, contururi, text).
- **Culoarea 2**: culoarea de **fundal** (umplerea formelor, urma radierei).

Toate culorile se obțin din trei culori de bază: **Roșu (Red)**, **Verde (Green)** și **Albastru (Blue)**, fiecare în cantități de la **0 la 255**. Combinația se numește **RGB**. O culoare nouă o creezi din **Pornire → Culori → Editare culori**: scrii valorile R, G, B, apoi apeși **Adăugare la culori particularizate**.

### Formele

- Alegi forma din **Pornire → Forme**, apoi o desenezi ținând apăsat butonul stâng al mouse-ului.
- Cu **Shift** apăsat desenezi o **linie dreaptă**, un **pătrat** sau un **cerc**.
- **Conturul** se desenează cu Culoarea 1; îi alegi **grosimea** (**Dimensiune**) și stilul (**Contur**).
- **Umplerea** formelor închise se face cu Culoarea 2: fără umplere, culoare unică, creion cerat, acuarelă etc.
- Cât timp forma este încă selectată, îi poți schimba culorile și stilul; un clic în afara ei o fixează.

### Selecție și transformări

- **Selectare** (**Pornire → Imagine**): **dreptunghiulară**, **liberă**, **totală**, **inversată**, **transparentă** (fundalul alb devine transparent).
- **Copiere**: **Ctrl + C**, apoi **Ctrl + V**. **Mutare**: **Ctrl + X**, apoi **Ctrl + V**. **Ștergere**: tasta **Delete**.
- **Redimensionare**: în **procente** sau **pixeli**; cu **Menținere raport aspect** forma nu se deformează. Tot aici poți **înclina** imaginea.
- **Trunchiere**: selectezi ce vrei să **rămână**, apoi **Trunchiere**.
- **Rotire**: alegi direcția și unghiul. **Răsturnare orizontală** întoarce desenul ca **în oglindă**.

### Textul

Cu instrumentul **Text** dai clic pe desen și scrii. Apare fila **Instrumente text**, unde alegi **fontul**, **mărimea** (8–72 sau alta, scrisă de tine), **Aldin (Bold)**, **Cursiv (Italic)** și **Subliniat (Underline)**. Textul are Culoarea 1; fundalul lui are Culoarea 2 doar dacă alegi **Opac**.

### Alte instrumente

- **Creion**: linie liberă, cu Culoarea 1;
- **Umplere cu culoare**: colorează cu Culoarea 1 o zonă închisă, cu un singur clic;
- **Radieră**: șterge, iar urma ei are Culoarea 2;
- **Selector de culoare**: preia o culoare din desen;
- **Lupă**: clic stânga mărește, clic dreapta micșorează;
- **Pensule**: urme ca de pensulă, cu Culoarea 1.

## Exemplu rezolvat: „Copacii gemeni”

1. Stabilești dimensiunea desenului: **640 × 480 px**. Creezi trei nuanțe de verde (verde1, verde2, verde3) cu **Editare culori**.
2. **Trunchiul**: un dreptunghi cu colțuri rotunjite, maro, cu umplere **Culoare unică**.
3. **Coroana**: dreptunghiuri rotunjite verzi, în cele trei nuanțe, cu câteva frunze evidențiate.
4. Selectezi frunzișul (**selecție dreptunghiulară**), îl **copiezi** și îl **lipești** alături, apoi îl **redimensionezi la 85%**. Copia o mai copiezi o dată și o redimensionezi la **70%**.
5. Tragi frunzișurile peste trunchi și desenezi un cerc roșu pe cel mai mare. Primul copac e gata.
6. Selectezi copacul, îl copiezi, îl lipești la dreapta și îl întorci cu **Rotire → Răsturnare orizontală**.
7. Adaugi textul **„Copacii gemeni”**: Arial, 16, Aldin, negru.
8. Salvezi în folderul `Lucru`, cu numele `Copaci_gemeni.jpg`.

## Aplicații interactive

```ordonare
# Cum duplici un element dintr-un desen în Paint? Pune pașii în ordine.
Selectezi elementul cu Selectare
Apeși Ctrl + C (Copiere)
Apeși Ctrl + V (Lipire)
Tragi copia la locul dorit
```

```quiz
# Alege răspunsul corect.
Modelul RGB folosește culorile:
- roșu, galben, bleumarin
* roșu, verde, albastru
- alb, negru, albastru

Cu ce instrument colorezi dintr-odată o zonă închisă?
- Creion
* Umplere cu culoare
- Lupă

Ce faci ca să desenezi un cerc perfect?
- desenezi foarte încet
* ții apăsat Shift în timp ce desenezi elipsa
- folosești radiera
Explicație: Shift transformă elipsa în cerc, dreptunghiul în pătrat și linia oarecare în linie dreaptă.

Ce tip de rotire folosești ca să faci aripa a doua a unui fluture?
- rotire cu 90°
* răsturnare orizontală (în oglindă)
- rotire cu 180°
```

```categorii
# Culoarea 1 sau Culoarea 2?
Culoarea 1 (prim-plan): conturul formelor, textul, creionul, umplerea cu culoare
Culoarea 2 (fundal): umplerea formelor, urma radierei
```

```cartonase
# Comenzi rapide în Paint
Ctrl + N = Fișier nou
Ctrl + O = Deschidere
Ctrl + S = Salvare
Ctrl + P = Tipărire
Ctrl + C / Ctrl + V = Copiere / Lipire
Ctrl + X = Decupare (pentru mutare)
```

```adevarat-fals
A: „Salvare ca” salvează desenul într-un fișier nou.
F: Dacă dai un clic cu radiera pe un cerc, se șterge tot cercul. | Radiera șterge doar ce atinge, nu toată forma.
A: Trunchierea păstrează doar zona selectată din imagine.
A: Cu „Menținere raport aspect”, imaginea nu se deformează la redimensionare.
```

## Exersează

1. Deschide în Paint o imagine cu un animal care îți place și desenează pe ea o inimioară roșie.
2. Fă un desen cu două cercuri, patru dreptunghiuri și două triunghiuri.
3. Desenează un dreptunghi cu colțuri rotunjite și, în interiorul lui, trei steluțe în culori create de tine (nu din paletă).
4. Se poate face în Paint un desen de exact 5 × 5 cm? Caută în **Fișier → Proprietăți**.
5. **Portofoliu digital:** desenează un peisaj cu un copac și salvează-l ca `Peisaj.png` în folderul `Portofoliu`.

## Pe scurt

În Paint salvezi cu **Ctrl + S** sau **Salvare ca**, iar culorile se formează din **RGB**. Desenezi **forme** (cu **Shift** pentru pătrat și cerc), **selectezi**, **copiezi**, **redimensionezi**, **trunchiezi** și **rotești**. **Culoarea 1** este pentru prim-plan, **Culoarea 2** pentru fundal.

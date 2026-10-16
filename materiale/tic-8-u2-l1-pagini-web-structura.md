---
titlu: Pagini web – exemple, analiză, structură
disciplina: tic
clasa: 8
categorie: aplicatii
tip: lectie
unitate: Unitatea 2 · Pagini web
ordine: 201
descriere: Ce sunt pagina web, site-ul, adresa URL, serverul și browserul, structura unei pagini (antet, meniu, conținut, subsol), limbajul HTML cu etichete de bază și criterii de analiză a unui site.
data: 2026-10-16
---

## Ce vei învăța azi

- ce sunt **pagina web**, **site-ul** și **adresa URL**;
- cum ajunge o pagină de pe **server** în **browser**;
- care este **structura** unei pagini web;
- ce este limbajul **HTML** și câteva **etichete** de bază;
- după ce **criterii** analizezi un site.

## Să ne amintim

În clasa a V-a ai învățat despre **internet**, **World Wide Web**, **browsere** (Chrome, Edge, Firefox) și **motoare de căutare**. Ai navigat folosind **hiperlinkuri**.

## Lecția pe scurt

### Pagină, site, URL

- **Pagina web** este un document afișat de browser, care poate conține text, imagini, video și **hiperlinkuri**.
- Un **site web** este un grup de pagini legate între ele, cu o temă comună, sub același **domeniu** (de exemplu, `edu.ro`).
- Prima pagină a unui site se numește **pagina de start** (*home*).
- Fiecare pagină are o adresă unică, **URL**-ul: `https://www.exemplu.ro/clase/a8.html`
  - `https://` – **protocolul** (s = conexiune securizată, criptată);
  - `www.exemplu.ro` – **domeniul**;
  - `/clase/a8.html` – **calea** către pagină.

### De la server la browser

Paginile stau pe un calculator conectat permanent la internet, numit **server web**. Când scrii o adresă, **browserul** cere pagina, serverul o trimite, iar browserul o **afișează**. Spațiul de pe server se numește **găzduire** (*hosting*).

### Structura unei pagini

Majoritatea paginilor au aceleași zone:

1. **Antetul** (*header*): sigla, numele site-ului;
2. **Meniul de navigare**: legături către celelalte pagini;
3. **Conținutul principal**: textele, imaginile, filmele paginii;
4. **Bara laterală** (opțional): noutăți, căutare;
5. **Subsolul** (*footer*): date de contact, drepturi de autor, legături utile.

### Limbajul HTML

Paginile web sunt scrise în **HTML** (*HyperText Markup Language*). Textul este „marcat” cu **etichete** (*tag*-uri) între paranteze unghiulare, care spun browserului ce este fiecare parte:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Clasa a VIII-a A</title>
  </head>
  <body>
    <h1>Bine ați venit!</h1>
    <p>Suntem elevii clasei a VIII-a A.</p>
    <img src="clasa.jpg" alt="Fotografia clasei">
    <a href="orar.html">Vezi orarul</a>
  </body>
</html>
```

| Etichetă | Ce face |
|---|---|
| `<h1>` … `<h6>` | titluri, de la cel mai mare la cel mai mic |
| `<p>` | paragraf |
| `<a href="…">` | hiperlink |
| `<img src="…">` | imagine |
| `<ul>`, `<li>` | listă cu buline |

Majoritatea etichetelor au pereche de **închidere**, cu `/`: `<p>` … `</p>`. Aspectul (culori, fonturi, așezare) se stabilește cu **CSS**, iar interactivitatea cu **JavaScript**. Poți vedea codul oricărei pagini cu **clic dreapta → Vizualizare sursă pagină** (**Ctrl + U**).

### Criterii de analiză a unui site

- **Conținut**: informație corectă, actualizată, cu **autor** și **surse**;
- **Navigare**: meniu clar, găsești ușor ce cauți, legături care funcționează;
- **Aspect**: culori armonioase, text lizibil, imagini potrivite, nu prea aglomerat;
- **Adaptare** pe telefon (design *responsive*);
- **Siguranță**: `https`, fără reclame înșelătoare sau ferestre care apar singure;
- **Accesibilitate**: imaginile au text alternativ, contrast bun.

## Exemplu rezolvat: analiza site-ului unei școli

1. Deschizi site-ul școlii tale. URL-ul începe cu `https`: conexiunea e securizată.
2. **Antetul**: sigla și numele școlii. **Meniul**: Acasă, Despre noi, Elevi, Părinți, Contact.
3. **Conținutul**: anunțuri, cu data publicării. **Subsolul**: adresă, telefon, e-mail.
4. Încerci site-ul pe telefon: meniul devine un buton cu trei linii (☰), deci e **responsive**.
5. Concluzie: navigare bună; minus: unele anunțuri sunt vechi.

## Aplicații interactive

```categorii
# În ce zonă a paginii se află?
Antet: sigla și numele site-ului
Meniu: legăturile Acasă și Contact
Conținut: articolul principal cu imagini
Subsol: adresa și drepturile de autor
```

```quiz
# Alege răspunsul corect.
Ce este un site web?
* un grup de pagini web legate între ele, sub același domeniu
- un singur document Word
- un browser

Ce parte a adresei https://www.muzeu.ro/expozitii este domeniul?
- https://
* www.muzeu.ro
- /expozitii

Ce etichetă HTML creează un hiperlink?
- p
- img
* a
```

```categorii
# Ce etichetă HTML folosești?
h1: titlul principal al paginii
p: un paragraf de text
img: o fotografie
a: o legătură către altă pagină
```

```adevarat-fals
A: Browserul cere pagina de la server și apoi o afișează.
F: Litera s din https înseamnă că site-ul este gratuit. | Înseamnă că legătura este securizată, criptată.
A: Codul HTML al unei pagini se poate vedea cu Ctrl + U.
A: Un site responsive se adaptează la ecranul telefonului.
```

```completare
# Completează.
Paginile web sunt scrise în limbajul [HTML]. Adresa unică a unei pagini se numește [URL]. Calculatorul care păstrează paginile și le trimite browserelor se numește [server].
```

## Exersează

1. Scrie URL-ul a trei site-uri pe care le folosești și identifică protocolul, domeniul și calea.
2. Alege un site de știri pentru copii și unul al unui muzeu; desenează în caiet structura fiecăruia (antet, meniu, conținut, subsol).
3. Analizează un site după cele șase criterii și acordă note de la 1 la 5.
4. Apasă **Ctrl + U** pe o pagină simplă și găsește etichetele `<h1>`, `<p>` și `<a>`.
5. **Portofoliu:** o fișă de analiză (Word sau Google Docs) pentru site-ul școlii tale: structură, puncte tari, puncte slabe și trei propuneri de îmbunătățire.

## Verifică-te

- Care e diferența dintre o pagină web și un site web?
- Ce zone are de obicei o pagină web?

## Pe scurt

O **pagină web** e un document afișat de **browser**; mai multe pagini legate formează un **site**. Fiecare pagină are un **URL** (protocol, domeniu, cale) și stă pe un **server**. Pagina are **antet**, **meniu**, **conținut** și **subsol**. Paginile sunt scrise în **HTML**, cu **etichete** ca `<h1>`, `<p>`, `<a>`, `<img>`. Un site bun are conținut corect, navigare clară, aspect plăcut și e sigur.

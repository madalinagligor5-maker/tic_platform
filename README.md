# Platforma TIC Gimnaziu (clasele V–VIII)

Platformă de învățare pentru *Informatică și TIC* la gimnaziu, construită pe programa școlară (OMEN 3393/2017).

- **Profesorul** creează clase, primește un cod de clasă, deblochează unitățile pe rând și urmărește progresul elevilor.
- **Elevul** intră **fără e-mail**: cod de clasă + pseudonim + PIN de 4 cifre. Vede harta lecțiilor clasei lui (Unitate → Modul → Lecție), citește lecțiile deblocate și își marchează progresul.

Nu are nicio dependență externă: folosește doar Node.js (module `http`, `crypto`, `fs`). Nu e nevoie de `npm install`.

## Pornire

Ai nevoie de [Node.js](https://nodejs.org) 18 sau mai nou.

```bash
npm start          # pornește pe http://localhost:3000
npm test           # rulează testele automate
npm run harta      # regenerează harta conținutului din docs/
```

Portul și locul bazei de date se pot schimba: `PORT=8080 DATA_FILE=/cale/db.json npm start`.

## Cum se folosește

1. Profesorul deschide platforma → **Sunt profesor** → *Creează cont*.
2. Creează o clasă (ex. „5A 2026”, nivel clasa a V-a) și primește codul clasei (ex. `WRPC67`).
3. Elevii intră cu codul, își aleg un pseudonim și un PIN. Când s-au înscris toți, profesorul apasă **Închide înscrierea**.
4. Prima unitate e deblocată automat; restul le deblochează profesorul când ajunge la ele. Fiecare unitate are și un cod propriu, pe care profesorul îl poate da doar unor elevi.
5. Dacă un elev își uită PIN-ul: **Resetează PIN** din pagina clasei.

## Structura proiectului

```
server.js                  serverul și API-ul
public/                    interfața (HTML, CSS, JS, fără framework)
content/curriculum.js      harta: clase, unități, module, lecții, competențe
content/lectii/<ID>.md     conținutul lecțiilor (ex. 5.1.1.1.md)
docs/                      harta conținutului, promptul generator, note tehnice
test/                      teste automate (node:test)
data/db.json               baza de date (creată la prima pornire, nu se urcă pe GitHub)
```

## Adăugarea conținutului

1. Folosește promptul din [`docs/Prompt_generator_continut_Platforma_TIC_Gimnaziu.md`](docs/Prompt_generator_continut_Platforma_TIC_Gimnaziu.md) cu harta atașată.
2. Salvează rezultatul ca `content/lectii/<ID>.md` (ex. `content/lectii/5.1.2.1.md`). Apare imediat pe platformă, fără repornire.
3. Rulează `npm run harta` ca lecția să fie marcată cu ✅ în hartă.

Deocamdată au conținut lecțiile modulului **5.1.1** (Sistemul de calcul), ca exemplu.

## Documente

- [Harta conținutului V–VIII](docs/Harta_Continut_TIC_Gimnaziu_V-VIII.md): lecțiile, competențele, orele, plus autentificarea, protecția datelor și variantele de găzduire.
- [Promptul generator de conținut](docs/Prompt_generator_continut_Platforma_TIC_Gimnaziu.md): 4 formate (lecție, fișă de lucru, test, plan de lecție) și 3 variante scurte.

## Securitate și date personale

- PIN-urile și parolele sunt salvate doar ca hash (scrypt cu sare). După 5 încercări greșite, contul se blochează 15 minute.
- Se stochează doar pseudonimul și progresul; profesorul poate șterge un elev cu tot progresul lui.
- Fără cookie-uri de urmărire și fără resurse de pe alte domenii.
- În producție, rulează în spatele unui proxy HTTPS (ex. Caddy). Detalii în [note tehnice](docs/note-tehnice.md).

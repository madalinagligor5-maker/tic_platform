## Note tehnice

### Cum funcționează deblocarea progresivă

- Profesorul creează o clasă (nivel V–VIII) și primește un **cod de clasă** de 6 caractere (fără 0/O, 1/I/L, ca să nu fie confundate).
- La creare, doar **prima unitate** este deblocată. Profesorul deblochează celelalte unități pentru toată clasa, pe măsură ce le parcurge.
- Fiecare unitate are și un **cod de unitate** (5 caractere). Profesorul îl poate da doar unor elevi (de exemplu pentru cei care avansează mai repede sau recuperează), iar elevul îl introduce singur pe pagina lui.

### Autentificare fără e-mail (cod de clasă + pseudonim + PIN)

- Elevul nu dă niciun e-mail, telefon sau nume real. Intră cu **codul clasei**, un **pseudonim** și un **PIN de 4 cifre**.
- La prima intrare, contul se creează automat (dacă înscrierea în clasă este deschisă). După ce toți elevii s-au înscris, profesorul **închide înscrierea**, ca nimeni din afară să nu mai poată intra cu codul clasei.
- PIN-ul este stocat doar ca hash (scrypt, cu sare). După **5 încercări greșite**, contul se blochează 15 minute.
- Dacă elevul își uită PIN-ul, profesorul îl **resetează**: platforma generează un PIN nou, afișat o singură dată, și închide sesiunile vechi ale elevului.
- Profesorii au cont cu utilizator + parolă (min. 8 caractere), tot fără e-mail obligatoriu.

### Protecția datelor elevilor minori (GDPR)

- **Minimizarea datelor:** se stochează doar pseudonimul, hash-ul PIN-ului și progresul pe lecții. Recomandă elevilor să nu-și folosească numele real ca pseudonim.
- Corespondența pseudonim ↔ elev real o ține **doar profesorul**, offline (în catalogul propriu), nu în platformă.
- Profesorul poate **șterge** un elev împreună cu tot progresul lui (dreptul la ștergere).
- Fără cookie-uri de urmărire, fără analytics, fără resurse încărcate de pe alte domenii (Content-Security-Policy strictă).
- În producție: rulează doar prin **HTTPS** și informează părinții/școala printr-o notă scurtă despre ce date se prelucrează.

### Variante de găzduire ieftine sau gratuite

| Variantă | Cost | Potrivită pentru | Observații |
|---|---|---|---|
| **A. Serverul inclus (Node.js) pe un VPS mic** (Hetzner, Contabo, DigitalOcean etc.) | ~4–6 €/lună | control total, mai multe clase | Pornești cu `npm start` în spatele unui proxy HTTPS (Caddy face certificatul automat). Datele stau în `data/db.json`; fă backup periodic al fișierului. |
| **V. Vercel + Upstash Redis** | 0 € (planuri gratuite) | cel mai simplu de publicat | Gata configurat (`vercel.json`, `api/index.js`). Importă repo-ul în Vercel, adaugă din Storage „Upstash for Redis”, apoi Redeploy. Pașii sunt în README. |
| **B. Serverul inclus pe un PaaS cu plan gratuit/ieftin** (Render, Railway, Fly.io) | 0–5 $/lună | pornire rapidă, fără administrare | Atenție: pe planurile gratuite discul poate fi șters la repornire – atașează un volum persistent sau folosește varianta C. |
| **C. Frontend static + Supabase** (Postgres + Row Level Security) | 0 € (plan gratuit) | dacă vrei bază de date gestionată | Frontend-ul pe GitHub Pages / Netlify / Cloudflare Pages; logica de login cu cod+pseudonim+PIN se mută într-o funcție Edge. Necesită rescrierea stratului de date. |
| **D. Frontend static + Firebase** (Firestore + Cloud Functions) | 0 € (plan Spark) pentru volum mic | ecosistem Google | Similar cu C; regulile de securitate Firestore trebuie scrise atent pentru date de minori. |
| **E. Pe un calculator din școală, în rețeaua locală** | 0 € | laborator fără internet stabil | `npm start` pe calculatorul profesorului; elevii intră la `http://IP-ul-calculatorului:3000`. |

Recomandare pentru început: **V** (Vercel), **A** sau **E** – niciuna nu necesită modificări de cod.

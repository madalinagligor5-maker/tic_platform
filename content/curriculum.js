'use strict';
// Harta conținutului TIC gimnaziu (V–VIII), după programa școlară OMEN 3393/2017.
// Clasă → Unitate (domeniu de conținut) → Modul → Lecție. 1 lecție = 1 oră; 34 ore/an.
// ID-urile lecțiilor (ex. "5.1.2.3") sunt stabile: nu le renumerota, doar adaugă la final.

const CURRICULUM = {
  5: {
    titlu: 'Clasa a V-a',
    unitati: [
      {
        titlu: 'Dispozitive de calcul',
        competente: [
          '1.1 Utilizarea eficientă și în siguranță a dispozitivelor de calcul',
        ],
        module: [
          {
            titlu: 'Sistemul de calcul',
            lectii: [
              'Ce este un sistem de calcul? Hardware și software',
              'Dispozitive de intrare, ieșire și stocare',
              'Reguli de siguranță și ergonomie în laborator',
            ],
          },
          {
            titlu: 'Sistemul de operare și fișierele',
            lectii: [
              'Rolul sistemului de operare. Desktop, ferestre, meniuri',
              'Fișiere și foldere: creare, redenumire, mutare, ștergere',
              'Organizarea propriului spațiu de lucru (aplicație practică)',
            ],
          },
        ],
      },
      {
        titlu: 'Internet',
        competente: [
          '1.2 Utilizarea eficientă și în siguranță a Internetului ca sursă de documentare',
          '1.3 Utilizarea responsabilă a Internetului ca mijloc de comunicare',
        ],
        module: [
          {
            titlu: 'Navigare și căutare',
            lectii: [
              'Ce este Internetul? Browser, adresă web, link',
              'Căutarea eficientă a informațiilor. Cuvinte-cheie',
              'Evaluarea surselor: informație corectă vs. falsă',
            ],
          },
          {
            titlu: 'Comunicare și siguranță online',
            lectii: [
              'E-mail și mesagerie: reguli de comunicare (netichetă)',
              'Date personale, parole sigure, confidențialitate',
              'Cyberbullying: recunoaștere și cerere de ajutor',
              'Drepturi de autor și licențe libere',
            ],
          },
        ],
      },
      {
        titlu: 'Algoritmi',
        competente: [
          '2.1 Identificarea datelor cu care lucrează algoritmii în scopul utilizării acestora în prelucrări',
          '2.2 Descrierea în limbaj natural a unor algoritmi cu structuri liniare și alternative',
          '2.3 Elaborarea unor algoritmi simpli',
        ],
        module: [
          {
            titlu: 'Noțiunea de algoritm',
            lectii: [
              'Algoritmi din viața de zi cu zi. Proprietăți',
              'Date de intrare, date de ieșire, prelucrări',
              'Reprezentarea algoritmilor: pași în limbaj natural și scheme',
            ],
          },
          {
            titlu: 'Structuri liniare și alternative',
            lectii: [
              'Structura liniară (secvențială)',
              'Structura alternativă: dacă… atunci… altfel',
              'Probleme rezolvate și exersare cu structuri alternative',
            ],
          },
        ],
      },
      {
        titlu: 'Mediu grafic-interactiv (Scratch)',
        competente: [
          '3.1 Utilizarea unui mediu grafic-interactiv pentru rezolvarea unor probleme simple',
          '3.2 Elaborarea unor aplicații simple în mediul grafic-interactiv',
        ],
        module: [
          {
            titlu: 'Primii pași în Scratch',
            lectii: [
              'Interfața Scratch: scenă, personaje, blocuri',
              'Mișcare și aspect: animarea unui personaj',
              'Evenimente: steagul verde, taste, clic',
              'Sunete și fundaluri',
            ],
          },
          {
            titlu: 'Decizii în Scratch',
            lectii: [
              'Blocul „dacă… atunci… altfel”',
              'Senzori: atingere, culoare, întrebări',
              'Mini-joc interactiv (aplicație practică)',
            ],
          },
          {
            titlu: 'Proiect și recapitulare',
            lectii: [
              'Proiect: poveste animată – planificare',
              'Proiect: realizare și prezentare',
              'Recapitulare finală',
              'Evaluare finală',
            ],
          },
        ],
      },
    ],
  },
  6: {
    titlu: 'Clasa a VI-a',
    unitati: [
      {
        titlu: 'Editoare grafice',
        competente: [
          '1.1 Utilizarea unui editor grafic pentru realizarea unor imagini',
          '1.2 Prelucrarea imaginilor digitale respectând drepturile de autor',
        ],
        module: [
          {
            titlu: 'Imaginea digitală',
            lectii: [
              'Imagini raster și vectoriale. Pixel, rezoluție',
              'Formate de fișiere grafice (PNG, JPG, SVG)',
            ],
          },
          {
            titlu: 'Lucrul cu un editor grafic',
            lectii: [
              'Interfața editorului. Instrumente de desen',
              'Selecție, copiere, transformări',
              'Straturi (layere) și text în imagine',
              'Decupare, redimensionare, export',
              'Proiect: afiș pentru un eveniment al clasei',
              'Prezentarea și evaluarea afișelor',
            ],
          },
        ],
      },
      {
        titlu: 'Algoritmi',
        competente: [
          '2.1 Descrierea în limbaj natural a unor algoritmi cu structuri repetitive',
          '2.2 Elaborarea unor algoritmi care folosesc structuri liniare, alternative și repetitive',
        ],
        module: [
          {
            titlu: 'Recapitulare: liniar și alternativ',
            lectii: ['Recapitulare structuri liniare și alternative'],
          },
          {
            titlu: 'Structuri repetitive',
            lectii: [
              'Repetiția: de ce avem nevoie de ea?',
              'Structura repetitivă cu număr cunoscut de pași',
              'Structura repetitivă cu condiție',
              'Algoritmi cu sume, numărări și contoare',
              'Algoritmi cu maxim și minim',
              'Exersare: probleme cu structuri repetitive',
            ],
          },
        ],
      },
      {
        titlu: 'Mediu grafic-interactiv (Scratch avansat)',
        competente: [
          '3.1 Implementarea unor algoritmi într-un mediu grafic-interactiv',
          '3.2 Elaborarea unor proiecte interactive în echipă',
        ],
        module: [
          {
            titlu: 'Repetiții și variabile',
            lectii: [
              'Blocurile „repetă” și „la infinit”',
              '„Repetă până când”: condiții de oprire',
              'Variabile: scor, timp, vieți',
              'Clonare și mesaje între personaje',
            ],
          },
          {
            titlu: 'Liste și blocuri proprii',
            lectii: [
              'Liste în Scratch',
              'Blocuri proprii (subprograme)',
              'Depanarea programelor: găsirea și corectarea erorilor',
            ],
          },
          {
            titlu: 'Proiect de echipă',
            lectii: [
              'Proiect: joc educativ – idee și plan',
              'Proiect: realizare (1)',
              'Proiect: realizare (2)',
              'Proiect: testare și îmbunătățire',
              'Prezentarea proiectelor',
            ],
          },
        ],
      },
      {
        titlu: 'Siguranță digitală și recapitulare',
        competente: [
          '1.3 Utilizarea responsabilă a tehnologiei',
        ],
        module: [
          {
            titlu: 'Cetățenie digitală',
            lectii: [
              'Amprenta digitală și reputația online',
              'Recapitulare finală',
              'Evaluare finală',
            ],
          },
        ],
      },
    ],
  },
  7: {
    titlu: 'Clasa a VII-a',
    unitati: [
      {
        titlu: 'Editoare de text',
        competente: [
          '1.1 Utilizarea unui editor de text pentru realizarea unor documente',
          '1.2 Structurarea și formatarea informației în documente',
        ],
        module: [
          {
            titlu: 'Documente text',
            lectii: [
              'Interfața editorului de text. Creare și salvare',
              'Formatarea caracterelor și a paragrafelor',
              'Liste, tabele și imagini în document',
              'Stiluri, titluri și cuprins automat',
              'Antet, subsol, numerotarea paginilor, imprimare',
              'Proiect: referat structurat',
            ],
          },
        ],
      },
      {
        titlu: 'Algoritmi',
        competente: [
          '2.1 Elaborarea unor algoritmi pentru prelucrarea numerelor',
          '2.2 Analiza corectitudinii unor algoritmi',
        ],
        module: [
          {
            titlu: 'Algoritmi cu numere',
            lectii: [
              'Recapitulare structuri de control',
              'Cifrele unui număr: extragere, sumă, număr de cifre',
              'Divizibilitate: divizori, numere prime',
              'Cel mai mare divizor comun (algoritmul lui Euclid)',
              'Verificarea corectitudinii: date de test',
            ],
          },
        ],
      },
      {
        titlu: 'Programare (Python)',
        competente: [
          '3.1 Implementarea algoritmilor într-un limbaj de programare',
          '3.2 Depanarea și testarea programelor',
        ],
        module: [
          {
            titlu: 'Primii pași în Python',
            lectii: [
              'Mediul de lucru. Primul program: print',
              'Variabile, tipuri de date, citire cu input',
              'Operatori aritmetici și expresii',
            ],
          },
          {
            titlu: 'Decizii și repetiții',
            lectii: [
              'Instrucțiunea if / elif / else',
              'Operatori logici și condiții compuse',
              'Instrucțiunea for și range',
              'Instrucțiunea while',
              'Probleme cu cifre în Python',
              'Probleme cu divizori în Python',
              'Erori frecvente și depanare',
            ],
          },
          {
            titlu: 'Proiect și recapitulare',
            lectii: [
              'Proiect: mini-aplicație (calculator, quiz)',
              'Proiect: finalizare și prezentare',
              'Recapitulare finală',
              'Evaluare finală',
            ],
          },
        ],
      },
    ],
  },
  8: {
    titlu: 'Clasa a VIII-a',
    unitati: [
      {
        titlu: 'Prezentări multimedia',
        competente: [
          '1.1 Realizarea unor prezentări multimedia',
          '1.2 Comunicarea eficientă a informației prin mijloace digitale',
        ],
        module: [
          {
            titlu: 'Prezentări',
            lectii: [
              'Principiile unei prezentări eficiente',
              'Diapozitive, șabloane, text și imagini',
              'Tranziții, animații, elemente multimedia',
              'Proiect: prezentare pe o temă la alegere',
            ],
          },
        ],
      },
      {
        titlu: 'Calcul tabelar',
        competente: [
          '1.3 Prelucrarea datelor numerice folosind aplicații de calcul tabelar',
        ],
        module: [
          {
            titlu: 'Foi de calcul',
            lectii: [
              'Registru, foaie, celulă, adresă',
              'Introducerea și formatarea datelor',
              'Formule și referințe',
              'Funcții: SUM, AVERAGE, MIN, MAX, IF',
              'Sortare și filtrare',
              'Diagrame',
              'Proiect: analiza unor date reale (catalogul clasei, buget)',
            ],
          },
        ],
      },
      {
        titlu: 'Algoritmi și programare (Python)',
        competente: [
          '2.1 Elaborarea unor algoritmi care prelucrează șiruri de valori',
          '3.1 Implementarea în Python a algoritmilor cu liste',
        ],
        module: [
          {
            titlu: 'Șiruri de valori',
            lectii: [
              'Recapitulare Python',
              'Liste: creare, accesare, parcurgere',
              'Sumă, medie, numărare în liste',
              'Maxim, minim și poziția lor',
              'Căutare într-o listă',
              'Sortare: ideea algoritmului',
              'Șiruri de caractere (string)',
              'Funcții definite de utilizator',
            ],
          },
          {
            titlu: 'Proiect final',
            lectii: [
              'Proiect: planificare',
              'Proiect: realizare (1)',
              'Proiect: realizare (2)',
              'Proiect: testare și documentare',
              'Prezentarea proiectelor',
            ],
          },
        ],
      },
      {
        titlu: 'Recapitulare și orientare',
        competente: ['Toate competențele din ciclul gimnazial'],
        module: [
          {
            titlu: 'Încheierea ciclului gimnazial',
            lectii: [
              'Meserii din domeniul IT',
              'Recapitulare finală',
              'Evaluare finală',
            ],
          },
        ],
      },
    ],
  },
};

// Construiește ID-uri stabile: unitate "5.2", modul "5.2.1", lecție "5.2.1.3".
function build() {
  const out = {};
  for (const [grade, g] of Object.entries(CURRICULUM)) {
    out[grade] = {
      grade: Number(grade),
      titlu: g.titlu,
      unitati: g.unitati.map((u, ui) => ({
        id: `${grade}.${ui + 1}`,
        titlu: u.titlu,
        competente: u.competente,
        module: u.module.map((m, mi) => ({
          id: `${grade}.${ui + 1}.${mi + 1}`,
          titlu: m.titlu,
          lectii: m.lectii.map((titlu, li) => ({
            id: `${grade}.${ui + 1}.${mi + 1}.${li + 1}`,
            titlu,
          })),
        })),
      })),
    };
  }
  return out;
}

const MAP = build();
const LESSONS = new Map();
const UNITS = new Map();
for (const g of Object.values(MAP)) {
  for (const u of g.unitati) {
    UNITS.set(u.id, u);
    for (const m of u.module) {
      for (const l of m.lectii) {
        LESSONS.set(l.id, { ...l, grade: g.grade, unitId: u.id, unitTitlu: u.titlu, modulId: m.id, modulTitlu: m.titlu });
      }
    }
  }
}

module.exports = { MAP, LESSONS, UNITS };

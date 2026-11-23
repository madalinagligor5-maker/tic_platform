'use strict';
// Informatică, clasa a IX-a (liceu): profilele, competențele generale (taxonomia Bloom) și principiile pedagogice din programele
// școlare 2025, folosite de pagina elevului, de îndrumarul profesorului și de teste.
(() => {
  const L = (globalThis.LICEU = globalThis.LICEU || { UNITATI: [] });

  // Alocarea orară și conținuturile specifice, din programele pentru clasa a IX-a (curriculum de specialitate).
  L.PROFILE = [
    { id: 'sn', nume: 'Științe ale naturii', lung: 'Filiera teoretică, profilul real, specializarea științe ale naturii', ore: 1, orePrac: 'studiu teoretic și activități practice (în laborator)', limbaje: ['Python'], emoji: '🧬', culoare: '#1E9E5A',
      specific: ['Sortare: selecția minimului și lista de frecvențe.', 'Fără metoda bulelor și fără exponențiere rapidă.'], ani: 'clasele a IX-a și a X-a' },
    { id: 'mi', nume: 'Matematică-informatică', lung: 'Filiera teoretică, profilul real, specializarea matematică-informatică', ore: 2, orePrac: 'o oră de studiu teoretic și o oră de activități practice', limbaje: ['Python'], emoji: '📐', culoare: '#2F6FC4',
      specific: ['Sortare: selecția minimului, lista de frecvențe și metoda bulelor.', 'Exponențierea rapidă este tratată ca temă bonus.'], ani: 'clasele a IX-a – a XII-a' },
    { id: 'mil', nume: 'Matematică-informatică militară', lung: 'Filiera vocațională, profilul militar, specializarea matematică-informatică militară', ore: 3, orePrac: 'două ore de studiu teoretic și o oră de activități practice', limbaje: ['Python'], emoji: '🎖️', culoare: '#7A3FB8',
      specific: ['Sortare: selecția minimului, lista de frecvențe și metoda bulelor.', 'Algoritmul de exponențiere rapidă (obligatoriu).'], ani: 'clasele a IX-a – a XII-a' },
    { id: 'int', nume: 'Matematică-informatică, regim intensiv', lung: 'Filiera teoretică, profilul real, specializarea matematică-informatică, clase cu informatică în regim intensiv', ore: 4, orePrac: 'două ore de studiu teoretic și două ore de activități practice', limbaje: ['Python', 'C++'], emoji: '🚀', culoare: '#E2711D',
      specific: ['Două limbaje în paralel: Python (de bază) și C++ (subprograme, fișiere text, tablouri unidimensionale).', 'Metoda bulelor și exponențierea rapidă.'], ani: 'clasele a IX-a – a XII-a' },
  ];

  // Competențele generale (CG) ale programei, construite pe taxonomia Bloom revizuită; fiecare CG cere alt tip de activitate.
  L.BLOOM = [
    { cg: 1, verb: 'Identifică', nivel: 'Cunoaștere / recunoaștere', activitati: 'activități demonstrative, exerciții de identificare, completare de tabele', cum: 'Teoria ilustrată și tabelele din fiecare unitate; întrebările de recunoaștere din „Verifică-te”.' },
    { cg: 2, verb: 'Explică', nivel: 'Înțelegere', activitati: 'explicații, exemple, urmărirea valorilor variabilelor', cum: 'Exemplul care se rulează și se modifică; tabelele de urmărire; întrebări „de ce?”.' },
    { cg: 3, verb: 'Utilizează', nivel: 'Aplicare', activitati: 'activități practice, aplicații asistate digital', cum: 'Exercițiile de remediere și standard, cu verificare automată imediată.' },
    { cg: 4, verb: 'Analizează', nivel: 'Analiză', activitati: 'studii de caz, comparări, depanare', cum: 'Exercițiile standard cu cazuri speciale și întrebările de analiză din quiz.' },
    { cg: 5, verb: 'Evaluează', nivel: 'Evaluare', activitati: 'argumentarea alegerii, evaluarea corectitudinii și a eficienței', cum: 'Exercițiile de aprofundare (cu cerință de eficiență) și întrebările de evaluare.' },
    { cg: 6, verb: 'Elaborează', nivel: 'Creare', activitati: 'învățare prin acțiune, produse digitale, proiecte în echipă', cum: 'Proiectul de la finalul fiecărei unități și planul „analiză – proiectare – teste”.' },
  ];

  // Principiile generale ale predării-învățării-evaluării (din „Sugestii metodologice”) și felul în care sunt puse în practică.
  L.PRINCIPII = [
    { id: 'centrare', titlu: 'Centrare pe elev', text: 'Strategiile favorizează implicarea activă: învățare prin descoperire, colaborare și reflecție personală; profesorul este îndrumător, nu furnizor de informații.',
      platforma: ['Elevul rulează, modifică și testează cod chiar de la începutul lecției.', 'Indicii în trepte (nu soluția directă) și soluția doar după mai multe încercări.', 'Rubrica „Reflecția mea” la finalul fiecărei unități.'],
      profesor: ['Pune întrebări „de ce?” înainte de a explica.', 'Lasă elevii să descopere eroarea din mesajul de eroare explicat în română.'] },
    { id: 'diversitate', titlu: 'Diversitate metodologică', text: 'Se folosesc metode variate: demonstrație, problematizare, algoritmizare, proba practică, proiect, portofoliu.',
      platforma: ['În fiecare unitate: teorie, exemplu executabil, exerciții cu verificare, quiz, proiect.', 'Jocuri de programare (robot, ordonare de linii, găsește greșeala) pentru consolidare.'],
      profesor: ['Alternează explicația cu lucrul în perechi și cu evaluarea între colegi.', 'Folosește scenariul de oră din îndrumar ca pe un schelet, nu ca pe o rețetă.'] },
    { id: 'flexibilitate', titlu: 'Flexibilitate', text: 'Profesorul adaptează activitățile la nivelul clasei și la resursele disponibile; programa lasă 25% din timp ca rezervă pentru remediere, consolidare, aprofundare sau extindere.',
      platforma: ['Unitățile se pot parcurge în ordinea din programă sau în altă ordine.', 'Conținutul se adaptează automat profilului ales (științe ale naturii / matematică-informatică / militar / intensiv).', 'Fiecare unitate poate fi lucrată în 2–4 ore; planificarea model păstrează 25% rezervă.'],
      profesor: ['Folosește rezerva de timp pentru remediere după evaluarea formativă.', 'Alege exercițiile în funcție de clasă; nu toate sunt obligatorii.'] },
    { id: 'profil', titlu: 'Corelare cu profilul de formare al absolventului', text: 'Metodele contribuie la competențele-cheie (digitală, matematică, a învăța să înveți) și la atributele prioritare: reflexiv, creativ, responsabil, comunicativ.',
      platforma: ['Fiecare unitate indică obiectivele și competențele specifice vizate.', 'Planul de lucru și reflecția dezvoltă „a învăța să înveți”.'],
      profesor: ['Discută la finalul unității ce atribut al profilului a fost exersat.'] },
    { id: 'interdisciplinar', titlu: 'Integrare interdisciplinară', text: 'Învățarea devine mai relevantă când disciplinele se sprijină reciproc (STEM, economie, științe sociale, arte digitale).',
      platforma: ['Fiecare unitate are legături cu alte discipline (matematică, fizică, biologie, geografie, economie).', 'Exemple și proiecte cu date reale: note, temperaturi, voturi, conturi bancare.'],
      profesor: ['Propune un proiect comun cu colegul de la altă disciplină (de exemplu Fibonacci în natură cu biologia).'] },
    { id: 'evaluare', titlu: 'Îmbinarea evaluării formative cu cea sumativă', text: 'Evaluarea urmărește nu doar rezultatul corect, ci și cum își formează elevii gândirea algoritmică, cum își testează algoritmii și își corectează erorile. Se recomandă evaluări sumative după fiecare unitate.',
      platforma: ['Feedback imediat: fiecare exercițiu se verifică pe teste vizibile și ascunse și arată ce lipsește.', 'Tabloul de progres al elevului (trepte rezolvate, quiz, reflecție).', 'Autoevaluare pe obiective, înainte și după unitate.'],
      profesor: ['Folosește rubricile din îndrumar pentru evaluarea sumativă.', 'Pune întrebările: De ce evaluez? Ce evaluez? Cum evaluez? Cât de bine măsor? Ce feedback dau? Ce decizii iau?'] },
    { id: 'diferentiere', titlu: 'Diferențiere și personalizare', text: 'Parcursul se adaptează situațiilor specifice: elevi cu CES, cu ritm înalt, cu nevoie de învățare remedială, în risc de abandon.',
      platforma: ['Trei trepte la fiecare unitate: remediere, standard, aprofundare.', 'Indicii în trepte și soluție de referință.', 'Elevul alege ritmul; nu există limită de timp la exerciții.'],
      profesor: ['Pentru CES: oferă mai mult timp, fișe tipărite, un singur criteriu pe rând (vezi „Diferențiere” în fiecare fișă).'] },
  ];

  // Activitățile de învățare, după nivelul cognitiv (din „Sugestii metodologice”)
  L.NIVELURI_ACTIVITATI = [
    ['recunoaștere și înțelegere', 'activități demonstrative și exerciții de identificare'],
    ['aplicare', 'activități practice și aplicații asistate digital'],
    ['analiză și evaluare', 'studii de caz și proiecte interdisciplinare'],
    ['creare', 'învățare prin acțiune, produse digitale, proiecte în echipă'],
  ];
})();

'use strict';
// Informatică, clasa a IX-a (liceu), regim intensiv: Python și C++ în paralel (subprograme, tablouri unidimensionale, fișiere).
// Exemplele și soluțiile C++ se rulează în Editorul C++ al platformei (subsetul necesar pentru aceste teme).
(() => {
  const L = (globalThis.LICEU = globalThis.LICEU || { UNITATI: [] });
  const t = (...b) => b;

  L.UNITATI.push({
    id: 'cpp-paralel', nr: 12, titlu: 'Python și C++ în paralel', domeniu: 'Memorarea datelor și organizarea codului', cs: ['1.4', '1.5', '2.4', '2.5', '3.4', '3.5'], emoji: '⚙️', limbaj: 'cpp', profile: ['int'],
    obiective: ['Pui în corespondență elementele de bază din Python și din C++: citire și afișare, variabile și tipuri, operatori, instrucțiuni.', 'Scrii subprograme în C++ (funcții cu parametri prin valoare și prin referință) și le compari cu cele din Python.', 'Memorezi liste în C++ folosind tablouri unidimensionale și aplici aceiași algoritmi ca în Python.'],
    teorie: t(
      { p: 'La clasele cu **regim intensiv** se studiază două limbaje: **Python** (limbaj de nivel înalt, interpretat) și **C++** (compilat, cu tipuri declarate). După ce ai înțeles ideile în Python, C++ te ajută să vezi ce se întâmplă „sub capotă”: memoria, tipurile, eficiența.' },
      { tabel: { cap: ['Idee', 'Python', 'C++'], rows: [['Citire / afișare', '`n = int(input())`\n`print(n)`', '`cin >> n;`\n`cout << n << endl;`'], ['Variabile', '`x = 5` (tipul se deduce)', '`int x = 5;` (tipul se declară)'], ['Decizie', '`if x > 0:` + indentare', '`if (x > 0) { … }`'], ['Ciclu cu contor', '`for i in range(n):`', '`for (int i = 0; i < n; i++)`'], ['Împărțire întreagă / rest', '`a // b`, `a % b`', '`a / b` (pe întregi), `a % b`'], ['Subprogram', '`def f(x): return x * 2`', '`int f(int x) { return x * 2; }`'], ['Listă', '`v = [3, 1, 2]`', '`int v[3] = {3, 1, 2};` (tablou)']] } },
      { p: '**Subprograme în C++.** Antetul precizează **tipul rezultatului** și **tipul fiecărui parametru**. Parametrii se transmit implicit **prin valoare** (funcția lucrează pe o copie); pentru a modifica variabila apelantului se folosește **referința** (`&`).' },
      { cod: '#include <iostream>\nusing namespace std;\n\nint suma_cifrelor(int n) {          // tip returnat + parametru cu tip\n    int s = 0;\n    while (n > 0) { s += n % 10; n /= 10; }\n    return s;\n}\nvoid interschimba(int &a, int &b) { // parametri prin REFERINȚĂ\n    int aux = a; a = b; b = aux;\n}\nint main() {\n    int x = 3, y = 8;\n    interschimba(x, y);\n    cout << suma_cifrelor(2025) << " " << x << " " << y << endl;\n    return 0;\n}' },
      { p: '**Tablouri unidimensionale.** În C++, o listă se memorează într-un **tablou**: o succesiune de elemente de **același tip**, cu **dimensiune fixă** declarată la scriere. Elementele se accesează prin **indice** (de la `0`), la fel ca în Python, dar nu poți adăuga elemente: aloci de la început destul loc.' },
      { cod: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, v[100];                 // până la 100 de elemente\n    cin >> n;\n    for (int i = 0; i < n; i++) cin >> v[i];\n    for (int i = 0; i < n - 1; i++) {          // sortare prin selecția minimului\n        int m = i;\n        for (int j = i + 1; j < n; j++)\n            if (v[j] < v[m]) m = j;\n        int aux = v[i]; v[i] = v[m]; v[m] = aux;\n    }\n    for (int i = 0; i < n; i++) cout << v[i] << " ";\n    return 0;\n}' },
      { tabel: { cap: ['Python (clasa list)', 'C++ (tablou)'], rows: [['`len(v)`', 'dimensiunea trebuie ținută într-o variabilă (`n`)'], ['`v.append(x)`', 'nu există: `v[n] = x; n++;`'], ['`v[-1]`', 'nu există indici negativi: `v[n - 1]`'], ['`v.sort()`', 'se scrie algoritmul sau se folosește biblioteca `<algorithm>` (`sort(v, v + n)`)'], ['verificare automată a indicilor (IndexError)', 'fără verificare: un indice greșit citește/scrie în afara tabloului']] } },
      { atentie: 'Un indice în afara tabloului nu produce eroare clară în C++, ci **comportament nedefinit** (rezultate ciudate sau blocarea programului). De aceea ai grijă la limitele ciclurilor.' },
      { cod: '// Fișiere text în C++ (bibliotecile <fstream>): codul este ca în Thonny/Code::Blocks\n// #include <fstream>\n// ifstream f("numere.txt");   ofstream g("rezultat.txt");\n// int x; while (f >> x) g << x * 2 << "\\n";   // citește până la sfârșitul fișierului\n// f.close(); g.close();' },
      { nota: '**În platformă:** exemplele cu subprograme și tablouri se rulează în **Editorul C++** (link în pagina unității). Biblioteca `<fstream>` nu este disponibilă în editorul din browser; codul cu fișiere îl încerci în Code::Blocks sau în alt mediu de pe calculatorul tău.' },
    ),
    exempleCpp: [
      { titlu: 'Subprograme: suma cifrelor și interschimbare', intrare: '', cod: '#include <iostream>\nusing namespace std;\n\nint suma_cifrelor(int n) {\n    int s = 0;\n    while (n > 0) { s += n % 10; n /= 10; }\n    return s;\n}\nvoid interschimba(int &a, int &b) {\n    int aux = a; a = b; b = aux;\n}\nint main() {\n    int x = 3, y = 8;\n    interschimba(x, y);\n    cout << suma_cifrelor(2025) << " " << x << " " << y << endl;\n    return 0;\n}\n', iesire: '9 8 3' },
      { titlu: 'Tablou: sortare prin selecția minimului', intrare: '5\n5 2 4 1 3\n', cod: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, v[100];\n    cin >> n;\n    for (int i = 0; i < n; i++) cin >> v[i];\n    for (int i = 0; i < n - 1; i++) {\n        int m = i;\n        for (int j = i + 1; j < n; j++)\n            if (v[j] < v[m]) m = j;\n        int aux = v[i]; v[i] = v[m]; v[m] = aux;\n    }\n    for (int i = 0; i < n; i++) cout << v[i] << " ";\n    return 0;\n}\n', iesire: '1 2 3 4 5' },
    ],
    exercitiiCpp: [
      { nivel: 'Utilizează (CS 3.5)', cer: 'Scrie în C++ un program care citește `n` și `n` numere întregi, memorate într-un **tablou**, și afișează **suma** lor și **maximul**, pe rânduri separate.',
        start: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, v[100];\n    cin >> n;\n    // citește tabloul, calculează suma și maximul\n    return 0;\n}\n',
        teste: [{ i: '3\n4 9 2\n', o: '15\n9\n' }, { i: '1\n7\n', o: '7\n7\n' }, { i: '4\n-5 -2 -9 -2\n', o: '-18\n-2\n' }],
        solutie: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, v[100];\n    cin >> n;\n    int s = 0, m;\n    for (int i = 0; i < n; i++) { cin >> v[i]; s += v[i]; }\n    m = v[0];\n    for (int i = 1; i < n; i++) if (v[i] > m) m = v[i];\n    cout << s << endl << m << endl;\n    return 0;\n}\n' },
      { nivel: 'Elaborează (CS 6.5)', cer: 'Scrie o funcție `int cmmdc(int a, int b)` (algoritmul lui Euclid cu împărțiri) și un program care citește două numere și afișează cmmdc-ul și cel mai mic multiplu comun (cmmmc), pe rânduri separate.',
        start: '#include <iostream>\nusing namespace std;\n\nint cmmdc(int a, int b) {\n    // completează\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    return 0;\n}\n',
        teste: [{ i: '12 18\n', o: '6\n36\n' }, { i: '7 13\n', o: '1\n91\n' }, { i: '100 75\n', o: '25\n300\n' }],
        solutie: '#include <iostream>\nusing namespace std;\n\nint cmmdc(int a, int b) {\n    while (b != 0) {\n        int r = a % b;\n        a = b;\n        b = r;\n    }\n    return a;\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    int d = cmmdc(a, b);\n    cout << d << endl << a / d * b << endl;\n    return 0;\n}\n' },
    ],
    proiect: 'Alege trei probleme rezolvate în Python în unitățile anterioare (de exemplu suma cifrelor, sortarea prin selecție, cmmdc) și rescrie-le în C++. Într-un tabel, compară: numărul de linii, tipurile declarate, ce erori apar la compilare față de execuție și timpul de rulare pe date mari.',
    quiz: t(
      { nivel: 'Înțelegere', q: 'Care este deosebirea principală dintre o listă Python și un tablou C++?', opt: ['Tabloul are dimensiune fixă și elemente de același tip', 'Lista nu poate fi parcursă', 'Tabloul se poate extinde cu append', 'Nu există nicio deosebire'], ok: 0, expl: 'Un tablou are dimensiune stabilită la declarare și elemente de același tip; lista Python este dinamică.' },
      { nivel: 'Aplicare', q: 'Cum se transmite o variabilă `int` ca să poată fi modificată de funcție în C++?', opt: ['Prin referință: `void f(int &a)`', 'Prin valoare: `void f(int a)`', 'Cu `global`', 'Nu se poate'], ok: 0, expl: 'Cu `&` funcția lucrează chiar pe variabila apelantului, nu pe o copie.' },
      { nivel: 'Analiză', q: 'Ce se întâmplă dacă accesezi `v[10]` într-un tablou `int v[5]` în C++?', opt: ['Comportament nedefinit', 'Se afișează eroarea IndexError', 'Se adaugă automat spațiu', 'Programul nu se compilează'], ok: 0, expl: 'C++ nu verifică indicii: citește sau scrie în afara tabloului, cu rezultate imprevizibile.' },
    ),
    prof: {
      durata: '4 ore (doar la clasele cu regim intensiv)',
      scenariu: [['10 min', 'Captare', 'Se rulează același algoritm în Python și în C++ pe 10⁷ date: diferența de timp.'], ['20 min', 'Tabel de corespondențe', 'Elevii completează singuri coloana C++ pe baza exemplelor.'], ['30 min', 'Subprograme și tablouri', 'Pair programming: unul scrie în Python, altul traduce în C++.'], ['10 min', 'Erori', 'Erorile de compilare (lipsă `;`, tip greșit) vs. erorile de execuție.']],
      greseli: ['Uită `;` sau parantezele `{}`.', 'Împart întregi crezând că obțin zecimale (`7 / 2` este `3`).', 'Depășesc dimensiunea tabloului.', 'Folosesc o variabilă neinițializată.', 'Uită `&` când vor să modifice parametrul.'],
      diferentiere: { remediere: 'Se pornește de la programe Python cunoscute, traduse împreună rând cu rând; fișă cu corespondențe.', aprofundare: 'Pointeri (informativ), `<algorithm>`, `vector` (anticipare), complexitatea în practică.', ces: 'Șabloane de program (cu `main` gata scris); un concept nou pe oră.' },
      evaluare: ['Antet corect al funcțiilor (tipuri).', 'Tratarea corectă a tablourilor (limite).', 'Compararea justificată Python vs. C++.'],
      metode: ['Învățare comparativă', 'Pair programming', 'Experiment de măsurare a timpului'],
      legaturi: ['Fizică: simulări numerice rapide', 'Matematică: algoritmi pentru probleme de calcul intensiv'],
    },
  });
})();

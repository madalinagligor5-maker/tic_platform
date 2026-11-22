'use strict';
// Date pentru jocurile din cursul Python (#/python/jocuri): robot programat în Python, ordonarea liniilor de cod,
// găsește greșeala, „Ce afișează?” (Blitz) și completarea codului. Toate soluțiile și răspunsurile sunt verificate
// pe interpretorul din Editorul Python în test/python-jocuri.test.js.
(() => {
  // ───────────────────────────── ROBOT ─────────────────────────────
  // Hărți: R = start (privește spre est), T = țintă, * = stea, # = zid, . = liber. Marginea hărții se comportă ca un zid.
  const NIVELE_ROBOT = [
    { id: 1, titlu: 'Drum drept', concept: 'comenzi și for', harta: ['.......', 'R.....T', '.......'],
      cer: 'Du robotul până la țintă 🎯. Comanda `pas()` mută robotul cu o căsuță înainte.',
      indicii: ['Ai nevoie de 6 pași. Poți scrie `pas()` de 6 ori, dar mai scurt este `for i in range(6):`.'],
      solutie: 'for i in range(6):\n    pas()\n' },
    { id: 2, titlu: 'Prima întoarcere', concept: 'dreapta() și stanga()', harta: ['R.....', '......', '......', '.....T'],
      cer: 'Robotul poate să se **întoarcă**: `dreapta()` și `stanga()`. Ajunge la țintă.',
      indicii: ['Mergi spre est până la capăt, întoarce-te la dreapta (spre sud) și mergi la țintă.'],
      solutie: 'for i in range(5):\n    pas()\ndreapta()\nfor i in range(3):\n    pas()\n' },
    { id: 3, titlu: 'Ocolește zidul', concept: 'mai multe cicluri', harta: ['R...', '###.', 'T...'],
      cer: 'Zidul `#` nu poate fi trecut: dacă robotul îl lovește, programul se oprește. Găsește ocolișul.',
      indicii: ['Est de 3 ori, dreapta, jos de 2 ori, dreapta, apoi vest de 3 ori.'],
      solutie: 'for i in range(3):\n    pas()\ndreapta()\nfor i in range(2):\n    pas()\ndreapta()\nfor i in range(3):\n    pas()\n' },
    { id: 4, titlu: 'Culege stelele', concept: 'ia_stea()', harta: ['R*.*.*.T'],
      cer: 'Pe drum sunt 3 stele ⭐. Cu `ia_stea()` robotul ia steaua din căsuța în care se află. Trebuie să le iei **pe toate** înainte de țintă.',
      indicii: ['După fiecare `pas()` apelează `ia_stea()`. Dacă nu e nicio stea acolo, nu se întâmplă nimic.'],
      solutie: 'for i in range(7):\n    pas()\n    ia_stea()\n' },
    { id: 5, titlu: 'Până la capăt', concept: 'while și perete()', harta: ['#########', 'R.......T', '#########'],
      cer: 'Nu mai număra pașii! `perete()` răspunde `True` dacă robotul are un zid (sau marginea) în față, iar `la_tinta()` dacă a ajuns. Folosește **while**.',
      indicii: ['`while not la_tinta():` repetă cât timp robotul nu a ajuns la țintă.', 'În interior este de ajuns un `pas()`.'],
      solutie: 'while not la_tinta():\n    pas()\n' },
    { id: 6, titlu: 'Scara', concept: 'repetă un tipar', harta: ['R.####', '#..###', '##..##', '###..T'],
      cer: 'Drumul urcă pe trepte. Observă tiparul care se repetă și scrie-l **o singură dată**, într-un ciclu.',
      indicii: ['Tiparul: `pas()`, `dreapta()`, `pas()`, `stanga()`. Se repetă de 3 ori, apoi mai sunt 2 pași.'],
      solutie: 'for i in range(3):\n    pas()\n    dreapta()\n    pas()\n    stanga()\npas()\npas()\n' },
    { id: 7, titlu: 'Spirala', concept: 'if în while', harta: ['R....#', '####.#', 'T....#'],
      cer: 'Un drum cu cotituri, dar toate sunt **spre dreapta**. Scrie un program care merge înainte, iar când dă de un zid se întoarce la dreapta, până ajunge la țintă.',
      indicii: ['În `while not la_tinta():` pui un `if perete():` cu `dreapta()` și un `else:` cu `pas()`.'],
      solutie: 'while not la_tinta():\n    if perete():\n        dreapta()\n    else:\n        pas()\n' },
    { id: 8, titlu: 'Colțurile cu stele', concept: 'funcții', harta: ['R.*.*', '.###.', '.###.', 'T.*.*'],
      cer: 'Robotul trebuie să **ocolească** dreptunghiul și să culeagă toate cele 4 stele, apoi să ajungă la țintă. Scrie-ți o **funcție** `mergi(n)` care face `n` pași și ia stelele de pe drum.',
      indicii: ['`def mergi(n):` cu un `for` care face `pas()` și `ia_stea()`.', 'Apoi: `mergi(4)`, `dreapta()`, `mergi(3)`, `dreapta()`, `mergi(4)`.'],
      solutie: 'def mergi(n):\n    for i in range(n):\n        pas()\n        ia_stea()\n\nmergi(4)\ndreapta()\nmergi(3)\ndreapta()\nmergi(4)\n' },
  ];

  // Codul Python adăugat în fața programului elevului: robotul este implementat chiar în Python, iar mișcările sunt
  // tipărite ca rânduri „@…” (pe care pagina le redă ca animație). Epilogul tipărește starea finală.
  function preludiuRobot(harta) {
    let x0 = 0, y0 = 0; const st = [];
    harta.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'R') { x0 = x; y0 = y; } if (c === '*') st.push(`${x},${y}`); }));
    return `_H = ${JSON.stringify(harta.map((r) => r.replace('R', '.')))}
_S = {"x": ${x0}, "y": ${y0}, "d": 1, "n": 0, "stele": ${JSON.stringify(st)}}
def _cheie():
    return str(_S["x"]) + "," + str(_S["y"])
def _liber(x, y):
    if y < 0 or y >= len(_H) or x < 0 or x >= len(_H[0]):
        return False
    return _H[y][x] != "#"
def _numara():
    _S["n"] = _S["n"] + 1
    if _S["n"] > 400:
        print("@L")
        exit()
def _in_fata():
    dx = [0, 1, 0, -1]
    dy = [-1, 0, 1, 0]
    return [_S["x"] + dx[_S["d"]], _S["y"] + dy[_S["d"]]]
def pas():
    _numara()
    p = _in_fata()
    if _liber(p[0], p[1]):
        _S["x"] = p[0]
        _S["y"] = p[1]
        print("@M", p[0], p[1])
    else:
        print("@B", _S["x"], _S["y"])
        exit()
def stanga():
    _numara()
    _S["d"] = (_S["d"] + 3) % 4
    print("@D", _S["d"])
def dreapta():
    _numara()
    _S["d"] = (_S["d"] + 1) % 4
    print("@D", _S["d"])
def perete():
    p = _in_fata()
    return not _liber(p[0], p[1])
def la_tinta():
    return _H[_S["y"]][_S["x"]] == "T"
def stea_aici():
    return _cheie() in _S["stele"]
def ia_stea():
    _numara()
    if _cheie() in _S["stele"]:
        noi = []
        for s in _S["stele"]:
            if s != _cheie():
                noi.append(s)
        _S["stele"] = noi
        print("@S", _S["x"], _S["y"])
`;
  }
  const EPILOG_ROBOT = '\nprint("@END", _S["x"], _S["y"], len(_S["stele"]))\n';
  // Numărul de rânduri din preludiu (ca erorile elevului să fie raportate cu numărul rândului din programul lui)
  const RANDURI_PRELUDIU = (h) => preludiuRobot(h).split('\n').length - 1;

  // ───────────────────────────── ORDONEAZĂ LINIILE (Parsons) ─────────────────────────────
  // linii = ordinea corectă (cu indentarea); extra = linii în plus, care NU trebuie folosite.
  const ORDONARE = [
    { id: 'suma', niv: 1, titlu: 'Suma de la 1 la n', cer: 'Citește `n` și afișează suma `1 + 2 + … + n`.',
      linii: ['n = int(input())', 'suma = 0', 'for i in range(1, n + 1):', '    suma = suma + i', 'print(suma)'], extra: [],
      teste: [{ i: '5\n', o: '15\n' }, { i: '10\n', o: '55\n' }, { i: '1\n', o: '1\n' }] },
    { id: 'paritate', niv: 1, titlu: 'Par sau impar', cer: 'Citește un număr și afișează `par` sau `impar`.',
      linii: ['n = int(input())', 'if n % 2 == 0:', '    print("par")', 'else:', '    print("impar")'], extra: [],
      teste: [{ i: '4\n', o: 'par\n' }, { i: '7\n', o: 'impar\n' }, { i: '0\n', o: 'par\n' }] },
    { id: 'maxim', niv: 1, titlu: 'Maximul din trei', cer: 'Citește trei numere (câte unul pe rând) și afișează cel mai mare.',
      linii: ['a = int(input())', 'b = int(input())', 'c = int(input())', 'm = a', 'if b > m:', '    m = b', 'if c > m:', '    m = c', 'print(m)'], extra: [],
      teste: [{ i: '3\n9\n5\n', o: '9\n' }, { i: '10\n2\n7\n', o: '10\n' }, { i: '1\n2\n3\n', o: '3\n' }, { i: '-5\n-2\n-9\n', o: '-2\n' }] },
    { id: 'cifre', niv: 2, titlu: 'Suma cifrelor', cer: 'Citește `n` și afișează suma cifrelor sale.',
      linii: ['n = int(input())', 's = 0', 'while n > 0:', '    s = s + n % 10', '    n = n // 10', 'print(s)'], extra: ['    n = n / 10'],
      teste: [{ i: '1234\n', o: '10\n' }, { i: '9\n', o: '9\n' }, { i: '505\n', o: '10\n' }, { i: '100000\n', o: '1\n' }] },
    { id: 'factorial', niv: 2, titlu: 'Factorial cu funcție', cer: 'Definește funcția `fact(n)` și afișează `n!` pentru un `n` citit.',
      linii: ['def fact(n):', '    p = 1', '    for i in range(2, n + 1):', '        p = p * i', '    return p', 'print(fact(int(input())))'], extra: ['    print(p)'],
      teste: [{ i: '5\n', o: '120\n' }, { i: '0\n', o: '1\n' }, { i: '10\n', o: '3628800\n' }] },
    { id: 'prim', niv: 2, titlu: 'Număr prim', cer: 'Citește `n` și afișează `prim` sau `nu este prim`.',
      linii: ['n = int(input())', 'prim = n >= 2', 'd = 2', 'while d * d <= n:', '    if n % d == 0:', '        prim = False', '    d = d + 1', 'if prim:', '    print("prim")', 'else:', '    print("nu este prim")'], extra: ['    d = d * 2'],
      teste: [{ i: '2\n', o: 'prim\n' }, { i: '15\n', o: 'nu este prim\n' }, { i: '17\n', o: 'prim\n' }, { i: '1\n', o: 'nu este prim\n' }, { i: '49\n', o: 'nu este prim\n' }] },
    { id: 'palindrom', niv: 3, titlu: 'Palindrom', cer: 'Citește un cuvânt. Afișează `da` dacă este palindrom, altfel `nu`. **Atenție:** printre linii sunt și unele care nu trebuie folosite.',
      linii: ['s = input()', 'if s == s[::-1]:', '    print("da")', 'else:', '    print("nu")'], extra: ['if s = s[::-1]:', '    print("poate")'],
      teste: [{ i: 'level\n', o: 'da\n' }, { i: 'python\n', o: 'nu\n' }, { i: 'a\n', o: 'da\n' }, { i: 'abca\n', o: 'nu\n' }] },
    { id: 'fizzbuzz', niv: 3, titlu: 'Fizz Buzz', cer: 'Citește `n` și afișează jocul Fizz Buzz de la 1 la `n`. Unele linii sunt în plus.',
      linii: ['n = int(input())', 'for i in range(1, n + 1):', '    if i % 15 == 0:', '        print("FizzBuzz")', '    elif i % 3 == 0:', '        print("Fizz")', '    elif i % 5 == 0:', '        print("Buzz")', '    else:', '        print(i)'], extra: ['    if i % 3 == 0 and i % 5 == 0 or i == 15:', '        print("Fizz")'],
      teste: [{ i: '5\n', o: '1\n2\nFizz\n4\nBuzz\n' }, { i: '15\n', o: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n' }, { i: '3\n', o: '1\n2\nFizz\n' }] },
    { id: 'cmmdc', niv: 3, titlu: 'Cel mai mare divizor comun', cer: 'Citește `a` și `b` (câte unul pe rând) și afișează cmmdc (algoritmul lui Euclid). Atenție la liniile în plus.',
      linii: ['a = int(input())', 'b = int(input())', 'while b != 0:', '    r = a % b', '    a = b', '    b = r', 'print(a)'], extra: ['    a = a - b', 'print(b)'],
      teste: [{ i: '12\n18\n', o: '6\n' }, { i: '7\n13\n', o: '1\n' }, { i: '100\n75\n', o: '25\n' }, { i: '48\n180\n', o: '12\n' }] },
  ];

  // ───────────────────────────── GĂSEȘTE GREȘEALA ─────────────────────────────
  // Programul are O greșeală pe rândul `rand` (de la 1). `optiuni` = înlocuiri posibile pentru acel rând; `ok` = indicele celei corecte.
  const BUGURI = [
    { id: 'virgula', niv: 1, titlu: 'Un rând care nu pornește', cer: 'Programul trebuie să afișeze `da` dacă numărul este pozitiv. Dar nu pornește deloc.',
      cod: 'n = int(input())\nif n > 0\n    print("da")', rand: 2, optiuni: ['if n > 0:', 'if n => 0:', 'if (n > 0)'], ok: 0,
      expl: 'După condiția unui `if` trebuie să pui două puncte (`:`). Fără ele, Python dă SyntaxError.', teste: [{ i: '5\n', o: 'da\n' }] },
    { id: 'egal', niv: 1, titlu: 'Un semn de egal în plus sau în minus', cer: 'Programul trebuie să afișeze `par` pentru numerele pare, dar dă o eroare de sintaxă.',
      cod: 'n = int(input())\nif n % 2 = 0:\n    print("par")\nelse:\n    print("impar")', rand: 2, optiuni: ['if n % 2 == 0:', 'if n % 2 === 0:', 'if n % 2 == 1:'], ok: 0,
      expl: '`=` pune o valoare într-o variabilă, iar `==` compară două valori. Într-un `if` ai nevoie de comparație.', teste: [{ i: '4\n', o: 'par\n' }, { i: '7\n', o: 'impar\n' }] },
    { id: 'nume', niv: 1, titlu: 'Funcție necunoscută', cer: 'Programul trebuie să afișeze `Salut, Ana!`, dar se oprește cu NameError.',
      cod: 'nume = "Ana"\npritn("Salut,", nume + "!")', rand: 2, optiuni: ['print("Salut,", nume + "!")', 'Print("Salut,", nume + "!")', 'echo("Salut,", nume + "!")'], ok: 0,
      expl: 'Numele funcției a fost scris greșit (`pritn`). Python nu cunoaște un nume pe care nu l-ai definit.', teste: [{ i: '', o: 'Salut, Ana!\n' }] },
    { id: 'int', niv: 2, titlu: 'Numerele se lipesc', cer: 'Programul trebuie să afișeze suma celor două numere citite, dar afișează `34` pentru intrările 3 și 4.',
      cod: 'a = input()\nb = int(input())\nprint(a + b)', rand: 1, optiuni: ['a = int(input())', 'a = str(input())', 'a = input(int)'], ok: 0,
      expl: '`input()` returnează text. Dacă nu convertești cu `int()`, `+` lipește textele în loc să adune numerele.', teste: [{ i: '3\n4\n', o: '7\n' }, { i: '10\n25\n', o: '35\n' }] },
    { id: 'suma-ciclu', niv: 2, titlu: 'Suma nu se strânge', cer: 'Programul trebuie să afișeze suma `1 + 2 + … + n`, dar rezultatul este mereu `n`.',
      cod: 'n = int(input())\nsuma = 0\nfor i in range(1, n + 1):\n    suma = i\nprint(suma)', rand: 4, optiuni: ['    suma = suma + i', '    suma = suma - i', '    suma + i'], ok: 0,
      expl: '`suma = i` înlocuiește valoarea la fiecare pas. Pentru a **aduna** trebuie `suma = suma + i`.', teste: [{ i: '5\n', o: '15\n' }, { i: '10\n', o: '55\n' }] },
    { id: 'range', niv: 2, titlu: 'Un pas prea puțin', cer: 'Programul trebuie să afișeze `1 2 3 4 5` pentru `n = 5`, dar se oprește la `4`.',
      cod: 'n = int(input())\nfor i in range(1, n):\n    print(i, end=" ")\nprint()', rand: 2, optiuni: ['for i in range(1, n + 1):', 'for i in range(n):', 'for i in range(1, n - 1):'], ok: 0,
      expl: 'Limita de sus a lui `range` nu este inclusă. Pentru a ajunge la `n` scrii `range(1, n + 1)`.', teste: [{ i: '5\n', o: '1 2 3 4 5\n' }, { i: '3\n', o: '1 2 3\n' }] },
    { id: 'infinit', niv: 3, titlu: 'Programul nu se mai oprește', cer: 'Programul trebuie să afișeze suma cifrelor, dar rămâne blocat în ciclu.',
      cod: 'n = int(input())\ns = 0\nwhile n >= 0:\n    s = s + n % 10\n    n = n // 10\nprint(s)', rand: 3, optiuni: ['while n > 0:', 'while n != 1:', 'while n <= 0:'], ok: 0,
      expl: 'După ce `n` ajunge la `0`, condiția `n >= 0` rămâne adevărată la nesfârșit. Ciclul trebuie să se oprească la `0`.', teste: [{ i: '1234\n', o: '10\n' }, { i: '9\n', o: '9\n' }] },
    { id: 'return', niv: 3, titlu: 'Funcția nu răspunde', cer: 'Funcția `dublu` trebuie să returneze dublul numărului, dar programul afișează `None`.',
      cod: 'def dublu(x):\n    x * 2\n\nprint(dublu(int(input())))', rand: 2, optiuni: ['    return x * 2', '    print(x * 2)', '    x = x * 2'], ok: 0,
      expl: 'Fără `return`, funcția nu trimite nicio valoare înapoi, deci rezultatul este `None`. `print` doar afișează în funcție, nu returnează.', teste: [{ i: '4\n', o: '8\n' }, { i: '-3\n', o: '-6\n' }] },
    { id: 'maxim', niv: 3, titlu: 'Maximul care nu e maxim', cer: 'Programul trebuie să afișeze cel mai mare dintre trei numere, dar uneori dă răspuns greșit.',
      cod: 'a = int(input())\nb = int(input())\nc = int(input())\nm = a\nif b < m:\n    m = b\nif c > m:\n    m = c\nprint(m)', rand: 5, optiuni: ['if b > m:', 'if b == m:', 'if b < c:'], ok: 0,
      expl: 'Pentru maxim, numărul nou trebuie să fie **mai mare** decât cel păstrat. `b < m` păstrează de fapt minimul.', teste: [{ i: '3\n9\n5\n', o: '9\n' }, { i: '10\n2\n7\n', o: '10\n' }, { i: '1\n2\n3\n', o: '3\n' }] },
    { id: 'rest', niv: 3, titlu: 'Ultima cifră', cer: 'Programul trebuie să afișeze ultima cifră a unui număr, dar afișează altceva.',
      cod: 'n = int(input())\nultima = n // 10\nprint(ultima)', rand: 2, optiuni: ['ultima = n % 10', 'ultima = n / 10', 'ultima = n - 10'], ok: 0,
      expl: '`//` dă câtul împărțirii (numărul fără ultima cifră), iar `%` dă restul, adică chiar ultima cifră.', teste: [{ i: '1234\n', o: '4\n' }, { i: '905\n', o: '5\n' }] },
  ];

  // ───────────────────────────── BLITZ: Ce afișează? ─────────────────────────────
  // rasp = exact ce afișează programul (verificat pe interpretor); gresite = 3 variante greșite plauzibile.
  const BLITZ = [
    { niv: 1, cod: 'print(3 + 4 * 2)', rasp: '11', gresite: ['14', '9', '24'] },
    { niv: 1, cod: 'print("Py" + "thon")', rasp: 'Python', gresite: ['Py thon', 'Py+thon', 'Pythonthon'] },
    { niv: 1, cod: 'x = 5\nx = x + 2\nprint(x)', rasp: '7', gresite: ['5', '2', '52'] },
    { niv: 1, cod: 'print(10 // 3)', rasp: '3', gresite: ['3.33', '1', '4'] },
    { niv: 1, cod: 'print(10 % 3)', rasp: '1', gresite: ['3', '0', '10'] },
    { niv: 1, cod: 'print(len("salut"))', rasp: '5', gresite: ['4', '6', 'salut'] },
    { niv: 1, cod: 'for i in range(3):\n    print(i, end=" ")', rasp: '0 1 2', gresite: ['1 2 3', '0 1 2 3', '1 2'] },
    { niv: 1, cod: 'print(2 ** 3)', rasp: '8', gresite: ['6', '9', '5'] },
    { niv: 2, cod: 'v = [3, 1, 2]\nv.sort()\nprint(v[0])', rasp: '1', gresite: ['3', '2', '[1, 2, 3]'] },
    { niv: 2, cod: 's = 0\nfor i in range(1, 5):\n    s += i\nprint(s)', rasp: '10', gresite: ['15', '4', '9'] },
    { niv: 2, cod: 'print("abc"[::-1])', rasp: 'cba', gresite: ['abc', 'bca', 'acb'] },
    { niv: 2, cod: 'n = 1234\nprint(n % 10 + n // 10 % 10)', rasp: '7', gresite: ['4', '3', '10'] },
    { niv: 2, cod: 'x = 7\nif x > 5 and x < 10:\n    print("A")\nelse:\n    print("B")', rasp: 'A', gresite: ['B', 'AB', 'Eroare'] },
    { niv: 2, cod: 'def f(a, b=2):\n    return a * b\nprint(f(4))', rasp: '8', gresite: ['4', '6', '2'] },
    { niv: 2, cod: 'd = {"a": 1}\nd["b"] = 2\nprint(len(d))', rasp: '2', gresite: ['1', '3', 'ab'] },
    { niv: 2, cod: 'print(sum([1, 2, 3, 4]) // 2)', rasp: '5', gresite: ['10', '2', '4'] },
    { niv: 3, cod: 'i = 0\nwhile i < 10:\n    i += 3\nprint(i)', rasp: '12', gresite: ['9', '10', '15'] },
    { niv: 3, cod: 'def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\nprint(f(4))', rasp: '24', gresite: ['10', '12', '16'] },
    { niv: 3, cod: 's = "banana"\nprint(s.count("an"))', rasp: '2', gresite: ['3', '1', '4'] },
    { niv: 3, cod: 'v = [1, 2, 3, 4, 5, 6]\nprint(v[1:4])', rasp: '[2, 3, 4]', gresite: ['[1, 2, 3, 4]', '[2, 3, 4, 5]', '[1, 2, 3]'] },
    { niv: 3, cod: 'a, b = 3, 5\na, b = b, a\nprint(a, b)', rasp: '5 3', gresite: ['3 5', '5 5', '3 3'] },
    { niv: 3, cod: 'x = 10\nfor i in range(3):\n    x = x - i\nprint(x)', rasp: '7', gresite: ['10', '9', '8'] },
    { niv: 3, cod: 'print(len(str(2 ** 10)))', rasp: '4', gresite: ['3', '10', '1024'] },
    { niv: 3, cod: 'l = []\nfor i in range(4):\n    l.append(i * i)\nprint(l[-1], len(l))', rasp: '9 4', gresite: ['9 3', '16 4', '4 4'] },
  ];

  // ───────────────────────────── COMPLETEAZĂ CODUL ─────────────────────────────
  // cod conține {1}, {2}, … ; goluri[k] = { opt: variante, ok: indicele variantei corecte }. Se acceptă orice completare care trece testele.
  const COMPLETARE = [
    { id: 'suma', niv: 1, titlu: 'Suma de la 1 la n', cer: 'Completează golurile ca programul să afișeze `1 + 2 + … + n`.',
      cod: 'n = int(input())\nsuma = {1}\nfor i in range(1, {2}):\n    suma = suma {3} i\nprint(suma)',
      goluri: [{ opt: ['0', '1', 'n'], ok: 0 }, { opt: ['n', 'n + 1', 'n - 1'], ok: 1 }, { opt: ['+', '-', '*'], ok: 0 }],
      teste: [{ i: '5\n', o: '15\n' }, { i: '10\n', o: '55\n' }, { i: '1\n', o: '1\n' }] },
    { id: 'paritate', niv: 1, titlu: 'Par sau impar', cer: 'Programul trebuie să spună dacă numărul este par.',
      cod: 'n = int(input())\nif n {1} 2 {2} 0:\n    print("par")\n{3}:\n    print("impar")',
      goluri: [{ opt: ['%', '//', '/'], ok: 0 }, { opt: ['==', '=', '!='], ok: 0 }, { opt: ['else', 'elif', 'if'], ok: 0 }],
      teste: [{ i: '4\n', o: 'par\n' }, { i: '7\n', o: 'impar\n' }, { i: '0\n', o: 'par\n' }] },
    { id: 'vocale', niv: 1, titlu: 'Numără vocalele', cer: 'Programul numără câte vocale are un text.',
      cod: 's = input()\nnr = 0\nfor c in {1}:\n    if c {2} "aeiou":\n        nr = nr {3} 1\nprint(nr)',
      goluri: [{ opt: ['s', '"aeiou"', 'range(s)'], ok: 0 }, { opt: ['in', '==', 'not in'], ok: 0 }, { opt: ['+', '-', '*'], ok: 0 }],
      teste: [{ i: 'informatica\n', o: '5\n' }, { i: 'python\n', o: '1\n' }, { i: 'bcd\n', o: '0\n' }] },
    { id: 'cifre', niv: 2, titlu: 'Suma cifrelor', cer: 'Programul adună cifrele unui număr.',
      cod: 'n = int(input())\ns = 0\nwhile n {1} 0:\n    s = s + n {2} 10\n    n = n {3} 10\nprint(s)',
      goluri: [{ opt: ['>', '<', '=='], ok: 0 }, { opt: ['%', '//', '/'], ok: 0 }, { opt: ['//', '%', '*'], ok: 0 }],
      teste: [{ i: '1234\n', o: '10\n' }, { i: '9\n', o: '9\n' }, { i: '505\n', o: '10\n' }] },
    { id: 'maxim-lista', niv: 2, titlu: 'Maximul dintr-o listă', cer: 'Programul citește `n` numere și afișează cel mai mare, fără `max()`.',
      cod: 'n = int(input())\nm = int(input())\nfor i in range({1}):\n    x = int(input())\n    if x {2} m:\n        m = {3}\nprint(m)',
      goluri: [{ opt: ['n - 1', 'n', 'n + 1'], ok: 0 }, { opt: ['>', '<', '=='], ok: 0 }, { opt: ['x', 'n', 'i'], ok: 0 }],
      teste: [{ i: '3\n5\n9\n2\n', o: '9\n' }, { i: '1\n7\n', o: '7\n' }, { i: '4\n-3\n-1\n-8\n-2\n', o: '-1\n' }] },
    { id: 'functie', niv: 2, titlu: 'Funcție pentru pătrat', cer: 'Funcția `aria` calculează aria unui pătrat cu latura dată.',
      cod: '{1} aria(l):\n    {2} l {3} l\n\nprint(aria(int(input())))',
      goluri: [{ opt: ['def', 'fun', 'function'], ok: 0 }, { opt: ['return', 'print', 'result'], ok: 0 }, { opt: ['*', '+', '**'], ok: 0 }],
      teste: [{ i: '4\n', o: '16\n' }, { i: '1\n', o: '1\n' }, { i: '10\n', o: '100\n' }] },
    { id: 'palindrom', niv: 3, titlu: 'Palindrom', cer: 'Programul spune dacă un cuvânt se citește la fel în ambele sensuri.',
      cod: 's = input()\nif s {1} s[{2}]:\n    print("da")\n{3}:\n    print("nu")',
      goluri: [{ opt: ['==', '=', '!='], ok: 0 }, { opt: [':', '::-1', '-1'], ok: 1 }, { opt: ['else', 'elif', 'then'], ok: 0 }],
      teste: [{ i: 'level\n', o: 'da\n' }, { i: 'python\n', o: 'nu\n' }, { i: 'a\n', o: 'da\n' }] },
    { id: 'prim', niv: 3, titlu: 'Număr prim', cer: 'Funcția `este_prim` trebuie să returneze `True` pentru numerele prime.',
      cod: 'def este_prim(n):\n    if n {1} 2:\n        return False\n    d = 2\n    while d * d {2} n:\n        if n {3} d == 0:\n            return False\n        d = d + 1\n    return True\n\nn = int(input())\nprint("prim" if este_prim(n) else "nu este prim")',
      goluri: [{ opt: ['<', '>', '=='], ok: 0 }, { opt: ['<=', '>', '=='], ok: 0 }, { opt: ['%', '//', '/'], ok: 0 }],
      teste: [{ i: '2\n', o: 'prim\n' }, { i: '15\n', o: 'nu este prim\n' }, { i: '17\n', o: 'prim\n' }, { i: '1\n', o: 'nu este prim\n' }, { i: '49\n', o: 'nu este prim\n' }] },
  ];

  const DATE = { NIVELE_ROBOT, preludiuRobot, EPILOG_ROBOT, RANDURI_PRELUDIU, ORDONARE, BUGURI, BLITZ, COMPLETARE };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATE;
  else window.PyJocuri = DATE;
})();

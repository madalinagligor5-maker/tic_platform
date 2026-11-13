'use strict';
// Editor Python pentru clasele VII–VIII: un Thonny simplificat care rulează în browser.
// Conține un interpretor pentru Python-ul de gimnaziu scris în JS (fără eval / new Function / WebAssembly),
// care rulează într-un Web Worker creat din ACELAȘI fișier (permis de CSP: script-src 'self').
// Interpretorul folosește generatoare JS, ca programul să se poată opri la input(), la time.sleep()
// și la fiecare pas în modul de depanare, apoi să continue exact de unde a rămas.
(() => {
  // =====================================================================
  // INTERPRETORUL PYTHON
  // =====================================================================
  const PY = (() => {
    const MAX_TIMP = 10000, MAX_IESIRE = 2000000, MAX_ADANCIME = 1000;

    // ---------- Valorile Python ----------
    // int: număr JS (întreg sigur) sau BigInt (numere mari); float: PyFloat; bool: true/false; None: null; str: șir JS
    class PyFloat { constructor(v) { this.v = v; } }
    class PyList { constructor(a) { this.a = a; } }
    class PyTuple { constructor(a) { this.a = a; } }
    class PyDict { constructor() { this.m = new Map(); } } // cheie hash → [cheie, valoare]
    class PySet { constructor() { this.m = new Map(); } } // cheie hash → element
    class PyRange { constructor(a, b, c) { this.start = a; this.stop = b; this.step = c; } }
    class PyFunc { constructor(o) { Object.assign(this, o); this.id = ++nrObiecte; } }
    class PyBuiltin { constructor(name, fn, gen = null) { this.name = name; this.fn = fn; this.gen = gen; } }
    class PyBound { constructor(self, name, fn, gen = null) { this.self = self; this.name = name; this.fn = fn; this.gen = gen; } }
    class PyModule { constructor(name, d) { this.name = name; this.d = d; } }
    class PyType { constructor(name, base, make) { this.name = name; this.base = base; this.make = make; } }
    class PyExcObj { constructor(type, args) { this.type = type; this.args = args; this.tb = null; } }
    class PyIter { constructor(kind, it) { this.kind = kind; this.it = it; this.id = ++nrObiecte; } }
    class PyView { constructor(kind, d) { this.kind = kind; this.d = d; } }
    class PyInst { constructor(cls, d) { this.cls = cls; this.d = d; this.id = ++nrObiecte; } }
    class PyMetoda { constructor(self, fn) { this.self = self; this.fn = fn; } } // metodă legată a unei clase scrise de elev
    class Oprire { constructor(mesaj, rand) { this.mesaj = mesaj; this.rand = rand; } } // bucla infinită (nu poate fi prinsă cu except)
    class Iesire { constructor(cod) { this.cod = cod; } } // exit()
    let nrObiecte = 0;
    const fl = (v) => new PyFloat(v);
    const adresa = (o) => `0x${(0x7f3a1c000000 + (o.id || 1) * 48).toString(16)}`;

    // ---------- Erori de sintaxă ----------
    class ErSintaxa {
      constructor(tip, mesaj, rand, col = 0, lung = 1) { this.tip = tip; this.mesaj = mesaj; this.rand = rand; this.col = col; this.lung = lung; }
    }

    // ---------- Starea rulării ----------
    let S = null;
    function stareNoua(gazda) {
      return { gazda, G: new Map([['__name__', '__main__']]), stack: [], pasi: 0, urm: 4000, t0: Date.now(), tFlush: Date.now(), lungIesire: 0, dbg: false, module: new Map(), rnd: null, tt: null, intrari: [], suspecte: new Set() };
    }

    // =====================================================================
    // LEXER: text → atomi (cu INDENT / DEDENT ca în Python)
    // =====================================================================
    const OPS = ['**=', '//=', '>>=', '<<=', '...', '!=', '==', '<=', '>=', '**', '//', '->', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '@=', ':=', '<<', '>>',
      '+', '-', '*', '/', '%', '@', '&', '|', '^', '~', '<', '>', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';', '=', '!'];
    const PREFIXE = new Set(['r', 'u', 'b', 'f', 'br', 'rb', 'fr', 'rf']);
    const INCHIS = { ')': '(', ']': '[', '}': '{' };
    function eschive(s, rand) {
      let o = '';
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c !== '\\') { o += c; continue; }
        const d = s[++i];
        switch (d) {
          case 'n': o += '\n'; break; case 't': o += '\t'; break; case 'r': o += '\r'; break; case '\\': o += '\\'; break;
          case "'": o += "'"; break; case '"': o += '"'; break; case 'a': o += '\x07'; break; case 'b': o += '\b'; break;
          case 'f': o += '\f'; break; case 'v': o += '\v'; break; case '\n': break;
          case 'x': { const h = s.slice(i + 1, i + 3); if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new ErSintaxa('SyntaxError', `(unicode error) 'unicodeescape' codec can't decode bytes: truncated \\xXX escape`, rand); o += String.fromCharCode(parseInt(h, 16)); i += 2; break; }
          case 'u': case 'U': { const n = d === 'u' ? 4 : 8; const h = s.slice(i + 1, i + 1 + n); if (!new RegExp(`^[0-9a-fA-F]{${n}}$`).test(h)) throw new ErSintaxa('SyntaxError', `(unicode error) 'unicodeescape' codec can't decode bytes: truncated \\${d}${'X'.repeat(n)} escape`, rand); o += String.fromCodePoint(parseInt(h, 16)); i += n; break; }
          default:
            if (d >= '0' && d <= '7') { let k = i; while (k < i + 3 && s[k] >= '0' && s[k] <= '7') k++; o += String.fromCharCode(parseInt(s.slice(i, k), 8)); i = k - 1; } else o += `\\${d === undefined ? '' : d}`;
        }
      }
      return o;
    }
    function lexeaza(src) {
      const toks = [], ind = [0], par = [];
      let i = 0, line = 1, ls = 0, bol = true;
      const n = src.length;
      const tok = (t, v, l, c, e) => toks.push({ t, v, line: l, col: c, end: e });
      const textRand = (r) => src.split('\n')[r - 1] || '';
      while (i < n) {
        if (bol) {
          bol = false;
          let col = 0, j = i;
          while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\f')) { col = src[j] === '\t' ? (Math.floor(col / 8) + 1) * 8 : src[j] === '\f' ? 0 : col + 1; j++; }
          if (j >= n) { i = j; break; }
          if (src[j] === '\n' || src[j] === '#' || src[j] === '\r') { // rând gol sau doar comentariu
            const k = src.indexOf('\n', j);
            if (k < 0) { i = n; break; }
            i = k + 1; line++; ls = i; bol = true; continue;
          }
          const top = ind[ind.length - 1];
          if (col > top) { ind.push(col); tok('INDENT', null, line, 0, col); } else if (col < top) {
            while (col < ind[ind.length - 1]) { ind.pop(); tok('DEDENT', null, line, 0, col); }
            if (col !== ind[ind.length - 1]) throw new ErSintaxa('IndentationError', 'unindent does not match any outer indentation level', line, textRand(line).length, 1);
          }
          i = j;
        }
        const c = src[i];
        if (c === ' ' || c === '\t' || c === '\f' || c === '\r') { i++; continue; }
        if (c === '\n') {
          if (!par.length) { if (toks.length && toks[toks.length - 1].t !== 'NEWLINE') tok('NEWLINE', null, line, i - ls); bol = true; }
          i++; line++; ls = i; continue;
        }
        if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
        if (c === '\\') {
          if (src[i + 1] === '\n') { i += 2; line++; ls = i; continue; }
          throw new ErSintaxa('SyntaxError', 'unexpected character after line continuation character', line, i - ls);
        }
        // texte (cu prefixe r, f, b ...)
        const mq = /^([A-Za-z]{0,2})('''|"""|'|")/.exec(src.slice(i, i + 5));
        if (mq && PREFIXE.has(mq[1].toLowerCase()) || (mq && mq[1] === '')) {
          const pre = mq[1].toLowerCase(), q = mq[2];
          const l0 = line, c0 = i - ls;
          let j = i + mq[0].length, corp = '';
          for (;;) {
            if (j >= n) {
              if (q.length === 3) throw new ErSintaxa('SyntaxError', `unterminated triple-quoted string literal (detected at line ${line})`, l0, c0);
              throw new ErSintaxa('SyntaxError', `unterminated string literal (detected at line ${l0})`, l0, c0);
            }
            const ch = src[j];
            if (ch === '\n' && q.length === 1) throw new ErSintaxa('SyntaxError', `unterminated string literal (detected at line ${l0})`, l0, c0);
            if (ch === '\\') { corp += ch + (src[j + 1] ?? ''); if (src[j + 1] === '\n') { line++; ls = j + 2; } j += 2; continue; }
            if (src.startsWith(q, j)) { j += q.length; break; }
            if (ch === '\n') { line++; ls = j + 1; }
            corp += ch; j++;
          }
          const raw = pre.includes('r');
          if (pre.includes('f')) tok('fstr', fstrParti(corp, raw, l0, c0), l0, c0, j - ls);
          else tok('str', raw ? corp : eschive(corp, l0), l0, c0, j - ls);
          i = j; continue;
        }
        // numere
        if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
          const m = /^(?:0[xX][\da-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)/.exec(src.slice(i, i + 400));
          const t = m[0], urm = src[i + t.length];
          if (urm && /[\p{L}\p{N}_]/u.test(urm)) throw new ErSintaxa('SyntaxError', urm === 'j' || urm === 'J' ? 'numerele complexe nu sunt disponibile în acest editor' : 'invalid decimal literal', line, i - ls);
          const curat = t.replace(/_/g, '');
          let v;
          if (/^0[xXoObB]/.test(t)) v = nb(BigInt(curat));
          else if (/[.eE]/.test(t)) v = fl(Number(curat));
          else {
            if (/^0\d/.test(curat) && /[1-9]/.test(curat)) throw new ErSintaxa('SyntaxError', 'leading zeros in decimal integer literals are not permitted; use an 0o prefix for octal integers', line, i - ls);
            v = nb(BigInt(curat));
          }
          tok('num', v, line, i - ls, i - ls + t.length); i += t.length; continue;
        }
        // nume
        const mn = /^[\p{L}_][\p{L}\p{N}\p{Mn}\p{Mc}_]*/u.exec(src.slice(i, i + 200));
        if (mn) { tok('name', mn[0], line, i - ls, i - ls + mn[0].length); i += mn[0].length; continue; }
        // operatori
        let op = null;
        for (const o of OPS) if (src.startsWith(o, i)) { op = o; break; }
        if (!op) {
          const cp = src.codePointAt(i);
          if (cp > 127) throw new ErSintaxa('SyntaxError', `invalid character '${String.fromCodePoint(cp)}' (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`, line, i - ls);
          throw new ErSintaxa('SyntaxError', 'invalid syntax', line, i - ls);
        }
        if (op === '(' || op === '[' || op === '{') par.push({ c: op, line, col: i - ls });
        else if (INCHIS[op]) {
          if (!par.length) throw new ErSintaxa('SyntaxError', `unmatched '${op}'`, line, i - ls);
          const d = par.pop();
          if (d.c !== INCHIS[op]) throw new ErSintaxa('SyntaxError', d.line === line ? `closing parenthesis '${op}' does not match opening parenthesis '${d.c}'` : `closing parenthesis '${op}' does not match opening parenthesis '${d.c}' on line ${d.line}`, line, i - ls);
        }
        tok('op', op, line, i - ls, i - ls + op.length); i += op.length;
      }
      if (par.length) { const d = par[par.length - 1]; throw new ErSintaxa('SyntaxError', `'${d.c}' was never closed`, d.line, d.col); }
      if (toks.length && toks[toks.length - 1].t !== 'NEWLINE') tok('NEWLINE', null, line, i - ls);
      while (ind.length > 1) { ind.pop(); tok('DEDENT', null, line, 0); }
      tok('EOF', null, line, 0);
      return toks;
    }
    // f-string → părți: text sau { src, conv, spec, eq }
    function fstrParti(corp, raw, rand, col) {
      const parti = [];
      let i = 0, lit = '';
      const n = corp.length;
      const gata = () => { if (lit) parti.push(raw ? lit : eschive(lit, rand)); lit = ''; };
      while (i < n) {
        const c = corp[i];
        if (c === '{' && corp[i + 1] === '{') { lit += '{'; i += 2; continue; }
        if (c === '}' && corp[i + 1] === '}') { lit += '}'; i += 2; continue; }
        if (c === '}') throw new ErSintaxa('SyntaxError', "f-string: single '}' is not allowed", rand, col);
        if (c !== '{') { lit += c; i++; continue; }
        gata();
        // expresia, până la !, : sau } de pe nivelul 0
        let j = i + 1, ad = 0, q = null;
        const st = j;
        let exprSf = -1, conv = null, specStart = -1;
        for (; j < n; j++) {
          const ch = corp[j];
          if (q) { if (ch === q) q = null; continue; }
          if (ch === '"' || ch === "'") { q = ch; continue; }
          if ('([{'.includes(ch)) ad++;
          else if (')]}'.includes(ch)) { if (ch === '}' && ad === 0) break; ad--; } else if (ad === 0 && ch === '!' && corp[j + 1] !== '=') { if (exprSf < 0) exprSf = j; conv = corp[j + 1]; j++; } else if (ad === 0 && ch === ':' ) { if (exprSf < 0) exprSf = j; specStart = j + 1; break; }
        }
        if (exprSf < 0) exprSf = j;
        let spec = null;
        if (specStart >= 0) { // specificatorul poate conține și el {}
          let k = specStart, a2 = 0;
          for (; k < n; k++) { if (corp[k] === '{') a2++; else if (corp[k] === '}') { if (a2 === 0) break; a2--; } }
          if (k >= n) throw new ErSintaxa('SyntaxError', "f-string: expecting '}'", rand, col);
          spec = fstrParti(corp.slice(specStart, k), true, rand, col);
          j = k;
        }
        if (j >= n) throw new ErSintaxa('SyntaxError', "f-string: expecting '}'", rand, col);
        let sursa = corp.slice(st, exprSf);
        let eq = false;
        if (/=\s*$/.test(sursa) && !/[=!<>]=\s*$/.test(sursa)) { eq = sursa; sursa = sursa.replace(/=\s*$/, ''); }
        if (!sursa.trim()) throw new ErSintaxa('SyntaxError', 'f-string: valid expression required before \'}\'', rand, col);
        if (conv && !'rsa'.includes(conv)) throw new ErSintaxa('SyntaxError', `f-string: invalid conversion character '${conv}': expected 's', 'r', or 'a'`, rand, col);
        parti.push({ src: sursa, conv, spec, eq, rand });
        i = j + 1;
      }
      gata();
      return parti;
    }

    // =====================================================================
    // PARSER: atomi → arbore sintactic
    // =====================================================================
    const CUVINTE = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
      'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);
    const AUG = new Set(['+=', '-=', '*=', '/=', '//=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=', '@=']);
    function parseaza(toks) {
      let p = 0, inBucla = 0, inFunctie = 0;
      const T = () => toks[p];
      const U = (k = 1) => toks[p + k] || toks[toks.length - 1];
      const eOp = (v) => T().t === 'op' && T().v === v;
      const eKw = (v) => T().t === 'name' && T().v === v;
      const ia = (v) => { if (eOp(v) || eKw(v)) { p++; return true; } return false; };
      const greseala = (tk, mesaj = 'invalid syntax', tip = 'SyntaxError') => { throw new ErSintaxa(tip, mesaj, tk.line, tk.col, Math.max(1, (tk.end || tk.col + 1) - tk.col)); };
      const asteapta = (v, mesaj) => { if (!ia(v)) greseala(T(), mesaj); };
      const nod = (k, tk, o, copii = []) => { o.k = k; o.line = tk.line; o.col = tk.col; o.g = copii.some((c) => c && c.g); return o; };
      const incepeExpr = () => { const t = T(); if (t.t === 'num' || t.t === 'str' || t.t === 'fstr') return true; if (t.t === 'name') return !CUVINTE.has(t.v) || ['None', 'True', 'False', 'not', 'lambda', 'await'].includes(t.v); return t.t === 'op' && ['(', '[', '{', '-', '+', '~', '...', '*'].includes(t.v); };

      function program() {
        const corp = [];
        while (T().t !== 'EOF') {
          if (T().t === 'NEWLINE') { p++; continue; }
          if (T().t === 'INDENT') greseala(T(), 'unexpected indent', 'IndentationError');
          corp.push(...instructiune());
        }
        return corp;
      }
      function instructiune() {
        const tk = T();
        if (tk.t === 'name') {
          switch (tk.v) {
            case 'if': return [instrIf('if')];
            case 'while': return [instrWhile()];
            case 'for': return [instrFor()];
            case 'def': return [instrDef()];
            case 'try': return [instrTry()];
            case 'class': return [instrClass()];
            case 'with': greseala(tk, 'instrucțiunea with nu este disponibilă în acest editor');
            case 'elif': case 'else': case 'except': case 'finally': greseala(tk, 'invalid syntax');
            default:
          }
        }
        if (tk.t === 'DEDENT' || tk.t === 'INDENT') greseala(tk, tk.t === 'INDENT' ? 'unexpected indent' : 'invalid syntax', 'IndentationError');
        return simple();
      }
      function simple() {
        const l = [];
        for (;;) {
          l.push(instrSimpla());
          if (ia(';')) { if (T().t === 'NEWLINE') break; continue; }
          break;
        }
        if (T().t !== 'NEWLINE') {
          const t = T();
          if (t.t === 'op' && (t.v === '+' || t.v === '-') && U().t === 'NEWLINE' && toks[p - 1].t === 'op' && toks[p - 1].v === t.v) greseala(U(), 'invalid syntax');
          greseala(t);
        }
        p++;
        return l;
      }
      function bloc(ce, rand) {
        if (!eOp(':')) {
          if (eOp('=')) greseala(T(), "invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
          greseala(T(), "expected ':'");
        }
        p++;
        if (T().t !== 'NEWLINE') return simple();
        p++;
        if (T().t !== 'INDENT') greseala(T(), `expected an indented block after ${ce} on line ${rand}`, 'IndentationError');
        p++;
        const corp = [];
        while (T().t !== 'DEDENT' && T().t !== 'EOF') { if (T().t === 'NEWLINE') { p++; continue; } corp.push(...instructiune()); }
        ia2('DEDENT');
        return corp;
      }
      const ia2 = (t) => { if (T().t === t) p++; };
      function conditie() {
        const e = test();
        if (eOp('=')) greseala(T(), "invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
        return e;
      }
      function instrIf(ce) {
        const tk = T(); p++;
        const c = conditie();
        const corp = bloc(`'${ce}' statement`, tk.line);
        let altfel = [];
        if (eKw('elif')) altfel = [instrIf('elif')];
        else if (eKw('else')) { const te = T(); p++; altfel = bloc("'else' statement", te.line); }
        return nod('if', tk, { c, corp, altfel }, [c]);
      }
      function instrWhile() {
        const tk = T(); p++;
        const c = conditie();
        inBucla++; const corp = bloc("'while' statement", tk.line); inBucla--;
        let altfel = [];
        if (eKw('else')) { const te = T(); p++; altfel = bloc("'else' statement", te.line); }
        return nod('while', tk, { c, corp, altfel }, [c]);
      }
      function tinte() { // lista de ținte din for (fără „in”)
        const tk = T();
        const l = [tinta1()];
        while (ia(',')) { if (eKw('in')) break; l.push(tinta1()); }
        return l.length === 1 && !eOp(',') && toks[p - 1].v !== ',' ? l[0] : nod('tuple', tk, { els: l }, l);
      }
      function tinta1() { if (eOp('*')) { const tk = T(); p++; const e = sauBit(); return nod('starred', tk, { e }, [e]); } return sauBit(); }
      function instrFor() {
        const tk = T(); p++;
        const t = tinte();
        verificaTinta(t, false);
        if (!eKw('in')) greseala(T(), eOp('=') ? "invalid syntax" : "invalid syntax");
        p++;
        const it = listaTest();
        inBucla++; const corp = bloc("'for' statement", tk.line); inBucla--;
        let altfel = [];
        if (eKw('else')) { const te = T(); p++; altfel = bloc("'else' statement", te.line); }
        return nod('for', tk, { t, it, corp, altfel }, [it]);
      }
      function parametri(inchis) {
        const ps = [];
        let stea = false;
        while (!eOp(inchis)) {
          const tk = T();
          if (ia('/')) { if (!ia(',')) break; continue; }
          if (ia('**')) { const nm = numeId(); ps.push({ name: nm, dstar: true }); if (inchis === ')' && ia(':')) test(); if (!ia(',')) break; continue; }
          if (ia('*')) { if (eOp(',')) { stea = true; p++; continue; } const nm = numeId(); ps.push({ name: nm, star: true }); stea = true; if (inchis === ')' && ia(':')) test(); if (!ia(',')) break; continue; }
          const nm = numeId();
          if (ps.some((x) => x.name === nm)) greseala(tk, `duplicate argument '${nm}' in function definition`);
          const par = { name: nm, kwonly: stea };
          if (inchis === ')' && ia(':')) test();
          if (ia('=')) par.def = test();
          else if (ps.length && ps[ps.length - 1].def && !stea && !ps[ps.length - 1].star) greseala(tk, 'parameter without a default follows parameter with a default');
          ps.push(par);
          if (!ia(',')) break;
        }
        return ps;
      }
      function numeId() { const t = T(); if (t.t !== 'name' || CUVINTE.has(t.v)) greseala(t); p++; return t.v; }
      function instrDef() {
        const tk = T(); p++;
        const name = numeId();
        asteapta('(', "expected '('");
        const params = parametri(')');
        asteapta(')');
        if (ia('->')) test();
        const sb = inBucla; inBucla = 0; inFunctie++;
        const corp = bloc('function definition', tk.line);
        inFunctie--; inBucla = sb;
        const sc = scop(params.map((x) => x.name), corp);
        const defs = params.filter((x) => x.def).map((x) => x.def);
        return nod('def', tk, { name, params, corp, ...sc }, defs);
      }
      function instrClass() {
        const tk = T(); p++;
        const name = numeId();
        const baze = [];
        if (ia('(')) { while (!eOp(')')) { baze.push(test()); if (!ia(',')) break; } asteapta(')'); }
        const sb = inBucla, sf = inFunctie; inBucla = 0; inFunctie = 0;
        const corp = bloc('class definition', tk.line);
        inBucla = sb; inFunctie = sf;
        return nod('class', tk, { name, baze, corp, ...scop([], corp) }, baze);
      }
      function instrTry() {
        const tk = T(); p++;
        const corp = bloc("'try' statement", tk.line);
        const h = [];
        while (eKw('except')) {
          const te = T(); p++;
          let tip = null, nm = null;
          if (!eOp(':')) { tip = test(); if (ia(',')) { const l = [tip]; do l.push(test()); while (ia(',')); tip = nod('tuple', te, { els: l }, l); } if (ia('as')) nm = numeId(); }
          h.push({ tip, nume: nm, corp: bloc("'except' statement", te.line), line: te.line });
        }
        let altfel = [], fin = null;
        if (eKw('else')) { const te = T(); p++; altfel = bloc("'else' statement", te.line); }
        if (eKw('finally')) { const te = T(); p++; fin = bloc("'finally' statement", te.line); }
        if (!h.length && !fin) greseala(T(), "expected 'except' or 'finally' block");
        return nod('try', tk, { corp, h, altfel, fin }, []);
      }
      function instrSimpla() {
        const tk = T();
        if (tk.t === 'name') {
          switch (tk.v) {
            case 'pass': p++; return nod('pass', tk, {});
            case 'break': p++; if (!inBucla) greseala(tk, "'break' outside loop"); return nod('break', tk, {});
            case 'continue': p++; if (!inBucla) greseala(tk, "'continue' not properly in loop"); return nod('continue', tk, {});
            case 'return': { p++; if (!inFunctie) greseala(tk, "'return' outside function"); const v = T().t === 'NEWLINE' || eOp(';') ? null : listaTest(); return nod('return', tk, { v }, [v]); }
            case 'global': case 'nonlocal': { p++; const names = [numeId()]; while (ia(',')) names.push(numeId()); return nod(tk.v, tk, { names }); }
            case 'import': {
              p++; const l = [];
              do { let nm = numeId(); while (ia('.')) nm += `.${numeId()}`; l.push({ nume: nm, ca: ia('as') ? numeId() : null }); } while (ia(','));
              return nod('import', tk, { l });
            }
            case 'from': {
              p++; let mod = numeId(); while (ia('.')) mod += `.${numeId()}`;
              asteapta('import');
              if (ia('*')) return nod('from', tk, { mod, toate: true });
              const par = ia('(');
              const l = [];
              do { if (par && eOp(')')) break; l.push({ nume: numeId(), ca: ia('as') ? numeId() : null }); } while (ia(','));
              if (par) asteapta(')');
              return nod('from', tk, { mod, l });
            }
            case 'del': { p++; const l = [sau()]; while (ia(',')) l.push(sau()); l.forEach((t) => verificaTinta(t, false, 'delete')); return nod('del', tk, { l }, l); }
            case 'assert': { p++; const c = test(); const m = ia(',') ? test() : null; return nod('assert', tk, { c, m }, [c, m]); }
            case 'raise': { p++; const e = T().t === 'NEWLINE' ? null : test(); if (ia('from')) test(); return nod('raise', tk, { e }, [e]); }
            case 'yield': greseala(tk, 'generatoarele (yield) nu sunt disponibile în acest editor');
            case 'print':
              if (U().t === 'str' || U().t === 'num' || U().t === 'fstr' || (U().t === 'name' && !CUVINTE.has(U().v))) greseala(tk, "Missing parentheses in call to 'print'. Did you mean print(...)?");
              break;
            default:
          }
        }
        const e = listaStea();
        if (eOp('=')) {
          const tinteL = [e];
          let v = null;
          while (ia('=')) { v = eKw('yield') ? greseala(T()) : listaStea(); tinteL.push(v); }
          v = tinteL.pop();
          for (const t of tinteL) verificaTinta(t, true);
          return nod('assign', tk, { tinte: tinteL, v }, [v, ...tinteL]);
        }
        if (T().t === 'op' && AUG.has(T().v)) {
          const op = T().v.slice(0, -1);
          if (!['name', 'attr', 'sub'].includes(e.k)) greseala(tk, `'${e.k === 'tuple' ? 'tuple' : e.k === 'list' ? 'list' : 'expression'}' is an illegal expression for augmented assignment`);
          p++;
          const v = listaTest();
          return nod('aug', tk, { t: e, op, v }, [e, v]);
        }
        if (eOp(':') && ['name', 'attr', 'sub'].includes(e.k)) { // adnotare: x: int = 5
          p++; test();
          if (ia('=')) { const v = listaTest(); return nod('assign', tk, { tinte: [e], v }, [v, e]); }
          return nod('pass', tk, {});
        }
        return nod('expr', tk, { e }, [e]);
      }
      const DESCR = { num: 'literal', str: 'literal', fstr: 'f-string expression', const: 'literal', call: 'function call', bin: 'expression', unary: 'expression', cmp: 'comparison', bool: 'expression', not: 'expression', ifexp: 'conditional expression', lambda: 'lambda', listcomp: 'list comprehension', dict: 'dict literal', set: 'set display', dictcomp: 'dict comprehension', setcomp: 'set comprehension', genexp: 'generator expression' };
      function verificaTinta(t, atrib, ce = 'assign to') {
        if (t.k === 'name') { if (t.id === '__debug__') greseala(t, 'cannot assign to __debug__'); return; }
        if (t.k === 'attr' || t.k === 'sub') return;
        if (t.k === 'tuple' || t.k === 'list') { t.els.forEach((x) => verificaTinta(x, atrib, ce)); return; }
        if (t.k === 'starred' && ce !== 'delete') { verificaTinta(t.e, atrib, ce); return; }
        let d = DESCR[t.k] || 'expression';
        if (t.k === 'const') d = t.v === null ? 'None' : t.v ? 'True' : 'False';
        greseala(t, `cannot ${ce} ${d}${atrib && ce === 'assign to' ? " here. Maybe you meant '==' instead of '='?" : ''}`);
      }
      function listaStea() { // testlist_star_expr
        const tk = T();
        const e = tinta1Test();
        if (!eOp(',')) return e;
        const l = [e];
        while (ia(',')) { if (!incepeExpr()) break; l.push(tinta1Test()); }
        return nod('tuple', tk, { els: l }, l);
      }
      function tinta1Test() { if (eOp('*')) { const tk = T(); p++; const e = sau(); return nod('starred', tk, { e }, [e]); } return test(); }
      function listaTest() {
        const tk = T();
        const e = test();
        if (!eOp(',')) return e;
        const l = [e];
        while (ia(',')) { if (!incepeExpr()) break; l.push(test()); }
        return nod('tuple', tk, { els: l }, l);
      }
      function test() {
        if (eKw('lambda')) return lambdaDef();
        const tk = T();
        const e = sau();
        if (eKw('if') ) {
          p++;
          const c = sau();
          if (!eKw('else')) greseala(T(), "expected 'else' after 'if' expression");
          p++;
          const b = test();
          return nod('ifexp', tk, { c, a: e, b }, [c, e, b]);
        }
        if (eOp(':=')) greseala(T(), 'operatorul := nu este disponibil în acest editor');
        return e;
      }
      function testFaraCond() { return eKw('lambda') ? lambdaDef() : sau(); }
      function lambdaDef() {
        const tk = T(); p++;
        const params = parametri(':');
        asteapta(':');
        const sf = inFunctie; inFunctie = 1;
        const corp = test();
        inFunctie = sf;
        const sc = scop(params.map((x) => x.name), []);
        return nod('lambda', tk, { params, corp, ...sc }, params.filter((x) => x.def).map((x) => x.def));
      }
      function sau() {
        const tk = T();
        let e = si();
        if (!eKw('or')) return e;
        const vals = [e];
        while (ia('or')) vals.push(si());
        return nod('bool', tk, { op: 'or', vals }, vals);
      }
      function si() {
        const tk = T();
        let e = nu();
        if (!eKw('and')) return e;
        const vals = [e];
        while (ia('and')) vals.push(nu());
        return nod('bool', tk, { op: 'and', vals }, vals);
      }
      function nu() {
        if (eKw('not')) { const tk = T(); p++; const e = nu(); return nod('not', tk, { e }, [e]); }
        return comparatie();
      }
      function opComp() {
        const t = T();
        if (t.t === 'op' && ['<', '>', '==', '>=', '<=', '!='].includes(t.v)) { p++; return t.v; }
        if (eKw('in')) { p++; return 'in'; }
        if (eKw('not') && U().t === 'name' && U().v === 'in') { p += 2; return 'not in'; }
        if (eKw('is')) { p++; if (ia('not')) return 'is not'; return 'is'; }
        return null;
      }
      function comparatie() {
        const tk = T();
        const e = sauBit();
        let op = opComp();
        if (!op) return e;
        const ops = [], vals = [e];
        while (op) { ops.push(op); vals.push(sauBit()); op = opComp(); }
        return nod('cmp', tk, { ops, vals }, vals);
      }
      const binar = (urm, ops) => () => {
        const tk = T();
        let e = urm();
        while (T().t === 'op' && ops.includes(T().v)) {
          const ot = T(); p++;
          if (T().t === 'NEWLINE' || T().t === 'EOF') greseala(T());
          const r = urm();
          e = nod('bin', ot, { op: ot.v, l: e, r }, [e, r]);
          e.line = tk.line;
        }
        return e;
      };
      function factor() {
        const t = T();
        if (t.t === 'op' && (t.v === '-' || t.v === '+' || t.v === '~')) { p++; const e = factor(); if (t.v === '-' && e.k === 'num' && !e.par) { const v = e.v; return nod('num', t, { v: v instanceof PyFloat ? fl(-v.v) : neg(v) }); } return nod('unary', t, { op: t.v, e }, [e]); }
        return putere();
      }
      function putere() {
        const tk = T();
        const e = primar();
        if (eOp('**')) { p++; const r = factor(); return nod('bin', tk, { op: '**', l: e, r }, [e, r]); }
        return e;
      }
      const termen = binar(factor, ['*', '/', '//', '%', '@']);
      const aritm = binar(termen, ['+', '-']);
      const depl = binar(aritm, ['<<', '>>']);
      const siBit = binar(depl, ['&']);
      const xorBit = binar(siBit, ['^']);
      const sauBit = binar(xorBit, ['|']);
      function primar() {
        let e = atom();
        for (;;) {
          const tk = T();
          if (eOp('(')) { p++; e = apel(e, tk); continue; }
          if (eOp('[')) { p++; const idx = indice(); asteapta(']'); e = nod('sub', tk, { e, idx }, [e, idx]); e.line = e.e.line; continue; }
          if (eOp('.')) { p++; const t = T(); if (t.t !== 'name') greseala(t); p++; e = nod('attr', tk, { e, name: t.v }, [e]); continue; }
          return e;
        }
      }
      function apel(f, tk) {
        const args = [], kw = [];
        while (!eOp(')')) {
          const ta = T();
          if (ia('*')) args.push({ e: test(), star: true });
          else if (ia('**')) kw.push({ e: test(), dstar: true });
          else if (T().t === 'name' && U().t === 'op' && U().v === '=' ) {
            const nm = T().v; p += 2;
            if (kw.some((k) => k.name === nm)) greseala(ta, `keyword argument repeated: ${nm}`);
            kw.push({ name: nm, e: test() });
          } else {
            const e = test();
            if (eKw('for')) { args.push({ e: compr('genexp', e, ta, ')') }); continue; }
            if (kw.length) greseala(ta, kw.some((k) => k.dstar) ? 'positional argument follows keyword argument unpacking' : 'positional argument follows keyword argument');
            args.push({ e });
          }
          if (!ia(',')) {
            if (!eOp(')') && incepeExpr()) greseala(ta, 'invalid syntax. Perhaps you forgot a comma?');
            break;
          }
        }
        asteapta(')');
        const c = nod('call', tk, { f, args, kw }, [f, ...args.map((a) => a.e), ...kw.map((k) => k.e)]);
        c.g = true; c.line = f.line;
        return c;
      }
      function indice() {
        const tk = T();
        const unu = () => {
          const t0 = T();
          let lo = null, hi = null, st = null;
          if (!eOp(':')) { lo = test(); if (!eOp(':')) return lo; }
          p++;
          if (!eOp(']') && !eOp(':') && !eOp(',')) hi = test();
          if (ia(':')) { if (!eOp(']') && !eOp(',')) st = test(); }
          return nod('slice', t0, { lo, hi, st }, [lo, hi, st]);
        };
        const e = unu();
        if (!eOp(',')) return e;
        const l = [e];
        while (ia(',')) { if (eOp(']')) break; l.push(unu()); }
        return nod('tuple', tk, { els: l }, l);
      }
      function compr(k, elt, tk, inchis, val = null) {
        const gens = [];
        while (eKw('for')) {
          p++;
          const t = tinte();
          verificaTinta(t, false);
          asteapta('in');
          const it = sau();
          const ifs = [];
          while (eKw('if')) { p++; ifs.push(testFaraCond()); }
          gens.push({ t, it, ifs });
        }
        if (!eOp(inchis)) greseala(T());
        const locs = new Set();
        const adauga = (t) => { if (t.k === 'name') locs.add(t.id); else if (t.k === 'tuple' || t.k === 'list') t.els.forEach(adauga); else if (t.k === 'starred') adauga(t.e); };
        gens.forEach((g) => adauga(g.t));
        const copii = [elt, val, ...gens.flatMap((g) => [g.it, ...g.ifs])];
        return nod(k, tk, { elt, val, gens, locs }, copii);
      }
      function sirTexte() {
        const tk = T();
        let parti = [], f = false;
        while (T().t === 'str' || T().t === 'fstr') {
          const t = T(); p++;
          if (t.t === 'fstr') { f = true; for (const x of t.v) parti.push(typeof x === 'string' ? x : fstrExpr(x)); } else parti.push(t.v);
        }
        if (!f) return nod('str', tk, { v: parti.join('') });
        const comb = [];
        for (const x of parti) if (typeof x === 'string' && typeof comb[comb.length - 1] === 'string') comb[comb.length - 1] += x; else comb.push(x);
        return nod('fstr', tk, { parti: comb }, comb.filter((x) => typeof x !== 'string').flatMap((x) => [x.e, ...(x.spec || []).filter((y) => typeof y !== 'string').map((y) => y.e)]));
      }
      function fstrExpr(x) {
        let sub;
        try { sub = lexeaza(`(${x.src})`); } catch (e) { if (e instanceof ErSintaxa) { e.rand = x.rand; e.mesaj = `f-string: ${e.mesaj}`; } throw e; }
        const sp = p, st = toks;
        const sub2 = sub.filter((t) => t.t !== 'NEWLINE' && t.t !== 'INDENT' && t.t !== 'DEDENT');
        for (const t of sub2) t.line = x.rand;
        const r = parseazaExpr(sub2);
        p = sp;
        void st;
        const spec = x.spec ? x.spec.map((y) => (typeof y === 'string' ? y : fstrExpr(y))) : null;
        return { e: r, conv: x.conv, spec, eq: x.eq };
      }
      function atom() {
        const t = T();
        switch (t.t) {
          case 'num': p++; return nod('num', t, { v: t.v });
          case 'str': case 'fstr': return sirTexte();
          case 'name':
            if (t.v === 'True' || t.v === 'False' || t.v === 'None') { p++; return nod('const', t, { v: t.v === 'None' ? null : t.v === 'True' }); }
            if (CUVINTE.has(t.v)) greseala(t);
            p++; return nod('name', t, { id: t.v });
          case 'op':
            if (t.v === '(') {
              p++;
              if (ia(')')) return nod('tuple', t, { els: [] });
              const e = tinta1Test();
              if (eKw('for')) { const g = compr('genexp', e, t, ')'); p++; return g; }
              if (ia(')')) { e.par = true; return e; }
              if (!eOp(',')) { if (incepeExpr()) greseala(t, 'invalid syntax. Perhaps you forgot a comma?'); greseala(T()); }
              const l = [e];
              while (ia(',')) { if (eOp(')')) break; l.push(tinta1Test()); if (!eOp(',') && !eOp(')') && incepeExpr()) greseala(t, 'invalid syntax. Perhaps you forgot a comma?'); }
              asteapta(')');
              const tu = nod('tuple', t, { els: l }, l); tu.par = true;
              if (l.some((x) => x.k === 'starred')) tu.g = true;
              return tu;
            }
            if (t.v === '[') {
              p++;
              const l = [];
              if (ia(']')) return nod('list', t, { els: l });
              const e = tinta1Test();
              if (eKw('for')) { const c = compr('listcomp', e, t, ']'); p++; return c; }
              l.push(e);
              while (ia(',')) { if (eOp(']')) break; l.push(tinta1Test()); }
              if (!eOp(']') && incepeExpr()) greseala(t, 'invalid syntax. Perhaps you forgot a comma?');
              asteapta(']');
              const li = nod('list', t, { els: l }, l);
              if (l.some((x) => x.k === 'starred')) li.g = true;
              return li;
            }
            if (t.v === '{') {
              p++;
              if (ia('}')) return nod('dict', t, { chei: [], vals: [] });
              const k = test();
              if (ia(':')) {
                const v = test();
                if (eKw('for')) { const c = compr('dictcomp', k, t, '}', v); p++; return c; }
                const chei = [k], vals = [v];
                while (ia(',')) { if (eOp('}')) break; chei.push(test()); asteapta(':'); vals.push(test()); }
                if (!eOp('}') && incepeExpr()) greseala(t, 'invalid syntax. Perhaps you forgot a comma?');
                asteapta('}');
                return nod('dict', t, { chei, vals }, [...chei, ...vals]);
              }
              if (eKw('for')) { const c = compr('setcomp', k, t, '}'); p++; return c; }
              const l = [k];
              while (ia(',')) { if (eOp('}')) break; l.push(test()); }
              asteapta('}');
              return nod('set', t, { els: l }, l);
            }
            if (t.v === '...') { p++; return nod('const', t, { v: null }); }
            break;
          default:
        }
        greseala(t);
      }
      function parseazaExpr(sub) {
        const salv = [toks, p];
        toks = sub; p = 0;
        try { const e = listaTest(); if (T().t !== 'EOF') greseala(T()); return e; } finally { [toks, p] = salv; }
      }
      // analiza variabilelor locale ale unei funcții (ca în Python: orice nume atribuit în funcție este local)
      function scop(params, corp) {
        const loc = new Set(params), glob = new Set(), nonl = new Set();
        const tg = (t) => { if (!t) return; if (t.k === 'name') loc.add(t.id); else if (t.k === 'tuple' || t.k === 'list') t.els.forEach(tg); else if (t.k === 'starred') tg(t.e); };
        const walk = (l) => {
          for (const s of l) {
            switch (s.k) {
              case 'assign': s.tinte.forEach(tg); break;
              case 'aug': tg(s.t); break;
              case 'for': tg(s.t); walk(s.corp); walk(s.altfel); break;
              case 'if': case 'while': walk(s.corp); walk(s.altfel); break;
              case 'def': case 'class': loc.add(s.name); break;
              case 'import': for (const x of s.l) loc.add(x.ca || x.nume.split('.')[0]); break;
              case 'from': if (s.l) for (const x of s.l) loc.add(x.ca || x.nume); break;
              case 'try': walk(s.corp); for (const h of s.h) { if (h.nume) loc.add(h.nume); walk(h.corp); } walk(s.altfel); if (s.fin) walk(s.fin); break;
              case 'global': s.names.forEach((x) => glob.add(x)); break;
              case 'nonlocal': s.names.forEach((x) => nonl.add(x)); break;
              case 'del': s.l.forEach(tg); break;
              default:
            }
          }
        };
        walk(corp);
        for (const g of glob) loc.delete(g);
        for (const g of nonl) loc.delete(g);
        return { locs: loc, globs: glob, nonl };
      }
      return { program, parseazaExpr };
    }
    function compileaza(src, suspecte = new Set()) {
      src = src.replace(/\r\n?/g, '\n');
      const toks = lexeaza(src);
      const ast = parseaza(toks).program();
      marcheazaSuspecte(ast, suspecte);
      return ast;
    }
    // o funcție este „suspectă” dacă poate cere date (input) sau poate aștepta (sleep), direct sau prin alte funcții:
    // doar acestea rulează pas cu pas prin generatoare; celelalte rulează direct (rapid, recursivitate adâncă)
    function marcheazaSuspecte(ast, suspecte) {
      const defs = [];
      const apeluri = (x, out) => {
        if (!x || typeof x !== 'object') return;
        if (Array.isArray(x)) { for (const y of x) apeluri(y, out); return; }
        if (x instanceof PyFloat || x instanceof Set) return;
        if (x.k === 'call') { if (x.f.k === 'name') out.add(x.f.id); else if (x.f.k === 'attr') out.add(x.f.name); }
        for (const v of Object.values(x)) if (v && typeof v === 'object') apeluri(v, out);
      };
      const cauta = (x) => {
        if (!x || typeof x !== 'object' || x instanceof PyFloat || x instanceof Set) return;
        if (Array.isArray(x)) { for (const y of x) cauta(y); return; }
        if (x.k === 'def' || x.k === 'lambda') { const c = new Set(); apeluri(x.corp, c); for (const p of x.params) apeluri(p.def, c); defs.push({ n: x, nume: x.k === 'def' ? x.name : null, c }); }
        for (const v of Object.values(x)) if (v && typeof v === 'object') cauta(v);
      };
      cauta(ast);
      const sus = new Set(['input', 'sleep', ...suspecte]);
      let schimbat = true;
      while (schimbat) {
        schimbat = false;
        for (const d of defs) if (!d.n.suspect && [...d.c].some((n) => sus.has(n))) { d.n.suspect = true; if (d.nume && !sus.has(d.nume)) { sus.add(d.nume); suspecte.add(d.nume); } schimbat = true; }
      }
    }

    // =====================================================================
    // OPERAȚII PE VALORI
    // =====================================================================
    const MAXS = 9007199254740991n;
    const nb = (b) => (b <= MAXS && b >= -MAXS ? Number(b) : b);
    const neg = (v) => (typeof v === 'bigint' ? nb(-v) : v === 0 ? 0 : -v);
    const nk = (v) => (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean' ? 1 : v instanceof PyFloat ? 2 : 0);
    const iv = (v) => (typeof v === 'boolean' ? +v : v);
    function bigF(b) { const x = Number(b); if (!Number.isFinite(x)) throw E('OverflowError', 'int too large to convert to float'); return x; }
    const fv = (v) => (v instanceof PyFloat ? v.v : typeof v === 'bigint' ? bigF(v) : +v);
    const eInt = (v) => typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean';

    function tn(v) {
      if (v === null) return 'NoneType';
      switch (typeof v) { case 'boolean': return 'bool'; case 'number': case 'bigint': return 'int'; case 'string': return 'str'; default: }
      if (v instanceof PyFloat) return 'float';
      if (v instanceof PyList) return 'list';
      if (v instanceof PyTuple) return 'tuple';
      if (v instanceof PyDict) return 'dict';
      if (v instanceof PySet) return 'set';
      if (v instanceof PyRange) return 'range';
      if (v instanceof PyFunc) return 'function';
      if (v instanceof PyBuiltin || v instanceof PyBound) return 'builtin_function_or_method';
      if (v instanceof PyModule) return 'module';
      if (v instanceof PyType) return 'type';
      if (v instanceof PyExcObj) return v.type.name;
      if (v instanceof PyIter) return v.kind;
      if (v instanceof PyView) return v.kind;
      if (v instanceof PyInst) return v.cls;
      if (v instanceof PyMetoda) return 'method';
      return 'object';
    }

    // ---------- excepții ----------
    const TIPURI = new Map();
    function tipExc(name, base) { const t = new PyType(name, base, (args) => new PyExcObj(t, args)); t.exc = true; TIPURI.set(name, t); return t; }
    const BaseException = tipExc('BaseException', null);
    const Exception = tipExc('Exception', BaseException);
    for (const [n, b] of [['ArithmeticError', 'Exception'], ['ZeroDivisionError', 'ArithmeticError'], ['OverflowError', 'ArithmeticError'], ['LookupError', 'Exception'],
      ['IndexError', 'LookupError'], ['KeyError', 'LookupError'], ['ValueError', 'Exception'], ['TypeError', 'Exception'], ['NameError', 'Exception'],
      ['UnboundLocalError', 'NameError'], ['AttributeError', 'Exception'], ['RuntimeError', 'Exception'], ['RecursionError', 'RuntimeError'], ['NotImplementedError', 'RuntimeError'],
      ['AssertionError', 'Exception'], ['ImportError', 'Exception'], ['ModuleNotFoundError', 'ImportError'], ['StopIteration', 'Exception'], ['EOFError', 'Exception'],
      ['KeyboardInterrupt', 'BaseException'], ['SystemExit', 'BaseException'], ['UnicodeError', 'ValueError'], ['OSError', 'Exception'], ['TurtleGraphicsError', 'Exception']]) tipExc(n, TIPURI.get(b));
    function E(tip, mesaj) {
      const o = new PyExcObj(TIPURI.get(tip), mesaj === undefined ? [] : [mesaj]);
      return o;
    }
    const subtip = (t, b) => { for (let x = t; x; x = x.base) if (x === b) return true; return false; };

    // ---------- reprezentarea ca text ----------
    function floatRepr(x) {
      if (x !== x) return 'nan';
      if (x === Infinity) return 'inf';
      if (x === -Infinity) return '-inf';
      if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
      let [mant, ex] = x.toExponential().split('e');
      const e = +ex, semn = mant[0] === '-' ? '-' : '';
      if (semn) mant = mant.slice(1);
      const cif = mant.replace('.', '');
      let o;
      if (e >= -4 && e < 16) {
        if (e < 0) o = `0.${'0'.repeat(-e - 1)}${cif}`;
        else if (cif.length <= e + 1) o = `${cif}${'0'.repeat(e + 1 - cif.length)}.0`;
        else o = `${cif.slice(0, e + 1)}.${cif.slice(e + 1)}`;
      } else o = `${cif[0]}${cif.length > 1 ? `.${cif.slice(1)}` : ''}e${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')}`;
      return semn + o;
    }
    function strRepr(s) {
      const q = s.includes("'") && !s.includes('"') ? '"' : "'";
      let o = q;
      for (const ch of s) {
        const c = ch.codePointAt(0);
        if (ch === '\\') o += '\\\\';
        else if (ch === q) o += `\\${q}`;
        else if (ch === '\n') o += '\\n';
        else if (ch === '\t') o += '\\t';
        else if (ch === '\r') o += '\\r';
        else if (c < 32 || c === 127) o += `\\x${c.toString(16).padStart(2, '0')}`;
        else o += ch;
      }
      return o + q;
    }
    function repr(v, vazut) {
      if (v === null) return 'None';
      switch (typeof v) {
        case 'boolean': return v ? 'True' : 'False';
        case 'number': return String(v);
        case 'bigint': return v.toString();
        case 'string': return strRepr(v);
        default:
      }
      if (v instanceof PyFloat) return floatRepr(v.v);
      if (v instanceof PyList || v instanceof PyTuple || v instanceof PyDict || v instanceof PySet) {
        vazut = vazut || new Set();
        if (vazut.has(v)) return v instanceof PyList ? '[...]' : v instanceof PyDict ? '{...}' : '(...)';
        vazut.add(v);
        let r;
        if (v instanceof PyList) r = `[${v.a.map((x) => repr(x, vazut)).join(', ')}]`;
        else if (v instanceof PyTuple) r = v.a.length === 1 ? `(${repr(v.a[0], vazut)},)` : `(${v.a.map((x) => repr(x, vazut)).join(', ')})`;
        else if (v instanceof PyDict) r = `{${[...v.m.values()].map(([k, x]) => `${repr(k, vazut)}: ${repr(x, vazut)}`).join(', ')}}`;
        else r = v.m.size ? `{${[...v.m.values()].map((x) => repr(x, vazut)).join(', ')}}` : 'set()';
        vazut.delete(v);
        return r;
      }
      if (v instanceof PyRange) return v.step === 1 ? `range(${v.start}, ${v.stop})` : `range(${v.start}, ${v.stop}, ${v.step})`;
      if (v instanceof PyFunc) return v.lambda ? `<function <lambda> at ${adresa(v)}>` : `<function ${v.name} at ${adresa(v)}>`;
      if (v instanceof PyBuiltin) return `<built-in function ${v.name}>`;
      if (v instanceof PyBound) return `<built-in method ${v.name} of ${tn(v.self)} object at ${adresa(v.self)}>`;
      if (v instanceof PyModule) return `<module '${v.name}' (built-in)>`;
      if (v instanceof PyType) return v.exc ? `<class '${v.name}'>` : v.modul ? `<class '${v.modul}.${v.name}'>` : `<class '${v.name}'>`;
      if (v instanceof PyExcObj) return `${v.type.name}(${v.args.map((x) => repr(x)).join(', ')})`;
      if (v instanceof PyIter) return `<${v.kind} object at ${adresa(v)}>`;
      if (v instanceof PyView) return `${v.kind}(${repr(new PyList(viewList(v)))})`;
      if (v instanceof PyMetoda) return `<bound method ${v.fn.name} of ${repr(v.self)}>`;
      if (v instanceof PyInst && v.clasa) { const m = metodaClasa(v.clasa, '__repr__'); if (m) return str(apelSync(m, [v])); return `<__main__.${v.cls} object at ${adresa(v)}>`; }
      if (v instanceof PyInst) return v.cls === 'Vec2D' ? `(${fmtSpec(v.d.get('x'), '.2f')},${fmtSpec(v.d.get('y'), '.2f')})` : `<turtle.${v.cls} object at ${adresa(v)}>`;
      return '<object>';
    }
    function str(v) {
      if (typeof v === 'string') return v;
      if (v instanceof PyInst && v.clasa) { const m = metodaClasa(v.clasa, '__str__'); if (m) { const r = apelSync(m, [v]); if (typeof r !== 'string') throw E('TypeError', `__str__ returned non-string (type ${tn(r)})`); return r; } }
      if (v instanceof PyExcObj) return v.args.length === 1 ? (v.type.name === 'KeyError' ? repr(v.args[0]) : str(v.args[0])) : v.args.length ? repr(new PyTuple(v.args)) : '';
      return repr(v);
    }

    // ---------- adevăr, egalitate, ordine, hash ----------
    function truthy(v) {
      if (v === null || v === false) return false;
      if (v === true) return true;
      switch (typeof v) { case 'number': return v !== 0; case 'bigint': return v !== 0n; case 'string': return v.length > 0; default: }
      if (v instanceof PyFloat) return v.v !== 0;
      if (v instanceof PyList || v instanceof PyTuple) return v.a.length > 0;
      if (v instanceof PyDict || v instanceof PySet) return v.m.size > 0;
      if (v instanceof PyRange) return lenRange(v) > 0;
      if (v instanceof PyView) return v.d.m.size > 0;
      return true;
    }
    function eq(a, b) {
      if (a === b) return !(a instanceof PyFloat && a.v !== a.v);
      const ka = nk(a), kb = nk(b);
      if (ka && kb) {
        const x = ka === 2 ? a.v : iv(a), y = kb === 2 ? b.v : iv(b);
        return x == y; // eslint-disable-line eqeqeq
      }
      if (typeof a === 'string' || typeof b === 'string') return false;
      if ((a instanceof PyList && b instanceof PyList) || (a instanceof PyTuple && b instanceof PyTuple)) {
        if (a.a.length !== b.a.length) return false;
        for (let i = 0; i < a.a.length; i++) if (!eq(a.a[i], b.a[i])) return false;
        return true;
      }
      if (a instanceof PyDict && b instanceof PyDict) {
        if (a.m.size !== b.m.size) return false;
        for (const [h, [, v]] of a.m) { const o = b.m.get(h); if (!o || !eq(v, o[1])) return false; }
        return true;
      }
      if (a instanceof PySet && b instanceof PySet) { if (a.m.size !== b.m.size) return false; for (const h of a.m.keys()) if (!b.m.has(h)) return false; return true; }
      if (a instanceof PyRange && b instanceof PyRange) return eq(new PyList(listaDin(a)), new PyList(listaDin(b)));
      if (a instanceof PyInst && b instanceof PyInst && a.cls === 'Vec2D' && b.cls === 'Vec2D') return eq(a.d.get('x'), b.d.get('x')) && eq(a.d.get('y'), b.d.get('y'));
      return false;
    }
    function nesuportat(op, a, b) { return E('TypeError', `'${op}' not supported between instances of '${tn(a)}' and '${tn(b)}'`); }
    function lt(a, b, op = '<') {
      const ka = nk(a), kb = nk(b);
      if (ka && kb) return (ka === 2 ? a.v : iv(a)) < (kb === 2 ? b.v : iv(b));
      if (typeof a === 'string' && typeof b === 'string') return a < b;
      if ((a instanceof PyList && b instanceof PyList) || (a instanceof PyTuple && b instanceof PyTuple)) {
        const n = Math.min(a.a.length, b.a.length);
        for (let i = 0; i < n; i++) if (!eq(a.a[i], b.a[i])) return lt(a.a[i], b.a[i], op);
        return a.a.length < b.a.length;
      }
      if (a instanceof PySet && b instanceof PySet) { if (a.m.size >= b.m.size) return false; for (const h of a.m.keys()) if (!b.m.has(h)) return false; return true; }
      throw nesuportat(op, a, b);
    }
    function le(a, b, op = '<=') {
      const ka = nk(a), kb = nk(b);
      if (ka && kb) return (ka === 2 ? a.v : iv(a)) <= (kb === 2 ? b.v : iv(b));
      if (typeof a === 'string' && typeof b === 'string') return a <= b;
      if ((a instanceof PyList && b instanceof PyList) || (a instanceof PyTuple && b instanceof PyTuple) || (a instanceof PySet && b instanceof PySet)) return lt(a, b, op) || eq(a, b);
      throw nesuportat(op, a, b);
    }
    function gt(a, b) { try { return lt(b, a, '>'); } catch (e) { if (e instanceof PyExcObj && e.type.name === 'TypeError') throw nesuportat('>', a, b); throw e; } }
    function ge(a, b) { try { return le(b, a, '>='); } catch (e) { if (e instanceof PyExcObj && e.type.name === 'TypeError') throw nesuportat('>=', a, b); throw e; } }
    function hk(v) {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return `s${v}`;
      if (typeof v === 'boolean') return +v;
      if (v === null) return 'N';
      if (typeof v === 'bigint') return `b${v}`;
      if (v instanceof PyFloat) return Number.isInteger(v.v) && Number.isSafeInteger(v.v) ? v.v : Number.isInteger(v.v) ? `b${BigInt(v.v)}` : `f${v.v}`;
      if (v instanceof PyTuple) return `t(${v.a.map(hk).join(',')})`;
      if (v instanceof PyList || v instanceof PyDict || v instanceof PySet) throw E('TypeError', `unhashable type: '${tn(v)}'`);
      if (v.id === undefined) v.id = ++nrObiecte;
      return `o${v.id}`;
    }
    function cmpop(op, a, b) {
      switch (op) {
        case '==': return eq(a, b);
        case '!=': return !eq(a, b);
        case '<': return lt(a, b);
        case '>': return gt(a, b);
        case '<=': return le(a, b);
        case '>=': return ge(a, b);
        case 'in': return contine(b, a);
        case 'not in': return !contine(b, a);
        case 'is': return identic(a, b);
        case 'is not': return !identic(a, b);
        default: throw E('TypeError', op);
      }
    }
    const identic = (a, b) => a === b || (eInt(a) && eInt(b) && typeof a === typeof b && a === b);
    function contine(c, x) {
      if (typeof c === 'string') { if (typeof x !== 'string') throw E('TypeError', `'in <string>' requires string as left operand, not ${tn(x)}`); return c.includes(x); }
      if (c instanceof PyList || c instanceof PyTuple) { for (const y of c.a) if (y === x || eq(y, x)) return true; return false; }
      if (c instanceof PyDict || c instanceof PySet) return c.m.has(hk(x));
      if (c instanceof PyView) { if (c.kind === 'dict_keys') return c.d.m.has(hk(x)); for (const y of iterOf(c)) if (eq(y, x)) return true; return false; }
      if (c instanceof PyRange) { if (!eInt(x)) { for (const y of iterOf(c)) if (eq(y, x)) return true; return false; } const i = iv(x); if (c.step > 0 ? !(i >= c.start && i < c.stop) : !(i <= c.start && i > c.stop)) return false; return (BigInt(i) - BigInt(c.start)) % BigInt(c.step) === 0n; }
      if (c instanceof PyIter) { for (const y of iterOf(c)) if (eq(y, x)) return true; return false; }
      throw E('TypeError', `argument of type '${tn(c)}' is not iterable`);
    }

    // ---------- aritmetică ----------
    function intop(op, a, b) {
      switch (op) {
        case '+': if (typeof a === 'number' && typeof b === 'number') { const r = a + b; if (Number.isSafeInteger(r)) return r; } return nb(BigInt(a) + BigInt(b));
        case '-': if (typeof a === 'number' && typeof b === 'number') { const r = a - b; if (Number.isSafeInteger(r)) return r; } return nb(BigInt(a) - BigInt(b));
        case '*': if (typeof a === 'number' && typeof b === 'number') { const r = a * b; if (Number.isSafeInteger(r)) return r === 0 ? 0 : r; } return nb(BigInt(a) * BigInt(b));
        case '/': if (b == 0) throw E('ZeroDivisionError', 'division by zero'); return fl(typeof a === 'number' && typeof b === 'number' ? a / b : impartireMare(BigInt(a), BigInt(b))); // eslint-disable-line eqeqeq
        case '//': {
          if (b == 0) throw E('ZeroDivisionError', 'integer division or modulo by zero'); // eslint-disable-line eqeqeq
          if (typeof a === 'number' && typeof b === 'number') { const r = a % b; let q = (a - r) / b; if (r !== 0 && (r < 0) !== (b < 0)) q -= 1; return q === 0 ? 0 : q; }
          const A = BigInt(a), B = BigInt(b); let q = A / B; if (A % B !== 0n && ((A < 0n) !== (B < 0n))) q -= 1n; return nb(q);
        }
        case '%': {
          if (b == 0) throw E('ZeroDivisionError', 'integer modulo by zero'); // eslint-disable-line eqeqeq
          if (typeof a === 'number' && typeof b === 'number') { let r = a % b; if (r !== 0 && (r < 0) !== (b < 0)) r += b; return r === 0 ? 0 : r; }
          const A = BigInt(a), B = BigInt(b); let r = A % B; if (r !== 0n && ((r < 0n) !== (B < 0n))) r += B; return nb(r);
        }
        case '**': {
          if (b < 0) { if (a == 0) throw E('ZeroDivisionError', 'zero to a negative power'); return fl(Math.pow(fv(a), fv(b))); } // eslint-disable-line eqeqeq
          if (typeof a === 'number' && typeof b === 'number') { const r = a ** b; if (Number.isSafeInteger(r) && Math.abs(r) < 2 ** 52) return r; }
          if (typeof b === 'bigint' || (Math.abs(Number(a)) > 1 && b > 2000000)) throw E('OverflowError', 'numărul rezultat este prea mare');
          return nb(BigInt(a) ** BigInt(b));
        }
        case '<<': if (b < 0) throw E('ValueError', 'negative shift count'); return nb(BigInt(a) << BigInt(b));
        case '>>': if (b < 0) throw E('ValueError', 'negative shift count'); return nb(BigInt(a) >> BigInt(b));
        case '&': return nb(BigInt(a) & BigInt(b));
        case '|': return nb(BigInt(a) | BigInt(b));
        case '^': return nb(BigInt(a) ^ BigInt(b));
        default: throw E('TypeError', `unsupported operand type(s) for ${op}: 'int' and 'int'`);
      }
    }
    function impartireMare(A, B) { // A/B corect pentru întregi mari
      const x = Number(A), y = Number(B);
      if (Number.isFinite(x) && Number.isFinite(y)) return x / y;
      const neg2 = (A < 0n) !== (B < 0n); if (A < 0n) A = -A; if (B < 0n) B = -B;
      const sc = BigInt(Math.max(0, B.toString().length - A.toString().length + 20));
      const q = (A * 10n ** sc) / B;
      const r = Number(`${q}e-${sc}`);
      if (!Number.isFinite(r)) throw E('OverflowError', 'integer division result too large for a float');
      return neg2 ? -r : r;
    }
    function floatop(op, a, b) {
      switch (op) {
        case '+': return fl(a + b);
        case '-': return fl(a - b);
        case '*': return fl(a * b);
        case '/': if (b === 0) throw E('ZeroDivisionError', 'float division by zero'); return fl(a / b);
        case '//': { if (b === 0) throw E('ZeroDivisionError', 'float floor division by zero'); let m = a % b; if (m && (m < 0) !== (b < 0)) m += b; return fl(Math.round((a - m) / b) === (a - m) / b ? (a - m) / b : Math.floor(a / b)); }
        case '%': { if (b === 0) throw E('ZeroDivisionError', 'float modulo by zero'); let m = a % b; if (m && (m < 0) !== (b < 0)) m += b; else if (!m) m = b < 0 ? -0 : 0; return fl(m); }
        case '**': {
          if (a === 0 && b < 0) throw E('ZeroDivisionError', 'zero to a negative power');
          if (a < 0 && !Number.isInteger(b)) throw E('ValueError', 'rezultatul ar fi un număr complex (putere fracționară dintr-un număr negativ)');
          const r = Math.pow(a, b);
          if (!Number.isFinite(r) && Number.isFinite(a) && Number.isFinite(b)) throw E('OverflowError', "(34, 'Numerical result out of range')");
          return fl(r);
        }
        default: throw E('TypeError', `unsupported operand type(s) for ${op}: 'float' and 'float'`);
      }
    }
    function binop(op, a, b) {
      const ka = nk(a), kb = nk(b);
      if (ka && kb) {
        if (ka === 1 && kb === 1) return intop(op, iv(a), iv(b));
        if (['<<', '>>', '&', '|', '^'].includes(op)) throw E('TypeError', `unsupported operand type(s) for ${op}: '${tn(a)}' and '${tn(b)}'`);
        return floatop(op, fv(a), fv(b));
      }
      switch (op) {
        case '+':
          if (typeof a === 'string') { if (typeof b === 'string') { const r = a + b; if (r.length > 50000000) throw E('MemoryError'); return r; } throw E('TypeError', `can only concatenate str (not "${tn(b)}") to str`); }
          if (a instanceof PyList) { if (b instanceof PyList) return new PyList(a.a.concat(b.a)); throw E('TypeError', `can only concatenate list (not "${tn(b)}") to list`); }
          if (a instanceof PyTuple) { if (b instanceof PyTuple) return new PyTuple(a.a.concat(b.a)); throw E('TypeError', `can only concatenate tuple (not "${tn(b)}") to tuple`); }
          break;
        case '*': {
          let s = null, n = null;
          if (ka === 1 && !kb) { s = b; n = a; } else if (kb === 1 && !ka) { s = a; n = b; }
          if (s !== null && (typeof s === 'string' || s instanceof PyList || s instanceof PyTuple)) {
            let k = Number(iv(n)); if (k < 0) k = 0;
            const len = typeof s === 'string' ? s.length : s.a.length;
            if (len * k > 50000000) throw E('MemoryError', 'rezultatul ar fi prea mare');
            if (typeof s === 'string') return s.repeat(k);
            const r = []; for (let i = 0; i < k; i++) r.push(...s.a);
            return s instanceof PyList ? new PyList(r) : new PyTuple(r);
          }
          if ((typeof a === 'string' || a instanceof PyList || a instanceof PyTuple) && !(typeof b === 'string' || b instanceof PyList || b instanceof PyTuple)) throw E('TypeError', `can't multiply sequence by non-int of type '${tn(b)}'`);
          if ((typeof b === 'string' || b instanceof PyList || b instanceof PyTuple)) throw E('TypeError', `can't multiply sequence by non-int of type '${tn(a)}'`);
          break;
        }
        case '%': if (typeof a === 'string') return procent(a, b); break;
        case '|': case '&': case '-': case '^':
          if (a instanceof PySet && b instanceof PySet) {
            const r = new PySet();
            if (op === '|') { for (const [h, x] of a.m) r.m.set(h, x); for (const [h, x] of b.m) r.m.set(h, x); } else if (op === '&') { for (const [h, x] of a.m) if (b.m.has(h)) r.m.set(h, x); } else if (op === '-') { for (const [h, x] of a.m) if (!b.m.has(h)) r.m.set(h, x); } else { for (const [h, x] of a.m) if (!b.m.has(h)) r.m.set(h, x); for (const [h, x] of b.m) if (!a.m.has(h)) r.m.set(h, x); }
            return r;
          }
          if (op === '|' && a instanceof PyDict && b instanceof PyDict) { const r = new PyDict(); for (const [h, x] of a.m) r.m.set(h, x); for (const [h, x] of b.m) r.m.set(h, x); return r; }
          break;
        default:
      }
      throw E('TypeError', `unsupported operand type(s) for ${op}: '${tn(a)}' and '${tn(b)}'`);
    }
    function unop(op, v) {
      const k = nk(v);
      if (op === '-') { if (k === 1) return neg(iv(v)); if (k === 2) return fl(-v.v); }
      if (op === '+') { if (k === 1) return iv(v); if (k === 2) return v; }
      if (op === '~' && k === 1) return nb(~BigInt(iv(v)));
      throw E('TypeError', `bad operand type for unary ${op}: '${tn(v)}'`);
    }

    // ---------- iterare, lungime, indexare ----------
    function lenRange(r) {
      const { start: a, stop: b, step: s } = r;
      if (typeof a === 'number' && typeof b === 'number' && typeof s === 'number') return s > 0 ? Math.max(0, Math.ceil((b - a) / s)) : Math.max(0, Math.ceil((a - b) / -s));
      const A = BigInt(a), B = BigInt(b), St = BigInt(s);
      let n = St > 0n ? (B - A + St - 1n) / St : (A - B - St - 1n) / -St;
      if (n < 0n) n = 0n;
      return nb(n);
    }
    function* iterRange(r) {
      const { start: a, stop: b, step: s } = r;
      if (typeof a === 'number' && typeof b === 'number' && typeof s === 'number' && Math.abs(b) < 2 ** 52 && Math.abs(a) < 2 ** 52) {
        if (s > 0) for (let i = a; i < b; i += s) yield i; else for (let i = a; i > b; i += s) yield i;
        return;
      }
      const B = BigInt(b), St = BigInt(s);
      if (St > 0n) for (let i = BigInt(a); i < B; i += St) yield nb(i); else for (let i = BigInt(a); i > B; i += St) yield nb(i);
    }
    function* iterLista(l) { for (let i = 0; i < l.a.length; i++) yield l.a[i]; }
    function* iterStr(s) { for (let i = 0; i < s.length; i++) yield s[i]; }
    function viewList(v) { const d = v.d; return v.kind === 'dict_keys' ? [...d.m.values()].map((x) => x[0]) : v.kind === 'dict_values' ? [...d.m.values()].map((x) => x[1]) : [...d.m.values()].map((x) => new PyTuple([x[0], x[1]])); }
    function iterOf(v) {
      if (v instanceof PyList) return iterLista(v);
      if (v instanceof PyTuple) return v.a[Symbol.iterator]();
      if (typeof v === 'string') return iterStr(v);
      if (v instanceof PyRange) return iterRange(v);
      if (v instanceof PyDict) return [...v.m.values()].map((x) => x[0])[Symbol.iterator]();
      if (v instanceof PySet) return [...v.m.values()][Symbol.iterator]();
      if (v instanceof PyIter) return v.it;
      if (v instanceof PyView) return viewList(v)[Symbol.iterator]();
      throw E('TypeError', `'${tn(v)}' object is not iterable`);
    }
    function listaDin(v) {
      if (v instanceof PyList || v instanceof PyTuple) return v.a.slice();
      if (typeof v === 'string') return v.split('');
      const r = [];
      for (const x of iterOf(v)) { r.push(x); if ((r.length & 65535) === 0) tick(); }
      return r;
    }
    function len(v) {
      if (typeof v === 'string') return v.length;
      if (v instanceof PyList || v instanceof PyTuple) return v.a.length;
      if (v instanceof PyDict || v instanceof PySet) return v.m.size;
      if (v instanceof PyRange) return lenRange(v);
      if (v instanceof PyView) return v.d.m.size;
      throw E('TypeError', `object of type '${tn(v)}' has no len()`);
    }
    function indexInt(i, ce) {
      if (typeof i === 'number') return i;
      if (typeof i === 'boolean') return +i;
      if (typeof i === 'bigint') return Number(i);
      throw E('TypeError', ce(tn(i)));
    }
    function normIdx(i, n, ce) {
      let k = i < 0 ? i + n : i;
      if (k < 0 || k >= n) throw E('IndexError', ce);
      return k;
    }
    function idxSlice(n, lo, hi, st) {
      const cv = (x) => (x === null ? null : indexInt(x, () => 'slice indices must be integers or None or have an __index__ method'));
      lo = cv(lo); hi = cv(hi); st = st === null ? 1 : cv(st);
      if (st === 0) throw E('ValueError', 'slice step cannot be zero');
      if (st > 0) { lo = lo === null ? 0 : lo < 0 ? Math.max(0, lo + n) : Math.min(lo, n); hi = hi === null ? n : hi < 0 ? Math.max(0, hi + n) : Math.min(hi, n); } else { lo = lo === null ? n - 1 : lo < 0 ? Math.max(-1, lo + n) : Math.min(lo, n - 1); hi = hi === null ? -1 : hi < 0 ? Math.max(-1, hi + n) : Math.min(hi, n - 1); }
      return [lo, hi, st];
    }
    function felie(o, sl) {
      const n = typeof o === 'string' ? o.length : o instanceof PyRange ? Number(lenRange(o)) : o.a ? o.a.length : -1;
      if (n < 0) throw E('TypeError', `'${tn(o)}' object is not subscriptable`);
      const [lo, hi, st] = idxSlice(n, sl.lo, sl.hi, sl.st);
      if (typeof o === 'string') { if (st === 1) return o.slice(lo, Math.max(lo, hi)); let r = ''; for (let i = lo; st > 0 ? i < hi : i > hi; i += st) r += o[i]; return r; }
      const src = o instanceof PyRange ? listaDin(o) : o.a;
      const r = [];
      if (st === 1) r.push(...src.slice(lo, Math.max(lo, hi))); else for (let i = lo; st > 0 ? i < hi : i > hi; i += st) r.push(src[i]);
      return o instanceof PyTuple ? new PyTuple(r) : new PyList(r);
    }
    class Felie { constructor(lo, hi, st) { this.lo = lo; this.hi = hi; this.st = st; } }
    function getitem(o, i) {
      if (i instanceof Felie) return felie(o, i);
      if (o instanceof PyList) return o.a[normIdx(indexInt(i, (t) => `list indices must be integers or slices, not ${t}`), o.a.length, 'list index out of range')];
      if (typeof o === 'string') return o[normIdx(indexInt(i, (t) => `string indices must be integers, not '${t}'`), o.length, 'string index out of range')];
      if (o instanceof PyTuple) return o.a[normIdx(indexInt(i, (t) => `tuple indices must be integers or slices, not ${t}`), o.a.length, 'tuple index out of range')];
      if (o instanceof PyDict) { const x = o.m.get(hk(i)); if (!x) { const e = E('KeyError', i); throw e; } return x[1]; }
      if (o instanceof PyRange) { const n = Number(lenRange(o)); const k = normIdx(indexInt(i, (t) => `range indices must be integers or slices, not ${t}`), n, 'range object index out of range'); return intop('+', o.start, intop('*', k, o.step)); }
      if (o instanceof PyType && (o.name === 'list' || o.name === 'dict' || o.name === 'tuple')) return o;
      throw E('TypeError', `'${tn(o)}' object is not subscriptable`);
    }
    function setitem(o, i, v) {
      if (o instanceof PyList) {
        if (i instanceof Felie) {
          const [lo, hi, st] = idxSlice(o.a.length, i.lo, i.hi, i.st);
          const nou = listaDin(v);
          if (st === 1) { o.a.splice(lo, Math.max(0, hi - lo), ...nou); return; }
          const idx = []; for (let k = lo; st > 0 ? k < hi : k > hi; k += st) idx.push(k);
          if (idx.length !== nou.length) throw E('ValueError', `attempt to assign sequence of size ${nou.length} to extended slice of size ${idx.length}`);
          idx.forEach((k, j) => { o.a[k] = nou[j]; });
          return;
        }
        o.a[normIdx(indexInt(i, (t) => `list indices must be integers or slices, not ${t}`), o.a.length, 'list assignment index out of range')] = v; return;
      }
      if (o instanceof PyDict) { const h = hk(i); const x = o.m.get(h); if (x) x[1] = v; else o.m.set(h, [i, v]); return; }
      throw E('TypeError', `'${tn(o)}' object does not support item assignment`);
    }
    function delitem(o, i) {
      if (o instanceof PyList) {
        if (i instanceof Felie) { const [lo, hi, st] = idxSlice(o.a.length, i.lo, i.hi, i.st); if (st === 1) { o.a.splice(lo, Math.max(0, hi - lo)); return; } const idx = []; for (let k = lo; st > 0 ? k < hi : k > hi; k += st) idx.push(k); idx.sort((a, b) => b - a).forEach((k) => o.a.splice(k, 1)); return; }
        o.a.splice(normIdx(indexInt(i, (t) => `list indices must be integers or slices, not ${t}`), o.a.length, 'list assignment index out of range'), 1); return;
      }
      if (o instanceof PyDict) { const h = hk(i); if (!o.m.has(h)) throw E('KeyError', i); o.m.delete(h); return; }
      throw E('TypeError', `'${tn(o)}' object doesn't support item deletion`);
    }

    // ---------- formatarea numerelor (exact, ca în Python) ----------
    const dv = new DataView(new ArrayBuffer(8));
    function zecimalExact(x) { // x > 0 finit: x = N · 10^-k exact
      dv.setFloat64(0, x);
      const hi = dv.getUint32(0), lo = dv.getUint32(4);
      let e = (hi >>> 20) & 0x7ff;
      let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
      if (e === 0) e = 1; else m |= 1n << 52n;
      const e2 = e - 1075;
      if (e2 >= 0) return { N: m << BigInt(e2), k: 0 };
      return { N: m * 5n ** BigInt(-e2), k: -e2 };
    }
    const P10 = (n) => 10n ** BigInt(n);
    function rotunjeste(N, cate) { // N / 10^cate, rotunjit la par
      if (cate <= 0) return N * P10(-cate);
      const d = P10(cate), q = N / d, r = N % d, r2 = r * 2n;
      return r2 > d || (r2 === d && (q & 1n)) ? q + 1n : q;
    }
    function cuZecimale(a, p) { // a ≥ 0
      if (a === 0) return p > 0 ? `0.${'0'.repeat(p)}` : '0';
      const { N, k } = zecimalExact(a);
      let s = rotunjeste(N, k - p).toString();
      if (p > 0) { s = s.padStart(p + 1, '0'); s = `${s.slice(0, -p)}.${s.slice(-p)}`; }
      return s;
    }
    function cifreSemnif(a, P) {
      const { N, k } = zecimalExact(a);
      const L = N.toString().length;
      let exp = L - 1 - k;
      const q = rotunjeste(N, L - P);
      let cif = q.toString();
      if (cif.length > P) { exp++; cif = cif.slice(0, P); }
      return { cif, exp };
    }
    const expStr = (e) => `e${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')}`;
    function stiintific(a, p) {
      if (a === 0) return `${p > 0 ? `0.${'0'.repeat(p)}` : '0'}e+00`;
      const { cif, exp } = cifreSemnif(a, p + 1);
      return `${cif[0]}${p > 0 ? `.${cif.slice(1)}` : ''}${expStr(exp)}`;
    }
    function general(a, P, alt, tipGol) {
      if (P === 0) P = 1;
      if (a === 0) return tipGol ? '0.0' : alt ? `0.${'0'.repeat(P - 1)}` : '0';
      const { cif, exp } = cifreSemnif(a, P);
      let s;
      if (exp < -4 || exp >= P) {
        let m = cif.length > 1 ? `${cif[0]}.${cif.slice(1)}` : cif;
        if (!alt && m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, '');
        s = m + expStr(exp);
      } else {
        if (exp >= 0) s = cif.length > exp + 1 ? `${cif.slice(0, exp + 1)}.${cif.slice(exp + 1)}` : cif.padEnd(exp + 1, '0');
        else s = `0.${'0'.repeat(-exp - 1)}${cif}`;
        if (!alt && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
        if (tipGol && !s.includes('.')) s += '.0';
      }
      return s;
    }
    function grupeaza(s, sep) {
      const [ip, ...rest] = s.split('.');
      const g = ip.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      return [g, ...rest].join('.');
    }
    function fmtSpec(v, spec) {
      if (v instanceof PyInst && v.cls === 'Vec2D') v = repr(v);
      if (!spec) return str(v);
      const m = /^(?:([\s\S])?([<>=^]))?([+\- ])?(z)?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec);
      if (!m) throw E('ValueError', `Invalid format specifier '${spec}' for object of type '${tn(v)}'`);
      let [, fill, align, semn, , alt, zero, latime, grup, prec, tip] = m;
      latime = latime ? +latime : 0; prec = prec != null ? +prec : null;
      if (zero && !align) { fill = '0'; align = '='; }
      fill = fill || ' ';
      let corp, prefix = '', numeric = false;
      const k = nk(v);
      if (!k || (typeof v === 'boolean' && !tip)) {
        if (tip && tip !== 's') throw E('ValueError', `Unknown format code '${tip}' for object of type '${tn(v)}'`);
        corp = str(v);
        if (prec != null) corp = corp.slice(0, prec);
        align = align || '<';
      } else {
        numeric = true;
        let negativ;
        if (k === 1 && (!tip || 'bcdoxXn'.includes(tip))) {
          if (prec != null) throw E('ValueError', 'Precision not allowed in integer format specifier');
          let x = BigInt(iv(v)); negativ = x < 0n; if (negativ) x = -x;
          if (tip === 'c') corp = String.fromCodePoint(Number(x));
          else if (tip === 'b') { corp = x.toString(2); if (alt) prefix = '0b'; } else if (tip === 'o') { corp = x.toString(8); if (alt) prefix = '0o'; } else if (tip === 'x') { corp = x.toString(16); if (alt) prefix = '0x'; } else if (tip === 'X') { corp = x.toString(16).toUpperCase(); if (alt) prefix = '0X'; } else corp = x.toString();
        } else {
          if (k === 1 && tip === 's') throw E('ValueError', `Unknown format code 's' for object of type 'int'`);
          const x = fv(v); negativ = x < 0 || Object.is(x, -0); const a = Math.abs(x);
          if (!Number.isFinite(a)) corp = a !== a ? 'nan' : 'inf';
          else switch (tip) {
            case 'f': case 'F': corp = cuZecimale(a, prec ?? 6); if (alt && !corp.includes('.')) corp += '.'; break;
            case 'e': case 'E': corp = stiintific(a, prec ?? 6); break;
            case 'g': case 'G': corp = general(a, prec ?? 6, alt); break;
            case '%': corp = `${cuZecimale(a * 100, prec ?? 6)}%`; break;
            default: corp = prec == null ? (k === 2 ? floatRepr(a) : String(a)) : general(a, prec, alt, true);
          }
          if (tip && 'FEG'.includes(tip)) corp = corp.toUpperCase();
          if (negativ && v instanceof PyFloat && m[4] && Number(corp.replace(/[^0-9]/g, '')) === 0) negativ = false;
        }
        if (grup) corp = grupeaza(corp, grup);
        prefix = (negativ ? '-' : semn === '+' ? '+' : semn === ' ' ? ' ' : '') + prefix;
        align = align || '>';
      }
      const tot = prefix + corp;
      if (tot.length >= latime) return tot;
      const pad = latime - tot.length;
      if (align === '<') return tot + fill.repeat(pad);
      if (align === '>') return fill.repeat(pad) + tot;
      if (align === '^') return fill.repeat(Math.floor(pad / 2)) + tot + fill.repeat(pad - Math.floor(pad / 2));
      if (align === '=') { if (!numeric) throw E('ValueError', "'=' alignment not allowed in string format specifier"); return prefix + fill.repeat(pad) + corp; }
      return tot;
    }
    function procent(fmt, args) {
      const lista = args instanceof PyTuple ? args.a : [args];
      let k = 0, folosit = false;
      const ia = () => { if (k >= lista.length) throw E('TypeError', 'not enough arguments for format string'); folosit = true; return lista[k++]; };
      const r = fmt.replace(/%(\(([^)]*)\))?([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?([diouxXeEfFgGcrsa%])/g, (tot, _n, nume, flags, lat, prec, t) => {
        if (t === '%') return '%';
        let v;
        if (nume != null) { if (!(args instanceof PyDict)) throw E('TypeError', 'format requires a mapping'); v = getitem(args, nume); folosit = true; } else {
          if (lat === '*') lat = String(ia());
          if (prec === '*') prec = String(ia());
          v = ia();
        }
        let spec = '';
        if (flags.includes('-')) spec += '<'; else if (flags.includes('0') && 'diouxXeEfFgG'.includes(t)) spec += '0=';
        if (flags.includes('+')) spec += '+'; else if (flags.includes(' ')) spec += ' ';
        if (flags.includes('#')) spec += '#';
        if (spec.startsWith('0=')) spec = `0>${spec.slice(2)}`;
        if (lat) spec += lat;
        if (t === 's' || t === 'r' || t === 'a') { const s = t === 's' ? str(v) : repr(v); return fmtSpec(prec != null ? s.slice(0, +prec) : s, spec.replace(/^0>/, '') || ''); }
        if ('diu'.includes(t)) {
          if (!nk(v)) throw E('TypeError', `%${t} format: a real number is required, not ${tn(v)}`);
          const x = nk(v) === 2 ? toInt(v) : iv(v);
          return fmtSpec(x, `${spec.startsWith('0>') ? `0${spec.slice(2)}` : spec}d`);
        }
        if (t === 'c') return typeof v === 'string' ? v : String.fromCodePoint(Number(iv(v)));
        if (!nk(v)) throw E('TypeError', `must be real number, not ${tn(v)}`);
        const sp = spec.startsWith('0>') ? `0${spec.slice(2)}` : spec;
        return fmtSpec('oxX'.includes(t) ? iv(nk(v) === 2 ? toInt(v) : v) : v, `${sp}${prec != null ? `.${prec}` : ''}${t}`);
      });
      if (!folosit && !(args instanceof PyTuple && args.a.length === 0) && !(args instanceof PyDict) && k < lista.length) throw E('TypeError', 'not all arguments converted during string formatting');
      if (k < lista.length && !(args instanceof PyDict)) throw E('TypeError', 'not all arguments converted during string formatting');
      return r;
    }
    function toInt(v) { // float → int (trunchiere)
      const x = v.v;
      if (!Number.isFinite(x)) throw E(x !== x ? 'ValueError' : 'OverflowError', x !== x ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer');
      const t = Math.trunc(x);
      return Number.isSafeInteger(t) ? (t === 0 ? 0 : t) : nb(BigInt(t));
    }
    function formatStr(fmt, args, kw) { // str.format
      let auto = 0;
      let r = '';
      for (let i = 0; i < fmt.length; i++) {
        const c = fmt[i];
        if (c === '{' && fmt[i + 1] === '{') { r += '{'; i++; continue; }
        if (c === '}' && fmt[i + 1] === '}') { r += '}'; i++; continue; }
        if (c === '}') throw E('ValueError', "Single '}' encountered in format string");
        if (c !== '{') { r += c; continue; }
        let j = i + 1, ad = 0;
        for (; j < fmt.length; j++) { if (fmt[j] === '{') ad++; else if (fmt[j] === '}') { if (!ad) break; ad--; } }
        if (j >= fmt.length) throw E('ValueError', "expected '}' before end of string");
        let camp = fmt.slice(i + 1, j);
        i = j;
        let spec = '', conv = null;
        const dp = camp.indexOf(':'); if (dp >= 0) { spec = camp.slice(dp + 1); camp = camp.slice(0, dp); }
        const ex = camp.indexOf('!'); if (ex >= 0) { conv = camp[ex + 1]; camp = camp.slice(0, ex); }
        spec = spec.replace(/\{([^{}]*)\}/g, (t, n) => str(n === '' ? args[auto++] : /^\d+$/.test(n) ? args[+n] : kw?.get(n)));
        const m = /^([^.[]*)(.*)$/.exec(camp);
        let v;
        if (m[1] === '') { if (auto >= args.length) throw E('IndexError', `Replacement index ${auto} out of range for positional args tuple`); v = args[auto++]; } else if (/^\d+$/.test(m[1])) { if (+m[1] >= args.length) throw E('IndexError', `Replacement index ${m[1]} out of range for positional args tuple`); v = args[+m[1]]; } else { if (!kw || !kw.has(m[1])) throw E('KeyError', m[1]); v = kw.get(m[1]); }
        for (const a of m[2].matchAll(/\.(\w+)|\[([^\]]*)\]/g)) v = a[1] ? getattr(v, a[1]) : getitem(v, /^\d+$/.test(a[2]) ? +a[2] : a[2]);
        if (conv === 'r') v = repr(v); else if (conv === 's') v = str(v);
        r += fmtSpec(v, spec);
      }
      return r;
    }

    // =====================================================================
    // EXECUȚIA (generatoare: se pot opri la input / sleep / pas cu pas)
    // =====================================================================
    const BRK = 1, CNT = 2, RET = 3;
    function tick() {
      S.urm = S.pasi + 4000;
      const t = Date.now();
      if (t - S.t0 > MAX_TIMP) throw new Oprire(`programul a fost oprit pentru că rulează de peste ${MAX_TIMP / 1000} secunde fără să se termine`, S.stack.length ? S.stack[S.stack.length - 1].line : null);
      if (t - S.tFlush > 40) { S.tFlush = t; S.gazda.flush?.(); }
    }
    function scrie(s, k = 'o') {
      if (!s) return;
      S.lungIesire += s.length;
      if (S.lungIesire > MAX_IESIRE) throw new Oprire('programul a afișat prea mult text (peste 2 000 000 de caractere) și a fost oprit', S.stack.length ? S.stack[S.stack.length - 1].line : null);
      S.gazda.scrie(s, k);
    }
    function lookup(name, f) {
      if (f.loc) {
        if (f.locs.has(name)) {
          const v = f.loc.get(name);
          if (v === undefined) throw E('UnboundLocalError', `cannot access local variable '${name}' where it is not associated with a value`);
          return v;
        }
        for (let e = f.enc; e; e = e.enc) {
          if (e.loc && e.locs.has(name)) { const v = e.loc.get(name); if (v !== undefined) return v; throw E('NameError', `cannot access free variable '${name}' where it is not associated with a value in enclosing scope`); }
        }
      }
      let v = f.glob.get(name);
      if (v !== undefined) return v;
      v = BUILTINS.get(name);
      if (v !== undefined) return v;
      throw eroareNume(name, f);
    }
    function eroareNume(name, f) {
      const cand = new Set([...f.glob.keys(), ...BUILTINS.keys()]);
      for (let e = f; e; e = e.enc) if (e.loc) for (const k of e.loc.keys()) cand.add(k);
      let msg = `name '${name}' is not defined`;
      const sug = sugestie(name, cand);
      if (sug) msg += `. Did you mean: '${sug}'?`;
      else if (MODULE_STD.has(name)) msg += `. Did you forget to import '${name}'?`;
      const e = E('NameError', msg);
      e.nume = name;
      return e;
    }
    function sugestie(name, candidati) { // ca în Python 3.13: distanța Levenshtein cu cost mai mic pentru literă mare/mică
      let best = null, bc = Infinity;
      for (const c of candidati) {
        if (c === name || c.startsWith('__')) continue;
        const maxc = (name.length + c.length + 3) * 2 / 6;
        const d = distanta(name, c, maxc);
        if (d <= maxc && d < bc) { bc = d; best = c; }
      }
      return best;
    }
    function distanta(a, b, max) {
      if (Math.abs(a.length - b.length) * 2 > max) return Infinity;
      const m = a.length, n = b.length;
      let prev = Array.from({ length: n + 1 }, (_, j) => j * 2);
      for (let i = 1; i <= m; i++) {
        const cur = [i * 2];
        for (let j = 1; j <= n; j++) {
          const sub = a[i - 1] === b[j - 1] ? 0 : a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 1 : 2;
          cur[j] = Math.min(prev[j] + 2, cur[j - 1] + 2, prev[j - 1] + sub);
        }
        prev = cur;
      }
      return prev[n];
    }
    function setName(name, v, f) {
      if (f.loc) {
        if (f.locs.has(name)) { f.loc.set(name, v); return; }
        if (f.nonl && f.nonl.has(name)) { for (let e = f.enc; e; e = e.enc) if (e.loc && e.locs.has(name)) { e.loc.set(name, v); return; } }
      }
      f.glob.set(name, v);
    }
    function delName(name, f) {
      if (f.loc && f.locs.has(name)) { if (f.loc.get(name) === undefined) throw E('UnboundLocalError', `cannot access local variable '${name}' where it is not associated with a value`); f.loc.delete(name); return; }
      if (!f.glob.has(name)) throw eroareNume(name, f);
      f.glob.delete(name);
    }

    function augop(op, a, b) {
      if (op === '+' && a instanceof PyList) { a.a.push(...listaDin(b)); return a; } // += pe listă modifică lista
      return binop(op, a, b);
    }
    const felieSync = (e, f) => new Felie(e.lo ? val(e.lo, f) : null, e.hi ? val(e.hi, f) : null, e.st ? val(e.st, f) : null);
    function val(e, f) {
      switch (e.k) {
        case 'num': case 'str': case 'const': return e.v;
        case 'name': return lookup(e.id, f);
        case 'bin': return binop(e.op, val(e.l, f), val(e.r, f));
        case 'cmp': {
          let a = val(e.vals[0], f);
          for (let i = 0; i < e.ops.length; i++) { const b = val(e.vals[i + 1], f); if (!cmpop(e.ops[i], a, b)) return false; a = b; }
          return true;
        }
        case 'unary': return unop(e.op, val(e.e, f));
        case 'not': return !truthy(val(e.e, f));
        case 'bool': {
          let v = null;
          if (e.op === 'and') { for (const x of e.vals) { v = val(x, f); if (!truthy(v)) return v; } return v; }
          for (const x of e.vals) { v = val(x, f); if (truthy(v)) return v; }
          return v;
        }
        case 'ifexp': return truthy(val(e.c, f)) ? val(e.a, f) : val(e.b, f);
        case 'attr': return getattr(val(e.e, f), e.name);
        case 'sub': return getitem(val(e.e, f), e.idx.k === 'slice' ? felieSync(e.idx, f) : val(e.idx, f));
        case 'tuple': return new PyTuple(e.els.map((x) => val(x, f)));
        case 'list': return new PyList(e.els.map((x) => val(x, f)));
        case 'lambda': return faLambda(e, f, e.params.filter((p) => p.def).map((p) => val(p.def, f)));
        default: return ruleazaSync(gval(e, f));
      }
    }
    // evaluarea completă (generator: poate apela funcții, input etc.)
    function faLambda(e, f, defs) {
      let k = 0;
      const params = e.params.map((p) => ({ name: p.name, star: p.star, dstar: p.dstar, kwonly: p.kwonly, def: p.def ? defs[k++] : undefined }));
      return new PyFunc({ name: '<lambda>', suspect: e.suspect, lambda: true, params, corp: e.corp, locs: e.locs, nonl: e.nonl, glob: f.glob, enc: f.loc ? f : null, src: S.srcCurent, fisier: S.fisierCurent, line: e.line });
    }
    function legaParam(fn, args, kw) {
      const loc = new Map();
      const ps = fn.params, nume = fn.name;
      let k = 0;
      const poz = ps.filter((p) => !p.star && !p.dstar && !p.kwonly);
      const stea = ps.find((p) => p.star), dstea = ps.find((p) => p.dstar);
      for (const p of poz) { if (k < args.length) loc.set(p.name, args[k++]); }
      if (k < args.length) {
        if (stea) { loc.set(stea.name, new PyTuple(args.slice(k))); k = args.length; } else {
          const min = poz.filter((p) => p.def === undefined).length;
          const cat = min === poz.length ? `${poz.length}` : `from ${min} to ${poz.length}`;
          throw E('TypeError', `${nume}() takes ${cat} positional argument${poz.length === 1 && min === poz.length ? '' : 's'} but ${args.length} ${args.length === 1 ? 'was' : 'were'} given`);
        }
      } else if (stea) loc.set(stea.name, new PyTuple([]));
      let dict = null;
      if (dstea) { dict = new PyDict(); loc.set(dstea.name, dict); }
      if (kw) for (const [n, v] of kw) {
        const p = ps.find((x) => x.name === n && !x.star && !x.dstar);
        if (!p) { if (dict) { dict.m.set(hk(n), [n, v]); continue; } throw E('TypeError', `${nume}() got an unexpected keyword argument '${n}'`); }
        if (loc.has(n) && p !== stea) throw E('TypeError', `${nume}() got multiple values for argument '${n}'`);
        loc.set(n, v);
      }
      const lipsa = [];
      for (const p of ps) { if (p.star || p.dstar || loc.has(p.name)) continue; if (p.def !== undefined) loc.set(p.name, p.def); else lipsa.push(p.name); }
      if (lipsa.length) {
        const l = lipsa.map((x) => `'${x}'`);
        const t = l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
        throw E('TypeError', `${nume}() missing ${lipsa.length} required positional argument${lipsa.length > 1 ? 's' : ''}: ${t}`);
      }
      return loc;
    }
    // <generatoare>
    function* execBloc(l, f) {
      for (let i = 0; i < l.length; i++) { const r = yield* exec(l[i], f); if (r) return r; }
      return 0;
    }
    function* exec(s, f) {
      f.line = s.line;
      if (++S.pasi > S.urm) tick();
      if (S.dbg) yield { t: 'pas', line: s.line, ad: S.stack.length };
      switch (s.k) {
        case 'expr': {
          const v = s.e.g ? yield* gval(s.e, f) : val(s.e, f);
          if (s.afis && v !== null) { scrie(`${repr(v)}\n`); f.glob.set('_', v); }
          return 0;
        }
        case 'assign': {
          const v = s.v.g ? yield* gval(s.v, f) : val(s.v, f);
          for (const t of s.tinte) {
            if (t.k === 'name') setName(t.id, v, f); else yield* atribuie(t, v, f);
          }
          return 0;
        }
        case 'aug': return yield* execAug(s, f);
        case 'if': {
          const c = s.c.g ? yield* gval(s.c, f) : val(s.c, f);
          if (truthy(c)) return yield* execBloc(s.corp, f);
          if (s.altfel.length) return yield* execBloc(s.altfel, f);
          return 0;
        }
        case 'while': return yield* execWhile(s, f);
        case 'for': return yield* execFor(s, f);
        case 'break': return BRK;
        case 'continue': return CNT;
        case 'pass': return 0;
        case 'return': f.ret = s.v ? (s.v.g ? yield* gval(s.v, f) : val(s.v, f)) : null; return RET;
        case 'def': return yield* execDef(s, f);
        case 'class': return yield* execClass(s, f);
        case 'global': case 'nonlocal': return 0;
        case 'import': return yield* execImport(s, f);
        case 'from': return yield* execFrom(s, f);
        case 'del': return yield* execDel(s, f);
        case 'assert': return yield* execAssert(s, f);
        case 'raise': return yield* execRaise(s, f);
        case 'try': return yield* execTry(s, f);
        default: throw E('RuntimeError', `instrucțiune necunoscută: ${s.k}`);
      }
    }
    function* execAug(s, f) {
      const t = s.t;
      if (t.k === 'name') {
        const a = lookup(t.id, f);
        const b = s.v.g ? yield* gval(s.v, f) : val(s.v, f);
        setName(t.id, augop(s.op, a, b), f);
      } else if (t.k === 'sub') {
        const o = yield* gval(t.e, f);
        const i = t.idx.k === 'slice' ? yield* gfelie(t.idx, f) : yield* gval(t.idx, f);
        const a = getitem(o, i);
        const b = yield* gval(s.v, f);
        setitem(o, i, augop(s.op, a, b));
      } else {
        const o = yield* gval(t.e, f);
        const a = getattr(o, t.name);
        const b = yield* gval(s.v, f);
        setattr(o, t.name, augop(s.op, a, b));
      }
      return 0;
    }
    function* execWhile(s, f) {
      let prima = true;
      for (;;) {
        if (!prima) { f.line = s.line; if (++S.pasi > S.urm) tick(); if (S.dbg) yield { t: 'pas', line: s.line, ad: S.stack.length }; }
        prima = false;
        const c = s.c.g ? yield* gval(s.c, f) : val(s.c, f);
        if (!truthy(c)) break;
        const r = yield* execBloc(s.corp, f);
        if (r === BRK) return 0;
        if (r === RET) return r;
      }
      if (s.altfel.length) return yield* execBloc(s.altfel, f);
      return 0;
    }
    function* execFor(s, f) {
      const it = s.it.g ? yield* gval(s.it, f) : val(s.it, f);
      const simplu = s.t.k === 'name';
      const iter = iterOf(it);
      let prima = true;
      for (const x of iter) {
        if (!prima) { f.line = s.line; if (++S.pasi > S.urm) tick(); if (S.dbg) yield { t: 'pas', line: s.line, ad: S.stack.length }; }
        prima = false;
        if (simplu) setName(s.t.id, x, f); else yield* atribuie(s.t, x, f);
        const r = yield* execBloc(s.corp, f);
        if (r === BRK) return 0;
        if (r === RET) return r;
      }
      if (s.altfel.length) return yield* execBloc(s.altfel, f);
      return 0;
    }
    function* execDef(s, f) {
      const defs = [];
      for (const p of s.params) if (p.def) defs.push(p.def.g ? yield* gval(p.def, f) : val(p.def, f));
      let k = 0;
      const params = s.params.map((p) => ({ name: p.name, star: p.star, dstar: p.dstar, kwonly: p.kwonly, def: p.def ? defs[k++] : undefined }));
      setName(s.name, new PyFunc({ name: s.name, suspect: s.suspect, params, corp: s.corp, locs: s.locs, nonl: s.nonl, glob: f.glob, enc: f.clasa ? f.enc : f.loc ? f : null, src: S.srcCurent, fisier: S.fisierCurent, line: s.line }), f);
      return 0;
    }
    function* execClass(s, f) {
      const baze = [];
      for (const b of s.baze) { const v = yield* gval(b, f); if (!(v instanceof PyType)) throw E('TypeError', 'clasa de bază trebuie să fie o clasă'); baze.push(v); }
      const t = new PyType(s.name, baze[0] || null, null);
      t.user = true; t.d = new Map();
      if (baze.some((b) => b.exc)) { t.exc = true; t.make = (a) => new PyExcObj(t, a); }
      const cf = { name: s.name, loc: t.d, locs: s.locs, glob: f.glob, enc: f.loc ? f : null, line: s.line, clasa: true, src: f.src, fisier: f.fisier };
      yield* execBloc(s.corp, cf);
      f.line = s.line;
      setName(s.name, t, f);
      return 0;
    }
    function* execImport(s, f) {
      for (const x of s.l) {
        const m = importa(x.nume);
        setName(x.ca || x.nume.split('.')[0], m, f);
      }
      return 0;
    }
    function* execFrom(s, f) {
      const m = importa(s.mod);
      if (s.toate) { for (const [k, v] of m.d) if (!k.startsWith('_')) setName(k, v, f); return 0; }
      for (const x of s.l) {
        const v = m.d.get(x.nume);
        if (v === undefined) throw E('ImportError', `cannot import name '${x.nume}' from '${s.mod}' (unknown location)`);
        setName(x.ca || x.nume, v, f);
      }
      return 0;
    }
    function* execDel(s, f) {
      for (const t of s.l) {
        if (t.k === 'name') delName(t.id, f);
        else if (t.k === 'sub') { const o = yield* gval(t.e, f); delitem(o, t.idx.k === 'slice' ? yield* gfelie(t.idx, f) : yield* gval(t.idx, f)); } else if (t.k === 'tuple' || t.k === 'list') { for (const x of t.els) yield* exec({ k: 'del', l: [x], line: s.line }, f); } else throw E('TypeError', 'cannot delete');
      }
      return 0;
    }
    function* execAssert(s, f) {
      if (!truthy(yield* gval(s.c, f))) { const e = new PyExcObj(TIPURI.get('AssertionError'), s.m ? [yield* gval(s.m, f)] : []); throw e; }
      return 0;
    }
    function* execRaise(s, f) {
      if (!s.e) { if (S.exCurenta) throw S.exCurenta; throw E('RuntimeError', 'No active exception to reraise'); }
      let v = yield* gval(s.e, f);
      if (v instanceof PyType && v.exc) v = new PyExcObj(v, []);
      if (!(v instanceof PyExcObj)) throw E('TypeError', 'exceptions must derive from BaseException');
      v.tb = null;
      throw v;
    }
    function* execTry(s, f) {
      let r = 0;
      try {
        let prinsa = false;
        try { r = yield* execBloc(s.corp, f); } catch (err0) {
          let err = err0;
          if (err instanceof RangeError) err = E('RecursionError', 'maximum recursion depth exceeded');
          if (!(err instanceof PyExcObj)) throw err;
          if (!err.tb) err.tb = traceback();
          for (const h of s.h) {
            let potr = !h.tip;
            if (h.tip) {
              f.line = h.line;
              const t = yield* gval(h.tip, f);
              const lista = t instanceof PyTuple ? t.a : [t];
              for (const x of lista) { if (!(x instanceof PyType && x.exc)) throw E('TypeError', 'catching classes that do not inherit from BaseException is not allowed'); if (subtip(err.type, x)) potr = true; }
            }
            if (!potr) continue;
            prinsa = true;
            if (h.nume) setName(h.nume, err, f);
            const veche = S.exCurenta; S.exCurenta = err;
            try { r = yield* execBloc(h.corp, f); } finally { S.exCurenta = veche; }
            break;
          }
          if (!prinsa) throw err;
          return r;
        }
        if (!r && s.altfel.length) r = yield* execBloc(s.altfel, f);
        return r;
      } finally {
        if (s.fin) { const r2 = yield* execBloc(s.fin, f); if (r2) return r2; } // eslint-disable-line no-unsafe-finally
      }
    }
    function* atribuie(t, v, f) {
      switch (t.k) {
        case 'name': setName(t.id, v, f); return;
        case 'tuple': case 'list': {
          const l = listaDin(v);
          const si = t.els.findIndex((x) => x.k === 'starred');
          if (si < 0) {
            if (l.length > t.els.length) throw E('ValueError', `too many values to unpack (expected ${t.els.length})`);
            if (l.length < t.els.length) throw E('ValueError', `not enough values to unpack (expected ${t.els.length}, got ${l.length})`);
            for (let i = 0; i < l.length; i++) yield* atribuie(t.els[i], l[i], f);
          } else {
            const dupa = t.els.length - si - 1;
            if (l.length < t.els.length - 1) throw E('ValueError', `not enough values to unpack (expected at least ${t.els.length - 1}, got ${l.length})`);
            for (let i = 0; i < si; i++) yield* atribuie(t.els[i], l[i], f);
            yield* atribuie(t.els[si].e, new PyList(l.slice(si, l.length - dupa)), f);
            for (let i = 0; i < dupa; i++) yield* atribuie(t.els[si + 1 + i], l[l.length - dupa + i], f);
          }
          return;
        }
        case 'sub': {
          const o = yield* gval(t.e, f);
          const i = t.idx.k === 'slice' ? yield* gfelie(t.idx, f) : yield* gval(t.idx, f);
          setitem(o, i, v); return;
        }
        case 'attr': setattr(yield* gval(t.e, f), t.name, v); return;
        case 'starred': throw E('SyntaxError', 'starred assignment target must be in a list or tuple');
        default: throw E('SyntaxError', 'cannot assign');
      }
    }
    function* gfelie(e, f) { return new Felie(e.lo ? yield* gval(e.lo, f) : null, e.hi ? yield* gval(e.hi, f) : null, e.st ? yield* gval(e.st, f) : null); }

    // evaluarea rapidă (expresii fără apeluri de funcții)
    function* gval(e, f) {
      switch (e.k) {
        case 'call': return yield* gapel(e, f);
        case 'listcomp': case 'setcomp': case 'dictcomp': case 'genexp': return yield* comprehensiune(e, f);
        case 'dict': case 'set': case 'fstr': return yield* gColectie(e, f);
        default:
      }
      if (!e.g) return val(e, f);
      switch (e.k) {
        case 'bin': return yield* gBin(e, f);
        case 'cmp': return yield* gCmp(e, f);
        case 'attr': return getattr(yield* gval(e.e, f), e.name);
        case 'sub': return yield* gSub(e, f);
        default: return yield* gAlte(e, f);
      }
    }
    function* gBin(e, f) { const a = yield* gval(e.l, f); return binop(e.op, a, yield* gval(e.r, f)); }
    function* gCmp(e, f) {
      let a = yield* gval(e.vals[0], f);
      for (let i = 0; i < e.ops.length; i++) { const b = yield* gval(e.vals[i + 1], f); if (!cmpop(e.ops[i], a, b)) return false; a = b; }
      return true;
    }
    function* gSub(e, f) { const o = yield* gval(e.e, f); return getitem(o, e.idx.k === 'slice' ? yield* gfelie(e.idx, f) : yield* gval(e.idx, f)); }
    function* gColectie(e, f) {
      if (e.k === 'dict') {
        const d = new PyDict();
        for (let i = 0; i < e.chei.length; i++) { const k = yield* gval(e.chei[i], f); const v = yield* gval(e.vals[i], f); const h = hk(k); const x = d.m.get(h); if (x) x[1] = v; else d.m.set(h, [k, v]); }
        return d;
      }
      if (e.k === 'set') { const s = new PySet(); for (const x of e.els) { const v = yield* gval(x, f); s.m.set(hk(v), v); } return s; }
      let r = '';
      for (const p of e.parti) r += typeof p === 'string' ? p : yield* fpart(p, f);
      return r;
    }
    function* gAlte(e, f) {
      switch (e.k) {
        case 'unary': return unop(e.op, yield* gval(e.e, f));
        case 'not': return !truthy(yield* gval(e.e, f));
        case 'bool': {
          let v = null;
          if (e.op === 'and') { for (const x of e.vals) { v = yield* gval(x, f); if (!truthy(v)) return v; } return v; }
          for (const x of e.vals) { v = yield* gval(x, f); if (truthy(v)) return v; }
          return v;
        }
        case 'ifexp': return truthy(yield* gval(e.c, f)) ? yield* gval(e.a, f) : yield* gval(e.b, f);
        case 'tuple': case 'list': {
          const l = [];
          for (const x of e.els) { if (x.k === 'starred') l.push(...listaDin(yield* gval(x.e, f))); else l.push(yield* gval(x, f)); }
          return e.k === 'tuple' ? new PyTuple(l) : new PyList(l);
        }
        case 'lambda': { const d = []; for (const p of e.params) if (p.def) d.push(yield* gval(p.def, f)); return faLambda(e, f, d); }
        case 'starred': throw E('SyntaxError', "can't use starred expression here");
        default: throw E('RuntimeError', `expresie necunoscută: ${e.k}`);
      }
    }
    function* fpart(p, f) {
      let v = yield* gval(p.e, f);
      let spec = '';
      if (p.spec) for (const x of p.spec) spec += typeof x === 'string' ? x : yield* fpart(x, f);
      if (p.conv === 'r' || (p.eq && !p.conv && !spec)) v = repr(v); else if (p.conv === 's') v = str(v); else if (p.conv === 'a') v = repr(v);
      return (p.eq || '') + fmtSpec(v, spec);
    }
    function* comprehensiune(e, f) {
      const cf = { name: '<listcomp>', loc: new Map(), locs: e.locs, glob: f.glob, enc: f.loc ? f : null, line: e.line };
      const prim = yield* gval(e.gens[0].it, f);
      const out = e.k === 'dictcomp' ? new PyDict() : e.k === 'setcomp' ? new PySet() : [];
      let nr = 0;
      const rec = function* (i, it) {
        const g = e.gens[i];
        for (const x of iterOf(it)) {
          if ((++nr & 4095) === 0) tick();
          if (g.t.k === 'name') cf.loc.set(g.t.id, x); else yield* atribuie(g.t, x, cf);
          let ok = true;
          for (const c of g.ifs) if (!truthy(c.g ? yield* gval(c, cf) : val(c, cf))) { ok = false; break; }
          if (!ok) continue;
          if (i + 1 < e.gens.length) { yield* rec(i + 1, yield* gval(e.gens[i + 1].it, cf)); continue; }
          if (e.k === 'dictcomp') { const k = yield* gval(e.elt, cf); const v = yield* gval(e.val, cf); const h = hk(k); const o = out.m.get(h); if (o) o[1] = v; else out.m.set(h, [k, v]); } else {
            const v = e.elt.g ? yield* gval(e.elt, cf) : val(e.elt, cf);
            if (e.k === 'setcomp') out.m.set(hk(v), v); else out.push(v);
          }
        }
      };
      yield* rec(0, prim);
      if (e.k === 'listcomp') return new PyList(out);
      if (e.k === 'genexp') return new PyIter('generator', out[Symbol.iterator]());
      return out;
    }
    function* gapel(e, f) {
      const fn = yield* gval(e.f, f);
      const args = [];
      for (const a of e.args) { const v = yield* gval(a.e, f); if (a.star) args.push(...listaDin(v)); else args.push(v); }
      let kw = null;
      if (e.kw.length) {
        kw = new Map();
        for (const k of e.kw) {
          const v = yield* gval(k.e, f);
          if (k.dstar) { if (!(v instanceof PyDict)) throw E('TypeError', 'argument after ** must be a mapping'); for (const [kk, vv] of v.m.values()) kw.set(str(kk), vv); } else kw.set(k.name, v);
        }
      }
      f.line = e.line;
      if (fn instanceof PyFunc && !S.dbg && !fn.suspect) return apelUtilizatorS(fn, args, kw);
      return yield* apeleaza(fn, args, kw);
    }
    function* apeleaza(fn, args, kw) {
      // funcțiile care nu pot cere date (input/sleep) rulează sincron: e mai rapid și permite recursivitate adâncă
      if (fn instanceof PyFunc) return S.dbg || fn.suspect ? yield* apelUtilizator(fn, args, kw) : apelUtilizatorS(fn, args, kw);
      if (fn instanceof PyBuiltin) return fn.gen ? yield* apelGen(fn, args, kw) : fn.fn(args, kw);
      if (fn instanceof PyBound) return fn.gen ? yield* apelGen(fn, args, kw) : fn.fn(fn.self, args, kw);
      if (fn instanceof PyMetoda) return S.dbg || fn.fn.suspect ? yield* apelUtilizator(fn.fn, [fn.self, ...args], kw) : apelUtilizatorS(fn.fn, [fn.self, ...args], kw);
      if (fn instanceof PyType && fn.user && !fn.exc) {
        const o = new PyInst(fn.name, new Map()); o.clasa = fn;
        const init = metodaClasa(fn, '__init__');
        if (init) yield* apeleaza(init, [o, ...args], kw); else if (args.length) throw E('TypeError', `${fn.name}() takes no arguments`);
        return o;
      }
      if (fn instanceof PyType) return fn.make(args, kw);
      throw E('TypeError', `'${tn(fn)}' object is not callable`);
    }
    function* apelGen(fn, args, kw) { return fn instanceof PyBound ? yield* fn.gen(fn.self, args, kw) : yield* fn.gen(args, kw); }
    function* apelUtilizator(fn, args, kw) {
      if (S.stack.length >= MAX_ADANCIME) throw E('RecursionError', 'maximum recursion depth exceeded');
      const loc = legaParam(fn, args, kw);
      const fr = { name: fn.name, loc, locs: fn.locs, nonl: fn.nonl, glob: fn.glob, enc: fn.enc, line: fn.line, src: fn.src, fisier: fn.fisier, ret: null };
      S.stack.push(fr);
      try {
        if (fn.lambda) return yield* gval(fn.corp, fr);
        const r = yield* execBloc(fn.corp, fr);
        return r === RET ? fr.ret : null;
      } catch (err) {
        if (err instanceof PyExcObj && !err.tb) err.tb = traceback();
        if (err instanceof RangeError) { const e2 = E('RecursionError', 'maximum recursion depth exceeded'); e2.tb = traceback(); throw e2; }
        throw err;
      } finally { S.stack.pop(); }
    }
    // </generatoare>
    // <sincron> (generat automat de gen-sync.py din partea cu generatoare: aceeași execuție, fără pauze)
    function execBlocS(l, f) {
      for (let i = 0; i < l.length; i++) { const r = execS(l[i], f); if (r) return r; }
      return 0;
    }
    function execS(s, f) {
      f.line = s.line;
      if (++S.pasi > S.urm) tick();
      switch (s.k) {
        case 'expr': {
          const v = s.e.g ? gvalS(s.e, f) : val(s.e, f);
          if (s.afis && v !== null) { scrie(`${repr(v)}\n`); f.glob.set('_', v); }
          return 0;
        }
        case 'assign': {
          const v = s.v.g ? gvalS(s.v, f) : val(s.v, f);
          for (const t of s.tinte) {
            if (t.k === 'name') setName(t.id, v, f); else atribuieS(t, v, f);
          }
          return 0;
        }
        case 'aug': return execAugS(s, f);
        case 'if': {
          const c = s.c.g ? gvalS(s.c, f) : val(s.c, f);
          if (truthy(c)) return execBlocS(s.corp, f);
          if (s.altfel.length) return execBlocS(s.altfel, f);
          return 0;
        }
        case 'while': return execWhileS(s, f);
        case 'for': return execForS(s, f);
        case 'break': return BRK;
        case 'continue': return CNT;
        case 'pass': return 0;
        case 'return': f.ret = s.v ? (s.v.g ? gvalS(s.v, f) : val(s.v, f)) : null; return RET;
        case 'def': return execDefS(s, f);
        case 'class': return execClassS(s, f);
        case 'global': case 'nonlocal': return 0;
        case 'import': return execImportS(s, f);
        case 'from': return execFromS(s, f);
        case 'del': return execDelS(s, f);
        case 'assert': return execAssertS(s, f);
        case 'raise': return execRaiseS(s, f);
        case 'try': return execTryS(s, f);
        default: throw E('RuntimeError', `instrucțiune necunoscută: ${s.k}`);
      }
    }
    function execAugS(s, f) {
      const t = s.t;
      if (t.k === 'name') {
        const a = lookup(t.id, f);
        const b = s.v.g ? gvalS(s.v, f) : val(s.v, f);
        setName(t.id, augop(s.op, a, b), f);
      } else if (t.k === 'sub') {
        const o = gvalS(t.e, f);
        const i = t.idx.k === 'slice' ? gfelieS(t.idx, f) : gvalS(t.idx, f);
        const a = getitem(o, i);
        const b = gvalS(s.v, f);
        setitem(o, i, augop(s.op, a, b));
      } else {
        const o = gvalS(t.e, f);
        const a = getattr(o, t.name);
        const b = gvalS(s.v, f);
        setattr(o, t.name, augop(s.op, a, b));
      }
      return 0;
    }
    function execWhileS(s, f) {
      let prima = true;
      for (;;) {
        if (!prima) { f.line = s.line; if (++S.pasi > S.urm) tick(); }
        prima = false;
        const c = s.c.g ? gvalS(s.c, f) : val(s.c, f);
        if (!truthy(c)) break;
        const r = execBlocS(s.corp, f);
        if (r === BRK) return 0;
        if (r === RET) return r;
      }
      if (s.altfel.length) return execBlocS(s.altfel, f);
      return 0;
    }
    function execForS(s, f) {
      const it = s.it.g ? gvalS(s.it, f) : val(s.it, f);
      const simplu = s.t.k === 'name';
      const iter = iterOf(it);
      let prima = true;
      for (const x of iter) {
        if (!prima) { f.line = s.line; if (++S.pasi > S.urm) tick(); }
        prima = false;
        if (simplu) setName(s.t.id, x, f); else atribuieS(s.t, x, f);
        const r = execBlocS(s.corp, f);
        if (r === BRK) return 0;
        if (r === RET) return r;
      }
      if (s.altfel.length) return execBlocS(s.altfel, f);
      return 0;
    }
    function execDefS(s, f) {
      const defs = [];
      for (const p of s.params) if (p.def) defs.push(p.def.g ? gvalS(p.def, f) : val(p.def, f));
      let k = 0;
      const params = s.params.map((p) => ({ name: p.name, star: p.star, dstar: p.dstar, kwonly: p.kwonly, def: p.def ? defs[k++] : undefined }));
      setName(s.name, new PyFunc({ name: s.name, suspect: s.suspect, params, corp: s.corp, locs: s.locs, nonl: s.nonl, glob: f.glob, enc: f.clasa ? f.enc : f.loc ? f : null, src: S.srcCurent, fisier: S.fisierCurent, line: s.line }), f);
      return 0;
    }
    function execClassS(s, f) {
      const baze = [];
      for (const b of s.baze) { const v = gvalS(b, f); if (!(v instanceof PyType)) throw E('TypeError', 'clasa de bază trebuie să fie o clasă'); baze.push(v); }
      const t = new PyType(s.name, baze[0] || null, null);
      t.user = true; t.d = new Map();
      if (baze.some((b) => b.exc)) { t.exc = true; t.make = (a) => new PyExcObj(t, a); }
      const cf = { name: s.name, loc: t.d, locs: s.locs, glob: f.glob, enc: f.loc ? f : null, line: s.line, clasa: true, src: f.src, fisier: f.fisier };
      execBlocS(s.corp, cf);
      f.line = s.line;
      setName(s.name, t, f);
      return 0;
    }
    function execImportS(s, f) {
      for (const x of s.l) {
        const m = importa(x.nume);
        setName(x.ca || x.nume.split('.')[0], m, f);
      }
      return 0;
    }
    function execFromS(s, f) {
      const m = importa(s.mod);
      if (s.toate) { for (const [k, v] of m.d) if (!k.startsWith('_')) setName(k, v, f); return 0; }
      for (const x of s.l) {
        const v = m.d.get(x.nume);
        if (v === undefined) throw E('ImportError', `cannot import name '${x.nume}' from '${s.mod}' (unknown location)`);
        setName(x.ca || x.nume, v, f);
      }
      return 0;
    }
    function execDelS(s, f) {
      for (const t of s.l) {
        if (t.k === 'name') delName(t.id, f);
        else if (t.k === 'sub') { const o = gvalS(t.e, f); delitem(o, t.idx.k === 'slice' ? gfelieS(t.idx, f) : gvalS(t.idx, f)); } else if (t.k === 'tuple' || t.k === 'list') { for (const x of t.els) execS({ k: 'del', l: [x], line: s.line }, f); } else throw E('TypeError', 'cannot delete');
      }
      return 0;
    }
    function execAssertS(s, f) {
      if (!truthy(gvalS(s.c, f))) { const e = new PyExcObj(TIPURI.get('AssertionError'), s.m ? [gvalS(s.m, f)] : []); throw e; }
      return 0;
    }
    function execRaiseS(s, f) {
      if (!s.e) { if (S.exCurenta) throw S.exCurenta; throw E('RuntimeError', 'No active exception to reraise'); }
      let v = gvalS(s.e, f);
      if (v instanceof PyType && v.exc) v = new PyExcObj(v, []);
      if (!(v instanceof PyExcObj)) throw E('TypeError', 'exceptions must derive from BaseException');
      v.tb = null;
      throw v;
    }
    function execTryS(s, f) {
      let r = 0;
      try {
        let prinsa = false;
        try { r = execBlocS(s.corp, f); } catch (err0) {
          let err = err0;
          if (err instanceof RangeError) err = E('RecursionError', 'maximum recursion depth exceeded');
          if (!(err instanceof PyExcObj)) throw err;
          if (!err.tb) err.tb = traceback();
          for (const h of s.h) {
            let potr = !h.tip;
            if (h.tip) {
              f.line = h.line;
              const t = gvalS(h.tip, f);
              const lista = t instanceof PyTuple ? t.a : [t];
              for (const x of lista) { if (!(x instanceof PyType && x.exc)) throw E('TypeError', 'catching classes that do not inherit from BaseException is not allowed'); if (subtip(err.type, x)) potr = true; }
            }
            if (!potr) continue;
            prinsa = true;
            if (h.nume) setName(h.nume, err, f);
            const veche = S.exCurenta; S.exCurenta = err;
            try { r = execBlocS(h.corp, f); } finally { S.exCurenta = veche; }
            break;
          }
          if (!prinsa) throw err;
          return r;
        }
        if (!r && s.altfel.length) r = execBlocS(s.altfel, f);
        return r;
      } finally {
        if (s.fin) { const r2 = execBlocS(s.fin, f); if (r2) return r2; } // eslint-disable-line no-unsafe-finally
      }
    }
    function atribuieS(t, v, f) {
      switch (t.k) {
        case 'name': setName(t.id, v, f); return;
        case 'tuple': case 'list': {
          const l = listaDin(v);
          const si = t.els.findIndex((x) => x.k === 'starred');
          if (si < 0) {
            if (l.length > t.els.length) throw E('ValueError', `too many values to unpack (expected ${t.els.length})`);
            if (l.length < t.els.length) throw E('ValueError', `not enough values to unpack (expected ${t.els.length}, got ${l.length})`);
            for (let i = 0; i < l.length; i++) atribuieS(t.els[i], l[i], f);
          } else {
            const dupa = t.els.length - si - 1;
            if (l.length < t.els.length - 1) throw E('ValueError', `not enough values to unpack (expected at least ${t.els.length - 1}, got ${l.length})`);
            for (let i = 0; i < si; i++) atribuieS(t.els[i], l[i], f);
            atribuieS(t.els[si].e, new PyList(l.slice(si, l.length - dupa)), f);
            for (let i = 0; i < dupa; i++) atribuieS(t.els[si + 1 + i], l[l.length - dupa + i], f);
          }
          return;
        }
        case 'sub': {
          const o = gvalS(t.e, f);
          const i = t.idx.k === 'slice' ? gfelieS(t.idx, f) : gvalS(t.idx, f);
          setitem(o, i, v); return;
        }
        case 'attr': setattr(gvalS(t.e, f), t.name, v); return;
        case 'starred': throw E('SyntaxError', 'starred assignment target must be in a list or tuple');
        default: throw E('SyntaxError', 'cannot assign');
      }
    }
    function gfelieS(e, f) { return new Felie(e.lo ? gvalS(e.lo, f) : null, e.hi ? gvalS(e.hi, f) : null, e.st ? gvalS(e.st, f) : null); }

    // evaluarea rapidă (expresii fără apeluri de funcții)
    function gvalS(e, f) {
      switch (e.k) {
        case 'call': return gapelS(e, f);
        case 'listcomp': case 'setcomp': case 'dictcomp': case 'genexp': return comprehensiuneS(e, f);
        case 'dict': case 'set': case 'fstr': return gColectieS(e, f);
        default:
      }
      if (!e.g) return val(e, f);
      switch (e.k) {
        case 'bin': return gBinS(e, f);
        case 'cmp': return gCmpS(e, f);
        case 'attr': return getattr(gvalS(e.e, f), e.name);
        case 'sub': return gSubS(e, f);
        default: return gAlteS(e, f);
      }
    }
    function gBinS(e, f) { const a = gvalS(e.l, f); return binop(e.op, a, gvalS(e.r, f)); }
    function gCmpS(e, f) {
      let a = gvalS(e.vals[0], f);
      for (let i = 0; i < e.ops.length; i++) { const b = gvalS(e.vals[i + 1], f); if (!cmpop(e.ops[i], a, b)) return false; a = b; }
      return true;
    }
    function gSubS(e, f) { const o = gvalS(e.e, f); return getitem(o, e.idx.k === 'slice' ? gfelieS(e.idx, f) : gvalS(e.idx, f)); }
    function gColectieS(e, f) {
      if (e.k === 'dict') {
        const d = new PyDict();
        for (let i = 0; i < e.chei.length; i++) { const k = gvalS(e.chei[i], f); const v = gvalS(e.vals[i], f); const h = hk(k); const x = d.m.get(h); if (x) x[1] = v; else d.m.set(h, [k, v]); }
        return d;
      }
      if (e.k === 'set') { const s = new PySet(); for (const x of e.els) { const v = gvalS(x, f); s.m.set(hk(v), v); } return s; }
      let r = '';
      for (const p of e.parti) r += typeof p === 'string' ? p : fpartS(p, f);
      return r;
    }
    function gAlteS(e, f) {
      switch (e.k) {
        case 'unary': return unop(e.op, gvalS(e.e, f));
        case 'not': return !truthy(gvalS(e.e, f));
        case 'bool': {
          let v = null;
          if (e.op === 'and') { for (const x of e.vals) { v = gvalS(x, f); if (!truthy(v)) return v; } return v; }
          for (const x of e.vals) { v = gvalS(x, f); if (truthy(v)) return v; }
          return v;
        }
        case 'ifexp': return truthy(gvalS(e.c, f)) ? gvalS(e.a, f) : gvalS(e.b, f);
        case 'tuple': case 'list': {
          const l = [];
          for (const x of e.els) { if (x.k === 'starred') l.push(...listaDin(gvalS(x.e, f))); else l.push(gvalS(x, f)); }
          return e.k === 'tuple' ? new PyTuple(l) : new PyList(l);
        }
        case 'lambda': { const d = []; for (const p of e.params) if (p.def) d.push(gvalS(p.def, f)); return faLambda(e, f, d); }
        case 'starred': throw E('SyntaxError', "can't use starred expression here");
        default: throw E('RuntimeError', `expresie necunoscută: ${e.k}`);
      }
    }
    function fpartS(p, f) {
      let v = gvalS(p.e, f);
      let spec = '';
      if (p.spec) for (const x of p.spec) spec += typeof x === 'string' ? x : fpartS(x, f);
      if (p.conv === 'r' || (p.eq && !p.conv && !spec)) v = repr(v); else if (p.conv === 's') v = str(v); else if (p.conv === 'a') v = repr(v);
      return (p.eq || '') + fmtSpec(v, spec);
    }
    function comprehensiuneS(e, f) {
      const cf = { name: '<listcomp>', loc: new Map(), locs: e.locs, glob: f.glob, enc: f.loc ? f : null, line: e.line };
      const prim = gvalS(e.gens[0].it, f);
      const out = e.k === 'dictcomp' ? new PyDict() : e.k === 'setcomp' ? new PySet() : [];
      let nr = 0;
      const recS = function (i, it) {
        const g = e.gens[i];
        for (const x of iterOf(it)) {
          if ((++nr & 4095) === 0) tick();
          if (g.t.k === 'name') cf.loc.set(g.t.id, x); else atribuieS(g.t, x, cf);
          let ok = true;
          for (const c of g.ifs) if (!truthy(c.g ? gvalS(c, cf) : val(c, cf))) { ok = false; break; }
          if (!ok) continue;
          if (i + 1 < e.gens.length) { recS(i + 1, gvalS(e.gens[i + 1].it, cf)); continue; }
          if (e.k === 'dictcomp') { const k = gvalS(e.elt, cf); const v = gvalS(e.val, cf); const h = hk(k); const o = out.m.get(h); if (o) o[1] = v; else out.m.set(h, [k, v]); } else {
            const v = e.elt.g ? gvalS(e.elt, cf) : val(e.elt, cf);
            if (e.k === 'setcomp') out.m.set(hk(v), v); else out.push(v);
          }
        }
      };
      recS(0, prim);
      if (e.k === 'listcomp') return new PyList(out);
      if (e.k === 'genexp') return new PyIter('generator', out[Symbol.iterator]());
      return out;
    }
    function gapelS(e, f) {
      const fn = gvalS(e.f, f);
      const args = [];
      for (const a of e.args) { const v = gvalS(a.e, f); if (a.star) args.push(...listaDin(v)); else args.push(v); }
      let kw = null;
      if (e.kw.length) {
        kw = new Map();
        for (const k of e.kw) {
          const v = gvalS(k.e, f);
          if (k.dstar) { if (!(v instanceof PyDict)) throw E('TypeError', 'argument after ** must be a mapping'); for (const [kk, vv] of v.m.values()) kw.set(str(kk), vv); } else kw.set(k.name, v);
        }
      }
      f.line = e.line;
      if (fn instanceof PyFunc && !S.dbg && !fn.suspect) return apelUtilizatorS(fn, args, kw);
      return apeleazaS(fn, args, kw);
    }
    function apeleazaS(fn, args, kw) {
      // funcțiile care nu pot cere date (input/sleep) rulează sincron: e mai rapid și permite recursivitate adâncă
      if (fn instanceof PyFunc) return S.dbg || fn.suspect ? apelUtilizatorS(fn, args, kw) : apelUtilizatorS(fn, args, kw);
      if (fn instanceof PyBuiltin) return fn.gen ? apelGenS(fn, args, kw) : fn.fn(args, kw);
      if (fn instanceof PyBound) return fn.gen ? apelGenS(fn, args, kw) : fn.fn(fn.self, args, kw);
      if (fn instanceof PyMetoda) return S.dbg || fn.fn.suspect ? apelUtilizatorS(fn.fn, [fn.self, ...args], kw) : apelUtilizatorS(fn.fn, [fn.self, ...args], kw);
      if (fn instanceof PyType && fn.user && !fn.exc) {
        const o = new PyInst(fn.name, new Map()); o.clasa = fn;
        const init = metodaClasa(fn, '__init__');
        if (init) apeleazaS(init, [o, ...args], kw); else if (args.length) throw E('TypeError', `${fn.name}() takes no arguments`);
        return o;
      }
      if (fn instanceof PyType) return fn.make(args, kw);
      throw E('TypeError', `'${tn(fn)}' object is not callable`);
    }
    function apelGenS(fn, args, kw) { return ruleazaSync(fn instanceof PyBound ? fn.gen(fn.self, args, kw) : fn.gen(args, kw)); }
    function apelUtilizatorS(fn, args, kw) {
      if (S.stack.length >= MAX_ADANCIME) throw E('RecursionError', 'maximum recursion depth exceeded');
      const loc = legaParam(fn, args, kw);
      const fr = { name: fn.name, loc, locs: fn.locs, nonl: fn.nonl, glob: fn.glob, enc: fn.enc, line: fn.line, src: fn.src, fisier: fn.fisier, ret: null };
      S.stack.push(fr);
      try {
        if (fn.lambda) return gvalS(fn.corp, fr);
        const r = execBlocS(fn.corp, fr);
        return r === RET ? fr.ret : null;
      } catch (err) {
        if (err instanceof PyExcObj && !err.tb) err.tb = traceback();
        if (err instanceof RangeError) { const e2 = E('RecursionError', 'maximum recursion depth exceeded'); e2.tb = traceback(); throw e2; }
        throw err;
      } finally { S.stack.pop(); }
    }
    // </sincron>
    function ruleazaSync(g) { // pentru funcții apelate din funcții predefinite (sorted(key=...), map ...)
      let r = g.next();
      while (!r.done) {
        const y = r.value;
        if (y.t === 'pas' || y.t === 'sleep') { r = g.next(); continue; }
        throw E('RuntimeError', 'input() nu poate fi folosit în această funcție');
      }
      return r.value;
    }
    const apelSync = (fn, args, kw = null) => (fn instanceof PyBuiltin && !fn.gen ? fn.fn(args, kw) : ruleazaSync(apeleaza(fn, args, kw)));
    function traceback() { return S.stack.map((fr) => ({ name: fr.name, line: fr.line, src: fr.src || S.srcCurent, fisier: fr.fisier || S.fisierCurent })); }

    // ---------- atribute și metode ----------
    function getattr(o, name) {
      if (o instanceof PyModule) {
        const v = o.d.get(name);
        if (v === undefined) throw E('AttributeError', `module '${o.name}' has no attribute '${name}'${sugAttr(name, o.d.keys())}`);
        return v;
      }
      if (o instanceof PyInst && o.clasa) {
        if (o.d.has(name)) return o.d.get(name);
        const m = metodaClasa(o.clasa, name);
        if (m !== undefined) return m instanceof PyFunc ? new PyMetoda(o, m) : m;
        throw E('AttributeError', `'${o.cls}' object has no attribute '${name}'`);
      }
      if (o instanceof PyType && name === '__name__') return o.name;
      if (o instanceof PyType && !o.user && METODE[o.name] && typeof METODE[o.name][name] === 'function') { const m = METODE[o.name][name]; return new PyBuiltin(name, (a, kw) => { if (!a.length || tn(a[0]) !== o.name) throw E('TypeError', `descriptor '${name}' for '${o.name}' objects doesn't apply to a '${a.length ? tn(a[0]) : 'NoneType'}' object`); return m(a[0], a.slice(1), kw); }); }
      if (o instanceof PyType && o.user) { const m = metodaClasa(o, name); if (m !== undefined) return m; throw E('AttributeError', `type object '${o.name}' has no attribute '${name}'`); }
      if (o instanceof PyInst) {
        if (o.d.has(name)) return o.d.get(name);
        const m = METODE_INST[o.cls]?.[name];
        if (m) return new PyBound(o, name, m);
        throw E('AttributeError', `'${o.cls}' object has no attribute '${name}'${sugAttr(name, Object.keys(METODE_INST[o.cls] || {}))}`);
      }
      if (o instanceof PyExcObj && name === 'args') return new PyTuple(o.args);
      if ((o instanceof PyFunc || o instanceof PyBuiltin || o instanceof PyType) && name === '__name__') return o.name;
      const tab = METODE[tn(o)] || (o instanceof PyFloat ? METODE.float : null);
      const m = tab && tab[name];
      if (m) return typeof m === 'function' ? new PyBound(o, name, m) : new PyBound(o, name, null, m.gen);
      if (o instanceof PyFloat && name === 'real') return o;
      if (eInt(o) && (name === 'real' || name === 'numerator')) return iv(o);
      if (o instanceof PyRange && ['start', 'stop', 'step'].includes(name)) return o[name];
      throw E('AttributeError', `'${tn(o)}' object has no attribute '${name}'${sugAttr(name, tab ? Object.keys(tab) : [])}`);
    }
    function metodaClasa(t, name) { for (let c = t; c; c = c.base) if (c.d && c.d.has(name)) return c.d.get(name); return undefined; }
    function sugAttr(name, l) { const s = sugestie(name, l); return s ? `. Did you mean: '${s}'?` : ''; }
    function setattr(o, name, v) {
      if (o instanceof PyInst) { o.d.set(name, v); return; }
      if (o instanceof PyModule) { o.d.set(name, v); return; }
      if (o instanceof PyType && o.user) { o.d.set(name, v); return; }
      throw E('AttributeError', `'${tn(o)}' object has no attribute '${name}' and no __dict__ for setting new attributes`);
    }

    // ---------- argumente pentru funcțiile predefinite ----------
    function nrArg(nume, args, min, max = min) {
      if (args.length < min || args.length > max) {
        if (min === max) throw E('TypeError', `${nume}() takes ${min === 0 ? 'no arguments' : `exactly ${min === 1 ? 'one argument' : `${min} arguments`}`} (${args.length} given)`);
        if (args.length < min) throw E('TypeError', `${nume}() takes at least ${min} argument${min > 1 ? 's' : ''} (${args.length} given)`);
        throw E('TypeError', `${nume}() takes at most ${max} argument${max > 1 ? 's' : ''} (${args.length} given)`);
      }
    }
    const kwv = (kw, n, d) => (kw && kw.has(n) ? kw.get(n) : d);
    function faraKw(nume, kw, perm = []) { if (kw) for (const k of kw.keys()) if (!perm.includes(k)) throw E('TypeError', `${nume}() got an unexpected keyword argument '${k}'`); }
    function cereInt(v, ce = '') {
      if (eInt(v)) return iv(v);
      throw E('TypeError', `'${tn(v)}' object cannot be interpreted as an integer${ce}`);
    }
    function cereNum(v, nume) { if (!nk(v)) throw E('TypeError', `must be real number, not ${tn(v)}`); void nume; return fv(v); }

    // conversii
    function laInt(args, kw) {
      faraKw('int', kw, ['base']);
      if (!args.length) return 0;
      const v = args[0];
      const baza = args.length > 1 ? args[1] : kwv(kw, 'base', null);
      if (baza !== null) {
        if (typeof v !== 'string') throw E('TypeError', "int() can't convert non-string with explicit base");
        const b = cereInt(baza);
        let s = v.trim().replace(/_/g, '').toLowerCase(), semn = 1n;
        if (s[0] === '-' || s[0] === '+') { if (s[0] === '-') semn = -1n; s = s.slice(1); }
        if (b === 16) s = s.replace(/^0x/, ''); else if (b === 8) s = s.replace(/^0o/, ''); else if (b === 2) s = s.replace(/^0b/, '');
        const cif = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, b);
        if (!s || [...s].some((c) => !cif.includes(c))) throw E('ValueError', `invalid literal for int() with base ${b}: ${strRepr(v)}`);
        let r = 0n; for (const c of s) r = r * BigInt(b) + BigInt(cif.indexOf(c));
        return nb(semn * r);
      }
      if (eInt(v)) return iv(v);
      if (v instanceof PyFloat) return toInt(v);
      if (typeof v === 'string') {
        const s = v.trim();
        if (!/^[+-]?\d+(_\d+)*$/.test(s)) throw E('ValueError', `invalid literal for int() with base 10: ${strRepr(v)}`);
        return nb(BigInt(s.replace(/_/g, '')));
      }
      throw E('TypeError', `int() argument must be a string, a bytes-like object or a real number, not '${tn(v)}'`);
    }
    function laFloat(args, kw) {
      faraKw('float', kw); nrArg('float', args, 0, 1);
      if (!args.length) return fl(0);
      const v = args[0];
      if (v instanceof PyFloat) return v;
      if (eInt(v)) return fl(fv(iv(v)));
      if (typeof v === 'string') {
        const s = v.trim().replace(/(\d)_(?=\d)/g, '$1');
        if (/^[+-]?(inf|infinity)$/i.test(s)) return fl(s[0] === '-' ? -Infinity : Infinity);
        if (/^[+-]?nan$/i.test(s)) return fl(NaN);
        if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) throw E('ValueError', `could not convert string to float: ${strRepr(v)}`);
        return fl(Number(s));
      }
      throw E('TypeError', `float() argument must be a string or a real number, not '${tn(v)}'`);
    }
    function rotunjire(args, kw) {
      faraKw('round', kw, ['ndigits']);
      nrArg('round', args, 1, 2);
      const x = args[0], nd = args.length > 1 ? args[1] : kwv(kw, 'ndigits', null);
      if (eInt(x)) {
        if (nd === null || cereInt(nd) >= 0) return iv(x);
        const p = 10n ** BigInt(-cereInt(nd)); const X = BigInt(iv(x));
        let q = X / p, r = X % p; if (r < 0n) { r += p; q -= 1n; }
        const r2 = r * 2n; if (r2 > p || (r2 === p && (q & 1n))) q += 1n;
        return nb(q * p);
      }
      if (!(x instanceof PyFloat)) throw E('TypeError', `type ${tn(x)} doesn't define __round__ method`);
      const v = x.v;
      if (nd === null) {
        if (!Number.isFinite(v)) throw E(v !== v ? 'ValueError' : 'OverflowError', v !== v ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer');
        const fl0 = Math.floor(v), d = v - fl0;
        let r = d > 0.5 ? fl0 + 1 : d < 0.5 ? fl0 : (fl0 % 2 === 0 ? fl0 : fl0 + 1);
        if (r === 0) r = 0;
        return Number.isSafeInteger(r) ? r : nb(BigInt(r));
      }
      const n = cereInt(nd);
      if (!Number.isFinite(v) || v === 0) return x;
      const a = Math.abs(v);
      let r;
      if (n >= 0) { if (n > 320) return x; r = Number(cuZecimale(a, n)); } else {
        const { N, k } = zecimalExact(a);
        r = Number(`${rotunjeste(N, k - n)}e${-n}`);
      }
      return fl(v < 0 ? -r : r);
    }
    function minmax(nume, args, kw, maxim) {
      faraKw(nume, kw, ['key', 'default']);
      const key = kwv(kw, 'key', null);
      let l;
      if (args.length === 0) throw E('TypeError', `${nume} expected at least 1 argument, got 0`);
      if (args.length === 1) l = listaDin(args[0]); else l = args;
      if (!l.length) { if (kw && kw.has('default')) return kw.get('default'); throw E('ValueError', `${nume}() iterable argument is empty`); }
      let best = l[0], bk = key && key !== null ? apelSync(key, [best]) : best;
      for (let i = 1; i < l.length; i++) {
        const k = key && key !== null ? apelSync(key, [l[i]]) : l[i];
        if (maxim ? lt(bk, k, '>') : lt(k, bk)) { best = l[i]; bk = k; }
      }
      return best;
    }
    function sorteaza(l, key, rev) {
      const chei = key && key !== null ? l.map((x) => apelSync(key, [x])) : l;
      const idx = l.map((_, i) => i);
      idx.sort((a, b) => { const x = chei[a], y = chei[b]; if (rev) { if (lt(y, x)) return -1; if (lt(x, y)) return 1; return a - b; } if (lt(x, y)) return -1; if (lt(y, x)) return 1; return a - b; });
      return idx.map((i) => l[i]);
    }
    function suma(args, kw) {
      faraKw('sum', kw, ['start']);
      nrArg('sum', args, 1, 2);
      let s = args.length > 1 ? args[1] : kwv(kw, 'start', 0);
      if (typeof s === 'string') throw E('TypeError', "sum() can't sum strings [use ''.join(seq) instead]");
      let nr = 0;
      // adunarea float ca în Python (cu compensare, rezultat exact rotunjit) nu e necesară la gimnaziu; adunăm simplu
      // ca în Python 3.12+: numerele reale se adună cu compensare (Neumaier), deci sum([0.1] * 10) == 1.0
      let fs = null, c = 0;
      for (const x of iterOf(args[0])) {
        if ((++nr & 65535) === 0) tick();
        if (fs !== null && nk(x)) { const y = fv(x); const t = fs + y; if (Math.abs(fs) >= Math.abs(y)) c += (fs - t) + y; else c += (y - t) + fs; fs = t; continue; }
        if (fs === null && s instanceof PyFloat && nk(x)) { fs = s.v; c = 0; const y = fv(x); const t = fs + y; if (Math.abs(fs) >= Math.abs(y)) c += (fs - t) + y; else c += (y - t) + fs; fs = t; continue; }
        if (fs !== null) { s = fl(c && Number.isFinite(c) ? fs + c : fs); fs = null; }
        s = binop('+', s, x);
      }
      if (fs !== null) s = fl(c && Number.isFinite(c) ? fs + c : fs);
      return s;
    }
    const doarCuv = (nume, args, kw, min, max) => { faraKw(nume, kw); nrArg(nume, args, min, max); };

    // ---------- print și input ----------
    function afiseaza(args, kw) {
      faraKw('print', kw, ['sep', 'end', 'file', 'flush']);
      const sep = kwv(kw, 'sep', null), end = kwv(kw, 'end', null);
      if (sep !== null && typeof sep !== 'string') throw E('TypeError', `sep must be None or a string, not ${tn(sep)}`);
      if (end !== null && typeof end !== 'string') throw E('TypeError', `end must be None or a string, not ${tn(end)}`);
      scrie(args.map(str).join(sep === null ? ' ' : sep) + (end === null ? '\n' : end));
      return null;
    }
    function* citeste(args, kw) {
      faraKw('input', kw); nrArg('input', args, 0, 1);
      if (args.length) scrie(str(args[0]));
      S.gazda.flush?.();
      const r = yield { t: 'input' };
      S.t0 = Date.now();
      if (r === null || r === undefined) throw E('EOFError', 'EOF when reading a line');
      S.intrari.push(r);
      return r;
    }

    // ---------- funcțiile predefinite ----------
    const BUILTINS = new Map();
    const bi = (n, fn, gen) => BUILTINS.set(n, new PyBuiltin(n, fn, gen));
    const tipB = (n, make) => { const t = new PyType(n, null, make); BUILTINS.set(n, t); return t; };
    const T_INT = tipB('int', laInt), T_FLOAT = tipB('float', laFloat);
    const T_STR = tipB('str', (a, kw) => { faraKw('str', kw); nrArg('str', a, 0, 1); return a.length ? str(a[0]) : ''; });
    const T_BOOL = tipB('bool', (a, kw) => { doarCuv('bool', a, kw, 0, 1); return a.length ? truthy(a[0]) : false; });
    T_BOOL.base = T_INT;
    const T_LIST = tipB('list', (a, kw) => { doarCuv('list', a, kw, 0, 1); return new PyList(a.length ? listaDin(a[0]) : []); });
    const T_TUPLE = tipB('tuple', (a, kw) => { doarCuv('tuple', a, kw, 0, 1); return new PyTuple(a.length ? listaDin(a[0]) : []); });
    const T_DICT = tipB('dict', (a, kw) => {
      const d = new PyDict();
      if (a.length) {
        if (a[0] instanceof PyDict) for (const [h, x] of a[0].m) d.m.set(h, [x[0], x[1]]);
        else for (const x of iterOf(a[0])) { const p = listaDin(x); if (p.length !== 2) throw E('ValueError', `dictionary update sequence element has length ${p.length}; 2 is required`); d.m.set(hk(p[0]), [p[0], p[1]]); }
      }
      if (kw) for (const [k, v] of kw) d.m.set(hk(k), [k, v]);
      return d;
    });
    const T_SET = tipB('set', (a, kw) => { doarCuv('set', a, kw, 0, 1); const s = new PySet(); if (a.length) for (const x of iterOf(a[0])) s.m.set(hk(x), x); return s; });
    const T_RANGE = tipB('range', (a, kw) => {
      faraKw('range', kw);
      if (!a.length) throw E('TypeError', 'range expected at least 1 argument, got 0');
      if (a.length > 3) throw E('TypeError', `range expected at most 3 arguments, got ${a.length}`);
      const n = a.map((x) => cereInt(x));
      if (a.length === 1) return new PyRange(0, n[0], 1);
      if (n[2] === 0 || n[2] === 0n) throw E('ValueError', 'range() arg 3 must not be zero');
      return new PyRange(n[0], n[1], a.length > 2 ? n[2] : 1);
    });
    const T_TYPE = tipB('type', (a) => { if (a.length !== 1) throw E('TypeError', 'type() takes 1 or 3 arguments'); return tipul(a[0]); });
    const T_NONE = new PyType('NoneType', null, () => null);
    const T_FUNC = new PyType('function', null, () => { throw E('TypeError', "cannot create 'function' instances"); });
    const T_BFUNC = new PyType('builtin_function_or_method', null, () => { throw E('TypeError', 'nu se poate crea'); });
    const T_MOD = new PyType('module', null, () => { throw E('TypeError', 'nu se poate crea'); });
    const T_OBJ = tipB('object', () => new PyInst('object', new Map()));
    void T_OBJ;
    function tipul(v) {
      if (v instanceof PyExcObj) return v.type;
      const n = tn(v);
      const t = { int: T_INT, float: T_FLOAT, str: T_STR, bool: T_BOOL, list: T_LIST, tuple: T_TUPLE, dict: T_DICT, set: T_SET, range: T_RANGE, type: T_TYPE, NoneType: T_NONE, function: T_FUNC, builtin_function_or_method: T_BFUNC, module: T_MOD }[n];
      if (t) return t;
      const x = new PyType(n, null, () => { throw E('TypeError', `cannot create '${n}' instances`); });
      if (v instanceof PyInst && v.clasa) return v.clasa;
      if (v instanceof PyInst) x.modul = 'turtle';
      return x;
    }
    for (const [n, t] of TIPURI) BUILTINS.set(n, t);
    bi('print', afiseaza);
    bi('input', null, citeste);
    bi('len', (a, kw) => { doarCuv('len', a, kw, 1, 1); return len(a[0]); });
    bi('abs', (a, kw) => { doarCuv('abs', a, kw, 1, 1); const v = a[0]; if (nk(v) === 1) { const x = iv(v); return x < 0 ? neg(x) : x; } if (nk(v) === 2) return fl(Math.abs(v.v)); throw E('TypeError', `bad operand type for abs(): '${tn(v)}'`); });
    bi('min', (a, kw) => minmax('min', a, kw, false));
    bi('max', (a, kw) => minmax('max', a, kw, true));
    bi('sum', suma);
    bi('round', rotunjire);
    bi('sorted', (a, kw) => { faraKw('sorted', kw, ['key', 'reverse']); nrArg('sorted', a, 1, 1); return new PyList(sorteaza(listaDin(a[0]), kwv(kw, 'key', null), truthy(kwv(kw, 'reverse', false)))); });
    bi('reversed', (a, kw) => { doarCuv('reversed', a, kw, 1, 1); const v = a[0]; if (v instanceof PyDict || v instanceof PySet) throw E('TypeError', `'${tn(v)}' object is not reversible`); const l = listaDin(v).reverse(); return new PyIter(v instanceof PyList ? 'list_reverseiterator' : v instanceof PyRange ? 'range_iterator' : 'reversed', l[Symbol.iterator]()); });
    bi('enumerate', (a, kw) => {
      faraKw('enumerate', kw, ['start']); nrArg('enumerate', a, 1, 2);
      let k = a.length > 1 ? cereInt(a[1]) : cereInt(kwv(kw, 'start', 0));
      const it = iterOf(a[0]);
      return new PyIter('enumerate', (function* () { for (const x of it) { yield new PyTuple([k, x]); k = intop('+', k, 1); } })());
    });
    bi('zip', (a, kw) => {
      faraKw('zip', kw, ['strict']);
      const its = a.map(iterOf);
      return new PyIter('zip', (function* () { if (!its.length) return; for (;;) { const t = []; for (const it of its) { const r = it.next(); if (r.done) return; t.push(r.value); } yield new PyTuple(t); } })());
    });
    bi('map', (a, kw) => {
      faraKw('map', kw);
      if (a.length < 2) throw E('TypeError', 'map() must have at least two arguments.');
      const fn = a[0], its = a.slice(1).map(iterOf);
      return new PyIter('map', (function* () { for (;;) { const t = []; for (const it of its) { const r = it.next(); if (r.done) return; t.push(r.value); } yield apelSync(fn, t); } })());
    });
    bi('filter', (a, kw) => {
      doarCuv('filter', a, kw, 2, 2);
      const fn = a[0], it = iterOf(a[1]);
      return new PyIter('filter', (function* () { for (const x of it) if (fn === null ? truthy(x) : truthy(apelSync(fn, [x]))) yield x; })());
    });
    bi('isinstance', (a, kw) => {
      doarCuv('isinstance', a, kw, 2, 2);
      const t = tipul(a[0]);
      const l = a[1] instanceof PyTuple ? a[1].a : [a[1]];
      for (const x of l) { if (!(x instanceof PyType)) throw E('TypeError', 'isinstance() arg 2 must be a type, a tuple of types, or a union'); if (x === t || subtip(t, x) || (x.name === t.name && x.name !== 'object') || x.name === 'object') return true; }
      return false;
    });
    bi('ord', (a, kw) => { doarCuv('ord', a, kw, 1, 1); const s = a[0]; if (typeof s !== 'string') throw E('TypeError', `ord() expected string of length 1, but ${tn(s)} found`); if ([...s].length !== 1) throw E('TypeError', `ord() expected a character, but string of length ${s.length} found`); return s.codePointAt(0); });
    bi('chr', (a, kw) => { doarCuv('chr', a, kw, 1, 1); const n = cereInt(a[0]); if (n < 0 || n > 0x10ffff) throw E('ValueError', 'chr() arg not in range(0x110000)'); return String.fromCodePoint(Number(n)); });
    bi('divmod', (a, kw) => { doarCuv('divmod', a, kw, 2, 2); return new PyTuple([binop('//', a[0], a[1]), binop('%', a[0], a[1])]); });
    bi('pow', (a, kw) => {
      faraKw('pow', kw); nrArg('pow', a, 2, 3);
      if (a.length === 3) { let b = BigInt(cereInt(a[0])), e = BigInt(cereInt(a[1])); const m = BigInt(cereInt(a[2])); if (m === 0n) throw E('ValueError', 'pow() 3rd argument cannot be 0'); let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } if (r < 0n) r += m; return nb(r); }
      return binop('**', a[0], a[1]);
    });
    bi('any', (a, kw) => { doarCuv('any', a, kw, 1, 1); for (const x of iterOf(a[0])) if (truthy(x)) return true; return false; });
    bi('all', (a, kw) => { doarCuv('all', a, kw, 1, 1); for (const x of iterOf(a[0])) if (!truthy(x)) return false; return true; });
    bi('repr', (a, kw) => { doarCuv('repr', a, kw, 1, 1); return repr(a[0]); });
    bi('ascii', (a, kw) => { doarCuv('ascii', a, kw, 1, 1); return repr(a[0]).replace(/[^\x00-\x7f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`); });
    bi('format', (a, kw) => { doarCuv('format', a, kw, 1, 2); return fmtSpec(a[0], a.length > 1 ? str(a[1]) : ''); });
    bi('bin', (a, kw) => { doarCuv('bin', a, kw, 1, 1); const x = BigInt(cereInt(a[0])); return (x < 0n ? '-0b' : '0b') + (x < 0n ? -x : x).toString(2); });
    bi('oct', (a, kw) => { doarCuv('oct', a, kw, 1, 1); const x = BigInt(cereInt(a[0])); return (x < 0n ? '-0o' : '0o') + (x < 0n ? -x : x).toString(8); });
    bi('hex', (a, kw) => { doarCuv('hex', a, kw, 1, 1); const x = BigInt(cereInt(a[0])); return (x < 0n ? '-0x' : '0x') + (x < 0n ? -x : x).toString(16); });
    bi('id', (a) => { const v = a[0]; if (v && typeof v === 'object') { if (v.id === undefined) v.id = ++nrObiecte; return 139887000000000 + v.id * 48; } return 9784000 + (Number(hashNr(v)) & 0xffff) * 32; });
    function hashNr(v) { const k = String(hk(v)); let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return h; }
    bi('hash', (a) => { const v = a[0]; if (eInt(v)) return iv(v); hk(v); return hashNr(v); });
    bi('iter', (a) => new PyIter('iterator', iterOf(a[0])));
    bi('next', (a) => {
      const v = a[0];
      if (!(v instanceof PyIter)) throw E('TypeError', `'${tn(v)}' object is not an iterator`);
      const r = v.it.next();
      if (r.done) { if (a.length > 1) return a[1]; throw E('StopIteration'); }
      return r.value;
    });
    bi('callable', (a) => a[0] instanceof PyFunc || a[0] instanceof PyBuiltin || a[0] instanceof PyBound || a[0] instanceof PyType);
    bi('exit', (a) => { throw new Iesire(a.length ? a[0] : null); });
    BUILTINS.set('quit', BUILTINS.get('exit'));
    bi('help', () => { scrie('Ajutorul interactiv nu este disponibil aici. Încearcă meniul Ajutor din Thonny.\n'); return null; });
    bi('globals', () => { const d = new PyDict(); for (const [k, v] of S.G) d.m.set(hk(k), [k, v]); return d; });
    bi('dir', (a) => { if (!a.length) return new PyList([...S.G.keys()].sort()); const o = a[0]; if (o instanceof PyModule) return new PyList([...o.d.keys()].sort()); const t = METODE[tn(o)]; return new PyList(t ? Object.keys(t).sort() : []); });

    // ---------- metodele tipurilor ----------
    const cereStr = (v, nume) => { if (typeof v !== 'string') throw E('TypeError', `${nume} arg must be None or str`); return v; };
    function strip(s, ch, st, dr) {
      if (ch === null || ch === undefined) { if (st) s = s.replace(/^\s+/, ''); if (dr) s = s.replace(/\s+$/, ''); return s; }
      let a = 0, b = s.length;
      if (st) while (a < b && ch.includes(s[a])) a++;
      if (dr) while (b > a && ch.includes(s[b - 1])) b--;
      return s.slice(a, b);
    }
    function split(s, sep, max) {
      if (max === undefined || max === null) max = -1;
      if (sep === null || sep === undefined) {
        const r = []; let i = 0; const n = s.length;
        while (i < n) {
          while (i < n && /\s/.test(s[i])) i++;
          if (i >= n) break;
          if (max >= 0 && r.length === max) { r.push(s.slice(i).replace(/\s+$/, '')); return r; }
          let j = i; while (j < n && !/\s/.test(s[j])) j++;
          r.push(s.slice(i, j)); i = j;
        }
        return r;
      }
      if (typeof sep !== 'string') throw E('TypeError', `must be str or None, not ${tn(sep)}`);
      if (sep === '') throw E('ValueError', 'empty separator');
      const p = s.split(sep);
      if (max >= 0 && p.length > max + 1) return [...p.slice(0, max), p.slice(max).join(sep)];
      return p;
    }
    const pozitie = (s, a, n) => { if (a === null || a === undefined) return 0; a = cereInt(a); return a < 0 ? Math.max(0, a + n) : Math.min(a, n); };
    function gaseste(s, sub, st, sf, dinDreapta) {
      if (typeof sub !== 'string') throw E('TypeError', `must be str, not ${tn(sub)}`);
      const a = pozitie(s, st, s.length), b = sf === null || sf === undefined ? s.length : pozitie(s, sf, s.length);
      const z = s.slice(0, b);
      const r = dinDreapta ? z.lastIndexOf(sub) : z.indexOf(sub, a);
      return r >= a && r + sub.length <= b ? r : -1;
    }
    const caz = (t, ok) => t.length > 0 && [...t].every(ok);
    const METODE = {
      str: {
        upper: (s) => s.toUpperCase(), lower: (s) => s.toLowerCase(), casefold: (s) => s.toLowerCase(),
        strip: (s, a) => strip(s, a[0], true, true), lstrip: (s, a) => strip(s, a[0], true, false), rstrip: (s, a) => strip(s, a[0], false, true),
        split: (s, a, kw) => new PyList(split(s, a.length ? a[0] : kwv(kw, 'sep', null), a.length > 1 ? cereInt(a[1]) : cereInt(kwv(kw, 'maxsplit', -1)))),
        rsplit: (s, a, kw) => { const sep = a.length ? a[0] : kwv(kw, 'sep', null); const mx = a.length > 1 ? cereInt(a[1]) : cereInt(kwv(kw, 'maxsplit', -1)); if (mx < 0) return new PyList(split(s, sep)); if (sep === null) { const p = split(s, null); if (p.length <= mx + 1) return new PyList(p); const r = s.trim().split(/\s+/); return new PyList([r.slice(0, r.length - mx).join(' '), ...r.slice(r.length - mx)]); } const p = s.split(sep); if (p.length <= mx + 1) return new PyList(p); return new PyList([p.slice(0, p.length - mx).join(sep), ...p.slice(p.length - mx)]); },
        splitlines: (s) => new PyList(s.split(/\r\n|\r|\n/).filter((x, i, arr) => !(i === arr.length - 1 && x === ''))),
        join: (s, a) => { nrArg('join', a, 1); const l = listaDin(a[0]); l.forEach((x, i) => { if (typeof x !== 'string') throw E('TypeError', `sequence item ${i}: expected str instance, ${tn(x)} found`); }); return l.join(s); },
        replace: (s, a) => { nrArg('replace', a, 2, 3); const [x, y] = a; if (typeof x !== 'string' || typeof y !== 'string') throw E('TypeError', `replace() argument 1 must be str, not ${tn(typeof x !== 'string' ? x : y)}`); let n = a.length > 2 ? cereInt(a[2]) : -1; if (n < 0) return x === '' ? y + [...s].join(y) + (s ? y : '') : s.split(x).join(y); let r = s; let o = ''; while (n-- > 0) { const k = r.indexOf(x); if (k < 0) break; o += r.slice(0, k) + y; r = r.slice(k + x.length); } return o + r; },
        find: (s, a) => gaseste(s, a[0], a[1], a[2], false), rfind: (s, a) => gaseste(s, a[0], a[1], a[2], true),
        index: (s, a) => { const r = gaseste(s, a[0], a[1], a[2], false); if (r < 0) throw E('ValueError', 'substring not found'); return r; },
        rindex: (s, a) => { const r = gaseste(s, a[0], a[1], a[2], true); if (r < 0) throw E('ValueError', 'substring not found'); return r; },
        count: (s, a) => { const sub = a[0]; if (typeof sub !== 'string') throw E('TypeError', `must be str, not ${tn(sub)}`); const z = s.slice(pozitie(s, a[1], s.length), a[2] == null ? s.length : pozitie(s, a[2], s.length)); if (sub === '') return z.length + 1; return z.split(sub).length - 1; },
        startswith: (s, a) => { const l = a[0] instanceof PyTuple ? a[0].a : [a[0]]; const z = s.slice(pozitie(s, a[1], s.length)); return l.some((x) => z.startsWith(cereStr(x, 'startswith'))); },
        endswith: (s, a) => { const l = a[0] instanceof PyTuple ? a[0].a : [a[0]]; return l.some((x) => s.endsWith(cereStr(x, 'endswith'))); },
        isdigit: (s) => caz(s, (c) => /\p{Nd}/u.test(c)), isnumeric: (s) => caz(s, (c) => /\p{N}/u.test(c)), isdecimal: (s) => caz(s, (c) => /\p{Nd}/u.test(c)),
        isalpha: (s) => caz(s, (c) => /\p{L}/u.test(c)), isalnum: (s) => caz(s, (c) => /[\p{L}\p{N}]/u.test(c)), isspace: (s) => caz(s, (c) => /\s/.test(c)),
        isupper: (s) => /\p{Lu}/u.test(s) && !/\p{Ll}/u.test(s), islower: (s) => /\p{Ll}/u.test(s) && !/\p{Lu}/u.test(s),
        istitle: (s) => /\p{L}/u.test(s) && s === titlu(s), isidentifier: (s) => /^[\p{L}_][\p{L}\p{N}_]*$/u.test(s),
        capitalize: (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s), title: (s) => titlu(s),
        swapcase: (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
        center: (s, a) => { const w = cereInt(a[0]), f = a.length > 1 ? a[1] : ' '; if (s.length >= w) return s; const t = w - s.length; const st = Math.floor(t / 2) + (t & w & 1); return f.repeat(st) + s + f.repeat(t - st); },
        ljust: (s, a) => { const w = cereInt(a[0]); return s.length >= w ? s : s + (a[1] || ' ').repeat(w - s.length); },
        rjust: (s, a) => { const w = cereInt(a[0]); return s.length >= w ? s : (a[1] || ' ').repeat(w - s.length) + s; },
        zfill: (s, a) => { const w = cereInt(a[0]); if (s.length >= w) return s; const semn = s[0] === '-' || s[0] === '+' ? s[0] : ''; return semn + '0'.repeat(w - s.length) + s.slice(semn.length); },
        format: (s, a, kw) => formatStr(s, a, kw),
        partition: (s, a) => { const k = s.indexOf(a[0]); return new PyTuple(k < 0 ? [s, '', ''] : [s.slice(0, k), a[0], s.slice(k + a[0].length)]); },
        encode: (s) => s, removeprefix: (s, a) => (s.startsWith(a[0]) ? s.slice(a[0].length) : s), removesuffix: (s, a) => (a[0] && s.endsWith(a[0]) ? s.slice(0, -a[0].length) : s),
      },
      list: {
        append: (l, a) => { nrArg('list.append', a, 1); l.a.push(a[0]); return null; },
        extend: (l, a) => { nrArg('list.extend', a, 1); l.a.push(...listaDin(a[0])); return null; },
        insert: (l, a) => { nrArg('insert', a, 2); let i = cereInt(a[0]); const n = l.a.length; i = i < 0 ? Math.max(0, i + n) : Math.min(i, n); l.a.splice(i, 0, a[1]); return null; },
        pop: (l, a) => { nrArg('pop', a, 0, 1); if (!l.a.length) throw E('IndexError', 'pop from empty list'); const i = a.length ? normIdx(cereInt(a[0]), l.a.length, 'pop index out of range') : l.a.length - 1; return l.a.splice(i, 1)[0]; },
        remove: (l, a) => { nrArg('list.remove', a, 1); const i = l.a.findIndex((x) => eq(x, a[0])); if (i < 0) throw E('ValueError', 'list.remove(x): x not in list'); l.a.splice(i, 1); return null; },
        index: (l, a) => { const st = a.length > 1 ? pozitie(null, a[1], l.a.length) : 0; const sf = a.length > 2 ? pozitie(null, a[2], l.a.length) : l.a.length; for (let i = st; i < sf; i++) if (eq(l.a[i], a[0])) return i; throw E('ValueError', `${repr(a[0])} is not in list`); },
        count: (l, a) => l.a.filter((x) => eq(x, a[0])).length,
        sort: (l, a, kw) => { if (a.length) throw E('TypeError', 'sort() takes no positional arguments'); faraKw('sort', kw, ['key', 'reverse']); const r = sorteaza(l.a, kwv(kw, 'key', null), truthy(kwv(kw, 'reverse', false))); l.a.length = 0; l.a.push(...r); return null; },
        reverse: (l) => { l.a.reverse(); return null; },
        clear: (l) => { l.a.length = 0; return null; },
        copy: (l) => new PyList(l.a.slice()),
      },
      tuple: {
        index: (l, a) => { const i = l.a.findIndex((x) => eq(x, a[0])); if (i < 0) throw E('ValueError', 'tuple.index(x): x not in tuple'); return i; },
        count: (l, a) => l.a.filter((x) => eq(x, a[0])).length,
      },
      dict: {
        get: (d, a) => { nrArg('get', a, 1, 2); const x = d.m.get(hk(a[0])); return x ? x[1] : a.length > 1 ? a[1] : null; },
        keys: (d) => new PyView('dict_keys', d), values: (d) => new PyView('dict_values', d), items: (d) => new PyView('dict_items', d),
        pop: (d, a) => { const h = hk(a[0]); const x = d.m.get(h); if (!x) { if (a.length > 1) return a[1]; throw E('KeyError', a[0]); } d.m.delete(h); return x[1]; },
        setdefault: (d, a) => { const h = hk(a[0]); const x = d.m.get(h); if (x) return x[1]; const v = a.length > 1 ? a[1] : null; d.m.set(h, [a[0], v]); return v; },
        update: (d, a, kw) => { if (a.length) { const s = a[0]; if (s instanceof PyDict) for (const [h, x] of s.m) { const o = d.m.get(h); if (o) o[1] = x[1]; else d.m.set(h, [x[0], x[1]]); } else for (const x of iterOf(s)) { const p = listaDin(x); setitem(d, p[0], p[1]); } } if (kw) for (const [k, v] of kw) setitem(d, k, v); return null; },
        clear: (d) => { d.m.clear(); return null; }, copy: (d) => { const r = new PyDict(); for (const [h, x] of d.m) r.m.set(h, [x[0], x[1]]); return r; },
        popitem: (d) => { if (!d.m.size) throw E('KeyError', 'popitem(): dictionary is empty'); const k = [...d.m.keys()].pop(); const x = d.m.get(k); d.m.delete(k); return new PyTuple(x); },
      },
      set: {
        add: (s, a) => { s.m.set(hk(a[0]), a[0]); return null; },
        remove: (s, a) => { const h = hk(a[0]); if (!s.m.has(h)) throw E('KeyError', a[0]); s.m.delete(h); return null; },
        discard: (s, a) => { s.m.delete(hk(a[0])); return null; },
        pop: (s) => { if (!s.m.size) throw E('KeyError', 'pop from an empty set'); const [h, x] = s.m.entries().next().value; s.m.delete(h); return x; },
        clear: (s) => { s.m.clear(); return null; },
        union: (s, a) => { let r = s; for (const x of a) r = binop('|', r, x instanceof PySet ? x : BUILTINS.get('set').make([x])); return r === s ? binop('|', s, new PySet()) : r; },
        intersection: (s, a) => { let r = s; for (const x of a) r = binop('&', r, x instanceof PySet ? x : BUILTINS.get('set').make([x])); return r === s ? binop('|', s, new PySet()) : r; },
        difference: (s, a) => { let r = s; for (const x of a) r = binop('-', r, x instanceof PySet ? x : BUILTINS.get('set').make([x])); return r === s ? binop('|', s, new PySet()) : r; },
        issubset: (s, a) => le(s, a[0] instanceof PySet ? a[0] : BUILTINS.get('set').make([a[0]])),
        copy: (s) => binop('|', s, new PySet()),
      },
      float: { is_integer: (x) => Number.isInteger(x.v), as_integer_ratio: (x) => { const { N, k } = zecimalExact(Math.abs(x.v)); let a = N, b = P10(k); const g = gcdB(a, b); a /= g; b /= g; return new PyTuple([nb(x.v < 0 ? -a : a), nb(b)]); } },
      int: { bit_length: (x) => { let v = BigInt(iv(x)); if (v < 0n) v = -v; return v === 0n ? 0 : v.toString(2).length; } },
    };
    METODE.bool = METODE.int;
    function titlu(s) { return s.replace(/[\p{L}]+/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()); }
    function gcdB(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) [a, b] = [b, a % b]; return a; }
    const METODE_INST = {};

    // =====================================================================
    // MODULE: math, random, time, turtle
    // =====================================================================
    const MODULE_STD = new Set(['math', 'random', 'time', 'turtle', 'sys']);
    const fnMod = (d, n, fn) => d.set(n, new PyBuiltin(n, fn));
    function domeniu(x) { if (x !== x) throw E('ValueError', 'math domain error'); return x; }
    function modulMath() {
      const d = new Map();
      d.set('pi', fl(Math.PI)); d.set('e', fl(Math.E)); d.set('tau', fl(2 * Math.PI)); d.set('inf', fl(Infinity)); d.set('nan', fl(NaN));
      const f1 = (n, fn, verif) => fnMod(d, n, (a, kw) => { doarCuv(n, a, kw, 1, 1); const x = cereNum(a[0], n); if (verif && !verif(x)) throw E('ValueError', 'math domain error'); return fl(fn(x)); });
      f1('sqrt', Math.sqrt, (x) => x >= 0 || x !== x); f1('fabs', Math.abs); f1('exp', Math.exp);
      f1('sin', Math.sin, Number.isFinite); f1('cos', Math.cos, Number.isFinite); f1('tan', Math.tan, Number.isFinite);
      f1('asin', Math.asin, (x) => x >= -1 && x <= 1); f1('acos', Math.acos, (x) => x >= -1 && x <= 1); f1('atan', Math.atan);
      f1('degrees', (x) => x * 180 / Math.PI); f1('radians', (x) => x * Math.PI / 180);
      f1('log10', Math.log10, (x) => x > 0); f1('log2', Math.log2, (x) => x > 0); f1('cbrt', Math.cbrt);
      fnMod(d, 'log', (a, kw) => { doarCuv('log', a, kw, 1, 2); const x = cereNum(a[0]); if (x <= 0) throw E('ValueError', 'math domain error'); if (a.length > 1) { const b = cereNum(a[1]); if (b <= 0 || b === 1) throw E(b === 1 ? 'ZeroDivisionError' : 'ValueError', b === 1 ? 'float division by zero' : 'math domain error'); return fl(Math.log(x) / Math.log(b)); } return fl(eInt(a[0]) && typeof a[0] === 'bigint' ? logMare(a[0]) : Math.log(x)); });
      fnMod(d, 'pow', (a, kw) => { doarCuv('pow', a, kw, 2, 2); const x = cereNum(a[0]), y = cereNum(a[1]); if (x === 0 && y < 0) throw E('ValueError', 'math domain error'); if (x < 0 && !Number.isInteger(y)) throw E('ValueError', 'math domain error'); const r = Math.pow(x, y); if (!Number.isFinite(r) && Number.isFinite(x) && Number.isFinite(y)) throw E('OverflowError', 'math range error'); return fl(r); });
      fnMod(d, 'atan2', (a, kw) => { doarCuv('atan2', a, kw, 2, 2); return fl(Math.atan2(cereNum(a[0]), cereNum(a[1]))); });
      fnMod(d, 'hypot', (a) => fl(Math.hypot(...a.map((x) => cereNum(x)))));
      const laIntreg = (x, fn, n) => { if (eInt(x)) return iv(x); const v = cereNum(x, n); if (!Number.isFinite(v)) throw E(v !== v ? 'ValueError' : 'OverflowError', v !== v ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer'); const r = fn(v); return Number.isSafeInteger(r) ? (r === 0 ? 0 : r) : nb(BigInt(r)); };
      fnMod(d, 'floor', (a, kw) => { doarCuv('floor', a, kw, 1, 1); return laIntreg(a[0], Math.floor, 'floor'); });
      fnMod(d, 'ceil', (a, kw) => { doarCuv('ceil', a, kw, 1, 1); return laIntreg(a[0], Math.ceil, 'ceil'); });
      fnMod(d, 'trunc', (a, kw) => { doarCuv('trunc', a, kw, 1, 1); return laIntreg(a[0], Math.trunc, 'trunc'); });
      fnMod(d, 'gcd', (a) => { let r = 0n; for (const x of a) r = gcdB(r, BigInt(cereInt(x))); return nb(r); });
      fnMod(d, 'lcm', (a) => { let r = 1n; for (const x of a) { const y = BigInt(cereInt(x)); if (y === 0n) return 0; r = r * (y < 0n ? -y : y) / gcdB(r, y); } return nb(r); });
      fnMod(d, 'factorial', (a, kw) => { doarCuv('factorial', a, kw, 1, 1); if (!eInt(a[0])) throw E('TypeError', `'${tn(a[0])}' object cannot be interpreted as an integer`); const n = BigInt(iv(a[0])); if (n < 0n) throw E('ValueError', 'factorial() not defined for negative values'); if (n > 20000n) throw E('OverflowError', 'numărul este prea mare'); let r = 1n; for (let i = 2n; i <= n; i++) r *= i; return nb(r); });
      fnMod(d, 'isqrt', (a, kw) => { doarCuv('isqrt', a, kw, 1, 1); const n = BigInt(cereInt(a[0])); if (n < 0n) throw E('ValueError', 'isqrt() argument must be nonnegative'); if (n < 2n) return nb(n); let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return nb(x); });
      fnMod(d, 'comb', (a) => { const n = BigInt(cereInt(a[0])), k = BigInt(cereInt(a[1])); if (n < 0n || k < 0n) throw E('ValueError', 'n must be a non-negative integer'); if (k > n) return 0; let r = 1n; for (let i = 1n; i <= k; i++) r = r * (n - k + i) / i; return nb(r); });
      fnMod(d, 'perm', (a) => { const n = BigInt(cereInt(a[0])), k = a.length > 1 ? BigInt(cereInt(a[1])) : n; if (k > n) return 0; let r = 1n; for (let i = 0n; i < k; i++) r *= n - i; return nb(r); });
      fnMod(d, 'isclose', (a, kw) => { const x = cereNum(a[0]), y = cereNum(a[1]); const rt = kw?.has('rel_tol') ? fv(kw.get('rel_tol')) : 1e-9, at = kw?.has('abs_tol') ? fv(kw.get('abs_tol')) : 0; return x === y || Math.abs(x - y) <= Math.max(rt * Math.max(Math.abs(x), Math.abs(y)), at); });
      fnMod(d, 'isnan', (a) => cereNum(a[0]) !== cereNum(a[0]));
      fnMod(d, 'isinf', (a) => Math.abs(cereNum(a[0])) === Infinity);
      fnMod(d, 'copysign', (a) => fl(Math.sign(cereNum(a[1])) * Math.abs(cereNum(a[0]))));
      fnMod(d, 'fsum', (a) => { let s = 0, c = 0; for (const x of iterOf(a[0])) { const y = cereNum(x) - c; const t = s + y; c = (t - s) - y; s = t; } return fl(s); });
      fnMod(d, 'prod', (a) => { let r = 1; for (const x of iterOf(a[0])) r = binop('*', r, x); return r; });
      return new PyModule('math', d);
    }
    function logMare(b) { const s = b.toString(); return Math.log(Number(`0.${s.slice(0, 17)}`)) + s.length * Math.LN10; }
    // generator pseudo-aleator cu sămânță (random.seed)
    function rndNou(seed) {
      let a = seed >>> 0 || 0x9e3779b9;
      return () => { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    function modulRandom() {
      const d = new Map();
      const r = () => (S.rnd ? S.rnd() : Math.random());
      const intre = (a, b) => { const A = BigInt(a), B = BigInt(b); const n = B - A + 1n; if (n <= 0n) throw E('ValueError', `empty range in randrange(${a}, ${nb(B + 1n)})`); if (n < 2n ** 52n) return nb(A + BigInt(Math.floor(r() * Number(n)))); let x = 0n; for (let i = 0; i < 4; i++) x = (x << 32n) | BigInt(Math.floor(r() * 4294967296)); return nb(A + (x % n)); };
      fnMod(d, 'random', (a, kw) => { doarCuv('random', a, kw, 0, 0); return fl(r()); });
      fnMod(d, 'randint', (a, kw) => { doarCuv('randint', a, kw, 2, 2); return intre(cereInt(a[0]), cereInt(a[1])); });
      fnMod(d, 'randrange', (a, kw) => {
        doarCuv('randrange', a, kw, 1, 3);
        const n = a.map((x) => cereInt(x));
        if (a.length === 1) { if (n[0] <= 0) throw E('ValueError', 'empty range in randrange(0)'); return intre(0, intop('-', n[0], 1)); }
        const st = a.length > 2 ? n[2] : 1;
        const cnt = lenRange(new PyRange(n[0], n[1], st));
        if (cnt <= 0) throw E('ValueError', `empty range in randrange(${n[0]}, ${n[1]}${a.length > 2 ? `, ${st}` : ''})`);
        return intop('+', n[0], intop('*', intre(0, intop('-', cnt, 1)), st));
      });
      fnMod(d, 'uniform', (a) => { const x = cereNum(a[0]), y = cereNum(a[1]); return fl(x + (y - x) * r()); });
      fnMod(d, 'choice', (a, kw) => { doarCuv('choice', a, kw, 1, 1); const n = len(a[0]); if (!n) throw E('IndexError', 'Cannot choose from an empty sequence'); return getitem(a[0], Math.floor(r() * n)); });
      fnMod(d, 'choices', (a, kw) => { const l = listaDin(a[0]); const k = cereInt(kwv(kw, 'k', 1)); const o = []; for (let i = 0; i < k; i++) o.push(l[Math.floor(r() * l.length)]); return new PyList(o); });
      fnMod(d, 'shuffle', (a, kw) => { doarCuv('shuffle', a, kw, 1, 1); const l = a[0]; if (!(l instanceof PyList)) throw E('TypeError', `'${tn(l)}' object does not support item assignment`); for (let i = l.a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l.a[i], l.a[j]] = [l.a[j], l.a[i]]; } return null; });
      fnMod(d, 'sample', (a) => { const l = listaDin(a[0]); const k = cereInt(a[1]); if (k > l.length || k < 0) throw E('ValueError', 'Sample larger than population or is negative'); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return new PyList(l.slice(0, k)); });
      fnMod(d, 'seed', (a) => { const v = a.length ? a[0] : null; S.rnd = v === null ? null : rndNou(eInt(v) ? Number(BigInt.asUintN(32, BigInt(iv(v)))) : hashNr(v)); return null; });
      return new PyModule('random', d);
    }
    function modulTime() {
      const d = new Map();
      fnMod(d, 'time', () => fl(Date.now() / 1000));
      fnMod(d, 'perf_counter', () => fl(Date.now() / 1000));
      fnMod(d, 'monotonic', () => fl(Date.now() / 1000));
      d.set('sleep', new PyBuiltin('sleep', null, function* (a, kw) { doarCuv('sleep', a, kw, 1, 1); const s = cereNum(a[0]); if (s < 0) throw E('ValueError', 'sleep length must be non-negative'); S.gazda.flush?.(); yield { t: 'sleep', ms: Math.min(s * 1000, 60000) }; S.t0 = Date.now(); return null; }));
      fnMod(d, 'ctime', () => new Date().toString());
      return new PyModule('time', d);
    }

    // ---------- turtle: geometria se calculează aici, desenul (animat) îl face pagina ----------
    const VITEZE = { fastest: 0, fast: 10, normal: 6, slow: 3, slowest: 1 };
    const CULORI = new Set('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy navyblue oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet violetred wheat white whitesmoke yellow yellowgreen'.split(' '));
    // culorile ca în Tk: nume (fără spații, cu variante numerotate: red2, gray50), #rgb sau #rrggbb
    function culoareText(c) {
      const k = c.toLowerCase().replace(/\s+/g, '');
      if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{12})$/.test(k)) return k.length === 13 ? `#${k.slice(1, 3)}${k.slice(5, 7)}${k.slice(9, 11)}` : k;
      let m = /^gr[ae]y(\d{1,3})$/.exec(k);
      if (m && +m[1] <= 100) { const v = Math.round(+m[1] * 2.55).toString(16).padStart(2, '0'); return `#${v}${v}${v}`; }
      if (k === 'green') return '#00ff00'; // în Tk „green” este verde aprins
      if (CULORI.has(k)) return k;
      m = /^([a-z]+)([1-4])$/.exec(k);
      if (m && CULORI.has(m[1])) return m[1];
      return null;
    }
    function culoareDin(args, tt) {
      if (args.length === 1 && typeof args[0] === 'string') { const c = culoareText(args[0]); if (!c) throw E('TurtleGraphicsError', `bad color string: ${args[0]}`); return c; }
      const l = args.length === 1 ? listaDin(args[0]) : args;
      if (l.length !== 3) throw E('TurtleGraphicsError', `bad color arguments: ${repr(new PyTuple(args))}`);
      const v = l.map((x) => cereNum(x));
      const m = tt.cm;
      if (v.some((x) => x < 0 || x > m)) throw E('TurtleGraphicsError', `bad color sequence: ${repr(new PyTuple(l))}`);
      return `#${v.map((x) => Math.round(m === 1 ? x * 255 : x).toString(16).padStart(2, '0')).join('')}`;
    }
    function culoareInapoi(c, tt) {
      if (/^#[0-9a-f]{6}$/i.test(c) && tt.cm === 255 && tt.tupluri) return new PyTuple([1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
      return c;
    }
    function modulTurtle() {
      const tt = { n: 0, cm: 1, implicit: null, ecran: null, tracer: true };
      S.tt = tt;
      const desen = (op) => S.gazda.desen?.(op);
      const d = new Map();
      function stare(o) { return o.st; }
      function testoasaNoua() {
        const st = { id: ++tt.n, x: 0, y: 0, h: 0, pen: true, pc: 'black', fc: 'black', w: 1, vis: true, forma: 'classic', sp: 3, fill: null, scara: 1 };
        const o = new PyInst('Turtle', new Map());
        o.st = st;
        desen({ o: 'nou', id: st.id, forma: st.forma });
        return o;
      }
      const imp = () => { if (!tt.implicit) tt.implicit = testoasaNoua(); return tt.implicit; };
      const ecran = () => { if (!tt.ecran) { tt.ecran = new PyInst('_Screen', new Map()); } return tt.ecran; };
      const rot = (x) => Math.round(x * 1e10) / 1e10;
      function merge(st, nx, ny) {
        const x0 = st.x, y0 = st.y;
        st.x = rot(nx); st.y = rot(ny);
        desen({ o: 'mv', id: st.id, x0, y0, x: st.x, y: st.y, pen: st.pen, c: st.pc, w: st.w, sp: tt.tracer ? st.sp : 0 });
        if (st.fill) st.fill.push([st.x, st.y]);
      }
      function roteste(st, unghi) {
        st.h = ((st.h + unghi) % 360 + 360) % 360;
        st.h = rot(st.h);
        desen({ o: 'rot', id: st.id, h: st.h, d: unghi, sp: tt.tracer ? st.sp : 0 });
      }
      const nr = (v, n) => cereNum(v, n);
      const M = {
        forward: (st, a) => { nrArg('forward', a, 1); const dd = nr(a[0]); const r = st.h * Math.PI / 180; merge(st, st.x + dd * Math.cos(r), st.y + dd * Math.sin(r)); return null; },
        back: (st, a) => { nrArg('back', a, 1); const dd = -nr(a[0]); const r = st.h * Math.PI / 180; merge(st, st.x + dd * Math.cos(r), st.y + dd * Math.sin(r)); return null; },
        left: (st, a) => { nrArg('left', a, 1); roteste(st, nr(a[0])); return null; },
        right: (st, a) => { nrArg('right', a, 1); roteste(st, -nr(a[0])); return null; },
        goto: (st, a) => { let x, y; if (a.length === 1) [x, y] = listaDin(a[0]).map((v) => nr(v)); else { nrArg('goto', a, 2); x = nr(a[0]); y = nr(a[1]); } merge(st, x, y); return null; },
        setx: (st, a) => { merge(st, nr(a[0]), st.y); return null; },
        sety: (st, a) => { merge(st, st.x, nr(a[0])); return null; },
        setheading: (st, a) => { nrArg('setheading', a, 1); const t = ((nr(a[0]) % 360) + 360) % 360; let dd = t - st.h; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; roteste(st, dd); return null; },
        home: (st) => { merge(st, 0, 0); M.setheading(st, [0]); return null; },
        circle: (st, a, kw) => {
          const r = nr(a[0]);
          const ext = a.length > 1 && a[1] !== null ? nr(a[1]) : kwv(kw, 'extent', null) !== null ? nr(kw.get('extent')) : 360;
          let pasi = a.length > 2 && a[2] !== null ? cereInt(a[2]) : kwv(kw, 'steps', null) !== null ? cereInt(kw.get('steps')) : null;
          if (pasi === null) pasi = 1 + Math.floor(Math.min(11 + Math.abs(r) / 6, 59) * Math.abs(ext) / 360);
          let w = ext / pasi, w2 = 0.5 * w;
          let l = 2 * r * Math.sin(w2 * Math.PI / 180);
          if (r < 0) { l = -l; w = -w; w2 = -w2; }
          const sp = st.sp;
          st.sp = 0; roteste(st, w2); st.sp = sp;
          for (let i = 0; i < pasi; i++) { const rr = st.h * Math.PI / 180; merge(st, st.x + l * Math.cos(rr), st.y + l * Math.sin(rr)); st.sp = 0; roteste(st, w); st.sp = sp; }
          st.sp = 0; roteste(st, -w2); st.sp = sp;
          return null;
        },
        dot: (st, a) => { const sz = a.length && a[0] !== null ? nr(a[0]) : Math.max(st.w + 4, st.w * 2); const c = a.length > 1 ? culoareDin(a.slice(1), tt) : st.pc; desen({ o: 'dot', id: st.id, x: st.x, y: st.y, s: sz, c }); return null; },
        write: (st, a, kw) => {
          const txt = str(a[0]);
          const align = String(a.length > 2 ? a[2] : kwv(kw, 'align', 'left'));
          const font = a.length > 3 ? a[3] : kwv(kw, 'font', null);
          const fl2 = font ? listaDin(font) : ['Arial', 8, 'normal'];
          desen({ o: 'txt', id: st.id, x: st.x, y: st.y, s: txt, align, font: [str(fl2[0] ?? 'Arial'), Number(fv(fl2[1] ?? 8)), str(fl2[2] ?? 'normal')], c: st.pc });
          return null;
        },
        penup: (st) => { st.pen = false; return null; }, pendown: (st) => { st.pen = true; return null; }, isdown: (st) => st.pen,
        pensize: (st, a) => { if (!a.length) return st.w; st.w = nr(a[0]); return null; },
        speed: (st, a) => { if (!a.length) return st.sp; const v = a[0]; let s = typeof v === 'string' ? VITEZE[v] : nr(v); if (s === undefined) throw E('TurtleGraphicsError', `bad speed: ${v}`); s = s > 10 || s < 0.5 ? 0 : Math.round(s); st.sp = s; return null; },
        pencolor: (st, a) => { if (!a.length) return culoareInapoi(st.pc, tt); st.pc = culoareDin(a, tt); desen({ o: 'cul', id: st.id, pc: st.pc, fc: st.fc }); return null; },
        fillcolor: (st, a) => { if (!a.length) return culoareInapoi(st.fc, tt); st.fc = culoareDin(a, tt); desen({ o: 'cul', id: st.id, pc: st.pc, fc: st.fc }); return null; },
        color: (st, a) => {
          if (!a.length) return new PyTuple([culoareInapoi(st.pc, tt), culoareInapoi(st.fc, tt)]);
          if (a.length === 2) { st.pc = culoareDin([a[0]], tt); st.fc = culoareDin([a[1]], tt); } else if (a.length === 3) { st.pc = st.fc = culoareDin(a, tt); } else st.pc = st.fc = culoareDin(a, tt);
          desen({ o: 'cul', id: st.id, pc: st.pc, fc: st.fc });
          return null;
        },
        begin_fill: (st) => { st.fill = [[st.x, st.y]]; desen({ o: 'bf', id: st.id }); return null; },
        end_fill: (st) => { if (st.fill) { desen({ o: 'ef', id: st.id, pts: st.fill, c: st.fc }); st.fill = null; } return null; },
        filling: (st) => !!st.fill,
        hideturtle: (st) => { st.vis = false; desen({ o: 'vis', id: st.id, v: false }); return null; },
        showturtle: (st) => { st.vis = true; desen({ o: 'vis', id: st.id, v: true }); return null; },
        isvisible: (st) => st.vis,
        shape: (st, a) => { if (!a.length) return st.forma; const f = str(a[0]); if (!['arrow', 'turtle', 'circle', 'square', 'triangle', 'classic', 'blank'].includes(f)) throw E('TurtleGraphicsError', `There is no shape named ${f}`); st.forma = f; desen({ o: 'forma', id: st.id, forma: f }); return null; },
        shapesize: (st, a) => { if (!a.length) return new PyTuple([fl(st.scara), fl(st.scara), 1]); st.scara = nr(a[0]); desen({ o: 'scara', id: st.id, s: st.scara }); return null; },
        position: (st) => vec(st.x, st.y),
        xcor: (st) => fl(st.x), ycor: (st) => fl(st.y), heading: (st) => fl(st.h),
        distance: (st, a) => { let x, y; if (a.length === 1) [x, y] = (a[0] instanceof PyInst && a[0].st ? [a[0].st.x, a[0].st.y] : listaDin(a[0]).map((v) => nr(v))); else { x = nr(a[0]); y = nr(a[1]); } return fl(Math.hypot(x - st.x, y - st.y)); },
        towards: (st, a) => { let x, y; if (a.length === 1) [x, y] = (a[0] instanceof PyInst && a[0].st ? [a[0].st.x, a[0].st.y] : listaDin(a[0]).map((v) => nr(v))); else { x = nr(a[0]); y = nr(a[1]); } return fl(((Math.atan2(y - st.y, x - st.x) * 180 / Math.PI) + 360) % 360); },
        clear: (st) => { desen({ o: 'clear', id: st.id }); return null; },
        reset: (st) => { desen({ o: 'clear', id: st.id }); Object.assign(st, { pen: true, pc: 'black', fc: 'black', w: 1, fill: null }); merge(st, 0, 0); M.setheading(st, [0]); desen({ o: 'cul', id: st.id, pc: st.pc, fc: st.fc }); return null; },
        stamp: (st) => { desen({ o: 'stamp', id: st.id, x: st.x, y: st.y, h: st.h }); return 0; },
        getscreen: () => ecran(),
        clone: (st) => { const o = testoasaNoua(); Object.assign(o.st, { ...st, id: o.st.id, fill: null }); desen({ o: 'cul', id: o.st.id, pc: st.pc, fc: st.fc }); desen({ o: 'mv', id: o.st.id, x0: st.x, y0: st.y, x: st.x, y: st.y, pen: false, sp: 0 }); desen({ o: 'rot', id: o.st.id, h: st.h, d: 0, sp: 0 }); return o; },
        onclick: () => null, ondrag: () => null, onrelease: () => null,
      };
      const alias = { fd: 'forward', bk: 'back', backward: 'back', lt: 'left', rt: 'right', setpos: 'goto', setposition: 'goto', teleport: 'goto', seth: 'setheading', pu: 'penup', up: 'penup', pd: 'pendown', down: 'pendown', width: 'pensize', ht: 'hideturtle', st: 'showturtle', pos: 'position', turtlesize: 'shapesize' };
      for (const [a, b] of Object.entries(alias)) M[a] = M[b];
      const vec = (x, y) => { const o = new PyInst('Vec2D', new Map([['x', fl(x)], ['y', fl(y)]])); return o; };
      METODE_INST.Turtle = {};
      for (const [n, fn] of Object.entries(M)) {
        METODE_INST.Turtle[n] = (o, a, kw) => fn(stare(o), a, kw);
        d.set(n, new PyBuiltin(n, (a, kw) => fn(stare(imp()), a, kw)));
      }
      METODE_INST.Vec2D = {};
      // ecranul
      const SC = {
        bgcolor: (a) => { if (!a.length) return tt.bg || 'white'; tt.bg = culoareDin(a, tt); desen({ o: 'bg', c: tt.bg }); return null; },
        title: (a) => { desen({ o: 'titlu', s: str(a[0]) }); return null; },
        setup: (a, kw) => { const w = a.length ? a[0] : kwv(kw, 'width', null), h = a.length > 1 ? a[1] : kwv(kw, 'height', null); desen({ o: 'setup', w: w === null ? null : fv(w), h: h === null ? null : fv(h) }); return null; },
        screensize: () => null,
        tracer: (a) => { if (!a.length) return tt.tracer ? 1 : 0; tt.tracer = truthy(a[0]); desen({ o: 'tracer', v: tt.tracer }); return null; },
        update: () => { desen({ o: 'update' }); return null; },
        colormode: (a) => { if (!a.length) return tt.cm === 1 ? fl(1) : 255; const v = fv(a[0]); if (v !== 1 && v !== 255) throw E('TurtleGraphicsError', `bad color mode ${v}`); tt.cm = v; return null; },
        done: () => null, mainloop: () => null, exitonclick: () => null, bye: () => null, listen: () => null, onkey: () => null, onkeypress: () => null, onclick: () => null, onscreenclick: () => null, ontimer: () => null, delay: () => null,
        clear: () => { desen({ o: 'clearall' }); return null; }, clearscreen: () => { desen({ o: 'clearall' }); return null; },
        reset: () => { desen({ o: 'clearall' }); return null; },
        window_width: () => 640, window_height: () => 480,
        turtles: () => new PyList([]),
        textinput: () => { throw E('NotImplementedError', 'textinput() nu este disponibil aici; folosește input()'); },
        numinput: () => { throw E('NotImplementedError', 'numinput() nu este disponibil aici; folosește input()'); },
      };
      METODE_INST._Screen = {};
      for (const [n, fn] of Object.entries(SC)) {
        METODE_INST._Screen[n] = (o, a, kw) => fn(a, kw);
        if (!d.has(n) || n === 'clear' || n === 'reset') { if (n !== 'clear' && n !== 'reset') d.set(n, new PyBuiltin(n, (a, kw) => fn(a, kw))); }
      }
      d.set('clearscreen', new PyBuiltin('clearscreen', (a, kw) => SC.clearscreen(a, kw)));
      const tT = new PyType('Turtle', null, () => testoasaNoua()); tT.modul = 'turtle';
      d.set('Turtle', tT); d.set('Pen', tT); d.set('RawTurtle', tT);
      d.set('Screen', new PyBuiltin('Screen', () => ecran()));
      d.set('getscreen', new PyBuiltin('getscreen', () => ecran()));
      d.set('Vec2D', new PyBuiltin('Vec2D', (a) => vec(fv(a[0]), fv(a[1]))));
      return new PyModule('turtle', d);
    }
    function importa(nume) {
      if (S.module.has(nume)) return S.module.get(nume);
      let m;
      switch (nume) {
        case 'math': m = modulMath(); break;
        case 'random': m = modulRandom(); break;
        case 'time': m = modulTime(); break;
        case 'sys': { const d = new Map(); d.set('exit', BUILTINS.get('exit')); d.set('argv', new PyList([S.fisierCurent])); d.set('maxsize', 9223372036854775807n); d.set('setrecursionlimit', new PyBuiltin('setrecursionlimit', () => null)); d.set('version', '3.13.0 (edudigi)'); m = new PyModule('sys', d); break; }
        case 'turtle': m = modulTurtle(); break;
        default: {
          const e = E('ModuleNotFoundError', `No module named '${nume}'`);
          e.modul = nume;
          throw e;
        }
      }
      S.module.set(nume, m);
      return m;
    }

    // =====================================================================
    // MESAJELE DE EROARE (ca în Python + explicația în română)
    // =====================================================================
    function explica(tip, mesaj, ctx = {}) {
      const r = ctx.rand ? ` (rândul ${ctx.rand})` : '';
      const l = ctx.linie || '';
      let m;
      switch (tip) {
        case 'IndentationError':
          if (/expected an indented block/.test(mesaj)) return `${r} – după „:” trebuie să scrii rândurile următoare mai la dreapta (4 spații sau tasta Tab), ca să arăți că fac parte din ${/function/.test(mesaj) ? 'funcție' : /'(if|elif|else)'/.test(mesaj) ? 'acel if/else' : /'(for|while)'/.test(mesaj) ? 'buclă' : 'acel bloc'}.`;
          if (/unexpected indent/.test(mesaj)) return `${r} – rândul începe mai la dreapta decât ar trebui. Șterge spațiile de la începutul lui sau aliniază-l cu rândurile de deasupra.`;
          if (/unindent does not match/.test(mesaj)) return `${r} – rândul nu este aliniat cu niciun bloc de deasupra. Folosește același număr de spații ca rândul cu care vrei să fie aliniat (de obicei multipli de 4).`;
          return `${r} – verifică alinierea (indentarea) rândurilor.`;
        case 'SyntaxError':
          if (/Maybe you meant '==' or ':='/.test(mesaj)) return `${r} – în condiții se compară cu == (două semne egal). Un singur = înseamnă „primește valoarea” (atribuire).`;
          if (/expected ':'/.test(mesaj)) return `${r} – la sfârșitul rândurilor cu if, elif, else, while, for și def trebuie pus semnul două puncte „:”.`;
          if (/was never closed/.test(mesaj)) return `${r} – ai deschis o paranteză pe care nu ai închis-o. Numără parantezele: fiecare ( are nevoie de o ).`;
          if (/unmatched|does not match opening/.test(mesaj)) return `${r} – parantezele nu se potrivesc: verifică dacă fiecare paranteză închisă are o pereche deschisă de același fel.`;
          if (/Missing parentheses in call to 'print'/.test(mesaj)) return `${r} – în Python 3, print este o funcție: scrie textul între paranteze, de exemplu print("Salut").`;
          if (/unterminated (triple-quoted )?string/.test(mesaj)) return `${r} – ai deschis ghilimelele, dar nu le-ai închis. Textul trebuie să fie între ghilimele de același fel: "text" sau 'text'.`;
          if (/forgot a comma/.test(mesaj)) return `${r} – între elemente (sau între textul și variabila din print) trebuie pusă o virgulă.`;
          if (/cannot assign to/.test(mesaj)) return `${r} – în stânga semnului = trebuie să fie numele unei variabile. Dacă voiai să compari două valori, folosește ==.`;
          if (/'return' outside function/.test(mesaj)) return `${r} – return poate fi folosit doar în interiorul unei funcții (def).`;
          if (/'break' outside loop|'continue' not properly/.test(mesaj)) return `${r} – break și continue se pot folosi doar în interiorul unei bucle for sau while.`;
          if (/invalid character/.test(mesaj)) return `${r} – rândul conține un caracter pe care Python nu îl acceptă în cod (de exemplu ghilimele „curbate” copiate dintr-un document). Folosește ghilimelele de la tastatură: " sau '.`;
          if (/invalid decimal literal/.test(mesaj)) return `${r} – un nume de variabilă nu poate începe cu o cifră, iar între număr și literă trebuie un operator (de exemplu 2*x, nu 2x).`;
          if (/leading zeros/.test(mesaj)) return `${r} – numerele întregi nu pot începe cu 0 (scrie 7, nu 07).`;
          if (/expected 'except' or 'finally'/.test(mesaj)) return `${r} – după blocul try trebuie să urmeze except (sau finally).`;
          if (/f-string/.test(mesaj)) return `${r} – verifică acoladele din textul f"...": fiecare { trebuie închisă cu }.`;
          if (/positional argument follows keyword/.test(mesaj)) return `${r} – argumentele cu nume (de exemplu sep=" ") se pun la final, după celelalte.`;
          if (/parameter without a default/.test(mesaj)) return `${r} – parametrii cu valoare implicită se scriu după cei fără valoare implicită.`;
          if (/nu sunt disponibile|nu este disponibil/.test(mesaj)) return `${r} – această parte a limbajului nu este disponibilă în editorul de la clasă.`;
          if (/^\s*(else|elif)\b/.test(l)) return `${r} – „${l.trim().split(/[\s:]/)[0]}” trebuie să fie aliniat exact sub if-ul căruia îi aparține (și să nu fie singur, fără if deasupra).`;
          if (/(\+\+|--)\s*$/.test(l)) return `${r} – în Python nu există ++ și --. Scrie x += 1 (sau x -= 1).`;
          if (/^\s*(if|elif|while|for|def|else)\b[^:]*$/.test(l)) return `${r} – verifică rândul: probabil lipsește „:” de la sfârșit.`;
          if (/\b(and|or|not)\b/.test(l) === false && /&&|\|\||!(?!=)/.test(l)) return `${r} – în Python se scrie and, or, not (nu &&, ||, !).`;
          return `${r} – Python nu înțelege ce ai scris aici. Verifică parantezele, ghilimelele, semnul „:” și operatorii de pe acest rând (sau de pe rândul de deasupra).`;
        case 'NameError':
          m = /name '([^']+)' is not defined/.exec(mesaj);
          if (m) {
            const sug = /Did you mean: '([^']+)'/.exec(mesaj), imp = /forget to import '([^']+)'/.exec(mesaj);
            let t = `${r} – Python nu cunoaște numele „${m[1]}”.`;
            if (imp) return `${t} Ca să folosești modulul ${imp[1]}, scrie la începutul programului: import ${imp[1]}`;
            if (sug) return `${t} Poate ai vrut să scrii „${sug[1]}”? (Literele mari și mici contează.)`;
            if (/^[A-Za-zăâîșțĂÂÎȘȚ]+$/.test(m[1]) && ctx.linie && new RegExp(`print\\s*\\(\\s*${m[1]}\\b`).test(ctx.linie) && m[1].length > 2) t += ` Dacă voiai să afișezi un text, pune-l între ghilimele: print("${m[1]}").`;
            else t += ' Verifică dacă l-ai scris corect și dacă variabila primește o valoare înainte de acest rând (sau dacă funcția a fost definită mai sus).';
            return t;
          }
          return `${r} – un nume folosit nu este cunoscut.`;
        case 'UnboundLocalError':
          m = /local variable '([^']+)'/.exec(mesaj);
          return `${r} – în funcție folosești variabila „${m ? m[1] : ''}” înainte să-i dai o valoare. Dacă voiai variabila din afara funcției, scrie la începutul funcției: global ${m ? m[1] : 'nume'}.`;
        case 'TypeError':
          if (/can only concatenate str \(not "(int|float)"\) to str/.test(mesaj)) return `${r} – nu poți aduna (+) un text cu un număr. Transformă numărul în text cu str(...), de exemplu "Ai " + str(x) + " puncte", sau folosește virgula în print: print("Ai", x, "puncte").`;
          if (/can only concatenate str/.test(mesaj)) return `${r} – un text (str) se poate lipi cu + doar de alt text.`;
          if (/unsupported operand type\(s\) for [^:]+: '(int|float)' and 'str'|unsupported operand type\(s\) for [^:]+: 'str' and '(int|float)'/.test(mesaj)) return `${r} – încerci un calcul între un număr și un text. Atenție: input() întoarce mereu text; pentru numere scrie int(input()) sau float(input()).`;
          if (/'NoneType'/.test(mesaj) && /unsupported operand|not supported/.test(mesaj)) return `${r} – una dintre valori este None (nimic). Probabil o funcție nu întoarce nimic: îi lipsește return.`;
          if (/not supported between instances of '(str)' and '(int|float)'|not supported between instances of '(int|float)' and 'str'/.test(mesaj)) return `${r} – nu poți compara un text cu un număr. Probabil ai citit valoarea cu input() fără int(...).`;
          if (/can't multiply sequence by non-int of type 'str'/.test(mesaj)) return `${r} – nu poți înmulți două texte. Dacă sunt numere citite cu input(), transformă-le cu int(...).`;
          if (/can't multiply sequence by non-int of type 'float'/.test(mesaj)) return `${r} – un text sau o listă se pot înmulți doar cu un număr întreg.`;
          if (/object is not callable/.test(mesaj)) { m = /'([^']+)' object is not callable/.exec(mesaj); return `${r} – pui paranteze după ceva care nu este funcție (o valoare de tip ${m ? m[1] : ''}). Poate lipsește un operator: 2(x+1) se scrie 2*(x+1); sau ai dat unei variabile numele unei funcții (de exemplu sum = 0 și apoi sum(...)).`; }
          if (/missing \d+ required positional argument/.test(mesaj)) return `${r} – funcția are nevoie de mai multe valori între paranteze decât i-ai dat. Compară apelul cu rândul def al funcției.`;
          if (/takes .* positional argument.* but \d+ (was|were) given/.test(mesaj)) return `${r} – i-ai dat funcției mai multe valori între paranteze decât are parametri.`;
          if (/object is not iterable/.test(mesaj)) return `${r} – for poate parcurge doar o colecție (listă, text, range ...). Pentru a repeta de n ori scrie: for i in range(n):`;
          if (/object is not subscriptable/.test(mesaj)) return `${r} – parantezele drepte [ ] se folosesc doar la liste, texte, tupluri și dicționare.`;
          if (/indices must be integers/.test(mesaj)) return `${r} – poziția (indicele) dintre [ ] trebuie să fie un număr întreg. Pentru împărțire folosește // (câtul întreg) în loc de /.`;
          if (/cannot be interpreted as an integer/.test(mesaj)) return `${r} – aici trebuie un număr întreg (de exemplu în range()). Folosește int(...) sau împărțirea întreagă //.`;
          if (/does not support item assignment/.test(mesaj)) return `${r} – textele (str) și tuplurile nu pot fi modificate pe poziții. Construiește un text nou sau folosește o listă.`;
          if (/has no len\(\)/.test(mesaj)) return `${r} – len() se poate folosi doar pentru texte, liste, tupluri și dicționare, nu pentru numere. Pentru numărul de cifre: len(str(n)).`;
          if (/int\(\) argument must be/.test(mesaj)) return `${r} – int() poate transforma în număr doar un text sau un număr.`;
          if (/unhashable type/.test(mesaj)) return `${r} – o listă nu poate fi cheie într-un dicționar sau element într-o mulțime.`;
          if (/sequence item \d+: expected str instance/.test(mesaj)) return `${r} – join() lipește doar texte. Transformă numerele în text: " ".join(str(x) for x in lista).`;
          return `${r} – operația nu se poate face cu valori de acest tip.`;
        case 'ZeroDivisionError': return `${r} – ai împărțit la zero (sau ai calculat restul împărțirii la zero). Verifică împărțitorul înainte, de exemplu: if b != 0:`;
        case 'IndexError':
          if (/out of range/.test(mesaj)) return `${r} – ai folosit o poziție care nu există. Pozițiile (indicii) încep de la 0, deci ultima poziție este len(...) - 1.${/list/.test(mesaj) && /\bfor\b.*range\(.*\+\s*1|<=/.test(l) ? ' Verifică limitele din range().' : ''}`;
          if (/pop from empty list/.test(mesaj)) return `${r} – lista este goală, nu ai ce scoate din ea.`;
          return `${r} – poziție greșită.`;
        case 'KeyError': return `${r} – cheia ${mesaj} nu există în dicționar. Verifică înainte cu if cheie in dictionar: sau folosește dictionar.get(cheie).`;
        case 'ValueError':
          if (/invalid literal for int\(\) with base 10: (.*)/.test(mesaj)) { m = /base 10: (.*)$/.exec(mesaj); return `${r} – int() poate transforma în număr întreg doar un text care conține cifre. Valoarea ${m[1]} nu este un număr întreg${/\./.test(m[1]) ? ' (pentru numere cu virgulă folosește float(...))' : ''}.`; }
          if (/could not convert string to float/.test(mesaj)) return `${r} – textul nu este un număr. Atenție: în Python numerele cu zecimale se scriu cu punct (3.5), nu cu virgulă.`;
          if (/math domain error/.test(mesaj)) return `${r} – funcția matematică nu are sens pentru această valoare (de exemplu radicalul unui număr negativ).`;
          if (/too many values to unpack/.test(mesaj)) return `${r} – în stânga semnului = sunt mai puține variabile decât valori în dreapta.`;
          if (/not enough values to unpack/.test(mesaj)) return `${r} – în stânga semnului = sunt mai multe variabile decât valori în dreapta${/split\(\)/.test(l) ? ' (ai introdus mai puține numere pe rând decât trebuia)' : ''}.`;
          if (/not in list/.test(mesaj)) return `${r} – valoarea căutată nu se află în listă. Verifică înainte cu if x in lista:`;
          if (/substring not found/.test(mesaj)) return `${r} – textul căutat nu apare. Folosește find(), care întoarce -1 când nu găsește.`;
          if (/empty range in randrange/.test(mesaj)) return `${r} – la randint(a, b) trebuie ca a să fie mai mic sau egal cu b.`;
          if (/iterable argument is empty/.test(mesaj)) return `${r} – nu se poate calcula minimul sau maximul unei liste goale.`;
          return `${r} – valoarea nu este potrivită pentru această operație.`;
        case 'AttributeError':
          m = /'([^']+)' object has no attribute '([^']+)'/.exec(mesaj);
          if (m) return `${r} – valorile de tip ${m[1]} nu au metoda/atributul „${m[2]}”. Verifică scrierea${/Did you mean/.test(mesaj) ? ' (vezi sugestia de mai sus)' : ''}.`;
          m = /module '([^']+)' has no attribute '([^']+)'/.exec(mesaj);
          if (m) return `${r} – modulul ${m[1]} nu are funcția „${m[2]}”. Verifică scrierea.`;
          return `${r} – atribut necunoscut.`;
        case 'RecursionError': return `${r} – funcția se apelează pe ea însăși de prea multe ori. Verifică dacă are un caz în care se oprește (de exemplu if n == 0: return 1) și dacă ajunge la el.`;
        case 'ModuleNotFoundError': return `${r} – modulul nu este disponibil. În acest editor poți folosi: math, random, time și turtle.`;
        case 'ImportError': return `${r} – numele nu există în acel modul.`;
        case 'EOFError': return `${r} – programul a cerut date (input), dar nu mai sunt date de citit.`;
        case 'OverflowError': return `${r} – numărul este prea mare pentru acest calcul.`;
        case 'AssertionError': return `${r} – condiția din assert este falsă.`;
        case 'TurtleGraphicsError': return `${r} – valoare greșită pentru țestoasă (de exemplu o culoare necunoscută; folosește nume în engleză: "red", "blue" sau "#ff8800").`;
        default: return r ? `${r}.` : '';
      }
    }
    function formateazaExceptie(err) {
      if (err instanceof Oprire) {
        const rr = err.rand ? ` (rândul ${err.rand})` : '';
        return { text: `Programul a fost oprit${rr}.\n`, expl: `${err.mesaj.charAt(0).toUpperCase()}${err.mesaj.slice(1)}. Probabil are o buclă infinită: verifică dacă se schimbă variabila din condiția lui while și dacă bucla ajunge să se oprească.`, rand: err.rand, tip: 'Oprire' };
      }
      if (err instanceof RangeError) { err = E('RecursionError', 'maximum recursion depth exceeded'); err.tb = traceback(); }
      if (!(err instanceof PyExcObj)) return { text: `Eroare internă a editorului: ${err && err.message}\n`, expl: '', rand: null, tip: 'intern' };
      const tb = (err.tb || traceback()).slice();
      // prea multe niveluri (recursivitate): ca în Python, se rezumă repetările
      let linii = ['Traceback (most recent call last):'];
      let prev = null, rep = 0;
      const scrieRep = () => { if (rep > 3) linii.push(`  [Previous line repeated ${rep - 3} more time${rep - 3 > 1 ? 's' : ''}]`); };
      for (const fr of tb) {
        const cheie = `${fr.fisier}|${fr.line}|${fr.name}`;
        if (cheie === prev) { rep++; if (rep > 3) continue; } else { scrieRep(); prev = cheie; rep = 1; }
        linii.push(`  File "${fr.fisier}", line ${fr.line}, in ${fr.name}`);
        const t = (fr.src || [])[fr.line - 1];
        if (t && t.trim()) linii.push(`    ${t.trim()}`);
      }
      scrieRep();
      const ultim = tb[tb.length - 1];
      const mesajStr = str(err);
      linii.push(mesajStr ? `${err.type.name}: ${mesajStr}` : err.type.name);
      const rand = ultim ? ultim.line : null;
      const linie = ultim && ultim.src ? ultim.src[ultim.line - 1] || '' : '';
      // rândul arătat în explicație: cel din programul elevului (nu din Shell)
      return { text: `${linii.join('\n')}\n`, expl: `${err.type.name}${explica(err.type.name, err.type.name === 'KeyError' ? repr(err.args[0]) : mesajStr, { rand, linie })}`, rand, tip: err.type.name, fisier: ultim?.fisier };
    }
    function formateazaSintaxa(e, src, fisier) {
      const linie = (src.split('\n')[e.rand - 1] || '').replace(/\t/g, '    ');
      const ind = linie.length - linie.trimStart().length;
      const col = Math.max(0, Math.min(e.col - ind, linie.trimStart().length));
      const marcaj = e.tip === 'IndentationError' && /unexpected indent/.test(e.mesaj) ? '' : `\n    ${' '.repeat(col)}${'^'.repeat(Math.max(1, Math.min(e.lung || 1, Math.max(1, linie.trimStart().length - col))))}`;
      const text = `  File "${fisier}", line ${e.rand}\n    ${linie.trim()}${marcaj}\n${e.tip}: ${e.mesaj}\n`;
      return { text, expl: `${e.tip}${explica(e.tip, e.mesaj, { rand: e.rand, linie })}`, rand: e.rand, tip: e.tip, fisier };
    }

    // =====================================================================
    // SESIUNEA: rularea unui program, comenzile din Shell, variabilele
    // =====================================================================
    function sesiuneNoua(gazda) { S = stareNoua(gazda); return S; }
    // rulează un program: întoarce un generator care produce cereri (input / sleep / pas) și la final { ok, eroare }
    function* ruleaza(cod, fisier = '<untitled>', opt = {}) {
      S = stareNoua(S ? S.gazda : opt.gazda);
      if (opt.gazda) S.gazda = opt.gazda;
      S.dbg = !!opt.dbg;
      S.srcCurent = cod.replace(/\r\n?/g, '\n').split('\n');
      S.fisierCurent = fisier;
      if (opt.seed != null) S.rnd = rndNou(opt.seed);
      let ast;
      try { ast = compileaza(cod, S.suspecte); } catch (e) {
        if (e instanceof ErSintaxa) return { ok: false, eroare: formateazaSintaxa(e, cod, fisier) };
        return { ok: false, eroare: { text: `Eroare internă a editorului: ${e.message}\n`, expl: '', rand: null } };
      }
      return yield* executaModul(ast);
    }
    function* executaModul(ast) {
      const fr = { name: '<module>', loc: null, glob: S.G, line: 1, src: S.srcCurent, fisier: S.fisierCurent };
      S.stack = [fr];
      S.t0 = Date.now();
      try {
        yield* execBloc(ast, fr);
        return { ok: true };
      } catch (err) {
        if (err instanceof Iesire) return { ok: true, iesire: err.cod };
        if (err instanceof PyExcObj && err.type.name === 'SystemExit') return { ok: true };
        return { ok: false, eroare: formateazaExceptie(err) };
      } finally { S.stack = []; S.dbg = false; }
    }
    // o comandă scrisă în Shell (>>>): expresiile își afișează valoarea
    function* comanda(cod) {
      if (!S) S = stareNoua(null);
      S.dbg = false;
      S.srcCurent = cod.split('\n');
      S.fisierCurent = '<pyshell>';
      let ast;
      try { ast = compileaza(cod, S.suspecte); } catch (e) {
        if (e instanceof ErSintaxa) return { ok: false, eroare: formateazaSintaxa(e, cod, '<pyshell>') };
        throw e;
      }
      for (const s of ast) if (s.k === 'expr') s.afis = true;
      return yield* executaModul(ast);
    }
    function variabile(fr) {
      const lista = (m) => [...m].filter(([k, v]) => !k.startsWith('__') && v !== undefined && k !== '_').map(([k, v]) => {
        let r = repr(v);
        if (r.length > 400) r = `${r.slice(0, 400)}…`;
        return { n: k, v: r, t: tn(v) };
      }).sort((a, b) => a.n.localeCompare(b.n));
      const o = { globale: lista(S ? S.G : new Map()) };
      if (fr && fr.loc) o.locale = { nume: fr.name, vars: lista(fr.loc) };
      return o;
    }
    const stareCurenta = () => S;
    // rulare completă, sincronă (pentru teste în Node): intrarea vine dintr-un text
    function ruleazaText(cod, intrare = '', opt = {}) {
      let out = '';
      const gazda = { scrie: (s) => { out += s; }, desen: opt.desen || null };
      sesiuneNoua(gazda);
      const linii = intrare.split('\n');
      if (linii.length && linii[linii.length - 1] === '') linii.pop();
      let k = 0;
      const g = ruleaza(cod, opt.fisier || 'program.py', { gazda, seed: opt.seed });
      let r = g.next();
      while (!r.done) {
        const y = r.value;
        if (y.t === 'input') r = g.next(k < linii.length ? linii[k++] : null);
        else r = g.next();
      }
      return { iesire: out, rez: r.value };
    }
    return { ruleaza, comanda, variabile, sesiuneNoua, stareCurenta, ruleazaText, compileaza, lexeaza, repr, floatRepr, ErSintaxa };
  })();

  // ---------- Motorul de rulare: primește comenzi (run / repl / input / dbg) și trimite rezultate ----------
  // Rulează în Web Worker; dacă browserul nu permite worker-ul, rulează pe pagina însăși.
  function motor(trimite) {
    let buf = [], gen = null, dbgCfg = null, cerere = null;
    const flush = () => { if (buf.length) { trimite({ t: 'lot', l: buf }); buf = []; } };
    const gazda = {
      scrie: (s, k = 'o') => { const u = buf[buf.length - 1]; if (u && u.t === 'out' && u.k === k) u.s += s; else buf.push({ t: 'out', s, k }); if (buf.length > 2000) flush(); },
      desen: (op) => { buf.push({ t: 'tt', op }); if (buf.length > 4000) flush(); },
      flush,
    };
    PY.sesiuneNoua(gazda);
    const varsAcum = () => { const S = PY.stareCurenta(); const st = S.stack || []; return PY.variabile(st.length > 1 ? st[st.length - 1] : null); };
    function trebuiePauza(y) {
      if (!dbgCfg) return false;
      if (dbgCfg.bp.has(y.line) && !(dbgCfg.abiaPornit && dbgCfg.ultim && dbgCfg.ultim.line === y.line)) return true;
      switch (dbgCfg.mod) {
        case 'into': return true;
        case 'over': return y.ad <= dbgCfg.ad;
        case 'out': return y.ad < dbgCfg.ad;
        default: return false;
      }
    }
    function avanseaza(valoare) {
      let r;
      try {
        r = gen.next(valoare);
        for (;;) {
          if (r.done) break;
          const y = r.value;
          if (y.t === 'input') { flush(); cerere = 'input'; trimite({ t: 'input' }); return; }
          if (y.t === 'sleep') { flush(); cerere = 'sleep'; setTimeout(() => { if (cerere !== 'sleep') return; cerere = null; avanseaza(); }, y.ms); return; }
          if (y.t === 'pas' && trebuiePauza(y)) {
            flush();
            dbgCfg.abiaPornit = false;
            dbgCfg.ultim = y;
            const S = PY.stareCurenta();
            const stiva = (S.stack || []).map((fr) => ({ nume: fr.name, rand: fr.line }));
            cerere = 'pas';
            trimite({ t: 'pauza', rand: y.line, ad: y.ad, vars: varsAcum(), stiva });
            return;
          }
          if (dbgCfg) dbgCfg.abiaPornit = false;
          r = gen.next();
        }
      } catch (e) {
        flush();
        gen = null; cerere = null;
        trimite({ t: 'gata', rez: { ok: false, eroare: { text: `Eroare internă a editorului: ${e && e.message}\n`, expl: '' } }, vars: PY.variabile(null), intrari: [] });
        return;
      }
      flush();
      gen = null; cerere = null;
      trimite({ t: 'gata', rez: r.value, vars: PY.variabile(null), intrari: PY.stareCurenta().intrari });
    }
    return (d) => {
      d = d || {};
      switch (d.c) {
        case 'run':
          dbgCfg = d.dbg ? { mod: 'into', ad: 1, bp: new Set(d.bp || []), abiaPornit: true } : null;
          cerere = null;
          gen = PY.ruleaza(String(d.cod || ''), String(d.fisier || '<untitled>'), { gazda, dbg: !!d.dbg });
          avanseaza();
          break;
        case 'repl':
          if (gen) { trimite({ t: 'gata', rez: { ok: true }, vars: PY.variabile(null), intrari: [] }); return; }
          dbgCfg = null;
          gen = PY.comanda(String(d.cod || ''));
          avanseaza();
          break;
        case 'input':
          if (gen && cerere === 'input') { cerere = null; avanseaza(d.text == null ? null : String(d.text)); }
          break;
        case 'dbg':
          if (gen && cerere === 'pas' && dbgCfg) {
            cerere = null;
            dbgCfg.mod = d.mod; dbgCfg.ad = dbgCfg.ultim ? dbgCfg.ultim.ad : 1;
            if (d.bp) dbgCfg.bp = new Set(d.bp);
            dbgCfg.abiaPornit = true;
            if (d.mod === 'resume' && !dbgCfg.bp.size) dbgCfg = null; // fără puncte de oprire: rulează normal până la capăt
            avanseaza();
          }
          break;
        default:
      }
    };
  }

  // Același fișier, încărcat ca Web Worker (fără window) sau în Node (pentru teste).
  if (typeof window === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) { module.exports = PY; return; }
    if (typeof self === 'undefined') return;
    const primeste = motor((m) => self.postMessage(m));
    self.onmessage = (e) => primeste(e.data);
    return;
  }
  if (!window.EduApp) return;

  // =====================================================================
  // INTERFAȚA: un Thonny simplificat
  // =====================================================================
  const { h, show, routes } = window.EduApp;
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));

  // ---------- Exemple ----------
  const EXEMPLE = [
    { nume: 'salut.py', titlu: 'Salut!', desc: 'Primul program: print și input', cod: '# Primul meu program în Python\nnume = input("Cum te numești? ")\nprint("Salut,", nume + "!")\nprint("Bine ai venit la ora de informatică.")\n' },
    { nume: 'suma.py', titlu: 'Suma a două numere', desc: 'Citire cu int(input()) și afișare', cod: 'a = int(input("a = "))\nb = int(input("b = "))\ns = a + b\nprint("Suma este", s)\nprint(f"{a} + {b} = {s}")\n' },
    { nume: 'paritate.py', titlu: 'Par sau impar', desc: 'Structura alternativă if … else', cod: 'n = int(input("n = "))\nif n % 2 == 0:\n    print(n, "este par")\nelse:\n    print(n, "este impar")\n' },
    { nume: 'maxim.py', titlu: 'Maximul a trei numere', desc: 'if … elif … else', cod: 'a = int(input("a = "))\nb = int(input("b = "))\nc = int(input("c = "))\nif a >= b and a >= c:\n    maxim = a\nelif b >= c:\n    maxim = b\nelse:\n    maxim = c\nprint("Maximul este", maxim)\n' },
    { nume: 'tabla.py', titlu: 'Tabla înmulțirii', desc: 'for cu range și f-string', cod: 'n = int(input("Tabla înmulțirii cu: "))\nfor i in range(1, 11):\n    print(f"{n} x {i:2} = {n * i:3}")\n' },
    { nume: 'cifre.py', titlu: 'Cifrele unui număr', desc: 'while, // și %', cod: 'n = int(input("n = "))\nsuma = 0\nnr_cifre = 0\nwhile n > 0:\n    cifra = n % 10\n    suma = suma + cifra\n    nr_cifre = nr_cifre + 1\n    n = n // 10\nprint("Numărul are", nr_cifre, "cifre")\nprint("Suma cifrelor este", suma)\n' },
    { nume: 'prim.py', titlu: 'Număr prim', desc: 'Divizori, break și o funcție', cod: 'def este_prim(n):\n    if n < 2:\n        return False\n    d = 2\n    while d * d <= n:\n        if n % d == 0:\n            return False\n        d = d + 1\n    return True\n\nn = int(input("n = "))\nif este_prim(n):\n    print(n, "este prim")\nelse:\n    print(n, "nu este prim")\nprint("Numerele prime până la 50:")\nfor x in range(2, 51):\n    if este_prim(x):\n        print(x, end=" ")\nprint()\n' },
    { nume: 'sir.py', titlu: 'Șir citit într-o listă', desc: 'append, sum, max, min (clasa a VIII-a)', cod: 'n = int(input("Câte numere? "))\nv = []\nfor i in range(n):\n    x = int(input(f"v[{i}] = "))\n    v.append(x)\nprint("Lista:", v)\nprint("Suma:", sum(v))\nprint("Maximul:", max(v), "pe poziția", v.index(max(v)))\nprint("Minimul:", min(v))\nprint(f"Media: {sum(v) / n:.2f}")\n' },
    { nume: 'ghiceste.py', titlu: 'Ghicește numărul', desc: 'random și while True', cod: 'import random\n\nsecret = random.randint(1, 100)\nincercari = 0\nprint("M-am gândit la un număr între 1 și 100.")\nwhile True:\n    x = int(input("Numărul tău: "))\n    incercari += 1\n    if x < secret:\n        print("Prea mic!")\n    elif x > secret:\n        print("Prea mare!")\n    else:\n        print("Bravo! Ai ghicit din", incercari, "încercări.")\n        break\n' },
    { nume: 'patrat.py', titlu: 'Țestoasa: pătrat', desc: 'turtle: forward și left', cod: 'import turtle\n\nt = turtle.Turtle()\nt.shape("turtle")\nt.color("blue", "lightblue")\nt.pensize(3)\nt.begin_fill()\nfor i in range(4):\n    t.forward(150)\n    t.left(90)\nt.end_fill()\nturtle.done()\n' },
    { nume: 'stea.py', titlu: 'Țestoasa: stea', desc: 'turtle: unghiuri și umplere', cod: 'import turtle\n\nt = turtle.Turtle()\nt.speed(6)\nt.color("red", "yellow")\nt.penup()\nt.goto(-100, 30)\nt.pendown()\nt.begin_fill()\nfor i in range(5):\n    t.forward(200)\n    t.right(144)\nt.end_fill()\nt.hideturtle()\nturtle.done()\n' },
    { nume: 'spirala.py', titlu: 'Țestoasa: spirală colorată', desc: 'turtle: culori dintr-o listă', cod: 'import turtle\n\nturtle.bgcolor("black")\nt = turtle.Turtle()\nt.speed(0)\nt.width(2)\nculori = ["red", "orange", "yellow", "green", "cyan", "blue", "magenta"]\nfor i in range(120):\n    t.pencolor(culori[i % len(culori)])\n    t.forward(i * 2)\n    t.left(59)\nt.hideturtle()\nturtle.done()\n' },
  ];

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-python', ST = 'fisiere', LS = 'edudigi_python_fisiere', LS_PREF = 'edudigi_python_pref';
  let dbP = null;
  function deschideDB() {
    if (!dbP) dbP = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('fără IndexedDB'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbP;
  }
  const lsCiteste = (k, implicit) => { try { const v = localStorage.getItem(k); return v == null ? implicit : JSON.parse(v); } catch { return implicit; } };
  const lsScrie = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* plin sau blocat */ } };
  const tx = async (mod, fn) => {
    const db = await deschideDB();
    return new Promise((res, rej) => {
      const t = db.transaction(ST, mod);
      const r = fn(t.objectStore(ST));
      t.oncomplete = () => res(r?.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Spațiul de stocare este plin.'));
    });
  };
  const areIDB = () => deschideDB().then(() => true, () => false);
  const store = {
    async toate() { return (await areIDB()) ? tx('readonly', (s) => s.getAll()) : lsCiteste(LS, []); },
    async put(f) {
      if (await areIDB()) return tx('readwrite', (s) => s.put(f));
      const a = lsCiteste(LS, []).filter((x) => x.id !== f.id); a.push(f);
      localStorage.setItem(LS, JSON.stringify(a));
    },
    async del(id) { if (await areIDB()) return tx('readwrite', (s) => s.delete(id)); lsScrie(LS, lsCiteste(LS, []).filter((f) => f.id !== id)); },
  };
  const idNou = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const cand = (t) => {
    const d = new Date(t), azi = new Date();
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === azi.toDateString() ? `azi, ${ora}` : `${d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}, ${ora}`;
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const numePy = (t) => {
    let n = (t || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.py$/i, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!n) n = 'program';
    if (/^\d/.test(n)) n = `p${n}`;
    return `${n.slice(0, 40)}.py`;
  };
  const DIR = 'C:\\Users\\Elev\\Documents';

  // ---------- Colorarea sintaxei (ca tema „Default Light” din Thonny) ----------
  const KW = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);
  const BUILT = new Set(['print', 'input', 'int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'range', 'len', 'abs', 'min', 'max', 'sum', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'type', 'isinstance', 'ord', 'chr', 'divmod', 'pow', 'any', 'all', 'repr', 'format', 'bin', 'hex', 'oct', 'id', 'iter', 'next', 'exit', 'quit', 'self', 'super', 'object', 'open', 'help']);
  function coloreaza(src) {
    let o = '', i = 0, dupaDef = false;
    const n = src.length;
    const sp = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;
    while (i < n) {
      const c = src[i];
      if (c === '#') { let j = src.indexOf('\n', i); if (j < 0) j = n; o += sp('c', src.slice(i, j)); i = j; continue; }
      const mq = /^([rRbBuUfF]{0,2})('''|"""|'|")/.exec(src.slice(i, i + 5));
      if (mq && (mq[1] === '' || /^(r|u|b|f|br|rb|fr|rf)$/i.test(mq[1])) && !(mq[1] && /\w/.test(src[i - 1] || ''))) {
        const q = mq[2];
        let j = i + mq[0].length;
        while (j < n) {
          if (src[j] === '\\') { j += 2; continue; }
          if (src.startsWith(q, j)) { j += q.length; break; }
          if (q.length === 1 && src[j] === '\n') break;
          j++;
        }
        o += sp('s', src.slice(i, Math.min(j, n))); i = Math.min(j, n); continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        if (/\w/.test(src[i - 1] || '')) { o += esc(c); i++; continue; }
        const m = /^(0[xXoObB][\da-fA-F_]+|(\d[\d_]*\.?[\d_]*|\.\d[\d_]*)([eE][+-]?\d+)?)/.exec(src.slice(i, i + 60));
        o += sp('n', m[0]); i += m[0].length; continue;
      }
      if (/[\p{L}_]/u.test(c)) {
        let j = i + 1; while (j < n && /[\p{L}\p{N}_]/u.test(src[j])) j++;
        const w = src.slice(i, j);
        if (dupaDef) { o += sp('d', w); dupaDef = false; } else if (KW.has(w)) { o += sp('k', w); dupaDef = w === 'def' || w === 'class'; } else if (BUILT.has(w) && src[i - 1] !== '.') o += sp('b', w);
        else o += esc(w);
        i = j; continue;
      }
      o += esc(c); i++;
    }
    return `${o}\n`;
  }

  // ---------- Pictograme (SVG desenate, în stilul celor din Thonny) ----------
  const S24 = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const S16 = (p) => `<svg viewBox="0 0 16 16" aria-hidden="true">${p}</svg>`;
  const ICO = {
    nou: S24('<path d="M5 2.5h9.5L19 7v14.5H5z" fill="#fff" stroke="#5f6b7a" stroke-width="1.3"/><path d="M14.5 2.5V7H19" fill="#e3e8ee" stroke="#5f6b7a" stroke-width="1.3"/><path d="M8 11h8M8 14h8M8 17h5" stroke="#b9c2cc" stroke-width="1.3"/>'),
    deschide: S24('<path d="M2 5h7l2 2.2h10V19H2z" fill="#e7b84c" stroke="#9b7317" stroke-width="1.2"/><path d="M4.5 10h18l-2.8 9H2z" fill="#f8d779" stroke="#9b7317" stroke-width="1.2"/>'),
    salveaza: S24('<path d="M3 3h15l3 3v15H3z" fill="#3e6db5" stroke="#23467f" stroke-width="1.2"/><rect x="6.5" y="3" width="10" height="6" fill="#e9eef6"/><rect x="13" y="4" width="2.3" height="4" fill="#3e6db5"/><rect x="6" y="12.5" width="12" height="8.5" rx=".6" fill="#fff"/><path d="M8 15h8M8 17.5h8" stroke="#c3cad3"/>'),
    run: S24('<circle cx="12" cy="12" r="10" fill="#3aa54a" stroke="#22762f" stroke-width="1.2"/><path d="M9.5 7.2v9.6L17 12z" fill="#fff"/>'),
    debug: S24('<ellipse cx="12" cy="14" rx="5.2" ry="6.3" fill="#d24b3f" stroke="#8c2620" stroke-width="1.1"/><path d="M12 8v12.2" stroke="#8c2620" stroke-width="1.1"/><circle cx="12" cy="6.4" r="2.8" fill="#4a4a4a"/><path d="M6.6 10.5L3 9M6.4 14H2.5M6.8 17.5L3.3 19.5M17.4 10.5L21 9M17.6 14h3.9M17.2 17.5l3.5 2M10.4 4.2L9 2M13.6 4.2L15 2" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.8" cy="12" r="1" fill="#fff"/><circle cx="14.2" cy="15.5" r="1" fill="#fff"/>'),
    over: S24('<path d="M4 16V11a6 6 0 0 1 12 0v3" fill="none" stroke="#2f6fc2" stroke-width="2.2" stroke-linecap="round"/><path d="M12.2 13h7.6L16 18z" fill="#2f6fc2"/><path d="M3 21h18" stroke="#888" stroke-width="1.6"/>'),
    into: S24('<path d="M12 2.5v11" stroke="#2f6fc2" stroke-width="2.2" stroke-linecap="round"/><path d="M8 12.5h8L12 18z" fill="#2f6fc2"/><path d="M3 21h18" stroke="#888" stroke-width="1.6"/><path d="M5.5 5h3M15.5 5h3" stroke="#888" stroke-width="1.6"/>'),
    out: S24('<path d="M12 19.5v-11" stroke="#2f6fc2" stroke-width="2.2" stroke-linecap="round"/><path d="M8 9.5h8L12 4z" fill="#2f6fc2"/><path d="M3 21h18" stroke="#888" stroke-width="1.6"/>'),
    resume: S24('<path d="M5 5v14l8-7z" fill="#3aa54a" stroke="#22762f" stroke-linejoin="round"/><path d="M12 5v14l8-7z" fill="#3aa54a" stroke="#22762f" stroke-linejoin="round"/>'),
    stop: S24('<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="#d93a32" stroke="#8c1f1a" stroke-width="1.1"/><text x="12" y="14.6" font-size="6.6" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="#fff" text-anchor="middle">STOP</text>'),
    zoomIn: S24('<circle cx="10" cy="10" r="6.5" fill="#eef5ff" stroke="#4a6a8c" stroke-width="1.8"/><path d="M15 15l6 6" stroke="#6b4a2a" stroke-width="2.6" stroke-linecap="round"/><path d="M7 10h6M10 7v6" stroke="#2f6fc2" stroke-width="1.8"/>'),
    zoomOut: S24('<circle cx="10" cy="10" r="6.5" fill="#eef5ff" stroke="#4a6a8c" stroke-width="1.8"/><path d="M15 15l6 6" stroke="#6b4a2a" stroke-width="2.6" stroke-linecap="round"/><path d="M7 10h6" stroke="#2f6fc2" stroke-width="1.8"/>'),
    sigla: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#2f6fc2"/><path d="M9 11.5c0-3 2.4-4.5 7-4.5s7 1.5 7 4.5v2H14v1.5h9V20c0 3-2.4 5-7 5s-7-2-7-5v-1.5h9V17H9z" fill="#fff"/><circle cx="13" cy="10.6" r="1.1" fill="#2f6fc2"/><circle cx="19" cy="21.4" r="1.1" fill="#2f6fc2"/></svg>',
    fisier: S16('<path d="M3 1.5h6.5L13 5v9.5H3z" fill="#fff" stroke="#6b7a8c"/><path d="M9.5 1.5V5H13" fill="#dfe6ee" stroke="#6b7a8c"/><path d="M5.2 9.2c0-1.2.8-1.8 2.8-1.8s2.8.6 2.8 1.8v.8H7v.6h3.8v1.2c0 1.2-.8 1.9-2.8 1.9s-2.8-.7-2.8-1.9V11H9v-.6H5.2z" fill="#2f6fc2"/>'),
    exemple: S16('<path d="M2 2.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H2zM15 2.5H10.5A1.5 1.5 0 0 0 9 4v10a1.5 1.5 0 0 1 1.5-1.5H15z" fill="#fff" stroke="#3d6fb8"/>'),
    testoasa: S16('<ellipse cx="8" cy="9" rx="4.3" ry="5" fill="#3aa54a" stroke="#22762f"/><circle cx="8" cy="2.8" r="1.8" fill="#3aa54a" stroke="#22762f"/><path d="M3.6 6.5L2 5.5M12.4 6.5L14 5.5M3.8 12L2.2 13.5M12.2 12l1.6 1.5" stroke="#22762f" stroke-width="1.6" stroke-linecap="round"/>'),
  };
  const ic = (k, cls = 'ap-python-ic') => h('span', { class: cls, html: ICO[k] || '' });

  // ---------- Formele țestoasei (ca în modulul turtle) ----------
  const FORME = {
    classic: [[0, 0], [-5, -9], [0, -7], [5, -9]],
    arrow: [[-10, 0], [10, 0], [0, 10]],
    turtle: [[0, 16], [-2, 14], [-1, 10], [-4, 7], [-7, 9], [-9, 8], [-6, 5], [-7, 1], [-5, -3], [-8, -6], [-6, -8], [-4, -5], [0, -7], [4, -5], [6, -8], [8, -6], [5, -3], [7, 1], [6, 5], [9, 8], [7, 9], [4, 7], [1, 10], [2, 14]],
    square: [[10, -10], [10, 10], [-10, 10], [-10, -10]],
    triangle: [[10, -5.77], [0, 11.55], [-10, -5.77]],
    circle: Array.from({ length: 20 }, (_, i) => [10 * Math.cos(i * Math.PI / 10), 10 * Math.sin(i * Math.PI / 10)]),
    blank: [],
  };
  const PX_CADRU = [Infinity, 3, 5, 7, 9, 12, 15, 19, 25, 33, 48]; // pixeli pe cadru, după speed()
  const GR_CADRU = [Infinity, 4, 6, 9, 12, 16, 20, 26, 34, 46, 90]; // grade pe cadru

  // ---------- Rularea: în Web Worker (același fișier), cu rezervă pe pagină ----------
  const SCRIPT = document.currentScript?.src || '/js/aplicatii/python.js';

  // =====================================================================
  // PAGINA APLICAȚIEI
  // =====================================================================
  routes.push({ pattern: /^\/aplicatii\/python$/, handler: async (m, params) => {
    const pref = Object.assign({ fs: 15, vars: window.innerWidth > 760, varsW: 0, shellH: 0, tabs: null, activ: 0 }, lsCiteste(LS_PREF, {}));
    const salvPref = () => lsScrie(LS_PREF, pref);

    // ----- fișierele salvate -----
    const db = new Map();
    try { for (const f of await store.toate()) if (f && f.id) db.set(f.id, f); } catch { /* fără stocare */ }
    const fisiereSortate = () => [...db.values()].sort((a, b) => (b.actualizat || 0) - (a.actualizat || 0));
    // filele deschise: { id (fișier salvat) | null, nume, cod, mod (nesalvat), bp: [], erori: Map }
    let file = (Array.isArray(pref.tabs) ? pref.tabs : []).filter((t) => t && (t.id === null || db.has(t.id))).map((t) => ({ id: t.id, nume: t.id ? db.get(t.id).nume : '<untitled>', cod: typeof t.cod === 'string' ? t.cod : db.get(t.id)?.cod || '', mod: !!t.mod, bp: Array.isArray(t.bp) ? t.bp : [], sel: t.sel || [0, 0], sus: t.sus || 0 }));
    if (!file.length) file = [{ id: null, nume: '<untitled>', cod: '', mod: false, bp: [], sel: [0, 0], sus: 0 }];
    let activ = Math.min(Math.max(0, pref.activ | 0), file.length - 1);
    const F = () => file[activ];

    // ----- elementele de bază -----
    const app = h('div', { class: 'ap-python', tabindex: '-1' });
    const titluEl = h('span', { class: 'ap-python-titlutext' });
    const barTitlu = h('div', { class: 'ap-python-titlu' },
      h('a', { class: 'ap-python-inapoi', href: '#/aplicatii', title: 'Înapoi la aplicații' }, '← Aplicații'),
      h('span', { class: 'ap-python-sigla', html: ICO.sigla }), titluEl, h('span', { class: 'ap-python-spatiu' }),
      h('button', { type: 'button', class: 'ap-python-fbtn', title: 'Ecran complet', 'aria-label': 'Ecran complet', onclick: () => ecranComplet() }, '▢'),
      h('a', { class: 'ap-python-fbtn x', href: '#/aplicatii', title: 'Închide (înapoi la aplicații)', 'aria-label': 'Închide' }, '✕'));
    const barMeniu = h('div', { class: 'ap-python-meniu', role: 'menubar' });
    const barUnelte = h('div', { class: 'ap-python-tb', role: 'toolbar' });

    // editorul
    const fileBara = h('div', { class: 'ap-python-file', role: 'tablist' });
    const nrRand = h('div', { class: 'ap-python-nr' });
    const gutter = h('div', { class: 'ap-python-gutter', title: 'Clic pe un număr de rând: punct de oprire pentru depanare' }, nrRand);
    const codEl = h('pre', { class: 'ap-python-cod', 'aria-hidden': 'true' });
    const marcaj = h('div', { class: 'ap-python-marc', 'aria-hidden': 'true' });
    const ta = h('textarea', { class: 'ap-python-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Editorul de cod Python', wrap: 'off' });
    const masura = h('span', { class: 'ap-python-masura', 'aria-hidden': 'true' }, 'MMMMMMMMMM');
    const scena = h('div', { class: 'ap-python-scena' }, marcaj, codEl, ta, masura);
    const cautBara = h('div', { class: 'ap-python-caut', hidden: true });
    const edZona = h('div', { class: 'ap-python-edzona' }, gutter, scena, cautBara);
    const editor = h('div', { class: 'ap-python-editor' }, fileBara, edZona);

    // Shell
    const shell = h('div', { class: 'ap-python-sh', role: 'log', 'aria-label': 'Shell' });
    const panouShell = h('section', { class: 'ap-python-panou ap-python-pshell' },
      h('div', { class: 'ap-python-panou-cap' }, h('span', {}, 'Shell'), h('span', { class: 'ap-python-spatiu' }),
        h('button', { type: 'button', class: 'ap-python-mic', title: 'Șterge tot textul din Shell', onclick: () => stergeShell() }, 'Golește')),
      shell);
    const splitH = h('div', { class: 'ap-python-split h', role: 'separator', 'aria-orientation': 'horizontal', title: 'Trage pentru a schimba înălțimea' });
    const stanga = h('div', { class: 'ap-python-stanga' }, editor, splitH, panouShell);

    // Variabile
    const varsCorp = h('div', { class: 'ap-python-vars-corp' });
    const panouVars = h('section', { class: 'ap-python-panou ap-python-pvars' },
      h('div', { class: 'ap-python-panou-cap' }, h('span', {}, 'Variabile'), h('span', { class: 'ap-python-spatiu' }),
        h('button', { type: 'button', class: 'ap-python-mic x', title: 'Ascunde panoul Variabile', 'aria-label': 'Ascunde', onclick: () => { pref.vars = false; aplicaAspect(); } }, '✕')),
      varsCorp);
    const splitV = h('div', { class: 'ap-python-split v', role: 'separator', 'aria-orientation': 'vertical', title: 'Trage pentru a schimba lățimea' });
    const corp = h('div', { class: 'ap-python-corp' }, stanga, splitV, panouVars);
    const stMesaj = h('span', { class: 'ap-python-st-msg' }), stPoz = h('span', {});
    const status = h('div', { class: 'ap-python-status' }, stMesaj, h('span', { class: 'ap-python-spatiu' }), stPoz, h('span', { class: 'ap-python-st-sep' }, 'Python 3 (în browser)'));
    const fisierIn = h('input', { type: 'file', accept: '.py,.txt,text/x-python,text/plain', hidden: true, onchange: () => incarcaDeLaCalculator() });
    app.append(barTitlu, barMeniu, barUnelte, corp, status, fisierIn);

    // ----- mesaje scurte -----
    function toast(text, tip = '') {
      const t = h('div', { class: `ap-python-toast ${tip}`, role: 'status' }, text);
      app.append(t);
      setTimeout(() => t.classList.add('gone'), 2600);
      setTimeout(() => t.remove(), 3200);
    }
    const stare = (t) => { stMesaj.textContent = t; };

    // =====================================================================
    // DIALOGURI
    // =====================================================================
    function fereastra(titlu, continut, butoane, { lat = 420 } = {}) {
      return new Promise((res) => {
        const ascuns = h('div', { class: 'ap-python-dlg-fundal' });
        const inchide = (v) => { ascuns.remove(); document.removeEventListener('keydown', laTasta, true); res(v); };
        const bb = h('div', { class: 'ap-python-dlg-btn' }, butoane.map((b) => h('button', { type: 'button', class: b.prim ? 'prim' : '', onclick: () => { const v = b.f ? b.f() : b.v; if (v !== false) inchide(v === undefined ? b.v : v); } }, b.t)));
        const dlg = h('div', { class: 'ap-python-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
          h('div', { class: 'ap-python-dlg-titlu' }, h('span', {}, titlu), h('button', { type: 'button', class: 'ap-python-dlg-x', 'aria-label': 'Închide', onclick: () => inchide(null) }, '✕')),
          h('div', { class: 'ap-python-dlg-corp' }, continut), bb);
        dlg.style.width = `min(${lat}px, calc(100vw - 24px))`;
        function laTasta(e) {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); inchide(null); } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            const p = butoane.find((b) => b.prim); if (p) { e.preventDefault(); e.stopPropagation(); const v = p.f ? p.f() : p.v; if (v !== false) inchide(v === undefined ? p.v : v); }
          }
        }
        document.addEventListener('keydown', laTasta, true);
        ascuns.append(dlg);
        app.append(ascuns);
        setTimeout(() => (dlg.querySelector('input,select') || dlg.querySelector('.prim') || dlg.querySelector('button'))?.focus(), 30);
      });
    }
    const intreaba = (titlu, text, butoane = [{ t: 'OK', v: true, prim: true }]) => fereastra(titlu, h('p', { class: 'ap-python-dlg-text' }, text), butoane);
    function cereText(titlu, eticheta, valoare = '', verifica = null) {
      const inp = h('input', { type: 'text', value: valoare, class: 'ap-python-dlg-inp', spellcheck: 'false' });
      const er = h('div', { class: 'ap-python-dlg-er', role: 'alert' });
      setTimeout(() => { inp.select(); }, 40);
      return fereastra(titlu, h('label', { class: 'ap-python-dlg-lbl' }, eticheta, inp, er), [
        { t: 'OK', prim: true, f: () => { const v = inp.value.trim(); const m2 = verifica ? verifica(v) : (v ? '' : 'Scrie ceva.'); if (m2) { er.textContent = m2; inp.focus(); return false; } return v; } },
        { t: 'Anulează', v: null }]);
    }

    // =====================================================================
    // MENIURI
    // =====================================================================
    let meniuDeschis = null;
    function inchideMeniuri() { app.querySelectorAll('.ap-python-lista').forEach((x) => x.remove()); barMeniu.querySelectorAll('.deschis').forEach((x) => x.classList.remove('deschis')); meniuDeschis = null; }
    function listaMeniu(itemi, x, y) {
      const l = h('div', { class: 'ap-python-lista', role: 'menu' });
      for (const it of itemi) {
        if (it === '-') { l.append(h('div', { class: 'sep', role: 'separator' })); continue; }
        if (it.ascuns) continue;
        const dez = typeof it.dez === 'function' ? it.dez() : it.dez;
        const bif = typeof it.bif === 'function' ? it.bif() : it.bif;
        l.append(h('button', { type: 'button', role: bif !== undefined ? 'menuitemcheckbox' : 'menuitem', 'aria-checked': bif !== undefined ? String(!!bif) : null, disabled: dez || null, onclick: () => { inchideMeniuri(); it.f(); } },
          h('span', { class: 'bif' }, bif ? '✓' : ''), h('span', { class: 'et' }, it.t), h('span', { class: 'sc' }, it.sc || '')));
      }
      app.append(l);
      const r = app.getBoundingClientRect();
      l.style.left = `${Math.max(0, Math.min(x - r.left, r.width - l.offsetWidth - 4))}px`;
      l.style.top = `${y - r.top}px`;
      return l;
    }
    function deschideMeniu(b, focus = false) {
      inchideMeniuri();
      b.classList.add('deschis');
      meniuDeschis = b;
      const r = b.getBoundingClientRect();
      const l = listaMeniu(MENIURI[b.dataset.m](), r.left, r.bottom);
      if (focus) l.querySelector('button:not([disabled])')?.focus();
    }
    document.addEventListener('pointerdown', function laClic(e) {
      if (!app.isConnected) { document.removeEventListener('pointerdown', laClic, true); return; }
      if (!e.target.closest('.ap-python-lista') && !e.target.closest('.ap-python-meniu > button')) inchideMeniuri();
    }, true);
    const MENIURI = {
      'Fișier': () => [
        { t: 'Nou', f: () => fisierNou() },
        { t: 'Deschide…', sc: 'Ctrl+O', f: () => dialogDeschide() },
        { t: 'Exemple…', f: () => dialogExemple() },
        '-',
        { t: 'Salvează', sc: 'Ctrl+S', f: () => salveaza() },
        { t: 'Salvează ca…', sc: 'Ctrl+Shift+S', f: () => salveazaCa() },
        { t: 'Redenumește…', dez: () => !F().id, f: () => redenumeste() },
        '-',
        { t: 'Încarcă de pe calculator (.py)…', f: () => fisierIn.click() },
        { t: 'Descarcă fișierul .py', f: () => descarca() },
        '-',
        { t: 'Închide fila', f: () => inchideFila(activ) },
        { t: 'Ieșire', f: () => { location.hash = '#/aplicatii'; } },
      ],
      'Editare': () => [
        { t: 'Anulează', sc: 'Ctrl+Z', f: () => comandaText('undo') },
        { t: 'Refă', sc: 'Ctrl+Y', f: () => comandaText('redo') },
        '-',
        { t: 'Taie', sc: 'Ctrl+X', f: () => comandaText('cut') },
        { t: 'Copiază', sc: 'Ctrl+C', f: () => comandaText('copy') },
        { t: 'Lipește', sc: 'Ctrl+V', f: () => lipeste() },
        '-',
        { t: 'Selectează tot', sc: 'Ctrl+A', f: () => { ta.focus(); ta.select(); } },
        { t: 'Mergi la rândul…', sc: 'Ctrl+G', f: () => mergiLaRandDlg() },
        { t: 'Caută și înlocuiește', sc: 'Ctrl+F', f: () => arataCautare() },
        '-',
        { t: 'Indentează', sc: 'Tab', f: () => indenteaza(false) },
        { t: 'Dedentează', sc: 'Shift+Tab', f: () => indenteaza(true) },
        { t: 'Comentează / decomentează', sc: 'Ctrl+3', f: () => comenteaza() },
      ],
      'Vizualizare': () => [
        { t: 'Variabile', bif: () => pref.vars, f: () => { pref.vars = !pref.vars; aplicaAspect(); } },
        { t: 'Python Turtle Graphics', bif: () => !tw.el.hidden, f: () => { if (tw.el.hidden) arataTestoasa(); else tw.el.hidden = true; } },
        '-',
        { t: 'Mărește textul', sc: 'Ctrl++', f: () => zoom(1) },
        { t: 'Micșorează textul', sc: 'Ctrl+-', f: () => zoom(-1) },
        { t: 'Mărime normală', sc: 'Ctrl+0', f: () => zoom(0) },
        '-',
        { t: 'Ecran complet', f: () => ecranComplet() },
      ],
      'Rulare': () => [
        { t: 'Rulează scriptul curent', sc: 'F5', f: () => ruleaza(false) },
        { t: 'Depanează scriptul curent', sc: 'Ctrl+F5', f: () => ruleaza(true) },
        { t: 'Pas peste (Step over)', sc: 'F6', dez: () => stareRul !== 'pauza', f: () => pas('over') },
        { t: 'Pas în (Step into)', sc: 'F7', dez: () => stareRul !== 'pauza', f: () => pas('into') },
        { t: 'Pas afară (Step out)', dez: () => stareRul !== 'pauza', f: () => pas('out') },
        { t: 'Continuă (Resume)', sc: 'F8', dez: () => stareRul !== 'pauza', f: () => pas('resume') },
        '-',
        { t: 'Oprește / repornește', sc: 'Ctrl+F2', f: () => opreste(true) },
        { t: 'Șterge punctele de oprire', dez: () => !F().bp.length, f: () => { F().bp = []; redaGutter(); salveazaTabs(); } },
      ],
      'Unelte': () => [
        { t: 'Fișierele mele…', f: () => dialogDeschide() },
        { t: 'Golește Shell-ul', f: () => stergeShell() },
        { t: 'Exportă desenul țestoasei (.png)', dez: () => !tt.folosit, f: () => descarcaDesen() },
      ],
      'Ajutor': () => [
        { t: 'Ghid rapid', f: () => ajutor() },
        { t: 'Despre', f: () => intreaba('Despre', 'Editor Python pentru clasele VII–VIII, după modelul mediului Thonny. Programele rulează direct în browser (fără instalare), cu un interpretor Python scris pentru școală: tipuri de bază, liste, funcții, modulele math, random, time și turtle. Mesajele de eroare sunt explicate în limba română.') },
      ],
    };
    for (const k of Object.keys(MENIURI)) {
      const b = h('button', { type: 'button', role: 'menuitem', 'data-m': k, onclick: () => (meniuDeschis === b ? inchideMeniuri() : deschideMeniu(b)), onpointerenter: () => { if (meniuDeschis && meniuDeschis !== b) deschideMeniu(b); } }, k);
      barMeniu.append(b);
    }

    // ----- bara de unelte -----
    const TB = {};
    const btn = (k, titlu, f, ico) => { const b = h('button', { type: 'button', class: 'ap-python-tbb', title: titlu, 'aria-label': titlu, onclick: f }, ic(ico || k, 'ap-python-ic24')); TB[k] = b; return b; };
    const sepTb = () => h('span', { class: 'ap-python-tbsep' });
    barUnelte.append(
      btn('nou', 'Nou', () => fisierNou()), btn('deschide', 'Deschide… (Ctrl+O)', () => dialogDeschide()), btn('salveaza', 'Salvează (Ctrl+S)', () => salveaza()), sepTb(),
      btn('run', 'Rulează scriptul curent (F5)', () => ruleaza(false)), btn('debug', 'Depanează scriptul curent (Ctrl+F5)', () => ruleaza(true)),
      btn('over', 'Pas peste (F6)', () => pas('over')), btn('into', 'Pas în (F7)', () => pas('into')), btn('out', 'Pas afară', () => pas('out')), btn('resume', 'Continuă (F8)', () => pas('resume')),
      btn('stop', 'Oprește / repornește (Ctrl+F2)', () => opreste(true)), sepTb(),
      btn('zoomIn', 'Mărește textul (Ctrl++)', () => zoom(1)), btn('zoomOut', 'Micșorează textul (Ctrl+-)', () => zoom(-1)),
      h('span', { class: 'ap-python-spatiu' }),
      h('button', { type: 'button', class: 'ap-python-tbtext', title: 'Programe gata scrise', onclick: () => dialogExemple() }, ic('exemple'), h('span', {}, 'Exemple')));

    // =====================================================================
    // EDITORUL
    // =====================================================================
    let lh = 22, cw = 9;
    function masoara() {
      const r = masura.getBoundingClientRect();
      cw = r.width / 10 || 9;
      lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    }
    let nrLinii = -1;
    function redaGutter() {
      const f = F();
      const bp = new Set(f.bp), er = erori.get(f) || 0;
      const cur = dbgRand && dbgFila === f ? dbgRand : 0;
      const o = [];
      for (let i = 1; i <= nrLinii; i++) {
        const c = `${bp.has(i) ? ' bp' : ''}${i === cur ? ' cur' : ''}${i === er ? ' er' : ''}`;
        o.push(c ? `<div class="${c.trim()}">${i}</div>` : `<div>${i}</div>`);
      }
      nrRand.innerHTML = o.join('');
    }
    const erori = new Map(); // fila → rândul cu eroare
    let perechi = null;
    function redaMarcaje() {
      const benzi = [];
      const banda = (r, cls) => { const d = h('div', { class: cls }); d.style.top = `${(r - 1) * lh + 4}px`; benzi.push(d); };
      const f = F();
      if (erori.get(f)) banda(erori.get(f), 'er');
      if (dbgRand && dbgFila === f) banda(dbgRand, 'dbg');
      if (perechi) for (const [r, c] of perechi) { const d = h('div', { class: 'pp' }); d.style.top = `${(r - 1) * lh + 4}px`; d.style.left = `${c * cw + 6}px`; d.style.width = `${cw}px`; benzi.push(d); }
      umple(marcaj, benzi);
    }
    function reda() {
      codEl.innerHTML = coloreaza(ta.value);
      const n = ta.value.split('\n').length;
      if (n !== nrLinii) { nrLinii = n; redaGutter(); }
      redaMarcaje();
    }
    function sincronizeaza() {
      const t = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      codEl.style.transform = t; marcaj.style.transform = t;
      nrRand.style.transform = `translateY(${-ta.scrollTop}px)`;
    }
    // potrivirea parantezelor de lângă cursor
    function gasestePereche() {
      const v = ta.value, p = ta.selectionStart;
      if (ta.selectionEnd !== p) return null;
      const DESC = '([{', INCH = ')]}';
      let i = -1;
      if (DESC.includes(v[p]) || INCH.includes(v[p])) i = p; else if (INCH.includes(v[p - 1]) || DESC.includes(v[p - 1])) i = p - 1;
      if (i < 0) return null;
      const c = v[i], dir = DESC.includes(c) ? 1 : -1;
      const pereche = dir > 0 ? INCH[DESC.indexOf(c)] : DESC[INCH.indexOf(c)];
      let ad = 0;
      for (let j = i; j >= 0 && j < v.length && Math.abs(j - i) < 20000; j += dir) {
        if (v[j] === c) ad++; else if (v[j] === pereche) { ad--; if (ad === 0) return [i, j]; }
      }
      return [i];
    }
    function pozRC(p) { const inainte = ta.value.slice(0, p); const r = inainte.split('\n').length; return [r, p - inainte.lastIndexOf('\n') - 1]; }
    function pozitie() {
      const [r, c] = pozRC(ta.selectionStart);
      stPoz.textContent = `Rândul ${r}, coloana ${c + 1}`;
      const pp = gasestePereche();
      const nou = pp ? pp.map(pozRC) : null;
      if (JSON.stringify(nou) !== JSON.stringify(perechi)) { perechi = nou; redaMarcaje(); }
      redaTitlu(r, c + 1);
    }
    function arataRand(r) {
      const v = ta.scrollTop, hh = ta.clientHeight;
      const y = (r - 1) * lh;
      if (y < v || y + lh > v + hh) ta.scrollTop = Math.max(0, y - hh / 3);
      sincronizeaza();
    }
    function mergiLaRand(r) {
      const linii = ta.value.split('\n');
      r = Math.max(1, Math.min(r, linii.length));
      let p = 0; for (let i = 0; i < r - 1; i++) p += linii[i].length + 1;
      const ind = (linii[r - 1].match(/^\s*/) || [''])[0].length;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(p + ind, p + ind);
      arataRand(r); pozitie();
    }
    async function mergiLaRandDlg() {
      const v = await cereText('Mergi la rândul', 'Numărul rândului:', '', (x) => (/^\d+$/.test(x) ? '' : 'Scrie un număr.'));
      if (v) mergiLaRand(+v);
    }
    function comutaBp(r) {
      const f = F(), k = f.bp.indexOf(r);
      if (k >= 0) f.bp.splice(k, 1); else f.bp.push(r);
      redaGutter(); salveazaTabs();
    }
    gutter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const r = Math.floor((e.clientY - gutter.getBoundingClientRect().top - 4 + ta.scrollTop) / lh) + 1;
      if (r >= 1 && r <= nrLinii) comutaBp(r);
    });
    // rândurile marcate se mută odată cu textul
    let textVechi = '';
    function ajusteazaRanduri(vechi, nou) {
      let a = 0; const n = Math.min(vechi.length, nou.length);
      while (a < n && vechi[a] === nou[a]) a++;
      const randSch = vechi.slice(0, a).split('\n').length;
      const delta = nou.split('\n').length - vechi.split('\n').length;
      if (!delta) return;
      const f = F();
      const lin = (r) => (r > randSch ? r + delta : r);
      if (f.bp.length) f.bp = [...new Set(f.bp.filter((r) => delta > 0 || !(r > randSch && r <= randSch - delta)).map(lin))];
    }

    // ----- tastatura în editor -----
    function insereaza(text, a = ta.selectionStart, b = ta.selectionEnd) {
      if (document.activeElement !== ta) ta.focus({ preventScroll: true });
      ta.setSelectionRange(a, b);
      let ok = false;
      try { ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text); } catch { ok = false; }
      if (!ok) { ta.setRangeText(text, a, b, 'end'); ta.dispatchEvent(new Event('input')); }
    }
    function comandaText(c) {
      ta.focus();
      let ok = false;
      try { ok = document.execCommand(c); } catch { ok = false; }
      if (!ok && (c === 'cut' || c === 'copy')) toast(`Folosește ${c === 'cut' ? 'Ctrl+X' : 'Ctrl+C'} de la tastatură.`);
    }
    async function lipeste() {
      ta.focus();
      try { const t = await navigator.clipboard.readText(); if (t) insereaza(t.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')); } catch { toast('Browserul nu permite lipirea din meniu: folosește Ctrl+V.'); }
    }
    function liniiSel() {
      const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
      const s = v.lastIndexOf('\n', a - 1) + 1;
      let e = v.indexOf('\n', b > a && v[b - 1] === '\n' ? b - 1 : b); if (e < 0) e = v.length;
      return [s, e];
    }
    function modificaLinii(fn) {
      const [s, e] = liniiSel();
      const bloc = ta.value.slice(s, e);
      const nou = bloc.split('\n').map(fn).join('\n');
      if (nou === bloc) return;
      insereaza(nou, s, e);
      ta.setSelectionRange(s, s + nou.length);
    }
    function indenteaza(invers) {
      ta.focus();
      if (invers) modificaLinii((l) => l.replace(/^ {1,4}/, ''));
      else modificaLinii((l) => (l.trim() ? `    ${l}` : l));
    }
    function comenteaza() {
      ta.focus();
      const [s, e] = liniiSel();
      const linii = ta.value.slice(s, e).split('\n');
      const toate = linii.filter((l) => l.trim()).every((l) => /^\s*#/.test(l));
      modificaLinii((l) => (!l.trim() ? l : toate ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# ')));
    }
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const a = ta.selectionStart, b = ta.selectionEnd;
        if (e.shiftKey || ta.value.slice(a, b).includes('\n')) { indenteaza(e.shiftKey); return; }
        const col = a - ta.value.lastIndexOf('\n', a - 1) - 1;
        insereaza(' '.repeat(4 - (col % 4)));
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const v = ta.value, a = ta.selectionStart;
        const s = v.lastIndexOf('\n', a - 1) + 1;
        const linie = v.slice(s, a);
        let ind = (linie.match(/^ */) || [''])[0].length;
        const fara = linie.replace(/#.*$/, '').trimEnd();
        if (fara.endsWith(':')) ind += 4;
        else if (/^\s*(return|pass|break|continue|raise)\b/.test(linie)) ind = Math.max(0, ind - 4);
        if (ind > linie.length && !linie.trim()) ind = linie.length;
        insereaza(`\n${' '.repeat(ind)}`);
        return;
      }
      if (e.key === 'Backspace' && !e.ctrlKey && ta.selectionStart === ta.selectionEnd) {
        const v = ta.value, a = ta.selectionStart;
        const s = v.lastIndexOf('\n', a - 1) + 1;
        const inainte = v.slice(s, a);
        if (inainte.length && /^ +$/.test(inainte)) {
          e.preventDefault();
          const k = inainte.length % 4 || 4;
          insereaza('', a - k, a);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '3' || e.key === '/')) { e.preventDefault(); comenteaza(); }
    });
    ta.addEventListener('paste', (e) => {
      const t = e.clipboardData?.getData('text/plain');
      if (t && /\t|\r/.test(t)) { e.preventDefault(); insereaza(t.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')); }
    });
    let tSalv = null;
    ta.addEventListener('input', () => {
      const f = F();
      ajusteazaRanduri(textVechi, ta.value);
      textVechi = ta.value;
      f.cod = ta.value;
      if (!f.mod) { f.mod = true; redaFile(); }
      if (erori.has(f)) erori.delete(f);
      reda(); pozitie();
      clearTimeout(tSalv); tSalv = setTimeout(salveazaTabs, 600);
    });
    ta.addEventListener('scroll', sincronizeaza);
    ta.addEventListener('keyup', pozitie);
    ta.addEventListener('click', pozitie);
    ta.addEventListener('select', pozitie);
    document.addEventListener('selectionchange', function laSel() { if (!app.isConnected) { document.removeEventListener('selectionchange', laSel); return; } if (document.activeElement === ta) pozitie(); });

    // ----- căutare și înlocuire -----
    const cInp = h('input', { type: 'text', placeholder: 'Caută', 'aria-label': 'Caută', spellcheck: 'false' });
    const rInp = h('input', { type: 'text', placeholder: 'Înlocuiește cu', 'aria-label': 'Înlocuiește cu', spellcheck: 'false' });
    function cauta(inapoi = false) {
      const t = cInp.value; if (!t) return false;
      const v = ta.value.toLowerCase(), q = t.toLowerCase();
      let i = inapoi ? v.lastIndexOf(q, ta.selectionStart - 1) : v.indexOf(q, ta.selectionEnd);
      if (i < 0) i = inapoi ? v.lastIndexOf(q) : v.indexOf(q);
      if (i < 0) { toast('Nu am găsit textul.'); return false; }
      ta.focus(); ta.setSelectionRange(i, i + t.length); arataRand(pozRC(i)[0]); cInp.focus();
      return true;
    }
    function inlocuieste() {
      const t = cInp.value; if (!t) return;
      if (ta.value.slice(ta.selectionStart, ta.selectionEnd).toLowerCase() === t.toLowerCase()) insereaza(rInp.value);
      cauta();
    }
    function inlocuiesteTot() {
      const t = cInp.value; if (!t) return;
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const n = (ta.value.match(re) || []).length;
      if (!n) { toast('Nu am găsit textul.'); return; }
      insereaza(ta.value.replace(re, () => rInp.value), 0, ta.value.length);
      toast(`Am înlocuit ${n} ${n === 1 ? 'apariție' : 'apariții'}.`);
    }
    umple(cautBara, cInp, h('button', { type: 'button', title: 'Anterior', onclick: () => cauta(true) }, '↑'), h('button', { type: 'button', title: 'Următor (Enter)', onclick: () => cauta() }, '↓'),
      rInp, h('button', { type: 'button', onclick: inlocuieste }, 'Înlocuiește'), h('button', { type: 'button', onclick: inlocuiesteTot }, 'Tot'),
      h('button', { type: 'button', class: 'x', 'aria-label': 'Închide căutarea', onclick: () => { cautBara.hidden = true; ta.focus(); } }, '✕'));
    cInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cauta(e.shiftKey); } if (e.key === 'Escape') { cautBara.hidden = true; ta.focus(); } });
    rInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inlocuieste(); } if (e.key === 'Escape') { cautBara.hidden = true; ta.focus(); } });
    function arataCautare() { cautBara.hidden = false; const s = ta.value.slice(ta.selectionStart, ta.selectionEnd); if (s && !s.includes('\n')) cInp.value = s; cInp.focus(); cInp.select(); }

    // =====================================================================
    // FILE ȘI FIȘIERE
    // =====================================================================
    function salveazaTabs() {
      pref.tabs = file.map((f) => ({ id: f.id, cod: f.cod, mod: f.mod, bp: f.bp, sel: f === F() ? [ta.selectionStart, ta.selectionEnd] : f.sel, sus: f === F() ? ta.scrollTop : f.sus }));
      pref.activ = activ;
      salvPref();
    }
    function redaTitlu(r, c) {
      const f = F();
      if (r === undefined) { const p = pozRC(ta.selectionStart); r = p[0]; c = p[1] + 1; }
      titluEl.textContent = `Thonny  -  ${f.id ? `${DIR}\\${f.nume}` : '<untitled>'}  @  ${r} : ${c}`;
    }
    function redaFile() {
      umple(fileBara, file.map((f, i) => h('div', { class: `ap-python-fila${i === activ ? ' activa' : ''}`, role: 'tab', 'aria-selected': String(i === activ), title: f.id ? `${DIR}\\${f.nume}` : 'Fișier nesalvat', onclick: (e) => { if (!e.target.closest('.x')) activeaza(i); }, onauxclick: (e) => { if (e.button === 1) inchideFila(i); } },
        h('span', {}, `${f.nume}${f.mod ? ' *' : ''}`),
        h('button', { type: 'button', class: 'x', title: 'Închide', 'aria-label': `Închide ${f.nume}`, onclick: () => inchideFila(i) }, '✕'))));
      redaTitlu();
    }
    function activeaza(i, focus = true) {
      const v = F();
      if (v) { v.sel = [ta.selectionStart, ta.selectionEnd]; v.sus = ta.scrollTop; v.cod = ta.value; }
      activ = Math.max(0, Math.min(i, file.length - 1));
      const f = F();
      ta.value = f.cod; textVechi = f.cod;
      nrLinii = -1; perechi = null;
      reda();
      try { ta.setSelectionRange(...f.sel); } catch { /* nimic */ }
      ta.scrollTop = f.sus || 0;
      sincronizeaza();
      redaFile(); pozitie();
      if (focus) ta.focus({ preventScroll: true });
      salveazaTabs();
    }
    function fisierNou(cod = '', nume = '<untitled>', id = null) {
      file.push({ id, nume, cod, mod: false, bp: [], sel: [0, 0], sus: 0 });
      activeaza(file.length - 1);
    }
    async function inchideFila(i) {
      const f = file[i];
      if (f.mod && f.cod.trim()) {
        const r = await intreaba('Salvezi modificările?', `Fișierul ${f.nume} are modificări nesalvate. Vrei să le salvezi înainte de închidere?`, [{ t: 'Da', v: 'da', prim: true }, { t: 'Nu', v: 'nu' }, { t: 'Anulează', v: null }]);
        if (!r) return;
        if (r === 'da') { activeaza(i, false); if (!(await salveaza())) return; }
      }
      file.splice(i, 1);
      if (!file.length) file.push({ id: null, nume: '<untitled>', cod: '', mod: false, bp: [], sel: [0, 0], sus: 0 });
      activ = Math.min(activ >= i ? Math.max(0, activ - 1) : activ, file.length - 1);
      const f2 = F(); ta.value = f2.cod; textVechi = f2.cod; nrLinii = -1; reda();
      activeaza(activ);
    }
    const numeFolosit = (n, exceptId = null) => [...db.values()].some((f) => f.nume.toLowerCase() === n.toLowerCase() && f.id !== exceptId);
    function verificaNume(v, exceptId = null) {
      if (!v) return 'Scrie un nume.';
      const n = numePy(v);
      if (numeFolosit(n, exceptId)) return `Există deja un fișier numit ${n}. Alege alt nume.`;
      return '';
    }
    async function salveaza() {
      const f = F();
      f.cod = ta.value;
      if (!f.id) return salveazaCa();
      const r = db.get(f.id);
      r.cod = f.cod; r.actualizat = Date.now();
      try { await store.put(r); } catch { toast('Nu am putut salva (spațiul de stocare este plin sau blocat).', 'err'); return false; }
      f.mod = false; redaFile(); salveazaTabs();
      stare(`Am salvat ${f.nume}`);
      return true;
    }
    async function salveazaCa() {
      const f = F();
      f.cod = ta.value;
      const prima = (f.cod.match(/[\p{L}_][\p{L}\p{N}_]*/u) || [''])[0];
      const v = await cereText('Salvează ca', 'Numele fișierului (de exemplu suma.py):', f.id ? f.nume : numePy(f.nume !== '<untitled>' ? f.nume : prima && !['import', 'from', 'def', 'print'].includes(prima) ? prima : 'program'), (x) => verificaNume(x));
      if (!v) return false;
      const r = { id: idNou(), nume: numePy(v), cod: f.cod, creat: Date.now(), actualizat: Date.now() };
      try { await store.put(r); } catch { toast('Nu am putut salva (spațiul de stocare este plin sau blocat).', 'err'); return false; }
      db.set(r.id, r);
      f.id = r.id; f.nume = r.nume; f.mod = false;
      redaFile(); salveazaTabs();
      stare(`Am salvat ${r.nume}`);
      return true;
    }
    async function redenumeste(id = F().id) {
      const r = db.get(id); if (!r) return;
      const v = await cereText('Redenumește', 'Numele nou:', r.nume, (x) => verificaNume(x, id));
      if (!v) return;
      r.nume = numePy(v); r.actualizat = Date.now();
      await store.put(r);
      for (const f of file) if (f.id === id) f.nume = r.nume;
      redaFile(); salveazaTabs();
    }
    function deschideFisier(id) {
      const i = file.findIndex((f) => f.id === id);
      if (i >= 0) { activeaza(i); return; }
      const r = db.get(id);
      // fila goală <untitled> se înlocuiește
      const g = F();
      if (!g.id && !g.cod.trim() && !g.mod) { Object.assign(g, { id, nume: r.nume, cod: r.cod, mod: false, bp: [], sel: [0, 0], sus: 0 }); ta.value = ''; activeaza(activ); return; }
      fisierNou(r.cod, r.nume, id);
    }
    function dialogDeschide() {
      const lista = h('div', { class: 'ap-python-lstf' });
      let ales = null;
      const reda2 = () => {
        const fs = fisiereSortate();
        if (!fs.length) { umple(lista, h('p', { class: 'ap-python-gol' }, 'Nu ai încă fișiere salvate. Scrie un program și apasă Salvează (Ctrl+S).')); return; }
        umple(lista, fs.map((f) => h('div', { class: `ap-python-lstf-r${ales === f.id ? ' ales' : ''}`, role: 'option', tabindex: '0', onclick: () => { ales = f.id; reda2(); }, ondblclick: () => { inchideDlg(); deschideFisier(f.id); }, onkeydown: (e) => { if (e.key === 'Enter') { inchideDlg(); deschideFisier(f.id); } } },
          ic('fisier'), h('span', { class: 'n' }, f.nume), h('span', { class: 'd' }, cand(f.actualizat || f.creat || Date.now())),
          h('button', { type: 'button', class: 'ap-python-mic', title: 'Redenumește', onclick: async (e) => { e.stopPropagation(); await redenumeste(f.id); reda2(); } }, 'Redenumește'),
          h('button', { type: 'button', class: 'ap-python-mic r', title: 'Șterge', onclick: async (e) => { e.stopPropagation(); if (await intreaba('Ștergi fișierul?', `Fișierul ${f.nume} va fi șters definitiv.`, [{ t: 'Șterge', v: true, prim: true }, { t: 'Anulează', v: false }])) { await store.del(f.id); db.delete(f.id); for (const t of file) if (t.id === f.id) { t.id = null; t.nume = '<untitled>'; t.mod = true; } redaFile(); salveazaTabs(); reda2(); } } }, 'Șterge'))));
      };
      let inchideDlg = () => {};
      reda2();
      const p = fereastra('Deschide', h('div', {}, h('p', { class: 'ap-python-dlg-text' }, `Fișierele tale (${DIR}):`), lista,
        h('button', { type: 'button', class: 'ap-python-link', onclick: () => { inchideDlg(); fisierIn.click(); } }, 'Încarcă un fișier .py de pe calculator…')),
      [{ t: 'Deschide', prim: true, f: () => (ales ? ales : false) }, { t: 'Anulează', v: null }], { lat: 560 });
      inchideDlg = () => app.querySelector('.ap-python-dlg-fundal')?.querySelector('.ap-python-dlg-x')?.click();
      p.then((id) => { if (id) deschideFisier(id); });
    }
    function dialogExemple() {
      let inchide = () => {};
      const l = h('div', { class: 'ap-python-ex' }, EXEMPLE.map((x) => h('button', { type: 'button', class: 'ap-python-ex-b', onclick: () => { inchide(); fisierNou(x.cod, '<untitled>'); F().mod = true; F().nume = '<untitled>'; redaFile(); stare(`Exemplu: ${x.titlu} – apasă F5 ca să-l rulezi`); } },
        h('b', {}, x.titlu), h('span', {}, x.desc))));
      fereastra('Exemple', h('div', {}, h('p', { class: 'ap-python-dlg-text' }, 'Alege un program. Se deschide într-o filă nouă; apasă F5 (butonul verde) ca să-l rulezi.'), l), [{ t: 'Închide', v: null }], { lat: 620 });
      inchide = () => app.querySelector('.ap-python-dlg-x')?.click();
    }
    async function incarcaDeLaCalculator() {
      const f = fisierIn.files[0];
      fisierIn.value = '';
      if (!f) return;
      if (f.size > 500000) { toast('Fișierul este prea mare pentru un program.', 'err'); return; }
      const text = (await f.text()).replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').replace(/\t/g, '    ');
      let nume = numePy(f.name);
      let k = 2; while (numeFolosit(nume)) nume = numePy(`${f.name.replace(/\.py$/i, '')}_${k++}`);
      const r = { id: idNou(), nume, cod: text, creat: Date.now(), actualizat: Date.now() };
      try { await store.put(r); db.set(r.id, r); deschideFisier(r.id); toast(`Am deschis ${nume}.`); } catch { fisierNou(text); }
    }
    function descarca() {
      const f = F();
      f.cod = ta.value;
      const a = h('a', { href: URL.createObjectURL(new Blob([f.cod], { type: 'text/x-python;charset=utf-8' })), download: f.id ? f.nume : 'program.py' });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // =====================================================================
    // SHELL
    // =====================================================================
    const shIn = h('span', { class: 'ap-python-sh-in', contenteditable: 'plaintext-only', spellcheck: 'false', autocapitalize: 'off', 'aria-label': 'Scrie aici' });
    let shBuf = null; // ultimul span de ieșire
    const LIM_SHELL = 300000;
    let lungShell = 0;
    function shScrie(text, cls = 'o') {
      if (!text) return;
      const u = shIn.previousSibling;
      if (u && u.nodeType === 1 && u.dataset.k === cls && !u.dataset.inchis) u.append(text);
      else { const s = h('span', { class: `ap-python-sh-${cls}`, 'data-k': cls }, text); shell.insertBefore(s, shIn); }
      lungShell += text.length;
      if (lungShell > LIM_SHELL) { // se păstrează doar finalul
        while (lungShell > LIM_SHELL * 0.7 && shell.firstChild && shell.firstChild !== shIn) { lungShell -= shell.firstChild.textContent.length; shell.firstChild.remove(); }
      }
      shBuf = text;
      deruleazaShell();
    }
    function inchideSpan() { const u = shIn.previousSibling; if (u && u.nodeType === 1) u.dataset.inchis = '1'; }
    let tDer = 0;
    function deruleazaShell() { if (tDer) return; tDer = requestAnimationFrame(() => { tDer = 0; shell.scrollTop = shell.scrollHeight; }); }
    function laFinalRand() { const u = shIn.previousSibling; if (u && u.dataset?.k === 'ex') return true; const t = u?.textContent || ''; return !t || t.endsWith('\n'); }
    function prompt(cont = false) { if (!laFinalRand()) shScrie('\n'); shScrie(cont ? '... ' : '>>> ', 'p'); inchideSpan(); modShell = 'repl'; focusShell(); }
    function stergeShell() { [...shell.childNodes].forEach((n) => { if (n !== shIn) n.remove(); }); lungShell = 0; if (modShell === 'repl') { shScrie('>>> ', 'p'); inchideSpan(); } }
    function focusShell() { if (document.activeElement === ta) return; shIn.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(shIn); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    shell.append(shIn);
    shell.addEventListener('mouseup', () => { if (!getSelection().toString()) { shIn.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(shIn); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } });
    let modShell = 'repl'; // repl | input | rulare
    const istoric = lsCiteste('edudigi_python_istoric', []);
    let iIst = -1, blocRepl = [], coadaIntrare = [];
    function trimiteRand() {
      const t = shIn.textContent.replace(/\n$/, '');
      shIn.textContent = '';
      if (modShell === 'input' || modShell === 'rulare') {
        shScrie(`${t}\n`, 'in'); inchideSpan();
        if (modShell === 'input') { modShell = 'rulare'; trimiteIntrare(t); } else coadaIntrare.push(t);
        return;
      }
      // comandă în Shell
      shScrie(`${t}\n`, 'u'); inchideSpan();
      if (t.trim()) { if (istoric[istoric.length - 1] !== t) istoric.push(t); if (istoric.length > 100) istoric.shift(); lsScrie('edudigi_python_istoric', istoric); }
      iIst = -1;
      if (blocRepl.length) {
        if (t.trim()) { blocRepl.push(t); prompt(true); indentRepl(t); return; }
        const cod = blocRepl.join('\n'); blocRepl = [];
        executaComanda(cod); return;
      }
      if (!t.trim()) { prompt(); return; }
      if (/:\s*(#.*)?$/.test(t) || deschise(t) > 0 || /\\$/.test(t)) { blocRepl = [t]; prompt(true); indentRepl(t); return; }
      executaComanda(t);
    }
    // ca în Thonny: rândul următor dintr-un bloc începe deja indentat
    function indentRepl(t) {
      let ind = (t.match(/^ */) || [''])[0].length;
      if (/:\s*(#.*)?$/.test(t)) ind += 4;
      shIn.textContent = ' '.repeat(ind);
      focusShell();
    }
    function deschise(t) { let n = 0, q = null; for (const c of t) { if (q) { if (c === q) q = null; continue; } if (c === '"' || c === "'") q = c; else if (c === '#') break; else if ('([{'.includes(c)) n++; else if (')]}'.includes(c)) n--; } return n; }
    shIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); trimiteRand(); return; }
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); return; }
      if (modShell === 'repl' && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && istoric.length) {
        e.preventDefault();
        if (e.key === 'ArrowUp') iIst = iIst < 0 ? istoric.length - 1 : Math.max(0, iIst - 1); else iIst = iIst < 0 ? -1 : iIst + 1;
        if (iIst >= istoric.length) iIst = -1;
        shIn.textContent = iIst >= 0 ? istoric[iIst] : '';
        focusShell();
      }
      if (e.key === 'c' && (e.ctrlKey || e.metaKey) && !getSelection().toString() && stareRul !== 'liber') { e.preventDefault(); opreste(false); }
    });
    shIn.addEventListener('paste', (e) => {
      const t = e.clipboardData?.getData('text/plain');
      if (!t || !t.includes('\n')) return;
      e.preventDefault();
      const linii = t.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
      if (modShell === 'repl') { shIn.textContent += linii.shift(); for (const l of linii) { trimiteRand(); shIn.textContent = l; } } else { for (let i = 0; i < linii.length - 1; i++) { shIn.textContent += linii[i]; trimiteRand(); } shIn.textContent += linii[linii.length - 1]; }
      focusShell();
    });

    // =====================================================================
    // VARIABILE
    // =====================================================================
    let varsVechi = new Map();
    function redaVars(v) {
      if (!v) return;
      const rand = (x, prefix) => {
        const vechi = varsVechi.get(prefix + x.n);
        const tr = h('tr', { class: vechi !== undefined && vechi !== x.v ? 'schimbat' : '' }, h('td', { class: 'n' }, x.n), h('td', { class: 'v', title: `${x.t}: ${x.v}` }, x.v));
        return tr;
      };
      const nou = new Map();
      const sectiuni = [];
      if (v.locale) {
        sectiuni.push(h('tr', { class: 'cap' }, h('th', { colspan: '2' }, `Variabile locale – funcția ${v.locale.nume}()`)));
        for (const x of v.locale.vars) { sectiuni.push(rand(x, 'l:')); nou.set(`l:${x.n}`, x.v); }
        sectiuni.push(h('tr', { class: 'cap' }, h('th', { colspan: '2' }, 'Variabile globale')));
      }
      for (const x of v.globale) { sectiuni.push(rand(x, 'g:')); nou.set(`g:${x.n}`, x.v); }
      varsVechi = nou;
      if (!v.globale.length && !v.locale) { umple(varsCorp, h('p', { class: 'ap-python-gol' }, 'Aici apar variabilele programului după ce îl rulezi (F5) sau în timpul depanării pas cu pas.')); return; }
      umple(varsCorp, h('table', { class: 'ap-python-vt' }, h('thead', {}, h('tr', {}, h('th', {}, 'Nume'), h('th', {}, 'Valoare'))), h('tbody', {}, sectiuni)));
    }

    // =====================================================================
    // FEREASTRA „Python Turtle Graphics”
    // =====================================================================
    const twCanvas = h('canvas', { class: 'ap-python-tw-c', 'aria-label': 'Desenul țestoasei' });
    const twTitlu = h('span', {}, 'Python Turtle Graphics');
    const twCap = h('div', { class: 'ap-python-tw-cap' }, ic('testoasa'), twTitlu, h('span', { class: 'ap-python-spatiu' }),
      h('button', { type: 'button', class: 'ap-python-tw-b', title: 'Descarcă desenul (.png)', 'aria-label': 'Descarcă desenul', onclick: () => descarcaDesen() }, '⤓'),
      h('button', { type: 'button', class: 'ap-python-tw-b x', title: 'Închide fereastra', 'aria-label': 'Închide fereastra țestoasei', onclick: () => { tw.el.hidden = true; } }, '✕'));
    const tw = { el: h('div', { class: 'ap-python-tw', hidden: true, role: 'dialog', 'aria-label': 'Python Turtle Graphics' }, twCap, h('div', { class: 'ap-python-tw-zona' }, twCanvas)), pus: false };
    app.append(tw.el);
    // starea desenului: elementele terminate (pentru redesenare), țestoasele, coada de animație
    const tt = { W: 640, H: 560, bg: '#ffffff', elem: [], t: new Map(), umplere: new Map(), strat: null, folosit: false, anim: null };
    function resetTestoasa() {
      tt.W = 640; tt.H = 560; tt.bg = '#ffffff'; tt.elem = []; tt.t = new Map(); tt.umplere = new Map(); tt.anim = null; tt.folosit = false;
      twTitlu.textContent = 'Python Turtle Graphics';
      refaStrat(); deseneazaTot();
    }
    function arataTestoasa() {
      if (tw.el.hidden) {
        tw.el.hidden = false;
        if (!tw.pus) {
          tw.pus = true;
          const r = app.getBoundingClientRect(), c = corp.getBoundingClientRect();
          const lat = Math.round(Math.min(Math.max(320, r.width * 0.42), 560));
          const ina = Math.round(Math.min(lat * tt.H / tt.W + 30, c.height - 10));
          tw.el.style.width = `${lat}px`; tw.el.style.height = `${ina}px`;
          tw.el.style.left = `${Math.max(4, r.width - lat - 12)}px`; tw.el.style.top = `${Math.max(4, c.top - r.top + 6)}px`;
        }
        dimensiuneCanvas();
      }
    }
    // tragerea ferestrei de bara de titlu
    twCap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      const r0 = tw.el.getBoundingClientRect(), a = app.getBoundingClientRect();
      const dx = e.clientX - r0.left, dy = e.clientY - r0.top;
      const mut = (ev) => { tw.el.style.left = `${Math.max(0, Math.min(ev.clientX - dx - a.left, a.width - 80))}px`; tw.el.style.top = `${Math.max(0, Math.min(ev.clientY - dy - a.top, a.height - 30))}px`; };
      const gata = () => { twCap.releasePointerCapture?.(e.pointerId); twCap.removeEventListener('pointermove', mut); twCap.removeEventListener('pointerup', gata); };
      twCap.setPointerCapture?.(e.pointerId);
      twCap.addEventListener('pointermove', mut); twCap.addEventListener('pointerup', gata);
    });
    const ro = new ResizeObserver(() => { if (!tw.el.hidden) dimensiuneCanvas(); });
    ro.observe(tw.el);
    function dimensiuneCanvas() {
      const z = twCanvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(10, Math.round(z.width * dpr)), hh = Math.max(10, Math.round(z.height * dpr));
      if (twCanvas.width !== w || twCanvas.height !== hh) { twCanvas.width = w; twCanvas.height = hh; }
      deseneazaTot();
    }
    // stratul cu desenul terminat, la mărimea lumii țestoasei
    function refaStrat() {
      const c = tt.strat || document.createElement('canvas');
      const sc = 2;
      c.width = tt.W * sc; c.height = tt.H * sc;
      tt.strat = c;
      const x = c.getContext('2d');
      x.setTransform(sc, 0, 0, sc, 0, 0);
      x.fillStyle = tt.bg; x.fillRect(0, 0, tt.W, tt.H);
      for (const el of tt.elem) deseneazaElem(x, el);
    }
    const cx = (x) => tt.W / 2 + x, cy = (y) => tt.H / 2 - y;
    function deseneazaElem(x, el) {
      x.lineCap = 'round'; x.lineJoin = 'round';
      switch (el.k) {
        case 'l': x.strokeStyle = el.c; x.lineWidth = Math.max(el.w, 0.5); x.beginPath(); x.moveTo(cx(el.x1), cy(el.y1)); x.lineTo(cx(el.x2), cy(el.y2)); x.stroke(); break;
        case 'p': if (el.pts.length > 2) { x.fillStyle = el.c; x.beginPath(); el.pts.forEach(([a, b], i) => (i ? x.lineTo(cx(a), cy(b)) : x.moveTo(cx(a), cy(b)))); x.closePath(); x.fill('nonzero'); } break;
        case 'd': x.fillStyle = el.c; x.beginPath(); x.arc(cx(el.x), cy(el.y), el.s / 2, 0, Math.PI * 2); x.fill(); break;
        case 't': {
          const [fam, sz, stil] = el.font;
          x.font = `${/italic/.test(stil) ? 'italic ' : ''}${/bold/.test(stil) ? 'bold ' : ''}${Math.round(sz * 1.33)}px ${/courier/i.test(fam) ? 'monospace' : /times/i.test(fam) ? 'serif' : 'Arial, sans-serif'}`;
          x.fillStyle = el.c; x.textAlign = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left'; x.textBaseline = 'alphabetic';
          x.fillText(el.s, cx(el.x), cy(el.y) - 2); break;
        }
        case 's': forma(x, el.forma, el.x, el.y, el.h, el.pc, el.fc, el.scara); break;
        default:
      }
    }
    function forma(x, f, px, py, hd, pc, fc, scara = 1) {
      const pts = FORME[f] || FORME.classic;
      if (!pts.length) return;
      const r = (hd - 90) * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
      x.beginPath();
      pts.forEach(([a, b], i) => { const X = cx(px + (a * co - b * si) * scara), Y = cy(py + (a * si + b * co) * scara); if (i) x.lineTo(X, Y); else x.moveTo(X, Y); });
      x.closePath();
      x.fillStyle = fc; x.fill(); x.strokeStyle = pc; x.lineWidth = 1; x.stroke();
    }
    function deseneazaTot() {
      if (tw.el.hidden) return;
      const x = twCanvas.getContext('2d');
      const W = twCanvas.width, H = twCanvas.height;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, W, H);
      const sc = Math.min(W / tt.W, H / tt.H);
      const ox = (W - tt.W * sc) / 2, oy = (H - tt.H * sc) / 2;
      if (tt.strat) x.drawImage(tt.strat, ox, oy, tt.W * sc, tt.H * sc);
      x.setTransform(sc, 0, 0, sc, ox, oy);
      x.save(); x.beginPath(); x.rect(0, 0, tt.W, tt.H); x.clip();
      const a = tt.anim;
      if (a && a.op.o === 'mv' && a.op.pen) { const t = a.op; const f = Math.min(1, a.prog / a.tot); deseneazaElem(x, { k: 'l', x1: t.x0, y1: t.y0, x2: t.x0 + (t.x - t.x0) * f, y2: t.y0 + (t.y - t.y0) * f, c: t.c, w: t.w }); }
      for (const s of tt.t.values()) if (s.vis) forma(x, s.forma, s.x, s.y, s.h, s.pc, s.fc, s.scara);
      x.restore();
    }
    function adaugaElem(el) { tt.elem.push(el); const x = tt.strat.getContext('2d'); deseneazaElem(x, el); }
    function tStare(id) { if (!tt.t.has(id)) tt.t.set(id, { x: 0, y: 0, h: 0, vis: true, forma: 'classic', pc: 'black', fc: 'black', scara: 1 }); return tt.t.get(id); }
    // aplică imediat o operație (fără animație); întoarce true dacă desenul s-a schimbat
    function aplicaOp(op) {
      const s = op.id ? tStare(op.id) : null;
      switch (op.o) {
        case 'nou': tStare(op.id).forma = op.forma; break;
        case 'mv': if (op.pen && (op.x !== op.x0 || op.y !== op.y0)) adaugaElem({ k: 'l', x1: op.x0, y1: op.y0, x2: op.x, y2: op.y, c: op.c, w: op.w, id: op.id }); s.x = op.x; s.y = op.y; break;
        case 'rot': s.h = op.h; break;
        case 'cul': s.pc = op.pc; s.fc = op.fc; break;
        case 'vis': s.vis = op.v; break;
        case 'forma': s.forma = op.forma; break;
        case 'scara': s.scara = op.s; break;
        case 'dot': adaugaElem({ k: 'd', x: op.x, y: op.y, s: op.s, c: op.c, id: op.id }); break;
        case 'txt': adaugaElem({ k: 't', x: op.x, y: op.y, s: op.s, align: op.align, font: op.font, c: op.c, id: op.id }); break;
        case 'stamp': adaugaElem({ k: 's', x: op.x, y: op.y, h: op.h, forma: s.forma, pc: s.pc, fc: s.fc, scara: s.scara, id: op.id }); break;
        case 'bf': tt.umplere.set(op.id, tt.elem.length); break;
        case 'ef': { const i = tt.umplere.has(op.id) ? tt.umplere.get(op.id) : tt.elem.length; tt.umplere.delete(op.id); tt.elem.splice(Math.min(i, tt.elem.length), 0, { k: 'p', pts: op.pts, c: op.c, id: op.id }); refaStrat(); break; }
        case 'clear': tt.elem = tt.elem.filter((e) => e.id !== op.id); refaStrat(); break;
        case 'clearall': tt.elem = []; tt.bg = '#ffffff'; refaStrat(); break;
        case 'bg': tt.bg = op.c; refaStrat(); break;
        case 'titlu': twTitlu.textContent = op.s; break;
        case 'setup': { const lat = op.w === null ? tt.W : op.w <= 1 ? Math.round(op.w * 1280) : op.w; const ina = op.h === null ? tt.H : op.h <= 1 ? Math.round(op.h * 800) : op.h; tt.W = Math.max(100, Math.min(2000, lat)); tt.H = Math.max(100, Math.min(2000, ina)); refaStrat(); break; }
        default:
      }
    }

    // =====================================================================
    // RULAREA: coada de mesaje de la motor (ieșire, desen, input, final),
    // redată în ordine; mișcările țestoasei sunt animate.
    // =====================================================================
    let worker = null, trimite = null, idSesiune = 0;
    function pornesteMotor() {
      if (worker || trimite) return;
      const id = ++idSesiune;
      try {
        worker = new Worker(SCRIPT);
        worker.onmessage = (e) => { if (id === idSesiune) primeste(e.data); };
        worker.onerror = (e) => { e.preventDefault?.(); if (id !== idSesiune) return; worker = null; trimite = null; motorPePagina(id); };
        trimite = (m) => worker.postMessage(m);
      } catch { worker = null; motorPePagina(id); }
    }
    function motorPePagina(id) {
      const p = motor((m) => setTimeout(() => { if (id === idSesiune) primeste(m); }, 0));
      trimite = (m) => setTimeout(() => p(m), 0);
    }
    function opresteMotor() { idSesiune++; if (worker) worker.terminate(); worker = null; trimite = null; coada.length = 0; tt.anim = null; }
    let stareRul = 'liber'; // liber | rulare | pauza | repl
    let dbgRand = 0, dbgFila = null, filaRulare = null, iesireRulare = '', intrariRulare = [], ttRulare = false, primaComanda = true;
    const coada = [];
    let rafPornit = false;
    function primeste(m) {
      if (m.t === 'lot') { for (const x of m.l) coada.push(x); } else coada.push(m);
      pompa();
    }
    function pompa() {
      while (coada.length) {
        const x = coada[0];
        if (x.t === 'tt') {
          if (!tt.folosit) { tt.folosit = true; ttRulare = true; arataTestoasa(); }
          const op = x.op;
          if ((op.o === 'mv' || op.o === 'rot') && op.sp > 0) { // animație: se continuă în cadrele următoare
            if (!rafPornit) { rafPornit = true; requestAnimationFrame(cadru); }
            return;
          }
          aplicaOp(op); coada.shift();
          if (!rafPornit) { rafPornit = true; requestAnimationFrame(cadru); }
          continue;
        }
        coada.shift();
        trateaza(x);
      }
    }
    function cadru() {
      rafPornit = false;
      let buget = 4000;
      while (coada.length && buget > 0) {
        const x = coada[0];
        if (x.t !== 'tt') { coada.shift(); trateaza(x); continue; }
        const op = x.op;
        if ((op.o === 'mv' || op.o === 'rot') && op.sp > 0) {
          const s = tStare(op.id);
          if (!tt.anim || tt.anim.op !== op) {
            const tot = op.o === 'mv' ? Math.hypot(op.x - op.x0, op.y - op.y0) : Math.abs(op.d);
            tt.anim = { op, prog: 0, tot, h0: s.h };
            if (tot < 0.01 || (op.o === 'rot' && !s.vis)) { tt.anim = null; aplicaOp(op); coada.shift(); buget--; continue; }
          }
          const a = tt.anim;
          a.prog += op.o === 'mv' ? PX_CADRU[op.sp] : GR_CADRU[op.sp];
          if (a.prog >= a.tot) { tt.anim = null; aplicaOp(op); coada.shift(); buget -= 50; if (buget < 3950) break; continue; }
          const f = a.prog / a.tot;
          if (op.o === 'mv') { s.x = op.x0 + (op.x - op.x0) * f; s.y = op.y0 + (op.y - op.y0) * f; } else s.h = a.h0 + op.d * f;
          break;
        }
        aplicaOp(op); coada.shift(); buget--;
      }
      deseneazaTot();
      if (coada.length && !rafPornit) { rafPornit = true; requestAnimationFrame(cadru); }
    }
    function trateaza(x) {
      switch (x.t) {
        case 'out': shScrie(x.s, x.k === 'e' ? 'e' : 'o'); if (stareRul === 'rulare') iesireRulare += x.s; break;
        case 'input':
          modShell = 'input';
          inchideSpan();
          stare('Programul așteaptă să scrii ceva în Shell și să apeși Enter.');
          if (coadaIntrare.length) { const t = coadaIntrare.shift(); shScrie(`${t}\n`, 'in'); inchideSpan(); modShell = 'rulare'; trimiteIntrare(t); } else { shIn.focus({ preventScroll: true }); focusShell(); }
          break;
        case 'pauza':
          stareRul = 'pauza';
          dbgRand = x.rand; dbgFila = filaRulare;
          if (dbgFila === F()) { reda(); redaGutter(); arataRand(x.rand); }
          redaVars(x.vars);
          stare(`Depanare: urmează rândul ${x.rand}${x.stiva.length > 1 ? ` (în funcția ${x.stiva[x.stiva.length - 1].nume})` : ''}. F6 = pas peste, F7 = pas în, F8 = continuă.`);
          actualizeazaUnelte();
          break;
        case 'gata': terminat(x); break;
        default:
      }
    }
    function trimiteIntrare(t) { stare('Programul rulează…'); if (stareRul === 'rulare' || stareRul === 'repl' || stareRul === 'pauza') { intrariRulare.push(t); trimite?.({ c: 'input', text: t }); } }
    function terminat(x) {
      const eraRepl = stareRul === 'repl';
      const r = x.rez || {};
      if (!r.ok && r.eroare) {
        if (!laFinalRand()) shScrie('\n');
        shScrie(r.eroare.text, 'e');
        if (r.eroare.expl) { shScrie(r.eroare.expl, 'ex'); inchideSpan(); }
        if (!eraRepl) iesireRulare += r.eroare.text;
        // rândul cu eroarea se marchează în editor (dacă eroarea e în programul din editor)
        if (filaRulare && r.eroare.rand && r.eroare.fisier !== '<pyshell>' && !eraRepl) { erori.set(filaRulare, r.eroare.rand); if (filaRulare === F()) { reda(); redaGutter(); arataRand(r.eroare.rand); } }
      }
      if (!eraRepl) { ultimaRulare = { fila: filaRulare, iesire: iesireRulare, intrari: x.intrari || intrariRulare, turtle: ttRulare }; }
      stareRul = 'liber'; dbgRand = 0; dbgFila = null;
      coadaIntrare = [];
      reda(); redaGutter();
      redaVars(x.vars);
      stare(eraRepl ? '' : r.ok ? 'Programul s-a terminat.' : 'Programul s-a oprit din cauza unei erori (vezi explicația din Shell).');
      prompt();
      actualizeazaUnelte();
    }
    let ultimaRulare = null;
    function executaComanda(cod) {
      pornesteMotor();
      stareRul = 'repl'; modShell = 'rulare';
      actualizeazaUnelte();
      if (primaComanda) primaComanda = false;
      trimite({ c: 'repl', cod });
    }
    function ruleaza(depanare) {
      const f = F();
      f.cod = ta.value;
      inchideMeniuri();
      if (stareRul !== 'liber') opresteMotor();
      coada.length = 0; coadaIntrare = []; blocRepl = [];
      pornesteMotor();
      // un fișier salvat se salvează automat înainte de rulare (ca în Thonny)
      if (f.id && f.mod) salveaza();
      erori.delete(f);
      filaRulare = f; iesireRulare = ''; intrariRulare = []; ttRulare = false; varsVechi = new Map();
      if (tt.folosit || !tw.el.hidden) { resetTestoasa(); }
      tw.el.hidden = true;
      // în Shell: ca în Thonny, comanda magică %Run
      shIn.textContent = '';
      if (!/>>> $/.test(shIn.previousSibling?.textContent || '')) { if (!laFinalRand()) shScrie('\n'); shScrie('>>> ', 'p'); inchideSpan(); }
      shScrie(`${depanare ? '%Debug' : '%Run'} ${f.id ? f.nume : '-c $EDITOR_CONTENT'}\n`, 'cmd'); inchideSpan();
      stareRul = 'rulare'; modShell = 'rulare';
      dbgRand = 0; dbgFila = null;
      reda(); redaGutter();
      stare(depanare ? 'Depanare pornită…' : 'Programul rulează…');
      actualizeazaUnelte();
      trimite({ c: 'run', cod: f.cod, fisier: f.id ? `${DIR}\\${f.nume}` : '<untitled>', dbg: depanare, bp: f.bp });
      shIn.focus({ preventScroll: true }); focusShell();
    }
    function pas(mod) {
      if (stareRul !== 'pauza') return;
      stareRul = 'rulare';
      dbgRand = 0; reda(); redaGutter();
      actualizeazaUnelte();
      stare('Programul rulează…');
      trimite({ c: 'dbg', mod, bp: filaRulare ? filaRulare.bp : [] });
    }
    function opreste(manual) {
      const rula = stareRul !== 'liber';
      opresteMotor();
      stareRul = 'liber'; dbgRand = 0; dbgFila = null; coadaIntrare = []; blocRepl = []; modShell = 'repl';
      reda(); redaGutter();
      shIn.textContent = '';
      if (!laFinalRand()) shScrie('\n');
      if (rula) { shScrie('Programul a fost oprit.\n', 'info'); if (filaRulare) ultimaRulare = { fila: filaRulare, iesire: iesireRulare, intrari: intrariRulare, turtle: ttRulare }; } else if (manual) shScrie('Python a fost repornit (variabilele au fost șterse).\n', 'info');
      if (manual) { pornesteMotor(); redaVars({ globale: [] }); }
      prompt();
      stare(rula ? 'Programul a fost oprit.' : '');
      actualizeazaUnelte();
    }
    function actualizeazaUnelte() {
      const p = stareRul === 'pauza';
      for (const k of ['over', 'into', 'out', 'resume']) TB[k].disabled = !p;
      TB.stop.classList.toggle('activ', stareRul !== 'liber');
      app.classList.toggle('ruleaza', stareRul === 'rulare' || stareRul === 'pauza');
    }

    // =====================================================================
    // ASPECT, TASTE, PREDARE
    // =====================================================================
    function aplicaAspect() {
      app.style.setProperty('--ap-fs', `${pref.fs}px`);
      panouVars.hidden = !pref.vars; splitV.hidden = !pref.vars;
      if (pref.varsW) panouVars.style.width = `${pref.varsW}px`;
      if (pref.shellH) panouShell.style.height = `${pref.shellH}px`;
      salvPref();
      requestAnimationFrame(() => { masoara(); reda(); sincronizeaza(); });
    }
    function zoom(d) { pref.fs = d === 0 ? 15 : Math.max(10, Math.min(28, pref.fs + d)); aplicaAspect(); }
    function trage(el, fn) {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('trage');
        const mut = (ev) => fn(ev);
        const gata = () => { el.classList.remove('trage'); el.removeEventListener('pointermove', mut); el.removeEventListener('pointerup', gata); el.removeEventListener('pointercancel', gata); salvPref(); sincronizeaza(); };
        el.addEventListener('pointermove', mut); el.addEventListener('pointerup', gata); el.addEventListener('pointercancel', gata);
      });
    }
    trage(splitV, (e) => { const r = corp.getBoundingClientRect(); pref.varsW = Math.round(Math.max(160, Math.min(r.right - e.clientX, r.width - 300))); panouVars.style.width = `${pref.varsW}px`; });
    trage(splitH, (e) => { const r = stanga.getBoundingClientRect(); pref.shellH = Math.round(Math.max(70, Math.min(r.bottom - e.clientY, r.height - 120))); panouShell.style.height = `${pref.shellH}px`; });
    function ecranComplet() { if (document.fullscreenElement) document.exitFullscreen?.(); else app.requestFullscreen?.().catch(() => toast('Browserul nu permite ecranul complet aici.')); }
    function descarcaDesen() {
      if (!tt.strat) return;
      const a = h('a', { href: tt.strat.toDataURL('image/png'), download: `${(F().id ? F().nume : 'desen').replace(/\.py$/, '')}.png` });
      document.body.append(a); a.click(); a.remove();
    }
    function ajutor() {
      const r = (k, t) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, t));
      fereastra('Ghid rapid', h('div', { class: 'ap-python-ajutor' },
        h('p', {}, 'Scrie programul în editor și apasă butonul verde (sau F5). Rezultatul apare în Shell, dedesubt. Când programul cere date cu input(), scrie răspunsul în Shell și apasă Enter.'),
        h('p', {}, 'În Shell, după >>>, poți scrie și comenzi Python care se execută imediat (de exemplu 2 ** 10 sau print(x)). Panoul Variabile arată valorile după rulare.'),
        h('p', {}, 'Depanarea (gândacul, Ctrl+F5) execută programul pas cu pas: rândul care urmează este colorat cu galben. Clic pe numărul unui rând pune un punct de oprire (roșu).'),
        h('table', { class: 'ap-python-taste' }, h('tbody', {}, r('F5', 'Rulează'), r('Ctrl+F5', 'Depanează (pas cu pas)'), r('F6 / F7 / F8', 'Pas peste / Pas în / Continuă'), r('Ctrl+F2', 'Oprește programul'), r('Ctrl+S', 'Salvează'), r('Ctrl+O', 'Deschide'), r('Tab / Shift+Tab', 'Indentează / dedentează'), r('Ctrl+3', 'Comentează rândurile'), r('Ctrl+F', 'Caută'), r('↑ ↓ în Shell', 'Comenzile anterioare'))),
        h('p', {}, 'Module disponibile: math, random, time, turtle.')), [{ t: 'Închide', v: null, prim: true }], { lat: 560 });
    }
    function laTasta(e) {
      if (!app.isConnected) { document.removeEventListener('keydown', laTasta, true); return; }
      if (app.querySelector('.ap-python-dlg-fundal')) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      const fa = (f) => { e.preventDefault(); e.stopPropagation(); f(); };
      if (k === 'F5') return fa(() => ruleaza(ctrl));
      if (k === 'F6') return fa(() => pas('over'));
      if (k === 'F7') return fa(() => pas(e.shiftKey ? 'out' : 'into'));
      if (k === 'F8') return fa(() => pas('resume'));
      if (k === 'F2' && ctrl) return fa(() => opreste(true));
      if (k === 'Escape' && meniuDeschis) return fa(() => inchideMeniuri());
      if (k === 'F10') return fa(() => deschideMeniu(barMeniu.firstChild, true));
      if (!ctrl) return;
      const kl = k.toLowerCase();
      if (kl === 's') return fa(() => (e.shiftKey ? salveazaCa() : salveaza()));
      if (kl === 'o') return fa(() => dialogDeschide());
      if (kl === 'g') return fa(() => mergiLaRandDlg());
      if (kl === 'f' || kl === 'h') return fa(() => arataCautare());
      if (k === '+' || k === '=') return fa(() => zoom(1));
      if (k === '-') return fa(() => zoom(-1));
      if (k === '0') return fa(() => zoom(0));
    }
    document.addEventListener('keydown', laTasta, true);
    // navigarea între meniuri cu săgețile
    app.addEventListener('keydown', (e) => {
      const l = app.querySelector('.ap-python-lista');
      if (!l) return;
      const bs = [...l.querySelectorAll('button:not([disabled])')];
      const i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length]?.focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length]?.focus(); } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && meniuDeschis) {
        e.preventDefault();
        const ms = [...barMeniu.children]; const j = ms.indexOf(meniuDeschis);
        deschideMeniu(ms[(j + (e.key === 'ArrowRight' ? 1 : -1) + ms.length) % ms.length], true);
      }
    });
    window.addEventListener('hashchange', function x() { opresteMotor(); ro.disconnect(); salveazaTabs(); window.removeEventListener('hashchange', x); });
    window.addEventListener('beforeunload', function x() { if (!app.isConnected) { window.removeEventListener('beforeunload', x); return; } salveazaTabs(); });

    // bara pentru predarea la sarcină
    function lucrare() {
      const f = F();
      f.cod = ta.value;
      const u = ultimaRulare && ultimaRulare.fila === f ? ultimaRulare : null;
      const l = { titlu: f.id ? f.nume : 'program.py', tip: 'cod', limbaj: 'python', date: f.cod, intrare: u ? u.intrari.join('\n') : '', iesire: u ? u.iesire : '' };
      if (u && u.turtle && tt.strat) l.imagine = tt.strat.toDataURL('image/png');
      return l;
    }
    if (params?.get('sarcina') && window.EduSarcini?.bara) {
      try {
        const b = await window.EduSarcini.bara('python', async () => lucrare());
        if (b instanceof Node) app.prepend(b);
      } catch { /* fără bară */ }
    }

    show(h('div', { class: 'lab-ecran' }, app));
    document.title = 'Thonny (Python) – edudigi';
    aplicaAspect();
    masoara();
    shScrie('Python 3.13 (edudigi, rulează în browser)\n', 'info');
    shScrie('Scrie programul sus și apasă butonul verde (F5). Aici, după >>>, poți încerca și comenzi.\n', 'info');
    prompt();
    redaVars({ globale: [] });
    activeaza(activ, true);
    actualizeazaUnelte();
    refaStrat();
    pornesteMotor();
  } });
})();

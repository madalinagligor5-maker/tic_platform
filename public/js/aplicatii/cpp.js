'use strict';
// Editor C++ pentru clasele VII–VIII: un Code::Blocks simplificat care rulează în browser.
// Conține un interpretor pentru subsetul de C++ din lecții (fără eval / new Function), care rulează
// într-un Web Worker creat din ACELAȘI fișier (permis de CSP: script-src 'self'), ca pagina să nu se blocheze.
(() => {
  // =====================================================================
  // INTERPRETORUL C++ (subsetul de gimnaziu). Fără eval: codul este analizat
  // (lexer → arbore sintactic) și transformat în funcții JS (closure-uri).
  // =====================================================================
  const CPP = (() => {
    const MAX_PASI = 5000000, MAX_TIMP = 3000, MAX_IESIRE = 200000, MAX_ADANCIME = 4000;

    class EroareCompilare extends Error { constructor(rand, mesaj) { super(mesaj); this.rand = rand; } }
    class EroareRulare extends Error { constructor(rand, mesaj) { super(mesaj); this.rand = rand; } }
    class CereIntrare extends Error { }
    class Pauza extends Error { constructor(date) { super('pauză'); this.date = date; } } // depanatorul s-a oprit la un rând
    const err = (rand, mesaj) => { throw new EroareCompilare(rand, mesaj); };

    // ---------- Lexer ----------
    const OPS = ['<<=', '>>=', '::', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '->',
      '?', ':', ';', ',', '.', '(', ')', '[', ']', '{', '}', '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^'];
    const ESC = { n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11, '?': 63 };

    function lexeaza(src, defines, includes, liniaStart = 1) {
      const toks = [];
      let i = 0, rand = liniaStart, inceputRand = true;
      const n = src.length;
      while (i < n) {
        const c = src[i];
        if (c === '\n') { rand++; i++; inceputRand = true; continue; }
        if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === ' ') { i++; continue; }
        if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
        if (c === '/' && src[i + 1] === '*') {
          const r0 = rand; i += 2;
          while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') rand++; i++; }
          if (i >= n) err(r0, 'comentariul început cu /* nu este închis cu */');
          i += 2; continue;
        }
        if (c === '#') {
          if (!inceputRand || !defines) err(rand, 'caracterul # poate apărea doar la începutul unui rând (#include)');
          let j = i; while (j < n && src[j] !== '\n') j++;
          const linie = src.slice(i, j).replace(/\/\/.*$/, '').trim();
          let m;
          if ((m = /^#\s*include\s*([<"])\s*([\w./+]+)\s*([>"])$/.exec(linie))) includes.push({ nume: m[2], rand });
          else if (/^#\s*include\b/.test(linie)) err(rand, 'scrie biblioteca între < și >, de exemplu: #include <iostream>');
          else if ((m = /^#\s*define\s+([A-Za-z_]\w*)\s*(.*)$/.exec(linie))) defines.set(m[1], lexeaza(m[2], null, includes, rand).filter((t) => t.k !== 'eof'));
          else err(rand, `directiva „${linie.split(/\s/)[0]}” nu este acceptată în acest editor (doar #include și #define)`);
          i = j; continue;
        }
        inceputRand = false;
        const t0 = { rand, poz: i };
        if (/[A-Za-z_]/.test(c)) {
          let j = i + 1; while (j < n && /\w/.test(src[j])) j++;
          const v = src.slice(i, j); i = j;
          if (defines && defines.has(v)) { for (const d of defines.get(v)) toks.push({ ...d, rand }); continue; }
          toks.push({ ...t0, k: 'id', v }); continue;
        }
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
          let j = i, real = false, v;
          if (c === '0' && /[xX]/.test(src[i + 1] || '')) { j = i + 2; while (/[0-9a-fA-F]/.test(src[j] || '')) j++; v = parseInt(src.slice(i + 2, j), 16); }
          else {
            while (/[0-9]/.test(src[j] || '')) j++;
            if (src[j] === '.') { real = true; j++; while (/[0-9]/.test(src[j] || '')) j++; }
            if (/[eE]/.test(src[j] || '') && /[0-9+-]/.test(src[j + 1] || '')) { real = true; j++; if (/[+-]/.test(src[j])) j++; while (/[0-9]/.test(src[j] || '')) j++; }
            v = real ? parseFloat(src.slice(i, j)) : src.slice(i, j);
          }
          let suf = ''; while (/[uUlLfF]/.test(src[j] || '')) suf += src[j++].toLowerCase();
          if (/[A-Za-z_0-9.]/.test(src[j] || '')) err(rand, `numărul „${src.slice(i, j + 1)}” este scris greșit`);
          i = j;
          if (real || suf === 'f') toks.push({ ...t0, k: 'num', tip: suf.includes('f') ? 'float' : 'double', v: suf.includes('f') ? Math.fround(Number(v)) : Number(v) });
          else {
            const b = BigInt(v);
            let tip = 'int';
            if (suf.includes('ll') || suf === 'l' || suf === 'lu' || suf === 'ul') tip = suf.includes('u') ? 'ull' : 'll';
            else if (suf.includes('u')) tip = b > 4294967295n ? 'ull' : 'uint';
            else if (b > 2147483647n) tip = 'll';
            toks.push({ ...t0, k: 'num', tip, v: tip === 'll' || tip === 'ull' ? b : Number(b) });
          }
          continue;
        }
        if (c === '"' || c === "'") {
          let j = i + 1, s = '';
          while (j < n && src[j] !== c) {
            if (src[j] === '\n') err(rand, c === '"' ? 'textul dintre ghilimele nu este închis pe același rând (lipsește ")' : "caracterul dintre apostrofuri nu este închis (lipsește ')");
            if (src[j] === '\\') {
              const e = src[j + 1];
              if (!(e in ESC)) err(rand, `secvența \\${e} nu există (folosește \\n, \\t, \\\\, \\" sau \\')`);
              s += String.fromCharCode(ESC[e]); j += 2;
            } else s += src[j++];
          }
          if (j >= n) err(rand, c === '"' ? 'textul dintre ghilimele nu este închis (lipsește ")' : "lipsește ' de închidere");
          i = j + 1;
          if (c === '"') {
            const ult = toks[toks.length - 1];
            if (ult && ult.k === 'str') ult.v += s; // "ab" "cd" se lipesc
            else toks.push({ ...t0, k: 'str', v: s });
          } else {
            if (s.length !== 1) err(rand, s.length ? `între apostrofuri se pune un singur caracter ('${s}' are ${s.length}); pentru texte folosește ghilimele "${s}"` : "între apostrofuri trebuie un caracter: ''");
            const cod = s.charCodeAt(0);
            toks.push({ ...t0, k: 'num', tip: 'char', v: cod > 127 && cod < 256 ? cod - 256 : cod });
          }
          continue;
        }
        if ('„”“’‘«»'.includes(c)) err(rand, `ghilimele greșite „${c}”: în C++ se folosesc ghilimelele drepte " (sau ' pentru un caracter)`);
        const op = OPS.find((o) => src.startsWith(o, i));
        if (!op) err(rand, /[ăâîșțşţĂÂÎȘȚ]/.test(c) ? `litera „${c}” nu poate fi folosită în cod (doar în texte și comentarii); scrie fără diacritice` : `caracter nepermis în cod: „${c}”`);
        toks.push({ ...t0, k: 'op', v: op }); i += op.length;
      }
      toks.push({ k: 'eof', v: '', rand, poz: n });
      return toks;
    }

    // ---------- Parser: arbore sintactic ----------
    const CUV_TIP = new Set(['int', 'long', 'short', 'unsigned', 'signed', 'float', 'double', 'char', 'bool', 'void', 'const', 'auto', 'string', 'static']);
    const CUV_REZ = new Set(['if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue', 'return', 'true', 'false', 'using', 'namespace', ...CUV_TIP]);
    const NUME_TIP = { int: 'int', uint: 'unsigned', ll: 'long long', ull: 'unsigned long long', short: 'short', char: 'char', bool: 'bool', float: 'float', double: 'double', void: 'void', str: 'text', ostream: 'cout', istream: 'cin' };

    function parseaza(toks) {
      let p = 0;
      const pk = (o = 0) => toks[p + o];
      const ia = () => toks[p++];
      const este = (v, o = 0) => { const t = toks[p + o]; return (t.k === 'op' || t.k === 'id') && t.v === v; };
      const accepta = (v) => { if (este(v)) { p++; return true; } return false; };
      const descrie = (t) => t.k === 'eof' ? 'sfârșitul programului' : t.k === 'str' ? 'un text' : `„${t.k === 'num' && t.tip === 'char' ? `'${String.fromCharCode(t.v & 255)}'` : t.v}”`;
      function asteapta(v, ce) {
        if (este(v)) return ia();
        const ant = toks[p - 1], t = pk();
        if (v === ';') err(ant && t.rand !== ant.rand ? ant.rand : t.rand, `lipsește ';'${ant ? ` după ${descrie(ant)}` : ''}`);
        err(t.rand, `lipsește '${v}'${ce ? ` ${ce}` : ''} (am găsit ${descrie(t)})`);
      }
      function nume(ce) {
        const t = pk();
        if (t.k !== 'id') err(t.rand, `aici trebuie ${ce} (am găsit ${descrie(t)})`);
        if (CUV_REZ.has(t.v)) err(t.rand, `„${t.v}” este un cuvânt rezervat al limbajului și nu poate fi folosit ca nume ${ce.includes('funcț') ? 'de funcție' : 'de variabilă'}`);
        return ia().v;
      }
      const eTip = (o = 0) => { const t = pk(o); return t.k === 'id' && CUV_TIP.has(t.v) || (t.k === 'id' && t.v === 'std' && toks[p + o + 1]?.v === '::' && toks[p + o + 2]?.v === 'string'); };
      function tip() {
        const rand = pk().rand;
        let cnst = false, uns = null, lung = 0, baza = null;
        for (;;) {
          const t = pk();
          if (t.k !== 'id') break;
          if (t.v === 'const') { cnst = true; p++; } else if (t.v === 'static') p++;
          else if (t.v === 'unsigned' || t.v === 'signed') { uns = t.v === 'unsigned'; p++; } else if (t.v === 'long') { lung++; p++; } else if (t.v === 'short') { baza = 'short'; p++; } else if (t.v === 'std' && este('::', 1)) p += 2;
          else if (['int', 'float', 'double', 'char', 'bool', 'void', 'auto', 'string'].includes(t.v) && !baza) { baza = t.v; p++; } else break;
        }
        if (baza === 'string') err(rand, 'tipul string nu este disponibil în acest editor; folosește numere sau caractere (char)');
        if (baza === 'auto') err(rand, 'scrie tipul variabilei (int, double…) în loc de auto');
        let t;
        if (baza === 'double' || baza === 'float' || baza === 'bool' || baza === 'void') t = baza === 'float' ? 'float' : baza;
        else if (baza === 'char') t = 'char';
        else if (baza === 'short') t = 'short';
        else if (lung >= 1) t = uns ? 'ull' : 'll';
        else t = uns ? 'uint' : 'int';
        if (baza === 'double' && lung) t = 'double';
        return { t, cnst, rand };
      }

      // expresii
      function expr() { let e = atrib(); while (este(',')) { const r = ia().rand; e = { k: 'virg', a: e, b: atrib(), rand: r }; } return e; }
      const ATR = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
      function atrib() {
        const st = tern();
        if (pk().k === 'op' && ATR.has(pk().v)) { const t = ia(); return { k: 'atr', op: t.v, a: st, b: atrib(), rand: t.rand }; }
        return st;
      }
      function tern() {
        const c = bin(0);
        if (este('?')) { const r = ia().rand; const a = expr(); asteapta(':', 'în operatorul ?:'); const b = atrib(); return { k: 'tern', c, a, b, rand: r }; }
        return c;
      }
      const NIV = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '<=', '>', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];
      function bin(niv) {
        if (niv >= NIV.length) return unar();
        let a = bin(niv + 1);
        while (pk().k === 'op' && NIV[niv].includes(pk().v)) {
          const t = ia();
          a = { k: 'bin', op: t.v, a, b: bin(niv + 1), rand: t.rand };
        }
        return a;
      }
      function unar() {
        const t = pk();
        if (t.k === 'op' && ['-', '+', '!', '~', '++', '--'].includes(t.v)) { p++; return { k: t.v === '++' || t.v === '--' ? 'pre' : 'un', op: t.v, a: unar(), rand: t.rand }; }
        if (t.k === 'op' && t.v === '&') err(t.rand, 'operatorul & (adresă) nu este folosit în acest editor; pentru parametri prin referință scrie & în antetul funcției');
        if (t.k === 'op' && t.v === '*') err(t.rand, 'pointerii (*) nu sunt disponibili în acest editor');
        if (este('(') && eTip(1)) { // cast: (int) x
          p++; const ty = tip(); asteapta(')', 'după tipul din conversie');
          return { k: 'cast', tip: ty.t, a: unar(), rand: t.rand };
        }
        if (t.k === 'id' && t.v === 'static_cast') {
          p++; asteapta('<'); const ty = tip(); asteapta('>'); asteapta('('); const a = expr(); asteapta(')');
          return { k: 'cast', tip: ty.t, a, rand: t.rand };
        }
        if (t.k === 'id' && t.v === 'sizeof') err(t.rand, 'sizeof nu este disponibil în acest editor');
        return postfix();
      }
      function postfix() {
        let e = primar();
        for (;;) {
          const t = pk();
          if (este('[')) { p++; const i = expr(); asteapta(']', 'după indicele tabloului'); e = { k: 'idx', a: e, i, rand: t.rand }; }
          else if (este('++') || este('--')) { p++; e = { k: 'post', op: t.v, a: e, rand: t.rand }; }
          else if (este('(')) {
            if (e.k !== 'id') err(t.rand, 'doar funcțiile pot fi apelate cu ( )');
            p++; const args = [];
            if (!este(')')) do { args.push(atrib()); } while (accepta(','));
            asteapta(')', 'la sfârșitul apelului de funcție');
            e = { k: 'apel', nume: e.v, std: e.std, args, rand: e.rand };
          } else if (este('.')) {
            p++; const m = nume('numele unei operații');
            if (e.k === 'id' && (e.v === 'cin' || e.v === 'cout')) {
              asteapta('('); const args = []; if (!este(')')) do { args.push(atrib()); } while (accepta(',')); asteapta(')');
              e = { k: 'metoda', ob: e.v, m, args, rand: t.rand };
            } else err(t.rand, `operația .${m} nu este disponibilă în acest editor`);
          } else if (este('->')) err(t.rand, 'operatorul -> nu este disponibil în acest editor');
          else return e;
        }
      }
      function primar() {
        const t = ia();
        if (t.k === 'num') return { k: 'num', tip: t.tip, v: t.v, rand: t.rand };
        if (t.k === 'str') return { k: 'str', v: t.v, rand: t.rand };
        if (t.k === 'id') {
          if (t.v === 'true' || t.v === 'false') return { k: 'num', tip: 'bool', v: t.v === 'true' ? 1 : 0, rand: t.rand };
          if (t.v === 'std' && este('::')) { p++; const n2 = ia(); if (n2.k !== 'id') err(n2.rand, 'după std:: trebuie un nume'); return { k: 'id', v: n2.v, std: true, rand: n2.rand }; }
          if (CUV_TIP.has(t.v) && este('(')) { p--; const ty = tip(); asteapta('('); const a = expr(); asteapta(')'); return { k: 'cast', tip: ty.t, a, rand: t.rand }; }
          if (CUV_REZ.has(t.v)) err(t.rand, `„${t.v}” nu poate apărea aici, în mijlocul unei expresii`);
          return { k: 'id', v: t.v, rand: t.rand };
        }
        if (t.k === 'op' && t.v === '(') { const e = expr(); asteapta(')', 'pentru paranteza deschisă'); return e; }
        if (t.k === 'eof') err(t.rand, 'programul se termină brusc: lipsește o parte din instrucțiune (sau o acoladă })');
        err(t.rand, `nu mă așteptam la ${descrie(t)} aici`);
      }

      // declarații
      function declaratori(ty, global) {
        const lista = [];
        do {
          const rand = pk().rand;
          if (este('&')) err(rand, 'referințele (&) se folosesc doar la parametrii funcțiilor');
          if (este('*')) err(rand, 'pointerii (*) nu sunt disponibili în acest editor');
          const n = nume('un nume de variabilă');
          const dims = [];
          while (accepta('[')) {
            if (este(']')) { dims.push(null); p++; continue; }
            dims.push(expr()); asteapta(']', 'după dimensiunea tabloului');
          }
          let init = null;
          if (accepta('=')) {
            if (este('{')) init = listaInit(); else init = atrib();
          } else if (este('{')) init = listaInit();
          else if (este('(') && !dims.length) { p++; init = expr(); asteapta(')'); }
          lista.push({ nume: n, dims, init, rand });
        } while (accepta(','));
        asteapta(';');
        return { k: 'decl', tip: ty.t, cnst: ty.cnst, lista, global, rand: ty.rand };
      }
      function listaInit() {
        const r = asteapta('{').rand; const el = [];
        if (!este('}')) do { if (este('}')) break; el.push(este('{') ? listaInit() : atrib()); } while (accepta(','));
        asteapta('}', 'la sfârșitul listei de valori');
        return { k: 'lista', el, rand: r };
      }

      // instrucțiuni
      function bloc() {
        const t = asteapta('{'); const inst = [];
        while (!este('}')) {
          if (pk().k === 'eof') err(t.rand, `lipsește '}': acolada deschisă la rândul ${t.rand} nu este închisă`);
          inst.push(instr());
        }
        const fin = ia().rand;
        return { k: 'bloc', inst, rand: t.rand, fin };
      }
      function instr() {
        const t = pk();
        if (t.k === 'op') {
          if (t.v === '{') return bloc();
          if (t.v === ';') { p++; return { k: 'gol', rand: t.rand }; }
        }
        if (t.k === 'id') {
          switch (t.v) {
            case 'if': {
              p++; asteapta('(', 'după if'); const c = expr(); asteapta(')', 'după condiția lui if');
              const golA = este(';');
              const a = instr(); let b = null;
              if (accepta('else')) b = instr();
              return { k: 'if', c, a, b, golA, rand: t.rand };
            }
            case 'while': { p++; asteapta('(', 'după while'); const c = expr(); asteapta(')', 'după condiția lui while'); const gol = este(';'); return { k: 'while', c, gol, corp: instr(), rand: t.rand }; }
            case 'do': {
              p++; const corp = instr();
              if (!este('while')) err(pk().rand, 'după corpul lui do trebuie să urmeze while (condiție);');
              p++; asteapta('(', 'după while'); const c = expr(); asteapta(')'); asteapta(';');
              return { k: 'do', c, corp, rand: t.rand };
            }
            case 'for': {
              p++; asteapta('(', 'după for');
              let init = null;
              if (eTip()) init = declaratori(tip(), false); else { if (!este(';')) init = { k: 'expr', e: expr(), rand: t.rand }; asteapta(';'); }
              const c = este(';') ? null : expr(); asteapta(';');
              const pas = este(')') ? null : expr(); asteapta(')', 'la sfârșitul lui for(...)');
              const gol = este(';');
              return { k: 'for', init, c, pas, gol, corp: instr(), rand: t.rand };
            }
            case 'switch': {
              p++; asteapta('(', 'după switch'); const c = expr(); asteapta(')');
              const a0 = asteapta('{'); const cazuri = []; const inst = [];
              while (!este('}')) {
                const u = pk();
                if (u.k === 'eof') err(a0.rand, `lipsește '}' pentru switch-ul de la rândul ${t.rand}`);
                if (accepta('case')) { const v = tern(); asteapta(':', 'după valoarea din case'); cazuri.push({ v, poz: inst.length, rand: u.rand }); }
                else if (accepta('default')) { asteapta(':', 'după default'); cazuri.push({ v: null, poz: inst.length, rand: u.rand }); }
                else inst.push(instr());
              }
              p++;
              return { k: 'switch', c, cazuri, inst, rand: t.rand };
            }
            case 'case': case 'default': err(t.rand, `„${t.v}” poate apărea doar în interiorul unui switch`); break;
            case 'else': err(t.rand, 'else fără if: verifică acoladele și să nu ai ; după condiția lui if'); break;
            case 'break': p++; asteapta(';'); return { k: 'break', rand: t.rand };
            case 'continue': p++; asteapta(';'); return { k: 'continue', rand: t.rand };
            case 'return': { p++; const e = este(';') ? null : expr(); asteapta(';'); return { k: 'return', e, rand: t.rand }; }
            case 'using': err(t.rand, 'using namespace std; se scrie la începutul programului, înainte de main'); break;
            default:
              if (eTip()) {
                if (este('(', 1)) break; // int(x) – conversie
                return declaratori(tip(), false);
              }
          }
        }
        const e = expr(); asteapta(';');
        return { k: 'expr', e, rand: t.rand };
      }

      // programul
      const prog = { usingStd: false, functii: [], globale: [], ordine: [] };
      while (pk().k !== 'eof') {
        const t = pk();
        if (este('using')) {
          p++;
          if (!accepta('namespace')) err(t.rand, 'scrie: using namespace std;');
          const n = ia(); if (n.v !== 'std') err(t.rand, 'scrie: using namespace std;');
          asteapta(';'); prog.usingStd = true; continue;
        }
        if (este(';')) { p++; continue; }
        if (!eTip()) {
          if (t.k === 'id' && este('(', 1)) err(t.rand, `lipsește tipul funcției: scrie „int ${t.v}()” (sau void, double…)`);
          if (t.k === 'id' && ['cout', 'cin', 'if', 'for', 'while'].includes(t.v)) err(t.rand, `instrucțiunea trebuie scrisă în interiorul funcției main, între { și }`);
          if (t.k === 'op' && t.v === '}') err(t.rand, "acoladă '}' în plus: nu are pereche {");
          err(t.rand, `nu mă așteptam la ${descrie(t)} aici; programul trebuie să conțină int main() { ... }`);
        }
        const ty = tip();
        if (pk().k === 'id' && este('(', 1)) {
          const rn = pk().rand; const n = nume('un nume de funcție'); p++;
          const params = [];
          if (este('void') && este(')', 1)) p++;
          if (!este(')')) do {
            if (!eTip()) err(pk().rand, `aici trebuie tipul parametrului (de exemplu int x), am găsit ${descrie(pk())}`);
            const pt = tip(); const ref = accepta('&');
            const pn = nume('un nume de parametru'); const dims = [];
            while (accepta('[')) { if (este(']')) { dims.push(null); p++; } else { dims.push(expr()); asteapta(']'); } }
            params.push({ tip: pt.t, cnst: pt.cnst, ref, nume: pn, dims, rand: pt.rand });
          } while (accepta(','));
          asteapta(')', `după parametrii funcției ${n}`);
          if (accepta(';')) { const f = { nume: n, tip: ty.t, params, corp: null, rand: rn, proto: true }; prog.functii.push(f); prog.ordine.push(f); continue; }
          if (!este('{')) err(pk().rand, `după antetul funcției ${n}() trebuie să urmeze { (lipsește acolada sau ai pus ; în plus)`);
          const f = { nume: n, tip: ty.t, params, corp: bloc(), rand: rn };
          prog.functii.push(f); prog.ordine.push(f);
        } else {
          const d = declaratori(ty, true);
          prog.globale.push(d); prog.ordine.push(d);
        }
      }
      return prog;
    }

    // ---------- Tipuri și conversii ----------
    const INTREG = new Set(['int', 'uint', 'll', 'ull', 'short', 'char', 'bool']);
    const NUMERIC = new Set([...INTREG, 'float', 'double']);
    const BIG = new Set(['ll', 'ull']);
    const promov = (t) => (t === 'bool' || t === 'char' || t === 'short' ? 'int' : t);
    function comun(a, b) {
      a = promov(a); b = promov(b);
      if (a === 'double' || b === 'double') return 'double';
      if (a === 'float' || b === 'float') return 'float';
      if (a === 'ull' || b === 'ull') return 'ull';
      if (a === 'll' || b === 'll') return 'll';
      if (a === 'uint' || b === 'uint') return 'uint';
      return 'int';
    }
    const dinBig = (v) => Number(v);
    const laBig = (v) => (Number.isFinite(v) ? BigInt(Math.trunc(v)) : 0n);
    // funcție care transformă o valoare de tipul `din` în tipul `la` (null = nu e nevoie)
    function conv(din, la) {
      if (din === la) return null;
      const dinB = BIG.has(din);
      switch (la) {
        case 'int': return dinB ? (v) => Number(BigInt.asIntN(32, v)) : din === 'double' || din === 'float' ? (v) => (Number.isFinite(v) ? (Math.abs(v) < 2147483648 ? Math.trunc(v) | 0 : (v > 0 ? 2147483647 : -2147483648)) : 0) : din === 'uint' ? (v) => v | 0 : din === 'bool' || din === 'char' || din === 'short' ? null : (v) => v | 0;
        case 'uint': return dinB ? (v) => Number(BigInt.asUintN(32, v)) : (din === 'double' || din === 'float') ? (v) => (Number.isFinite(v) ? Number(BigInt.asUintN(32, BigInt(Math.trunc(v)))) : 0) : (v) => v >>> 0;
        case 'short': return dinB ? (v) => Number(BigInt.asIntN(16, v)) : (din === 'double' || din === 'float') ? (v) => ((Number.isFinite(v) ? Math.trunc(v) : 0) << 16) >> 16 : (v) => (v << 16) >> 16;
        case 'char': return dinB ? (v) => Number(BigInt.asIntN(8, v)) : (din === 'double' || din === 'float') ? (v) => ((Number.isFinite(v) ? Math.trunc(v) : 0) << 24) >> 24 : din === 'bool' ? null : (v) => (v << 24) >> 24;
        case 'bool': return dinB ? (v) => (v !== 0n ? 1 : 0) : (v) => (v ? 1 : 0);
        case 'll': return din === 'ull' ? (v) => BigInt.asIntN(64, v) : (din === 'double' || din === 'float') ? (v) => BigInt.asIntN(64, laBig(v)) : (v) => BigInt(v);
        case 'ull': return din === 'll' ? (v) => BigInt.asUintN(64, v) : (din === 'double' || din === 'float') ? (v) => BigInt.asUintN(64, laBig(v)) : (v) => BigInt.asUintN(64, BigInt(v));
        case 'double': return dinB ? dinBig : null;
        case 'float': return dinB ? (v) => Math.fround(Number(v)) : (v) => Math.fround(v);
        default: return null;
      }
    }
    const zero = (t) => (BIG.has(t) ? 0n : 0);
    const TABLOU = { int: Int32Array, uint: Uint32Array, short: Int16Array, char: Int8Array, bool: Uint8Array, float: Float32Array, double: Float64Array, ll: BigInt64Array, ull: BigUint64Array };

    // ---------- Formatarea numerelor reale ca în C++ (printf %g / %f / %e) ----------
    const dv = new DataView(new ArrayBuffer(8));
    function zecimalExact(x) { // x > 0 finit: valoarea = N · 10^-k, exact
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
    function rotunjeste(N, cate) { // N / 10^cate, rotunjit la par (ca printf)
      if (cate <= 0) return N * P10(-cate);
      const d = P10(cate), q = N / d, r = N % d, r2 = r * 2n;
      return r2 > d || (r2 === d && (q & 1n)) ? q + 1n : q;
    }
    function cuZecimale(x, p) { // %.pf
      const { N, k } = zecimalExact(x);
      let s = rotunjeste(N, k - p).toString();
      if (p > 0) { s = s.padStart(p + 1, '0'); s = `${s.slice(0, -p)}.${s.slice(-p)}`; }
      return s;
    }
    function cifreSemnif(x, P) { // P cifre semnificative → { cif, exp }
      const { N, k } = zecimalExact(x);
      const len = N.toString().length;
      let exp = len - 1 - k;
      let q = rotunjeste(N, len - P);
      let cif = q.toString();
      if (cif.length > P) { exp++; cif = cif.slice(0, P); }
      return { cif, exp };
    }
    const expStr = (e) => `e${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')}`;
    function formatReal(x, st) {
      if (Number.isNaN(x)) return 'nan';
      const neg = x < 0 || Object.is(x, -0), a = Math.abs(x), sg = neg ? '-' : '';
      if (a === Infinity) return `${sg}inf`;
      if (st.mod === 'fixed') return a === 0 ? sg + (st.prec > 0 ? `0.${'0'.repeat(st.prec)}` : '0') : sg + cuZecimale(a, st.prec);
      if (st.mod === 'scientific') {
        if (a === 0) return `${sg}${st.prec > 0 ? `0.${'0'.repeat(st.prec)}` : '0'}e+00`;
        const { cif, exp } = cifreSemnif(a, st.prec + 1);
        return `${sg}${cif[0]}${st.prec > 0 ? `.${cif.slice(1)}` : ''}${expStr(exp)}`;
      }
      const P = st.prec === 0 ? 1 : st.prec;
      if (a === 0) return `${sg}0`;
      const { cif, exp } = cifreSemnif(a, P);
      let s;
      if (exp < -4 || exp >= P) {
        let m = cif.length > 1 ? `${cif[0]}.${cif.slice(1)}` : cif;
        if (m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, '');
        s = m + expStr(exp);
      } else {
        if (exp >= 0) s = cif.length > exp + 1 ? `${cif.slice(0, exp + 1)}.${cif.slice(exp + 1)}` : cif.padEnd(exp + 1, '0');
        else s = `0.${'0'.repeat(-exp - 1)}${cif}`;
        if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
      }
      return sg + s;
    }

    // ---------- Compilatorul: arbore → funcții JS ----------
    const BIBLIOTECI = new Set(['iostream', 'cmath', 'iomanip', 'math.h', 'climits', 'cstdlib', 'algorithm', 'bits/stdc++.h', 'stdlib.h', 'limits.h', 'cstdio', 'stdio.h']);
    const MATE = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, exp: Math.exp, log: Math.log, log10: Math.log10, log2: Math.log2, cbrt: Math.cbrt,
      floor: Math.floor, ceil: Math.ceil, trunc: Math.trunc, fabs: Math.abs, round: (x) => (x < 0 ? -Math.round(-x) : Math.round(x)) };
    const CONSTANTE = { INT_MAX: ['int', 2147483647], INT_MIN: ['int', -2147483648], LLONG_MAX: ['ll', 9223372036854775807n], LLONG_MIN: ['ll', -9223372036854775808n], UINT_MAX: ['uint', 4294967295], M_PI: ['double', Math.PI] };

    function compileaza(src, DBG = false) {
      const includes = [];
      const toks = lexeaza(src, new Map(), includes);
      for (const inc of includes) if (!BIBLIOTECI.has(inc.nume)) err(inc.rand, `biblioteca <${inc.nume}> nu este disponibilă în acest editor (poți folosi iostream, cmath, iomanip, climits, algorithm)`);
      const are = (...b) => includes.some((i) => b.includes(i.nume) || i.nume === 'bits/stdc++.h');
      const prog = parseaza(toks);

      // starea de rulare (comună tuturor funcțiilor compilate)
      const R = { pasi: 0, start: 0, iesire: [], lungIesire: 0, avert: new Set(), adancime: 0, ret: undefined,
        st: { prec: 6, mod: '', latime: 0, umplere: ' ', stanga: false, boolalpha: false },
        in: '', poz: 0, fail: false, interactiv: false, linii: [], ecou: 0, ev: 0, dbg: null, stiva: [] };
      const G = [];
      let nrGlobale = 0;
      const domenii = [new Map()]; // domeniul global e domenii[0]
      let fc = null; // funcția compilată acum: { sloturi, tip }
      const functii = new Map();

      function scrie(s, cls = 'o') {
        if (!s) return;
        R.lungIesire += s.length;
        if (R.lungIesire > MAX_IESIRE) throw new EroareRulare(null, 'programul a afișat prea mult text (peste 200 000 de caractere) și a fost oprit – verifică dacă nu ai o buclă infinită cu cout');
        const u = R.iesire[R.iesire.length - 1];
        if (u && u.k === cls) u.s += s; else R.iesire.push({ k: cls, s });
      }
      function avertizare(cheie, rand, mesaj) {
        if (R.avert.has(cheie)) return;
        R.avert.add(cheie);
        R.iesire.push({ k: 'w', s: `Atenție (rândul ${rand}): ${mesaj}`, rand });
      }
      const pas = (rand) => {
        if (++R.pasi > MAX_PASI) throw new EroareRulare(rand, `programul a fost oprit după ${(MAX_PASI).toLocaleString('ro-RO')} de pași (repetări). Probabil are o buclă infinită: verifică dacă se schimbă variabila din condiția de oprire.`);
        if ((R.pasi & 8191) === 0 && Date.now() - R.start > MAX_TIMP) throw new EroareRulare(rand, 'programul a fost oprit după 3 secunde. Probabil are o buclă infinită (sau face prea multe calcule).');
      };

      // ----- depanatorul (doar când DBG): un „cârlig” înaintea fiecărei instrucțiuni -----
      // Rularea pas cu pas se face reluând programul de la început și oprindu-l la evenimentul următor
      // (programele sunt deterministe), deci interpretorul rămâne la fel de rapid în modul obișnuit.
      const liniiEv = new Set();
      const NUME_C = { int: 'int', uint: 'unsigned int', ll: 'long long', ull: 'unsigned long long', short: 'short', char: 'char', bool: 'bool', float: 'float', double: 'double' };
      function vizibile() { // variabilele vizibile acum (cea mai interioară câștigă)
        const m = new Map();
        for (let i = 0; i < domenii.length; i++) for (const [n, s] of domenii[i]) if (s.k === 'var') { m.delete(n); m.set(n, s); }
        return [...m].map(([nume, s]) => ({ nume, s }));
      }
      function afisDbg(t, v) {
        if (typeof v === 'bigint') return v.toString();
        switch (t) {
          case 'bool': return v ? 'true' : 'false';
          case 'char': { const c = v & 255; const esc = { 0: '\\000', 9: '\\t', 10: '\\n', 13: '\\r', 39: "\\'", 92: '\\\\' }; return `${v} '${esc[c] || (c >= 32 && c < 127 ? String.fromCharCode(c) : `\\${c.toString(8).padStart(3, '0')}`)}'`; }
          case 'float': return Number.isFinite(v) ? String(Number(v.toPrecision(9))) : Number.isNaN(v) ? 'nan' : v < 0 ? '-inf' : 'inf';
          case 'double': return Number.isFinite(v) ? String(v) : Number.isNaN(v) ? 'nan' : v < 0 ? '-inf' : 'inf';
          default: return String(v);
        }
      }
      function instantaneu(f, viz) {
        return viz.map(({ nume, s }) => {
          let v = s.global ? G[s.slot] : f ? f[s.slot] : undefined;
          const o = { nume, tip: NUME_C[s.tip] || s.tip, grup: s.global ? 'global' : s.param ? 'arg' : 'local' };
          if (s.dims) {
            if (v && v.d) { o.dims = v.dims.slice(); o.tab = Array.from(v.d.subarray(0, Math.min(v.d.length, 2000)), (x) => afisDbg(s.tip, x)); o.tip += ` [${v.dims.join('][')}]`; } else { o.val = '?'; o.tip += ' []'; }
          } else {
            if (s.ref && v) { v = v.c[v.i]; o.tip += ' &'; }
            o.val = v === undefined ? '?' : afisDbg(s.tip, v);
          }
          return o;
        });
      }
      function carlig(rand, viz = vizibile()) {
        liniiEv.add(rand);
        return (f) => {
          R.ev++;
          const D = R.dbg;
          if (R.ev <= D.dupa) return;
          const acelasi = rand === D.rand && R.adancime === D.ad; // gdb trece la rândul următor, nu la aceeași linie
          if (D.bp.has(rand) || (!acelasi && (D.mod === 'into' || (D.mod === 'next' && R.adancime <= D.ad))) || (D.mod === 'out' && R.adancime < D.ad) || (D.mod === 'cursor' && rand === D.linie)) {
            const st = R.stiva, stiva = []; let rr = rand;
            for (let i = st.length - 1; i >= 0; i--) { stiva.push({ nume: st[i].nume, rand: rr }); rr = st[i].apel; }
            throw new Pauza({ rand, ev: R.ev, ad: R.adancime, vars: instantaneu(f, viz), stiva });
          }
        };
      }
      const cuCarlig = (c, rand) => { const ca = carlig(rand); return (f) => { ca(f); return c(f); }; };

      function cauta(n) { for (let i = domenii.length - 1; i >= 0; i--) { const s = domenii[i].get(n); if (s) return s; } return null; }
      function declara(n, sym) {
        const d = domenii[domenii.length - 1];
        const v = d.get(n);
        if (v) err(sym.rand, v.k === 'functie' ? `numele „${n}” este deja folosit pentru o funcție` : `variabila ${n} a fost deja declarată${v.rand ? ` (la rândul ${v.rand})` : ''}`);
        d.set(n, sym);
        return sym;
      }
      const slotNou = () => (fc ? fc.sloturi++ : nrGlobale++);

      // valoare constantă (pentru dimensiuni de tablouri și case)
      function constanta(e) {
        switch (e.k) {
          case 'num': return BIG.has(e.tip) ? Number(e.v) : e.v;
          case 'un': { const v = constanta(e.a); if (v == null) return null; return e.op === '-' ? -v : e.op === '+' ? v : e.op === '!' ? +!v : ~v; }
          case 'bin': {
            const a = constanta(e.a), b = constanta(e.b); if (a == null || b == null) return null;
            switch (e.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return b ? Math.trunc(a / b) : null; case '%': return b ? a % b : null; default: return null; }
          }
          case 'id': { const s = cauta(e.v); return s && s.cval != null ? s.cval : null; }
          default: return null;
        }
      }

      // ----- valori-stânga (variabile, elemente de tablou) -----
      function lval(e, ce) {
        if (e.k === 'id') {
          const s = cauta(e.v);
          if (!s) nedeclarat(e);
          if (s.k !== 'var') err(e.rand, `${e.v} nu este o variabilă`);
          if (s.dims) err(e.rand, `${e.v} este un tablou: folosește un element, de exemplu ${e.v}[i]`);
          if (s.cnst && ce !== 'citire-ref') err(e.rand, `${e.v} este o constantă (const) și nu i se poate schimba valoarea`);
          const i = s.slot, n = e.v, r = e.rand, z = zero(s.tip);
          if (s.ref) return { tip: s.tip, get: (f) => { const x = f[i]; const v = x.c[x.i]; return v === undefined ? neinit(x.c, x.i, n, r, z) : v; }, set: (f, v) => { const x = f[i]; x.c[x.i] = v; }, ref: (f) => f[i], loc: (f) => f[i] };
          if (s.global) return { tip: s.tip, get: () => G[i], set: (f, v) => { G[i] = v; }, ref: () => ({ c: G, i }) };
          return { tip: s.tip, get: (f) => { const v = f[i]; return v === undefined ? neinit(f, i, n, r, z) : v; }, set: (f, v) => { f[i] = v; }, ref: (f) => ({ c: f, i }) };
        }
        if (e.k === 'idx') {
          const { s, idx } = indexare(e);
          if (s.cnst) err(e.rand, `tabloul ${s.nume} este constant și nu poate fi modificat`);
          return { tip: s.tip, get: (f) => { const [a, i] = idx(f); return a[i]; }, set: (f, v) => { const [a, i] = idx(f); a[i] = v; }, ref: (f) => { const [a, i] = idx(f); return { c: a, i }; }, idx };
        }
        err(e.rand, ce === 'atr' ? 'în stânga lui = trebuie să fie o variabilă (sau un element de tablou)' : ce === 'cin' ? 'cin >> poate citi doar într-o variabilă' : 'operația cere o variabilă');
      }
      function neinit(c, i, n, r, z) {
        avertizare(`ni-${n}`, r, `variabila ${n} este folosită înainte să primească o valoare. În C++ ar conține o valoare la întâmplare; aici am folosit 0.`);
        c[i] = z; return z;
      }
      function nedeclarat(e) {
        const n = e.v;
        if (['cout', 'cin', 'endl'].includes(n)) err(e.rand, are('iostream') ? `${n} nu a fost declarat: lipsește „using namespace std;” (sau scrie std::${n})` : `${n} nu a fost declarat: lipsește #include <iostream>`);
        if (['setprecision', 'setw', 'fixed'].includes(n)) err(e.rand, `${n} nu a fost declarat: lipsește #include <iomanip>`);
        if (MATE[n] || n === 'pow') err(e.rand, `funcția ${n} nu a fost declarată: lipsește #include <cmath>`);
        const vecin = [...domenii.flatMap((d) => [...d.keys()])].find((k) => k.toLowerCase() === n.toLowerCase());
        err(e.rand, `variabila ${n} nu a fost declarată${vecin ? ` (ai vrut să scrii ${vecin}? C++ face diferența între litere mari și mici)` : ''}`);
      }
      // a[i] sau a[i][j]
      function indexare(e) {
        const ind = [];
        let b = e;
        while (b.k === 'idx') { ind.unshift(b.i); b = b.a; }
        if (b.k !== 'id') err(e.rand, 'doar tablourile pot fi indexate cu [ ]');
        const s = cauta(b.v);
        if (!s) nedeclarat(b);
        if (!s.dims) err(e.rand, `${b.v} nu este un tablou, deci nu poți scrie ${b.v}[...]`);
        if (ind.length !== s.dims.length) err(e.rand, ind.length < s.dims.length ? `tabloul ${b.v} are ${s.dims.length} dimensiuni: scrie ${b.v}[i][j]` : `tabloul ${b.v} are o singură dimensiune`);
        const ci = ind.map((x) => {
          const c = expresie(x);
          if (!INTREG.has(c.tip)) err(x.rand, `indicele unui tablou trebuie să fie un număr întreg (acum este ${NUME_TIP[c.tip] || c.tip})`);
          return BIG.has(c.tip) ? (f) => Number(c.f(f)) : c.f;
        });
        const sl = s.slot, n = b.v, r = e.rand, gl = s.global;
        const tab = gl ? () => G[sl] : (f) => f[sl];
        const afara = (i, d, j) => { throw new EroareRulare(r, `indice în afara tabloului: ${n}${ci.length > 1 ? ` (dimensiunea ${j + 1})` : ''}[${i}], dar tabloul are ${d} ${d === 1 ? 'element' : 'elemente'} (indici de la 0 la ${d - 1})`); };
        let idx;
        if (ci.length === 1) {
          const c0 = ci[0];
          idx = (f) => { const t = tab(f), i = c0(f); if (i < 0 || i >= t.dims[0]) afara(i, t.dims[0], 0); return [t.d, i]; };
        } else {
          const [c0, c1] = ci;
          idx = (f) => { const t = tab(f), i = c0(f), j = c1(f); if (i < 0 || i >= t.dims[0]) afara(i, t.dims[0], 0); if (j < 0 || j >= t.dims[1]) afara(j, t.dims[1], 1); return [t.d, i * t.dims[1] + j]; };
        }
        return { s: { ...s, nume: n }, idx };
      }

      // ----- expresii: întorc { tip, f } -----
      const cu = (c, la) => { const k = conv(c.tip, la); if (!k) return c.f; const g = c.f; return (f) => k(g(f)); };
      function numeric(c, rand, op) {
        if (c.tip === 'str') err(rand, `textele între ghilimele nu pot fi folosite în calcule${op ? ` (operatorul ${op})` : ''}; ele pot fi doar afișate cu cout`);
        if (c.tip === 'void') err(rand, 'funcția de tip void nu întoarce o valoare care să poată fi folosită');
        if (c.tip === 'ostream' || c.tip === 'istream') err(rand, c.tip === 'ostream' ? 'expresia cu cout este folosită greșit: pune calculul între paranteze, de exemplu cout << (a < b);' : 'cin este folosit greșit în această expresie');
        if (c.tip === 'manip') err(rand, 'endl / setprecision pot fi folosite doar cu cout <<');
        if (c.tip === 'tablou') err(rand, 'un tablou întreg nu poate fi folosit în calcule; folosește elementele lui (v[i])');
        if (!NUMERIC.has(c.tip)) err(rand, 'valoare nepotrivită în această expresie');
      }
      function conditie(e) { // → f întoarce boolean JS
        const c = expresie(e);
        if (c.tip === 'istream') { const g = c.f; return (f) => { g(f); return !R.fail; }; }
        numeric(c, e.rand);
        if (c.bool) return c.bool;
        const g = c.f;
        return BIG.has(c.tip) ? (f) => g(f) !== 0n : (f) => !!g(f);
      }

      function expresie(e) {
        switch (e.k) {
          case 'num': { const v = e.v; return { tip: e.tip, f: () => v, cval: v }; }
          case 'str': { const v = e.v; return { tip: 'str', f: () => v }; }
          case 'id': return identificator(e);
          case 'idx': { const l = lval({ ...e }, 'get'); return { tip: l.tip, f: l.get }; }
          case 'virg': { const a = expresie(e.a).f, b = expresie(e.b); const g = b.f; return { tip: b.tip, f: (f) => { a(f); return g(f); } }; }
          case 'tern': {
            const c = conditie(e.c), a = expresie(e.a), b = expresie(e.b);
            if (a.tip === 'str' || b.tip === 'str') {
              if (a.tip !== b.tip) err(e.rand, 'în operatorul ?: ambele variante trebuie să fie texte sau ambele numere');
              const fa = a.f, fb = b.f; return { tip: 'str', f: (f) => (c(f) ? fa(f) : fb(f)) };
            }
            numeric(a, e.rand); numeric(b, e.rand);
            const t = a.tip === b.tip ? a.tip : comun(a.tip, b.tip);
            const fa = cu(a, t), fb = cu(b, t);
            return { tip: t, f: (f) => (c(f) ? fa(f) : fb(f)) };
          }
          case 'cast': {
            const a = expresie(e.a); numeric(a, e.rand);
            if (e.tip === 'void') err(e.rand, 'conversie la void nepermisă');
            return { tip: e.tip, f: cu(a, e.tip) };
          }
          case 'un': return unara(e);
          case 'pre': case 'post': return incrementare(e);
          case 'atr': return atribuire(e);
          case 'bin': return binara(e);
          case 'apel': return apel(e);
          case 'metoda': return metoda(e);
          default: err(e.rand, 'expresie necunoscută');
        }
      }

      function identificator(e) {
        const n = e.v;
        const s = cauta(n);
        if (s && !e.std) {
          if (s.k === 'functie') err(e.rand, `${n} este o funcție: apeleaz-o cu paranteze, de exemplu ${n}()`);
          if (s.dims) { const sl = s.slot, gl = s.global; return { tip: 'tablou', s, f: gl ? () => G[sl] : (f) => f[sl] }; }
          if (s.cval != null && s.cnst) { const v = s.cval; return { tip: s.tip, f: () => v, cval: v }; }
          const l = lval(e, 'citire-ref');
          return { tip: l.tip, f: l.get };
        }
        // nume din biblioteca standard
        const stdOk = e.std || prog.usingStd;
        const cereStd = () => { if (!stdOk) err(e.rand, `${n} nu a fost declarat: lipsește „using namespace std;” (sau scrie std::${n})`); };
        if (n === 'cout' || n === 'cin' || n === 'endl') {
          if (!are('iostream')) err(e.rand, `${n} nu a fost declarat: lipsește #include <iostream>`);
          cereStd();
          if (n === 'endl') return { tip: 'manip', f: () => (st) => { scrie('\n'); } };
          return { tip: n === 'cout' ? 'ostream' : 'istream', f: () => n };
        }
        const MAN = { fixed: (st) => { st.mod = 'fixed'; }, scientific: (st) => { st.mod = 'scientific'; }, defaultfloat: (st) => { st.mod = ''; }, left: (st) => { st.stanga = true; }, right: (st) => { st.stanga = false; }, boolalpha: (st) => { st.boolalpha = true; }, noboolalpha: (st) => { st.boolalpha = false; } };
        if (MAN[n]) { if (!are('iostream')) nedeclarat(e); cereStd(); const m = MAN[n]; return { tip: 'manip', f: () => m }; }
        if (CONSTANTE[n]) { const [t, v] = CONSTANTE[n]; return { tip: t, f: () => v, cval: BIG.has(t) ? null : v }; }
        nedeclarat(e);
      }

      function unara(e) {
        const a = expresie(e.a); numeric(a, e.rand, e.op);
        if (e.op === '!') { const c = conditie(e.a); return { tip: 'bool', f: (f) => (c(f) ? 0 : 1), bool: (f) => !c(f) }; }
        const t = promov(a.tip);
        const g = cu(a, t);
        if (e.op === '+') return { tip: t, f: g, cval: a.cval };
        if (e.op === '~') {
          if (!INTREG.has(t)) err(e.rand, 'operatorul ~ se folosește doar cu numere întregi');
          return { tip: t, f: t === 'int' ? (f) => ~g(f) : t === 'uint' ? (f) => (~g(f)) >>> 0 : t === 'll' ? (f) => BigInt.asIntN(64, ~g(f)) : (f) => BigInt.asUintN(64, ~g(f)) };
        }
        const cval = a.cval != null ? -a.cval : null;
        switch (t) {
          case 'int': return { tip: t, f: (f) => (-g(f)) | 0, cval };
          case 'uint': return { tip: t, f: (f) => (-g(f)) >>> 0 };
          case 'll': return { tip: t, f: (f) => BigInt.asIntN(64, -g(f)) };
          case 'ull': return { tip: t, f: (f) => BigInt.asUintN(64, -g(f)) };
          case 'float': return { tip: t, f: (f) => -g(f) };
          default: return { tip: t, f: (f) => -g(f), cval };
        }
      }

      // operația aritmetică a,b → rezultat, pe tipul t (deja convertite)
      function operatie(op, t, rand) {
        const imp0 = () => { throw new EroareRulare(rand, op === '%' ? 'restul împărțirii la zero (x % 0) nu are sens' : 'împărțire la zero'); };
        if (op === '%' && (t === 'double' || t === 'float')) err(rand, 'operatorul % (restul împărțirii) se poate folosi doar cu numere întregi; pentru numere reale folosește fmod sau convertește la int');
        if (['&', '|', '^', '<<', '>>'].includes(op) && !INTREG.has(t)) err(rand, `operatorul ${op} se folosește doar cu numere întregi`);
        switch (t) {
          case 'int': switch (op) {
            case '+': return (a, b) => (a + b) | 0; case '-': return (a, b) => (a - b) | 0; case '*': return (a, b) => Math.imul(a, b);
            case '/': return (a, b) => (b === 0 ? imp0() : (a / b) | 0); case '%': return (a, b) => (b === 0 ? imp0() : (a % b) | 0);
            case '&': return (a, b) => a & b; case '|': return (a, b) => a | b; case '^': return (a, b) => a ^ b; case '<<': return (a, b) => a << b; case '>>': return (a, b) => a >> b;
          } break;
          case 'uint': switch (op) {
            case '+': return (a, b) => (a + b) >>> 0; case '-': return (a, b) => (a - b) >>> 0; case '*': return (a, b) => Math.imul(a, b) >>> 0;
            case '/': return (a, b) => (b === 0 ? imp0() : Math.floor(a / b)); case '%': return (a, b) => (b === 0 ? imp0() : a % b);
            case '&': return (a, b) => (a & b) >>> 0; case '|': return (a, b) => (a | b) >>> 0; case '^': return (a, b) => (a ^ b) >>> 0; case '<<': return (a, b) => (a << b) >>> 0; case '>>': return (a, b) => a >>> b;
          } break;
          case 'll': case 'ull': {
            const w = t === 'll' ? (x) => BigInt.asIntN(64, x) : (x) => BigInt.asUintN(64, x);
            switch (op) {
              case '+': return (a, b) => w(a + b); case '-': return (a, b) => w(a - b); case '*': return (a, b) => w(a * b);
              case '/': return (a, b) => (b === 0n ? imp0() : w(a / b)); case '%': return (a, b) => (b === 0n ? imp0() : a % b);
              case '&': return (a, b) => w(a & b); case '|': return (a, b) => w(a | b); case '^': return (a, b) => w(a ^ b); case '<<': return (a, b) => w(a << (b & 63n)); case '>>': return (a, b) => a >> b;
            }
          } break;
          case 'float': switch (op) {
            case '+': return (a, b) => Math.fround(a + b); case '-': return (a, b) => Math.fround(a - b); case '*': return (a, b) => Math.fround(a * b); case '/': return (a, b) => Math.fround(a / b);
          } break;
          default: switch (op) {
            case '+': return (a, b) => a + b; case '-': return (a, b) => a - b; case '*': return (a, b) => a * b; case '/': return (a, b) => a / b;
          }
        }
        err(rand, `operatorul ${op} nu se poate folosi aici`);
      }

      function binara(e) {
        const op = e.op;
        if (op === '&&' || op === '||') {
          const a = conditie(e.a), b = conditie(e.b);
          const bool = op === '&&' ? (f) => a(f) && b(f) : (f) => a(f) || b(f);
          return { tip: 'bool', f: (f) => (bool(f) ? 1 : 0), bool };
        }
        const A = expresie(e.a);
        if (op === '<<' && A.tip === 'ostream') return afisare(A, e);
        if (op === '>>' && A.tip === 'istream') return citire(A, e);
        if (op === '>>' && A.tip === 'ostream') err(e.rand, 'cu cout se folosește <<, nu >> (cout << x)');
        if (op === '<<' && A.tip === 'istream') err(e.rand, 'cu cin se folosește >>, nu << (cin >> x)');
        const B = expresie(e.b);
        numeric(A, e.rand, op); numeric(B, e.rand, op);
        if (['==', '!=', '<', '<=', '>', '>='].includes(op)) {
          const t = comun(A.tip, B.tip);
          const fa = cu(A, t), fb = cu(B, t);
          let bool;
          switch (op) {
            case '==': bool = (f) => fa(f) === fb(f); break; case '!=': bool = (f) => fa(f) !== fb(f); break;
            case '<': bool = (f) => fa(f) < fb(f); break; case '<=': bool = (f) => fa(f) <= fb(f); break;
            case '>': bool = (f) => fa(f) > fb(f); break; default: bool = (f) => fa(f) >= fb(f);
          }
          if (e.a.k === 'bin' && ['<', '>', '<=', '>='].includes(e.a.op) && ['<', '>', '<=', '>='].includes(op)) avertizareCompilare(e.rand, 'o expresie ca a < b < c nu verifică „b este între a și c”; scrie a < b && b < c');
          return { tip: 'bool', f: (f) => (bool(f) ? 1 : 0), bool };
        }
        if (op === '<<' || op === '>>') {
          const t = promov(A.tip);
          const fa = cu(A, t), fb = BIG.has(t) ? cu(B, t === 'ull' ? 'ull' : 'll') : cu(B, 'int');
          const o = operatie(op, t, e.rand);
          return { tip: t, f: (f) => o(fa(f), fb(f)) };
        }
        const t = comun(A.tip, B.tip);
        const fa = cu(A, t), fb = cu(B, t);
        const o = operatie(op, t, e.rand);
        if (A.cval != null && B.cval != null && t === 'int' && !(op === '/' || op === '%') ) return { tip: t, f: (f) => o(fa(f), fb(f)), cval: o(A.cval, B.cval) };
        return { tip: t, f: (f) => o(fa(f), fb(f)) };
      }

      function atribuire(e) {
        const L = lval(e.a, 'atr');
        if (e.b.k === 'lista') err(e.rand, 'lista de valori { } se poate folosi doar la declararea tabloului');
        const B = expresie(e.b); numeric(B, e.rand, e.op);
        const set = L.set, get = L.get;
        if (e.op === '=') {
          const fb = cu(B, L.tip);
          if (L.idx) { const idx = L.idx; return { tip: L.tip, f: (f) => { const v = fb(f); const [a, i] = idx(f); a[i] = v; return v; } }; }
          return { tip: L.tip, f: (f) => { const v = fb(f); set(f, v); return v; } };
        }
        const op = e.op.slice(0, -1);
        const t = op === '<<' || op === '>>' ? promov(L.tip) : comun(L.tip, B.tip);
        const o = operatie(op, t, e.rand);
        const la = conv(L.tip, t) || ((x) => x), inapoi = conv(t, L.tip) || ((x) => x);
        const fb = op === '<<' || op === '>>' ? cu(B, BIG.has(t) ? t : 'int') : cu(B, t);
        if (L.idx) { const idx = L.idx; return { tip: L.tip, f: (f) => { const [a, i] = idx(f); const v = inapoi(o(la(a[i]), fb(f))); a[i] = v; return v; } }; }
        return { tip: L.tip, f: (f) => { const b = fb(f); const v = inapoi(o(la(get(f)), b)); set(f, v); return v; } };
      }

      function incrementare(e) {
        const L = lval(e.a, 'inc');
        if (L.tip === 'bool') err(e.rand, 'operatorii ++ și -- nu se folosesc cu variabile bool');
        const t = promov(L.tip);
        const o = operatie(e.op === '++' ? '+' : '-', t, e.rand);
        const unu = BIG.has(t) ? 1n : 1;
        const la = conv(L.tip, t) || ((x) => x), inapoi = conv(t, L.tip) || ((x) => x);
        const pre = e.k === 'pre';
        if (L.idx) { const idx = L.idx; return { tip: L.tip, f: (f) => { const [a, i] = idx(f); const v0 = a[i]; const v = inapoi(o(la(v0), unu)); a[i] = v; return pre ? v : v0; } }; }
        const get = L.get, set = L.set;
        return { tip: L.tip, f: (f) => { const v0 = get(f); const v = inapoi(o(la(v0), unu)); set(f, v); return pre ? v : v0; } };
      }

      // ----- cout << -----
      function afisare(A, e) {
        const fa = A.f;
        const B = expresie(e.b);
        const fb = B.f;
        let fmt;
        switch (B.tip) {
          case 'manip': return { tip: 'ostream', f: (f) => { fa(f); fb(f)(R.st); return 'cout'; } };
          case 'str': fmt = (v) => v; break;
          case 'char': fmt = (v) => String.fromCharCode(v & 255); break;
          case 'bool': fmt = (v) => (R.st.boolalpha ? (v ? 'true' : 'false') : (v ? '1' : '0')); break;
          case 'double': case 'float': fmt = (v) => formatReal(v, R.st); break;
          case 'tablou': err(e.rand, `nu poți afișa tot tabloul ${B.s ? B.s.nume || '' : ''} dintr-o dată; afișează elementele unul câte unul, cu for`); break;
          case 'void': err(e.rand, 'funcția de tip void nu întoarce nimic, deci nu are ce să afișeze'); break;
          case 'istream': case 'ostream': err(e.rand, 'cout << cin / cout << cout nu are sens'); break;
          default: fmt = String;
        }
        return { tip: 'ostream', f: (f) => {
          fa(f);
          let s = fmt(fb(f));
          const st = R.st;
          if (st.latime) { if (s.length < st.latime) s = st.stanga ? s + st.umplere.repeat(st.latime - s.length) : st.umplere.repeat(st.latime - s.length) + s; st.latime = 0; }
          scrie(s);
          return 'cout';
        } };
      }

      // ----- cin >> -----
      const WS = /\s/;
      function asigura(i) { // mai sunt caractere de la poziția i?
        if (i < R.in.length) return true;
        if (R.interactiv) throw new CereIntrare();
        return false;
      }
      function ecou() { // afișează rândurile scrise de elev în consolă, când programul ajunge la ele
        while (R.ecou < R.linii.length && R.linii[R.ecou].start <= R.poz) { scrie(`${R.linii[R.ecou].text}\n`, 'i'); R.ecou++; }
      }
      function sariSpatii() {
        for (;;) {
          if (!asigura(R.poz)) return false;
          if (!WS.test(R.in[R.poz])) { ecou(); return true; }
          R.poz++;
        }
      }
      function citesteToken(tip) { // → valoare sau undefined (eșec)
        if (R.fail) return undefined;
        if (!sariSpatii()) { R.fail = true; return null; }
        const s = R.in, p0 = R.poz;
        if (tip === 'char') { R.poz++; ecou(); const c = s.charCodeAt(p0); return c > 127 && c < 256 ? c - 256 : c; }
        let re;
        if (tip === 'double' || tip === 'float') re = /[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;
        else re = /[+-]?\d+/y;
        re.lastIndex = p0;
        const m = re.exec(s);
        if (!m) { R.fail = true; return null; }
        R.poz = p0 + m[0].length;
        if (tip === 'double' || tip === 'float') return Number(m[0]);
        let v = BigInt(m[0]);
        const lim = { int: [-2147483648n, 2147483647n], short: [-32768n, 32767n], ll: [-(2n ** 63n), 2n ** 63n - 1n], uint: [0n, 4294967295n], ull: [0n, 2n ** 64n - 1n], bool: [0n, 1n] }[tip];
        if (tip === 'uint' || tip === 'ull') {
          const max = lim[1];
          if (v < 0n && -v <= max) v = v + max + 1n;
          else if (v < 0n || v > max) { R.fail = true; return BIG.has(tip) ? max : Number(max); }
        } else if (v < lim[0] || v > lim[1]) { R.fail = true; v = v < lim[0] ? lim[0] : lim[1]; if (tip === 'bool') v = 1n; return BIG.has(tip) ? v : Number(v); }
        return BIG.has(tip) ? v : Number(v);
      }
      function citire(A, e) {
        const fa = A.f;
        if (e.b.k === 'str' || e.b.k === 'num') err(e.rand, 'cin >> trebuie urmat de o variabilă, de exemplu cin >> x;');
        if (e.b.k === 'id' && ['endl', 'cout'].includes(e.b.v)) err(e.rand, `cin >> ${e.b.v} nu are sens (endl se folosește doar cu cout)`);
        if (e.b.k === 'id') { const s = cauta(e.b.v); if (s && s.dims) err(e.rand, `nu poți citi tot tabloul ${e.b.v} dintr-o dată; citește elementele unul câte unul: cin >> ${e.b.v}[i];`); }
        const L = lval(e.b, 'cin');
        const tip = L.tip, set = L.set, z = zero(tip);
        const tok = tip === 'float' ? 'double' : tip === 'char' ? 'char' : tip;
        const k = tip === 'float' ? Math.fround : null;
        return { tip: 'istream', f: (f) => {
          fa(f);
          const v = citesteToken(tok);
          if (v === undefined) return 'cin'; // deja în eroare: variabila rămâne neschimbată
          if (v === null) { if (tip !== 'char') set(f, z); return 'cin'; }
          set(f, k ? k(v) : v);
          return 'cin';
        } };
      }
      function metoda(e) {
        if (e.ob === 'cin') {
          if (e.m === 'fail' || e.m === 'eof') return { tip: 'bool', f: () => (R.fail ? 1 : 0) };
          if (e.m === 'get' && !e.args.length) return { tip: 'int', f: () => { if (R.fail || !asigura(R.poz)) { R.fail = true; return -1; } const c = R.in.charCodeAt(R.poz++); ecou(); return c; } };
          if (e.m === 'ignore') return { tip: 'void', f: () => { if (asigura(R.poz)) R.poz++; } };
        } else if (e.m === 'precision' && e.args.length === 1) {
          const a = expresie(e.args[0]); const g = cu(a, 'int');
          return { tip: 'void', f: (f) => { R.st.prec = g(f); } };
        }
        err(e.rand, `${e.ob}.${e.m}() nu este disponibil în acest editor`);
      }

      function avertizareCompilare(rand, mesaj) { avertComp.push({ rand, mesaj }); }
      const avertComp = [];

      // ----- funcții predefinite și apeluri -----
      function apel(e) {
        const s = e.std ? null : cauta(e.nume);
        if (s && s.k === 'functie') return apelUtilizator(e, s);
        if (s) err(e.rand, `${e.nume} nu este o funcție`);
        const n = e.nume, args = e.args;
        const nArg = (k) => { if (args.length !== k) err(e.rand, `funcția ${n} primește ${k === 1 ? 'o valoare' : `${k} valori`} (ai dat ${args.length})`); };
        const cereCmath = () => { if (!are('cmath', 'math.h')) err(e.rand, `funcția ${n} nu a fost declarată: lipsește #include <cmath>`); };
        if (n === 'setprecision' || n === 'setw' || n === 'setfill') {
          if (!are('iomanip')) err(e.rand, `${n} nu a fost declarat: lipsește #include <iomanip>`);
          if (!e.std && !prog.usingStd) err(e.rand, `${n} nu a fost declarat: lipsește „using namespace std;”`);
          nArg(1); const a = expresie(args[0]); numeric(a, e.rand); const g = cu(a, 'int');
          if (n === 'setprecision') return { tip: 'manip', f: (f) => { const v = g(f); return (st) => { st.prec = Math.max(0, v); }; } };
          if (n === 'setw') return { tip: 'manip', f: (f) => { const v = g(f); return (st) => { st.latime = v; }; } };
          return { tip: 'manip', f: (f) => { const v = g(f); return (st) => { st.umplere = String.fromCharCode(v & 255); }; } };
        }
        if (MATE[n] || n === 'pow' || n === 'abs' || n === 'max' || n === 'min' || n === 'swap' || n === 'hypot' || n === 'fmod' || n === 'atan2') {
          if ((MATE[n] || n === 'pow' || n === 'hypot' || n === 'fmod' || n === 'atan2')) cereCmath();
          if ((n === 'max' || n === 'min' || n === 'swap') && !e.std && !prog.usingStd) err(e.rand, `${n} nu a fost declarat: lipsește „using namespace std;”`);
        }
        if (MATE[n]) {
          nArg(1); const a = expresie(args[0]); numeric(a, e.rand); const g = cu(a, a.tip === 'float' ? 'float' : 'double'), m = MATE[n];
          if (n === 'sqrt' || n === 'log' || n === 'log10') { const r = e.rand; return { tip: 'double', f: (f) => { const x = g(f); if (x < 0 || (x === 0 && n !== 'sqrt')) avertizare(`${n}-${r}`, r, `${n}(${formatReal(x, { prec: 6, mod: '' })}) nu are sens la numere reale (rezultatul este ${x < 0 ? 'nan' : '-inf'})`); return m(x); } }; }
          return { tip: a.tip === 'float' ? 'float' : 'double', f: (f) => m(g(f)) };
        }
        if (n === 'pow' || n === 'hypot' || n === 'fmod' || n === 'atan2') {
          nArg(2); const a = expresie(args[0]), b = expresie(args[1]); numeric(a, e.rand); numeric(b, e.rand);
          const ga = cu(a, 'double'), gb = cu(b, 'double');
          const m = n === 'pow' ? Math.pow : n === 'hypot' ? Math.hypot : n === 'atan2' ? Math.atan2 : (x, y) => x % y;
          return { tip: 'double', f: (f) => m(ga(f), gb(f)) };
        }
        if (n === 'abs') {
          nArg(1); const a = expresie(args[0]); numeric(a, e.rand);
          const t = promov(a.tip), g = cu(a, t);
          if (t === 'int') return { tip: 'int', f: (f) => { const x = g(f); return x < 0 ? (-x) | 0 : x; } };
          if (t === 'll') return { tip: 'll', f: (f) => { const x = g(f); return x < 0n ? BigInt.asIntN(64, -x) : x; } };
          if (t === 'uint' || t === 'ull') return { tip: t, f: g };
          if (!are('cmath', 'math.h')) avertizareCompilare(e.rand, 'pentru abs cu numere reale adaugă #include <cmath> (altfel unele compilatoare rotunjesc la întreg)');
          return { tip: t, f: (f) => Math.abs(g(f)) };
        }
        if (n === 'max' || n === 'min') {
          nArg(2); const a = expresie(args[0]), b = expresie(args[1]); numeric(a, e.rand); numeric(b, e.rand);
          if (a.tip !== b.tip) err(e.rand, `${n} primește două valori de același tip, dar ai dat ${NUME_TIP[a.tip]} și ${NUME_TIP[b.tip]}; scrie de exemplu ${n}(a, (${NUME_TIP[a.tip]})b)`);
          const ga = a.f, gb = b.f;
          return { tip: a.tip, f: n === 'max' ? (f) => { const x = ga(f), y = gb(f); return x < y ? y : x; } : (f) => { const x = ga(f), y = gb(f); return y < x ? y : x; } };
        }
        if (n === 'swap') {
          nArg(2); const a = lval(args[0], 'swap'), b = lval(args[1], 'swap');
          if (a.tip !== b.tip) err(e.rand, 'swap interschimbă două variabile de același tip');
          const ra = a.ref, rb = b.ref;
          return { tip: 'void', f: (f) => { const x = ra(f), y = rb(f); const t = x.c[x.i]; x.c[x.i] = y.c[y.i]; y.c[y.i] = t; } };
        }
        if (['printf', 'scanf', 'puts', 'getchar', 'gets'].includes(n)) err(e.rand, `${n} nu este disponibil în acest editor; folosește cout << și cin >>`);
        if (n === 'rand' || n === 'srand' || n === 'time') err(e.rand, `${n} nu este disponibil în acest editor`);
        if (n === 'getline') err(e.rand, 'getline nu este disponibil în acest editor (textele/string nu sunt acceptate)');
        if (n === 'main') err(e.rand, 'funcția main nu se apelează din program');
        err(e.rand, `funcția ${n} nu a fost declarată${n === 'Main' || n === 'MAIN' ? ' (scrie main cu litere mici)' : ''}`);
      }

      function apelUtilizator(e, s) {
        const P = s.params;
        if (!s.vizibil) err(e.rand, `funcția ${s.nume} este folosită înainte să fie declarată: mut-o deasupra funcției care o apelează (sau scrie prototipul ei la început)`);
        if (e.args.length !== P.length) err(e.rand, `funcția ${s.nume} are ${P.length} ${P.length === 1 ? 'parametru' : 'parametri'}, dar ai dat ${e.args.length} ${e.args.length === 1 ? 'valoare' : 'valori'}`);
        const fargs = P.map((p, k) => {
          const a = e.args[k];
          if (p.dims.length) {
            const c = expresie(a);
            if (c.tip !== 'tablou' || c.s.tip !== p.tip || c.s.dims.length !== p.dims.length) err(a.rand, `parametrul ${p.nume} al funcției ${s.nume} este un tablou de tip ${NUME_TIP[p.tip]}${p.dims.length > 1 ? ' cu 2 dimensiuni' : ''}; dă numele unui astfel de tablou`);
            return c.f;
          }
          if (p.ref) {
            const L = lval(a, p.cnst ? 'citire-ref' : 'ref');
            if (L.tip !== p.tip) err(a.rand, `parametrul ${p.nume} este transmis prin referință (&): trebuie o variabilă de tip ${NUME_TIP[p.tip]}`);
            return L.ref;
          }
          const c = expresie(a); numeric(c, a.rand);
          return cu(c, p.tip);
        });
        const nr = fargs.length, r = e.rand;
        const rez = { tip: s.tip, f: (f) => {
          const def = s.def;
          const nf = new Array(def.sloturi);
          for (let k = 0; k < nr; k++) nf[k] = fargs[k](f);
          if (++R.adancime > MAX_ADANCIME) throw new EroareRulare(r, `prea multe apeluri de funcție unul în altul (peste ${MAX_ADANCIME}): probabil funcția ${s.nume} se apelează pe ea însăși fără să se oprească`);
          pas(r);
          if (DBG) R.stiva.push({ nume: s.nume, apel: r });
          def.corp(nf);
          if (DBG) R.stiva.pop();
          R.adancime--;
          const v = R.ret; R.ret = undefined;
          return v === undefined ? def.implicit : v;
        } };
        return rez;
      }

      // ----- instrucțiuni: întorc 0 (normal), 1 (break), 2 (continue), 3 (return) -----
      function decl(d) {
        if (d.tip === 'void') err(d.rand, 'o variabilă nu poate fi de tip void');
        const pasi = [];
        for (const v of d.lista) {
          const sym = { k: 'var', tip: d.tip, cnst: d.cnst, rand: v.rand, global: !fc, slot: 0 };
          if (v.dims.length) {
            if (v.dims.length > 2) err(v.rand, 'acest editor acceptă tablouri cu cel mult 2 dimensiuni');
            const dimF = v.dims.map((x, j) => {
              if (x === null) {
                if (j === 0 && v.init && v.init.k === 'lista' && v.dims.length === 1) { const nn = v.init.el.length; return () => nn; }
                err(v.rand, `scrie numărul de elemente al tabloului ${v.nume}, de exemplu ${v.nume}[100]`);
              }
              const cv = constanta(x);
              if (cv != null) { if (cv <= 0) err(v.rand, `tabloul ${v.nume} trebuie să aibă cel puțin un element`); return () => cv; }
              const c = expresie(x);
              if (!INTREG.has(c.tip)) err(v.rand, 'dimensiunea unui tablou trebuie să fie un număr întreg');
              const g = cu(c, 'int'), r = v.rand, nn = v.nume;
              return (f) => { const n = g(f); if (n <= 0) throw new EroareRulare(r, `tabloul ${nn} trebuie să aibă cel puțin un element (dimensiunea este ${n})`); return n; };
            });
            sym.dims = v.dims;
            const T = TABLOU[d.tip];
            let init = null;
            if (v.init) {
              if (v.init.k !== 'lista') err(v.rand, `un tablou se inițializează cu o listă între acolade, de exemplu ${v.nume}[3] = {1, 2, 3}`);
              const plat = [];
              const adauga = (l) => { for (const x of l.el) { if (x.k === 'lista') { if (v.dims.length < 2) err(x.rand, 'acolade în plus în lista de valori'); adauga(x); } else { const c = expresie(x); numeric(c, x.rand); plat.push(cu(c, d.tip)); } } };
              if (v.dims.length === 2 && v.init.el.some((x) => x.k === 'lista')) {
                const lin = [];
                for (const rnd of v.init.el) { const cur = []; if (rnd.k !== 'lista') err(rnd.rand, 'pentru un tablou cu 2 dimensiuni scrie fiecare rând între acolade'); for (const x of rnd.el) { const c = expresie(x); numeric(c, x.rand); cur.push(cu(c, d.tip)); } lin.push(cur); }
                init = (f, t) => { const m = t.dims[1]; if (lin.length > t.dims[0]) throw new EroareRulare(v.rand, `prea multe rânduri în lista de valori a tabloului ${v.nume}`); lin.forEach((rnd, i) => { if (rnd.length > m) throw new EroareRulare(v.rand, `prea multe valori pe rândul ${i + 1} al tabloului ${v.nume}`); rnd.forEach((g, j) => { t.d[i * m + j] = g(f); }); }); };
              } else {
                adauga(v.init);
                init = (f, t) => { if (plat.length > t.d.length) throw new EroareRulare(v.rand, `prea multe valori în lista tabloului ${v.nume} (are doar ${t.d.length} elemente)`); for (let i = 0; i < plat.length; i++) t.d[i] = plat[i](f); };
              }
            }
            declara(v.nume, sym); sym.slot = slotNou();
            const sl = sym.slot, gl = sym.global, r = v.rand, nn = v.nume;
            pasi.push((f) => {
              const dims = dimF.map((g) => g(f));
              const tot = dims.reduce((a, b) => a * b, 1);
              if (tot > 20000000) throw new EroareRulare(r, `tabloul ${nn} este prea mare (${tot} elemente)`);
              const t = { d: new T(tot), dims };
              if (init) init(f, t);
              if (gl) G[sl] = t; else f[sl] = t;
            });
            continue;
          }
          let fi = null;
          if (v.init) {
            if (v.init.k === 'lista') { if (v.init.el.length !== 1) err(v.rand, `variabila ${v.nume} primește o singură valoare`); v.init = v.init.el[0]; }
            const c = expresie(v.init);
            if (c.tip === 'str') err(v.rand, `variabila ${v.nume} este de tip ${NUME_TIP[d.tip]}; textele între ghilimele nu pot fi păstrate în variabile în acest editor (pentru un caracter folosește apostrofuri: 'a')`);
            numeric(c, v.rand);
            fi = cu(c, d.tip);
            if (d.cnst && c.cval != null && !BIG.has(d.tip)) { const k = conv(c.tip, d.tip); sym.cval = k ? k(c.cval) : c.cval; }
          } else if (d.cnst) err(v.rand, `constanta ${v.nume} trebuie să primească o valoare la declarare (const int ${v.nume} = ...;)`);
          declara(v.nume, sym); sym.slot = slotNou();
          const sl = sym.slot, z = zero(d.tip);
          if (!fc) pasi.push(fi ? (f) => { G[sl] = fi(f); } : () => { G[sl] = z; });
          else if (fi) pasi.push((f) => { f[sl] = fi(f); });
          else pasi.push((f) => { f[sl] = undefined; });
        }
        if (pasi.length === 1) { const p0 = pasi[0]; return (f) => { p0(f); return 0; }; }
        return (f) => { for (let i = 0; i < pasi.length; i++) pasi[i](f); return 0; };
      }

      let inBucla = 0, inSwitch = 0;
      function instr(s) {
        if (!DBG || !fc) return instr0(s);
        const k = s.k;
        if (k === 'bloc' || k === 'gol' || k === 'for' || k === 'while' || k === 'do' || (k === 'decl' && !s.lista.some((v) => v.init))) return instr0(s);
        let ca = k === 'decl' ? null : carlig(s.rand);
        const g = instr0(s);
        if (!ca) ca = carlig(s.rand); // la o declarație, variabilele noi apar deja în Watches (încă fără valoare)
        return (f) => { ca(f); return g(f); };
      }
      function instr0(s) {
        switch (s.k) {
          case 'gol': return () => 0;
          case 'decl': return decl(s);
          case 'expr': {
            if (s.e.k === 'bin' && ['==', '<', '>', '!='].includes(s.e.op)) avertizareCompilare(s.rand, `instrucțiunea nu face nimic (compară două valori); ai vrut să scrii = în loc de ${s.e.op}?`);
            else if ((s.e.k === 'bin' && ['+', '-', '*', '/', '%'].includes(s.e.op)) || s.e.k === 'id' || s.e.k === 'num') avertizareCompilare(s.rand, 'instrucțiunea calculează o valoare, dar nu o păstrează nicăieri (ai vrut să scrii, de exemplu, i = i + 1; ?)');
            const g = expresie(s.e).f; return (f) => { g(f); return 0; };
          }
          case 'bloc': {
            domenii.push(new Map());
            const l = s.inst.map(instr);
            if (DBG) s.vizFin = vizibile();
            domenii.pop();
            const n = l.length;
            if (n === 0) return () => 0;
            if (n === 1) return l[0];
            return (f) => { for (let i = 0; i < n; i++) { const c = l[i](f); if (c) return c; } return 0; };
          }
          case 'if': {
            if (s.c.k === 'atr' && s.c.op === '=') avertizareCompilare(s.rand, 'în condiția lui if ai scris = (atribuire). Pentru comparare se folosește ==');
            if (s.golA) avertizareCompilare(s.rand, 'după if (...) ai pus ; – instrucțiunea de după nu mai depinde de condiție');
            const c = conditie(s.c);
            domenii.push(new Map()); const a = instr(s.a); domenii.pop();
            domenii.push(new Map()); const b = s.b ? instr(s.b) : null; domenii.pop();
            return b ? (f) => (c(f) ? a(f) : b(f)) : (f) => (c(f) ? a(f) : 0);
          }
          case 'while': case 'do': {
            if (s.c.k === 'atr' && s.c.op === '=') avertizareCompilare(s.rand, 'în condiție ai scris = (atribuire). Pentru comparare se folosește ==');
            if (s.gol) avertizareCompilare(s.rand, 'după while (...) ai pus ; – bucla nu are corp și poate fi infinită');
            const c = DBG && fc ? cuCarlig(conditie(s.c), s.k === 'do' ? s.c.rand : s.rand) : conditie(s.c);
            inBucla++; domenii.push(new Map()); const corp = instr(s.corp); domenii.pop(); inBucla--;
            const r = s.rand;
            if (s.k === 'while') return (f) => { while (c(f)) { pas(r); const k = corp(f); if (k === 1) break; if (k === 3) return 3; } return 0; };
            return (f) => { do { pas(r); const k = corp(f); if (k === 1) break; if (k === 3) return 3; } while (c(f)); return 0; };
          }
          case 'for': {
            domenii.push(new Map());
            const init = s.init ? instr0(s.init) : null;
            if (s.c && s.c.k === 'atr' && s.c.op === '=') avertizareCompilare(s.rand, 'în condiția lui for ai scris = (atribuire). Pentru comparare se folosește == sau <=');
            if (s.gol) avertizareCompilare(s.rand, 'după for (...) ai pus ; – instrucțiunea de după se execută o singură dată, după terminarea buclei');
            const c0 = s.c ? conditie(s.c) : () => true;
            const c = DBG && fc ? cuCarlig(c0, s.rand) : c0;
            const p = s.pas ? expresie(s.pas).f : null;
            inBucla++; domenii.push(new Map()); const corp = instr(s.corp); domenii.pop(); inBucla--;
            domenii.pop();
            const r = s.rand;
            return (f) => {
              if (init) init(f);
              for (; c(f); p && p(f)) { pas(r); const k = corp(f); if (k === 1) break; if (k === 3) return 3; }
              return 0;
            };
          }
          case 'switch': {
            const c = expresie(s.c);
            numeric(c, s.rand);
            if (!INTREG.has(c.tip)) err(s.rand, 'switch funcționează doar cu valori întregi (int, char), nu cu numere reale');
            const g = cu(c, BIG.has(c.tip) ? 'll' : 'int');
            const map = new Map(); let def = -1;
            for (const k of s.cazuri) {
              if (k.v === null) { if (def >= 0) err(k.rand, 'default apare de două ori în switch'); def = k.poz; continue; }
              const v = constanta(k.v);
              if (v == null) err(k.rand, 'după case trebuie o valoare constantă (un număr sau un caracter), nu o variabilă sau o condiție');
              const cheie = BIG.has(c.tip) ? BigInt(v) : v;
              if (map.has(cheie)) err(k.rand, `valoarea ${v} apare de două ori în switch`);
              map.set(cheie, k.poz);
            }
            inSwitch++; domenii.push(new Map()); const l = s.inst.map(instr); domenii.pop(); inSwitch--;
            const n = l.length;
            return (f) => {
              let i = map.get(g(f));
              if (i === undefined) i = def;
              if (i < 0) return 0;
              for (; i < n; i++) { const k = l[i](f); if (k === 1) return 0; if (k) return k; }
              return 0;
            };
          }
          case 'break': if (!inBucla && !inSwitch) err(s.rand, 'break poate apărea doar într-o buclă (for, while, do) sau într-un switch'); return () => 1;
          case 'continue': if (!inBucla) err(s.rand, 'continue poate apărea doar într-o buclă (for, while, do)'); return () => 2;
          case 'return': {
            if (fc.tip === 'void') { if (s.e) err(s.rand, `funcția ${fc.nume} este de tip void și nu întoarce o valoare: scrie doar return;`); return () => 3; }
            if (!s.e) err(s.rand, `funcția ${fc.nume} trebuie să întoarcă o valoare: return valoare;`);
            const c = expresie(s.e); numeric(c, s.rand);
            const g = cu(c, fc.tip);
            return (f) => { R.ret = g(f); return 3; };
          }
          default: err(s.rand, 'instrucțiune necunoscută');
        }
      }

      // ----- programul întreg -----
      const initGlobale = [];
      const definite = new Set();
      for (const fdec of prog.functii) {
        const ex = domenii[0].get(fdec.nume);
        if (ex && ex.k !== 'functie') err(fdec.rand, `numele „${fdec.nume}” este deja folosit pentru o variabilă`);
        if (fdec.nume === 'main' && fdec.tip !== 'int') err(fdec.rand, 'funcția main trebuie să fie de tip int: int main()');
        if (ex) {
          if (ex.params.length !== fdec.params.length || ex.tip !== fdec.tip) err(fdec.rand, `funcția ${fdec.nume} este declarată de două ori, diferit (acest editor nu acceptă funcții cu același nume)`);
          if (fdec.corp) { if (ex.corp) err(fdec.rand, `funcția ${fdec.nume} este definită de două ori (prima dată la rândul ${ex.rand})`); ex.corp = fdec.corp; ex.params = fdec.params; }
          continue;
        }
        if (fdec.nume !== 'main' && !fdec.corp) { /* prototip */ }
        domenii[0].set(fdec.nume, { k: 'functie', nume: fdec.nume, tip: fdec.tip, params: fdec.params, corp: fdec.corp, rand: fdec.rand, def: { sloturi: 0, corp: null, implicit: zero(fdec.tip) } });
      }
      // funcțiile și variabilele globale devin vizibile în ordinea din fișier (ca în C++)
      for (const x of prog.ordine) {
        if (x.k === 'decl') { initGlobale.push(instr(x)); continue; }
        const s = domenii[0].get(x.nume);
        s.vizibil = true;
        if (x.proto || definite.has(s)) continue;
        definite.add(s);
        fc = { sloturi: 0, tip: s.tip, nume: s.nume };
        domenii.push(new Map());
        for (const p of s.params) {
          if (p.tip === 'void') err(p.rand, 'un parametru nu poate fi de tip void');
          const sym = { k: 'var', tip: p.tip, cnst: p.cnst, ref: p.ref && !p.dims.length, rand: p.rand, slot: fc.sloturi++, param: true };
          if (p.dims.length) { sym.dims = p.dims; if (p.dims.length > 2) err(p.rand, 'cel mult 2 dimensiuni'); }
          declara(p.nume, sym);
        }
        let corp = instr(s.corp);
        if (DBG) { const ca = carlig(s.corp.fin, s.corp.vizFin), c0 = corp; corp = (f) => { const k = c0(f); ca(f); return k; }; } // oprire la } de la final
        domenii.pop();
        s.def.sloturi = fc.sloturi; s.def.corp = corp;
        fc = null;
      }
      for (const s of domenii[0].values()) if (s.k === 'functie' && !s.def.corp && s.nume !== 'main') err(s.rand, `funcția ${s.nume} este declarată, dar nu are corp { ... }`);
      const main = domenii[0].get('main');
      if (!main || main.k !== 'functie' || !main.def.corp) err(1, includes.length || prog.usingStd ? 'programul nu are funcția principală: scrie int main() { ... }' : 'programul trebuie să înceapă cu #include <iostream>, using namespace std; și int main() { ... }');
      if (main.params.length) err(main.rand, 'în acest editor funcția main se scrie fără parametri: int main()');

      // ----- rularea -----
      function ruleaza(intrare, interactive = [], dbg = null) {
        R.pasi = 0; R.start = Date.now(); R.iesire = []; R.lungIesire = 0; R.avert = new Set(); R.adancime = 0; R.ret = undefined;
        R.st = { prec: 6, mod: '', latime: 0, umplere: ' ', stanga: false, boolalpha: false };
        R.fail = false; R.poz = 0; R.ecou = 0; R.linii = [];
        // datele din casetă; dacă e goală, rândurile scrise în consolă (mod interactiv)
        R.interactiv = !intrare.trim();
        if (R.interactiv) {
          let s = '';
          for (const l of interactive) { R.linii.push({ start: s.length, text: l }); s += `${l}\n`; }
          R.in = s;
        } else R.in = intrare;
        G.length = 0;
        R.ev = 0; R.stiva = [{ nume: 'main' }];
        if (DBG) {
          const d = dbg || {}, ev = [...liniiEv].sort((a, b) => a - b);
          const lipeste = (l) => ev.find((x) => x >= l); // punctul de oprire pe un rând fără cod trece pe următorul rând cu cod
          R.dbg = { dupa: d.dupa || 0, mod: d.mod || 'bp', ad: d.ad || 0, rand: d.rand || 0, linie: d.linie ? lipeste(d.linie) : -1, bp: new Set((d.bp || []).map(lipeste).filter((x) => x != null)) };
        }
        for (const w of avertComp) R.iesire.push({ k: 'w', s: `Atenție (rândul ${w.rand}): ${w.mesaj}`, rand: w.rand });
        let stare = 'gata', cod = 0, eroare = null, pauza = null;
        try {
          for (const g of initGlobale) g(null);
          const f = new Array(main.def.sloturi);
          main.def.corp(f);
          if (R.ret !== undefined) cod = R.ret;
        } catch (e) {
          if (e instanceof CereIntrare) stare = 'intrare';
          else if (e instanceof Pauza) { stare = 'pauza'; pauza = e.date; }
          else if (e instanceof EroareRulare) { stare = 'eroare'; eroare = { rand: e.rand, mesaj: e.message }; }
          else if (e instanceof RangeError && /call stack/i.test(e.message)) { stare = 'eroare'; eroare = { rand: null, mesaj: 'prea multe apeluri de funcție unul în altul: probabil o funcție se apelează pe ea însăși fără să se oprească' }; }
          else throw e;
        }
        let intrareInsuf = false;
        if (stare === 'gata' && R.fail && !R.interactiv) intrareInsuf = true;
        return { stare, cod, eroare, iesire: R.iesire, timp: Date.now() - R.start, pasi: R.pasi, intrareInsuf, pauza };
      }
      return { ruleaza, avertizari: avertComp };
    }

    // compilează și rulează; întoarce un rezultat simplu (folosit de worker, de interfață și de teste)
    function executa(cod, intrare = '', interactive = [], dbg = null) {
      let prog;
      try { prog = compileaza(cod, !!dbg); } catch (e) {
        if (e instanceof EroareCompilare) return { stare: 'compilare', eroare: { rand: e.rand, mesaj: e.message }, iesire: [] };
        return { stare: 'compilare', eroare: { rand: null, mesaj: `eroare internă a editorului: ${e.message}` }, iesire: [] };
      }
      try { return prog.ruleaza(intrare, interactive, dbg); } catch (e) {
        return { stare: 'eroare', eroare: { rand: null, mesaj: `eroare internă a editorului: ${e.message}` }, iesire: [] };
      }
    }
    // doar compilarea (Build): erori și avertismente, fără rulare
    function verifica(cod) {
      try { const p = compileaza(cod); return { ok: true, avertizari: p.avertizari.slice() }; } catch (e) {
        return { ok: false, eroare: e instanceof EroareCompilare ? { rand: e.rand, mesaj: e.message } : { rand: null, mesaj: `eroare internă a editorului: ${e.message}` }, avertizari: [] };
      }
    }
    const textIesire = (r) => r.iesire.filter((s) => s.k === 'o' || s.k === 'i').map((s) => s.s).join('');
    return { executa, verifica, textIesire, formatReal, lexeaza };
  })();

  // Același fișier, încărcat ca Web Worker (fără window) sau în Node (pentru teste).
  if (typeof window === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) module.exports = CPP;
    else if (typeof self !== 'undefined') self.onmessage = (e) => { const d = e.data || {}; self.postMessage({ id: d.id, rez: CPP.executa(String(d.cod || ''), String(d.intrare || ''), Array.isArray(d.interactive) ? d.interactive.map(String) : [], d.dbg && typeof d.dbg === 'object' ? d.dbg : null) }); };
    return;
  }
  if (!window.EduApp) return;

  // ---------- Exemple din lecții (materiale/info-7-u4-*, info-8-u3-*) ----------
  const EXEMPLE = [
    { id: "salut", titlu: "Primul program", desc: "Afișează câteva rânduri cu cout (clasa a VII-a)", intrare: "",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    cout << \"Nume: Popescu Ana\" << endl;\n    cout << \"Clasa: a VII-a B\" << endl;\n    cout << \"Hobby: robotica\";\n    return 0;\n}\n" },
    { id: "dreptunghi", titlu: "Perimetrul și aria", desc: "Citește lungimea și lățimea unui dreptunghi", intrare: "5 3",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int L, l, P, A;\n    cout << \"Lungimea: \";\n    cin >> L;\n    cout << \"Latimea: \";\n    cin >> l;\n    P = 2 * (L + l);\n    A = L * l;\n    cout << \"Perimetrul = \" << P << endl;\n    cout << \"Aria = \" << A << endl;\n    return 0;\n}\n" },
    { id: "paritate", titlu: "Par sau impar", desc: "Structura alternativă if … else", intrare: "7",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int n;\n    cout << \"n = \";\n    cin >> n;\n    if (n % 2 == 0)\n        cout << n << \" este par\";\n    else\n        cout << n << \" este impar\";\n    return 0;\n}\n" },
    { id: "ghiceste", titlu: "Ghicește numărul", desc: "do … while; scrie numerele direct în consolă", intrare: "",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int secret = 37, x, incercari = 0;\n    do\n    {\n        cout << \"Numarul tau: \";\n        cin >> x;\n        incercari++;\n        if (x < secret) cout << \"Prea mic\" << endl;\n        else if (x > secret) cout << \"Prea mare\" << endl;\n    } while (x != secret);\n    cout << \"Ai ghicit din \" << incercari << \" incercari!\";\n    return 0;\n}\n" },
    { id: "media", titlu: "Media notelor", desc: "for, numere reale, fixed și setprecision", intrare: "4\n9 8 10 7",
      cod: "#include <iostream>\n#include <iomanip>\nusing namespace std;\n\nint main()\n{\n    int n;\n    double nota, s = 0;\n    cin >> n;\n    for (int i = 1; i <= n; i++)\n    {\n        cin >> nota;\n        s = s + nota;\n    }\n    cout << fixed << setprecision(2) << s / n;\n    return 0;\n}\n" },
    { id: "fibonacci", titlu: "Șirul lui Fibonacci", desc: "Primii n termeni ai șirului", intrare: "12",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int n, a = 1, b = 1, c;\n    cin >> n;\n    cout << a << \" \" << b << \" \";\n    for (int i = 3; i <= n; i++)\n    {\n        c = a + b;\n        cout << c << \" \";\n        a = b;\n        b = c;\n    }\n    return 0;\n}\n" },
    { id: "robot", titlu: "Robotul pe grilă", desc: "switch: comenzi pentru un robot (clasa a VIII-a)", intrare: "6\n1 1 2 3 4 4",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int n, c, x = 0, y = 0, nord = 0;\n    cin >> n;\n    for (int i = 1; i <= n; i++)\n    {\n        cin >> c;\n        switch (c)\n        {\n            case 1: y++; nord++; break;\n            case 2: x++; break;\n            case 3: y--; break;\n            case 4: x--; break;\n        }\n    }\n    cout << \"Pozitia finala: (\" << x << \", \" << y << \")\" << endl;\n    cout << \"Pasi spre nord: \" << nord;\n    return 0;\n}\n" },
    { id: "prime", titlu: "Numere prime dintr-un șir", desc: "Bucle imbricate: numărarea divizorilor", intrare: "6\n2 4 7 9 11 1",
      cod: "#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int n, x;\n    cin >> n;\n    for (int i = 1; i <= n; i++)\n    {\n        cin >> x;\n        int nrDiv = 0;                      // se reinițializează pentru fiecare x\n        for (int d = 1; d <= x; d++)\n            if (x % d == 0) nrDiv++;\n        if (nrDiv == 2)\n            cout << x << \" (pozitia \" << i << \")\" << endl;\n    }\n    return 0;\n}\n" },
  ];

  // =====================================================================
  // INTERFAȚA: editorul (ca un Code::Blocks simplificat)
  // =====================================================================
  const { h, show, routes } = window.EduApp;
  const umple = (el, ...c) => el.replaceChildren(...c.flat(Infinity).filter((x) => x != null && x !== false));

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-cpp', ST = 'fisiere', LS = 'edudigi_cpp_fisiere', LS_CURENT = 'edudigi_cpp_curent', LS_PREF = 'edudigi_cpp_pref';
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
    async get(id) { return (await areIDB()) ? tx('readonly', (s) => s.get(id)) : lsCiteste(LS, []).find((f) => f.id === id); },
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
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const numeFisier = (t) => `${(t || 'program').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'program'}.cpp`;

  const SABLON = '#include <iostream>\nusing namespace std;\n\nint main()\n{\n    \n    return 0;\n}\n';
  // programul pe care Code::Blocks îl pune în main.cpp la un proiect nou (Console application)
  const SABLON_CB = '#include <iostream>\n\nusing namespace std;\n\nint main()\n{\n    cout << "Hello world!" << endl;\n    return 0;\n}\n';
  const DIR = 'C:\\Users\\Elev\\Documents\\CodeBlocks';

  // ---------- Colorarea sintaxei (tema implicită din Code::Blocks) ----------
  const KW = new Set(['if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue', 'return', 'using', 'namespace', 'true', 'false', 'const', 'static', 'static_cast', 'sizeof', 'struct', 'class', 'new', 'delete', 'goto',
    'int', 'long', 'short', 'unsigned', 'signed', 'float', 'double', 'char', 'bool', 'void', 'auto', 'string', 'public', 'private', 'template', 'typedef', 'enum', 'inline', 'this', 'nullptr']);
  const OPC = '+-*/%=<>!&|^~?:;,.()[]{}';
  function coloreaza(src) {
    let o = '', i = 0;
    const n = src.length;
    const sp = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;
    let inceputRand = true;
    while (i < n) {
      const c = src[i];
      if (c === '\n') { o += '\n'; i++; inceputRand = true; continue; }
      if (c === ' ' || c === '\t') { o += c; i++; continue; }
      if (c === '/' && src[i + 1] === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; o += sp('c', src.slice(i, j)); i = j; continue; }
      if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; o += sp('c', src.slice(i, j)); i = j; continue; }
      if (c === '#' && inceputRand) {
        let j = src.indexOf('\n', i); if (j < 0) j = n;
        let l = src.slice(i, j), com = '';
        const k = l.indexOf('//'); if (k > 0) { com = l.slice(k); l = l.slice(0, k); }
        o += sp('pp', l) + (com ? sp('c', com) : '');
        i = j; continue;
      }
      inceputRand = false;
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        if (src[j] === c) j++;
        o += sp(c === '"' ? 's' : 'ch', src.slice(i, j)); i = j; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = /^(0[xX][0-9a-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?|\d+\.)[uUlLfF]*/.exec(src.slice(i, i + 40));
        o += sp('n', m[0]); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1; while (j < n && /\w/.test(src[j])) j++;
        const w = src.slice(i, j);
        o += KW.has(w) ? sp('k', w) : esc(w);
        i = j; continue;
      }
      if (OPC.includes(c)) { let j = i + 1; while (j < n && OPC.includes(src[j]) && !(src[j] === '/' && (src[j + 1] === '/' || src[j + 1] === '*'))) j++; o += sp('o', src.slice(i, j)); i = j; continue; }
      o += esc(c); i++;
    }
    return `${o}\n`;
  }

  // ---------- Formatarea codului (Plugins → Source code formatter (AStyle), stil Allman) ----------
  function faraTexte(l) { // înlocuiește textele și caracterele, ca să nu încurce acoladele; scoate comentariul //
    let o = '', i = 0;
    while (i < l.length) {
      const c = l[i];
      if (c === '"' || c === "'") { let j = i + 1; while (j < l.length && l[j] !== c) j += l[j] === '\\' ? 2 : 1; o += c + '_'.repeat(Math.max(0, Math.min(j, l.length) - i - 1)) + (j < l.length ? c : ''); i = j + 1; continue; }
      if (c === '/' && l[i + 1] === '/') break;
      if (c === '/' && l[i + 1] === '*') { const j = l.indexOf('*/', i + 2); if (j < 0) break; o += ' '.repeat(j + 2 - i); i = j + 2; continue; }
      o += c; i++;
    }
    return o.trimEnd();
  }
  function desparteAllman(t) {
    if (!t || t[0] === '#' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return [t];
    const cod = faraTexte(t), com = t.slice(cod.length);
    if (cod.length > 1 && cod[0] === '}' && !/^}\s*[;,)]/.test(cod)) return ['}', ...desparteAllman(t.slice(1).trim())];
    if (cod.length > 1 && cod.endsWith('{') && !/=\s*\{$/.test(cod) && !cod.slice(0, -1).includes('{')) return [cod.slice(0, -1).trimEnd() + com, '{'];
    return [t];
  }
  function astyle(src) {
    const intrare = src.replace(/\t/g, '    ').split('\n').flatMap((l) => desparteAllman(l.trim()));
    const IN = '    ', out = [];
    const stiva = []; // acoladele deschise: { ind, sw, ifs, inCase }
    let pend = 0, contin = false, ultimSw = false;
    for (const t of intrare) {
      if (!t) { out.push(''); continue; }
      if (t[0] === '#') { out.push(t); continue; }
      const cod = faraTexte(t) || t;
      const fr = stiva[stiva.length - 1];
      const baza = fr ? fr.ind + 1 + (fr.inCase ? 1 : 0) : 0;
      const pune = (n) => out.push(IN.repeat(Math.max(0, n)) + t);
      if (cod.startsWith('//') || cod.startsWith('/*') || !cod.trim()) { pune(baza + pend); continue; }
      if (cod[0] === '}') { const f = stiva.pop(); pune(f ? f.ind : 0); pend = 0; contin = false; continue; }
      if (cod[0] === '{') {
        const ind = pend ? baza + pend - 1 : baza;
        pune(ind);
        const deschise = (cod.match(/\{/g) || []).length - (cod.match(/\}/g) || []).length;
        if (deschise > 0) stiva.push({ ind, sw: ultimSw, ifs: [], inCase: false });
        pend = 0; ultimSw = false; contin = false; continue;
      }
      if (fr && fr.sw && /^(case\b[^:]*|default\s*):/.test(cod)) { fr.inCase = true; out.push(IN.repeat(fr.ind + 1) + t); pend = 0; continue; }
      let ind = baza + pend + (contin ? 1 : 0);
      const lista = fr ? fr.ifs : radacinaIfs;
      if (/^else\b/.test(cod) && lista.length) { ind = lista.pop(); pend = ind - baza; }
      const eIf = /^(else\s+)?if\s*\(/.test(cod);
      if (eIf) (fr ? fr.ifs : radacinaIfs).push(ind);
      out.push(IN.repeat(Math.max(0, ind)) + t);
      const antet = (/^(else\s+)?(if|for|while|switch)\s*\(.*\)$/.test(cod) && !/;$/.test(cod)) || /^(else|do)$/.test(cod);
      if (antet) { pend = ind - baza + 1; ultimSw = /^switch\b/.test(cod); contin = false; continue; }
      ultimSw = false;
      if (/[;}]$/.test(cod) || /:$/.test(cod)) { pend = 0; contin = false; } else contin = true;
    }
    radacinaIfs.length = 0;
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const radacinaIfs = [];

  // funcțiile din program (pentru Symbols și bara de completare): { nume, tip, params, rand }
  function functiiDin(cod) {
    const rez = [];
    const re = /^[ \t]*((?:(?:unsigned|signed|long|short|const|static)\s+)*(?:int|void|double|float|char|bool|long|short|unsigned))\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(\{|$)/gm;
    let m;
    while ((m = re.exec(cod))) rez.push({ nume: m[2], tip: m[1].replace(/\s+/g, ' '), params: m[3].trim(), rand: cod.slice(0, m.index).split('\n').length + (/^\n/.test(m[0]) ? 1 : 0) });
    return rez;
  }
  function globaleDin(cod) {
    const rez = []; let ad = 0;
    cod.split('\n').forEach((l, i) => {
      const c = faraTexte(l.trim());
      if (ad === 0) { const m = /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:long\s+long|long|int|double|float|char|bool|short)\s+([^;(]+);/.exec(c); if (m) for (const p of m[1].split(',')) { const n = /^\s*([A-Za-z_]\w*)/.exec(p); if (n) rez.push({ nume: n[1], rand: i + 1 }); } }
      for (const ch of c) { if (ch === '{') ad++; else if (ch === '}') ad = Math.max(0, ad - 1); }
    });
    return rez;
  }

  // ---------- Rularea: într-un Web Worker (același fișier), cu rezervă pe firul principal ----------
  const SCRIPT = document.currentScript?.src || '/js/aplicatii/cpp.js';
  let worker = null, cerere = 0, asteptare = null;
  function porneste() {
    if (worker) return worker;
    try {
      worker = new Worker(SCRIPT);
      worker.onmessage = (e) => { if (asteptare && e.data.id === asteptare.id) { const a = asteptare; asteptare = null; clearTimeout(a.ceas); a.res(e.data.rez); } };
      worker.onerror = () => { worker = false; if (asteptare) { const a = asteptare; asteptare = null; clearTimeout(a.ceas); a.res(CPP.executa(a.cod, a.intrare, a.interactive, a.dbg)); } };
    } catch { worker = false; }
    return worker;
  }
  function opresteWorker() { if (worker) worker.terminate(); worker = null; }
  function executa(cod, intrare, interactive, dbg = null) {
    const w = porneste();
    if (!w) return new Promise((res) => setTimeout(() => res(CPP.executa(cod, intrare, interactive, dbg)), 20));
    return new Promise((res) => {
      const id = ++cerere;
      // paznic: dacă programul nu se oprește singur (de ex. calcule foarte lungi), oprim worker-ul
      const ceas = setTimeout(() => { if (asteptare?.id === id) { asteptare = null; opresteWorker(); res({ stare: 'eroare', eroare: { rand: null, mesaj: 'programul a fost oprit pentru că rula de prea mult timp (probabil o buclă infinită)' }, iesire: [] }); } }, 9000);
      asteptare = { id, res, ceas, cod, intrare, interactive, dbg };
      w.postMessage({ id, cod, intrare, interactive, dbg });
    });
  }

  // ---------- Pictograme (SVG desenate, în stilul celor din Code::Blocks) ----------
  const S16 = (p) => `<svg viewBox="0 0 16 16" aria-hidden="true">${p}</svg>`;
  const ROTITA = (cx, cy, r, cul) => { let d = ''; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; d += `<rect x="${cx - 1.3}" y="${cy - r - 1.8}" width="2.6" height="3" rx=".5" fill="${cul}" transform="rotate(${a * 180 / Math.PI} ${cx} ${cy})"/>`; } return `${d}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cul}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="#fff"/>`; };
  const ICO = {
    nou: S16('<path d="M3 1.5h6.5L13 5v9.5H3z" fill="#fff" stroke="#6b7a8c"/><path d="M9.5 1.5V5H13" fill="#dfe6ee" stroke="#6b7a8c"/><path d="M12.5 8.2l.8 1.7 1.8.2-1.4 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2z" fill="#f5c400" stroke="#b88a00" stroke-width=".5"/>'),
    deschide: S16('<path d="M1 3.5h5l1.2 1.5H14v8.5H1z" fill="#f0c45a" stroke="#a87b16"/><path d="M2.8 7h12.4l-2 6.5H1z" fill="#ffdc7a" stroke="#a87b16"/>'),
    salveaza: S16('<path d="M1.5 1.5h11l2 2v11h-13z" fill="#3d6fb8" stroke="#22457e"/><rect x="4" y="1.5" width="7" height="4.5" fill="#e8eef7"/><rect x="8.5" y="2.3" width="1.6" height="3" fill="#3d6fb8"/><rect x="3.5" y="8.5" width="9" height="6" fill="#fff"/>'),
    salveazaTot: S16('<path d="M4.5 .8h8l1.8 1.8v8.2h-9.8z" fill="#7d9fd0" stroke="#22457e" stroke-width=".8"/><path d="M1.5 4.5h8l1.8 1.8v8.7H1.5z" fill="#3d6fb8" stroke="#22457e"/><rect x="3.5" y="4.5" width="5" height="3" fill="#e8eef7"/><rect x="3" y="10" width="6.5" height="5" fill="#fff"/>'),
    anuleaza: S16('<path d="M5.5 3.5L2 7l3.5 3.5" fill="none" stroke="#2f6fc2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 7h6.5a4 4 0 0 1 0 8H7" fill="none" stroke="#2f6fc2" stroke-width="2" stroke-linecap="round"/>'),
    refa: S16('<path d="M10.5 3.5L14 7l-3.5 3.5" fill="none" stroke="#2f6fc2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 7H7a4 4 0 0 0 0 8h2" fill="none" stroke="#2f6fc2" stroke-width="2" stroke-linecap="round"/>'),
    taie: S16('<circle cx="4.5" cy="12" r="2.3" fill="none" stroke="#c0392b" stroke-width="1.4"/><circle cx="11.5" cy="12" r="2.3" fill="none" stroke="#c0392b" stroke-width="1.4"/><path d="M6 10.3L11.5 1.5M10 10.3L4.5 1.5" stroke="#555" stroke-width="1.3"/>'),
    copiaza: S16('<path d="M2 1.5h6.5v9H2z" fill="#fff" stroke="#6b7a8c"/><path d="M6.5 5.5H13v9H6.5z" fill="#fff" stroke="#6b7a8c"/><path d="M8 8h3.5M8 10h3.5M8 12h2.5" stroke="#9aa7b5"/>'),
    lipeste: S16('<rect x="2" y="2.5" width="10" height="12" rx="1" fill="#c99a5b" stroke="#7b5a2c"/><rect x="5" y="1.2" width="4" height="2.6" rx=".6" fill="#ddd" stroke="#666" stroke-width=".7"/><path d="M6.5 6h7.5v8.5H6.5z" fill="#fff" stroke="#6b7a8c"/>'),
    cauta: S16('<circle cx="6.5" cy="6.5" r="4.3" fill="#e9f4ff" stroke="#4a6a8c" stroke-width="1.6"/><path d="M9.8 9.8l4.5 4.5" stroke="#6b4a2a" stroke-width="2.4" stroke-linecap="round"/>'),
    inlocuieste: S16('<circle cx="5.5" cy="5.5" r="3.6" fill="#e9f4ff" stroke="#4a6a8c" stroke-width="1.4"/><path d="M8.3 8.3l2.7 2.7" stroke="#6b4a2a" stroke-width="2" stroke-linecap="round"/><path d="M9 14.5h6M12.5 12l2.5 2.5-2.5 2.5" fill="none" stroke="#2f8a2f" stroke-width="1.4"/>'),
    build: S16(ROTITA(8, 8, 4.6, '#d9a520') + '<circle cx="8" cy="8" r="4.6" fill="none" stroke="#8a6410" stroke-width=".6"/>'),
    run: S16('<path d="M3.5 1.8v12.4L14 8z" fill="#2fb52f" stroke="#17761a" stroke-linejoin="round"/>'),
    buildRun: S16(ROTITA(6, 6, 3.6, '#d9a520') + '<path d="M8 6.8v8.4l7-4.2z" fill="#2fb52f" stroke="#17761a" stroke-linejoin="round"/>'),
    rebuild: S16('<path d="M13.2 6.5A5.5 5.5 0 0 0 3.3 4.8" fill="none" stroke="#2f6fc2" stroke-width="1.9"/><path d="M2 2.2l.8 4 3.8-1.2z" fill="#2f6fc2"/><path d="M2.8 9.5a5.5 5.5 0 0 0 9.9 1.7" fill="none" stroke="#2f6fc2" stroke-width="1.9"/><path d="M14 13.8l-.8-4-3.8 1.2z" fill="#2f6fc2"/>'),
    abort: S16('<circle cx="8" cy="8" r="6.6" fill="#e0302a" stroke="#931b16"/><path d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
    debug: S16('<path d="M3.5 1.8v12.4L14 8z" fill="#e0302a" stroke="#931b16" stroke-linejoin="round"/>'),
    laCursor: S16('<path d="M1.5 8h8" stroke="#2f6fc2" stroke-width="2"/><path d="M8 4.5L11.5 8 8 11.5z" fill="#2f6fc2"/><path d="M13.5 2v12M12 2h3M12 14h3" stroke="#333" stroke-width="1.2"/>'),
    urmator: S16('<path d="M3 9.5V7a4 4 0 0 1 8 0v1.5" fill="none" stroke="#2f6fc2" stroke-width="1.8"/><path d="M8.3 7.5h5.4L11 11z" fill="#2f6fc2"/><path d="M1.5 13h13M1.5 15h9" stroke="#777" stroke-width="1"/>'),
    intra: S16('<path d="M4 1v8" stroke="#2f6fc2" stroke-width="1.8"/><path d="M1.2 7.5h5.6L4 11z" fill="#2f6fc2"/><path d="M10 3c-1.5 0-1.5 1-1.5 2.5S8 8 7 8c1 0 1.5 1 1.5 2.5S8.5 13 10 13M12 3c1.5 0 1.5 1 1.5 2.5S14 8 15 8c-1 0-1.5 1-1.5 2.5S13.5 13 12 13" fill="none" stroke="#555" stroke-width="1.1"/>'),
    iese: S16('<path d="M4 12V4" stroke="#2f6fc2" stroke-width="1.8"/><path d="M1.2 5.5h5.6L4 2z" fill="#2f6fc2"/><path d="M10 3c-1.5 0-1.5 1-1.5 2.5S8 8 7 8c1 0 1.5 1 1.5 2.5S8.5 13 10 13M12 3c1.5 0 1.5 1 1.5 2.5S14 8 15 8c-1 0-1.5 1-1.5 2.5S13.5 13 12 13" fill="none" stroke="#555" stroke-width="1.1"/>'),
    instr: S16('<path d="M2 3h8M2 6h8M2 9h8M2 12h8" stroke="#888" stroke-width="1.2"/><path d="M11 6.5v5" stroke="#2f6fc2" stroke-width="1.6"/><path d="M9 10.5h4l-2 3z" fill="#2f6fc2"/>'),
    pauza: S16('<rect x="3.5" y="2.5" width="3" height="11" fill="#e28b1c" stroke="#8a520e" stroke-width=".7"/><rect x="9.5" y="2.5" width="3" height="11" fill="#e28b1c" stroke="#8a520e" stroke-width=".7"/>'),
    stop: S16('<rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="#e0302a" stroke="#931b16"/>'),
    ferestre: S16('<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#4a6a8c"/><rect x="1.5" y="2.5" width="13" height="2.5" fill="#3d6fb8"/><path d="M5 8h6M5 10.5h4" stroke="#999"/>'),
    info: S16('<circle cx="8" cy="8" r="6.5" fill="#2f6fc2" stroke="#1d4a85"/><circle cx="8" cy="4.8" r="1.1" fill="#fff"/><rect x="7" y="6.8" width="2" height="5.5" fill="#fff"/>'),
    workspace: S16('<rect x="1.5" y="5.5" width="5" height="5" fill="#e04b3b" stroke="#8a2a20" stroke-width=".7"/><rect x="6.5" y="1.5" width="5" height="5" fill="#3d9a3d" stroke="#1f5e1f" stroke-width=".7"/><rect x="9.5" y="8.5" width="5" height="5" fill="#3d6fb8" stroke="#22457e" stroke-width=".7"/><rect x="4" y="10.5" width="5" height="4" fill="#f0c020" stroke="#8a6c10" stroke-width=".7"/>'),
    proiect: S16('<rect x="1.5" y="2.5" width="13" height="11" rx="1" fill="#fff" stroke="#4a6a8c"/><rect x="1.5" y="2.5" width="13" height="3" fill="#6a8fc4"/><path d="M4 8.5l2 1.5-2 1.5M7.5 12h4" fill="none" stroke="#333" stroke-width="1.1"/>'),
    dosar: S16('<path d="M1 3h5l1.2 1.5H15V13.5H1z" fill="#f0c45a" stroke="#a87b16"/><path d="M1 6h14" stroke="#c9972b"/>'),
    dosarDeschis: S16('<path d="M1 3h5l1.2 1.5H14v9H1z" fill="#f0c45a" stroke="#a87b16"/><path d="M2.8 7h12.4l-2 6.5H1z" fill="#ffdc7a" stroke="#a87b16"/>'),
    cpp: S16('<path d="M3 1.5h6.5L13 5v9.5H3z" fill="#fff" stroke="#6b7a8c"/><path d="M9.5 1.5V5H13" fill="#dfe6ee" stroke="#6b7a8c"/><text x="8" y="12.4" font-size="5.6" font-family="Arial" font-weight="700" fill="#2f6fc2" text-anchor="middle">c++</text>'),
    cbp: S16('<path d="M3 1.5h6.5L13 5v9.5H3z" fill="#fff" stroke="#6b7a8c"/>' + ROTITA(8, 10, 2.4, '#3d9a3d')),
    functie: S16('<rect x="2" y="2" width="12" height="12" rx="2" fill="#8a4fd1" stroke="#5a2c96"/><text x="8" y="11.6" font-size="8.5" font-family="Arial" font-weight="700" font-style="italic" fill="#fff" text-anchor="middle">f</text>'),
    variabila: S16('<rect x="2" y="2" width="12" height="12" rx="2" fill="#2f9a8f" stroke="#1d6058"/><text x="8" y="11.6" font-size="8.5" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">v</text>'),
    cuvant: S16('<rect x="2" y="2" width="12" height="12" rx="2" fill="#3d6fb8" stroke="#22457e"/><text x="8" y="11.6" font-size="8" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">k</text>'),
    exemple: S16('<path d="M2 2.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H2zM15 2.5H10.5A1.5 1.5 0 0 0 9 4v10a1.5 1.5 0 0 1 1.5-1.5H15z" fill="#fff" stroke="#3d6fb8"/>'),
    sigla: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="15" width="13" height="13" fill="#e04b3b"/><rect x="15" y="3" width="13" height="13" fill="#3d9a3d"/><rect x="24" y="19" width="13" height="13" fill="#3d6fb8"/><rect x="11" y="25" width="13" height="12" fill="#f0c020"/></svg>',
    consola: S16('<rect x="1" y="2" width="14" height="12" fill="#0c0c0c" stroke="#555"/><path d="M3.5 6l2.5 2-2.5 2M7 11h4" fill="none" stroke="#ccc" stroke-width="1.2"/>'),
    intrebare: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#2f6fc2"/><text x="16" y="23" font-size="19" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">?</text></svg>',
    eroare: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#e0302a"/><path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
    informatie: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#2f6fc2"/><circle cx="16" cy="9.5" r="2" fill="#fff"/><rect x="14.2" y="13" width="3.6" height="11" fill="#fff"/></svg>',
    atentie: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3L30 28H2z" fill="#f2c010" stroke="#9a7a00"/><rect x="14.4" y="11" width="3.2" height="9" fill="#222"/><rect x="14.4" y="22" width="3.2" height="3" fill="#222"/></svg>',
  };
  const ic = (k, cls = 'ap-cpp-ic') => h('span', { class: cls, html: ICO[k] || '' });

  // =====================================================================
  // PAGINA APLICAȚIEI: un Code::Blocks în browser
  // =====================================================================
  routes.push({ pattern: /^\/aplicatii\/cpp$/, handler: async (m, params) => {
    const pref = Object.assign({ fs: 15, mgmt: window.innerWidth > 760, logs: true, logH: 0, mgmtW: 0, compl: true, linieCur: true, tinta: 'Debug', ws: null, tabs: null, start: true, watches: [], watchW: 0 }, lsCiteste(LS_PREF, {}));
    const salvPref = () => lsScrie(LS_PREF, pref);

    // ----- datele: toate programele salvate (fiecare = un proiect cu main.cpp sau un fișier .cpp separat) -----
    const db = new Map();
    try { for (const f of await store.toate()) if (f && f.id) db.set(f.id, f); } catch { /* fără stocare */ }
    const recente = () => [...db.values()].sort((a, b) => (b.actualizat || 0) - (a.actualizat || 0));
    let curId = lsCiteste(LS_CURENT, null);
    if (!db.has(curId)) curId = recente()[0]?.id || null;
    if (!curId) { // primul program (salvat abia la prima modificare, ca înainte)
      const f = { id: idNou(), titlu: 'Primul meu program', cod: SABLON, intrare: '', creat: Date.now(), actualizat: Date.now(), nou: true };
      db.set(f.id, f); curId = f.id;
    }
    const eProiect = (f) => f && !f.fisier;
    pref.ws = (Array.isArray(pref.ws) ? pref.ws : [curId]).filter((id) => eProiect(db.get(id)));
    if (eProiect(db.get(curId)) && !pref.ws.includes(curId)) pref.ws.push(curId);
    let tabs = (Array.isArray(pref.tabs) ? pref.tabs : [curId]).filter((id) => db.has(id));
    if (!tabs.includes(curId)) tabs.push(curId);
    let activ = null; // fila activă (id de fișier sau 'start'); se alege la pornire
    let F = db.get(curId); // fișierul din editor
    const stareFila = new Map(); // id → { sel, sus, st, mod, erori }
    const sf = (id) => { if (!stareFila.has(id)) stareFila.set(id, { sel: [0, 0], sus: 0, st: 0, mod: false, erori: new Map() }); return stareFila.get(id); };
    const exe = new Map(); // id → codul de la ultimul Build (executabilul)
    let tSalv = null, ultimaRulare = null, idRulare = 0;
    let con = null; // fereastra consolei
    let dbg = null; // sesiunea de depanare

    const numeProj = (f) => numeFisier(f.titlu).replace(/\.cpp$/, '');
    const numeSursa = (f) => (f.fisier ? numeFisier(f.titlu) : 'main.cpp');
    const caleProiect = (f) => (f.fisier ? DIR : `${DIR}\\${numeProj(f)}`);
    const caleSursa = (f) => `${caleProiect(f)}\\${numeSursa(f)}`;
    const caleExe = (f) => (f.fisier ? `${DIR}\\${numeProj(f)}.exe` : `${caleProiect(f)}\\bin\\${pref.tinta}\\${numeProj(f)}.exe`);
    const exeRel = (f) => (f.fisier ? caleExe(f) : `bin\\${pref.tinta}\\${numeProj(f)}.exe`);
    const bps = (f) => (Array.isArray(f.bp) ? f.bp : (f.bp = []));

    // ----- elemente de bază -----
    const app = h('div', { class: 'ap-cpp', tabindex: '-1' });
    const titluEl = h('span', { class: 'ap-cpp-titlutext' });
    const barTitlu = h('div', { class: 'ap-cpp-titlu' },
      h('a', { class: 'ap-cpp-inapoi', href: '#/aplicatii', title: 'Înapoi la aplicații' }, '← Aplicații'),
      h('span', { class: 'ap-cpp-sigla', html: ICO.sigla }), titluEl, h('span', { class: 'ap-cpp-spatiu' }),
      h('button', { type: 'button', class: 'ap-cpp-fbtn', title: 'Ecran complet', 'aria-label': 'Ecran complet', onclick: () => ecranComplet() }, '▢'),
      h('a', { class: 'ap-cpp-fbtn x', href: '#/aplicatii', title: 'Închide (înapoi la aplicații)', 'aria-label': 'Închide' }, '✕'));
    const barMeniu = h('div', { class: 'ap-cpp-meniu', role: 'menubar' });
    const barUnelte = h('div', { class: 'ap-cpp-tb' });
    const stCale = h('span', { class: 'ap-cpp-st-cale' }), stPoz = h('span', {}), stMesaj = h('span', { class: 'ap-cpp-st-msg' }), stMod = h('span', {});
    const status = h('div', { class: 'ap-cpp-status' }, stCale, h('span', { class: 'ap-cpp-st-sep' }, 'C/C++'), h('span', { class: 'ap-cpp-st-sep' }, 'Windows (CR+LF)'), h('span', { class: 'ap-cpp-st-sep l' }, 'WINDOWS-1252'),
      h('span', { class: 'ap-cpp-st-sep' }, stPoz), h('span', { class: 'ap-cpp-st-sep' }, 'Insert'), h('span', { class: 'ap-cpp-st-sep l' }, stMod), h('span', { class: 'ap-cpp-st-sep l' }, 'default'), stMesaj);

    // ----- mesaje scurte -----
    function toast(text, tip = '') {
      const t = h('div', { class: `ap-cpp-toast ${tip}`, role: 'status' }, text);
      app.append(t);
      setTimeout(() => t.classList.add('gone'), 2600);
      setTimeout(() => t.remove(), 3200);
    }
    const stareStatus = (t, cls = '') => { stMesaj.textContent = t; stMesaj.className = `ap-cpp-st-msg ${cls}`; };

    // =====================================================================
    // DIALOGURI în stil Windows
    // =====================================================================
    let dlgDeschise = 0;
    function fereastra(titlu, continut, { cls = '', butoane = null, modal = true, laInchidere = null } = {}) {
      const d = h('dialog', { class: `ap-cpp-dlg ${cls}` });
      const inchide = (v) => { if (d.open) { d.dataset.v = v ?? ''; d.close(); } };
      d.append(h('div', { class: 'ap-cpp-dlg-bara' }, h('span', { class: 'ap-cpp-dlg-titlu' }, titlu),
        h('button', { type: 'button', class: 'ap-cpp-dlg-x', 'aria-label': 'Închide', onclick: () => inchide('') }, '✕')), h('div', { class: 'ap-cpp-dlg-corp' }, continut));
      if (butoane) d.append(h('div', { class: 'ap-cpp-dlg-btn' }, butoane));
      d.addEventListener('close', () => { dlgDeschise--; d.remove(); laInchidere?.(d.dataset.v); if (!dlgDeschise && activ !== 'start' && !con?.areFocus) ta.focus({ preventScroll: true }); });
      d.addEventListener('keydown', (e) => e.stopPropagation());
      app.append(d); dlgDeschise++;
      if (modal) d.showModal(); else d.show();
      d.inchide = inchide;
      return d;
    }
    const buton = (t, f, cls = '') => h('button', { type: 'button', class: `ap-cpp-wbtn ${cls}`, onclick: f }, t);
    // mesaj cu butoane (ca wxMessageBox): întoarce eticheta butonului apăsat
    function intreaba(titlu, text, butoane = ['OK'], icon = 'informatie') {
      return new Promise((res) => {
        const d = fereastra(titlu, h('div', { class: 'ap-cpp-mbox' }, h('span', { class: 'ap-cpp-mbox-ic', html: ICO[icon] }), h('div', { class: 'ap-cpp-mbox-text' }, text)),
          { cls: 'mic', butoane: butoane.map((b, i) => buton(b, () => d.inchide(b), i === 0 ? 'impl' : '')), laInchidere: (v) => res(v || (butoane.includes('Cancel') ? 'Cancel' : butoane[butoane.length - 1])) });
        d.querySelector('.ap-cpp-wbtn')?.focus();
      });
    }
    function cereText(titlu, eticheta, valoare = '', verifica = null) {
      return new Promise((res) => {
        const inp = h('input', { type: 'text', class: 'ap-cpp-winp', value: valoare, spellcheck: 'false' });
        const err = h('div', { class: 'ap-cpp-dlg-err' });
        const ok = () => { const v = inp.value.trim(); const e = verifica?.(v); if (e) { err.textContent = e; inp.focus(); return; } d.inchide('ok'); res(v); };
        const d = fereastra(titlu, h('label', { class: 'ap-cpp-camp' }, eticheta, inp, err), { cls: 'mic', butoane: [buton('OK', ok, 'impl'), buton('Cancel', () => d.inchide(''))], laInchidere: (v) => { if (v !== 'ok') res(null); } });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
        inp.focus(); inp.select();
      });
    }

    // =====================================================================
    // MENIURI (bara de meniu, submeniuri, meniul de context)
    // =====================================================================
    let meniuDeschis = null; // { el, buton }
    function inchideMeniuri() {
      if (!meniuDeschis) return;
      app.querySelectorAll('.ap-cpp-dd').forEach((x) => x.remove());
      meniuDeschis.buton?.classList.remove('deschis');
      meniuDeschis = null;
    }
    function listaMeniu(itemi, x, y, nivel = 0) {
      const el = h('div', { class: 'ap-cpp-dd', role: 'menu' });
      el.dataset.nivel = nivel;
      for (const it of (typeof itemi === 'function' ? itemi() : itemi)) {
        if (it === '-') { el.append(h('div', { class: 'ap-cpp-dd-sep' })); continue; }
        const dis = it.dis?.() || (!it.f && !it.sub);
        const b = h('button', { type: 'button', role: 'menuitem', class: `ap-cpp-dd-it${it.sub ? ' sub' : ''}`, disabled: dis || null },
          h('span', { class: 'ap-cpp-dd-ic' }, it.chk ? (it.chk() ? '✓' : '') : it.ic ? ic(it.ic) : ''),
          h('span', { class: 'ap-cpp-dd-t' }, it.t), h('span', { class: 'ap-cpp-dd-k' }, it.k || ''), h('span', { class: 'ap-cpp-dd-sag' }, it.sub ? '▸' : ''));
        if (it.sub) {
          const deschide = () => {
            el.querySelectorAll('.ap-cpp-dd-it.sub.ac').forEach((z) => z.classList.remove('ac'));
            app.querySelectorAll('.ap-cpp-dd').forEach((z) => { if (+z.dataset.nivel > nivel) z.remove(); });
            b.classList.add('ac');
            const r = b.getBoundingClientRect(), ra = app.getBoundingClientRect();
            const s = listaMeniu(it.sub, r.right - ra.left - 2, r.top - ra.top - 3, nivel + 1);
            return s;
          };
          b.addEventListener('mouseenter', deschide);
          b.addEventListener('click', () => deschide().querySelector('button:not(:disabled)')?.focus());
          b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); deschide().querySelector('button:not(:disabled)')?.focus(); } });
        } else {
          b.addEventListener('mouseenter', () => { app.querySelectorAll('.ap-cpp-dd').forEach((z) => { if (+z.dataset.nivel > nivel) z.remove(); }); el.querySelectorAll('.ac').forEach((z) => z.classList.remove('ac')); });
          b.addEventListener('click', () => { inchideMeniuri(); it.f(); });
        }
        el.append(b);
      }
      el.addEventListener('keydown', (e) => {
        const bs = [...el.querySelectorAll(':scope > button:not(:disabled)')];
        const i = bs.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length]?.focus(); }
        else if (e.key === 'ArrowLeft' && nivel > 0) { e.preventDefault(); e.stopPropagation(); el.remove(); app.querySelector(`.ap-cpp-dd[data-nivel="${nivel - 1}"] .ac`)?.focus(); }
        else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && nivel === 0 && meniuDeschis?.buton) { e.preventDefault(); e.stopPropagation(); const tb = [...barMeniu.children]; const k = tb.indexOf(meniuDeschis.buton); const urm = tb[(k + (e.key === 'ArrowRight' ? 1 : tb.length - 1)) % tb.length]; deschideMeniu(urm, true); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const bt = meniuDeschis?.buton; inchideMeniuri(); (bt || ta).focus(); }
      });
      app.append(el);
      // să nu iasă din ecran
      const ra = app.getBoundingClientRect();
      const w = el.offsetWidth, hh = el.offsetHeight;
      if (x + w > ra.width) x = nivel ? x - w - (el.previousSibling?.offsetWidth || 200) + 6 : ra.width - w - 2;
      if (y + hh > ra.height) y = Math.max(0, ra.height - hh - 2);
      el.style.left = `${Math.max(0, x)}px`; el.style.top = `${y}px`;
      if (!meniuDeschis) meniuDeschis = { el };
      return el;
    }
    function deschideMeniu(b, focus = false) {
      inchideMeniuri();
      const r = b.getBoundingClientRect(), ra = app.getBoundingClientRect();
      meniuDeschis = { buton: b };
      b.classList.add('deschis');
      const el = listaMeniu(b.itemi, r.left - ra.left, r.bottom - ra.top);
      meniuDeschis.el = el;
      if (focus) el.querySelector('button:not(:disabled)')?.focus();
    }
    function meniuContext(itemi, e) {
      e.preventDefault();
      inchideMeniuri();
      const ra = app.getBoundingClientRect();
      meniuDeschis = { buton: null };
      meniuDeschis.el = listaMeniu(itemi, e.clientX - ra.left, e.clientY - ra.top);
    }
    document.addEventListener('pointerdown', function laClic(e) {
      if (!app.isConnected) { document.removeEventListener('pointerdown', laClic, true); return; }
      if (meniuDeschis && !e.target.closest('.ap-cpp-dd') && !e.target.closest('.ap-cpp-meniu > button')) inchideMeniuri();
    }, true);

    // ----- conținutul meniurilor (denumirile din Code::Blocks, ca în lecții) -----
    const faraFisier = () => !F || activ === 'start';
    const arePrj = () => eProiect(F);
    const MENIURI = [
      ['File', [
        { t: 'New', ic: 'nou', sub: [{ t: 'Project...', ic: 'proiect', f: () => proiectNou() }, '-', { t: 'Empty file', k: 'Ctrl+Shift+N', ic: 'nou', f: () => fisierGol() }, '-', { t: 'Exemple din lecții...', ic: 'exemple', f: () => dialogExemple() }] },
        { t: 'Open...', k: 'Ctrl+O', ic: 'deschide', f: () => dialogDeschide() },
        { t: 'Import .cpp de pe calculator...', f: () => fisierIn.click() },
        { t: 'Recent projects', sub: () => { const r = recente().filter(eProiect).slice(0, 9); return r.length ? r.map((f, i) => ({ t: `${i + 1} ${caleProiect(f)}\\${numeProj(f)}.cbp`, f: () => deschideProiect(f.id) })) : [{ t: '(niciun proiect)' }]; } },
        { t: 'Recent files', sub: () => { const r = recente().slice(0, 9); return r.map((f, i) => ({ t: `${i + 1} ${caleSursa(f)}`, f: () => deschideFila(f.id) })); } },
        '-',
        { t: 'Save file', k: 'Ctrl+S', ic: 'salveaza', f: () => salveazaExplicit(), dis: faraFisier },
        { t: 'Save file as... (descarcă .cpp)', f: () => descarca(), dis: faraFisier },
        { t: 'Save project', f: () => salveazaExplicit(), dis: () => !arePrj() },
        { t: 'Save all files', k: 'Ctrl+Shift+S', ic: 'salveazaTot', f: () => salveazaTot() },
        '-',
        { t: 'Close file', f: () => inchideFila(activ), dis: () => activ === 'start' && !tabs.length },
        { t: 'Close all files', f: () => { for (const id of [...tabs]) inchideFila(id); } },
        { t: 'Close project', f: () => inchideProiect(F.id), dis: () => !arePrj() },
        '-',
        { t: 'Print...', ic: null },
        '-',
        { t: 'Quit', k: 'Ctrl+Q', f: () => { location.hash = '#/aplicatii'; } },
      ]],
      ['Edit', [
        { t: 'Undo', k: 'Ctrl+Z', ic: 'anuleaza', f: () => comandaText('undo') },
        { t: 'Redo', k: 'Ctrl+Shift+Z', ic: 'refa', f: () => comandaText('redo') },
        '-',
        { t: 'Cut', k: 'Ctrl+X', ic: 'taie', f: () => comandaText('cut') },
        { t: 'Copy', k: 'Ctrl+C', ic: 'copiaza', f: () => comandaText('copy') },
        { t: 'Paste', k: 'Ctrl+V', ic: 'lipeste', f: () => lipeste() },
        '-',
        { t: 'Select all', k: 'Ctrl+A', f: () => { ta.focus(); ta.select(); } },
        '-',
        { t: 'Comment', k: 'Ctrl+Shift+C', f: () => comenteaza(true) },
        { t: 'Uncomment', k: 'Ctrl+Shift+X', f: () => comenteaza(false) },
        { t: 'Toggle comment', k: 'Ctrl+/', f: () => comenteaza(null) },
        '-',
        { t: 'Duplicate line', k: 'Ctrl+D', f: () => dubleazaRand() },
        { t: 'Complete code', k: 'Ctrl+Space', f: () => completare(true) },
      ].map((it) => (it === '-' || !it.f ? it : { ...it, dis: faraFisier }))],
      ['View', [
        { t: 'Manager', k: 'Shift+F2', chk: () => pref.mgmt, f: () => comuta('mgmt') },
        { t: 'Logs', k: 'F2', chk: () => pref.logs, f: () => comuta('logs') },
        { t: 'Status bar', chk: () => !status.hidden, f: () => { status.hidden = !status.hidden; } },
        '-',
        { t: 'Zoom in', k: 'Ctrl++', f: () => zoom(1) },
        { t: 'Zoom out', k: 'Ctrl+-', f: () => zoom(-1) },
        { t: 'Reset zoom', k: 'Ctrl+0', f: () => zoom(0) },
        '-',
        { t: 'Full screen', f: () => ecranComplet() },
        { t: 'Start page', f: () => { pref.start = true; activeaza('start'); } },
      ]],
      ['Search', [
        { t: 'Find...', k: 'Ctrl+F', ic: 'cauta', f: () => dialogCauta(false) },
        { t: 'Find next', k: 'F3', f: () => cautaUrmator(1) },
        { t: 'Find previous', k: 'Shift+F3', f: () => cautaUrmator(-1) },
        '-',
        { t: 'Replace...', k: 'Ctrl+R', ic: 'inlocuieste', f: () => dialogCauta(true) },
        '-',
        { t: 'Goto line...', k: 'Ctrl+G', f: () => dialogRand() },
        { t: 'Goto function...', k: 'Ctrl+Shift+G', f: () => dialogFunctie() },
      ].map((it) => (it === '-' ? it : { ...it, dis: faraFisier }))],
      ['Project', [
        { t: 'Activate project', f: () => activeazaProiect(F.id), dis: () => !arePrj() },
        { t: 'Rename project...', f: () => redenumeste(F), dis: () => !arePrj() },
        { t: 'Close project', f: () => inchideProiect(F.id), dis: () => !arePrj() },
        '-',
        { t: 'Build options...' },
        { t: 'Set programs\' arguments...' },
        '-',
        { t: 'Properties...', f: () => proprietati(F), dis: faraFisier },
      ]],
      ['Build', [
        { t: 'Build', k: 'Ctrl+F9', ic: 'build', f: () => build() },
        { t: 'Compile current file', k: 'Ctrl+Shift+F9', f: () => build() },
        { t: 'Run', k: 'Ctrl+F10', ic: 'run', f: () => run() },
        { t: 'Build and run', k: 'F9', ic: 'buildRun', f: () => buildRun() },
        { t: 'Rebuild', k: 'Ctrl+F11', ic: 'rebuild', f: () => build({ rebuild: true }) },
        { t: 'Clean', f: () => clean() },
        '-',
        { t: 'Abort', ic: 'abort', f: () => abort(), dis: () => !ruleaza() },
        '-',
        { t: 'Select target', sub: () => ['Debug', 'Release'].map((t) => ({ t, chk: () => pref.tinta === t, f: () => alegeTinta(t) })) },
      ].map((it) => (it === '-' || it.t === 'Abort' || it.t === 'Select target' ? it : { ...it, dis: () => faraFisier() || !!dbg }))],
      ['Debug', [
        { t: 'Start / Continue', k: 'F8', ic: 'debug', f: () => depaneaza('bp'), dis: faraFisier },
        { t: 'Break debugger', ic: 'pauza' },
        { t: 'Stop debugger', k: 'Shift+F8', ic: 'stop', f: () => opresteDepanarea(), dis: () => !dbg },
        '-',
        { t: 'Run to cursor', k: 'F4', ic: 'laCursor', f: () => depaneaza('cursor'), dis: faraFisier },
        { t: 'Next line', k: 'F7', ic: 'urmator', f: () => depaneaza('next'), dis: faraFisier },
        { t: 'Step into', k: 'Shift+F7', ic: 'intra', f: () => depaneaza('into'), dis: faraFisier },
        { t: 'Step out', k: 'Ctrl+Shift+F7', ic: 'iese', f: () => depaneaza('out'), dis: () => !dbg },
        { t: 'Continue', k: 'Ctrl+F7', f: () => depaneaza('bp'), dis: () => !dbg },
        '-',
        { t: 'Toggle breakpoint', k: 'F5', f: () => comutaBp(randCursor()), dis: faraFisier },
        { t: 'Remove all breakpoints', f: () => { for (const f of db.values()) if (f.bp?.length) { f.bp = []; salveazaCurand(f); } redaGutter(); }, dis: faraFisier },
        '-',
        { t: 'Debugging windows', ic: 'ferestre', sub: [{ t: 'Watches', chk: () => !watches.hidden, f: () => arataWatches(watches.hidden) }, { t: 'Call stack', chk: () => !watches.hidden, f: () => arataWatches(true) }, { t: 'Breakpoints', f: () => listaBp() }] },
      ]],
      ['Tools', [{ t: 'Configure tools...' }, { t: 'Tools+' }]],
      ['Plugins', [
        { t: 'Code statistics', f: () => statistici(), dis: faraFisier },
        { t: 'Source code formatter (AStyle)', f: () => formateaza(), dis: faraFisier },
        { t: 'Code profiler' }, { t: 'Code snippets' }, { t: 'Find broken files in project' },
      ]],
      ['Settings', [
        { t: 'Environment...' },
        { t: 'Editor...', f: () => setariEditor() },
        { t: 'Compiler...', f: () => setariCompilator() },
        { t: 'Debugger...' },
      ]],
      ['Help', [
        { t: 'Ajutor: ce știe acest Code::Blocks', ic: 'info', f: () => dialogAjutor() },
        { t: 'Scurtături de la tastatură', f: () => dialogAjutor(true) },
        '-',
        { t: 'About...', f: () => despre() },
      ]],
    ];
    for (const [nume, itemi] of MENIURI) {
      const b = h('button', { type: 'button', role: 'menuitem', class: 'ap-cpp-mb' }, nume);
      b.itemi = itemi;
      b.addEventListener('click', () => (meniuDeschis?.buton === b ? inchideMeniuri() : deschideMeniu(b)));
      b.addEventListener('mouseenter', () => { if (meniuDeschis?.buton && meniuDeschis.buton !== b) deschideMeniu(b); });
      b.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deschideMeniu(b, true); } });
      barMeniu.append(b);
    }

    // =====================================================================
    // BARELE DE INSTRUMENTE
    // =====================================================================
    const unealta = (ico, titlu, f, cls = '') => {
      const b = h('button', { type: 'button', class: `ap-cpp-tbb ${cls}`, title: titlu, 'aria-label': titlu, onclick: () => { f(); } }, ic(ico));
      b.addEventListener('mouseenter', () => { if (!b.disabled) stareStatus(titlu.replace(/ \(.*\)$/, '')); });
      return b;
    };
    const grup = (...c) => h('div', { class: 'ap-cpp-tbg' }, h('span', { class: 'ap-cpp-tbg-maner' }), ...c);
    const B = {
      nou: unealta('nou', 'New file (Ctrl+Shift+N)', () => fisierGol()),
      deschide: unealta('deschide', 'Open (Ctrl+O)', () => dialogDeschide()),
      salveaza: unealta('salveaza', 'Save (Ctrl+S)', () => salveazaExplicit()),
      salveazaTot: unealta('salveazaTot', 'Save all (Ctrl+Shift+S)', () => salveazaTot()),
      undo: unealta('anuleaza', 'Undo (Ctrl+Z)', () => comandaText('undo')),
      redo: unealta('refa', 'Redo (Ctrl+Shift+Z)', () => comandaText('redo')),
      taie: unealta('taie', 'Cut (Ctrl+X)', () => comandaText('cut')),
      copiaza: unealta('copiaza', 'Copy (Ctrl+C)', () => comandaText('copy')),
      lipeste: unealta('lipeste', 'Paste (Ctrl+V)', () => lipeste()),
      cauta: unealta('cauta', 'Find (Ctrl+F)', () => dialogCauta(false)),
      inloc: unealta('inlocuieste', 'Replace (Ctrl+R)', () => dialogCauta(true)),
      build: unealta('build', 'Build (Ctrl+F9)', () => build()),
      run: unealta('run', 'Run (Ctrl+F10)', () => run()),
      buildRun: unealta('buildRun', 'Build and run (F9)', () => buildRun()),
      rebuild: unealta('rebuild', 'Rebuild (Ctrl+F11)', () => build({ rebuild: true })),
      abort: unealta('abort', 'Abort', () => abort()),
      debug: unealta('debug', 'Debug / Continue (F8)', () => depaneaza('bp')),
      cursor: unealta('laCursor', 'Run to cursor (F4)', () => depaneaza('cursor')),
      next: unealta('urmator', 'Next line (F7)', () => depaneaza('next')),
      into: unealta('intra', 'Step into (Shift+F7)', () => depaneaza('into')),
      out: unealta('iese', 'Step out (Ctrl+Shift+F7)', () => depaneaza('out')),
      instr: unealta('instr', 'Next instruction (Alt+F7)', () => depaneaza('next')),
      pauza: unealta('pauza', 'Break debugger', () => {}),
      stop: unealta('stop', 'Stop debugger (Shift+F8)', () => opresteDepanarea()),
      ferestre: unealta('ferestre', 'Debugging windows: Watches', () => arataWatches(watches.hidden)),
      info: unealta('info', 'Various info: breakpoints', () => listaBp()),
    };
    B.pauza.disabled = true;
    const tintaSel = h('select', { class: 'ap-cpp-sel', 'aria-label': 'Build target', onchange: (e) => alegeTinta(e.target.value) }, h('option', { value: 'Debug' }, 'Debug'), h('option', { value: 'Release' }, 'Release'));
    const scopSel = h('select', { class: 'ap-cpp-sel lat', 'aria-label': 'Scope' }, h('option', {}, '<global>'));
    const functSel = h('select', { class: 'ap-cpp-sel lat2', 'aria-label': 'Funcția', onchange: () => { const r = +functSel.value; if (r) mergiLaRand(r); } });
    barUnelte.append(
      grup(B.nou, B.deschide, B.salveaza, B.salveazaTot, h('span', { class: 'ap-cpp-tbsep' }), B.undo, B.redo, h('span', { class: 'ap-cpp-tbsep' }), B.taie, B.copiaza, B.lipeste, h('span', { class: 'ap-cpp-tbsep' }), B.cauta, B.inloc),
      grup(B.build, B.run, B.buildRun, B.rebuild, B.abort, h('span', { class: 'ap-cpp-tbsep' }), h('span', { class: 'ap-cpp-tbl' }, 'Build target:'), tintaSel),
      grup(B.debug, B.cursor, B.next, B.instr, B.into, B.out, B.pauza, B.stop, h('span', { class: 'ap-cpp-tbsep' }), B.ferestre, B.info),
      h('div', { class: 'ap-cpp-tbg cc' }, h('span', { class: 'ap-cpp-tbg-maner' }), scopSel, functSel));

    // =====================================================================
    // PANOUL MANAGEMENT (Projects / Symbols / Files)
    // =====================================================================
    const mgmtCorp = h('div', { class: 'ap-cpp-mg-corp', role: 'tree' });
    let mgFila = 'Projects';
    const mgTaburi = h('div', { class: 'ap-cpp-ptabs' }, ['Projects', 'Symbols', 'Files'].map((t) => h('button', { type: 'button', class: t === mgFila ? 'activ' : '', onclick: (e) => { mgFila = t; for (const x of mgTaburi.children) x.classList.toggle('activ', x === e.currentTarget); redaMgmt(); } }, t)));
    const mgmt = h('div', { class: 'ap-cpp-mg' },
      h('div', { class: 'ap-cpp-pcap' }, h('span', {}, 'Management'), h('button', { type: 'button', class: 'ap-cpp-px', title: 'Închide (Shift+F2)', onclick: () => comuta('mgmt') }, '✕')),
      mgTaburi, mgmtCorp);
    const deschiseNod = new Set(['ws', ...pref.ws.map((id) => `p:${id}`), ...pref.ws.map((id) => `s:${id}`), 'dir', ...pref.ws.map((id) => `d:${id}`), 'sf', 'sv']);
    function nod(cheie, eticheta, icon, copii, { activ: act = false, bold = false, laDublu = null, laContext = null, titlu = null } = {}) {
      const are = copii && copii.length;
      const desc = deschiseNod.has(cheie);
      const r = h('div', { class: `ap-cpp-nod${act ? ' sel' : ''}${bold ? ' b' : ''}`, role: 'treeitem', tabindex: '0', title: titlu, 'aria-expanded': are ? String(desc) : null },
        h('span', { class: `ap-cpp-semn${are ? (desc ? ' minus' : ' plus') : ''}`, onclick: (e) => { e.stopPropagation(); if (are) { if (desc) deschiseNod.delete(cheie); else deschiseNod.add(cheie); redaMgmt(); } } }),
        ic(icon), h('span', { class: 'ap-cpp-nod-t' }, eticheta));
      r.addEventListener('click', () => { mgmtCorp.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); r.classList.add('sel'); });
      r.addEventListener('dblclick', () => { if (laDublu) laDublu(); else if (are) { if (desc) deschiseNod.delete(cheie); else deschiseNod.add(cheie); redaMgmt(); } });
      r.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); r.dispatchEvent(new MouseEvent('dblclick')); } });
      if (laContext) r.addEventListener('contextmenu', (e) => { r.click(); meniuContext(laContext, e); });
      const w = h('div', { class: 'ap-cpp-ramura' }, r);
      if (are && desc) w.append(h('div', { class: 'ap-cpp-copii' }, copii));
      return w;
    }
    function meniuProiect(f) {
      return [
        { t: 'Activate project', f: () => activeazaProiect(f.id) },
        '-',
        { t: 'Build', ic: 'build', f: () => { activeazaProiect(f.id); build(); } },
        { t: 'Rebuild', ic: 'rebuild', f: () => { activeazaProiect(f.id); build({ rebuild: true }); } },
        { t: 'Clean', f: () => { activeazaProiect(f.id); clean(); } },
        '-',
        { t: 'Rename project...', f: () => redenumeste(f) },
        { t: 'Close project', f: () => inchideProiect(f.id) },
        { t: 'Șterge proiectul de pe disc...', f: () => stergeFisier(f) },
        '-',
        { t: 'Properties...', f: () => proprietati(f) },
      ];
    }
    function redaMgmt() {
      if (mgFila === 'Projects') {
        const proiecte = pref.ws.map((id) => db.get(id)).filter(Boolean);
        umple(mgmtCorp, nod('ws', 'Workspace', 'workspace', proiecte.map((f) => nod(`p:${f.id}`, f.titlu, 'proiect',
          [nod(`s:${f.id}`, 'Sources', 'dosar', [nod(`f:${f.id}`, 'main.cpp', 'cpp', null, { activ: activ === f.id, titlu: caleSursa(f), laDublu: () => deschideFila(f.id), laContext: [{ t: 'Open main.cpp', f: () => deschideFila(f.id) }, { t: 'Properties...', f: () => proprietati(f) }] })])],
          { bold: f.id === F?.id || (activ === 'start' && f.id === curId), titlu: `${caleProiect(f)}\\${numeProj(f)}.cbp`, laDublu: () => activeazaProiect(f.id), laContext: meniuProiect(f) })),
        { laContext: [{ t: 'New project...', f: () => proiectNou() }, { t: 'Open project...', f: () => dialogDeschide() }, { t: 'Close workspace', f: () => { for (const id of [...pref.ws]) inchideProiect(id); } }] }));
        if (!proiecte.length) mgmtCorp.append(h('p', { class: 'ap-cpp-gol' }, 'Niciun proiect deschis. File → New → Project… sau File → Open…'));
      } else if (mgFila === 'Symbols') {
        if (!F || activ === 'start') { umple(mgmtCorp, h('p', { class: 'ap-cpp-gol' }, 'Deschide un fișier.')); return; }
        const fn = functiiDin(ta.value), gl = globaleDin(ta.value);
        umple(mgmtCorp, nod('sym', numeSursa(F), 'cpp', [
          nod('sf', 'Global functions', 'dosar', fn.map((x) => nod(`sf:${x.nume}`, `${x.nume}(${x.params}) : ${x.tip}`, 'functie', null, { laDublu: () => mergiLaRand(x.rand) }))),
          nod('sv', 'Global variables', 'dosar', gl.map((x) => nod(`sv:${x.nume}`, x.nume, 'variabila', null, { laDublu: () => mergiLaRand(x.rand) }))),
        ]));
        deschiseNod.add('sym');
      } else {
        const toate = recente().sort((a, b) => a.titlu.localeCompare(b.titlu, 'ro'));
        umple(mgmtCorp, nod('dir', DIR, 'dosarDeschis', toate.map((f) => (f.fisier
          ? nod(`x:${f.id}`, numeSursa(f), 'cpp', null, { laDublu: () => deschideFila(f.id), titlu: caleSursa(f), laContext: [{ t: 'Open', f: () => deschideFila(f.id) }, { t: 'Rename...', f: () => redenumeste(f) }, { t: 'Delete...', f: () => stergeFisier(f) }] })
          : nod(`d:${f.id}`, numeProj(f), 'dosar', [
            nod(`dc:${f.id}`, 'main.cpp', 'cpp', null, { laDublu: () => deschideFila(f.id), titlu: caleSursa(f) }),
            nod(`db:${f.id}`, `${numeProj(f)}.cbp`, 'cbp', null, { laDublu: () => deschideProiect(f.id) }),
          ], { laContext: [{ t: 'Open project', f: () => deschideProiect(f.id) }, { t: 'Delete...', f: () => stergeFisier(f) }] })))));
      }
    }

    // =====================================================================
    // EDITORUL (file, margine cu numere și puncte de oprire, cod colorat)
    // =====================================================================
    const taburi = h('div', { class: 'ap-cpp-etabs', role: 'tablist' });
    const ta = h('textarea', { class: 'ap-cpp-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'Codul programului C++' });
    const codEl = h('code', {});
    const marcaj = h('div', { class: 'ap-cpp-marcaj', 'aria-hidden': 'true' });
    const pre = h('pre', { class: 'ap-cpp-pre', 'aria-hidden': 'true' }, marcaj, codEl);
    const nrRand = h('div', { class: 'ap-cpp-nr' });
    const gutter = h('div', { class: 'ap-cpp-gutter', title: 'Clic: pune / scoate un punct de oprire (F5)' }, nrRand);
    const masura = h('span', { class: 'ap-cpp-masura', 'aria-hidden': 'true' }, 'X'.repeat(40));
    const popup = h('div', { class: 'ap-cpp-compl', role: 'listbox', hidden: true });
    const strat = h('div', { class: 'ap-cpp-strat' }, pre, ta, masura, popup);
    const editor = h('div', { class: 'ap-cpp-editor' }, gutter, strat);
    const startPag = h('div', { class: 'ap-cpp-startpag', hidden: true });
    const edZona = h('div', { class: 'ap-cpp-edz' }, taburi, editor, startPag);

    // fereastra Watches (depanatorul)
    const watchCorp = h('div', { class: 'ap-cpp-w-corp' });
    const stivaCorp = h('div', { class: 'ap-cpp-w-stiva' });
    const watches = h('div', { class: 'ap-cpp-w', hidden: true },
      h('div', { class: 'ap-cpp-pcap' }, h('span', {}, 'Watches'), h('button', { type: 'button', class: 'ap-cpp-px', title: 'Închide', onclick: () => arataWatches(false) }, '✕')),
      h('div', { class: 'ap-cpp-w-cap' }, h('span', {}, 'Watch'), h('span', {}, 'Value'), h('span', {}, 'Type')),
      watchCorp,
      h('div', { class: 'ap-cpp-pcap mic' }, h('span', {}, 'Call stack')),
      stivaCorp);

    // panoul de jos: Logs & others
    const logTab = {};
    const logCorp = h('div', { class: 'ap-cpp-log-corp' });
    const logCB = h('div', { class: 'ap-cpp-log txt' });
    const logCautare = h('div', { class: 'ap-cpp-log' });
    const logBuild = h('div', { class: 'ap-cpp-log txt' });
    const mesajeT = h('tbody', {});
    const logMesaje = h('div', { class: 'ap-cpp-log' }, h('table', { class: 'ap-cpp-mesaje' }, h('thead', {}, h('tr', {}, h('th', {}, 'File'), h('th', {}, 'Line'), h('th', {}, 'Message'))), mesajeT));
    const logDbg = h('div', { class: 'ap-cpp-log txt' });
    const intrareTa = h('textarea', { class: 'ap-cpp-intrare', spellcheck: 'false', wrap: 'off', placeholder: 'Opțional: scrie aici datele pe care le citește cin >> (separate prin spații sau pe rânduri).\nDacă lași caseta goală, le scrii în consolă când programul le cere – ca în Code::Blocks.', 'aria-label': 'Date de intrare' });
    const logIntrare = h('div', { class: 'ap-cpp-log in' }, h('div', { class: 'ap-cpp-in-cap' }, h('span', {}, 'Date de intrare pentru program (stdin) – ajutor edudigi, nu există în Code::Blocks'), h('span', { class: 'ap-cpp-spatiu' }),
      h('button', { type: 'button', class: 'ap-cpp-wbtn mic', onclick: () => { intrareTa.value = ''; laIntrare(); intrareTa.focus(); } }, 'Golește')), intrareTa);
    const LOGURI = [['Code::Blocks', logCB], ['Search results', logCautare], ['Build log', logBuild], ['Build messages', logMesaje], ['Debugger', logDbg], ['Date de intrare', logIntrare]];
    const logTaburi = h('div', { class: 'ap-cpp-ptabs jos', role: 'tablist' });
    for (const [n, el] of LOGURI) {
      logTab[n] = h('button', { type: 'button', role: 'tab', onclick: () => arataLog(n) }, ic(n === 'Build log' ? 'build' : n === 'Build messages' ? 'atentieMic' : n === 'Debugger' ? 'debug' : n === 'Search results' ? 'cauta' : n === 'Date de intrare' ? 'consola' : 'sigla16'), n);
      logTaburi.append(logTab[n]);
      logCorp.append(el);
    }
    const logs = h('div', { class: 'ap-cpp-logs' },
      h('div', { class: 'ap-cpp-pcap' }, h('span', {}, 'Logs & others'), h('button', { type: 'button', class: 'ap-cpp-px', title: 'Închide (F2)', onclick: () => comuta('logs') }, '✕')),
      logTaburi, logCorp);
    function arataLog(n) {
      for (const [k, el] of LOGURI) { el.hidden = k !== n; logTab[k].classList.toggle('activ', k === n); logTab[k].setAttribute('aria-selected', String(k === n)); }
      if (!pref.logs) comuta('logs');
    }
    ICO.atentieMic = S16('<path d="M8 1.5L15 14H1z" fill="#f2c010" stroke="#9a7a00"/><rect x="7.2" y="5.5" width="1.6" height="4.5" fill="#222"/><rect x="7.2" y="11" width="1.6" height="1.6" fill="#222"/>');
    ICO.sigla16 = ICO.sigla;
    for (const [n] of LOGURI) logTab[n].querySelector('.ap-cpp-ic').innerHTML = ICO[n === 'Build log' ? 'build' : n === 'Build messages' ? 'atentieMic' : n === 'Debugger' ? 'debug' : n === 'Search results' ? 'cauta' : n === 'Date de intrare' ? 'consola' : 'sigla16'];

    const desp1 = h('div', { class: 'ap-cpp-desp v', title: 'Trage ca să schimbi lățimea' });
    const desp2 = h('div', { class: 'ap-cpp-desp o', title: 'Trage ca să schimbi înălțimea' });
    const desp3 = h('div', { class: 'ap-cpp-desp v w' });
    const sus = h('div', { class: 'ap-cpp-sus' }, edZona, desp3, watches);
    const centru = h('div', { class: 'ap-cpp-centru' }, sus, desp2, logs);
    const corp = h('div', { class: 'ap-cpp-corp' }, mgmt, desp1, centru);
    const fisierIn = h('input', { type: 'file', accept: '.cpp,.cc,.c,.h,.txt,text/plain', hidden: true, onchange: () => incarcaDeLaCalculator() });
    app.append(barTitlu, barMeniu, barUnelte, corp, status, fisierIn);

    // bara pentru predarea la sarcină
    if (params?.get('sarcina') && window.EduSarcini?.bara) {
      try {
        const b = await window.EduSarcini.bara('cpp', async () => lucrare());
        if (b instanceof Node) app.prepend(b);
      } catch { /* fără bară */ }
    }
    show(h('div', { class: 'lab-ecran' }, app));
    document.title = 'Code::Blocks (C++) – edudigi';

    function lucrare() {
      const f = F || db.get(curId);
      if (f && f === F && activ !== 'start') f.cod = ta.value;
      return { titlu: f?.titlu || 'Program', tip: 'cod', limbaj: 'cpp', date: f?.cod || '', intrare: f?.intrare || '', iesire: ultimaRulare ? ultimaRulare.text : '' };
    }

    // ----- aspect: panouri, despărțitoare, zoom -----
    function aplicaAspect() {
      mgmt.hidden = !pref.mgmt; desp1.hidden = !pref.mgmt;
      logs.hidden = !pref.logs; desp2.hidden = !pref.logs;
      desp3.hidden = watches.hidden;
      if (pref.mgmtW) mgmt.style.width = `${pref.mgmtW}px`;
      if (pref.logH) logs.style.height = `${pref.logH}px`;
      if (pref.watchW) watches.style.width = `${pref.watchW}px`;
    }
    function comuta(k) { pref[k] = !pref[k]; salvPref(); aplicaAspect(); sincronizeaza(); }
    function trage(el, fn) {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('trage');
        const x0 = e.clientX, y0 = e.clientY, st = fn(0, 0, true);
        const mut = (ev) => fn(ev.clientX - x0, ev.clientY - y0, false, st);
        const gata = () => { el.classList.remove('trage'); el.removeEventListener('pointermove', mut); el.removeEventListener('pointerup', gata); el.removeEventListener('pointercancel', gata); salvPref(); sincronizeaza(); };
        el.addEventListener('pointermove', mut); el.addEventListener('pointerup', gata); el.addEventListener('pointercancel', gata);
      });
    }
    trage(desp1, (dx, dy, init, st) => { if (init) return mgmt.offsetWidth; pref.mgmtW = Math.max(130, Math.min(480, st + dx)); mgmt.style.width = `${pref.mgmtW}px`; });
    trage(desp2, (dx, dy, init, st) => { if (init) return logs.offsetHeight; pref.logH = Math.max(70, Math.min(app.offsetHeight - 160, st - dy)); logs.style.height = `${pref.logH}px`; });
    trage(desp3, (dx, dy, init, st) => { if (init) return watches.offsetWidth; pref.watchW = Math.max(180, Math.min(520, st - dx)); watches.style.width = `${pref.watchW}px`; });
    let lh = 20, cw = 8;
    function zoom(d) {
      if (d !== null) pref.fs = d === 0 ? 15 : Math.min(26, Math.max(10, (pref.fs || 15) + d));
      lh = Math.round(pref.fs * 1.45);
      app.style.setProperty('--ap-fs', `${pref.fs}px`);
      app.style.setProperty('--ap-lh', `${lh}px`);
      salvPref();
      cw = masura.getBoundingClientRect().width / 40 || pref.fs * 0.6;
      sincronizeaza(); redaMarcaje();
    }
    function ecranComplet() {
      try { if (document.fullscreenElement) document.exitFullscreen(); else app.closest('.lab-ecran')?.requestFullscreen?.(); } catch { /* nepermis */ }
    }

    // =====================================================================
    // FIȘIERE ȘI PROIECTE
    // =====================================================================
    function stareSalv() { stMod.textContent = F && activ !== 'start' ? (sf(F.id).mod ? 'Modified' : 'Read/Write') : ''; }
    async function salveazaInreg(f) {
      delete f.nou;
      try { await store.put(f); lsScrie(LS_CURENT, curId); return true; } catch { toast('Nu am putut salva: spațiul din browser este plin.', 'err'); return false; }
    }
    // salvare automată (ca lucrul să nu se piardă), dar „*” rămâne până la Save / Build, ca în Code::Blocks
    function salveazaCurand(f = F) { clearTimeout(tSalv); tSalv = setTimeout(() => { tSalv = null; f.actualizat = Date.now(); salveazaInreg(f); }, 700); }
    function scrieInF() { if (F && activ === F.id) F.cod = ta.value; }
    async function salveazaExplicit(f = F) {
      if (!f) return true;
      if (f === F) scrieInF();
      if (f.nesalvat) { const ok = await salveazaCaNume(f); if (!ok) return false; }
      clearTimeout(tSalv); tSalv = null;
      f.actualizat = Date.now();
      const ok = await salveazaInreg(f);
      if (ok) { sf(f.id).mod = false; redaTaburi(); stareSalv(); logCbScrie(`Saved ${caleSursa(f)}`); }
      return ok;
    }
    async function salveazaTot() { scrieInF(); for (const id of tabs) { const f = db.get(id); if (f && (sf(id).mod || f.nesalvat)) await salveazaExplicit(f); } toast('Toate fișierele au fost salvate.'); }
    async function salveazaCaNume(f) {
      const n = await cereText('Save file', `Numele fișierului (se salvează în ${DIR}):`, `${f.titlu}.cpp`, (v) => (!v.replace(/\.cpp$/i, '').trim() ? 'Scrie un nume.' : null));
      if (!n) return false;
      f.titlu = n.replace(/\.(cpp|cc|c)$/i, '').slice(0, 60);
      delete f.nesalvat;
      redaTot();
      return true;
    }
    async function numeLiber(baza) {
      const t = [...db.values()].map((f) => f.titlu);
      if (!t.includes(baza)) return baza;
      let i = 2; while (t.includes(`${baza}${/\d$/.test(baza) ? '_' : ''}${i}`)) i++;
      return `${baza}${/\d$/.test(baza) ? '_' : ''}${i}`;
    }
    async function creeaza(titlu, cod, intrare = '', extra = {}) {
      const f = { id: idNou(), titlu: await numeLiber(titlu), cod, intrare, creat: Date.now(), actualizat: Date.now(), ...extra };
      db.set(f.id, f);
      await salveazaInreg(f);
      if (eProiect(f)) { pref.ws.push(f.id); deschiseNod.add(`p:${f.id}`); deschiseNod.add(`s:${f.id}`); }
      deschideFila(f.id);
      return f;
    }
    async function fisierGol() {
      let i = 1; const t = new Set([...db.values()].map((f) => f.titlu)); while (t.has(`Untitled${i}`)) i++;
      const f = await creeaza(`Untitled${i}`, '', '', { fisier: true, nesalvat: true });
      sf(f.id).mod = true; redaTaburi();
      logCbScrie(`New file: Untitled${i} (salvează-l cu Ctrl+S, cu extensia .cpp)`);
    }
    function deschideFila(id) {
      if (!db.has(id)) return;
      if (!tabs.includes(id)) tabs.push(id);
      const f = db.get(id);
      if (eProiect(f) && !pref.ws.includes(id)) pref.ws.push(id);
      activeaza(id);
    }
    function deschideProiect(id) { const f = db.get(id); if (!f) return; if (!pref.ws.includes(id)) { pref.ws.push(id); logCbScrie(`Opening ${caleProiect(f)}\\${numeProj(f)}.cbp`); } deschiseNod.add(`p:${id}`); deschiseNod.add(`s:${id}`); deschideFila(id); }
    function activeazaProiect(id) { deschideFila(id); }
    function activeaza(id) {
      if (activ !== 'start' && F && db.has(activ)) { scrieInF(); const s = sf(F.id); s.sel = [ta.selectionStart, ta.selectionEnd]; s.sus = ta.scrollTop; s.st = ta.scrollLeft; }
      inchideCompletare();
      activ = id;
      if (id === 'start') { editor.hidden = true; startPag.hidden = false; redaStart(); }
      else {
        F = db.get(id); curId = id; lsScrie(LS_CURENT, id);
        editor.hidden = false; startPag.hidden = true;
        const s = sf(id);
        ta.value = F.cod || '';
        intrareTa.value = F.intrare || '';
        nrLinii = -1; reda();
        ta.setSelectionRange(...s.sel); ta.scrollTop = s.sus; ta.scrollLeft = s.st;
        sincronizeaza(); pozitie();
      }
      pref.tabs = tabs; salvPref();
      redaTot();
    }
    function inchideFila(id) {
      if (id === 'start') { pref.start = false; salvPref(); if (activ === 'start') activeaza(tabs[tabs.length - 1] || 'start'); else redaTaburi(); if (!tabs.length && activ === 'start') redaTot(); return; }
      const k = tabs.indexOf(id); if (k < 0) return;
      if (id === activ) scrieInF();
      const f = db.get(id);
      if (f && (sf(id).mod || tSalv)) { clearTimeout(tSalv); tSalv = null; f.actualizat = Date.now(); salveazaInreg(f); }
      tabs.splice(k, 1); sf(id).mod = false;
      if (dbg && dbg.id === id) opresteDepanarea();
      if (id === activ) { const urm = tabs[Math.min(k, tabs.length - 1)]; if (urm) activeaza(urm); else { pref.start = true; activeaza('start'); } }
      else { pref.tabs = tabs; salvPref(); redaTaburi(); }
    }
    function inchideProiect(id) {
      pref.ws = pref.ws.filter((x) => x !== id);
      if (tabs.includes(id)) inchideFila(id);
      salvPref(); redaTot();
      const f = db.get(id); if (f) logCbScrie(`Closed project ${numeProj(f)}`);
    }
    async function redenumeste(f) {
      const t = await cereText(f.fisier ? 'Rename file' : 'Rename project', f.fisier ? 'Numele nou al fișierului:' : 'Numele nou al proiectului:', f.titlu, (v) => (!v ? 'Scrie un nume.' : [...db.values()].some((x) => x !== f && x.titlu === v) ? 'Există deja un program cu acest nume.' : null));
      if (!t) return;
      f.titlu = t.slice(0, 60); delete f.nesalvat;
      await salveazaInreg(f); redaTot();
    }
    async function stergeFisier(f) {
      const r = await intreaba('Delete', `Ștergi definitiv ${f.fisier ? 'fișierul' : 'proiectul'} „${f.titlu}”?\n${f.fisier ? caleSursa(f) : caleProiect(f)}\n\nNu poate fi recuperat.`, ['Yes', 'No'], 'atentie');
      if (r !== 'Yes') return false;
      if (dbg?.id === f.id) opresteDepanarea();
      if (tabs.includes(f.id)) { sf(f.id).mod = false; clearTimeout(tSalv); tSalv = null; tabs = tabs.filter((x) => x !== f.id); }
      pref.ws = pref.ws.filter((x) => x !== f.id);
      db.delete(f.id); exe.delete(f.id);
      try { await store.del(f.id); } catch { /* */ }
      if (activ === f.id) { const urm = tabs[tabs.length - 1]; if (urm) activeaza(urm); else { pref.start = true; activeaza('start'); } } else { pref.tabs = tabs; salvPref(); redaTot(); }
      return true;
    }
    function proprietati(f) {
      const rand = (a, b) => h('tr', {}, h('th', {}, a), h('td', {}, b));
      fereastra(f.fisier ? 'File properties' : 'Project/targets options', h('table', { class: 'ap-cpp-prop' },
        rand(f.fisier ? 'File name:' : 'Title:', f.fisier ? numeSursa(f) : f.titlu),
        rand('Location:', f.fisier ? caleSursa(f) : `${caleProiect(f)}\\${numeProj(f)}.cbp`),
        f.fisier ? null : rand('Sources:', 'main.cpp'),
        rand('Output filename:', caleExe(f)),
        rand('Type:', 'Console application'),
        rand('Compiler:', 'GNU GCC Compiler'),
        rand('Lines:', String((f === F ? ta.value : f.cod || '').split('\n').length)),
        rand('Created:', cand(f.creat || Date.now())), rand('Last modified:', cand(f.actualizat || Date.now()))), { butoane: [buton('OK', () => app.querySelector('dialog[open]')?.close(), 'impl')] });
    }

    // ----- File → New → Project (asistentul Console application) -----
    function proiectNou() {
      const sabloane = [['Console application', 'consola', true], ['Empty project', 'proiect', false], ['Static library', 'cbp', false], ['Win32 GUI project', 'ferestre', false], ['GLUT project', 'workspace', false], ['wxWidgets project', 'workspace', false], ['Qt4 project', 'workspace', false], ['Fortran application', 'cbp', false], ['ARM Project', 'cbp', false], ['AVR Project', 'cbp', false], ['Code::Blocks plugin', 'workspace', false], ['Direct/X project', 'ferestre', false]];
      let ales = 'Console application';
      const grila = h('div', { class: 'ap-cpp-sabloane' }, sabloane.map(([n, i, ok]) => {
        const b = h('button', { type: 'button', class: `ap-cpp-sablon${n === ales ? ' sel' : ''}`, onclick: () => { ales = n; grila.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); }, ondblclick: () => go() }, h('span', { class: 'ap-cpp-sablon-ic', html: ICO[i] }), n);
        b.dataset.ok = ok ? '1' : '';
        return b;
      }));
      const go = async () => {
        if (ales !== 'Console application') { await intreaba('Information', `Șablonul „${ales}” nu este disponibil în acest simulator.\nLa ora de informatică folosești Console application.`, ['OK']); return; }
        d.inchide('go'); asistent();
      };
      const d = fereastra('New from template', h('div', { class: 'ap-cpp-nft' },
        h('div', { class: 'ap-cpp-nft-cat' }, h('b', {}, 'Category:'), h('div', { class: 'ap-cpp-lista' }, h('div', { class: 'sel' }, 'Projects'), h('div', {}, 'Build targets'), h('div', {}, 'Files'), h('div', {}, 'Custom'), h('div', {}, 'User templates'))),
        h('div', { class: 'ap-cpp-nft-dr' }, h('p', { class: 'ap-cpp-mic' }, 'Alege Console application și apasă Go.'), grila)),
      { cls: 'lat', butoane: [buton('Go', go, 'impl'), buton('Cancel', () => d.inchide(''))] });
      grila.querySelector('.sel')?.focus();
    }
    function asistent() {
      let pas = 0, limbaj = 'C++';
      const titluIn = h('input', { type: 'text', class: 'ap-cpp-winp', spellcheck: 'false', maxlength: '60' });
      const cbpIn = h('input', { type: 'text', class: 'ap-cpp-winp', readonly: true });
      const rezIn = h('input', { type: 'text', class: 'ap-cpp-winp', readonly: true });
      const avert = h('div', { class: 'ap-cpp-dlg-err' });
      titluIn.addEventListener('input', () => {
        const t = titluIn.value.trim(); const n = numeFisier(t || 'x').replace(/\.cpp$/, '');
        cbpIn.value = t ? `${n}.cbp` : ''; rezIn.value = t ? `${DIR}\\${n}\\${n}.cbp` : '';
        avert.textContent = /\s|[ăâîșțşţĂÂÎȘȚ]/.test(t) ? 'Sfat: în lecție, numele proiectului se scrie fără spații și fără diacritice (altfel depanatorul poate să nu meargă).' : '';
      });
      const pagini = [
        () => h('div', {}, h('h3', {}, 'Welcome to the new console application wizard!'), h('p', {}, 'This wizard will guide you to create a new console application.'), h('p', {}, 'When you \'re ready to proceed, please click "Next"...')),
        () => h('div', {}, h('p', {}, 'Please select the language you want to use.'), h('div', { class: 'ap-cpp-lista mare' }, ['C', 'C++'].map((l) => h('div', { class: l === limbaj ? 'sel' : '', tabindex: '0', onclick: (e) => { limbaj = l; e.currentTarget.parentNode.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); e.currentTarget.classList.add('sel'); } }, l)))),
        () => h('div', { class: 'ap-cpp-form' }, h('p', {}, 'Please select the folder where you want the new project to be created as well as its title.'),
          h('label', { class: 'ap-cpp-camp' }, 'Project title:', titluIn), h('label', { class: 'ap-cpp-camp' }, 'Folder to create project in:', h('input', { type: 'text', class: 'ap-cpp-winp', readonly: true, value: DIR })),
          h('label', { class: 'ap-cpp-camp' }, 'Project filename:', cbpIn), h('label', { class: 'ap-cpp-camp' }, 'Resulting filename:', rezIn), avert),
        () => h('div', { class: 'ap-cpp-form' }, h('p', {}, 'Please select the compiler to use and which configurations you want enabled in your project.'),
          h('label', { class: 'ap-cpp-camp' }, 'Compiler:', h('select', { class: 'ap-cpp-winp' }, h('option', {}, 'GNU GCC Compiler'))),
          h('label', { class: 'ap-cpp-chk' }, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Create "Debug" configuration: Debug'),
          h('div', { class: 'ap-cpp-mic' }, 'Output dir.: bin\\Debug\\   Objects output dir.: obj\\Debug\\'),
          h('label', { class: 'ap-cpp-chk' }, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Create "Release" configuration: Release'),
          h('div', { class: 'ap-cpp-mic' }, 'Output dir.: bin\\Release\\   Objects output dir.: obj\\Release\\')),
      ];
      const zona = h('div', { class: 'ap-cpp-wiz-pag' });
      const inapoi = buton('< Back', () => { if (pas > 0) { pas--; arata(); } });
      const inainte = buton('Next >', () => urmator(), 'impl');
      const d = fereastra('Console application', h('div', { class: 'ap-cpp-wiz' }, h('div', { class: 'ap-cpp-wiz-img' }, h('span', { html: ICO.consola }), h('b', {}, 'Console')), zona),
        { cls: 'lat', butoane: [inapoi, inainte, buton('Cancel', () => d.inchide(''))] });
      async function urmator() {
        if (pas === 1 && limbaj === 'C') { await intreaba('Information', 'În acest simulator poți crea doar proiecte C++ (la ora de informatică folosim C++).', ['OK']); return; }
        if (pas === 2) {
          const t = titluIn.value.trim();
          if (!t) { await intreaba('Error', 'Please select a valid title for the project.', ['OK'], 'eroare'); titluIn.focus(); return; }
          if ([...db.values()].some((f) => !f.fisier && numeProj(f) === numeFisier(t).replace(/\.cpp$/, ''))) { await intreaba('Error', `The directory\n${DIR}\\${numeFisier(t).replace(/\.cpp$/, '')}\nalready exists. Alege alt nume pentru proiect.`, ['OK'], 'eroare'); titluIn.focus(); return; }
        }
        if (pas < pagini.length - 1) { pas++; arata(); return; }
        d.inchide('gata');
        const f = await creeaza(titluIn.value.trim().slice(0, 60), SABLON_CB);
        logCbScrie(`Project ${numeProj(f)} created: ${caleProiect(f)}\\${numeProj(f)}.cbp`);
        toast('Proiect creat. Deschide Sources → main.cpp și apasă F9 (Build and run).');
      }
      function arata() {
        umple(zona, pagini[pas]());
        inapoi.disabled = pas === 0;
        inainte.textContent = pas === pagini.length - 1 ? 'Finish' : 'Next >';
        if (pas === 2) titluIn.focus(); else inainte.focus();
      }
      titluIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); urmator(); } });
      arata();
    }

    // ----- File → Open (fereastra de deschidere, cu toate programele salvate) -----
    function dialogDeschide() {
      let sel = null;
      const tb = h('tbody', {});
      const numeIn = h('input', { type: 'text', class: 'ap-cpp-winp', readonly: true });
      function redaLista() {
        const toate = recente();
        umple(tb, toate.map((f) => {
          const r = h('tr', { tabindex: '0', class: sel === f.id ? 'sel' : '' },
            h('td', {}, ic(f.fisier ? 'cpp' : 'cbp'), f.fisier ? numeSursa(f) : `${numeProj(f)}.cbp`, f.fisier ? '' : h('small', {}, `  (${f.titlu})`)),
            h('td', {}, cand(f.actualizat || f.creat || Date.now())), h('td', {}, f.fisier ? 'C/C++ source file' : 'Code::Blocks project'));
          r.addEventListener('click', () => { sel = f.id; numeIn.value = f.fisier ? numeSursa(f) : `${numeProj(f)}.cbp`; tb.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); r.classList.add('sel'); });
          r.addEventListener('dblclick', () => { sel = f.id; deschide(); });
          r.addEventListener('keydown', (e) => { if (e.key === 'Enter') { sel = f.id; deschide(); } });
          return r;
        }));
        if (!toate.length) tb.append(h('tr', {}, h('td', { colspan: '3', class: 'ap-cpp-gol' }, 'Nu ai încă programe salvate.')));
      }
      const deschide = () => { if (!sel) return; d.inchide('ok'); const f = db.get(sel); if (f.fisier) deschideFila(f.id); else deschideProiect(f.id); };
      const d = fereastra('Open file', h('div', { class: 'ap-cpp-open' },
        h('div', { class: 'ap-cpp-open-sus' }, h('span', {}, 'Look in:'), h('span', { class: 'ap-cpp-winp cale' }, ic('dosarDeschis'), DIR), h('span', { class: 'ap-cpp-spatiu' }),
          buton('Din calculator...', () => { d.inchide(''); fisierIn.click(); }),
          buton('Redenumește', async () => { if (sel) { await redenumeste(db.get(sel)); redaLista(); } }),
          buton('Șterge', async () => { if (sel && await stergeFisier(db.get(sel))) { sel = null; redaLista(); } })),
        h('div', { class: 'ap-cpp-open-lista' }, h('table', { class: 'ap-cpp-tabel' }, h('thead', {}, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Date modified'), h('th', {}, 'Type'))), tb)),
        h('label', { class: 'ap-cpp-camp rand' }, 'File name:', numeIn),
        h('label', { class: 'ap-cpp-camp rand' }, 'Files of type:', h('select', { class: 'ap-cpp-winp' }, h('option', {}, 'All known files'), h('option', {}, 'Code::Blocks project files (*.cbp)'), h('option', {}, 'C/C++ files (*.c;*.cpp;*.h)'))),
        h('p', { class: 'ap-cpp-mic' }, 'Programele se păstrează în acest browser, pe acest calculator. Ca să le iei cu tine, folosește File → Save file as… (descarcă .cpp).')),
      { cls: 'lat', butoane: [buton('Open', deschide, 'impl'), buton('Cancel', () => d.inchide(''))] });
      redaLista();
      tb.querySelector('tr')?.focus();
    }
    function dialogExemple() {
      const d = fereastra('Exemple din lecții', h('div', {},
        h('p', { class: 'ap-cpp-mic' }, 'Alege un program: se deschide ca proiect nou (cu datele de intrare completate, dacă are). Apoi apasă F9 – Build and run.'),
        h('div', { class: 'ap-cpp-exemple' }, EXEMPLE.map((x) => h('button', { type: 'button', class: 'ap-cpp-ex', onclick: async () => {
          d.inchide('ok');
          await creeaza(x.titlu, x.cod, x.intrare);
          toast(x.intrare ? 'Exemplul are deja date de intrare (fila Date de intrare). Apasă F9.' : 'Apasă F9 (Build and run) ca să-l rulezi.');
        } }, h('b', {}, x.titlu), h('span', {}, x.desc), h('code', {}, x.cod.split('\n').filter((l) => l.trim() && !/^#|^using|^int main|^\{|^\}/.test(l.trim())).slice(1, 4).map((l) => l.trim()).join('\n')))))), { cls: 'lat' });
    }
    async function incarcaDeLaCalculator() {
      const f = fisierIn.files[0];
      fisierIn.value = '';
      if (!f) return;
      if (f.size > 300000) { toast('Fișierul este prea mare pentru un program.', 'err'); return; }
      const text = (await f.text()).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
      await creeaza(f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Program', text);
      toast(`Am deschis „${f.name}”.`);
    }
    function descarca() {
      if (!F) return;
      scrieInF();
      const a = h('a', { href: URL.createObjectURL(new Blob([F.cod], { type: 'text/plain;charset=utf-8' })), download: F.fisier ? numeSursa(F) : numeFisier(F.titlu) });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ----- titlul ferestrei, filele, pagina de start -----
    function redaTitlu() {
      const f = activ === 'start' ? null : F;
      titluEl.textContent = f ? `${f.fisier ? numeSursa(f) : `main.cpp [${f.titlu}]`} - Code::Blocks 20.03` : 'Start here - Code::Blocks 20.03';
      stCale.textContent = f ? caleSursa(f) : '';
      stareSalv();
    }
    function redaTaburi() {
      const lista = [...(pref.start ? ['start'] : []), ...tabs];
      const numeFila = (f) => {
        const n = numeSursa(f);
        return tabs.filter((id) => db.get(id) && numeSursa(db.get(id)) === n).length > 1 && !f.fisier ? `${n} [${f.titlu}]` : n;
      };
      umple(taburi, lista.map((id) => {
        const f = id === 'start' ? null : db.get(id);
        if (id !== 'start' && !f) return null;
        const t = h('div', { class: `ap-cpp-etab${id === activ ? ' activ' : ''}`, role: 'tab', 'aria-selected': String(id === activ), tabindex: '0', title: f ? caleSursa(f) : 'Start here' },
          f ? ic('cpp') : ic('sigla'), h('span', {}, f ? `${sf(id).mod || f.nesalvat ? '*' : ''}${numeFila(f)}` : 'Start here'),
          h('button', { type: 'button', class: 'ap-cpp-etab-x', 'aria-label': 'Închide fila', title: 'Close', onclick: (e) => { e.stopPropagation(); inchideFila(id); } }, '✕'));
        t.addEventListener('click', () => { if (id !== activ) activeaza(id); });
        t.addEventListener('auxclick', (e) => { if (e.button === 1) inchideFila(id); });
        t.addEventListener('keydown', (e) => { if (e.key === 'Enter') activeaza(id); });
        t.addEventListener('contextmenu', (e) => meniuContext([{ t: 'Close', f: () => inchideFila(id) }, { t: 'Close all', f: () => { for (const x of [...tabs]) inchideFila(x); } }, { t: 'Close all others', f: () => { for (const x of [...tabs]) if (x !== id) inchideFila(x); } }, '-', { t: 'Save', f: () => salveazaExplicit(f), dis: () => !f }, { t: 'Properties...', f: () => proprietati(f), dis: () => !f }], e));
        return t;
      }));
      if (!lista.length) { pref.start = true; redaTaburi(); }
    }
    function redaStart() {
      const rec = recente().slice(0, 10);
      umple(startPag, h('div', { class: 'ap-cpp-sp' },
        h('div', { class: 'ap-cpp-sp-sigla' }, h('span', { html: ICO.sigla }), h('div', {}, h('b', {}, 'Code::Blocks'), h('span', {}, 'The open source, cross-platform IDE'))),
        h('div', { class: 'ap-cpp-sp-col' },
          h('button', { type: 'button', class: 'ap-cpp-sp-link', onclick: () => proiectNou() }, ic('proiect'), 'Create a new project'),
          h('button', { type: 'button', class: 'ap-cpp-sp-link', onclick: () => dialogDeschide() }, ic('deschide'), 'Open an existing project'),
          h('button', { type: 'button', class: 'ap-cpp-sp-link', onclick: () => dialogExemple() }, ic('exemple'), 'Exemple din lecții'),
          h('button', { type: 'button', class: 'ap-cpp-sp-link', onclick: () => dialogAjutor() }, ic('info'), 'Ajutor: cum lucrezi în acest Code::Blocks')),
        h('h3', {}, 'Recent projects / files'),
        rec.length ? h('ul', { class: 'ap-cpp-sp-rec' }, rec.map((f) => h('li', {}, h('button', { type: 'button', class: 'ap-cpp-sp-link mic', onclick: () => (f.fisier ? deschideFila(f.id) : deschideProiect(f.id)) }, f.fisier ? caleSursa(f) : `${caleProiect(f)}\\${numeProj(f)}.cbp`), h('small', {}, ` – ${f.titlu}, ${cand(f.actualizat || Date.now())}`)))) : h('p', { class: 'ap-cpp-gol' }, 'No recent projects'),
        h('p', { class: 'ap-cpp-sp-nota' }, 'Simulator Code::Blocks 20.03 pentru browser (edudigi): programele rulează într-un interpretor C++ pentru lecțiile de gimnaziu, nu cu compilatorul GCC.')));
    }
    function redaTot() { redaTitlu(); redaTaburi(); redaMgmt(); actualizeazaUnelte(); redaFunctii(); }
    function actualizeazaUnelte() {
      const fara = !F || activ === 'start';
      for (const k of ['salveaza', 'undo', 'redo', 'taie', 'copiaza', 'lipeste', 'cauta', 'inloc', 'cursor', 'next', 'into', 'instr']) B[k].disabled = fara;
      for (const k of ['build', 'run', 'buildRun', 'rebuild']) B[k].disabled = fara || !!dbg;
      B.debug.disabled = fara; B.abort.disabled = !ruleaza(); B.stop.disabled = !dbg; B.out.disabled = !dbg;
      tintaSel.value = pref.tinta;
    }
    function redaFunctii() {
      if (!F || activ === 'start') { umple(functSel); return; }
      const fn = functiiDin(ta.value), r = randCursor();
      let cur = null; for (const x of fn) if (x.rand <= r) cur = x;
      umple(functSel, fn.length ? fn.map((x) => h('option', { value: String(x.rand), selected: x === cur || null }, `${x.nume}(${x.params}) : ${x.tip}`)) : h('option', { value: '' }, ''));
      if (!cur) functSel.selectedIndex = -1;
    }

    // =====================================================================
    // EDITORUL: desenare, margine, puncte de oprire
    // =====================================================================
    let nrLinii = -1;
    const erori = () => (F ? sf(F.id).erori : new Map());
    function redaGutter() {
      if (!F || activ === 'start') return;
      const n = nrLinii;
      const bp = new Set(bps(F)), er = erori();
      const cur = dbg && dbg.id === F.id && dbg.pauza ? dbg.pauza.rand : 0;
      const o = [];
      for (let i = 1; i <= n; i++) {
        const c = `${bp.has(i) ? ' bp' : ''}${i === cur ? ' cur' : ''}${er.has(i) ? ` ${er.get(i)}` : ''}`;
        o.push(c ? `<div class="${c.trim()}">${i}</div>` : `<div>${i}</div>`);
      }
      nrRand.innerHTML = o.join('');
    }
    function redaMarcaje() {
      if (!F || activ === 'start') return;
      const benzi = [];
      const pune = (r, cls) => { const d = h('div', { class: cls }); d.style.top = `${(r - 1) * lh}px`; benzi.push(d); };
      if (pref.linieCur && document.activeElement === ta) pune(randCursor(), 'linie');
      for (const [r, cls] of erori()) pune(r, cls);
      if (dbg && dbg.id === F.id && dbg.pauza) pune(dbg.pauza.rand, 'dbg');
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
      if (!popup.hidden) pozitioneazaPopup();
    }
    const randCursor = () => ta.value.slice(0, ta.selectionStart).split('\n').length;
    let ultimRandCursor = 0;
    function pozitie() {
      if (!F || activ === 'start') { stPoz.textContent = ''; return; }
      const p = ta.selectionStart, inainte = ta.value.slice(0, p);
      const r = inainte.split('\n').length, c = p - inainte.lastIndexOf('\n');
      stPoz.textContent = `Line ${r}, Col ${c}, Pos ${p}`;
      if (r !== ultimRandCursor) { ultimRandCursor = r; redaMarcaje(); redaFunctii(); }
    }
    function arataRand(r) {
      const v = ta.scrollTop, hh = ta.clientHeight;
      const y = (r - 1) * lh;
      if (y < v || y + lh > v + hh) ta.scrollTop = Math.max(0, y - hh / 3);
      sincronizeaza();
    }
    function mergiLaRand(r, selecteaza = true) {
      if (!F || activ === 'start') return;
      const linii = ta.value.split('\n');
      r = Math.max(1, Math.min(r, linii.length));
      let p = 0; for (let i = 0; i < r - 1; i++) p += linii[i].length + 1;
      const ind = (linii[r - 1].match(/^\s*/) || [''])[0].length;
      ta.focus({ preventScroll: true });
      if (selecteaza) ta.setSelectionRange(p + ind, p + linii[r - 1].length); else ta.setSelectionRange(p + ind, p + ind);
      ta.scrollTop = Math.max(0, (r - 1) * lh - ta.clientHeight / 3);
      sincronizeaza(); pozitie();
    }
    function comutaBp(r) {
      if (!F || activ === 'start' || !r) return;
      const l = bps(F), k = l.indexOf(r);
      if (k >= 0) l.splice(k, 1); else l.push(r);
      redaGutter(); salveazaCurand(F);
      if (dbg) logDbgScrie(k >= 0 ? `Breakpoint removed: ${numeSursa(F)}:${r}` : `Breakpoint 1 at ${numeSursa(F)}, line ${r}.`);
    }
    gutter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const r = Math.floor((e.clientY - gutter.getBoundingClientRect().top - 2 + ta.scrollTop) / lh) + 1;
      if (r >= 1 && r <= nrLinii) comutaBp(r);
    });
    gutter.addEventListener('contextmenu', (e) => {
      const r = Math.floor((e.clientY - gutter.getBoundingClientRect().top - 2 + ta.scrollTop) / lh) + 1;
      meniuContext([{ t: bps(F).includes(r) ? 'Remove breakpoint' : 'Add breakpoint', f: () => comutaBp(r) }, { t: 'Remove all breakpoints', f: () => { F.bp = []; redaGutter(); salveazaCurand(F); } }], e);
    });
    // punctele de oprire și marcajele se mută odată cu rândurile când scrii
    let textVechi = '';
    function ajusteazaRanduri(vechi, nou) {
      if (!F) return;
      let a = 0; const n = Math.min(vechi.length, nou.length);
      while (a < n && vechi[a] === nou[a]) a++;
      const randSch = vechi.slice(0, a).split('\n').length;
      const delta = nou.split('\n').length - vechi.split('\n').length;
      if (!delta) return;
      const lin = (r) => (r > randSch ? r + delta : r);
      if (bps(F).length) {
        const sters = delta < 0 ? (r) => r > randSch && r <= randSch - delta : () => false;
        F.bp = [...new Set(bps(F).filter((r) => !sters(r) || r === randSch).map(lin))];
      }
    }

    // ----- tastatura în editor -----
    function insereaza(text, a = ta.selectionStart, b = ta.selectionEnd) {
      if (document.activeElement !== ta) ta.focus({ preventScroll: true });
      ta.setSelectionRange(a, b);
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch { ok = false; }
      if (!ok) { ta.setRangeText(text, a, b, 'end'); ta.dispatchEvent(new Event('input')); }
    }
    function comandaText(c) {
      if (!F || activ === 'start') return;
      ta.focus();
      let ok = false;
      try { ok = document.execCommand(c); } catch { ok = false; }
      if (!ok && (c === 'cut' || c === 'copy')) toast(`Folosește ${c === 'cut' ? 'Ctrl+X' : 'Ctrl+C'} de la tastatură.`);
    }
    async function lipeste() {
      ta.focus();
      try { const t = await navigator.clipboard.readText(); if (t) insereaza(t.replace(/\r\n?/g, '\n')); } catch { toast('Browserul nu permite lipirea din meniu: folosește Ctrl+V.'); }
    }
    const IND = '    ';
    function linii(a, b) {
      const v = ta.value;
      const s = v.lastIndexOf('\n', a - 1) + 1;
      let e = v.indexOf('\n', b > a && v[b - 1] === '\n' ? b - 1 : b); if (e < 0) e = v.length;
      return [s, e];
    }
    function modificaLinii(fn) {
      const [s, e] = linii(ta.selectionStart, ta.selectionEnd);
      const noi = fn(ta.value.slice(s, e).split('\n')).join('\n');
      insereaza(noi, s, e);
      ta.setSelectionRange(s, s + noi.length);
    }
    // Edit → Comment (Ctrl+Shift+C) pune // la începutul rândului, ca în Code::Blocks; Uncomment îl scoate
    function comenteaza(mod) {
      if (!F || activ === 'start') return;
      ta.focus();
      modificaLinii((ls) => {
        const toate = ls.filter((l) => l.trim()).every((l) => /^\s*\/\//.test(l));
        const pune = mod === true || (mod === null && !toate);
        return ls.map((l) => (pune ? (l.trim() || ls.length === 1 ? `//${l}` : l) : l.replace(/^(\s*)\/\/ ?/, '$1')));
      });
    }
    function dubleazaRand() {
      if (!F || activ === 'start') return;
      const [s, e] = linii(ta.selectionStart, ta.selectionStart);
      const p = ta.selectionStart;
      insereaza(`\n${ta.value.slice(s, e)}`, e, e);
      ta.setSelectionRange(p, p);
    }
    function indentPereche(s) {
      const v = ta.value; let k = 0;
      for (let i = s - 1; i >= 0; i--) {
        const c = v[i];
        if (c === '}') k++;
        else if (c === '{') { if (k === 0) { const ls = v.lastIndexOf('\n', i - 1) + 1; return (v.slice(ls, i).match(/^[ \t]*/) || [''])[0]; } k--; }
      }
      return '';
    }
    function indentAnterior(s) {
      const v = ta.value; let e = s - 1;
      while (e > 0) {
        const ls = v.lastIndexOf('\n', e - 1) + 1;
        const l = v.slice(ls, e);
        if (l.trim()) { const ind = (l.match(/^[ \t]*/) || [''])[0]; return /\{\s*$/.test(l) ? ind + IND : ind; }
        e = ls - 1;
      }
      return null;
    }
    ta.addEventListener('keydown', (e) => {
      if (!popup.hidden && tastaCompletare(e)) return;
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        if (ta.dataset.tabIese === '1') return;
        e.preventDefault();
        const a = ta.selectionStart, b = ta.selectionEnd;
        if (!e.shiftKey && (a === b || !ta.value.slice(a, b).includes('\n'))) { insereaza(IND); return; }
        modificaLinii((ls) => ls.map((l) => (e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : (l.trim() ? IND + l : l))));
        return;
      }
      if (e.key === 'Escape') { ta.dataset.tabIese = '1'; return; } // Esc, apoi Tab: ieși din editor cu tastatura
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const a = ta.selectionStart, v = ta.value;
        const s = v.lastIndexOf('\n', a - 1) + 1;
        const rand = v.slice(s, a);
        let ind = (rand.match(/^[ \t]*/) || [''])[0];
        const ultim = rand.trimEnd().slice(-1);
        const urm = v.slice(ta.selectionEnd).match(/^[ \t]*(.)?/);
        if (ultim === '{') {
          if (urm && urm[1] === '}') { insereaza(`\n${ind}${IND}\n${ind}`); const p = ta.selectionStart - ind.length - 1; ta.setSelectionRange(p, p); return; }
          ind += IND;
        } else if (/^\s*(if|while|for|else)\b.*\)\s*$|^\s*else\s*$/.test(rand) && ultim !== ';') ind += IND;
        insereaza(`\n${ind}`);
        return;
      }
      if ((e.key === '}' || e.key === '{') && !e.ctrlKey && !e.metaKey) {
        const a = ta.selectionStart, v = ta.value;
        const s = v.lastIndexOf('\n', a - 1) + 1;
        const rand = v.slice(s, a);
        if (/^[ \t]*$/.test(rand) && a === ta.selectionEnd) {
          const ind = e.key === '}' ? indentPereche(s) : indentAnterior(s);
          if (ind !== null && ind !== rand) { e.preventDefault(); insereaza(ind + e.key, s, a); }
        }
      }
    });
    ta.addEventListener('keyup', (e) => { if (e.key !== 'Escape' && e.key !== 'Tab') delete ta.dataset.tabIese; });
    ta.addEventListener('input', (e) => {
      const nou = ta.value;
      ajusteazaRanduri(textVechi, nou); textVechi = nou;
      if (F) {
        F.cod = nou;
        const s = sf(F.id);
        if (s.erori.size) s.erori = new Map();
        if (!s.mod) { s.mod = true; redaTaburi(); stareSalv(); }
        salveazaCurand(F);
      }
      nrLinii = -1; reda(); pozitie();
      if (!popup.hidden) completare(false);
      else if (pref.compl && e.inputType === 'insertText' && /\w/.test(e.data || '')) {
        const pref3 = ta.value.slice(0, ta.selectionStart).match(/[A-Za-z_]\w*$/);
        if (pref3 && pref3[0].length >= 3 && !/^\d/.test(pref3[0])) completare(false, true);
      }
      clearTimeout(tSim); tSim = setTimeout(() => { if (mgFila === 'Symbols') redaMgmt(); redaFunctii(); }, 600);
    });
    let tSim = null;
    ta.addEventListener('scroll', sincronizeaza);
    for (const ev of ['keyup', 'click', 'select']) ta.addEventListener(ev, pozitie);
    ta.addEventListener('focus', () => { ultimRandCursor = 0; pozitie(); });
    ta.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== ta) { redaMarcaje(); if (!popup.contains(document.activeElement)) inchideCompletare(); } }, 150); });
    ta.addEventListener('contextmenu', (e) => {
      const r = randCursor();
      meniuContext([
        { t: 'Undo', k: 'Ctrl+Z', ic: 'anuleaza', f: () => comandaText('undo') }, { t: 'Redo', k: 'Ctrl+Shift+Z', ic: 'refa', f: () => comandaText('redo') }, '-',
        { t: 'Cut', k: 'Ctrl+X', ic: 'taie', f: () => comandaText('cut') }, { t: 'Copy', k: 'Ctrl+C', ic: 'copiaza', f: () => comandaText('copy') }, { t: 'Paste', k: 'Ctrl+V', ic: 'lipeste', f: () => lipeste() }, '-',
        { t: 'Select all', k: 'Ctrl+A', f: () => { ta.focus(); ta.select(); } }, '-',
        { t: bps(F).includes(r) ? 'Remove breakpoint' : 'Add breakpoint', k: 'F5', f: () => comutaBp(r) }, { t: 'Run to cursor', k: 'F4', ic: 'laCursor', f: () => depaneaza('cursor') }, '-',
        { t: 'Comment', k: 'Ctrl+Shift+C', f: () => comenteaza(true) }, { t: 'Uncomment', k: 'Ctrl+Shift+X', f: () => comenteaza(false) }, '-',
        { t: 'Format use AStyle', f: () => formateaza() }, { t: 'Swap header/source', dis: () => true },
      ], e);
    });
    intrareTa.addEventListener('input', laIntrare);
    function laIntrare() { if (F) { F.intrare = intrareTa.value; salveazaCurand(F); } }

    // ----- completarea automată (Ctrl+Space) -----
    const CUVINTE = ['include', 'iostream', 'cmath', 'iomanip', 'using', 'namespace', 'std', 'int', 'long', 'short', 'unsigned', 'float', 'double', 'char', 'bool', 'void', 'const', 'if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue', 'return', 'true', 'false', 'main',
      'cout', 'cin', 'endl', 'fixed', 'setprecision', 'setw', 'setfill', 'sqrt', 'pow', 'abs', 'fabs', 'floor', 'ceil', 'round', 'max', 'min', 'swap', 'INT_MAX', 'INT_MIN', 'LLONG_MAX', 'static_cast'];
    const CUV_K = new Set([...KW, 'include', 'namespace', 'std']);
    let compl = { lista: [], i: 0, start: 0 };
    function completare(fortat, auto = false) {
      if (!F || activ === 'start') return;
      const p = ta.selectionStart;
      const m = ta.value.slice(0, p).match(/[A-Za-z_]\w*$/);
      const pref0 = m ? m[0] : '';
      if (!pref0 && !fortat) { inchideCompletare(); return; }
      const ids = new Set(CUVINTE);
      for (const w of ta.value.match(/[A-Za-z_]\w*/g) || []) ids.add(w);
      const fn = new Set(functiiDin(ta.value).map((x) => x.nume).concat(['sqrt', 'pow', 'abs', 'fabs', 'floor', 'ceil', 'round', 'max', 'min', 'swap', 'setprecision', 'setw', 'setfill', 'main']));
      const mic = pref0.toLowerCase();
      const lista = [...ids].filter((w) => w.toLowerCase().startsWith(mic) && w !== pref0)
        .sort((a, b) => (b.startsWith(pref0) - a.startsWith(pref0)) || a.localeCompare(b)).slice(0, 60);
      if (!lista.length) { inchideCompletare(); if (fortat) stareStatus('Code completion: nu am găsit nimic potrivit.'); return; }
      if (auto && lista.length === 0) return;
      compl = { lista: lista.map((w) => ({ w, tip: CUV_K.has(w) ? 'cuvant' : fn.has(w) ? 'functie' : 'variabila' })), i: 0, start: p - pref0.length };
      redaCompletare();
    }
    function redaCompletare() {
      umple(popup, compl.lista.map((x, i) => {
        const r = h('div', { class: `ap-cpp-compl-it${i === compl.i ? ' sel' : ''}`, role: 'option', 'aria-selected': String(i === compl.i) }, ic(x.tip), x.w);
        r.addEventListener('mousedown', (e) => { e.preventDefault(); compl.i = i; accepta(); });
        return r;
      }));
      popup.hidden = false;
      pozitioneazaPopup();
      popup.children[compl.i]?.scrollIntoView({ block: 'nearest' });
    }
    function pozitioneazaPopup() {
      const v = ta.value.slice(0, compl.start);
      const r = v.split('\n').length - 1;
      const col = v.slice(v.lastIndexOf('\n') + 1).replace(/\t/g, '    ').length;
      const cs = getComputedStyle(ta);
      let x = parseFloat(cs.paddingLeft) + col * cw - ta.scrollLeft - 22;
      let y = parseFloat(cs.paddingTop) + (r + 1) * lh - ta.scrollTop + 2;
      const W = strat.clientWidth, Hh = strat.clientHeight;
      x = Math.max(0, Math.min(x, W - popup.offsetWidth - 4));
      if (y + popup.offsetHeight > Hh && y - lh - popup.offsetHeight - 4 > 0) y = y - lh - popup.offsetHeight - 4;
      popup.style.left = `${x}px`; popup.style.top = `${y}px`;
    }
    function inchideCompletare() { popup.hidden = true; }
    function accepta() {
      const x = compl.lista[compl.i]; if (!x) return;
      const p = ta.selectionStart;
      let e = p; while (/\w/.test(ta.value[e] || '')) e++;
      inchideCompletare();
      insereaza(x.w, compl.start, e);
      ta.focus();
    }
    function tastaCompletare(e) {
      const n = compl.lista.length;
      if (e.key === 'ArrowDown') compl.i = (compl.i + 1) % n;
      else if (e.key === 'ArrowUp') compl.i = (compl.i + n - 1) % n;
      else if (e.key === 'PageDown') compl.i = Math.min(n - 1, compl.i + 8);
      else if (e.key === 'PageUp') compl.i = Math.max(0, compl.i - 8);
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); accepta(); return true; }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); inchideCompletare(); return true; }
      else return false;
      e.preventDefault(); redaCompletare(); return true;
    }

    // ----- Search: Find / Replace / Goto line -----
    let cautare = { text: '', caz: false, cuvant: false, inapoi: false };
    function gasesteToate(text, o = cautare) {
      if (!text) return [];
      const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(o.cuvant ? `\\b${esc}\\b` : esc, o.caz ? 'g' : 'gi');
      const rez = []; let m;
      while ((m = re.exec(ta.value))) { rez.push([m.index, m.index + m[0].length]); if (!m[0].length) re.lastIndex++; }
      return rez;
    }
    async function cautaUrmator(dir = 1) {
      if (!F || activ === 'start') return;
      if (!cautare.text) { dialogCauta(false); return; }
      const toate = gasesteToate(cautare.text);
      if (!toate.length) { await intreaba('Information', `Not found: ${cautare.text}`, ['OK']); return; }
      const p = dir > 0 ? ta.selectionEnd : ta.selectionStart;
      let g = dir > 0 ? toate.find(([a]) => a >= p) : [...toate].reverse().find(([, b]) => b <= p);
      if (!g) { g = dir > 0 ? toate[0] : toate[toate.length - 1]; stareStatus(dir > 0 ? 'Căutarea a ajuns la sfârșit și a reluat de la început.' : 'Căutarea a reluat de la sfârșit.'); }
      ta.focus({ preventScroll: true }); ta.setSelectionRange(g[0], g[1]);
      arataRand(ta.value.slice(0, g[0]).split('\n').length); pozitie();
    }
    function dialogCauta(inlocuire) {
      if (!F || activ === 'start') return;
      const selText = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      const txt = h('input', { type: 'text', class: 'ap-cpp-winp', value: selText && !selText.includes('\n') ? selText : cautare.text, spellcheck: 'false' });
      const cu = h('input', { type: 'text', class: 'ap-cpp-winp', spellcheck: 'false' });
      const chk = (et, k) => { const c = h('input', { type: 'checkbox', checked: cautare[k] || null }); c.addEventListener('change', () => { cautare[k] = c.checked; }); return h('label', { class: 'ap-cpp-chk' }, c, ` ${et}`); };
      const dirF = h('input', { type: 'radio', name: 'dir', checked: !cautare.inapoi || null }), dirB = h('input', { type: 'radio', name: 'dir', checked: cautare.inapoi || null });
      const ok = async () => {
        cautare.text = txt.value; cautare.inapoi = dirB.checked;
        if (!cautare.text) return;
        listeazaRezultate();
        d.inchide('ok'); await cautaUrmator(cautare.inapoi ? -1 : 1);
      };
      const inlocToate = async () => {
        cautare.text = txt.value; if (!cautare.text) return;
        const toate = gasesteToate(cautare.text);
        d.inchide('ok');
        if (!toate.length) { await intreaba('Information', `Not found: ${cautare.text}`, ['OK']); return; }
        let v = ta.value, o = '', k = 0;
        for (const [a, b] of toate) { o += v.slice(k, a) + cu.value; k = b; }
        o += v.slice(k);
        insereaza(o, 0, v.length); ta.setSelectionRange(0, 0);
        await intreaba('Information', `Replaced ${toate.length} occurrence(s) of "${cautare.text}".`, ['OK']);
      };
      const d = fereastra(inlocuire ? 'Replace text' : 'Find text', h('div', { class: 'ap-cpp-form' },
        h('label', { class: 'ap-cpp-camp' }, 'Text to search for:', txt),
        inlocuire ? h('label', { class: 'ap-cpp-camp' }, 'Replace with:', cu) : null,
        h('fieldset', { class: 'ap-cpp-fs' }, h('legend', {}, 'Options'), chk('Whole word', 'cuvant'), chk('Match case', 'caz')),
        inlocuire ? null : h('fieldset', { class: 'ap-cpp-fs' }, h('legend', {}, 'Direction'), h('label', { class: 'ap-cpp-chk' }, dirF, ' Forward'), h('label', { class: 'ap-cpp-chk' }, dirB, ' Backward'))),
      { cls: 'mic', butoane: inlocuire ? [buton('Replace all', inlocToate, 'impl'), buton('Find next', ok), buton('Cancel', () => d.inchide(''))] : [buton('OK', ok, 'impl'), buton('Cancel', () => d.inchide(''))] });
      txt.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); (inlocuire ? inlocToate : ok)(); } });
      txt.focus(); txt.select();
    }
    function listeazaRezultate() {
      const toate = gasesteToate(cautare.text);
      const linii0 = ta.value.split('\n');
      const randuri = [...new Set(toate.map(([a]) => ta.value.slice(0, a).split('\n').length))];
      umple(logCautare, h('table', { class: 'ap-cpp-mesaje' }, h('thead', {}, h('tr', {}, h('th', {}, 'File'), h('th', {}, 'Line'), h('th', {}, 'Text'))),
        h('tbody', {}, h('tr', { class: 'info' }, h('td', { colspan: '3' }, `Searching for "${cautare.text}" in ${caleSursa(F)}: ${toate.length} match(es)`)),
          randuri.map((r) => { const tr = h('tr', { tabindex: '0' }, h('td', {}, caleSursa(F)), h('td', {}, String(r)), h('td', {}, linii0[r - 1].trim())); tr.addEventListener('click', () => mergiLaRand(r)); return tr; }))));
    }
    function dialogRand() {
      if (!F || activ === 'start') return;
      cereText('Goto line', `Line (1 - ${nrLinii}):`, String(randCursor()), (v) => (!/^\d+$/.test(v) || +v < 1 ? 'Scrie un număr de rând.' : null)).then((v) => { if (v) mergiLaRand(+v, false); });
    }
    function dialogFunctie() {
      if (!F || activ === 'start') return;
      const fn = functiiDin(ta.value);
      const d = fereastra('Select function...', h('div', { class: 'ap-cpp-lista mare' }, fn.map((x) => h('div', { tabindex: '0', onclick: () => { d.inchide('ok'); mergiLaRand(x.rand, false); } }, ic('functie'), ` ${x.nume}(${x.params}) : ${x.tip}`))), { cls: 'mic' });
    }

    // ----- Plugins, Settings, Help -----
    function formateaza() {
      if (!F || activ === 'start') return;
      const v = ta.value, nou = astyle(v);
      if (nou === v) { stareStatus('AStyle: codul era deja formatat.'); return; }
      const r = randCursor();
      insereaza(nou, 0, v.length);
      mergiLaRand(Math.min(r, nou.split('\n').length), false);
      stareStatus('Source code formatter (AStyle): codul a fost aliniat.', 'ok');
    }
    function statistici() {
      const l = ta.value.split('\n');
      const com = l.filter((x) => /^\s*(\/\/|\/\*|\*)/.test(x)).length, gol = l.filter((x) => !x.trim()).length;
      fereastra('Code statistics', h('table', { class: 'ap-cpp-prop' }, h('tr', {}, h('th', {}, 'File:'), h('td', {}, caleSursa(F))),
        h('tr', {}, h('th', {}, 'Total lines:'), h('td', {}, String(l.length))), h('tr', {}, h('th', {}, 'Code lines:'), h('td', {}, String(l.length - com - gol))),
        h('tr', {}, h('th', {}, 'Comment lines:'), h('td', {}, String(com))), h('tr', {}, h('th', {}, 'Empty lines:'), h('td', {}, String(gol)))), { cls: 'mic', butoane: [buton('OK', () => app.querySelector('dialog[open]')?.close(), 'impl')] });
    }
    function setariEditor() {
      const fs = h('input', { type: 'number', class: 'ap-cpp-winp scurt', min: '10', max: '26', value: String(pref.fs) });
      const c1 = h('input', { type: 'checkbox', checked: pref.linieCur || null }), c2 = h('input', { type: 'checkbox', checked: pref.compl || null });
      const d = fereastra('Configure editor', h('div', { class: 'ap-cpp-form' },
        h('fieldset', { class: 'ap-cpp-fs' }, h('legend', {}, 'Font'), h('label', { class: 'ap-cpp-camp rand' }, 'Size:', fs)),
        h('fieldset', { class: 'ap-cpp-fs' }, h('legend', {}, 'Other options'), h('label', { class: 'ap-cpp-chk' }, c1, ' Highlight caret line'), h('label', { class: 'ap-cpp-chk' }, c2, ' Code completion: automatically launch after typing 3 letters'))),
      { cls: 'mic', butoane: [buton('OK', () => { pref.linieCur = c1.checked; pref.compl = c2.checked; const v = +fs.value; if (v >= 10 && v <= 26) pref.fs = v; zoom(null); d.inchide('ok'); }, 'impl'), buton('Cancel', () => d.inchide(''))] });
    }
    function setariCompilator() {
      fereastra('Global compiler settings', h('div', { class: 'ap-cpp-form' },
        h('label', { class: 'ap-cpp-camp' }, 'Selected compiler:', h('select', { class: 'ap-cpp-winp' }, h('option', {}, 'GNU GCC Compiler'))),
        h('fieldset', { class: 'ap-cpp-fs' }, h('legend', {}, 'Compiler flags'),
          ...[['Enable all common compiler warnings (overrides many other settings) [-Wall]', true], ['Have g++ follow the C++11 ISO C++ language standard [-std=c++11]', false], ['Optimize even more (for speed) [-O2]', false], ['Produce debugging symbols [-g]', true]].map(([t, c]) => h('label', { class: 'ap-cpp-chk' }, h('input', { type: 'checkbox', checked: c || null, disabled: true }), ` ${t}`))),
        h('p', { class: 'ap-cpp-mic' }, 'În simulator, setările compilatorului sunt fixe: programele rulează într-un interpretor pentru C++ de gimnaziu.')),
      { butoane: [buton('OK', () => app.querySelector('dialog[open]')?.close(), 'impl')] });
    }
    function despre() {
      fereastra('About', h('div', { class: 'ap-cpp-despre' }, h('span', { html: ICO.sigla }), h('div', {}, h('h3', {}, 'Code::Blocks'), h('p', {}, 'Version 20.03 – simulator pentru browser'),
        h('p', {}, 'Acest program imită interfața mediului de dezvoltare Code::Blocks (codeblocks.org), ca să exersezi la ora de informatică pe orice calculator, inclusiv pe Chromebook. Nu este programul original: codul C++ rulează într-un interpretor scris pentru lecțiile de gimnaziu (iostream, cmath, iomanip, tablouri, funcții).'),
        h('p', { class: 'ap-cpp-mic' }, 'edudigi · lucrările se păstrează în acest browser.'))), { cls: 'mic', butoane: [buton('OK', () => app.querySelector('dialog[open]')?.close(), 'impl')] });
    }
    function dialogAjutor(doarTaste = false) {
      const li = (...c) => h('li', {}, ...c);
      const taste = h('table', { class: 'ap-cpp-prop taste' }, [
        ['F9', 'Build and run – compilează și rulează'], ['Ctrl+F9', 'Build – doar compilează'], ['Ctrl+F10', 'Run – rulează ultimul executabil'], ['Ctrl+F11', 'Rebuild'],
        ['F5', 'Toggle breakpoint – punct de oprire'], ['F8', 'Start / Continue depanatorul'], ['F7', 'Next line'], ['Shift+F7', 'Step into'], ['Ctrl+Shift+F7', 'Step out'], ['F4', 'Run to cursor'], ['Ctrl+F7', 'Continue'], ['Shift+F8', 'Stop debugger'],
        ['Ctrl+Space', 'Completare automată'], ['Ctrl+Shift+C / Ctrl+Shift+X', 'Comment / Uncomment'], ['Ctrl+/', 'Comentează sau decomentează'], ['Ctrl+F / Ctrl+R', 'Find / Replace'], ['F3', 'Find next'], ['Ctrl+G', 'Goto line'], ['Ctrl+D', 'Duplicate line'],
        ['Ctrl+S', 'Save file'], ['Ctrl+Shift+S', 'Save all files'], ['Ctrl+O', 'Open'], ['Ctrl+Shift+N', 'Empty file'], ['F2 / Shift+F2', 'Logs / Manager'], ['Ctrl+Enter', 'Build and run (pentru tastaturi fără F9)'],
      ].map(([a, b]) => h('tr', {}, h('th', {}, a), h('td', {}, b))));
      if (doarTaste) { fereastra('Scurtături de la tastatură', taste, { butoane: [buton('OK', () => app.querySelector('dialog[open]')?.close(), 'impl')] }); return; }
      fereastra('Ajutor – Code::Blocks în browser', h('div', { class: 'ap-cpp-ajutor' },
        h('p', {}, 'Lucrezi ca în Code::Blocks: ', h('b', {}, 'File → New → Project… → Console application'), ', apoi deschizi ', h('b', {}, 'Sources → main.cpp'), ' în panoul Management și apeși ', h('b', {}, 'Build and run'), ' (', h('kbd', {}, 'F9'), '). Programul pornește într-o ', h('b', {}, 'consolă'), ' neagră, separată.'),
        h('h3', {}, 'Erori'),
        h('ul', {}, li('Dacă ai greșit, apar în fila ', h('b', {}, 'Build messages'), ' (jos) rândurile cu ', h('b', {}, 'error'), ': dă clic pe ele ca să ajungi la rândul greșit (uită-te și la rândul de deasupra).'),
          li('Avertismentele (', h('b', {}, 'warning'), ') nu opresc programul, dar citește-le!')),
        h('h3', {}, 'Datele de intrare (cin >>)'),
        h('ul', {}, li('Le scrii direct în consolă când programul le cere, apoi apeși Enter.'), li('Sau le scrii dinainte în fila ', h('b', {}, 'Date de intrare'), ' din panoul de jos (ajutor edudigi).')),
        h('h3', {}, 'Depanatorul (Debug)'),
        h('ul', {}, li('Clic în marginea cu numere (sau ', h('kbd', {}, 'F5'), ') pune un ', h('b', {}, 'punct de oprire'), ' roșu.'),
          li(h('kbd', {}, 'F8'), ' pornește depanarea: programul se oprește la punctul de oprire; săgeata galbenă arată rândul care urmează.'),
          li(h('kbd', {}, 'F7'), ' – rândul următor, ', h('kbd', {}, 'Shift'), '+', h('kbd', {}, 'F7'), ' – intri în funcție, ', h('kbd', {}, 'F4'), ' – rulează până la cursor. În fereastra ', h('b', {}, 'Watches'), ' vezi valorile variabilelor (cele schimbate apar cu roșu).')),
        h('h3', {}, 'Ce cunoaște compilatorul simulat'),
        h('ul', {}, li('#include <iostream>, <cmath>, <iomanip>, <climits>, <algorithm>, using namespace std;, int main()'),
          li('int, long long, unsigned, float, double, char, bool, const; tablouri cu una sau două dimensiuni'),
          li('if / else, switch, while, do … while, for, break, continue, ?:; funcții scrise de tine (prin valoare sau prin referință &)'),
          li('cout cu endl, setprecision, fixed, setw; sqrt, pow, abs, fabs, floor, ceil, round, max, min, swap')),
        h('h3', {}, 'Scurtături'), taste,
        h('p', { class: 'ap-cpp-mic' }, 'Un program care repetă de prea multe ori (peste 5 milioane de pași sau 3 secunde) este oprit, ca să nu se blocheze calculatorul. Ca în Code::Blocks, îl poți opri și tu cu Ctrl+C în consolă sau cu butonul Abort.')), { cls: 'lat', butoane: [buton('OK', () => app.querySelector('dialog[open]')?.close(), 'impl')] });
    }

    // =====================================================================
    // LOGS & OTHERS (Build log, Build messages, Debugger…)
    // =====================================================================
    const durata = (ms) => `${Math.floor(ms / 60000)} minute(s), ${Math.floor(ms / 1000) % 60} second(s)`;
    function scrieLog(el, t, cls = '') {
      el.append(h('div', { class: cls }, t || '\u00a0'));
      while (el.childElementCount > 600) el.firstElementChild.remove();
      el.scrollTop = el.scrollHeight;
    }
    const logB = (t, cls) => scrieLog(logBuild, t, cls);
    const logCbScrie = (t) => scrieLog(logCB, t);
    const logDbgScrie = (t, cls) => scrieLog(logDbg, t, cls);
    function mesaj(fis, rand, text, cls = '', idF = null) {
      const tr = h('tr', { class: cls, tabindex: rand ? '0' : null }, h('td', {}, fis), h('td', {}, rand ? String(rand) : ''), h('td', {}, text));
      if (rand) {
        const du = () => { mesajeT.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); tr.classList.add('sel'); if (idF && idF !== activ) deschideFila(idF); mergiLaRand(rand); };
        tr.addEventListener('click', du);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') du(); });
      }
      mesajeT.append(tr);
      logMesaje.scrollTop = logMesaje.scrollHeight;
    }
    // antetul funcției, ca la GCC: In function 'int suma(int, int)':
    function inFunctie(cod, rand) {
      const fn = functiiDin(cod).filter((x) => x.rand <= rand).pop();
      if (!fn) return null;
      const tipuri = fn.params && fn.params !== 'void' ? fn.params.split(',').map((p) => { const t = p.trim(); const arr = /\[/.test(t); const ref = /&/.test(t); return t.replace(/\[.*$/, '').replace(/&/, ' ').replace(/\s+[A-Za-z_]\w*\s*$/, '').trim() + (arr ? '*' : '') + (ref ? '&' : ''); }).join(', ') : '';
      return `In function '${fn.tip} ${fn.nume}(${tipuri})':`;
    }
    const pauzaScurta = (ms) => new Promise((r) => setTimeout(r, ms));
    function ruleaza() { return !!(con && !con.gata); }

    // =====================================================================
    // BUILD / RUN
    // =====================================================================
    let inBuild = false;
    async function build({ rebuild = false } = {}) {
      if (!F || activ === 'start' || inBuild) return false;
      if (dbg) { await intreaba('Information', 'Depanatorul rulează. Oprește-l întâi (Debug → Stop debugger, Shift+F8).', ['OK']); return false; }
      const f = F;
      if (!(await salveazaExplicit(f))) return false;
      if (ruleaza()) inchideConsola(true);
      inBuild = true;
      try {
        const t0 = Date.now();
        umple(logBuild); umple(mesajeT);
        sf(f.id).erori = new Map(); redaGutter(); redaMarcaje();
        arataLog('Build log');
        const proj = numeProj(f), cale = caleSursa(f), tinta = pref.tinta;
        const titluB = f.fisier ? 'Build file: "no target" in "no project" (compiler: unknown)' : `Build: ${tinta} in ${proj} (compiler: GNU GCC Compiler)`;
        if (rebuild && !f.fisier) {
          logB(`-------------- Clean: ${tinta} in ${proj} (compiler: GNU GCC Compiler)---------------`, 'cap'); logB('');
          logB(`Cleaned "${proj} - ${tinta}"`); logB('');
          exe.delete(f.id);
        }
        logB(`-------------- ${titluB}---------------`, 'cap'); logB('');
        mesaj('', '', `=== ${titluB} ===`, 'info');
        const e0 = exe.get(f.id);
        if (!rebuild && e0 && e0.cod === f.cod) {
          logB('Target is up to date.'); logB('Nothing to be done (all items are up-to-date).'); logB('');
          mesaj('', '', '=== Build finished: 0 error(s), 0 warning(s) (0 minute(s), 0 second(s)) ===', 'info');
          stareStatus('Target is up to date.');
          return true;
        }
        stareStatus('Building...'); app.classList.add('ocupat');
        await pauzaScurta(180);
        const r = CPP.verifica(f.cod);
        const flags = tinta === 'Debug' ? '-Wall -fexceptions -g' : '-Wall -fexceptions -O2';
        const obj = f.fisier ? cale.replace(/\.cpp$/, '.o') : `obj\\${tinta}\\main.o`;
        logB(f.fisier ? `mingw32-g++.exe     -c ${cale} -o ${obj}` : `mingw32-g++.exe ${flags}  -c ${cale} -o ${obj}`);
        const av = (r.avertizari || []).slice().sort((a, b) => a.rand - b.rand);
        const lista = av.map((w) => ({ ...w, tip: 'warning' }));
        if (!r.ok) lista.push({ ...r.eroare, tip: 'error' });
        lista.sort((a, b) => (a.rand || 0) - (b.rand || 0));
        let fnAnt = null;
        for (const x of lista) {
          const fn = x.rand ? inFunctie(f.cod, x.rand) : null;
          if (fn && fn !== fnAnt) { logB(`${cale}: ${fn}`); mesaj(cale, '', fn); fnAnt = fn; }
          logB(`${cale}:${x.rand || 1}: ${x.tip}: ${x.mesaj}`, x.tip === 'error' ? 'err' : 'warn');
          mesaj(cale, x.rand, `${x.tip}: ${x.mesaj}`, x.tip === 'error' ? 'err' : 'warn', f.id);
          if (x.rand) sf(f.id).erori.set(x.rand, x.tip === 'error' ? 'eroare' : (sf(f.id).erori.get(x.rand) || 'atentie'));
        }
        const dur = durata(Date.now() - t0);
        if (!r.ok) {
          logB(`Process terminated with status 1 (${dur})`, 'err');
          logB(`1 error(s), ${av.length} warning(s) (${dur})`, 'err'); logB('');
          mesaj('', '', `=== Build failed: 1 error(s), ${av.length} warning(s) (${dur}) ===`, 'err b');
          exe.delete(f.id);
          redaGutter(); redaMarcaje();
          arataLog('Build messages');
          if (r.eroare.rand) { mergiLaRand(r.eroare.rand); mesajeT.querySelector('tr.err')?.classList.add('sel'); }
          stareStatus(`Build failed: 1 error(s), ${av.length} warning(s)`, 'err');
          ultimaRulare = { text: `Eroare de compilare${r.eroare.rand ? ` – rândul ${r.eroare.rand}` : ''}: ${r.eroare.mesaj}` };
          return false;
        }
        logB(f.fisier ? `mingw32-g++.exe  -o ${caleExe(f)} ${obj}   ` : `mingw32-g++.exe  -o ${exeRel(f)} ${obj}   `);
        logB(`Output file is ${exeRel(f)} with size ${(1.4 + (f.cod.length % 97) / 100).toFixed(2)} MB`);
        logB(`Process terminated with status 0 (${dur})`);
        logB(`0 error(s), ${av.length} warning(s) (${dur})`, av.length ? 'warn' : ''); logB('');
        mesaj('', '', `=== Build finished: 0 error(s), ${av.length} warning(s) (${dur}) ===`, 'info b');
        exe.set(f.id, { cod: f.cod });
        redaGutter(); redaMarcaje();
        if (av.length) arataLog('Build messages');
        stareStatus(`Build finished: 0 error(s), ${av.length} warning(s)`, 'ok');
        return true;
      } finally { inBuild = false; app.classList.remove('ocupat'); actualizeazaUnelte(); }
    }
    function clean() {
      if (!F || activ === 'start') return;
      umple(logBuild); arataLog('Build log');
      logB(`-------------- Clean: ${pref.tinta} in ${numeProj(F)} (compiler: GNU GCC Compiler)---------------`, 'cap'); logB('');
      logB(`Cleaned "${numeProj(F)} - ${pref.tinta}"`); logB(''); logB('Done.');
      exe.delete(F.id);
    }
    function alegeTinta(t) { if (t === pref.tinta) return; pref.tinta = t; exe.clear(); salvPref(); actualizeazaUnelte(); stareStatus(`Build target: ${t}`); }
    async function run() {
      if (!F || activ === 'start' || dbg) return;
      const e = exe.get(F.id);
      if (!e) {
        const r = await intreaba('Question', 'It seems that this project has not been built yet.\nDo you want to build it now?', ['Yes', 'No', 'Cancel'], 'intrebare');
        if (r === 'Yes') await buildRun();
        return;
      }
      pornesteConsola(F, e.cod);
    }
    async function buildRun() {
      if (!F || activ === 'start' || dbg) return;
      const f = F;
      if (await build()) pornesteConsola(f, exe.get(f.id).cod);
    }
    function abort() { if (ruleaza()) { inchideConsola(true); stareStatus('Aborted.'); } }

    // =====================================================================
    // CONSOLA (fereastra neagră, separată, ca în Windows)
    // =====================================================================
    function pornesteConsola(f, cod, cuDepanare = false) {
      inchideConsola(true);
      if (!cuDepanare) {
        logB(`-------------- Run: ${pref.tinta} in ${numeProj(f)} (compiler: GNU GCC Compiler)---------------`, 'cap'); logB('');
        logB(`Checking for existence: ${caleExe(f)}`);
        logB(`Executing: "C:\\Program Files\\CodeBlocks/cb_console_runner.exe" "${caleExe(f)}"  (in ${caleProiect(f)}\\.)`);
      }
      const out = h('span', {}), err = h('span', { class: 'err' }), fin = h('span', {}), tastat = h('span', {}), cursor = h('span', { class: 'ap-cpp-con-cursor' }, '_');
      const ecran = h('pre', { class: 'ap-cpp-con-ecran' }, out, err, fin, tastat, cursor);
      const inp = h('input', { type: 'text', class: 'ap-cpp-con-inp', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Tastează în consolă (datele cerute de program), apoi Enter' });
      const titlu = h('span', { class: 'ap-cpp-con-titlu' }, caleExe(f));
      const bMax = h('button', { type: 'button', class: 'ap-cpp-con-b', title: 'Maximize', 'aria-label': 'Maximizează' }, '□');
      const bMin = h('button', { type: 'button', class: 'ap-cpp-con-b', title: 'Minimize', 'aria-label': 'Minimizează' }, '—');
      const bX = h('button', { type: 'button', class: 'ap-cpp-con-b x', title: 'Close', 'aria-label': 'Închide consola' }, '✕');
      const bara = h('div', { class: 'ap-cpp-con-bara' }, ic('consola'), titlu, bMin, bMax, bX);
      const el = h('div', { class: 'ap-cpp-con', role: 'dialog', 'aria-label': `Consola: ${caleExe(f)}` }, bara, h('div', { class: 'ap-cpp-con-corp' }, ecran, inp));
      const c = { f, cod, intrare: f.intrare || '', interactive: [], t0: Date.now(), gata: false, dbg: cuDepanare, stare: 'ruleaza', el, inp, out, err, fin, tastat, ecran, raportate: new Set(),
        avComp: new Set((CPP.verifica(cod).avertizari || []).map((w) => `${w.rand}|${w.mesaj}`)) };
      con = c;
      app.append(el);
      // poziția: peste editor, ușor deplasată (ca o fereastră nouă)
      const ra = app.getBoundingClientRect();
      // la depanare, consola e mai mică și stă jos, în dreapta, ca să se vadă săgeata galbenă din editor
      const w = cuDepanare ? Math.min(500, ra.width - 24) : Math.min(680, ra.width - 24), hh = cuDepanare ? Math.min(210, Math.round(ra.height * 0.32)) : Math.min(360, ra.height - 120);
      el.style.width = `${w}px`; el.style.height = `${hh}px`;
      el.style.left = `${cuDepanare ? Math.max(8, ra.width - w - 14) : Math.max(8, Math.min(ra.width - w - 8, (ra.width - w) / 2 + 60))}px`;
      el.style.top = `${cuDepanare ? Math.max(8, ra.height - hh - 34) : Math.max(8, Math.min(ra.height - hh - 30, 96))}px`;
      requestAnimationFrame(() => el.classList.add('vizibil'));
      // mutarea ferestrei de bara de titlu
      bara.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || el.classList.contains('max')) return;
        e.preventDefault(); bara.setPointerCapture(e.pointerId);
        const x0 = e.clientX - el.offsetLeft, y0 = e.clientY - el.offsetTop;
        const mut = (ev) => { el.style.left = `${Math.max(-el.offsetWidth + 80, Math.min(app.clientWidth - 60, ev.clientX - x0))}px`; el.style.top = `${Math.max(0, Math.min(app.clientHeight - 30, ev.clientY - y0))}px`; };
        const gata = () => { bara.removeEventListener('pointermove', mut); bara.removeEventListener('pointerup', gata); };
        bara.addEventListener('pointermove', mut); bara.addEventListener('pointerup', gata);
      });
      bara.addEventListener('dblclick', () => el.classList.toggle('max'));
      bMax.addEventListener('click', () => { el.classList.toggle('max'); focusConsola(); });
      bMin.addEventListener('click', () => { el.classList.toggle('min'); });
      bX.addEventListener('click', () => inchideConsola(true));
      el.addEventListener('pointerdown', () => { el.classList.add('activ'); });
      ecran.addEventListener('click', () => focusConsola());
      inp.addEventListener('focus', () => { c.areFocus = true; el.classList.add('focus'); });
      inp.addEventListener('blur', () => { c.areFocus = false; el.classList.remove('focus'); });
      inp.addEventListener('input', () => { if (c.stare === 'asteapta') { tastat.textContent = inp.value; ecran.scrollTop = ecran.scrollHeight; } else inp.value = ''; });
      inp.addEventListener('keydown', (e) => {
        if (/^F\d+$/.test(e.key)) return; // scurtăturile (F9, F7…) merg și din consolă
        if (c.gata) { if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) { e.preventDefault(); inchideConsola(false); } return; }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && !inp.value.slice(inp.selectionStart, inp.selectionEnd)) { e.preventDefault(); e.stopPropagation(); ctrlC(); return; }
        if (e.key === 'Enter') {
          e.preventDefault(); e.stopPropagation();
          if (c.stare !== 'asteapta') return;
          c.interactive.push(inp.value); inp.value = ''; tastat.textContent = '';
          pasConsola();
        }
        e.stopPropagation();
      });
      focusConsola();
      actualizeazaUnelte();
      if (!cuDepanare) pasConsola();
      return c;
    }
    function focusConsola() { if (con) con.inp.focus({ preventScroll: true }); }
    function scrieEcran(text, final = '', eroare = '') {
      const c = con; if (!c) return;
      c.out.textContent = text; c.err.textContent = eroare; c.fin.textContent = final;
      c.tastat.textContent = c.stare === 'asteapta' ? c.inp.value : '';
      c.ecran.scrollTop = c.ecran.scrollHeight;
    }
    function ctrlC() {
      const c = con; if (!c || c.gata) return;
      idRulare++;
      if (asteptare) { clearTimeout(asteptare.ceas); asteptare = null; }
      opresteWorker();
      c.out.textContent += `${c.inp.value}^C`;
      termina(c, -1073741510);
      if (c.dbg) { logDbgScrie('Program received signal SIGINT, Interrupt.'); incheieDepanare(); }
    }
    function inchideConsola(opreste = true) {
      const c = con; if (!c) return;
      if (!c.gata && opreste) {
        idRulare++;
        if (asteptare) { clearTimeout(asteptare.ceas); asteptare = null; }
        opresteWorker();
        logB(`Process terminated with status -1073741510 (${durata(Date.now() - c.t0)})`, 'err');
        if (ultimaRulare) ultimaRulare.text += '\n[Program oprit]';
      }
      con = null;
      c.el.classList.remove('vizibil'); c.el.classList.add('inchis');
      setTimeout(() => c.el.remove(), 120);
      if (c.dbg && dbg) { logDbgScrie('Debugger finished with status 0'); incheieDepanare(); }
      actualizeazaUnelte();
      if (activ !== 'start' && !dlgDeschise) ta.focus({ preventScroll: true });
    }
    async function pasConsola() {
      const c = con; if (!c) return;
      const id = ++idRulare;
      c.stare = 'ruleaza'; c.el.classList.remove('asteapta');
      actualizeazaUnelte();
      if (!c.dbg) stareStatus('Running...');
      const tLent = setTimeout(() => { if (id === idRulare && con === c) c.el.classList.add('ocupat'); }, 300);
      const r = await executa(c.cod, c.intrare, c.interactive, c.dbg && dbg ? dbg.cerere : null);
      clearTimeout(tLent);
      if (id !== idRulare || con !== c) return;
      c.el.classList.remove('ocupat');
      if (c.dbg) rezultatDepanare(r); else afiseazaRezultat(r);
    }
    function textDin(r) { let t = ''; for (const s of r.iesire || []) if (s.k === 'o' || s.k === 'i') t += s.s; return t; }
    function avertizariRulare(r, c) {
      for (const s of r.iesire || []) {
        if (s.k !== 'w') continue;
        const m = /^Atenție \(rândul (\d+)\): ([\s\S]*)$/.exec(s.s);
        const cheie = m ? `${m[1]}|${m[2]}` : s.s;
        if (c.avComp.has(cheie) || c.raportate.has(cheie)) continue;
        c.raportate.add(cheie);
        const rand = m ? +m[1] : null;
        mesaj(caleSursa(c.f), rand, `warning: ${m ? m[2] : s.s}`, 'warn', c.f.id);
        logB(`${caleSursa(c.f)}:${rand || 1}: warning: ${m ? m[2] : s.s}`, 'warn');
        if (rand) { const er = sf(c.f.id).erori; if (!er.has(rand)) er.set(rand, 'atentie'); }
      }
      if (c.f === F) { redaGutter(); redaMarcaje(); }
    }
    function afiseazaRezultat(r) {
      const c = con; if (!c) return;
      const text = textDin(r);
      avertizariRulare(r, c);
      if (r.stare === 'intrare') {
        c.stare = 'asteapta'; c.el.classList.add('asteapta');
        scrieEcran(text);
        ultimaRulare = { text };
        stareStatus('Programul așteaptă date: scrie-le în consolă și apasă Enter.');
        focusConsola();
        actualizeazaUnelte();
        return;
      }
      if (r.stare === 'compilare') { // nu ar trebui (s-a făcut Build), dar oricum
        scrieEcran(text, '', `\nEroare: ${r.eroare.mesaj}\n`);
        termina(c, 1, ''); return;
      }
      let cod = 0, eroare = '';
      if (r.stare === 'eroare') {
        const e = r.eroare;
        cod = /împărțire la zero|restul împărțirii/.test(e.mesaj) ? -1073741676 : /prea multe apeluri/.test(e.mesaj) ? -1073741571 : /oprit/.test(e.mesaj) ? -1073741510 : -1073741819;
        eroare = `\n*** Eroare la rulare${e.rand ? ` (rândul ${e.rand})` : ''}: ${e.mesaj}\n`;
        if (e.rand) { sf(c.f.id).erori.set(e.rand, 'eroare'); if (c.f === F) { redaGutter(); redaMarcaje(); } }
        mesaj(caleSursa(c.f), e.rand, `Eroare la rulare: ${e.mesaj}`, 'err', c.f.id);
        logB(`${caleSursa(c.f)}:${e.rand || 1}: Eroare la rulare: ${e.mesaj}`, 'err');
        arataLog('Build messages');
        ultimaRulare = { text: `${text}\n[Eroare la rulare${e.rand ? ` – rândul ${e.rand}` : ''}: ${e.mesaj}]` };
        stareStatus('Programul s-a oprit cu o eroare la rulare.', 'err');
      } else {
        cod = typeof r.cod === 'bigint' ? Number(BigInt.asIntN(32, r.cod)) : Number(r.cod) | 0;
        if (r.intrareInsuf) { mesaj('', '', 'warning: programul a încercat să citească mai multe date decât ai scris în fila „Date de intrare” (variabilele necitite au primit 0).', 'warn'); arataLog('Build messages'); }
        ultimaRulare = { text };
        stareStatus(`Process returned ${cod}`, cod ? '' : 'ok');
      }
      scrieEcran(text, '', eroare);
      termina(c, cod, eroare);
    }
    function termina(c, cod) {
      const sec = ((Date.now() - c.t0) / 1000).toFixed(3);
      c.gata = true; c.stare = 'gata'; c.el.classList.remove('asteapta', 'ocupat'); c.el.classList.add('gata');
      c.fin.textContent = `\nProcess returned ${cod} (0x${(cod >>> 0).toString(16).toUpperCase()})   execution time : ${sec} s\nPress any key to continue.\n`;
      c.tastat.textContent = '';
      c.ecran.scrollTop = c.ecran.scrollHeight;
      logB(`Process terminated with status ${cod} (${durata(Date.now() - c.t0)})`, cod ? 'err' : '');
      logB('');
      actualizeazaUnelte();
      focusConsola();
    }

    // =====================================================================
    // DEPANATORUL (Debug): puncte de oprire, pas cu pas, Watches
    // =====================================================================
    async function depaneaza(mod) {
      if (!F || activ === 'start') return;
      if (con && (con.stare === 'ruleaza' || inBuild) && dbg) return;
      if (!dbg) {
        if (mod === 'out') return;
        if (F.fisier) { await intreaba('Information', 'Depanatorul funcționează doar pentru programele create ca proiect (File → New → Project → Console application), ca în Code::Blocks.\nCreează un proiect și copiază codul în main.cpp.', ['OK']); return; }
        const f = F;
        if (ruleaza()) inchideConsola(true);
        if (!(await build())) return;
        dbg = { id: f.id, f, cod: exe.get(f.id).cod, pauza: null, ant: null, cerere: null, pid: 1000 + Math.floor(Math.random() * 9000) };
        umple(logDbg); arataLog('Debugger');
        logDbgScrie('Building to ensure sources are up-to-date');
        logDbgScrie(`Selecting target: ${pref.tinta}`);
        logDbgScrie(`Adding source dir: ${caleProiect(f)}\\`);
        logDbgScrie(`Changing directory to: ${caleProiect(f)}/.`);
        logDbgScrie(`Starting debugger: C:\\Program Files\\CodeBlocks\\MINGW\\bin\\gdb.exe -nx -fullname -quiet  -args ${exeRel(f)}`);
        logDbgScrie('done');
        logDbgScrie('Setting breakpoints');
        logDbgScrie('Debugger name and version: GNU gdb (GDB) 8.1');
        if (pref.tinta === 'Release') logDbgScrie('Atenție: ținta Release nu are informații de depanare (-g); în simulator depanatorul merge oricum.', 'warn');
        for (const b of bps(f).slice().sort((a, b2) => a - b2)) logDbgScrie(`Breakpoint ${bps(f).indexOf(b) + 1} at ${numeSursa(f)}: line ${b}.`);
        logDbgScrie(`Child process PID: ${dbg.pid}`);
        arataWatches(true);
        pornesteConsola(f, dbg.cod, true);
        dbg.cerere = { mod, dupa: 0, ad: 0, rand: 0, linie: mod === 'cursor' ? randCursor() : 0, bp: bps(f).slice() };
      } else {
        if (con && con.stare === 'asteapta') { toast('Programul așteaptă date: scrie-le în consolă și apasă Enter.'); focusConsola(); return; }
        const p = dbg.pauza;
        if (!con) { opresteDepanarea(); return; }
        dbg.cerere = { mod, dupa: p ? p.ev : 0, ad: p ? p.ad : 0, rand: p ? p.rand : 0, linie: mod === 'cursor' && activ === dbg.id ? randCursor() : 0, bp: bps(dbg.f).slice() };
        dbg.ant = p; dbg.pauza = null;
        redaGutter(); redaMarcaje();
        if (mod === 'bp') logDbgScrie('Continuing...');
      }
      stareStatus('Debugger running...');
      actualizeazaUnelte();
      await pasConsola();
    }
    function rezultatDepanare(r) {
      const c = con; if (!c || !dbg) return;
      const text = textDin(r);
      avertizariRulare(r, c);
      if (r.stare === 'intrare') {
        c.stare = 'asteapta'; c.el.classList.add('asteapta');
        scrieEcran(text);
        stareStatus('Programul așteaptă date: scrie-le în consolă și apasă Enter.');
        redaWatches(); focusConsola(); actualizeazaUnelte();
        return;
      }
      if (r.stare === 'pauza') {
        c.stare = 'pauza';
        dbg.pauza = r.pauza;
        scrieEcran(text);
        if (activ !== dbg.id) deschideFila(dbg.id);
        redaGutter(); redaMarcaje(); arataRand(r.pauza.rand);
        logDbgScrie(`At ${caleSursa(dbg.f)}:${r.pauza.rand}`);
        redaWatches();
        stareStatus(`Debugger: oprit la rândul ${r.pauza.rand} (F7 – rândul următor, F8 – continuă)`);
        actualizeazaUnelte();
        ta.focus({ preventScroll: true });
        return;
      }
      afiseazaRezultat(r);
      if (r.stare === 'eroare') logDbgScrie(/zero/.test(r.eroare?.mesaj || '') ? 'Program received signal SIGFPE, Arithmetic exception.' : 'Program received signal SIGSEGV, Segmentation fault.', 'err');
      else { const cod = Number(r.cod) | 0; logDbgScrie(`[Inferior 1 (process ${dbg.pid}) exited ${cod ? `with code ${String(cod >>> 0).padStart(2, '0')}` : 'normally'}]`); }
      logDbgScrie('Debugger finished with status 0');
      incheieDepanare();
    }
    function incheieDepanare() {
      if (!dbg) return;
      dbg = null;
      redaGutter(); redaMarcaje(); redaWatches(); actualizeazaUnelte();
      stareStatus('Debugger finished.');
    }
    function opresteDepanarea() {
      if (!dbg) return;
      const c = con;
      if (c && c.dbg) inchideConsola(true); else { logDbgScrie('Debugger finished with status 0'); incheieDepanare(); }
    }
    function arataWatches(da) { watches.hidden = !da; aplicaAspect(); redaWatches(); sincronizeaza(); }
    function listaBp() {
      const toate = [...db.values()].flatMap((f) => bps(f).map((r) => ({ f, r })));
      const d = fereastra('Breakpoints', toate.length ? h('table', { class: 'ap-cpp-tabel' }, h('thead', {}, h('tr', {}, h('th', {}, 'Type'), h('th', {}, 'Filename/Address'), h('th', {}, 'Line'))),
        h('tbody', {}, toate.map(({ f, r }) => { const tr = h('tr', { tabindex: '0' }, h('td', {}, 'Code'), h('td', {}, caleSursa(f)), h('td', {}, String(r))); tr.addEventListener('dblclick', () => { d.inchide('ok'); deschideFila(f.id); mergiLaRand(r, false); }); return tr; })))
        : h('p', { class: 'ap-cpp-gol' }, 'Nu ai niciun punct de oprire. Clic în marginea cu numerele rândurilor sau F5.'), { cls: 'mic', butoane: [buton('Remove all', () => { for (const f of db.values()) if (f.bp?.length) { f.bp = []; salveazaInreg(f); } redaGutter(); d.inchide('ok'); }), buton('Close', () => d.inchide(''), 'impl')] });
    }

    // ----- fereastra Watches -----
    const extinse = new Set(['g:arg', 'g:local', 'g:global']);
    const tabStr = (v, dims, k0 = 0, nr = null) => {
      const n = nr ?? dims[dims.length - 1];
      const el = v.slice(k0, k0 + Math.min(n, 10));
      return `{${el.join(', ')}${n > 10 ? '...' : ''}}`;
    };
    function valoareTablou(v) {
      if (!v.tab) return v.val;
      if (v.dims.length === 1) return tabStr(v.tab, v.dims);
      const [n, mm] = v.dims; const rs = [];
      for (let i = 0; i < Math.min(n, 4); i++) rs.push(tabStr(v.tab, v.dims, i * mm, mm));
      return `{${rs.join(', ')}${n > 4 ? '...' : ''}}`;
    }
    function evalWatch(expr, vars) {
      const toks = expr.match(/[A-Za-z_]\w*|\d+(?:\.\d+)?|\S/g) || [];
      let p = 0;
      const gaseste = (n) => { for (let i = vars.length - 1; i >= 0; i--) if (vars[i].nume === n) return vars[i]; return null; };
      const numar = (s) => { if (s === 'true') return 1; if (s === 'false') return 0; if (s === '?') throw 'variabila nu are încă o valoare'; return parseFloat(s); };
      function element(x) {
        const v = x.v;
        if (!x.idx.length) { if (v.tab) throw `${v.nume} este un tablou: scrie ${v.nume}[i]`; return { num: numar(v.val), real: /double|float/.test(v.tip) }; }
        if (!v.tab) throw `${v.nume} nu este un tablou`;
        if (x.idx.length !== v.dims.length) throw `scrie toți indicii: ${v.nume}${'[i]'.repeat(v.dims.length)}`;
        let k = 0; x.idx.forEach((i, j) => { if (i < 0 || i >= v.dims[j]) throw `Cannot access memory: indicele ${i} este în afara tabloului`; k = k * v.dims[j] + i; });
        if (k >= v.tab.length) throw 'tablou prea mare pentru afișare';
        return { num: numar(v.tab[k]), real: /double|float/.test(v.tip) };
      }
      const val = (x) => (x.v ? element(x) : x);
      function prim() {
        const t = toks[p++];
        if (t === undefined) throw 'expresie incompletă';
        if (t === '(') { const v = sum(); if (toks[p++] !== ')') throw "lipsește ')'"; return v; }
        if (t === '-') { const v = val(prim()); return { num: -v.num, real: v.real }; }
        if (/^\d/.test(t)) return { num: parseFloat(t), real: t.includes('.') };
        if (/^[A-Za-z_]/.test(t)) {
          const v = gaseste(t); if (!v) throw `No symbol "${t}" in current context.`;
          const x = { v, idx: [] };
          while (toks[p] === '[') { p++; const i = val(sum()); if (toks[p++] !== ']') throw "lipsește ']'"; x.idx.push(Math.trunc(i.num)); }
          return x;
        }
        throw `A syntax error in expression, near \`${toks.slice(p - 1).join('')}'.`;
      }
      function mul() {
        let a = prim();
        while (['*', '/', '%'].includes(toks[p])) {
          const o = toks[p++]; const x = val(a), y = val(prim()); const real = x.real || y.real;
          if ((o === '/' || o === '%') && y.num === 0) throw 'Division by zero';
          a = { num: o === '*' ? x.num * y.num : o === '/' ? (real ? x.num / y.num : Math.trunc(x.num / y.num)) : x.num % y.num, real };
        }
        return a;
      }
      function sum() {
        let a = mul();
        while (['+', '-'].includes(toks[p])) { const o = toks[p++]; const x = val(a), y = val(mul()); a = { num: o === '+' ? x.num + y.num : x.num - y.num, real: x.real || y.real }; }
        return a;
      }
      try {
        const r = sum();
        if (p < toks.length) throw `A syntax error in expression, near \`${toks.slice(p).join('')}'.`;
        if (r.v) {
          const v = r.v;
          if (!v.tab) return { val: v.val, tip: v.tip };
          const baza = v.tip.replace(/\s*\[.*$/, '');
          if (r.idx.length === v.dims.length) { element(r); let k = 0; r.idx.forEach((i, j) => { k = k * v.dims[j] + i; }); return { val: v.tab[k], tip: baza }; }
          if (!r.idx.length) return { val: valoareTablou(v), tip: v.tip, v };
          const i = r.idx[0]; if (i < 0 || i >= v.dims[0]) throw `Cannot access memory: indicele ${i} este în afara tabloului`;
          return { val: tabStr(v.tab, v.dims, i * v.dims[1], v.dims[1]), tip: `${baza} [${v.dims[1]}]` };
        }
        return { val: r.real ? String(r.num) : String(Math.trunc(r.num)), tip: r.real ? 'double' : 'int' };
      } catch (e) { return { val: typeof e === 'string' ? e : 'eroare', tip: '', err: true }; }
    }
    function redaWatches() {
      if (watches.hidden) return;
      const randuri = [];
      const rand = (nivel, cheie, nume, val, tip, { schimbat = false, copii = null, cls = '', laSterge = null } = {}) => {
        const desc = extinse.has(cheie);
        const r = h('div', { class: `ap-cpp-w-rand ${cls}${schimbat ? ' sch' : ''}`, tabindex: '0', title: `${nume} = ${val}` },
          h('span', { class: 'ap-cpp-w-n' }, h('span', { class: `ap-cpp-semn${copii ? (desc ? ' minus' : ' plus') : ''}` }), nume),
          h('span', { class: 'ap-cpp-w-v' }, val), h('span', { class: 'ap-cpp-w-t' }, tip));
        r.firstChild.style.paddingLeft = `${4 + nivel * 13}px`;
        if (copii) r.addEventListener('click', () => { if (desc) extinse.delete(cheie); else extinse.add(cheie); redaWatches(); });
        if (laSterge) {
          r.addEventListener('keydown', (e) => { if (e.key === 'Delete') laSterge(); });
          r.addEventListener('contextmenu', (e) => meniuContext([{ t: 'Delete watch', f: laSterge }, { t: 'Delete all watches', f: () => { pref.watches = []; salvPref(); redaWatches(); } }], e));
        }
        randuri.push(r);
        if (copii && desc) copii();
      };
      const p = dbg?.pauza;
      const ant = dbg?.ant ? new Map(dbg.ant.vars.map((v) => [`${v.grup}:${v.nume}`, v])) : new Map();
      const tablou = (nivel, cheie, v, va) => {
        if (v.dims.length === 1) {
          for (let i = 0; i < Math.min(v.dims[0], v.tab.length); i++) rand(nivel, `${cheie}[${i}]`, `[${i}]`, v.tab[i], '', { schimbat: !!va?.tab && va.tab[i] !== v.tab[i] });
        } else {
          const [n, mm] = v.dims;
          for (let i = 0; i < n && i * mm < v.tab.length; i++) {
            const sch = !!va?.tab && v.tab.slice(i * mm, (i + 1) * mm).some((x, j) => va.tab[i * mm + j] !== x);
            rand(nivel, `${cheie}[${i}]`, `[${i}]`, tabStr(v.tab, v.dims, i * mm, mm), '', { schimbat: sch, copii: () => { for (let j = 0; j < mm && i * mm + j < v.tab.length; j++) rand(nivel + 2, `${cheie}[${i}][${j}]`, `[${j}]`, v.tab[i * mm + j], '', { schimbat: !!va?.tab && va.tab[i * mm + j] !== v.tab[i * mm + j] }); } });
          }
        }
      };
      if (p) {
        for (const [g, nume] of [['arg', 'Function arguments'], ['local', 'Locals'], ['global', 'Globals']]) {
          const vs = p.vars.filter((v) => v.grup === g);
          if (!vs.length && g !== 'local') continue;
          rand(0, `g:${g}`, nume, '', '', { cls: 'grup', copii: () => {
            if (!vs.length) rand(1, `g:${g}:gol`, 'No locals.', '', '', { cls: 'gri' });
            for (const v of vs) {
              const va = ant.get(`${v.grup}:${v.nume}`);
              const sch = !!va && (v.tab ? (va.tab || []).join() !== v.tab.join() : va.val !== v.val);
              rand(1, `${g}:${v.nume}`, v.nume, valoareTablou(v), v.tip, { schimbat: sch, copii: v.tab ? () => tablou(2, `${g}:${v.nume}`, v, va) : null });
            }
          } });
        }
      } else rand(0, 'g:x', dbg ? 'Programul rulează…' : 'Pornește depanatorul (F8 sau F7) ca să vezi valorile.', '', '', { cls: 'gri' });
      pref.watches.forEach((w, k) => {
        const r = p ? evalWatch(w, p.vars) : { val: '', tip: '' };
        const ra = dbg?.ant && p ? evalWatch(w, dbg.ant.vars) : null;
        const sterge = () => { pref.watches.splice(k, 1); salvPref(); redaWatches(); };
        rand(0, `u:${w}`, w, r.val, r.tip, { cls: r.err ? 'err' : 'user', schimbat: !!ra && !ra.err && ra.val !== r.val, laSterge: sterge, copii: r.v ? () => tablou(1, `u:${w}`, r.v, null) : null });
      });
      const nou = h('input', { type: 'text', class: 'ap-cpp-w-nou', placeholder: 'Adaugă watch (ex.: s, v[i], a+b)…', spellcheck: 'false', 'aria-label': 'Adaugă o expresie în Watches' });
      nou.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && nou.value.trim()) { pref.watches.push(nou.value.trim().slice(0, 60)); salvPref(); redaWatches(); watchCorp.querySelector('.ap-cpp-w-nou')?.focus(); } });
      umple(watchCorp, randuri, nou);
      // Call stack
      umple(stivaCorp, p ? h('table', { class: 'ap-cpp-tabel mic' }, h('thead', {}, h('tr', {}, h('th', {}, 'Nr'), h('th', {}, 'Function'), h('th', {}, 'File'), h('th', {}, 'Line'))),
        h('tbody', {}, p.stiva.map((s, i) => { const tr = h('tr', { tabindex: '0', class: i === 0 ? 'sel' : '' }, h('td', {}, String(i)), h('td', {}, `${s.nume}()`), h('td', {}, caleSursa(dbg.f)), h('td', {}, String(s.rand))); tr.addEventListener('click', () => mergiLaRand(s.rand, false)); return tr; })))
        : h('p', { class: 'ap-cpp-gol' }, ''));
    }

    // =====================================================================
    // SCURTĂTURILE DE LA TASTATURĂ (ca în Code::Blocks)
    // =====================================================================
    const TASTE = {
      '-F9': () => buildRun(), 'C-Enter': () => buildRun(), 'C-F9': () => build(), 'CS-F9': () => build(), 'C-F10': () => run(), 'C-F11': () => build({ rebuild: true }),
      '-F8': () => depaneaza('bp'), 'C-F7': () => depaneaza('bp'), 'S-F8': () => opresteDepanarea(), '-F4': () => depaneaza('cursor'), '-F7': () => depaneaza('next'), 'S-F7': () => depaneaza('into'), 'CS-F7': () => depaneaza('out'), 'A-F7': () => depaneaza('next'),
      '-F5': () => comutaBp(randCursor()),
      'C-s': () => salveazaExplicit().then((ok) => ok && stareStatus('Saved.', 'ok')), 'CS-s': () => salveazaTot(), 'C-o': () => dialogDeschide(), 'CS-n': () => fisierGol(),
      'C-f': () => dialogCauta(false), '-F3': () => cautaUrmator(1), 'S-F3': () => cautaUrmator(-1), 'C-r': () => dialogCauta(true), 'C-g': () => dialogRand(), 'CS-g': () => dialogFunctie(),
      'CS-c': () => comenteaza(true), 'CS-x': () => comenteaza(false), 'C-/': () => comenteaza(null), 'C-d': () => dubleazaRand(), 'C- ': () => completare(true),
      '-F2': () => comuta('logs'), 'S-F2': () => comuta('mgmt'), 'C-=': () => zoom(1), 'C-+': () => zoom(1), 'CS-+': () => zoom(1), 'CS-=': () => zoom(1), 'C--': () => zoom(-1), 'C-0': () => zoom(0),
    };
    const EDITOR = new Set(['CS-c', 'CS-x', 'C-/', 'C-d', 'C- ', 'C-f', 'C-r', 'C-g', 'CS-g', '-F3', 'S-F3']);
    function laTasta(e) {
      if (!app.isConnected) { document.removeEventListener('keydown', laTasta, true); return; }
      if (e.defaultPrevented || dlgDeschise || e.target.closest?.('dialog') || e.target.closest?.('.ap-cpp-dd')) return;
      if (e.key === 'Escape' && meniuDeschis) { inchideMeniuri(); return; }
      const ctrl = e.ctrlKey || e.metaKey;
      const k = `${ctrl ? 'C' : ''}${e.shiftKey ? 'S' : ''}${e.altKey ? 'A' : ''}-${e.key.length === 1 ? e.key.toLowerCase() : e.key}`;
      const f = TASTE[k];
      if (!f) return;
      if (e.target.closest?.('.ap-cpp-con') && !/F\d/.test(e.key)) return;
      if (EDITOR.has(k) && e.target !== ta && e.target !== document.body && !app.contains(e.target)) return;
      if (EDITOR.has(k) && (e.target === intrareTa || e.target.classList?.contains('ap-cpp-w-nou'))) return;
      e.preventDefault(); e.stopPropagation();
      inchideMeniuri();
      f();
    }
    document.addEventListener('keydown', laTasta, true); // faza de captură: merg și din casete, ca în Code::Blocks
    app.addEventListener('click', (e) => { if (con && !e.target.closest('.ap-cpp-con')) con.el.classList.remove('activ'); });

    // ----- la ieșirea din aplicație -----
    const laIesire = () => { if (tSalv && F) { clearTimeout(tSalv); tSalv = null; scrieInF(); F.actualizat = Date.now(); salveazaInreg(F); } };
    window.addEventListener('hashchange', function x() { laIesire(); idRulare++; if (asteptare) { clearTimeout(asteptare.ceas); asteptare = null; } opresteWorker(); window.removeEventListener('hashchange', x); });
    window.addEventListener('beforeunload', laIesire);

    // ----- pornire -----
    aplicaAspect();
    zoom(null);
    arataLog('Build log');
    logCbScrie('Code::Blocks 20.03 – simulator edudigi');
    logCbScrie(`Using ${DIR} as workspace folder`);
    for (const id of pref.ws) { const f = db.get(id); if (f) logCbScrie(`Opening ${caleProiect(f)}\\${numeProj(f)}.cbp`); }
    logCbScrie('Done.');
    textVechi = F.cod || '';
    activeaza(curId);
    textVechi = ta.value;
    if (F.nou) { const poz = SABLON.indexOf('    \n') + 4; ta.setSelectionRange(poz, poz); sf(F.id).mod = false; }
    ta.focus({ preventScroll: true });
    pozitie();
    if (!pref.logH) { logs.style.height = `${Math.max(110, Math.min(190, Math.round(app.clientHeight * 0.26)))}px`; }
  } });
})();

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
        p++;
        return { k: 'bloc', inst, rand: t.rand };
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

    function compileaza(src) {
      const includes = [];
      const toks = lexeaza(src, new Map(), includes);
      for (const inc of includes) if (!BIBLIOTECI.has(inc.nume)) err(inc.rand, `biblioteca <${inc.nume}> nu este disponibilă în acest editor (poți folosi iostream, cmath, iomanip, climits, algorithm)`);
      const are = (...b) => includes.some((i) => b.includes(i.nume) || i.nume === 'bits/stdc++.h');
      const prog = parseaza(toks);

      // starea de rulare (comună tuturor funcțiilor compilate)
      const R = { pasi: 0, start: 0, iesire: [], lungIesire: 0, avert: new Set(), adancime: 0, ret: undefined,
        st: { prec: 6, mod: '', latime: 0, umplere: ' ', stanga: false, boolalpha: false },
        in: '', poz: 0, fail: false, interactiv: false, linii: [], ecou: 0 };
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
          def.corp(nf);
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
            const c = conditie(s.c);
            inBucla++; domenii.push(new Map()); const corp = instr(s.corp); domenii.pop(); inBucla--;
            const r = s.rand;
            if (s.k === 'while') return (f) => { while (c(f)) { pas(r); const k = corp(f); if (k === 1) break; if (k === 3) return 3; } return 0; };
            return (f) => { do { pas(r); const k = corp(f); if (k === 1) break; if (k === 3) return 3; } while (c(f)); return 0; };
          }
          case 'for': {
            domenii.push(new Map());
            const init = s.init ? instr(s.init) : null;
            if (s.c && s.c.k === 'atr' && s.c.op === '=') avertizareCompilare(s.rand, 'în condiția lui for ai scris = (atribuire). Pentru comparare se folosește == sau <=');
            if (s.gol) avertizareCompilare(s.rand, 'după for (...) ai pus ; – instrucțiunea de după se execută o singură dată, după terminarea buclei');
            const c = s.c ? conditie(s.c) : () => true;
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
          const sym = { k: 'var', tip: p.tip, cnst: p.cnst, ref: p.ref && !p.dims.length, rand: p.rand, slot: fc.sloturi++ };
          if (p.dims.length) { sym.dims = p.dims; if (p.dims.length > 2) err(p.rand, 'cel mult 2 dimensiuni'); }
          declara(p.nume, sym);
        }
        const corp = instr(s.corp);
        domenii.pop();
        s.def.sloturi = fc.sloturi; s.def.corp = corp;
        fc = null;
      }
      for (const s of domenii[0].values()) if (s.k === 'functie' && !s.def.corp && s.nume !== 'main') err(s.rand, `funcția ${s.nume} este declarată, dar nu are corp { ... }`);
      const main = domenii[0].get('main');
      if (!main || main.k !== 'functie' || !main.def.corp) err(1, includes.length || prog.usingStd ? 'programul nu are funcția principală: scrie int main() { ... }' : 'programul trebuie să înceapă cu #include <iostream>, using namespace std; și int main() { ... }');
      if (main.params.length) err(main.rand, 'în acest editor funcția main se scrie fără parametri: int main()');

      // ----- rularea -----
      function ruleaza(intrare, interactive = []) {
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
        for (const w of avertComp) R.iesire.push({ k: 'w', s: `Atenție (rândul ${w.rand}): ${w.mesaj}`, rand: w.rand });
        let stare = 'gata', cod = 0, eroare = null;
        try {
          for (const g of initGlobale) g(null);
          const f = new Array(main.def.sloturi);
          main.def.corp(f);
          if (R.ret !== undefined) cod = R.ret;
        } catch (e) {
          if (e instanceof CereIntrare) stare = 'intrare';
          else if (e instanceof EroareRulare) { stare = 'eroare'; eroare = { rand: e.rand, mesaj: e.message }; }
          else if (e instanceof RangeError && /call stack/i.test(e.message)) { stare = 'eroare'; eroare = { rand: null, mesaj: 'prea multe apeluri de funcție unul în altul: probabil o funcție se apelează pe ea însăși fără să se oprească' }; }
          else throw e;
        }
        let intrareInsuf = false;
        if (stare === 'gata' && R.fail && !R.interactiv) intrareInsuf = true;
        return { stare, cod, eroare, iesire: R.iesire, timp: Date.now() - R.start, pasi: R.pasi, intrareInsuf };
      }
      return { ruleaza, avertizari: avertComp };
    }

    // compilează și rulează; întoarce un rezultat simplu (folosit de worker, de interfață și de teste)
    function executa(cod, intrare = '', interactive = []) {
      let prog;
      try { prog = compileaza(cod); } catch (e) {
        if (e instanceof EroareCompilare) return { stare: 'compilare', eroare: { rand: e.rand, mesaj: e.message }, iesire: [] };
        return { stare: 'compilare', eroare: { rand: null, mesaj: `eroare internă a editorului: ${e.message}` }, iesire: [] };
      }
      try { return prog.ruleaza(intrare, interactive); } catch (e) {
        return { stare: 'eroare', eroare: { rand: null, mesaj: `eroare internă a editorului: ${e.message}` }, iesire: [] };
      }
    }
    const textIesire = (r) => r.iesire.filter((s) => s.k === 'o' || s.k === 'i').map((s) => s.s).join('');
    return { executa, textIesire, formatReal, lexeaza };
  })();

  // Același fișier, încărcat ca Web Worker (fără window) sau în Node (pentru teste).
  if (typeof window === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) module.exports = CPP;
    else if (typeof self !== 'undefined') self.onmessage = (e) => { const d = e.data || {}; self.postMessage({ id: d.id, rez: CPP.executa(String(d.cod || ''), String(d.intrare || ''), Array.isArray(d.interactive) ? d.interactive.map(String) : []) }); };
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

  // ---------- Colorarea sintaxei ----------
  const KW = new Set(['if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue', 'return', 'using', 'namespace', 'true', 'false', 'const', 'static', 'static_cast', 'sizeof', 'struct', 'class', 'new', 'delete', 'goto']);
  const TIPURI = new Set(['int', 'long', 'short', 'unsigned', 'signed', 'float', 'double', 'char', 'bool', 'void', 'auto', 'string']);
  const STD = new Set(['cout', 'cin', 'endl', 'std', 'fixed', 'scientific', 'setprecision', 'setw', 'setfill', 'left', 'right', 'main', 'sqrt', 'pow', 'abs', 'fabs', 'floor', 'ceil', 'round', 'max', 'min', 'swap', 'INT_MAX', 'INT_MIN']);
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
        const l = src.slice(i, j), m = /^(#\s*\w+)(\s*)(<[^>]*>?|"[^"]*"?)?(.*)$/.exec(l);
        o += m ? sp('pp', m[1]) + m[2] + (m[3] ? sp('inc', m[3]) : '') + esc(m[4]) : sp('pp', l);
        i = j; continue;
      }
      inceputRand = false;
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
        if (src[j] === c) j++;
        o += sp('s', src.slice(i, j)); i = j; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = /^(0[xX][0-9a-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?|\d+\.)[uUlLfF]*/.exec(src.slice(i, i + 40));
        o += sp('n', m[0]); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1; while (j < n && /\w/.test(src[j])) j++;
        const w = src.slice(i, j);
        let k = j; while (src[k] === ' ') k++;
        if (KW.has(w)) o += sp('k', w);
        else if (TIPURI.has(w)) o += sp('t', w);
        else if (STD.has(w)) o += sp('b', w);
        else if (src[k] === '(') o += sp('f', w);
        else o += esc(w);
        i = j; continue;
      }
      o += esc(c); i++;
    }
    return `${o}\n`;
  }

  // ---------- Rularea: într-un Web Worker (același fișier), cu rezervă pe firul principal ----------
  const SCRIPT = document.currentScript?.src || '/js/aplicatii/cpp.js';
  let worker = null, cerere = 0, asteptare = null;
  function porneste() {
    if (worker) return worker;
    try {
      worker = new Worker(SCRIPT);
      worker.onmessage = (e) => { if (asteptare && e.data.id === asteptare.id) { const a = asteptare; asteptare = null; clearTimeout(a.ceas); a.res(e.data.rez); } };
      worker.onerror = () => { worker = false; if (asteptare) { const a = asteptare; asteptare = null; clearTimeout(a.ceas); a.res(CPP.executa(a.cod, a.intrare, a.interactive)); } };
    } catch { worker = false; }
    return worker;
  }
  function opresteWorker() { if (worker) worker.terminate(); worker = null; }
  function executa(cod, intrare, interactive) {
    const w = porneste();
    if (!w) return new Promise((res) => setTimeout(() => res(CPP.executa(cod, intrare, interactive)), 20));
    return new Promise((res) => {
      const id = ++cerere;
      // paznic: dacă programul nu se oprește singur (de ex. calcule foarte lungi), oprim worker-ul
      const ceas = setTimeout(() => { if (asteptare?.id === id) { asteptare = null; opresteWorker(); res({ stare: 'eroare', eroare: { rand: null, mesaj: 'programul a fost oprit pentru că rula de prea mult timp (probabil o buclă infinită)' }, iesire: [] }); } }, 9000);
      asteptare = { id, res, ceas, cod, intrare, interactive };
      w.postMessage({ id, cod, intrare, interactive });
    });
  }

  // ---------- Iconițe ----------
  const SV = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICO = {
    nou: SV('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>'),
    fisiere: SV('<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>'),
    exemple: SV('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 8h6"/>'),
    incarca: SV('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
    descarca: SV('<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>'),
    ruleaza: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
    opreste: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    sterge: SV('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    ajutor: SV('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>'),
  };
  const ic = (k) => h('span', { class: 'ap-cpp-ic', html: ICO[k] });

  // ---------- Pagina aplicației ----------
  routes.push({ pattern: /^\/aplicatii\/cpp$/, handler: async (m, params) => {
    const pref = lsCiteste(LS_PREF, { fs: 15 });
    let F = null; // fișierul deschis
    let tSalv = null, ultimaRulare = null, ruleaza = false, asteaptaDate = false, liniiConsola = [], idRulare = 0;

    // fișierul curent (sau unul nou)
    async function incarcaInitial() {
      try {
        const id = lsCiteste(LS_CURENT, null);
        if (id) F = await store.get(id);
        if (!F) { const toate = await store.toate(); F = toate.sort((a, b) => b.actualizat - a.actualizat)[0] || null; }
      } catch { F = null; }
      if (!F) F = { id: idNou(), titlu: 'Primul meu program', cod: SABLON, intrare: '', creat: Date.now(), actualizat: Date.now(), nou: true };
    }
    await incarcaInitial();

    // ----- elemente -----
    const numeIn = h('input', { class: 'ap-cpp-nume', type: 'text', maxlength: '60', 'aria-label': 'Numele programului', spellcheck: 'false' });
    const salvEl = h('span', { class: 'ap-cpp-salv', role: 'status' });
    const btnRun = h('button', { type: 'button', class: 'ap-cpp-run', title: 'Compilează și rulează programul (F9)', onclick: () => ruleazaProgram() }, ic('ruleaza'), h('span', { class: 'lung' }, 'Compilează și rulează'), h('kbd', {}, 'F9'));
    const btnStop = h('button', { type: 'button', class: 'ap-cpp-stop', title: 'Oprește programul', hidden: true, onclick: () => opresteRularea() }, ic('opreste'), h('span', { class: 'lung' }, 'Oprește'));
    const unealta = (k, text, titlu, fn) => h('button', { type: 'button', class: 'ap-cpp-u', title: titlu, onclick: fn }, ic(k), h('span', { class: 'lung' }, text));
    const fisierIn = h('input', { type: 'file', accept: '.cpp,.cc,.c,.h,.txt,text/plain', hidden: true, onchange: () => incarcaDeLaCalculator() });
    const bara = h('div', { class: 'ap-cpp-bara' },
      h('a', { class: 'ap-cpp-inapoi', href: '#/aplicatii' }, '← Aplicații'),
      h('span', { class: 'ap-cpp-sigla', 'aria-hidden': 'true' }, 'C++'),
      h('b', { class: 'ap-cpp-numeapp' }, 'Editor C++'),
      numeIn, salvEl, h('span', { class: 'ap-cpp-spatiu' }), btnStop, btnRun);
    const unelte = h('div', { class: 'ap-cpp-unelte', role: 'toolbar', 'aria-label': 'Unelte' },
      unealta('nou', 'Nou', 'Program nou', () => fisierNou()),
      unealta('fisiere', 'Fișierele mele', 'Programele salvate în acest browser', () => dialogFisiere()),
      unealta('exemple', 'Exemple', 'Programe din lecții', () => dialogExemple()),
      h('span', { class: 'ap-cpp-sep' }),
      unealta('incarca', 'Deschide .cpp', 'Deschide un fișier .cpp de pe calculator', () => fisierIn.click()),
      unealta('descarca', 'Descarcă .cpp', 'Descarcă programul ca fișier .cpp (se deschide și în Code::Blocks)', () => descarca()),
      h('span', { class: 'ap-cpp-spatiu' }),
      unealta('ajutor', 'Ajutor', 'Ce știe editorul și scurtături', () => dialogAjutor()), fisierIn);

    // editorul de cod: textarea transparentă peste un <pre> colorat
    const ta = h('textarea', { class: 'ap-cpp-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'Codul programului C++' });
    const codEl = h('code', {});
    const marcaj = h('div', { class: 'ap-cpp-marcaj', 'aria-hidden': 'true' });
    const pre = h('pre', { class: 'ap-cpp-pre', 'aria-hidden': 'true' }, marcaj, codEl);
    const nrRand = h('div', { class: 'ap-cpp-nr' });
    const gutter = h('div', { class: 'ap-cpp-gutter', 'aria-hidden': 'true' }, nrRand);
    const editor = h('div', { class: 'ap-cpp-editor' }, gutter, h('div', { class: 'ap-cpp-strat' }, pre, ta));

    const intrareTa = h('textarea', { class: 'ap-cpp-intrare', spellcheck: 'false', wrap: 'off', placeholder: 'Scrie aici datele pe care le citește cin >>, separate prin spații sau pe rânduri (de ex. 5 3).\nDacă lași caseta goală, le scrii în consolă când programul le cere.', 'aria-label': 'Date de intrare' });
    const consola = h('div', { class: 'ap-cpp-consola', role: 'log', 'aria-live': 'polite', 'aria-label': 'Ieșirea programului', tabindex: '0' });
    const colDr = h('div', { class: 'ap-cpp-dr' },
      h('div', { class: 'ap-cpp-cap' }, h('b', {}, 'Date de intrare'), h('span', { class: 'ap-cpp-spatiu' }),
        h('button', { type: 'button', class: 'ap-cpp-mic', title: 'Golește datele de intrare', onclick: () => { intrareTa.value = ''; laSchimbare(); intrareTa.focus(); } }, 'Golește')),
      intrareTa,
      h('div', { class: 'ap-cpp-cap' }, h('b', {}, 'Ieșire'), h('span', { class: 'ap-cpp-spatiu' }),
        h('button', { type: 'button', class: 'ap-cpp-mic', title: 'Șterge ce este în consolă', onclick: () => { umple(consola); consolaGoala(); } }, ic('sterge'), 'Șterge')),
      consola);
    const colSt = h('div', { class: 'ap-cpp-st' }, editor);
    const corp = h('div', { class: 'ap-cpp-corp' }, colSt, colDr);

    const stPoz = h('span', {});
    const stMesaj = h('span', { class: 'ap-cpp-stmesaj' });
    const status = h('div', { class: 'ap-cpp-status' }, stPoz, stMesaj, h('span', { class: 'ap-cpp-spatiu' }),
      h('span', { class: 'muted' }, 'Mărime text:'),
      h('button', { type: 'button', class: 'ap-cpp-mic', 'aria-label': 'Micșorează textul', onclick: () => zoom(-1) }, 'A−'),
      h('button', { type: 'button', class: 'ap-cpp-mic', 'aria-label': 'Mărește textul', onclick: () => zoom(1) }, 'A+'));
    const app = h('div', { class: 'ap-cpp' }, bara, unelte, corp, status);

    // bara pentru predarea la sarcină
    if (params?.get('sarcina') && window.EduSarcini?.bara) {
      try {
        const b = await window.EduSarcini.bara('cpp', async () => lucrare());
        if (b instanceof Node) bara.after(b);
      } catch { /* fără bară */ }
    }
    show(h('div', { class: 'lab-ecran' }, app));
    document.title = 'Editor C++ – edudigi';

    function lucrare() {
      return { titlu: F.titlu, tip: 'cod', limbaj: 'cpp', date: ta.value, intrare: intrareTa.value, iesire: ultimaRulare ? ultimaRulare.text : '' };
    }

    // ----- mesaje și dialoguri -----
    function toast(text, tip = '') {
      const t = h('div', { class: `ap-cpp-toast ${tip}`, role: 'status' }, text);
      app.append(t);
      setTimeout(() => t.classList.add('gone'), 2600);
      setTimeout(() => t.remove(), 3200);
    }
    function dialog(titlu, continut, cls = '') {
      const d = h('dialog', { class: `ap-cpp-dlg ${cls}` },
        h('div', { class: 'ap-cpp-dlgcap' }, h('h2', {}, titlu), h('button', { type: 'button', class: 'ap-cpp-mic', 'aria-label': 'Închide', onclick: () => d.close() }, '✕')),
        continut);
      d.addEventListener('close', () => { d.remove(); ta.focus(); });
      app.append(d);
      d.showModal();
      return d;
    }

    // ----- salvare -----
    function stareSalv(t, e = false) { salvEl.textContent = t; salvEl.classList.toggle('err', e); }
    async function salveaza() {
      clearTimeout(tSalv); tSalv = null;
      F.cod = ta.value; F.intrare = intrareTa.value; F.actualizat = Date.now();
      delete F.nou;
      try { await store.put(F); lsScrie(LS_CURENT, F.id); stareSalv('Salvat'); } catch { stareSalv('Nesalvat!', true); }
    }
    function laSchimbare() { stareSalv('Se salvează…'); clearTimeout(tSalv); tSalv = setTimeout(salveaza, 700); }
    const laIesire = () => { if (tSalv) salveaza(); };
    window.addEventListener('hashchange', function x() { laIesire(); window.removeEventListener('hashchange', x); });
    window.addEventListener('beforeunload', laIesire);

    async function deschide(f) {
      if (tSalv) await salveaza();
      F = f;
      lsScrie(LS_CURENT, F.id);
      numeIn.value = F.titlu;
      ta.value = F.cod || '';
      intrareTa.value = F.intrare || '';
      ultimaRulare = null;
      liniiConsola = [];
      stergeMarcaje();
      umple(consola); consolaGoala();
      reda();
      ta.setSelectionRange(0, 0); ta.scrollTop = 0; ta.scrollLeft = 0;
      sincronizeaza();
      stareSalv(F.nou ? '' : 'Salvat');
    }
    async function numeLiber(baza) {
      const toate = (await store.toate().catch(() => [])).map((f) => f.titlu);
      if (!toate.includes(baza)) return baza;
      let i = 2; while (toate.includes(`${baza} ${i}`)) i++;
      return `${baza} ${i}`;
    }
    async function creeaza(titlu, cod, intrare = '') {
      if (tSalv) await salveaza();
      const f = { id: idNou(), titlu: await numeLiber(titlu), cod, intrare, creat: Date.now(), actualizat: Date.now() };
      try { await store.put(f); } catch { toast('Nu am putut salva: spațiul din browser este plin.', 'err'); }
      await deschide(f);
      return f;
    }
    async function fisierNou() {
      await creeaza('Program nou', SABLON);
      const poz = SABLON.indexOf('    \n') + 4;
      ta.focus(); ta.setSelectionRange(poz, poz); pozitie();
    }

    async function dialogFisiere() {
      const lista = h('ul', { class: 'ap-cpp-fisiere' });
      async function redaLista() {
        const toate = (await store.toate().catch(() => [])).sort((a, b) => b.actualizat - a.actualizat);
        if (!toate.some((x) => x.id === F.id)) toate.unshift(F);
        umple(lista, toate.map((f) => h('li', { class: f.id === F.id ? 'activ' : '' },
          h('button', { type: 'button', class: 'ap-cpp-item', onclick: async () => { d.close(); if (f.id !== F.id) await deschide(f); } },
            h('span', { class: 'ap-cpp-tipf' }, 'C++'), h('span', { class: 'n' }, f.titlu, h('small', {}, f.id === F.id ? 'deschis acum' : cand(f.actualizat)))),
          h('button', { type: 'button', class: 'ap-cpp-mic', title: 'Redenumește', onclick: async () => {
            const t = prompt('Numele nou:', f.titlu);
            if (!t || !t.trim()) return;
            f.titlu = t.trim().slice(0, 60);
            if (f.id === F.id) { F.titlu = f.titlu; numeIn.value = F.titlu; await salveaza(); } else await store.put(f);
            redaLista();
          } }, 'Redenumește'),
          h('button', { type: 'button', class: 'ap-cpp-mic', title: 'Șterge', onclick: async () => {
            if (!confirm(`Ștergi programul „${f.titlu}”? Nu poate fi recuperat.`)) return;
            await store.del(f.id);
            if (f.id === F.id) {
              const rest = (await store.toate().catch(() => [])).sort((a, b) => b.actualizat - a.actualizat);
              if (rest.length) await deschide(rest[0]); else { F = { id: idNou(), titlu: 'Program nou', cod: SABLON, intrare: '', creat: Date.now(), actualizat: Date.now(), nou: true }; await deschide(F); }
            }
            redaLista();
          } }, ic('sterge')))));
      }
      const d = dialog('Fișierele mele', h('div', {},
        h('p', { class: 'muted' }, 'Programele se păstrează în acest browser, pe acest calculator. Ca să le iei cu tine, folosește „Descarcă .cpp”.'),
        lista,
        h('div', { class: 'ap-cpp-dlgbtn' }, h('button', { type: 'button', class: 'btn small', onclick: () => { d.close(); fisierNou(); } }, '+ Program nou'))));
      await redaLista();
    }

    function dialogExemple() {
      const d = dialog('Exemple din lecții', h('div', {},
        h('p', { class: 'muted' }, 'Alege un program: se deschide ca fișier nou, cu datele de intrare completate. Apoi apasă F9.'),
        h('div', { class: 'ap-cpp-exemple' }, EXEMPLE.map((x) => h('button', { type: 'button', class: 'ap-cpp-ex', onclick: async () => {
          d.close();
          await creeaza(x.titlu, x.cod, x.intrare);
          toast(x.intrare ? 'Exemplul are deja date de intrare. Apasă F9 ca să-l rulezi.' : 'Apasă F9 ca să-l rulezi.');
        } }, h('b', {}, x.titlu), h('span', {}, x.desc), h('code', {}, x.cod.split('\n').filter((l) => l.trim() && !/^#|^using|^int main|^\{|^\}/.test(l.trim())).slice(1, 4).map((l) => l.trim()).join('\n')))))), 'lat');
      return d;
    }

    function dialogAjutor() {
      const li = (...c) => h('li', {}, ...c);
      dialog('Cum folosești editorul', h('div', { class: 'ap-cpp-ajutor' },
        h('p', {}, 'Scrii programul în stânga, apeși ', h('b', {}, 'Compilează și rulează'), ' (sau ', h('kbd', {}, 'F9'), '), iar rezultatul apare în ', h('b', {}, 'Ieșire'), '. Erorile apar cu roșu, cu numărul rândului: dă clic pe ele ca să ajungi la rândul greșit.'),
        h('h3', {}, 'Datele de intrare (cin >>)'),
        h('ul', {}, li('Scrie-le în caseta ', h('b', {}, 'Date de intrare'), ', separate prin spații sau pe rânduri.'),
          li('Sau las-o goală: când programul ajunge la cin >>, scrii valoarea direct în consolă și apeși Enter, ca în Code::Blocks.')),
        h('h3', {}, 'Ce cunoaște editorul'),
        h('ul', {}, li('#include <iostream>, <cmath>, <iomanip>, using namespace std;, int main()'),
          li('tipurile int, long long, unsigned, float, double, char, bool, const; tablouri cu una sau două dimensiuni'),
          li('if / else, switch, while, do … while, for, break, continue, operatorul ?:'),
          li('cout cu endl, setprecision, fixed, setw; funcțiile sqrt, pow, abs, fabs, floor, ceil, round, max, min, swap'),
          li('funcții scrise de tine, cu parametri prin valoare sau prin referință (&)')),
        h('h3', {}, 'Scurtături'),
        h('ul', {}, li(h('kbd', {}, 'F9'), ' sau ', h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, 'Enter'), ' – compilează și rulează'),
          li(h('kbd', {}, 'Tab'), ' / ', h('kbd', {}, 'Shift'), '+', h('kbd', {}, 'Tab'), ' – mută rândurile la dreapta / la stânga'),
          li(h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, '/'), ' – transformă rândurile în comentariu (și înapoi)'),
          li(h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, 'S'), ' – salvează (oricum se salvează singur)')),
        h('p', { class: 'muted' }, 'Programul rulează în browser, nu pe un compilator adevărat. Un program care repetă de prea multe ori (peste 5 milioane de pași sau 3 secunde) este oprit, ca să nu se blocheze calculatorul.')));
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
      const a = h('a', { href: URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' })), download: numeFisier(F.titlu) });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ----- editorul -----
    function zoom(d) {
      pref.fs = Math.min(26, Math.max(11, (pref.fs || 15) + d));
      app.style.setProperty('--ap-fs', `${pref.fs}px`);
      lsScrie(LS_PREF, pref);
      sincronizeaza();
    }
    let erori = new Map(); // rând → 'eroare' | 'atentie'
    function stergeMarcaje() { erori = new Map(); redaMarcaje(); }
    function redaMarcaje() {
      const n = ta.value.split('\n').length;
      const nr = [];
      for (let i = 1; i <= n; i++) nr.push(`<div${erori.has(i) ? ` class="${erori.get(i)}"` : ''}>${i}</div>`);
      nrRand.innerHTML = nr.join('');
      umple(marcaj, [...erori].map(([r, cls]) => { const d = h('div', { class: cls }); d.style.top = `calc(${r - 1} * var(--ap-lh))`; return d; }));
    }
    let nrLinii = 0;
    function reda() {
      codEl.innerHTML = coloreaza(ta.value);
      const n = ta.value.split('\n').length;
      if (n !== nrLinii) { nrLinii = n; redaMarcaje(); }
    }
    function sincronizeaza() {
      const t = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      codEl.style.transform = t; marcaj.style.transform = t;
      nrRand.style.transform = `translateY(${-ta.scrollTop}px)`;
    }
    function pozitie() {
      const p = ta.selectionStart, inainte = ta.value.slice(0, p);
      const r = inainte.split('\n').length, c = p - inainte.lastIndexOf('\n');
      stPoz.textContent = `Rândul ${r}, coloana ${c}`;
    }
    function mergiLaRand(r) {
      const linii = ta.value.split('\n');
      r = Math.max(1, Math.min(r, linii.length));
      let p = 0; for (let i = 0; i < r - 1; i++) p += linii[i].length + 1;
      const ind = (linii[r - 1].match(/^\s*/) || [''])[0].length;
      ta.focus();
      ta.setSelectionRange(p + ind, p + linii[r - 1].length);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
      ta.scrollTop = Math.max(0, (r - 1) * lh - ta.clientHeight / 3);
      sincronizeaza(); pozitie();
    }
    // înlocuiește textul [a, b) păstrând Undo (Ctrl+Z) acolo unde browserul permite
    function insereaza(text, a = ta.selectionStart, b = ta.selectionEnd) {
      ta.setSelectionRange(a, b);
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch { ok = false; }
      if (!ok) { ta.setRangeText(text, a, b, 'end'); ta.dispatchEvent(new Event('input')); }
    }
    const IND = '    ';
    function linii(a, b) { // începutul primului rând și sfârșitul ultimului rând din selecție
      const v = ta.value;
      const s = v.lastIndexOf('\n', a - 1) + 1;
      let e = v.indexOf('\n', b > a && v[b - 1] === '\n' ? b - 1 : b); if (e < 0) e = v.length;
      return [s, e];
    }
    function modificaLinii(fn) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const [s, e] = linii(a, b);
      const vechi = ta.value.slice(s, e).split('\n');
      const noi = fn(vechi);
      insereaza(noi.join('\n'), s, e);
      ta.setSelectionRange(s, s + noi.join('\n').length);
    }
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'F9' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); ruleazaProgram(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); salveaza().then(() => toast('Salvat în acest browser.')); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        modificaLinii((ls) => {
          const toate = ls.filter((l) => l.trim()).every((l) => /^\s*\/\//.test(l));
          return ls.map((l) => (!l.trim() ? l : toate ? l.replace(/^(\s*)\/\/ ?/, '$1') : l.replace(/^(\s*)/, '$1// ')));
        });
        return;
      }
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        if (e.key === 'Tab' && ta.dataset.tabIese === '1') return;
        e.preventDefault();
        const a = ta.selectionStart, b = ta.selectionEnd;
        if (!e.shiftKey && a === b) { insereaza(IND); return; }
        if (!e.shiftKey && !ta.value.slice(a, b).includes('\n')) { insereaza(IND); return; }
        modificaLinii((ls) => ls.map((l) => (e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : (l.trim() ? IND + l : l))));
        return;
      }
      if (e.key === 'Escape') { ta.dataset.tabIese = '1'; return; } // Esc, apoi Tab: ieși din editor cu tastatura
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
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
        } else if (/^\s*(if|while|for|else)\b.*\)\s*$|^\s*else\s*$/.test(rand) && ultim !== ';') ind += IND; // if (...) fără acoladă
        insereaza(`\n${ind}`);
        return;
      }
      if ((e.key === '}' || e.key === '{') && !e.ctrlKey && !e.metaKey) {
        // acolada pe un rând gol se aliniază: } sub perechea ei {, iar { sub instrucțiunea de deasupra (if, for…)
        const a = ta.selectionStart, v = ta.value;
        const s = v.lastIndexOf('\n', a - 1) + 1;
        const rand = v.slice(s, a);
        if (/^[ \t]*$/.test(rand) && a === ta.selectionEnd) {
          const ind = e.key === '}' ? indentPereche(s) : indentAnterior(s);
          if (ind !== null && ind !== rand) { e.preventDefault(); insereaza(ind + e.key, s, a); }
        }
      }
    });
    function indentPereche(s) { // indentarea rândului care conține { -ul nepereche de dinainte de poziția s
      const v = ta.value;
      let k = 0;
      for (let i = s - 1; i >= 0; i--) {
        const c = v[i];
        if (c === '}') k++;
        else if (c === '{') { if (k === 0) { const ls = v.lastIndexOf('\n', i - 1) + 1; return (v.slice(ls, i).match(/^[ \t]*/) || [''])[0]; } k--; }
      }
      return '';
    }
    function indentAnterior(s) {
      const v = ta.value;
      let e = s - 1;
      while (e > 0) {
        const ls = v.lastIndexOf('\n', e - 1) + 1;
        const l = v.slice(ls, e);
        if (l.trim()) {
          const ind = (l.match(/^[ \t]*/) || [''])[0];
          return /\{\s*$/.test(l) ? ind + IND : ind;
        }
        e = ls - 1;
      }
      return null;
    }
    ta.addEventListener('keyup', (e) => { if (e.key !== 'Escape' && e.key !== 'Tab') delete ta.dataset.tabIese; });
    ta.addEventListener('input', () => {
      reda();
      if (erori.size) stergeMarcaje();
      laSchimbare(); pozitie();
    });
    ta.addEventListener('scroll', sincronizeaza);
    for (const ev of ['keyup', 'click', 'select', 'focus']) ta.addEventListener(ev, pozitie);
    intrareTa.addEventListener('input', laSchimbare);
    intrareTa.addEventListener('keydown', (e) => { if (e.key === 'F9' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); ruleazaProgram(); } });
    numeIn.addEventListener('change', () => { const t = numeIn.value.trim().slice(0, 60); F.titlu = t || 'Program'; numeIn.value = F.titlu; salveaza(); });
    numeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ta.focus(); } });
    app.addEventListener('keydown', (e) => { if (e.key === 'F9' && e.target !== ta && e.target !== intrareTa) { e.preventDefault(); ruleazaProgram(); } });

    // ----- consola -----
    function consolaGoala() {
      consola.append(h('p', { class: 'ap-cpp-indiciu' }, 'Aici apare ce afișează programul cu cout. Apasă ', h('b', {}, 'Compilează și rulează'), ' (F9).'));
    }
    const linkRand = (r) => (r ? h('button', { type: 'button', class: 'ap-cpp-rand', title: 'Mergi la rândul din cod', onclick: () => mergiLaRand(r) }, `rândul ${r}`) : null);
    function opresteRularea() {
      if (!ruleaza && !asteaptaDate) return;
      asteaptaDate = false;
      idRulare++;
      if (asteptare) { clearTimeout(asteptare.ceas); asteptare = null; }
      opresteWorker();
      gataRulare();
      consola.querySelector('.ap-cpp-cere')?.remove();
      consola.append(h('div', { class: 'ap-cpp-msg err' }, h('b', {}, 'Program oprit. '), 'L-ai oprit tu, cu butonul Oprește.'));
      if (ultimaRulare) ultimaRulare.text += '\n[Program oprit]';
    }
    function gataRulare() { ruleaza = false; btnStop.hidden = true; btnRun.disabled = false; app.classList.remove('ruleaza'); }

    async function ruleazaProgram(interactive = []) {
      if (ruleaza && !interactive.length) return;
      asteaptaDate = false;
      if (tSalv) salveaza();
      const id = ++idRulare;
      ruleaza = true; btnRun.disabled = true; app.classList.add('ruleaza');
      const tIncet = setTimeout(() => { if (id === idRulare && ruleaza) btnStop.hidden = false; }, 250);
      if (!interactive.length) { stMesaj.textContent = 'Se compilează și rulează…'; stMesaj.className = 'ap-cpp-stmesaj'; }
      const cod = ta.value, intrare = intrareTa.value;
      const rez = await executa(cod, intrare, interactive);
      clearTimeout(tIncet);
      if (id !== idRulare) return; // a fost oprit între timp
      gataRulare();
      afiseaza(rez, interactive);
    }

    function afiseaza(r, interactive) {
      stergeMarcaje();
      umple(consola);
      const cap = h('div', { class: 'ap-cpp-start' }, `▶ ${F.titlu}`);
      consola.append(cap);
      let text = '';
      const out = h('pre', { class: 'ap-cpp-out' });
      const avert = [];
      for (const s of r.iesire || []) {
        if (s.k === 'w') { avert.push(s); if (s.rand) erori.set(s.rand, erori.get(s.rand) || 'atentie'); continue; }
        out.append(s.k === 'i' ? h('span', { class: 'in' }, s.s) : s.s);
        text += s.s;
      }
      if (avert.length) consola.append(h('div', { class: 'ap-cpp-avert' }, avert.map((s) => h('div', {}, '⚠ ', linkRand(s.rand), ': ', s.s.replace(/^Atenție \(rândul \d+\): /, '')))));
      if (r.stare === 'compilare') {
        const e = r.eroare;
        if (e.rand) erori.set(e.rand, 'eroare');
        consola.append(h('div', { class: 'ap-cpp-msg err' }, h('b', {}, 'Eroare de compilare'), e.rand ? [' – ', linkRand(e.rand)] : null, h('div', {}, e.mesaj)),
          h('p', { class: 'ap-cpp-indiciu' }, 'Programul nu a pornit. Corectează greșeala (uită-te și la rândul de deasupra) și rulează din nou.'));
        text = `Eroare de compilare${e.rand ? ` – rândul ${e.rand}` : ''}: ${e.mesaj}`;
        stMesaj.textContent = `Eroare de compilare${e.rand ? ` la rândul ${e.rand}` : ''}`; stMesaj.className = 'ap-cpp-stmesaj err';
        redaMarcaje();
        ultimaRulare = { text };
        return;
      }
      consola.append(out);
      if (r.stare === 'intrare') {
        // programul așteaptă date: le scrii în consolă
        const inp = h('input', { type: 'text', class: 'ap-cpp-tastare', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Scrie datele cerute de program și apasă Enter' });
        out.append(inp);
        consola.append(h('div', { class: 'ap-cpp-cere' }, '⌨ Programul așteaptă date (cin >>): scrie valoarea și apasă Enter.'));
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); inp.disabled = true; ruleazaProgram([...interactive, inp.value]); }
          else if (e.key === 'Escape') opresteRularea();
        });
        btnStop.hidden = false; asteaptaDate = true;
        stMesaj.textContent = 'Programul așteaptă date de intrare…'; stMesaj.className = 'ap-cpp-stmesaj';
        inp.focus({ preventScroll: true });
        consola.scrollTop = consola.scrollHeight;
        ultimaRulare = { text };
        return;
      }
      if (r.stare === 'eroare') {
        const e = r.eroare;
        if (e.rand) erori.set(e.rand, 'eroare');
        consola.append(h('div', { class: 'ap-cpp-msg err' }, h('b', {}, 'Eroare la rulare'), e.rand ? [' – ', linkRand(e.rand)] : null, h('div', {}, e.mesaj)));
        text += `\n[Eroare la rulare${e.rand ? ` – rândul ${e.rand}` : ''}: ${e.mesaj}]`;
        stMesaj.textContent = 'Programul s-a oprit cu o eroare'; stMesaj.className = 'ap-cpp-stmesaj err';
      } else {
        if (r.intrareInsuf) consola.append(h('div', { class: 'ap-cpp-avert' }, '⚠ Programul a încercat să citească mai multe date decât ai scris în caseta Date de intrare (variabilele necitite au primit 0).'));
        const sec = (r.timp / 1000).toLocaleString('ro-RO', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        consola.append(h('div', { class: 'ap-cpp-msg ok' }, `Program încheiat: main a întors ${r.cod} · timp ${sec} s`));
        stMesaj.textContent = 'Programul a rulat'; stMesaj.className = 'ap-cpp-stmesaj ok';
      }
      redaMarcaje();
      consola.scrollTop = consola.scrollHeight;
      ultimaRulare = { text };
    }
    consola.addEventListener('click', (e) => { if (e.target === consola || e.target.closest('.ap-cpp-out')) consola.querySelector('.ap-cpp-tastare:not(:disabled)')?.focus({ preventScroll: true }); });

    // ----- pornire -----
    app.style.setProperty('--ap-fs', `${pref.fs || 15}px`);
    await deschide(F);
    if (F.nou) { const poz = SABLON.indexOf('    \n') + 4; ta.setSelectionRange(poz, poz); }
    ta.focus({ preventScroll: true });
    pozitie();
  } });
})();

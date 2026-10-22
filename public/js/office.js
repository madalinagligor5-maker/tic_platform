'use strict';
// Laboratorul de birotică: un procesor de text (tip Word) și o foaie de calcul (tip Excel), cu sarcini verificate automat.
// În lecții se scriu ca blocuri:
//
//   ```procesor-text                         ```calcul-tabelar
//   # Formatează documentul.                 # Calculează totalul.
//   Text:                                    Date:
//   Calculatorul meu                         Produs; Preț; Cantitate; Total
//   Un calculator are hardware și software.  Caiet; 5; 3;
//   Cerințe:                                 Cerințe:
//   - titlul: aldin, centrat, mărime 20      - D2: =B2*C2 | În D2 calculează totalul (preț × cantitate)
//   - „hardware”: subliniat                  - A1:D1: aldin | Capul de tabel este scris aldin
//   ```                                      ```
//
// Motorul de formule și verificarea foii de calcul merg și în Node (corectarea testelor pe server);
// editorul de text și verificarea lui folosesc browserul.
(function (root) {
  const I = typeof module !== 'undefined' && module.exports ? require('./interactive') : root.EduInteractiv;
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  // =====================================================================
  // Motorul de formule
  // =====================================================================
  const colName = (c) => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const colIndex = (s) => [...s.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const REF_RE = /^\$?([A-Z]{1,2})\$?(\d{1,4})$/i;
  function parseRef(ref) {
    const m = REF_RE.exec(String(ref).trim());
    return m ? { c: colIndex(m[1]), r: Number(m[2]) - 1 } : null;
  }
  const refName = (c, r) => `${colName(c)}${r + 1}`;
  function expandRange(a, b) {
    const p = parseRef(a), q = parseRef(b);
    if (!p || !q) return [];
    const out = [];
    for (let r = Math.min(p.r, q.r); r <= Math.max(p.r, q.r); r++) for (let c = Math.min(p.c, q.c); c <= Math.max(p.c, q.c); c++) out.push(refName(c, r));
    return out;
  }
  function parseNumber(raw) {
    const t = String(raw).trim();
    return /^[-+]?\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null;
  }

  class FErr { constructor(code) { this.err = code; } toString() { return this.err; } }
  const isErr = (v) => v instanceof FErr;

  function tokenize(src) {
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      let m;
      const rest = src.slice(i);
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { toks.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
      if (ch === '"') {
        const j = src.indexOf('"', i + 1);
        if (j < 0) throw new FErr('#SINTAXĂ!');
        toks.push({ t: 'str', v: src.slice(i + 1, j) }); i = j + 1; continue;
      }
      if ((m = /^(<=|>=|<>|[-+*/^&=<>(),;:])/.exec(rest))) { toks.push({ t: 'op', v: m[0] }); i += m[0].length; continue; }
      if ((m = /^\$?[A-Za-zĂÂÎȘȚăâîșț_][A-Za-zĂÂÎȘȚăâîșț0-9_.$]*/.exec(rest))) {
        const word = m[0];
        i += word.length;
        if (src[i] === '(' && !word.includes('$')) toks.push({ t: 'fn', v: norm(word).toUpperCase().replace(/[^A-Z.]/g, '') });
        else if (REF_RE.test(word)) toks.push({ t: 'ref', v: word.toUpperCase() });
        else if (/^(TRUE|ADEVARAT|ADEVĂRAT)$/i.test(word)) toks.push({ t: 'bool', v: true });
        else if (/^(FALSE|FALS)$/i.test(word)) toks.push({ t: 'bool', v: false });
        else toks.push({ t: 'name', v: word });
        continue;
      }
      throw new FErr('#SINTAXĂ!');
    }
    return toks;
  }

  function parseFormula(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
    const eat = (v) => { if (!isOp(v)) throw new FErr('#SINTAXĂ!'); p++; };
    const bin = (next, ops) => () => {
      let left = next();
      while (peek() && peek().t === 'op' && ops.includes(peek().v)) { const op = toks[p++].v; left = { k: 'bin', op, a: left, b: next() }; }
      return left;
    };
    function primary() {
      const t = toks[p++];
      if (!t) throw new FErr('#SINTAXĂ!');
      if (t.t === 'num' || t.t === 'str' || t.t === 'bool') return { k: 'lit', v: t.v };
      if (t.t === 'name') return { k: 'lit', v: new FErr('#NUME?') };
      if (t.t === 'ref') {
        if (isOp(':')) { p++; const b = toks[p++]; if (!b || b.t !== 'ref') throw new FErr('#SINTAXĂ!'); return { k: 'range', a: t.v, b: b.v }; }
        return { k: 'ref', v: t.v };
      }
      if (t.t === 'fn') {
        eat('(');
        const args = [];
        if (!isOp(')')) {
          args.push(expr());
          while (isOp(',') || isOp(';')) { p++; args.push(expr()); }
        }
        eat(')');
        return { k: 'fn', name: t.v, args };
      }
      if (t.t === 'op' && t.v === '(') { const e = expr(); eat(')'); return e; }
      if (t.t === 'op' && (t.v === '-' || t.v === '+')) return { k: 'neg', sign: t.v, a: primary() };
      throw new FErr('#SINTAXĂ!');
    }
    const pow = bin(primary, ['^']);
    const mul = bin(pow, ['*', '/']);
    const add = bin(mul, ['+', '-']);
    const cat = bin(add, ['&']);
    const cmp = bin(cat, ['=', '<>', '<', '>', '<=', '>=']);
    const expr = cmp;
    const ast = expr();
    if (p !== toks.length) throw new FErr('#SINTAXĂ!');
    return ast;
  }

  function functionsUsed(src) {
    try { return [...new Set(tokenize(src).filter((t) => t.t === 'fn').map((t) => canonFn(t.v)))]; } catch { return []; }
  }

  const FN_ALIASES = { SUMA: 'SUM', MEDIE: 'AVERAGE', MEDIA: 'AVERAGE', NUMARARE: 'COUNT', NUMARA: 'COUNT', DACA: 'IF', ROTUNJIRE: 'ROUND', SI: 'AND', SAU: 'OR', NU: 'NOT', CONCATENARE: 'CONCAT' };
  const canonFn = (n) => FN_ALIASES[n] || n;

  function toNum(v) {
    if (isErr(v)) return v;
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const n = parseNumber(v);
    return n === null ? new FErr('#VALOARE!') : n;
  }
  const flat = (args) => args.flat(Infinity);
  const numsFromArgs = (vals, rangeFlags) => {
    const out = [];
    vals.forEach((v, i) => {
      if (rangeFlags[i]) { for (const x of v) if (typeof x === 'number') out.push(x); else if (isErr(x)) out.push(x); }
      else out.push(toNum(v));
    });
    return out;
  };
  const firstErr = (arr) => arr.find(isErr);

  const FUNCS = {
    SUM: (vals, rf) => { const n = numsFromArgs(vals, rf); return firstErr(n) || n.reduce((s, x) => s + x, 0); },
    AVERAGE: (vals, rf) => { const n = numsFromArgs(vals, rf); return firstErr(n) || (n.length ? n.reduce((s, x) => s + x, 0) / n.length : new FErr('#DIV/0!')); },
    MIN: (vals, rf) => { const n = numsFromArgs(vals, rf); return firstErr(n) || (n.length ? Math.min(...n) : 0); },
    MAX: (vals, rf) => { const n = numsFromArgs(vals, rf); return firstErr(n) || (n.length ? Math.max(...n) : 0); },
    COUNT: (vals) => flat(vals).filter((x) => typeof x === 'number').length,
    COUNTA: (vals) => flat(vals).filter((x) => x !== null && x !== '').length,
    ROUND: (vals) => { const x = toNum(vals[0]), d = toNum(vals[1] ?? 0); if (isErr(x)) return x; if (isErr(d)) return d; const f = 10 ** d; return Math.round((x + Number.EPSILON) * f) / f; },
    ABS: (vals) => { const x = toNum(vals[0]); return isErr(x) ? x : Math.abs(x); },
    AND: (vals) => flat(vals).every((x) => Boolean(toNum(x))),
    OR: (vals) => flat(vals).some((x) => Boolean(toNum(x))),
    NOT: (vals) => !toNum(vals[0]),
    CONCAT: (vals) => flat(vals).map((x) => (x === null ? '' : String(x))).join(''),
  };

  function compare(a, b, op) {
    if (isErr(a)) return a;
    if (isErr(b)) return b;
    const na = typeof a === 'number' || typeof a === 'boolean' ? Number(a) : a ?? '';
    const nb = typeof b === 'number' || typeof b === 'boolean' ? Number(b) : b ?? '';
    let x = na, y = nb;
    if (typeof x === 'string' || typeof y === 'string') { x = norm(x); y = norm(y); }
    switch (op) {
      case '=': return x === y;
      case '<>': return x !== y;
      case '<': return x < y;
      case '>': return x > y;
      case '<=': return x <= y;
      default: return x >= y;
    }
  }

  function evalAst(n, sheet) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'ref': return sheet.value(n.v.replace(/\$/g, ''));
      case 'range': return expandRange(n.a.replace(/\$/g, ''), n.b.replace(/\$/g, '')).map((r) => sheet.value(r));
      case 'neg': { const v = toNum(evalAst(n.a, sheet)); return isErr(v) ? v : n.sign === '-' ? -v : v; }
      case 'fn': {
        const name = canonFn(n.name);
        if (name === 'IF') {
          const c = evalAst(n.args[0], sheet);
          if (isErr(c)) return c;
          const cond = typeof c === 'string' ? c !== '' : Boolean(toNum(c));
          const branch = cond ? n.args[1] : n.args[2];
          return branch ? evalAst(branch, sheet) : cond;
        }
        const f = FUNCS[name];
        if (!f) return new FErr('#NUME?');
        const rf = n.args.map((a) => a.k === 'range');
        return f(n.args.map((a) => evalAst(a, sheet)), rf);
      }
      case 'bin': {
        const a = evalAst(n.a, sheet), b = evalAst(n.b, sheet);
        if (Array.isArray(a) || Array.isArray(b)) return new FErr('#VALOARE!');
        if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) return compare(a, b, n.op);
        if (n.op === '&') { if (isErr(a)) return a; if (isErr(b)) return b; return `${a ?? ''}${b ?? ''}`; }
        const x = toNum(a), y = toNum(b);
        if (isErr(x)) return x;
        if (isErr(y)) return y;
        if (n.op === '+') return x + y;
        if (n.op === '-') return x - y;
        if (n.op === '*') return x * y;
        if (n.op === '^') return x ** y;
        return y === 0 ? new FErr('#DIV/0!') : x / y;
      }
      default: return new FErr('#SINTAXĂ!');
    }
  }

  // Foaia de calcul: celule { A1: { raw, bold, align, fill, decimals } }.
  class Sheet {
    constructor(cells = {}) { this.cells = cells; this.memo = new Map(); this.busy = new Set(); }
    raw(ref) { const c = this.cells[ref]; return c ? String(c.raw ?? '') : ''; }
    value(ref) {
      if (this.memo.has(ref)) return this.memo.get(ref);
      if (this.busy.has(ref)) return new FErr('#CICLU!');
      const raw = this.raw(ref);
      let v;
      if (raw === '') v = null;
      else if (raw.startsWith('=')) {
        this.busy.add(ref);
        try { v = evalAst(parseFormula(raw.slice(1)), this); } catch (e) { v = isErr(e) ? e : new FErr('#SINTAXĂ!'); }
        if (Array.isArray(v)) v = new FErr('#VALOARE!');
        this.busy.delete(ref);
      } else {
        const n = parseNumber(raw);
        v = n === null ? raw : n;
      }
      this.memo.set(ref, v);
      return v;
    }
    evaluate(formula) {
      try {
        const v = evalAst(parseFormula(formula.replace(/^=/, '')), this);
        return Array.isArray(v) ? new FErr('#VALOARE!') : v;
      } catch (e) { return isErr(e) ? e : new FErr('#SINTAXĂ!'); }
    }
    display(ref) { return formatValue(this.value(ref), this.cells[ref]?.decimals); }
  }
  function formatValue(v, decimals) {
    if (v === null || v === undefined) return '';
    if (isErr(v)) return v.err;
    if (typeof v === 'boolean') return v ? 'ADEVĂRAT' : 'FALS';
    if (typeof v === 'number') {
      if (decimals != null) return v.toFixed(decimals).replace('.', ',');
      return String(Math.round(v * 1e10) / 1e10).replace('.', ',');
    }
    return String(v);
  }
  // Mută referințele relative ale unei formule (copierea formulei în jos sau la dreapta).
  function shiftFormula(f, dr, dc) {
    return f.replace(/(\$?)([A-Z]{1,2})(\$?)(\d{1,4})(?![\w(])/gi, (all, dc$, col, dr$, row) => {
      const c = dc$ ? colIndex(col) : colIndex(col) + dc;
      const r = dr$ ? Number(row) - 1 : Number(row) - 1 + dr;
      if (c < 0 || r < 0) return '#REF!';
      return `${dc$}${colName(c)}${dr$}${r + 1}`;
    });
  }
  const sameValue = (a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
    if (isErr(a) || isErr(b)) return false;
    return norm(a ?? '') === norm(b ?? '');
  };

  // =====================================================================
  // Sarcini pentru foaia de calcul
  // =====================================================================
  const FILLS = { galben: '#FFF3A3', verde: '#C8F0D2', albastru: '#CDEBFA', rosu: '#FFD3DA', portocaliu: '#FFE0B8', gri: '#E6E6E6' };

  function parseSheetTask(text) {
    const errors = [];
    const grid = [];
    const cerinte = [];
    let mod = null, cols = 0, rows = 0;
    for (const raw of text.replace(/\r/g, '').split('\n')) {
      const l = raw.trim();
      if (!l) continue;
      const n = norm(l);
      if (/^date:?$/.test(n)) { mod = 'date'; continue; }
      if (/^cerinte:?$/.test(n)) { mod = 'cer'; continue; }
      let m;
      if ((m = /^coloane:\s*(\d+)$/.exec(n))) { cols = Number(m[1]); continue; }
      if ((m = /^randuri:\s*(\d+)$/.exec(n))) { rows = Number(m[1]); continue; }
      if (mod === 'date') { grid.push(raw.split(';').map((x) => x.trim())); continue; }
      if (mod === 'cer') {
        const line = l.replace(/^[-*]\s*/, '');
        const [stanga, ...descr] = line.split(' | ');
        const mr = /^(\$?[A-Z]{1,2}\$?\d+(?:\s*:\s*\$?[A-Z]{1,2}\$?\d+)?)\s*:\s*(.+)$/i.exec(stanga);
        if (!mr) { errors.push(`cerința „${l}” trebuie să fie „Celulă: cerință”, ex. „D2: =B2*C2” sau „D2:D5: =B2*C2”`); continue; }
        const refTxt = mr[1].replace(/\s+/g, '').replace(/\$/g, '').toUpperCase();
        const spec = mr[2].trim();
        const [a, b] = refTxt.split(':');
        const refs = b ? expandRange(a, b) : parseRef(a) ? [refName(parseRef(a).c, parseRef(a).r)] : [];
        if (!refs.length) { errors.push(`celula „${refTxt}” nu este validă`); continue; }
        const c = { refs, spec, text: descr.join(' | ').trim(), explicit: descr.length > 0 };
        const ns = norm(spec);
        if (spec.startsWith('=')) {
          try { parseFormula(spec.slice(1)); } catch { errors.push(`formula „${spec}” are o greșeală`); }
          Object.assign(c, { kind: 'formula', formula: spec, fns: functionsUsed(spec.slice(1)) });
        } else if (ns === 'aldin') Object.assign(c, { kind: 'fmt', fmt: 'bold' });
        else if (ns === 'centrat') Object.assign(c, { kind: 'fmt', fmt: 'center' });
        else if ((m = /^fundal (\w+)$/.exec(ns)) && FILLS[m[1]]) Object.assign(c, { kind: 'fmt', fmt: 'fill', value: m[1] });
        else if ((m = /^(\d) zecimale?$/.exec(ns)) || ns === 'doua zecimale') Object.assign(c, { kind: 'fmt', fmt: 'decimals', value: m ? Number(m[1]) : 2 });
        else Object.assign(c, { kind: 'value', value: parseNumber(spec) ?? spec });
        if (!c.text) c.text = c.kind === 'formula' ? `${refTxt}: ${spec}` : c.kind === 'value' ? `${refTxt} conține ${spec}` : `${refTxt}: ${spec}`;
        c.ref = refTxt;
        cerinte.push(c);
      }
    }
    if (!cerinte.length) errors.push('lipsesc cerințele (secțiunea „Cerințe:”)');
    const dataCols = Math.max(0, ...grid.map((r) => r.length));
    cols = Math.min(26, Math.max(cols, dataCols + 1, 5));
    rows = Math.min(60, Math.max(rows, grid.length + 3, 8));
    for (const c of cerinte) for (const r of c.refs) { const p = parseRef(r); if (p.c >= cols || p.r >= rows) errors.push(`celula ${r} este în afara foii (${colName(cols - 1)}${rows})`); }
    return { data: { grid, cols, rows, cerinte }, errors };
  }

  function cellsFromGrid(grid) {
    const cells = {};
    grid.forEach((row, r) => row.forEach((v, c) => { if (v !== '') cells[refName(c, r)] = { raw: v }; }));
    return cells;
  }

  function checkSheet(data, cells) {
    const sheet = new Sheet(cells);
    return data.cerinte.map((c) => {
      const top = parseRef(c.refs[0]);
      const ok = c.refs.every((ref) => {
        const cell = cells[ref] || {};
        if (c.kind === 'fmt') {
          if (c.fmt === 'bold') return Boolean(cell.bold);
          if (c.fmt === 'center') return cell.align === 'center';
          if (c.fmt === 'fill') return cell.fill === c.value;
          if (c.fmt === 'decimals') return cell.decimals === c.value;
        }
        const v = sheet.value(ref);
        if (c.kind === 'value') return sameValue(v, c.value);
        // formulă: celula trebuie să conțină o formulă, cu aceleași funcții, iar rezultatul să fie cel corect
        const raw = sheet.raw(ref);
        if (!raw.startsWith('=')) return false;
        const p = parseRef(ref);
        const expected = sheet.evaluate(shiftFormula(c.formula.slice(1), p.r - top.r, p.c - top.c));
        const used = functionsUsed(raw.slice(1));
        return !isErr(v) && sameValue(v, expected) && c.fns.every((f) => used.includes(f));
      });
      return { text: c.text, ok };
    });
  }

  // =====================================================================
  // Sarcini pentru procesorul de text
  // =====================================================================
  const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Calibri'];
  const COLORS = { negru: '#000000', rosu: '#D0021B', albastru: '#1F5FD1', verde: '#1E8E3E', portocaliu: '#E8710A', mov: '#7B3FB8' };
  const COLOR_ALIASES = { neagra: 'negru', negru: 'negru', rosie: 'rosu', rosu: 'rosu', albastra: 'albastru', albastru: 'albastru', verde: 'verde', portocalie: 'portocaliu', portocaliu: 'portocaliu', mov: 'mov' };
  const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];

  function parseDocTask(text) {
    const errors = [];
    const paragrafe = [];
    const cerinte = [];
    let mod = null;
    for (const raw of text.replace(/\r/g, '').split('\n')) {
      const l = raw.trim();
      const n = norm(l);
      if (/^text:?$/.test(n)) { mod = 'text'; continue; }
      if (/^cerinte:?$/.test(n)) { mod = 'cer'; continue; }
      if (!l) continue;
      if (mod === 'text') { paragrafe.push(l); continue; }
      if (mod !== 'cer') continue;
      const line = l.replace(/^[-*]\s*/, '');
      const [stanga, ...descr] = line.split(' | ');
      const mq = /^[„"«]([^"”»]+)["”»]\s*:\s*(.+)$/.exec(stanga);
      let target, propsTxt;
      if (mq) { target = { tip: 'fraza', text: mq[1] }; propsTxt = mq[2]; }
      else {
        const i = stanga.indexOf(':');
        if (i < 0) { errors.push(`cerința „${l}” trebuie să fie „țintă: formatări”`); continue; }
        const t = norm(stanga.slice(0, i));
        propsTxt = stanga.slice(i + 1);
        let m;
        if (t === 'titlul') target = { tip: 'paragraf', n: 1 };
        else if ((m = /^paragraful (\d+)$/.exec(t))) target = { tip: 'paragraf', n: Number(m[1]) };
        else if (t === 'tot textul' || t === 'tot documentul') target = { tip: 'tot' };
        else { errors.push(`ținta „${stanga.slice(0, i)}” nu e cunoscută (folosește „titlul”, „paragraful 2”, „tot textul” sau un cuvânt între ghilimele)`); continue; }
        if (target.n && target.n > paragrafe.length) errors.push(`paragraful ${target.n} nu există (textul are ${paragrafe.length})`);
      }
      if (target.tip === 'fraza' && !paragrafe.some((p) => p.toLowerCase().includes(target.text.toLowerCase()))) errors.push(`„${target.text}” nu apare în text`);
      const props = [];
      for (const pr of propsTxt.split(',').map((x) => norm(x)).filter(Boolean)) {
        let m;
        if (pr === 'aldin' || pr === 'bold') props.push({ k: 'bold' });
        else if (pr === 'cursiv' || pr === 'italic') props.push({ k: 'italic' });
        else if (pr === 'subliniat') props.push({ k: 'underline' });
        else if (pr === 'centrat') props.push({ k: 'align', v: 'center' });
        else if (/^(aliniat )?la stanga$/.test(pr)) props.push({ k: 'align', v: 'left' });
        else if (/^(aliniat )?la dreapta$/.test(pr)) props.push({ k: 'align', v: 'right' });
        else if (pr === 'stanga-dreapta' || pr === 'justificat' || pr === 'aliniat stanga-dreapta') props.push({ k: 'align', v: 'justify' });
        else if ((m = /^marime (\d+)$/.exec(pr))) props.push({ k: 'size', v: Number(m[1]) });
        else if ((m = /^culoare (\w+)$/.exec(pr)) && COLOR_ALIASES[m[1]]) props.push({ k: 'color', v: COLOR_ALIASES[m[1]] });
        else if ((m = /^font (.+)$/.exec(pr)) && FONTS.some((f) => norm(f) === m[1])) props.push({ k: 'font', v: FONTS.find((f) => norm(f) === m[1]) });
        else if (pr === 'lista cu buline' || pr === 'lista cu marcatori') props.push({ k: 'list', v: 'ul' });
        else if (pr === 'lista numerotata') props.push({ k: 'list', v: 'ol' });
        else errors.push(`formatarea „${pr}” nu e cunoscută`);
      }
      if (target.tip === 'fraza' && props.some((p) => p.k === 'align' || p.k === 'list')) errors.push('alinierea și listele se aplică paragrafelor, nu cuvintelor');
      const eticheta = target.tip === 'fraza' ? `„${target.text}”` : target.tip === 'tot' ? 'Tot textul' : target.n === 1 ? 'Titlul' : `Paragraful ${target.n}`;
      cerinte.push({ target, props, text: descr.join(' | ').trim() || `${eticheta}: ${propsTxt.trim()}` });
    }
    if (!paragrafe.length) errors.push('lipsește textul (secțiunea „Text:”)');
    if (!cerinte.length) errors.push('lipsesc cerințele (secțiunea „Cerințe:”)');
    return { data: { paragrafe, cerinte }, errors };
  }

  // ---- verificarea documentului (doar browser) ----
  const BLOCK = 'P,LI,H1,H2,H3,H4,DIV,BLOCKQUOTE';
  function blocuri(rootEl) {
    // Doar blocurile „frunză”: execCommand poate pune o listă în interiorul unui <p>, iar <p>-ul acela nu e un paragraf separat.
    const sel = `${BLOCK.toLowerCase()},ul,ol`;
    return [...rootEl.querySelectorAll(BLOCK.toLowerCase())].filter((el) => !el.querySelector(sel) && el.textContent.trim());
  }
  function textNodes(el) {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (w.currentNode.nodeValue.length) out.push(w.currentNode);
    return out;
  }
  const rgb = (s) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(s || ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]; };
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
  function underlined(el, rootEl) {
    for (let e = el; e && e !== rootEl.parentNode; e = e.parentElement) if (getComputedStyle(e).textDecorationLine.includes('underline')) return true;
    return false;
  }
  function charOk(el, p, rootEl) {
    const cs = getComputedStyle(el);
    switch (p.k) {
      case 'bold': return cs.fontWeight === 'bold' || Number(cs.fontWeight) >= 600;
      case 'italic': return cs.fontStyle === 'italic' || cs.fontStyle === 'oblique';
      case 'underline': return underlined(el, rootEl);
      case 'size': return Math.abs(parseFloat(cs.fontSize) - (p.v * 4) / 3) <= 0.75;
      case 'color': return dist(rgb(cs.color), hexRgb(COLORS[p.v])) < 60;
      case 'font': return norm(cs.fontFamily.split(',')[0].replace(/["']/g, '')) === norm(p.v);
      default: return true;
    }
  }
  function blockOk(block, p) {
    if (p.k === 'align') {
      const a = getComputedStyle(block).textAlign.replace('start', 'left').replace('end', 'right');
      return a === p.v;
    }
    if (p.k === 'list') return block.tagName === 'LI' && block.parentElement.tagName.toLowerCase() === p.v;
    return true;
  }
  // Elementele-părinte ale fiecărui caracter (fără spații) din țintă.
  function charsOf(nodes, start = 0, end = Infinity) {
    const out = [];
    let pos = 0;
    for (const n of nodes) {
      const v = n.nodeValue;
      for (let i = 0; i < v.length; i++, pos++) if (pos >= start && pos < end && v[i].trim()) out.push(n.parentElement);
    }
    return out;
  }
  function checkDoc(rootEl, data) {
    const bl = blocuri(rootEl);
    return data.cerinte.map((c) => {
      let chars = [], blocks = [];
      if (c.target.tip === 'paragraf') { const b = bl[c.target.n - 1]; if (b) { blocks = [b]; chars = charsOf(textNodes(b)); } }
      else if (c.target.tip === 'tot') { blocks = bl; chars = charsOf(textNodes(rootEl)); }
      else {
        const nodes = textNodes(rootEl);
        const full = nodes.map((n) => n.nodeValue).join('');
        const i = full.toLowerCase().indexOf(c.target.text.toLowerCase());
        if (i >= 0) chars = charsOf(nodes, i, i + c.target.text.length);
      }
      const ok = (blocks.length || chars.length) && c.props.every((p) => (p.k === 'align' || p.k === 'list' ? blocks.length && blocks.every((b) => blockOk(b, p)) : chars.length && chars.every((el) => charOk(el, p, rootEl))));
      return { text: c.text, ok: Boolean(ok) };
    });
  }

  // =====================================================================
  // Componente de interfață (doar browser)
  // =====================================================================
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const ICON = {
    bold: 'B', italic: 'I', underline: 'U',
    left: '⯇≡', center: '≡', right: '≡⯈', justify: '☰',
  };

  // ---- Procesorul de text ----
  function createDocEditor({ paragrafe = [''], titlu = 'Document1' } = {}) {
    const editor = h('div', { class: 'doc-page', contenteditable: 'true', spellcheck: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Documentul tău' });
    const initial = () => editor.replaceChildren(...(paragrafe.length ? paragrafe : ['']).map((t) => h('p', {}, t || h('br'))));
    initial();
    // CSP-ul site-ului (style-src 'self') blochează atributele style scrise de execCommand.
    // Le reaplicăm prin CSSOM (el.style.cssText), care este permis, ca formatarea să se vadă și să poată fi verificată.
    const aplicate = new WeakMap();
    new MutationObserver(() => {
      for (const el of editor.querySelectorAll('[style]')) {
        const v = el.getAttribute('style');
        if (aplicate.get(el) === v) continue;
        el.style.cssText = v;
        aplicate.set(el, el.getAttribute('style'));
      }
    }).observe(editor, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    let saved = null;
    document.addEventListener('selectionchange', () => {
      const s = document.getSelection();
      if (s.rangeCount && editor.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange();
    });
    const restore = () => {
      editor.focus();
      if (saved) { const s = document.getSelection(); s.removeAllRanges(); s.addRange(saved); }
    };
    const exec = (cmd, val = null, css = false) => {
      restore();
      document.execCommand('styleWithCSS', false, css);
      document.execCommand(cmd, false, val);
      editor.dispatchEvent(new Event('input'));
      stare();
    };
    function marime(pt) {
      restore();
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      for (const f of editor.querySelectorAll('font[size="7"]')) {
        const span = h('span');
        span.style.fontSize = `${pt}pt`;
        span.append(...f.childNodes);
        f.replaceWith(span);
      }
      editor.dispatchEvent(new Event('input'));
    }
    // Lipire doar ca text simplu.
    editor.addEventListener('paste', (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    // Enter creează paragrafe <p>.
    document.execCommand('defaultParagraphSeparator', false, 'p');
    const btn = (label, title, onclick, cls = '') => h('button', { class: `tb-btn ${cls}`, type: 'button', title, 'aria-label': title, onmousedown: (e) => e.preventDefault(), onclick }, label);
    const fontSel = h('select', { class: 'tb-select', title: 'Font', 'aria-label': 'Font', onchange: (e) => { exec('fontName', e.target.value, true); } },
      FONTS.map((f) => h('option', { value: f }, f)));
    fontSel.value = 'Calibri';
    const sizeSel = h('select', { class: 'tb-select small', title: 'Mărimea fontului', 'aria-label': 'Mărimea fontului', onchange: (e) => marime(Number(e.target.value)) },
      SIZES.map((s) => h('option', { value: s }, String(s))));
    sizeSel.value = '11';
    const culori = h('div', { class: 'tb-colors', role: 'group', 'aria-label': 'Culoarea textului' },
      Object.entries(COLORS).map(([nume, cod]) => {
        const b = btn('', `Culoare: ${nume}`, () => exec('foreColor', cod, true), 'swatch');
        b.style.background = cod;
        return b;
      }));
    const status = h('span', { class: 'doc-status' });
    function stare() {
      const cuvinte = (editor.textContent.trim().match(/\S+/g) || []).length;
      status.textContent = `Cuvinte: ${cuvinte}`;
      for (const [cmd, el] of Object.entries(toggles)) el.setAttribute('aria-pressed', String(document.queryCommandState(cmd)));
    }
    const toggles = {
      bold: btn(h('b', {}, 'B'), 'Aldin (Ctrl+B)', () => exec('bold')),
      italic: btn(h('i', {}, 'I'), 'Cursiv (Ctrl+I)', () => exec('italic')),
      underline: btn(h('u', {}, 'U'), 'Subliniat (Ctrl+U)', () => exec('underline')),
    };
    const bara = h('div', { class: 'doc-toolbar', role: 'toolbar', 'aria-label': 'Formatare' },
      h('div', { class: 'tb-group' }, btn('↶', 'Anulare (Ctrl+Z)', () => exec('undo')), btn('↷', 'Refacere (Ctrl+Y)', () => exec('redo'))),
      h('div', { class: 'tb-group' }, fontSel, sizeSel),
      h('div', { class: 'tb-group' }, toggles.bold, toggles.italic, toggles.underline),
      h('div', { class: 'tb-group' }, culori),
      h('div', { class: 'tb-group' },
        btn(alignIcon('left'), 'Aliniere la stânga', () => exec('justifyLeft')),
        btn(alignIcon('center'), 'Centrare', () => exec('justifyCenter')),
        btn(alignIcon('right'), 'Aliniere la dreapta', () => exec('justifyRight')),
        btn(alignIcon('justify'), 'Aliniere stânga-dreapta', () => exec('justifyFull'))),
      h('div', { class: 'tb-group' },
        btn('• ≡', 'Listă cu marcatori', () => exec('insertUnorderedList')),
        btn('1. ≡', 'Listă numerotată', () => exec('insertOrderedList')),
        btn('⌫A', 'Golește formatarea', () => exec('removeFormat'))));
    editor.addEventListener('input', stare);
    editor.addEventListener('keyup', stare);
    editor.addEventListener('mouseup', stare);
    const el = h('div', { class: 'office doc-app' },
      h('div', { class: 'office-title' }, h('span', { class: 'office-badge word' }, 'W'), h('span', {}, titlu)),
      bara,
      h('div', { class: 'doc-canvas' }, editor),
      h('div', { class: 'office-status' }, status, h('span', {}, 'Română')));
    setTimeout(stare, 0);
    return { el, editor, reset: () => { initial(); stare(); }, html: () => editor.innerHTML };
  }
  function alignIcon(kind) {
    const lines = { left: [14, 10, 14, 8], center: [14, 10, 14, 10], right: [14, 10, 14, 8], justify: [14, 14, 14, 14] }[kind];
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 14');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '14');
    lines.forEach((w, i) => {
      const x = kind === 'right' ? 16 - w : kind === 'center' ? (16 - w) / 2 : 1;
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', 1 + i * 3.4); r.setAttribute('width', w); r.setAttribute('height', 1.8); r.setAttribute('rx', 0.9);
      r.setAttribute('fill', 'currentColor');
      svg.append(r);
    });
    return svg;
  }

  // ---- Foaia de calcul ----
  function createSheet({ grid = [], cols = 8, rows = 15, titlu = 'Registru1' } = {}) {
    let cells = cellsFromGrid(grid);
    const initialCells = JSON.parse(JSON.stringify(cells));
    let sel = { c: 0, r: 0 }, anchor = { c: 0, r: 0 };
    let editing = null;
    const nameBox = h('input', { class: 'name-box', 'aria-label': 'Celula selectată', readonly: true });
    const fx = h('input', { class: 'formula-input', 'aria-label': 'Bara de formule', placeholder: 'Scrie o valoare sau o formulă, ex. =SUM(B2:B4)' });
    const table = h('table', { class: 'sheet-grid', role: 'grid' });
    const tds = {};
    const head = h('tr', {}, h('th', { class: 'corner' }), Array.from({ length: cols }, (_, c) => h('th', { scope: 'col' }, colName(c))));
    table.append(h('thead', {}, head));
    const body = h('tbody');
    for (let r = 0; r < rows; r++) {
      const tr = h('tr', {}, h('th', { scope: 'row' }, String(r + 1)));
      for (let c = 0; c < cols; c++) {
        const ref = refName(c, r);
        const td = h('td', { 'data-ref': ref, role: 'gridcell', tabindex: '-1' });
        td.addEventListener('mousedown', (e) => {
          if (editing && editing.ref === ref) return;
          commit();
          if (e.shiftKey) sel = { c, r }; else { sel = anchor = { c, r }; }
          refresh();
          e.preventDefault();
          wrap.focus();
        });
        td.addEventListener('dblclick', () => startEdit(false));
        tds[ref] = td;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    const range = () => {
      const out = [];
      for (let r = Math.min(sel.r, anchor.r); r <= Math.max(sel.r, anchor.r); r++) for (let c = Math.min(sel.c, anchor.c); c <= Math.max(sel.c, anchor.c); c++) out.push(refName(c, r));
      return out;
    };
    function refresh() {
      const sheet = new Sheet(cells);
      const inRange = new Set(range());
      for (const [ref, td] of Object.entries(tds)) {
        if (editing && editing.ref === ref) continue;
        const cell = cells[ref] || {};
        const v = sheet.value(ref);
        td.textContent = formatValue(v, cell.decimals);
        td.className = [
          typeof v === 'number' ? 'num' : '', isErr(v) ? 'err' : '', cell.bold ? 'bold' : '',
          cell.align === 'center' ? 'center' : '', cell.fill ? `fill-${cell.fill}` : '',
          inRange.has(ref) ? 'in-range' : '', ref === refName(sel.c, sel.r) ? 'active' : '',
        ].filter(Boolean).join(' ');
      }
      const ref = refName(sel.c, sel.r);
      nameBox.value = range().length > 1 ? `${range()[0]}:${range()[range().length - 1]}` : ref;
      if (document.activeElement !== fx) fx.value = cells[ref]?.raw ?? '';
      for (const [k, b] of Object.entries(fmtBtns)) b.setAttribute('aria-pressed', String(k === 'bold' ? Boolean(cells[ref]?.bold) : k === 'center' ? cells[ref]?.align === 'center' : cells[ref]?.decimals === 2));
    }
    function setRaw(ref, raw) {
      const cell = { ...(cells[ref] || {}), raw };
      if (raw === '' && !cell.bold && !cell.align && !cell.fill && cell.decimals == null) delete cells[ref];
      else cells[ref] = cell;
      wrap.dispatchEvent(new Event('change'));
    }
    function startEdit(replace, firstChar = '') {
      const ref = refName(sel.c, sel.r);
      const td = tds[ref];
      const input = h('input', { class: 'cell-input', value: replace ? firstChar : cells[ref]?.raw ?? '', 'aria-label': `Editare ${ref}` });
      editing = { ref, input };
      td.replaceChildren(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener('input', () => { fx.value = input.value; });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); move(0, e.shiftKey ? -1 : 1); }
        else if (e.key === 'Tab') { e.preventDefault(); commit(); move(e.shiftKey ? -1 : 1, 0); }
        else if (e.key === 'Escape') { editing = null; refresh(); wrap.focus(); }
        e.stopPropagation();
      });
      input.addEventListener('blur', () => setTimeout(() => { if (editing && editing.input === input) { commit(); } }, 0));
    }
    function commit() {
      if (!editing) return;
      const { ref, input } = editing;
      editing = null;
      setRaw(ref, input.value.trim());
      refresh();
    }
    function move(dc, dr, extend = false) {
      sel = { c: Math.min(cols - 1, Math.max(0, sel.c + dc)), r: Math.min(rows - 1, Math.max(0, sel.r + dr)) };
      if (!extend) anchor = { ...sel };
      refresh();
      tds[refName(sel.c, sel.r)].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    const wrap = h('div', { class: 'sheet-wrap', tabindex: '0', 'aria-label': 'Foaia de calcul. Folosește săgețile; scrie pentru a edita; Enter confirmă.' }, table);
    wrap.addEventListener('keydown', (e) => {
      if (editing) return;
      const k = e.key;
      if (k === 'ArrowDown') { e.preventDefault(); move(0, 1, e.shiftKey); }
      else if (k === 'ArrowUp') { e.preventDefault(); move(0, -1, e.shiftKey); }
      else if (k === 'ArrowLeft') { e.preventDefault(); move(-1, 0, e.shiftKey); }
      else if (k === 'ArrowRight' || k === 'Tab') { e.preventDefault(); move(1, 0, e.shiftKey && k !== 'Tab'); }
      else if (k === 'Enter' || k === 'F2') { e.preventDefault(); startEdit(false); }
      else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); for (const ref of range()) setRaw(ref, ''); refresh(); }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'b') { e.preventDefault(); format('bold'); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(true, k); }
    });
    fx.addEventListener('focus', () => commit());
    fx.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); setRaw(refName(sel.c, sel.r), fx.value.trim()); fx.blur(); move(0, 1); wrap.focus(); }
      if (e.key === 'Escape') { fx.blur(); refresh(); wrap.focus(); }
    });
    function format(kind, value) {
      const refs = range();
      const cur = cells[refs[0]] || {};
      for (const ref of refs) {
        const cell = { raw: '', ...(cells[ref] || {}) };
        if (kind === 'bold') cell.bold = !cur.bold;
        if (kind === 'center') cell.align = cur.align === 'center' ? '' : 'center';
        if (kind === 'fill') cell.fill = value;
        if (kind === 'decimals') cell.decimals = cur.decimals === 2 ? null : 2;
        cells[ref] = cell;
      }
      wrap.dispatchEvent(new Event('change'));
      refresh();
      wrap.focus();
    }
    function autosum() {
      // Σ: adună celulele numerice de deasupra celulei selectate.
      let r = sel.r - 1;
      const sheet = new Sheet(cells);
      while (r >= 0 && typeof sheet.value(refName(sel.c, r)) !== 'number') r--;
      const end = r;
      while (r >= 0 && typeof sheet.value(refName(sel.c, r)) === 'number') r--;
      if (end < 0) return;
      setRaw(refName(sel.c, sel.r), `=SUM(${refName(sel.c, r + 1)}:${refName(sel.c, end)})`);
      refresh();
      wrap.focus();
    }
    const tbtn = (label, title, onclick, cls = '') => h('button', { class: `tb-btn ${cls}`, type: 'button', title, 'aria-label': title, onmousedown: (e) => e.preventDefault(), onclick }, label);
    const fmtBtns = {
      bold: tbtn(h('b', {}, 'B'), 'Aldin (Ctrl+B)', () => format('bold')),
      center: tbtn(alignIcon('center'), 'Centrare', () => format('center')),
      decimals: tbtn(',00', 'Două zecimale', () => format('decimals')),
    };
    const fills = h('div', { class: 'tb-colors', role: 'group', 'aria-label': 'Culoarea de fundal' },
      tbtn('∅', 'Fără fundal', () => format('fill', ''), 'swatch none'),
      Object.entries(FILLS).map(([nume, cod]) => { const b = tbtn('', `Fundal ${nume}`, () => format('fill', nume), 'swatch'); b.style.background = cod; return b; }));
    const el = h('div', { class: 'office sheet-app' },
      h('div', { class: 'office-title' }, h('span', { class: 'office-badge excel' }, 'X'), h('span', {}, titlu)),
      h('div', { class: 'doc-toolbar', role: 'toolbar', 'aria-label': 'Formatare' },
        h('div', { class: 'tb-group' }, fmtBtns.bold, fmtBtns.center, fmtBtns.decimals),
        h('div', { class: 'tb-group' }, fills),
        h('div', { class: 'tb-group' }, tbtn('Σ', 'Însumare automată (SUM)', autosum, 'wide'))),
      h('div', { class: 'formula-bar' }, nameBox, h('span', { class: 'fx' }, 'fx'), fx),
      wrap);
    refresh();
    return {
      el,
      getCells: () => { commit(); return JSON.parse(JSON.stringify(cells)); },
      setCells: (c) => { cells = JSON.parse(JSON.stringify(c)); refresh(); },
      reset: () => { cells = JSON.parse(JSON.stringify(initialCells)); refresh(); },
      onChange: (fn) => wrap.addEventListener('change', fn),
      csv: () => {
        const sheet = new Sheet(cells);
        let lastR = 0, lastC = 0;
        for (const ref of Object.keys(cells)) { const p = parseRef(ref); lastR = Math.max(lastR, p.r); lastC = Math.max(lastC, p.c); }
        return Array.from({ length: lastR + 1 }, (_, r) => Array.from({ length: lastC + 1 }, (_, c) => `"${sheet.display(refName(c, r)).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      },
    };
  }

  // HTML de document (scris de elev) refăcut sigur: doar etichete de text și câteva stiluri de formatare,
  // aplicate prin CSSOM (permis de CSP). Folosit la restaurarea documentelor și în rezultatele profesorului.
  const PERMISE = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'FONT', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3']);
  const STILURI = ['color', 'font-size', 'font-family', 'text-align', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line'];
  function docSigur(html) {
    const src = new DOMParser().parseFromString(`<body>${String(html || '')}</body>`, 'text/html').body;
    const frag = document.createDocumentFragment();
    const copiaza = (node, into) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) into.append(n.textContent);
        if (n.nodeType !== 1) continue;
        if (!PERMISE.has(n.tagName)) { copiaza(n, into); continue; }
        const el = document.createElement(n.tagName === 'FONT' ? 'span' : n.tagName.toLowerCase());
        for (const decl of (n.getAttribute('style') || '').split(';')) {
          const i = decl.indexOf(':');
          const k = decl.slice(0, i).trim().toLowerCase(), v = decl.slice(i + 1).trim();
          if (i > 0 && STILURI.includes(k) && /^[\w\s#(),.%"'-]+$/.test(v)) el.style.setProperty(k, v);
        }
        if (n.tagName === 'FONT') {
          if (/^#?\w+$/.test(n.getAttribute('color') || '')) el.style.color = n.getAttribute('color');
          if (/^[\w\s,"'-]+$/.test(n.getAttribute('face') || '')) el.style.fontFamily = n.getAttribute('face');
        }
        const al = n.getAttribute('align');
        if (/^(left|right|center|justify)$/i.test(al || '')) el.style.textAlign = al.toLowerCase();
        copiaza(n, el);
        into.append(el);
      }
    };
    copiaza(src, frag);
    return frag;
  }

  function listaVerificari(rezultate) {
    return h('ul', { class: 'check-list' }, rezultate.map((r) => h('li', { class: r.ok ? 'ok' : 'bad' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, r.ok ? '✓' : '✗'), h('span', { class: 'sr-only' }, r.ok ? 'Îndeplinit: ' : 'Neîndeplinit: '), r.text)));
  }
  function cerinteInitiale(cerinte) {
    return h('ol', { class: 'task-list' }, cerinte.map((c) => h('li', {}, c.text)));
  }

  // ---- Integrare ca aplicații interactive în lecții ----
  if (I && I.register) {
    I.register('procesor-text', {
      label: 'Procesor de text',
      aliases: ['word', 'editor-text'],
      parse: parseDocTask,
      render(block, inline, { frame }) {
        const doc = createDocEditor({ paragrafe: block.data.paragrafe });
        const rez = h('div', { class: 'task-box' }, h('b', {}, 'Cerințe:'), cerinteInitiale(block.data.cerinte));
        const api = frame(block, h('div', { class: 'act-body' }, rez, doc.el), {
          onCheck(a) {
            const r = checkDoc(doc.editor, block.data);
            rez.replaceChildren(h('b', {}, 'Verificare:'), listaVerificari(r));
            const bune = r.filter((x) => x.ok).length;
            if (bune === r.length) a.status('Excelent! Documentul respectă toate cerințele.', 'ok'), a.solve();
            else a.status(`${bune} din ${r.length} cerințe îndeplinite. Corectează ce e marcat cu ✗.`, 'bad');
          },
          onReset() { doc.reset(); rez.replaceChildren(h('b', {}, 'Cerințe:'), cerinteInitiale(block.data.cerinte)); },
        });
        return api.box;
      },
    });
    I.register('calcul-tabelar', {
      label: 'Calcul tabelar',
      aliases: ['excel', 'foaie-de-calcul'],
      parse: parseSheetTask,
      render(block, inline, { frame }) {
        const sh = createSheet(block.data);
        const rez = h('div', { class: 'task-box' }, h('b', {}, 'Cerințe:'), cerinteInitiale(block.data.cerinte));
        const api = frame(block, h('div', { class: 'act-body' }, rez, sh.el), {
          onCheck(a) {
            const r = checkSheet(block.data, sh.getCells());
            rez.replaceChildren(h('b', {}, 'Verificare:'), listaVerificari(r));
            const bune = r.filter((x) => x.ok).length;
            if (bune === r.length) a.status('Excelent! Foaia de calcul respectă toate cerințele.', 'ok'), a.solve();
            else a.status(`${bune} din ${r.length} cerințe îndeplinite. Corectează ce e marcat cu ✗.`, 'bad');
          },
          onReset() { sh.reset(); rez.replaceChildren(h('b', {}, 'Cerințe:'), cerinteInitiale(block.data.cerinte)); },
        });
        return api.box;
      },
    });
  }

  const api = {
    Sheet, parseFormula, functionsUsed, shiftFormula, formatValue, parseRef, refName, colName, expandRange, cellsFromGrid,
    parseSheetTask, checkSheet, parseDocTask, checkDoc, createDocEditor, createSheet, listaVerificari, cerinteInitiale, docSigur, FONTS, COLORS, FILLS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EduOffice = api;
})(typeof window !== 'undefined' ? window : globalThis);

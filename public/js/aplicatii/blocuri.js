'use strict';
// Programare cu blocuri: mediu de programare vizuală ca Scratch 3 / Blockly, pentru clasele a V-a și a VI-a
// (Unitatea 6 · Primii pași în programare, clasa a V-a; Unitatea 4 · Algoritmi, clasa a VI-a).
// Totul este scris de la zero, fără biblioteci: editorul de blocuri (SVG), scena (canvas 480×360, coordonate ca în Scratch),
// personajele și decorurile (desenate prin cod), sunetele (Web Audio), interpretorul cu execuție concurentă,
// blocurile proprii („Blocurile mele”), generarea de pseudocod și Python, exemplele și provocările verificate automat.
// Proiectele se păstrează în browser (IndexedDB, cu localStorage de rezervă) și se pot exporta/importa ca .json.
(() => {
  const { h, show, routes } = window.EduApp;
  const SVGNS = 'http://www.w3.org/2000/svg';
  // Element SVG (atributele de prezentare sunt permise de CSP; atributul style nu)
  function sv(tag, attrs = {}, ...children) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fara = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const copie = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));

  // ---------- Stocare: IndexedDB, cu localStorage de rezervă ----------
  const DB = 'edudigi-blocuri', ST = 'proiecte', LS = 'edudigi_blocuri_proiecte', LS_PROV = 'edudigi_blocuri_provocari', LS_PREF = 'edudigi_blocuri_pref', CIORNA = '__ciorna';
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
  const lsScrie = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
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
      if (!lsScrie(LS, a)) throw new Error('Spațiul de stocare este plin.');
    },
    async del(id) {
      if (await areIDB()) return tx('readwrite', (s) => s.delete(id));
      lsScrie(LS, lsCiteste(LS, []).filter((x) => x.id !== id));
    },
  };

  // ---------- Categoriile (culorile din Scratch 3) ----------
  const CATS = [
    { id: 'miscare', nume: 'Mișcare', cul: '#4C97FF', sec: '#4280D7', ter: '#3373CC' },
    { id: 'aspect', nume: 'Aspect', cul: '#9966FF', sec: '#855CD6', ter: '#774DCB' },
    { id: 'sunet', nume: 'Sunet', cul: '#CF63CF', sec: '#C94FC9', ter: '#BD42BD' },
    { id: 'evenimente', nume: 'Evenimente', cul: '#FFBF00', sec: '#E6AC00', ter: '#CC9900' },
    { id: 'control', nume: 'Control', cul: '#FFAB19', sec: '#EC9C13', ter: '#CF8B17' },
    { id: 'detectare', nume: 'Detectare', cul: '#5CB1D6', sec: '#47A8D1', ter: '#2E8EB8' },
    { id: 'operatori', nume: 'Operatori', cul: '#59C059', sec: '#46B946', ter: '#389438' },
    { id: 'variabile', nume: 'Variabile', cul: '#FF8C1A', sec: '#FF8000', ter: '#DB6E00' },
    { id: 'liste', nume: 'Liste', cul: '#FF661A', sec: '#FF5500', ter: '#E64D00', ascuns: true },
    { id: 'blocurilemele', nume: 'Blocurile mele', cul: '#FF6680', sec: '#FF4D6A', ter: '#FF3355' },
    { id: 'creion', nume: 'Creion', cul: '#0FBD8C', sec: '#0DA57A', ter: '#0B8E69' },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));

  // ---------- Definițiile blocurilor ----------
  // Forme: hat (pălărie), cmd (comandă), c (o gură), c2 (dacă/altfel), cap (fără continuare), capc (la infinit), rep (raportor), bool (hexagon)
  // Argumente: {NUME:n=10} număr, {NUME:t=text} text, {NUME:b} boolean, {NUME:m:meniu=val} listă derulantă,
  // {NUME:d:meniu=val} listă derulantă în care se poate pune un raportor, {NUME:c=#hex} culoare, {NUME:v} variabilă, {NUME:l} listă; @icon
  const DEF = [
    // Mișcare
    ['motion_movesteps', 'miscare', 'cmd', 'mergi {STEPS:n=10} pași'],
    ['motion_turnright', 'miscare', 'cmd', 'rotește-te @dreapta {DEGREES:n=15} grade'],
    ['motion_turnleft', 'miscare', 'cmd', 'rotește-te @stanga {DEGREES:n=15} grade'],
    ['motion_goto', 'miscare', 'cmd', 'mergi la {TO:d:tinteMers=_random_}'],
    ['motion_gotoxy', 'miscare', 'cmd', 'mergi la x: {X:n=0} y: {Y:n=0}'],
    ['motion_glideto', 'miscare', 'cmd', 'alunecă în {SECS:n=1} secunde la {TO:d:tinteMers=_random_}'],
    ['motion_glidesecstoxy', 'miscare', 'cmd', 'alunecă în {SECS:n=1} secunde la x: {X:n=0} y: {Y:n=0}'],
    ['motion_pointindirection', 'miscare', 'cmd', 'indică în direcția {DIRECTION:n=90}'],
    ['motion_pointtowards', 'miscare', 'cmd', 'indică spre {TOWARDS:d:tinteSpre=_mouse_}'],
    ['motion_changexby', 'miscare', 'cmd', 'modifică x cu {DX:n=10}'],
    ['motion_setx', 'miscare', 'cmd', 'setează x la {X:n=0}'],
    ['motion_changeyby', 'miscare', 'cmd', 'modifică y cu {DY:n=10}'],
    ['motion_sety', 'miscare', 'cmd', 'setează y la {Y:n=0}'],
    ['motion_ifonedgebounce', 'miscare', 'cmd', 'dacă atinge marginea, ricoșează'],
    ['motion_setrotationstyle', 'miscare', 'cmd', 'setează stilul de rotație {STYLE:m:rotatie=stânga-dreapta}'],
    ['motion_xposition', 'miscare', 'rep', 'poziția x'],
    ['motion_yposition', 'miscare', 'rep', 'poziția y'],
    ['motion_direction', 'miscare', 'rep', 'direcția'],
    // Aspect
    ['looks_sayforsecs', 'aspect', 'cmd', 'spune {MESSAGE:t=Salut!} timp de {SECS:n=2} secunde'],
    ['looks_say', 'aspect', 'cmd', 'spune {MESSAGE:t=Salut!}'],
    ['looks_thinkforsecs', 'aspect', 'cmd', 'gândește {MESSAGE:t=Hmm...} timp de {SECS:n=2} secunde'],
    ['looks_think', 'aspect', 'cmd', 'gândește {MESSAGE:t=Hmm...}'],
    ['looks_switchcostumeto', 'aspect', 'cmd', 'schimbă costumul la {COSTUME:d:costume}'],
    ['looks_nextcostume', 'aspect', 'cmd', 'costumul următor'],
    ['looks_switchbackdropto', 'aspect', 'cmd', 'schimbă decorul la {BACKDROP:d:decoruriSchimba}'],
    ['looks_nextbackdrop', 'aspect', 'cmd', 'decorul următor'],
    ['looks_changesizeby', 'aspect', 'cmd', 'modifică mărimea cu {CHANGE:n=10}'],
    ['looks_setsizeto', 'aspect', 'cmd', 'setează mărimea la {SIZE:n=100} %'],
    ['looks_changeeffectby', 'aspect', 'cmd', 'modifică efectul {EFFECT:m:efecte=culoare} cu {CHANGE:n=25}'],
    ['looks_seteffectto', 'aspect', 'cmd', 'setează efectul {EFFECT:m:efecte=culoare} la {VALUE:n=0}'],
    ['looks_cleargraphiceffects', 'aspect', 'cmd', 'anulează efectele grafice'],
    ['looks_show', 'aspect', 'cmd', 'arată'],
    ['looks_hide', 'aspect', 'cmd', 'ascunde'],
    ['looks_gotofrontback', 'aspect', 'cmd', 'du-te în stratul {FRONT_BACK:m:strat=din față}'],
    ['looks_costumenumbername', 'aspect', 'rep', 'costum {NUMBER_NAME:m:numenr=număr}'],
    ['looks_backdropnumbername', 'aspect', 'rep', 'decor {NUMBER_NAME:m:numenr=număr}'],
    ['looks_size', 'aspect', 'rep', 'mărimea'],
    // Sunet (și blocurile extensiei Muzică)
    ['sound_play', 'sunet', 'cmd', 'pornește sunetul {SOUND_MENU:d:sunete}'],
    ['sound_playuntildone', 'sunet', 'cmd', 'redă sunetul {SOUND_MENU:d:sunete} până la final'],
    ['sound_stopallsounds', 'sunet', 'cmd', 'oprește toate sunetele'],
    ['music_playnote', 'sunet', 'cmd', 'cântă nota {NOTE:n=60} pentru {BEATS:n=0.25} bătăi'],
    ['music_rest', 'sunet', 'cmd', 'pauză {BEATS:n=0.25} bătăi'],
    ['music_setinstrument', 'sunet', 'cmd', 'setează instrumentul la {INSTRUMENT:m:instrumente=1}'],
    ['music_settempo', 'sunet', 'cmd', 'setează tempoul la {TEMPO:n=60}'],
    ['sound_changevolumeby', 'sunet', 'cmd', 'modifică volumul cu {VOLUME:n=-10}'],
    ['sound_setvolumeto', 'sunet', 'cmd', 'setează volumul la {VOLUME:n=100} %'],
    ['sound_volume', 'sunet', 'rep', 'volum'],
    ['music_tempo', 'sunet', 'rep', 'tempo'],
    // Evenimente
    ['event_whenflagclicked', 'evenimente', 'hat', 'când se dă clic pe @steag'],
    ['event_whenkeypressed', 'evenimente', 'hat', 'când tasta {KEY_OPTION:m:taste=spațiu} este apăsată'],
    ['event_whenthisspriteclicked', 'evenimente', 'hat', 'când se dă clic pe acest personaj'],
    ['event_whenstageclicked', 'evenimente', 'hat', 'când se dă clic pe scenă'],
    ['event_whenbackdropswitchesto', 'evenimente', 'hat', 'când decorul devine {BACKDROP:m:decoruri}'],
    ['event_whenbroadcastreceived', 'evenimente', 'hat', 'când primesc {BROADCAST_OPTION:m:mesaje}'],
    ['event_broadcast', 'evenimente', 'cmd', 'trimite mesajul {BROADCAST_INPUT:d:mesaje}'],
    ['event_broadcastandwait', 'evenimente', 'cmd', 'trimite mesajul {BROADCAST_INPUT:d:mesaje} și așteaptă'],
    // Control
    ['control_wait', 'control', 'cmd', 'așteaptă {DURATION:n=1} secunde'],
    ['control_repeat', 'control', 'c', 'repetă {TIMES:n=10}'],
    ['control_forever', 'control', 'capc', 'la infinit'],
    ['control_if', 'control', 'c', 'dacă {CONDITION:b} atunci'],
    ['control_if_else', 'control', 'c2', 'dacă {CONDITION:b} atunci'],
    ['control_wait_until', 'control', 'cmd', 'așteaptă până când {CONDITION:b}'],
    ['control_repeat_until', 'control', 'c', 'repetă până când {CONDITION:b}'],
    ['control_stop', 'control', 'cap', 'oprește {STOP_OPTION:m:stop=tot}'],
    ['control_start_as_clone', 'control', 'hat', 'când încep ca o clonă'],
    ['control_create_clone_of', 'control', 'cmd', 'creează o clonă a {CLONE_OPTION:d:clone=_myself_}'],
    ['control_delete_this_clone', 'control', 'cap', 'șterge această clonă'],
    // Detectare
    ['sensing_touchingobject', 'detectare', 'bool', 'atinge {TOUCHINGOBJECTMENU:d:atingere=_mouse_}?'],
    ['sensing_touchingcolor', 'detectare', 'bool', 'atinge culoarea {COLOR:c=#000000}?'],
    ['sensing_coloristouchingcolor', 'detectare', 'bool', 'culoarea {COLOR:c=#ff0000} atinge {COLOR2:c=#000000}?'],
    ['sensing_distanceto', 'detectare', 'rep', 'distanța până la {DISTANCETOMENU:d:tinteSpre=_mouse_}'],
    ['sensing_askandwait', 'detectare', 'cmd', 'întreabă {QUESTION:t=Cum te numești?} și așteaptă'],
    ['sensing_answer', 'detectare', 'rep', 'răspuns'],
    ['sensing_keypressed', 'detectare', 'bool', 'tasta {KEY_OPTION:d:taste=spațiu} apăsată?'],
    ['sensing_mousedown', 'detectare', 'bool', 'mouse apăsat?'],
    ['sensing_mousex', 'detectare', 'rep', 'x mouse'],
    ['sensing_mousey', 'detectare', 'rep', 'y mouse'],
    ['sensing_timer', 'detectare', 'rep', 'cronometru'],
    ['sensing_resettimer', 'detectare', 'cmd', 'resetează cronometrul'],
    // Operatori
    ['operator_add', 'operatori', 'rep', '{NUM1:n=} + {NUM2:n=}'],
    ['operator_subtract', 'operatori', 'rep', '{NUM1:n=} - {NUM2:n=}'],
    ['operator_multiply', 'operatori', 'rep', '{NUM1:n=} * {NUM2:n=}'],
    ['operator_divide', 'operatori', 'rep', '{NUM1:n=} / {NUM2:n=}'],
    ['operator_random', 'operatori', 'rep', 'alege aleator între {FROM:n=1} și {TO:n=10}'],
    ['operator_gt', 'operatori', 'bool', '{OPERAND1:t=} > {OPERAND2:t=50}'],
    ['operator_lt', 'operatori', 'bool', '{OPERAND1:t=} < {OPERAND2:t=50}'],
    ['operator_equals', 'operatori', 'bool', '{OPERAND1:t=} = {OPERAND2:t=50}'],
    ['operator_and', 'operatori', 'bool', '{OPERAND1:b} și {OPERAND2:b}'],
    ['operator_or', 'operatori', 'bool', '{OPERAND1:b} sau {OPERAND2:b}'],
    ['operator_not', 'operatori', 'bool', 'nu {OPERAND:b}'],
    ['operator_join', 'operatori', 'rep', 'alătură {STRING1:t=măr } {STRING2:t=banană}'],
    ['operator_letter_of', 'operatori', 'rep', 'litera {LETTER:n=1} din {STRING:t=măr}'],
    ['operator_length', 'operatori', 'rep', 'lungimea lui {STRING:t=măr}'],
    ['operator_contains', 'operatori', 'bool', '{STRING1:t=măr} conține {STRING2:t=a}?'],
    ['operator_mod', 'operatori', 'rep', '{NUM1:n=} mod {NUM2:n=}'],
    ['operator_round', 'operatori', 'rep', 'rotunjește {NUM:n=}'],
    ['operator_mathop', 'operatori', 'rep', '{OPERATOR:m:functii=abs} din {NUM:n=}'],
    // Variabile
    ['data_variable', 'variabile', 'rep', '{VARIABLE:x}'],
    ['data_setvariableto', 'variabile', 'cmd', 'setează {VARIABLE:v} la {VALUE:t=0}'],
    ['data_changevariableby', 'variabile', 'cmd', 'modifică {VARIABLE:v} cu {VALUE:n=1}'],
    ['data_showvariable', 'variabile', 'cmd', 'arată variabila {VARIABLE:v}'],
    ['data_hidevariable', 'variabile', 'cmd', 'ascunde variabila {VARIABLE:v}'],
    // Liste
    ['data_listcontents', 'liste', 'rep', '{LIST:x}'],
    ['data_addtolist', 'liste', 'cmd', 'adaugă {ITEM:t=lucru} la {LIST:l}'],
    ['data_deleteoflist', 'liste', 'cmd', 'șterge {INDEX:n=1} din {LIST:l}'],
    ['data_deletealloflist', 'liste', 'cmd', 'șterge tot din {LIST:l}'],
    ['data_insertatlist', 'liste', 'cmd', 'inserează {ITEM:t=lucru} la poziția {INDEX:n=1} din {LIST:l}'],
    ['data_replaceitemoflist', 'liste', 'cmd', 'înlocuiește elementul {INDEX:n=1} din {LIST:l} cu {ITEM:t=lucru}'],
    ['data_itemoflist', 'liste', 'rep', 'elementul {INDEX:n=1} din {LIST:l}'],
    ['data_itemnumoflist', 'liste', 'rep', 'poziția lui {ITEM:t=lucru} în {LIST:l}'],
    ['data_lengthoflist', 'liste', 'rep', 'lungimea listei {LIST:l}'],
    ['data_listcontainsitem', 'liste', 'bool', '{LIST:l} conține {ITEM:t=lucru}?'],
    ['data_showlist', 'liste', 'cmd', 'arată lista {LIST:l}'],
    ['data_hidelist', 'liste', 'cmd', 'ascunde lista {LIST:l}'],
    // Creion
    ['pen_clear', 'creion', 'cmd', '@creion șterge tot'],
    ['pen_stamp', 'creion', 'cmd', '@creion ștampilează'],
    ['pen_penDown', 'creion', 'cmd', '@creion pune creionul jos'],
    ['pen_penUp', 'creion', 'cmd', '@creion ridică creionul'],
    ['pen_setPenColorToColor', 'creion', 'cmd', '@creion setează culoarea creionului la {COLOR:c=#1f6fd1}'],
    ['pen_changePenColorBy', 'creion', 'cmd', '@creion modifică culoarea creionului cu {VALUE:n=10}'],
    ['pen_changePenSizeBy', 'creion', 'cmd', '@creion modifică grosimea creionului cu {SIZE:n=1}'],
    ['pen_setPenSizeTo', 'creion', 'cmd', '@creion setează grosimea creionului la {SIZE:n=1}'],
    // Blocurile mele (forma lor se construiește din definiție)
    ['procedures_definition', 'blocurilemele', 'hat', 'definește'],
    ['procedures_call', 'blocurilemele', 'cmd', ''],
    ['argument_reporter', 'blocurilemele', 'rep', ''],
    ['argument_bool', 'blocurilemele', 'bool', ''],
  ];
  // Spec-ul text → jetoane
  function parseSpec(spec) {
    const toks = [];
    const re = /\{(\w+):(\w)(?::(\w+))?(?:=([^}]*))?\}|@(\w+)|([^{@]+)/g;
    let m;
    while ((m = re.exec(spec))) {
      if (m[1]) toks.push({ t: 'arg', name: m[1], type: m[2], menu: m[3] || null, def: m[4] ?? '' });
      else if (m[5]) toks.push({ t: 'icon', name: m[5] });
      else { const tx = m[6].trim(); if (tx) toks.push({ t: 'label', text: tx }); }
    }
    return toks;
  }
  const SPEC = {};
  for (const [op, cat, shape, spec] of DEF) SPEC[op] = { op, cat, shape, toks: parseSpec(spec) };

  // Meniurile statice
  const TASTE = ['spațiu', 'săgeată sus', 'săgeată jos', 'săgeată dreapta', 'săgeată stânga', 'orice', ...'abcdefghijklmnopqrstuvwxyz', ...'0123456789'];
  const INSTRUMENTE = ['Pian', 'Pian electric', 'Orgă', 'Chitară', 'Chitară electrică', 'Bas', 'Pizzicato', 'Violoncel', 'Trombon', 'Clarinet', 'Saxofon', 'Flaut', 'Flaut de lemn', 'Fagot', 'Cor', 'Vibrafon', 'Cutie muzicală', 'Tobă de oțel', 'Marimba', 'Sintetizator'];
  const FUNCTII = ['abs', 'podea', 'plafon', 'radical', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'e ^', '10 ^'];
  const MENIURI_STATICE = {
    taste: TASTE.map((t) => [t, t]),
    rotatie: [['stânga-dreapta', 'stânga-dreapta'], ['nu roti', 'nu roti'], ['toate direcțiile', 'toate direcțiile']],
    efecte: [['culoare', 'culoare'], ['luminozitate', 'luminozitate'], ['fantomă', 'fantomă'], ['pixelare', 'pixelare']],
    strat: [['din față', 'din față'], ['din spate', 'din spate']],
    numenr: [['număr', 'număr'], ['nume', 'nume']],
    stop: [['tot', 'tot'], ['acest script', 'acest script'], ['alte scripturi ale personajului', 'alte scripturi ale personajului']],
    functii: FUNCTII.map((f) => [f, f]),
    instrumente: INSTRUMENTE.map((n, i) => [`(${i + 1}) ${n}`, String(i + 1)]),
  };

  // ---------- Conversii ca în Scratch ----------
  function num(v) {
    if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = String(v ?? '').trim().replace(',', '.');
    if (s === '') return 0;
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  }
  const eNumar = (v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v.trim().replace(',', '.'))));
  function str(v) {
    if (typeof v === 'boolean') return v ? 'adevărat' : 'fals';
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return v > 0 ? 'Infinit' : v < 0 ? '-Infinit' : 'NaN';
      return String(Math.round(v * 1e10) / 1e10);
    }
    return String(v ?? '');
  }
  function boolv(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).toLowerCase();
    return !(s === '' || s === '0' || s === 'false' || s === 'fals');
  }
  function compara(a, b) {
    if (eNumar(a) && eNumar(b)) return num(a) - num(b);
    const x = str(a).toLowerCase(), y = str(b).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }

  // ---------- Blocuri: creare, parcurgere, copiere ----------
  function bloc(op) {
    const sp = SPEC[op];
    const b = { id: uid(), op, in: {}, sub: [], next: null };
    for (const t of sp.toks) if (t.t === 'arg') b.in[t.name] = { v: t.def, b: null };
    if (sp.shape === 'c' || sp.shape === 'capc') b.sub = [null];
    if (sp.shape === 'c2') b.sub = [null, null];
    return b;
  }
  // Vizitează un bloc, intrările, gurile și continuarea lui
  function parcurge(b, fn, cuNext = true) {
    while (b) {
      fn(b);
      for (const k in b.in) if (b.in[k].b) parcurge(b.in[k].b, fn);
      for (const s of b.sub) if (s) parcurge(s, fn);
      if (!cuNext) return;
      b = b.next;
    }
  }
  const ultimul = (b) => { while (b.next) b = b.next; return b; };
  function reId(b) { parcurge(b, (x) => { x.id = uid(); }); return b; }
  const cloneaza = (b, cuNext = true) => {
    const c = copie(cuNext ? b : { ...b, next: null });
    return reId(c);
  };
  function gasesteParinte(tinta, tinte) {
    for (const top of tinta.blocuri) {
      if (top === tinte) return { fel: 'top' };
      let r = null;
      parcurge(top, (x) => {
        if (r) return;
        if (x.next === tinte) r = { fel: 'next', p: x };
        x.sub.forEach((s, i) => { if (s === tinte) r = { fel: 'sub', p: x, i }; });
        for (const k in x.in) if (x.in[k].b === tinte) r = { fel: 'in', p: x, nume: k };
      });
      if (r) return r;
    }
    return null;
  }
  function gasesteBloc(tinta, id) {
    let r = null;
    for (const top of tinta.blocuri) { parcurge(top, (x) => { if (x.id === id) r = x; }); if (r) break; }
    return r;
  }
  const topul = (tinta, b) => tinta.blocuri.find((t) => { let ok = false; parcurge(t, (x) => { if (x === b) ok = true; }); return ok; });

  // ---------- Blocurile mele ----------
  const definitii = (tinta) => tinta.blocuri.filter((b) => b.op === 'procedures_definition');
  const procDupaId = (tinta, id) => definitii(tinta).find((d) => d.proc.id === id)?.proc || null;
  const textProc = (p) => p.parts.map((x) => (x.t === 'l' ? x.text : x.t === 'b' ? `<${x.name}>` : `(${x.name})`)).join(' ');
  function blocDefinitie(proc) { const b = bloc('procedures_definition'); b.proc = proc; return b; }
  function blocApel(proc) {
    const b = bloc('procedures_call'); b.proc = proc.id;
    for (const p of proc.parts) if (p.t !== 'l') b.in[p.id] = { v: p.t === 'b' ? '' : '', b: null };
    return b;
  }
  function blocArg(nume, bool) { const b = bloc(bool ? 'argument_bool' : 'argument_reporter'); b.nume = nume; return b; }

  // Jetoanele unui bloc (pentru blocurile proprii se construiesc din definiție)
  function jetoane(b, tinta) {
    if (b.op === 'procedures_call') {
      const p = tinta && procDupaId(tinta, b.proc);
      if (!p) return [{ t: 'label', text: 'bloc șters' }];
      return p.parts.map((x) => (x.t === 'l' ? { t: 'label', text: x.text } : { t: 'arg', name: x.id, type: x.t === 'b' ? 'b' : 't', def: '' }));
    }
    if (b.op === 'argument_reporter' || b.op === 'argument_bool') return [{ t: 'label', text: b.nume || 'arg' }];
    if (b.op === 'event_whenthisspriteclicked' && tinta?.scena) return SPEC.event_whenstageclicked.toks;
    return SPEC[b.op].toks;
  }
  function forma(b) {
    const sh = SPEC[b.op].shape;
    if (b.op === 'control_stop') return b.in.STOP_OPTION?.v === 'alte scripturi ale personajului' ? 'cmd' : 'cap';
    if (b.op === 'procedures_definition') return 'def';
    return sh;
  }
  const culoriBloc = (b) => CAT[SPEC[b.op].cat];

  // ---------- Proiectul ----------
  let P = null; // proiectul curent
  const scena = () => P.tinte[0];
  const personaje = () => P.tinte.slice(1);
  const tintaDupaId = (id) => P.tinte.find((t) => t.id === id);
  const tintaDupaNume = (n) => P.tinte.find((t) => !t.scena && t.nume === n);
  function gasesteVar(tinta, id) { return tinta?.variabile?.find((v) => v.id === id) || scena().variabile.find((v) => v.id === id) || null; }
  function gasesteLista(tinta, id) { return tinta?.liste?.find((v) => v.id === id) || scena().liste.find((v) => v.id === id) || null; }
  const variabileVazute = (t) => [...scena().variabile, ...(t.scena ? [] : t.variabile)];
  const listeVazute = (t) => [...scena().liste, ...(t.scena ? [] : t.liste)];

  // Meniurile care depind de proiect
  function optiuniMeniu(meniu, tinta, b) {
    const altii = personaje().filter((p) => p !== tinta && p.id !== tinta?.sursa).map((p) => [p.nume, p.nume]);
    switch (meniu) {
      case 'tinteMers': return [['poziție aleatoare', '_random_'], ['cursorul mouse-ului', '_mouse_'], ...altii];
      case 'tinteSpre': return [['cursorul mouse-ului', '_mouse_'], ...altii];
      case 'atingere': return [['cursorul mouse-ului', '_mouse_'], ['marginea', '_edge_'], ...altii];
      case 'clone': return [['eu însumi', '_myself_'], ...altii];
      case 'costume': return tinta.costume.map((c) => [c.nume, c.nume]);
      case 'decoruri': return scena().costume.map((c) => [c.nume, c.nume]);
      case 'decoruriSchimba': return [...scena().costume.map((c) => [c.nume, c.nume]), ['decorul următor', '_next_'], ['decorul anterior', '_prev_'], ['decor aleatoriu', '_random_']];
      case 'sunete': return (tinta.sunete || []).map((s) => [s.nume, s.nume]);
      case 'mesaje': return [...P.mesaje.map((m) => [m, m]), ['Mesaj nou…', '__nou']];
      case 'var': return [...variabileVazute(tinta).map((v) => [v.nume, v.id]), ['Redenumește variabila…', '__redenumeste'], ['Șterge variabila', '__sterge']];
      case 'lista': return [...listeVazute(tinta).map((v) => [v.nume, v.id]), ['Redenumește lista…', '__redenumeste'], ['Șterge lista', '__sterge']];
      default: return MENIURI_STATICE[meniu] || [];
    }
  }
  function eticheta(tok, v, tinta) {
    if (tok.type === 'v') return gasesteVar(tinta, v)?.nume ?? '?';
    if (tok.type === 'l') return gasesteLista(tinta, v)?.nume ?? '?';
    if (tok.menu === 'instrumente') return `(${v}) ${INSTRUMENTE[num(v) - 1] || ''}`;
    if (tok.menu && tinta) { const o = optiuniMeniu(tok.menu, tinta).find((x) => x[1] === v); if (o) return o[0]; }
    return v === '' ? ' ' : String(v);
  }

  // ---------- Personaje și decoruri desenate prin cod ----------
  // Fiecare costum: { w, h, f(ctx) } cu originea în centrul costumului; se pre-desenează la rezoluție dublă.
  const REZ = 2;
  function elipsa(c, x, y, rx, ry, umplere, contur, gros = 2, rot = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    if (umplere) { c.fillStyle = umplere; c.fill(); }
    if (contur) { c.strokeStyle = contur; c.lineWidth = gros; c.stroke(); }
  }
  function poli(c, pts, umplere, contur, gros = 2) {
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    if (umplere) { c.fillStyle = umplere; c.fill(); }
    if (contur) { c.strokeStyle = contur; c.lineWidth = gros; c.lineJoin = 'round'; c.stroke(); }
  }
  function drept(c, x, y, w, hh, r, umplere, contur, gros = 2) {
    c.beginPath(); c.roundRect(x, y, w, hh, r);
    if (umplere) { c.fillStyle = umplere; c.fill(); }
    if (contur) { c.strokeStyle = contur; c.lineWidth = gros; c.stroke(); }
  }
  function linie(c, pts, cul, gros, cap = 'round') {
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = cul; c.lineWidth = gros; c.lineCap = cap; c.lineJoin = 'round'; c.stroke();
  }
  function stea(c, x, y, r1, r2, n, rot, umplere, contur, gros = 2) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n; const r = i % 2 ? r2 : r1; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    poli(c, pts, umplere, contur, gros);
  }
  // Pisica (orientată spre dreapta, direcția 90)
  function pisica(c, faza) {
    const O = '#FFAB19', D = '#B86A00', C = '#FFF3DD';
    const picior = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); drept(c, -6, -2, 12, 24, 6, O, D); elipsa(c, 1, 22, 8, 5, C, D); c.restore(); };
    // coada
    const coada = faza === 2 ? [[-26, 6], [-44, -4], [-50, -26]] : [[-26, 8], [-46, 10], [-52, -14]];
    linie(c, coada, D, 13); linie(c, coada, O, 9);
    // picioarele din spate
    if (faza === 1) { picior(-18, 20, 0.35); picior(14, 20, -0.35); } else if (faza === 2) { picior(-20, 16, 0.9); picior(16, 16, -0.9); } else { picior(-18, 20, 0.1); picior(14, 20, -0.1); }
    elipsa(c, -4, 10, 30, 20, O, D);
    elipsa(c, 2, 16, 16, 10, C);
    if (faza === 1) { picior(-8, 22, -0.3); picior(22, 20, 0.4); } else if (faza === 2) { picior(-6, 16, 1.1); picior(24, 12, -1.3); } else if (faza === 3) { picior(-8, 22, 0); c.save(); c.translate(26, 4); c.rotate(-2.3); drept(c, -6, -2, 12, 26, 6, O, D); c.restore(); } else { picior(-8, 22, 0); picior(22, 22, 0); }
    // capul
    poli(c, [[6, -32], [4, -60], [24, -42]], O, D); poli(c, [[26, -44], [44, -60], [44, -30]], O, D);
    poli(c, [[9, -38], [8, -52], [19, -42]], '#FFB3C7'); poli(c, [[30, -42], [41, -53], [41, -36]], '#FFB3C7');
    elipsa(c, 24, -22, 26, 22, O, D);
    elipsa(c, 34, -10, 13, 9, C);
    elipsa(c, 16, -26, 6, 8, '#fff', D, 1.5); elipsa(c, 34, -26, 6, 8, '#fff', D, 1.5);
    elipsa(c, 18, -25, 3, 4, '#222'); elipsa(c, 36, -25, 3, 4, '#222');
    poli(c, [[40, -15], [46, -15], [43, -11]], '#E85B7A');
    linie(c, [[43, -11], [43, -7], [38, -5]], D, 1.5); linie(c, [[43, -7], [47, -5]], D, 1.5);
    linie(c, [[48, -12], [62, -15]], D, 1); linie(c, [[48, -9], [62, -8]], D, 1);
  }
  function robot(c, faza) {
    const G = '#9AA7B8', D = '#4A5568', ochi = faza === 2 ? '#FF5A5A' : '#36E0FF';
    linie(c, [[0, -44], [0, -56]], D, 3); elipsa(c, 0, -58, 5, 5, faza === 1 ? '#FFD23F' : '#FF6B6B', D, 2);
    drept(c, -24, -44, 48, 34, 8, G, D, 2.5);
    elipsa(c, -10, -28, 7, 7, '#1E2533'); elipsa(c, 10, -28, 7, 7, '#1E2533');
    elipsa(c, -10, -28, 4, 4, ochi); elipsa(c, 10, -28, 4, 4, ochi);
    if (faza === 2) linie(c, [[-10, -17], [0, -13], [10, -17]], D, 2.5); else drept(c, -10, -18, 20, 4, 2, D);
    drept(c, -6, -10, 12, 6, 2, D);
    const brat = (x, s, a) => { c.save(); c.translate(x, -2); c.rotate(a * s); drept(c, -5, 0, 10, 30, 5, G, D, 2.5); elipsa(c, 0, 32, 6, 6, D); c.restore(); };
    if (faza === 1) { brat(-27, 1, 2.6); brat(27, -1, 2.6); } else { brat(-27, 1, 0.25); brat(27, -1, 0.25); }
    drept(c, -26, -4, 52, 40, 8, '#B9C4D2', D, 2.5);
    drept(c, -14, 4, 28, 16, 4, '#2D3748'); elipsa(c, -6, 12, 3, 3, '#48BB78'); elipsa(c, 4, 12, 3, 3, faza === 2 ? '#F56565' : '#ECC94B');
    drept(c, -20, 36, 14, 14, 3, D); drept(c, 6, 36, 14, 14, 3, D);
  }
  function minge(cul, cul2) {
    return (c) => {
      const g = c.createRadialGradient(-8, -8, 2, 0, 0, 24); g.addColorStop(0, '#fff'); g.addColorStop(0.25, cul); g.addColorStop(1, cul2);
      elipsa(c, 0, 0, 22, 22, g, cul2, 2);
      c.save(); c.beginPath(); c.arc(0, 0, 21, 0, Math.PI * 2); c.clip();
      linie(c, [[-24, 6], [-8, 2], [8, 6], [24, 2]], 'rgba(255,255,255,.75)', 4); c.restore();
    };
  }
  function steaDes(faza) {
    return (c) => {
      stea(c, 0, 0, 34, 15, 5, -Math.PI / 2 + (faza ? 0.2 : 0), faza ? '#FFE066' : '#FFD500', '#E0A800', 2.5);
      elipsa(c, -6, -2, 2.5, 3.5, '#5a3d00'); elipsa(c, 6, -2, 2.5, 3.5, '#5a3d00');
      c.beginPath(); c.arc(0, 4, 5, 0.2, Math.PI - 0.2); c.strokeStyle = '#5a3d00'; c.lineWidth = 1.6; c.stroke();
      if (faza) { stea(c, 30, -28, 6, 2, 4, 0, '#fff'); stea(c, -32, 22, 5, 2, 4, 0, '#fff'); }
    };
  }
  function crab(faza) {
    return (c) => {
      const R = '#F25C3D', D = '#A12B12';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) linie(c, [[s * 18, 8 + i * 4], [s * 32, 16 + i * 6], [s * 36, 26 + i * 4]], D, 3);
      const cleste = (s) => {
        linie(c, [[s * 22, -2], [s * 34, -14]], D, 4);
        c.save(); c.translate(s * 38, -22); c.rotate(s * (faza ? 0.5 : 0.1));
        elipsa(c, 0, 0, 11, 9, R, D); poli(c, [[s * 2, -3], [s * 14, -10], [s * 6, 2]], faza ? '#fff0' : R, D, 1.5); c.restore();
      };
      cleste(-1); cleste(1);
      elipsa(c, 0, 6, 28, 18, R, D, 2.5);
      linie(c, [[-8, -8], [-10, -22]], D, 3); linie(c, [[8, -8], [10, -22]], D, 3);
      elipsa(c, -10, -24, 6, 6, '#fff', D); elipsa(c, 10, -24, 6, 6, '#fff', D);
      elipsa(c, -9, -24, 3, 3, '#222'); elipsa(c, 11, -24, 3, 3, '#222');
      c.beginPath(); c.arc(0, 8, 8, 0.3, Math.PI - 0.3); c.strokeStyle = D; c.lineWidth = 2; c.stroke();
    };
  }
  function pesteDes(cul, cul2) {
    return (c) => {
      poli(c, [[-22, 0], [-42, -16], [-38, 0], [-42, 16]], cul2, '#333', 2);
      poli(c, [[-4, -16], [8, -28], [14, -14]], cul2, '#333', 1.5);
      elipsa(c, 0, 0, 28, 17, cul, '#333', 2);
      linie(c, [[-8, -12], [-4, 0], [-8, 12]], cul2, 2.5);
      elipsa(c, 14, -4, 6, 6, '#fff', '#333', 1.5); elipsa(c, 16, -4, 3, 3, '#111');
      c.beginPath(); c.arc(22, 6, 4, 0.2, 2.2); c.strokeStyle = '#333'; c.lineWidth = 1.5; c.stroke();
    };
  }
  function mar(cul, cul2) {
    return (c) => {
      linie(c, [[0, -18], [3, -30]], '#6B4423', 3.5);
      c.save(); c.translate(10, -28); c.rotate(-0.5); elipsa(c, 0, 0, 10, 5, '#4CAF50', '#2E7D32', 1.5); c.restore();
      c.beginPath(); c.moveTo(0, -16);
      c.bezierCurveTo(14, -26, 30, -14, 26, 4); c.bezierCurveTo(23, 22, 10, 28, 0, 22);
      c.bezierCurveTo(-10, 28, -23, 22, -26, 4); c.bezierCurveTo(-30, -14, -14, -26, 0, -16);
      c.fillStyle = cul; c.fill(); c.strokeStyle = cul2; c.lineWidth = 2; c.stroke();
      elipsa(c, -12, -6, 4, 7, 'rgba(255,255,255,.55)', null, 0, 0.4);
    };
  }
  function sageata(cul, cul2) {
    return (c) => { poli(c, [[22, 0], [-14, -16], [-6, 0], [-14, 16]], cul, cul2, 2.5); elipsa(c, 0, 0, 2.5, 2.5, '#fff'); };
  }
  function pinguin(faza) {
    return (c) => {
      const N = '#2B2D42';
      const aripa = (s) => { c.save(); c.translate(s * 20, -4); c.rotate(s * (faza ? -0.9 : 0.25)); elipsa(c, 0, 14, 7, 18, N); c.restore(); };
      aripa(-1); aripa(1);
      elipsa(c, 0, 6, 24, 34, N); elipsa(c, 0, 12, 16, 26, '#fff');
      elipsa(c, 0, -26, 18, 16, N); elipsa(c, -6, -26, 7, 8, '#fff'); elipsa(c, 6, -26, 7, 8, '#fff');
      elipsa(c, -5, -26, 3, 3.5, '#111'); elipsa(c, 7, -26, 3, 3.5, '#111');
      poli(c, [[-5, -19], [5, -19], [0, -12]], '#FF9F1C');
      elipsa(c, -10, 40, 9, 4, '#FF9F1C'); elipsa(c, 10, 40, 9, 4, '#FF9F1C');
    };
  }
  const DESENE = {
    'pisica-a': { w: 128, h: 130, f: (c) => pisica(c, 0) },
    'pisica-b': { w: 128, h: 130, f: (c) => pisica(c, 1) },
    'pisica-sare': { w: 128, h: 130, f: (c) => pisica(c, 2) },
    'pisica-salut': { w: 128, h: 130, f: (c) => pisica(c, 3) },
    'robot-a': { w: 80, h: 124, f: (c) => robot(c, 0) },
    'robot-b': { w: 80, h: 124, f: (c) => robot(c, 1) },
    'robot-c': { w: 80, h: 124, f: (c) => robot(c, 2) },
    'minge-rosie': { w: 50, h: 50, f: minge('#FF4D4D', '#B71C1C') },
    'minge-albastra': { w: 50, h: 50, f: minge('#4C97FF', '#1A4F9C') },
    'minge-verde': { w: 50, h: 50, f: minge('#4CD964', '#1B7A2E') },
    'stea-a': { w: 76, h: 76, f: steaDes(0) },
    'stea-b': { w: 76, h: 76, f: steaDes(1) },
    'crab-a': { w: 104, h: 76, f: crab(0) },
    'crab-b': { w: 104, h: 76, f: crab(1) },
    'peste-portocaliu': { w: 90, h: 60, f: pesteDes('#FF9F43', '#EE5A24') },
    'peste-albastru': { w: 90, h: 60, f: pesteDes('#48DBFB', '#0ABDE3') },
    'peste-verde': { w: 90, h: 60, f: pesteDes('#7BED9F', '#2ED573') },
    'mar-rosu': { w: 60, h: 66, f: mar('#E53935', '#9A1B1B') },
    'mar-verde': { w: 60, h: 66, f: mar('#8BC34A', '#4E7A1F') },
    'sageata-albastra': { w: 48, h: 36, f: sageata('#4C97FF', '#1A4F9C') },
    'sageata-verde': { w: 48, h: 36, f: sageata('#0FBD8C', '#0B6E52') },
    'pinguin-a': { w: 64, h: 92, f: pinguin(0) },
    'pinguin-b': { w: 64, h: 92, f: pinguin(1) },
  };
  // Biblioteca de personaje: costume (nume afișat, desen) și sunete
  const BIBLIOTECA = [
    { tip: 'pisica', nume: 'Pisica', costume: [['pisica-a', 'pas 1'], ['pisica-b', 'pas 2'], ['pisica-sare', 'sare'], ['pisica-salut', 'salută']], sunete: ['Miau', 'Pop'] },
    { tip: 'robot', nume: 'Robot', costume: [['robot-a', 'robot 1'], ['robot-b', 'robot 2'], ['robot-c', 'robot 3']], sunete: ['Bip', 'Laser'] },
    { tip: 'minge', nume: 'Minge', costume: [['minge-rosie', 'roșie'], ['minge-albastra', 'albastră'], ['minge-verde', 'verde']], sunete: ['Boing', 'Pop'] },
    { tip: 'stea', nume: 'Stea', costume: [['stea-a', 'stea 1'], ['stea-b', 'stea 2']], sunete: ['Colectează', 'Clopoțel'] },
    { tip: 'crab', nume: 'Crab', costume: [['crab-a', 'crab 1'], ['crab-b', 'crab 2']], sunete: ['Oops', 'Pop'] },
    { tip: 'peste', nume: 'Pește', costume: [['peste-portocaliu', 'portocaliu'], ['peste-albastru', 'albastru'], ['peste-verde', 'verde']], sunete: ['Bule', 'Pop'] },
    { tip: 'mar', nume: 'Măr', costume: [['mar-rosu', 'roșu'], ['mar-verde', 'verde']], sunete: ['Pop', 'Colectează'] },
    { tip: 'sageata', nume: 'Săgeată', costume: [['sageata-albastra', 'albastră'], ['sageata-verde', 'verde']], sunete: ['Bip'] },
    { tip: 'pinguin', nume: 'Pinguin', costume: [['pinguin-a', 'pinguin 1'], ['pinguin-b', 'pinguin 2']], sunete: ['Bule', 'Aplauze'] },
  ];
  // Decoruri (480×360)
  function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  const DECORURI = {
    alb: { nume: 'alb', f: (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 480, 360); } },
    grila: {
      nume: 'grilă xy', f: (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 480, 360);
        for (let x = 0; x <= 480; x += 20) linie(c, [[x, 0], [x, 360]], x % 100 === 40 ? '#c9d6ea' : '#edf1f7', 1, 'butt');
        for (let y = 0; y <= 360; y += 20) linie(c, [[0, y], [480, y]], y % 100 === 80 ? '#c9d6ea' : '#edf1f7', 1, 'butt');
        linie(c, [[0, 180], [480, 180]], '#6b7c93', 1.5); linie(c, [[240, 0], [240, 360]], '#6b7c93', 1.5);
        c.fillStyle = '#4a5568'; c.font = '600 10px sans-serif';
        for (let x = -200; x <= 200; x += 100) if (x) c.fillText(String(x), 240 + x + 3, 192);
        for (let y = -100; y <= 100; y += 100) if (y) c.fillText(String(y), 244, 180 - y - 3);
        c.fillText('x', 470, 172); c.fillText('y', 246, 10); c.fillText('0', 244, 192);
      },
    },
    parc: {
      nume: 'parc', f: (c) => {
        const g = c.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#8EC5FF'); g.addColorStop(1, '#D9EEFF'); c.fillStyle = g; c.fillRect(0, 0, 480, 360);
        elipsa(c, 410, 56, 30, 30, '#FFE066');
        for (const [x, y] of [[90, 60], [260, 40]]) { elipsa(c, x, y, 34, 14, '#fff'); elipsa(c, x + 22, y - 8, 22, 14, '#fff'); elipsa(c, x - 20, y - 4, 18, 11, '#fff'); }
        elipsa(c, 120, 300, 260, 90, '#7CCB5C'); elipsa(c, 400, 310, 220, 80, '#69B84A');
        c.fillStyle = '#5DAA3F'; c.fillRect(0, 280, 480, 80);
        for (const x of [60, 400]) { drept(c, x - 7, 190, 14, 70, 3, '#8B5A2B'); elipsa(c, x, 180, 40, 42, '#3E9B3A'); elipsa(c, x - 18, 196, 24, 22, '#4CAF50'); elipsa(c, x + 18, 166, 22, 20, '#4CAF50'); }
        const r = rng(7); for (let i = 0; i < 30; i++) elipsa(c, r() * 480, 290 + r() * 65, 3, 3, ['#FF6B9A', '#FFE066', '#fff'][i % 3]);
      },
    },
    stele: {
      nume: 'cer înstelat', f: (c) => {
        const g = c.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#0B1033'); g.addColorStop(1, '#2A1A5E'); c.fillStyle = g; c.fillRect(0, 0, 480, 360);
        const r = rng(3); for (let i = 0; i < 110; i++) elipsa(c, r() * 480, r() * 360, r() * 1.4 + 0.3, r() * 1.4 + 0.3, `rgba(255,255,255,${0.4 + r() * 0.6})`);
        elipsa(c, 390, 70, 26, 26, '#FFF6D5'); elipsa(c, 400, 62, 22, 22, '#151A45');
        stea(c, 80, 60, 6, 2.5, 4, 0, '#fff'); stea(c, 300, 120, 5, 2, 4, 0, '#fff');
      },
    },
    subacvatic: {
      nume: 'subacvatic', f: (c) => {
        const g = c.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#4FC3F7'); g.addColorStop(1, '#0D47A1'); c.fillStyle = g; c.fillRect(0, 0, 480, 360);
        c.fillStyle = '#E8D6A0'; c.beginPath(); c.moveTo(0, 330); c.quadraticCurveTo(240, 300, 480, 335); c.lineTo(480, 360); c.lineTo(0, 360); c.fill();
        for (const x of [40, 70, 420, 450]) linie(c, [[x, 345], [x - 10, 300], [x + 8, 260], [x - 4, 230]], '#2E7D32', 7);
        const r = rng(11); for (let i = 0; i < 18; i++) elipsa(c, r() * 480, r() * 300, 3 + r() * 5, 3 + r() * 5, null, 'rgba(255,255,255,.6)', 1.5);
      },
    },
    labirint: {
      nume: 'labirint', f: (c) => {
        c.fillStyle = '#FFFBEA'; c.fillRect(0, 0, 480, 360);
        const ziduri = [[0, 0, 480, 12], [0, 348, 480, 12], [0, 0, 12, 360], [468, 0, 12, 290], [90, 0, 12, 260], [90, 248, 120, 12], [190, 80, 12, 180], [190, 80, 110, 12], [290, 80, 12, 200], [290, 180, 90, 12], [380, 80, 12, 112], [380, 270, 88, 12], [200, 330, 12, 30]];
        c.fillStyle = '#000'; for (const [x, y, w, hh] of ziduri) c.fillRect(x, y, w, hh);
        c.fillStyle = '#E53935'; c.fillRect(468, 290, 12, 58);
        c.fillStyle = '#9A1B1B'; c.font = '700 12px sans-serif'; c.fillText('IEȘIRE', 418, 322);
        c.fillStyle = '#2E7D32'; c.fillText('START', 24, 330);
      },
    },
    tabla: {
      nume: 'tablă', f: (c) => {
        c.fillStyle = '#8B5A2B'; c.fillRect(0, 0, 480, 360);
        c.fillStyle = '#2F5D46'; c.fillRect(16, 16, 448, 312);
        c.fillStyle = '#C49A6C'; c.fillRect(0, 328, 480, 32);
        drept(c, 380, 334, 30, 8, 2, '#fff'); drept(c, 330, 334, 40, 10, 2, '#7a4a1e');
        c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 6; c.beginPath(); c.moveTo(60, 120); c.quadraticCurveTo(200, 60, 320, 130); c.stroke();
      },
    },
    scena: {
      nume: 'scenă de teatru', f: (c) => {
        c.fillStyle = '#3B0A0A'; c.fillRect(0, 0, 480, 360);
        c.fillStyle = '#7A3E1D'; c.fillRect(0, 290, 480, 70);
        for (let i = 0; i < 480; i += 40) linie(c, [[i, 290], [i - 20, 360]], '#5E2E14', 2);
        const cortina = (x0, dir) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#B71C1C' : '#D32F2F'; c.fillRect(x0 + dir * i * 14, 0, dir * 14, 290); } };
        cortina(0, 1); cortina(480, -1);
        c.fillStyle = '#B71C1C'; c.fillRect(0, 0, 480, 34); elipsa(c, 240, 20, 70, 14, '#FFD54F');
      },
    },
  };

  // Cache-ul imaginilor pre-desenate
  const cacheCostum = new Map();
  function imagineCostum(desen) {
    if (cacheCostum.has(desen)) return cacheCostum.get(desen);
    const d = DESENE[desen] || DESENE['minge-rosie'];
    const cv = document.createElement('canvas'); cv.width = d.w * REZ; cv.height = d.h * REZ;
    const c = cv.getContext('2d'); c.scale(REZ, REZ); c.translate(d.w / 2, d.h / 2); d.f(c);
    const r = { cv, w: d.w, h: d.h };
    cacheCostum.set(desen, r); return r;
  }
  const cacheDecor = new Map();
  function imagineDecor(desen) {
    if (cacheDecor.has(desen)) return cacheDecor.get(desen);
    const cv = document.createElement('canvas'); cv.width = 480 * REZ; cv.height = 360 * REZ;
    const c = cv.getContext('2d'); c.scale(REZ, REZ); (DECORURI[desen] || DECORURI.alb).f(c);
    cacheDecor.set(desen, cv); return cv;
  }
  // Miniatură (dataURL) pentru liste
  const cacheMini = new Map();
  function miniatura(desen, decor) {
    const k = (decor ? 'd:' : 'c:') + desen;
    if (cacheMini.has(k)) return cacheMini.get(k);
    const cv = document.createElement('canvas');
    if (decor) { cv.width = 96; cv.height = 72; cv.getContext('2d').drawImage(imagineDecor(desen), 0, 0, 96, 72); }
    else {
      const im = imagineCostum(desen); cv.width = 80; cv.height = 80;
      const k2 = Math.min(72 / im.w, 72 / im.h, 1.2); const w = im.w * k2, hh = im.h * k2;
      cv.getContext('2d').drawImage(im.cv, (80 - w) / 2, (80 - hh) / 2, w, hh);
    }
    const u = cv.toDataURL('image/png'); cacheMini.set(k, u); return u;
  }

  // Personaj nou din bibliotecă
  function personajNou(tip, nume) {
    const L = BIBLIOTECA.find((x) => x.tip === tip) || BIBLIOTECA[0];
    let n = nume || L.nume, i = 2;
    while (P && P.tinte.some((t) => t.nume === n)) n = `${nume || L.nume}${i++}`;
    return {
      id: uid(), nume: n, tip: L.tip, costume: L.costume.map(([desen, nm]) => ({ nume: nm, desen })), costum: 0,
      sunete: L.sunete.map((s) => ({ nume: s })), x: 0, y: 0, dir: 90, marime: 100, vizibil: true, stil: 'toate direcțiile',
      variabile: [], liste: [], blocuri: [], comentarii: [], volum: 100,
    };
  }
  function scenaNoua() {
    return { id: 'scena', scena: true, nume: 'Scena', costume: [{ nume: 'alb', desen: 'alb' }], costum: 0, sunete: [{ nume: 'Tobă' }], variabile: [], liste: [], blocuri: [], comentarii: [], volum: 100 };
  }
  function proiectNou(nume = 'Proiectul meu') {
    const p = { format: 'edudigi-blocuri', versiune: 1, nume, tinte: [scenaNoua()], mesaje: ['mesaj1'], monitoare: {}, tempo: 60 };
    const P0 = P; P = p;
    const pis = personajNou('pisica'); p.tinte.push(pis);
    P = P0;
    return p;
  }
  // Normalizează un proiect încărcat (din fișier sau din stocare)
  function normalizeaza(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.tinte) || !p.tinte.length) throw new Error('Fișierul nu este un proiect „Programare cu blocuri”.');
    p.mesaje = Array.isArray(p.mesaje) ? p.mesaje.map(String) : ['mesaj1'];
    p.monitoare = p.monitoare && typeof p.monitoare === 'object' ? p.monitoare : {};
    p.tempo = num(p.tempo) || 60;
    p.nume = String(p.nume || 'Proiect');
    if (!p.tinte[0].scena) p.tinte.unshift(scenaNoua());
    for (const t of p.tinte) {
      t.id = String(t.id || uid());
      t.costume = Array.isArray(t.costume) && t.costume.length ? t.costume : (t.scena ? [{ nume: 'alb', desen: 'alb' }] : [{ nume: 'minge', desen: 'minge-rosie' }]);
      t.costum = clamp(Math.round(num(t.costum)), 0, t.costume.length - 1);
      t.sunete = Array.isArray(t.sunete) ? t.sunete : [];
      t.variabile = Array.isArray(t.variabile) ? t.variabile : [];
      t.liste = Array.isArray(t.liste) ? t.liste : [];
      t.blocuri = Array.isArray(t.blocuri) ? t.blocuri.filter((b) => b && SPEC[b.op]) : [];
      t.comentarii = Array.isArray(t.comentarii) ? t.comentarii : [];
      t.volum = t.volum == null ? 100 : num(t.volum);
      const repara = (b) => { parcurge(b, (x) => { x.in = x.in || {}; x.sub = x.sub || []; x.next = x.next || null; if (!x.id) x.id = uid(); const sp = SPEC[x.op]; if (sp.shape === 'c' || sp.shape === 'capc') x.sub.length = Math.max(1, x.sub.length); if (sp.shape === 'c2') x.sub.length = 2; for (let i = 0; i < x.sub.length; i++) x.sub[i] = x.sub[i] || null; }); };
      // blocurile necunoscute dintr-un fișier stricat sunt eliminate
      const curata = (b) => { if (!b || !SPEC[b.op]) return null; for (const k in b.in || {}) if (b.in[k]?.b) b.in[k].b = curata(b.in[k].b); b.sub = (b.sub || []).map(curata); b.next = curata(b.next); return b; };
      t.blocuri = t.blocuri.map(curata).filter(Boolean); t.blocuri.forEach(repara);
      t.blocuri.forEach((b) => { b.x = num(b.x); b.y = num(b.y); });
      if (!t.scena) {
        t.x = num(t.x); t.y = num(t.y); t.dir = t.dir == null ? 90 : num(t.dir); t.marime = t.marime == null ? 100 : num(t.marime);
        t.vizibil = t.vizibil !== false; t.stil = t.stil || 'toate direcțiile';
      }
    }
    return p;
  }

  // ---------- Desenarea blocurilor (SVG) ----------
  const FONT = '600 12px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const RC = 4, NX = 12, NW = 24, ND = 6, ARM = 16, CAP = 18;
  const NF = 'c 1.5 0 2.25 0.75 3 1.5 l 3 3 c 0.75 0.75 1.5 1.5 3 1.5 h 6 c 1.5 0 2.25 -0.75 3 -1.5 l 3 -3 c 0.75 -0.75 1.5 -1.5 3 -1.5';
  const NB = 'c -1.5 0 -2.25 0.75 -3 1.5 l -3 3 c -0.75 0.75 -1.5 1.5 -3 1.5 h -6 c -1.5 0 -2.25 -0.75 -3 -1.5 l -3 -3 c -0.75 -0.75 -1.5 -1.5 -3 -1.5';
  const ctxMasura = document.createElement('canvas').getContext('2d');
  const cacheLat = new Map();
  function latime(t) {
    t = String(t);
    if (cacheLat.has(t)) return cacheLat.get(t);
    ctxMasura.font = FONT; const w = Math.ceil(ctxMasura.measureText(t).width);
    if (cacheLat.size > 4000) cacheLat.clear();
    cacheLat.set(t, w); return w;
  }
  function caleCmd(W, H, sus, jos) {
    let d = sus === 'hat' ? `M 0 ${CAP} c 25 -22 71 -22 96 0 H ${W - RC} a ${RC} ${RC} 0 0 1 ${RC} ${RC}`
      : `M 0 ${RC} a ${RC} ${RC} 0 0 1 ${RC} ${-RC} H ${NX} ${NF} H ${W - RC} a ${RC} ${RC} 0 0 1 ${RC} ${RC}`;
    d += ` V ${H - RC} a ${RC} ${RC} 0 0 1 ${-RC} ${RC}`;
    if (jos) d += ` H ${NX + NW} ${NB}`;
    return d + ` H ${RC} a ${RC} ${RC} 0 0 1 ${-RC} ${-RC} Z`;
  }
  function caleC(W, seg, jos) {
    let d = `M 0 ${RC} a ${RC} ${RC} 0 0 1 ${RC} ${-RC} H ${NX} ${NF} H ${W - RC} a ${RC} ${RC} 0 0 1 ${RC} ${RC}`;
    let y = 0;
    for (const s of seg) {
      y += s.h;
      if (s.fel === 'rand') d += ` V ${y - RC} a ${RC} ${RC} 0 0 1 ${-RC} ${RC} H ${ARM + NX + NW} ${NB} H ${ARM + RC} a ${RC} ${RC} 0 0 0 ${-RC} ${RC}`;
      else if (s.fel === 'gura') d += ` V ${y - RC} a ${RC} ${RC} 0 0 0 ${RC} ${RC} H ${ARM + NX} ${NF} H ${W - RC} a ${RC} ${RC} 0 0 1 ${RC} ${RC}`;
      else { d += ` V ${y - RC} a ${RC} ${RC} 0 0 1 ${-RC} ${RC}`; if (jos) d += ` H ${NX + NW} ${NB}`; d += ` H ${RC} a ${RC} ${RC} 0 0 1 ${-RC} ${-RC} Z`; }
    }
    return d;
  }
  const caleRap = (W, H) => `M ${H / 2} 0 H ${W - H / 2} a ${H / 2} ${H / 2} 0 0 1 0 ${H} H ${H / 2} a ${H / 2} ${H / 2} 0 0 1 0 ${-H} Z`;
  const caleHex = (W, H) => `M ${H / 2} 0 H ${W - H / 2} L ${W} ${H / 2} L ${W - H / 2} ${H} H ${H / 2} L 0 ${H / 2} Z`;

  function iconita(nume) {
    const g = sv('g', { class: 'ap-blocuri-ic' });
    if (nume === 'steag') {
      g.append(sv('path', { d: 'M4 2 V20', stroke: '#45993D', 'stroke-width': 2, 'stroke-linecap': 'round' }),
        sv('path', { d: 'M5 3 c4 -2.5 7 2.5 12 0 v9 c-5 2.5 -8 -2.5 -12 0 z', fill: '#4CBF56', stroke: '#45993D', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }));
      return { el: g, w: 20, h: 22 };
    }
    if (nume === 'dreapta' || nume === 'stanga') {
      const p = sv('path', { d: 'M15 5.5 A6.5 6.5 0 1 0 16.5 11', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
      const v = sv('path', { d: 'M11 4.5 L16 5 L15.5 0.5', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      const gi = sv('g', { transform: nume === 'stanga' ? 'translate(20 2) scale(-1 1)' : 'translate(0 2)' }, p, v);
      g.append(gi); return { el: g, w: 20, h: 20 };
    }
    if (nume === 'creion') {
      g.append(sv('g', { transform: 'translate(2 1) rotate(45 10 10)' },
        sv('rect', { x: 7, y: -1, width: 6, height: 15, rx: 1, fill: '#fff' }),
        sv('path', { d: 'M7 14 L10 20 L13 14 Z', fill: '#ffd8a8' }), sv('path', { d: 'M9.2 18.4 L10 20 L10.8 18.4 Z', fill: '#333' })),
        sv('line', { x1: 26, y1: 0, x2: 26, y2: 22, stroke: 'rgba(0,0,0,.18)', 'stroke-width': 1 }));
      return { el: g, w: 28, h: 22 };
    }
    return { el: g, w: 0, h: 0 };
  }

  const recGol = () => ({ blocuri: [], sloturi: [], con: [] });
  function adaugaRec(dest, src, dx, dy) {
    for (const r of src.blocuri) dest.blocuri.push({ ...r, x: r.x + dx, y: r.y + dy });
    for (const r of src.sloturi) dest.sloturi.push({ ...r, x: r.x + dx, y: r.y + dy });
    for (const r of src.con) dest.con.push({ ...r, x: r.x + dx, y: r.y + dy });
  }
  // Un slot gol (număr, text, boolean, meniu, culoare)
  function slot(tok, inp, b, tinta, cul, paleta) {
    const g = sv('g', { class: 'ap-blocuri-slot', 'data-slot': tok.name, 'data-owner': b.id });
    const H = 24;
    if (tok.type === 'b') {
      g.append(sv('path', { d: caleHex(40, H), fill: cul.ter }));
      return { el: g, w: 40, h: H };
    }
    if (tok.type === 'c') {
      g.append(sv('rect', { x: 0, y: 0, width: 40, height: H, rx: 12, fill: inp.v || '#000', stroke: '#fff', 'stroke-width': 2 }));
      return { el: g, w: 40, h: H };
    }
    if (tok.type === 'n' || tok.type === 't') {
      const tx = String(inp.v ?? '');
      const w = Math.max(tok.type === 'n' ? 32 : 36, latime(tx) + 18);
      g.append(sv('rect', { x: 0, y: 0, width: w, height: H, rx: 12, fill: '#fff', stroke: 'rgba(0,0,0,.15)', 'stroke-width': 1 }),
        sv('text', { x: w / 2, y: H / 2 + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ap-blocuri-tslot' }, tx));
      return { el: g, w, h: H };
    }
    // meniuri (m, d, v, l)
    const tx = eticheta(tok, inp.v, tinta);
    const w = latime(tx) + 30;
    const rx = tok.type === 'd' ? 12 : 4;
    g.append(sv('rect', { x: 0, y: 0, width: w, height: H, rx, fill: cul.sec, stroke: cul.ter, 'stroke-width': 1 }),
      sv('text', { x: 9, y: H / 2 + 0.5, 'dominant-baseline': 'central', class: 'ap-blocuri-t' }, tx),
      sv('path', { d: `M ${w - 17} ${H / 2 - 2} l 4 4 l 4 -4`, fill: 'none', stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return { el: g, w, h: H };
  }

  // Desenează un bloc (fără continuarea lui). Întoarce { el, w, h, rec } cu poziții relative.
  function deseneazaBloc(b, tinta, paleta = false) {
    const sh = forma(b), cul = culoriBloc(b);
    const g = sv('g', { class: 'ap-blocuri-bloc', 'data-id': b.id });
    const rec = recGol();
    const rap = sh === 'rep' || sh === 'bool';
    // RCândul principal
    const elemente = [];
    if (sh === 'def') {
      elemente.push({ fel: 'label', el: sv('text', { class: 'ap-blocuri-t', 'dominant-baseline': 'central' }, 'definește'), w: latime('definește'), h: 12 });
      elemente.push(prototip(b, cul));
    } else {
      for (const tok of jetoane(b, tinta)) {
        if (tok.t === 'label') elemente.push({ fel: 'label', el: sv('text', { class: 'ap-blocuri-t', 'dominant-baseline': 'central' }, tok.text), w: latime(tok.text), h: 12 });
        else if (tok.t === 'icon') { const ic = iconita(tok.name); elemente.push({ fel: 'icon', ...ic }); }
        else if (tok.type === 'x') {
          const nume = b.op === 'data_variable' ? gasesteVar(tinta, b.in[tok.name]?.v)?.nume ?? '?' : gasesteLista(tinta, b.in[tok.name]?.v)?.nume ?? '?';
          elemente.push({ fel: 'label', el: sv('text', { class: 'ap-blocuri-t', 'dominant-baseline': 'central' }, nume), w: latime(nume), h: 12 });
        } else {
          const inp = b.in[tok.name] || (b.in[tok.name] = { v: tok.def, b: null });
          if (inp.b) {
            const r = deseneazaBloc(inp.b, tinta, paleta);
            elemente.push({ fel: 'copil', el: r.el, w: r.w, h: r.h, rec: r.rec, tok });
          } else {
            const s = slot(tok, inp, b, tinta, cul, paleta);
            elemente.push({ fel: 'slot', ...s, tok });
          }
        }
      }
    }
    const padV = rap ? 4 : 8;
    let maxH = 0; for (const e of elemente) maxH = Math.max(maxH, e.h);
    const Hr = rap ? Math.max(32, maxH + padV * 2) : Math.max(40, maxH + padV * 2);
    let padL;
    if (sh === 'rep') padL = elemente[0]?.fel === 'label' ? 12 : 4;
    else if (sh === 'bool') padL = Hr / 2 - (elemente[0]?.fel === 'label' ? 2 : 6);
    else padL = 10;
    let x = padL;
    const y0 = sh === 'hat' || sh === 'def' ? CAP : 0;
    const randG = sv('g');
    elemente.forEach((e, i) => {
      if (i) x += e.fel === 'label' && elemente[i - 1].fel === 'label' ? 5 : 6;
      const ey = y0 + (Hr - e.h) / 2;
      if (e.fel === 'label') { e.el.setAttribute('x', x); e.el.setAttribute('y', y0 + Hr / 2 + 0.5); randG.append(e.el); }
      else {
        const gg = sv('g', { transform: `translate(${x} ${ey})` }, e.el); randG.append(gg);
        if (e.fel === 'copil') adaugaRec(rec, e.rec, x, ey);
        if (e.fel === 'slot' || e.fel === 'copil') rec.sloturi.push({ b, nume: e.tok.name, tip: e.tok.type, menu: e.tok.menu, x, y: ey, w: e.w, h: e.h, ocupat: e.fel === 'copil' });
        if (e.argsrc) for (const a of e.argsrc) rec.sloturi.push({ ...a, x: a.x + x, y: a.y + ey });
      }
      x += e.w;
    });
    let W = x + (sh === 'rep' ? (elemente[elemente.length - 1]?.fel === 'label' ? 12 : 4) : sh === 'bool' ? Hr / 2 - (elemente[elemente.length - 1]?.fel === 'label' ? 2 : 6) : 10);
    let H;
    let cale;
    if (rap) {
      W = Math.max(W, sh === 'bool' ? 48 : 40);
      H = Hr;
      cale = sh === 'bool' ? caleHex(W, H) : caleRap(W, H);
    } else if (sh === 'c' || sh === 'c2' || sh === 'capc') {
      W = Math.max(W, 120);
      const seg = [{ fel: 'rand', h: Hr }];
      const guri = [];
      let y = Hr;
      const nr = sh === 'c2' ? 2 : 1;
      for (let i = 0; i < nr; i++) {
        const s = b.sub[i];
        let sh2 = 24;
        if (s) {
          const r = deseneazaStiva(s, tinta, paleta);
          sh2 = Math.max(24, r.h);
          const gg = sv('g', { transform: `translate(${ARM} ${y})` }, r.el);
          guri.push(gg); adaugaRec(rec, r.rec, ARM, y);
        }
        rec.con.push({ fel: 'sub', b, i, x: ARM, y });
        seg.push({ fel: 'gura', h: sh2 }); y += sh2;
        if (sh === 'c2' && i === 0) {
          seg.push({ fel: 'rand', h: 32 });
          const t = sv('text', { class: 'ap-blocuri-t', x: 10, y: y + 16.5, 'dominant-baseline': 'central' }, 'altfel');
          guri.push(t); y += 32;
        }
      }
      seg.push({ fel: 'jos', h: 24 }); y += 24;
      H = y;
      cale = caleC(W, seg, sh !== 'capc');
      g.append(sv('path', { class: 'ap-blocuri-forma', d: cale, fill: cul.cul, stroke: cul.ter, 'stroke-width': 1 }), randG, ...guri);
      rec.blocuri.unshift({ b, x: 0, y: 0, w: W, h: H, el: g });
      return { el: g, w: W, h: H, rec };
    } else {
      if (sh === 'hat' || sh === 'def') W = Math.max(W, 100);
      W = Math.max(W, 48);
      H = Hr + y0;
      cale = caleCmd(W, H, sh === 'hat' || sh === 'def' ? 'hat' : 'notch', sh !== 'cap');
    }
    g.prepend(sv('path', { class: 'ap-blocuri-forma', d: cale, fill: cul.cul, stroke: cul.ter, 'stroke-width': 1 }));
    g.append(randG);
    rec.blocuri.unshift({ b, x: 0, y: 0, w: W, h: H, el: g });
    return { el: g, w: W, h: H, rec };
  }
  // Prototipul din blocul „definește”: eticheta și parametrii (se pot trage ca să obții o copie)
  function prototip(b, cul) {
    const g = sv('g');
    const parts = b.proc?.parts || [];
    const H = 32;
    let x = 8; const els = []; const argsrc = [];
    for (const p of parts) {
      if (p.t === 'l') { const t = sv('text', { class: 'ap-blocuri-t', x, y: H / 2 + 0.5, 'dominant-baseline': 'central' }, p.text); els.push(t); x += latime(p.text) + 5; }
      else {
        const w = Math.max(36, latime(p.name) + 22); const hh = 24;
        const gg = sv('g', { transform: `translate(${x} ${(H - hh) / 2})`, class: 'ap-blocuri-argsrc', 'data-argsrc': p.name, 'data-argbool': p.t === 'b' ? '1' : '', 'data-owner': b.id },
          sv('path', { d: p.t === 'b' ? caleHex(w, hh) : caleRap(w, hh), fill: cul.cul, stroke: cul.ter, 'stroke-width': 1 }),
          sv('text', { class: 'ap-blocuri-t', x: w / 2, y: hh / 2 + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, p.name));
        els.push(gg); x += w + 5;
      }
    }
    const W = Math.max(60, x + 3);
    g.append(sv('path', { d: caleCmd(W, H, 'notch', true), fill: cul.sec, stroke: cul.ter, 'stroke-width': 1 }), ...els);
    return { fel: 'proto', el: g, w: W, h: H, argsrc };
  }
  // Desenează o stivă (blocul și toate continuările lui)
  function deseneazaStiva(b, tinta, paleta = false) {
    const g = sv('g', { class: 'ap-blocuri-stiva' });
    const rec = recGol();
    let y = 0, W = 0;
    const primul = b;
    if (forma(b) !== 'hat' && forma(b) !== 'def' && forma(b) !== 'rep' && forma(b) !== 'bool') rec.con.push({ fel: 'top', b: primul, x: 0, y: 0 });
    while (b) {
      const r = deseneazaBloc(b, tinta, paleta);
      const gg = sv('g', { transform: `translate(0 ${y})` }, r.el);
      g.append(gg); adaugaRec(rec, r.rec, 0, y);
      y += r.h; W = Math.max(W, r.w);
      const f = forma(b);
      if (f !== 'cap' && f !== 'capc' && f !== 'rep' && f !== 'bool') rec.con.push({ fel: 'next', b, x: 0, y });
      b = b.next;
    }
    // Blocurile de mai jos se desenează după cele de sus; le inversăm ordinea ca dinții să stea deasupra
    const copii = [...g.children]; copii.reverse().forEach((c) => g.append(c));
    return { el: g, w: W, h: y, rec };
  }
  // Un bloc ca imagine SVG de sine stătătoare (paletă, fereastra „Creează un bloc”)
  function svgBloc(b, tinta, cuStiva = false) {
    const r = cuStiva ? deseneazaStiva(b, tinta, true) : deseneazaBloc(b, tinta, true);
    const s = sv('svg', { class: 'ap-blocuri-svg', width: Math.ceil(r.w + 2), height: Math.ceil(r.h + ND + 2), viewBox: `-1 -1 ${Math.ceil(r.w + 2)} ${Math.ceil(r.h + ND + 2)}` }, r.el);
    return { svg: s, ...r };
  }

  // ---------- Sunete generate cu Web Audio ----------
  let actx = null;
  const surse = new Set();
  function audio() {
    try {
      if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
    } catch { return null; }
    return actx;
  }
  function ton(a, out, { tip = 'sine', f0, f1 = f0, t, d, v = 0.3, atac = 0.01, filtru = 0 }) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = tip; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + atac); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let n = o;
    if (filtru) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filtru; o.connect(fl); n = fl; }
    n.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
    surse.add(o); o.onended = () => surse.delete(o);
  }
  function zgomot(a, out, { t, d, v = 0.3, frecv = 2000, tip = 'bandpass' }) {
    const len = Math.max(1, Math.floor(a.sampleRate * d));
    const buf = a.createBuffer(1, len, a.sampleRate); const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(); s.buffer = buf;
    const fl = a.createBiquadFilter(); fl.type = tip; fl.frequency.value = frecv;
    const g = a.createGain(); g.gain.value = v;
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t);
    surse.add(s); s.onended = () => surse.delete(s);
  }
  const SUNETE = {
    'Miau': (a, o, t) => { ton(a, o, { tip: 'sawtooth', f0: 520, f1: 820, t, d: 0.22, v: 0.25, filtru: 1800 }); ton(a, o, { tip: 'sawtooth', f0: 820, f1: 430, t: t + 0.2, d: 0.45, v: 0.25, filtru: 1500 }); return 0.7; },
    'Pop': (a, o, t) => { ton(a, o, { tip: 'sine', f0: 900, f1: 180, t, d: 0.09, v: 0.5, atac: 0.002 }); return 0.12; },
    'Bip': (a, o, t) => { ton(a, o, { tip: 'square', f0: 880, t, d: 0.12, v: 0.15 }); ton(a, o, { tip: 'square', f0: 1320, t: t + 0.14, d: 0.12, v: 0.15 }); return 0.3; },
    'Laser': (a, o, t) => { ton(a, o, { tip: 'sawtooth', f0: 1800, f1: 120, t, d: 0.35, v: 0.2 }); return 0.4; },
    'Boing': (a, o, t) => { ton(a, o, { tip: 'triangle', f0: 120, f1: 520, t, d: 0.3, v: 0.4 }); ton(a, o, { tip: 'triangle', f0: 520, f1: 260, t: t + 0.28, d: 0.25, v: 0.25 }); return 0.55; },
    'Colectează': (a, o, t) => { [784, 988, 1175, 1568].forEach((f, i) => ton(a, o, { tip: 'triangle', f0: f, t: t + i * 0.07, d: 0.18, v: 0.25 })); return 0.45; },
    'Clopoțel': (a, o, t) => { ton(a, o, { tip: 'sine', f0: 1320, t, d: 1.2, v: 0.3, atac: 0.003 }); ton(a, o, { tip: 'sine', f0: 2640, t, d: 0.6, v: 0.1, atac: 0.003 }); return 1.2; },
    'Oops': (a, o, t) => { ton(a, o, { tip: 'square', f0: 392, t, d: 0.18, v: 0.12, filtru: 1200 }); ton(a, o, { tip: 'square', f0: 330, f1: 220, t: t + 0.2, d: 0.4, v: 0.12, filtru: 1200 }); return 0.65; },
    'Bule': (a, o, t) => { for (let i = 0; i < 6; i++) ton(a, o, { tip: 'sine', f0: 300 + Math.random() * 400, f1: 900 + Math.random() * 600, t: t + i * 0.08, d: 0.07, v: 0.25 }); return 0.55; },
    'Aplauze': (a, o, t) => { for (let i = 0; i < 14; i++) zgomot(a, o, { t: t + i * 0.07 + Math.random() * 0.03, d: 0.05, v: 0.5, frecv: 1500 + Math.random() * 1500 }); return 1.1; },
    'Tobă': (a, o, t) => { ton(a, o, { tip: 'sine', f0: 160, f1: 45, t, d: 0.35, v: 0.8, atac: 0.002 }); zgomot(a, o, { t, d: 0.05, v: 0.2, frecv: 3000 }); return 0.4; },
    'Zgârietură': (a, o, t) => { zgomot(a, o, { t, d: 0.25, v: 0.5, frecv: 900 }); zgomot(a, o, { t: t + 0.27, d: 0.2, v: 0.5, frecv: 1400 }); return 0.5; },
  };
  function canta(tinta, nume) {
    const a = audio(); if (!a) return 0.3;
    const f = SUNETE[nume] || SUNETE.Pop;
    const g = a.createGain(); g.gain.value = clamp(num(tinta?.volum ?? 100), 0, 100) / 100; g.connect(a.destination);
    return f(a, g, a.currentTime + 0.01);
  }
  // Instrumentele pentru „cântă nota”
  function cantaNota(tinta, nota, durata) {
    const a = audio(); if (!a) return;
    const instr = num(tinta?._instr || 1);
    const f = 440 * Math.pow(2, (clamp(nota, 0, 130) - 69) / 12);
    const g = a.createGain(); g.gain.value = clamp(num(tinta?.volum ?? 100), 0, 100) / 100; g.connect(a.destination);
    const t = a.currentTime + 0.01, d = Math.max(0.08, durata);
    const tipuri = { 1: ['triangle', 0.005, 1.2], 2: ['sine', 0.005, 1.5], 3: ['square', 0.02, 0, 1500], 4: ['sawtooth', 0.003, 0.9, 2200], 5: ['sawtooth', 0.003, 0, 2600], 6: ['triangle', 0.005, 0.6, 600], 7: ['triangle', 0.002, 0.25], 8: ['sawtooth', 0.06, 0, 1400], 9: ['sawtooth', 0.04, 0, 1100], 10: ['square', 0.03, 0, 1600], 11: ['sawtooth', 0.03, 0, 1900], 12: ['sine', 0.05, 0], 13: ['sine', 0.03, 0], 14: ['sawtooth', 0.04, 0, 700], 15: ['sine', 0.12, 0], 16: ['sine', 0.002, 1.2], 17: ['sine', 0.002, 0.8], 18: ['triangle', 0.002, 0.9], 19: ['sine', 0.002, 0.4], 20: ['square', 0.01, 0, 3000] };
    const [tip, atac, decay, filtru] = tipuri[instr] || tipuri[1];
    const dd = decay ? Math.min(d + decay, d * 1.4 + decay) : d;
    ton(a, g, { tip, f0: f, t, d: dd, v: 0.35, atac, filtru: filtru || 0 });
    if (instr === 15) ton(a, g, { tip: 'sine', f0: f * 1.005, t, d: dd, v: 0.2, atac });
  }
  function opresteSunete() { for (const s of surse) { try { s.stop(); } catch { /* deja oprit */ } } surse.clear(); }

  // ---------- Execuția (interpretorul) ----------
  const OPRESTE = { oprire: true };
  const R = {
    fire: [], ordine: [], t0: performance.now(), raspuns: '', taste: new Set(), mouse: { x: 0, y: 0, jos: false },
    mod: 'normal', pas: 0, redesen: true, intrebari: [], raspunsuriAuto: null, bulaId: 0,
    jurnal: { spus: [], creion: [], pozitii: [], mesaje: [], decoruri: 0 },
    cv: null, ctx: null, penCv: null, penCtx: null,
  };
  // Legături spre interfață (completate mai jos)
  const UI = { evidentiere() {}, monitoare() {}, proprietati() {}, intrebare() {}, eroare() {}, decorSchimbat() {}, rulare() {} };
  function initScena() {
    R.cv = document.createElement('canvas'); R.cv.width = 480 * REZ; R.cv.height = 360 * REZ; R.ctx = R.cv.getContext('2d');
    R.penCv = document.createElement('canvas'); R.penCv.width = 480 * REZ; R.penCv.height = 360 * REZ; R.penCtx = R.penCv.getContext('2d');
  }
  const toateTintele = () => [scena(), ...R.ordine];
  function reconstruiesteOrdinea() { R.ordine = personaje().slice(); }
  const efecte = (t) => t._ef || (t._ef = { culoare: 0, luminozitate: 0, fantomă: 0, pixelare: 0 });
  const creion = (t) => t._creion || (t._creion = { jos: false, cul: '#1f6fd1', gros: 1 });

  // Desenarea scenei
  function filtruEfecte(t) {
    const e = t._ef; if (!e) return 'none';
    const f = [];
    if (e.culoare) f.push(`hue-rotate(${(e.culoare * 1.8) % 360}deg)`);
    if (e.luminozitate) f.push(`brightness(${clamp(1 + e.luminozitate / 100, 0, 2)})`);
    return f.join(' ') || 'none';
  }
  function deseneazaPersonaj(c, s, faraEfecte) {
    const cost = s.costume[s.costum] || s.costume[0];
    const im = imagineCostum(cost.desen);
    c.save(); c.translate(240 + s.x, 180 - s.y);
    const k = s.marime / 100;
    if (s.stil === 'toate direcțiile') c.rotate(((s.dir - 90) * Math.PI) / 180);
    else if (s.stil === 'stânga-dreapta' && s.dir < 0) c.scale(-1, 1);
    c.scale(k, k);
    if (!faraEfecte) { c.filter = filtruEfecte(s); c.globalAlpha = 1 - clamp(efecte(s).fantomă, 0, 100) / 100; }
    const px = !faraEfecte && efecte(s).pixelare > 0 ? Math.max(1, Math.round(efecte(s).pixelare / 10)) : 0;
    if (px > 1) {
      const sw = Math.max(1, Math.round(im.w / px)), shh = Math.max(1, Math.round(im.h / px));
      const t = document.createElement('canvas'); t.width = sw; t.height = shh; t.getContext('2d').drawImage(im.cv, 0, 0, sw, shh);
      c.imageSmoothingEnabled = false; c.drawImage(t, -im.w / 2, -im.h / 2, im.w, im.h);
    } else c.drawImage(im.cv, -im.w / 2, -im.h / 2, im.w, im.h);
    c.restore();
  }
  function deseneazaBula(c, s) {
    const b = s._bula; if (!b || !s.vizibil || b.text === '') return;
    const m = margini(s);
    c.save(); c.font = '600 13px "Helvetica Neue", Helvetica, Arial, sans-serif';
    const cuvinte = b.text.split(/\s+/); const rand = []; let r = '';
    for (const w of cuvinte) { const t = r ? r + ' ' + w : w; if (c.measureText(t).width > 150 && r) { rand.push(r); r = w; } else r = t; }
    if (r) rand.push(r);
    const linii = rand.slice(0, 8).map((l) => (c.measureText(l).width > 160 ? l.slice(0, 22) + '…' : l));
    const w = Math.max(44, Math.min(170, Math.max(...linii.map((l) => c.measureText(l).width)) + 20)), hh = linii.length * 16 + 14;
    let x = 240 + m.dr - 4, y = 180 - m.sus - hh - 12;
    let laStanga = false;
    if (x + w > 476) { x = 240 + m.st - w + 4; laStanga = true; }
    x = clamp(x, 4, 476 - w); y = clamp(y, 4, 356 - hh - 10);
    c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(x, y, w, hh, 14); c.fill(); c.stroke();
    if (b.gand) { elipsa(c, laStanga ? x + w - 10 : x + 12, y + hh + 6, 5, 4, '#fff', 'rgba(0,0,0,.25)', 1.5); elipsa(c, laStanga ? x + w - 4 : x + 6, y + hh + 13, 3, 2.5, '#fff', 'rgba(0,0,0,.25)', 1.5); }
    else {
      c.beginPath(); const bx = laStanga ? x + w - 22 : x + 14; c.moveTo(bx, y + hh - 1); c.lineTo(laStanga ? bx + 14 : bx - 6, y + hh + 10); c.lineTo(laStanga ? bx + 2 : bx + 12, y + hh - 1);
      c.fill(); c.stroke(); c.fillRect(bx - 2, y + hh - 4, 18, 4);
    }
    c.fillStyle = '#575E75'; c.textBaseline = 'top';
    linii.forEach((l, i) => c.fillText(l, x + 10, y + 8 + i * 16));
    c.restore();
  }
  function deseneazaScena(c = R.ctx, cuBule = true) {
    if (!c) return;
    c.setTransform(REZ, 0, 0, REZ, 0, 0);
    const sc = scena();
    c.save(); c.filter = filtruEfecte(sc);
    c.drawImage(imagineDecor(sc.costume[sc.costum]?.desen || 'alb'), 0, 0, 480, 360);
    c.restore();
    c.drawImage(R.penCv, 0, 0, 480, 360);
    for (const s of R.ordine) if (s.vizibil) deseneazaPersonaj(c, s);
    if (cuBule) for (const s of R.ordine) deseneazaBula(c, s);
  }
  // Marginile personajului (în coordonatele scenei: x spre dreapta, y în sus)
  function margini(s) {
    const im = imagineCostum((s.costume[s.costum] || s.costume[0]).desen);
    const k = s.marime / 100, w = (im.w * k) / 2, hh = (im.h * k) / 2;
    const a = s.stil === 'toate direcțiile' ? ((s.dir - 90) * Math.PI) / 180 : 0;
    const cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
    const ew = w * cs + hh * sn, eh = w * sn + hh * cs;
    return { st: s.x - ew, dr: s.x + ew, jos: s.y - eh, sus: s.y + eh };
  }
  function ingradeste(s) {
    const m = margini(s);
    const ins = Math.min(15, (m.dr - m.st) / 2, (m.sus - m.jos) / 2);
    if (m.dr < -240 + ins) s.x += -240 + ins - m.dr;
    if (m.st > 240 - ins) s.x -= m.st - (240 - ins);
    if (m.sus < -180 + ins) s.y += -180 + ins - m.sus;
    if (m.jos > 180 - ins) s.y -= m.jos - (180 - ins);
  }
  function mutaLa(s, x, y, fortat) {
    if (s.scena) return;
    const x0 = s.x, y0 = s.y;
    s.x = Number.isFinite(x) ? x : 0; s.y = Number.isFinite(y) ? y : 0;
    if (!fortat) ingradeste(s);
    const cr = s._creion;
    if (cr?.jos && (s.x !== x0 || s.y !== y0)) {
      const c = R.penCtx; c.setTransform(REZ, 0, 0, REZ, 0, 0);
      c.strokeStyle = cr.cul; c.lineWidth = cr.gros; c.lineCap = 'round';
      c.beginPath(); c.moveTo(240 + x0, 180 - y0); c.lineTo(240 + s.x, 180 - s.y); c.stroke();
      if (R.jurnal.creion.length < 5000) R.jurnal.creion.push({ x1: x0, y1: y0, x2: s.x, y2: s.y, cul: cr.cul, gros: cr.gros, t: s._clona ? s._sursa.id : s.id });
    }
    R.redesen = true;
  }
  const normDir = (d) => { d = ((d % 360) + 360) % 360; return d > 180 ? d - 360 : d; };
  function punctCreion(s) {
    const cr = creion(s); const c = R.penCtx; c.setTransform(REZ, 0, 0, REZ, 0, 0);
    c.fillStyle = cr.cul; c.beginPath(); c.arc(240 + s.x, 180 - s.y, cr.gros / 2, 0, Math.PI * 2); c.fill(); R.redesen = true;
  }
  // Detectarea atingerii (pixel cu pixel)
  const cvT = document.createElement('canvas'), ctT = cvT.getContext('2d', { willReadFrequently: true });
  const cvT2 = document.createElement('canvas'), ctT2 = cvT2.getContext('2d', { willReadFrequently: true });
  function intersectie(a, b) {
    const st = Math.max(a.st, b.st), dr = Math.min(a.dr, b.dr), jos = Math.max(a.jos, b.jos), sus = Math.min(a.sus, b.sus);
    return st < dr && jos < sus ? { st, dr, jos, sus } : null;
  }
  function atingePers(a, b) {
    if (!a.vizibil || !b.vizibil || a === b) return false;
    const r = intersectie(margini(a), margini(b)); if (!r) return false;
    const w = Math.max(1, Math.ceil(r.dr - r.st)), hh = Math.max(1, Math.ceil(r.sus - r.jos));
    cvT.width = w; cvT.height = hh;
    ctT.setTransform(1, 0, 0, 1, -(240 + r.st), -(180 - r.sus));
    deseneazaPersonaj(ctT, a, true);
    ctT.globalCompositeOperation = 'source-in';
    deseneazaPersonaj(ctT, b, true);
    ctT.globalCompositeOperation = 'source-over';
    const d = ctT.getImageData(0, 0, w, hh).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) return true;
    return false;
  }
  function punctPePers(s, x, y) {
    if (!s.vizibil) return false;
    const m = margini(s); if (x < m.st || x > m.dr || y < m.jos || y > m.sus) return false;
    cvT.width = 1; cvT.height = 1; ctT.setTransform(1, 0, 0, 1, -(240 + x), -(180 - y));
    deseneazaPersonaj(ctT, s, true);
    return ctT.getImageData(0, 0, 1, 1).data[3] > 30;
  }
  const hexRgb = (hx) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hx).trim()); const n = m ? parseInt(m[1], 16) : 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbHex = (r, g, b) => '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  const aproape = (d, i, c) => Math.abs(d[i] - c[0]) < 26 && Math.abs(d[i + 1] - c[1]) < 26 && Math.abs(d[i + 2] - c[2]) < 34;
  function atingeCuloarea(s, hx, culMasca) {
    if (!s.vizibil) return false;
    const r = intersectie(margini(s), { st: -240, dr: 240, jos: -180, sus: 180 }); if (!r) return false;
    const w = Math.max(1, Math.ceil(r.dr - r.st)), hh = Math.max(1, Math.ceil(r.sus - r.jos));
    cvT.width = w; cvT.height = hh; cvT2.width = w; cvT2.height = hh;
    ctT.setTransform(1, 0, 0, 1, -(240 + r.st), -(180 - r.sus));
    const sc = scena();
    ctT.drawImage(imagineDecor(sc.costume[sc.costum]?.desen || 'alb'), 0, 0, 480, 360);
    ctT.drawImage(R.penCv, 0, 0, 480, 360);
    for (const o of R.ordine) if (o !== s && o.vizibil) deseneazaPersonaj(ctT, o);
    ctT2.setTransform(1, 0, 0, 1, -(240 + r.st), -(180 - r.sus));
    deseneazaPersonaj(ctT2, s, !culMasca);
    const A = ctT.getImageData(0, 0, w, hh).data, B = ctT2.getImageData(0, 0, w, hh).data;
    const c = hexRgb(hx), cm = culMasca ? hexRgb(culMasca) : null;
    for (let i = 0; i < A.length; i += 4) {
      if (B[i + 3] < 128) continue;
      if (cm && !aproape(B, i, cm)) continue;
      if (aproape(A, i, c)) return true;
    }
    return false;
  }
  function atinge(s, ce) {
    if (s.scena) return false;
    if (ce === '_mouse_') return punctPePers(s, R.mouse.x, R.mouse.y);
    if (ce === '_edge_') { const m = margini(s); return m.st < -240 || m.dr > 240 || m.jos < -180 || m.sus > 180; }
    const ceva = R.ordine.filter((o) => (o.nume === ce || o._sursa?.nume === ce) && o !== s);
    return ceva.some((o) => atingePers(s, o));
  }
  function pozitieTinta(ce, s) {
    if (ce === '_random_') return [Math.round(Math.random() * 480 - 240), Math.round(Math.random() * 360 - 180)];
    if (ce === '_mouse_') return [Math.round(R.mouse.x), Math.round(R.mouse.y)];
    const o = tintaDupaNume(ce); return o ? [o.x, o.y] : null;
  }
  function ricoseaza(s) {
    const m = margini(s);
    const dist = { st: Math.max(0, 240 + m.st), sus: Math.max(0, 180 - m.sus), dr: Math.max(0, 240 - m.dr), jos: Math.max(0, 180 + m.jos) };
    let min = Infinity, margine = null;
    for (const k in dist) if (dist[k] < min) { min = dist[k]; margine = k; }
    if (min > 0) return;
    const rad = ((90 - s.dir) * Math.PI) / 180;
    let dx = Math.cos(rad), dy = -Math.sin(rad);
    if (margine === 'st') dx = Math.max(0.2, Math.abs(dx));
    else if (margine === 'sus') dy = Math.max(0.2, Math.abs(dy));
    else if (margine === 'dr') dx = -Math.max(0.2, Math.abs(dx));
    else dy = -Math.max(0.2, Math.abs(dy));
    s.dir = normDir((Math.atan2(dy, dx) * 180) / Math.PI + 90);
    const n = margini(s); let x = s.x, y = s.y;
    if (n.st < -240) x += -240 - n.st; if (n.dr > 240) x -= n.dr - 240;
    if (n.jos < -180) y += -180 - n.jos; if (n.sus > 180) y -= n.sus - 180;
    mutaLa(s, x, y);
  }
  function seteazaCostum(t, v) {
    const lista = t.costume;
    if (typeof v === 'string' && !eNumar(v)) {
      const i = lista.findIndex((c) => c.nume === v);
      if (i >= 0) t.costum = i;
      else if (t.scena && v === '_next_') t.costum = (t.costum + 1) % lista.length;
      else if (t.scena && v === '_prev_') t.costum = (t.costum - 1 + lista.length) % lista.length;
      else if (t.scena && v === '_random_') t.costum = Math.floor(Math.random() * lista.length);
    } else {
      const i = lista.findIndex((c) => c.nume === String(v));
      if (i >= 0) t.costum = i;
      else { const n = Math.round(num(v)); if (Number.isFinite(n)) t.costum = (((n - 1) % lista.length) + lista.length) % lista.length; }
    }
    R.redesen = true;
  }
  function schimbaDecor(v) {
    const sc = scena();
    seteazaCostum(sc, v);
    R.jurnal.decoruri = (R.jurnal.decoruri || 0) + 1;
    UI.decorSchimbat();
    const nume = sc.costume[sc.costum]?.nume;
    return pornesteHat('event_whenbackdropswitchesto', (b) => b.in.BACKDROP?.v === nume, null, true);
  }
  function bula(s, text, gand) {
    if (s.scena) return 0;
    const id = ++R.bulaId;
    s._bula = text === '' ? null : { text: str(text), gand, id };
    if (!gand && text !== '' && R.jurnal.spus.length < 500) R.jurnal.spus.push(str(text));
    R.redesen = true; return id;
  }
  // Clone
  function creeazaClona(sursa) {
    if (!sursa || sursa.scena) return;
    if (R.ordine.filter((o) => o._clona).length >= 300) return;
    const orig = sursa._clona ? sursa._sursa : sursa;
    const c = { ...sursa, id: uid(), _clona: true, _sursa: orig, _bula: null, _ef: { ...efecte(sursa) }, _creion: { ...creion(sursa) },
      variabile: sursa.variabile.map((v) => ({ ...v })), liste: sursa.liste.map((l) => ({ ...l, val: [...(l.val || [])] })) };
    const i = R.ordine.indexOf(sursa); R.ordine.splice(Math.max(0, i), 0, c);
    pornesteHat('control_start_as_clone', null, [c]);
    R.redesen = true;
  }
  function stergeClona(c) {
    R.ordine = R.ordine.filter((o) => o !== c);
    R.fire.forEach((f) => { if (f.tinta === c) f.gata = true; });
    R.redesen = true;
  }

  // Firele de execuție
  function pornesteFir(tinta, top, start) {
    const th = { tinta, top, gata: false, warp: 0, warpT: 0, cadre: [], curent: null, ultPas: R.pas };
    th.gen = stiva(th, start);
    R.fire.push(th); UI.rulare();
    return th;
  }
  // Pornește scripturile care încep cu o anumită pălărie; `restart` = repornește scripturile deja pornite
  function pornesteHat(op, filtru, tinte, restart) {
    const noi = [];
    for (const t of tinte || toateTintele()) {
      for (const top of t.blocuri) {
        if (top.op !== op || (filtru && !filtru(top))) continue;
        const vechi = R.fire.find((f) => f.tinta === t && f.top === top && !f.gata);
        if (vechi) { if (!restart) continue; vechi.gata = true; }
        noi.push(pornesteFir(t, top, top.next));
      }
    }
    return noi;
  }
  function opresteTot() {
    R.fire.forEach((f) => { f.gata = true; }); R.fire = [];
    R.ordine = R.ordine.filter((o) => !o._clona);
    for (const t of P.tinte) { t._bula = null; t._ef = null; }
    R.intrebari = []; UI.intrebare(null);
    opresteSunete(); R.redesen = true; UI.rulare(); UI.evidentiere();
  }
  function steagVerde() {
    opresteTot(); audio();
    R.t0 = performance.now();
    pornesteHat('event_whenflagclicked', null, null, true);
  }
  function pornesteMesaj(nume) { if (R.jurnal.mesaje && R.jurnal.mesaje.length < 500) R.jurnal.mesaje.push(nume); return pornesteHat('event_whenbroadcastreceived', (b) => b.in.BROADCAST_OPTION?.v === nume, null, true); }
  function tastaApasata(nume) {
    R.taste.add(nume);
    pornesteHat('event_whenkeypressed', (b) => b.in.KEY_OPTION?.v === nume || b.in.KEY_OPTION?.v === 'orice', null, false);
  }

  // Pasul următor al tuturor firelor
  function pasFir(th) {
    if (th.gata) return;
    try {
      const r = th.gen.next();
      if (r.done) th.gata = true;
    } catch (e) {
      th.gata = true;
      if (e !== OPRESTE) { console.error(e); UI.eroare('Eroare la rularea unui script: ' + (e.message || e)); }
    }
  }
  function ciclu() {
    const t0 = performance.now();
    let trecere = 0;
    R.vizual = false;
    do {
      R.activ = false;
      const fire = R.fire.slice();
      for (const th of fire) pasFir(th);
      R.fire = R.fire.filter((f) => !f.gata);
      trecere++;
      // ca în Scratch: continuăm în același cadru cât timp nu s-a schimbat nimic pe ecran
    } while (R.fire.length && R.mod === 'normal' && R.activ && !R.vizual && performance.now() - t0 < 14 && trecere < 2000);
  }

  function* stiva(th, b) {
    while (b) {
      th.curent = b;
      if (R.mod !== 'normal' && !th.warp) yield* asteaptaPas(th);
      R.activ = true;
      yield* executaBloc(th, b);
      b = b.next;
    }
  }
  function* asteaptaPas(th) {
    UI.evidentiere();
    if (R.mod === 'lent') { const t = performance.now() + 500; while (performance.now() < t && R.mod === 'lent') yield; }
    else if (R.mod === 'pas') { while (R.pas <= th.ultPas && R.mod === 'pas') yield; th.ultPas = R.pas; }
  }
  function* bucla(th) {
    if (th.warp) { if (performance.now() - th.warpT > 500) { th.warpT = performance.now(); yield; } }
    else { R.redesenCadru = true; yield; }
  }
  function* asteapta(th, sec) {
    const t = performance.now() + Math.max(0, sec) * 1000;
    R.redesenCadru = true; yield;
    while (performance.now() < t) { R.redesenCadru = true; yield; }
  }
  const ev = (th, b, n) => { const i = b.in[n]; if (!i) return ''; return i.b ? val(th, i.b) : i.v; };
  const evN = (th, b, n) => num(ev(th, b, n));

  function* executaBloc(th, b) {
    const s = th.tinta;
    switch (b.op) {
      // Mișcare
      case 'motion_movesteps': { const n = evN(th, b, 'STEPS'); const r = ((90 - s.dir) * Math.PI) / 180; mutaLa(s, s.x + n * Math.cos(r), s.y + n * Math.sin(r)); return; }
      case 'motion_turnright': if (!s.scena) { s.dir = normDir(s.dir + evN(th, b, 'DEGREES')); R.redesen = true; } return;
      case 'motion_turnleft': if (!s.scena) { s.dir = normDir(s.dir - evN(th, b, 'DEGREES')); R.redesen = true; } return;
      case 'motion_goto': { const p = pozitieTinta(str(ev(th, b, 'TO')), s); if (p) mutaLa(s, p[0], p[1]); return; }
      case 'motion_gotoxy': mutaLa(s, evN(th, b, 'X'), evN(th, b, 'Y')); return;
      case 'motion_glideto': case 'motion_glidesecstoxy': {
        if (s.scena) return;
        const sec = evN(th, b, 'SECS');
        const p = b.op === 'motion_glideto' ? pozitieTinta(str(ev(th, b, 'TO')), s) : [evN(th, b, 'X'), evN(th, b, 'Y')];
        if (!p) return;
        const x0 = s.x, y0 = s.y, t0 = performance.now();
        if (sec > 0) {
          for (;;) {
            const f = (performance.now() - t0) / (sec * 1000);
            if (f >= 1) break;
            mutaLa(s, x0 + (p[0] - x0) * f, y0 + (p[1] - y0) * f);
            R.redesenCadru = true; yield;
          }
        }
        mutaLa(s, p[0], p[1]);
        if (R.jurnal.pozitii.length < 500) R.jurnal.pozitii.push([Math.round(s.x), Math.round(s.y)]);
        return;
      }
      case 'motion_pointindirection': if (!s.scena) { s.dir = normDir(evN(th, b, 'DIRECTION')); R.redesen = true; } return;
      case 'motion_pointtowards': {
        const p = pozitieTinta(str(ev(th, b, 'TOWARDS')), s); if (!p || s.scena) return;
        const dx = p[0] - s.x, dy = p[1] - s.y; if (dx || dy) s.dir = normDir(90 - (Math.atan2(dy, dx) * 180) / Math.PI); R.redesen = true; return;
      }
      case 'motion_changexby': mutaLa(s, s.x + evN(th, b, 'DX'), s.y); return;
      case 'motion_setx': mutaLa(s, evN(th, b, 'X'), s.y); return;
      case 'motion_changeyby': mutaLa(s, s.x, s.y + evN(th, b, 'DY')); return;
      case 'motion_sety': mutaLa(s, s.x, evN(th, b, 'Y')); return;
      case 'motion_ifonedgebounce': if (!s.scena) ricoseaza(s); return;
      case 'motion_setrotationstyle': if (!s.scena) { s.stil = str(ev(th, b, 'STYLE')); R.redesen = true; } return;
      // Aspect
      case 'looks_say': bula(s, ev(th, b, 'MESSAGE'), false); return;
      case 'looks_think': bula(s, ev(th, b, 'MESSAGE'), true); return;
      case 'looks_sayforsecs': case 'looks_thinkforsecs': {
        const id = bula(s, ev(th, b, 'MESSAGE'), b.op === 'looks_thinkforsecs');
        yield* asteapta(th, evN(th, b, 'SECS'));
        if (s._bula?.id === id) { s._bula = null; R.redesen = true; }
        return;
      }
      case 'looks_switchcostumeto': if (!s.scena) seteazaCostum(s, ev(th, b, 'COSTUME')); return;
      case 'looks_nextcostume': if (!s.scena) { s.costum = (s.costum + 1) % s.costume.length; R.redesen = true; } return;
      case 'looks_switchbackdropto': schimbaDecor(ev(th, b, 'BACKDROP')); return;
      case 'looks_nextbackdrop': schimbaDecor('_next_'); return;
      case 'looks_changesizeby': if (!s.scena) { s.marime = clamp(s.marime + evN(th, b, 'CHANGE'), 5, 500); R.redesen = true; } return;
      case 'looks_setsizeto': if (!s.scena) { s.marime = clamp(evN(th, b, 'SIZE'), 5, 500); R.redesen = true; } return;
      case 'looks_changeeffectby': case 'looks_seteffectto': {
        const e = efecte(s), k = str(ev(th, b, 'EFFECT'));
        const v = b.op === 'looks_seteffectto' ? evN(th, b, 'VALUE') : (e[k] || 0) + evN(th, b, 'CHANGE');
        e[k] = k === 'fantomă' ? clamp(v, 0, 100) : k === 'luminozitate' ? clamp(v, -100, 100) : k === 'pixelare' ? Math.max(0, v) : v;
        R.redesen = true; return;
      }
      case 'looks_cleargraphiceffects': s._ef = null; R.redesen = true; return;
      case 'looks_show': if (!s.scena) { s.vizibil = true; R.redesen = true; } return;
      case 'looks_hide': if (!s.scena) { s.vizibil = false; R.redesen = true; } return;
      case 'looks_gotofrontback': {
        if (s.scena) return;
        R.ordine = R.ordine.filter((o) => o !== s);
        if (str(ev(th, b, 'FRONT_BACK')) === 'din spate') R.ordine.unshift(s); else R.ordine.push(s);
        R.redesen = true; return;
      }
      // Sunet
      case 'sound_play': canta(s, str(ev(th, b, 'SOUND_MENU'))); return;
      case 'sound_playuntildone': { const d = canta(s, str(ev(th, b, 'SOUND_MENU'))); yield* asteapta(th, d); return; }
      case 'sound_stopallsounds': opresteSunete(); return;
      case 'sound_changevolumeby': s.volum = clamp(num(s.volum) + evN(th, b, 'VOLUME'), 0, 100); return;
      case 'sound_setvolumeto': s.volum = clamp(evN(th, b, 'VOLUME'), 0, 100); return;
      case 'music_playnote': { const d = (evN(th, b, 'BEATS') * 60) / (P.tempo || 60); cantaNota(s, evN(th, b, 'NOTE'), d); yield* asteapta(th, d); return; }
      case 'music_rest': yield* asteapta(th, (evN(th, b, 'BEATS') * 60) / (P.tempo || 60)); return;
      case 'music_setinstrument': s._instr = clamp(Math.round(evN(th, b, 'INSTRUMENT')), 1, 20); return;
      case 'music_settempo': P.tempo = clamp(evN(th, b, 'TEMPO'), 20, 500); return;
      // Evenimente
      case 'event_broadcast': pornesteMesaj(str(ev(th, b, 'BROADCAST_INPUT'))); return;
      case 'event_broadcastandwait': {
        const fire = pornesteMesaj(str(ev(th, b, 'BROADCAST_INPUT')));
        R.redesenCadru = true; yield;
        while (fire.some((f) => !f.gata)) yield;
        return;
      }
      // Control
      case 'control_wait': yield* asteapta(th, evN(th, b, 'DURATION')); return;
      case 'control_repeat': {
        const n = Math.round(evN(th, b, 'TIMES'));
        for (let i = 0; i < n; i++) { yield* stiva(th, b.sub[0]); yield* bucla(th); }
        return;
      }
      case 'control_forever': for (;;) { yield* stiva(th, b.sub[0]); yield* bucla(th); }
      case 'control_if': if (boolv(ev(th, b, 'CONDITION'))) yield* stiva(th, b.sub[0]); return;
      case 'control_if_else': if (boolv(ev(th, b, 'CONDITION'))) yield* stiva(th, b.sub[0]); else yield* stiva(th, b.sub[1]); return;
      case 'control_wait_until': while (!boolv(ev(th, b, 'CONDITION'))) { R.redesenCadru = true; yield; } return;
      case 'control_repeat_until': while (!boolv(ev(th, b, 'CONDITION'))) { yield* stiva(th, b.sub[0]); yield* bucla(th); } return;
      case 'control_stop': {
        const o = str(ev(th, b, 'STOP_OPTION'));
        if (o === 'tot') { opresteTot(); throw OPRESTE; }
        if (o === 'acest script') throw OPRESTE;
        R.fire.forEach((f) => { if (f.tinta === s && f !== th) f.gata = true; });
        return;
      }
      case 'control_create_clone_of': { const o = str(ev(th, b, 'CLONE_OPTION')); creeazaClona(o === '_myself_' ? s : tintaDupaNume(o)); return; }
      case 'control_delete_this_clone': if (s._clona) { stergeClona(s); throw OPRESTE; } return;
      // Detectare
      case 'sensing_askandwait': {
        const q = str(ev(th, b, 'QUESTION'));
        if (R.raspunsuriAuto) { R.raspuns = R.raspunsuriAuto.length ? str(R.raspunsuriAuto.shift()) : ''; return; }
        const intr = { th, text: q, gata: false, s };
        R.intrebari.push(intr);
        while (R.intrebari[0] !== intr) { if (!R.intrebari.includes(intr)) return; yield; }
        if (!s.scena && s.vizibil) bula(s, q, false);
        UI.intrebare(intr);
        while (!intr.gata) { if (!R.intrebari.includes(intr)) return; yield; }
        if (!s.scena && s._bula?.text === q) { s._bula = null; R.redesen = true; }
        return;
      }
      case 'sensing_resettimer': R.t0 = performance.now(); return;
      // Variabile și liste
      case 'data_setvariableto': { const v = gasesteVar(s, b.in.VARIABLE.v); if (v) v.val = ev(th, b, 'VALUE'); return; }
      case 'data_changevariableby': { const v = gasesteVar(s, b.in.VARIABLE.v); if (v) v.val = num(v.val) + evN(th, b, 'VALUE'); return; }
      case 'data_showvariable': case 'data_hidevariable': case 'data_showlist': case 'data_hidelist': {
        const id = b.in.VARIABLE?.v ?? b.in.LIST?.v; const m = P.monitoare[id] || (P.monitoare[id] = {});
        m.vizibil = b.op.includes('show'); UI.monitoare(true); return;
      }
      case 'data_addtolist': { const l = gasesteLista(s, b.in.LIST.v); if (l && l.val.length < 200000) l.val.push(ev(th, b, 'ITEM')); return; }
      case 'data_deleteoflist': { const l = gasesteLista(s, b.in.LIST.v); if (!l) return; const i = indexLista(ev(th, b, 'INDEX'), l.val.length); if (i === 'tot') l.val = []; else if (i >= 0) l.val.splice(i, 1); return; }
      case 'data_deletealloflist': { const l = gasesteLista(s, b.in.LIST.v); if (l) l.val = []; return; }
      case 'data_insertatlist': { const l = gasesteLista(s, b.in.LIST.v); if (!l) return; const i = indexLista(ev(th, b, 'INDEX'), l.val.length + 1); if (i >= 0) l.val.splice(i, 0, ev(th, b, 'ITEM')); return; }
      case 'data_replaceitemoflist': { const l = gasesteLista(s, b.in.LIST.v); if (!l) return; const i = indexLista(ev(th, b, 'INDEX'), l.val.length); if (i >= 0) l.val[i] = ev(th, b, 'ITEM'); return; }
      // Creion
      case 'pen_clear': R.penCtx.setTransform(1, 0, 0, 1, 0, 0); R.penCtx.clearRect(0, 0, R.penCv.width, R.penCv.height); R.jurnal.creion = []; R.redesen = true; return;
      case 'pen_stamp': if (!s.scena) { R.penCtx.setTransform(REZ, 0, 0, REZ, 0, 0); deseneazaPersonaj(R.penCtx, s); R.redesen = true; } return;
      case 'pen_penDown': if (!s.scena) { creion(s).jos = true; punctCreion(s); } return;
      case 'pen_penUp': if (!s.scena) creion(s).jos = false; return;
      case 'pen_setPenColorToColor': creion(s).cul = str(ev(th, b, 'COLOR')); return;
      case 'pen_changePenColorBy': creion(s).cul = rotesteNuanta(creion(s).cul, evN(th, b, 'VALUE') * 3.6); return;
      case 'pen_changePenSizeBy': creion(s).gros = clamp(creion(s).gros + evN(th, b, 'SIZE'), 1, 1200); return;
      case 'pen_setPenSizeTo': creion(s).gros = clamp(evN(th, b, 'SIZE'), 1, 1200); return;
      // Blocurile mele
      case 'procedures_call': {
        const def = definitii(s._clona ? s._sursa : s).find((d) => d.proc.id === b.proc); if (!def) return;
        const cadru = {};
        for (const p of def.proc.parts) if (p.t !== 'l') cadru[p.name] = p.t === 'b' ? boolv(ev(th, b, p.id) === '' ? false : ev(th, b, p.id)) : ev(th, b, p.id);
        if (th.cadre.length > 400) throw new Error('Prea multe apeluri unul în altul (recursivitate fără oprire).');
        th.cadre.push(cadru);
        const warp = def.proc.warp;
        if (warp) { if (!th.warp) th.warpT = performance.now(); th.warp++; }
        try { yield* stiva(th, def.next); } finally { th.cadre.pop(); if (warp) th.warp--; }
        return;
      }
      case 'procedures_definition': case 'event_whenflagclicked': case 'event_whenkeypressed': case 'event_whenthisspriteclicked':
      case 'event_whenbackdropswitchesto': case 'event_whenbroadcastreceived': case 'control_start_as_clone': return;
      default:
        // Un raportor rulat singur (clic pe el): arătăm valoarea
        if (SPEC[b.op].shape === 'rep' || SPEC[b.op].shape === 'bool') { th.rezultat = val(th, b); }
    }
  }
  function indexLista(v, lungime) {
    const s = str(v).toLowerCase();
    if (s === 'ultimul' || s === 'last') return lungime - 1;
    if (s === 'tot' || s === 'all') return 'tot';
    if (s === 'aleator' || s === 'random') return lungime ? Math.floor(Math.random() * lungime) : -1;
    const n = Math.floor(num(v));
    return n >= 1 && n <= lungime ? n - 1 : -1;
  }
  function rotesteNuanta(hx, grade) {
    const [r, g, b] = hexRgb(hx).map((x) => x / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let hh = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60;
    } else { s = 1; }
    hh = (((hh + grade) % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m = l - c / 2;
    const [a, bb, cc] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return rgbHex((a + m) * 255, (bb + m) * 255, (cc + m) * 255);
  }
  function continutLista(l) {
    const v = l.val.map(str);
    return v.every((x) => x.length === 1) ? v.join('') : v.join(' ');
  }
  // Valoarea unui raportor
  function val(th, b) {
    const s = th.tinta;
    switch (b.op) {
      case 'motion_xposition': return s.scena ? 0 : Math.round(s.x * 1e8) / 1e8;
      case 'motion_yposition': return s.scena ? 0 : Math.round(s.y * 1e8) / 1e8;
      case 'motion_direction': return s.scena ? 90 : s.dir;
      case 'looks_costumenumbername': return s.scena ? 0 : str(ev(th, b, 'NUMBER_NAME')) === 'nume' ? s.costume[s.costum].nume : s.costum + 1;
      case 'looks_backdropnumbername': { const sc = scena(); return str(ev(th, b, 'NUMBER_NAME')) === 'nume' ? sc.costume[sc.costum].nume : sc.costum + 1; }
      case 'looks_size': return s.scena ? 100 : Math.round(s.marime);
      case 'sound_volume': return num(s.volum);
      case 'music_tempo': return P.tempo;
      case 'sensing_touchingobject': return atinge(s, str(ev(th, b, 'TOUCHINGOBJECTMENU')));
      case 'sensing_touchingcolor': return !s.scena && atingeCuloarea(s, str(ev(th, b, 'COLOR')));
      case 'sensing_coloristouchingcolor': return !s.scena && atingeCuloarea(s, str(ev(th, b, 'COLOR2')), str(ev(th, b, 'COLOR')));
      case 'sensing_distanceto': { const p = pozitieTinta(str(ev(th, b, 'DISTANCETOMENU')), s); if (!p || s.scena) return 10000; return Math.round(Math.hypot(p[0] - s.x, p[1] - s.y) * 100) / 100; }
      case 'sensing_answer': return R.raspuns;
      case 'sensing_keypressed': { const k = str(ev(th, b, 'KEY_OPTION')); return k === 'orice' ? R.taste.size > 0 : R.taste.has(k); }
      case 'sensing_mousedown': return R.mouse.jos;
      case 'sensing_mousex': return Math.round(R.mouse.x);
      case 'sensing_mousey': return Math.round(R.mouse.y);
      case 'sensing_timer': return Math.round((performance.now() - R.t0) / 100) / 10;
      case 'operator_add': return evN(th, b, 'NUM1') + evN(th, b, 'NUM2');
      case 'operator_subtract': return evN(th, b, 'NUM1') - evN(th, b, 'NUM2');
      case 'operator_multiply': return evN(th, b, 'NUM1') * evN(th, b, 'NUM2');
      case 'operator_divide': return evN(th, b, 'NUM1') / evN(th, b, 'NUM2');
      case 'operator_mod': { const n = evN(th, b, 'NUM1'), m = evN(th, b, 'NUM2'); let r = n % m; if (r / m < 0) r += m; return r; }
      case 'operator_random': {
        const a = ev(th, b, 'FROM'), c = ev(th, b, 'TO'); const x = num(a), y = num(c);
        const lo = Math.min(x, y), hi = Math.max(x, y);
        const zecimal = /\./.test(str(a)) || /\./.test(str(c)) || !Number.isInteger(x) || !Number.isInteger(y);
        return zecimal ? lo + Math.random() * (hi - lo) : lo + Math.floor(Math.random() * (hi - lo + 1));
      }
      case 'operator_gt': return compara(ev(th, b, 'OPERAND1'), ev(th, b, 'OPERAND2')) > 0;
      case 'operator_lt': return compara(ev(th, b, 'OPERAND1'), ev(th, b, 'OPERAND2')) < 0;
      case 'operator_equals': return compara(ev(th, b, 'OPERAND1'), ev(th, b, 'OPERAND2')) === 0;
      case 'operator_and': return boolv(ev(th, b, 'OPERAND1') || false) && boolv(ev(th, b, 'OPERAND2') || false);
      case 'operator_or': return boolv(ev(th, b, 'OPERAND1') || false) || boolv(ev(th, b, 'OPERAND2') || false);
      case 'operator_not': return !boolv(ev(th, b, 'OPERAND') || false);
      case 'operator_join': return str(ev(th, b, 'STRING1')) + str(ev(th, b, 'STRING2'));
      case 'operator_letter_of': { const t = str(ev(th, b, 'STRING')); const i = Math.floor(evN(th, b, 'LETTER')) - 1; return [...t][i] ?? ''; }
      case 'operator_length': return [...str(ev(th, b, 'STRING'))].length;
      case 'operator_contains': return str(ev(th, b, 'STRING1')).toLowerCase().includes(str(ev(th, b, 'STRING2')).toLowerCase());
      case 'operator_round': return Math.round(evN(th, b, 'NUM'));
      case 'operator_mathop': {
        const n = evN(th, b, 'NUM'), rad = (n * Math.PI) / 180, r10 = (x) => Math.round(x * 1e10) / 1e10;
        switch (str(ev(th, b, 'OPERATOR'))) {
          case 'abs': return Math.abs(n); case 'podea': return Math.floor(n); case 'plafon': return Math.ceil(n); case 'radical': return Math.sqrt(n);
          case 'sin': return r10(Math.sin(rad)); case 'cos': return r10(Math.cos(rad)); case 'tan': return r10(Math.tan(rad));
          case 'asin': return (Math.asin(n) * 180) / Math.PI; case 'acos': return (Math.acos(n) * 180) / Math.PI; case 'atan': return (Math.atan(n) * 180) / Math.PI;
          case 'ln': return Math.log(n); case 'log': return Math.log10(n); case 'e ^': return Math.exp(n); case '10 ^': return Math.pow(10, n);
          default: return n;
        }
      }
      case 'data_variable': { const v = gasesteVar(s, b.in.VARIABLE.v); return v ? v.val : 0; }
      case 'data_listcontents': { const l = gasesteLista(s, b.in.LIST.v); return l ? continutLista(l) : ''; }
      case 'data_itemoflist': { const l = gasesteLista(s, b.in.LIST.v); if (!l) return ''; const i = indexLista(ev(th, b, 'INDEX'), l.val.length); return i >= 0 ? l.val[i] : ''; }
      case 'data_itemnumoflist': { const l = gasesteLista(s, b.in.LIST.v); if (!l) return 0; const x = ev(th, b, 'ITEM'); return l.val.findIndex((y) => compara(x, y) === 0) + 1; }
      case 'data_lengthoflist': { const l = gasesteLista(s, b.in.LIST.v); return l ? l.val.length : 0; }
      case 'data_listcontainsitem': { const l = gasesteLista(s, b.in.LIST.v); const x = ev(th, b, 'ITEM'); return !!l && l.val.some((y) => compara(x, y) === 0); }
      case 'argument_reporter': { const c = th.cadre[th.cadre.length - 1]; return c && b.nume in c ? c[b.nume] : 0; }
      case 'argument_bool': { const c = th.cadre[th.cadre.length - 1]; return c && b.nume in c ? boolv(c[b.nume]) : false; }
      default: return '';
    }
  }

  // ---------- Editorul ----------
  const PSCALA = 0.8; // scara blocurilor din paletă
  const E = {
    tinta: null, fila: 'cod', zoom: 0.8, vederi: {}, undo: [], redo: [], rec: recGol(),
    elStive: new Map(), elBlocuri: new Map(), evTop: new Set(), evCur: new Set(),
    codDeschis: false, codLimbaj: 'pseudo', codTot: false, scenaMod: 'mica', ecranComplet: false,
    idSalvat: null, trage: null, provocare: null, pipeta: null, radacina: null,
  };
  const D = {}; // elementele interfeței
  const tintaEd = () => tintaDupaId(E.tinta) || scena();
  const vedere = () => E.vederi[E.tinta] || (E.vederi[E.tinta] = { sx: 30, sy: 30 });
  // Urmărirea unui gest (mouse sau deget): clic, tragere sau apăsare lungă
  function urmareste(e, o) {
    const x0 = e.clientX, y0 = e.clientY, id = e.pointerId; let tras = false;
    const prag = o.prag ?? (e.pointerType === 'mouse' ? 4 : 8);
    let tLung = o.lung ? setTimeout(() => { tLung = null; if (!tras) { gata(); o.lung(x0, y0); } }, 560) : null;
    const mv = (ev) => {
      if (ev.pointerId !== id) return;
      if (!tras) {
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (Math.hypot(dx, dy) <= prag) return;
        if (o.orizontal && e.pointerType !== 'mouse' && Math.abs(dx) < Math.abs(dy)) { gata(); return; }
        tras = true; clearTimeout(tLung); o.start?.(ev, x0, y0);
      }
      if (tras) { ev.preventDefault?.(); o.misca?.(ev); }
    };
    const up = (ev) => { if (ev.pointerId !== id) return; gata(); if (tras) o.gata?.(ev); else o.clic?.(ev); };
    const cancel = (ev) => { if (ev.pointerId !== id) return; gata(); if (tras) o.gata?.(ev, true); };
    function gata() { clearTimeout(tLung); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); }
    window.addEventListener('pointermove', mv, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  }

  // Mesaje scurte
  function toast(text, tip = '') {
    if (!D.toast) return;
    const t = h('div', { class: `ap-blocuri-toast-msg ${tip}`, role: 'status' }, text);
    D.toast.append(t); setTimeout(() => t.classList.add('pleaca'), 2600); setTimeout(() => t.remove(), 3100);
  }
  // Meniu derulant / contextual
  let meniuDeschis = null;
  function inchideMeniu() { meniuDeschis?.remove(); meniuDeschis = null; }
  function meniu(itemi, x, y, o = {}) {
    inchideMeniu();
    const m = h('div', { class: `ap-blocuri-meniu ${o.cls || ''}`, role: 'menu' });
    for (const it of itemi) {
      if (!it) continue;
      if (it.sep) { m.append(h('div', { class: 'ap-blocuri-meniu-sep' })); continue; }
      const b = h('button', { type: 'button', role: 'menuitem', class: it.bifat ? 'bifat' : '', disabled: it.dez || null, onclick: () => { inchideMeniu(); it.fn?.(); } }, it.text);
      if (it.cul) { b.style.borderLeft = `4px solid ${it.cul}`; }
      m.append(b);
    }
    E.radacina.append(m);
    const rr = E.radacina.getBoundingClientRect();
    const W = m.offsetWidth, H = m.offsetHeight;
    m.style.left = `${clamp(x - rr.left, 4, rr.width - W - 4)}px`;
    m.style.top = `${y - rr.top + H > rr.height - 4 ? Math.max(4, y - rr.top - H) : y - rr.top}px`;
    meniuDeschis = m;
    m.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
    return m;
  }
  // Fereastră de dialog (modală)
  function dialog(titlu, continut, butoane, o = {}) {
    return new Promise((res) => {
      const inchide = (v) => { if (E.dialogInchide === inchide) E.dialogInchide = null; fundal.remove(); document.removeEventListener('keydown', tk, true); res(v); };
      E.dialogInchide = inchide;
      const tk = (e) => { if (e.key === 'Escape') { e.stopPropagation(); inchide(null); } else if (e.key === 'Enter' && o.enter && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); e.stopPropagation(); o.enter(inchide); } };
      const cutie = h('div', { class: `ap-blocuri-dialog ${o.cls || ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titlu },
        h('div', { class: 'ap-blocuri-dialog-titlu' }, h('span', {}, titlu), h('button', { type: 'button', class: 'ap-blocuri-x', 'aria-label': 'Închide', onclick: () => inchide(null) }, '×')),
        h('div', { class: 'ap-blocuri-dialog-corp' }, continut),
        butoane ? h('div', { class: 'ap-blocuri-dialog-jos' }, butoane.map(([t, fn, cls]) => h('button', { type: 'button', class: cls || '', onclick: () => fn(inchide) }, t))) : null);
      const fundal = h('div', { class: 'ap-blocuri-fundal', onpointerdown: (e) => { if (e.target === fundal) inchide(null); } }, cutie);
      E.radacina.append(fundal);
      document.addEventListener('keydown', tk, true);
      (cutie.querySelector('input,textarea,select') || cutie.querySelector('.ap-blocuri-dialog-jos button:last-child'))?.focus();
    });
  }
  function cere(titlu, eticheta, implicit = '', extra = null) {
    const inp = h('input', { type: 'text', class: 'ap-blocuri-camp', value: implicit, maxlength: 60, 'aria-label': eticheta });
    const ok = (inchide) => { const v = inp.value.trim(); if (v) inchide(v); else inp.focus(); };
    return dialog(titlu, [h('label', { class: 'ap-blocuri-et' }, eticheta, inp), extra], [['Anulează', (i) => i(null)], ['OK', ok, 'principal']], { enter: ok });
  }

  // Istoricul pentru Anulează / Refă
  function instantaneu() {
    return JSON.stringify({ tinte: P.tinte.map((t) => ({ id: t.id, blocuri: t.blocuri, comentarii: t.comentarii, variabile: t.variabile, liste: t.liste })), mesaje: P.mesaje }, (k, v) => (k.startsWith('_') ? undefined : v));
  }
  function pasAnulare() { E.undo.push(instantaneu()); if (E.undo.length > 80) E.undo.shift(); E.redo = []; butoaneAnulare(); }
  function restaureaza(js) {
    const d = JSON.parse(js);
    for (const x of d.tinte) { const t = tintaDupaId(x.id); if (t) Object.assign(t, { blocuri: x.blocuri, comentarii: x.comentarii, variabile: x.variabile, liste: x.liste }); }
    P.mesaje = d.mesaje; reimprospateaza(); schimbat(false);
  }
  function reimprospateaza() { construiestePaleta(); deseneazaWs(); construiestePersonaje(); actualizeazaProp(true); UI.monitoare(true); }
  function anuleaza() { if (!E.undo.length) return; E.redo.push(instantaneu()); restaureaza(E.undo.pop()); butoaneAnulare(); }
  function reface() { if (!E.redo.length) return; E.undo.push(instantaneu()); restaureaza(E.redo.pop()); butoaneAnulare(); }
  function butoaneAnulare() { if (D.btnAnul) { D.btnAnul.disabled = !E.undo.length; D.btnRef.disabled = !E.redo.length; } }

  // ---------- Zona de scripturi ----------
  function aplicaVedere() { const v = vedere(); D.canvas.setAttribute('transform', `translate(${v.sx} ${v.sy}) scale(${E.zoom})`); }
  function laWs(cx, cy) { const r = D.wsSvg.getBoundingClientRect(), v = vedere(); return [(cx - r.left - v.sx) / E.zoom, (cy - r.top - v.sy) / E.zoom]; }
  function deseneazaWs() {
    const t = tintaEd();
    D.stive.replaceChildren(); D.comLinii.replaceChildren(); D.comentarii.replaceChildren();
    E.rec = recGol(); E.elStive.clear(); E.elBlocuri.clear(); E.evTop = new Set(); E.evCur = new Set();
    for (const top of t.blocuri) {
      const r = deseneazaStiva(top, t);
      const g = sv('g', { transform: `translate(${top.x} ${top.y})`, class: 'ap-blocuri-top', 'data-top': top.id }, r.el);
      D.stive.append(g); adaugaRec(E.rec, r.rec, top.x, top.y); E.elStive.set(top.id, g);
    }
    for (const rb of E.rec.blocuri) E.elBlocuri.set(rb.b.id, rb);
    deseneazaComentarii();
    aplicaVedere();
    D.wsGol.hidden = t.blocuri.length > 0 || t.comentarii.length > 0;
    evidentiere();
    programeazaCod();
  }
  // Comentarii (libere sau lipite de un bloc)
  function deseneazaComentarii() {
    const t = tintaEd();
    t.comentarii = t.comentarii.filter((c) => c && typeof c === 'object');
    for (const c of t.comentarii) {
      let x = c.x, y = c.y;
      const rb = c.bloc ? E.elBlocuri.get(c.bloc) : null;
      if (c.bloc && !rb) { c.bloc = null; }
      if (rb) { x = rb.x + rb.w + (c.dx ?? 24); y = rb.y + (c.dy ?? 0); c.x = x; c.y = y; D.comLinii.append(sv('line', { x1: rb.x + rb.w, y1: rb.y + 16, x2: x, y2: y + 14, stroke: '#E6D96A', 'stroke-width': 2 })); }
      const w = c.w || 200, hh = c.min ? 30 : c.h || 120;
      const fo = sv('foreignObject', { x, y, width: w, height: hh, class: 'ap-blocuri-fo' });
      const ta = h('textarea', { class: 'ap-blocuri-com-text', 'aria-label': 'Comentariu', placeholder: 'Scrie un comentariu…', oninput: () => { c.text = ta.value; schimbat(false, true); } });
      ta.value = c.text || '';
      const cap = h('div', { class: 'ap-blocuri-com-cap' },
        h('button', { type: 'button', class: 'ap-blocuri-com-btn', title: c.min ? 'Extinde' : 'Restrânge', onclick: () => { c.min = !c.min; deseneazaWs(); schimbat(false); } }, c.min ? '▸' : '▾'),
        h('span', { class: 'ap-blocuri-com-titlu' }, c.min ? (c.text || 'Comentariu').split('\n')[0].slice(0, 24) : ''),
        h('button', { type: 'button', class: 'ap-blocuri-com-btn', title: 'Șterge comentariul', onclick: () => { pasAnulare(); t.comentarii = t.comentarii.filter((x2) => x2 !== c); deseneazaWs(); schimbat(false); } }, '×'));
      cap.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        e.stopPropagation(); e.preventDefault();
        const st = { x: c.x, y: c.y, dx: c.dx ?? 24, dy: c.dy ?? 0 };
        urmareste(e, {
          prag: 2,
          misca: (ev) => { const ddx = (ev.clientX - e.clientX) / E.zoom, ddy = (ev.clientY - e.clientY) / E.zoom; if (rb) { c.dx = st.dx + ddx; c.dy = st.dy + ddy; } else { c.x = st.x + ddx; c.y = st.y + ddy; } fo.setAttribute('x', rb ? rb.x + rb.w + c.dx : c.x); fo.setAttribute('y', rb ? rb.y + c.dy : c.y); },
          gata: () => { deseneazaWs(); schimbat(false); },
        });
      });
      const div = h('div', { class: `ap-blocuri-com ${c.min ? 'min' : ''}` }, cap, c.min ? null : ta);
      fo.append(div); D.comentarii.append(fo);
    }
  }
  function adaugaComentariu(x, y, bloc) {
    pasAnulare();
    const c = { id: uid(), x, y, w: 200, h: 120, text: '', min: false };
    if (bloc) { c.bloc = bloc.id; c.dx = 24; c.dy = 0; }
    tintaEd().comentarii.push(c); deseneazaWs(); schimbat(false);
    setTimeout(() => D.comentarii.querySelector('foreignObject:last-child textarea')?.focus(), 30);
  }
  // Evidențierea scripturilor care rulează (și a blocului curent la „pas cu pas”)
  function evidentiere() {
    if (!D.stive) return;
    const t = tintaEd(); const top = new Set(), cur = new Set();
    for (const f of R.fire) {
      if (f.gata || (f.tinta !== t && f.tinta._sursa !== t)) continue;
      if (f.top) top.add(f.top.id);
      if (R.mod !== 'normal' && f.curent) cur.add(f.curent.id);
    }
    for (const id of E.evTop) if (!top.has(id)) E.elStive.get(id)?.removeAttribute('filter');
    for (const id of top) if (!E.evTop.has(id)) E.elStive.get(id)?.setAttribute('filter', 'url(#ap-blocuri-stralucire)');
    for (const id of E.evCur) if (!cur.has(id)) E.elBlocuri.get(id)?.el.classList.remove('curent');
    for (const id of cur) if (!E.evCur.has(id)) E.elBlocuri.get(id)?.el.classList.add('curent');
    E.evTop = top; E.evCur = cur;
  }

  // Detașarea unui bloc din locul lui (pentru tragere)
  function detaseaza(t, b) {
    const p = gasesteParinte(t, b);
    if (!p) return;
    if (p.fel === 'top') t.blocuri = t.blocuri.filter((x) => x !== b);
    else if (p.fel === 'next') p.p.next = null;
    else if (p.fel === 'sub') p.p.sub[p.i] = null;
    else if (p.fel === 'in') p.p.in[p.nume].b = null;
  }
  // Ștergerea unui singur bloc (cele de dedesubt urcă în locul lui)
  function stergeUnBloc(t, b) {
    const p = gasesteParinte(t, b); if (!p) return;
    const rap = forma(b) === 'rep' || forma(b) === 'bool';
    const urm = rap ? null : b.next;
    if (p.fel === 'top') { t.blocuri = t.blocuri.filter((x) => x !== b); if (urm) { urm.x = b.x; urm.y = b.y; t.blocuri.push(urm); } }
    else if (p.fel === 'next') p.p.next = urm;
    else if (p.fel === 'sub') p.p.sub[p.i] = urm;
    else if (p.fel === 'in') p.p.in[p.nume].b = null;
  }
  const apeluriProc = (t, procId, exceptie) => {
    let n = 0;
    for (const top of t.blocuri) { if (top === exceptie) continue; parcurge(top, (x) => { if (x.op === 'procedures_call' && x.proc === procId) n++; }); }
    return n;
  };

  // ----- Tragerea blocurilor -----
  function incepeTragerea(b, offX, offY, ev, origine) {
    inchideMeniu();
    const t = tintaEd();
    const r = deseneazaStiva(b, t);
    const svg = sv('svg', { class: 'ap-blocuri-svg ap-blocuri-trage-svg' });
    const g = sv('g', {}, r.el); svg.append(g);
    const strat = h('div', { class: 'ap-blocuri-trage' }); strat.append(svg);
    E.radacina.append(strat);
    E.trage = { b, offX, offY, r, g, strat, cand: null, origine, rap: forma(b) === 'rep' || forma(b) === 'bool' };
    D.ws.classList.add('trage');
    mutaTragerea(ev);
  }
  function peste(el, ev) { const r = el.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; }
  function mutaTragerea(ev) {
    const T = E.trage; if (!T) return;
    T.g.setAttribute('transform', `translate(${ev.clientX - T.offX * E.zoom} ${ev.clientY - T.offY * E.zoom}) scale(${E.zoom})`);
    const pestePaleta = peste(D.paletaZona, ev);
    D.paletaZona.classList.toggle('sterge', pestePaleta);
    T.peste = pestePaleta;
    T.cand = pestePaleta || !peste(D.ws, ev) ? null : cautaLegatura(T, ev);
    deseneazaIndicator(T);
  }
  function cautaLegatura(T, ev) {
    const [wx, wy] = laWs(ev.clientX, ev.clientY);
    const bx = wx - T.offX, by = wy - T.offY;
    let best = null, bd = 30;
    if (T.rap) {
      const bool = forma(T.b) === 'bool';
      for (const s of E.rec.sloturi) {
        if (s.tip === 'b' ? !bool : !['n', 't', 'd'].includes(s.tip)) continue;
        const d = Math.hypot(s.x - bx, s.y + s.h / 2 - (by + T.r.h / 2));
        if (d < bd) { bd = d; best = { fel: 'slot', s }; }
      }
      return best;
    }
    const sh = forma(T.b), ult = ultimul(T.b), shU = forma(ult);
    const poateJos = shU !== 'cap' && shU !== 'capc';
    for (const c of E.rec.con) {
      if (c.fel === 'top') {
        if (!poateJos) continue;
        const d = Math.hypot(c.x - bx, c.y - (by + T.r.h));
        if (d < bd) { bd = d; best = c; }
      } else {
        if (sh === 'hat' || sh === 'def') continue;
        const urm = c.fel === 'next' ? c.b.next : c.b.sub[c.i];
        if (urm && !poateJos) continue;
        const d = Math.hypot(c.x - bx, c.y - by);
        if (d < bd) { bd = d; best = c; }
      }
    }
    return best;
  }
  function deseneazaIndicator(T) {
    D.indicator.replaceChildren();
    const c = T.cand; if (!c) return;
    if (c.fel === 'slot') {
      const s = c.s;
      D.indicator.append(sv('rect', { x: s.x - 2, y: s.y - 2, width: s.w + 4, height: s.h + 4, rx: (s.h + 4) / 2, fill: 'rgba(255,255,255,.35)', stroke: '#fff', 'stroke-width': 3 }));
      return;
    }
    const w = Math.max(60, T.r.w), hh = c.fel === 'top' ? T.r.h : 40;
    const y = c.fel === 'top' ? c.y - T.r.h : c.y;
    D.indicator.append(sv('path', { d: caleCmd(w, hh, 'notch', true), transform: `translate(${c.x} ${y})`, fill: 'rgba(0,0,0,.18)', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 1 }));
  }
  function terminaTragerea(ev, anulat) {
    const T = E.trage; if (!T) return;
    E.trage = null; T.strat.remove(); D.indicator.replaceChildren();
    D.paletaZona.classList.remove('sterge'); D.ws.classList.remove('trage');
    const t = tintaEd();
    if (!T.peste && !peste(D.ws, ev)) anulat = true;
    if (anulat && T.origine.paleta) return;
    if (!T.origine.paleta) { /* pasul de anulare s-a făcut la început */ } else pasAnulare();
    if (anulat) { T.b.x = T.origine.x; T.b.y = T.origine.y; t.blocuri.push(T.b); deseneazaWs(); schimbat(); return; }
    if (T.peste) {
      // Ștergere: tras înapoi în paletă
      let def = null; parcurge(T.b, (x) => { if (x.op === 'procedures_definition') def = x; });
      if (def && apeluriProc(t, def.proc.id, null) > 0) {
        T.b.x = T.origine.x ?? 40; T.b.y = T.origine.y ?? 40; t.blocuri.push(T.b);
        toast('Blocul „' + textProc(def.proc) + '” este folosit. Șterge mai întâi blocurile care îl apelează.', 'avert');
      }
      deseneazaWs(); construiestePaleta(); schimbat(); return;
    }
    const c = T.cand;
    const [wx, wy] = laWs(ev.clientX, ev.clientY);
    if (!c) { T.b.x = Math.round(wx - T.offX); T.b.y = Math.round(wy - T.offY); t.blocuri.push(T.b); }
    else if (c.fel === 'slot') {
      const inp = c.s.b.in[c.s.nume];
      if (inp.b) { const vechi = inp.b; vechi.x = c.s.x + c.s.w + 30; vechi.y = c.s.y + 30; t.blocuri.push(vechi); }
      inp.b = T.b; delete T.b.x; delete T.b.y;
    } else if (c.fel === 'next') { ultimul(T.b).next = c.b.next; c.b.next = T.b; }
    else if (c.fel === 'sub') { ultimul(T.b).next = c.b.sub[c.i]; c.b.sub[c.i] = T.b; }
    else if (c.fel === 'top') {
      const jos = c.b; t.blocuri = t.blocuri.filter((x) => x !== jos);
      ultimul(T.b).next = jos; T.b.x = jos.x; T.b.y = jos.y - T.r.h; t.blocuri.push(T.b);
    }
    if (c && c.fel !== 'top') { /* blocul nu mai e de sine stătător */ delete T.b.x; delete T.b.y; }
    deseneazaWs(); schimbat();
    if (T.b.op === 'procedures_definition' || T.origine.paleta && /^data_/.test(T.b.op)) construiestePaleta();
  }

  // ----- Evenimentele din zona de scripturi -----
  function laApasareWs(e) {
    if (e.button === 2 || E.trage) return;
    if (e.target.closest('.ap-blocuri-fo')) return;
    inchideMeniu(); inchideEditor();
    const t = tintaEd();
    const argEl = e.target.closest('[data-argsrc]');
    const blEl = e.target.closest('[data-id]');
    if (argEl) {
      e.preventDefault();
      urmareste(e, {
        start: (ev) => { const b = blocArg(argEl.getAttribute('data-argsrc'), argEl.getAttribute('data-argbool') === '1'); incepeTragerea(b, 12, 12, ev, { paleta: true }); },
        misca: mutaTragerea, gata: terminaTragerea,
        lung: (x, y) => meniuBloc(gasesteBloc(t, argEl.getAttribute('data-owner')), x, y),
      });
      return;
    }
    if (blEl) {
      e.preventDefault();
      const b = gasesteBloc(t, blEl.getAttribute('data-id'));
      if (!b) return;
      const slEl = e.target.closest('[data-slot]');
      urmareste(e, {
        start: (ev, x0, y0) => {
          const rb = E.elBlocuri.get(b.id);
          const [wx, wy] = laWs(x0, y0);
          const ox = wx - rb.x, oy = wy - rb.y;
          const p = gasesteParinte(t, b);
          pasAnulare();
          const origine = { x: rb.x, y: rb.y, paleta: false };
          detaseaza(t, b);
          if (p?.fel !== 'top' || true) { b.x = rb.x; b.y = rb.y; }
          deseneazaWs();
          incepeTragerea(b, ox, oy, ev, origine);
        },
        misca: mutaTragerea, gata: terminaTragerea,
        clic: () => {
          if (slEl && slEl.getAttribute('data-owner')) { const ob = gasesteBloc(t, slEl.getAttribute('data-owner')); if (ob) return editeazaSlot(ob, slEl.getAttribute('data-slot'), slEl); }
          clicPeBloc(t, b, blEl);
        },
        lung: (x, y) => meniuBloc(b, x, y),
      });
      return;
    }
    // spațiu gol: deplasarea zonei
    const v = vedere(), sx = v.sx, sy = v.sy;
    urmareste(e, {
      prag: 3,
      misca: (ev) => { v.sx = sx + ev.clientX - e.clientX; v.sy = sy + ev.clientY - e.clientY; aplicaVedere(); },
      lung: (x, y) => meniuWs(x, y),
    });
  }
  // Clic pe un script: îl pornește (sau îl oprește dacă deja rulează)
  function clicPeBloc(t, b) {
    const sh = forma(b);
    if (sh === 'rep' || sh === 'bool') { arataValoare(b, t); return; }
    const top = topul(t, b) || b;
    const vechi = R.fire.find((f) => f.tinta === t && f.top === top && !f.gata);
    if (vechi) { vechi.gata = true; R.fire = R.fire.filter((f) => !f.gata); evidentiere(); return; }
    audio();
    const sht = forma(top);
    pornesteFir(t, top, sht === 'hat' || sht === 'def' ? top.next : top);
  }
  function arataValoare(b, t) {
    let v;
    try { v = val({ tinta: t, cadre: [] }, b); } catch { v = ''; }
    const rb = E.elBlocuri.get(b.id) || null;
    const r = rb ? rb.el.getBoundingClientRect() : D.ws.getBoundingClientRect();
    const rr = E.radacina.getBoundingClientRect();
    const bal = h('div', { class: 'ap-blocuri-valoare' }, str(v));
    E.radacina.append(bal);
    bal.style.left = `${r.left - rr.left}px`; bal.style.top = `${r.bottom - rr.top + 6}px`;
    setTimeout(() => bal.remove(), 2400);
  }
  function meniuBloc(b, x, y) {
    if (!b) return;
    const t = tintaEd();
    const it = [];
    if (b.op === 'procedures_definition' || b.op === 'procedures_call') {
      const proc = b.op === 'procedures_definition' ? b.proc : procDupaId(t, b.proc);
      if (proc) it.push({ text: 'Editează blocul…', fn: () => dialogBloc(proc) });
    }
    if (b.op !== 'procedures_definition') it.push({ text: 'Duplică', fn: () => {
      pasAnulare(); const c = cloneaza(b, forma(b) !== 'rep' && forma(b) !== 'bool');
      const rb = E.elBlocuri.get(b.id); c.x = (rb?.x ?? 40) + 24; c.y = (rb?.y ?? 40) + 24; t.blocuri.push(c); deseneazaWs(); schimbat();
    } });
    it.push({ text: 'Adaugă un comentariu', fn: () => adaugaComentariu(0, 0, b) });
    it.push({ sep: true });
    if (b.op === 'procedures_definition') {
      it.push({ text: 'Șterge blocul definit', fn: () => {
        if (apeluriProc(t, b.proc.id, null) > 0) return toast('Blocul este folosit. Șterge mai întâi blocurile care îl apelează.', 'avert');
        pasAnulare(); t.blocuri = t.blocuri.filter((x2) => x2 !== b); deseneazaWs(); construiestePaleta(); schimbat();
      } });
    } else {
      let n = 0; parcurge(b, () => n++, false);
      it.push({ text: n > 1 ? `Șterge ${n} blocuri` : 'Șterge blocul', fn: () => { pasAnulare(); stergeUnBloc(t, b); deseneazaWs(); schimbat(); } });
    }
    meniu(it, x, y);
  }
  function meniuWs(x, y) {
    const t = tintaEd(); let n = 0; t.blocuri.forEach((b) => parcurge(b, () => n++));
    const [wx, wy] = laWs(x, y);
    meniu([
      { text: 'Anulează', dez: !E.undo.length, fn: anuleaza },
      { text: 'Refă', dez: !E.redo.length, fn: reface },
      { text: 'Aranjează blocurile', fn: aranjeaza },
      { text: 'Adaugă un comentariu', fn: () => adaugaComentariu(Math.round(wx), Math.round(wy)) },
      { sep: true },
      { text: `Șterge toate blocurile (${n})`, dez: !n, fn: async () => {
        const ok = await dialog('Șterge toate blocurile', h('p', {}, `Sigur ștergi toate cele ${n} blocuri ale personajului „${t.nume}”?`), [['Anulează', (i) => i(false)], ['Șterge', (i) => i(true), 'pericol']]);
        if (ok) { pasAnulare(); t.blocuri = []; t.comentarii = t.comentarii.filter((c) => !c.bloc); deseneazaWs(); construiestePaleta(); schimbat(); }
      } },
    ], x, y);
  }
  function aranjeaza() {
    const t = tintaEd(); pasAnulare();
    const tops = t.blocuri.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    // definițiile și scripturile cu pălărie întâi, apoi blocurile rătăcite
    tops.sort((a, b) => (forma(b) === 'def') - (forma(a) === 'def'));
    let y = 20;
    for (const b of tops) { b.x = 20; b.y = y + (forma(b) === 'hat' || forma(b) === 'def' ? 0 : 0); y += deseneazaStiva(b, t).h + 32; }
    t.blocuri = tops;
    const v = vedere(); v.sx = 20; v.sy = 20;
    deseneazaWs(); schimbat();
  }
  function zoomLa(z, cx, cy) {
    const v = vedere(); const r = D.wsSvg.getBoundingClientRect();
    const px = cx ?? r.left + r.width / 2, py = cy ?? r.top + r.height / 2;
    const [wx, wy] = laWs(px, py);
    E.zoom = clamp(z, 0.35, 2);
    v.sx = px - r.left - wx * E.zoom; v.sy = py - r.top - wy * E.zoom;
    aplicaVedere(); lsScrie(LS_PREF, { ...lsCiteste(LS_PREF, {}), zoom: E.zoom });
  }

  // ----- Editarea câmpurilor -----
  let editorCamp = null;
  function inchideEditor() { if (editorCamp) { const f = editorCamp; editorCamp = null; f.commit(); } }
  function editeazaSlot(b, nume, el) {
    const t = tintaEd();
    const tok = jetoane(b, t).find((x) => x.t === 'arg' && x.name === nume);
    if (!tok) return;
    const inp = b.in[nume];
    const r = el.getBoundingClientRect();
    if (tok.type === 'n' || tok.type === 't') {
      const rr = E.radacina.getBoundingClientRect();
      const ed = h('input', { type: 'text', class: 'ap-blocuri-edcamp', value: inp.v, 'aria-label': 'Valoare', inputmode: tok.type === 'n' ? 'decimal' : 'text', spellcheck: 'false' });
      ed.style.left = `${r.left - rr.left}px`; ed.style.top = `${r.top - rr.top}px`; ed.style.height = `${r.height}px`;
      ed.style.minWidth = `${r.width}px`; ed.style.fontSize = `${12 * E.zoom}px`; ed.style.borderRadius = `${r.height / 2}px`;
      const potriveste = () => { ed.style.width = `${Math.max(r.width, latime(ed.value) * E.zoom + 22)}px`; };
      potriveste();
      let anul = false;
      ed.addEventListener('input', () => { if (tok.type === 'n') { const v = ed.value.replace(/[^0-9.,\-eE]/g, ''); if (v !== ed.value) ed.value = v; } potriveste(); });
      ed.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); inchideEditor(); } else if (e.key === 'Escape') { anul = true; inchideEditor(); } });
      ed.addEventListener('blur', () => setTimeout(() => { if (editorCamp?.ed === ed) inchideEditor(); }, 0));
      editorCamp = {
        ed, commit: () => {
          ed.remove();
          if (anul) return;
          let v = ed.value; if (tok.type === 'n') v = v.replace(',', '.');
          if (v !== String(inp.v)) { pasAnulare(); inp.v = v; deseneazaWs(); schimbat(); if (b.op === 'motion_gotoxy' || b.op === 'motion_glidesecstoxy') { /* nimic */ } }
        },
      };
      E.radacina.append(ed); ed.focus(); ed.select();
      return;
    }
    if (tok.type === 'c') { alegeCuloare(inp.v, r, (v) => { pasAnulare(); inp.v = v; deseneazaWs(); schimbat(); }); return; }
    if (tok.type === 'b') return;
    // liste derulante
    const meniuId = tok.type === 'v' ? 'var' : tok.type === 'l' ? 'lista' : tok.menu;
    const opt = optiuniMeniu(meniuId, t, b);
    meniu(opt.map(([text, v]) => ({
      text, bifat: v === inp.v, fn: async () => {
        if (v === '__nou') {
          const n = await cere('Mesaj nou', 'Numele mesajului', '');
          if (!n) return;
          if (!P.mesaje.includes(n)) P.mesaje.push(n);
          pasAnulare(); inp.v = n; deseneazaWs(); construiestePaleta(); schimbat(); return;
        }
        if (v === '__redenumeste') return redenumesteVar(tok.type === 'l', inp.v);
        if (v === '__sterge') return stergeVar(tok.type === 'l', inp.v);
        pasAnulare(); inp.v = v; deseneazaWs(); schimbat();
      },
    })), r.left, r.bottom + 4, { cls: 'derulant' });
  }
  // Alegerea unei culori: culori gata, selector și pipeta de pe scenă
  function alegeCuloare(curent, r, fn) {
    const CUL = ['#000000', '#ffffff', '#e53935', '#ff9800', '#ffd500', '#4caf50', '#0fbd8c', '#4c97ff', '#1f6fd1', '#9966ff', '#ff6680', '#8b5a2b', '#9e9e9e', '#2f5d46', '#00bcd4', '#ff4081'];
    inchideMeniu();
    const m = h('div', { class: 'ap-blocuri-meniu ap-blocuri-culori', role: 'dialog', 'aria-label': 'Alege culoarea' });
    const grila = h('div', { class: 'ap-blocuri-culori-grila' }, CUL.map((c) => {
      const b = h('button', { type: 'button', class: c === curent ? 'bifat' : '', title: c, 'aria-label': c, onclick: () => { inchideMeniu(); fn(c); } });
      b.style.background = c; return b;
    }));
    const inp = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(curent) ? curent : '#000000', 'aria-label': 'Altă culoare', onchange: () => { inchideMeniu(); fn(inp.value); } });
    const pip = h('button', { type: 'button', class: 'ap-blocuri-pipeta', onclick: () => { inchideMeniu(); E.pipeta = fn; D.scenaZona.classList.add('pipeta'); toast('Dă clic pe scenă pe culoarea dorită.'); } }, '◉ Ia culoarea de pe scenă');
    m.append(grila, h('label', { class: 'ap-blocuri-culori-alta' }, 'Altă culoare: ', inp), pip);
    E.radacina.append(m);
    const rr = E.radacina.getBoundingClientRect();
    m.style.left = `${clamp(r.left - rr.left, 4, rr.width - 230)}px`; m.style.top = `${Math.min(r.bottom - rr.top + 4, rr.height - m.offsetHeight - 4)}px`;
    meniuDeschis = m;
  }

  // ----- Variabile și liste -----
  async function creeazaVar(lista) {
    const t = tintaEd();
    const radio = t.scena ? null : h('div', { class: 'ap-blocuri-radio' },
      h('label', {}, h('input', { type: 'radio', name: 'ap-blocuri-vis', value: 'toate', checked: true }), ' Pentru toate personajele'),
      h('label', {}, h('input', { type: 'radio', name: 'ap-blocuri-vis', value: 'local' }), ' Doar pentru acest personaj'));
    const n = await cere(lista ? 'Listă nouă' : 'Variabilă nouă', lista ? 'Numele listei' : 'Numele variabilei', '', radio);
    if (!n) return;
    const local = radio && radio.querySelector('input:checked')?.value === 'local';
    const vazute = lista ? listeVazute(t) : variabileVazute(t);
    if (vazute.some((v) => v.nume === n) || (!local && P.tinte.some((x) => (lista ? x.liste : x.variabile).some((v) => v.nume === n)))) return toast(`Există deja ${lista ? 'o listă' : 'o variabilă'} numită „${n}”.`, 'avert');
    pasAnulare();
    const v = lista ? { id: uid(), nume: n, val: [] } : { id: uid(), nume: n, val: 0 };
    (local ? t : scena())[lista ? 'liste' : 'variabile'].push(v);
    P.monitoare[v.id] = { vizibil: true };
    construiestePaleta(); UI.monitoare(true); schimbat();
    sectiune('variabile');
  }
  async function redenumesteVar(lista, id) {
    const t = tintaEd(); const v = lista ? gasesteLista(t, id) : gasesteVar(t, id); if (!v) return;
    const n = await cere(lista ? 'Redenumește lista' : 'Redenumește variabila', 'Numele nou', v.nume);
    if (!n || n === v.nume) return;
    pasAnulare(); v.nume = n; deseneazaWs(); construiestePaleta(); UI.monitoare(true); schimbat();
  }
  async function stergeVar(lista, id) {
    const t = tintaEd(); const v = lista ? gasesteLista(t, id) : gasesteVar(t, id); if (!v) return;
    const ok = await dialog(lista ? 'Șterge lista' : 'Șterge variabila', h('p', {}, `Ștergi „${v.nume}” și toate blocurile care o folosesc?`), [['Anulează', (i) => i(false)], ['Șterge', (i) => i(true), 'pericol']]);
    if (!ok) return;
    pasAnulare();
    const cheie = lista ? 'LIST' : 'VARIABLE';
    for (const x of P.tinte) {
      x.variabile = x.variabile.filter((y) => y.id !== id); x.liste = x.liste.filter((y) => y.id !== id);
      let gasit = true;
      while (gasit) {
        gasit = false;
        for (const top of x.blocuri) parcurge(top, (b) => { if (!gasit && b.in[cheie]?.v === id && 'VARIABLE LIST'.includes(cheie)) { gasit = b; } });
        if (gasit) stergeUnBloc(x, gasit);
      }
    }
    delete P.monitoare[id];
    deseneazaWs(); construiestePaleta(); UI.monitoare(true); schimbat();
  }

  // ----- Fereastra „Creează un bloc” -----
  function dialogBloc(procExistent) {
    const t = tintaEd();
    const parts = procExistent ? procExistent.parts.map((p) => ({ ...p })) : [{ t: 'l', text: '' }];
    let warp = procExistent ? !!procExistent.warp : false;
    const proto = h('div', { class: 'ap-blocuri-proto' });
    const deseneaza = (focus) => {
      proto.replaceChildren();
      parts.forEach((p, i) => {
        const inp = h('input', {
          type: 'text', value: p.t === 'l' ? p.text : p.name, maxlength: 40, spellcheck: 'false',
          class: `ap-blocuri-proto-${p.t === 'l' ? 'et' : p.t === 'b' ? 'bool' : 'arg'}`,
          'aria-label': p.t === 'l' ? 'Etichetă' : p.t === 'b' ? 'Numele intrării booleene' : 'Numele intrării număr sau text',
          placeholder: i === 0 && p.t === 'l' ? 'numele blocului' : p.t === 'l' ? 'etichetă' : '',
          oninput: () => { if (p.t === 'l') p.text = inp.value; else p.name = inp.value; potriveste(); },
        });
        const potriveste = () => { inp.style.width = `${Math.max(p.t === 'l' ? 40 : 30, latime(inp.value || inp.placeholder) + 18)}px`; };
        potriveste();
        const x = h('button', { type: 'button', class: 'ap-blocuri-proto-x', title: 'Elimină', 'aria-label': 'Elimină', onclick: () => { parts.splice(i, 1); if (!parts.length) parts.push({ t: 'l', text: '' }); deseneaza(); } }, '×');
        proto.append(h('span', { class: 'ap-blocuri-proto-buc' }, inp, parts.length > 1 ? x : null));
        if (focus === i) setTimeout(() => { inp.focus(); inp.select(); }, 20);
      });
    };
    deseneaza(0);
    const numeArg = (baza) => { let n = baza, k = 2; while (parts.some((p) => p.t !== 'l' && p.name === n)) n = baza + k++; return n; };
    const adauga = (fel) => {
      if (fel === 'l') parts.push({ t: 'l', text: 'etichetă' });
      else parts.push({ t: fel, id: uid(), name: numeArg(fel === 'b' ? 'boolean' : 'număr sau text') });
      deseneaza(parts.length - 1);
    };
    const bifa = h('input', { type: 'checkbox', checked: warp || null, onchange: () => { warp = bifa.checked; } });
    const continut = [
      h('div', { class: 'ap-blocuri-proto-zona' }, proto),
      h('div', { class: 'ap-blocuri-proto-butoane' },
        h('button', { type: 'button', onclick: () => adauga('n') }, h('span', { class: 'ap-blocuri-proto-ic arg' }, ''), 'Adaugă o intrare', h('small', {}, 'număr sau text')),
        h('button', { type: 'button', onclick: () => adauga('b') }, h('span', { class: 'ap-blocuri-proto-ic bool' }, ''), 'Adaugă o intrare', h('small', {}, 'booleană')),
        h('button', { type: 'button', onclick: () => adauga('l') }, h('span', { class: 'ap-blocuri-proto-ic et' }, 'text'), 'Adaugă o etichetă')),
      h('label', { class: 'ap-blocuri-bifa' }, bifa, ' Rulează fără reîmprospătarea ecranului'),
      h('p', { class: 'ap-blocuri-nota' }, 'Exemple: „desenează pătrat” cu intrarea „latura”, sau „sari”. Blocul nou apare în categoria Blocurile mele.'),
    ];
    const ok = (inchide) => {
      const curate = parts.map((p) => (p.t === 'l' ? { t: 'l', text: p.text.trim() } : { ...p, name: p.name.trim() || 'intrare' })).filter((p) => p.t !== 'l' || p.text);
      if (!curate.length) { toast('Scrie un nume pentru bloc.', 'avert'); return; }
      const vazute = new Set();
      for (const p of curate) if (p.t !== 'l') { let n = p.name, k = 2; while (vazute.has(n)) n = p.name + k++; p.name = n; vazute.add(n); }
      inchide(curate);
    };
    dialog(procExistent ? 'Editează blocul' : 'Creează un bloc', continut, [['Anulează', (i) => i(null)], ['OK', ok, 'principal']], { cls: 'ap-blocuri-dialog-bloc', enter: ok }).then((noi) => {
      if (!noi) return;
      pasAnulare();
      if (procExistent) {
        const def = definitii(t).find((d) => d.proc === procExistent || d.proc.id === procExistent.id);
        const vechi = new Map(procExistent.parts.filter((p) => p.t !== 'l').map((p) => [p.id, p.name]));
        // parametrii redenumiți: actualizăm raportoarele din corpul definiției
        if (def) for (const p of noi) if (p.t !== 'l' && vechi.has(p.id) && vechi.get(p.id) !== p.name) {
          parcurge(def, (x) => { if ((x.op === 'argument_reporter' || x.op === 'argument_bool') && x.nume === vechi.get(p.id)) x.nume = p.name; });
        }
        procExistent.parts = noi; procExistent.warp = warp;
        const ids = new Set(noi.filter((p) => p.t !== 'l').map((p) => p.id));
        for (const top of t.blocuri) parcurge(top, (x) => {
          if (x.op !== 'procedures_call' || x.proc !== procExistent.id) return;
          for (const k of Object.keys(x.in)) if (!ids.has(k)) delete x.in[k];
          for (const id of ids) if (!x.in[id]) x.in[id] = { v: '', b: null };
        });
      } else {
        const proc = { id: uid(), parts: noi, warp };
        const d = blocDefinitie(proc);
        const r = D.wsSvg.getBoundingClientRect();
        const [wx, wy] = laWs(r.left + 40, r.top + 50);
        d.x = Math.round(wx); d.y = Math.round(wy);
        // nu așezăm peste alt script
        for (let k = 0; k < 20 && t.blocuri.some((b) => Math.abs(b.x - d.x) < 60 && Math.abs(b.y - d.y) < 50); k++) d.y += 70;
        t.blocuri.push(d);
      }
      deseneazaWs(); construiestePaleta(); schimbat();
      sectiune('blocurilemele');
      if (!procExistent) toast('Blocul nou e în „Blocurile mele”. Construiește sub „definește” ce face blocul.', 'ok');
    });
  }

  // ---------- Paleta de blocuri ----------
  function sabloane(t) {
    const S = [];
    const add = (op, fn) => { const b = bloc(op); fn?.(b); S.push({ cat: SPEC[op].cat, b }); return b; };
    const sp = !t.scena;
    const altPers = personaje().find((p) => p !== t)?.nume || '';
    // Mișcare
    if (sp) {
      ['motion_movesteps', 'motion_turnright', 'motion_turnleft', 'motion_goto'].forEach((o) => add(o));
      add('motion_gotoxy', (b) => { b.in.X.v = String(Math.round(t.x)); b.in.Y.v = String(Math.round(t.y)); });
      add('motion_glideto');
      add('motion_glidesecstoxy', (b) => { b.in.X.v = String(Math.round(t.x)); b.in.Y.v = String(Math.round(t.y)); });
      ['motion_pointindirection', 'motion_pointtowards', 'motion_changexby', 'motion_setx', 'motion_changeyby', 'motion_sety', 'motion_ifonedgebounce', 'motion_setrotationstyle', 'motion_xposition', 'motion_yposition', 'motion_direction'].forEach((o) => add(o));
      add('motion_setx', (b) => { b.in.X.v = String(Math.round(t.x)); }); S.pop();
    }
    // Aspect
    if (sp) {
      ['looks_sayforsecs', 'looks_say', 'looks_thinkforsecs', 'looks_think'].forEach((o) => add(o));
      add('looks_switchcostumeto', (b) => { b.in.COSTUME.v = t.costume[1]?.nume || t.costume[0].nume; });
      add('looks_nextcostume');
    }
    add('looks_switchbackdropto', (b) => { b.in.BACKDROP.v = scena().costume[0].nume; });
    add('looks_nextbackdrop');
    if (sp) ['looks_changesizeby', 'looks_setsizeto'].forEach((o) => add(o));
    ['looks_changeeffectby', 'looks_seteffectto', 'looks_cleargraphiceffects'].forEach((o) => add(o));
    if (sp) ['looks_show', 'looks_hide', 'looks_gotofrontback', 'looks_costumenumbername'].forEach((o) => add(o));
    add('looks_backdropnumbername');
    if (sp) add('looks_size');
    // Sunet
    const sn = t.sunete[0]?.nume || 'Pop';
    add('sound_playuntildone', (b) => { b.in.SOUND_MENU.v = sn; });
    add('sound_play', (b) => { b.in.SOUND_MENU.v = sn; });
    ['sound_stopallsounds', 'music_playnote', 'music_rest', 'music_setinstrument', 'music_settempo', 'sound_changevolumeby', 'sound_setvolumeto', 'sound_volume', 'music_tempo'].forEach((o) => add(o));
    // Evenimente
    add('event_whenflagclicked'); add('event_whenkeypressed');
    add('event_whenthisspriteclicked');
    add('event_whenbackdropswitchesto', (b) => { b.in.BACKDROP.v = scena().costume[0].nume; });
    const msg = P.mesaje[0] || 'mesaj1';
    add('event_whenbroadcastreceived', (b) => { b.in.BROADCAST_OPTION.v = msg; });
    add('event_broadcast', (b) => { b.in.BROADCAST_INPUT.v = msg; });
    add('event_broadcastandwait', (b) => { b.in.BROADCAST_INPUT.v = msg; });
    // Control
    ['control_wait', 'control_repeat', 'control_forever', 'control_if', 'control_if_else', 'control_wait_until', 'control_repeat_until', 'control_stop'].forEach((o) => add(o));
    if (sp) add('control_start_as_clone');
    if (sp || altPers) add('control_create_clone_of', (b) => { if (!sp) b.in.CLONE_OPTION.v = altPers; });
    if (sp) add('control_delete_this_clone');
    // Detectare
    if (sp) {
      add('sensing_touchingobject'); add('sensing_touchingcolor'); add('sensing_coloristouchingcolor'); add('sensing_distanceto');
    }
    ['sensing_askandwait', 'sensing_answer', 'sensing_keypressed', 'sensing_mousedown', 'sensing_mousex', 'sensing_mousey', 'sensing_timer', 'sensing_resettimer'].forEach((o) => add(o));
    // Operatori
    ['operator_add', 'operator_subtract', 'operator_multiply', 'operator_divide', 'operator_random', 'operator_gt', 'operator_lt', 'operator_equals', 'operator_and', 'operator_or', 'operator_not', 'operator_join', 'operator_letter_of', 'operator_length', 'operator_contains', 'operator_mod', 'operator_round', 'operator_mathop'].forEach((o) => add(o));
    // Creion
    if (sp) ['pen_clear', 'pen_stamp', 'pen_penDown', 'pen_penUp', 'pen_setPenColorToColor', 'pen_changePenColorBy', 'pen_changePenSizeBy', 'pen_setPenSizeTo'].forEach((o) => add(o));
    else add('pen_clear');
    return S;
  }
  function itemPaleta(b, t) {
    const r = svgBloc(b, t, false);
    r.svg.setAttribute('width', Math.ceil((r.w + 2) * PSCALA)); r.svg.setAttribute('height', Math.ceil((r.h + ND + 2) * PSCALA));
    const d = h('div', { class: 'ap-blocuri-pitem' }); d.append(r.svg);
    r.svg.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      inchideMeniu(); inchideEditor();
      if (e.pointerType === 'mouse') e.preventDefault();
      urmareste(e, {
        orizontal: true,
        start: (ev, x0, y0) => {
          const rr = r.svg.getBoundingClientRect();
          const ox = (x0 - rr.left) / PSCALA - 1, oy = (y0 - rr.top) / PSCALA - 1;
          const c = cloneaza(b, false);
          incepeTragerea(c, ox, oy, ev, { paleta: true });
        },
        misca: mutaTragerea, gata: terminaTragerea,
        clic: () => {
          const sh = forma(b);
          if (sh === 'rep' || sh === 'bool') {
            let v; try { v = val({ tinta: t, cadre: [] }, b); } catch { v = ''; }
            const rr = r.svg.getBoundingClientRect(), ro = E.radacina.getBoundingClientRect();
            const bal = h('div', { class: 'ap-blocuri-valoare' }, str(v)); E.radacina.append(bal);
            bal.style.left = `${rr.left - ro.left}px`; bal.style.top = `${rr.bottom - ro.top + 4}px`; setTimeout(() => bal.remove(), 2200);
          } else if (sh !== 'hat' && sh !== 'def') { audio(); pornesteFir(t, null, cloneaza(b, false)); }
        },
      });
    });
    r.svg.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    return d;
  }
  function sectiune(cat) {
    const s = D.paleta.querySelector(`[data-sectiune="${cat}"]`);
    if (s) D.paleta.scrollTo({ top: s.offsetTop - 4, behavior: 'smooth' });
    marcheazaCat(cat);
  }
  function marcheazaCat(cat) { D.cat?.querySelectorAll('button').forEach((b) => b.classList.toggle('activ', b.dataset.cat === cat)); }
  function construiestePaleta() {
    if (!D.paleta) return;
    const t = tintaEd();
    const sus = D.paleta.scrollTop;
    D.paleta.replaceChildren();
    const sab = sabloane(t);
    const sect = (cat) => {
      const c = CAT[cat];
      const el = h('section', { class: 'ap-blocuri-psect', 'data-sectiune': cat }, h('h3', {}, c.nume));
      D.paleta.append(el); return el;
    };
    for (const c of CATS) {
      if (c.ascuns) continue;
      const el = sect(c.id);
      if (c.id === 'miscare' && t.scena) { el.append(h('p', { class: 'ap-blocuri-pnota' }, 'Ai selectat Scena: scena nu are blocuri de mișcare.')); continue; }
      if (c.id === 'variabile') {
        el.append(h('button', { type: 'button', class: 'ap-blocuri-pbtn', onclick: () => creeazaVar(false) }, 'Creează o variabilă'));
        const vars = variabileVazute(t);
        for (const v of vars) {
          const b = bloc('data_variable'); b.in.VARIABLE.v = v.id;
          const it = itemPaleta(b, t);
          const cb = h('input', { type: 'checkbox', class: 'ap-blocuri-pbifa', title: 'Arată pe scenă', 'aria-label': `Arată variabila ${v.nume} pe scenă`, checked: P.monitoare[v.id]?.vizibil ? true : null, onchange: () => { (P.monitoare[v.id] || (P.monitoare[v.id] = {})).vizibil = cb.checked; UI.monitoare(true); schimbat(false); } });
          it.prepend(cb);
          it.addEventListener('contextmenu', (e) => { e.preventDefault(); meniu([{ text: 'Redenumește variabila…', fn: () => redenumesteVar(false, v.id) }, { text: `Șterge variabila „${v.nume}”`, fn: () => stergeVar(false, v.id) }], e.clientX, e.clientY); });
          el.append(it);
        }
        if (vars.length) {
          const id0 = vars[0].id;
          for (const op of ['data_setvariableto', 'data_changevariableby', 'data_showvariable', 'data_hidevariable']) { const b = bloc(op); b.in.VARIABLE.v = id0; el.append(itemPaleta(b, t)); }
        }
        el.append(h('button', { type: 'button', class: 'ap-blocuri-pbtn', onclick: () => creeazaVar(true) }, 'Creează o listă'));
        const liste = listeVazute(t);
        for (const l of liste) {
          const b = bloc('data_listcontents'); b.in.LIST.v = l.id;
          const it = itemPaleta(b, t);
          const cb = h('input', { type: 'checkbox', class: 'ap-blocuri-pbifa', title: 'Arată pe scenă', 'aria-label': `Arată lista ${l.nume} pe scenă`, checked: P.monitoare[l.id]?.vizibil ? true : null, onchange: () => { (P.monitoare[l.id] || (P.monitoare[l.id] = {})).vizibil = cb.checked; UI.monitoare(true); schimbat(false); } });
          it.prepend(cb);
          it.addEventListener('contextmenu', (e) => { e.preventDefault(); meniu([{ text: 'Redenumește lista…', fn: () => redenumesteVar(true, l.id) }, { text: `Șterge lista „${l.nume}”`, fn: () => stergeVar(true, l.id) }], e.clientX, e.clientY); });
          el.append(it);
        }
        if (liste.length) {
          const id0 = liste[0].id;
          for (const op of ['data_addtolist', 'data_deleteoflist', 'data_deletealloflist', 'data_insertatlist', 'data_replaceitemoflist', 'data_itemoflist', 'data_itemnumoflist', 'data_lengthoflist', 'data_listcontainsitem', 'data_showlist', 'data_hidelist']) { const b = bloc(op); b.in.LIST.v = id0; el.append(itemPaleta(b, t)); }
        }
        continue;
      }
      if (c.id === 'blocurilemele') {
        el.append(h('button', { type: 'button', class: 'ap-blocuri-pbtn mele', onclick: () => dialogBloc(null) }, 'Creează un bloc'));
        for (const d of definitii(t)) {
          const it = itemPaleta(blocApel(d.proc), t);
          it.addEventListener('contextmenu', (e) => { e.preventDefault(); meniu([{ text: 'Editează blocul…', fn: () => dialogBloc(d.proc) }], e.clientX, e.clientY); });
          el.append(it);
        }
        if (!definitii(t).length) el.append(h('p', { class: 'ap-blocuri-pnota' }, 'Creează blocuri noi, de exemplu „desenează pătrat (latura)” sau „sari”.'));
        continue;
      }
      for (const s of sab) if (s.cat === c.id) el.append(itemPaleta(s.b, t));
    }
    D.paleta.append(h('div', { class: 'ap-blocuri-pfinal' }));
    D.paleta.scrollTop = sus;
  }

  // ---------- Interfața aplicației ----------
  let redesenIntern = true;
  Object.defineProperty(R, 'redesen', { get: () => redesenIntern, set: (v) => { redesenIntern = v; if (v) R.vizual = true; } });

  function ico(d, w = 18) { const s = sv('svg', { viewBox: '0 0 24 24', width: w, height: w, 'aria-hidden': 'true', class: 'ap-blocuri-ico' }); s.append(...[].concat(d)); return s; }
  const P_ = (d, o = {}) => sv('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...o });
  const ICO = {
    steag: () => { const s = sv('svg', { viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': 'true' }); s.append(sv('path', { d: 'M5 3 V22', stroke: '#45993D', 'stroke-width': 2.4, 'stroke-linecap': 'round' }), sv('path', { d: 'M6 4 c4.5 -2.8 8 2.8 13.5 0 v10 c-5.5 2.8 -9 -2.8 -13.5 0 z', fill: '#4CBF56', stroke: '#45993D', 'stroke-width': 1.4, 'stroke-linejoin': 'round' })); return s; },
    stop: () => { const s = sv('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' }); s.append(sv('path', { d: 'M8 2 H16 L22 8 V16 L16 22 H8 L2 16 V8 Z', fill: '#EC5959', stroke: '#B84848', 'stroke-width': 1.5, 'stroke-linejoin': 'round' })); return s; },
    anul: () => ico([P_('M9 14 4 9l5-5'), P_('M4 9h10.5a5.5 5.5 0 0 1 0 11H11')]),
    ref: () => ico([P_('m15 14 5-5-5-5'), P_('M20 9H9.5a5.5 5.5 0 0 0 0 11H13')]),
    salv: () => ico([P_('M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'), P_('M17 21v-8H7v8M7 3v5h8')]),
    mica: () => ico([sv('rect', { x: 3, y: 5, width: 9, height: 7, rx: 1, fill: 'currentColor' }), sv('rect', { x: 14, y: 5, width: 7, height: 14, rx: 1, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 })]),
    mare: () => ico([sv('rect', { x: 3, y: 5, width: 13, height: 10, rx: 1, fill: 'currentColor' }), sv('rect', { x: 18, y: 5, width: 3, height: 14, rx: 1, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 })]),
    complet: () => ico([P_('M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3')]),
    iesire: () => ico([P_('M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3')]),
    plus: () => ico([P_('M12 5v14M5 12h14')]),
    cod: () => ico([P_('m16 18 6-6-6-6M8 6l-6 6 6 6')]),
    play: () => ico([sv('path', { d: 'M7 4v16l13-8z', fill: 'currentColor' })], 16),
    pas: () => ico([sv('path', { d: 'M5 4v16l10-8z', fill: 'currentColor' }), sv('rect', { x: 16, y: 4, width: 3, height: 16, fill: 'currentColor' })], 16),
    trofeu: () => ico([P_('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z'), P_('M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3')]),
    ochi: () => ico([P_('M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z'), sv('circle', { cx: 12, cy: 12, r: 3, fill: 'currentColor' })], 16),
    ochiNu: () => ico([P_('M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1')], 16),
  };
  function sigla() {
    const s = sv('svg', { viewBox: '0 0 32 32', width: 26, height: 26, 'aria-hidden': 'true' });
    s.append(sv('path', { d: 'M4 8 a3 3 0 0 1 3 -3 H11 l2 2 h4 l2 -2 H25 a3 3 0 0 1 3 3 V14 a3 3 0 0 1 -3 3 H19 l-2 2 h-4 l-2 -2 H7 a3 3 0 0 1 -3 -3 Z', fill: '#FFBF00' }),
      sv('path', { d: 'M4 21 a3 3 0 0 1 3 -3 H11 l2 2 h4 l2 -2 H21 a3 3 0 0 1 3 3 V25 a3 3 0 0 1 -3 3 H7 a3 3 0 0 1 -3 -3 Z', fill: '#4C97FF' }));
    return s;
  }

  // Marcarea modificărilor + ciorna salvată automat
  let tCiorna = null, codProgramat = null;
  function schimbat(paleta = false, faraCiorna = false) {
    E.modificat = true;
    if (paleta) construiestePaleta();
    clearTimeout(tCiorna); tCiorna = setTimeout(salveazaCiorna, faraCiorna ? 2500 : 1200);
    programeazaCod();
  }
  async function salveazaCiorna() {
    tCiorna = null;
    try { await store.put({ id: CIORNA, nume: P.nume, idSalvat: E.idSalvat, proiect: proiectDeSalvat(), data: Date.now() }); } catch { /* fără loc */ }
  }
  function proiectDeSalvat() { return copie(P); }
  function programeazaCod() { if (!E.codDeschis) return; clearTimeout(codProgramat); codProgramat = setTimeout(actualizeazaCod, 250); }

  // Selectarea personajului / scenei
  function selecteaza(id) {
    inchideEditor(); inchideMeniu();
    E.tinta = id;
    construiestePaleta(); deseneazaWs(); construiestePersonaje(); actualizeazaProp(true);
    D.filaCostume.textContent = tintaEd().scena ? 'Decoruri' : 'Costume';
    if (E.fila === 'costume') construiesteCostume();
    if (E.fila === 'sunete') construiesteSunete();
    programeazaCod();
  }
  function schimbaFila(f) {
    E.fila = f;
    for (const b of D.file.querySelectorAll('button')) b.setAttribute('aria-selected', b.dataset.f === f ? 'true' : 'false');
    D.lucru.hidden = f !== 'cod'; D.costume.hidden = f !== 'costume'; D.sunete.hidden = f !== 'sunete';
    if (f === 'costume') construiesteCostume();
    if (f === 'sunete') construiesteSunete();
  }

  // ----- Panoul cu personaje și proprietăți -----
  function construiestePersonaje() {
    const t = tintaEd();
    D.tiles.replaceChildren(...personaje().map((p) => {
      const img = h('img', { src: miniatura(p.costume[p.costum]?.desen || 'minge-rosie'), alt: '', draggable: 'false' });
      const b = h('button', { type: 'button', class: `ap-blocuri-tile ${p === t ? 'sel' : ''}`, title: p.nume, onclick: () => selecteaza(p.id),
        oncontextmenu: (e) => { e.preventDefault(); meniuPersonaj(p, e.clientX, e.clientY); } }, img, h('span', {}, p.nume));
      const x = p === t ? h('span', { class: 'ap-blocuri-tile-x', role: 'button', tabindex: '0', title: 'Șterge personajul', 'aria-label': `Șterge ${p.nume}`, onclick: (e) => { e.stopPropagation(); stergePersonaj(p); } }, '×') : null;
      return h('div', { class: 'ap-blocuri-tile-w' }, b, x);
    }), h('button', { type: 'button', class: 'ap-blocuri-tile adauga', title: 'Alege un personaj', onclick: alegePersonaj }, ICO.plus(), h('span', {}, 'Personaj')));
    const sc = scena();
    D.scenaTile.replaceChildren(
      h('button', { type: 'button', class: `ap-blocuri-tile scena ${t.scena ? 'sel' : ''}`, onclick: () => selecteaza('scena') },
        h('img', { src: miniatura(sc.costume[sc.costum]?.desen || 'alb', true), alt: '' }), h('span', {}, 'Scena'), h('small', {}, `${sc.costume.length} ${sc.costume.length === 1 ? 'decor' : 'decoruri'}`)),
      h('button', { type: 'button', class: 'ap-blocuri-mic', onclick: alegeDecor, title: 'Alege un decor' }, ICO.plus(), 'Decor'));
  }
  function meniuPersonaj(p, x, y) {
    meniu([
      { text: 'Duplică', fn: () => { const c = copie(p); c.id = uid(); c.blocuri.forEach(reId); c.comentarii = []; let n = p.nume, i = 2; while (P.tinte.some((t) => t.nume === n)) n = `${p.nume}${i++}`; c.nume = n; c.x += 20; c.y -= 20; P.tinte.push(c); reconstruiesteOrdinea(); R.redesen = true; selecteaza(c.id); schimbat(); } },
      { text: 'Șterge', fn: () => stergePersonaj(p) },
    ], x, y);
  }
  async function stergePersonaj(p) {
    const ok = await dialog('Șterge personajul', h('p', {}, `Ștergi personajul „${p.nume}” împreună cu scripturile lui?`), [['Anulează', (i) => i(false)], ['Șterge', (i) => i(true), 'pericol']]);
    if (!ok) return;
    R.fire.forEach((f) => { if (f.tinta === p || f.tinta._sursa === p) f.gata = true; });
    P.tinte = P.tinte.filter((t) => t !== p); reconstruiesteOrdinea(); R.redesen = true;
    E.undo = []; E.redo = []; butoaneAnulare();
    selecteaza(personaje()[0]?.id || 'scena'); UI.monitoare(true); schimbat();
  }
  function actualizeazaProp(refa) {
    const t = tintaEd();
    if (refa || D.prop.dataset.tinta !== t.id) {
      D.prop.dataset.tinta = t.id;
      if (t.scena) { D.prop.replaceChildren(h('div', { class: 'ap-blocuri-prop-scena' }, h('strong', {}, 'Scena'), ` · decor: ${t.costume[t.costum]?.nume}`)); return; }
      const camp = (et, k, lat, cls = '') => {
        const inp = h('input', { type: k === 'nume' ? 'text' : 'number', class: `ap-blocuri-pcamp ${cls}`, 'aria-label': et, 'data-k': k, step: k === 'nume' ? null : 'any' });
        inp.style.width = `${lat}px`;
        inp.addEventListener('change', () => aplicaProp(k, inp.value));
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
        return h('label', { class: 'ap-blocuri-plab' }, h('span', {}, et), inp);
      };
      const viz = h('div', { class: 'ap-blocuri-viz', role: 'group', 'aria-label': 'Vizibil' },
        h('button', { type: 'button', 'data-v': '1', title: 'Arată', 'aria-label': 'Arată', onclick: () => aplicaProp('vizibil', true) }, ICO.ochi()),
        h('button', { type: 'button', 'data-v': '0', title: 'Ascunde', 'aria-label': 'Ascunde', onclick: () => aplicaProp('vizibil', false) }, ICO.ochiNu()));
      D.prop.replaceChildren(camp('Personaj', 'nume', 96, 'nume'), camp('x', 'x', 52), camp('y', 'y', 52), h('label', { class: 'ap-blocuri-plab' }, h('span', {}, 'Arată'), viz), camp('Mărime', 'marime', 52), camp('Direcție', 'dir', 52));
    }
    if (t.scena) return;
    for (const inp of D.prop.querySelectorAll('input')) {
      if (document.activeElement === inp) continue;
      const k = inp.dataset.k; const v = k === 'nume' ? t.nume : String(Math.round(t[k]));
      if (inp.value !== v) inp.value = v;
    }
    D.prop.querySelectorAll('.ap-blocuri-viz button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === !!t.vizibil)));
  }
  function aplicaProp(k, v) {
    const t = tintaEd(); if (t.scena) return;
    if (k === 'nume') {
      v = String(v).trim(); if (!v || v === t.nume) return actualizeazaProp();
      if (P.tinte.some((x) => x !== t && x.nume === v)) { toast('Există deja un personaj cu acest nume.', 'avert'); return actualizeazaProp(); }
      const vechi = t.nume; t.nume = v;
      // actualizăm meniurile care pomenesc personajul
      for (const x of P.tinte) for (const top of x.blocuri) parcurge(top, (b) => { for (const tok of jetoane(b, x)) if (tok.t === 'arg' && ['tinteMers', 'tinteSpre', 'atingere', 'clone'].includes(tok.menu) && b.in[tok.name]?.v === vechi) b.in[tok.name].v = v; });
      construiestePersonaje(); deseneazaWs(); UI.monitoare(true);
    } else if (k === 'vizibil') t.vizibil = v;
    else if (k === 'x') mutaLa(t, num(v), t.y, true);
    else if (k === 'y') mutaLa(t, t.x, num(v), true);
    else if (k === 'marime') t.marime = clamp(num(v), 5, 500);
    else if (k === 'dir') t.dir = normDir(num(v));
    R.redesen = true; actualizeazaProp(); schimbat(false);
  }

  // ----- Fila Costume / Decoruri -----
  function construiesteCostume() {
    const t = tintaEd();
    const lista = h('div', { class: 'ap-blocuri-clista' });
    t.costume.forEach((c, i) => {
      const it = h('button', { type: 'button', class: `ap-blocuri-citem ${i === t.costum ? 'sel' : ''}`, onclick: () => { t.costum = i; R.redesen = true; construiesteCostume(); construiestePersonaje(); schimbat(false); } },
        h('span', { class: 'nr' }, String(i + 1)), h('img', { src: miniatura(c.desen, t.scena), alt: '' }), h('span', { class: 'nm' }, c.nume));
      const x = t.costume.length > 1 ? h('button', { type: 'button', class: 'ap-blocuri-citem-x', title: 'Șterge', 'aria-label': `Șterge ${c.nume}`, onclick: () => { t.costume.splice(i, 1); t.costum = clamp(t.costum, 0, t.costume.length - 1); R.redesen = true; construiesteCostume(); construiestePersonaje(); schimbat(); } }, '×') : null;
      lista.append(h('div', { class: 'ap-blocuri-citem-w' }, it, x));
    });
    lista.append(h('button', { type: 'button', class: 'ap-blocuri-pbtn', onclick: t.scena ? alegeDecor : alegeCostum }, t.scena ? 'Alege un decor' : 'Alege un costum'));
    const c = t.costume[t.costum];
    const numeInp = h('input', { type: 'text', class: 'ap-blocuri-camp', value: c.nume, 'aria-label': 'Numele costumului', onchange: () => {
      const v = numeInp.value.trim(); if (!v) return; const vechi = c.nume; c.nume = v;
      for (const x of P.tinte) for (const top of x.blocuri) parcurge(top, (b) => { for (const tok of jetoane(b, x)) if (tok.t === 'arg' && (t.scena ? ['decoruri', 'decoruriSchimba'] : ['costume']).includes(tok.menu) && b.in[tok.name]?.v === vechi && (t.scena || x === t)) b.in[tok.name].v = v; });
      construiesteCostume(); deseneazaWs(); schimbat();
    } });
    const mare = h('img', { class: 'ap-blocuri-cmare', alt: c.nume, src: t.scena ? imagineDecor(c.desen).toDataURL('image/png') : miniaturaMare(c.desen) });
    D.costume.replaceChildren(lista, h('div', { class: 'ap-blocuri-cdetalii' },
      h('label', { class: 'ap-blocuri-et' }, t.scena ? 'Decorul' : 'Costumul', numeInp), mare,
      h('p', { class: 'ap-blocuri-nota' }, t.scena ? 'Decorul ales este cel afișat acum pe scenă. Blocurile „schimbă decorul la …” și „decorul următor” îl schimbă în timpul programului.' : 'Mai multe costume, schimbate unul după altul („costumul următor”), formează o animație.')));
  }
  function miniaturaMare(desen) {
    const im = imagineCostum(desen); const cv = document.createElement('canvas'); cv.width = 240; cv.height = 240;
    const k = Math.min(200 / im.w, 200 / im.h, 2.2); cv.getContext('2d').drawImage(im.cv, (240 - im.w * k) / 2, (240 - im.h * k) / 2, im.w * k, im.h * k);
    return cv.toDataURL('image/png');
  }
  function construiesteSunete() {
    const t = tintaEd();
    const lista = h('div', { class: 'ap-blocuri-slista' }, (t.sunete || []).map((s, i) => h('div', { class: 'ap-blocuri-sitem' },
      h('button', { type: 'button', class: 'ap-blocuri-play', title: `Ascultă ${s.nume}`, 'aria-label': `Ascultă ${s.nume}`, onclick: () => canta(t, s.nume) }, ICO.play()),
      h('span', {}, s.nume),
      h('button', { type: 'button', class: 'ap-blocuri-citem-x', title: 'Șterge', 'aria-label': `Șterge ${s.nume}`, onclick: () => { t.sunete.splice(i, 1); construiesteSunete(); construiestePaleta(); schimbat(); } }, '×'))));
    D.sunete.replaceChildren(h('div', { class: 'ap-blocuri-sunete-col' },
      h('p', { class: 'ap-blocuri-nota' }, `Sunetele pentru ${t.scena ? 'scenă' : `„${t.nume}”`}. Le folosești cu „pornește sunetul …” și „redă sunetul … până la final”. Sunetele sunt generate de calculator (nu e nevoie de fișiere).`),
      lista, h('button', { type: 'button', class: 'ap-blocuri-pbtn', onclick: alegeSunet }, 'Alege un sunet')));
  }
  // ----- Bibliotecile -----
  function grilaAlegere(itemi, alege) {
    return h('div', { class: 'ap-blocuri-bib' }, itemi.map(([img, text, v]) => h('button', { type: 'button', class: 'ap-blocuri-bib-item', onclick: () => alege(v) }, h('img', { src: img, alt: '' }), h('span', {}, text))));
  }
  function alegePersonaj() {
    const g = grilaAlegere([...BIBLIOTECA.map((b) => [miniatura(b.costume[0][0]), b.nume, b.tip]), [miniatura('stea-b'), 'Surpriză', '_surpriza']], (tip) => {
      E.dialogInchide?.(null);
      if (tip === '_surpriza') tip = BIBLIOTECA[Math.floor(Math.random() * BIBLIOTECA.length)].tip;
      const p = personajNou(tip); p.x = Math.round(Math.random() * 300 - 150); p.y = Math.round(Math.random() * 200 - 100);
      P.tinte.push(p); reconstruiesteOrdinea(); R.redesen = true; selecteaza(p.id); schimbat();
    });
    dialog('Alege un personaj', g, null, { cls: 'lat' });
  }
  function alegeDecor() {
    const g = grilaAlegere(Object.entries(DECORURI).map(([k, d]) => [miniatura(k, true), d.nume, k]), (k) => {
      E.dialogInchide?.(null);
      const sc = scena(); let n = DECORURI[k].nume, i = 2; while (sc.costume.some((c) => c.nume === n)) n = `${DECORURI[k].nume}${i++}`;
      if (sc.costume.length === 1 && sc.costume[0].desen === 'alb' && k !== 'alb' && !sc.blocuri.length && !P.tinte.some((t) => t.blocuri.some((b) => JSON.stringify(b).includes('"alb"')))) sc.costume = [];
      sc.costume.push({ nume: n, desen: k }); sc.costum = sc.costume.length - 1;
      R.redesen = true; construiestePersonaje(); if (E.fila === 'costume') construiesteCostume(); construiestePaleta(); actualizeazaProp(true); schimbat();
    });
    dialog('Alege un decor', g, null, { cls: 'lat' });
  }
  function alegeCostum() {
    const t = tintaEd();
    const g = grilaAlegere(Object.keys(DESENE).map((k) => [miniatura(k), k.replace('-', ' '), k]), (k) => {
      E.dialogInchide?.(null);
      let n = k.split('-').pop(), i = 2; while (t.costume.some((c) => c.nume === n)) n = `${k.split('-').pop()}${i++}`;
      t.costume.push({ nume: n, desen: k }); t.costum = t.costume.length - 1;
      R.redesen = true; construiesteCostume(); construiestePersonaje(); schimbat();
    });
    dialog('Alege un costum', g, null, { cls: 'lat' });
  }
  function alegeSunet() {
    const t = tintaEd();
    const g = h('div', { class: 'ap-blocuri-slista' }, Object.keys(SUNETE).map((s) => h('div', { class: 'ap-blocuri-sitem' },
      h('button', { type: 'button', class: 'ap-blocuri-play', 'aria-label': `Ascultă ${s}`, onclick: () => canta(t, s) }, ICO.play()), h('span', {}, s),
      h('button', { type: 'button', class: 'ap-blocuri-mic', onclick: () => { E.dialogInchide?.(null); if (!t.sunete.some((x) => x.nume === s)) t.sunete.push({ nume: s }); construiesteSunete(); construiestePaleta(); schimbat(); } }, 'Adaugă'))));
    dialog('Alege un sunet', g, null);
  }

  // ----- Monitoarele variabilelor pe scenă -----
  const monEl = new Map();
  function monitoare(refa) {
    if (!D.mon) return;
    if (refa) {
      D.mon.replaceChildren(); monEl.clear();
      let i = 0;
      for (const [id, m] of Object.entries(P.monitoare)) {
        if (!m?.vizibil) continue;
        let v = null, prop = null, lista = false;
        for (const t of P.tinte) { v = t.variabile.find((x) => x.id === id); if (!v) { v = t.liste.find((x) => x.id === id); lista = !!v; } if (v) { prop = t; break; } }
        if (!v) continue;
        const et = prop.scena ? v.nume : `${prop.nume}: ${v.nume}`;
        let el, valEl;
        if (lista) {
          valEl = h('ol', { class: 'ap-blocuri-mon-ol' });
          el = h('div', { class: 'ap-blocuri-mon lista' }, h('div', { class: 'ap-blocuri-mon-t' }, et), valEl, h('div', { class: 'ap-blocuri-mon-l' }, ''));
        } else {
          valEl = h('span', { class: 'ap-blocuri-mon-v' });
          el = h('div', { class: 'ap-blocuri-mon' }, h('span', { class: 'ap-blocuri-mon-n' }, et), valEl);
        }
        if (m.x == null) { m.x = 5; m.y = 5 + i * 28; }
        el.style.left = `${m.x}px`; el.style.top = `${m.y}px`;
        el.addEventListener('pointerdown', (e) => {
          if (E.ecranComplet) return;
          e.preventDefault(); e.stopPropagation();
          const k = D.scenaZona.getBoundingClientRect().width / 480, x0 = m.x, y0 = m.y;
          urmareste(e, { prag: 2, misca: (ev) => { m.x = clamp(Math.round(x0 + (ev.clientX - e.clientX) / k), 0, 440); m.y = clamp(Math.round(y0 + (ev.clientY - e.clientY) / k), 0, 340); el.style.left = `${m.x}px`; el.style.top = `${m.y}px`; }, gata: () => schimbat(false) });
        });
        D.mon.append(el); monEl.set(id, { el, valEl, v, lista, ultim: null }); i++;
      }
    }
    for (const o of monEl.values()) {
      if (o.lista) {
        const cheie = o.v.val.length + '|' + o.v.val.slice(0, 60).join('\u0001');
        if (cheie === o.ultim) continue;
        o.ultim = cheie;
        o.valEl.replaceChildren(...o.v.val.slice(0, 60).map((x) => h('li', {}, h('span', {}, str(x)))));
        o.el.lastChild.textContent = `lungime ${o.v.val.length}`;
      } else {
        const s = str(o.v.val);
        if (s !== o.ultim) { o.ultim = s; o.valEl.textContent = s; }
      }
    }
  }
  // ----- Întrebarea („întreabă și așteaptă”) -----
  function intrebare(q) {
    if (!D.intreb) return;
    if (!q) { D.intreb.hidden = true; return; }
    D.intrebText.textContent = q.s.scena || !q.s.vizibil ? q.text : '';
    D.intrebText.hidden = !D.intrebText.textContent;
    D.intrebInp.value = ''; D.intreb.hidden = false;
    D.intreb._q = q;
    setTimeout(() => D.intrebInp.focus({ preventScroll: true }), 30);
  }
  function raspunde() {
    const q = D.intreb._q; if (!q) return;
    R.raspuns = D.intrebInp.value; q.gata = true;
    R.intrebari = R.intrebari.filter((x) => x !== q);
    D.intreb.hidden = true; D.intreb._q = null;
  }

  // ----- Scena: mărime, ecran complet, mouse -----
  function aplicaMarimeScena() {
    if (!D.scenaZona) return;
    let w;
    if (E.ecranComplet) w = Math.min(window.innerWidth - 16, ((window.innerHeight - 64) * 4) / 3);
    else if (E.scenaMod === 'mare') w = 480; else w = 320;
    w = Math.max(160, Math.floor(w));
    D.scenaZona.style.width = `${w}px`; D.scenaZona.style.height = `${(w * 3) / 4}px`;
    D.strat.style.transform = `scale(${w / 480})`;
    D.dreapta.style.width = E.ecranComplet ? '' : `${w + 18}px`;
    E.radacina.classList.toggle('scena-mare', E.scenaMod === 'mare' && !E.ecranComplet);
    D.btnMica.setAttribute('aria-pressed', String(E.scenaMod === 'mica')); D.btnMare.setAttribute('aria-pressed', String(E.scenaMod === 'mare'));
  }
  function seteazaEcranComplet(v) {
    E.ecranComplet = v;
    E.radacina.classList.toggle('ecran-complet', v);
    D.btnComplet.replaceChildren(v ? ICO.iesire() : ICO.complet());
    D.btnComplet.title = v ? 'Ieși din ecranul complet (Esc)' : 'Ecran complet';
    aplicaMarimeScena();
  }
  function laScena(cx, cy) {
    const r = D.scenaZona.getBoundingClientRect();
    return [((cx - r.left) / r.width) * 480 - 240, 180 - ((cy - r.top) / r.height) * 360];
  }
  function laApasareScena(e) {
    if (e.button === 2) return;
    const [x, y] = laScena(e.clientX, e.clientY);
    if (E.pipeta) {
      const px = Math.round((x + 240) * REZ), py = Math.round((180 - y) * REZ);
      const d = R.ctx.getImageData(clamp(px, 0, 959), clamp(py, 0, 719), 1, 1).data;
      const fn = E.pipeta; E.pipeta = null; D.scenaZona.classList.remove('pipeta');
      fn(rgbHex(d[0], d[1], d[2])); return;
    }
    e.preventDefault();
    audio();
    R.mouse.x = clamp(x, -240, 240); R.mouse.y = clamp(y, -180, 180); R.mouse.jos = true;
    let s = null;
    for (let i = R.ordine.length - 1; i >= 0; i--) if (punctPePers(R.ordine[i], x, y)) { s = R.ordine[i]; break; }
    if (!s) { pornesteHat('event_whenthisspriteclicked', null, [scena()], true); return; }
    pornesteHat('event_whenthisspriteclicked', null, [s], true);
    if (E.ecranComplet) return;
    const x0 = s.x, y0 = s.y, orig = s._clona ? null : s;
    urmareste(e, {
      start: () => { if (orig && E.tinta !== orig.id) selecteaza(orig.id); },
      misca: (ev) => { const [x2, y2] = laScena(ev.clientX, ev.clientY); mutaLa(s, Math.round(x0 + x2 - x), Math.round(y0 + y2 - y)); actualizeazaProp(); },
      gata: () => { actualizeazaProp(); if (orig) { construiestePaleta(); schimbat(false); } },
    });
  }

  // ----- Bucla principală -----
  let cadru = 0;
  function buclaPrincipala() {
    if (!E.radacina?.isConnected) { E.raf = null; return; }
    E.raf = requestAnimationFrame(buclaPrincipala);
    const acum = performance.now();
    if (acum - (E.ultimPas || 0) >= 1000 / 30 - 2) {
      E.ultimPas = acum;
      if (R.fire.length) ciclu();
    }
    if (redesenIntern) { redesenIntern = false; deseneazaScena(); }
    monitoare(false);
    if (R.fire.length || E.evTop.size || E.evCur.size) evidentiere();
    const ruleaza = R.fire.length > 0;
    if (ruleaza !== E.ruleaza) { E.ruleaza = ruleaza; D.btnSteag.classList.toggle('activ', ruleaza); }
    if (++cadru % 8 === 0 && E.fila !== 'x') actualizeazaProp();
  }
  function numeTasta(e) {
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') return 'spațiu';
    if (k === 'ArrowUp') return 'săgeată sus';
    if (k === 'ArrowDown') return 'săgeată jos';
    if (k === 'ArrowLeft') return 'săgeată stânga';
    if (k === 'ArrowRight') return 'săgeată dreapta';
    if (k && k.length === 1 && /[a-z0-9]/i.test(k)) return k.toLowerCase();
    return null;
  }

  // ----- Fișiere: salvare, deschidere, export, import -----
  function imagineScena(w = 480, hh = 360) {
    redesenIntern = false; deseneazaScena();
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
    cv.getContext('2d').drawImage(R.cv, 0, 0, w, hh);
    return cv.toDataURL('image/png');
  }
  async function salveaza(copieNoua) {
    inchideEditor();
    if (!E.idSalvat || copieNoua) {
      const n = await cere(copieNoua ? 'Salvează o copie' : 'Salvează proiectul', 'Numele proiectului', copieNoua ? `${P.nume} (copie)` : P.nume);
      if (!n) return false;
      P.nume = n; E.idSalvat = uid(); D.nume.textContent = n;
    }
    try {
      await store.put({ id: E.idSalvat, nume: P.nume, proiect: proiectDeSalvat(), imagine: imagineScena(160, 120), data: Date.now() });
      E.modificat = false; salveazaCiorna(); toast(`Proiectul „${P.nume}” a fost salvat.`, 'ok'); return true;
    } catch (err) { toast('Nu am putut salva: ' + (err.message || err), 'eroare'); return false; }
  }
  async function deschideDialog() {
    let toate = [];
    try { toate = (await store.toate()).filter((f) => f.id !== CIORNA).sort((a, b) => (b.data || 0) - (a.data || 0)); } catch { /* */ }
    const lista = h('div', { class: 'ap-blocuri-deschide' });
    const umple = () => {
      lista.replaceChildren(...(toate.length ? toate.map((f) => h('div', { class: 'ap-blocuri-dfis' },
        f.imagine ? h('img', { src: f.imagine, alt: '' }) : h('span', { class: 'ap-blocuri-dfis-gol' }),
        h('div', { class: 'ap-blocuri-dfis-info' }, h('strong', {}, f.nume), h('small', {}, new Date(f.data || Date.now()).toLocaleString('ro-RO'))),
        h('button', { type: 'button', class: 'principal', onclick: () => { E.dialogInchide?.(null); incarcaProiect(f.proiect, f.id); } }, 'Deschide'),
        h('button', { type: 'button', class: 'pericol', onclick: async () => { await store.del(f.id); toate = toate.filter((x) => x !== f); if (E.idSalvat === f.id) E.idSalvat = null; umple(); } }, 'Șterge'))) : [h('p', { class: 'ap-blocuri-nota' }, 'Nu ai încă proiecte salvate. Folosește Fișier → Salvează acum.')]));
    };
    umple();
    dialog('Proiectele mele', lista, [['Închide', (i) => i(null)]], { cls: 'lat' });
  }
  function exportaJson() {
    const date = JSON.stringify(proiectDeSalvat(), null, 1);
    const a = h('a', { href: URL.createObjectURL(new Blob([date], { type: 'application/json' })), download: `${fara(P.nume).replace(/[^\w-]+/g, '_') || 'proiect'}.blocuri.json` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportaImagine() {
    const a = h('a', { href: imagineScena(), download: `${fara(P.nume).replace(/[^\w-]+/g, '_') || 'scena'}.png` });
    document.body.append(a); a.click(); setTimeout(() => a.remove(), 500);
  }
  function importaJson() {
    const inp = h('input', { type: 'file', accept: '.json,application/json' });
    inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return;
      if (f.size > 5e6) return toast('Fișierul este prea mare.', 'eroare');
      const r = new FileReader();
      r.onload = () => { try { incarcaProiect(JSON.parse(r.result), null); toast('Proiectul a fost încărcat.', 'ok'); } catch (err) { toast(err.message || 'Fișier invalid.', 'eroare'); } };
      r.readAsText(f);
    });
    inp.click();
  }
  function incarcaProiect(p, idSalvat, faraSelectie) {
    opresteTot();
    P = normalizeaza(copie(p));
    for (const t of P.tinte) { t._bula = null; t._ef = null; t._creion = null; }
    E.idSalvat = idSalvat || null; E.undo = []; E.redo = []; E.vederi = {};
    reconstruiesteOrdinea();
    R.penCtx.setTransform(1, 0, 0, 1, 0, 0); R.penCtx.clearRect(0, 0, R.penCv.width, R.penCv.height);
    R.jurnal = { spus: [], creion: [], pozitii: [], mesaje: [], decoruri: 0 }; R.raspuns = '';
    D.nume.textContent = P.nume;
    if (!faraSelectie) E.tinta = personaje()[0]?.id || 'scena';
    selecteaza(E.tinta && tintaDupaId(E.tinta) ? E.tinta : personaje()[0]?.id || 'scena');
    UI.monitoare(true); butoaneAnulare(); R.redesen = true; schimbat(false);
    E.modificat = false;
  }
  async function confirmaInlocuire() {
    let n = 0; P.tinte.forEach((t) => t.blocuri.forEach((b) => parcurge(b, () => n++)));
    if (!n || !E.modificat) return true;
    return dialog('Înlocuiești proiectul?', h('p', {}, 'Proiectul curent va fi înlocuit. Dacă vrei să-l păstrezi, salvează-l mai întâi (Fișier → Salvează acum).'), [['Anulează', (i) => i(false)], ['Salvează mai întâi', async (i) => { i(await salveaza(false)); }], ['Continuă', (i) => i(true), 'principal']]);
  }
  function meniuFisier(btn) {
    const r = btn.getBoundingClientRect();
    meniu([
      { text: 'Proiect nou', fn: async () => { if (await confirmaInlocuire()) { incarcaProiect(proiectNou(), null); } } },
      { text: 'Deschide…', fn: deschideDialog },
      { text: 'Salvează acum (Ctrl+S)', fn: () => salveaza(false) },
      { text: 'Salvează o copie…', fn: () => salveaza(true) },
      { text: 'Redenumește proiectul…', fn: redenumesteProiect },
      { sep: true },
      { text: 'Încarcă de pe calculator (.json)…', fn: async () => { if (await confirmaInlocuire()) importaJson(); } },
      { text: 'Salvează pe calculatorul tău (.json)', fn: exportaJson },
      { text: 'Descarcă imaginea scenei (.png)', fn: exportaImagine },
    ], r.left, r.bottom + 4);
  }
  async function redenumesteProiect() {
    const n = await cere('Redenumește proiectul', 'Numele proiectului', P.nume);
    if (n) { P.nume = n; D.nume.textContent = n; schimbat(false); }
  }
  function meniuExemple(btn) {
    const r = btn.getBoundingClientRect();
    meniu(EXEMPLE.map((ex) => ({ text: `${ex.titlu} · ${ex.clasa}`, fn: async () => { if (await confirmaInlocuire()) { incarcaProiect(ex.fa(), null); toast(ex.indiciu, 'ok'); } } })), r.left, r.bottom + 4, { cls: 'lat' });
  }
  async function lucrare() {
    const proiect = proiectDeSalvat();
    const marime = JSON.stringify(proiect).length;
    if (marime > 1024 * 1024) throw new Error('Proiectul este prea mare pentru predare (peste 1 MB). Șterge din blocurile sau listele mari.');
    return { titlu: P.nume, tip: 'blocuri', proiect, imagine: imagineScena() };
  }

  // ---------- Codul generat: pseudocod în română și Python ----------
  const CUV_PY = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print input len str int range random math'.split(' '));
  function idPy(n) {
    let s = fara(String(n)).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!s) s = 'v'; if (/^\d/.test(s)) s = '_' + s; if (CUV_PY.has(s)) s += '_';
    return s;
  }
  function genereazaCod(limbaj, tinte) {
    const py = limbaj === 'python';
    const L = [];
    const CU = (t) => (t.scena ? 'scena' : idPy(t.nume));
    const textLit = (v) => (py ? JSON.stringify(String(v)) : `„${v}”`);
    const lit = (v, tip) => {
      if (tip === 'n') return eNumar(v) ? String(num(v)) : v === '' ? '0' : textLit(v);
      if (tip === 'c') return textLit(v);
      return eNumar(v) ? String(num(v)) : textLit(v);
    };
    const numeVar = (t, id, lista) => { const v = lista ? gasesteLista(t, id) : gasesteVar(t, id); return py ? idPy(v?.nume ?? 'necunoscut') : v?.nume ?? '?'; };
    const ctx = { globale: new Set() };
    // Expresii
    function inp(t, b, n, tipImplicit) {
      const i = b.in[n]; if (!i) return py ? '0' : '?';
      if (i.b) return expr(t, i.b, true);
      const tok = jetoane(b, t).find((x) => x.t === 'arg' && x.name === n);
      if (tok && (tok.type === 'm' || tok.type === 'd')) {
        if (i.v === '_random_') return textLit(py ? 'aleator' : 'poziție aleatoare');
        return textLit(eticheta(tok, i.v, t));
      }
      return lit(i.v, tok?.type || tipImplicit);
    }
    const par = (s, nested) => (nested ? `(${s})` : s);
    function expr(t, b, nested) {
      const o = (n) => inp(t, b, n);
      const p = CU(t);
      switch (b.op) {
        case 'operator_add': return par(`${o('NUM1')} + ${o('NUM2')}`, nested);
        case 'operator_subtract': return par(`${o('NUM1')} - ${o('NUM2')}`, nested);
        case 'operator_multiply': return par(`${o('NUM1')} * ${o('NUM2')}`, nested);
        case 'operator_divide': return par(`${o('NUM1')} / ${o('NUM2')}`, nested);
        case 'operator_mod': return par(`${o('NUM1')} % ${o('NUM2')}`, nested);
        case 'operator_random': return py ? `random.randint(${o('FROM')}, ${o('TO')})` : par(`aleator între ${o('FROM')} și ${o('TO')}`, nested);
        case 'operator_gt': return par(`${o('OPERAND1')} > ${o('OPERAND2')}`, nested);
        case 'operator_lt': return par(`${o('OPERAND1')} < ${o('OPERAND2')}`, nested);
        case 'operator_equals': return par(`${o('OPERAND1')} ${py ? '==' : '='} ${o('OPERAND2')}`, nested);
        case 'operator_and': return par(`${b.in.OPERAND1.b ? o('OPERAND1') : py ? 'False' : 'fals'} ${py ? 'and' : 'și'} ${b.in.OPERAND2.b ? o('OPERAND2') : py ? 'False' : 'fals'}`, nested);
        case 'operator_or': return par(`${b.in.OPERAND1.b ? o('OPERAND1') : py ? 'False' : 'fals'} ${py ? 'or' : 'sau'} ${b.in.OPERAND2.b ? o('OPERAND2') : py ? 'False' : 'fals'}`, nested);
        case 'operator_not': return par(`${py ? 'not' : 'nu'} ${b.in.OPERAND.b ? o('OPERAND') : py ? 'False' : 'fals'}`, nested);
        case 'operator_join': return py ? par(`str(${o('STRING1')}) + str(${o('STRING2')})`, nested) : `alătură(${o('STRING1')}, ${o('STRING2')})`;
        case 'operator_letter_of': return py ? `str(${o('STRING')})[int(${o('LETTER')}) - 1]` : par(`litera ${o('LETTER')} din ${o('STRING')}`, nested);
        case 'operator_length': return py ? `len(str(${o('STRING')}))` : par(`lungimea lui ${o('STRING')}`, nested);
        case 'operator_contains': return py ? par(`${o('STRING2')} in str(${o('STRING1')})`, nested) : par(`${o('STRING1')} conține ${o('STRING2')}`, nested);
        case 'operator_round': return `${py ? 'round' : 'rotunjește'}(${inp(t, b, 'NUM')})`;
        case 'operator_mathop': {
          const f = b.in.OPERATOR.v, x = inp(t, b, 'NUM');
          if (!py) return `${f === 'e ^' ? 'e^' : f === '10 ^' ? '10^' : f}(${x})`;
          const m = { abs: `abs(${x})`, podea: `math.floor(${x})`, plafon: `math.ceil(${x})`, radical: `math.sqrt(${x})`, sin: `math.sin(math.radians(${x}))`, cos: `math.cos(math.radians(${x}))`, tan: `math.tan(math.radians(${x}))`, asin: `math.degrees(math.asin(${x}))`, acos: `math.degrees(math.acos(${x}))`, atan: `math.degrees(math.atan(${x}))`, ln: `math.log(${x})`, log: `math.log10(${x})`, 'e ^': `math.exp(${x})`, '10 ^': `10 ** ${x}` };
          return m[f] || x;
        }
        case 'data_variable': return numeVar(t, b.in.VARIABLE.v);
        case 'data_listcontents': return py ? `" ".join(map(str, ${numeVar(t, b.in.LIST.v, true)}))` : numeVar(t, b.in.LIST.v, true);
        case 'data_itemoflist': return py ? `${numeVar(t, b.in.LIST.v, true)}[int(${o('INDEX')}) - 1]` : par(`elementul ${o('INDEX')} din ${numeVar(t, b.in.LIST.v, true)}`, nested);
        case 'data_itemnumoflist': return py ? `${numeVar(t, b.in.LIST.v, true)}.index(${o('ITEM')}) + 1` : par(`poziția lui ${o('ITEM')} în ${numeVar(t, b.in.LIST.v, true)}`, nested);
        case 'data_lengthoflist': return py ? `len(${numeVar(t, b.in.LIST.v, true)})` : par(`lungimea listei ${numeVar(t, b.in.LIST.v, true)}`, nested);
        case 'data_listcontainsitem': return py ? par(`${o('ITEM')} in ${numeVar(t, b.in.LIST.v, true)}`, nested) : par(`${numeVar(t, b.in.LIST.v, true)} conține ${o('ITEM')}`, nested);
        case 'argument_reporter': case 'argument_bool': return py ? idPy(b.nume) : b.nume;
        case 'sensing_answer': return py ? 'raspuns' : 'răspuns';
        case 'motion_xposition': return py ? `${p}.x` : 'x';
        case 'motion_yposition': return py ? `${p}.y` : 'y';
        case 'motion_direction': return py ? `${p}.directie` : 'direcția';
        case 'looks_size': return py ? `${p}.marime` : 'mărimea';
        case 'looks_costumenumbername': return py ? (b.in.NUMBER_NAME.v === 'nume' ? `${p}.nume_costum` : `${p}.costum`) : `costumul (${b.in.NUMBER_NAME.v})`;
        case 'looks_backdropnumbername': return py ? (b.in.NUMBER_NAME.v === 'nume' ? 'scena.nume_decor' : 'scena.decor') : `decorul (${b.in.NUMBER_NAME.v})`;
        case 'sound_volume': return py ? `${p}.volum` : 'volumul';
        case 'music_tempo': return 'tempo';
        case 'sensing_touchingobject': return py ? `${p}.atinge(${o('TOUCHINGOBJECTMENU')})` : par(`atinge ${o('TOUCHINGOBJECTMENU')}`, nested);
        case 'sensing_touchingcolor': return py ? `${p}.atinge_culoarea(${o('COLOR')})` : par(`atinge culoarea ${b.in.COLOR.v}`, nested);
        case 'sensing_coloristouchingcolor': return py ? `${p}.culoarea_atinge(${o('COLOR')}, ${o('COLOR2')})` : par(`culoarea ${b.in.COLOR.v} atinge ${b.in.COLOR2.v}`, nested);
        case 'sensing_distanceto': return py ? `${p}.distanta_pana_la(${o('DISTANCETOMENU')})` : par(`distanța până la ${o('DISTANCETOMENU')}`, nested);
        case 'sensing_keypressed': return py ? `tasta_apasata(${o('KEY_OPTION')})` : par(`tasta ${b.in.KEY_OPTION.b ? o('KEY_OPTION') : b.in.KEY_OPTION.v} apăsată`, nested);
        case 'sensing_mousedown': return py ? 'mouse_apasat()' : 'mouse apăsat';
        case 'sensing_mousex': return py ? 'mouse_x()' : 'x mouse';
        case 'sensing_mousey': return py ? 'mouse_y()' : 'y mouse';
        case 'sensing_timer': return py ? 'cronometru()' : 'cronometru';
        case 'procedures_call': return apel(t, b);
        default: return py ? '0' : '?';
      }
    }
    function apel(t, b) {
      const pr = procDupaId(t, b.proc); if (!pr) return py ? 'bloc_sters()' : 'bloc șters';
      const nume = pr.parts.filter((x) => x.t === 'l').map((x) => x.text).join(' ');
      const args = pr.parts.filter((x) => x.t !== 'l').map((x) => inp(t, b, x.id, 't'));
      return py ? `${idPy(nume)}(${args.join(', ')})` : `${nume}(${args.join(', ')})`;
    }
    // Textul generic al unui bloc, cu argumentele puse la locul lor
    function generic(t, b) {
      return jetoane(b, t).map((tok) => {
        if (tok.t === 'label') return tok.text;
        if (tok.t === 'icon') return tok.name === 'steag' ? 'steagul verde' : tok.name === 'dreapta' ? '↻' : tok.name === 'stanga' ? '↺' : '';
        if (tok.type === 'v') return numeVar(t, b.in[tok.name].v);
        if (tok.type === 'l') return numeVar(t, b.in[tok.name].v, true);
        const i = b.in[tok.name];
        if (i?.b) return expr(t, i.b, true);
        if (tok.type === 'm' || tok.type === 'd') return eticheta(tok, i?.v, t);
        if (tok.type === 't') return eNumar(i?.v) ? str(i.v) : `„${i?.v ?? ''}”`;
        return str(i?.v ?? '');
      }).filter(Boolean).join(' ');
    }
    const PY = {
      motion_movesteps: (t, b, o) => `${CU(t)}.mergi(${o('STEPS')})`,
      motion_turnright: (t, b, o) => `${CU(t)}.roteste_dreapta(${o('DEGREES')})`,
      motion_turnleft: (t, b, o) => `${CU(t)}.roteste_stanga(${o('DEGREES')})`,
      motion_goto: (t, b, o) => `${CU(t)}.mergi_la(${o('TO')})`,
      motion_gotoxy: (t, b, o) => `${CU(t)}.mergi_la_xy(${o('X')}, ${o('Y')})`,
      motion_glideto: (t, b, o) => `${CU(t)}.aluneca_la(${o('SECS')}, ${o('TO')})`,
      motion_glidesecstoxy: (t, b, o) => `${CU(t)}.aluneca(${o('SECS')}, ${o('X')}, ${o('Y')})`,
      motion_pointindirection: (t, b, o) => `${CU(t)}.directie = ${o('DIRECTION')}`,
      motion_pointtowards: (t, b, o) => `${CU(t)}.indica_spre(${o('TOWARDS')})`,
      motion_changexby: (t, b, o) => `${CU(t)}.x += ${o('DX')}`,
      motion_setx: (t, b, o) => `${CU(t)}.x = ${o('X')}`,
      motion_changeyby: (t, b, o) => `${CU(t)}.y += ${o('DY')}`,
      motion_sety: (t, b, o) => `${CU(t)}.y = ${o('Y')}`,
      motion_ifonedgebounce: (t) => `${CU(t)}.ricoseaza_la_margine()`,
      motion_setrotationstyle: (t, b, o) => `${CU(t)}.stil_rotatie(${o('STYLE')})`,
      looks_say: (t, b, o) => `${CU(t)}.spune(${o('MESSAGE')})`,
      looks_sayforsecs: (t, b, o) => `${CU(t)}.spune(${o('MESSAGE')}, ${o('SECS')})`,
      looks_think: (t, b, o) => `${CU(t)}.gandeste(${o('MESSAGE')})`,
      looks_thinkforsecs: (t, b, o) => `${CU(t)}.gandeste(${o('MESSAGE')}, ${o('SECS')})`,
      looks_switchcostumeto: (t, b, o) => `${CU(t)}.schimba_costumul(${o('COSTUME')})`,
      looks_nextcostume: (t) => `${CU(t)}.costumul_urmator()`,
      looks_switchbackdropto: (t, b, o) => `scena.schimba_decorul(${o('BACKDROP')})`,
      looks_nextbackdrop: () => 'scena.decorul_urmator()',
      looks_changesizeby: (t, b, o) => `${CU(t)}.marime += ${o('CHANGE')}`,
      looks_setsizeto: (t, b, o) => `${CU(t)}.marime = ${o('SIZE')}`,
      looks_changeeffectby: (t, b, o) => `${CU(t)}.modifica_efectul(${o('EFFECT')}, ${o('CHANGE')})`,
      looks_seteffectto: (t, b, o) => `${CU(t)}.seteaza_efectul(${o('EFFECT')}, ${o('VALUE')})`,
      looks_cleargraphiceffects: (t) => `${CU(t)}.anuleaza_efectele()`,
      looks_show: (t) => `${CU(t)}.arata()`,
      looks_hide: (t) => `${CU(t)}.ascunde()`,
      looks_gotofrontback: (t, b, o) => `${CU(t)}.strat(${o('FRONT_BACK')})`,
      sound_play: (t, b, o) => `${CU(t)}.porneste_sunetul(${o('SOUND_MENU')})`,
      sound_playuntildone: (t, b, o) => `${CU(t)}.reda_sunetul(${o('SOUND_MENU')})`,
      sound_stopallsounds: () => 'opreste_sunetele()',
      sound_changevolumeby: (t, b, o) => `${CU(t)}.volum += ${o('VOLUME')}`,
      sound_setvolumeto: (t, b, o) => `${CU(t)}.volum = ${o('VOLUME')}`,
      music_playnote: (t, b, o) => `canta_nota(${o('NOTE')}, ${o('BEATS')})`,
      music_rest: (t, b, o) => `pauza(${o('BEATS')})`,
      music_setinstrument: (t, b) => `instrument(${num(b.in.INSTRUMENT.v)})  # ${INSTRUMENTE[num(b.in.INSTRUMENT.v) - 1] || ''}`,
      music_settempo: (t, b, o) => `tempo = ${o('TEMPO')}`,
      event_broadcast: (t, b, o) => `trimite_mesajul(${o('BROADCAST_INPUT')})`,
      event_broadcastandwait: (t, b, o) => `trimite_mesajul_si_asteapta(${o('BROADCAST_INPUT')})`,
      control_wait: (t, b, o) => `asteapta(${o('DURATION')})`,
      control_create_clone_of: (t, b, o) => `creeaza_clona(${b.in.CLONE_OPTION.v === '_myself_' && !b.in.CLONE_OPTION.b ? CU(t) : o('CLONE_OPTION')})`,
      control_delete_this_clone: () => 'sterge_clona()',
      sensing_resettimer: () => 'reseteaza_cronometrul()',
      data_showvariable: (t, b) => `arata_variabila("${numeVar(t, b.in.VARIABLE.v)}")`,
      data_hidevariable: (t, b) => `ascunde_variabila("${numeVar(t, b.in.VARIABLE.v)}")`,
      data_addtolist: (t, b, o) => `${numeVar(t, b.in.LIST.v, true)}.append(${o('ITEM')})`,
      data_deleteoflist: (t, b, o) => `del ${numeVar(t, b.in.LIST.v, true)}[int(${o('INDEX')}) - 1]`,
      data_deletealloflist: (t, b) => `${numeVar(t, b.in.LIST.v, true)}.clear()`,
      data_insertatlist: (t, b, o) => `${numeVar(t, b.in.LIST.v, true)}.insert(int(${o('INDEX')}) - 1, ${o('ITEM')})`,
      data_replaceitemoflist: (t, b, o) => `${numeVar(t, b.in.LIST.v, true)}[int(${o('INDEX')}) - 1] = ${o('ITEM')}`,
      data_showlist: (t, b) => `arata_lista("${numeVar(t, b.in.LIST.v, true)}")`,
      data_hidelist: (t, b) => `ascunde_lista("${numeVar(t, b.in.LIST.v, true)}")`,
      pen_clear: () => 'sterge_tot()',
      pen_stamp: (t) => `${CU(t)}.stampileaza()`,
      pen_penDown: (t) => `${CU(t)}.pune_creionul_jos()`,
      pen_penUp: (t) => `${CU(t)}.ridica_creionul()`,
      pen_setPenColorToColor: (t, b, o) => `${CU(t)}.culoare_creion = ${o('COLOR')}`,
      pen_changePenColorBy: (t, b, o) => `${CU(t)}.modifica_culoarea_creionului(${o('VALUE')})`,
      pen_changePenSizeBy: (t, b, o) => `${CU(t)}.grosime_creion += ${o('SIZE')}`,
      pen_setPenSizeTo: (t, b, o) => `${CU(t)}.grosime_creion = ${o('SIZE')}`,
    };
    // Instrucțiuni
    function instr(t, b, ind, out) {
      const pad = '    '.repeat(ind);
      const o = (n) => inp(t, b, n);
      const sub = (i, ind2) => { const n0 = out.length; stivaCod(t, b.sub[i], ind2, out); if (py && out.length === n0) out.push('    '.repeat(ind2) + 'pass'); };
      const cond = () => (b.in.CONDITION?.b ? expr(t, b.in.CONDITION.b, false) : py ? 'False' : 'fals');
      switch (b.op) {
        case 'data_setvariableto': { const v = numeVar(t, b.in.VARIABLE.v); ctx.globale.add(v); out.push(`${pad}${v} ${py ? '=' : '←'} ${o('VALUE')}`); return; }
        case 'data_changevariableby': {
          const v = numeVar(t, b.in.VARIABLE.v); ctx.globale.add(v);
          const d = o('VALUE');
          if (py) out.push(`${pad}${v} += ${d}`);
          else out.push(`${pad}${v} ← ${v} ${/^-\d/.test(d) ? '- ' + d.slice(1) : '+ ' + d}`);
          return;
        }
        case 'sensing_askandwait':
          if (py) { ctx.globale.add('raspuns'); out.push(`${pad}raspuns = input(${o('QUESTION')})`); }
          else out.push(`${pad}scrie ${o('QUESTION')}`, `${pad}citește răspuns`);
          return;
        case 'looks_say': case 'looks_sayforsecs': if (!py) { out.push(`${pad}scrie ${o('MESSAGE')}`); return; } break;
        case 'control_repeat':
          out.push(py ? `${pad}for _ in range(int(${o('TIMES')})):` : `${pad}repetă de ${o('TIMES')} ori`); sub(0, ind + 1); return;
        case 'control_forever': out.push(py ? `${pad}while True:` : `${pad}repetă la infinit`); sub(0, ind + 1); return;
        case 'control_if': out.push(py ? `${pad}if ${cond()}:` : `${pad}dacă ${cond()} atunci`); sub(0, ind + 1); return;
        case 'control_if_else':
          out.push(py ? `${pad}if ${cond()}:` : `${pad}dacă ${cond()} atunci`); sub(0, ind + 1);
          out.push(py ? `${pad}else:` : `${pad}altfel`); sub(1, ind + 1); return;
        case 'control_repeat_until': {
          const c = b.in.CONDITION?.b;
          let cs;
          if (c && c.op === 'operator_not' && c.in.OPERAND.b) cs = expr(t, c.in.OPERAND.b, false);
          else cs = py ? `not ${c ? expr(t, c, true) : 'False'}` : `nu ${c ? expr(t, c, true) : '(fals)'}`;
          out.push(py ? `${pad}while ${cs}:` : `${pad}cât timp ${cs} execută`); sub(0, ind + 1); return;
        }
        case 'control_wait_until':
          if (py) out.push(`${pad}while not ${b.in.CONDITION?.b ? expr(t, b.in.CONDITION.b, true) : 'False'}:`, `${pad}    asteapta_un_cadru()`);
          else out.push(`${pad}așteaptă până când ${cond()}`);
          return;
        case 'control_stop': {
          const v = b.in.STOP_OPTION.v;
          if (py) out.push(pad + (v === 'tot' ? 'opreste_tot()' : v === 'acest script' ? 'return' : 'opreste_alte_scripturi()'));
          else out.push(`${pad}oprește ${v}`);
          return;
        }
        case 'procedures_call': out.push(pad + apel(t, b)); return;
        default:
      }
      if (py) {
        const f = PY[b.op];
        if (f) out.push(pad + f(t, b, o));
        else out.push(`${pad}# ${generic(t, b)}`);
      } else out.push(pad + generic(t, b));
    }
    function stivaCod(t, b, ind, out) { while (b) { instr(t, b, ind, out); b = b.next; } }
    function antet(t, top) {
      const o = (n) => inp(t, top, n);
      if (!py) {
        if (top.op === 'event_whenflagclicked') return 'când se dă clic pe steagul verde:';
        if (top.op === 'procedures_definition') return `subprogram ${top.proc.parts.filter((x) => x.t === 'l').map((x) => x.text).join(' ')}(${top.proc.parts.filter((x) => x.t !== 'l').map((x) => x.name).join(', ')})`;
        return generic(t, top) + ':';
      }
      switch (top.op) {
        case 'event_whenflagclicked': return '@la_steag_verde';
        case 'event_whenkeypressed': return `@la_tasta(${o('KEY_OPTION')})`;
        case 'event_whenthisspriteclicked': return t.scena ? '@la_clic_pe_scena' : `@la_clic(${CU(t)})`;
        case 'event_whenbackdropswitchesto': return `@la_decor(${o('BACKDROP')})`;
        case 'event_whenbroadcastreceived': return `@la_mesaj(${o('BROADCAST_OPTION')})`;
        case 'control_start_as_clone': return `@la_inceput_de_clona(${CU(t)})`;
        default: return '';
      }
    }
    // Variabilele globale
    const sc = scena();
    if (py) {
      L.push('# Program generat din blocuri: arată în Python logica scripturilor tale.', '# (Funcțiile personajelor, ca mergi() sau spune(), sunt doar ilustrative.)', 'import random', 'import math', '');
      const glob = [...sc.variabile.map((v) => `${idPy(v.nume)} = ${eNumar(v.val) ? num(v.val) : JSON.stringify(str(v.val))}`), ...sc.liste.map((l) => `${idPy(l.nume)} = []`)];
      if (glob.length) L.push('# variabile pentru toate personajele', ...glob, '');
    } else {
      L.push('// Pseudocod generat din blocuri');
      if (sc.variabile.length || sc.liste.length) L.push(`// variabile: ${[...sc.variabile.map((v) => v.nume), ...sc.liste.map((l) => l.nume + ' (listă)')].join(', ')}`);
      L.push('');
    }
    for (const t of tinte) {
      const tops = t.blocuri.slice().sort((a, b) => (forma(b) === 'def') - (forma(a) === 'def') || a.y - b.y || a.x - b.x);
      L.push(py ? `# ===== ${t.scena ? 'Scena' : `Personajul: ${t.nume}`} =====` : `// ===== ${t.scena ? 'Scena' : `Personajul: ${t.nume}`} =====`);
      if (py && !t.scena) L.push(`${CU(t)} = Personaj(${JSON.stringify(t.nume)})`);
      if (py) for (const v of [...t.variabile, ...t.liste]) L.push(`${idPy(v.nume)} = ${Array.isArray(v.val) ? '[]' : eNumar(v.val) ? num(v.val) : JSON.stringify(str(v.val))}  # variabilă doar pentru ${t.nume}`);
      if (!tops.length) L.push(py ? '# (fără scripturi)' : '// (fără scripturi)');
      let k = 1;
      for (const top of tops) {
        const sh = forma(top);
        if (sh === 'rep' || sh === 'bool') continue;
        ctx.globale = new Set();
        const corp = [];
        if (sh === 'hat' || sh === 'def') stivaCod(t, top.next, 1, corp); else stivaCod(t, top, py ? 1 : 0, corp);
        L.push('');
        if (py) {
          if (sh === 'def') {
            const nume = top.proc.parts.filter((x) => x.t === 'l').map((x) => x.text).join(' ');
            L.push(`def ${idPy(nume)}(${top.proc.parts.filter((x) => x.t !== 'l').map((x) => idPy(x.name)).join(', ')}):`);
          } else {
            const a = sh === 'hat' ? antet(t, top) : '# script fără eveniment (pornește la clic)';
            if (a) L.push(a);
            L.push(`def ${CU(t)}_script_${k++}():`);
          }
          const gl = [...ctx.globale];
          if (gl.length) L.push(`    global ${gl.join(', ')}`);
          if (!corp.length) L.push('    pass');
          L.push(...corp);
        } else {
          if (sh === 'hat' || sh === 'def') { L.push(antet(t, top)); L.push(...corp); if (!corp.length) L.push('    (nimic)'); }
          else { L.push('// script fără eveniment'); L.push(...corp); }
        }
      }
      L.push('');
    }
    return L.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  function actualizeazaCod() {
    if (!E.codDeschis || !D.codPre) return;
    const tinte = E.codTot ? P.tinte : [tintaEd()];
    let text;
    try { text = genereazaCod(E.codLimbaj, tinte); } catch (err) { console.error(err); text = 'Nu am putut genera codul.'; }
    D.codPre.textContent = text;
    D.codTitlu.textContent = E.codTot ? 'tot proiectul' : tintaEd().scena ? 'Scena' : tintaEd().nume;
  }
  function deschideCod(v) {
    E.codDeschis = v; D.codPanou.hidden = !v; D.btnCod.setAttribute('aria-pressed', String(v));
    if (v) actualizeazaCod();
  }

  // ---------- Exemple din lecții ----------
  function B(op, inp = {}, ...subs) {
    const b = bloc(op);
    for (const [k, v] of Object.entries(inp)) {
      if (!b.in[k]) b.in[k] = { v: '', b: null };
      if (v && typeof v === 'object' && v.op) b.in[k].b = v; else b.in[k].v = String(v);
    }
    subs.forEach((s, i) => { b.sub[i] = lant(s); });
    return b;
  }
  function lant(arr) { if (!arr || !arr.length) return null; for (let i = 0; i < arr.length - 1; i++) arr[i].next = arr[i + 1]; return arr[0]; }
  const scr = (x, y, ...bl) => { const f = lant(bl); f.x = x; f.y = y; return f; };
  const Vr = (id) => B('data_variable', { VARIABLE: id });
  const Arg = (n) => blocArg(n);
  const Apel = (proc, ...valori) => { const b = blocApel(proc); proc.parts.filter((p) => p.t !== 'l').forEach((p, i) => { const v = valori[i]; if (v && v.op) b.in[p.id].b = v; else b.in[p.id].v = String(v ?? ''); }); return b; };
  const Def = (x, y, proc, ...corp) => { const d = blocDefinitie(proc); d.next = lant(corp); d.x = x; d.y = y; return d; };
  // Proiect dintr-o descriere scurtă
  function fa(nume, o) {
    const P0 = P; const p = { format: 'edudigi-blocuri', versiune: 1, nume, tinte: [scenaNoua()], mesaje: o.mesaje || ['mesaj1'], monitoare: {}, tempo: 60 };
    P = p;
    const sc = p.tinte[0];
    sc.costume = (o.decoruri || ['alb']).map((k) => ({ nume: DECORURI[k].nume, desen: k }));
    sc.variabile = (o.variabile || []).map(([id, n, v]) => ({ id, nume: n, val: v ?? 0 }));
    sc.liste = (o.liste || []).map(([id, n]) => ({ id, nume: n, val: [] }));
    for (const [id] of [...(o.variabile || []), ...(o.liste || [])]) if (!(o.ascunse || []).includes(id)) p.monitoare[id] = { vizibil: true };
    sc.blocuri = o.scena ? o.scena() : [];
    for (const d of o.personaje || []) {
      const s = personajNou(d.tip, d.nume);
      Object.assign(s, { x: d.x ?? 0, y: d.y ?? 0, marime: d.marime ?? 100, dir: d.dir ?? 90, stil: d.stil || 'toate direcțiile', costum: d.costum || 0 });
      if (d.sunete) s.sunete = d.sunete.map((n) => ({ nume: n }));
      p.tinte.push(s);
      s.blocuri = d.scripturi ? d.scripturi(s) : [];
      aranjeazaAuto(s);
    }
    P = P0;
    return p;
  }
  // Așază scripturile pe coloane, fără să se suprapună
  function aranjeazaAuto(t) {
    let x = 20, y = 20, latCol = 0;
    for (const b of t.blocuri) {
      const r = deseneazaStiva(b, t);
      if (y > 20 && y + r.h > 700) { x += latCol + 48; y = 20; latCol = 0; }
      b.x = x; b.y = y; y += r.h + 36; latCol = Math.max(latCol, r.w);
    }
  }
  const EXEMPLE = [
    {
      titlu: 'Plimbarea pisicii', clasa: 'clasa a V-a', indiciu: 'Apasă steagul verde, apoi tasta Spațiu (blocul „sari”) și dă clic pe pisică.',
      fa: () => fa('Plimbarea pisicii', {
        decoruri: ['parc'],
        personaje: [{ tip: 'pisica', x: 10, y: 10, marime: 70, scripturi: () => {
          const sari = { id: 'p_sari', parts: [{ t: 'l', text: 'sari' }], warp: false };
          return [
            scr(20, 20, B('event_whenflagclicked'), B('motion_gotoxy', { X: 10, Y: 10 }), B('motion_glidesecstoxy', { SECS: 1, X: -100, Y: 10 }), B('motion_glidesecstoxy', { SECS: 1, X: 100, Y: 10 }),
              B('motion_glidesecstoxy', { SECS: 1, X: 100, Y: 120 }), B('motion_glidesecstoxy', { SECS: 1, X: 100, Y: -100 }), B('sound_play', { SOUND_MENU: 'Pop' })),
            scr(20, 330, B('event_whenkeypressed', { KEY_OPTION: 'spațiu' }), Apel(sari)),
            scr(20, 430, B('event_whenthisspriteclicked'), B('looks_nextcostume'), B('sound_play', { SOUND_MENU: 'Miau' }), B('looks_sayforsecs', { MESSAGE: 'Miau!', SECS: 1 })),
            Def(380, 20, sari, B('looks_switchcostumeto', { COSTUME: 'sare' }), B('control_repeat', { TIMES: 10 }, [B('motion_changeyby', { DY: 8 })]), B('control_repeat', { TIMES: 10 }, [B('motion_changeyby', { DY: -8 })]), B('looks_switchcostumeto', { COSTUME: 'pas 1' })),
          ];
        } }],
      }),
    },
    {
      titlu: 'Labirintul', clasa: 'clasa a V-a', indiciu: 'Apasă steagul verde și condu mingea cu săgețile până la ieșirea roșie.',
      fa: () => fa('Labirintul', {
        decoruri: ['labirint'],
        personaje: [{ tip: 'minge', nume: 'Minge', x: -200, y: -140, marime: 50, scripturi: () => {
          const sageata = (tasta, axa, d) => {
            const mod = (v) => B(axa === 'x' ? 'motion_changexby' : 'motion_changeyby', axa === 'x' ? { DX: v } : { DY: v });
            return [B('event_whenkeypressed', { KEY_OPTION: tasta }), mod(d), B('control_if_else', { CONDITION: B('sensing_touchingcolor', { COLOR: '#000000' }) }, [mod(-d)], [B('control_if', { CONDITION: B('sensing_touchingcolor', { COLOR: '#e53935' }) }, [B('looks_sayforsecs', { MESSAGE: 'Bravo!', SECS: 2 }), B('sound_play', { SOUND_MENU: 'Pop' })])])];
          };
          return [
            scr(20, 20, B('event_whenflagclicked'), B('motion_gotoxy', { X: -200, Y: -140 }), B('looks_sayforsecs', { MESSAGE: 'Ajută-mă să ajung la ieșire!', SECS: 2 })),
            scr(20, 170, ...sageata('săgeată dreapta', 'x', 5)), scr(400, 170, ...sageata('săgeată stânga', 'x', -5)),
            scr(20, 420, ...sageata('săgeată sus', 'y', 5)), scr(400, 420, ...sageata('săgeată jos', 'y', -5)),
          ];
        } }],
      }),
    },
    {
      titlu: 'Prinde mărul', clasa: 'clasa a VI-a', indiciu: 'Apasă steagul verde și mută crabul cu săgețile stânga/dreapta ca să prinzi merele.',
      fa: () => fa('Prinde mărul', {
        decoruri: ['parc'], variabile: [['v_scor', 'scor'], ['v_vieti', 'vieți', 3]],
        personaje: [
          { tip: 'crab', x: 0, y: -140, marime: 80, scripturi: () => [
            scr(20, 20, B('event_whenflagclicked'), B('motion_gotoxy', { X: 0, Y: -140 }), B('looks_sayforsecs', { MESSAGE: 'Prinde merele!', SECS: 1 }),
              B('control_forever', {}, [
                B('control_if', { CONDITION: B('sensing_keypressed', { KEY_OPTION: 'săgeată stânga' }) }, [B('motion_changexby', { DX: -10 })]),
                B('control_if', { CONDITION: B('sensing_keypressed', { KEY_OPTION: 'săgeată dreapta' }) }, [B('motion_changexby', { DX: 10 })]),
              ])),
          ] },
          { tip: 'mar', x: 0, y: 170, marime: 70, scripturi: () => {
            const sus = () => B('motion_gotoxy', { X: B('operator_random', { FROM: -200, TO: 200 }), Y: 170 });
            return [scr(20, 20, B('event_whenflagclicked'), B('data_setvariableto', { VARIABLE: 'v_scor', VALUE: 0 }), B('data_setvariableto', { VARIABLE: 'v_vieti', VALUE: 3 }), sus(), B('control_wait', { DURATION: 1 }),
              B('control_forever', {}, [
                B('motion_changeyby', { DY: -6 }),
                B('control_if', { CONDITION: B('sensing_touchingobject', { TOUCHINGOBJECTMENU: 'Crab' }) }, [B('data_changevariableby', { VARIABLE: 'v_scor', VALUE: 1 }), B('sound_play', { SOUND_MENU: 'Colectează' }), sus()]),
                B('control_if', { CONDITION: B('operator_lt', { OPERAND1: B('motion_yposition'), OPERAND2: -165 }) }, [B('data_changevariableby', { VARIABLE: 'v_vieti', VALUE: -1 }), B('sound_play', { SOUND_MENU: 'Pop' }), sus()]),
                B('control_if', { CONDITION: B('operator_equals', { OPERAND1: Vr('v_vieti'), OPERAND2: 0 }) }, [B('looks_sayforsecs', { MESSAGE: B('operator_join', { STRING1: 'Joc terminat! Scor: ', STRING2: Vr('v_scor') }), SECS: 2 }), B('control_stop', { STOP_OPTION: 'tot' })]),
              ]))];
          } },
        ],
      }),
    },
    {
      titlu: 'Desen: pătrat și stea', clasa: 'clasa a VI-a', indiciu: 'Blocurile „desenează pătrat” și „desenează stea” sunt create în „Blocurile mele”. Apasă steagul verde.',
      fa: () => fa('Desen cu blocurile mele', {
        decoruri: ['grila'],
        personaje: [{ tip: 'sageata', nume: 'Săgeată', x: 0, y: 0, scripturi: () => {
          const pat = { id: 'p_patrat', parts: [{ t: 'l', text: 'desenează pătrat' }, { t: 'n', id: 'a_lat', name: 'latura' }], warp: false };
          const st = { id: 'p_stea', parts: [{ t: 'l', text: 'desenează stea' }, { t: 'n', id: 'a_lat2', name: 'latura' }], warp: false };
          return [
            Def(400, 20, pat, B('control_repeat', { TIMES: 4 }, [B('motion_movesteps', { STEPS: Arg('latura') }), B('motion_turnright', { DEGREES: 90 })])),
            Def(400, 200, st, B('control_repeat', { TIMES: 5 }, [B('motion_movesteps', { STEPS: Arg('latura') }), B('motion_turnright', { DEGREES: 144 })])),
            scr(20, 20, B('event_whenflagclicked'), B('pen_clear'), B('pen_penUp'), B('motion_gotoxy', { X: -180, Y: 40 }), B('motion_pointindirection', { DIRECTION: 90 }),
              B('pen_setPenColorToColor', { COLOR: '#4c97ff' }), B('pen_setPenSizeTo', { SIZE: 3 }), B('pen_penDown'), Apel(pat, 100), B('pen_penUp'),
              B('motion_gotoxy', { X: 20, Y: 60 }), B('pen_setPenColorToColor', { COLOR: '#ff6680' }), B('pen_penDown'), Apel(st, 140), B('pen_penUp'), B('motion_gotoxy', { X: 0, Y: -140 })),
          ];
        } }],
      }),
    },
    {
      titlu: 'Calculator (RoboOperații)', clasa: 'clasa a V-a', indiciu: 'Apasă steagul verde și răspunde la întrebări: robotul calculează suma, diferența, produsul, câtul și restul.',
      fa: () => fa('Calculator RoboOperații', {
        decoruri: ['tabla'], variabile: [['v_a', 'a'], ['v_b', 'b']],
        personaje: [{ tip: 'robot', nume: 'RoboTIC', x: -120, y: -40, scripturi: () => {
          const spune = (et, op) => B('looks_sayforsecs', { MESSAGE: B('operator_join', { STRING1: et, STRING2: B(op, { NUM1: Vr('v_a'), NUM2: Vr('v_b') }) }), SECS: 2 });
          return [scr(20, 20, B('event_whenflagclicked'), B('looks_switchcostumeto', { COSTUME: 'robot 1' }),
            B('sensing_askandwait', { QUESTION: 'Care este primul număr?' }), B('data_setvariableto', { VARIABLE: 'v_a', VALUE: B('sensing_answer') }),
            B('sensing_askandwait', { QUESTION: 'Care este al doilea număr?' }), B('data_setvariableto', { VARIABLE: 'v_b', VALUE: B('sensing_answer') }),
            spune('a+b=', 'operator_add'), spune('a-b=', 'operator_subtract'), spune('a*b=', 'operator_multiply'), spune('a/b=', 'operator_divide'), spune('a mod b=', 'operator_mod'),
            B('looks_switchcostumeto', { COSTUME: 'robot 2' }), B('sound_play', { SOUND_MENU: 'Bip' }))];
        } }],
      }),
    },
    {
      titlu: 'Ghicește numărul', clasa: 'clasa a VI-a', indiciu: 'Apasă steagul verde și ghicește numărul ales de calculator (între 1 și 20).',
      fa: () => fa('Ghicește numărul', {
        decoruri: ['stele'], variabile: [['v_secret', 'secret'], ['v_incercari', 'încercări']], ascunse: ['v_secret'],
        personaje: [{ tip: 'robot', nume: 'Robot', x: -150, y: -60, scripturi: () => [
          scr(20, 20, B('event_whenflagclicked'), B('data_setvariableto', { VARIABLE: 'v_secret', VALUE: B('operator_random', { FROM: 1, TO: 20 }) }), B('data_setvariableto', { VARIABLE: 'v_incercari', VALUE: 0 }),
            B('looks_sayforsecs', { MESSAGE: 'M-am gândit la un număr între 1 și 20.', SECS: 2 }),
            B('control_repeat_until', { CONDITION: B('operator_equals', { OPERAND1: B('sensing_answer'), OPERAND2: Vr('v_secret') }) }, [
              B('sensing_askandwait', { QUESTION: 'Ce număr crezi că este?' }), B('data_changevariableby', { VARIABLE: 'v_incercari', VALUE: 1 }),
              B('control_if', { CONDITION: B('operator_lt', { OPERAND1: B('sensing_answer'), OPERAND2: Vr('v_secret') }) }, [B('looks_sayforsecs', { MESSAGE: 'Mai mare!', SECS: 1 })]),
              B('control_if', { CONDITION: B('operator_gt', { OPERAND1: B('sensing_answer'), OPERAND2: Vr('v_secret') }) }, [B('looks_sayforsecs', { MESSAGE: 'Mai mic!', SECS: 1 })]),
            ]),
            B('looks_switchcostumeto', { COSTUME: 'robot 3' }), B('sound_play', { SOUND_MENU: 'Aplauze' }),
            B('looks_say', { MESSAGE: B('operator_join', { STRING1: 'Bravo! Ai ghicit din ', STRING2: B('operator_join', { STRING1: Vr('v_incercari'), STRING2: ' încercări.' }) }) })),
        ] }],
      }),
    },
    {
      titlu: 'Vânătoarea de stele', clasa: 'clasa a V-a', indiciu: 'Apasă steagul verde. Prinde 5 stele în 30 de secunde, ferește-te de crab (săgețile mișcă pisica).',
      fa: () => fa('Vânătoarea de stele', {
        decoruri: ['stele'], variabile: [['v_scor', 'scor'], ['v_vieti', 'vieți']], mesaje: ['verifică', 'stea nouă'],
        personaje: [
          { tip: 'pisica', x: -200, y: -130, marime: 50, sunete: ['Miau', 'Colectează', 'Oops'], scripturi: () => {
            const sag = (t, op, k, v) => scr(...k, B('event_whenkeypressed', { KEY_OPTION: t }), B(op, op === 'motion_changexby' ? { DX: v } : { DY: v }), B('event_broadcast', { BROADCAST_INPUT: 'verifică' }));
            const final = (msg, cond) => B('control_if', { CONDITION: cond }, [B('looks_sayforsecs', { MESSAGE: msg, SECS: 2 }), B('control_stop', { STOP_OPTION: 'tot' })]);
            return [
              scr(20, 20, B('event_whenflagclicked'), B('data_setvariableto', { VARIABLE: 'v_scor', VALUE: 0 }), B('data_setvariableto', { VARIABLE: 'v_vieti', VALUE: 3 }), B('motion_gotoxy', { X: -200, Y: -130 }),
                B('looks_sayforsecs', { MESSAGE: 'Prinde 5 stele în 30 de secunde! Ferește-te de crab!', SECS: 3 }), B('sensing_resettimer')),
              sag('săgeată dreapta', 'motion_changexby', [20, 250], 10), sag('săgeată stânga', 'motion_changexby', [20, 360], -10),
              sag('săgeată sus', 'motion_changeyby', [20, 470], 10), sag('săgeată jos', 'motion_changeyby', [20, 580], -10),
              scr(440, 20, B('event_whenbroadcastreceived', { BROADCAST_OPTION: 'verifică' }),
                B('control_if', { CONDITION: B('sensing_touchingobject', { TOUCHINGOBJECTMENU: 'Stea' }) }, [B('data_changevariableby', { VARIABLE: 'v_scor', VALUE: 1 }), B('sound_play', { SOUND_MENU: 'Colectează' }), B('event_broadcast', { BROADCAST_INPUT: 'stea nouă' })]),
                B('control_if', { CONDITION: B('sensing_touchingobject', { TOUCHINGOBJECTMENU: 'Crab' }) }, [B('data_changevariableby', { VARIABLE: 'v_vieti', VALUE: -1 }), B('sound_play', { SOUND_MENU: 'Oops' }), B('motion_gotoxy', { X: -200, Y: -130 })]),
                final('Ai câștigat!', B('operator_equals', { OPERAND1: Vr('v_scor'), OPERAND2: 5 })),
                final('Joc terminat!', B('operator_lt', { OPERAND1: Vr('v_vieti'), OPERAND2: 1 })),
                final('Timpul a expirat!', B('operator_gt', { OPERAND1: B('sensing_timer'), OPERAND2: 30 }))),
            ];
          } },
          { tip: 'stea', x: 100, y: 50, marime: 60, scripturi: () => [
            scr(20, 20, B('event_whenflagclicked'), B('motion_gotoxy', { X: 100, Y: 50 })),
            scr(20, 140, B('event_whenbroadcastreceived', { BROADCAST_OPTION: 'stea nouă' }), B('motion_gotoxy', { X: B('operator_random', { FROM: -220, TO: 220 }), Y: B('operator_random', { FROM: -160, TO: 160 }) })),
          ] },
          { tip: 'crab', x: 0, y: 0, marime: 70, scripturi: () => [] },
        ],
      }),
    },
    {
      titlu: 'Gama Do major', clasa: 'clasa a V-a', indiciu: 'Steagul verde cântă gama la pian; tasta Spațiu o cântă invers, la saxofon.',
      fa: () => fa('Gama Do major', {
        decoruri: ['scena'],
        personaje: [{ tip: 'pinguin', nume: 'Pinguin', x: 0, y: -60, marime: 120, scripturi: () => {
          const NOTE = [[60, 'Do'], [62, 'Re'], [64, 'Mi'], [65, 'Fa'], [67, 'Sol'], [69, 'La'], [71, 'Si'], [72, 'Do']];
          const canta = (lista) => lista.flatMap(([n, nm]) => [B('looks_say', { MESSAGE: nm }), B('looks_nextcostume'), B('music_playnote', { NOTE: n, BEATS: 0.5 })]);
          return [
            scr(20, 20, B('event_whenflagclicked'), B('music_settempo', { TEMPO: 90 }), B('music_setinstrument', { INSTRUMENT: 1 }), ...canta(NOTE), B('looks_say', { MESSAGE: '' })),
            scr(420, 20, B('event_whenkeypressed', { KEY_OPTION: 'spațiu' }), B('music_setinstrument', { INSTRUMENT: 11 }), ...canta(NOTE.slice().reverse()), B('looks_say', { MESSAGE: '' })),
          ];
        } }],
      }),
    },
  ];

  // ---------- Provocări verificate automat ----------
  const PROVOCARI = [
    {
      id: 'salut', titlu: 'Primul program', enunt: 'Când se dă clic pe steagul verde, pisica merge la x: 150, y: 0 și spune „Salut!”.',
      indiciu: 'Evenimente → „când se dă clic pe steag”; Mișcare → „mergi la x: y:”; Aspect → „spune … timp de … secunde”.',
      start: () => fa('Provocare: primul program', { decoruri: ['grila'], personaje: [{ tip: 'pisica', x: -100, y: 0, marime: 70 }] }),
      async verifica(V) {
        const r = []; r.push([V.are('event_whenflagclicked'), 'Scriptul pornește la steagul verde.']);
        const t = await V.ruleaza({ max: 4000 }); const p = personaje()[0];
        r.push([p && Math.abs(p.x - 150) < 1 && Math.abs(p.y) < 1, 'Pisica ajunge la x: 150, y: 0.']);
        r.push([t.jurnal.spus.some((s) => /salut/i.test(s)), 'Pisica spune „Salut!”.']);
        return r;
      },
    },
    {
      id: 'contor', titlu: 'Numărăm până la 10', enunt: 'Creează variabila „scor”. La steagul verde, setează-o la 0, apoi mărește-o cu 1 de 10 ori, cu blocul „repetă”.',
      indiciu: 'Variabile → „Creează o variabilă”; Control → „repetă 10”; în interior: „modifică scor cu 1”.',
      start: () => fa('Provocare: contor', { decoruri: ['alb'], personaje: [{ tip: 'robot', x: -120, y: -40 }] }),
      async verifica(V) {
        const r = []; r.push([!!V.varNume('scor'), 'Există variabila „scor”.']);
        r.push([V.are('control_repeat') || V.are('control_repeat_until'), 'Folosești o structură repetitivă.']);
        await V.ruleaza({ max: 4000 });
        r.push([num(V.varNume('scor')?.val) === 10, 'După rulare, scor = 10.']);
        return r;
      },
    },
    {
      id: 'gauss', titlu: 'Suma lui Gauss', enunt: 'Calculează în variabila S suma 1 + 2 + 3 + … + 10, cu un contor i și blocul „repetă”. Nu scrie direct 55!',
      indiciu: 'S ← 0, i ← 1, apoi repetă de 10 ori: „modifică S cu i”, „modifică i cu 1”.',
      start: () => fa('Provocare: suma lui Gauss', { decoruri: ['tabla'], personaje: [{ tip: 'robot', x: -150, y: -60 }] }),
      async verifica(V) {
        const r = []; r.push([!!V.varNume('S') || !!V.varNume('s'), 'Există variabila „S”.']);
        r.push([V.are('control_repeat') || V.are('control_repeat_until'), 'Folosești o structură repetitivă.']);
        r.push([!V.literal('55'), 'Nu ai scris rezultatul 55 direct într-un bloc.']);
        await V.ruleaza({ max: 4000 });
        r.push([num((V.varNume('S') || V.varNume('s'))?.val) === 55, 'După rulare, S = 55.']);
        return r;
      },
    },
    {
      id: 'patrat', titlu: 'Pătratul cu blocul tău', enunt: 'Creează blocul „desenează pătrat” cu intrarea „latura” și folosește-l ca personajul să deseneze un pătrat cu latura 100.',
      indiciu: 'Blocurile mele → „Creează un bloc”: scrie „desenează pătrat”, apoi „Adaugă o intrare” (latura). Sub „definește”: pune creionul jos, repetă 4: mergi (latura) pași, rotește-te 90 de grade.',
      start: () => fa('Provocare: pătrat', { decoruri: ['grila'], personaje: [{ tip: 'sageata', nume: 'Săgeată', x: -50, y: -50 }] }),
      async verifica(V) {
        const r = []; const defs = V.proceduri();
        r.push([defs.length > 0, 'Ai creat un bloc în „Blocurile mele”.']);
        r.push([defs.some((d) => d.proc.parts.some((p) => p.t === 'n')), 'Blocul tău are o intrare (latura).']);
        r.push([defs.some((d) => V.apelat(d.proc.id)), 'Folosești blocul creat de tine.']);
        const t = await V.ruleaza({ max: 6000 });
        const s = V.analizaCreion(t.jurnal.creion);
        r.push([Math.abs(s.lungime - 400) < 6 && Math.abs(s.latime - 100) < 3 && Math.abs(s.inaltime - 100) < 3, 'Pe scenă apare un pătrat cu latura 100.']);
        return r;
      },
    },
    {
      id: 'stea', titlu: 'Steaua cu 5 colțuri', enunt: 'Fă săgeata să deseneze o stea cu 5 colțuri și latura 100: repetă de 5 ori „mergi 100 de pași” și „rotește-te 144 de grade”.',
      indiciu: 'Creion → „pune creionul jos”; Control → „repetă 5”; Mișcare → „mergi 100 pași”, „rotește-te ↻ 144 grade”.',
      start: () => fa('Provocare: stea', { decoruri: ['grila'], personaje: [{ tip: 'sageata', nume: 'Săgeată', x: -50, y: 20 }] }),
      async verifica(V) {
        const r = []; r.push([V.are('control_repeat'), 'Folosești blocul „repetă”.']);
        const t = await V.ruleaza({ max: 6000 });
        const s = V.analizaCreion(t.jurnal.creion);
        r.push([Math.abs(s.lungime - 500) < 8, 'Linia desenată are 5 laturi de câte 100.']);
        r.push([s.inchis && s.latime > 90 && s.inaltime > 85, 'Desenul este o stea închisă.']);
        return r;
      },
    },
    {
      id: 'maxim', titlu: 'Cel mai mare număr', enunt: 'Citește două numere cu „întreabă … și așteaptă” și fă personajul să spună numărul mai mare.',
      indiciu: 'Salvează răspunsurile în variabilele a și b, apoi „dacă < (a > b) > atunci … altfel …”. Atenție: în Scratch răspunsul este text; „>” compară numerele corect.',
      start: () => fa('Provocare: maximul', { decoruri: ['tabla'], personaje: [{ tip: 'robot', x: -140, y: -50 }] }),
      async verifica(V) {
        const r = []; r.push([V.are('sensing_askandwait'), 'Folosești „întreabă … și așteaptă”.']);
        r.push([V.are('control_if_else') || V.are('control_if'), 'Folosești o structură de decizie.']);
        let ok = true;
        for (const [a, b, m] of [[12, 23, 23], [34, 17, 34], [8, 8, 8]]) {
          const t = await V.ruleaza({ raspunsuri: [a, b], max: 5000 });
          const ult = t.jurnal.spus.filter((x) => /\d/.test(x)).pop() || '';
          if (!(ult.match(/-?\d+(\.\d+)?/g) || []).includes(String(m)) || (ult.match(/-?\d+/g) || []).includes(String(Math.min(a, b))) && a !== b) ok = false;
        }
        r.push([ok, 'Pentru 12 și 23 spune 23, pentru 34 și 17 spune 34, pentru 8 și 8 spune 8.']);
        return r;
      },
    },
    {
      id: 'sari', titlu: 'Blocul „sari”', enunt: 'Creează blocul „sari”: personajul urcă 50 de pași și coboară înapoi. Folosește-l când se apasă tasta spațiu.',
      indiciu: 'Blocurile mele → „Creează un bloc” → „sari”. Sub „definește sari”: repetă 10 „modifică y cu 5”, apoi repetă 10 „modifică y cu -5”.',
      start: () => fa('Provocare: sari', { decoruri: ['parc'], personaje: [{ tip: 'pisica', x: 0, y: -80, marime: 70 }] }),
      async verifica(V) {
        const r = []; const defs = V.proceduri().filter((d) => d.proc.parts.some((p) => p.t === 'l' && /sari|sară|sări/i.test(fara(p.text))));
        r.push([defs.length > 0, 'Ai creat blocul „sari”.']);
        let laSpatiu = false;
        for (const t of P.tinte) for (const top of t.blocuri) if (top.op === 'event_whenkeypressed' && top.in.KEY_OPTION.v === 'spațiu') parcurge(top, (b) => { if (b.op === 'procedures_call' && defs.some((d) => d.proc.id === b.proc)) laSpatiu = true; });
        r.push([laSpatiu, 'Blocul „sari” este folosit la „când tasta spațiu este apăsată”.']);
        const p = personaje()[0];
        const t = await V.ruleaza({ tasta: 'spațiu', dupa: 700, max: 5000 });
        const ys = t.mostre.map((m) => m.find((x) => x.id === p.id)?.y).filter((y) => y != null);
        const y0 = ys[Math.min(ys.length - 1, 15)] ?? p.y;
        r.push([Math.max(...ys) - y0 >= 40 && Math.abs(p.y - y0) < 2, 'Personajul urcă (cel puțin 40 de pași) și revine la locul lui.']);
        return r;
      },
    },
    {
      id: 'mesaje', titlu: 'Schimbă decorul cu un mesaj', enunt: 'La steagul verde, pisica așteaptă 1 secundă și trimite mesajul „schimbă”. Scena primește mesajul și trece la decorul următor.',
      indiciu: 'Pisica: Evenimente → „trimite mesajul …” (alege „Mesaj nou…”). Scena (dă clic pe Scena, dreapta jos): „când primesc schimbă” + Aspect → „decorul următor”.',
      start: () => fa('Provocare: mesaje', { decoruri: ['parc', 'stele'], personaje: [{ tip: 'pisica', x: 0, y: -60, marime: 70 }] }),
      async verifica(V) {
        const r = [];
        r.push([personaje().some((p) => p.blocuri.some((b) => { let ok = false; parcurge(b, (x) => { if (x.op === 'event_broadcast' || x.op === 'event_broadcastandwait') ok = true; }); return ok; })), 'Un personaj trimite un mesaj.']);
        r.push([scena().blocuri.some((b) => b.op === 'event_whenbroadcastreceived'), 'Scena are un script „când primesc …”.']);
        const t = await V.ruleaza({ max: 3500 });
        r.push([t.jurnal.mesaje.length > 0 && t.jurnal.decoruri > 0, 'La rulare, mesajul este trimis și decorul se schimbă.']);
        return r;
      },
    },
  ];
  // Unelte pentru verificare
  const verificator = {
    are: (op) => P.tinte.some((t) => t.blocuri.some((b) => { let ok = false; parcurge(b, (x) => { if (x.op === op) ok = true; }); return ok; })),
    varNume: (n) => { for (const t of P.tinte) { const v = t.variabile.find((x) => x.nume === n); if (v) return v; } return null; },
    literal: (s) => P.tinte.some((t) => t.blocuri.some((b) => { let ok = false; parcurge(b, (x) => { for (const k in x.in) if (!x.in[k].b && String(x.in[k].v).trim() === s) ok = true; }); return ok; })),
    proceduri: () => P.tinte.flatMap((t) => definitii(t)),
    apelat: (id) => P.tinte.some((t) => apeluriProc(t, id, null) > 0),
    analizaCreion(seg) {
      let lungime = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const s of seg) { lungime += Math.hypot(s.x2 - s.x1, s.y2 - s.y1); for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }
      const inchis = seg.length > 2 && Math.hypot(seg[0].x1 - seg[seg.length - 1].x2, seg[0].y1 - seg[seg.length - 1].y2) < 2;
      return { lungime, latime: seg.length ? maxX - minX : 0, inaltime: seg.length ? maxY - minY : 0, inchis };
    },
    async ruleaza(o = {}) {
      const cadruNou = () => new Promise((r) => requestAnimationFrame(() => r()));
      const modVechi = R.mod; R.mod = 'normal';
      opresteTot();
      R.penCtx.setTransform(1, 0, 0, 1, 0, 0); R.penCtx.clearRect(0, 0, R.penCv.width, R.penCv.height);
      R.jurnal = { spus: [], creion: [], pozitii: [], mesaje: [], decoruri: 0 };
      R.raspunsuriAuto = o.raspunsuri ? o.raspunsuri.slice() : [];
      steagVerde();
      const pers = personaje(); const mostre = []; const t0 = performance.now(); let trimis = false;
      while (performance.now() - t0 < (o.max || 5000)) {
        await cadruNou();
        if (!E.radacina?.isConnected) break;
        mostre.push(pers.map((p) => ({ id: p.id, x: p.x, y: p.y })));
        const dt = performance.now() - t0;
        if (o.tasta && !trimis && dt > (o.dupa || 600)) { trimis = true; tastaApasata(o.tasta); setTimeout(() => R.taste.delete(o.tasta), 120); }
        if (!R.fire.length && (!o.tasta || (trimis && dt > (o.dupa || 600) + 300)) && dt > 250) break;
      }
      R.raspunsuriAuto = null; R.mod = modVechi;
      const rez = { jurnal: R.jurnal, mostre };
      return rez;
    },
  };
  const provRezolvate = () => new Set(lsCiteste(LS_PROV, []));
  function dialogProvocari() {
    const gata = provRezolvate();
    const lista = h('div', { class: 'ap-blocuri-provlista' }, PROVOCARI.map((p, i) => h('button', { type: 'button', class: `ap-blocuri-provitem ${gata.has(p.id) ? 'gata' : ''}`, onclick: async () => {
      E.dialogInchide?.(null);
      if (!(await confirmaInlocuire())) return;
      incarcaProiect(p.start(), null);
      E.provocare = p; arataProvocare();
    } }, h('span', { class: 'nr' }, gata.has(p.id) ? '✓' : String(i + 1)), h('span', { class: 'tx' }, h('strong', {}, p.titlu), h('small', {}, p.enunt)))));
    dialog('Provocări', [h('p', { class: 'ap-blocuri-nota' }, 'Alege o provocare. Construiește programul, apoi apasă „Verifică”: aplicația rulează programul tău și îți spune ce merge și ce mai trebuie făcut.'), lista], [['Închide', (i) => i(null)]], { cls: 'lat' });
  }
  function arataProvocare(rez) {
    const p = E.provocare;
    D.provBara.hidden = !p;
    if (!p) return;
    const btnV = h('button', { type: 'button', class: 'principal', onclick: async () => {
      btnV.disabled = true; btnV.textContent = 'Se verifică…';
      let r;
      try { r = await p.verifica(verificator); } catch (err) { console.error(err); r = [[false, 'Verificarea nu a reușit: ' + (err.message || err)]]; }
      if (!E.radacina?.isConnected || E.provocare !== p) return;
      const ok = r.every((x) => x[0]);
      if (ok) { const s = provRezolvate(); s.add(p.id); lsScrie(LS_PROV, [...s]); toast('Bravo! Provocarea este rezolvată.', 'ok'); canta(scena(), 'Aplauze'); }
      arataProvocare({ ok, r });
    } }, 'Verifică');
    D.provBara.replaceChildren(...[
      h('div', { class: 'ap-blocuri-prov-st' }, ICO.trofeu(), h('div', {}, h('strong', {}, `Provocare: ${p.titlu}`), h('p', {}, p.enunt))),
      rez ? h('ul', { class: `ap-blocuri-prov-rez ${rez.ok ? 'ok' : ''}` }, rez.r.map(([ok, t]) => h('li', { class: ok ? 'da' : 'nu' }, (ok ? '✓ ' : '✗ ') + t))) : null,
      h('div', { class: 'ap-blocuri-prov-btn' }, btnV,
        h('button', { type: 'button', onclick: () => toast(p.indiciu) }, 'Indiciu'),
        h('button', { type: 'button', 'aria-label': 'Închide provocarea', title: 'Închide provocarea', onclick: () => { E.provocare = null; arataProvocare(); } }, '×'))].filter(Boolean));
  }

  // ---------- Construirea ecranului ----------
  function construiesteUI() {
    const rad = h('div', { class: 'ap-blocuri' });
    E.radacina = rad;
    D.toast = h('div', { class: 'ap-blocuri-toast', 'aria-live': 'polite' });
    // Bara de sus
    const btnF = h('button', { type: 'button', class: 'ap-blocuri-meniubtn', 'aria-haspopup': 'menu', onclick: () => meniuFisier(btnF) }, 'Fișier');
    const btnEx = h('button', { type: 'button', class: 'ap-blocuri-meniubtn', 'aria-haspopup': 'menu', onclick: () => meniuExemple(btnEx) }, 'Exemple');
    const btnPr = h('button', { type: 'button', class: 'ap-blocuri-meniubtn', onclick: dialogProvocari }, ICO.trofeu(), h('span', {}, 'Provocări'));
    D.nume = h('button', { type: 'button', class: 'ap-blocuri-nume', title: 'Redenumește proiectul', onclick: redenumesteProiect }, P.nume);
    D.btnAnul = h('button', { type: 'button', class: 'ap-blocuri-tb', title: 'Anulează (Ctrl+Z)', 'aria-label': 'Anulează', onclick: anuleaza }, ICO.anul());
    D.btnRef = h('button', { type: 'button', class: 'ap-blocuri-tb', title: 'Refă (Ctrl+Y)', 'aria-label': 'Refă', onclick: reface }, ICO.ref());
    const bara = h('div', { class: 'ap-blocuri-bara' },
      h('a', { href: '#/aplicatii', class: 'ap-blocuri-inapoi', title: 'Înapoi la aplicații' }, '← Aplicații'),
      h('span', { class: 'ap-blocuri-sigla' }, sigla()), h('strong', { class: 'ap-blocuri-numeapp' }, 'Programare cu blocuri'),
      btnF, btnEx, btnPr, D.nume, h('span', { class: 'ap-blocuri-spatiu' }), D.btnAnul, D.btnRef,
      h('button', { type: 'button', class: 'ap-blocuri-salv', title: 'Salvează (Ctrl+S)', onclick: () => salveaza(false) }, ICO.salv(), h('span', { class: 'lung' }, 'Salvează')));
    D.provBara = h('div', { class: 'ap-blocuri-prov', hidden: true });
    // File: Cod / Costume / Sunete
    D.filaCostume = h('button', { type: 'button', role: 'tab', 'data-f': 'costume', onclick: () => schimbaFila('costume') }, 'Costume');
    D.file = h('div', { class: 'ap-blocuri-file', role: 'tablist' },
      h('button', { type: 'button', role: 'tab', 'data-f': 'cod', 'aria-selected': 'true', onclick: () => schimbaFila('cod') }, 'Cod'), D.filaCostume,
      h('button', { type: 'button', role: 'tab', 'data-f': 'sunete', onclick: () => schimbaFila('sunete') }, 'Sunete'));
    // Categoriile și paleta
    D.cat = h('div', { class: 'ap-blocuri-cat', role: 'navigation', 'aria-label': 'Categorii de blocuri' }, CATS.filter((c) => !c.ascuns).map((c) => {
      const cerc = h('span', { class: 'cerc' }); cerc.style.background = c.cul; cerc.style.borderColor = c.ter;
      return h('button', { type: 'button', 'data-cat': c.id, onclick: () => sectiune(c.id) }, cerc, h('span', {}, c.nume));
    }));
    D.paleta = h('div', { class: 'ap-blocuri-paleta' });
    D.paleta.addEventListener('scroll', () => {
      let cur = null; for (const s of D.paleta.querySelectorAll('[data-sectiune]')) if (s.offsetTop - 30 <= D.paleta.scrollTop) cur = s.dataset.sectiune;
      if (cur) marcheazaCat(cur);
    }, { passive: true });
    D.paletaZona = h('div', { class: 'ap-blocuri-pzona' }, D.cat, D.paleta, h('div', { class: 'ap-blocuri-cos', 'aria-hidden': 'true' }, 'Lasă aici ca să ștergi'));
    // Zona de scripturi
    const defs = sv('defs', {}, sv('filter', { id: 'ap-blocuri-stralucire', x: '-10%', y: '-10%', width: '120%', height: '120%' },
      sv('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 3, result: 'd' }), sv('feFlood', { 'flood-color': '#FFF200', 'flood-opacity': '0.95' }),
      sv('feComposite', { in2: 'd', operator: 'in', result: 'g' }), sv('feGaussianBlur', { in: 'g', stdDeviation: 1.2, result: 'gb' }),
      sv('feMerge', {}, sv('feMergeNode', { in: 'gb' }), sv('feMergeNode', { in: 'SourceGraphic' }))));
    D.comLinii = sv('g'); D.stive = sv('g'); D.indicator = sv('g'); D.comentarii = sv('g');
    D.canvas = sv('g', {}, D.comLinii, D.stive, D.indicator, D.comentarii);
    D.wsSvg = sv('svg', { class: 'ap-blocuri-svg ap-blocuri-ws-svg' }, defs, D.canvas);
    D.wsGol = h('div', { class: 'ap-blocuri-wsgol' }, h('strong', {}, 'Zona de scripturi'), h('span', {}, 'Trage aici blocuri din paletă și lipește-le unul sub altul. Clic dreapta pentru meniu.'));
    D.codPre = h('pre', { class: 'ap-blocuri-codpre', tabindex: '0' });
    D.codTitlu = h('span', {});
    const filaCod = (l, t) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(E.codLimbaj === l), onclick: (e) => { E.codLimbaj = l; e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget))); actualizeazaCod(); } }, t);
    const totCb = h('input', { type: 'checkbox', onchange: () => { E.codTot = totCb.checked; actualizeazaCod(); } });
    D.codPanou = h('div', { class: 'ap-blocuri-codpanou', hidden: true },
      h('div', { class: 'ap-blocuri-codcap' }, h('div', { class: 'ap-blocuri-codfile', role: 'tablist' }, filaCod('pseudo', 'Pseudocod'), filaCod('python', 'Python')),
        h('button', { type: 'button', class: 'ap-blocuri-mic', onclick: async () => { try { await navigator.clipboard.writeText(D.codPre.textContent); toast('Codul a fost copiat.', 'ok'); } catch { const r = document.createRange(); r.selectNodeContents(D.codPre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Apasă Ctrl+C ca să copiezi.'); } } }, 'Copiază'),
        h('button', { type: 'button', class: 'ap-blocuri-x', 'aria-label': 'Închide panoul Cod', onclick: () => deschideCod(false) }, '×')),
      h('div', { class: 'ap-blocuri-codsub' }, 'Cod pentru: ', D.codTitlu, h('label', {}, totCb, ' tot proiectul'), h('span', { class: 'ro' }, 'doar citire')),
      D.codPre);
    D.btnCod = h('button', { type: 'button', class: 'ap-blocuri-btncod', 'aria-pressed': 'false', title: 'Vezi programul ca pseudocod sau Python', onclick: () => deschideCod(!E.codDeschis) }, ICO.cod(), h('span', {}, 'Cod'));
    const zoomBtn = (t, fn, et) => h('button', { type: 'button', title: et, 'aria-label': et, onclick: fn }, t);
    D.ws = h('div', { class: 'ap-blocuri-ws' }, D.wsSvg, D.wsGol, D.btnCod,
      h('div', { class: 'ap-blocuri-zoom' }, zoomBtn('+', () => zoomLa(E.zoom * 1.2), 'Mărește'), zoomBtn('−', () => zoomLa(E.zoom / 1.2), 'Micșorează'), zoomBtn('=', () => { E.zoom = 0.8; const v = vedere(); v.sx = 30; v.sy = 30; aplicaVedere(); }, 'Mărimea obișnuită'), zoomBtn('⇅', aranjeaza, 'Aranjează blocurile')),
      D.codPanou);
    D.ws.addEventListener('pointerdown', laApasareWs);
    D.ws.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (e.target.closest('.ap-blocuri-fo, .ap-blocuri-codpanou, .ap-blocuri-zoom, .ap-blocuri-btncod')) return;
      const blEl = e.target.closest('[data-id]');
      if (blEl) meniuBloc(gasesteBloc(tintaEd(), blEl.getAttribute('data-id')), e.clientX, e.clientY); else meniuWs(e.clientX, e.clientY);
    });
    D.ws.addEventListener('wheel', (e) => {
      if (e.target.closest('.ap-blocuri-codpanou, .ap-blocuri-fo')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { zoomLa(E.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY); return; }
      const v = vedere(); v.sx -= e.shiftKey ? e.deltaY : e.deltaX; v.sy -= e.shiftKey ? 0 : e.deltaY; aplicaVedere();
    }, { passive: false });
    D.lucru = h('div', { class: 'ap-blocuri-lucru' }, D.paletaZona, D.ws);
    D.costume = h('div', { class: 'ap-blocuri-costume', hidden: true });
    D.sunete = h('div', { class: 'ap-blocuri-sunete', hidden: true });
    const stanga = h('div', { class: 'ap-blocuri-stanga' }, D.file, D.lucru, D.costume, D.sunete);
    // Scena
    D.btnSteag = h('button', { type: 'button', class: 'ap-blocuri-steag', title: 'Pornește (steagul verde)', 'aria-label': 'Pornește programul', onclick: (e) => { e.currentTarget.blur(); inchideEditor(); steagVerde(); } }, ICO.steag());
    const btnStop = h('button', { type: 'button', class: 'ap-blocuri-stop', title: 'Oprește tot', 'aria-label': 'Oprește tot', onclick: (e) => { e.currentTarget.blur(); opresteTot(); } }, ICO.stop());
    D.selViteza = h('select', { class: 'ap-blocuri-viteza', title: 'Viteza de execuție', 'aria-label': 'Viteza de execuție', onchange: () => { R.mod = D.selViteza.value; D.btnPas.hidden = R.mod !== 'pas'; evidentiere(); D.selViteza.blur(); } },
      h('option', { value: 'normal' }, 'Viteză normală'), h('option', { value: 'lent' }, 'Încet (evidențiază blocurile)'), h('option', { value: 'pas' }, 'Pas cu pas'));
    D.btnPas = h('button', { type: 'button', class: 'ap-blocuri-pasbtn', hidden: true, title: 'Execută următorul bloc', onclick: (e) => { e.currentTarget.blur(); R.pas++; } }, ICO.pas(), h('span', {}, 'Pas'));
    D.btnMica = h('button', { type: 'button', class: 'ap-blocuri-tb2', title: 'Scenă mică', 'aria-label': 'Scenă mică', onclick: () => { E.scenaMod = 'mica'; lsScrie(LS_PREF, { ...lsCiteste(LS_PREF, {}), scena: 'mica' }); aplicaMarimeScena(); } }, ICO.mica());
    D.btnMare = h('button', { type: 'button', class: 'ap-blocuri-tb2', title: 'Scenă mare', 'aria-label': 'Scenă mare', onclick: () => { E.scenaMod = 'mare'; lsScrie(LS_PREF, { ...lsCiteste(LS_PREF, {}), scena: 'mare' }); aplicaMarimeScena(); } }, ICO.mare());
    D.btnComplet = h('button', { type: 'button', class: 'ap-blocuri-tb2', title: 'Ecran complet', 'aria-label': 'Ecran complet', onclick: (e) => { e.currentTarget.blur(); seteazaEcranComplet(!E.ecranComplet); } }, ICO.complet());
    const scenaBara = h('div', { class: 'ap-blocuri-scenabara' }, D.btnSteag, btnStop, D.selViteza, D.btnPas, h('span', { class: 'ap-blocuri-spatiu' }), D.btnMica, D.btnMare, D.btnComplet);
    D.mon = h('div', { class: 'ap-blocuri-monitoare' });
    D.intrebText = h('div', { class: 'ap-blocuri-intreb-t' });
    D.intrebInp = h('input', { type: 'text', class: 'ap-blocuri-intreb-inp', 'aria-label': 'Răspunsul tău', onkeydown: (e) => { e.stopPropagation(); if (e.key === 'Enter') raspunde(); } });
    D.intreb = h('div', { class: 'ap-blocuri-intreb', hidden: true }, D.intrebText, h('div', { class: 'ap-blocuri-intreb-r' }, D.intrebInp, h('button', { type: 'button', 'aria-label': 'Trimite răspunsul', onclick: raspunde }, '✓')));
    D.strat = h('div', { class: 'ap-blocuri-strat' }, D.mon, D.intreb);
    R.cv.className = 'ap-blocuri-canvas';
    R.cv.setAttribute('aria-label', 'Scena');
    D.scenaZona = h('div', { class: 'ap-blocuri-scena' }, R.cv, D.strat);
    D.scenaZona.addEventListener('pointerdown', (e) => { if (e.target.closest('.ap-blocuri-intreb, .ap-blocuri-mon')) return; laApasareScena(e); });
    D.coord = h('div', { class: 'ap-blocuri-coord' }, 'x: 0  y: 0');
    D.prop = h('div', { class: 'ap-blocuri-prop' });
    D.tiles = h('div', { class: 'ap-blocuri-tiles' });
    D.scenaTile = h('div', { class: 'ap-blocuri-scenatile' });
    const pers = h('div', { class: 'ap-blocuri-pers' }, D.prop, h('div', { class: 'ap-blocuri-pers-corp' }, D.tiles, D.scenaTile));
    const dreapta = D.dreapta = h('div', { class: 'ap-blocuri-dreapta' }, h('div', { class: 'ap-blocuri-scenacol' }, scenaBara, D.scenaZona, D.coord), pers);
    const corp = h('div', { class: 'ap-blocuri-corp' }, stanga, dreapta);
    rad.append(bara, D.provBara, corp, D.toast);
    return { rad, bara };
  }

  // ---------- Ruta aplicației ----------
  routes.push({
    pattern: /^\/aplicatii\/blocuri$/,
    handler: async () => {
      document.title = 'Programare cu blocuri · edudigi';
      const ac = new AbortController(); const sig = { signal: ac.signal };
      initScena();
      P = proiectNou(); reconstruiesteOrdinea();
      Object.assign(E, { tinta: personaje()[0].id, fila: 'cod', undo: [], redo: [], vederi: {}, provocare: null, codDeschis: false, ecranComplet: false, idSalvat: null, modificat: false, ruleaza: false });
      R.mod = 'normal'; R.fire = []; R.taste.clear(); R.jurnal = { spus: [], creion: [], pozitii: [], mesaje: [], decoruri: 0 };
      const pref = lsCiteste(LS_PREF, {});
      E.zoom = clamp(num(pref.zoom) || 0.8, 0.35, 2);
      E.scenaMod = pref.scena || (window.innerWidth >= 1260 && window.innerHeight >= 740 ? 'mare' : 'mica');
      Object.assign(UI, { evidentiere, monitoare, proprietati: actualizeazaProp, intrebare, eroare: (m) => toast(m, 'eroare'), decorSchimbat: () => { construiestePersonaje(); if (E.fila === 'costume' && tintaEd().scena) construiesteCostume(); }, rulare: () => {} });
      const { rad, bara } = construiesteUI();
      const sarcina = window.EduSarcini?.bara ? window.EduSarcini.bara('blocuri', async () => lucrare()) : null;
      if (sarcina) bara.after(sarcina);
      show(h('div', { class: 'lab-ecran ap-blocuri-ecran' }, rad));
      aplicaMarimeScena();
      // Continuăm ciorna, dacă există
      let c = null;
      try { c = await store.get(CIORNA); } catch { /* fără stocare */ }
      if (!rad.isConnected) return;
      try { if (c?.proiect) { incarcaProiect(c.proiect, c.idSalvat || null); E.modificat = true; } else incarcaProiect(P, null); }
      catch (err) { console.error(err); incarcaProiect(proiectNou(), null); }
      schimbaFila('cod');
      // Tastatură
      window.addEventListener('keydown', (e) => {
        if (!rad.isConnected) return;
        const tg = e.target; const camp = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
        if (rad.querySelector('.ap-blocuri-fundal')) return;
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
          const k = e.key.toLowerCase();
          if (k === 's') { e.preventDefault(); salveaza(false); return; }
          if (!camp && k === 'z') { e.preventDefault(); if (e.shiftKey) reface(); else anuleaza(); return; }
          if (!camp && k === 'y') { e.preventDefault(); reface(); return; }
          return;
        }
        if (e.key === 'Escape') { inchideMeniu(); if (E.pipeta) { E.pipeta = null; D.scenaZona.classList.remove('pipeta'); } if (E.ecranComplet) seteazaEcranComplet(false); return; }
        if (camp) return;
        const k = numeTasta(e); if (!k) return;
        if (k === 'spațiu' || k.startsWith('săgeată')) e.preventDefault();
        tastaApasata(k);
      }, sig);
      window.addEventListener('keyup', (e) => { const k = numeTasta(e); if (k) R.taste.delete(k); }, sig);
      window.addEventListener('blur', () => { R.taste.clear(); R.mouse.jos = false; }, sig);
      window.addEventListener('pointermove', (e) => {
        if (!D.scenaZona?.isConnected) return;
        const [x, y] = laScena(e.clientX, e.clientY);
        R.mouse.x = clamp(x, -240, 240); R.mouse.y = clamp(y, -180, 180);
        if (Math.abs(x) <= 240 && Math.abs(y) <= 180) D.coord.textContent = `x: ${Math.round(x)}  y: ${Math.round(y)}`;
      }, { ...sig, passive: true });
      window.addEventListener('pointerup', () => { R.mouse.jos = false; }, sig);
      window.addEventListener('pointerdown', (e) => {
        if (meniuDeschis && !meniuDeschis.contains(e.target)) inchideMeniu();
      }, { ...sig, capture: true });
      window.addEventListener('resize', aplicaMarimeScena, sig);
      window.addEventListener('beforeunload', () => { if (tCiorna) { clearTimeout(tCiorna); salveazaCiorna(); } }, sig);
      // Ieșirea din aplicație
      window.addEventListener('hashchange', () => {
        if (tCiorna) { clearTimeout(tCiorna); salveazaCiorna(); }
        opresteTot(); ac.abort();
        if (E.raf) cancelAnimationFrame(E.raf); E.raf = null;
        inchideMeniu();
        setTimeout(() => { try { actx?.close(); } catch { /* */ } actx = null; }, 300);
        document.title = 'edudigi';
      }, { once: true });
      E.ultimPas = 0;
      if (E.raf) cancelAnimationFrame(E.raf);
      E.raf = requestAnimationFrame(buclaPrincipala);
    },
  });
})();

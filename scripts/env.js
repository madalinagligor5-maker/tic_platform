'use strict';
// Încarcă local variabilele din .env.local / .env (scrise de `neon deploy` sau `neon env pull`).
// Nu suprascrie variabilele deja setate (de exemplu, cele de pe Vercel).
const fs = require('fs');
const path = require('path');

function loadEnv(dir = path.join(__dirname, '..')) {
  for (const name of ['.env.local', '.env']) {
    let text;
    try {
      text = fs.readFileSync(path.join(dir, name), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

module.exports = { loadEnv };

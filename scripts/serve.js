'use strict';
// Server local minimal pentru previzualizare (npm start). Pe Vercel nu se folosește.
const http = require('http');
const fs = require('fs');
const path = require('path');
require('./env').loadEnv(); // DATABASE_URL din .env.local (scris de `neon deploy`)
const { handler: api } = require('../lib/api');

const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || 3000;
// Aceleași antete de securitate ca pe Vercel (inclusiv CSP), ca problemele să apară și local.
const ANTETE = Object.fromEntries(require('../vercel.json').headers.find((x) => x.source === '/(.*)').headers.map((x) => [x.key, x.value]));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return api(req, res);
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = path.normalize(path.join(PUBLIC, rel === '/' ? 'index.html' : rel));
  if (!file.startsWith(PUBLIC + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Negăsit');
    res.writeHead(200, { ...ANTETE, 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(buf);
  });
}).listen(PORT, () => console.log(`edudigi rulează pe http://localhost:${PORT}${process.env.DATABASE_URL ? '' : ' (fără bază de date: conturile nu funcționează)'}`));

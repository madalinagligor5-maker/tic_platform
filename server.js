'use strict';
// Pornire locală (calculator, laborator, VPS): npm start
const http = require('http');
const { createHandler } = require('./lib/app');
const { kvFromEnv } = require('./lib/kv');

function start(port = Number(process.env.PORT) || 3000, kv = kvFromEnv()) {
  const server = http.createServer(createHandler(kv));
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  start().then((s) => console.log(`Platforma TIC rulează pe http://localhost:${s.address().port}`));
}

module.exports = { start };

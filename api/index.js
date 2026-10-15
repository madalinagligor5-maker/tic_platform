'use strict';
// Funcția serverless pentru Vercel: toate cererile /api/* ajung aici (vezi vercel.json).
// Fișierele din public/ sunt servite direct de Vercel.
const { createHandler } = require('../lib/app');
const { kvFromEnv } = require('../lib/kv');

module.exports = createHandler(kvFromEnv());

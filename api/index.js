'use strict';
// Funcția Vercel: toate cererile /api/* ajung aici (vezi vercel.json). Restul site-ului este static.
module.exports = require('../lib/api').handler;

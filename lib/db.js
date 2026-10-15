'use strict';
// Conexiunea la Neon Postgres. Pe Vercel (Fluid compute) Neon recomandă node-postgres (`pg`) cu un pool
// atașat prin attachDatabasePool, ca funcția să închidă corect conexiunile inactive.
// DATABASE_URL (pooled) vine din `neon deploy` / `neon env pull` (.env.local) sau din setările Vercel.
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX) || 5,
      idleTimeoutMillis: 10_000,
    });
    try {
      require('@vercel/functions').attachDatabasePool(pool);
    } catch {
      // local, în afara Vercel: nu e nevoie
    }
  }
  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  if (!p) throw Object.assign(new Error('DATABASE_URL lipsește'), { code: 'NO_DB' });
  const res = await p.query(text, params);
  return res.rows;
}

async function closePool() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { query, getPool, closePool };

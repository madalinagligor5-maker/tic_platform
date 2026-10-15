'use strict';
// Stocare cheie–valoare cu două implementări:
//  - fileKv:    local, în data/db.json (pentru `npm start` pe calculator sau VPS);
//  - upstashKv: Upstash Redis prin REST (pentru Vercel, unde discul nu se păstrează).
// Ambele au aceeași interfață asincronă; valorile sunt obiecte JSON.
const fs = require('fs');
const path = require('path');

function fileKv(file) {
  let d = { kv: {}, sets: {}, hashes: {} };
  try {
    d = { ...d, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const persist = () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(d));
    fs.renameSync(file + '.tmp', file);
  };
  const live = (key) => {
    const e = d.kv[key];
    if (e && e.exp && e.exp < Date.now()) {
      delete d.kv[key];
      return undefined;
    }
    return e;
  };
  return {
    async get(key) {
      const e = live(key);
      return e ? e.v : null;
    },
    async mget(keys) {
      return keys.map((k) => (live(k) ? live(k).v : null));
    },
    async set(key, value, { ex, nx } = {}) {
      if (nx && live(key)) return false;
      d.kv[key] = { v: value, ...(ex ? { exp: Date.now() + ex * 1000 } : {}) };
      persist();
      return true;
    },
    async del(...keys) {
      for (const k of keys) delete d.kv[k], delete d.sets[k], delete d.hashes[k];
      persist();
    },
    async sadd(key, member) {
      d.sets[key] = [...new Set([...(d.sets[key] || []), member])];
      persist();
    },
    async srem(key, member) {
      d.sets[key] = (d.sets[key] || []).filter((m) => m !== member);
      persist();
    },
    async smembers(key) {
      return [...(d.sets[key] || [])];
    },
    async hset(key, field, value) {
      d.hashes[key] = { ...(d.hashes[key] || {}), [field]: value };
      persist();
    },
    async hgetall(key) {
      return { ...(d.hashes[key] || {}) };
    },
  };
}

function upstashKv(url, token) {
  async function cmd(...args) {
    const res = await fetch(url.replace(/\/$/, ''), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args.map(String)),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new Error(`Upstash: ${body.error || res.status}`);
    return body.result;
  }
  const parse = (s) => (s == null ? null : JSON.parse(s));
  return {
    async get(key) {
      return parse(await cmd('GET', key));
    },
    async mget(keys) {
      if (!keys.length) return [];
      return (await cmd('MGET', ...keys)).map(parse);
    },
    async set(key, value, { ex, nx } = {}) {
      const args = ['SET', key, JSON.stringify(value)];
      if (ex) args.push('EX', ex);
      if (nx) args.push('NX');
      return (await cmd(...args)) === 'OK';
    },
    async del(...keys) {
      if (keys.length) await cmd('DEL', ...keys);
    },
    async sadd(key, member) {
      await cmd('SADD', key, member);
    },
    async srem(key, member) {
      await cmd('SREM', key, member);
    },
    async smembers(key) {
      return (await cmd('SMEMBERS', key)) || [];
    },
    async hset(key, field, value) {
      await cmd('HSET', key, field, value);
    },
    async hgetall(key) {
      const r = (await cmd('HGETALL', key)) || [];
      if (!Array.isArray(r)) return r;
      const o = {};
      for (let i = 0; i < r.length; i += 2) o[r[i]] = r[i + 1];
      return o;
    },
  };
}

// Alege stocarea după variabilele de mediu. Integrarea Upstash din Vercel setează
// KV_REST_API_URL/KV_REST_API_TOKEN (sau UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN).
function kvFromEnv(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return upstashKv(url, token);
  if (env.VERCEL) return null; // pe Vercel discul nu se păstrează: fără Redis nu putem salva nimic
  return fileKv(env.DATA_FILE || path.join(__dirname, '..', 'data', 'db.json'));
}

module.exports = { fileKv, upstashKv, kvFromEnv };

'use strict';
// Aplică db/schema.sql pe baza de date Neon. Rulare: npm run db:migrate
// Neon recomandă conexiunea directă (fără -pooler) pentru migrări: se folosește DATABASE_URL_UNPOOLED dacă există.
// Cu --if-configured (folosit de `npm run build`), lipsa bazei de date nu este o eroare: site-ul static merge și fără ea.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { loadEnv } = require('./env');

async function migrate(connectionString) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

module.exports = { migrate };

if (require.main === module) {
  loadEnv();
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    if (process.argv.includes('--if-configured')) {
      console.log('Fără DATABASE_URL: sar peste migrare (conturile și progresul nu vor funcționa până o configurezi).');
      process.exit(0);
    }
    console.error('Lipsește DATABASE_URL. Rulează `neon deploy` sau `neon env pull`, ori setează variabila.');
    process.exit(1);
  }
  migrate(url)
    .then(() => console.log('Schema bazei de date este la zi.'))
    .catch((e) => {
      console.error('Migrarea a eșuat:', e.message);
      process.exit(1);
    });
}

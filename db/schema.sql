-- Schema edudigi (Neon / Lakebase Postgres). Idempotentă: se poate rula de mai multe ori.
-- Rulare: npm run db:migrate (rulează automat și la `npm run build`, dacă există DATABASE_URL).
-- Date minime despre elevi: doar pseudonimul și progresul agregat, fără e-mail sau nume complet.

CREATE TABLE IF NOT EXISTS profesori (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizator    text NOT NULL UNIQUE,
  nume          text NOT NULL,
  parola_hash   text NOT NULL,
  esecuri       int  NOT NULL DEFAULT 0,
  blocat_pana   timestamptz,
  creat_la      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clase (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id         uuid NOT NULL REFERENCES profesori(id) ON DELETE CASCADE,
  nume                text NOT NULL,
  clasa               smallint NOT NULL CHECK (clasa BETWEEN 5 AND 12),
  cod                 text NOT NULL UNIQUE,
  inscriere_deschisa  boolean NOT NULL DEFAULT true,
  creat_la            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clase_profesor_idx ON clase (profesor_id);

CREATE TABLE IF NOT EXISTS elevi (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clasa_id       uuid NOT NULL REFERENCES clase(id) ON DELETE CASCADE,
  pseudonim      text NOT NULL,
  pin_hash       text NOT NULL,
  esecuri        int  NOT NULL DEFAULT 0,
  blocat_pana    timestamptz,
  ultima_logare  timestamptz,
  creat_la       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS elevi_pseudonim_idx ON elevi (clasa_id, lower(pseudonim));

CREATE TABLE IF NOT EXISTS sesiuni (
  token_hash      text PRIMARY KEY,
  rol             text NOT NULL CHECK (rol IN ('profesor', 'elev')),
  utilizator_id   uuid NOT NULL,
  expira_la       timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiuni_utilizator_idx ON sesiuni (utilizator_id);
CREATE INDEX IF NOT EXISTS sesiuni_expira_idx ON sesiuni (expira_la);

-- Sesiunile se șterg odată cu profesorul sau elevul lor (și când profesorul e șters, prin clase → elevi).
-- utilizator_id indică fie un profesor, fie un elev, așa că cheile străine stau pe două coloane generate din rol.
-- Mai întâi se șterg sesiunile rămase fără utilizator, altfel cheile străine nu s-ar putea adăuga.
DELETE FROM sesiuni s
WHERE (s.rol = 'profesor' AND NOT EXISTS (SELECT 1 FROM profesori p WHERE p.id = s.utilizator_id))
   OR (s.rol = 'elev' AND NOT EXISTS (SELECT 1 FROM elevi e WHERE e.id = s.utilizator_id));
ALTER TABLE sesiuni ADD COLUMN IF NOT EXISTS profesor_id uuid
  GENERATED ALWAYS AS (CASE WHEN rol = 'profesor' THEN utilizator_id END) STORED
  REFERENCES profesori(id) ON DELETE CASCADE;
ALTER TABLE sesiuni ADD COLUMN IF NOT EXISTS elev_id uuid
  GENERATED ALWAYS AS (CASE WHEN rol = 'elev' THEN utilizator_id END) STORED
  REFERENCES elevi(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS sesiuni_profesor_idx ON sesiuni (profesor_id);
CREATE INDEX IF NOT EXISTS sesiuni_elev_idx ON sesiuni (elev_id);

-- Un singur rând pe elev și material: progresul agregat, nu fiecare clic.
CREATE TABLE IF NOT EXISTS progres (
  elev_id        uuid NOT NULL REFERENCES elevi(id) ON DELETE CASCADE,
  material_id    text NOT NULL,
  stare          text NOT NULL CHECK (stare IN ('inceput', 'terminat')),
  rezolvate      int  NOT NULL DEFAULT 0,   -- aplicații rezolvate
  din_prima      int  NOT NULL DEFAULT 0,   -- aplicații rezolvate din prima încercare (punctajul)
  total          int  NOT NULL DEFAULT 0,   -- aplicații în material
  incercari      int  NOT NULL DEFAULT 0,   -- apăsări pe „Verifică” (cumulat)
  secunde        int  NOT NULL DEFAULT 0,   -- timp aproximativ petrecut (cumulat)
  inceput_la     timestamptz NOT NULL DEFAULT now(),
  actualizat_la  timestamptz NOT NULL DEFAULT now(),
  terminat_la    timestamptz,
  PRIMARY KEY (elev_id, material_id)
);

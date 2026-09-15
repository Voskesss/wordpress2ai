-- Eenmalige omzetting meerekenen in de eerste betaling + klantgegevens voor de factuur
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS eenmalig_cent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS klant_bedrijf TEXT;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS klant_adres TEXT;

-- Automatische facturen bij elke betaalde Mollie-betaling (reeks WS-JJJJ-NNNN)
CREATE TABLE IF NOT EXISTS facturen (
  id SERIAL PRIMARY KEY,
  nummer TEXT UNIQUE,
  site_id INTEGER NOT NULL,
  mollie_payment_id TEXT NOT NULL UNIQUE,
  klant_naam TEXT NOT NULL,
  klant_bedrijf TEXT,
  klant_adres TEXT,
  klant_email TEXT NOT NULL,
  regels JSONB NOT NULL,
  subtotaal_cent INTEGER NOT NULL,
  btw_cent INTEGER NOT NULL,
  totaal_cent INTEGER NOT NULL,
  betaalwijze TEXT NOT NULL,
  verstuurd BOOLEAN NOT NULL DEFAULT FALSE,
  datum TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Doorlopende teller per jaar; één atomaire update per nieuw nummer, zodat er geen gaten of dubbelen ontstaan
CREATE TABLE IF NOT EXISTS factuur_teller (
  jaar INTEGER PRIMARY KEY,
  laatste INTEGER NOT NULL
);

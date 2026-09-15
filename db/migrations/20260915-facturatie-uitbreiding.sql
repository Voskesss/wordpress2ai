-- Klantgegevens, geplande wijzigingen en opzeggingen bij abonnementen
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS klant_btw TEXT;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS klant_kvk TEXT;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS stopt_op TEXT;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS nieuw_bedrag_cent INTEGER;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS nieuw_bedrag_vanaf TEXT;

-- Creditfacturen, klantgegevens en de vastgelegde pdf (bewaarplicht: ongewijzigd zoals verstuurd)
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS soort TEXT NOT NULL DEFAULT 'factuur';
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS credit_voor_id INTEGER;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS credit_voor_nummer TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS klant_btw TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS klant_kvk TEXT;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS pdf_base64 TEXT;

-- Betaalverzoeken: eigen betaallinks die niet verlopen, en losse opdrachten
CREATE TABLE IF NOT EXISTS betaalverzoeken (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  site_id INTEGER NOT NULL,
  soort TEXT NOT NULL,
  wijze TEXT NOT NULL DEFAULT 'link',
  omschrijving TEXT NOT NULL,
  bedrag_excl_cent INTEGER NOT NULL,
  klant_naam TEXT NOT NULL,
  klant_email TEXT NOT NULL,
  klant_bedrijf TEXT,
  klant_adres TEXT,
  klant_btw TEXT,
  klant_kvk TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  mollie_payment_id TEXT,
  betaald_op TIMESTAMP,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Terugweg-garantie: per klant de WordPress-kopie(ën) die Jos klaarzet, door de klant te downloaden
CREATE TABLE IF NOT EXISTS wp_backups (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  bestandsnaam TEXT NOT NULL,
  grootte_bytes BIGINT,
  omschrijving TEXT,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW()
);

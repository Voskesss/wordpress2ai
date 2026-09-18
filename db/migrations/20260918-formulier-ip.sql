-- Spamrem op het formulier-adres: tellen per afzender, zonder IP-adressen
-- leesbaar te bewaren. De kolom bevat alleen een afdruk (HMAC) en blijft leeg
-- zolang FORMULIER_IP_SALT niet is ingesteld. Zie lib/formulier-rem.ts.
-- (Geen puntkomma's in deze toelichting: de migratie wordt per statement
-- gedraaid en die splitsing gaat op de puntkomma.)
ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS ip_afdruk text;

-- De rem telt per afdruk over het afgelopen uur. Deze index houdt dat snel.
CREATE INDEX IF NOT EXISTS formulier_inzendingen_ip_afdruk_idx
  ON formulier_inzendingen (ip_afdruk, aangemaakt);

-- Dezelfde telling per sitecode. Die deed de oude rem al, maar zonder index.
CREATE INDEX IF NOT EXISTS formulier_inzendingen_site_repo_idx
  ON formulier_inzendingen (site_repo, aangemaakt);

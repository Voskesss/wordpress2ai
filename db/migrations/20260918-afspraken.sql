-- Afspraken inplannen per klant: Jos zet dagen klaar (blokken), de klant kiest
-- een starttijd. Een bevestigde afspraak blokkeert die tijd bij alle klanten.
CREATE TABLE IF NOT EXISTS afspraak_blokken (
  id serial PRIMARY KEY,
  site_id integer NOT NULL,
  datum text NOT NULL,              -- YYYY-MM-DD (Nederlandse tijd)
  van text NOT NULL,                -- HH:MM
  tot text NOT NULL,                -- HH:MM
  duur_minuten integer NOT NULL DEFAULT 30,
  aangemaakt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS afspraak_blokken_site ON afspraak_blokken (site_id);

CREATE TABLE IF NOT EXISTS afspraken (
  id serial PRIMARY KEY,
  site_id integer NOT NULL,
  start timestamptz NOT NULL,
  duur_minuten integer NOT NULL,
  status text NOT NULL DEFAULT 'aangevraagd',  -- aangevraagd | bevestigd | geannuleerd
  naam text,
  email text,
  telefoon text,
  opmerking text,
  onderwerp text,
  aangemaakt timestamptz NOT NULL DEFAULT now(),
  bevestigd_op timestamptz
);
CREATE INDEX IF NOT EXISTS afspraken_site ON afspraken (site_id);
CREATE INDEX IF NOT EXISTS afspraken_start ON afspraken (start);

-- Onraadbare code voor de deelbare planlink (ook bruikbaar zonder account)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS afspraak_token text;
CREATE UNIQUE INDEX IF NOT EXISTS sites_afspraak_token ON sites (afspraak_token) WHERE afspraak_token IS NOT NULL;

-- Wanneer de klant de uitnodiging met de voorgestelde dagen kreeg
ALTER TABLE sites ADD COLUMN IF NOT EXISTS afspraak_mail_op timestamptz;

-- Kwam de aanvraag van een ingelogde klant (portaal) of via de losse link?
ALTER TABLE afspraken ADD COLUMN IF NOT EXISTS ingelogd boolean NOT NULL DEFAULT false;
ALTER TABLE afspraken ADD COLUMN IF NOT EXISTS clerk_user_id text;

-- Reden die de klant opgeeft bij het afzeggen
ALTER TABLE afspraken ADD COLUMN IF NOT EXISTS afzeg_reden text;

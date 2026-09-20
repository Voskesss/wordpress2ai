-- Lead-opvolging: AI-oordeel en klaarstaande conceptmail per lead, plus een
-- postlog (lead_post) voor mails die via Soverin binnenkomen of zijn verstuurd.
-- Systeem-mails (via de Mailer) staan al in verzonden_mails en tellen mee via het e-mailadres.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS oordeel text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS concept_soort text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS concept_onderwerp text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS concept_tekst text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS concept_klaar_op timestamp;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS soverin_doorzocht boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS lead_post (
  id serial PRIMARY KEY,
  lead_id integer NOT NULL,
  richting text NOT NULL,            -- uit | in
  bron text NOT NULL,                -- soverin-inbox | soverin-verzonden
  onderwerp text,
  fragment text,                     -- begin van de tekst, voor de tijdlijn
  message_id text,
  datum timestamp NOT NULL,
  aangemaakt timestamp NOT NULL DEFAULT now(),
  UNIQUE (lead_id, message_id)
);

CREATE INDEX IF NOT EXISTS lead_post_lead_idx ON lead_post (lead_id);

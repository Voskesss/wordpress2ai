-- Acties per lead: toevoegen en afvinken, afgevinkte acties blijven zichtbaar
CREATE TABLE IF NOT EXISTS lead_acties (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  tekst TEXT NOT NULL,
  datum TEXT,
  gedaan BOOLEAN NOT NULL DEFAULT FALSE,
  gedaan_op TIMESTAMP,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- De bestaande "volgende actie" per lead omzetten naar een eerste open actie
INSERT INTO lead_acties (lead_id, tekst, datum)
SELECT id, volgende_actie, actie_datum FROM leads
WHERE volgende_actie IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM lead_acties WHERE lead_acties.lead_id = leads.id);

UPDATE leads SET volgende_actie = NULL, actie_datum = NULL
WHERE volgende_actie IS NOT NULL;

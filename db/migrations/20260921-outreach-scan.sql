-- Prospects komen nu ook binnen vanuit de scan die buiten WordSwap draait.
-- Daarvoor missen er drie dingen: een telefoonnummer (veel gevonden bedrijven
-- hebben geen mailadres, die moet je bellen), waar ze vandaan komen, en een
-- verwijzing naar de lead die ze worden zodra ze reageren.
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS telefoon text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS bron text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_id integer REFERENCES leads(id);
-- Wanneer de meekijker dit adres voor het laatst in de mailbox gezocht heeft.
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS soverin_doorzocht boolean NOT NULL DEFAULT false;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS aangemaakt_door text;

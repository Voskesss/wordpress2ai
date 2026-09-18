-- WhatsApp: nummers worden voortaan door WordSwap in de admin vastgelegd.
-- De koppelcode vervalt; in plaats daarvan een naam bij het nummer.
ALTER TABLE whatsapp_koppelingen ADD COLUMN IF NOT EXISTS omschrijving TEXT;
ALTER TABLE whatsapp_koppelingen DROP COLUMN IF EXISTS koppelcode;
ALTER TABLE whatsapp_koppelingen DROP COLUMN IF EXISTS code_verloopt;

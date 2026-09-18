-- Eén telefoon mag aan meerdere websites hangen (iemand met twee sites).
-- Het nummer is niet meer uniek op zichzelf, wel uniek per site.
ALTER TABLE whatsapp_koppelingen DROP CONSTRAINT IF EXISTS whatsapp_koppelingen_telefoon_unique;
ALTER TABLE whatsapp_koppelingen DROP CONSTRAINT IF EXISTS whatsapp_koppelingen_telefoon_key;
ALTER TABLE whatsapp_koppelingen ADD COLUMN IF NOT EXISTS laatst_gebruikt TIMESTAMP;
ALTER TABLE whatsapp_koppelingen
  ADD CONSTRAINT whatsapp_koppelingen_telefoon_site UNIQUE (telefoon, site_id);

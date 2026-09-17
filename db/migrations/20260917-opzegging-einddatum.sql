-- Opzeggen met een vaste einddatum: de site blijft werken tot het einde van de
-- betaalde periode en blijft daarna nog een maand online. Tot die tijd kan de
-- opzegging worden teruggedraaid.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS offline_na text;
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS betaald_tot text;

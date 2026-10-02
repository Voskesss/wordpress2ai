-- Livegang-punten die de beheerder zelf heeft afgevinkt (komma-gescheiden sleutels),
-- bijvoorbeeld Search Console die de klant zelf al via een bestand regelde
ALTER TABLE sites ADD COLUMN IF NOT EXISTS livegang_afgevinkt text;

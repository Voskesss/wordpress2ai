-- Hoofdadres van de site: standaard zonder www. Aan = de site draait op www
-- en het adres zonder www stuurt door (voor sites die zo in Google staan)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS hoofdadres_www boolean NOT NULL DEFAULT false

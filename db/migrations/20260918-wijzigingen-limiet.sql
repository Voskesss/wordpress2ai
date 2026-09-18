-- Fair-use-aantal wijzigingen per maand: per klant instelbaar (was hard 30),
-- met net als bij het AI-budget een eenmalige extra die vanzelf vervalt.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS wijzigingen_limiet integer NOT NULL DEFAULT 30;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS wijzigingen_extra integer NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS wijzigingen_extra_maand text;

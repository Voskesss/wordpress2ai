-- Eenmalige verhoging van het AI-maandbudget: geldt alleen voor de opgegeven
-- maand (YYYY-MM) en vervalt daarna vanzelf.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ai_extra_usd integer NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ai_extra_maand text;

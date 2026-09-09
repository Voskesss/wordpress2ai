-- Instelbaar AI-maandbudget per site (hele dollars). Additief, geen datawijziging.
-- Al toegepast op dev (2026-09-09); bij merge naar main ook op productie draaien.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ai_maandbudget_usd integer NOT NULL DEFAULT 5;

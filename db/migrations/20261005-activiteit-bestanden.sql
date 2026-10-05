-- Welke bestanden een stap in het logboek raakte (teamvenster bij het concept)
ALTER TABLE site_activiteit ADD COLUMN IF NOT EXISTS bestanden jsonb;

-- Audiobank: limiet per site voor het aantal audiobestanden in de media-map
ALTER TABLE sites ADD COLUMN IF NOT EXISTS audio_limiet integer NOT NULL DEFAULT 10

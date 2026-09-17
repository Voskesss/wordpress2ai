-- Bevestigingsmail per formulier: welke formulieren een site heeft, en de tekst die invullers terugkrijgen
CREATE TABLE IF NOT EXISTS formulier_bevestigingen (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL,
  formulier TEXT NOT NULL,
  paginas JSONB NOT NULL DEFAULT '[]'::jsonb,
  velden JSONB NOT NULL DEFAULT '[]'::jsonb,
  onderwerp TEXT,
  tekst TEXT,
  bron TEXT NOT NULL DEFAULT 'standaard',
  aan BOOLEAN NOT NULL DEFAULT TRUE,
  bijgewerkt TIMESTAMP NOT NULL DEFAULT NOW(),
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT formulier_bevestigingen_site_formulier UNIQUE (site_id, formulier)
);

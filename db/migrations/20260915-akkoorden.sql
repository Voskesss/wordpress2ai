-- Vastgelegde akkoorden van klanten (bijv. de verwerkersovereenkomst bij eerste inlog)
CREATE TABLE IF NOT EXISTS akkoorden (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  email TEXT,
  soort TEXT NOT NULL,
  versie TEXT NOT NULL,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, soort, versie)
);

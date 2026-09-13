-- Feedback op de chatbeleving: duimpjes en algemene opmerkingen uit het portaal
CREATE TABLE IF NOT EXISTS chat_feedback (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL,
  clerk_user_id TEXT,
  oordeel TEXT NOT NULL,
  reden TEXT,
  antwoord TEXT,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW()
);

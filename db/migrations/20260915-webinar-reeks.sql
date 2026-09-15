-- Automatische mailreeks rond webinars: per mail aan/uit, en per inschrijving bijhouden wat verstuurd is
ALTER TABLE webinars ADD COLUMN IF NOT EXISTS demo_video_link TEXT;

CREATE TABLE IF NOT EXISTS webinar_mail_instellingen (
  soort TEXT PRIMARY KEY,
  aan BOOLEAN NOT NULL DEFAULT FALSE,
  bijgewerkt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webinar_mails (
  id SERIAL PRIMARY KEY,
  inschrijving_id INTEGER NOT NULL,
  webinar_id INTEGER NOT NULL,
  soort TEXT NOT NULL,
  verzonden_op TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT webinar_mails_inschrijving_soort UNIQUE (inschrijving_id, soort)
);

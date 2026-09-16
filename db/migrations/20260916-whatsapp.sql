-- WhatsApp-kanaal: eigenaar stuurt zijn website een appje
ALTER TABLE sites ADD COLUMN IF NOT EXISTS whatsapp_actief BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS whatsapp_koppelingen (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  clerk_user_id TEXT NOT NULL,
  telefoon TEXT UNIQUE,
  koppelcode TEXT,
  code_verloopt TIMESTAMP,
  gekoppeld_op TIMESTAMP,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_berichten (
  id SERIAL PRIMARY KEY,
  wa_message_id TEXT NOT NULL UNIQUE,
  telefoon TEXT NOT NULL,
  site_id INTEGER REFERENCES sites(id),
  soort TEXT NOT NULL,
  inhoud TEXT,
  media_id TEXT,
  mime_type TEXT,
  bestandsnaam TEXT,
  status TEXT NOT NULL DEFAULT 'wacht',
  ontvangen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS whatsapp_berichten_telefoon_status ON whatsapp_berichten (telefoon, status);

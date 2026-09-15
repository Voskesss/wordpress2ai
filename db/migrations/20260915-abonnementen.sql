-- Maandabonnementen via Mollie: eerste betaling via iDEAL geeft een
-- machtiging, daarna schrijft Mollie maandelijks af via SEPA-incasso.
CREATE TABLE IF NOT EXISTS abonnementen (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL UNIQUE,
  email TEXT NOT NULL,
  naam TEXT NOT NULL,
  maandbedrag_cent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'wacht_op_eerste',
  mollie_customer_id TEXT,
  mollie_mandate_id TEXT,
  mollie_subscription_id TEXT,
  betaallink TEXT,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW(),
  bijgewerkt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS betalingen (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL,
  mollie_payment_id TEXT NOT NULL UNIQUE,
  soort TEXT NOT NULL,
  bedrag_cent INTEGER NOT NULL,
  status TEXT NOT NULL,
  omschrijving TEXT,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW(),
  bijgewerkt TIMESTAMP NOT NULL DEFAULT NOW()
);

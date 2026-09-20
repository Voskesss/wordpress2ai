-- Standaard AI-maandbudget van 5 naar 10 dollar: met 5 liep een normaal
-- gebruikte site al halverwege de maand tegen de rem
ALTER TABLE sites ALTER COLUMN ai_maandbudget_usd SET DEFAULT 10

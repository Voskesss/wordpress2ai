-- Afspraken ook voor potentiële klanten (leads), niet alleen voor klanten met
-- een site. Een lead die wil kennismaken krijgt dezelfde planlink, en zodra hij
-- klant wordt blijft de kennismaking aan de lead hangen als geschiedenis.
--
-- Eigenaar van een blok of afspraak is vanaf nu OF een site OF een lead, nooit
-- beide en nooit geen van beide. Dat staat als CHECK in de database, zodat
-- afspraakStand() altijd precies een eigenaar heeft.

ALTER TABLE afspraak_blokken ADD COLUMN IF NOT EXISTS lead_id integer;
ALTER TABLE afspraak_blokken ALTER COLUMN site_id DROP NOT NULL;
ALTER TABLE afspraken ADD COLUMN IF NOT EXISTS lead_id integer;
ALTER TABLE afspraken ALTER COLUMN site_id DROP NOT NULL;

-- Hoe Jos contact opneemt, zoals hij het bij het bevestigen invulde: leeg is
-- bellen, een zin als 'Ik stuur je een Zoom-link.' wordt letterlijk gebruikt.
-- Stond eerst alleen in de mail, nu ook op de planpagina zelf.
ALTER TABLE afspraken ADD COLUMN IF NOT EXISTS contact text;

-- Eigen planlink en uitnodigingsstempel per lead, net als bij een site
ALTER TABLE leads ADD COLUMN IF NOT EXISTS afspraak_token text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS afspraak_mail_op timestamptz;

-- Gezet zodra een lead klant wordt, zodat de leadgeschiedenis (inclusief de
-- kennismaking) aan de klant vast blijft zitten
ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_id integer;

ALTER TABLE afspraak_blokken DROP CONSTRAINT IF EXISTS afspraak_blokken_een_eigenaar;
ALTER TABLE afspraak_blokken ADD CONSTRAINT afspraak_blokken_een_eigenaar CHECK ((site_id IS NULL) <> (lead_id IS NULL));
ALTER TABLE afspraken DROP CONSTRAINT IF EXISTS afspraken_een_eigenaar;
ALTER TABLE afspraken ADD CONSTRAINT afspraken_een_eigenaar CHECK ((site_id IS NULL) <> (lead_id IS NULL));

CREATE INDEX IF NOT EXISTS afspraak_blokken_lead_idx ON afspraak_blokken (lead_id);
CREATE INDEX IF NOT EXISTS afspraken_lead_idx ON afspraken (lead_id);
CREATE INDEX IF NOT EXISTS leads_afspraak_token_idx ON leads (afspraak_token);

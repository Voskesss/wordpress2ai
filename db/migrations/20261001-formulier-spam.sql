-- Inhoudscontrole op formulierberichten: overduidelijke massaspam wordt wel
-- bewaard maar gemarkeerd, en niemand krijgt er mail over. De reden staat
-- erbij zodat een vals alarm te beoordelen is. Zie lib/formulier-spam.ts.
ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS spam boolean NOT NULL DEFAULT false;

ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS spam_reden text;

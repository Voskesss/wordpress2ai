-- Inhoudscontrole op formulierberichten, in drie standen (lib/formulier-spam):
-- "zeker" gaat stil naar het Spam-tabje en komt in het dagoverzicht,
-- "waarschijnlijk" krijgt een geel label en een gewaarschuwde melding.
-- De reden staat erbij zodat een vals alarm te beoordelen is.
ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS spam boolean NOT NULL DEFAULT false;

ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS spam_reden text;

ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS spam_stand text;

ALTER TABLE formulier_inzendingen ADD COLUMN IF NOT EXISTS spam_gemeld_op timestamp;

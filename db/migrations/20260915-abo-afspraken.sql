-- Aanvullende/afwijkende afspraken per abonnement; komen in de opdrachtbevestiging-pdf
ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS afspraken TEXT;

-- Een eigen mailserver van de klant kan stil stoppen met werken: wachtwoord
-- gewijzigd, mailbox vol, host verhuisd. De mail wordt dan wel afgeleverd (via
-- Resend), maar uit naam van no-reply@wordswap.nl in plaats van de klant zelf.
-- Niemand merkt dat. Deze twee kolommen maken zo'n storing zichtbaar.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS smtp_fout_op timestamptz;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS smtp_fout_tekst text;

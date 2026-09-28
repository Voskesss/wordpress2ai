-- Handtekening onder formuliermails: de bedrijfsnaam onder het logo kunnen weglaten
-- (het logo bevat de naam vaak al, dan staat hij er dubbel)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS mail_naam_verbergen boolean NOT NULL DEFAULT false

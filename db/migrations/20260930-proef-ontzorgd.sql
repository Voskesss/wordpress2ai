-- Proefmaand Optimaal ontzorgd (met WhatsApp): tot wanneer, en of de herinnering al is verstuurd
ALTER TABLE sites ADD COLUMN IF NOT EXISTS proef_ontzorgd_tot timestamp;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS proef_herinnerd boolean NOT NULL DEFAULT false

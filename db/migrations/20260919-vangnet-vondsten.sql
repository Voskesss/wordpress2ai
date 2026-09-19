-- Vondsten van het dubbeling-vangnet bij het concept bewaren zodat
-- "Overal doorvoeren" mechanisch kan worden uitgevoerd
ALTER TABLE changes ADD COLUMN IF NOT EXISTS vangnet_vondsten jsonb

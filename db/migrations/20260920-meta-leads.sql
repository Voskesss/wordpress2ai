-- Meta-koppeling: het lead-id van Meta onthouden, zodat de import dedupliceert.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_lead_id text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_meta_lead_idx ON leads (meta_lead_id) WHERE meta_lead_id IS NOT NULL;

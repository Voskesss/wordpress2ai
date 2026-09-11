-- Verzonden losse mails uit de admin-Mailer, zodat Jos kan terugzien wat er is verstuurd
CREATE TABLE IF NOT EXISTS verzonden_mails (
  id SERIAL PRIMARY KEY,
  aan TEXT NOT NULL,
  onderwerp TEXT NOT NULL,
  tekst TEXT NOT NULL,
  verzonden TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bezorgstatus: Resend-id per mail zodat de admin de status (afgeleverd/gebounced) kan tonen
ALTER TABLE verzonden_mails ADD COLUMN IF NOT EXISTS resend_id TEXT;

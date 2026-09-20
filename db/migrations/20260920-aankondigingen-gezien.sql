-- Wegklikken van aankondigingen per account in plaats van per browser
CREATE TABLE IF NOT EXISTS aankondigingen_gezien (
  aankondiging_id integer NOT NULL REFERENCES aankondigingen(id),
  clerk_user_id text NOT NULL,
  gezien timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (aankondiging_id, clerk_user_id)
)

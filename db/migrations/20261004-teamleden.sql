-- Teamleden per site en een logboek van wie wat deed (Jos, 04-10-2026)
CREATE TABLE IF NOT EXISTS site_leden (
  id serial PRIMARY KEY,
  site_id integer NOT NULL REFERENCES sites(id),
  email text NOT NULL,
  naam text NOT NULL,
  clerk_user_id text,
  mag_publiceren boolean NOT NULL DEFAULT false,
  mag_berichten boolean NOT NULL DEFAULT false,
  uitgenodigd_door text,
  aangemaakt timestamp NOT NULL DEFAULT now(),
  CONSTRAINT site_leden_site_email UNIQUE (site_id, email)
);
CREATE INDEX IF NOT EXISTS site_leden_gebruiker ON site_leden (clerk_user_id);
CREATE TABLE IF NOT EXISTS site_activiteit (
  id serial PRIMARY KEY,
  site_id integer NOT NULL REFERENCES sites(id),
  clerk_user_id text,
  naam text NOT NULL,
  soort text NOT NULL,
  omschrijving text NOT NULL,
  change_id integer,
  aangemaakt timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_activiteit_site ON site_activiteit (site_id, aangemaakt);
CREATE INDEX IF NOT EXISTS site_activiteit_change ON site_activiteit (change_id);

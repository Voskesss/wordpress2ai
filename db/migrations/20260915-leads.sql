-- Leadlijst: iedereen die zelf contact zocht, met status en volgende actie
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  naam TEXT NOT NULL,
  email TEXT,
  telefoon TEXT,
  website TEXT,
  bron TEXT,
  soort TEXT NOT NULL DEFAULT 'klant',
  status TEXT NOT NULL DEFAULT 'nieuw',
  volgende_actie TEXT,
  actie_datum TEXT,
  notities TEXT,
  aangemaakt TIMESTAMP NOT NULL DEFAULT NOW(),
  bijgewerkt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- De leads tot nu toe (alleen als de lijst nog leeg is)
INSERT INTO leads (naam, email, website, bron, soort, status, volgende_actie, actie_datum, notities)
SELECT * FROM (VALUES
  ('Roelie Reiling', NULL, 'roelart.nl', 'Meta-advertentie', 'klant', 'in_gesprek',
   'Bellen: beslist ze over de overstap?', '2026-09-16',
   'Schilderes. Gebeld, heel enthousiast, wil nadenken. Kopie van de site staat klaar (roelart.wordswap.workers.dev). Prijsidee: €250.'),
  ('Rogier Roding', 'rogier@ovburo.nl', 'ovburo.nl', 'Website (/ai-website)', 'klant', 'nieuw',
   'Controleren of de mail verstuurd is, anders versturen', '2026-09-15',
   'OV-adviesbureau. WordPress met verouderde plugins, score 28, zeer traag. Mail via Microsoft, hosting Vimexx. Wil een update: vragen of het om snelheid of uitstraling gaat.'),
  ('Gerard Groenen', NULL, 'gerardgroenen.nl', 'Meta-advertentie', 'klant', 'wacht_op_reactie',
   'Nabellen als hij niet reageert', '2026-09-17',
   'Burn-out-coach Nuenen. Menu is niet zichtbaar (Elementor), echt probleem. Mail verstuurd 15-09. In gesprek vragen: wie beheert de site nu en wat kost dat? Verschijnen ervaringen vanzelf op de site?'),
  ('Joep van Drunen', NULL, 'joepvandrunen.nl', 'Meta-advertentie', 'partner', 'nieuw',
   'Partnermail versturen', '2026-09-15',
   'Fotograaf en webbouwer in Amsterdam, site op Astro (geen WordPress). Verkoopt zelf websites voor €899. Mogelijke partner, geen klant.'),
  ('Phillip Lutz', 'digitaalMH@gmail.com', 'oktip.nl', 'Meta-advertentie', 'klant', 'wacht_op_reactie',
   'Controleren of de belmail verstuurd is; afspraak om te sparren', NULL,
   'Formulier zei "Johan de Wit". Wil een hybride site (statisch + dynamisch, quiz). Ook suriname.nu. Afgewezen voor standaard overstap, uitgenodigd om te bellen.'),
  ('Erick Wessels', NULL, 'erickpardus.wordpress.com', 'Meta-advertentie', 'klant', 'geen_match',
   NULL, NULL,
   'Kunstenaar en blogger op WordPress.com. Wil reacties en volgers. Eerlijk afgewezen met Jetpack AI-tip en maatwerk-optie. Terugkomen als het blogpakket er is.')
) AS v(naam, email, website, bron, soort, status, volgende_actie, actie_datum, notities)
WHERE NOT EXISTS (SELECT 1 FROM leads);

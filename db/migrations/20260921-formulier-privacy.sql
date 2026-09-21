-- Per site kiezen hoeveel wij van binnenkomende formulierberichten bewaren.
--
-- Nodig voor praktijken met gegevens van hun eigen klanten (zorg, juridisch,
-- financieel): die moeten kunnen uitleggen wie erbij kan. Maar het staat voor
-- iedere klant open.
--
--   normaal        alles zoals het was
--   geen-meelezen  wij bewaren het, maar WordSwap ziet het niet; de klant wel
--   niet-bewaren   alleen doorsturen, de inhoud wordt nergens opgeslagen
alter table sites
  add column if not exists formulier_privacy text not null default 'normaal';

-- Bij 'niet-bewaren' blijft er één leeg regeltje staan: dat er een bericht was,
-- wanneer, en de afdruk van het IP. Zonder die regel telt de spamrem niets meer
-- en wordt het formulier een open doorgeefluik.
alter table formulier_inzendingen
  add column if not exists inhoud_bewaard boolean not null default true;

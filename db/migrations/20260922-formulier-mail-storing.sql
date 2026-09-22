-- Wanneer we voor het laatst gemeld hebben dat een formuliermail niet aankwam.
--
-- Komt de melding naar de site-eigenaar niet aan, dan mist hij een aanvraag
-- en weet hij dat niet eens: het bericht staat wel in zijn portaal, maar daar
-- kijkt niemand dagelijks. Nu krijgt WordSwap een seintje. Eén per etmaal per
-- site, want een kapotte mailroute levert anders een melding bij elk bericht.
alter table sites add column if not exists formulier_mail_fout_op timestamptz;

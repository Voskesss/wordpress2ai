-- De scan levert ook een contactpersoon en een kansinschatting (warm/koud).
-- Die horen bij de prospect zelf, niet verstopt in een notitieveld: je wilt
-- kunnen sorteren op kans en iemand bij naam kunnen aanspreken.
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contactpersoon text;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS kans text;

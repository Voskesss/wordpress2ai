-- Webinartijden werden als Nederlandse kloktijd opgeslagen alsof het UTC was (20:00 → gelezen als 22:00 NL).
-- Eenmalig rechtzetten naar het echte moment. Alleen webinar 2 bestond op 15-09-2026.
-- LET OP: niet twee keer draaien, dan schuift de tijd nog eens.
UPDATE webinars
SET wanneer = (wanneer AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC'
WHERE id = 2 AND wanneer = '2026-09-21 20:00:00';

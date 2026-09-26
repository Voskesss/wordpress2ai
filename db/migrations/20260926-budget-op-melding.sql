-- Wanneer WordSwap gemaild is dat het maandbudget van deze scope op was.
--
-- De klant krijgt bij een vol budget een nette melding met het verzoek even
-- te mailen, maar doet hij dat niet, dan zag Jos het alleen toevallig in de
-- admin. Nu gaat er één mail per scope per maand naar info@wordswap.nl;
-- deze kolom voorkomt dat elke nieuwe poging opnieuw een mail oplevert.
alter table ai_budget_reservations add column if not exists budget_op_gemeld_op timestamptz;

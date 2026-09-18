-- Wanneer het review-/referentieverzoek naar de klant is gemaild
ALTER TABLE sites ADD COLUMN IF NOT EXISTS review_mail_op timestamptz;

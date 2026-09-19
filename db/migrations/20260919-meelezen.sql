-- AVG: klant kan het meelezen-voor-verbetering van zijn chats uitzetten
ALTER TABLE sites ADD COLUMN IF NOT EXISTS meelezen_uit boolean NOT NULL DEFAULT false;

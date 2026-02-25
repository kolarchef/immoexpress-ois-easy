
-- Add new fields to geschaeftspartner
ALTER TABLE public.geschaeftspartner
  ADD COLUMN IF NOT EXISTS geburtsdatum date,
  ADD COLUMN IF NOT EXISTS provisionssatz numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lernerfolg text DEFAULT NULL;

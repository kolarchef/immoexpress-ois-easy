
-- Add toggle columns to geschaeftspartner
ALTER TABLE public.geschaeftspartner
  ADD COLUMN IF NOT EXISTS gesperrt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elearning_zugang boolean NOT NULL DEFAULT false;

-- Update the login-block function to also check gesperrt flag
CREATE OR REPLACE FUNCTION public.check_partner_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.geschaeftspartner
    WHERE user_id = NEW.id AND (status = 'ehemalig' OR gesperrt = true)
  ) THEN
    RAISE EXCEPTION 'Ihr Zugang wurde deaktiviert. Bitte kontaktieren Sie den Administrator.';
  END IF;
  RETURN NEW;
END;
$function$;

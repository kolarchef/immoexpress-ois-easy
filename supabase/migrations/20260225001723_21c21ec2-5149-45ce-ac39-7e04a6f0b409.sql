
-- Create geschaeftspartner table for team management
CREATE TABLE public.geschaeftspartner (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'makler' CHECK (status IN ('makler', 'trainee', 'ehemalig')),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leave_date DATE,
  notiz TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.geschaeftspartner ENABLE ROW LEVEL SECURITY;

-- Only admins can manage partners
CREATE POLICY "Admins can view all partners"
ON public.geschaeftspartner FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert partners"
ON public.geschaeftspartner FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partners"
ON public.geschaeftspartner FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partners"
ON public.geschaeftspartner FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_geschaeftspartner_updated_at
BEFORE UPDATE ON public.geschaeftspartner
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to block login for "ehemalige" partners
CREATE OR REPLACE FUNCTION public.check_partner_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the signing-in user is marked as "ehemalig"
  IF EXISTS (
    SELECT 1 FROM public.geschaeftspartner
    WHERE user_id = NEW.id AND status = 'ehemalig'
  ) THEN
    RAISE EXCEPTION 'Ihr Zugang wurde deaktiviert. Bitte kontaktieren Sie den Administrator.';
  END IF;
  RETURN NEW;
END;
$$;

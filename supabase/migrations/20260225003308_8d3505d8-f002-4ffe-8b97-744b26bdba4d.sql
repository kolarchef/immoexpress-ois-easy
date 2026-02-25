
-- Bestellungen table for tracking orders per GP
CREATE TABLE public.bestellungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  produkt text NOT NULL,
  menge integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'bestellt', 'abgeschlossen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  bestellt_am timestamptz,
  abgeschlossen_am timestamptz
);

ALTER TABLE public.bestellungen ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own bestellungen"
ON public.bestellungen FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can insert own bestellungen"
ON public.bestellungen FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all bestellungen"
ON public.bestellungen FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all orders (status changes)
CREATE POLICY "Admins can update all bestellungen"
ON public.bestellungen FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete orders
CREATE POLICY "Admins can delete bestellungen"
ON public.bestellungen FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_bestellungen_updated_at
BEFORE UPDATE ON public.bestellungen
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

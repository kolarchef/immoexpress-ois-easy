
-- Add finance_status column to crm_kunden
-- Values: 'offen' (default), 'uebertragen' (blue), 'nachfordern' (yellow), 'abgeschlossen' (green), 'storniert' (red)
ALTER TABLE public.crm_kunden ADD COLUMN IF NOT EXISTS finance_status text DEFAULT 'offen';
ALTER TABLE public.crm_kunden ADD COLUMN IF NOT EXISTS ablehnungsgrund_bank text;

-- Set existing finance_shared=true customers to 'uebertragen'
UPDATE public.crm_kunden SET finance_status = 'uebertragen' WHERE finance_shared = true AND (finance_status IS NULL OR finance_status = 'offen');

-- Allow admins to read crm_kunden (for Tresor module)
CREATE POLICY "Admins can view all kunden"
ON public.crm_kunden
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update crm_kunden (for status changes)
CREATE POLICY "Admins can update all kunden"
ON public.crm_kunden
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read crm_dokumente (for backflow visibility)
CREATE POLICY "Admins can view all dokumente"
ON public.crm_dokumente
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert crm_dokumente (for backflow from tresor)
CREATE POLICY "Admins can insert dokumente"
ON public.crm_dokumente
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- Add kunde_id to unterlagen_anfragen so we can link uploads back to Finanz-Tresor
ALTER TABLE public.unterlagen_anfragen 
ADD COLUMN IF NOT EXISTS kunde_id uuid REFERENCES public.crm_kunden(id);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_unterlagen_anfragen_kunde_id ON public.unterlagen_anfragen(kunde_id);

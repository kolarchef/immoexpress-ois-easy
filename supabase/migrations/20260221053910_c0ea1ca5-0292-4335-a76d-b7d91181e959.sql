
-- Add objekt_id to crm_kunden for linking customers to properties
ALTER TABLE public.crm_kunden ADD COLUMN objekt_id uuid REFERENCES public.objekte(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_crm_kunden_objekt_id ON public.crm_kunden(objekt_id);


ALTER TABLE public.geschaeftspartner
ADD COLUMN IF NOT EXISTS gp_number text UNIQUE;

CREATE INDEX idx_geschaeftspartner_gp_number ON public.geschaeftspartner(gp_number);


CREATE TABLE public.crm_dokumente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kunde_id UUID NOT NULL REFERENCES public.crm_kunden(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  dateiname TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_dokumente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dokumente" ON public.crm_dokumente
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dokumente" ON public.crm_dokumente
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dokumente" ON public.crm_dokumente
  FOR DELETE USING (auth.uid() = user_id);

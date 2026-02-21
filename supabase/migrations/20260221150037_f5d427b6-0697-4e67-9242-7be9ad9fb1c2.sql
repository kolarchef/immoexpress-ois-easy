
-- Historie-Tabelle für Objekt-Änderungen
CREATE TABLE public.objekt_historie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objekt_id UUID NOT NULL REFERENCES public.objekte(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feld TEXT NOT NULL,
  alter_wert TEXT,
  neuer_wert TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.objekt_historie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own historie" ON public.objekt_historie FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own historie" ON public.objekt_historie FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_objekt_historie_objekt_id ON public.objekt_historie(objekt_id);
CREATE INDEX idx_objekt_historie_created_at ON public.objekt_historie(created_at DESC);

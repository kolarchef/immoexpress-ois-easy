
-- Create statistics tracking table for video/exposé interactions
CREATE TABLE public.objekt_statistiken (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objekt_id UUID NOT NULL REFERENCES public.objekte(id) ON DELETE CASCADE,
  kunde_id UUID REFERENCES public.crm_kunden(id) ON DELETE SET NULL,
  kunde_name TEXT,
  typ TEXT NOT NULL DEFAULT 'expose', -- 'expose', 'video', 'link'
  kanal TEXT, -- 'whatsapp', 'email', 'direkt'
  aufrufe INTEGER NOT NULL DEFAULT 1,
  letzter_aufruf TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID
);

-- Enable RLS
ALTER TABLE public.objekt_statistiken ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statistiken"
ON public.objekt_statistiken FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistiken"
ON public.objekt_statistiken FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statistiken"
ON public.objekt_statistiken FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statistiken"
ON public.objekt_statistiken FOR DELETE
USING (auth.uid() = user_id);

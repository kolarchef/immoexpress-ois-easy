
-- 1. Termine-Tabelle für Kalender
CREATE TABLE public.termine (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titel TEXT NOT NULL,
  datum DATE NOT NULL,
  uhrzeit TIME NOT NULL DEFAULT '09:00',
  dauer_min INTEGER NOT NULL DEFAULT 60,
  ort TEXT,
  typ TEXT DEFAULT 'sonstig',
  wichtig BOOLEAN DEFAULT false,
  notiz TEXT,
  kunde_id UUID REFERENCES public.crm_kunden(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.termine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own termine" ON public.termine FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own termine" ON public.termine FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own termine" ON public.termine FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own termine" ON public.termine FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_termine_updated_at BEFORE UPDATE ON public.termine
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. user_id zu crm_kunden hinzufügen
ALTER TABLE public.crm_kunden ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. user_id zu objekte hinzufügen
ALTER TABLE public.objekte ADD COLUMN IF NOT EXISTS user_id UUID;

-- 4. Alte Demo-Policies entfernen und durch user-basierte ersetzen
-- crm_kunden
DROP POLICY IF EXISTS "Allow all for anon (demo)" ON public.crm_kunden;
CREATE POLICY "Users can view own kunden" ON public.crm_kunden FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kunden" ON public.crm_kunden FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kunden" ON public.crm_kunden FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kunden" ON public.crm_kunden FOR DELETE USING (auth.uid() = user_id);

-- objekte
DROP POLICY IF EXISTS "Allow all for anon (demo)" ON public.objekte;
CREATE POLICY "Users can view own objekte" ON public.objekte FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own objekte" ON public.objekte FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own objekte" ON public.objekte FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own objekte" ON public.objekte FOR DELETE USING (auth.uid() = user_id);

-- 5. INSERT-Policy für nachrichten (fehlte)
CREATE POLICY "Users can insert own nachrichten" ON public.nachrichten FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. empfaenger_id zu nachrichten für Makler-zu-Makler
ALTER TABLE public.nachrichten ADD COLUMN IF NOT EXISTS empfaenger_id UUID;

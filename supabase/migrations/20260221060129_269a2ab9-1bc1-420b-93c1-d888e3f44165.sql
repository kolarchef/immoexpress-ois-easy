
-- Neue Felder für erweiterte Objekterfassung
ALTER TABLE public.objekte 
  ADD COLUMN IF NOT EXISTS top text,
  ADD COLUMN IF NOT EXISTS stock text,
  ADD COLUMN IF NOT EXISTS kaeufer_provision numeric,
  ADD COLUMN IF NOT EXISTS verkaeufer_provision numeric,
  ADD COLUMN IF NOT EXISTS interne_notizen text;

-- Storage Bucket für Objekt-Fotos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('objekt-fotos', 'objekt-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies für Objekt-Fotos
CREATE POLICY "Authenticated users can upload objekt fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'objekt-fotos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own objekt fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'objekt-fotos' AND auth.role() = 'authenticated');

CREATE POLICY "Objekt fotos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'objekt-fotos');

CREATE POLICY "Authenticated users can delete objekt fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'objekt-fotos' AND auth.role() = 'authenticated');

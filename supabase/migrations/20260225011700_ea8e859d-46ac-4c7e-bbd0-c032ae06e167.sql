
-- Storage bucket for GP Werbemittel
INSERT INTO storage.buckets (id, name, public) VALUES ('gp-werbemittel', 'gp-werbemittel', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload
CREATE POLICY "Admins can upload gp-werbemittel"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gp-werbemittel' AND public.has_role(auth.uid(), 'admin'));

-- Admins can view
CREATE POLICY "Admins can view gp-werbemittel"
ON storage.objects FOR SELECT
USING (bucket_id = 'gp-werbemittel' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete gp-werbemittel"
ON storage.objects FOR DELETE
USING (bucket_id = 'gp-werbemittel' AND public.has_role(auth.uid(), 'admin'));

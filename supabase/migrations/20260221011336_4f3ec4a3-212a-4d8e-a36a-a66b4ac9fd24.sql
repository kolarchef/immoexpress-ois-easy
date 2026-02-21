
-- Create storage bucket for customer document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('kundenunterlagen', 'kundenunterlagen', true);

-- Allow anyone with link to upload
CREATE POLICY "Anyone can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kundenunterlagen');
CREATE POLICY "Anyone can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'kundenunterlagen');

-- Table for document request links
CREATE TABLE public.unterlagen_anfragen (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kunde_name text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  checkliste jsonb NOT NULL DEFAULT '[]'::jsonb,
  erstellt_am timestamp with time zone NOT NULL DEFAULT now(),
  abgeschlossen boolean DEFAULT false
);

ALTER TABLE public.unterlagen_anfragen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon (demo)" ON public.unterlagen_anfragen FOR ALL USING (true) WITH CHECK (true);

-- Table for uploaded documents
CREATE TABLE public.unterlagen_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anfrage_id uuid REFERENCES public.unterlagen_anfragen(id) ON DELETE CASCADE,
  dokument_typ text NOT NULL,
  dateiname text,
  storage_path text,
  erstellt_am timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.unterlagen_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon (demo)" ON public.unterlagen_uploads FOR ALL USING (true) WITH CHECK (true);

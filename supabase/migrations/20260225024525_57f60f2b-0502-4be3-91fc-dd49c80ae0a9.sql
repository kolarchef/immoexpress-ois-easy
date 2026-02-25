
-- Meetings table (admin creates these)
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  datum DATE NOT NULL,
  uhrzeit TIME NOT NULL DEFAULT '10:00',
  zielgruppe TEXT NOT NULL DEFAULT 'alle', -- 'alle', 'makler', 'trainees'
  beschreibung TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage meetings"
  ON public.meetings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view meetings matching their role
CREATE POLICY "Users can view relevant meetings"
  ON public.meetings FOR SELECT
  USING (
    zielgruppe = 'alle'
    OR (zielgruppe = 'makler' AND EXISTS (
      SELECT 1 FROM public.geschaeftspartner WHERE user_id = auth.uid() AND status = 'makler'
    ))
    OR (zielgruppe = 'trainees' AND EXISTS (
      SELECT 1 FROM public.geschaeftspartner WHERE user_id = auth.uid() AND status = 'trainee'
    ))
  );

-- Meeting files
CREATE TABLE public.meeting_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  dateiname TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meeting files"
  ON public.meeting_files FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view meeting files"
  ON public.meeting_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m WHERE m.id = meeting_id
    )
  );

-- Meeting responses (teilnahme)
CREATE TABLE public.meeting_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'teilnehmen', -- 'teilnehmen', 'vielleicht', 'absage'
  notiz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own responses"
  ON public.meeting_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all responses"
  ON public.meeting_responses FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_responses_updated_at
  BEFORE UPDATE ON public.meeting_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for meeting files
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-files', 'meeting-files', false);

CREATE POLICY "Admins can upload meeting files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meeting-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete meeting files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'meeting-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view meeting files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meeting-files' AND auth.role() = 'authenticated');


-- Create aufgaben table for task assignment from meetings
CREATE TABLE public.aufgaben (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titel text NOT NULL,
  beschreibung text,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  erstellt_von uuid NOT NULL,
  zugewiesen_an uuid NOT NULL,
  gp_nummer text,
  status text NOT NULL DEFAULT 'offen',
  prioritaet text NOT NULL DEFAULT 'normal',
  faellig_am date,
  erledigt_am timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.aufgaben ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all aufgaben"
  ON public.aufgaben FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can view tasks assigned to them
CREATE POLICY "Users can view own aufgaben"
  ON public.aufgaben FOR SELECT
  USING (auth.uid() = zugewiesen_an);

-- Users can update their own tasks (mark done etc)
CREATE POLICY "Users can update own aufgaben"
  ON public.aufgaben FOR UPDATE
  USING (auth.uid() = zugewiesen_an);

-- Trigger for updated_at
CREATE TRIGGER update_aufgaben_updated_at
  BEFORE UPDATE ON public.aufgaben
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

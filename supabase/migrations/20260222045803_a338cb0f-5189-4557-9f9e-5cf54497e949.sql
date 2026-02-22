
-- Table for storing floorplan annotations (walls, rooms) per object
CREATE TABLE public.bauplan_annotationen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objekt_id UUID REFERENCES public.objekte(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT,
  walls JSONB NOT NULL DEFAULT '[]'::jsonb,
  rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bauplan_annotationen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own annotations" ON public.bauplan_annotationen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own annotations" ON public.bauplan_annotationen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own annotations" ON public.bauplan_annotationen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own annotations" ON public.bauplan_annotationen FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bauplan_annotationen_updated_at
  BEFORE UPDATE ON public.bauplan_annotationen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

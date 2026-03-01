
-- Table to store shared legal advice for external viewing
CREATE TABLE public.shared_advice (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bundesland text NOT NULL,
  frage text NOT NULL,
  antwort text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days')
);

ALTER TABLE public.shared_advice ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own
CREATE POLICY "Users can insert own shared_advice"
ON public.shared_advice FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can view their own
CREATE POLICY "Users can view own shared_advice"
ON public.shared_advice FOR SELECT
USING (auth.uid() = user_id);

-- Anonymous users can view any (for external /view-advice link)
CREATE POLICY "Anon can view shared_advice by id"
ON public.shared_advice FOR SELECT
TO anon
USING (true);

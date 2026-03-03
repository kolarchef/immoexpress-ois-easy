
-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  user_name text,
  user_ip text,
  bundesland text,
  ai_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can insert own rows
CREATE POLICY "Users can insert own audit_log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own rows
CREATE POLICY "Users can view own audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own rows (for realtime updates from Make)
CREATE POLICY "Users can update own audit_log"
  ON public.audit_log FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow service role / anon to update ai_response (Make.com will call via REST API)
CREATE POLICY "Anon can update ai_response"
  ON public.audit_log FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;

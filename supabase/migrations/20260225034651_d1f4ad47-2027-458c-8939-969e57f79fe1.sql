
-- Audit log for legal consent (internal staff)
CREATE TABLE public.audit_legal_consent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  gp_id uuid,
  gp_nummer text,
  modul text NOT NULL DEFAULT 'SOS Recht',
  confirmation_status text NOT NULL DEFAULT 'accepted',
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_legal_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all consent logs"
ON public.audit_legal_consent FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own consent"
ON public.audit_legal_consent FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own consent"
ON public.audit_legal_consent FOR SELECT
USING (auth.uid() = user_id);

-- Customer consent log for external disclaimer
CREATE TABLE public.customer_consent_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL,
  ip_address text,
  accepted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customer consents"
ON public.customer_consent_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can insert customer consent"
ON public.customer_consent_log FOR INSERT
WITH CHECK (true);

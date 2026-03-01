
-- Add seen-tracking column to audit_legal_consent
-- Stores array of user_ids who have opened/seen this entry
ALTER TABLE public.audit_legal_consent 
ADD COLUMN IF NOT EXISTS gesehen_von uuid[] DEFAULT '{}';

-- Add retention policy marker (7 years = 2557 days)
-- We use a comment to document the retention requirement
COMMENT ON TABLE public.audit_legal_consent IS 'Legal consent audit log. Retention: 7 years minimum per Austrian compliance requirements.';

-- Allow admins to update the gesehen_von field
CREATE POLICY "Admins can update consent gesehen" 
ON public.audit_legal_consent 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow makler to update gesehen_von on their own entries
CREATE POLICY "Users can update own consent gesehen" 
ON public.audit_legal_consent 
FOR UPDATE 
USING (auth.uid() = user_id);

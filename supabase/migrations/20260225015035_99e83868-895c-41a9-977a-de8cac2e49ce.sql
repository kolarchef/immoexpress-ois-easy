
-- Add gp_id column to objekte table for GP assignment
ALTER TABLE public.objekte
ADD COLUMN gp_id uuid REFERENCES public.geschaeftspartner(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_objekte_gp_id ON public.objekte(gp_id);

-- Allow admins to view all objekte (needed for assignment management)
CREATE POLICY "Admins can view all objekte"
ON public.objekte
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all objekte (needed for GP assignment)
CREATE POLICY "Admins can update all objekte"
ON public.objekte
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

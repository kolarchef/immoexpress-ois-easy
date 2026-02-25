
-- Allow admins to insert nachrichten for any user (for notification sending)
CREATE POLICY "Admins can insert nachrichten"
ON public.nachrichten FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow users to view nachrichten addressed to them
CREATE POLICY "Users can view received nachrichten"
ON public.nachrichten FOR SELECT
USING (auth.uid() = empfaenger_id);

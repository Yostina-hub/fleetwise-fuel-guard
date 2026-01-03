-- Add UPDATE policy for governor_command_logs to allow acknowledgement
CREATE POLICY "Users can update command logs in their org"
ON public.governor_command_logs
FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));
-- Add DELETE policy for governor_command_logs
CREATE POLICY "Users can delete command logs in their organization"
ON public.governor_command_logs
FOR DELETE
USING (organization_id = get_user_organization(auth.uid()) AND 
       (has_role(auth.uid(), 'super_admin'::app_role) OR 
        has_role(auth.uid(), 'operations_manager'::app_role)));
-- Register Maintenance Request in the centralized Forms module.
-- Reuses created_by from the org's existing create_work_request row, falling
-- back to the first super_admin in the org.
INSERT INTO public.forms (organization_id, key, name, description, category, is_default, created_by)
SELECT
  o.id,
  'maintenance_request',
  'Maintenance Request',
  'Driver/Operator-facing maintenance intake form. Backed by the Oracle EBS-style Work Request dialog.',
  'maintenance',
  true,
  COALESCE(
    (SELECT created_by FROM public.forms WHERE organization_id = o.id AND key = 'create_work_request' LIMIT 1),
    (SELECT ur.user_id FROM public.user_roles ur WHERE ur.organization_id = o.id ORDER BY ur.created_at ASC LIMIT 1)
  )
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.forms f
  WHERE f.organization_id = o.id AND f.key = 'maintenance_request'
)
AND COALESCE(
  (SELECT created_by FROM public.forms WHERE organization_id = o.id AND key = 'create_work_request' LIMIT 1),
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.organization_id = o.id ORDER BY ur.created_at ASC LIMIT 1)
) IS NOT NULL;
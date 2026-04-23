-- 1) Add the new permission
INSERT INTO public.permissions (name, description, resource, action)
VALUES (
  'vehicle_requests.bypass_rating_gate',
  'Submit new vehicle requests without first rating prior completed trips',
  'vehicle_requests',
  'bypass_rating_gate'
)
ON CONFLICT (name) DO NOTHING;

-- 2) Grant it to administrative roles so they aren't gated
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.role::app_role, p.id
FROM (VALUES ('super_admin'), ('org_admin'), ('fleet_manager')) AS r(role)
CROSS JOIN public.permissions p
WHERE p.name = 'vehicle_requests.bypass_rating_gate'
ON CONFLICT (role, permission_id) DO NOTHING;
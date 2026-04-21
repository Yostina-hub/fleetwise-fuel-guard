
-- 1. Seed full verb set for high-traffic resources
WITH desired(resource, action, description) AS (
  VALUES
    -- dashboard
    ('dashboard','create','Create dashboard widgets'),
    ('dashboard','edit','Edit dashboard widgets'),
    ('dashboard','delete','Delete dashboard widgets'),
    -- devices
    ('devices','read','View devices'),
    ('devices','create','Register devices'),
    ('devices','edit','Edit devices'),
    ('devices','delete','Delete devices'),
    ('devices','export','Export device list'),
    -- map
    ('map','export','Export map data'),
    -- roles
    ('roles','read','View roles & permissions'),
    ('roles','create','Create custom roles'),
    ('roles','edit','Edit role permissions'),
    ('roles','delete','Delete custom roles'),
    -- settings
    ('settings','read','View organization settings'),
    ('settings','edit','Edit organization settings'),
    ('settings','export','Export configuration'),
    -- fleet (add update alias)
    ('fleet','update','Update vehicle records'),
    -- drivers
    ('drivers','update','Update driver records'),
    -- fuel
    ('fuel','update','Update fuel records'),
    -- fuel_requests
    ('fuel_requests','update','Update fuel request'),
    ('fuel_requests','assign','Assign fuel request approver'),
    -- vehicle_requests
    ('vehicle_requests','update','Update vehicle request'),
    -- trips
    ('trips','update','Update trip'),
    -- maintenance
    ('maintenance','update','Update maintenance record'),
    -- alerts
    ('alerts','update','Update alert'),
    ('alerts','assign','Assign alert owner'),
    -- reports
    ('reports','update','Update report'),
    ('reports','approve','Approve report'),
    -- users
    ('users','update','Update user record')
)
INSERT INTO public.permissions (name, description, resource, action)
SELECT
  d.resource || '.' || d.action,
  d.description,
  d.resource,
  d.action
FROM desired d
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.resource = d.resource AND p.action = d.action
);

-- 2. Grant every permission to super_admin and org_admin (idempotent)
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.role::app_role, p.id
FROM public.permissions p
CROSS JOIN (VALUES ('super_admin'), ('org_admin')) AS r(role)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 3. Grant read + export of dashboards / reports to auditor
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor'::app_role, p.id
FROM public.permissions p
WHERE p.resource IN ('dashboard','reports','fleet','drivers','fuel','fuel_requests','vehicle_requests','trips','maintenance','alerts','users','devices','settings','roles')
  AND p.action IN ('read','export')
ON CONFLICT (role, permission_id) DO NOTHING;

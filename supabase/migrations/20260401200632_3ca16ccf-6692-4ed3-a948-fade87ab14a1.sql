UPDATE public.profiles SET organization_id = '4bffdf8a-fd4d-4ff7-b083-04fea2c721b4' WHERE id = 'd35882be-e78f-42ae-b6c2-1519f6c87fe8';

INSERT INTO public.user_roles (user_id, role, organization_id)
VALUES ('d35882be-e78f-42ae-b6c2-1519f6c87fe8', 'super_admin', '4bffdf8a-fd4d-4ff7-b083-04fea2c721b4')
ON CONFLICT (user_id, role, organization_id) DO NOTHING;
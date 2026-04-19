-- 1) Extend app_role enum with the two missing roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'transport_authority';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'insurance_admin';
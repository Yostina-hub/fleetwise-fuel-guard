-- Add finance_manager (and the other workflow-referenced roles) to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sourcing_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintenance_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintenance_supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inspection_center';
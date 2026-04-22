ALTER TABLE public.organization_settings 
  ADD COLUMN IF NOT EXISTS default_map_style text NOT NULL DEFAULT 'streets';
-- Add mapbox_token column to organization_settings for map configuration
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS mapbox_token TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.organization_settings.mapbox_token IS 'Mapbox public access token for map display';
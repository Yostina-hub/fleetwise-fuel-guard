-- Add VAPID and push notification columns to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS vapid_public_key TEXT,
ADD COLUMN IF NOT EXISTS vapid_private_key TEXT,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false;
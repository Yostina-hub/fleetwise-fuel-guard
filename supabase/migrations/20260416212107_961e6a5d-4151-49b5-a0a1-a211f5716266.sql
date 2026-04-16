
ALTER TABLE public.fuel_requests
  ADD COLUMN IF NOT EXISTS assigned_department text,
  ADD COLUMN IF NOT EXISTS request_by_start_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS request_by_completion_date timestamptz,
  ADD COLUMN IF NOT EXISTS requested_for text,
  ADD COLUMN IF NOT EXISTS work_request_type text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notify_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_preference text,
  ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

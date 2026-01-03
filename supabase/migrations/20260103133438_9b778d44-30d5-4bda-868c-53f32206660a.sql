-- Add phone_number and sms_content columns to governor_command_logs
ALTER TABLE public.governor_command_logs 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS sms_content TEXT;
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS requester_rating_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organization_settings.requester_rating_required IS
'When true, requesters must submit a rating to close out a completed vehicle request. When false, rating is optional and can be skipped.';
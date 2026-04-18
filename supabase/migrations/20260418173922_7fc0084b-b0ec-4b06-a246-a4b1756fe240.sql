ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.form_intent(form_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(form_key, '(_copy(_[0-9]+)?|_v[0-9]+)$', '');
$$;

CREATE UNIQUE INDEX IF NOT EXISTS forms_one_default_per_intent
  ON public.forms (organization_id, public.form_intent(key))
  WHERE is_default = true AND is_archived = false;

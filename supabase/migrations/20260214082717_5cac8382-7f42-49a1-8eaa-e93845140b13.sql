-- Allow notification_preferences.organization_id to be nullable
-- so the trigger doesn't fail when creating users without an org yet
ALTER TABLE public.notification_preferences ALTER COLUMN organization_id DROP NOT NULL;

-- Also update the trigger to be more defensive
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notification_preferences (user_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT (user_id) DO UPDATE SET organization_id = COALESCE(EXCLUDED.organization_id, notification_preferences.organization_id);
  RETURN NEW;
END;
$function$;
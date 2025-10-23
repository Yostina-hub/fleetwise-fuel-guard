-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '{
    "trip_request_submitted": true,
    "trip_request_approved": true,
    "trip_request_rejected": true,
    "approval_required": true,
    "trip_assigned": true,
    "trip_starting_soon": true,
    "trip_completed": true,
    "vehicle_recommended": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
ON public.notification_preferences FOR ALL
USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Create function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new profiles
CREATE TRIGGER create_notification_preferences_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_preferences();

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  _org_id UUID;
  _notification_id UUID;
BEGIN
  -- Get user's organization
  _org_id := get_user_organization(_user_id);
  
  IF _org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insert notification
  INSERT INTO public.notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    link,
    metadata
  ) VALUES (
    _org_id,
    _user_id,
    _type,
    _title,
    _message,
    _link,
    _metadata
  ) RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
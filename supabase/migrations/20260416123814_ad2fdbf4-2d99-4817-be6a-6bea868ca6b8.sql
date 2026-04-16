
-- Course materials table for diverse file types
CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.driver_training_courses(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document',
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view course materials in their org"
  ON public.course_materials FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can insert course materials in their org"
  ON public.course_materials FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can delete course materials in their org"
  ON public.course_materials FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- Storage bucket for training materials
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('training-materials', 'training-materials', true, 104857600)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload training materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-materials');

CREATE POLICY "Anyone can view training materials"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'training-materials');

CREATE POLICY "Authenticated users can delete training materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'training-materials');

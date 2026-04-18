-- =====================================================================
-- FORMS MANAGEMENT SYSTEM — Phase 1
-- =====================================================================

-- ---------- 1. TABLES -------------------------------------------------

CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  current_published_version_id UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forms_organization_id ON public.forms(organization_id);
CREATE INDEX idx_forms_category ON public.forms(organization_id, category) WHERE is_archived = false;
CREATE UNIQUE INDEX uq_forms_org_key_active
  ON public.forms(organization_id, key)
  WHERE is_archived = false;

CREATE TABLE public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  schema JSONB NOT NULL DEFAULT '{"version": 1, "fields": []}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_versions_form_id ON public.form_versions(form_id);
CREATE INDEX idx_form_versions_organization_id ON public.form_versions(organization_id);
CREATE INDEX idx_form_versions_status ON public.form_versions(form_id, status);
CREATE UNIQUE INDEX uq_form_versions_one_draft
  ON public.form_versions(form_id)
  WHERE status = 'draft';
CREATE UNIQUE INDEX uq_form_versions_form_version
  ON public.form_versions(form_id, version_number);

ALTER TABLE public.forms
  ADD CONSTRAINT forms_current_published_version_fk
  FOREIGN KEY (current_published_version_id) REFERENCES public.form_versions(id) ON DELETE SET NULL;

CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_version_id UUID NOT NULL REFERENCES public.form_versions(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  workflow_instance_id UUID,
  workflow_task_id UUID,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_organization_id ON public.form_submissions(organization_id);
CREATE INDEX idx_form_submissions_submitted_by ON public.form_submissions(submitted_by);
CREATE INDEX idx_form_submissions_workflow_instance ON public.form_submissions(workflow_instance_id) WHERE workflow_instance_id IS NOT NULL;
CREATE INDEX idx_form_submissions_workflow_task ON public.form_submissions(workflow_task_id) WHERE workflow_task_id IS NOT NULL;

-- ---------- 2. ENABLE RLS --------------------------------------------

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- ---------- 3. HELPER ------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_forms(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::app_role)
    OR public.has_role(_user_id, 'fleet_manager'::app_role)
    OR public.has_role(_user_id, 'operations_manager'::app_role)
$$;

REVOKE ALL ON FUNCTION public.can_manage_forms(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_forms(UUID) TO authenticated;

-- ---------- 4. RLS POLICIES — forms ----------------------------------

CREATE POLICY "forms_select_org_members"
ON public.forms
FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "forms_insert_managers"
ON public.forms
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "forms_update_managers"
ON public.forms
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
)
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
);

CREATE POLICY "forms_delete_managers"
ON public.forms
FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
);

-- ---------- 5. RLS POLICIES — form_versions -------------------------

CREATE POLICY "form_versions_select_org_members"
ON public.form_versions
FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "form_versions_insert_managers"
ON public.form_versions
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "form_versions_update_managers"
ON public.form_versions
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
)
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
);

CREATE POLICY "form_versions_delete_managers"
ON public.form_versions
FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
);

-- ---------- 6. RLS POLICIES — form_submissions ----------------------

CREATE POLICY "form_submissions_select_own_or_managers"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND (submitted_by = auth.uid() OR public.can_manage_forms(auth.uid()))
);

CREATE POLICY "form_submissions_insert_org_members"
ON public.form_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND submitted_by = auth.uid()
);

CREATE POLICY "form_submissions_update_own_or_managers"
ON public.form_submissions
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND (submitted_by = auth.uid() OR public.can_manage_forms(auth.uid()))
)
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "form_submissions_delete_managers"
ON public.form_submissions
FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.can_manage_forms(auth.uid())
);

-- ---------- 7. TRIGGERS -----------------------------------------------

CREATE TRIGGER trg_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_form_versions_updated_at
BEFORE UPDATE ON public.form_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_form_submissions_updated_at
BEFORE UPDATE ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment version_number per form
CREATE OR REPLACE FUNCTION public.set_form_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.version_number IS NULL OR NEW.version_number = 0 THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
      INTO NEW.version_number
      FROM public.form_versions
     WHERE form_id = NEW.form_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_form_versions_set_version_number
BEFORE INSERT ON public.form_versions
FOR EACH ROW EXECUTE FUNCTION public.set_form_version_number();

-- Publish handler: stamps + updates pointer + audits
CREATE OR REPLACE FUNCTION public.handle_form_version_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published')
     OR (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
    NEW.published_by := COALESCE(NEW.published_by, auth.uid());

    UPDATE public.forms
       SET current_published_version_id = NEW.id,
           updated_at = now()
     WHERE id = NEW.form_id;

    BEGIN
      INSERT INTO public.delegation_audit_log
        (organization_id, source_table, source_id, action, actor_id, summary, scope, new_values)
      VALUES
        (NEW.organization_id, 'form_versions', NEW.id, 'publish', auth.uid(),
         format('Published version %s of form %s', NEW.version_number, NEW.form_id),
         'forms',
         jsonb_build_object('form_id', NEW.form_id, 'version_number', NEW.version_number));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_form_versions_publish
BEFORE INSERT OR UPDATE ON public.form_versions
FOR EACH ROW EXECUTE FUNCTION public.handle_form_version_publish();

-- Audit form archival
CREATE OR REPLACE FUNCTION public.handle_form_archive_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_archived = false AND NEW.is_archived = true THEN
    NEW.archived_at := COALESCE(NEW.archived_at, now());
    BEGIN
      INSERT INTO public.delegation_audit_log
        (organization_id, source_table, source_id, action, actor_id, summary, scope)
      VALUES
        (NEW.organization_id, 'forms', NEW.id, 'archive', auth.uid(),
         format('Archived form "%s"', NEW.name), 'forms');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forms_archive_audit
BEFORE UPDATE ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.handle_form_archive_audit();
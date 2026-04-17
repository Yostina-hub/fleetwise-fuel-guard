
-- ============================================
-- DELEGATION AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.delegation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  source_table TEXT NOT NULL CHECK (source_table IN ('authority_matrix', 'delegation_matrix')),
  source_id UUID,
  
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate')),
  
  entity_name TEXT,         -- rule name OR "delegator → delegate"
  scope TEXT,               -- vehicle_request / fuel_request / etc.
  summary TEXT,             -- human-readable summary
  
  old_values JSONB,
  new_values JSONB,
  
  actor_id UUID,
  actor_name TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delegation_audit_org_created 
  ON public.delegation_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delegation_audit_source 
  ON public.delegation_audit_log(source_table, source_id);

ALTER TABLE public.delegation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view delegation_audit_log"
ON public.delegation_audit_log FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- No INSERT/UPDATE/DELETE policies for users — only triggers (SECURITY DEFINER) write to it

-- ============================================
-- HELPER: get actor name
-- ============================================

CREATE OR REPLACE FUNCTION public.get_actor_name()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT COALESCE(full_name, email, 'System') INTO v_name
  FROM profiles WHERE id = auth.uid();
  RETURN COALESCE(v_name, 'System');
END;
$$;

-- ============================================
-- TRIGGER: authority_matrix audit
-- ============================================

CREATE OR REPLACE FUNCTION public.trg_audit_authority_matrix()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_summary TEXT;
  v_actor_id UUID := auth.uid();
  v_actor_name TEXT := get_actor_name();
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_summary := format('Created rule "%s" — %s approves %s', NEW.rule_name, NEW.approver_role, NEW.scope);
    INSERT INTO delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, new_values, actor_id, actor_name)
    VALUES (NEW.organization_id, 'authority_matrix', NEW.id, v_action, NEW.rule_name, NEW.scope, v_summary, to_jsonb(NEW), v_actor_id, v_actor_name);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect activate/deactivate vs general update
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      v_action := CASE WHEN NEW.is_active THEN 'activate' ELSE 'deactivate' END;
      v_summary := format('%s rule "%s"', CASE WHEN NEW.is_active THEN 'Activated' ELSE 'Deactivated' END, NEW.rule_name);
    ELSE
      v_action := 'update';
      v_summary := format('Updated rule "%s"', NEW.rule_name);
    END IF;
    INSERT INTO delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, old_values, new_values, actor_id, actor_name)
    VALUES (NEW.organization_id, 'authority_matrix', NEW.id, v_action, NEW.rule_name, NEW.scope, v_summary, to_jsonb(OLD), to_jsonb(NEW), v_actor_id, v_actor_name);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_summary := format('Deleted rule "%s"', OLD.rule_name);
    INSERT INTO delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, old_values, actor_id, actor_name)
    VALUES (OLD.organization_id, 'authority_matrix', OLD.id, v_action, OLD.rule_name, OLD.scope, v_summary, to_jsonb(OLD), v_actor_id, v_actor_name);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_authority_matrix_iud ON public.authority_matrix;
CREATE TRIGGER trg_audit_authority_matrix_iud
AFTER INSERT OR UPDATE OR DELETE ON public.authority_matrix
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_authority_matrix();

-- ============================================
-- TRIGGER: delegation_matrix (substitutions) audit
-- ============================================

CREATE OR REPLACE FUNCTION public.trg_audit_delegation_matrix()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_summary TEXT;
  v_entity TEXT;
  v_actor_id UUID := auth.uid();
  v_actor_name TEXT := get_actor_name();
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity := format('%s → %s', NEW.delegator_name, NEW.delegate_name);
    v_summary := format('Substitution created: %s (scope: %s)', v_entity, COALESCE(NEW.scope, 'all'));
    INSERT INTO delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, new_values, actor_id, actor_name)
    VALUES (NEW.organization_id, 'delegation_matrix', NEW.id, v_action, v_entity, NEW.scope, v_summary, to_jsonb(NEW), v_actor_id, v_actor_name);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_entity := format('%s → %s', NEW.delegator_name, NEW.delegate_name);
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      v_action := CASE WHEN NEW.is_active THEN 'activate' ELSE 'deactivate' END;
      v_summary := format('%s substitution: %s', CASE WHEN NEW.is_active THEN 'Activated' ELSE 'Deactivated' END, v_entity);
    ELSE
      v_action := 'update';
      v_summary := format('Updated substitution: %s', v_entity);
    END IF;
    INSERT INTO delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, old_values, new_values, actor_id, actor_name)
    VALUES (NEW.organization_id, 'delegation_matrix', NEW.id, v_action, v_entity, NEW.scope, v_summary, to_jsonb(OLD), to_jsonb(NEW), v_actor_id, v_actor_name);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity := format('%s → %s', OLD.delegator_name, OLD.delegate_name);
    v_summary := format('Deleted substitution: %s', v_entity);
    INSERT INTO delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, old_values, actor_id, actor_name)
    VALUES (OLD.organization_id, 'delegation_matrix', OLD.id, v_action, v_entity, OLD.scope, v_summary, to_jsonb(OLD), v_actor_id, v_actor_name);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_delegation_matrix_iud ON public.delegation_matrix;
CREATE TRIGGER trg_audit_delegation_matrix_iud
AFTER INSERT OR UPDATE OR DELETE ON public.delegation_matrix
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_delegation_matrix();

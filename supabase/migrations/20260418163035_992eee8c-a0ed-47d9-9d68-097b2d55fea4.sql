-- 1) Purge the E2E-test pollution that shows "system" with no recoverable payload
DELETE FROM public.workflow_transitions
 WHERE from_stage = 'delegation_routing'
   AND (notes LIKE 'E2E mirror test%' OR performed_by_name = 'system');

DELETE FROM public.delegation_audit_log
 WHERE actor_name = 'system'
   AND new_values IS NULL
   AND (summary LIKE 'E2E mirror test%' OR summary IS NULL);

-- 2) Make future actor-less inserts obvious instead of silently saying "system"
ALTER TABLE public.delegation_audit_log
  ALTER COLUMN actor_name SET DEFAULT 'automated';
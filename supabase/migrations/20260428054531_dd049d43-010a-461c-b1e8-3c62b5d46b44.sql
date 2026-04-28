ALTER TABLE public.dispatch_job_audit_log
  DROP CONSTRAINT IF EXISTS dispatch_job_audit_log_job_id_fkey;

ALTER TABLE public.dispatch_job_audit_log
  ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE public.dispatch_job_audit_log
  ADD CONSTRAINT dispatch_job_audit_log_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.dispatch_jobs(id) ON DELETE SET NULL;
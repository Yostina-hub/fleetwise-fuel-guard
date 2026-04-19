/**
 * useFormUsage
 * ------------
 * Computes a real "is this form actually used" signal for the Forms list, by
 * combining three sources:
 *   1. Legacy registry bindings (forms backed by hard-coded React components
 *      like Vehicle Request, Fuel Request, Safety & Comfort, etc.) — these
 *      always count as "in use" because they're wired into the app shell.
 *   2. Workflow task references — any `workflow_tasks.form_key` pointing at
 *      this form (raw key OR `user_form:<key>`) means the form is consumed
 *      by an active workflow.
 *   3. Submission count from `form_submissions` — direct evidence the form
 *      has been submitted at least once.
 *
 * The hook returns a `Map<formId, FormUsage>` so the list page can render a
 * meaningful Status column without N round-trips.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLegacyFormEntry } from "@/components/forms/legacyFormRegistry";

export interface FormUsage {
  /** True if any of the three sources count this form as in use. */
  inUse: boolean;
  /** True if a hard-coded legacy component is bound to this form key. */
  legacyBound: boolean;
  /** Number of workflow_tasks that reference this form key. */
  workflowTaskCount: number;
  /** Number of submissions in form_submissions for this form. */
  submissionCount: number;
}

export function useFormsUsage(
  forms: Array<{ id: string; key: string }> | undefined,
  organizationId?: string | null,
) {
  const ids = (forms ?? []).map((f) => f.id);
  const keys = (forms ?? []).map((f) => f.key);

  return useQuery({
    queryKey: ["forms-usage", organizationId, ids.join(","), keys.join(",")],
    enabled: !!organizationId && ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Map<string, FormUsage>> => {
      const result = new Map<string, FormUsage>();
      if (!forms || forms.length === 0) return result;

      // 1. Submission counts (one query, group client-side)
      const { data: subs, error: subsErr } = await (supabase as any)
        .from("form_submissions")
        .select("form_id")
        .in("form_id", ids);
      if (subsErr) throw subsErr;
      const subCount = new Map<string, number>();
      for (const r of subs ?? []) {
        subCount.set(r.form_id, (subCount.get(r.form_id) ?? 0) + 1);
      }

      // 2. Workflow task references — match either `<key>` or `user_form:<key>`.
      const orPatterns = keys.flatMap((k) => [k, `user_form:${k}`]);
      const { data: tasks, error: tasksErr } = await (supabase as any)
        .from("workflow_tasks")
        .select("form_key")
        .in("form_key", orPatterns);
      if (tasksErr) throw tasksErr;
      const taskCount = new Map<string, number>();
      for (const t of tasks ?? []) {
        const raw = String(t.form_key ?? "");
        const key = raw.startsWith("user_form:") ? raw.slice("user_form:".length) : raw;
        taskCount.set(key, (taskCount.get(key) ?? 0) + 1);
      }

      // 3. Combine with legacy registry binding.
      for (const f of forms) {
        const legacyBound = !!getLegacyFormEntry(f.key);
        const workflowTaskCount = taskCount.get(f.key) ?? 0;
        const submissionCount = subCount.get(f.id) ?? 0;
        result.set(f.id, {
          legacyBound,
          workflowTaskCount,
          submissionCount,
          inUse: legacyBound || workflowTaskCount > 0 || submissionCount > 0,
        });
      }
      return result;
    },
  });
}

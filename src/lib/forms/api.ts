/**
 * Forms Module — Data Access Hooks
 * =================================
 * Thin wrappers around the `forms`, `form_versions`, and `form_submissions`
 * tables. All hooks scope to the current organization.
 *
 * Schema mapping (matches Phase-1 migration):
 *   forms.is_archived              → status: "active" | "archived"
 *   forms.current_published_version_id  → resolved separately
 *   form_versions.status           → "draft" | "published" | "archived"
 *   form_versions.version_number   → version
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FormSchema, FormSettings } from "./schema";
import { EMPTY_SCHEMA, EMPTY_SETTINGS } from "./schema";

// ---------- Types --------------------------------------------------------

export interface FormRow {
  id: string;
  organization_id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  current_published_version_id: string | null;
  is_archived: boolean;
  archived_at: string | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormVersionRow {
  id: string;
  form_id: string;
  organization_id: string;
  version_number: number;
  status: "draft" | "published" | "archived";
  schema: FormSchema;
  settings: FormSettings;
  published_at: string | null;
  published_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionRow {
  id: string;
  form_id: string;
  form_version_id: string;
  organization_id: string;
  submitted_by: string;
  vehicle_id: string | null;
  driver_id: string | null;
  workflow_instance_id: string | null;
  workflow_task_id: string | null;
  data: Record<string, any>;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

const QK = {
  forms: (orgId?: string | null) => ["forms", orgId] as const,
  form: (id: string) => ["forms", id] as const,
  versions: (formId: string) => ["forms", formId, "versions"] as const,
  draft: (formId: string) => ["forms", formId, "draft"] as const,
  published: (formKey: string, orgId?: string | null) =>
    ["forms", "published", orgId, formKey] as const,
  submissions: (formId: string) => ["forms", formId, "submissions"] as const,
};

function normalizeVersion(v: any): FormVersionRow {
  return {
    ...v,
    schema: (v.schema ?? EMPTY_SCHEMA) as FormSchema,
    settings: (v.settings ?? EMPTY_SETTINGS) as FormSettings,
  } as FormVersionRow;
}

// ---------- List forms ---------------------------------------------------

export function useFormsList(organizationId?: string | null, includeArchived = false) {
  return useQuery({
    queryKey: [...QK.forms(organizationId), includeArchived],
    enabled: !!organizationId,
    queryFn: async (): Promise<FormRow[]> => {
      let q = (supabase as any)
        .from("forms")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (!includeArchived) q = q.eq("is_archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FormRow[];
    },
  });
}

// ---------- Get one form + draft -----------------------------------------

export function useForm(formId?: string | null) {
  return useQuery({
    queryKey: QK.form(formId ?? ""),
    enabled: !!formId,
    queryFn: async (): Promise<FormRow | null> => {
      const { data, error } = await (supabase as any)
        .from("forms")
        .select("*")
        .eq("id", formId)
        .maybeSingle();
      if (error) throw error;
      return data as FormRow | null;
    },
  });
}

export function useFormDraftVersion(formId?: string | null) {
  return useQuery({
    queryKey: QK.draft(formId ?? ""),
    enabled: !!formId,
    queryFn: async (): Promise<FormVersionRow | null> => {
      const { data, error } = await (supabase as any)
        .from("form_versions")
        .select("*")
        .eq("form_id", formId)
        .eq("status", "draft")
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeVersion(data) : null;
    },
  });
}

export function useFormVersions(formId?: string | null) {
  return useQuery({
    queryKey: QK.versions(formId ?? ""),
    enabled: !!formId,
    queryFn: async (): Promise<FormVersionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("form_versions")
        .select("*")
        .eq("form_id", formId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normalizeVersion);
    },
  });
}

/** Resolve the published version for a stable form key (used by renderer at runtime). */
export function usePublishedFormByKey(formKey?: string | null, organizationId?: string | null) {
  return useQuery({
    queryKey: QK.published(formKey ?? "", organizationId),
    enabled: !!formKey && !!organizationId,
    queryFn: async (): Promise<{ form: FormRow; version: FormVersionRow } | null> => {
      const { data: form, error: e1 } = await (supabase as any)
        .from("forms")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("key", formKey)
        .eq("is_archived", false)
        .maybeSingle();
      if (e1) throw e1;
      if (!form?.current_published_version_id) return null;
      const { data: ver, error: e2 } = await (supabase as any)
        .from("form_versions")
        .select("*")
        .eq("id", form.current_published_version_id)
        .maybeSingle();
      if (e2) throw e2;
      if (!ver) return null;
      return { form: form as FormRow, version: normalizeVersion(ver) };
    },
  });
}

// ---------- Mutations ----------------------------------------------------

export interface CreateFormInput {
  organization_id: string;
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFormInput): Promise<FormRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: form, error } = await (supabase as any)
        .from("forms")
        .insert({
          organization_id: input.organization_id,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? "general",
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Seed an empty draft (version_number auto-set by trigger).
      const { error: e2 } = await (supabase as any).from("form_versions").insert({
        form_id: form.id,
        organization_id: input.organization_id,
        status: "draft",
        schema: EMPTY_SCHEMA,
        settings: EMPTY_SETTINGS,
        created_by: user.id,
      });
      if (e2) throw e2;
      return form as FormRow;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.forms(vars.organization_id) });
    },
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      formId: string;
      schema: FormSchema;
      settings: FormSettings;
    }) => {
      const { error } = await (supabase as any)
        .from("form_versions")
        .update({
          schema: input.schema,
          settings: input.settings,
        })
        .eq("form_id", input.formId)
        .eq("status", "draft");
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.draft(vars.formId) });
    },
  });
}

/**
 * Publish flow:
 *   1. Promote the current draft to published (publish trigger updates the form pointer).
 *   2. Create a fresh empty draft seeded from the just-published schema.
 */
export function usePublishDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string): Promise<number> => {
      // Read the current draft.
      const { data: draft, error: e1 } = await (supabase as any)
        .from("form_versions")
        .select("*")
        .eq("form_id", formId)
        .eq("status", "draft")
        .maybeSingle();
      if (e1) throw e1;
      if (!draft) throw new Error("No draft to publish");

      // Promote to published. Trigger updates forms.current_published_version_id.
      const { data: pub, error: e2 } = await (supabase as any)
        .from("form_versions")
        .update({ status: "published" })
        .eq("id", draft.id)
        .select()
        .single();
      if (e2) throw e2;

      // Create a new draft cloned from the just-published version.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error: e3 } = await (supabase as any)
        .from("form_versions")
        .insert({
          form_id: formId,
          organization_id: draft.organization_id,
          status: "draft",
          schema: draft.schema,
          settings: draft.settings,
          created_by: user.id,
        });
      if (e3) throw e3;

      return pub.version_number as number;
    },
    onSuccess: (_d, formId) => {
      qc.invalidateQueries({ queryKey: QK.form(formId) });
      qc.invalidateQueries({ queryKey: QK.versions(formId) });
      qc.invalidateQueries({ queryKey: QK.draft(formId) });
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useArchiveForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await (supabase as any)
        .from("forms")
        .update({ is_archived: true })
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forms"] }),
  });
}

export function useUnarchiveForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await (supabase as any)
        .from("forms")
        .update({ is_archived: false, archived_at: null })
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forms"] }),
  });
}

/**
 * Clone a template (from `lib/forms/templates.ts`) into the current organization.
 * Creates the form row, seeds a published v1 with the template schema, and
 * also creates a fresh editable draft cloned from it. Returns the new form id.
 *
 * If the requested key already exists for this org, the hook auto-suffixes
 * `_copy`, `_copy_2`, etc. so the operation never fails on uniqueness.
 */
export function useCloneTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organizationId: string;
      template: {
        key: string;
        name: string;
        description: string;
        category: string;
        schema: FormSchema;
        settings: FormSettings;
      };
    }): Promise<FormRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find a non-conflicting key.
      let key = input.template.key;
      let attempt = 0;
      while (true) {
        const { data: existing } = await (supabase as any)
          .from("forms")
          .select("id")
          .eq("organization_id", input.organizationId)
          .eq("key", key)
          .maybeSingle();
        if (!existing) break;
        attempt += 1;
        key = attempt === 1 ? `${input.template.key}_copy` : `${input.template.key}_copy_${attempt}`;
        if (attempt > 50) throw new Error("Could not find a free key");
      }

      // Create the form.
      const { data: form, error } = await (supabase as any)
        .from("forms")
        .insert({
          organization_id: input.organizationId,
          key,
          name: input.template.name,
          description: input.template.description,
          category: input.template.category,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Seed published v1 with the template schema.
      const { data: pub, error: ePub } = await (supabase as any)
        .from("form_versions")
        .insert({
          form_id: form.id,
          organization_id: input.organizationId,
          status: "published",
          schema: input.template.schema,
          settings: input.template.settings,
          created_by: user.id,
        })
        .select()
        .single();
      if (ePub) throw ePub;

      // Seed an editable draft cloned from the published version.
      const { error: eDraft } = await (supabase as any).from("form_versions").insert({
        form_id: form.id,
        organization_id: input.organizationId,
        status: "draft",
        schema: input.template.schema,
        settings: input.template.settings,
        created_by: user.id,
      });
      if (eDraft) throw eDraft;

      // Some publish triggers may already set this; do it explicitly as a fallback.
      await (supabase as any)
        .from("forms")
        .update({ current_published_version_id: pub.id })
        .eq("id", form.id);

      return form as FormRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.forms(vars.organizationId) });
    },
  });
}

/**
 * Mark a form as the default for its intent (e.g. all `vehicle_request*` forms
 * share intent `vehicle_request`). Unsets any existing default within the same
 * org+intent first, then sets the new one. Pass `null` to just clear.
 */
export function useSetDefaultForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { formId: string; organizationId: string; intent: string }) => {
      // Clear other defaults for this intent in the same org.
      const { data: peers, error: e1 } = await (supabase as any)
        .from("forms")
        .select("id, key")
        .eq("organization_id", input.organizationId)
        .eq("is_default", true);
      if (e1) throw e1;
      const intentRe = /(_copy(_\d+)?|_v\d+)$/;
      const peerIds = (peers ?? [])
        .filter((p: any) => p.key.replace(intentRe, "") === input.intent && p.id !== input.formId)
        .map((p: any) => p.id);
      if (peerIds.length > 0) {
        const { error: e2 } = await (supabase as any)
          .from("forms")
          .update({ is_default: false })
          .in("id", peerIds);
        if (e2) throw e2;
      }
      const { error: e3 } = await (supabase as any)
        .from("forms")
        .update({ is_default: true })
        .eq("id", input.formId);
      if (e3) throw e3;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useUpdateFormMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string | null;
      category?: string | null;
    }) => {
      const { id, ...patch } = input;
      const { error } = await (supabase as any).from("forms").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: QK.form(v.id) });
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

// ---------- Submissions --------------------------------------------------

export function useSubmitForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      formId: string;
      formVersionId: string;
      organizationId: string;
      data: Record<string, any>;
      vehicleId?: string | null;
      driverId?: string | null;
      workflowInstanceId?: string | null;
      workflowTaskId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("form_submissions")
        .insert({
          form_id: input.formId,
          form_version_id: input.formVersionId,
          organization_id: input.organizationId,
          data: input.data,
          submitted_by: user.id,
          vehicle_id: input.vehicleId ?? null,
          driver_id: input.driverId ?? null,
          workflow_instance_id: input.workflowInstanceId ?? null,
          workflow_task_id: input.workflowTaskId ?? null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as FormSubmissionRow;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: QK.submissions(v.formId) });
    },
  });
}

export function useFormSubmissions(formId?: string | null) {
  return useQuery({
    queryKey: QK.submissions(formId ?? ""),
    enabled: !!formId,
    queryFn: async (): Promise<FormSubmissionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as FormSubmissionRow[];
    },
  });
}

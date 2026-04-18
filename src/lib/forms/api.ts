/**
 * Forms Module — Data Access Hooks
 * =================================
 * Thin wrappers around the `forms`, `form_versions`, and `form_submissions`
 * tables. All hooks scope to the current organization.
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
  status: "active" | "archived";
  current_version: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FormVersionRow {
  id: string;
  form_id: string;
  organization_id: string;
  version: number;
  is_draft: boolean;
  is_published: boolean;
  schema: FormSchema;
  settings: FormSettings;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionRow {
  id: string;
  form_id: string;
  form_version_id: string;
  organization_id: string;
  data: Record<string, any>;
  submitted_by: string | null;
  workflow_instance_id: string | null;
  workflow_task_id: string | null;
  created_at: string;
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
      if (!includeArchived) q = q.eq("status", "active");
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
        .eq("is_draft", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        schema: (data.schema ?? EMPTY_SCHEMA) as FormSchema,
        settings: (data.settings ?? EMPTY_SETTINGS) as FormSettings,
      } as FormVersionRow;
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
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FormVersionRow[];
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
        .eq("status", "active")
        .maybeSingle();
      if (e1) throw e1;
      if (!form?.current_version) return null;
      const { data: ver, error: e2 } = await (supabase as any)
        .from("form_versions")
        .select("*")
        .eq("form_id", form.id)
        .eq("version", form.current_version)
        .eq("is_published", true)
        .maybeSingle();
      if (e2) throw e2;
      if (!ver) return null;
      return {
        form: form as FormRow,
        version: {
          ...ver,
          schema: (ver.schema ?? EMPTY_SCHEMA) as FormSchema,
          settings: (ver.settings ?? EMPTY_SETTINGS) as FormSettings,
        } as FormVersionRow,
      };
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
      const { data: form, error } = await (supabase as any)
        .from("forms")
        .insert({
          organization_id: input.organization_id,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          status: "active",
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      // Seed an empty draft (v1).
      const { error: e2 } = await (supabase as any).from("form_versions").insert({
        form_id: form.id,
        organization_id: input.organization_id,
        version: 1,
        is_draft: true,
        is_published: false,
        schema: EMPTY_SCHEMA,
        settings: EMPTY_SETTINGS,
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
          updated_at: new Date().toISOString(),
        })
        .eq("form_id", input.formId)
        .eq("is_draft", true);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.draft(vars.formId) });
    },
  });
}

export function usePublishDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string) => {
      const { data, error } = await (supabase as any).rpc("publish_form_draft", {
        _form_id: formId,
      });
      if (error) throw error;
      return data as number;
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
        .update({ status: "archived" })
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
        .update({ status: "active" })
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forms"] }),
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
      workflowInstanceId?: string | null;
      workflowTaskId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("form_submissions")
        .insert({
          form_id: input.formId,
          form_version_id: input.formVersionId,
          organization_id: input.organizationId,
          data: input.data,
          submitted_by: user?.id ?? null,
          workflow_instance_id: input.workflowInstanceId ?? null,
          workflow_task_id: input.workflowTaskId ?? null,
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

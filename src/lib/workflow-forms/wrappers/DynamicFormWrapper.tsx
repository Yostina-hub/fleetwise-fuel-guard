/**
 * DynamicFormWrapper
 * ===================
 * Renders a user-built form (from the Forms module) inside a workflow task.
 *
 * Activated when a Human Task / Approval node uses `form_key = "user_form:<key>"`.
 * The wrapper resolves the published version by stable key, renders the unified
 * `<FormRenderer />`, then writes the result to `form_submissions` (linked to
 * the workflow task) before bubbling up to the registry.
 */
import { useState } from "react";
import { Loader2, FileWarning } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { usePublishedFormByKey, useSubmitForm } from "@/lib/forms/api";
import { FormRenderer } from "@/components/forms/FormRenderer";
import type { WorkflowFormProps } from "../registry";

interface Props extends WorkflowFormProps {
  /** Bare form key (without the `user_form:` prefix). */
  formKey: string;
}

export default function DynamicFormWrapper({ formKey, prefill, onSubmitted, onCancel }: Props) {
  const [open, setOpen] = useState(true);
  const { organizationId } = useOrganization();
  const q = usePublishedFormByKey(formKey, organizationId);
  const submit = useSubmitForm();

  const close = () => {
    setOpen(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{q.data?.form?.name ?? "Form"}</DialogTitle>
          {q.data?.form?.description ? (
            <DialogDescription>{q.data.form.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !q.data ? (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <FileWarning className="h-8 w-8 mx-auto opacity-60" />
            <p className="text-sm">
              No published version found for form key{" "}
              <span className="font-mono">{formKey}</span>.
            </p>
            <p className="text-xs">Publish a draft first in the Forms module.</p>
          </div>
        ) : (
          <FormRenderer
            schema={q.data.version.schema}
            settings={q.data.version.settings}
            formKey={q.data.form.key ?? formKey}
            prefill={prefill}
            draftKey={`workflow_form:${q.data.form.id}:${prefill?.workflow_task_id ?? "new"}`}
            submitting={submit.isPending}
            onCancel={close}
            onSubmit={async (values) => {
              try {
                const sub = await submit.mutateAsync({
                  formId: q.data!.form.id,
                  formVersionId: q.data!.version.id,
                  organizationId: organizationId!,
                  data: values,
                  vehicleId: prefill?.vehicle_id ?? null,
                  driverId: prefill?.driver_id ?? null,
                  workflowInstanceId: prefill?.workflow_instance_id ?? null,
                  workflowTaskId: prefill?.workflow_task_id ?? null,
                });
                toast.success("Submitted");
                setOpen(false);
                onSubmitted({
                  form_key: `user_form:${formKey}`,
                  submission_id: sub.id,
                  form_version_id: q.data!.version.id,
                  values,
                  at: new Date().toISOString(),
                });
              } catch (e: any) {
                toast.error(e?.message || "Submit failed");
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

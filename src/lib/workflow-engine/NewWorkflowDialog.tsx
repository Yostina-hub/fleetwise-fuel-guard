// Universal "file new workflow" dialog driven by config.intakeFields,
// config.intakeFormKey, or config.intakeFormChoices.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkflowFieldset } from "./WorkflowFieldset";
import type { WorkflowConfig } from "./types";
import { useWorkflow } from "./useWorkflow";
import { RenderWorkflowForm, getWorkflowForm } from "@/lib/workflow-forms/registry";
import { FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftStatus } from "@/components/inbox/DraftStatus";

interface Props {
  config: WorkflowConfig;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewWorkflowDialog({ config, open, onOpenChange }: Props) {
  const { createInstance } = useWorkflow(config);
  const [chosenFormKey, setChosenFormKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Per-SOP intake draft — restores when re-opening the same "New X" dialog.
  const draftKey = open ? `sop-intake:${config.type}` : null;
  const { values, setValues, setField, restoredAt, savedAt, clear } = useFormDraft<
    Record<string, any>
  >(draftKey, {});

  const intakeFields = config.intakeFields || [];
  const intakeForm = config.intakeFormKey ? getWorkflowForm(config.intakeFormKey) : undefined;
  const choices = config.intakeFormChoices ?? [];
  const activeChoice = chosenFormKey
    ? choices.find((c) => c.key === chosenFormKey)
    : undefined;
  const activeChoiceForm = activeChoice ? getWorkflowForm(activeChoice.key) : undefined;

  useEffect(() => {
    if (!open) {
      setChosenFormKey(null);
    }
  }, [open]);

  const submitReusableForm = async (result?: Record<string, any>) => {
    const payload = result ?? {};
    await createInstance.mutateAsync({
      title: payload.title || config.title,
      description: payload.description || null,
      vehicleId: payload.vehicle_id || null,
      driverId: payload.driver_id || null,
      data: payload,
    });
    onOpenChange(false);
  };

  // When a choice is picked but no registered form exists for it, fall back to
  // the inline intakeFields form, seeding values with the choice's prefill.
  useEffect(() => {
    if (chosenFormKey && activeChoice && !activeChoiceForm) {
      setValues((prev) => ({ ...(activeChoice.prefill ?? {}), ...prev }));
    }
  }, [chosenFormKey, activeChoice, activeChoiceForm]);

  const submit = async () => {
    const missing = intakeFields
      .filter((f) => f.required)
      .filter((f) => !values[f.key] && values[f.key] !== false);
    if (missing.length) {
      toast.error(
        `Missing required field${missing.length > 1 ? "s" : ""}: ${missing
          .map((f) => f.label)
          .join(", ")}`,
      );
      return;
    }

    const vehicleId = values["__vehicle_id"] || values["vehicle_id"] || null;
    const driverId = values["__driver_id"] || values["driver_id"] || null;

    try {
      await createInstance.mutateAsync({
        title: values["title"],
        description: values["description"],
        vehicleId,
        driverId,
        data: { ...(activeChoice?.prefill ?? {}), ...values },
      });
      setValues({});
      clear();
      setChosenFormKey(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to file workflow");
    }
  };

  // Centralized-form path: when the SOP declares `intakeFormKey`, render the
  // reusable form. We early-return null when the dialog is closed so the parent
  // `WorkflowPage` swap between "no dialog open" and the centralized form is
  // a clean mount/unmount (avoids React removeChild crashes that occur if we
  // toggle between two different top-level element types each render).
  if (intakeForm) {
    if (!open) return null;
    return (
      <RenderWorkflowForm
        formKey={intakeForm.key}
        prefill={config.intakePrefill}
        onCancel={() => onOpenChange(false)}
        onSubmitted={submitReusableForm}
      />
    );
  }

  // Reusable form chooser path
  if (open && choices.length > 0 && !chosenFormKey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New {config.title}</DialogTitle>
            <DialogDescription>
              {config.sopCode} — choose how you want to file this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {choices.map((c) => (
              <button
                key={c.key}
                onClick={() => setChosenFormKey(c.key)}
                className="w-full text-left p-3 rounded-md border border-border bg-card hover:bg-accent/40 transition-colors flex items-start gap-3"
              >
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium">{c.label}</div>
                  {c.description ? (
                    <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // A choice was picked AND there's a registered reusable form for it.
  if (open && activeChoiceForm) {
    return (
      <RenderWorkflowForm
        formKey={activeChoiceForm.key}
        prefill={activeChoice?.prefill}
        onCancel={() => setChosenFormKey(null)}
        onSubmitted={submitReusableForm}
      />
    );
  }

  // A choice was picked but no registered form exists → fall through to inline
  // intakeFields form below (values are pre-seeded via useEffect above).

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New {config.title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-2">
          {config.sopCode} — {config.description}
        </p>
        <div className="mb-3">
          <DraftStatus restoredAt={restoredAt} savedAt={savedAt} onClear={clear} />
        </div>
        <WorkflowFieldset
          fields={intakeFields}
          values={values}
          onChange={(k, v) => setField(k, v)}
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createInstance.isPending}>
            File request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

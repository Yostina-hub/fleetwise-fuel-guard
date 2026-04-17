// Universal "file new workflow" dialog driven by config.intakeFields,
// config.intakeFormKey, or config.intakeFormChoices.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkflowFieldset } from "./WorkflowFieldset";
import type { WorkflowConfig } from "./types";
import { useWorkflow } from "./useWorkflow";
import { RenderWorkflowForm, getWorkflowForm } from "@/lib/workflow-forms/registry";
import { FileText } from "lucide-react";

interface Props {
  config: WorkflowConfig;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewWorkflowDialog({ config, open, onOpenChange }: Props) {
  const { createInstance } = useWorkflow(config);
  const [values, setValues] = useState<Record<string, any>>({});
  const [chosenFormKey, setChosenFormKey] = useState<string | null>(null);

  const intakeFields = config.intakeFields || [];
  const intakeForm = config.intakeFormKey ? getWorkflowForm(config.intakeFormKey) : undefined;
  const choices = config.intakeFormChoices ?? [];
  const activeChoice = chosenFormKey
    ? choices.find((c) => c.key === chosenFormKey)
    : undefined;
  const activeChoiceForm = activeChoice ? getWorkflowForm(activeChoice.key) : undefined;

  useEffect(() => {
    if (!open) {
      setValues({});
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

  const submit = async () => {
    const missing = intakeFields
      .filter((f) => f.required)
      .filter((f) => !values[f.key] && values[f.key] !== false);
    if (missing.length) return;

    const vehicleId = values["__vehicle_id"] || values["vehicle_id"] || null;
    const driverId = values["__driver_id"] || values["driver_id"] || null;

    await createInstance.mutateAsync({
      title: values["title"],
      description: values["description"],
      vehicleId,
      driverId,
      data: values,
    });
    setValues({});
    onOpenChange(false);
  };

  if (open && intakeForm) {
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
  if (open && choices.length > 0) {
    if (activeChoiceForm) {
      return (
        <RenderWorkflowForm
          formKey={activeChoiceForm.key}
          prefill={activeChoice?.prefill}
          onCancel={() => setChosenFormKey(null)}
          onSubmitted={submitReusableForm}
        />
      );
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New {config.title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-2">
          {config.sopCode} — {config.description}
        </p>
        <WorkflowFieldset
          fields={intakeFields}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
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

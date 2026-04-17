// Universal "file new workflow" dialog driven by config.intakeFields.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkflowFieldset } from "./WorkflowFieldset";
import type { WorkflowConfig } from "./types";
import { useWorkflow } from "./useWorkflow";
import { RenderWorkflowForm, getWorkflowForm } from "@/lib/workflow-forms/registry";

interface Props {
  config: WorkflowConfig;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewWorkflowDialog({ config, open, onOpenChange }: Props) {
  const { createInstance } = useWorkflow(config);
  const [values, setValues] = useState<Record<string, any>>({});

  const intakeFields = config.intakeFields || [];
  const intakeForm = config.intakeFormKey ? getWorkflowForm(config.intakeFormKey) : undefined;

  useEffect(() => {
    if (!open) setValues({});
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

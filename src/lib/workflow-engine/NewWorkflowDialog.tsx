// Universal "file new workflow" dialog driven by config.intakeFields.
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkflowFieldset } from "./WorkflowFieldset";
import type { WorkflowConfig } from "./types";
import { useWorkflow } from "./useWorkflow";

interface Props {
  config: WorkflowConfig;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewWorkflowDialog({ config, open, onOpenChange }: Props) {
  const { createInstance } = useWorkflow(config);
  const [values, setValues] = useState<Record<string, any>>({});

  const intakeFields = config.intakeFields || [];

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

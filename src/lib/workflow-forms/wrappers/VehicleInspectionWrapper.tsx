import { useState } from "react";
import { VehicleInspectionFormDialog } from "@/components/maintenance/VehicleInspectionFormDialog";
import type { WorkflowFormProps } from "../registry";

export default function VehicleInspectionWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  // The inspection component is itself a Dialog. We always keep it open;
  // closing the dialog from inside cancels the workflow task.
  const [open, setOpen] = useState(true);
  return (
    <VehicleInspectionFormDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
      prefill={{
        vehicle_id: prefill?.vehicle_id,
        driver_id: prefill?.driver_id,
        inspection_type: prefill?.inspection_type ?? prefill?.inspection_sub_type ?? "pre_trip",
      }}
      onSubmitted={(payload?: any) =>
        onSubmitted({ form: "vehicle_inspection", ...(payload ?? {}), at: new Date().toISOString() })
      }
    />
  );
}

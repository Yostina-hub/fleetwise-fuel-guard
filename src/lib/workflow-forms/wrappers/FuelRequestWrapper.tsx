import { useState } from "react";
import { FuelRequestFormDialog } from "@/components/fuel/FuelRequestFormDialog";
import type { WorkflowFormProps } from "../registry";

export default function FuelRequestWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  const [open, setOpen] = useState(true);
  return (
    <FuelRequestFormDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
      prefill={{
        vehicle_id: prefill?.vehicle_id,
        driver_id: prefill?.driver_id,
        request_type: prefill?.request_type ?? "vehicle",
      }}
      onSubmitted={(payload?: any) =>
        onSubmitted({ form: "fuel_request", ...(payload ?? {}), at: new Date().toISOString() })
      }
    />
  );
}

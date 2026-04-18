import { useState } from "react";
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";
import type { WorkflowFormProps } from "../registry";

/**
 * Workflow intake wrapper for the FMG-VRQ 15 (Vehicle Request) SOP.
 *
 * Reuses the legacy `VehicleRequestForm` (titled "Fleet Request Form") so the
 * SOP page's "File new" button gets the full feature parity: pool hierarchy,
 * delegation routing, super-admin "on behalf of" picker, prefill, etc.
 *
 * The form inserts into `vehicle_requests`; a DB sync mirrors the row into
 * `workflow_instances` + `workflow_transitions` for the engine to take over.
 */
export default function VehicleRequestWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  const [open, setOpen] = useState(true);
  return (
    <VehicleRequestForm
      open={open}
      source="sop_intake"
      prefill={{
        purpose: prefill?.purpose,
        departure_place: prefill?.departure_place,
        destination: prefill?.destination,
      }}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
      onSubmitted={(payload) =>
        onSubmitted({ form: "vehicle_request", ...(payload ?? {}), at: new Date().toISOString() })
      }
    />
  );
}

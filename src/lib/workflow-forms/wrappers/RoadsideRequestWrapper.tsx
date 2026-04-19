import { useState } from "react";
import { NewRoadsideRequestDialog } from "@/components/roadside/NewRoadsideRequestDialog";
import type { WorkflowFormProps } from "../registry";

/**
 * Workflow intake wrapper for the FMG-RSA 12 (Roadside Assistance) SOP.
 *
 * Reuses the centralized `NewRoadsideRequestDialog` so the SOP "File new"
 * button gets full feature parity with the standalone Roadside Assistance
 * page (vehicle/driver pickers, GPS capture, provider details, tow flag).
 *
 * The form inserts into `roadside_assistance_requests`. The submitted row
 * is forwarded back to the workflow engine as the task `_result` payload.
 */
export default function RoadsideRequestWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  const [open, setOpen] = useState(true);
  return (
    <NewRoadsideRequestDialog
      open={open}
      prefill={{
        vehicle_id: prefill?.vehicle_id ?? prefill?.__vehicle_id,
        driver_id: prefill?.driver_id ?? prefill?.__driver_id,
        breakdown_type: prefill?.issue_type ?? prefill?.breakdown_type,
        priority: prefill?.priority,
        description: prefill?.description ?? prefill?.title,
        location_name: prefill?.location_name ?? prefill?.location,
        lat: prefill?.lat,
        lng: prefill?.lng,
      }}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
      onSubmitted={(row) =>
        onSubmitted({
          form: "roadside_request",
          roadside_request_id: row?.id,
          request_number: row?.request_number,
          vehicle_id: row?.vehicle_id,
          driver_id: row?.driver_id,
          breakdown_type: row?.breakdown_type,
          priority: row?.priority,
          at: new Date().toISOString(),
        })
      }
    />
  );
}

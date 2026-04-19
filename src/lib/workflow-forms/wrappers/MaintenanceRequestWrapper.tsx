import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateWorkRequestForm from "@/components/maintenance-enterprise/CreateWorkRequestForm";
import type { WorkflowFormProps } from "../registry";

/**
 * Workflow intake wrapper for the SOP 6.1 (Manage Request for Vehicle
 * Maintenance) flow.
 *
 * Reuses the legacy `CreateWorkRequestForm` (Oracle EBS-style) so the workflow
 * engine's "File new" / human-task experience matches the standalone Create
 * Work Request dialog (vehicle picker, driver context, request type/context,
 * inspection sub-type, attachments, etc.).
 *
 * The form inserts into `maintenance_requests`; the
 * `trg_sync_maintenance_request_workflow` trigger then mirrors the row into
 * `workflow_instances` + `workflow_transitions` so the engine, Inbox, and
 * delegation matrix can take over from there.
 */
export default function MaintenanceRequestWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maintenance Request</DialogTitle>
        </DialogHeader>
        <CreateWorkRequestForm
          vehicleId={prefill?.vehicle_id}
          vehiclePlate={prefill?.vehicle_plate}
          driverId={prefill?.driver_id}
          driverName={prefill?.driver_name}
          defaultRequestType={prefill?.request_type ?? "corrective"}
          defaultContext={prefill?.context ?? "vehicle_maintenance"}
          defaultInspectionSubType={prefill?.inspection_sub_type ?? ""}
          onSubmitted={(result) => {
            setOpen(false);
            onSubmitted({ form: "maintenance_request", ...(result ?? {}), at: new Date().toISOString() });
          }}
          onCancel={() => {
            setOpen(false);
            onCancel();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

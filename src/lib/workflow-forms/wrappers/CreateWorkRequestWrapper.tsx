import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateWorkRequestForm from "@/components/maintenance-enterprise/CreateWorkRequestForm";
import { useState } from "react";
import type { WorkflowFormProps } from "../registry";

export default function CreateWorkRequestWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
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
          <DialogTitle>Create Work Request</DialogTitle>
        </DialogHeader>
        <CreateWorkRequestForm
          vehicleId={prefill?.vehicle_id}
          vehiclePlate={prefill?.vehicle_plate}
          driverId={prefill?.driver_id}
          driverName={prefill?.driver_name}
          defaultRequestType={prefill?.request_type ?? "corrective"}
          defaultContext={prefill?.context ?? "vehicle_maintenance"}
          defaultInspectionSubType={prefill?.inspection_sub_type ?? ""}
          onSubmitted={() => {
            setOpen(false);
            onSubmitted({ form: "create_work_request", at: new Date().toISOString() });
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

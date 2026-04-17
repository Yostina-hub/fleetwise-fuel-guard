import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OracleWorkOrderForm from "@/components/maintenance-enterprise/OracleWorkOrderForm";
import { useState } from "react";
import type { WorkflowFormProps } from "../registry";

export default function OracleWorkOrderWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
    >
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Work Order</DialogTitle>
        </DialogHeader>
        <OracleWorkOrderForm
          maintenanceRequestId={prefill?.maintenance_request_id}
          workOrderId={prefill?.work_order_id}
          vehicleId={prefill?.vehicle_id}
          onCancel={() => {
            setOpen(false);
            onCancel();
          }}
          onSaved={(woId) => {
            setOpen(false);
            onSubmitted({ form: "oracle_work_order", work_order_id: woId, at: new Date().toISOString() });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

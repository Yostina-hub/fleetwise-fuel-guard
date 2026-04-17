import OracleWorkOrderForm from "@/components/maintenance-enterprise/OracleWorkOrderForm";
import type { WorkflowFormProps } from "../registry";

export default function OracleWorkOrderWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  return (
    <OracleWorkOrderForm
      maintenanceRequestId={prefill?.maintenance_request_id}
      workOrderId={prefill?.work_order_id}
      vehicleId={prefill?.vehicle_id}
      onCancel={onCancel}
      onSaved={(woId) =>
        onSubmitted({ form: "oracle_work_order", work_order_id: woId, at: new Date().toISOString() })
      }
    />
  );
}

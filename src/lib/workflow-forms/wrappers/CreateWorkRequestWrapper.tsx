import CreateWorkRequestForm from "@/components/maintenance-enterprise/CreateWorkRequestForm";
import type { WorkflowFormProps } from "../registry";

export default function CreateWorkRequestWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  return (
    <CreateWorkRequestForm
      vehicleId={prefill?.vehicle_id}
      vehiclePlate={prefill?.vehicle_plate}
      driverId={prefill?.driver_id}
      driverName={prefill?.driver_name}
      defaultRequestType={prefill?.request_type ?? "corrective"}
      defaultContext={prefill?.context ?? "vehicle_maintenance"}
      defaultInspectionSubType={prefill?.inspection_sub_type ?? ""}
      onSubmitted={() => onSubmitted({ form: "create_work_request", at: new Date().toISOString() })}
      onCancel={onCancel}
    />
  );
}

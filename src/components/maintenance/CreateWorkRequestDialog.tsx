import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import CreateWorkRequestForm from "@/components/maintenance-enterprise/CreateWorkRequestForm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  scheduleId?: string;
  defaultRequestType?: string;
}

/**
 * Reusable dialog wrapper around the professional CreateWorkRequestForm.
 * Used by Driver Portal and any other module that needs to file a maintenance work request.
 */
const CreateWorkRequestDialog = ({
  open,
  onOpenChange,
  vehicleId,
  vehiclePlate,
  driverId,
  driverName,
  scheduleId,
  defaultRequestType,
}: Props) => {
  const queryClient = useQueryClient();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Work Request</DialogTitle>
          <DialogDescription>Submit a maintenance work request for the assigned vehicle.</DialogDescription>
        </DialogHeader>
        <CreateWorkRequestForm
          vehicleId={vehicleId}
          vehiclePlate={vehiclePlate}
          driverId={driverId}
          driverName={driverName}
          scheduleId={scheduleId}
          defaultRequestType={defaultRequestType}
          onCancel={() => onOpenChange(false)}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
            queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
            queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkRequestDialog;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
  } | null;
  onSuccess?: () => void;
}

export default function DeleteVehicleDialog({ 
  open, 
  onOpenChange, 
  vehicle,
  onSuccess 
}: DeleteVehicleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!vehicle?.vehicleId) throw new Error("No vehicle selected");
      
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicle.vehicleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vehicle Deleted",
        description: `${vehicle?.plate} has been removed from your fleet.`,
      });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle. It may have related records.",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Vehicle
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{vehicle?.plate}</strong> ({vehicle?.make} {vehicle?.model})?
            </p>
            <p className="text-destructive font-medium">
              This action cannot be undone. All associated data including trips, telemetry, and maintenance records may be affected.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Vehicle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

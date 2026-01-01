import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Trash2, 
  Download,
  ChevronDown,
  X 
} from "lucide-react";
import type { Driver } from "@/hooks/useDrivers";
import { exportDriversToCSV } from "./DriverExportUtils";

interface DriverBulkActionsToolbarProps {
  selectedDrivers: Driver[];
  onClearSelection: () => void;
}

export default function DriverBulkActionsToolbar({ 
  selectedDrivers, 
  onClearSelection 
}: DriverBulkActionsToolbarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const ids = selectedDrivers.map(d => d.id);
      const { error } = await supabase
        .from("drivers")
        .update({ status: newStatus })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Drivers updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update drivers",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = selectedDrivers.map(d => d.id);
      const { error } = await supabase
        .from("drivers")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Drivers deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete drivers",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportDriversToCSV(selectedDrivers, `selected_drivers_${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: `Exported ${selectedDrivers.length} drivers` });
  };

  const isPending = bulkStatusMutation.isPending || bulkDeleteMutation.isPending;

  if (selectedDrivers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium">
        {selectedDrivers.length} driver{selectedDrivers.length > 1 ? "s" : ""} selected
      </span>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Change Status
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Set Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => bulkStatusMutation.mutate("active")}>
            <UserCheck className="w-4 h-4 mr-2 text-success" />
            Active
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => bulkStatusMutation.mutate("inactive")}>
            <UserX className="w-4 h-4 mr-2" />
            Inactive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => bulkStatusMutation.mutate("suspended")}>
            <AlertTriangle className="w-4 h-4 mr-2 text-destructive" />
            Suspended
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>

      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => bulkDeleteMutation.mutate()}
        disabled={isPending}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

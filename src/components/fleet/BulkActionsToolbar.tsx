import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash2, 
  Power, 
  Wrench, 
  Download, 
  X,
  ChevronDown,
  CheckSquare
} from "lucide-react";

interface BulkActionsToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onExport: () => void;
  totalCount: number;
}

export default function BulkActionsToolbar({
  selectedIds,
  onClearSelection,
  onExport,
  totalCount
}: BulkActionsToolbarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ status })
        .in("id", selectedIds);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({
        title: "Status Updated",
        description: `${selectedIds.length} vehicle(s) set to ${status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicles",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .in("id", selectedIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vehicles Deleted",
        description: `${selectedIds.length} vehicle(s) have been deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicles",
        variant: "destructive",
      });
    },
  });

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in">
      <div className="flex items-center gap-3">
        <CheckSquare className="w-5 h-5 text-primary" />
        <span className="font-medium">
          {selectedIds.length} of {totalCount} vehicle(s) selected
        </span>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Change Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Power className="w-4 h-4" />
              Change Status
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ status: "active" })}>
              Set Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ status: "maintenance" })}>
              Set Maintenance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ status: "inactive" })}>
              Set Inactive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <Button variant="outline" size="sm" className="gap-1" onClick={onExport}>
          <Download className="w-4 h-4" />
          Export Selected
        </Button>

        {/* Delete Button */}
        <Button 
          variant="destructive" 
          size="sm" 
          className="gap-1"
          onClick={() => {
            if (confirm(`Delete ${selectedIds.length} vehicle(s)? This cannot be undone.`)) {
              bulkDeleteMutation.mutate();
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

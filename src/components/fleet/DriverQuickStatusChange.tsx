import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, UserCheck, UserX, AlertTriangle } from "lucide-react";
import type { Driver } from "@/hooks/useDrivers";

interface DriverQuickStatusChangeProps {
  driver: Driver;
}

export default function DriverQuickStatusChange({ driver }: DriverQuickStatusChangeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("drivers")
        .update({ status: newStatus })
        .eq("id", driver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success/10 text-success border-success/20 gap-1">
            <UserCheck className="w-3 h-3" />
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary" className="gap-1">
            <UserX className="w-3 h-3" />
            Inactive
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-0" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="flex items-center gap-1">
              {getStatusBadge(driver.status || "active")}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            updateMutation.mutate("active");
          }}
          disabled={driver.status === "active"}
        >
          <UserCheck className="w-4 h-4 mr-2 text-success" />
          Set Active
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            updateMutation.mutate("inactive");
          }}
          disabled={driver.status === "inactive"}
        >
          <UserX className="w-4 h-4 mr-2" />
          Set Inactive
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            updateMutation.mutate("suspended");
          }}
          disabled={driver.status === "suspended"}
          className="text-destructive focus:text-destructive"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Suspend
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const WorkOrdersTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ["work_orders", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      scheduled: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "text-red-600 bg-red-50",
      high: "text-orange-600 bg-orange-50",
      medium: "text-yellow-600 bg-yellow-50",
      low: "text-green-600 bg-green-50",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[priority] || colors.medium}`}>
        {priority}
      </span>
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Maintenance Work Orders</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>WO Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders?.map((wo: any) => (
            <TableRow key={wo.id}>
              <TableCell className="font-medium">{wo.work_order_number}</TableCell>
              <TableCell className="capitalize">{wo.work_order_type}</TableCell>
              <TableCell>
                {wo.vehicles ? `${wo.vehicles.plate_number} (${wo.vehicles.make})` : "-"}
              </TableCell>
              <TableCell>{getPriorityBadge(wo.priority)}</TableCell>
              <TableCell>{getStatusBadge(wo.status)}</TableCell>
              <TableCell>
                {wo.scheduled_date ? format(new Date(wo.scheduled_date), "MMM dd, yyyy") : "-"}
              </TableCell>
              <TableCell>
                {wo.total_cost ? `$${Number(wo.total_cost).toFixed(2)}` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WorkOrdersTab;

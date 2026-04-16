import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Pencil, FileText, Wallet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";

interface Props {
  onEdit: (woId: string) => void;
  onCreate: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning border-warning/30",
  released: "bg-primary/10 text-primary border-primary/30",
  in_progress: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/10 text-success border-success/30",
  closed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const FuelWorkOrdersTab = ({ onEdit, onCreate }: Props) => {
  const { organizationId } = useOrganization();
  const { formatCurrency } = useOrganizationSettings();

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ["fuel-work-orders", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("fuel_work_orders")
        .select("*, fuel_requests(request_number, vehicle_id, generator_id, request_type, liters_approved, liters_requested)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {workOrders.length} fuel work order{workOrders.length !== 1 && "s"}
        </div>
        <Button size="sm" className="gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" /> New Work Order
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>WO #</TableHead>
                <TableHead>Linked FR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Planner</TableHead>
                <TableHead>Scheduled Start</TableHead>
                <TableHead>E-Money</TableHead>
                <TableHead>Used / Remaining</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No fuel work orders yet. Approve a fuel request or click "New Work Order".
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo: any) => {
                  const remaining = (wo.emoney_amount || 0) - (wo.amount_used || 0);
                  const fr = wo.fuel_requests;
                  return (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono text-xs">{wo.work_order_number}</TableCell>
                      <TableCell className="text-xs">
                        {fr ? (
                          <Badge variant="outline" className="text-[10px]">
                            <FileText className="h-3 w-3 mr-1" /> {fr.request_number}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[wo.status] || ""}`}>
                          {wo.status || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{wo.work_order_type || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          wo.priority === "critical" ? "bg-destructive/10 text-destructive border-destructive/30"
                          : wo.priority === "high" ? "bg-warning/10 text-warning border-warning/30"
                          : ""
                        }`}>
                          {wo.priority || "medium"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{wo.department || "—"}</TableCell>
                      <TableCell className="text-xs">{wo.planner_name || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {wo.scheduled_start_date ? format(new Date(wo.scheduled_start_date), "MMM dd HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {wo.emoney_amount ? (
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3 text-primary" />
                            {formatCurrency(wo.emoney_amount)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {wo.emoney_amount ? (
                          <span>
                            <span className="text-foreground font-medium">{formatCurrency(wo.amount_used || 0)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className={remaining > 0 ? "text-success" : "text-muted-foreground"}>{formatCurrency(remaining)}</span>
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(wo.created_at), "MMM dd")}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => onEdit(wo.id)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit work order</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

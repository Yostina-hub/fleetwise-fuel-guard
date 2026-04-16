import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Pencil, Plus, Zap, BatteryCharging, Gauge, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import { EVWorkOrderDialog } from "./EVWorkOrderDialog";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning border-warning/30",
  released: "bg-primary/10 text-primary border-primary/30",
  in_progress: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/10 text-success border-success/30",
  on_hold: "bg-warning/10 text-warning border-warning/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const EVWorkOrdersTab = () => {
  const { organizationId } = useOrganization();
  const { formatCurrency } = useOrganizationSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ["ev-work-orders", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("ev_work_orders")
        .select("*, vehicles:vehicle_id(plate_number, make, model), ev_charging_stations:station_id(name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  const stats = {
    total: workOrders.length,
    active: workOrders.filter((w: any) => ["released", "in_progress"].includes(w.wo_status)).length,
    energyRequired: workOrders.reduce((s: number, w: any) => s + (Number(w.energy_required_kwh) || 0), 0),
    energyDelivered: workOrders.reduce((s: number, w: any) => s + (Number(w.energy_delivered_kwh) || 0), 0),
    estCost: workOrders.reduce((s: number, w: any) => s + (Number(w.estimated_cost) || 0), 0),
    actualCost: workOrders.reduce((s: number, w: any) => s + (Number(w.actual_cost) || 0), 0),
  };

  const openCreate = () => { setEditId(null); setDialogOpen(true); };
  const openEdit = (id: string) => { setEditId(id); setDialogOpen(true); };

  return (
    <div className="space-y-3">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5" /> Active Work Orders
          </div>
          <div className="text-2xl font-bold mt-1">{stats.active}<span className="text-sm text-muted-foreground"> / {stats.total}</span></div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BatteryCharging className="h-3.5 w-3.5" /> Energy Required
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-500">{stats.energyRequired.toFixed(1)} <span className="text-sm font-normal">kWh</span></div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" /> Energy Delivered
          </div>
          <div className="text-2xl font-bold mt-1">{stats.energyDelivered.toFixed(1)} <span className="text-sm font-normal">kWh</span></div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" /> Total Est. Cost
          </div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(stats.estCost)}</div>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {workOrders.length} EV work order{workOrders.length !== 1 && "s"}
        </div>
        <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New EV Work Order
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead>WO #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SoC (Cur → Target)</TableHead>
                <TableHead>Energy (Req / Delivered)</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Cost (Est / Actual)</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No EV work orders yet. Click "New EV Work Order" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo: any) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-mono text-xs">{wo.work_order_number}</TableCell>
                    <TableCell className="text-xs">
                      {wo.vehicles ? (
                        <div>
                          <div className="font-medium">{wo.vehicles.plate_number}</div>
                          <div className="text-muted-foreground text-[10px]">{wo.vehicles.make} {wo.vehicles.model}</div>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[wo.wo_status] || ""}`}>
                        {wo.wo_status || "draft"}
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
                    <TableCell className="text-xs">
                      <span className="text-muted-foreground">{wo.current_soc_percent ?? "—"}%</span>
                      <span className="mx-1">→</span>
                      <span className="text-emerald-500 font-medium">{wo.target_soc_percent ?? "—"}%</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{Number(wo.energy_required_kwh || 0).toFixed(1)}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-success">{Number(wo.energy_delivered_kwh || 0).toFixed(1)}</span>
                      <span className="text-muted-foreground text-[10px]"> kWh</span>
                    </TableCell>
                    <TableCell className="text-xs">{wo.ev_charging_stations?.name || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{formatCurrency(wo.estimated_cost || 0)}</span>
                      <div className="text-muted-foreground text-[10px]">act: {formatCurrency(wo.actual_cost || 0)}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {wo.scheduled_start_date ? format(new Date(wo.scheduled_start_date), "MMM dd HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(wo.id)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit work order</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EVWorkOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workOrderId={editId}
      />
    </div>
  );
};

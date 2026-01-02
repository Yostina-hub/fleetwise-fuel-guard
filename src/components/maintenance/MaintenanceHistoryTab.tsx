import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Loader2, 
  ListChecks,
  Calendar,
  Truck,
  DollarSign,
  FileText,
  Download
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";

interface WorkOrder {
  id: string;
  work_order_number: string;
  work_type: string;
  vehicle_id: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  completed_date: string | null;
  parts_cost: number | null;
  labor_cost: number | null;
  total_cost: number | null;
  service_description: string | null;
  technician_name: string | null;
  notes: string | null;
  odometer_at_service: number | null;
  vehicles?: { plate_number: string; make: string; model: string };
}

const MaintenanceHistoryTab = () => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Fetch completed work orders
  const { data: completedWorkOrders, isLoading } = useQuery({
    queryKey: ['completed-work-orders', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('work_orders')
        .select('*, vehicles(plate_number, make, model)')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('completed_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WorkOrder[];
    },
    enabled: !!organizationId,
  });

  const filteredHistory = useMemo(() => {
    if (!completedWorkOrders) return [];
    
    return completedWorkOrders.filter((wo) => {
      const matchesSearch = searchQuery === "" ||
        wo.work_order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.work_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVehicle = vehicleFilter === "all" || wo.vehicle_id === vehicleFilter;
      
      return matchesSearch && matchesVehicle;
    });
  }, [completedWorkOrders, searchQuery, vehicleFilter]);

  const getVehicleLabel = (wo: WorkOrder) => {
    return wo.vehicles 
      ? `${wo.vehicles.plate_number} (${wo.vehicles.make} ${wo.vehicles.model})`
      : 'Unknown Vehicle';
  };

  const handleExportHistory = () => {
    if (!filteredHistory.length) return;

    const csvContent = [
      ['WO Number', 'Vehicle', 'Work Type', 'Completed Date', 'Total Cost', 'Technician', 'Notes'].join(','),
      ...filteredHistory.map(wo => [
        wo.work_order_number,
        wo.vehicles?.plate_number || '',
        wo.work_type?.replace(/_/g, ' ') || '',
        wo.completed_date ? format(new Date(wo.completed_date), 'yyyy-MM-dd') : '',
        wo.total_cost?.toFixed(2) || '0.00',
        wo.technician_name || '',
        `"${(wo.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="history-search"
              aria-label="Search maintenance history"
              placeholder="Search by WO number, type, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-[200px]" aria-label="Filter by vehicle">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleExportHistory}
          disabled={filteredHistory.length === 0}
          aria-label="Export maintenance history to CSV"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <ListChecks className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredHistory.length}</div>
                <div className="text-sm text-muted-foreground">Completed Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${filteredHistory.reduce((sum, wo) => sum + (wo.total_cost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {new Set(filteredHistory.map(wo => wo.vehicle_id)).size}
                </div>
                <div className="text-sm text-muted-foreground">Vehicles Serviced</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Service History</h3>
            <p>Completed work orders will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO Number</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Work Type</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((wo) => (
                  <TableRow 
                    key={wo.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => setSelectedWorkOrder(wo)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedWorkOrder(wo);
                      }
                    }}
                    aria-label={`View details for work order ${wo.work_order_number}`}
                  >
                    <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                    <TableCell>{wo.vehicles?.plate_number || 'Unknown'}</TableCell>
                    <TableCell className="capitalize">{wo.work_type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      {wo.completed_date ? format(new Date(wo.completed_date), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {wo.total_cost ? `$${wo.total_cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{wo.technician_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        aria-label={`View details for ${wo.work_order_number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkOrder(wo);
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Work Order Detail Dialog */}
      <Dialog open={!!selectedWorkOrder} onOpenChange={() => setSelectedWorkOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedWorkOrder?.work_order_number}
            </DialogTitle>
            <DialogDescription>
              Service record details
            </DialogDescription>
          </DialogHeader>
          {selectedWorkOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Vehicle</label>
                  <p className="font-medium">{getVehicleLabel(selectedWorkOrder)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Work Type</label>
                  <p className="font-medium capitalize">{selectedWorkOrder.work_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Scheduled Date</label>
                  <p className="font-medium">
                    {selectedWorkOrder.scheduled_date 
                      ? format(new Date(selectedWorkOrder.scheduled_date), 'MMM dd, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Completed Date</label>
                  <p className="font-medium">
                    {selectedWorkOrder.completed_date 
                      ? format(new Date(selectedWorkOrder.completed_date), 'MMM dd, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Technician</label>
                  <p className="font-medium">{selectedWorkOrder.technician_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Odometer</label>
                  <p className="font-medium">
                    {selectedWorkOrder.odometer_at_service 
                      ? `${selectedWorkOrder.odometer_at_service.toLocaleString()} km`
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm text-muted-foreground">Cost Breakdown</label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">${selectedWorkOrder.parts_cost?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">Parts</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">${selectedWorkOrder.labor_cost?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">Labor</p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <p className="text-lg font-bold text-primary">${selectedWorkOrder.total_cost?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              {selectedWorkOrder.service_description && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedWorkOrder.service_description}</p>
                </div>
              )}

              {selectedWorkOrder.notes && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm">{selectedWorkOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceHistoryTab;
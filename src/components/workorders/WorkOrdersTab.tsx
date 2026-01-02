import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Search, Eye, Trash2, CheckCircle, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";

const workOrderSchema = z.object({
  vehicle_id: z.string().uuid("Please select a vehicle"),
  work_type: z.string().trim().min(1, "Work type is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  service_description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less"),
  scheduled_date: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
});

type WorkOrderForm = z.infer<typeof workOrderSchema>;

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

const WorkOrdersTab = () => {
  const { organizationId, loading: organizationLoading } = useOrganization();
  const { hasRole, loading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  
  const canCreateWorkOrder = hasRole("super_admin") || hasRole("maintenance_lead") || hasRole("operations_manager");
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<{
    vehicle_id: string;
    work_type: string;
    priority: "low" | "medium" | "high" | "urgent";
    service_description: string;
    scheduled_date: string;
  }>({
    vehicle_id: "",
    work_type: "oil_change",
    priority: "medium",
    service_description: "",
    scheduled_date: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Cost update form
  const [costFormData, setCostFormData] = useState({
    parts_cost: 0,
    labor_cost: 0,
    technician_name: "",
  });

  const {
    data: vehicles,
    isLoading: vehiclesLoading,
    error: vehiclesError,
  } = useQuery({
    queryKey: ["vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const {
    data: workOrders,
    isLoading: workOrdersLoading,
    error: workOrdersError,
  } = useQuery({
    queryKey: ["work_orders", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WorkOrder[];
    },
    enabled: !!organizationId,
  });

  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    
    return workOrders.filter((wo) => {
      const matchesSearch = searchQuery === "" || 
        wo.work_order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.work_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.service_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [workOrders, searchQuery, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage);
  const paginatedWorkOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkOrders.slice(start, start + itemsPerPage);
  }, [filteredWorkOrders, currentPage]);

  // Generate pagination items with ellipsis for large page counts
  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    items.push(1);
    
    if (currentPage > 3) {
      items.push('ellipsis');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      if (!items.includes(i)) items.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      items.push('ellipsis');
    }
    
    if (!items.includes(totalPages)) items.push(totalPages);
    
    return items;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      scheduled: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };

    return (
      <Badge variant={variants[priority] || "secondary"}>
        {priority}
      </Badge>
    );
  };

  const createMutation = useMutation({
    mutationFn: async (validated: WorkOrderForm) => {
      if (!organizationId) throw new Error("Missing organization");

      const woNumber = `WO-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase
        .from("work_orders")
        .insert({
          work_order_number: woNumber,
          vehicle_id: validated.vehicle_id,
          work_type: validated.work_type,
          priority: validated.priority,
          service_description: validated.service_description,
          scheduled_date: validated.scheduled_date ?? null,
          organization_id: organizationId,
          status: "pending",
          parts_cost: 0,
          labor_cost: 0,
          total_cost: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_orders", organizationId] });
      toast({ title: "Work order created successfully" });
      setIsDialogOpen(false);
      resetForm();
      setCurrentPage(1);
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to create work order";
      setFormError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkOrder> }) => {
      const { error } = await supabase
        .from("work_orders")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_orders", organizationId] });
      toast({ title: "Work order updated" });
      setViewDialogOpen(false);
      setSelectedWorkOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_orders")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_orders", organizationId] });
      toast({ title: "Work order deleted" });
      setDeleteDialogOpen(false);
      setSelectedWorkOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete work order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      work_type: "oil_change",
      priority: "medium",
      service_description: "",
      scheduled_date: "",
    });
    setFieldErrors({});
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    if (vehiclesError) {
      toast({
        title: "Vehicle list not available",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const parsed = workOrderSchema.safeParse(formData);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path?.[0];
        if (typeof key === "string" && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }

      setFieldErrors(nextErrors);

      toast({
        title: "Please fix the form",
        description: Object.values(nextErrors)[0] ?? "Invalid form data",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(parsed.data);
  };

  const handleViewWorkOrder = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setCostFormData({
      parts_cost: wo.parts_cost || 0,
      labor_cost: wo.labor_cost || 0,
      technician_name: wo.technician_name || "",
    });
    setViewDialogOpen(true);
  };

  const handleUpdateCosts = () => {
    if (!selectedWorkOrder) return;
    
    const totalCost = costFormData.parts_cost + costFormData.labor_cost;
    
    updateMutation.mutate({
      id: selectedWorkOrder.id,
      updates: {
        parts_cost: costFormData.parts_cost,
        labor_cost: costFormData.labor_cost,
        total_cost: totalCost,
        technician_name: costFormData.technician_name || null,
      },
    });
  };

  const handleCompleteWorkOrder = () => {
    if (!selectedWorkOrder) return;
    
    const totalCost = costFormData.parts_cost + costFormData.labor_cost;
    
    updateMutation.mutate({
      id: selectedWorkOrder.id,
      updates: {
        status: "completed",
        completed_date: new Date().toISOString(),
        parts_cost: costFormData.parts_cost,
        labor_cost: costFormData.labor_cost,
        total_cost: totalCost,
        technician_name: costFormData.technician_name || null,
      },
    });
  };

  const handleDeleteClick = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setDeleteDialogOpen(true);
  };

  const handleRowClick = (wo: WorkOrder) => {
    handleViewWorkOrder(wo);
  };

  if (organizationLoading || permissionsLoading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!organizationId) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        No organization found for your account.
      </div>
    );
  }

  if (workOrdersLoading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading work orders…</div>;
  }

  if (workOrdersError) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        Failed to load work orders. Please refresh.
      </div>
    );
  }

  const handleExportWorkOrders = () => {
    if (!filteredWorkOrders.length) return;

    const csvContent = [
      ['WO Number', 'Vehicle', 'Work Type', 'Status', 'Priority', 'Scheduled Date', 'Completed Date', 'Parts Cost', 'Labor Cost', 'Total Cost', 'Technician', 'Description'].join(','),
      ...filteredWorkOrders.map(wo => [
        wo.work_order_number,
        wo.vehicles?.plate_number || '',
        wo.work_type?.replace(/_/g, ' ') || '',
        wo.status?.replace(/_/g, ' ') || '',
        wo.priority || '',
        wo.scheduled_date ? format(new Date(wo.scheduled_date), 'yyyy-MM-dd') : '',
        wo.completed_date ? format(new Date(wo.completed_date), 'yyyy-MM-dd') : '',
        wo.parts_cost?.toFixed(2) || '0.00',
        wo.labor_cost?.toFixed(2) || '0.00',
        wo.total_cost?.toFixed(2) || '0.00',
        wo.technician_name || '',
        `"${(wo.service_description || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Work Orders ({filteredWorkOrders.length})</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExportWorkOrders}
            disabled={filteredWorkOrders.length === 0}
            aria-label="Export work orders to CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={resetForm} 
              disabled={!canCreateWorkOrder}
              aria-label="Create new work order"
              title={!canCreateWorkOrder ? "You need super_admin, maintenance_lead, or operations_manager role" : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Work Order</DialogTitle>
              <DialogDescription>
                Schedule a new maintenance work order
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertTitle>Couldn't create work order</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="wo-vehicle">Vehicle *</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, vehicle_id: value })
                    }
                  >
                    <SelectTrigger id="wo-vehicle" aria-label="Select vehicle">
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehiclesLoading ? (
                        <SelectItem value="__loading" disabled>
                          Loading vehicles…
                        </SelectItem>
                      ) : vehicles && vehicles.length > 0 ? (
                        vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          No vehicles available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fieldErrors.vehicle_id && (
                    <p className="mt-1 text-sm text-destructive">{fieldErrors.vehicle_id}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="wo-work-type">Work Type *</Label>
                  <Select
                    value={formData.work_type}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, work_type: value })
                    }
                  >
                    <SelectTrigger id="wo-work-type" aria-label="Select work type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oil_change">Oil Change</SelectItem>
                      <SelectItem value="tire_service">Tire Service</SelectItem>
                      <SelectItem value="brake_service">Brake Service</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="engine_repair">Engine Repair</SelectItem>
                      <SelectItem value="transmission_service">Transmission Service</SelectItem>
                      <SelectItem value="electrical_repair">Electrical Repair</SelectItem>
                      <SelectItem value="body_repair">Body Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wo-priority">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value as "low" | "medium" | "high" | "urgent" })
                    }
                  >
                    <SelectTrigger id="wo-priority" aria-label="Select priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wo-description">Description *</Label>
                  <Textarea
                    id="wo-description"
                    value={formData.service_description}
                    onChange={(e) =>
                      setFormData({ ...formData, service_description: e.target.value })
                    }
                    placeholder="Describe the work to be done..."
                    rows={3}
                    aria-describedby={fieldErrors.service_description ? "desc-error" : undefined}
                  />
                  {fieldErrors.service_description && (
                    <p id="desc-error" className="mt-1 text-sm text-destructive">{fieldErrors.service_description}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="wo-scheduled-date">Scheduled Date</Label>
                  <Input
                    id="wo-scheduled-date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || vehiclesLoading || !vehicles || vehicles.length === 0}
                >
                  {createMutation.isPending ? "Creating..." : "Create Work Order"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="work-orders-search"
            aria-label="Search work orders by number, type, vehicle, or description"
            placeholder="Search work orders..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedWorkOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No work orders found
              </TableCell>
            </TableRow>
          ) : (
            paginatedWorkOrders.map((wo) => (
              <TableRow 
                key={wo.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(wo)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(wo);
                  }
                }}
                aria-label={`View work order ${wo.work_order_number}`}
              >
                <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                <TableCell className="capitalize">{wo.work_type?.replace(/_/g, ' ')}</TableCell>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleViewWorkOrder(wo); }}
                      aria-label={`View details for ${wo.work_order_number}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(wo); }}
                        aria-label={`Delete ${wo.work_order_number}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination with ellipsis */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            {getPaginationItems().map((item, index) => (
              <PaginationItem key={index}>
                {item === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => setCurrentPage(item)}
                    isActive={currentPage === item}
                    className="cursor-pointer"
                    aria-current={currentPage === item ? "page" : undefined}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* View/Edit Work Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedWorkOrder?.work_order_number}
            </DialogTitle>
            <DialogDescription>
              View and update work order details
            </DialogDescription>
          </DialogHeader>
          {selectedWorkOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Vehicle</label>
                  <p className="font-medium">
                    {selectedWorkOrder.vehicles 
                      ? `${selectedWorkOrder.vehicles.plate_number} (${selectedWorkOrder.vehicles.make} ${selectedWorkOrder.vehicles.model})`
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Work Type</label>
                  <p className="font-medium capitalize">{selectedWorkOrder.work_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedWorkOrder.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Priority</label>
                  <div className="mt-1">{getPriorityBadge(selectedWorkOrder.priority)}</div>
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
              </div>

              {selectedWorkOrder.service_description && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedWorkOrder.service_description}</p>
                </div>
              )}

              {/* Cost tracking - only show for non-completed orders */}
              {selectedWorkOrder.status !== 'completed' && selectedWorkOrder.status !== 'cancelled' && (
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Cost Tracking</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parts-cost">Parts Cost ($)</Label>
                      <Input
                        id="parts-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={costFormData.parts_cost}
                        onChange={(e) => setCostFormData({ ...costFormData, parts_cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="labor-cost">Labor Cost ($)</Label>
                      <Input
                        id="labor-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={costFormData.labor_cost}
                        onChange={(e) => setCostFormData({ ...costFormData, labor_cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="technician">Technician Name</Label>
                    <Input
                      id="technician"
                      value={costFormData.technician_name}
                      onChange={(e) => setCostFormData({ ...costFormData, technician_name: e.target.value })}
                      placeholder="Assigned technician"
                    />
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-primary">
                      ${(costFormData.parts_cost + costFormData.labor_cost).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                  </div>
                </div>
              )}

              {/* Show costs for completed orders */}
              {(selectedWorkOrder.status === 'completed' || selectedWorkOrder.status === 'cancelled') && (
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
                  {selectedWorkOrder.technician_name && (
                    <div className="mt-4">
                      <label className="text-sm text-muted-foreground">Technician</label>
                      <p className="font-medium">{selectedWorkOrder.technician_name}</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                {selectedWorkOrder.status !== 'completed' && selectedWorkOrder.status !== 'cancelled' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleUpdateCosts}
                      disabled={updateMutation.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button
                      onClick={handleCompleteWorkOrder}
                      disabled={updateMutation.isPending}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete Work Order
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete work order {selectedWorkOrder?.work_order_number}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedWorkOrder && deleteMutation.mutate(selectedWorkOrder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkOrdersTab;
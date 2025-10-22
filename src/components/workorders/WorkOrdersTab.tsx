import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";

const workOrderSchema = z.object({
  work_type: z.string().trim().min(1, "Work type is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  service_description: z.string().trim().min(1, "Description is required").max(500),
  scheduled_date: z.string().optional(),
});

const WorkOrdersTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    work_type: "oil_change",
    priority: "medium" as const,
    service_description: "",
    scheduled_date: "",
  });

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

  // Filter and search
  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    
    return workOrders.filter((wo: any) => {
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

  // Pagination
  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage);
  const paginatedWorkOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkOrders.slice(start, start + itemsPerPage);
  }, [filteredWorkOrders, currentPage]);

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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validated = workOrderSchema.parse(data);
      const woNumber = `WO-${Date.now().toString().slice(-8)}`;
      
      const { error } = await (supabase as any)
        .from("work_orders")
        .insert({
          work_order_number: woNumber,
          work_type: validated.work_type,
          priority: validated.priority,
          service_description: validated.service_description,
          scheduled_date: validated.scheduled_date || null,
          organization_id: organizationId,
          status: "scheduled",
          parts_cost: 0,
          labor_cost: 0,
          total_cost: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_orders"] });
      toast({ title: "Work order created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      work_type: "oil_change",
      priority: "medium",
      service_description: "",
      scheduled_date: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Work Orders ({filteredWorkOrders.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
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
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="work_type">Work Type *</Label>
                  <Select
                    value={formData.work_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, work_type: value })
                    }
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="service_description">Description *</Label>
                  <Textarea
                    id="service_description"
                    value={formData.service_description}
                    onChange={(e) =>
                      setFormData({ ...formData, service_description: e.target.value })
                    }
                    placeholder="Describe the work to be done..."
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Work Order"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedWorkOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No work orders found
              </TableCell>
            </TableRow>
          ) : (
            paginatedWorkOrders.map((wo: any) => (
            <TableRow key={wo.id}>
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
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default WorkOrdersTab;

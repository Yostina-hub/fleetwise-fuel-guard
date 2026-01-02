import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const routeSchema = z.object({
  route_name: z.string().trim().min(1, "Route name is required").max(100),
  route_code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  frequency: z.enum(["daily", "weekly", "adhoc"]),
});

const RoutesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    route_name: "",
    route_code: "",
    description: "",
    frequency: "adhoc" as const,
  });

  const { data: routes, isLoading } = useQuery({
    queryKey: ["routes", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("routes")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Filter and search
  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    
    return routes.filter((route: any) => {
      const matchesSearch = searchQuery === "" || 
        route.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.route_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFrequency = frequencyFilter === "all" || route.frequency === frequencyFilter;
      
      return matchesSearch && matchesFrequency;
    });
  }, [routes, searchQuery, frequencyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRoutes.slice(start, start + itemsPerPage);
  }, [filteredRoutes, currentPage]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validated = routeSchema.parse(data);
      const { error } = await (supabase as any)
        .from("routes")
        .insert({
          ...validated,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route created successfully" });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const validated = routeSchema.parse(data);
      const { error } = await (supabase as any)
        .from("routes")
        .update(validated)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route updated successfully" });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route deleted successfully" });
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
      route_name: "",
      route_code: "",
      description: "",
      frequency: "adhoc",
    });
    setEditingRoute(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      route_code: route.route_code || "",
      description: route.description || "",
      frequency: route.frequency,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div role="status" aria-live="polite" className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Planned Routes ({filteredRoutes.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} aria-label="Add new route">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoute ? "Edit Route" : "Create New Route"}
              </DialogTitle>
              <DialogDescription>
                Define a route with waypoints and schedule
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="route_name">Route Name *</Label>
                  <Input
                    id="route_name"
                    value={formData.route_name}
                    onChange={(e) =>
                      setFormData({ ...formData, route_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="route_code">Route Code</Label>
                  <Input
                    id="route_code"
                    value={formData.route_code}
                    onChange={(e) =>
                      setFormData({ ...formData, route_code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="adhoc">Ad-hoc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">
                  {editingRoute ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
            aria-label="Search routes"
          />
        </div>
        <Select value={frequencyFilter} onValueChange={(value) => { setFrequencyFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by frequency">
            <SelectValue placeholder="Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequency</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="adhoc">Ad-hoc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Route Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRoutes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8" role="status" aria-label="No routes found">
                No routes found
              </TableCell>
            </TableRow>
          ) : (
            paginatedRoutes.map((route) => (
            <TableRow key={route.id}>
              <TableCell className="font-medium">{route.route_name}</TableCell>
              <TableCell>{route.route_code || "-"}</TableCell>
              <TableCell className="capitalize">{route.frequency}</TableCell>
              <TableCell>
                {route.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(route)}
                    aria-label={`Edit ${route.route_name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(route.id)}
                    aria-label={`Delete ${route.route_name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination aria-label="Routes pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-label="Go to previous page"
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-label="Go to next page"
                aria-disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default RoutesTab;

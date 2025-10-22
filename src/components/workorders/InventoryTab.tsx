import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const inventorySchema = z.object({
  part_number: z.string().trim().min(1, "Part number is required").max(50),
  part_name: z.string().trim().min(1, "Part name is required").max(100),
  category: z.enum(["engine", "transmission", "brakes", "tires", "electrical", "body", "other"]),
  current_quantity: z.number().min(0),
  minimum_quantity: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  unit_of_measure: z.string().trim().max(20),
});

const InventoryTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    part_number: "",
    part_name: "",
    category: "other" as const,
    current_quantity: 0,
    minimum_quantity: 0,
    unit_cost: 0,
    unit_of_measure: "pcs",
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory_items", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_items")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("part_name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const isLowStock = (item: any) => {
    return item.minimum_quantity && item.current_quantity <= item.minimum_quantity;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validated = inventorySchema.parse(data);
      const { error } = await (supabase as any)
        .from("inventory_items")
        .insert({
          ...validated,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast({ title: "Inventory item added successfully" });
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
      part_number: "",
      part_name: "",
      category: "other",
      current_quantity: 0,
      minimum_quantity: 0,
      unit_cost: 0,
      unit_of_measure: "pcs",
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
        <h3 className="text-lg font-semibold">Parts Inventory</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Inventory Part</DialogTitle>
              <DialogDescription>
                Add a new part to your inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="part_number">Part Number *</Label>
                    <Input
                      id="part_number"
                      value={formData.part_number}
                      onChange={(e) =>
                        setFormData({ ...formData, part_number: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engine">Engine</SelectItem>
                        <SelectItem value="transmission">Transmission</SelectItem>
                        <SelectItem value="brakes">Brakes</SelectItem>
                        <SelectItem value="tires">Tires</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="body">Body</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="part_name">Part Name *</Label>
                  <Input
                    id="part_name"
                    value={formData.part_name}
                    onChange={(e) =>
                      setFormData({ ...formData, part_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="current_quantity">Current Qty *</Label>
                    <Input
                      id="current_quantity"
                      type="number"
                      value={formData.current_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, current_quantity: parseFloat(e.target.value) || 0 })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimum_quantity">Min Qty</Label>
                    <Input
                      id="minimum_quantity"
                      type="number"
                      value={formData.minimum_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, minimum_quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_of_measure">Unit</Label>
                    <Input
                      id="unit_of_measure"
                      value={formData.unit_of_measure}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_of_measure: e.target.value })
                      }
                      placeholder="pcs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="unit_cost">Unit Cost ($)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Part"}
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
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="engine">Engine</SelectItem>
            <SelectItem value="transmission">Transmission</SelectItem>
            <SelectItem value="brakes">Brakes</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="suspension">Suspension</SelectItem>
            <SelectItem value="tires">Tires</SelectItem>
            <SelectItem value="filters">Filters</SelectItem>
            <SelectItem value="fluids">Fluids</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(value) => { setStockFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stock Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part Number</TableHead>
            <TableHead>Part Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Current Qty</TableHead>
            <TableHead>Min Qty</TableHead>
            <TableHead>Unit Cost</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.part_number}</TableCell>
              <TableCell>{item.part_name}</TableCell>
              <TableCell className="capitalize">{item.category}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {item.current_quantity} {item.unit_of_measure}
                  {isLowStock(item) && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {item.minimum_quantity ? `${item.minimum_quantity} ${item.unit_of_measure}` : "-"}
              </TableCell>
              <TableCell>
                {item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : "-"}
              </TableCell>
              <TableCell>
                {isLowStock(item) ? (
                  <Badge variant="destructive">Low Stock</Badge>
                ) : (
                  <Badge variant="outline">In Stock</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
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

export default InventoryTab;

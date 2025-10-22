import { useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    route_name: "",
    route_code: "",
    description: "",
    frequency: "adhoc" as const,
  });

  const { data: routes, isLoading } = useQuery({
    queryKey: ["routes", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validated = routeSchema.parse(data);
      const { error } = await supabase
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
      const { error } = await supabase
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
      const { error } = await supabase.from("routes").delete().eq("id", id);
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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Planned Routes</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
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
          {routes?.map((route) => (
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
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(route.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RoutesTab;

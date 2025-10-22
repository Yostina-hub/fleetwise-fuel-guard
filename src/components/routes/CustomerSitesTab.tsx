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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const siteSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required").max(100),
  site_name: z.string().trim().min(1, "Site name is required").max(100),
  site_code: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  contact_person: z.string().trim().max(100).optional(),
  contact_phone: z.string().trim().max(20).optional(),
  contact_email: z.string().trim().email().max(100).optional().or(z.literal("")),
});

const CustomerSitesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    site_name: "",
    site_code: "",
    address: "",
    contact_person: "",
    contact_phone: "",
    contact_email: "",
  });

  const { data: sites, isLoading } = useQuery({
    queryKey: ["customer_sites", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_sites")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("customer_name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validated = siteSchema.parse(data);
      const { error } = await (supabase as any)
        .from("customer_sites")
        .insert({
          ...validated,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_sites"] });
      toast({ title: "Customer site created successfully" });
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
      const validated = siteSchema.parse(data);
      const { error } = await (supabase as any)
        .from("customer_sites")
        .update(validated)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_sites"] });
      toast({ title: "Customer site updated successfully" });
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
      const { error} = await (supabase as any).from("customer_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_sites"] });
      toast({ title: "Customer site deleted successfully" });
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
      customer_name: "",
      site_name: "",
      site_code: "",
      address: "",
      contact_person: "",
      contact_phone: "",
      contact_email: "",
    });
    setEditingSite(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (site: any) => {
    setEditingSite(site);
    setFormData({
      customer_name: site.customer_name,
      site_name: site.site_name,
      site_code: site.site_code || "",
      address: site.address || "",
      contact_person: site.contact_person || "",
      contact_phone: site.contact_phone || "",
      contact_email: site.contact_email || "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customer Sites</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSite ? "Edit Customer Site" : "Create New Customer Site"}
              </DialogTitle>
              <DialogDescription>
                Add delivery/pickup location details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) =>
                        setFormData({ ...formData, customer_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="site_name">Site Name *</Label>
                    <Input
                      id="site_name"
                      value={formData.site_name}
                      onChange={(e) =>
                        setFormData({ ...formData, site_name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="site_code">Site Code</Label>
                  <Input
                    id="site_code"
                    value={formData.site_code}
                    onChange={(e) =>
                      setFormData({ ...formData, site_code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_person: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_email: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">
                  {editingSite ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Site Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites?.map((site) => (
            <TableRow key={site.id}>
              <TableCell className="font-medium">{site.customer_name}</TableCell>
              <TableCell>{site.site_name}</TableCell>
              <TableCell>{site.site_code || "-"}</TableCell>
              <TableCell>{site.contact_person || "-"}</TableCell>
              <TableCell>
                {site.is_active ? (
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
                    onClick={() => handleEdit(site)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(site.id)}
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

export default CustomerSitesTab;

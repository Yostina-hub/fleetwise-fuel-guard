import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Pencil, Trash2, Search, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Type definition for customer site
interface CustomerSite {
  id: string;
  organization_id: string;
  customer_name: string;
  site_name: string;
  site_code: string | null;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const siteSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required").max(100, "Customer name must be less than 100 characters"),
  site_name: z.string().trim().min(1, "Site name is required").max(100, "Site name must be less than 100 characters"),
  site_code: z.string().trim().max(50, "Site code must be less than 50 characters").optional(),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional(),
  contact_person: z.string().trim().max(100, "Contact person must be less than 100 characters").optional(),
  contact_phone: z.string().trim().max(20, "Contact phone must be less than 20 characters").optional(),
  contact_email: z.string().trim().email("Invalid email address").max(100, "Email must be less than 100 characters").optional().or(z.literal("")),
});

type SiteFormData = z.infer<typeof siteSchema>;
type FormErrors = Partial<Record<keyof SiteFormData, string>>;

const CustomerSitesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CustomerSite | null>(null);
  const [viewingSite, setViewingSite] = useState<CustomerSite | null>(null);
  const [deletingSite, setDeletingSite] = useState<CustomerSite | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<SiteFormData>({
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
      return data as CustomerSite[];
    },
    enabled: !!organizationId,
  });

  // Filter and search
  const filteredSites = useMemo(() => {
    if (!sites) return [];
    
    return sites.filter((site: CustomerSite) => {
      const matchesSearch = searchQuery === "" || 
        site.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.site_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.contact_person?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [sites, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const paginatedSites = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSites.slice(start, start + itemsPerPage);
  }, [filteredSites, currentPage]);

  // Generate pagination items with ellipsis
  const getPaginationItems = () => {
    const items: (number | "ellipsis")[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push("ellipsis");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) items.push(i);
      
      if (currentPage < totalPages - 2) items.push("ellipsis");
      items.push(totalPages);
    }
    
    return items;
  };

  const createMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SiteFormData }) => {
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("customer_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_sites"] });
      toast({ title: "Customer site deleted successfully" });
      setIsDeleteDialogOpen(false);
      setDeletingSite(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("customer_sites")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_sites"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
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
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    try {
      siteSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: FormErrors = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof SiteFormData;
          errors[field] = err.message;
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (site: CustomerSite) => {
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
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleView = (site: CustomerSite) => {
    setViewingSite(site);
    setIsViewDialogOpen(true);
  };

  const handleDeleteClick = (site: CustomerSite, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSite(site);
    setIsDeleteDialogOpen(true);
  };

  const handleRowClick = (site: CustomerSite) => {
    handleView(site);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, site: CustomerSite) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleView(site);
    }
  };

  const handleExport = () => {
    if (!filteredSites.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Customer Name", "Site Name", "Site Code", "Address", "Contact Person", "Contact Phone", "Contact Email", "Status"];
    const rows = filteredSites.map((site) => [
      site.customer_name,
      site.site_name,
      site.site_code || "",
      site.address || "",
      site.contact_person || "",
      site.contact_phone || "",
      site.contact_email || "",
      site.is_active ? "Active" : "Inactive",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customer_sites_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export successful" });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customer Sites ({filteredSites.length})</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            aria-label="Export customer sites to CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} aria-label="Add new customer site">
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
                  {editingSite ? "Update the customer site details below." : "Add delivery/pickup location details."}
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
                        aria-invalid={!!formErrors.customer_name}
                        aria-describedby={formErrors.customer_name ? "customer_name-error" : undefined}
                      />
                      {formErrors.customer_name && (
                        <p id="customer_name-error" className="text-sm text-destructive mt-1">
                          {formErrors.customer_name}
                        </p>
                      )}
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
                        aria-invalid={!!formErrors.site_name}
                        aria-describedby={formErrors.site_name ? "site_name-error" : undefined}
                      />
                      {formErrors.site_name && (
                        <p id="site_name-error" className="text-sm text-destructive mt-1">
                          {formErrors.site_name}
                        </p>
                      )}
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
                      aria-invalid={!!formErrors.site_code}
                      aria-describedby={formErrors.site_code ? "site_code-error" : undefined}
                    />
                    {formErrors.site_code && (
                      <p id="site_code-error" className="text-sm text-destructive mt-1">
                        {formErrors.site_code}
                      </p>
                    )}
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
                      aria-invalid={!!formErrors.address}
                      aria-describedby={formErrors.address ? "address-error" : undefined}
                    />
                    {formErrors.address && (
                      <p id="address-error" className="text-sm text-destructive mt-1">
                        {formErrors.address}
                      </p>
                    )}
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
                        aria-invalid={!!formErrors.contact_person}
                        aria-describedby={formErrors.contact_person ? "contact_person-error" : undefined}
                      />
                      {formErrors.contact_person && (
                        <p id="contact_person-error" className="text-sm text-destructive mt-1">
                          {formErrors.contact_person}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, contact_phone: e.target.value })
                        }
                        aria-invalid={!!formErrors.contact_phone}
                        aria-describedby={formErrors.contact_phone ? "contact_phone-error" : undefined}
                      />
                      {formErrors.contact_phone && (
                        <p id="contact_phone-error" className="text-sm text-destructive mt-1">
                          {formErrors.contact_phone}
                        </p>
                      )}
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
                        aria-invalid={!!formErrors.contact_email}
                        aria-describedby={formErrors.contact_email ? "contact_email-error" : undefined}
                      />
                      {formErrors.contact_email && (
                        <p id="contact_email-error" className="text-sm text-destructive mt-1">
                          {formErrors.contact_email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSite ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customer sites..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
          aria-label="Search customer sites"
        />
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
          {paginatedSites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No customer sites found
              </TableCell>
            </TableRow>
          ) : (
            paginatedSites.map((site) => (
              <TableRow 
                key={site.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRowClick(site)}
                onKeyDown={(e) => handleRowKeyDown(e, site)}
                aria-label={`View details for ${site.customer_name} - ${site.site_name}`}
              >
                <TableCell className="font-medium">{site.customer_name}</TableCell>
                <TableCell>{site.site_name}</TableCell>
                <TableCell>{site.site_code || "-"}</TableCell>
                <TableCell>{site.contact_person || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={site.is_active}
                      onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: site.id, isActive: checked })}
                      aria-label={`Toggle status for ${site.site_name}`}
                    />
                    <Badge variant={site.is_active ? "default" : "secondary"}>
                      {site.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleView(site); }}
                      aria-label={`View ${site.site_name} details`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleEdit(site); }}
                      aria-label={`Edit ${site.site_name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(site, e)}
                      aria-label={`Delete ${site.site_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage === 1}
                aria-label="Go to previous page"
              />
            </PaginationItem>
            {getPaginationItems().map((item, index) => (
              <PaginationItem key={index}>
                {item === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => setCurrentPage(item)}
                    isActive={currentPage === item}
                    className="cursor-pointer"
                    aria-label={`Go to page ${item}`}
                    aria-current={currentPage === item ? "page" : undefined}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage === totalPages}
                aria-label="Go to next page"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Site Details</DialogTitle>
            <DialogDescription>
              View customer site information.
            </DialogDescription>
          </DialogHeader>
          {viewingSite && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer Name</Label>
                  <p className="font-medium">{viewingSite.customer_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Site Name</Label>
                  <p className="font-medium">{viewingSite.site_name}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Site Code</Label>
                <p className="font-medium">{viewingSite.site_code || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{viewingSite.address || "-"}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Contact Person</Label>
                  <p className="font-medium">{viewingSite.contact_person || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewingSite.contact_phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewingSite.contact_email || "-"}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant={viewingSite.is_active ? "default" : "secondary"} className="mt-1">
                  {viewingSite.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (viewingSite) handleEdit(viewingSite); }}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSite?.customer_name} - {deletingSite?.site_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSite(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSite && deleteMutation.mutate(deletingSite.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerSitesTab;

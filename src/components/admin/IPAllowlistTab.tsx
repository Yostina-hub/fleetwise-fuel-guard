import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useToast } from "@/hooks/use-toast";
import { friendlyToastError } from "@/lib/errorMessages";

interface IPFormData {
  name: string;
  ip_address: string;
  applies_to: string;
  description: string;
  is_active: boolean;
}

const emptyForm: IPFormData = {
  name: "",
  ip_address: "",
  applies_to: "all",
  description: "",
  is_active: true,
};

const IPAllowlistTab = () => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ITEMS_PER_PAGE = 10;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<IPFormData>({ ...emptyForm });

  const { data: ipAllowlists, isLoading } = useQuery({
    queryKey: ["ip_allowlists", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ip_allowlists")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: IPFormData) => {
      const { error } = await (supabase as any).from("ip_allowlists").insert({
        organization_id: organizationId,
        name: data.name,
        ip_address: data.ip_address,
        applies_to: data.applies_to,
        description: data.description || null,
        is_active: data.is_active,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip_allowlists"] });
      toast({ title: "IP range added" });
      closeDialog();
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IPFormData }) => {
      const { error } = await (supabase as any).from("ip_allowlists").update({
        name: data.name,
        ip_address: data.ip_address,
        applies_to: data.applies_to,
        description: data.description || null,
        is_active: data.is_active,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip_allowlists"] });
      toast({ title: "IP range updated" });
      closeDialog();
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ip_allowlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip_allowlists"] });
      toast({ title: "IP range deleted" });
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
  };

  const handleEdit = (ip: any) => {
    setEditingId(ip.id);
    setFormData({
      name: ip.name || "",
      ip_address: ip.ip_address || "",
      applies_to: ip.applies_to || "all",
      description: ip.description || "",
      is_active: ip.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.ip_address.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this IP range?")) deleteMutation.mutate(id);
  };

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(ipAllowlists?.length || 0, ITEMS_PER_PAGE);
  const paginatedIPs = useMemo(() => ipAllowlists?.slice(startIndex, endIndex) || [], [ipAllowlists, startIndex, endIndex]);

  if (isLoading) return <div role="status" aria-live="polite">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">IP Address Allowlists ({ipAllowlists?.length || 0})</h3>
          <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses or ranges (CIDR notation supported)</p>
        </div>
        <Button onClick={() => { setFormData({ ...emptyForm }); setEditingId(null); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add IP Range
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>IP Address/Range</TableHead>
            <TableHead>Applies To</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedIPs.map((ip: any) => (
            <TableRow key={ip.id}>
              <TableCell className="font-medium">{ip.name}</TableCell>
              <TableCell className="font-mono">{ip.ip_address}</TableCell>
              <TableCell className="capitalize">{ip.applies_to}</TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">{ip.description || "-"}</TableCell>
              <TableCell>{ip.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(ip)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ip.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {ipAllowlists && ipAllowlists.length > ITEMS_PER_PAGE && (
        <TablePagination currentPage={currentPage} totalItems={ipAllowlists.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      )}

      {ipAllowlists?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No IP allowlists configured</p>
          <p className="text-sm mt-2">Add IP addresses to restrict access</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} IP Range</DialogTitle>
            <DialogDescription>Configure an IP address or CIDR range for access control</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Office Network" />
            </div>
            <div className="space-y-2">
              <Label>IP Address / CIDR Range</Label>
              <Input value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} placeholder="e.g. 192.168.1.0/24 or 10.0.0.1" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={formData.applies_to} onValueChange={(v) => setFormData({ ...formData, applies_to: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                  <SelectItem value="api">API Access Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe this IP range..." rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Update" : "Add"} IP Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IPAllowlistTab;

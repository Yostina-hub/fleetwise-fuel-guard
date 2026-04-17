import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, ArrowRight, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const SubstitutionsTab = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    delegator_name: "", delegator_id: "", delegate_name: "", delegate_id: "",
    scope: "all", valid_from: "", valid_until: "", reason: "",
  });

  const { data: delegations = [], isLoading } = useQuery({
    queryKey: ["delegation-matrix", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("delegation_matrix")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["org-profiles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", organizationId!)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const resetForm = () => setForm({
    delegator_name: "", delegator_id: "", delegate_name: "", delegate_id: "",
    scope: "all", valid_from: "", valid_until: "", reason: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: organizationId!,
        delegator_id: form.delegator_id,
        delegator_name: form.delegator_name,
        delegate_id: form.delegate_id,
        delegate_name: form.delegate_name,
        scope: form.scope,
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
        reason: form.reason || null,
        is_active: true,
      };
      if (editItem) {
        const { error } = await supabase.from("delegation_matrix").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delegation_matrix").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editItem ? "Substitution updated" : "Substitution created");
      queryClient.invalidateQueries({ queryKey: ["delegation-matrix"] });
      setShowAdd(false); setEditItem(null); resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("delegation_matrix").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delegation-matrix"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delegation_matrix").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["delegation-matrix"] });
    },
  });

  const openEdit = (d: any) => {
    setEditItem(d);
    setForm({
      delegator_name: d.delegator_name, delegator_id: d.delegator_id,
      delegate_name: d.delegate_name, delegate_id: d.delegate_id,
      scope: d.scope || "all",
      valid_from: d.valid_from ? d.valid_from.split("T")[0] : "",
      valid_until: d.valid_until ? d.valid_until.split("T")[0] : "",
      reason: d.reason || "",
    });
    setShowAdd(true);
  };

  const active = delegations.filter((d: any) => d.is_active);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div><p className="text-2xl font-bold">{delegations.length}</p><p className="text-xs text-muted-foreground">Total Substitutions</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-7 w-7 text-emerald-500" />
          <div><p className="text-2xl font-bold">{active.length}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-7 w-7 text-muted-foreground" />
          <div><p className="text-2xl font-bold">{delegations.length - active.length}</p><p className="text-xs text-muted-foreground">Expired/Inactive</p></div>
        </CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setEditItem(null); setShowAdd(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Substitution
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Person-to-Person Substitutions</CardTitle>
          <p className="text-xs text-muted-foreground">Temporary delegation of approval authority (e.g., during leave).</p>
        </CardHeader>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Delegator</TableHead><TableHead></TableHead><TableHead>Delegate</TableHead>
            <TableHead>Scope</TableHead><TableHead>Valid From</TableHead><TableHead>Valid Until</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
            delegations.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No substitutions configured</TableCell></TableRow> :
            delegations.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.delegator_name}</TableCell>
                <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                <TableCell className="font-medium">{d.delegate_name}</TableCell>
                <TableCell className="capitalize">{d.scope || "All"}</TableCell>
                <TableCell>{format(new Date(d.valid_from), "MMM dd, yyyy")}</TableCell>
                <TableCell>{d.valid_until ? format(new Date(d.valid_until), "MMM dd, yyyy") : "Indefinite"}</TableCell>
                <TableCell>
                  <Badge
                    variant={d.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleActive.mutate({ id: d.id, is_active: !d.is_active })}
                  >
                    {d.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={(v) => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Substitution" : "Add Substitution"}</DialogTitle>
            <DialogDescription>Temporarily delegate approval authority from one user to another.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delegator (From) *</Label>
                <Select value={form.delegator_id} onValueChange={(v) => {
                  const p = profiles.find((p: any) => p.id === v);
                  setForm(f => ({ ...f, delegator_id: v, delegator_name: (p as any)?.full_name || (p as any)?.email || "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delegate (To) *</Label>
                <Select value={form.delegate_id} onValueChange={(v) => {
                  const p = profiles.find((p: any) => p.id === v);
                  setForm(f => ({ ...f, delegate_id: v, delegate_name: (p as any)?.full_name || (p as any)?.email || "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v) => setForm(f => ({ ...f, scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvals</SelectItem>
                  <SelectItem value="vehicle_requests">Vehicle Requests</SelectItem>
                  <SelectItem value="fuel_requests">Fuel Requests</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="dispatch">Dispatch</SelectItem>
                  <SelectItem value="trips">Trips</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valid From *</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
              <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
            </div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Annual leave coverage" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.delegator_id || !form.delegate_id || !form.valid_from || save.isPending}>
              {save.isPending ? "Saving..." : editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

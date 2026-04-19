import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Assignment {
  id: string;
  supplier_user_id: string;
  vendor_id: string | null;
  is_active: boolean;
  created_at: string;
  vendor?: { company_name: string } | null;
  user?: { full_name: string | null; email: string | null } | null;
}

export default function SupplierAssignmentsTab() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [vendorId, setVendorId] = useState<string>("");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["maintenance-supplier-assignments", organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as Assignment[];
      const { data, error } = await (supabase as any)
        .from("maintenance_supplier_assignments")
        .select("*, vendor:supplier_profiles(company_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = Array.from(new Set((data ?? []).map((d: any) => d.supplier_user_id).filter(Boolean)));
      let usersMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        usersMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      }
      return (data ?? []).map((a: any) => ({ ...a, user: usersMap[a.supplier_user_id] ?? null })) as Assignment[];
    },
    enabled: !!organizationId,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["supplier-profiles", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await (supabase as any)
        .from("supplier_profiles")
        .select("id, company_name")
        .eq("organization_id", organizationId)
        .order("company_name");
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  const createAssignment = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      if (!email.trim()) throw new Error("Email required");
      if (!vendorId) throw new Error("Vendor required");

      // Find user by email via profiles
      const { data: prof, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("id")
        .ilike("email", email.trim())
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prof?.id) {
        throw new Error("No user found with that email. Have them sign up first, then retry.");
      }

      // Ensure supplier role exists
      await (supabase as any).from("user_roles").upsert(
        { user_id: prof.id, role: "supplier" },
        { onConflict: "user_id,role" }
      );

      const { error } = await (supabase as any)
        .from("maintenance_supplier_assignments")
        .insert({
          organization_id: organizationId,
          supplier_user_id: prof.id,
          vendor_id: vendorId,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier assigned");
      setOpen(false);
      setEmail("");
      setVendorId("");
      qc.invalidateQueries({ queryKey: ["maintenance-supplier-assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("maintenance_supplier_assignments")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance-supplier-assignments"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("maintenance_supplier_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["maintenance-supplier-assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" /> Supplier Portal Assignments
          </CardTitle>
          <CardDescription>
            Map supplier users to vendor records. Assigned suppliers can see and act on work orders for their vendors via the Supplier Portal.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <UserPlus className="w-4 h-4" /> Assign Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Supplier User to Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Supplier user email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supplier@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The user must have already signed up. They'll automatically be granted the supplier role.
                </p>
              </div>
              <div>
                <Label>Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createAssignment.mutate()} disabled={createAssignment.isPending}>
                {createAssignment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : assignments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No supplier assignments yet. Click "Assign Supplier" to grant a vendor user portal access.
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">
                      {a.user?.full_name || a.user?.email || a.supplier_user_id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {a.vendor?.company_name ?? "Unknown vendor"}
                    </Badge>
                    {!a.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.user?.email} · Assigned {format(new Date(a.created_at), "PPP")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: a.id, is_active: v })}
                    />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remove this supplier assignment?")) remove.mutate(a.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

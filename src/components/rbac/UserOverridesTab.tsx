/**
 * UserOverridesTab — per-user permission overrides editor.
 *
 * Lets Super Admins (any user) and Org Admins (users in their organization)
 * grant or revoke individual permissions for a specific user, overriding the
 * role-based defaults from the permission matrix.
 *
 * Backed by `public.user_permission_overrides` and resolved server-side by
 * `public.has_permission` (override wins over role mapping).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Trash2, UserCog, ShieldCheck, ShieldOff, Plus } from "lucide-react";

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string | null;
}

interface OverrideRow {
  id: string;
  user_id: string;
  permission_id: string;
  effect: "granted" | "revoked";
  reason: string | null;
  created_at: string;
  permissions?: Pick<Permission, "name" | "resource" | "action"> | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export const UserOverridesTab = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const { organizationId } = useOrganization();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedPermission, setSelectedPermission] = useState<string>("");
  const [effect, setEffect] = useState<"granted" | "revoked">("granted");
  const [reason, setReason] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Profiles: super_admin sees all, org_admin sees only their org.
      let profilesQ = supabase
        .from("profiles")
        .select("id, full_name, email, organization_id")
        .order("full_name", { ascending: true })
        .limit(1000);
      if (!isSuperAdmin && organizationId) {
        profilesQ = profilesQ.eq("organization_id", organizationId);
      }

      const [profilesRes, permsRes, ovRes] = await Promise.all([
        profilesQ,
        supabase
          .from("permissions")
          .select("id, name, resource, action, description")
          .order("resource")
          .order("action"),
        supabase
          .from("user_permission_overrides")
          .select(`
            id, user_id, permission_id, effect, reason, created_at,
            permissions ( name, resource, action ),
            profiles!user_permission_overrides_user_id_fkey ( full_name, email )
          `)
          .order("created_at", { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (ovRes.error) throw ovRes.error;

      setUsers((profilesRes.data || []) as UserRow[]);
      setPermissions((permsRes.data || []) as Permission[]);
      setOverrides((ovRes.data || []) as unknown as OverrideRow[]);
    } catch (err: any) {
      // The implicit FK alias may not exist; fall back to a manual join.
      try {
        const { data: ovRows } = await supabase
          .from("user_permission_overrides")
          .select("id, user_id, permission_id, effect, reason, created_at")
          .order("created_at", { ascending: false });
        setOverrides((ovRows || []) as OverrideRow[]);
      } catch {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, organizationId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const permMap = useMemo(() => {
    const m = new Map<string, Permission>();
    permissions.forEach((p) => m.set(p.id, p));
    return m;
  }, [permissions]);

  const handleAdd = async () => {
    if (!selectedUser || !selectedPermission) {
      toast({
        title: "Missing fields",
        description: "Pick a user and a permission.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const target = userMap.get(selectedUser);
      const orgId = target?.organization_id || organizationId || null;

      const { error } = await supabase
        .from("user_permission_overrides")
        .upsert(
          {
            user_id: selectedUser,
            permission_id: selectedPermission,
            organization_id: orgId,
            effect,
            reason: reason.trim() || null,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          } as any,
          { onConflict: "user_id,permission_id" },
        );
      if (error) throw error;

      toast({
        title: "Override saved",
        description: `Permission ${effect} for selected user.`,
      });
      setSelectedPermission("");
      setReason("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_permission_overrides")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      toast({ title: "Removed", description: "Override deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Override Card */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Per-User Permission Overrides
          </CardTitle>
          <CardDescription>
            Grant or revoke a single permission for a specific user. Overrides
            always win over the role-based matrix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Form */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">User</label>
              <div className="relative mt-1.5">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={selectedUser || "none"} onValueChange={(v) => setSelectedUser(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 mt-2 text-xs">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Select user...</SelectItem>
                  {filteredUsers.slice(0, 200).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || u.id.slice(0, 8)}
                      {u.email ? ` · ${u.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Permission</label>
              <Select value={selectedPermission || "none"} onValueChange={(v) => setSelectedPermission(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 mt-1.5 text-xs">
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Select permission...</SelectItem>
                  {permissions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.resource}.{p.action} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Effect</label>
              <Select value={effect} onValueChange={(v) => setEffect(v as "granted" | "revoked")}>
                <SelectTrigger className="h-9 mt-1.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="granted">Grant</SelectItem>
                  <SelectItem value="revoked">Revoke</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
              <Input
                className="h-9 mt-1.5 text-xs"
                placeholder="e.g. Temporary access for audit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <Button
                onClick={handleAdd}
                disabled={saving || !selectedUser || !selectedPermission}
                className="h-9 w-full gap-1.5"
                size="sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Overrides */}
      <Card className="glass-strong">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active Overrides</CardTitle>
          <CardDescription>
            {overrides.length} override{overrides.length === 1 ? "" : "s"} configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : overrides.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No per-user overrides configured</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                All users get the permissions defined by their roles.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Permission</TableHead>
                  <TableHead className="text-xs">Effect</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((ov) => {
                  const u = userMap.get(ov.user_id);
                  const p = ov.permissions || permMap.get(ov.permission_id);
                  return (
                    <TableRow key={ov.id} className="border-border/20 hover:bg-muted/10">
                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {ov.profiles?.full_name || u?.full_name || u?.email || ov.user_id.slice(0, 8)}
                        </div>
                        {(ov.profiles?.email || u?.email) && (
                          <div className="text-[10px] text-muted-foreground">
                            {ov.profiles?.email || u?.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p ? (
                          <span className="font-mono">
                            {p.resource}.{p.action}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{ov.permission_id.slice(0, 8)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ov.effect === "granted" ? (
                          <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20" variant="outline">
                            <ShieldCheck className="w-3 h-3" /> Granted
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] gap-1 bg-rose-500/10 text-rose-400 border-rose-500/20" variant="outline">
                            <ShieldOff className="w-3 h-3" /> Revoked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {ov.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(ov.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserOverridesTab;

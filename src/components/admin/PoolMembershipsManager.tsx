/**
 * PoolMembershipsManager
 * ----------------------
 * Admin screen to assign users to fleet pools as `member` or `manager`.
 * Backed by `public.pool_memberships`.
 *
 * Visible to org admins, fleet owners/managers, ops managers, super admins.
 * Use it on /pool-memberships or embed inside Administration → Access tab.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Users, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import { ASSIGNED_LOCATIONS } from "@/components/fleet/formConstants";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Membership {
  id: string;
  user_id: string;
  pool_code: string;
  role: "member" | "manager";
  created_at: string;
  profile?: Profile | null;
}

const POOL_LABEL: Record<string, string> = Object.fromEntries(
  ASSIGNED_LOCATIONS.map((l: any) => [l.value, l.label]),
);

export const PoolMembershipsManager = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [newUserId, setNewUserId] = useState<string>("");
  const [newPool, setNewPool] = useState<string>("");
  const [newRole, setNewRole] = useState<"member" | "manager">("member");

  const { data: profiles = [] } = useQuery({
    queryKey: ["pool-mem-profiles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", organizationId!)
        .order("full_name");
      return (data || []) as Profile[];
    },
  });

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["pool-memberships", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pool_memberships")
        .select("id, user_id, pool_code, role, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Membership[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newUserId || !newPool) throw new Error("Pick a user and a pool");
      const { error } = await (supabase as any).from("pool_memberships").insert({
        organization_id: organizationId,
        user_id: newUserId,
        pool_code: newPool,
        role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pool membership added");
      setNewUserId("");
      setNewPool("");
      setNewRole("member");
      qc.invalidateQueries({ queryKey: ["pool-memberships", organizationId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to add membership"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pool_memberships")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membership removed");
      qc.invalidateQueries({ queryKey: ["pool-memberships", organizationId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove"),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return memberships;
    const q = search.toLowerCase();
    return memberships.filter((m) => {
      const p = profileById.get(m.user_id);
      return (
        m.pool_code.toLowerCase().includes(q) ||
        (POOL_LABEL[m.pool_code] || "").toLowerCase().includes(q) ||
        p?.full_name?.toLowerCase().includes(q) ||
        p?.email?.toLowerCase().includes(q)
      );
    });
  }, [memberships, search, profileById]);

  // Group all known pool codes (from constants) for the picker
  const poolOptions = useMemo(
    () =>
      ASSIGNED_LOCATIONS.filter((l: any) => !!l.value).map((l: any) => ({
        value: l.value,
        label: l.label,
        group: l.group,
      })),
    [],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4 text-primary" />
            Assign user to a pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                User
              </label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email || p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Pool
              </label>
              <Select value={newPool} onValueChange={setNewPool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pool…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {poolOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="text-xs text-muted-foreground mr-2">
                        [{p.group}]
                      </span>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Role in pool
              </label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as "member" | "manager")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !newUserId || !newPool}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add membership
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            Existing memberships ({memberships.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user or pool…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No memberships yet. Add the first one above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const p = profileById.get(m.user_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {p?.full_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p?.email || m.user_id.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {POOL_LABEL[m.pool_code] || m.pool_code}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {m.pool_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        {m.role === "manager" ? (
                          <Badge className="bg-primary/15 text-primary border-primary/30">
                            <Shield className="w-3 h-3 mr-1" />
                            Manager
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Member</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                          aria-label="Remove membership"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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

export default PoolMembershipsManager;

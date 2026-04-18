import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  History, Plus, Edit, Trash2, Power, PowerOff, Search, Shield, Users, RefreshCw,
  ArrowRightLeft, SkipForward,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, formatDistanceToNow } from "date-fns";

const ACTION_META: Record<string, { icon: any; label: string; color: string }> = {
  create: { icon: Plus, label: "Created", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  update: { icon: Edit, label: "Updated", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  delete: { icon: Trash2, label: "Deleted", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  activate: { icon: Power, label: "Activated", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  deactivate: { icon: PowerOff, label: "Deactivated", color: "bg-muted text-muted-foreground border-border" },
  substitute: { icon: ArrowRightLeft, label: "Delegated", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  skip: { icon: SkipForward, label: "Skipped", color: "bg-muted text-muted-foreground border-border" },
  route: { icon: ArrowRightLeft, label: "Routed", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
};

const SOURCE_META: Record<string, { icon: any; label: string }> = {
  authority_matrix: { icon: Shield, label: "Authority Rule" },
  delegation_matrix: { icon: Users, label: "Substitution" },
  user_substitutions: { icon: Users, label: "Substitution" },
  approval_levels: { icon: Shield, label: "Approval Level" },
  fuel_request: { icon: ArrowRightLeft, label: "Fuel Request Routing" },
  vehicle_request: { icon: ArrowRightLeft, label: "Vehicle Request Routing" },
};

// Authority/delegation configuration sources — show ALL actions from these.
const CONFIG_SOURCES = [
  "authority_matrix",
  "delegation_matrix",
  "user_substitutions",
  "approval_levels",
];

// Delegation routing actions — show these from ANY workflow source table
// (e.g. fuel_request, vehicle_request) because they represent delegation
// decisions made by the authority/delegation matrix at runtime.
const DELEGATION_ACTIONS = ["route", "substitute", "skip"];

export const DelegationHistoryTab = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["delegation-audit-log", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Source 1: explicit delegation_audit_log entries
      const auditPromise = supabase
        .from("delegation_audit_log")
        .select("*")
        .eq("organization_id", organizationId)
        .or(
          `source_table.in.(${CONFIG_SOURCES.join(",")}),action.in.(${DELEGATION_ACTIONS.join(",")})`,
        )
        .order("created_at", { ascending: false })
        .limit(500);

      // Source 2: workflow_transitions that represent delegation routing
      // (e.g. auto_route via authority/delegation matrix). These are written
      // by the inbox approval engine instead of delegation_audit_log.
      const ROUTING_DECISIONS = ["auto_route", "route", "delegate", "substitute", "reroute"];
      const transitionsPromise = supabase
        .from("workflow_transitions")
        .select("id, instance_id, workflow_type, from_stage, to_stage, decision, performed_by, performed_by_name, performed_by_role, notes, created_at")
        .eq("organization_id", organizationId)
        .in("decision", ROUTING_DECISIONS)
        .order("created_at", { ascending: false })
        .limit(500);

      const [{ data: audit, error: auditErr }, { data: transitions, error: trErr }] =
        await Promise.all([auditPromise, transitionsPromise]);
      if (auditErr) throw auditErr;
      if (trErr) throw trErr;

      // Resolve missing actor names/roles from profiles + user_roles
      const actorIds = Array.from(
        new Set(
          (transitions ?? [])
            .filter((t: any) => t.performed_by && (!t.performed_by_name || !t.performed_by_role))
            .map((t: any) => t.performed_by),
        ),
      );
      let actorMap: Record<string, { name?: string; role?: string }> = {};
      if (actorIds.length > 0) {
        const [{ data: profs }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, first_name, last_name, email").in("id", actorIds),
          supabase.from("user_roles").select("user_id, role").in("user_id", actorIds),
        ]);
        (profs ?? []).forEach((p: any) => {
          const name =
            p.full_name ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            p.email;
          actorMap[p.id] = { ...(actorMap[p.id] ?? {}), name };
        });
        (roles ?? []).forEach((r: any) => {
          actorMap[r.user_id] = { ...(actorMap[r.user_id] ?? {}), role: r.role };
        });
      }

      const mappedTransitions = (transitions ?? []).map((t: any) => {
        const fallback = actorMap[t.performed_by] ?? {};
        const name = t.performed_by_name || fallback.name;
        const role = t.performed_by_role || fallback.role;
        const actor = name && role ? `${name} (${role})` : name || role || "System";
        return {
          id: `wt-${t.id}`,
          created_at: t.created_at,
          action: t.decision === "auto_route" ? "route" : t.decision,
          source_table: t.workflow_type ?? "workflow_transitions",
          entity_name: t.workflow_type ? `${t.workflow_type} routing` : "Workflow routing",
          scope: t.workflow_type,
          summary: `${t.from_stage ?? "—"} → ${t.to_stage ?? "—"}${t.notes ? ` · ${t.notes}` : ""}`,
          actor_name: actor,
        };
      });

      const combined = [...(audit ?? []), ...mappedTransitions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return combined.slice(0, 500);
    },
    enabled: !!organizationId,
  });

  const filtered = logs.filter((l: any) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (sourceFilter !== "all" && l.source_table !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.entity_name?.toLowerCase().includes(q) ||
        l.summary?.toLowerCase().includes(q) ||
        l.actor_name?.toLowerCase().includes(q) ||
        l.scope?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: logs.length,
    today: logs.filter((l: any) => new Date(l.created_at) > new Date(Date.now() - 86400000)).length,
    creates: logs.filter((l: any) => l.action === "create").length,
    deletes: logs.filter((l: any) => l.action === "delete").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Events</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-primary">{stats.today}</div>
          <div className="text-xs text-muted-foreground">Last 24 hours</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.creates}</div>
          <div className="text-xs text-muted-foreground">Created</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.deletes}</div>
          <div className="text-xs text-muted-foreground">Deleted</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity, actor, scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="authority_matrix">Authority Rules</SelectItem>
            <SelectItem value="delegation_matrix">Substitutions</SelectItem>
            <SelectItem value="user_substitutions">User Substitutions</SelectItem>
            <SelectItem value="approval_levels">Approval Levels</SelectItem>
            <SelectItem value="fuel_request">Fuel Request Routing</SelectItem>
            <SelectItem value="vehicle_request">Vehicle Request Routing</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
            <SelectItem value="activate">Activated</SelectItem>
            <SelectItem value="deactivate">Deactivated</SelectItem>
            <SelectItem value="route">Routed</SelectItem>
            <SelectItem value="substitute">Delegated</SelectItem>
            <SelectItem value="skip">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Delegation History
            <Badge variant="outline" className="ml-2">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {logs.length === 0 ? "No history yet — changes to authority rules and substitutions will appear here." : "No events match your filters."}
              </TableCell></TableRow>
            ) : filtered.map((log: any) => {
              const action = ACTION_META[log.action] || ACTION_META.update;
              const source = SOURCE_META[log.source_table] || { icon: History, label: log.source_table };
              const ActionIcon = action.icon;
              const SourceIcon = source.icon;
              return (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</div>
                    <div className="text-muted-foreground">{format(new Date(log.created_at), "MMM dd, HH:mm")}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${action.color}`}>
                      <ActionIcon className="h-3 w-3" />
                      {action.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <SourceIcon className="h-3 w-3" />
                      {source.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{log.entity_name || "—"}</TableCell>
                  <TableCell>
                    {log.scope ? (
                      <Badge variant="secondary" className="capitalize text-[10px]">{log.scope.replace(/_/g, " ")}</Badge>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={log.summary}>
                    {log.summary}
                  </TableCell>
                  <TableCell className="text-xs">{log.actor_name || "System"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

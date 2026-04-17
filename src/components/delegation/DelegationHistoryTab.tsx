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
};

const SOURCE_META: Record<string, { icon: any; label: string }> = {
  authority_matrix: { icon: Shield, label: "Authority Rule" },
  delegation_matrix: { icon: Users, label: "Substitution" },
};

export const DelegationHistoryTab = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["delegation-audit-log", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("delegation_audit_log")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
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

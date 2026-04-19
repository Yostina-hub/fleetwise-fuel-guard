import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { HistoryFiltersBar } from "./history/HistoryFilters";
import { HistoryStatsCards } from "./history/HistoryStatsCards";
import { HistoryTable } from "./history/HistoryTable";
import { useDelegationHistory } from "./history/useDelegationHistory";
import type { HistoryFilters, HistoryStats } from "./history/types";

const DEFAULT_FILTERS: HistoryFilters = {
  search: "",
  action: "all",
  source: "all",
};

const ROUTING_ACTIONS = new Set(["route", "substitute", "skip", "escalate"]);
const APPROVAL_ACTIONS = new Set(["approve", "reject"]);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const DelegationHistoryTab = () => {
  const { data: logs = [], isLoading, isFetching, refetch } = useDelegationHistory();
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);

  const stats = useMemo<HistoryStats>(() => {
    const cutoff = Date.now() - ONE_DAY_MS;
    return {
      total: logs.length,
      today: logs.filter((l) => new Date(l.created_at).getTime() > cutoff).length,
      approvals: logs.filter((l) => APPROVAL_ACTIONS.has(l.action)).length,
      routings: logs.filter((l) => ROUTING_ACTIONS.has(l.action)).length,
    };
  }, [logs]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return logs.filter((log) => {
      if (filters.action !== "all" && log.action !== filters.action) return false;
      if (filters.source !== "all" && log.source_table !== filters.source) return false;
      if (!q) return true;
      return (
        log.entity_name?.toLowerCase().includes(q) ||
        log.summary?.toLowerCase().includes(q) ||
        log.actor_name?.toLowerCase().includes(q) ||
        log.scope?.toLowerCase().includes(q) ||
        log.source_table?.toLowerCase().includes(q)
      );
    });
  }, [logs, filters]);

  return (
    <div className="space-y-4">
      <HistoryStatsCards stats={stats} />

      <HistoryFiltersBar
        filters={filters}
        onChange={setFilters}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Delegation & Approval History
            <Badge variant="outline" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <HistoryTable rows={filtered} isLoading={isLoading} totalRows={logs.length} />
      </Card>
    </div>
  );
};

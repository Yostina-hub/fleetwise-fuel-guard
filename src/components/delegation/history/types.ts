export type DelegationHistoryRow = {
  id: string;
  created_at: string;
  action: string;
  source_table: string;
  entity_name: string | null;
  scope: string | null;
  summary: string | null;
  actor_name: string | null;
};

export type HistoryStats = {
  total: number;
  today: number;
  approvals: number;
  routings: number;
};

export type HistoryFilters = {
  search: string;
  action: string;
  source: string;
};

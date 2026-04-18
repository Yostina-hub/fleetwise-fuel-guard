import { Search, Inbox as InboxIcon, CheckCircle2, AlertTriangle, User, Users, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkflowTask } from "./types";

export type StatusFilter = "pending" | "completed" | "trash";
export type Scope = "me" | "team" | "all";

interface TaskFiltersProps {
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  search: string;
  setSearch: (s: string) => void;
  workflowFilter: string | null;
  setWorkflowFilter: (w: string | null) => void;
  roleFilter: string | null;
  setRoleFilter: (r: string | null) => void;
  slaFilter: "all" | "breach" | "warn";
  setSlaFilter: (s: "all" | "breach" | "warn") => void;
  tasks: WorkflowTask[];
  counts: { pending: number; completed: number; breach: number; trash: number };
}

export function TaskFilters({
  status, setStatus, scope, setScope, search, setSearch,
  workflowFilter, setWorkflowFilter, roleFilter, setRoleFilter,
  slaFilter, setSlaFilter, tasks, counts,
}: TaskFiltersProps) {
  const workflows = Array.from(new Set(tasks.map(t => t.workflows?.name).filter(Boolean))) as string[];
  const roles = Array.from(new Set(tasks.map(t => t.assignee_role).filter(Boolean))) as string[];

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/40 backdrop-blur-sm flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Status */}
      <FilterGroup label="Status">
        <FilterRow
          icon={<InboxIcon className="h-3.5 w-3.5" />}
          label="Pending"
          count={counts.pending}
          active={status === "pending"}
          onClick={() => setStatus("pending")}
        />
        <FilterRow
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Completed"
          count={counts.completed}
          active={status === "completed"}
          onClick={() => setStatus("completed")}
        />
      </FilterGroup>

      {/* Scope */}
      <FilterGroup label="Assigned to">
        <FilterRow
          icon={<User className="h-3.5 w-3.5" />}
          label="Me"
          active={scope === "me"}
          onClick={() => setScope("me")}
        />
        <FilterRow
          icon={<Users className="h-3.5 w-3.5" />}
          label="My team"
          active={scope === "team"}
          onClick={() => setScope("team")}
        />
        <FilterRow
          icon={<Users className="h-3.5 w-3.5" />}
          label="Everyone"
          active={scope === "all"}
          onClick={() => setScope("all")}
        />
      </FilterGroup>

      {/* SLA */}
      <FilterGroup label="SLA">
        <FilterRow
          label="All"
          active={slaFilter === "all"}
          onClick={() => setSlaFilter("all")}
        />
        <FilterRow
          icon={<AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--sla-warn))]" />}
          label="Approaching"
          active={slaFilter === "warn"}
          onClick={() => setSlaFilter("warn")}
        />
        <FilterRow
          icon={<AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--sla-breach))]" />}
          label="Breached"
          count={counts.breach}
          active={slaFilter === "breach"}
          onClick={() => setSlaFilter("breach")}
        />
      </FilterGroup>

      {/* Workflows */}
      {workflows.length > 0 && (
        <FilterGroup label="Workflow">
          <FilterRow
            label="All workflows"
            active={!workflowFilter}
            onClick={() => setWorkflowFilter(null)}
          />
          {workflows.map((w) => (
            <FilterRow
              key={w}
              label={w}
              active={workflowFilter === w}
              onClick={() => setWorkflowFilter(w)}
            />
          ))}
        </FilterGroup>
      )}

      {/* Roles */}
      {roles.length > 0 && (
        <FilterGroup label="Role">
          <FilterRow
            label="All roles"
            active={!roleFilter}
            onClick={() => setRoleFilter(null)}
          />
          {roles.map((r) => (
            <FilterRow
              key={r}
              label={r.replace(/_/g, " ")}
              active={roleFilter === r}
              onClick={() => setRoleFilter(r)}
            />
          ))}
        </FilterGroup>
      )}
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-2 border-b border-border/60">
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterRow({
  icon, label, count, active, onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors capitalize",
        active
          ? "bg-primary/15 text-primary font-medium"
          : "text-foreground/80 hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-4 min-w-[1.25rem] justify-center px-1 text-[10px]">
          {count}
        </Badge>
      )}
    </button>
  );
}

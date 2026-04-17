import { useMemo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight, Workflow as WorkflowIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { SlaChip } from "./SlaChip";
import { RoleChip } from "./RoleChip";
import { StagePill } from "./StagePill";
import type { WorkflowTask } from "./types";

interface TaskListProps {
  tasks: WorkflowTask[];
  selectedId: string | null;
  onSelect: (t: WorkflowTask) => void;
  selection: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: (ids: string[]) => void;
}

export function TaskList({
  tasks, selectedId, onSelect, selection, toggleSelection, toggleSelectAll,
}: TaskListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, WorkflowTask[]>();
    for (const t of tasks) {
      const k = t.workflows?.name ?? "Workflow";
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return Array.from(map.entries());
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map(([wfName, items]) => {
        const ids = items.map(i => i.id);
        const allSelected = ids.every(id => selection.has(id));
        const someSelected = !allSelected && ids.some(id => selection.has(id));
        return (
          <div key={wfName} className="border-b border-border/60 last:border-b-0">
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 backdrop-blur px-4 py-2 border-b border-border/60">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={() => toggleSelectAll(ids)}
                aria-label={`Select all in ${wfName}`}
              />
              <WorkflowIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <h3 className="text-xs font-semibold text-foreground/90 truncate">{wfName}</h3>
              <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
            </div>
            <ul>
              {items.map((t) => {
                const isActive = selectedId === t.id;
                const isChecked = selection.has(t.id);
                const totalNodes = Array.isArray(t.workflows?.nodes) ? t.workflows!.nodes!.length : undefined;
                return (
                  <li key={t.id}>
                    <div
                      className={cn(
                        "group flex items-start gap-3 px-4 py-3 cursor-pointer border-l-2 transition-colors",
                        isActive
                          ? "bg-primary/10 border-l-primary"
                          : "border-l-transparent hover:bg-muted/40",
                      )}
                      onClick={() => onSelect(t)}
                    >
                      <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelection(t.id)}
                          aria-label={`Select ${t.title}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StagePill stageId={t.node_id} total={totalNodes} />
                          <RoleChip role={t.assignee_role} />
                          {t.status === "pending" ? (
                            <SlaChip createdAt={t.created_at} dueAt={t.due_at} compact />
                          ) : null}
                        </div>
                        <div className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-primary" : "text-foreground",
                        )}>
                          {t.title}
                        </div>
                        {t.description ? (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {t.description}
                          </div>
                        ) : null}
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {formatDistanceToNowStrict(new Date(t.created_at))} ago
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 mt-1 shrink-0 transition-opacity",
                        isActive ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50",
                      )} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

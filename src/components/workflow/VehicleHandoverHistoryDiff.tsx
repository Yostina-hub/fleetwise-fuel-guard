// Vehicle Handover — history diff panel
// Compares the *current* handover form against the *most recent prior*
// completed handover for the same vehicle and surfaces:
//   • Items that were present last time but are now missing (FLAG)
//   • Items whose condition was downgraded (Good → Damaged) (FLAG)
//   • Items that are newly added (info, also flagged for fleet admin awareness)
//   • Condition narrative changes (info)
// Displayed inside the WorkflowDetailDrawer for fleet admins to review.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Minus, Sparkles, ArrowDown } from "lucide-react";
import type { WorkflowInstance } from "@/lib/workflow-engine/types";

interface Props {
  instance: WorkflowInstance;
}

// Condition severity (lower = better).
const CONDITION_RANK: Record<string, number> = {
  good: 0,
  ok: 0,
  fair: 1,
  worn: 2,
  damaged: 3,
  missing: 4,
};

function rankOf(c: unknown): number {
  if (!c) return 0;
  return CONDITION_RANK[String(c).toLowerCase().trim()] ?? 0;
}

interface Row {
  name?: string;
  qty?: number | string;
  condition?: string;
}

function indexRows(rows: Row[] | undefined): Map<string, Row> {
  const m = new Map<string, Row>();
  (rows || []).forEach((r) => {
    const name = (r?.name || "").toString().trim();
    if (!name) return;
    m.set(name.toLowerCase(), r);
  });
  return m;
}

export function VehicleHandoverHistoryDiff({ instance }: Props) {
  const vehicleId = instance.vehicle_id;
  const { data: prior } = useQuery({
    queryKey: ["wf-vh-prior", vehicleId, instance.id],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_instances")
        .select("id, reference_number, data, completed_at, created_at")
        .eq("workflow_type", "vehicle_handover")
        .eq("vehicle_id", vehicleId!)
        .neq("id", instance.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return (data || [])[0] || null;
    },
  });

  const diff = useMemo(() => {
    const out: {
      missing: string[];
      downgraded: { name: string; from: string; to: string }[];
      added: string[];
      conditionChanged: boolean;
      priorCondition?: string;
      currentCondition?: string;
    } = { missing: [], downgraded: [], added: [], conditionChanged: false };

    if (!prior) return out;
    const cur = (instance.data as any) || {};
    const old = (prior.data as any) || {};

    const curIdx = indexRows(cur.checklist_lines as Row[]);
    const oldIdx = indexRows(old.checklist_lines as Row[]);

    for (const [k, oldRow] of oldIdx.entries()) {
      const curRow = curIdx.get(k);
      if (!curRow) {
        out.missing.push(oldRow.name || k);
        continue;
      }
      const oldRank = rankOf(oldRow.condition);
      const newRank = rankOf(curRow.condition);
      if (newRank > oldRank) {
        out.downgraded.push({
          name: curRow.name || k,
          from: String(oldRow.condition || "Good"),
          to: String(curRow.condition || "Good"),
        });
      }
    }
    for (const [k, curRow] of curIdx.entries()) {
      if (!oldIdx.has(k)) out.added.push(curRow.name || k);
    }

    out.priorCondition = old.overall_vehicle_condition;
    out.currentCondition = cur.overall_vehicle_condition;
    out.conditionChanged =
      !!out.priorCondition &&
      !!out.currentCondition &&
      out.priorCondition.trim() !== out.currentCondition.trim();

    return out;
  }, [prior, instance.data]);

  if (!vehicleId) {
    return (
      <p className="text-xs text-muted-foreground">
        No vehicle linked — cannot compare against prior handovers.
      </p>
    );
  }

  if (!prior) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        First recorded handover for this vehicle — no prior baseline to compare.
      </div>
    );
  }

  const hasFlags =
    diff.missing.length > 0 ||
    diff.downgraded.length > 0 ||
    diff.added.length > 0 ||
    diff.conditionChanged;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Comparing against{" "}
          <span className="font-mono">{prior.reference_number}</span>
        </span>
        {hasFlags ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Flagged for fleet admin
          </Badge>
        ) : (
          <Badge variant="secondary">No regressions</Badge>
        )}
      </div>

      {diff.missing.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1">
            <Minus className="h-3 w-3" /> Missing items vs. previous handover
          </p>
          <p className="text-xs">{diff.missing.join(", ")}</p>
        </div>
      )}

      {diff.downgraded.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1">
            <ArrowDown className="h-3 w-3" /> Condition downgraded
          </p>
          <ul className="text-xs space-y-0.5">
            {diff.downgraded.map((d) => (
              <li key={d.name}>
                <span className="font-medium">{d.name}</span>:{" "}
                <span className="text-muted-foreground">{d.from}</span> →{" "}
                <span className="text-destructive">{d.to}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diff.added.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1">
            <Plus className="h-3 w-3 text-primary" /> Newly added items
          </p>
          <p className="text-xs">{diff.added.join(", ")}</p>
        </div>
      )}

      {diff.conditionChanged && (
        <div className="rounded-md border p-2 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive" /> Overall condition changed
          </p>
          <div className="text-[11px] text-muted-foreground">
            <strong>Previous:</strong>
            <p className="whitespace-pre-wrap">{diff.priorCondition}</p>
          </div>
          <div className="text-[11px]">
            <strong>Current:</strong>
            <p className="whitespace-pre-wrap">{diff.currentCondition}</p>
          </div>
        </div>
      )}
    </div>
  );
}

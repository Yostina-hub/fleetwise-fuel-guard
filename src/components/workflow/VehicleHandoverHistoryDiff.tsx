// Vehicle Handover — history diff panel
// Compares the *current* handover form against the *most recent prior*
// completed handover for the same vehicle and surfaces:
//   • Items that were present last time but are now missing (FLAG)
//   • Items that are newly present (info)
//   • Condition narrative changes (info)
// Displayed inside the WorkflowDetailDrawer for fleet admins to review.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Minus, Sparkles } from "lucide-react";
import type { WorkflowInstance } from "@/lib/workflow-engine/types";

interface Props {
  instance: WorkflowInstance;
}

const CHECKLIST_KEYS = [
  "checklist_safety",
  "checklist_comfort",
  "checklist_accessory",
  "checklist_other",
] as const;

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

  const { data: catalog = [] } = useQuery({
    queryKey: ["wf-vh-catalog", instance.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicle_handover_catalog_items")
        .select("id, name, category")
        .eq("organization_id", instance.organization_id);
      return data || [];
    },
  });

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    catalog.forEach((c: any) => m.set(c.id, c.name));
    return (id: string) => m.get(id) || id;
  }, [catalog]);

  const diff = useMemo(() => {
    const out: {
      missing: { key: string; ids: string[] }[];
      added: { key: string; ids: string[] }[];
      conditionChanged: boolean;
      priorCondition?: string;
      currentCondition?: string;
    } = { missing: [], added: [], conditionChanged: false };

    if (!prior) return out;
    const cur = (instance.data as any) || {};
    const old = (prior.data as any) || {};

    for (const k of CHECKLIST_KEYS) {
      const curArr: string[] = Array.isArray(cur[k]) ? cur[k] : [];
      const oldArr: string[] = Array.isArray(old[k]) ? old[k] : [];
      const missing = oldArr.filter((id) => !curArr.includes(id));
      const added = curArr.filter((id) => !oldArr.includes(id));
      if (missing.length) out.missing.push({ key: k, ids: missing });
      if (added.length) out.added.push({ key: k, ids: added });
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

  const hasFlags = diff.missing.length > 0 || diff.conditionChanged;

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
          {diff.missing.map((g) => (
            <div key={g.key} className="text-xs">
              <span className="text-muted-foreground">{labelFor(g.key)}: </span>
              {g.ids.map((id) => nameOf(id)).join(", ")}
            </div>
          ))}
        </div>
      )}

      {diff.added.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1">
            <Plus className="h-3 w-3 text-primary" /> Newly present items
          </p>
          {diff.added.map((g) => (
            <div key={g.key} className="text-xs">
              <span className="text-muted-foreground">{labelFor(g.key)}: </span>
              {g.ids.map((id) => nameOf(id)).join(", ")}
            </div>
          ))}
        </div>
      )}

      {diff.conditionChanged && (
        <div className="rounded-md border p-2 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" /> Overall condition changed
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

function labelFor(key: string): string {
  switch (key) {
    case "checklist_safety": return "Safety";
    case "checklist_comfort": return "Comfort";
    case "checklist_accessory": return "Accessories";
    case "checklist_other": return "Other";
    default: return key;
  }
}

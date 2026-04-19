/**
 * MyRequestsPanel — generic list of all workflow_instances the driver has
 * filed (or is the linked driver on). Driven by the workflow engine — works
 * for License Renewal, Fuel Request, Vehicle Request, Safety & Comfort, etc.
 *
 * No SOP-specific logic lives here: the list groups by `workflow_type` and
 * deep-links each row to its SOP page (or workflow builder for super admins).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ChevronRight, Plus, IdCard, Fuel, Car, Shield, Wrench } from "lucide-react";
import { format } from "date-fns";
import { WORKFLOW_CONFIGS } from "@/lib/workflow-engine/configs";

interface Props {
  driverId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  onRequestRenewal?: () => void;
}

const WORKFLOW_LABEL: Record<string, string> = {
  license_renewal: "Driver License Renewal",
  driver_training: "Driver Training",
  driver_allowance: "Driver Allowance",
  fuel_request: "Fuel Request",
  vehicle_request: "Vehicle Request",
  safety_comfort: "Safety & Comfort",
  maintenance_request: "Maintenance Request",
};

const WORKFLOW_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  license_renewal: IdCard,
  fuel_request: Fuel,
  vehicle_request: Car,
  safety_comfort: Shield,
  maintenance_request: Wrench,
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
  rejected: "destructive",
};

export default function MyRequestsPanel({
  driverId, organizationId, userId, onRequestRenewal,
}: Props) {
  const navigate = useNavigate();

  const { data: instances, isLoading } = useQuery({
    queryKey: ["my-driver-workflow-instances", driverId, userId, organizationId],
    enabled: !!organizationId && (!!driverId || !!userId),
    queryFn: async () => {
      let q = supabase
        .from("workflow_instances")
        .select("id, workflow_type, reference_number, title, current_stage, status, created_at, updated_at, data")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);

      // RLS already restricts to (created_by = me) OR (driver_id linked to me).
      // We add an explicit OR so super-admin impersonation works too.
      const orParts: string[] = [];
      if (driverId) orParts.push(`driver_id.eq.${driverId}`);
      if (userId) orParts.push(`created_by.eq.${userId}`);
      if (orParts.length) q = q.or(orParts.join(","));

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const i of instances ?? []) {
      const arr = map.get(i.workflow_type) ?? [];
      arr.push(i);
      map.set(i.workflow_type, arr);
    }
    return Array.from(map.entries());
  }, [instances]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" aria-hidden="true" /> My Requests
        </h2>
        <div className="flex gap-2">
          {onRequestRenewal && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onRequestRenewal}>
              <IdCard className="w-3.5 h-3.5" aria-hidden="true" /> Renew license
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        </div>
      ) : (instances ?? []).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
          <FileText className="w-10 h-10 mx-auto opacity-50" aria-hidden="true" />
          <p>You haven't filed any requests yet.</p>
          {onRequestRenewal && (
            <Button size="sm" variant="outline" onClick={onRequestRenewal} className="gap-1">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> File a license renewal
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([type, rows]) => {
            const Icon = WORKFLOW_ICON[type] ?? FileText;
            const label = WORKFLOW_LABEL[type] ?? type.replace(/_/g, " ");
            const cfg = (WORKFLOW_CONFIGS as Record<string, any>)[type];
            return (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground/70">· {rows.length}</span>
                </div>
                {rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      // Best-effort deep link to the SOP page; falls back to /workflow-builder.
                      const path = sopPathForType(type);
                      if (path) navigate(path);
                    }}
                    className="w-full text-left p-3 rounded-md border border-border bg-card hover:bg-accent/40 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{r.reference_number}</Badge>
                        <Badge
                          variant={STATUS_VARIANT[r.status] ?? "outline"}
                          className="text-[10px] capitalize"
                        >
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(r.created_at), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <p className="text-sm mt-1 truncate">
                        {r.title || cfg?.title || label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Stage: <span className="font-mono">{r.current_stage}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Map workflow_type → SOP page route. Keeps in sync with src/App.tsx. */
function sopPathForType(type: string): string | null {
  switch (type) {
    case "license_renewal":     return "/sop/license-renewal";
    case "fuel_request":        return "/sop/fuel-request";
    case "vehicle_request":     return "/sop/vehicle-request";
    case "safety_comfort":      return "/sop/safety-comfort";
    case "maintenance_request": return "/sop/maintenance-request";
    case "driver_training":     return "/sop/driver-training";
    case "driver_allowance":    return "/sop/driver-allowance";
    case "vehicle_dispatch":    return "/sop/vehicle-dispatch";
    case "fleet_inspection":    return "/sop/fleet-inspection";
    default:                    return null;
  }
}

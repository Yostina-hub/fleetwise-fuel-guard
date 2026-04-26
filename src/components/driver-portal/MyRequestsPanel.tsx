/**
 * MyRequestsPanel — tabular list of all workflow_instances the driver has
 * filed (or is the linked driver on). Driven by the workflow engine — works
 * for License Renewal, Fuel Request, Vehicle Request, Safety & Comfort, etc.
 *
 * Click any row to open the unified request tracker (for fuel / incident /
 * maintenance) or to deep-link into the SOP page (for non-driver roles).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, Plus, IdCard, Fuel, Car, Shield, Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import RequestTrackingDialog, { TrackingKind } from "./RequestTrackingDialog";

interface Props {
  driverId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  onRequestRenewal?: () => void;
}

const WORKFLOW_LABEL: Record<string, string> = {
  license_renewal: "License Renewal",
  driver_training: "Driver Training",
  driver_allowance: "Driver Allowance",
  fuel_request: "Fuel Request",
  vehicle_request: "Vehicle Request",
  safety_comfort: "Safety & Comfort",
  maintenance_request: "Maintenance",
  incident_report: "Incident",
};

const WORKFLOW_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  license_renewal: IdCard,
  fuel_request: Fuel,
  vehicle_request: Car,
  safety_comfort: Shield,
  maintenance_request: Wrench,
  incident_report: AlertTriangle,
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  in_progress: "default",
  active: "default",
  completed: "outline",
  cancelled: "destructive",
  rejected: "destructive",
};

/** Workflow types whose progress can be tracked via the unified dialog. */
const TRACKABLE_KIND: Record<string, TrackingKind | undefined> = {
  fuel_request: "fuel",
  maintenance_request: "maintenance",
  incident_report: "incident",
};

export default function MyRequestsPanel({
  driverId, organizationId, userId, onRequestRenewal,
}: Props) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isDriverOnly = hasRole("driver") && !hasRole("super_admin") && !hasRole("org_admin")
    && !hasRole("fleet_manager") && !hasRole("operations_manager") && !hasRole("operator");

  const [tracking, setTracking] = useState<{ kind: TrackingKind; id: string } | null>(null);

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

  const handleRowClick = (row: any) => {
    const trackKind = TRACKABLE_KIND[row.workflow_type];
    const dataKeyByType: Record<string, string> = {
      fuel_request: "fuel_request_id",
      maintenance_request: "maintenance_request_id",
      incident_report: "incident_id",
    };
    const key = dataKeyByType[row.workflow_type];
    const entityId = (key && row.data && row.data[key]) || (row.data && (row.data.entity_id || row.data.record_id));
    if (trackKind && entityId) {
      setTracking({ kind: trackKind, id: entityId });
      return;
    }
    if (isDriverOnly) {
      if (row.workflow_type === "license_renewal") navigate("/my-license");
      return;
    }
    const path = sopPathForType(row.workflow_type);
    if (path) navigate(path);
  };

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(instances ?? []).map((r: any) => {
              const Icon = WORKFLOW_ICON[r.workflow_type] ?? FileText;
              const label = WORKFLOW_LABEL[r.workflow_type] ?? r.workflow_type.replace(/_/g, " ");
              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => handleRowClick(r)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.reference_number}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{r.title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize font-mono">
                      {(r.current_stage || "").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px] capitalize">
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "MMM dd, yyyy")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <RequestTrackingDialog
        open={!!tracking}
        onOpenChange={(o) => { if (!o) setTracking(null); }}
        kind={tracking?.kind ?? null}
        recordId={tracking?.id ?? null}
      />
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

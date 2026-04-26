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
    queryKey: ["my-driver-unified-requests", driverId, userId, organizationId],
    enabled: !!organizationId && (!!driverId || !!userId),
    queryFn: async () => {
      // 1) workflow_instances (license, vehicle, safety, etc.)
      let wq = supabase
        .from("workflow_instances")
        .select("id, workflow_type, reference_number, title, current_stage, status, created_at, updated_at, data")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      const orParts: string[] = [];
      if (driverId) orParts.push(`driver_id.eq.${driverId}`);
      if (userId) orParts.push(`created_by.eq.${userId}`);
      if (orParts.length) wq = wq.or(orParts.join(","));
      const { data: wfData, error: wfErr } = await wq;
      if (wfErr) throw wfErr;

      // 2) fuel_requests filed by this driver/user
      const fuelOr: string[] = [];
      if (driverId) fuelOr.push(`driver_id.eq.${driverId}`);
      if (userId) fuelOr.push(`requested_by.eq.${userId}`);
      const { data: fuelRows } = fuelOr.length
        ? await (supabase as any)
            .from("fuel_requests")
            .select("id, request_number, status, fuel_type, purpose, created_at, updated_at")
            .eq("organization_id", organizationId!)
            .or(fuelOr.join(","))
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [] };

      // 3) incidents reported by this driver
      const { data: incRows } = driverId
        ? await (supabase as any)
            .from("incidents")
            .select("id, incident_number, status, incident_type, severity, description, location, created_at, updated_at")
            .eq("organization_id", organizationId!)
            .eq("driver_id", driverId)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [] };

      // Build a set of entity ids already represented by workflow_instances so
      // we don't duplicate fuel/incident rows that already have an instance.
      const wfFuelIds = new Set<string>();
      const wfIncidentIds = new Set<string>();
      for (const w of wfData ?? []) {
        const d: any = w.data || {};
        if (w.workflow_type === "fuel_request" && d.fuel_request_id) wfFuelIds.add(d.fuel_request_id);
        if (w.workflow_type === "incident_report" && d.incident_id) wfIncidentIds.add(d.incident_id);
      }

      const fuelExtras = (fuelRows || [])
        .filter((r: any) => !wfFuelIds.has(r.id))
        .map((r: any) => ({
          id: `fuel-${r.id}`,
          workflow_type: "fuel_request",
          reference_number: r.request_number,
          title: r.purpose || `Fuel request (${r.fuel_type || "—"})`,
          current_stage: r.status,
          status: r.status === "fulfilled" ? "completed" : r.status === "rejected" ? "rejected" : "in_progress",
          created_at: r.created_at,
          updated_at: r.updated_at,
          data: { fuel_request_id: r.id },
        }));

      const incExtras = (incRows || [])
        .filter((r: any) => !wfIncidentIds.has(r.id))
        .map((r: any) => ({
          id: `inc-${r.id}`,
          workflow_type: "incident_report",
          reference_number: r.incident_number,
          title: r.description?.slice(0, 80) || `${(r.incident_type || "incident").replace(/_/g, " ")} report`,
          current_stage: r.status,
          status: ["closed", "resolved"].includes(r.status) ? "completed" : "in_progress",
          created_at: r.created_at,
          updated_at: r.updated_at,
          data: { incident_id: r.id },
        }));

      const merged = [...(wfData ?? []), ...fuelExtras, ...incExtras]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return merged;
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

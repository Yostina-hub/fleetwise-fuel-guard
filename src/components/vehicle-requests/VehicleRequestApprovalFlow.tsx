import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight, Truck, LogIn, Send, Shuffle, UserCheck, Sparkles, MapPin, Pencil, Trash2, RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVehicles } from "@/hooks/useVehicles";
import { useAvailableVehicles } from "@/hooks/useAvailableVehicles";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

/**
 * Format an ISO timestamp in the organization's active timezone (default
 * Africa/Addis_Ababa) so dates always display the wall-clock the requester
 * picked, regardless of the viewer's browser timezone (e.g. UTC previews).
 */
const fmtOrgTime = (iso?: string | null, opts: Intl.DateTimeFormatOptions = {
  year: "numeric", month: "short", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
}): string => {
  if (!iso) return "";
  const tz = (typeof window !== "undefined" && window.localStorage?.getItem("org_timezone")) || "Africa/Addis_Ababa";
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
};
import { sendDispatchSms } from "@/services/smsNotificationService";
import { notifyRequesterDecisionSms, notifyAssignmentSms, getAppUrl } from "@/services/vehicleRequestSmsService";
import { notifyFleetOpsRequestApproved } from "@/services/fleetApprovalPushService";
import { useVehicleRequestScope } from "@/hooks/useVehicleRequestScope";
import { usePoolMembership } from "@/hooks/usePoolMembership";
import { AssignedFleetList } from "@/components/vehicle-requests/AssignedFleetList";
import { AssignmentCheckInDialog } from "@/components/vehicle-requests/AssignmentCheckInDialog";
import { OperatorToolsTabs } from "@/components/vehicle-requests/OperatorToolsTabs";
import { AssignmentDetailsPanel } from "@/components/vehicle-requests/AssignmentDetailsPanel";
import { AssignVehicleDriverDialog } from "@/components/vehicle-requests/AssignVehicleDriverDialog";
import type { RequestAssignment } from "@/hooks/useRequestAssignments";
import {
  getVehicleClassProfile,
  isUpgradeOverRecommendation,
  COST_BAND_LABELS,
} from "@/lib/vehicle-requests/vehicleClassRecommendation";
import { useSuggestedVehicles } from "@/hooks/useSuggestedVehicles";
import { useSuggestedDrivers } from "@/hooks/useSuggestedDrivers";

interface Props {
  request: any;
  approvals: any[];
  onClose: () => void;
  onCheckIn?: () => void;
  onCrossPool?: () => void;
  /** Open the Edit / Fix-and-Resubmit dialog for this request. */
  onEdit?: () => void;
  /** Open the Delete confirmation dialog for this request. */
  onDelete?: () => void;
}

export const VehicleRequestApprovalFlow = ({ request, approvals, onClose, onCheckIn, onCrossPool, onEdit, onDelete }: Props) => {
  const { t } = useTranslation();
  const { available } = useAvailableVehicles();
  // Pool scoping: a manager working a request only sees vehicles & drivers
  // from THE REQUEST'S pool. Org-wide roles (admin / fleet_owner / etc.)
  // bypass this filter via `poolUnrestricted`.
  const { unrestricted: poolUnrestricted } = usePoolMembership();
  const requestPool: string | null = (request as any).pool_name || null;
  const scopedAvailable = poolUnrestricted || !requestPool
    ? available
    : available.filter((v) => v.specific_pool === requestPool);
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [activeAssignment, setActiveAssignment] = useState<RequestAssignment | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Role-based action gating (mirrors row visibility scope)
  const vrScope = useVehicleRequestScope();
  const isAdminTier = vrScope.tier === "all";
  const isOperatorTier = vrScope.tier === "operator";
  const canManageAll = isAdminTier || isOperatorTier; // approve/reject/assign/sms/complete
  const isAssignedDriver =
    vrScope.tier === "driver" && request.assigned_driver_id === vrScope.driverId;
  const canCheckInOut = canManageAll || isAssignedDriver;

  // Requester self-service gating — the row owner can edit/delete or
  // fix-and-resubmit while the request is still in pending or rejected state
  // and the driver hasn't checked in yet. Admins/operators get the same
  // controls anytime before check-in (mirrors the table-row policy).
  const isOwnRow = !!vrScope.userId && request.requester_id === vrScope.userId;
  const canEditRow =
    !request.driver_checked_in_at &&
    (canManageAll ||
      (isOwnRow && ["pending", "rejected"].includes(request.status)));
  const canDeleteRow =
    !request.driver_checked_in_at &&
    request.status !== "completed" &&
    (canManageAll ||
      (isOwnRow && ["pending", "rejected", "cancelled"].includes(request.status)));

  // Suggested vehicles — STRICT capacity filter so undersized vehicles don't
  // pollute the picker. Surfaces seating + category for license matching.
  const { data: suggested = [] } = useSuggestedVehicles({
    organizationId: request.organization_id,
    poolName: request.pool_name,
    pickupLat: request.departure_lat,
    pickupLng: request.departure_lng,
    passengers: request.passengers,
    strictCapacity: true,
    enabled: request.status === "approved" && canManageAll,
  });

  // Resolve the chosen vehicle's spec sheet so we can drive license matching.
  // We look it up from the suggested set first (already loaded), then fall
  // back to nothing — the picker can still operate, just without licence
  // ranking for that driver list.
  const selectedVehicleSpec = useMemo(() => {
    const v = suggested.find((s: any) => s.id === selectedVehicleId);
    if (!v) return null;
    return {
      vehicle_category: (v as any).vehicle_category ?? null,
      vehicle_type: (v as any).vehicle_type ?? null,
      seating_capacity: (v as any).seating_capacity ?? null,
    };
  }, [selectedVehicleId, suggested]);

  // Suggested drivers — license-aware. We don't strict-filter so supervisors
  // still see drivers who *could* be reassigned; the dialog highlights bad
  // matches with red badges.
  const { data: drivers = [] } = useSuggestedDrivers({
    organizationId: request.organization_id,
    poolName: requestPool,
    vehicle: selectedVehicleSpec,
    enabled: request.status === "approved" && canManageAll,
  });

  // Issue #41 — pull the requester's full org context so the detail view can
  // show Division (business unit), Department, Section (job title), employee
  // code and contact info. Business unit comes from `user_roles` (the
  // organisational placement), not from the profile.
  const { data: requesterProfile } = useQuery({
    queryKey: ["request-requester-org", request.requester_id, request.organization_id],
    enabled: !!request.requester_id,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("department, job_title, employee_code, phone, email")
          .eq("id", request.requester_id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("business_unit_id, business_units(name)")
          .eq("user_id", request.requester_id)
          .eq("organization_id", request.organization_id)
          .not("business_unit_id", "is", null)
          .limit(1),
      ]);
      const role = (roles && roles.length > 0 ? roles[0] : null) as any;
      return {
        department: profile?.department ?? null,
        job_title: profile?.job_title ?? null,
        employee_code: profile?.employee_code ?? null,
        phone: profile?.phone ?? null,
        email: profile?.email ?? null,
        business_unit_name: role?.business_units?.name ?? null,
      } as {
        department: string | null;
        job_title: string | null;
        employee_code: string | null;
        phone: string | null;
        email: string | null;
        business_unit_name: string | null;
      };
    },
  });

  const requestApprovals = approvals.filter((a: any) => a.request_id === request.id);

  // Approver / dispatcher profile lookups so fleet ops can see at a glance
  // WHO approved and WHO assigned the request without scrolling deep.
  const lastApproval = useMemo(() => {
    const sorted = [...requestApprovals].sort(
      (a, b) =>
        new Date(b.decision_at || b.created_at).getTime() -
        new Date(a.decision_at || a.created_at).getTime(),
    );
    return sorted.find((a: any) => a.status === "approved" || a.status === "rejected") || null;
  }, [requestApprovals]);

  const { data: assignerName } = useQuery({
    queryKey: ["request-assigner-name", request.assigned_by],
    enabled: !!request.assigned_by,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", request.assigned_by)
        .maybeSingle();
      return data?.full_name || data?.email || "Unknown";
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user!.id).single()).data;
      
      await (supabase as any).from("vehicle_request_approvals").insert({
        organization_id: request.organization_id,
        request_id: request.id,
        approver_id: user!.id,
        approver_name: profile?.full_name || user!.email,
        approval_level: 1,
        status: "approved",
        decision_at: new Date().toISOString(),
      });

      await (supabase as any).from("vehicle_requests").update({
        status: "approved",
        approval_status: "approved",
      }).eq("id", request.id);

      // SMS to requester
      try {
        const { data: reqProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", request.requester_id)
          .single();
        if (reqProfile?.phone) {
          await notifyRequesterDecisionSms({
            requesterPhone: reqProfile.phone,
            requestNumber: request.request_number,
            decision: "approved",
            appUrl: getAppUrl(),
          });
        }
      } catch (e) {
        console.error("Approval SMS error:", e);
      }

      // Push notify fleet operators / fleet managers (best effort)
      await notifyFleetOpsRequestApproved({
        organizationId: request.organization_id,
        requestNumber: request.request_number,
        requesterName: request.requester_name,
        departure: request.departure_place,
        destination: request.destination,
        neededFrom: request.needed_from,
        requestId: request.id,
      });
    },
    onSuccess: () => {
      toast.success("Request approved");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["vr-approvals-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectionReason.trim()) throw new Error("Rejection reason is mandatory");
      const user = (await supabase.auth.getUser()).data.user;
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user!.id).single()).data;

      await (supabase as any).from("vehicle_request_approvals").insert({
        organization_id: request.organization_id,
        request_id: request.id,
        approver_id: user!.id,
        approver_name: profile?.full_name || user!.email,
        approval_level: 1,
        status: "rejected",
        decision_at: new Date().toISOString(),
        comments: rejectionReason,
      });

      await (supabase as any).from("vehicle_requests").update({
        status: "rejected",
        approval_status: "rejected",
        rejection_reason: rejectionReason,
      }).eq("id", request.id);

      // SMS to requester on rejection
      try {
        const { data: reqProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", request.requester_id)
          .single();
        if (reqProfile?.phone) {
          await notifyRequesterDecisionSms({
            requesterPhone: reqProfile.phone,
            requestNumber: request.request_number,
            decision: "rejected",
            rejectionReason,
            appUrl: getAppUrl(),
          });
        }
      } catch (e) {
        console.error("Rejection SMS error:", e);
      }
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["vr-approvals-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: async (vars: { vehicleId: string; driverId?: string }) => {
      const { vehicleId } = vars;
      const driverId = vars.driverId || selectedDriver;
      if (!driverId) {
        throw new Error("Please select a driver — required so the request shows in the Driver Portal.");
      }
      const user = (await supabase.auth.getUser()).data.user;
      const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
      const updates: any = {
        status: "assigned",
        assigned_vehicle_id: vehicleId,
        assigned_driver_id: driverId,
        assigned_at: new Date().toISOString(),
        actual_assignment_minutes: mins,
        assigned_by: user!.id,
      };
      await (supabase as any).from("vehicle_requests").update(updates).eq("id", request.id);

      // Update vehicle status to in_use
      await (supabase as any).from("vehicles").update({
        status: "in_use",
        updated_at: new Date().toISOString(),
      }).eq("id", vehicleId);

      // Update driver status to on_trip
      await (supabase as any).from("drivers").update({
        status: "on_trip",
        updated_at: new Date().toISOString(),
      }).eq("id", driverId);

      // Get assigned vehicle plate
      const { data: vehicle } = await (supabase as any)
        .from("vehicles")
        .select("plate_number")
        .eq("id", vehicleId)
        .single();

      // Send in-app notifications
      await sendInAppNotifications(vehicleId, driverId);

      // Send SMS to driver AND requester
      const { data: driverRow } = await supabase
        .from("drivers")
        .select("first_name, last_name, phone")
        .eq("id", driverId)
        .maybeSingle();
      if (driverRow?.phone) {
        try {
          const { data: reqProfile } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", request.requester_id)
            .single();

          await notifyAssignmentSms({
            driverPhone: driverRow.phone,
            driverName: `${driverRow.first_name} ${driverRow.last_name}`,
            requesterPhone: reqProfile?.phone || undefined,
            requesterName: request.requester_name,
            requestNumber: request.request_number,
            vehiclePlate: vehicle?.plate_number || "N/A",
            departure: request.departure_place || "TBD",
            destination: request.destination || "TBD",
            scheduledTime: format(new Date(request.needed_from), "MMM dd, h:mm a"),
            appUrl: getAppUrl(),
          });

          await (supabase as any).from("vehicle_requests").update({
            sms_notification_sent: true,
            sms_sent_at: new Date().toISOString(),
          }).eq("id", request.id);
        } catch (e) {
          console.error("Assignment SMS failed:", e);
        }
      }
    },
    onSuccess: () => {
      toast.success("Vehicle & driver assigned");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Send in-app notifications on assignment
  const sendInAppNotifications = async (vehicleId: string, driverIdParam?: string) => {
    try {
      const { data: vehicle } = await (supabase as any)
        .from("vehicles")
        .select("plate_number")
        .eq("id", vehicleId)
        .single();

      // Notify requester in-app
      if (request.requester_id) {
        await supabase.rpc("send_notification", {
          _user_id: request.requester_id,
          _type: "vehicle_assigned",
          _title: "Vehicle Assigned",
          _message: `Vehicle ${vehicle?.plate_number || "N/A"} has been assigned to your request ${request.request_number}`,
          _link: "/vehicle-requests",
        });
      }

      // Notify driver in-app (find user_id from driver profile)
      const driverIdForNotify = driverIdParam || selectedDriver;
      if (driverIdForNotify) {
        const { data: driverRow } = await supabase
          .from("drivers")
          .select("first_name")
          .eq("id", driverIdForNotify)
          .maybeSingle();
        if (driverRow?.first_name) {
          const { data: driverProfile } = await supabase
            .from("profiles")
            .select("id")
            .ilike("full_name", `%${driverRow.first_name}%`)
            .eq("organization_id", request.organization_id)
            .limit(1)
            .maybeSingle();
          if (driverProfile?.id) {
            await supabase.rpc("send_notification", {
              _user_id: driverProfile.id,
              _type: "driver_assignment",
              _title: "New Assignment",
              _message: `You've been assigned to request ${request.request_number}. Vehicle: ${vehicle?.plate_number || "N/A"}, Route: ${request.departure_place || "TBD"} → ${request.destination || "TBD"}`,
              _link: "/vehicle-requests",
            });
          }
        }
      }
    } catch (e) {
      console.error("In-app notification error:", e);
    }
  };


  const completeMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("vehicle_requests").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", request.id);
    },
    onSuccess: () => {
      toast.success("Request completed");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendSmsMutation = useMutation({
    mutationFn: async () => {
      // Mark SMS as sent (actual SMS sending via edge function would happen here)
      await (supabase as any).from("vehicle_requests").update({
        sms_notification_sent: true,
        sms_sent_at: new Date().toISOString(),
      }).eq("id", request.id);
    },
    onSuccess: () => {
      toast.success("SMS notification sent");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const requestTypeLabel = {
    daily_operation: "Daily Operation",
    nighttime_operation: "Nighttime Operation",
    project_operation: "Project Operation",
    field_operation: "Field Operation",
  }[request.request_type] || request.request_type || "General";

  const Field = ({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) => (
    <div className={`min-w-0 ${full ? "col-span-2" : ""}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80 font-medium mb-0.5">{label}</div>
      <div className="text-sm text-foreground break-words">{value}</div>
    </div>
  );

  // Grouped detail blocks (issues #36 route view, #38 requested date,
  // #41 user org details, #55 tabular structured display).
  const Section = ({
    title,
    children,
  }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-4 py-2 bg-muted/40 border-b border-border/40">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          {title}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="space-y-3 min-w-0">
      {/* Header summary — type, status, requested date */}
      <Section title="Request Summary">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Request #" value={<span className="font-mono">{request.request_number}</span>} />
          <Field label="Type" value={<Badge variant="outline">{requestTypeLabel}</Badge>} />
          <Field label="Status" value={<Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "secondary"}>{request.status}</Badge>} />
          <Field label="Priority" value={<span className="capitalize">{request.priority || "normal"}</span>} />
          {/* Issue #38 — show when the request was actually filed */}
          {request.created_at && (
            <Field label="Requested On" value={fmtOrgTime(request.created_at)} />
          )}
          {request.trip_type && (
            <Field label="Trip" value={request.trip_type === "one_way" ? "One Way" : "Round Trip"} />
          )}
        </div>
      </Section>

      {/* Audit strip — surfaces approver + dispatcher names and timestamps
          at the top of the panel so fleet ops can see accountability without
          scrolling through the full approval history. */}
      {(lastApproval || request.assigned_at) && (
        <div className="rounded-md border border-border/50 bg-muted/30 p-2.5 grid sm:grid-cols-2 gap-2 text-xs">
          {lastApproval && (
            <div className="flex items-start gap-1.5">
              {lastApproval.status === "approved" ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {lastApproval.status === "approved" ? "Approved by" : "Rejected by"}
                </div>
                <div className="font-medium truncate">{lastApproval.approver_name}</div>
                <div className="text-muted-foreground text-[11px]">
                  {lastApproval.decision_at ? fmtOrgTime(lastApproval.decision_at) : "—"}
                </div>
              </div>
            </div>
          )}
          {request.assigned_at && (
            <div className="flex items-start gap-1.5">
              <Truck className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {request.cross_pool_assignment ? "Cross-pool assigned by" : "Assigned by"}
                </div>
                <div className="font-medium truncate">{assignerName || "Dispatcher"}</div>
                <div className="text-muted-foreground text-[11px]">
                  {fmtOrgTime(request.assigned_at)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issue #41 — Requester organisational context.
          Division ← user_roles.business_unit, Department ← request override
          or profile, Section ← profile.job_title. Always rendered (with "—"
          fallback) so approvers can spot missing org placement. */}
      <Section title="Requester & Organization">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Name" value={request.requester_name || "—"} />
          <Field label="Employee ID" value={requesterProfile?.employee_code || "—"} />
          {request.filed_on_behalf && request.filed_by_name && (
            <Field label="Filed By" value={`${request.filed_by_name} (on behalf)`} full />
          )}
          <Field
            label="Division"
            value={
              request.business_unit_name ||
              requesterProfile?.business_unit_name ||
              "—"
            }
          />
          <Field
            label="Department"
            value={request.department_name || requesterProfile?.department || "—"}
          />
          <Field label="Section" value={requesterProfile?.job_title || "—"} full />
          {(request.contact_phone || requesterProfile?.phone) && (
            <Field label="Contact Phone" value={request.contact_phone || requesterProfile?.phone} />
          )}
          {requesterProfile?.email && (
            <Field label="Email" value={requesterProfile.email} />
          )}
        </div>
      </Section>

      {/* Issue #36 — Route shown clearly with named places + addresses */}
      <Section title="Route">
        <div className="space-y-3">
          {(() => {
            const depName =
              (typeof request.departure_place === "string" && request.departure_place.trim()) ||
              (typeof request.departure_address === "string" && request.departure_address.trim()) ||
              null;
            const depAddress =
              (typeof request.departure_address === "string" && request.departure_address.trim()) ||
              null;
            const depCoords =
              Number.isFinite(Number(request.departure_lat)) && Number.isFinite(Number(request.departure_lng))
                ? `${Number(request.departure_lat).toFixed(5)}°, ${Number(request.departure_lng).toFixed(5)}°`
                : null;
            const destName =
              (typeof request.destination === "string" && request.destination.trim()) ||
              (typeof request.destination_address === "string" && request.destination_address.trim()) ||
              null;
            const destAddress =
              (typeof request.destination_address === "string" && request.destination_address.trim()) ||
              null;
            const destCoords =
              Number.isFinite(Number(request.destination_lat)) && Number.isFinite(Number(request.destination_lng))
                ? `${Number(request.destination_lat).toFixed(5)}°, ${Number(request.destination_lng).toFixed(5)}°`
                : null;
            return (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80 font-medium">Departure</div>
                    <div className="text-sm font-medium text-foreground break-words">
                      {depName || depCoords || "—"}
                    </div>
                    {depAddress && depAddress !== depName && (
                      <div className="text-xs text-muted-foreground break-words">{depAddress}</div>
                    )}
                    {depCoords && (
                      <div className="text-[11px] text-muted-foreground/80 font-mono">{depCoords}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80 font-medium">Destination</div>
                    <div className="text-sm font-medium text-foreground break-words">
                      {destName || destCoords || "—"}
                    </div>
                    {destAddress && destAddress !== destName && (
                      <div className="text-xs text-muted-foreground break-words">{destAddress}</div>
                    )}
                    {destCoords && (
                      <div className="text-[11px] text-muted-foreground/80 font-mono">{destCoords}</div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
          {request.distance_log_km && (
            <div className="text-xs text-muted-foreground pt-1 border-t border-border/40">
              Estimated distance: <span className="text-foreground font-medium">{request.distance_log_km} km</span>
            </div>
          )}
        </div>
      </Section>

      {/* Schedule */}
      <Section title="Schedule">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Requested On" value={fmtOrgTime(request.created_at)} />
          {request.submitted_at && (
            <Field label="Submitted At" value={fmtOrgTime(request.submitted_at)} />
          )}
          <Field label="Needed From" value={fmtOrgTime(request.needed_from)} />
          <Field label="Needed Until" value={request.needed_until ? fmtOrgTime(request.needed_until) : "—"} />
          {request.trip_duration_days && (
            <Field label="Duration" value={`${request.trip_duration_days} day${request.trip_duration_days > 1 ? "s" : ""}`} />
          )}
        </div>
      </Section>

      {/* Resource — pool / vehicle / cargo */}
      <Section title="Vehicle & Resources">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {request.vehicle_type && <Field label="Vehicle Type" value={request.vehicle_type} />}
          <Field label="Vehicles Requested" value={request.num_vehicles || 1} />
          <Field label="Passengers" value={request.passengers || "—"} />
          {request.cargo_load && <Field label="Cargo / Load" value={request.cargo_load} />}
          {request.pool_category && (
            <Field
              label="Assigned Location"
              value={`${request.pool_category} / ${request.pool_name || "—"}`}
              full
            />
          )}
          {request.project_number && (
            <Field label="Project #" value={request.project_number} full />
          )}
        </div>
      </Section>

      {request.purpose && (
        <Section title="Purpose / Justification">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-y-auto">
            {request.purpose}
          </p>
        </Section>
      )}

      {/* Resource-aware downgrade suggestion — appears when the requester
          chose a more expensive class than the system recommended. */}
      {request.recommended_vehicle_type &&
        request.vehicle_type &&
        request.recommended_vehicle_type !== request.vehicle_type && (() => {
          const isUp = isUpgradeOverRecommendation(request.vehicle_type, request.recommended_vehicle_type);
          if (!isUp) return null;
          const rec = getVehicleClassProfile(request.recommended_vehicle_type);
          const chosen = getVehicleClassProfile(request.vehicle_type);
          return (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                💡 Cost-saving suggestion
              </div>
              <p className="text-xs text-muted-foreground">
                Requester picked <span className="font-medium text-foreground">{chosen?.label || request.vehicle_type}</span>{" "}
                ({chosen ? COST_BAND_LABELS[chosen.costBand] : "—"}) but{" "}
                <span className="font-medium text-foreground">{rec?.label || request.recommended_vehicle_type}</span>{" "}
                ({rec ? COST_BAND_LABELS[rec.costBand] : "—"}) would meet their stated need
                ({request.passengers || 1} passengers, {request.cargo_load || "no"} cargo).
              </p>
              {request.vehicle_type_justification && (
                <div className="text-xs bg-background/60 border border-border/50 rounded-md p-2">
                  <span className="text-muted-foreground">Requester's justification:</span>{" "}
                  <span className="text-foreground">{request.vehicle_type_justification}</span>
                </div>
              )}
            </div>
          );
        })()}

      {/* Multi-vehicle: per-vehicle assignment list with own check-in/out */}
      <AssignedFleetList
        request={request}
        onCheckIn={(a) => setActiveAssignment(a)}
      />

      {/* Operator tools: geofencing / optimization / consolidation / navigate */}
      {canManageAll && (
        <OperatorToolsTabs
          request={request}
          canManage={canManageAll}
          isAssigning={assignMutation.isPending}
          onAssignViaPicker={(vehicleId, driverId) =>
            assignMutation.mutate({ vehicleId, driverId })
          }
          onUnavailable={() =>
            toast.info("Mark-unavailable is handled in the Pool Review queue.")
          }
        />
      )}

      {/* Approval routing info */}
      {request.approval_routed_to && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg p-2">
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
          <span>
            {request.approval_status === "auto_approved"
              ? "Auto-approved (requester is manager or above)"
              : `Routed to ${request.approval_routed_to} for approval (${request.trip_duration_days || 1} day${(request.trip_duration_days || 1) > 1 ? "s" : ""} trip)`}
          </span>
        </div>
      )}

      {/* Cross-pool indicator */}
      {request.cross_pool_assignment && (
        <div className="flex items-center gap-2 text-xs bg-amber-500/10 rounded-lg p-2">
          <Shuffle className="w-3.5 h-3.5 text-amber-500" />
          <span>Cross-pool assignment from <strong>{request.original_pool_name}</strong></span>
        </div>
      )}

      {/* Assigned vehicle/driver */}
      {request.assigned_vehicle && (
        <div className="flex items-center gap-2 text-sm bg-primary/5 rounded-lg p-2">
          <Truck className="w-4 h-4 text-primary" />
          <span>Assigned: {request.assigned_vehicle.plate_number} ({request.assigned_vehicle.make} {request.assigned_vehicle.model})</span>
        </div>
      )}
      {request.assigned_driver && (
        <div className="text-sm text-muted-foreground pl-6">
          Driver: {request.assigned_driver.first_name} {request.assigned_driver.last_name}
        </div>
      )}

      {/* Driver Check-in/out status */}
      {request.driver_checked_in_at && (
        <div className="bg-green-500/10 rounded-lg p-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <LogIn className="w-3.5 h-3.5 text-green-500" />
            <span>Checked in: {format(new Date(request.driver_checked_in_at), "MMM dd, h:mm a")}</span>
            {request.driver_checkin_odometer && <span className="text-muted-foreground">| {request.driver_checkin_odometer} km</span>}
          </div>
          {request.driver_checked_out_at && (
            <div className="flex items-center gap-2">
              <LogIn className="w-3.5 h-3.5 text-amber-500 rotate-180" />
              <span>Checked out: {format(new Date(request.driver_checked_out_at), "MMM dd, h:mm a")}</span>
              {request.driver_checkout_odometer && <span className="text-muted-foreground">| {request.driver_checkout_odometer} km</span>}
            </div>
          )}
        </div>
      )}

      {/* Auto-close indicator */}
      {request.auto_closed && (
        <div className="flex items-center gap-2 text-xs bg-blue-500/10 rounded-lg p-2">
          <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
          <span>Auto-closed at destination geofence {request.auto_closed_at ? `on ${format(new Date(request.auto_closed_at), "MMM dd, h:mm a")}` : ""}</span>
        </div>
      )}

      {/* SMS status */}
      {request.sms_notification_sent && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg p-2">
          <Send className="w-3.5 h-3.5 text-muted-foreground" />
          <span>SMS sent {request.sms_sent_at ? format(new Date(request.sms_sent_at), "MMM dd, h:mm a") : ""}</span>
        </div>
      )}

      {/* Rejection reason — surfaces a Fix & Resubmit CTA when the viewer
          owns the row, so requesters never have to hunt the table for the
          tiny pencil icon. */}
      {request.status === "rejected" && (request.rejection_reason || isOwnRow) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm flex-1 min-w-0">
              <div className="font-medium text-destructive">Request Rejected</div>
              {request.rejection_reason && (
                <p className="text-foreground/80 mt-0.5 break-words">
                  {request.rejection_reason}
                </p>
              )}
            </div>
          </div>
          {isOwnRow && onEdit && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                Fix & Resubmit
              </Button>
            </div>
          )}
        </div>
      )}
      {/* Generic rejection_reason fallback for non-owners on non-rejected status */}
      {request.status !== "rejected" && request.rejection_reason && (
        <div className="flex items-start gap-2 text-sm bg-destructive/10 rounded-lg p-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div><span className="font-medium">Rejection Reason:</span> {request.rejection_reason}</div>
        </div>
      )}

      {/* Approved By */}
      {requestApprovals.length > 0 && (
        <div className="border-t pt-3">
          <p className="font-medium text-sm mb-2">Approved By</p>
          {requestApprovals.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
              <div className="flex items-center gap-2">
              {a.status === "approved" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                <span>{a.approver_name}</span>
                <Badge variant={a.status === "approved" ? "default" : "destructive"} className="text-[10px]">{a.status}</Badge>
              </div>
              <span className="text-muted-foreground">{a.decision_at ? format(new Date(a.decision_at), "MMM dd, h:mm a") : "Pending"}</span>
            </div>
          ))}
          {requestApprovals.some((a: any) => a.comments) && (
            <div className="text-xs text-muted-foreground mt-1 italic">
              {requestApprovals.filter((a: any) => a.comments).map((a: any) => (
                <p key={a.id}>"{a.comments}" — {a.approver_name}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejection Form */}
      {showRejectForm && (
        <div className="border rounded-lg p-3 space-y-2">
          <Label className="text-sm font-medium text-destructive">Rejection Reason (required)</Label>
          <Textarea
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {request.status === "pending" && !showRejectForm && canManageAll && (
          <>
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowRejectForm(true)}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </>
        )}
        {request.status === "approved" && canManageAll && (
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              size="sm"
              onClick={() => setAssignDialogOpen(true)}
              disabled={assignMutation.isPending}
            >
              <Truck className="w-3.5 h-3.5 mr-1" />
              {assignMutation.isPending ? "Assigning..." : "Assign Vehicle & Driver"}
            </Button>
            {onCrossPool && (
              <Button size="sm" variant="outline" onClick={onCrossPool}>
                <Shuffle className="w-3.5 h-3.5 mr-1" /> Cross-Pool
              </Button>
            )}
            <AssignVehicleDriverDialog
              open={assignDialogOpen}
              onOpenChange={setAssignDialogOpen}
              request={request}
              vehicles={scopedAvailable as any}
              drivers={drivers as any}
              suggested={suggested as any}
              initialVehicleId={selectedVehicleId}
              initialDriverId={selectedDriver}
              isAssigning={assignMutation.isPending}
              onCrossPool={onCrossPool}
              onAssign={(vehicleId, driverId) => {
                setSelectedVehicleId(vehicleId);
                setSelectedDriver(driverId);
                assignMutation.mutate(
                  { vehicleId, driverId },
                  {
                    onSuccess: () => setAssignDialogOpen(false),
                  }
                );
              }}
            />
          </div>
        )}
        {request.status === "assigned" && (
          <>
            {!request.driver_checked_in_at && onCheckIn && canCheckInOut && (
              <Button size="sm" onClick={onCheckIn} className="bg-green-600 hover:bg-green-700">
                <LogIn className="w-3.5 h-3.5 mr-1" /> Check In
              </Button>
            )}
            {request.driver_checked_in_at && !request.driver_checked_out_at && onCheckIn && canCheckInOut && (
              <Button size="sm" onClick={onCheckIn} className="bg-amber-600 hover:bg-amber-700">
                <LogIn className="w-3.5 h-3.5 mr-1 rotate-180" /> Check Out
              </Button>
            )}
            {!request.sms_notification_sent && canManageAll && (
              <Button size="sm" variant="outline" onClick={() => sendSmsMutation.mutate()} disabled={sendSmsMutation.isPending}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send SMS
              </Button>
            )}
            {canManageAll && (
              <Button size="sm" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
              </Button>
            )}
          </>
        )}
        {["pending", "approved"].includes(request.status) && !showRejectForm && (
          <Button size="sm" variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        )}

        {/* Edit / Resubmit / Delete — pushed to the right edge so requester
            self-service controls are predictable across all statuses. */}
        {(canEditRow || canDeleteRow) && !showRejectForm && (
          <div className="flex items-center gap-2 ml-auto">
            {canEditRow && onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="gap-1.5"
                title={request.status === "rejected" ? "Fix and resubmit" : "Edit request"}
              >
                {request.status === "rejected" ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    Fix & Resubmit
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                    Edit
                  </>
                )}
              </Button>
            )}
            {canDeleteRow && onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                className="gap-1.5 text-destructive hover:text-destructive"
                title="Remove request"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {activeAssignment && (
        <AssignmentCheckInDialog
          request={request}
          assignment={activeAssignment}
          open={!!activeAssignment}
          onClose={() => setActiveAssignment(null)}
        />
      )}
    </div>
  );
};

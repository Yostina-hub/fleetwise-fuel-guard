import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Kanban, List, Download, Plus, LayoutGrid, Search,
  CheckCircle, XCircle, ClipboardList, Package
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTripRequests } from "@/hooks/useTripRequests";
import { useApprovals } from "@/hooks/useApprovals";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthContext } from "@/contexts/AuthContext";
import { QuickTripRequest } from "@/components/trips/QuickTripRequest";
import { TripStatsBar } from "@/components/trips/TripStatsBar";
import { TripDetailPanel } from "@/components/trips/TripDetailPanel";
import { VehicleRequestPipelineBoard } from "@/components/vehicle-requests/VehicleRequestPipelineBoard";
import { VehicleRequestCard } from "@/components/vehicle-requests/VehicleRequestCard";
import { ActiveAssignments } from "@/components/scheduling/ActiveAssignments";
import { CreateAssignmentDialog } from "@/components/scheduling/CreateAssignmentDialog";

import { CalendarView } from "@/components/scheduling/CalendarView";
import { TimelineView } from "@/components/scheduling/TimelineView";
import { UtilizationAnalytics } from "@/components/scheduling/UtilizationAnalytics";
import { ExportScheduleDialog } from "@/components/scheduling/ExportScheduleDialog";
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";
import { ChevronLeft } from "lucide-react";
import { VehicleRequestsPanel } from "@/components/vehicle-requests/VehicleRequestsPanel";
import DispatchJobsTab from "@/components/dispatch/DispatchJobsTab";
import { PendingApprovalsPanel } from "@/components/trips/PendingApprovalsPanel";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import DriverTripsView from "@/components/trips/DriverTripsView";
import { useSharedRideMembership } from "@/hooks/useSharedRideMembership";

const TripManagement = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizationId } = useOrganization();
  const { requests: legacyRequests, loading: loadingLegacy, submitRequest, cancelRequest } = useTripRequests();
  const { pendingApprovals, approveRequest, rejectRequest } = useApprovals();
  const { isSuperAdmin, hasRole, hasPermission, loading: permsLoading } = usePermissions();
  const { user: authUser } = useAuthContext();

  // ── Current system data source ─────────────────────────────────────
  // The Trips tab now mirrors the unified `vehicle_requests` flow that
  // VehicleRequestForm + assignment + driver-checkin produce. Legacy
  // `trip_requests` are kept available for the Approvals tab below.
  const { data: vehicleRequests = [], isLoading: loadingVR } = useQuery({
    queryKey: ["trip-mgmt-vehicle-requests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(`
          *,
          assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model),
          assigned_driver:assigned_driver_id(id, first_name, last_name)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  // Realtime: refresh kanban when vehicle_requests change.
  useEffect(() => {
    if (!organizationId) return;
    const ch = supabase
      .channel("trip-mgmt-vr-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "vehicle_requests" },
        () => { /* react-query refetch via invalidate */
          // Lightweight: trigger a refetch by invalidating.
          (window as any).__qc?.invalidateQueries?.({ queryKey: ["trip-mgmt-vehicle-requests"] });
        }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [organizationId]);

  const requests = vehicleRequests;
  const loading = loadingVR;

  // Resolve driver record for current user (only used when isDriverOnly).
  // Uses the AuthContext user (which honors super-admin impersonation) rather
  // than `supabase.auth.getUser()` so impersonated drivers resolve correctly.
  const { data: driverSelf, isLoading: driverLoading } = useQuery({
    queryKey: ["trip-mgmt-driver-self", organizationId, authUser?.id],
    queryFn: async () => {
      if (!organizationId || !authUser?.id) return null;
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId)
        .eq("user_id", authUser.id)
        .maybeSingle();
      return data;
    },
    enabled: !!organizationId && !!authUser?.id,
  });

  // RBAC role groups
  const isDriverOnly = hasRole("driver") && !isSuperAdmin && !hasRole("operations_manager")
    && !hasRole("fleet_owner") && !hasRole("fleet_manager") && !hasRole("org_admin")
    && !hasRole("dispatcher") && !hasRole("operator");
  const canViewPage = isSuperAdmin || hasPermission("view_fleet");
  const canManage = isSuperAdmin || hasPermission("manage_fleet");
  const canApprove = isSuperAdmin || hasRole("operations_manager") || hasRole("fleet_owner")
    || hasRole("fleet_manager") || hasRole("org_admin");
  const canViewAnalytics = isSuperAdmin || hasRole("operations_manager") || hasRole("fleet_owner")
    || hasRole("fleet_manager") || hasRole("org_admin") || hasRole("auditor");

  // Persist view + filter prefs across sessions (parity with Vehicles & Dispatch).
  const TRIP_PREFS_KEY = "trips.management.prefs.v1";
  const loadPrefs = () => {
    try {
      const raw = localStorage.getItem(TRIP_PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const initialPrefs = loadPrefs();
  const [viewMode, setViewMode] = useState<"pipeline" | "grid" | "list">(initialPrefs?.viewMode ?? "pipeline");
  const [statusFilter, setStatusFilter] = useState<string | null>(initialPrefs?.statusFilter ?? null);
  const [searchQuery, setSearchQuery] = useState(initialPrefs?.searchQuery ?? "");

  useEffect(() => {
    try {
      localStorage.setItem(TRIP_PREFS_KEY, JSON.stringify({ viewMode, statusFilter, searchQuery }));
    } catch {}
  }, [viewMode, statusFilter, searchQuery]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  // Reject prompt — approvers must explain the decision. Two outcomes:
  //   • "revision" → bounce back to `pending` so the requester can edit & resubmit
  //   • "final"    → permanent `rejected` (view-only thereafter)
  const [rejectTarget, setRejectTarget] = useState<{ tripId: string; requestNumber?: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  // Manager status-override dialog. Lets approvers re-approve a rejected
  // request, send an approved one back for revision, or change to any
  // non-terminal status without leaving the page.
  const [statusTarget, setStatusTarget] = useState<{ tripId: string; requestNumber?: string; current: string } | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "trips");

  // Sync tab from URL changes (sidebar deep links)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Sync URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Map StatsBar filter keys → underlying vehicle_requests.status values.
  const STATUS_FILTER_MAP: Record<string, string[]> = {
    pending:     ["pending", "submitted", "draft"],
    approved:    ["approved"],
    assigned:    ["assigned", "scheduled", "dispatched"],
    in_progress: ["in_progress", "in_service"],
    completed:   ["completed", "closed"],
    rejected:    ["rejected"],
    cancelled:   ["cancelled", "canceled"],
  };

  const filteredTrips = useMemo(() => {
    let trips = requests || [];
    if (statusFilter) {
      const allowed = STATUS_FILTER_MAP[statusFilter] ?? [statusFilter];
      trips = trips.filter((t: any) => allowed.includes(t.status));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      trips = trips.filter((t: any) =>
        t.purpose?.toLowerCase().includes(q) ||
        t.request_number?.toLowerCase().includes(q)
      );
    }
    return trips;
  }, [requests, statusFilter, searchQuery]);

  // Lookup of which filtered trips are part of a shared ride — drives the
  // "Shared" badge on each card without per-card queries.
  const tripIdsForShared = useMemo(
    () => filteredTrips.map((t: any) => t.id).filter(Boolean),
    [filteredTrips],
  );
  const { membership: sharedRideMap } = useSharedRideMembership(tripIdsForShared);

  const handleViewDetails = (trip: any) => {
    setSelectedTrip(trip);
    setDetailOpen(true);
  };

  const handleQuickApprove = async (tripId: string) => {
    const approval = pendingApprovals?.find((a: any) => a.trip_request_id === tripId);
    if (approval) {
      await approveRequest.mutateAsync({
        approvalId: approval.id,
        requestId: tripId,
        comment: "Quick approved",
      });
    } else {
      toast.error("No pending approval found for this request");
    }
  };

  // Quick-reject now opens a small dialog so the approver MUST supply a
  // reason. The actual mutation runs in `submitReject` below.
  const handleQuickReject = async (tripId: string) => {
    const req = (requests || []).find((r: any) => r.id === tripId);
    setRejectReason("");
    setRejectTarget({ tripId, requestNumber: req?.request_number });
  };

  const submitReject = async (mode: "revision" | "final") => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Reason is required");
      return;
    }
    setRejectSubmitting(true);
    try {
      if (mode === "final") {
        // Permanent reject — also flip any open trip_approvals row so the
        // legacy queue stays consistent.
        const approval = pendingApprovals?.find(
          (a: any) => a.trip_request_id === rejectTarget.tripId,
        );
        if (approval) {
          await rejectRequest.mutateAsync({
            approvalId: approval.id,
            requestId: rejectTarget.tripId,
            comment: reason,
          });
        } else {
          const { error } = await (supabase as any)
            .from("vehicle_requests")
            .update({
              status: "rejected",
              approval_status: "rejected",
              rejection_reason: reason,
            })
            .eq("id", rejectTarget.tripId);
          if (error) throw error;
          toast.success("Request rejected");
        }
      } else {
        // Send back for revision — keep `status='pending'` so the requester's
        // Edit/Delete actions remain enabled. Stash the reviewer note on
        // rejection_reason so the requester sees what to fix.
        const { error } = await (supabase as any)
          .from("vehicle_requests")
          .update({
            status: "pending",
            approval_status: "pending",
            rejection_reason: reason,
          })
          .eq("id", rejectTarget.tripId);
        if (error) throw error;
        toast.success("Sent back to requester for revision");
      }
      setRejectTarget(null);
      setRejectReason("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject request");
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Manager status-override — applies the requested transition and writes
  // an optional reviewer note to `rejection_reason` (kept as the generic
  // reviewer-feedback field across the workflow).
  const applyStatusChange = async (newStatus: string, note: string) => {
    if (!statusTarget) return;
    setStatusSubmitting(true);
    try {
      const isRejected = newStatus === "rejected";
      const isPending = newStatus === "pending" || newStatus === "submitted";
      const update: Record<string, any> = {
        status: newStatus,
        approval_status: isRejected ? "rejected" : isPending ? "pending" : "approved",
      };
      if (note.trim()) update.rejection_reason = note.trim();
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(update)
        .eq("id", statusTarget.tripId);
      if (error) throw error;
      toast.success(`Status changed to ${newStatus.replace("_", " ")}`);
      setStatusTarget(null);
      setDetailOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to change status");
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Real pending count from the unified vehicle_requests pipeline
  // (the legacy trip_approvals queue is rarely populated).
  const pendingApprovalCount = useMemo(
    () => (requests || []).filter((r: any) => r.status === "pending" || r.status === "submitted").length,
    [requests]
  );

  // ── RBAC enforcement ────────────────────────────────────────────────
  // Show loader while permissions resolve to avoid flash of unauthorized UI.
  if (permsLoading || (isDriverOnly && driverLoading)) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading" />
        </div>
      </Layout>
    );
  }
  // Drivers see a focused, driver-scoped view of their own trips.
  if (isDriverOnly) {
    return (
      <Layout>
        <div className="p-4 md:p-6">
          <DriverTripsView
            driverId={driverSelf?.id}
            driverName={driverSelf ? `${driverSelf.first_name} ${driverSelf.last_name}` : undefined}
          />
        </div>
      </Layout>
    );
  }
  // Hard block users without view_fleet.
  if (!canViewPage) {
    return (
      <Layout>
        <div className="p-8">
          <Card className="p-8 text-center max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-destructive" />
            <h2 className="text-lg font-semibold mb-1">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You don't have permission to access Trip Management. Contact your administrator if you believe this is an error.
            </p>
          </Card>
        </div>
      </Layout>
    );
  }
  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('pages.trip_management.title', 'Trip Management')}</h1>
            <p className="text-sm text-muted-foreground">
              Request, approve, and track trips in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1.5 h-8 text-xs">
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            )}
            {canManage && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" /> Full Request
              </Button>
            )}
          </div>
        </div>

        {createOpen ? (
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-border/60 bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => setCreateOpen(false)}
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Trips
              </Button>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                New Fleet Request
              </span>
            </div>
            <div className="p-0">
              <VehicleRequestForm
                open
                embedded
                source="trip_management"
                onOpenChange={(v) => !v && setCreateOpen(false)}
                onSubmitted={() => setCreateOpen(false)}
              />
            </div>
          </Card>
        ) : (
          <>
        {/* Quick Trip Request — only for users who can manage fleet */}
        {canManage && <QuickTripRequest />}

        {/* Stats Filter Bar */}
        <TripStatsBar
          trips={requests || []}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />

        {/* Tabs & View Toggle */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="h-8">
              <TabsTrigger value="trips" className="text-xs h-7">Trips</TabsTrigger>
              <TabsTrigger value="vehicle-requests" className="text-xs h-7 gap-1">
                <ClipboardList className="w-3 h-3" /> Vehicle Requests
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="text-xs h-7 gap-1">
                <Package className="w-3 h-3" /> Dispatch
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs h-7">Assignments</TabsTrigger>
              {canApprove && (
                <TabsTrigger value="approvals" className="text-xs h-7 gap-1">
                  Approvals
                  {pendingApprovalCount > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[9px] ml-1">
                      {pendingApprovalCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="calendar" className="text-xs h-7">Calendar</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs h-7">Timeline</TabsTrigger>
              {canViewAnalytics && (
                <TabsTrigger value="analytics" className="text-xs h-7">{t('common.analytics', 'Analytics')}</TabsTrigger>
              )}
            </TabsList>

            {activeTab === "trips" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t('trips.search', 'Search trips...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-48 pl-8 text-xs"
                  />
                </div>
                <div className="flex items-center border border-border rounded-lg p-0.5">
                  {([
                    { key: "pipeline", icon: Kanban, label: "Pipeline" },
                    { key: "grid", icon: LayoutGrid, label: "Grid" },
                    { key: "list", icon: List, label: "List" },
                  ] as const).map((v) => (
                    <Button
                      key={v.key}
                      variant={viewMode === v.key ? "default" : "ghost"}
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setViewMode(v.key)}
                      title={v.label}
                    >
                      <v.icon className="w-3.5 h-3.5" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trip Views */}
          <TabsContent value="trips" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading trips...</span>
                </div>
              </div>
            ) : viewMode === "pipeline" ? (
              <VehicleRequestPipelineBoard
                requests={filteredTrips}
                onApprove={canApprove ? handleQuickApprove : undefined}
                onReject={canApprove ? handleQuickReject : undefined}
                onViewDetails={handleViewDetails}
                onAssign={(req) => { setSelectedTrip(req); setAssignOpen(true); }}
                visibleColumns={statusFilter ? [statusFilter] : undefined}
                sharedRideMap={sharedRideMap}
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredTrips.map((req: any) => (
                    <VehicleRequestCard
                      key={req.id}
                      request={req}
                      onApprove={canApprove ? handleQuickApprove : undefined}
                      onReject={canApprove ? handleQuickReject : undefined}
                      onViewDetails={handleViewDetails}
                      onAssign={(r) => { setSelectedTrip(r); setAssignOpen(true); }}
                      sharedRide={sharedRideMap[req.id] ?? null}
                    />
                  ))}
                </AnimatePresence>
                {filteredTrips.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    No requests found. Create one with “Full Request” above.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {filteredTrips.map((req: any) => (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleViewDetails(req)}
                      className="flex items-center gap-4 px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-xs font-semibold text-primary w-24 shrink-0">
                        {req.request_number ?? req.id.slice(0, 8)}
                      </span>
                      <span className="text-sm truncate flex-1">{req.purpose || "(no purpose)"}</span>
                      <span className="text-xs text-muted-foreground w-32 shrink-0 hidden md:block">
                        {req.pool_name || req.pool_location || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground w-32 shrink-0 hidden lg:block">
                        {req.needed_from ? new Date(req.needed_from).toLocaleDateString() : "—"}
                      </span>
                      <StatusPill status={req.status} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredTrips.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    No requests found.
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Vehicle Requests Tab */}
          <TabsContent value="vehicle-requests" className="mt-4">
            <VehicleRequestsPanel />
          </TabsContent>

          {/* Dispatch Tab */}
          <TabsContent value="dispatch" className="mt-4">
            <DispatchJobsTab />
          </TabsContent>

          {/* Active Assignments Tab */}
          <TabsContent value="active" className="mt-4">
            <ActiveAssignments />
          </TabsContent>

          {/* Approvals Tab */}
          {canApprove && (
            <TabsContent value="approvals" className="mt-4 space-y-4">
              <PendingApprovalsPanel />
            </TabsContent>
          )}

          <TabsContent value="calendar" className="mt-4">
            <CalendarView />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <TimelineView />
          </TabsContent>

          {canViewAnalytics && (
            <TabsContent value="analytics" className="mt-4">
              <UtilizationAnalytics />
            </TabsContent>
          )}
        </Tabs>
          </>
        )}
      </div>

      {/* Detail Panel */}
      <TripDetailPanel
        trip={selectedTrip}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSubmit={(id) => submitRequest.mutate(id)}
        onAssign={(trip) => {
          setDetailOpen(false);
          setSelectedTrip(trip);
          setAssignOpen(true);
        }}
        onCancel={(id) => {
          cancelRequest.mutate(id);
          setDetailOpen(false);
        }}
        onChangeStatus={canApprove ? (trip) => {
          setStatusTarget({
            tripId: trip.id,
            requestNumber: trip.request_number,
            current: trip.status,
          });
        } : undefined}
      />

      <ExportScheduleDialog open={exportOpen} onOpenChange={setExportOpen} />
      {/* Inline form rendered above as a panel — no modal dialog */}
      <CreateAssignmentDialog open={assignOpen} onOpenChange={setAssignOpen} />

      {/* Reject-with-reason prompt — invoked by the kanban "X" quick action.
          A reason is mandatory so the requester always gets actionable feedback. */}
      <RejectReasonDialog
        open={!!rejectTarget}
        requestNumber={rejectTarget?.requestNumber}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        submitting={rejectSubmitting}
        onCancel={() => { setRejectTarget(null); setRejectReason(""); }}
        onConfirm={submitReject}
      />

      {/* Manager status-override dialog — change a request to any non-terminal
          status (re-approve, send back, reject) with an optional reviewer note. */}
      <ChangeStatusDialog
        open={!!statusTarget}
        requestNumber={statusTarget?.requestNumber}
        currentStatus={statusTarget?.current}
        submitting={statusSubmitting}
        onCancel={() => setStatusTarget(null)}
        onConfirm={applyStatusChange}
      />
    </Layout>
  );
};

/* Manager-only status override. Lets approvers move a request to any
   workflow status (e.g. re-approve a rejected one, send an approved one
   back for revision) with an optional reviewer note. */
function ChangeStatusDialog({
  open, requestNumber, currentStatus, submitting, onCancel, onConfirm,
}: {
  open: boolean;
  requestNumber?: string;
  currentStatus?: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (status: string, note: string) => void;
}) {
  const [target, setTarget] = useState<string>("approved");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) {
      // Default to a sensible next step depending on current status.
      setTarget(
        currentStatus === "approved" ? "pending"
        : currentStatus === "rejected" ? "approved"
        : "approved"
      );
      setNote("");
    }
  }, [open, currentStatus]);

  const ALL_OPTIONS = [
    { value: "pending",   label: "Pending (send back for revision)" },
    { value: "approved",  label: "Approved" },
    { value: "rejected",  label: "Rejected (final)" },
    { value: "cancelled", label: "Cancelled" },
  ];
  // Block illegal transitions out of terminal states. Completed trips
  // can't be re-opened from this dialog — that requires a fresh request.
  const TERMINAL = new Set(["completed", "closed"]);
  const isTerminal = currentStatus ? TERMINAL.has(currentStatus) : false;
  const OPTIONS = isTerminal ? [] : ALL_OPTIONS;
  // Reason required when moving to a negative state.
  const requiresNote = target === "rejected" || target === "pending" || target === "cancelled";
  const canSubmit = !isTerminal && !!target && target !== currentStatus && (!requiresNote || note.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Change request status</DialogTitle>
          <DialogDescription>
            {requestNumber
              ? <>Override the workflow status for <span className="font-mono">{requestNumber}</span>.</>
              : "Override the workflow status for this request."}
            {currentStatus && (
              <> Current status: <span className="font-medium text-foreground">{currentStatus}</span>.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isTerminal && (
            <div className="p-3 rounded-md bg-muted/60 border border-border text-xs text-muted-foreground">
              This request is in a terminal state (<span className="font-medium text-foreground">{currentStatus}</span>) and
              cannot be changed. Create a new vehicle request if needed.
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cs-target">New status</Label>
            <select
              id="cs-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={isTerminal}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50"
            >
              {OPTIONS.map((o) => (
                <option key={o.value} value={o.value} disabled={o.value === currentStatus}>
                  {o.label}{o.value === currentStatus ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-note">
              Reviewer note {requiresNote ? "*" : "(optional)"}
            </Label>
            <Textarea
              id="cs-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the change so the requester has context"
              rows={3}
              maxLength={500}
              disabled={isTerminal}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button
            onClick={() => onConfirm(target, note)}
            disabled={submitting || !canSubmit}
          >
            {submitting ? "Saving…" : "Apply change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Two-mode reject dialog. The approver picks one of:
   • "Send back for revision" — keeps the request pending and lets the
     requester edit + resubmit. The reason becomes the reviewer note.
   • "Reject permanently" — moves the request to terminal `rejected`. */
function RejectReasonDialog({
  open, requestNumber, reason, onReasonChange, submitting, onCancel, onConfirm,
}: {
  open: boolean;
  requestNumber?: string;
  reason: string;
  onReasonChange: (v: string) => void;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (mode: "revision" | "final") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Reject vehicle request</DialogTitle>
          <DialogDescription>
            {requestNumber
              ? <>Choose how to reject <span className="font-mono">{requestNumber}</span>. The requester will see your reason.</>
              : "Choose how to reject this request. The requester will see your reason."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rej-reason">Reason *</Label>
          <Textarea
            id="rej-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Wrong destination — please update and resubmit"
            rows={4}
            maxLength={500}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Send back for revision</span> lets the
            requester edit and resubmit. <span className="font-medium text-foreground">Reject permanently</span> closes
            the request — the requester can only view it.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onConfirm("revision")}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? "Sending…" : "Send back for revision"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm("final")}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? "Rejecting…" : "Reject permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending:     "bg-warning/15 text-warning",
    submitted:   "bg-warning/15 text-warning",
    draft:       "bg-muted text-muted-foreground",
    approved:    "bg-success/15 text-success",
    assigned:    "bg-secondary/15 text-secondary",
    scheduled:   "bg-secondary/15 text-secondary",
    dispatched:  "bg-purple-500/15 text-purple-600",
    in_progress: "bg-primary/15 text-primary",
    in_service:  "bg-primary/15 text-primary",
    completed:   "bg-success/15 text-success",
    closed:      "bg-success/15 text-success",
    rejected:    "bg-destructive/15 text-destructive",
    cancelled:   "bg-muted text-muted-foreground",
    canceled:    "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    pending: "Pending", submitted: "Pending", draft: "Draft",
    approved: "Approved", assigned: "Assigned", scheduled: "Scheduled",
    dispatched: "Dispatched", in_progress: "Active", in_service: "Active",
    completed: "Done", closed: "Closed", rejected: "Rejected",
    cancelled: "Cancelled", canceled: "Cancelled",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};

export default TripManagement;

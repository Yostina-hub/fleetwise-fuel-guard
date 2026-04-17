import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
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
import { useTripRequests } from "@/hooks/useTripRequests";
import { useApprovals } from "@/hooks/useApprovals";
import { usePermissions } from "@/hooks/usePermissions";
import { QuickTripRequest } from "@/components/trips/QuickTripRequest";
import { TripPipelineBoard } from "@/components/trips/TripPipelineBoard";
import { TripStatsBar } from "@/components/trips/TripStatsBar";
import { TripDetailPanel } from "@/components/trips/TripDetailPanel";
import { TripCard } from "@/components/trips/TripCard";
import { ActiveAssignments } from "@/components/scheduling/ActiveAssignments";
import { CreateAssignmentDialog } from "@/components/scheduling/CreateAssignmentDialog";
import { ApprovalHistory } from "@/components/scheduling/ApprovalHistory";
import { CalendarView } from "@/components/scheduling/CalendarView";
import { TimelineView } from "@/components/scheduling/TimelineView";
import { UtilizationAnalytics } from "@/components/scheduling/UtilizationAnalytics";
import { ExportScheduleDialog } from "@/components/scheduling/ExportScheduleDialog";
import { CreateTripRequestDialog } from "@/components/scheduling/CreateTripRequestDialog";
import { VehicleRequestsPanel } from "@/components/vehicle-requests/VehicleRequestsPanel";
import DispatchJobsTab from "@/components/dispatch/DispatchJobsTab";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

const TripManagement = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requests, loading, submitRequest, cancelRequest } = useTripRequests();
  const { pendingApprovals, approveRequest, rejectRequest } = useApprovals();
  const { isSuperAdmin, hasRole, hasPermission, loading: permsLoading } = usePermissions();

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

  const [viewMode, setViewMode] = useState<"pipeline" | "grid" | "list">("pipeline");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
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

  const filteredTrips = useMemo(() => {
    let trips = requests || [];
    if (statusFilter) {
      trips = trips.filter((t: any) => t.status === statusFilter);
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

  const handleQuickReject = async (tripId: string) => {
    const approval = pendingApprovals?.find((a: any) => a.trip_request_id === tripId);
    if (approval) {
      await rejectRequest.mutateAsync({
        approvalId: approval.id,
        requestId: tripId,
        comment: "Rejected via quick action",
      });
    }
  };

  const pendingApprovalCount = pendingApprovals?.length || 0;

  // ── RBAC enforcement ────────────────────────────────────────────────
  // Drivers are redirected to their dedicated portal.
  if (!permsLoading && isDriverOnly) {
    return <Navigate to="/driver-portal" replace />;
  }
  // Show loader while permissions resolve to avoid flash of unauthorized UI.
  if (permsLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading permissions" />
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
              <TripPipelineBoard
                trips={filteredTrips}
                onSubmit={(id) => submitRequest.mutate(id)}
                onApprove={canApprove ? handleQuickApprove : undefined}
                onReject={canApprove ? handleQuickReject : undefined}
                onViewDetails={handleViewDetails}
                isSubmitting={submitRequest.isPending}
                visibleColumns={statusFilter ? [statusFilter] : undefined}
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredTrips.map((trip: any) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onSubmit={(id) => submitRequest.mutate(id)}
                      onApprove={canApprove ? handleQuickApprove : undefined}
                      onReject={canApprove ? handleQuickReject : undefined}
                      onViewDetails={handleViewDetails}
                      isSubmitting={submitRequest.isPending}
                    />
                  ))}
                </AnimatePresence>
                {filteredTrips.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    No trips found. Create your first trip request above.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {filteredTrips.map((trip: any) => (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleViewDetails(trip)}
                      className="flex items-center gap-4 px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-xs font-semibold text-primary w-24 shrink-0">
                        {trip.request_number}
                      </span>
                      <span className="text-sm truncate flex-1">{trip.purpose}</span>
                      <span className="text-xs text-muted-foreground w-28 shrink-0 hidden md:block">
                        {trip.pickup_geofence?.name || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground w-32 shrink-0 hidden lg:block">
                        {new Date(trip.pickup_at).toLocaleDateString()}
                      </span>
                      <StatusPill status={trip.status} />
                      {trip.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1"
                          onClick={(e) => { e.stopPropagation(); submitRequest.mutate(trip.id); }}
                        >
                          Submit
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredTrips.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    No trips found.
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
              {pendingApprovals && pendingApprovals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingApprovals.map((approval: any) => (
                    <motion.div
                      key={approval.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border-2 border-warning/30 bg-warning/5"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-primary">
                            {approval.trip_request?.request_number}
                          </span>
                          <p className="text-sm font-medium mt-1">{approval.trip_request?.purpose}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Step {approval.step}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span>{approval.trip_request?.profiles?.email?.split("@")[0]}</span>
                        <span>•</span>
                        <span>{approval.trip_request?.pickup_geofence?.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1"
                          onClick={() => approveRequest.mutate({
                            approvalId: approval.id,
                            requestId: approval.trip_request_id,
                            comment: "Approved",
                          })}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-8 text-xs gap-1"
                          onClick={() => rejectRequest.mutate({
                            approvalId: approval.id,
                            requestId: approval.trip_request_id,
                            comment: "Rejected",
                          })}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No pending approvals. All caught up! ✓
                </div>
              )}
              <ApprovalHistory />
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
      />

      <ExportScheduleDialog open={exportOpen} onOpenChange={setExportOpen} />
      <CreateTripRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateAssignmentDialog open={assignOpen} onOpenChange={setAssignOpen} />
    </Layout>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    scheduled: "bg-secondary/15 text-secondary",
    dispatched: "bg-purple-500/15 text-purple-600",
    in_service: "bg-primary/15 text-primary",
    completed: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  const labels: Record<string, string> = {
    draft: "Draft", submitted: "Pending", approved: "Approved",
    scheduled: "Scheduled", dispatched: "Dispatched", in_service: "Active",
    completed: "Done", rejected: "Rejected",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};

export default TripManagement;

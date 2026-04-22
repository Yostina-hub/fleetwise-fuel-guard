import { useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import { CreateTripRequestDialog } from "@/components/scheduling/CreateTripRequestDialog";
import { TripRequestsList } from "@/components/scheduling/TripRequestsList";
import { ExportScheduleDialog } from "@/components/scheduling/ExportScheduleDialog";
import { AvailabilityMatrix } from "@/components/scheduling/AvailabilityMatrix";
import { ApprovalsInbox } from "@/components/scheduling/ApprovalsInbox";
import { FuelApprovalsInbox } from "@/components/scheduling/FuelApprovalsInbox";
import { ApprovalChainConfig } from "@/components/scheduling/ApprovalChainConfig";

import { SchedulingAssistant } from "@/components/scheduling/SchedulingAssistant";
import { ActiveAssignments } from "@/components/scheduling/ActiveAssignments";
import { ScheduleBoard } from "@/components/scheduling/ScheduleBoard";
import { TimelineView } from "@/components/scheduling/TimelineView";
import { CalendarView } from "@/components/scheduling/CalendarView";
import { UtilizationAnalytics } from "@/components/scheduling/UtilizationAnalytics";
import { ActivityFeed } from "@/components/scheduling/ActivityFeed";
import { NotificationPreferences } from "@/components/scheduling/NotificationPreferences";
import { TripTemplatesTab } from "@/components/scheduling/TripTemplatesTab";
import SchedulingQuickActions from "@/components/scheduling/SchedulingQuickActions";
import SchedulingInsightsCard from "@/components/scheduling/SchedulingInsightsCard";
import SchedulingTrendChart from "@/components/scheduling/SchedulingTrendChart";
import { useTripRequests } from "@/hooks/useTripRequests";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

const FleetScheduling = () => {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");
  const { requests, loading } = useTripRequests();
  const { isSuperAdmin, hasRole } = usePermissions();
  const canApprove = isSuperAdmin || hasRole('operations_manager') || hasRole('fleet_owner');

  const stats = [
    {
      title: t("fleetScheduling.pendingApproval"),
      value: requests?.filter((r: any) => r.status === 'submitted').length || 0,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: t("fleetScheduling.approved"),
      value: requests?.filter((r: any) => r.status === 'approved').length || 0,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: t("fleetScheduling.activeTrips"),
      value: requests?.filter((r: any) => ['dispatched', 'in_service'].includes(r.status)).length || 0,
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      title: t("fleetScheduling.rejected"),
      value: requests?.filter((r: any) => r.status === 'rejected').length || 0,
      icon: XCircle,
      color: "text-red-600"
    }
  ];

  // Scheduling insights - in production, these would come from hooks
  const schedulingInsights = {
    utilizationRate: 78,
    avgApprovalTime: 4,
    peakDay: "Wednesday",
    completionRate: 94
  };

  const handleApproveAll = () => {
    if (canApprove) {
      setActiveTab("approvals");
    } else {
      toast.error("You don't have permission to approve requests");
    }
  };

  const handleViewCalendar = () => {
    setActiveTab("calendar");
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{t("fleetScheduling.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("fleetScheduling.subtitle")}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button variant="outline" onClick={() => setExportDialogOpen(true)} className="gap-2" aria-label={t("common.export")}>
              <Download className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("common.export")}</span>
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" aria-label={t("fleetScheduling.newTripRequest")}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("fleetScheduling.newTripRequest")}</span>
              <span className="sm:hidden">{t("common.create")}</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="glass-strong hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <SchedulingQuickActions
          onCreateRequest={() => setCreateDialogOpen(true)}
          onApproveAll={handleApproveAll}
          onViewCalendar={handleViewCalendar}
          onExportSchedule={() => setExportDialogOpen(true)}
        />

        {/* Insights and Trend */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SchedulingInsightsCard {...schedulingInsights} />
          <SchedulingTrendChart />
        </div>

        {/* Scheduling Assistant */}
        {canApprove && <SchedulingAssistant />}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="requests">{t("fleetScheduling.requests")}</TabsTrigger>
            <TabsTrigger value="assignments">{t("fleetScheduling.active")}</TabsTrigger>
            {canApprove && <TabsTrigger value="approvals">{t("fleetScheduling.approvals")}</TabsTrigger>}
            <TabsTrigger value="calendar">{t("fleetScheduling.calendar")}</TabsTrigger>
            <TabsTrigger value="schedule">{t("fleetScheduling.schedule")}</TabsTrigger>
            <TabsTrigger value="timeline">{t("fleetScheduling.timeline")}</TabsTrigger>
            <TabsTrigger value="analytics">{t("fleetScheduling.analytics")}</TabsTrigger>
            <TabsTrigger value="availability">{t("fleetScheduling.availability")}</TabsTrigger>
            <TabsTrigger value="activity">{t("fleetScheduling.activity")}</TabsTrigger>
            <TabsTrigger value="templates">{t("fleetScheduling.templates")}</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="config">{t("fleetScheduling.config")}</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="notifications">{t("fleetScheduling.preferences")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <TripRequestsList requests={requests} loading={loading} />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <ActiveAssignments />
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvals" className="space-y-4">
              <ApprovalsInbox />
              <FuelApprovalsInbox />
            </TabsContent>
          )}

          <TabsContent value="calendar" className="space-y-4">
            <CalendarView />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <ScheduleBoard />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <TimelineView />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <UtilizationAnalytics />
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <AvailabilityMatrix />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityFeed />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TripTemplatesTab />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="config" className="space-y-4">
              <ApprovalChainConfig />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="notifications" className="space-y-4">
              <NotificationPreferences />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CreateTripRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <ExportScheduleDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </Layout>
  );
};

export default FleetScheduling;

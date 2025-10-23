import { useState } from "react";
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
import { ApprovalChainConfig } from "@/components/scheduling/ApprovalChainConfig";
import { ApprovalHistory } from "@/components/scheduling/ApprovalHistory";
import { SchedulingAssistant } from "@/components/scheduling/SchedulingAssistant";
import { ActiveAssignments } from "@/components/scheduling/ActiveAssignments";
import { ScheduleBoard } from "@/components/scheduling/ScheduleBoard";
import { TimelineView } from "@/components/scheduling/TimelineView";
import { CalendarView } from "@/components/scheduling/CalendarView";
import { UtilizationAnalytics } from "@/components/scheduling/UtilizationAnalytics";
import { useTripRequests } from "@/hooks/useTripRequests";
import { usePermissions } from "@/hooks/usePermissions";

const FleetScheduling = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { requests, loading } = useTripRequests();
  const { isSuperAdmin, hasRole } = usePermissions();
  const canApprove = isSuperAdmin || hasRole('operations_manager') || hasRole('fleet_owner');

  const stats = [
    {
      title: "Pending Approval",
      value: requests?.filter((r: any) => r.status === 'submitted').length || 0,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Approved",
      value: requests?.filter((r: any) => r.status === 'approved').length || 0,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Active Trips",
      value: requests?.filter((r: any) => ['dispatched', 'in_service'].includes(r.status)).length || 0,
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      title: "Rejected",
      value: requests?.filter((r: any) => r.status === 'rejected').length || 0,
      icon: XCircle,
      color: "text-red-600"
    }
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Fleet Scheduling</h1>
            <p className="text-muted-foreground mt-1">
              Manage trip requests, approvals, and vehicle assignments
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button variant="outline" onClick={() => setExportDialogOpen(true)} className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Trip Request</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scheduling Assistant */}
        {canApprove && <SchedulingAssistant />}

        {/* Main Content */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="assignments">Active</TabsTrigger>
            {canApprove && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="config">Config</TabsTrigger>}
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
              <ApprovalHistory />
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

          {isSuperAdmin && (
            <TabsContent value="config" className="space-y-4">
              <ApprovalChainConfig />
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

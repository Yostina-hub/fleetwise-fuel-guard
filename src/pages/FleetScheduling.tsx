import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { CreateTripRequestDialog } from "@/components/scheduling/CreateTripRequestDialog";
import { TripRequestsList } from "@/components/scheduling/TripRequestsList";
import { AvailabilityMatrix } from "@/components/scheduling/AvailabilityMatrix";
import { useTripRequests } from "@/hooks/useTripRequests";

const FleetScheduling = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { requests, loading } = useTripRequests();

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
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Trip Request
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Main Content */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requests">Trip Requests</TabsTrigger>
            <TabsTrigger value="availability">Availability Matrix</TabsTrigger>
            <TabsTrigger value="schedule">Schedule Board</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <TripRequestsList requests={requests} loading={loading} />
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <AvailabilityMatrix />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Schedule board coming in Phase 4
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateTripRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </Layout>
  );
};

export default FleetScheduling;

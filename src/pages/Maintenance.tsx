import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KPICard from "@/components/KPICard";
import { 
  Wrench, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Plus,
  Loader2
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";

const Maintenance = () => {
  const navigate = useNavigate();
  const { vehicles: dbVehicles, loading } = useVehicles();

  // Generate maintenance schedule from vehicles
  const maintenanceSchedule = useMemo(() => {
    return dbVehicles.slice(0, 4).map((v, idx) => ({
      id: idx + 1,
      vehicle: v.plate_number || 'Unknown',
      type: ['Oil Change', 'Tire Replacement', 'Annual Inspection', 'Brake Service'][idx % 4],
      dueDate: new Date(Date.now() + (idx + 1) * 86400000 * 5).toISOString().split('T')[0],
      dueOdometer: (v.odometer_km || 50000) + 5000,
      currentOdometer: v.odometer_km || 48000,
      status: v.status === 'maintenance' ? 'overdue' : (idx % 3 === 0 ? 'upcoming' : 'scheduled'),
      priority: ['high', 'medium', 'low'][idx % 3]
    }));
  }, [dbVehicles]);

  const oldMaintenanceSchedule = [
    {
      id: 1,
      vehicle: "AA 1234",
      type: "Oil Change",
      dueDate: "2025-01-15",
      dueOdometer: 50000,
      currentOdometer: 48230,
      status: "upcoming",
      priority: "medium"
    },
    {
      id: 2,
      vehicle: "AB 5678",
      type: "Tire Replacement",
      dueDate: "2025-01-12",
      dueOdometer: 68000,
      currentOdometer: 67890,
      status: "overdue",
      priority: "high"
    },
    {
      id: 3,
      vehicle: "AC 9012",
      type: "Annual Inspection",
      dueDate: "2025-02-10",
      dueOdometer: 30000,
      currentOdometer: 23450,
      status: "scheduled",
      priority: "low"
    },
    {
      id: 4,
      vehicle: "AD 3456",
      type: "Brake Service",
      dueDate: "2025-01-20",
      dueOdometer: 55000,
      currentOdometer: 51200,
      status: "upcoming",
      priority: "high"
    },
  ];

  const recentWorkOrders = [
    {
      id: "WO-001",
      vehicle: "AE 7890",
      service: "Engine Diagnostics",
      technician: "John Smith",
      cost: 450,
      completedDate: "2025-01-08",
      status: "completed"
    },
    {
      id: "WO-002",
      vehicle: "AA 1234",
      service: "Battery Replacement",
      technician: "Mike Johnson",
      cost: 280,
      completedDate: "2025-01-06",
      status: "completed"
    },
    {
      id: "WO-003",
      vehicle: "AC 9012",
      service: "Transmission Repair",
      technician: "Sarah Wilson",
      cost: 1250,
      completedDate: "2025-01-05",
      status: "completed"
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "upcoming":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Due Soon</Badge>;
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading maintenance data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between slide-in-right">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Wrench className="w-8 h-8 text-primary float-animation" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Maintenance Management</h1>
              <p className="text-muted-foreground mt-1 text-lg">Track service schedules and work orders</p>
            </div>
          </div>
          <Button className="gap-2 glass-strong hover:scale-105 transition-all duration-300 glow" onClick={() => navigate('/work-orders')}>
            <Plus className="w-5 h-5" />
            <span className="font-semibold">New Work Order</span>
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Scheduled Services"
            value="12"
            subtitle="next 30 days"
            icon={<Calendar className="w-5 h-5" />}
            variant="default"
          />
          <KPICard
            title="Overdue"
            value="2"
            subtitle="require immediate attention"
            icon={<AlertCircle className="w-5 h-5" />}
            variant="warning"
          />
          <KPICard
            title="Maintenance Cost"
            value="$8,250"
            subtitle="this month"
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: -12.5, label: "vs last month" }}
            variant="success"
          />
          <KPICard
            title="Avg. Downtime"
            value="2.3 days"
            subtitle="per repair"
            icon={<Clock className="w-5 h-5" />}
            trend={{ value: -15, label: "improvement" }}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Maintenance Schedule */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceSchedule.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-lg">{item.vehicle}</div>
                        <div className="text-sm text-muted-foreground">{item.type}</div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Due Date</div>
                        <div className="font-medium flex items-center gap-1 mt-1">
                          <Calendar className="w-4 h-4 text-primary" />
                          {item.dueDate}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Odometer</div>
                        <div className="font-medium mt-1">
                          {item.currentOdometer.toLocaleString()} / {item.dueOdometer.toLocaleString()} km
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">Priority:</span>
                      <span className={`text-xs font-semibold uppercase ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>

                    {item.status === "overdue" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="default">Schedule Now</Button>
                        <Button size="sm" variant="outline">Contact Vendor</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Work Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWorkOrders.map((order) => (
                  <div key={order.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{order.id}</div>
                        <div className="text-xs text-muted-foreground">{order.vehicle}</div>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Service:</span>
                        <div className="font-medium">{order.service}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Technician:</span>
                        <div className="font-medium">{order.technician}</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-semibold text-primary">${order.cost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                View All Work Orders
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Service Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Oil Changes", count: 24, cost: 1200 },
                  { name: "Tire Services", count: 18, cost: 3600 },
                  { name: "Brake Repairs", count: 12, cost: 2400 },
                ].map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.count} services</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${category.cost.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-4xl font-bold text-success">96%</div>
                  <div className="text-sm text-muted-foreground mt-2">Services on schedule</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "ABC Auto Service", rating: 4.8, jobs: 45 },
                  { name: "Quick Fix Garage", rating: 4.5, jobs: 32 },
                  { name: "Pro Motors", rating: 4.9, jobs: 28 },
                ].map((vendor) => (
                  <div key={vendor.name} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{vendor.name}</div>
                      <div className="text-xs text-muted-foreground">{vendor.jobs} jobs</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-semibold">{vendor.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Maintenance;

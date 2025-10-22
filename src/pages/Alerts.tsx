import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  MapPin
} from "lucide-react";

const Alerts = () => {
  const alerts = [
    {
      id: 1,
      severity: "critical",
      type: "Fuel Theft Detected",
      vehicle: "AB 5678",
      message: "Sudden fuel drop of 12.3L detected at 03:15 AM",
      location: "Parking Lot A, Depot B",
      timestamp: "2025-01-10 03:15",
      status: "unacknowledged"
    },
    {
      id: 2,
      severity: "warning",
      type: "Low Fuel Alert",
      vehicle: "AD 3456",
      message: "Fuel level below 20% threshold (18% remaining)",
      location: "Highway 12, near Exit 45",
      timestamp: "2025-01-10 08:45",
      status: "unacknowledged"
    },
    {
      id: 3,
      severity: "warning",
      type: "Excessive Idling",
      vehicle: "AC 9012",
      message: "Vehicle idling for 45 minutes consuming 2.3L",
      location: "Customer Site - Warehouse 3",
      timestamp: "2025-01-10 07:20",
      status: "acknowledged"
    },
    {
      id: 4,
      severity: "info",
      type: "Maintenance Due",
      vehicle: "AE 7890",
      message: "Scheduled maintenance due in 3 days",
      location: "N/A",
      timestamp: "2025-01-10 06:00",
      status: "acknowledged"
    },
    {
      id: 5,
      severity: "critical",
      type: "Suspected Fuel Leak",
      vehicle: "AD 3456",
      message: "Gradual fuel loss of 5.2L over 2 hours",
      location: "Route 45, between Depot A-B",
      timestamp: "2025-01-09 14:20",
      status: "resolved"
    },
    {
      id: 6,
      severity: "warning",
      type: "Speeding Violation",
      vehicle: "AA 1234",
      message: "Speed exceeded 85 km/h in 60 km/h zone",
      location: "Main Street, City Center",
      timestamp: "2025-01-09 16:30",
      status: "acknowledged"
    },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "info":
        return <Info className="w-5 h-5 text-primary" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-destructive bg-destructive/5";
      case "warning":
        return "border-l-warning bg-warning/5";
      case "info":
        return "border-l-primary bg-primary/5";
      default:
        return "border-l-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unacknowledged":
        return <Badge variant="destructive">Unacknowledged</Badge>;
      case "acknowledged":
        return <Badge variant="outline" className="border-warning text-warning">Acknowledged</Badge>;
      case "resolved":
        return <Badge variant="outline" className="border-success text-success">Resolved</Badge>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alert Center</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage fleet alerts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Filter</Button>
            <Button variant="outline">Export</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold">2</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-sm text-muted-foreground">Warning</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Info className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">1</div>
                  <div className="text-sm text-muted-foreground">Info</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">1</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>All Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border-l-4 rounded-lg ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <div className="font-semibold text-lg">{alert.type}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Vehicle: <span className="font-medium text-foreground">{alert.vehicle}</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(alert.status)}
                  </div>

                  <p className="text-sm mb-3 ml-8">{alert.message}</p>

                  <div className="flex items-center gap-6 ml-8 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{alert.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{alert.location}</span>
                    </div>
                  </div>

                  {alert.status === "unacknowledged" && (
                    <div className="mt-3 ml-8 flex gap-2">
                      <Button size="sm" variant="outline">Acknowledge</Button>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Alerts;

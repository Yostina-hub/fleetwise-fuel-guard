import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AlertDetailModal from "@/components/AlertDetailModal";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  MapPin,
  Filter,
  Download,
  Loader2
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useVehicles } from "@/hooks/useVehicles";

const Alerts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { alerts: dbAlerts, loading } = useAlerts({ severity: severityFilter });
  const { vehicles } = useVehicles();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  // Transform DB alerts to display format
  const alerts = useMemo(() => {
    return dbAlerts.map(alert => {
      const vehicle = vehicles.find(v => v.id === alert.vehicle_id);
      return {
        id: alert.id,
        severity: alert.severity,
        type: alert.alert_type,
        vehicle: (vehicle as any)?.license_plate || "Unknown",
        message: alert.message,
        location: alert.location_name || "Unknown location",
        timestamp: new Date(alert.alert_time).toLocaleString(),
        status: alert.status
      };
    });
  }, [dbAlerts, vehicles]);

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

  // Filter and search
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch = searchQuery === "" ||
        alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
      const matchesType = typeFilter === "all" || alert.type === typeFilter;
      
      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [searchQuery, severityFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAlerts.slice(start, start + itemsPerPage);
  }, [filteredAlerts, currentPage]);

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading alerts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-destructive to-warning bg-clip-text text-transparent">
              Alert Center
            </h1>
            <p className="text-muted-foreground mt-1">Monitor and manage fleet alerts • {alerts.length} total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
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
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`group p-4 border-l-4 rounded-lg cursor-pointer transition-all hover:shadow-md ${getSeverityColor(alert.severity)}`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{alert.type}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Vehicle: <span className="font-medium text-foreground">{alert.vehicle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(alert.status)}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
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
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                      >
                        Acknowledge
                      </Button>
                      <Button size="sm" variant="outline">Assign</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        alert={selectedAlert || {}}
      />
    </Layout>
  );
};

export default Alerts;

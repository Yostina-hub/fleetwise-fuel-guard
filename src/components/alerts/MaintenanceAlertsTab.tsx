import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  AlertTriangle,
  Calendar,
  Search,
  Loader2,
  Clock,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MaintenanceSchedule {
  id: string;
  vehicle_id: string;
  service_type: string;
  next_due_date: string | null;
  priority: string | null;
  is_active: boolean | null;
}

export function MaintenanceAlertsTab() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch maintenance schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["maintenance-alerts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("id, vehicle_id, service_type, next_due_date, priority, is_active")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .not("next_due_date", "is", null)
        .order("next_due_date", { ascending: true });
      
      if (error) throw error;
      return (data || []) as MaintenanceSchedule[];
    },
    enabled: !!organizationId,
  });

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  // Calculate alert level based on days until due
  const getAlertLevel = (scheduledDate: string) => {
    const daysUntil = differenceInDays(new Date(scheduledDate), new Date());
    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 3) return "critical";
    if (daysUntil <= 7) return "warning";
    return "upcoming";
  };

  // Group and sort by urgency
  const alertItems = useMemo(() => {
    return schedules
      .filter((schedule) => schedule.next_due_date)
      .map((schedule) => ({
        ...schedule,
        alertLevel: getAlertLevel(schedule.next_due_date!),
        daysUntil: differenceInDays(new Date(schedule.next_due_date!), new Date()),
        vehiclePlate: getVehiclePlate(schedule.vehicle_id),
      }))
      .filter((item) => {
        const matchesSearch =
          searchQuery === "" ||
          item.service_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "overdue" && item.alertLevel === "overdue") ||
          (statusFilter === "critical" && item.alertLevel === "critical") ||
          (statusFilter === "warning" && item.alertLevel === "warning") ||
          (statusFilter === "upcoming" && item.alertLevel === "upcoming");
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [schedules, searchQuery, statusFilter, vehicles]);

  const stats = useMemo(() => {
    const all = schedules
      .filter((s) => s.next_due_date)
      .map((s) => ({
        ...s,
        alertLevel: getAlertLevel(s.next_due_date!),
      }));
    return {
      total: all.length,
      overdue: all.filter((s) => s.alertLevel === "overdue").length,
      critical: all.filter((s) => s.alertLevel === "critical").length,
      warning: all.filter((s) => s.alertLevel === "warning").length,
      upcoming: all.filter((s) => s.alertLevel === "upcoming").length,
    };
  }, [schedules]);

  const getAlertBadge = (level: string) => {
    switch (level) {
      case "overdue":
        return <Badge variant="destructive" className="animate-pulse">Overdue</Badge>;
      case "critical":
        return <Badge variant="destructive">Due Soon</Badge>;
      case "warning":
        return <Badge className="bg-warning/10 text-warning border-warning/20">This Week</Badge>;
      default:
        return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "overdue":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "critical":
        return <Wrench className="w-5 h-5 text-destructive" />;
      case "warning":
        return <Wrench className="w-5 h-5 text-warning" />;
      default:
        return <Calendar className="w-5 h-5 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.overdue}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.critical}</p>
              <p className="text-sm text-muted-foreground">Due in 3 Days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{stats.warning}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.upcoming}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vehicle or maintenance type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="critical">Due in 3 Days</SelectItem>
                <SelectItem value="warning">This Week</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate("/maintenance")}>
              <Wrench className="w-4 h-4 mr-2" />
              Go to Maintenance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Maintenance Alerts
            {stats.overdue > 0 && (
              <Badge variant="destructive">{stats.overdue} Overdue</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {alertItems.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No maintenance alerts</h3>
                <p className="text-muted-foreground">
                  There are no pending maintenance items matching your criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      item.alertLevel === "overdue"
                        ? "border-destructive/50 bg-destructive/10"
                        : item.alertLevel === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : item.alertLevel === "warning"
                        ? "border-warning/30 bg-warning/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getAlertIcon(item.alertLevel)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium capitalize">
                              {item.service_type.replace(/_/g, " ")}
                            </span>
                            {getAlertBadge(item.alertLevel)}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Truck className="w-4 h-4" />
                              {item.vehiclePlate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(item.next_due_date!), "PPP")}
                            </span>
                            <span className={`font-medium ${
                              item.daysUntil < 0 
                                ? "text-destructive" 
                                : item.daysUntil <= 3 
                                ? "text-destructive" 
                                : item.daysUntil <= 7 
                                ? "text-warning" 
                                : ""
                            }`}>
                              {item.daysUntil < 0
                                ? `${Math.abs(item.daysUntil)} days overdue`
                                : item.daysUntil === 0
                                ? "Due today"
                                : `${item.daysUntil} days remaining`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/maintenance")}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
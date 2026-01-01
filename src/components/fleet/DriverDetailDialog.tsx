import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  CreditCard, 
  Phone, 
  Mail, 
  Calendar, 
  Activity,
  AlertTriangle,
  Car,
  Clock,
  Gauge,
  Shield,
  MapPin,
  Navigation,
  Zap,
  Route,
  Heart,
  UserCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Driver } from "@/hooks/useDrivers";
import LicenseExpiryBadge from "./LicenseExpiryBadge";

interface DriverDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

export default function DriverDetailDialog({ open, onOpenChange, driver }: DriverDetailDialogProps) {
  // Fetch latest driver score
  const { data: latestScore } = useQuery({
    queryKey: ["driver-score", driver?.id],
    queryFn: async () => {
      if (!driver) return null;
      const { data, error } = await supabase
        .from("driver_behavior_scores")
        .select("*")
        .eq("driver_id", driver.id)
        .order("score_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!driver,
  });

  // Fetch recent trips
  const { data: recentTrips = [] } = useQuery({
    queryKey: ["driver-recent-trips", driver?.id],
    queryFn: async () => {
      if (!driver) return [];
      const { data, error } = await supabase
        .from("trips")
        .select("id, start_time, end_time, distance_km, duration_minutes, status")
        .eq("driver_id", driver.id)
        .order("start_time", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!driver,
  });

  // Fetch recent driver events
  const { data: recentEvents = [] } = useQuery({
    queryKey: ["driver-recent-events", driver?.id],
    queryFn: async () => {
      if (!driver) return [];
      const { data, error } = await supabase
        .from("driver_events")
        .select("id, event_type, event_time, severity, speed_kmh, address")
        .eq("driver_id", driver.id)
        .order("event_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!driver,
  });

  // Fetch trips count
  const { data: tripsData } = useQuery({
    queryKey: ["driver-trips-count", driver?.id],
    queryFn: async () => {
      if (!driver) return { count: 0 };
      const { count, error } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", driver.id);
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: !!driver,
  });

  // Fetch assigned vehicle
  const { data: assignedVehicle } = useQuery({
    queryKey: ["driver-vehicle", driver?.id],
    queryFn: async () => {
      if (!driver) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("assigned_driver_id", driver.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!driver,
  });

  if (!driver) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "speeding":
        return <Gauge className="w-4 h-4 text-destructive" />;
      case "harsh_braking":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "harsh_acceleration":
        return <Zap className="w-4 h-4 text-warning" />;
      case "idle":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const getEventSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive";
      case "high":
        return "bg-warning/10 text-warning";
      case "medium":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Driver Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Header Card */}
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={driver.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {getInitials(driver.first_name, driver.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{driver.first_name} {driver.last_name}</h2>
                      {getStatusBadge(driver.status || "active")}
                    </div>
                    {driver.employee_id && (
                      <p className="text-muted-foreground font-mono">ID: {driver.employee_id}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      {driver.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {driver.email}
                        </div>
                      )}
                      {driver.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {driver.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(driver.safety_score || 0)}`}>
                      {driver.safety_score || "-"}
                    </div>
                    <p className="text-sm text-muted-foreground">Safety Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{driver.total_trips || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Trips</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Gauge className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{Math.round(driver.total_distance_km || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total KM</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{latestScore?.speed_violations || 0}</p>
                      <p className="text-xs text-muted-foreground">Violations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{Math.round((latestScore?.total_drive_time || 0) / 60)}</p>
                      <p className="text-xs text-muted-foreground">Drive Hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* License Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    License Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License Number</span>
                    <span className="font-medium font-mono">{driver.license_number}</span>
                  </div>
                  {driver.license_class && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License Class</span>
                      <span className="font-medium">Class {driver.license_class}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">License Status</span>
                    <LicenseExpiryBadge expiryDate={driver.license_expiry} />
                  </div>
                  {driver.license_expiry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiry Date</span>
                      <span className="font-medium">
                        {format(new Date(driver.license_expiry), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employment Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Employment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {driver.hire_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hire Date</span>
                      <span className="font-medium">
                        {format(new Date(driver.hire_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  {assignedVehicle ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned Vehicle</span>
                      <span className="font-medium">
                        {assignedVehicle.plate_number} ({assignedVehicle.make} {assignedVehicle.model})
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned Vehicle</span>
                      <span className="text-muted-foreground italic">No vehicle assigned</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Trips in DB</span>
                    <span className="font-medium">{tripsData?.count || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Identification Tags */}
              {(driver.rfid_tag || driver.ibutton_id || driver.bluetooth_id) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Identification Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {driver.rfid_tag && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RFID Tag</span>
                        <span className="font-medium font-mono">{driver.rfid_tag}</span>
                      </div>
                    )}
                    {driver.ibutton_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">iButton ID</span>
                        <span className="font-medium font-mono">{driver.ibutton_id}</span>
                      </div>
                    )}
                    {driver.bluetooth_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bluetooth ID</span>
                        <span className="font-medium font-mono">{driver.bluetooth_id}</span>
                      </div>
                    )}
                  </CardContent>
              </Card>
              )}

              {/* Emergency Contact */}
              {(driver.emergency_contact_name || driver.emergency_contact_phone) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-destructive" />
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {driver.emergency_contact_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{driver.emergency_contact_name}</span>
                      </div>
                    )}
                    {driver.emergency_contact_relationship && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Relationship</span>
                        <span className="font-medium">{driver.emergency_contact_relationship}</span>
                      </div>
                    )}
                    {driver.emergency_contact_phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">{driver.emergency_contact_phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Medical Information */}
              {driver.medical_certificate_expiry && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="w-5 h-5 text-destructive" />
                      Medical Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Medical Certificate Expiry</span>
                      <span className="font-medium">
                        {format(new Date(driver.medical_certificate_expiry), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Behavior Scores */}
              {latestScore && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Behavior Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speeding Score</span>
                      <span className={`font-medium ${getScoreColor(latestScore.speeding_score)}`}>
                        {latestScore.speeding_score}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Braking Score</span>
                      <span className={`font-medium ${getScoreColor(latestScore.braking_score)}`}>
                        {latestScore.braking_score}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acceleration Score</span>
                      <span className={`font-medium ${getScoreColor(latestScore.acceleration_score)}`}>
                        {latestScore.acceleration_score}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Idle Score</span>
                      <span className={`font-medium ${getScoreColor(latestScore.idle_score)}`}>
                        {latestScore.idle_score}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Trips */}
            {recentTrips.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="w-5 h-5 text-primary" />
                    Recent Trips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTrips.map((trip) => (
                      <div key={trip.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Navigation className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {trip.start_time && format(new Date(trip.start_time), "MMM d, HH:mm")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {trip.distance_km ? `${trip.distance_km.toFixed(1)} km` : "Distance N/A"} • 
                              {trip.duration_minutes ? ` ${trip.duration_minutes} min` : " Duration N/A"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={trip.status === "completed" ? "default" : "secondary"}>
                          {trip.status || "Unknown"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Events */}
            {recentEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    Recent Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getEventIcon(event.event_type)}
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {event.event_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {event.event_time && formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
                              {event.address && ` • ${event.address}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.speed_kmh && (
                            <span className="text-xs text-muted-foreground">{event.speed_kmh} km/h</span>
                          )}
                          <Badge className={getEventSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {driver.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{driver.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

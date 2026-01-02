import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, MapPin, Clock, CheckCircle, XCircle, User, Car } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface SOSAlert {
  id: string;
  organization_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  alert_time: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  status: "active" | "acknowledged" | "resolved" | "false_alarm";
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export function SOSAlertPanel() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["sos-alerts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sos_alerts")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("alert_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SOSAlert[];
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  // Subscribe to realtime SOS alerts
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel("sos-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sos_alerts",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sos-alerts", organizationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("sos_alerts")
        .update({
          status: "acknowledged",
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, notes, status }: { alertId: string; notes: string; status: string }) => {
      const { error } = await supabase
        .from("sos_alerts")
        .update({
          status,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
      toast({ title: "Alert resolved" });
      setResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNotes("");
    },
  });

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="destructive" className="animate-pulse">Active</Badge>;
      case "acknowledged":
        return <Badge className="bg-warning text-warning-foreground">Acknowledged</Badge>;
      case "resolved":
        return <Badge variant="default">Resolved</Badge>;
      case "false_alarm":
        return <Badge variant="secondary">False Alarm</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleResolve = (alert: SOSAlert, status: "resolved" | "false_alarm") => {
    setSelectedAlert(alert);
    setResolveDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {activeAlerts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              Active SOS Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <Card key={alert.id} className="p-4 border-destructive/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(alert.status)}
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.alert_time), { addSuffix: true })}
                          </span>
                        </div>
                        {alert.location_name && (
                          <div className="flex items-center gap-1 mt-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            {alert.location_name}
                          </div>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {alert.vehicle_id && (
                            <div className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              <span>Vehicle ID: {alert.vehicle_id.slice(0, 8)}...</span>
                            </div>
                          )}
                          {alert.driver_id && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>Driver ID: {alert.driver_id.slice(0, 8)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleResolve(alert, "resolved")}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {acknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <Clock className="w-5 h-5" />
              Acknowledged Alerts ({acknowledgedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {acknowledgedAlerts.map((alert) => (
                  <Card key={alert.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        {getStatusBadge(alert.status)}
                        <span className="text-sm ml-2">
                          {format(new Date(alert.alert_time), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(alert, "false_alarm")}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          False Alarm
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolve(alert, "resolved")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeAlerts.length === 0 && acknowledgedAlerts.length === 0 && (
        <Card className="bg-success/5 border-success/20">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-success mb-2" />
            <p className="text-success font-medium">No active SOS alerts</p>
            <p className="text-sm text-muted-foreground">All clear - no emergency situations</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve SOS Alert</DialogTitle>
            <DialogDescription>
              Provide details about how this SOS alert was handled and resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sos-resolution-notes">Resolution Notes</Label>
              <Textarea
                id="sos-resolution-notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the alert was resolved..."
                rows={4}
                aria-describedby="resolution-notes-hint"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                selectedAlert &&
                resolveMutation.mutate({
                  alertId: selectedAlert.id,
                  notes: resolutionNotes,
                  status: "false_alarm",
                })
              }
            >
              Mark as False Alarm
            </Button>
            <Button
              onClick={() =>
                selectedAlert &&
                resolveMutation.mutate({
                  alertId: selectedAlert.id,
                  notes: resolutionNotes,
                  status: "resolved",
                })
              }
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

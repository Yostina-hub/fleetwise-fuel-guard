import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Bell, Mail, MessageSquare, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export const OfflineAlertsConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [emails, setEmails] = useState("");
  const [sms, setSms] = useState("");
  const [threshold, setThreshold] = useState(5);
  const [isActive, setIsActive] = useState(true);

  const { data: config, isLoading } = useQuery({
    queryKey: ["offline-alerts-config", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from("device_offline_alerts" as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    },
    enabled: !!organizationId,
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setEmails((config as any).notification_emails?.join(", ") || "");
      setSms((config as any).notification_sms?.join(", ") || "");
      setThreshold((config as any).offline_threshold_minutes || 5);
      setIsActive((config as any).is_active ?? true);
    }
  }, [config]);

  const { data: offlineEvents } = useQuery({
    queryKey: ["offline-events", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("device_offline_events" as any)
        .select(`
          *,
          devices(imei, tracker_model),
          vehicles(plate_number)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization selected");

      const emailList = emails.split(",").map(e => e.trim()).filter(Boolean);
      const smsList = sms.split(",").map(s => s.trim()).filter(Boolean);

      const payload = {
        organization_id: organizationId,
        offline_threshold_minutes: threshold,
        notification_emails: emailList,
        notification_sms: smsList,
        is_active: isActive,
      };

      if ((config as any)?.id) {
        const { error } = await supabase
          .from("device_offline_alerts" as any)
          .update(payload)
          .eq("id", (config as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("device_offline_alerts" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offline-alerts-config", organizationId] });
      toast({
        title: "Settings saved",
        description: "Offline alert configuration updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      // Get the current session to pass auth context
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("monitor-device-connectivity", {
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["offline-events", organizationId] });
      toast({
        title: "Connectivity check complete",
        description: `Checked ${data?.checked || 0} devices. ${data?.offline || 0} offline, ${data?.online || 0} online.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" aria-hidden="true" />
                Offline Device Alerts Configuration
              </CardTitle>
              <CardDescription>
                Get notified when GPS devices go offline
              </CardDescription>
            </div>
            <Button 
              onClick={() => testMutation.mutate()} 
              variant="outline"
              disabled={testMutation.isPending}
              aria-label="Test device connectivity now"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${testMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
              {testMutation.isPending ? "Checking..." : "Test Now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Enable Offline Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Automatically monitor device connectivity
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Offline Threshold (minutes)</Label>
            <Input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 5)}
              min={1}
              max={60}
            />
            <p className="text-sm text-muted-foreground">
              Alert when device hasn't sent data for this many minutes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email Notifications
            </Label>
            <Input
              id="emails"
              placeholder="email1@example.com, email2@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Comma-separated email addresses
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              SMS Notifications (Optional)
            </Label>
            <Input
              id="sms"
              placeholder="+251911234567, +251922345678"
              value={sms}
              onChange={(e) => setSms(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Comma-separated phone numbers with country code
            </p>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="w-full"
            aria-label="Save offline alerts configuration"
          >
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Recent Offline Events
          </CardTitle>
          <CardDescription>
            History of device connectivity issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {offlineEvents && offlineEvents.length > 0 ? (
            <div className="space-y-3">
              {offlineEvents.map((event: any) => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    !event.back_online_at ? 'bg-destructive/5 border-destructive/30' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="font-medium truncate"
                        title={event.vehicles?.plate_number || event.devices?.imei || "Unknown Device"}
                      >
                        {event.vehicles?.plate_number || event.devices?.imei || "Unknown Device"}
                      </span>
                      {!event.back_online_at ? (
                        <Badge variant="destructive">Offline</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
                          Back Online
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate" title={event.devices?.tracker_model}>
                      {event.devices?.tracker_model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Offline since: {formatDistanceToNow(new Date(event.offline_since), { addSuffix: true })}
                    </p>
                    {event.back_online_at && event.offline_duration_minutes && (
                      <p className="text-xs text-muted-foreground">
                        Duration: {event.offline_duration_minutes} minutes
                      </p>
                    )}
                  </div>
                  {event.notification_sent && (
                    <Badge variant="outline">
                      <Bell className="h-3 w-3 mr-1" aria-hidden="true" />
                      Notified
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8" role="status">
              No offline events recorded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

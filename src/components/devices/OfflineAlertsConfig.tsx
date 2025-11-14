import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Mail, MessageSquare, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const OfflineAlertsConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");
  const [sms, setSms] = useState("");
  const [threshold, setThreshold] = useState(5);
  const [isActive, setIsActive] = useState(true);

  const { data: config, isLoading } = useQuery({
    queryKey: ["offline-alerts-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_offline_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setEmails((data as any).notification_emails?.join(", ") || "");
        setSms((data as any).notification_sms?.join(", ") || "");
        setThreshold((data as any).offline_threshold_minutes);
        setIsActive((data as any).is_active);
      }
      
      return data;
    },
  });

  const { data: offlineEvents } = useQuery({
    queryKey: ["offline-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_offline_events" as any)
        .select(`
          *,
          devices(imei, tracker_model),
          vehicles(plate_number)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const emailList = emails.split(",").map(e => e.trim()).filter(Boolean);
      const smsList = sms.split(",").map(s => s.trim()).filter(Boolean);

      const payload = {
        organization_id: user.id,
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
      queryClient.invalidateQueries({ queryKey: ["offline-alerts-config"] });
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
      const { data, error } = await supabase.functions.invoke("monitor-device-connectivity");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["offline-events"] });
      toast({
        title: "Connectivity check complete",
        description: `Checked ${data.checked} devices. ${data.offline} offline, ${data.online} online.`,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Offline Device Alerts Configuration
              </CardTitle>
              <CardDescription>
                Get notified when GPS devices go offline
              </CardDescription>
            </div>
            <Button onClick={() => testMutation.mutate()} variant="outline">
              Test Now
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
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              min={1}
              max={60}
            />
            <p className="text-sm text-muted-foreground">
              Alert when device hasn't sent data for this many minutes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
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
              <MessageSquare className="h-4 w-4" />
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
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Offline Events</CardTitle>
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
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {event.vehicles?.plate_number || event.devices?.imei}
                      </span>
                      {!event.back_online_at ? (
                        <Badge variant="destructive">Offline</Badge>
                      ) : (
                        <Badge className="bg-green-500">Back Online</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.devices?.tracker_model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Offline since: {new Date(event.offline_since).toLocaleString()}
                    </p>
                    {event.back_online_at && (
                      <p className="text-xs text-muted-foreground">
                        Duration: {event.offline_duration_minutes} minutes
                      </p>
                    )}
                  </div>
                  {event.notification_sent && (
                    <Badge variant="outline">
                      <Bell className="h-3 w-3 mr-1" />
                      Notified
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No offline events recorded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

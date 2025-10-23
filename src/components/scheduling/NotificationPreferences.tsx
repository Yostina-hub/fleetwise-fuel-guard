import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Smartphone, Save } from "lucide-react";

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<any>(null);

  const { data: savedPreferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences);
    }
  }, [savedPreferences]);

  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: any) => {
      if (!user) return;

      const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    setPreferences((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationTypeToggle = (type: string, value: boolean) => {
    setPreferences((prev: any) => ({
      ...prev,
      notification_types: {
        ...prev.notification_types,
        [type]: value,
      },
    }));
  };

  const handleSave = () => {
    updatePreferences.mutate(preferences);
  };

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Loading preferences...
          </div>
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    {
      key: "trip_request_submitted",
      label: "Trip Request Submitted",
      description: "When a new trip request is submitted",
    },
    {
      key: "trip_request_approved",
      label: "Trip Request Approved",
      description: "When your trip request is approved",
    },
    {
      key: "trip_request_rejected",
      label: "Trip Request Rejected",
      description: "When your trip request is rejected",
    },
    {
      key: "approval_required",
      label: "Approval Required",
      description: "When you need to approve a trip request",
    },
    {
      key: "trip_assigned",
      label: "Trip Assigned",
      description: "When a vehicle/driver is assigned to your trip",
    },
    {
      key: "trip_starting_soon",
      label: "Trip Starting Soon",
      description: "Reminder before your trip starts",
    },
    {
      key: "trip_completed",
      label: "Trip Completed",
      description: "When your trip is marked as completed",
    },
    {
      key: "vehicle_recommended",
      label: "Vehicle Recommendations",
      description: "When the system recommends vehicles for your trip",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold">Delivery Methods</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => handleToggle("email_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive in-app notifications
                </p>
              </div>
            </div>
            <Switch
              id="push"
              checked={preferences.push_enabled}
              onCheckedChange={(checked) => handleToggle("push_enabled", checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="font-semibold">Notification Types</h3>
          
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between">
              <div>
                <Label htmlFor={type.key}>{type.label}</Label>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              <Switch
                id={type.key}
                checked={preferences.notification_types?.[type.key] ?? true}
                onCheckedChange={(checked) =>
                  handleNotificationTypeToggle(type.key, checked)
                }
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={updatePreferences.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

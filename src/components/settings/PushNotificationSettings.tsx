import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Key, ExternalLink, Copy, Check, AlertCircle, Loader2, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/usePushNotifications";
const PushNotificationSettings = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSubscribed, showTestNotification } = usePushNotifications();
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [formData, setFormData] = useState({
    vapid_public_key: "",
    vapid_private_key: "",
    push_notifications_enabled: false,
  });

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["push_notification_settings", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organization_settings")
        .select("vapid_public_key, vapid_private_key, push_notifications_enabled")
        .eq("organization_id", organizationId!)
        .maybeSingle();

      if (error) throw error;
      return data as {
        vapid_public_key: string | null;
        vapid_private_key: string | null;
        push_notifications_enabled: boolean | null;
      } | null;
    },
    enabled: !!organizationId,
  });

  // Fetch subscription count
  const { data: subscriptionCount } = useQuery({
    queryKey: ["push_subscription_count", organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        vapid_public_key: settings.vapid_public_key || "",
        vapid_private_key: settings.vapid_private_key || "",
        push_notifications_enabled: settings.push_notifications_enabled || false,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase as any)
        .from("organization_settings")
        .upsert(
          {
            organization_id: organizationId,
            vapid_public_key: data.vapid_public_key || null,
            vapid_private_key: data.vapid_private_key || null,
            push_notifications_enabled: data.push_notifications_enabled,
          },
          { onConflict: "organization_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push_notification_settings"] });
      queryClient.invalidateQueries({ queryKey: ["organization_settings"] });
      toast({ title: "Push notification settings saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const copyToClipboard = async (text: string, type: "public" | "private") => {
    await navigator.clipboard.writeText(text);
    if (type === "public") {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    }
    toast({ title: "Copied to clipboard" });
  };

  const isConfigured = formData.vapid_public_key && formData.vapid_private_key;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" aria-hidden="true" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <Badge variant="default" className="bg-green-600">Configured</Badge>
            ) : (
              <Badge variant="secondary">Not Configured</Badge>
            )}
            {subscriptionCount !== undefined && subscriptionCount > 0 && (
              <Badge variant="outline">{subscriptionCount} subscriber{subscriptionCount !== 1 ? "s" : ""}</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Configure VAPID keys for browser push notifications. Users can subscribe to receive real-time alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled" className="font-medium">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to subscribe to browser push notifications
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={formData.push_notifications_enabled}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, push_notifications_enabled: checked })
              }
            />
          </div>

          {/* VAPID Key Generation Help */}
          {!isConfigured && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Generate VAPID keys to enable push notifications.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={() => window.open("https://vapidkeys.com/", "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Generate Keys
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* VAPID Public Key */}
          <div className="space-y-2">
            <Label htmlFor="vapid-public">VAPID Public Key</Label>
            <div className="flex gap-2">
              <Input
                id="vapid-public"
                placeholder="BPr7..."
                value={formData.vapid_public_key}
                onChange={(e) => setFormData({ ...formData, vapid_public_key: e.target.value })}
                className="font-mono text-sm"
              />
              {formData.vapid_public_key && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(formData.vapid_public_key, "public")}
                >
                  {copiedPublic ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This key is shared with browsers to identify your application.
            </p>
          </div>

          {/* VAPID Private Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vapid-private">VAPID Private Key</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                <Key className="w-4 h-4 mr-1" />
                {showPrivateKey ? "Hide" : "Show"}
              </Button>
            </div>
            <Input
              id="vapid-private"
              type={showPrivateKey ? "text" : "password"}
              placeholder="Private key..."
              value={formData.vapid_private_key}
              onChange={(e) => setFormData({ ...formData, vapid_private_key: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Keep this key secret. It's used by the server to sign push messages.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            {isSubscribed && isConfigured && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={showTestNotification}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Send Test Notification
              </Button>
            )}
            {!isSubscribed && isConfigured && (
              <p className="text-sm text-muted-foreground">
                Subscribe to push notifications to test
              </p>
            )}
            {!isConfigured && <div />}
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Push Settings"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSettings;

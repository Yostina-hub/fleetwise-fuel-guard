import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Plus, Trash2, TestTube, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SmsGatewayConfig {
  id: string;
  provider: string;
  api_key: string;
  api_secret: string | null;
  sender_id: string | null;
  username: string | null;
  environment: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const SmsGatewayTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    provider: "ethiotelecom",
    api_key: "",
    api_secret: "",
    sender_id: "",
    username: "",
    environment: "production",
    is_active: true,
    is_default: true,
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["sms-gateway-configs"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("sms_gateway_config")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data as SmsGatewayConfig[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");

      const payload = {
        organization_id: profile.organization_id,
        provider: data.provider,
        api_key: data.api_key,
        api_secret: data.api_secret || null,
        sender_id: data.sender_id || null,
        username: data.username || null,
        environment: data.environment,
        is_active: data.is_active,
        is_default: data.is_default,
      };

      if (data.id) {
        const { error } = await supabase
          .from("sms_gateway_config")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sms_gateway_config")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-gateway-configs"] });
      toast.success("SMS gateway configuration saved");
      setIsEditing(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sms_gateway_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-gateway-configs"] });
      toast.success("Configuration deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const testMutation = useMutation({
    mutationFn: async (config: SmsGatewayConfig) => {
      // For now, just validate the config exists
      // In production, you'd send a test SMS
      if (!config.api_key) throw new Error("API key is required");
      if (config.provider === "africastalking" && !config.username) {
        throw new Error("Username is required for Africa's Talking");
      }
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Configuration looks valid! Send a test command to verify SMS delivery.");
    },
    onError: (error) => {
      toast.error(`Validation failed: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      provider: "ethiotelecom",
      api_key: "",
      api_secret: "",
      sender_id: "",
      username: "",
      environment: "production",
      is_active: true,
      is_default: true,
    });
  };

  const handleEdit = (config: SmsGatewayConfig) => {
    setFormData({
      provider: config.provider,
      api_key: config.api_key,
      api_secret: config.api_secret || "",
      sender_id: config.sender_id || "",
      username: config.username || "",
      environment: config.environment,
      is_active: config.is_active,
      is_default: config.is_default,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const editingConfig = configs?.find(c => c.api_key === formData.api_key);
    saveMutation.mutate({ ...formData, id: editingConfig?.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">SMS Gateway Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure SMS gateway for sending governor commands to vehicles
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Configuration
          </Button>
        )}
      </div>

      {/* Existing Configurations */}
      {configs && configs.length > 0 && !isEditing && (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base capitalize">{config.provider}</CardTitle>
                    {config.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    <Badge variant={config.is_active ? "default" : "outline"}>
                      {config.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={config.environment === "production" ? "default" : "secondary"}>
                      {config.environment}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testMutation.mutate(config)}
                      disabled={testMutation.isPending}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(config.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Username:</span>
                    <p className="font-medium">{config.username || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sender ID:</span>
                    <p className="font-medium">{config.sender_id || "Default"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">API Key:</span>
                    <p className="font-medium font-mono">
                      {config.api_key.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">
                      {new Date(config.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {configs?.some(c => c.api_key === formData.api_key) ? "Edit" : "Add"} SMS Gateway
            </CardTitle>
            <CardDescription>
              Configure your SMS gateway provider credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => setFormData({ ...formData, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethiotelecom">Ethio Telecom</SelectItem>
                    <SelectItem value="africastalking">Africa's Talking</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(v) => setFormData({ ...formData, environment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.provider === "ethiotelecom" && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>Ethio Telecom SMS Gateway Configuration</span>
                </div>
                <div className="space-y-2">
                  <Label>Username / Account ID *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Your Ethio Telecom account ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender ID (Short Code) *</Label>
                  <Input
                    value={formData.sender_id}
                    onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                    placeholder="e.g., 8585 or registered short code"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your registered Ethio Telecom SMS short code
                  </p>
                </div>
              </div>
            )}

            {formData.provider === "africastalking" && (
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Your Africa's Talking username"
                />
              </div>
            )}

            {formData.provider === "twilio" && (
              <div className="space-y-2">
                <Label>Account SID *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Your Twilio Account SID"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>API Key *</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Enter your API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {formData.provider === "twilio" && (
              <div className="space-y-2">
                <Label>Auth Token *</Label>
                <div className="relative">
                  <Input
                    type={showApiSecret ? "text" : "password"}
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    placeholder="Enter your auth token"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sender ID (Optional)</Label>
              <Input
                value={formData.sender_id}
                onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                placeholder="Alphanumeric sender ID (e.g., FLEET)"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use provider's default sender
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
                  />
                  <Label>Default</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !formData.api_key}
                  className="gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!configs || configs.length === 0) && !isEditing && (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No SMS Gateway Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure an SMS gateway to send speed governor commands to vehicles
          </p>
          <Button onClick={() => setIsEditing(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add SMS Gateway
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SmsGatewayTab;
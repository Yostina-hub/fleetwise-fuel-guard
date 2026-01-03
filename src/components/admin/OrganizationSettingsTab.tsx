import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const OrganizationSettingsTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization_settings", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organization_settings")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const [formData, setFormData] = useState({
    company_name: "",
    primary_color: "#0066cc",
    secondary_color: "#333333",
    default_language: "en",
    default_timezone: "Africa/Addis_Ababa",
    currency: "ETB",
    distance_unit: "km",
    enable_2fa: false,
    enforce_2fa: false,
  });

  // Sync form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || "",
        primary_color: settings.primary_color || "#0066cc",
        secondary_color: settings.secondary_color || "#333333",
        default_language: settings.default_language || "en",
        default_timezone: settings.default_timezone || "Africa/Addis_Ababa",
        currency: settings.currency || "ETB",
        distance_unit: settings.distance_unit || "km",
        enable_2fa: settings.enable_2fa || false,
        enforce_2fa: settings.enforce_2fa || false,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase as any)
        .from("organization_settings")
        .upsert({
          organization_id: organizationId,
          ...data,
        }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading organization settings">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Branding & White-labeling</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <Input
                id="primary_color"
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <Input
                id="secondary_color"
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Localization</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="default_language">Default Language</Label>
            <Select
              value={formData.default_language}
              onValueChange={(value) => setFormData({ ...formData, default_language: value })}
            >
              <SelectTrigger aria-label="Select default language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">Amharic (አማርኛ)</SelectItem>
                <SelectItem value="ar">Arabic (العربية)</SelectItem>
                <SelectItem value="es">Spanish (Español)</SelectItem>
                <SelectItem value="fr">French (Français)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="default_timezone">Default Timezone</Label>
            <Select
              value={formData.default_timezone}
              onValueChange={(value) => setFormData({ ...formData, default_timezone: value })}
            >
              <SelectTrigger aria-label="Select default timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Africa/Addis_Ababa">East Africa Time (EAT)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Asia/Dubai">Gulf Standard Time (GST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger aria-label="Select currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETB">Ethiopian Birr (Br)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="GBP">British Pound (£)</SelectItem>
                <SelectItem value="AED">UAE Dirham (د.إ)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="distance_unit">Distance Unit</Label>
            <Select
              value={formData.distance_unit}
              onValueChange={(value) => setFormData({ ...formData, distance_unit: value })}
            >
              <SelectTrigger aria-label="Select distance unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers (km)</SelectItem>
                <SelectItem value="mi">Miles (mi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Security Features</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable_2fa">Enable 2FA</Label>
              <p className="text-sm text-muted-foreground">Allow users to enable two-factor authentication</p>
            </div>
            <Switch
              id="enable_2fa"
              checked={formData.enable_2fa}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_2fa: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enforce_2fa">Enforce 2FA</Label>
              <p className="text-sm text-muted-foreground">Require all users to use two-factor authentication</p>
            </div>
            <Switch
              id="enforce_2fa"
              checked={formData.enforce_2fa}
              onCheckedChange={(checked) => setFormData({ ...formData, enforce_2fa: checked })}
              disabled={!formData.enable_2fa}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
};

export default OrganizationSettingsTab;

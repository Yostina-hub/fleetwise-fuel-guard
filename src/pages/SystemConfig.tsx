import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings2, Radio, Droplet, Mail, MessageSquare, Save, Loader2, Shield, Database, Clock } from "lucide-react";
import DeviceProtocolsTab from "@/components/config/DeviceProtocolsTab";
import FuelDetectionTab from "@/components/config/FuelDetectionTab";
import EnrichmentTab from "@/components/config/EnrichmentTab";
import SmtpConfigTab from "@/components/config/SmtpConfigTab";
import SmsGatewayTab from "@/components/config/SmsGatewayTab";
import ConfigQuickStats from "@/components/config/ConfigQuickStats";
import ConfigQuickActions from "@/components/config/ConfigQuickActions";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const SETTING_DEFAULTS: Record<string, Record<string, any>> = {
  general: { timezone: "Africa/Addis_Ababa", date_format: "dd/MM/yyyy", distance_unit: "km", currency: "ETB", language: "en" },
  security: { session_timeout_minutes: 30, max_login_attempts: 5, enforce_2fa: false, password_min_length: 8, ip_whitelist_enabled: false },
  telemetry: { offline_threshold_minutes: 15, telemetry_interval_seconds: 30, data_retention_months: 6, batch_size: 100 },
  notifications: { email_enabled: true, sms_enabled: false, push_enabled: true, alert_digest_interval: "realtime" },
};

const SystemConfig = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["system-settings", organizationId],
    queryFn: async () => {
      if (!organizationId) return {};
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      const map: Record<string, Record<string, any>> = {};
      (data || []).forEach((s: any) => {
        if (!map[s.category]) map[s.category] = {};
        map[s.category][s.key] = s.value;
      });
      return map;
    },
    enabled: !!organizationId,
  });

  const getVal = (category: string, key: string) => settings[category]?.[key] ?? SETTING_DEFAULTS[category]?.[key] ?? "";

  const saveMutation = useMutation({
    mutationFn: async ({ category, key, value }: { category: string; key: string; value: any }) => {
      if (!organizationId || !user) throw new Error("Not authenticated");
      const { error } = await supabase.from("system_settings").upsert(
        { organization_id: organizationId, category, key, value, updated_by: user.id },
        { onConflict: "organization_id,category,key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Setting saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveSetting = (category: string, key: string, value: any) => saveMutation.mutate({ category, key, value });

  const { data: protocolCount = 0 } = useQuery({
    queryKey: ["protocol-count", organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const { count } = await supabase.from("device_protocols").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const stats = { activeProtocols: protocolCount, fuelSensors: 0, enrichmentConfigs: 0, lastUpdated: "Live" };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-primary/10">
            <Settings2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">{t('nav.systemConfig')}</h1>
            <p className="text-muted-foreground mt-1 text-lg">{t('settings.preferences')}</p>
          </div>
        </div>

        <ConfigQuickStats {...stats} />
        <ConfigQuickActions
          onAddProtocol={() => setActiveTab("protocols")}
          onRefreshConfigs={() => queryClient.invalidateQueries({ queryKey: ["system-settings"] })}
          onExportConfigs={() => toast.info("Export coming soon")}
          onTestConnection={() => toast.info("Connection test coming soon")}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto p-1 h-12">
            <TabsTrigger value="general" className="gap-1.5 text-xs"><Settings2 className="h-3.5 w-3.5" /> General</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="telemetry" className="gap-1.5 text-xs"><Database className="h-3.5 w-3.5" /> Telemetry</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="protocols" className="gap-1.5 text-xs"><Radio className="h-3.5 w-3.5" /> Protocols</TabsTrigger>
            <TabsTrigger value="fuel" className="gap-1.5 text-xs"><Droplet className="h-3.5 w-3.5" /> Fuel</TabsTrigger>
            <TabsTrigger value="smtp" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> SMTP</TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5" /> SMS</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                {[
                  { key: "timezone", label: "Timezone", type: "text" },
                  { key: "date_format", label: "Date Format", type: "text" },
                  { key: "distance_unit", label: "Distance Unit", type: "text" },
                  { key: "currency", label: "Currency", type: "text" },
                  { key: "language", label: "Language", type: "text" },
                ].map(({ key, label, type }) => (
                  <div key={key} className="flex items-center gap-4">
                    <Label className="w-40">{label}</Label>
                    <Input defaultValue={getVal("general", key)} onBlur={e => saveSetting("general", key, e.target.value)} className="flex-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="flex items-center gap-4"><Label className="w-40">Session Timeout (min)</Label><Input type="number" defaultValue={getVal("security", "session_timeout_minutes")} onBlur={e => saveSetting("security", "session_timeout_minutes", +e.target.value)} className="flex-1" /></div>
                <div className="flex items-center gap-4"><Label className="w-40">Max Login Attempts</Label><Input type="number" defaultValue={getVal("security", "max_login_attempts")} onBlur={e => saveSetting("security", "max_login_attempts", +e.target.value)} className="flex-1" /></div>
                <div className="flex items-center gap-4"><Label className="w-40">Min Password Length</Label><Input type="number" defaultValue={getVal("security", "password_min_length")} onBlur={e => saveSetting("security", "password_min_length", +e.target.value)} className="flex-1" /></div>
                <div className="flex items-center justify-between"><Label>Enforce Two-Factor Auth</Label><Switch checked={getVal("security", "enforce_2fa")} onCheckedChange={v => saveSetting("security", "enforce_2fa", v)} /></div>
                <div className="flex items-center justify-between"><Label>IP Whitelist</Label><Switch checked={getVal("security", "ip_whitelist_enabled")} onCheckedChange={v => saveSetting("security", "ip_whitelist_enabled", v)} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Telemetry Settings */}
          <TabsContent value="telemetry">
            <Card>
              <CardHeader><CardTitle>Telemetry & Data Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="flex items-center gap-4"><Label className="w-48">Offline Threshold (min)</Label><Input type="number" defaultValue={getVal("telemetry", "offline_threshold_minutes")} onBlur={e => saveSetting("telemetry", "offline_threshold_minutes", +e.target.value)} className="flex-1" /></div>
                <div className="flex items-center gap-4"><Label className="w-48">Telemetry Interval (sec)</Label><Input type="number" defaultValue={getVal("telemetry", "telemetry_interval_seconds")} onBlur={e => saveSetting("telemetry", "telemetry_interval_seconds", +e.target.value)} className="flex-1" /></div>
                <div className="flex items-center gap-4"><Label className="w-48">Data Retention (months)</Label><Input type="number" defaultValue={getVal("telemetry", "data_retention_months")} onBlur={e => saveSetting("telemetry", "data_retention_months", +e.target.value)} className="flex-1" /></div>
                <div className="flex items-center gap-4"><Label className="w-48">Batch Insert Size</Label><Input type="number" defaultValue={getVal("telemetry", "batch_size")} onBlur={e => saveSetting("telemetry", "batch_size", +e.target.value)} className="flex-1" /></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="flex items-center justify-between"><Label>Email Notifications</Label><Switch checked={getVal("notifications", "email_enabled")} onCheckedChange={v => saveSetting("notifications", "email_enabled", v)} /></div>
                <div className="flex items-center justify-between"><Label>SMS Notifications</Label><Switch checked={getVal("notifications", "sms_enabled")} onCheckedChange={v => saveSetting("notifications", "sms_enabled", v)} /></div>
                <div className="flex items-center justify-between"><Label>Push Notifications</Label><Switch checked={getVal("notifications", "push_enabled")} onCheckedChange={v => saveSetting("notifications", "push_enabled", v)} /></div>
                <div className="flex items-center gap-4"><Label className="w-40">Alert Digest</Label><Input defaultValue={getVal("notifications", "alert_digest_interval")} onBlur={e => saveSetting("notifications", "alert_digest_interval", e.target.value)} className="flex-1" /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="protocols"><Card className="p-6"><DeviceProtocolsTab /></Card></TabsContent>
          <TabsContent value="fuel"><Card className="p-6"><FuelDetectionTab /></Card></TabsContent>
          <TabsContent value="smtp"><Card className="p-6"><SmtpConfigTab /></Card></TabsContent>
          <TabsContent value="sms"><Card className="p-6"><SmsGatewayTab /></Card></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SystemConfig;

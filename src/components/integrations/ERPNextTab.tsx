import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Settings, RefreshCw, CheckCircle2, XCircle, Loader2, Database, Users, Fuel, Wrench, TrendingUp, AlertTriangle, MapPin, Activity } from "lucide-react";

const ERPNextTab = () => {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    erpnext_url: "",
    api_key: "",
    api_secret: "",
    sync_vehicles: true,
    sync_drivers: true,
    sync_fuel_transactions: true,
    sync_maintenance: true,
    sync_trips: true,
    sync_incidents: true,
    sync_alerts: true,
    sync_gps_data: true,
    sync_driver_events: true,
    auto_sync: true,
    sync_interval_minutes: 30,
  });

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, [organizationId]);

  const fetchConfig = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("erpnext_config")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (data) {
      setConfig(data);
      const syncSettings = (data.sync_settings as any) || {};
      setFormData({
        erpnext_url: data.erpnext_url,
        api_key: data.api_key,
        api_secret: data.api_secret,
        sync_vehicles: syncSettings.sync_vehicles ?? true,
        sync_drivers: syncSettings.sync_drivers ?? true,
        sync_fuel_transactions: syncSettings.sync_fuel_transactions ?? true,
        sync_maintenance: syncSettings.sync_maintenance ?? true,
        sync_trips: syncSettings.sync_trips ?? true,
        sync_incidents: syncSettings.sync_incidents ?? true,
        sync_alerts: syncSettings.sync_alerts ?? true,
        sync_gps_data: syncSettings.sync_gps_data ?? true,
        sync_driver_events: syncSettings.sync_driver_events ?? true,
        auto_sync: syncSettings.auto_sync ?? true,
        sync_interval_minutes: syncSettings.sync_interval_minutes ?? 30,
      });
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    if (!organizationId) return;
    
    const { data } = await supabase
      .from("erpnext_sync_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setLogs(data);
  };

  const handleSave = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    
    const syncSettings = {
      sync_vehicles: formData.sync_vehicles,
      sync_drivers: formData.sync_drivers,
      sync_fuel_transactions: formData.sync_fuel_transactions,
      sync_maintenance: formData.sync_maintenance,
      sync_trips: formData.sync_trips,
      sync_incidents: formData.sync_incidents,
      sync_alerts: formData.sync_alerts,
      sync_gps_data: formData.sync_gps_data,
      sync_driver_events: formData.sync_driver_events,
      auto_sync: formData.auto_sync,
      sync_interval_minutes: formData.sync_interval_minutes,
    };

    const payload = {
      organization_id: organizationId,
      erpnext_url: formData.erpnext_url,
      api_key: formData.api_key,
      api_secret: formData.api_secret,
      sync_settings: syncSettings,
      is_active: true,
    };

    let error;
    if (config) {
      ({ error } = await supabase
        .from("erpnext_config")
        .update(payload)
        .eq("id", config.id));
    } else {
      ({ error } = await supabase
        .from("erpnext_config")
        .insert(payload));
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "ERPNext configuration saved successfully",
      });
      fetchConfig();
    }
    
    setLoading(false);
  };

  const testConnection = async () => {
    setTesting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erpnext-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'test' }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to ERPNext",
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setTesting(false);
  };

  const syncNow = async (entityType?: string) => {
    setSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erpnext-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'sync', entityType }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Sync Successful",
          description: `Synced ${result.totalSynced} records${result.totalFailed > 0 ? `, ${result.totalFailed} failed` : ''}`,
        });
        fetchLogs();
        fetchConfig();
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">ERPNext Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="erpnext_url">ERPNext URL</Label>
            <Input
              id="erpnext_url"
              placeholder="https://your-erpnext-instance.com"
              value={formData.erpnext_url}
              onChange={(e) => setFormData({ ...formData, erpnext_url: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              placeholder="Your ERPNext API Key"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="api_secret">API Secret</Label>
            <Input
              id="api_secret"
              type="password"
              placeholder="Your ERPNext API Secret"
              value={formData.api_secret}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
            />
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-4">Sync Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_vehicles">Sync Vehicles</Label>
                </div>
                <Switch
                  id="sync_vehicles"
                  checked={formData.sync_vehicles}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_vehicles: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_drivers">Sync Drivers</Label>
                </div>
                <Switch
                  id="sync_drivers"
                  checked={formData.sync_drivers}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_drivers: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_fuel">Sync Fuel Transactions</Label>
                </div>
                <Switch
                  id="sync_fuel"
                  checked={formData.sync_fuel_transactions}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_fuel_transactions: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_maintenance">Sync Maintenance</Label>
                </div>
                <Switch
                  id="sync_maintenance"
                  checked={formData.sync_maintenance}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_maintenance: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_alerts">Sync Alerts</Label>
                </div>
                <Switch
                  id="sync_alerts"
                  checked={formData.sync_alerts}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_incidents">Sync Incidents</Label>
                </div>
                <Switch
                  id="sync_incidents"
                  checked={formData.sync_incidents}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_incidents: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_gps">Sync GPS/Trips Data</Label>
                </div>
                <Switch
                  id="sync_gps"
                  checked={formData.sync_gps_data}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_gps_data: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="sync_driver_events">Sync Driver Events</Label>
                </div>
                <Switch
                  id="sync_driver_events"
                  checked={formData.sync_driver_events}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_driver_events: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="auto_sync">Enable Auto-Sync</Label>
                </div>
                <Switch
                  id="auto_sync"
                  checked={formData.auto_sync}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_sync: checked })}
                />
              </div>

              {formData.auto_sync && (
                <div>
                  <Label htmlFor="sync_interval">Sync Interval (minutes)</Label>
                  <Input
                    id="sync_interval"
                    type="number"
                    min="5"
                    value={formData.sync_interval_minutes}
                    onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Configuration
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={testing || !config}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Test Connection
            </Button>
            <Button variant="secondary" onClick={() => syncNow()} disabled={syncing || !config}>
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Last Sync Status */}
      {config && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Sync Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Last Sync</div>
              <div className="font-medium">
                {config.last_sync_at ? new Date(config.last_sync_at).toLocaleString() : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={config.last_sync_status === 'success' ? 'default' : 'destructive'}>
                {config.last_sync_status || 'N/A'}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Sync Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Sync History</h3>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {log.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <div className="font-medium">{log.entity_type}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  <span className="text-success">{log.records_synced} synced</span>
                  {log.records_failed > 0 && (
                    <>, <span className="text-destructive">{log.records_failed} failed</span></>
                  )}
                </div>
                <Badge variant="outline" className="mt-1">{log.sync_type}</Badge>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No sync history available
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ERPNextTab;

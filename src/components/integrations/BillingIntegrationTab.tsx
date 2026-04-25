import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Link, RefreshCw, DollarSign, Receipt, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { friendlyToastError } from "@/lib/errorMessages";

const billingProviders = [
  { value: "custom_erp", label: "Custom ERP Billing" },
  { value: "sap_billing", label: "SAP Billing Module" },
  { value: "oracle_billing", label: "Oracle EBS Billing" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "xero", label: "Xero" },
  { value: "custom_api", label: "Custom REST API" },
];

const BILLABLE_ENTITY_DEFAULTS = [
  "Vehicle Usage (km)",
  "Fuel Consumption (liters)",
  "Trip Charges",
  "Maintenance Costs",
  "Driver Overtime Hours",
  "Asset Depreciation",
];

const BillingIntegrationTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const [provider, setProvider] = useState("custom_erp");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [authType, setAuthType] = useState("bearer");
  const [syncInterval, setSyncInterval] = useState("15");
  const [isActive, setIsActive] = useState(false);
  const [enabledEntities, setEnabledEntities] = useState<string[]>([]);

  // Fetch existing config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["billing-config", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_integration_configs")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch billing events
  const { data: events } = useQuery({
    queryKey: ["billing-events", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_sync_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Load config into form
  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setApiEndpoint(config.api_endpoint);
      setAuthType(config.auth_type);
      setSyncInterval(String(config.sync_interval_minutes));
      setIsActive(config.is_active);
      const entities = (config.billable_entities as string[]) || [];
      setEnabledEntities(entities);
    }
  }, [config]);

  // Save / update config
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization");
      const payload = {
        organization_id: organizationId,
        provider,
        api_endpoint: apiEndpoint,
        auth_type: authType,
        sync_interval_minutes: parseInt(syncInterval) || 15,
        is_active: isActive,
        billable_entities: enabledEntities,
      };
      if (config) {
        const { error } = await supabase
          .from("billing_integration_configs")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("billing_integration_configs")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-config"] });
      toast({ title: "Saved", description: "Billing integration configuration saved" });
    },
    onError: (e: any) => {
      friendlyToastError(e);
    },
  });

  // Sync now — creates a pending billing sync event
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization");
      const { error } = await supabase.from("billing_sync_events").insert([{
        organization_id: organizationId,
        config_id: config?.id || null,
        event_description: "Manual billing sync triggered",
        amount: 0,
        status: "pending",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-events"] });
      toast({ title: "Sync Triggered", description: "Billing sync has been queued" });
    },
  });

  // Delete an event
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing_sync_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-events"] });
    },
  });

  const toggleEntity = (entity: string) => {
    setEnabledEntities(prev =>
      prev.includes(entity) ? prev.filter(e => e !== entity) : [...prev, entity]
    );
  };

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing System Integration
          </CardTitle>
          <CardDescription>
            Connect to your billing/invoicing system to bill customers for service and asset usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Billing Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {billingProviders.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Authentication Type</Label>
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="api_key">API Key (Header)</SelectItem>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Endpoint</Label>
              <Input placeholder="https://billing.example.com/api/v1" value={apiEndpoint} onChange={e => setApiEndpoint(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input type="password" placeholder="••••••••••••" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sync Interval (minutes)</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="1440">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Enable Billing Sync</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : config ? "Update Configuration" : "Save Configuration"}
            </Button>
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={!config || syncMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" /> Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billable Entities */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billable Data Entities
          </CardTitle>
          <CardDescription>Select which fleet data to sync to your billing system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {BILLABLE_ENTITY_DEFAULTS.map(entity => (
              <div key={entity} className="flex items-center justify-between p-3 rounded-lg glass hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Switch checked={enabledEntities.includes(entity)} onCheckedChange={() => toggleEntity(entity)} />
                  <p className="font-medium text-sm">{entity}</p>
                </div>
                <Badge variant={enabledEntities.includes(entity) ? "default" : "outline"}>
                  {enabledEntities.includes(entity) ? "Active" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Events History */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!events?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No billing events yet</TableCell>
                </TableRow>
              ) : events.map(evt => (
                <TableRow key={evt.id}>
                  <TableCell className="text-sm">{format(new Date(evt.created_at), "PPpp")}</TableCell>
                  <TableCell>{evt.event_description}</TableCell>
                  <TableCell className="font-semibold">{evt.currency} {Number(evt.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={evt.status === "synced" ? "default" : evt.status === "failed" ? "destructive" : "secondary"}>
                      {evt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => deleteEventMutation.mutate(evt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingIntegrationTab;

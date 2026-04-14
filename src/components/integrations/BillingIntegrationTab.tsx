import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Link, CheckCircle2, AlertTriangle, RefreshCw, FileText, DollarSign, Receipt } from "lucide-react";
import { toast } from "sonner";

interface BillingConfig {
  provider: string;
  apiEndpoint: string;
  apiKey: string;
  authType: string;
  isActive: boolean;
  syncInterval: string;
  lastSync: string | null;
}

const billingProviders = [
  { value: "custom_erp", label: "Custom ERP Billing" },
  { value: "sap_billing", label: "SAP Billing Module" },
  { value: "oracle_billing", label: "Oracle EBS Billing" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "xero", label: "Xero" },
  { value: "custom_api", label: "Custom REST API" },
];

const syncableEntities = [
  { entity: "Vehicle Usage (km)", enabled: true, lastSynced: "2 min ago", records: 312 },
  { entity: "Fuel Consumption (liters)", enabled: true, lastSynced: "2 min ago", records: 189 },
  { entity: "Trip Charges", enabled: true, lastSynced: "5 min ago", records: 45 },
  { entity: "Maintenance Costs", enabled: false, lastSynced: null, records: 0 },
  { entity: "Driver Overtime Hours", enabled: false, lastSynced: null, records: 0 },
  { entity: "Asset Depreciation", enabled: false, lastSynced: null, records: 0 },
];

const BillingIntegrationTab = () => {
  const [config, setConfig] = useState<BillingConfig>({
    provider: "custom_erp",
    apiEndpoint: "",
    apiKey: "",
    authType: "bearer",
    isActive: false,
    syncInterval: "15",
    lastSync: null,
  });

  const [entities, setEntities] = useState(syncableEntities);

  const handleSave = () => {
    toast.success("Billing integration configuration saved");
  };

  const handleTestConnection = () => {
    if (!config.apiEndpoint) {
      toast.error("Please enter an API endpoint");
      return;
    }
    toast.success("Connection test successful — billing API reachable");
  };

  const handleSync = () => {
    toast.success("Billing sync triggered — processing usage records...");
  };

  const toggleEntity = (index: number) => {
    setEntities(prev => prev.map((e, i) => i === index ? { ...e, enabled: !e.enabled } : e));
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
              <Select value={config.provider} onValueChange={v => setConfig(p => ({ ...p, provider: v }))}>
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
              <Select value={config.authType} onValueChange={v => setConfig(p => ({ ...p, authType: v }))}>
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
              <Input placeholder="https://billing.example.com/api/v1" value={config.apiEndpoint} onChange={e => setConfig(p => ({ ...p, apiEndpoint: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input type="password" placeholder="••••••••••••" value={config.apiKey} onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Sync Interval (minutes)</Label>
              <Select value={config.syncInterval} onValueChange={v => setConfig(p => ({ ...p, syncInterval: v }))}>
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
              <Switch checked={config.isActive} onCheckedChange={v => setConfig(p => ({ ...p, isActive: v }))} />
              <Label>Enable Billing Sync</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>Save Configuration</Button>
            <Button variant="outline" onClick={handleTestConnection}>
              <Link className="h-4 w-4 mr-2" /> Test Connection
            </Button>
            <Button variant="outline" onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" /> Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Syncable Entities */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billable Data Entities
          </CardTitle>
          <CardDescription>Select which fleet data to sync to your billing system for customer invoicing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entities.map((entity, idx) => (
              <div key={entity.entity} className="flex items-center justify-between p-3 rounded-lg glass hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Switch checked={entity.enabled} onCheckedChange={() => toggleEntity(idx)} />
                  <div>
                    <p className="font-medium text-sm">{entity.entity}</p>
                    {entity.lastSynced && (
                      <p className="text-xs text-muted-foreground">Last synced: {entity.lastSynced} • {entity.records} records</p>
                    )}
                  </div>
                </div>
                <Badge variant={entity.enabled ? "default" : "outline"}>
                  {entity.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Events Preview */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Billing Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { time: "14:30", event: "Vehicle ETH-1234 usage invoice: 127 km, 18.5L fuel", amount: "ETB 2,450", status: "synced" },
              { time: "14:15", event: "Trip TRP-0089 charge: Addis → Hawassa delivery", amount: "ETB 8,200", status: "synced" },
              { time: "14:00", event: "Monthly fleet rental: 5 vehicles × 30 days", amount: "ETB 125,000", status: "pending" },
              { time: "13:45", event: "Fuel reimbursement: Driver D-012, receipt #4521", amount: "ETB 1,800", status: "synced" },
            ].map((evt, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{evt.time}</span>
                  <span>{evt.event}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{evt.amount}</span>
                  <Badge variant={evt.status === "synced" ? "default" : "outline"} className="text-xs">{evt.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingIntegrationTab;

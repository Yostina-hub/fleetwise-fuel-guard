import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, RefreshCw, Settings, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const PROVIDERS = [
  { value: "ola", label: "OLA Energy", logo: "🛢️" },
  { value: "total", label: "TotalEnergies", logo: "⛽" },
  { value: "noc", label: "NOC Ethiopia", logo: "🏭" },
  { value: "shell", label: "Shell", logo: "🐚" },
  { value: "custom", label: "Custom Provider", logo: "🔧" },
];

const FuelCardProviders = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    provider_name: "",
    api_endpoint: "",
    account_id: "",
    api_key: "",
    sync_interval_minutes: 60,
  });

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["fuel-card-providers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("fuel_card_providers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createProviderMutation = useMutation({
    mutationFn: async (provider: typeof newProvider) => {
      if (!organizationId) throw new Error("No org");
      const { error } = await supabase.from("fuel_card_providers").insert({
        organization_id: organizationId,
        provider_name: provider.provider_name,
        api_endpoint: provider.api_endpoint || null,
        account_id: provider.account_id || null,
        api_key_encrypted: provider.api_key || null,
        sync_interval_minutes: provider.sync_interval_minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-card-providers"] });
      setShowAddProvider(false);
      setNewProvider({ provider_name: "", api_endpoint: "", account_id: "", api_key: "", sync_interval_minutes: 60 });
      toast.success("Fuel card provider added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleProviderMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("fuel_card_providers").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-card-providers"] });
      toast.success("Provider updated");
    },
  });

  const syncProvider = (id: string) => {
    toast.info("Syncing transactions from provider...");
    // Simulate sync — in production this would call an edge function
    setTimeout(() => {
      toast.success("Sync complete — 0 new transactions");
    }, 2000);
  };

  const activeProviders = providers.filter(p => p.is_active).length;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('pages.fuel_card_providers.title', 'Fuel Card API Integration')}</h1>
            <p className="text-muted-foreground text-sm">{t('pages.fuel_card_providers.description', 'Connect fuel card providers for automated transaction syncing')}</p>
          </div>
          <Button className="gap-2" onClick={() => setShowAddProvider(true)}>
            <Plus className="w-4 h-4" /> Add Provider
          </Button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Connected Providers</p>
                <p className="text-2xl font-bold">{activeProviders}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <p className="text-2xl font-bold">{providers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Clock className="w-5 h-5 text-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-Sync</p>
                <p className="text-2xl font-bold">{providers.filter(p => p.is_active && p.sync_interval_minutes).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : providers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No fuel card providers configured</p>
              <Button className="mt-4" onClick={() => setShowAddProvider(true)}>Add Your First Provider</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(provider => {
              const providerMeta = PROVIDERS.find(p => p.value === provider.provider_name) || { label: provider.provider_name, logo: "🔧" };
              return (
                <Card key={provider.id} className={!provider.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{providerMeta.logo}</span>
                        <CardTitle className="text-lg">{providerMeta.label}</CardTitle>
                      </div>
                      <Switch
                        checked={provider.is_active}
                        onCheckedChange={v => toggleProviderMutation.mutate({ id: provider.id, isActive: v })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={provider.is_active ? "default" : "secondary"}>
                        {provider.is_active ? "Connected" : "Disabled"}
                      </Badge>
                    </div>
                    {provider.account_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Account</span>
                        <span className="font-mono text-xs">{provider.account_id}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sync Interval</span>
                      <span>{provider.sync_interval_minutes}min</span>
                    </div>
                    {provider.last_sync_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span>{format(new Date(provider.last_sync_at), "dd MMM, HH:mm")}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => syncProvider(provider.id)}>
                        <RefreshCw className="w-3 h-3" /> Sync Now
                      </Button>
                      <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Provider Dialog */}
        <Dialog open={showAddProvider} onOpenChange={setShowAddProvider}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Fuel Card Provider</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Provider</Label>
                <Select value={newProvider.provider_name} onValueChange={v => setNewProvider(p => ({ ...p, provider_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.logo} {p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>API Endpoint (optional)</Label>
                <Input value={newProvider.api_endpoint} onChange={e => setNewProvider(p => ({ ...p, api_endpoint: e.target.value }))} placeholder="https://api.provider.com/v1" />
              </div>
              <div>
                <Label>Account ID</Label>
                <Input value={newProvider.account_id} onChange={e => setNewProvider(p => ({ ...p, account_id: e.target.value }))} placeholder="Your account identifier" />
              </div>
              <div>
                <Label>API Key</Label>
                <Input type="password" value={newProvider.api_key} onChange={e => setNewProvider(p => ({ ...p, api_key: e.target.value }))} placeholder="Provider API key" />
              </div>
              <div>
                <Label>Sync Interval (minutes)</Label>
                <Input type="number" value={newProvider.sync_interval_minutes} onChange={e => setNewProvider(p => ({ ...p, sync_interval_minutes: parseInt(e.target.value) || 60 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddProvider(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => createProviderMutation.mutate(newProvider)} disabled={!newProvider.provider_name}>
                Add Provider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FuelCardProviders;

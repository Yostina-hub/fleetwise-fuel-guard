import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, RefreshCw, Shield, Server, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";
import { friendlyToastError } from "@/lib/errorMessages";

const LDAPImportTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "Active Directory",
    server_url: "",
    bind_dn: "",
    base_dn: "",
    search_filter: "(objectClass=user)",
    tls_enabled: true,
    attr_username: "sAMAccountName",
    attr_email: "mail",
    attr_fullName: "cn",
    attr_phone: "telephoneNumber",
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["ldap-configs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ldap_configs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: syncLogs } = useQuery({
    queryKey: ["ldap-sync-logs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ldap_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization");
      const payload = {
        organization_id: organizationId,
        name: form.name,
        server_url: form.server_url,
        bind_dn: form.bind_dn || null,
        base_dn: form.base_dn,
        search_filter: form.search_filter,
        tls_enabled: form.tls_enabled,
        user_attributes: {
          username: form.attr_username,
          email: form.attr_email,
          fullName: form.attr_fullName,
          phone: form.attr_phone,
        },
      };
      const existing = configs?.[0];
      if (existing) {
        const { error } = await supabase.from("ldap_configs").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ldap_configs").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ldap-configs"] });
      toast({ title: "Saved", description: "LDAP configuration saved successfully" });
    },
    onError: (e: any) => {
      friendlyToastError(e);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !configs?.[0]) throw new Error("Configure LDAP first");
      // Log sync attempt — actual LDAP sync would be handled by edge function
      const { error } = await supabase.from("ldap_sync_logs").insert([{
        organization_id: organizationId,
        ldap_config_id: configs[0].id,
        status: "pending",
      }]);
      if (error) throw error;
      // Simulate — in production this triggers an edge function
      toast({ title: "Sync Initiated", description: "LDAP directory sync has been queued. Users will be imported shortly." });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ldap-sync-logs"] });
    },
  });

  // Load existing config into form
  const activeConfig = configs?.[0];
  if (activeConfig && !form.server_url && activeConfig.server_url) {
    const attrs = (activeConfig.user_attributes as any) || {};
    setForm({
      name: activeConfig.name,
      server_url: activeConfig.server_url,
      bind_dn: activeConfig.bind_dn || "",
      base_dn: activeConfig.base_dn,
      search_filter: activeConfig.search_filter || "(objectClass=user)",
      tls_enabled: activeConfig.tls_enabled ?? true,
      attr_username: attrs.username || "sAMAccountName",
      attr_email: attrs.email || "mail",
      attr_fullName: attrs.fullName || "cn",
      attr_phone: attrs.phone || "telephoneNumber",
    });
  }

  return (
    <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              LDAP / Active Directory Import
            </h2>
            <p className="text-sm text-muted-foreground">
              Bulk sync users from your LDAP/AD directory into the fleet management system
            </p>
          </div>
          <Button onClick={() => syncMutation.mutate()} disabled={!activeConfig || syncMutation.isPending} variant="outline">
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Now
          </Button>
        </div>

        {/* Connection Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Directory Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Active Directory" />
          </div>
          <div>
            <Label>Server URL</Label>
            <Input value={form.server_url} onChange={e => setForm({ ...form, server_url: e.target.value })} placeholder="ldaps://ad.company.com:636" />
          </div>
          <div>
            <Label>Bind DN (Service Account)</Label>
            <Input value={form.bind_dn} onChange={e => setForm({ ...form, bind_dn: e.target.value })} placeholder="CN=svc_ldap,OU=Service,DC=company,DC=com" />
          </div>
          <div>
            <Label>Base DN (Search Root)</Label>
            <Input value={form.base_dn} onChange={e => setForm({ ...form, base_dn: e.target.value })} placeholder="OU=Users,DC=company,DC=com" />
          </div>
          <div>
            <Label>Search Filter</Label>
            <Input value={form.search_filter} onChange={e => setForm({ ...form, search_filter: e.target.value })} placeholder="(objectClass=user)" />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.tls_enabled} onCheckedChange={v => setForm({ ...form, tls_enabled: v })} />
            <Label className="flex items-center gap-1"><Shield className="h-3 w-3" /> TLS/SSL Enabled</Label>
          </div>
        </div>

        <Separator />

        {/* Attribute Mapping */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2"><Server className="h-4 w-4" /> Attribute Mappings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Username Attr</Label>
              <Input value={form.attr_username} onChange={e => setForm({ ...form, attr_username: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Email Attr</Label>
              <Input value={form.attr_email} onChange={e => setForm({ ...form, attr_email: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Full Name Attr</Label>
              <Input value={form.attr_fullName} onChange={e => setForm({ ...form, attr_fullName: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Phone Attr</Label>
              <Input value={form.attr_phone} onChange={e => setForm({ ...form, attr_phone: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={!form.server_url || !form.base_dn || saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? "Saving..." : activeConfig ? "Update Configuration" : "Save Configuration"}
        </Button>

        <Separator />

        {/* Sync History */}
        <div>
          <h3 className="font-medium mb-3">Sync History</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Skipped</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!syncLogs?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No sync history</TableCell>
                </TableRow>
              ) : syncLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{format(new Date(log.created_at), "PPpp")}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.users_created}</TableCell>
                  <TableCell>{log.users_updated}</TableCell>
                  <TableCell>{log.users_skipped}</TableCell>
                  <TableCell>{log.users_synced}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default LDAPImportTab;

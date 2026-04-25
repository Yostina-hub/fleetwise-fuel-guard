import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Plus, Building2, Trash2, Edit, Shield, CheckCircle2, XCircle, Info } from "lucide-react";

type ProviderType = "oracle_idcs" | "azure_ad" | "active_directory" | "saml" | "oidc" | "okta" | "ping";

interface IdpConfig {
  id: string;
  organization_id: string;
  provider_type: ProviderType;
  display_name: string;
  metadata_url: string | null;
  entity_id: string | null;
  sso_url: string | null;
  client_id: string | null;
  client_secret_ref: string | null;
  domains: string[];
  attribute_mapping: Record<string, string>;
  role_mapping: Record<string, string>;
  default_role: string | null;
  is_active: boolean;
  auto_provision_users: boolean;
  created_at: string;
}

const PROVIDER_LABELS: Record<ProviderType, string> = {
  oracle_idcs: "Oracle Identity Cloud Service",
  azure_ad: "Microsoft Entra ID (Azure AD)",
  active_directory: "Active Directory (on-prem)",
  saml: "Generic SAML 2.0",
  oidc: "Generic OIDC",
  okta: "Okta",
  ping: "Ping Identity",
};

const ROLES = ["super_admin", "org_admin", "fleet_manager", "operations_manager", "fleet_owner", "technician", "driver"];

export default function ActiveDirectoryTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IdpConfig | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["idp-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("identity_provider_configs" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IdpConfig[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<IdpConfig>) => {
      if (editing?.id) {
        const { error } = await supabase
          .from("identity_provider_configs" as any)
          .update(payload as any)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("identity_provider_configs" as any)
          .insert({ ...payload, organization_id: profile?.organization_id, created_by: profile?.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["idp-configs"] });
      toast.success(editing ? "Provider updated" : "Provider configured");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("identity_provider_configs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["idp-configs"] });
      toast.success("Provider removed");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("identity_provider_configs" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["idp-configs"] }),
  });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (cfg: IdpConfig) => {
    setEditing(cfg);
    setDialogOpen(true);
  };

  return (
    <Card className="glass-strong border-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Active Directory & Identity Providers
            </CardTitle>
            <CardDescription>
              Configure Oracle IDCS, Azure AD, and SAML/OIDC providers for enterprise SSO and user provisioning.
            </CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Add Provider
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Oracle IDCS / Active Directory bridges users from your corporate directory into the fleet platform.
            Once active, matching email domains route users through SSO; new users are auto-provisioned with the
            default role you specify.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading providers…</div>
        ) : !configs?.length ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No identity providers configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add Oracle IDCS or Active Directory to enable enterprise sign-in.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => (
              <Card key={cfg.id} className="border hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{cfg.display_name}</h3>
                        <Badge variant="outline">{PROVIDER_LABELS[cfg.provider_type]}</Badge>
                        {cfg.is_active ? (
                          <Badge className="bg-green-500/15 text-green-600 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" /> Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        {cfg.domains.length > 0 && (
                          <div>
                            <span className="font-medium">Domains:</span> {cfg.domains.join(", ")}
                          </div>
                        )}
                        {cfg.metadata_url && (
                          <div className="truncate">
                            <span className="font-medium">Metadata:</span> {cfg.metadata_url}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Default role:</span> {cfg.default_role || "—"}
                          {" · "}
                          <span className="font-medium">Auto-provision:</span>{" "}
                          {cfg.auto_provision_users ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cfg.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: cfg.id, is_active: v })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cfg)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Remove "${cfg.display_name}"?`)) deleteMutation.mutate(cfg.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ProviderDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
          editing={editing}
          onSave={(p) => saveMutation.mutate(p)}
          saving={saveMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

function ProviderDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: IdpConfig | null;
  onSave: (payload: Partial<IdpConfig>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<IdpConfig>>(
    editing || {
      provider_type: "oracle_idcs",
      display_name: "",
      metadata_url: "",
      entity_id: "",
      sso_url: "",
      client_id: "",
      client_secret_ref: "",
      domains: [],
      default_role: "driver",
      is_active: false,
      auto_provision_users: true,
      attribute_mapping: {
        email: "email",
        full_name: "name",
        first_name: "given_name",
        last_name: "family_name",
        groups: "groups",
        department: "department",
      },
      role_mapping: {},
    },
  );
  const [domainsText, setDomainsText] = useState((editing?.domains || []).join(", "));

  const handleSubmit = () => {
    if (!form.display_name?.trim()) return toast.error("Display name is required");
    const domains = domainsText
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    onSave({ ...form, domains });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Identity Provider</DialogTitle>
          <DialogDescription>
            Configure an enterprise identity provider for SSO. Sensitive secrets are stored separately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Provider Type</Label>
              <Select
                value={form.provider_type}
                onValueChange={(v) => setForm({ ...form, provider_type: v as ProviderType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROVIDER_LABELS) as ProviderType[]).map((k) => (
                    <SelectItem key={k} value={k}>{PROVIDER_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Display Name *</Label>
              <Input
                value={form.display_name || ""}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Acme Corp Oracle IDCS"
              />
            </div>
          </div>

          <div>
            <Label>Email Domains (comma-separated)</Label>
            <Input
              value={domainsText}
              onChange={(e) => setDomainsText(e.target.value)}
              placeholder="acme.com, acme.et"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Users with these email domains will be routed to this provider at sign-in.
            </p>
          </div>

          <div>
            <Label>Metadata URL (SAML) / Discovery URL (OIDC)</Label>
            <Input
              value={form.metadata_url || ""}
              onChange={(e) => setForm({ ...form, metadata_url: e.target.value })}
              placeholder="https://idcs-xxx.identity.oraclecloud.com/oauth2/v1/discovery"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entity ID / Issuer</Label>
              <Input
                value={form.entity_id || ""}
                onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
                placeholder="https://idcs-xxx.identity.oraclecloud.com"
              />
            </div>
            <div>
              <Label>SSO / Authorization URL</Label>
              <Input
                value={form.sso_url || ""}
                onChange={(e) => setForm({ ...form, sso_url: e.target.value })}
                placeholder="https://.../oauth2/v1/authorize"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client ID</Label>
              <Input
                value={form.client_id || ""}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                placeholder="your_client_id"
              />
            </div>
            <div>
              <Label>Client Secret Ref</Label>
              <Input
                value={form.client_secret_ref || ""}
                onChange={(e) => setForm({ ...form, client_secret_ref: e.target.value })}
                placeholder="ORACLE_IDCS_CLIENT_SECRET"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Name of the Cloud secret holding the actual value.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default Role for new users</Label>
              <Select
                value={form.default_role || "driver"}
                onValueChange={(v) => setForm({ ...form, default_role: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 pt-6">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer" htmlFor="auto-prov">Auto-provision users</Label>
                <Switch
                  id="auto-prov"
                  checked={!!form.auto_provision_users}
                  onCheckedChange={(v) => setForm({ ...form, auto_provision_users: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer" htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={!!form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Attribute Mapping (JSON)</Label>
            <Textarea
              rows={5}
              className="font-mono text-xs"
              value={JSON.stringify(form.attribute_mapping || {}, null, 2)}
              onChange={(e) => {
                try {
                  setForm({ ...form, attribute_mapping: JSON.parse(e.target.value) });
                } catch {
                  /* keep typing */
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maps IdP claims to user fields (e.g. <code>"email": "mail"</code> for AD).
            </p>
          </div>

          <div>
            <Label>Group → Role Mapping (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              value={JSON.stringify(form.role_mapping || {}, null, 2)}
              onChange={(e) => {
                try {
                  setForm({ ...form, role_mapping: JSON.parse(e.target.value) });
                } catch {
                  /* keep typing */
                }
              }}
              placeholder='{"Fleet-Admins": "fleet_manager", "Drivers-OU": "driver"}'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

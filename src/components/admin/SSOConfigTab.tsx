import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useToast } from "@/hooks/use-toast";
import { friendlyToastError } from "@/lib/errorMessages";

interface SSOFormData {
  provider_name: string;
  provider_type: string;
  is_active: boolean;
  auto_provision_users: boolean;
  default_role: string;
  saml_entity_id: string;
  saml_sso_url: string;
  saml_certificate: string;
  oidc_issuer_url: string;
  oidc_client_id: string;
  oidc_client_secret: string;
  oidc_authorization_endpoint: string;
  oidc_token_endpoint: string;
  oidc_userinfo_endpoint: string;
}

const emptyForm: SSOFormData = {
  provider_name: "",
  provider_type: "saml",
  is_active: true,
  auto_provision_users: false,
  default_role: "viewer",
  saml_entity_id: "",
  saml_sso_url: "",
  saml_certificate: "",
  oidc_issuer_url: "",
  oidc_client_id: "",
  oidc_client_secret: "",
  oidc_authorization_endpoint: "",
  oidc_token_endpoint: "",
  oidc_userinfo_endpoint: "",
};

const SSOConfigTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ITEMS_PER_PAGE = 10;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SSOFormData>({ ...emptyForm });

  const { data: ssoConfigs, isLoading } = useQuery({
    queryKey: ["sso_configurations", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sso_configurations")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SSOFormData) => {
      const { error } = await (supabase as any).from("sso_configurations").insert({
        organization_id: organizationId,
        provider_name: data.provider_name,
        is_active: data.is_active,
        auto_provision_users: data.auto_provision_users,
        default_role: data.default_role,
        saml_entity_id: data.provider_type === "saml" ? data.saml_entity_id || null : null,
        saml_sso_url: data.provider_type === "saml" ? data.saml_sso_url || null : null,
        saml_certificate: data.provider_type === "saml" ? data.saml_certificate || null : null,
        oidc_issuer_url: data.provider_type === "oidc" ? data.oidc_issuer_url || null : null,
        oidc_client_id: data.provider_type === "oidc" ? data.oidc_client_id || null : null,
        oidc_client_secret: data.provider_type === "oidc" ? data.oidc_client_secret || null : null,
        oidc_authorization_endpoint: data.provider_type === "oidc" ? data.oidc_authorization_endpoint || null : null,
        oidc_token_endpoint: data.provider_type === "oidc" ? data.oidc_token_endpoint || null : null,
        oidc_userinfo_endpoint: data.provider_type === "oidc" ? data.oidc_userinfo_endpoint || null : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso_configurations"] });
      toast({ title: "SSO provider created" });
      closeDialog();
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SSOFormData }) => {
      const { error } = await (supabase as any).from("sso_configurations").update({
        provider_name: data.provider_name,
        is_active: data.is_active,
        auto_provision_users: data.auto_provision_users,
        default_role: data.default_role,
        saml_entity_id: data.provider_type === "saml" ? data.saml_entity_id || null : null,
        saml_sso_url: data.provider_type === "saml" ? data.saml_sso_url || null : null,
        saml_certificate: data.provider_type === "saml" ? data.saml_certificate || null : null,
        oidc_issuer_url: data.provider_type === "oidc" ? data.oidc_issuer_url || null : null,
        oidc_client_id: data.provider_type === "oidc" ? data.oidc_client_id || null : null,
        oidc_client_secret: data.provider_type === "oidc" ? data.oidc_client_secret || null : null,
        oidc_authorization_endpoint: data.provider_type === "oidc" ? data.oidc_authorization_endpoint || null : null,
        oidc_token_endpoint: data.provider_type === "oidc" ? data.oidc_token_endpoint || null : null,
        oidc_userinfo_endpoint: data.provider_type === "oidc" ? data.oidc_userinfo_endpoint || null : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso_configurations"] });
      toast({ title: "SSO provider updated" });
      closeDialog();
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("sso_configurations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso_configurations"] });
      toast({ title: "SSO provider deleted" });
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
  };

  const handleEdit = (config: any) => {
    const isSaml = !!(config.saml_entity_id || config.saml_sso_url);
    setEditingId(config.id);
    setFormData({
      provider_name: config.provider_name || "",
      provider_type: isSaml ? "saml" : "oidc",
      is_active: config.is_active ?? true,
      auto_provision_users: config.auto_provision_users ?? false,
      default_role: config.default_role || "viewer",
      saml_entity_id: config.saml_entity_id || "",
      saml_sso_url: config.saml_sso_url || "",
      saml_certificate: config.saml_certificate || "",
      oidc_issuer_url: config.oidc_issuer_url || "",
      oidc_client_id: config.oidc_client_id || "",
      oidc_client_secret: config.oidc_client_secret || "",
      oidc_authorization_endpoint: config.oidc_authorization_endpoint || "",
      oidc_token_endpoint: config.oidc_token_endpoint || "",
      oidc_userinfo_endpoint: config.oidc_userinfo_endpoint || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.provider_name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this SSO provider?")) deleteMutation.mutate(id);
  };

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(ssoConfigs?.length || 0, ITEMS_PER_PAGE);
  const paginatedConfigs = useMemo(() => ssoConfigs?.slice(startIndex, endIndex) || [], [ssoConfigs, startIndex, endIndex]);

  if (isLoading) return <div role="status" aria-live="polite">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Single Sign-On Configuration ({ssoConfigs?.length || 0})</h3>
          <p className="text-sm text-muted-foreground">Configure SAML 2.0 or OIDC authentication providers</p>
        </div>
        <Button onClick={() => { setFormData({ ...emptyForm }); setEditingId(null); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add SSO Provider
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Default Role</TableHead>
            <TableHead>Auto-Provision</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedConfigs.map((config: any) => {
            const isSaml = !!(config.saml_entity_id || config.saml_sso_url);
            return (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.provider_name}</TableCell>
                <TableCell><Badge variant="outline">{isSaml ? "SAML" : "OIDC"}</Badge></TableCell>
                <TableCell className="capitalize">{config.default_role || "viewer"}</TableCell>
                <TableCell>{config.auto_provision_users ? <Badge variant="outline">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                <TableCell>{config.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {ssoConfigs && ssoConfigs.length > ITEMS_PER_PAGE && (
        <TablePagination currentPage={currentPage} totalItems={ssoConfigs.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      )}

      {ssoConfigs?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No SSO providers configured</p>
          <p className="text-sm mt-2">Add SAML or OIDC providers for enterprise authentication</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} SSO Provider</DialogTitle>
            <DialogDescription>Configure a SAML 2.0 or OIDC identity provider</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input value={formData.provider_name} onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })} placeholder="e.g. Okta, Azure AD" />
              </div>
              <div className="space-y-2">
                <Label>Protocol</Label>
                <Select value={formData.provider_type} onValueChange={(v) => setFormData({ ...formData, provider_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saml">SAML 2.0</SelectItem>
                    <SelectItem value="oidc">OpenID Connect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Role</Label>
                <Select value={formData.default_role} onValueChange={(v) => setFormData({ ...formData, default_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-6 pb-2">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.auto_provision_users} onCheckedChange={(v) => setFormData({ ...formData, auto_provision_users: v })} />
                  <Label>Auto-provision</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>

            {formData.provider_type === "saml" && (
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">SAML Configuration</h4>
                <div className="space-y-2">
                  <Label>Entity ID</Label>
                  <Input value={formData.saml_entity_id} onChange={(e) => setFormData({ ...formData, saml_entity_id: e.target.value })} placeholder="https://idp.example.com/metadata" />
                </div>
                <div className="space-y-2">
                  <Label>SSO URL</Label>
                  <Input value={formData.saml_sso_url} onChange={(e) => setFormData({ ...formData, saml_sso_url: e.target.value })} placeholder="https://idp.example.com/sso" />
                </div>
                <div className="space-y-2">
                  <Label>Certificate (PEM)</Label>
                  <Textarea value={formData.saml_certificate} onChange={(e) => setFormData({ ...formData, saml_certificate: e.target.value })} placeholder="-----BEGIN CERTIFICATE-----" rows={4} className="font-mono text-xs" />
                </div>
              </div>
            )}

            {formData.provider_type === "oidc" && (
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">OIDC Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Issuer URL</Label>
                    <Input value={formData.oidc_issuer_url} onChange={(e) => setFormData({ ...formData, oidc_issuer_url: e.target.value })} placeholder="https://accounts.google.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input value={formData.oidc_client_id} onChange={(e) => setFormData({ ...formData, oidc_client_id: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input type="password" value={formData.oidc_client_secret} onChange={(e) => setFormData({ ...formData, oidc_client_secret: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Authorization Endpoint</Label>
                    <Input value={formData.oidc_authorization_endpoint} onChange={(e) => setFormData({ ...formData, oidc_authorization_endpoint: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Token Endpoint</Label>
                    <Input value={formData.oidc_token_endpoint} onChange={(e) => setFormData({ ...formData, oidc_token_endpoint: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>UserInfo Endpoint</Label>
                  <Input value={formData.oidc_userinfo_endpoint} onChange={(e) => setFormData({ ...formData, oidc_userinfo_endpoint: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Update" : "Create"} Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SSOConfigTab;

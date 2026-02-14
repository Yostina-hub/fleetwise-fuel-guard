import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Search, Users, MapPin, Mail, Phone, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/users/InviteUserDialog";

const Organizations = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "cpo",
    contact_email: "",
    contact_phone: "",
    address: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createOrg = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("organizations").insert({
        name: form.name,
        slug,
        type: form.type,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        address: form.address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization created successfully" });
      setDialogOpen(false);
      setForm({ name: "", slug: "", type: "cpo", contact_email: "", contact_phone: "", address: "" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = orgs.filter((o: any) =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Organizations</h1>
              <p className="text-muted-foreground text-sm">Manage all tenant organizations</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Create Organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Organization name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated-from-name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpo">CPO</SelectItem>
                      <SelectItem value="fleet_operator">Fleet Operator</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="admin@org.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+251..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => createOrg.mutate()} disabled={!form.name || createOrg.isPending}>
                  {createOrg.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-center py-12">No organizations found</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((org: any) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{org.name}</CardTitle>
                    <div className="flex gap-1.5">
                      {org.suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                      <Badge variant={org.active ? "default" : "secondary"} className="text-[10px]">
                        {org.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {org.slug && <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>}
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                  {org.type && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span className="capitalize">{org.type.replace("_", " ")}</span>
                    </div>
                  )}
                  {org.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{org.contact_email}</span>
                    </div>
                  )}
                  {org.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{org.contact_phone}</span>
                    </div>
                  )}
                  {org.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{org.address}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setInviteOrgId(org.id)}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Create User
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <InviteUserDialog
          open={!!inviteOrgId}
          onOpenChange={(open) => { if (!open) setInviteOrgId(null); }}
          onUserCreated={() => setInviteOrgId(null)}
          organizationId={inviteOrgId || undefined}
        />
      </div>
    </Layout>
  );
};

export default Organizations;

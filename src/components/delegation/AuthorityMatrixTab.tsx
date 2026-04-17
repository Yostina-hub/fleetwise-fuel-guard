import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, Plus, Edit, Trash2, Car, Fuel, Wrench, MapPin, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

type Scope = "vehicle_request" | "fuel_request" | "work_order" | "trip" | "maintenance";

const SCOPE_META: Record<Scope, { label: string; icon: any; color: string }> = {
  vehicle_request: { label: "Vehicle Requests", icon: Car, color: "text-blue-500" },
  fuel_request: { label: "Fuel Requests", icon: Fuel, color: "text-amber-500" },
  work_order: { label: "Work Orders", icon: Wrench, color: "text-purple-500" },
  trip: { label: "Trips", icon: MapPin, color: "text-emerald-500" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "text-red-500" },
};

const ROLES = [
  { value: "operations_manager", label: "Operations Manager" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "fleet_owner", label: "Fleet Owner" },
  { value: "org_admin", label: "Director / Org Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const ALL_AUTO_ROLES = ROLES.map(r => r.value);

interface FormState {
  scope: Scope;
  rule_name: string;
  description: string;
  approver_role: string;
  min_amount: string;
  max_amount: string;
  min_duration_days: string;
  max_duration_days: string;
  auto_approve_roles: string[];
  step_order: string;
  priority: string;
}

const emptyForm: FormState = {
  scope: "vehicle_request",
  rule_name: "",
  description: "",
  approver_role: "operations_manager",
  min_amount: "",
  max_amount: "",
  min_duration_days: "",
  max_duration_days: "",
  auto_approve_roles: [],
  step_order: "1",
  priority: "100",
};

export const AuthorityMatrixTab = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState<Scope | "all">("all");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["authority-matrix", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("authority_matrix")
        .select("*")
        .eq("organization_id", organizationId)
        .order("scope")
        .order("priority")
        .order("step_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        organization_id: organizationId!,
        scope: form.scope,
        rule_name: form.rule_name,
        description: form.description || null,
        approver_role: form.approver_role,
        min_amount: form.min_amount ? Number(form.min_amount) : null,
        max_amount: form.max_amount ? Number(form.max_amount) : null,
        min_duration_days: form.min_duration_days ? Number(form.min_duration_days) : null,
        max_duration_days: form.max_duration_days ? Number(form.max_duration_days) : null,
        auto_approve_roles: form.auto_approve_roles,
        step_order: Number(form.step_order) || 1,
        priority: Number(form.priority) || 100,
        is_active: true,
      };
      if (edit) {
        const { error } = await supabase.from("authority_matrix").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("authority_matrix").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(edit ? "Rule updated" : "Rule created");
      qc.invalidateQueries({ queryKey: ["authority-matrix"] });
      setOpen(false);
      setEdit(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("authority_matrix").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["authority-matrix"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("authority_matrix").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["authority-matrix"] });
    },
  });

  const openEdit = (r: any) => {
    setEdit(r);
    setForm({
      scope: r.scope,
      rule_name: r.rule_name,
      description: r.description || "",
      approver_role: r.approver_role,
      min_amount: r.min_amount?.toString() || "",
      max_amount: r.max_amount?.toString() || "",
      min_duration_days: r.min_duration_days?.toString() || "",
      max_duration_days: r.max_duration_days?.toString() || "",
      auto_approve_roles: r.auto_approve_roles || [],
      step_order: r.step_order?.toString() || "1",
      priority: r.priority?.toString() || "100",
    });
    setOpen(true);
  };

  const filtered = filter === "all" ? rules : rules.filter((r: any) => r.scope === filter);

  const formatThreshold = (r: any) => {
    const parts: string[] = [];
    if (r.min_amount != null || r.max_amount != null) {
      const min = r.min_amount != null ? `≥${Number(r.min_amount).toLocaleString()}` : "";
      const max = r.max_amount != null ? `≤${Number(r.max_amount).toLocaleString()}` : "";
      parts.push(`${min}${min && max ? " & " : ""}${max} ETB`);
    }
    if (r.min_duration_days != null || r.max_duration_days != null) {
      const min = r.min_duration_days != null ? `≥${r.min_duration_days}` : "";
      const max = r.max_duration_days != null ? `≤${r.max_duration_days}` : "";
      parts.push(`${min}${min && max ? "-" : ""}${max} days`);
    }
    return parts.length ? parts.join(", ") : "Any";
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <strong>Authority Matrix</strong> defines who approves which requests. Rules are matched by scope, amount, and duration. Lower <em>priority</em> wins; <em>auto-approve roles</em> bypass approval entirely.
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({rules.length})
          </Button>
          {Object.entries(SCOPE_META).map(([key, meta]) => {
            const count = rules.filter((r: any) => r.scope === key).length;
            if (count === 0) return null;
            const Icon = meta.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key as Scope)}
                className="gap-1"
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label} ({count})
              </Button>
            );
          })}
        </div>
        <Button onClick={() => { setEdit(null); setForm(emptyForm); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Approval Rules
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Approver</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Auto-Approve</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No rules configured</TableCell></TableRow>
            ) : filtered.map((r: any) => {
              const meta = SCOPE_META[r.scope as Scope];
              const Icon = meta?.icon || Shield;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Icon className={`h-3 w-3 ${meta?.color || ""}`} />
                      {meta?.label || r.scope}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.rule_name}</div>
                    {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{r.approver_role.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatThreshold(r)}</TableCell>
                  <TableCell>
                    {r.auto_approve_roles?.length > 0 ? (
                      <div className="flex gap-1 flex-wrap max-w-[180px]">
                        {r.auto_approve_roles.slice(0, 2).map((role: string) => (
                          <Badge key={role} variant="outline" className="text-[10px] capitalize">{role.replace(/_/g, " ")}</Badge>
                        ))}
                        {r.auto_approve_roles.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">+{r.auto_approve_roles.length - 2}</Badge>
                        )}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{r.step_order}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive.mutate({ id: r.id, is_active: !r.is_active })}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEdit(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? "Edit Rule" : "Add Authority Rule"}</DialogTitle>
            <DialogDescription>
              Define when this rule applies and who must approve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scope *</Label>
                <Select value={form.scope} onValueChange={(v) => setForm(f => ({ ...f, scope: v as Scope }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCOPE_META).map(([k, m]) => (
                      <SelectItem key={k} value={k}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Approver Role *</Label>
                <Select value={form.approver_role} onValueChange={(v) => setForm(f => ({ ...f, approver_role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Rule Name *</Label>
              <Input
                value={form.rule_name}
                onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))}
                placeholder="e.g. Short trip (≤15 days)"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="When does this rule apply?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Min Amount (ETB)</Label>
                <Input type="number" value={form.min_amount} onChange={e => setForm(f => ({ ...f, min_amount: e.target.value }))} placeholder="No min" />
              </div>
              <div>
                <Label className="text-xs">Max Amount (ETB)</Label>
                <Input type="number" value={form.max_amount} onChange={e => setForm(f => ({ ...f, max_amount: e.target.value }))} placeholder="No max" />
              </div>
              <div>
                <Label className="text-xs">Min Duration (days)</Label>
                <Input type="number" value={form.min_duration_days} onChange={e => setForm(f => ({ ...f, min_duration_days: e.target.value }))} placeholder="No min" />
              </div>
              <div>
                <Label className="text-xs">Max Duration (days)</Label>
                <Input type="number" value={form.max_duration_days} onChange={e => setForm(f => ({ ...f, max_duration_days: e.target.value }))} placeholder="No max" />
              </div>
            </div>

            <div>
              <Label>Auto-Approve Roles (these roles skip approval at this scope)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-muted/30">
                {ALL_AUTO_ROLES.map(role => {
                  const checked = form.auto_approve_roles.includes(role);
                  return (
                    <label key={role} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setForm(f => ({
                          ...f,
                          auto_approve_roles: checked
                            ? f.auto_approve_roles.filter(r => r !== role)
                            : [...f.auto_approve_roles, role],
                        }))}
                      />
                      <span className="capitalize">{role.replace(/_/g, " ")}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Step Order</Label>
                <Input type="number" min="1" value={form.step_order} onChange={e => setForm(f => ({ ...f, step_order: e.target.value }))} />
                <div className="text-xs text-muted-foreground mt-1">1 = first approver in chain</div>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
                <div className="text-xs text-muted-foreground mt-1">Lower = checked first</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEdit(null); }}>Cancel</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.rule_name || !form.approver_role || save.isPending}
            >
              {save.isPending ? "Saving..." : edit ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

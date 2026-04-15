import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Users, Loader2, Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DelegationRulesConfig = () => {
  const { organizationId } = useOrganization();
  const { hasRole } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = hasRole("super_admin") || hasRole("operations_manager");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    delegator_name: "",
    delegator_id: "",
    delegate_name: "",
    delegate_id: "",
    scope: "work_orders" as string,
    cost_limit: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    activation_trigger: "manual" as string,
    reason: "",
    auto_activate: false,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["org-profiles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", organizationId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["delegation-rules", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delegation_rules")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const delegator = profiles.find(p => p.id === values.delegator_id);
      const delegate = profiles.find(p => p.id === values.delegate_id);
      if (!delegator || !delegate) throw new Error("Select valid users");
      
      const { error } = await supabase.from("delegation_rules").insert({
        organization_id: organizationId!,
        delegator_id: values.delegator_id,
        delegator_name: delegator.full_name || delegator.email,
        delegate_id: values.delegate_id,
        delegate_name: delegate.full_name || delegate.email,
        scope: values.scope,
        cost_limit: values.cost_limit ? parseFloat(values.cost_limit) : null,
        valid_from: values.valid_from,
        valid_until: values.valid_until || null,
        auto_activate: values.auto_activate,
        activation_trigger: values.activation_trigger,
        reason: values.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-rules"] });
      toast.success("Delegation rule created");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("delegation_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delegation-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delegation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegation-rules"] });
      toast.success("Rule removed");
    },
  });

  const isRuleActive = (rule: any) => {
    if (!rule.is_active) return false;
    const now = new Date();
    if (new Date(rule.valid_from) > now) return false;
    if (rule.valid_until && new Date(rule.valid_until) < now) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Delegation Rules
          </h3>
          <p className="text-sm text-muted-foreground">Configure who can delegate work orders and approvals, with time-based activation</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Delegation Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delegator (From)</Label>
                    <Select value={form.delegator_id} onValueChange={v => setForm(f => ({ ...f, delegator_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delegate (To)</Label>
                    <Select value={form.delegate_id} onValueChange={v => setForm(f => ({ ...f, delegate_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                      <SelectContent>
                        {profiles.filter(p => p.id !== form.delegator_id).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work_orders">Work Orders</SelectItem>
                        <SelectItem value="approvals">Approvals Only</SelectItem>
                        <SelectItem value="all">All (Full Delegation)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Limit (ETB)</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={form.cost_limit}
                      onChange={e => setForm(f => ({ ...f, cost_limit: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valid From</Label>
                    <Input
                      type="date"
                      value={form.valid_from}
                      onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid Until (optional)</Label>
                    <Input
                      type="date"
                      value={form.valid_until}
                      onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Activation Trigger</Label>
                    <Select value={form.activation_trigger} onValueChange={v => setForm(f => ({ ...f, activation_trigger: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="schedule">Scheduled (auto by dates)</SelectItem>
                        <SelectItem value="absence">On Absence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch
                      checked={form.auto_activate}
                      onCheckedChange={v => setForm(f => ({ ...f, auto_activate: v }))}
                    />
                    <Label className="text-sm">Auto-activate</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="e.g. Manager on annual leave..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending || !form.delegator_id || !form.delegate_id}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No delegation rules configured</p>
          <p className="text-sm mt-1">Set up rules to allow managers to delegate work orders and approvals</p>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegation</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Cost Limit</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="w-20">Status</TableHead>
                {canManage && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium">{rule.delegator_name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{rule.delegate_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">{rule.scope?.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.cost_limit ? `${Number(rule.cost_limit).toLocaleString()} ETB` : "Unlimited"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(rule.valid_from), "MMM d")}
                      {rule.valid_until ? ` — ${format(new Date(rule.valid_until), "MMM d, yyyy")}` : " — ∞"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {rule.activation_trigger || "manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={v => toggleMutation.mutate({ id: rule.id, is_active: v })}
                      />
                    ) : (
                      <Badge variant={isRuleActive(rule) ? "default" : "secondary"} className="text-[10px]">
                        {isRuleActive(rule) ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DelegationRulesConfig;

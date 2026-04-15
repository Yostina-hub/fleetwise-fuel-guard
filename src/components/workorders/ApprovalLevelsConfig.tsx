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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowUpDown, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "maintenance_lead", label: "Maintenance Lead" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "finance_officer", label: "Finance Officer" },
  { value: "super_admin", label: "Super Admin" },
];

const ApprovalLevelsConfig = () => {
  const { organizationId } = useOrganization();
  const { hasRole } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = hasRole("super_admin") || hasRole("operations_manager");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    level_name: "",
    role: "maintenance_lead",
    level_order: 1,
    cost_threshold_min: "0",
    cost_threshold_max: "999999",
    auto_approve_below: "0",
  });

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ["approval-levels", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_levels")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("level_order");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("approval_levels").insert({
        organization_id: organizationId!,
        level_name: values.level_name,
        role: values.role,
        level_order: values.level_order,
        cost_threshold_min: parseFloat(values.cost_threshold_min) || 0,
        cost_threshold_max: parseFloat(values.cost_threshold_max) || 999999,
        auto_approve_below: parseFloat(values.auto_approve_below) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-levels"] });
      toast.success("Approval level added");
      setDialogOpen(false);
      setForm({ level_name: "", role: "maintenance_lead", level_order: levels.length + 1, cost_threshold_min: "0", cost_threshold_max: "999999", auto_approve_below: "0" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("approval_levels").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-levels"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("approval_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-levels"] });
      toast.success("Level removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-primary" />
            Approval Hierarchy
          </h3>
          <p className="text-sm text-muted-foreground">Configure approval levels and cost thresholds for work orders</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Level
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Approval Level</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Level Name</Label>
                    <Input
                      value={form.level_name}
                      onChange={e => setForm(f => ({ ...f, level_name: e.target.value }))}
                      placeholder="e.g. Supervisor Approval"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order (Step #)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.level_order}
                      onChange={e => setForm(f => ({ ...f, level_order: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Required Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Min Cost (ETB)</Label>
                    <Input
                      type="number"
                      value={form.cost_threshold_min}
                      onChange={e => setForm(f => ({ ...f, cost_threshold_min: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Cost (ETB)</Label>
                    <Input
                      type="number"
                      value={form.cost_threshold_max}
                      onChange={e => setForm(f => ({ ...f, cost_threshold_max: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-approve below</Label>
                    <Input
                      type="number"
                      value={form.auto_approve_below}
                      onChange={e => setForm(f => ({ ...f, auto_approve_below: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.level_name}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Level
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
      ) : levels.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No approval levels configured</p>
          <p className="text-sm mt-1">Add levels to create a hierarchical approval chain for work orders</p>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Step</TableHead>
                <TableHead>Level Name</TableHead>
                <TableHead>Required Role</TableHead>
                <TableHead>Cost Range (ETB)</TableHead>
                <TableHead>Auto-Approve Below</TableHead>
                <TableHead className="w-20">Active</TableHead>
                {canManage && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.map((level: any) => (
                <TableRow key={level.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{level.level_order}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{level.level_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {ROLES.find(r => r.value === level.role)?.label || level.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {Number(level.cost_threshold_min).toLocaleString()} — {Number(level.cost_threshold_max).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {Number(level.auto_approve_below) > 0
                      ? `${Number(level.auto_approve_below).toLocaleString()} ETB`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={level.is_active}
                      onCheckedChange={v => toggleMutation.mutate({ id: level.id, is_active: v })}
                      disabled={!canManage}
                    />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(level.id)}
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

export default ApprovalLevelsConfig;

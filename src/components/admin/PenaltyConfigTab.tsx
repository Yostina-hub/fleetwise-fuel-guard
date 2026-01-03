import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePenaltyConfigs, PenaltyConfig } from "@/hooks/usePenalties";
import { useOrganization } from "@/hooks/useOrganization";
import { AlertTriangle, Plus, Edit2, Trash2, Zap, MapPin, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const violationTypes = [
  { value: "overspeed", label: "Overspeeding", icon: Zap },
  { value: "geofence_exit", label: "Geofence Exit", icon: MapPin },
  { value: "geofence_entry_unauthorized", label: "Unauthorized Entry", icon: Shield },
];

const severityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function PenaltyConfigTab() {
  const { configs, isLoading, updateConfig, createConfig, deleteConfig } = usePenaltyConfigs();
  const { organizationId } = useOrganization();
  const [editingConfig, setEditingConfig] = useState<PenaltyConfig | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({
    violation_type: "overspeed",
    severity: "medium",
    penalty_points: 10,
    monetary_fine: 100,
    speed_threshold_kmh: 20,
    warning_count_before_suspension: 3,
    suspension_days: 0,
    auto_apply: true,
    description: "",
    is_active: true,
  });

  const handleToggleActive = (config: PenaltyConfig) => {
    updateConfig.mutate({ id: config.id, is_active: !config.is_active });
  };

  const handleToggleAutoApply = (config: PenaltyConfig) => {
    updateConfig.mutate({ id: config.id, auto_apply: !config.auto_apply });
  };

  const handleSaveEdit = () => {
    if (!editingConfig) return;
    updateConfig.mutate(editingConfig);
    setEditingConfig(null);
  };

  const handleCreate = () => {
    if (!organizationId) return;
    createConfig.mutate({
      ...newConfig,
      organization_id: organizationId,
    } as any);
    setIsCreateOpen(false);
    setNewConfig({
      violation_type: "overspeed",
      severity: "medium",
      penalty_points: 10,
      monetary_fine: 100,
      speed_threshold_kmh: 20,
      warning_count_before_suspension: 3,
      suspension_days: 0,
      auto_apply: true,
      description: "",
      is_active: true,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this penalty configuration?")) {
      deleteConfig.mutate(id);
    }
  };

  const getViolationIcon = (type: string) => {
    const vt = violationTypes.find(v => v.value === type);
    return vt ? vt.icon : AlertTriangle;
  };

  const getViolationLabel = (type: string) => {
    const vt = violationTypes.find(v => v.value === type);
    return vt ? vt.label : type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Penalty Configurations
            </CardTitle>
            <CardDescription>
              Configure automatic penalties for driver violations
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Violation Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Auto Apply</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((config) => {
                const Icon = getViolationIcon(config.violation_type);
                return (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{getViolationLabel(config.violation_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityColors[config.severity]}>
                        {config.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{config.penalty_points}</TableCell>
                    <TableCell>${config.monetary_fine}</TableCell>
                    <TableCell>
                      {config.violation_type === 'overspeed' 
                        ? `+${config.speed_threshold_kmh} km/h`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.auto_apply}
                        onCheckedChange={() => handleToggleAutoApply(config)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={() => handleToggleActive(config)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingConfig(config)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!configs || configs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No penalty configurations found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Penalty Configuration</DialogTitle>
            <DialogDescription>
              Modify the penalty rules for this violation type
            </DialogDescription>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Penalty Points</Label>
                  <Input
                    type="number"
                    value={editingConfig.penalty_points}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      penalty_points: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monetary Fine ($)</Label>
                  <Input
                    type="number"
                    value={editingConfig.monetary_fine}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      monetary_fine: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
              {editingConfig.violation_type === 'overspeed' && (
                <div className="space-y-2">
                  <Label>Speed Threshold (km/h over limit)</Label>
                  <Input
                    type="number"
                    value={editingConfig.speed_threshold_kmh || 0}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      speed_threshold_kmh: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warnings Before Suspension</Label>
                  <Input
                    type="number"
                    value={editingConfig.warning_count_before_suspension}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      warning_count_before_suspension: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Suspension Days</Label>
                  <Input
                    type="number"
                    value={editingConfig.suspension_days}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      suspension_days: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingConfig.description || ""}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    description: e.target.value
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateConfig.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Penalty Rule</DialogTitle>
            <DialogDescription>
              Add a new automatic penalty configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Violation Type</Label>
                <Select
                  value={newConfig.violation_type}
                  onValueChange={(v) => setNewConfig({ ...newConfig, violation_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {violationTypes.map((vt) => (
                      <SelectItem key={vt.value} value={vt.value}>
                        {vt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={newConfig.severity}
                  onValueChange={(v) => setNewConfig({ ...newConfig, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Penalty Points</Label>
                <Input
                  type="number"
                  value={newConfig.penalty_points}
                  onChange={(e) => setNewConfig({
                    ...newConfig,
                    penalty_points: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monetary Fine ($)</Label>
                <Input
                  type="number"
                  value={newConfig.monetary_fine}
                  onChange={(e) => setNewConfig({
                    ...newConfig,
                    monetary_fine: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            {newConfig.violation_type === 'overspeed' && (
              <div className="space-y-2">
                <Label>Speed Threshold (km/h over limit)</Label>
                <Input
                  type="number"
                  value={newConfig.speed_threshold_kmh}
                  onChange={(e) => setNewConfig({
                    ...newConfig,
                    speed_threshold_kmh: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                placeholder="Describe this penalty rule..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newConfig.auto_apply}
                  onCheckedChange={(v) => setNewConfig({ ...newConfig, auto_apply: v })}
                />
                <Label>Auto Apply</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newConfig.is_active}
                  onCheckedChange={(v) => setNewConfig({ ...newConfig, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createConfig.isPending}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

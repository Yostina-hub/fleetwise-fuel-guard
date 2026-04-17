// Driver-facing Safety & Comfort report dialog. Now grounded in the
// official 3-group standard checklist (Group 1 standard, Group 2 heavy/field,
// Group 3 executive). Driver picks their vehicle group, marks any non-OK
// items, and the failing items become the structured payload of the report.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Shield, AlertTriangle } from "lucide-react";
import {
  VEHICLE_GROUPS, VEHICLE_GROUPS_MAP, CATEGORY_LABELS,
  ITEM_STATUS_OPTIONS, groupItemsByCategory, getItemStandard,
  type ChecklistCategory, type ItemStatus,
} from "@/lib/safety-comfort/standard-lists";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill?: Record<string, any>;
  onSubmitted?: (result?: Record<string, any>) => void;
}

const SEVERITY_OPTIONS = [
  { value: "low",      label: "Low — comfort only" },
  { value: "medium",   label: "Medium — minor safety" },
  { value: "high",     label: "High — affects safe operation" },
  { value: "critical", label: "Critical — vehicle must be grounded" },
];

const CATEGORY_TABS: ChecklistCategory[] = [
  "fleet_safety_material",
  "vehicle_helping_tools",
  "vehicle_accessories",
  "vehicle_comfort_materials",
];

export default function SafetyComfortReportDialog({ open, onOpenChange, prefill, onSubmitted }: Props) {
  const { organizationId } = useOrganization();
  const { user, profile } = useAuth() as any;
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState<string>(prefill?.vehicle_id || "");
  const [vehicleGroup, setVehicleGroup] = useState<string>(prefill?.vehicle_group || "group_one");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<ChecklistCategory>("fleet_safety_material");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organizationId || !open) return;
    supabase
      .from("vehicles")
      .select("id, plate_number, make, model")
      .eq("organization_id", organizationId)
      .order("plate_number")
      .then(({ data }) => setVehicles(data || []));
  }, [organizationId, open]);

  useEffect(() => {
    if (open && prefill?.vehicle_id) setVehicleId(prefill.vehicle_id);
  }, [open, prefill]);

  const group = VEHICLE_GROUPS_MAP[vehicleGroup];
  const grouped = useMemo(() => groupItemsByCategory(group), [group]);

  const flaggedItems = useMemo(() => {
    return group.items
      .filter(i => itemStatuses[i.key] && itemStatuses[i.key] !== "ok")
      .map(i => {
        const std = getItemStandard(i.key);
        return {
          key: i.key,
          label: i.label,
          category: i.category,
          critical: !!i.critical,
          status: itemStatuses[i.key],
          note: itemNotes[i.key] || "",
          required_qty: std.requiredQty,
          usability_period: std.usabilityPeriod,
          standard_remark: std.remark,
        };
      });
  }, [group, itemStatuses, itemNotes]);

  const hasCriticalIssue = flaggedItems.some(i => i.critical);
  // Auto-elevate severity if a critical item is missing/damaged
  const effectiveSeverity = hasCriticalIssue && severity !== "critical" ? "critical" : severity;

  const flaggedByCategory = useMemo(() => {
    const out: Record<ChecklistCategory, number> = {
      fleet_safety_material: 0, vehicle_helping_tools: 0,
      vehicle_accessories: 0, vehicle_comfort_materials: 0,
    };
    for (const f of flaggedItems) out[f.category]++;
    return out;
  }, [flaggedItems]);

  const handleSubmit = async () => {
    if (!organizationId || !vehicleId || !title) {
      toast.error("Vehicle and title are required");
      return;
    }
    if (flaggedItems.length === 0 && !description.trim()) {
      toast.error("Mark at least one item or describe an issue");
      return;
    }
    setSaving(true);
    try {
      const { data: refRes, error: refErr } = await supabase.rpc("generate_workflow_reference", {
        _org_id: organizationId,
        _workflow_type: "safety_comfort",
      });
      if (refErr) throw refErr;

      const data = {
        title,
        vehicle_group: vehicleGroup,
        vehicle_group_label: group.label,
        severity: effectiveSeverity,
        severity_auto_escalated: effectiveSeverity !== severity,
        location_on_vehicle: location,
        description,
        flagged_items: flaggedItems,
        flagged_count: flaggedItems.length,
        critical_count: flaggedItems.filter(i => i.critical).length,
        category: flaggedItems[0]?.category || "other",
        reported_by_name: profile?.full_name || user?.email || "Unknown",
        intake_source: "driver_quick_form",
      };

      const { data: inst, error } = await supabase
        .from("workflow_instances")
        .insert({
          organization_id: organizationId,
          workflow_type: "safety_comfort",
          reference_number: refRes as string,
          title,
          description: description || `${flaggedItems.length} item(s) flagged on ${group.label}`,
          current_stage: "report",
          current_lane: "driver",
          status: "in_progress",
          priority: effectiveSeverity === "critical" || effectiveSeverity === "high" ? "high" : "normal",
          vehicle_id: vehicleId,
          created_by: user?.id || null,
          data,
          documents: [],
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("workflow_transitions").insert({
        organization_id: organizationId,
        instance_id: inst.id,
        workflow_type: "safety_comfort",
        from_stage: null,
        to_stage: "report",
        from_lane: null,
        to_lane: "driver",
        decision: "create",
        notes: `Filed via driver quick form (${flaggedItems.length} flagged)`,
        performed_by: user?.id || null,
        performed_by_name: profile?.full_name || user?.email || "Unknown",
        payload: data,
      });

      toast.success("Safety & Comfort report filed");
      onSubmitted?.({ workflow_instance_id: inst.id });
      onOpenChange(false);
      setTitle(""); setLocation(""); setDescription(""); setSeverity("medium");
      setItemStatuses({}); setItemNotes({});
    } catch (e: any) {
      toast.error(e?.message || "Failed to file report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Safety & Comfort Report
          </DialogTitle>
          <DialogDescription>
            File a report against the official safety & comfort standard checklist for your vehicle group. Critical missing items are auto-escalated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 overflow-hidden flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vehicle *</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Group (Standard) *</Label>
              <Select value={vehicleGroup} onValueChange={setVehicleGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_GROUPS.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Pre-trip checklist failed" />
            </div>
            <div className="space-y-1.5">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasCriticalIssue && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Critical safety item flagged — severity will be escalated to <b>Critical</b>.</span>
            </div>
          )}

          <div className="space-y-1.5 flex-1 flex flex-col overflow-hidden">
            <Label>Standard Checklist — {group.label}</Label>
            <p className="text-xs text-muted-foreground">{group.description} Mark any item that isn't OK.</p>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChecklistCategory)} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-4 h-auto">
                {CATEGORY_TABS.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="text-xs flex flex-col gap-0.5 py-2">
                    <span>{CATEGORY_LABELS[cat]}</span>
                    {flaggedByCategory[cat] > 0 && (
                      <Badge variant="destructive" className="h-4 text-[10px] px-1">{flaggedByCategory[cat]}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {CATEGORY_TABS.map(cat => (
                <TabsContent key={cat} value={cat} className="flex-1 overflow-hidden mt-2">
                  <ScrollArea className="h-[260px] rounded-md border">
                    <div className="divide-y">
                      {grouped[cat].map(item => {
                        const status = itemStatuses[item.key];
                        const flagged = status && status !== "ok";
                        const std = getItemStandard(item.key);
                        return (
                          <div key={item.key} className={`p-2.5 grid grid-cols-12 gap-2 items-center ${flagged ? "bg-destructive/5" : ""}`}>
                            <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                              <span className="text-sm truncate">{item.label}</span>
                              {item.critical && <Badge variant="outline" className="text-[10px] h-4 shrink-0">Critical</Badge>}
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="text-muted-foreground hover:text-foreground shrink-0">
                                      <Info className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs text-xs">
                                    <div className="space-y-1">
                                      <div><b>Required Qty:</b> {std.requiredQty}</div>
                                      <div><b>Usability:</b> {std.usabilityPeriod}</div>
                                      <div className="text-muted-foreground">{std.remark}</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="col-span-3 text-[11px] text-muted-foreground truncate" title={std.usabilityPeriod}>
                              {std.usabilityPeriod}
                            </div>
                            <div className="col-span-2">
                              <Select value={status || ""} onValueChange={(v) => setItemStatuses(s => ({ ...s, [item.key]: v as ItemStatus }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="OK" /></SelectTrigger>
                                <SelectContent>
                                  {ITEM_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              {flagged && (
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Note"
                                  value={itemNotes[item.key] || ""}
                                  onChange={e => setItemNotes(n => ({ ...n, [item.key]: e.target.value }))}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location on vehicle</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Driver-side door, rear bumper" />
            </div>
            <div className="space-y-1.5">
              <Label>Additional description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={1} placeholder="Optional context..." />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex-1 text-xs text-muted-foreground">
            {flaggedItems.length > 0
              ? <>{flaggedItems.length} item(s) flagged{hasCriticalIssue ? <> · <span className="text-destructive font-medium">{flaggedItems.filter(i => i.critical).length} critical</span></> : null}</>
              : "No items flagged yet"}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Filing…" : "File report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

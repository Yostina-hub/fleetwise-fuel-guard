import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, ArrowRight, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_TYPES = ["acquired", "deployed", "transferred", "maintenance", "repaired", "inspected", "idle", "retired", "disposed", "revalued"];

export default function AssetLifecycleTab() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ asset_id: "", event_type: "deployed", from_stage: "", to_stage: "", performed_by: "", cost: "", notes: "" });

  const { data: assets = [] } = useQuery({
    queryKey: ["fleet-assets", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("fleet_assets").select("id, asset_code, name, lifecycle_stage").eq("organization_id", organizationId!).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["asset-lifecycle", organizationId, selectedAsset],
    queryFn: async () => {
      let query = (supabase as any).from("asset_lifecycle_events").select("*, fleet_assets(asset_code, name)").eq("organization_id", organizationId!).order("event_date", { ascending: false }).limit(200);
      if (selectedAsset !== "all") query = query.eq("asset_id", selectedAsset);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const asset = assets.find((a: any) => a.id === form.asset_id);
      const { error } = await (supabase as any).from("asset_lifecycle_events").insert({
        organization_id: organizationId,
        asset_id: form.asset_id,
        event_type: form.event_type,
        from_stage: asset?.lifecycle_stage || form.from_stage || null,
        to_stage: form.to_stage || null,
        performed_by: form.performed_by || null,
        cost: form.cost ? parseFloat(form.cost) : 0,
        notes: form.notes || null,
      });
      if (error) throw error;
      // Update asset stage if to_stage provided
      if (form.to_stage) {
        await (supabase as any).from("fleet_assets").update({ lifecycle_stage: form.to_stage }).eq("id", form.asset_id);
      }
    },
    onSuccess: () => {
      toast.success("Lifecycle event recorded");
      queryClient.invalidateQueries({ queryKey: ["asset-lifecycle"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-assets"] });
      setShowAdd(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const eventColor = (type: string) => {
    const m: Record<string, string> = {
      acquired: "bg-blue-500/10 text-blue-600", deployed: "bg-success/10 text-success",
      maintenance: "bg-warning/10 text-warning", retired: "bg-destructive/10 text-destructive",
      disposed: "bg-destructive/10 text-destructive", revalued: "bg-primary/10 text-primary",
    };
    return m[type] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-60 h-9"><SelectValue placeholder="Filter by asset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            {assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 h-9"><Plus className="w-4 h-4" />Record Event</Button>
      </div>

      <Card className="p-4">
        <ScrollArea className="max-h-[500px]">
          {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> :
          events.length === 0 ? <p className="text-center py-8 text-muted-foreground">No lifecycle events recorded</p> : (
            <div className="space-y-3">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{e.fleet_assets?.asset_code} - {e.fleet_assets?.name}</p>
                      <Badge variant="outline" className={cn("text-xs capitalize", eventColor(e.event_type))}>{e.event_type}</Badge>
                    </div>
                    {(e.from_stage || e.to_stage) && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{e.from_stage?.replace("_", " ") || "—"}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="capitalize font-medium text-foreground">{e.to_stage?.replace("_", " ") || "—"}</span>
                      </div>
                    )}
                    {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(e.event_date), "MMM d, yyyy HH:mm")}</span>
                      {e.performed_by && <span>by {e.performed_by}</span>}
                      {e.cost > 0 && <span className="font-medium text-foreground">{e.cost.toLocaleString()} ETB</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Lifecycle Event</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Asset *</Label>
              <Select value={form.asset_id} onValueChange={v => setForm(p => ({ ...p, asset_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Event Type</Label>
              <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>To Stage</Label>
              <Select value={form.to_stage} onValueChange={v => setForm(p => ({ ...p, to_stage: v }))}>
                <SelectTrigger><SelectValue placeholder="New stage" /></SelectTrigger>
                <SelectContent>{["acquired", "deployed", "in_service", "maintenance", "idle", "retired", "disposed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Performed By</Label><Input value={form.performed_by} onChange={e => setForm(p => ({ ...p, performed_by: e.target.value }))} /></div>
            <div><Label>Cost (ETB)</Label><Input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.asset_id || addMutation.isPending}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

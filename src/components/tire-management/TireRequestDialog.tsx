import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const POSITIONS = ["Front Left", "Front Right", "Rear Left Outer", "Rear Left Inner", "Rear Right Outer", "Rear Right Inner", "Spare"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface LineItem {
  position: string;
  tire_size: string;
  preferred_brand: string;
  preferred_model: string;
  notes: string;
}

const emptyItem = (): LineItem => ({ position: "", tire_size: "", preferred_brand: "", preferred_model: "", notes: "" });

export const TireRequestDialog = ({ open, onOpenChange }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { user, profile } = useAuthContext() as any;
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [header, setHeader] = useState({
    vehicle_id: "",
    driver_id: "",
    request_type: "replacement",
    priority: "normal",
    reason: "",
    notes: "",
    estimated_cost: "",
  });
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const reset = () => {
    setMode("single");
    setHeader({ vehicle_id: "", driver_id: "", request_type: "replacement", priority: "normal", reason: "", notes: "", estimated_cost: "" });
    setItems([emptyItem()]);
  };

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: async () => {
      const activeItems = (mode === "single" ? items.slice(0, 1) : items).filter(it => it.position);
      if (activeItems.length === 0) throw new Error("At least one position is required");
      if (!header.vehicle_id) throw new Error("Vehicle is required");

      const { data: req, error: reqErr } = await supabase
        .from("tire_requests")
        .insert({
          organization_id: organizationId!,
          vehicle_id: header.vehicle_id,
          driver_id: header.driver_id || null,
          requested_by: user?.id || null,
          requested_by_name: profile?.full_name || user?.email || null,
          requested_by_role: profile?.role || null,
          request_type: header.request_type,
          priority: header.priority,
          reason: header.reason || null,
          notes: header.notes || null,
          estimated_cost: header.estimated_cost ? parseFloat(header.estimated_cost) : null,
          status: "pending",
        } as any)
        .select()
        .single();
      if (reqErr) throw reqErr;

      const itemsPayload = activeItems.map(it => ({
        organization_id: organizationId!,
        request_id: req.id,
        position: it.position,
        tire_size: it.tire_size || null,
        preferred_brand: it.preferred_brand || null,
        preferred_model: it.preferred_model || null,
        notes: it.notes || null,
      }));
      const { error: itemsErr } = await supabase.from("tire_request_items").insert(itemsPayload as any);
      if (itemsErr) throw itemsErr;

      // After items are inserted, the trigger has set iproc_return_status.
      // If any item still requires return, move header to awaiting_return.
      const { data: createdItems } = await supabase
        .from("tire_request_items")
        .select("iproc_return_status")
        .eq("request_id", req.id);
      const needsReturn = (createdItems || []).some((i: any) => i.iproc_return_status === "pending");
      if (needsReturn) {
        await supabase.from("tire_requests").update({ status: "awaiting_return" }).eq("id", req.id);
      }
      return req;
    },
    onSuccess: () => {
      toast.success("Tire request submitted");
      queryClient.invalidateQueries({ queryKey: ["tire-requests"] });
      onOpenChange(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Tire Request</DialogTitle>
          <DialogDescription>
            Submit a request to the maintenance group. Approval requires the previous tire to be returned to the warehouse (iPROC).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={header.vehicle_id} onValueChange={v => setHeader(h => ({ ...h, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Request Type</Label>
              <Select value={header.request_type} onValueChange={v => setHeader(h => ({ ...h, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="rotation">Rotation</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="new_install">New Install</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={header.priority} onValueChange={v => setHeader(h => ({ ...h, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated Cost (ETB)</Label>
              <Input type="number" value={header.estimated_cost} onChange={e => setHeader(h => ({ ...h, estimated_cost: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Input value={header.reason} onChange={e => setHeader(h => ({ ...h, reason: e.target.value }))} placeholder="Worn out, puncture, scheduled rotation, etc." />
          </div>

          <Tabs value={mode} onValueChange={(v) => { setMode(v as any); if (v === "single") setItems(prev => prev.slice(0, 1)); }}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="single">Single Position</TabsTrigger>
              <TabsTrigger value="batch">Batch (multiple)</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-3">
              <ItemFields item={items[0]} onChange={(p) => updateItem(0, p)} />
            </TabsContent>

            <TabsContent value="batch" className="mt-3 space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(idx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <ItemFields item={it} onChange={(p) => updateItem(idx, p)} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-2" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Add another position
              </Button>
            </TabsContent>
          </Tabs>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={header.notes} onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!header.vehicle_id || mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function ItemFields({ item, onChange }: { item: LineItem; onChange: (p: Partial<LineItem>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Position *</Label>
          <Select value={item.position} onValueChange={v => onChange({ position: v })}>
            <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
            <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tire Size</Label>
          <Input value={item.tire_size} onChange={e => onChange({ tire_size: e.target.value })} placeholder="e.g. 315/80R22.5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Preferred Brand</Label>
          <Input value={item.preferred_brand} onChange={e => onChange({ preferred_brand: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Preferred Model</Label>
          <Input value={item.preferred_model} onChange={e => onChange({ preferred_model: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Item Notes</Label>
        <Input value={item.notes} onChange={e => onChange({ notes: e.target.value })} />
      </div>
    </div>
  );
}

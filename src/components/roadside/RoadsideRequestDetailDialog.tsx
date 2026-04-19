import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Phone, MapPin, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: any | null;
}

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any }[]> = {
  requested:  [{ next: "dispatched", label: "Dispatch provider", icon: Truck }, { next: "cancelled", label: "Cancel", icon: XCircle }],
  dispatched: [{ next: "en_route", label: "Provider en route", icon: Clock }, { next: "cancelled", label: "Cancel", icon: XCircle }],
  en_route:   [{ next: "on_site", label: "Arrived on site", icon: MapPin }],
  on_site:    [{ next: "resolved", label: "Mark resolved", icon: CheckCircle2 }],
  resolved:   [],
  cancelled:  [],
};

export const RoadsideRequestDetailDialog = ({ open, onOpenChange, request }: Props) => {
  const qc = useQueryClient();
  const [serviceProvider, setServiceProvider] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [eta, setEta] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actualCost, setActualCost] = useState("");

  useEffect(() => {
    if (request) {
      setServiceProvider(request.service_provider || "");
      setProviderPhone(request.provider_phone || "");
      setEta(request.provider_eta_minutes?.toString() || "");
      setResolutionNotes(request.resolution_notes || "");
      setActualCost(request.actual_cost?.toString() || "");
    }
  }, [request]);

  const transition = useMutation({
    mutationFn: async (nextStatus: string) => {
      if (!request) return;
      const updates: any = { status: nextStatus };
      if (nextStatus === "dispatched") {
        updates.responded_at = new Date().toISOString();
        updates.service_provider = serviceProvider || null;
        updates.provider_phone = providerPhone || null;
        updates.provider_eta_minutes = eta ? parseInt(eta) : null;
      }
      if (nextStatus === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolution_notes = resolutionNotes || null;
        updates.actual_cost = actualCost ? parseFloat(actualCost) : null;
      }
      const { error } = await supabase.from("roadside_assistance_requests").update(updates).eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: (_, nextStatus) => {
      toast.success(`Status updated to ${nextStatus.replace(/_/g, " ")}`);
      qc.invalidateQueries({ queryKey: ["roadside-assistance"] });
      if (["resolved", "cancelled"].includes(nextStatus)) onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const saveDetails = useMutation({
    mutationFn: async () => {
      if (!request) return;
      const { error } = await supabase.from("roadside_assistance_requests").update({
        service_provider: serviceProvider || null,
        provider_phone: providerPhone || null,
        provider_eta_minutes: eta ? parseInt(eta) : null,
      }).eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider details saved");
      qc.invalidateQueries({ queryKey: ["roadside-assistance"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  if (!request) return null;
  const actions = STATUS_FLOW[request.status] || [];
  const isTerminal = ["resolved", "cancelled"].includes(request.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{request.request_number}</span>
            <Badge variant={request.priority === "critical" || request.priority === "high" ? "destructive" : "outline"}>{request.priority}</Badge>
            <Badge>{request.status.replace(/_/g, " ")}</Badge>
          </DialogTitle>
          <DialogDescription>
            {request.vehicles?.plate_number} • {request.breakdown_type?.replace(/_/g, " ")} • Requested {format(new Date(request.requested_at), "MMM dd, HH:mm")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Vehicle:</span> {request.vehicles?.plate_number} {request.vehicles?.make}</div>
            <div><span className="text-muted-foreground">Driver:</span> {request.drivers ? `${request.drivers.first_name} ${request.drivers.last_name}` : "—"}</div>
            <div><span className="text-muted-foreground">Tow required:</span> {request.tow_required ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground">Estimated cost:</span> {request.estimated_cost ? `${request.estimated_cost} ETB` : "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {request.location_name || "—"} {request.lat && `(${request.lat.toFixed(4)}, ${request.lng.toFixed(4)})`}</div>
            {request.description && <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {request.description}</div>}
          </div>

          {!isTerminal && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Provider Dispatch</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Service Provider</Label>
                    <Input value={serviceProvider} onChange={e => setServiceProvider(e.target.value)} placeholder="Provider name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Provider Phone</Label>
                    <Input value={providerPhone} onChange={e => setProviderPhone(e.target.value)} placeholder="+251..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ETA (minutes)</Label>
                    <Input type="number" value={eta} onChange={e => setEta(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    {providerPhone && (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a href={`tel:${providerPhone}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending}>
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {(request.status === "on_site" || request.status === "en_route") && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Resolution</h4>
                <div className="space-y-1.5">
                  <Label>Resolution Notes</Label>
                  <Textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={2} placeholder="What was done to resolve the issue..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Cost (ETB)</Label>
                  <Input type="number" value={actualCost} onChange={e => setActualCost(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {isTerminal && (
            <>
              <Separator />
              <div className="text-sm space-y-2">
                {request.resolved_at && <div><span className="text-muted-foreground">Resolved at:</span> {format(new Date(request.resolved_at), "MMM dd, HH:mm")}</div>}
                {request.resolution_notes && <div><span className="text-muted-foreground">Notes:</span> {request.resolution_notes}</div>}
                {request.actual_cost != null && <div><span className="text-muted-foreground">Final cost:</span> {request.actual_cost} ETB</div>}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button
                key={a.next}
                variant={a.next === "cancelled" ? "destructive" : a.next === "resolved" ? "default" : "secondary"}
                onClick={() => transition.mutate(a.next)}
                disabled={transition.isPending}
              >
                {transition.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Icon className="h-4 w-4 mr-2" />}
                {a.label}
              </Button>
            );
          })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

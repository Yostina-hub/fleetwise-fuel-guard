/**
 * IncidentDispatchDecisionDialog
 * ------------------------------
 * Operator-side decision panel for an open driver-reported incident.
 *
 * Three exclusive actions wired to the `dispatch_incident_decision` RPC:
 *   • Allow Continue           — driver resumes the trip; just notifies them.
 *   • Assign Replacement       — pick an available vehicle and/or driver; the
 *                                trip's `vehicle_requests` row is re-pointed
 *                                atomically and both drivers are notified.
 *   • Escalate to Emergency    — opens an urgent `incident_tickets` row routed
 *                                to the operations manager; bumps incident to
 *                                critical and notifies the driver to stay safe.
 *
 * The dialog only loads available vehicles/drivers when the operator picks
 * the replacement path — keeping the common "approve continue" case instant.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ShieldAlert,
  Repeat,
  Loader2,
  AlertTriangle,
  Phone,
  Car,
  User,
} from "lucide-react";

export interface IncidentDecisionTarget {
  id: string;
  incident_number: string;
  vehicle_id: string | null;
  driver_id: string | null;
  trip_id: string | null;
  can_continue: string | null;
  requested_assistance: string[] | null;
  description: string | null;
  vehicles?: { plate_number: string | null; make: string | null; model: string | null } | null;
  drivers?: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incident: IncidentDecisionTarget | null;
}

type Decision = "continue" | "replacement" | "emergency";

const DECISION_LABEL: Record<Decision, string> = {
  continue: "Allow Continue",
  replacement: "Assign Replacement",
  emergency: "Escalate to Emergency",
};

export default function IncidentDispatchDecisionDialog({
  open,
  onOpenChange,
  incident,
}: Props) {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [decision, setDecision] = useState<Decision>("continue");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Pre-select decision based on the driver's self-assessment so the operator
  // lands on the most likely action automatically.
  useEffect(() => {
    if (!open || !incident) return;
    if (incident.can_continue === "emergency") setDecision("emergency");
    else if (incident.can_continue === "no") setDecision("replacement");
    else setDecision("continue");
    setVehicleId("");
    setDriverId("");
    setNotes("");
  }, [open, incident]);

  // Available vehicles — only fetched once the operator picks "replacement"
  // so the modal is fast for the common cases.
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["incident-replacement-vehicles", organizationId, incident?.vehicle_id],
    enabled: open && decision === "replacement" && !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicles")
        .select("id, plate_number, make, model, status")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .neq("id", incident?.vehicle_id ?? "00000000-0000-0000-0000-000000000000")
        .order("plate_number")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["incident-replacement-drivers", organizationId, incident?.driver_id],
    enabled: open && decision === "replacement" && !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("drivers")
        .select("id, first_name, last_name, phone, status")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .neq("id", incident?.driver_id ?? "00000000-0000-0000-0000-000000000000")
        .order("first_name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!incident) throw new Error("No incident");
      if (decision === "replacement" && (!vehicleId || !driverId)) {
        throw new Error("Pick both a replacement vehicle and driver");
      }
      const { data, error } = await (supabase as any).rpc(
        "dispatch_incident_decision",
        {
          p_incident_id: incident.id,
          p_decision: decision,
          p_replacement_vehicle: vehicleId || null,
          p_replacement_driver: driverId || null,
          p_notes: notes.trim() || null,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(
        decision === "continue"
          ? "Driver cleared to continue"
          : decision === "replacement"
            ? "Replacement assigned and driver notified"
            : "Emergency response activated",
      );
      qc.invalidateQueries({ queryKey: ["operator-inbox-incidents"] });
      qc.invalidateQueries({ queryKey: ["operator-inbox-counts"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Decision failed"),
  });

  const driverFullName = useMemo(() => {
    if (!incident?.drivers) return null;
    return `${incident.drivers.first_name ?? ""} ${incident.drivers.last_name ?? ""}`.trim() || null;
  }, [incident]);

  const requestedAssistance = incident?.requested_assistance ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" aria-hidden="true" />
            Dispatch decision · {incident?.incident_number}
          </DialogTitle>
          <DialogDescription>
            Decide how to handle this incident — keep the driver moving, swap
            in a replacement, or activate emergency response.
          </DialogDescription>
        </DialogHeader>

        {/* Driver self-assessment summary */}
        <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Driver:</span>
            <span className="font-medium">{driverFullName ?? "—"}</span>
            {incident?.drivers?.phone && (
              <a
                href={`tel:${incident.drivers.phone}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="w-3 h-3" aria-hidden="true" />
                {incident.drivers.phone}
              </a>
            )}
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-muted-foreground">Vehicle:</span>
            <span className="font-medium">
              {incident?.vehicles?.plate_number ?? "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Self-assessment:</span>
            {incident?.can_continue === "yes" && (
              <Badge className="bg-success/15 text-success border-success/30">
                Can continue
              </Badge>
            )}
            {incident?.can_continue === "no" && (
              <Badge className="bg-warning/15 text-warning border-warning/30">
                Cannot continue
              </Badge>
            )}
            {incident?.can_continue === "emergency" && (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
                Emergency
              </Badge>
            )}
            {!incident?.can_continue && (
              <span className="italic text-muted-foreground">Not provided</span>
            )}
          </div>
          {requestedAssistance.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Asked for:</span>
              {requestedAssistance.map((a) => (
                <Badge key={a} variant="outline" className="text-[10px]">
                  {a.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Decision selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Decision</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(["continue", "replacement", "emergency"] as Decision[]).map((d) => {
              const active = decision === d;
              const Icon = d === "continue" ? CheckCircle2 : d === "replacement" ? Repeat : ShieldAlert;
              const tone =
                d === "continue"
                  ? "border-success/40 bg-success/5 text-success"
                  : d === "replacement"
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-destructive/40 bg-destructive/5 text-destructive";
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDecision(d)}
                  className={`rounded-lg border p-2.5 text-left text-xs transition ${
                    active ? tone : "border-border hover:bg-muted/50"
                  }`}
                  aria-pressed={active}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {DECISION_LABEL[d]}
                  </div>
                  <p className="mt-1 text-muted-foreground leading-snug">
                    {d === "continue"
                      ? "Driver resumes — no swap."
                      : d === "replacement"
                        ? "Pick a vehicle/driver to take over the trip."
                        : "Activate emergency response queue."}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {decision === "replacement" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Car className="w-3 h-3" aria-hidden="true" />
                Replacement vehicle
              </Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={vehiclesLoading ? "Loading…" : "Select vehicle"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number}
                      {v.make ? ` · ${v.make} ${v.model ?? ""}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <User className="w-3 h-3" aria-hidden="true" />
                Replacement driver
              </Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={driversLoading ? "Loading…" : "Select driver"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name ?? ""}
                      {d.phone ? ` · ${d.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="md:col-span-2 text-[11px] text-muted-foreground">
              Both a replacement vehicle and driver are required. The active
              trip will be re-assigned and both drivers will be notified
              instantly.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="dec-notes" className="text-sm">
            Notes for the driver {decision === "emergency" && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="dec-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder={
              decision === "continue"
                ? "Optional note (visible to the driver)…"
                : decision === "replacement"
                  ? "ETA, instructions for the swap…"
                  : "What's happening, who is responding, what to do next…"
            }
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submit.isPending}
          >
            Cancel
          </Button>
          <Button
            variant={decision === "emergency" ? "destructive" : "default"}
            disabled={
              submit.isPending ||
              (decision === "replacement" && !vehicleId && !driverId) ||
              (decision === "emergency" && notes.trim().length < 5)
            }
            onClick={() => submit.mutate()}
          >
            {submit.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            )}
            Confirm · {DECISION_LABEL[decision]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

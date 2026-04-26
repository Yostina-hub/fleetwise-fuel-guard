/**
 * EditRequestDialog
 * -----------------
 * Lightweight in-place edit for vehicle requests that haven't been approved
 * yet (and for rejected requests, which become a "fix & resubmit" flow).
 *
 * Editable here intentionally covers the high-churn fields that requesters
 * actually want to fix without re-doing the whole 5-tab form:
 *   - Trip description (purpose)
 *   - Departure place + Destination
 *   - Times (date / start / end)
 *   - Passengers + Cargo size
 *   - Priority + Contact phone
 *
 * Anything structural (request type, vehicle class, multi-stop waypoints,
 * project number) requires using the full form — we point users there.
 *
 * Allowed statuses:
 *   - "pending"   → save updates, status unchanged
 *   - "rejected"  → save updates AND flip status back to "pending"
 *                   (resubmit), clearing rejection reason & approval state
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, RotateCcw, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CARGO_LOAD_OPTIONS } from "@/lib/vehicle-requests/vehicleClassRecommendation";
import {
  sanitizeShortText,
  sanitizeText,
  sanitizePhone,
  validateVehicleRequestForm,
  type VRFormValues,
} from "./vehicleRequestValidation";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
}

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const EditRequestDialog = ({ request, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const isRejected = request.status === "rejected";
  const isPending = request.status === "pending";
  const editable = isPending || isRejected;

  const dateStr = (v: any) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    purpose: request.purpose || "",
    departure_place: request.departure_place || "",
    destination: request.destination || "",
    date: dateStr(request.requested_date),
    start_time: request.start_time || "",
    end_time: request.end_time || "",
    passengers: String(request.passengers ?? 1),
    cargo_load: request.cargo_load || "",
    priority: request.priority || "normal",
    contact_phone: request.contact_phone || "",
    edit_reason: "",
  });

  // Reset when request changes
  useEffect(() => {
    if (!open) return;
    setForm({
      purpose: request.purpose || "",
      departure_place: request.departure_place || "",
      destination: request.destination || "",
      date: dateStr(request.requested_date),
      start_time: request.start_time || "",
      end_time: request.end_time || "",
      passengers: String(request.passengers ?? 1),
      cargo_load: request.cargo_load || "",
      priority: request.priority || "normal",
      contact_phone: request.contact_phone || "",
      edit_reason: "",
    });
  }, [request.id, open]);

  const update = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editable) throw new Error("This request can no longer be edited");

      // Run the same per-field validators the create form uses, but only
      // for the fields we expose here.
      const ctx: VRFormValues = {
        request_type: request.request_type,
        date: form.date ? new Date(form.date) : null,
        start_time: form.start_time,
        end_time: form.end_time,
        departure_place: form.departure_place,
        destination: form.destination,
        passengers: form.passengers,
        cargo_load: (form.cargo_load || "none") as any,
        purpose: form.purpose,
        priority: form.priority,
        contact_phone: form.contact_phone,
        num_vehicles: request.num_vehicles ?? 1,
        vehicle_type: request.vehicle_type || "",
      };
      const { errors } = validateVehicleRequestForm(ctx);
      // Only surface errors for fields we're actually editing.
      const editedFields = [
        "purpose",
        "departure_place",
        "destination",
        "date",
        "start_time",
        "end_time",
        "passengers",
        "contact_phone",
      ] as const;
      const firstError = editedFields.map((f) => errors[f]).find(Boolean);
      if (firstError) throw new Error(firstError);
      if (!form.cargo_load)
        throw new Error("Pick a cargo size — choose 'None' if passengers only.");
      if (isRejected && !form.edit_reason.trim())
        throw new Error("Please describe what you changed before resubmitting.");

      const user = (await supabase.auth.getUser()).data.user;

      const updates: Record<string, any> = {
        purpose: sanitizeText(form.purpose),
        departure_place: sanitizeShortText(form.departure_place) || null,
        destination: sanitizeShortText(form.destination) || null,
        requested_date: form.date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        passengers: Number(form.passengers) || 1,
        cargo_load: form.cargo_load || null,
        priority: form.priority || "normal",
        contact_phone: sanitizePhone(form.contact_phone) || null,
        updated_at: new Date().toISOString(),
      };

      // Resubmit: clear rejection, flip back to pending.
      if (isRejected) {
        updates.status = "pending";
        updates.rejection_reason = null;
        updates.rejected_at = null;
        updates.rejected_by = null;
        updates.resubmitted_at = new Date().toISOString();
        updates.resubmission_notes = sanitizeText(form.edit_reason);
      }

      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(updates)
        .eq("id", request.id);
      if (error) throw error;

      // Audit
      try {
        await (supabase as any).from("audit_logs").insert({
          organization_id: request.organization_id,
          user_id: user?.id,
          action: isRejected ? "resubmit" : "update",
          resource_type: "vehicle_request",
          resource_id: request.id,
          status: "success",
          new_values: {
            request_number: request.request_number,
            edited_fields: Object.keys(updates).filter(
              (k) => k !== "updated_at",
            ),
            edit_reason: form.edit_reason || null,
            resubmitted: isRejected,
          },
        });
      } catch (e) {
        console.error("audit log failed:", e);
      }
    },
    onSuccess: () => {
      toast.success(
        isRejected
          ? "Request updated and resubmitted for approval"
          : "Request updated",
      );
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRejected ? (
              <>
                <RotateCcw className="w-5 h-5 text-amber-500" /> Fix & Resubmit
                Request
              </>
            ) : (
              <>
                <Pencil className="w-5 h-5 text-primary" /> Edit Request
              </>
            )}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {request.request_number}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isRejected
              ? "Update the fields below and resubmit. The approver will review the changes."
              : "Quick edits while your request is still pending. For structural changes (vehicle type, request type, waypoints), please cancel and re-file."}
          </DialogDescription>
        </DialogHeader>

        {!editable && (
          <div className="flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded p-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This request is in status "{request.status}" and can no longer be
              edited.
            </span>
          </div>
        )}

        {isRejected && request.rejection_reason && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
              Why it was rejected
            </p>
            <p className="text-foreground/80">{request.rejection_reason}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Trip Description *</Label>
            <Textarea
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              disabled={!editable}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {form.purpose.length}/1000 characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Departure place</Label>
              <Input
                value={form.departure_place}
                onChange={(e) => update("departure_place", e.target.value)}
                disabled={!editable}
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                disabled={!editable}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                disabled={!editable}
              />
            </div>
            <div>
              <Label>Start time</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
                disabled={!editable}
              />
            </div>
            <div>
              <Label>End time</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => update("end_time", e.target.value)}
                disabled={!editable}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Passengers</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.passengers}
                onChange={(e) => update("passengers", e.target.value)}
                disabled={!editable}
              />
            </div>
            <div>
              <Label>Cargo *</Label>
              <Select
                value={form.cargo_load}
                onValueChange={(v) => update("cargo_load", v)}
                disabled={!editable}
              >
                <SelectTrigger aria-invalid={!form.cargo_load}>
                  <SelectValue placeholder="Select cargo" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_LOAD_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => update("priority", v)}
                disabled={!editable}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Contact phone</Label>
            <Input
              type="tel"
              inputMode="tel"
              maxLength={13}
              value={form.contact_phone}
              onChange={(e) => {
                // Live-strip everything except digits and a single leading +.
                const raw = e.target.value;
                const hasPlus = raw.trimStart().startsWith("+");
                const digits = raw.replace(/\D/g, "").slice(0, 12);
                update("contact_phone", hasPlus ? `+${digits}` : digits);
              }}
              placeholder="0911234567 or +251911234567"
              disabled={!editable}
            />
          </div>

          {isRejected && (
            <div>
              <Label>What did you change? *</Label>
              <Textarea
                value={form.edit_reason}
                onChange={(e) => update("edit_reason", e.target.value)}
                placeholder="e.g. Adjusted destination per ops feedback; reduced passengers to 4."
                rows={2}
                maxLength={500}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Helps the approver review your changes faster.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!editable || saveMutation.isPending}
          >
            {isRejected ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                {saveMutation.isPending ? "Resubmitting..." : "Save & Resubmit"}
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

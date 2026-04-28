/**
 * EditRequestDialog — lightweight inline editor for a *pending* vehicle
 * request. Lets the requester correct the most commonly-mistaken fields
 * (purpose, route, dates, passengers) before an approver picks it up.
 *
 * Edits are only ever allowed when `status === 'pending'`. The parent
 * (RequesterPortal table) gates the action button so we trust the input
 * here, but we also re-check status before the UPDATE for safety.
 *
 * Validation is standardized via `useFieldValidation` + Zod, with an
 * error-summary banner, inline messages, destructive borders, character
 * counters, and Sonner toasts — matching the rest of the form suite.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import {
  combineDateAndTime,
  splitDateTime,
} from "@/components/ui/date-time-picker";
import type { RequestDetail } from "./RequestDetailDrawer";

interface Props {
  request: RequestDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Convert ISO timestamp → value usable by <input type="datetime-local">,
// expressed in the active org timezone (so what the user sees here matches
// what they originally picked when creating the request, regardless of the
// browser's local timezone).
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const { date, time } = splitDateTime(iso);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
};

// Reverse of `toLocalInput` — turn the picker value back into an ISO that
// represents the chosen wall-clock time *in the org's timezone*.
const fromLocalInput = (value: string): string | null => {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return combineDateAndTime(date, timePart.slice(0, 5)) ?? null;
};

const PURPOSE_MAX = 500;
const PLACE_MAX = 200;

// Zod schema mirrors the form's editable fields. We keep the rules
// permissive (most edits are tiny corrections) but guard the obvious
// pitfalls: empty purpose, missing start, end-before-start, bad pax count.
const buildSchema = () =>
  z
    .object({
      purpose: z
        .string()
        .trim()
        .min(1, "Purpose is required")
        .max(PURPOSE_MAX, `Keep purpose under ${PURPOSE_MAX} characters`),
      departure: z
        .string()
        .trim()
        .max(PLACE_MAX, `Keep departure under ${PLACE_MAX} characters`)
        .optional()
        .or(z.literal("")),
      destination: z
        .string()
        .trim()
        .max(PLACE_MAX, `Keep destination under ${PLACE_MAX} characters`)
        .optional()
        .or(z.literal("")),
      neededFrom: z.string().min(1, "Needed-from date is required"),
      neededUntil: z.string().optional().or(z.literal("")),
      passengers: z
        .string()
        .optional()
        .or(z.literal(""))
        .refine(
          (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
          "Passengers must be a whole number between 0 and 100",
        ),
    })
    .superRefine((data, ctx) => {
      if (data.neededFrom && !fromLocalInput(data.neededFrom)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["neededFrom"],
          message: "Invalid needed-from date",
        });
      }
      if (data.neededUntil) {
        const fromIso = fromLocalInput(data.neededFrom);
        const untilIso = fromLocalInput(data.neededUntil);
        if (!untilIso) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["neededUntil"],
            message: "Invalid needed-until date",
          });
        } else if (fromIso && new Date(untilIso) <= new Date(fromIso)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["neededUntil"],
            message: "Needed-until must be after needed-from",
          });
        }
      }
    });

export function EditRequestDialog({ request, open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const [purpose, setPurpose] = useState("");
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [neededFrom, setNeededFrom] = useState("");
  const [neededUntil, setNeededUntil] = useState("");
  const [passengers, setPassengers] = useState<string>("");

  const schema = useMemo(() => buildSchema(), []);
  const v = useFieldValidation(schema, () => ({
    purpose,
    departure,
    destination,
    neededFrom,
    neededUntil,
    passengers,
  }));

  // Sync local state whenever a different request opens.
  useEffect(() => {
    if (!request) return;
    setPurpose(request.purpose ?? "");
    setDeparture(((request as any).departure_place ?? "") as string);
    setDestination(request.destination ?? "");
    setNeededFrom(toLocalInput(request.needed_from));
    setNeededUntil(toLocalInput(request.needed_until));
    setPassengers(
      request.passengers != null ? String(request.passengers) : "",
    );
    v.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, open]);

  const errCls = (field: string) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const save = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      // Refuse to update anything that's no longer pending. Avoids
      // race-condition silent overwrites if status flipped while open.
      if (request.status !== "pending") {
        throw new Error(
          "This request is no longer pending and cannot be edited.",
        );
      }

      const result = v.validateAll({
        purpose,
        departure,
        destination,
        neededFrom,
        neededUntil,
        passengers,
      });
      if (!result.success) {
        const count = Object.keys(result.errors).length;
        throw new Error(
          `Please fix ${count} field${count > 1 ? "s" : ""} before saving`,
        );
      }

      const fromIso = fromLocalInput(neededFrom);
      if (!fromIso) throw new Error("Invalid needed-from date.");
      const untilIso = neededUntil ? fromLocalInput(neededUntil) : null;

      const payload: Record<string, any> = {
        purpose: purpose.trim(),
        departure_place: departure.trim() || null,
        destination: destination.trim() || null,
        needed_from: fromIso,
        needed_until: untilIso,
        passengers: passengers ? parseInt(passengers, 10) : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update(payload)
        .eq("id", request.id)
        .eq("status", "pending"); // belt-and-suspenders gate
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) v.reset();
    onOpenChange(next);
  };

  const errorCount = Object.keys(v.errors).filter(
    (k) => (v.touched as any)[k],
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit vehicle request</DialogTitle>
          <DialogDescription>
            You can edit this request because it has not been approved yet.
          </DialogDescription>
        </DialogHeader>

        {errorCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Please fix {errorCount} field{errorCount > 1 ? "s" : ""} below
              before saving.
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-purpose">Purpose *</Label>
            <Textarea
              id="ev-purpose"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                v.handleChange("purpose", e.target.value);
              }}
              onBlur={() => v.handleBlur("purpose", purpose)}
              rows={2}
              maxLength={PURPOSE_MAX}
              aria-invalid={!!v.getError("purpose")}
              className={errCls("purpose")}
            />
            <div className="flex items-center justify-between text-[11px]">
              {v.getError("purpose") ? (
                <p className="text-destructive">{v.getError("purpose")}</p>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                {purpose.length}/{PURPOSE_MAX}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-dep">Departure</Label>
              <Input
                id="ev-dep"
                value={departure}
                onChange={(e) => {
                  setDeparture(e.target.value);
                  v.handleChange("departure", e.target.value);
                }}
                onBlur={() => v.handleBlur("departure", departure)}
                maxLength={PLACE_MAX}
                aria-invalid={!!v.getError("departure")}
                className={errCls("departure")}
              />
              {v.getError("departure") && (
                <p className="text-[11px] text-destructive">
                  {v.getError("departure")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-dest">Destination</Label>
              <Input
                id="ev-dest"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  v.handleChange("destination", e.target.value);
                }}
                onBlur={() => v.handleBlur("destination", destination)}
                maxLength={PLACE_MAX}
                aria-invalid={!!v.getError("destination")}
                className={errCls("destination")}
              />
              {v.getError("destination") && (
                <p className="text-[11px] text-destructive">
                  {v.getError("destination")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-from">Needed from *</Label>
              <Input
                id="ev-from"
                type="datetime-local"
                value={neededFrom}
                onChange={(e) => {
                  setNeededFrom(e.target.value);
                  v.handleChange("neededFrom", e.target.value);
                }}
                onBlur={() => v.handleBlur("neededFrom", neededFrom)}
                aria-invalid={!!v.getError("neededFrom")}
                className={errCls("neededFrom")}
              />
              {v.getError("neededFrom") && (
                <p className="text-[11px] text-destructive">
                  {v.getError("neededFrom")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-until">Needed until</Label>
              <Input
                id="ev-until"
                type="datetime-local"
                value={neededUntil}
                onChange={(e) => {
                  setNeededUntil(e.target.value);
                  v.handleChange("neededUntil", e.target.value);
                }}
                onBlur={() => v.handleBlur("neededUntil", neededUntil)}
                aria-invalid={!!v.getError("neededUntil")}
                className={errCls("neededUntil")}
              />
              {v.getError("neededUntil") && (
                <p className="text-[11px] text-destructive">
                  {v.getError("neededUntil")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-pax">Passengers</Label>
            <Input
              id="ev-pax"
              type="number"
              min={0}
              max={100}
              value={passengers}
              onChange={(e) => {
                setPassengers(e.target.value);
                v.handleChange("passengers", e.target.value);
              }}
              onBlur={() => v.handleBlur("passengers", passengers)}
              aria-invalid={!!v.getError("passengers")}
              className={`w-32 ${errCls("passengers")}`}
            />
            {v.getError("passengers") && (
              <p className="text-[11px] text-destructive">
                {v.getError("passengers")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditRequestDialog;

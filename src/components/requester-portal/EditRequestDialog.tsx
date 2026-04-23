/**
 * EditRequestDialog — lightweight inline editor for a *pending* vehicle
 * request. Lets the requester correct the most commonly-mistaken fields
 * (purpose, route, dates, passengers) before an approver picks it up.
 *
 * Edits are only ever allowed when `status === 'pending'`. The parent
 * (RequesterPortal table) gates the action button so we trust the input
 * here, but we also re-check status before the UPDATE for safety.
 */
import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { combineDateAndTime, splitDateTime } from "@/components/ui/date-time-picker";
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

export function EditRequestDialog({ request, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [purpose, setPurpose] = useState("");
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [neededFrom, setNeededFrom] = useState("");
  const [neededUntil, setNeededUntil] = useState("");
  const [passengers, setPassengers] = useState<string>("");

  // Sync local state whenever a different request opens.
  useEffect(() => {
    if (!request) return;
    setPurpose(request.purpose ?? "");
    setDeparture(((request as any).departure_place ?? "") as string);
    setDestination(request.destination ?? "");
    setNeededFrom(toLocalInput(request.needed_from));
    setNeededUntil(toLocalInput(request.needed_until));
    setPassengers(request.passengers != null ? String(request.passengers) : "");
  }, [request]);

  const save = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      // Refuse to update anything that's no longer pending. Avoids
      // race-condition silent overwrites if status flipped while open.
      if (request.status !== "pending") {
        throw new Error("This request is no longer pending and cannot be edited.");
      }
      if (!purpose.trim()) throw new Error("Purpose is required.");
      if (!neededFrom) throw new Error("Needed-from date is required.");

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
      toast({ title: "Request updated" });
      qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({
        title: "Update failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit vehicle request</DialogTitle>
          <DialogDescription>
            You can edit this request because it has not been approved yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-purpose">Purpose *</Label>
            <Textarea
              id="ev-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-dep">Departure</Label>
              <Input
                id="ev-dep"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-dest">Destination</Label>
              <Input
                id="ev-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-from">Needed from *</Label>
              <Input
                id="ev-from"
                type="datetime-local"
                value={neededFrom}
                onChange={(e) => setNeededFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-until">Needed until</Label>
              <Input
                id="ev-until"
                type="datetime-local"
                value={neededUntil}
                onChange={(e) => setNeededUntil(e.target.value)}
              />
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
              onChange={(e) => setPassengers(e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditRequestDialog;

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface CheckInOutPayload {
  odometer: number | null;
  notes: string;
  lat: number | null;
  lng: number | null;
}

interface CheckInOutDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** "in" = check in, "out" = check out */
  mode: "in" | "out";
  /** Known starting odometer (used to validate end >= start) */
  odometerStart?: number | null;
  onSubmit: (data: CheckInOutPayload) => Promise<void> | void;
}

/**
 * Replaces the legacy window.prompt() flow with a proper dialog that:
 *  - validates odometer is non-negative
 *  - on check-out enforces end >= start when known
 *  - tries to capture geolocation (best-effort, optional)
 *  - lets the driver add free-text notes
 */
export const CheckInOutDialog = ({
  open, onOpenChange, mode, odometerStart, onSubmit,
}: CheckInOutDialogProps) => {
  const [odo, setOdo] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOut = mode === "out";
  const title = isOut ? "Check Out — Complete Trip" : "Check In — Start Trip";

  // Try to grab geolocation when opened (best effort)
  useEffect(() => {
    if (!open) return;
    setOdo("");
    setNotes("");
    setCoords(null);
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
    );
  }, [open]);

  const validate = (): { ok: boolean; odoNum: number | null } => {
    const trimmed = odo.trim();
    if (!trimmed) return { ok: true, odoNum: null }; // odometer optional
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Odometer must be a positive number");
      return { ok: false, odoNum: null };
    }
    if (isOut && odometerStart != null && n < odometerStart) {
      toast.error(`Ending odometer (${n}) cannot be less than starting (${odometerStart})`);
      return { ok: false, odoNum: null };
    }
    return { ok: true, odoNum: n };
  };

  const handleSubmit = async () => {
    const { ok, odoNum } = validate();
    if (!ok) return;
    setSubmitting(true);
    try {
      await onSubmit({
        odometer: odoNum,
        notes: notes.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isOut
              ? "Confirm your ending odometer and notes. Distance will be calculated automatically."
              : "Confirm your starting odometer to begin. Drive safely."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="odo">
              {isOut ? "Ending odometer (km)" : "Starting odometer (km)"}
              {isOut && odometerStart != null && (
                <span className="text-xs text-muted-foreground ml-2">
                  Start: {odometerStart}
                </span>
              )}
            </Label>
            <Input
              id="odo"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 124530"
              value={odo}
              onChange={(e) => setOdo(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Optional — leave blank to skip.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any pre-trip / post-trip remarks…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            {geoLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Getting location…
              </span>
            ) : coords ? (
              <span>Location captured: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            ) : (
              <span>Location not available — submission will continue without it.</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : (isOut ? "Check Out" : "Check In")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInOutDialog;

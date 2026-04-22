import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Wrench,
  Car,
  HeartPulse,
  Users,
  HelpCircle,
  Paperclip,
  Camera,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReasonValue =
  | "vehicle_technical"
  | "accident"
  | "driver_health"
  | "passenger_health"
  | "other";

const REASONS: Array<{
  value: ReasonValue;
  label: string;
  description: string;
  icon: typeof Wrench;
  /** Maps to existing incidents.incident_type enum-ish field. */
  incidentType: "accident" | "breakdown" | "violation" | "theft" | "damage";
  severity: "low" | "medium" | "high" | "critical";
}> = [
  {
    value: "vehicle_technical",
    label: "Vehicle Technical Problem",
    description: "Mechanical / electrical failure, warning lights, flat tire",
    icon: Wrench,
    incidentType: "breakdown",
    severity: "high",
  },
  {
    value: "accident",
    label: "Accident",
    description: "Collision, scratch, or any vehicle damage",
    icon: Car,
    incidentType: "accident",
    severity: "critical",
  },
  {
    value: "driver_health",
    label: "Driver Health Issue",
    description: "Fatigue, illness, injury affecting the driver",
    icon: HeartPulse,
    incidentType: "violation",
    severity: "high",
  },
  {
    value: "passenger_health",
    label: "Passenger Health Issue",
    description: "Passenger illness, injury or medical emergency",
    icon: Users,
    incidentType: "violation",
    severity: "high",
  },
  {
    value: "other",
    label: "Other",
    description: "Anything else that needs to be reported",
    icon: HelpCircle,
    incidentType: "damage",
    severity: "medium",
  },
];

const formSchema = z.object({
  reason: z.enum([
    "vehicle_technical",
    "accident",
    "driver_health",
    "passenger_health",
    "other",
  ]),
  description: z
    .string()
    .trim()
    .min(5, "Please describe what happened (min 5 characters)")
    .max(1000, "Description must be under 1000 characters"),
  km_reading: z
    .number({ invalid_type_error: "KM reading must be a number" })
    .min(0, "KM reading cannot be negative")
    .max(10_000_000, "KM reading is too large")
    .optional(),
});

interface ReportTripIncidentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId?: string | null;
  vehicleId?: string | null;
  tripId?: string | null;
  /** Optional location string captured from the trip. */
  location?: string | null;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

export const ReportTripIncidentDialog = ({
  open,
  onOpenChange,
  driverId,
  vehicleId,
  tripId,
  location,
}: ReportTripIncidentDialogProps) => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reason, setReason] = useState<ReasonValue>("vehicle_technical");
  const [description, setDescription] = useState("");
  const [kmReading, setKmReading] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) {
      setReason("vehicle_technical");
      setDescription("");
      setKmReading("");
      setFiles([]);
    }
  }, [open]);

  // Driver details (auto-filled like the work-request form)
  const { data: driverInfo } = useQuery({
    queryKey: ["incident-driver-info", driverId],
    enabled: !!driverId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, phone, employment_type, employee_id")
        .eq("id", driverId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Vehicle details for the asset section
  const { data: vehicleInfo } = useQuery({
    queryKey: ["incident-vehicle-info", vehicleId],
    enabled: !!vehicleId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, odometer_km")
        .eq("id", vehicleId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Pre-fill KM reading with the vehicle's last known odometer (editable).
  useEffect(() => {
    if (open && vehicleInfo?.odometer_km != null && kmReading === "") {
      setKmReading(String(vehicleInfo.odometer_km));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicleInfo?.odometer_km]);

  const driverFullName = driverInfo
    ? `${driverInfo.first_name || ""} ${driverInfo.last_name || ""}`.trim()
    : "";
  const vehicleLabel = vehicleInfo
    ? `${vehicleInfo.plate_number}${vehicleInfo.make ? ` · ${vehicleInfo.make}` : ""}${vehicleInfo.model ? ` ${vehicleInfo.model}` : ""}`
    : "";

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const validated: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${f.name} is over ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        continue;
      }
      validated.push(f);
    }
    const next = [...files, ...validated].slice(0, MAX_FILES);
    if (files.length + validated.length > MAX_FILES) {
      toast({
        title: "Attachment limit",
        description: `You can attach up to ${MAX_FILES} files.`,
      });
    }
    setFiles(next);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization context");

      const parsed = formSchema.parse({ reason, description });
      const meta = REASONS.find((r) => r.value === parsed.reason)!;
      const incidentNumber = `INC-${Date.now().toString().slice(-8)}`;

      // 1) Insert the incident first so we get its id for the storage path.
      const { data: inserted, error: insertError } = await (supabase as any)
        .from("incidents")
        .insert({
          organization_id: organizationId,
          vehicle_id: vehicleId || null,
          driver_id: driverId || null,
          trip_id: tripId || null,
          incident_number: incidentNumber,
          incident_type: meta.incidentType,
          severity: meta.severity,
          reason: parsed.reason,
          description: parsed.description,
          location: location || null,
          incident_time: new Date().toISOString(),
          status: "open",
          reported_via: "driver-portal",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      const incidentId = inserted.id as string;

      // 2) Upload attachments under {org}/{incident_id}/{timestamp_filename}
      const uploadedPaths: string[] = [];
      for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${organizationId}/${incidentId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("incident-attachments")
          .upload(path, f, { upsert: false, contentType: f.type || undefined });
        if (upErr) {
          console.error("incident attachment upload failed", upErr);
          continue;
        }
        uploadedPaths.push(path);
      }

      if (uploadedPaths.length > 0) {
        const { error: updErr } = await (supabase as any)
          .from("incidents")
          .update({ attachments: uploadedPaths })
          .eq("id", incidentId);
        if (updErr) console.error("attach update failed", updErr);
      }

      return { incidentId, uploaded: uploadedPaths.length };
    },
    onSuccess: ({ uploaded }) => {
      toast({
        title: "Incident reported",
        description:
          uploaded > 0
            ? `Your report and ${uploaded} attachment${uploaded > 1 ? "s" : ""} have been sent to the fleet manager.`
            : "Your report has been sent to the fleet manager.",
      });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to submit report";
      toast({ title: "Submission failed", description: message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
            Report Incident
          </DialogTitle>
          <DialogDescription>
            Quickly notify the fleet team about an issue during your trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Reason selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason</Label>
            <RadioGroup
              value={reason}
              onValueChange={(v) => setReason(v as ReasonValue)}
              className="grid gap-2"
            >
              {REASONS.map((r) => {
                const Icon = r.icon;
                const selected = reason === r.value;
                return (
                  <label
                    key={r.value}
                    htmlFor={`reason-${r.value}`}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem
                      value={r.value}
                      id={`reason-${r.value}`}
                      className="mt-1"
                    />
                    <Icon
                      className={`w-5 h-5 mt-0.5 ${
                        selected ? "text-primary" : "text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-none">
                        {r.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="incident-description" className="text-sm font-medium">
              What happened? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="incident-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the situation briefly so the fleet team can help…"
              rows={4}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachments (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor="incident-camera"
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Camera className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">Take Photo</span>
                <span className="text-xs text-muted-foreground">Use camera</span>
                <input
                  id="incident-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label
                htmlFor="incident-files"
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Paperclip className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">Upload Files</span>
                <span className="text-xs text-muted-foreground">Photos or PDFs</span>
                <input
                  id="incident-files"
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Up to {MAX_FILES} files · max {MAX_FILE_SIZE_MB}MB each
            </p>

            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submit.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submit.isPending || description.trim().length < 5}
              className="gap-2"
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>Submit Report</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportTripIncidentDialog;

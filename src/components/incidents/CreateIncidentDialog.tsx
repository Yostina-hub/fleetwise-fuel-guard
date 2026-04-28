import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { friendlyToastError } from "@/lib/errorMessages";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/lib/utils";

/**
 * Incident report schema
 * ----------------------
 * Targeted business rules:
 *  - Description >= 10 chars (prevents "n/a" placeholder reports).
 *  - Location is REQUIRED for accidents and theft (operational/insurance rule).
 *  - Estimated cost is REQUIRED (>0) for accidents and damage incidents.
 *  - Incident time cannot be in the future, nor more than 30 days back
 *    (older incidents must be filed via the historical-import flow).
 */
const INCIDENT_TYPES = ["accident", "breakdown", "violation", "theft", "damage"] as const;
const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;

const incidentSchema = z
  .object({
    incident_type: z.enum(INCIDENT_TYPES, {
      errorMap: () => ({ message: "Select an incident type" }),
    }),
    severity: z.enum(INCIDENT_SEVERITIES, {
      errorMap: () => ({ message: "Select a severity" }),
    }),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(1000, "Description must be 1000 characters or fewer"),
    location: z
      .string()
      .trim()
      .max(200, "Location must be 200 characters or fewer")
      .optional()
      .or(z.literal("")),
    incident_time: z
      .string()
      .min(1, "Date and time are required"),
    estimated_cost: z
      .number({ invalid_type_error: "Estimated cost must be a number" })
      .min(0, "Estimated cost cannot be negative")
      .max(10_000_000, "Estimated cost is unrealistically high"),
  })
  .superRefine((data, ctx) => {
    // Time bounds.
    if (data.incident_time) {
      const t = new Date(data.incident_time).getTime();
      if (Number.isFinite(t)) {
        const now = Date.now();
        if (t > now + 60_000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["incident_time"],
            message: "Incident time cannot be in the future",
          });
        }
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        if (t < now - THIRTY_DAYS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["incident_time"],
            message: "Incidents older than 30 days must be filed via historical import",
          });
        }
      }
    }
    // Location is mandatory for accident and theft.
    if (
      (data.incident_type === "accident" || data.incident_type === "theft") &&
      !data.location?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "Location is required for accidents and theft reports",
      });
    }
    // Cost is mandatory for accident and damage.
    if (
      (data.incident_type === "accident" || data.incident_type === "damage") &&
      (!data.estimated_cost || data.estimated_cost <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimated_cost"],
        message: "Estimated cost is required for accident and damage reports",
      });
    }
  });

interface CreateIncidentDialogProps {
  trigger?: React.ReactNode;
  vehicleId?: string;
  driverId?: string;
}

const CreateIncidentDialog = ({ trigger, vehicleId, driverId }: CreateIncidentDialogProps) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: "accident" as (typeof INCIDENT_TYPES)[number],
    severity: "medium" as (typeof INCIDENT_SEVERITIES)[number],
    description: "",
    location: "",
    incident_time: new Date().toISOString().slice(0, 16),
    estimated_cost: 0,
  });
  const v = useFieldValidation(incidentSchema, () => formData);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validated = incidentSchema.parse(data);
      const incidentNumber = `INC-${Date.now().toString().slice(-8)}`;

      const { error } = await (supabase as any)
        .from("incidents")
        .insert({
          ...validated,
          incident_number: incidentNumber,
          organization_id: organizationId,
          vehicle_id: vehicleId || null,
          driver_id: driverId || null,
          status: "open",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident reported successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      friendlyToastError(error);
    },
  });

  const resetForm = () => {
    setFormData({
      incident_type: "accident",
      severity: "medium",
      description: "",
      location: "",
      incident_time: new Date().toISOString().slice(0, 16),
      estimated_cost: 0,
    });
    v.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = v.validateAll(formData);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} invalid field${count === 1 ? "" : "s"} before reporting`);
      return;
    }
    createMutation.mutate(formData);
  };

  const errCls = (field: keyof typeof formData) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const visibleErrorCount = Object.keys(v.errors).length;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={resetForm}>
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
          <DialogDescription>
            Document an incident for investigation and tracking.{" "}
            <span className="text-destructive">*</span> indicates required field.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {visibleErrorCount > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">
                    {visibleErrorCount} field{visibleErrorCount === 1 ? "" : "s"} need attention
                  </div>
                  <div className="text-xs opacity-90">
                    Fix the highlighted required fields before submitting.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incident_type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.incident_type}
                  onValueChange={(value: any) => {
                    setFormData({ ...formData, incident_type: value });
                    v.handleChange("incident_type", value);
                  }}
                >
                  <SelectTrigger className={cn(errCls("incident_type"))} aria-invalid={!!v.getError("incident_type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                    <SelectItem value="violation">Violation</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                  </SelectContent>
                </Select>
                {v.getError("incident_type") && (
                  <p className="text-sm text-destructive mt-1">{v.getError("incident_type")}</p>
                )}
              </div>
              <div>
                <Label htmlFor="severity">
                  Severity <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: any) => {
                    setFormData({ ...formData, severity: value });
                    v.handleChange("severity", value);
                  }}
                >
                  <SelectTrigger className={cn(errCls("severity"))} aria-invalid={!!v.getError("severity")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {v.getError("severity") && (
                  <p className="text-sm text-destructive mt-1">{v.getError("severity")}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  v.handleChange("description", e.target.value);
                }}
                onBlur={(e) => v.handleBlur("description", e.target.value)}
                placeholder="Provide detailed description of the incident (at least 10 characters)..."
                rows={4}
                aria-invalid={!!v.getError("description")}
                className={cn(errCls("description"))}
              />
              {v.getError("description") && (
                <p className="text-sm text-destructive mt-1">{v.getError("description")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">
                Location
                {(formData.incident_type === "accident" || formData.incident_type === "theft") && (
                  <span className="text-destructive"> *</span>
                )}
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  v.handleChange("location", e.target.value);
                }}
                onBlur={(e) => v.handleBlur("location", e.target.value)}
                placeholder="Enter incident location"
                aria-invalid={!!v.getError("location")}
                className={cn(errCls("location"))}
              />
              {v.getError("location") && (
                <p className="text-sm text-destructive mt-1">{v.getError("location")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="incident_time">
                Date &amp; Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="incident_time"
                type="datetime-local"
                value={formData.incident_time}
                max={new Date().toISOString().slice(0, 16)}
                onChange={(e) => {
                  setFormData({ ...formData, incident_time: e.target.value });
                  v.handleChange("incident_time", e.target.value);
                }}
                onBlur={(e) => v.handleBlur("incident_time", e.target.value)}
                aria-invalid={!!v.getError("incident_time")}
                className={cn(errCls("incident_time"))}
              />
              {v.getError("incident_time") && (
                <p className="text-sm text-destructive mt-1">{v.getError("incident_time")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="estimated_cost">
                Estimated Cost (Br)
                {(formData.incident_type === "accident" || formData.incident_type === "damage") && (
                  <span className="text-destructive"> *</span>
                )}
              </Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimated_cost}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData({ ...formData, estimated_cost: val });
                  v.handleChange("estimated_cost", val);
                }}
                onBlur={(e) => v.handleBlur("estimated_cost", parseFloat(e.target.value) || 0)}
                aria-invalid={!!v.getError("estimated_cost")}
                className={cn(errCls("estimated_cost"))}
              />
              {v.getError("estimated_cost") && (
                <p className="text-sm text-destructive mt-1">{v.getError("estimated_cost")}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Reporting..." : "Report Incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateIncidentDialog;

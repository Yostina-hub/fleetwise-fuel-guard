import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { friendlyToastError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";

interface TripTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRequest?: any;
}

const templateSchema = z.object({
  template_name: z
    .string()
    .trim()
    .min(3, "Template name must be at least 3 characters")
    .max(80, "Template name must be under 80 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .or(z.literal("")),
  is_recurring: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

const initialForm: TemplateFormData = {
  template_name: "",
  description: "",
  is_recurring: false,
};

export const TripTemplateDialog = ({
  open,
  onOpenChange,
  existingRequest,
}: TripTemplateDialogProps) => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<TemplateFormData>(initialForm);
  const v = useFieldValidation(templateSchema);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      v.reset();
    }
  }, [open]);

  const update = <K extends keyof TemplateFormData>(field: K, value: TemplateFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    v.handleChange(field as never, value);
  };

  const errCls = (field: keyof TemplateFormData) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const createTemplate = useMutation({
    mutationFn: async (templateData: any) => {
      const { error } = await (supabase as any).from("trip_templates").insert({
        organization_id: organizationId,
        created_by: user?.id,
        ...templateData,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-templates"] });
      toast.success("Trip template saved successfully");
      onOpenChange(false);
    },
    onError: (err: any) => {
      friendlyToastError(err, { title: "Failed to create template. Please try again." });
    },
  });

  const handleSubmit = () => {
    if (!existingRequest?.purpose) {
      toast.error("No source request found — cannot create template");
      return;
    }
    const result = v.validateAll(form as unknown as Record<string, unknown>);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} field${count > 1 ? "s" : ""} before saving`);
      return;
    }

    createTemplate.mutate({
      template_name: form.template_name.trim(),
      description: form.description?.trim() || null,
      purpose: existingRequest.purpose,
      required_class: existingRequest.required_class,
      passengers: existingRequest.passengers,
      pickup_geofence_id: existingRequest.pickup_geofence_id,
      drop_geofence_id: existingRequest.drop_geofence_id,
      notes: existingRequest.notes,
      is_recurring: form.is_recurring,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this trip request as a template for future use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {v.hasVisibleErrors && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Please fix the highlighted fields</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {Object.entries(v.errors).map(([k, msg]) =>
                    msg ? <li key={k}>{msg}</li> : null,
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="template-name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              placeholder="e.g., Weekly Office Commute"
              value={form.template_name}
              onChange={(e) => update("template_name", e.target.value)}
              onBlur={() => v.handleBlur("template_name", form.template_name)}
              className={cn(errCls("template_name"))}
              maxLength={80}
            />
            {v.getError("template_name") && (
              <p className="text-xs text-destructive">{v.getError("template_name")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              onBlur={() => v.handleBlur("description", form.description)}
              className={cn(errCls("description"))}
              rows={3}
              maxLength={500}
            />
            {v.getError("description") && (
              <p className="text-xs text-destructive">{v.getError("description")}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="recurring">Recurring Template</Label>
              <p className="text-sm text-muted-foreground">
                Mark this for recurring trips
              </p>
            </div>
            <Switch
              id="recurring"
              checked={form.is_recurring}
              onCheckedChange={(c) => update("is_recurring", c)}
            />
          </div>

          {existingRequest && (
            <div className="rounded-lg border p-3 space-y-1 bg-muted/30">
              <p className="text-sm font-medium">Template will include:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Purpose: {existingRequest.purpose}</li>
                <li>• Passengers: {existingRequest.passengers}</li>
                {existingRequest.required_class && (
                  <li>• Vehicle Class: {existingRequest.required_class}</li>
                )}
                {existingRequest.pickup_geofence_id && <li>• Pickup & drop locations</li>}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTemplate.isPending}
            className="gap-2"
          >
            {createTemplate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

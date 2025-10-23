import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

interface TripTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRequest?: any;
}

export const TripTemplateDialog = ({
  open,
  onOpenChange,
  existingRequest,
}: TripTemplateDialogProps) => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const { data: geofences } = useQuery({
    queryKey: ["geofences"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("geofences")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: any) => {
      const { error } = await (supabase as any)
        .from("trip_templates")
        .insert({
          organization_id: organizationId,
          created_by: user?.id,
          ...templateData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-templates"] });
      toast({
        title: "Template created",
        description: "Trip template has been saved successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTemplateName("");
    setDescription("");
    setIsRecurring(false);
  };

  const handleSubmit = () => {
    if (!templateName || !existingRequest?.purpose) {
      toast({
        title: "Missing information",
        description: "Please provide a template name.",
        variant: "destructive",
      });
      return;
    }

    createTemplate.mutate({
      template_name: templateName,
      description,
      purpose: existingRequest.purpose,
      required_class: existingRequest.required_class,
      passengers: existingRequest.passengers,
      pickup_geofence_id: existingRequest.pickup_geofence_id,
      drop_geofence_id: existingRequest.drop_geofence_id,
      notes: existingRequest.notes,
      is_recurring: isRecurring,
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
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g., Weekly Office Commute"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
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
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
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
            disabled={createTemplate.isPending || !templateName}
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

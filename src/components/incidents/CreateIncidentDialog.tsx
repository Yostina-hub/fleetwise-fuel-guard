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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const incidentSchema = z.object({
  incident_type: z.enum(["accident", "breakdown", "violation", "theft", "damage"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().trim().min(1, "Description is required").max(1000),
  location: z.string().trim().max(200).optional(),
  incident_time: z.string(),
  estimated_cost: z.number().min(0).optional(),
});

interface CreateIncidentDialogProps {
  trigger?: React.ReactNode;
}

const CreateIncidentDialog = ({ trigger }: CreateIncidentDialogProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: "accident" as const,
    severity: "medium" as const,
    description: "",
    location: "",
    incident_time: new Date().toISOString().slice(0, 16),
    estimated_cost: 0,
  });

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
          status: "open",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Incident reported successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

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
            Document an incident for investigation and tracking
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incident_type">Type *</Label>
                <Select
                  value={formData.incident_type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, incident_type: value })
                  }
                >
                  <SelectTrigger>
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
              </div>
              <div>
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, severity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Provide detailed description of the incident..."
                rows={4}
                required
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter incident location"
              />
            </div>
            <div>
              <Label htmlFor="incident_time">Date & Time *</Label>
              <Input
                id="incident_time"
                type="datetime-local"
                value={formData.incident_time}
                onChange={(e) =>
                  setFormData({ ...formData, incident_time: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
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

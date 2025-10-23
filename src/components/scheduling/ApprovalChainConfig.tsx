import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, MoveUp, MoveDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApprovalStep {
  step: number;
  approver_role: string;
  cost_threshold?: number;
}

export const ApprovalChainConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<ApprovalStep[]>([
    { step: 1, approver_role: "operations_manager" },
  ]);

  // Fetch existing config (if any)
  const { data: existingConfig } = useQuery({
    queryKey: ["approval-chain-config"],
    queryFn: async () => {
      // This would fetch from a config table if we had one
      // For now, return default
      return null;
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (config: ApprovalStep[]) => {
      // This would save to a config table
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 500));
      return config;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval chain configuration saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addStep = () => {
    const nextStep = steps.length + 1;
    setSteps([...steps, { step: nextStep, approver_role: "operations_manager" }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, step: i + 1 }));
    setSteps(renumbered);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, step: i + 1 }));
    setSteps(renumbered);
  };

  const updateStep = (index: number, field: keyof ApprovalStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Chain Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Configure the approval workflow for trip requests. Each step must be completed before moving to the next.
        </div>

        {/* Approval Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-end gap-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex-shrink-0 w-12">
                <Label>Step</Label>
                <div className="text-2xl font-bold text-primary">{step.step}</div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`role-${index}`}>Approver Role *</Label>
                  <Select
                    value={step.approver_role}
                    onValueChange={(value) => updateStep(index, 'approver_role', value)}
                  >
                    <SelectTrigger id={`role-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operations_manager">Operations Manager</SelectItem>
                      <SelectItem value="fleet_owner">Fleet Owner</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`threshold-${index}`}>Cost Threshold (Optional)</Label>
                  <Input
                    id={`threshold-${index}`}
                    type="number"
                    placeholder="e.g., 1000"
                    value={step.cost_threshold || ''}
                    onChange={(e) => updateStep(index, 'cost_threshold', parseFloat(e.target.value) || undefined)}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Only required if estimated cost exceeds this amount
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                >
                  <MoveUp className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(index, 'down')}
                  disabled={index === steps.length - 1}
                >
                  <MoveDown className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={addStep}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </Button>

          <Button
            onClick={() => saveConfig.mutate(steps)}
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Approval Flow Preview:</div>
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                  {step.step}. {step.approver_role.replace('_', ' ')}
                  {step.cost_threshold && ` (>${step.cost_threshold})`}
                </div>
                {index < steps.length - 1 && (
                  <div className="text-muted-foreground">→</div>
                )}
              </div>
            ))}
            <div className="px-3 py-2 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium">
              ✓ Approved
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

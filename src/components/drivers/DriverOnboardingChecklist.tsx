import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, UserPlus, UserMinus } from "lucide-react";

const DEFAULT_ONBOARDING_STEPS = [
  "Personal information collected",
  "License verification completed",
  "Background check cleared",
  "Medical certificate obtained",
  "Drug test passed",
  "Safety orientation completed",
  "Vehicle familiarization done",
  "GPS device training",
  "Company policy acknowledgment signed",
  "Emergency procedures briefing",
  "Uniform & ID badge issued",
  "System account created",
];

const DEFAULT_OFFBOARDING_STEPS = [
  "Final trip completed",
  "Vehicle returned & inspected",
  "GPS device collected",
  "Fuel card deactivated",
  "Company property returned",
  "System access revoked",
  "Final payroll processed",
  "Exit interview completed",
];

interface ChecklistItem {
  id: string;
  step_name: string;
  step_order: number;
  is_completed: boolean;
  completed_at: string | null;
  checklist_type: string;
}

interface DriverOnboardingChecklistProps {
  driverId: string;
  driverName: string;
}

export const DriverOnboardingChecklist = ({ driverId, driverName }: DriverOnboardingChecklistProps) => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"onboarding" | "offboarding">("onboarding");
  const [showInitDialog, setShowInitDialog] = useState(false);

  const fetchChecklist = async () => {
    if (!organizationId || !driverId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_onboarding_checklists")
      .select("*")
      .eq("driver_id", driverId)
      .eq("organization_id", organizationId)
      .order("step_order", { ascending: true });
    setItems((data as ChecklistItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchChecklist(); }, [driverId, organizationId]);

  const filteredItems = items.filter(i => i.checklist_type === activeType);
  const completedCount = filteredItems.filter(i => i.is_completed).length;
  const progress = filteredItems.length > 0 ? (completedCount / filteredItems.length) * 100 : 0;

  const initializeChecklist = async (type: "onboarding" | "offboarding") => {
    if (!organizationId || !driverId) return;
    const steps = type === "onboarding" ? DEFAULT_ONBOARDING_STEPS : DEFAULT_OFFBOARDING_STEPS;
    const rows = steps.map((step, i) => ({
      organization_id: organizationId,
      driver_id: driverId,
      checklist_type: type,
      step_name: step,
      step_order: i,
    }));
    await supabase.from("driver_onboarding_checklists").insert(rows);
    toast({ title: `${type} checklist created` });
    setActiveType(type);
    setShowInitDialog(false);
    fetchChecklist();
  };

  const toggleStep = async (item: ChecklistItem) => {
    const newVal = !item.is_completed;
    await supabase.from("driver_onboarding_checklists").update({
      is_completed: newVal,
      completed_by: newVal ? user?.id : null,
      completed_at: newVal ? new Date().toISOString() : null,
    }).eq("id", item.id);
    fetchChecklist();
  };

  const hasOnboarding = items.some(i => i.checklist_type === "onboarding");
  const hasOffboarding = items.some(i => i.checklist_type === "offboarding");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={activeType === "onboarding" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveType("onboarding")}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" /> Onboarding
        </Button>
        <Button
          variant={activeType === "offboarding" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveType("offboarding")}
          className="gap-2"
        >
          <UserMinus className="w-4 h-4" /> Offboarding
        </Button>

        {((activeType === "onboarding" && !hasOnboarding) || (activeType === "offboarding" && !hasOffboarding)) && (
          <Button variant="outline" size="sm" onClick={() => initializeChecklist(activeType)} className="gap-2 ml-auto">
            <Plus className="w-4 h-4" /> Initialize {activeType} checklist
          </Button>
        )}
      </div>

      {filteredItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  {activeType} Checklist — {driverName}
                </CardTitle>
                <CardDescription>{completedCount} of {filteredItems.length} steps completed</CardDescription>
              </div>
              <Badge variant={progress === 100 ? "default" : "secondary"}>
                {Math.round(progress)}%
              </Badge>
            </div>
            <Progress value={progress} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${item.is_completed ? "bg-primary/5 border-primary/20" : "hover:bg-accent/50"}`}
              >
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={() => toggleStep(item)}
                />
                <span className={`flex-1 text-sm ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {item.step_name}
                </span>
                {item.is_completed && item.completed_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.completed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {filteredItems.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No {activeType} checklist found for this driver.</p>
            <p className="text-xs mt-1">Click "Initialize" to create one from template.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

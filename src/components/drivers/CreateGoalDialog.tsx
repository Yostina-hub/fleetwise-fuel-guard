import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Loader2, Target, AlertCircle } from "lucide-react";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/lib/utils";

interface Props {
  onSubmit: (goal: any) => Promise<void>;
  driverId: string;
}

const todayStr = () => new Date().toISOString().split("T")[0];

const goalSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title must be under 120 characters"),
    goal_type: z.enum(["personal", "team", "challenge"]),
    metric: z.enum([
      "trips_completed",
      "distance_km",
      "safety_score",
      "fuel_efficiency",
      "on_time_rate",
    ]),
    target_value: z
      .number({ invalid_type_error: "Target must be a number" })
      .min(1, "Target must be at least 1")
      .max(1_000_000, "Target too large"),
    xp_reward: z
      .number({ invalid_type_error: "XP must be a number" })
      .min(0, "XP cannot be negative")
      .max(100_000, "XP too large"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.end_date <= data.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be after start date",
      });
    }
    if (data.metric === "safety_score" || data.metric === "on_time_rate") {
      if (data.target_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["target_value"],
          message: "Score-based targets cannot exceed 100",
        });
      }
    }
  });

type GoalFormData = z.infer<typeof goalSchema>;

const initialForm: GoalFormData = {
  title: "",
  goal_type: "personal",
  metric: "trips_completed",
  target_value: 10,
  xp_reward: 100,
  start_date: todayStr(),
  end_date: "",
};

export const CreateGoalDialog = ({ onSubmit, driverId }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GoalFormData>(initialForm);
  const v = useFieldValidation(goalSchema);

  const errCls = (field: keyof GoalFormData) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const update = <K extends keyof GoalFormData>(field: K, value: GoalFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    v.handleChange(field as string, value);
  };

  const reset = () => {
    setForm({ ...initialForm, start_date: todayStr() });
    v.reset();
  };

  const handleSubmit = async () => {
    const result = v.validateAll(form as unknown as Record<string, unknown>);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} field${count > 1 ? "s" : ""} before saving`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        driver_id: driverId,
        current_value: 0,
        status: "active",
        target_value: Number(form.target_value),
        xp_reward: Number(form.xp_reward),
      });
      toast.success("Goal created");
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Create Goal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
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

          <div>
            <Label className="text-xs">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              className={cn("h-8 text-xs", errCls("title"))}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              onBlur={() => v.handleBlur("title", form.title)}
              placeholder="Complete 20 trips this week"
              maxLength={120}
            />
            {v.getError("title") && (
              <p className="text-[10px] text-destructive mt-1">{v.getError("title")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={form.goal_type}
                onValueChange={(val) => update("goal_type", val as GoalFormData["goal_type"])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Metric</Label>
              <Select
                value={form.metric}
                onValueChange={(val) => update("metric", val as GoalFormData["metric"])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trips_completed">Trips</SelectItem>
                  <SelectItem value="distance_km">Distance (km)</SelectItem>
                  <SelectItem value="safety_score">Safety Score</SelectItem>
                  <SelectItem value="fuel_efficiency">Fuel Efficiency</SelectItem>
                  <SelectItem value="on_time_rate">On-Time Rate %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Target Value <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                className={cn("h-8 text-xs", errCls("target_value"))}
                value={form.target_value}
                onChange={(e) => update("target_value", Number(e.target.value) || 0)}
                onBlur={() => v.handleBlur("target_value", form.target_value)}
              />
              {v.getError("target_value") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("target_value")}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">XP Reward</Label>
              <Input
                type="number"
                min={0}
                className={cn("h-8 text-xs", errCls("xp_reward"))}
                value={form.xp_reward}
                onChange={(e) => update("xp_reward", Number(e.target.value) || 0)}
                onBlur={() => v.handleBlur("xp_reward", form.xp_reward)}
              />
              {v.getError("xp_reward") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("xp_reward")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                className={cn("h-8 text-xs", errCls("start_date"))}
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                onBlur={() => v.handleBlur("start_date", form.start_date)}
              />
              {v.getError("start_date") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("start_date")}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                className={cn("h-8 text-xs", errCls("end_date"))}
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => update("end_date", e.target.value)}
                onBlur={() => v.handleBlur("end_date", form.end_date)}
              />
              {v.getError("end_date") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("end_date")}
                </p>
              )}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

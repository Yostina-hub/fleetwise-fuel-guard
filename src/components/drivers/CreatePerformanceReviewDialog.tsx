import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Plus, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useDriverPassengerFeedback } from "@/hooks/useDriverPassengerFeedback";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/lib/utils";

interface Props {
  driverId: string;
  driverName: string;
  onCreated: () => void;
}

const reviewSchema = z
  .object({
    review_type: z.enum(["monthly", "quarterly", "annual", "probation", "incident"]),
    review_period_start: z.string().min(1, "Period start is required"),
    review_period_end: z.string().min(1, "Period end is required"),
    reviewer_name: z
      .string()
      .trim()
      .max(100, "Reviewer name must be under 100 characters")
      .optional()
      .or(z.literal("")),
    safety_score: z.number().min(1).max(10),
    efficiency_score: z.number().min(1).max(10),
    compliance_score: z.number().min(1).max(10),
    customer_score: z.number().min(1).max(10),
    strengths: z.string().max(500, "Strengths must be under 500 characters").optional().or(z.literal("")),
    improvement_areas: z
      .string()
      .max(500, "Improvement areas must be under 500 characters")
      .optional()
      .or(z.literal("")),
    manager_comments: z
      .string()
      .max(2000, "Comments must be under 2000 characters")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (
      data.review_period_start &&
      data.review_period_end &&
      data.review_period_end < data.review_period_start
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_period_end"],
        message: "Period end must be on or after period start",
      });
    }
    const today = new Date().toISOString().split("T")[0];
    if (data.review_period_end && data.review_period_end > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_period_end"],
        message: "Period end cannot be in the future",
      });
    }
  });

type ReviewFormData = z.infer<typeof reviewSchema>;

const initialForm: ReviewFormData = {
  review_type: "monthly",
  review_period_start: "",
  review_period_end: "",
  reviewer_name: "",
  safety_score: 7,
  efficiency_score: 7,
  compliance_score: 7,
  customer_score: 7,
  strengths: "",
  improvement_areas: "",
  manager_comments: "",
};

export const CreatePerformanceReviewDialog = ({
  driverId,
  driverName,
  onCreated,
}: Props) => {
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: feedback } = useDriverPassengerFeedback(open ? driverId : null);

  const [form, setForm] = useState<ReviewFormData>(initialForm);
  const [prefilled, setPrefilled] = useState(false);
  const v = useFieldValidation(reviewSchema);

  // Prefill Customer (driver_rating) and Safety (punctuality_rating) on first open
  useEffect(() => {
    if (!open || prefilled || !feedback || feedback.totalRated === 0) return;
    const toTen = (val: number | null) => (val == null ? null : Math.round(val * 2 * 10) / 10);
    const customer = toTen(feedback.avgDriver90d ?? feedback.avgDriver);
    const safety = toTen(feedback.avgPunctuality90d ?? feedback.avgPunctuality);
    setForm((f) => ({
      ...f,
      customer_score: customer ?? f.customer_score,
      safety_score: safety ?? f.safety_score,
    }));
    setPrefilled(true);
  }, [open, feedback, prefilled]);

  useEffect(() => {
    if (!open) {
      setPrefilled(false);
      setForm(initialForm);
      v.reset();
    }
  }, [open]);

  const overall =
    (form.safety_score +
      form.efficiency_score +
      form.compliance_score +
      form.customer_score) /
    4;

  const update = <K extends keyof ReviewFormData>(field: K, value: ReviewFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    v.handleChange(field as never, value);
  };

  const errCls = (field: keyof ReviewFormData) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const handleSubmit = async () => {
    if (!organizationId) {
      toast.error("No organization context");
      return;
    }
    const result = v.validateAll(form as unknown as Record<string, unknown>);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} field${count > 1 ? "s" : ""} before submitting`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("driver_performance_reviews").insert({
        organization_id: organizationId,
        driver_id: driverId,
        review_type: form.review_type,
        review_period_start: form.review_period_start,
        review_period_end: form.review_period_end,
        reviewer_name: form.reviewer_name?.trim() || null,
        safety_score: form.safety_score,
        efficiency_score: form.efficiency_score,
        compliance_score: form.compliance_score,
        customer_score: form.customer_score,
        overall_score: Math.round(overall * 10) / 10,
        strengths: form.strengths
          ? form.strengths.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        improvement_areas: form.improvement_areas
          ? form.improvement_areas.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        manager_comments: form.manager_comments?.trim() || null,
        status: "completed",
      } as any);
      if (error) throw error;
      toast.success("Review submitted successfully");
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create review");
    } finally {
      setSaving(false);
    }
  };

  const ScoreSlider = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-bold text-primary">{value}/10</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={0.5}
        value={[value]}
        onValueChange={([val]) => onChange(val)}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Review — {driverName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Review Type</Label>
              <Select
                value={form.review_type}
                onValueChange={(val) =>
                  update("review_type", val as ReviewFormData["review_type"])
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reviewer Name</Label>
              <Input
                className={cn("h-8 text-xs", errCls("reviewer_name"))}
                value={form.reviewer_name}
                onChange={(e) => update("reviewer_name", e.target.value)}
                onBlur={() => v.handleBlur("reviewer_name", form.reviewer_name)}
                placeholder="Manager name"
                maxLength={100}
              />
              {v.getError("reviewer_name") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("reviewer_name")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Period Start <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                className={cn("h-8 text-xs", errCls("review_period_start"))}
                value={form.review_period_start}
                onChange={(e) => update("review_period_start", e.target.value)}
                onBlur={() =>
                  v.handleBlur("review_period_start", form.review_period_start)
                }
              />
              {v.getError("review_period_start") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("review_period_start")}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">
                Period End <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                min={form.review_period_start || undefined}
                max={new Date().toISOString().split("T")[0]}
                className={cn("h-8 text-xs", errCls("review_period_end"))}
                value={form.review_period_end}
                onChange={(e) => update("review_period_end", e.target.value)}
                onBlur={() => v.handleBlur("review_period_end", form.review_period_end)}
              />
              {v.getError("review_period_end") && (
                <p className="text-[10px] text-destructive mt-1">
                  {v.getError("review_period_end")}
                </p>
              )}
            </div>
          </div>

          {feedback && feedback.totalRated > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <p className="text-[11px] font-medium">
                    Passenger Feedback Reference (90d)
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px]">
                  {feedback.totalRated} ratings · {feedback.responseRate}% response
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-card border p-1.5">
                  <p className="text-[9px] text-muted-foreground">Driver</p>
                  <p className="text-sm font-bold tabular-nums">
                    {feedback.avgDriver90d?.toFixed(1) ?? "—"}
                    <span className="text-[9px] text-muted-foreground">/5</span>
                  </p>
                </div>
                <div className="rounded bg-card border p-1.5">
                  <p className="text-[9px] text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-bold tabular-nums">
                    {feedback.avgVehicle90d?.toFixed(1) ?? "—"}
                    <span className="text-[9px] text-muted-foreground">/5</span>
                  </p>
                </div>
                <div className="rounded bg-card border p-1.5">
                  <p className="text-[9px] text-muted-foreground">Punctuality</p>
                  <p className="text-sm font-bold tabular-nums">
                    {feedback.avgPunctuality90d?.toFixed(1) ?? "—"}
                    <span className="text-[9px] text-muted-foreground">/5</span>
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Customer & Safety scores were prefilled from passenger ratings — adjust as
                needed.
              </p>
            </div>
          )}

          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium">
              Scoring (Overall:{" "}
              <span className="text-primary font-bold">{overall.toFixed(1)}/10</span>)
            </p>
            <ScoreSlider
              label="Safety"
              value={form.safety_score}
              onChange={(val) => update("safety_score", val)}
            />
            <ScoreSlider
              label="Efficiency"
              value={form.efficiency_score}
              onChange={(val) => update("efficiency_score", val)}
            />
            <ScoreSlider
              label="Compliance"
              value={form.compliance_score}
              onChange={(val) => update("compliance_score", val)}
            />
            <ScoreSlider
              label="Customer Service"
              value={form.customer_score}
              onChange={(val) => update("customer_score", val)}
            />
          </div>

          <div>
            <Label className="text-xs">Strengths (comma-separated)</Label>
            <Input
              className={cn("h-8 text-xs", errCls("strengths"))}
              value={form.strengths}
              onChange={(e) => update("strengths", e.target.value)}
              onBlur={() => v.handleBlur("strengths", form.strengths)}
              placeholder="Punctual, safe driving, customer friendly"
              maxLength={500}
            />
            {v.getError("strengths") && (
              <p className="text-[10px] text-destructive mt-1">{v.getError("strengths")}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Improvement Areas (comma-separated)</Label>
            <Input
              className={cn("h-8 text-xs", errCls("improvement_areas"))}
              value={form.improvement_areas}
              onChange={(e) => update("improvement_areas", e.target.value)}
              onBlur={() => v.handleBlur("improvement_areas", form.improvement_areas)}
              placeholder="Fuel efficiency, route adherence"
              maxLength={500}
            />
            {v.getError("improvement_areas") && (
              <p className="text-[10px] text-destructive mt-1">
                {v.getError("improvement_areas")}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Manager Comments</Label>
            <Textarea
              className={cn("text-xs min-h-[60px]", errCls("manager_comments"))}
              value={form.manager_comments}
              onChange={(e) => update("manager_comments", e.target.value)}
              onBlur={() => v.handleBlur("manager_comments", form.manager_comments)}
              placeholder="Overall feedback..."
              maxLength={2000}
            />
            {v.getError("manager_comments") && (
              <p className="text-[10px] text-destructive mt-1">
                {v.getError("manager_comments")}
              </p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

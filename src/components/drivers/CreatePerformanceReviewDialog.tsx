import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useDriverPassengerFeedback } from "@/hooks/useDriverPassengerFeedback";

interface Props {
  driverId: string;
  driverName: string;
  onCreated: () => void;
}

export const CreatePerformanceReviewDialog = ({ driverId, driverName, onCreated }: Props) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: feedback } = useDriverPassengerFeedback(open ? driverId : null);

  const [form, setForm] = useState({
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
  });
  const [prefilled, setPrefilled] = useState(false);

  // Prefill Customer (from driver_rating) and Safety (from punctuality_rating) on first open with data
  useEffect(() => {
    if (!open || prefilled || !feedback || feedback.totalRated === 0) return;
    const toTen = (v: number | null) => (v == null ? null : Math.round(v * 2 * 10) / 10); // 1-5 → 2-10
    const customer = toTen(feedback.avgDriver90d ?? feedback.avgDriver);
    const safety = toTen(feedback.avgPunctuality90d ?? feedback.avgPunctuality);
    setForm(f => ({
      ...f,
      customer_score: customer ?? f.customer_score,
      safety_score: safety ?? f.safety_score,
    }));
    setPrefilled(true);
  }, [open, feedback, prefilled]);

  useEffect(() => { if (!open) setPrefilled(false); }, [open]);

  const overall = ((form.safety_score + form.efficiency_score + form.compliance_score + form.customer_score) / 4);

  const handleSubmit = async () => {
    if (!organizationId || !form.review_period_start || !form.review_period_end) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("driver_performance_reviews").insert({
        organization_id: organizationId,
        driver_id: driverId,
        review_type: form.review_type,
        review_period_start: form.review_period_start,
        review_period_end: form.review_period_end,
        reviewer_name: form.reviewer_name || null,
        safety_score: form.safety_score,
        efficiency_score: form.efficiency_score,
        compliance_score: form.compliance_score,
        customer_score: form.customer_score,
        overall_score: Math.round(overall * 10) / 10,
        strengths: form.strengths ? form.strengths.split(",").map(s => s.trim()).filter(Boolean) : [],
        improvement_areas: form.improvement_areas ? form.improvement_areas.split(",").map(s => s.trim()).filter(Boolean) : [],
        manager_comments: form.manager_comments || null,
        status: "completed",
      } as any);
      if (error) throw error;
      toast({ title: "Review submitted successfully" });
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast({ title: "Failed to create review", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-bold text-primary">{value}/10</span>
      </div>
      <Slider min={1} max={10} step={0.5} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />New Review</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Review — {driverName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Review Type</Label>
              <Select value={form.review_type} onValueChange={v => setForm(f => ({ ...f, review_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <Input className="h-8 text-xs" value={form.reviewer_name} onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))} placeholder="Manager name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Period Start</Label>
              <Input type="date" className="h-8 text-xs" value={form.review_period_start} onChange={e => setForm(f => ({ ...f, review_period_start: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Period End</Label>
              <Input type="date" className="h-8 text-xs" value={form.review_period_end} onChange={e => setForm(f => ({ ...f, review_period_end: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium">Scoring (Overall: <span className="text-primary font-bold">{overall.toFixed(1)}/10</span>)</p>
            <ScoreSlider label="Safety" value={form.safety_score} onChange={v => setForm(f => ({ ...f, safety_score: v }))} />
            <ScoreSlider label="Efficiency" value={form.efficiency_score} onChange={v => setForm(f => ({ ...f, efficiency_score: v }))} />
            <ScoreSlider label="Compliance" value={form.compliance_score} onChange={v => setForm(f => ({ ...f, compliance_score: v }))} />
            <ScoreSlider label="Customer Service" value={form.customer_score} onChange={v => setForm(f => ({ ...f, customer_score: v }))} />
          </div>

          <div>
            <Label className="text-xs">Strengths (comma-separated)</Label>
            <Input className="h-8 text-xs" value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} placeholder="Punctual, safe driving, customer friendly" />
          </div>
          <div>
            <Label className="text-xs">Improvement Areas (comma-separated)</Label>
            <Input className="h-8 text-xs" value={form.improvement_areas} onChange={e => setForm(f => ({ ...f, improvement_areas: e.target.value }))} placeholder="Fuel efficiency, route adherence" />
          </div>
          <div>
            <Label className="text-xs">Manager Comments</Label>
            <Textarea className="text-xs min-h-[60px]" value={form.manager_comments} onChange={e => setForm(f => ({ ...f, manager_comments: e.target.value }))} placeholder="Overall feedback..." />
          </div>

          <Button onClick={handleSubmit} disabled={saving || !form.review_period_start || !form.review_period_end} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

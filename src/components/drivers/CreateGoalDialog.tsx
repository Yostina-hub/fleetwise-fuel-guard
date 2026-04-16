import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Target } from "lucide-react";

interface Props {
  onSubmit: (goal: any) => Promise<void>;
  driverId: string;
}

export const CreateGoalDialog = ({ onSubmit, driverId }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    goal_type: "personal",
    metric: "trips_completed",
    target_value: 10,
    xp_reward: 100,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const handleSubmit = async () => {
    if (!form.title || !form.end_date) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        driver_id: driverId,
        current_value: 0,
        status: "active",
        target_value: Number(form.target_value),
        xp_reward: Number(form.xp_reward),
      });
      setOpen(false);
      setForm({ title: "", goal_type: "personal", metric: "trips_completed", target_value: 10, xp_reward: 100, start_date: new Date().toISOString().split("T")[0], end_date: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5"><Plus className="w-3.5 h-3.5" />New Goal</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-4 h-4" />Create Goal</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div><Label className="text-xs">Title</Label><Input className="h-8 text-xs" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Complete 20 trips this week" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Type</Label>
              <Select value={form.goal_type} onValueChange={v => setForm(f => ({ ...f, goal_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Metric</Label>
              <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
            <div><Label className="text-xs">Target Value</Label><Input type="number" className="h-8 text-xs" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">XP Reward</Label><Input type="number" className="h-8 text-xs" value={form.xp_reward} onChange={e => setForm(f => ({ ...f, xp_reward: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Start Date</Label><Input type="date" className="h-8 text-xs" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><Label className="text-xs">End Date</Label><Input type="date" className="h-8 text-xs" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSubmit} disabled={saving || !form.title || !form.end_date} className="w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

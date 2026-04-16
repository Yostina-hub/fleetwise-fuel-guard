import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Loader2 } from "lucide-react";

interface Props {
  onSubmit: (reward: any) => Promise<void>;
  driverId: string;
}

export const IssueRewardDialog = ({ onSubmit, driverId }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reward_type: "recognition",
    title: "",
    description: "",
    value_amount: 0,
    currency: "ETB",
  });

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await onSubmit({
        driver_id: driverId,
        reward_type: form.reward_type,
        title: form.title,
        description: form.description || null,
        value_amount: form.value_amount || null,
        currency: form.currency,
        issued_at: new Date().toISOString(),
        status: "active",
      });
      setOpen(false);
      setForm({ reward_type: "recognition", title: "", description: "", value_amount: 0, currency: "ETB" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5"><Gift className="w-3.5 h-3.5" />Issue Reward</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gift className="w-4 h-4" />Issue Reward</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div><Label className="text-xs">Title</Label><Input className="h-8 text-xs" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Best Driver of the Month" /></div>
          <div><Label className="text-xs">Type</Label>
            <Select value={form.reward_type} onValueChange={v => setForm(f => ({ ...f, reward_type: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recognition">⭐ Recognition</SelectItem>
                <SelectItem value="bonus">💰 Bonus</SelectItem>
                <SelectItem value="gift_card">🎁 Gift Card</SelectItem>
                <SelectItem value="time_off">🏖️ Time Off</SelectItem>
                <SelectItem value="certificate">📜 Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Value Amount</Label><Input type="number" className="h-8 text-xs" value={form.value_amount} onChange={e => setForm(f => ({ ...f, value_amount: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs">Currency</Label><Input className="h-8 text-xs" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs">Description</Label><Input className="h-8 text-xs" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details" /></div>
          <Button onClick={handleSubmit} disabled={saving || !form.title} className="w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Issue Reward
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

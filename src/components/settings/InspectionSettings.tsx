import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Save, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_LEAD_DAYS = [60, 30, 7, 1];

export const InspectionSettings = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [leadDays, setLeadDays] = useState<number[]>(DEFAULT_LEAD_DAYS);
  const [pretripRequired, setPretripRequired] = useState(true);
  const [posttripAuto, setPosttripAuto] = useState(true);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newDay, setNewDay] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const { data } = await supabase
        .from("inspection_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (data) {
        setLeadDays(data.annual_lead_days || DEFAULT_LEAD_DAYS);
        setPretripRequired(data.pretrip_required_for_dispatch ?? true);
        setPosttripAuto(data.posttrip_auto_create ?? true);
        setRecipients(data.email_recipients || []);
      }
      setLoading(false);
    })();
  }, [organizationId]);

  const save = async () => {
    if (!organizationId) return;
    setSaving(true);
    const { error } = await supabase
      .from("inspection_settings")
      .upsert({
        organization_id: organizationId,
        annual_lead_days: leadDays.sort((a, b) => b - a),
        pretrip_required_for_dispatch: pretripRequired,
        posttrip_auto_create: posttripAuto,
        email_recipients: recipients,
      }, { onConflict: "organization_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inspection settings saved" });
    }
  };

  const addLeadDay = () => {
    const n = parseInt(newDay, 10);
    if (!isNaN(n) && n > 0 && !leadDays.includes(n)) {
      setLeadDays([...leadDays, n].sort((a, b) => b - a));
      setNewDay("");
    }
  };

  const addEmail = () => {
    const e = newEmail.trim();
    if (e && /\S+@\S+\.\S+/.test(e) && !recipients.includes(e)) {
      setRecipients([...recipients, e]);
      setNewEmail("");
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5" />
          Vehicle Inspection Settings
        </CardTitle>
        <CardDescription>
          Configure annual inspection reminder windows, pre-trip enforcement, and automated post-trip inspection creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Annual Reminder Lead Days</Label>
          <p className="text-xs text-muted-foreground">Days before due date when reminders fire (calendar entry, alert, and email).</p>
          <div className="flex flex-wrap gap-2">
            {leadDays.map(d => (
              <Badge key={d} variant="secondary" className="gap-1.5 pr-1">
                {d}d
                <button onClick={() => setLeadDays(leadDays.filter(x => x !== d))} className="hover:bg-destructive/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 max-w-xs">
            <Input type="number" min={1} placeholder="Add day..." value={newDay} onChange={e => setNewDay(e.target.value)} onKeyDown={e => e.key === "Enter" && addLeadDay()} />
            <Button size="sm" variant="outline" onClick={addLeadDay}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Require pre-trip inspection before dispatch</Label>
            <p className="text-xs text-muted-foreground">Block trip start until a passing pre-trip inspection is recorded.</p>
          </div>
          <Switch checked={pretripRequired} onCheckedChange={setPretripRequired} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Auto-create post-trip inspection on trip end</Label>
            <p className="text-xs text-muted-foreground">When a dispatch completes, a post-trip inspection record is generated automatically.</p>
          </div>
          <Switch checked={posttripAuto} onCheckedChange={setPosttripAuto} />
        </div>

        <div className="space-y-2">
          <Label>Email Recipients (additional)</Label>
          <p className="text-xs text-muted-foreground">Extra addresses to copy on inspection reminders, on top of vehicle owner & fleet manager.</p>
          <div className="flex flex-wrap gap-2">
            {recipients.map(e => (
              <Badge key={e} variant="secondary" className="gap-1.5 pr-1">
                {e}
                <button onClick={() => setRecipients(recipients.filter(x => x !== e))} className="hover:bg-destructive/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <Input type="email" placeholder="name@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmail()} />
            <Button size="sm" variant="outline" onClick={addEmail}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InspectionSettings;

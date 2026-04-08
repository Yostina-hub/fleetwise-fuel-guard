import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Shield, AlertTriangle, CheckCircle2, Clock, FileSearch, Plus } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface MVRRecord {
  id: string;
  driver_id: string;
  pull_date: string;
  report_source: string | null;
  violation_count: number;
  points_total: number;
  risk_level: string;
  suspensions_found: boolean;
  dui_found: boolean;
  review_status: string;
  notes: string | null;
  next_pull_date: string | null;
  created_at: string;
}

export const DriverMVRPanel = () => {
  const { organizationId } = useOrganization();
  const [records, setRecords] = useState<MVRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRecords = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_mvr_records")
      .select("*")
      .eq("organization_id", organizationId)
      .order("pull_date", { ascending: false })
      .limit(100);
    setRecords((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [organizationId]);

  const riskColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "moderate": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "reviewed": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "flagged": return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const criticalCount = records.filter(r => r.risk_level === "critical" || r.risk_level === "high").length;
  const pendingCount = records.filter(r => r.review_status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Motor Vehicle Records (MVR)</h3>
          <p className="text-sm text-muted-foreground">Track driving records, violations, and risk assessments</p>
        </div>
        <NewMVRDialog organizationId={organizationId} onSuccess={fetchRecords} open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <FileSearch className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{records.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Pulls</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-2xl font-bold">{criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">High/Critical Risk</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending Review</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Shield className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{records.filter(r => r.review_status === "cleared").length}</p>
          <p className="text-[10px] text-muted-foreground">Cleared</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent MVR Pulls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No MVR records found</p>
              <p className="text-xs mt-1">Add records to track driver driving histories</p>
            </div>
          ) : (
            records.slice(0, 20).map(rec => (
              <div key={rec.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                {statusIcon(rec.review_status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Pull: {format(new Date(rec.pull_date), "MMM dd, yyyy")}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{rec.violation_count} violations · {rec.points_total} pts</span>
                    {rec.report_source && <span className="text-[10px] text-muted-foreground">via {rec.report_source}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${riskColor(rec.risk_level)}`}>{rec.risk_level}</Badge>
                  {rec.suspensions_found && <Badge variant="destructive" className="text-[10px]">Suspension</Badge>}
                  {rec.dui_found && <Badge variant="destructive" className="text-[10px]">DUI</Badge>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const NewMVRDialog = ({ organizationId, onSuccess, open, onOpenChange }: { organizationId: string | null; onSuccess: () => void; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [driverId, setDriverId] = useState("");
  const [riskLevel, setRiskLevel] = useState("low");
  const [violationCount, setViolationCount] = useState("0");
  const [pointsTotal, setPointsTotal] = useState("0");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (!organizationId || !open) return;
    supabase.from("drivers").select("id, first_name, last_name").eq("organization_id", organizationId).then(({ data }) => setDrivers(data || []));
  }, [organizationId, open]);

  const handleSave = async () => {
    if (!organizationId || !driverId) return;
    setSaving(true);
    const { error } = await supabase.from("driver_mvr_records").insert({
      organization_id: organizationId,
      driver_id: driverId,
      risk_level: riskLevel,
      violation_count: parseInt(violationCount) || 0,
      points_total: parseInt(pointsTotal) || 0,
      report_source: source || null,
      notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("MVR record added");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add MVR Pull</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New MVR Record</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Risk Level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Violations</Label><Input type="number" value={violationCount} onChange={e => setViolationCount(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Points</Label><Input type="number" value={pointsTotal} onChange={e => setPointsTotal(e.target.value)} /></div>
            <div><Label>Source</Label><Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g., DMV" /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <Button onClick={handleSave} disabled={saving || !driverId} className="w-full">{saving ? "Saving..." : "Save Record"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

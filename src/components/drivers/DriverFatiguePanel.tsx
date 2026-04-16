import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDriverFatigue } from "@/hooks/useDriverFatigue";
import { 
  Clock, AlertTriangle, Coffee, Moon, Activity, Eye, Car, Shield,
  CheckCircle, XCircle, Loader2, Zap, Brain, Plus
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DriverFatiguePanelProps {
  driverId: string;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'low': return 'text-green-500 bg-green-500/10 border-green-500/30';
    case 'moderate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
    default: return 'text-muted-foreground bg-muted border-muted-foreground/30';
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'low': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'moderate': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <Activity className="w-5 h-5" />;
  }
};

export const DriverFatiguePanel = ({ driverId }: DriverFatiguePanelProps) => {
  const { 
    hosLogs, fatigueIndicators, latestFatigue, hosSummary, HOS_LIMITS, isLoading, logHOS, recordFatigue
  } = useDriverFatigue(driverId);

  const [showHOSDialog, setShowHOSDialog] = useState(false);
  const [hosForm, setHosForm] = useState({
    status: "driving" as string,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: "",
    location_start: "",
    notes: "",
  });

  const [showFatigueDialog, setShowFatigueDialog] = useState(false);
  const [fatigueForm, setFatigueForm] = useState({
    fatigue_risk_level: "low" as string,
    risk_score: 20,
    driving_hours_24h: 0,
    hours_since_rest: 0,
    eye_closure_events: 0,
    lane_departure_events: 0,
    data_source: "manual_entry",
  });

  const submitHOS = async () => {
    const startTime = new Date(hosForm.start_time);
    const endTime = hosForm.end_time ? new Date(hosForm.end_time) : null;
    const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : null;

    await logHOS.mutateAsync({
      driver_id: driverId,
      vehicle_id: null,
      log_date: startTime.toISOString().split("T")[0],
      status: hosForm.status as any,
      start_time: startTime.toISOString(),
      end_time: endTime?.toISOString() || null,
      duration_minutes: duration,
      location_start: hosForm.location_start || null,
      location_end: null,
      lat_start: null, lng_start: null, lat_end: null, lng_end: null,
      odometer_start: null, odometer_end: null,
      notes: hosForm.notes || null,
      is_violation: false,
      violation_type: null,
    });
    setShowHOSDialog(false);
  };

  const submitFatigue = async () => {
    await recordFatigue.mutateAsync({
      driver_id: driverId,
      recorded_at: new Date().toISOString(),
      fatigue_risk_level: fatigueForm.fatigue_risk_level as any,
      risk_score: fatigueForm.risk_score,
      driving_hours_24h: fatigueForm.driving_hours_24h,
      driving_hours_8_days: null,
      hours_since_rest: fatigueForm.hours_since_rest,
      consecutive_driving_minutes: null,
      reaction_time_ms: null,
      eye_closure_events: fatigueForm.eye_closure_events,
      lane_departure_events: fatigueForm.lane_departure_events,
      yawning_detected: null,
      hard_braking_events: null,
      recommendations: [],
      data_source: fatigueForm.data_source,
    });
    setShowFatigueDialog(false);
  };

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const drivingPercent = (hosSummary.drivingHours24h / HOS_LIMITS.driving_limit_hours) * 100;
  const weeklyPercent = (hosSummary.drivingHours8Days / HOS_LIMITS.weekly_limit_hours_70) * 100;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Dialog open={showHOSDialog} onOpenChange={setShowHOSDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Log HOS Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Log Hours of Service</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={hosForm.status} onValueChange={v => setHosForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driving">Driving</SelectItem>
                    <SelectItem value="on_duty_not_driving">On Duty (Not Driving)</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                    <SelectItem value="sleeper_berth">Sleeper Berth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Start Time</Label><Input type="datetime-local" className="h-8 text-xs" value={hosForm.start_time} onChange={e => setHosForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                <div><Label className="text-xs">End Time</Label><Input type="datetime-local" className="h-8 text-xs" value={hosForm.end_time} onChange={e => setHosForm(f => ({ ...f, end_time: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs">Location</Label><Input className="h-8 text-xs" value={hosForm.location_start} onChange={e => setHosForm(f => ({ ...f, location_start: e.target.value }))} placeholder="e.g. Addis Ababa" /></div>
              <div><Label className="text-xs">Notes</Label><Textarea className="text-xs min-h-[50px]" value={hosForm.notes} onChange={e => setHosForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={submitHOS} disabled={logHOS.isPending}>
                {logHOS.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Log Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showFatigueDialog} onOpenChange={setShowFatigueDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Record Fatigue</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Fatigue Assessment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Risk Level</Label>
                  <Select value={fatigueForm.fatigue_risk_level} onValueChange={v => setFatigueForm(f => ({ ...f, fatigue_risk_level: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Risk Score (0-100)</Label>
                  <Input type="number" min={0} max={100} className="h-8 text-xs" value={fatigueForm.risk_score} onChange={e => setFatigueForm(f => ({ ...f, risk_score: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Driving Hours (24h)</Label>
                  <Input type="number" step="0.5" className="h-8 text-xs" value={fatigueForm.driving_hours_24h} onChange={e => setFatigueForm(f => ({ ...f, driving_hours_24h: Number(e.target.value) }))} />
                </div>
                <div><Label className="text-xs">Hours Since Rest</Label>
                  <Input type="number" step="0.5" className="h-8 text-xs" value={fatigueForm.hours_since_rest} onChange={e => setFatigueForm(f => ({ ...f, hours_since_rest: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Eye Closure Events</Label>
                  <Input type="number" className="h-8 text-xs" value={fatigueForm.eye_closure_events} onChange={e => setFatigueForm(f => ({ ...f, eye_closure_events: Number(e.target.value) }))} />
                </div>
                <div><Label className="text-xs">Lane Departures</Label>
                  <Input type="number" className="h-8 text-xs" value={fatigueForm.lane_departure_events} onChange={e => setFatigueForm(f => ({ ...f, lane_departure_events: Number(e.target.value) }))} />
                </div>
              </div>
              <div><Label className="text-xs">Data Source</Label>
                <Select value={fatigueForm.data_source} onValueChange={v => setFatigueForm(f => ({ ...f, data_source: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_entry">Manual Entry</SelectItem>
                    <SelectItem value="dashcam_ai">Dashcam AI</SelectItem>
                    <SelectItem value="wearable">Wearable Device</SelectItem>
                    <SelectItem value="eld">ELD System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={submitFatigue} disabled={recordFatigue.isPending}>
                {recordFatigue.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Fatigue Status */}
      {latestFatigue && (
        <Card className={cn("glass-strong border-2", getRiskColor(latestFatigue.fatigue_risk_level))}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRiskIcon(latestFatigue.fatigue_risk_level)}
                <div>
                  <CardTitle>Current Fatigue Status</CardTitle>
                  <CardDescription>Last updated: {format(new Date(latestFatigue.recorded_at), "MMM d, h:mm a")}</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className={cn("text-3xl font-bold",
                  latestFatigue.risk_score >= 70 ? "text-red-500" :
                  latestFatigue.risk_score >= 50 ? "text-orange-500" :
                  latestFatigue.risk_score >= 30 ? "text-yellow-500" : "text-green-500"
                )}>{latestFatigue.risk_score}</div>
                <div className="text-sm text-muted-foreground">Risk Score</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Driving 24h</span></div>
                <p className="text-xl font-bold">{latestFatigue.driving_hours_24h?.toFixed(1) || 0}h</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1"><Moon className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Since Rest</span></div>
                <p className="text-xl font-bold">{latestFatigue.hours_since_rest?.toFixed(1) || 0}h</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1"><Eye className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Eye Closures</span></div>
                <p className="text-xl font-bold">{latestFatigue.eye_closure_events || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1"><Car className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Lane Departures</span></div>
                <p className="text-xl font-bold">{latestFatigue.lane_departure_events || 0}</p>
              </div>
            </div>
            {latestFatigue.recommendations && latestFatigue.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">AI Recommendations:</p>
                <ul className="space-y-1">
                  {(latestFatigue.recommendations as string[]).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm"><Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{rec}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hours of Service Summary */}
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /><CardTitle>Hours of Service (HOS)</CardTitle></div>
          <CardDescription>Federal compliance tracking and remaining drive time</CardDescription>
        </CardHeader>
        <CardContent>
          {hosSummary.warnings.length > 0 && (
            <div className="space-y-2 mb-6">
              {hosSummary.warnings.map((warning, idx) => (
                <Alert key={idx} variant="destructive" className="bg-orange-500/10 border-orange-500/30">
                  <AlertTriangle className="h-4 w-4" /><AlertTitle>Warning</AlertTitle><AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className={cn("flex items-center justify-between p-4 rounded-lg mb-6",
            hosSummary.canDrive ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
          )}>
            <div className="flex items-center gap-3">
              {hosSummary.canDrive ? <CheckCircle className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
              <div>
                <p className="font-semibold">{hosSummary.canDrive ? "Cleared to Drive" : "Rest Required"}</p>
                <p className="text-sm text-muted-foreground">
                  {hosSummary.canDrive ? `${hosSummary.remainingDriveTime.toFixed(1)} hours remaining today` : "HOS limits exceeded - mandatory rest period"}
                </p>
              </div>
            </div>
            {hosSummary.canDrive && (
              <Badge className="bg-green-500/20 text-green-500">{Math.floor(hosSummary.remainingDriveTime)}h {Math.round((hosSummary.remainingDriveTime % 1) * 60)}m left</Badge>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Daily Driving ({HOS_LIMITS.driving_limit_hours}h limit)</span>
                <span className={drivingPercent >= 90 ? "text-red-500 font-bold" : ""}>{hosSummary.drivingHours24h.toFixed(1)} / {HOS_LIMITS.driving_limit_hours}h</span>
              </div>
              <Progress value={Math.min(drivingPercent, 100)} className={cn("h-3", drivingPercent >= 90 && "[&>div]:bg-red-500")} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>8-Day Driving ({HOS_LIMITS.weekly_limit_hours_70}h limit)</span>
                <span className={weeklyPercent >= 90 ? "text-red-500 font-bold" : ""}>{hosSummary.drivingHours8Days.toFixed(1)} / {HOS_LIMITS.weekly_limit_hours_70}h</span>
              </div>
              <Progress value={Math.min(weeklyPercent, 100)} className={cn("h-3", weeklyPercent >= 90 && "[&>div]:bg-red-500")} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Time Since 30-min Break ({HOS_LIMITS.break_required_after_hours}h limit)</span>
                <span className={hosSummary.hoursSinceLastBreak >= 7 ? "text-orange-500 font-bold" : ""}>{hosSummary.hoursSinceLastBreak.toFixed(1)}h</span>
              </div>
              <Progress value={(hosSummary.hoursSinceLastBreak / HOS_LIMITS.break_required_after_hours) * 100} className={cn("h-3", hosSummary.hoursSinceLastBreak >= 7 && "[&>div]:bg-orange-500")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Coffee className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{hosSummary.restHours24h.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Rest (24h)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Zap className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{Math.round(hosSummary.consecutiveDrivingMinutes)}m</p>
              <p className="text-xs text-muted-foreground">Continuous Driving</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{hosSummary.violations}</p>
              <p className="text-xs text-muted-foreground">Violations (8d)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent HOS Logs */}
      {hosLogs.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /><CardTitle>Recent HOS Logs</CardTitle></div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {hosLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn("text-[10px]",
                        log.status === "driving" ? "bg-blue-500/10 text-blue-400" :
                        log.status === "off_duty" || log.status === "sleeper_berth" ? "bg-green-500/10 text-green-400" :
                        "bg-amber-500/10 text-amber-400"
                      )}>{log.status.replace(/_/g, " ")}</Badge>
                      <div>
                        <p className="text-xs">{format(new Date(log.start_time), "MMM d, h:mm a")}</p>
                        {log.location_start && <p className="text-[10px] text-muted-foreground">{log.location_start}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium">{log.duration_minutes ? `${Math.round(log.duration_minutes / 60 * 10) / 10}h` : "Active"}</span>
                      {log.is_violation && <Badge variant="destructive" className="text-[10px] ml-2">Violation</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Fatigue History */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /><CardTitle>Fatigue History</CardTitle></div>
        </CardHeader>
        <CardContent>
          {fatigueIndicators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No fatigue data recorded yet</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {fatigueIndicators.map((indicator) => (
                  <div key={indicator.id} className={cn("flex items-center justify-between p-3 rounded-lg border", getRiskColor(indicator.fatigue_risk_level))}>
                    <div className="flex items-center gap-3">
                      {getRiskIcon(indicator.fatigue_risk_level)}
                      <div>
                        <p className="font-medium capitalize">{indicator.fatigue_risk_level} Risk</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(indicator.recorded_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{indicator.risk_score}</p>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

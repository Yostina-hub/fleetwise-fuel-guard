import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { CalendarDays, Clock, LogIn, Plane, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { type Employee, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS } from "@/hooks/useEmployees";

interface DriverAttendanceManagementProps {
  driverId: string;
  driverName: string;
  employeeId?: string;
  employees?: Employee[];
}

interface AttendanceRecord {
  id: string;
  driver_id: string;
  employee_id: string | null;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  source: string;
  shift_type: string;
  total_hours: number;
  overtime_hours: number;
  status: string;
  notes: string | null;
}

interface LeaveRequest {
  id: string;
  driver_id: string;
  employee_id: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string;
  created_at: string;
}

const ATT_PREFS_KEY = "driver.attendance.prefs.v1";

export const DriverAttendanceManagement = ({ driverId, driverName, employeeId, employees = [] }: DriverAttendanceManagementProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const initialPrefs = (() => {
    try { return JSON.parse(localStorage.getItem(ATT_PREFS_KEY) || "{}"); } catch { return {}; }
  })();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showClockDialog, setShowClockDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [search, setSearch] = useState<string>(initialPrefs.search ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(initialPrefs.statusFilter ?? "all");
  const [clockForm, setClockForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), check_in: "08:00", check_out: "17:00", shift_type: "morning", notes: "" });
  const [leaveForm, setLeaveForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });

  useEffect(() => {
    try { localStorage.setItem(ATT_PREFS_KEY, JSON.stringify({ search, statusFilter })); } catch { /* ignore */ }
  }, [search, statusFilter]);

  const isAllMode = !employeeId && !driverId;

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    let attQuery = supabase.from("driver_attendance").select("*").eq("organization_id", organizationId)
      .gte("date", monthStart).lte("date", monthEnd).order("date");
    let leaveQuery = supabase.from("driver_leave_requests").select("*").eq("organization_id", organizationId)
      .order("created_at", { ascending: false }).limit(50);

    if (driverId) {
      attQuery = attQuery.eq("driver_id", driverId);
      leaveQuery = leaveQuery.eq("driver_id", driverId);
    }

    const [attRes, leaveRes] = await Promise.all([attQuery, leaveQuery]);
    setAttendance((attRes.data as AttendanceRecord[]) || []);
    setLeaves((leaveRes.data as LeaveRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [driverId, employeeId, organizationId, currentMonth]);

  const getEmpName = (id: string) => {
    const emp = employees.find(e => e.id === id || e.driver_id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const totalPresent = attendance.filter(a => a.status === "present").length;
  const totalLate = attendance.filter(a => a.status === "late").length;
  const totalAbsent = attendance.filter(a => a.status === "absent").length;
  const totalHours = attendance.reduce((s, a) => s + (a.total_hours || 0), 0);
  const totalOvertime = attendance.reduce((s, a) => s + (a.overtime_hours || 0), 0);
  const uniqueEmployees = new Set(attendance.map(a => a.employee_id || a.driver_id)).size;

  const filteredLeaves = useMemo(() => {
    let result = leaves;
    if (statusFilter !== "all") result = result.filter(l => l.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const name = getEmpName(l.employee_id || l.driver_id).toLowerCase();
        return name.includes(q) || l.leave_type.toLowerCase().includes(q);
      });
    }
    return result;
  }, [leaves, statusFilter, search, employees]);

  const statusColor = (s: string) => {
    switch (s) {
      case "present":  return "bg-success/20 text-success border-success/30";
      case "late":     return "bg-warning/20 text-warning border-warning/30";
      case "absent":   return "bg-destructive/20 text-destructive border-destructive/30";
      case "leave":    return "bg-primary/20 text-primary border-primary/30";
      case "half_day": return "bg-secondary/20 text-secondary border-secondary/30";
      default:         return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleClockIn = async () => {
    if (!organizationId || (!driverId && !employeeId)) {
      toast({ title: "Select an employee first", variant: "destructive" });
      return;
    }
    const checkIn = new Date(`${clockForm.date}T${clockForm.check_in}`);
    const checkOut = new Date(`${clockForm.date}T${clockForm.check_out}`);
    const hours = (checkOut.getTime() - checkIn.getTime()) / 3600000;

    const { error } = await supabase.from("driver_attendance").insert({
      organization_id: organizationId,
      driver_id: driverId || null,
      date: clockForm.date,
      check_in_time: checkIn.toISOString(),
      check_out_time: checkOut.toISOString(),
      source: "manual",
      shift_type: clockForm.shift_type,
      total_hours: Math.max(0, hours),
      overtime_hours: Math.max(0, hours - 8),
      status: "present",
      notes: clockForm.notes || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Attendance recorded" }); setShowClockDialog(false); fetchData(); }
  };

  const handleLeaveRequest = async () => {
    if (!organizationId || !leaveForm.start_date || !leaveForm.end_date || (!driverId && !employeeId)) {
      toast({ title: "Select an employee first", variant: "destructive" });
      return;
    }
    const days = Math.ceil((new Date(leaveForm.end_date).getTime() - new Date(leaveForm.start_date).getTime()) / 86400000) + 1;
    const { error } = await supabase.from("driver_leave_requests").insert({
      organization_id: organizationId,
      driver_id: driverId || null,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      total_days: days,
      reason: leaveForm.reason || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Leave request submitted" }); setShowLeaveDialog(false); setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" }); fetchData(); }
  };

  const approveLeave = async (id: string) => {
    await supabase.from("driver_leave_requests").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  const rejectLeave = async (id: string) => {
    await supabase.from("driver_leave_requests").update({ status: "rejected" }).eq("id", id);
    fetchData();
  };

  // Calendar view only for single employee
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const attendanceMap = new Map(attendance.map(a => [a.date, a]));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Present", value: totalPresent, icon: CalendarDays, color: "text-emerald-400" },
          { label: "Late", value: totalLate, icon: Clock, color: "text-amber-400" },
          { label: "Absent", value: totalAbsent, icon: CalendarDays, color: "text-red-400" },
          { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock, color: "text-primary" },
          { label: "Overtime", value: totalOvertime.toFixed(1) + "h", icon: Clock, color: "text-purple-400" },
          ...(isAllMode ? [{ label: "Employees", value: uniqueEmployees, icon: Users, color: "text-blue-400" }] : []),
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          {!isAllMode && (
            <>
              <Dialog open={showClockDialog} onOpenChange={setShowClockDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><LogIn className="w-3.5 h-3.5 mr-1" /> Clock In/Out</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Manual Clock In/Out</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input type="date" value={clockForm.date} onChange={e => setClockForm(f => ({ ...f, date: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-muted-foreground">Check In</label>
                        <Input type="time" value={clockForm.check_in} onChange={e => setClockForm(f => ({ ...f, check_in: e.target.value }))} /></div>
                      <div><label className="text-xs text-muted-foreground">Check Out</label>
                        <Input type="time" value={clockForm.check_out} onChange={e => setClockForm(f => ({ ...f, check_out: e.target.value }))} /></div>
                    </div>
                    <Select value={clockForm.shift_type} onValueChange={v => setClockForm(f => ({ ...f, shift_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["morning", "afternoon", "night", "split"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="Notes..." value={clockForm.notes} onChange={e => setClockForm(f => ({ ...f, notes: e.target.value }))} />
                    <Button className="w-full" onClick={handleClockIn}>Save Attendance</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plane className="w-3.5 h-3.5 mr-1" /> Request Leave</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Leave Request</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Select value={leaveForm.leave_type} onValueChange={v => setLeaveForm(f => ({ ...f, leave_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["annual", "sick", "unpaid", "emergency", "maternity", "paternity"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-muted-foreground">Start</label>
                        <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                      <div><label className="text-xs text-muted-foreground">End</label>
                        <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                    </div>
                    <Textarea placeholder="Reason..." value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
                    <Button className="w-full" onClick={handleLeaveRequest}>Submit Request</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Calendar Grid (single employee) or Table (all employees) */}
      {!isAllMode ? (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => <div key={`e-${i}`} />)}
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const record = attendanceMap.get(dateStr);
                const weekend = isWeekend(day);
                return (
                  <div key={dateStr} className={`rounded-md p-1.5 text-center text-xs border transition-colors ${record ? statusColor(record.status) : weekend ? "bg-muted/30 border-transparent" : "border-transparent hover:bg-muted/50"}`}>
                    <div className="font-medium">{format(day, "d")}</div>
                    {record && (
                      <div className="text-[9px] mt-0.5">
                        {record.total_hours > 0 ? `${record.total_hours.toFixed(1)}h` : record.status}
                        {record.source === "auto_trip" && <span className="block text-[8px] opacity-60">auto</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Attendance Records — {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No attendance records this month</p>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-6 gap-2 text-[10px] font-medium text-muted-foreground px-2 pb-1 border-b">
                  <span>Employee</span><span>Date</span><span>In</span><span>Out</span><span>Hours</span><span>Status</span>
                </div>
                {attendance.map(a => (
                  <div key={a.id} className="grid grid-cols-6 gap-2 items-center text-xs px-2 py-1.5 rounded hover:bg-muted/50">
                    <span className="font-medium truncate">{getEmpName(a.employee_id || a.driver_id)}</span>
                    <span>{format(new Date(a.date), "MMM d")}</span>
                    <span>{a.check_in_time ? format(new Date(a.check_in_time), "HH:mm") : "—"}</span>
                    <span>{a.check_out_time ? format(new Date(a.check_out_time), "HH:mm") : "—"}</span>
                    <span>{a.total_hours?.toFixed(1) || "0"}h</span>
                    <Badge variant="outline" className={`text-[9px] capitalize ${statusColor(a.status)}`}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Requests */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Plane className="w-4 h-4 text-primary" /> Leave Requests</CardTitle>
            {isAllMode && (
              <div className="flex gap-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 pl-6 text-xs w-36" />
                </div>
                {["all", "pending", "approved", "rejected"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredLeaves.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No leave requests</p>
          ) : filteredLeaves.map(l => (
            <div key={l.id} className="flex items-center justify-between p-2 rounded-lg border text-xs">
              <div className="flex items-center gap-3">
                {isAllMode && <span className="font-semibold">{getEmpName(l.employee_id || l.driver_id)}</span>}
                <Badge variant="outline" className="capitalize text-[10px]">{l.leave_type}</Badge>
                <span>{format(new Date(l.start_date), "MMM d")} — {format(new Date(l.end_date), "MMM d, yyyy")}</span>
                <span className="text-muted-foreground">({l.total_days}d)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColor(l.status === "approved" ? "present" : l.status === "rejected" ? "absent" : "late")}>{l.status}</Badge>
                {l.status === "pending" && (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400" onClick={() => approveLeave(l.id)}>Approve</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400" onClick={() => rejectLeave(l.id)}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

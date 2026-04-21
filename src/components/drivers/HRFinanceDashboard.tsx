import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmployees, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS, type EmployeeType } from "@/hooks/useEmployees";
import { format, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import {
  Users, Briefcase, DollarSign, CalendarDays, Clock, TrendingUp,
  AlertTriangle, Plane, CheckCircle2, Wallet, Handshake, Award,
  Wrench, Radio, Building2,
} from "lucide-react";

interface ContractSummary {
  id: string;
  driver_id: string;
  employee_id: string | null;
  status: string;
  employment_type: string;
  end_date: string | null;
  pay_rate: number | null;
  pay_currency: string;
}

interface PayrollSummary {
  id: string;
  driver_id: string;
  employee_id: string | null;
  gross_pay: number;
  net_pay: number;
  total_deductions: number;
  status: string;
  pay_period_start: string;
  pay_period_end: string;
}

interface AttendanceSummary {
  driver_id: string;
  employee_id: string | null;
  status: string;
  total_hours: number;
  overtime_hours: number;
}

interface LeaveSummary {
  id: string;
  driver_id: string;
  employee_id: string | null;
  leave_type: string;
  total_days: number;
  status: string;
}

interface OutsourceContractSummary {
  id: string;
  status: string;
  monthly_cost: number;
  contractor_name: string;
  end_date: string | null;
}

const TYPE_ICONS: Partial<Record<EmployeeType, typeof Users>> = {
  driver: Users,
  mechanic: Wrench,
  dispatcher: Radio,
  office_staff: Building2,
  manager: Briefcase,
};

export const HRFinanceDashboard = () => {
  const { organizationId } = useOrganization();
  const { employees } = useEmployees();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollSummary[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
  const [leaves, setLeaves] = useState<LeaveSummary[]>([]);
  const [outsource, setOutsource] = useState<OutsourceContractSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const fetchAll = async () => {
      setLoading(true);
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const [cRes, pRes, aRes, lRes, oRes] = await Promise.all([
        supabase.from("driver_contracts").select("id, driver_id, employee_id, status, employment_type, end_date, pay_rate, pay_currency")
          .eq("organization_id", organizationId),
        supabase.from("driver_payroll").select("id, driver_id, employee_id, gross_pay, net_pay, total_deductions, status, pay_period_start, pay_period_end")
          .eq("organization_id", organizationId).order("pay_period_start", { ascending: false }).limit(200),
        supabase.from("driver_attendance").select("driver_id, employee_id, status, total_hours, overtime_hours")
          .eq("organization_id", organizationId).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("driver_leave_requests").select("id, driver_id, employee_id, leave_type, total_days, status")
          .eq("organization_id", organizationId),
        supabase.from("outsource_contracts").select("id, status, monthly_cost, contractor_name, end_date")
          .eq("organization_id", organizationId),
      ]);

      setContracts((cRes.data as ContractSummary[]) || []);
      setPayrolls((pRes.data as PayrollSummary[]) || []);
      setAttendance((aRes.data as AttendanceSummary[]) || []);
      setLeaves((lRes.data as LeaveSummary[]) || []);
      setOutsource((oRes.data as OutsourceContractSummary[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, [organizationId]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(n);

  // Employee type breakdown
  const employeeTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(e => {
      map[e.employee_type] = (map[e.employee_type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [employees]);

  const activeEmployees = employees.filter(e => e.status === "active");

  // Contract stats
  const activeContracts = contracts.filter(c => c.status === "active");
  const expiringContracts = contracts.filter(c => c.end_date && differenceInDays(new Date(c.end_date), new Date()) <= 60 && differenceInDays(new Date(c.end_date), new Date()) > 0);
  const expiredContracts = contracts.filter(c => c.status === "expired" || c.status === "terminated");
  const employmentTypes = useMemo(() => {
    const map: Record<string, number> = {};
    activeContracts.forEach(c => { map[c.employment_type] = (map[c.employment_type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeContracts]);

  // Payroll stats
  const latestPeriod = payrolls[0]?.pay_period_start;
  const latestPayrolls = latestPeriod ? payrolls.filter(p => p.pay_period_start === latestPeriod) : [];
  const totalGrossPay = latestPayrolls.reduce((s, p) => s + (p.gross_pay || 0), 0);
  const totalNetPay = latestPayrolls.reduce((s, p) => s + (p.net_pay || 0), 0);
  const totalDeductions = latestPayrolls.reduce((s, p) => s + (p.total_deductions || 0), 0);
  const pendingPayrolls = payrolls.filter(p => p.status === "calculated" || p.status === "approved");
  const paidPayrolls = latestPayrolls.filter(p => p.status === "paid");

  // Attendance stats (this month)
  const totalPresent = attendance.filter(a => a.status === "present").length;
  const totalLate = attendance.filter(a => a.status === "late").length;
  const totalAbsent = attendance.filter(a => a.status === "absent").length;
  const totalHours = attendance.reduce((s, a) => s + (a.total_hours || 0), 0);
  const totalOvertime = attendance.reduce((s, a) => s + (a.overtime_hours || 0), 0);
  const uniqueAttended = new Set(
    attendance.filter(a => a.status === "present" || a.status === "late")
      .map(a => a.employee_id || a.driver_id)
  ).size;

  // Leave stats
  const pendingLeaves = leaves.filter(l => l.status === "pending");
  const approvedLeaves = leaves.filter(l => l.status === "approved");
  const totalLeaveDays = approvedLeaves.reduce((s, l) => s + (l.total_days || 0), 0);
  const leaveTypes = useMemo(() => {
    const map: Record<string, number> = {};
    approvedLeaves.forEach(l => { map[l.leave_type] = (map[l.leave_type] || 0) + l.total_days; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [approvedLeaves]);

  // Outsource stats
  const activeOutsource = outsource.filter(o => o.status === "active");
  const outsourceMonthly = activeOutsource.reduce((s, o) => s + (o.monthly_cost || 0), 0);

  // Top employees by payroll
  const employeePayrollMap = useMemo(() => {
    const map: Record<string, number> = {};
    payrolls.forEach(p => {
      const key = p.employee_id || p.driver_id;
      map[key] = (map[key] || 0) + p.net_pay;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [payrolls]);

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id || e.driver_id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const getEmployeeType = (id: string): EmployeeType => {
    const emp = employees.find(e => e.id === id || e.driver_id === id);
    return emp?.employee_type || "other";
  };

  const maxPayroll = employeePayrollMap[0]?.[1] || 1;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">HR & Finance Overview</h3>
        <p className="text-sm text-muted-foreground">Organization-wide workforce, payroll, and contract analytics</p>
      </div>

      {/* Workforce Composition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Workforce Composition
            <Badge variant="outline" className="text-[10px] ml-auto">{employees.length} total / {activeEmployees.length} active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {employeeTypeCounts.map(([type, count]) => {
              const Icon = TYPE_ICONS[type as EmployeeType] || Users;
              return (
                <div key={type} className={`rounded-lg border p-2.5 text-center ${EMPLOYEE_TYPE_COLORS[type as EmployeeType]}`}>
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[9px]">{EMPLOYEE_TYPE_LABELS[type as EmployeeType]}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Active Contracts", value: activeContracts.length, icon: Briefcase, color: "text-primary" },
          { label: "Expiring Soon", value: expiringContracts.length, icon: AlertTriangle, color: "text-warning" },
          { label: "Attended (Month)", value: uniqueAttended, icon: Users, color: "text-emerald-400" },
          { label: "Pending Leaves", value: pendingLeaves.length, icon: Plane, color: "text-amber-400" },
          { label: "Gross Payroll", value: fmt(totalGrossPay), icon: DollarSign, color: "text-primary", small: true },
          { label: "Net Payroll", value: fmt(totalNetPay), icon: Wallet, color: "text-emerald-400", small: true },
          { label: "Outsource/mo", value: fmt(outsourceMonthly), icon: Handshake, color: "text-blue-400", small: true },
          { label: "Pending Pay", value: pendingPayrolls.length, icon: Clock, color: "text-amber-400" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className={`font-bold ${(s as any).small ? "text-sm" : "text-xl"}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance This Month */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => window.dispatchEvent(new CustomEvent("hr.navigate", { detail: { tab: "attendance" } }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("hr.navigate", { detail: { tab: "attendance" } }));
            }
          }}
          className="cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Open attendance details"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Attendance — {format(new Date(), "MMMM yyyy")}
              <Badge variant="outline" className="text-[9px] ml-auto">Click to drill down →</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-success">{totalPresent}</p>
                <p className="text-[10px] text-muted-foreground">Present Days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{totalLate}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{totalAbsent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
              <span>Total Hours: <strong className="text-foreground">{totalHours.toFixed(0)}h</strong></span>
              <span>Overtime: <strong className="text-foreground">{totalOvertime.toFixed(0)}h</strong></span>
              <span>Rate: <strong className="text-foreground">
                {(totalPresent + totalLate + totalAbsent) > 0
                  ? `${((totalPresent / (totalPresent + totalLate + totalAbsent)) * 100).toFixed(0)}%`
                  : "—"}
              </strong></span>
            </div>
            {/* Top attended employees - per-driver drilldown */}
            {(() => {
              const byEmp: Record<string, { present: number; late: number; absent: number; hours: number }> = {};
              attendance.forEach(a => {
                const id = a.employee_id || a.driver_id;
                if (!byEmp[id]) byEmp[id] = { present: 0, late: 0, absent: 0, hours: 0 };
                if (a.status === "present") byEmp[id].present++;
                else if (a.status === "late") byEmp[id].late++;
                else if (a.status === "absent") byEmp[id].absent++;
                byEmp[id].hours += a.total_hours || 0;
              });
              const top = Object.entries(byEmp)
                .sort((a, b) => (b[1].present + b[1].late) - (a[1].present + a[1].late))
                .slice(0, 5);
              if (top.length === 0) return null;
              return (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Top by attended days — click for daily timeline</p>
                  {top.map(([empId, s]) => (
                    <button
                      key={empId}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("hr.navigate", {
                          detail: { tab: "attendance", employeeId: empId },
                        }));
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="font-medium truncate flex-1">{getEmployeeName(empId)}</span>
                      <span className="text-success text-[10px]">{s.present}P</span>
                      <span className="text-warning text-[10px]">{s.late}L</span>
                      <span className="text-destructive text-[10px]">{s.absent}A</span>
                      <span className="text-muted-foreground text-[10px] w-12 text-right">{s.hours.toFixed(0)}h</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Leave Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-400" />
              Leave Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-400">{pendingLeaves.length}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{approvedLeaves.length}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{totalLeaveDays}</p>
                <p className="text-[10px] text-muted-foreground">Total Days</p>
              </div>
            </div>
            {leaveTypes.length > 0 && (
              <div className="space-y-1.5 border-t pt-2">
                {leaveTypes.slice(0, 4).map(([type, days]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{type}</span>
                    <Badge variant="outline" className="text-[10px]">{days} days</Badge>
                  </div>
                ))}
              </div>
            )}
            {leaveTypes.length === 0 && <p className="text-xs text-muted-foreground text-center pt-2">No approved leaves</p>}
          </CardContent>
        </Card>

        {/* Contract Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Contract Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{activeContracts.length}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{expiringContracts.length}</p>
                <p className="text-[10px] text-muted-foreground">Expiring ≤60d</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{expiredContracts.length}</p>
                <p className="text-[10px] text-muted-foreground">Expired/Term.</p>
              </div>
            </div>
            {employmentTypes.length > 0 && (
              <div className="space-y-1.5 border-t pt-2">
                <p className="text-[10px] font-medium text-muted-foreground">By Employment Type</p>
                {employmentTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs capitalize text-muted-foreground w-28 truncate">{type.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(count / activeContracts.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Payroll — Latest Period
              {latestPeriod && <Badge variant="outline" className="text-[10px] ml-auto">{format(new Date(latestPeriod), "MMM yyyy")}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{fmt(totalGrossPay)}</p>
                <p className="text-[10px] text-muted-foreground">Gross</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-400">-{fmt(totalDeductions)}</p>
                <p className="text-[10px] text-muted-foreground">Deductions</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">{fmt(totalNetPay)}</p>
                <p className="text-[10px] text-muted-foreground">Net</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
              <span>Paid: <strong className="text-emerald-400">{paidPayrolls.length}</strong></span>
              <span>Pending: <strong className="text-amber-400">{pendingPayrolls.length}</strong></span>
              <span>Total Records: <strong className="text-foreground">{latestPayrolls.length}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Employees by Payroll + Expiring Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Employees — Total Net Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {employeePayrollMap.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No payroll data</p>
            ) : employeePayrollMap.map(([empId, total], i) => (
              <div key={empId} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-xs font-medium w-28 truncate">{getEmployeeName(empId)}</span>
                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[getEmployeeType(empId)]}`}>
                  {EMPLOYEE_TYPE_LABELS[getEmployeeType(empId)]}
                </Badge>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(total / maxPayroll) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">{fmt(total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Contracts Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringContracts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No contracts expiring in the next 60 days</p>
              </div>
            ) : expiringContracts.map(c => {
              const daysLeft = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : 0;
              const empId = c.employee_id || c.driver_id;
              return (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border text-xs">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{getEmployeeName(empId)}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[getEmployeeType(empId)]}`}>
                      {EMPLOYEE_TYPE_LABELS[getEmployeeType(empId)]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.employment_type.replace(/_/g, " ")}</Badge>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${daysLeft <= 30 ? "text-red-400 border-red-500/30" : "text-amber-400 border-amber-500/30"}`}>
                    {daysLeft}d left
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Outsource Contracts */}
      {activeOutsource.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Handshake className="w-4 h-4 text-blue-400" />
              Active Outsource Contracts
              <Badge variant="outline" className="text-[10px] ml-auto">{fmt(outsourceMonthly)}/mo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeOutsource.map(o => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border text-xs">
                  <div>
                    <p className="font-medium">{o.contractor_name}</p>
                    {o.end_date && (
                      <p className="text-[10px] text-muted-foreground">
                        Ends {format(new Date(o.end_date), "MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-primary">{fmt(o.monthly_cost)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

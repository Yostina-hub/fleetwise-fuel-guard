import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DollarSign, Calculator, Settings, Search, Users, Wallet } from "lucide-react";
import { type Employee, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS } from "@/hooks/useEmployees";
import { friendlyToastError } from "@/lib/errorMessages";

interface DriverPayrollManagementProps {
  driverId: string;
  driverName: string;
  employeeId?: string;
  employees?: Employee[];
}

interface PayrollConfig {
  id: string;
  base_monthly_salary: number;
  per_trip_rate: number;
  per_km_rate: number;
  overtime_hourly_rate: number;
  weekend_multiplier: number;
  night_shift_multiplier: number;
  effective_from: string;
  is_active: boolean;
}

interface PayrollRecord {
  id: string;
  driver_id: string;
  employee_id: string | null;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  trip_bonus: number;
  km_bonus: number;
  overtime_pay: number;
  other_earnings: number;
  deductions: Record<string, number>;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  notes: string | null;
}

export const DriverPayrollManagement = ({ driverId, driverName, employeeId, employees = [] }: DriverPayrollManagementProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAllMode = !employeeId && !driverId;

  const [configForm, setConfigForm] = useState({
    base_monthly_salary: "0", per_trip_rate: "0", per_km_rate: "0",
    overtime_hourly_rate: "0", weekend_multiplier: "1.5", night_shift_multiplier: "1.25",
  });

  const [payrollForm, setPayrollForm] = useState({
    period_start: "", period_end: "",
    trip_bonus: "0", km_bonus: "0", overtime_pay: "0", other_earnings: "0",
    deduction_tax: "0", deduction_penalty: "0", deduction_advance: "0", deduction_other: "0",
    payment_method: "bank_transfer", notes: "",
  });

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      let payQuery = supabase.from("driver_payroll").select("*").eq("organization_id", organizationId)
        .order("pay_period_start", { ascending: false }).limit(isAllMode ? 200 : 12);

      if (driverId) {
        payQuery = payQuery.eq("driver_id", driverId);
      }

      const results = await Promise.all([
        driverId
          ? supabase.from("driver_payroll_config").select("*").eq("organization_id", organizationId)
              .eq("driver_id", driverId).eq("is_active", true).order("effective_from", { ascending: false }).limit(1)
          : Promise.resolve({ data: [] }),
        payQuery,
      ]);

      const cfg = (results[0].data as PayrollConfig[])?.[0] || null;
      setConfig(cfg);
      if (cfg) {
        setConfigForm({
          base_monthly_salary: String(cfg.base_monthly_salary),
          per_trip_rate: String(cfg.per_trip_rate),
          per_km_rate: String(cfg.per_km_rate),
          overtime_hourly_rate: String(cfg.overtime_hourly_rate),
          weekend_multiplier: String(cfg.weekend_multiplier),
          night_shift_multiplier: String(cfg.night_shift_multiplier),
        });
      }
      setPayrolls((results[1].data as PayrollRecord[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, employeeId, organizationId]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(n);

  const getEmpName = (p: PayrollRecord) => {
    if (!isAllMode) return driverName;
    const emp = employees.find(e => e.id === p.employee_id || e.driver_id === p.driver_id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const getEmpType = (p: PayrollRecord) => {
    const emp = employees.find(e => e.id === p.employee_id || e.driver_id === p.driver_id);
    return emp?.employee_type || "other";
  };

  const filteredPayrolls = useMemo(() => {
    let result = payrolls;
    if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => getEmpName(p).toLowerCase().includes(q));
    }
    return result;
  }, [payrolls, statusFilter, search, employees]);

  // Aggregate stats
  const totalGross = payrolls.reduce((s, p) => s + (p.gross_pay || 0), 0);
  const totalNet = payrolls.reduce((s, p) => s + (p.net_pay || 0), 0);
  const paidCount = payrolls.filter(p => p.status === "paid").length;
  const pendingCount = payrolls.filter(p => p.status === "calculated" || p.status === "approved").length;

  const handleSaveConfig = async () => {
    if (!organizationId || !driverId) return;
    if (config) {
      await supabase.from("driver_payroll_config").update({ is_active: false }).eq("id", config.id);
    }
    const { error } = await supabase.from("driver_payroll_config").insert({
      organization_id: organizationId,
      driver_id: driverId,
      base_monthly_salary: parseFloat(configForm.base_monthly_salary) || 0,
      per_trip_rate: parseFloat(configForm.per_trip_rate) || 0,
      per_km_rate: parseFloat(configForm.per_km_rate) || 0,
      overtime_hourly_rate: parseFloat(configForm.overtime_hourly_rate) || 0,
      weekend_multiplier: parseFloat(configForm.weekend_multiplier) || 1.5,
      night_shift_multiplier: parseFloat(configForm.night_shift_multiplier) || 1.25,
    });
    if (error) friendlyToastError(error);
    else { toast({ title: "Pay config saved" }); setShowConfigDialog(false); }
  };

  const handleCreatePayroll = async () => {
    if (!organizationId || !payrollForm.period_start || !payrollForm.period_end || !driverId) return;
    const baseSalary = config?.base_monthly_salary || 0;
    const tripBonus = parseFloat(payrollForm.trip_bonus) || 0;
    const kmBonus = parseFloat(payrollForm.km_bonus) || 0;
    const overtimePay = parseFloat(payrollForm.overtime_pay) || 0;
    const otherEarnings = parseFloat(payrollForm.other_earnings) || 0;
    const deductions = {
      tax: parseFloat(payrollForm.deduction_tax) || 0,
      penalty: parseFloat(payrollForm.deduction_penalty) || 0,
      advance: parseFloat(payrollForm.deduction_advance) || 0,
      other: parseFloat(payrollForm.deduction_other) || 0,
    };
    const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
    const grossPay = baseSalary + tripBonus + kmBonus + overtimePay + otherEarnings;
    const netPay = grossPay - totalDeductions;

    const { error } = await supabase.from("driver_payroll").insert({
      organization_id: organizationId,
      driver_id: driverId,
      pay_period_start: payrollForm.period_start,
      pay_period_end: payrollForm.period_end,
      base_salary: baseSalary,
      trip_bonus: tripBonus, km_bonus: kmBonus, overtime_pay: overtimePay, other_earnings: otherEarnings,
      deductions, total_deductions: totalDeductions, gross_pay: grossPay, net_pay: netPay,
      payment_method: payrollForm.payment_method, notes: payrollForm.notes || null, status: "calculated",
    });
    if (error) friendlyToastError(error);
    else { toast({ title: "Payroll created" }); setShowPayrollDialog(false); }
  };

  const updatePayrollStatus = async (id: string, status: string) => {
    await supabase.from("driver_payroll").update({
      status,
      ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}),
      ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    toast({ title: `Payroll ${status}` });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-emerald-500/10 text-emerald-400";
      case "approved": return "bg-blue-500/10 text-blue-400";
      case "calculated": return "bg-amber-500/10 text-amber-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{fmt(totalGross)}</p>
          <p className="text-[10px] text-muted-foreground">Total Gross</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Wallet className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-lg font-bold">{fmt(totalNet)}</p>
          <p className="text-[10px] text-muted-foreground">Total Net</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{paidCount}</p>
          <p className="text-[10px] text-muted-foreground">Paid</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </CardContent></Card>
      </div>

      {/* Config (single employee only) */}
      {!isAllMode && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Pay Configuration</h3>
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Settings className="w-3.5 h-3.5 mr-1" /> Configure</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Pay Rates — {driverName}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {[
                    { key: "base_monthly_salary", label: "Base Monthly Salary (ETB)" },
                    { key: "per_trip_rate", label: "Per Trip Rate (ETB)" },
                    { key: "per_km_rate", label: "Per KM Rate (ETB)" },
                    { key: "overtime_hourly_rate", label: "Overtime Hourly Rate (ETB)" },
                    { key: "weekend_multiplier", label: "Weekend Multiplier" },
                    { key: "night_shift_multiplier", label: "Night Shift Multiplier" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <Input type="number" step="0.01" value={(configForm as any)[key]}
                        onChange={e => setConfigForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <Button className="w-full" onClick={handleSaveConfig}>Save Configuration</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {config ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: "Base Salary", value: fmt(config.base_monthly_salary) },
                { label: "Per Trip", value: fmt(config.per_trip_rate) },
                { label: "Per KM", value: fmt(config.per_km_rate) },
                { label: "OT Rate", value: fmt(config.overtime_hourly_rate) },
                { label: "Weekend ×", value: `${config.weekend_multiplier}×` },
                { label: "Night ×", value: `${config.night_shift_multiplier}×` },
              ].map((s, i) => (
                <Card key={i}><CardContent className="p-2.5 text-center">
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </CardContent></Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-4 text-center text-xs text-muted-foreground">
              No pay configuration set. Click Configure to set up rates.
            </CardContent></Card>
          )}
        </>
      )}

      {/* Payroll Records */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Payroll Records</h3>
        <div className="flex gap-2 items-center">
          {isAllMode && (
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs w-40" />
            </div>
          )}
          <div className="flex gap-1">
            {["all", "calculated", "approved", "paid"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 rounded text-[10px] font-medium capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</button>
            ))}
          </div>
          {!isAllMode && (
            <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Calculator className="w-3.5 h-3.5 mr-1" /> Create Payroll</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Payroll — {driverName}</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground">Period Start</label>
                      <Input type="date" value={payrollForm.period_start} onChange={e => setPayrollForm(f => ({ ...f, period_start: e.target.value }))} /></div>
                    <div><label className="text-xs text-muted-foreground">Period End</label>
                      <Input type="date" value={payrollForm.period_end} onChange={e => setPayrollForm(f => ({ ...f, period_end: e.target.value }))} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Base salary auto-applied: {config ? fmt(config.base_monthly_salary) : "Not configured"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "trip_bonus", label: "Trip Bonus" },
                      { key: "km_bonus", label: "KM Bonus" },
                      { key: "overtime_pay", label: "Overtime Pay" },
                      { key: "other_earnings", label: "Other Earnings" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground">{label}</label>
                        <Input type="number" step="0.01" value={(payrollForm as any)[key]}
                          onChange={e => setPayrollForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-2">Deductions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "deduction_tax", label: "Tax" },
                      { key: "deduction_penalty", label: "Penalty" },
                      { key: "deduction_advance", label: "Advance" },
                      { key: "deduction_other", label: "Other" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground">{label}</label>
                        <Input type="number" step="0.01" value={(payrollForm as any)[key]}
                          onChange={e => setPayrollForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <Select value={payrollForm.payment_method} onValueChange={v => setPayrollForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["bank_transfer", "cash", "mobile_money", "check"].map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Notes..." value={payrollForm.notes} onChange={e => setPayrollForm(f => ({ ...f, notes: e.target.value }))} />
                  <Button className="w-full" onClick={handleCreatePayroll}>Calculate & Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {filteredPayrolls.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-xs text-muted-foreground">No payroll records</CardContent></Card>
      ) : filteredPayrolls.map(p => (
        <Card key={p.id}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isAllMode && (
                  <>
                    <span className="text-xs font-semibold">{getEmpName(p)}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[getEmpType(p)]}`}>
                      {EMPLOYEE_TYPE_LABELS[getEmpType(p)]}
                    </Badge>
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(p.pay_period_start), "MMM d")} — {format(new Date(p.pay_period_end), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(p.status)}`}>{p.status}</Badge>
                {p.status === "calculated" && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => updatePayrollStatus(p.id, "approved")}>Approve</Button>
                )}
                {p.status === "approved" && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400" onClick={() => updatePayrollStatus(p.id, "paid")}>Mark Paid</Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><p className="text-muted-foreground">Base</p><p className="font-medium">{fmt(p.base_salary)}</p></div>
              <div><p className="text-muted-foreground">Bonuses</p><p className="font-medium text-emerald-400">+{fmt(p.trip_bonus + p.km_bonus + p.overtime_pay)}</p></div>
              <div><p className="text-muted-foreground">Deductions</p><p className="font-medium text-red-400">-{fmt(p.total_deductions)}</p></div>
              <div><p className="text-muted-foreground">Net Pay</p><p className="font-bold text-primary">{fmt(p.net_pay)}</p></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

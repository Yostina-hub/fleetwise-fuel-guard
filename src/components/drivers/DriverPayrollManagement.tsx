import { useEffect, useState } from "react";
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
import { DollarSign, Calculator, Settings, FileText, CheckCircle2, Clock, Plus, TrendingUp } from "lucide-react";

interface DriverPayrollManagementProps {
  driverId: string;
  driverName: string;
  employeeId?: string;
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

export const DriverPayrollManagement = ({ driverId, driverName }: DriverPayrollManagementProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);

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
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const [cfgRes, payRes] = await Promise.all([
        supabase.from("driver_payroll_config").select("*").eq("organization_id", organizationId)
          .eq("driver_id", driverId).eq("is_active", true).order("effective_from", { ascending: false }).limit(1),
        supabase.from("driver_payroll").select("*").eq("organization_id", organizationId)
          .eq("driver_id", driverId).order("pay_period_start", { ascending: false }).limit(12),
      ]);
      const cfg = (cfgRes.data as PayrollConfig[])?.[0] || null;
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
      setPayrolls((payRes.data as PayrollRecord[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(n);

  const handleSaveConfig = async () => {
    if (!organizationId) return;
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
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Pay config saved" }); setShowConfigDialog(false); }
  };

  const handleCreatePayroll = async () => {
    if (!organizationId || !payrollForm.period_start || !payrollForm.period_end) return;
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
      trip_bonus: tripBonus,
      km_bonus: kmBonus,
      overtime_pay: overtimePay,
      other_earnings: otherEarnings,
      deductions: deductions,
      total_deductions: totalDeductions,
      gross_pay: grossPay,
      net_pay: netPay,
      payment_method: payrollForm.payment_method,
      notes: payrollForm.notes || null,
      status: "calculated",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
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
      {/* Pay Config Summary */}
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

      {/* Payroll Records */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Payroll History</h3>
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
      </div>

      {payrolls.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-xs text-muted-foreground">No payroll records yet</CardContent></Card>
      ) : payrolls.map(p => (
        <Card key={p.id}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">
                {format(new Date(p.pay_period_start), "MMM d")} — {format(new Date(p.pay_period_end), "MMM d, yyyy")}
              </span>
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

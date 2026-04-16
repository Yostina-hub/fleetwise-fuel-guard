import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useDrivers, Driver } from "@/hooks/useDrivers";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, XCircle, Clock, ShieldAlert, CreditCard, Edit, Loader2 } from "lucide-react";
import { differenceInDays, isPast, format } from "date-fns";
import { toast } from "sonner";

const getExpiryInfo = (date?: string) => {
  if (!date) return { status: "unknown", days: null, label: "No expiry set", color: "text-muted-foreground" };
  const days = differenceInDays(new Date(date), new Date());
  if (isPast(new Date(date))) return { status: "expired", days, label: "Expired", color: "text-destructive" };
  if (days <= 30) return { status: "critical", days, label: `${days} days`, color: "text-destructive" };
  if (days <= 90) return { status: "warning", days, label: `${days} days`, color: "text-amber-400" };
  return { status: "ok", days, label: `${days} days`, color: "text-emerald-400" };
};

export const DriverLicenseTracker = () => {
  const { drivers, loading, refetch } = useDrivers();
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ license_expiry: "", medical_certificate_expiry: "", license_class: "" });

  const { expired, critical, warning, ok, unknown } = useMemo(() => {
    const groups = { expired: [] as Driver[], critical: [] as Driver[], warning: [] as Driver[], ok: [] as Driver[], unknown: [] as Driver[] };
    drivers.forEach(d => {
      const info = getExpiryInfo(d.license_expiry);
      groups[info.status as keyof typeof groups]?.push(d);
    });
    return groups;
  }, [drivers]);

  const complianceRate = drivers.length > 0
    ? Math.round(((ok.length + warning.length) / drivers.length) * 100)
    : 0;

  const openEdit = (driver: Driver) => {
    setEditDriver(driver);
    setForm({
      license_expiry: driver.license_expiry || "",
      medical_certificate_expiry: driver.medical_certificate_expiry || "",
      license_class: driver.license_class || "",
    });
  };

  const handleUpdate = async () => {
    if (!editDriver) return;
    setSaving(true);
    const { error } = await supabase.from("drivers").update({
      license_expiry: form.license_expiry || null,
      medical_certificate_expiry: form.medical_certificate_expiry || null,
      license_class: form.license_class || null,
    }).eq("id", editDriver.id);
    setSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("License info updated");
    setEditDriver(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Expired", count: expired.length, icon: XCircle, color: "text-destructive" },
          { label: "Critical (<30d)", count: critical.length, icon: ShieldAlert, color: "text-destructive" },
          { label: "Warning (<90d)", count: warning.length, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Valid", count: ok.length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "No Data", count: unknown.length, icon: Clock, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fleet License Compliance</span>
            <span className="text-sm font-bold">{complianceRate}%</span>
          </div>
          <Progress value={complianceRate} />
        </CardContent>
      </Card>

      {/* Action Required */}
      {(expired.length > 0 || critical.length > 0) && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Immediate Action Required
            </CardTitle>
            <CardDescription>{expired.length + critical.length} drivers need attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...expired, ...critical].map(driver => {
              const info = getExpiryInfo(driver.license_expiry);
              return (
                <div key={driver.id} className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={driver.avatar_url || undefined} />
                    <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                      {driver.first_name[0]}{driver.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{driver.first_name} {driver.last_name}</p>
                    <p className="text-[10px] text-muted-foreground">License: {driver.license_number} · Class: {driver.license_class || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive" className="text-[10px]">
                      {info.status === "expired" ? "EXPIRED" : `${info.days}d left`}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => openEdit(driver)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All Drivers License Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            All Driver Licenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {drivers.map(driver => {
            const info = getExpiryInfo(driver.license_expiry);
            const medInfo = getExpiryInfo(driver.medical_certificate_expiry);
            return (
              <div key={driver.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={driver.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {driver.first_name[0]}{driver.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{driver.first_name} {driver.last_name}</p>
                  <p className="text-[10px] text-muted-foreground">{driver.license_number}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{driver.license_class || "—"}</span>
                <div className="text-right">
                  <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                  {driver.medical_certificate_expiry && (
                    <p className={`text-[10px] ${medInfo.color}`}>Med: {medInfo.label}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => openEdit(driver)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDriver} onOpenChange={open => !open && setEditDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update License Info</DialogTitle>
            <DialogDescription>{editDriver ? `${editDriver.first_name} ${editDriver.last_name}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>License Expiry Date</Label>
              <Input type="date" value={form.license_expiry} onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))} />
            </div>
            <div>
              <Label>Medical Certificate Expiry</Label>
              <Input type="date" value={form.medical_certificate_expiry} onChange={e => setForm(f => ({ ...f, medical_certificate_expiry: e.target.value }))} />
            </div>
            <div>
              <Label>License Class</Label>
              <Input value={form.license_class} onChange={e => setForm(f => ({ ...f, license_class: e.target.value }))} placeholder="e.g., Class A, B, CDL" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDriver(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

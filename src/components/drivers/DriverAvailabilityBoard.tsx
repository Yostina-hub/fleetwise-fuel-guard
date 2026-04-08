import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, XCircle, Coffee, BookOpen, Ban, UserCheck, Users, RefreshCw } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  on_duty: { label: "On Duty", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  off_duty: { label: "Off Duty", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
  on_leave: { label: "On Leave", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Coffee },
  sick: { label: "Sick", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  training: { label: "Training", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: BookOpen },
  suspended: { label: "Suspended", color: "bg-destructive/20 text-destructive border-destructive/30", icon: Ban },
  available: { label: "Available", color: "bg-primary/20 text-primary border-primary/30", icon: UserCheck },
};

interface AvailabilityRecord {
  id: string;
  driver_id: string;
  status: string;
  shift_start: string | null;
  shift_end: string | null;
  notes: string | null;
  updated_at: string;
}

export const DriverAvailabilityBoard = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { user } = useAuth();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchAvailability = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_availability")
      .select("*")
      .eq("organization_id", organizationId);
    if (!error) setAvailability((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAvailability();

    if (!organizationId) return;
    const channel = supabase
      .channel(`availability-${organizationId.slice(0, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_availability", filter: `organization_id=eq.${organizationId}` }, () => fetchAvailability())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId]);

  const updateStatus = async (driverId: string, newStatus: string) => {
    if (!organizationId || !user) return;
    const existing = availability.find(a => a.driver_id === driverId);
    if (existing) {
      await supabase.from("driver_availability").update({ status: newStatus, updated_by: user.id }).eq("id", existing.id);
    } else {
      await supabase.from("driver_availability").insert({ organization_id: organizationId, driver_id: driverId, status: newStatus, updated_by: user.id });
    }
    toast({ title: "Status updated" });
  };

  const getDriverAvailability = (driverId: string) => availability.find(a => a.driver_id === driverId);

  const statusCounts = Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
    const count = key === "off_duty"
      ? drivers.filter(d => !availability.find(a => a.driver_id === d.id) || availability.find(a => a.driver_id === d.id)?.status === "off_duty").length
      : availability.filter(a => a.status === key).length;
    return { key, ...cfg, count };
  });

  const filteredDrivers = filterStatus === "all"
    ? drivers
    : drivers.filter(d => {
        const avail = getDriverAvailability(d.id);
        if (filterStatus === "off_duty") return !avail || avail.status === "off_duty";
        return avail?.status === filterStatus;
      });

  return (
    <div className="space-y-6">
      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {statusCounts.map(s => (
          <Card
            key={s.key}
            className={`cursor-pointer transition-all hover:scale-105 ${filterStatus === s.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterStatus(filterStatus === s.key ? "all" : s.key)}
          >
            <CardContent className="p-3 text-center">
              <s.icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Driver Board */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Driver Availability Board</CardTitle>
            <CardDescription>Real-time duty status for {drivers.length} drivers</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAvailability} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrivers.map(driver => {
              const avail = getDriverAvailability(driver.id);
              const status = avail?.status || "off_duty";
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.off_duty;
              return (
                <div key={driver.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={driver.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {driver.first_name[0]}{driver.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{driver.first_name} {driver.last_name}</p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                  <Select value={status} onValueChange={(v) => updateStatus(driver.id, v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {filteredDrivers.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No drivers match this filter</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

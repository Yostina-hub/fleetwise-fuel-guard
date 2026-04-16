import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { FileText, AlertTriangle, CheckCircle2, Clock, Briefcase } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

interface Contract {
  id: string;
  driver_id: string;
  contract_number: string | null;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  pay_rate: number | null;
  pay_frequency: string;
  pay_currency: string;
  probation_end_date: string | null;
  department: string | null;
  position_title: string | null;
  supervisor_name: string | null;
  status: string;
  termination_date: string | null;
  termination_reason: string | null;
}

interface DriverContractManagementProps {
  driverId: string;
  driverName: string;
  employeeId?: string;
}

export const DriverContractManagement = ({ driverId, driverName }: DriverContractManagementProps) => {
  const { organizationId } = useOrganization();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .order("start_date", { ascending: false });
      setContracts((data as Contract[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "expiring": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "expired": case "terminated": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "renewed": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeContract = contracts.find(c => c.status === "active");
  const fmt = (n: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Briefcase className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{contracts.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Contracts</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold capitalize">{activeContract?.employment_type?.replace(/_/g, " ") || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Current Type</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <FileText className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{activeContract?.position_title || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Position</p>
        </CardContent></Card>
      </div>

      {contracts.length === 0 && !loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No contracts found for {driverName}</p>
        </CardContent></Card>
      ) : (
        contracts.map(c => {
          const daysToExpiry = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
          const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 60;
          return (
            <Card key={c.id} className={isExpiringSoon ? "border-amber-500/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    {c.contract_number || "Contract"}
                    <Badge variant="outline" className="text-[10px] capitalize">{c.employment_type.replace(/_/g, " ")}</Badge>
                  </CardTitle>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(c.status)}`}>{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium">{format(new Date(c.start_date), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-medium">{c.end_date ? format(new Date(c.end_date), "MMM dd, yyyy") : "Indefinite"}</p>
                    {isExpiringSoon && <p className="text-amber-400 text-[10px]">{daysToExpiry}d remaining</p>}
                  </div>
                  {c.pay_rate && (
                    <div>
                      <p className="text-muted-foreground">Pay Rate</p>
                      <p className="font-medium">{fmt(c.pay_rate, c.pay_currency)} / {c.pay_frequency.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {c.department && (
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{c.department}</p>
                    </div>
                  )}
                </div>
                {c.supervisor_name && (
                  <p className="text-xs text-muted-foreground">Supervisor: {c.supervisor_name}</p>
                )}
                {c.probation_end_date && (
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Probation until {format(new Date(c.probation_end_date), "MMM dd, yyyy")}</span>
                    {isPast(new Date(c.probation_end_date)) && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">Completed</Badge>}
                  </div>
                )}
                {c.termination_date && (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    Terminated {format(new Date(c.termination_date), "MMM dd, yyyy")}
                    {c.termination_reason && ` — ${c.termination_reason}`}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

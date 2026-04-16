import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { FileText, AlertTriangle, CheckCircle2, Clock, Briefcase, Search, Users } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { type Employee, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS } from "@/hooks/useEmployees";

interface Contract {
  id: string;
  driver_id: string;
  employee_id: string | null;
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
  employees?: Employee[];
}

export const DriverContractManagement = ({ driverId, driverName, employeeId, employees = [] }: DriverContractManagementProps) => {
  const { organizationId } = useOrganization();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAllMode = !employeeId && !driverId;

  useEffect(() => {
    if (!organizationId) return;
    const fetchContracts = async () => {
      setLoading(true);
      let query = supabase
        .from("driver_contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("start_date", { ascending: false });

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data } = await query;
      setContracts((data as Contract[]) || []);
      setLoading(false);
    };
    fetchContracts();
  }, [driverId, employeeId, organizationId]);

  const getEmpName = (c: Contract) => {
    if (!isAllMode) return driverName;
    const emp = employees.find(e => e.id === c.employee_id || e.driver_id === c.driver_id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const getEmpType = (c: Contract) => {
    const emp = employees.find(e => e.id === c.employee_id || e.driver_id === c.driver_id);
    return emp?.employee_type || "other";
  };

  const filtered = useMemo(() => {
    let result = contracts;
    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => {
        const name = getEmpName(c).toLowerCase();
        return name.includes(q) || (c.contract_number || "").toLowerCase().includes(q) ||
          c.employment_type.toLowerCase().includes(q) || (c.department || "").toLowerCase().includes(q);
      });
    }
    return result;
  }, [contracts, statusFilter, search, employees]);

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "expiring": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "expired": case "terminated": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "renewed": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeContracts = contracts.filter(c => c.status === "active");
  const expiringContracts = contracts.filter(c => c.end_date && differenceInDays(new Date(c.end_date), new Date()) <= 60 && differenceInDays(new Date(c.end_date), new Date()) > 0);
  const fmt = (n: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const statuses = [...new Set(contracts.map(c => c.status))];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Briefcase className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{contracts.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Contracts</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{activeContracts.length}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{expiringContracts.length}</p>
          <p className="text-[10px] text-muted-foreground">Expiring Soon</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{new Set(contracts.map(c => c.employee_id || c.driver_id)).size}</p>
          <p className="text-[10px] text-muted-foreground">Employees</p>
        </CardContent></Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setStatusFilter("all")} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No contracts found</p>
        </CardContent></Card>
      ) : (
        filtered.map(c => {
          const daysToExpiry = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
          const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 60;
          const empType = getEmpType(c);
          return (
            <Card key={c.id} className={isExpiringSoon ? "border-amber-500/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    {isAllMode && <span className="font-semibold">{getEmpName(c)}</span>}
                    {isAllMode && (
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[empType]}`}>
                        {EMPLOYEE_TYPE_LABELS[empType]}
                      </Badge>
                    )}
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
                {c.supervisor_name && <p className="text-xs text-muted-foreground">Supervisor: {c.supervisor_name}</p>}
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

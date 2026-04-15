import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/reports/TablePagination";
import { Search, User, AlertTriangle, Receipt, FileText, Loader2 } from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { useDrivers } from "@/hooks/useDrivers";

const ITEMS_PER_PAGE = 8;

interface DriverSummary {
  driverId: string;
  driverName: string;
  totalIncidents: number;
  openIncidents: number;
  totalClaims: number;
  totalViolations: number;
  unpaidFines: number;
  totalCost: number;
  severity: { critical: number; high: number; medium: number; low: number };
}

const ByPersonTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("incidents");
  const [currentPage, setCurrentPage] = useState(1);

  const { incidents, claims, violations, loading } = useIncidentsManagement();
  const { drivers } = useDrivers();

  const driverSummaries = useMemo(() => {
    const map = new Map<string, DriverSummary>();

    // Initialize from drivers list
    drivers.forEach(d => {
      map.set(d.id, {
        driverId: d.id,
        driverName: `${d.first_name} ${d.last_name}`,
        totalIncidents: 0, openIncidents: 0,
        totalClaims: 0, totalViolations: 0,
        unpaidFines: 0, totalCost: 0,
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
      });
    });

    incidents.forEach(inc => {
      if (!inc.driver_id) return;
      const s = map.get(inc.driver_id);
      if (!s) return;
      s.totalIncidents++;
      if (inc.status === "open" || inc.status === "investigating") s.openIncidents++;
      s.totalCost += inc.actual_cost || inc.estimated_cost || 0;
      const sev = inc.severity as keyof typeof s.severity;
      if (sev in s.severity) s.severity[sev]++;
    });

    violations.forEach(v => {
      if (!v.driver_id) return;
      const s = map.get(v.driver_id);
      if (!s) return;
      s.totalViolations++;
      if (v.payment_status !== "paid") s.unpaidFines += v.fine_amount || 0;
    });

    return Array.from(map.values()).filter(s =>
      s.totalIncidents > 0 || s.totalViolations > 0 || s.totalClaims > 0
    );
  }, [incidents, violations, drivers]);

  const filtered = driverSummaries.filter(s => {
    if (!searchQuery) return true;
    return s.driverName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "incidents": return b.totalIncidents - a.totalIncidents;
      case "violations": return b.totalViolations - a.totalViolations;
      case "cost": return b.totalCost - a.totalCost;
      case "severity": return (b.severity.critical + b.severity.high) - (a.severity.critical + a.severity.high);
      default: return 0;
    }
  });

  const totalItems = sorted.length;
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortBy]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by driver name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="incidents">Most Incidents</SelectItem>
              <SelectItem value="violations">Most Violations</SelectItem>
              <SelectItem value="cost">Highest Cost</SelectItem>
              <SelectItem value="severity">Highest Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Driver Incident Records</h3>
            <p>No incidents or violations are currently linked to any driver.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginated.map(summary => (
            <Card key={summary.driverId}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-lg">{summary.driverName}</span>
                      {summary.openIncidents > 0 && (
                        <Badge variant="destructive">{summary.openIncidents} Open</Badge>
                      )}
                      {(summary.severity.critical > 0 || summary.severity.high > 0) && (
                        <Badge className="bg-destructive/20 text-destructive">
                          {summary.severity.critical + summary.severity.high} High/Critical
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <div>
                          <p className="text-xs text-muted-foreground">Incidents</p>
                          <p className="font-semibold">{summary.totalIncidents}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <Receipt className="w-4 h-4 text-warning" />
                        <div>
                          <p className="text-xs text-muted-foreground">Violations</p>
                          <p className="font-semibold">{summary.totalViolations}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Unpaid Fines</p>
                          <p className="font-semibold">{summary.unpaidFines.toLocaleString()} ETB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Total Cost</p>
                          <p className="font-semibold">{summary.totalCost.toLocaleString()} ETB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
};

export default ByPersonTab;

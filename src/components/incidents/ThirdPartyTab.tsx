import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/reports/TablePagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Building2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

interface AccidentClaim {
  id: string;
  claim_number: string;
  accident_date: string;
  accident_location: string | null;
  fault_determination: string | null;
  fault_party: string | null;
  status: string | null;
  claim_amount: number | null;
  approved_amount: number | null;
  vehicle_id: string;
  third_party_name: string | null;
  third_party_vehicle: string | null;
  third_party_insurance: string | null;
  third_party_contact: string | null;
  damage_description: string | null;
}

const ThirdPartyTab = () => {
  const [partyFilter, setPartyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [claims, setClaims] = useState<AccidentClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();

  useEffect(() => {
    if (!organizationId) { setClaims([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("accident_claims")
          .select("id, claim_number, accident_date, accident_location, fault_determination, fault_party, status, claim_amount, approved_amount, vehicle_id, third_party_name, third_party_vehicle, third_party_insurance, third_party_contact, damage_description")
          .eq("organization_id", organizationId)
          .order("accident_date", { ascending: false })
          .limit(100);

        if (statusFilter !== "all") query = query.eq("status", statusFilter);

        const { data, error } = await query;
        if (error) throw error;
        setClaims((data as AccidentClaim[]) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [organizationId, statusFilter]);

  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "Unknown";

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "filed": return <Badge variant="outline">Filed</Badge>;
      case "under_review": return <Badge className="bg-warning/10 text-warning border-warning/20">Under Review</Badge>;
      case "approved": return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      case "settled": return <Badge className="bg-primary/10 text-primary border-primary/20">Settled</Badge>;
      default: return <Badge variant="outline">{status || "Pending"}</Badge>;
    }
  };

  const getFaultBadge = (fault: string | null, party: string | null) => {
    const label = party === "third_party" ? "3rd Party Fault" : party === "own" ? "Our Fault" : fault || "TBD";
    const variant = party === "third_party" ? "bg-warning/10 text-warning border-warning/20"
      : party === "own" ? "bg-destructive/20 text-destructive" : "";
    return <Badge className={variant}>{label}</Badge>;
  };

  const filtered = claims.filter(c => {
    if (partyFilter !== "all") {
      if (partyFilter === "third_party" && c.fault_party !== "third_party" && c.third_party_name === null) return false;
      if (partyFilter === "own" && c.fault_party !== "own") return false;
    }
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      c.claim_number.toLowerCase().includes(s) ||
      c.third_party_name?.toLowerCase().includes(s) ||
      c.accident_location?.toLowerCase().includes(s) ||
      getVehiclePlate(c.vehicle_id).toLowerCase().includes(s)
    );
  });

  const totalItems = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [partyFilter, statusFilter, searchQuery]);

  // Summary stats
  const thirdPartyCount = claims.filter(c => c.fault_party === "third_party" || c.third_party_name).length;
  const ownFaultCount = claims.filter(c => c.fault_party === "own").length;
  const totalClaimAmount = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Users className="w-5 h-5 text-warning" /></div>
            <div>
              <p className="text-sm text-muted-foreground">3rd Party Claims</p>
              <p className="text-2xl font-bold">{thirdPartyCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Our Fault Claims</p>
              <p className="text-2xl font-bold">{ownFaultCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Claim Value</p>
              <p className="text-2xl font-bold">{totalClaimAmount.toLocaleString()} ETB</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search claims..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={partyFilter} onValueChange={setPartyFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Party" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parties</SelectItem>
            <SelectItem value="third_party">3rd Party</SelectItem>
            <SelectItem value="own">Our Fleet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="filed">Filed</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Accident Claims</h3>
            <p>No accident claims match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Fault</TableHead>
                <TableHead>3rd Party</TableHead>
                <TableHead>3rd Party Insurance</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(claim => (
                <TableRow key={claim.id}>
                  <TableCell className="font-mono font-semibold">{claim.claim_number}</TableCell>
                  <TableCell>{format(new Date(claim.accident_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getVehiclePlate(claim.vehicle_id)}</TableCell>
                  <TableCell>{getFaultBadge(claim.fault_determination, claim.fault_party)}</TableCell>
                  <TableCell>
                    {claim.third_party_name ? (
                      <div>
                        <p className="font-medium">{claim.third_party_name}</p>
                        {claim.third_party_vehicle && <p className="text-xs text-muted-foreground">{claim.third_party_vehicle}</p>}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{claim.third_party_insurance || "—"}</TableCell>
                  <TableCell className="font-semibold">{claim.claim_amount ? `${claim.claim_amount.toLocaleString()} ETB` : "—"}</TableCell>
                  <TableCell>{getStatusBadge(claim.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
};

export default ThirdPartyTab;

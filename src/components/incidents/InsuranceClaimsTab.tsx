import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/reports/TablePagination";
import { 
  Plus, 
  Search, 
  FileText, 
  DollarSign,
  Clock,
  Building2,
  Loader2,
  Download,
  Car
} from "lucide-react";
import { useIncidentsManagement, InsuranceClaim } from "@/hooks/useIncidentsManagement";
import { useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

const InsuranceClaimsTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { claims, loading, createClaim } = useIncidentsManagement();
  const { vehicles } = useVehicles();

  const [newClaim, setNewClaim] = useState({
    vehicle_id: '',
    insurance_provider: '',
    policy_number: '',
    claim_amount: 0,
    claim_type: 'damage',
    notes: '',
  });

  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return "N/A";
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'under_review':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    const matchesSearch = !searchQuery || 
      claim.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.insurance_provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.policy_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalItems = filteredClaims.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClaims = filteredClaims.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const handleCreateClaim = async () => {
    if (!newClaim.vehicle_id) return;
    await createClaim({
      vehicle_id: newClaim.vehicle_id,
      insurance_provider: newClaim.insurance_provider || undefined,
      policy_number: newClaim.policy_number || undefined,
      claim_amount: newClaim.claim_amount || undefined,
      claim_type: newClaim.claim_type,
      notes: newClaim.notes || undefined,
    });
    setShowCreateDialog(false);
    setNewClaim({
      vehicle_id: '',
      insurance_provider: '',
      policy_number: '',
      claim_amount: 0,
      claim_type: 'damage',
      notes: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite" aria-label="Loading insurance claims...">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search insurance claims"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by claim status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" aria-label="Export claims">
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)} aria-label="File new insurance claim">
            <Plus className="w-4 h-4" aria-hidden="true" />
            File Claim
          </Button>
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label="No insurance claims found">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No Insurance Claims</h3>
            <p>File a new claim to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedClaims.map(claim => (
            <Card key={claim.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold">{claim.claim_number}</span>
                      {getStatusBadge(claim.status)}
                      <Badge variant="outline" className="capitalize">{claim.claim_type}</Badge>
                    </div>

                    {claim.notes && <p className="text-sm">{claim.notes}</p>}

                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      {claim.insurance_provider && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" aria-hidden="true" />
                          {claim.insurance_provider}
                        </span>
                      )}
                      {claim.policy_number && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" aria-hidden="true" />
                          Policy: {claim.policy_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Car className="w-4 h-4" aria-hidden="true" />
                        {getVehiclePlate(claim.vehicle_id)}
                      </span>
                      {claim.filed_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          Filed: {format(new Date(claim.filed_date), "MMM dd, yyyy")}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-sm">
                      {claim.claim_amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          Claimed: <span className="font-semibold">${claim.claim_amount.toLocaleString()}</span>
                        </span>
                      )}
                      {claim.approved_amount !== null && claim.approved_amount !== undefined && (
                        <span className="flex items-center gap-1">
                          Approved: <span className="font-semibold text-success">${claim.approved_amount.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button size="sm" variant="outline" className="gap-1" aria-label={`View details for claim ${claim.claim_number}`}>
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create Claim Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>File Insurance Claim</DialogTitle>
            <DialogDescription>
              Submit a new insurance claim for a vehicle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="claim-vehicle">Vehicle *</Label>
              <Select 
                value={newClaim.vehicle_id}
                onValueChange={v => setNewClaim({...newClaim, vehicle_id: v})}
              >
                <SelectTrigger id="claim-vehicle" aria-label="Select vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="claim-type">Claim Type</Label>
              <Select 
                value={newClaim.claim_type}
                onValueChange={v => setNewClaim({...newClaim, claim_type: v})}
              >
                <SelectTrigger id="claim-type" aria-label="Select claim type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="claim-company">Insurance Company</Label>
                <Input 
                  id="claim-company"
                  value={newClaim.insurance_provider}
                  onChange={e => setNewClaim({...newClaim, insurance_provider: e.target.value})}
                  placeholder="Company name"
                  aria-label="Insurance company name"
                />
              </div>
              <div>
                <Label htmlFor="claim-policy">Policy Number</Label>
                <Input 
                  id="claim-policy"
                  value={newClaim.policy_number}
                  onChange={e => setNewClaim({...newClaim, policy_number: e.target.value})}
                  placeholder="POL-XXXXXX"
                  aria-label="Insurance policy number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="claim-amount">Claim Amount ($)</Label>
              <Input 
                id="claim-amount"
                type="number"
                value={newClaim.claim_amount}
                onChange={e => setNewClaim({...newClaim, claim_amount: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                aria-label="Claim amount in dollars"
              />
            </div>

            <div>
              <Label htmlFor="claim-notes">Notes</Label>
              <Textarea 
                id="claim-notes"
                value={newClaim.notes}
                onChange={e => setNewClaim({...newClaim, notes: e.target.value})}
                placeholder="Describe the claim details..."
                rows={3}
                aria-label="Claim notes and details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClaim} disabled={!newClaim.vehicle_id} aria-label="Submit insurance claim">
              File Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsuranceClaimsTab;

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
  Download
} from "lucide-react";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

// Mock data for insurance claims
const mockClaims = [
  {
    id: "1",
    claim_number: "CLM-00001234",
    incident_id: "inc-1",
    incident_number: "INC-00000001",
    insurance_company: "SafeDrive Insurance",
    policy_number: "POL-789456",
    claim_amount: 15000,
    approved_amount: 12500,
    status: "approved",
    filed_date: "2025-12-15",
    resolved_date: "2025-12-28",
    notes: "Collision damage claim - front bumper replacement",
  },
  {
    id: "2",
    claim_number: "CLM-00001235",
    incident_id: "inc-2",
    incident_number: "INC-00000002",
    insurance_company: "FleetGuard Co.",
    policy_number: "POL-123789",
    claim_amount: 8500,
    approved_amount: null,
    status: "pending",
    filed_date: "2025-12-20",
    resolved_date: null,
    notes: "Windshield replacement after road debris damage",
  },
  {
    id: "3",
    claim_number: "CLM-00001236",
    incident_id: "inc-3",
    incident_number: "INC-00000003",
    insurance_company: "SafeDrive Insurance",
    policy_number: "POL-789456",
    claim_amount: 25000,
    approved_amount: null,
    status: "under_review",
    filed_date: "2025-12-22",
    resolved_date: null,
    notes: "Major body work required after parking lot incident",
  },
  {
    id: "4",
    claim_number: "CLM-00001237",
    incident_id: "inc-4",
    incident_number: "INC-00000004",
    insurance_company: "TruckSafe Ltd.",
    policy_number: "POL-456123",
    claim_amount: 3500,
    approved_amount: 0,
    status: "rejected",
    filed_date: "2025-12-10",
    resolved_date: "2025-12-18",
    notes: "Claim rejected - pre-existing damage not covered",
  },
];

const InsuranceClaimsTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading] = useState(false);

  const [newClaim, setNewClaim] = useState({
    incident_number: '',
    insurance_company: '',
    policy_number: '',
    claim_amount: 0,
    notes: '',
  });

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

  const filteredClaims = mockClaims.filter(claim => {
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    const matchesSearch = !searchQuery || 
      claim.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.insurance_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.incident_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalItems = filteredClaims.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClaims = filteredClaims.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

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
                      <Badge variant="outline">Linked: {claim.incident_number}</Badge>
                    </div>

                    <p className="text-sm">{claim.notes}</p>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" aria-hidden="true" />
                        {claim.insurance_company}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        Policy: {claim.policy_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        Filed: {format(new Date(claim.filed_date), "MMM dd, yyyy")}
                      </span>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        Claimed: <span className="font-semibold">${claim.claim_amount.toLocaleString()}</span>
                      </span>
                      {claim.approved_amount !== null && (
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
              Submit a new insurance claim linked to an existing incident.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="claim-incident">Linked Incident</Label>
              <Input 
                id="claim-incident"
                value={newClaim.incident_number}
                onChange={e => setNewClaim({...newClaim, incident_number: e.target.value})}
                placeholder="INC-00000001"
                aria-label="Linked incident number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="claim-company">Insurance Company</Label>
                <Input 
                  id="claim-company"
                  value={newClaim.insurance_company}
                  onChange={e => setNewClaim({...newClaim, insurance_company: e.target.value})}
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
            <Button onClick={() => setShowCreateDialog(false)} aria-label="Submit insurance claim">
              File Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsuranceClaimsTab;

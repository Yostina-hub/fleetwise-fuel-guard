import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, FileSearch, DollarSign, AlertTriangle, User, Car, Shield } from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  claim: any;
}

const STEPS = [
  { key: "filed", label: "Filed", icon: Clock, dateKey: "filed_at" },
  { key: "under_review", label: "Under Review", icon: FileSearch, dateKey: null },
  { key: "approved", label: "Approved", icon: CheckCircle2, dateKey: "approved_at" },
  { key: "settled", label: "Settled", icon: DollarSign, dateKey: "settled_at" },
];

const STATUS_ORDER: Record<string, number> = { filed: 0, under_review: 1, approved: 2, settled: 3, denied: -1 };

export const ClaimDetailDialog = ({ open, onOpenChange, claim }: Props) => {
  if (!claim) return null;

  const currentStep = STATUS_ORDER[claim.status] ?? 0;
  const isDenied = claim.status === "denied";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{claim.claim_number}</span>
            <Badge variant={isDenied ? "destructive" : currentStep >= 3 ? "default" : "secondary"}>
              {claim.status?.replace(/_/g, " ")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Timeline */}
        <div className="py-4">
          <h4 className="text-sm font-semibold mb-4">Claim Timeline</h4>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-muted" />
            <div className="absolute top-4 left-8 h-0.5 bg-primary transition-all" style={{ width: isDenied ? "0%" : `${Math.min(100, (currentStep / 3) * 100)}%`, maxWidth: "calc(100% - 64px)" }} />
            {STEPS.map((step, i) => {
              const isComplete = !isDenied && currentStep >= i;
              const isCurrent = !isDenied && currentStep === i;
              const Icon = step.icon;
              const dateVal = step.dateKey ? claim[step.dateKey] : null;
              return (
                <div key={step.key} className="flex flex-col items-center z-10 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isComplete ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"} ${isCurrent ? "ring-2 ring-primary/30" : ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${isComplete ? "text-primary" : "text-muted-foreground"}`}>{step.label}</p>
                  {dateVal && <p className="text-[10px] text-muted-foreground">{format(new Date(dateVal), "MMM dd")}</p>}
                </div>
              );
            })}
          </div>
          {isDenied && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-md flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" /> Claim was denied
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Accident Info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="w-4 h-4" /> Accident Info</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Row label="Date" value={format(new Date(claim.accident_date), "MMM dd, yyyy")} />
              <Row label="Vehicle" value={claim.vehicles?.plate_number || "—"} />
              <Row label="Location" value={claim.accident_location} />
              <Row label="Description" value={claim.description} />
              <Row label="Damage" value={claim.damage_description} />
              <Row label="Police Report" value={claim.police_report_number} />
            </CardContent>
          </Card>

          {/* Costs */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Costs & Repair</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Row label="Fault" value={claim.fault_determination?.replace(/_/g, " ")} />
              <Row label="Est. Repair" value={claim.estimated_repair_cost ? `${claim.estimated_repair_cost.toLocaleString()} ETB` : null} />
              <Row label="Actual Repair" value={claim.actual_repair_cost ? `${claim.actual_repair_cost.toLocaleString()} ETB` : null} />
              <Row label="Claim Amount" value={claim.claim_amount ? `${claim.claim_amount.toLocaleString()} ETB` : null} />
              <Row label="Approved Amount" value={claim.approved_amount ? `${claim.approved_amount.toLocaleString()} ETB` : null} />
              <Row label="Repair Vendor" value={claim.repair_vendor} />
              <Row label="Repair Start" value={claim.repair_start_date ? format(new Date(claim.repair_start_date), "MMM dd, yyyy") : null} />
              <Row label="Repair End" value={claim.repair_end_date ? format(new Date(claim.repair_end_date), "MMM dd, yyyy") : null} />
            </CardContent>
          </Card>

          {/* Third Party */}
          {(claim.third_party_name || claim.third_party_vehicle || claim.third_party_insurance) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Third Party</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <Row label="Name" value={claim.third_party_name} />
                <Row label="Contact" value={claim.third_party_contact} />
                <Row label="Vehicle" value={claim.third_party_vehicle} />
                <Row label="Insurance" value={claim.third_party_insurance} />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {claim.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{claim.notes}</CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between gap-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right capitalize">{value || "—"}</span>
  </div>
);

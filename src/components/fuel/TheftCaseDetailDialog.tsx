import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, FileText, Car, User, Fuel, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface TheftCase {
  id: string;
  case_number: string;
  status: string;
  priority?: string;
  vehicle_id: string;
  driver_id?: string;
  fuel_lost_liters: number;
  estimated_value?: number;
  detected_at: string;
  location_name?: string;
  investigation_notes?: string;
}

interface TheftCaseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseItem: TheftCase | null;
  getVehiclePlate: (id: string) => string;
  getDriverName: (id?: string) => string;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onStartInvestigation: (id: string) => Promise<void>;
  onCloseCase: (id: string, confirmed: boolean) => Promise<void>;
}

const TheftCaseDetailDialog = ({
  open,
  onOpenChange,
  caseItem,
  getVehiclePlate,
  getDriverName,
  onUpdateNotes,
  onStartInvestigation,
  onCloseCase,
}: TheftCaseDetailDialogProps) => {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { formatCurrency, formatFuel } = useOrganizationSettings();

  // Sync notes when caseItem changes
  useEffect(() => {
    if (caseItem) {
      setNotes(caseItem.investigation_notes || "");
    }
  }, [caseItem]);

  if (!caseItem) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Open</Badge>;
      case 'investigating':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case 'confirmed':
        return <Badge variant="destructive">Confirmed</Badge>;
      case 'false_positive':
        return <Badge variant="outline">False Positive</Badge>;
      case 'closed':
        return <Badge className="bg-success/10 text-success border-success/20">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-destructive/20 text-destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await onUpdateNotes(caseItem.id, notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono truncate" title={caseItem.case_number}>{caseItem.case_number}</span>
            {getStatusBadge(caseItem.status)}
            {getPriorityBadge(caseItem.priority)}
          </DialogTitle>
          <DialogDescription>View and manage theft case details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Case Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Car className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">Vehicle:</span>
              <span className="font-medium truncate" title={getVehiclePlate(caseItem.vehicle_id)}>
                {getVehiclePlate(caseItem.vehicle_id)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">Driver:</span>
              <span className="font-medium truncate" title={getDriverName(caseItem.driver_id)}>
                {getDriverName(caseItem.driver_id)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Fuel className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Fuel Lost:</span>
              <span className="font-medium text-destructive">{formatFuel(caseItem.fuel_lost_liters)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Est. Value:</span>
              <span className="font-medium">{formatCurrency(caseItem.estimated_value || 0)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Detected:</span>
              <span className="font-medium">{format(new Date(caseItem.detected_at), "MMM dd, yyyy HH:mm")}</span>
            </div>
            {caseItem.location_name && (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Location:</span>
                <span className="font-medium truncate" title={caseItem.location_name}>
                  {caseItem.location_name}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Investigation Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Investigation Notes
            </Label>
            <Textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add investigation notes, findings, evidence..."
              rows={4}
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSaveNotes}
              disabled={saving || notes === caseItem.investigation_notes}
            >
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 justify-end flex-wrap">
            {caseItem.status === 'open' && (
              <Button 
                onClick={() => {
                  onStartInvestigation(caseItem.id);
                  onOpenChange(false);
                }}
              >
                Start Investigation
              </Button>
            )}
            {caseItem.status === 'investigating' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    onCloseCase(caseItem.id, true);
                    onOpenChange(false);
                  }}
                >
                  Confirm Theft
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    onCloseCase(caseItem.id, false);
                    onOpenChange(false);
                  }}
                >
                  Mark False Positive
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TheftCaseDetailDialog;

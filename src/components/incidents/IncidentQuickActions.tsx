import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  FileText, 
  Download, 
  Phone,
  Camera,
  MapPin
} from "lucide-react";
import { toast } from "sonner";

interface IncidentQuickActionsProps {
  onCreateIncident?: () => void;
  onExportReport?: () => void;
}

export const IncidentQuickActions = ({
  onCreateIncident,
  onExportReport
}: IncidentQuickActionsProps) => {
  const actions = [
    {
      label: "Report Incident",
      icon: Plus,
      onClick: onCreateIncident || (() => toast.info("Click 'Report Incident' button in the table")),
      variant: "default" as const,
      description: "Log a new incident"
    },
    {
      label: "Emergency Call",
      icon: Phone,
      onClick: () => toast.info("Emergency contacts: 911 (Police), Insurance hotline"),
      variant: "destructive" as const,
      description: "Contact emergency services"
    },
    {
      label: "Capture Evidence",
      icon: Camera,
      onClick: () => toast.info("Use mobile app to capture photos and videos"),
      variant: "outline" as const,
      description: "Document incident scene"
    },
    {
      label: "Export Report",
      icon: Download,
      onClick: onExportReport || (() => toast.info("Export functionality coming soon")),
      variant: "outline" as const,
      description: "Download incident data"
    },
    {
      label: "View on Map",
      icon: MapPin,
      onClick: () => toast.info("Map view for incident locations coming soon"),
      variant: "outline" as const,
      description: "See incident locations"
    },
    {
      label: "File Claim",
      icon: FileText,
      onClick: () => toast.info("Insurance claims module coming soon"),
      variant: "ghost" as const,
      description: "Start insurance process"
    }
  ];

  return (
    <Card className="border-destructive/20 bg-gradient-to-r from-destructive/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-destructive" aria-hidden="true" />
            <span className="text-sm font-medium">Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                className="gap-1.5"
                title={action.description}
                aria-label={`${action.label}: ${action.description}`}
              >
                <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

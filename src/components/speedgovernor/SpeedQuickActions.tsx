import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Send, 
  FileText, 
  Download, 
  AlertCircle,
  Settings,
  MapPin,
  Bell
} from "lucide-react";
import { toast } from "sonner";

interface SpeedQuickActionsProps {
  onSetFleetLimit?: () => void;
  onExportReport?: () => void;
  onConfigureZones?: () => void;
  onConfigureAlerts?: () => void;
}

export const SpeedQuickActions = ({
  onSetFleetLimit,
  onExportReport,
  onConfigureZones,
  onConfigureAlerts
}: SpeedQuickActionsProps) => {
  const actions = [
    {
      label: "Set Fleet Limit",
      icon: Send,
      onClick: onSetFleetLimit || (() => toast.info("Go to Remote Control tab to set speed limits")),
      variant: "default" as const,
      description: "Apply speed limit to all vehicles"
    },
    {
      label: "Emergency Alert",
      icon: AlertCircle,
      onClick: () => toast.info("Emergency speed reduction command ready"),
      variant: "destructive" as const,
      description: "Send urgent speed reduction"
    },
    {
      label: "Export Report",
      icon: Download,
      onClick: onExportReport || (() => toast.info("Go to Compliance Reports tab to export")),
      variant: "outline" as const,
      description: "Download compliance data"
    },
    {
      label: "Speed Zones",
      icon: MapPin,
      onClick: onConfigureZones || (() => toast.info("Go to Speed Zones tab to configure")),
      variant: "outline" as const,
      description: "Configure geofence limits"
    },
    {
      label: "Alert Rules",
      icon: Bell,
      onClick: onConfigureAlerts || (() => toast.info("Go to Alert Rules tab to configure")),
      variant: "outline" as const,
      description: "Set up notifications"
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => toast.info("Governor settings coming soon"),
      variant: "ghost" as const,
      description: "System configuration"
    }
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" aria-hidden="true" />
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

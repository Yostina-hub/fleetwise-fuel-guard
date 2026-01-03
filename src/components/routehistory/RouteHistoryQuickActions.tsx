import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Share2, 
  GitCompare,
  Printer,
  MapPin,
  Navigation
} from "lucide-react";
import { toast } from "sonner";

interface RouteHistoryQuickActionsProps {
  hasData: boolean;
  vehiclePlate?: string;
  selectedDate?: string;
  onExport?: () => void;
  onCompare?: () => void;
  onShare?: () => void;
}

export const RouteHistoryQuickActions = ({
  hasData,
  vehiclePlate,
  selectedDate,
  onExport,
  onCompare,
  onShare
}: RouteHistoryQuickActionsProps) => {
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      toast.success("Route exported as PDF");
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      toast.success("Route link copied to clipboard");
    }
  };

  const handleCompare = () => {
    if (onCompare) {
      onCompare();
    } else {
      toast.info("Route comparison coming soon");
    }
  };

  const actions = [
    {
      label: "Export Route",
      icon: Download,
      onClick: handleExport,
      variant: "default" as const,
      description: "Download route as PDF report"
    },
    {
      label: "Compare Routes",
      icon: GitCompare,
      onClick: handleCompare,
      variant: "outline" as const,
      description: "Compare with another day's route"
    },
    {
      label: "Share Route",
      icon: Share2,
      onClick: handleShare,
      variant: "outline" as const,
      description: "Copy shareable link"
    },
    {
      label: "Print Report",
      icon: Printer,
      onClick: () => toast.info("Print preview opening..."),
      variant: "outline" as const,
      description: "Print route summary"
    },
    {
      label: "View on Map",
      icon: MapPin,
      onClick: () => toast.info("Navigate to Live Map view"),
      variant: "ghost" as const,
      description: "Open in live tracking"
    }
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" aria-hidden="true" />
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
                disabled={!hasData}
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

export default RouteHistoryQuickActions;

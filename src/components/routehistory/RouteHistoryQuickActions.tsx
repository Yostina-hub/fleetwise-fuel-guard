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
import { useNavigate } from "react-router-dom";

interface TelemetryPoint {
  id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  heading: number | null;
  last_communication_at: string;
  engine_on: boolean | null;
}

interface TripSummary {
  durationMinutes: number;
  totalPoints: number;
  movingPoints: number;
  stoppedPoints: number;
  avgSpeed: string;
  maxSpeed: number;
  fuelConsumed: string;
  totalDistanceKm: string;
  startTime: string;
  endTime: string;
}

interface RouteHistoryQuickActionsProps {
  hasData: boolean;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  driverName?: string;
  selectedDate?: string;
  tripSummary?: TripSummary | null;
  routeData?: TelemetryPoint[];
  onExport?: () => void;
  onCompare?: () => void;
  onShare?: () => void;
}

export const RouteHistoryQuickActions = ({
  hasData,
  vehicleId,
  vehiclePlate,
  vehicleMake,
  vehicleModel,
  driverName,
  selectedDate,
  tripSummary,
  routeData,
  onExport,
  onCompare,
  onShare
}: RouteHistoryQuickActionsProps) => {
  const navigate = useNavigate();

  const handleExport = async () => {
    if (onExport) {
      onExport();
      return;
    }
    
    if (!tripSummary || !routeData || !vehiclePlate || !selectedDate) {
      toast.error("No route data available to export");
      return;
    }

    try {
      const { exportRoutePDF } = await import("./RouteHistoryExportUtils");
      const fileName = exportRoutePDF({
        vehiclePlate,
        vehicleMake,
        vehicleModel,
        driverName,
        selectedDate,
        tripSummary,
        routeData
      });
      toast.success(`Route exported as ${fileName}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export route");
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    if (!vehicleId || !selectedDate) {
      toast.error("Select a vehicle and date first");
      return;
    }

    try {
      const { generateShareableLink, copyToClipboard } = await import("./RouteHistoryExportUtils");
      const link = generateShareableLink(vehicleId, selectedDate);
      const success = await copyToClipboard(link);
      
      if (success) {
        toast.success("Route link copied to clipboard");
      } else {
        toast.error("Failed to copy link");
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to generate share link");
    }
  };

  const handleCompare = () => {
    if (onCompare) {
      onCompare();
      return;
    }
    toast.info("Route comparison feature coming soon");
  };

  const handlePrint = async () => {
    if (!tripSummary || !vehiclePlate || !selectedDate) {
      toast.error("No route data available to print");
      return;
    }

    try {
      const { printRouteReport } = await import("./RouteHistoryExportUtils");
      const success = printRouteReport(vehiclePlate, selectedDate, tripSummary, driverName);
      
      if (!success) {
        toast.error("Pop-up blocked. Please allow pop-ups to print.");
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to open print preview");
    }
  };

  const handleViewOnMap = () => {
    if (!vehicleId) {
      toast.info("Select a vehicle first");
      return;
    }
    navigate(`/map?vehicle=${vehicleId}`);
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
      onClick: handlePrint,
      variant: "outline" as const,
      description: "Print route summary"
    },
    {
      label: "View on Map",
      icon: MapPin,
      onClick: handleViewOnMap,
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
                disabled={!hasData && action.label !== "View on Map"}
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

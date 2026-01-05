import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Navigation } from "lucide-react";

interface StreetViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  plate: string;
  type: "streetview" | "directions";
  originLat?: number;
  originLng?: number;
}

export function StreetViewModal({
  open,
  onOpenChange,
  lat,
  lng,
  plate,
  type,
  originLat,
  originLng,
}: StreetViewModalProps) {
  const isStreetView = type === "streetview";

  const url = isStreetView
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
    : originLat !== undefined && originLng !== undefined
      ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isStreetView ? (
              <MapPin className="h-5 w-5 text-primary" />
            ) : (
              <Navigation className="h-5 w-5 text-primary" />
            )}
            <DialogTitle>
              {isStreetView ? "Street View" : "Directions"} - {plate}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to open {isStreetView ? "Street View" : "Google Maps Directions"} in a new tab.
          </p>
          
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Location:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>

          <Button asChild className="w-full gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open in Google Maps
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

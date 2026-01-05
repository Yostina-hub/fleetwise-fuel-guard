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
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const hasApiKey = Boolean(apiKey);

  const isStreetView = type === "streetview";

  const origin =
    originLat !== undefined && originLng !== undefined
      ? `${originLat},${originLng}`
      : `${lat},${lng}`;

  const streetViewUrl = hasApiKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(
        apiKey!,
      )}&location=${lat},${lng}&heading=210&pitch=10&fov=90`
    : "";

  const directionsUrl = hasApiKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
        apiKey!,
      )}&origin=${origin}&destination=${lat},${lng}&mode=driving`
    : "";

  const externalStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  const externalDirectionsUrl =
    originLat !== undefined && originLng !== undefined
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const embedUrl = isStreetView ? streetViewUrl : directionsUrl;
  const externalUrl = isStreetView ? externalStreetViewUrl : externalDirectionsUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-background flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreetView ? (
              <MapPin className="h-5 w-5 text-primary" />
            ) : (
              <Navigation className="h-5 w-5 text-primary" />
            )}
            <DialogTitle className="text-base font-semibold">
              {isStreetView ? "Street View" : "Directions"} - {plate}
            </DialogTitle>
          </div>

          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open in new window
            </a>
          </Button>
        </DialogHeader>

        <div className="flex-1 h-full min-h-0">
          {hasApiKey && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={isStreetView ? "Google Street View" : "Google Maps Directions"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="max-w-md text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  In-app embed requires a Google Maps browser key.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use “Open in new window” to view this in Google Maps.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


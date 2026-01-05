import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          <DialogDescription className="sr-only">
            {isStreetView
              ? "Open Google Maps Street View for the selected vehicle location."
              : "Open Google Maps Directions to the selected vehicle location."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            The in-app preview is sandboxed and may block opening external maps. Use
            “Open here” or copy the link below.
          </p>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-2">
            <div>
              <strong>Location:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
            <div className="break-all font-mono">{url}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button asChild className="gap-2">
              <a href={url} target="_top" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open here
              </a>
            </Button>

            <Button asChild variant="outline" className="gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                New tab
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                } catch {
                  // ignore (some browsers block clipboard in iframes)
                }
              }}
            >
              Copy link
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            If preview still blocks it, the published app will open normally.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

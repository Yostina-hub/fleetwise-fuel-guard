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
            Google blocks being opened inside the in-app preview frame; use the link below.
          </p>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-2">
            <div>
              <strong>Location:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
            <div className="break-all font-mono">{url}</div>
          </div>

          <div className="flex gap-2">
            <Button asChild className="flex-1 gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
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
            If “Open” is blocked in the preview, paste the copied link into a new tab.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

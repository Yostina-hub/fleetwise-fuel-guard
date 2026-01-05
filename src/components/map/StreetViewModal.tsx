import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, MapPin, Navigation } from "lucide-react";

interface StreetViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  plate: string;
  type: 'streetview' | 'directions';
}

export function StreetViewModal({ open, onOpenChange, lat, lng, plate, type }: StreetViewModalProps) {
  const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&location=${lat},${lng}&heading=210&pitch=10&fov=90`;
  const directionsUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&destination=${lat},${lng}&mode=driving`;
  
  const externalStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  const externalDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const isStreetView = type === 'streetview';
  const embedUrl = isStreetView ? streetViewUrl : directionsUrl;
  const externalUrl = isStreetView ? externalStreetViewUrl : externalDirectionsUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-background flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreetView ? (
              <MapPin className="h-5 w-5 text-blue-500" />
            ) : (
              <Navigation className="h-5 w-5 text-green-500" />
            )}
            <DialogTitle className="text-base font-semibold">
              {isStreetView ? 'Street View' : 'Directions'} - {plate}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
              className="gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Google Maps
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 h-full min-h-0">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={isStreetView ? 'Google Street View' : 'Google Maps Directions'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

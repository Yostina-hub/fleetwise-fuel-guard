import { useEffect } from "react";

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
  type,
  originLat,
  originLng,
}: StreetViewModalProps) {
  useEffect(() => {
    if (!open) return;

    const isStreetView = type === "streetview";

    let url: string;
    if (isStreetView) {
      url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
    } else {
      url =
        originLat !== undefined && originLng !== undefined
          ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lat},${lng}`
          : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }, [open, lat, lng, type, originLat, originLng, onOpenChange]);

  return null;
}

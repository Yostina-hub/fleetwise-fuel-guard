import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getPreviewSafeMapStyle } from "@/lib/lemat";

interface MapLocationPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: { name: string; lat: number; lng: number }) => void;
  title?: string;
  initialLat?: number;
  initialLng?: number;
}

export function MapLocationPickerDialog({
  open,
  onClose,
  onSelect,
  title = "Pick Location on Map",
  initialLat = 9.0192,
  initialLng = 38.7525,
}: MapLocationPickerDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    if (!open) return;
    setLat(initialLat);
    setLng(initialLng);
    setLocationName("");
  }, [open, initialLat, initialLng]);

  useEffect(() => {
    if (!open || !mapContainer.current) return;

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;

      const style = getPreviewSafeMapStyle("streets");

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style,
        center: [lng, lat],
        zoom: 12,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const marker = new maplibregl.Marker({ color: "#ef4444", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        setLat(parseFloat(pos.lat.toFixed(6)));
        setLng(parseFloat(pos.lng.toFixed(6)));
      });

      map.on("click", (e) => {
        const { lat: clickLat, lng: clickLng } = e.lngLat;
        const newLat = parseFloat(clickLat.toFixed(6));
        const newLng = parseFloat(clickLng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        marker.setLngLat([newLng, newLat]);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }, 100);

    return () => {
      clearTimeout(timer);
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open]);

  // Sync marker when lat/lng inputs change manually
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  const handleConfirm = () => {
    const name = locationName.trim() || `${lat}, ${lng}`;
    onSelect({ name, lat, lng });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-destructive" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={mapContainer}
          className="w-full h-[350px] rounded-lg border border-border overflow-hidden"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Location Name</Label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Bole HQ"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Click on the map or drag the pin to select a location. You can also type coordinates manually.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="gap-1.5">
            <Navigation className="w-3.5 h-3.5" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

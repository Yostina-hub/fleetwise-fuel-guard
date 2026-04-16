import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Search, Loader2 } from "lucide-react";
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

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;
    setLat(initialLat);
    setLng(initialLng);
    setLocationName("");
    setSearchQuery("");
    setSearchResults([]);
  }, [open, initialLat, initialLng]);

  // Debounced search via Nominatim
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = encodeURIComponent(searchQuery.trim());
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=et&limit=5&addressdetails=0`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setSearchResults(data);
        }
      } catch {
        // silently fail
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Map init
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const container = mapContainer.current;
      if (!container) return;

      container.style.width = "100%";
      container.style.height = "350px";

      const style = getPreviewSafeMapStyle("streets");

      const map = new maplibregl.Map({
        container,
        style,
        center: [initialLng, initialLat],
        zoom: 12,
        attributionControl: false,
      });

      map.on("load", () => map.resize());
      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const marker = new maplibregl.Marker({ color: "#ef4444", draggable: true })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        setLat(parseFloat(pos.lat.toFixed(6)));
        setLng(parseFloat(pos.lng.toFixed(6)));
      });

      map.on("click", (e) => {
        const newLat = parseFloat(e.lngLat.lat.toFixed(6));
        const newLng = parseFloat(e.lngLat.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        marker.setLngLat([newLng, newLat]);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }, 300);

    return () => {
      clearTimeout(timer);
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, initialLat, initialLng]);

  // Sync marker when lat/lng change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  const flyToLocation = (result: SearchResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
    setLocationName(result.display_name.split(",")[0]);
    setSearchQuery(result.display_name.split(",")[0]);
    setSearchResults([]);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [newLng, newLat], zoom: 15, duration: 1200 });
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat]);
    }
  };

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
          <DialogDescription>Search for a place, click on the map, or drag the pin.</DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location name (e.g. Bole, Meskel Square, Hawassa)"
            className="pl-9 pr-9 h-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
                  onClick={() => flyToLocation(r)}
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-destructive shrink-0" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div
          ref={mapContainer}
          className="w-full h-[350px] rounded-lg border border-border overflow-hidden"
        />

        {/* Coordinates & Name */}
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

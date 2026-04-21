import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Map } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapLocationPickerDialog } from "./MapLocationPickerDialog";

interface LocationPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCoordsChange?: (lat: number, lng: number) => void;
  placeholder?: string;
  iconColor?: string;
  required?: boolean;
}

export function LocationPickerField({
  label,
  value,
  onChange,
  onCoordsChange,
  placeholder = "Enter address",
  iconColor = "text-primary",
  required = false,
}: LocationPickerFieldProps) {
  const [showMap, setShowMap] = useState(false);

  const { data: geofences } = useQuery({
    queryKey: ["geofences-location-picker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("geofences")
        .select("id, name, center_lat, center_lng")
        .eq("is_active", true)
        .order("name")
        .limit(50);
      return data || [];
    },
    staleTime: 60_000,
  });

  const isGeofenceMatch = geofences?.some((g) => g.name === value);

  const handleMapSelect = (location: { name: string; lat: number; lng: number }) => {
    onChange(location.name);
    onCoordsChange?.(location.lat, location.lng);
  };

  const mapButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1 text-xs"
      onClick={() => setShowMap(true)}
    >
      <Map className="h-3.5 w-3.5" />
      Pick on Map
    </Button>
  );

  if (!geofences || geofences.length === 0) {
    return (
      <div>
        <Label className="flex items-center gap-1">
          <MapPin className={`h-3.5 w-3.5 ${iconColor}`} />
          {label} {required && "*"}
        </Label>
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1" />
          {mapButton}
        </div>
        <MapLocationPickerDialog
          open={showMap}
          onClose={() => setShowMap(false)}
          onSelect={handleMapSelect}
          title={`Select ${label}`}
        />
      </div>
    );
  }

  const isCustom = !isGeofenceMatch;

  return (
    <div>
      <Label className="flex items-center gap-1">
        <MapPin className={`h-3.5 w-3.5 ${iconColor}`} />
        {label} {required && "*"}
      </Label>
      <div className="flex gap-2">
        {isCustom ? (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
        ) : (
          <Select
            value={value}
            onValueChange={(v) => {
              if (v === "__custom__") {
                onChange("");
              } else {
                onChange(v);
                const geo = geofences?.find((g) => g.name === v);
                if (geo?.center_lat != null && geo?.center_lng != null) {
                  onCoordsChange?.(geo.center_lat, geo.center_lng);
                }
              }
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a saved location" />
            </SelectTrigger>
            <SelectContent>
              {geofences.map((g) => (
                <SelectItem key={g.id} value={g.name}>
                  <span className="flex items-center gap-2">
                    <MapPin className={`h-3 w-3 ${iconColor}`} />
                    {g.name}
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="__custom__">
                <span className="text-muted-foreground">✏️ Type custom address</span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {mapButton}
      </div>
      {isCustom && geofences && geofences.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] text-muted-foreground hover:text-foreground mt-1 underline-offset-2 hover:underline"
        >
          ← Use a saved location instead
        </button>
      )}
      <MapLocationPickerDialog
        open={showMap}
        onClose={() => setShowMap(false)}
        onSelect={handleMapSelect}
        title={`Select ${label}`}
      />
    </div>
  );
}

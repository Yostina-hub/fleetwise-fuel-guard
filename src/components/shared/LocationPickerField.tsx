import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Map, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
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
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: geofences } = useQuery({
    queryKey: ["geofences-location-picker", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("geofences")
        .select("id, name, center_lat, center_lng")
        .eq("is_active", true)
        .order("name")
        .limit(100);
      return data || [];
    },
    staleTime: 60_000,
  });

  const isGeofenceMatch = geofences?.some((g) => g.name === value);

  /**
   * Persist a freshly picked map point as a reusable "custom" geofence so it
   * shows up in the saved-locations dropdown next time. Failures are silent
   * (the user still gets the name+coords on the form), but we surface a
   * toast on success so people know it was saved.
   */
  const autoSaveCustomLocation = async (loc: { name: string; lat: number; lng: number }) => {
    if (!organizationId) return;
    const trimmed = loc.name?.trim() || "";
    if (!trimmed) return;
    // Don't pollute the saved-locations list with placeholder names or
    // raw "lat, lng" strings — only save real, human-readable place names.
    if (trimmed.toLowerCase() === "pinned location") return;
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) return;
    // Skip if a geofence with this name already exists
    if (geofences?.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("geofences").insert({
        organization_id: organizationId,
        name: loc.name.trim(),
        category: "custom",
        geometry_type: "circle",
        center_lat: loc.lat,
        center_lng: loc.lng,
        radius_meters: 100,
        is_active: true,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["geofences-location-picker", organizationId] });
      toast.success(`Saved "${loc.name}" to your locations`);
    } catch (err: any) {
      // Non-blocking: keep form usable even if save fails
      console.warn("Auto-save custom location failed:", err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMapSelect = async (location: { name: string; lat: number; lng: number }) => {
    onChange(location.name);
    onCoordsChange?.(location.lat, location.lng);
    await autoSaveCustomLocation(location);
  };

  const mapButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1 text-xs"
      onClick={() => setShowMap(true)}
      disabled={isSaving}
    >
      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Map className="h-3.5 w-3.5" />}
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
                  onCoordsChange?.(Number(geo.center_lat), Number(geo.center_lng));
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

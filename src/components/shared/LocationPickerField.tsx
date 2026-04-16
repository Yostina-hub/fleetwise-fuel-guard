import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LocationPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  iconColor?: string;
  required?: boolean;
}

export function LocationPickerField({
  label,
  value,
  onChange,
  placeholder = "Enter address",
  iconColor = "text-primary",
  required = false,
}: LocationPickerFieldProps) {
  const { data: geofences } = useQuery({
    queryKey: ["geofences-location-picker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("geofences")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(50);
      return data || [];
    },
    staleTime: 60_000,
  });

  const isGeofenceMatch = geofences?.some((g) => g.name === value);

  if (!geofences || geofences.length === 0) {
    return (
      <div>
        <Label className="flex items-center gap-1">
          <MapPin className={`h-3.5 w-3.5 ${iconColor}`} />
          {label} {required && "*"}
        </Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div>
      <Label className="flex items-center gap-1">
        <MapPin className={`h-3.5 w-3.5 ${iconColor}`} />
        {label} {required && "*"}
      </Label>
      <div className="space-y-2">
        <Select
          value={isGeofenceMatch ? value : "__custom__"}
          onValueChange={(v) => {
            if (v !== "__custom__") {
              onChange(v);
            } else {
              onChange("");
            }
          }}
        >
          <SelectTrigger>
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
        {!isGeofenceMatch && (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}

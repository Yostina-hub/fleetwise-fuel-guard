import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseAddressGeocodingResult {
  address: string | null;
  isLoading: boolean;
}

export const useAddressGeocoding = (
  lat: number | null | undefined,
  lng: number | null | undefined,
  enabled: boolean = true
): UseAddressGeocodingResult => {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastCoordsRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || lat == null || lng == null) {
      setAddress(null);
      return;
    }

    // Validate coordinates
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setAddress("Location unavailable");
      return;
    }

    // Check if coordinates changed significantly
    const coordsKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (coordsKey === lastCoordsRef.current) {
      return; // No significant change
    }
    lastCoordsRef.current = coordsKey;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the geocoding request
    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      
      try {
        // Try to get Mapbox token
        let mapboxToken = localStorage.getItem("mapbox_token") || import.meta.env.VITE_MAPBOX_TOKEN;
        
        if (!mapboxToken) {
          // Fetch from backend
          const { data } = await supabase.functions.invoke("get-mapbox-token");
          mapboxToken = data?.token;
        }

        if (!mapboxToken) {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setIsLoading(false);
          return;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng.toFixed(6)},${lat.toFixed(6)}.json?access_token=${mapboxToken}&types=address,poi,neighborhood&limit=1&language=en`;
        const res = await fetch(url);
        
        if (!res.ok) {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setIsLoading(false);
          return;
        }

        const json = await res.json();
        const features = json?.features || [];

        if (features.length === 0) {
          setAddress(`Near ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
          setIsLoading(false);
          return;
        }

        const bestFeature = features[0];
        const context = bestFeature.context || [];
        
        // Build address from parts
        const parts: string[] = [];
        
        if (bestFeature.text) {
          parts.push(bestFeature.text);
        }
        
        const neighborhood = context.find((c: any) => c.id?.startsWith("neighborhood"))?.text;
        const locality = context.find((c: any) => c.id?.startsWith("locality"))?.text;
        const place = context.find((c: any) => c.id?.startsWith("place"))?.text;
        
        if (neighborhood && !parts.includes(neighborhood)) parts.push(neighborhood);
        if (locality && !parts.includes(locality)) parts.push(locality);
        if (place && !parts.includes(place)) parts.push(place);

        const finalAddress = parts.length > 0 
          ? parts.slice(0, 3).join(", ") 
          : bestFeature.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        setAddress(finalAddress);
      } catch (error) {
        console.error("Geocoding error:", error);
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lat, lng, enabled]);

  return { address, isLoading };
};

export default useAddressGeocoding;

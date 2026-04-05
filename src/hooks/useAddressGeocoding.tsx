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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // Use Lemat reverse geocoding API directly (CORS supported)
        const lematApiKey = sessionStorage.getItem('lemat_api_key') || '';
        
        if (!lematApiKey) {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setIsLoading(false);
          return;
        }

        const url = `https://lemat.goffice.et/api/v1/reverse-geocode?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`;
        const res = await fetch(url, {
          headers: { 'X-Api-Key': lematApiKey }
        });
        
        if (!res.ok) {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setIsLoading(false);
          return;
        }

        const json = await res.json();

        if (!json?.display_name) {
          setAddress(`Near ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
          setIsLoading(false);
          return;
        }

        // Lemat returns Nominatim-style response with display_name and address object
        const addr = json.address || {};
        const parts: string[] = [];
        
        if (addr.road || addr.pedestrian) parts.push(addr.road || addr.pedestrian);
        if (addr.neighbourhood) parts.push(addr.neighbourhood);
        if (addr.suburb) parts.push(addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);

        const finalAddress = parts.length > 0 
          ? parts.slice(0, 3).join(", ") 
          : json.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

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

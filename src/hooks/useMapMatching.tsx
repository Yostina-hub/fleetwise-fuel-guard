import { useState, useCallback, useRef } from 'react';

interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

interface MatchedRoute {
  vehicleId: string;
  coordinates: [number, number][];
  speeds: number[];
}

// Cache matched routes to avoid repeated API calls
const matchedRoutesCache = new Map<string, MatchedRoute>();

/**
 * Map matching hook - uses Lemat directions API to snap GPS points to roads.
 * Falls back to raw GPS coordinates if matching fails.
 * The token parameter is kept for backward compatibility but is no longer used.
 */
export const useMapMatching = (_token?: string) => {
  const [isMatching, setIsMatching] = useState(false);
  const pendingRequests = useRef<Map<string, AbortController>>(new Map());

  const matchTrailToRoads = useCallback(async (
    vehicleId: string,
    points: TrailPoint[]
  ): Promise<[number, number][] | null> => {
    if (points.length < 2) return null;

    // Create cache key from coordinates hash
    const cacheKey = `${vehicleId}-${points.length}-${points[0]?.lat.toFixed(4)}-${points[points.length - 1]?.lat.toFixed(4)}`;
    
    // Return cached result if available
    if (matchedRoutesCache.has(cacheKey)) {
      return matchedRoutesCache.get(cacheKey)!.coordinates;
    }

    // Cancel any pending request for this vehicle
    const existingController = pendingRequests.current.get(vehicleId);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    pendingRequests.current.set(vehicleId, controller);

    try {
      setIsMatching(true);

      const lematApiKey = sessionStorage.getItem('lemat_api_key') || '';
      if (!lematApiKey) {
        // No API key - fall back to raw GPS
        return null;
      }

      // Sample points (Lemat directions API can handle waypoints)
      const maxPoints = 25; // Keep reasonable for directions API
      let sampledPoints = points;
      
      if (points.length > maxPoints) {
        const step = points.length / maxPoints;
        sampledPoints = [];
        for (let i = 0; i < maxPoints; i++) {
          const index = Math.floor(i * step);
          sampledPoints.push(points[index]);
        }
        if (sampledPoints[sampledPoints.length - 1] !== points[points.length - 1]) {
          sampledPoints.push(points[points.length - 1]);
        }
      }

      // Build coordinates string for Lemat directions API
      const coordinates = sampledPoints
        .map(p => `${p.lng},${p.lat}`)
        .join(';');

      const url = `https://lemat.goffice.et/api/v1/directions?coords=${coordinates}&profile=driving`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'X-Api-Key': lematApiKey }
      });
      
      if (!response.ok) {
        console.error('Lemat directions API error:', response.status);
        return null;
      }

      const data = await response.json();

      if (data?.data?.routes && data.data.routes.length > 0) {
        const matchedCoordinates = data.data.routes[0].geometry.coordinates as [number, number][];
        
        // Cache the result
        matchedRoutesCache.set(cacheKey, {
          vehicleId,
          coordinates: matchedCoordinates,
          speeds: sampledPoints.map(p => p.speed),
        });

        return matchedCoordinates;
      }

      return null;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      console.error('Map matching error:', error);
      return null;
    } finally {
      pendingRequests.current.delete(vehicleId);
      setIsMatching(false);
    }
  }, []);

  const clearCache = useCallback((vehicleId?: string) => {
    if (vehicleId) {
      matchedRoutesCache.forEach((_, key) => {
        if (key.startsWith(vehicleId)) {
          matchedRoutesCache.delete(key);
        }
      });
    } else {
      matchedRoutesCache.clear();
    }
  }, []);

  return {
    matchTrailToRoads,
    isMatching,
    clearCache,
  };
};

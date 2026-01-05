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

export const useMapMatching = (mapboxToken: string) => {
  const [isMatching, setIsMatching] = useState(false);
  const pendingRequests = useRef<Map<string, AbortController>>(new Map());

  const matchTrailToRoads = useCallback(async (
    vehicleId: string,
    points: TrailPoint[]
  ): Promise<[number, number][] | null> => {
    if (!mapboxToken || points.length < 2) return null;

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

      // Mapbox Map Matching API has a limit of 100 coordinates per request
      // Take evenly distributed samples if we have more
      const maxPoints = 100;
      let sampledPoints = points;
      
      if (points.length > maxPoints) {
        const step = points.length / maxPoints;
        sampledPoints = [];
        for (let i = 0; i < maxPoints; i++) {
          const index = Math.floor(i * step);
          sampledPoints.push(points[index]);
        }
        // Always include the last point
        if (sampledPoints[sampledPoints.length - 1] !== points[points.length - 1]) {
          sampledPoints.push(points[points.length - 1]);
        }
      }

      // Build coordinates string for API
      const coordinates = sampledPoints
        .map(p => `${p.lng},${p.lat}`)
        .join(';');

      // Build radiuses (accuracy in meters - GPS typically ~10m)
      const radiuses = sampledPoints.map(() => 25).join(';');

      const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?access_token=${mapboxToken}&geometries=geojson&radiuses=${radiuses}&steps=false&overview=full`;

      const response = await fetch(url, { signal: controller.signal });
      
      if (!response.ok) {
        console.error('Map matching API error:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.matchings && data.matchings.length > 0) {
        const matchedCoordinates = data.matchings[0].geometry.coordinates as [number, number][];
        
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
  }, [mapboxToken]);

  const clearCache = useCallback((vehicleId?: string) => {
    if (vehicleId) {
      // Clear cache entries for specific vehicle
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

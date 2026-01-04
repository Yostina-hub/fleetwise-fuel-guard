import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

interface VehicleTrail {
  vehicleId: string;
  points: TrailPoint[];
}

const MAX_TRAIL_POINTS = 100; // Keep last 100 points per vehicle

export const useVehicleTrail = (vehicleIds: string[]) => {
  const { organizationId } = useAuth();
  const [trails, setTrails] = useState<Map<string, TrailPoint[]>>(new Map());
  const trailsRef = useRef<Map<string, TrailPoint[]>>(new Map());

  // Fetch recent telemetry for trail history
  const fetchTrailHistory = useCallback(async () => {
    if (!organizationId || vehicleIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('vehicle_telemetry')
        .select('vehicle_id, latitude, longitude, created_at, speed_kmh')
        .in('vehicle_id', vehicleIds)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;

      const newTrails = new Map<string, TrailPoint[]>();
      
      data?.forEach(point => {
        if (!point.latitude || !point.longitude) return;
        
        const vehicleId = point.vehicle_id;
        if (!newTrails.has(vehicleId)) {
          newTrails.set(vehicleId, []);
        }
        
        newTrails.get(vehicleId)!.push({
          lat: Number(point.latitude),
          lng: Number(point.longitude),
          timestamp: point.created_at,
          speed: point.speed_kmh || 0,
        });
      });

      // Trim to max points
      newTrails.forEach((points, vehicleId) => {
        if (points.length > MAX_TRAIL_POINTS) {
          newTrails.set(vehicleId, points.slice(-MAX_TRAIL_POINTS));
        }
      });

      trailsRef.current = newTrails;
      setTrails(newTrails);
    } catch (err) {
      console.error('Error fetching trail history:', err);
    }
  }, [organizationId, vehicleIds.join(',')]);

  // Add a new point to a vehicle's trail
  const addTrailPoint = useCallback((vehicleId: string, point: TrailPoint) => {
    setTrails(prev => {
      const newTrails = new Map(prev);
      const existingPoints = newTrails.get(vehicleId) || [];
      
      // Avoid duplicate points
      const lastPoint = existingPoints[existingPoints.length - 1];
      if (lastPoint && 
          Math.abs(lastPoint.lat - point.lat) < 0.00001 && 
          Math.abs(lastPoint.lng - point.lng) < 0.00001) {
        return prev;
      }
      
      const newPoints = [...existingPoints, point];
      if (newPoints.length > MAX_TRAIL_POINTS) {
        newPoints.shift();
      }
      
      newTrails.set(vehicleId, newPoints);
      trailsRef.current = newTrails;
      return newTrails;
    });
  }, []);

  // Clear trail for a specific vehicle
  const clearTrail = useCallback((vehicleId: string) => {
    setTrails(prev => {
      const newTrails = new Map(prev);
      newTrails.delete(vehicleId);
      trailsRef.current = newTrails;
      return newTrails;
    });
  }, []);

  // Clear all trails
  const clearAllTrails = useCallback(() => {
    trailsRef.current = new Map();
    setTrails(new Map());
  }, []);

  // Subscribe to real-time telemetry updates
  useEffect(() => {
    if (!organizationId || vehicleIds.length === 0) return;

    // Fetch initial trail history
    fetchTrailHistory();

    // Subscribe to new telemetry
    const channel = supabase
      .channel(`trail-telemetry-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_telemetry',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (vehicleIds.includes(newData.vehicle_id) && newData.latitude && newData.longitude) {
            addTrailPoint(newData.vehicle_id, {
              lat: parseFloat(newData.latitude),
              lng: parseFloat(newData.longitude),
              timestamp: newData.created_at,
              speed: newData.speed_kmh || 0,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, vehicleIds.join(','), fetchTrailHistory, addTrailPoint]);

  return {
    trails,
    addTrailPoint,
    clearTrail,
    clearAllTrails,
    refetchTrails: fetchTrailHistory,
  };
};

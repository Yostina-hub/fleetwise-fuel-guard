import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, MapPin, User, Package, Truck, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehicleTelemetry } from '@/hooks/useVehicleTelemetry';
import { useDispatchJobs } from '@/hooks/useDispatchJobs';
import { useDrivers } from '@/hooks/useDrivers';

// Ethiopian cities with coordinates for mapping
const ethiopianCities: { [key: string]: { lat: number; lng: number } } = {
  'Addis Ababa': { lat: 9.03, lng: 38.74 },
  'Mekelle': { lat: 13.49, lng: 39.47 },
  'Gondar': { lat: 12.6, lng: 37.47 },
  'Bahir Dar': { lat: 11.59, lng: 37.39 },
  'Dire Dawa': { lat: 9.6, lng: 41.86 },
  'Hawassa': { lat: 7.05, lng: 38.48 },
  'Dessie': { lat: 11.13, lng: 39.64 },
  'Jimma': { lat: 7.67, lng: 36.83 },
  'Jijiga': { lat: 9.35, lng: 42.79 },
  'Debre Markos': { lat: 10.35, lng: 37.73 },
  'Axum': { lat: 14.13, lng: 38.72 },
  'Adigrat': { lat: 14.28, lng: 39.46 },
  'Shire': { lat: 14.1, lng: 38.28 },
  'Woldiya': { lat: 11.83, lng: 39.6 },
  'Kombolcha': { lat: 11.08, lng: 39.74 },
  'Semera': { lat: 11.79, lng: 41.01 },
  'Asaita': { lat: 11.57, lng: 41.44 },
  'Debre Birhan': { lat: 9.68, lng: 39.53 },
  'Nekemte': { lat: 9.09, lng: 36.55 },
  'Assosa': { lat: 10.07, lng: 34.53 },
  'Arba Minch': { lat: 6.04, lng: 37.55 },
  'Negele': { lat: 5.33, lng: 39.58 },
  'Bonga': { lat: 7.27, lng: 36.23 },
  'Harar': { lat: 9.31, lng: 42.12 },
  'Debre Tabor': { lat: 11.86, lng: 38.02 },
  'Mizan Teferi': { lat: 6.99, lng: 35.58 },
};

// Find nearest city to a coordinate
const findNearestCity = (lat: number, lng: number): string => {
  let nearestCity = 'Unknown';
  let minDistance = Infinity;
  
  Object.entries(ethiopianCities).forEach(([city, coords]) => {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  });
  
  return nearestCity;
};

interface LiveActivity {
  id: string;
  name: string;
  action: string;
  city: string;
  vehiclePlate?: string;
  timestamp: Date;
  type: 'request' | 'delivery' | 'movement';
}

export default function LiveDeliveryMap() {
  const { organizationId } = useAuth();
  const { vehicles } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();
  const { jobs } = useDispatchJobs();
  const { drivers } = useDrivers();
  
  const [liveRequests, setLiveRequests] = useState<LiveActivity[]>([]);
  const [liveDeliveries, setLiveDeliveries] = useState<LiveActivity[]>([]);
  const [vehicleConnections, setVehicleConnections] = useState<{ from: { lat: number; lng: number }; to: { lat: number; lng: number }; vehicleId: string }[]>([]);

  // Get driver name by ID
  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Unknown Driver';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver';
  };

  // Get vehicle plate by ID
  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return '';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || '';
  };

  // Process dispatch jobs into live requests and deliveries
  useEffect(() => {
    if (!jobs.length) return;

    // Pending and dispatched jobs = requests
    const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'dispatched' || j.status === 'en_route');
    const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'arrived');

    const requests: LiveActivity[] = pendingJobs.slice(0, 6).map(job => ({
      id: job.id,
      name: job.customer_name || getDriverName(job.driver_id),
      action: job.status === 'pending' ? 'requested pickup' : job.status === 'dispatched' ? 'dispatched' : 'en route',
      city: job.pickup_location_name || (job.pickup_lat && job.pickup_lng ? findNearestCity(job.pickup_lat, job.pickup_lng) : 'Unknown'),
      vehiclePlate: getVehiclePlate(job.vehicle_id),
      timestamp: new Date(job.created_at),
      type: 'request'
    }));

    const deliveries: LiveActivity[] = completedJobs.slice(0, 6).map(job => ({
      id: job.id,
      name: job.customer_name || getDriverName(job.driver_id),
      action: 'received package',
      city: job.dropoff_location_name || (job.dropoff_lat && job.dropoff_lng ? findNearestCity(job.dropoff_lat, job.dropoff_lng) : 'Unknown'),
      vehiclePlate: getVehiclePlate(job.vehicle_id),
      timestamp: new Date(job.completed_at || job.updated_at),
      type: 'delivery'
    }));

    setLiveRequests(requests);
    setLiveDeliveries(deliveries);
  }, [jobs, drivers, vehicles]);

  // Generate vehicle connections based on real telemetry and dispatch jobs
  useEffect(() => {
    const connections: { from: { lat: number; lng: number }; to: { lat: number; lng: number }; vehicleId: string }[] = [];

    // Create connections from active dispatch jobs
    jobs
      .filter(j => j.status === 'en_route' || j.status === 'dispatched')
      .forEach(job => {
        if (job.pickup_lat && job.pickup_lng && job.dropoff_lat && job.dropoff_lng) {
          connections.push({
            from: { lat: job.pickup_lat, lng: job.pickup_lng },
            to: { lat: job.dropoff_lat, lng: job.dropoff_lng },
            vehicleId: job.vehicle_id || '',
          });
        }
      });

    // Add connections from online vehicles' current positions to nearest city center
    vehicles.forEach(vehicle => {
      const vTelemetry = telemetry[vehicle.id];
      if (vTelemetry?.latitude && vTelemetry?.longitude && isVehicleOnline(vehicle.id)) {
        const nearestCity = findNearestCity(vTelemetry.latitude, vTelemetry.longitude);
        const cityCoords = ethiopianCities[nearestCity];
        if (cityCoords) {
          connections.push({
            from: { lat: vTelemetry.latitude, lng: vTelemetry.longitude },
            to: cityCoords,
            vehicleId: vehicle.id,
          });
        }
      }
    });

    setVehicleConnections(connections.slice(0, 20)); // Limit for performance
  }, [vehicles, telemetry, jobs, isVehicleOnline]);

  // Get online vehicles with positions
  const onlineVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        const vTelemetry = telemetry[v.id];
        return vTelemetry?.latitude && vTelemetry?.longitude && isVehicleOnline(v.id);
      })
      .map(v => ({
        id: v.id,
        plate: v.plate_number,
        lat: telemetry[v.id]?.latitude || 0,
        lng: telemetry[v.id]?.longitude || 0,
        speed: telemetry[v.id]?.speed_kmh || 0,
        isMoving: (telemetry[v.id]?.speed_kmh || 0) > 2,
      }));
  }, [vehicles, telemetry, isVehicleOnline]);

  // Convert coordinates to SVG position
  const coordToSvg = (lat: number, lng: number) => {
    const minLat = 3.5, maxLat = 15;
    const minLng = 33, maxLng = 48;
    const x = ((lng - minLng) / (maxLng - minLng)) * 500 + 50;
    const y = 500 - ((lat - minLat) / (maxLat - minLat)) * 450 + 25;
    return { x, y };
  };

  // Real-time subscription for new telemetry
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`live-map-telemetry-${organizationId.slice(0, 8)}`)
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
          if (newData.latitude && newData.longitude) {
            const vehicle = vehicles.find(v => v.id === newData.vehicle_id);
            if (vehicle) {
              const city = findNearestCity(newData.latitude, newData.longitude);
              const driverName = getDriverName(vehicle.assigned_driver_id);
              
              // Add to live requests as "vehicle moving"
              if ((newData.speed_kmh || 0) > 5) {
                const newActivity: LiveActivity = {
                  id: `tel-${newData.id}`,
                  name: driverName,
                  action: 'vehicle moving',
                  city: city,
                  vehiclePlate: vehicle.plate_number,
                  timestamp: new Date(),
                  type: 'movement'
                };
                setLiveRequests(prev => [newActivity, ...prev.slice(0, 4)]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, vehicles, drivers]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-lg">
      <div className="grid grid-cols-12 h-[500px]">
        {/* Live Requests Panel */}
        <div className="col-span-3 border-r border-border/50 flex flex-col bg-background/50">
          <div className="p-4 border-b border-border/50">
            <motion.div 
              className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full w-fit"
              animate={{ boxShadow: ['0 0 0px rgba(249,115,22,0.4)', '0 0 20px rgba(249,115,22,0.4)', '0 0 0px rgba(249,115,22,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-4 h-4" />
              <span className="font-semibold text-sm">Live Requests</span>
            </motion.div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {liveRequests.length > 0 ? liveRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-muted/30 rounded-xl p-3 border border-border/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      {request.type === 'movement' ? (
                        <Truck className="w-4 h-4 text-orange-500" />
                      ) : (
                        <User className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{request.name}</p>
                      <p className="text-xs text-muted-foreground">{request.action}</p>
                      {request.vehiclePlate && (
                        <p className="text-xs text-muted-foreground/80">{request.vehiclePlate}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-orange-500 font-medium">{request.city}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No active requests
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Map Area */}
        <div className="col-span-6 relative bg-gradient-to-b from-green-50/50 to-green-100/30 dark:from-green-900/10 dark:to-green-800/5">
          {/* Floating badges on map */}
          <motion.div 
            className="absolute top-4 left-4 flex items-center gap-2 bg-background text-orange-500 px-3 py-1.5 rounded-full shadow-lg border border-orange-200 dark:border-orange-500/20 z-10"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-3 h-3" />
            <span className="text-xs font-semibold">Live Requests</span>
          </motion.div>
          
          <motion.div 
            className="absolute top-4 right-4 flex items-center gap-2 bg-background text-green-600 px-3 py-1.5 rounded-full shadow-lg border border-green-200 dark:border-green-500/20 z-10"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-xs font-semibold">Live Deliveries</span>
          </motion.div>

          {/* Online vehicle count */}
          <motion.div 
            className="absolute bottom-4 left-4 flex items-center gap-2 bg-background text-primary px-3 py-1.5 rounded-full shadow-lg border border-primary/20 z-10"
          >
            <Truck className="w-3 h-3" />
            <span className="text-xs font-semibold">{onlineVehicles.length} Online</span>
          </motion.div>

          {/* SVG Map */}
          <svg viewBox="0 0 600 550" className="w-full h-full">
            {/* Ethiopia country outline (simplified) */}
            <path
              d="M100,400 Q80,350 100,280 Q120,200 200,150 Q280,100 350,80 Q420,70 480,100 Q540,140 560,200 Q580,280 560,350 Q540,420 480,470 Q400,520 320,530 Q240,530 180,490 Q120,450 100,400 Z"
              fill="url(#countryGradient)"
              stroke="hsl(var(--success))"
              strokeWidth="2"
              className="opacity-40"
            />
            <defs>
              <linearGradient id="countryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity="0.1" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Vehicle route connections */}
            {vehicleConnections.map((conn, i) => {
              const fromPos = coordToSvg(conn.from.lat, conn.from.lng);
              const toPos = coordToSvg(conn.to.lat, conn.to.lng);
              return (
                <motion.line
                  key={`conn-${i}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke="hsl(30, 100%, 50%)"
                  strokeWidth="2"
                  strokeOpacity="0.6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                />
              );
            })}

            {/* City markers */}
            {Object.entries(ethiopianCities).map(([city, coords], i) => {
              const pos = coordToSvg(coords.lat, coords.lng);
              const isAddis = city === 'Addis Ababa';
              const hasActiveJob = jobs.some(j => 
                (j.pickup_location_name?.includes(city) || j.dropoff_location_name?.includes(city)) &&
                (j.status === 'pending' || j.status === 'dispatched' || j.status === 'en_route')
              );
              
              return (
                <g key={city}>
                  {/* Outer glow ring */}
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isAddis ? 18 : hasActiveJob ? 14 : 10}
                    fill="none"
                    stroke={isAddis ? 'hsl(217, 91%, 60%)' : hasActiveJob ? 'hsl(30, 100%, 50%)' : 'hsl(142, 76%, 36%)'}
                    strokeWidth="2"
                    opacity="0.3"
                    animate={{ 
                      r: isAddis ? [18, 22, 18] : hasActiveJob ? [14, 18, 14] : [10, 13, 10],
                      opacity: [0.3, 0.1, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                  />
                  {/* Main marker */}
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isAddis ? 10 : hasActiveJob ? 8 : 5}
                    fill={isAddis ? 'hsl(217, 91%, 60%)' : hasActiveJob ? 'hsl(30, 100%, 50%)' : 'hsl(142, 76%, 36%)'}
                    filter="url(#glow)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                  {/* City label */}
                  <text
                    x={pos.x}
                    y={pos.y - (isAddis ? 16 : 12)}
                    textAnchor="middle"
                    className="text-[9px] font-medium fill-foreground"
                  >
                    {city}
                  </text>
                </g>
              );
            })}

            {/* Real online vehicle markers */}
            {onlineVehicles.map((vehicle, i) => {
              const pos = coordToSvg(vehicle.lat, vehicle.lng);
              return (
                <g key={vehicle.id}>
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={vehicle.isMoving ? 10 : 7}
                    fill={vehicle.isMoving ? 'hsl(217, 91%, 60%)' : 'hsl(142, 76%, 36%)'}
                    stroke="white"
                    strokeWidth="2"
                    filter="url(#glow)"
                    animate={vehicle.isMoving ? { 
                      scale: [1, 1.2, 1],
                    } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  {vehicle.isMoving && (
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={15}
                      fill="none"
                      stroke="hsl(217, 91%, 60%)"
                      strokeWidth="2"
                      opacity="0.5"
                      animate={{ 
                        r: [15, 25, 15],
                        opacity: [0.5, 0, 0.5]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Live Deliveries Panel */}
        <div className="col-span-3 border-l border-border/50 flex flex-col bg-background/50">
          <div className="p-4 border-b border-border/50">
            <motion.div 
              className="flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full w-fit"
              animate={{ boxShadow: ['0 0 0px rgba(34,197,94,0.4)', '0 0 20px rgba(34,197,94,0.4)', '0 0 0px rgba(34,197,94,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold text-sm">Live Deliveries</span>
            </motion.div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {liveDeliveries.length > 0 ? liveDeliveries.map((delivery, index) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-muted/30 rounded-xl p-3 border border-border/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{delivery.name}</p>
                      <p className="text-xs text-muted-foreground">{delivery.action}</p>
                      {delivery.vehiclePlate && (
                        <p className="text-xs text-muted-foreground/80">{delivery.vehiclePlate}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">{delivery.city}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent deliveries
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

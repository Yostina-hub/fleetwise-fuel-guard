import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, MapPin, User, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Ethiopian cities with coordinates
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

const cityNames = Object.keys(ethiopianCities);

// Generate random Ethiopian names
const ethiopianNames = [
  'Tsehay Wondwosen', 'Eyerusalem Berhane', 'Daniel Bekele', 'Kidus Mekonnen',
  'Temesgen Negash', 'Ermias Getachew', 'Yonas Kebede', 'Hiwot Tadesse',
  'Solomon Abebe', 'Meron Hailu', 'Dawit Tesfaye', 'Sara Alemayehu',
  'Biruk Assefa', 'Marta Girma', 'Abenezer Alemu', 'Ruth Mulugeta'
];

interface LiveRequest {
  id: string;
  name: string;
  action: string;
  city: string;
  timestamp: Date;
}

interface LiveDelivery {
  id: string;
  name: string;
  action: string;
  city: string;
  timestamp: Date;
}

export default function LiveDeliveryMap() {
  const { organizationId } = useAuth();
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const [deliveries, setDeliveries] = useState<LiveDelivery[]>([]);
  const [connections, setConnections] = useState<{ from: string; to: string }[]>([]);

  // Generate initial data and simulate live updates
  useEffect(() => {
    // Generate initial requests
    const initialRequests: LiveRequest[] = Array.from({ length: 5 }, (_, i) => ({
      id: `req-${i}`,
      name: ethiopianNames[Math.floor(Math.random() * ethiopianNames.length)],
      action: 'requested pickup',
      city: cityNames[Math.floor(Math.random() * cityNames.length)],
      timestamp: new Date(Date.now() - Math.random() * 300000),
    }));

    // Generate initial deliveries
    const initialDeliveries: LiveDelivery[] = Array.from({ length: 5 }, (_, i) => ({
      id: `del-${i}`,
      name: ethiopianNames[Math.floor(Math.random() * ethiopianNames.length)],
      action: 'received package',
      city: cityNames[Math.floor(Math.random() * cityNames.length)],
      timestamp: new Date(Date.now() - Math.random() * 300000),
    }));

    // Generate connections for the map
    const initialConnections = Array.from({ length: 15 }, () => {
      const cities = [...cityNames].sort(() => Math.random() - 0.5);
      return { from: cities[0], to: cities[1] };
    });

    setRequests(initialRequests);
    setDeliveries(initialDeliveries);
    setConnections(initialConnections);

    // Simulate live updates
    const interval = setInterval(() => {
      // Add new request
      if (Math.random() > 0.5) {
        const newRequest: LiveRequest = {
          id: `req-${Date.now()}`,
          name: ethiopianNames[Math.floor(Math.random() * ethiopianNames.length)],
          action: 'requested pickup',
          city: cityNames[Math.floor(Math.random() * cityNames.length)],
          timestamp: new Date(),
        };
        setRequests(prev => [newRequest, ...prev.slice(0, 4)]);
      }

      // Add new delivery
      if (Math.random() > 0.5) {
        const newDelivery: LiveDelivery = {
          id: `del-${Date.now()}`,
          name: ethiopianNames[Math.floor(Math.random() * ethiopianNames.length)],
          action: 'received package',
          city: cityNames[Math.floor(Math.random() * cityNames.length)],
          timestamp: new Date(),
        };
        setDeliveries(prev => [newDelivery, ...prev.slice(0, 4)]);
      }

      // Update connections occasionally
      if (Math.random() > 0.7) {
        const cities = [...cityNames].sort(() => Math.random() - 0.5);
        setConnections(prev => {
          const newConnections = [...prev];
          const idx = Math.floor(Math.random() * newConnections.length);
          newConnections[idx] = { from: cities[0], to: cities[1] };
          return newConnections;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Convert coordinates to SVG position
  const coordToSvg = (lat: number, lng: number) => {
    const minLat = 3.5, maxLat = 15;
    const minLng = 33, maxLng = 48;
    const x = ((lng - minLng) / (maxLng - minLng)) * 500 + 50;
    const y = 500 - ((lat - minLat) / (maxLat - minLat)) * 450 + 25;
    return { x, y };
  };

  return (
    <div className="bg-white dark:bg-[#1a2332] rounded-2xl border border-border/50 overflow-hidden">
      <div className="grid grid-cols-12 h-[500px]">
        {/* Live Requests Panel */}
        <div className="col-span-3 border-r border-border/50 flex flex-col">
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
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 border border-border/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{request.name}</p>
                      <p className="text-xs text-muted-foreground">{request.action}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-orange-500 font-medium">{request.city}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Map Area */}
        <div className="col-span-6 relative bg-gradient-to-b from-green-50/50 to-green-100/30 dark:from-green-900/10 dark:to-green-800/5">
          {/* Floating badges on map */}
          <motion.div 
            className="absolute top-4 left-4 flex items-center gap-2 bg-white dark:bg-[#1a2332] text-orange-500 px-3 py-1.5 rounded-full shadow-lg border border-orange-200 dark:border-orange-500/20 z-10"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-3 h-3" />
            <span className="text-xs font-semibold">Live Requests</span>
          </motion.div>
          
          <motion.div 
            className="absolute top-4 right-4 flex items-center gap-2 bg-white dark:bg-[#1a2332] text-green-600 px-3 py-1.5 rounded-full shadow-lg border border-green-200 dark:border-green-500/20 z-10"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-xs font-semibold">Live Deliveries</span>
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

            {/* Connection lines */}
            {connections.map((conn, i) => {
              const from = ethiopianCities[conn.from];
              const to = ethiopianCities[conn.to];
              if (!from || !to) return null;
              const fromPos = coordToSvg(from.lat, from.lng);
              const toPos = coordToSvg(to.lat, to.lng);
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
              const isDeliveryCity = deliveries.some(d => d.city === city);
              const isRequestCity = requests.some(r => r.city === city);
              const isAddis = city === 'Addis Ababa';
              
              return (
                <g key={city}>
                  {/* Outer glow ring */}
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isAddis ? 18 : 12}
                    fill="none"
                    stroke={isAddis ? 'hsl(217, 91%, 60%)' : 'hsl(142, 76%, 36%)'}
                    strokeWidth="2"
                    opacity="0.3"
                    animate={{ 
                      r: isAddis ? [18, 22, 18] : [12, 16, 12],
                      opacity: [0.3, 0.1, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                  />
                  {/* Main marker */}
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isAddis ? 10 : 6}
                    fill={isAddis ? 'hsl(217, 91%, 60%)' : 'hsl(142, 76%, 36%)'}
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
          </svg>
        </div>

        {/* Live Deliveries Panel */}
        <div className="col-span-3 border-l border-border/50 flex flex-col">
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
              {deliveries.map((delivery, index) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 border border-border/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{delivery.name}</p>
                      <p className="text-xs text-muted-foreground">{delivery.action}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">{delivery.city}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

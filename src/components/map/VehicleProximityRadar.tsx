import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { X, Radio, AlertTriangle } from 'lucide-react';

interface ProximityAlert {
  vehicleA: string;
  vehicleB: string;
  plateA: string;
  plateB: string;
  distanceMeters: number;
  risk: 'critical' | 'warning' | 'info';
}

interface VehicleProximityRadarProps {
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{ id: string; plate: string; lat: number; lng: number; speed: number; status: string }>;
}

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const VehicleProximityRadar = ({ visible, onClose, vehicles }: VehicleProximityRadarProps) => {
  const [threshold, setThreshold] = useState(200); // meters
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);

  const onlineVehicles = useMemo(() => vehicles.filter(v => v.status !== 'offline'), [vehicles]);

  useEffect(() => {
    if (!visible || onlineVehicles.length < 2) {
      setAlerts([]);
      return;
    }

    const proximityAlerts: ProximityAlert[] = [];

    for (let i = 0; i < onlineVehicles.length; i++) {
      for (let j = i + 1; j < onlineVehicles.length; j++) {
        const a = onlineVehicles[i];
        const b = onlineVehicles[j];
        const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);

        if (dist <= threshold) {
          let risk: 'critical' | 'warning' | 'info' = 'info';
          if (dist < 50) risk = 'critical';
          else if (dist < 100) risk = 'warning';

          // Higher risk if both are moving fast
          if ((a.speed > 60 || b.speed > 60) && dist < 150) risk = 'critical';

          proximityAlerts.push({
            vehicleA: a.id,
            vehicleB: b.id,
            plateA: a.plate,
            plateB: b.plate,
            distanceMeters: Math.round(dist),
            risk,
          });
        }
      }
    }

    proximityAlerts.sort((a, b) => a.distanceMeters - b.distanceMeters);
    setAlerts(proximityAlerts.slice(0, 20));
  }, [onlineVehicles, threshold, visible]);

  if (!visible) return null;

  const riskColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-80 max-h-[60vh] overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold">Proximity Radar</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Detection range</span>
          <span className="text-xs font-medium">{threshold}m</span>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={(v) => setThreshold(v[0])}
          min={50}
          max={1000}
          step={50}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Monitoring {onlineVehicles.length} vehicles</span>
        {alerts.length > 0 && (
          <Badge variant="destructive" className="text-[10px] h-5">
            {alerts.length} alerts
          </Badge>
        )}
      </div>

      {alerts.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">✅ No proximity alerts</p>
      )}

      {alerts.map((a, i) => (
        <div key={i} className="border rounded-lg p-2.5 mb-1.5 bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              {a.risk === 'critical' && <AlertTriangle className="w-3 h-3 text-red-500" />}
              <span className="text-xs font-medium">{a.plateA} ↔ {a.plateB}</span>
            </div>
            <Badge className={`text-[9px] h-4 px-1 ${riskColors[a.risk]}`}>
              {a.risk}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">{a.distanceMeters}m apart</span>
        </div>
      ))}
    </div>
  );
};

export default VehicleProximityRadar;

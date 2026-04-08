import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Truck, Navigation, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface NearestVehicle {
  id: string;
  plate: string;
  distanceKm: number;
  etaMinutes: number;
  speed: number;
  status: string;
  fuel: number;
}

interface SmartDispatchSuggesterProps {
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{ id: string; plate: string; lat: number; lng: number; speed: number; fuel: number; status: string }>;
  onVehicleSelect?: (vehicleId: string) => void;
}

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const SmartDispatchSuggester = ({ visible, onClose, vehicles, onVehicleSelect }: SmartDispatchSuggesterProps) => {
  const [jobLat, setJobLat] = useState('');
  const [jobLng, setJobLng] = useState('');
  const [jobName, setJobName] = useState('');
  const [suggestions, setSuggestions] = useState<NearestVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const availableVehicles = useMemo(() =>
    vehicles.filter(v => v.status !== 'offline' && v.fuel > 10),
    [vehicles]
  );

  const findNearest = useCallback(() => {
    const lat = parseFloat(jobLat);
    const lng = parseFloat(jobLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Enter valid destination coordinates');
      return;
    }

    setLoading(true);

    // Calculate distances and ETAs
    const ranked = availableVehicles.map(v => {
      const dist = haversineKm(v.lat, v.lng, lat, lng);
      const roadDist = dist * 1.35;
      const avgSpeed = v.speed > 10 ? v.speed * 0.75 : 30;
      const eta = (roadDist / avgSpeed) * 60;

      return {
        id: v.id,
        plate: v.plate,
        distanceKm: Math.round(roadDist * 10) / 10,
        etaMinutes: Math.round(eta),
        speed: v.speed,
        status: v.status,
        fuel: v.fuel,
      };
    });

    // Score: weighted by distance (60%), ETA (30%), fuel (10%)
    ranked.sort((a, b) => {
      const scoreA = a.distanceKm * 0.6 + a.etaMinutes * 0.3 + (100 - a.fuel) * 0.1;
      const scoreB = b.distanceKm * 0.6 + b.etaMinutes * 0.3 + (100 - b.fuel) * 0.1;
      return scoreA - scoreB;
    });

    setSuggestions(ranked.slice(0, 5));
    setLoading(false);
  }, [jobLat, jobLng, availableVehicles]);

  if (!visible) return null;

  return (
    <div className="absolute top-20 left-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-80 max-h-[70vh] overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold">Smart Dispatch</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-2 mb-3">
        <Input
          placeholder="Job location name (optional)"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          className="h-8 text-xs"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <Input placeholder="Latitude" value={jobLat} onChange={(e) => setJobLat(e.target.value)} className="h-8 text-xs" type="number" step="0.000001" />
          <Input placeholder="Longitude" value={jobLng} onChange={(e) => setJobLng(e.target.value)} className="h-8 text-xs" type="number" step="0.000001" />
        </div>
        <Button className="w-full h-9 text-xs" onClick={findNearest} disabled={loading || !jobLat || !jobLng}>
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1.5" />}
          Find Best Vehicle
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground mb-2">{availableVehicles.length} available vehicles</p>

      {suggestions.map((s, i) => (
        <div
          key={s.id}
          className="border rounded-lg p-2.5 mb-1.5 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
          onClick={() => onVehicleSelect?.(s.id)}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {i === 0 && <Badge className="text-[9px] h-4 px-1 bg-emerald-100 text-emerald-700 border-emerald-200">Best</Badge>}
              <span className="text-xs font-semibold">{s.plate}</span>
            </div>
            <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5" />
              {s.distanceKm} km
            </div>
            <div>~{s.etaMinutes < 60 ? `${s.etaMinutes}m` : `${Math.floor(s.etaMinutes / 60)}h${s.etaMinutes % 60}m`}</div>
            <div>⛽ {s.fuel}%</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmartDispatchSuggester;

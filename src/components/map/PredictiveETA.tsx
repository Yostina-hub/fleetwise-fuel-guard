import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Navigation, Clock, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ETAPrediction {
  vehicleId: string;
  plate: string;
  etaMinutes: number;
  distanceKm: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  suggestedRoute?: string;
}

interface PredictiveETAProps {
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{
    id: string;
    plate: string;
    lat: number;
    lng: number;
    speed: number;
    status: string;
  }>;
}

export const PredictiveETA = ({ visible, onClose, vehicles }: PredictiveETAProps) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [destName, setDestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<ETAPrediction | null>(null);

  const movingVehicles = vehicles.filter(v => v.status !== 'offline');

  const calculateETA = useCallback(async () => {
    if (!selectedVehicleId || !destLat || !destLng) {
      toast.error('Select a vehicle and enter destination coordinates');
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);
    if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      toast.error('Invalid destination coordinates');
      return;
    }

    setLoading(true);

    try {
      // Calculate straight-line distance
      const R = 6371; // km
      const latDiff = ((dLat - vehicle.lat) * Math.PI) / 180;
      const lngDiff = ((dLng - vehicle.lng) * Math.PI) / 180;
      const a =
        Math.sin(latDiff / 2) ** 2 +
        Math.cos((vehicle.lat * Math.PI) / 180) * Math.cos((dLat * Math.PI) / 180) * Math.sin(lngDiff / 2) ** 2;
      const straightLineKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Road distance is typically 1.3-1.5x straight line
      const estimatedRoadKm = straightLineKm * 1.35;

      // Try to get route distance from Lemat API
      let routeDistanceKm = estimatedRoadKm;
      let routeDurationMin = 0;
      let usedRouting = false;

      const lematKey = sessionStorage.getItem('lemat_api_key');
      if (lematKey) {
        try {
          const coords = `${vehicle.lng},${vehicle.lat};${dLng},${dLat}`;
          const url = `https://lemat.goffice.et/api/v1/directions?coords=${coords}&profile=driving`;
          const res = await fetch(url, {
            headers: { 'X-Api-Key': lematKey },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.routes?.[0]) {
              routeDistanceKm = data.data.routes[0].distance / 1000;
              routeDurationMin = data.data.routes[0].duration / 60;
              usedRouting = true;
            }
          }
        } catch {}
      }

      // AI-enhanced prediction factors
      const factors: string[] = [];
      const currentSpeed = vehicle.speed;
      
      // Speed-based estimate
      let avgExpectedSpeed: number;
      if (currentSpeed > 60) {
        avgExpectedSpeed = currentSpeed * 0.85; // Highway deceleration
        factors.push('Highway speeds detected');
      } else if (currentSpeed > 20) {
        avgExpectedSpeed = currentSpeed * 0.75; // Urban slowdown
        factors.push('Urban driving conditions');
      } else {
        avgExpectedSpeed = 30; // Assume city average if vehicle is slow/stopped
        factors.push('Vehicle currently slow/stationary');
      }

      // Time of day factor
      const hour = new Date().getHours();
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        avgExpectedSpeed *= 0.7;
        factors.push('Rush hour traffic expected');
      } else if (hour >= 22 || hour <= 5) {
        avgExpectedSpeed *= 1.1;
        factors.push('Low traffic period');
      }

      // Calculate ETA
      let etaMinutes: number;
      if (usedRouting && routeDurationMin > 0) {
        etaMinutes = routeDurationMin;
        factors.push('Route-based ETA');
      } else {
        etaMinutes = (routeDistanceKm / avgExpectedSpeed) * 60;
        factors.push('Estimated based on speed & distance');
      }

      // Confidence level
      let confidence: 'high' | 'medium' | 'low';
      if (usedRouting && currentSpeed > 10) {
        confidence = 'high';
      } else if (currentSpeed > 5 || straightLineKm < 10) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      setPrediction({
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        etaMinutes: Math.round(etaMinutes),
        distanceKm: Math.round(routeDistanceKm * 10) / 10,
        confidence,
        factors,
        suggestedRoute: usedRouting ? 'Lemat optimal route' : undefined,
      });
    } catch (err) {
      console.error('ETA calculation error:', err);
      toast.error('Failed to calculate ETA');
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId, destLat, destLng, vehicles]);

  if (!visible) return null;

  const confidenceColors = {
    high: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold">Predictive ETA</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Vehicle selector */}
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select vehicle" />
          </SelectTrigger>
          <SelectContent>
            {movingVehicles.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.plate} — {v.speed} km/h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Destination */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Destination</label>
          <Input
            placeholder="Name (optional)"
            value={destName}
            onChange={(e) => setDestName(e.target.value)}
            className="h-8 text-xs mb-1.5"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              placeholder="Latitude"
              value={destLat}
              onChange={(e) => setDestLat(e.target.value)}
              className="h-8 text-xs"
              type="number"
              step="0.000001"
            />
            <Input
              placeholder="Longitude"
              value={destLng}
              onChange={(e) => setDestLng(e.target.value)}
              className="h-8 text-xs"
              type="number"
              step="0.000001"
            />
          </div>
        </div>

        <Button
          className="w-full h-9 text-xs"
          onClick={calculateETA}
          disabled={loading || !selectedVehicleId || !destLat || !destLng}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 mr-1.5" />
              Calculate ETA
            </>
          )}
        </Button>

        {/* Prediction result */}
        {prediction && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{prediction.plate}</span>
              <Badge className={`text-[10px] ${confidenceColors[prediction.confidence]}`}>
                {prediction.confidence} confidence
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-lg font-bold text-primary">
                  {prediction.etaMinutes < 60
                    ? `${prediction.etaMinutes}m`
                    : `${Math.floor(prediction.etaMinutes / 60)}h ${prediction.etaMinutes % 60}m`}
                </div>
                <div className="text-[10px] text-muted-foreground">ETA</div>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-lg font-bold text-blue-600">{prediction.distanceKm}</div>
                <div className="text-[10px] text-muted-foreground">km</div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Factors:</span>
              {prediction.factors.map((f, i) => (
                <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveETA;

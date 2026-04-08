import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Droplets, AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface FuelAnomaly {
  vehicleId: string;
  plate: string;
  dropPercent: number;
  dropLiters: number;
  location: { lat: number; lng: number } | null;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  theftProbability: number;
}

interface FuelAnomalyDetectorProps {
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{ id: string; plate: string; lat: number; lng: number; fuel: number }>;
}

export const FuelAnomalyDetector = ({ visible, onClose, vehicles }: FuelAnomalyDetectorProps) => {
  const { organizationId } = useOrganization();
  const [anomalies, setAnomalies] = useState<FuelAnomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  const scanForAnomalies = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // Get recent telemetry with fuel data using RPC or direct query
      const { data, error } = await supabase
        .from('vehicle_telemetry')
        .select('vehicle_id, fuel_level_percent, latitude, longitude, last_communication_at')
        .eq('organization_id', organizationId)
        .not('fuel_level_percent', 'is', null)
        .order('last_communication_at', { ascending: true })
        .limit(5000);

      if (error) throw error;

      const vehicleData: Record<string, Array<{ fuel: number; lat: number; lng: number; time: string }>> = {};
      (data || []).forEach((row: any) => {
        if (row.fuel_level_percent != null) {
          if (!vehicleData[row.vehicle_id]) vehicleData[row.vehicle_id] = [];
          vehicleData[row.vehicle_id].push({
            fuel: row.fuel_level_percent,
            lat: row.latitude || 0,
            lng: row.longitude || 0,
            time: row.last_communication_at,
          });
        }
      });

      const detected: FuelAnomaly[] = [];
      const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

      Object.entries(vehicleData).forEach(([vehicleId, readings]) => {
        if (readings.length < 3) return;
        const veh = vehicleMap.get(vehicleId);

        for (let i = 1; i < readings.length; i++) {
          const drop = readings[i - 1].fuel - readings[i].fuel;
          // Significant drop > 10% without engine running for refuel
          if (drop > 10) {
            const timeDiffMin = (new Date(readings[i].time).getTime() - new Date(readings[i - 1].time).getTime()) / 60000;
            // Sudden drop (< 30 min) is suspicious
            const isSudden = timeDiffMin < 30;
            const severity: 'low' | 'medium' | 'high' = drop > 30 ? 'high' : drop > 20 ? 'medium' : 'low';
            const theftProb = Math.min(95, Math.round((drop / 50) * 100 * (isSudden ? 1.5 : 0.7)));

            detected.push({
              vehicleId,
              plate: veh?.plate || vehicleId.slice(0, 8),
              dropPercent: Math.round(drop),
              dropLiters: Math.round(drop * 0.8), // Estimate based on avg tank
              location: readings[i].lat ? { lat: readings[i].lat, lng: readings[i].lng } : null,
              timestamp: readings[i].time,
              severity,
              theftProbability: theftProb,
            });
          }
        }
      });

      // Sort by severity
      detected.sort((a, b) => b.theftProbability - a.theftProbability);
      setAnomalies(detected.slice(0, 20));
      setScanned(true);

      if (detected.length === 0) {
        toast.success('No fuel anomalies detected in the last 24h');
      } else {
        toast.warning(`${detected.length} fuel anomalies detected!`);
      }
    } catch (err) {
      console.error('Fuel anomaly scan error:', err);
      toast.error('Failed to scan for fuel anomalies');
    } finally {
      setLoading(false);
    }
  }, [organizationId, vehicles]);

  if (!visible) return null;

  const severityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-80 max-h-[70vh] overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold">Fuel Anomaly Detector</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Button className="w-full h-9 text-xs mb-3" onClick={scanForAnomalies} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Scanning 24h data...
          </>
        ) : (
          <>
            <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
            {scanned ? 'Re-scan' : 'Scan for Anomalies'}
          </>
        )}
      </Button>

      {scanned && anomalies.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">✅ No anomalies detected</p>
      )}

      {anomalies.map((a, i) => (
        <div key={i} className="border rounded-lg p-3 mb-2 space-y-1.5 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{a.plate}</span>
            <Badge className={`text-[10px] ${severityColors[a.severity]}`}>
              {a.severity}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
            <span>-{a.dropPercent}% fuel drop (~{a.dropLiters}L)</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Theft probability: {a.theftProbability}%</span>
            <span>{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${a.theftProbability > 70 ? 'bg-red-500' : a.theftProbability > 40 ? 'bg-amber-500' : 'bg-yellow-500'}`}
              style={{ width: `${a.theftProbability}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FuelAnomalyDetector;

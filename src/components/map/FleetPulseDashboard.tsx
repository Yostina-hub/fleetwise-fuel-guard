import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Activity, TrendingUp, Gauge, Fuel, Clock, Wifi } from 'lucide-react';

interface FleetPulseDashboardProps {
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{
    id: string;
    speed: number;
    fuel: number;
    status: string;
    engine_on?: boolean;
    isOffline?: boolean;
  }>;
}

export const FleetPulseDashboard = ({ visible, onClose, vehicles }: FleetPulseDashboardProps) => {
  const stats = useMemo(() => {
    const total = vehicles.length;
    const online = vehicles.filter(v => !v.isOffline).length;
    const moving = vehicles.filter(v => v.status === 'moving').length;
    const idle = vehicles.filter(v => v.status === 'idle').length;
    const stopped = vehicles.filter(v => v.status === 'stopped').length;
    const offline = vehicles.filter(v => v.isOffline).length;

    const movingVehicles = vehicles.filter(v => v.status === 'moving');
    const avgSpeed = movingVehicles.length > 0
      ? Math.round(movingVehicles.reduce((s, v) => s + v.speed, 0) / movingVehicles.length)
      : 0;
    const maxSpeed = movingVehicles.length > 0
      ? Math.max(...movingVehicles.map(v => v.speed))
      : 0;

    const onlineVehicles = vehicles.filter(v => !v.isOffline);
    const avgFuel = onlineVehicles.length > 0
      ? Math.round(onlineVehicles.reduce((s, v) => s + v.fuel, 0) / onlineVehicles.length)
      : 0;
    const lowFuel = onlineVehicles.filter(v => v.fuel < 20).length;

    const utilization = total > 0 ? Math.round((moving / total) * 100) : 0;
    const onlinePercent = total > 0 ? Math.round((online / total) * 100) : 0;

    return { total, online, moving, idle, stopped, offline, avgSpeed, maxSpeed, avgFuel, lowFuel, utilization, onlinePercent };
  }, [vehicles]);

  if (!visible) return null;

  const kpis = [
    { icon: Wifi, label: 'Online', value: `${stats.onlinePercent}%`, sub: `${stats.online}/${stats.total}`, color: 'text-emerald-500' },
    { icon: TrendingUp, label: 'Moving', value: stats.moving.toString(), sub: `${stats.utilization}% util`, color: 'text-blue-500' },
    { icon: Gauge, label: 'Avg Speed', value: `${stats.avgSpeed}`, sub: `max ${stats.maxSpeed} km/h`, color: 'text-orange-500' },
    { icon: Fuel, label: 'Avg Fuel', value: `${stats.avgFuel}%`, sub: `${stats.lowFuel} low`, color: 'text-amber-500' },
    { icon: Clock, label: 'Idle', value: stats.idle.toString(), sub: `${stats.stopped} stopped`, color: 'text-yellow-500' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-3">
      <div className="flex items-center gap-3">
        <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-xs font-semibold">Fleet Pulse</span>

        <div className="flex items-center gap-4 ml-2">
          {kpis.map((kpi, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color} shrink-0`} />
              <div className="leading-none">
                <div className="text-sm font-bold">{kpi.value}</div>
                <div className="text-[9px] text-muted-foreground">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default FleetPulseDashboard;

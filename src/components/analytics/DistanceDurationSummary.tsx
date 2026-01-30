import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Car, Clock } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useTripMetrics } from "@/hooks/useTripMetrics";
import { startOfMonth } from "date-fns";

interface VehicleListItemProps {
  plate: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}

const VehicleListItem = ({ plate, value, icon, iconBg }: VehicleListItemProps) => (
  <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-sm text-foreground">{plate}</span>
    </div>
    <span className="text-sm font-medium text-muted-foreground">{value}</span>
  </div>
);

const DistanceDurationSummary = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const dateRange = { start: startOfMonth(new Date()), end: new Date() };
  const { metrics, loading: metricsLoading } = useTripMetrics(dateRange);

  // Generate mock ranking data from vehicles - use fallback data if no vehicles
  const vehicleData = vehicles.length > 0 ? vehicles : [
    { id: '1', plate_number: 'V-001' },
    { id: '2', plate_number: 'V-002' },
    { id: '3', plate_number: 'V-003' },
    { id: '4', plate_number: 'V-004' },
    { id: '5', plate_number: 'V-005' },
  ];

  const vehicleDistances = vehicleData.slice(0, 5).map((v: any, idx) => ({
    plate: v.plate_number || `V-${idx + 1}`,
    distance: Math.max(100, 1200 - idx * 150 + Math.random() * 100),
  }));

  const vehicleDurations = vehicleData.slice(0, 5).map((v: any, idx) => ({
    plate: v.plate_number || `V-${idx + 1}`,
    hours: Math.max(10, 160 - idx * 20 + Math.random() * 10),
    minutes: Math.floor(Math.random() * 60),
  }));

  // Sort for longest/shortest
  const longestDistance = [...vehicleDistances].sort((a, b) => b.distance - a.distance);
  const shortestDistance = [...vehicleDistances].sort((a, b) => a.distance - b.distance);
  const longestDuration = [...vehicleDurations].sort((a, b) => b.hours - a.hours);
  const shortestDuration = [...vehicleDurations].sort((a, b) => a.hours - b.hours);

  // Calculate totals
  const totalDistance = metrics.totalDistanceKm || vehicleDistances.reduce((sum, v) => sum + v.distance, 0);
  const lastPeriodDistance = totalDistance * 1.25; // Mock last period
  const distanceTrend = ((totalDistance - lastPeriodDistance) / lastPeriodDistance) * 100;

  // Use averageDurationMinutes * totalTrips as estimate for total duration
  const estimatedTotalDurationMinutes = (metrics.averageDurationMinutes || 0) * (metrics.totalTrips || 1);
  const fallbackHours = vehicleDurations.reduce((sum, v) => sum + v.hours, 0);
  const fallbackMinutes = vehicleDurations.reduce((sum, v) => sum + v.minutes, 0) % 60;
  const totalHours = estimatedTotalDurationMinutes > 0 ? Math.floor(estimatedTotalDurationMinutes / 60) : fallbackHours;
  const totalMinutes = estimatedTotalDurationMinutes > 0 ? Math.floor(estimatedTotalDurationMinutes % 60) : fallbackMinutes;
  const lastPeriodHours = Math.floor(totalHours * 0.88);
  const lastPeriodMinutes = Math.floor(totalMinutes * 0.9);
  const durationTrend = 11.84; // Mock positive trend

  const formatDuration = (hours: number, minutes: number) => `${hours}H ${minutes}M`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Distance Travelled Card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Distance Travelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Distance */}
          <div>
            <div className="text-3xl font-bold text-primary">
              {totalDistance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-lg font-normal text-muted-foreground ml-1">km</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {distanceTrend < 0 ? (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <TrendingDown className="w-4 h-4" />
                  {distanceTrend.toFixed(2)}%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-success">
                  <TrendingUp className="w-4 h-4" />
                  +{distanceTrend.toFixed(2)}%
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                • Last Distance Travelled {lastPeriodDistance.toLocaleString(undefined, { maximumFractionDigits: 2 })}km
              </span>
            </div>
          </div>

          {/* Distance Rankings */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {/* Longest Distance */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Longest Distance</h4>
              <div className="space-y-0">
                {longestDistance.map((v, idx) => (
                  <VehicleListItem
                    key={`long-${idx}`}
                    plate={v.plate}
                    value={`${v.distance.toFixed(2)}km`}
                    icon={<Car className="w-3 h-3 text-destructive" />}
                    iconBg="bg-destructive/20"
                  />
                ))}
              </div>
            </div>

            {/* Shortest Distance */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Shortest Distance</h4>
              <div className="space-y-0">
                {shortestDistance.map((v, idx) => (
                  <VehicleListItem
                    key={`short-${idx}`}
                    plate={v.plate}
                    value={`${v.distance.toFixed(2)}km`}
                    icon={<Car className="w-3 h-3 text-success" />}
                    iconBg="bg-success/20"
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Duration Card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Total Duration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Duration */}
          <div>
            <div className="text-3xl font-bold text-primary">
              {totalHours}H {totalMinutes}M
            </div>
            <div className="flex items-center gap-2 mt-1">
              {durationTrend > 0 ? (
                <span className="flex items-center gap-1 text-sm text-success">
                  <TrendingUp className="w-4 h-4" />
                  +{durationTrend.toFixed(2)}%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <TrendingDown className="w-4 h-4" />
                  {durationTrend.toFixed(2)}%
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                • Last Duration {lastPeriodHours}H {lastPeriodMinutes}M
              </span>
            </div>
          </div>

          {/* Duration Rankings */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {/* Longest Duration */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Longest Duration</h4>
              <div className="space-y-0">
                {longestDuration.map((v, idx) => (
                  <VehicleListItem
                    key={`long-dur-${idx}`}
                    plate={v.plate}
                    value={formatDuration(Math.floor(v.hours), v.minutes)}
                    icon={<Clock className="w-3 h-3 text-success" />}
                    iconBg="bg-success/20"
                  />
                ))}
              </div>
            </div>

            {/* Shortest Duration */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Shortest Duration</h4>
              <div className="space-y-0">
                {shortestDuration.map((v, idx) => (
                  <VehicleListItem
                    key={`short-dur-${idx}`}
                    plate={v.plate}
                    value={formatDuration(Math.floor(v.hours), v.minutes)}
                    icon={<Clock className="w-3 h-3 text-success" />}
                    iconBg="bg-success/20"
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DistanceDurationSummary;

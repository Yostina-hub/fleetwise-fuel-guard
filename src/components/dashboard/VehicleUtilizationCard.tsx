import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TelemetryData {
  vehicle_id: string;
  last_communication?: string;
  device_connected?: boolean;
}

interface VehicleUtilizationCardProps {
  vehicles: { id: string }[];
  telemetryMap: Record<string, TelemetryData>;
}

const VehicleUtilizationCard = ({ vehicles, telemetryMap }: VehicleUtilizationCardProps) => {
  const utilizationData = useMemo(() => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let vehicleOnIn24hr = 0;
    let vehicleOffOver24hr = 0;
    let notIncluded = 0;

    vehicles.forEach((v) => {
      const telemetry = telemetryMap[v.id];
      if (telemetry?.last_communication) {
        const lastComm = new Date(telemetry.last_communication);
        if (lastComm >= last24Hours) {
          vehicleOnIn24hr++;
        } else {
          vehicleOffOver24hr++;
        }
      } else {
        vehicleOffOver24hr++;
      }
    });

    return [
      { name: "Vehicle Off For > 24 hr", value: vehicleOffOver24hr, color: "hsl(var(--muted))" },
      { name: "Vehicle On In Last 24 hr", value: vehicleOnIn24hr, color: "hsl(var(--success))" },
      { name: "Vehicles Not Included", value: notIncluded, color: "hsl(var(--destructive))" },
    ];
  }, [vehicles, telemetryMap]);

  const totalVehicles = vehicles.length;
  const activeCount = utilizationData.find(d => d.name === "Vehicle On In Last 24 hr")?.value || 0;
  const activePercent = totalVehicles > 0 ? Math.round((activeCount / totalVehicles) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Vehicle Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={utilizationData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {utilizationData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{activePercent}%</span>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {utilizationData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={item.value > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}>
                    {item.name}
                  </span>
                  {item.name === "Vehicles Not Included" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Vehicles without tracking devices or disabled</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Total</span>
              <span className="font-bold">{totalVehicles}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleUtilizationCard;

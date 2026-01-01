import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface Vehicle {
  id: string;
  status?: string;
  next_service_date?: string;
}

interface VehicleHealthStatusCardProps {
  vehicles: Vehicle[];
}

const VehicleHealthStatusCard = ({ vehicles }: VehicleHealthStatusCardProps) => {
  const healthData = useMemo(() => {
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let offTheRoad = 0;
    let overdue = 0;
    let actionNow = 0;
    let actionSoon = 0;
    let upToDate = 0;

    vehicles.forEach((v) => {
      if (v.status === 'maintenance' || v.status === 'inactive') {
        offTheRoad++;
      } else if (v.next_service_date) {
        const serviceDate = new Date(v.next_service_date);
        if (serviceDate < now) {
          overdue++;
        } else if (serviceDate < oneWeek) {
          actionNow++;
        } else if (serviceDate < oneMonth) {
          actionSoon++;
        } else {
          upToDate++;
        }
      } else {
        upToDate++;
      }
    });

    return [
      { name: "Off the Road", value: offTheRoad, color: "hsl(var(--muted-foreground))" },
      { name: "Overdue", value: overdue, color: "hsl(var(--muted))" },
      { name: "Action Now", value: actionNow, color: "hsl(var(--destructive))" },
      { name: "Action Soon", value: actionSoon, color: "hsl(var(--warning))" },
      { name: "Up to Date", value: upToDate, color: "hsl(var(--success))" },
    ];
  }, [vehicles]);

  const totalVehicles = vehicles.length;
  const upToDateCount = healthData.find(d => d.name === "Up to Date")?.value || 0;
  const upToDatePercent = totalVehicles > 0 ? Math.round((upToDateCount / totalVehicles) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Vehicle Health Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={healthData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {healthData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{upToDatePercent}%</span>
              <span className="text-xs text-muted-foreground">Up to Date</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {healthData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={item.value > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}>
                    {item.name}
                  </span>
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

export default VehicleHealthStatusCard;

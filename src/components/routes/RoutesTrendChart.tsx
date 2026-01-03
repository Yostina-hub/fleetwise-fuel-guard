import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const RoutesTrendChart = () => {
  // Mock data - in production, this would come from props or API
  const data = [
    { month: "Jan", deliveries: 145, efficiency: 78 },
    { month: "Feb", deliveries: 162, efficiency: 82 },
    { month: "Mar", deliveries: 178, efficiency: 85 },
    { month: "Apr", deliveries: 155, efficiency: 80 },
    { month: "May", deliveries: 190, efficiency: 88 },
    { month: "Jun", deliveries: 205, efficiency: 91 }
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          Delivery Efficiency Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="efficiency"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                name="Efficiency %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoutesTrendChart;

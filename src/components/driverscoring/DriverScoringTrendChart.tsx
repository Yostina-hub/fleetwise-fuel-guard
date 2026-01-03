import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const DriverScoringTrendChart = () => {
  // Mock data - in production, this would come from props or API
  const data = [
    { month: "Jan", avgScore: 72, highRisk: 5 },
    { month: "Feb", avgScore: 74, highRisk: 4 },
    { month: "Mar", avgScore: 76, highRisk: 4 },
    { month: "Apr", avgScore: 75, highRisk: 5 },
    { month: "May", avgScore: 79, highRisk: 3 },
    { month: "Jun", avgScore: 82, highRisk: 2 }
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          Fleet Score Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" domain={[60, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                name="Avg Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverScoringTrendChart;

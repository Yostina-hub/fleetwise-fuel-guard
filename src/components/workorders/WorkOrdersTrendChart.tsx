import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const WorkOrdersTrendChart = () => {
  // Mock data - in production, this would come from props or API
  const data = [
    { month: "Jan", completed: 12, cost: 4500 },
    { month: "Feb", completed: 15, cost: 5200 },
    { month: "Mar", completed: 18, cost: 6100 },
    { month: "Apr", completed: 14, cost: 4800 },
    { month: "May", completed: 22, cost: 7500 },
    { month: "Jun", completed: 19, cost: 6800 }
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          Work Order Trends
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
                dataKey="completed"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                name="Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkOrdersTrendChart;

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
    <Card 
      className="border border-cyan-500/20"
      style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <TrendingUp className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          Fleet Score Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)' }} domain={[60, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#001a33',
                  border: '1px solid rgba(0, 191, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="#8DC63F"
                fill="#8DC63F"
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

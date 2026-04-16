import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useDriverScores } from "@/hooks/useDriverScores";
import { format, parseISO } from "date-fns";

const DriverScoringTrendChart = () => {
  const { scoreHistory } = useDriverScores();

  const data = useMemo(() => {
    if (!scoreHistory || scoreHistory.length === 0) return [];

    // Group by month and compute averages
    const monthMap: Record<string, { total: number; count: number; highRisk: number }> = {};
    scoreHistory.forEach((s) => {
      const key = format(parseISO(s.score_period_end), "yyyy-MM");
      if (!monthMap[key]) monthMap[key] = { total: 0, count: 0, highRisk: 0 };
      monthMap[key].total += s.overall_score;
      monthMap[key].count += 1;
      if (s.safety_rating === "poor" || s.safety_rating === "critical") {
        monthMap[key].highRisk += 1;
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        month: format(parseISO(`${key}-01`), "MMM"),
        avgScore: Math.round(v.total / v.count),
        highRisk: v.highRisk,
      }));
  }, [scoreHistory]);

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
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/50 text-sm">
              No historical data available yet
            </div>
          ) : (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverScoringTrendChart;

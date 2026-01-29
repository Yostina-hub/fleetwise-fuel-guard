import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import { Target, Zap } from "lucide-react";

interface RadarPerformanceChartProps {
  data: {
    vehicles: any[];
    drivers: any[];
    trips: any[];
    alerts: any[];
  };
  loading?: boolean;
}

const RadarPerformanceChart = ({ data, loading }: RadarPerformanceChartProps) => {
  const { vehicles, drivers, trips, alerts } = data;

  // Calculate performance metrics
  const performanceData = [
    {
      metric: "Utilization",
      current: vehicles.length > 0 
        ? (vehicles.filter(v => v.status === 'active').length / vehicles.length) * 100 
        : 0,
      target: 80,
    },
    {
      metric: "Safety",
      current: drivers.reduce((sum, d) => sum + (d.safety_score || 80), 0) / Math.max(drivers.length, 1),
      target: 85,
    },
    {
      metric: "On-Time",
      current: trips.length > 0 
        ? (trips.filter(t => t.status === 'completed').length / trips.length) * 100 
        : 0,
      target: 95,
    },
    {
      metric: "Compliance",
      current: 88,
      target: 90,
    },
    {
      metric: "Efficiency",
      current: 75,
      target: 82,
    },
    {
      metric: "Response",
      current: alerts.length > 0 
        ? Math.max(0, 100 - alerts.filter(a => a.status !== 'resolved').length * 5)
        : 95,
      target: 90,
    },
  ];

  const overallScore = performanceData.reduce((sum, d) => sum + d.current, 0) / performanceData.length;

  if (loading) {
    return (
      <Card className="bg-[#1a2332] border-[#2a3a4d]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-primary" />
            Performance Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-white/10 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a2332] border-[#2a3a4d] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-primary" />
            Performance Radar
          </CardTitle>
          <Badge variant="outline" className="gap-1 font-mono bg-[#0d1520] text-white border-[#2a3a4d]">
            <Zap className="w-3 h-3 text-warning" />
            {overallScore.toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={performanceData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid 
                stroke="rgba(255,255,255,0.2)" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              />
              <Radar
                name="Target"
                dataKey="target"
                stroke="rgba(255,255,255,0.5)"
                fill="rgba(255,255,255,0.1)"
                fillOpacity={0.3}
                strokeWidth={1}
                strokeDasharray="5 5"
              />
              <Radar
                name="Current"
                dataKey="current"
                stroke="#8DC63F"
                fill="#8DC63F"
                fillOpacity={0.4}
                strokeWidth={2}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#2a3a4d]">
          <div className="text-center">
            <div className="text-lg font-bold text-success">
              {performanceData.filter(d => d.current >= d.target).length}
            </div>
            <div className="text-xs text-white/60">On Target</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-warning">
              {performanceData.filter(d => d.current >= d.target * 0.9 && d.current < d.target).length}
            </div>
            <div className="text-xs text-white/60">Near Target</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-destructive">
              {performanceData.filter(d => d.current < d.target * 0.9).length}
            </div>
            <div className="text-xs text-white/60">Below Target</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RadarPerformanceChart;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface SafetyScoreCardProps {
  averageScore: number;
  incidentsThisMonth: number;
  trend: 'up' | 'down' | 'stable';
}

const SafetyScoreCard = ({
  averageScore,
  incidentsThisMonth,
  trend
}: SafetyScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const scoreColor = getScoreColor(averageScore);
  const scoreLabel = getScoreLabel(averageScore);

  // Calculate progress ring
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (averageScore / 100) * circumference;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-4 h-4 text-success" />
          Fleet Safety Score
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center gap-4">
          {/* Score ring */}
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={averageScore >= 75 ? 'hsl(var(--success))' : averageScore >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{averageScore.toFixed(0)}</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div>
              <span className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</span>
            </div>
            
            {/* Trend */}
            <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {trend === 'up' ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  <span>Improving</span>
                </>
              ) : trend === 'down' ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  <span>Declining</span>
                </>
              ) : (
                <span>Stable</span>
              )}
            </div>
            
            {/* Incidents */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <AlertTriangle className={`w-4 h-4 ${incidentsThisMonth > 5 ? 'text-destructive' : incidentsThisMonth > 2 ? 'text-warning' : 'text-success'}`} />
              <div>
                <div className="text-sm font-semibold">{incidentsThisMonth}</div>
                <div className="text-xs text-muted-foreground">Incidents this month</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SafetyScoreCard;

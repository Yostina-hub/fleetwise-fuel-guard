import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";

interface FuelEfficiencyCardProps {
  averageLPer100Km: number;
  bestPerformer: string;
  worstPerformer: string;
  trend: 'up' | 'down' | 'stable';
}

const FuelEfficiencyCard = ({
  averageLPer100Km,
  bestPerformer,
  worstPerformer,
  trend
}: FuelEfficiencyCardProps) => {
  // Determine efficiency rating
  const getEfficiencyRating = (value: number) => {
    if (value < 7) return { label: 'Excellent', color: 'text-success' };
    if (value < 10) return { label: 'Good', color: 'text-primary' };
    if (value < 13) return { label: 'Average', color: 'text-warning' };
    return { label: 'Poor', color: 'text-destructive' };
  };

  const rating = getEfficiencyRating(averageLPer100Km);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Fuel className="w-4 h-4 text-primary" />
          Fuel Efficiency
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Main metric */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{averageLPer100Km.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">L/100km</span>
          <span className={`text-xs font-medium ${rating.color}`}>{rating.label}</span>
        </div>
        
        {/* Trend */}
        <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {trend === 'up' ? (
            <>
              <TrendingUp className="w-3 h-3" />
              <span>Improving efficiency</span>
            </>
          ) : trend === 'down' ? (
            <>
              <TrendingDown className="w-3 h-3" />
              <span>Declining efficiency</span>
            </>
          ) : (
            <span>Stable</span>
          )}
        </div>
        
        {/* Best/Worst performers */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between p-2 rounded-lg bg-success/10">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Best</span>
            </div>
            <span className="text-sm font-medium">{bestPerformer}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Needs Attention</span>
            </div>
            <span className="text-sm font-medium">{worstPerformer}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelEfficiencyCard;

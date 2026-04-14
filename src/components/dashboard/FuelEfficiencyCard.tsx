import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FuelEfficiencyCardProps {
  averageLPer100Km: number;
  bestPerformer: string;
  worstPerformer: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  distanceUnit?: 'km' | 'miles';
  fuelUnit?: 'liters' | 'gallons';
}

const FuelEfficiencyCard = ({
  averageLPer100Km,
  bestPerformer,
  worstPerformer,
  trend,
  trendPercentage = 0,
  distanceUnit = 'km',
  fuelUnit = 'liters'
}: FuelEfficiencyCardProps) => {
  const { t } = useTranslation();

  // Convert L/100km to appropriate unit
  const displayValue = fuelUnit === 'gallons' && distanceUnit === 'miles'
    ? (235.215 / averageLPer100Km) // Convert to MPG
    : averageLPer100Km;
  
  const unitLabel = fuelUnit === 'gallons' && distanceUnit === 'miles'
    ? 'MPG'
    : `${fuelUnit === 'gallons' ? 'gal' : 'L'}/100${distanceUnit === 'miles' ? 'mi' : 'km'}`;
  
  // Adjust thresholds based on unit
  const getThreshold = (base: number) => {
    if (fuelUnit === 'gallons' && distanceUnit === 'miles') {
      return 235.215 / base; // Convert threshold to MPG (higher is better)
    }
    return base;
  };
  // Determine efficiency rating (for MPG, higher is better; for L/100km, lower is better)
  const getEfficiencyRating = (value: number) => {
    const isMPG = fuelUnit === 'gallons' && distanceUnit === 'miles';
    if (isMPG) {
      // MPG: higher is better
      if (value > 35) return { label: t('dashboard.excellent'), color: 'text-success' };
      if (value > 25) return { label: t('dashboard.good'), color: 'text-primary' };
      if (value > 18) return { label: t('dashboard.fair'), color: 'text-warning' };
      return { label: t('dashboard.poor'), color: 'text-destructive' };
    }
    // L/100km: lower is better
    if (value < 7) return { label: t('dashboard.excellent'), color: 'text-success' };
    if (value < 10) return { label: t('dashboard.good'), color: 'text-primary' };
    if (value < 13) return { label: t('dashboard.fair'), color: 'text-warning' };
    return { label: t('dashboard.poor'), color: 'text-destructive' };
  };

  const rating = getEfficiencyRating(displayValue);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Fuel className="w-4 h-4 text-primary" />
          {t('dashboard.fuelEfficiency')}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Main metric */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{displayValue.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">{unitLabel}</span>
          <span className={`text-xs font-medium ${rating.color}`}>{rating.label}</span>
        </div>
        
        {/* Trend */}
        <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {trend === 'up' ? (
            <>
              <TrendingUp className="w-3 h-3" />
              <span>{t('dashboard.improvingEfficiency')} {trendPercentage > 0 ? `(${trendPercentage.toFixed(1)}%)` : ''}</span>
            </>
          ) : trend === 'down' ? (
            <>
              <TrendingDown className="w-3 h-3" />
              <span>{t('dashboard.decliningEfficiency')} {trendPercentage > 0 ? `(${trendPercentage.toFixed(1)}%)` : ''}</span>
            </>
          ) : (
            <span>{t('dashboard.stable')}</span>
          )}
        </div>
        
        {/* Best/Worst performers */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between p-2 rounded-lg bg-success/10">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">{t('dashboard.best')}</span>
            </div>
            <span className="text-sm font-medium">{bestPerformer}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">{t('dashboard.needsAttention')}</span>
            </div>
            <span className="text-sm font-medium">{worstPerformer}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelEfficiencyCard;

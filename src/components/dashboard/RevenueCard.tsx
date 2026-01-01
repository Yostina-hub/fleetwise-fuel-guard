import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Truck } from "lucide-react";

interface RevenueCardProps {
  perVehicle: number;
  total: number;
  trend: 'up' | 'down' | 'stable';
}

const RevenueCard = ({
  perVehicle,
  total,
  trend
}: RevenueCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="w-4 h-4 text-success" />
          Fleet Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Total revenue */}
        <div>
          <div className="text-3xl font-bold text-success">{formatCurrency(total)}</div>
          <div className="text-xs text-muted-foreground">Total Monthly Revenue</div>
        </div>
        
        {/* Trend */}
        <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {trend === 'up' ? (
            <>
              <TrendingUp className="w-3 h-3" />
              <span>+12.5% vs last month</span>
            </>
          ) : trend === 'down' ? (
            <>
              <TrendingDown className="w-3 h-3" />
              <span>-5.2% vs last month</span>
            </>
          ) : (
            <span>Stable</span>
          )}
        </div>
        
        {/* Per vehicle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Per Vehicle</span>
          </div>
          <span className="font-semibold">{formatCurrency(perVehicle)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueCard;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, Clock, Truck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DeliveryPerformanceCardProps {
  onTimeRate: number;
  averageDelay: number; // in minutes
  completedTrips: number;
}

const DeliveryPerformanceCard = ({
  onTimeRate,
  averageDelay,
  completedTrips
}: DeliveryPerformanceCardProps) => {
  const getPerformanceStatus = (rate: number) => {
    if (rate >= 95) return { label: 'Excellent', color: 'text-success', barColor: 'bg-success' };
    if (rate >= 90) return { label: 'Good', color: 'text-primary', barColor: 'bg-primary' };
    if (rate >= 80) return { label: 'Fair', color: 'text-warning', barColor: 'bg-warning' };
    return { label: 'Needs Work', color: 'text-destructive', barColor: 'bg-destructive' };
  };

  const status = getPerformanceStatus(onTimeRate);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="w-4 h-4 text-primary" />
          Delivery Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* On-time rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">On-Time Delivery Rate</span>
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold">{onTimeRate.toFixed(1)}%</span>
          </div>
          <Progress value={onTimeRate} className="h-2" />
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-warning" />
            <div>
              <div className="text-sm font-semibold">{averageDelay} min</div>
              <div className="text-xs text-muted-foreground">Avg. Delay</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Truck className="w-4 h-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">{completedTrips.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Trips</div>
            </div>
          </div>
        </div>
        
        {/* Success indicator */}
        {onTimeRate >= 90 && (
          <div className="p-2 rounded-lg bg-success/10 text-success text-xs flex items-center gap-2">
            <CheckCircle className="w-3 h-3" />
            <span>Above industry benchmark (88%)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryPerformanceCard;

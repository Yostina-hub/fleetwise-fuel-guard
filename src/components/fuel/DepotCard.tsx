import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Fuel, MapPin, AlertTriangle, TrendingDown, Droplet, Edit } from "lucide-react";
import { FuelDepot } from "@/hooks/useFuelDepots";

interface DepotCardProps {
  depot: FuelDepot;
  formatFuel: (value: number) => string;
  onDispense: (depotId: string) => void;
  onReceive: (depotId: string) => void;
  onEdit: (depotId: string) => void;
}

const getStockPercentage = (current: number, capacity: number) => {
  return Math.round((current / capacity) * 100);
};

const getStockStatus = (current: number, capacity: number, threshold?: number) => {
  const percentage = getStockPercentage(current, capacity);
  if (threshold && current <= threshold) return 'critical';
  if (percentage <= 20) return 'low';
  if (percentage <= 50) return 'medium';
  return 'good';
};

export default function DepotCard({ depot, formatFuel, onDispense, onReceive, onEdit }: DepotCardProps) {
  const stockStatus = getStockStatus(
    depot.current_stock_liters, 
    depot.capacity_liters, 
    depot.min_stock_threshold || undefined
  );
  const stockPercentage = getStockPercentage(depot.current_stock_liters, depot.capacity_liters);

  return (
    <Card className={stockStatus === 'critical' ? 'border-destructive/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Fuel className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="truncate" title={depot.name}>{depot.name}</span>
            </CardTitle>
            {depot.location_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate" title={depot.location_name}>{depot.location_name}</span>
              </p>
            )}
          </div>
          <Badge variant="outline" className="capitalize shrink-0">{depot.fuel_type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Stock Level</span>
            <span className={`text-sm font-medium ${
              stockStatus === 'critical' ? 'text-destructive' :
              stockStatus === 'low' ? 'text-warning' : ''
            }`}>
              {stockPercentage}%
            </span>
          </div>
          <Progress 
            value={stockPercentage} 
            className={`h-3 ${
              stockStatus === 'critical' ? '[&>div]:bg-destructive' :
              stockStatus === 'low' ? '[&>div]:bg-warning' :
              '[&>div]:bg-success'
            }`}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatFuel(depot.current_stock_liters)}</span>
            <span>{formatFuel(depot.capacity_liters)} capacity</span>
          </div>
        </div>

        {/* Stock Warning */}
        {stockStatus === 'critical' && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Below minimum threshold ({formatFuel(depot.min_stock_threshold || 0)})</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1 gap-1"
            onClick={() => onDispense(depot.id)}
            aria-label={`Dispense fuel from ${depot.name}`}
          >
            <TrendingDown className="w-4 h-4" aria-hidden="true" />
            Dispense
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 gap-1"
            onClick={() => onReceive(depot.id)}
            aria-label={`Receive fuel at ${depot.name}`}
          >
            <Droplet className="w-4 h-4" aria-hidden="true" />
            Receive
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(depot.id)}
            aria-label={`Edit ${depot.name}`}
          >
            <Edit className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

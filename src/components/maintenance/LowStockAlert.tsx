import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";
import { useLowStockAlerts } from "@/hooks/useWorkOrderParts";
import { useNavigate } from "react-router-dom";

const LowStockAlert = () => {
  const { lowStockItems, lowStockCount } = useLowStockAlerts();
  const navigate = useNavigate();

  if (lowStockCount === 0) return null;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-warning text-base">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          Low Stock Alert ({lowStockCount} items)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {lowStockItems.slice(0, 5).map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium text-sm">{item.part_name}</span>
                {item.part_number && (
                  <span className="text-xs text-muted-foreground">#{item.part_number}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  {item.current_quantity} left
                </Badge>
                <span className="text-xs text-muted-foreground">
                  (min: {item.minimum_quantity || item.reorder_point || 0})
                </span>
              </div>
            </div>
          ))}
          {lowStockCount > 5 && (
            <p className="text-xs text-muted-foreground pt-2">
              +{lowStockCount - 5} more items low on stock
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4 gap-2 w-full"
          onClick={() => navigate('/work-orders')}
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          View Inventory
        </Button>
      </CardContent>
    </Card>
  );
};

export default LowStockAlert;

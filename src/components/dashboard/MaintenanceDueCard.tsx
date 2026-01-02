import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, addDays, isBefore, isAfter } from "date-fns";

interface MaintenanceItem {
  id: string;
  vehiclePlate: string;
  serviceType: string;
  dueDate: string;
  isOverdue: boolean;
}

const MaintenanceDueCard = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    const fetchMaintenanceDue = async () => {
      try {
        const today = new Date();
        const nextWeek = addDays(today, 7);

        const { data: workOrders } = await supabase
          .from('work_orders')
          .select(`
            id,
            work_type,
            scheduled_date,
            vehicle_id,
            vehicles!inner(plate_number)
          `)
          .eq('organization_id', organizationId)
          .in('status', ['scheduled', 'pending'])
          .lte('scheduled_date', nextWeek.toISOString())
          .order('scheduled_date', { ascending: true })
          .limit(5);

        const maintenanceItems: MaintenanceItem[] = (workOrders || []).map((wo: any) => ({
          id: wo.id,
          vehiclePlate: wo.vehicles?.plate_number || 'Unknown',
          serviceType: wo.work_type?.replace(/_/g, ' ') || 'Unknown',
          dueDate: wo.scheduled_date,
          isOverdue: isBefore(new Date(wo.scheduled_date), today),
        }));

        setItems(maintenanceItems);
      } catch (error) {
        console.error('Error fetching maintenance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceDue();
  }, [organizationId]);

  const overdueCount = items.filter(i => i.isOverdue).length;

  return (
    <Card className={overdueCount > 0 ? "border-warning/30" : ""} aria-label="Maintenance due card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="w-4 h-4 text-warning" aria-hidden="true" />
          Maintenance Due
          {overdueCount > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full" aria-label={`${overdueCount} overdue items`}>
              {overdueCount} overdue
            </span>
          )}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/maintenance')}
          aria-label="View all maintenance"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No upcoming maintenance
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Upcoming maintenance items">
            {items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                  item.isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                }`}
                onClick={() => navigate('/maintenance')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/maintenance');
                  }
                }}
                aria-label={`${item.vehiclePlate} - ${item.serviceType}, due ${format(new Date(item.dueDate), 'MMM d')}${item.isOverdue ? ', overdue' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {item.isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
                  ) : (
                    <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.vehiclePlate}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.serviceType}</p>
                  </div>
                </div>
                <span className={`text-xs ${item.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {format(new Date(item.dueDate), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceDueCard;

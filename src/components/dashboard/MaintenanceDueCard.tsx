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
            service_type,
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
          serviceType: wo.service_type,
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
    <Card className={overdueCount > 0 ? "border-warning/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="w-4 h-4 text-warning" />
          Maintenance Due
          {overdueCount > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/maintenance')}>
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
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  item.isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  ) : (
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.vehiclePlate}</p>
                    <p className="text-xs text-muted-foreground">{item.serviceType}</p>
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

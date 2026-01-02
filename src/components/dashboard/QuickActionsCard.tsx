import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  MapPin, 
  Wrench, 
  AlertTriangle, 
  FileText, 
  Users,
  Truck
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickActionsCard = () => {
  const navigate = useNavigate();

  const actions = [
    { id: "add-vehicle", icon: Plus, label: "Add Vehicle", onClick: () => navigate('/fleet'), color: "text-primary" },
    { id: "add-driver", icon: Users, label: "Add Driver", onClick: () => navigate('/drivers'), color: "text-success" },
    { id: "live-map", icon: MapPin, label: "Live Map", onClick: () => navigate('/map'), color: "text-info" },
    { id: "schedule-service", icon: Wrench, label: "Schedule Service", onClick: () => navigate('/maintenance'), color: "text-warning" },
    { id: "view-alerts", icon: AlertTriangle, label: "View Alerts", onClick: () => navigate('/alerts'), color: "text-destructive" },
    { id: "generate-report", icon: FileText, label: "Generate Report", onClick: () => navigate('/reports'), color: "text-muted-foreground" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="flex flex-col h-16 gap-1 hover:border-primary/50"
              onClick={action.onClick}
              aria-label={action.label}
            >
              <action.icon className={`w-4 h-4 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;

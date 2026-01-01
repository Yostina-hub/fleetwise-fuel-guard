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
    { icon: Plus, label: "Add Vehicle", onClick: () => navigate('/fleet'), color: "text-primary" },
    { icon: Users, label: "Add Driver", onClick: () => navigate('/drivers'), color: "text-success" },
    { icon: MapPin, label: "Live Map", onClick: () => navigate('/map'), color: "text-info" },
    { icon: Wrench, label: "Schedule Service", onClick: () => navigate('/maintenance'), color: "text-warning" },
    { icon: AlertTriangle, label: "View Alerts", onClick: () => navigate('/alerts'), color: "text-destructive" },
    { icon: FileText, label: "Generate Report", onClick: () => navigate('/reports'), color: "text-muted-foreground" },
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
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="flex flex-col h-16 gap-1 hover:border-primary/50"
              onClick={action.onClick}
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

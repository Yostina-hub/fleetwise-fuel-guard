import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, Package, DollarSign } from "lucide-react";

interface WorkOrdersQuickStatsProps {
  openOrders: number;
  completedThisMonth: number;
  partsOnOrder: number;
  costThisMonth: number;
}

const WorkOrdersQuickStats = ({
  openOrders,
  completedThisMonth,
  partsOnOrder,
  costThisMonth
}: WorkOrdersQuickStatsProps) => {
  const stats = [
    {
      label: "Open Work Orders",
      value: openOrders,
      icon: ClipboardList,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Completed This Month",
      value: completedThisMonth,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Parts on Order",
      value: partsOnOrder,
      icon: Package,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      label: "Cost This Month",
      value: `$${costThisMonth.toLocaleString()}`,
      icon: DollarSign,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorkOrdersQuickStats;

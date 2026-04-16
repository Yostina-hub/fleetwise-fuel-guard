import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, UserCheck, AlertCircle } from "lucide-react";

interface PeopleStatsProps {
  totalPeople: number;
  withLogin: number;
  withoutLogin: number;
  admins: number;
}

const PeopleStats = ({ totalPeople, withLogin, withoutLogin, admins }: PeopleStatsProps) => {
  const stats = [
    {
      label: "Total People",
      value: totalPeople.toString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "With Login",
      value: withLogin.toString(),
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "No Login",
      value: withoutLogin.toString(),
      icon: AlertCircle,
      color: withoutLogin > 0 ? "text-warning" : "text-muted-foreground",
      bgColor: withoutLogin > 0 ? "bg-warning/10" : "bg-muted/30",
    },
    {
      label: "Admins",
      value: admins.toString(),
      icon: Shield,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
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

export default PeopleStats;

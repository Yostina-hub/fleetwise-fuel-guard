import { Card, CardContent } from "@/components/ui/card";
import { Settings, Users, Lock, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminQuickStatsProps {
  totalUsers: number;
  activeSSO: boolean;
  passwordPolicyEnabled: boolean;
  pendingPenalties: number;
  loginAttemptsToday?: number;
}

const AdminQuickStats = ({
  totalUsers,
  activeSSO,
  passwordPolicyEnabled,
  pendingPenalties,
  loginAttemptsToday = 0,
}: AdminQuickStatsProps) => {
  const stats = [
    {
      label: "Organization Users",
      tooltip: "Total number of users in your organization",
      value: totalUsers.toString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "SSO Status",
      tooltip: activeSSO ? "Single Sign-On is configured and active" : "Single Sign-On is not configured",
      value: activeSSO ? "Active" : "Disabled",
      icon: Shield,
      color: activeSSO ? "text-success" : "text-muted-foreground",
      bgColor: activeSSO ? "bg-success/10" : "bg-muted/50",
    },
    {
      label: "Password Policy",
      tooltip: passwordPolicyEnabled ? "Strong password requirements enforced" : "Basic password requirements only",
      value: passwordPolicyEnabled ? "Enforced" : "Basic",
      icon: Lock,
      color: passwordPolicyEnabled ? "text-success" : "text-warning",
      bgColor: passwordPolicyEnabled ? "bg-success/10" : "bg-warning/10",
    },
    {
      label: "Pending Penalties",
      tooltip: "Driver violations awaiting review",
      value: pendingPenalties.toString(),
      icon: pendingPenalties > 0 ? AlertTriangle : CheckCircle,
      color: pendingPenalties > 0 ? "text-warning" : "text-success",
      bgColor: pendingPenalties > 0 ? "bg-warning/10" : "bg-success/10",
    },
    {
      label: "Logins Today",
      tooltip: "Number of successful logins today",
      value: loginAttemptsToday.toString(),
      icon: Settings,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <Card className="glass-strong hover:scale-[1.02] transition-transform duration-300 cursor-default">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{stat.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default AdminQuickStats;

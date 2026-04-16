import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Lock, AlertTriangle, CheckCircle, Shield, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AdminQuickStats = () => {
  const { organizationId } = useOrganization();

  const { data: userCount = 0 } = useQuery({
    queryKey: ["admin_stats_users", organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const { data: ssoActive = false } = useQuery({
    queryKey: ["admin_stats_sso", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sso_configurations")
        .select("id")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .limit(1);
      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!organizationId,
  });

  const { data: passwordPolicyEnabled = false } = useQuery({
    queryKey: ["admin_stats_password", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("password_policies")
        .select("id")
        .eq("organization_id", organizationId!)
        .limit(1);
      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!organizationId,
  });

  const { data: pendingPenalties = 0 } = useQuery({
    queryKey: ["admin_stats_penalties", organizationId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("driver_penalties")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const { data: loginsToday = 0 } = useQuery({
    queryKey: ["admin_stats_logins", organizationId],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count, error } = await (supabase as any)
        .from("login_history")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .gte("login_time", todayStart.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const stats = [
    {
      label: "Organization Users",
      tooltip: "Total number of users in your organization",
      value: userCount.toString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "SSO Status",
      tooltip: ssoActive ? "Single Sign-On is configured and active" : "Single Sign-On is not configured",
      value: ssoActive ? "Active" : "Disabled",
      icon: Shield,
      color: ssoActive ? "text-success" : "text-muted-foreground",
      bgColor: ssoActive ? "bg-success/10" : "bg-muted/50",
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
      value: loginsToday.toString(),
      icon: Activity,
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

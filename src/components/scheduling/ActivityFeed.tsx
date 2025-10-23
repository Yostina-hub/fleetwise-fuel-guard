import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Calendar, CheckCircle, XCircle, Truck, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const activityIcons: Record<string, any> = {
  trip_request_created: Calendar,
  trip_request_submitted: Activity,
  trip_request_approved: CheckCircle,
  trip_request_rejected: XCircle,
  trip_assigned: Truck,
  approval_action: User,
};

const activityColors: Record<string, string> = {
  trip_request_created: "text-blue-500",
  trip_request_submitted: "text-yellow-500",
  trip_request_approved: "text-green-500",
  trip_request_rejected: "text-red-500",
  trip_assigned: "text-purple-500",
  approval_action: "text-orange-500",
};

export const ActivityFeed = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      // Fetch recent notifications as activity feed
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Loading activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {activities.map((activity: any) => {
              const Icon = activityIcons[activity.type] || Activity;
              const color = activityColors[activity.type] || "text-gray-500";

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className={`${color} mt-1`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.message}
                        </p>
                      </div>
                      {activity.metadata?.status && (
                        <Badge variant="outline" className="flex-shrink-0">
                          {activity.metadata.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

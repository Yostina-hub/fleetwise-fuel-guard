import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, CheckCircle, XCircle, Loader2, Send, User, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface CommandLog {
  id: string;
  vehicle_id: string;
  command_type: string;
  command_data: Record<string, unknown>;
  phone_number: string | null;
  sms_content: string | null;
  status: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  created_by: string | null;
  vehicles: { plate_number: string } | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
}

const commandTypeLabels: Record<string, string> = {
  set_speed_limit: "Set Speed Limit",
  enable_governor: "Enable Governor",
  disable_governor: "Disable Governor",
  emergency_stop: "Emergency Stop",
  speed_limit_change: "Speed Limit Change",
};

export const CommandHistoryCard = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commandLogs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["governor-command-logs", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("governor_command_logs")
        .select(`
          id,
          vehicle_id,
          command_type,
          command_data,
          phone_number,
          sms_content,
          status,
          sent_at,
          acknowledged_at,
          created_at,
          created_by,
          vehicles:vehicle_id(plate_number),
          profiles:created_by(first_name, last_name)
        `)
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as CommandLog[];
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await (supabase as any)
        .from("governor_command_logs")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
      toast({
        title: "Command Acknowledged",
        description: "Command status updated to acknowledged",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to acknowledge command",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "acknowledged":
      case "executed":
        return (
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle className="h-3 w-3" />
            {status === "acknowledged" ? "Acknowledged" : "Executed"}
          </Badge>
        );
      case "sent":
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {status === "sent" ? "Sent" : "Pending"}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCommandData = (data: Record<string, unknown>) => {
    const parts: string[] = [];
    if (data.speed_limit) parts.push(`Speed: ${data.speed_limit} km/h`);
    if (data.max_speed_limit) parts.push(`Speed: ${data.max_speed_limit} km/h`);
    if (data.governor_active !== undefined) {
      parts.push(`Governor: ${data.governor_active ? "ON" : "OFF"}`);
    }
    if (data.emergency_stop) parts.push("Emergency Stop");
    return parts.length > 0 ? parts.join(", ") : JSON.stringify(data);
  };

  const getSentByName = (log: CommandLog): string | null => {
    // First check command_data for sent_by_name (from edge function)
    if ((log.command_data as Record<string, unknown>)?.sent_by_name) {
      return (log.command_data as Record<string, unknown>).sent_by_name as string;
    }
    // Then check profiles join
    if (log.profiles?.first_name || log.profiles?.last_name) {
      return `${log.profiles.first_name || ""} ${log.profiles.last_name || ""}`.trim();
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Command History
            </CardTitle>
            <CardDescription>
              Recent speed governor commands sent to vehicles
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !commandLogs || commandLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No commands sent yet</p>
            <p className="text-xs mt-1">Commands will appear here when you configure vehicles</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {commandLogs.map((log) => {
                const sentByName = getSentByName(log);
                const canAcknowledge = log.status === "sent" || log.status === "pending";
                
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {log.vehicles?.plate_number || "Unknown Vehicle"}
                          </span>
                          {getStatusBadge(log.status)}
                          {canAcknowledge && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => acknowledgeMutation.mutate(log.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {commandTypeLabels[log.command_type] || log.command_type}
                        </p>
                        <p className="text-xs font-mono mt-1 text-primary">
                          {formatCommandData(log.command_data as Record<string, unknown>)}
                        </p>
                        {log.sms_content && (
                          <p className="text-xs font-mono mt-1 text-muted-foreground">
                            SMS: <code className="bg-muted px-1 rounded">{log.sms_content}</code>
                          </p>
                        )}
                        {log.phone_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            To: {log.phone_number}
                          </p>
                        )}
                        {sentByName && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            By: {sentByName}
                          </p>
                        )}
                        {log.acknowledged_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Acknowledged: {formatDistanceToNow(new Date(log.acknowledged_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-right flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

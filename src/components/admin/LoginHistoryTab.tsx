import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const LoginHistoryTab = () => {
  const { organizationId } = useOrganization();

  const { data: loginHistory, isLoading } = useQuery({
    queryKey: ["login_history", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("login_history")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("login_time", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "outline",
      failed: "destructive",
      blocked: "destructive",
      mfa_required: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Login History</h3>
        <p className="text-sm text-muted-foreground">
          Monitor user authentication activity and security events
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loginHistory?.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell>{format(new Date(log.login_time), "MMM dd, yyyy HH:mm:ss")}</TableCell>
              <TableCell>{log.user_id?.substring(0, 8)}...</TableCell>
              <TableCell className="font-mono">{log.ip_address || "-"}</TableCell>
              <TableCell className="capitalize">{log.device_type || "-"}</TableCell>
              <TableCell>
                {log.location_city && log.location_country
                  ? `${log.location_city}, ${log.location_country}`
                  : "-"}
              </TableCell>
              <TableCell>{getStatusBadge(log.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loginHistory?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No login history available</p>
        </div>
      )}
    </div>
  );
};

export default LoginHistoryTab;

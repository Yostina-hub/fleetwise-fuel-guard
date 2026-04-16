import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { Search, Filter } from "lucide-react";

const LoginHistoryTab = () => {
  const { organizationId } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: loginHistory, isLoading } = useQuery({
    queryKey: ["login_history", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("*, profiles:user_id(email, full_name)")
        .eq("organization_id", organizationId!)
        .order("login_time", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      success: { variant: "outline", label: "Success" },
      failed: { variant: "destructive", label: "Failed" },
      blocked: { variant: "destructive", label: "Blocked" },
      mfa_required: { variant: "default", label: "MFA Required" },
    };
    const c = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const filtered = (loginHistory || []).filter((log: any) => {
    const matchesSearch = searchTerm === "" ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address && String(log.ip_address).includes(searchTerm));
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(filtered.length, 15);
  const paginatedHistory = filtered.slice(startIndex, endIndex);

  const successCount = loginHistory?.filter((l: any) => l.status === "success").length || 0;
  const failedCount = loginHistory?.filter((l: any) => l.status === "failed").length || 0;
  const blockedCount = loginHistory?.filter((l: any) => l.status === "blocked").length || 0;

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading login history">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Login History</h3>
        <p className="text-sm text-muted-foreground">
          Monitor user authentication activity and security events
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary">{successCount}</div>
          <div className="text-xs text-muted-foreground">Successful</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{failedCount}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{blockedCount}</div>
          <div className="text-xs text-muted-foreground">Blocked</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, email, or IP..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="mfa_required">MFA Required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground" role="status" aria-label="No login history available">
                  No login history available
                </TableCell>
              </TableRow>
            ) : (
              paginatedHistory.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.login_time), "MMM dd, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.profiles?.full_name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{log.profiles?.email || log.user_id?.substring(0, 8)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.ip_address ? String(log.ip_address) : "-"}</TableCell>
                  <TableCell className="capitalize">{log.device_type || "-"}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.failure_reason || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={15}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default LoginHistoryTab;

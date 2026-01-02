import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { TablePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

const AuditLogsTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { isSuperAdmin } = usePermissions();

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = useMemo(() => {
    return auditLogs?.filter((log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [auditLogs, searchTerm]);

  const totalItems = filteredLogs.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          You need super admin privileges to view audit logs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">
          Track all sensitive operations and changes
        </p>
      </div>

      <Input
        placeholder="Search by action or resource type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search audit logs"
      />

      {isLoading ? (
        <p role="status" aria-live="polite" aria-label="Loading audit logs">Loading...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), "PPpp")}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{log.user_id?.substring(0, 8)}...</code>
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.resource_type}</span>
                      {log.resource_id && (
                        <code className="text-xs text-muted-foreground">
                          {log.resource_id.substring(0, 8)}...
                        </code>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default AuditLogsTab;

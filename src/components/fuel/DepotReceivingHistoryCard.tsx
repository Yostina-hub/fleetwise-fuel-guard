import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

const ITEMS_PER_PAGE = 10;

interface DepotReceiving {
  id: string;
  depot_id: string;
  liters_received: number;
  stock_before_liters?: number;
  stock_after_liters?: number;
  received_at: string;
  received_by?: string;
  supplier_name?: string;
  delivery_note_number?: string;
  unit_price?: number;
  notes?: string;
}

interface DepotReceivingHistoryCardProps {
  depots: { id: string; name: string }[];
}

export default function DepotReceivingHistoryCard({ depots }: DepotReceivingHistoryCardProps) {
  const { organizationId } = useOrganization();
  const { formatFuel, formatCurrency } = useOrganizationSettings();

  const { data: receivingLogs, isLoading } = useQuery({
    queryKey: ["fuel_depot_receiving", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_depot_receiving")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("received_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as DepotReceiving[];
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    receivingLogs?.length || 0, 
    ITEMS_PER_PAGE
  );
  const paginatedLogs = receivingLogs?.slice(startIndex, endIndex) || [];

  const getDepotName = (depotId: string) => {
    return depots.find(d => d.id === depotId)?.name || "Unknown";
  };

  const exportCSV = () => {
    if (!receivingLogs?.length) return;
    
    const headers = ["Date/Time", "Depot", "Liters", "Supplier", "Delivery Note", "Unit Price", "Stock Before", "Stock After", "Notes"];
    const rows = receivingLogs.map(log => [
      format(new Date(log.received_at), "yyyy-MM-dd HH:mm"),
      getDepotName(log.depot_id),
      log.liters_received,
      log.supplier_name || "",
      log.delivery_note_number || "",
      log.unit_price || "",
      log.stock_before_liters || "",
      log.stock_after_liters || "",
      log.notes || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receiving-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receiving logs exported");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success" />
          Fuel Receiving History
        </CardTitle>
        {receivingLogs && receivingLogs.length > 0 && (
          <Button size="sm" variant="outline" className="gap-2" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {(!receivingLogs || receivingLogs.length === 0) ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium mb-2">No Receiving Records</p>
            <p className="text-sm text-muted-foreground mb-4">
              Fuel deliveries will appear here when recorded via the "Receive" button on depots.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Tracking benefits:</p>
                  <ul className="space-y-1">
                    <li>• Audit trail for all fuel deliveries</li>
                    <li>• Supplier and cost tracking</li>
                    <li>• Stock reconciliation history</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Delivery Note</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Stock After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.received_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="font-medium">{getDepotName(log.depot_id)}</TableCell>
                    <TableCell className="text-success font-medium">+{formatFuel(log.liters_received)}</TableCell>
                    <TableCell>{log.supplier_name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{log.delivery_note_number || "-"}</TableCell>
                    <TableCell>{log.unit_price ? formatCurrency(log.unit_price) : "-"}</TableCell>
                    <TableCell>{log.stock_after_liters ? formatFuel(log.stock_after_liters) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={currentPage}
              totalItems={receivingLogs.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";
import { useFuelTransactions } from "@/hooks/useFuelTransactions";
import { useFuelPageContext } from "@/contexts/FuelPageContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import AddTransactionDialog from "./AddTransactionDialog";

const FuelTransactionsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [reconcileFilter, setReconcileFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const { transactions, loading, reconcileTransaction, createTransaction } = useFuelTransactions({
    vehicleId: vehicleFilter !== 'all' ? vehicleFilter : undefined,
    isReconciled: reconcileFilter === 'all' ? undefined : reconcileFilter === 'reconciled',
  });
  const { vehicles, getVehiclePlate } = useFuelPageContext();
  const { formatCurrency, formatFuel, formatDistance, settings } = useOrganizationSettings();

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const plate = getVehiclePlate(t.vehicle_id);
    const searchLower = searchQuery.toLowerCase();
    return (
      plate?.toLowerCase().includes(searchLower) ||
      t.vendor_name?.toLowerCase().includes(searchLower) ||
      t.receipt_number?.toLowerCase().includes(searchLower) ||
      t.location_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleReconcile = async (id: string) => {
    await reconcileTransaction(id, 0, "Manual reconciliation");
  };

  const handleExport = () => {
    const csvContent = [
      ["Date", "Vehicle", "Type", "Liters", "Cost", "Vendor", "Odometer", "Status"].join(","),
      ...filteredTransactions.map(t => [
        format(new Date(t.transaction_date), "yyyy-MM-dd HH:mm"),
        `"${getVehiclePlate(t.vehicle_id)}"`,
        t.transaction_type,
        t.fuel_amount_liters,
        t.fuel_cost || "",
        `"${t.vendor_name || ""}"`,
        t.odometer_km || "",
        t.is_reconciled ? "Reconciled" : "Pending"
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const handleAddTransaction = async (data: any) => {
    await createTransaction(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search fuel transactions"
            />
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by vehicle">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reconcileFilter} onValueChange={setReconcileFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reconciled">Reconciled</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fuel Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Date</TableHead>
                <TableHead className="min-w-[100px]">Vehicle</TableHead>
                <TableHead className="min-w-[80px]">Type</TableHead>
                <TableHead className="min-w-[80px]">Liters</TableHead>
                <TableHead className="min-w-[100px]">Cost</TableHead>
                <TableHead className="min-w-[120px]">Vendor</TableHead>
                <TableHead className="min-w-[100px]">Odometer</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {format(new Date(t.transaction_date), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[100px]" title={getVehiclePlate(t.vehicle_id)}>
                        {getVehiclePlate(t.vehicle_id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{t.transaction_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatFuel(t.fuel_amount_liters)}</TableCell>
                    <TableCell>{t.fuel_cost ? formatCurrency(t.fuel_cost) : '-'}</TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[120px]" title={t.vendor_name || t.location_name || undefined}>
                        {t.vendor_name || t.location_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{t.odometer_km ? formatDistance(t.odometer_km) : '-'}</TableCell>
                    <TableCell>
                      {t.is_reconciled ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="w-3 h-3 mr-1" />Reconciled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning/20">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!t.is_reconciled && (
                        <Button size="sm" variant="ghost" onClick={() => handleReconcile(t.id)}>Reconcile</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddTransactionDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
};

export default FuelTransactionsTab;

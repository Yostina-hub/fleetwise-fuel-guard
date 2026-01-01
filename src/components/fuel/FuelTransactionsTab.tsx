import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useFuelTransactions } from "@/hooks/useFuelTransactions";
import { useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";

const FuelTransactionsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [reconcileFilter, setReconcileFilter] = useState<string>("all");
  
  const { transactions, loading, reconcileTransaction } = useFuelTransactions({
    vehicleId: vehicleFilter !== 'all' ? vehicleFilter : undefined,
    isReconciled: reconcileFilter === 'all' ? undefined : reconcileFilter === 'reconciled',
  });
  const { vehicles } = useVehicles();

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const vehicle = vehicles.find(v => v.id === t.vehicle_id);
    const searchLower = searchQuery.toLowerCase();
    return (
      vehicle?.plate_number?.toLowerCase().includes(searchLower) ||
      t.vendor_name?.toLowerCase().includes(searchLower) ||
      t.receipt_number?.toLowerCase().includes(searchLower) ||
      t.location_name?.toLowerCase().includes(searchLower)
    );
  });

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const handleReconcile = async (id: string) => {
    await reconcileTransaction(id, 0, "Manual reconciliation");
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
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-40">
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
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
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
                    <TableCell>{getVehiclePlate(t.vehicle_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.fuel_amount_liters.toFixed(1)}L</TableCell>
                    <TableCell>
                      {t.fuel_cost ? `$${t.fuel_cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{t.vendor_name || t.location_name || '-'}</TableCell>
                    <TableCell>
                      {t.odometer_km ? `${t.odometer_km.toLocaleString()} km` : '-'}
                    </TableCell>
                    <TableCell>
                      {t.is_reconciled ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Reconciled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning/20">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!t.is_reconciled && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReconcile(t.id)}
                        >
                          Reconcile
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FuelTransactionsTab;

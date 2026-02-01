import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Loader2, 
  History,
  DollarSign,
  Truck,
  FileText,
  Download,
  Wrench,
  Calendar,
  Shield
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useServiceHistory, ServiceHistory } from "@/hooks/useServiceHistory";
import { format } from "date-fns";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

const ServiceHistoryTab = () => {
  const { vehicles } = useVehicles();
  const { serviceHistory, loading, stats } = useServiceHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ServiceHistory | null>(null);

  const filteredHistory = useMemo(() => {
    if (!serviceHistory) return [];
    
    return serviceHistory.filter((record) => {
      const matchesSearch = searchQuery === "" ||
        record.service_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.technician_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.vehicle?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVehicle = vehicleFilter === "all" || record.vehicle_id === vehicleFilter;
      
      return matchesSearch && matchesVehicle;
    });
  }, [serviceHistory, searchQuery, vehicleFilter]);

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(filteredHistory.length, ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const handleExportHistory = () => {
    if (!filteredHistory.length) return;

    const csvContent = [
      ['Date', 'Vehicle', 'Service Type', 'Technician', 'Parts Cost', 'Labor Cost', 'Total Cost', 'Warranty', 'Notes'].join(','),
      ...filteredHistory.map(record => [
        format(new Date(record.service_date), 'yyyy-MM-dd'),
        record.vehicle?.plate_number || '',
        record.service_type?.replace(/_/g, ' ') || '',
        record.technician_name || '',
        record.parts_cost?.toFixed(2) || '0.00',
        record.labor_cost?.toFixed(2) || '0.00',
        record.total_cost?.toFixed(2) || '0.00',
        record.warranty_claim ? 'Yes' : 'No',
        `"${(record.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-label="Loading service history">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="service-history-search"
              aria-label="Search service history"
              placeholder="Search by service type, technician, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-[200px]" aria-label="Filter by vehicle">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleExportHistory}
          disabled={filteredHistory.length === 0}
          aria-label="Export service history to CSV"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <History className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <div className="text-sm text-muted-foreground">Total Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="w-5 h-5 text-success" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.vehiclesServiced}</div>
                <div className="text-sm text-muted-foreground">Vehicles Serviced</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Shield className="w-5 h-5 text-warning" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${stats.warrantyClaimsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-muted-foreground">Warranty Claims</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" role="status">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No Service History</h3>
            <p>Completed maintenance services will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.map((record) => (
                  <TableRow 
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRecord(record);
                      }
                    }}
                    aria-label={`View details for service on ${format(new Date(record.service_date), 'MMM dd, yyyy')}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        {format(new Date(record.service_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{record.vehicle?.plate_number || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span className="capitalize">{record.service_type?.replace(/_/g, ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{record.technician_name || '-'}</TableCell>
                    <TableCell className="font-medium">
                      ${(record.total_cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {record.warranty_claim ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          ${(record.warranty_amount || 0).toFixed(2)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        aria-label="View details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                        }}
                      >
                        <FileText className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredHistory.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Service Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" aria-hidden="true" />
              Service Record
            </DialogTitle>
            <DialogDescription>
              Full service history details
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Service Date</label>
                  <p className="font-medium">{format(new Date(selectedRecord.service_date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Vehicle</label>
                  <p className="font-medium">
                    {selectedRecord.vehicle?.plate_number || 'Unknown'}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({selectedRecord.vehicle?.make} {selectedRecord.vehicle?.model})
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Service Type</label>
                  <p className="font-medium capitalize">{selectedRecord.service_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Technician</label>
                  <p className="font-medium">{selectedRecord.technician_name || '-'}</p>
                </div>
                {selectedRecord.odometer_km && (
                  <div>
                    <label className="text-sm text-muted-foreground">Odometer</label>
                    <p className="font-medium">{selectedRecord.odometer_km.toLocaleString()} km</p>
                  </div>
                )}
                {selectedRecord.engine_hours && (
                  <div>
                    <label className="text-sm text-muted-foreground">Engine Hours</label>
                    <p className="font-medium">{selectedRecord.engine_hours.toLocaleString()} hrs</p>
                  </div>
                )}
                {selectedRecord.downtime_hours && (
                  <div>
                    <label className="text-sm text-muted-foreground">Downtime</label>
                    <p className="font-medium">{selectedRecord.downtime_hours} hours</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="text-sm text-muted-foreground">Cost Breakdown</label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">${(selectedRecord.parts_cost || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Parts</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">${(selectedRecord.labor_cost || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Labor</p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <p className="text-lg font-bold text-primary">${(selectedRecord.total_cost || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              {selectedRecord.warranty_claim && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-success">
                    <Shield className="w-4 h-4" aria-hidden="true" />
                    <span className="font-medium">Warranty Covered: ${(selectedRecord.warranty_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {selectedRecord.description && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedRecord.description}</p>
                </div>
              )}

              {selectedRecord.notes && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceHistoryTab;

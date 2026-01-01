import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import CreateDriverDialog from "@/components/fleet/CreateDriverDialog";
import EditDriverDialog from "@/components/fleet/EditDriverDialog";
import DeleteDriverDialog from "@/components/fleet/DeleteDriverDialog";
import DriverDetailDialog from "@/components/fleet/DriverDetailDialog";
import BulkImportDriversDialog from "@/components/fleet/BulkImportDriversDialog";
import AssignVehicleToDriverDialog from "@/components/fleet/AssignVehicleToDriverDialog";
import DriverBulkActionsToolbar from "@/components/fleet/DriverBulkActionsToolbar";
import DriverQuickStatusChange from "@/components/fleet/DriverQuickStatusChange";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";
import { exportDriversToCSV } from "@/components/fleet/DriverExportUtils";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  CreditCard, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Car,
  Activity,
  Upload,
  Download
} from "lucide-react";
import { useDriversPaginated } from "@/hooks/useDriversPaginated";
import { Driver } from "@/hooks/useDrivers";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Drivers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const PAGE_SIZE = 10;
  const { 
    drivers, 
    loading, 
    totalCount, 
    currentPage, 
    totalPages, 
    loadPage,
    refetch 
  } = useDriversPaginated({
    pageSize: PAGE_SIZE,
    searchQuery,
    statusFilter
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [assignVehicleDialogOpen, setAssignVehicleDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDetailDialogOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditDialogOpen(true);
  };

  const handleDeleteDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDeleteDialogOpen(true);
  };

  const handleAssignVehicle = (driver: Driver) => {
    setSelectedDriver(driver);
    setAssignVehicleDialogOpen(true);
  };

  const handleSelectDriver = (driver: Driver, checked: boolean) => {
    if (checked) {
      setSelectedDrivers(prev => [...prev, driver]);
    } else {
      setSelectedDrivers(prev => prev.filter(d => d.id !== driver.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrivers(drivers);
    } else {
      setSelectedDrivers([]);
    }
  };

  const handleExportAll = () => {
    exportDriversToCSV(drivers, `all_drivers_${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: `Exported ${drivers.length} drivers` });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading drivers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const activeDrivers = drivers.filter(d => d.status === "active").length;
  const inactiveDrivers = drivers.filter(d => d.status === "inactive").length;
  const suspendedDrivers = drivers.filter(d => d.status === "suspended").length;

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Driver Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage all drivers and their information • {totalCount} drivers total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              className="gap-2"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button 
              variant="outline"
              className="gap-2"
              onClick={handleExportAll}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button 
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/driver-scoring")}
            >
              <Activity className="w-4 h-4" />
              Driver Scoring
            </Button>
            <Button 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Driver
            </Button>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedDrivers.length > 0 && (
          <DriverBulkActionsToolbar
            selectedDrivers={selectedDrivers}
            onClearSelection={() => {
              setSelectedDrivers([]);
              refetch();
            }}
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Drivers</div>
                  <div className="text-3xl font-bold">{drivers.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-success">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <UserCheck className="w-6 h-6 text-success" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Active</div>
                  <div className="text-3xl font-bold text-success">{activeDrivers}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-muted-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <UserX className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Inactive</div>
                  <div className="text-3xl font-bold">{inactiveDrivers}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Suspended</div>
                  <div className="text-3xl font-bold text-destructive">{suspendedDrivers}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, license, employee ID, or email..." 
                  className="pl-10 focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Drivers Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Drivers</CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1} • {totalCount} total
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedDrivers.length === drivers.length && drivers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Safety Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDrivers.some(d => d.id === driver.id)}
                        onCheckedChange={(checked) => handleSelectDriver(driver, !!checked)}
                      />
                    </TableCell>
                    <TableCell onClick={() => handleViewDriver(driver)}>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={driver.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(driver.first_name, driver.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{driver.first_name} {driver.last_name}</div>
                          {driver.hire_date && (
                            <div className="text-xs text-muted-foreground">
                              Since {format(new Date(driver.hire_date), "MMM yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleViewDriver(driver)}>
                      <span className="font-mono text-sm">{driver.employee_id || "-"}</span>
                    </TableCell>
                    <TableCell onClick={() => handleViewDriver(driver)}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{driver.license_number}</div>
                            {driver.license_class && (
                              <div className="text-xs text-muted-foreground">Class {driver.license_class}</div>
                            )}
                          </div>
                        </div>
                        {driver.license_expiry && (
                          <LicenseExpiryBadge expiryDate={driver.license_expiry} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleViewDriver(driver)}>
                      <div className="space-y-1">
                        {driver.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {driver.phone}
                          </div>
                        )}
                        {driver.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {driver.email}
                          </div>
                        )}
                        {!driver.phone && !driver.email && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DriverQuickStatusChange driver={driver} />
                    </TableCell>
                    <TableCell onClick={() => handleViewDriver(driver)}>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          (driver.safety_score || 0) >= 80 ? 'bg-success/10 text-success' :
                          (driver.safety_score || 0) >= 60 ? 'bg-warning/10 text-warning' :
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {driver.safety_score || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDriver(driver)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditDriver(driver)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Driver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignVehicle(driver)}>
                            <Car className="w-4 h-4 mr-2" />
                            Assign Vehicle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/driver-scoring`)}>
                            <Activity className="w-4 h-4 mr-2" />
                            View Scoring
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteDriver(driver)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Driver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {drivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
                      <p className="text-muted-foreground text-sm">
                        {searchQuery ? "Try adjusting your search criteria" : "Click 'Add Driver' to register a new driver"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && loadPage(currentPage - 1)}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => loadPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && loadPage(currentPage + 1)}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateDriverDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      <EditDriverDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        driver={selectedDriver}
      />
      
      <DeleteDriverDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        driver={selectedDriver}
      />
      
      <DriverDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        driver={selectedDriver}
      />
      
      <BulkImportDriversDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      
      <AssignVehicleToDriverDialog
        open={assignVehicleDialogOpen}
        onOpenChange={setAssignVehicleDialogOpen}
        driver={selectedDriver}
      />
    </Layout>
  );
};

export default Drivers;

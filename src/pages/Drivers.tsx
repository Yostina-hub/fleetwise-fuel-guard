import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Can } from "@/components/auth/Can";
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
import CentralizedDriverRegistrationDialog from "@/components/fleet/CentralizedDriverRegistrationDialog";
import EditDriverDialog from "@/components/fleet/EditDriverDialog";
import DeleteDriverDialog from "@/components/fleet/DeleteDriverDialog";
import DriverDetailDialog from "@/components/fleet/DriverDetailDialog";
import BulkImportDriversDialog from "@/components/fleet/BulkImportDriversDialog";
import AssignVehicleToDriverDialog from "@/components/fleet/AssignVehicleToDriverDialog";
import DriverBulkActionsToolbar from "@/components/fleet/DriverBulkActionsToolbar";
import DriverQuickStatusChange from "@/components/fleet/DriverQuickStatusChange";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";
import DriversQuickStats from "@/components/fleet/DriversQuickStats";
import DriversQuickActions from "@/components/fleet/DriversQuickActions";
import DriverCategoryCards from "@/components/fleet/DriverCategoryCards";
import DriverColumnsPicker from "@/components/fleet/DriverColumnsPicker";
import { renderDriverCell } from "@/components/fleet/driverCellRenderer";
import {
  DRIVER_COLUMNS,
  COLUMN_BY_ID,
  DEFAULT_VISIBLE_COLUMNS,
  loadVisibleColumns,
  saveVisibleColumns,
  type DriverColumnId,
} from "@/components/fleet/driverTableColumns";
import { exportDriversToCSV, exportAllDriversToCSV } from "@/components/fleet/DriverExportUtils";
import { printRecords, exportRecordsToPdf, type PrintColumn } from "@/components/fleet/printUtils";
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
  Download,
  Printer,
  FileDown,
  ChevronDown,
  X
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useDriversPaginated } from "@/hooks/useDriversPaginated";
import { Driver } from "@/hooks/useDrivers";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Drivers = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialAssignment = (searchParams.get("assignment") as "assigned" | "unassigned" | null) ?? "all";
  const initialDriverType = searchParams.get("driverType") ?? "all";
  const initialEmploymentType = searchParams.get("employmentType") ?? "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverTypeFilter, setDriverTypeFilter] = useState(initialDriverType);
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState(initialEmploymentType);
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">(initialAssignment);
  const [sortBy, setSortBy] = useState<"last_name" | "first_name" | "employee_id" | "hire_date" | "license_expiry" | "created_at" | "status">("last_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isExporting, setIsExporting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<DriverColumnId[]>(() => loadVisibleColumns());
  const updateVisibleColumns = (cols: DriverColumnId[]) => {
    setVisibleColumns(cols);
    saveVisibleColumns(cols);
  };
  const visibleColumnDefs = useMemo(
    () => visibleColumns.map((id) => COLUMN_BY_ID[id]).filter(Boolean),
    [visibleColumns],
  );
  const isColVisible = (id: DriverColumnId) => visibleColumns.includes(id);
  
  const PAGE_SIZE = 10;
  const { 
    drivers, 
    loading,
    initialLoading,
    totalCount,
    statusCounts,
    categoryCounts,
    currentPage, 
    totalPages, 
    loadPage,
    refetch 
  } = useDriversPaginated({
    pageSize: PAGE_SIZE,
    searchQuery,
    statusFilter,
    driverTypeFilter,
    employmentTypeFilter,
    assignmentFilter,
    sortBy,
    sortDir,
  });

  // Fetch vehicle assignments for the drivers shown on the current page
  const driverIds = useMemo(() => drivers.map(d => d.id), [drivers]);
  const { data: vehicleAssignments = {} } = useQuery({
    queryKey: ["driver-vehicle-assignments", organizationId, driverIds.join(",")],
    enabled: !!organizationId && driverIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, assigned_driver_id")
        .eq("organization_id", organizationId!)
        .in("assigned_driver_id", driverIds);
      if (error) throw error;
      const map: Record<string, { id: string; plate_number: string; make: string | null; model: string | null }> = {};
      (data || []).forEach((v: any) => {
        if (v.assigned_driver_id) map[v.assigned_driver_id] = v;
      });
      return map;
    },
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
        return <Badge className="bg-success/10 text-success border-success/20">{t('common.active', 'Active')}</Badge>;
      case "inactive":
        return <Badge variant="secondary">{t('common.inactive', 'Inactive')}</Badge>;
      case "suspended":
        return <Badge variant="destructive">{t('common.suspended', 'Suspended')}</Badge>;
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

  const handleExportAll = async () => {
    if (!organizationId || isExporting) return;
    
    try {
      setIsExporting(true);
      toast({ title: "Preparing export..." });
      const count = await exportAllDriversToCSV(
        organizationId,
        `all_drivers_${new Date().toISOString().split('T')[0]}.csv`,
        statusFilter,
        searchQuery
      );
      toast({ title: `Exported ${count} drivers` });
    } catch (error: any) {
      toast({ 
        title: "Export failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const driverPrintColumns: PrintColumn[] = useMemo(() => [
    { key: "employee_id", label: "Emp ID", width: 22 },
    { key: "name", label: "Name", width: 40, format: (_, r: any) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—" },
    { key: "license_number", label: "License #", width: 28 },
    { key: "license_class", label: "Class", width: 16 },
    { key: "license_expiry", label: "Lic. Expiry", width: 22 },
    { key: "phone", label: "Phone", width: 28 },
    { key: "email", label: "Email" },
    { key: "status", label: "Status", width: 20 },
    { key: "hire_date", label: "Hire Date", width: 22 },
  ], []);

  const handleDriversPrint = () => {
    const list = selectedDrivers.length > 0 ? selectedDrivers : drivers;
    printRecords(list, driverPrintColumns, {
      title: selectedDrivers.length > 0
        ? `Drivers (${selectedDrivers.length} selected)`
        : "Driver List",
      subtitle: `Page ${currentPage} of ${totalPages} · ${list.length} shown · ${totalCount} total`,
      filename: "drivers",
      organizationName: "Driver Management",
    });
  };

  const handleDriversExportPdf = () => {
    const list = selectedDrivers.length > 0 ? selectedDrivers : drivers;
    exportRecordsToPdf(list, driverPrintColumns, {
      title: selectedDrivers.length > 0
        ? `Drivers (${selectedDrivers.length} selected)`
        : "Driver List",
      subtitle: "Workforce report",
      filename: "drivers",
      organizationName: "Driver Management",
    });
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center" role="status" aria-live="polite">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground">Loading drivers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const activeDrivers = statusCounts.active;
  const inactiveDrivers = statusCounts.inactive;
  const suspendedDrivers = statusCounts.suspended;

  const hasActiveFilters =
    statusFilter !== "all" ||
    driverTypeFilter !== "all" ||
    employmentTypeFilter !== "all" ||
    assignmentFilter !== "all" ||
    searchQuery.length > 0 ||
    sortBy !== "last_name" ||
    sortDir !== "asc";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDriverTypeFilter("all");
    setEmploymentTypeFilter("all");
    setAssignmentFilter("all");
    setSortBy("last_name");
    setSortDir("asc");
  };

  // Order labels adapt to the active sort field for clarity
  const SORT_FIELD_OPTIONS: { value: typeof sortBy; label: string; orderLabels: { asc: string; desc: string } }[] = [
    { value: "last_name", label: "Last name", orderLabels: { asc: "A → Z", desc: "Z → A" } },
    { value: "first_name", label: "First name", orderLabels: { asc: "A → Z", desc: "Z → A" } },
    { value: "employee_id", label: "Employee ID", orderLabels: { asc: "A → Z", desc: "Z → A" } },
    { value: "hire_date", label: "Hire date", orderLabels: { asc: "Oldest first", desc: "Newest first" } },
    { value: "license_expiry", label: "License expiry", orderLabels: { asc: "Soonest first", desc: "Latest first" } },
    { value: "created_at", label: "Date added", orderLabels: { asc: "Oldest first", desc: "Newest first" } },
    { value: "status", label: "Status", orderLabels: { asc: "A → Z", desc: "Z → A" } },
  ];
  const activeOrderLabels =
    SORT_FIELD_OPTIONS.find((s) => s.value === sortBy)?.orderLabels ?? { asc: "Ascending", desc: "Descending" };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Modern Sticky Header */}
        <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-sm">
                <Users className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                  <span>Workforce</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">Directory</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent leading-tight">
                  {t('drivers.title')}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Managing <span className="font-semibold text-foreground">{totalCount}</span> {totalCount === 1 ? "driver" : "drivers"}
                  {hasActiveFilters && <span className="text-primary"> • filtered view</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
                <Can resource="drivers" action="import">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('common.import')}</span>
                  </Button>
                </Can>
                <div className="w-px h-5 bg-border" />
                <Can resource="drivers" action="export">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-8"
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">{isExporting ? `${t('common.export')}...` : t('common.export')}</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportAll}>
                        <Download className="w-4 h-4 mr-2" /> CSV (.csv)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDriversExportPdf}>
                        <FileDown className="w-4 h-4 mr-2" /> PDF (.pdf)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDriversPrint}>
                        <Printer className="w-4 h-4 mr-2" /> Print
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Can>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => navigate("/driver-scoring")}
              >
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Driver Scoring</span>
              </Button>
              <Can resource="drivers" action="create">
                <Button
                  size="sm"
                  className="gap-1.5 h-9 bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('drivers.addDriver')}
                </Button>
              </Can>
            </div>
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

        {/* Category Cards */}
        <DriverCategoryCards
          total={categoryCounts.total}
          assigned={categoryCounts.assigned}
          unassigned={categoryCounts.unassigned}
          byDriverType={categoryCounts.byDriverType}
          byEmploymentType={categoryCounts.byEmploymentType}
          active={{
            driverType: driverTypeFilter !== "all" ? driverTypeFilter : undefined,
            employmentType: employmentTypeFilter !== "all" ? employmentTypeFilter : undefined,
            assignment: assignmentFilter,
          }}
          onSelect={(f) => {
            if (f.assignment !== undefined) {
              if (f.assignment === "all") {
                setAssignmentFilter("all");
                setDriverTypeFilter("all");
                setEmploymentTypeFilter("all");
              } else {
                setAssignmentFilter(prev => prev === f.assignment ? "all" : f.assignment!);
              }
            }
            if (f.driverType !== undefined) {
              setDriverTypeFilter(prev => prev === f.driverType ? "all" : f.driverType!);
            }
            if (f.employmentType !== undefined) {
              setEmploymentTypeFilter(prev => prev === f.employmentType ? "all" : f.employmentType!);
            }
          }}
        />

        {/* Search and Filters - Modern Toolbar */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <Label htmlFor="driver-search" className="sr-only">
                Search drivers
              </Label>
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
              <Input
                id="driver-search"
                aria-label="Search drivers by name, license, employee ID, or email"
                placeholder="Search by name, license, employee ID, or email..."
                className="pl-10 h-10 bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>
            <div>
              <Label htmlFor="driver-status-filter" className="sr-only">
                Filter drivers by status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  id="driver-status-filter"
                  aria-label="Filter drivers by status"
                  className="w-full md:w-[170px] h-10 bg-background/50 border-border/50"
                >
                  <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" aria-hidden="true" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
                  <SelectItem value="suspended">{t('common.suspended', 'Suspended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Sort By */}
            <div>
              <Label htmlFor="driver-sort-by" className="sr-only">Sort drivers by field</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger
                  id="driver-sort-by"
                  aria-label="Sort drivers by"
                  className="w-full md:w-[180px] h-10 bg-background/50 border-border/50"
                >
                  <span className="text-xs text-muted-foreground mr-1.5">Sort:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Sort direction */}
            <div>
              <Label htmlFor="driver-sort-dir" className="sr-only">Sort order</Label>
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")}>
                <SelectTrigger
                  id="driver-sort-dir"
                  aria-label="Sort order"
                  className="w-full md:w-[160px] h-10 bg-background/50 border-border/50"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{activeOrderLabels.asc}</SelectItem>
                  <SelectItem value="desc">{activeOrderLabels.desc}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Clear all
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                  Search: "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:bg-background rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove search filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Remove search filter</span>
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                  Status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="hover:bg-background rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove status filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Remove status filter</span>
                  </button>
                </Badge>
              )}
              {assignmentFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                  {assignmentFilter === "assigned" ? "Assigned to vehicle" : "Unassigned"}
                  <button
                    type="button"
                    onClick={() => setAssignmentFilter("all")}
                    className="hover:bg-background rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove assignment filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Remove assignment filter</span>
                  </button>
                </Badge>
              )}
              {driverTypeFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                  Type: {driverTypeFilter.replace(/_/g, " ")}
                  <button
                    type="button"
                    onClick={() => setDriverTypeFilter("all")}
                    className="hover:bg-background rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove driver type filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Remove driver type filter</span>
                  </button>
                </Badge>
              )}
              {employmentTypeFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                  Employment: {employmentTypeFilter.replace(/_/g, " ")}
                  <button
                    type="button"
                    onClick={() => setEmploymentTypeFilter("all")}
                    className="hover:bg-background rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove employment filter"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Remove employment filter</span>
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

            {/* Drivers Table */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">All Drivers</CardTitle>
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{totalCount}</Badge>
                    <span>•</span>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                  </div>
                  <DriverColumnsPicker
                    visibleColumns={visibleColumns}
                    onChange={updateVisibleColumns}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumnDefs.map((col) => (
                        <TableHead
                          key={col.id}
                          className={
                            col.id === "select" ? "w-[40px]" :
                            col.id === "actions" ? "text-right" : ""
                          }
                        >
                          {col.id === "select" ? (
                            <Checkbox
                              checked={selectedDrivers.length === drivers.length && drivers.length > 0}
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all drivers"
                            />
                          ) : col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => {
                      const isSelected = selectedDrivers.some((d) => d.id === driver.id);
                      const ctx = {
                        selected: isSelected,
                        onSelect: (checked: boolean) => handleSelectDriver(driver, checked),
                        vehicleAssignment: vehicleAssignments[driver.id],
                        onAssignVehicle: () => handleAssignVehicle(driver),
                        onView: () => handleViewDriver(driver),
                        onEdit: () => handleEditDriver(driver),
                        onDelete: () => handleDeleteDriver(driver),
                        onScoring: () => navigate(`/driver-scoring`),
                        t: (key: string, fallback?: string) => t(key, fallback ?? key) as string,
                      };
                      return (
                        <TableRow key={driver.id} className="cursor-pointer hover:bg-muted/50">
                          {visibleColumnDefs.map((col) => {
                            const isInteractive =
                              col.id === "select" ||
                              col.id === "status" ||
                              col.id === "vehicle" ||
                              col.id === "actions";
                            return (
                              <TableCell
                                key={col.id}
                                className={col.id === "actions" ? "text-right" : ""}
                                onClick={
                                  isInteractive
                                    ? (e) => e.stopPropagation()
                                    : () => handleViewDriver(driver)
                                }
                              >
                                {renderDriverCell(col.id, driver, ctx)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    {drivers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={visibleColumnDefs.length} className="text-center py-12">
                          <div role="status" aria-live="polite">
                            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" aria-hidden="true" />
                            <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
                            <p className="text-muted-foreground text-sm">
                              {searchQuery ? "Try adjusting your search criteria" : "Click 'Add Driver' to register a new driver"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>

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
      <CentralizedDriverRegistrationDialog
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

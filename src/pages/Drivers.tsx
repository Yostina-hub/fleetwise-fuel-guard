import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreateDriverDialog from "@/components/fleet/CreateDriverDialog";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  CreditCard, 
  Filter, 
  Eye,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  Settings
} from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

const Drivers = () => {
  const { drivers, loading } = useDrivers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = searchQuery === "" ||
        driver.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.license_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

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
              Manage all drivers and their information • {drivers.length} drivers total
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
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
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Drivers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Safety Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
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
                    <TableCell>
                      <span className="font-mono text-sm">{driver.employee_id || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{driver.license_number}</div>
                          {driver.license_class && (
                            <div className="text-xs text-muted-foreground">Class {driver.license_class}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      {getStatusBadge(driver.status || "active")}
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDrivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
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
          </CardContent>
        </Card>
      </div>

      {/* Create Driver Dialog */}
      <CreateDriverDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </Layout>
  );
};

export default Drivers;

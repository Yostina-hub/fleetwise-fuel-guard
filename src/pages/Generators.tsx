import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Power, Edit, Trash2, Loader2 } from "lucide-react";
import { useGenerators, type Generator } from "@/hooks/useGenerators";
import { GeneratorRegistrationDialog } from "@/components/generators/GeneratorRegistrationDialog";
import { format } from "date-fns";
import { PageDateRangeProvider } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";

const STATUS_BADGE: Record<string, string> = {
  CREATED: "bg-muted text-muted-foreground border-muted-foreground/20",
  ACTIVE: "bg-success/10 text-success border-success/30",
  IN_SERVICE: "bg-primary/10 text-primary border-primary/30",
  OUT_OF_SERVICE: "bg-warning/10 text-warning border-warning/30",
  UNDER_MAINTENANCE: "bg-warning/10 text-warning border-warning/30",
  RETIRED: "bg-destructive/10 text-destructive border-destructive/30",
};

const CRITICALITY_BADGE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary border-primary/30",
  high: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const Generators = () => {
  const { generators, isLoading, deleteGenerator } = useGenerators();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Generator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Generator | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return generators.filter((g) => {
      if (statusFilter !== "all" && g.asset_status !== statusFilter) return false;
      if (criticalityFilter !== "all" && g.criticality !== criticalityFilter) return false;
      if (!q) return true;
      return (
        (g.name ?? "").toLowerCase().includes(q) ||
        (g.asset_number ?? "").toLowerCase().includes(q) ||
        (g.asset_serial_number ?? g.serial_number ?? "").toLowerCase().includes(q) ||
        (g.asset_group ?? "").toLowerCase().includes(q) ||
        (g.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [generators, search, statusFilter, criticalityFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteGenerator(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageDateRangeProvider>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Power className="h-6 w-6 text-primary" /> Generators (eAM)
            </h1>
            <p className="text-sm text-muted-foreground">
              Register and manage generator assets — Oracle eAM-style asset definition.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditTarget(null);
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Define Generator
          </Button>
        </div>

        {/* Page-level date range filter */}
        <PageDateRangeFilter />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total Assets</div>
              <div className="text-2xl font-bold">{generators.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">In Service</div>
              <div className="text-2xl font-bold text-primary">
                {generators.filter((g) => g.asset_status === "IN_SERVICE" || g.asset_status === "ACTIVE").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Critical</div>
              <div className="text-2xl font-bold text-destructive">
                {generators.filter((g) => g.criticality === "critical").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Under Maintenance</div>
              <div className="text-2xl font-bold text-warning">
                {generators.filter((g) => g.asset_status === "UNDER_MAINTENANCE").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset Registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, asset number, serial, group, location..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="CREATED">Created</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="IN_SERVICE">In service</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of service</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Under maintenance</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                <SelectTrigger className="md:w-44">
                  <SelectValue placeholder="Criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All criticality</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                        No generators registered yet. Click <strong>Define Generator</strong> to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-xs">{g.asset_number ?? "—"}</TableCell>
                        <TableCell className="font-medium">{g.name}</TableCell>
                        <TableCell className="text-xs">{g.asset_group ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {g.asset_serial_number ?? g.serial_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">{g.asset_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_BADGE[g.asset_status] ?? ""}
                          >
                            {g.asset_status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={CRITICALITY_BADGE[g.criticality] ?? ""}
                          >
                            {g.criticality}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {[g.area, g.location].filter(Boolean).join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {g.warranty_expiration
                            ? format(new Date(g.warranty_expiration), "MMM dd, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditTarget(g);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(g)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <GeneratorRegistrationDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditTarget(null);
        }}
        editGenerator={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete generator asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.asset_number}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </PageDateRangeProvider>
    </Layout>
  );
};

export default Generators;

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Shield,
  ShieldCheck,
  Save,
  Loader2,
  RotateCcw,
  Users,
  Lock,
  Eye,
  Pencil,
  Download,
  CheckCircle2,
  XCircle,
  Info,
  MapPin,
  Building2,
  Warehouse,
  Plus,
  Trash2,
  ShieldPlus,
} from "lucide-react";
import { ManageCustomRolesDialog } from "@/components/rbac/ManageCustomRolesDialog";
import { UserOverridesTab } from "@/components/rbac/UserOverridesTab";
import { useNavigate } from "react-router-dom";

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface RolePermMapping {
  role: string;
  permission_id: string;
}

interface LocationAccessRule {
  id: string;
  organization_id: string;
  role: string;
  location_type: string;
  location_id: string;
  access_level: string;
  created_at: string;
}

interface LocationOption {
  id: string;
  name: string;
  type: "depot" | "business_unit";
  parent?: string;
}

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin", description: "Full system access across all organizations", color: "text-destructive", tier: 1 },
  { value: "org_admin", label: "Org Admin", description: "Full access within their organization", color: "text-primary", tier: 2 },
  { value: "fleet_owner", label: "Fleet Owner", description: "Owner-level visibility into fleet operations", color: "text-violet-400", tier: 3 },
  { value: "operations_manager", label: "Ops Manager", description: "Manages day-to-day fleet operations", color: "text-indigo-400", tier: 3 },
  { value: "fleet_manager", label: "Fleet Manager", description: "Manages vehicles, routes, and schedules", color: "text-blue-400", tier: 4 },
  { value: "dispatcher", label: "Dispatcher", description: "Assigns jobs and monitors live fleet", color: "text-sky-400", tier: 4 },
  { value: "fuel_controller", label: "Fuel Controller", description: "Monitors and manages fuel operations", color: "text-yellow-400", tier: 4 },
  { value: "maintenance_lead", label: "Maintenance Lead", description: "Oversees maintenance and work orders", color: "text-orange-400", tier: 4 },
  { value: "operator", label: "Operator", description: "Day-to-day fleet operations", color: "text-cyan-400", tier: 5 },
  { value: "driver", label: "Driver", description: "Trips, logbooks, and incidents", color: "text-emerald-400", tier: 5 },
  { value: "technician", label: "Technician", description: "Maintenance and inspections", color: "text-amber-400", tier: 5 },
  { value: "mechanic", label: "Mechanic", description: "Hands-on vehicle repairs", color: "text-orange-400", tier: 5 },
  { value: "user", label: "User", description: "Basic end-user with view-only access", color: "text-slate-400", tier: 6 },
  { value: "auditor", label: "Auditor", description: "Read-only compliance and audit access", color: "text-purple-400", tier: 6 },
  { value: "viewer", label: "Viewer", description: "Read-only access to dashboards", color: "text-muted-foreground", tier: 6 },
];

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <Eye className="w-3.5 h-3.5" />,
  fleet: <Shield className="w-3.5 h-3.5" />,
  drivers: <Users className="w-3.5 h-3.5" />,
  map: <Eye className="w-3.5 h-3.5" />,
  fuel: <Eye className="w-3.5 h-3.5" />,
  maintenance: <Shield className="w-3.5 h-3.5" />,
  alerts: <Shield className="w-3.5 h-3.5" />,
  reports: <Download className="w-3.5 h-3.5" />,
  devices: <Shield className="w-3.5 h-3.5" />,
  roles: <Lock className="w-3.5 h-3.5" />,
  settings: <Shield className="w-3.5 h-3.5" />,
  users: <Users className="w-3.5 h-3.5" />,
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  read: <Eye className="w-3 h-3" />,
  write: <Pencil className="w-3 h-3" />,
  export: <Download className="w-3 h-3" />,
};

const ACCESS_LEVELS = [
  { value: "read", label: "Read Only", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { value: "write", label: "Read & Write", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "full", label: "Full Control", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
];

const RBACManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = usePermissions();
  const isOrgAdmin = hasRole("org_admin");
  const canManage = isSuperAdmin || isOrgAdmin;
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleMappings, setRoleMappings] = useState<RolePermMapping[]>([]);
  const [originalMappings, setOriginalMappings] = useState<RolePermMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("matrix");
  const [manageRolesOpen, setManageRolesOpen] = useState(false);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  // Location Access state
  const [locationRules, setLocationRules] = useState<LocationAccessRule[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [newRule, setNewRule] = useState({ role: "", location_type: "depot", location_id: "", access_level: "read" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [permsRes, mappingsRes, rolesRes] = await Promise.all([
        supabase.from("permissions").select("*").order("resource").order("action"),
        supabase.from("role_permissions").select("role, permission_id"),
        supabase.from("user_roles").select("role"),
      ]);

      if (permsRes.error) throw permsRes.error;
      if (mappingsRes.error) throw mappingsRes.error;

      setPermissions(permsRes.data || []);
      const maps = (mappingsRes.data || []).map((m) => ({
        role: m.role,
        permission_id: m.permission_id,
      }));
      setRoleMappings(maps);
      setOriginalMappings(maps);

      const counts: Record<string, number> = {};
      (rolesRes.data || []).forEach((r) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      setUserCounts(counts);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLocationData = useCallback(async () => {
    if (!organizationId) return;
    setLocationLoading(true);
    try {
      const [rulesRes, buRes, depotRes] = await Promise.all([
        supabase.from("role_location_access").select("*").eq("organization_id", organizationId),
        supabase.from("business_units").select("id, name").eq("organization_id", organizationId),
        supabase.from("depots").select("id, name, business_unit_id, business_units(name)"),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      setLocationRules((rulesRes.data || []) as LocationAccessRule[]);

      const locs: LocationOption[] = [];
      (buRes.data || []).forEach((bu) => {
        locs.push({ id: bu.id, name: bu.name, type: "business_unit" });
      });
      (depotRes.data || []).forEach((d: any) => {
        locs.push({ id: d.id, name: d.name, type: "depot", parent: d.business_units?.name });
      });
      setLocations(locs);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLocationLoading(false);
    }
  }, [organizationId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchLocationData(); }, [fetchLocationData]);

  const hasChanges = useMemo(() => {
    if (roleMappings.length !== originalMappings.length) return true;
    const origSet = new Set(originalMappings.map((m) => `${m.role}:${m.permission_id}`));
    const currSet = new Set(roleMappings.map((m) => `${m.role}:${m.permission_id}`));
    if (origSet.size !== currSet.size) return true;
    for (const key of currSet) {
      if (!origSet.has(key)) return true;
    }
    return false;
  }, [roleMappings, originalMappings]);

  const togglePermission = (role: string, permId: string) => {
    if (role === "super_admin") return;
    const exists = roleMappings.some((m) => m.role === role && m.permission_id === permId);
    if (exists) {
      setRoleMappings((prev) => prev.filter((m) => !(m.role === role && m.permission_id === permId)));
    } else {
      setRoleMappings((prev) => [...prev, { role, permission_id: permId }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const origSet = new Set(originalMappings.map((m) => `${m.role}:${m.permission_id}`));
      const currSet = new Set(roleMappings.map((m) => `${m.role}:${m.permission_id}`));

      const toAdd = roleMappings.filter((m) => !origSet.has(`${m.role}:${m.permission_id}`));
      const toRemove = originalMappings.filter((m) => !currSet.has(`${m.role}:${m.permission_id}`));

      for (const rm of toRemove) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", rm.role as any)
          .eq("permission_id", rm.permission_id);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("role_permissions")
          .insert(toAdd.map((m) => ({ role: m.role as any, permission_id: m.permission_id })));
        if (error) throw error;
      }

      setOriginalMappings([...roleMappings]);
      toast({ title: "Permissions Saved", description: `Updated ${toAdd.length + toRemove.length} permission mappings.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRoleMappings([...originalMappings]);
    toast({ title: "Reset", description: "Changes have been reverted." });
  };

  const handleAddLocationRule = async () => {
    if (!newRule.role || !newRule.location_id || !organizationId) {
      toast({ title: "Validation", description: "Select a role, location, and access level.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("role_location_access").insert({
        organization_id: organizationId,
        role: newRule.role,
        location_type: newRule.location_type,
        location_id: newRule.location_id,
        access_level: newRule.access_level,
      } as any);
      if (error) throw error;
      toast({ title: "Rule Added", description: "Location access rule created." });
      setNewRule({ role: "", location_type: "depot", location_id: "", access_level: "read" });
      fetchLocationData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLocationRule = async (id: string) => {
    try {
      const { error } = await supabase.from("role_location_access").delete().eq("id", id);
      if (error) throw error;
      setLocationRules((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Deleted", description: "Location access rule removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const resources = useMemo(() => {
    const resourceMap = new Map<string, Permission[]>();
    permissions.forEach((p) => {
      const list = resourceMap.get(p.resource) || [];
      list.push(p);
      resourceMap.set(p.resource, list);
    });
    return Array.from(resourceMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const isPermEnabled = (role: string, permId: string) => {
    if (role === "super_admin") return true;
    return roleMappings.some((m) => m.role === role && m.permission_id === permId);
  };

  const getRolePermCount = (role: string) => {
    if (role === "super_admin") return permissions.length;
    return roleMappings.filter((m) => m.role === role).length;
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((l) => l.type === newRule.location_type);
  }, [locations, newRule.location_type]);

  const getLocationName = (locId: string) => {
    const loc = locations.find((l) => l.id === locId);
    return loc ? `${loc.name}${loc.parent ? ` (${loc.parent})` : ""}` : locId.slice(0, 8);
  };

  const getRoleLabel = (roleVal: string) => ALL_ROLES.find((r) => r.value === roleVal)?.label || roleVal;
  const getRoleColor = (roleVal: string) => ALL_ROLES.find((r) => r.value === roleVal)?.color || "";

  if (!canManage) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">Only Super Admins or Org Admins can manage RBAC</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 slide-in-left">
            <div className="p-4 rounded-2xl glass-strong glow">
              <ShieldCheck className="h-8 w-8 text-primary animate-float" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold gradient-text">Role & Permission Management</h1>
              <p className="text-muted-foreground mt-1 text-lg">Configure access control for all roles</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/users")} className="gap-2">
              <Users className="w-4 h-4" /> Manage Users & Roles
            </Button>
            <Button variant="outline" onClick={() => setManageRolesOpen(true)} className="gap-2">
              <ShieldPlus className="w-4 h-4" /> Manage Roles
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges || saving} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
              {hasChanges && <Badge variant="secondary" className="ml-1 text-[10px]">Unsaved</Badge>}
            </Button>
          </div>
        </div>

        <ManageCustomRolesDialog open={manageRolesOpen} onOpenChange={setManageRolesOpen} />

        {/* Role Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {ALL_ROLES.map((role) => (
            <Card key={role.value} className="glass-strong hover:border-primary/30 transition-colors">
              <CardContent className="p-3 text-center">
                <p className={`text-xs font-semibold ${role.color} truncate`}>{role.label}</p>
                <p className="text-2xl font-bold mt-1">{userCounts[role.value] || 0}</p>
                <p className="text-[10px] text-muted-foreground">users</p>
                <div className="mt-1.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {getRolePermCount(role.value)}/{permissions.length} perms
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            <TabsTrigger value="overrides" className="gap-1.5"><UserCog className="w-3.5 h-3.5" /> User Overrides</TabsTrigger>
            <TabsTrigger value="location" className="gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location Access</TabsTrigger>
            <TabsTrigger value="roles">Role Details</TabsTrigger>
          </TabsList>

          {/* Permission Matrix Tab */}
          <TabsContent value="matrix" className="mt-4">
            <Card className="glass-strong overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Permission Matrix</CardTitle>
                <CardDescription>Toggle permissions for each role. Super Admin always has full access.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto max-w-full -mx-0">
                    <table className="w-full min-w-[1200px] border-collapse">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="sticky left-0 z-20 bg-background text-left px-4 py-2 w-[180px] min-w-[180px] text-xs font-medium text-muted-foreground">
                            Permission
                          </th>
                          {ALL_ROLES.map((role) => (
                            <th key={role.value} className="text-center px-1 py-2 min-w-[70px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`text-[10px] font-semibold cursor-help ${role.color}`}>
                                      {role.label}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="font-medium">{role.label}</p>
                                    <p className="text-xs text-muted-foreground">{role.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resources.map(([resource, perms]) => (
                          <React.Fragment key={resource}>
                            <tr className="bg-muted/20">
                              <td
                                colSpan={ALL_ROLES.length + 1}
                                className="sticky left-0 z-10 bg-muted/20 px-4 py-1.5"
                              >
                                <div className="flex items-center gap-2">
                                  {RESOURCE_ICONS[resource] || <Shield className="w-3.5 h-3.5" />}
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {resource}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {perms.map((perm) => (
                              <tr key={perm.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                <td className="sticky left-0 z-10 bg-background px-4 py-1.5">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          {ACTION_ICONS[perm.action] || <Info className="w-3 h-3" />}
                                          <span className="text-xs font-medium whitespace-nowrap">{perm.name.replace(/_/g, " ")}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="right">
                                        <p className="text-xs">{perm.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                {ALL_ROLES.map((role) => {
                                  const enabled = isPermEnabled(role.value, perm.id);
                                  const isSA = role.value === "super_admin";
                                  return (
                                    <td key={role.value} className="text-center px-1 py-1">
                                      {isSA ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                      ) : (
                                        <Switch
                                          checked={enabled}
                                          onCheckedChange={() => togglePermission(role.value, perm.id)}
                                          className="mx-auto scale-75"
                                        />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Access Tab */}
          <TabsContent value="location" className="mt-4 space-y-4">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location-Based Access Control
                </CardTitle>
                <CardDescription>
                  Restrict roles to specific depots or business units. Users with these roles will only access data from their assigned locations.
                  Super Admins and Org Admins always have access to all locations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add Rule Form */}
                <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-border/50 bg-muted/10 mb-6">
                  <div className="space-y-1.5 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground">Role</label>
                    <Select value={newRule.role || "none"} onValueChange={(v) => setNewRule((p) => ({ ...p, role: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select role...</SelectItem>
                        {ALL_ROLES.filter((r) => !["super_admin", "org_admin"].includes(r.value)).map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[130px]">
                    <label className="text-xs font-medium text-muted-foreground">Location Type</label>
                    <Select value={newRule.location_type} onValueChange={(v) => setNewRule((p) => ({ ...p, location_type: v, location_id: "" }))}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="depot">Depot</SelectItem>
                        <SelectItem value="business_unit">Business Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[160px] flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <Select value={newRule.location_id || "none"} onValueChange={(v) => setNewRule((p) => ({ ...p, location_id: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select location...</SelectItem>
                        {filteredLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}{loc.parent ? ` (${loc.parent})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[120px]">
                    <label className="text-xs font-medium text-muted-foreground">Access Level</label>
                    <Select value={newRule.access_level} onValueChange={(v) => setNewRule((p) => ({ ...p, access_level: v }))}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCESS_LEVELS.map((al) => (
                          <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleAddLocationRule} className="gap-1.5 h-9">
                    <Plus className="w-3.5 h-3.5" /> Add Rule
                  </Button>
                </div>

                {/* Rules Table */}
                {locationLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : locationRules.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No location access rules configured</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">All roles have access to all locations by default</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Location Type</TableHead>
                        <TableHead className="text-xs">Location</TableHead>
                        <TableHead className="text-xs">Access Level</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationRules.map((rule) => {
                        const accessLevel = ACCESS_LEVELS.find((a) => a.value === rule.access_level);
                        return (
                          <TableRow key={rule.id} className="border-border/20 hover:bg-muted/10">
                            <TableCell>
                              <span className={`text-xs font-semibold ${getRoleColor(rule.role)}`}>
                                {getRoleLabel(rule.role)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] gap-1">
                                {rule.location_type === "depot" ? <Warehouse className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {rule.location_type === "depot" ? "Depot" : "Business Unit"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{getLocationName(rule.location_id)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${accessLevel?.color || ""}`}>
                                {accessLevel?.label || rule.access_level}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteLocationRule(rule.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Location Access Summary by Role */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ALL_ROLES.filter((r) => !["super_admin", "org_admin"].includes(r.value)).map((role) => {
                const roleRules = locationRules.filter((lr) => lr.role === role.value);
                if (roleRules.length === 0) return null;
                return (
                  <Card key={role.value} className="glass-strong">
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm flex items-center gap-2 ${role.color}`}>
                        <Shield className="w-4 h-4" />
                        {role.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1.5">
                        {roleRules.map((rule) => (
                          <div key={rule.id} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              {rule.location_type === "depot" ? <Warehouse className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                              {getLocationName(rule.location_id)}
                            </span>
                            <Badge variant="outline" className={`text-[9px] ${ACCESS_LEVELS.find((a) => a.value === rule.access_level)?.color || ""}`}>
                              {rule.access_level}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              }).filter(Boolean)}
            </div>
          </TabsContent>

          {/* Role Details Tab */}
          <TabsContent value="roles" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {ALL_ROLES.map((role) => {
                const rolePerms = permissions.filter((p) => isPermEnabled(role.value, p.id));
                const readPerms = rolePerms.filter((p) => p.action === "read");
                const writePerms = rolePerms.filter((p) => p.action === "write");
                const exportPerms = rolePerms.filter((p) => p.action === "export");
                const roleLocRules = locationRules.filter((lr) => lr.role === role.value);

                return (
                  <Card key={role.value} className="glass-strong hover:border-primary/20 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className={`w-5 h-5 ${role.color}`} />
                          <CardTitle className={`text-base ${role.color}`}>{role.label}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            Tier {role.tier}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {userCounts[role.value] || 0} users
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="text-xs">{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {readPerms.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Read Access
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {readPerms.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                  {p.resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {writePerms.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Write Access
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {writePerms.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  {p.resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {exportPerms.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                              <Download className="w-3 h-3" /> Export Access
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {exportPerms.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                  {p.resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {roleLocRules.length > 0 && (
                          <div>
                            <Separator className="my-2" />
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Location Restrictions
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {roleLocRules.map((lr) => (
                                <Badge key={lr.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/20">
                                  {getLocationName(lr.location_id)} ({lr.access_level})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {rolePerms.length === 0 && roleLocRules.length === 0 && (
                          <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> No permissions configured
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RBACManagement;

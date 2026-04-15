import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";

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

const RBACManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleMappings, setRoleMappings] = useState<RolePermMapping[]>([]);
  const [originalMappings, setOriginalMappings] = useState<RolePermMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("matrix");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

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

      // Count users per role
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (role === "super_admin") return; // Super admin always has all perms
    const key = `${role}:${permId}`;
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
      // Calculate diffs
      const origSet = new Set(originalMappings.map((m) => `${m.role}:${m.permission_id}`));
      const currSet = new Set(roleMappings.map((m) => `${m.role}:${m.permission_id}`));

      const toAdd = roleMappings.filter((m) => !origSet.has(`${m.role}:${m.permission_id}`));
      const toRemove = originalMappings.filter((m) => !currSet.has(`${m.role}:${m.permission_id}`));

      // Remove revoked permissions
      for (const rm of toRemove) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", rm.role as any)
          .eq("permission_id", rm.permission_id);
        if (error) throw error;
      }

      // Add new permissions
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

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">Only Super Admins can manage RBAC</p>
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
          <div className="flex gap-2">
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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            <TabsTrigger value="roles">Role Details</TabsTrigger>
          </TabsList>

          {/* Permission Matrix Tab */}
          <TabsContent value="matrix" className="mt-4">
            <Card className="glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Permission Matrix</CardTitle>
                <CardDescription>Toggle permissions for each role. Super Admin always has full access.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="min-w-[900px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="sticky left-0 z-10 bg-background w-[200px] min-w-[200px]">Permission</TableHead>
                            {ALL_ROLES.map((role) => (
                              <TableHead key={role.value} className="text-center px-1 min-w-[80px]">
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
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resources.map(([resource, perms]) => (
                            <>
                              <TableRow key={`header-${resource}`} className="bg-muted/20 hover:bg-muted/30">
                                <TableCell
                                  colSpan={ALL_ROLES.length + 1}
                                  className="sticky left-0 z-10 bg-muted/20 py-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    {RESOURCE_ICONS[resource] || <Shield className="w-3.5 h-3.5" />}
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      {resource}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {perms.map((perm) => (
                                <TableRow key={perm.id} className="border-border/20 hover:bg-muted/10">
                                  <TableCell className="sticky left-0 z-10 bg-background">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 cursor-help">
                                            {ACTION_ICONS[perm.action] || <Info className="w-3 h-3" />}
                                            <span className="text-xs font-medium">{perm.name.replace(/_/g, " ")}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                          <p className="text-xs">{perm.description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                  {ALL_ROLES.map((role) => {
                                    const enabled = isPermEnabled(role.value, perm.id);
                                    const isSA = role.value === "super_admin";
                                    return (
                                      <TableCell key={role.value} className="text-center px-1">
                                        {isSA ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                        ) : (
                                          <Switch
                                            checked={enabled}
                                            onCheckedChange={() => togglePermission(role.value, perm.id)}
                                            className="mx-auto scale-75"
                                          />
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Details Tab */}
          <TabsContent value="roles" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {ALL_ROLES.map((role) => {
                const rolePerms = permissions.filter((p) => isPermEnabled(role.value, p.id));
                const readPerms = rolePerms.filter((p) => p.action === "read");
                const writePerms = rolePerms.filter((p) => p.action === "write");
                const exportPerms = rolePerms.filter((p) => p.action === "export");

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
                        {rolePerms.length === 0 && (
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

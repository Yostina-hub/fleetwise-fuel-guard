import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Trash2, Plus, Save, Loader2, Mail, Phone, Calendar, Building, IdCard, Briefcase, AlertTriangle, Layers, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { UserProfile } from "./UserTable";
import { Link } from "react-router-dom";
import UserActivitySummary from "./UserActivitySummary";
import { friendlyToastError } from "@/lib/errorMessages";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "org_admin", label: "Org Admin" },
  { value: "fleet_owner", label: "Fleet Owner" },
  { value: "operations_manager", label: "Ops Manager" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "fuel_controller", label: "Fuel Controller" },
  { value: "maintenance_lead", label: "Maintenance Lead" },
  { value: "operator", label: "Operator" },
  { value: "driver", label: "Driver" },
  { value: "technician", label: "Technician" },
  { value: "mechanic", label: "Mechanic" },
  { value: "auditor", label: "Auditor" },
  { value: "viewer", label: "Viewer" },
];

const EMPLOYEE_TYPES = [
  { value: "driver", label: "Driver" },
  { value: "mechanic", label: "Mechanic" },
  { value: "technician", label: "Technician" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "manager", label: "Manager" },
  { value: "coordinator", label: "Coordinator" },
  { value: "office_staff", label: "Office Staff" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

// Pool taxonomy mirrored from the Vehicle Registration form (BasicInfoTabs)
// so users see the same Corporate / Zone / Region categories and the same
// child sub-pools (FAN, TPO, HQ, SWAAZ, EAAZ, NR, SR).
type PoolCategory = "corporate" | "zone" | "region";
const POOL_HIERARCHY: Record<PoolCategory, { code: string; label: string }[]> = {
  corporate: [
    { code: "FAN", label: "FAN" },
    { code: "TPO", label: "TPO" },
    { code: "HQ", label: "HQ" },
  ],
  zone: [
    { code: "SWAAZ", label: "SWAAZ (South West Addis)" },
    { code: "EAAZ", label: "EAAZ (East Addis)" },
  ],
  region: [
    { code: "NR", label: "NR (North Region)" },
    { code: "SR", label: "SR (South Region)" },
  ],
};
const POOL_CATEGORY_META: Record<PoolCategory, { label: string; icon: typeof Building; tone: string }> = {
  corporate: { label: "Corporate", icon: Building, tone: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  zone:      { label: "Zone",      icon: Layers,   tone: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  region:    { label: "Region",    icon: MapPin,   tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
};
const CODE_TO_CATEGORY: Record<string, PoolCategory> = (() => {
  const m: Record<string, PoolCategory> = {};
  (Object.keys(POOL_HIERARCHY) as PoolCategory[]).forEach(cat => {
    POOL_HIERARCHY[cat].forEach(p => { m[p.code] = cat; });
  });
  return m;
})();

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/15 text-destructive border-destructive/30",
  org_admin: "bg-primary/15 text-primary border-primary/30",
  fleet_owner: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  operations_manager: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  fleet_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  dispatcher: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  fuel_controller: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  maintenance_lead: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  operator: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  driver: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  technician: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  mechanic: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  auditor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
  initialTab?: "profile" | "hr" | "roles" | "activity";
}

interface ProfileExtras {
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  hire_date: string | null;
  status: string | null;
  employee_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  linked_driver_id: string | null;
  linked_employee_id: string | null;
}

const UserDetailDialog = ({ open, onOpenChange, user, onUserUpdated, initialTab = "profile" }: UserDetailDialogProps) => {
  const { toast } = useToast();

  // Identity
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  // HR
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [status, setStatus] = useState("active");
  const [employeeType, setEmployeeType] = useState<string>("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRel, setEmergencyRel] = useState("");

  const [linkedDriverId, setLinkedDriverId] = useState<string | null>(null);
  const [linkedEmployeeId, setLinkedEmployeeId] = useState<string | null>(null);

  // Pool assignment (mirrors Vehicle Registration UX: category + specific pool)
  const [poolCategory, setPoolCategory] = useState<PoolCategory | "">("");
  const [poolCode, setPoolCode] = useState<string>("");
  const [savingPool, setSavingPool] = useState(false);
  // Pools loaded from `fleet_pools` (same source as Vehicle Request Form).
  // Falls back to POOL_HIERARCHY if the table has no rows for this org.
  const [fleetPools, setFleetPools] = useState<{ code: string; name: string; category: PoolCategory; sort_order?: number | null }[]>([]);

  const [loadingExtras, setLoadingExtras] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingHR, setSavingHR] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "hr" | "roles" | "activity">(initialTab);

  // Load profile extras from DB whenever the dialog opens for a user
  useEffect(() => {
    if (!open || !user) return;

    setEditName(user.full_name || "");
    setEditPhone(user.phone || "");
    setActiveTab(initialTab);
    setNewRole("");

    let cancelled = false;
    (async () => {
      setLoadingExtras(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, middle_name, employee_code, department, job_title, hire_date, status, employee_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, linked_driver_id, linked_employee_id")
          .eq("id", user.id)
          .maybeSingle<ProfileExtras>();
        if (cancelled) return;
        if (error) throw error;
        setFirstName(data?.first_name || "");
        setMiddleName(data?.middle_name || "");
        setLastName(data?.last_name || "");
        setEmployeeCode(data?.employee_code || "");
        setDepartment(data?.department || "");
        setJobTitle(data?.job_title || "");
        setHireDate(data?.hire_date || "");
        setStatus(data?.status || "active");
        setEmployeeType(data?.employee_type || "");
        setEmergencyName(data?.emergency_contact_name || "");
        setEmergencyPhone(data?.emergency_contact_phone || "");
        setEmergencyRel(data?.emergency_contact_relationship || "");
        setLinkedDriverId(data?.linked_driver_id || null);
        setLinkedEmployeeId(data?.linked_employee_id || null);

        // Load current pool membership (first row, latest)
        const { data: poolRows } = await supabase
          .from("pool_memberships")
          .select("pool_code")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        const code = poolRows?.[0]?.pool_code as string | undefined;
        if (code && CODE_TO_CATEGORY[code]) {
          setPoolCategory(CODE_TO_CATEGORY[code]);
          setPoolCode(code);
        } else {
          setPoolCategory("");
          setPoolCode("");
        }
      } catch (err: any) {
        if (!cancelled) toast({ title: "Failed to load HR fields", description: err.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingExtras(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, user, initialTab, toast]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim() || null,
          phone: editPhone.trim() || null,
          first_name: firstName.trim() || null,
          middle_name: middleName.trim() || null,
          last_name: lastName.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile Updated", description: "User profile saved successfully." });
      onUserUpdated();
    } catch (err: any) {
      friendlyToastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHR = async () => {
    if (!user) return;
    setSavingHR(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          employee_code: employeeCode.trim() || null,
          department: department.trim() || null,
          job_title: jobTitle.trim() || null,
          hire_date: hireDate || null,
          status,
          employee_type: employeeType || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          emergency_contact_relationship: emergencyRel.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "HR Details Saved", description: "Employment information updated." });
      onUserUpdated();
    } catch (err: any) {
      friendlyToastError(err);
    } finally {
      setSavingHR(false);
    }
  };

  const handleSavePool = async () => {
    if (!user) return;
    if (!poolCategory || !poolCode) {
      toast({ title: "Pick a pool", description: "Select both Pool Category and Specific Pool.", variant: "destructive" });
      return;
    }
    if (!user.organization_id) {
      toast({ title: "No organization", description: "Assign this user to an organization before setting a pool.", variant: "destructive" });
      return;
    }
    setSavingPool(true);
    try {
      const { error: delErr } = await supabase
        .from("pool_memberships")
        .delete()
        .eq("user_id", user.id);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from("pool_memberships")
        .insert({
          user_id: user.id,
          organization_id: user.organization_id,
          pool_code: poolCode,
          role: "member",
        });
      if (insErr) throw insErr;
      toast({ title: "Pool Updated", description: `Assigned to ${poolCode} (${POOL_CATEGORY_META[poolCategory].label}).` });
      onUserUpdated();
    } catch (err: any) {
      friendlyToastError(err);
    } finally {
      setSavingPool(false);
    }
  };

  const handleAddRole = async () => {
    if (!user || !newRole) return;
    setRoleLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: newRole as any, organization_id: user.organization_id } as any);
      if (error) throw error;
      const isDriver = newRole === "driver";
      toast({
        title: "Role Added",
        description: isDriver
          ? "Driver role assigned. A driver record was auto-created and is now visible in the Drivers list."
          : `${ROLES.find(r => r.value === newRole)?.label} assigned successfully.`,
      });
      setNewRole("");
      onUserUpdated();
    } catch (err: any) {
      friendlyToastError(err);
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!user) return;
    setRoleLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", role as any);
      if (error) throw error;
      toast({ title: "Role Removed", description: `${ROLES.find(r => r.value === role)?.label} removed.` });
      onUserUpdated();
    } catch (err: any) {
      friendlyToastError(err);
    } finally {
      setRoleLoading(false);
    }
  };

  if (!user) return null;

  const existingRoles = user.user_roles.map(r => r.role);
  const availableRoles = ROLES.filter(r => !existingRoles.includes(r.value));
  const initials = user.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  const isDriver = existingRoles.includes("driver");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl truncate">{user.full_name || "Unnamed User"}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{user.email}</span>
              </DialogDescription>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {linkedDriverId && (
                  <Link to="/drivers" className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                    <IdCard className="w-3 h-3" /> Linked Driver
                  </Link>
                )}
                {linkedEmployeeId && (
                  <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                    <Briefcase className="w-3 h-3" /> Linked Employee
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "profile" | "hr" | "roles" | "activity")} className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Identity</TabsTrigger>
            <TabsTrigger value="hr">Employment</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Organization</p>
                  <p className="font-medium truncate">{user.organization_id ? "Assigned" : "None"}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" disabled={loadingExtras} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="middle-name">Middle</Label>
                  <Input id="middle-name" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="(optional)" disabled={loadingExtras} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" disabled={loadingExtras} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-name">Display Name</Label>
                <Input id="detail-name" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Display name" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="detail-phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+251..." className="pl-10" />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving || loadingExtras} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Identity
              </Button>

              <Separator />

              {/* Pool Assignment — mirrors Vehicle Registration (Pool Category + Specific Pool) */}
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Pool Assignment
                  </Label>
                  {poolCode && poolCategory && (
                    <Badge variant="outline" className={POOL_CATEGORY_META[poolCategory].tone}>
                      {POOL_CATEGORY_META[poolCategory].label} · {poolCode}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pool-category" className="text-xs">Pool Category</Label>
                    <Select
                      value={poolCategory}
                      onValueChange={(v) => {
                        const cat = v as PoolCategory;
                        setPoolCategory(cat);
                        // Reset specific pool if it doesn't belong to the new category
                        if (!POOL_HIERARCHY[cat].some(p => p.code === poolCode)) {
                          setPoolCode("");
                        }
                      }}
                      disabled={loadingExtras || savingPool}
                    >
                      <SelectTrigger id="pool-category">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(POOL_HIERARCHY) as PoolCategory[]).map(cat => {
                          const meta = POOL_CATEGORY_META[cat];
                          const Icon = meta.icon;
                          return (
                            <SelectItem key={cat} value={cat}>
                              <span className="flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5" />
                                {meta.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pool-code" className="text-xs">Specific Pool</Label>
                    <Select
                      value={poolCode}
                      onValueChange={setPoolCode}
                      disabled={!poolCategory || loadingExtras || savingPool}
                    >
                      <SelectTrigger id="pool-code" className={!poolCategory ? "opacity-50" : ""}>
                        <SelectValue placeholder={poolCategory ? "Select pool..." : "Pick category first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {poolCategory &&
                          POOL_HIERARCHY[poolCategory].map(p => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSavePool}
                  disabled={savingPool || loadingExtras || !poolCategory || !poolCode}
                  variant="secondary"
                  className="w-full gap-2"
                >
                  {savingPool ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Pool
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hr" className="space-y-4 mt-4">
            {loadingExtras ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-code">Employee ID</Label>
                    <Input id="emp-code" value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} placeholder="EMP-0001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-type">Employee Type</Label>
                    <Select value={employeeType} onValueChange={setEmployeeType}>
                      <SelectTrigger id="emp-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Operations" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-title">Job Title</Label>
                    <Input id="job-title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Senior Driver" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="hire-date">Hire Date</Label>
                    <Input id="hire-date" type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ec-name">Name</Label>
                    <Input id="ec-name" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Contact name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ec-phone">Phone</Label>
                    <Input id="ec-phone" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="+251..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ec-rel">Relationship</Label>
                  <Input id="ec-rel" value={emergencyRel} onChange={e => setEmergencyRel(e.target.value)} placeholder="Spouse, Parent, Sibling..." />
                </div>

                <Button onClick={handleSaveHR} disabled={savingHR} className="w-full gap-2">
                  {savingHR ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Employment Details
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 mt-4">
            {isDriver && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2">
                <IdCard className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-200">
                  This user has the <span className="font-semibold">Driver</span> role. A driver record is auto-maintained — view it in the <Link to="/drivers" className="underline font-medium">Drivers list</Link>.
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Roles</Label>
              {existingRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">No roles assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {existingRoles.map(role => (
                    <Badge
                      key={role}
                      variant="outline"
                      className={`gap-1 pr-1 ${ROLE_COLORS[role] || ""}`}
                    >
                      {ROLES.find(r => r.value === role)?.label || role}
                      <button
                        onClick={() => handleRemoveRole(role)}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                        disabled={roleLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Role</Label>
              <div className="flex gap-2">
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddRole} disabled={!newRole || roleLoading} size="icon" variant="outline">
                  {roleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              {newRole === "driver" && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 flex items-start gap-2 text-[11px] text-amber-200">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  Assigning <span className="font-semibold">Driver</span> will auto-create a stub record in the Drivers list. Complete the license number afterwards.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <UserActivitySummary userId={user.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;

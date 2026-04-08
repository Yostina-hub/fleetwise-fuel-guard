import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Plus, FolderTree, MapPin, Layers } from "lucide-react";

interface DriverGroup {
  id: string;
  name: string;
  group_type: string;
  parent_group_id: string | null;
  description: string | null;
  is_active: boolean;
}

interface GroupMember {
  id: string;
  group_id: string;
  driver_id: string;
}

const GROUP_TYPE_ICONS: Record<string, typeof Building2> = {
  region: MapPin,
  depot: Building2,
  department: Layers,
  team: Users,
  shift: Users,
};

const GROUP_TYPE_COLORS: Record<string, string> = {
  region: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  depot: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  department: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  team: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  shift: "bg-primary/20 text-primary border-primary/30",
};

export const DriverHierarchyView = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { toast } = useToast();
  const [groups, setGroups] = useState<DriverGroup[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", group_type: "team", description: "" });

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [groupsRes, membersRes] = await Promise.all([
      supabase.from("driver_groups").select("*").eq("organization_id", organizationId).order("group_type").order("name"),
      supabase.from("driver_group_members").select("*").eq("organization_id", organizationId),
    ]);
    setGroups((groupsRes.data as any) || []);
    setMembers((membersRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [organizationId]);

  const createGroup = async () => {
    if (!organizationId || !newGroup.name.trim()) return;
    await supabase.from("driver_groups").insert({
      organization_id: organizationId,
      name: newGroup.name,
      group_type: newGroup.group_type,
      description: newGroup.description || null,
    });
    toast({ title: "Group created" });
    setNewGroup({ name: "", group_type: "team", description: "" });
    setShowCreate(false);
    fetchData();
  };

  const addDriverToGroup = async (groupId: string, driverId: string) => {
    if (!organizationId) return;
    const exists = members.find(m => m.group_id === groupId && m.driver_id === driverId);
    if (exists) return;
    await supabase.from("driver_group_members").insert({ group_id: groupId, driver_id: driverId, organization_id: organizationId });
    toast({ title: "Driver added to group" });
    fetchData();
  };

  const removeDriverFromGroup = async (memberId: string) => {
    await supabase.from("driver_group_members").delete().eq("id", memberId);
    toast({ title: "Driver removed" });
    fetchData();
  };

  const getGroupMembers = (groupId: string) => {
    const memberIds = members.filter(m => m.group_id === groupId).map(m => m.driver_id);
    return drivers.filter(d => memberIds.includes(d.id));
  };

  const unassignedDrivers = drivers.filter(d => !members.some(m => m.driver_id === d.id));

  const groupsByType = groups.reduce((acc, g) => {
    (acc[g.group_type] = acc[g.group_type] || []).push(g);
    return acc;
  }, {} as Record<string, DriverGroup[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-primary" />
            Driver Organization Hierarchy
          </h3>
          <p className="text-sm text-muted-foreground">{groups.length} groups · {drivers.length} drivers · {unassignedDrivers.length} unassigned</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Driver Group</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={newGroup.name} onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))} placeholder="e.g. North Region" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newGroup.group_type} onValueChange={v => setNewGroup(p => ({ ...p, group_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["region", "depot", "department", "team", "shift"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={newGroup.description} onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={createGroup}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups by Type */}
      {Object.entries(groupsByType).map(([type, typeGroups]) => {
        const Icon = GROUP_TYPE_ICONS[type] || Users;
        return (
          <div key={type} className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 capitalize">
              <Icon className="w-4 h-4 text-muted-foreground" /> {type}s
              <Badge variant="secondary" className="text-[10px]">{typeGroups.length}</Badge>
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {typeGroups.map(group => {
                const groupDrivers = getGroupMembers(group.id);
                return (
                  <Card key={group.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{group.name}</CardTitle>
                        <Badge variant="outline" className={`text-[10px] ${GROUP_TYPE_COLORS[type] || ""}`}>{type}</Badge>
                      </div>
                      {group.description && <CardDescription className="text-xs">{group.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {groupDrivers.map(d => {
                        const membership = members.find(m => m.group_id === group.id && m.driver_id === d.id);
                        return (
                          <div key={d.id} className="flex items-center gap-2 p-1.5 rounded text-sm">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={d.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{d.first_name[0]}{d.last_name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 truncate text-xs">{d.first_name} {d.last_name}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-[10px] text-muted-foreground hover:text-destructive" onClick={() => membership && removeDriverFromGroup(membership.id)}>×</Button>
                          </div>
                        );
                      })}
                      {groupDrivers.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-2">No drivers assigned</p>
                      )}
                      {/* Add Driver to group */}
                      <Select onValueChange={(v) => addDriverToGroup(group.id, v)}>
                        <SelectTrigger className="h-7 text-[10px]">
                          <SelectValue placeholder="+ Add driver..." />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.filter(d => !groupDrivers.some(gd => gd.id === d.id)).map(d => (
                            <SelectItem key={d.id} value={d.id} className="text-xs">{d.first_name} {d.last_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {groups.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No groups created yet</p>
            <p className="text-xs mt-1">Create regions, depots, or teams to organize your drivers.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

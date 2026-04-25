import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { friendlyToastError } from "@/lib/errorMessages";

const BreachNotificationTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [breachType, setBreachType] = useState("unauthorized_access");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["breach-incidents", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("breach_incidents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("discovered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(incidents?.length || 0, 10);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing context");
      const num = `BRE-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("breach_incidents").insert([{
        organization_id: organizationId,
        incident_number: num,
        title,
        description,
        severity,
        breach_type: breachType,
        reported_by: user.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breach-incidents"] });
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      toast({ title: "Breach Incident Reported", description: "72-hour notification countdown has started" });
    },
    onError: () => {
      friendlyToastError(null, { title: "Failed to report breach" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "reported") updates.authority_notified_at = new Date().toISOString();
      const { error } = await supabase.from("breach_incidents").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breach-incidents"] });
      toast({ title: "Status Updated" });
    },
  });

  const getHoursRemaining = (deadline: string) => {
    const hours = differenceInHours(new Date(deadline), new Date());
    return Math.max(0, hours);
  };

  const activeCount = incidents?.filter(i => i.status !== "resolved" && i.status !== "reported").length || 0;
  const urgentCount = incidents?.filter(i => {
    if (i.status === "resolved" || i.status === "reported") return false;
    return getHoursRemaining(i.notification_deadline) < 24;
  }).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Breach Notification (Art. 33)</h2>
          <p className="text-sm text-muted-foreground">72-hour breach reporting & incident management</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive"><Plus className="h-4 w-4 mr-2" />Report Breach</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Report Data Breach</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the breach" />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Breach Type</Label>
                <Select value={breachType} onValueChange={setBreachType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                    <SelectItem value="data_loss">Data Loss</SelectItem>
                    <SelectItem value="data_theft">Data Theft</SelectItem>
                    <SelectItem value="system_compromise">System Compromise</SelectItem>
                    <SelectItem value="accidental_disclosure">Accidental Disclosure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description..." />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title} className="w-full" variant="destructive">
                {createMutation.isPending ? "Reporting..." : "Report Breach Incident"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Active Incidents</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Urgent (&lt;24h)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{urgentCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Total Reported</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{incidents?.length || 0}</p></CardContent>
        </Card>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>72h Deadline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents?.slice(startIndex, endIndex).map(inc => {
                const hoursLeft = getHoursRemaining(inc.notification_deadline);
                return (
                  <TableRow key={inc.id}>
                    <TableCell className="font-mono text-xs">{inc.incident_number}</TableCell>
                    <TableCell className="font-medium">{inc.title}</TableCell>
                    <TableCell>
                      <Badge variant={inc.severity === "critical" || inc.severity === "high" ? "destructive" : "secondary"}>
                        {inc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{inc.status}</Badge></TableCell>
                    <TableCell>
                      <span className={hoursLeft < 24 ? "text-destructive font-bold" : ""}>
                        {hoursLeft > 0 ? `${hoursLeft}h remaining` : "Overdue"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select value={inc.status} onValueChange={s => updateStatusMutation.mutate({ id: inc.id, status: s })}>
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="detected">Detected</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="contained">Contained</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="reported">Reported</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination currentPage={currentPage} totalItems={incidents?.length || 0} itemsPerPage={10} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
};

export default BreachNotificationTab;

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, Send, Loader2, RefreshCw, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";
import { friendlyToastError } from "@/lib/errorMessages";

const EVENT_TYPES = ["auth", "data_access", "admin_action", "security", "data_mutation", "api_access", "login_failure"];
const FORMATS = [
  { value: "json", label: "JSON" },
  { value: "cef", label: "CEF (Common Event Format)" },
  { value: "leef", label: "LEEF (Log Event Extended Format)" },
  { value: "syslog", label: "Syslog (RFC 5424)" },
];

const SIEMForwardingTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    endpoint_url: "",
    auth_type: "bearer",
    auth_token: "",
    format: "json",
    event_types: ["auth", "security", "admin_action"] as string[],
    batch_size: 100,
    forward_interval_seconds: 300,
  });

  const { data: configs } = useQuery({
    queryKey: ["siem-configs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("siem_configs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: forwardLogs } = useQuery({
    queryKey: ["siem-forward-logs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("siem_forward_logs").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization");
      const { error } = await supabase.from("siem_configs").insert([{
        organization_id: organizationId,
        name: form.name,
        endpoint_url: form.endpoint_url,
        auth_type: form.auth_type,
        auth_token: form.auth_token || null,
        format: form.format,
        event_types: form.event_types,
        batch_size: form.batch_size,
        forward_interval_seconds: form.forward_interval_seconds,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siem-configs"] });
      setIsDialogOpen(false);
      setForm({ name: "", endpoint_url: "", auth_type: "bearer", auth_token: "", format: "json", event_types: ["auth", "security", "admin_action"], batch_size: 100, forward_interval_seconds: 300 });
      toast({ title: "SIEM Endpoint Created", description: "Audit log forwarding configured" });
    },
    onError: (e: any) => {
      friendlyToastError(e);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("siem_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siem-configs"] });
      toast({ title: "SIEM Endpoint Removed" });
    },
  });

  const testForwardMutation = useMutation({
    mutationFn: async (configId: string) => {
      if (!organizationId) throw new Error("Missing org");
      const { error } = await supabase.from("siem_forward_logs").insert([{
        organization_id: organizationId,
        siem_config_id: configId,
        status: "pending",
        events_forwarded: 0,
      }]);
      if (error) throw error;
      toast({ title: "Test Forward Queued", description: "A test batch will be forwarded shortly" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siem-forward-logs"] });
    },
  });

  const toggleEventType = (event: string) => {
    setForm(prev => ({
      ...prev,
      event_types: prev.event_types.includes(event)
        ? prev.event_types.filter(e => e !== event)
        : [...prev.event_types, event],
    }));
  };

  return (
    <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              SIEM Log Forwarding
            </h2>
            <p className="text-sm text-muted-foreground">
              Export audit logs to your SIEM/security analytics platform (Splunk, Elastic, QRadar, etc.)
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add SIEM Endpoint</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Configure SIEM Forwarding</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Splunk HEC" />
                  </div>
                  <div>
                    <Label>Endpoint URL</Label>
                    <Input value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })} placeholder="https://splunk.example.com:8088/services/collector" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Auth Type</Label>
                    <Select value={form.auth_type} onValueChange={v => setForm({ ...form, auth_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.auth_type !== "none" && (
                    <div>
                      <Label>Auth Token</Label>
                      <Input type="password" value={form.auth_token} onChange={e => setForm({ ...form, auth_token: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <Label>Output Format</Label>
                    <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Batch Size</Label>
                    <Input type="number" value={form.batch_size} onChange={e => setForm({ ...form, batch_size: parseInt(e.target.value) || 100 })} />
                  </div>
                  <div>
                    <Label>Forward Interval (seconds)</Label>
                    <Input type="number" value={form.forward_interval_seconds} onChange={e => setForm({ ...form, forward_interval_seconds: parseInt(e.target.value) || 300 })} />
                  </div>
                </div>
                <div>
                  <Label>Event Types to Forward</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {EVENT_TYPES.map(event => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox id={`siem-${event}`} checked={form.event_types.includes(event)} onCheckedChange={() => toggleEventType(event)} />
                        <label htmlFor={`siem-${event}`} className="text-sm capitalize">{event.replace("_", " ")}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.endpoint_url || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create SIEM Endpoint"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Endpoints */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Last Forward</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!configs?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No SIEM endpoints configured</TableCell>
              </TableRow>
            ) : configs.map(cfg => (
              <TableRow key={cfg.id}>
                <TableCell className="font-medium">{cfg.name}</TableCell>
                <TableCell><code className="text-xs">{cfg.endpoint_url}</code></TableCell>
                <TableCell><Badge variant="outline">{cfg.format}</Badge></TableCell>
                <TableCell>{(cfg.event_types as string[]).length} types</TableCell>
                <TableCell className="text-sm">{cfg.last_forward_at ? format(new Date(cfg.last_forward_at), "PPp") : "Never"}</TableCell>
                <TableCell>
                  <Badge variant={cfg.is_active ? "default" : "secondary"}>{cfg.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => testForwardMutation.mutate(cfg.id)} title="Test forward">
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cfg.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {forwardLogs && forwardLogs.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium mb-3">Forwarding History</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events Sent</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>HTTP Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forwardLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.created_at), "PPpp")}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.events_forwarded}</TableCell>
                      <TableCell>{log.events_failed}</TableCell>
                      <TableCell>{log.response_code || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default SIEMForwardingTab;

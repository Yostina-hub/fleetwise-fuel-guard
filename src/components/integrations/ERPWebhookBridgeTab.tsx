import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Zap, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { friendlyToastError } from "@/lib/errorMessages";

const BRIDGE_EVENTS = [
  "vehicle.created", "vehicle.updated", "vehicle.deleted",
  "driver.created", "driver.updated",
  "trip.completed", "trip.started",
  "fuel.transaction.created", "fuel.theft.detected",
  "maintenance.workorder.created", "maintenance.workorder.completed",
  "alert.created", "alert.resolved",
  "inspection.completed", "inspection.failed",
];

const ERPWebhookBridgeTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [authType, setAuthType] = useState("bearer");
  const [authToken, setAuthToken] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: bridges, isLoading } = useQuery({
    queryKey: ["erp-webhook-bridges", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_webhook_bridges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization");
      const { error } = await supabase.from("erp_webhook_bridges").insert([{
        organization_id: organizationId,
        name,
        target_url: targetUrl,
        auth_type: authType,
        auth_token: authToken || null,
        events: selectedEvents,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-webhook-bridges"] });
      setIsDialogOpen(false);
      setName(""); setTargetUrl(""); setAuthToken(""); setSelectedEvents([]);
      toast({ title: "Bridge Created", description: "ERP webhook bridge configured successfully" });
    },
    onError: (e: any) => {
      friendlyToastError(e);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erp_webhook_bridges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-webhook-bridges"] });
      toast({ title: "Bridge Deleted" });
    },
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              ERP Webhook Bridges
            </h2>
            <p className="text-sm text-muted-foreground">
              Forward fleet events to ERP/BI systems via configurable webhook bridges
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Bridge</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create ERP Webhook Bridge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Bridge Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="SAP Fleet Sync" />
                </div>
                <div>
                  <Label>Target Endpoint URL</Label>
                  <Input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://erp.example.com/api/webhook" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Auth Type</Label>
                    <Select value={authType} onValueChange={setAuthType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="api_key">API Key Header</SelectItem>
                        <SelectItem value="none">No Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {authType !== "none" && (
                    <div>
                      <Label>Auth Token/Key</Label>
                      <Input type="password" value={authToken} onChange={e => setAuthToken(e.target.value)} placeholder="Token or key" />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Subscribe to Events</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {BRIDGE_EVENTS.map(event => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox id={`bridge-${event}`} checked={selectedEvents.includes(event)} onCheckedChange={() => toggleEvent(event)} />
                        <label htmlFor={`bridge-${event}`} className="text-sm">{event}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!name || !targetUrl || selectedEvents.length === 0 || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create Bridge"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!bridges?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No ERP webhook bridges configured</TableCell>
              </TableRow>
            ) : bridges.map(bridge => (
              <TableRow key={bridge.id}>
                <TableCell className="font-medium">{bridge.name}</TableCell>
                <TableCell><code className="text-xs">{bridge.target_url}</code></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(bridge.events as string[]).slice(0, 2).map(e => (
                      <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                    ))}
                    {(bridge.events as string[]).length > 2 && (
                      <Badge variant="secondary" className="text-xs">+{(bridge.events as string[]).length - 2}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{bridge.auth_type}</Badge></TableCell>
                <TableCell>
                  <span className="text-xs text-primary">{bridge.success_count}✓</span>
                  {" / "}
                  <span className="text-xs text-destructive">{bridge.failure_count}✗</span>
                </TableCell>
                <TableCell>
                  <Badge variant={bridge.is_active ? "default" : "secondary"}>
                    {bridge.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(bridge.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default ERPWebhookBridgeTab;

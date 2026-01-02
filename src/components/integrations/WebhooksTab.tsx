import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

const WEBHOOK_EVENTS = [
  "alert.created",
  "fuel.refuel.detected",
  "fuel.theft.detected",
  "trip.completed",
  "maintenance.workorder.created",
  "vehicle.created",
  "vehicle.updated",
  "driver.created",
];

const WebhooksTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: deliveries } = useQuery({
    queryKey: ["webhook-deliveries", selectedWebhook],
    queryFn: async () => {
      if (!selectedWebhook) return [];
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("subscription_id", selectedWebhook)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedWebhook,
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing organization or user");
      
      const secret = `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      
      const { error } = await supabase
        .from("webhook_subscriptions")
        .insert([{
          name,
          url,
          events: selectedEvents,
          secret,
          organization_id: organizationId,
          created_by: user.id,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setIsDialogOpen(false);
      setName("");
      setUrl("");
      setSelectedEvents([]);
      toast({
        title: "Webhook Created",
        description: "Webhook subscription has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_subscriptions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({
        title: "Webhook Deleted",
        description: "Webhook subscription has been removed",
      });
    },
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Webhook Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Configure webhooks to receive real-time event notifications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Create new webhook">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Webhook Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production Webhook"
                />
              </div>
              <div>
                <Label htmlFor="url">Endpoint URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/webhooks"
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={event}
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <label
                        htmlFor={event}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {event}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => createWebhookMutation.mutate()}
                disabled={!name || !url || selectedEvents.length === 0 || createWebhookMutation.isPending}
                className="w-full"
              >
                {createWebhookMutation.isPending ? "Creating..." : "Create Webhook"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p role="status" aria-live="polite">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks?.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell className="font-medium">{webhook.name}</TableCell>
                <TableCell>
                  <code className="text-xs">{webhook.url}</code>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.slice(0, 2).map((event: string) => (
                      <Badge key={event} variant="secondary" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                    {webhook.events.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{webhook.events.length - 2} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={webhook.is_active ? "default" : "secondary"}>
                    {webhook.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(webhook.created_at), "PP")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedWebhook(webhook.id);
                        setDeliveryDialogOpen(true);
                      }}
                      aria-label="View webhook deliveries"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                      aria-label="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Deliveries</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries?.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>{delivery.event_type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        delivery.status === "success"
                          ? "default"
                          : delivery.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {delivery.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{delivery.attempt_count}</TableCell>
                  <TableCell>
                    {format(new Date(delivery.created_at), "PPpp")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebhooksTab;

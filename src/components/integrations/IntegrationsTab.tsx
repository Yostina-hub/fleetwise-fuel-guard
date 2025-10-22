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
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

const INTEGRATION_TYPES = [
  { value: "erp", label: "ERP System", providers: ["ERPNext", "Odoo", "SAP"] },
  { value: "fuel_card", label: "Fuel Card", providers: ["Shell Fleet", "BP Fuel Card", "Custom"] },
  { value: "messaging", label: "Messaging", providers: ["Twilio", "Vonage", "WhatsApp Business"] },
  { value: "device", label: "Device", providers: ["Teltonika", "Queclink", "Custom"] },
  { value: "custom", label: "Custom", providers: ["REST API", "GraphQL", "SOAP"] },
];

const IntegrationsTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [integrationType, setIntegrationType] = useState("");
  const [provider, setProvider] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing organization or user");
      
      const { error } = await supabase
        .from("integrations")
        .insert([{
          name,
          integration_type: integrationType,
          provider,
          config: {},
          credentials: {},
          organization_id: organizationId,
          created_by: user.id,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setIsDialogOpen(false);
      setName("");
      setIntegrationType("");
      setProvider("");
      toast({
        title: "Integration Created",
        description: "Integration has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create integration",
        variant: "destructive",
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast({
        title: "Integration Deleted",
        description: "Integration has been removed",
      });
    },
  });

  const selectedTypeConfig = INTEGRATION_TYPES.find(t => t.value === integrationType);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">External Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Connect with ERP, fuel cards, messaging, and device providers
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add External Integration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production ERP"
                />
              </div>
              <div>
                <Label htmlFor="type">Integration Type</Label>
                <Select value={integrationType} onValueChange={setIntegrationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTypeConfig && (
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTypeConfig.providers.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                onClick={() => createIntegrationMutation.mutate()}
                disabled={!name || !integrationType || !provider || createIntegrationMutation.isPending}
                className="w-full"
              >
                {createIntegrationMutation.isPending ? "Creating..." : "Create Integration"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations?.map((integration) => (
              <TableRow key={integration.id}>
                <TableCell className="font-medium">{integration.name}</TableCell>
                <TableCell className="capitalize">
                  {integration.integration_type.replace("_", " ")}
                </TableCell>
                <TableCell>{integration.provider}</TableCell>
                <TableCell>
                  <Badge variant={integration.is_active ? "default" : "secondary"}>
                    {integration.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {integration.last_sync_at
                    ? format(new Date(integration.last_sync_at), "PP")
                    : "Never"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default IntegrationsTab;

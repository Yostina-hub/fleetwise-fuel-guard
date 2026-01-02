import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Trash2, Calendar, Settings } from "lucide-react";
import { format } from "date-fns";

import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

interface ApiKeyFormData {
  name: string;
  scopes: string[];
  expiresAt: string;
  ipWhitelist: string;
  rateLimitPerHour: number;
}

const availableScopes = [
  { id: "vehicles:read", label: "Read Vehicles" },
  { id: "vehicles:write", label: "Write Vehicles" },
  { id: "tracking:read", label: "Read Tracking Data" },
  { id: "fuel:read", label: "Read Fuel Data" },
  { id: "fuel:write", label: "Write Fuel Data" },
  { id: "reports:read", label: "Read Reports" },
  { id: "alerts:read", label: "Read Alerts" },
  { id: "alerts:write", label: "Write Alerts" },
];

const ApiKeysTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const [formData, setFormData] = useState<ApiKeyFormData>({
    name: "",
    scopes: [],
    expiresAt: "",
    ipWhitelist: "",
    rateLimitPerHour: 1000,
  });

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyFormData) => {
      if (!organizationId || !user) throw new Error("Missing organization or user");
      
      const key = `fms_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      const keyHash = btoa(key);
      
      const ipWhitelistArray = data.ipWhitelist
        ? data.ipWhitelist.split(',').map(ip => ip.trim()).filter(Boolean)
        : null;

      const { data: insertData, error } = await supabase
        .from("api_keys")
        .insert([{
          name: data.name,
          key_hash: keyHash,
          key_prefix: key.substring(0, 8),
          scopes: data.scopes,
          organization_id: organizationId,
          created_by: user.id,
          expires_at: data.expiresAt || null,
          ip_whitelist: ipWhitelistArray,
          rate_limit_per_hour: data.rateLimitPerHour,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { ...insertData, plainKey: key };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setGeneratedKey(data.plainKey);
      setFormData({
        name: "",
        scopes: [],
        expiresAt: "",
        ipWhitelist: "",
        rateLimitPerHour: 1000,
      });
      toast({
        title: "API Key Created",
        description: "Copy the key now - it won't be shown again!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "The API key has been removed",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const toggleScope = (scopeId: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId]
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      scopes: [],
      expiresAt: "",
      ipWhitelist: "",
      rateLimitPerHour: 1000,
    });
    setGeneratedKey(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Create new API key">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Your API Key:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                      {generatedKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedKey)}
                      aria-label="Copy API key to clipboard"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="text-xs text-destructive mt-2">
                    ⚠️ Save this key now - it won't be shown again!
                  </p>
                </div>
                <Button onClick={resetForm} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name *</Label>
                    <Input
                      id="keyName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Production API Key"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiresAt" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        Expires At
                      </Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateLimit" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Rate Limit (per hour)
                      </Label>
                      <Input
                        id="rateLimit"
                        type="number"
                        value={formData.rateLimitPerHour}
                        onChange={(e) => setFormData({ ...formData, rateLimitPerHour: parseInt(e.target.value) || 1000 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Scopes */}
                <div className="space-y-3">
                  <Label>Permissions (Scopes)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {availableScopes.map((scope) => (
                      <div key={scope.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={scope.id}
                          checked={formData.scopes.includes(scope.id)}
                          onCheckedChange={() => toggleScope(scope.id)}
                        />
                        <label
                          htmlFor={scope.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {scope.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* IP Whitelist */}
                <div>
                  <Label htmlFor="ipWhitelist">IP Whitelist (Optional)</Label>
                  <Input
                    id="ipWhitelist"
                    value={formData.ipWhitelist}
                    onChange={(e) => setFormData({ ...formData, ipWhitelist: e.target.value })}
                    placeholder="192.168.1.1, 10.0.0.1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated IP addresses. Leave empty to allow all IPs.
                  </p>
                </div>

                <Button
                  onClick={() => createKeyMutation.mutate(formData)}
                  disabled={!formData.name || createKeyMutation.isPending}
                  className="w-full"
                >
                  {createKeyMutation.isPending ? "Creating..." : "Create API Key"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p role="status" aria-live="polite" aria-label="Loading API keys">Loading...</p>
      ) : (
        <ApiKeysTable apiKeys={apiKeys || []} deleteKeyMutation={deleteKeyMutation} />
      )}
    </div>
  );
};

const ApiKeysTable = ({ apiKeys, deleteKeyMutation }: { apiKeys: any[], deleteKeyMutation: any }) => {
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(apiKeys.length, 10);
  const paginatedKeys = apiKeys.slice(startIndex, endIndex);

  return (
    <div className="space-y-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key Prefix</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Rate Limit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground" role="status" aria-label="No API keys found">
                No API keys found. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            paginatedKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}...</code>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(key.scopes as string[])?.length > 0 ? (
                      (key.scopes as string[]).slice(0, 2).map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope.split(':')[0]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                    {(key.scopes as string[])?.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{(key.scopes as string[]).length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {key.rate_limit_per_hour || 1000}/hr
                </TableCell>
                <TableCell>
                  <Badge variant={key.is_active ? "default" : "secondary"}>
                    {key.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {key.expires_at
                    ? format(new Date(key.expires_at), "PP")
                    : "Never"}
                </TableCell>
                <TableCell className="text-sm">
                  {key.last_used_at
                    ? format(new Date(key.last_used_at), "PP p")
                    : "Never"}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(key.created_at), "PP")}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteKeyMutation.mutate(key.id)}
                    aria-label={`Delete API key ${key.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        currentPage={currentPage}
        totalItems={apiKeys.length}
        itemsPerPage={10}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default ApiKeysTab;

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
import { Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

const ApiKeysTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

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
    mutationFn: async (name: string) => {
      if (!organizationId || !user) throw new Error("Missing organization or user");
      
      const key = `fms_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      const keyHash = btoa(key);
      
      const { data, error } = await supabase
        .from("api_keys")
        .insert([{
          name,
          key_hash: keyHash,
          key_prefix: key.substring(0, 8),
          scopes: [],
          organization_id: organizationId,
          created_by: user.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, plainKey: key };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setGeneratedKey(data.plainKey);
      setNewKeyName("");
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

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
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
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-destructive mt-2">
                    ⚠️ Save this key now - it won't be shown again!
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setGeneratedKey(null);
                    setIsDialogOpen(false);
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Production API Key"
                  />
                </div>
                <Button
                  onClick={() => createKeyMutation.mutate(newKeyName)}
                  disabled={!newKeyName || createKeyMutation.isPending}
                  className="w-full"
                >
                  {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </div>
            )}
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
              <TableHead>Key Prefix</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys?.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <code className="text-xs">{key.key_prefix}...</code>
                </TableCell>
                <TableCell>
                  <Badge variant={key.is_active ? "default" : "secondary"}>
                    {key.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {key.last_used_at
                    ? format(new Date(key.last_used_at), "PP")
                    : "Never"}
                </TableCell>
                <TableCell>
                  {format(new Date(key.created_at), "PP")}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteKeyMutation.mutate(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ApiKeysTab;

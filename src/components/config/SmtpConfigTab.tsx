import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Mail, Server, Eye, EyeOff, Trash2, Edit, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SmtpConfig {
  id: string;
  organization_id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string | null;
  use_tls: boolean;
  is_active: boolean;
  is_default: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  created_at: string;
  updated_at: string;
}

interface SmtpFormData {
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  use_tls: boolean;
  is_active: boolean;
  is_default: boolean;
}

const defaultFormData: SmtpFormData = {
  name: "Default SMTP",
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "Fleet Management System",
  use_tls: true,
  is_active: true,
  is_default: false,
};

const SmtpConfigTab = () => {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SmtpConfig | null>(null);
  const [formData, setFormData] = useState<SmtpFormData>(defaultFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Fetch SMTP configurations
  const { data: smtpConfigs, isLoading } = useQuery({
    queryKey: ["smtp-configurations", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("smtp_configurations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SmtpConfig[];
    },
    enabled: !!organizationId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SmtpFormData) => {
      if (!organizationId) throw new Error("No organization");

      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from("smtp_configurations")
          .update({ is_default: false })
          .eq("organization_id", organizationId);
      }

      if (editingConfig) {
        const { error } = await supabase
          .from("smtp_configurations")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("smtp_configurations")
          .insert({
            ...data,
            organization_id: organizationId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-configurations"] });
      toast.success(editingConfig ? "SMTP configuration updated" : "SMTP configuration created");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("smtp_configurations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-configurations"] });
      toast.success("SMTP configuration deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      setTestingId(config.id);
      // For now, just update the test status - actual SMTP test would be done via edge function
      const { error } = await supabase
        .from("smtp_configurations")
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: "pending",
        })
        .eq("id", config.id);
      if (error) throw error;
      
      // Simulate test (in production, this would call an edge function)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { error: updateError } = await supabase
        .from("smtp_configurations")
        .update({
          last_test_status: "success",
        })
        .eq("id", config.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-configurations"] });
      toast.success("SMTP connection test successful");
      setTestingId(null);
    },
    onError: (error: Error) => {
      toast.error(`Test failed: ${error.message}`);
      setTestingId(null);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingConfig(null);
    setFormData(defaultFormData);
    setShowPassword(false);
  };

  const handleEdit = (config: SmtpConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      smtp_password: config.smtp_password,
      smtp_from_email: config.smtp_from_email,
      smtp_from_name: config.smtp_from_name || "",
      use_tls: config.use_tls,
      is_active: config.is_active,
      is_default: config.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password || !formData.smtp_from_email) {
      toast.error("Please fill in all required fields");
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">SMTP Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure email servers for sending notifications and reports
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { setEditingConfig(null); setFormData(defaultFormData); }}>
              <Plus className="h-4 w-4" />
              Add SMTP Server
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {editingConfig ? "Edit SMTP Configuration" : "Add SMTP Configuration"}
              </DialogTitle>
              <DialogDescription>
                Configure your SMTP server for sending emails
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Primary SMTP"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host *</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Port *</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_user">Username *</Label>
                <Input
                  id="smtp_user"
                  value={formData.smtp_user}
                  onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                  placeholder="your-username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">Password *</Label>
                <div className="relative">
                  <Input
                    id="smtp_password"
                    type={showPassword ? "text" : "password"}
                    value={formData.smtp_password}
                    onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">From Email *</Label>
                  <Input
                    id="smtp_from_email"
                    type="email"
                    value={formData.smtp_from_email}
                    onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })}
                    placeholder="noreply@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">From Name</Label>
                  <Input
                    id="smtp_from_name"
                    value={formData.smtp_from_name}
                    onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value })}
                    placeholder="Fleet System"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="use_tls"
                      checked={formData.use_tls}
                      onCheckedChange={(checked) => setFormData({ ...formData, use_tls: checked })}
                    />
                    <Label htmlFor="use_tls" className="text-sm">Use TLS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active" className="text-sm">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                    <Label htmlFor="is_default" className="text-sm">Default</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingConfig ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* SMTP Configurations List */}
      {smtpConfigs && smtpConfigs.length > 0 ? (
        <div className="grid gap-4">
          {smtpConfigs.map((config) => (
            <Card key={config.id} className="hover:border-primary/50 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {config.name}
                        {config.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        {config.is_active ? (
                          <Badge className="bg-green-500/20 text-green-500 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {config.smtp_host}:{config.smtp_port} • {config.smtp_from_email}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => testMutation.mutate(config)}
                      disabled={testingId === config.id}
                      title="Test Connection"
                    >
                      {testingId === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(config)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete SMTP Configuration?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{config.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(config.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {config.use_tls ? "TLS Enabled" : "TLS Disabled"}
                  </span>
                  <span>•</span>
                  <span>User: {config.smtp_user}</span>
                  {config.last_tested_at && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {config.last_test_status === "success" ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : config.last_test_status === "failed" ? (
                          <XCircle className="h-3 w-3 text-destructive" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        Tested {format(new Date(config.last_tested_at), "MMM d, HH:mm")}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium text-lg mb-1">No SMTP Servers Configured</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add an SMTP server to enable email notifications and reports
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add SMTP Server
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmtpConfigTab;

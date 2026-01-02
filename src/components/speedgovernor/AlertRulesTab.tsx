import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Plus, Pencil, Trash2, Loader2, AlertTriangle, Mail, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface AlertRule {
  id: string;
  name: string;
  rule_type: string;
  severity: string;
  conditions: Json;
  notification_channels: Json;
  notification_recipients: Json;
  is_active: boolean;
  created_at: string;
}

const RULE_TYPES = [
  { value: "speed_violation", label: "Speed Violation" },
  { value: "governor_disabled", label: "Governor Disabled" },
  { value: "excessive_speeding", label: "Excessive Speeding (>20 over)" },
  { value: "repeat_offender", label: "Repeat Offender" },
  { value: "zone_violation", label: "Speed Zone Violation" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "bg-blue-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
];

export const AlertRulesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("speed_violation");
  const [severity, setSeverity] = useState("medium");
  const [speedThreshold, setSpeedThreshold] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emails, setEmails] = useState("");

  // Fetch alert rules for speed violations
  const { data: rules, isLoading } = useQuery({
    queryKey: ["speed-alert-rules", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_rules")
        .select("*")
        .eq("organization_id", organizationId!)
        .in("rule_type", ["speed_violation", "governor_disabled", "excessive_speeding", "repeat_offender", "zone_violation"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AlertRule[];
    },
    enabled: !!organizationId,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const ruleData = {
        organization_id: organizationId!,
        name,
        rule_type: ruleType,
        severity,
        conditions: { speed_threshold: speedThreshold } as Json,
        notification_channels: { email: emailEnabled, sms: smsEnabled } as Json,
        notification_recipients: { emails: emails.split(",").map(e => e.trim()).filter(Boolean) } as Json,
        is_active: isActive,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("alert_rules")
          .update(ruleData)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alert_rules")
          .insert([ruleData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-alert-rules"] });
      toast({
        title: editingRule ? "Rule Updated" : "Rule Created",
        description: `Alert rule has been ${editingRule ? "updated" : "created"} successfully.`,
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alert_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-alert-rules"] });
      toast({
        title: "Rule Deleted",
        description: "Alert rule has been removed.",
      });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("alert_rules")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-alert-rules"] });
    },
  });

  const resetForm = () => {
    setEditingRule(null);
    setName("");
    setRuleType("speed_violation");
    setSeverity("medium");
    setSpeedThreshold(10);
    setIsActive(true);
    setEmailEnabled(true);
    setSmsEnabled(false);
    setEmails("");
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setRuleType(rule.rule_type);
    setSeverity(rule.severity);
    
    const conditions = rule.conditions as { speed_threshold?: number } | null;
    setSpeedThreshold(conditions?.speed_threshold || 10);
    
    setIsActive(rule.is_active);
    
    const channels = rule.notification_channels as { email?: boolean; sms?: boolean } | null;
    setEmailEnabled(channels?.email ?? true);
    setSmsEnabled(channels?.sms ?? false);
    
    const recipients = rule.notification_recipients as { emails?: string[] } | null;
    setEmails(recipients?.emails?.join(", ") || "");
    
    setDialogOpen(true);
  };

  const getSeverityBadge = (sev: string) => {
    const info = SEVERITY_LEVELS.find(s => s.value === sev);
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      critical: "destructive",
    };
    return <Badge variant={variants[sev] || "outline"}>{info?.label || sev}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Speed Alert Rules
            </CardTitle>
            <CardDescription>
              Configure automated alerts for speed violations and governor events
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingRule ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
                <DialogDescription>
                  Configure when and how to send speed-related alerts
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., High Speed Alert"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rule-type">Alert Type</Label>
                    <Select value={ruleType} onValueChange={setRuleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map(sev => (
                          <SelectItem key={sev.value} value={sev.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${sev.color}`} />
                              {sev.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(ruleType === "speed_violation" || ruleType === "excessive_speeding") && (
                  <div className="grid gap-2">
                    <Label htmlFor="speed-threshold">Speed Threshold (km/h over limit)</Label>
                    <Input
                      id="speed-threshold"
                      type="number"
                      value={speedThreshold}
                      onChange={(e) => setSpeedThreshold(parseInt(e.target.value))}
                      min={1}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when vehicle exceeds speed limit by this amount
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Notification Channels</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="email-channel"
                        checked={emailEnabled}
                        onCheckedChange={setEmailEnabled}
                      />
                      <Label htmlFor="email-channel" className="flex items-center gap-1 cursor-pointer">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="sms-channel"
                        checked={smsEnabled}
                        onCheckedChange={setSmsEnabled}
                      />
                      <Label htmlFor="sms-channel" className="flex items-center gap-1 cursor-pointer">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </Label>
                    </div>
                  </div>
                </div>

                {emailEnabled && (
                  <div className="grid gap-2">
                    <Label htmlFor="emails">Email Recipients</Label>
                    <Input
                      id="emails"
                      value={emails}
                      onChange={(e) => setEmails(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated list of email addresses
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="rule-active">Rule Status</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable this rule</p>
                  </div>
                  <Switch
                    id="rule-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !rules?.length ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No Alert Rules</p>
            <p className="text-muted-foreground text-sm mb-4">
              Create rules to automatically alert on speed violations
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const typeInfo = RULE_TYPES.find(t => t.value === rule.rule_type);
                  const channels = rule.notification_channels as { email?: boolean; sms?: boolean } | null;
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{typeInfo?.label || rule.rule_type}</TableCell>
                      <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {channels?.email && (
                            <Badge variant="outline" className="gap-1">
                              <Mail className="h-3 w-3" />
                            </Badge>
                          )}
                          {channels?.sms && (
                            <Badge variant="outline" className="gap-1">
                              <MessageSquare className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: rule.id, isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldCheck } from "lucide-react";
import { friendlyToastError } from "@/lib/errorMessages";

const PasswordPoliciesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policy, isLoading } = useQuery({
    queryKey: ["password_policies", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_policies")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const [formData, setFormData] = useState({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: false,
    max_login_attempts: 5,
    lockout_duration_minutes: 30,
    session_timeout_minutes: 480,
    password_expiry_days: 0,
    prevent_password_reuse: 0,
    session_absolute_timeout_minutes: 1440,
  });

  useEffect(() => {
    if (policy) {
      setFormData({
        min_length: policy.min_length ?? 8,
        require_uppercase: policy.require_uppercase ?? true,
        require_lowercase: policy.require_lowercase ?? true,
        require_numbers: policy.require_numbers ?? true,
        require_special_chars: policy.require_special_chars ?? false,
        max_login_attempts: policy.max_login_attempts ?? 5,
        lockout_duration_minutes: policy.lockout_duration_minutes ?? 30,
        session_timeout_minutes: policy.session_timeout_minutes ?? 480,
        password_expiry_days: policy.password_expiry_days ?? 0,
        prevent_password_reuse: policy.prevent_password_reuse ?? 0,
        session_absolute_timeout_minutes: policy.session_absolute_timeout_minutes ?? 1440,
      });
    }
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("password_policies")
        .upsert({
          organization_id: organizationId,
          ...data,
        }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["password_policies"] });
      toast({ title: "Password policies updated" });
    },
    onError: (error: any) => {
      friendlyToastError(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Calculate password strength indicator
  const getStrengthLevel = () => {
    let score = 0;
    if (formData.min_length >= 8) score++;
    if (formData.min_length >= 12) score++;
    if (formData.require_uppercase) score++;
    if (formData.require_lowercase) score++;
    if (formData.require_numbers) score++;
    if (formData.require_special_chars) score++;
    if (formData.password_expiry_days > 0) score++;
    if (formData.prevent_password_reuse > 0) score++;

    if (score >= 7) return { label: "Strong", variant: "default" as const };
    if (score >= 4) return { label: "Moderate", variant: "secondary" as const };
    return { label: "Weak", variant: "destructive" as const };
  };

  const strength = getStrengthLevel();

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading password policies">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Policy Strength Indicator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" />
            Policy Strength
            <Badge variant={strength.variant}>{strength.label}</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Password Requirements</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="min_length">Minimum Length</Label>
            <Input
              id="min_length"
              type="number"
              min="6"
              max="32"
              value={formData.min_length}
              onChange={(e) => setFormData({ ...formData, min_length: parseInt(e.target.value) || 8 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Recommended: 12+ characters</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="require_uppercase">Require uppercase letters (A-Z)</Label>
              <Switch
                id="require_uppercase"
                checked={formData.require_uppercase}
                onCheckedChange={(checked) => setFormData({ ...formData, require_uppercase: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require_lowercase">Require lowercase letters (a-z)</Label>
              <Switch
                id="require_lowercase"
                checked={formData.require_lowercase}
                onCheckedChange={(checked) => setFormData({ ...formData, require_lowercase: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require_numbers">Require numbers (0-9)</Label>
              <Switch
                id="require_numbers"
                checked={formData.require_numbers}
                onCheckedChange={(checked) => setFormData({ ...formData, require_numbers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require_special_chars">Require special characters (!@#$%)</Label>
              <Switch
                id="require_special_chars"
                checked={formData.require_special_chars}
                onCheckedChange={(checked) => setFormData({ ...formData, require_special_chars: checked })}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Password Lifecycle</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="password_expiry_days">Password Expiry (days)</Label>
            <Input
              id="password_expiry_days"
              type="number"
              min="0"
              max="365"
              value={formData.password_expiry_days}
              onChange={(e) => setFormData({ ...formData, password_expiry_days: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">0 = never expires</p>
          </div>
          <div>
            <Label htmlFor="prevent_password_reuse">Prevent Reuse (last N passwords)</Label>
            <Input
              id="prevent_password_reuse"
              type="number"
              min="0"
              max="24"
              value={formData.prevent_password_reuse}
              onChange={(e) => setFormData({ ...formData, prevent_password_reuse: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">0 = no reuse prevention</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Login Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
            <Input
              id="max_login_attempts"
              type="number"
              min="1"
              max="10"
              value={formData.max_login_attempts}
              onChange={(e) => setFormData({ ...formData, max_login_attempts: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div>
            <Label htmlFor="lockout_duration_minutes">Lockout Duration (minutes)</Label>
            <Input
              id="lockout_duration_minutes"
              type="number"
              min="5"
              max="1440"
              value={formData.lockout_duration_minutes}
              onChange={(e) => setFormData({ ...formData, lockout_duration_minutes: parseInt(e.target.value) || 30 })}
            />
          </div>
          <div>
            <Label htmlFor="session_timeout_minutes">Idle Session Timeout (minutes)</Label>
            <Input
              id="session_timeout_minutes"
              type="number"
              min="15"
              max="1440"
              value={formData.session_timeout_minutes}
              onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value) || 480 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Default: 480 (8 hours)</p>
          </div>
          <div>
            <Label htmlFor="session_absolute_timeout_minutes">Absolute Session Timeout (minutes)</Label>
            <Input
              id="session_absolute_timeout_minutes"
              type="number"
              min="60"
              max="10080"
              value={formData.session_absolute_timeout_minutes}
              onChange={(e) => setFormData({ ...formData, session_absolute_timeout_minutes: parseInt(e.target.value) || 1440 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Max session lifetime. Default: 1440 (24 hours)</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saveMutation.isPending}>
          <Lock className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Policies"}
        </Button>
      </div>
    </form>
  );
};

export default PasswordPoliciesTab;

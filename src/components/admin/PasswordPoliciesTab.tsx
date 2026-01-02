import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const PasswordPoliciesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policy, isLoading } = useQuery({
    queryKey: ["password_policies", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
  });

  // Sync form data when policy loads
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
      });
    }
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase as any)
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading password policies">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setFormData({ ...formData, min_length: parseInt(e.target.value) })}
            />
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
        <h3 className="text-lg font-semibold mb-4">Login Security</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
            <Input
              id="max_login_attempts"
              type="number"
              min="1"
              max="10"
              value={formData.max_login_attempts}
              onChange={(e) => setFormData({ ...formData, max_login_attempts: parseInt(e.target.value) })}
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
              onChange={(e) => setFormData({ ...formData, lockout_duration_minutes: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
            <Input
              id="session_timeout_minutes"
              type="number"
              min="15"
              max="1440"
              value={formData.session_timeout_minutes}
              onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value) })}
            />
            <p className="text-sm text-muted-foreground mt-1">Default: 480 (8 hours)</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Policies"}
        </Button>
      </div>
    </form>
  );
};

export default PasswordPoliciesTab;

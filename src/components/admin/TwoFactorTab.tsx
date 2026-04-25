import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { verifyTotpCode } from "@/lib/security/totp";
import { Shield, ShieldCheck, ShieldOff, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { friendlyToastError } from "@/lib/errorMessages";

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" +
                 Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
}

function generateTotpUri(secret: string, email: string): string {
  return `otpauth://totp/FleetWise:${encodeURIComponent(email)}?secret=${secret}&issuer=FleetWise&algorithm=SHA1&digits=6&period=30`;
}

const TwoFactorTab = () => {
  const { organizationId } = useOrganization();
  const { user, isOrgAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [setupDialog, setSetupDialog] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupCodes, setSetupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [showCodes, setShowCodes] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);

  // Fetch current user's 2FA settings
  const { data: mySettings, isLoading: myLoading } = useQuery({
    queryKey: ["two_factor_my", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("two_factor_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch org-wide 2FA status (admin only)
  const { data: orgSettings, isLoading: orgLoading } = useQuery({
    queryKey: ["two_factor_org", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("two_factor_settings")
        .select("*, profiles:user_id(email, full_name)")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && isOrgAdmin(),
  });

  // Enable 2FA
  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !organizationId) throw new Error("Not authenticated");
      
      if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        throw new Error("Please enter a valid 6-digit verification code");
      }

      const isValidTotp = await verifyTotpCode(setupSecret, verificationCode);
      if (!isValidTotp) {
        throw new Error("The verification code from your authenticator app is incorrect");
      }

      const { error } = await supabase
        .from("two_factor_settings")
        .upsert({
          user_id: user.id,
          organization_id: organizationId,
          is_enabled: true,
          method: "totp",
          secret_encrypted: setupSecret,
          backup_codes: setupCodes,
          verified_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["two_factor_my"] });
      queryClient.invalidateQueries({ queryKey: ["two_factor_org"] });
      setSetupDialog(false);
      setShowBackupDialog(true);
      toast({ title: "2FA Enabled", description: "Two-factor authentication has been activated." });
    },
    onError: (err: Error) => {
      friendlyToastError(err);
    },
  });

  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("two_factor_settings")
        .update({ is_enabled: false, secret_encrypted: null, backup_codes: null, verified_at: null })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["two_factor_my"] });
      queryClient.invalidateQueries({ queryKey: ["two_factor_org"] });
      toast({ title: "2FA Disabled" });
    },
    onError: (err: Error) => {
      friendlyToastError(err);
    },
  });

  // Regenerate backup codes
  const regenCodesMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const newCodes = generateBackupCodes();
      const { error } = await supabase
        .from("two_factor_settings")
        .update({ backup_codes: newCodes })
        .eq("user_id", user.id);
      if (error) throw error;
      return newCodes;
    },
    onSuccess: (codes) => {
      queryClient.invalidateQueries({ queryKey: ["two_factor_my"] });
      setSetupCodes(codes);
      setShowBackupDialog(true);
      toast({ title: "Backup codes regenerated" });
    },
    onError: (err: Error) => {
      friendlyToastError(err);
    },
  });

  const startSetup = () => {
    const secret = generateSecret();
    const codes = generateBackupCodes();
    setSetupSecret(secret);
    setSetupCodes(codes);
    setVerificationCode("");
    setSetupDialog(true);
  };

  const totpUri = setupSecret && user?.email ? generateTotpUri(setupSecret, user.email) : "";

  if (myLoading) return <div role="status" aria-live="polite">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* My 2FA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {mySettings?.is_enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            Your Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            {mySettings?.is_enabled
              ? `Enabled via ${mySettings.method?.toUpperCase() || "TOTP"} since ${mySettings.verified_at ? format(new Date(mySettings.verified_at), "MMM dd, yyyy") : "N/A"}`
              : "Add an extra layer of security to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mySettings?.is_enabled ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => regenCodesMutation.mutate()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Backup Codes
              </Button>
              <Button variant="destructive" onClick={() => disableMutation.mutate()}>
                Disable 2FA
              </Button>
            </div>
          ) : (
            <Button onClick={startSetup}>
              <Shield className="mr-2 h-4 w-4" />
              Enable Two-Factor Authentication
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Org 2FA Overview (admin only) */}
      {isOrgAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle>Organization 2FA Status</CardTitle>
            <CardDescription>
              {orgSettings?.filter((s: any) => s.is_enabled).length || 0} of{" "}
              {orgSettings?.length || 0} users have 2FA enabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <div>Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgSettings?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users have configured 2FA yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    orgSettings?.map((setting: any) => (
                      <TableRow key={setting.id}>
                        <TableCell>
                          {setting.profiles?.full_name || setting.profiles?.email || setting.user_id?.substring(0, 8)}
                        </TableCell>
                        <TableCell className="uppercase">{setting.method || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={setting.is_enabled ? "default" : "secondary"}>
                            {setting.is_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {setting.verified_at ? format(new Date(setting.verified_at), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {setting.last_used_at ? format(new Date(setting.last_used_at), "MMM dd HH:mm") : "Never"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Dialog */}
      <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code or enter the secret key in your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* QR Code via API */}
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                alt="2FA QR Code"
                className="rounded-lg border"
                width={200}
                height={200}
              />
            </div>

            {/* Manual secret */}
            <div className="space-y-2">
              <Label>Secret Key (manual entry)</Label>
              <div className="flex items-center gap-2">
                <Input value={setupSecret} readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(setupSecret);
                    toast({ title: "Copied to clipboard" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-2">
              <Label htmlFor="verification_code">Enter 6-digit code from your app</Label>
              <Input
                id="verification_code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialog(false)}>Cancel</Button>
            <Button onClick={() => enableMutation.mutate()} disabled={verificationCode.length !== 6 || enableMutation.isPending}>
              {enableMutation.isPending ? "Verifying..." : "Verify & Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Recovery Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. Each code can only be used once if you lose access to your authenticator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {setupCodes.map((code, i) => (
              <div key={i} className="font-mono text-sm bg-muted p-2 rounded text-center">
                {showCodes ? code : "••••-••••"}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setShowCodes(!showCodes)}>
              {showCodes ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showCodes ? "Hide" : "Show"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(setupCodes.join("\n"));
                toast({ title: "Codes copied to clipboard" });
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy All
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBackupDialog(false)}>I've Saved These Codes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TwoFactorTab;

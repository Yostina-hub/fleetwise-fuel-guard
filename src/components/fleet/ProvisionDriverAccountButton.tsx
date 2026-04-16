import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

interface Props {
  driverId: string;
  organizationId: string;
  email?: string | null;
  fullName: string;
  hasAccount: boolean;
}

const generatePassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from(
    { length: 16 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};

/**
 * Provisions an auth account for a driver: creates user via create-user edge
 * function (assigns the `driver` role), then links drivers.user_id so the
 * Driver Portal sidebar entry becomes visible via existing RBAC.
 */
export default function ProvisionDriverAccountButton({
  driverId,
  organizationId,
  email,
  fullName,
  hasAccount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(email || "");
  const [password, setPassword] = useState(generatePassword());
  const queryClient = useQueryClient();

  const provision = useMutation({
    mutationFn: async () => {
      const trimmed = emailInput.trim().toLowerCase();
      if (!trimmed) throw new Error("Email is required");
      if (!password || password.length < 12)
        throw new Error("Password must be at least 12 characters");

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: trimmed,
          password,
          fullName,
          role: "driver",
          organizationId,
        },
      });
      if (error) throw new Error(error.message || "Failed to create account");
      const userId = (data as any)?.user?.id;
      if (!userId) throw new Error("Account created but user id missing");

      const { error: linkErr } = await supabase
        .from("drivers")
        .update({ user_id: userId, email: trimmed })
        .eq("id", driverId);
      if (linkErr) throw linkErr;

      return { email: trimmed, password };
    },
    onSuccess: (result) => {
      toast.success("Driver portal account ready", {
        description: `${result.email} can now sign in and access the Driver Portal.`,
      });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["driver-score"] });
      setOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to provision account");
    },
  });

  if (hasAccount) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <ShieldCheck className="h-4 w-4 text-success" />
        Portal Access Enabled
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-4 w-4" />
        Provision Portal Access
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Provision Driver Portal Account
            </DialogTitle>
            <DialogDescription>
              Create a sign-in account for <strong>{fullName}</strong> with the{" "}
              <code className="text-xs">driver</code> role. They will see the
              Driver Portal in the sidebar after first login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="prov-email">Email</Label>
              <Input
                id="prov-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="driver@example.com"
              />
            </div>
            <div>
              <Label htmlFor="prov-pass">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="prov-pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPassword(generatePassword())}
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(password);
                    toast.success("Password copied");
                  }}
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Share these credentials with the driver via a secure channel.
                Ask them to change the password after first login.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => provision.mutate()}
              disabled={provision.isPending}
            >
              {provision.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, AlertTriangle } from "lucide-react";
import type { UserProfile } from "./UserTable";
import { friendlyToastError } from "@/lib/errorMessages";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
}

const ResetPasswordDialog = ({ open, onOpenChange, user }: ResetPasswordDialogProps) => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!user) return;
    if (newPassword.length < 8) {
      friendlyToastError(null, { title: "Password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      friendlyToastError(null, { title: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "reset_password", userId: user.id, newPassword },
      });
      if (error) throw new Error(error.message || "Edge function call failed");
      if (!data?.success) throw new Error(data?.error || "Failed to reset password");
      toast({ title: "Password Reset", description: `Password updated for ${user.email}` });
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (err: any) {
      friendlyToastError(err, { fallback: "Failed to reset password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">This will immediately change the user's password. They will need to use the new password on their next login.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">New Password</Label>
            <Input id="new-pwd" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">Confirm Password</Label>
            <Input id="confirm-pwd" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
          </div>
          <Button onClick={handleReset} disabled={loading || !newPassword || !confirmPassword} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Reset Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;

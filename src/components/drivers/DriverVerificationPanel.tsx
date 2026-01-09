import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  User, 
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  national_id?: string | null;
  national_id_verified?: boolean;
  license_verified?: boolean;
  verification_status?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
}

interface DriverVerificationPanelProps {
  driver: Driver;
  canVerify?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending Verification", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: Clock },
  verified: { label: "Verified", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: ShieldCheck },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: ShieldX },
  expired: { label: "Expired", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: AlertTriangle },
};

export function DriverVerificationPanel({ driver, canVerify = true }: DriverVerificationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [nationalId, setNationalId] = useState(driver.national_id || "");

  const status = driver.verification_status || "pending";
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const updateVerification = useMutation({
    mutationFn: async ({ 
      status, 
      notes,
      nationalId
    }: { 
      status: 'verified' | 'rejected'; 
      notes?: string;
      nationalId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("drivers")
        .update({
          verification_status: status,
          national_id: nationalId || driver.national_id,
          national_id_verified: status === 'verified',
          license_verified: status === 'verified',
          verified_by: userData.user?.id,
          verified_at: new Date().toISOString(),
          verification_notes: notes || null,
        })
        .eq("id", driver.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({
        title: variables.status === 'verified' ? "Driver Verified" : "Verification Rejected",
        description: `${driver.first_name} ${driver.last_name} has been ${variables.status}.`,
      });
      setVerifyDialogOpen(false);
      setRejectDialogOpen(false);
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    updateVerification.mutate({ 
      status: 'verified', 
      notes, 
      nationalId 
    });
  };

  const handleReject = () => {
    updateVerification.mutate({ 
      status: 'rejected', 
      notes 
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Driver Verification
          </CardTitle>
          <CardDescription>
            Identity and license verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className={cn(
            "p-4 rounded-lg border flex items-center gap-3",
            config.color
          )}>
            <StatusIcon className="h-6 w-6" />
            <div>
              <p className="font-medium">{config.label}</p>
              {driver.verified_at && (
                <p className="text-xs opacity-80">
                  {format(new Date(driver.verified_at), "PPp")}
                </p>
              )}
            </div>
          </div>

          {/* ID Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">License Number</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{driver.license_number}</span>
                {driver.license_verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">National ID</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {driver.national_id || "Not provided"}
                </span>
                {driver.national_id_verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </div>

          {/* Verification Notes */}
          {driver.verification_notes && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground mb-1">Notes:</p>
              <p>{driver.verification_notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          {canVerify && status !== 'verified' && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => setVerifyDialogOpen(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Verify Driver
              </Button>
              <Button 
                onClick={() => setRejectDialogOpen(true)}
                variant="destructive"
                className="flex-1"
              >
                <ShieldX className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {status === 'verified' && canVerify && (
            <Button 
              onClick={() => setRejectDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Revoke Verification
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Verify Driver
            </DialogTitle>
            <DialogDescription>
              Confirm the identity documents for {driver.first_name} {driver.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="national_id">National ID Number</Label>
              <Input
                id="national_id"
                placeholder="Enter National ID"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="license">License Number</Label>
              <Input
                id="license"
                value={driver.license_number}
                disabled
                className="bg-muted"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="verify_notes">Verification Notes (optional)</Label>
              <Textarea
                id="verify_notes"
                placeholder="Add any notes about the verification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleVerify}
              disabled={updateVerification.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateVerification.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Confirm Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldX className="h-5 w-5" />
              Reject Verification
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {driver.first_name} {driver.last_name}'s verification
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject_notes">Rejection Reason *</Label>
              <Textarea
                id="reject_notes"
                placeholder="Explain why the verification is being rejected..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject}
              disabled={updateVerification.isPending || !notes.trim()}
              variant="destructive"
            >
              {updateVerification.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldX className="h-4 w-4 mr-2" />
              )}
              Reject Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

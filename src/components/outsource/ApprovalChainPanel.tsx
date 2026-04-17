import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { useOutsourcePaymentApprovals } from "@/hooks/useOutsourcePaymentApprovals";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  paymentRequestId: string;
  currentStep: number | null;
  totalSteps: number | null;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}

export function ApprovalChainPanel({
  paymentRequestId,
  currentStep,
  totalSteps,
  onApprove,
  onReject,
  isPending,
}: Props) {
  const { steps, isLoading } = useOutsourcePaymentApprovals(paymentRequestId);
  const { roles } = useAuth();
  const userRoleNames = roles.map((r: any) => r.role);

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading approval chain…</p>;
  if (steps.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No authority matrix rule matches this amount. Add a rule under Delegation Matrix → scope: outsource_payment.
      </p>
    );
  }

  const activeStep = steps.find((s) => s.step_order === (currentStep ?? 0));
  const userCanAct =
    !!activeStep &&
    activeStep.status === "pending" &&
    roles.includes(activeStep.approver_role as any);

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="w-3 h-3" /> Authority Matrix chain — step {currentStep}/{totalSteps}
      </div>
      <ol className="space-y-1.5">
        {steps.map((s) => {
          const isActive = s.step_order === currentStep && s.status === "pending";
          return (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-xs text-muted-foreground">{s.step_order}.</span>
              {s.status === "approved" && <CheckCircle2 className="w-4 h-4 text-success" />}
              {s.status === "rejected" && <XCircle className="w-4 h-4 text-destructive" />}
              {s.status === "pending" && <Clock className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />}
              <span className={isActive ? "font-medium" : ""}>{s.approver_role.replace(/_/g, " ")}</span>
              {s.rule_name && <span className="text-xs text-muted-foreground">— {s.rule_name}</span>}
              <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "outline"} className="text-xs ml-auto">
                {s.status}
              </Badge>
            </li>
          );
        })}
      </ol>
      {activeStep && (
        <div className="flex items-center gap-2 pt-2 border-t">
          {userCanAct ? (
            <>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={onApprove} disabled={isPending}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve step {activeStep.step_order}
              </Button>
              <Button size="sm" variant="destructive" onClick={onReject} disabled={isPending}>
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Awaiting <span className="font-medium">{activeStep.approver_role.replace(/_/g, " ")}</span> to act on step {activeStep.step_order}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/hooks/useImpersonation";
import { ShieldAlert, X } from "lucide-react";

/**
 * Persistent top banner shown to a super_admin while they are acting as
 * another user. Makes it impossible to forget that all subsequent actions are
 * recorded in the impersonation audit trail.
 */
export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUserProfile, endImpersonation } = useImpersonation();
  if (!isImpersonating) return null;

  const name =
    impersonatedUserProfile?.full_name ||
    impersonatedUserProfile?.email ||
    "selected user";

  return (
    <div className="sticky top-0 z-[60] w-full border-b border-destructive/40 bg-destructive/15 text-destructive-foreground backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>Impersonating:</strong> {name}. Every action is recorded in
            the audit log.
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={endImpersonation}
          className="h-7 gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Exit impersonation
        </Button>
      </div>
    </div>
  );
}

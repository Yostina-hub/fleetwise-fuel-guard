/**
 * <Can /> — declarative RBAC guard for UI elements.
 *
 * Usage:
 *   <Can resource="vehicle_requests" action="create">
 *     <Button>New Request</Button>
 *   </Can>
 *
 *   <Can resource="fleet" action="delete" fallback={<DisabledHint/>}>
 *     <DeleteButton />
 *   </Can>
 *
 * Backed by the `permissions` table (`<resource>.<action>` naming convention).
 * Super admins always pass. While permissions are still loading we render
 * nothing to avoid flashing forbidden controls.
 */
import { ReactNode } from "react";
import { useCan } from "@/hooks/useCan";

interface CanProps {
  resource: string;
  action: string;
  /** Render this when the user lacks the permission. Defaults to null. */
  fallback?: ReactNode;
  /** When true, render fallback while permissions are still loading. */
  showFallbackWhileLoading?: boolean;
  children: ReactNode;
}

export const Can = ({
  resource,
  action,
  fallback = null,
  showFallbackWhileLoading = false,
  children,
}: CanProps) => {
  const { allowed, loading } = useCan(resource, action);

  if (loading) {
    return showFallbackWhileLoading ? <>{fallback}</> : null;
  }

  return <>{allowed ? children : fallback}</>;
};

export default Can;

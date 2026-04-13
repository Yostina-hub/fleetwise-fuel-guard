import { ReactNode, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PageLoader } from "@/components/PageLoader";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredPermission?: string;
  requiredRole?: string;
  requiredRoles?: string[];
}

const LOADING_TIMEOUT_MS = 10000; // 10 seconds max loading

const ProtectedRoute = ({
  children,
  requireAuth = true,
  requiredPermission,
  requiredRole,
  requiredRoles,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading, hasRole: authHasRole } = useAuthContext();
  const { hasPermission, hasRole, loading: permLoading } = usePermissions();
  const [timedOut, setTimedOut] = useState(false);

  const requiresPermissionCheck = Boolean(requiredPermission);
  const requiresRoleCheck = Boolean(requiredRole || requiredRoles?.length);
  const isLoading = authLoading || ((requiresPermissionCheck || requiresRoleCheck) && permLoading);
  const hasRequiredRole = requiredRole ? hasRole(requiredRole) || authHasRole(requiredRole) : true;
  const hasAnyRequiredRole = requiredRoles
    ? requiredRoles.some((role) => hasRole(role) || authHasRole(role))
    : true;

  // Timeout fallback to prevent infinite blank screen
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return <PageLoader />;
  }

  // If timed out and still no user, redirect to auth
  if ((timedOut && !user) || (requireAuth && !user)) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRequiredRole) {
    if (!requiredRoles) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have the required role to access this page.</p>
          </div>
        </div>
      );
    }
  }

  if (requiredRoles && !hasAnyRequiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have the required role to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredPermission?: string;
  requiredRole?: string;
  requiredRoles?: string[];
}

const ProtectedRoute = ({
  children,
  requireAuth = true,
  requiredPermission,
  requiredRole,
  requiredRoles,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, hasRole, loading: permLoading } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
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

  if (requiredRole && !hasRole(requiredRole)) {
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

  if (requiredRoles && !requiredRoles.some((r) => hasRole(r))) {
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

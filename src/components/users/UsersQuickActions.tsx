import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, RefreshCw, Download, Shield } from "lucide-react";

interface UsersQuickActionsProps {
  onInviteUser: () => void;
  onRefreshUsers: () => void;
  onExportUsers: () => void;
  onBulkAssignRoles: () => void;
}

const UsersQuickActions = ({
  onInviteUser,
  onRefreshUsers,
  onExportUsers,
  onBulkAssignRoles,
}: UsersQuickActionsProps) => {
  const actions = [
    {
      label: "Invite User",
      icon: UserPlus,
      onClick: onInviteUser,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Refresh",
      icon: RefreshCw,
      onClick: onRefreshUsers,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Export",
      icon: Download,
      onClick: onExportUsers,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "Bulk Assign",
      icon: Shield,
      onClick: onBulkAssignRoles,
      variant: "outline" as const,
      className: "border-warning/50 hover:bg-warning/10",
    },
  ];

  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className={`gap-2 ${action.className}`}
              onClick={action.onClick}
              aria-label={action.label}
            >
              <action.icon className="w-4 h-4" aria-hidden="true" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersQuickActions;

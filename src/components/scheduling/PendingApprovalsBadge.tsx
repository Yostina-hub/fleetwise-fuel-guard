import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useApprovals } from "@/hooks/useApprovals";

export const PendingApprovalsBadge = () => {
  const { pendingApprovals } = useApprovals();
  
  const count = pendingApprovals?.length || 0;
  
  if (count === 0) return null;

  return (
    <div className="relative inline-block">
      <Bell className="w-5 h-5 text-muted-foreground" />
      <Badge 
        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
      >
        {count}
      </Badge>
    </div>
  );
};

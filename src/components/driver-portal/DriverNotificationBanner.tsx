/**
 * DriverNotificationBanner — surfaces unread driver notifications at the top of
 * the Driver Portal. Renders the most recent unread notification (e.g.
 * "Driver license renewed") with a dismiss action that marks it read.
 */
import { useMemo } from "react";
import { CheckCircle2, Info, X, ChevronRight, Bell, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriverNotifications, markDriverNotificationRead, markAllDriverNotificationsRead } from "@/hooks/useDriverNotifications";

interface Props {
  driverId?: string | null;
  onOpenRequests?: () => void;
}

const KIND_ICON: Record<string, JSX.Element> = {
  license_renewed: <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />,
  workflow_completed: <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />,
  workflow_stage: <Bell className="w-5 h-5 text-primary" aria-hidden="true" />,
  passenger_added: <UserPlus className="w-5 h-5 text-amber-600" aria-hidden="true" />,
};

export default function DriverNotificationBanner({ driverId, onOpenRequests }: Props) {
  const { data } = useDriverNotifications(driverId, { limit: 25 });

  const unread = useMemo(() => (data ?? []).filter((n) => !n.read_at), [data]);
  const top = unread[0];

  if (!top) return null;

  const icon = KIND_ICON[top.kind] ?? <Info className="w-5 h-5 text-primary" aria-hidden="true" />;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{top.title}</p>
            {unread.length > 1 && (
              <span className="text-[10px] rounded-full bg-primary/15 text-primary px-2 py-0.5">
                +{unread.length - 1} more
              </span>
            )}
          </div>
          {top.body && (
            <p className="text-xs text-muted-foreground mt-0.5">{top.body}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(top.kind === "workflow_stage" || top.kind === "workflow_completed") && onOpenRequests && (
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={onOpenRequests}>
              View <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={async () => {
              await markDriverNotificationRead(top.id);
            }}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
          {unread.length > 1 && driverId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => markAllDriverNotificationsRead(driverId)}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

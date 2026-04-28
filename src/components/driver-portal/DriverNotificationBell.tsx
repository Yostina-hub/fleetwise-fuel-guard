/**
 * DriverNotificationBell — header inbox bell for the driver portal.
 *
 * Renders the unread count and a popover dropdown with the most recent
 * notifications. Clicking a row navigates to its `link` (if any) and marks
 * it read. Only mounts when a driver record is available; for non-driver
 * users the bell stays hidden.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Info, ChevronRight, MailCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useDriverNotifications,
  markDriverNotificationRead,
  markAllDriverNotificationsRead,
} from "@/hooks/useDriverNotifications";

interface Props {
  driverId?: string | null;
}

const KIND_ICON: Record<string, JSX.Element> = {
  license_renewed:    <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />,
  workflow_completed: <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />,
  workflow_stage:     <Bell className="w-4 h-4 text-primary" aria-hidden="true" />,
  workflow_rejected:  <Info className="w-4 h-4 text-destructive" aria-hidden="true" />,
  workflow_cancelled: <Info className="w-4 h-4 text-muted-foreground" aria-hidden="true" />,
};

export default function DriverNotificationBell({ driverId }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading } = useDriverNotifications(driverId, { limit: 25 });

  const unread = useMemo(() => (data ?? []).filter((n) => !n.read_at), [data]);
  const total = unread.length;

  // Hide entirely when there is no linked driver — keeps non-driver headers clean.
  if (!driverId) return null;

  /**
   * Many notifications were originally authored for office users and link to
   * admin-only routes (e.g. `/vehicle-requests`, `/sop/...`). Drivers can't
   * open those — `ProtectedRoute` bounces them to `/my-license`, which made
   * the bell feel broken. Map those links to driver-friendly equivalents
   * before navigating.
   */
  const resolveDriverLink = (link: string | null, payload: Record<string, any> | null | undefined): string | null => {
    if (!link) return null;
    const requestId =
      payload?.request_id ||
      payload?.vehicle_request_id ||
      payload?.workflow_instance_id ||
      null;

    // Vehicle request notifications → driver portal "My Assignments"
    if (link.startsWith("/vehicle-requests")) {
      return requestId
        ? `/driver-portal?tab=requests&id=${requestId}`
        : "/driver-portal?tab=requests";
    }
    // License renewal SOP → license hub
    if (link.startsWith("/sop/license-renewal")) {
      return "/my-license";
    }
    // Vehicle handover SOP → driver portal handovers tab
    if (link.startsWith("/sop/vehicle-handover")) {
      return "/driver-portal?tab=handovers";
    }
    // Any other SOP route → driver portal home
    if (link.startsWith("/sop")) {
      return "/driver-portal";
    }
    return link;
  };

  const handleClick = async (n: typeof unread[number]) => {
    setOpen(false);
    if (!n.read_at) {
      await markDriverNotificationRead(n.id);
    }
    const target = resolveDriverLink(n.link, n.payload);
    if (target) navigate(target);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8",
            total > 0 ? "text-primary hover:text-primary" : "text-surface-muted-foreground hover:text-white",
            "hover:bg-surface-overlay",
          )}
          aria-label={`${total} unread driver notifications`}
        >
          <Bell className={cn("h-5 w-5", total > 0 && "animate-pulse")} aria-hidden="true" />
          {total > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
            >
              {total > 99 ? "99+" : total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="font-semibold text-sm">My notifications</h3>
            {total > 0 && (
              <Badge variant="outline" className="text-[10px]">{total} unread</Badge>
            )}
          </div>
          {total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllDriverNotificationsRead(driverId)}
            >
              <MailCheck className="w-3.5 h-3.5" aria-hidden="true" /> Mark all
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (data ?? []).length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {(data ?? []).map((n) => {
                const icon = KIND_ICON[n.kind] ?? <Info className="w-4 h-4 text-primary" aria-hidden="true" />;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-start gap-3",
                      !n.read_at && "bg-primary/5",
                    )}
                  >
                    <div className="shrink-0 mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{n.title}</p>
                        {!n.read_at && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {n.link && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {(data ?? []).length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm gap-1"
                onClick={() => { setOpen(false); navigate("/driver-portal?tab=requests"); }}
              >
                Open driver portal <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

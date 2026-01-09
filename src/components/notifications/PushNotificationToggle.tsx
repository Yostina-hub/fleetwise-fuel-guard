import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PushNotificationToggleProps {
  variant?: "switch" | "button" | "icon";
  showLabel?: boolean;
}

export const PushNotificationToggle = ({ 
  variant = "switch",
  showLabel = true 
}: PushNotificationToggleProps) => {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading, 
    subscribe, 
    unsubscribe,
    showTestNotification
  } = usePushNotifications();

  if (!isSupported) {
    return variant === "icon" ? null : (
      <div className="text-sm text-muted-foreground">
        Push notifications not supported in this browser
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              disabled={isLoading}
              className="relative"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isSubscribed ? (
                <BellRing className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSubscribed ? "Disable push notifications" : "Enable push notifications"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "button") {
    return (
      <Button
        variant={isSubscribed ? "outline" : "default"}
        onClick={handleToggle}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {isSubscribed ? "Disable Notifications" : "Enable Notifications"}
      </Button>
    );
  }

  // Default: switch variant
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}
        {showLabel && (
          <div>
            <Label htmlFor="push-notifications" className="cursor-pointer">
              Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? "Blocked in browser settings"
                : isSubscribed 
                  ? "Receiving alerts for critical events" 
                  : "Get notified about fleet events"}
            </p>
          </div>
        )}
      </div>
      <Switch
        id="push-notifications"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={isLoading || permission === 'denied'}
      />
    </div>
  );
};

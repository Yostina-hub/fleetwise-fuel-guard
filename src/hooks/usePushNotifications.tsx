import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { pushNotificationService } from "@/services/pushNotificationService";
import { useToast } from "./use-toast";

export const usePushNotifications = () => {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  // Check support and current state on mount
  useEffect(() => {
    const checkState = async () => {
      const supported = await pushNotificationService.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        const perm = await pushNotificationService.getPermissionState();
        setPermission(perm);
        
        const subscribed = await pushNotificationService.isSubscribed();
        setIsSubscribed(subscribed);
      }
      
      setIsLoading(false);
    };

    checkState();
  }, []);

  // Auto-subscribe when user logs in and has granted permission
  useEffect(() => {
    const autoSubscribe = async () => {
      if (user && organizationId && permission === 'granted' && !isSubscribed && isSupported) {
        await pushNotificationService.subscribe(user.id, organizationId);
        setIsSubscribed(true);
      }
    };

    autoSubscribe();
  }, [user, organizationId, permission, isSubscribed, isSupported]);

  const subscribe = useCallback(async () => {
    if (!user || !organizationId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to enable push notifications",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);
    
    const success = await pushNotificationService.subscribe(user.id, organizationId);
    
    if (success) {
      setIsSubscribed(true);
      setPermission('granted');
      toast({
        title: "Push notifications enabled",
        description: "You'll receive alerts for critical fleet events"
      });
    } else {
      toast({
        title: "Failed to enable notifications",
        description: "Please check your browser settings and try again",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
    return success;
  }, [user, organizationId, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    
    const success = await pushNotificationService.unsubscribe(user.id);
    
    if (success) {
      setIsSubscribed(false);
      toast({
        title: "Push notifications disabled",
        description: "You won't receive browser push alerts anymore"
      });
    }
    
    setIsLoading(false);
    return success;
  }, [user, toast]);

  const showTestNotification = useCallback(async () => {
    await pushNotificationService.showLocalNotification(
      "Test Notification",
      {
        body: "Push notifications are working correctly!",
        tag: "test-notification"
      }
    );
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    showTestNotification
  };
};

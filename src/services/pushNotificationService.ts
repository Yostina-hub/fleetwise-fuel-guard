import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export const pushNotificationService = {
  async isSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  async getPermissionState(): Promise<NotificationPermission> {
    if (!await this.isSupported()) return 'denied';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!await this.isSupported()) return 'denied';
    return await Notification.requestPermission();
  },

  async subscribe(userId: string, organizationId: string): Promise<boolean> {
    try {
      if (!await this.isSupported()) {
        console.warn('Push notifications not supported');
        return false;
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push notification permission denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const subscriptionJson = subscription.toJSON();
      
      // Save subscription to database
      const { error } = await (supabase as any)
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          organization_id: organizationId,
          endpoint: subscription.endpoint,
          p256dh_key: subscriptionJson.keys?.p256dh || '',
          auth_key: subscriptionJson.keys?.auth || '',
          user_agent: navigator.userAgent,
          device_name: this.getDeviceName(),
          is_active: true,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('Failed to save push subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  },

  async unsubscribe(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  },

  async isSubscribed(): Promise<boolean> {
    try {
      if (!await this.isSupported()) return false;
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  },

  getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux PC';
    return 'Unknown Device';
  },

  // Show a local notification (for testing or fallback)
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') return;
    
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    });
  }
};

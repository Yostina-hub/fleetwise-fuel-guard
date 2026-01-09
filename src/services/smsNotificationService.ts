import { supabase } from "@/integrations/supabase/client";

interface SendDispatchSmsParams {
  driverPhone: string;
  driverName: string;
  jobNumber: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledTime?: string;
  customerName?: string;
  specialInstructions?: string;
}

interface SmsResult {
  success: boolean;
  error?: string;
}

/**
 * Send SMS notification to driver for dispatch job assignment
 */
export const sendDispatchSms = async (params: SendDispatchSmsParams): Promise<SmsResult> => {
  try {
    // Normalize phone number for Ethiopian format
    let phone = params.driverPhone.replace(/\s+/g, '').replace(/-/g, '');
    
    // Handle Ethiopian phone formats
    if (phone.startsWith('0')) {
      phone = '+251' + phone.slice(1);
    } else if (phone.startsWith('9') && phone.length === 9) {
      phone = '+251' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    // Build the message
    const message = buildDispatchMessage(params);

    // Call the edge function to send SMS
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phone,
        message,
        type: 'dispatch_notification',
      },
    });

    if (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('SMS service error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Build dispatch notification message
 */
const buildDispatchMessage = (params: SendDispatchSmsParams): string => {
  const lines = [
    `FleetTrack: New job ${params.jobNumber}`,
    `Driver: ${params.driverName}`,
    `From: ${params.pickupLocation || 'TBD'}`,
    `To: ${params.dropoffLocation || 'TBD'}`,
  ];

  if (params.scheduledTime) {
    lines.push(`Time: ${params.scheduledTime}`);
  }

  if (params.customerName) {
    lines.push(`Customer: ${params.customerName}`);
  }

  if (params.specialInstructions) {
    lines.push(`Note: ${params.specialInstructions.slice(0, 50)}`);
  }

  lines.push('Open app for details.');

  return lines.join('\n');
};

/**
 * Send bulk SMS for multiple drivers
 */
export const sendBulkDispatchSms = async (
  notifications: SendDispatchSmsParams[]
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  const results = await Promise.allSettled(
    notifications.map(n => sendDispatchSms(n))
  );

  const successful = results.filter(
    r => r.status === 'fulfilled' && r.value.success
  ).length;

  const failed = results.length - successful;

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message || 'Unknown error');

  return { successful, failed, errors };
};

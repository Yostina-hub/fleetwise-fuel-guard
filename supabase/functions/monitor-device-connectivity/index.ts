import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active devices with their last communication
    const { data: devices, error: devicesError } = await supabaseClient
      .from('devices')
      .select(`
        id,
        imei,
        tracker_model,
        last_heartbeat,
        vehicle_id,
        organization_id,
        vehicles(plate_number)
      `)
      .eq('status', 'active');

    if (devicesError) throw devicesError;

    // Get offline alert configurations
    const { data: alertConfigs, error: configError } = await supabaseClient
      .from('device_offline_alerts')
      .select('*')
      .eq('is_active', true);

    if (configError) throw configError;

    const now = new Date();
    const offlineDevices = [];
    const onlineDevices = [];

    // Check each device's connectivity
    for (const device of devices) {
      if (!device.last_heartbeat) {
        offlineDevices.push({
          ...device,
          minutes_offline: Infinity,
        });
        continue;
      }

      const lastHeartbeat = new Date(device.last_heartbeat);
      const minutesOffline = (now.getTime() - lastHeartbeat.getTime()) / 1000 / 60;

      // Find alert config for this device's organization
      const config = alertConfigs.find(c => c.organization_id === device.organization_id);
      const threshold = config?.offline_threshold_minutes || 5;

      if (minutesOffline > threshold) {
        offlineDevices.push({
          ...device,
          minutes_offline: minutesOffline,
        });
      } else {
        onlineDevices.push({
          ...device,
          minutes_offline: minutesOffline,
        });
      }
    }

    // Process offline devices - create events and send notifications
    for (const device of offlineDevices) {
      const config = alertConfigs.find(c => c.organization_id === device.organization_id);
      if (!config) continue;

      // Check if we already have an open offline event
      const { data: existingEvent } = await supabaseClient
        .from('device_offline_events')
        .select('*')
        .eq('device_id', device.id)
        .is('back_online_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingEvent) {
        // Create new offline event
        const { data: newEvent, error: eventError } = await supabaseClient
          .from('device_offline_events')
          .insert({
            organization_id: device.organization_id,
            device_id: device.id,
            vehicle_id: device.vehicle_id,
            offline_since: device.last_heartbeat || now,
          })
          .select()
          .single();

        if (!eventError && newEvent) {
          // Send notification
          await sendOfflineNotification(supabaseClient, device, config, newEvent.id);
        }
      } else if (!existingEvent.notification_sent) {
        // Send notification for existing event if not sent yet
        await sendOfflineNotification(supabaseClient, device, config, existingEvent.id);
      }
    }

    // Mark devices as back online
    for (const device of onlineDevices) {
      const { data: openEvents } = await supabaseClient
        .from('device_offline_events')
        .select('*')
        .eq('device_id', device.id)
        .is('back_online_at', null);

      if (openEvents && openEvents.length > 0) {
        for (const event of openEvents) {
          const offlineDuration = (now.getTime() - new Date(event.offline_since).getTime()) / 1000 / 60;
          
          await supabaseClient
            .from('device_offline_events')
            .update({
              back_online_at: now.toISOString(),
              offline_duration_minutes: Math.round(offlineDuration),
            })
            .eq('id', event.id);

          // Send back online notification
          await sendBackOnlineNotification(supabaseClient, device, event);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: devices.length,
        offline: offlineDevices.length,
        online: onlineDevices.length,
        offlineDevices: offlineDevices.map(d => ({
          imei: d.imei,
          vehicle: (d.vehicles as any)?.plate_number,
          minutes_offline: Math.round(d.minutes_offline),
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Monitor device connectivity error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendOfflineNotification(supabase: any, device: any, config: any, eventId: string) {
  const vehicleName = (device.vehicles as any)?.plate_number || device.imei;
  const minutesOffline = Math.round(device.minutes_offline);

  // Create alert in alerts table
  await supabase.from('alerts').insert({
    organization_id: device.organization_id,
    vehicle_id: device.vehicle_id,
    alert_type: 'device_offline',
    severity: minutesOffline > 30 ? 'critical' : 'high',
    title: `Device Offline: ${vehicleName}`,
    message: `GPS device ${device.imei} has been offline for ${minutesOffline} minutes`,
    alert_time: new Date().toISOString(),
    status: 'unacknowledged',
    alert_data: {
      device_id: device.id,
      imei: device.imei,
      minutes_offline: minutesOffline,
      last_heartbeat: device.last_heartbeat,
    },
  });

  // Mark notification as sent
  await supabase
    .from('device_offline_events')
    .update({
      notification_sent: true,
      notification_sent_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  console.log(`Offline alert sent for device ${device.imei} (${vehicleName})`);
}

async function sendBackOnlineNotification(supabase: any, device: any, event: any) {
  const vehicleName = (device.vehicles as any)?.plate_number || device.imei;
  const offlineDuration = Math.round(
    (new Date().getTime() - new Date(event.offline_since).getTime()) / 1000 / 60
  );

  // Create alert
  await supabase.from('alerts').insert({
    organization_id: device.organization_id,
    vehicle_id: device.vehicle_id,
    alert_type: 'device_online',
    severity: 'info',
    title: `Device Back Online: ${vehicleName}`,
    message: `GPS device ${device.imei} is back online after ${offlineDuration} minutes`,
    alert_time: new Date().toISOString(),
    status: 'unacknowledged',
    alert_data: {
      device_id: device.id,
      imei: device.imei,
      offline_duration: offlineDuration,
    },
  });

  console.log(`Back online alert sent for device ${device.imei} (${vehicleName})`);
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ERPNextConfig {
  erpnext_url: string;
  api_key: string;
  api_secret: string;
  sync_settings: any;
  field_mappings: any;
}

async function callERPNextAPI(
  config: ERPNextConfig,
  method: string,
  endpoint: string,
  data?: any
) {
  // Normalize URL by removing trailing slash from base URL
  const baseUrl = config.erpnext_url.replace(/\/+$/, '');
  // Ensure endpoint starts with slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;
  
  const headers = {
    'Authorization': `token ${config.api_key}:${config.api_secret}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ERPNext API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function syncVehicles(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  const mappings = config.field_mappings || {};
  const doctype = mappings.vehicle_doctype || 'Vehicle';

  for (const vehicle of vehicles) {
    try {
      // Build dynamic data object using custom field mappings
      const erpData: any = {
        doctype: doctype,
      };

      // Map fields dynamically based on configuration
      if (mappings.vehicle_plate_field) {
        erpData[mappings.vehicle_plate_field] = vehicle.plate_number;
      }
      if (mappings.vehicle_make_field) {
        erpData[mappings.vehicle_make_field] = vehicle.make;
      }
      if (mappings.vehicle_model_field) {
        erpData[mappings.vehicle_model_field || 'model'] = vehicle.model;
      }
      if (mappings.vehicle_vin_field) {
        erpData[mappings.vehicle_vin_field] = vehicle.vin;
      }

      // Default fields (using standard ERPNext naming if no mapping provided)
      erpData.year = vehicle.year;
      erpData.color = vehicle.color;
      erpData.fuel_type = vehicle.fuel_type;
      erpData.odometer = vehicle.odometer_km;
      erpData.status = vehicle.status === 'active' ? 'Available' : 'Not Available';

      await callERPNextAPI(config, 'POST', `/api/resource/${doctype}`, erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ vehicle_id: vehicle.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncDrivers(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: drivers, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  const mappings = config.field_mappings || {};
  const doctype = mappings.driver_doctype || 'Employee';

  for (const driver of drivers) {
    try {
      const erpData: any = {
        doctype: doctype,
      };

      // Map fields dynamically
      if (mappings.driver_name_field) {
        erpData[mappings.driver_name_field] = `${driver.first_name} ${driver.last_name}`;
      }
      if (mappings.driver_email_field) {
        erpData[mappings.driver_email_field] = driver.email;
      }
      if (mappings.driver_phone_field) {
        erpData[mappings.driver_phone_field] = driver.phone;
      }

      // Default fields
      erpData.first_name = driver.first_name;
      erpData.last_name = driver.last_name;
      erpData.status = driver.status === 'active' ? 'Active' : 'Left';
      erpData.date_of_joining = driver.hire_date;

      await callERPNextAPI(config, 'POST', `/api/resource/${doctype}`, erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ driver_id: driver.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncFuelTransactions(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: transactions, error } = await supabase
    .from('fuel_transactions')
    .select('*, vehicles(plate_number)')
    .eq('organization_id', organizationId)
    .gte('transaction_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const trans of transactions) {
    try {
      const erpData = {
        doctype: config.field_mappings.fuel_doctype || 'Expense Claim',
        expense_date: trans.transaction_date,
        total_claimed_amount: trans.fuel_cost || 0,
        expenses: [{
          expense_type: 'Fuel',
          amount: trans.fuel_cost || 0,
          description: `Fuel for vehicle ${trans.vehicles?.plate_number || 'Unknown'} - ${trans.fuel_amount_liters}L`,
        }],
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Expense Claim', erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ transaction_id: trans.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncMaintenance(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: workOrders, error } = await supabase
    .from('work_orders')
    .select('*, vehicles(plate_number)')
    .eq('organization_id', organizationId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const wo of workOrders) {
    try {
      const erpData = {
        doctype: config.field_mappings.maintenance_doctype || 'Asset Maintenance',
        maintenance_type: wo.work_order_type,
        maintenance_status: wo.status,
        description: wo.description,
        completion_date: wo.completed_at,
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Asset Maintenance', erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ work_order_id: wo.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncAlerts(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*, vehicles(plate_number), drivers(first_name, last_name)')
    .eq('organization_id', organizationId)
    .gte('alert_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const alert of alerts) {
    try {
      const erpData = {
        doctype: config.field_mappings.alert_doctype || 'Issue',
        subject: alert.title,
        description: `${alert.message}\n\nVehicle: ${alert.vehicles?.plate_number || 'Unknown'}\nLocation: ${alert.location_name || 'N/A'}`,
        priority: alert.severity === 'critical' ? 'High' : alert.severity === 'warning' ? 'Medium' : 'Low',
        status: alert.status === 'resolved' ? 'Closed' : 'Open',
        issue_type: alert.alert_type,
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Issue', erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ alert_id: alert.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncIncidents(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('*, vehicles(plate_number), drivers(first_name, last_name)')
    .eq('organization_id', organizationId)
    .gte('incident_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const incident of incidents) {
    try {
      const erpData = {
        doctype: config.field_mappings.incident_doctype || 'Issue',
        subject: `${incident.incident_type} - ${incident.incident_number}`,
        description: `${incident.description}\n\nVehicle: ${incident.vehicles?.plate_number || 'Unknown'}\nDriver: ${incident.drivers ? `${incident.drivers.first_name} ${incident.drivers.last_name}` : 'Unknown'}\nLocation: ${incident.location || 'N/A'}\nEstimated Cost: ${incident.estimated_cost || 0}`,
        priority: incident.severity === 'critical' ? 'High' : incident.severity === 'major' ? 'Medium' : 'Low',
        status: incident.status === 'resolved' ? 'Closed' : 'Open',
        issue_type: 'Incident',
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Issue', erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ incident_id: incident.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncGPSData(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*, vehicles(plate_number), drivers(first_name, last_name)')
    .eq('organization_id', organizationId)
    .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .limit(500); // Limit to prevent overwhelming ERPNext

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const trip of trips) {
    try {
      const erpData = {
        doctype: config.field_mappings.trip_doctype || 'Delivery Trip',
        vehicle: trip.vehicles?.plate_number || 'Unknown',
        driver: trip.drivers ? `${trip.drivers.first_name} ${trip.drivers.last_name}` : 'Unknown',
        date: trip.start_time,
        departure_time: trip.start_time,
        arrival_time: trip.end_time,
        odometer_start_value: trip.start_odometer_km || 0,
        odometer_end_value: trip.end_odometer_km || 0,
        total_distance: trip.distance_km || 0,
        status: trip.status,
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Delivery Trip', erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ trip_id: trip.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

async function syncDriverEvents(supabase: any, config: ERPNextConfig, organizationId: string) {
  const { data: events, error } = await supabase
    .from('driver_events')
    .select('*, vehicles(plate_number), drivers(first_name, last_name)')
    .eq('organization_id', organizationId)
    .gte('event_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

  if (error) throw error;

  let synced = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const event of events) {
    try {
      const erpData = {
        doctype: config.field_mappings.driver_event_doctype || 'Comment',
        reference_doctype: 'Employee',
        reference_name: event.drivers ? `${event.drivers.first_name} ${event.drivers.last_name}` : 'Unknown',
        content: `Driver Event: ${event.event_type}\nSeverity: ${event.severity}\nVehicle: ${event.vehicles?.plate_number || 'Unknown'}\nSpeed: ${event.speed_kmh || 0} km/h\nLocation: ${event.address || 'Unknown'}\nNotes: ${event.notes || 'N/A'}`,
        comment_type: 'Info',
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Comment', erpData);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push({ event_id: event.id, error: err.message });
    }
  }

  return { synced, failed, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    let reqBody;
    try {
      reqBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { action, entityType } = reqBody;

    // Get ERPNext configuration
    const { data: config, error: configError } = await supabaseClient
      .from('erpnext_config')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      throw new Error('ERPNext integration not configured');
    }

    let result: any = {};
    const logId = crypto.randomUUID();

    // Create sync log
    await supabaseClient.from('erpnext_sync_logs').insert({
      id: logId,
      organization_id: profile.organization_id,
      config_id: config.id,
      sync_type: action === 'test' ? 'manual' : 'auto',
      entity_type: entityType || 'all',
    });

    if (action === 'test') {
      // Test connection
      try {
        await callERPNextAPI(config, 'GET', '/api/method/frappe.ping', null);
        result = { success: true, message: 'Connection successful' };
      } catch (err: any) {
        throw new Error(`Connection failed: ${err.message}`);
      }
    } else if (action === 'sync') {
      // Perform sync based on entity type
      const syncResults: any = {};

      if (!entityType || entityType === 'all' || entityType === 'vehicles') {
        if (config.sync_settings.sync_vehicles) {
          syncResults.vehicles = await syncVehicles(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'drivers') {
        if (config.sync_settings.sync_drivers) {
          syncResults.drivers = await syncDrivers(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'fuel') {
        if (config.sync_settings.sync_fuel_transactions) {
          syncResults.fuel = await syncFuelTransactions(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'maintenance') {
        if (config.sync_settings.sync_maintenance) {
          syncResults.maintenance = await syncMaintenance(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'alerts') {
        if (config.sync_settings.sync_alerts) {
          syncResults.alerts = await syncAlerts(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'incidents') {
        if (config.sync_settings.sync_incidents) {
          syncResults.incidents = await syncIncidents(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'gps') {
        if (config.sync_settings.sync_gps_data) {
          syncResults.gps = await syncGPSData(supabaseClient, config, profile.organization_id);
        }
      }

      if (!entityType || entityType === 'all' || entityType === 'driver_events') {
        if (config.sync_settings.sync_driver_events) {
          syncResults.driver_events = await syncDriverEvents(supabaseClient, config, profile.organization_id);
        }
      }

      // Calculate totals
      const totalSynced = Object.values(syncResults).reduce((acc: number, val: any) => acc + (val.synced || 0), 0);
      const totalFailed = Object.values(syncResults).reduce((acc: number, val: any) => acc + (val.failed || 0), 0);

      // Update sync log
      await supabaseClient
        .from('erpnext_sync_logs')
        .update({
          records_synced: totalSynced,
          records_failed: totalFailed,
          status: totalFailed === 0 ? 'success' : totalSynced > 0 ? 'partial' : 'failed',
          error_details: syncResults,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      // Update config last sync
      await supabaseClient
        .from('erpnext_config')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: totalFailed === 0 ? 'success' : 'partial',
        })
        .eq('id', config.id);

      result = {
        success: true,
        syncResults,
        totalSynced,
        totalFailed,
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

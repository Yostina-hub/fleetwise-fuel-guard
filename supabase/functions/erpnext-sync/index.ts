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
  const url = `${config.erpnext_url}${endpoint}`;
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

  for (const vehicle of vehicles) {
    try {
      const erpData = {
        doctype: config.field_mappings.vehicle_doctype || 'Vehicle',
        license_plate: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        chassis_number: vehicle.vin,
        color: vehicle.color,
        fuel_type: vehicle.fuel_type,
        odometer: vehicle.odometer_km,
        status: vehicle.status === 'active' ? 'Available' : 'Not Available',
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Vehicle', erpData);
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

  for (const driver of drivers) {
    try {
      const erpData = {
        doctype: config.field_mappings.driver_doctype || 'Employee',
        employee_name: `${driver.first_name} ${driver.last_name}`,
        first_name: driver.first_name,
        last_name: driver.last_name,
        personal_email: driver.email,
        cell_number: driver.phone,
        status: driver.status === 'active' ? 'Active' : 'Left',
        date_of_joining: driver.hire_date,
      };

      await callERPNextAPI(config, 'POST', '/api/resource/Employee', erpData);
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

    const { action, entityType } = await req.json();

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

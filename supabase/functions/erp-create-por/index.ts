import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { work_order_id } = body;
    if (!work_order_id) {
      return new Response(JSON.stringify({ error: 'work_order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch work order with vehicle + supplier
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: wo, error: woErr } = await adminClient
      .from('work_orders')
      .select('*, vehicles(plate_number, make, model)')
      .eq('id', work_order_id)
      .single();

    if (woErr || !wo) {
      return new Response(JSON.stringify({ error: 'Work order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const erpEndpoint = Deno.env.get('ERP_POR_ENDPOINT');
    const erpApiKey = Deno.env.get('ERP_API_KEY');

    const payload = {
      external_wo_id: wo.id,
      wo_number: wo.work_order_number,
      asset_number: wo.vehicles?.plate_number,
      asset_description: wo.vehicles ? `${wo.vehicles.make} ${wo.vehicles.model}` : null,
      department: wo.department || wo.assigned_department,
      supplier_name: wo.supplier_name,
      total_amount: wo.total_cost || 0,
      currency: 'ETB',
      description: wo.service_description,
      additional_description: wo.additional_description,
      remarks: [wo.remark_1, wo.remark_2, wo.remark_3, wo.remark_4].filter(Boolean),
      activity_type: wo.activity_type,
      requested_completion_date: wo.scheduled_completion_date || wo.scheduled_date,
      por_request_type: 'fms_work_order',
    };

    const attemptNum = (wo.erp_sync_attempts || 0) + 1;
    let porNumber: string | null = null;
    let status = 'failed';
    let respCode: number | null = null;
    let respBody: any = null;
    let errMsg: string | null = null;

    if (!erpEndpoint || !erpApiKey) {
      // Stub mode — generate a mock POR number when ERP not configured
      porNumber = `POR-STUB-${Date.now()}`;
      status = 'stubbed';
      respBody = { stub: true, message: 'ERP_POR_ENDPOINT not configured; POR stubbed locally' };
    } else {
      try {
        const resp = await fetch(erpEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${erpApiKey}`,
          },
          body: JSON.stringify(payload),
        });
        respCode = resp.status;
        respBody = await resp.json().catch(() => ({}));
        if (resp.ok) {
          porNumber = respBody.por_number || respBody.id || `POR-${Date.now()}`;
          status = 'success';
        } else {
          errMsg = `ERP returned ${resp.status}: ${JSON.stringify(respBody)}`;
        }
      } catch (e: any) {
        errMsg = e.message;
      }
    }

    // Log the attempt
    await adminClient.from('erp_sync_log').insert({
      organization_id: wo.organization_id,
      work_order_id: wo.id,
      sync_type: 'por_create',
      status,
      request_payload: payload,
      response_payload: respBody,
      response_status_code: respCode,
      error_message: errMsg,
      attempt_number: attemptNum,
      triggered_by: userData.user.id,
    });

    // Update WO
    await adminClient.from('work_orders').update({
      por_number: porNumber,
      por_status: status === 'success' || status === 'stubbed' ? 'created' : 'failed',
      por_synced_at: porNumber ? new Date().toISOString() : null,
      erp_sync_attempts: attemptNum,
    }).eq('id', wo.id);

    return new Response(JSON.stringify({
      success: status === 'success' || status === 'stubbed',
      por_number: porNumber,
      status,
      error: errMsg,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

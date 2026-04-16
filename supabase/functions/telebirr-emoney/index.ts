// Hybrid Telebirr B2C e-money endpoint for fuel work orders.
// - Real mode: posts to Telebirr B2C endpoint when MERCHANT_ID/APP_KEY/PUBLIC_KEY are present.
// - Stub mode: generates deterministic mock refs so the workflow runs end-to-end without a sandbox.
// Actions: transfer | confirm_pin | check_status | pullback
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function stubRef(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

async function callRealTelebirr(action: string, payload: Record<string, unknown>) {
  const merchantId = Deno.env.get('TELEBIRR_MERCHANT_ID');
  const appKey = Deno.env.get('TELEBIRR_APP_KEY');
  const publicKey = Deno.env.get('TELEBIRR_PUBLIC_KEY');
  const baseUrl = Deno.env.get('TELEBIRR_API_URL') || 'https://api.telebirr.com/v2';

  if (!merchantId || !appKey || !publicKey) {
    return { ok: false, stub: true, reason: 'TELEBIRR secrets not configured' };
  }

  // Map action → Telebirr endpoint
  const endpointMap: Record<string, string> = {
    transfer: '/b2c/transfer',
    check_status: '/b2c/status',
    pullback: '/b2c/refund',
  };
  const endpoint = endpointMap[action];
  if (!endpoint) return { ok: false, error: 'Unknown action' };

  try {
    const resp = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-Id': merchantId,
        'X-App-Key': appKey,
      },
      body: JSON.stringify({ ...payload, merchant_id: merchantId }),
    });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, data, status: resp.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const woId = String(body.fuel_work_order_id || '');
    if (!woId) return json({ error: 'fuel_work_order_id required' }, 400);

    // Look up work order + linked request
    const { data: wo, error: woErr } = await admin
      .from('fuel_work_orders')
      .select('*, fuel_requests:fuel_request_id(id, organization_id, driver_phone, driver_name, vehicle_id, request_number)')
      .eq('id', woId)
      .single();
    if (woErr || !wo) return json({ error: 'Work order not found' }, 404);

    const fr = (wo as any).fuel_requests;
    const orgId = wo.organization_id;
    const driverPhone = body.driver_phone || fr?.driver_phone || '';
    const amount = Number(body.amount || wo.emoney_amount || 0);

    const haveSecrets = !!Deno.env.get('TELEBIRR_MERCHANT_ID');
    const provider = haveSecrets ? 'real' : 'stub';

    // ---------- TRANSFER (step 4: initiate e-money to driver) ----------
    if (action === 'transfer') {
      if (!driverPhone) return json({ error: 'driver_phone required' }, 400);
      if (amount <= 0) return json({ error: 'amount must be > 0' }, 400);

      let externalRef = stubRef('TBR-TRF');
      let respPayload: any = { stub: true, status: 'initiated' };
      let status = 'success';
      let errorMsg: string | null = null;

      if (haveSecrets) {
        const r = await callRealTelebirr('transfer', { phone: driverPhone, amount, ref: wo.work_order_number });
        if (r.ok && r.data) {
          externalRef = r.data.transaction_id || r.data.ref || externalRef;
          respPayload = r.data;
        } else {
          status = 'failed';
          errorMsg = r.error || 'Telebirr transfer failed';
        }
      }

      // Log txn
      await admin.from('fuel_telebirr_transactions').insert({
        organization_id: orgId,
        fuel_work_order_id: woId,
        fuel_request_id: fr?.id,
        txn_type: 'transfer',
        provider,
        amount,
        driver_phone: driverPhone,
        request_payload: { action, amount, driver_phone: driverPhone },
        response_payload: respPayload,
        external_ref: externalRef,
        status,
        error_message: errorMsg,
      });

      if (status === 'success') {
        await admin.from('fuel_work_orders').update({
          emoney_initiated: true,
          emoney_amount: amount,
          emoney_transfer_status: 'initiated',
          emoney_transfer_ref: externalRef,
          telebirr_provider: provider,
          telebirr_request_id: externalRef,
        }).eq('id', woId);
      }

      return json({ success: status === 'success', external_ref: externalRef, provider, error: errorMsg });
    }

    // ---------- CONFIRM PIN (step 11a/b: driver confirms payment with PIN at station) ----------
    if (action === 'confirm_pin') {
      const pin = String(body.pin || '');
      if (pin.length < 4) return json({ error: 'Invalid PIN' }, 400);

      let confirmRef = stubRef('TBR-PIN');
      let status = 'success';
      let errorMsg: string | null = null;

      if (haveSecrets) {
        const r = await callRealTelebirr('check_status', { transaction_id: wo.emoney_transfer_ref, pin });
        if (r.ok && r.data) confirmRef = r.data.confirmation_id || confirmRef;
        else { status = 'failed'; errorMsg = r.error || 'PIN confirm failed'; }
      }

      await admin.from('fuel_telebirr_transactions').insert({
        organization_id: orgId, fuel_work_order_id: woId, fuel_request_id: fr?.id,
        txn_type: 'status', provider, amount,
        driver_phone: driverPhone,
        request_payload: { action },
        response_payload: { confirm_ref: confirmRef, stub: !haveSecrets },
        external_ref: confirmRef, status, error_message: errorMsg,
      });

      if (status === 'success') {
        await admin.from('fuel_work_orders').update({
          pin_confirmed_at: new Date().toISOString(),
          pin_confirmation_ref: confirmRef,
          emoney_transfer_status: 'completed',
        }).eq('id', woId);
      }

      return json({ success: status === 'success', confirmation_ref: confirmRef, error: errorMsg });
    }

    // ---------- PULLBACK (step 13: reverse remaining balance) ----------
    if (action === 'pullback') {
      const pullbackAmount = Number(body.pullback_amount || 0);
      if (pullbackAmount <= 0) return json({ error: 'pullback_amount > 0 required' }, 400);

      let pullbackRef = stubRef('TBR-PBK');
      let status = 'success';
      let errorMsg: string | null = null;

      if (haveSecrets) {
        const r = await callRealTelebirr('pullback', {
          original_ref: wo.emoney_transfer_ref,
          amount: pullbackAmount,
          phone: driverPhone,
        });
        if (r.ok && r.data) pullbackRef = r.data.transaction_id || pullbackRef;
        else { status = 'failed'; errorMsg = r.error || 'Pullback failed'; }
      }

      await admin.from('fuel_telebirr_transactions').insert({
        organization_id: orgId, fuel_work_order_id: woId, fuel_request_id: fr?.id,
        txn_type: 'pullback', provider, amount: pullbackAmount,
        driver_phone: driverPhone,
        request_payload: { action, pullback_amount: pullbackAmount },
        response_payload: { pullback_ref: pullbackRef, stub: !haveSecrets },
        external_ref: pullbackRef, status, error_message: errorMsg,
      });

      if (status === 'success') {
        await admin.from('fuel_work_orders').update({
          pullback_initiated_at: new Date().toISOString(),
          pullback_completed_at: new Date().toISOString(),
          pullback_ref: pullbackRef,
          pullback_amount: pullbackAmount,
          amount_remaining: 0,
        }).eq('id', woId);
      }

      return json({ success: status === 'success', pullback_ref: pullbackRef, error: errorMsg });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

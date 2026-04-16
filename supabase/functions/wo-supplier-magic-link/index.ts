import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'generate';

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // VERIFY MODE: check token and return WO (no auth required)
    if (action === 'verify') {
      const token = url.searchParams.get('token');
      if (!token || token.length < 32) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { data: wo, error } = await adminClient
        .from('work_orders')
        .select('*, vehicles(plate_number, make, model)')
        .eq('supplier_magic_token', token)
        .single();

      if (error || !wo) {
        return new Response(JSON.stringify({ error: 'Token not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (wo.supplier_magic_token_expires_at && new Date(wo.supplier_magic_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Token expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ work_order: wo }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GENERATE MODE: requires auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { work_order_id, expires_in_days = 7 } = await req.json();
    if (!work_order_id) {
      return new Response(JSON.stringify({ error: 'work_order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + expires_in_days * 86400000).toISOString();

    const { error: updErr } = await adminClient
      .from('work_orders')
      .update({
        supplier_magic_token: token,
        supplier_magic_token_expires_at: expiresAt,
      })
      .eq('id', work_order_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const origin = req.headers.get('origin') || 'https://fleet.goffice.et';
    const link = `${origin}/supplier-wo/${token}`;

    return new Response(JSON.stringify({ token, link, expires_at: expiresAt }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

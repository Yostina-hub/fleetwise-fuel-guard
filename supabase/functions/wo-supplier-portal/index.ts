// Magic-link backed endpoint allowing un-authenticated suppliers to:
//  - list messages on their work order
//  - post a message (optionally with an attachment URL)
//  - upload a file to the supplier-documents bucket
//  - submit a payment request with supporting document(s)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const token = req.headers.get('x-portal-token') || url.searchParams.get('token') || '';

    if (!token || token.length < 32) return json({ error: 'Token required' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve work order from token
    const { data: wo, error: woErr } = await admin
      .from('work_orders')
      .select('id, organization_id, work_order_number, supplier_name, supplier_magic_token_expires_at')
      .eq('supplier_magic_token', token)
      .maybeSingle();
    if (woErr || !wo) return json({ error: 'Invalid token' }, 404);
    if (wo.supplier_magic_token_expires_at && new Date(wo.supplier_magic_token_expires_at) < new Date()) {
      return json({ error: 'Token expired' }, 410);
    }

    const supplierName = wo.supplier_name || 'Supplier';

    // ------- ACTIONS -------
    if (action === 'list_messages' && req.method === 'GET') {
      const { data } = await admin
        .from('wo_supplier_messages')
        .select('*')
        .eq('work_order_id', wo.id)
        .order('created_at', { ascending: true });
      return json({ messages: data || [] });
    }

    if (action === 'list_payment_requests' && req.method === 'GET') {
      const { data } = await admin
        .from('supplier_payment_requests')
        .select('*')
        .eq('work_order_id', wo.id)
        .order('created_at', { ascending: false });
      return json({ payment_requests: data || [] });
    }

    if (action === 'post_message' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const message = String(body.message || '').trim();
      if (!message || message.length > 5000) return json({ error: 'Invalid message' }, 400);

      const { data, error } = await admin.from('wo_supplier_messages').insert({
        organization_id: wo.organization_id,
        work_order_id: wo.id,
        sender_type: 'supplier',
        sender_name: supplierName,
        message,
        attachment_url: body.attachment_url || null,
        attachment_name: body.attachment_name || null,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ message: data });
    }

    if (action === 'upload_file' && req.method === 'POST') {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) return json({ error: 'No file' }, 400);
      if (file.size > 20 * 1024 * 1024) return json({ error: 'File too large (max 20MB)' }, 400);

      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `wo/${wo.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const buf = await file.arrayBuffer();
      const { error: upErr } = await admin.storage
        .from('supplier-documents')
        .upload(path, buf, { contentType: file.type || 'application/octet-stream' });
      if (upErr) return json({ error: upErr.message }, 500);

      // Signed URL (7 days) so the magic-link supplier can preview
      const { data: signed } = await admin.storage
        .from('supplier-documents').createSignedUrl(path, 60 * 60 * 24 * 7);

      return json({ path, name: file.name, signed_url: signed?.signedUrl });
    }

    if (action === 'submit_payment_request' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Invalid amount' }, 400);

      const { data, error } = await admin.from('supplier_payment_requests').insert({
        organization_id: wo.organization_id,
        work_order_id: wo.id,
        supplier_name: supplierName,
        invoice_number: body.invoice_number || null,
        invoice_url: body.invoice_url || null,
        amount,
        currency: body.currency || 'ETB',
        status: 'submitted',
        notes: body.notes || null,
        supporting_documents: body.supporting_documents || [],
      }).select().single();
      if (error) return json({ error: error.message }, 500);

      // Auto-post a message in the thread
      await admin.from('wo_supplier_messages').insert({
        organization_id: wo.organization_id,
        work_order_id: wo.id,
        sender_type: 'supplier',
        sender_name: supplierName,
        message: `Payment request submitted: ${data.currency} ${data.amount}${data.invoice_number ? ' (Invoice ' + data.invoice_number + ')' : ''}`,
        attachment_url: data.invoice_url,
        attachment_name: data.invoice_number ? `Invoice ${data.invoice_number}` : null,
      });

      return json({ payment_request: data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

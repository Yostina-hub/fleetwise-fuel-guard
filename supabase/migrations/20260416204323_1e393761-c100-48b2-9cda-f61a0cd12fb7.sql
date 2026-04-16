-- Storage bucket for supplier-uploaded invoices and maintenance documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users in the org to read supplier docs
CREATE POLICY "Auth users can read supplier docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'supplier-documents');

-- Allow authenticated users to upload supplier docs (suppliers logged-in + fleet team)
CREATE POLICY "Auth users can upload supplier docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'supplier-documents');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Auth users can update supplier docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'supplier-documents' AND owner = auth.uid());

-- Allow anonymous (magic-link supplier) read access via signed URLs only — no anon insert
-- (uploads from magic-link suppliers go through an edge function with service role)

-- Add a couple of helpful columns if missing
ALTER TABLE public.supplier_payment_requests
  ADD COLUMN IF NOT EXISTS supporting_documents jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index for fleet-team payment review queue
CREATE INDEX IF NOT EXISTS idx_payment_requests_status_org
  ON public.supplier_payment_requests (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wo_messages_wo_created
  ON public.wo_supplier_messages (work_order_id, created_at);
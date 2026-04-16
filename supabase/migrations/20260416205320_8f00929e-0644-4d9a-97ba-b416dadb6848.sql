-- Seed a magic token for E2E testing of the supplier portal flow
UPDATE public.work_orders
SET supplier_magic_token = 'e2e' || encode(gen_random_bytes(30), 'hex'),
    supplier_magic_token_expires_at = now() + interval '7 days',
    supplier_name = COALESCE(supplier_name, 'E2E Test Supplier')
WHERE id = 'a7cceed4-f924-4585-abb9-0849c20a4f37'
  AND supplier_magic_token IS NULL;
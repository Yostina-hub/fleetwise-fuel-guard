
-- Seed default fleet pools for the DEIC organization
INSERT INTO public.fleet_pools (organization_id, category, name, code) VALUES
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'corporate', 'FAN', 'FAN'),
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'corporate', 'TPO', 'TPO'),
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'corporate', 'HQ', 'HQ'),
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'zone', 'SWAAZ', 'SWAAZ'),
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'zone', 'EAAZ', 'EAAZ'),
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'region', 'NR', 'NR'),
  ('4bffdf8a-fd4d-4ff7-b083-04fea2c721b4', 'region', 'SR', 'SR')
ON CONFLICT (organization_id, code) DO NOTHING;

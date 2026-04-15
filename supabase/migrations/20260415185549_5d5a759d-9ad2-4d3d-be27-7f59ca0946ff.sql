CREATE TABLE IF NOT EXISTS public.administrative_localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_region text NOT NULL,
  zone text NOT NULL,
  woreda text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_localities_region ON public.administrative_localities(admin_region);
CREATE INDEX IF NOT EXISTS idx_admin_localities_region_zone ON public.administrative_localities(admin_region, zone);

ALTER TABLE public.administrative_localities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON public.administrative_localities FOR SELECT TO authenticated USING (true);
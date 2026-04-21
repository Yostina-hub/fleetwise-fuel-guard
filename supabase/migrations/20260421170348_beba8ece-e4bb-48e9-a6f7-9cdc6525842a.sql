create table if not exists public.maintenance_class_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_type text not null,
  service_type text,
  mtbf_days integer,
  reminder_days_before integer,
  reminder_km_before integer,
  reminder_hours_before integer,
  priority text,
  notes text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, vehicle_type, service_type)
);

create index if not exists idx_mco_org_class
  on public.maintenance_class_overrides (organization_id, vehicle_type)
  where is_active = true;

alter table public.maintenance_class_overrides enable row level security;

create policy "mco_select_same_org" on public.maintenance_class_overrides
  for select to authenticated using (organization_id = public.get_user_organization(auth.uid()));
create policy "mco_insert_same_org" on public.maintenance_class_overrides
  for insert to authenticated with check (organization_id = public.get_user_organization(auth.uid()));
create policy "mco_update_same_org" on public.maintenance_class_overrides
  for update to authenticated using (organization_id = public.get_user_organization(auth.uid()))
  with check (organization_id = public.get_user_organization(auth.uid()));
create policy "mco_delete_same_org" on public.maintenance_class_overrides
  for delete to authenticated using (organization_id = public.get_user_organization(auth.uid()));

create trigger trg_mco_updated_at
  before update on public.maintenance_class_overrides
  for each row execute function public.update_updated_at_column();
create or replace function public.can_submit_vehicle_request_rating(
  _vehicle_request_id uuid,
  _organization_id uuid,
  _user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vehicle_requests vr
    where vr.id = _vehicle_request_id
      and vr.organization_id = _organization_id
      and vr.requester_id = _user_id
      and (
        vr.status = any (array['completed'::text, 'closed'::text])
        or vr.driver_checked_out_at is not null
        or vr.requester_confirmed_at is not null
      )
  )
$$;

alter policy "Requester can submit rating"
on public.vehicle_request_ratings
with check (
  rated_by = auth.uid()
  and public.can_submit_vehicle_request_rating(
    vehicle_request_id,
    organization_id,
    auth.uid()
  )
);
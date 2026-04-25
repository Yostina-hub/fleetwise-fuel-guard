-- Performance indexes to eliminate hot-path sequential scans

-- 1. vehicle_telemetry: speed up "latest position per vehicle" queries
-- Current state table - keyed by vehicle_id, ordered by last_communication_at
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_vehicle_lastcomm
  ON public.vehicle_telemetry (vehicle_id, last_communication_at DESC);

-- Org-wide live feed: organization + last_communication_at
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_org_lastcomm
  ON public.vehicle_telemetry (organization_id, last_communication_at DESC);

-- 2. user_roles: simpler (user_id, role) index for has_role() RLS checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

-- 3. profiles: organization scope (profiles.id == auth.uid, but org filtering is heavy)
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON public.profiles (organization_id);

-- 4. vehicles: combined org + status for live fleet listing
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status
  ON public.vehicles (organization_id, status);

-- 5. vehicle_geofence_states: history queries by entered_at
CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_states_vehicle_entered
  ON public.vehicle_geofence_states (vehicle_id, entered_at DESC);

-- 6. trips: combined vehicle + start_time for trip history
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_start
  ON public.trips (vehicle_id, start_time DESC);

-- 7. user_sessions: speed up active session lookups by user
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON public.user_sessions (user_id, is_active)
  WHERE is_active = true;

-- 8. Refresh planner statistics so it picks up the new indexes immediately
ANALYZE public.vehicle_telemetry;
ANALYZE public.user_roles;
ANALYZE public.profiles;
ANALYZE public.vehicles;
ANALYZE public.vehicle_geofence_states;
ANALYZE public.trips;
ANALYZE public.user_sessions;
---
name: Driver Portal RBAC Visibility
description: Driver Portal sidebar entry shown when user has 'driver' role; drivers must be provisioned with auth account and linked via drivers.user_id
type: feature
---
The "Driver Portal" sidebar item (under Driver Management) is RBAC-gated in
`src/config/sidebarAccess.ts` and visible to roles: org_admin, fleet_manager,
technician, driver, fleet_owner, operations_manager (super_admin sees all).

For drivers to see the entry they MUST have:
1. An `auth.users` account
2. A row in `user_roles` with `role = 'driver'`
3. `drivers.user_id` linked to their auth user id (DriverPortal looks up the
   driver row via `drivers.user_id = auth.uid()`)

Provisioning is handled in two places:
- `CreateDriverDialog`: when email + password are provided, automatically calls
  `create-user` edge function with `role: 'driver'` and patches `drivers.user_id`.
- `DriverDetailDialog` → `ProvisionDriverAccountButton` (src/components/fleet/):
  one-click backfill for existing drivers that lack a portal account.

The `create-user` edge function whitelists `driver` as an assignable role and
requires the caller to be super_admin or org_admin.

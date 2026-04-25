---
name: Active Directory / Oracle IDCS Integration
description: Frontend-managed identity provider configurations for Oracle IDCS, Azure AD, and SAML/OIDC SSO; located inside the Integrations page (AD / Oracle tab)
type: feature
---
Identity provider configurations are managed entirely from the frontend at
`/integrations` → **AD / Oracle** tab (component: `src/components/integrations/ActiveDirectoryTab.tsx`).

Backed by tables:
- `identity_provider_configs` — provider_type, display_name, metadata_url, entity_id, sso_url,
  client_id, client_secret_ref (name of Cloud secret), domains[], attribute_mapping (JSONB),
  role_mapping (JSONB group→role), default_role, is_active, auto_provision_users
- `sso_login_events` — audit trail of SSO authentications

Supported provider_type values: `oracle_idcs`, `azure_ad`, `active_directory`, `saml`, `oidc`,
`okta`, `ping`.

RLS: super_admin manages all; org_admin manages within their organization. Client secrets are
NOT stored in the table — only the *name* of the Cloud secret is stored in `client_secret_ref`,
and the actual secret value is added separately via Lovable Cloud secrets when the time comes
to wire up the live SSO flow (e.g. via an edge function callback).

-- Revoke all active refresh tokens to force all users to re-authenticate
UPDATE auth.sessions SET not_after = now() WHERE not_after IS NULL OR not_after > now();
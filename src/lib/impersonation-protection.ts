// Developer / owner accounts that must never be impersonated, even by super_admins.
// Keep this list in sync with the server-side guard in
// supabase/functions/log-impersonation/index.ts
export const PROTECTED_IMPERSONATION_USER_IDS = new Set<string>([
  "192a5e2a-5692-414b-866b-642558520c7b", // abel.birara@gmail.com (Abel Birara)
  "279ecc88-c79f-4eb5-be72-3733c82efa25", // henyize@outlook.com (Henyize)
  "ad4facd8-73f9-4472-bff0-2283d0766b89", // henyize@gmail.com (Henyize)
]);

export const PROTECTED_IMPERSONATION_EMAILS = new Set<string>([
  "abel.birara@gmail.com",
  "henyize@outlook.com",
  "henyize@gmail.com",
]);

export function isImpersonationProtected(input: {
  id?: string | null;
  email?: string | null;
}): boolean {
  if (input.id && PROTECTED_IMPERSONATION_USER_IDS.has(input.id)) return true;
  if (input.email && PROTECTED_IMPERSONATION_EMAILS.has(input.email.toLowerCase()))
    return true;
  return false;
}

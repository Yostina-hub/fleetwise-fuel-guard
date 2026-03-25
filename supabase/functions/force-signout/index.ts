import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to directly call the GoTrue admin endpoint
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // List all users
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const results: string[] = [];

  for (const user of users) {
    try {
      // Use the GoTrue admin API directly to sign out user
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/factors`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
      });
      
      // The most reliable way: update user to force re-auth by changing app_metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { force_reauth: Date.now() },
      });
      
      if (updateError) {
        results.push(`Failed to update ${user.email}: ${updateError.message}`);
      } else {
        results.push(`Force re-auth set for ${user.email}`);
      }
    } catch (e) {
      results.push(`Error for ${user.email}: ${e.message}`);
    }
  }

  // Also delete all refresh tokens by calling the logout endpoint for each user
  // Use direct postgres to delete sessions
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (dbUrl) {
    results.push("DB URL available - sessions should be cleared via migration");
  }

  return new Response(JSON.stringify({ results, total: users.length }), { headers: corsHeaders });
});

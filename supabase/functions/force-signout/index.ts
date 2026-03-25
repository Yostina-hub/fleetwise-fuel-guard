import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: string[] = [];
  const keepEmail = "abel.birara@gmail.com";

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  for (const user of users) {
    if (user.email === keepEmail) {
      // Force token refresh by updating metadata
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { force_reauth: Date.now() },
      });
      results.push(`Kept & forced reauth: ${user.email}`);
      continue;
    }
    
    // Delete non-admin users
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (delError) {
      results.push(`Failed to delete ${user.email}: ${delError.message}`);
    } else {
      results.push(`Deleted: ${user.email}`);
    }
  }

  return new Response(JSON.stringify({ results, total: users.length }), { headers: corsHeaders });
});

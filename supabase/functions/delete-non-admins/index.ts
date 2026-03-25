import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify via internal service key header
    const internalKey = req.headers.get("x-internal-key");
    if (internalKey !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all super_admin user IDs
    const { data: superAdminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const superAdminIds = new Set((superAdminRoles || []).map((r: any) => r.user_id));

    // Get all users from auth
    const allUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !users || users.length === 0) break;
      allUsers.push(...users);
      if (users.length < 100) break;
      page++;
    }

    // Delete non-super-admin users
    const toDelete = allUsers.filter((u: any) => !superAdminIds.has(u.id));
    let deleted = 0;
    const errors: string[] = [];

    for (const u of toDelete) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (error) {
        errors.push(`${u.email}: ${error.message}`);
      } else {
        deleted++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deleted, 
      total: toDelete.length,
      preserved: superAdminIds.size,
      errors: errors.length > 0 ? errors : undefined
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

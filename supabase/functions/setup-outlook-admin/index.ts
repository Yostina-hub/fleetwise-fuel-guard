import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const email = "henyize@outlook.com";
    const password = "Henyize@2026!";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existing) {
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      userId = existing.id;
    } else {
      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Henyize" },
      });
      if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      userId = newUser.user.id;
    }

    // Get org
    const { data: org } = await supabaseAdmin.from("organizations").select("id").limit(1).single();
    const orgId = org?.id;

    if (orgId) {
      await supabaseAdmin.from("profiles").update({ organization_id: orgId }).eq("id", userId);
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "super_admin", organization_id: orgId },
        { onConflict: "user_id,role,organization_id" }
      );
    }

    // Clear lockout
    await supabaseAdmin.from("account_lockouts").delete().eq("email", email);

    // Verify
    const { data: profile } = await supabaseAdmin.from("profiles").select("id, email, organization_id").eq("id", userId).single();
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role, organization_id").eq("user_id", userId);

    return new Response(JSON.stringify({
      success: true,
      userId,
      existed: !!existing,
      profile,
      roles,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

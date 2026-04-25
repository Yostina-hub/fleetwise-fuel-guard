import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function slug(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // AuthZ: caller must be super_admin or org_admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles || []).some((r: any) =>
      ["super_admin", "org_admin"].includes(r.role)
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const emailDomain: string = body.emailDomain || "fleet.goffice.et";
    const sharedPassword: string = body.sharedPassword;
    const dryRun: boolean = !!body.dryRun;
    if (!sharedPassword || sharedPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "sharedPassword required (>=8 chars)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: drivers, error: dErr } = await admin
      .from("drivers")
      .select("id, first_name, last_name, email, user_id, organization_id");
    if (dErr) throw dErr;

    const usedEmails = new Set<string>();
    const results: any[] = [];

    for (const d of drivers || []) {
      try {
        if (d.user_id) {
          results.push({
            driverId: d.id,
            name: `${d.first_name} ${d.last_name}`,
            status: "skipped_has_account",
            email: d.email,
          });
          continue;
        }

        // Generate email if missing
        let email = (d.email || "").trim().toLowerCase();
        if (!email) {
          const base = `${slug(d.first_name)}.${slug(d.last_name)}` || `driver.${d.id.slice(0, 8)}`;
          let candidate = `${base}@${emailDomain}`;
          let n = 1;
          while (usedEmails.has(candidate)) {
            candidate = `${base}${n++}@${emailDomain}`;
          }
          email = candidate;
        }
        usedEmails.add(email);

        if (dryRun) {
          results.push({ driverId: d.id, name: `${d.first_name} ${d.last_name}`, status: "dry_run", email });
          continue;
        }

        // Check if email already exists in auth
        const { data: existing } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        // listUsers doesn't filter; instead try create and handle error
        let userId: string | null = null;
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          password: sharedPassword,
          email_confirm: true,
          user_metadata: { full_name: `${d.first_name} ${d.last_name}` },
        });

        if (cErr) {
          // Try to find existing user by email
          if (`${cErr.message}`.toLowerCase().includes("already")) {
            // Fallback: scan up to 1000 users
            const { data: list } = await admin.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });
            const found = list?.users?.find(
              (u) => (u.email || "").toLowerCase() === email
            );
            if (found) userId = found.id;
            else throw cErr;
          } else {
            throw cErr;
          }
        } else {
          userId = created.user!.id;
        }

        if (!userId) throw new Error("No user id");

        // Ensure profile org
        await admin
          .from("profiles")
          .upsert(
            { id: userId, organization_id: d.organization_id, full_name: `${d.first_name} ${d.last_name}` },
            { onConflict: "id" }
          );

        // Assign driver role (idempotent)
        const { error: roleErr } = await admin.from("user_roles").insert({
          user_id: userId,
          role: "driver",
          organization_id: d.organization_id,
        });
        if (roleErr && !`${roleErr.message}`.toLowerCase().includes("duplicate")) {
          // ignore unique violation
        }

        // Link driver row + email
        await admin
          .from("drivers")
          .update({ user_id: userId, email })
          .eq("id", d.id);

        results.push({
          driverId: d.id,
          name: `${d.first_name} ${d.last_name}`,
          status: "created",
          email,
          userId,
        });
      } catch (err: any) {
        results.push({
          driverId: d.id,
          name: `${d.first_name} ${d.last_name}`,
          status: "error",
          error: err?.message || String(err),
        });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped_has_account").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

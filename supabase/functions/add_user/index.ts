import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    try {
        if (!["POST", "DELETE"].includes(req.method)) {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // Service-role operations require a verified, currently active Admin.
        const token = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1]
        const { data: caller, error: callerError } = token
            ? await adminClient.auth.getUser(token)
            : { data: { user: null }, error: new Error("Missing token") }
        if (callerError || !caller.user) {
            return new Response(JSON.stringify({ error: "Authentication required" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }
        const { data: callerProfile, error: callerProfileError } = await adminClient
            .from("profiles").select("user_type, status").eq("id", caller.user.id).single()
        if (callerProfileError || callerProfile?.user_type !== "admin" || callerProfile?.status !== "active") {
            return new Response(JSON.stringify({ error: "Active Admin access required" }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        const body = await req.json()
        const action = body.action || (req.method === "DELETE" ? "deactivate" : "create")

        // ── DEACTIVATE USER ───────────────────────────────────────────────
        if (action === "deactivate") {
            const { user_id } = body

            if (!user_id) return new Response(
                JSON.stringify({ error: "user_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            const { error: profileError } = await adminClient
                .from("profiles")
                .update({ status: "inactive" })
                .eq("id", user_id)

            if (profileError) return new Response(
                JSON.stringify({ error: profileError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── REACTIVATE USER ──────────────────────────────────────────────
        if (action === "reactivate") {
            const { user_id } = body

            if (!user_id) return new Response(
                JSON.stringify({ error: "user_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            const { error: profileError } = await adminClient
                .from("profiles")
                .update({ status: "active" })
                .eq("id", user_id)

            if (profileError) return new Response(
                JSON.stringify({ error: profileError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── DELETE USER (permanent) ──────────────────────────────────────
        if (action === "delete") {
            const { user_id } = body

            if (!user_id) return new Response(
                JSON.stringify({ error: "user_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            // Delete from auth (profiles row cascades via FK)
            const { error: authError } = await adminClient.auth.admin.deleteUser(user_id)

            if (authError) return new Response(
                JSON.stringify({ error: authError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── UPDATE USER EMAIL ─────────────────────────────────────────────
        if (action === "update_email") {
            const { user_id, new_email } = body

            if (!user_id || !new_email) return new Response(
                JSON.stringify({ error: "user_id and new_email are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            // Step 1: Update Auth user email using service role adminClient
            const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, {
                email: new_email,
                email_confirm: true
            })

            if (authError) return new Response(
                JSON.stringify({ error: authError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            // Step 2: Update Profile email
            const { error: profileError } = await adminClient
                .from("profiles")
                .update({ email: new_email })
                .eq("id", user_id)

            if (profileError) return new Response(
                JSON.stringify({ error: profileError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── CREATE USER ───────────────────────────────────────────────────
        if (action === "create") {
            const { name, email, password, user_type } = body
            const roleLabels: Record<string, string> = {
                staff: "Staff", admin: "Admin"
                // Paused: accounts: "Accounts", manager: "Manager"
            }
            if (typeof user_type !== "string" || !Object.hasOwn(roleLabels, user_type)) {
                return new Response(JSON.stringify({ error: "Unsupported account type" }), {
                    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }
            const role = roleLabels[user_type]
            if (typeof name !== "string" || !name.trim() || typeof email !== "string"
                || !email.includes("@") || typeof password !== "string" || password.length < 8) {
                return new Response(JSON.stringify({ error: "Name, valid email and password of at least 8 characters are required" }), {
                    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
            }

            // Step 1: create the auth user with the dummy/temp password
            const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
                email, password, email_confirm: true
            })

            if (authError) return new Response(
                JSON.stringify({ error: authError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )

            // Step 2: create their profile row
            const { error: profileError } = await adminClient.from("profiles").insert({
                id: authUser.user.id, name, email, role, user_type, status: "active"
            })

            if (profileError) {
                // roll back the auth user so we don't leave an orphaned account behind
                await adminClient.auth.admin.deleteUser(authUser.user.id)
                return new Response(
                    JSON.stringify({ error: profileError.message }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                )
            }

            // Step 3: send them a "set your password" email
            // Wait for completion so the runtime cannot discard the email request.
            const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
                redirectTo: "https://powertronicstechnology.github.io/CRM/?reset_password=1"
            })

            return new Response(
                JSON.stringify({ success: true, warning: resetError ? "Account created; password-reset email was not sent. Use the reset action to retry." : undefined }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // ── UNKNOWN ACTION ────────────────────────────────────────────────
        return new Response(
            JSON.stringify({ error: `Unknown action: ${action}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.log("Error:", err.message)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})

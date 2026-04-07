import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `vdi_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "list" | "generate"
    const walletAddress = url.searchParams.get("wallet");

    if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "list" || req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .select("id, api_key, label, created_at, last_used_at, is_active")
        .eq("wallet_address", walletAddress)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ keys: data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      // Check key count limit
      const { count } = await supabaseAdmin
        .from("api_keys")
        .select("id", { count: "exact", head: true })
        .eq("wallet_address", walletAddress)
        .eq("is_active", true);

      if ((count || 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "Maximum 5 active API keys allowed" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiKey = generateApiKey();
      const { error } = await supabaseAdmin
        .from("api_keys")
        .insert({
          wallet_address: walletAddress,
          api_key: apiKey,
          label: `Key ${(count || 0) + 1}`,
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ api_key: apiKey }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("manage-api-keys error:", err instanceof Error ? err.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

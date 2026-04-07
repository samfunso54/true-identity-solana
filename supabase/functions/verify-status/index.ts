import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const walletAddress = url.searchParams.get("wallet");

    if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for API key auth (for external API usage)
    const authHeader = req.headers.get("authorization");
    let isApiCall = false;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (authHeader?.startsWith("Bearer vdi_")) {
      const apiKey = authHeader.replace("Bearer ", "");
      const { data: keyRecord } = await supabaseAdmin
        .from("api_keys")
        .select("id, is_active")
        .eq("api_key", apiKey)
        .eq("is_active", true)
        .single();

      if (!keyRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      isApiCall = true;
      // Update last_used_at
      await supabaseAdmin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", keyRecord.id);
    }

    const { data, error } = await supabaseAdmin
      .from("verification_records")
      .select("wallet_address, status, tx_signature, hash, verified_at")
      .eq("wallet_address", walletAddress)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({
          wallet_address: walletAddress,
          status: "not_verified",
          verified_at: null,
          chain: "solana",
          network: "devnet",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        wallet_address: data.wallet_address,
        status: data.status,
        verified_at: data.verified_at,
        tx_signature: data.tx_signature,
        hash: data.hash,
        chain: "solana",
        network: "devnet",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-status error:", err instanceof Error ? err.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

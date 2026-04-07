import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { wallet_address, tx_signature, hash, nonce, challenge_proof } = body;

    // Validate inputs
    if (!wallet_address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet_address)) {
      return new Response(
        JSON.stringify({ error: "Invalid wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tx_signature || typeof tx_signature !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing tx_signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
      return new Response(
        JSON.stringify({ error: "Invalid hash format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert verification record
    const { error } = await supabaseAdmin
      .from("verification_records")
      .upsert({
        wallet_address,
        status: "verified",
        tx_signature,
        hash,
        nonce: nonce || null,
        challenge_proof: challenge_proof || null,
        verified_at: new Date().toISOString(),
      }, { onConflict: "wallet_address" });

    if (error) {
      console.error("DB upsert error:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to store verification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, status: "verified" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-complete error:", err instanceof Error ? err.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

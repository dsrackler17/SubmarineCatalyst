import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "https://dipagzqrvivposqjkdkx.supabase.co";
const SERVICE_ROLE_KEY  = Deno.env.get("SERVICE_ROLE_KEY");

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SYSTEM_PROMPT = `You are the Submarine Catalyst AI Research Analyst — a specialized biotech and FDA regulatory intelligence tool built for traders evaluating PDUFA binary events.

Your expertise covers:
- FDA approval processes: NDA, BLA, sNDA, ANDA pathways
- PDUFA action dates and what they mean for stock prices
- Advisory Committee (AdCom) votes and their predictive value
- Indication-specific FDA approval rates (Oncology: 85%, Rare/Orphan: 86%, CNS: 49%, etc.)
- Clinical trial design, endpoints, and Phase transitions
- SEC 8-K filings and what they signal about FDA communication
- Accelerated approval vs full approval and confirmatory trial risks
- Convexity analysis: how price depression, short interest, and market cap affect trade asymmetry
- CRL (Complete Response Letter) history and resubmission dynamics
- Competitive landscapes within therapeutic areas

Guidelines:
- Be specific and data-driven. Cite approval rates, historical precedents, and regulatory pathways.
- When analyzing a ticker, structure your response with: company/drug overview, regulatory pathway, key risk flags, and setup assessment.
- Always note that this is analysis, not investment advice. Trading PDUFA events carries substantial risk.
- If asked about something outside biotech/FDA, briefly answer but redirect to your area of expertise.
- Use markdown formatting: **bold** for key terms, \`code\` for tickers/numbers.
- Keep responses thorough but focused. Traders want signal, not noise.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the user is authenticated and has an active subscription
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_paid")
      .eq("id", user.id)
      .single();

    if (!profile?.is_paid) {
      return new Response(JSON.stringify({ error: "Active subscription required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body = await req.json();
    const messages = body.messages || [];

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Anthropic API
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await anthropicRes.json();
    const reply = aiData.content?.[0]?.text || "No response generated.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("ai-research error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

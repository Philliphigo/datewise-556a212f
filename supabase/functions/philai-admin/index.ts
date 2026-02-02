import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin check
    const serviceSupabase = createClient(supabaseUrl, supabaseKey);
    const { data: isAdmin, error: roleErr } = await serviceSupabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "payment_triage": {
        // context should include array of pending payments
        const pendingPayments = context?.payments || [];
        systemPrompt = `You are PhilAI, the admin assistant for DateWise. Your role is to analyze pending payments and flag which ones are likely real vs suspicious.

Criteria for suspicious payments:
- Large amounts with no prior transaction history
- Unusual timing (e.g., middle of the night patterns)
- Missing or incomplete metadata (tier, email, etc.)
- Payments stuck pending for many days

Criteria for likely real payments:
- Amount matches a known subscription tier (MWK 5000 = supporter, 15000 = premium, 30000 = vip)
- Has proper metadata with tier and email
- Created recently (within last few hours/days)

Respond with a JSON array of objects with keys: payment_id, verdict ("likely_real" | "suspicious" | "needs_review"), reason.`;
        userPrompt = `Here are the pending payments to analyze:\n${JSON.stringify(pendingPayments, null, 2)}`;
        break;
      }

      case "daily_summary": {
        // context should include stats
        const stats = context?.stats || {};
        systemPrompt = `You are PhilAI, the admin assistant for DateWise. Generate a concise daily summary for the admin, highlighting:
1. Key metrics and trends
2. Any urgent items needing attention (pending reports, pending verifications, pending withdrawals)
3. Revenue highlights
4. Recommended actions for the day

Keep it brief but actionable. Use bullet points. Be friendly yet professional.`;
        userPrompt = `Today's platform stats:\n${JSON.stringify(stats, null, 2)}`;
        break;
      }

      case "report_response": {
        // context should include report info and reporter
        const report = context?.report || {};
        systemPrompt = `You are PhilAI, the admin assistant for DateWise. Draft a professional, empathetic response to a user who filed a report.

Guidelines:
- Thank them for helping keep the community safe
- Acknowledge what was reported
- Explain the action taken (if provided)
- Reassure them that their report was reviewed
- Keep it concise and friendly

Return a JSON object with keys: subject, message (the drafted feedback text).`;
        userPrompt = `Report details:
Reason: ${report.reason || "Unknown"}
Description: ${report.description || "No description provided"}
Action taken: ${context?.action_taken || "Under review"}
Status: ${report.status || "pending"}`;
        break;
      }

      case "broadcast_draft": {
        // context should include topic/purpose
        const topic = context?.topic || "";
        systemPrompt = `You are PhilAI, the admin assistant for DateWise. Draft a broadcast message to users.

Guidelines:
- Be friendly and engaging
- Keep it concise (max 200 words)
- Include a clear call-to-action if appropriate
- Match the tone to the topic (exciting for features, apologetic for outages, etc.)

Return a JSON object with keys: message (the broadcast text).`;
        userPrompt = `Broadcast topic/purpose: ${topic}`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid type. Use: payment_triage, daily_summary, report_response, broadcast_draft" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse as JSON if expected, otherwise return as-is
    let parsed: unknown = content;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        parsed = JSON.parse(content);
      }
    } catch {
      // Return as plain text
      parsed = { text: content };
    }

    return new Response(JSON.stringify({ success: true, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("PhilAI admin error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

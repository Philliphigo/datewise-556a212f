import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const payChanguSecretKey = Deno.env.get("PAYCHANGU_SECRET_KEY") as string;
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBSCRIPTION_TIERS = {
  supporter: { mwk: 5000, usd: 5 },
  premium: { mwk: 15000, usd: 15 },
  vip: { mwk: 30000, usd: 30 },
} as const;

function validatePayment(tier: string, amount: number, currency: string): void {
  const tierPricing = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
  if (!tierPricing) {
    throw new Error('Invalid subscription tier');
  }
  
  const expectedAmount = tierPricing[currency.toLowerCase() as keyof typeof tierPricing];
  if (!expectedAmount || amount !== expectedAmount) {
    throw new Error(`Invalid amount for ${tier}. Expected ${expectedAmount} ${currency}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, currency = 'MWK', tier, email, firstName, lastName } = await req.json();
    const userId = user.id; // Use verified user ID from JWT
    
    // Validate payment amount matches tier
    validatePayment(tier, amount, currency);

    // Generate unique transaction reference
    const txRef = `DONATION-${userId}-${Date.now()}`;

    console.log("Processing PayChangu payment:", { amount, currency, tier, userId, txRef });

    // Create PayChangu hosted checkout session
    const paymentResponse = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        secret_key: payChanguSecretKey,
        amount,
        currency,
        tx_ref: txRef,
        email,
        first_name: firstName,
        last_name: lastName,
        callback_url: `${supabaseUrl}/functions/v1/paychangu-webhook`,
        return_url: `${supabaseUrl.replace('supabase.co', 'lovable.app')}/donate?status=success`,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.status !== "success") {
      throw new Error(paymentData.message || "PayChangu payment session creation failed");
    }

    // Record payment in database with pending status
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      amount,
      currency,
      payment_method: "paychangu",
      transaction_id: txRef,
      status: "pending",
      metadata: { tier, email, mode: paymentData.data?.mode || "live" },
    });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
      throw paymentError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: paymentData.data.checkout_url,
        tx_ref: txRef,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-paychangu-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

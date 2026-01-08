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

function validatePayment(tier: string, amount: number, currency: string, isCustom: boolean = false): void {
  // For custom amounts, just validate minimum
  if (isCustom) {
    if (amount < 500) {
      throw new Error('Minimum donation is MWK 500');
    }
    return;
  }

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

    const { amount, currency = 'MWK', tier, email, firstName, lastName, phoneNumber, customAmount } = await req.json();
    const userId = user.id; // Use verified user ID from JWT
    const isCustomPayment = !!customAmount;
    
    // Validate phone number format for Malawi mobile money
    if (phoneNumber) {
      const phoneRegex = /^(099|088)\d{7}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        return new Response(
          JSON.stringify({ error: 'Invalid phone number format. Please use a valid Malawi number (e.g., 0991234567 or 0881234567)' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Validate payment amount matches tier (or custom amount)
    validatePayment(tier, amount, currency, isCustomPayment);

    // Generate unique transaction reference
    const txRef = `DONATION-${userId}-${Date.now()}`;

    console.log("Processing PayChangu payment:", { amount, currency, tier, userId, txRef });

    // Create PayChangu hosted checkout session
    // Validate secret key is configured
    if (!payChanguSecretKey) {
      throw new Error("PayChangu secret key not configured");
    }

    const origin = req.headers.get('origin') || 'https://datewise.lovable.app';

    const paymentResponse = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${payChanguSecretKey}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        tx_ref: txRef,
        email,
        first_name: firstName,
        last_name: lastName,
        callback_url: `${supabaseUrl}/functions/v1/paychangu-webhook`,
        return_url: `${origin}/payment-success?tx_ref=${txRef}&tier=${tier}`,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.status !== "success") {
      throw new Error(paymentData.message || "PayChangu payment session creation failed");
    }

    // Record payment in database with pending status
    const subscriptionDays = isCustomPayment ? Math.floor((amount / 5000) * 30) : 30;
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      amount,
      currency,
      payment_method: "paychangu",
      transaction_id: txRef,
      status: "pending",
      metadata: { tier, email, mode: paymentData.data?.mode || "live", isCustom: isCustomPayment, subscriptionDays },
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

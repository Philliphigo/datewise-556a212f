import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBSCRIPTION_TIERS = {
  supporter: { usd: 5 },
  premium: { usd: 15 },
  vip: { usd: 30 },
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

    const { amount, currency = 'usd', tier } = await req.json();
    const userId = user.id; // Use verified user ID from JWT
    
    // Validate payment amount matches tier
    validatePayment(tier, amount, currency);

    console.log("Processing Stripe payment:", { amount, currency, tier, userId });

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || "usd",
      metadata: {
        tier,
        userId,
      },
    });

    // Record payment in database
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      amount,
      currency: currency || "USD",
      payment_method: "stripe",
      transaction_id: paymentIntent.id,
      status: "pending",
      metadata: { tier },
    });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
      throw paymentError;
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-stripe-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

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

    const { paymentIntentId } = await req.json();
    const userId = user.id; // Use verified user ID from JWT

    console.log("Verifying payment:", { paymentIntentId, userId });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Update payment status
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("transaction_id", paymentIntentId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Get tier from payment metadata
      const tier = paymentIntent.metadata.tier;

      // Create or update subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          tier,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        }, {
          onConflict: "user_id",
        });

      if (subError) throw subError;

      // Update profile subscription tier
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ subscription_tier: tier })
        .eq("id", userId);

      if (profileError) throw profileError;

      return new Response(
        JSON.stringify({ success: true, status: "completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, status: paymentIntent.status }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-payment:", error);
    
    const safeErrors = ['Authentication required', 'Invalid authentication'];
    let message = 'Payment verification failed. Please contact support if you were charged.';
    if (error.message && safeErrors.some(s => error.message.includes(s))) {
      message = error.message;
    }
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

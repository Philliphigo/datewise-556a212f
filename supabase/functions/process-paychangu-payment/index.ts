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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency, phone, tier, userId, provider } = await req.json();

    console.log("Processing PayChangu payment:", { amount, currency, phone, tier, userId, provider });

    // Create PayChangu payment request
    const paymentResponse = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${payChanguSecretKey}`,
      },
      body: JSON.stringify({
        amount,
        currency: currency || "MWK",
        phone_number: phone,
        provider, // airtel or tnm
        callback_url: `${supabaseUrl}/functions/v1/paychangu-webhook`,
        metadata: {
          tier,
          userId,
        },
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      throw new Error(paymentData.message || "PayChangu payment failed");
    }

    // Record payment in database
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      amount,
      currency: currency || "MWK",
      payment_method: `paychangu_${provider}`,
      transaction_id: paymentData.transaction_id,
      status: "pending",
      metadata: { tier, phone },
    });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
      throw paymentError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: paymentData.transaction_id,
        status: paymentData.status,
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

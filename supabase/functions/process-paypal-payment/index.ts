import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID") as string;
const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") as string;
const paypalBaseUrl = "https://api-m.paypal.com"; // Production URL

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken() {
  const auth = btoa(`${paypalClientId}:${paypalClientSecret}`);
  
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, tier, userId } = await req.json();

    console.log("Processing PayPal payment:", { amount, tier, userId });

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount.toFixed(2),
            },
            description: `DateWise ${tier} Subscription`,
            payee: {
              email_address: "philipchinya@gmail.com",
            },
          },
        ],
        application_context: {
          return_url: `${Deno.env.get("VITE_SUPABASE_URL")}/functions/v1/paypal-success`,
          cancel_url: `${Deno.env.get("VITE_SUPABASE_URL")}/functions/v1/paypal-cancel`,
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order creation failed:", orderData);
      throw new Error(orderData.message || "PayPal order creation failed");
    }

    // Record payment in database
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      amount,
      currency: "USD",
      payment_method: "paypal",
      transaction_id: orderData.id,
      status: "pending",
      metadata: { tier },
    });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
      throw paymentError;
    }

    // Get approval URL
    const approvalUrl = orderData.links.find((link: any) => link.rel === "approve")?.href;

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderData.id,
        approvalUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-paypal-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

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
    // Get webhook payload
    const payload = await req.json();
    const txRef = payload.tx_ref;

    console.log("PayChangu webhook received:", { txRef, event: payload.event });

    if (!txRef) {
      console.error("No tx_ref in webhook payload");
      return new Response("OK", { status: 200 }); // Still return 200 to acknowledge receipt
    }

    // CRITICAL: Always verify transaction status by querying PayChangu API
    // Never trust webhook data alone
    const verifyResponse = await fetch(
      `https://api.paychangu.com/verify-payment/${txRef}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${payChanguSecretKey}`,
          "Accept": "application/json",
        },
      }
    );

    const verificationData = await verifyResponse.json();

    console.log("Payment verification response:", {
      txRef,
      status: verificationData.status,
      paymentStatus: verificationData.data?.status,
    });

    if (!verifyResponse.ok || verificationData.status !== "success") {
      console.error("Payment verification failed:", verificationData);
      return new Response("OK", { status: 200 });
    }

    const paymentStatus = verificationData.data?.status;
    const amount = verificationData.data?.amount;

    // Update payment record in database
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", txRef)
      .single();

    if (fetchError || !payment) {
      console.error("Payment record not found:", txRef, fetchError);
      return new Response("OK", { status: 200 });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: paymentStatus === "successful" ? "completed" : "failed",
        metadata: {
          ...payment.metadata,
          verification: verificationData.data,
          verified_at: new Date().toISOString(),
        },
      })
      .eq("transaction_id", txRef);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      return new Response("OK", { status: 200 });
    }

    // If payment successful, create/update subscription
    if (paymentStatus === "successful") {
      const tier = payment.metadata?.tier;
      const userId = payment.user_id;

      if (tier && userId) {
        // Calculate subscription end date (30 days from now)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        // Create or update subscription
        const { error: subError } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          tier,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        });

        if (subError) {
          console.error("Error updating subscription:", subError);
        }

        // Update user profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ subscription_tier: tier })
          .eq("id", userId);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }

        console.log("Subscription activated:", { userId, tier, txRef });
      }
    }

    // Return 200 OK to acknowledge webhook receipt
    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error in paychangu-webhook:", error);
    // Still return 200 to prevent webhook retries
    return new Response("OK", { status: 200 });
  }
});

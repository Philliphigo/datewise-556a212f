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

type PayChanguWebhookPayload = {
  tx_ref?: string;
  event?: string;
  data?: { tx_ref?: string };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // PayChangu may call the webhook with an empty/invalid body; handle gracefully.
    const rawBody = await req.text();
    if (!rawBody) {
      console.warn("PayChangu webhook received with empty body");
      return new Response("OK", { status: 200 });
    }

    let payload: PayChanguWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as PayChanguWebhookPayload;
    } catch (_e) {
      console.warn("PayChangu webhook received non-JSON body:", rawBody.slice(0, 200));
      return new Response("OK", { status: 200 });
    }

    const txRef = payload?.tx_ref || payload?.data?.tx_ref;

    console.log("PayChangu webhook received:", { txRef, event: payload?.event });

    if (!txRef) {
      console.error("No tx_ref in webhook payload");
      return new Response("OK", { status: 200 }); // Still return 200 to acknowledge receipt
    }

    // CRITICAL: Always verify transaction status by querying PayChangu API
    // Never trust webhook data alone
    const verifyResponse = await fetch(`https://api.paychangu.com/verify-payment/${txRef}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${payChanguSecretKey}`,
        "Accept": "application/json",
      },
    });

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
    const amountFromProvider = Number(verificationData.data?.amount ?? 0);

    const normalizedStatus = String(paymentStatus || "").toLowerCase();
    const isSuccessful = ["successful", "success", "completed"].includes(normalizedStatus);
    const isFailed = ["failed", "cancelled", "canceled"].includes(normalizedStatus);

    const newStatus = isSuccessful ? "completed" : isFailed ? "failed" : "pending";

    // Load the corresponding payment row
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", txRef)
      .single();

    if (fetchError || !payment) {
      console.error("Payment record not found:", txRef, fetchError);
      return new Response("OK", { status: 200 });
    }

    // Prefer provider amount, but fall back to our recorded amount
    const creditedAmount =
      Number.isFinite(amountFromProvider) && amountFromProvider > 0
        ? amountFromProvider
        : Number(payment.amount);

    // Update payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
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

    // If payment successful, handle based on tier type
    if (newStatus === "completed") {
      const tier = payment.metadata?.tier;
      const userId = payment.user_id;
      const subscriptionDays = payment.metadata?.subscriptionDays || 30;

      if (tier && userId) {
        // Wallet top-up
        if (tier === "wallet_topup") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_balance")
            .eq("id", userId)
            .single();

          const currentBalance = profile?.wallet_balance || 0;
          const newBalance = currentBalance + creditedAmount;

          const { error: walletError } = await supabase
            .from("profiles")
            .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", userId);

          if (walletError) {
            console.error("Error updating wallet balance:", walletError);
          }

          await supabase.from("wallet_transactions").insert({
            user_id: userId,
            type: "topup",
            amount: creditedAmount,
            fee: 0,
            net_amount: creditedAmount,
            status: "completed",
            metadata: {
              tx_ref: txRef,
              payment_method: "paychangu",
            },
          });

          console.log("Wallet topped up:", { userId, amount: creditedAmount, newBalance, txRef });
        } else {
          // Subscription payment
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + subscriptionDays);

          const { error: subError } = await supabase.from("subscriptions").upsert({
            user_id: userId,
            tier,
            is_active: true,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (subError) {
            console.error("Error updating subscription:", subError);
          }

          const { error: profileError } = await supabase
            .from("profiles")
            .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
            .eq("id", userId);

          if (profileError) {
            console.error("Error updating profile:", profileError);
          }

          console.log("Subscription activated:", { userId, tier, txRef });
        }
      }
    }

    // Return 200 OK to acknowledge webhook receipt
    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("Error in paychangu-webhook:", error);
    // Still return 200 to prevent webhook retries
    return new Response("OK", { status: 200 });
  }
});

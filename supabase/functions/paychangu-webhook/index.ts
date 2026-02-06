import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const payChanguSecretKey = Deno.env.get("PAYCHANGU_SECRET_KEY") as string;
const payChanguWebhookSecret = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET") as string;
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: track webhook calls per tx_ref
const recentWebhooks = new Map<string, number>();
const WEBHOOK_COOLDOWN_MS = 5000; // 5 second cooldown per tx_ref

// Clean up old entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentWebhooks.entries()) {
    if (now - timestamp > 60000) {
      recentWebhooks.delete(key);
    }
  }
}, 60000);

// Constant-time comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) {
    console.log("Webhook signature or secret missing, skipping signature verification");
    return true; // Allow if no secret configured (backwards compat)
  }
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(payload);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, msgData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    // Constant-time comparison
    const expectedBytes = new TextEncoder().encode(expectedSignature);
    const receivedBytes = new TextEncoder().encode(signature.replace(/^sha256=/, ""));
    
    return timingSafeEqual(expectedBytes, receivedBytes);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests for webhooks
    if (req.method !== "POST") {
      console.warn("Webhook received non-POST request:", req.method);
      return new Response("Method not allowed", { status: 405 });
    }

    // PayChangu may call the webhook with an empty/invalid body; handle gracefully.
    const rawBody = await req.text();
    if (!rawBody) {
      console.warn("PayChangu webhook received with empty body");
      return new Response("OK", { status: 200 });
    }

    // Verify webhook signature if secret is configured
    const signature = req.headers.get("x-paychangu-signature") || req.headers.get("signature");
    if (payChanguWebhookSecret) {
      const isValid = await verifyWebhookSignature(rawBody, signature, payChanguWebhookSecret);
      if (!isValid) {
        console.error("SECURITY: Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
      console.log("Webhook signature verified successfully");
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch (_e) {
      console.warn("PayChangu webhook received non-JSON body:", rawBody.slice(0, 200));
      return new Response("OK", { status: 200 });
    }

    // Extract tx_ref from various possible locations in payload
    const txRef = (payload?.tx_ref as string) || 
                  ((payload?.data as Record<string, unknown>)?.tx_ref as string);

    console.log("PayChangu webhook received:", { 
      txRef, 
      event: payload?.event,
      hasSignature: !!req.headers.get("x-paychangu-signature")
    });

    if (!txRef) {
      console.error("No tx_ref in webhook payload");
      return new Response("OK", { status: 200 }); // Still return 200 to acknowledge receipt
    }

    // Rate limiting: prevent duplicate processing
    const lastCall = recentWebhooks.get(txRef);
    if (lastCall && Date.now() - lastCall < WEBHOOK_COOLDOWN_MS) {
      console.log("Webhook rate limited for tx_ref:", txRef);
      return new Response("OK", { status: 200 });
    }
    recentWebhooks.set(txRef, Date.now());

    // Check if payment already processed (idempotency)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("status, metadata")
      .eq("transaction_id", txRef)
      .single();

    if (existingPayment?.status === "completed") {
      console.log("Payment already completed, skipping:", txRef);
      return new Response("OK", { status: 200 });
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
      verifiedAmount: verificationData.data?.amount,
      verifiedCurrency: verificationData.data?.currency,
    });

    if (!verifyResponse.ok || verificationData.status !== "success") {
      console.error("Payment verification failed:", verificationData);
      return new Response("OK", { status: 200 });
    }

    const paymentStatus = verificationData.data?.status;
    const amountFromProvider = Number(verificationData.data?.amount ?? 0);
    const currencyFromProvider = verificationData.data?.currency || "MWK";

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

    // SECURITY: Validate amount and currency match what we expected
    const expectedAmount = Number(payment.amount);
    const expectedCurrency = payment.currency || "MWK";
    
    if (amountFromProvider > 0 && Math.abs(amountFromProvider - expectedAmount) > 1) {
      console.error("SECURITY: Amount mismatch!", {
        txRef,
        expected: expectedAmount,
        received: amountFromProvider,
      });
      // Update payment as failed due to amount mismatch
      await supabase
        .from("payments")
        .update({
          status: "failed",
          metadata: {
            ...payment.metadata,
            error: "Amount mismatch",
            expected_amount: expectedAmount,
            received_amount: amountFromProvider,
            verified_at: new Date().toISOString(),
          },
        })
        .eq("transaction_id", txRef);
      return new Response("OK", { status: 200 });
    }

    // Prefer provider amount, but fall back to our recorded amount
    const creditedAmount =
      Number.isFinite(amountFromProvider) && amountFromProvider > 0
        ? amountFromProvider
        : Number(payment.amount);

    // Update payment status with idempotency check
    const { error: updateError, data: updatedPayment } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        metadata: {
          ...payment.metadata,
          verification: verificationData.data,
          verified_at: new Date().toISOString(),
          webhook_processed: true,
        },
      })
      .eq("transaction_id", txRef)
      .neq("status", "completed") // Don't update if already completed
      .select()
      .single();

    if (updateError) {
      console.error("Error updating payment (may already be completed):", updateError);
      return new Response("OK", { status: 200 });
    }

    // If no rows updated, payment was already completed
    if (!updatedPayment) {
      console.log("Payment already processed by another request:", txRef);
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
          // Check if transaction already recorded (idempotency)
          const { data: existingTx } = await supabase
            .from("wallet_transactions")
            .select("id")
            .eq("metadata->>tx_ref", txRef)
            .single();

          if (existingTx) {
            console.log("Wallet transaction already recorded:", txRef);
            return new Response("OK", { status: 200 });
          }

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
              verified: true,
            },
          });

          console.log("Wallet topped up:", { userId, amount: creditedAmount, newBalance, txRef });
        } else {
          // Subscription payment
          // Check if subscription already activated for this payment
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id, updated_at")
            .eq("user_id", userId)
            .gte("updated_at", new Date(Date.now() - 60000).toISOString()) // Within last minute
            .single();

          if (existingSub) {
            console.log("Subscription recently updated, checking for duplicate:", txRef);
          }

          const endDate = new Date();
          endDate.setDate(endDate.getDate() + subscriptionDays);

          const { error: subError } = await supabase.from("subscriptions").upsert({
            user_id: userId,
            tier,
            is_active: true,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
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

        // Create notification for successful payment
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment",
          title: tier === "wallet_topup" ? "Wallet Topped Up!" : "Subscription Activated!",
          message: tier === "wallet_topup" 
            ? `MWK ${creditedAmount.toLocaleString()} added to your wallet`
            : `Your ${tier} subscription is now active`,
          data: { tx_ref: txRef, tier, amount: creditedAmount },
        }).then(({ error }) => {
          if (error) console.log("Notification insert skipped (RLS):", error.message);
        });
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

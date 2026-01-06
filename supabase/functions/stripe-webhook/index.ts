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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response("Missing stripe-signature header", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const sessionId = session.id;
        const paymentStatus = session.payment_status;
        const amountTotal = (session.amount_total || 0) / 100;
        const currency = (session.currency || "usd").toUpperCase();
        const userId = session.client_reference_id || undefined;
        let tier = session.metadata?.tier as string | undefined;

        // Fallback: retrieve PaymentIntent metadata if missing on session
        if (!tier && session.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            tier = (pi.metadata?.tier as string) || undefined;
          } catch (e) {
            console.error("Failed to fetch payment intent metadata:", e);
          }
        }

        // Update payment record
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: paymentStatus === "paid" ? "completed" : "failed",
            amount: amountTotal || undefined,
            currency,
            metadata: {
              ...(session.metadata || {}),
              webhook_event_type: event.type,
              checkout_session: session,
              updated_at: new Date().toISOString(),
            },
          })
          .eq("transaction_id", sessionId);

        if (updateError) {
          console.error("Error updating payment record:", updateError);
        }

        // Create/activate subscription if paid and we have identifiers
        if (paymentStatus === "paid" && tier && userId) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);

          const { error: subError } = await supabase.from("subscriptions").upsert({
            user_id: userId,
            tier,
            is_active: true,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
          }, { onConflict: "user_id" });

          if (subError) {
            console.error("Error upserting subscription:", subError);
          }

          const { error: profileError } = await supabase
            .from("profiles")
            .update({ subscription_tier: tier })
            .eq("id", userId);

          if (profileError) {
            console.error("Error updating profile tier:", profileError);
          }
        }

        break;
      }

      case "payment_intent.succeeded": {
        // Optional: in case we prefer to mark by PI id
        const pi = event.data.object as Stripe.PaymentIntent;
        const { error } = await supabase
          .from("payments")
          .update({ status: "completed" })
          .eq("transaction_id", pi.id);
        if (error) {
          // Not critical if we are using session.id as transaction_id
          console.warn("No payment row matched PaymentIntent id; expected session.id instead.");
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Error in stripe-webhook:", err.message || err);
    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }
});

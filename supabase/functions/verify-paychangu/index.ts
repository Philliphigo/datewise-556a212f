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
    // Get authenticated user (optional for admin verification)
    const authHeader = req.headers.get('Authorization');
    
    const { txRef, adminOverride } = await req.json();

    console.log("Verifying PayChangu payment:", { txRef, adminOverride });

    if (!txRef) {
      return new Response(
        JSON.stringify({ error: 'Transaction reference required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment record - no user ownership check for admin
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", txRef)
      .single();

    if (fetchError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-admin requests, verify user owns this payment
    if (!adminOverride && authHeader) {
      const supabaseClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user && user.id !== payment.user_id) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to verify this payment' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const userId = payment.user_id;

    // Already completed?
    if (payment.status === "completed") {
      return new Response(
        JSON.stringify({ success: true, status: "completed", already: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with PayChangu API
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

    console.log("PayChangu verification response:", {
      txRef,
      status: verificationData.status,
      paymentStatus: verificationData.data?.status,
    });

    if (!verifyResponse.ok || verificationData.status !== "success") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "verification_failed",
          message: "Could not verify payment with PayChangu"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentStatus = verificationData.data?.status;

    // Update payment record
    const newStatus = paymentStatus === "successful" ? "completed" : 
                      paymentStatus === "failed" ? "failed" : "pending";

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
      throw updateError;
    }

    // If payment successful, activate subscription
    if (paymentStatus === "successful") {
      const tier = payment.metadata?.tier;
      const subscriptionDays = payment.metadata?.subscriptionDays || 30;

      if (tier) {
        // Calculate subscription end date
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + subscriptionDays);

        // Create or update subscription
        const { error: subError } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          tier,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        }, {
          onConflict: "user_id",
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

        console.log("Subscription activated:", { userId, tier, txRef, endDate });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: paymentStatus === "successful", 
        status: newStatus,
        paychangu_status: paymentStatus 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-paychangu:", error);
    return new Response(
      JSON.stringify({ error: 'Payment verification failed. Please contact support.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

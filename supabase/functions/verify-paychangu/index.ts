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
    const authHeader = req.headers.get('Authorization');
    const { txRef, adminOverride } = await req.json();

    console.log("Verifying PayChangu payment:", { txRef, adminOverride });

    if (!txRef) {
      return new Response(
        JSON.stringify({ error: 'Transaction reference required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", txRef)
      .single();

    if (fetchError || !payment) {
      console.error("Payment not found:", txRef, fetchError);
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

    // Already completed? Return success immediately
    if (payment.status === "completed") {
      console.log("Payment already completed:", txRef);
      return new Response(
        JSON.stringify({ success: true, status: "completed", already: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with PayChangu API
    console.log("Calling PayChangu API for verification...");
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
      httpStatus: verifyResponse.status,
      apiStatus: verificationData.status,
      paymentStatus: verificationData.data?.status,
      message: verificationData.message,
    });

    // Handle API error
    if (!verifyResponse.ok) {
      console.error("PayChangu API error:", verificationData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "verification_failed",
          message: verificationData.message || "Could not verify payment with PayChangu"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the API returned success
    if (verificationData.status !== "success") {
      console.log("PayChangu returned non-success status:", verificationData.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "pending",
          paychangu_status: verificationData.data?.status || "unknown",
          message: "Payment not yet confirmed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentStatus = verificationData.data?.status;
    console.log("Payment status from PayChangu:", paymentStatus);

    // Map PayChangu status to our status
    let newStatus = "pending";
    if (paymentStatus === "successful" || paymentStatus === "success" || paymentStatus === "completed") {
      newStatus = "completed";
    } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
      newStatus = "failed";
    }

    // Update payment record
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

    // If payment successful, activate subscription automatically
    if (newStatus === "completed") {
      const tier = payment.metadata?.tier || "supporter";
      const subscriptionDays = payment.metadata?.subscriptionDays || 30;

      console.log("Activating subscription:", { userId, tier, subscriptionDays });

      // Calculate subscription end date
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + subscriptionDays);

      // Create or update subscription using upsert
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
        console.error("Error creating/updating subscription:", subError);
        // Try insert if upsert fails
        const { error: insertError } = await supabase.from("subscriptions").insert({
          user_id: userId,
          tier,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        });
        if (insertError) {
          console.error("Error inserting subscription:", insertError);
        }
      }

      // Update user profile subscription tier
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          subscription_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      console.log("Subscription activated successfully:", { userId, tier, txRef, endDate: endDate.toISOString() });
    }

    return new Response(
      JSON.stringify({ 
        success: newStatus === "completed", 
        status: newStatus,
        paychangu_status: paymentStatus 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-paychangu:", error);
    return new Response(
      JSON.stringify({ error: 'Payment verification failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

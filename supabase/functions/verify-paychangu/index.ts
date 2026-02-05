import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const payChanguSecretKey = Deno.env.get("PAYCHANGU_SECRET_KEY") as string;
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting for verification requests
const verificationAttempts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_VERIFICATIONS = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const attempts = verificationAttempts.get(key);
  
  if (!attempts || now - attempts.timestamp > RATE_LIMIT_WINDOW) {
    verificationAttempts.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (attempts.count >= MAX_VERIFICATIONS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

// Sanitize tx_ref input
function sanitizeTxRef(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Only allow alphanumeric, dash, underscore
  const sanitized = input.trim().slice(0, 100).replace(/[^a-zA-Z0-9\-_]/g, "");
  return sanitized.length > 0 ? sanitized : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const body = await req.json();
    
    const txRef = sanitizeTxRef(body.txRef);
    const adminOverride = body.adminOverride === true;

    console.log("Verifying PayChangu payment:", { txRef, adminOverride });

    if (!txRef) {
      return new Response(
        JSON.stringify({ error: 'Transaction reference required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    if (!checkRateLimit(txRef)) {
      return new Response(
        JSON.stringify({ error: 'Too many verification attempts. Please wait.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment record
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", txRef)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !payment) {
      console.error("Payment not found:", txRef, fetchError);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
    } else if (adminOverride) {
      // Verify admin role for admin override
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const supabaseClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin authentication' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      
      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: 'Admin privileges required' }),
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
      amount: verificationData.data?.amount,
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
    const verifiedAmount = Number(verificationData.data?.amount || 0);
    const expectedAmount = Number(payment.amount);

    console.log("Payment status from PayChangu:", paymentStatus);

    // SECURITY: Validate amount matches
    if (verifiedAmount > 0 && Math.abs(verifiedAmount - expectedAmount) > 1) {
      console.error("SECURITY: Amount mismatch in verification!", {
        txRef,
        expected: expectedAmount,
        verified: verifiedAmount,
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "failed",
          message: "Payment amount mismatch. Please contact support."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map PayChangu status to our status
    let newStatus = "pending";
    if (paymentStatus === "successful" || paymentStatus === "success" || paymentStatus === "completed") {
      newStatus = "completed";
    } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
      newStatus = "failed";
    }

    // Update payment record with idempotency check
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        metadata: {
          ...payment.metadata,
          verification: verificationData.data,
          verified_at: new Date().toISOString(),
          verified_amount: verifiedAmount,
        },
      })
      .eq("transaction_id", txRef)
      .neq("status", "completed"); // Don't overwrite completed status

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }

    // If payment successful, handle based on tier type
    if (newStatus === "completed") {
      const tier = payment.metadata?.tier || "supporter";
      const subscriptionDays = payment.metadata?.subscriptionDays || 30;
      const amount = verifiedAmount > 0 ? verifiedAmount : expectedAmount;

      // Handle wallet top-up
      if (tier === "wallet_topup") {
        console.log("Processing wallet top-up:", { userId, amount });

        // Check for existing transaction (idempotency)
        const { data: existingTx } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("metadata->>tx_ref", txRef)
          .single();

        if (existingTx) {
          console.log("Wallet transaction already exists:", txRef);
          return new Response(
            JSON.stringify({ success: true, status: "completed", already: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current wallet balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", userId)
          .single();

        const currentBalance = profile?.wallet_balance || 0;
        const newBalance = currentBalance + amount;

        // Update wallet balance
        const { error: walletErr } = await supabase
          .from("profiles")
          .update({ 
            wallet_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (walletErr) {
          console.error("Error updating wallet balance:", walletErr);
        }

        // Record wallet transaction
        await supabase.from("wallet_transactions").insert({
          user_id: userId,
          type: "topup",
          amount,
          fee: 0,
          net_amount: amount,
          status: "completed",
          metadata: {
            tx_ref: txRef,
            payment_method: "paychangu",
            verified: true,
          },
        });

        console.log("Wallet topped up successfully:", { userId, amount, newBalance, txRef });
      } else {
        // Regular subscription handling
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

        console.log("Subscription activated successfully:", { userId, tier, txRef });
      }
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
      JSON.stringify({
        success: false,
        status: "error",
        error: "Payment verification failed. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

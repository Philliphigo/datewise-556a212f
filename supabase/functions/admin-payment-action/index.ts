import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "complete" | "fail";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuthed = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuthed.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, paymentId } = (await req.json()) as {
      action?: Action;
      paymentId?: string;
    };

    if (!action || !paymentId) {
      return new Response(JSON.stringify({ error: "action and paymentId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize admin/moderator
    const { data: isAdmin, error: roleErr1 } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const { data: isModerator, error: roleErr2 } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "moderator",
    });

    if (roleErr1 || roleErr2) {
      console.error("Role check error:", roleErr1 || roleErr2);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin && !isModerator) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load payment
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentErr) {
      console.error("Payment fetch error:", paymentErr);
      return new Response(JSON.stringify({ error: "Failed to load payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fail") {
      const { error: updateErr } = await supabase
        .from("payments")
        .update({
          status: "failed",
          metadata: {
            ...(payment.metadata || {}),
            marked_failed_by: user.id,
            marked_failed_at: new Date().toISOString(),
          },
        })
        .eq("id", paymentId);

      if (updateErr) {
        console.error("Payment fail update error:", updateErr);
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "complete"
    const tier = payment.metadata?.tier || "supporter";
    const subscriptionDays = payment.metadata?.subscriptionDays || 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscriptionDays);

    // Update payment
    const { error: payUpdateErr } = await supabase
      .from("payments")
      .update({
        status: "completed",
        metadata: {
          ...(payment.metadata || {}),
          manual_completion: true,
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        },
      })
      .eq("id", paymentId);

    if (payUpdateErr) {
      console.error("Payment complete update error:", payUpdateErr);
      return new Response(JSON.stringify({ error: payUpdateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle wallet top-up separately
    if (tier === "wallet_topup") {
      console.log("Processing wallet top-up:", { userId: payment.user_id, amount: payment.amount });
      
      // Get current wallet balance
      const { data: profile, error: profileFetchErr } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", payment.user_id)
        .single();

      if (profileFetchErr) {
        console.error("Error fetching profile for wallet update:", profileFetchErr);
        return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentBalance = profile?.wallet_balance || 0;
      const topUpAmount = Number(payment.amount);
      const newBalance = currentBalance + topUpAmount;

      // Update wallet balance
      const { error: walletErr } = await supabase
        .from("profiles")
        .update({ 
          wallet_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.user_id);

      if (walletErr) {
        console.error("Error updating wallet balance:", walletErr);
        return new Response(JSON.stringify({ error: "Failed to update wallet balance" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record wallet transaction
      const { error: txnErr } = await supabase.from("wallet_transactions").insert({
        user_id: payment.user_id,
        type: "topup",
        amount: topUpAmount,
        fee: 0,
        net_amount: topUpAmount,
        status: "completed",
        metadata: {
          tx_ref: payment.transaction_id,
          payment_method: "paychangu",
          payment_id: paymentId,
          completed_by: user.id,
        },
      });

      if (txnErr) {
        console.error("Error recording wallet transaction:", txnErr);
      }

      console.log("Wallet topped up successfully:", { 
        userId: payment.user_id, 
        amount: topUpAmount, 
        newBalance 
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "completed", 
          type: "wallet_topup",
          amount: topUpAmount,
          newBalance,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Regular subscription handling
    // Upsert subscription WITHOUT relying on a unique constraint on user_id
    const { data: existingSub, error: subFetchErr } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", payment.user_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subFetchErr) {
      console.error("Subscription fetch error:", subFetchErr);
    }

    if (existingSub?.id) {
      const { error: subUpdateErr } = await supabase
        .from("subscriptions")
        .update({
          tier,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);

      if (subUpdateErr) {
        console.error("Subscription update error:", subUpdateErr);
      }
    } else {
      const { error: subInsertErr } = await supabase.from("subscriptions").insert({
        user_id: payment.user_id,
        tier,
        is_active: true,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
      });

      if (subInsertErr) {
        console.error("Subscription insert error:", subInsertErr);
      }
    }

    // Update profile tier
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
      .eq("id", payment.user_id);

    if (profileErr) {
      console.error("Profile tier update error:", profileErr);
    }

    return new Response(
      JSON.stringify({ success: true, status: "completed", tier, endDate: endDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in admin-payment-action:", error);
    return new Response(JSON.stringify({ error: error?.message || "Admin payment action failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

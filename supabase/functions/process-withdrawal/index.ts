import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WITHDRAWAL_FEE_PERCENTAGE = 0.05; // 5% withdrawal fee
const MIN_WITHDRAWAL = 500; // Minimum MWK 500

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, provider, phoneNumber } = await req.json();
    const userId = user.id;

    // Validate input
    if (!amount || !provider || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Amount, provider, and phone number are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount < MIN_WITHDRAWAL) {
      return new Response(
        JSON.stringify({ error: `Minimum withdrawal is MWK ${MIN_WITHDRAWAL}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate provider
    if (!['airtel_money', 'tnm_mpamba'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Use airtel_money or tnm_mpamba' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format
    const phoneRegex = provider === 'airtel_money' ? /^099\d{7}$/ : /^088\d{7}$/;
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      const example = provider === 'airtel_money' ? '0991234567' : '0881234567';
      return new Response(
        JSON.stringify({ error: `Invalid phone number for ${provider === 'airtel_money' ? 'Airtel Money' : 'TNM Mpamba'}. Example: ${example}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's current balance
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, name')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userProfile.wallet_balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fee and net amount
    const withdrawalFee = Math.round(amount * WITHDRAWAL_FEE_PERCENTAGE);
    const netAmount = amount - withdrawalFee;

    console.log(`Processing withdrawal: ${amount} MWK for ${userId}. Fee: ${withdrawalFee}, Net: ${netAmount}`);

    // Deduct from user's balance immediately
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ wallet_balance: userProfile.wallet_balance - amount })
      .eq('id', userId);

    if (deductError) {
      throw new Error('Failed to deduct from wallet');
    }

    // Create withdrawal request (pending for admin to process)
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount: amount,
        fee: withdrawalFee,
        net_amount: netAmount,
        provider: provider,
        phone_number: cleanPhone,
        status: 'pending'
      })
      .select()
      .single();

    if (withdrawalError) {
      // Rollback balance
      await supabase
        .from('profiles')
        .update({ wallet_balance: userProfile.wallet_balance })
        .eq('id', userId);
      throw new Error('Failed to create withdrawal request');
    }

    // Record transaction
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'withdrawal',
        amount: -amount,
        fee: withdrawalFee,
        net_amount: -netAmount,
        status: 'pending',
        metadata: { 
          provider, 
          phone_number: cleanPhone, 
          withdrawal_id: withdrawal.id 
        }
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }

    // Record platform earnings from withdrawal fee
    if (transaction) {
      await supabase
        .from('platform_earnings')
        .insert({
          transaction_id: transaction.id,
          amount: withdrawalFee,
          source_type: 'withdrawal_fee'
        });
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'withdrawal_pending',
        title: '💸 Withdrawal Request Submitted',
        message: `Your withdrawal of MWK ${netAmount.toLocaleString()} to ${provider === 'airtel_money' ? 'Airtel Money' : 'TNM Mpamba'} (${cleanPhone}) is being processed.`,
        data: { withdrawal_id: withdrawal.id, amount, net_amount: netAmount }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Withdrawal request submitted! You will receive MWK ${netAmount.toLocaleString()} on ${cleanPhone}`,
        withdrawal_id: withdrawal.id,
        amount: amount,
        fee: withdrawalFee,
        net_amount: netAmount,
        new_balance: userProfile.wallet_balance - amount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in process-withdrawal:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process withdrawal' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

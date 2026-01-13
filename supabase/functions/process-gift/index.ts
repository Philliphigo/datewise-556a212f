import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee

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

    const { recipientId, amount, message } = await req.json();
    const senderId = user.id;

    // Validate input
    if (!recipientId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Recipient and amount are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Minimum gift amount is MWK 100' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (senderId === recipientId) {
      return new Response(
        JSON.stringify({ error: 'You cannot send a gift to yourself' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender's current balance
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('wallet_balance, name')
      .eq('id', senderId)
      .single();

    if (senderError || !senderProfile) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sender profile' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (senderProfile.wallet_balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance. Please top up your wallet.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient profile
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('id, name, wallet_balance')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipientProfile) {
      return new Response(
        JSON.stringify({ error: 'Recipient not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fee and net amount
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE);
    const netAmount = amount - platformFee;

    console.log(`Processing gift: ${amount} MWK from ${senderId} to ${recipientId}. Fee: ${platformFee}, Net: ${netAmount}`);

    // Deduct from sender
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ wallet_balance: senderProfile.wallet_balance - amount })
      .eq('id', senderId);

    if (deductError) {
      throw new Error('Failed to deduct from sender wallet');
    }

    // Credit to recipient (after fee)
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ wallet_balance: recipientProfile.wallet_balance + netAmount })
      .eq('id', recipientId);

    if (creditError) {
      // Rollback sender deduction
      await supabase
        .from('profiles')
        .update({ wallet_balance: senderProfile.wallet_balance })
        .eq('id', senderId);
      throw new Error('Failed to credit recipient wallet');
    }

    // Record sender transaction (gift sent)
    const { data: senderTx, error: senderTxError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: senderId,
        type: 'gift_sent',
        amount: -amount,
        fee: platformFee,
        net_amount: -amount,
        status: 'completed',
        related_user_id: recipientId,
        metadata: { message: message || null, recipient_name: recipientProfile.name }
      })
      .select()
      .single();

    if (senderTxError) {
      console.error('Failed to record sender transaction:', senderTxError);
    }

    // Record recipient transaction (gift received)
    const { error: recipientTxError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: recipientId,
        type: 'gift_received',
        amount: amount,
        fee: platformFee,
        net_amount: netAmount,
        status: 'completed',
        related_user_id: senderId,
        metadata: { message: message || null, sender_name: senderProfile.name }
      });

    if (recipientTxError) {
      console.error('Failed to record recipient transaction:', recipientTxError);
    }

    // Record platform earnings
    if (senderTx) {
      await supabase
        .from('platform_earnings')
        .insert({
          transaction_id: senderTx.id,
          amount: platformFee,
          source_type: 'gift_fee'
        });
    }

    // Create notification for recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'gift_received',
        title: '🎁 You received a gift!',
        message: `${senderProfile.name} sent you MWK ${netAmount.toLocaleString()}${message ? `: "${message}"` : ''}`,
        data: { sender_id: senderId, amount: netAmount, original_amount: amount, fee: platformFee }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Gift of MWK ${netAmount.toLocaleString()} sent successfully!`,
        amount: amount,
        fee: platformFee,
        net_amount: netAmount,
        new_balance: senderProfile.wallet_balance - amount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in process-gift:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process gift' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

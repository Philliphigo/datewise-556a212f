import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIRECT_MESSAGE_FEE = 10000; // 10,000 MWK
const PLATFORM_FEE_RATE = 0.10; // 10% goes to platform

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

    const { recipientId, message } = await req.json();

    if (!recipientId || !message) {
      return new Response(
        JSON.stringify({ error: 'Recipient ID and message are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if users are already matched
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existingMatch) {
      return new Response(
        JSON.stringify({ error: 'You are already matched with this user. Use the regular chat.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check sender's balance
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('wallet_balance, name')
      .eq('id', user.id)
      .single();

    if (senderError || !senderProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not find your profile' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (senderProfile.wallet_balance < DIRECT_MESSAGE_FEE) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient balance. You need MWK ${DIRECT_MESSAGE_FEE.toLocaleString()} to send a direct message.`,
          required: DIRECT_MESSAGE_FEE,
          balance: senderProfile.wallet_balance
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient info
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', recipientId)
      .single();

    // Calculate fees
    const platformFee = Math.round(DIRECT_MESSAGE_FEE * PLATFORM_FEE_RATE);
    const recipientAmount = DIRECT_MESSAGE_FEE - platformFee;

    // Deduct from sender
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ wallet_balance: senderProfile.wallet_balance - DIRECT_MESSAGE_FEE })
      .eq('id', user.id);

    if (deductError) {
      throw new Error('Failed to process payment');
    }

    // Create a match between users so they can continue chatting
    const { data: newMatch, error: matchError } = await supabase
      .from('matches')
      .insert({
        user1_id: user.id,
        user2_id: recipientId
      })
      .select()
      .single();

    if (matchError) {
      // Refund if match creation fails
      await supabase
        .from('profiles')
        .update({ wallet_balance: senderProfile.wallet_balance })
        .eq('id', user.id);
      throw new Error('Failed to create conversation');
    }

    // Send the message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        match_id: newMatch.id,
        sender_id: user.id,
        content: message
      });

    if (messageError) {
      console.error('Message insert error:', messageError);
    }

    // Record transaction for sender
    const { data: transaction } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        type: 'direct_message_fee',
        amount: DIRECT_MESSAGE_FEE,
        fee: platformFee,
        net_amount: -DIRECT_MESSAGE_FEE,
        related_user_id: recipientId,
        metadata: {
          recipient_name: recipientProfile?.name || 'User',
          message_preview: message.substring(0, 50)
        },
        status: 'completed'
      })
      .select()
      .single();

    // Record platform earnings
    if (transaction) {
      await supabase
        .from('platform_earnings')
        .insert({
          transaction_id: transaction.id,
          amount: platformFee,
          source_type: 'direct_message_fee'
        });
    }

    // Send notification to recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'direct_message',
        title: 'New Message',
        message: `${senderProfile.name} paid to message you directly!`
      });

    return new Response(
      JSON.stringify({
        success: true,
        matchId: newMatch.id,
        message: 'Direct message sent successfully'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-direct-message:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send direct message' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

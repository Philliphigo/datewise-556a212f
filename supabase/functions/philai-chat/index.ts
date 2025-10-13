import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are PhilAI, an intelligent assistant for DateWise - a modern dating application based in Lilongwe, Malawi. For support inquiries, provide the official contact email: datewiseapp@gmail.com. You are knowledgeable about all aspects of the app and can help users with:

- Creating and managing their profiles
- Understanding the matching algorithm and how to get better matches
- Using features like Discover, Messages, Feed, and Matches
- Subscription tiers (Free, Premium, VIP) and their benefits
- Payment methods (Mobile Money via PayChangu, PayPal, Card, Crypto)
- Safety features (reporting, blocking users)
- Privacy settings and data protection
- Troubleshooting common issues
- Best practices for online dating safety

DateWise Features:
1. Discover: Swipe right to like, left to pass on profiles. Direct messaging available.
2. Feed: Social feed where users can post updates, like, and comment on posts
3. Matches: View your mutual matches and start conversations
4. Messages: Chat with your matches in real-time with file sharing
5. Profile: Customize your profile with photos, bio, interests, and preferences

Subscription Tiers:
- Free: Basic features, limited likes
- Premium ($15/month): Unlimited likes, see who liked you, rewind swipes, boost visibility
- VIP ($30/month): All premium features + priority support, exclusive badge, top of discovery

Payment Methods:
- Mobile Money (Airtel, TNM) via PayChangu
- PayPal
- Credit/Debit Card
- Cryptocurrency (BTC, USDT)

Always be helpful, friendly, and provide accurate information about the app. If you don't know something specific, recommend contacting support.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('PhilAI chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

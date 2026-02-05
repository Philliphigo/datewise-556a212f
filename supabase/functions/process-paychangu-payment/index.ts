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

const SUBSCRIPTION_TIERS = {
  supporter: { mwk: 5000, usd: 5 },
  premium: { mwk: 15000, usd: 15 },
  vip: { mwk: 30000, usd: 30 },
} as const;

// Rate limiting: track payment attempts per user
const recentAttempts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userAttempts = recentAttempts.get(userId);
  
  if (!userAttempts || now - userAttempts.timestamp > RATE_LIMIT_WINDOW_MS) {
    recentAttempts.set(userId, { count: 1, timestamp: now });
    return true;
  }
  
  if (userAttempts.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }
  
  userAttempts.count++;
  return true;
}

// Input validation
function sanitizeString(input: unknown, maxLength: number = 255): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength).replace(/[<>]/g, "");
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePayment(tier: string, amount: number, currency: string, isCustom: boolean = false): void {
  // For wallet top-ups, just validate minimum amount
  if (tier === 'wallet_topup') {
    if (amount < 100) {
      throw new Error('Minimum top-up is MWK 100');
    }
    if (amount > 1000000) {
      throw new Error('Maximum top-up is MWK 1,000,000');
    }
    return;
  }

  // For custom donations, validate minimum
  if (isCustom) {
    if (amount < 500) {
      throw new Error('Minimum donation is MWK 500');
    }
    if (amount > 1000000) {
      throw new Error('Maximum donation is MWK 1,000,000');
    }
    return;
  }

  const tierPricing = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
  if (!tierPricing) {
    throw new Error('Invalid subscription tier');
  }
  
  const expectedAmount = tierPricing[currency.toLowerCase() as keyof typeof tierPricing];
  if (!expectedAmount || amount !== expectedAmount) {
    throw new Error(`Invalid amount for ${tier}. Expected ${expectedAmount} ${currency}`);
  }
}

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

    const userId = user.id;

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Too many payment attempts. Please wait a minute.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Validate and sanitize inputs
    const amount = Math.floor(Number(body.amount) || 0);
    const currency = sanitizeString(body.currency, 3).toUpperCase() || "MWK";
    const tier = sanitizeString(body.tier, 50);
    const email = sanitizeString(body.email, 255);
    const firstName = sanitizeString(body.firstName, 100);
    const lastName = sanitizeString(body.lastName, 100);
    const phoneNumber = sanitizeString(body.phoneNumber, 20).replace(/\s/g, "");
    const customAmount = body.customAmount ? Math.floor(Number(body.customAmount) || 0) : undefined;
    
    const isCustomPayment = !!customAmount;

    // Validate email format
    if (email && !validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format for Malawi mobile money (if provided)
    if (phoneNumber && phoneNumber.length > 0) {
      const phoneRegex = /^(099|088|0999|0888)\d{6,7}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return new Response(
          JSON.stringify({ error: 'Invalid phone number format. Please use a valid Malawi number (e.g., 0991234567 or 0881234567)' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate amount is positive integer
    if (!Number.isInteger(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tier
    const validTiers = ["supporter", "premium", "vip", "wallet_topup"];
    if (!validTiers.includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate payment amount matches tier (or custom amount)
    validatePayment(tier, amount, currency, isCustomPayment);

    // Generate unique transaction reference with random suffix for extra uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const txRef = `DW-${userId.substring(0, 8)}-${Date.now()}-${randomSuffix}`;

    console.log("Processing PayChangu payment:", { amount, currency, tier, userId, txRef });

    // Create PayChangu hosted checkout session
    // Validate secret key is configured
    if (!payChanguSecretKey) {
      throw new Error("PayChangu secret key not configured");
    }

    const origin = req.headers.get('origin') || 'https://datewise.lovable.app';

    const paymentResponse = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${payChanguSecretKey}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        tx_ref: txRef,
        email: email || user.email || "user@datewise.app",
        first_name: firstName || "DateWise",
        last_name: lastName || "User",
        callback_url: `${supabaseUrl}/functions/v1/paychangu-webhook`,
        return_url: `${origin}/payment-success?tx_ref=${txRef}&tier=${tier}`,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.status !== "success") {
      throw new Error(paymentData.message || "PayChangu payment session creation failed");
    }

    // Record payment in database with pending status
    const subscriptionDays = isCustomPayment ? Math.floor((amount / 5000) * 30) : 30;
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      amount,
      currency,
      payment_method: "paychangu",
      transaction_id: txRef,
      status: "pending",
      metadata: { 
        tier, 
        email: email || user.email, 
        mode: paymentData.data?.mode || "live", 
        isCustom: isCustomPayment, 
        subscriptionDays,
        created_at: new Date().toISOString(),
        origin,
      },
    });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
      throw paymentError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: paymentData.data.checkout_url,
        tx_ref: txRef,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-paychangu-payment:", error);
    
    // Only expose safe, user-friendly error messages
    const safeErrors = [
      'Invalid amount', 'Invalid phone number', 'Minimum donation',
      'Authentication required', 'Invalid authentication', 'Invalid subscription tier',
      'Minimum top-up', 'Maximum top-up', 'Maximum donation', 'Too many payment attempts',
      'Invalid email', 'Invalid tier'
    ];
    
    let message = 'Payment processing failed. Please try again or contact support.';
    if (error.message && safeErrors.some(s => error.message.includes(s))) {
      message = error.message;
    }
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { useEffect, useState, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Loader2, XCircle, Crown, Star, Heart, Calendar, Sparkles, PartyPopper, Gift, Zap, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Sanitize and validate tx_ref from URL
function sanitizeTxRef(ref: string | null): string | null {
  if (!ref) return null;
  // Only allow alphanumeric, dash, underscore - max 100 chars
  const sanitized = ref.trim().slice(0, 100).replace(/[^a-zA-Z0-9\-_]/g, "");
  return sanitized.length > 0 ? sanitized : null;
}

// Sanitize tier name
function sanitizeTier(tier: string | null): string {
  if (!tier) return "supporter";
  const validTiers = ["supporter", "premium", "vip", "wallet_topup"];
  const normalized = tier.toLowerCase().trim();
  return validTiers.includes(normalized) ? normalized : "supporter";
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [subscription, setSubscription] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const verificationInProgress = useRef(false);
  
  // SECURITY: Sanitize URL parameters - never trust client-side data
  const txRef = sanitizeTxRef(searchParams.get("tx_ref"));
  const tier = sanitizeTier(searchParams.get("tier"));

  const fetchSubscriptionDetails = useCallback(async () => {
    if (!user) return null;
    
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return sub;
  }, [user]);

  const verifyPaymentWithPayChangu = useCallback(async (silent = false) => {
    if (!txRef || !user || verificationInProgress.current) {
      if (!txRef || !user) setStatus("failed");
      return;
    }

    verificationInProgress.current = true;
    if (!silent) setIsVerifying(true);

    try {
      // SECURITY: Call server-side verification - never trust client data
      // The edge function validates with PayChangu API directly
      const { data, error } = await supabase.functions.invoke('verify-paychangu', {
        body: { txRef }
      });

      if (error) throw error;

      // Don't log sensitive payment data in production
      if (import.meta.env.DEV) {
        console.log("Verification result:", data?.status);
      }

      if (data.success || data.status === "completed") {
        // Fetch subscription details
        const sub = await fetchSubscriptionDetails();
        setSubscription(sub);
        setStatus("success");
        setShowConfetti(true);
        if (!silent) toast.success("Payment verified successfully! 🎉");
        
        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 5000);
        return true;
      } else if (data.status === "pending" || data.paychangu_status === "pending") {
        if (!silent) {
          setStatus("pending");
          toast.info("Payment is still being processed");
        }
        return false;
      } else {
        if (!silent) {
          setStatus("failed");
          toast.error("Payment verification failed");
        }
        return false;
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      return false;
    } finally {
      verificationInProgress.current = false;
      if (!silent) setIsVerifying(false);
    }
  }, [txRef, user, fetchSubscriptionDetails]);

  // Auto-verify on mount and poll until success
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // SECURITY: If no valid tx_ref, show error immediately
    if (!txRef) {
      setStatus("failed");
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 15; // Poll for up to 30 seconds (15 * 2s)

    const startPolling = async () => {
      // First immediate verification attempt
      const success = await verifyPaymentWithPayChangu(false);
      
      if (success) return;

      // If not immediately successful, start polling
      pollInterval = setInterval(async () => {
        attempts++;
        setVerifyAttempts(attempts);
        
        if (import.meta.env.DEV) {
          console.log(`Verification attempt ${attempts}/${maxAttempts}`);
        }
        
        // SECURITY: Check database status (webhook updates this server-side)
        const { data: payment } = await supabase
          .from("payments")
          .select("status")
          .eq("transaction_id", txRef)
          .single();

        if (payment?.status === "completed") {
          const sub = await fetchSubscriptionDetails();
          setSubscription(sub);
          setStatus("success");
          setShowConfetti(true);
          toast.success("Payment verified successfully! 🎉");
          setTimeout(() => setShowConfetti(false), 5000);
          
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        if (payment?.status === "failed") {
          setStatus("failed");
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        // Try server-side API verification
        const success = await verifyPaymentWithPayChangu(true);
        
        if (success) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        
        if (attempts >= maxAttempts) {
          setStatus("pending");
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 2000);
    };

    startPolling();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, txRef, verifyPaymentWithPayChangu, fetchSubscriptionDetails, navigate]);

  const handleRetryVerification = () => {
    setStatus("loading");
    setVerifyAttempts(0);
    verifyPaymentWithPayChangu(false);
  };

  const getTierIcon = () => {
    switch (tier) {
      case "vip": return Crown;
      case "premium": return Star;
      default: return Heart;
    }
  };

  const getTierGradient = () => {
    switch (tier) {
      case "vip": return "from-yellow-400 via-amber-500 to-orange-500";
      case "premium": return "from-primary via-primary-soft to-pink-500";
      default: return "from-pink-400 via-rose-500 to-red-500";
    }
  };

  const getTierBenefits = () => {
    switch (tier) {
      case "vip":
        return ["Ad-free experience", "Priority support", "VIP badge", "Unlimited likes", "See who likes you", "Advanced filters"];
      case "premium":
        return ["Ad-free experience", "Priority support", "Premium badge", "Extra likes daily", "Read receipts"];
      case "wallet_topup":
        return ["Wallet balance added", "Send gifts", "Direct messages"];
      default:
        return ["Ad-free experience", "Supporter badge", "Extra likes daily"];
    }
  };

  const TierIcon = getTierIcon();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-md relative overflow-hidden">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'][Math.floor(Math.random() * 6)],
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <Card className="liquid-glass rounded-3xl p-8 text-center space-y-6 animate-spring-in">
          {status === "loading" && (
            <>
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Verifying Payment</h1>
                <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
                {verifyAttempts > 0 && (
                  <p className="text-xs text-muted-foreground/60">
                    Checking... ({verifyAttempts}/15)
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </>
          )}

          {status === "success" && (
            <>
              {/* Success Animation */}
              <div className="relative">
                <div className={`w-28 h-28 mx-auto rounded-full bg-gradient-to-br ${getTierGradient()} flex items-center justify-center animate-scale-in shadow-2xl`}>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" style={{ animationDuration: '2s' }} />
                  <TierIcon className="w-14 h-14 text-white drop-shadow-lg" />
                </div>
                
                {/* Floating particles */}
                <div className="absolute top-0 left-1/4 animate-float-up">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="absolute top-4 right-1/4 animate-float-up" style={{ animationDelay: '0.5s' }}>
                  <PartyPopper className="w-5 h-5 text-pink-400" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-transparent">
                  Thank You! 💕
                </h1>
                <p className="text-lg text-muted-foreground">
                  Welcome to {tier?.charAt(0).toUpperCase()}{tier?.slice(1)}!
                </p>
              </div>
              
              {/* Tier Card */}
              <div className={`rounded-2xl p-5 bg-gradient-to-br ${getTierGradient()} text-white shadow-xl`}>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <TierIcon className="w-8 h-8" />
                  <span className="text-2xl font-bold capitalize">{tier} Member</span>
                </div>
                
                {subscription?.end_date && (
                  <div className="flex items-center justify-center gap-2 text-white/90 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>Active until {format(new Date(subscription.end_date), "MMMM d, yyyy")}</span>
                  </div>
                )}

                {/* Benefits List */}
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4" />
                    <span className="font-semibold text-sm">Your Benefits</span>
                  </div>
                  <div className="grid gap-2">
                    {getTierBenefits().map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Zap className="w-3 h-3 text-yellow-300" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button 
                  onClick={() => navigate("/profile")} 
                  className={`w-full bg-gradient-to-r ${getTierGradient()} text-white hover:opacity-90 rounded-2xl h-14 text-lg font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <TierIcon className="w-5 h-5 mr-2" />
                  View My Profile
                </Button>
                <Button 
                  onClick={() => navigate("/discover")} 
                  variant="outline" 
                  className="w-full rounded-2xl h-12 liquid-glass border-white/20"
                >
                  Start Discovering
                </Button>
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-24 h-24 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-warning animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-warning">Almost There!</h1>
                <p className="text-muted-foreground">
                  Your payment is being processed. This usually takes a moment.
                </p>
                <p className="text-sm text-muted-foreground/80">
                  If you've completed payment, click "Verify Now" to check status.
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={handleRetryVerification} 
                  disabled={isVerifying}
                  className="w-full rounded-2xl h-12 gradient-romantic"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Verify Now
                </Button>
                <Button onClick={() => navigate("/profile")} variant="outline" className="w-full rounded-2xl h-12">
                  Go to Profile
                </Button>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-destructive">Payment Issue</h1>
                <p className="text-muted-foreground">
                  We couldn't verify your payment. If money was deducted, please contact support.
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={handleRetryVerification} 
                  disabled={isVerifying}
                  variant="outline"
                  className="w-full rounded-2xl h-12"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Try Verifying Again
                </Button>
                <Button onClick={() => navigate("/donate")} className="w-full gradient-romantic rounded-2xl h-12">
                  Make New Payment
                </Button>
                <Button onClick={() => navigate("/contact")} variant="ghost" className="w-full rounded-2xl h-12">
                  Contact Support
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;

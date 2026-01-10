import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Loader2, XCircle, Crown, Star, Heart, Calendar, Sparkles, PartyPopper, Gift, Zap } from "lucide-react";
import { format } from "date-fns";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [subscription, setSubscription] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const txRef = searchParams.get("tx_ref");
  const tier = searchParams.get("tier");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkPaymentStatus();
  }, [user, txRef]);

  const checkPaymentStatus = async () => {
    if (!txRef || !user) {
      setStatus("failed");
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;
    
    const poll = async () => {
      const { data: payment } = await supabase
        .from("payments")
        .select("status")
        .eq("transaction_id", txRef)
        .single();

      if (payment?.status === "completed") {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        
        setSubscription(sub);
        setStatus("success");
        setShowConfetti(true);
        
        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 5000);
        return;
      }

      if (payment?.status === "failed") {
        setStatus("failed");
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setStatus("pending");
      }
    };

    poll();
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
                  Welcome to {tier?.charAt(0).toUpperCase()}{tier?.slice(1)}!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Thank you for supporting DateWise! 💕
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
                <h1 className="text-2xl font-bold text-warning">Payment Processing</h1>
                <p className="text-muted-foreground">
                  Your payment is being processed. This may take a few minutes.
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Your subscription will be activated once confirmed. You can safely leave this page.
                </p>
              </div>
              <Button onClick={() => navigate("/profile")} className="w-full rounded-2xl h-12">
                Go to Profile
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-destructive">Payment Failed</h1>
                <p className="text-muted-foreground">
                  We couldn't verify your payment. If money was deducted, please contact support.
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => navigate("/donate")} className="w-full gradient-romantic rounded-2xl h-12">
                  Try Again
                </Button>
                <Button onClick={() => navigate("/contact")} variant="outline" className="w-full rounded-2xl h-12">
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
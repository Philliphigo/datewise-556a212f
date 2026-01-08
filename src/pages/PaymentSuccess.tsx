import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Loader2, XCircle, Crown, Star, Heart, Calendar } from "lucide-react";
import { format } from "date-fns";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [subscription, setSubscription] = useState<any>(null);
  
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

    // Poll for payment status (webhook might take a moment)
    let attempts = 0;
    const maxAttempts = 10;
    
    const poll = async () => {
      const { data: payment } = await supabase
        .from("payments")
        .select("status")
        .eq("transaction_id", txRef)
        .single();

      if (payment?.status === "completed") {
        // Fetch subscription details
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        
        setSubscription(sub);
        setStatus("success");
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

  const getTierColor = () => {
    switch (tier) {
      case "vip": return "text-yellow-500";
      case "premium": return "text-primary";
      default: return "text-pink-500";
    }
  };

  const TierIcon = getTierIcon();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card className="glass-card p-8 text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Verifying Payment</h1>
                <p className="text-muted-foreground mt-2">Please wait while we confirm your payment...</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-success">Payment Successful!</h1>
                <p className="text-muted-foreground">Thank you for supporting DateWise</p>
              </div>
              
              <div className="glass p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <TierIcon className={`w-6 h-6 ${getTierColor()}`} />
                  <span className="text-xl font-semibold capitalize">{tier} Member</span>
                </div>
                
                {subscription && (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Active until: {format(new Date(subscription.end_date), "MMMM d, yyyy")}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm text-success font-medium">✨ Ad-free experience activated!</p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button onClick={() => navigate("/profile")} className="w-full gradient-romantic">
                  View Your Profile
                </Button>
                <Button onClick={() => navigate("/discover")} variant="outline" className="w-full">
                  Start Discovering
                </Button>
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-20 h-20 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-warning">Payment Processing</h1>
                <p className="text-muted-foreground mt-2">
                  Your payment is being processed. This may take a few minutes.
                  Your subscription will be activated once confirmed.
                </p>
              </div>
              <Button onClick={() => navigate("/profile")} className="w-full">
                Go to Profile
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-destructive">Payment Failed</h1>
                <p className="text-muted-foreground mt-2">
                  We couldn't verify your payment. If money was deducted, please contact support.
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => navigate("/donate")} className="w-full gradient-romantic">
                  Try Again
                </Button>
                <Button onClick={() => navigate("/contact")} variant="outline" className="w-full">
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
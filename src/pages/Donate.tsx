import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, CreditCard, Smartphone, DollarSign, Bitcoin, Check, Crown, Star, Zap } from "lucide-react";

const Donate = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8299009369780520";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const tiers = [
    {
      id: "supporter",
      name: "Supporter",
      price: "MWK 5,000/month",
      priceUsd: "$5/month",
      icon: Heart,
      color: "text-pink-500",
      features: ["Support DateWise", "Special Badge", "Our Gratitude"],
    },
    {
      id: "premium",
      name: "Premium",
      price: "MWK 15,000/month",
      priceUsd: "$15/month",
      icon: Star,
      color: "text-primary",
      features: [
        "Unlimited Likes",
        "See Who Liked You",
        "Rewind Swipes",
        "Boost Visibility",
        "Premium Badge",
      ],
    },
    {
      id: "vip",
      name: "VIP",
      price: "MWK 30,000/month",
      priceUsd: "$30/month",
      icon: Crown,
      color: "text-yellow-500",
      features: [
        "All Premium Features",
        "Priority Support",
        "Exclusive VIP Badge",
        "Top of Discovery",
        "Advanced Filters",
      ],
    },
  ];

  const getTierAmount = (tierId: string, currency: 'MWK' | 'USD' = 'MWK') => {
    const prices: { [key: string]: { MWK: number; USD: number } } = {
      supporter: { MWK: 5000, USD: 5 },
      premium: { MWK: 15000, USD: 15 },
      vip: { MWK: 30000, USD: 30 },
    };
    return prices[tierId]?.[currency] || 0;
  };

  const handleMobileMoneyPayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTier) {
      toast({
        title: "Missing Information",
        description: "Please select a tier",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your mobile money phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format for Malawi (Airtel: 099x, TNM: 088x)
    const phoneRegex = /^(099|088)\d{7}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Malawi mobile number (e.g., 0991234567 for Airtel or 0881234567 for TNM)",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke("process-paychangu-payment", {
        body: {
          amount: getTierAmount(selectedTier, 'MWK'),
          currency: "MWK",
          tier: selectedTier,
          email: user.email || "donor@example.com",
          firstName: profile?.name?.split(" ")[0] || "Donor",
          lastName: profile?.name?.split(" ").slice(1).join(" ") || "User",
        },
      });

      if (error) throw error;

      if (data.success && data.checkout_url) {
        toast({
          title: "Redirecting to Payment",
          description: "You'll be redirected to complete your payment securely",
        });
        window.location.href = data.checkout_url;
      }
    } catch (error: any) {
      console.error("Mobile money payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTier) {
      toast({
        title: "Missing Information",
        description: "Please select a tier",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-paypal-payment", {
        body: {
          amount: getTierAmount(selectedTier, 'USD'),
          tier: selectedTier,
        },
      });

      if (error) throw error;

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch (error: any) {
      console.error("PayPal payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate PayPal payment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handleStripePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTier) {
      toast({
        title: "Missing Information",
        description: "Please select a tier",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-stripe-payment", {
        body: {
          amount: getTierAmount(selectedTier, 'USD'),
          currency: "USD",
          tier: selectedTier,
        },
      });

      if (error) throw error;

      if (data?.success && data?.checkout_url) {
        toast({
          title: "Payment Processing",
          description: "Redirecting to secure payment page...",
        });
        window.location.href = data.checkout_url as string;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process card payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold gradient-text">Support DateWise</h1>
            <p className="text-lg text-muted-foreground">
              Choose a plan that works for you and unlock premium features
            </p>
          </div>

          {/* Subscription Tiers */}
          <div className="grid md:grid-cols-3 gap-4">
            {tiers.map((tier) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;
              return (
                <Card
                  key={tier.id}
                  className={`glass-card p-6 cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-primary scale-105"
                      : "hover:scale-102"
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Icon className={`w-8 h-8 ${tier.color}`} />
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold">{tier.name}</h3>
                      <p className="text-3xl font-bold gradient-text mt-2">{tier.price}</p>
                      <p className="text-sm text-muted-foreground mt-1">{tier.priceUsd}</p>
                    </div>

                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Payment Methods */}
          {selectedTier && (
            <Card className="glass-card p-6 animate-scale-in">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Choose Payment Method
              </h2>

              <Tabs defaultValue="mobile" className="space-y-6">
                <TabsList className="grid grid-cols-4 glass">
                  <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
                  <TabsTrigger value="card">Card</TabsTrigger>
                  <TabsTrigger value="paypal">PayPal</TabsTrigger>
                  <TabsTrigger value="crypto">Crypto</TabsTrigger>
                </TabsList>

                {/* Mobile Money */}
                <TabsContent value="mobile" className="space-y-4">
                  <div className="space-y-4">
                    <div className="glass p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm font-semibold mb-2">Amount to Pay:</p>
                      <p className="text-3xl font-bold gradient-text">
                        MWK {getTierAmount(selectedTier, 'MWK').toLocaleString()}
                      </p>
                    </div>

                    <div className="glass p-4 rounded-lg space-y-2">
                      <p className="text-sm font-medium">Secure Payment Gateway</p>
                      <p className="text-xs text-muted-foreground">
                        You'll be redirected to a secure payment page where you can choose:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                        <li>• Airtel Money</li>
                        <li>• TNM Mpamba</li>
                        <li>• Bank Transfer</li>
                      </ul>
                    </div>
                    
                    <Button
                      onClick={handleMobileMoneyPayment}
                      disabled={processing}
                      className="w-full gradient-romantic text-white"
                      size="lg"
                    >
                      <Smartphone className="w-5 h-5 mr-2" />
                      {processing ? "Redirecting..." : "Proceed to Payment"}
                    </Button>

                    <div className="glass p-3 rounded-lg text-xs text-muted-foreground">
                      <p className="font-semibold mb-1">How it works:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Click "Proceed to Payment" button</li>
                        <li>You'll be redirected to PayChangu's secure checkout</li>
                        <li>Select your payment method (Airtel, TNM, or Bank)</li>
                        <li>Complete the payment on your phone or online</li>
                        <li>Return to DateWise after successful payment</li>
                      </ol>
                    </div>
                  </div>
                </TabsContent>

                {/* Card Payment */}
                <TabsContent value="card" className="space-y-4">
                  <Card className="glass p-6 text-center space-y-4">
                    <CreditCard className="w-12 h-12 mx-auto text-primary" />
                    <p className="text-muted-foreground">
                      Secure card payments powered by Stripe
                    </p>
                    <Button
                      onClick={handleStripePayment}
                      disabled={processing}
                      className="w-full gradient-romantic text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay with Card
                    </Button>
                  </Card>
                </TabsContent>

                {/* PayPal */}
                <TabsContent value="paypal" className="space-y-4">
                  <Card className="glass p-6 text-center space-y-4">
                    <DollarSign className="w-12 h-12 mx-auto text-primary" />
                    <p className="text-muted-foreground">
                      You will be redirected to PayPal to complete your payment securely
                    </p>
                    <Button
                      onClick={handlePayPalPayment}
                      disabled={processing}
                      className="w-full gradient-romantic text-white"
                    >
                      {processing ? "Processing..." : "Continue with PayPal"}
                    </Button>
                  </Card>
                </TabsContent>

                {/* Crypto */}
                <TabsContent value="crypto" className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">
                      Send crypto to the addresses below and verify your payment
                    </p>
                    <Card className="glass p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Bitcoin (BTC)</h3>
                      </div>
                      <code className="text-xs break-all text-muted-foreground block select-all">
                        bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                      </code>
                    </Card>
                    <Card className="glass p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">USDT (TRC20)</h3>
                      </div>
                      <code className="text-xs break-all text-muted-foreground block select-all">
                        TJRyWwFs9wTFGZg3JbrVriFbNfCug5tDeC
                      </code>
                    </Card>
                    <p className="text-xs text-center text-muted-foreground">
                      After sending payment, contact support with your transaction ID
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default Donate;

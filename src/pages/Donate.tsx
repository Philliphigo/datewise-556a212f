import { useState } from "react";
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

  const handleMobileMoneyPayment = async (provider: "airtel" | "tnm") => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTier || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a tier and enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-paychangu-payment", {
        body: {
          amount: getTierAmount(selectedTier, 'MWK'),
          currency: "MWK",
          phone: phoneNumber,
          tier: selectedTier,
          provider,
        },
      });

      if (error) throw error;

      toast({
        title: "Payment Initiated",
        description: `Please check your phone to complete the ${provider.toUpperCase()} payment`,
      });
    } catch (error: any) {
      console.error("Mobile money payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process mobile money payment",
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

      toast({
        title: "Payment Processing",
        description: "Redirecting to secure payment page...",
      });
      
      // In production, you would redirect to Stripe checkout
      console.log("Stripe payment intent:", data);
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

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g., 0999123456 or 0888123456"
                        className="glass"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your mobile money number (Airtel or TNM Mpamba)
                      </p>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleMobileMoneyPayment("airtel")}
                        disabled={processing || !phoneNumber}
                        className="w-full gradient-romantic text-white"
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        {processing ? "Processing..." : "Pay with Airtel Money"}
                      </Button>

                      <Button
                        onClick={() => handleMobileMoneyPayment("tnm")}
                        disabled={processing || !phoneNumber}
                        className="w-full gradient-romantic text-white"
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        {processing ? "Processing..." : "Pay with TNM Mpamba"}
                      </Button>
                    </div>

                    <div className="glass p-3 rounded-lg text-xs text-muted-foreground">
                      <p className="font-semibold mb-1">How it works:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Enter your Airtel Money or TNM Mpamba number</li>
                        <li>Click the payment button for your provider</li>
                        <li>You'll receive a prompt on your phone to authorize the payment</li>
                        <li>Enter your PIN to complete the transaction</li>
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

          {/* Watermark */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">by Phil</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Donate;

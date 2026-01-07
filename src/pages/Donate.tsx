import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, CreditCard, Smartphone, DollarSign, Bitcoin, Check, Crown, Star, Zap, Clock } from "lucide-react";

const Donate = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile" | "card" | "paypal" | "crypto">("mobile");

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
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const phoneRegex = /^(099|088)\d{7}$/;
    if (!phoneRegex.test(cleanPhone)) {
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
          phoneNumber: cleanPhone,
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

  const ComingSoonCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <Card className="glass-card p-6 text-center space-y-4 opacity-60">
      <div className="w-16 h-16 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>
      <div className="flex items-center justify-center gap-2 text-primary">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Coming Soon</span>
      </div>
    </Card>
  );

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

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { id: "mobile", label: "Mobile Money", icon: Smartphone },
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "paypal", label: "PayPal", icon: DollarSign },
                  { id: "crypto", label: "Crypto", icon: Bitcoin },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === method.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                    }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Mobile Money - Active */}
              {paymentMethod === "mobile" && (
                <div className="space-y-4">
                  <div className="glass p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-semibold mb-2">Amount to Pay:</p>
                    <p className="text-3xl font-bold gradient-text">
                      MWK {getTierAmount(selectedTier, 'MWK').toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Money Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 0991234567 (Airtel) or 0881234567 (TNM)"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your Airtel Money (099x) or TNM Mpamba (088x) number
                    </p>
                  </div>

                  <div className="glass p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Secure Payment Gateway</p>
                    <p className="text-xs text-muted-foreground">
                      You'll be redirected to a secure payment page where you can complete:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Airtel Money</li>
                      <li>• TNM Mpamba</li>
                      <li>• Bank Transfer</li>
                    </ul>
                  </div>
                  
                  <Button
                    onClick={handleMobileMoneyPayment}
                    disabled={processing || !phoneNumber.trim()}
                    className="w-full gradient-romantic text-white"
                    size="lg"
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    {processing ? "Redirecting..." : "Proceed to Payment"}
                  </Button>

                  <div className="glass p-3 rounded-lg text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Enter your mobile money number above</li>
                      <li>Click "Proceed to Payment" button</li>
                      <li>You'll be redirected to PayChangu's secure checkout</li>
                      <li>Select your payment method (Airtel, TNM, or Bank)</li>
                      <li>Complete the payment on your phone or online</li>
                      <li>Return to DateWise after successful payment</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Card Payment - Coming Soon */}
              {paymentMethod === "card" && (
                <ComingSoonCard
                  icon={CreditCard}
                  title="Card Payments"
                  description="Pay with Visa, Mastercard, or other cards. We're working on integrating this payment method."
                />
              )}

              {/* PayPal - Coming Soon */}
              {paymentMethod === "paypal" && (
                <ComingSoonCard
                  icon={DollarSign}
                  title="PayPal"
                  description="Pay securely with your PayPal account. This feature will be available soon."
                />
              )}

              {/* Crypto - Coming Soon */}
              {paymentMethod === "crypto" && (
                <ComingSoonCard
                  icon={Bitcoin}
                  title="Cryptocurrency"
                  description="Pay with Bitcoin, USDT, or other cryptocurrencies. Coming soon!"
                />
              )}
            </Card>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default Donate;

import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Heart, CreditCard, Smartphone, DollarSign, Bitcoin, Check, Crown, Star, Zap } from "lucide-react";

const Donate = () => {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  const tiers = [
    {
      id: "supporter",
      name: "Supporter",
      price: "$5/month",
      icon: Heart,
      color: "text-pink-500",
      features: ["Support DateWise", "Special Badge", "Our Gratitude"],
    },
    {
      id: "premium",
      name: "Premium",
      price: "$15/month",
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
      price: "$30/month",
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

  const handlePayment = async (method: string) => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      toast({
        title: "Payment Processing",
        description: `Your ${method} payment is being processed. You'll receive a confirmation shortly.`,
      });
    }, 2000);
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
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="Enter your phone number"
                        className="glass"
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Button
                        onClick={() => handlePayment("Airtel Money")}
                        disabled={processing}
                        className="w-full gradient-romantic text-white"
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        Pay with Airtel
                      </Button>

                      <Button
                        onClick={() => handlePayment("TNM Mpamba")}
                        disabled={processing}
                        className="w-full gradient-romantic text-white"
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        Pay with Mpamba
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Card Payment */}
                <TabsContent value="card" className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        placeholder="1234 5678 9012 3456"
                        className="glass"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          className="glass"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePayment("Card")}
                      disabled={processing}
                      className="w-full gradient-romantic text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Securely
                    </Button>
                  </div>
                </TabsContent>

                {/* PayPal */}
                <TabsContent value="paypal" className="space-y-4">
                  <Card className="glass p-6 text-center space-y-4">
                    <DollarSign className="w-12 h-12 mx-auto text-primary" />
                    <p className="text-muted-foreground">
                      You will be redirected to PayPal to complete your payment
                    </p>
                    <Button
                      onClick={() => handlePayment("PayPal")}
                      disabled={processing}
                      className="w-full gradient-romantic text-white"
                    >
                      Continue with PayPal
                    </Button>
                  </Card>
                </TabsContent>

                {/* Crypto */}
                <TabsContent value="crypto" className="space-y-4">
                  <div className="space-y-3">
                    <Card className="glass p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Bitcoin (BTC)</h3>
                      </div>
                      <code className="text-xs break-all text-muted-foreground block">
                        bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                      </code>
                    </Card>
                    <Card className="glass p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">USDT (TRC20)</h3>
                      </div>
                      <code className="text-xs break-all text-muted-foreground block">
                        TJRyWwFs9wTFGZg3JbrVriFbNfCug5tDeC
                      </code>
                    </Card>
                    <Button
                      onClick={() => handlePayment("Crypto")}
                      disabled={processing}
                      className="w-full gradient-romantic text-white"
                    >
                      I've Sent Payment
                    </Button>
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

import { useState } from "react";
import { CreditCard, Loader2, Smartphone, Plus, CheckCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface TopUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export const TopUpDialog = ({ isOpen, onClose, onSuccess }: TopUpDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"amount" | "method">("amount");

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    const num = parseInt(value) || 0;
    setCustomAmount(value);
    if (num >= 100) {
      setAmount(num);
    }
  };

  const handleContinue = () => {
    if (amount < 100) {
      toast({
        title: "Minimum amount",
        description: "Minimum top-up is MWK 100",
        variant: "destructive",
      });
      return;
    }
    setStep("method");
  };

  const handlePayChangu = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      const response = await supabase.functions.invoke("process-paychangu-payment", {
        body: {
          amount,
          currency: "MWK",
          email: user.email,
          name: profile?.name || "User",
          tier: "wallet_topup",
          subscriptionDays: 0,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("amount");
    setAmount(1000);
    setCustomAmount("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "amount" ? (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Plus className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  Top Up Wallet
                </DialogTitle>
                <DialogDescription>
                  Add funds to your wallet for gifts and direct messages.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Preset Amounts */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Select Amount (MWK)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={amount === preset && !customAmount ? "default" : "outline"}
                        className="rounded-xl h-14 text-base font-semibold touch-manipulation"
                        onClick={() => handleAmountSelect(preset)}
                      >
                        {preset >= 1000 ? `${(preset / 1000).toFixed(preset % 1000 === 0 ? 0 : 1)}K` : preset}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Or enter custom amount
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount (min 100)"
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="rounded-xl h-12"
                    min={100}
                  />
                </div>

                {/* Amount Summary */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">You will top up</span>
                    <span className="text-2xl font-bold text-primary">
                      MWK {amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  disabled={amount < 100}
                  className="w-full h-14 rounded-2xl text-base font-semibold touch-manipulation"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  Payment Method
                </DialogTitle>
                <DialogDescription>
                  Choose how you want to pay for MWK {amount.toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-6">
                {/* PayChangu Option */}
                <button
                  onClick={handlePayChangu}
                  disabled={isLoading}
                  className="w-full p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-center gap-4 touch-manipulation disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                    <Smartphone className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Mobile Money / PayChangu</h3>
                    <p className="text-sm text-muted-foreground">
                      Airtel Money, TNM Mpamba, Visa, Mastercard
                    </p>
                  </div>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Info */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/50 text-sm">
                  <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Secure & Instant</p>
                    <p className="text-muted-foreground">
                      Your balance will be updated automatically after payment.
                    </p>
                  </div>
                </div>

                {/* Back Button */}
                <Button
                  variant="outline"
                  onClick={() => setStep("amount")}
                  className="w-full h-12 rounded-2xl"
                  disabled={isLoading}
                >
                  Back to Amount
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

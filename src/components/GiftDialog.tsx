import { useState, useEffect } from "react";
import { Gift, Loader2, Sparkles, Heart, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface GiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];
const PLATFORM_FEE = 0.10; // 10%

export const GiftDialog = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  onSuccess 
}: GiftDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [senderBalance, setSenderBalance] = useState(0);

  const fee = Math.round(amount * PLATFORM_FEE);
  const recipientReceives = amount - fee;

  // Fetch balance when dialog opens
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user || !isOpen) return;
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      if (data) {
        setSenderBalance(data.wallet_balance || 0);
      }
    };
    fetchBalance();
  }, [user, isOpen]);

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

  const handleSendGift = async () => {
    if (amount < 100) {
      toast({
        title: "Minimum amount",
        description: "Minimum gift amount is MWK 100",
        variant: "destructive",
      });
      return;
    }

    if (amount > senderBalance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance. Please top up your wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('process-gift', {
        body: {
          recipientId,
          amount,
          message: message.trim() || null
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send gift');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send gift');
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        toast({
          title: "🎁 Gift Sent!",
          description: `${recipientName} will receive MWK ${recipientReceives.toLocaleString()}`,
        });
        onSuccess?.();
        onClose();
        setShowSuccess(false);
        setAmount(500);
        setMessage("");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send gift",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div 
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.6 }}
                 className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-6"
               >
                 <Gift className="w-12 h-12 text-primary-foreground" />
               </motion.div>
               <h3 className="text-2xl font-bold text-center mb-2">Gift Sent!</h3>
               <p className="text-muted-foreground text-center">
                 {recipientName} will be so happy
               </p>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0, x: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    y: -100 - Math.random() * 100,
                    x: (Math.random() - 0.5) * 200
                  }}
                  transition={{ 
                    duration: 1.5 + Math.random(),
                    delay: Math.random() * 0.5
                  }}
                  className="absolute"
                  style={{ 
                    left: `${20 + Math.random() * 60}%`,
                    bottom: '30%'
                  }}
                >
                  {['💖', '✨', '🎁', '💝', '🌟'][Math.floor(Math.random() * 5)]}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Gift className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  Send Gift to {recipientName}
                </DialogTitle>
                <DialogDescription>
                  Send real money to show your appreciation. A 10% platform fee applies.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Balance Display */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                  <span className="text-sm text-muted-foreground">Your Balance</span>
                  <span className="font-bold text-lg">MWK {senderBalance.toLocaleString()}</span>
                </div>

                {/* Preset Amounts */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Select Amount
                  </label>
                   <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                     {PRESET_AMOUNTS.map((preset) => (
                       <Button
                         key={preset}
                         type="button"
                         variant={amount === preset && !customAmount ? "default" : "outline"}
                         className="rounded-xl h-14 text-base font-semibold touch-manipulation"
                         onClick={() => handleAmountSelect(preset)}
                       >
                         {preset >= 1000 ? `${preset / 1000}K` : preset}
                       </Button>
                     ))}
                   </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Or enter custom amount (MWK)
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="rounded-xl h-12"
                    min={100}
                  />
                </div>

                {/* Fee Breakdown */}
                <div className="space-y-2 p-4 bg-muted/30 rounded-2xl text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gift amount</span>
                    <span>MWK {amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform fee (10%)</span>
                    <span>-MWK {fee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>{recipientName} receives</span>
                    <span className="text-primary">MWK {recipientReceives.toLocaleString()}</span>
                  </div>
                </div>

                {/* Optional Message */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Add a message (optional)
                  </label>
                  <Textarea
                    placeholder="You're amazing! 💖"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                 {/* Send Button */}
                 <div className="sticky bottom-0 pt-4 pb-1 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                   <Button
                     onClick={handleSendGift}
                     disabled={isLoading || amount < 100 || amount > senderBalance}
                     className="w-full h-14 rounded-2xl text-base font-semibold touch-manipulation"
                   >
                     {isLoading ? (
                       <>
                         <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                         Sending...
                       </>
                     ) : (
                       <>
                         <Gift className="w-5 h-5 mr-2" />
                         Send MWK {amount.toLocaleString()}
                       </>
                     )}
                   </Button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

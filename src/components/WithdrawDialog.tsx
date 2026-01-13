import { useState } from "react";
import { ArrowUpRight, Loader2, Phone, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface WithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess?: () => void;
}

type Provider = 'airtel_money' | 'tnm_mpamba';

const WITHDRAWAL_FEE = 0.05; // 5%
const MIN_WITHDRAWAL = 500;

export const WithdrawDialog = ({ isOpen, onClose, balance, onSuccess }: WithdrawDialogProps) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const numericAmount = parseInt(amount) || 0;
  const fee = Math.round(numericAmount * WITHDRAWAL_FEE);
  const netAmount = numericAmount - fee;

  const handleWithdraw = async () => {
    if (!provider) {
      toast({
        title: "Select provider",
        description: "Please select Airtel Money or TNM Mpamba",
        variant: "destructive",
      });
      return;
    }

    if (numericAmount < MIN_WITHDRAWAL) {
      toast({
        title: "Minimum withdrawal",
        description: `Minimum withdrawal is MWK ${MIN_WITHDRAWAL}`,
        variant: "destructive",
      });
      return;
    }

    if (numericAmount > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance",
        variant: "destructive",
      });
      return;
    }

    const phoneRegex = provider === 'airtel_money' ? /^099\d{7}$/ : /^088\d{7}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      const example = provider === 'airtel_money' ? '0991234567' : '0881234567';
      toast({
        title: "Invalid phone number",
        description: `Please enter a valid ${provider === 'airtel_money' ? 'Airtel' : 'TNM'} number (e.g., ${example})`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('process-withdrawal', {
        body: {
          amount: numericAmount,
          provider,
          phoneNumber: phoneNumber.replace(/\s/g, '')
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process withdrawal');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to process withdrawal');
      }

      toast({
        title: "💸 Withdrawal Requested!",
        description: `MWK ${netAmount.toLocaleString()} will be sent to ${phoneNumber}`,
      });

      onSuccess?.();
      onClose();
      setAmount("");
      setProvider(null);
      setPhoneNumber("");

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowUpRight className="w-6 h-6 text-primary" strokeWidth={1.5} />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Withdraw to Airtel Money or TNM Mpamba. A 5% processing fee applies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Balance Display */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span className="font-bold text-lg">MWK {balance.toLocaleString()}</span>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Select Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={provider === 'airtel_money' ? 'default' : 'outline'}
                className="h-16 rounded-2xl flex flex-col gap-1"
                onClick={() => {
                  setProvider('airtel_money');
                  setPhoneNumber('099');
                }}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs">Airtel Money</span>
              </Button>
              <Button
                type="button"
                variant={provider === 'tnm_mpamba' ? 'default' : 'outline'}
                className="h-16 rounded-2xl flex flex-col gap-1"
                onClick={() => {
                  setProvider('tnm_mpamba');
                  setPhoneNumber('088');
                }}
              >
                <Phone className="w-5 h-5" />
                <span className="text-xs">TNM Mpamba</span>
              </Button>
            </div>
          </div>

          {/* Phone Number */}
          {provider && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder={provider === 'airtel_money' ? '0991234567' : '0881234567'}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-xl h-12"
                maxLength={10}
              />
            </motion.div>
          )}

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Amount (MWK)
            </label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl h-12 text-lg"
              min={MIN_WITHDRAWAL}
              max={balance}
            />
            <div className="flex justify-between mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(String(Math.floor(balance / 2)))}
                className="text-xs"
              >
                50%
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(String(balance))}
                className="text-xs"
              >
                Max
              </Button>
            </div>
          </div>

          {/* Fee Breakdown */}
          {numericAmount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2 p-4 bg-muted/30 rounded-2xl text-sm"
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground">Withdrawal amount</span>
                <span>MWK {numericAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Processing fee (5%)</span>
                <span>-MWK {fee.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>You'll receive</span>
                <span className="text-primary">MWK {netAmount.toLocaleString()}</span>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleWithdraw}
            disabled={isLoading || numericAmount < MIN_WITHDRAWAL || numericAmount > balance || !provider || !phoneNumber}
            className="w-full h-14 rounded-2xl text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5 mr-2" />
                Withdraw MWK {netAmount.toLocaleString() || '0'}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Withdrawals are processed within 24 hours
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

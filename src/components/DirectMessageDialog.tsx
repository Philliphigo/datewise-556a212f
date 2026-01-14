import { useState } from "react";
import { MessageSquare, Loader2, Send, Wallet, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface DirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  senderBalance: number;
  onSuccess?: () => void;
}

const DIRECT_MESSAGE_FEE = 10000; // 10,000 MWK

export const DirectMessageDialog = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  senderBalance,
  onSuccess 
}: DirectMessageDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canAfford = senderBalance >= DIRECT_MESSAGE_FEE;

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (!canAfford) {
      toast({
        title: "Insufficient balance",
        description: "Please top up your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-direct-message', {
        body: {
          recipientId,
          message: message.trim()
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send message');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      toast({
        title: "✉️ Message Sent!",
        description: `Your message was delivered to ${recipientName}. You can now chat freely!`,
      });

      onSuccess?.();
      onClose();
      setMessage("");
      
      // Navigate to the new chat
      navigate(`/messages?match=${data.matchId}`);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
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
            <MessageSquare className="w-6 h-6 text-primary" strokeWidth={1.5} />
            Message {recipientName}
          </DialogTitle>
          <DialogDescription>
            Skip the wait! Pay to start a conversation instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Fee Info */}
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Direct Message Fee</span>
              <span className="text-xl font-bold text-primary">MWK {DIRECT_MESSAGE_FEE.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This creates a conversation so you can chat freely afterwards.
            </p>
          </div>

          {/* Balance Check */}
          <div className={`flex items-center justify-between p-4 rounded-2xl ${canAfford ? 'bg-muted/50' : 'bg-destructive/10'}`}>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Your Balance</span>
            </div>
            <span className={`font-bold ${canAfford ? '' : 'text-destructive'}`}>
              MWK {senderBalance.toLocaleString()}
            </span>
          </div>

          {!canAfford && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-destructive/10 rounded-2xl"
            >
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Insufficient Balance</p>
                <p className="text-sm text-muted-foreground">
                  You need MWK {(DIRECT_MESSAGE_FEE - senderBalance).toLocaleString()} more to send a direct message.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-xl"
                  onClick={() => {
                    onClose();
                    navigate('/wallet');
                  }}
                >
                  Top Up Wallet
                </Button>
              </div>
            </motion.div>
          )}

          {/* Message Input */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Your Message
            </label>
            <Textarea
              placeholder={`Hi ${recipientName}, I noticed your profile and...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-xl resize-none"
              rows={4}
              maxLength={500}
              disabled={!canAfford}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {message.length}/500
            </p>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isLoading || !message.trim() || !canAfford}
            className="w-full h-14 rounded-2xl text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send for MWK {DIRECT_MESSAGE_FEE.toLocaleString()}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Once sent, you'll be matched and can chat freely forever.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

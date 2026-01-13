import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { WithdrawDialog } from "./WithdrawDialog";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  net_amount: number;
  fee: number;
  status: string;
  created_at: string;
  metadata: {
    sender_name?: string;
    recipient_name?: string;
    message?: string;
  };
}

export const WalletCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      // Fetch balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBalance(profile.wallet_balance || 0);
      }

      // Fetch recent transactions
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`user_id.eq.${user.id},related_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txs) {
        setTransactions(txs as Transaction[]);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'gift_received' || amount > 0) {
      return <ArrowDownLeft className="w-4 h-4 text-success" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-destructive" />;
  };

  const getTransactionLabel = (tx: Transaction) => {
    switch (tx.type) {
      case 'gift_sent':
        return `Gift to ${tx.metadata?.recipient_name || 'User'}`;
      case 'gift_received':
        return `Gift from ${tx.metadata?.sender_name || 'User'}`;
      case 'withdrawal':
        return 'Withdrawal';
      case 'deposit':
        return 'Deposit';
      default:
        return tx.type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-3xl overflow-hidden">
        {/* Balance Section */}
        <div className="bg-gradient-to-br from-primary via-primary to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-medium opacity-90">Wallet Balance</span>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold mb-1"
          >
            MWK {balance.toLocaleString()}
          </motion.div>
          <p className="text-sm opacity-80">Available for gifts & withdrawals</p>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => navigate('/donate')}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-xl h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Top Up
            </Button>
            <Button
              onClick={() => setShowWithdraw(true)}
              disabled={balance < 500}
              className="flex-1 bg-white text-primary hover:bg-white/90 rounded-xl h-11"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </div>
        </div>

        {/* Recent Transactions */}
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4" strokeWidth={1.5} />
              Recent Activity
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No transactions yet</p>
              <p className="text-sm">Send or receive gifts to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {getTransactionIcon(tx.type, tx.net_amount)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getTransactionLabel(tx)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.net_amount > 0 ? 'text-success' : 'text-foreground'}`}>
                    {tx.net_amount > 0 ? '+' : ''}MWK {Math.abs(tx.net_amount).toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WithdrawDialog
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        balance={balance}
        onSuccess={fetchWalletData}
      />
    </>
  );
};

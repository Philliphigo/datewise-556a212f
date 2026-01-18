import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Plus, 
  Loader2, 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Smartphone,
  RefreshCw,
  Gift,
  MessageCircle,
  CreditCard,
  TrendingUp,
  Filter
} from "lucide-react";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import { TopUpDialog } from "@/components/TopUpDialog";
import { motion } from "framer-motion";
import { format } from "date-fns";

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

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  provider: string;
  phone_number: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  failure_reason: string | null;
}

const WalletPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchWalletData();
  }, [user, navigate]);

  const fetchWalletData = useCallback(async () => {
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

      // Fetch all transactions
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`user_id.eq.${user.id},related_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (txs) {
        setTransactions(txs as Transaction[]);
      }

      // Fetch withdrawals
      const { data: wds } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (wds) {
        setWithdrawals(wds as Withdrawal[]);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    toast({ title: "Refreshed", description: "Wallet data updated" });
  };


  const getTransactionIcon = (type: string, amount: number) => {
    switch (type) {
      case 'gift_sent':
        return <Gift className="w-4 h-4 text-pink-500" strokeWidth={1.5} />;
      case 'gift_received':
        return <Gift className="w-4 h-4 text-success" strokeWidth={1.5} />;
      case 'topup':
      case 'deposit':
        return <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />;
      case 'direct_message_fee':
        return <MessageCircle className="w-4 h-4 text-primary" strokeWidth={1.5} />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-destructive" strokeWidth={1.5} />;
      default:
        if (amount > 0) {
          return <ArrowDownLeft className="w-4 h-4 text-success" strokeWidth={1.5} />;
        }
        return <ArrowUpRight className="w-4 h-4 text-destructive" strokeWidth={1.5} />;
    }
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
      case 'topup':
        return 'Wallet Top-up';
      case 'direct_message_fee':
        return `DM to ${tx.metadata?.recipient_name || 'User'}`;
      default:
        return tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTransactionCategory = (type: string) => {
    switch (type) {
      case 'gift_sent':
      case 'gift_received':
        return { label: 'Gift', color: 'bg-pink-500/10 text-pink-500' };
      case 'topup':
      case 'deposit':
        return { label: 'Top-up', color: 'bg-success/10 text-success' };
      case 'direct_message_fee':
        return { label: 'DM', color: 'bg-primary/10 text-primary' };
      case 'withdrawal':
        return { label: 'Withdraw', color: 'bg-destructive/10 text-destructive' };
      default:
        return { label: 'Other', color: 'bg-muted text-muted-foreground' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/20 text-success border-0"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-0"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-28 max-w-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">My Wallet</h1>
              <p className="text-sm text-muted-foreground">Manage your funds</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.5} />
            </Button>
          </div>

          {/* Balance Card */}
          <Card className="rounded-3xl overflow-hidden border-0 shadow-ambient">
            <div className="bg-gradient-to-br from-primary via-primary to-pink-500 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm font-medium opacity-90">Available Balance</span>
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
                  onClick={() => setShowTopUp(true)}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-2xl h-12 touch-manipulation"
                >
                  <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Top Up
                </Button>
                <Button
                  onClick={() => setShowWithdraw(true)}
                  disabled={balance < 500}
                  className="flex-1 bg-white text-primary hover:bg-white/90 rounded-2xl h-12 touch-manipulation"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Withdraw
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowTopUp(true)}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all text-left touch-manipulation"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-success" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-sm">Mobile Money</h3>
              <p className="text-xs text-muted-foreground">Airtel, TNM</p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowTopUp(true)}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all text-left touch-manipulation"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-sm">PayChangu</h3>
              <p className="text-xs text-muted-foreground">Cards & More</p>
            </motion.button>
          </div>

          {/* Transaction History Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5" strokeWidth={1.5} />
                Transaction History
              </h2>
              <Badge variant="outline" className="text-xs">
                {transactions.length} transactions
              </Badge>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full rounded-2xl h-11 p-1 bg-muted/50">
                <TabsTrigger value="all" className="flex-1 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  All
                </TabsTrigger>
                <TabsTrigger value="topups" className="flex-1 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Top-ups
                </TabsTrigger>
                <TabsTrigger value="gifts" className="flex-1 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Gifts
                </TabsTrigger>
                <TabsTrigger value="withdrawals" className="flex-1 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Withdrawals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <Card className="rounded-3xl border-0 shadow-ambient">
                  <CardContent className="p-4">
                    {transactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No transactions yet</p>
                        <p className="text-sm">Your activity will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((tx, index) => {
                          const category = getTransactionCategory(tx.type);
                          return (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  {getTransactionIcon(tx.type, tx.net_amount)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{getTransactionLabel(tx)}</p>
                                    <Badge className={`text-[10px] px-1.5 py-0 h-4 ${category.color} border-0`}>
                                      {category.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                                  </p>
                                  {tx.metadata?.message && (
                                    <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-[180px]">"{tx.metadata.message}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`font-semibold ${tx.net_amount > 0 ? 'text-success' : 'text-foreground'}`}>
                                  {tx.net_amount > 0 ? '+' : ''}MWK {Math.abs(tx.net_amount).toLocaleString()}
                                </div>
                                {tx.fee > 0 && (
                                  <p className="text-xs text-muted-foreground">Fee: MWK {tx.fee.toLocaleString()}</p>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="topups" className="mt-4">
                <Card className="rounded-3xl border-0 shadow-ambient">
                  <CardContent className="p-4">
                    {transactions.filter(tx => tx.type === 'topup' || tx.type === 'deposit').length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No top-ups yet</p>
                        <p className="text-sm">Add funds to your wallet to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions
                          .filter(tx => tx.type === 'topup' || tx.type === 'deposit')
                          .map((tx, index) => (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="flex items-center justify-between p-4 rounded-2xl bg-success/5 hover:bg-success/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                                  <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Wallet Top-up</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-success">
                                  +MWK {tx.net_amount.toLocaleString()}
                                </div>
                                {getStatusBadge(tx.status)}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gifts" className="mt-4">
                <Card className="rounded-3xl border-0 shadow-ambient">
                  <CardContent className="p-4">
                    {transactions.filter(tx => tx.type === 'gift_sent' || tx.type === 'gift_received').length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No gifts yet</p>
                        <p className="text-sm">Send or receive gifts to see them here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions
                          .filter(tx => tx.type === 'gift_sent' || tx.type === 'gift_received')
                          .map((tx, index) => {
                            const isReceived = tx.type === 'gift_received';
                            return (
                              <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={`flex items-center justify-between p-4 rounded-2xl ${isReceived ? 'bg-success/5' : 'bg-pink-500/5'} hover:opacity-80 transition-colors`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full ${isReceived ? 'bg-success/10' : 'bg-pink-500/10'} flex items-center justify-center`}>
                                    <Gift className={`w-4 h-4 ${isReceived ? 'text-success' : 'text-pink-500'}`} strokeWidth={1.5} />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{getTransactionLabel(tx)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                                    </p>
                                    {tx.metadata?.message && (
                                      <p className="text-xs text-muted-foreground mt-1 italic max-w-[200px] truncate">"{tx.metadata.message}"</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-semibold ${isReceived ? 'text-success' : 'text-foreground'}`}>
                                    {isReceived ? '+' : '-'}MWK {Math.abs(tx.net_amount).toLocaleString()}
                                  </div>
                                  {tx.fee > 0 && (
                                    <p className="text-xs text-muted-foreground">Fee: MWK {tx.fee.toLocaleString()}</p>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="withdrawals" className="mt-4">
                <Card className="rounded-3xl border-0 shadow-ambient">
                  <CardContent className="p-4">
                    {withdrawals.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ArrowUpRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No withdrawals yet</p>
                        <p className="text-sm">Your withdrawal history will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.map((wd, index) => (
                          <motion.div
                            key={wd.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="p-4 rounded-2xl bg-muted/30"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {wd.provider === 'airtel_money' ? (
                                  <Smartphone className="w-4 h-4 text-primary" />
                                ) : (
                                  <Phone className="w-4 h-4 text-primary" />
                                )}
                                <span className="font-medium">
                                  {wd.provider === 'airtel_money' ? 'Airtel Money' : 'TNM Mpamba'}
                                </span>
                              </div>
                              {getStatusBadge(wd.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{wd.phone_number}</span>
                              <span className="font-semibold">MWK {wd.net_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                              <span>{format(new Date(wd.created_at), 'MMM d, yyyy h:mm a')}</span>
                              {wd.fee > 0 && <span>Fee: MWK {wd.fee.toLocaleString()}</span>}
                            </div>
                            {wd.failure_reason && (
                              <p className="text-xs text-destructive mt-2">{wd.failure_reason}</p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>

      <WithdrawDialog
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        balance={balance}
        onSuccess={fetchWalletData}
      />

      <TopUpDialog
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        onSuccess={fetchWalletData}
      />
    </Layout>
  );
};

export default WalletPage;

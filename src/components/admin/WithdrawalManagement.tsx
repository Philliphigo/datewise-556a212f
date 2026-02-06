import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowUpRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Phone, 
  Smartphone,
  RefreshCw,
  Search,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  provider: string;
  phone_number: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  failure_reason: string | null;
  user_name?: string;
  user_email?: string;
}

export const WithdrawalManagement = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [failDialog, setFailDialog] = useState<Withdrawal | null>(null);
  const [failureReason, setFailureReason] = useState("");

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(w => w.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p.name]));
        
        const enrichedData = data.map(w => ({
          ...w,
          user_name: profileMap.get(w.user_id) || 'Unknown'
        }));

        setWithdrawals(enrichedData as Withdrawal[]);
      } else {
        setWithdrawals([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawal: Withdrawal) => {
    setProcessing(withdrawal.id);
    try {
      // Update withdrawal status
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      if (error) throw error;

      // Also update the corresponding wallet_transaction status
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('metadata->>withdrawal_id', withdrawal.id);

      if (txError) {
        console.error("Failed to update wallet transaction:", txError);
      }

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id,
        type: 'withdrawal_completed',
        title: '💸 Withdrawal Complete!',
        message: `MWK ${withdrawal.net_amount.toLocaleString()} has been sent to ${withdrawal.phone_number}`,
        data: { withdrawal_id: withdrawal.id, amount: withdrawal.net_amount }
      });

      toast({
        title: "✅ Withdrawal Approved",
        description: `MWK ${withdrawal.net_amount.toLocaleString()} marked as sent to ${withdrawal.phone_number}`,
      });

      fetchWithdrawals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!failDialog) return;
    
    setProcessing(failDialog.id);
    try {
      // Update withdrawal status
      const { error: wdError } = await supabase
        .from('withdrawals')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          failure_reason: failureReason || 'Transaction failed'
        })
        .eq('id', failDialog.id);

      if (wdError) throw wdError;

      // Also update the corresponding wallet_transaction status
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'failed',
          metadata: {
            withdrawal_id: failDialog.id,
            failure_reason: failureReason || 'Transaction failed',
            refunded: true,
            refunded_at: new Date().toISOString()
          }
        })
        .eq('metadata->>withdrawal_id', failDialog.id);

      if (txError) {
        console.error("Failed to update wallet transaction:", txError);
      }

      // Refund user's balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', failDialog.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ wallet_balance: profile.wallet_balance + failDialog.amount })
          .eq('id', failDialog.user_id);
      }

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: failDialog.user_id,
        type: 'withdrawal_failed',
        title: '❌ Withdrawal Failed',
        message: `Your withdrawal of MWK ${failDialog.amount.toLocaleString()} was not processed. The funds have been returned to your wallet.`,
        data: { withdrawal_id: failDialog.id, amount: failDialog.amount, reason: failureReason }
      });

      toast({
        title: "❌ Withdrawal Rejected",
        description: `MWK ${failDialog.amount.toLocaleString()} refunded to user`,
      });

      setFailDialog(null);
      setFailureReason("");
      fetchWithdrawals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
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

  const filteredWithdrawals = withdrawals.filter(w => 
    w.phone_number.includes(searchQuery) || 
    w.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingTotal = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.net_amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-0 shadow-ambient">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{withdrawals.filter(w => w.status === 'pending').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-ambient">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold">MWK {pendingTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-ambient">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
              <p className="text-2xl font-bold">
                {withdrawals.filter(w => 
                  w.status === 'completed' && 
                  new Date(w.processed_at || '').toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-0 shadow-ambient">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              {['pending', 'completed', 'failed', 'all'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="rounded-xl capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchWithdrawals} className="rounded-xl">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals List */}
      <Card className="rounded-2xl border-0 shadow-ambient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Withdrawal Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No withdrawals found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((wd) => (
                <div
                  key={wd.id}
                  className="p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {wd.provider === 'airtel_money' ? (
                          <Smartphone className="w-5 h-5 text-primary" strokeWidth={1.5} />
                        ) : (
                          <Phone className="w-5 h-5 text-primary" strokeWidth={1.5} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{wd.user_name}</p>
                          {getStatusBadge(wd.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {wd.provider === 'airtel_money' ? 'Airtel Money' : 'TNM Mpamba'} • {wd.phone_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(wd.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">MWK {wd.net_amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Amount: {wd.amount.toLocaleString()} • Fee: {wd.fee.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {wd.status === 'pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 rounded-xl bg-success hover:bg-success/90"
                        onClick={() => handleApprove(wd)}
                        disabled={processing === wd.id}
                      >
                        {processing === wd.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Sent
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={() => setFailDialog(wd)}
                        disabled={processing === wd.id}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject & Refund
                      </Button>
                    </div>
                  )}

                  {wd.failure_reason && (
                    <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-xl">
                      Reason: {wd.failure_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!failDialog} onOpenChange={() => setFailDialog(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              The user will be refunded MWK {failDialog?.amount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter reason for rejection..."
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className="rounded-xl"
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setFailDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl"
                onClick={handleReject}
                disabled={processing === failDialog?.id}
              >
                {processing === failDialog?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Reject & Refund'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, RefreshCw, CreditCard, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  metadata: any;
  created_at: string;
}

export const PaymentManagement = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Payment[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url");

      if (error) throw error;
      return data.reduce((acc: any, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
    },
  });

  const handleVerifyPayment = async (payment: Payment) => {
    if (!payment.transaction_id) {
      toast.error("No transaction ID to verify");
      return;
    }

    setProcessingId(payment.id);

    try {
      // Call verify edge function with service role
      const { data, error } = await supabase.functions.invoke('verify-paychangu', {
        body: { txRef: payment.transaction_id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Payment verified and completed!");
      } else {
        toast.info(`Payment status: ${data.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (error: any) {
      console.error("Verify error:", error);
      toast.error("Failed to verify payment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualComplete = async (payment: Payment) => {
    setProcessingId(payment.id);

    try {
      // Update payment status
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ 
          status: "completed",
          metadata: {
            ...payment.metadata,
            manual_completion: true,
            completed_at: new Date().toISOString(),
          }
        })
        .eq("id", payment.id);

      if (paymentError) throw paymentError;

      // Activate subscription
      const tier = payment.metadata?.tier || "supporter";
      const subscriptionDays = payment.metadata?.subscriptionDays || 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + subscriptionDays);

      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: payment.user_id,
          tier,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        });

      if (subError) throw subError;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ subscription_tier: tier })
        .eq("id", payment.user_id);

      if (profileError) throw profileError;

      toast.success("Payment marked as completed and subscription activated!");
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (error: any) {
      console.error("Manual complete error:", error);
      toast.error("Failed to complete payment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFailed = async (payment: Payment) => {
    setProcessingId(payment.id);

    try {
      const { error } = await supabase
        .from("payments")
        .update({ 
          status: "failed",
          metadata: {
            ...payment.metadata,
            marked_failed_at: new Date().toISOString(),
          }
        })
        .eq("id", payment.id);

      if (error) throw error;

      toast.success("Payment marked as failed");
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (error: any) {
      console.error("Mark failed error:", error);
      toast.error("Failed to update payment");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-600">Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-600">Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-600">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = payments?.filter(p => p.status === "pending").length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="liquid-glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span>Payment Management</span>
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-600 ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-payments"] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{profiles?.[payment.user_id]?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{payment.metadata?.email || payment.user_id.slice(0, 8)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {payment.currency} {payment.amount.toLocaleString()}
                    </span>
                    {payment.metadata?.tier && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {payment.metadata.tier}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{payment.payment_method}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(payment.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyPayment(payment)}
                          disabled={processingId === payment.id}
                        >
                          {processingId === payment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="default" disabled={processingId === payment.id}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark Payment as Completed?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will activate the user's subscription. Only do this if you've confirmed the payment was received.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleManualComplete(payment)}>
                                Complete Payment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={processingId === payment.id}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark Payment as Failed?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will mark the payment as failed. The user will need to try again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleMarkFailed(payment)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Mark as Failed
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                    {payment.status === "completed" && (
                      <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                    )}
                    {payment.status === "failed" && (
                      <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

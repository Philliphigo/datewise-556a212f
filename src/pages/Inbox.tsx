import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Bell, CreditCard, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SystemInbox } from "@/components/SystemInbox";
import { format } from "date-fns";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  created_at: string | null;
}

interface SubscriptionRow {
  id: string;
  tier: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
}

const Inbox = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionRow | null>(null);
  const [profileTier, setProfileTier] = useState<string>("free");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAll = async () => {
    try {
      const [
        { data: notifData, error: notifErr },
        { data: payData, error: payErr },
        { data: subData, error: subErr },
        { data: profileData, error: profileErr },
      ] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, type, title, message, created_at, read")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("payments")
          .select("id, amount, currency, payment_method, status, transaction_id, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("subscriptions")
          .select("id, tier, start_date, end_date, is_active")
          .eq("user_id", user!.id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user!.id)
          .maybeSingle(),
      ]);

      if (notifErr) throw notifErr;
      if (payErr) throw payErr;
      if (subErr) throw subErr;
      if (profileErr) throw profileErr;

      setNotifications((notifData as any) || []);
      setPayments((payData as any) || []);
      setActiveSubscription((subData as any) || null);
      setProfileTier(profileData?.subscription_tier || "free");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to load inbox",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentTier = useMemo(() => {
    return activeSubscription?.tier || profileTier || "free";
  }, [activeSubscription?.tier, profileTier]);

  const markNotificationRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // silent
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
      <header className="container mx-auto px-4 pt-6 max-w-4xl">
        <Button variant="ghost" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-bold">Inbox & Records</h1>
          <p className="text-muted-foreground">See your notifications and all your payment records.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-32 max-w-4xl">
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Current Tier
            </CardTitle>
            <CardDescription>Your membership status.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge className="capitalize">{currentTier}</Badge>
              {activeSubscription?.end_date && (
                <span className="text-sm text-muted-foreground">
                  Expires {format(new Date(activeSubscription.end_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/donate")}
            >
              Upgrade
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList className="liquid-glass h-auto p-1 flex-wrap">
            <TabsTrigger value="notifications" className="rounded-lg">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg">System Updates</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>Tap an item to mark it as read.</CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">No notifications yet.</div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => !n.read && markNotificationRead(n.id)}
                        className="w-full text-left p-4 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{n.title}</p>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(n.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <Badge variant={n.read ? "secondary" : "default"} className="shrink-0">
                            {n.read ? "Read" : "New"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>System Updates</CardTitle>
                <CardDescription>Announcements from the team.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[520px]">
                  <SystemInbox />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your last 50 transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">No payments yet.</div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl border border-border/60 glass">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold">
                              {p.currency} {Number(p.amount).toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {p.payment_method} • {p.status}
                            </p>
                            {p.transaction_id && (
                              <p className="text-xs text-muted-foreground mt-1">Txn: {p.transaction_id}</p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="bg-border/50 my-6" />

                <Button variant="outline" className="rounded-xl w-full" onClick={fetchAll}>
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
};

export default Inbox;

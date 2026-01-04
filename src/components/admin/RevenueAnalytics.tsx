import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CreditCard, Gift, Tv } from "lucide-react";
import { format } from "date-fns";

interface RevenueAnalyticsProps {
  payments: any[];
  totalRevenue: number;
}

export const RevenueAnalytics = ({ payments, totalRevenue }: RevenueAnalyticsProps) => {
  // Calculate revenue by source
  const subscriptionRevenue = payments
    .filter((p) => p.payment_method === "stripe" || p.payment_method === "paypal")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const donationRevenue = payments
    .filter((p) => p.metadata?.type === "donation")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Placeholder for ad revenue (would come from ad network API)
  const adRevenue = 0;

  const revenueBreakdown = [
    { label: "Subscriptions", value: subscriptionRevenue, icon: CreditCard, color: "text-primary" },
    { label: "Donations", value: donationRevenue, icon: Gift, color: "text-success" },
    { label: "Ad Revenue", value: adRevenue, icon: Tv, color: "text-accent" },
  ];

  // Monthly trend (simplified)
  const thisMonthPayments = payments.filter((p) => {
    const paymentDate = new Date(p.created_at);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  });
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="liquid-glass col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="liquid-glass col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">${thisMonthRevenue.toFixed(2)}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-xs text-success">{thisMonthPayments.length} transactions</span>
            </div>
          </CardContent>
        </Card>

        {revenueBreakdown.slice(0, 2).map((item) => (
          <Card key={item.label} className="liquid-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${item.value.toFixed(2)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Progress Bar */}
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueBreakdown.map((item) => {
              const percentage = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ${item.value.toFixed(2)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-primary transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Recent Payments
            <Badge variant="outline">{payments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 15).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.status === "completed" ? "bg-success/10" : "bg-warning/10"
                    }`}>
                      <DollarSign className={`w-5 h-5 ${
                        payment.status === "completed" ? "text-success" : "text-warning"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">${Number(payment.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_method} • {format(new Date(payment.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

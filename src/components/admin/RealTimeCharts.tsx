import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Heart, 
  MessageSquare, 
  DollarSign,
  RefreshCw,
  Loader2,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface DailyData {
  date: string;
  signups: number;
  matches: number;
  messages: number;
  revenue: number;
}

export const RealTimeCharts = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [totals, setTotals] = useState({
    signups: 0,
    matches: 0,
    messages: 0,
    revenue: 0,
    signupsChange: 0,
    matchesChange: 0,
  });
  const [revenueBreakdown, setRevenueBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    fetchChartData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => fetchChartData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => fetchChartData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchChartData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => fetchChartData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChartData = async () => {
    setRefreshing(true);
    try {
      const days = 7;
      const dailyData: DailyData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();

        const [signups, matches, messages, payments] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true })
            .gte("created_at", start).lte("created_at", end),
          supabase.from("matches").select("*", { count: "exact", head: true })
            .gte("created_at", start).lte("created_at", end),
          supabase.from("messages").select("*", { count: "exact", head: true })
            .gte("created_at", start).lte("created_at", end),
          supabase.from("payments").select("amount")
            .eq("status", "completed")
            .gte("created_at", start).lte("created_at", end),
        ]);

        const dayRevenue = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        dailyData.push({
          date: format(date, "MMM d"),
          signups: signups.count || 0,
          matches: matches.count || 0,
          messages: messages.count || 0,
          revenue: dayRevenue,
        });
      }

      setChartData(dailyData);

      // Calculate totals and changes
      const totalSignups = dailyData.reduce((sum, d) => sum + d.signups, 0);
      const totalMatches = dailyData.reduce((sum, d) => sum + d.matches, 0);
      const totalMessages = dailyData.reduce((sum, d) => sum + d.messages, 0);
      const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);

      // Calculate week-over-week changes
      const lastWeekStart = subDays(new Date(), 14).toISOString();
      const lastWeekEnd = subDays(new Date(), 7).toISOString();

      const { count: lastWeekSignups } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastWeekStart)
        .lte("created_at", lastWeekEnd);

      const { count: lastWeekMatches } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastWeekStart)
        .lte("created_at", lastWeekEnd);

      const signupsChange = lastWeekSignups 
        ? ((totalSignups - (lastWeekSignups || 0)) / (lastWeekSignups || 1)) * 100 
        : 0;
      const matchesChange = lastWeekMatches 
        ? ((totalMatches - (lastWeekMatches || 0)) / (lastWeekMatches || 1)) * 100 
        : 0;

      setTotals({
        signups: totalSignups,
        matches: totalMatches,
        messages: totalMessages,
        revenue: totalRevenue,
        signupsChange,
        matchesChange,
      });

      // Fetch revenue breakdown
      const { data: paymentTypes } = await supabase
        .from("payments")
        .select("payment_method, amount")
        .eq("status", "completed");

      const breakdown: Record<string, number> = {};
      paymentTypes?.forEach((p) => {
        const method = p.payment_method || "other";
        breakdown[method] = (breakdown[method] || 0) + Number(p.amount);
      });

      const colors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--warning))"];
      setRevenueBreakdown(
        Object.entries(breakdown).map(([name, value], i) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: colors[i % colors.length],
        }))
      );

    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Real-Time Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Live platform performance data</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchChartData}
          disabled={refreshing}
          className="rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="liquid-glass">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-primary" />
              {totals.signupsChange > 0 ? (
                <Badge className="bg-success/10 text-success border-0">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{totals.signupsChange.toFixed(0)}%
                </Badge>
              ) : totals.signupsChange < 0 ? (
                <Badge className="bg-destructive/10 text-destructive border-0">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {totals.signupsChange.toFixed(0)}%
                </Badge>
              ) : null}
            </div>
            <p className="text-2xl font-bold mt-2">{totals.signups}</p>
            <p className="text-xs text-muted-foreground">New signups (7d)</p>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Heart className="w-8 h-8 text-destructive" />
              {totals.matchesChange > 0 ? (
                <Badge className="bg-success/10 text-success border-0">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{totals.matchesChange.toFixed(0)}%
                </Badge>
              ) : null}
            </div>
            <p className="text-2xl font-bold mt-2">{totals.matches}</p>
            <p className="text-xs text-muted-foreground">New matches (7d)</p>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardContent className="pt-4">
            <MessageSquare className="w-8 h-8 text-info" />
            <p className="text-2xl font-bold mt-2">{totals.messages}</p>
            <p className="text-xs text-muted-foreground">Messages (7d)</p>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardContent className="pt-4">
            <DollarSign className="w-8 h-8 text-success" />
            <p className="text-2xl font-bold mt-2">${totals.revenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Revenue (7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-lg">User Growth</CardTitle>
            <CardDescription>Daily signups over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="hsl(var(--primary))"
                    fill="url(#signupGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Matches & Messages Chart */}
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-lg">Engagement</CardTitle>
            <CardDescription>Matches and messages activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Line
                    type="monotone"
                    dataKey="matches"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="hsl(var(--info))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--info))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-xs">Matches</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-info" />
                <span className="text-xs">Messages</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--success))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Sources</CardTitle>
            <CardDescription>Breakdown by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueBreakdown.length > 0 ? (
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <p>No revenue data available</p>
              </div>
            )}
            {revenueBreakdown.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {revenueBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-xs">{item.name}: ${item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

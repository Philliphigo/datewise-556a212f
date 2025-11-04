import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  TrendingUp,
  Loader2,
  MessageSquare,
  Ban,
  Heart,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  totalRevenue: number;
  pendingReports: number;
  totalPosts: number;
  totalMessages: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMatches: 0,
    totalRevenue: 0,
    pendingReports: 0,
    totalPosts: 0,
    totalMessages: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges to access this dashboard.",
          variant: "destructive",
        });
        navigate("/discover");
        return;
      }

      setIsAdmin(true);
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/discover");
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch statistics
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: matchCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });

      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      const { count: messageCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      const { count: reportCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed");

      const totalRevenue = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalMatches: matchCount || 0,
        totalRevenue,
        pendingReports: reportCount || 0,
        totalPosts: postCount || 0,
        totalMessages: messageCount || 0,
      });

      // Fetch recent users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, name, verified, created_at, subscription_tier, is_active, age, city")
        .order("created_at", { ascending: false })
        .limit(20);

      setUsers(usersData || []);

      // Fetch reports
      const { data: reportsData } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setReports(reportsData || []);

      // Fetch payments
      const { data: paymentsList } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setPayments(paymentsList || []);
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

  const handleVerifyUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User verified successfully",
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User has been banned successfully",
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResolveReport = async (reportId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Report ${status} successfully`,
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Shield className="w-10 h-10 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Complete platform management and monitoring</p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="floating-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Total accounts</p>
              </CardContent>
            </Card>

            <Card className="floating-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matches</CardTitle>
                <Heart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalMatches}</div>
                <p className="text-xs text-muted-foreground mt-1">Connections</p>
              </CardContent>
            </Card>

            <Card className="floating-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total earnings</p>
              </CardContent>
            </Card>

            <Card className="floating-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reports</CardTitle>
                <AlertCircle className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.pendingReports}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending</p>
              </CardContent>
            </Card>

            <Card className="floating-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Posts</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalPosts}</div>
                <p className="text-xs text-muted-foreground mt-1">Community</p>
              </CardContent>
            </Card>

            <Card className="floating-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalMessages}</div>
                <p className="text-xs text-muted-foreground mt-1">Total sent</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="glass">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-3">
              <Card className="floating-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{user.name || "Anonymous"}</p>
                          {user.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {!user.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              <Ban className="w-3 h-3 mr-1" />
                              Banned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground">
                            {user.age} • {user.city || "Unknown"} • Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {user.subscription_tier || "free"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!user.verified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyUser(user.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        {user.is_active && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBanUser(user.id)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-3">
              <Card className="floating-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    User Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">{report.reason}</p>
                            <Badge
                              variant={
                                report.status === "pending"
                                  ? "default"
                                  : report.status === "resolved"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {report.description || "No additional details"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                        {report.status === "pending" && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveReport(report.id, "resolved")}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleResolveReport(report.id, "dismissed")}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-3">
              <Card className="floating-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-lg">${Number(payment.amount).toFixed(2)}</p>
                          <Badge
                            variant={payment.status === "completed" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-muted-foreground">
                            {payment.payment_method.toUpperCase()} • {payment.currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleString()}
                          </p>
                        </div>
                        {payment.transaction_id && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            TX: {payment.transaction_id}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;

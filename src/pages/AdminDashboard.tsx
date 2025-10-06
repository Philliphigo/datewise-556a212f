import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  TrendingUp,
  Loader2,
} from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalMatches: 0,
    totalRevenue: 0,
    pendingReports: 0,
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
          description: "You don't have admin privileges",
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
        activeUsers: userCount || 0,
        totalMatches: matchCount || 0,
        totalRevenue,
        pendingReports: reportCount || 0,
      });

      // Fetch recent users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

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
        description: `Report ${status}`,
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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                  <p className="text-2xl font-bold">{stats.totalMatches}</p>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <DollarSign className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="glass">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              {users.map((user) => (
                <Card key={user.id} className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{user.name}</p>
                        {user.verified && (
                          <Badge variant="secondary" className="glass">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.age} • {user.city} • {user.subscription_tier || "free"}
                      </p>
                    </div>
                    {!user.verified && (
                      <Button
                        size="sm"
                        onClick={() => handleVerifyUser(user.id)}
                        className="gradient-romantic text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="glass-card p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            report.status === "pending"
                              ? "destructive"
                              : report.status === "resolved"
                              ? "default"
                              : "secondary"
                          }
                          className="glass"
                        >
                          {report.status}
                        </Badge>
                        <p className="font-semibold">{report.reason}</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                    {report.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleResolveReport(report.id, "resolved")}
                          variant="outline"
                          className="glass border-green-500/20 hover:border-green-500/40"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveReport(report.id, "dismissed")}
                          variant="outline"
                          className="glass border-red-500/20 hover:border-red-500/40"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              {payments.map((payment) => (
                <Card key={payment.id} className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">${Number(payment.amount).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_method} • {payment.currency}
                      </p>
                    </div>
                    <Badge
                      variant={payment.status === "completed" ? "default" : "secondary"}
                      className="glass"
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Loader2,
  MessageSquare,
  Heart,
  ArrowLeft,
  FileCheck,
  Megaphone,
  RefreshCw,
  DollarSign,
  Activity,
  BarChart3,
  Bot,
} from "lucide-react";
import { format } from "date-fns";
import { AdminStats } from "@/components/admin/AdminStats";
import { UserManagement } from "@/components/admin/UserManagement";
import { VerificationManagement } from "@/components/admin/VerificationManagement";
import { BroadcastManagement } from "@/components/admin/BroadcastManagement";
import { RevenueAnalytics } from "@/components/admin/RevenueAnalytics";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { RealTimeCharts } from "@/components/admin/RealTimeCharts";
import { FeedbackManagement } from "@/components/admin/FeedbackManagement";
import { WithdrawalManagement } from "@/components/admin/WithdrawalManagement";
import { PaymentManagement } from "@/components/admin/PaymentManagement";
import { PhilAIAdminPanel } from "@/components/admin/PhilAIAdminPanel";

interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  totalRevenue: number;
  pendingReports: number;
  totalPosts: number;
  totalMessages: number;
  activeUsers: number;
  pendingVerifications: number;
  broadcastsSent: number;
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
    activeUsers: 0,
    pendingVerifications: 0,
    broadcastsSent: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
    setRefreshing(true);
    try {
      // Fetch all stats in parallel
      const [
        { count: userCount },
        { count: matchCount },
        { count: postCount },
        { count: messageCount },
        { count: reportCount },
        { count: activeCount },
        { count: pendingVerifCount },
        { count: broadcastCount },
        { data: paymentsData },
        { data: usersData },
        { data: reportsData },
        { data: paymentsList },
        { data: verificationData },
        { data: broadcasts },
        { data: contactData },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("matches").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_online", true),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("system_messages").select("*", { count: "exact", head: true }).eq("is_broadcast", true),
        supabase.from("payments").select("amount").eq("status", "completed"),
        supabase
          .from("profiles")
          .select("id, name, verified, created_at, subscription_tier, age, city, is_online, avatar_url")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("verification_requests").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("system_messages").select("*").eq("is_broadcast", true).order("created_at", { ascending: false }).limit(20),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      const totalRevenue = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // verification_requests -> profiles join isn't guaranteed unless a FK exists, so enrich manually
      const rawVerificationRequests = verificationData || [];
      let verificationRequestsWithProfiles = rawVerificationRequests;

      if (rawVerificationRequests.length > 0) {
        const userIds = Array.from(
          new Set(rawVerificationRequests.map((r: any) => r.user_id).filter(Boolean))
        );

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", userIds);

          if (profilesError) {
            console.warn("Failed to enrich verification requests with profiles:", profilesError);
          } else {
            const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
            verificationRequestsWithProfiles = rawVerificationRequests.map((r: any) => ({
              ...r,
              profile: profileMap.get(r.user_id) || null,
            }));
          }
        }
      }

      setStats({
        totalUsers: userCount || 0,
        totalMatches: matchCount || 0,
        totalRevenue,
        pendingReports: reportCount || 0,
        totalPosts: postCount || 0,
        totalMessages: messageCount || 0,
        activeUsers: activeCount || 0,
        pendingVerifications: pendingVerifCount || 0,
        broadcastsSent: broadcastCount || 0,
      });

      setUsers(usersData || []);
      setReports(reportsData || []);
      setPayments(paymentsList || []);
      setVerificationRequests(verificationRequestsWithProfiles || []);
      setBroadcastHistory(broadcasts || []);
      setContactMessages(contactData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatClick = (stat: string) => {
    const tabMap: Record<string, string> = {
      users: "users",
      matches: "analytics",
      revenue: "analytics",
      reports: "reports",
      verification: "verification",
      broadcast: "broadcast",
      posts: "analytics",
      messages: "analytics",
    };
    setActiveTab(tabMap[stat] || "overview");
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
        description: "Report resolved successfully",
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

  const handleSendFeedback = async () => {
    if (!selectedReport || !feedbackMessage) {
      toast({
        title: "Error",
        description: "Please provide feedback message",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("report_feedback").insert({
        report_id: selectedReport.id,
        admin_id: user?.id,
        feedback_message: feedbackMessage,
        action_taken: actionTaken || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback sent successfully",
      });
      setFeedbackDialog(false);
      setFeedbackMessage("");
      setActionTaken("");
      setSelectedReport(null);
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/discover")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">Manage and monitor DateWise</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={refreshing} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="liquid-glass h-auto p-1 flex-wrap">
            <TabsTrigger value="overview" className="rounded-lg">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg relative">
              <AlertCircle className="w-4 h-4 mr-2" />
              Reports
              {stats.pendingReports > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">
                  {stats.pendingReports}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="verification" className="rounded-lg relative">
              <FileCheck className="w-4 h-4 mr-2" />
              Verification
              {stats.pendingVerifications > 0 && (
                <Badge className="ml-2 h-5 min-w-5 text-xs bg-info">
                  {stats.pendingVerifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="rounded-lg">
              <Megaphone className="w-4 h-4 mr-2" />
              Broadcast
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-lg">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="philai" className="rounded-lg">
              <Bot className="w-4 h-4 mr-2" />
              PhilAI
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <AdminStats stats={stats} onStatClick={handleStatClick} />

            {/* Quick Actions */}
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setActiveTab("reports")} className="rounded-xl">
                  <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                  Review Reports ({stats.pendingReports})
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("verification")} className="rounded-xl">
                  <FileCheck className="w-4 h-4 mr-2 text-info" />
                  Verify Users ({stats.pendingVerifications})
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("broadcast")} className="rounded-xl">
                  <Megaphone className="w-4 h-4 mr-2 text-primary" />
                  Send Broadcast
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("analytics")} className="rounded-xl">
                  <TrendingUp className="w-4 h-4 mr-2 text-success" />
                  View Revenue
                </Button>
              </CardContent>
            </Card>

            {/* Activity Log and Summary */}
            <div className="grid md:grid-cols-2 gap-6">
              <ActivityLog />

              <div className="space-y-6">
                <Card className="liquid-glass">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="w-5 h-5 text-destructive" />
                      Platform Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Active Users</span>
                      <span className="font-semibold text-success">{stats.activeUsers} online</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Matches</span>
                      <span className="font-semibold">{stats.totalMatches}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Messages Sent</span>
                      <span className="font-semibold">{stats.totalMessages}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Posts Created</span>
                      <span className="font-semibold">{stats.totalPosts}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="liquid-glass">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-success" />
                      Revenue Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Revenue</span>
                      <span className="font-semibold text-success">${stats.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Transactions</span>
                      <span className="font-semibold">{payments.length}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-2 rounded-xl"
                      onClick={() => setActiveTab("analytics")}
                    >
                      View Full Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement users={users} onRefresh={fetchDashboardData} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Review and resolve user reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No reports to review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="p-4 border border-border rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{report.reason}</p>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <Badge
                            variant={
                              report.status === "pending" ? "default" :
                              report.status === "resolved" ? "secondary" : "destructive"
                            }
                          >
                            {report.status}
                          </Badge>
                        </div>
                        {report.status === "pending" && (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleResolveReport(report.id, "resolved")} className="rounded-lg">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Resolve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleResolveReport(report.id, "dismissed")} className="rounded-lg">
                              <XCircle className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReport(report);
                                setFeedbackDialog(true);
                              }}
                              className="rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Send Feedback
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <VerificationManagement requests={verificationRequests} onRefresh={fetchDashboardData} />
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <BroadcastManagement broadcasts={broadcastHistory} onRefresh={fetchDashboardData} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <RealTimeCharts />
            <RevenueAnalytics payments={payments} totalRevenue={stats.totalRevenue} />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <FeedbackManagement messages={contactMessages} onRefresh={fetchDashboardData} refreshing={refreshing} />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <WithdrawalManagement />
          </TabsContent>

          {/* PhilAI Admin Tab */}
          <TabsContent value="philai">
            <PhilAIAdminPanel
              pendingPayments={payments.filter((p) => p.status === "pending")}
              stats={stats}
              selectedReport={selectedReport}
              onApplyReportDraft={(msg) => {
                setFeedbackMessage(msg);
                setFeedbackDialog(true);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
          <DialogContent className="liquid-glass">
            <DialogHeader>
              <DialogTitle>Send Feedback to Reporter</DialogTitle>
              <DialogDescription>
                Provide feedback on the report action taken
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Feedback message..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="liquid-glass"
              />
              <Textarea
                placeholder="Action taken (optional)..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="liquid-glass"
              />
              <Button onClick={handleSendFeedback} className="w-full rounded-xl">
                Send Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  ArrowLeft,
  FileCheck,
  MessageCircleReply,
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
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [actionTaken, setActionTaken] = useState("");

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

      // Fetch verification requests
      const { data: verificationData } = await supabase
        .from("verification_requests")
        .select("*, profiles(name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(20);

      setVerificationRequests(verificationData || []);
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

  const handleVerifyUser = async (requestId: string, userId: string, approve: boolean) => {
    try {
      // Update verification request status
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: approve ? null : 'Document verification failed',
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // If approved, update profile verification status
      if (approve) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ verified: true })
          .eq("id", userId);

        if (profileError) throw profileError;
      }

      toast({
        title: "Success",
        description: `Verification request ${approve ? 'approved' : 'rejected'} successfully`,
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
      // Ban functionality - could delete user or use user_roles table
      toast({
        title: "Info",
        description: "Ban feature requires additional setup",
        variant: "destructive",
      });
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

  const handleSendFeedback = async () => {
    if (!selectedReport || !feedbackMessage.trim()) return;

    try {
      const { error } = await supabase
        .from("report_feedback")
        .insert({
          report_id: selectedReport.id,
          admin_id: user?.id,
          feedback_message: feedbackMessage,
          action_taken: actionTaken,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback sent to reporter",
      });
      
      setFeedbackDialog(false);
      setFeedbackMessage("");
      setActionTaken("");
      setSelectedReport(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleVerificationDecision = async (requestId: string, approved: boolean, reason?: string) => {
    try {
      const { error: updateError } = await supabase
        .from("verification_requests")
        .update({
          status: approved ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: reason,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (approved) {
        const request = verificationRequests.find(r => r.id === requestId);
        if (request) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ verified: true })
            .eq("id", request.user_id);

          if (profileError) throw profileError;
        }
      }

      toast({
        title: "Success",
        description: `Verification request ${approved ? "approved" : "rejected"}`,
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/discover")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Admin Dashboard
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
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
              <TabsTrigger value="verification">Verification</TabsTrigger>
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
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from("profiles")
                                  .update({ verified: true })
                                  .eq("id", user.id);
                                if (error) throw error;
                                toast({ title: "User verified successfully" });
                                fetchDashboardData();
                              } catch (error: any) {
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              }
                            }}
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
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedReport(report);
                                setFeedbackDialog(true);
                              }}
                            >
                              <MessageCircleReply className="w-4 h-4 mr-1" />
                              Feedback
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-3">
              <Card className="floating-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5" />
                    Verification Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {verificationRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No verification requests</p>
                  ) : (
                    verificationRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold">
                                {request.profiles?.name || "Anonymous User"}
                              </p>
                              <Badge
                                variant={
                                  request.status === "pending"
                                    ? "default"
                                    : request.status === "approved"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(request.created_at).toLocaleString()}
                            </p>
                            {request.document_url && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Document: {request.document_url.split('/').pop()}
                              </p>
                            )}
                          </div>
                          {request.status === "pending" && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerifyUser(request.id, request.user_id, true)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleVerifyUser(request.id, request.user_id, false)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                        {request.rejection_reason && (
                          <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
                            <p className="text-sm">Reason: {request.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
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

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback to Reporter</DialogTitle>
            <DialogDescription>
              Provide feedback about how this report was handled
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Taken (optional)</label>
              <Textarea
                placeholder="e.g., User warned, Content removed, etc."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback Message</label>
              <Textarea
                placeholder="Your message to the reporter..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendFeedback} disabled={!feedbackMessage.trim()}>
                Send Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;

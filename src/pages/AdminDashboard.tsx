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
import defaultAvatar from "@/assets/default-avatar.jpg";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [reportFeedback, setReportFeedback] = useState<any[]>([]);
  const [systemMessage, setSystemMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

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
        .select("id, name, verified, created_at, subscription_tier, age, city")
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
        .select(`
          *,
          profile:profiles(name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      setVerificationRequests(verificationData || []);

      // Fetch report feedback
      const { data: feedbackData } = await supabase
        .from("report_feedback")
        .select(`
          *,
          report:reports(
            reason,
            description,
            reporter:profiles!reports_reporter_id_fkey(name),
            reported:profiles!reports_reported_id_fkey(name)
          )
        `)
        .order("created_at", { ascending: false });

      setReportFeedback(feedbackData || []);
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

  const handleVerifyUser = async (requestId: string, userId: string, status: string, reason?: string) => {
    try {
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: reason,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      if (status === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ verified: true })
          .eq("id", userId);

        if (profileError) throw profileError;
      }

      toast({
        title: "User Verified",
        description: `User has been ${status === "approved" ? "verified" : "rejected"}`,
      });
      await fetchDashboardData();
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
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/discover")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor DateWise</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="verification">
              Verification ({verificationRequests.filter(v => v.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMatches}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingReports}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPosts}</div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                  <MessageCircleReply className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMessages}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.age ? `${user.age} years old` : 'Age not set'} • {user.city || 'Location not set'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.verified && <Badge variant="default">Verified</Badge>}
                        <Badge variant="outline">{user.subscription_tier}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report: any) => (
                    <div key={report.id} className="p-4 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{report.reason}</p>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          report.status === "pending" ? "default" :
                          report.status === "resolved" ? "secondary" : "destructive"
                        }>
                          {report.status}
                        </Badge>
                      </div>
                      {report.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleResolveReport(report.id, "resolved")}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleResolveReport(report.id, "dismissed")}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Dismiss
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedReport(report);
                            setFeedbackDialog(true);
                          }}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send Feedback
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            {verificationRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No verification requests
              </div>
            ) : (
              verificationRequests.map((request: any) => (
                <Card key={request.id} className="glass-card p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={request.profile?.avatar_url || defaultAvatar}
                      alt={request.profile?.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{request.profile?.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          request.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Submitted {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.document_url && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Document: {request.document_url.split('/').pop()}
                        </p>
                      )}
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVerifyUser(request.id, request.user_id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerifyUser(request.id, request.user_id, "rejected", "Does not meet verification criteria")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="text-sm text-red-500 mt-2">
                          Reason: {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            {reportFeedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feedback sent yet
              </div>
            ) : (
              reportFeedback.map((feedback: any) => (
                <Card key={feedback.id} className="glass-card p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Report: {feedback.report?.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          {feedback.report?.reporter?.name} reported {feedback.report?.reported?.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <p className="text-sm font-medium mb-1">Admin Feedback:</p>
                      <p className="text-sm">{feedback.feedback_message}</p>
                      {feedback.action_taken && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Action: {feedback.action_taken}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-4">
            <Card className="glass-card p-6">
              <h3 className="font-semibold mb-4">Send Update to All Users</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This will send an email to all users who have enabled email notifications
              </p>
              <Textarea
                placeholder="Type your update message here..."
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                className="glass mb-4 min-h-[150px]"
              />
              <Button
                onClick={async () => {
                  if (!systemMessage.trim()) {
                    toast({
                      title: "Error",
                      description: "Message cannot be empty",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setSendingMessage(true);
                  try {
                    const { error } = await supabase.functions.invoke('send-broadcast-email', {
                      body: { message: systemMessage }
                    });

                    if (error) throw error;

                    toast({
                      title: "Success",
                      description: "Broadcast message sent successfully",
                    });
                    setSystemMessage("");
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setSendingMessage(false);
                  }
                }}
                disabled={sendingMessage || !systemMessage.trim()}
              >
                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Broadcast"}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
          <DialogContent className="glass-card">
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
                className="glass"
              />
              <Textarea
                placeholder="Action taken (optional)..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="glass"
              />
              <Button onClick={handleSendFeedback} className="w-full">
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ReportWithFeedback {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reported_profile: {
    name: string;
  };
  report_feedback: Array<{
    action_taken: string | null;
    feedback_message: string;
    created_at: string;
  }>;
}

export const ReportFeedbackView = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportWithFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, description, status, created_at, reported_id")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const reportsWithDetails = await Promise.all(
        (data || []).map(async (report) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", report.reported_id)
            .single();

          const { data: feedback } = await supabase
            .from("report_feedback")
            .select("action_taken, feedback_message, created_at")
            .eq("report_id", report.id)
            .order("created_at", { ascending: false });

          return {
            ...report,
            reported_profile: profile || { name: "Unknown User" },
            report_feedback: feedback || [],
          };
        })
      );

      setReports(reportsWithDetails);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          My Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No reports submitted
          </p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      Reported: {report.reported_profile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reason: {report.reason}
                    </p>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(report.created_at), "PPp")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      report.status === "resolved"
                        ? "default"
                        : report.status === "dismissed"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {report.status}
                  </Badge>
                </div>

                {report.report_feedback && report.report_feedback.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Admin Feedback:</p>
                    {report.report_feedback.map((feedback, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-3 space-y-1">
                        {feedback.action_taken && (
                          <p className="text-sm">
                            <span className="font-medium">Action:</span>{" "}
                            {feedback.action_taken}
                          </p>
                        )}
                        <p className="text-sm">{feedback.feedback_message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(feedback.created_at), "PPp")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  FileCheck,
  MessageSquare,
  CreditCard,
  BarChart3,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Megaphone,
  Sparkles,
} from "lucide-react";

interface PaymentTriageResult {
  payment_id: string;
  verdict: "likely_real" | "suspicious" | "needs_review";
  reason: string;
}

interface ReportResponseResult {
  subject?: string;
  message: string;
}

interface BroadcastDraftResult {
  message: string;
}

interface PhilAIAdminPanelProps {
  pendingPayments?: Array<{
    id: string;
    amount: number;
    currency: string;
    metadata: { tier?: string; email?: string };
    created_at: string;
    user_id: string;
  }>;
  stats?: {
    totalUsers: number;
    totalMatches: number;
    totalRevenue: number;
    pendingReports: number;
    pendingVerifications: number;
    activeUsers: number;
    totalPosts: number;
    totalMessages: number;
    broadcastsSent: number;
  };
  selectedReport?: {
    id: string;
    reason: string;
    description?: string;
    status: string;
  };
  onApplyReportDraft?: (message: string) => void;
  onApplyBroadcastDraft?: (message: string) => void;
}

export const PhilAIAdminPanel = ({
  pendingPayments = [],
  stats,
  selectedReport,
  onApplyReportDraft,
  onApplyBroadcastDraft,
}: PhilAIAdminPanelProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentTriage, setPaymentTriage] = useState<PaymentTriageResult[] | null>(null);
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [reportResponse, setReportResponse] = useState<ReportResponseResult | null>(null);
  const [broadcastDraft, setBroadcastDraft] = useState<BroadcastDraftResult | null>(null);
  const [broadcastTopic, setBroadcastTopic] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const callPhilAI = async (type: string, context: Record<string, unknown>) => {
    setLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke("philai-admin", {
        body: { type, context },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to get response");
      }

      return data.result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PhilAI request failed";
      toast.error(message);
      return null;
    } finally {
      setLoading(null);
    }
  };

  const handlePaymentTriage = async () => {
    const result = await callPhilAI("payment_triage", {
      payments: pendingPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        tier: p.metadata?.tier,
        email: p.metadata?.email,
        created_at: p.created_at,
      })),
    });
    if (result) {
      setPaymentTriage(Array.isArray(result) ? result : []);
    }
  };

  const handleDailySummary = async () => {
    const result = await callPhilAI("daily_summary", { stats });
    if (result) {
      setDailySummary(result.text || JSON.stringify(result, null, 2));
    }
  };

  const handleReportResponse = async () => {
    if (!selectedReport) {
      toast.error("No report selected");
      return;
    }
    const result = await callPhilAI("report_response", { report: selectedReport });
    if (result) {
      setReportResponse(result);
    }
  };

  const handleBroadcastDraft = async () => {
    if (!broadcastTopic.trim()) {
      toast.error("Please enter a topic for the broadcast");
      return;
    }
    const result = await callPhilAI("broadcast_draft", { topic: broadcastTopic });
    if (result) {
      setBroadcastDraft(result);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "likely_real":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "suspicious":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <HelpCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "likely_real":
        return <Badge className="bg-green-500/20 text-green-600">Likely Real</Badge>;
      case "suspicious":
        return <Badge className="bg-red-500/20 text-red-600">Suspicious</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-600">Needs Review</Badge>;
    }
  };

  return (
    <Card className="liquid-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          PhilAI Admin Assistant
        </CardTitle>
        <CardDescription>
          AI-powered tools to help you manage the platform. All suggestions require your approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="triage" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="triage" className="rounded-lg">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Triage
            </TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              Daily Summary
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg">
              <FileCheck className="w-4 h-4 mr-2" />
              Report Response
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="rounded-lg">
              <Megaphone className="w-4 h-4 mr-2" />
              Broadcast Draft
            </TabsTrigger>
          </TabsList>

          {/* Payment Triage */}
          <TabsContent value="triage" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Analyze {pendingPayments.length} pending payments for suspicious activity.
              </p>
              <Button
                onClick={handlePaymentTriage}
                disabled={loading === "payment_triage" || pendingPayments.length === 0}
                className="rounded-xl"
              >
                {loading === "payment_triage" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Analyze Payments
              </Button>
            </div>

            {paymentTriage && paymentTriage.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {paymentTriage.map((item, idx) => (
                  <div
                    key={item.payment_id || idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    {getVerdictIcon(item.verdict)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono truncate">
                          {item.payment_id?.slice(0, 8)}...
                        </span>
                        {getVerdictBadge(item.verdict)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Daily Summary */}
          <TabsContent value="summary" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Generate a daily summary with recommended actions.
              </p>
              <Button
                onClick={handleDailySummary}
                disabled={loading === "daily_summary" || !stats}
                className="rounded-xl"
              >
                {loading === "daily_summary" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Summary
              </Button>
            </div>

            {dailySummary && (
              <div className="p-4 rounded-xl bg-muted/50 whitespace-pre-wrap text-sm">
                {dailySummary}
              </div>
            )}
          </TabsContent>

          {/* Report Response */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedReport
                  ? `Draft a response for report: ${selectedReport.reason}`
                  : "Select a report first to generate a response."}
              </p>
              <Button
                onClick={handleReportResponse}
                disabled={loading === "report_response" || !selectedReport}
                className="rounded-xl"
              >
                {loading === "report_response" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Draft Response
              </Button>
            </div>

            {reportResponse && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  {reportResponse.subject && (
                    <p className="text-sm font-semibold">{reportResponse.subject}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{reportResponse.message}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(reportResponse.message, "report")}
                    className="rounded-lg"
                  >
                    {copied === "report" ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy
                  </Button>
                  {onApplyReportDraft && (
                    <Button
                      size="sm"
                      onClick={() => onApplyReportDraft(reportResponse.message)}
                      className="rounded-lg"
                    >
                      Apply to Feedback
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Broadcast Draft */}
          <TabsContent value="broadcast" className="space-y-4">
            <Textarea
              value={broadcastTopic}
              onChange={(e) => setBroadcastTopic(e.target.value)}
              placeholder="Describe the broadcast topic (e.g., 'New feature launch for premium users', 'Weekend maintenance notice')"
              className="min-h-20 rounded-xl"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleBroadcastDraft}
                disabled={loading === "broadcast_draft" || !broadcastTopic.trim()}
                className="rounded-xl"
              >
                {loading === "broadcast_draft" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Draft Broadcast
              </Button>
            </div>

            {broadcastDraft && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{broadcastDraft.message}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(broadcastDraft.message, "broadcast")}
                    className="rounded-lg"
                  >
                    {copied === "broadcast" ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy
                  </Button>
                  {onApplyBroadcastDraft && (
                    <Button
                      size="sm"
                      onClick={() => onApplyBroadcastDraft(broadcastDraft.message)}
                      className="rounded-lg"
                    >
                      Use in Broadcast
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

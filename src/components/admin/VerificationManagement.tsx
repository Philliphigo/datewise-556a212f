import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, FileText, Eye, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { format } from "date-fns";

interface VerificationManagementProps {
  requests: any[];
  onRefresh: () => void;
}

export const VerificationManagement = ({ requests, onRefresh }: VerificationManagementProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  const handleVerify = async (requestId: string, userId: string, status: "approved" | "rejected") => {
    setProcessing(true);
    try {
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: status === "rejected" ? rejectionReason : null,
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
        title: status === "approved" ? "User Verified!" : "Request Rejected",
        description: status === "approved" 
          ? "The user now has a verified badge on their profile" 
          : "The verification request has been rejected",
      });

      setShowDialog(false);
      setRejectionReason("");
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card className="liquid-glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge variant="default">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending verification requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-warning/30 bg-warning/5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-2 border-warning/30">
                      <AvatarImage src={request.profile?.avatar_url || defaultAvatar} />
                      <AvatarFallback>{request.profile?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.profile?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90"
                      onClick={() => handleVerify(request.id, request.user_id, "approved")}
                      disabled={processing}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle>Recent Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No processed requests</div>
          ) : (
            <div className="space-y-3">
              {processedRequests.slice(0, 10).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.profile?.avatar_url || defaultAvatar} />
                      <AvatarFallback>{request.profile?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{request.profile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.reviewed_at && format(new Date(request.reviewed_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={request.status === "approved" ? "default" : "destructive"}
                    className={request.status === "approved" ? "bg-success" : ""}
                  >
                    {request.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {request.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="liquid-glass max-w-md">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>Review the submitted document and make a decision</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedRequest.profile?.avatar_url || defaultAvatar} />
                  <AvatarFallback>{selectedRequest.profile?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedRequest.profile?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Submitted {format(new Date(selectedRequest.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {selectedRequest.document_url && (
                <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm truncate flex-1">
                    {selectedRequest.document_url.split("/").pop()}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="liquid-glass"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={() => handleVerify(selectedRequest.id, selectedRequest.user_id, "approved")}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleVerify(selectedRequest.id, selectedRequest.user_id, "rejected")}
                  disabled={processing || !rejectionReason.trim()}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

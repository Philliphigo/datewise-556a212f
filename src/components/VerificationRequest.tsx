import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, Loader2, CheckCircle, XCircle, Clock, Trash2, RefreshCw, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const VerificationRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    idType: "",
    idNumber: "",
    reason: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchVerificationRequest();
    }
  }, [user]);

  const fetchVerificationRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setRequest(data);
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

  const handleCancelRequest = async () => {
    if (!request || !user) return;
    
    setCancelling(true);
    try {
      // Delete the document from storage if it exists
      if (request.document_url) {
        await supabase.storage
          .from('verification-docs')
          .remove([request.document_url]);
      }

      // Delete the request
      const { error } = await supabase
        .from("verification_requests")
        .delete()
        .eq("id", request.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your verification request has been cancelled. You can submit a new one.",
      });
      
      setRequest(null);
      setFormData({ fullName: "", dateOfBirth: "", idType: "", idNumber: "", reason: "" });
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Error",
        description: "Please select a document to upload",
        variant: "destructive",
      });
      return;
    }

    if (!formData.fullName || !formData.idType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: requestError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          document_url: filePath,
          status: 'pending',
        });

      if (requestError) throw requestError;

      toast({
        title: "Success",
        description: "Verification request submitted successfully",
      });
      
      setShowForm(false);
      setSelectedFile(null);
      setFormData({ fullName: "", dateOfBirth: "", idType: "", idNumber: "", reason: "" });
      fetchVerificationRequest();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Verification Badge
          </CardTitle>
          <CardDescription>
            Get verified to build trust with other users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!request ? (
            <>
              <p className="text-sm text-muted-foreground">
                Get verified by submitting a government-issued ID. Verified users get a blue badge on their profile.
              </p>
              <Button onClick={() => setShowForm(true)} className="w-full rounded-xl">
                <Upload className="w-4 h-4 mr-2" />
                Start Verification
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {/* Status Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Request Status</span>
                  <Badge
                    variant={
                      request.status === "approved"
                        ? "default"
                        : request.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                    className={`flex items-center gap-1 ${request.status === "approved" ? "bg-info" : ""}`}
                  >
                    {request.status === "approved" && <CheckCircle className="w-3 h-3" />}
                    {request.status === "rejected" && <XCircle className="w-3 h-3" />}
                    {request.status === "pending" && <Clock className="w-3 h-3" />}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Submitted: {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  {request.document_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      <span>Document: {request.document_url.split('/').pop()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {request.status === "pending" && (
                <>
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <p className="text-sm text-warning-foreground">
                      Your verification request is being reviewed. This usually takes 24-48 hours.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleCancelRequest}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Cancel & Resubmit
                  </Button>
                </>
              )}
              
              {request.status === "approved" && (
                <div className="p-3 rounded-lg bg-info/10 border border-info/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-info" />
                    <p className="text-sm font-medium text-info">
                      Your account is verified!
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    The blue verification badge now appears on your profile.
                  </p>
                </div>
              )}
              
              {request.status === "rejected" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-1">Request Rejected</p>
                    {request.rejection_reason && (
                      <p className="text-sm text-muted-foreground">{request.rejection_reason}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl"
                    onClick={() => {
                      setRequest(null);
                      setShowForm(true);
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Submit New Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="liquid-glass max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Request</DialogTitle>
            <DialogDescription>
              Please provide the following information to verify your identity
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name (as on ID) *</Label>
              <Input
                id="fullName"
                placeholder="Enter your full legal name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idType">ID Type *</Label>
              <select
                id="idType"
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
              >
                <option value="">Select ID type</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID Card</option>
                <option value="drivers_license">Driver's License</option>
                <option value="other">Other Government ID</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number (optional)</Label>
              <Input
                id="idNumber"
                placeholder="Enter ID number"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to be verified?</Label>
              <Textarea
                id="reason"
                placeholder="Tell us why verification is important to you..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload ID Document *</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-primary" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG or PDF (max 10MB)
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={uploading || !selectedFile || !formData.fullName || !formData.idType}
              className="w-full rounded-xl h-12"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

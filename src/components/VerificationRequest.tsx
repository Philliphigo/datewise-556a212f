import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

export const VerificationRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [request, setRequest] = useState<any>(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(filePath);

      const { error: requestError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          document_url: data.publicUrl,
          status: 'pending',
        });

      if (requestError) throw requestError;

      toast({
        title: "Success",
        description: "Verification request submitted successfully",
      });
      
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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Verification Badge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!request ? (
          <>
            <p className="text-sm text-muted-foreground">
              Get verified by submitting a government-issued ID. Verified users get a badge on their profile.
            </p>
            <label className="cursor-pointer">
              <Button disabled={uploading} className="w-full" asChild>
                <div>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Submit ID Document"}
                </div>
              </Button>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge
                variant={
                  request.status === "approved"
                    ? "default"
                    : request.status === "rejected"
                    ? "destructive"
                    : "secondary"
                }
                className="flex items-center gap-1"
              >
                {request.status === "approved" && <CheckCircle className="w-3 h-3" />}
                {request.status === "rejected" && <XCircle className="w-3 h-3" />}
                {request.status === "pending" && <Clock className="w-3 h-3" />}
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>
            
            {request.status === "pending" && (
              <p className="text-sm text-muted-foreground">
                Your verification request is being reviewed. This usually takes 24-48 hours.
              </p>
            )}
            
            {request.status === "approved" && (
              <p className="text-sm text-success">
                ✓ Your account has been verified! The badge now appears on your profile.
              </p>
            )}
            
            {request.status === "rejected" && request.rejection_reason && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  Your verification request was rejected.
                </p>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm">{request.rejection_reason}</p>
                </div>
                <label className="cursor-pointer">
                  <Button variant="outline" className="w-full" asChild>
                    <div>
                      <Upload className="w-4 h-4 mr-2" />
                      Resubmit Document
                    </div>
                  </Button>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

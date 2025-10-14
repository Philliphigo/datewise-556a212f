import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Mail, Phone, KeyRound } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "signin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/discover");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Account created successfully. Redirecting to profile setup...",
        });

        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });

        navigate("/discover");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      
      if (error) throw error;
      
      // OAuth redirect happens automatically
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMagicLink = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Enter your email to receive a sign-in link.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/discover`,
        },
      });
      if (error) throw error;
      toast({ title: "Check your inbox", description: "We sent you a sign-in link." });
    } catch (error: any) {
      toast({ title: "Magic link failed", description: error?.message || "Could not send link.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    // Open the phone auth dialog to gather phone and OTP
    setPhoneDialogOpen(true);
  };

  const sendOtp = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone required",
        description: "Enter your phone number including country code (e.g. +265...)",
        variant: "destructive",
      });
      return;
    }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: { channel: "sms" },
      });
      if (error) throw error;
      setOtpSent(true);
      toast({
        title: "Code sent",
        description: "Check your phone for the 6-digit code.",
      });
    } catch (error: any) {
      toast({
        title: "SMS error",
        description:
          error?.message ||
          "Could not send OTP. Ensure SMS provider is configured in Supabase.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast({
        title: "Invalid code",
        description: "Enter the 6-digit code you received.",
        variant: "destructive",
      });
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: "sms",
      });
      if (error) throw error;
      // If user is new, they'll be redirected to onboarding route by app logic
      toast({ title: "Signed in" });
      setPhoneDialogOpen(false);
      setOtpCode("");
      setPhoneNumber("");
      navigate("/onboarding");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error?.message || "The code is incorrect or expired.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const toggleMode = () => {
    setSearchParams({ mode: mode === "signin" ? "signup" : "signin" });
  };

  const openResetDialog = () => {
    setResetEmail(email);
    setResetDialogOpen(true);
  };

  const sendPasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: "Email required", description: "Enter your account email.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      toast({
        title: "Check your email",
        description: "We sent a secure link to reset your password.",
      });
      setResetDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Reset failed", description: error?.message || "Unable to send reset email.", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Supabase password recovery session update
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Show a dialog to set a new password
        setResetDialogOpen(true);
      }
      if (event === "SIGNED_IN" && mode === "reset") {
        // If redirected via magic link, allow password update
        setResetDialogOpen(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [mode]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Weak password", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Re-enter the same password.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in with the new password." });
      setResetDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      if (mode !== "signin") setSearchParams({ mode: "signin" });
    } catch (error: any) {
      toast({ title: "Update failed", description: error?.message || "Unable to update password.", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-romantic opacity-10" />
      
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <Heart
            key={i}
            className="absolute text-primary/10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.7}s`,
              fontSize: `${Math.random() * 30 + 15}px`,
            }}
            fill="currentColor"
          />
        ))}
      </div>

      <Card className="w-full max-w-md glass-card p-8 space-y-6 relative z-10 animate-scale-in">
        <div className="text-center space-y-2">
          <Heart className="w-12 h-12 mx-auto text-primary animate-glow" fill="currentColor" />
          <h1 className="text-3xl font-display gradient-text">
            {mode === "signin" ? "Welcome Back" : "Join DateWise"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue your journey"
              : "Create your account to find your match"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass"
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-romantic text-white border-0 hover:opacity-90 transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {mode === "signin" && (
          <div className="text-right -mt-2">
            <button type="button" onClick={openResetDialog} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> Forgot password?
            </button>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="glass"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePhoneSignIn}
            disabled={loading}
            className="glass"
          >
            <Phone className="mr-2 h-4 w-4" />
            Phone
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={sendMagicLink}
            disabled={loading}
            className="glass"
          >
            <Mail className="mr-2 h-4 w-4" />
            Magic Link
          </Button>
        </div>

        <div className="text-center text-sm">
          <button
            onClick={toggleMode}
            className="text-primary hover:underline"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>

      {/* Password reset / recovery dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password recovery</DialogTitle>
            <DialogDescription>
              {mode === "reset" ? "Set a new password for your account." : "Enter your email to receive a reset link."}
            </DialogDescription>
          </DialogHeader>

          {mode === "reset" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="glass" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="glass" />
              </div>
              <DialogFooter>
                <Button onClick={updatePassword} disabled={resetLoading} className="w-full">
                  {resetLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>) : "Update Password"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="glass" />
              </div>
              <DialogFooter>
                <Button onClick={sendPasswordReset} disabled={resetLoading} className="w-full">
                  {resetLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>) : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Phone authentication dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in with Phone</DialogTitle>
            <DialogDescription>
              Enter your phone number with country code. We'll text you a code.
            </DialogDescription>
          </DialogHeader>

          {!otpSent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +265 991 234 567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="glass"
                />
              </div>
              <DialogFooter>
                <Button onClick={sendOtp} disabled={otpLoading} className="w-full">
                  {otpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Send Code"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit code</Label>
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <DialogFooter>
                <Button onClick={verifyOtp} disabled={otpLoading || otpCode.length < 6} className="w-full">
                  {otpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;

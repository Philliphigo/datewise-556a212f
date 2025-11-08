import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LiquidToggle } from "@/components/ui/liquid-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield, Bell, Eye, Trash2, Moon, Sun, AlertTriangle, ChevronDown, User, BadgeCheck, UserX, MessageSquare, Heart } from "lucide-react";
import { VerificationRequest } from "@/components/VerificationRequest";
import { BlockedUsers } from "@/components/BlockedUsers";
import { ReportFeedbackView } from "@/components/ReportFeedbackView";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [photoVisibility, setPhotoVisibility] = useState("everyone");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => {
    // Check dark mode preference
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setPhotoVisibility(data.photo_visibility || "everyone");
      setEmailNotifications(data.email_notifications ?? true);
      setName(data.name || "");
      setAge(typeof data.age === 'number' ? data.age : '');
      setGender(data.gender || "");
      setCity(data.city || "");
      setBio(data.bio || "");
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

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          photo_visibility: photoVisibility,
          email_notifications: emailNotifications,
          name,
          age: age === '' ? null : Number(age),
          gender,
          city,
          bio,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold gradient-text">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences</p>
          </div>

          {/* Profile Section */}
          <Collapsible defaultOpen>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Profile Information</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={(e)=>setName(e.target.value)} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" value={age} onChange={(e)=>setAge(e.target.value ? Number(e.target.value) : '')} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Input id="gender" value={gender} onChange={(e)=>setGender(e.target.value)} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={city} onChange={(e)=>setCity(e.target.value)} className="glass" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" value={bio} onChange={(e)=>setBio(e.target.value)} rows={4} className="glass" />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Privacy & Security Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Privacy & Security</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo-visibility" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Who can view my photos
                    </Label>
                    <Select value={photoVisibility} onValueChange={setPhotoVisibility}>
                      <SelectTrigger id="photo-visibility" className="glass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="matches">Matches Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates and announcements from DateWise
                      </p>
                    </div>
                    <LiquidToggle
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Verification Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Verification</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <VerificationRequest />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Blocked Users Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <UserX className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Blocked Users</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <BlockedUsers />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Report Feedback Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Report Feedback</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <ReportFeedbackView />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Appearance Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                  <h2 className="text-lg font-semibold">Appearance</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">Enable dark theme</p>
                    </div>
                    <LiquidToggle checked={darkMode} onCheckedChange={toggleDarkMode} />
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notifications Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Notifications</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Get alerts for matches and messages</p>
                    </div>
                    <LiquidToggle checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Get updates via email</p>
                    </div>
                    <LiquidToggle checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Links Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Company</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/about')}>
                    About Us
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/help')}>
                    Help Center
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/contact')}>
                    Contact Us
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Support</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/donate')}>
                    Donate
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/privacy')}>
                    Privacy Policy
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/terms')}>
                    Terms of Service
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible>
            <Card className="glass-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Follow Us</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => window.open('https://www.facebook.com/share/1BTZ1eAYDn/?mibextid=wwXIfr', '_blank')}
                  >
                    Facebook
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => window.open('https://www.instagram.com/696p69?igsh=MTM0eDYzc2ZzejVxNw%3D%3D&utm_source=qr', '_blank')}
                  >
                    Instagram
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => window.open('https://www.tiktok.com/@philchinya265?_t=ZM-90QydTcM5TX&_r=1', '_blank')}
                  >
                    TikTok
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Account Actions Section */}
          <Collapsible>
            <Card className="glass-card overflow-hidden border-destructive/20">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <h2 className="text-lg font-semibold">Danger Zone</h2>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-3">
                  <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full glass border-destructive/20 hover:border-destructive/40">
                        Deactivate Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Deactivate your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your profile will be hidden and you can reactivate by signing back in.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          if (!user) return;
                          setDangerLoading(true);
                          try {
                            toast({ title: "Account deactivated" });
                            setDeactivateOpen(false);
                            await supabase.auth.signOut();
                            navigate("/auth");
                          } catch (e: any) {
                            toast({ title: "Error", description: e?.message, variant: "destructive" });
                          } finally {
                            setDangerLoading(false);
                          }
                        }} disabled={dangerLoading}>
                          {dangerLoading ? "Working..." : "Deactivate"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full glass border-destructive/50 hover:border-destructive text-destructive">
                        Delete Account Permanently
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5"/> Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your data. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          setDangerLoading(true);
                          try {
                            const { error } = await supabase.functions.invoke("delete-account", { body: {} });
                            if (error) throw error;
                            toast({ title: "Account deleted" });
                            setDeleteOpen(false);
                            navigate("/");
                          } catch (e: any) {
                            toast({ title: "Error", description: e?.message, variant: "destructive" });
                          } finally {
                            setDangerLoading(false);
                          }
                        }} disabled={dangerLoading} className="bg-destructive text-destructive-foreground hover:opacity-90">
                          {dangerLoading ? "Deleting..." : "Delete Permanently"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gradient-romantic text-white"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;

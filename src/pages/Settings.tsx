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
import { Loader2, Shield, Bell, Eye, Trash2, Moon, Sun, AlertTriangle } from "lucide-react";
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
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold gradient-text">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences</p>
          </div>

          {/* Edit Profile */}
          <Card className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">📝</span>
              <h2 className="text-xl font-semibold">Edit Profile</h2>
            </div>
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
          </Card>

          {/* Privacy Settings */}
          <Card className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Privacy</h2>
            </div>

            <div className="space-y-4">
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
            </div>
          </Card>

          {/* Appearance Settings */}
          <Card className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-6 h-6 text-primary" /> : <Sun className="w-6 h-6 text-primary" />}
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Enable dark neon gradient theme
                  </p>
                </div>
                <LiquidToggle
                  checked={darkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get alerts for matches and messages
                  </p>
                </div>
                <LiquidToggle
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <Separator className="bg-border/50" />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Get updates via email</p>
                </div>
                <LiquidToggle
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </div>
          </Card>

          {/* Account Actions */}
          <Card className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-destructive" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>

            <div className="space-y-4">
              <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full glass border-destructive/20 hover:border-destructive/40">
                    Deactivate Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Temporarily deactivate your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Deactivation hides your profile, stops matches and messages, and sets your status to inactive. You can reactivate anytime by signing back in.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      if (!user) return;
                      setDangerLoading(true);
                      try {
                        const { error } = await supabase
                          .from("profiles")
                          .update({ is_active: false })
                          .eq("id", user.id);
                        if (error) throw error;
                        toast({ title: "Account deactivated", description: "You can restore access by signing in again." });
                        setDeactivateOpen(false);
                        await supabase.auth.signOut();
                        navigate("/auth");
                      } catch (e: any) {
                        toast({ title: "Action failed", description: e?.message || "Could not deactivate account.", variant: "destructive" });
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
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5"/> Permanently delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove your account, profile, matches, messages, and media. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      setDangerLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
                        if (error) throw error;
                        toast({ title: "Account deleted" });
                        setDeleteOpen(false);
                        navigate("/");
                      } catch (e: any) {
                        toast({ title: "Deletion failed", description: e?.message || "Could not delete account.", variant: "destructive" });
                      } finally {
                        setDangerLoading(false);
                      }
                    }} disabled={dangerLoading} className="bg-destructive text-destructive-foreground hover:opacity-90">
                      {dangerLoading ? "Deleting..." : "Yes, delete permanently"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  {" • "}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                </p>
              </div>
            </div>
          </Card>

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
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;

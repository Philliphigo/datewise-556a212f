import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker } from "@/components/LocationPicker";
import { PhotoManager } from "@/components/profile/PhotoManager";

const EditProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState("");

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (age === "") return false;
    return true;
  }, [name, age]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setName(data?.name ?? "");
      setAge(typeof data?.age === "number" ? data.age : "");
      setGender(data?.gender ?? "");
      setCity(data?.city ?? "");
      setBio(data?.bio ?? "");
      setLookingFor(data?.looking_for ?? "");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!canSave) {
      toast({
        title: "Missing info",
        description: "Please fill in your name and age before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          age: age === "" ? null : Number(age),
          gender,
          city,
          bio,
          looking_for: lookingFor,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Your profile has been updated.",
      });

      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
      <header className="container mx-auto px-4 pt-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="rounded-xl"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">Update your photos and profile details.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-32 max-w-3xl space-y-6">
        <section aria-label="Photos">
          <PhotoManager
            userId={user?.id || ""}
            currentPhotos={profile?.photo_urls || []}
            avatarUrl={profile?.avatar_url}
            onUpdate={fetchProfile}
          />
        </section>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>These appear on your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="glass" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                  className="glass"
                />
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="glass" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Location</Label>
                <LocationPicker value={city} onChange={setCity} placeholder="Search for your city..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lookingFor">Interested In</Label>
              <Select value={lookingFor} onValueChange={setLookingFor}>
                <SelectTrigger id="lookingFor" className="glass">
                  <SelectValue placeholder="What are you looking for?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendship">Friendship</SelectItem>
                  <SelectItem value="casual">Casual Dating</SelectItem>
                  <SelectItem value="relationship">Serious Relationship</SelectItem>
                  <SelectItem value="marriage">Marriage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={5} className="glass" />
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};

export default EditProfile;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import defaultAvatar from "@/assets/default-avatar.jpg";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    city: "",
    bio: "",
    interests: "",
    lookingFor: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        
        avatarUrl = data.publicUrl;
      }

      // Create profile
      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        city: formData.city,
        bio: formData.bio,
        interests: formData.interests.split(",").map(i => i.trim()),
        looking_for: formData.lookingFor,
        avatar_url: avatarUrl,
        onboarding_complete: true,
        is_online: true,
      });

      if (error) throw error;

      toast({
        title: "Profile created!",
        description: "Welcome to DateWise. Let's find your match!",
      });

      navigate("/discover");
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass-card p-8 space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display gradient-text">Complete Your Profile</h1>
          <p className="text-muted-foreground">Tell us about yourself</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 gradient-romantic rounded-full cursor-pointer hover:opacity-90 transition-opacity"
              >
                <Upload className="w-5 h-5 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="18"
                max="100"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger className="glass">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="glass"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              className="glass min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests">Interests (comma-separated)</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              placeholder="Reading, hiking, music..."
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lookingFor">Looking For</Label>
            <Select
              value={formData.lookingFor}
              onValueChange={(value) => setFormData({ ...formData, lookingFor: value })}
            >
              <SelectTrigger className="glass">
                <SelectValue placeholder="What are you looking for?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relationship">Serious Relationship</SelectItem>
                <SelectItem value="dating">Casual Dating</SelectItem>
                <SelectItem value="friendship">Friendship</SelectItem>
                <SelectItem value="anything">Open to Anything</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full gradient-romantic text-white border-0 hover:opacity-90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              "Complete Profile"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Heart, MessageCircle, Shield, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to DateWise!",
    description: "Find meaningful connections with people who share your values",
    icon: Heart,
    content: (
      <div className="text-center space-y-4 py-8">
        <div className="w-24 h-24 mx-auto gradient-romantic rounded-full flex items-center justify-center animate-pulse-soft">
          <Heart className="w-12 h-12 text-white" fill="currentColor" />
        </div>
        <p className="text-lg text-muted-foreground">
          Let's set up your profile and show you how DateWise works!
        </p>
      </div>
    ),
  },
  {
    title: "Smart Matching",
    description: "AI-powered algorithm finds your perfect match",
    icon: Sparkles,
    content: (
      <div className="space-y-6 py-8">
        <div className="flex items-center gap-4 p-4 glass-card rounded-lg animate-slide-in-right">
          <Sparkles className="w-10 h-10 text-primary" />
          <div>
            <h4 className="font-semibold">Intelligent Matching</h4>
            <p className="text-sm text-muted-foreground">Based on interests and preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 glass-card rounded-lg animate-slide-in-right" style={{ animationDelay: "0.1s" }}>
          <MessageCircle className="w-10 h-10 text-primary" />
          <div>
            <h4 className="font-semibold">Instant Messaging</h4>
            <p className="text-sm text-muted-foreground">Chat when you both match</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 glass-card rounded-lg animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h4 className="font-semibold">Safe & Secure</h4>
            <p className="text-sm text-muted-foreground">Your privacy is our priority</p>
          </div>
        </div>
      </div>
    ),
  },
];

interface OnboardingCarouselProps {
  onComplete: () => void;
}

export const OnboardingCarousel = ({ onComplete }: OnboardingCarouselProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    city: "",
    bio: "",
    interests: "",
    lookingFor: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const isInfoStep = currentStep >= ONBOARDING_STEPS.length;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

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

  const handleComplete = async () => {
    if (!user || !formData.name || !formData.age || !formData.gender) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = "";

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        city: formData.city || null,
        bio: formData.bio || null,
        interests: formData.interests ? formData.interests.split(",").map((i) => i.trim()) : null,
        looking_for: formData.lookingFor || null,
        avatar_url: avatarUrl || null,
        onboarding_complete: true,
      });

      if (error) throw error;

      toast({
        title: "Profile Created!",
        description: "Welcome to DateWise",
      });
      
      onComplete();
      navigate("/discover");
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

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {!isInfoStep && (
                <>
                  <h2 className="text-2xl font-bold gradient-text">
                    {ONBOARDING_STEPS[currentStep].title}
                  </h2>
                  <p className="text-muted-foreground">
                    {ONBOARDING_STEPS[currentStep].description}
                  </p>
                </>
              )}
              {isInfoStep && (
                <>
                  <h2 className="text-2xl font-bold gradient-text">Complete Your Profile</h2>
                  <p className="text-muted-foreground">Tell us about yourself</p>
                </>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onComplete()}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {[...Array(ONBOARDING_STEPS.length + 1)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[300px]">
            {!isInfoStep ? (
              ONBOARDING_STEPS[currentStep].content
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <label className="cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-primary/20 hover:border-primary/40 transition-colors">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm text-muted-foreground">Add Photo</span>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
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
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                      className="glass"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
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
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                    rows={3}
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests">Interests (comma separated)</Label>
                  <Input
                    id="interests"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    placeholder="Reading, Hiking, Music"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lookingFor">Looking For</Label>
                  <Select value={formData.lookingFor} onValueChange={(value) => setFormData({ ...formData, lookingFor: value })}>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendship">Friendship</SelectItem>
                      <SelectItem value="dating">Dating</SelectItem>
                      <SelectItem value="relationship">Serious Relationship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? () => onComplete() : handleBack}
              className="glass"
            >
              {currentStep === 0 ? "Skip" : <><ChevronLeft className="w-4 h-4 mr-2" />Back</>}
            </Button>
            
            {!isInfoStep ? (
              <Button onClick={handleNext} className="gradient-romantic text-white">
                Next<ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving} className="gradient-romantic text-white">
                {saving ? "Saving..." : "Complete"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

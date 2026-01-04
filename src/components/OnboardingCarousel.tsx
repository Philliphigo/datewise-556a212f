import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Heart, MessageCircle, Shield, Sparkles, X, Plus, Camera, Loader2, Image } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to DateWise!",
    description: "Find meaningful connections with people who share your values",
    icon: Heart,
  },
  {
    title: "Smart Matching",
    description: "AI-powered algorithm finds your perfect match",
    icon: Sparkles,
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const isInfoStep = currentStep === ONBOARDING_STEPS.length;
  const isPhotoStep = currentStep === ONBOARDING_STEPS.length + 1;
  const totalSteps = ONBOARDING_STEPS.length + 2; // intro steps + info + photos

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      if (isInfoStep) {
        // Validate info before moving to photos
        if (!formData.name || !formData.age || !formData.gender) {
          toast({
            title: "Missing Information",
            description: "Please fill in name, age, and gender",
            variant: "destructive",
          });
          return;
        }
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 6 - photos.length);
    
    setUploadingPhoto(true);
    
    const newPreviews: string[] = [];
    for (const file of newFiles) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setPhotos([...photos, ...newFiles]);
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newPreviews = [...photoPreviews];
    newPhotos.splice(index, 1);
    newPreviews.splice(index, 1);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
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
      const photoUrls: string[] = [];

      // Upload all photos
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        photoUrls.push(data.publicUrl);
        
        // First photo is the avatar
        if (i === 0) {
          avatarUrl = data.publicUrl;
        }
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
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
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

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="text-center space-y-6 py-8 animate-spring-in">
          <div className="w-28 h-28 mx-auto bg-gradient-to-br from-primary to-primary-soft rounded-full flex items-center justify-center animate-pulse-soft shadow-lg">
            <Heart className="w-14 h-14 text-primary-foreground" fill="currentColor" />
          </div>
          <p className="text-lg text-muted-foreground">
            Let's set up your profile and show you how DateWise works!
          </p>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-4 py-6">
          {[
            { icon: Sparkles, title: "Intelligent Matching", desc: "Based on interests and preferences" },
            { icon: MessageCircle, title: "Instant Messaging", desc: "Chat when you both match" },
            { icon: Shield, title: "Safe & Secure", desc: "Your privacy is our priority" },
          ].map((item, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-4 p-4 liquid-glass rounded-xl animate-float-up"
              style={{ animationDelay: `${0.1 * idx}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isInfoStep) {
      return (
        <div className="space-y-4 py-4 animate-spring-in">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="liquid-glass"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min={18}
                max={100}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                className="liquid-glass"
                placeholder="18+"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="liquid-glass">
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
                className="liquid-glass"
                placeholder="Your city"
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
              className="liquid-glass"
              placeholder="Tell others about yourself..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests">Interests (comma separated)</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              placeholder="Reading, Hiking, Music"
              className="liquid-glass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lookingFor">Looking For</Label>
            <Select value={formData.lookingFor} onValueChange={(value) => setFormData({ ...formData, lookingFor: value })}>
              <SelectTrigger className="liquid-glass">
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
      );
    }

    if (isPhotoStep) {
      return (
        <div className="space-y-4 py-4 animate-spring-in">
          <p className="text-sm text-muted-foreground text-center">
            Add up to 6 photos to your profile. The first photo will be your main picture.
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="aspect-square relative">
                {photoPreviews[idx] ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden group">
                    <img 
                      src={photoPreviews[idx]} 
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {idx === 0 && (
                      <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                        Main
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all">
                    {uploadingPhoto ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6 text-primary/60" />
                        <span className="text-xs text-muted-foreground mt-1">
                          {idx === 0 ? "Main" : "Add"}
                        </span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      onChange={handlePhotoAdd}
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {photos.length}/6 photos added {photos.length === 0 && "(optional)"}
          </p>
        </div>
      );
    }

    return null;
  };

  const getStepTitle = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      return ONBOARDING_STEPS[currentStep].title;
    }
    if (isInfoStep) return "Tell Us About You";
    if (isPhotoStep) return "Add Your Photos";
    return "";
  };

  const getStepDescription = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      return ONBOARDING_STEPS[currentStep].description;
    }
    if (isInfoStep) return "Fill in your profile information";
    if (isPhotoStep) return "Show your best side";
    return "";
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="liquid-glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gradient-gold">{getStepTitle()}</h2>
              <p className="text-muted-foreground">{getStepDescription()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onComplete()} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[320px]">
            {renderStepContent()}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? () => onComplete() : handleBack}
              className="liquid-glass rounded-xl"
            >
              {currentStep === 0 ? "Skip" : <><ChevronLeft className="w-4 h-4 mr-2" />Back</>}
            </Button>
            
            {!isPhotoStep ? (
              <Button onClick={handleNext} className="bg-primary text-primary-foreground rounded-xl">
                Next<ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving} className="bg-primary text-primary-foreground rounded-xl">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  "Complete Profile"
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

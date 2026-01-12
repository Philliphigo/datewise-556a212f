import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  MessageCircle, 
  Shield, 
  Sparkles, 
  X, 
  Plus, 
  Loader2, 
  Users,
  Zap,
  Star,
  Check
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to DateWise!",
    description: "Find meaningful connections with people who share your values",
    icon: Heart,
    color: "from-rose-500 to-pink-600",
  },
  {
    title: "Smart Matching",
    description: "AI-powered algorithm finds your perfect match",
    icon: Sparkles,
    color: "from-amber-500 to-orange-600",
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
  const [animationPhase, setAnimationPhase] = useState(0);

  const isInfoStep = currentStep === ONBOARDING_STEPS.length;
  const isPhotoStep = currentStep === ONBOARDING_STEPS.length + 1;
  const totalSteps = ONBOARDING_STEPS.length + 2;

  // Animate elements in sequence
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      if (isInfoStep) {
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
        title: "🎉 Profile Created!",
        description: "Welcome to DateWise - Let's find your match!",
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

  const renderWelcomeStep = () => (
    <div className="text-center space-y-8 py-6">
      {/* Animated hearts background */}
      <div className="relative h-48 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(6)].map((_, i) => (
            <Heart
              key={i}
              className={`absolute w-8 h-8 text-primary/20 transition-all duration-1000 ${
                animationPhase === i % 4 ? 'scale-125 opacity-100' : 'scale-100 opacity-50'
              }`}
              style={{
                transform: `rotate(${i * 60}deg) translateY(-${50 + i * 10}px)`,
                animationDelay: `${i * 0.2}s`,
              }}
              fill="currentColor"
            />
          ))}
        </div>
        
        {/* Main heart */}
        <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center animate-bounce shadow-2xl">
          <Heart className="w-16 h-16 text-white" fill="currentColor" />
        </div>
      </div>

      <div className="space-y-3 animate-fade-in">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
          Let's Get Started!
        </h2>
        <p className="text-muted-foreground text-lg max-w-sm mx-auto">
          Your journey to meaningful connections begins here
        </p>
      </div>

      {/* Fun stats */}
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        {[
          { icon: Users, label: "10K+ Users", color: "text-blue-500" },
          { icon: Heart, label: "5K+ Matches", color: "text-rose-500" },
          { icon: Star, label: "4.8 Rating", color: "text-amber-500" },
        ].map((stat, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary/50 transition-all duration-500 ${
              animationPhase === i ? 'scale-105 shadow-lg' : ''
            }`}
          >
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFeaturesStep = () => (
    <div className="space-y-5 py-4">
      {[
        { 
          icon: Sparkles, 
          title: "Smart Matching", 
          desc: "AI finds your perfect match based on compatibility",
          color: "from-amber-500 to-orange-500",
          delay: 0
        },
        { 
          icon: MessageCircle, 
          title: "Instant Chat", 
          desc: "Connect instantly when you both match",
          color: "from-blue-500 to-cyan-500",
          delay: 0.1
        },
        { 
          icon: Shield, 
          title: "Safe & Verified", 
          desc: "Your privacy and security are our priority",
          color: "from-emerald-500 to-teal-500",
          delay: 0.2
        },
        { 
          icon: Zap, 
          title: "Boost Profile", 
          desc: "Get more visibility and matches",
          color: "from-purple-500 to-pink-500",
          delay: 0.3
        },
      ].map((item, idx) => (
        <div 
          key={idx}
          className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-sm border border-border/50 transition-all duration-500 hover:shadow-md hover:scale-[1.02]"
          style={{ 
            animationDelay: `${item.delay}s`,
            opacity: animationPhase >= idx ? 1 : 0.5,
            transform: animationPhase >= idx ? 'translateX(0)' : 'translateX(-10px)'
          }}
        >
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
            <item.icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{item.title}</h4>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
          <Check className={`w-5 h-5 transition-all duration-500 ${
            animationPhase >= idx ? 'text-success opacity-100 scale-100' : 'opacity-0 scale-0'
          }`} />
        </div>
      ))}
    </div>
  );

  const renderInfoStep = () => (
    <div className="space-y-4 py-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary-soft rounded-full flex items-center justify-center mb-3 shadow-lg">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground">Tell us about yourself</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age" className="flex items-center gap-2">
            Age <span className="text-destructive">*</span>
          </Label>
          <Input
            id="age"
            type="number"
            min={18}
            max={100}
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            required
            className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
            placeholder="18+"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender" className="flex items-center gap-2">
            Gender <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
            <SelectTrigger className="h-12 rounded-xl border-2">
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
            className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
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
          className="rounded-xl border-2 focus:border-primary transition-colors resize-none"
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
          className="h-12 rounded-xl border-2 focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lookingFor">Looking For</Label>
        <Select value={formData.lookingFor} onValueChange={(value) => setFormData({ ...formData, lookingFor: value })}>
          <SelectTrigger className="h-12 rounded-xl border-2">
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

  const renderPhotoStep = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mb-3 shadow-lg animate-pulse">
          <Heart className="w-8 h-8 text-white" fill="currentColor" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Show Your Best Side</h3>
        <p className="text-sm text-muted-foreground">
          Add up to 6 photos • First photo = profile picture
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, idx) => (
          <div 
            key={idx} 
            className={`aspect-square relative rounded-2xl overflow-hidden transition-all duration-300 ${
              idx === 0 ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          >
            {photoPreviews[idx] ? (
              <div className="relative w-full h-full group">
                <img 
                  src={photoPreviews[idx]} 
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleRemovePhoto(idx)}
                    className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {idx === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow">
                    Main Photo
                  </div>
                )}
              </div>
            ) : (
              <label className={`cursor-pointer w-full h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all hover:bg-primary/5 ${
                idx === 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      idx === 0 ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Plus className={`w-5 h-5 ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {idx === 0 ? "Add Main" : "Add Photo"}
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

      <div className="flex items-center justify-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${photos.length > 0 ? 'bg-success' : 'bg-muted'}`} />
        <span className="text-muted-foreground">
          {photos.length}/6 photos {photos.length === 0 && "(optional, you can add later)"}
        </span>
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (currentStep === 0) return renderWelcomeStep();
    if (currentStep === 1) return renderFeaturesStep();
    if (isInfoStep) return renderInfoStep();
    if (isPhotoStep) return renderPhotoStep();
    return null;
  };

  const getStepTitle = () => {
    if (currentStep === 0) return "Welcome!";
    if (currentStep === 1) return "Features";
    if (isInfoStep) return "Your Info";
    if (isPhotoStep) return "Photos";
    return "";
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 z-50 flex items-center justify-center p-4">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <Card className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-border/50 shadow-2xl bg-card/95 backdrop-blur-sm">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-soft flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{getStepTitle()}</h2>
                <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {totalSteps}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onComplete()} 
              className="rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary-soft rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-3">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`flex items-center justify-center transition-all duration-300 ${
                  i === currentStep 
                    ? 'w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg scale-110' 
                    : i < currentStep 
                      ? 'w-8 h-8 rounded-full bg-success text-success-foreground' 
                      : 'w-8 h-8 rounded-full bg-muted text-muted-foreground'
                }`}
              >
                {i < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[380px]">
            {renderStepContent()}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-4 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? () => onComplete() : handleBack}
              className="h-12 px-6 rounded-xl border-2"
            >
              {currentStep === 0 ? "Skip for now" : <><ChevronLeft className="w-4 h-4 mr-2" />Back</>}
            </Button>
            
            {!isPhotoStep ? (
              <Button 
                onClick={handleNext} 
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary-soft shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                Continue<ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete} 
                disabled={saving} 
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-success to-emerald-500 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Complete Profile
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
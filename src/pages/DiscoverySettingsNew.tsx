import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Settings, Users, MapPin, Heart, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const INTEREST_CATEGORIES = [
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "fitness", name: "Fitness", icon: "💪" },
  { id: "food", name: "Foodie", icon: "🍕" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "art", name: "Art", icon: "🎨" },
  { id: "books", name: "Books", icon: "📚" },
  { id: "movies", name: "Movies", icon: "🎬" },
  { id: "sports", name: "Sports", icon: "⚽" },
  { id: "gaming", name: "Gaming", icon: "🎮" },
  { id: "pets", name: "Pets", icon: "🐶" },
];

const DiscoverySettingsNew = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ageMin: 18,
    ageMax: 50,
    distanceMin: 5,
    distanceMax: 50,
    location: "",
    genderPreference: "all",
    interests: [] as string[],
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("discovery_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.discovery_preferences) {
        const prefs = data.discovery_preferences as any;
        setSettings({
          ageMin: prefs.ageMin || 18,
          ageMax: prefs.ageMax || 50,
          distanceMin: prefs.distanceMin || 5,
          distanceMax: prefs.distanceMax || 50,
          location: prefs.location || "",
          genderPreference: prefs.genderPreference || "all",
          interests: prefs.interests || [],
        });
      }
    } catch (err) {
      // Silently handle error
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ discovery_preferences: settings })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your discovery preferences have been updated",
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

  const toggleInterest = (interestId: string) => {
    setSettings(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Settings className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold gradient-text">Discovery Settings</h1>
            </div>
            <p className="text-muted-foreground">Customize who you want to see</p>
          </div>

          <Card className="glass-card p-6 space-y-6">
            {/* Age Range */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <Label>Age Range</Label>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span>{settings.ageMin} years</span>
                    <span>{settings.ageMax} years</span>
                  </div>
                  <Slider
                    min={18}
                    max={80}
                    step={1}
                    value={[settings.ageMin, settings.ageMax]}
                    onValueChange={([min, max]) =>
                      setSettings({ ...settings, ageMin: min, ageMax: max })
                    }
                    className="w-full"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Distance Range */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <Label>Distance Range</Label>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span>{settings.distanceMin} km</span>
                    <span>{settings.distanceMax} km</span>
                  </div>
                  <Slider
                    min={5}
                    max={200}
                    step={5}
                    value={[settings.distanceMin, settings.distanceMax]}
                    onValueChange={([min, max]) =>
                      setSettings({ ...settings, distanceMin: min, distanceMax: max })
                    }
                    className="w-full"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Location */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <Label>Your Location</Label>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4">
                  <Input
                    placeholder="Enter your city or location"
                    value={settings.location}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                    className="glass"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Gender Preference */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <Label>Interested In</Label>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex gap-2 mt-4">
                  {["all", "male", "female"].map((gender) => (
                    <Button
                      key={gender}
                      variant={settings.genderPreference === gender ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, genderPreference: gender })}
                      className="flex-1"
                    >
                      {gender === "all" ? "Everyone" : gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Interests */}
            <Collapsible>
              <CollapsibleTrigger className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  <Label>Interests ({settings.interests.length} selected)</Label>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-2 mt-4">
                  {INTEREST_CATEGORIES.map((interest) => (
                    <Badge
                      key={interest.id}
                      variant={settings.interests.includes(interest.id) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm"
                      onClick={() => toggleInterest(interest.id)}
                    >
                      <span className="mr-2">{interest.icon}</span>
                      {interest.name}
                      {settings.interests.includes(interest.id) && (
                        <X className="w-3 h-3 ml-2" />
                      )}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-romantic text-white"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DiscoverySettingsNew;

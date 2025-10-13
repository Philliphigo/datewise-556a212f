import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Settings, Users, MapPin, Heart } from "lucide-react";

const DiscoverySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ageMin: 18,
    ageMax: 50,
    maxDistance: 50,
    showOnline: true,
    showVerified: false,
    genderPreference: "all",
    lookingFor: "all",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleSave = () => {
    setSaving(true);
    // Save to localStorage or backend
    localStorage.setItem("discoverySettings", JSON.stringify(settings));
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your discovery preferences have been updated",
      });
    }, 500);
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <Label>Age Range</Label>
              </div>
              <div className="space-y-2">
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
            </div>

            {/* Maximum Distance */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <Label>Maximum Distance</Label>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Within {settings.maxDistance} km</span>
                </div>
                <Slider
                  min={5}
                  max={200}
                  step={5}
                  value={[settings.maxDistance]}
                  onValueChange={([value]) =>
                    setSettings({ ...settings, maxDistance: value })
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Gender Preference */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <Label>Show Me</Label>
              </div>
              <Select
                value={settings.genderPreference}
                onValueChange={(value) =>
                  setSettings({ ...settings, genderPreference: value })
                }
              >
                <SelectTrigger className="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="male">Men</SelectItem>
                  <SelectItem value="female">Women</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Looking For */}
            <div className="space-y-2">
              <Label>Looking For</Label>
              <Select
                value={settings.lookingFor}
                onValueChange={(value) =>
                  setSettings({ ...settings, lookingFor: value })
                }
              >
                <SelectTrigger className="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="friendship">Friendship</SelectItem>
                  <SelectItem value="dating">Dating</SelectItem>
                  <SelectItem value="relationship">Serious Relationship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Only Online Users</Label>
                  <p className="text-sm text-muted-foreground">
                    Only see people who are currently active
                  </p>
                </div>
                <Switch
                  checked={settings.showOnline}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showOnline: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Only Verified Profiles</Label>
                  <p className="text-sm text-muted-foreground">
                    Only see verified users
                  </p>
                </div>
                <Switch
                  checked={settings.showVerified}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, showVerified: checked })
                  }
                />
              </div>
            </div>

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

export default DiscoverySettings;
